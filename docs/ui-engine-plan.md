# UI Engine Plan

Status: implementation started  
Scope: authoring and runtime UI for Millet's generalized turn-based card game engine.

Current implemented slice:

- `BoardLayoutJson` schema and generated TypeScript declaration.
- `sample-duel` default board layout at `packages/rulesets/sample-duel/ui/ember-duel-board-layout.json`.
- `sample-identity` Sanguosha-like eight-seat board layout at `packages/rulesets/sample-identity/ui/sanguosha-eight-player-board-layout.json`.
- `game-definition.json` `ui.defaultBoardLayout` discovery.
- ruleset validation for UI board layout schema, missing layout refs, duplicate region/widget ids, bad region widget refs, and region geometry outside logical board bounds.
- `PresentationCatalogJson` schema for card, hero, equipment, and minion presentation definitions.
- `sample-duel` presentation catalog at `packages/rulesets/sample-duel/ui/ember-duel-presentation.json`.
- `game-definition.json` `ui.defaultPresentationCatalog` discovery.
- ruleset validation for presentation catalog schema, missing presentation refs, duplicate presentation ids, unknown card templates, and unknown behavior refs.
- ruleset validation for property display slot/icon registries declared by board layouts, including card catalogs, presentation catalogs, hero displays, and hero ability displays.
- `UiPreviewFixtureJson` schema for projected card, hero, equipment, minion, and full-board preview states.
- `sample-duel` UI preview fixtures at `packages/rulesets/sample-duel/ui/ember-duel-preview-fixtures.json`.
- `sample-identity` projection-safe identity preview fixtures at `packages/rulesets/sample-identity/ui/sanguosha-identity-preview-fixtures.json`.
- ruleset validation for preview fixture refs, duplicate fixture ids, unknown player refs, unknown object refs, unknown card templates, hidden-object leaks, visible objects missing template ids, and map key/id drift.
- demo content endpoint at `/content/rulesets/:rulesetId/*.json`.
- Ember Duel layout editor consumes the ruleset board layout as its authored default, keeps full `BoardLayoutJson` drafts in `localStorage`, supports token controls, region selection, region field editing, region drag/resize, and renders authored board regions/widgets as an overlay guide.
- Ember Duel runtime board surfaces carry schema-backed board region/widget metadata for hero, battlefield, equipment, hand, action, and history regions.
- Ember Duel player-side runtime regions dispatch through authored widget components (`HeroCard`, `CardRow`, `EquipmentSlot`, `DeckStack`) instead of directly hand-authoring every hero/battlefield/equipment/hand/deck container.
- Ember Duel center-lane system regions now expose authored `ActionPanel`, `HistoryLog`, and disabled `ChatWindow` widget surfaces.
- Ember Duel `ActionPanel` renders live open prompt controls from projected match state, including prompt type, response mode, responder progress, pass controls, main-action chips, and allowed response behavior buttons.
- Ember Duel runtime consumes the ruleset presentation catalog for card, hero, equipment, and minion art/text/action/property display definitions.
- `sample-duel` asset manifest now covers the demo board background, card portraits, VFX sheets, generated prompt summaries, generation ids, public paths, and usage labels.
- Ember Duel `Assets` panel reads the ruleset asset manifest, previews browser-facing image assets, filters by kind, shows manifest/presentation/effect usage references, and supports local manifest entry JSON drafts with apply/copy/reset.
- Ember Duel `Presentation` panel lets designers inspect, locally edit, copy, apply, and reset presentation catalog entries while live previews re-render from the draft catalog.
- Ember Duel `Preview` panel reads ruleset preview fixtures and renders read-only card, hero, equipment, and minion projected states through the same board renderer used by live matches.
- Ember Duel renders projected `objectType: "hidden"` objects through a generic hidden-card surface with no template id, stats, owner, art, rules text, action, or object id in visible UI.
- Ember Duel can load `?ruleset=sample-identity` and render Sanguosha-like full-board preview fixtures through authored absolute board regions with viewport-fit scaling.

