import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CommandRejectedError,
  createEmptyMatchState,
  reduceEvent,
  resolveCommand,
  type BehaviorLibrary,
  type MatchCommand,
  type MatchEvent,
  type MatchState
} from "./index.ts";

function publicVisibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

function applySetup(events: MatchEvent[]): MatchState {
  return events.reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function setupDuelState(): MatchState {
  return applySetup([
    {
      id: "evt_1",
      matchId: "match_m1",
      sequence: 1,
      transactionId: "tx_setup",
      type: "match_initialized",
      payload: {
        matchId: "match_m1",
        gameDefinitionId: "sample-kernel",
        gameDefinitionVersion: "0.1.0",
        seed: "m1-seed"
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_2",
      matchId: "match_m1",
      sequence: 2,
      transactionId: "tx_setup",
      type: "player_seated",
      payload: {
        seat: { id: "seat_1", index: 0, playerId: "p1" },
        player: {
          id: "p1",
          userId: "u1",
          seatId: "seat_1",
          controllerId: "p1",
          status: "alive",
          resources: {
            health: { current: 10, max: 10 },
            mana: { current: 2, max: 2 }
          }
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_3",
      matchId: "match_m1",
      sequence: 3,
      transactionId: "tx_setup",
      type: "player_seated",
      payload: {
        seat: { id: "seat_2", index: 1, playerId: "p2" },
        player: {
          id: "p2",
          userId: "u2",
          seatId: "seat_2",
          controllerId: "p2",
          status: "alive",
          resources: {
            health: { current: 3, max: 10 },
            mana: { current: 0, max: 0 }
          }
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_4",
      matchId: "match_m1",
      sequence: 4,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_hand_p1",
          ownerId: "p1",
          zoneType: "hand",
          visibility: { kind: "owner" },
          ordering: "ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_5",
      matchId: "match_m1",
      sequence: 5,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_discard",
          zoneType: "discard",
          visibility: { kind: "public" },
          ordering: "ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_6",
      matchId: "match_m1",
      sequence: 6,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: "card_firebolt",
          templateId: "firebolt",
          objectType: "card",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_hand_p1",
          position: 0,
          visibility: { kind: "owner" },
          stats: {},
          counters: {},
          tags: ["spell"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 6,
          lastChangedAtSequence: 6
        }
      },
      visibility: publicVisibility()
    }
  ]);
}

const behaviorLibrary: BehaviorLibrary = {
  behaviors: {
    firebolt: {
      id: "firebolt",
      version: "0.1.0",
      kind: "card",
      costs: [
        {
          type: "spend_resource",
          player: "controller",
          resource: "mana",
          amount: 2
        }
      ],
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: {
            status: "alive",
            notSelf: true
          }
        }
      ],
      effects: [
        {
          type: "deal_damage",
          to: { selector: "target" },
          amount: 3
        },
        {
          type: "move_card",
          object: "self",
          toZoneId: "zone_discard"
        }
      ]
    }
  }
};

test("executes a behavior by paying resource, dealing lethal damage, and declaring outcome", () => {
  const state = setupDuelState();
  const command: MatchCommand = {
    id: "cmd_firebolt",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: {
        target: ["p2"]
      }
    }
  };

  const result = resolveCommand(state, command, {
    behaviorLibrary,
    outcomeMode: "last_alive"
  });

  assert.deepEqual(result.events.map((event) => event.type), [
    "resource_changed",
    "damage_dealt",
    "resource_changed",
    "player_status_changed",
    "outcome_declared",
    "card_moved"
  ]);
  assert.equal(result.state.players.p1?.resources.mana.current, 0);
  assert.equal(result.state.players.p2?.resources.health.current, 0);
  assert.equal(result.state.players.p2?.status, "dead");
  assert.equal(result.state.status, "completed");
  assert.equal(result.state.outcomes[0]?.results.find((resultItem) => resultItem.playerId === "p1")?.status, "won");
  assert.equal(result.state.objects.card_firebolt?.zoneId, "zone_discard");
});

test("rejects insufficient resource without mutating original state", () => {
  const state = setupDuelState();
  state.players.p1!.resources.mana.current = 1;
  const command: MatchCommand = {
    id: "cmd_firebolt",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: {
        target: ["p2"]
      }
    }
  };

  assert.throws(
    () => resolveCommand(state, command, { behaviorLibrary, outcomeMode: "last_alive" }),
    (error) => error instanceof CommandRejectedError && error.code === "insufficient_resource"
  );
  assert.equal(state.lastSequence, 6);
  assert.equal(state.players.p2?.status, "alive");
  assert.equal(state.objects.card_firebolt?.zoneId, "zone_hand_p1");
});

test("prevent_next_damage reduces the next targeted damage and is consumed", () => {
  const shieldLibrary: BehaviorLibrary = {
    behaviors: {
      ...behaviorLibrary.behaviors,
      shield: {
        id: "shield",
        version: "0.1.0",
        kind: "rules_module",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive" }
          }
        ],
        effects: [{ type: "prevent_next_damage", player: { selector: "target" }, amount: 2 }]
      }
    }
  };
  const shielded = resolveCommand(setupDuelState(), {
    id: "cmd_shield",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "shield",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: shieldLibrary
  });

  const damaged = resolveCommand(shielded.state, {
    id: "cmd_firebolt_after_shield",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: shieldLibrary,
    outcomeMode: "last_alive"
  });

  assert.equal(shielded.state.players.p2?.resources.prevent_next_damage.current, 2);
  assert.equal(damaged.state.players.p2?.resources.prevent_next_damage.current, 0);
  assert.equal(damaged.state.players.p2?.resources.health.current, 2);
  assert.equal(damaged.state.players.p2?.status, "alive");
  assert.ok(damaged.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "damage_prevented"));
  assert.ok(damaged.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 1));
});

