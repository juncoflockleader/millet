import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createEmptyMatchState,
  canReachByEffectiveRange,
  canReachByRange,
  effectiveSeatDistance,
  getSelectorCandidates,
  nextAliveSeat,
  orderedAlivePlayersFrom,
  projectPrompt,
  projectState,
  reduceEvent,
  resolveCommand,
  runPhaseGraph,
  type MatchState
} from "../../engine-core/src/index.ts";
import { createSampleIdentitySetupEvents, evaluateIdentityOutcome, sampleIdentityBehaviors, sampleIdentityPhaseGraph } from "./sample-identity.ts";

function setup(playerCount: 6 | 8 = 6): MatchState {
  return createSampleIdentitySetupEvents(playerCount).reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function putSharedDeckCardsOnTop(state: MatchState, objectIds: string[]): void {
  const deck = state.zones.zone_shared_deck;
  assert.ok(deck);
  const requested = new Set(objectIds);
  deck.objectIds = [...objectIds, ...deck.objectIds.filter((objectId) => !requested.has(objectId))];

  deck.objectIds.forEach((objectId, position) => {
    const object = state.objects[objectId];
    assert.ok(object);
    object.zoneId = deck.id;
    object.position = position;
  });
}

function execute(state: MatchState, command: Parameters<typeof resolveCommand>[1]) {
  return resolveCommand(state, command, {
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying",
    dyingPrompt: { onPassBehavior: "finish_dying" }
  });
}

function answerOpenNullificationPrompt(state: MatchState, playerId: string, answer: unknown) {
  const prompt = Object.values(state.prompts).find((candidate) => candidate.promptType === "nullification_stack" && candidate.status === "open");
  assert.ok(prompt);
  assert.equal(prompt.currentResponderId, playerId);

  return execute(state, {
    id: `cmd_nullification_${state.lastSequence}_${playerId}`,
    matchId: "sample_identity_match",
    playerId,
    type: "answer_prompt",
    payload: {
      promptId: prompt.id,
      answer
    }
  });
}

test("sample-identity assigns six and eight player role distributions", () => {
  const six = setup(6);
  const eight = setup(8);

  assert.deepEqual(Object.values(six.players).map((player) => player.factionId), ["lord", "loyalist", "rebel", "rebel", "rebel", "spy"]);
  assert.deepEqual(Object.values(eight.players).map((player) => player.factionId), [
    "lord",
    "loyalist",
    "loyalist",
    "rebel",
    "rebel",
    "rebel",
    "rebel",
    "spy"
  ]);
});

test("sample-identity reveals only lord role to unrelated players", () => {
  const state = setup(6);
  const p2View = projectState(state, { playerId: "p2", seatId: "seat_2" });

  assert.equal(p2View.objects.role_p1?.templateId, "lord");
  assert.equal(p2View.objects.role_p2?.templateId, "loyalist");
  const p3RoleRef = p2View.players.p3?.roleRef;
  assert.match(p3RoleRef ?? "", /^hidden_/);
  assert.equal(p2View.objects.role_p3, undefined);
  assert.equal(p2View.objects[p3RoleRef!]?.objectType, "hidden");
  assert.equal(p2View.objects[p3RoleRef!]?.templateId, undefined);
});

test("nextAliveSeat skips dead players in circular order", () => {
  let state = setup(6);
  state = reduceEvent(state, {
    id: "evt_dead",
    matchId: "sample_identity_match",
    sequence: state.lastSequence + 1,
    transactionId: "tx_test",
    type: "player_status_changed",
    payload: { playerId: "p2", status: "dead", reason: "test" },
    visibility: { default: { kind: "public" } }
  });

  assert.equal(nextAliveSeat(state, "seat_1"), "seat_3");
});

test("attack puts a zero-health target into dying state and opens a private rescue prompt", () => {
  let state = setup(6);
  state.players.p2!.resources.health.current = 1;
  const result = execute(state, {
    id: "cmd_attack",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p2?.resources.health.current, 0);
  assert.equal(result.state.players.p2?.status, "dying");
  const prompt = Object.values(result.state.prompts).find((candidate) => candidate.promptType === "rescue");
  assert.ok(prompt);
  assert.equal(projectPrompt(prompt, { playerId: "p3" })?.promptType, "rescue");
  assert.equal(projectPrompt(prompt, { playerId: "p2" }), null);
});

test("rescue returns a dying player to alive state", () => {
  let state = setup(6);
  state.players.p2!.status = "dying";
  state.players.p2!.resources.health.current = 0;

  const result = execute(state, {
    id: "cmd_rescue",
    matchId: "sample_identity_match",
    playerId: "p3",
    type: "execute_behavior",
    payload: {
      behaviorId: "rescue",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p2?.status, "alive");
  assert.equal(result.state.players.p2?.resources.health.current, 1);
});

test("rescue window finishes dying after all eligible responders pass", () => {
  let state = setup(6);
  state.players.p2!.resources.health.current = 1;
  const attacked = execute(state, {
    id: "cmd_attack_for_rescue_window",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack",
      selections: { target: ["p2"] }
    }
  });

  const prompt = Object.values(attacked.state.prompts).find((candidate) => candidate.promptType === "rescue");
  assert.ok(prompt);
  assert.deepEqual(prompt.responderIds, ["p1", "p3", "p4", "p5", "p6"]);

  let current = attacked.state;
  for (const responderId of prompt.responderIds) {
    const answered = execute(current, {
      id: `cmd_${responderId}_pass_rescue`,
      matchId: "sample_identity_match",
      playerId: responderId,
      type: "answer_prompt",
      payload: {
        promptId: prompt.id,
        answer: "pass"
      }
    });
    current = answered.state;
  }

  assert.equal(current.prompts[prompt.id]?.status, "answered");
  assert.equal(current.players.p2?.status, "dead");
});

test("identity outcomes handle rebel, spy, and lord camp wins", () => {
  const rebelState = setup(6);
  rebelState.players.p1!.status = "dead";
  rebelState.players.p3!.status = "dead";
  assert.equal(evaluateIdentityOutcome(rebelState)?.results.find((result) => result.playerId === "p3")?.status, "won");

  const spyState = setup(6);
  for (const player of Object.values(spyState.players)) {
    if (player.id !== "p6") {
      player.status = "dead";
    }
  }
  assert.equal(evaluateIdentityOutcome(spyState)?.results.find((result) => result.playerId === "p6")?.status, "won");

  const lordState = setup(6);
  lordState.players.p3!.status = "dead";
  lordState.players.p4!.status = "dead";
  lordState.players.p5!.status = "dead";
  lordState.players.p6!.status = "dead";
  assert.equal(evaluateIdentityOutcome(lordState)?.results.find((result) => result.playerId === "p2")?.status, "won");
});

test("sample-identity exposes reward and lord-penalty hooks", () => {
  const reward = execute(setup(6), {
    id: "cmd_reward",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: { behaviorId: "reward_for_rebel_kill" }
  });
  assert.equal(reward.state.players.p2?.resources.reward_cards.current, 3);

  const penalty = execute(setup(6), {
    id: "cmd_penalty",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: { behaviorId: "lord_kills_loyalist_penalty" }
  });
  assert.equal(penalty.state.players.p1?.resources.hand_size.current, 0);
});

test("sample-identity computes circular distance and range reachability", () => {
  const state = setup(6);

  assert.equal(canReachByRange(state, "p1", "p2", 1), true);
  assert.equal(canReachByRange(state, "p1", "p4", 1), false);
  assert.equal(canReachByRange(state, "p1", "p4", 3), true);
  assert.equal(canReachByEffectiveRange(state, "p1", "p4"), true);
  assert.equal(canReachByEffectiveRange(state, "p2", "p5"), false);
  assert.deepEqual(orderedAlivePlayersFrom(state, "p3"), ["p3", "p4", "p5", "p6", "p1", "p2"]);
});

test("sample-identity equips weapons from hand and applies range modifiers", () => {
  assert.throws(() =>
    execute(setup(6), {
      id: "cmd_illegal_equip_other_weapon",
      matchId: "sample_identity_match",
      playerId: "p2",
      type: "execute_behavior",
      payload: {
        behaviorId: "equip_weapon",
        selections: { equipment: ["weapon_dagger_p1"] }
      }
    })
  );

  const equipped = execute(setup(6), {
    id: "cmd_equip_p2_spear",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_weapon",
      selections: { equipment: ["weapon_spear_p2"] }
    }
  });

  assert.deepEqual(equipped.state.zones.zone_hand_p2?.objectIds, ["armor_p2", "mount_minus_p2", "armor_backup_p2"]);
  assert.ok(equipped.state.zones.zone_equipment_p2?.objectIds.includes("weapon_spear_p2"));
  assert.equal(canReachByEffectiveRange(equipped.state, "p2", "p5"), true);

  const attacked = execute(equipped.state, {
    id: "cmd_equipped_range_attack",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack",
      selections: { target: ["p5"] }
    }
  });
  assert.equal(attacked.state.players.p5?.resources.health.current, 2);
});

test("sample-identity armor equips, replaces, and reduces damage", () => {
  const armored = execute(setup(6), {
    id: "cmd_equip_p2_armor",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_armor",
      selections: { equipment: ["armor_p2"] }
    }
  });

  assert.ok(armored.state.zones.zone_equipment_p2?.objectIds.includes("armor_p2"));
  const attacked = execute(armored.state, {
    id: "cmd_attack_armored_p2",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack",
      selections: { target: ["p2"] }
    }
  });

  const damageEvent = attacked.events.find((event) => event.type === "damage_dealt");
  assert.equal((damageEvent?.payload as { amount?: number }).amount, 0);
  assert.equal(attacked.state.players.p2?.resources.health.current, 3);

  const replaced = execute(armored.state, {
    id: "cmd_replace_p2_armor",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_armor",
      selections: { equipment: ["armor_backup_p2"] }
    }
  });

  assert.ok(replaced.state.zones.zone_discard?.objectIds.includes("armor_p2"));
  assert.ok(replaced.state.zones.zone_equipment_p2?.objectIds.includes("armor_backup_p2"));
});

