import type { BehaviorLibrary, ContentLock, MatchEvent, MatchState, OutcomeState, PhaseGraphDefinition } from "../../engine-core/src/index.ts";

export type IdentityRole = "lord" | "loyalist" | "rebel" | "spy";

export interface IdentitySetupOptions {
  playerCount?: 6 | 8;
  contentLock?: ContentLock;
}

function visibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

function statsForTemplate(templateId: string): Record<string, number> {
  if (templateId === "training_spear") {
    return { attackRangeModifier: 2 };
  }

  if (templateId === "training_armor") {
    return { damageReduction: 1 };
  }

  if (templateId === "scout_horse") {
    return { outgoingDistanceModifier: -1 };
  }

  if (templateId === "guard_horse") {
    return { incomingDistanceModifier: 1 };
  }

  if (templateId === "judgment_spade_7") {
    return { rank: 7 };
  }

  if (templateId === "judgment_heart_10") {
    return { rank: 10 };
  }

  if (templateId === "judgment_club_2") {
    return { rank: 2 };
  }

  return {};
}

function roleDistribution(playerCount: 6 | 8): IdentityRole[] {
  if (playerCount === 6) {
    return ["lord", "loyalist", "rebel", "rebel", "rebel", "spy"];
  }

  return ["lord", "loyalist", "loyalist", "rebel", "rebel", "rebel", "rebel", "spy"];
}

