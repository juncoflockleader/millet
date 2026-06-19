# Technical Design: Multiplayer Turn-Based Card Game Engine

Status: Draft  
Related PRD: `docs/prd-multiplayer-turn-based-card-game-engine.md`

## 1. Summary

Millet will be implemented as a server-authoritative, deterministic, event-sourced card game engine. Game rules, cards, assets, turn structure, prompts, visibility, and win conditions are described by versioned content bundles. The engine runtime stays generic and executes those bundles through a common reducer, behavior interpreter, trigger system, and outcome resolver.

The MVP proves the architecture with two rulesets:

- A Hearthstone-like 2 player duel.
- A 三国杀-like 6-8 player hidden-role identity game.

The first implementation should be TypeScript-first with JSON-serializable schemas. Designers can author content in YAML or JSON, but the runtime loads validated JSON bundles. This keeps the engine usable from web/server code while preserving a language-neutral content format.

## 2. Design Decisions

### Chosen Defaults

- Runtime language: TypeScript.
- Content format: JSON schema as canonical format; YAML allowed as authoring input.
- Runtime model: event sourced with periodic snapshots.
- Match authority: server authoritative.
- Game logic determinism: seeded RNG, stable ordering, no wall-clock access in reducers.
- Behavior model: declarative behavior AST for MVP.
- Script escape hatch: designed, but disabled for live MVP unless reviewed and sandboxed.
- Storage baseline: PostgreSQL for durable metadata/events, object storage/CDN for binary assets, Redis or in-process timers for early playtests.
- Client transport: WebSocket for match events and prompts, HTTP for lobby/content/admin APIs.
- Hidden information model: full internal state on server, projected viewer-specific state/events to clients.

### Explicit Non-Decisions

- The design does not require a specific frontend framework.
- The design does not require a production content editor in M0-M2.
- The design does not choose a final script sandbox implementation. A Starlark-like deterministic sandbox is preferred later over unrestricted JavaScript.
- The design does not include economy, collection, marketplace, ranked ladder, or UGC moderation systems.

## 3. Architecture

```text
                 +----------------------+
                 |  Admin / Authoring   |
                 |  CLI or Web Tooling  |
                 +----------+-----------+
                            |
                            v
                 +----------------------+
                 | Content Build System |
                 | schema, lint, tests  |
                 +----------+-----------+
                            |
                            v
     +----------------------+----------------------+
     | Versioned Bundles                           |
     | game definitions, card catalog, assets, i18n |
     +----------------------+----------------------+
                            |
                            v
+---------------------------+---------------------------+
|                  Match Server                         |
| lobby, commands, timers, reconnect, event streaming   |
+------------+-----------------------------+------------+
             |                             |
             v                             v
  +---------------------+        +----------------------+
  | Engine Runtime      |        | Persistence          |
  | reducer, behavior,  |        | events, snapshots,   |
  | prompts, outcomes   |        | bundles, audit logs  |
  +----------+----------+        +----------------------+
             |
             v
  +----------------------+
  | Client Projections   |
  | public/private views |
  +----------------------+
```

### Suggested Repository Layout

```text
apps/
  server/                 Match, lobby, admin, and content APIs.
  admin/                  Future web authoring/replay UI.
packages/
  engine-core/            Deterministic reducer, events, state, selectors.
  engine-behavior/        Behavior AST interpreter and validators.
  engine-rules/           Reusable rules modules: draw, damage, death, etc.
  engine-visibility/      State/event projection and redaction.
  content-schema/         JSON schemas, generated TypeScript types.
  content-build/          YAML to JSON build, lint, validation, golden tests.
  rulesets/               First-party sample rulesets.
  replay-tools/           Replay runner, state hash, fixture helpers.
docs/
  prd-multiplayer-turn-based-card-game-engine.md
  technical-design-multiplayer-turn-based-card-game-engine.md
```

For a tiny first commit, these packages can be directories inside one TypeScript workspace. Split them only when package boundaries start helping build/test times.

## 4. Core Runtime Concepts

### Command

A command is a client or system request. Commands are not trusted. They must be validated against current state, active prompts, viewer permissions, and ruleset constraints.

Examples:

- `join_match`
- `start_match`
- `keep_mulligan_cards`
- `play_card`
- `activate_ability`
- `declare_attack`
- `respond_to_prompt`
- `end_turn`
- `concede`
- `timeout_auto_action`

### Event

An event is an immutable state change produced by the server. Events are the replay source of truth.

Examples:

- `match_created`
- `player_seated`
- `zone_created`
- `card_moved`
- `resource_changed`
- `damage_dealt`
- `dying_started`
- `prompt_opened`
- `prompt_answered`
- `player_died`
- `role_revealed`
- `outcome_declared`

### Operation

