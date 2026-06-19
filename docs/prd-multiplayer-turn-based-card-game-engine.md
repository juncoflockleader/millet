# PRD: Multiplayer Turn-Based Card Game Engine

## 1. North Star

Millet is a generalized and versatile card game engine for building deterministic, multiplayer, turn-based card games without hardcoding a single game's rules into the engine.

The engine should let designers define games as versioned rulesets, cards, assets, zones, phases, triggers, actions, win conditions, visibility rules, and UX hints. The MVP must prove this generality by supporting two very different reference modes:

- A Hearthstone-like 2 player digital card battler.
- A 三国杀-like 6-8 player hidden-role identity card game.

The product is not a clone of either reference game. These games are used as rule-shape stress tests for the engine.

## 2. Research Summary

### Hearthstone-like Base Mode

Relevant observed mechanics:

- 1v1 turn-based match between two opponents.
- Each player has a hero; the default hero health target is 30.
- A prebuilt deck contains 30 cards.
- Players take turns playing cards, using a hero power, attacking with minions, and sometimes attacking with a hero weapon.
- Mana crystals act as the main turn resource, generally increasing by one each turn up to 10 and refilling at the start of each turn.
- Common card types include minions, spells, weapons, hero cards, and locations.
- Keywords and abilities include triggered effects, ongoing effects, and shorthand rules text such as Battlecry and Deathrattle.
- The match usually ends when a hero reaches 0 health, a player concedes/leaves, both heroes die simultaneously, or a hard turn cap/draw condition is reached.
- Running out of deck does not immediately lose the match; later draws cause escalating fatigue damage.

Engine implications:

- Strong support for 2 player symmetric games.
- Personal decks, hands, boards, heroes, weapons, resources, and fatigue.
- Start-of-game mulligan and special compensation for second player.
- No general "opponent response stack" during the active player's turn, but rich triggered effects still occur.
- Strict deterministic event ordering for simultaneous deaths, death triggers, and generated effects.

### 三国杀-like Identity Mode

Relevant observed mechanics:

- Standard identity play supports 4-10 players; the MVP target is 6-8 players.
- Identity roles include 主公, 忠臣, 反贼, and 内奸.
- Common 6 player identity distribution: 1 主公, 1 忠臣, 3 反贼, 1 内奸. Some variants use 1 主公, 1 忠臣, 2 反贼, 2 内奸.
- Common 8 player identity distribution: 1 主公, 2 忠臣, 4 反贼, 1 内奸. Some variants use 1 主公, 2 忠臣, 3 反贼, 2 内奸.
- Standard card classes include identity cards, health cards, character cards, and game cards. Game cards include basic cards, trick cards, and equipment cards. Equipment can include weapons, armor, mounts, and treasures.
- The rules shape includes seating order, turn phases, attack distance/range, card suits/ranks, delayed effects, equipment zones, response windows, and character skills.
- Win conditions are role-specific:
  - 主公 wins when all 反贼 and 内奸 are dead.
  - 忠臣 shares the 主公 objective, with 主公 alive.
  - 反贼 wins when 主公 dies, except special endgame cases where only 主公 and one 内奸 remain.
  - 内奸 wins only by becoming the final survivor after all 忠臣, 反贼, and other 内奸 are dead, then killing 主公 last.
- Player death and reward/penalty rules matter. For example, killing a 反贼 can grant cards, while 主公 killing 忠臣 can discard all cards.

Engine implications:

- Hidden identity and role-based win predicates are first-class requirements.
- Player "dead" is not equivalent to "lost"; dead players can still belong to a winning faction.
- The outcome resolver must allow multiple winners, asymmetric winners, delayed winner declaration, and role-specific edge cases.
- The engine must model death, dying/rescue windows, role reveal, skipped turns, and continued spectatorship.
- Multiplayer turn order must support circular seating and dynamic removal of dead players.
- Per-player information visibility is as important as game state.

Sources are listed in section 18.

## 3. Product Goals

1. Define card games through data and behavior definitions, not hardcoded game-specific branches.
2. Run authoritative, deterministic multiplayer matches on the server.
3. Support live, turn-based play with reconnects, spectators, timers, and resumable game state.
4. Provide a safe behavior system for complex card effects, skills, triggers, and response windows.
5. Keep card behavior, human-readable card text, UX prompts, logs, and tests synchronized.
6. Manage game assets and rulesets as versioned, publishable, rollbackable bundles.
7. Enable designers to iterate on cards and rules without shipping new client code for every content change.