export function createSampleIdentitySetupEvents(options: 6 | 8 | IdentitySetupOptions = 6): MatchEvent[] {
  const playerCount = typeof options === "number" ? options : options.playerCount ?? 6;
  const contentLock = typeof options === "number" ? undefined : options.contentLock;
  let sequence = 0;
  const roles = roleDistribution(playerCount);

  function event(type: string, payload: unknown): MatchEvent {
    sequence += 1;
    return {
      id: `evt_${sequence}`,
      matchId: "sample_identity_match",
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

  function object(id: string, templateId: string, objectType: string, zoneId: string, position: number, ownerId: string | undefined, tags: string[], isPublic = false) {
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
        visibility: isPublic ? { kind: "public" } : { kind: "owner" },
        stats: statsForTemplate(templateId),
        counters: {},
        tags,
        keywords: [],
        attachments: [],
        modifiers: [],
        createdAtSequence: sequence + 1,
        lastChangedAtSequence: sequence + 1
      }
    });
  }

  const events: MatchEvent[] = [
    event("match_initialized", {
      matchId: "sample_identity_match",
      gameDefinitionId: "sample-identity",
      gameDefinitionVersion: "0.1.0",
      seed: "sample-identity-seed",
      contentLock: contentLock ?? {
        gameDefinition: {
          id: "sample-identity",
          version: "0.1.0",
          contentHash: "sha256:sample-identity-dev"
        }
      }
    }),
    zone("zone_roles", undefined, "roles", "ordered"),
    zone("zone_shared_deck", undefined, "deck", "hidden_ordered"),
    zone("zone_discard", undefined, "discard", "ordered"),
    object("shared_card_1", "judgment_spade_7", "card", "zone_shared_deck", 0, undefined, ["basic", "suit_spade", "color_black"]),
    object("shared_card_2", "judgment_heart_10", "card", "zone_shared_deck", 1, undefined, ["basic", "suit_heart", "color_red"]),
    object("shared_card_3", "sample_trick", "card", "zone_shared_deck", 2, undefined, ["trick"]),
    object("shared_card_4", "sample_basic", "card", "zone_shared_deck", 3, undefined, ["basic"]),
    object("shared_card_5", "sample_trick", "card", "zone_shared_deck", 4, undefined, ["trick"]),
    object("shared_card_6", "sample_basic", "card", "zone_shared_deck", 5, undefined, ["basic"]),
    object("shared_card_7", "judgment_club_2", "card", "zone_shared_deck", 6, undefined, ["basic", "suit_club", "color_black"])
  ];

  roles.forEach((role, index) => {
    const playerId = `p${index + 1}`;
    events.push(
      event("player_seated", {
        seat: { id: `seat_${index + 1}`, index, playerId },
        player: {
          id: playerId,
          userId: `u${index + 1}`,
          seatId: `seat_${index + 1}`,
          controllerId: playerId,
          status: "alive",
          roleRef: `role_${playerId}`,
          characterRef: `character_${playerId}`,
          factionId: role,
          resources: {
            health: { current: role === "lord" ? 4 : 3, max: role === "lord" ? 4 : 3 }
          }
        }
      }),
      zone(`zone_hand_${playerId}`, playerId, "hand", "ordered"),
      zone(`zone_judgment_${playerId}`, playerId, "judgment", "ordered"),
      zone(`zone_equipment_${playerId}`, playerId, "equipment", "ordered", 5),
      object(`role_${playerId}`, role, "identity", "zone_roles", index, playerId, [role], role === "lord"),
      object(
        `character_${playerId}`,
        `character_${playerId}`,
        "character",
        `zone_equipment_${playerId}`,
        0,
        playerId,
        playerId === "p2" ? ["character", "yingzi_skill"] : ["character"],
        true
      ),
      ...(playerId === "p1"
        ? [
            object("weapon_p1", "training_spear", "equipment", "zone_equipment_p1", 1, "p1", ["weapon"], true),
            object("weapon_dagger_p1", "training_dagger", "equipment", "zone_hand_p1", 0, "p1", ["weapon"], false),
            object("delayed_lightning_p1", "delayed_lightning", "card", "zone_hand_p1", 1, "p1", ["delayed_trick", "lightning_trick"], false)
          ]
        : []),
      ...(playerId === "p2"
        ? [
            object("weapon_spear_p2", "training_spear", "equipment", "zone_hand_p2", 0, "p2", ["weapon"], false),
            object("armor_p2", "training_armor", "equipment", "zone_hand_p2", 1, "p2", ["armor", "auto_dodge_armor"], false),
            object("mount_minus_p2", "scout_horse", "equipment", "zone_hand_p2", 2, "p2", ["mount_minus"], false),
            object("armor_backup_p2", "training_armor", "equipment", "zone_hand_p2", 3, "p2", ["armor"], false)
          ]
        : []),
      ...(playerId === "p3" ? [object("nullification_p3", "nullification", "card", "zone_hand_p3", 0, "p3", ["trick", "nullification"], false)] : []),
      ...(playerId === "p4" ? [object("nullification_p4", "nullification", "card", "zone_hand_p4", 0, "p4", ["trick", "nullification"], false)] : []),
      ...(playerId === "p5"
        ? [object("mount_plus_p5", "guard_horse", "equipment", "zone_hand_p5", 0, "p5", ["mount_plus"], false)]
        : []),
      ...(playerId === "p6"
        ? [
            object("delayed_skip_play_p6", "delayed_skip_play", "card", "zone_hand_p6", 0, "p6", ["delayed_trick", "skip_play_trick"], false),
            object("delayed_skip_draw_p6", "delayed_skip_draw", "card", "zone_hand_p6", 1, "p6", ["delayed_trick", "skip_draw_trick"], false)
          ]
        : [])
    );
  });

  return events;
}

