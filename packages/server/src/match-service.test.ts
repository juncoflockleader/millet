import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRulesetBundle } from "../../content-build/src/build.ts";
import { FileBundleStore } from "../../content-build/src/store.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { InMemoryMatchService } from "./match-service.ts";

test("in-memory match service creates matches, submits commands, and reconnects projected state", () => {
  const bundleStore = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-service-bundles-")));
  const service = new InMemoryMatchService({ bundleStore });
  const match = service.createMatch("sample-duel");
  const bundle = buildRulesetBundle("packages/rulesets/sample-duel");

  assert.equal(match.id, "sample_duel_match");
  assert.equal(match.state.contentLock?.gameDefinition.contentHash, bundle.contentHash);
  assert.equal(bundleStore.require(bundle.contentHash).id, "sample-duel");
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

  assert.equal(updated.state.status, "completed");
  assert.ok(updated.snapshots.length >= 2);
  const reconnect = service.reconnect(match.id, { playerId: "p1" }, 0);
  assert.equal(reconnect.state.matchId, match.id);
  assert.ok(reconnect.events.length > 0);
});

test("match service publishes event streams and fires scheduled default actions", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const seen: string[] = [];
  service.subscribe(match.id, (events) => {
    seen.push(...events.map((event) => event.type));
  });

  service.scheduleDefaultAction({
    id: "timer_firebolt",
    matchId: match.id,
    dueAtMs: 1000,
    command: {
      id: "cmd_timer_firebolt",
      matchId: match.id,
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "firebolt",
        sourceObjectId: "card_firebolt",
        selections: { target: ["p2"] }
      }
    }
  });

  assert.deepEqual(service.advanceTime(999), []);
  const updated = service.advanceTime(1000);
  assert.equal(updated[0]?.state.status, "completed");
  assert.ok(seen.includes("outcome_declared"));
  assert.equal(service.scheduler.all().find((action) => action.id === "timer_firebolt")?.status, "fired");
});

test("match service authorizes user sessions against seated player ownership", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const initialSequence = match.state.lastSequence;

  assert.throws(
    () =>
      service.submitCommandForSession(
        match.id,
        {
          id: "cmd_wrong_user_firebolt",
          matchId: match.id,
          playerId: "p1",
          type: "execute_behavior",
          payload: {
            behaviorId: "firebolt",
            sourceObjectId: "card_firebolt",
            selections: { target: ["p2"] }
          }
        },
        { userId: "u2" }
      ),
    /cannot act as player/
  );
  assert.equal(service.getMatch(match.id)?.state.lastSequence, initialSequence);

  const updated = service.submitCommandForSession(
    match.id,
    {
      id: "cmd_owner_firebolt",
      matchId: match.id,
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "firebolt",
        sourceObjectId: "card_firebolt",
        selections: { target: ["p2"] }
      }
    },
    { userId: "u1" }
  );
  assert.equal(updated.state.status, "completed");
});

test("match service authorizes projected viewers from user sessions", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");

  assert.throws(
    () => service.reconnectForSession(match.id, { userId: "u2" }, { playerId: "p3" }, 0),
    /cannot act as player/
  );

  const reconnect = service.reconnectForSession(match.id, { userId: "u2" }, { playerId: "p2" }, 0);
  const ownRoleEvent = reconnect.events.find((event) => {
    const payload = event.payload as { object?: { id?: string } };
    return event.type === "object_created" && payload.object?.id === "role_p2";
  });
  const otherRoleEvent = reconnect.events.find((event) => {
    const payload = event.payload as { object?: { id?: string } };
    return event.type === "object_created" && payload.object?.id === "role_p3";
  });

  assert.equal((ownRoleEvent?.payload as { object?: { templateId?: string } }).object?.templateId, "loyalist");
  assert.equal((otherRoleEvent?.payload as { object?: { templateId?: string; objectType?: string } }).object?.templateId, undefined);
  assert.equal((otherRoleEvent?.payload as { object?: { objectType?: string } }).object?.objectType, "hidden");
});