## 4. Non-Goals For MVP

- No trading, marketplace, crafting economy, or monetization system.
- No proprietary Hearthstone or 三国杀 content, names, art, or exact card sets.
- No real-money esports, anti-cheat operations, or ranked ladder beyond basic match history.
- No full AI opponent or deck-building optimizer.
- No offline physical-card companion app.
- No unreviewed LLM-generated card behavior in production.

## 5. Target Users

- Game designer: creates rulesets, cards, factions, characters, win conditions, and balance changes.
- Gameplay engineer: extends engine primitives and validates deterministic runtime behavior.
- Content producer: imports card art, audio, visual effects, translations, and metadata.
- UX/client engineer: consumes engine-authored UX hints for prompts, targeting, animations, logs, and tooltips.
- Server/operator: deploys ruleset versions, monitors live games, resolves stuck matches, and rolls back content.
- Player: joins games, takes turns, responds to prompts, dies, spectates, reconnects, and receives clear outcomes.

## 6. MVP Scope

The MVP is complete when a single engine can run both reference modes from ruleset definitions:

1. Hearthstone-like 2 player mode with heroes, 30 card decks, mana, minions, spell-like cards, equipment/weapon-like cards, triggered effects, fatigue, and hero death win conditions.
2. 三国杀-like 6-8 player identity mode with seating, hidden roles, shared deck, character health, turn phases, basic/trick/equipment cards, response windows, dying/rescue, death, role-specific victory, and role reveal.
3. Versioned card and asset catalog with validation, publishing, rollback, and deterministic replay compatibility.
4. Behavior definition format with static validation, simulation tests, generated UX metadata, and description consistency checks.
5. Server-authoritative match runtime with reconnect-safe event log.

## 7. Core Concepts

### Game Definition

A `GameDefinition` is a versioned bundle containing:

- Game metadata: id, name, version, locale defaults, supported clients.
- Player config: min/max players, teams, identities, seats, visibility defaults.
- Zone config: deck, hand, board, discard, graveyard, equipment, role, character, judgment, secrets, exile, token zones.
- Object schemas: player, hero, character, card, token, attachment, enchantment, delayed effect.
- Turn structure: phase graph, timers, action windows, response windows.
- Resources: mana, health, armor, durability, attack quota, hand limit, distance, action points.
- Rules modules: draw, shuffle, mulligan, targeting, damage, death, rescue, fatigue, discard, equip, summon.
- Win/lose predicates: global and role-specific.
- Card catalog references.
- Asset bundle references.
- Behavior library and script sandbox settings.

### Match State

Match state must be:

- Serializable.
- Deterministic from initial seed plus event log.
- Partitionable by player visibility.
- Rehydratable after reconnect or server restart.
- Diffable for debugging and spectator playback.

State includes:

- Match metadata, seed, ruleset version, asset version.
- Players and seats.
- Player statuses: active, alive, dying, dead, conceded, disconnected, spectator.
- Role/identity assignments and visibility.
- Zones and card instance ids.
- Public and private object attributes.
- Current turn, phase, active player, pending prompts, timers.
- Event history and outcome history.

### Card Template vs Card Instance

Card templates define reusable content. Card instances are runtime objects.

Template fields:

- Stable id.
- Version.
- Names and localized names.
- Type, subtype, tags, keywords.
- Cost/resource fields.
- Static stats.
- Rules text.
- Behavior reference.
- Asset references.
- Deck-building constraints.
- Balance and availability metadata.

Instance fields:

- Runtime id.
- Owner, controller, creator.
- Current zone.
- Current stats and counters.
- Current visibility.
- Attachments, enchantments, copied text.
- Exhaustion/ready state.
- Per-turn usage counters.
- Runtime flags.

## 8. Player Life, Death, And Outcomes

### Player Status Model

The engine must separate physical participation from game outcome.

Required statuses:

- `alive`: can take turns and be targeted unless rules say otherwise.
- `dying`: temporary state entered when health is at or below a threshold and rescue responses may occur.
- `dead`: removed from normal turn order and normal targeting.
- `conceded`: player voluntarily exits; mapping to death/loss is ruleset-defined.
- `disconnected`: absent but may reconnect; timers and auto-actions are ruleset-defined.
- `spectating`: can observe according to visibility rules.
- `eliminated`: no longer eligible for individual victory, if the ruleset distinguishes this from dead.