test("sample-identity mounts modify effective distance and target legality", () => {
  const p5Mounted = execute(setup(6), {
    id: "cmd_equip_p5_mount_plus",
    matchId: "sample_identity_match",
    playerId: "p5",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_mount_plus",
      selections: { equipment: ["mount_plus_p5"] }
    }
  });

  const p2Armed = execute(p5Mounted.state, {
    id: "cmd_equip_p2_spear_again",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_weapon",
      selections: { equipment: ["weapon_spear_p2"] }
    }
  });

  assert.equal(effectiveSeatDistance(p2Armed.state, "p2", "p5"), 4);
  assert.equal(canReachByEffectiveRange(p2Armed.state, "p2", "p5"), false);
  assert.deepEqual(getSelectorCandidates(p2Armed.state, sampleIdentityBehaviors.behaviors.attack!, "target", { controllerId: "p2" }).find((candidate) => candidate.id === "p5"), {
    id: "p5",
    legal: false,
    reasons: ["out_of_range"]
  });

  const p2Mounted = execute(p2Armed.state, {
    id: "cmd_equip_p2_mount_minus",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_mount_minus",
      selections: { equipment: ["mount_minus_p2"] }
    }
  });

  assert.equal(effectiveSeatDistance(p2Mounted.state, "p2", "p5"), 3);
  assert.equal(canReachByEffectiveRange(p2Mounted.state, "p2", "p5"), true);
});

