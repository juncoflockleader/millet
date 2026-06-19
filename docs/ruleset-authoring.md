# Ruleset Authoring Guide

This guide explains how to change or create a ruleset in the current prototype.

## Ruleset Directory Shape

A ruleset lives under `packages/rulesets/<ruleset-id>/`.

Typical files:

| File | Purpose |
| --- | --- |
| `game-definition.json` | Player counts, zones, resources, turn graph, and top-level metadata. |
| `card-catalog.json` | Card templates, object types, names, tags, stats, behavior references, and asset references. |
| `behaviors.json` | Behavior manifest used by content validation. |
| `<ruleset>.ts` | Current runtime behavior library, setup helpers, phase graph, and ruleset-specific code. |
| `localization.json` | Human-facing strings and names. |
| `asset-manifest.json` | Asset metadata, hashes, dimensions, ownership, and licensing. |
| `<ruleset>.test.ts` | Ruleset-specific behavior and invariant tests. |

## Authoring Workflow

1. Add or change a card template in `card-catalog.json`.
2. Add the behavior id to the template `behaviorIds`.
3. Add the behavior id to `behaviors.json` and `game-definition.json` if it is ruleset-visible.
4. Implement or update the runtime `BehaviorDefinition` in the ruleset `.ts` file.
5. Add or update localization keys.
6. Add or update assets and asset metadata.
7. Run validation and tests.

```sh
node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/sample-duel
npm test
```

## Card Templates

Card templates describe content identity and metadata. Example:

```json
{
  "templateId": "firebolt",
  "version": "0.1.0",
  "objectType": "card",
  "nameKey": "card.firebolt.name",
  "tags": ["spell"],
  "behaviorIds": ["firebolt"],
  "assetRefs": ["card-frame-default"],
  "manaCost": 2
}
```

Guidelines:

- Treat `templateId` as stable content identity.
- Keep user-facing text in localization files.
- Use `tags` for behavior targeting, deckbuilding, UI grouping, and validation.
- Keep gameplay costs and runtime legality in behaviors, not only in card metadata.
- Use `display.properties` to tell clients where important card properties should appear.

Display metadata is UX metadata, not gameplay truth. It helps the client render properties that already exist on templates, stats, counters, resources, metadata, or computed state:

```json
{
  "display": {
    "layout": "weapon",
    "properties": [
      { "property": "manaCost", "source": "template", "slot": "top-left", "icon": "mana", "label": "Cost" },
      { "property": "attack", "source": "stats", "slot": "bottom-left", "icon": "sword", "label": "Attack" },
      { "property": "durability", "source": "counter", "slot": "bottom-right", "icon": "durability", "label": "Durability" }
    ]
  }
}
```

Use slots and icons to preserve each game's visual language. Hearthstone-like cards commonly surface cost, attack, health, and durability. Sanguosha-like cards commonly need suit, point, faction/kingdom, role, equipment subtype, and distance/range indicators.

## Behaviors

Behaviors are structured definitions. They can include:

- `costs`, such as spending mana
- `selectors`, such as choosing an enemy player
- `conditions`, such as requiring a ready object
- `effects`, such as dealing damage, moving cards, opening prompts, drawing cards, or registering triggers
- optional text and UX metadata

Example:

```ts
firebolt: {
  id: "firebolt",
  version: "0.1.0",
  kind: "card",
  costs: [{ type: "spend_resource", player: "controller", resource: "mana", amount: 2 }],
  selectors: [
    {
      id: "target",
      from: "players",
      count: { min: 1, max: 1 },
      match: { status: "alive", notSelf: true }
    }
  ],
  effects: [
    { type: "deal_damage", to: { selector: "target" }, amount: 3 },
    { type: "move_card", object: "self", toZoneId: "zone_discard" }
  ]
}
```

## Prompted Interactions

Use prompts for decisions that require player input after a behavior starts:

- mulligan
- dodge or counter responses
- rescue responses
- priority windows
- discard choices

Prompt payloads should contain enough structured information for a client to render choices without interpreting hidden engine state.

## Turn And Phase Automation

Use a phase graph when the game has predictable turn structure.

For each phase, decide:

- should an entry behavior run
- should the graph immediately advance
- should an action window pause the graph
- what happens on timeout
- what happens when the active player dies

`sample-duel` uses a short graph. `sample-identity` uses a richer graph with judgment, draw, play, discard, and finish behavior.

## Visibility Checklist

Before adding a new object or event, ask:

- Should the owner see it?
- Should opponents see it?
- Should admins see it?
- Should replay events hide template ids or fields from some viewers?
- Does the UI need a public placeholder?

Projection bugs are multiplayer bugs. Add tests for hidden hands, hidden roles, and public board state.

## Validation Checklist

Run:

```sh
node --experimental-strip-types scripts/millet.mjs validate packages/rulesets/<ruleset-id>
node --experimental-strip-types scripts/millet.mjs deps-ruleset packages/rulesets/<ruleset-id>
npm test
```

Check:

- no missing behavior references
- no missing localization keys
- no invalid asset refs
- asset dimensions and media types match expectations
- projected prompt/log templates do not leak hidden fields
- behavior text and UX hints still match behavior definitions

## When To Add Tests

Add or update tests when changing:

- behavior effects
- targeting legality
- turn flow
- hidden information
- win/loss/draw conditions
- prompt response ordering
- timeouts or scheduled default actions
- persistence and replay semantics
