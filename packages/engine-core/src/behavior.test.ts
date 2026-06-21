import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CommandRejectedError,
  createEmptyMatchState,
  projectEvent,
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

function setupDuelStateWithSpellPower(): MatchState {
  const state = setupDuelState();
  state.players.p2!.resources.health.current = 10;

  return [
    {
      id: "evt_7",
      matchId: "match_m1",
      sequence: 7,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_board_p1",
          ownerId: "p1",
          zoneType: "board",
          visibility: { kind: "public" },
          ordering: "ordered",
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
      type: "object_created",
      payload: {
        object: {
          id: "minion_spell_focus",
          templateId: "spell_focus",
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: 0,
          visibility: { kind: "public" },
          stats: { attack: 1, health: 1, spellPower: 2 },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 8,
          lastChangedAtSequence: 8
        }
      },
      visibility: publicVisibility()
    }
  ].reduce((current, event) => reduceEvent(current, event), state);
}

function setupDuelStateWithAttackAura(): MatchState {
  const state = setupDuelState();
  state.players.p2!.resources.health.current = 10;

  return [
    {
      id: "evt_7",
      matchId: "match_m1",
      sequence: 7,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: "zone_board_p1",
          ownerId: "p1",
          zoneType: "board",
          visibility: { kind: "public" },
          ordering: "ordered",
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
      type: "object_created",
      payload: {
        object: {
          id: "minion_banner",
          templateId: "banner",
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: 0,
          visibility: { kind: "public" },
          stats: { attack: 1, health: 3 },
          counters: {},
          tags: ["minion", "attack_aura"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 8,
          lastChangedAtSequence: 8
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
          id: "minion_recruit_one",
          templateId: "recruit",
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: 1,
          visibility: { kind: "public" },
          stats: { attack: 2, health: 2 },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 9,
          lastChangedAtSequence: 9
        }
      },
      visibility: publicVisibility()
    },
    {
      id: "evt_10",
      matchId: "match_m1",
      sequence: 10,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: "minion_recruit_two",
          templateId: "recruit",
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: 2,
          visibility: { kind: "public" },
          stats: { attack: 2, health: 2 },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 10,
          lastChangedAtSequence: 10
        }
      },
      visibility: publicVisibility()
    }
  ].reduce((current, event) => reduceEvent(current, event), state);
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

test("matching_object_stat_sum can add board stats to a numeric effect value", () => {
  const poweredLibrary: BehaviorLibrary = {
    behaviors: {
      powered_bolt: {
        id: "powered_bolt",
        version: "0.1.0",
        kind: "card",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [
          {
            type: "deal_damage",
            to: { selector: "target" },
            amount: {
              source: "matching_object_stat_sum",
              base: 3,
              stat: "spellPower",
              match: { objectTypes: ["minion"], zoneType: "board", controller: "controller" }
            },
            damageType: "spell"
          }
        ]
      }
    }
  };

  const result = resolveCommand(setupDuelStateWithSpellPower(), {
    id: "cmd_powered_bolt",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "powered_bolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: poweredLibrary
  });

  assert.equal(result.state.players.p2?.resources.health.current, 5);
  assert.ok(result.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 5));
});

test("sum numeric values can combine object stats and player resources", () => {
  const summedLibrary: BehaviorLibrary = {
    behaviors: {
      focused_weapon_attack: {
        id: "focused_weapon_attack",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [
          {
            type: "deal_damage",
            to: { selector: "target" },
            amount: {
              source: "sum",
              values: [
                { source: "object_stat", object: "self", stat: "attack" },
                { source: "player_resource", player: "command_player", resource: "heroAttack" }
              ]
            },
            damageType: "weapon"
          }
        ]
      }
    }
  };
  const state = setupDuelState();
  state.players.p1!.resources.heroAttack = { current: 4 };
  state.players.p2!.resources.health = { current: 10, max: 10 };
  state.zones.zone_hand_p1!.objectIds.push("weapon_test");
  state.objects.weapon_test = {
    id: "weapon_test",
    templateId: "test_weapon",
    objectType: "equipment",
    ownerId: "p1",
    controllerId: "p1",
    creatorId: "system",
    zoneId: "zone_hand_p1",
    position: 1,
    visibility: { kind: "public" },
    stats: { attack: 3 },
    counters: {},
    tags: ["weapon"],
    keywords: [],
    attachments: [],
    modifiers: [],
    createdAtSequence: state.lastSequence,
    lastChangedAtSequence: state.lastSequence
  };

  const result = resolveCommand(state, {
    id: "cmd_focused_weapon_attack",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "focused_weapon_attack",
      sourceObjectId: "weapon_test",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: summedLibrary
  });

  assert.equal(result.state.players.p2?.resources.health.current, 3);
  assert.ok(result.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 7));
});

test("stat modifiers apply continuously while their source matches", () => {
  const auraLibrary: BehaviorLibrary = {
    statModifiers: [
      {
        id: "banner_attack_aura",
        stat: "attack",
        delta: 1,
        source: { objectTypes: ["minion"], zoneType: "board", tags: ["attack_aura"] },
        target: { objectTypes: ["minion"], zoneType: "board", controller: "controller" }
      }
    ],
    behaviors: {
      attack_with_aura: {
        id: "attack_with_aura",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [
          { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" } }
        ]
      },
      destroy_banner: {
        id: "destroy_banner",
        version: "0.1.0",
        kind: "ability",
        effects: [{ type: "destroy_object", object: { id: "minion_banner" }, toZoneId: "zone_discard", reason: "test_removed" }]
      }
    }
  };

  const first = resolveCommand(setupDuelStateWithAttackAura(), {
    id: "cmd_attack_one",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_aura",
      sourceObjectId: "minion_recruit_one",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: auraLibrary
  });

  assert.equal(first.state.players.p2?.resources.health.current, 7);
  assert.equal(first.state.objects.minion_recruit_one?.stats.attack, 2);
  assert.ok(first.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 3));

  const removed = resolveCommand(first.state, {
    id: "cmd_destroy_banner",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "destroy_banner"
    }
  }, {
    behaviorLibrary: auraLibrary
  });

  const second = resolveCommand(removed.state, {
    id: "cmd_attack_two",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "attack_with_aura",
      sourceObjectId: "minion_recruit_two",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: auraLibrary
  });

  assert.equal(second.state.players.p2?.resources.health.current, 5);
  assert.ok(second.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 2));
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

