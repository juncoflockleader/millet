# Hearthstone Basic Trio Dogfood

Status: research complete; gap-fill slices implemented through object transform, control change, attack-threshold selectors, Warrior area/random spells, damaged/max-health tracking, object healing, heal triggers, dynamic stat values, hidden-info-safe random hand copy, matching-object freeze, high-damage area spells, minion-damage freeze, hand-to-weapon play, hero-attack resources, weapon-plus-hero-attack stacking, hero-freeze resource gating, minion-to-hero freeze, charge-like ready buffs with turn-end expiry, ready-on-play minions, matching-object stat-sum spell damage, matching-object stat cleanup, event-object trigger targeting, summon-trigger ready grants, continuous flat stat auras, targeted Battlecry minions, presentation-authored multi-action card buttons, and target-zone UI filters
Scope: behavior-equivalent dogfood for the early Hearthstone Basic card set, limited to Mage, Warrior, Priest, and neutral Basic cards.

## Intent

This dogfood is not a clone of Hearthstone. The goal is to use the early Basic set as a compact, well-known behavioral benchmark for Millet:

- Can the engine express simple class identity across three classes?
- Can it model early collectible-card-game primitives such as direct damage, draw, healing, weapons, minions, taunt, charge, battlecry, aura, freeze, transform, random targeting, and control change?
- Can Studio present those cards with original names and original generated art while preserving behavior/text/UX sync?

Millet content for this slice should use original names, original card art, and original setting flavor. Reference card names may appear in research notes only.

## Sources Read

- HearthstoneJSON historical collectible card data: `https://api.hearthstonejson.com/v1/6024/enUS/cards.collectible.json`
- HearthstoneJSON cross-check build: `https://api.hearthstonejson.com/v1/6898/enUS/cards.collectible.json`
- Hearthstone overview and release/background context: `https://en.wikipedia.org/wiki/Hearthstone`
- Basic/Classic/Core historical context: `https://en.wikipedia.org/wiki/Hearthstone_expansions`

The `6024` build contains 142 `CORE` collectible/Hero entries. For this dogfood, the relevant early Basic reference slice is:

- Mage: 10 collectible class cards plus hero.
- Warrior: 10 collectible class cards plus hero.
- Priest: 10 collectible class cards plus hero.
- Neutral: 43 collectible Basic minions.

## 6024 Basic Class Checklist

This table is the concrete behavior audit against HearthstoneJSON build `6024`. Reference names are research labels only; Millet content keeps original names and art.

### Mage

| Reference | Behavior shape | Millet status |
| --- | --- | --- |
| Hero power | 2 mana, deal 1 damage. | Covered by `ember_ping` against enemy hero. |
| Arcane Missiles | 3 random damage split among enemy characters. | Covered by `cinder_sparks` with deterministic random player/object target pools. |
| Mirror Image | Summon two 0/2 Taunt minions. | Covered by `mirror_guard` and `mirror_guard_token`. |
| Arcane Explosion | Deal 1 damage to all enemy minions. | Covered by `ember_wave`. |
| Frostbolt | Deal 3 damage to a character and Freeze it. | Partial: `frost_pin` covers enemy minion damage/freeze and `frost_pin_hero` covers enemy hero damage/freeze with weapon/hero-attack gating; live cards expose Minion/Hero actions, but exact timing remains a gap. |
| Arcane Intellect | Draw 2 cards. | Covered by `study_scroll`. |
| Frost Nova | Freeze all enemy minions. | Covered by `winter_stasis` using matching-object keyword and exhaustion effects. |
| Fireball | Deal 6 damage to a target. | Covered for the current dogfood scope: `ember_lance` exposes Hero and Minion actions, with board-only object targeting for the minion path. A rules-backed legal planner is still future work. |
| Polymorph | Transform a minion into a 1/1. | Covered by `null_form` and `training_spark`. |
| Water Elemental | Minion that freezes damaged characters. | Partial: `glacier_warden` covers minion combat damage freezing enemy minions and enemy heroes; exact timing and multi-action UX remain gaps. |
| Flamestrike | Deal 4 damage to all enemy minions. | Covered by `ember_column`. |