export const sampleIdentityBehaviors: BehaviorLibrary = {
  behaviors: {
    attack: {
      id: "attack",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true, range: { from: "controller", mode: "attack" } }
        }
      ],
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1 }]
    },
    attack_with_dodge_prompt: {
      id: "attack_with_dodge_prompt",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true, range: { from: "controller", mode: "attack" } }
        }
      ],
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_dodge",
          responderIds: [{ selector: "target" }],
          promptType: "respond_with_dodge",
          responseMode: "single",
          payload: {
            allowedResponseBehaviors: ["dodge_response", "armor_auto_dodge_response"],
            onPassBehavior: "attack_damage_after_no_dodge",
            defaultTargetFromResponder: true
          }
        }
      ]
    },
    attack_damage_after_no_dodge: {
      id: "attack_damage_after_no_dodge",
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
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1 }]
    },
    dodge_response: {
      id: "dodge_response",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "dodge_used", current: 1, reason: "response_card" }]
    },
    armor_auto_dodge_response: {
      id: "armor_auto_dodge_response",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "armor",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["equipment"], tags: ["auto_dodge_armor"], owner: "command_player", zoneType: "equipment" }
        }
      ],
      effects: [{ type: "set_resource", player: "command_player", resource: "dodge_used", current: 1, reason: "armor_auto_dodge" }]
    },
    trick_with_nullification_stack: {
      id: "trick_with_nullification_stack",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        },
        {
          id: "responders",
          from: "players",
          count: { min: 1, max: 8 },
          match: { status: "alive" }
        }
      ],
      effects: [
        { type: "set_resource", player: "command_player", resource: "nullification_parity", current: 0, reason: "nullification_stack_started" },
        {
          type: "open_prompt",
          promptId: "prompt_nullification_{next_sequence}",
          responderIds: [],
          responderSelectorIds: ["responders"],
          promptType: "nullification_stack",
          responseMode: "priority_loop",
          defaultSelections: {
            stack_owner: ["command_player"],
            target: [{ selector: "target" }]
          },
          payload: {
            allowedResponseBehaviors: ["nullification_response"],
            onPassBehavior: "settle_nullification_stack"
          }
        }
      ]
    },
    nullification_response: {
      id: "nullification_response",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "nullification",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["card"], tags: ["nullification"], owner: "command_player", zoneType: "hand" }
        },
        {
          id: "stack_owner",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive" }
        }
      ],
      effects: [
        { type: "move_card", object: { selector: "nullification" }, toZoneId: "zone_discard" },
        { type: "toggle_resource", player: { selector: "stack_owner" }, resource: "nullification_parity", reason: "nullification_response" }
      ]
    },
    settle_nullification_stack: {
      id: "settle_nullification_stack",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "stack_owner",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive" }
        },
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive" }
        }
      ],
      effects: [
        {
          type: "execute_behavior_if_resource",
          player: { selector: "stack_owner" },
          resource: "nullification_parity",
          equals: 0,
          behaviorId: "trick_damage_after_nullification"
        },
        { type: "set_resource", player: { selector: "stack_owner" }, resource: "nullification_parity", current: 0, reason: "nullification_stack_settled" }
      ]
    },
    trick_damage_after_nullification: {
      id: "trick_damage_after_nullification",
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
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 1, damageType: "trick" }]
    },
    equip_weapon: {
      id: "equip_weapon",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "equipment",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["equipment"], tags: ["weapon"], owner: "command_player", zoneType: "hand" }
        }
      ],
      effects: [
        {
          type: "equip_object",
          object: { selector: "equipment" },
          player: "command_player",
          slotTag: "weapon",
          discardZoneId: "zone_discard"
        }
      ]
    },
    equip_armor: {
      id: "equip_armor",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "equipment",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["equipment"], tags: ["armor"], owner: "command_player", zoneType: "hand" }
        }
      ],
      effects: [
        {
          type: "equip_object",
          object: { selector: "equipment" },
          player: "command_player",
          slotTag: "armor",
          discardZoneId: "zone_discard"
        }
      ]
    },
    equip_mount_minus: {
      id: "equip_mount_minus",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "equipment",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["equipment"], tags: ["mount_minus"], owner: "command_player", zoneType: "hand" }
        }
      ],
      effects: [
        {
          type: "equip_object",
          object: { selector: "equipment" },
          player: "command_player",
          slotTag: "mount_minus",
          discardZoneId: "zone_discard"
        }
      ]
    },
    equip_mount_plus: {
      id: "equip_mount_plus",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "equipment",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["equipment"], tags: ["mount_plus"], owner: "command_player", zoneType: "hand" }
        }
      ],
      effects: [
        {
          type: "equip_object",
          object: { selector: "equipment" },
          player: "command_player",
          slotTag: "mount_plus",
          discardZoneId: "zone_discard"
        }
      ]
    },
    place_delayed_lightning: {
      id: "place_delayed_lightning",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "delayed",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["card"], tags: ["delayed_trick"], owner: "command_player", zoneType: "hand" }
        },
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [
        {
          type: "move_card",
          object: { selector: "delayed" },
          toZoneId: { owner: { selector: "target" }, zoneType: "judgment" }
        }
      ]
    },
    place_delayed_skip_play: {
      id: "place_delayed_skip_play",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "delayed",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["card"], tags: ["skip_play_trick"], owner: "command_player", zoneType: "hand" }
        },
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [
        {
          type: "move_card",
          object: { selector: "delayed" },
          toZoneId: { owner: { selector: "target" }, zoneType: "judgment" }
        }
      ]
    },
    place_delayed_skip_draw: {
      id: "place_delayed_skip_draw",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "delayed",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["card"], tags: ["skip_draw_trick"], owner: "command_player", zoneType: "hand" }
        },
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "alive", notSelf: true }
        }
      ],
      effects: [
        {
          type: "move_card",
          object: { selector: "delayed" },
          toZoneId: { owner: { selector: "target" }, zoneType: "judgment" }
        }
      ]
    },
    resolve_delayed_lightning: {
      id: "resolve_delayed_lightning",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "delayed",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["card"], tags: ["delayed_trick"], zoneOwner: "command_player", zoneType: "judgment" }
        }
      ],
      effects: [
        {
          type: "resolve_delayed_judgment",
          object: { selector: "delayed" },
          deckZoneId: "zone_shared_deck",
          discardZoneId: "zone_discard",
          hit: { suit: "spade", rankMin: 2, rankMax: 9 },
          onHitBehaviorId: "delayed_lightning_judgment",
          target: "command_player",
          onMiss: { moveToNextAliveJudgment: true }
        }
      ]
    },
    delayed_lightning_judgment: {
      id: "delayed_lightning_judgment",
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
      effects: [{ type: "deal_damage", to: { selector: "target" }, amount: 3, damageType: "delayed_judgment" }]
    },
    delayed_skip_play_judgment: {
      id: "delayed_skip_play_judgment",
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
      effects: [{ type: "set_resource", player: { selector: "target" }, resource: "skip_phase_play", current: 1, reason: "delayed_skip_play" }]
    },
    delayed_skip_draw_judgment: {
      id: "delayed_skip_draw_judgment",
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
      effects: [{ type: "set_resource", player: { selector: "target" }, resource: "skip_phase_draw", current: 1, reason: "delayed_skip_draw" }]
    },
    rescue: {
      id: "rescue",
      version: "0.1.0",
      kind: "card",
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "dying" }
        }
      ],
      effects: [
        { type: "heal", player: { selector: "target" }, amount: 1 },
        { type: "set_player_status", player: { selector: "target" }, status: "alive", reason: "rescued" }
      ]
    },
    finish_dying: {
      id: "finish_dying",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "target",
          from: "players",
          count: { min: 1, max: 1 },
          match: { status: "dying" }
        }
      ],
      effects: [{ type: "set_player_status", player: { selector: "target" }, status: "dead", reason: "not_rescued" }]
    },
    reward_for_rebel_kill: {
      id: "reward_for_rebel_kill",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "reward_cards", current: 3, reason: "killed_rebel" }]
    },
    lord_kills_loyalist_penalty: {
      id: "lord_kills_loyalist_penalty",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "hand_size", current: 0, reason: "lord_killed_loyalist" }]
    },
    grant_extra_draw_phase: {
      id: "grant_extra_draw_phase",
      version: "0.1.0",
      kind: "rules_module",
      effects: [{ type: "set_resource", player: "command_player", resource: "insert_phase_extra_draw", current: 1, reason: "phase_insert_skill" }]
    },
    yingzi_grant_extra_draw_phase: {
      id: "yingzi_grant_extra_draw_phase",
      version: "0.1.0",
      kind: "rules_module",
      selectors: [
        {
          id: "skill_source",
          from: "objects",
          count: { min: 1, max: 1 },
          match: { objectTypes: ["character"], tags: ["yingzi_skill"], owner: "command_player", zoneType: "equipment" }
        }
      ],
      effects: [{ type: "set_resource", player: "command_player", resource: "insert_phase_extra_draw", current: 1, reason: "yingzi_extra_draw" }]
    },
    identity_resolve_judgment: {
      id: "identity_resolve_judgment",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "resolve_delayed_judgments_in_zone",
          player: "command_player",
          zoneType: "judgment",
          objectTag: "lightning_trick",
          deckZoneId: "zone_shared_deck",
          discardZoneId: "zone_discard",
          hit: { suit: "spade", rankMin: 2, rankMax: 9 },
          onHitBehaviorId: "delayed_lightning_judgment",
          target: "command_player",
          onMiss: { moveToNextAliveJudgment: true }
        },
        {
          type: "resolve_delayed_judgments_in_zone",
          player: "command_player",
          zoneType: "judgment",
          objectTag: "skip_play_trick",
          deckZoneId: "zone_shared_deck",
          discardZoneId: "zone_discard",
          hit: { anyTags: ["suit_spade", "suit_club", "suit_diamond"] },
          onHitBehaviorId: "delayed_skip_play_judgment",
          target: "command_player"
        },
        {
          type: "resolve_delayed_judgments_in_zone",
          player: "command_player",
          zoneType: "judgment",
          objectTag: "skip_draw_trick",
          deckZoneId: "zone_shared_deck",
          discardZoneId: "zone_discard",
          hit: { anyTags: ["suit_spade", "suit_heart", "suit_diamond"] },
          onHitBehaviorId: "delayed_skip_draw_judgment",
          target: "command_player"
        }
      ]
    },
    identity_draw_two: {
      id: "identity_draw_two",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "draw_cards",
          fromZoneId: "zone_shared_deck",
          toZoneId: { owner: "command_player", zoneType: "hand" },
          count: 2
        }
      ]
    },
    identity_open_play_prompt: {
      id: "identity_open_play_prompt",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "open_prompt",
          promptId: "prompt_identity_play_{player}_{next_sequence}",
          responderIds: ["command_player"],
          promptType: "identity_play_action",
          responseMode: "single",
          payload: {
            actions: ["play_card", "end_turn"]
          }
        }
      ]
    },
    identity_discard_to_hand_limit: {
      id: "identity_discard_to_hand_limit",
      version: "0.1.0",
      kind: "rules_module",
      effects: [
        {
          type: "discard_to_hand_limit",
          player: "command_player",
          handZoneId: { owner: "command_player", zoneType: "hand" },
          discardZoneId: "zone_discard",
          resource: "health"
        }
      ]
    }
  }
};

