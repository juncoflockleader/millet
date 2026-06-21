import test from "node:test";
import assert from "node:assert/strict";

import {
  CommandRejectedError,
  createEmptyMatchState,
  reduceEvent,
  resolveCommand,
  runPhaseGraph,
  type MatchCommand,
  type MatchState
} from "../../engine-core/src/index.ts";
import { createSampleManaClashSetupEvents, sampleManaClashBehaviors, sampleManaClashPhaseGraph } from "./sample-mana-clash.ts";

function setup(options: Parameters<typeof createSampleManaClashSetupEvents>[0] = {}): MatchState {
  return createSampleManaClashSetupEvents(options).reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function execute(state: MatchState, command: MatchCommand) {
  return resolveCommand(state, command, {
    behaviorLibrary: sampleManaClashBehaviors,
    outcomeMode: "last_alive",
    deathMode: "direct"
  });
}

test("sample-mana-clash plays and taps a land for mana", () => {
  const played = execute(setup(), {
    id: "cmd_play_land",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_land",
      sourceObjectId: "card_verdant_land_p1"
    }
  });

  assert.deepEqual(played.state.zones.zone_land_p1?.objectIds, ["card_verdant_land_p1"]);
  assert.equal(played.state.objects.card_verdant_land_p1?.zoneId, "zone_land_p1");
  assert.equal(played.state.players.p1?.resources.landDrop.current, 0);

  const tapped = execute(played.state, {
    id: "cmd_tap_land",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "tap_land_for_mana",
      sourceObjectId: "card_verdant_land_p1"
    }
  });

  assert.equal(tapped.state.players.p1?.resources.mana.current, 1);
  assert.equal(tapped.state.objects.card_verdant_land_p1?.exhausted, true);
});

test("sample-mana-clash limits land plays and refreshes tapped permanents", () => {
  const played = execute(setup(), {
    id: "cmd_play_first_land",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_land",
      sourceObjectId: "card_verdant_land_p1"
    }
  });

  assert.throws(
    () =>
      execute(played.state, {
        id: "cmd_play_second_land",
        matchId: "mana_clash_match",
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "play_land",
          sourceObjectId: "card_ember_land_p1"
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const tapped = execute(played.state, {
    id: "cmd_tap_first_land",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "tap_land_for_mana",
      sourceObjectId: "card_verdant_land_p1"
    }
  });
  const refreshed = runPhaseGraph(tapped.state, sampleManaClashPhaseGraph, {
    activePlayerId: "p1",
    behaviorLibrary: sampleManaClashBehaviors,
    outcomeMode: "last_alive",
    deathMode: "direct"
  });

  assert.equal(refreshed.state.players.p1?.resources.landDrop.current, 1);
  assert.equal(refreshed.state.players.p1?.resources.mana.current, 0);
  assert.equal(refreshed.state.objects.card_verdant_land_p1?.exhausted, false);
  assert.equal(refreshed.stoppedAtActionWindow, true);
});

test("sample-mana-clash summons a creature and resolves reciprocal creature combat", () => {
  const summoned = execute(setup({ p1Mana: 2 }), {
    id: "cmd_summon_bear",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_river_bear",
      sourceObjectId: "card_river_bear_p1"
    }
  });

  assert.equal(summoned.state.players.p1?.resources.mana.current, 0);
  assert.equal(summoned.state.objects.card_river_bear_p1?.objectType, "minion");
  assert.equal(summoned.state.objects.card_river_bear_p1?.zoneId, "zone_board_p1");
  assert.equal(summoned.state.objects.card_river_bear_p1?.exhausted, true);

  const refreshed = runPhaseGraph(summoned.state, sampleManaClashPhaseGraph, {
    activePlayerId: "p1",
    behaviorLibrary: sampleManaClashBehaviors,
    outcomeMode: "last_alive",
    deathMode: "direct"
  });
  const fought = execute(refreshed.state, {
    id: "cmd_bear_fight_guard",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "creature_fight_creature",
      sourceObjectId: "card_river_bear_p1",
      selections: { target: ["minion_briar_guard_p2"] }
    }
  });

  assert.equal(fought.state.objects.card_river_bear_p1?.stats.health, 1);
  assert.equal(fought.state.objects.card_river_bear_p1?.exhausted, true);
  assert.equal(fought.state.objects.minion_briar_guard_p2?.zoneId, "zone_graveyard");
  assert.ok(fought.state.zones.zone_graveyard?.objectIds.includes("minion_briar_guard_p2"));
});

test("sample-mana-clash spell can kill a creature and move both cards to graveyard", () => {
  const result = execute(setup({ p1Mana: 1 }), {
    id: "cmd_cinder_bolt_creature",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "cinder_bolt_creature",
      sourceObjectId: "card_cinder_bolt_p1",
      selections: { target: ["minion_briar_guard_p2"] }
    }
  });

  assert.equal(result.state.players.p1?.resources.mana.current, 0);
  assert.equal(result.state.objects.card_cinder_bolt_p1?.zoneId, "zone_graveyard");
  assert.equal(result.state.objects.minion_briar_guard_p2?.zoneId, "zone_graveyard");
  assert.deepEqual(result.state.zones.zone_graveyard?.objectIds, ["minion_briar_guard_p2", "card_cinder_bolt_p1"]);
});

test("sample-mana-clash declares last-alive outcome on lethal spell damage", () => {
  const result = execute(setup({ p1Mana: 1, p2Health: 3 }), {
    id: "cmd_lethal_cinder_bolt",
    matchId: "mana_clash_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "cinder_bolt_hero",
      sourceObjectId: "card_cinder_bolt_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.players.p2?.status, "dead");
  assert.equal(result.state.outcomes[0]?.results.find((item) => item.playerId === "p1")?.status, "won");
});