### Warrior

| Reference | Behavior shape | Millet status |
| --- | --- | --- |
| Hero power | 2 mana, gain 2 armor. | Covered by `vanguard_armor`. |
| Execute | Destroy a damaged enemy minion. | Covered by `battle_edict` using `health.lessThanStat: maxHealth`. |
| Whirlwind | Deal 1 damage to all minions. | Covered by `ring_sweep`. |
| Cleave | Deal 2 damage to two random enemy minions. | Covered by `split_strike` with deterministic random object targets and no replacement. |
| Fiery War Axe | 3/2 weapon. | Covered by `forge_axe` runtime weapon. |
| Heroic Strike | Give hero +4 attack this turn. | Partial: `battle_focus` grants a temporary hero-attack resource that can be spent as hero damage, stacks with weapon damage, and expires at turn end; full hero combat planner and attack-count semantics remain gaps. |
| Charge | Give a friendly minion +2 attack and Charge. | Partial: `battle_rush` adjusts attack, readies a friendly minion, and expires the +2 Attack at turn end; full charge/summoning-sickness and attack-count semantics are not complete. |
| Shield Block | Gain 5 armor and draw a card. | Covered by `guard_stance`. |
| Warsong Commander | Summon trigger that grants Charge to small minions. | Partial: `war_drummer` registers an `object_played` trigger and readies small minions through `event_object`; full continuous aura/recalculation/removal semantics remain gaps. |
| Kor'kron Elite | Charge minion. | Partial: `storm_runner` enters ready and can attack immediately; full charge/summoning sickness model is still incomplete. |
| Arcanite Reaper | 5/2 weapon. | Covered by `heavy_reaper`, including hand-to-weapon play and durability spending. |

### Priest

| Reference | Behavior shape | Millet status |
| --- | --- | --- |
| Hero power | 2 mana, restore 2 health. | Covered by `oracle_restore` for player health. |
| Holy Smite | Deal 2 damage. | Covered by `dawn_smite` against enemy hero. |
| Mind Vision | Copy a random card from opponent hand. | Covered by `mind_glimpse` using hidden-info-safe random hand copy. |
| Northshire Cleric | Draw when a minion is healed. | Covered by `dawn_cleric` through object healing plus trigger `eventMatch`. |
| Power Word: Shield | Give a minion +2 health and draw. | Covered by `aegis_word`, updating current/max health and drawing. |
| Divine Spirit | Double a minion's health. | Covered by `spirit_echo` using dynamic object-stat value expressions. |
| Mind Blast | Deal 5 damage to enemy hero. | Covered by `mind_spark`. |
| Shadow Word: Pain | Destroy a minion with 3 or less attack. | Covered by `quiet_verdict` using `match.stats.attack.max`. |
| Shadow Word: Death | Destroy a minion with 5 or more attack. | Covered by `final_verdict` using `match.stats.attack.min`. |
| Holy Nova | Damage all enemies, heal friendly characters. | Covered by `holy_bloom` using matching-player damage, enemy minion damage, player healing, and friendly minion healing. |
| Mind Control | Take control of an enemy minion. | Covered by `borrowed_command`. |

## Reference Behavior Groups

The early Basic slice is more useful as behavior groups than as a one-to-one card-name checklist.