An operation is an internal behavior primitive before it becomes events. Behavior definitions emit operations, then the engine resolves them into events.

Examples:

- `draw_cards`
- `deal_damage`
- `open_response_window`
- `move_object`
- `apply_modifier`
- `check_outcomes`

### Transaction

A transaction is one authoritative resolution batch caused by a command, timer, setup step, or trigger. A transaction can emit many events, open prompts, or pause for a response window.

Transactions have:

- `transactionId`
- `causedByCommandId`
- `startedAtServerTime`
- `rulesetVersion`
- ordered events
- post-transaction state hash

Server time is metadata only. Game logic cannot depend on it.

## 5. Type Model

The exact generated types will evolve, but the runtime should converge on these shapes.

```ts
type Id = string;
type Version = string;

interface GameDefinition {
  id: Id;
  version: Version;
  metadata: GameMetadata;
  playerConfig: PlayerConfig;
  zones: ZoneDefinition[];
  objects: ObjectSchemaRegistry;
  resources: ResourceDefinition[];
  turnGraph: PhaseGraphDefinition;
  rules: RulesModuleConfig[];
  winConditions: WinConditionDefinition[];
  behaviorLibrary: BehaviorDefinition[];
  cardCatalogRef: BundleRef;
  assetBundleRef: BundleRef;
  localizationBundleRef: BundleRef;
}

interface MatchState {
  matchId: Id;
  gameDefinitionId: Id;
  gameDefinitionVersion: Version;
  seed: string;
  rngCursor: number;
  status: "setup" | "active" | "paused" | "completed" | "aborted";
  players: Record<Id, PlayerState>;
  seats: SeatState[];
  objects: Record<Id, GameObjectState>;
  zones: Record<Id, ZoneState>;
  turn: TurnState;
  prompts: Record<Id, PromptState>;
  triggers: TriggerState[];
  outcomes: OutcomeState[];
  counters: RuntimeCounters;
}
```

### Player State

```ts
interface PlayerState {
  id: Id;
  userId: Id;
  seatId: Id;
  controllerId: Id;
  status: "alive" | "dying" | "dead" | "conceded" | "disconnected" | "spectating" | "eliminated";
  roleRef?: ObjectRef;
  characterRef?: ObjectRef;
  heroRef?: ObjectRef;
  teamId?: Id;
  factionId?: Id;
  resources: Record<string, ResourceState>;
  visibilityOverrides: VisibilityOverride[];
  timers: Record<string, TimerState>;
}
```

### Object State

Cards, heroes, characters, minions, equipment, modifiers, delayed tricks, and tokens are all game objects.

```ts
interface GameObjectState {
  id: Id;
  templateId?: Id;
  objectType: string;
  ownerId?: Id;
  controllerId?: Id;
  creatorId?: Id;
  zoneId: Id;
  position: number;
  visibility: VisibilityState;
  stats: Record<string, number>;
  counters: Record<string, number>;
  tags: string[];
  keywords: string[];
  attachments: Id[];
  modifiers: Id[];
  exhausted?: boolean;
  createdAtSequence: number;
  lastChangedAtSequence: number;
}
```

### Zone State

```ts
interface ZoneState {
  id: Id;
  ownerId?: Id;
  zoneType: string;
  visibility: ZoneVisibility;
  ordering: "ordered" | "unordered" | "hidden_ordered";
  objectIds: Id[];
  capacity?: number;
}
```

## 6. Content Bundle Model

Content is immutable once published. A live match locks exact bundle versions.

```ts
interface ContentLock {
  gameDefinition: BundleRef;
  cardCatalog: BundleRef;
  behaviorLibrary: BundleRef;
  assetBundle: BundleRef;
  localizationBundle: BundleRef;
}

interface BundleRef {
  id: Id;
  version: Version;
  contentHash: string;
}
```

### Authoring To Runtime Pipeline

```text
YAML/JSON source
  -> schema validation
  -> semantic validation
  -> behavior compilation
  -> generated text and UX metadata
  -> golden simulation tests
  -> bundle hash
  -> publish immutable JSON bundle
```

Semantic validation must catch:

- Missing referenced cards, behaviors, assets, localization keys, or zones.
- Behavior operations that target impossible object types.
- Hidden information exposed by UX or logs.
- Non-deterministic behavior declarations.
- Win predicates that reference undefined roles/factions/statuses.
- Ruleset/card version mismatches.
- Published cards with unresolved severe text/behavior sync warnings.

## 7. Event Sourcing And Reducer

### Event Envelope

```ts
interface MatchEvent<TPayload = unknown> {
  id: Id;
  matchId: Id;
  sequence: number;
  transactionId: Id;
  type: string;
  payload: TPayload;
  visibility: EventVisibility;
  causedBy?: EventCause;
  stateHashAfter?: string;
}
```