test("prevent_next_damage is consumed by all-player damage per target", () => {
  const shieldLibrary: BehaviorLibrary = {
    behaviors: {
      quake: {
        id: "quake",
        version: "0.1.0",
        kind: "rules_module",
        effects: [{ type: "deal_damage_all_players", amount: 2 }]
      },
      shield: {
        id: "shield",
        version: "0.1.0",
        kind: "rules_module",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive" }
          }
        ],
        effects: [{ type: "prevent_next_damage", player: { selector: "target" }, amount: 1 }]
      }
    }
  };
  const shielded = resolveCommand(setupDuelState(), {
    id: "cmd_shield_all_damage",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "shield",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: shieldLibrary
  });

  const damaged = resolveCommand(shielded.state, {
    id: "cmd_quake",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "quake"
    }
  }, {
    behaviorLibrary: shieldLibrary
  });

  assert.equal(damaged.state.players.p1?.resources.health.current, 8);
  assert.equal(damaged.state.players.p2?.resources.health.current, 2);
  assert.equal(damaged.state.players.p2?.resources.prevent_next_damage.current, 0);
  assert.deepEqual(
    damaged.events.filter((event) => event.type === "damage_dealt").map((event) => (event.payload as { amount?: number }).amount),
    [2, 1]
  );
});

test("draw_cards moves cards from source zone to destination zone in order", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_deck_p1",
        ownerId: "p1",
        zoneType: "deck",
        visibility: { kind: "owner" },
        ordering: "hidden_ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  state = reduceEvent(state, {
    id: "evt_8",
    matchId: "match_m1",
    sequence: 8,
    transactionId: "tx_setup",
    type: "object_created",
    payload: {
      object: {
        id: "card_drawn",
        templateId: "drawn",
        objectType: "card",
        ownerId: "p1",
        controllerId: "p1",
        creatorId: "system",
        zoneId: "zone_deck_p1",
        position: 0,
        visibility: { kind: "owner" },
        stats: {},
        counters: {},
        tags: [],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });

  const drawLibrary: BehaviorLibrary = {
    behaviors: {
      draw_one: {
        id: "draw_one",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "draw_cards",
            fromZoneId: "zone_deck_p1",
            toZoneId: "zone_hand_p1",
            count: 1
          }
        ]
      }
    }
  };

  const result = resolveCommand(
    state,
    {
      id: "cmd_draw",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "draw_one"
      }
    },
    {
      behaviorLibrary: drawLibrary
    }
  );

  assert.deepEqual(result.events.map((event) => event.type), ["card_moved"]);
  assert.deepEqual(result.state.zones.zone_deck_p1?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, ["card_firebolt", "card_drawn"]);
});

