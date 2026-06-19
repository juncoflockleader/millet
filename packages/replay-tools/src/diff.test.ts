import { test } from "node:test";
import assert from "node:assert/strict";
import { createEmptyMatchState, reduceEvent, type MatchState } from "../../engine-core/src/index.ts";
import { createSampleDuelSetupEvents } from "../../rulesets/sample-duel/sample-duel.ts";
import { createMatchStateDiff, diffValues } from "./diff.ts";

function sampleDuelState(): MatchState {
  return createSampleDuelSetupEvents().reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

test("diffValues reports structural path differences", () => {
  assert.deepEqual(diffValues({ a: { b: 1 } }, { a: { b: 2 } }), [{ path: "$.a.b", left: 1, right: 2 }]);
});

test("createMatchStateDiff summarizes match-level and gameplay changes", () => {
  const left = sampleDuelState();
  const right = structuredClone(left);
  const cardId = "card_firebolt";

  right.status = "completed";
  right.lastSequence = left.lastSequence + 4;
  right.turn.activePlayerId = "p2";
  right.turn.phaseId = "main";
  right.players.p2!.status = "dead";
  right.players.p2!.resources.health.current = 0;
  right.objects[cardId]!.zoneId = "zone_discard";
  right.objects[cardId]!.position = 0;
  right.zones.zone_hand_p1!.objectIds = right.zones.zone_hand_p1!.objectIds.filter((objectId) => objectId !== cardId);
  right.zones.zone_discard!.objectIds = [cardId];
  right.prompts.prompt_main = {
    id: "prompt_main",
    status: "open",
    responderIds: ["p2"],
    currentResponderId: "p2",
    promptType: "main_action",
    responseMode: "single",
    openedAtSequence: right.lastSequence
  };
  right.outcomes.push({
    id: "outcome_1",
    status: "completed",
    results: [
      { playerId: "p1", status: "won", reason: "last_alive" },
      { playerId: "p2", status: "lost", reason: "dead" }
    ]
  });

  const report = createMatchStateDiff(left, right);
  const summaries = report.semanticDiffs.map((entry) => entry.summary);

  assert.equal(report.equal, false);
  assert.ok(report.counts.structural > 0);
  assert.ok(report.counts.semantic > 0);
  assert.ok(summaries.some((summary) => summary.includes("Match status changed")));
  assert.ok(summaries.some((summary) => summary.includes("Turn activePlayerId changed")));
  assert.ok(summaries.some((summary) => summary.includes("Player p2 status changed")));
  assert.ok(summaries.some((summary) => summary.includes("Player p2 health changed from 3/30 to 0/30")));
  assert.ok(summaries.some((summary) => summary.includes("Zone zone_discard added [card_firebolt]")));
  assert.ok(summaries.some((summary) => summary.includes("Object card_firebolt moved")));
  assert.ok(summaries.some((summary) => summary.includes("Prompt prompt_main was added")));
  assert.ok(summaries.some((summary) => summary.includes("Outcome outcome_1 was added")));
});

test("createMatchStateDiff reports equality for identical states", () => {
  const state = sampleDuelState();
  const report = createMatchStateDiff(state, structuredClone(state));

  assert.equal(report.equal, true);
  assert.equal(report.counts.structural, 0);
  assert.equal(report.counts.semantic, 0);
});
