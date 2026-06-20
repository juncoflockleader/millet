# Basic 1v1 Demo: Ember Duel

Status: playable prototype.

## Run

```sh
node --experimental-strip-types scripts/serve-demo.mjs
```

Then open:

```text
http://127.0.0.1:8787/
```

The demo is a hotseat browser game backed by the real Millet server APIs and the `sample-duel` ruleset. It starts a fair demo variant with both heroes at 10 health, player 1 active, mirrored player 2 attack cards, and an open main action window.

## Controls

- `New Match` creates a `sample-duel` match with `{ "demoDuel": true }`.
- Select `P1` or `P2` to choose whose actions to send.
- Card, minion, weapon, and hero ability buttons submit `execute_behavior` commands through `/matches/:id/commands`.
- Click a usable card, board object, or hero card to select it, then click or drag it onto a highlighted legal target.
- Hero cards can be targets and action sources. In the demo, each hero has a `Focus Flame` ability that spends 2 mana to damage the enemy hero.
- `Preview` opens ruleset UI preview fixtures for read-only card, hero, equipment, and minion states.
- `?ruleset=sample-identity` loads the Sanguosha-like eight-player ruleset preview and renders authored absolute board regions for seats, projection-safe public/owned/hidden role badges, piles, hand, equipment, judgment, prompt, and history.
- `Assets` opens the ruleset asset library, local manifest entry editor, browser-local image import draft flow, new asset draft creation, and demo-server asset promotion control.
- `Cards` opens the ruleset card template studio for local template JSON drafts, type filters, dependency health, card preview, behavior/text sync, generated UX hint review, frame/art crop editing, property badge layout editing, equipment slot/stat/action editing, minion combat/token/trigger editing, and guarded catalog promotion.
- `Presentation` opens a local presentation catalog entry editor. Selecting a hero entry shows structured Hero Studio controls for hero art/frame/crop, identity text, ability presentation, behavior id, target mode, mana cost, ability display badges, and validation status.
- `Layout` opens the board layout editor for document fields, board templates, token controls, region presets, region fields, snap-to-grid region drag/resize, region copy/flip/fill actions, local diagnostics, and full `BoardLayoutJson` import/export.
- `End Turn` submits the engine-level `end_turn` command.
- The event log is loaded from `/matches/:id/replay?admin=true`.

## UI Normalization

