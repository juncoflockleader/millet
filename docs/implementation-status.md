# Implementation Status

Status: acceptance-complete for M0-M8; hardening backlog remains  
Goal: implement M0-M8 from `docs/milestones.md`.

## Current Verification Commands

```sh
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/run-tests.mjs
```

Latest local result:

- 128 tests passing.

Basic 1v1 demo smoke:

```sh
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/serve-demo.mjs
```

Latest local result:

- Demo server started at `http://127.0.0.1:8787/` with escalated local-listen permission.
- Headless browser smoke loaded `Ember Duel`, created a demo match, confirmed the image-generated board and card art assets loaded, cast `Firebolt`, confirmed the generated Firebolt VFX sheet rendered, and observed Player 2 health drop from 10 to 7 with no page errors.
- Multi-viewport browser smoke confirmed the scaled play area remains inside desktop, tablet, mobile, and tiny viewports, with no document scrolling beyond the window and no page errors.
- Tooltip smoke confirmed whole-card inspection and keyword tooltip rendering for card rules text.
- Interaction smoke confirmed legacy action buttons, click-to-select targeting, drag-to-target targeting, hero card ability targeting, hero ability button execution, display-slot property badges, and viewport fit at `1280 x 720`.
- Layout editor smoke confirmed the `Layout` panel opens, sliders update CSS variables, row handles update exported JSON/localStorage, edited card width applies to rendered cards, and the existing Firebolt action flow still works.
- Layout region smoke confirmed the editor overlay renders authored board layout regions and widget components, while layout handles remain active.
- Runtime region smoke confirmed hero, battlefield, equipment, hand, action, and history surfaces carry authored region/widget metadata and battlefield drops bind to battlefield regions.
- Runtime region renderer smoke confirmed player-side `HeroCard`, `CardRow`, `EquipmentSlot`, and `DeckStack` containers are selected through region/widget dispatch, center-lane system widgets expose `ActionPanel`, `HistoryLog`, and disabled `ChatWindow` surfaces, and `ActionPanel` renders live open prompt summaries.
- Asset library smoke confirmed the `Assets` panel opens, reads 12 assets from the ruleset manifest, filters VFX sheets, loads an image preview, reports usage labels, and closes when the `Layout` panel opens.
- Preview fixture smoke confirmed the `Preview` panel opens, reads 5 ruleset fixtures, renders equipment/minion/projected prompt states, disables live refresh/end-turn controls, and reports read-only action attempts in the log.
- Prompt-control browser smoke confirmed live main-action `End Turn` advances from Player 1 to Player 2, and the read-only prompt fixture renders responder progress plus disabled response/pass controls with no page errors.
- Hidden-object preview smoke confirmed projected hidden cards render as generic `Hidden Card` surfaces and do not leak the redacted template or object id in visible UI.
- UI engine implementation has started with schema-backed board layout content, ruleset `ui.defaultBoardLayout` discovery, read-only ruleset content serving, and Ember Duel consuming ruleset layout tokens as authored defaults.
- The next layout-editor slice added board layout region geometry bounds validation and a schema-backed region/widget guide overlay in Ember Duel.
- The next runtime-layout slice threaded schema-backed board region/widget metadata into live Ember Duel DOM surfaces and target validation.
- The next runtime-region-renderer slice moved player-side hero, battlefield, equipment, hand, and deck surfaces onto a small widget-component dispatch layer, added the disabled ChatWindow center-lane surface, and connected ActionPanel prompt summaries to projected prompt state.
- The next UI slice added schema-backed presentation catalogs, ruleset `ui.defaultPresentationCatalog` discovery, validation for presentation/template/behavior references, and Ember Duel consumption for card, hero, equipment, and minion presentation.
- The next asset slice expanded `sample-duel` asset metadata for board background, card portraits, and VFX sheets, added browser `publicPath` and generation metadata fields, and exposed the manifest through the Ember Duel `Assets` panel.
- The next display-validation slice added semantic checks for unsupported default property display slots/icons in card catalogs, presentation catalogs, hero displays, and hero ability displays.
- The next preview-fixture slice added schema-backed read-only UI preview states for card, hero, equipment, and minion rendering, plus demo consumption through the `Preview` panel.
- The next hidden-rendering slice made UI preview fixtures projection-safe for hidden objects and added a generic hidden-card renderer for redacted projected cards.
- The next identity-layout slice added a schema-backed Sanguosha-like eight-seat board layout for `sample-identity`, including seat ring, role summary, shared deck/discard, active hand, judgment, equipment, action/response, and history regions.
- The next prompt-control slice upgraded `ActionPanel` from summary chips to prompt-specific controls for response mode, responder progress, pass answers, main actions, allowed response behaviors, and a read-only prompt preview fixture.