| Group | Reference Examples | Needed Engine Capability | Current Millet Status |
| --- | --- | --- | --- |
| Hero-only damage spells | Fireball-like, Holy Smite-like, Mind Blast-like | Spend mana, select enemy hero, deal damage, discard source. | Supported. |
| Card draw spells | Arcane Intellect-like, Shield Block-like draw side effect | Draw N cards from owner deck to hand, fatigue on empty deck. | Supported. |
| Player and object healing | Priest hero power-like, healing spell portions | Restore health up to max/current limits. | Supported for players via `heal` and for minions via `heal_object` / `heal_matching_objects` with `maxHealth`. |
| Weapons | Fiery War Axe-like, Arcanite Reaper-like | Equip weapon, attack, spend durability, destroy at zero. | Supported for hero-only weapon attacks and hand-to-weapon play; replacement/action-switching UX is still partial. |
| Vanilla minions | Boulderfist Ogre-like neutral bodies | Template stats, board zones, display attack/health. | Supported for runtime object stats including `maxHealth`, hand-to-board play, and single-target combat; full attack exchange is still partial. |
| Direct minion damage | Arcane Explosion-like, Whirlwind-like, Stormpike-like | Damage objects, track current health, kill at zero. | Supported for single-object damage via `deal_damage_to_object`, matching-object area damage via `deal_damage_to_matching_objects`, and repeated random target damage via `deal_damage_to_random_targets`. |
| Random targeting | Arcane Missiles-like, Cleave-like | Deterministic RNG selectors, repeated random legal targets. | Supported for public player/object target pools with `random_choice_made` events and replayed `rngCursor`. Hidden-info random copying uses the separate projection-safe copy primitive below. |
| Summoning/token creation | Mirror Image-like, Murloc Tidehunter-like | Runtime object creation from templates, board capacity enforcement. | Supported through `create_object` and zone capacity enforcement. |
| Taunt and attack routing | Taunt minions | Legal target filtering based on defender board state. | Supported for selector-level attack routing with `guardedBy`. |
| Charge and summoning sickness | Charge minions or buffs | Per-object attack readiness and turn-entered state. | Partial: exhausted/readiness effects can enable immediate attacks, ready-on-play minions, charge-like buffs, and turn-end attack-buff cleanup; no full summoning-sickness or attack-count planner yet. |
| Freeze | Frostbolt/Frost Nova/Water Elemental-like | Status on hero/minion preventing next attack, with turn-based cleanup. | Partial: object freeze uses `frozen` keyword, readiness checks, matching-object freeze, and refresh cleanup; hero freeze uses `heroFrozen` plus `resource_at_most` attack gates and turn-end cleanup from both spells and minion combat damage. Exact character-target timing remains a gap. |
| Transform | Polymorph-like | Replace an object template/stats/tags while preserving object identity or replacement semantics. | Supported for identity-preserving object transforms via `transform_object` and `object_transformed`; richer death/replacement edge cases remain future work. |
| Attack-threshold targeting | Shadow Word-like | Legal object selectors based on numeric stats. | Supported through `match.stats` filters such as `attack.max` and `attack.min`. |
| Damaged targeting and health buffs | Execute-like, Power Word: Shield-like, Divine Spirit-like | Current/max health, damaged selectors, stat adjustment, dynamic stat expressions. | Supported through `maxHealth`, `health.lessThanStat`, `adjust_object_stat`, and dynamic `set_object_stat` values. |
| Heal triggers | Northshire Cleric-like | Trigger only after a minion is healed. | Supported with `heal_object`, `heal_matching_objects`, and trigger `eventMatch` on `object_stat_changed` reason/stat/object filters. |
| Auras and continuous modifiers | Raid Leader-like, Stormwind Champion-like, Warsong Commander-like | Ongoing modifiers, attack recalculation, summon-triggered grants. | Partial: `banner_captain` proves continuous flat attack auras through derived effective stats, and `war_drummer` proves summon-triggered grants through `event_object`; layered modifiers, health/max-health aura edge cases, and richer removal/timing policies remain gaps. |
| Battlecry | Elven Archer-like, Shattered Sun Cleric-like | Trigger behavior when a card is played from hand. | Partial: `needle_scout` proves a target-object Battlecry minion using `play_object` follow-up behavior and shared selections. Full legal play/action UX, hero-or-object target choice, optional Battlecry targets, and richer timing variants remain gaps. |
| Copy/random hand effects | Mind Vision-like | Hidden-info-safe random copy from opponent hand. | Supported for one-card random copy through `copy_random_object_from_zone`, which emits admin-only random choice events and owner-visible copied objects without leaking the source card to non-owners. |
| Control change | Mind Control-like | Change controller and move enemy object to friendly board. | Supported via `change_object_control` and `object_control_changed`, preserving owner while changing controller and optionally moving zones. |
| Armor | Warrior hero power / Shield Block-like | Armor resource that absorbs damage before health. | Supported for targeted, all-player, and fatigue player damage. |
| Temporary hero attack | Heroic Strike-like | Add hero attack for a turn and spend it through hero combat. | Partial: supported as a player resource that stacks with weapon attacks, can be spent through a guarded hero attack behavior, and expires at turn end; attack-count planning and a full hero combat planner remain gaps. |
| Spell damage | Kobold/Ogre/Archmage-like | Dynamic spell amount/count modifiers from board objects. | Supported through `matching_object_stat_sum`, used by Mage spell amounts and random-hit counts from `spellPower` minions on board. |