### Outcome Model

Outcomes must be explicit objects, not booleans:

```yaml
outcome:
  matchStatus: completed
  results:
    - playerId: p1
      status: won
      reason: "opponent_hero_destroyed"
      faction: "blue"
    - playerId: p2
      status: lost
      reason: "hero_destroyed"
      faction: "red"
```

Required result statuses:

- `won`
- `lost`
- `draw`
- `no_contest`
- `pending`

The resolver must support:

- Single winner.
- Team/faction winners.
- Multiple winners.
- Dead winners.
- Simultaneous death draws.
- Role-specific edge cases.
- Concession rules.
- Turn cap rules.

### Death Flow Requirements

Generic death flow:

1. Damage or loss of health modifies health.
2. If health is at or below the configured threshold, emit `DyingStarted`.
3. Open zero or more rescue/response windows.
4. If rescued, emit `DyingResolved` and continue.
5. If not rescued, emit `PlayerDeathStarted`.
6. Apply death replacement/prevention effects.
7. Move cards and attachments according to ruleset.
8. Reveal role if configured.
9. Apply killer rewards/penalties if configured.
10. Remove from turn order if configured.
11. Run win condition check.
12. Emit visible death and outcome events.

This flow is required for 三国杀-like play and should also handle Hearthstone-like hero death.

## 9. Turn And Action System

### Phase Graph

The engine must support linear and branching phase graphs.

Hearthstone-like phase graph:

```text
match_start -> mulligan -> turn_start -> resource_refresh -> draw -> main -> turn_end -> next_turn
```

三国杀-like phase graph:

```text
match_start -> role_setup -> character_setup -> seat_1_turn
turn_start -> prepare -> judgment -> draw -> play -> discard -> finish -> next_alive_seat
```

The phase graph must allow:

- Phase replacement.
- Phase skipping.
- Extra turns.
- Repeated phases.
- Delayed effects during specific phases.
- Trigger hooks before/after each phase.

### Prompts And Response Windows

The runtime must represent player choice as typed prompts.

Prompt types:

- Select card.
- Select target.
- Choose one option.
- Order items.
- Pay cost.
- Confirm optional trigger.
- Respond with a card or skill.
- Pass.

Prompt requirements:

- Prompt visibility and eligible responders.
- Timer and default action.
- Valid action schema.
- Explainable disabled reasons.
- UX hints generated from behavior definitions.
- Reconnect-safe prompt reconstruction.

Response windows must support:

- Single required responder.
- Multiple responders in seat order.
- Priority order.
- Optional responses.
- Chained responses.
- Cancellation/prevention effects.
- Deadline/default-pass behavior.

## 10. MVP Reference Mode A: Hearthstone-Like Duel

### Ruleset Shape

- Players: 2.
- Seats: player 1 and player 2.
- Win condition: opponent hero health <= 0.
- Draw condition: simultaneous hero death or configured turn cap.
- Deck: personal 30 card deck.
- Starting hand: configurable 3/4 card mulligan.
- Second-player compensation: configurable coin-like card.
- Resource: mana crystals, gain 1 max per turn up to 10, refill at turn start.
- Hand limit: configurable, default 10.
- Board limit: configurable, default 7 minion-like entities per player.
- Fatigue: if drawing from empty deck, take escalating damage.
- Turn timer: configurable, default target 75 seconds.

### Required Card/Entity Types

- Hero.
- Minion-like board entity.
- Spell-like immediate action card.
- Weapon/equipment-like hero attachment.
- Location-like board entity with activated ability.
- Hero power-like repeatable ability.
- Aura/enchantment/status effect.

### Required Mechanics

- Play card from hand by paying resource.
- Draw card.
- Burn/mill card when hand limit exceeded.
- Summon minion.
- Attack with minion.
- Attack with hero if weapon/attack value exists.
- Deal damage.
- Heal.
- Destroy.
- Transform.
- Grant/remove keyword.
- Trigger on play, summon, damage, death, turn start, turn end.
- Track once-per-turn and per-entity action usage.
- Resolve simultaneous deaths in deterministic order.

### Acceptance Tests