test("opens and answers a prompt through event-sourced prompt lifecycle", () => {
  const promptLibrary: BehaviorLibrary = {
    behaviors: {
      choose_one: {
        id: "choose_one",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "open_prompt",
            promptId: "prompt_choice",
            responderIds: [{ id: "p1" }],
            promptType: "choose_one",
            responseMode: "single",
            payload: {
              options: ["left", "right"]
            }
          }
        ]
      }
    }
  };

  const opened = resolveCommand(
    setupDuelState(),
    {
      id: "cmd_prompt",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "choose_one"
      }
    },
    {
      behaviorLibrary: promptLibrary
    }
  );

  assert.equal(opened.state.prompts.prompt_choice?.status, "open");
  assert.deepEqual(opened.state.prompts.prompt_choice?.responderIds, ["p1"]);

  const answered = resolveCommand(
    opened.state,
    {
      id: "cmd_answer",
      matchId: "match_m1",
      playerId: "p1",
      type: "answer_prompt",
      payload: {
        promptId: "prompt_choice",
        answer: "left"
      }
    },
    {
      behaviorLibrary: promptLibrary
    }
  );

  assert.deepEqual(answered.events.map((event) => event.type), ["prompt_answered"]);
  assert.equal(answered.state.prompts.prompt_choice?.status, "answered");
  assert.equal(answered.state.prompts.prompt_choice?.answer, "left");
});