test("sample-identity replacing a weapon discards the old slot object and recalculates range", () => {
  const replaced = execute(setup(6), {
    id: "cmd_replace_p1_weapon",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_weapon",
      selections: { equipment: ["weapon_dagger_p1"] }
    }
  });

  assert.deepEqual(replaced.state.zones.zone_hand_p1?.objectIds, ["delayed_lightning_p1"]);
  assert.ok(replaced.state.zones.zone_discard?.objectIds.includes("weapon_p1"));
  assert.ok(replaced.state.zones.zone_equipment_p1?.objectIds.includes("weapon_dagger_p1"));
  assert.equal(replaced.state.objects.weapon_p1?.zoneId, "zone_discard");
  assert.equal(canReachByEffectiveRange(replaced.state, "p1", "p4"), false);
});

test("sample-identity attack selectors enforce effective attack range", () => {
  const state = setup(6);
  const attack = sampleIdentityBehaviors.behaviors.attack!;

  const p2Candidates = getSelectorCandidates(state, attack, "target", { controllerId: "p2" });
  assert.deepEqual(p2Candidates.find((candidate) => candidate.id === "p5"), {
    id: "p5",
    legal: false,
    reasons: ["out_of_range"]
  });

  assert.throws(() =>
    execute(state, {
      id: "cmd_out_of_range_attack",
      matchId: "sample_identity_match",
      playerId: "p2",
      type: "execute_behavior",
      payload: {
        behaviorId: "attack",
        selections: { target: ["p5"] }
      }
    })
  );

  const reachedByWeapon = execute(state, {
    id: "cmd_weapon_range_attack",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack",
      selections: { target: ["p4"] }
    }
  });
  assert.equal(reachedByWeapon.state.players.p4?.resources.health.current, 2);
});

