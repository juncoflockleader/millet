import { hashValue } from "../../engine-core/src/hash.ts";
import { assertStateInvariants } from "../../engine-core/src/invariants.ts";
import { reduceEvent } from "../../engine-core/src/reducer.ts";
import { createEmptyMatchState } from "../../engine-core/src/state.ts";
import type { MatchEvent, MatchState } from "../../engine-core/src/types.ts";

export interface ReplayFixture {
  id: string;
  events: MatchEvent[];
  expect?: {
    finalStateHash?: string;
    objectZones?: Record<string, string>;
    zoneObjects?: Record<string, string[]>;
  };
}

export interface ReplayResult {
  state: MatchState;
  finalStateHash: string;
  stateHashes: string[];
}

export function replayEvents(events: readonly MatchEvent[], initialState = createEmptyMatchState()): ReplayResult {
  let state = initialState;
  const stateHashes: string[] = [];

  for (const event of events) {
    state = reduceEvent(state, event);
    assertStateInvariants(state);

    const stateHash = hashValue(state);
    stateHashes.push(stateHash);

    if (event.stateHashAfter && event.stateHashAfter !== stateHash) {
      throw new Error(`State hash mismatch after event ${event.sequence}: expected ${event.stateHashAfter}, got ${stateHash}`);
    }
  }

  return {
    state,
    finalStateHash: hashValue(state),
    stateHashes
  };
}

export function replayFixture(fixture: ReplayFixture): ReplayResult {
  const result = replayEvents(fixture.events);

  if (fixture.expect?.finalStateHash && fixture.expect.finalStateHash !== result.finalStateHash) {
    throw new Error(
      `Fixture ${fixture.id} final hash mismatch: expected ${fixture.expect.finalStateHash}, got ${result.finalStateHash}`
    );
  }

  for (const [objectId, zoneId] of Object.entries(fixture.expect?.objectZones ?? {})) {
    const object = result.state.objects[objectId];

    if (!object) {
      throw new Error(`Fixture ${fixture.id} expected object ${objectId} to exist`);
    }

    if (object.zoneId !== zoneId) {
      throw new Error(`Fixture ${fixture.id} expected object ${objectId} in ${zoneId}, got ${object.zoneId}`);
    }
  }

  for (const [zoneId, objectIds] of Object.entries(fixture.expect?.zoneObjects ?? {})) {
    const zone = result.state.zones[zoneId];

    if (!zone) {
      throw new Error(`Fixture ${fixture.id} expected zone ${zoneId} to exist`);
    }

    if (JSON.stringify(zone.objectIds) !== JSON.stringify(objectIds)) {
      throw new Error(
        `Fixture ${fixture.id} expected zone ${zoneId} objects ${JSON.stringify(objectIds)}, got ${JSON.stringify(zone.objectIds)}`
      );
    }
  }

  return result;
}
