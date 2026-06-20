import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyMatchState,
  reduceEvent,
  resolveCommand,
  runPhaseGraph,
  type MatchCommand,
  type MatchState
} from "../../engine-core/src/index.ts";
import { createSampleRuneDuelSetupEvents, sampleRuneDuelBehaviors, sampleRuneDuelPhaseGraph } from "./sample-rune-duel.ts";

function setup(options = {}): MatchState {
  return createSampleRuneDuelSetupEvents(options).reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function execute(state: MatchState, command: MatchCommand) {
  return resolveCommand(state, command, {
    behaviorLibrary: sampleRuneDuelBehaviors,
    outcomeMode: "last_alive"
  });
}

test("sample-rune-duel casts a renamed damage spell using existing behavior primitives", () => {
  const result = execute(setup({ p2Health: 12, p1Mana: 4 }), {
    id: "cmd_rune_dart",
    matchId: "rune_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "rune_dart",
      sourceObjectId: "card_rune_dart",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p1?.resources.mana.current, 3);
  assert.equal(result.state.players.p2?.resources.health.current, 10);
  assert.deepEqual(result.state.zones.zone_discard?.objectIds, ["card_rune_dart"]);
});

test("sample-rune-duel can still declare last-alive outcomes", () => {
  const result = execute(setup({ p2Health: 2, p1Mana: 4 }), {
    id: "cmd_rune_lethal",
    matchId: "rune_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "rune_dart",
      sourceObjectId: "card_rune_dart",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.players.p2?.status, "dead");
  assert.equal(result.state.outcomes[0]?.results.find((item) => item.playerId === "p1")?.status, "won");
});

test("sample-rune-duel weapon attacks use counters and destroy the source", () => {
  const result = execute(setup({ p2Health: 12 }), {
    id: "cmd_staff_attack",
    matchId: "rune_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "dueling_staff_attack",
      sourceObjectId: "weapon_dueling_staff_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p2?.resources.health.current, 10);
  assert.deepEqual(result.state.zones.zone_weapon_p1?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_discard?.objectIds, ["weapon_dueling_staff_p1"]);
});

test("sample-rune-duel phase graph refreshes, draws, and opens the main action window", () => {
  const result = runPhaseGraph(setup({ p1Mana: 0 }), sampleRuneDuelPhaseGraph, {
    activePlayerId: "p1",
    behaviorLibrary: sampleRuneDuelBehaviors,
    outcomeMode: "last_alive"
  });

  assert.equal(result.stoppedAtActionWindow, true);
  assert.equal(result.state.turn.phaseId, "main");
  assert.equal(result.state.players.p1?.resources.mana.current, 4);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, ["card_rune_dart", "card_chain_flash", "card_echo_rune"]);
  assert.ok(Object.values(result.state.prompts).some((prompt) => prompt.promptType === "main_action"));
});