## Original Trio Shape

Use behavior-equivalent original card identities instead of official names:

| Reference Class | Millet Class Name | Hero Power Shape | Initial Implementable Cards |
| --- | --- | --- | --- |
| Mage | Ember Scholar | 2 mana: deal 1 to enemy hero. | `ember_lance` (4 mana, deal 6, with a separate minion-target behavior), `study_scroll` (3 mana, draw 2), `mirror_guard` (summon two 0/2 Taunt tokens), `frost_pin` / `frost_pin_hero` (deal 3 and freeze an enemy minion or hero), `winter_stasis` (freeze all enemy minions), `glacier_warden` (3/6 minion whose attack freezes damaged enemy minions or heroes), `spark_adept` (2/2 Spell Power +1 minion), `null_form` (transform an enemy minion into a 1/1), `ember_wave` (deal 1 to all enemy minions), `ember_column` (deal 4 to all enemy minions), `cinder_sparks` (three random 1-damage hits plus Spell Power count scaling). |
| Warrior | Iron Vanguard | 2 mana: gain 2 armor. | `forge_axe` (3 attack, 2 durability weapon), `heavy_reaper` (5 attack, 2 durability weapon), `battle_focus` (+4 hero attack resource that stacks with weapons, can attack alone, and expires), `battle_rush` (+2 attack this turn and ready a friendly minion), `storm_runner` (ready 4/3 minion), `war_drummer` (summon-trigger ready grant for small minions), `guard_stance` (gain armor and draw), `ring_sweep` (deal 1 to all minions), `split_strike` (2 random enemy minions), `battle_edict` (destroy a damaged enemy minion). |
| Priest | Dawn Oracle | 2 mana: restore 2 health. | `dawn_smite` (1 mana, deal 2), `mind_glimpse` (copy a random opponent hand card), `mind_spark` (2 mana, deal 5 to enemy hero), `dawn_cleric` (heal-triggered draw minion), `aegis_word` (+2 health and draw), `spirit_echo` (double health), `holy_bloom` (enemy damage plus friendly healing), `quiet_verdict` (destroy low-attack minion), `final_verdict` (destroy high-attack minion), `borrowed_command` (take control of an enemy minion). |

Neutral first pass:

- `river_guard`: simple 2/3 minion body.
- `needle_scout`: 1/1 neutral Battlecry minion that deals 1 damage to a selected enemy minion when played.
- `spark_adept`: 2/2 Spell Power +1 minion with a top-right spell-power property badge.
- `banner_captain`: 2/2 neutral aura minion that grants other friendly minions +1 Attack through a continuous stat modifier.
- `arena_ogre`: simple 6/7 minion body.
- `mirror_guard_token`: generated 0/2 Taunt token created at runtime.

This intentionally uses a compact behavior subset, then keeps the unsupported reference groups as the gap backlog.

## Implemented Dogfood Slice

`packages/rulesets/sample-basic-trio/` now contains the first executable subset:

- `Ember Lance`: Mage-style 4-mana direct hero damage.
- `Ember Lance Minion`: a second behavior for the same card template that can deal 6 damage to an enemy minion. The live presentation exposes Hero and Minion action buttons for the same hand card.
- `Study Scroll`: Mage-style draw 2.
- `Mirror Guard`: Mage-style token summon using runtime `create_object`.
- `Frost Pin`: Mage-style single-object minion damage and object freeze using `deal_damage_to_object`, `set_object_keyword`, and `set_object_exhausted`.
- `Frost Pin Hero`: second behavior for the same card template that deals hero damage, sets a `heroFrozen` resource, and proves weapon/hero attacks can be blocked by a shared condition.
- `Winter Stasis`: Mage-style all-enemy-minion freeze using matching-object keyword and exhaustion effects.
- `Glacier Warden`: Mage-style 3/6 minion whose attacks damage and freeze enemy minions through object keywords or enemy heroes through the shared `heroFrozen` resource gate.
- `Null Form`: Mage-style transform using `transform_object` and `object_transformed`, turning an enemy minion into a 1/1 `Training Spark` while preserving object id, owner, controller, and board zone.
- `Ember Wave`: Mage-style area minion damage using `deal_damage_to_matching_objects`.
- `Ember Column`: Mage-style high-damage enemy-minion area spell using the same matching-object damage primitive at a larger amount.
- `Cinder Sparks`: Mage-style repeated random enemy damage using `deal_damage_to_random_targets`, dynamic random-hit count, and `random_choice_made`.
- `Spark Adept`: neutral Spell Power minion whose `spellPower` stat is displayed on-card and read by Mage spell value/count expressions while it remains on board.
- `Forge Axe`: Warrior-style equipped weapon attack with two durability.
- `Heavy Reaper`: Warrior-style 5/2 weapon that can be played from hand into the weapon zone and then spend durability through normal weapon attacks.
- `Battle Focus`: Warrior-style hero-attack spell that adds a temporary player attack resource, stacks it with weapon damage, spends it through hero/weapon attacks, and expires it at turn end.
- `Battle Rush`: Warrior-style charge buff approximation that adjusts a friendly minion's attack, readies it for another attack, marks the buff as temporary, and removes the attack bonus at turn end.
- `Storm Runner`: Warrior-style ready-on-play 4/3 minion that can attack immediately after being played.
- `War Drummer`: Warrior-style summon trigger that uses `event_object` to ready and tag a newly played small minion.
- `Banner Captain`: neutral flat attack aura minion; friendly other minions keep base stats but attack with derived effective Attack while the source remains on board.
- `Guard Stance`: Warrior-style armor gain plus draw. Armor now absorbs player damage before health.
- `Ring Sweep`: Warrior-style all-minion area damage using `deal_damage_to_matching_objects`.
- `Split Strike`: Warrior-style random two-enemy-minion damage using `deal_damage_to_random_targets` without replacement.
- `Battle Edict`: Warrior-style damaged-enemy-minion destroy using `maxHealth` plus `health.lessThanStat`.
- `Dawn Smite`: Priest-style low-cost direct hero damage.
- `Mind Glimpse`: Priest-style random opponent-hand copy using `copy_random_object_from_zone`, admin-only RNG visibility, and owner-visible copied card projection.
- `Mind Spark`: Priest-style enemy-hero burst damage.
- `Dawn Cleric`: Priest-style 1/3 minion that registers a heal-triggered draw with event payload filtering.
- `Aegis Word`: Priest-style +2 Health plus draw, updating current and max health.
- `Spirit Echo`: Priest-style health doubling using dynamic object-stat value expressions.
- `Holy Bloom`: Priest-style enemy-wide damage plus friendly character healing.
- `Quiet Verdict` and `Final Verdict`: Priest-style attack-threshold destroy spells using selector `match.stats`.
- `Borrowed Command`: Priest-style control change using `change_object_control` and `object_control_changed`, moving an enemy minion to the caster board while preserving original owner.
- `River Guard` and `Arena Ogre`: neutral minion bodies with hero attacks plus test-covered minion-target attack variants.
- `River Guard`: neutral minion play from hand to board using the generic `play_object` effect and `object_played` event.
- `Needle Scout`: neutral Battlecry minion that is played from hand, then immediately damages a selected enemy minion through a follow-up behavior using the same command selections.
- `targetObject` UI mode: presentation can select an object target, filter targets by zone kind, and submit object selector ids from click/drag targeting.
- Hero powers for Ember Scholar, Iron Vanguard, and Dawn Oracle.
- Playtest scripts for one Mage, one Warrior, one Priest behavior, plus Mage spell-power/hero-freeze, Neutral Battlecry, Warrior area/random/edict/reaper/focus/focus-axe/rush-expiry/storm-runner/drummer/banner-aura, Priest control/verdict/bloom, Mage board-tools/freeze, Mage area/stasis-column/glacier/glacier-hero-freeze/random/transform, and neutral minion play scripts.
- Compact 2P card rows can shrink below the default card width so the hand stays inside the viewport and does not block neighboring deck controls.