- A scripted match can reduce one hero to 0 and declare the other player winner.
- A scripted match can make both heroes reach 0 in the same resolution batch and declare a draw.
- A player drawing from an empty deck takes fatigue damage that increases on later empty draws.
- A minion with a death trigger resolves its effect when destroyed.
- A card with generated UX metadata highlights only legal targets.
- Replaying the event log with the same seed reaches the same final state hash.

## 11. MVP Reference Mode B: 三国杀-Like Identity Game

### Ruleset Shape

- Players: 6-8.
- Seating: circular.
- Turn order: seat order, skipping dead players.
- Deck: shared draw deck and shared discard pile.
- Roles: 主公, 忠臣, 反贼, 内奸.
- Role visibility: 主公 public, others hidden until revealed by rules.
- Character card: defines max health, faction/kingdom, and skills.
- Health: character-defined current and max health.
- Hand limit: commonly current health, but ruleset-defined.
- Distance: computed from seats, dead players, equipment, and modifiers.
- Attack range: computed from default range plus weapon/equipment.

### Required Role Distributions

The MVP must support at least:

- 6 players: 1 主公, 1 忠臣, 3 反贼, 1 内奸.
- 8 players: 1 主公, 2 忠臣, 4 反贼, 1 内奸.

The data model must also support alternate distributions, such as:

- 6 players: 1 主公, 1 忠臣, 2 反贼, 2 内奸.
- 8 players: 1 主公, 2 忠臣, 3 反贼, 2 内奸.

### Required Card/Entity Types

- Identity card.
- Character card.
- Health/life card or health tracker.
- Basic card.
- Trick card.
- Delayed trick card.
- Equipment card.
- Weapon.
- Armor.
- Mount.
- Treasure.
- Skill/ability attached to character.

### Required Phases

- Prepare/start phase.
- Judgment phase.
- Draw phase.
- Play phase.
- Discard phase.
- Finish/end phase.

Each phase must expose before/after hooks for character skills, delayed tricks, and triggered effects.

### Required Mechanics

- Deal hidden identities.
- Reveal public 主公.
- Select or assign character.
- Initialize health/max health.
- Draw from shared deck.
- Shuffle discard into deck if configured.
- Play basic/trick/equipment cards.
- Equip and replace equipment.
- Calculate distance and attack range.
- Open response windows, such as asking a target to respond to an attack.
- Enter dying state when health is at/below threshold.
- Allow rescue responses.
- Resolve death.
- Reveal role on death if configured.
- Apply killer reward/penalty rules.
- Remove dead player from turn order.
- Resolve role-specific victory.

### Required Win Conditions

The outcome resolver must express the following as data-backed predicates:

- 主公 victory: all 反贼 and 内奸 are dead.
- 忠臣 victory: 主公 is alive and all 反贼 and 内奸 are dead.
- 反贼 victory: 主公 is dead, except configured 内奸 endgame exception.
- 内奸 victory: all 忠臣, 反贼, and other 内奸 are dead, then 主公 dies last.

Important product rule: a dead 反贼 can still win if the 反贼 faction later satisfies its win condition. Therefore, player life state and match outcome are independent.

### Acceptance Tests

- A 6 player match assigns the configured role distribution and reveals only 主公.
- A 8 player match assigns the configured role distribution and keeps non-主公 identities hidden.
- Dead players are skipped in future turn order.
- A player at 0 health enters dying state before death.
- A rescue card can return a dying player to alive state.
- If 主公 dies with multiple non-主公 players alive, 反贼 win according to configured rules.
- If only 主公 and one 内奸 remain and 主公 dies, 内奸 wins.
- If all 反贼 and 内奸 die while 主公 lives, 主公 and 忠臣 win.
- Killing a 反贼 can grant a configured reward.
- 主公 killing 忠臣 can apply a configured penalty.

## 12. Card Properties And Type System

### Universal Card Properties

Required template properties:

- `id`
- `version`
- `slug`
- `names`
- `rulesText`
- `flavorText`
- `type`
- `subtypes`
- `tags`
- `keywords`
- `rarity`
- `setId`
- `factions`
- `classes`
- `costs`
- `stats`
- `zonesAllowed`
- `visibility`
- `deckBuilding`
- `behaviorRef`
- `assetRefs`
- `localizationRefs`
- `releaseState`

### Optional Game-Specific Properties

Hearthstone-like optional fields:

- Mana cost.
- Attack.
- Health.
- Durability.
- Armor.
- Spell school.
- Minion type.
- Hero class.
- Board slot constraints.
- Hero power cost.