## North Star

Millet's UI should let a game team define, preview, test, and ship card-game experiences without hardcoding one game's board, card frame, or object model into the client.

The UI layer should be:

- data-driven from ruleset, card catalog, asset manifest, behavior definitions, localization, and projection-safe state
- usable for both Hearthstone-like two-player battlers and Sanguosha-like six/eight-player identity games
- safe around hidden information, legal targeting, behavior/text sync, and deterministic replay
- split between authoring tools and runtime components that consume the same schema-backed definitions
- compact by default, with the primary play area always fitting inside the viewport unless explicitly configured otherwise

## Product Surfaces

### Runtime Game Client

The runtime client renders live or replayed matches. It should support:

- responsive board layout with fixed logical dimensions and viewport scaling
- player projections, spectator/admin projections, and replay projections
- natural action mode: select source, highlight legal targets, click or drag onto target
- explicit action mode: buttons, menus, keyboard, and accessibility-friendly controls
- card, hero, equipment, minion, prompt, chat, and log widgets
- tooltip and inspection affordances for keywords, whole cards, objects, and hidden placeholders
- event-driven animations that never become the source of gameplay truth

### Authoring Studio

The authoring studio lets designers and engineers create and validate content. It should support:

- raw asset management
- board layout editing
- card template editing
- card frame and property layout editing
- behavior editing and validation
- hero, equipment, and minion templates as first-class specializations
- previewing runtime widgets with sample projected states
- exporting versioned ruleset/content bundles

### Debug And QA Tools

Debugging surfaces should support:

- replay timeline, event inspection, and state diff
- legal action previews from each viewer projection
- behavior-text drift warnings
- asset missing/hash/license warnings
- layout overflow warnings at target viewports
- hidden-information leak checks
- fixture-driven smoke previews for representative game states

## Information Architecture

Recommended top-level navigation:

1. Dashboard
2. Rulesets
3. Assets
4. Board Layouts
5. Cards
6. Heroes
7. Equipment
8. Minions
9. Behaviors
10. Playtest
11. Replay And Debug
12. Publish

Each editor should follow the same structure:

- list/table view with filters, validation status, version, tags, and dependency count
- detail editor with identity, assets, layout, properties, behavior, localization, and preview panels
- dependency panel showing referenced assets, behaviors, zones, widgets, and localization keys
- validation panel with blocking errors, warnings, generated previews, and suggested fixes
- version/history panel for immutable published artifacts and draft revisions

## Data Model Principles

UI definitions should live near content, not inside one-off client code.

Core authored entities:

- `Asset`: raw image, audio, video, sprite sheet, VFX texture, font, icon, card frame, board background, placeholder art
- `BoardLayout`: logical play area, regions, slots, widgets, scaling policy, responsive variants
- `WidgetDefinition`: reusable runtime component contract for a region or object type
- `CardTemplate`: generic card identity, assets, layout, properties, behavior refs, localization refs
- `HeroTemplate`: special card/object template for player avatar, hero power, health/resources, identity/class/faction
- `EquipmentTemplate`: persistent attachment/equipment object, slots, stats, range/distance modifiers, replacement behavior
- `MinionTemplate`: board entity template, combat stats, exhaustion, triggers, attachments, death behavior
- `PropertyDisplay`: mapping from property source to visual slot/icon/label/priority
- `BehaviorDefinition`: structured costs, selectors, conditions, effects, triggers, prompts, and generated UX hints

Runtime state should not duplicate authored presentation unnecessarily. Runtime object instances reference templates and carry changing state such as zone, owner, counters, resources, exhaustion, visibility, modifiers, and attachments.

## 1. Raw Asset Management

Asset management is the foundation for all visual editors.

### Asset Library

The asset library should support:

- upload/import for raster images, sprite sheets, audio, fonts, icons, board backgrounds, card frames, and generated art
- metadata: asset id, version, kind, dimensions, media type, content hash, owner, license, source URI, generation prompt, model/provider, tags
- thumbnails and previews for each supported media type
- sprite-sheet preview with frame count, duration, blend mode, anchor, and playback loop
- duplicate detection by content hash
- dependency view showing which cards, boards, widgets, or effects use an asset
- replacement workflow that creates a new version rather than mutating published assets
- validation for missing files, incompatible media type, wrong dimensions, unsafe license, and unresolved source

### Asset Generation Workflow

The UI should treat image generation as a draft assistant:

1. Designer writes or selects a prompt template.
2. Generator produces candidate assets.
3. User selects, names, tags, crops, and approves assets.
4. Asset is stored with generation metadata and a content hash.
5. Ruleset references use stable `assetId` and version, not raw prompt text.

### Asset Browser UX

The browser should include:

- grid and table modes
- filters by kind, tag, dimensions, license, owner, used/unused, missing, generated/manual
- compare mode for multiple generated candidates
- quick actions: copy id, replace, deprecate, inspect dependencies, preview in card/frame/board context

## 2. Board Layout, Predefined Regions, And Custom Widgets

Board layouts define where runtime state appears and how players interact with it.

### Board Layout Model

A board layout should define:

- logical width/height
- viewport scaling behavior
- region list
- widget instances
- z-index/layer groups
- target/drop rules
- responsive variants
- region visibility by viewer role
- debug overlays and editor handles

Predefined regions:

- hero or player avatar region
- hand
- deck
- discard/graveyard
- battlefield/board
- equipment slots
- judgment/delayed-effect zones
- prompt/action window
- chat window
- history/event logs
- opponent summaries
- spectator/debug overlays

Region fields:

- region id
- semantic kind
- owner scope: player, opponent, shared, match, spectator
- geometry: x, y, width, height, anchor, grid/flex strategy
- capacity and overflow behavior
- accepted object types
- targetability and drop behavior
- sorting/grouping rules
- hidden-information placeholder policy
- widget type and widget config

### Layout Editor UX

The layout editor should support:

- visual canvas with fixed logical dimensions
- drag handles for region resizing and repositioning
- snap lines, grid, safe margins, and collision warnings
- region list with lock/hide/rename/duplicate
- property panel for selected region or widget
- viewport presets for desktop, tablet, mobile, and tiny overview mode
- generated layout JSON export/import
- live preview with sample match states
- validation that the play area fits inside the viewport and critical text does not overlap

### Custom Widgets

Custom widgets should be schema-backed and reusable.

Widget categories:

- card collection widget: hand, deck, discard, board row, equipment strip
- single object widget: hero card, equipment slot, minion tile
- system widget: action bar, prompt panel, turn marker, timer, chat, history log
- debug widget: event stream, legal target overlay, state inspector

Widget contracts should define:

- accepted data sources
- required projection scope
- event subscriptions
- commands emitted
- layout properties
- accessibility labels
- tooltip/inspection behavior
- empty/loading/error states

## 3. Card Management

Card management is the generic template editor for cards that may become spells, tricks, identities, equipment, minions, heroes, or tokens.

### Card List

The card list should show:

- template id and display name
- version and publication state
- card type/tags
- mana/cost/suit/point/class/faction metadata
- behavior ids
- asset refs
- validation state
- text/behavior sync state
- dependency count

### Card Detail Editor

Card detail should be organized into tabs:

- Identity: template id, version, object type, tags, ruleset, localization keys
- Assets: portrait, frame, icons, VFX, audio, alternate art, generated drafts
- Layout: card frame, text regions, art crop, property slots, tooltip policy, responsive card variants
- Properties: static metadata, stats, counters, resources, deckbuilding metadata, visibility defaults
- Behavior: behavior refs, generated text, legal target UX, prompt/log templates, tests
- Preview: runtime card in hand, board, hidden state, tooltip, disabled state, selected state, animation
- Validation: missing refs, bad placeholders, text drift, asset issues, hidden-information leaks

### Card Layout And Property Display

Cards should remain self-contained by default. The editor should let developers define:

- art region
- title region
- rules text region
- action affordance region
- property badges by slot
- icon set
- keyword rendering
- whole-card tooltip/inspection
- compact/expanded variants

Property display examples:

- Hearthstone-like spell: mana cost top-left, class color frame, school tag in tooltip
- Hearthstone-like minion: attack bottom-left, health bottom-right
- Hearthstone-like weapon: attack bottom-left, durability bottom-right
- Sanguosha-like basic/trick card: suit and point in upper corner, category label, kingdom/faction if relevant

Default validation accepts `top-left`, `top-right`, `bottom-left`, and `bottom-right` slots plus `mana`, `sword`, `heart`, and `durability` icons. Board layouts can extend this registry with layout-specific slots and icons; `sample-identity` uses this for Sanguosha-like `suit-point`, `role-corner`, `suit`, `rank`, and `faction` display tokens.

### Behavior Sync

Behavior management should stay tied to the card editor:

- structured behavior definition is the source of gameplay logic
- human-facing text is generated or validated against behavior
- generated target UX hints should drive highlights, prompts, action labels, and logs
- LLM assistance can draft text or behavior, but export requires validation and human approval
- every published card should have at least one fixture or scripted command smoke

## 4. Hero Management

Heroes are still cards/objects, but they deserve a specialized editor because they represent players and often act as persistent rule sources.

### Hero Data

Hero templates should support:

- base card/template identity
- portrait and full art
- hero frame/layout
- health/life/max health
- resources such as mana, armor, hand limit, kingdom/faction, class, role
- hero power or active ability
- passive abilities and triggers
- equipment slots
- death/dying/rescue behavior hooks
- emotes/voice/avatar assets
- visibility policy for hidden identity games

### Hero Layout

Hero layout should cover:

- portrait/art crop
- name/title
- health and armor/resource displays
- hero power button or drag source
- equipment strip around the hero
- status markers such as active, dying, dead, immune, exhausted
- target highlight area
- tooltip/inspection panel

### Hero Behavior

Hero behavior management should support:

- source-less behaviors issued by the player
- hero-object-sourced behaviors when the hero is a runtime object
- passive triggers
- replacement/prevention effects
- class/faction-specific restrictions
- game-mode-specific death and win/loss integration

## 5. Equipment Management

Equipment is a persistent object or attachment with slot, replacement, stat, targeting, and lifecycle rules.

### Equipment Data

Equipment templates should support:

- equipment subtype: weapon, armor, mount, treasure, location-like attachment, custom
- slot id and slot compatibility
- stats: attack, durability, range, distance modifier, shield, charges
- counters/resources
- equip cost and play behavior
- replacement behavior when slot is occupied
- attach/detach/destroy behavior
- passive modifiers and triggers
- visual frame and slot icon

### Equipment Layout

Equipment UI should support:

- equipped strip near hero or player area
- dedicated equipment region for identity-style games
- compact slot icon plus expanded card inspection
- durability/charge badges
- range/distance modifier indicators
- drag/drop equip preview
- replacement preview when a slot is occupied

### Equipment Behavior

Equipment behavior editor should expose:

- equip conditions
- target owner and slot selectors
- replacement effects
- granted actions such as hero weapon attack
- passive continuous modifiers
- triggered responses such as armor dodge/prevent
- cleanup on owner death or unequip

## 6. Minion Management

Minions are board entities created from cards or generated by effects. They need a specialized editor because their runtime state is often more important than their hand-card state.

### Minion Data

Minion templates should support:

- base card identity and generated token identity
- attack, health, armor/shield, counters, keywords
- board capacity footprint
- tribe/faction/class/tags
- summon behavior
- attack behavior
- death behavior
- start/end turn triggers
- aura or continuous modifiers
- attachment support
- exhaustion/readiness rules

### Minion Layout

Minion layout should support:

- hand-card and board-entity variants
- compact board tile with art, name, attack, health, status markers
- selected/targetable/disabled states
- damage/heal/trigger animation anchors
- stack/overflow display when board is crowded
- tooltip/inspection for full card text and runtime modifiers

