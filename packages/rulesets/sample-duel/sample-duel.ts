import type { BehaviorLibrary, ContentLock, MatchEvent, PhaseGraphDefinition } from "../../engine-core/src/index.ts";

function visibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

interface DuelSetupOptions {
  p1Health?: number;
  p2Health?: number;
  p1Mana?: number;
  p2Mana?: number;
  contentLock?: ContentLock;
  mirrorP2Hand?: boolean;
}

export function createSampleDuelSetupEvents(options: DuelSetupOptions = {}): MatchEvent[] {
  const p1Health = options.p1Health ?? 10;
  const p2Health = options.p2Health ?? 3;
  const p1Mana = options.p1Mana ?? 10;
  const p2Mana = options.p2Mana ?? 0;
  let sequence = 0;

  function event(type: string, payload: unknown): MatchEvent {
    sequence += 1;
    return {
      id: `evt_${sequence}`,
      matchId: "sample_duel_match",
      sequence,
      transactionId: "tx_setup",
      type,
      payload,
      visibility: visibility()
    };
  }

  function zone(id: string, ownerId: string | undefined, zoneType: string, ordering: "ordered" | "unordered" | "hidden_ordered", capacity?: number) {
    return event("zone_created", {
      zone: {
        id,
        ownerId,
        zoneType,
        visibility: ownerId ? { kind: "owner" } : { kind: "public" },
        ordering,
        capacity,
        objectIds: []
      }
    });
  }

  function object(
    id: string,
    templateId: string,
    zoneId: string,
    position: number,
    ownerId = "p1",
    tags: string[] = [],
    counters: Record<string, number> = {}
  ) {
    return event("object_created", {
      object: {
        id,
        templateId,
        objectType: tags.includes("minion") ? "minion" : "card",
        ownerId,
        controllerId: ownerId,
        creatorId: "system",
        zoneId,
        position,
        visibility: zoneId.includes("_board_") || zoneId.includes("_weapon_") ? { kind: "public" } : { kind: "owner" },
        stats: {},
        counters,
        tags,
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: sequence + 1,
        lastChangedAtSequence: sequence + 1
      }
    });
  }

  return [
    event("match_initialized", {
      matchId: "sample_duel_match",
      gameDefinitionId: "sample-duel",
      gameDefinitionVersion: "0.1.0",
      seed: "sample-duel-seed",
      contentLock: options.contentLock ?? {
        gameDefinition: {
          id: "sample-duel",
          version: "0.1.0",
          contentHash: "sha256:sample-duel-dev"
        }
      }
    }),
    event("player_seated", {
      seat: { id: "seat_1", index: 0, playerId: "p1" },
      player: {
        id: "p1",
        userId: "u1",
        seatId: "seat_1",
        controllerId: "p1",
        status: "alive",
        heroRef: "hero_p1",
        resources: {
          health: { current: p1Health, max: 30 },
          mana: { current: p1Mana, max: p1Mana },
          fatigue: { current: 0 }
        }
      }
    }),
    event("player_seated", {
      seat: { id: "seat_2", index: 1, playerId: "p2" },
      player: {
        id: "p2",
        userId: "u2",
        seatId: "seat_2",
        controllerId: "p2",
        status: "alive",
        heroRef: "hero_p2",
        resources: {
          health: { current: p2Health, max: 30 },
          mana: { current: p2Mana, max: p2Mana },
          fatigue: { current: 0 }
        }
      }
    }),
    zone("zone_hand_p1", "p1", "hand", "ordered"),
    zone("zone_deck_p1", "p1", "deck", "hidden_ordered"),
    zone("zone_board_p1", "p1", "board", "ordered", 7),
    zone("zone_weapon_p1", "p1", "weapon", "ordered", 1),
    zone("zone_hand_p2", "p2", "hand", "ordered"),
    zone("zone_deck_p2", "p2", "deck", "hidden_ordered"),
    zone("zone_board_p2", "p2", "board", "ordered", 7),
    zone("zone_weapon_p2", "p2", "weapon", "ordered", 1),
    zone("zone_discard", undefined, "discard", "ordered"),
    zone("zone_graveyard", undefined, "graveyard", "ordered"),
    object("card_firebolt", "firebolt", "zone_hand_p1", 0, "p1", ["spell"]),
    object("card_nova", "nova", "zone_hand_p1", 1, "p1", ["spell"]),
    object("card_coin_p2", "coin", "zone_hand_p2", 0, "p2", ["spell", "coin"]),
    ...(options.mirrorP2Hand
      ? [
          object("card_firebolt_p2", "firebolt", "zone_hand_p2", 1, "p2", ["spell"]),
          object("card_nova_p2", "nova", "zone_hand_p2", 2, "p2", ["spell"]),
          object("minion_loot_p2", "loot_minion", "zone_board_p2", 0, "p2", ["minion"]),
          object("weapon_axe_p2", "training_axe", "zone_weapon_p2", 0, "p2", ["weapon"], { durability: 2 })
        ]
      : []),
    object("minion_loot", "loot_minion", "zone_board_p1", 0, "p1", ["minion"]),
    object("weapon_axe_p1", "training_axe", "zone_weapon_p1", 0, "p1", ["weapon"], { durability: 2 }),
    object("card_reward", "reward", "zone_deck_p1", 0, "p1", ["spell"]),
    object("card_reward_p2", "reward", "zone_deck_p2", 0, "p2", ["spell"])
  ];
}

