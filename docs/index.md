# Millet Documentation

Millet is a generalized multiplayer, turn-based card game engine. These docs are written for people who need to run, inspect, extend, or explain the current prototype without reading the whole codebase first.

## Start Here

| Goal | Read |
| --- | --- |
| Play the demo and run the tests | [Quick Start](quick-start.md) |
| Use a guided browser page | [Interactive Quick Start](quick-start.html) |
| Understand the engine model | [Core Concepts](concepts.md) |
| Build or modify a ruleset | [Ruleset Authoring Guide](ruleset-authoring.md) |
| Integrate with the server API | [Server API Guide](server-api.md) |
| Work with art, text, and UX sync | [Assets And UX Guide](assets-and-ux.md) |
| Debug and verify behavior | [Testing And Debugging Guide](testing-and-debugging.md) |
| Play the current 1v1 prototype | [Basic 1v1 Demo: Ember Duel](basic-duel-demo.md) |
| Inspect the second 1v1 dogfood game | [Rune Duel Dogfood](rune-duel-dogfood.md) |

## Product And Planning Docs

| Document | Purpose |
| --- | --- |
| [PRD](prd-multiplayer-turn-based-card-game-engine.md) | Product requirements and north-star scope. |
| [Technical Design](technical-design-multiplayer-turn-based-card-game-engine.md) | System architecture and major engineering decisions. |
| [Milestones](milestones.md) | Delivery plan from M0 through M8. |
| [UI Engine Plan](ui-engine-plan.md) | UI plan for assets, board layouts, cards, heroes, equipment, minions, widgets, and authoring/runtime surfaces. |
| [Implementation Status](implementation-status.md) | Current verification, completed slices, and remaining hardening backlog. |

## Current Working Model

The current repo is a tested prototype slice, not a packaged SDK. It includes:

- `sample-duel`, a Hearthstone-like two-player ruleset used by the `Ember Duel` browser demo.
- `sample-rune-duel`, a second playable two-player ruleset used to dogfood project separation and presentation-driven card actions.
- `sample-identity`, a six/eight-player hidden-role ruleset inspired by identity and rescue/response games.
- A deterministic event reducer, behavior executor, phase graph runner, visibility projection layer, HTTP/SSE/WebSocket server, content validation, and replay/debug tools.

## Suggested Reading Paths

For a game designer:

1. [Quick Start](quick-start.md)
2. [Core Concepts](concepts.md)
3. [Ruleset Authoring Guide](ruleset-authoring.md)
4. [Assets And UX Guide](assets-and-ux.md)
5. [UI Engine Plan](ui-engine-plan.md)

For an engineer integrating a client:

1. [Quick Start](quick-start.md)
2. [Server API Guide](server-api.md)
3. [UI Engine Plan](ui-engine-plan.md)
4. [Testing And Debugging Guide](testing-and-debugging.md)
5. [Technical Design](technical-design-multiplayer-turn-based-card-game-engine.md)

For a maintainer:

1. [Implementation Status](implementation-status.md)
2. [Testing And Debugging Guide](testing-and-debugging.md)
3. [Milestones](milestones.md)
4. [Technical Design](technical-design-multiplayer-turn-based-card-game-engine.md)
