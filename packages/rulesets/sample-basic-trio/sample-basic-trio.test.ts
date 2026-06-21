import test from "node:test";
import assert from "node:assert/strict";

import { CommandRejectedError, createEmptyMatchState, reduceEvent, resolveCommand, type MatchState } from "../../engine-core/src/index.ts";
import { createSampleBasicTrioSetupEvents, sampleBasicTrioBehaviors, sampleBasicTrioPhaseGraph } from "./sample-basic-trio.ts";
import { runPhaseGraph } from "../../engine-core/src/turn.ts";

function setup(options: Parameters<typeof createSampleBasicTrioSetupEvents>[0] = {}): MatchState {
  return createSampleBasicTrioSetupEvents(options).reduce((state, event) => reduceEvent(state, event), createEmptyMatchState());
}

function resolve(state: MatchState, command: Parameters<typeof resolveCommand>[1]) {
  return resolveCommand(state, command, {
    behaviorLibrary: sampleBasicTrioBehaviors,
    outcomeMode: "last_alive",
    deathMode: "direct"
  });
}

test("sample-basic-trio Mage spell deals six hero damage", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const result = resolve(state, {
    id: "cmd_ember_lance",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ember_lance",
      sourceObjectId: "card_ember_lance_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p2?.resources.health?.current, 24);
  assert.equal(result.state.players.p1?.resources.mana?.current, 6);
  assert.equal(result.state.objects.card_ember_lance_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio Mage spell damage minion increases spell damage", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const played = resolve(state, {
    id: "cmd_play_spark_adept",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_spark_adept",
      sourceObjectId: "card_spark_adept_p1"
    }
  });

  assert.equal(played.state.objects.card_spark_adept_p1?.zoneId, "zone_board_p1");
  assert.equal(played.state.objects.card_spark_adept_p1?.objectType, "minion");
  assert.equal(played.state.objects.card_spark_adept_p1?.stats.spellPower, 1);

  const result = resolve(played.state, {
    id: "cmd_ember_lance_with_spell_power",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ember_lance",
      sourceObjectId: "card_ember_lance_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(result.state.players.p2?.resources.health?.current, 23);
  assert.equal(result.state.players.p1?.resources.mana?.current, 4);
  assert.ok(result.events.some((event) => event.type === "damage_dealt" && event.payload.amount === 7));
});

test("sample-basic-trio Mage lance can also burn an enemy minion through a second behavior", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const result = resolve(state, {
    id: "cmd_ember_lance_minion",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ember_lance_minion",
      sourceObjectId: "card_ember_lance_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  assert.equal(result.state.objects.minion_arena_ogre_p2?.stats.health, 1);
  assert.equal(result.state.players.p1?.resources.mana?.current, 6);
  assert.equal(result.state.objects.card_ember_lance_p1?.zoneId, "zone_discard");
  assert.ok(result.events.some((event) => event.type === "damage_dealt" && event.payload.targetObjectId === "minion_arena_ogre_p2"));
});

test("sample-basic-trio neutral battlecry minion damages a selected enemy minion when played", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const result = resolve(state, {
    id: "cmd_play_needle_scout",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_needle_scout",
      sourceObjectId: "card_needle_scout_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  const playedIndex = result.events.findIndex((event) => event.type === "object_played" && event.payload.objectId === "card_needle_scout_p1");
  const damageIndex = result.events.findIndex((event) => event.type === "damage_dealt" && event.payload.targetObjectId === "minion_arena_ogre_p2");

  assert.equal(result.state.objects.card_needle_scout_p1?.zoneId, "zone_board_p1");
  assert.equal(result.state.objects.card_needle_scout_p1?.objectType, "minion");
  assert.equal(result.state.objects.card_needle_scout_p1?.stats.attack, 1);
  assert.equal(result.state.objects.card_needle_scout_p1?.stats.health, 1);
  assert.equal(result.state.objects.card_needle_scout_p1?.exhausted, true);
  assert.equal(result.state.objects.minion_arena_ogre_p2?.stats.health, 6);
  assert.equal(result.state.players.p1?.resources.mana.current, 9);
  assert.ok(playedIndex >= 0);
  assert.ok(damageIndex > playedIndex);
  assert.ok(result.events.some((event) => event.type === "damage_dealt" && event.payload.amount === 1 && event.payload.damageType === "battlecry"));
});

test("sample-basic-trio Warrior weapon spends durability", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const first = resolve(state, {
    id: "cmd_forge_axe_1",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "forge_axe_attack",
      sourceObjectId: "weapon_forge_axe_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(first.state.players.p2?.resources.health?.current, 27);
  assert.equal(first.state.objects.weapon_forge_axe_p1?.counters.durability, 1);

  const second = resolve(first.state, {
    id: "cmd_forge_axe_2",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "forge_axe_attack",
      sourceObjectId: "weapon_forge_axe_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(second.state.players.p2?.resources.health?.current, 24);
  assert.equal(second.state.objects.weapon_forge_axe_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio Warrior can equip and spend a heavier weapon from hand", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const firstSwing = resolve(state, {
    id: "cmd_clear_forge_axe_1",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "forge_axe_attack",
      sourceObjectId: "weapon_forge_axe_p1",
      selections: { target: ["p2"] }
    }
  });
  const brokenForge = resolve(firstSwing.state, {
    id: "cmd_clear_forge_axe_2",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "forge_axe_attack",
      sourceObjectId: "weapon_forge_axe_p1",
      selections: { target: ["p2"] }
    }
  });
  const equipped = resolve(brokenForge.state, {
    id: "cmd_equip_heavy_reaper",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "equip_heavy_reaper",
      sourceObjectId: "card_heavy_reaper_p1"
    }
  });

  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.zoneId, "zone_weapon_p1");
  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.visibility.kind, "public");
  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.stats.attack, 5);
  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.counters.durability, 2);
  assert.equal(equipped.state.players.p1?.resources.mana.current, 5);
  assert.ok(equipped.events.some((event) => event.type === "object_played"));

  const struck = resolve(equipped.state, {
    id: "cmd_heavy_reaper_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "heavy_reaper_attack",
      sourceObjectId: "card_heavy_reaper_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(struck.state.players.p2?.resources.health.current, 19);
  assert.equal(struck.state.objects.card_heavy_reaper_p1?.counters.durability, 1);
});