Known first-slice compromises:

- Weapon cards start in the weapon zone for runtime testing. The UI cannot yet use one template behavior while the card is in hand and a different behavior once it is equipped.
- Presentation catalogs can now expose multiple authored live actions for one card and filter object targets by zone kind, as shown by `Ember Lance` and `Frost Pin`. This is still a presentation-authored hint layer, not a rules-backed legal action planner.
- Hero freeze is currently modeled as a `heroFrozen` resource cleared at turn end; this proves shared attack gating but is not yet a full Hearthstone-equivalent character-status/timing system.
- The generic play pipeline is engine-backed and test-covered, but the live UI still needs a legal action planner before it can reliably expose play/attack/ability choices for every object.
- `Banner Captain` proves a flat continuous stat aura, not a complete modifier layer; ordering/layering, conditional self-referential modifiers, and max-health aura edge cases remain open.
- The Studio presentation is currently player-position based (`p1`/`p2`), not dynamically class based.
- The live 2P board still uses token/grid layout for runtime rendering; authored region geometry is visible to the layout editor and absolute previews, but it is not yet the only layout source for playable 2P matches.
- The first generated art pass covers the reserved card-art assets, but animation/VFX authoring still needs richer schema-backed timing and anchor controls.

## Generated Card Art Assets

The Basic Trio card-art assets were generated with the built-in image generation tool on 2026-06-20 and saved into `packages/demo-basic-duel/public/assets/cards/basic-trio/`. The asset manifest records real SHA-256 hashes, dimensions, and `memory://sample-basic-trio/imagegen-20260620/...` source URIs.

Generated files:

- `ember-lance.png`
- `ember-wave.png`
- `cinder-sparks.png`
- `winter-stasis.png`
- `ember-column.png`
- `glacier-warden.png`
- `spark-adept.png`
- `frost-pin.png`
- `null-form.png`
- `study-scroll.png`
- `forge-axe.png`
- `heavy-reaper.png`
- `guard-stance.png`
- `ring-sweep.png`
- `split-strike.png`
- `battle-edict.png`
- `battle-rush.png`
- `battle-focus.png`
- `storm-runner.png`
- `war-drummer.png`
- `banner-captain.png`
- `dawn-smite.png`
- `mind-spark.png`
- `mind-glimpse.png`
- `dawn-cleric.png`
- `aegis-word.png`
- `spirit-echo.png`
- `holy-bloom.png`
- `quiet-verdict.png`
- `final-verdict.png`
- `borrowed-command.png`
- `river-guard.png`
- `needle-scout.png`
- `arena-ogre.png`

The prompts remain in `packages/rulesets/sample-basic-trio/asset-manifest.json` for reproducibility.

## Original Prompt Seeds

### Ember Scholar Spell

Create an original mage spell card illustration for a behavior-equivalent basic-set dogfood card: a precise burst of blue-white arcane energy striking across a training arena. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Ember Scholar Area Spell

Create original card art for a Mage-style early-basic area damage spell named Ember Wave: a low sweeping crescent of blue-orange arcane fire rolling across a training arena floor. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Ember Scholar Random Spell

Create original card art for a Mage-style early-basic random damage spell named Cinder Sparks: three bright blue-orange arcane sparks ricocheting unpredictably through a stone training arena toward abstract enemy targets. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Ember Scholar Freeze Spell

Create original card art for a Mage-style early-basic freeze spell named Frost Pin: a sharp blue-white frost sigil pinning an abstract training minion in place on a stone arena floor, with crystalline ice spreading from the impact. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Neutral Spell-Power Minion

Create original card art for a neutral spell-power minion named Spark Adept: a battlefield scholar holding a hovering blue-white rune lantern that amplifies nearby magic in a stone practice arena. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable franchise symbols.

### Ember Scholar Transform Spell

Create original card art for a Mage-style early-basic transform spell named Null Form: a blue-white null sigil collapsing a large training-arena minion into a small arcane spark. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Iron Vanguard Weapon