test("resource_at_most conditions can block actions while a resource flag is active", () => {
  const gatedLibrary: BehaviorLibrary = {
    behaviors: {
      chilled_attack: {
        id: "chilled_attack",
        version: "0.1.0",
        kind: "ability",
        conditions: [{ type: "resource_at_most", player: "command_player", resource: "heroFrozen", amount: 0 }],
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "test" }]
      }
    }
  };
  const state = setupDuelState();
  state.players.p1!.resources.heroFrozen = { current: 1 };

  assert.throws(
    () =>
      resolveCommand(state, {
        id: "cmd_chilled_attack",
        matchId: "match_m1",
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "chilled_attack",
          selections: { target: ["p2"] }
        }
      }, {
        behaviorLibrary: gatedLibrary
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  state.players.p1!.resources.heroFrozen.current = 0;
  const result = resolveCommand(state, {
    id: "cmd_thawed_attack",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "chilled_attack",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: gatedLibrary
  });

  assert.equal(result.state.players.p2?.resources.health.current, 2);
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

test("armor absorbs player damage before health is reduced", () => {
  const state = setupDuelState();
  state.players.p2!.resources.armor = { current: 2 };

  const damaged = resolveCommand(state, {
    id: "cmd_firebolt_into_armor",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary,
    outcomeMode: "last_alive"
  });

  assert.equal(damaged.state.players.p2?.resources.armor.current, 0);
  assert.equal(damaged.state.players.p2?.resources.health.current, 2);
  assert.ok(damaged.events.some((event) => event.type === "resource_changed" && (event.payload as { reason?: string }).reason === "armor_absorbed"));
  assert.ok(damaged.events.some((event) => event.type === "damage_dealt" && (event.payload as { amount?: number }).amount === 3));
});

test("deal_damage_to_matching_players damages filtered players only", () => {
  const sweepLibrary: BehaviorLibrary = {
    behaviors: {
      enemy_pressure: {
        id: "enemy_pressure",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "deal_damage_to_matching_players",
            match: { status: "alive", notSelf: true },
            amount: 2
          }
        ]
      }
    }
  };
  const result = resolveCommand(setupDuelState(), {
    id: "cmd_enemy_pressure",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "enemy_pressure"
    }
  }, {
    behaviorLibrary: sweepLibrary
  });

  assert.equal(result.state.players.p1?.resources.health.current, 10);
  assert.equal(result.state.players.p2?.resources.health.current, 1);
  assert.deepEqual(result.events.map((event) => event.type), ["damage_dealt", "resource_changed"]);
});

test("create_object can summon an object into a zone", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  const summonLibrary: BehaviorLibrary = {
    behaviors: {
      summon_guard: {
        id: "summon_guard",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "create_object",
            toZoneId: "zone_board_p1",
            object: {
              id: "token_guard_{player}_{next_sequence}",
              templateId: "guard_token",
              objectType: "minion",
              tags: ["minion", "taunt"],
              stats: { attack: 0, health: 2 },
              exhausted: true
            }
          }
        ]
      }
    }
  };

  const result = resolveCommand(state, {
    id: "cmd_summon_guard",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: { behaviorId: "summon_guard" }
  }, {
    behaviorLibrary: summonLibrary
  });

  const tokenId = result.state.zones.zone_board_p1?.objectIds[0];
  assert.equal(tokenId, "token_guard_p1_8");
  assert.equal(result.state.objects[tokenId!]?.ownerId, "p1");
  assert.equal(result.state.objects[tokenId!]?.stats.health, 2);
  assert.equal(result.state.objects[tokenId!]?.exhausted, true);
});

test("play_object moves a hand card onto a board as a live object", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        capacity: 7,
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  const playLibrary: BehaviorLibrary = {
    behaviors: {
      play_recruit: {
        id: "play_recruit",
        version: "0.1.0",
        kind: "card",
        costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
        effects: [
          {
            type: "play_object",
            object: "self",
            toZoneId: { owner: "controller", zoneType: "board" },
            fromZoneType: "hand",
            objectType: "minion",
            visibility: { kind: "public" },
            stats: { attack: 2, health: 3 },
            tags: ["minion", "neutral"],
            exhausted: true,
            reason: "played_from_hand"
          }
        ]
      }
    }
  };

  const result = resolveCommand(state, {
    id: "cmd_play_recruit",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_recruit",
      sourceObjectId: "card_firebolt"
    }
  }, {
    behaviorLibrary: playLibrary
  });

  assert.deepEqual(result.events.map((event) => event.type), ["resource_changed", "object_played"]);
  assert.deepEqual(result.state.zones.zone_hand_p1?.objectIds, []);
  assert.deepEqual(result.state.zones.zone_board_p1?.objectIds, ["card_firebolt"]);
  assert.equal(result.state.objects.card_firebolt?.objectType, "minion");
  assert.deepEqual(result.state.objects.card_firebolt?.visibility, { kind: "public" });
  assert.deepEqual(result.state.objects.card_firebolt?.stats, { attack: 2, health: 3 });
  assert.equal(result.state.objects.card_firebolt?.exhausted, true);
});

