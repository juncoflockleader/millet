import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DeterministicRng, hashValue } from "../../engine-core/src/index.ts";
import type { MatchEvent } from "../../engine-core/src/types.ts";
import { replayEvents, replayFixture, type ReplayFixture } from "./replay.ts";

function readFixture(path: string): ReplayFixture {
  return JSON.parse(readFileSync(path, "utf8")) as ReplayFixture;
}

test("replays the M0 zone movement fixture deterministically", () => {
  const fixture = readFixture("packages/replay-tools/fixtures/m0-zone-movement.fixture.json");
  const first = replayFixture(fixture);
  const second = replayFixture(fixture);

  assert.equal(first.finalStateHash, second.finalStateHash);
  assert.deepEqual(first.state, second.state);
  assert.equal(first.state.matchId, "match_m0");
  assert.equal(first.state.objects.card_1?.zoneId, "zone_hand_p1");
  assert.deepEqual(first.state.zones.zone_deck_p1?.objectIds, []);
  assert.deepEqual(first.state.zones.zone_hand_p1?.objectIds, ["card_1"]);
  assert.equal(first.state.lastSequence, fixture.events.length);
});

test("rejects event sequence gaps", () => {
  const fixture = readFixture("packages/replay-tools/fixtures/m0-zone-movement.fixture.json");
  const events = structuredClone(fixture.events);
  events[2]!.sequence = 99;

  assert.throws(() => replayEvents(events), /Expected event sequence 3, got 99/);
});

test("rejects moving an object from the wrong zone", () => {
  const fixture = readFixture("packages/replay-tools/fixtures/m0-zone-movement.fixture.json");
  const events = structuredClone(fixture.events) as MatchEvent[];
  const moveEvent = events.find((event) => event.type === "card_moved");

  assert.ok(moveEvent);
  moveEvent.payload = {
    objectId: "card_1",
    fromZoneId: "zone_hand_p1",
    toZoneId: "zone_hand_p1"
  };

  assert.throws(() => replayEvents(events), /Object card_1 is in zone_deck_p1, not zone_hand_p1/);
});

test("hashes are stable regardless of object key insertion order", () => {
  const left = { b: 2, a: { d: 4, c: 3 } };
  const right = { a: { c: 3, d: 4 }, b: 2 };

  assert.equal(hashValue(left), hashValue(right));
});

test("deterministic RNG repeats for the same seed and cursor", () => {
  const first = new DeterministicRng("seed-a");
  const second = new DeterministicRng("seed-a");
  const third = new DeterministicRng("seed-b");

  assert.deepEqual(
    [first.nextUint32(), first.nextUint32(), first.nextUint32()],
    [second.nextUint32(), second.nextUint32(), second.nextUint32()]
  );
  assert.notDeepEqual(
    [new DeterministicRng("seed-a").nextUint32()],
    [third.nextUint32()]
  );
});
