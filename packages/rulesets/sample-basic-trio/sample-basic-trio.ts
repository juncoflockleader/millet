import type { BehaviorLibrary, ContentLock, MatchEvent, NumericValueDefinition, PhaseGraphDefinition } from "../../engine-core/src/index.ts";

export type BasicTrioClassId = "mage" | "warrior" | "priest";

function visibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

interface BasicTrioSetupOptions {
  p1Class?: BasicTrioClassId;
  p2Class?: BasicTrioClassId;
  p1Health?: number;
  p2Health?: number;
  p1Mana?: number;
  p2Mana?: number;
  contentLock?: ContentLock;
}

const CLASS_HERO_REFS: Record<BasicTrioClassId, string> = {
  mage: "hero_ember_scholar",
  warrior: "hero_iron_vanguard",
  priest: "hero_dawn_oracle"
};

export function createSampleBasicTrioSetupEvents(options: BasicTrioSetupOptions = {}): MatchEvent[] {
  const p1Class = options.p1Class ?? "mage";
  const p2Class = options.p2Class ?? "warrior";
  const p1Health = options.p1Health ?? 30;
  const p2Health = options.p2Health ?? 30;
  const p1Mana = options.p1Mana ?? 10;
  const p2Mana = options.p2Mana ?? 10;
  let sequence = 0;

  function event(type: string, payload: unknown): MatchEvent {
    sequence += 1;
    return {
      id: `evt_${sequence}`,
      matchId: "basic_trio_match",
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
    ownerId: "p1" | "p2",
    tags: string[] = [],
    counters: Record<string, number> = {},
    stats: Record<string, number> = {}
  ) {
    const objectType = tags.includes("minion") ? "minion" : tags.includes("weapon") ? "equipment" : "card";
    const objectStats = { ...stats };
    if (tags.includes("minion") && typeof objectStats.health === "number" && typeof objectStats.maxHealth !== "number") {
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
        visibility: zoneId.includes("_board_") || zoneId.includes("_weapon_") ? { kind: "public" } : { kind: "owner" },
        stats: objectStats,
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

  function classHand(playerId: "p1" | "p2", classId: BasicTrioClassId): MatchEvent[] {
    const handZoneId = `zone_hand_${playerId}`;
    if (classId === "mage") {
      return [
        object(`card_ember_lance_${playerId}`, "ember_lance", handZoneId, 0, playerId, ["spell", "class_mage"]),
        object(`card_study_scroll_${playerId}`, "study_scroll", handZoneId, 1, playerId, ["spell", "class_mage"]),
        object(`card_mirror_guard_${playerId}`, "mirror_guard", handZoneId, 2, playerId, ["spell", "class_mage", "summon"]),
        object(`card_frost_pin_${playerId}`, "frost_pin", handZoneId, 3, playerId, ["spell", "class_mage"]),
        object(`card_ember_wave_${playerId}`, "ember_wave", handZoneId, 4, playerId, ["spell", "class_mage", "area"]),
        object(`card_cinder_sparks_${playerId}`, "cinder_sparks", handZoneId, 5, playerId, ["spell", "class_mage", "random"]),
        object(`card_null_form_${playerId}`, "null_form", handZoneId, 6, playerId, ["spell", "class_mage", "transform"]),
        object(`card_winter_stasis_${playerId}`, "winter_stasis", handZoneId, 7, playerId, ["spell", "class_mage", "freeze", "area"]),
        object(`card_ember_column_${playerId}`, "ember_column", handZoneId, 8, playerId, ["spell", "class_mage", "area"]),
        object(`card_glacier_warden_${playerId}`, "glacier_warden", handZoneId, 9, playerId, ["class_mage", "minion_card", "freeze"]),
        object(`card_spark_adept_${playerId}`, "spark_adept", handZoneId, 10, playerId, ["neutral", "minion_card", "spell_power"]),
        object(`card_needle_scout_${playerId}`, "needle_scout", handZoneId, 11, playerId, ["neutral", "minion_card", "battlecry"])
      ];
    }
    if (classId === "warrior") {
      return [
        object(`card_guard_stance_${playerId}`, "guard_stance", handZoneId, 0, playerId, ["spell", "class_warrior"]),
        object(`card_ring_sweep_${playerId}`, "ring_sweep", handZoneId, 1, playerId, ["spell", "class_warrior", "area"]),
        object(`card_split_strike_${playerId}`, "split_strike", handZoneId, 2, playerId, ["spell", "class_warrior", "random"]),
        object(`card_battle_edict_${playerId}`, "battle_edict", handZoneId, 3, playerId, ["spell", "class_warrior", "destroy"]),
        object(`card_battle_rush_${playerId}`, "battle_rush", handZoneId, 4, playerId, ["spell", "class_warrior", "buff", "charge"]),
        object(`card_heavy_reaper_${playerId}`, "heavy_reaper", handZoneId, 5, playerId, ["weapon", "class_warrior"], { durability: 2 }, { attack: 5 }),
        object(`card_storm_runner_${playerId}`, "storm_runner", handZoneId, 6, playerId, ["class_warrior", "minion_card", "charge"]),
        object(`card_battle_focus_${playerId}`, "battle_focus", handZoneId, 7, playerId, ["spell", "class_warrior", "hero_attack"]),
        object(`card_war_drummer_${playerId}`, "war_drummer", handZoneId, 8, playerId, ["class_warrior", "minion_card", "aura"]),
        object(`card_banner_captain_${playerId}`, "banner_captain", handZoneId, 9, playerId, ["neutral", "minion_card", "attack_aura", "aura"]),
        object(`card_line_recruit_${playerId}`, "river_guard", handZoneId, 10, playerId, ["neutral", "minion_card"]),
        object(`weapon_forge_axe_${playerId}`, "forge_axe", `zone_weapon_${playerId}`, 0, playerId, ["weapon", "class_warrior"], { durability: 2 }, { attack: 3 })
      ];
    }
    return [
      object(`card_dawn_smite_${playerId}`, "dawn_smite", handZoneId, 0, playerId, ["spell", "class_priest"]),
      object(`card_mind_spark_${playerId}`, "mind_spark", handZoneId, 1, playerId, ["spell", "class_priest"]),
      object(`card_mind_glimpse_${playerId}`, "mind_glimpse", handZoneId, 2, playerId, ["spell", "class_priest", "copy"]),
      object(`card_dawn_cleric_${playerId}`, "dawn_cleric", handZoneId, 3, playerId, ["class_priest", "minion_card"]),
      object(`card_aegis_word_${playerId}`, "aegis_word", handZoneId, 4, playerId, ["spell", "class_priest", "buff", "draw"]),
      object(`card_spirit_echo_${playerId}`, "spirit_echo", handZoneId, 5, playerId, ["spell", "class_priest", "buff"]),
      object(`card_holy_bloom_${playerId}`, "holy_bloom", handZoneId, 6, playerId, ["spell", "class_priest", "area", "heal"]),
      object(`card_borrowed_command_${playerId}`, "borrowed_command", handZoneId, 7, playerId, ["spell", "class_priest", "control"]),
      object(`card_quiet_verdict_${playerId}`, "quiet_verdict", handZoneId, 8, playerId, ["spell", "class_priest", "destroy"]),
      object(`card_final_verdict_${playerId}`, "final_verdict", handZoneId, 9, playerId, ["spell", "class_priest", "destroy"])
    ];
  }

  return [
    event("match_initialized", {
      matchId: "basic_trio_match",
      gameDefinitionId: "sample-basic-trio",
      gameDefinitionVersion: "0.1.0",
      seed: "sample-basic-trio-seed",
      contentLock: options.contentLock ?? {
        gameDefinition: {
          id: "sample-basic-trio",
          version: "0.1.0",
          contentHash: "sha256:sample-basic-trio-dev"
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
        heroRef: CLASS_HERO_REFS[p1Class],
        resources: {
          health: { current: p1Health, max: 30 },
          mana: { current: p1Mana, max: 10 },
          armor: { current: 0 },
          heroAttack: { current: 0 },
          heroFrozen: { current: 0 },
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
        heroRef: CLASS_HERO_REFS[p2Class],
        resources: {
          health: { current: p2Health, max: 30 },
          mana: { current: p2Mana, max: 10 },
          armor: { current: 0 },
          heroAttack: { current: 0 },
          heroFrozen: { current: 0 },
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
    ...classHand("p1", p1Class),
    ...classHand("p2", p2Class),
    object("minion_river_guard_p1", "river_guard", "zone_board_p1", 0, "p1", ["minion", "neutral"], {}, { attack: 2, health: 3 }),
    object("minion_arena_ogre_p2", "arena_ogre", "zone_board_p2", 0, "p2", ["minion", "neutral"], {}, { attack: 6, health: 7 }),
    object("card_river_guard_draw_p1", "river_guard", "zone_deck_p1", 0, "p1", ["neutral"]),
    object("card_river_guard_draw_p2", "river_guard", "zone_deck_p2", 0, "p2", ["neutral"])
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

const enemyPlayerSelector = [
  {
    id: "target",
    from: "players" as const,
    count: { min: 1, max: 1 },
    match: { status: "alive" as const, notSelf: true }
  }
];

const guardedEnemyHeroSelector = [
  {
    id: "target",
    from: "players" as const,
    count: { min: 1, max: 1 },
    match: { status: "alive" as const, notSelf: true, guardedBy: { tags: ["taunt"], zoneType: "board" } }
  }
];

const guardedEnemyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: {
      objectTypes: ["minion"],
      zoneType: "board",
      zoneOwnerNot: "controller" as const,
      guardedBy: { tags: ["taunt"], zoneType: "board" }
    }
  }
];

const enemyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" as const }
  }
];

const friendlyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "controller" as const }
  }
];

const damagedEnemyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: {
      objectTypes: ["minion"],
      zoneType: "board",
      zoneOwnerNot: "controller" as const,
      stats: { health: { lessThanStat: "maxHealth" } }
    }
  }
];

const anyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board" }
  }
];

