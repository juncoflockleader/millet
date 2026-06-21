import type { BehaviorLibrary, ContentLock, MatchEvent, PhaseGraphDefinition } from "../../engine-core/src/index.ts";

function visibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

interface ManaClashSetupOptions {
  p1Health?: number;
  p2Health?: number;
  p1Mana?: number;
  p2Mana?: number;
  contentLock?: ContentLock;
  mirrorP2Hand?: boolean;
}

export function createSampleManaClashSetupEvents(options: ManaClashSetupOptions = {}): MatchEvent[] {
  const p1Health = options.p1Health ?? 20;
  const p2Health = options.p2Health ?? 20;
  const p1Mana = options.p1Mana ?? 0;
  const p2Mana = options.p2Mana ?? 0;
  let sequence = 0;

  function event(type: string, payload: unknown): MatchEvent {
    sequence += 1;
    return {
      id: `evt_${sequence}`,
      matchId: "mana_clash_match",
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
        visibility: ownerId && zoneType !== "land" && zoneType !== "board" ? { kind: "owner" } : { kind: "public" },
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
    ownerId: "p1" | "p2",
    tags: string[] = [],
    stats: Record<string, number> = {},
    exhausted = false
  ) {
    const onBattlefield = zoneId.includes("_board_");
    const objectType = onBattlefield && tags.includes("creature") ? "minion" : "card";
    const objectStats = { ...stats };
    if (objectType === "minion" && typeof objectStats.health === "number" && typeof objectStats.maxHealth !== "number") {
      objectStats.maxHealth = objectStats.health;
    }

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
        visibility: zoneId.includes("_board_") || zoneId.includes("_land_") ? { kind: "public" } : { kind: "owner" },
        stats: objectStats,
        counters: {},
        tags,
        keywords: [],
        attachments: [],
        modifiers: [],
        exhausted,
        createdAtSequence: sequence + 1,
        lastChangedAtSequence: sequence + 1
      }
    });
  }

  function openingHand(playerId: "p1" | "p2", mirror = false): MatchEvent[] {
    const handZoneId = `zone_hand_${playerId}`;
    return [
      object(`card_verdant_land_${playerId}`, "verdant_land", handZoneId, 0, playerId, ["land"]),
      object(`card_ember_land_${playerId}`, "ember_land", handZoneId, 1, playerId, ["land"]),
      object(`card_river_bear_${playerId}`, "river_bear", handZoneId, 2, playerId, ["creature"]),
      object(`card_cinder_bolt_${playerId}`, "cinder_bolt", handZoneId, 3, playerId, ["spell"]),
      ...(mirror ? [object(`card_sky_drake_${playerId}`, "sky_drake", handZoneId, 4, playerId, ["creature", "flying"])] : [])
    ];
  }

  return [
    event("match_initialized", {
      matchId: "mana_clash_match",
      gameDefinitionId: "sample-mana-clash",
      gameDefinitionVersion: "0.1.0",
      seed: "sample-mana-clash-seed",
      contentLock: options.contentLock ?? {
        gameDefinition: {
          id: "sample-mana-clash",
          version: "0.1.0",
          contentHash: "sha256:sample-mana-clash-dev"
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
          health: { current: p1Health, max: 20 },
          mana: { current: p1Mana, max: 99 },
          landDrop: { current: 1, max: 1 },
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
          health: { current: p2Health, max: 20 },
          mana: { current: p2Mana, max: 99 },
          landDrop: { current: 1, max: 1 },
          fatigue: { current: 0 }
        }
      }
    }),
    zone("zone_hand_p1", "p1", "hand", "ordered"),
    zone("zone_deck_p1", "p1", "deck", "hidden_ordered"),
    zone("zone_board_p1", "p1", "board", "ordered", 7),
    zone("zone_land_p1", "p1", "land", "ordered"),
    zone("zone_hand_p2", "p2", "hand", "ordered"),
    zone("zone_deck_p2", "p2", "deck", "hidden_ordered"),
    zone("zone_board_p2", "p2", "board", "ordered", 7),
    zone("zone_land_p2", "p2", "land", "ordered"),
    zone("zone_discard", undefined, "discard", "ordered"),
    zone("zone_graveyard", undefined, "graveyard", "ordered"),
    ...openingHand("p1", true),
    ...openingHand("p2", options.mirrorP2Hand === true),
    object("minion_briar_guard_p2", "briar_guard", "zone_board_p2", 0, "p2", ["creature"], { attack: 2, health: 2 }),
    object("card_growth_charm_p1", "growth_charm", "zone_deck_p1", 0, "p1", ["spell"]),
    object("card_sky_drake_draw_p2", "sky_drake", "zone_deck_p2", 0, "p2", ["creature", "flying"])
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

const enemyCreatureSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" as const }
  }
];

const friendlyCreatureSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "controller" as const }
  }
];