test("sample-identity opens dodge response and default damage resolves automatically on pass", () => {
  const opened = execute(setup(6), {
    id: "cmd_attack_prompt",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });
  assert.equal(opened.state.prompts.prompt_dodge?.responderIds[0], "p2");

  const answered = execute(opened.state, {
    id: "cmd_dodge_answer",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "answer_prompt",
    payload: {
      promptId: "prompt_dodge",
      answer: "pass"
    }
  });
  assert.equal(answered.state.prompts.prompt_dodge?.status, "answered");
  assert.equal(answered.state.players.p2?.resources.health.current, 2);
});

test("sample-identity dodge response executes response behavior and prevents default damage", () => {
  const opened = execute(setup(6), {
    id: "cmd_attack_prompt_dodged",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });

  const answered = execute(opened.state, {
    id: "cmd_dodge_response",
    matchId: "sample_identity_match",
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
  assert.equal(answered.state.players.p2?.resources.health.current, 3);
  assert.equal(answered.state.players.p2?.resources.dodge_used.current, 1);
});

test("sample-identity named armor can provide a dodge response while equipped", () => {
  const armored = execute(setup(6), {
    id: "cmd_equip_named_armor_for_dodge",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "equip_armor",
      selections: { equipment: ["armor_p2"] }
    }
  });

  const opened = execute(armored.state, {
    id: "cmd_attack_prompt_named_armor",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_dodge_prompt",
      selections: { target: ["p2"] }
    }
  });

  const answered = execute(opened.state, {
    id: "cmd_named_armor_dodge_response",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "answer_prompt",
    payload: {
      promptId: "prompt_dodge",
      answer: {
        action: "execute_behavior",
        behaviorId: "armor_auto_dodge_response",
        selections: { armor: ["armor_p2"] }
      }
    }
  });

  assert.equal(answered.state.prompts.prompt_dodge?.status, "answered");
  assert.equal(answered.state.players.p2?.resources.health.current, 3);
  assert.equal(answered.state.players.p2?.resources.dodge_used.current, 1);
  assert.ok(answered.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "armor_auto_dodge"));
});