export const sampleDuelBehaviors: BehaviorLibrary = {
  behaviors: {
    firebolt: {
      id: "firebolt",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
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
        { type: "deal_damage", to: { selector: "target" }, amount: 3 },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    minion_attack: {
      id: "minion_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 1 },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    weapon_attack: {
      id: "weapon_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 2, damageType: "weapon" },
        { type: "adjust_object_counter", object: "self", counter: "durability", delta: -1, min: 0, reason: "weapon_attack" },
        { type: "destroy_object_if_counter_at_most", object: "self", counter: "durability", value: 0, toZoneId: "zone_discard", reason: "durability_zero" }
      ]
    },
    hero_focus: {
      id: "hero_focus",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "command_player", resource: "mana", amount: 2 }],
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "hero_power" }]
    },
    nova: {
      id: "nova",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "nova", anchor: "center" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      effects: [
        { type: "deal_damage_all_players", amount: 2 },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    coin: {
      id: "coin",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      effects: [
        { type: "adjust_resource", player: "controller", resource: "mana", delta: 1, reason: "coin" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    draw_or_fatigue: {
      id: "draw_or_fatigue",
      version: "0.1.0",
      kind: "ability",
      effects: [
        {
          type: "draw_cards",
          fromZoneId: { owner: "command_player", zoneType: "deck" },
          toZoneId: { owner: "command_player", zoneType: "hand" },
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
    },
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
          reason: "destroyed_in_combat"
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
          fromZoneId: { owner: "owner", zoneType: "deck" },
          toZoneId: { owner: "owner", zoneType: "hand" },
          count: 1
        }
      ]
    },
    mulligan_prompt: {
      id: "mulligan_prompt",
      version: "0.1.0",
      kind: "ability",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_mulligan_p1",
          responderIds: [{ id: "p1" }],
          promptType: "select_cards",
          responseMode: "single",
          payload: {
            zoneId: "zone_hand_p1",
            min: 0,
            max: 3
          }
        }
      ]
    },
    refresh_mana_p1: {
      id: "refresh_mana_p1",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "mana", current: 10, max: 10, reason: "phase_refresh" }]
    },
    open_main_prompt: {
      id: "open_main_prompt",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_main_{player}_{next_sequence}",
          responderIds: ["command_player"],
          promptType: "main_action",
          responseMode: "single",
          payload: {
            actions: ["play_card", "end_turn"]
          }
        }
      ]
    }
  }
};

export const sampleDuelPhaseGraph: PhaseGraphDefinition = {
  start: "turn_start",
  phases: [
    { id: "turn_start", next: "resource_refresh" },
    { id: "resource_refresh", entryBehaviors: ["refresh_mana_p1"], next: "draw" },
    { id: "draw", entryBehaviors: ["draw_or_fatigue"], next: "main" },
    { id: "main", entryBehaviors: ["open_main_prompt"], actionWindow: true, next: "turn_end" },
    { id: "turn_end" }
  ]
};
