# Assets And UX Guide

Millet separates gameplay truth from presentation. The engine should be able to validate and resolve behavior without a card image, but clients need assets, labels, prompts, logs, and animations to make the game human-readable.

## Asset Types In The Prototype

| Asset | Location | Used By |
| --- | --- | --- |
| Demo board background | `packages/demo-basic-duel/public/assets/ember-duel-board.png` | Browser demo body background. |
| Demo card portraits | `packages/demo-basic-duel/public/assets/cards/` | Ember Duel card renderer. |
| Demo effect sheets | `packages/demo-basic-duel/public/assets/effects/` | CSS sprite animations after successful commands. |
| Ruleset asset metadata | `packages/rulesets/*/asset-manifest.json` | Content validation, compatibility checks, and the demo asset library. |

## Ruleset Asset Metadata

Ruleset assets are described with:

- `assetId`
- `version`
- `kind`
- `contentHash`
- `sourceUri`
- `license`
- `owner`
- `publicPath`
- `mediaType`
- dimensions
- sprite `frameCount`
- image-generation metadata such as `generationId` and `prompt`
- expected usage labels

The validator checks that card catalog references point to known assets and that metadata is compatible with expected media shape.

For browser-facing assets, `publicPath` must start with `/`. The current image compatibility checks cover card art, card backs, card frames, avatars, icons, board backgrounds, and VFX sheets.

Millet Studio exposes the active project's metadata through the `Assets` panel. `Ember Duel` is the default playable project, so the panel initially reads `packages/rulesets/sample-duel/asset-manifest.json` through `/content/rulesets/sample-duel/asset-manifest.json`, renders image previews from `publicPath`, filters by kind, and combines manifest usage labels with presentation catalog and runtime effect references.

The same panel now includes a local asset manifest entry editor. Selecting an asset shows its JSON entry, validates required manifest fields, preserves `assetId`, applies the edited entry to a browser `localStorage` draft, and rebuilds usage metadata immediately. Designers can also create a brand-new local asset entry draft with a unique id before importing art. They can copy the active manifest JSON or reset the draft back to the authored ruleset source.

The editor also has an image import affordance for local drafts. Importing an image file calculates its SHA-256 content hash, reads its dimensions, records the browser media type, stores `sourceUri` as a local-file marker, and uses a data URL as the draft `publicPath` so the preview updates immediately.

For the local demo authoring server, the same entry can be promoted into the workspace. `Promote` posts the selected draft to `/authoring/assets/promote`, which accepts image data URLs for existing or new manifest entries, writes the decoded file under `packages/demo-basic-duel/public/assets/imported/<rulesetId>/`, recalculates the committed hash, assigns a durable `/assets/imported/...` public path, and writes the ruleset `asset-manifest.json`. This endpoint is intentionally guarded and development-oriented; production authoring should add conflict handling, review diffs, and explicit publishing controls.

The promotion review panel now surfaces those risks before the write: it shows the deterministic target path, create-or-replace mode, whether the workspace is already dirty, and a compact before/after diff for manifest fields such as `assetId`, `kind`, `contentHash`, `sourceUri`, `publicPath`, dimensions, media type, and usage labels.

## Demo Asset Notes

The current `Ember Duel` assets were generated with the built-in image generator and saved into the repo:

- board background
- six card portraits
- four sprite-sheet effect textures

The image generator returns still images. Animation is implemented by using generated horizontal sprite sheets plus CSS `steps()` playback.

The `sample-duel` asset manifest currently declares 12 assets: the default card frame placeholder, one board background, six card portraits, and four effect sheets. Generated PNG entries include SHA-256 content hashes, dimensions, generation ids, prompt summaries, public paths, licenses, owners, and usage labels.

## Behavior To UX Mapping

The card UI maps card templates and behavior ids to:

- title
- cost
- rules text
- button label
- card art path
- animation effect