test("sample-identity chained nullification cancels a trick after an odd response count", () => {
  const responders = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const opened = execute(setup(6), {
    id: "cmd_open_nullification_stack_odd",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "trick_with_nullification_stack",
      selections: { target: ["p2"], responders }
    }
  });

  const prompt = Object.values(opened.state.prompts).find((candidate) => candidate.promptType === "nullification_stack");
  assert.ok(prompt);
  assert.deepEqual(prompt.responderIds, responders);
  assert.equal(prompt.currentResponderId, "p1");

  let current = opened.state;
  let events = [...opened.events];
  for (const playerId of ["p1", "p2"]) {
    const result = answerOpenNullificationPrompt(current, playerId, "pass");
    current = result.state;
    events = [...events, ...result.events];
  }

  const nullified = answerOpenNullificationPrompt(current, "p3", {
    action: "execute_behavior",
    behaviorId: "nullification_response",
    selections: { nullification: ["nullification_p3"] }
  });
  current = nullified.state;
  events = [...events, ...nullified.events];

  for (const playerId of ["p4", "p5", "p6", "p1", "p2", "p3"]) {
    const result = answerOpenNullificationPrompt(current, playerId, "pass");
    current = result.state;
    events = [...events, ...result.events];
  }

  const settledPrompt = Object.values(current.prompts).find((candidate) => candidate.promptType === "nullification_stack");
  assert.equal(settledPrompt?.status, "answered");
  assert.equal(current.players.p2?.resources.health.current, 3);
  assert.equal(current.players.p1?.resources.nullification_parity.current, 0);
  assert.ok(current.zones.zone_discard?.objectIds.includes("nullification_p3"));
  assert.equal(events.some((event) => event.type === "damage_dealt"), false);
});

test("sample-identity chained nullification lets a trick resolve after an even response count", () => {
  const responders = ["p1", "p2", "p3", "p4", "p5", "p6"];
  const opened = execute(setup(6), {
    id: "cmd_open_nullification_stack_even",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "trick_with_nullification_stack",
      selections: { target: ["p2"], responders }
    }
  });

  let current = opened.state;
  let events = [...opened.events];
  for (const playerId of ["p1", "p2"]) {
    const result = answerOpenNullificationPrompt(current, playerId, "pass");
    current = result.state;
    events = [...events, ...result.events];
  }

  for (const [playerId, objectId] of [
    ["p3", "nullification_p3"],
    ["p4", "nullification_p4"]
  ] as const) {
    const result = answerOpenNullificationPrompt(current, playerId, {
      action: "execute_behavior",
      behaviorId: "nullification_response",
      selections: { nullification: [objectId] }
    });
    current = result.state;
    events = [...events, ...result.events];
  }

  for (const playerId of ["p5", "p6", "p1", "p2", "p3", "p4"]) {
    const result = answerOpenNullificationPrompt(current, playerId, "pass");
    current = result.state;
    events = [...events, ...result.events];
  }

  assert.equal(current.players.p2?.resources.health.current, 2);
  assert.equal(current.players.p1?.resources.nullification_parity.current, 0);
  assert.ok(current.zones.zone_discard?.objectIds.includes("nullification_p3"));
  assert.ok(current.zones.zone_discard?.objectIds.includes("nullification_p4"));
  assert.ok(events.some((event) => event.type === "damage_dealt" && (event.payload as { damageType?: string }).damageType === "trick"));
});

test("sample-identity places and resolves delayed judgment from a judgment zone", () => {
  const placed = execute(setup(6), {
    id: "cmd_place_delayed_lightning",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_lightning",
      selections: { delayed: ["delayed_lightning_p1"], target: ["p2"] }
    }
  });

  assert.deepEqual(placed.state.zones.zone_hand_p1?.objectIds, ["weapon_dagger_p1"]);
  assert.deepEqual(placed.state.zones.zone_judgment_p2?.objectIds, ["delayed_lightning_p1"]);

  const resolved = execute(placed.state, {
    id: "cmd_resolve_delayed_lightning",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "resolve_delayed_lightning",
      selections: { delayed: ["delayed_lightning_p1"] }
    }
  });

  assert.equal(resolved.state.players.p2?.resources.health.current, 0);
  assert.equal(resolved.state.players.p2?.status, "dying");
  assert.deepEqual(resolved.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(resolved.state.zones.zone_discard?.objectIds.includes("delayed_lightning_p1"));
  assert.ok(resolved.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.ok(resolved.events.some((event) => event.type === "damage_dealt"));
  assert.ok(resolved.events.some((event) => event.type === "card_moved"));
});

