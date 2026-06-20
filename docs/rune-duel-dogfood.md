# Rune Duel Dogfood

Status: playable Studio project.

Rune Duel is a second simple 1v1 card game created to test whether Millet can host a new game without adding new gameplay primitives.

## How To Open It

Run the Studio server:

```sh
node --experimental-strip-types scripts/serve-demo.mjs
```

Open:

```text
http://127.0.0.1:8787/?project=rune-duel
```

You can also open the default Studio URL and choose `Rune Duel` from the project switcher.

## What It Proves

Rune Duel uses different card template ids, card names, hero names, health totals, mana cap, board capacity, layout, presentation catalog, preview fixture, and playtest script from Ember Duel.

Its authored board regions declare `dataSource.zoneType` bindings for hand, deck, battlefield, and weapon surfaces. Its behavior definitions also declare UX visual-effect hints, so runtime actions and VFX are no longer keyed to Ember Duel's card or behavior ids.

It does not add new engine effect types. Its cards are built from the existing behavior primitives:

- spend resource
- select enemy hero
- deal damage
- deal damage to all players
- adjust resource
- move card
- exhaust object
- adjust durability counter
- destroy object at a counter threshold
- draw or fatigue
- phase graph entry behaviors
- last-alive outcome

## Game Contents

Cards:

- `Rune Dart`: costs 1 mana and deals 2 damage to the enemy hero.
- `Echo Rune`: costs 1 mana and deals 2 damage after it is drawn.
- `Chain Flash`: costs 3 mana and deals 1 damage to both heroes.
- `Focus Crystal`: costs 0 mana and grants 1 mana this turn.
- `Glyph Runner`: a board minion that attacks for 1 damage and exhausts.
- `Dueling Staff`: a one-durability weapon that attacks for 2 damage and then breaks.

Heroes:

- `Rune Scribe`
- `Glyph Keeper`

Both heroes have `Sigil Ping`, a 2-mana hero ability that deals 1 damage to the enemy hero.

## Gaps Closed

The dogfood pass found four useful gaps and closed the first runtime-facing ones.

1. Server ruleset registration was hardcoded to `sample-duel | sample-identity`. This blocked a third playable project even though the engine could represent it. The server now has a small ruleset registry.
2. Runtime card actions were keyed to Ember Duel template ids such as `firebolt`, `coin`, and `training_axe`. The runtime now reads action behavior metadata from the presentation catalog.
3. The 1v1 runtime assumed zone id conventions such as `zone_hand_p1`, `zone_board_p1`, and `zone_weapon_p1`. Runtime widgets now resolve player-owned zones through board region `dataSource.zoneType`, with validation that rejects unknown zone types.
4. VFX selection was keyed by demo behavior id groups. Runtime VFX now prefers behavior UX `visualEffect` hints and falls back to generic effect inference from generated UX summaries.

## Remaining Gap

The current behavior authoring path can express Rune Duel by writing TypeScript behavior definitions, but a no-code behavior DSL/editor is still future work.

## Validation

Local test coverage includes:

- ruleset bundle validation for `sample-rune-duel`
- direct behavior tests for Rune Dart, last-alive outcome, Dueling Staff durability destruction, and phase graph draw/main prompt
- match service creation of a playable Rune Duel demo match
- Studio playtest script `Rune Dart Smoke`
- board layout `dataSource.zoneType` validation
- behavior UX visual-effect summary propagation