test("sample-basic-trio Warrior weapon plays replace the currently equipped weapon", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const equipped = resolve(state, {
    id: "cmd_equip_heavy_reaper_over_forge",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "equip_heavy_reaper",
      sourceObjectId: "card_heavy_reaper_p1"
    }
  });

  assert.deepEqual(equipped.state.zones.zone_weapon_p1?.objectIds, ["card_heavy_reaper_p1"]);
  assert.equal(equipped.state.objects.weapon_forge_axe_p1?.zoneId, "zone_discard");
  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.zoneId, "zone_weapon_p1");
  assert.equal(equipped.state.objects.card_heavy_reaper_p1?.visibility.kind, "public");
  assert.equal(equipped.state.players.p1?.resources.mana.current, 5);
  assert.ok(equipped.events.some((event) => event.type === "card_moved" && event.payload.objectId === "weapon_forge_axe_p1"));
  assert.ok(equipped.events.some((event) => event.type === "object_played" && event.payload.objectId === "card_heavy_reaper_p1"));

  const struck = resolve(equipped.state, {
    id: "cmd_heavy_reaper_attack_after_replace",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "heavy_reaper_attack",
      sourceObjectId: "card_heavy_reaper_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(struck.state.players.p2?.resources.health.current, 25);
  assert.equal(struck.state.objects.card_heavy_reaper_p1?.counters.durability, 1);
});

test("sample-basic-trio Warrior armor card gains armor, draws, and absorbs damage", () => {
  const state = setup({ p1Class: "warrior", p2Class: "priest" });
  const result = resolve(state, {
    id: "cmd_guard_stance",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "guard_stance",
      sourceObjectId: "card_guard_stance_p1"
    }
  });

  assert.equal(result.state.players.p1?.resources.armor?.current, 5);
  assert.equal(result.state.objects.card_guard_stance_p1?.zoneId, "zone_discard");
  assert.equal(result.state.zones.zone_hand_p1?.objectIds.includes("card_river_guard_draw_p1"), true);

  const damaged = resolve(result.state, {
    id: "cmd_dawn_smite_into_armor",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "dawn_smite",
      sourceObjectId: "card_dawn_smite_p2",
      selections: { target: ["p1"] }
    }
  });

  assert.equal(damaged.state.players.p1?.resources.armor?.current, 3);
  assert.equal(damaged.state.players.p1?.resources.health?.current, 30);
});

test("sample-basic-trio Warrior battle rush buffs and readies a friendly minion", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });

  assert.equal(state.objects.minion_river_guard_p1?.exhausted, undefined);

  const exhausted = resolve(state, {
    id: "cmd_exhaust_river_guard",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "river_guard_attack",
      sourceObjectId: "minion_river_guard_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(exhausted.state.objects.minion_river_guard_p1?.exhausted, true);

  const rushed = resolve(exhausted.state, {
    id: "cmd_battle_rush",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "battle_rush",
      sourceObjectId: "card_battle_rush_p1",
      selections: { target: ["minion_river_guard_p1"] }
    }
  });

  assert.equal(rushed.state.objects.minion_river_guard_p1?.stats.attack, 4);
  assert.equal(rushed.state.objects.minion_river_guard_p1?.keywords.includes("battle_rush_temp"), true);
  assert.equal(rushed.state.objects.minion_river_guard_p1?.exhausted, false);
  assert.equal(rushed.state.objects.card_battle_rush_p1?.zoneId, "zone_discard");
  assert.equal(rushed.state.players.p1?.resources.mana.current, 7);

  const attackedAgain = resolve(rushed.state, {
    id: "cmd_rushed_guard_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "river_guard_attack",
      sourceObjectId: "minion_river_guard_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attackedAgain.state.players.p2?.resources.health.current, 24);

  const expired = resolve(attackedAgain.state, {
    id: "cmd_expire_battle_rush",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "expire_basic_trio_battle_rush"
    }
  });

  assert.equal(expired.state.objects.minion_river_guard_p1?.stats.attack, 2);
  assert.equal(expired.state.objects.minion_river_guard_p1?.keywords.includes("battle_rush_temp"), false);
  assert.ok(expired.events.some((event) => event.type === "object_stat_changed" && event.payload.objectId === "minion_river_guard_p1"));
  assert.ok(expired.events.some((event) => event.type === "object_keyword_changed" && event.payload.objectId === "minion_river_guard_p1"));
});