function weaponPlusHeroAttackValue(): NumericValueDefinition {
  return {
    source: "sum",
    values: [
      { source: "object_stat", object: "self", stat: "attack" },
      { source: "player_resource", player: "command_player", resource: "heroAttack" }
    ]
  };
}

const lowAttackEnemyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" as const, stats: { attack: { max: 3 } } }
  }
];

const highAttackEnemyMinionSelector = [
  {
    id: "target",
    from: "objects" as const,
    count: { min: 1, max: 1 },
    match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" as const, stats: { attack: { min: 5 } } }
  }
];

function spellDamageValue(base: number) {
  return {
    source: "matching_object_stat_sum" as const,
    base,
    stat: "spellPower",
    match: { objectTypes: ["minion"], zoneType: "board", controller: "controller" as const }
  };
}

export const sampleBasicTrioBehaviors: BehaviorLibrary = {
  statModifiers: [
    {
      id: "banner_captain_attack_aura",
      stat: "attack",
      delta: 1,
      source: { objectTypes: ["minion"], zoneType: "board", tags: ["attack_aura"] },
      target: { objectTypes: ["minion"], zoneType: "board", controller: "controller" }
    }
  ],
  behaviors: {
    ember_lance: {
      id: "ember_lance",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 4 }],
      selectors: enemyHeroSelector,
      text: { template: "Deal 6 damage to the enemy hero. Move this card." },
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: spellDamageValue(6), damageType: "spell" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    ember_lance_minion: {
      id: "ember_lance_minion",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 4 }],
      selectors: enemyMinionSelector,
      text: { template: "Deal 6 damage to an enemy minion. Move this card." },
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: spellDamageValue(6), toZoneId: "zone_discard", damageType: "spell" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    study_scroll: {
      id: "study_scroll",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      text: { template: "Draw 2 cards. Move this card." },
      effects: [
        {
          type: "draw_cards",
          fromZoneId: { owner: "controller", zoneType: "deck" },
          toZoneId: { owner: "controller", zoneType: "hand" },
          count: 2,
          emptyDeck: { mode: "damage_player", player: "controller", counter: "fatigue", startAt: 1, incrementBy: 1 }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    mirror_guard: {
      id: "mirror_guard",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      text: { template: "Summon two 0/2 Mirror Guards with Taunt. Move this card." },
      effects: [
        {
          type: "create_object",
          toZoneId: { owner: "controller", zoneType: "board" },
          object: {
            id: "token_mirror_guard_a_{player}_{next_sequence}",
            templateId: "mirror_guard_token",
            objectType: "minion",
            tags: ["minion", "taunt", "token"],
            keywords: ["taunt"],
            stats: { attack: 0, health: 2, maxHealth: 2 },
            exhausted: true
          }
        },
        {
          type: "create_object",
          toZoneId: { owner: "controller", zoneType: "board" },
          object: {
            id: "token_mirror_guard_b_{player}_{next_sequence}",
            templateId: "mirror_guard_token",
            objectType: "minion",
            tags: ["minion", "taunt", "token"],
            keywords: ["taunt"],
            stats: { attack: 0, health: 2, maxHealth: 2 },
            exhausted: true
          }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    frost_pin: {
      id: "frost_pin",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      selectors: enemyMinionSelector,
      text: { template: "Deal 3 damage to an enemy minion and Freeze it. Move this card." },
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: spellDamageValue(3), toZoneId: "zone_discard", damageType: "frost" },
        { type: "set_object_keyword", object: { selector: "target" }, keyword: "frozen", present: true, reason: "freeze" },
        { type: "set_object_exhausted", object: { selector: "target" }, exhausted: true, reason: "freeze" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    frost_pin_hero: {
      id: "frost_pin_hero",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      selectors: enemyHeroSelector,
      text: { template: "Deal 3 damage to an enemy hero and Freeze it. Move this card." },
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: spellDamageValue(3), damageType: "frost" },
        { type: "set_resource", player: { selector: "target" }, resource: "heroFrozen", current: 1, reason: "freeze" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    null_form: {
      id: "null_form",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 4 }],
      selectors: enemyMinionSelector,
      text: { template: "Transform an enemy minion into a 1/1 Training Spark. Move this card." },
      effects: [
        {
          type: "transform_object",
          object: { selector: "target" },
          templateId: "training_spark",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 1, health: 1, maxHealth: 1 },
          counters: {},
          tags: ["minion", "neutral", "transformed"],
          keywords: [],
          attachments: [],
          modifiers: [],
          exhausted: true,
          reason: "null_form"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    ember_wave: {
      id: "ember_wave",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      text: { template: "Deal 1 damage to all enemy minions. Move this card." },
      effects: [
        {
          type: "deal_damage_to_matching_objects",
          amount: spellDamageValue(1),
          damageType: "area_spell",
          toZoneId: "zone_discard",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    cinder_sparks: {
      id: "cinder_sparks",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      text: { template: "Deal 1 damage three times to random enemies. Move this card." },
      effects: [
        {
          type: "deal_damage_to_random_targets",
          count: spellDamageValue(3),
          amount: 1,
          damageType: "random_spell",
          toZoneId: "zone_discard",
          targetPool: {
            players: { status: "alive", notSelf: true },
            objects: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
          },
          reason: "cinder_sparks"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    winter_stasis: {
      id: "winter_stasis",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      text: { template: "Freeze all enemy minions. Move this card." },
      effects: [
        {
          type: "set_object_keyword_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" },
          keyword: "frozen",
          present: true,
          reason: "winter_stasis"
        },
        {
          type: "set_object_exhausted_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" },
          exhausted: true,
          reason: "winter_stasis"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    ember_column: {
      id: "ember_column",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 7 }],
      text: { template: "Deal 4 damage to all enemy minions. Move this card." },
      effects: [
        {
          type: "deal_damage_to_matching_objects",
          amount: spellDamageValue(4),
          damageType: "area_spell",
          toZoneId: "zone_discard",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    ember_ping: {
      id: "ember_ping",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "command_player", resource: "mana", amount: 2 }],
      selectors: enemyHeroSelector,
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "hero_power" }]
    },
    play_glacier_warden: {
      id: "play_glacier_warden",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 4 }],
      text: { template: "Play a 3/6 minion. Its attack freezes damaged characters." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 3, health: 6, maxHealth: 6 },
          tags: ["minion", "class_mage", "freeze"],
          exhausted: true,
          reason: "played_from_hand"
        }
      ]
    },
    glacier_warden_attack: {
      id: "glacier_warden_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "minion" },
        { type: "set_resource", player: { selector: "target" }, resource: "heroFrozen", current: 1, reason: "glacier_warden" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    glacier_warden_attack_minion: {
      id: "glacier_warden_attack_minion",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyMinionSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, toZoneId: "zone_discard", damageType: "minion" },
        { type: "set_object_keyword", object: { selector: "target" }, keyword: "frozen", present: true, reason: "glacier_warden" },
        { type: "set_object_exhausted", object: { selector: "target" }, exhausted: true, reason: "glacier_warden" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    forge_axe_attack: {
      id: "forge_axe_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "resource_at_most", player: "command_player", resource: "heroFrozen", amount: 0 }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: weaponPlusHeroAttackValue(), damageType: "weapon" },
        { type: "execute_behavior_if_resource", player: "command_player", resource: "heroAttack", atLeast: 1, behaviorId: "clear_basic_trio_hero_attack" },
        { type: "adjust_object_counter", object: "self", counter: "durability", delta: -1, min: 0, reason: "weapon_attack" },
        { type: "destroy_object_if_counter_at_most", object: "self", counter: "durability", value: 0, toZoneId: "zone_discard", reason: "durability_zero" }
      ]
    },
    equip_heavy_reaper: {
      id: "equip_heavy_reaper",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 5 }],
      text: { template: "Equip a 5/2 Heavy Reaper." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "weapon" },
          fromZoneType: "hand",
          replaceExisting: true,
          discardZoneId: "zone_discard",
          objectType: "equipment",
          visibility: { kind: "public" },
          stats: { attack: 5 },
          counters: { durability: 2 },
          tags: ["weapon", "class_warrior"],
          reason: "equipped_from_hand"
        }
      ]
    },
    heavy_reaper_attack: {
      id: "heavy_reaper_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "resource_at_most", player: "command_player", resource: "heroFrozen", amount: 0 }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: weaponPlusHeroAttackValue(), damageType: "weapon" },
        { type: "execute_behavior_if_resource", player: "command_player", resource: "heroAttack", atLeast: 1, behaviorId: "clear_basic_trio_hero_attack" },
        { type: "adjust_object_counter", object: "self", counter: "durability", delta: -1, min: 0, reason: "weapon_attack" },
        { type: "destroy_object_if_counter_at_most", object: "self", counter: "durability", value: 0, toZoneId: "zone_discard", reason: "durability_zero" }
      ]
    },
    battle_rush: {
      id: "battle_rush",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      selectors: friendlyMinionSelector,
      text: { template: "Give a friendly minion +2 Attack and ready it. Move this card." },
      effects: [
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "attack", delta: 2, reason: "battle_rush" },
        { type: "set_object_keyword", object: { selector: "target" }, keyword: "battle_rush_temp", present: true, reason: "battle_rush" },
        { type: "set_object_exhausted", object: { selector: "target" }, exhausted: false, reason: "battle_rush" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    battle_focus: {
      id: "battle_focus",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      text: { template: "Give your hero +4 Attack this turn. Move this card." },
      effects: [
        { type: "adjust_resource", player: "controller", resource: "heroAttack", delta: 4, min: 0, reason: "battle_focus" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    battle_focus_attack: {
      id: "battle_focus_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [
        { type: "resource_at_least", player: "command_player", resource: "heroAttack", amount: 1 },
        { type: "resource_at_most", player: "command_player", resource: "heroFrozen", amount: 0 }
      ],
      selectors: guardedEnemyHeroSelector,
      effects: [
        {
          type: "deal_damage",
          to: { selector: "target" },
          amount: { source: "player_resource", player: "command_player", resource: "heroAttack" },
          damageType: "hero_attack"
        },
        { type: "set_resource", player: "command_player", resource: "heroAttack", current: 0, reason: "hero_attack_spent" }
      ]
    },
    play_storm_runner: {
      id: "play_storm_runner",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 4 }],
      text: { template: "Play a ready 4/3 minion." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 4, health: 3, maxHealth: 3 },
          tags: ["minion", "class_warrior", "charge"],
          exhausted: false,
          reason: "played_from_hand"
        }
      ]
    },
    play_war_drummer: {
      id: "play_war_drummer",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      text: { template: "Play a 2/3 minion. After you play a minion with 3 or less Attack, ready it." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 2, health: 3, maxHealth: 3 },
          tags: ["minion", "class_warrior", "aura"],
          exhausted: true,
          reason: "played_from_hand"
        },
        {
          type: "register_trigger",
          source: "self",
          behaviorId: "war_drummer_ready_small_minion",
          eventType: "object_played",
          priority: 10
        }
      ]
    },
    play_banner_captain: {
      id: "play_banner_captain",
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
          stats: { attack: 2, health: 2, maxHealth: 2 },
          tags: ["minion", "neutral", "attack_aura", "aura"],
          exhausted: true,
          reason: "played_from_hand"
        }
      ]
    },
    war_drummer_ready_small_minion: {
      id: "war_drummer_ready_small_minion",
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
        { type: "set_object_exhausted", object: "event_object", exhausted: false, reason: "war_drummer" },
        { type: "set_object_keyword", object: "event_object", keyword: "charge", present: true, reason: "war_drummer" }
      ]
    },
    storm_runner_attack: {
      id: "storm_runner_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    storm_runner_attack_minion: {
      id: "storm_runner_attack_minion",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyMinionSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, toZoneId: "zone_discard", damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    guard_stance: {
      id: "guard_stance",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      text: { template: "Gain 5 armor. Draw a card. Move this card." },
      effects: [
        { type: "adjust_resource", player: "controller", resource: "armor", delta: 5, min: 0, reason: "guard_stance" },
        {
          type: "draw_cards",
          fromZoneId: { owner: "controller", zoneType: "deck" },
          toZoneId: { owner: "controller", zoneType: "hand" },
          count: 1,
          emptyDeck: { mode: "damage_player", player: "controller", counter: "fatigue", startAt: 1, incrementBy: 1 }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    ring_sweep: {
      id: "ring_sweep",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      text: { template: "Deal 1 damage to all minions. Move this card." },
      effects: [
        {
          type: "deal_damage_to_matching_objects",
          amount: 1,
          damageType: "area_weapon",
          toZoneId: "zone_discard",
          match: { objectTypes: ["minion"], zoneType: "board" }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    split_strike: {
      id: "split_strike",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      text: { template: "Deal 2 damage to two random enemy minions. Move this card." },
      effects: [
        {
          type: "deal_damage_to_random_targets",
          count: 2,
          amount: 2,
          damageType: "split_strike",
          toZoneId: "zone_discard",
          withReplacement: false,
          requireAny: true,
          targetPool: {
            objects: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" }
          },
          reason: "split_strike"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    battle_edict: {
      id: "battle_edict",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: damagedEnemyMinionSelector,
      text: { template: "Destroy a damaged enemy minion. Move this card." },
      effects: [
        { type: "destroy_object", object: { selector: "target" }, toZoneId: "zone_discard", reason: "battle_edict" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    vanguard_armor: {
      id: "vanguard_armor",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "command_player", resource: "mana", amount: 2 }],
      effects: [{ type: "adjust_resource", player: "command_player", resource: "armor", delta: 2, min: 0, reason: "hero_power" }]
    },
    dawn_smite: {
      id: "dawn_smite",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyHeroSelector,
      text: { template: "Deal 2 damage to the enemy hero. Move this card." },
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 2, damageType: "holy" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    mind_spark: {
      id: "mind_spark",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "firebolt", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      selectors: enemyHeroSelector,
      text: { template: "Deal 5 damage to the enemy hero. Move this card." },
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: 5, damageType: "mind" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    mind_glimpse: {
      id: "mind_glimpse",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyPlayerSelector,
      text: { template: "Copy a random card from the enemy hand into your hand. Move this card." },
      effects: [
        {
          type: "copy_random_object_from_zone",
          fromZoneId: { owner: { selector: "target" }, zoneType: "hand" },
          toZoneId: { owner: "controller", zoneType: "hand" },
          objectId: "copy_mind_glimpse_{player}_{next_sequence}",
          match: { objectTypes: ["card"], zoneType: "hand" },
          owner: "controller",
          controller: "controller",
          reason: "mind_glimpse"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    play_dawn_cleric: {
      id: "play_dawn_cleric",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      text: { template: "Play a 1/3 minion. Whenever a minion is healed, draw a card." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 1, health: 3, maxHealth: 3 },
          tags: ["minion", "class_priest"],
          exhausted: true,
          battlecryBehaviorId: "dawn_cleric_register",
          reason: "played_from_hand"
        }
      ]
    },
    dawn_cleric_register: {
      id: "dawn_cleric_register",
      version: "0.1.0",
      kind: "ability",
      effects: [
        {
          type: "register_trigger",
          source: "self",
          behaviorId: "dawn_cleric_heal_draw",
          eventType: "object_stat_changed",
          once: false
        }
      ]
    },
    dawn_cleric_heal_draw: {
      id: "dawn_cleric_heal_draw",
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
          fromZoneId: { owner: "controller", zoneType: "deck" },
          toZoneId: { owner: "controller", zoneType: "hand" },
          count: 1,
          emptyDeck: { mode: "damage_player", player: "controller", counter: "fatigue", startAt: 1, incrementBy: 1 }
        }
      ]
    },
    aegis_word: {
      id: "aegis_word",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: anyMinionSelector,
      text: { template: "Give a minion +2 Health. Draw a card. Move this card." },
      effects: [
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "maxHealth", delta: 2, reason: "aegis_word" },
        { type: "adjust_object_stat", object: { selector: "target" }, stat: "health", delta: 2, reason: "aegis_word" },
        {
          type: "draw_cards",
          fromZoneId: { owner: "controller", zoneType: "deck" },
          toZoneId: { owner: "controller", zoneType: "hand" },
          count: 1,
          emptyDeck: { mode: "damage_player", player: "controller", counter: "fatigue", startAt: 1, incrementBy: 1 }
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    spirit_echo: {
      id: "spirit_echo",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      selectors: anyMinionSelector,
      text: { template: "Double a minion's Health. Move this card." },
      effects: [
        {
          type: "set_object_stat",
          object: { selector: "target" },
          stat: "maxHealth",
          value: { source: "object_stat", object: { selector: "target" }, stat: "maxHealth", multiplier: 2 },
          reason: "spirit_echo"
        },
        {
          type: "set_object_stat",
          object: { selector: "target" },
          stat: "health",
          value: { source: "object_stat", object: { selector: "target" }, stat: "health", multiplier: 2 },
          reason: "spirit_echo"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    holy_bloom: {
      id: "holy_bloom",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 5 }],
      text: { template: "Deal 2 damage to all enemies. Restore 2 health to friendly characters. Move this card." },
      effects: [
        {
          type: "deal_damage_to_matching_players",
          match: { status: "alive", notSelf: true },
          amount: 2,
          damageType: "holy"
        },
        {
          type: "deal_damage_to_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwnerNot: "controller" },
          amount: 2,
          toZoneId: "zone_discard",
          damageType: "holy"
        },
        { type: "heal", player: "controller", amount: 2 },
        {
          type: "heal_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "controller" },
          amount: 2,
          reason: "heal"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    quiet_verdict: {
      id: "quiet_verdict",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      selectors: lowAttackEnemyMinionSelector,
      text: { template: "Destroy an enemy minion with 3 or less Attack. Move this card." },
      effects: [
        { type: "destroy_object", object: { selector: "target" }, toZoneId: "zone_discard", reason: "quiet_verdict" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    final_verdict: {
      id: "final_verdict",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 3 }],
      selectors: highAttackEnemyMinionSelector,
      text: { template: "Destroy an enemy minion with 5 or more Attack. Move this card." },
      effects: [
        { type: "destroy_object", object: { selector: "target" }, toZoneId: "zone_discard", reason: "final_verdict" },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    borrowed_command: {
      id: "borrowed_command",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 10 }],
      selectors: enemyMinionSelector,
      text: { template: "Take control of an enemy minion. It enters exhausted. Move this card." },
      effects: [
        {
          type: "change_object_control",
          object: { selector: "target" },
          controller: "controller",
          toZoneId: { owner: "controller", zoneType: "board" },
          exhausted: true,
          reason: "borrowed_command"
        },
        { type: "move_card", object: "self", toZoneId: "zone_discard" }
      ]
    },
    oracle_restore: {
      id: "oracle_restore",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "command_player", resource: "mana", amount: 2 }],
      effects: [{ type: "heal", player: "command_player", amount: 2 }]
    },
    river_guard_attack: {
      id: "river_guard_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    play_river_guard: {
      id: "play_river_guard",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      text: { template: "Play a 2/3 River Guard as an exhausted minion." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 2, health: 3, maxHealth: 3 },
          tags: ["minion", "neutral"],
          exhausted: true,
          reason: "played_from_hand"
        }
      ]
    },
    play_needle_scout: {
      id: "play_needle_scout",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 1 }],
      selectors: enemyMinionSelector,
      text: { template: "Play a 1/1 Needle Scout. Battlecry: Deal 1 damage to an enemy minion." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 1, health: 1, maxHealth: 1 },
          tags: ["minion", "neutral", "battlecry"],
          exhausted: true,
          battlecryBehaviorId: "needle_scout_battlecry",
          reason: "played_from_hand"
        }
      ]
    },
    needle_scout_battlecry: {
      id: "needle_scout_battlecry",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      selectors: enemyMinionSelector,
      effects: [
        {
          type: "deal_damage_to_object",
          to: { selector: "target" },
          amount: 1,
          toZoneId: "zone_discard",
          damageType: "battlecry"
        }
      ]
    },
    play_spark_adept: {
      id: "play_spark_adept",
      version: "0.1.0",
      kind: "card",
      ux: { visualEffect: { key: "coin", anchor: "player" } },
      costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
      text: { template: "Play a 2/2 minion with Spell Power +1." },
      effects: [
        {
          type: "play_object",
          object: "self",
          toZoneId: { owner: "controller", zoneType: "board" },
          fromZoneType: "hand",
          objectType: "minion",
          visibility: { kind: "public" },
          stats: { attack: 2, health: 2, maxHealth: 2, spellPower: 1 },
          tags: ["minion", "neutral", "spell_power"],
          keywords: ["spell_power"],
          exhausted: true,
          reason: "played_from_hand"
        }
      ]
    },
    river_guard_attack_minion: {
      id: "river_guard_attack_minion",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyMinionSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, toZoneId: "zone_discard", damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    training_spark_attack: {
      id: "training_spark_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    training_spark_attack_minion: {
      id: "training_spark_attack_minion",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyMinionSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, toZoneId: "zone_discard", damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    arena_ogre_attack: {
      id: "arena_ogre_attack",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyHeroSelector,
      effects: [
        { type: "deal_damage", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    arena_ogre_attack_minion: {
      id: "arena_ogre_attack_minion",
      version: "0.1.0",
      kind: "ability",
      ux: { visualEffect: { key: "attack", anchor: "opponent" } },
      conditions: [{ type: "object_ready", object: "self" }],
      selectors: guardedEnemyMinionSelector,
      effects: [
        { type: "deal_damage_to_object", to: { selector: "target" }, amount: { source: "object_stat", object: "self", stat: "attack" }, toZoneId: "zone_discard", damageType: "minion" },
        { type: "set_object_exhausted", object: "self", exhausted: true, reason: "attacked" }
      ]
    },
    basic_trio_draw_or_fatigue: {
      id: "basic_trio_draw_or_fatigue",
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
    refresh_basic_trio_mana: {
      id: "refresh_basic_trio_mana",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        { type: "set_resource", player: "command_player", resource: "mana", current: 10, max: 10, reason: "phase_refresh" },
        { type: "set_resource", player: "command_player", resource: "heroAttack", current: 0, reason: "phase_refresh" }
      ]
    },
    clear_basic_trio_hero_freeze: {
      id: "clear_basic_trio_hero_freeze",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "heroFrozen", current: 0, reason: "phase_cleanup" }]
    },
    clear_basic_trio_hero_attack: {
      id: "clear_basic_trio_hero_attack",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "heroAttack", current: 0, reason: "hero_attack_cleared" }]
    },
    expire_basic_trio_hero_attack: {
      id: "expire_basic_trio_hero_attack",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        { type: "execute_behavior_if_resource", player: "command_player", resource: "heroAttack", atLeast: 1, behaviorId: "clear_basic_trio_hero_attack" }
      ]
    },
    expire_basic_trio_battle_rush: {
      id: "expire_basic_trio_battle_rush",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "adjust_object_stat_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywords: ["battle_rush_temp"] },
          stat: "attack",
          delta: -2,
          min: 0,
          reason: "phase_cleanup"
        },
        {
          type: "set_object_keyword_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywords: ["battle_rush_temp"] },
          keyword: "battle_rush_temp",
          present: false,
          reason: "phase_cleanup"
        }
      ]
    },
    refresh_basic_trio_objects: {
      id: "refresh_basic_trio_objects",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "set_object_exhausted_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywordsNot: ["frozen"] },
          exhausted: false,
          reason: "phase_refresh"
        },
        {
          type: "set_object_keyword_on_matching_objects",
          match: { objectTypes: ["minion"], zoneType: "board", zoneOwner: "command_player", keywords: ["frozen"] },
          keyword: "frozen",
          present: false,
          reason: "phase_refresh"
        }
      ]
    },
    open_basic_trio_main_prompt: {
      id: "open_basic_trio_main_prompt",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_basic_trio_main_{player}_{next_sequence}",
          responderIds: ["command_player"],
          promptType: "main_action",
          responseMode: "single",
          payload: { actions: ["play_card", "attack", "hero_ability", "end_turn"] }
        }
      ]
    }
  }
};

export const sampleBasicTrioPhaseGraph: PhaseGraphDefinition = {
  start: "turn_start",
  phases: [
    { id: "turn_start", next: "resource_refresh" },
    { id: "resource_refresh", entryBehaviors: ["refresh_basic_trio_objects", "refresh_basic_trio_mana"], next: "draw" },
    { id: "draw", entryBehaviors: ["basic_trio_draw_or_fatigue"], next: "main" },
    { id: "main", entryBehaviors: ["open_basic_trio_main_prompt"], actionWindow: true, next: "turn_end" },
    { id: "turn_end", entryBehaviors: ["expire_basic_trio_battle_rush", "expire_basic_trio_hero_attack", "clear_basic_trio_hero_freeze"] }
  ]
};