### Reducer Contract

```ts
type Reducer = (state: MatchState, event: MatchEvent) => MatchState;
```

Reducer requirements:

- Pure and deterministic.
- No IO.
- No clocks.
- No random calls.
- No mutation of previous state snapshots.
- Unknown event types fail replay in test/dev and are rejected in production ingestion.

### Resolver Contract

```ts
type CommandResolver = (
  state: MatchState,
  command: MatchCommand,
  context: ResolutionContext
) => ResolutionResult;

interface ResolutionResult {
  events: MatchEvent[];
  openedPrompts: PromptState[];
  errors: ValidationError[];
}
```

Resolvers may call behavior interpreters, selectors, trigger queues, rules modules, and outcome checks. They still cannot use nondeterministic APIs except through `context.rng`.

### Replay

Replay rebuilds state from:

1. Content lock.
2. Match seed.
3. Initial setup event.
4. Ordered match events.

Replay verification should compare:

- Final state hash.
- State hash after each event in strict mode.
- Outcome object.
- Public/private projection snapshots for selected viewers.

## 8. Resolution Loop

The engine resolves one command with a queue-driven loop.

```text
receive command
  -> authorize viewer
  -> validate against prompt/action rules
  -> create transaction
  -> enqueue root operation
  -> process operation queue
      -> emit events
      -> apply events to working state
      -> enqueue triggers
      -> enqueue state-based checks
      -> open prompt or response window if required
  -> if prompt opened, pause transaction boundary
  -> check outcomes
  -> persist events
  -> publish projected events
```

### Work Item Types

- `operation`: an effect primitive.
- `trigger`: behavior triggered by an event.
- `state_check`: dying, death, cleanup, outcome.
- `prompt`: pause and wait for player input.
- `timer`: schedule or cancel timer.

### Stable Ordering

Stable ordering is required for both reference games.

Default ordering:

1. Current operation emits immediate events.
2. Replacement/prevention triggers before the event commit.
3. Event is committed.
4. State-based checks run.
5. After-event triggers are collected.
6. Triggers sort by:
   - explicit priority, lower first
   - ruleset timing group
   - controller seat order from active player
   - source object's `createdAtSequence`
   - behavior id
7. Trigger operations enter the queue.
8. Outcomes are checked after the queue drains and after death batches.

Rulesets can override specific timing groups, but override functions must still be deterministic.

## 9. Behavior AST

### Core Shape

```ts
interface BehaviorDefinition {
  id: Id;
  version: Version;
  kind: "card" | "ability" | "trigger" | "rules_module";
  trigger?: TriggerDefinition;
  costs?: CostDefinition[];
  selectors?: SelectorDefinition[];
  conditions?: ConditionDefinition[];
  effects: EffectDefinition[];
  limits?: LimitDefinition[];
  text?: TextTemplateDefinition;
  ux?: UxHintDefinition;
}
```

### Selectors

Selectors compile into deterministic queries over current state.

```yaml
selectors:
  - id: target
    from: battlefield
    match:
      objectTypes: [hero, character, minion]
      controller: any
      status: alive
    count:
      min: 1
      max: 1
    range:
      source: self
      mode: attack_range
```

Selector requirements:

- Return ordered candidate lists.
- Return disabled reasons for UX.
- Never leak hidden object details to unauthorized viewers.
- Support game-specific helper predicates through registered rules modules.
- Be reusable for validation, AI/default actions, and client hints.

### Effects

Effects are declarative operations.

```yaml
effects:
  - deal_damage:
      source: self
      to: target
      amount:
        value: 3
      damageType: normal
```

Effect interpretation must be small and composable. Complex cards should become a tree of simple operations rather than one giant custom operation.

### Conditions

Conditions are pure predicates.

```yaml
conditions:
  - all:
      - controller_is_active_player: self
      - resource_at_least:
          player: controller
          resource: mana
          amount: 2
```

### Costs

Costs reserve and pay resources before effects execute.

```yaml
costs:
  - spend_resource:
      player: controller
      resource: mana
      amount: 2
  - exhaust:
      object: self
```

Cost validation and payment are separate:

- Validation checks whether the action is legal.
- Payment emits events.
- If payment fails during resolution because state changed, the command is rejected before events are committed.

### Text Templates

Behavior-owned text templates use placeholders bound to behavior parameters.

```yaml
text:
  template: "Deal {amount} damage to {targetType}."
  params:
    amount: effects[0].deal_damage.amount.value
    targetType: selectors.target.match.objectTypes
```

Generated text is canonical for review and sync checks. Designers may provide edited text, but the checker compares it to canonical behavior tokens.

## 10. Behavior Examples

### Direct Damage Card

