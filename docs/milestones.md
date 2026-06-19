# Milestones: Multiplayer Turn-Based Card Game Engine

Status: Draft  
Related documents:

- `docs/prd-multiplayer-turn-based-card-game-engine.md`
- `docs/technical-design-multiplayer-turn-based-card-game-engine.md`

## Milestone Principles

- Each milestone must leave the repo in a runnable or verifiable state.
- Core runtime work comes before authoring polish.
- The two reference games are proof points, not one-off branches.
- Determinism, replay, and hidden-information safety are acceptance gates, not cleanup tasks.
- Content and behavior definitions should become stricter over time, but the runtime source of truth is structured data from the first playable slice.

## M0: Foundation And Repo Skeleton

Goal: establish the TypeScript workspace, schemas, core runtime types, deterministic replay base, and fixture runner.

Primary deliverables:

- TypeScript workspace with initial packages:
  - `engine-core`
  - `content-schema`
  - `replay-tools`
  - `rulesets`
- Core types:
  - `GameDefinition`
  - `CardTemplate`
  - `GameObjectState`
  - `ZoneState`
  - `PlayerState`
  - `MatchState`
  - `MatchEvent`
  - `MatchCommand`
- Deterministic seeded RNG utility.
- State hash utility.
- Event reducer contract.
- Basic zone creation and object movement events.
- Fixture format for setup/replay tests.

Acceptance gates:

- A fixture can create a match, create zones, create objects, move an object, and replay to the same final state hash.
- Event sequence numbers are contiguous.
- No object can exist in more than one zone.
- CI or local test command runs the replay fixture.

Dependencies:

- None.

Suggested issue breakdown:

- Initialize workspace and test runner.
- Define schema and TypeScript type generation strategy.
- Implement event envelope and reducer harness.
- Implement deterministic RNG and state hash.
- Add first replay fixture.

## M1: Generic Engine Kernel

Goal: implement enough generic rules machinery to run simple turn-based card effects without committing to either reference game.

Primary deliverables:

- Command validation and transaction resolution loop.
- Operation queue.
- Rules modules:
  - zones
  - draw
  - resources
  - damage
  - healing
  - death without rescue
  - basic outcomes
- Declarative behavior AST MVP:
  - costs
  - selectors
  - conditions
  - effects
- Trigger registration and deterministic trigger ordering.
- Prompt model for single-player choices.
- Golden simulation runner.

Acceptance gates:

- A card can be played from hand by paying a resource.
- A targeted effect can deal damage.
- A player/object can die from damage.
- A basic win condition can complete a match.
- Replaying the same command sequence with the same seed produces the same state hash.
- Illegal commands are rejected without emitting partial events.

Dependencies:

- M0.

Suggested issue breakdown:

- Implement command resolver and transaction boundary.
- Implement operation queue.
- Implement resource costs.
- Implement selector engine with disabled reasons.
- Implement damage/heal/death events.
- Implement basic outcome predicates.
- Add golden simulation tests.

## M2: Hearthstone-Like Duel Vertical Slice

Goal: prove the engine supports a 2 player digital duel using only ruleset configuration and generic modules.

Primary deliverables:

- `sample-duel` ruleset.
- Two player seating.
- Personal decks, hands, hero zones, board zones, discard/graveyard zones.
- Mana resource:
  - max/current mana
  - gain one max per turn up to cap
  - refill at turn start
- Turn graph:
  - match start
  - mulligan
  - turn start
  - resource refresh
  - draw
  - main
  - turn end
- Board capacity.
- Fatigue empty-deck behavior.
- Minion/entity attack flow.
- Hero death and simultaneous death outcomes.
- Sample cards:
  - direct damage spell
  - vanilla minion
  - death-trigger minion
  - weapon-like attachment
  - heal spell
  - board-wide damage spell

Acceptance gates:

- A scripted match can reduce one hero to zero and declare the opponent winner.
- A scripted match can reduce both heroes to zero in one resolution batch and declare a draw.
- Empty-deck draws cause escalating fatigue damage.
- A death trigger resolves once and in deterministic order.
- Targeting metadata marks legal and illegal targets correctly.
- No core runtime code checks for `sample-duel` by id.

Dependencies:

- M1.

Suggested issue breakdown:

- Define `sample-duel` game definition.
- Implement turn graph runner.
- Implement mulligan prompt.
- Implement board entity attack.
- Implement fatigue through draw module config.
- Add sample cards and golden tests.

## M3: Multiplayer Identity Kernel

Goal: add the generic multiplayer, visibility, response-window, and death/rescue machinery needed before building the 三国杀-like slice.