CLI smoke checks:

```sh
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/sample-duel
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs deps-ruleset packages/rulesets/sample-duel
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs gen-schema-types packages/content-schema/src/schema-types.generated.d.ts
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs bundle packages/rulesets/sample-identity
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs store-bundle packages/rulesets/sample-duel /private/tmp/millet-bundle-store-smoke
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs replay packages/replay-tools/fixtures/m0-zone-movement.fixture.json
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs metrics-match /private/tmp/millet-metrics-smoke-20260618/matches sample_duel_match /private/tmp/millet-metrics-smoke-20260618/bundles
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs metrics-match /private/tmp/millet-metrics-smoke-20260618/matches sample_duel_match /private/tmp/millet-metrics-smoke-20260618/bundles --text
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs project-fixture packages/replay-tools/fixtures/m0-zone-movement.fixture.json p1 3
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs diff-state /private/tmp/millet-diff-smoke-20260618/left.json /private/tmp/millet-diff-smoke-20260618/right.json
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --experimental-strip-types scripts/millet.mjs debug-html /private/tmp/millet-debug-html-smoke-20260618/matches sample_duel_match /private/tmp/millet-debug-html-smoke-20260618/debug.html /private/tmp/millet-debug-html-smoke-20260618/bundles
```

Latest local result:

- All prior CLI smoke commands exited successfully.
- `project-fixture` with an explicit sequence projected the fixture at `lastSequence: 3`.
- `gen-schema-types` refreshed checked-in TypeScript declarations from the hand-authored JSON schemas.
- `deps-ruleset` emitted file, behavior, card template, zone, asset, localization nodes plus dependency edges for `sample-duel`.
- A persisted `sample-duel` match also replayed successfully through `replay-match` with bundle-store content-lock verification.
- A persisted `sample-duel` match exported metrics successfully through `metrics-match` JSON and text modes with bundle-store content-lock verification.
- `diff-state` emitted structural path differences plus semantic match/player summaries for sample match-state JSON files.
- `debug-html` generated a static match debugger HTML file with summary panels, player/zone/outcome tables, event type counts, timeline entries, and embedded JSON debug data.
- `validate packages/rulesets/sample-duel` returned no issues after second-player coin and weapon durability content changes.
- `validate packages/rulesets/sample-identity` returned no issues after delayed-judgment, nullification-stack, skip-play/skip-draw delayed trick, extra-phase, named phase skill, and named armor content changes.

## Milestone Status

### M0: Foundation And Repo Skeleton

Status: implemented for the current acceptance gates.

Evidence:

- TypeScript-oriented workspace metadata exists in `package.json` and `tsconfig.json`.
- Core runtime types exist in `packages/engine-core/src/types.ts`.
- JSON schemas and a lightweight schema validator exist in `packages/content-schema/src/schemas.ts`.
- Schema TypeScript declaration generator exists in `packages/content-schema/src/typegen.ts`.
- Checked-in generated declarations exist at `packages/content-schema/src/schema-types.generated.d.ts`.
- Deterministic RNG exists in `packages/engine-core/src/rng.ts`.
- Stable hashing exists in `packages/engine-core/src/hash.ts`.
- Event reducer exists in `packages/engine-core/src/reducer.ts`.
- State invariant checks exist in `packages/engine-core/src/invariants.ts`.
- Replay runner exists in `packages/replay-tools/src/replay.ts`.
- M0 replay fixture exists at `packages/replay-tools/fixtures/m0-zone-movement.fixture.json`.
- Tests cover deterministic replay, event sequence gaps, invalid zone movement, stable hashing, deterministic RNG, schema type generation, and generated declaration drift.

Remaining hardening:

- Add a normal project-local TypeScript toolchain when dependency installation is available.
- Broaden generated type declarations as the schema subset grows.

### M1: Generic Engine Kernel

Status: implemented as an MVP kernel.

Implemented:

- Command resolver for `execute_behavior` and `answer_prompt`.
- Behavior AST slice with costs, selectors, conditions, effects, text, and UX metadata.
- Spend-resource cost.
- Player/object selector validation and legal-target summaries.
- Effects:
  - deal damage
  - deal damage to all players
  - heal
  - prevent next damage
  - move card
  - equip object into a player equipment slot with replacement
  - resolve delayed effects from judgment zones
  - draw cards
  - fatigue-style empty deck damage
  - set resource
  - adjust resource
  - toggle resource
  - conditionally execute a behavior based on a resource
  - set player status
  - destroy object
  - set object exhaustion
  - adjust object counters
  - destroy object when a counter reaches a threshold
  - register trigger
  - open prompt
- Prompt lifecycle events.
- Trigger registration and deterministic after-event firing.
- Direct death and dying-mode death checks.
- Basic last-alive outcome mode.
- Generic phase graph runner with entry behavior hooks, action-window stops, resource-driven phase skips, and resource-driven phase insertion.
- Object exhaustion and turn advancement primitives.
- Circular seat distance and attack range helpers.
- Player-owned zone references and prompt-id templates for reusable phase behaviors.
- Object selector filters for owner, zone owner, and zone type.

Evidence:

- Tests cover paying mana, targeted lethal damage, simultaneous death draw, prompt open/answer, trigger firing, invalid resource rejection, draw movement, fatigue escalation, damage prevention for targeted and all-player damage, and legal target summaries.
- Tests cover seeded random legal command sequences preserving state invariants.
- Ruleset tests cover equipment selector ownership/zone filtering through equip commands.
- Ruleset tests cover delayed-effect resolution from player-owned judgment zones.

Remaining hardening:

- Richer trigger timing groups.
- Richer replacement effects and timing windows beyond the current generic damage-prevention primitive.
- More formal rules module package boundaries.

### M2: Hearthstone-Like Duel Vertical Slice

Status: implemented as a tested vertical slice.

Implemented:

- `sample-duel` ruleset files in `packages/rulesets/sample-duel`.
- Versioned `sample-duel` card catalog with spell, minion, weapon, coin, and reward templates.
- Two player setup.
- Personal hand/deck/board zones.
- Board capacity.
- Mana/health/fatigue resources.
- Mulligan-style prompt.
- Direct damage card.
- Board-wide simultaneous damage card.
- Second-player coin card that grants current-turn mana and discards itself.
- Weapon zone and weapon attack behavior with durability counters.
- Death-trigger minion behavior.
- Empty-deck fatigue behavior.
- Last-alive and simultaneous draw outcomes.
- Phase graph automation for turn start, mana refresh, draw/fatigue, and main action prompt.
- Minion attack behavior with exhaustion.
- Next-player turn advancement helper.
- Service-level `end_turn` command that advances to the next alive player and starts their phase graph.
- Active-player deck/hand resolution for draw/fatigue phase automation.

Evidence:

- Tests cover hero death win, simultaneous hero death draw, fatigue escalation, death trigger ordering, legal target metadata, and mulligan prompt creation.
- Tests cover the second-player coin increasing current mana and moving to discard.
- Tests cover weapon attacks decrementing durability and destroying the weapon at zero.
- Tests cover the sample duel phase graph refreshing mana, drawing, and stopping at the main action window for both players.
- Tests cover minion attack exhaustion and next-player turn advancement.
- Tests cover a hero ability that spends active-player mana and damages the enemy hero without a source card object.
- Server tests cover `end_turn` advancing to the next player and starting their phase graph.

Remaining hardening:

- More exact Hearthstone-specific timing details and broader card catalog coverage.

### M3: Multiplayer Identity Kernel

Status: implemented as a tested kernel slice.

Implemented:

- Circular seating helper with dead-player skipping.
- Viewer-specific state/event/prompt projection.
- Hidden object redaction for roles and private cards.
- Multi-responder prompt metadata.
- Multi-responder prompt progression for `all_in_order`, `any_until_success`, and `priority_loop` windows.
- Current-responder tracking and per-responder prompt answers.
- Prompt answer payloads can execute allowlisted response behaviors through the normal behavior resolver.
- Prompt response behaviors can merge prompt-level default selections.
- Dying mode with rescue prompt opening.
- Configurable all-pass dying prompt automation.
- Rescue behavior support through heal plus status change.
- Seat distance and range reachability helpers.
- Equipment-derived attack range helper.
- Range-aware player selector validation for effective attack range.

Evidence:

- Tests cover hidden role projection, private rescue prompt projection, next-alive-seat skipping, attack-to-dying, and rescue-to-alive.
- Tests cover projection invariants across all eight player views.
- Tests cover ordered responder prompts, any-until-success pass/success prompts, priority-loop pass cycles, response behavior execution, and response allowlist rejection.
- Tests cover out-of-range target metadata and attack rejection.
- Server tests cover guarded prompt default passes and stale timeout cancellation.

Remaining hardening:

- Broader prompt timeout policy coverage for reconnect grace and multi-step action windows.

### M4: 三国杀-Like Identity Vertical Slice

Status: implemented as a tested vertical slice.

Implemented:

- `sample-identity` ruleset files in `packages/rulesets/sample-identity`.
- Versioned `sample-identity` card catalog with basic, trick, delayed trick, equipment, judgment, and identity templates.
- Schema-backed `sample-identity` board layout for 6-8 player identity tables.
- Six and eight player role presets.
- Public lord role and hidden non-lord roles.
- Shared deck/discard and per-player hand/equipment zones.
- Per-player judgment zones.
- Character objects and health initialization.
- Shared draw deck seeded with sample cards for phase automation.
- Executable prepare, judgment, draw, play, discard, and finish phase graph.
- Judgment phase delayed-effect resolution from the active player's judgment zone.
- Draw phase from the shared deck into the active player's hand.
- Play phase action-window prompt for the active player.
- Discard phase hand-limit enforcement by current health.
- Attack behavior.
- Range enforcement for attack selectors.
- Dodge response prompt, default damage behavior, and dodge response behavior execution.
- Chained nullification stack behavior with priority-loop responders.
- Nullification parity settlement where odd chains cancel and even chains allow the trick to resolve.
- Weapon equip-from-hand and weapon replacement lifecycle.
- Armor equip/replacement lifecycle with generic damage-reduction equipment stat.
- Named armor auto-dodge response behavior selected from equipped armor.
- Offensive and defensive mount equip lifecycle with effective-distance modifiers.
- Rescue behavior.
- Rescue window all-pass flow into death.
- Finish-dying behavior.
- Delayed judgment placement and judgment-zone resolution behavior.
- Judgment-card reveal from shared deck into discard for delayed tricks.
- Lightning-style delayed judgment hit matching on card suit/rank.
- Delayed trick miss redirection to the next alive player's judgment zone.
- Skip-play delayed trick with heart miss and non-heart phase-skip judgment outcomes.
- Skip-draw delayed trick with club miss and non-club phase-skip judgment outcomes.
- Extra draw phase insertion hook for phase-modification skills.
- Named Yingzi-style character skill that gates an extra draw phase insertion on an equipped character source.
- Rebel, spy, and lord-camp outcome predicates.
- Dead rebel can still be marked winner when rebel faction wins later.
- Killer reward and lord-kills-loyalist penalty hooks.
- Weapon-style equipment range modifier in setup.
- Equipment distance and damage modifiers in generic range/damage helpers.

Evidence:

- Tests cover six/eight role distributions, lord-only public reveal, attack/dying prompt, rescue, rebel win, spy win, lord/loyalist win, dead rebel win, reward hook, and penalty hook.
- Tests cover all eligible rescuers passing and the dying player becoming dead.
- Tests cover circular distance/range reachability, equipment-modified attack range, weapon equip/replacement, armor equip/replacement and damage reduction, named armor auto-dodge response, mount effective-distance modifiers, selector-level range rejection, dodge response/default damage, dodge behavior execution, delayed judgment-zone placement/resolution, judgment-card hit damage, and judgment-card miss redirection.
- Tests cover chained nullification with one response cancelling a trick and two chained responses allowing the trick to resolve.
- Tests cover a delayed skip-play trick skipping the play action window on hit and opening play normally on heart miss.
- Tests cover a delayed skip-draw trick skipping the draw phase on non-club hit and drawing normally on club miss.
- Tests cover resource-driven insertion of an extra draw phase.
- Tests cover a named Yingzi-style skill using character-source selection to insert an extra draw phase.
- Tests cover the identity phase graph resolving judgment, drawing, opening the play action window, and discarding down to current-health hand limit.