```yaml
id: sample_firebolt
version: 1.0.0
kind: card
costs:
  - spend_resource:
      player: controller
      resource: mana
      amount: 2
selectors:
  - id: target
    from: any_public_play_area
    match:
      objectTypes: [hero, character, minion]
      controller: any
      status: alive
    count: { min: 1, max: 1 }
effects:
  - deal_damage:
      source: self
      to: target
      amount: { value: 3 }
ux:
  animationIntent: direct_damage
  targetingLine: direct
text:
  template: "Deal {amount} damage."
  params:
    amount: 3
```

### Attack With Response Window

This models a 三国杀-like basic attack and dodge response.

```yaml
id: sample_attack_card
version: 1.0.0
kind: card
selectors:
  - id: target
    from: players
    match:
      status: alive
      notSelf: true
    range:
      source: controller
      mode: attack_range
    count: { min: 1, max: 1 }
effects:
  - open_response_window:
      id: dodge_window
      responders:
        - target
      prompt:
        type: respond_with_card
        cardSelector:
          from: hand
          owner: responder
          match:
            tags: [dodge]
        optional: true
      onResponse:
        effects:
          - move_card:
              card: response.card
              to: discard
      onPass:
        effects:
          - deal_damage:
              source: controller
              to: target
              amount: { value: 1 }
text:
  template: "Attack a character in range. They may respond with a Dodge; otherwise they take 1 damage."
```

### Death Trigger

```yaml
id: sample_deathrattle_draw
version: 1.0.0
kind: trigger
trigger:
  event: object_destroyed
  timing: after
  source: self
effects:
  - draw_cards:
      player: controller
      count: 1
limits:
  - once_per_object_lifetime: true
text:
  template: "When this dies, draw a card."
```

## 11. Rules Modules

Rules modules are deterministic libraries registered by `GameDefinition`. They expose named operations, selectors, validators, and state checks.

### Required MVP Modules

- `zones`: create zones, move objects, enforce capacity and visibility.
- `draw`: draw, mill/burn, empty-deck behavior.
- `resources`: spend, gain, set, refill, cap.
- `damage`: damage, prevention, health loss, healing.
- `death`: dying, rescue, death resolution.
- `turns`: phase graph, active player, turn advancement.
- `targeting`: selectors, range, distance.
- `equipment`: slots, replacement, stat modifiers.
- `triggers`: registration, collection, ordering, limits.
- `outcomes`: win/draw/loss predicate evaluation.
- `visibility`: state and event projection.

### Game-Specific Config, Not Game-Specific Core

Hearthstone-like fatigue and 三国杀-like rescue are module configurations, not hardcoded branches:

```yaml
rules:
  - module: draw
    config:
      emptyDeck:
        mode: fatigue_damage
        counter: fatigue
        startAt: 1
        incrementBy: 1
```

```yaml
rules:
  - module: death
    config:
      dyingThreshold: 0
      rescueWindow:
        responderOrder: seat_order_from_dying_player
        acceptedResponses:
          - tags: [rescue]
        targetHealthAfterRescue: 1
```

## 12. Turn And Phase Graph

### Phase Definition

```ts
interface PhaseDefinition {
  id: Id;
  labelKey: string;
  owner: "active_player" | "system" | "selected_player";
  entryHooks: HookDefinition[];
  actionWindows: ActionWindowDefinition[];
  exitHooks: HookDefinition[];
  next: PhaseTransitionDefinition[];
}
```

### Hearthstone-Like Graph

```yaml
turnGraph:
  start: match_start
  phases:
    - id: match_start
      next: [mulligan]
    - id: mulligan
      next: [turn_start]
    - id: turn_start
      entryHooks: [start_turn_triggers]
      next: [resource_refresh]
    - id: resource_refresh
      entryHooks: [gain_and_refill_mana]
      next: [draw]
    - id: draw
      entryHooks: [draw_one_card]
      next: [main]
    - id: main
      actionWindows: [play_cards, attack, hero_power, end_turn]
      next: [turn_end]
    - id: turn_end
      exitHooks: [end_turn_triggers, cleanup]
      next: [next_player_turn]
```

### 三国杀-Like Graph

```yaml
turnGraph:
  start: role_setup
  phases:
    - id: role_setup
      next: [character_setup]
    - id: character_setup
      next: [prepare]
    - id: prepare
      entryHooks: [before_prepare, prepare_effects]
      next: [judgment]
    - id: judgment
      entryHooks: [resolve_delayed_tricks]
      next: [draw]
    - id: draw
      entryHooks: [draw_two_cards]
      next: [play]
    - id: play
      actionWindows: [play_cards, activate_skills, end_phase]
      next: [discard]
    - id: discard
      entryHooks: [enforce_hand_limit]
      next: [finish]
    - id: finish
      exitHooks: [finish_triggers, cleanup]
      next: [next_alive_seat]
```

