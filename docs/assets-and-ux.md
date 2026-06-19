# Assets And UX Guide

Millet separates gameplay truth from presentation. The engine should be able to validate and resolve behavior without a card image, but clients need assets, labels, prompts, logs, and animations to make the game human-readable.

## Asset Types In The Prototype

| Asset | Location | Used By |
| --- | --- | --- |
| Demo board background | `packages/demo-basic-duel/public/assets/ember-duel-board.png` | Browser demo body background. |
| Demo card portraits | `packages/demo-basic-duel/public/assets/cards/` | Ember Duel card renderer. |
| Demo effect sheets | `packages/demo-basic-duel/public/assets/effects/` | CSS sprite animations after successful commands. |
| Ruleset asset metadata | `packages/rulesets/*/asset-manifest.json` | Content validation and compatibility checks. |

## Ruleset Asset Metadata

Ruleset assets are described with:

- `assetId`
- `version`
- `kind`
- `contentHash`
- `sourceUri`
- `license`
- `owner`
- `mediaType`
- dimensions

The validator checks that card catalog references point to known assets and that metadata is compatible with expected media shape.

## Demo Asset Notes

The current `Ember Duel` assets were generated with the built-in image generator and saved into the repo:

- board background
- six card portraits
- four sprite-sheet effect textures

The image generator returns still images. Animation is implemented by using generated horizontal sprite sheets plus CSS `steps()` playback.

## Behavior To UX Mapping

The card UI maps card templates and behavior ids to:

- title
- cost
- rules text
- button label
- card art path
- animation effect

In the demo this mapping lives in `packages/demo-basic-duel/public/app.js`. In a production client, this should come from ruleset content, localization, asset manifests, and generated UX hints.

## Interaction Defaults

Millet clients should support explicit button actions and natural board actions.

Button actions are useful for accessibility, keyboard operation, compact mobile layouts, and deterministic debug flows. Natural board actions are the default player-facing mode:

1. Click a usable card, board object, or hero card to select it.
2. Highlight legal targets from engine-provided legality data and client UX hints.
3. Click or drag the selected source onto a target such as the battlefield, enemy hero, enemy minion, friendly hero, or friendly object.
4. Submit the same `execute_behavior` command that the button path would submit.

The interaction model should not create separate rule logic in the client. The client can infer convenient defaults, such as Firebolt targeting the enemy hero in the demo, but production clients should prefer behavior selectors, legal target summaries, and generated UX hints from ruleset content.

Hero or player cards follow the same model. They can be:

- a target, such as a hero receiving damage or healing
- an action source, such as a hero power or character skill
- a rules surface, containing health, resources, identity, class/faction, and ability text
- an inspection surface, with whole-card and keyword tooltips

## UI Normalization Defaults

Millet clients should follow two defaults unless a game or product surface explicitly configures something else.

### Play area stays in the viewport

The primary play area should always remain inside the browser viewport. It can scale down, even to a size that is only useful for overview or screenshots, but it should not require the player to scroll to see the board state.

In `Ember Duel` this is implemented as:

- a fixed logical board size of `1120 x 620`
- a non-scrolling page shell
- a `playArea` wrapper that measures available space
- an auto scale of `min(1, availableWidth / 1120, availableHeight / 620)`
- an explicit debug/config override through `?scale=<number>`

This default pushes UI design toward compact, scan-friendly board layouts. Extra inspection detail should move into card text, tooltips, logs, side panels, or modals instead of making the board taller than the viewport.

### Cards are self-contained

By default, a rendered card should include everything needed to understand and use it:

- art
- title
- cost or current status
- rules text
- action affordance when usable
- internal keyword help
- whole-card tooltip or inspection affordance

The engine still owns rules and state. The card component is responsible for presenting that state without relying on nearby explanatory text.

`Ember Duel` renders rules text inside the card and wraps known terms such as `damage`, `mana`, `durability`, `draw`, and `attack` as inline keyword tooltip triggers. The whole card is also focusable and hoverable to show an inspection tooltip with owner, zone, status, and rules text.

Card templates can also declare where important properties should appear. The prototype schema supports `display.properties` entries with a property name, source, slot, optional icon, optional label, and priority. For example:

```json
{
  "display": {
    "layout": "minion",
    "properties": [
      { "property": "manaCost", "source": "template", "slot": "top-left", "icon": "mana", "label": "Cost" },
      { "property": "attack", "source": "stats", "slot": "bottom-left", "icon": "sword", "label": "Attack" },
      { "property": "health", "source": "stats", "slot": "bottom-right", "icon": "heart", "label": "Health" }
    ]
  }
}
```

This keeps ruleset-specific visual language data-driven. A Hearthstone-like weapon can put durability in a corner badge, while a Sanguosha-like card can put suit and point metadata in slots that match that ruleset's table language. Clients may skin the icons and frame, but the card template tells them which properties deserve first-class placement.

## Text And Behavior Sync

Behavior text should not drift from behavior definitions. The content build package includes text/UX sync helpers that can:

- derive behavior text from structured effects
- validate template placeholders
- block public text that references hidden fields
- support an offline behavior draft/review workflow

Use this workflow for future LLM-assisted card authoring:

1. Draft behavior as structured data.
2. Generate or revise text and UX hints from the behavior.
3. Validate hidden-information safety.
4. Require manual review before export.
5. Add tests for the resulting gameplay behavior.

## Prompt UX

Prompts should expose enough structured payload for clients to render choices. A prompt payload should answer:

- who is responding
- what choices are legal
- how many choices are required
- what happens on pass
- what response behaviors are allowed
- whether the prompt is public or private

Avoid client-side rule reconstruction. The engine should provide legality and projection-safe information.

## Animation Guidelines

Animations should be feedback, not rules:

- Play an effect after the server accepts a command.
- Do not use animation completion as the source of truth for game state.
- Keep animation effects tied to behavior ids or event types.
- Make effects optional for accessibility and low-power clients.
- Use event logs and state updates as the reliable gameplay record.

## Accessibility Checklist

- Keep card text readable without inspecting art.
- Preserve event logs for action confirmation.
- Do not encode critical state only in color or animation.
- Allow disabled buttons to communicate unavailable actions.
- Keep hidden information hidden in projected state and logs.