### Minion Behavior

Minion behavior management should expose:

- summon placement selectors
- attack target selectors
- exhaustion/ready conditions
- combat damage rules
- deathrattle/death trigger hooks
- aura scope and recalculation policy
- token generation
- fixture generator for board-state test cases

## Cross-Cutting UX Requirements

### Projection And Hidden Information

Every UI component must declare the projection it consumes:

- player-owned private state
- opponent public state
- spectator state
- admin/debug state

Components should never infer hidden card/template details from client-only mappings. Hidden objects should render from projection-safe placeholders.

### Commands And Targeting

All actionable UI should use one command pipeline:

1. behavior/action source selected
2. engine-provided legal targets and UX hints rendered
3. user picks targets or passes
4. command submitted
5. events update state
6. animation/log feedback follows accepted events

The button path and drag/drop path should produce equivalent commands.

### Accessibility

The UI should support:

- keyboard navigation for sources and targets
- visible focus states
- explicit buttons for every drag/drop action
- reduced motion option
- tooltip content available through focus/inspection
- status announcements for command acceptance/rejection and prompts

### Validation

Validation should cover:

- missing asset refs
- invalid media dimensions
- invalid layout slots
- overlap at required viewport presets
- hidden-information leaks
- behavior/text drift
- missing localization
- missing legal target UX hints
- untested published behaviors

## Suggested Milestones

### UI-M0: Shared UI Schema And Runtime Contracts

- Define schemas for board layouts, widgets, property display, and object-specific templates.
- Define runtime component contracts for projection input and command output.
- Acceptance: a sample board layout validates and renders from JSON.

### UI-M1: Asset Library

- Build asset browser, metadata editor, previewers, and dependency panel.
- Support generated asset draft metadata.
- Acceptance: a card portrait and VFX sheet can be imported, validated, previewed, and referenced by a card.
- Current slice: manifest-backed browser panel with previews, kind filters, generated metadata, usage/dependency labels, and local asset entry JSON drafts that can be applied, copied as a manifest, or reset to ruleset source.

### UI-M2: Board Layout Editor

- Build visual region editor with predefined regions and custom widgets.
- Preserve viewport-fit scaling.
- Acceptance: a Hearthstone-like and Sanguosha-like board layout can be authored and exported.
- Current slice: Ember Duel `Layout` panel edits viewport-fitted tokens plus selected `BoardLayoutJson` regions, supports region geometry fields and canvas drag/resize, and imports/exports full board layout JSON.

### UI-M3: Card Template Studio

- Build card list/detail editor for identity, assets, layout, properties, behavior, preview, and validation.
- Acceptance: Firebolt-like spell and Sanguosha-like trick card can be authored without changing client code.

### UI-M4: Hero Studio

- Build specialized hero editor for player avatar, resources, hero power, status, equipment strip, and death hooks.
- Acceptance: a hero ability can be authored, previewed, validated, and executed in a playtest fixture.

### UI-M5: Equipment Studio

- Build equipment editor for slots, stats, replacement, passive modifiers, and granted actions.
- Acceptance: weapon, armor, and mount-style equipment can be authored and previewed.

### UI-M6: Minion Studio

- Build minion editor for board entity layout, stats, combat behavior, death triggers, and token variants.
- Acceptance: vanilla minion and death-trigger minion can be authored and tested.

### UI-M7: Integrated Playtest And Debug

- Combine authoring changes with fixture-driven previews, replay, legal target overlays, and state diff.
- Acceptance: a designer can edit a card/minion/equipment behavior, run a scripted playtest, inspect events, and publish a validated draft bundle.

## Immediate Next Steps

1. Add import/write workflows for the asset library; the current panel edits local manifest drafts only.
2. Add asset file picker/import affordances for draft `publicPath`, content hash, dimensions, and generated asset metadata.
3. Add projection-safe hidden role/player widgets for identity-game previews.
