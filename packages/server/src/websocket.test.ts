import { test } from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import type { MatchCommand } from "../../engine-core/src/index.ts";
import {
  attachMatchEventWebSocketStream,
  createWebSocketAcceptKey,
  decodeWebSocketFrames,
  encodeWebSocketTextFrame,
  handleMilletWebSocketUpgrade,
  type WebSocketWritable
} from "./websocket.ts";
import { InMemoryMatchService } from "./match-service.ts";

class MemoryWebSocketSink implements WebSocketWritable {
  chunks: (Buffer | string)[] = [];
  listeners = new Map<string, ((chunk?: Buffer) => void)[]>();
  writeResults: unknown[] = [];
  destroyed = false;

  write(chunk: Buffer | string): unknown {
    this.chunks.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : chunk);
    return this.writeResults.length > 0 ? this.writeResults.shift() : undefined;
  }

  end(): void {
    this.emit("close");
  }

  destroy(): void {
    this.destroyed = true;
    this.emit("close");
  }

  on(event: "data" | "drain" | "close" | "error", listener: (chunk?: Buffer) => void): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  emitData(chunk: Buffer): void {
    this.emit("data", chunk);
  }

  emitDrain(): void {
    this.emit("drain");
  }

  rawText(): string {
    return this.chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk.toString("binary") : chunk)).join("");
  }

  messages(): Record<string, unknown>[] {
    const frameBytes = Buffer.concat(this.chunks.filter((chunk): chunk is Buffer => Buffer.isBuffer(chunk)));
    return decodeWebSocketFrames(frameBytes).frames
      .filter((frame) => frame.text !== undefined)
      .map((frame) => JSON.parse(frame.text!) as Record<string, unknown>);
  }

  private emit(event: string, chunk?: Buffer): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(chunk);
    }
  }
}

test("creates RFC 6455 WebSocket accept keys and decodes masked client frames", () => {
  assert.equal(createWebSocketAcceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");

  const clientFrame = encodeWebSocketTextFrame({ type: "ping" }, { mask: true, maskKey: Buffer.from([1, 2, 3, 4]) });
  const decoded = decodeWebSocketFrames(clientFrame);
  assert.equal(decoded.remaining.length, 0);
  assert.equal(decoded.frames[0]?.text, "{\"type\":\"ping\"}");
});

test("attached WebSocket stream writes projected backlog and hides private identity data", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  const sink = new MemoryWebSocketSink();

  attachMatchEventWebSocketStream(service, match.id, { playerId: "p2", seatId: "seat_2" }, sink);

  const messages = sink.messages();
  assert.equal(messages[0]?.type, "ready");
  const eventMessage = messages.find((message) => message.type === "events");
  assert.ok(eventMessage);
  const events = eventMessage.events as { type: string; payload: { object?: { id?: string; objectType?: string; templateId?: string } } }[];
  const hiddenRoleEvent = events.find((event) => event.type === "object_created" && event.payload.object?.id === "role_p3");
  assert.ok(hiddenRoleEvent);
  assert.equal(hiddenRoleEvent.payload.object?.objectType, "hidden");
  assert.equal(hiddenRoleEvent.payload.object?.templateId, undefined);
});

test("attached WebSocket stream queues frames while the sink is backpressured", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const sink = new MemoryWebSocketSink();
  sink.writeResults = [false];

  attachMatchEventWebSocketStream(service, match.id, { playerId: "p1" }, sink);

  assert.deepEqual(
    sink.messages().map((message) => message.type),
    ["ready"]
  );

  sink.emitDrain();

  assert.deepEqual(
    sink.messages().map((message) => message.type),
    ["ready", "events"]
  );
});

test("attached WebSocket stream accepts command messages and pushes live events", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const sink = new MemoryWebSocketSink();

  attachMatchEventWebSocketStream(service, match.id, { playerId: "p1" }, sink, {
    includeBacklog: false,
    lastSequence: match.state.lastSequence
  });

  sink.emitData(
    encodeWebSocketTextFrame(
      {
        type: "command",
        requestId: "req_firebolt",
        matchId: match.id,
        command: {
          id: "cmd_ws_firebolt",
          matchId: match.id,
          playerId: "p1",
          type: "execute_behavior",
          payload: {
            behaviorId: "firebolt",
            sourceObjectId: "card_firebolt",
            selections: { target: ["p2"] }
          }
        }
      },
      { mask: true }
    )
  );

  const messages = sink.messages();
  const eventMessage = messages.find((message) => message.type === "events");
  const accepted = messages.find((message) => message.type === "command_accepted");
  const events = eventMessage?.events as { type: string }[] | undefined;
  assert.ok(events?.some((event) => event.type === "damage_dealt"));
  assert.ok(events?.some((event) => event.type === "outcome_declared"));
  assert.equal(accepted?.requestId, "req_firebolt");
  assert.equal(service.getMatch(match.id)?.state.status, "completed");
});