Create an original warrior weapon card illustration for a behavior-equivalent basic-set dogfood card: a sturdy practice axe glowing with disciplined battle energy. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Iron Vanguard Area And Random Strikes

Create original card art for a Warrior-style early-basic all-minion damage spell named Ring Sweep: a disciplined warrior sweeping a practice axe in a full circular arc, sending a bronze shockwave across multiple training minions. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

Create original card art for a Warrior-style early-basic random enemy-minion strike named Split Strike: one axe swing creating two crossing bronze blade arcs toward two different enemy training minions. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Iron Vanguard Summon Trigger

Create original card art for a Warrior-style summon-trigger minion named War Drummer: a disciplined arena captain beating a bronze war drum that rallies small recruits into motion. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable franchise symbols.

### Neutral Attack Aura Minion

Create original card art for a neutral aura minion named Banner Captain: a disciplined adult banner-bearing field captain holding a tall blue-and-bronze rally standard that inspires nearby adult fighters in a stone training arena. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable franchise symbols.

### Neutral Battlecry Minion

Create original card art for a neutral Battlecry minion named Needle Scout: a nimble adult scout in light leather-and-cloth armor flicking a glowing silver training needle toward a target dummy in a stone training arena. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable franchise symbols.

### Dawn Oracle Spell

Create an original priest healing/damage spell card illustration for a behavior-equivalent basic-set dogfood card: ivory-gold light restoring an abstract ally sigil while threatening a shadowed target. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Dawn Oracle Control Spell

Create original card art for a Priest-style early-basic control spell named Borrowed Command: an ivory-gold command sigil guiding a large training minion from an opposing circle into the caster's control. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

### Dawn Oracle Verdict Spells

Create original card art for a Priest-style early-basic low-attack destroy spell named Quiet Verdict: a modest training minion kneeling inside a calm ivory-gold verdict circle and dissolving into motes. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

Create original card art for a Priest-style early-basic high-attack destroy spell named Final Verdict: a towering training minion halted by a monumental ivory-gold verdict sigil in a stormy stone arena. Use a vertical portrait card-art crop, no card frame, no text, no logo, and no recognizable Hearthstone/Warcraft characters or symbols.

## Implementation Plan

1. Done: add `sample-basic-trio` as a new ruleset and Studio project.
2. Done: implement the directly supported behavior subset:
   - hero-only damage spells
   - draw spells
   - player healing
   - armor as a visible resource with damage absorption
   - weapon equip/attack/durability
   - simple minion bodies, single-object damage, minion combat damage plus minion/hero freeze, multi-behavior object/hero-target damage, matching-object area damage, matching-object freeze, deterministic repeated random damage, dynamic random-hit counts, object freeze/readiness cleanup, hero-freeze attack gating, object transform, control change, attack-threshold selectors, damaged selectors, object healing, heal triggers, dynamic stat values, numeric sum expressions, matching-object stat-sum spell damage, matching-object stat cleanup, event-object trigger targeting, summon-trigger ready grants, continuous flat stat auras, targeted Battlecry minions, runtime token summon, hand-to-weapon play, hero-attack resources, weapon-plus-hero-attack stacking, charge-like ready buffs with turn-end expiry, ready-on-play minions, and selector-level Taunt routing
3. Done: add tests that prove Mage, Warrior, and Priest class cards can each execute through the real engine.
4. Done: add authored playtest scripts for one Mage spell, one Warrior weapon, one Priest spell, Mage spell-power, Neutral Battlecry, Warrior area/random/edict/drummer/banner-aura, Priest control/verdict/bloom, Mage board-tools/freeze, Mage area, Mage random, Mage transform, and neutral minion play scripts.
5. Done: save generated art assets into `packages/demo-basic-duel/public/assets/cards/basic-trio/` and replace pending manifest hashes with real hashes.
6. Pending: expand the remaining gap table: richer Battlecry timing/target flexibility, exact freeze timing/character targeting, full charge/summoning-sickness semantics, advanced modifier layering/policies, hero/minion attack-count planning, legal action planning, and generalized multi-action UX beyond presentation-authored hints.