### Turn Advancement

Turn advancement is a rule module:

```ts
interface TurnCursor {
  turnNumber: number;
  roundNumber: number;
  activePlayerId?: Id;
  phaseId: Id;
  priorityPlayerId?: Id;
  phaseStack: PhaseFrame[];
}
```

For circular multiplayer, `next_alive_seat` walks seat order and skips players with `dead`, `conceded`, or ruleset-configured inactive statuses.

## 13. Prompts And Response Windows

### Prompt State

```ts
interface PromptState {
  id: Id;
  matchId: Id;
  status: "open" | "answered" | "expired" | "cancelled";
  responderIds: Id[];
  responseMode: "single" | "all_in_order" | "any_until_pass" | "priority_loop";
  promptType: string;
  actionSchema: JsonSchema;
  legalActions: LegalActionSummary[];
  defaultAction: MatchCommand;
  openedAtSequence: number;
  deadline?: TimerState;
  visibility: EventVisibility;
  ux: PromptUx;
}
```

### Response Window Semantics

Response windows are prompts with ordering and continuation rules.

Required modes:

- `single`: one player must answer or default.
- `all_in_order`: each eligible player may answer/pass in deterministic order.
- `priority_loop`: responders continue until all pass after the latest response.
- `any_until_success`: close after first valid response.

For MVP:

- Hearthstone-like duel mostly uses `single` prompts during mulligan and optional choices.
- 三国杀-like identity mode requires `all_in_order` and `single` for dodge/rescue windows.

### Prompt Persistence

Open prompts must be reconstructable from events:

1. `prompt_opened`
2. `prompt_answered`, `prompt_expired`, or `prompt_cancelled`
3. Follow-up events caused by the answer

Clients receive projected prompt state after reconnect. The server never trusts a client's cached legal action list.

## 14. Visibility And Hidden Information

Visibility is a first-class subsystem. It applies to state, events, prompts, logs, and UX hints.

### Visibility Levels

```ts
type Visibility =
  | { kind: "public" }
  | { kind: "owner" }
  | { kind: "controller" }
  | { kind: "seat"; seatIds: Id[] }
  | { kind: "player"; playerIds: Id[] }
  | { kind: "team"; teamIds: Id[] }
  | { kind: "admin" }
  | { kind: "hidden" };
```

### Projection API

```ts
interface ProjectionService {
  projectState(state: MatchState, viewer: ViewerContext): ProjectedMatchState;
  projectEvent(event: MatchEvent, state: MatchState, viewer: ViewerContext): ProjectedMatchEvent | null;
  projectPrompt(prompt: PromptState, state: MatchState, viewer: ViewerContext): ProjectedPrompt | null;
}
```

### Redaction Rules

Redaction must preserve enough shape for UX without leaking private content.

Examples:

- Opponent hand card: visible as unknown card back with runtime object id or stable client placeholder id.
- Hidden 三国杀 role: visible as hidden identity unless viewer owns it or role has been revealed.
- Deck order: hidden unless viewer has an effect that reveals top cards.
- Private prompt: visible only to eligible responder and admins.
- Public death: visible to all; role reveal depends on ruleset.

### Visibility Tests

Every ruleset must include projection tests:

- Hidden roles are absent from non-owner projected state.
- Hidden hand contents are absent from opponents.
- Public counts remain visible where configured.
- Private prompts are not sent to unrelated players.
- Battle logs do not contain redacted object names.

## 15. Damage, Dying, Death, And Outcome Resolver

### Damage Flow

```text
deal_damage operation
  -> collect before_damage replacement/prevention triggers
  -> damage_dealt event
  -> health/resource changed event
  -> after_damage triggers
  -> state check: dying threshold
```

Damage and health loss are separate operations. Damage can be prevented or modified; health loss usually bypasses damage prevention unless a ruleset says otherwise.

### Dying Flow

```text
state check detects health <= threshold
  -> dying_started event
  -> open rescue response window if configured
  -> if rescued:
       health/resource changed event
       dying_resolved event
     else:
       player_death_started event
       death resolution
```

Hearthstone-like rules can configure no rescue window, so health <= 0 moves directly to hero/player death resolution.

### Death Flow

```text
player_death_started
  -> before_death triggers and replacement checks
  -> reveal role if configured
  -> move/drop/discard owned objects according to ruleset
  -> apply killer rewards/penalties
  -> player_status_changed(dead)
  -> remove from turn order if configured
  -> player_death_resolved
  -> check outcomes
```

The resolver must keep `dead` independent from `lost`. A dead player can later receive `won`.

### Outcome Predicate Model

Outcome predicates evaluate against state and the latest transaction context.

