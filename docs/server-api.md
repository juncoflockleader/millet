# Server API Guide

The prototype server exposes match creation, command submission, state/replay projection, SSE, and WebSocket streams.

Start it with:

```sh
npm run demo
```

Base URL:

```text
http://127.0.0.1:8787
```

## Ruleset Content

```http
GET /content/rulesets/:rulesetId/:path
```

Ruleset UI and content files are served read-only for the demo. Promotable sample rulesets also expose generated behavior summaries:

```http
GET /content/rulesets/:rulesetId/behavior-summaries.json
```

The response has `kind: "behavior_summaries"` and maps behavior ids to `canonicalText`, generated `uxHints`, and `templateIssues`. The browser card studio uses this to compare card presentation text against structured behavior definitions.

```http
POST /authoring/cards/promote
content-type: application/json
```

Development-only card catalog promotion endpoint. The body contains `rulesetId` and a full `catalog` object. For supported sample rulesets, the server validates the catalog id/version/templates shape, rejects duplicate template ids, and writes `packages/rulesets/:rulesetId/card-catalog.json`.

## Sessions And Authorization

The prototype uses headers to model sessions:

| Header | Meaning |
| --- | --- |
| `x-millet-user-id: u1` | Act or view as Player 1's user in `sample-duel`. |
| `x-millet-user-id: u2` | Act or view as Player 2's user in `sample-duel`. |
| `x-millet-admin: true` | Request admin projection for local debugging and hotseat demos. |

The service rejects commands before mutation when the session cannot act for the requested player.

## Create Match

```http
POST /matches
content-type: application/json
```

Body:

```json
{
  "rulesetId": "sample-duel",
  "demoDuel": true
}
```

Response:

```json
{
  "matchId": "match_1",
  "status": "running",
  "lastSequence": 24
}
```

For identity games:

```json
{
  "rulesetId": "sample-identity",
  "playerCount": 6
}
```

`playerCount` can be `6` or `8`.

## Fetch Match Summary

```http
GET /matches/:matchId
```

Returns status and latest sequence number.

## Fetch Projected State

```http
GET /matches/:matchId/state?playerId=p1
x-millet-user-id: u1
```

Admin projection:

```http
GET /matches/:matchId/state?admin=true
x-millet-admin: true
```

Use player projection for real clients. Use admin projection for local debugging and hotseat tools.

## Fetch Projected Replay

```http
GET /matches/:matchId/replay?playerId=p1&fromSequence=10
x-millet-user-id: u1
```

The response includes only events visible to the viewer:

```json
{
  "matchId": "match_1",
  "events": [],
  "lastSequence": 34
}
```

## Submit Command

```http
POST /matches/:matchId/commands
content-type: application/json
x-millet-user-id: u1
```

Body:

```json
{
  "command": {
    "id": "cmd_firebolt_1",
    "matchId": "match_1",
    "playerId": "p1",
    "type": "execute_behavior",
    "payload": {
      "behaviorId": "firebolt",
      "sourceObjectId": "card_firebolt",
      "selections": {
        "target": ["p2"]
      }
    }
  }
}
```

Response:

```json
{
  "matchId": "match_1",
  "status": "running",
  "lastSequence": 30
}
```

## Common Rejections

| Status | Error | Meaning |
| --- | --- | --- |
| `400` | `invalid_json` | Request body is not valid JSON. |
| `400` | engine-specific code | Command failed validation, targeting, cost, condition, or phase checks. |
| `403` | `authorization_error` | Session cannot act as the requested player or viewer. |
| `404` | `not_found` | Match id does not exist. |

The response body includes a human-readable `message`.

## SSE Events

```http
GET /matches/:matchId/events?playerId=p1&lastSequence=0
x-millet-user-id: u1
accept: text/event-stream
```

Use SSE when a browser client wants a simple projected event stream.

## WebSocket Events And Commands

The WebSocket upgrade path uses the same match and viewer model as HTTP. It supports projected backlog delivery and command messages. Use it when a client wants one duplex connection for live events and command submission.

## Client Integration Pattern

1. Create or join a match.
2. Fetch projected state for the viewer.
3. Subscribe to projected events through SSE or WebSocket.
4. Submit commands with stable command ids.
5. Apply projected events or refetch state after command acceptance.
6. Treat rejection payloads as user-visible action errors.

## Security Notes

The prototype uses headers for local session modeling. A production deployment needs real authentication, server-managed sessions, and transport security.
