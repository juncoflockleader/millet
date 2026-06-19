import { createHash } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { hashValue, projectEvent, type MatchCommand, type MatchEvent, type ViewerContext } from "../../engine-core/src/index.ts";
import { projectedBacklogEvents } from "./event-stream.ts";
import { AuthorizationError, type InMemoryMatchService, type UserSession } from "./match-service.ts";

const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export interface WebSocketWritable {
  write(chunk: Buffer | string): unknown;
  end?(): unknown;
  destroy?(): unknown;
  on?(event: "data", listener: (chunk: Buffer) => void): unknown;
  on?(event: "drain", listener: () => void): unknown;
  on?(event: "close", listener: () => void): unknown;
  on?(event: "error", listener: () => void): unknown;
}

export interface WebSocketStreamOptions {
  lastSequence?: number;
  includeBacklog?: boolean;
  initialData?: Buffer;
  session?: UserSession;
}

export interface DecodedWebSocketFrame {
  fin: boolean;
  opcode: number;
  payload: Buffer;
  text?: string;
}

interface WebSocketWriteState {
  queue: (Buffer | string)[];
  waitingForDrain: boolean;
  closed: boolean;
}

const writeStates = new WeakMap<WebSocketWritable, WebSocketWriteState>();

export function createWebSocketAcceptKey(secWebSocketKey: string): string {
  return createHash("sha1")
    .update(`${secWebSocketKey}${WEBSOCKET_GUID}`)
    .digest("base64");
}

export function encodeWebSocketTextFrame(
  message: unknown,
  options: { mask?: boolean; maskKey?: Buffer } = {}
): Buffer {
  const text = typeof message === "string" ? message : JSON.stringify(message);
  return encodeWebSocketFrame(Buffer.from(text, "utf8"), 0x1, options);
}

export function encodeWebSocketCloseFrame(): Buffer {
  return encodeWebSocketFrame(Buffer.alloc(0), 0x8);
}

export function decodeWebSocketFrames(buffer: Buffer): { frames: DecodedWebSocketFrame[]; remaining: Buffer } {
  const frames: DecodedWebSocketFrame[] = [];
  let offset = 0;

  while (offset + 2 <= buffer.length) {
    const first = buffer[offset]!;
    const second = buffer[offset + 1]!;
    const fin = (first & 0x80) !== 0;
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let headerLength = 2;

    if (length === 126) {
      if (offset + headerLength + 2 > buffer.length) {
        break;
      }
      length = buffer.readUInt16BE(offset + headerLength);
      headerLength += 2;
    } else if (length === 127) {
      if (offset + headerLength + 8 > buffer.length) {
        break;
      }
      const bigLength = buffer.readBigUInt64BE(offset + headerLength);
      if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) {
        throw new Error("WebSocket frame is too large");
      }
      length = Number(bigLength);
      headerLength += 8;
    }

    const maskLength = masked ? 4 : 0;
    const payloadStart = offset + headerLength + maskLength;
    const nextOffset = payloadStart + length;
    if (nextOffset > buffer.length) {
      break;
    }

    const maskKey = masked ? buffer.subarray(offset + headerLength, offset + headerLength + 4) : undefined;
    const payload = Buffer.from(buffer.subarray(payloadStart, nextOffset));
    if (maskKey) {
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] = payload[index]! ^ maskKey[index % 4]!;
      }
    }

    frames.push({
      fin,
      opcode,
      payload,
      text: opcode === 0x1 ? payload.toString("utf8") : undefined
    });
    offset = nextOffset;
  }

  return { frames, remaining: buffer.subarray(offset) };
}

export function writeWebSocketJson(sink: WebSocketWritable, message: unknown): void {
  writeWebSocketChunk(sink, encodeWebSocketTextFrame(message));
}