```yaml
winConditions:
  - id: hearthstone_hero_destroyed
    when:
      anyPlayer:
        hero:
          health: { lte: 0 }
    result:
      winners: [{ opponentsOf: matched.player }]
      losers: [{ player: matched.player }]

  - id: rebel_win
    when:
      all:
        - role: lord
          status: dead
        - not:
            all:
              - aliveRolesExactly: [lord, spy]
              - aliveRoleCount:
                  role: spy
                  equals: 1
    result:
      winners: [{ role: rebel }]
      losers: [{ notRole: rebel }]
```

Predicates should be data-backed where possible. If a rule needs code, it should be a named deterministic predicate in the outcomes module with declared inputs.

## 16. Reference Ruleset Implementation

### Hearthstone-Like Duel

Required configuration:

- Two seats.
- Personal deck and hand zones.
- Hero zone and board zone per player.
- Mana resource with max/current values.
- Mulligan prompt.
- Second-player coin-like token.
- Draw one per turn.
- Empty-deck fatigue damage.
- Main action window with card play, attacks, hero power, and end turn.
- Board capacity.
- Death and simultaneous death outcome rules.

Initial vertical slice cards:

- Direct damage spell.
- Vanilla minion.
- Minion with death trigger.
- Weapon-like attachment.
- Heal spell.
- Board-wide damage spell for simultaneous death tests.

### 三国杀-Like Identity Game

Required configuration:

- Six and eight seat presets.
- Circular turn order.
- Role deck and hidden role zone.
- Public lord role reveal.
- Character zone per player.
- Shared draw deck and discard.
- Hand zone per player.
- Equipment slots: weapon, armor, mount plus, mount minus, treasure.
- Phase graph: prepare, judgment, draw, play, discard, finish.
- Attack range and distance helpers.
- Basic attack card with dodge response.
- Rescue card usable during dying window.
- Death role reveal.
- Killer reward/penalty hooks.
- Role-based win conditions.

Initial vertical slice cards/skills:

- Attack.
- Dodge.
- Rescue/heal.
- Draw two.
- Discard one target card.
- Weapon that increases attack range.
- Armor that can prevent or modify attack damage.
- One passive character skill triggered on damage or death.

## 17. Server Design

### HTTP APIs

```text
POST /matches
GET  /matches/:matchId
POST /matches/:matchId/join
POST /matches/:matchId/start
POST /matches/:matchId/commands
GET  /content/games
GET  /content/games/:gameId/:version
GET  /content/cards/:catalogId/:version
GET  /replays/:matchId
```

The command endpoint is useful for tests and fallback clients. Real-time play should use WebSocket.

### WebSocket Protocol

Client to server:

```json
{
  "type": "command",
  "requestId": "req_123",
  "matchId": "match_1",
  "command": {
    "type": "play_card",
    "payload": {
      "cardId": "obj_17",
      "targets": ["obj_22"]
    }
  }
}
```

Server to client:

```json
{
  "type": "events",
  "matchId": "match_1",
  "fromSequence": 42,
  "events": [
    {
      "sequence": 43,
      "type": "card_moved",
      "payload": {}
    }
  ],
  "stateHash": "sha256:..."
}
```

Other server messages:

- `command_accepted`
- `command_rejected`
- `prompt_opened`
- `prompt_updated`
- `timer_updated`
- `snapshot`
- `match_completed`
- `resync_required`

### Reconnect

Reconnect flow:

1. Client authenticates.
2. Client sends last received sequence per match.
3. Server verifies viewer authorization.
4. If event gap is available, server sends projected events.
5. If event gap is too large, server sends projected snapshot.
6. Server sends open prompts for that viewer.

## 18. Persistence

### Tables

```text
game_definitions
  id, version, content_hash, json, state, created_at, published_at

card_catalogs
  id, version, content_hash, json, state, created_at, published_at

asset_bundles
  id, version, content_hash, manifest_json, state, created_at, published_at

matches
  id, game_definition_id, game_definition_version, content_lock_json,
  seed, status, created_at, started_at, completed_at, outcome_json

match_events
  match_id, sequence, transaction_id, type, payload_json,
  visibility_json, state_hash_after, created_at

match_snapshots
  match_id, sequence, state_json, state_hash, created_at

match_players
  match_id, player_id, user_id, seat_id, status, result_json

audit_log
  id, actor_id, action, target_type, target_id, payload_json, created_at
```

### Snapshot Policy

For MVP:

- Snapshot after setup.
- Snapshot every 50 events.
- Snapshot on match completion.

Replay tools should support full replay from event 0 even if snapshots exist.

### Asset Storage

Binary assets should not live in match events. Events and card templates reference asset ids and versions. The asset bundle manifest maps those references to content hashes and CDN/object storage URIs.