In the demo this mapping lives in `packages/demo-basic-duel/public/app.js`. In a production client, this should come from ruleset content, localization, asset manifests, and generated UX hints.

## Card Template Studio

The `Cards` panel is the first browser-facing slice of the card template studio. It loads `card-catalog.json` through the same ruleset content endpoint as layouts and preview fixtures, then lists templates by object type for both `sample-duel` and `sample-identity`.

Selecting a template shows:

- a card preview rendered from card catalog data plus any matching presentation catalog entry
- template metadata such as id, version, object type, name key, cost, stats, and display layout
- tags, behavior ids, and asset refs as compact dependency chips
- validation status for template shape plus missing declared behaviors or assets
- behavior sync status comparing current presentation text against generated behavior text, selector/effect UX hints, and behavior template issues
- a frame/art editor for presentation `assets.art`, `assets.frame`, `layout.variant`, `layout.artFit`, `layout.artPositionX/Y`, and `layout.artHeight`
- an equipment studio for equipment slot, replacement mode, stats, frame/icon assets, granted action, target mode, selector, and validation status
- a minion studio for board kind, token variant, combat stats, death trigger, runtime modifier badge, frame/icon assets, action, target mode, selector, and validation status
- a property layout editor for the selected template's `display.layout` and `display.properties`
- the selected template JSON editor

The demo server exposes `/content/rulesets/:rulesetId/behavior-summaries.json` for promotable sample rulesets. Each behavior summary includes canonical generated text, generated UX hints, and prompt/log template validation issues. The card studio consumes that document so structured behavior, human card text, and targeting UX can be reviewed together. When a matching presentation entry exists, designers can apply generated text into the browser-local presentation draft without editing the source catalog.

The frame/art editor writes to the browser-local presentation draft rather than the card catalog. The same presentation fields are consumed by the preview and runtime card renderer through CSS variables for art image, optional frame overlay, art fit, art position, and per-card art height. This keeps card templates self-contained in play while preserving the separation between gameplay template data and presentation tuning.

When the selected template is equipment, the Equipment Studio writes slot metadata/tags, replacement mode metadata, and numeric stats into the local card catalog draft. Presentation-facing fields such as frame/icon assets, action label, behavior id, target mode, selector, and rules text are written into the local presentation draft. Equipment-specific validation flags unsupported slot ids, conflicting slot tags, unsafe replacement metadata, missing weapon stats, missing or unknown granted behaviors, and target mode/selector issues. Catalog promotion also rechecks equipment catalog metadata before sending the draft to the authoring endpoint, while presentation-only warnings remain visible for review. This lets a designer review the equipment card preview and live equipped-card UI while keeping engine-facing template data and presentation data explicit.

When the selected template is a minion, the Minion Studio follows the same split. Combat stats, board kind, token variant, modifier text, and death-trigger behavior refs are stored in the local card catalog draft. Action label, attack behavior, target mode, selector, icon/frame assets, rules text, presentation stats, and metadata-backed modifier display are stored in the local presentation draft. Minion-specific validation flags unsupported or conflicting kind metadata, non-id token variants, missing combat stats, unknown death triggers, missing behavior refs, target mode/selector issues, and modifier badge drift. Catalog promotion rechecks catalog-side minion metadata before authoring writes. The modifier badge is rendered from `source: "metadata"` display data, so the same authored value can be inspected in both preview and live board cards.

The property layout editor reads the active board layout's `propertyDisplay.slots` and `propertyDisplay.icons` registry, filtered by the selected template object type. Designers can add/remove badges and edit property, source, slot, icon, label, and priority fields without hand-editing JSON. The preview updates from the same template data. Multiple badges in one slot stack visibly, which supports Sanguosha-like `suit-point` displays where suit and rank share the same corner.

