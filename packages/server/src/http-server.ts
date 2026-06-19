import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { CommandRejectedError, projectEvent, projectState } from "../../engine-core/src/index.ts";
import { attachMatchEventSseStream, SSE_HEADERS } from "./event-stream.ts";
import { AuthorizationError, InMemoryMatchService, type UserSession } from "./match-service.ts";
import { handleMilletWebSocketUpgrade } from "./websocket.ts";

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
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

function errorResponse(error: unknown): { status: number; payload: { error: string; message: string } } {
  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      payload: {
        error: "authorization_error",
        message: error.message
      }
    };
  }

  if (error instanceof CommandRejectedError) {
    return {
      status: 400,
      payload: {
        error: error.code,
        message: error.message
      }
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      payload: {
        error: "invalid_json",
        message: error.message
      }
    };
  }

  return {
    status: 500,
    payload: {
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }
  };
}

export function createMilletHttpServer(service = new InMemoryMatchService()) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "POST" && url.pathname === "/matches") {
        const body = (await readJson(req)) as { rulesetId?: "sample-duel" | "sample-identity"; playerCount?: 6 | 8 };
        const match = service.createMatch(body.rulesetId ?? "sample-duel", { playerCount: body.playerCount });
        send(res, 201, { matchId: match.id, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchCommand = url.pathname.match(/^\/matches\/([^/]+)\/commands$/);
      if (req.method === "POST" && matchCommand) {
        const matchId = decodeURIComponent(matchCommand[1]!);
        const body = (await readJson(req)) as { command?: Parameters<InMemoryMatchService["submitCommand"]>[1] };
        if (!body.command) {
          send(res, 400, { error: "missing_command" });
          return;
        }
        const match = service.submitCommandForSession(matchId, body.command, sessionFromRequest(req));
        send(res, 200, { matchId, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchGet = url.pathname.match(/^\/matches\/([^/]+)$/);
      if (req.method === "GET" && matchGet) {
        const matchId = decodeURIComponent(matchGet[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }
        send(res, 200, { matchId, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchState = url.pathname.match(/^\/matches\/([^/]+)\/state$/);
      if (req.method === "GET" && matchState) {
        const matchId = decodeURIComponent(matchState[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }

        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        send(res, 200, {
          matchId,
          state: projectState(match.state, viewer)
        });
        return;
      }

      const matchReplay = url.pathname.match(/^\/matches\/([^/]+)\/replay$/);
      if (req.method === "GET" && matchReplay) {
        const matchId = decodeURIComponent(matchReplay[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }

        const fromSequence = Number(url.searchParams.get("fromSequence") ?? "0") || 0;
        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        send(res, 200, {
          matchId,
          events: match.events
            .filter((event) => event.sequence > fromSequence)
            .map((event) => projectEvent(event, match.state, viewer))
            .filter((event) => event !== null),
          lastSequence: match.state.lastSequence
        });
        return;
      }

      const matchEvents = url.pathname.match(/^\/matches\/([^/]+)\/events$/);
      if (req.method === "GET" && matchEvents) {
        const matchId = decodeURIComponent(matchEvents[1]!);
        const lastEventId = req.headers["last-event-id"];
        const lastSequence =
          Number(url.searchParams.get("lastSequence") ?? (Array.isArray(lastEventId) ? lastEventId[0] : lastEventId) ?? "0") || 0;
        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        res.writeHead(200, SSE_HEADERS);
        attachMatchEventSseStream(
          service,
          matchId,
          viewer,
          res,
          { lastSequence }
        );
        return;
      }

      send(res, 404, { error: "not_found" });
    } catch (error) {
      const response = errorResponse(error);
      send(res, response.status, response.payload);
    }
  });

  server.on("upgrade", (req, socket, head) => {
    try {
      if (!handleMilletWebSocketUpgrade(service, req, socket, head)) {
        socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        socket.destroy();
      }
    } catch (error) {
      socket.write(`HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n${error instanceof Error ? error.message : String(error)}`);
      socket.destroy();
    }
  });

  return server;
}