## 19. Validation And Content Build

### Schema Validation

Use generated JSON schemas for:

- `GameDefinition`
- `CardTemplate`
- `BehaviorDefinition`
- `AssetManifest`
- `LocalizationBundle`
- `RulesetFixture`

### Semantic Validators

Required validators:

- `validateReferences`
- `validateZones`
- `validatePhaseGraph`
- `validateBehaviorDeterminism`
- `validateSelectors`
- `validateTextSync`
- `validateUxHints`
- `validateVisibility`
- `validateWinConditions`
- `validateAssetManifest`

### Golden Fixture Format

```yaml
id: firebolt_kills_hero
gameDefinition: sample_duel@1.0.0
seed: test-seed-1
players:
  - id: p1
    deck: [firebolt]
  - id: p2
    deck: []
steps:
  - command:
      player: p1
      type: play_card
      card: firebolt
      targets: [p2.hero]
expect:
  outcome:
    winners: [p1]
    losers: [p2]
  finalStateHash: sha256:...
```

Golden tests should allow symbolic selectors for fixture readability but compile them to runtime ids before execution.

## 20. Testing Strategy

### Unit Tests

- Reducer applies each event type correctly.
- Selectors return legal targets and disabled reasons.
- Resource and cost validation.
- Damage, healing, death, and rescue modules.
- Phase graph transitions.
- Outcome predicates.
- Projection redaction.

### Golden Simulation Tests

Golden fixtures should cover PRD acceptance tests:

- Hearthstone-like hero death.
- Hearthstone-like simultaneous death draw.
- Fatigue escalation.
- Death trigger ordering.
- 三国杀-like role assignment and public lord reveal.
- Hidden role projection.
- Dying and rescue.
- Dead player skipped in turn order.
- Rebel win on lord death.
- Spy win in final duel.
- Lord/loyalist win when rebels and spies are dead.
- Killer reward and lord penalty.

### Property And Fuzz Tests

- Replay determinism under random legal commands.
- No projected state leaks hidden role/card names.
- Event sequence numbers are contiguous.
- No object exists in more than one zone.
- Zone capacity is never exceeded unless ruleset explicitly allows overflow.
- Dead players do not receive normal turns.
- Completed matches do not accept gameplay commands.

### Contract Tests

- WebSocket command/response shape.
- HTTP content bundle shape.
- Reconnect event gap behavior.
- Snapshot/resync behavior.

## 21. Observability

### Logs

Structured server logs:

- match id
- transaction id
- command id
- player id
- event sequence range
- resolver duration
- prompt id
- rejection reason
- state hash

### Metrics

Runtime metrics:

- active matches
- command latency
- resolver latency
- event persistence latency
- projection latency
- reconnect count
- prompt timeout count
- replay verification failures
- stuck transaction count

Content metrics:

- validation failures by type
- text sync warnings by severity
- golden fixture pass rate
- unpublished asset references

### Debug Tools

MVP debug CLI:

```text
millet validate content/rulesets/sample-duel
millet simulate fixtures/firebolt_kills_hero.yaml
millet replay --match match_123
millet project --match match_123 --viewer player_1 --sequence 80
millet diff-state state_a.json state_b.json
```

## 22. Security And Safety

### Trust Boundaries

- Clients are untrusted.
- Content draft authors are partially trusted.
- Published content is trusted only after validation.
- Runtime scripts, if enabled later, are untrusted and sandboxed.
- Admin APIs require explicit authorization and audit logs.

### Hidden Information

The server must never send unauthorized hidden payloads. This includes:

- Hidden roles.
- Hand contents.
- Deck order.
- Face-down cards.
- Private prompt choices.
- Admin/debug-only state.

Visibility projection should run server-side immediately before publishing events to each connection.

### Script Safety

If scripts are enabled after MVP:

- No filesystem.
- No network.
- No clock.
- No process APIs.
- No global mutable state across matches.
- CPU instruction budget.
- Memory budget.
- Deterministic RNG only through engine context.
- Engine API mutations only.
- Static declaration of event subscriptions and UX metadata.

## 23. Migration And Versioning

### Content Versioning

Content bundle versions are immutable. New balance changes create new versions.

Rules:

- Existing live matches keep their original content lock.
- New matches use the selected published version.
- Replays always load the original content lock.
- Deprecated content remains available for replay.
- Deleted binary assets are forbidden while referenced by any published bundle.

### Runtime Schema Versioning

Events include schema version metadata when the event payload shape changes.

Migration options:

- Prefer additive event payload changes.
- Maintain old reducers for old event versions.
- Snapshot migrations are allowed only if replay from event 0 remains possible.

## 24. Implementation Plan

### M0: Engine Skeleton

Deliverables:

- TypeScript workspace.
- JSON schema package.
- Core types for definitions, state, events, commands.
- Deterministic RNG.
- State hash utility.
- Event reducer.
- Basic zones and object movement.
- Replay runner.
- First fixture format.

Exit criteria:

- A setup fixture creates a match and replays to the same hash.
- Moving a card between zones is event-sourced and replayable.

### M1: Hearthstone-Like Vertical Slice

Deliverables:

- Two player duel ruleset.
- Personal decks, hands, heroes, boards.
- Mana module.
- Draw and fatigue module.
- Behavior AST interpreter for basic costs, selectors, and effects.
- Damage, death, and outcome module.
- Prompt support for mulligan and targeted card play.

Exit criteria:

- PRD Hearthstone-like acceptance tests pass as golden fixtures.

### M2: 三国杀-Like Vertical Slice

Deliverables:

- Six/eight player identity ruleset.
- Role assignment and projection.
- Circular turn order and phase graph.
- Shared deck/discard.
- Equipment slots.
- Distance/range selector helpers.
- Response windows.
- Dying/rescue/death flow.
- Role outcome predicates.

Exit criteria:

- PRD 三国杀-like acceptance tests pass as golden fixtures.
- Projection tests prove hidden roles and hands are not leaked.

### M3: Asset And Content Pipeline

Deliverables:

- Asset manifest schema.
- Bundle lock model.
- Content build CLI.
- Reference validation.
- Publish states.
- Rollback metadata.
- Localization placeholder validation.

Exit criteria:

- A sample ruleset publishes as immutable bundles and can start a match by bundle ref.

### M4: Behavior/Text/UX Sync

Deliverables:

- Canonical text generator.
- Behavior-to-text token checker.
- UX hint generator from selectors/effects.
- Golden fixture generator helpers.
- Optional LLM-assisted draft workflow behind manual review.

Exit criteria:

- Published sample cards have passing text sync checks or reviewed low-severity warnings.

### M5: Playtest Server

Deliverables:

- HTTP match/content APIs.
- WebSocket event stream.
- Command validation and rejection.
- Timers/default actions.
- Reconnect/resync.
- Snapshots.
- Basic replay viewer or CLI.
- Metrics and structured logs.

Exit criteria:

- Two browser clients can play a full duel.
- Six to eight clients can complete the identity-game vertical slice.
- Server restart can restore active matches from snapshot plus events.

## 25. Risks And Mitigations

### Behavior DSL Becomes Too Weak

Risk: designers need custom behavior before the DSL is expressive enough.

Mitigation:

- Keep effect primitives small.
- Add new primitives when repeated script patterns appear.
- Provide reviewed sandbox escape hatch after MVP.
- Require golden tests for every custom behavior.

### Hidden Information Leaks

Risk: event payloads or logs reveal hidden roles/cards.

Mitigation:

- Projection service is mandatory for all outbound messages.
- Redaction tests are required per ruleset.
- Public logs use projected event payloads, not internal events.
- Admin/debug streams are separately authorized.

### Trigger Ordering Bugs

Risk: complex cards depend on exact timing.

Mitigation:

- Central trigger queue with documented ordering.
- Timing groups in ruleset config.
- Golden fixtures for simultaneous death, death triggers, response chains, and rescue.
- State hash after every event.

### Content Versions Drift

Risk: replay or live matches load changed cards/assets.

Mitigation:

- Immutable published bundles.
- Content hashes in match locks.
- Replays fail if a required bundle hash is unavailable.
- Asset deletion blocked while referenced.

### LLM Output Changes Behavior

Risk: natural-language assistance introduces unreviewed logic changes.

Mitigation:

- AST is source of truth.
- LLM outputs are drafts only.
- Diffs and validators gate publish.
- Golden tests required for behavior changes.

## 26. Open Engineering Questions

1. Should the first content CLI be built before the server, or should schemas be loaded directly by tests until M3?
2. Should state use immutable data structures from the start, or plain objects with defensive cloning in reducers?
3. How much event payload redaction should be precomputed at persistence time versus projected on publish?
4. Which sandbox implementation should be selected after MVP if declarative behavior is insufficient?
5. Should clients receive optimistic local previews, or should all previews be server-computed in early playtests?

## 27. Definition Of Technical Done

The technical implementation is ready for MVP playtesting when:

- Both reference rulesets run through the same engine runtime.
- No core runtime branch checks for a specific game id.
- All match mutations are events.
- Replays are deterministic from seed plus event log.
- Open prompts survive reconnect.
- Hidden roles and hand contents are filtered server-side.
- Behavior definitions are validated before match start.
- Card text and UX hints are generated or checked from behavior metadata.
- Content bundles are immutable and locked per match.
- Golden fixtures cover all PRD acceptance tests.
