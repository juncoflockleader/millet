# Engine Evaluation

Status: dogfood evaluation after the Rune Duel gap-fill slice  
Date: 2026-06-20

## Verdict

Millet is viable as a generalized prototype for multiplayer, turn-based card games. The kernel and ruleset model can already express a second Hearthstone-like 1v1 game without new gameplay primitives, and the same repo contains projection-safe Sanguosha-like eight-player preview content.

It is not a production SDK yet. The strongest parts are deterministic match execution, content validation, replay/debug tooling, and ruleset-driven presentation. The weakest parts are no-code behavior authoring, fully generic runtime widgets, production multiplayer operations, and advanced timing/response systems.

## Evaluation Matrix

| Area | Rating | Evidence | Main Gap |
| --- | --- | --- | --- |
| Core engine model | Strong | Event-sourced reducer, deterministic replay, zones, objects, resources, prompts, phase graphs, outcomes, projections. | More advanced timing, replacement/prevention effects, and deeply nested response windows. |
| 1v1 ruleset portability | Strong | `sample-duel` and `sample-rune-duel` share engine primitives while using different cards, ids, layouts, presentation, playtests, health totals, and mana caps. | More examples with asymmetric decks and alternate win conditions. |
| Multi-player identity-game support | Promising | `sample-identity` covers eight seats, hidden roles, projection-safe previews, equipment, judgment, distance/range concepts, and response prompts. | Needs a full live Sanguosha-like runtime match, not only preview plus ruleset tests. |
| UI runtime generality | Improving | Runtime actions use presentation behavior metadata, core zones bind through board layout `dataSource.zoneType`, and VFX reads behavior UX hints. | Widgets still need richer data-source selectors beyond zone type and owner scope. |
| Authoring experience | Partial | Studio supports assets, cards, presentation, hero ability badges, layout editing, preview fixtures, and playtest scripts. | Behavior authoring is still TypeScript-first; the no-code behavior DSL/editor remains the largest gap. |
| Assets and presentation | Good prototype | Asset manifests, generated art/VFX, card frames, crop controls, property badges, tooltips, and promotion flows are working. | Animation assets need a richer schema for timing, anchors, layers, and fallback behavior. |
| Testing and debugging | Strong | 141 local tests, ruleset validation, replay fixtures, dependency reports, browser smokes, authored playtest scripts, and state diffs. | Need long-running multiplayer/session tests and compatibility tests for published content versions. |
| Production readiness | Early | HTTP APIs, SSE/WebSocket paths, projections, and command validation exist. | Needs auth, persistence, matchmaking, deployment, observability, migrations, and API stability policy. |

## Gaps Filled In This Slice

- Board layout regions now support `dataSource.zoneType`, and validation rejects unknown zone types.
- Core 1v1 runtime zones for hand, battlefield, weapon, and deck now resolve from layout data-source metadata before falling back to conventional zone ids.
- Behavior definitions can declare UX `visualEffect` hints.
- Runtime VFX now prefers those behavior UX hints and only falls back to inferred generic effect types.
- Rune Duel now exercises both data-source zone binding and behavior-driven animation intent while staying inside existing engine capabilities.

## Remaining Product Gaps

1. Behavior authoring needs a designer-facing DSL/editor with generated text, UX hints, validation, simulation, and promotion.
2. Runtime widgets need generic data-source selectors for filtered collections, non-zone summaries, attachments, counters, range overlays, and prompt-specific target sets.
3. Natural drag-to-target play needs a rules-backed legal action planner, not just local target affordances.
4. Sanguosha-like live play needs richer timing windows, response chains, delayed trick resolution, death/rescue sequencing, role/team outcome rules, and seat/range UX.
5. Production multiplayer needs player projection sessions, reconnection, persistence, auth, matchmaking, observability, and replay/version retention.
6. Animation and asset UX should become schema-backed enough that authors can choose effect sheet, anchor, timing, sound, and fallback without client code edits.

## Recommendation

Use Millet now for engine prototyping, ruleset experiments, authoring workflow design, and local hotseat demos. The next milestone should focus on behavior authoring plus a full live Sanguosha-like vertical slice; those two threads will expose whether the generalized model holds under the hardest MVP target.