test("two connected WebSocket clients can complete a sample-duel match and observe rejection after completion", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const p1 = attachPlayerClient(service, match.id, "p1", match.state.lastSequence);
  const p2 = attachPlayerClient(service, match.id, "p2", match.state.lastSequence);

  sendCommandFrame(p1, match.id, "req_p1_firebolt", {
    id: "cmd_ws_duel_complete",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(service.getMatch(match.id)?.state.status, "completed");
  assert.ok(webSocketEventTypes(p1).includes("outcome_declared"));
  assert.ok(webSocketEventTypes(p2).includes("outcome_declared"));

  sendCommandFrame(p2, match.id, "req_after_completion", {
    id: "cmd_ws_after_completion",
    matchId: match.id,
    playerId: "p2",
    type: "end_turn",
    payload: {}
  });

  const rejected = p2.messages().find((message) => message.type === "command_rejected" && message.requestId === "req_after_completion");
  assert.match(String(rejected?.error), /completed/);
});

for (const playerCount of [6, 8] as const) {
  test(`${playerCount} connected WebSocket clients can complete a sample-identity match`, () => {
    const service = new InMemoryMatchService();
    const match = service.createMatch("sample-identity", { playerCount });
    const clients = new Map<string, MemoryWebSocketSink>();

    for (let index = 1; index <= playerCount; index += 1) {
      const playerId = `p${index}`;
      clients.set(playerId, attachPlayerClient(service, match.id, playerId, match.state.lastSequence));
    }

    for (let attack = 1; attack <= 4; attack += 1) {
      sendCommandFrame(clients.get("p2")!, match.id, `req_identity_attack_${playerCount}_${attack}`, {
        id: `cmd_ws_identity_attack_${playerCount}_${attack}`,
        matchId: match.id,
        playerId: "p2",
        type: "execute_behavior",
        payload: {
          behaviorId: "attack",
          selections: { target: ["p1"] }
        }
      });
    }

    const rescuePrompt = Object.values(service.getMatch(match.id)!.state.prompts).find((prompt) => prompt.status === "open" && prompt.promptType === "rescue");
    assert.ok(rescuePrompt);
    assert.deepEqual(
      rescuePrompt.responderIds,
      Array.from({ length: playerCount - 1 }, (_, index) => `p${index + 2}`)
    );

    for (const responderId of rescuePrompt.responderIds) {
      sendCommandFrame(clients.get(responderId)!, match.id, `req_identity_pass_${playerCount}_${responderId}`, {
        id: `cmd_ws_identity_pass_${playerCount}_${responderId}`,
        matchId: match.id,
        playerId: responderId,
        type: "answer_prompt",
        payload: {
          promptId: rescuePrompt.id,
          answer: "pass"
        }
      });
    }

    const completed = service.getMatch(match.id)!;
    assert.equal(completed.state.status, "completed");
    assert.equal(completed.state.players.p1?.status, "dead");
    assert.equal(completed.state.outcomes[0]?.id, "identity_outcome_rebel");
    assert.equal(completed.state.outcomes[0]?.results.find((result) => result.faction === "rebel")?.status, "won");
    assert.ok([...clients.values()].every((client) => webSocketEventTypes(client).includes("outcome_declared")));
  });
}

test("attached WebSocket stream rejects commands outside the user session", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const sink = new MemoryWebSocketSink();

  attachMatchEventWebSocketStream(service, match.id, { playerId: "p2" }, sink, {
    includeBacklog: false,
    lastSequence: match.state.lastSequence,
    session: { userId: "u2" }
  });

  sink.emitData(
    encodeWebSocketTextFrame(
      {
        type: "command",
        requestId: "req_spoofed_firebolt",
        matchId: match.id,
        command: {
          id: "cmd_ws_spoofed_firebolt",
          matchId: match.id,
          playerId: "p1",
          type: "execute_behavior",
          payload: {
            behaviorId: "firebolt",
            sourceObjectId: "card_firebolt",
            selections: { target: ["p2"] }
          }
        }
      },
      { mask: true }
    )
  );

  const rejected = sink.messages().find((message) => message.type === "command_rejected");
  assert.equal(rejected?.requestId, "req_spoofed_firebolt");
  assert.match(String(rejected?.error), /cannot act as player/);
  assert.equal(service.getMatch(match.id)?.state.status, "setup");
});

test("HTTP upgrade helper performs WebSocket handshake and attaches the stream", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const socket = new MemoryWebSocketSink();
  const req = {
    url: `/matches/${match.id}/ws?playerId=p1&lastSequence=${match.state.lastSequence}`,
    headers: {
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      "x-millet-user-id": "u1"
    }
  } as IncomingMessage;

  const handled = handleMilletWebSocketUpgrade(service, req, socket);

  assert.equal(handled, true);
  assert.match(socket.rawText(), /^HTTP\/1\.1 101 Switching Protocols/);
  assert.match(socket.rawText(), /Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK\+xOo=/);
  assert.equal(socket.messages()[0]?.type, "ready");
});

test("HTTP upgrade helper rejects private WebSocket projections without the owning user", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const socket = new MemoryWebSocketSink();
  const req = {
    url: `/matches/${match.id}/ws?playerId=p1`,
    headers: {
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      "x-millet-user-id": "u2"
    }
  } as IncomingMessage;

  const handled = handleMilletWebSocketUpgrade(service, req, socket);

  assert.equal(handled, true);
  assert.match(socket.rawText(), /^HTTP\/1\.1 403 Forbidden/);
  assert.equal(socket.destroyed, true);
});

function attachPlayerClient(
  service: InMemoryMatchService,
  matchId: string,
  playerId: string,
  lastSequence: number
): MemoryWebSocketSink {
  const sink = new MemoryWebSocketSink();
  const playerNumber = Number(playerId.slice(1));
  attachMatchEventWebSocketStream(service, matchId, { playerId, seatId: `seat_${playerNumber}` }, sink, {
    includeBacklog: false,
    lastSequence,
    session: { userId: `u${playerNumber}` }
  });
  return sink;
}

function sendCommandFrame(sink: MemoryWebSocketSink, matchId: string, requestId: string, command: MatchCommand): void {
  sink.emitData(
    encodeWebSocketTextFrame(
      {
        type: "command",
        requestId,
        matchId,
        command
      },
      { mask: true }
    )
  );
}

function webSocketEventTypes(sink: MemoryWebSocketSink): string[] {
  return sink.messages()
    .filter((message) => message.type === "events")
    .flatMap((message) => ((message.events as { type: string }[] | undefined) ?? []).map((event) => event.type));
}