- The board has a fixed logical play area of `1120 x 620` and auto-scales to fit inside the current viewport.
- The page shell does not scroll during play. If the window is very small, the entire board scales down instead of clipping or pushing controls below the fold.
- Add `?scale=<number>` to the URL to explicitly configure a scale for debugging.
- Cards are self-contained: art, name, cost/status, rules text, and the action button all live inside the card.
- Card properties are rendered from display-slot metadata. Spell cost appears in the top-left badge, minion attack/health in bottom corner badges, and weapon attack/durability in bottom corner badges.
- Keyword tooltips are available inside rules text for terms such as `damage`, `mana`, `durability`, `draw`, and `attack`.
- The whole card can be hovered or focused to inspect its rules text, owner, zone, and current status.
- The board layout editor adjusts document id/version/name, logical size, scaling policy, board template, and CSS-driven 1v1 shortcut token values for row heights, hero column width, board/hand split, center-lane split, card width, card art height, gaps, and padding.
- The template control can apply the ruleset default, the Hearthstone-like `2P Duel` board, or the Sanguosha-like `8-Seat Identity` board into the current browser-local layout draft before further visual editing.
- The editor overlay also renders authored board layout regions and widget components, including hero, battlefield, equipment, hand, deck, action, history, and chat surfaces. Selecting a guide box or region row exposes region fields and a geometry summary; guide boxes can be snapped, dragged, resized, copied, mirrored, filled to the board, renamed, or deleted on the canvas. Region presets create common board areas with matching widget definitions, while the diagnostics panel flags duplicate ids, missing widgets, and out-of-bounds geometry before export.
- Runtime hero, battlefield, equipment, hand, action, and history surfaces are annotated with the authored region/widget metadata, and drag/drop battlefield targeting is attached to the battlefield regions.
- Player-side hero, battlefield, equipment, hand, and deck containers are rendered through a small region dispatch layer keyed by the authored widget component names. Custom or unknown widget components render a visible fallback from widget config text, which keeps layout blockouts inspectable while a real renderer is still being built.
- Deck stacks render projection-safe counts and discard/graveyard summaries without exposing hidden deck order or top-card identity.
- The center lane includes authored `ActionPanel`, `HistoryLog`, and disabled `ChatWindow` system widget surfaces.
- `ActionPanel` renders the current open prompt type, responder, and action chips from projected match state.
- The authored default layout is loaded from `packages/rulesets/sample-duel/ui/ember-duel-board-layout.json` through `/content/rulesets/sample-duel/ui/ember-duel-board-layout.json`.
- Layout editor changes are stored in browser `localStorage` under `ember-duel.layout.<rulesetId>.v1` and can be copied or imported as full `BoardLayoutJson`. Export preserves custom ruleset token groups, so Sanguosha-like table tokens survive edits made through the generic editor.
- Card, hero, equipment, and minion presentation defaults are loaded from `packages/rulesets/sample-duel/ui/ember-duel-presentation.json`.
- Card templates are loaded from `packages/rulesets/<rulesetId>/card-catalog.json`. The `Cards` panel stores local template edits in browser `localStorage` under `ember-duel.cards.<rulesetId>.v1`, validates template shape, shows declared behavior/asset dependency health, compares presentation text with generated behavior text from `/content/rulesets/<rulesetId>/behavior-summaries.json`, can apply generated text to the local presentation draft, renders a card preview from catalog plus presentation data, edits presentation art/frame/crop fields into `ember-duel.presentation.<rulesetId>.v1`, edits display layout/property badge rows from the active board layout slot/icon registry, provides Equipment Studio controls for slot/replacement/stats/icon/granted-action fields, provides Minion Studio controls for kind/token/stats/death-trigger/modifier/action fields, shows promotion review diffs/dirty-worktree status, can promote the active card catalog draft to `packages/rulesets/<rulesetId>/card-catalog.json`, and can copy/reset the active catalog draft.
- Presentation editor changes are stored in browser `localStorage` under `ember-duel.presentation.<rulesetId>.v1` and can be reset to the authored ruleset catalog. Hero Studio field and ability badge changes use that same draft, validate required ability metadata, and re-render the live hero cards after a match starts.
- UI preview fixtures are loaded from `packages/rulesets/sample-duel/ui/ember-duel-preview-fixtures.json`.
- The asset library is loaded from `packages/rulesets/sample-duel/asset-manifest.json` through `/content/rulesets/sample-duel/asset-manifest.json`, with previews from each asset `publicPath`.
- Asset editor changes are stored in browser `localStorage` under `ember-duel.assets.<rulesetId>.v1` and can be copied as active manifest JSON or reset to the authored ruleset source. `New Asset` creates a local manifest entry draft with a unique id; imported image drafts compute content hash, dimensions, media type, local source URI, and a data URL `publicPath` for immediate preview. The promotion review shows the target path, create/replace mode, dirty-worktree status, and manifest field diff before `Promote` writes imported image drafts to `packages/demo-basic-duel/public/assets/imported/<rulesetId>/` and updates the selected ruleset `asset-manifest.json` through the local authoring endpoint.

## Assets

The board background is an image-generated 16:9 fantasy card table saved at:

```text
packages/demo-basic-duel/public/assets/ember-duel-board.png
```

The image generator rendered inline instead of writing a new file under `.codex/generated_images`; the PNG was recovered from the latest `image_generation_call.result` base64 payload in the Codex session log and saved into the repo. The generation id was `ig_06693f7f32e0bfb6016a353a93e3b48195a5d780e1d9754a70`.

Prompt used for the saved board:

```text
Create a 16:9 raster background image for a browser-based two-player fantasy card game called Ember Duel. Top-down view of an elegant dark wood game table with two opposing play areas, subtle ember glow along the center lane, faint engraved card-slot geometry, warm brass trim, no text, no logos, no characters, no UI labels. It should work as a readable game-board background behind cards, with darker low-contrast edges and a slightly brighter center lane. High resolution, polished digital game art.
```

