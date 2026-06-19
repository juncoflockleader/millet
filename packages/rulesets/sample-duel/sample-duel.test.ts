import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyMatchState,
  advanceTurnToNextAlive,
  getSelectorCandidates,
  reduceEvent,
  resolveCommand,
  runPhaseGraph,
  type MatchCommand,
  type MatchState
} from "../../engine-core/src/index.ts";
import { createSampleDuelSetupEvents, sampleDuelBehaviors, sampleDuelPhaseGraph } from "./sample-duel.ts";

function setup(options = {}): MatchState {
  return createSampleDuelSetupEvents(options).reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function execute(state: MatchState, command: MatchCommand) {
  return resolveCommand(state, command, {
    behaviorLibrary: sampleDuelBehaviors,
    outcomeMode: "last_alive"
  });
}

test("sample-duel declares a winner when a hero reaches zero health", () => {
  const result = execute(setup({ p2Health: 3, p1Mana: 2 }), {
    id: "cmd_firebolt",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.players.p2?.status, "dead");
  assert.equal(result.state.outcomes[0]?.results.find((item) => item.playerId === "p1")?.status, "won");
  assert.equal(result.state.outcomes[0]?.results.find((item) => item.playerId === "p2")?.status, "lost");
});

test("sample-duel declares a draw for simultaneous hero death", () => {
  const result = execute(setup({ p1Health: 2, p2Health: 2, p1Mana: 2 }), {
    id: "cmd_nova",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "nova",
      sourceObjectId: "card_nova"
    }
  });

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.players.p1?.status, "dead");
  assert.equal(result.state.players.p2?.status, "dead");
  assert.deepEqual(result.state.outcomes[0]?.results.map((item) => item.status), ["draw", "draw"]);
});

test("sample-duel applies escalating fatigue damage from empty deck draws", () => {
  let state = setup({ p1Health: 10 });
  state = reduceEvent(state, {
    id: "evt_remove_reward",
    matchId: "sample_duel_match",
    sequence: state.lastSequence + 1,
    transactionId: "tx_test",
    type: "card_moved",
    payload: {
      objectId: "card_reward",
      fromZoneId: "zone_deck_p1",
      toZoneId: "zone_discard"
    },
    visibility: { default: { kind: "public" } }
  });

  const first = execute(state, {
    id: "cmd_fatigue_1",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: { behaviorId: "draw_or_fatigue" }
  });
  const second = execute(first.state, {
    id: "cmd_fatigue_2",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: { behaviorId: "draw_or_fatigue" }
  });

  assert.equal(first.state.players.p1?.resources.fatigue.current, 1);
  assert.equal(first.state.players.p1?.resources.health.current, 9);
  assert.equal(second.state.players.p1?.resources.fatigue.current, 2);
  assert.equal(second.state.players.p1?.resources.health.current, 7);
});

test("sample-duel resolves a death trigger once in deterministic order", () => {
  const result = execute(setup(), {
    id: "cmd_death_draw",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "arm_death_draw",
      sourceObjectId: "minion_loot"
    }
  });

  assert.deepEqual(result.events.map((event) => event.type), [
    "trigger_registered",
    "object_destroyed",
    "trigger_fired",
    "card_moved"
  ]);
  assert.deepEqual(result.state.zones.zone_graveyard?.objectIds, ["minion_loot"]);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, ["card_firebolt", "card_nova", "card_reward"]);
});

test("sample-duel exposes legal targeting metadata", () => {
  const state = setup();
  const candidates = getSelectorCandidates(state, sampleDuelBehaviors.behaviors.firebolt!, "target", {
    controllerId: "p1"
  });

  assert.deepEqual(candidates, [
    { id: "p1", legal: false, reasons: ["self_not_allowed"] },
    { id: "p2", legal: true, reasons: [] }
  ]);
});

test("sample-duel can open a mulligan-style prompt", () => {
  const result = execute(setup(), {
    id: "cmd_mulligan",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: { behaviorId: "mulligan_prompt" }
  });

  assert.equal(result.state.prompts.prompt_mulligan_p1?.status, "open");
  assert.equal(result.state.prompts.prompt_mulligan_p1?.promptType, "select_cards");
});

test("sample-duel second player coin grants one current mana and discards itself", () => {
  const result = execute(setup({ p2Mana: 0, p2Health: 10 }), {
    id: "cmd_coin",
    matchId: "sample_duel_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "coin",
      sourceObjectId: "card_coin_p2"
    }
  });

  assert.equal(result.state.players.p2?.resources.mana.current, 1);
  assert.deepEqual(result.state.zones.zone_hand_p2?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_discard?.objectIds, ["card_coin_p2"]);
});