Local edits are stored under `ember-duel.cards.<rulesetId>.v1` in browser `localStorage`. Applying a draft validates required template fields, display property shape, duplicate ids in the active catalog, and preserves the selected `templateId`. Designers can copy the active catalog JSON, reset back to the authored ruleset source, or promote the active catalog through `/authoring/cards/promote`. The promotion review shows the target `card-catalog.json`, current git dirty-state, catalog-level added/changed/removed counts, and selected-template field diffs before the local authoring server replaces the ruleset catalog.

## UI Preview Fixtures

Preview fixtures are schema-backed projected states for authoring and QA. They let a designer inspect card, hero, equipment, minion, or full-board rendering without creating a live match.

`Ember Duel` loads `packages/rulesets/sample-duel/ui/ember-duel-preview-fixtures.json` through `/content/rulesets/sample-duel/ui/ember-duel-preview-fixtures.json`. The current fixture set covers:

- cards in hand
- hero ability and low-health styling
- equipment with durability counters
- minions with ready and exhausted states

Preview fixtures are read-only. They reuse the live board renderer, card renderer, tooltip behavior, property badge rendering, and event log formatting, but button clicks do not mutate server state or submit engine commands.

Hidden projected objects must use `objectType: "hidden"` and must not include template ids, owner/controller ids, stats, counters, tags, keywords, attachments, modifiers, or exhausted state. The renderer shows them as a generic `Hidden Card` with a generic tooltip and disabled action. This mirrors server projections, where unauthorized hidden hands or roles never include the original template id.

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

Millet Studio includes a board layout editor behind the `Layout` button. In the default `Ember Duel` project, it loads its authored default from the ruleset board layout at `packages/rulesets/sample-duel/ui/ember-duel-board-layout.json`, then edits CSS-backed layout tokens while preserving the fixed logical board size:

- opponent row height
- center lane height
- player row height
- hero column width
- board/hand zone split
- center-lane split
- card width and art height
- board padding and row gap

The editor stores a full local `BoardLayoutJson` draft in browser `localStorage` and exports/imports the same JSON shape. Designers can start from the ruleset default, the Hearthstone-like `2P Duel` board, or the Sanguosha-like `8-Seat Identity` board template before editing individual regions. Token controls are still optimized for the Hearthstone-like 1v1 board, while the region editor supports selecting authored regions, editing label/kind/owner/widget/visibility/drop/accepts/targetability fields, editing the selected widget's id/kind/component/config JSON, and changing `x`, `y`, `width`, and `height` through form fields or direct canvas drag/resize. Region editing also supports an 8px snap grid, duplicate, horizontal flip, vertical flip, fill-to-board, and delete actions so designers can block out symmetric or large table surfaces without hand-calculating every coordinate. This is intentionally presentation-only; it does not change engine rules, zones, card legality, or server state.

The editor overlay also renders the authored `BoardLayoutJson` regions and widget components as guide boxes. Core regions such as hero, battlefield, equipment, hand, deck, action window, history, and chat remain visible while designers adjust the layout tokens.

The live board uses the same authored region/widget metadata as runtime `data-*` attributes on hero, battlefield, equipment, hand, deck, action, history, and chat surfaces. Player-side hero, battlefield, equipment, hand, and deck containers also route through a small widget-component dispatch layer (`HeroCard`, `CardRow`, `EquipmentSlot`, `DeckStack`). The absolute full-board preview uses a parallel registry for table widgets such as identity seats, shared piles, role summaries, prompt windows, and history. Custom or unknown widget components render a visible fallback using the widget config `placeholder` or `description`, so authors can block out new regions without silently losing them in runtime preview. The center lane exposes authored `ActionPanel`, `HistoryLog`, and disabled `ChatWindow` system widgets. `ActionPanel` now renders live open prompt controls from projected match state, including prompt type, response mode, responder progress, pass controls, main-action chips, and allowed response behavior buttons. The equipment slot renders weapon actions and durability separately from minions on the battlefield. The deck stack shows projection-safe counts and discard/graveyard summaries rather than hidden deck order or top-card identity. This gives interaction code, browser smoke tests, and future widget renderers a shared vocabulary for region kind, owner scope, targetability, accepted object types, drop behavior, and component name.