Generated card art:

| Card | File | Generation id | Prompt intent |
| --- | --- | --- | --- |
| Firebolt | `packages/demo-basic-duel/public/assets/cards/firebolt.png` | `ig_06693f7f32e0bfb6016a354d49aae4819596bdb91481d48fc9` | Portrait card art of a blazing diagonal firebolt in smoky dark air, no text or frame. |
| Nova | `packages/demo-basic-duel/public/assets/cards/nova.png` | `ig_06693f7f32e0bfb6016a354d81b1e88195b4e75832d58ee337` | Portrait card art of a centered crimson-orange magical nova burst, no characters or frame. |
| Coin | `packages/demo-basic-duel/public/assets/cards/coin.png` | `ig_06693f7f32e0bfb6016a354dab0e308195b517bb7e30419ce0` | Portrait card art of a single glowing brass-gold coin on a dark tabletop. |
| Loot Minion | `packages/demo-basic-duel/public/assets/cards/loot-minion.png` | `ig_06693f7f32e0bfb6016a354dd1fa9c8195bb651a87d8834eec` | Portrait card art of a small loot runner with satchel and dagger in warm ember light. |
| Training Axe | `packages/demo-basic-duel/public/assets/cards/training-axe.png` | `ig_06693f7f32e0bfb6016a354e2145188195a6a7bdbb887790f8` | Portrait weapon art of a brass-and-leather training axe resting diagonally on dark wood. |
| Reward | `packages/demo-basic-duel/public/assets/cards/reward.png` | `ig_06693f7f32e0bfb6016a354e6cb460819593690144b470c060` | Portrait card art of a small reward chest with warm golden light. |

Generated card animation sheets:

| Effect | File | Generation id | Prompt intent |
| --- | --- | --- | --- |
| Firebolt cast | `packages/demo-basic-duel/public/assets/effects/firebolt-sheet.png` | `ig_06693f7f32e0bfb6016a354ebca6188195ab963e336d64e1e3` | Six-frame horizontal firebolt streak and impact sheet on black for screen blending. |
| Nova burst | `packages/demo-basic-duel/public/assets/effects/nova-sheet.png` | `ig_06693f7f32e0bfb6016a354ee9d7e08195a61e9fc512816456` | Six-frame radial magical shockwave sheet on black for screen blending. |
| Coin sparkle | `packages/demo-basic-duel/public/assets/effects/coin-sheet.png` | `ig_06693f7f32e0bfb6016a354f224c048195aab7d06e47b79e09` | Six-frame gold glint and sparkle sheet on black for screen blending. |
| Attack slash | `packages/demo-basic-duel/public/assets/effects/attack-slash-sheet.png` | `ig_06693f7f32e0bfb6016a354f5317f08195bdb4f65fb55cf342` | Six-frame diagonal slash arc sheet on black for minion and weapon attacks. |

The built-in image generator creates still images, so the demo treats the generated effect sheets as sprite textures and animates them with CSS `steps()` keyframes after successful engine commands.

The same generated assets are declared in `packages/rulesets/sample-duel/asset-manifest.json` with SHA-256 hashes, dimensions, public paths, licenses, generation ids, prompt summaries, and usage labels. The `Assets` panel can filter them by kind and show where card presentations, hero presentations, and runtime effects reference them.

## Problems Found And Fixed

- `sample-duel` board and weapon objects were owner-visible, which made public board state redacted for the opponent. Board and weapon objects are now public.
- `execute_behavior` commands could be submitted by a non-active player after a turn action window was open. The match service now rejects behavior commands when `turn.activePlayerId` is set to another player.
- The original `sample-duel` setup is optimized for fast engine tests, with player 2 at low health and a small hand. The browser demo now opts into a `demoDuel` setup instead of changing the default test fixture.

## Known Follow-Up

- The UI uses an admin projection because it is hotseat and intentionally shows both hands on one screen. A networked two-browser version should use player projections and hide the opponent hand.
