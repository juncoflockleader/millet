import type { BehaviorLibrary, ContentLock, MatchEvent, PhaseGraphDefinition } from "../../engine-core/src/index.ts";

function visibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

interface RuneDuelSetupOptions {
  p1Health?: number;
  p2Health?: number;
  p1Mana?: number;
  p2Mana?: number;
  contentLock?: ContentLock;
  mirrorP2Hand?: boolean;
}

export function createSampleRuneDuelSetupEvents(options: RuneDuelSetupOptions = {}): MatchEvent[] {
  const p1Health = options.p1Health ?? 12;
  const p2Health = options.p2Health ?? 12;
  const p1Mana = options.p1Mana ?? 4;
  const p2Mana = options.p2Mana ?? 4;
  let sequence = 0;

  function event(type: string, payload: unknown): MatchEvent {
    sequence += 1;
    return {
      id: `evt_${sequence}`,
      matchId: "rune_duel_match",
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
    const objectType = tags.includes("minion") ? "minion" : tags.includes("weapon") ? "equipment" : "card";
    return event("object_created", {
      object: {
        id,
        templateId,
        objectType,
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
      matchId: "rune_duel_match",
      gameDefinitionId: "sample-rune-duel",
      gameDefinitionVersion: "0.1.0",
      seed: "sample-rune-duel-seed",
      contentLock: options.contentLock ?? {
        gameDefinition: {
          id: "sample-rune-duel",
          version: "0.1.0",
          contentHash: "sha256:sample-rune-duel-dev"
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
          health: { current: p1Health, max: 12 },
          mana: { current: p1Mana, max: 4 },
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
          health: { current: p2Health, max: 12 },
          mana: { current: p2Mana, max: 4 },
          fatigue: { current: 0 }
        }
      }
    }),
    zone("zone_hand_p1", "p1", "hand", "ordered"),
    zone("zone_deck_p1", "p1", "deck", "hidden_ordered"),
    zone("zone_board_p1", "p1", "board", "ordered", 5),
    zone("zone_weapon_p1", "p1", "weapon", "ordered", 1),
    zone("zone_hand_p2", "p2", "hand", "ordered"),
    zone("zone_deck_p2", "p2", "deck", "hidden_ordered"),
    zone("zone_board_p2", "p2", "board", "ordered", 5),
    zone("zone_weapon_p2", "p2", "weapon", "ordered", 1),
    zone("zone_discard", undefined, "discard", "ordered"),
    zone("zone_graveyard", undefined, "graveyard", "ordered"),
    object("card_rune_dart", "rune_dart", "zone_hand_p1", 0, "p1", ["spell"]),
    object("card_chain_flash", "chain_flash", "zone_hand_p1", 1, "p1", ["spell"]),
    object("card_focus_crystal_p2", "focus_crystal", "zone_hand_p2", 0, "p2", ["spell", "resource"]),
    ...(options.mirrorP2Hand
      ? [
          object("card_rune_dart_p2", "rune_dart", "zone_hand_p2", 1, "p2", ["spell"]),
          object("card_chain_flash_p2", "chain_flash", "zone_hand_p2", 2, "p2", ["spell"]),
          object("minion_glyph_runner_p2", "glyph_runner", "zone_board_p2", 0, "p2", ["minion"]),
          object("weapon_dueling_staff_p2", "dueling_staff", "zone_weapon_p2", 0, "p2", ["weapon"], { durability: 1 })
        ]
      : []),
    object("minion_glyph_runner", "glyph_runner", "zone_board_p1", 0, "p1", ["minion"]),
    object("weapon_dueling_staff_p1", "dueling_staff", "zone_weapon_p1", 0, "p1", ["weapon"], { durability: 1 }),
    object("card_echo_rune", "echo_rune", "zone_deck_p1", 0, "p1", ["spell"]),
    object("card_echo_rune_p2", "echo_rune", "zone_deck_p2", 0, "p2", ["spell"])
  ];
}

const enemyHeroSelector = [
  {
    id: "target",
    from: "players" as const,
    count: { min: 1, max: 1 },
    match: { status: "alive" as const, notSelf: true }
  }
];

export const sampleRuneDuelBehaviors: BehaviorLibrary = {
  behaviors: {
    rune_dart: {
      id: "rune_dart",
      version: "0.1.0",
      kind: "card",
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 2, damageType: "rune" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    echo_rune: {
      id: "echo_rune",
      version: "0.1.0",
      kind: "card",
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 2, damageType: "rune" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    chain_flash: {
      id: "chain_flash",
      version: "0.1.0",
      kind: "card",
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      effects: [
        { type: "deal_damage_all_players", amount: 1, damageType: "chain" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    focus_crystal: {
      id: "focus_crystal",
      version: "0.1.0",
      kind: "card",
      effects: [
        { type: "adjust_resource", player: "controller", resource: "mana", delta: 1, reason: "focus_crystal" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    glyph_runner_attack: {
      id: "glyph_runner_attack",
      version: "0.1.0",
      kind: "ability",
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    dueling_staff_attack: {
      id: "dueling_staff_attack",
      version: "0.1.0",
      kind: "ability",
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 2, damageType: "weapon" },
        { type: "adjust_object_counter", object: "self", counter: "durability", delta: -1, min: 0, reason: "weapon_attack" },
        { type: "destroy_object_if_counter_at_most", object: "self", counter: "durability", value: 0, toZoneId: "zone_discard", reason: "durability_zero" }
      ]
    },
    sigil_ping: {
      id: "sigil_ping",
      version: "0.1.0",
      kind: "ability",
      costs: [{ type: "spend_resource", player: "command_player", resource: "mana", amount: 2 }],
      selectors: enemyHeroSelector,
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "hero_power" }]
    },
    rune_draw_or_fatigue: {
      id: "rune_draw_or_fatigue",
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
    refresh_rune_mana: {
      id: "refresh_rune_mana",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "mana", current: 4, max: 4, reason: "phase_refresh" }]
    },
    open_rune_main_prompt: {
      id: "open_rune_main_prompt",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_rune_main_{player}_{next_sequence}",
          responderIds: ["command_player"],
          promptType: "main_action",
          responseMode: "single",
          payload: {
            actions: ["play_card", "attack", "hero_ability", "end_turn"]
          }
        }
      ]
    }
  }
};

export const sampleRuneDuelPhaseGraph: PhaseGraphDefinition = {
  start: "turn_start",
  phases: [
    { id: "turn_start", next: "resource_refresh" },
    { id: "resource_refresh", entryBehaviors: ["refresh_rune_mana"], next: "draw" },
    { id: "draw", entryBehaviors: ["rune_draw_or_fatigue"], next: "main" },
    { id: "main", entryBehaviors: ["open_rune_main_prompt"], actionWindow: true, next: "turn_end" },
    { id: "turn_end" }
  ]
};
