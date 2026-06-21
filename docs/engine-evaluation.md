# Engine Evaluation

Status: dogfood evaluation after the Basic Trio expanded-class slice
Date: 2026-06-20

## Verdict

Millet is viable as a generalized prototype for multiplayer, turn-based card games. The kernel and ruleset model now support multiple distinct 1v1 card-game projects plus a Sanguosha-like multi-seat ruleset surface, and the Basic Trio dogfood proved several previously missing Hearthstone-like primitives: armor absorption, object damage, minion combat damage plus minion/hero freeze, matching-object area damage, matching-object freeze, deterministic random targeting, dynamic random-hit counts, object freeze/readiness cleanup, resource-gated hero freeze, identity-preserving object transform, object control change, stat-threshold and damaged object targeting, runtime token summon, selector-level Taunt routing, object healing, heal-triggered draw, dynamic stat expressions, numeric sum expressions, matching-object stat sums and stat cleanup, event-object trigger targeting, summon-trigger ready grants, continuous flat stat auras, targeted Battlecry minions, hidden-info-safe random hand copy, hand-to-weapon play, temporary hero-attack resources that stack with weapons and expire, charge-like ready buffs with turn-end expiry, ready-on-play minions, object-target UI selection with target-zone hints, presentation-authored multi-action card buttons, and a generic hand-to-board play pipeline.

It is not a production SDK yet. The strongest parts are deterministic match execution, content validation, replay/debug tooling, and ruleset-driven presentation. The weakest parts are no-code behavior authoring, a generic play/action planner, advanced card timing systems, and production multiplayer operations.

## Evaluation Matrix

| Area | Rating | Evidence | Main Gap |
| --- | --- | --- | --- |
| Core engine model | Strong | Event-sourced reducer, deterministic replay, zones, objects, resources, prompts, phase graphs, outcomes, projections, player damage buffers, object stat damage/healing, matching-player/object effects, event-recorded random choices including admin-only hidden choices, keyword-based object status, object transform, object control change, stat-threshold/damaged selectors, dynamic stat values including numeric sums, matching-object stat sums/adjustments, and continuous flat stat modifiers, dynamic random-hit counts, runtime object creation/copying, source-zone-checked object play into board and weapon zones, trigger payload filters, event-object trigger references, and selector-level protection rules. | More advanced timing, replacement/prevention effects, modifier layering/policies, and deeply nested response windows. |
| 1v1 ruleset portability | Strong | `sample-duel`, `sample-rune-duel`, and `sample-basic-trio` share engine primitives while using different cards, ids, layouts, presentation, playtests, health totals, mana caps, and targeting needs. | More examples with asymmetric decks, deckbuilding, and alternate win conditions. |
| Multi-player identity-game support | Promising | `sample-identity` covers eight seats, hidden roles, projection-safe previews, equipment, judgment, distance/range concepts, and response prompts. | Needs a full live Sanguosha-like runtime match, not only preview plus ruleset tests. |
| UI runtime generality | Improving | Runtime actions use presentation behavior metadata, core zones bind through board layout `dataSource.zoneType`, VFX reads behavior UX hints, `targetObject` mode can submit object selector ids from click/drag targeting, presentation can expose multiple action buttons for one card, object targeting can use zone-kind hints, and compact card rows now shrink within the viewport instead of covering neighboring regions. | Needs a rules-backed legal action planner, generalized multi-action lifecycle support across hand/board/equipment objects, and a unified runtime layout model that consumes authored region geometry directly. |
| Authoring experience | Partial | Studio supports assets, cards, presentation, hero ability badges, layout editing, preview fixtures, and playtest scripts. | Behavior authoring is still TypeScript-first; the no-code behavior DSL/editor remains the largest gap. |
| Assets and presentation | Good prototype | Asset manifests, generated art/VFX, card frames, crop controls, property badges, tooltips, and promotion flows are working. | Animation assets need a richer schema for timing, anchors, layers, and fallback behavior. |
| Testing and debugging | Strong | Local tests, ruleset validation, replay fixtures, dependency reports, browser smokes, authored playtest scripts, object/resource assertions, random choice/status assertions, transform/control/stat-threshold/healing assertions, and state diffs. | Need long-running multiplayer/session tests and compatibility tests for published content versions. |
| Production readiness | Early | HTTP APIs, SSE/WebSocket paths, projections, and command validation exist. | Needs auth, persistence, matchmaking, deployment, observability, migrations, and API stability policy. |

## Gaps Filled In The Latest Slice

