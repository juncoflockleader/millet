# Testing And Debugging Guide

Millet is built around deterministic replay. When something goes wrong, capture the command, event sequence, state projection, and content hash before guessing.

## Run All Tests

```sh
npm test
```

Expected current result:

```text
tests 128
pass 128
fail 0
```

## Run Focused Tests

Use Node's built-in test runner:

```sh
node --experimental-strip-types --test packages/rulesets/sample-duel/sample-duel.test.ts
node --experimental-strip-types --test packages/server/src/match-service.test.ts
node --experimental-strip-types --test packages/server/src/http-server.test.ts
```

## Validate Ruleset Content

```sh
node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/sample-duel
node --experimental-strip-types scripts/millet.mjs deps-ruleset packages/rulesets/sample-duel
```

Use validation before debugging runtime behavior. Many runtime problems are actually broken references, localization drift, or asset metadata mismatches.

## Replay A Fixture

```sh
node --experimental-strip-types scripts/millet.mjs replay packages/replay-tools/fixtures/m0-zone-movement.fixture.json
```

Replay verifies that an event sequence is valid and deterministic.

## Project A Fixture For A Viewer

```sh
node --experimental-strip-types scripts/millet.mjs project-fixture packages/replay-tools/fixtures/m0-zone-movement.fixture.json p1 3
```

Use projection checks when testing hidden hands, hidden roles, private prompts, or public board objects.

## Diff Two States

```sh
node --experimental-strip-types scripts/millet.mjs diff-state /tmp/left.json /tmp/right.json
```

The diff reports structural paths and semantic summaries.

## Debug Stored Matches

The file-backed store can reload matches by replaying persisted events. Useful commands:

```sh
node --experimental-strip-types scripts/millet.mjs replay-match /tmp/millet-matches match_1 /tmp/millet-bundles
node --experimental-strip-types scripts/millet.mjs debug-match /tmp/millet-matches match_1 /tmp/millet-bundles
node --experimental-strip-types scripts/millet.mjs metrics-match /tmp/millet-matches match_1 /tmp/millet-bundles
node --experimental-strip-types scripts/millet.mjs metrics-match /tmp/millet-matches match_1 /tmp/millet-bundles --text
```

Generate a static debug page:

```sh
node --experimental-strip-types scripts/millet.mjs debug-html /tmp/millet-matches match_1 /tmp/millet-debug.html /tmp/millet-bundles
```

## Browser Demo Smoke Test

Manual smoke:

1. Run `npm run demo`.
2. Open `http://127.0.0.1:8787/`.
3. Create a match.
4. Cast `Firebolt`.
5. Confirm Player 2 health changes from `10` to `7`.
6. Confirm the event log records damage, resource, and card movement events.

## What To Capture In A Bug Report

Capture:

- ruleset id and version
- match id
- command id and payload
- viewer id or admin flag
- latest sequence before and after the action
- rejection `error` and `message`, if any
- projected state for the affected viewer
- admin state only if the issue is local/debug-only or secrets are safe to expose
- content hash when bundles are involved

## Common Failure Patterns

| Symptom | Likely Cause | Check |
| --- | --- | --- |
| Command rejected with authorization error | Wrong user header or player id | `x-millet-user-id`, command `playerId`, active player |
| Legal card button disabled | UI cannot find matching behavior/template | `CARD_TEXT`, card template id, zone kind |
| Opponent sees hidden card details | Projection leak | Visibility tests and projected replay |
| Public board object appears hidden | Object visibility setup | owner/public visibility rules |
| Replay hash differs | Non-deterministic effect or event ordering | reducer tests, RNG cursor, event sequence |
| Prompt never closes | Response mode or timeout issue | prompt responder ids, pass behavior, scheduler |
