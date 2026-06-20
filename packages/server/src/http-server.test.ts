import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
    staticRoot: join("packages", "demo-basic-duel", "public"),
    rulesetRoot: join("packages", "rulesets")
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

  const boardLayout = await dispatch(server, {
    method: "GET",
    url: "/content/rulesets/sample-duel/ui/ember-duel-board-layout.json"
  });
  assert.equal(boardLayout.statusCode, 200);
  assert.equal(boardLayout.headers["content-type"], "application/json");
  assert.equal(boardLayout.json.kind, "board_layout");

  const presentation = await dispatch(server, {
    method: "GET",
    url: "/content/rulesets/sample-duel/ui/ember-duel-presentation.json"
  });
  assert.equal(presentation.statusCode, 200);
  assert.equal(presentation.headers["content-type"], "application/json");
  assert.equal(presentation.json.kind, "presentation_catalog");

  const behaviorSummaries = await dispatch(server, {
    method: "GET",
    url: "/content/rulesets/sample-duel/behavior-summaries.json"
  });
  assert.equal(behaviorSummaries.statusCode, 200);
  assert.equal(behaviorSummaries.headers["content-type"], "application/json");
  assert.equal(behaviorSummaries.json.kind, "behavior_summaries");
  assert.equal(((behaviorSummaries.json.behaviors as Record<string, unknown>).firebolt as Record<string, unknown>).canonicalText, "Deal 3 damage. Move this card.");
  assert.deepEqual((((behaviorSummaries.json.behaviors as Record<string, unknown>).firebolt as Record<string, unknown>).uxHints as Record<string, unknown>).effects, ["deal_damage", "move_card"]);
});