test("sample-duel hero focus spends mana and damages the enemy hero", () => {
  const result = execute(setup({ p1Mana: 10, p2Health: 10 }), {
    id: "cmd_hero_focus",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "hero_focus",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p1?.resources.mana.current, 8);
  assert.equal(result.state.players.p2?.resources.health.current, 9);
  assert.deepEqual(result.events.map((event) => event.type), ["resource_changed", "damage_dealt", "resource_changed"]);
});

test("sample-duel phase graph refreshes mana, draws, and stops at main action window", () => {
  const state = setup({ p1Mana: 0, p1Health: 10 });
  const result = runPhaseGraph(state, sampleDuelPhaseGraph, {
    activePlayerId: "p1",
    behaviorLibrary: sampleDuelBehaviors,
    outcomeMode: "last_alive"
  });

  assert.equal(result.stoppedAtActionWindow, true);
  assert.equal(result.state.turn.phaseId, "main");
  assert.equal(result.state.players.p1?.resources.mana.current, 10);
  assert.deepEqual(result.state.zones.zone_deck_p1?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, ["card_firebolt", "card_nova", "card_reward"]);
  const mainPrompt = Object.values(result.state.prompts).find((prompt) => prompt.promptType === "main_action");
  assert.equal(mainPrompt?.status, "open");
  assert.deepEqual(mainPrompt?.responderIds, ["p1"]);
});

test("sample-duel phase graph uses the active player's zones and prompt", () => {
  const state = setup({ p2Mana: 0, p2Health: 10 });
  const result = runPhaseGraph(state, sampleDuelPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleDuelBehaviors,
    outcomeMode: "last_alive"
  });

  assert.equal(result.stoppedAtActionWindow, true);
  assert.equal(result.state.turn.phaseId, "main");
  assert.equal(result.state.players.p2?.resources.mana.current, 10);
  assert.deepEqual(result.state.zones.zone_deck_p2?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_hand_p2?.objectIds, ["card_coin_p2", "card_reward_p2"]);
  const mainPrompt = Object.values(result.state.prompts).find((prompt) => prompt.promptType === "main_action");
  assert.equal(mainPrompt?.status, "open");
  assert.deepEqual(mainPrompt?.responderIds, ["p2"]);
});

test("sample-duel minion attacks exhaust the attacker and cannot repeat while exhausted", () => {
  const first = execute(setup({ p2Health: 10 }), {
    id: "cmd_minion_attack",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "minion_attack",
      sourceObjectId: "minion_loot",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(first.state.players.p2?.resources.health.current, 9);
  assert.equal(first.state.objects.minion_loot?.exhausted, true);
  assert.throws(() =>
    execute(first.state, {
      id: "cmd_minion_attack_again",
      matchId: "sample_duel_match",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "minion_attack",
        sourceObjectId: "minion_loot",
        selections: { target: ["p2"] }
      }
    })
  );
});

test("sample-duel weapon attacks spend durability and destroy the weapon at zero", () => {
  const first = execute(setup({ p2Health: 10 }), {
    id: "cmd_weapon_attack_1",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "weapon_attack",
      sourceObjectId: "weapon_axe_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(first.state.players.p2?.resources.health.current, 8);
  assert.equal(first.state.objects.weapon_axe_p1?.counters.durability, 1);
  assert.deepEqual(first.state.zones.zone_weapon_p1?.objectIds, ["weapon_axe_p1"]);
  assert.ok(first.events.some((event) => event.type === "object_counter_changed"));

  const second = execute(first.state, {
    id: "cmd_weapon_attack_2",
    matchId: "sample_duel_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "weapon_attack",
      sourceObjectId: "weapon_axe_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(second.state.players.p2?.resources.health.current, 6);
  assert.equal(second.state.objects.weapon_axe_p1?.counters.durability, 0);
  assert.deepEqual(second.state.zones.zone_weapon_p1?.objectIds, []);
  assert.deepEqual(second.state.zones.zone_discard?.objectIds, ["weapon_axe_p1"]);
  assert.ok(second.events.some((event) => event.type === "object_destroyed"));
});

test("sample-duel can advance turn to next alive player", () => {
  const state = setup();
  const advanced = advanceTurnToNextAlive(state, "p1");

  assert.equal(advanced.state.turn.activePlayerId, "p2");
  assert.equal(advanced.event.type, "turn_advanced");
});