test("sample-basic-trio Warrior battle focus grants temporary hero attack and spends it", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });

  assert.throws(
    () =>
      resolve(state, {
        id: "cmd_battle_focus_attack_empty",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "battle_focus_attack",
          selections: { target: ["p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const focused = resolve(state, {
    id: "cmd_battle_focus",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "battle_focus",
      sourceObjectId: "card_battle_focus_p1"
    }
  });

  assert.equal(focused.state.players.p1?.resources.mana.current, 8);
  assert.equal(focused.state.players.p1?.resources.heroAttack.current, 4);
  assert.equal(focused.state.objects.card_battle_focus_p1?.zoneId, "zone_discard");

  const stackedWeaponAttack = resolve(focused.state, {
    id: "cmd_battle_focus_weapon_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "forge_axe_attack",
      sourceObjectId: "weapon_forge_axe_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(stackedWeaponAttack.state.players.p2?.resources.health.current, 23);
  assert.equal(stackedWeaponAttack.state.players.p1?.resources.heroAttack.current, 0);
  assert.equal(stackedWeaponAttack.state.objects.weapon_forge_axe_p1?.counters.durability, 1);
  assert.ok(stackedWeaponAttack.events.some((event) => event.type === "damage_dealt" && event.payload.amount === 7));

  const expired = resolve(focused.state, {
    id: "cmd_expire_battle_focus",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "expire_basic_trio_hero_attack"
    }
  });

  assert.equal(expired.state.players.p1?.resources.heroAttack.current, 0);
  assert.throws(
    () =>
      resolve(expired.state, {
        id: "cmd_battle_focus_attack_expired",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "battle_focus_attack",
          selections: { target: ["p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const attacked = resolve(focused.state, {
    id: "cmd_battle_focus_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "battle_focus_attack",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attacked.state.players.p2?.resources.health.current, 26);
  assert.equal(attacked.state.players.p1?.resources.heroAttack.current, 0);
  assert.ok(attacked.events.some((event) => event.type === "damage_dealt" && event.payload.amount === 4));

  assert.throws(
    () =>
      resolve(attacked.state, {
        id: "cmd_battle_focus_attack_spent",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "battle_focus_attack",
          selections: { target: ["p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );
});

test("sample-basic-trio Warrior storm runner enters ready and can attack immediately", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const played = resolve(state, {
    id: "cmd_play_storm_runner",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_storm_runner",
      sourceObjectId: "card_storm_runner_p1"
    }
  });

  assert.equal(played.state.objects.card_storm_runner_p1?.zoneId, "zone_board_p1");
  assert.equal(played.state.objects.card_storm_runner_p1?.objectType, "minion");
  assert.equal(played.state.objects.card_storm_runner_p1?.stats.attack, 4);
  assert.equal(played.state.objects.card_storm_runner_p1?.stats.health, 3);
  assert.equal(played.state.objects.card_storm_runner_p1?.exhausted, false);
  assert.equal(played.state.players.p1?.resources.mana.current, 6);

  const attacked = resolve(played.state, {
    id: "cmd_storm_runner_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "storm_runner_attack",
      sourceObjectId: "card_storm_runner_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attacked.state.players.p2?.resources.health.current, 26);
  assert.equal(attacked.state.objects.card_storm_runner_p1?.exhausted, true);
});

test("sample-basic-trio Warrior war drummer readies small minions when they are played", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const drummer = resolve(state, {
    id: "cmd_play_war_drummer",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_war_drummer",
      sourceObjectId: "card_war_drummer_p1"
    }
  });

  assert.equal(drummer.state.objects.card_war_drummer_p1?.zoneId, "zone_board_p1");
  assert.equal(drummer.state.objects.card_war_drummer_p1?.objectType, "minion");
  assert.equal(drummer.state.objects.card_war_drummer_p1?.stats.attack, 2);
  assert.equal(drummer.state.objects.card_war_drummer_p1?.stats.health, 3);
  assert.equal(drummer.state.objects.card_war_drummer_p1?.exhausted, true);
  assert.ok(drummer.state.triggers.some((trigger) => trigger.behaviorId === "war_drummer_ready_small_minion"));

  const recruit = resolve(drummer.state, {
    id: "cmd_play_line_recruit",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_river_guard",
      sourceObjectId: "card_line_recruit_p1"
    }
  });

  assert.equal(recruit.state.objects.card_line_recruit_p1?.zoneId, "zone_board_p1");
  assert.equal(recruit.state.objects.card_line_recruit_p1?.objectType, "minion");
  assert.equal(recruit.state.objects.card_line_recruit_p1?.exhausted, false);
  assert.equal(recruit.state.objects.card_line_recruit_p1?.keywords.includes("charge"), true);
  assert.equal(recruit.state.players.p1?.resources.mana.current, 5);
  assert.ok(recruit.events.some((event) => event.type === "trigger_fired"));

  const attacked = resolve(recruit.state, {
    id: "cmd_line_recruit_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "river_guard_attack",
      sourceObjectId: "card_line_recruit_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attacked.state.players.p2?.resources.health.current, 28);
  assert.equal(attacked.state.objects.card_line_recruit_p1?.exhausted, true);
});

test("sample-basic-trio neutral banner captain grants a continuous attack aura", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const played = resolve(state, {
    id: "cmd_play_banner_captain",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_banner_captain",
      sourceObjectId: "card_banner_captain_p1"
    }
  });

  assert.equal(played.state.objects.card_banner_captain_p1?.zoneId, "zone_board_p1");
  assert.equal(played.state.objects.card_banner_captain_p1?.stats.attack, 2);
  assert.equal(played.state.objects.minion_river_guard_p1?.stats.attack, 2);
  assert.equal(played.state.players.p1?.resources.mana.current, 7);

  const attacked = resolve(played.state, {
    id: "cmd_bannered_river_guard_attack",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "river_guard_attack",
      sourceObjectId: "minion_river_guard_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attacked.state.players.p2?.resources.health.current, 27);
  assert.equal(attacked.state.objects.minion_river_guard_p1?.stats.attack, 2);
  assert.ok(attacked.events.some((event) => event.type === "damage_dealt" && event.payload.amount === 3));
});

test("sample-basic-trio Warrior area spell damages all minions", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const swept = resolve(state, {
    id: "cmd_ring_sweep",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ring_sweep",
      sourceObjectId: "card_ring_sweep_p1"
    }
  });

  assert.equal(swept.state.objects.minion_river_guard_p1?.stats.health, 2);
  assert.equal(swept.state.objects.minion_arena_ogre_p2?.stats.health, 6);
  assert.equal(swept.state.players.p1?.resources.mana.current, 9);
  assert.equal(swept.state.objects.card_ring_sweep_p1?.zoneId, "zone_discard");
  assert.equal(swept.events.filter((event) => event.type === "damage_dealt").length, 2);
  assert.equal(swept.events.filter((event) => event.type === "object_stat_changed").length, 2);
});

test("sample-basic-trio Mage glacier warden freezes minions it damages", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const played = resolve(state, {
    id: "cmd_play_glacier_warden",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_glacier_warden",
      sourceObjectId: "card_glacier_warden_p1"
    }
  });

  assert.equal(played.state.objects.card_glacier_warden_p1?.zoneId, "zone_board_p1");
  assert.equal(played.state.objects.card_glacier_warden_p1?.objectType, "minion");
  assert.equal(played.state.objects.card_glacier_warden_p1?.stats.attack, 3);
  assert.equal(played.state.objects.card_glacier_warden_p1?.stats.health, 6);
  assert.equal(played.state.objects.card_glacier_warden_p1?.exhausted, true);
  assert.equal(played.state.players.p1?.resources.mana.current, 6);

  const readied = resolve(played.state, {
    id: "cmd_ready_glacier_warden",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "refresh_basic_trio_objects"
    }
  });
  const attacked = resolve(readied.state, {
    id: "cmd_glacier_warden_attack_minion",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "glacier_warden_attack_minion",
      sourceObjectId: "card_glacier_warden_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  assert.equal(attacked.state.objects.minion_arena_ogre_p2?.stats.health, 4);
  assert.equal(attacked.state.objects.minion_arena_ogre_p2?.keywords.includes("frozen"), true);
  assert.equal(attacked.state.objects.minion_arena_ogre_p2?.exhausted, true);
  assert.equal(attacked.state.objects.card_glacier_warden_p1?.exhausted, true);
  assert.ok(attacked.events.some((event) => event.type === "object_keyword_changed" && event.payload.objectId === "minion_arena_ogre_p2"));
});

test("sample-basic-trio Mage glacier warden freezes heroes it damages", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const played = resolve(state, {
    id: "cmd_play_glacier_warden_for_hero",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_glacier_warden",
      sourceObjectId: "card_glacier_warden_p1"
    }
  });
  const readied = resolve(played.state, {
    id: "cmd_ready_glacier_warden_for_hero",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "refresh_basic_trio_objects"
    }
  });
  const attacked = resolve(readied.state, {
    id: "cmd_glacier_warden_attack_hero",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "glacier_warden_attack",
      sourceObjectId: "card_glacier_warden_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(attacked.state.players.p2?.resources.health.current, 27);
  assert.equal(attacked.state.players.p2?.resources.heroFrozen.current, 1);
  assert.equal(attacked.state.objects.card_glacier_warden_p1?.exhausted, true);
  assert.ok(attacked.events.some((event) => event.type === "resource_changed" && event.payload.playerId === "p2" && event.payload.resource === "heroFrozen"));

  assert.throws(
    () =>
      resolve(attacked.state, {
        id: "cmd_frozen_by_glacier_weapon_attack",
        type: "execute_behavior",
        playerId: "p2",
        payload: {
          behaviorId: "forge_axe_attack",
          sourceObjectId: "weapon_forge_axe_p2",
          selections: { target: ["p1"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );
});

test("sample-basic-trio Mage freeze and heavy area spells affect all enemy minions", () => {
  const state = setup({ p1Class: "mage", p2Class: "mage" });
  const p2Summoned = resolve(state, {
    id: "cmd_p2_mirror_guard_for_stasis",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p2"
    }
  });
  const enemyMinionIds = [...(p2Summoned.state.zones.zone_board_p2?.objectIds ?? [])];

  assert.equal(enemyMinionIds.length, 3);

  const frozen = resolve(p2Summoned.state, {
    id: "cmd_winter_stasis",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "winter_stasis",
      sourceObjectId: "card_winter_stasis_p1"
    }
  });

  for (const objectId of enemyMinionIds) {
    assert.equal(frozen.state.objects[objectId]?.keywords.includes("frozen"), true);
    assert.equal(frozen.state.objects[objectId]?.exhausted, true);
  }
  assert.equal(frozen.state.objects.card_winter_stasis_p1?.zoneId, "zone_discard");
  assert.equal(frozen.state.players.p1?.resources.mana.current, 7);
  assert.equal(frozen.events.filter((event) => event.type === "object_keyword_changed").length, 3);

  const columned = resolve(frozen.state, {
    id: "cmd_ember_column",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ember_column",
      sourceObjectId: "card_ember_column_p1"
    }
  });

  assert.equal(columned.state.objects.minion_arena_ogre_p2?.stats.health, 3);
  const tokenIds = enemyMinionIds.filter((objectId) => objectId.startsWith("token_mirror_guard_"));
  for (const objectId of tokenIds) {
    assert.equal(columned.state.objects[objectId]?.zoneId, "zone_discard");
  }
  assert.equal(columned.state.objects.card_ember_column_p1?.zoneId, "zone_discard");
  assert.equal(columned.state.players.p1?.resources.mana.current, 0);
});

test("sample-basic-trio Warrior random spell hits two enemy minions without replacement", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const p2Summoned = resolve(state, {
    id: "cmd_p2_mirror_guard_for_split",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p2"
    }
  });
  const p2Targets = [...(p2Summoned.state.zones.zone_board_p2?.objectIds ?? [])];

  assert.equal(p2Targets.length, 3);

  const struck = resolve(p2Summoned.state, {
    id: "cmd_split_strike",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "split_strike",
      sourceObjectId: "card_split_strike_p1"
    }
  });
  const choices = struck.events.filter((event) => event.type === "random_choice_made").map((event) => event.payload);
  const totalDamage = p2Targets.reduce((sum, objectId) => {
    const before = p2Summoned.state.objects[objectId]?.stats.health ?? 0;
    const after = struck.state.objects[objectId]?.stats.health ?? 0;
    return sum + before - after;
  }, 0);

  assert.equal(choices.length, 2);
  assert.equal(new Set(choices.map((choice) => choice.selectedId)).size, 2);
  assert.equal(struck.events.filter((event) => event.type === "damage_dealt").length, 2);
  assert.equal(totalDamage, 4);
  assert.equal(struck.state.objects.minion_river_guard_p1?.stats.health, 3);
  assert.equal(struck.state.players.p1?.resources.mana.current, 8);
  assert.equal(struck.state.objects.card_split_strike_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio Warrior damaged-minion destroy requires prior damage", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });

  assert.throws(
    () =>
      resolve(state, {
        id: "cmd_battle_edict_undamaged",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "battle_edict",
          sourceObjectId: "card_battle_edict_p1",
          selections: { target: ["minion_arena_ogre_p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "illegal_selection"
  );

  const swept = resolve(state, {
    id: "cmd_ring_sweep_for_edict",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ring_sweep",
      sourceObjectId: "card_ring_sweep_p1"
    }
  });
  const destroyed = resolve(swept.state, {
    id: "cmd_battle_edict",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "battle_edict",
      sourceObjectId: "card_battle_edict_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  assert.equal(destroyed.state.objects.minion_arena_ogre_p2?.zoneId, "zone_discard");
  assert.equal(destroyed.state.objects.card_battle_edict_p1?.zoneId, "zone_discard");
  assert.equal(destroyed.state.players.p1?.resources.mana.current, 8);
  assert.ok(destroyed.events.some((event) => event.type === "object_destroyed"));
});

test("sample-basic-trio Mage board tools summon tokens, damage minions, and freeze attacks", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const summoned = resolve(state, {
    id: "cmd_mirror_guard",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p1"
    }
  });

  assert.equal(summoned.state.zones.zone_board_p1?.objectIds.length, 3);
  assert.equal(summoned.state.objects.card_mirror_guard_p1?.zoneId, "zone_discard");
  assert.equal(summoned.state.players.p1?.resources.mana?.current, 9);

  const pinned = resolve(summoned.state, {
    id: "cmd_frost_pin",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "frost_pin",
      sourceObjectId: "card_frost_pin_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  assert.equal(pinned.state.objects.minion_arena_ogre_p2?.stats.health, 4);
  assert.equal(pinned.state.objects.minion_arena_ogre_p2?.keywords.includes("frozen"), true);
  assert.equal(pinned.state.objects.minion_arena_ogre_p2?.exhausted, true);
  assert.equal(pinned.state.objects.card_frost_pin_p1?.zoneId, "zone_discard");
  assert.ok(pinned.events.some((event) => event.type === "object_stat_changed"));
  assert.ok(pinned.events.some((event) => event.type === "object_keyword_changed"));
  const guardId = pinned.state.zones.zone_board_p1?.objectIds.find((objectId) => objectId.startsWith("token_mirror_guard_"));
  assert.ok(guardId);
  assert.throws(
    () =>
      resolve(pinned.state, {
        id: "cmd_frozen_attack",
        type: "execute_behavior",
        playerId: "p2",
        payload: {
          behaviorId: "arena_ogre_attack_minion",
          sourceObjectId: "minion_arena_ogre_p2",
          selections: { target: [guardId] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const thawed = resolve(pinned.state, {
    id: "cmd_thaw_p2",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "refresh_basic_trio_objects"
    }
  });

  assert.equal(thawed.state.objects.minion_arena_ogre_p2?.keywords.includes("frozen"), false);
  assert.equal(thawed.state.objects.minion_arena_ogre_p2?.exhausted, true);

  const readied = resolve(thawed.state, {
    id: "cmd_ready_p2",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "refresh_basic_trio_objects"
    }
  });

  assert.equal(readied.state.objects.minion_arena_ogre_p2?.exhausted, false);
});

test("sample-basic-trio Mage hero freeze blocks weapon and hero attacks until cleanup", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const frozen = resolve(state, {
    id: "cmd_frost_pin_hero",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "frost_pin_hero",
      sourceObjectId: "card_frost_pin_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(frozen.state.players.p2?.resources.health.current, 27);
  assert.equal(frozen.state.players.p2?.resources.heroFrozen.current, 1);
  assert.equal(frozen.state.players.p1?.resources.mana.current, 8);
  assert.equal(frozen.state.objects.card_frost_pin_p1?.zoneId, "zone_discard");

  assert.throws(
    () =>
      resolve(frozen.state, {
        id: "cmd_frozen_weapon_attack",
        type: "execute_behavior",
        playerId: "p2",
        payload: {
          behaviorId: "forge_axe_attack",
          sourceObjectId: "weapon_forge_axe_p2",
          selections: { target: ["p1"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const focused = resolve(frozen.state, {
    id: "cmd_frozen_battle_focus",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "battle_focus",
      sourceObjectId: "card_battle_focus_p2"
    }
  });

  assert.equal(focused.state.players.p2?.resources.heroAttack.current, 4);
  assert.equal(focused.state.players.p2?.resources.heroFrozen.current, 1);

  assert.throws(
    () =>
      resolve(focused.state, {
        id: "cmd_frozen_hero_attack",
        type: "execute_behavior",
        playerId: "p2",
        payload: {
          behaviorId: "battle_focus_attack",
          selections: { target: ["p1"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "condition_failed"
  );

  const cleared = resolve(focused.state, {
    id: "cmd_clear_hero_freeze",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "clear_basic_trio_hero_freeze"
    }
  });

  assert.equal(cleared.state.players.p2?.resources.heroFrozen.current, 0);

  const attacked = resolve(cleared.state, {
    id: "cmd_thawed_hero_attack",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "battle_focus_attack",
      selections: { target: ["p1"] }
    }
  });

  assert.equal(attacked.state.players.p1?.resources.health.current, 26);
  assert.equal(attacked.state.players.p2?.resources.heroAttack.current, 0);
});

test("sample-basic-trio Mage area spell damages all enemy minions only", () => {
  const state = setup({ p1Class: "mage", p2Class: "mage" });
  const p2Summoned = resolve(state, {
    id: "cmd_p2_mirror_guard",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p2"
    }
  });
  const p2Tokens = p2Summoned.state.zones.zone_board_p2?.objectIds.filter((objectId) => objectId.startsWith("token_mirror_guard_")) ?? [];

  assert.equal(p2Tokens.length, 2);

  const swept = resolve(p2Summoned.state, {
    id: "cmd_ember_wave",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "ember_wave",
      sourceObjectId: "card_ember_wave_p1"
    }
  });

  assert.equal(swept.state.objects.minion_river_guard_p1?.stats.health, 3);
  assert.equal(swept.state.objects.minion_arena_ogre_p2?.stats.health, 6);
  for (const tokenId of p2Tokens) {
    assert.equal(swept.state.objects[tokenId]?.stats.health, 1);
  }
  assert.equal(swept.state.objects.card_ember_wave_p1?.zoneId, "zone_discard");
  assert.equal(swept.state.players.p1?.resources.mana.current, 8);
  assert.equal(swept.events.filter((event) => event.type === "damage_dealt").length, 3);
  assert.equal(swept.events.filter((event) => event.type === "object_stat_changed").length, 3);
});

test("sample-basic-trio Mage random spell records deterministic spark choices", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const first = resolve(state, {
    id: "cmd_cinder_sparks",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "cinder_sparks",
      sourceObjectId: "card_cinder_sparks_p1"
    }
  });
  const second = resolve(state, {
    id: "cmd_cinder_sparks",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "cinder_sparks",
      sourceObjectId: "card_cinder_sparks_p1"
    }
  });
  const firstChoices = first.events
    .filter((event) => event.type === "random_choice_made")
    .map((event) => event.payload);
  const secondChoices = second.events
    .filter((event) => event.type === "random_choice_made")
    .map((event) => event.payload);
  const heroDamage = 30 - (first.state.players.p2?.resources.health?.current ?? 30);
  const minionDamage = 7 - (first.state.objects.minion_arena_ogre_p2?.stats.health ?? 7);

  assert.equal(first.state.rngCursor, 3);
  assert.deepEqual(firstChoices, secondChoices);
  assert.equal(first.events.filter((event) => event.type === "random_choice_made").length, 3);
  assert.equal(first.events.filter((event) => event.type === "damage_dealt").length, 3);
  assert.equal(heroDamage + minionDamage, 3);
  assert.equal(first.state.objects.minion_river_guard_p1?.stats.health, 3);
  assert.equal(first.state.players.p1?.resources.mana.current, 9);
  assert.equal(first.state.objects.card_cinder_sparks_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio Mage transform spell turns a minion into a 1/1 body", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const transformed = resolve(state, {
    id: "cmd_null_form",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "null_form",
      sourceObjectId: "card_null_form_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });
  const target = transformed.state.objects.minion_arena_ogre_p2;

  assert.equal(target?.templateId, "training_spark");
  assert.equal(target?.objectType, "minion");
  assert.equal(target?.ownerId, "p2");
  assert.equal(target?.controllerId, "p2");
  assert.equal(target?.zoneId, "zone_board_p2");
  assert.deepEqual(target?.stats, { attack: 1, health: 1, maxHealth: 1 });
  assert.deepEqual(target?.counters, {});
  assert.deepEqual(target?.keywords, []);
  assert.deepEqual(target?.tags, ["minion", "neutral", "transformed"]);
  assert.equal(target?.exhausted, true);
  assert.equal(transformed.state.players.p1?.resources.mana.current, 6);
  assert.equal(transformed.state.objects.card_null_form_p1?.zoneId, "zone_discard");
  assert.ok(transformed.events.some((event) => event.type === "object_transformed"));

  const readied = resolve(transformed.state, {
    id: "cmd_ready_training_spark",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "refresh_basic_trio_objects"
    }
  });
  assert.equal(readied.state.objects.minion_arena_ogre_p2?.exhausted, false);

  const attacked = resolve(readied.state, {
    id: "cmd_training_spark_attack",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "training_spark_attack",
      sourceObjectId: "minion_arena_ogre_p2",
      selections: { target: ["p1"] }
    }
  });

  assert.equal(attacked.state.players.p1?.resources.health.current, 29);
  assert.equal(attacked.state.objects.minion_arena_ogre_p2?.exhausted, true);
});

test("sample-basic-trio can play a drawn neutral minion through the generic play pipeline", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior" });
  const drawn = resolve(state, {
    id: "cmd_draw_neutral",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "basic_trio_draw_or_fatigue"
    }
  });

  assert.equal(drawn.state.objects.card_river_guard_draw_p1?.zoneId, "zone_hand_p1");
  assert.equal(drawn.state.objects.card_river_guard_draw_p1?.objectType, "card");

  const played = resolve(drawn.state, {
    id: "cmd_play_river_guard",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_river_guard",
      sourceObjectId: "card_river_guard_draw_p1"
    }
  });

  assert.equal(played.state.objects.card_river_guard_draw_p1?.zoneId, "zone_board_p1");
  assert.equal(played.state.objects.card_river_guard_draw_p1?.objectType, "minion");
  assert.deepEqual(played.state.objects.card_river_guard_draw_p1?.visibility, { kind: "public" });
  assert.deepEqual(played.state.objects.card_river_guard_draw_p1?.stats, { attack: 2, health: 3, maxHealth: 3 });
  assert.equal(played.state.objects.card_river_guard_draw_p1?.exhausted, true);
  assert.equal(played.state.players.p1?.resources.mana.current, 8);
  assert.ok(played.events.some((event) => event.type === "object_played"));
});

test("sample-basic-trio taunt tokens protect heroes from attacks", () => {
  const state = setup({ p1Class: "warrior", p2Class: "mage" });
  const guarded = resolve(state, {
    id: "cmd_p2_mirror_guard",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p2"
    }
  });
  const guardId = guarded.state.zones.zone_board_p2?.objectIds.find((objectId) => objectId.startsWith("token_mirror_guard_"));

  assert.ok(guardId);
  assert.throws(
    () =>
      resolve(guarded.state, {
        id: "cmd_attack_guarded_hero",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "river_guard_attack",
          sourceObjectId: "minion_river_guard_p1",
          selections: { target: ["p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "illegal_selection"
  );

  const hitGuard = resolve(guarded.state, {
    id: "cmd_attack_guard",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "river_guard_attack_minion",
      sourceObjectId: "minion_river_guard_p1",
      selections: { target: [guardId] }
    }
  });

  assert.equal(hitGuard.state.objects[guardId]?.zoneId, "zone_discard");
  assert.equal(hitGuard.state.players.p2?.resources.health?.current, 30);
});

test("sample-basic-trio Priest cards and hero power resolve", () => {
  const state = setup({ p1Class: "priest", p2Class: "mage", p1Health: 20 });
  const smite = resolve(state, {
    id: "cmd_mind_spark",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "mind_spark",
      sourceObjectId: "card_mind_spark_p1",
      selections: { target: ["p2"] }
    }
  });

  assert.equal(smite.state.players.p2?.resources.health?.current, 25);

  const healed = resolve(smite.state, {
    id: "cmd_oracle_restore",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "oracle_restore"
    }
  });

  assert.equal(healed.state.players.p1?.resources.health?.current, 22);
});

test("sample-basic-trio Priest random hand copy creates a private copied card", () => {
  const state = setup({ p1Class: "priest", p2Class: "mage" });
  const p2HandBefore = [...(state.zones.zone_hand_p2?.objectIds ?? [])];
  const copied = resolve(state, {
    id: "cmd_mind_glimpse",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "mind_glimpse",
      sourceObjectId: "card_mind_glimpse_p1",
      selections: { target: ["p2"] }
    }
  });
  const copiedId = copied.state.zones.zone_hand_p1?.objectIds.find((objectId) => objectId.startsWith("copy_mind_glimpse_p1_"));
  const p2Templates = p2HandBefore.map((objectId) => state.objects[objectId]?.templateId);

  assert.ok(copiedId);
  assert.deepEqual(copied.state.zones.zone_hand_p2?.objectIds, p2HandBefore);
  assert.equal(copied.state.objects[copiedId]?.ownerId, "p1");
  assert.equal(copied.state.objects[copiedId]?.controllerId, "p1");
  assert.equal(copied.state.objects[copiedId]?.visibility.kind, "owner");
  assert.ok(p2Templates.includes(copied.state.objects[copiedId]?.templateId));
  assert.equal(copied.state.objects.card_mind_glimpse_p1?.zoneId, "zone_discard");
  assert.equal(copied.state.players.p1?.resources.mana.current, 9);
  assert.deepEqual(copied.events.map((event) => event.type), ["resource_changed", "random_choice_made", "object_created", "card_moved"]);
  assert.equal(copied.events.find((event) => event.type === "random_choice_made")?.visibility.default.kind, "admin");
});

test("sample-basic-trio Priest shield and spirit cards modify minion max health", () => {
  const state = setup({ p1Class: "priest", p2Class: "mage" });
  const shielded = resolve(state, {
    id: "cmd_aegis_word",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "aegis_word",
      sourceObjectId: "card_aegis_word_p1",
      selections: { target: ["minion_river_guard_p1"] }
    }
  });

  assert.equal(shielded.state.objects.minion_river_guard_p1?.stats.health, 5);
  assert.equal(shielded.state.objects.minion_river_guard_p1?.stats.maxHealth, 5);
  assert.equal(shielded.state.zones.zone_hand_p1?.objectIds.includes("card_river_guard_draw_p1"), true);
  assert.equal(shielded.state.objects.card_aegis_word_p1?.zoneId, "zone_discard");

  const doubled = resolve(shielded.state, {
    id: "cmd_spirit_echo",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "spirit_echo",
      sourceObjectId: "card_spirit_echo_p1",
      selections: { target: ["minion_river_guard_p1"] }
    }
  });

  assert.equal(doubled.state.objects.minion_river_guard_p1?.stats.health, 10);
  assert.equal(doubled.state.objects.minion_river_guard_p1?.stats.maxHealth, 10);
  assert.equal(doubled.state.players.p1?.resources.mana.current, 7);
  assert.equal(doubled.state.objects.card_spirit_echo_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio Priest cleric draw trigger reacts to Holy Bloom minion healing", () => {
  const state = setup({ p1Class: "priest", p2Class: "mage", p1Health: 20 });
  const damaged = resolve(state, {
    id: "cmd_p2_ember_wave_for_heal",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "ember_wave",
      sourceObjectId: "card_ember_wave_p2"
    }
  });
  const cleric = resolve(damaged.state, {
    id: "cmd_play_dawn_cleric",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "play_dawn_cleric",
      sourceObjectId: "card_dawn_cleric_p1"
    }
  });
  const bloomed = resolve(cleric.state, {
    id: "cmd_holy_bloom",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "holy_bloom",
      sourceObjectId: "card_holy_bloom_p1"
    }
  });

  assert.equal(damaged.state.objects.minion_river_guard_p1?.stats.health, 2);
  assert.equal(cleric.state.objects.card_dawn_cleric_p1?.objectType, "minion");
  assert.equal(cleric.state.triggers[0]?.behaviorId, "dawn_cleric_heal_draw");
  assert.equal(bloomed.state.players.p2?.resources.health?.current, 28);
  assert.equal(bloomed.state.players.p1?.resources.health?.current, 22);
  assert.equal(bloomed.state.objects.minion_arena_ogre_p2?.stats.health, 5);
  assert.equal(bloomed.state.objects.minion_river_guard_p1?.stats.health, 3);
  assert.equal(bloomed.state.zones.zone_hand_p1?.objectIds.includes("card_river_guard_draw_p1"), true);
  assert.equal(bloomed.state.objects.card_holy_bloom_p1?.zoneId, "zone_discard");
  assert.equal(bloomed.events.filter((event) => event.type === "trigger_fired").length, 1);
});

test("sample-basic-trio Priest control spell moves an enemy minion to the caster board", () => {
  const state = setup({ p1Class: "priest", p2Class: "warrior" });
  const controlled = resolve(state, {
    id: "cmd_borrowed_command",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "borrowed_command",
      sourceObjectId: "card_borrowed_command_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });
  const target = controlled.state.objects.minion_arena_ogre_p2;

  assert.equal(target?.ownerId, "p2");
  assert.equal(target?.controllerId, "p1");
  assert.equal(target?.zoneId, "zone_board_p1");
  assert.equal(target?.exhausted, true);
  assert.deepEqual(target?.stats, { attack: 6, health: 7, maxHealth: 7 });
  assert.equal(controlled.state.zones.zone_board_p1?.objectIds.includes("minion_arena_ogre_p2"), true);
  assert.equal(controlled.state.zones.zone_board_p2?.objectIds.includes("minion_arena_ogre_p2"), false);
  assert.equal(controlled.state.zones.zone_board_p2?.objectIds.length, 0);
  assert.equal(controlled.state.players.p1?.resources.mana.current, 0);
  assert.equal(controlled.state.objects.card_borrowed_command_p1?.zoneId, "zone_discard");
  assert.ok(controlled.events.some((event) => event.type === "object_control_changed"));
});

test("sample-basic-trio Priest verdict spells enforce minion attack thresholds", () => {
  const state = setup({ p1Class: "priest", p2Class: "mage" });

  assert.throws(
    () =>
      resolve(state, {
        id: "cmd_quiet_verdict_large",
        type: "execute_behavior",
        playerId: "p1",
        payload: {
          behaviorId: "quiet_verdict",
          sourceObjectId: "card_quiet_verdict_p1",
          selections: { target: ["minion_arena_ogre_p2"] }
        }
      }),
    (error) => error instanceof CommandRejectedError && error.code === "illegal_selection"
  );

  const final = resolve(state, {
    id: "cmd_final_verdict",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "final_verdict",
      sourceObjectId: "card_final_verdict_p1",
      selections: { target: ["minion_arena_ogre_p2"] }
    }
  });

  assert.equal(final.state.objects.minion_arena_ogre_p2?.zoneId, "zone_discard");
  assert.equal(final.state.objects.card_final_verdict_p1?.zoneId, "zone_discard");
  assert.equal(final.state.players.p1?.resources.mana.current, 7);
  assert.ok(final.events.some((event) => event.type === "object_destroyed"));

  const p2Summoned = resolve(state, {
    id: "cmd_p2_mirror_guard_for_verdict",
    type: "execute_behavior",
    playerId: "p2",
    payload: {
      behaviorId: "mirror_guard",
      sourceObjectId: "card_mirror_guard_p2"
    }
  });
  const tokenId = p2Summoned.state.zones.zone_board_p2?.objectIds.find((objectId) => objectId.startsWith("token_mirror_guard_"));

  assert.ok(tokenId);

  const quiet = resolve(p2Summoned.state, {
    id: "cmd_quiet_verdict",
    type: "execute_behavior",
    playerId: "p1",
    payload: {
      behaviorId: "quiet_verdict",
      sourceObjectId: "card_quiet_verdict_p1",
      selections: { target: [tokenId] }
    }
  });

  assert.equal(quiet.state.objects[tokenId]?.zoneId, "zone_discard");
  assert.equal(quiet.state.objects.minion_arena_ogre_p2?.zoneId, "zone_board_p2");
  assert.equal(quiet.state.players.p1?.resources.mana.current, 8);
  assert.equal(quiet.state.objects.card_quiet_verdict_p1?.zoneId, "zone_discard");
});

test("sample-basic-trio phase graph refreshes, draws, and opens a main prompt", () => {
  const state = setup({ p1Class: "mage", p2Class: "warrior", p1Mana: 0 });
  const run = runPhaseGraph(state, sampleBasicTrioPhaseGraph, {
    activePlayerId: "p1",
    behaviorLibrary: sampleBasicTrioBehaviors,
    outcomeMode: "last_alive",
    deathMode: "direct"
  });

  assert.equal(run.state.players.p1?.resources.mana?.current, 10);
  assert.equal(run.state.turn.phaseId, "main");
  assert.ok(Object.values(run.state.prompts).some((prompt) => prompt.promptType === "main_action" && prompt.status === "open"));
});