test("HTTP asset promotion writes imported draft files and updates manifest", async () => {
  const root = mkdtempSync(join(tmpdir(), "millet-asset-promotion-"));
  try {
    const staticRoot = join(root, "public");
    const rulesetRoot = join(root, "rulesets");
    mkdirSync(join(rulesetRoot, "sample-duel"), { recursive: true });
    mkdirSync(staticRoot, { recursive: true });
    writeFileSync(join(rulesetRoot, "sample-duel", "asset-manifest.json"), JSON.stringify({
      id: "sample-duel-assets",
      version: "0.2.0",
      assets: [
        {
          assetId: "card-art-firebolt",
          version: "0.1.0",
          kind: "card_art",
          contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sourceUri: "memory://sample-duel/generated/card-art-firebolt",
          publicPath: "/assets/cards/firebolt.png",
          license: "first-party-dev",
          owner: "millet",
          mediaType: "image/png",
          width: 1070,
          height: 1470,
          usage: ["card firebolt art"]
        }
      ]
    }, null, 2));

    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAABQABDQottAAAAABJRU5ErkJggg==";
    const server = createMilletHttpServer(new InMemoryMatchService(), { staticRoot, rulesetRoot });
    const response = await dispatch(server, {
      method: "POST",
      url: "/authoring/assets/promote",
      body: {
        rulesetId: "sample-duel",
        entry: {
          assetId: "card-art-firebolt",
          version: "0.1.0",
          kind: "card_art",
          contentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          sourceUri: "local-file://firebolt.png",
          publicPath: dataUrl,
          license: "first-party-dev",
          owner: "millet",
          mediaType: "image/png",
          width: 2,
          height: 2,
          usage: ["card firebolt art", "local imported draft"]
        }
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.publicPath, "/assets/imported/sample-duel/card-art-firebolt.png");
    assert.equal((response.json.asset as Record<string, unknown>).contentHash, "sha256:7d9dd2bb8ee946f3f00033c887451247d8363e63bd4e13294c870e5506da42d6");
    assert.equal((response.json.asset as Record<string, unknown>).sourceUri, "file:///assets/imported/sample-duel/card-art-firebolt.png");
    assert.ok(existsSync(join(staticRoot, "assets", "imported", "sample-duel", "card-art-firebolt.png")));

    const manifest = JSON.parse(readFileSync(join(rulesetRoot, "sample-duel", "asset-manifest.json"), "utf8")) as { assets: Record<string, unknown>[] };
    assert.equal(manifest.assets[0]?.publicPath, "/assets/imported/sample-duel/card-art-firebolt.png");
    assert.equal(manifest.assets[0]?.mediaType, "image/png");
    assert.equal(manifest.assets[0]?.width, 2);
    assert.equal(manifest.assets[0]?.height, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP asset promotion rejects non-data-url drafts", async () => {
  const root = mkdtempSync(join(tmpdir(), "millet-asset-promotion-reject-"));
  try {
    const staticRoot = join(root, "public");
    const rulesetRoot = join(root, "rulesets");
    mkdirSync(join(rulesetRoot, "sample-duel"), { recursive: true });
    mkdirSync(staticRoot, { recursive: true });
    writeFileSync(join(rulesetRoot, "sample-duel", "asset-manifest.json"), JSON.stringify({
      id: "sample-duel-assets",
      version: "0.2.0",
      assets: [
        {
          assetId: "card-art-firebolt",
          version: "0.1.0",
          kind: "card_art",
          contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sourceUri: "memory://sample-duel/generated/card-art-firebolt",
          license: "first-party-dev",
          owner: "millet"
        }
      ]
    }, null, 2));

    const server = createMilletHttpServer(new InMemoryMatchService(), { staticRoot, rulesetRoot });
    const response = await dispatch(server, {
      method: "POST",
      url: "/authoring/assets/promote",
      body: {
        rulesetId: "sample-duel",
        entry: {
          assetId: "card-art-firebolt",
          publicPath: "/assets/cards/firebolt.png",
          width: 2,
          height: 2
        }
      }
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json.error, "bad_request");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP asset promotion can create a new manifest entry", async () => {
  const root = mkdtempSync(join(tmpdir(), "millet-asset-promotion-create-"));
  try {
    const staticRoot = join(root, "public");
    const rulesetRoot = join(root, "rulesets");
    mkdirSync(join(rulesetRoot, "sample-duel"), { recursive: true });
    mkdirSync(staticRoot, { recursive: true });
    writeFileSync(join(rulesetRoot, "sample-duel", "asset-manifest.json"), JSON.stringify({
      id: "sample-duel-assets",
      version: "0.2.0",
      assets: []
    }, null, 2));

    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAABQABDQottAAAAABJRU5ErkJggg==";
    const server = createMilletHttpServer(new InMemoryMatchService(), { staticRoot, rulesetRoot });
    const response = await dispatch(server, {
      method: "POST",
      url: "/authoring/assets/promote",
      body: {
        rulesetId: "sample-duel",
        mode: "create",
        entry: {
          assetId: "new-card-art",
          version: "0.1.0",
          kind: "card_art",
          contentHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          sourceUri: "local-file://new-card-art.png",
          publicPath: dataUrl,
          license: "first-party-dev",
          owner: "millet",
          mediaType: "image/png",
          width: 2,
          height: 2,
          usage: ["new asset draft"]
        }
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.publicPath, "/assets/imported/sample-duel/new-card-art.png");
    const manifest = JSON.parse(readFileSync(join(rulesetRoot, "sample-duel", "asset-manifest.json"), "utf8")) as { assets: Record<string, unknown>[] };
    assert.equal(manifest.assets.length, 1);
    assert.equal(manifest.assets[0]?.assetId, "new-card-art");
    assert.equal(manifest.assets[0]?.publicPath, "/assets/imported/sample-duel/new-card-art.png");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP card catalog promotion writes a guarded catalog draft", async () => {
  const root = mkdtempSync(join(tmpdir(), "millet-card-catalog-promotion-"));
  try {
    const rulesetRoot = join(root, "rulesets");
    mkdirSync(join(rulesetRoot, "sample-duel"), { recursive: true });
    writeFileSync(join(rulesetRoot, "sample-duel", "card-catalog.json"), JSON.stringify({
      id: "sample-duel-cards",
      version: "0.1.0",
      templates: [
        {
          templateId: "firebolt",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.firebolt.name"
        }
      ]
    }, null, 2));

    const catalog = {
      id: "sample-duel-cards",
      version: "0.1.1",
      templates: [
        {
          templateId: "firebolt",
          version: "0.1.1",
          objectType: "card",
          nameKey: "card.firebolt.name",
          manaCost: 3
        },
        {
          templateId: "new_spell",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.new_spell.name"
        }
      ]
    };
    const server = createMilletHttpServer(new InMemoryMatchService(), { rulesetRoot });
    const response = await dispatch(server, {
      method: "POST",
      url: "/authoring/cards/promote",
      body: {
        rulesetId: "sample-duel",
        catalog
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json.path, "sample-duel/card-catalog.json");
    assert.equal((response.json.catalog as Record<string, unknown>).version, "0.1.1");
    const written = JSON.parse(readFileSync(join(rulesetRoot, "sample-duel", "card-catalog.json"), "utf8")) as Record<string, unknown>;
    assert.equal(written.version, "0.1.1");
    assert.equal((written.templates as unknown[]).length, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP card catalog promotion rejects duplicate template ids", async () => {
  const root = mkdtempSync(join(tmpdir(), "millet-card-catalog-promotion-invalid-"));
  try {
    const rulesetRoot = join(root, "rulesets");
    mkdirSync(join(rulesetRoot, "sample-duel"), { recursive: true });
    const server = createMilletHttpServer(new InMemoryMatchService(), { rulesetRoot });
    const response = await dispatch(server, {
      method: "POST",
      url: "/authoring/cards/promote",
      body: {
        rulesetId: "sample-duel",
        catalog: {
          id: "bad-cards",
          version: "0.1.0",
          templates: [
            { templateId: "duplicate", version: "0.1.0", objectType: "card", nameKey: "a" },
            { templateId: "duplicate", version: "0.1.0", objectType: "card", nameKey: "b" }
          ]
        }
      }
    });

    assert.equal(response.statusCode, 400);
    assert.match(String(response.json.message), /Duplicate card template id duplicate/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("HTTP authoring status reports git dirty-state shape", async () => {
  const server = createMilletHttpServer(new InMemoryMatchService(), {
    staticRoot: join("packages", "demo-basic-duel", "public"),
    rulesetRoot: join("packages", "rulesets")
  });

  const response = await dispatch(server, {
    method: "GET",
    url: "/authoring/status"
  });

  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.json.gitAvailable, "boolean");
  assert.equal(typeof response.json.dirty, "boolean");
  assert.ok(Array.isArray(response.json.changedFiles));
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