test("all_in_order prompts advance one responder at a time", () => {
  const promptLibrary: BehaviorLibrary = {
    behaviors: {
      ordered_window: {
        id: "ordered_window",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "open_prompt",
            promptId: "prompt_ordered",
            responderIds: [{ id: "p1" }, { id: "p2" }],
            promptType: "ordered_response",
            responseMode: "all_in_order"
          }
        ]
      }
    }
  };

  const opened = resolveCommand(
    setupDuelState(),
    {
      id: "cmd_open_ordered",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: { behaviorId: "ordered_window" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(opened.state.prompts.prompt_ordered?.currentResponderId, "p1");

  const first = resolveCommand(
    opened.state,
    {
      id: "cmd_p1_answer",
      matchId: "match_m1",
      playerId: "p1",
      type: "answer_prompt",
      payload: { promptId: "prompt_ordered", answer: "ready" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(first.state.prompts.prompt_ordered?.status, "open");
  assert.equal(first.state.prompts.prompt_ordered?.currentResponderId, "p2");
  assert.equal(first.state.prompts.prompt_ordered?.responses?.p1, "ready");
  assert.throws(
    () =>
      resolveCommand(
        first.state,
        {
          id: "cmd_p1_again",
          matchId: "match_m1",
          playerId: "p1",
          type: "answer_prompt",
          payload: { promptId: "prompt_ordered", answer: "again" }
        },
        { behaviorLibrary: promptLibrary }
      ),
    CommandRejectedError
  );

  const second = resolveCommand(
    first.state,
    {
      id: "cmd_p2_answer",
      matchId: "match_m1",
      playerId: "p2",
      type: "answer_prompt",
      payload: { promptId: "prompt_ordered", answer: "done" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(second.state.prompts.prompt_ordered?.status, "answered");
  assert.equal(second.state.prompts.prompt_ordered?.currentResponderId, undefined);
  assert.equal(second.state.prompts.prompt_ordered?.responses?.p2, "done");
});

test("any_until_success prompts remain open across passes and close on success", () => {
  const promptLibrary: BehaviorLibrary = {
    behaviors: {
      rescue_window: {
        id: "rescue_window",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "open_prompt",
            promptId: "prompt_any",
            responderIds: [{ id: "p1" }, { id: "p2" }],
            promptType: "rescue",
            responseMode: "any_until_success"
          }
        ]
      }
    }
  };

  const opened = resolveCommand(
    setupDuelState(),
    {
      id: "cmd_open_any",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: { behaviorId: "rescue_window" }
    },
    { behaviorLibrary: promptLibrary }
  );

  const passed = resolveCommand(
    opened.state,
    {
      id: "cmd_p1_pass",
      matchId: "match_m1",
      playerId: "p1",
      type: "answer_prompt",
      payload: { promptId: "prompt_any", answer: "pass" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(passed.state.prompts.prompt_any?.status, "open");
  assert.equal(passed.state.prompts.prompt_any?.currentResponderId, "p2");

  const succeeded = resolveCommand(
    passed.state,
    {
      id: "cmd_p2_save",
      matchId: "match_m1",
      playerId: "p2",
      type: "answer_prompt",
      payload: { promptId: "prompt_any", answer: { action: "use_card", cardId: "peach" } }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(succeeded.state.prompts.prompt_any?.status, "answered");
  assert.deepEqual(succeeded.state.prompts.prompt_any?.answeredResponderIds, ["p1", "p2"]);
});

test("priority_loop prompts cycle until all players pass after the latest response", () => {
  const promptLibrary: BehaviorLibrary = {
    behaviors: {
      counter_ping: {
        id: "counter_ping",
        version: "0.1.0",
        kind: "rules_module",
        effects: [{ type: "set_resource", player: "command_player", resource: "response_count", current: 1 }]
      },
      priority_window: {
        id: "priority_window",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "open_prompt",
            promptId: "prompt_priority",
            responderIds: [{ id: "p1" }, { id: "p2" }],
            promptType: "priority_response",
            responseMode: "priority_loop",
            payload: {
              allowedResponseBehaviors: ["counter_ping"]
            }
          }
        ]
      }
    }
  };

  const opened = resolveCommand(
    setupDuelState(),
    {
      id: "cmd_open_priority",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: { behaviorId: "priority_window" }
    },
    { behaviorLibrary: promptLibrary }
  );

  const responded = resolveCommand(
    opened.state,
    {
      id: "cmd_p1_counter",
      matchId: "match_m1",
      playerId: "p1",
      type: "answer_prompt",
      payload: {
        promptId: "prompt_priority",
        answer: { action: "execute_behavior", behaviorId: "counter_ping" }
      }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.ok(responded.events.some((event) => event.type === "resource_changed"));
  assert.equal(responded.state.players.p1?.resources.response_count.current, 1);
  assert.equal(responded.state.prompts.prompt_priority?.status, "open");
  assert.equal(responded.state.prompts.prompt_priority?.currentResponderId, "p2");
  assert.deepEqual(responded.state.prompts.prompt_priority?.passedResponderIds, []);

  const firstPass = resolveCommand(
    responded.state,
    {
      id: "cmd_p2_pass",
      matchId: "match_m1",
      playerId: "p2",
      type: "answer_prompt",
      payload: { promptId: "prompt_priority", answer: "pass" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(firstPass.state.prompts.prompt_priority?.status, "open");
  assert.equal(firstPass.state.prompts.prompt_priority?.currentResponderId, "p1");
  assert.deepEqual(firstPass.state.prompts.prompt_priority?.passedResponderIds, ["p2"]);

  const allPassed = resolveCommand(
    firstPass.state,
    {
      id: "cmd_p1_pass",
      matchId: "match_m1",
      playerId: "p1",
      type: "answer_prompt",
      payload: { promptId: "prompt_priority", answer: "pass" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.equal(allPassed.state.prompts.prompt_priority?.status, "answered");
  assert.deepEqual(allPassed.state.prompts.prompt_priority?.passedResponderIds, ["p2", "p1"]);
});

test("prompt response behavior answers reject behaviors outside the prompt allowlist", () => {
  const promptLibrary: BehaviorLibrary = {
    behaviors: {
      allowed_response: {
        id: "allowed_response",
        version: "0.1.0",
        kind: "rules_module",
        effects: [{ type: "set_resource", player: "command_player", resource: "allowed", current: 1 }]
      },
      forbidden_response: {
        id: "forbidden_response",
        version: "0.1.0",
        kind: "rules_module",
        effects: [{ type: "set_resource", player: "command_player", resource: "forbidden", current: 1 }]
      },
      response_window: {
        id: "response_window",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "open_prompt",
            promptId: "prompt_allowlist",
            responderIds: [{ id: "p1" }],
            promptType: "response",
            responseMode: "single",
            payload: {
              allowedResponseBehaviors: ["allowed_response"]
            }
          }
        ]
      }
    }
  };

  const opened = resolveCommand(
    setupDuelState(),
    {
      id: "cmd_open_allowlist",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: { behaviorId: "response_window" }
    },
    { behaviorLibrary: promptLibrary }
  );

  assert.throws(
    () =>
      resolveCommand(
        opened.state,
        {
          id: "cmd_forbidden_response",
          matchId: "match_m1",
          playerId: "p1",
          type: "answer_prompt",
          payload: {
            promptId: "prompt_allowlist",
            answer: { action: "execute_behavior", behaviorId: "forbidden_response" }
          }
        },
        { behaviorLibrary: promptLibrary }
      ),
    CommandRejectedError
  );

  assert.equal(opened.state.prompts.prompt_allowlist?.status, "open");
  assert.equal(opened.state.players.p1?.resources.forbidden, undefined);
});

test("registered triggers fire deterministically after matching events", () => {
  let state = setupDuelState();
  for (const event of [
    {
      id: "evt_7",
      matchId: "match_m1",
      sequence: 7,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_deck_p1",
          ownerId: "p1",
          zoneType: "deck",
          visibility: { kind: "owner" },
          ordering: "hidden_ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_8",
      matchId: "match_m1",
      sequence: 8,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_graveyard",
          zoneType: "graveyard",
          visibility: { kind: "public" },
          ordering: "ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_9",
      matchId: "match_m1",
      sequence: 9,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: "card_reward",
          templateId: "reward",
          objectType: "card",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_deck_p1",
          position: 0,
          visibility: { kind: "owner" },
          stats: {},
          counters: {},
          tags: [],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 9,
          lastChangedAtSequence: 9
        }
      },
      visibility: publicVisibility()
    }
  ] as MatchEvent[]) {
    state = reduceEvent(state, event);
  }

  const triggerLibrary: BehaviorLibrary = {
    behaviors: {
      arm_death_draw: {
        id: "arm_death_draw",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "register_trigger",
            source: "self",
            behaviorId: "death_draw",
            eventType: "object_destroyed",
            priority: 10,
            once: true
          },
          {
            type: "destroy_object",
            object: "self",
            toZoneId: "zone_graveyard",
            reason: "test_destroy"
          }
        ]
      },
      death_draw: {
        id: "death_draw",
        version: "0.1.0",
        kind: "trigger",
        trigger: {
          eventType: "object_destroyed",
          timing: "after",
          source: "self",
          once: true
        },
        effects: [
          {
            type: "draw_cards",
            fromZoneId: "zone_deck_p1",
            toZoneId: "zone_hand_p1",
            count: 1
          }
        ]
      }
    }
  };

  const result = resolveCommand(
    state,
    {
      id: "cmd_death_trigger",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "arm_death_draw",
        sourceObjectId: "card_firebolt"
      }
    },
    {
      behaviorLibrary: triggerLibrary
    }
  );

  assert.deepEqual(result.events.map((event) => event.type), [
    "trigger_registered",
    "object_destroyed",
    "trigger_fired",
    "card_moved"
  ]);
  assert.equal(result.state.triggers[0]?.firedCount, 1);
  assert.deepEqual(result.state.zones.zone_graveyard?.objectIds, ["card_firebolt"]);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, ["card_reward"]);
});

test("empty deck draw can apply escalating fatigue damage", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_empty_deck",
        ownerId: "p1",
        zoneType: "deck",
        visibility: { kind: "owner" },
        ordering: "hidden_ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });

  const fatigueLibrary: BehaviorLibrary = {
    behaviors: {
      draw_or_fatigue: {
        id: "draw_or_fatigue",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "draw_cards",
            fromZoneId: "zone_empty_deck",
            toZoneId: "zone_hand_p1",
            count: 1,
            emptyDeck: {
              mode: "damage_player",
              player: "command_player",
              counter: "fatigue",
              startAt: 1,
              incrementBy: 1
            }
          }
        ]
      }
    }
  };

  const first = resolveCommand(
    state,
    {
      id: "cmd_fatigue_1",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "draw_or_fatigue"
      }
    },
    {
      behaviorLibrary: fatigueLibrary
    }
  );

  const second = resolveCommand(
    first.state,
    {
      id: "cmd_fatigue_2",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "draw_or_fatigue"
      }
    },
    {
      behaviorLibrary: fatigueLibrary
    }
  );

  assert.equal(first.state.players.p1?.resources.fatigue.current, 1);
  assert.equal(first.state.players.p1?.resources.health.current, 9);
  assert.equal(second.state.players.p1?.resources.fatigue.current, 2);
  assert.equal(second.state.players.p1?.resources.health.current, 7);
});