export function attachMatchEventWebSocketStream(
  service: InMemoryMatchService,
  matchId: string,
  viewer: ViewerContext,
  sink: WebSocketWritable,
  options: WebSocketStreamOptions = {}
): () => void {
  const match = service.getMatch(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} does not exist`);
  }

  writeWebSocketJson(sink, {
    type: "ready",
    matchId,
    lastSequence: match.state.lastSequence
  });

  if (options.includeBacklog ?? true) {
    writeEventBatch(sink, matchId, projectedBacklogEvents(match, viewer, options.lastSequence ?? 0), match.state);
  }

  const unsubscribe = service.subscribe(matchId, (events) => {
    const latest = service.getMatch(matchId);
    if (!latest) {
      return;
    }

    const projected = events.map((event) => projectEvent(event, latest.state, viewer)).filter((event): event is MatchEvent => event !== null);
    writeEventBatch(sink, matchId, projected, latest.state);
  });

  let pending = Buffer.alloc(0);
  const consume = (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk]);
    const decoded = decodeWebSocketFrames(pending);
    pending = decoded.remaining;

    for (const frame of decoded.frames) {
      if (frame.opcode === 0x8) {
        unsubscribe();
        writeWebSocketChunk(sink, encodeWebSocketCloseFrame());
        sink.end?.();
        return;
      }

      if (frame.opcode === 0x9) {
        writeWebSocketChunk(sink, encodeWebSocketFrame(frame.payload, 0xA));
        continue;
      }

      if (frame.opcode === 0x1 && frame.text !== undefined) {
        handleClientTextMessage(service, matchId, sink, frame.text, options.session);
      }
    }
  };

  sink.on?.("data", consume);
  sink.on?.("close", unsubscribe);
  sink.on?.("error", unsubscribe);

  if (options.initialData && options.initialData.length > 0) {
    consume(options.initialData);
  }

  return unsubscribe;
}

export function handleMilletWebSocketUpgrade(
  service: InMemoryMatchService,
  req: IncomingMessage,
  socket: WebSocketWritable,
  head: Buffer = Buffer.alloc(0)
): boolean {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const match = url.pathname.match(/^\/matches\/([^/]+)\/ws$/);
  if (!match) {
    return false;
  }

  const secWebSocketKey = headerValue(req.headers["sec-websocket-key"]);
  if (!secWebSocketKey) {
    socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\nMissing Sec-WebSocket-Key");
    socket.destroy?.();
    return true;
  }

  const matchId = decodeURIComponent(match[1]!);
  const session = sessionFromRequest(req);
  let viewer: ViewerContext;
  try {
    viewer = service.viewerForSession(matchId, session, {
      playerId: url.searchParams.get("playerId") ?? undefined,
      seatId: url.searchParams.get("seatId") ?? undefined,
      admin: url.searchParams.get("admin") === "true"
    });
  } catch (error) {
    const status = error instanceof AuthorizationError ? "403 Forbidden" : "500 Internal Server Error";
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n${error instanceof Error ? error.message : String(error)}`);
    socket.destroy?.();
    return true;
  }

  socket.write(
    [
      "HTTP/1.1 101 Switching Protocols",
      "Upgrade: websocket",
      "Connection: Upgrade",
      `Sec-WebSocket-Accept: ${createWebSocketAcceptKey(secWebSocketKey)}`,
      "\r\n"
    ].join("\r\n")
  );

  attachMatchEventWebSocketStream(
    service,
    matchId,
    viewer,
    socket,
    {
      lastSequence: Number(url.searchParams.get("lastSequence") ?? "0") || 0,
      initialData: head,
      session
    }
  );
  return true;
}

function getWriteState(sink: WebSocketWritable): WebSocketWriteState {
  const existing = writeStates.get(sink);
  if (existing) {
    return existing;
  }

  const state: WebSocketWriteState = {
    queue: [],
    waitingForDrain: false,
    closed: false
  };
  writeStates.set(sink, state);

  sink.on?.("drain", () => flushWebSocketWrites(sink));
  const close = () => {
    state.closed = true;
    state.queue = [];
  };
  sink.on?.("close", close);
  sink.on?.("error", close);

  return state;
}

function writeWebSocketChunk(sink: WebSocketWritable, chunk: Buffer | string): void {
  const state = getWriteState(sink);
  if (state.closed) {
    return;
  }

  if (state.waitingForDrain || state.queue.length > 0) {
    state.queue.push(chunk);
    return;
  }

  if (sink.write(chunk) === false) {
    state.waitingForDrain = true;
  }
}