test("match service end_turn advances to next player and starts their phase graph", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const updated = service.submitCommand(match.id, {
    id: "cmd_end_turn",
    matchId: match.id,
    playerId: "p1",
    type: "end_turn",
    payload: {}
  });

  assert.equal(updated.state.turn.activePlayerId, "p2");
  assert.equal(updated.state.turn.phaseId, "main");
  assert.ok(updated.events.some((event) => event.type === "turn_advanced"));
  assert.ok(updated.events.some((event) => event.type === "phase_entered"));
});

test("match service creates a fair demo duel and gates behavior commands by active player", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel", { demoDuel: true });

  assert.equal(match.state.turn.activePlayerId, "p1");
  assert.equal(match.state.turn.phaseId, "main");
  assert.equal(match.state.players.p1?.resources.health.current, 10);
  assert.equal(match.state.players.p2?.resources.health.current, 10);
  assert.ok(match.state.zones.zone_hand_p2?.objectIds.includes("card_firebolt_p2"));
  assert.ok(match.state.zones.zone_board_p2?.objectIds.includes("minion_loot_p2"));

  assert.throws(
    () =>
      service.submitCommand(match.id, {
        id: "cmd_demo_p2_out_of_turn",
        matchId: match.id,
        playerId: "p2",
        type: "execute_behavior",
        payload: {
          behaviorId: "firebolt",
          sourceObjectId: "card_firebolt_p2",
          selections: { target: ["p1"] }
        }
      }),
    /active player p1/
  );

  const p2Turn = service.submitCommand(match.id, {
    id: "cmd_demo_p1_end_turn",
    matchId: match.id,
    playerId: "p1",
    type: "end_turn",
    payload: {}
  });
  assert.equal(p2Turn.state.turn.activePlayerId, "p2");
  assert.equal(p2Turn.state.turn.phaseId, "main");
});

test("match service end_turn runs identity discard/finish and starts next identity turn", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  const p2Turn = service.submitCommand(match.id, {
    id: "cmd_start_identity_p2_turn",
    matchId: match.id,
    playerId: "p1",
    type: "end_turn",
    payload: {}
  });

  assert.equal(p2Turn.state.turn.activePlayerId, "p2");
  assert.equal(p2Turn.state.turn.phaseId, "play");
  assert.deepEqual(p2Turn.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_2"
  ]);

  p2Turn.state.players.p2!.resources.health.current = 1;
  const p3Turn = service.submitCommand(match.id, {
    id: "cmd_identity_p2_end_turn",
    matchId: match.id,
    playerId: "p2",
    type: "end_turn",
    payload: {}
  });

  assert.equal(p3Turn.state.turn.activePlayerId, "p3");
  assert.equal(p3Turn.state.turn.phaseId, "play");
  assert.deepEqual(p3Turn.state.zones.zone_hand_p2?.objectIds, ["weapon_spear_p2"]);
  assert.deepEqual(p3Turn.state.zones.zone_hand_p3?.objectIds, ["nullification_p3", "shared_card_3", "shared_card_4"]);
  assert.ok(p3Turn.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.ok(p3Turn.state.zones.zone_discard?.objectIds.includes("shared_card_2"));
  assert.ok(p3Turn.events.some((event) => event.type === "phase_entered" && (event.payload as { phaseId?: string }).phaseId === "discard"));
  assert.ok(Object.values(p3Turn.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p3"));
});

test("match service schedules guarded turn timeouts and cancels stale turn timers", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  service.submitCommand(match.id, {
    id: "cmd_start_p2_turn",
    matchId: match.id,
    playerId: "p1",
    type: "end_turn",
    payload: {}
  });

  assert.equal(service.getMatch(match.id)?.state.turn.activePlayerId, "p2");
  service.scheduleTurnTimeout({
    id: "turn_timeout_stale_p2",
    matchId: match.id,
    dueAtMs: 1000
  });

  service.submitCommand(match.id, {
    id: "cmd_manual_p2_end_turn",
    matchId: match.id,
    playerId: "p2",
    type: "end_turn",
    payload: {}
  });
  assert.equal(service.getMatch(match.id)?.state.turn.activePlayerId, "p1");
  assert.deepEqual(service.advanceTime(1000), []);
  assert.equal(service.scheduler.all().find((action) => action.id === "turn_timeout_stale_p2")?.status, "cancelled");

  service.scheduleTurnTimeout({
    id: "turn_timeout_live_p1",
    matchId: match.id,
    dueAtMs: 2000
  });

  const updated = service.advanceTime(2000);
  assert.equal(updated[0]?.state.turn.activePlayerId, "p2");
  assert.equal(service.scheduler.all().find((action) => action.id === "turn_timeout_live_p1")?.status, "fired");
});

