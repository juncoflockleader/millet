import { test } from "node:test";
import assert from "node:assert/strict";
import { assertStateInvariants, DeterministicRng, projectState, reduceEvent, resolveCommand, type MatchState } from "./index.ts";
import { createSampleDuelSetupEvents, sampleDuelBehaviors } from "../../rulesets/sample-duel/sample-duel.ts";
import { createSampleIdentitySetupEvents } from "../../rulesets/sample-identity/sample-identity.ts";

function setupDuel(): MatchState {
  return createSampleDuelSetupEvents({ p1Health: 30, p2Health: 30, p1Mana: 30 }).reduce(
    (state, event) => reduceEvent(state, event),
    // Imported lazily to keep this helper tiny.
    {
      matchId: "",
      gameDefinitionId: "",
      gameDefinitionVersion: "",
      seed: "",
      rngCursor: 0,
      status: "setup",
      players: {},
      seats: [],
      objects: {},
      zones: {},
      turn: { turnNumber: 0, roundNumber: 0 },
      prompts: {},
      triggers: [],
      outcomes: [],
      counters: { objectSequence: 0, transactionSequence: 0 },
      lastSequence: 0
    } satisfies MatchState
  );
}

test("seeded random legal duel commands preserve state invariants", () => {
  let state = setupDuel();
  const rng = new DeterministicRng("duel-fuzz");

  for (let step = 0; step < 12 && state.status !== "completed"; step += 1) {
    if (state.players.p2!.resources.health.current <= 0) {
      continue;
    }

    const behaviorId = rng.nextInt(3) === 0 ? "draw_or_fatigue" : "firebolt";
    const sourceObjectId = behaviorId === "firebolt" ? "card_firebolt" : undefined;
    const command =
      behaviorId === "firebolt"
        ? {
            id: `cmd_fuzz_${step}`,
            matchId: state.matchId,
            playerId: "p1",
            type: "execute_behavior",
            payload: {
              behaviorId,
              sourceObjectId,
              selections: { target: ["p2"] }
            }
          }
        : {
            id: `cmd_fuzz_${step}`,
            matchId: state.matchId,
            playerId: "p1",
            type: "execute_behavior",
            payload: { behaviorId }
          };

    const result = resolveCommand(state, command, {
      behaviorLibrary: sampleDuelBehaviors,
      outcomeMode: "last_alive"
    });
    state = result.state;
    assertStateInvariants(state);
  }
});

test("identity projection does not leak hidden non-owner role templates", () => {
  const state = createSampleIdentitySetupEvents(8).reduce(
    (current, event) => reduceEvent(current, event),
    {
      matchId: "",
      gameDefinitionId: "",
      gameDefinitionVersion: "",
      seed: "",
      rngCursor: 0,
      status: "setup",
      players: {},
      seats: [],
      objects: {},
      zones: {},
      turn: { turnNumber: 0, roundNumber: 0 },
      prompts: {},
      triggers: [],
      outcomes: [],
      counters: { objectSequence: 0, transactionSequence: 0 },
      lastSequence: 0
    } satisfies MatchState
  );

  const roleIds = Object.keys(state.objects).filter((id) => id.startsWith("role_"));
  for (const viewerId of Object.keys(state.players)) {
    const projected = projectState(state, { playerId: viewerId });
    for (const roleId of roleIds) {
      const object = projected.objects[roleId]!;
      const ownerId = state.objects[roleId]!.ownerId;
      const isLord = state.objects[roleId]!.templateId === "lord";
      if (ownerId !== viewerId && !isLord) {
        assert.equal(object.templateId, undefined, `${viewerId} should not see ${roleId}`);
        assert.equal(object.objectType, "hidden");
      }
    }
  }
});
