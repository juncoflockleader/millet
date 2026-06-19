import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { FileBundleStore } from "../../content-build/src/store.ts";
import { FileMatchStore, FileScheduledActionStore } from "./file-store.ts";
import { InMemoryMatchService } from "./match-service.ts";

test("file match store persists events and reloads state by replay with content-lock verification", () => {
  const bundleStore = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-bundles-")));
  const service = new InMemoryMatchService({ bundleStore });
  const match = service.createMatch("sample-duel");
  const updated = service.submitCommand(match.id, {
    id: "cmd_firebolt",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });

  const store = new FileMatchStore(mkdtempSync(join(tmpdir(), "millet-store-")));
  store.save(updated);
  const loaded = new FileMatchStore(store.rootDir, { bundleStore }).load(updated.id);

  assert.equal(loaded.state.status, "completed");
  assert.equal(loaded.events.length, updated.events.length);
  assert.deepEqual(loaded.state.outcomes, updated.state.outcomes);
  assert.equal(loaded.state.contentLock?.gameDefinition.contentHash, bundleStore.list()[0]?.contentHash);

  const emptyBundleStore = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-empty-bundles-")));
  assert.throws(() => new FileMatchStore(store.rootDir, { bundleStore: emptyBundleStore }).load(updated.id), /Missing content bundle/);
});

test("file match store applies snapshot retention without losing replay recovery", () => {
  const bundleStore = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-retention-bundles-")));
  const service = new InMemoryMatchService({ bundleStore });
  const match = service.createMatch("sample-duel");
  match.snapshots.push(
    { sequence: 10, state: structuredClone(match.state) },
    { sequence: 20, state: structuredClone(match.state) },
    { sequence: 30, state: structuredClone(match.state) }
  );

  const store = new FileMatchStore(mkdtempSync(join(tmpdir(), "millet-retention-store-")), { bundleStore, maxSnapshots: 2 });
  store.save(match);

  const persisted = JSON.parse(readFileSync(join(store.rootDir, match.id, "snapshots.json"), "utf8")) as { sequence: number }[];
  assert.deepEqual(persisted.map((snapshot) => snapshot.sequence), [20, 30]);

  const loaded = store.load(match.id);
  assert.equal(loaded.events.length, match.events.length);
  assert.deepEqual(loaded.snapshots.map((snapshot) => snapshot.sequence), [20, 30]);
  assert.equal(loaded.state.lastSequence, match.state.lastSequence);
});

test("file match store rejects invalid snapshot retention settings", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const store = new FileMatchStore(mkdtempSync(join(tmpdir(), "millet-invalid-retention-store-")), { maxSnapshots: 0 });

  assert.throws(() => store.save(match), /maxSnapshots must be a positive integer/);
});

test("file scheduled action store persists timers that can fire after service restart", () => {
  const bundleStore = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-restart-bundles-")));
  const service = new InMemoryMatchService({ bundleStore });
  const match = service.createMatch("sample-identity");
  const disconnected = service.disconnectPlayer(match.id, "p2");
  service.scheduleReconnectGrace({
    id: "restart_reconnect_grace_p2",
    matchId: match.id,
    playerId: "p2",
    dueAtMs: 1000
  });

  const rootDir = mkdtempSync(join(tmpdir(), "millet-restart-store-"));
  const matchStore = new FileMatchStore(rootDir, { bundleStore });
  const timerStore = new FileScheduledActionStore(rootDir);
  matchStore.save(disconnected);
  timerStore.save(service.scheduler.all());

  const restoredService = new InMemoryMatchService({ scheduledActions: timerStore.load() });
  restoredService.restoreMatch(matchStore.load(match.id));
  const updated = restoredService.advanceTime(1000);

  assert.equal(updated[0]?.state.players.p2?.status, "conceded");
  assert.equal(restoredService.scheduler.all().find((action) => action.id === "restart_reconnect_grace_p2")?.status, "fired");
  assert.equal(restoredService.getMatch(match.id)?.events.at(-1)?.type, "player_status_changed");
});

test("file scheduled action store returns an empty list before timers are saved", () => {
  const store = new FileScheduledActionStore(mkdtempSync(join(tmpdir(), "millet-empty-timers-")));
  assert.deepEqual(store.load(), []);
});

test("file scheduled action store applies retention by newest due time", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "millet-timer-retention-"));
  const store = new FileScheduledActionStore(rootDir, { maxActions: 2 });
  store.save([
    {
      id: "timer_old",
      matchId: "match",
      dueAtMs: 100,
      status: "scheduled",
      command: { id: "cmd_old", matchId: "match", type: "noop", payload: {} }
    },
    {
      id: "timer_newer",
      matchId: "match",
      dueAtMs: 300,
      status: "scheduled",
      command: { id: "cmd_newer", matchId: "match", type: "noop", payload: {} }
    },
    {
      id: "timer_new",
      matchId: "match",
      dueAtMs: 200,
      status: "fired",
      command: { id: "cmd_new", matchId: "match", type: "noop", payload: {} }
    }
  ]);

  assert.deepEqual(store.load().map((action) => action.id), ["timer_new", "timer_newer"]);
});

test("file scheduled action store rejects invalid retention settings", () => {
  const store = new FileScheduledActionStore(mkdtempSync(join(tmpdir(), "millet-invalid-timer-retention-")), { maxActions: 0 });

  assert.throws(() => store.save([]), /maxActions must be a positive integer/);
});