三国杀-like optional fields:

- Suit.
- Rank.
- Color.
- Kingdom/faction.
- Gender if a ruleset needs it.
- Health/max health.
- Attack range.
- Distance modifiers.
- Equipment slot.
- Identity role.
- Character skill list.

### Type Taxonomy

The engine should avoid a fixed closed enum where possible. It should ship with common primitives and allow rulesets to extend them.

Base categories:

- `identity`: role or faction cards.
- `character`: player avatar or hero-like rule source.
- `entity`: board objects, minions, locations, summons.
- `action`: cards that resolve and leave play, such as spells/tricks/basic cards.
- `equipment`: persistent attachments in equipment slots.
- `modifier`: auras, enchantments, status effects, counters.
- `resource`: mana, energy, health, durability, action points.
- `token`: generated runtime-only cards or entities.

## 13. Behavior System

This is the most important product area.

### Behavior Source Of Truth

Runtime behavior must be represented as a structured behavior definition, not as free text. Human-readable text is generated from, checked against, or linked to that behavior definition.

The recommended MVP format is a declarative behavior AST with a sandboxed script escape hatch:

```yaml
id: sample_firebolt
trigger:
  type: on_play
cost:
  mana: 2
targets:
  - id: target
    selector: character_or_entity
    controller: any
    count: 1
effects:
  - deal_damage:
      amount: 3
      to: target
ux:
  targetingLine: hostile_or_friendly
  animationIntent: direct_damage
text:
  template: "Deal {amount} damage."
  params:
    amount: 3
```

### Behavior Primitives

The standard behavior library must include:

- Move card/object between zones.
- Draw.
- Discard.
- Shuffle.
- Reveal/hide.
- Deal damage.
- Lose health.
- Heal.
- Set max health.
- Destroy.
- Kill.
- Rescue.
- Prevent damage.
- Modify cost.
- Modify stats.
- Attach/detach equipment or modifier.
- Summon/create token.
- Transform.
- Copy.
- Gain/lose resource.
- Register trigger.
- Open prompt.
- Open response window.
- Check distance.
- Check attack range.
- Check role/faction/team.
- Check visibility.
- Resolve random choice using seeded RNG.

### Trigger Model

Triggers must support:

- Event selector: before/after play, draw, damage, heal, death, phase, turn, discard, move, equip, reveal, response.
- Scope: self, controller, owner, any player, any object, zone-specific.
- Conditions.
- Optionality.
- Cost.
- Priority/order.
- Once-per-turn or once-per-game limits.
- Replacement/prevention.
- Delayed effects.
- Expiration, such as end of turn or next phase.

### Script Escape Hatch

Some card behaviors will be too awkward for pure declarative AST in early versions. The engine may allow sandboxed scripts only when:

- Scripts are deterministic.
- No network, filesystem, clock, process, or nondeterministic APIs are available.
- Randomness is provided only by the engine seed.
- CPU and memory budgets are enforced.
- Scripts can only mutate state through engine APIs.
- Scripts declare their event subscriptions and UX metadata.
- Scripts are reviewed before publishing.

Long-term goal: migrate repeated script patterns into declarative primitives.

### Description Sync

The product must maintain sync across:

- Behavior definition.
- Rules text.
- Tooltip text.
- Prompt text.
- Battle log text.
- Animation intent.
- Targeting rules.
- Tests and examples.

Required MVP checks:

- Every behavior definition has generated canonical text.
- Every published card has human-facing text.
- Static analyzer compares behavior AST against card text tokens and flags likely mismatches.
- Examples/golden tests demonstrate behavior outcomes.
- UX metadata is generated or explicitly provided for all player prompts.
- Published content cannot contain unresolved sync warnings above configured severity.

### LLM-Assisted Authoring

LLMs can help, but should not be trusted as runtime truth.

MVP LLM-assisted workflow:

1. Designer writes natural language behavior.
2. LLM proposes structured behavior AST.
3. Engine validator checks schema, determinism, target legality, and missing UX hints.
4. LLM proposes player-facing rules text from the AST.
5. Consistency checker compares AST, rules text, examples, and generated UX.
6. Designer reviews diffs.
7. Golden simulations are generated or updated.
8. Published artifact is the validated AST plus reviewed text, not the prompt transcript.