test("match service reconnect grace expires only while the player remains disconnected", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");

  service.disconnectPlayer(match.id, "p2");
  assert.equal(service.getMatch(match.id)?.state.players.p2?.status, "disconnected");
  service.scheduleReconnectGrace({
    id: "reconnect_grace_stale_p2",
    matchId: match.id,
    playerId: "p2",
    dueAtMs: 1000
  });

  service.reconnectPlayer(match.id, "p2");
  assert.deepEqual(service.advanceTime(1000), []);
  assert.equal(service.getMatch(match.id)?.state.players.p2?.status, "alive");
  assert.equal(service.scheduler.all().find((action) => action.id === "reconnect_grace_stale_p2")?.status, "cancelled");

  service.disconnectPlayer(match.id, "p3");
  service.scheduleReconnectGrace({
    id: "reconnect_grace_live_p3",
    matchId: match.id,
    playerId: "p3",
    dueAtMs: 2000
  });

  const updated = service.advanceTime(2000);
  assert.equal(updated[0]?.state.players.p3?.status, "conceded");
  assert.equal(service.scheduler.all().find((action) => action.id === "reconnect_grace_live_p3")?.status, "fired");
});

test("match service auto-discards over-limit hands and cancels stale discard timers", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");

  service.scheduleAutoDiscard({
    id: "auto_discard_live_p1",
    matchId: match.id,
    playerId: "p1",
    keepCount: 1,
    dueAtMs: 1000
  });

  const updated = service.advanceTime(1000);
  assert.deepEqual(updated[0]?.state.zones.zone_hand_p1?.objectIds, ["weapon_dagger_p1"]);
  assert.ok(updated[0]?.state.zones.zone_discard?.objectIds.includes("delayed_lightning_p1"));
  assert.equal(service.scheduler.all().find((action) => action.id === "auto_discard_live_p1")?.status, "fired");

  const staleService = new InMemoryMatchService();
  const staleMatch = staleService.createMatch("sample-identity");
  staleService.scheduleAutoDiscard({
    id: "auto_discard_stale_p1",
    matchId: staleMatch.id,
    playerId: "p1",
    keepCount: 1,
    dueAtMs: 1000
  });
  staleService.submitCommand(staleMatch.id, {
    id: "cmd_reduce_hand_before_discard",
    matchId: staleMatch.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_lightning",
      selections: { delayed: ["delayed_lightning_p1"], target: ["p2"] }
    }
  });

  assert.deepEqual(staleService.advanceTime(1000), []);
  assert.equal(staleService.scheduler.all().find((action) => action.id === "auto_discard_stale_p1")?.status, "cancelled");
  assert.deepEqual(staleService.getMatch(staleMatch.id)?.state.zones.zone_hand_p1?.objectIds, ["weapon_dagger_p1"]);
});

