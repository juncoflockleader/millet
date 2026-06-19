import { test } from "node:test";
import assert from "node:assert/strict";
import { collectMatchMetrics, createDebugReport, createMetricsSnapshot, createTransactionLog, formatMetricsText } from "./metrics.ts";
import { InMemoryMatchService } from "./match-service.ts";

test("metrics and debug reports summarize match state and events", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const initialLastSequence = match.state.lastSequence;
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

  const metrics = collectMatchMetrics(updated.state, updated.events);
  assert.equal(metrics.status, "completed");
  assert.equal(metrics.eventTypes.damage_dealt, 1);
  assert.equal(metrics.damageEvents, 1);
  assert.equal(metrics.outcomeCount, 1);

  const report = createDebugReport(updated.state, updated.events);
  assert.equal(report.matchId, match.id);
  assert.ok(report.players.some((player) => player.id === "p2" && player.status === "dead"));
  assert.equal(report.lastEvent?.type, "card_moved");
  assert.ok(report.transactions.some((entry) => entry.commandId === "cmd_firebolt" && entry.eventTypes.includes("outcome_declared")));

  const transactionLog = createTransactionLog(updated.events);
  const commandEntry = transactionLog.find((entry) => entry.commandId === "cmd_firebolt");
  assert.equal(transactionLog[0]?.matchId, match.id);
  assert.equal(transactionLog[0]?.transactionId, "tx_setup");
  assert.equal(commandEntry?.firstSequence, initialLastSequence + 1);
  assert.equal(commandEntry?.lastSequence, updated.state.lastSequence);
  assert.equal(commandEntry?.stateHashAfter, snapshotStateHash(updated.state));

  const snapshot = createMetricsSnapshot(updated.state, updated.events);
  assert.equal(snapshot.format, "millet.metrics.v1");
  assert.equal(snapshot.lastSequence, updated.state.lastSequence);
  assert.equal(snapshot.stateHash.startsWith("sha256:"), true);
  assert.deepEqual(snapshot.openPrompts, []);
  assert.ok(snapshot.contentHashes.every((hash) => hash.startsWith("sha256:")));
  assert.ok(snapshot.players.some((player) => player.id === "p2" && player.health === 0));

  const text = formatMetricsText(snapshot);
  assert.match(text, /millet_match_last_sequence\{match_id="sample_duel_match",game_definition_id="sample-duel",status="completed"\} \d+/);
  assert.match(text, /millet_match_event_type_total\{match_id="sample_duel_match",game_definition_id="sample-duel",status="completed",event_type="damage_dealt"\} 1/);
});

function snapshotStateHash(state: Parameters<typeof createMetricsSnapshot>[0]): string {
  return createMetricsSnapshot(state, []).stateHash;
}