export const sampleManaClashBehaviors: BehaviorLibrary = {
  behaviors: {
    play_land: {
      id: "play_land",
      version: "0.1.0",
      kind: "card",
      conditions: [{ type: "resource_at_least", player: "controller", resource: "landDrop", amount: 1 }],
      costs: [{ type: "spend_resource", player: "controller", resource: "landDrop", amount: 1 }],
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "land" },
          fromZoneType: "hand",
          objectType: "card",
          visibility: { kind: "public" },
          tags: ["land"],
          exhausted: false,
          reason: "played_land"
        }
      ]
    },
    tap_land_for_mana: {
      id: "tap_land_for_mana",
      version: "0.1.0",
      kind: "ability",
      conditions: [{ type: "object_ready", object: "self" }],
      effects: [
        { type: "adjust_resource", player: "controller", resource: "mana", delta: 1, min: 0, max: 99, reason: "tap_land" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "tap_land" }
      ]
    },
    play_river_bear: {
      id: "play_river_bear",
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
          stats: { attack: 2, health: 3, maxHealth: 3 },
          tags: ["creature"],
          exhausted: true,
          reason: "summoned_creature"
        }
      ]
    },
    play_sky_drake: {
      id: "play_sky_drake",
      version: "0.1.0",
      kind: "card",
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 3, health: 2, maxHealth: 2 },
          tags: ["creature", "flying"],
          keywords: ["flying"],
          exhausted: true,
          reason: "summoned_creature"
        }
      ]
    },
    cinder_bolt_hero: {
      id: "cinder_bolt_hero",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 3, damageType: "spell" },
        { type: "move_card", object: "self", toZoneId: "zone_graveyard" }
      ]
    },
    cinder_bolt_creature: {
      id: "cinder_bolt_creature",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyCreatureSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: 3, toZoneId: "zone_graveyard", damageType: "spell" },
        { type: "move_card", object: "self", toZoneId: "zone_graveyard" }
      ]
    },
    growth_charm: {
      id: "growth_charm",
      version: "0.1.0",
      kind: "card",
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: friendlyCreatureSelector,
      effects: [
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "attack", delta: 1, reason: "growth_charm" },
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "health", delta: 1, reason: "growth_charm" },
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "maxHealth", delta: 1, reason: "growth_charm" },
        { type: "move_card", object: "self", toZoneId: "zone_graveyard" }
      ]
    },
    creature_attack_hero: {
      id: "creature_attack_hero",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: enemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "combat" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    creature_fight_creature: {
      id: "creature_fight_creature",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: enemyCreatureSelector,
      effects: [
        {
          type: "deal_damage_to_object",
          to: { selector: "target" },
          amount: { source: "object_stat", object: "self", stat: "attack" },
          toZoneId: "zone_graveyard",
          damageType: "combat"
        },
        {
          type: "deal_damage_to_object",
          to: "self",
          amount: { source: "object_stat", object: { selector: "target" }, stat: "attack" },
          toZoneId: "zone_graveyard",
          damageType: "combat"
        },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    mana_clash_draw_or_fatigue: {
      id: "mana_clash_draw_or_fatigue",
      version: "0.1.0",
      kind: "ability",
      effects: [
        {
          type: "draw_cards",
          fromZoneId: { owner: "command_player", zoneType: "deck" },
          toZoneId: { owner: "command_player", zoneType: "hand" },
          count: 1,
          emptyDeck: { mode: "damage_player", player: "command_player", counter: "fatigue", startAt: 1, incrementBy: 1 }
        }
      ]
    },
    refresh_mana_clash_turn: {
      id: "refresh_mana_clash_turn",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        { type: "set_resource", player: "command_player", resource: "mana", current: 0, max: 99, reason: "phase_refresh" },
        { type: "set_resource", player: "command_player", resource: "landDrop", current: 1, max: 1, reason: "phase_refresh" },
        {
          type: "set_object_exhausted_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player" },
          exhausted: false,
          reason: "untap_creatures"
        },
        {
          type: "set_object_exhausted_on_matching_objects",
          match: { zoneType: "land", zoneOwner: "command_player" },
          exhausted: false,
          reason: "untap_lands"
        }
      ]
    },
    open_mana_clash_main_prompt: {
      id: "open_mana_clash_main_prompt",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_mana_clash_main_{player}_{next_sequence}",
          responderIds: ["command_player"],
          promptType: "main_action",
          responseMode: "single",
          payload: { actions: ["play_land", "tap_land", "summon_creature", "cast_spell", "attack", "end_turn"] }
        }
      ]
    }
  }
};

export const sampleManaClashPhaseGraph: PhaseGraphDefinition = {
  start: "turn_start",
  phases: [
    { id: "turn_start", next: "refresh" },
    { id: "refresh", entryBehaviors: ["refresh_mana_clash_turn"], next: "draw" },
    { id: "draw", entryBehaviors: ["mana_clash_draw_or_fatigue"], next: "main" },
    { id: "main", entryBehaviors: ["open_mana_clash_main_prompt"], actionWindow: true, next: "turn_end" },
    { id: "turn_end" }
  ]
};