test("match service rejects unauthorized commands before mutation", () => {
  const service = new InMemoryMatchService();
  const duel = service.createMatch("sample-duel");
  const initialSequence = duel.state.lastSequence;

  assert.throws(
    () =>
      service.submitCommand(duel.id, {
        id: "cmd_wrong_match",
        matchId: "other_match",
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "firebolt",
          sourceObjectId: "card_firebolt",
          selections: { target: ["p2"] }
        }
      }),
    /targets match/
  );

  assert.throws(
    () =>
      service.submitCommand(duel.id, {
        id: "cmd_wrong_controller",
        matchId: duel.id,
        playerId: "p2",
        type: "execute_behavior",
        payload: {
          behaviorId: "firebolt",
          sourceObjectId: "card_firebolt",
          selections: { target: ["p1"] }
        }
      }),
    /does not control/
  );

  assert.equal(service.getMatch(duel.id)?.state.lastSequence, initialSequence);

  const advanced = service.submitCommand(duel.id, {
    id: "cmd_authorized_end_turn",
    matchId: duel.id,
    playerId: "p1",
    type: "end_turn",
    payload: {}
  });
  assert.equal(advanced.state.turn.activePlayerId, "p2");

  assert.throws(
    () =>
      service.submitCommand(duel.id, {
        id: "cmd_wrong_end_turn",
        matchId: duel.id,
        playerId: "p1",
        type: "end_turn",
        payload: {}
      }),
    /cannot end turn/
  );
});

test("match service rejects prompt answers from non-responders", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  service.submitCommand(match.id, {
    id: "cmd_open_authorized_prompt",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });

  const sequenceBefore = service.getMatch(match.id)!.state.lastSequence;
  assert.throws(
    () =>
      service.submitCommand(match.id, {
        id: "cmd_wrong_responder",
        matchId: match.id,
        playerId: "p3",
        type: "answer_prompt",
        payload: {
          promptId: "prompt_dodge",
          answer: "pass"
        }
      }),
    /cannot answer/
  );

  assert.equal(service.getMatch(match.id)?.state.lastSequence, sequenceBefore);
});

test("match reconnect projects historical events for the viewer", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  const reconnect = service.reconnect(match.id, { playerId: "p2", seatId: "seat_2" }, 0);
  const hiddenRoleEvent = reconnect.events.find((event) => {
    const payload = event.payload as { object?: { id?: string } };
    return event.type === "object_created" && payload.object?.id === "role_p3";
  });

  assert.ok(hiddenRoleEvent);
  assert.equal((hiddenRoleEvent.payload as { object?: { objectType?: string; templateId?: string } }).object?.objectType, "hidden");
  assert.equal((hiddenRoleEvent.payload as { object?: { objectType?: string; templateId?: string } }).object?.templateId, undefined);
});

test("match service schedules guarded prompt default passes", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  const opened = service.submitCommand(match.id, {
    id: "cmd_open_dodge_prompt",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(opened.state.prompts.prompt_dodge?.currentResponderId, "p2");
  service.schedulePromptDefaultPass({
    id: "timeout_dodge_p2",
    matchId: match.id,
    promptId: "prompt_dodge",
    dueAtMs: 1000
  });

  assert.deepEqual(service.advanceTime(999), []);
  const updated = service.advanceTime(1000);
  assert.equal(updated[0]?.state.prompts.prompt_dodge?.status, "answered");
  assert.equal(updated[0]?.state.players.p2?.resources.health.current, 2);
  assert.equal(service.scheduler.all().find((action) => action.id === "timeout_dodge_p2")?.status, "fired");
});

test("match service cancels stale prompt default passes after manual response", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  service.submitCommand(match.id, {
    id: "cmd_open_dodge_prompt_manual",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });

  service.schedulePromptDefaultPass({
    id: "timeout_dodge_stale",
    matchId: match.id,
    promptId: "prompt_dodge",
    dueAtMs: 1000
  });

  const answered = service.submitCommand(match.id, {
    id: "cmd_manual_dodge",
    matchId: match.id,
    playerId: "p2",
    type: "answer_prompt",
    payload: {
      promptId: "prompt_dodge",
      answer: {
        action: "execute_behavior",
        behaviorId: "dodge_response"
      }
    }
  });

  assert.equal(answered.state.prompts.prompt_dodge?.status, "answered");
  assert.deepEqual(service.advanceTime(1000), []);
  assert.equal(service.scheduler.all().find((action) => action.id === "timeout_dodge_stale")?.status, "cancelled");
  assert.equal(service.getMatch(match.id)?.state.players.p2?.resources.health.current, 3);
  assert.equal(service.getMatch(match.id)?.state.players.p2?.resources.dodge_used.current, 1);
});
