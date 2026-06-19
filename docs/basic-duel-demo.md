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

## Problems Found And Fixed

- `sample-duel` board and weapon objects were owner-visible, which made public board state redacted for the opponent. Board and weapon objects are now public.
- `execute_behavior` commands could be submitted by a non-active player after a turn action window was open. The match service now rejects behavior commands when `turn.activePlayerId` is set to another player.
- The original `sample-duel` setup is optimized for fast engine tests, with player 2 at low health and a small hand. The browser demo now opts into a `demoDuel` setup instead of changing the default test fixture.

## Known Follow-Up

- The UI uses an admin projection because it is hotseat and intentionally shows both hands on one screen. A networked two-browser version should use player projections and hide the opponent hand.
