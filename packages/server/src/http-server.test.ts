import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createMilletHttpServer } from "./http-server.ts";
import { InMemoryMatchService } from "./match-service.ts";

async function dispatch(
  server: Server,
  options: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
) {
  const chunks = options.body === undefined ? [] : [Buffer.from(JSON.stringify(options.body))];
  const req = Readable.from(chunks) as IncomingMessage;
  Object.assign(req, {
    method: options.method,
    url: options.url,
    headers: options.headers ?? {}
  });

  const response = {
    statusCode: 0,
    headers: {} as Record<string, unknown>,
    body: "",
    writeHead(statusCode: number, headers: Record<string, unknown>) {
      this.statusCode = statusCode;
      this.headers = headers;
      return this;
    },
    end(chunk?: unknown) {
      this.body = chunk === undefined ? "" : String(chunk);
      return this;
    }
  };

  const listener = server.listeners("request")[0] as (request: IncomingMessage, res: ServerResponse) => Promise<void> | void;
  await listener(req, response as unknown as ServerResponse);

  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body,
    json: response.headers["content-type"] === "application/json" && response.body ? (JSON.parse(response.body) as Record<string, unknown>) : {}
  };
}

test("HTTP server can be constructed around the match API handler", () => {
  const server = createMilletHttpServer();
  assert.equal(typeof server.listen, "function");
  assert.equal(typeof server.close, "function");
  assert.equal(server.listenerCount("upgrade"), 1);
});

test("HTTP server can serve the basic duel demo shell and assets", async () => {
  const server = createMilletHttpServer(new InMemoryMatchService(), {
    staticRoot: join("packages", "demo-basic-duel", "public")
  });

  const html = await dispatch(server, {
    method: "GET",
    url: "/basic-duel"
  });
  assert.equal(html.statusCode, 200);
  assert.equal(html.headers["content-type"], "text/html; charset=utf-8");
  assert.match(html.body, /Ember Duel/);

  const asset = await dispatch(server, {
    method: "GET",
    url: "/assets/ember-duel-board.png"
  });
  assert.equal(asset.statusCode, 200);
  assert.equal(asset.headers["content-type"], "image/png");
  assert.match(asset.body, /^\uFFFDPNG/);

  const cardArt = await dispatch(server, {
    method: "GET",
    url: "/assets/cards/firebolt.png"
  });
  assert.equal(cardArt.statusCode, 200);
  assert.equal(cardArt.headers["content-type"], "image/png");
  assert.match(cardArt.body, /^\uFFFDPNG/);

  const effectSheet = await dispatch(server, {
    method: "GET",
    url: "/assets/effects/firebolt-sheet.png"
  });
  assert.equal(effectSheet.statusCode, 200);
  assert.equal(effectSheet.headers["content-type"], "image/png");
  assert.match(effectSheet.body, /^\uFFFDPNG/);
});

test("HTTP state endpoint returns viewer-projected match state", async () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const server = createMilletHttpServer(service);

  const response = await dispatch(server, {
    method: "GET",
    url: `/matches/${match.id}/state?playerId=p2`,
    headers: { "x-millet-user-id": "u2" }
  });

  assert.equal(response.statusCode, 200);
  const state = response.json.state as {
    objects: Record<string, { objectType?: string; templateId?: string }>;
  };
  assert.equal(state.objects.card_coin_p2?.templateId, "coin");
  assert.equal(state.objects.card_firebolt?.objectType, "hidden");
  assert.equal(state.objects.card_firebolt?.templateId, undefined);
  assert.equal(state.objects.minion_loot?.templateId, "loot_minion");
  assert.equal(state.objects.weapon_axe_p1?.templateId, "training_axe");
});

test("HTTP replay endpoint returns projected events after a sequence cursor", async () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const server = createMilletHttpServer(service);
  const setupLastSequence = match.state.lastSequence;

  service.submitCommand(match.id, {
    id: "cmd_http_replay_firebolt",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });

  const projected = await dispatch(server, {
    method: "GET",
    url: `/matches/${match.id}/replay?playerId=p2`,
    headers: { "x-millet-user-id": "u2" }
  });
  assert.equal(projected.statusCode, 200);
  const projectedEvents = projected.json.events as { type: string; payload: { object?: { id?: string; objectType?: string; templateId?: string } } }[];
  const hiddenFirebolt = projectedEvents.find((event) => event.type === "object_created" && event.payload.object?.id === "card_firebolt");
  assert.equal(hiddenFirebolt?.payload.object?.objectType, "hidden");
  assert.equal(hiddenFirebolt?.payload.object?.templateId, undefined);

  const admin = await dispatch(server, {
    method: "GET",
    url: `/matches/${match.id}/replay?admin=true&fromSequence=${setupLastSequence}`,
    headers: { "x-millet-admin": "true" }
  });
  assert.equal(admin.statusCode, 200);
  const adminEvents = admin.json.events as { type: string }[];
  assert.deepEqual(adminEvents.map((event) => event.type), ["resource_changed", "damage_dealt", "resource_changed", "player_status_changed", "outcome_declared", "card_moved"]);
});

test("HTTP command endpoint returns structured engine rejection payloads", async () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const server = createMilletHttpServer(service);

  const response = await dispatch(server, {
    method: "POST",
    url: `/matches/${match.id}/commands`,
    headers: { "x-millet-user-id": "u1" },
    body: {
      command: {
        id: "cmd_http_invalid_selection",
        matchId: match.id,
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "firebolt",
          sourceObjectId: "card_firebolt",
          selections: { target: [] }
        }
      }
    }
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.json.error, "invalid_selection_count");
  assert.match(String(response.json.message), /Selector target/);
});