test("play_object rejects objects outside the required source zone type", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        capacity: 7,
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
        id: "card_in_discard",
        templateId: "recruit",
        objectType: "card",
        ownerId: "p1",
        controllerId: "p1",
        creatorId: "system",
        zoneId: "zone_discard",
        position: 0,
        visibility: { kind: "public" },
        stats: {},
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });
  const playLibrary: BehaviorLibrary = {
    behaviors: {
      play_recruit: {
        id: "play_recruit",
        version: "0.1.0",
        kind: "card",
        effects: [
          {
            type: "play_object",
            object: "self",
            toZoneId: { owner: "controller", zoneType: "board" },
            fromZoneType: "hand",
            objectType: "minion",
            visibility: { kind: "public" },
            stats: { attack: 2, health: 3 },
            tags: ["minion", "neutral"],
            exhausted: true
          }
        ]
      }
    }
  };

  assert.throws(
    () => resolveCommand(state, {
      id: "cmd_play_recruit",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "play_recruit",
        sourceObjectId: "card_in_discard"
      }
    }, {
      behaviorLibrary: playLibrary
    }),
    (error: unknown) => error instanceof CommandRejectedError && error.code === "zone_mismatch"
  );
});

test("play_object can resolve a battlecry-style follow-up behavior", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        capacity: 7,
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  const playLibrary: BehaviorLibrary = {
    behaviors: {
      play_sharpshooter: {
        id: "play_sharpshooter",
        version: "0.1.0",
        kind: "card",
        costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [
          {
            type: "play_object",
            object: "self",
            toZoneId: { owner: "controller", zoneType: "board" },
            fromZoneType: "hand",
            objectType: "minion",
            visibility: { kind: "public" },
            stats: { attack: 1, health: 1 },
            tags: ["minion", "battlecry"],
            exhausted: true,
            battlecryBehaviorId: "sharpshooter_ping"
          }
        ]
      },
      sharpshooter_ping: {
        id: "sharpshooter_ping",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "players",
            count: { min: 1, max: 1 },
            match: { status: "alive", notSelf: true }
          }
        ],
        effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "battlecry" }]
      }
    }
  };

  const result = resolveCommand(state, {
    id: "cmd_play_sharpshooter",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_sharpshooter",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  }, {
    behaviorLibrary: playLibrary
  });

  assert.deepEqual(result.events.map((event) => event.type), ["resource_changed", "object_played", "damage_dealt", "resource_changed"]);
  assert.equal(result.state.objects.card_firebolt?.zoneId, "zone_board_p1");
  assert.equal(result.state.players.p2?.resources.health.current, 2);
  assert.equal((result.events.find((event) => event.type === "damage_dealt")?.payload as { sourceObjectId?: string }).sourceObjectId, "card_firebolt");
});

test("trigger behaviors can target the event object that matched the trigger", () => {
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
          id: "zone_board_p1",
          ownerId: "p1",
          zoneType: "board",
          visibility: { kind: "public" },
          ordering: "ordered",
          capacity: 7,
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
      type: "object_created",
      payload: {
        object: {
          id: "minion_commander",
          templateId: "commander",
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: 0,
          visibility: { kind: "public" },
          stats: { attack: 2, health: 3 },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: 8,
          lastChangedAtSequence: 8
        }
      },
      visibility: publicVisibility()
    }
  ] as MatchEvent[]) {
    state = reduceEvent(state, event);
  }

  const triggerLibrary: BehaviorLibrary = {
    behaviors: {
      arm_commander: {
        id: "arm_commander",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "register_trigger",
            source: "self",
            behaviorId: "ready_small_played_minion",
            eventType: "object_played",
            priority: 10
          }
        ]
      },
      ready_small_played_minion: {
        id: "ready_small_played_minion",
        version: "0.1.0",
        kind: "trigger",
        trigger: {
          eventType: "object_played",
          timing: "after",
          eventMatch: {
            object: {
              objectTypes: ["minion"],
              zoneType: "board",
              controller: "controller",
              stats: { attack: { max: 3 } }
            }
          }
        },
        effects: [
          { type: "set_object_exhausted", object: "event_object", exhausted: false, reason: "commander_ready" },
          { type: "set_object_keyword", object: "event_object", keyword: "charge", present: true, reason: "commander_ready" }
        ]
      },
      play_recruit: {
        id: "play_recruit",
        version: "0.1.0",
        kind: "card",
        effects: [
          {
            type: "play_object",
            object: "self",
            toZoneId: { owner: "controller", zoneType: "board" },
            fromZoneType: "hand",
            objectType: "minion",
            visibility: { kind: "public" },
            stats: { attack: 2, health: 3 },
            tags: ["minion", "neutral"],
            exhausted: true,
            reason: "played_from_hand"
          }
        ]
      }
    }
  };

  const armed = resolveCommand(state, {
    id: "cmd_arm_commander",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "arm_commander",
      sourceObjectId: "minion_commander"
    }
  }, {
    behaviorLibrary: triggerLibrary
  });
  const played = resolveCommand(armed.state, {
    id: "cmd_play_recruit_with_commander",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "play_recruit",
      sourceObjectId: "card_firebolt"
    }
  }, {
    behaviorLibrary: triggerLibrary
  });

  assert.deepEqual(played.events.map((event) => event.type), [
    "object_played",
    "trigger_fired",
    "object_exhausted",
    "object_keyword_changed"
  ]);
  assert.equal(played.state.objects.card_firebolt?.exhausted, false);
  assert.equal(played.state.objects.card_firebolt?.keywords.includes("charge"), true);
});