Primary deliverables:

- Circular seating and next-alive-seat traversal.
- Role/identity assignment as hidden objects.
- Visibility projection service:
  - state projection
  - event projection
  - prompt projection
- Multi-responder prompt and response-window modes:
  - `single`
  - `all_in_order`
  - `any_until_success`
- Dying and rescue flow.
- Role reveal events.
- Equipment slots and stat/range modifiers.
- Distance/range selector helpers.
- Dead-player turn skipping.

Acceptance gates:

- Hidden role objects are visible only to allowed viewers.
- Opponent/private hand contents are redacted in projected state.
- A dying player can be rescued before death.
- A dead player is skipped by turn traversal.
- A response window can ask the correct player for a card and default-pass on timeout in fixture mode.
- Projection tests prove unrelated viewers do not receive private prompts.

Dependencies:

- M1.
- Some M2 turn graph work can be reused, but M3 does not require all M2 cards.

Suggested issue breakdown:

- Implement viewer contexts and projections.
- Implement hidden object redaction.
- Implement circular turn order.
- Implement response-window prompt modes.
- Implement dying/rescue state checks.
- Implement equipment slot rules.
- Implement range/distance helpers.

## M4: 三国杀-Like Identity Vertical Slice

Goal: prove the same engine supports a 6-8 player hidden-role identity game with asymmetric win conditions.

Primary deliverables:

- `sample-identity` ruleset.
- Six player role preset:
  - 1 lord
  - 1 loyalist
  - 3 rebels
  - 1 spy
- Eight player role preset:
  - 1 lord
  - 2 loyalists
  - 4 rebels
  - 1 spy
- Public lord reveal.
- Shared deck and discard.
- Character assignment and health initialization.
- Turn graph:
  - prepare
  - judgment
  - draw
  - play
  - discard
  - finish
- Hand limit by current health.
- Basic/trick/equipment card examples.
- Attack with dodge response.
- Rescue card usable in dying window.
- Killer reward and lord-kills-loyalist penalty.
- Role-specific outcome predicates:
  - lord/loyalist victory
  - rebel victory
  - spy final-survivor victory

Acceptance gates:

- Six and eight player setup fixtures assign correct role distributions.
- Only lord is public at match start.
- Non-lord identities remain hidden until reveal conditions.
- Attack/dodge response resolves correctly.
- Dying/rescue/death flow resolves correctly.
- Rebel win and spy win edge cases pass golden tests.
- Dead rebels can still be marked winners if rebel win condition is later satisfied.
- No core runtime code checks for `sample-identity` by id.

Dependencies:

- M3.

Suggested issue breakdown:

- Define `sample-identity` game definition.
- Implement role distribution setup.
- Implement public lord reveal.
- Implement phase graph and hand limit.
- Add sample cards.
- Add role outcome predicates.
- Add killer reward/penalty hooks.
- Add golden tests for all outcome branches.

## M5: Content And Asset Pipeline

Goal: turn raw ruleset files into validated, immutable bundles that can be locked by matches.

Primary deliverables:

- Content build CLI.
- JSON schema validation for:
  - game definitions
  - card templates
  - behaviors
  - asset manifests
  - localization bundles
  - fixtures
- Semantic validators:
  - references
  - zones
  - phase graph
  - selectors
  - behavior determinism
  - visibility
  - win conditions
  - asset manifest
- Asset manifest model.
- Bundle references with content hashes.
- Match content lock.
- Publish states:
  - draft
  - validated
  - playtest
  - published
  - deprecated
  - rolled_back

Acceptance gates:

- `sample-duel` and `sample-identity` build into immutable bundles.
- A match starts from bundle refs, not loose source files.
- Replays fail clearly if a required bundle hash is unavailable.
- Missing behavior/card/asset/localization references fail validation.
- Invalid asset hash/license/URI/media type/dimensions fail validation.
- Published bundle content cannot be mutated in place.

Dependencies:

- M2 and M4 sample rulesets.

Suggested issue breakdown:

- Build CLI skeleton.
- Add bundle hashing.
- Add asset manifest schema.
- Add localization placeholder schema.
- Add semantic validators.
- Add match content lock.
- Add publish-state metadata.

## M6: Behavior Text And UX Sync

Goal: make behavior definitions the source of truth for card text, prompts, targeting hints, logs, and UX metadata.

Primary deliverables:

- Canonical text generator from behavior AST.
- Behavior-to-text token checker.
- UX hint generator from selectors/effects.
- Prompt text and battle-log template validation.
- Keyword tooltip expansion model.
- Golden fixture examples generated or linked from behavior definitions.
- Optional LLM-assisted draft workflow design behind manual review gates.

Acceptance gates:

- Every published sample card has canonical generated text.
- Edited rules text is checked against behavior tokens.
- Severe text/behavior mismatches fail validation.
- All prompts have player-facing text and legal-target metadata.
- Public logs use projected object names and do not leak hidden information.
- LLM-assisted workflow, if present, cannot publish behavior without validation and review.

Dependencies:

- M5.

Suggested issue breakdown:

- Implement canonical text template renderer.
- Implement behavior token extractor.
- Implement text sync severity model.
- Generate target UX hints.
- Validate prompt/log text.
- Document optional LLM review flow.

## M7: Playtest Server

Goal: make the engine usable by multiple connected clients in live playtests.

Primary deliverables:

- Match HTTP APIs:
  - create match
  - join match
  - start match
  - submit command
  - fetch match
  - fetch replay
- WebSocket event stream.
- Server-side command authorization.
- Event persistence.
- Snapshot persistence.
- Timers:
  - turn
  - prompt
  - response
  - reconnect grace
- Default actions:
  - pass
  - end turn
  - auto-discard
- Reconnect/resync flow.
- Spectator projection.
- Basic structured logs and metrics.

Acceptance gates:

- Two connected clients can complete a `sample-duel` match.
- Six to eight connected clients can complete a `sample-identity` match.
- A disconnected player can reconnect and receive current projected state and open prompts.
- Server restart can restore a match from snapshot plus events.
- Completed matches reject further gameplay commands.
- Admin replay can reconstruct a completed match.

Dependencies:

- M5 for content locks.
- M2 and M4 for playable rulesets.

Suggested issue breakdown:

- Add match API.
- Add WebSocket protocol.
- Add event persistence.
- Add snapshots.
- Add timers and default commands.
- Add reconnect/resync.
- Add spectator mode.
- Add basic replay endpoint.

## M8: Internal Tooling And Hardening

Goal: improve debuggability, reliability, and designer iteration speed before broader playtesting.

Primary deliverables:

- Replay CLI.
- Projection inspector.
- State diff tool.
- Ruleset diff tool.
- Fixture authoring helpers.
- Runtime metrics dashboard or exported metrics.
- Fuzz/property tests for legal random command sequences.
- Content validation report.
- Debug-safe projected battle log.

Acceptance gates:

- A developer can replay any persisted match by id.
- A developer can inspect what each viewer was allowed to see at a given sequence.
- Fuzz tests do not find zone/object invariant violations.
- Content validation reports actionable errors with file paths and ids.
- Runtime logs include match id, transaction id, command id, sequence range, and state hash.

Dependencies:

- M7.

Suggested issue breakdown:

- Add replay CLI.
- Add projection CLI.
- Add state diff.
- Add ruleset diff.
- Add fuzz test harness.
- Add validation report formatting.
- Add metrics export.

## Suggested Release Gates

### Prototype Gate

Includes:

- M0
- M1
- M2

Question answered: can the generic engine run a deterministic 2 player card battler?

### Multiplayer Rules Gate

Includes:

- M3
- M4

Question answered: can the same engine run a hidden-role multiplayer game with death, rescue, response windows, and asymmetric outcomes?

### Content Pipeline Gate

Includes:

- M5
- M6

Question answered: can content be validated, versioned, locked, and kept in sync across behavior, text, and UX?

### Playtest Gate

Includes:

- M7
- M8

Question answered: can real clients play, reconnect, replay, and debug matches safely?

## Dependency Graph

```text
M0 Foundation
  -> M1 Generic Engine Kernel
      -> M2 Hearthstone-Like Duel
      -> M3 Multiplayer Identity Kernel
          -> M4 三国杀-Like Identity Game
              -> M5 Content And Asset Pipeline
                  -> M6 Behavior Text And UX Sync
                      -> M7 Playtest Server
                          -> M8 Internal Tooling And Hardening
```

M2 and M3 can overlap after M1 if separate engineers are available. M5 can start early with schemas, but should not be considered complete until both sample rulesets exist.

## First Sprint Recommendation

Start with M0 only.

Sprint deliverables:

- Workspace and test runner.
- Core type stubs.
- Event envelope.
- Zone/object state.
- `card_moved` reducer.
- Deterministic RNG.
- State hash.
- One replay fixture.

Why this first: it creates the rails every later milestone uses, and it tests the most important architectural bet immediately: deterministic state from seed plus events.
