# Millet

Millet is a generalized multiplayer turn-based card game engine.

The current implementation covers the M0-M8 milestone path as a set of tested prototype slices: deterministic replay, generic behavior resolution, two reference rulesets, content validation, text/UX sync helpers, playtest-server scaffolding, and internal replay/debug tooling.

## Documentation

Start with `docs/index.md`.

- `docs/quick-start.md` gets you from checkout to a playable match and API command.
- `docs/quick-start.html` is a standalone interactive quick-start page with a tiny-game workshop, checklist, command builder, and doc router.
- `docs/concepts.md` explains the engine model.
- `docs/ruleset-authoring.md` explains how to modify or create rulesets.
- `docs/server-api.md` covers HTTP, SSE, WebSocket, projection, and command submission.
- `docs/assets-and-ux.md` covers generated assets, behavior-to-UX mapping, prompts, and animation.
- `docs/testing-and-debugging.md` covers validation, replay, projection, state diffing, and debug workflows.

## Run Tests

This repo is dependency-free for the first implementation slice and uses Node's built-in test runner.

```sh
node scripts/run-tests.mjs
```

If your environment needs explicit TypeScript stripping:

```sh
node --experimental-strip-types --test packages/replay-tools/src/replay.test.ts
```

In the Codex desktop runtime used for this repository, Node is available at:

```sh
/Users/jiawei/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/run-tests.mjs
```

## Play The Basic 1v1 Demo

```sh
node --experimental-strip-types scripts/serve-demo.mjs
```

Open `http://127.0.0.1:8787/` to play the hotseat `Ember Duel` prototype. The demo uses the real server command/state APIs and the `sample-duel` ruleset. Notes and known issues are tracked in `docs/basic-duel-demo.md`.

## CLI

```sh
node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/sample-duel
node --experimental-strip-types scripts/millet.mjs deps-ruleset packages/rulesets/sample-duel
node --experimental-strip-types scripts/millet.mjs gen-schema-types packages/content-schema/src/schema-types.generated.d.ts
node --experimental-strip-types scripts/millet.mjs bundle packages/rulesets/sample-identity
node --experimental-strip-types scripts/millet.mjs store-bundle packages/rulesets/sample-duel /private/tmp/millet-bundle-store-smoke
node --experimental-strip-types scripts/millet.mjs replay packages/replay-tools/fixtures/m0-zone-movement.fixture.json
node --experimental-strip-types scripts/millet.mjs replay-match /private/tmp/millet-cli-matches sample_duel_match /private/tmp/millet-cli-bundles
node --experimental-strip-types scripts/millet.mjs debug-match /private/tmp/millet-cli-matches sample_duel_match /private/tmp/millet-cli-bundles
node --experimental-strip-types scripts/millet.mjs debug-html /private/tmp/millet-cli-matches sample_duel_match /private/tmp/millet-debug.html /private/tmp/millet-cli-bundles
node --experimental-strip-types scripts/millet.mjs metrics-match /private/tmp/millet-cli-matches sample_duel_match /private/tmp/millet-cli-bundles
node --experimental-strip-types scripts/millet.mjs metrics-match /private/tmp/millet-cli-matches sample_duel_match /private/tmp/millet-cli-bundles --text
node --experimental-strip-types scripts/millet.mjs project-fixture packages/replay-tools/fixtures/m0-zone-movement.fixture.json p1 3
node --experimental-strip-types scripts/millet.mjs diff-state /private/tmp/millet-diff-smoke-20260618/left.json /private/tmp/millet-diff-smoke-20260618/right.json
node --experimental-strip-types scripts/millet.mjs diff-ruleset packages/rulesets/sample-duel packages/rulesets/sample-identity
```

The implementation currently includes tested vertical slices for `sample-duel` and `sample-identity`, plus thin content, text/UX sync, server, and tooling surfaces. See `docs/implementation-status.md` for the current milestone-by-milestone status.

Current tested surfaces include:

- deterministic replay and state hashing
- schema-backed validation plus generated TypeScript declarations
- behavior execution, prompts, triggers, damage prevention, death/dying, and outcomes
- multi-responder response windows with ordered, any-until-success, priority-loop, and allowlisted response behavior execution
- sample duel phase graph automation with player-relative draw/action prompts
- hidden-role projection, identity-game phase graph automation, rescue/all-pass death/outcome flows, and hand-limit discard
- schema-backed ruleset/card-catalog validation, semantic behavior/asset/localization reference checks, bundle hashing, content-lock verification, and publish/rollback registry
- warning-free publish gates
- asset hash, source URI, license, media type, and image dimension compatibility checks
- localization placeholder validation
- projection-safe prompt/log UX template validation
- offline behavior draft/review workflow for LLM- or human-proposed ASTs
- ruleset dependency graph reports for files, behaviors, card templates, zones, assets, and localization
- in-memory and file-backed match plus scheduled-timer persistence
- file-backed snapshot and scheduled-action retention policies
- service-side command authorization and user-to-player ownership checks
- projected HTTP state/replay APIs, event stream subscriptions, projected SSE and WebSocket event streams, deterministic scheduled default actions, guarded prompt timeout passes, turn timeouts, reconnect grace timers, and auto-discard timers
- WebSocket frame backpressure queueing with drain-based flush
- connected WebSocket client completion flows for two-player duel and six/eight-player identity matches
- structured HTTP rejection payloads for invalid commands and authorization failures
- identity service outcome declaration after lord-camp, rebel, or spy predicates become true
- seeded fuzz/projection invariant tests
- minion attack exhaustion, second-player coin, duel weapon durability, next-player turn advancement, service-level `end_turn`, identity dodge/default-damage prompts, named armor auto-dodge response, delayed judgment-card hit/miss resolution with miss redirection, delayed skip-play and skip-draw phase skips, resource-driven and named Yingzi-style extra phase insertion, chained nullification stack settlement, weapon/armor/mount equip lifecycles, equipment-aware range targeting, and identity turn cleanup/start automation
- match metrics snapshots, metrics text export, and debug reports
- transaction-level runtime logs with match id, transaction id, command id, sequence range, event types, and state hash
- rich match-state diff reports with structural paths and semantic summaries
- static HTML match debug UI export with timeline filtering and zone/object drilldowns