test("sample-identity phase graph resolves judgment, draws, and opens play action window", () => {
  let state = setup(6);
  state.players.p2!.resources.health = { current: 5, max: 5 };
  const placed = execute(state, {
    id: "cmd_place_delayed_before_phase",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_lightning",
      selections: { delayed: ["delayed_lightning_p1"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.equal(run.state.turn.activePlayerId, "p2");
  assert.equal(run.state.players.p2?.resources.health.current, 2);
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("delayed_lightning_p1"));
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_2",
    "shared_card_3"
  ]);
  assert.deepEqual(run.state.zones.zone_shared_deck?.objectIds.slice(0, 2), ["shared_card_4", "shared_card_5"]);
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p2"));
  assert.ok(run.events.some((event) => event.type === "damage_dealt"));
  assert.ok(run.events.some((event) => event.type === "prompt_opened"));
});

test("sample-identity delayed judgment miss passes lightning to the next alive judgment zone", () => {
  let state = setup(6);
  putSharedDeckCardsOnTop(state, ["shared_card_2", "shared_card_1"]);
  const placed = execute(state, {
    id: "cmd_place_delayed_before_miss",
    matchId: "sample_identity_match",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_lightning",
      selections: { delayed: ["delayed_lightning_p1"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.players.p2?.resources.health.current, 3);
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.deepEqual(run.state.zones.zone_judgment_p3?.objectIds, ["delayed_lightning_p1"]);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_2"));
  assert.equal(run.state.zones.zone_discard?.objectIds.includes("delayed_lightning_p1"), false);
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_3"
  ]);
  assert.deepEqual(run.state.zones.zone_shared_deck?.objectIds.slice(0, 2), ["shared_card_4", "shared_card_5"]);
  assert.equal(run.events.some((event) => event.type === "damage_dealt"), false);
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p2"));
});

test("sample-identity delayed skip-play trick skips the play phase on judgment hit", () => {
  let state = setup(6);
  state.players.p2!.resources.health = { current: 6, max: 6 };
  const placed = execute(state, {
    id: "cmd_place_delayed_skip_play",
    matchId: "sample_identity_match",
    playerId: "p6",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_skip_play",
      selections: { delayed: ["delayed_skip_play_p6"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, false);
  assert.equal(run.state.turn.phaseId, "finish");
  assert.equal(run.state.players.p2?.resources.skip_phase_play.current, 0);
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("delayed_skip_play_p6"));
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_2",
    "shared_card_3"
  ]);
  assert.equal(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action"), false);
  assert.ok(run.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "skip_phase:play"));
});

test("sample-identity delayed skip-play trick opens play phase on heart judgment miss", () => {
  let state = setup(6);
  state.players.p2!.resources.health = { current: 6, max: 6 };
  putSharedDeckCardsOnTop(state, ["shared_card_2", "shared_card_1"]);
  const placed = execute(state, {
    id: "cmd_place_delayed_skip_play_miss",
    matchId: "sample_identity_match",
    playerId: "p6",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_skip_play",
      selections: { delayed: ["delayed_skip_play_p6"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_2"));
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("delayed_skip_play_p6"));
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_3"
  ]);
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p2"));
});

test("sample-identity delayed skip-draw trick skips the draw phase on non-club judgment hit", () => {
  const placed = execute(setup(6), {
    id: "cmd_place_delayed_skip_draw",
    matchId: "sample_identity_match",
    playerId: "p6",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_skip_draw",
      selections: { delayed: ["delayed_skip_draw_p6"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.equal(run.state.players.p2?.resources.skip_phase_draw.current, 0);
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("delayed_skip_draw_p6"));
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, ["weapon_spear_p2", "armor_p2", "mount_minus_p2", "armor_backup_p2"]);
  assert.deepEqual(run.state.zones.zone_shared_deck?.objectIds.slice(0, 2), ["shared_card_2", "shared_card_3"]);
  assert.ok(run.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "delayed_skip_draw"));
  assert.ok(run.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "skip_phase:draw"));
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p2"));
});

test("sample-identity delayed skip-draw trick draws normally on club judgment miss", () => {
  let state = setup(6);
  putSharedDeckCardsOnTop(state, ["shared_card_7", "shared_card_1", "shared_card_2"]);
  const placed = execute(state, {
    id: "cmd_place_delayed_skip_draw_miss",
    matchId: "sample_identity_match",
    playerId: "p6",
    type: "execute_behavior",
    payload: {
      behaviorId: "place_delayed_skip_draw",
      selections: { delayed: ["delayed_skip_draw_p6"], target: ["p2"] }
    }
  });

  const run = runPhaseGraph(placed.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.equal(run.state.players.p2?.resources.skip_phase_draw?.current ?? 0, 0);
  assert.deepEqual(run.state.zones.zone_judgment_p2?.objectIds, []);
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("shared_card_7"));
  assert.ok(run.state.zones.zone_discard?.objectIds.includes("delayed_skip_draw_p6"));
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_2"
  ]);
  assert.deepEqual(run.state.zones.zone_shared_deck?.objectIds.slice(0, 2), ["shared_card_3", "shared_card_4"]);
  assert.equal(run.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "skip_phase:draw"), false);
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "identity_play_action" && prompt.currentResponderId === "p2"));
});