Remaining hardening:

- More exact advanced 三国杀 phase details and additional named phase-modification skills beyond the sample Yingzi-style extra-draw hook.
- Full delayed trick catalog beyond the sample lightning, skip-play, and skip-draw cards.
- Full equipment catalog coverage beyond the sample named armor.

### M5: Content And Asset Pipeline

Status: implemented for the current acceptance gates.

Implemented:

- Content build helpers in `packages/content-build/src/build.ts`.
- Ruleset validation for required game definition fields.
- Schema-backed validation for game definitions, behavior manifests, card catalogs, asset manifests, localization bundles, match events, and replay fixtures.
- Semantic validation that `game-definition.json` behavior references match `behaviors.json`.
- Behaviors manifest validation.
- Card catalog validation for duplicate template ids plus behavior, asset, and localization references.
- Card and presentation display validation for unsupported default property slots and icons.
- UI preview fixture validation for missing refs, duplicate fixture ids, unknown player refs, unknown object refs, unknown template refs, hidden-object leaks, visible objects missing template ids, and map key/id drift.
- Asset manifest validation.
- Asset compatibility validation for SHA-256 hashes, approved URI schemes, approved license identifiers, browser public paths, image media types, and image dimensions.
- Localization validation.
- Bundle hashing with stable hashes.
- Ruleset dependency graph reports for files, behaviors, card templates, zones, assets, localization strings, and declaration/reference edges.
- File-backed immutable bundle store.
- Match content-lock references generated from built ruleset bundles.
- Replay/load content-lock verification with clear missing-bundle errors.
- Immutable in-memory content registry with validate, publish, deprecate, and rollback states.
- Published bundle severity gate rejects validation warnings as well as errors.
- Asset, localization, and card catalog manifests for both sample rulesets.
- `sample-duel` asset manifest metadata for the demo board background, six card portraits, four VFX sheets, generated prompt summaries, generation ids, public paths, and usage labels.
- `sample-duel` UI preview fixtures for card, hero, equipment, and minion rendering states.
- CLI `validate` and `bundle` commands.

Evidence:

- Tests validate and hash both sample rulesets.
- Tests reject schema violations with path-qualified validation errors.
- Tests reject behavior manifest mismatches.
- Tests reject invalid card catalog behavior, asset, localization, and duplicate-template references.
- Tests reject incompatible asset metadata, including unsupported image media types and out-of-range image dimensions.
- Tests cover ruleset dependency graph reports.
- Tests cover file bundle store writes, content-lock verification, and missing bundle errors.
- Tests cover publish/deprecate/rollback state transitions.
- Tests cover the published-content warning gate.
- CLI smoke checks validate `sample-duel`, report dependency graphs for `sample-duel`, bundle `sample-identity`, store `sample-duel`, and replay a fixture.
- CLI `replay-match` smoke check passes with bundle-store verification.

Remaining hardening:

- Database-backed content registry.
- Binary probing of real asset files/object blobs beyond declared manifest metadata.

### M6: Behavior Text And UX Sync

Status: implemented for the current acceptance gates.

Implemented:

- Canonical behavior text generation in `packages/content-build/src/text-sync.ts`.
- Behavior text sync warning checks.
- Localization placeholder syntax checks in ruleset validation.
- Prompt/log UX template placeholder validation with public-template hidden-information guards.
- UX hint generation from selectors/effects.
- Offline behavior draft/review workflow for LLM- or human-proposed ASTs, requiring validation and manual approval before artifact export.
- Behavior definitions accept `text` and `ux` metadata.

Evidence:

- Tests generate canonical text and UX hints for `sample-duel` behavior definitions.
- Tests validate projection-safe prompt/log placeholders, reject public templates that reference hidden object fields, and allow private-scoped UX templates to use raw hidden placeholders.
- Tests prove draft behavior artifacts cannot export before manual approval, cannot export with validation issues, and export reviewed AST/text without retaining prompt prose.
- Tests reject malformed localization placeholders while allowing valid placeholders.

Remaining hardening:

- Optional provider-specific LLM integration and generated edge-case test suggestions around the offline review gate.

### M7: Playtest Server

Status: implemented for the current acceptance gates with file-backed prototype persistence.

Implemented:

- In-memory match service in `packages/server/src/match-service.ts`.
- File-backed event/snapshot store in `packages/server/src/file-store.ts`.
- File-backed match snapshot retention policy via configurable `maxSnapshots`.
- File-backed scheduled action store for timer/default-action persistence.
- File-backed scheduled action retention policy via configurable `maxActions`.
- Match creation for `sample-duel` and `sample-identity`.
- Match creation writes built-bundle content locks and can populate a bundle store.
- Service-side command authorization for match id, seated player, player status, source-object control, prompt responders, active-player end turn, and active-player behavior execution.
- Structured HTTP error payloads for authorization, invalid JSON, and engine command rejections.
- User-session authorization that maps `userId` to seated player ownership for commands and private projections.
- HTTP prototype session headers:
  - `x-millet-user-id`
  - `x-millet-admin`
- WebSocket prototype session headers use the same user/admin authorization path for private projection and command messages.
- HTTP match creation, summary fetch, projected state fetch, projected replay fetch, command submission, SSE, WebSocket upgrade, and static demo routes.
- Command submission through the engine resolver.
- Event accumulation.
- Snapshot capture.
- Reload by replaying persisted events.
- Service restore hook for loading persisted matches back into a live in-memory service.
- Reconnect projection for state and historical events.
- Event stream subscriptions.
- SSE event stream adapter with projected backlog, live projected events, and HTTP route wiring.
- Dependency-free WebSocket frame/handshake adapter.
- WebSocket match stream with projected backlog, live projected events, command messages, command accepted/rejected responses, ping/pong, and HTTP upgrade route wiring at `/matches/:id/ws`.
- Backpressure-aware WebSocket frame buffering that queues writes while the sink is above its high-water mark and flushes on `drain`.
- Connected WebSocket client flows can complete `sample-duel` matches and 6/8-player `sample-identity` matches.
- Deterministic scheduler for default actions.
- Guarded prompt timeout/default-pass scheduler with stale-action cancellation.
- Guarded turn timeout scheduler that emits default `end_turn` commands and cancels stale timers.
- Disconnect/reconnect helpers and reconnect grace timers that expire only while a player remains disconnected.
- Auto-discard timers that deterministically move excess hand cards to discard and cancel when the hand is no longer over limit.
- Scheduled timers can be saved, loaded, and fired after a service restart.
- `end_turn` command support for advancing the active player and running the next action window in `sample-duel`.
- `end_turn` command support for finishing `sample-identity` discard/finish cleanup and starting the next alive player's identity phase graph.
- Identity matches declare service-level lord-camp, rebel, or spy outcomes after ruleset predicates become true.
- Metrics and debug-report helpers.
- Metrics snapshot and text export helpers.
- Transaction-level runtime log summaries with match id, transaction id, command id, sequence range, event types, and state hash.
- HTTP server wrapper in `packages/server/src/http-server.ts`.

Evidence:

- Tests cover match creation, command submission, completion, snapshot capture, reconnect projection, projected HTTP state fetch, projected HTTP replay fetch, fair demo-duel setup, player 1 first action window startup, mirrored player 2 demo cards, and active-player behavior-command rejection.
- Tests reject unauthorized commands before mutation.
- Tests cover structured HTTP engine rejection payloads.
- Tests reject wrong-user session commands/projections and verify owner sessions receive private projected state.
- Tests cover file-backed event persistence, reload by replay, content-lock verification, scheduled-action persistence, and firing a reconnect grace timer after service restart.
- Tests cover file-backed snapshot retention pruning without losing replay recovery.
- Tests cover file-backed scheduled-action retention pruning.
- Tests cover event stream publication and scheduled default action execution.
- Tests cover SSE encoding, projected hidden-role backlog redaction, live stream delivery, unsubscribe, and projected reconnect history.
- Tests cover WebSocket accept-key generation, masked client-frame decoding, projected hidden-role backlog redaction, live command submission, accepted/rejected responses, user-owned private upgrade authorization, and HTTP upgrade handshake wiring.
- Tests cover WebSocket frame queueing while the sink is backpressured and flushing queued frames on `drain`.
- Tests cover connected WebSocket clients completing a `sample-duel` match, rejecting later gameplay commands after completion, and completing 6/8-player `sample-identity` matches through the rescue/death/outcome flow.
- Tests cover prompt timeout default passes and cancellation of stale prompt timeouts after manual response.
- Tests cover guarded turn timeouts, stale turn timer cancellation, reconnect grace expiration/cancellation, and auto-discard expiration/cancellation.
- Tests cover service-level `end_turn` automation.
- Tests cover service-level identity `end_turn` cleanup and next-turn startup.
- Tests cover metrics, metrics snapshot export, metrics text export, debug report generation, and transaction log sequence/hash summaries.
- HTTP server construction and static demo file serving are tested. Socket binding was smoke-tested with escalated local-listen permission for the demo server.

Remaining hardening:

- Database-backed event store.
- Socket-level WebSocket binding tests in an environment that permits listening.
- Database-backed scheduled action store.
- Production identity-provider/session integration beyond prototype headers.

### M8: Internal Tooling And Hardening

Status: implemented for the current acceptance gates.

Implemented:

- CLI entrypoint at `scripts/millet.mjs`.
- Commands:
  - `validate`
  - `bundle`
  - `deps-ruleset`
  - `gen-schema-types`
  - `store-bundle`
  - `replay`
  - `replay-match`
  - `debug-match`
  - `debug-html`
  - `metrics-match`
  - `project-fixture`
  - `diff-state`
  - `diff-ruleset`
- Replay fixture runner.
- Projection helper.
- Schema type declaration generation helper.
- Ruleset bundle diff by content hash.
- Ruleset dependency graph reporting.
- Structured state diff.
- Rich semantic match-state diff summaries for match metadata, turn, players, zones, objects, prompts, and outcomes.
- Match metrics JSON export.
- Prometheus-style match metrics text export.
- Static HTML match debug UI export with summary metrics, players, prompts, event types, zones, outcomes, timeline, and embedded JSON data.
- Static HTML timeline filtering with visible event counts.
- Static HTML zone/object drilldowns plus a dedicated object table with per-object JSON details.
- Sequence-limited fixture projection through `project-fixture <fixture> <playerId> <sequence>`.
- Seeded fuzz/property-style tests.
- Debug match CLI and state projection fixture CLI.

Evidence:

- CLI smoke check passes for `validate`, `bundle`, and `replay`.
- CLI smoke check passes for `metrics-match` JSON and text modes.
- CLI smoke check passes for `diff-state` rich reports.
- CLI smoke check passes for `debug-html`.
- CLI smoke check passes for sequence-limited `project-fixture`.
- Test suite covers replay, projection behavior, validation, rich state diffing, and bundle hashing.
- Test suite covers schema type generation and checked-in declaration drift.
- Test suite covers static debug HTML rendering, timeline filter controls, and escaping of unsafe visible and embedded data.
- Test suite covers static debug HTML zone/object drilldown rendering.
- File-backed persisted matches can be replayed by store path and match id.
- Persisted match replay can verify required content bundles by content hash.
- Persisted match metrics export can verify required content bundles by content hash.
- Test suite covers seeded legal-command fuzzing and hidden-role projection invariants.
- Test suite covers transaction-level runtime log summaries with match id, transaction id, command id, sequence range, and state hash.

Remaining hardening:

- Interactive/live debug UI beyond the current static drilldowns.

## Immediate Next Step

The next highest-value work is to deepen M7 and exact rules coverage:

- Add socket-level WebSocket binding tests in an environment that permits binding.
- Add more exact named phase-modification skill hooks beyond the sample Yingzi-style extra-draw hook.
- Add broader equipment catalogs and any remaining delayed trick variants beyond the sample cards.
- Add live/interactive debug UI capabilities beyond the current static drilldowns.