function flushWebSocketWrites(sink: WebSocketWritable): void {
  const state = getWriteState(sink);
  if (state.closed) {
    return;
  }

  state.waitingForDrain = false;
  while (state.queue.length > 0) {
    const chunk = state.queue.shift()!;
    if (sink.write(chunk) === false) {
      state.waitingForDrain = true;
      return;
    }
  }
}

function handleClientTextMessage(
  service: InMemoryMatchService,
  matchId: string,
  sink: WebSocketWritable,
  text: string,
  session?: UserSession
): void {
  let message: { type?: string; requestId?: string; matchId?: string; command?: MatchCommand };

  try {
    message = JSON.parse(text) as { type?: string; requestId?: string; matchId?: string; command?: MatchCommand };
  } catch (error) {
    writeCommandRejected(sink, undefined, matchId, `invalid_json: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (message.type === "ping") {
    writeWebSocketJson(sink, { type: "pong", matchId });
    return;
  }

  if (message.type !== "command" || !message.command) {
    writeCommandRejected(sink, message.requestId, matchId, "unsupported_message");
    return;
  }

  if (message.matchId && message.matchId !== matchId) {
    writeCommandRejected(sink, message.requestId, matchId, `message targets match ${message.matchId}, not ${matchId}`);
    return;
  }

  try {
    const updated = session ? service.submitCommandForSession(matchId, message.command, session) : service.submitCommand(matchId, message.command);
    writeWebSocketJson(sink, {
      type: "command_accepted",
      requestId: message.requestId,
      matchId,
      lastSequence: updated.state.lastSequence,
      stateHash: hashValue(updated.state)
    });
  } catch (error) {
    writeCommandRejected(sink, message.requestId, matchId, error instanceof Error ? error.message : String(error));
  }
}

function writeCommandRejected(sink: WebSocketWritable, requestId: string | undefined, matchId: string, error: string): void {
  writeWebSocketJson(sink, {
    type: "command_rejected",
    requestId,
    matchId,
    error
  });
}

function writeEventBatch(sink: WebSocketWritable, matchId: string, events: MatchEvent[], state: unknown): void {
  if (events.length === 0) {
    return;
  }

  writeWebSocketJson(sink, {
    type: "events",
    matchId,
    fromSequence: events[0]?.sequence,
    events,
    stateHash: hashValue(state)
  });
}

function encodeWebSocketFrame(payload: Buffer, opcode: number, options: { mask?: boolean; maskKey?: Buffer } = {}): Buffer {
  const mask = options.mask ?? false;
  const length = payload.length;
  const extendedLengthBytes = length <= 125 ? 0 : length <= 65535 ? 2 : 8;
  const header = Buffer.alloc(2 + extendedLengthBytes + (mask ? 4 : 0));
  header[0] = 0x80 | opcode;

  if (length <= 125) {
    header[1] = length | (mask ? 0x80 : 0);
  } else if (length <= 65535) {
    header[1] = 126 | (mask ? 0x80 : 0);
    header.writeUInt16BE(length, 2);
  } else {
    header[1] = 127 | (mask ? 0x80 : 0);
    header.writeBigUInt64BE(BigInt(length), 2);
  }

  const payloadCopy = Buffer.from(payload);
  if (mask) {
    const maskOffset = 2 + extendedLengthBytes;
    const maskKey = options.maskKey ?? Buffer.from([0x11, 0x22, 0x33, 0x44]);
    if (maskKey.length !== 4) {
      throw new Error("WebSocket mask key must be exactly four bytes");
    }
    maskKey.copy(header, maskOffset);
    for (let index = 0; index < payloadCopy.length; index += 1) {
      payloadCopy[index] = payloadCopy[index]! ^ maskKey[index % 4]!;
    }
  }

  return Buffer.concat([header, payloadCopy]);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sessionFromRequest(req: IncomingMessage): UserSession {
  return {
    userId: headerValue(req.headers["x-millet-user-id"]),
    admin: headerValue(req.headers["x-millet-admin"]) === "true"
  };
}