export const sampleIdentityPhaseGraph: PhaseGraphDefinition = {
  start: "prepare",
  phases: [
    { id: "prepare", next: "judgment" },
    { id: "judgment", entryBehaviors: ["identity_resolve_judgment"], next: "draw" },
    { id: "draw", entryBehaviors: ["identity_draw_two"], skipResource: "skip_phase_draw", insertAfter: { resource: "insert_phase_extra_draw", phaseId: "extra_draw" }, next: "play" },
    { id: "extra_draw", entryBehaviors: ["identity_draw_two"], next: "play" },
    { id: "play", entryBehaviors: ["identity_open_play_prompt"], actionWindow: true, skipResource: "skip_phase_play", next: "discard" },
    { id: "discard", entryBehaviors: ["identity_discard_to_hand_limit"], next: "finish" },
    { id: "finish" }
  ]
};

export function evaluateIdentityOutcome(state: MatchState): OutcomeState | undefined {
  const players = Object.values(state.players);
  const lord = players.find((player) => player.factionId === "lord");

  if (!lord) {
    return undefined;
  }

  const alivePlayers = players.filter((player) => player.status === "alive");
  const aliveNonLord = alivePlayers.filter((player) => player.factionId !== "lord");
  const hostilePlayers = players.filter((player) => player.factionId === "rebel" || player.factionId === "spy");
  const allHostilesDead = hostilePlayers.every((player) => player.status === "dead");

  if (lord.status === "alive" && allHostilesDead) {
    return {
      id: "identity_outcome_lord",
      status: "completed",
      results: players.map((player) => ({
        playerId: player.id,
        status: player.factionId === "lord" || player.factionId === "loyalist" ? "won" : "lost",
        reason: "lord_camp_survived",
        faction: player.factionId
      }))
    };
  }

  if (lord.status === "dead") {
    const spyWinner = aliveNonLord.length === 1 && aliveNonLord[0]?.factionId === "spy";
    return {
      id: spyWinner ? "identity_outcome_spy" : "identity_outcome_rebel",
      status: "completed",
      results: players.map((player) => {
        const won = spyWinner ? player.factionId === "spy" : player.factionId === "rebel";
        return {
          playerId: player.id,
          status: won ? "won" : "lost",
          reason: spyWinner ? "spy_final_survivor" : "lord_dead",
          faction: player.factionId
        };
      })
    };
  }

  return undefined;
}