Useful LLM tasks:

- Convert prose to draft behavior.
- Explain why a target is illegal.
- Generate alternate shorter card text.
- Detect "once per turn", "random", "enemy", "other", "all", and "until end of turn" mismatches.
- Generate edge-case test cases.
- Summarize behavior for UX logs.
- Translate text while preserving placeholders.

LLM restrictions:

- No direct publish to production.
- No hidden behavior changes without AST diff.
- No runtime dependency on an LLM to resolve a match.
- No use of copyrighted reference card text as generated game content.

## 14. Behavior To UX

The client should not hand-author every interaction. Behavior definitions should produce UX metadata.

Required generated UX:

- Legal targets.
- Illegal target reasons.
- Action affordance: playable, unplayable, optional, forced.
- Prompt type and responder.
- Targeting line intent.
- Animation intent.
- Previewable state changes, where deterministic and visible.
- Public/private battle log entries.
- Tooltip expansion for keywords.
- Timing labels, such as "before damage" or "after death".
- Response window labels.

Example:

```yaml
ux:
  prompt:
    type: select_target
    titleKey: prompt.choose_damage_target
  targetHints:
    validClasses: [hero, minion, character]
    invalidReasons:
      out_of_range: "Out of range"
      stealthed: "Cannot target hidden characters"
  animationIntent: direct_damage
  logTemplate: "{source} deals {amount} damage to {target}."
```

UX must be generated from runtime-valid selectors, not copied from prose.

## 15. Asset Management

### Asset Types

The asset system must support:

- Card art.
- Character/hero portraits.
- Card frames.
- Icons.
- Keyword icons.
- Board/backgrounds.
- Audio clips.
- Voice lines.
- VFX descriptors.
- Animation clips.
- Localization strings.
- Rules text.
- Behavior definitions.
- Card set manifests.
- Deck recipes or starter lists.

### Asset Manifest

Each asset must have:

- `assetId`
- `version`
- `kind`
- `contentHash`
- `sourceUri`
- `cdnUri`
- `license`
- `owner`
- `dimensions` or media metadata.
- `locale`
- `tags`
- `dependencies`
- `createdAt`
- `publishedAt`
- `deprecatedAt`
- `compatibility`

### Ruleset Locking

A live match must lock:

- Ruleset version.
- Card catalog version.
- Behavior library version.
- Asset bundle version.
- Localization version.

This is required for deterministic replays and historical match review.

### Publishing Workflow

Asset/content states:

- `draft`
- `validated`
- `playtest`
- `published`
- `deprecated`
- `rolled_back`

Required capabilities:

- Import.
- Schema validation.
- Reference validation.
- Preview.
- Dependency graph.
- Publish bundle.
- Roll back bundle.
- Diff versions.
- Audit who changed what.

### Asset Safety

The system should detect:

- Missing art or localization.
- Unused assets.
- Broken dependencies.
- Assets referenced by published rulesets.
- Hash mismatch.
- Non-approved license metadata.
- Client-incompatible media formats.

## 16. Multiplayer And Server Requirements

### Authoritative Server

The server is the source of truth. Clients submit actions; the server validates and emits events.

Required:

- Match creation.
- Lobby and seat assignment.
- Ruleset validation before match start.
- Action validation.
- Prompt lifecycle.
- Timers.
- Reconnect.
- Spectator support.
- Event log persistence.
- State snapshots.
- Replay from seed and events.
- Match completion and result recording.

### Networking Model

The server emits visibility-filtered event streams:

- Public events.
- Player-private events.
- Spectator events.
- Debug/admin events.

Private information must never be sent to unauthorized clients. Hidden 三国杀 roles and hidden hands are key MVP test cases.

### Timers And Defaults

Timers must be ruleset-defined:

- Turn timer.
- Prompt timer.
- Response timer.
- Reconnect grace timer.
- Auto-pass.
- Auto-end-turn.
- Auto-discard.
- Bot/substitute default action, future.

### Determinism

Determinism requirements:

- Seeded RNG.
- Stable event ordering.
- No wall-clock behavior inside game logic.
- Pure validation and reducer functions where practical.
- State hash after each event.
- Replay verification in CI.

## 17. Analytics And Tooling

### Designer Tooling

MVP should expose internal/admin tools for:

- Card catalog browsing.
- Behavior editor.
- Rules text preview.
- Targeting preview.
- Simulation runner.
- Golden test runner.
- Asset manifest browser.
- Ruleset diff.
- Replay viewer, even if basic.

### Metrics

Product metrics:

- Number of games authored without engine-code changes.
- Time to create a new card from draft to playable.
- Percentage of cards with passing generated text sync checks.
- Number of runtime behavior errors in playtests.
- Replay determinism pass rate.
- Match crash/stuck rate.
- Reconnect success rate.

Gameplay analytics:

- Match length.
- Turn duration.
- Response window duration.
- Cards played per turn.
- Death timing.
- Win rates by role/faction/class.
- Concession rate.
- Timeout rate.

## 18. Research Sources

- Hearthstone gameplay overview and rules summary: https://hearthstone.fandom.com/wiki/Gameplay
- Hearthstone abilities, triggers, and keywords: https://hearthstone.fandom.com/wiki/Ability
- Hearthstone official card library: https://hearthstone.blizzard.com/en-us/cards
- Hearthstone general gameplay summary: https://en.wikipedia.org/wiki/Hearthstone
- 三国杀 overview, identity mode, role distributions, win conditions, and card categories: https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9B%BD%E6%9D%80
- 三国杀 standard edition card categories and standard-set structure: https://zh.wikipedia.org/wiki/%E4%B8%89%E5%9C%8B%E6%AE%BA%E6%A8%99%E6%BA%96%E7%89%88

## 19. Open Questions

1. Should the first public engine API be TypeScript-first, language-neutral JSON, or both?
2. Should behavior scripts use JavaScript/TypeScript, Lua, Starlark, or a custom DSL only?
3. Should the editor ship inside the game client, as a web admin tool, or as CLI-first content files?
4. How much Hearthstone-like complexity is required in MVP: secrets, discover, random generation, deck restrictions, and card collection rules?
5. How much 三国杀-like complexity is required in MVP: judgment zone, delayed trick cards, all standard skills, chained responses, and exact distance rules?
6. Should LLM-assisted authoring be included in the MVP or designed now and implemented after the core validator?
7. What is the desired trust model for user-generated content: first-party only, curated creators, or open workshop?

## 20. Milestones

### M0: Engine Skeleton

- Define `GameDefinition`, `CardTemplate`, `CardInstance`, `MatchState`, and `Event`.
- Implement seeded RNG and state hashing.
- Implement zones, card movement, draw, discard, damage, heal, death, and outcome objects.
- Add replay from event log.

### M1: Hearthstone-Like Vertical Slice

- Implement 2 player match.
- Add heroes, decks, hands, mana, board entities, minion attacks, spells, fatigue, and hero death.
- Add sample cards using declarative behavior definitions.
- Add generated targeting UX hints.
- Add replay determinism tests.

### M2: 三国杀-Like Vertical Slice

- Implement 6-8 player seating and hidden roles.
- Add shared deck/discard, character health, turn phases, equipment, range/distance, response windows, dying/rescue, role reveal, death, and role win predicates.
- Add sample cards and skills sufficient to prove the ruleset.
- Add visibility tests for hidden roles/hands.

### M3: Content And Asset Pipeline

- Add asset manifest.
- Add ruleset/card/asset bundle version locking.
- Add validation, preview, publish, rollback, and dependency checks.
- Add localization placeholders.

### M4: Behavior Authoring And Sync

- Add behavior schema validator.
- Add generated canonical card text.
- Add text/behavior consistency checker.
- Add golden simulation fixtures.
- Add optional LLM-assisted draft workflow behind review gates.

### M5: Playtest-Ready Multiplayer

- Add lobby/match creation.
- Add timers and defaults.
- Add reconnect and spectator event streams.
- Add admin replay viewer.
- Add basic analytics.

## 21. MVP Definition Of Done

The MVP is done when:

- A Hearthstone-like ruleset and a 三国杀-like ruleset both run on the same engine.
- Neither ruleset requires game-specific logic branches in the core runtime.
- Rulesets can define distinct player counts, zones, phases, card types, response windows, and win predicates.
- Card behavior is structured, validated, versioned, and replayable.
- Card text and UX prompts are generated or checked against behavior definitions.
- Asset bundles are versioned and locked per match.
- Hidden information is correctly filtered per player.
- Replays are deterministic in CI.
- The system has enough authoring documentation for a designer/engineer pair to add a new sample card without changing engine code.