- Player damage now consumes armor before health across targeted, all-player, and fatigue damage.
- Object damage is a first-class effect: `deal_damage_to_object` emits `damage_dealt`, changes object health via `object_stat_changed`, and destroys at zero.
- `deal_damage_to_matching_objects` applies the same object selector match semantics to a set of objects, enabling early Basic-style area damage to enemy minions or all board minions.
- The same matching-object machinery now drives all-enemy-minion freeze by combining keyword and exhaustion effects.
- `deal_damage_to_random_targets` picks from public player/object target pools using the match seed and `rngCursor`, emits `random_choice_made`, and then resolves ordinary damage events.
- `object_keyword_changed` plus matching-object exhausted/keyword effects support object freeze, readiness blocking, and turn-refresh thaw behavior.
- `transform_object` emits `object_transformed` and replaces an object's template, type, stats, counters, tags, keywords, attachments, modifiers, and exhausted state while preserving identity, owner, controller, and zone.
- `change_object_control` emits `object_control_changed`, preserves original owner, changes controller, and can move an object to the new controller's board.
- Object selectors now accept numeric stat filters such as `match.stats.attack.max` and `match.stats.attack.min`, enabling attack-threshold destroy spells.
- Object stats now support max/current health conventions, damaged selectors such as `health.lessThanStat: maxHealth`, object healing, and heal-triggered draw through trigger `eventMatch` filters.
- Numeric effect values can resolve from object stats/counters or player resources, enabling stat-derived attack amounts and health-doubling effects.
- Numeric effect values can sum other numeric values, enabling combined weapon plus temporary hero attack without card-specific damage code.
- Matching-object stat adjustments can clean up temporary attack buffs by selector at phase boundaries.
- Numeric effect values can resolve from sums of matching object stats, enabling Spell Power-like minions and dynamic random-hit counts without card-specific code.
- Triggered behaviors can reference the object that caused the matched event through `event_object`, enabling summon-trigger grants without card-specific glue.
- Continuous flat stat modifiers can derive effective object stats from matching source/target objects without rewriting base stats, enabling Raid Leader-like attack auras with automatic source-removal behavior.
- `deal_damage_to_matching_players` supports targetless enemy-player damage for character-wide area spells.
- Warrior-style `ring_sweep` and `split_strike` prove area damage can hit all minions and random object targeting can choose two enemy minions without replacement.
- Runtime token summon is data-defined through `create_object`, using normal zone capacity and replay validation.
- Selectors can express enemy object filters and `guardedBy` protection, enabling Taunt-style attack routing without card-specific code.
- Presentation and Studio runtime now recognize `targetObject`, so click/drag targeting can submit object selector ids; presentation can also filter object targets by zone kind for clearer valid-target highlights.
- `play_object` now moves a card-like object into a board zone, validates an optional source zone type such as `hand`, emits `object_played`, and can execute a Battlecry-style follow-up behavior.
- Targeted Battlecry minions can share command selections between the play behavior and follow-up behavior, proving play-from-hand plus immediate object-targeted side effects.
- `play_object` also supports hand-to-weapon-zone play for Basic Trio weapons, while zone capacity keeps illegal double-weapon states from slipping through.
- Multi-behavior card templates can express separate hero-target and object-target behaviors for one card, and presentation catalogs can expose those as multiple live buttons on the same card.
- Existing stat/exhaustion effects can express charge-like buffs that increase attack, ready a friendly minion, and expire the temporary attack bonus, though full summoning-sickness and attack-count semantics remain unresolved.
- Ready-on-play minions can enter the board unexhausted and attack immediately, and specialized minion attack behaviors can apply follow-up status such as freezing a damaged minion.
- Summon-trigger minions can register `object_played` listeners and grant readiness/keywords to newly played small minions.
- Temporary hero attack can be modeled as a player resource, spent through a guarded hero attack behavior, stacked with weapon attack through a numeric sum, and expired through a turn-end rules behavior.
- `resource_at_most` conditions plus a `heroFrozen` player resource can block weapon and hero-attack behaviors after hero-target freeze effects from spells or minion combat damage, then clear through a phase cleanup behavior.
- `copy_random_object_from_zone` creates a new object from a random source-zone card while keeping the random source choice admin-only and projecting the copied object according to its destination visibility.
- Playtest scripts can assert object stats and zone counts, so content can verify object-level effects through the browser panel.
- `sample-basic-trio` exercises these capabilities with original Mage/Warrior/Priest-style cards, Mage spell-power and hero-freeze playtests, a Neutral Battlecry playtest, Warrior area/random/edict/reaper/focus/focus-axe/rush-expiry/storm-runner/drummer/banner-aura playtests, Priest random-copy/control/verdict/bloom playtests, a board-tools/freeze playtest, Mage area/stasis-column/glacier/glacier-hero-freeze/random/transform playtests, and a neutral minion play smoke.
- The 2P card renderer now permits smaller card-width tokens and flex shrink, so compact hands stay inside their region instead of blocking adjacent deck controls.

## Remaining Product Gaps

1. Behavior authoring needs a designer-facing DSL/editor with generated text, UX hints, validation, simulation, and promotion.
2. Runtime actions need a legal action planner that asks the engine for legal sources, targets, costs, and reasons instead of relying on local target-mode hints.
3. Object cards need generalized multi-action UX beyond presentation-authored hints: cast at hero, cast at object, equip, attack hero, attack object, activated ability, triggered response, and inspect should be distinct affordances with engine-supplied legality and reasons.
4. The live 2P renderer still uses a token/grid layout path; authored region geometry powers the editor and absolute previews but is not yet the single runtime source of layout truth.
5. Hearthstone-like advanced primitives remain: richer Battlecry timing and hero-or-object target choice, exact freeze duration/character targeting semantics, transform death/replacement edge cases, advanced aura layering and max-health modifier policies, full charge/summoning-sickness and temporary-duration semantics, attack-count planning, and automatic effect-classification policies for modifiers.
6. Sanguosha-like live play needs richer timing windows, response chains, delayed trick resolution, death/rescue sequencing, role/team outcome rules, and seat/range UX.
7. Production multiplayer needs player projection sessions, reconnection, persistence, auth, matchmaking, observability, and replay/version retention.
8. Animation and asset UX should become schema-backed enough that authors can choose effect sheet, anchor, timing, sound, and fallback without client code edits.

## Recommendation

Use Millet now for engine prototyping, ruleset experiments, authoring workflow design, and local hotseat demos. The next milestone should split into two tracks: a rules-backed legal action planner for the 1v1 card UI, and a full live Sanguosha-like vertical slice. Those two tracks will expose the highest-risk parts of the northstar engine without losing the strong deterministic core that is already working.
