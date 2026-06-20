# Quick Start

This guide gets you from a fresh checkout to a playable match, a validated ruleset, and a working API call path.

## Requirements

- Node.js `>=24`.
- No package install is currently required for the prototype slice.

Check your runtime:

```sh
node --version
```

## 1. Run The Test Suite

```sh
npm test
```

Equivalent direct command:

```sh
node scripts/run-tests.mjs
```

Expected result:

```text
tests 133
pass 133
fail 0
```

## 2. Play The Basic 1v1 Demo

Start the server:

```sh
npm run demo
```

Open:

```text
http://127.0.0.1:8787/
```

Play loop:

1. Select `New Match`.
2. Player 1 starts in the main action window.
3. Click a usable card, minion, weapon, or hero card to select it.
4. Click or drag it onto a highlighted target, or use its action button for the explicit command path.
5. Try `Firebolt`, `Nova`, a minion attack, a weapon swing, or the hero `Focus Flame` ability.
6. Select `End Turn` to advance to the other player.
7. Use the battle log to confirm the engine events produced by each action.

Use `Preview` to inspect read-only UI fixture states, `Assets` to inspect the ruleset asset manifest, create local asset drafts, import image files, and promote imported drafts through the local authoring server, `Cards` to inspect card template drafts, compare card text with generated behavior summaries, edit card art/frame/crop presentation, edit property badge layouts, and promote reviewed card catalog drafts, `Presentation` to edit local card/hero presentation drafts plus hero ability badges and validation, and `Layout` to edit the viewport-fitted board layout with board templates, document fields, region presets, authored region/widget guides, diagnostics, snap-to-grid canvas drag/resize, copy/flip/fill actions, and full `BoardLayoutJson` import/export. Add `?ruleset=sample-identity` to the demo URL to inspect the Sanguosha-like eight-player layout preview.

The browser demo is hotseat and intentionally uses an admin projection so both hands are visible on one screen. A networked client should use player projections instead.

## 3. Create A Match Through HTTP

With the demo server running:

```sh
curl -s -X POST "http://127.0.0.1:8787/matches" \
  -H "content-type: application/json" \
  -d '{"rulesetId":"sample-duel","demoDuel":true}'
```

Save the returned `matchId`:

```sh
MATCH_ID="match_1"
```

Fetch the admin state:

```sh
curl -s "http://127.0.0.1:8787/matches/$MATCH_ID/state?admin=true" \
  -H "x-millet-admin: true"
```

Cast Firebolt as Player 1:

```sh
curl -s -X POST "http://127.0.0.1:8787/matches/$MATCH_ID/commands" \
  -H "content-type: application/json" \
  -H "x-millet-user-id: u1" \
  -d '{
    "command": {
      "id": "cmd_quickstart_firebolt",
      "matchId": "'"$MATCH_ID"'",
      "playerId": "p1",
      "type": "execute_behavior",
      "payload": {
        "behaviorId": "firebolt",
        "sourceObjectId": "card_firebolt",
        "selections": { "target": ["p2"] }
      }
    }
  }'
```

## 4. Validate A Ruleset

```sh
node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/sample-duel
```

Expected result:

```json
{
  "issues": []
}
```

Get a dependency report:

```sh
node --experimental-strip-types scripts/millet.mjs deps-ruleset packages/rulesets/sample-duel
```

Use this when changing cards, behaviors, localization, or assets. It helps catch broken references before a ruleset reaches a client.

## 5. Know The Main Files

| Area | Files |
| --- | --- |
| Demo UI | `packages/demo-basic-duel/public/` |
| Two-player ruleset | `packages/rulesets/sample-duel/` |
| Six/eight-player ruleset | `packages/rulesets/sample-identity/`, including `ui/sanguosha-eight-player-board-layout.json` and `ui/sanguosha-identity-preview-fixtures.json` |
| Engine reducer and behavior runtime | `packages/engine-core/src/` |
| HTTP/SSE/WebSocket server | `packages/server/src/` |
| Content validation and bundle tools | `packages/content-build/src/` |
| Replay and diff tools | `packages/replay-tools/src/` |

## Troubleshooting

If `node` is too old:

- Install or select Node `>=24`.
- Re-run `node --version`.

If the demo port is already in use:

- Stop the old demo server.
- Or edit `scripts/serve-demo.mjs` to use a temporary local port while testing.

If a command is rejected:

- Check the response `error` and `message`.
- Confirm `x-millet-user-id` matches the command player.
- Confirm it is that player's turn.
- Confirm the selected source object is controlled by that player.

## Next Reads

- [Core Concepts](concepts.md) explains the engine model.
- [Ruleset Authoring Guide](ruleset-authoring.md) explains how to change cards and behaviors.
- [Server API Guide](server-api.md) explains the HTTP, SSE, and WebSocket surfaces.
- [Testing And Debugging Guide](testing-and-debugging.md) explains replay, diff, metrics, and debug HTML tools.