The `Layout` panel is now a visual `BoardLayoutJson` editor. It edits document id/version/name, logical size, scaling policy, board template, 1v1 shortcut tokens, region identity/kind/owner/widget/visibility/drop/overflow/targeting fields, accepts lists, selected widget id/kind/component/config, and region geometry. Authors can apply a whole-board template, add common region presets, drag or resize regions on the board overlay with snap-to-grid, rename regions safely, create missing widgets, copy/flip/fill/delete selected regions, review local diagnostics, and import/export full layout JSON. Exports merge known shortcut token edits back into the existing token object instead of dropping custom token groups such as Sanguosha `table` sizing tokens.

The `Playtest` panel is the first integrated debug surface in Millet Studio. It shows whether the active project has browser-local layout, card catalog, presentation, or asset drafts, then uses the real match API to run a scripted smoke where supported. In `Ember Duel`, the panel creates a demo match, casts P1 `Firebolt` into P2 through `/matches/:id/commands`, fetches admin state/replay, updates the board to the generated match, and summarizes event count, damage events, Player 2 health, sequence, and recent replay lines. This connects authoring drafts to a repeatable runtime check without making client-side rules the source of truth; unpromoted browser drafts affect Studio rendering, while engine rules still come from the served ruleset content.

`sample-identity` also declares a Sanguosha-like eight-seat board layout at `packages/rulesets/sample-identity/ui/sanguosha-eight-player-board-layout.json`. It defines an eight-player seat ring, role summary, shared deck/discard piles, active-player hand, judgment strip, equipment strip, action/response window, and history log as schema-backed regions and widgets. Its `packages/rulesets/sample-identity/ui/sanguosha-identity-preview-fixtures.json` fixture gives the same table a projection-safe eight-player preview with public lord role, viewer-owned role, redacted hidden roles, hidden hands/deck, equipment, judgment, discard, and a nullification response prompt. Switching Millet Studio to `?project=sanguosha-identity` or legacy `?ruleset=sample-identity` renders that fixture through authored absolute board regions and keeps the 1280x720 play area fitted inside the viewport.

Identity seats and role summaries render dedicated role badges instead of raw role refs. Public roles are labeled as public, the viewer-owned role is labeled as the viewer's role, and redacted roles render as `Unknown`/`Hidden Role` badges. The visible UI intentionally avoids projected hidden role object ids such as `role_hidden_*` while still showing safe public player state like health, hand count, and status.

`Ember Duel` also loads its card, hero, equipment, and minion presentation defaults from `packages/rulesets/sample-duel/ui/ember-duel-presentation.json`. That catalog gives the runtime a content-driven source for art paths, names, rules text, action labels, property displays, layouts, and behavior references.

The `Presentation` panel lets designers inspect catalog entries, edit selected entry JSON locally, apply/reset `localStorage`-backed drafts, copy the active catalog, and see cards/heroes re-render without changing ruleset files. When a hero entry is selected, the same panel shows a Hero Studio with structured controls for hero identity, art/frame/crop, ability presentation, behavior id, target mode, mana cost, ability display badges, validation status, and a live hero-card preview. Hero Studio validation flags missing required ability fields, unsupported target modes, missing behavior references, and ability display slot/icon problems before the draft is promoted or copied back into ruleset content.

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

The content validator accepts a default slot/icon registry and extends it from `BoardLayoutJson.propertyDisplay` declarations before content reaches the browser:

- slots: `top-left`, `top-right`, `bottom-left`, `bottom-right`
- icons: `mana`, `sword`, `heart`, `durability`

This validation runs for card catalog template displays, presentation catalog object displays, hero displays, and hero ability displays. Board layouts can add ruleset-specific slots and icons; `sample-identity` declares `suit-point`, `role-corner`, `suit`, `rank`, and `faction` so Sanguosha-like point/suit and identity badges validate without changing client code.

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