test("sample-identity phase graph can insert an extra draw phase from a resource hook", () => {
  const granted = execute(setup(6), {
    id: "cmd_grant_extra_draw_phase",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "grant_extra_draw_phase"
    }
  });

  const run = runPhaseGraph(granted.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.equal(run.state.players.p2?.resources.insert_phase_extra_draw.current, 0);
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_2",
    "shared_card_3",
    "shared_card_4"
  ]);
  assert.deepEqual(run.state.zones.zone_shared_deck?.objectIds.slice(0, 2), ["shared_card_5", "shared_card_6"]);
  assert.ok(run.events.some((event) => event.type === "phase_entered" && (event.payload as { phaseId?: string }).phaseId === "extra_draw"));
  assert.ok(run.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "insert_phase:draw:extra_draw"));
});

test("sample-identity named Yingzi-style skill can insert an extra draw phase", () => {
  const granted = execute(setup(6), {
    id: "cmd_yingzi_extra_draw_phase",
    matchId: "sample_identity_match",
    playerId: "p2",
    type: "execute_behavior",
    payload: {
      behaviorId: "yingzi_grant_extra_draw_phase",
      selections: { skill_source: ["character_p2"] }
    }
  });

  const run = runPhaseGraph(granted.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });

  assert.equal(run.stoppedAtActionWindow, true);
  assert.equal(run.state.turn.phaseId, "play");
  assert.equal(run.state.players.p2?.resources.insert_phase_extra_draw.current, 0);
  assert.deepEqual(run.state.zones.zone_hand_p2?.objectIds, [
    "weapon_spear_p2",
    "armor_p2",
    "mount_minus_p2",
    "armor_backup_p2",
    "shared_card_1",
    "shared_card_2",
    "shared_card_3",
    "shared_card_4"
  ]);
  assert.ok(granted.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "yingzi_extra_draw"));
  assert.ok(run.events.some((event) => event.type === "phase_entered" && (event.payload as { phaseId?: string }).phaseId === "extra_draw"));
});

test("sample-identity discard phase enforces hand limit by current health", () => {
  const drawn = runPhaseGraph(setup(6), sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  });
  drawn.state.players.p2!.resources.health.current = 1;

  const discarded = runPhaseGraph(drawn.state, sampleIdentityPhaseGraph, {
    activePlayerId: "p2",
    behaviorLibrary: sampleIdentityBehaviors,
    deathMode: "dying"
  }, {
    fromPhaseId: "discard"
  });

  assert.equal(discarded.stoppedAtActionWindow, false);
  assert.equal(discarded.state.turn.phaseId, "finish");
  assert.deepEqual(discarded.state.zones.zone_hand_p2?.objectIds, ["weapon_spear_p2"]);
  assert.ok(discarded.state.zones.zone_discard?.objectIds.includes("shared_card_1"));
  assert.ok(discarded.state.zones.zone_discard?.objectIds.includes("shared_card_2"));
});