test("deal_damage_to_object reduces health stat and destroys at zero", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p2",
        ownerId: "p2",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
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
        id: "minion_target",
        templateId: "target_dummy",
        objectType: "minion",
        ownerId: "p2",
        controllerId: "p2",
        creatorId: "system",
        zoneId: "zone_board_p2",
        position: 0,
        visibility: { kind: "public" },
        stats: { health: 2 },
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });
  const objectDamageLibrary: BehaviorLibrary = {
    behaviors: {
      strike_object: {
        id: "strike_object",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "objects",
            count: { min: 1, max: 1 },
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
          }
        ],
        effects: [{ type: "deal_damage_to_object", to: { selector: "target" }, amount: 2, toZoneId: "zone_discard" }]
      }
    }
  };

  const result = resolveCommand(state, {
    id: "cmd_strike_object",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "strike_object",
      selections: { target: ["minion_target"] }
    }
  }, {
    behaviorLibrary: objectDamageLibrary
  });

  assert.equal(result.state.objects.minion_target?.stats.health, 0);
  assert.equal(result.state.objects.minion_target?.zoneId, "zone_discard");
  assert.deepEqual(result.events.map((event) => event.type), ["damage_dealt", "object_stat_changed", "object_destroyed"]);
});

test("deal_damage_to_matching_objects damages every legal object from a shared match filter", () => {
  let state = setupDuelState();
  for (const [sequence, zoneId, ownerId] of [
    [7, "zone_board_p1", "p1"],
    [8, "zone_board_p2", "p2"]
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${sequence}`,
      matchId: "match_m1",
      sequence,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: zoneId,
          ownerId,
          zoneType: "board",
          visibility: { kind: "public" },
          ordering: "ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    });
  }

  for (const object of [
    { id: "friendly_guard", zoneId: "zone_board_p1", ownerId: "p1", health: 5, position: 0 },
    { id: "enemy_guard", zoneId: "zone_board_p2", ownerId: "p2", health: 3, position: 0 },
    { id: "enemy_scout", zoneId: "zone_board_p2", ownerId: "p2", health: 1, position: 1 }
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: object.id,
          templateId: object.id,
          objectType: "minion",
          ownerId: object.ownerId,
          controllerId: object.ownerId,
          creatorId: "system",
          zoneId: object.zoneId,
          position: object.position,
          visibility: { kind: "public" },
          stats: { health: object.health },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: state.lastSequence + 1,
          lastChangedAtSequence: state.lastSequence + 1
        }
      },
      visibility: publicVisibility()
    });
  }

  const areaDamageLibrary: BehaviorLibrary = {
    behaviors: {
      enemy_sweep: {
        id: "enemy_sweep",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "deal_damage_to_matching_objects",
            amount: 2,
            damageType: "area",
            toZoneId: "zone_discard",
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
          }
        ]
      }
    }
  };

  const result = resolveCommand(state, {
    id: "cmd_enemy_sweep",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "enemy_sweep"
    }
  }, {
    behaviorLibrary: areaDamageLibrary
  });

  assert.equal(result.state.objects.friendly_guard?.stats.health, 5);
  assert.equal(result.state.objects.enemy_guard?.stats.health, 1);
  assert.equal(result.state.objects.enemy_scout?.zoneId, "zone_discard");
  assert.deepEqual(result.events.map((event) => event.type), [
    "damage_dealt",
    "object_stat_changed",
    "damage_dealt",
    "object_stat_changed",
    "object_destroyed"
  ]);
});

test("deal_damage_to_random_targets records deterministic random choices", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p2",
        ownerId: "p2",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
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
    type: "resource_changed",
    payload: {
      playerId: "p2",
      resource: "health",
      current: 10,
      max: 10,
      reason: "test_setup"
    },
    visibility: publicVisibility()
  });
  state = reduceEvent(state, {
    id: "evt_9",
    matchId: "match_m1",
    sequence: 9,
    transactionId: "tx_setup",
    type: "object_created",
    payload: {
      object: {
        id: "enemy_guard",
        templateId: "guard",
        objectType: "minion",
        ownerId: "p2",
        controllerId: "p2",
        creatorId: "system",
        zoneId: "zone_board_p2",
        position: 0,
        visibility: { kind: "public" },
        stats: { health: 10 },
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 9,
        lastChangedAtSequence: 9
      }
    },
    visibility: publicVisibility()
  });
  const randomLibrary: BehaviorLibrary = {
    behaviors: {
      spark_storm: {
        id: "spark_storm",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "deal_damage_to_random_targets",
            count: {
              source: "matching_object_stat_sum",
              base: 3,
              stat: "spellPower",
              match: { objectTypes: ["minion"], zoneType: "board", controller: "controller" }
            },
            amount: 1,
            damageType: "spark",
            targetPool: {
              players: { status: "alive", notSelf: true },
              objects: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
            },
            toZoneId: "zone_discard",
            reason: "spark_storm"
          }
        ]
      }
    }
  };
  const command: MatchCommand = {
    id: "cmd_spark_storm",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "spark_storm"
    }
  };

  const first = resolveCommand(state, command, { behaviorLibrary: randomLibrary });
  const second = resolveCommand(state, command, { behaviorLibrary: randomLibrary });
  const firstChoices = first.events
    .filter((event) => event.type === "random_choice_made")
    .map((event) => event.payload as { selectedKind: string; selectedId: string; candidateIds: string[] });
  const secondChoices = second.events
    .filter((event) => event.type === "random_choice_made")
    .map((event) => event.payload as { selectedKind: string; selectedId: string; candidateIds: string[] });

  assert.equal(first.state.rngCursor, 3);
  assert.equal(firstChoices.length, 3);
  assert.deepEqual(firstChoices, secondChoices);
  assert.deepEqual(firstChoices[0]?.candidateIds, ["object:enemy_guard", "player:p2"]);
  assert.equal(first.events.filter((event) => event.type === "damage_dealt").length, 3);
});

test("copy_random_object_from_zone creates an owner-visible copy without leaking the hidden source", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_hand_p2",
        ownerId: "p2",
        zoneType: "hand",
        visibility: { kind: "owner" },
        ordering: "ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  for (const object of [
    { id: "card_secret_bolt", templateId: "secret_bolt", position: 0 },
    { id: "card_secret_guard", templateId: "secret_guard", position: 1 }
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: object.id,
          templateId: object.templateId,
          objectType: "card",
          ownerId: "p2",
          controllerId: "p2",
          creatorId: "system",
          zoneId: "zone_hand_p2",
          position: object.position,
          visibility: { kind: "owner" },
          stats: {},
          counters: {},
          tags: ["spell"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: state.lastSequence + 1,
          lastChangedAtSequence: state.lastSequence + 1
        }
      },
      visibility: publicVisibility()
    });
  }
  const copyLibrary: BehaviorLibrary = {
    behaviors: {
      mind_peek: {
        id: "mind_peek",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "copy_random_object_from_zone",
            fromZoneId: { owner: { id: "p2" }, zoneType: "hand" },
            toZoneId: { owner: "controller", zoneType: "hand" },
            objectId: "copied_card_{player}_{next_sequence}",
            owner: "controller",
            controller: "controller",
            reason: "mind_peek"
          }
        ]
      }
    }
  };

  const copied = resolveCommand(state, {
    id: "cmd_mind_peek",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "mind_peek"
    }
  }, {
    behaviorLibrary: copyLibrary
  });
  const copiedId = copied.state.zones.zone_hand_p1?.objectIds.find((objectId) => objectId.startsWith("copied_card_p1_"));
  const randomEvent = copied.events.find((event) => event.type === "random_choice_made");
  const createdEvent = copied.events.find((event) => event.type === "object_created");

  assert.ok(copiedId);
  assert.equal(copied.state.zones.zone_hand_p2?.objectIds.length, 2);
  assert.equal(copied.state.objects[copiedId]?.ownerId, "p1");
  assert.equal(copied.state.objects[copiedId]?.controllerId, "p1");
  assert.equal(copied.state.objects[copiedId]?.visibility.kind, "owner");
  assert.ok(["secret_bolt", "secret_guard"].includes(copied.state.objects[copiedId]?.templateId ?? ""));
  assert.deepEqual(copied.events.map((event) => event.type), ["random_choice_made", "object_created"]);
  assert.equal(randomEvent?.visibility.default.kind, "admin");
  assert.equal(projectEvent(randomEvent!, copied.state, { playerId: "p1" }), null);
  assert.equal(projectEvent(randomEvent!, copied.state, { playerId: "p2" }), null);

  const p1Created = projectEvent(createdEvent!, copied.state, { playerId: "p1" });
  const p2Created = projectEvent(createdEvent!, copied.state, { playerId: "p2" });
  assert.equal((p1Created?.payload as { object?: { templateId?: string } }).object?.templateId, copied.state.objects[copiedId]?.templateId);
  assert.equal((p2Created?.payload as { object?: { objectType?: string; templateId?: string } }).object?.objectType, "hidden");
  assert.equal((p2Created?.payload as { object?: { templateId?: string } }).object?.templateId, undefined);
});

test("object_ready rejects frozen objects until the keyword is cleared", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
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
        id: "frozen_attacker",
        templateId: "guard",
        objectType: "minion",
        ownerId: "p1",
        controllerId: "p1",
        creatorId: "system",
        zoneId: "zone_board_p1",
        position: 0,
        visibility: { kind: "public" },
        stats: { health: 3 },
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });
  const freezeLibrary: BehaviorLibrary = {
    behaviors: {
      freeze_self: {
        id: "freeze_self",
        version: "0.1.0",
        kind: "ability",
        effects: [
          { type: "set_object_keyword", object: "self", keyword: "frozen", present: true, reason: "freeze" },
          { type: "set_object_exhausted", object: "self", exhausted: true, reason: "freeze" }
        ]
      },
      attack: {
        id: "attack",
        version: "0.1.0",
        kind: "ability",
        conditions: [{ type: "object_ready", object: "self" }],
        effects: [{ type: "set_object_exhausted", object: "self", exhausted: true }]
      }
    }
  };

  const frozen = resolveCommand(state, {
    id: "cmd_freeze_self",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "freeze_self",
      sourceObjectId: "frozen_attacker"
    }
  }, {
    behaviorLibrary: freezeLibrary
  });

  assert.equal(frozen.state.objects.frozen_attacker?.keywords.includes("frozen"), true);
  assert.equal(frozen.state.objects.frozen_attacker?.exhausted, true);
  assert.throws(
    () => resolveCommand(frozen.state, {
      id: "cmd_attack_frozen",
      matchId: "match_m1",
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "attack",
        sourceObjectId: "frozen_attacker"
      }
    }, {
      behaviorLibrary: freezeLibrary
    }),
    (error: unknown) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );
});

test("matching object effects can ready non-frozen objects and thaw frozen ones", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });
  for (const object of [
    { id: "normal_minion", keywords: [] },
    { id: "frozen_minion", keywords: ["frozen"] }
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: object.id,
          templateId: object.id,
          objectType: "minion",
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: "zone_board_p1",
          position: state.zones.zone_board_p1?.objectIds.length ?? 0,
          visibility: { kind: "public" },
          stats: { health: 3 },
          counters: {},
          tags: ["minion"],
          keywords: [...object.keywords],
          attachments: [],
          modifiers: [],
          exhausted: true,
          createdAtSequence: state.lastSequence + 1,
          lastChangedAtSequence: state.lastSequence + 1
        }
      },
      visibility: publicVisibility()
    });
  }
  const refreshLibrary: BehaviorLibrary = {
    behaviors: {
      refresh_board: {
        id: "refresh_board",
        version: "0.1.0",
        kind: "rules_module",
        effects: [
          {
            type: "set_object_exhausted_on_matching_objects",
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywordsNot: ["frozen"] },
            exhausted: false,
            reason: "turn_refresh"
          },
          {
            type: "set_object_keyword_on_matching_objects",
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywords: ["frozen"] },
            keyword: "frozen",
            present: false,
            reason: "turn_refresh"
          }
        ]
      }
    }
  };

  const refreshed = resolveCommand(state, {
    id: "cmd_refresh_board",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "refresh_board"
    }
  }, {
    behaviorLibrary: refreshLibrary
  });

  assert.equal(refreshed.state.objects.normal_minion?.exhausted, false);
  assert.equal(refreshed.state.objects.frozen_minion?.exhausted, true);
  assert.equal(refreshed.state.objects.frozen_minion?.keywords.includes("frozen"), false);
  assert.deepEqual(refreshed.events.map((event) => event.type), ["object_exhausted", "object_keyword_changed"]);
});

test("matching object stat adjustments affect only matching objects", () => {
  const state = setupDuelStateWithAttackAura();
  state.objects.minion_recruit_one!.keywords.push("temporary_attack");
  const cleanupLibrary: BehaviorLibrary = {
    behaviors: {
      cleanup_temporary_attack: {
        id: "cleanup_temporary_attack",
        version: "0.1.0",
        kind: "rules_module",
        effects: [
          {
            type: "adjust_object_stat_on_matching_objects",
            match: { objectTypes: ["minion"], zoneType: "board", keywords: ["temporary_attack"] },
            stat: "attack",
            delta: -2,
            min: 0,
            reason: "cleanup"
          }
        ]
      }
    }
  };

  const cleaned = resolveCommand(state, {
    id: "cmd_cleanup_temporary_attack",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "cleanup_temporary_attack"
    }
  }, {
    behaviorLibrary: cleanupLibrary
  });

  assert.equal(cleaned.state.objects.minion_recruit_one?.stats.attack, 0);
  assert.equal(cleaned.state.objects.minion_recruit_two?.stats.attack, 2);
  assert.deepEqual(cleaned.events.map((event) => event.type), ["object_stat_changed"]);
});

test("transform_object preserves identity and replaces object definition fields", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p1",
        ownerId: "p1",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
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
        id: "old_guard",
        templateId: "tower_guard",
        objectType: "minion",
        ownerId: "p1",
        controllerId: "p1",
        creatorId: "system",
        zoneId: "zone_board_p1",
        position: 0,
        visibility: { kind: "public" },
        stats: { attack: 5, health: 4 },
        counters: { charge: 2 },
        tags: ["minion", "taunt"],
        keywords: ["frozen", "taunt"],
        attachments: ["old_attachment"],
        modifiers: ["old_modifier"],
        exhausted: false,
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });

  const transformLibrary: BehaviorLibrary = {
    behaviors: {
      transform_guard: {
        id: "transform_guard",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "transform_object",
            object: "self",
            templateId: "training_spark",
            objectType: "minion",
            visibility: { kind: "public" },
            stats: { attack: 1, health: 1 },
            counters: {},
            tags: ["minion", "transformed"],
            keywords: [],
            attachments: [],
            modifiers: [],
            exhausted: true,
            reason: "test_transform"
          }
        ]
      }
    }
  };

  const transformed = resolveCommand(state, {
    id: "cmd_transform",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "transform_guard",
      sourceObjectId: "old_guard"
    }
  }, {
    behaviorLibrary: transformLibrary
  });

  const object = transformed.state.objects.old_guard;
  assert.equal(object?.id, "old_guard");
  assert.equal(object?.templateId, "training_spark");
  assert.equal(object?.objectType, "minion");
  assert.equal(object?.ownerId, "p1");
  assert.equal(object?.controllerId, "p1");
  assert.equal(object?.zoneId, "zone_board_p1");
  assert.deepEqual(object?.stats, { attack: 1, health: 1 });
  assert.deepEqual(object?.counters, {});
  assert.deepEqual(object?.tags, ["minion", "transformed"]);
  assert.deepEqual(object?.keywords, []);
  assert.deepEqual(object?.attachments, []);
  assert.deepEqual(object?.modifiers, []);
  assert.equal(object?.exhausted, true);
  assert.equal(object?.createdAtSequence, 8);
  assert.equal(object?.lastChangedAtSequence, 9);
  assert.deepEqual(transformed.events.map((event) => event.type), ["object_transformed"]);
});

test("change_object_control moves an object and preserves ownership", () => {
  let state = setupDuelState();
  for (const zone of [
    { id: "zone_board_p1", ownerId: "p1" },
    { id: "zone_board_p2", ownerId: "p2" }
  ]) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: {
        zone: {
          id: zone.id,
          ownerId: zone.ownerId,
          zoneType: "board",
          visibility: { kind: "public" },
          ordering: "ordered",
          objectIds: []
        }
      },
      visibility: publicVisibility()
    });
  }
  state = reduceEvent(state, {
    id: "evt_9",
    matchId: "match_m1",
    sequence: 9,
    transactionId: "tx_setup",
    type: "object_created",
    payload: {
      object: {
        id: "enemy_guard",
        templateId: "guard",
        objectType: "minion",
        ownerId: "p2",
        controllerId: "p2",
        creatorId: "system",
        zoneId: "zone_board_p2",
        position: 0,
        visibility: { kind: "public" },
        stats: { attack: 3, health: 4 },
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        exhausted: false,
        createdAtSequence: 9,
        lastChangedAtSequence: 9
      }
    },
    visibility: publicVisibility()
  });

  const controlLibrary: BehaviorLibrary = {
    behaviors: {
      take_guard: {
        id: "take_guard",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "change_object_control",
            object: "self",
            controller: "command_player",
            toZoneId: { owner: "command_player", zoneType: "board" },
            exhausted: true,
            reason: "test_control"
          }
        ]
      }
    }
  };

  const controlled = resolveCommand(state, {
    id: "cmd_take_guard",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "take_guard",
      sourceObjectId: "enemy_guard"
    }
  }, {
    behaviorLibrary: controlLibrary
  });

  const object = controlled.state.objects.enemy_guard;
  assert.equal(object?.ownerId, "p2");
  assert.equal(object?.controllerId, "p1");
  assert.equal(object?.zoneId, "zone_board_p1");
  assert.equal(object?.exhausted, true);
  assert.deepEqual(controlled.state.zones.zone_board_p1?.objectIds, ["enemy_guard"]);
  assert.deepEqual(controlled.state.zones.zone_board_p2?.objectIds, []);
  assert.deepEqual(controlled.events.map((event) => event.type), ["object_control_changed"]);
});

test("object selectors can require numeric stat thresholds", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p2",
        ownerId: "p2",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
        objectIds: []
      }
    },
    visibility: publicVisibility()
  });

  for (const object of [
    { id: "small_guard", attack: 2, health: 3 },
    { id: "large_guard", attack: 6, health: 7 }
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: object.id,
          templateId: object.id,
          objectType: "minion",
          ownerId: "p2",
          controllerId: "p2",
          creatorId: "system",
          zoneId: "zone_board_p2",
          position: state.zones.zone_board_p2?.objectIds.length ?? 0,
          visibility: { kind: "public" },
          stats: { attack: object.attack, health: object.health },
          counters: {},
          tags: ["minion"],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: state.lastSequence + 1,
          lastChangedAtSequence: state.lastSequence + 1
        }
      },
      visibility: publicVisibility()
    });
  }

  const statFilterLibrary: BehaviorLibrary = {
    behaviors: {
      destroy_small: {
        id: "destroy_small",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "objects",
            count: { min: 1, max: 1 },
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller", stats: { attack: { max: 3 } } }
          }
        ],
        effects: [{ type: "destroy_object", object: { selector: "target" }, toZoneId: "zone_discard", reason: "small_target" }]
      }
    }
  };

  assert.throws(
    () =>
      resolveCommand(state, {
        id: "cmd_destroy_large",
        matchId: "match_m1",
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "destroy_small",
          selections: { target: ["large_guard"] }
        }
      }, {
        behaviorLibrary: statFilterLibrary
      }),
    (error) => error instanceof CommandRejectedError && error.code === "illegal_selection"
  );

  const destroyed = resolveCommand(state, {
    id: "cmd_destroy_small",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "destroy_small",
      selections: { target: ["small_guard"] }
    }
  }, {
    behaviorLibrary: statFilterLibrary
  });

  assert.equal(destroyed.state.objects.small_guard?.zoneId, "zone_discard");
  assert.equal(destroyed.state.objects.large_guard?.zoneId, "zone_board_p2");
});

test("heal_object restores damaged objects up to maxHealth and selectors can require damaged objects", () => {
  let state = setupDuelState();
  state = reduceEvent(state, {
    id: "evt_7",
    matchId: "match_m1",
    sequence: 7,
    transactionId: "tx_setup",
    type: "zone_created",
    payload: {
      zone: {
        id: "zone_board_p2",
        ownerId: "p2",
        zoneType: "board",
        visibility: { kind: "public" },
        ordering: "ordered",
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
        id: "damaged_guard",
        templateId: "guard",
        objectType: "minion",
        ownerId: "p2",
        controllerId: "p2",
        creatorId: "system",
        zoneId: "zone_board_p2",
        position: 0,
        visibility: { kind: "public" },
        stats: { attack: 2, health: 2, maxHealth: 5 },
        counters: {},
        tags: ["minion"],
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: 8,
        lastChangedAtSequence: 8
      }
    },
    visibility: publicVisibility()
  });
  const healingLibrary: BehaviorLibrary = {
    behaviors: {
      restore_damaged: {
        id: "restore_damaged",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "objects",
            count: { min: 1, max: 1 },
            match: {
              objectTypes: ["minion"],
              zoneType: "board",
              stats: { health: { lessThanStat: "maxHealth" } }
            }
          }
        ],
        effects: [{ type: "heal_object", object: { selector: "target" }, amount: 4 }]
      }
    }
  };

  const healed = resolveCommand(state, {
    id: "cmd_restore_damaged",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "restore_damaged",
      selections: { target: ["damaged_guard"] }
    }
  }, {
    behaviorLibrary: healingLibrary
  });

  assert.equal(healed.state.objects.damaged_guard?.stats.health, 5);
  assert.deepEqual(healed.events.map((event) => event.type), ["object_stat_changed"]);
  assert.equal((healed.events[0]?.payload as { reason?: string }).reason, "heal");
  assert.throws(
    () =>
      resolveCommand(healed.state, {
        id: "cmd_restore_full",
        matchId: "match_m1",
        playerId: "p1",
        type: "execute_behavior",
        payload: {
          behaviorId: "restore_damaged",
          selections: { target: ["damaged_guard"] }
        }
      }, {
        behaviorLibrary: healingLibrary
      }),
    (error) => error instanceof CommandRejectedError && error.code === "illegal_selection"
  );
});

test("trigger eventMatch can react to healed minions and dynamic stat values can double health", () => {
  let state = setupDuelState();
  for (const zone of [
    { id: "zone_board_p1", ownerId: "p1", zoneType: "board", visibility: { kind: "public" as const }, ordering: "ordered" as const },
    { id: "zone_deck_p1", ownerId: "p1", zoneType: "deck", visibility: { kind: "owner" as const }, ordering: "hidden_ordered" as const }
  ]) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "zone_created",
      payload: { zone: { ...zone, objectIds: [] } },
      visibility: publicVisibility()
    });
  }
  for (const object of [
    { id: "watcher", zoneId: "zone_board_p1", objectType: "minion", stats: { attack: 1, health: 3, maxHealth: 3 }, position: 0 },
    { id: "ally_guard", zoneId: "zone_board_p1", objectType: "minion", stats: { attack: 2, health: 1, maxHealth: 3 }, position: 1 },
    { id: "card_reward", zoneId: "zone_deck_p1", objectType: "card", stats: {}, position: 0 }
  ] as const) {
    state = reduceEvent(state, {
      id: `evt_${state.lastSequence + 1}`,
      matchId: "match_m1",
      sequence: state.lastSequence + 1,
      transactionId: "tx_setup",
      type: "object_created",
      payload: {
        object: {
          id: object.id,
          templateId: object.id,
          objectType: object.objectType,
          ownerId: "p1",
          controllerId: "p1",
          creatorId: "system",
          zoneId: object.zoneId,
          position: object.position,
          visibility: object.zoneId === "zone_deck_p1" ? { kind: "owner" } : { kind: "public" },
          stats: object.stats,
          counters: {},
          tags: object.objectType === "minion" ? ["minion"] : [],
          keywords: [],
          attachments: [],
          modifiers: [],
          createdAtSequence: state.lastSequence + 1,
          lastChangedAtSequence: state.lastSequence + 1
        }
      },
      visibility: publicVisibility()
    });
  }
  const triggerLibrary: BehaviorLibrary = {
    behaviors: {
      arm_heal_draw: {
        id: "arm_heal_draw",
        version: "0.1.0",
        kind: "ability",
        effects: [
          {
            type: "register_trigger",
            source: "self",
            behaviorId: "heal_draw",
            eventType: "object_stat_changed",
            once: false
          }
        ]
      },
      heal_draw: {
        id: "heal_draw",
        version: "0.1.0",
        kind: "trigger",
        trigger: {
          eventType: "object_stat_changed",
          timing: "after",
          source: "any",
          eventMatch: {
            reason: "heal",
            stat: "health",
            object: { objectTypes: ["minion"], zoneType: "board" }
          }
        },
        effects: [
          {
            type: "draw_cards",
            fromZoneId: "zone_deck_p1",
            toZoneId: "zone_hand_p1",
            count: 1
          }
        ]
      },
      restore_ally: {
        id: "restore_ally",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "objects",
            count: { min: 1, max: 1 },
            match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "controller" }
          }
        ],
        effects: [{ type: "heal_object", object: { selector: "target" }, amount: 2 }]
      },
      double_health: {
        id: "double_health",
        version: "0.1.0",
        kind: "ability",
        selectors: [
          {
            id: "target",
            from: "objects",
            count: { min: 1, max: 1 },
            match: { objectTypes: ["minion"], zoneType: "board" }
          }
        ],
        effects: [
          {
            type: "set_object_stat",
            object: { selector: "target" },
            stat: "maxHealth",
            value: { source: "object_stat", object: { selector: "target" }, stat: "maxHealth", multiplier: 2 },
            reason: "double_health"
          },
          {
            type: "set_object_stat",
            object: { selector: "target" },
            stat: "health",
            value: { source: "object_stat", object: { selector: "target" }, stat: "health", multiplier: 2 },
            reason: "double_health"
          }
        ]
      }
    }
  };

  const armed = resolveCommand(state, {
    id: "cmd_arm_heal_draw",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "arm_heal_draw",
      sourceObjectId: "watcher"
    }
  }, {
    behaviorLibrary: triggerLibrary
  });
  const healed = resolveCommand(armed.state, {
    id: "cmd_restore_ally",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "restore_ally",
      selections: { target: ["ally_guard"] }
    }
  }, {
    behaviorLibrary: triggerLibrary
  });

  assert.equal(healed.state.objects.ally_guard?.stats.health, 3);
  assert.deepEqual(healed.state.zones.zone_hand_p1?.objectIds, ["card_firebolt", "card_reward"]);
  assert.deepEqual(healed.events.map((event) => event.type), ["object_stat_changed", "trigger_fired", "card_moved"]);

  const doubled = resolveCommand(healed.state, {
    id: "cmd_double_health",
    matchId: "match_m1",
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "double_health",
      selections: { target: ["ally_guard"] }
    }
  }, {
    behaviorLibrary: triggerLibrary
  });

  assert.equal(doubled.state.objects.ally_guard?.stats.maxHealth, 6);
  assert.equal(doubled.state.objects.ally_guard?.stats.health, 6);
  assert.deepEqual(doubled.events.map((event) => event.type), ["object_stat_changed", "object_stat_changed"]);
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
