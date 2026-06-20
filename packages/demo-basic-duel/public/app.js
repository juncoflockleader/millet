let CARD_DEFS = {
  firebolt: {
    name: "Firebolt",
    manaCost: 2,
    text: "Deal 3 damage to the enemy hero.",
    action: "Cast",
    art: "/assets/cards/firebolt.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  nova: {
    name: "Nova",
    manaCost: 2,
    text: "Deal 2 damage to both heroes.",
    action: "Cast",
    art: "/assets/cards/nova.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  coin: {
    name: "Coin",
    manaCost: 0,
    text: "Gain 1 mana this turn.",
    action: "Play",
    art: "/assets/cards/coin.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  reward: {
    name: "Reward",
    manaCost: 0,
    text: "A drawn test card.",
    action: "",
    art: "/assets/cards/reward.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  loot_minion: {
    name: "Loot Minion",
    stats: { attack: 1, health: 1 },
    text: "Attack for 1 damage.",
    action: "Attack",
    art: "/assets/cards/loot-minion.png",
    display: [
      { property: "attack", source: "stats", slot: "bottom-left", icon: "sword", label: "Attack" },
      { property: "health", source: "stats", slot: "bottom-right", icon: "heart", label: "Health" }
    ]
  },
  training_axe: {
    name: "Training Axe",
    stats: { attack: 2, durability: 2 },
    text: "Attack for 2 damage. Loses durability.",
    action: "Swing",
    art: "/assets/cards/training-axe.png",
    display: [
      { property: "attack", source: "stats", slot: "bottom-left", icon: "sword", label: "Attack" },
      { property: "durability", source: "counter", slot: "bottom-right", icon: "durability", label: "Durability" }
    ]
  }
};

let HERO_DEFS = {
  p1: {
    name: "Player 1",
    title: "Ember Adept",
    art: "/assets/cards/firebolt.png",
    ability: {
      name: "Focus Flame",
      behaviorId: "hero_focus",
      text: "Spend 2 mana to deal 1 damage to the enemy hero.",
      action: "Focus",
      targetMode: "enemyHero",
      display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }],
      manaCost: 2
    }
  },
  p2: {
    name: "Player 2",
    title: "Ash Warden",
    art: "/assets/cards/nova.png",
    ability: {
      name: "Focus Flame",
      behaviorId: "hero_focus",
      text: "Spend 2 mana to deal 1 damage to the enemy hero.",
      action: "Focus",
      targetMode: "enemyHero",
      display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }],
      manaCost: 2
    }
  }
};

const FALLBACK_CARD_DEFS = cloneJson(CARD_DEFS);
const FALLBACK_HERO_DEFS = cloneJson(HERO_DEFS);

const EFFECTS = {
  firebolt: { sheet: "/assets/effects/firebolt-sheet.png", className: "firebolt" },
  nova: { sheet: "/assets/effects/nova-sheet.png", className: "nova" },
  coin: { sheet: "/assets/effects/coin-sheet.png", className: "coin" },
  attack: { sheet: "/assets/effects/attack-slash-sheet.png", className: "attack" }
};

const urlParams = new URLSearchParams(window.location.search);
const RULESET_ID = urlParams.get("ruleset") === "sample-identity" ? "sample-identity" : "sample-duel";
const RULESET_BASE_URL = `/content/rulesets/${RULESET_ID}`;

let PLAY_AREA = {
  width: 1120,
  height: 620,
  minScale: 0.2
};

const LAYOUT_STORAGE_KEY = `ember-duel.layout.${RULESET_ID}.v1`;
const LAYOUT_SNAP_STORAGE_KEY = `ember-duel.layout.snap.${RULESET_ID}.v1`;
const CARD_CATALOG_STORAGE_KEY = `ember-duel.cards.${RULESET_ID}.v1`;
const PRESENTATION_STORAGE_KEY = `ember-duel.presentation.${RULESET_ID}.v1`;
const ASSET_STORAGE_KEY = `ember-duel.assets.${RULESET_ID}.v1`;
const GAME_DEFINITION_URL = `${RULESET_BASE_URL}/game-definition.json`;
const LOCALIZATION_URL = `${RULESET_BASE_URL}/localization.json`;
const BEHAVIOR_SUMMARY_URL = `${RULESET_BASE_URL}/behavior-summaries.json`;
const FALLBACK_CARD_CATALOG_URL = "/content/rulesets/sample-duel/card-catalog.json";
const ASSET_MANIFEST_URL = `${RULESET_BASE_URL}/asset-manifest.json`;
const FALLBACK_BOARD_LAYOUT_URL = "/content/rulesets/sample-duel/ui/ember-duel-board-layout.json";
const FALLBACK_PRESENTATION_CATALOG_URL = "/content/rulesets/sample-duel/ui/ember-duel-presentation.json";
const FALLBACK_PREVIEW_FIXTURES_URL = "/content/rulesets/sample-duel/ui/ember-duel-preview-fixtures.json";

const DEFAULT_LAYOUT = {
  version: 1,
  arena: {
    padding: 12,
    rowGap: 10,
    opponentRow: 214,
    centerRow: 96,
    playerRow: 254
  },
  player: {
    heroWidth: 172,
    gap: 8
  },
  zones: {
    boardWidth: 292,
    gap: 8
  },
  center: {
    turnWidth: 420,
    gap: 8
  },
  card: {
    width: 118,
    artHeight: 50
  }
};

const LAYOUT_LIMITS = {
  arena: {
    padding: [6, 24],
    rowGap: [4, 22],
    opponentRow: [140, 330],
    centerRow: [72, 180],
    playerRow: [160, 360]
  },
  player: {
    heroWidth: [128, 260],
    gap: [4, 20]
  },
  zones: {
    boardWidth: [220, 520],
    gap: [4, 20]
  },
  center: {
    turnWidth: [320, 650],
    gap: [4, 20]
  },
  card: {
    width: [94, 150],
    artHeight: [40, 76]
  }
};

const LAYOUT_CONTROLS = [
  { path: "arena.opponentRow", label: "Opponent row", min: 140, max: 330, step: 1, unit: "px" },
  { path: "arena.centerRow", label: "Center lane", min: 72, max: 180, step: 1, unit: "px" },
  { path: "arena.playerRow", label: "Player row", min: 160, max: 360, step: 1, unit: "px" },
  { path: "player.heroWidth", label: "Hero column", min: 128, max: 260, step: 1, unit: "px" },
  { path: "zones.boardWidth", label: "Board zone", min: 220, max: 520, step: 1, unit: "px" },
  { path: "center.turnWidth", label: "Turn panel", min: 320, max: 650, step: 1, unit: "px" },
  { path: "card.width", label: "Card width", min: 94, max: 150, step: 1, unit: "px" },
  { path: "card.artHeight", label: "Card art", min: 40, max: 76, step: 1, unit: "px" },
  { path: "arena.rowGap", label: "Row gap", min: 4, max: 22, step: 1, unit: "px" },
  { path: "arena.padding", label: "Board padding", min: 6, max: 24, step: 1, unit: "px" }
];

const REGION_KIND_OPTIONS = [
  "hero",
  "battlefield",
  "hand",
  "equipment",
  "deck",
  "discard",
  "graveyard",
  "judgment",
  "prompt",
  "action_window",
  "history_log",
  "chat",
  "opponent_summary",
  "spectator_overlay",
  "debug_overlay",
  "custom"
];

const REGION_OWNER_OPTIONS = ["player", "opponent", "shared", "match", "spectator"];
const REGION_VISIBILITY_OPTIONS = ["public", "owner", "opponent", "admin"];
const REGION_DROP_OPTIONS = ["none", "select_player_target", "select_object_target", "play_to_region", "move_to_region"];
const REGION_OVERFLOW_OPTIONS = ["fan", "scroll", "stack", "compact", "hidden"];
const REGION_PRESETS = [
  {
    id: "custom",
    label: "Custom",
    region: {
      kind: "custom",
      ownerScope: "shared",
      label: "Custom Region",
      geometry: { x: 420, y: 260, width: 180, height: 96 },
      widgetId: "custom-widget",
      accepts: [],
      targetable: false,
      dropBehavior: "none",
      overflow: "compact",
      visibleTo: "public"
    },
    widget: { kind: "custom", component: "CustomWidget" }
  },
  {
    id: "hero",
    label: "Hero",
    region: {
      kind: "hero",
      ownerScope: "player",
      label: "Hero",
      geometry: { x: 24, y: 24, width: 172, height: 160 },
      widgetId: "hero-card",
      accepts: ["hero", "player"],
      targetable: true,
      dropBehavior: "select_player_target",
      overflow: "compact",
      visibleTo: "public"
    },
    widget: { kind: "single_object", component: "HeroCard" }
  },
  {
    id: "battlefield",
    label: "Battlefield",
    region: {
      kind: "battlefield",
      ownerScope: "player",
      label: "Battlefield",
      geometry: { x: 220, y: 24, width: 320, height: 160 },
      widgetId: "card-row",
      accepts: ["minion"],
      targetable: true,
      dropBehavior: "select_object_target",
      overflow: "fan",
      visibleTo: "public"
    },
    widget: { kind: "card_collection", component: "CardRow" }
  },
  {
    id: "hand",
    label: "Hand",
    region: {
      kind: "hand",
      ownerScope: "player",
      label: "Hand",
      geometry: { x: 560, y: 24, width: 420, height: 160 },
      widgetId: "hand-fan",
      accepts: ["card"],
      targetable: false,
      dropBehavior: "none",
      overflow: "fan",
      visibleTo: "owner"
    },
    widget: { kind: "card_collection", component: "CardRow" }
  },
  {
    id: "deck",
    label: "Deck",
    region: {
      kind: "deck",
      ownerScope: "player",
      label: "Deck",
      geometry: { x: 1000, y: 24, width: 72, height: 104 },
      widgetId: "deck-stack",
      accepts: ["card"],
      targetable: false,
      dropBehavior: "none",
      overflow: "stack",
      visibleTo: "public"
    },
    widget: { kind: "card_collection", component: "DeckStack" }
  },
  {
    id: "equipment",
    label: "Equipment",
    region: {
      kind: "equipment",
      ownerScope: "player",
      label: "Equipment",
      geometry: { x: 24, y: 204, width: 220, height: 96 },
      widgetId: "equipment-slot",
      accepts: ["weapon", "armor", "equipment"],
      targetable: false,
      dropBehavior: "none",
      overflow: "compact",
      visibleTo: "public"
    },
    widget: { kind: "card_collection", component: "EquipmentSlot" }
  },
  {
    id: "action_window",
    label: "Action",
    region: {
      kind: "action_window",
      ownerScope: "shared",
      label: "Action Window",
      geometry: { x: 280, y: 204, width: 360, height: 96 },
      widgetId: "action-panel",
      accepts: ["command", "response"],
      targetable: false,
      dropBehavior: "none",
      overflow: "compact",
      visibleTo: "public"
    },
    widget: { kind: "system", component: "ActionPanel" }
  },
  {
    id: "history_log",
    label: "History",
    region: {
      kind: "history_log",
      ownerScope: "shared",
      label: "History Log",
      geometry: { x: 660, y: 204, width: 380, height: 96 },
      widgetId: "history-log",
      accepts: ["event"],
      targetable: false,
      dropBehavior: "none",
      overflow: "scroll",
      visibleTo: "public"
    },
    widget: { kind: "system", component: "HistoryLog" }
  }
];
const BOARD_LAYOUT_TEMPLATES = [
  {
    id: "ruleset-default",
    label: "Ruleset Default",
    source: "authored"
  },
  {
    id: "duel-2p",
    label: "2P Duel",
    url: "/content/rulesets/sample-duel/ui/ember-duel-board-layout.json",
    layoutId: "ember-duel-default-board"
  },
  {
    id: "identity-8p",
    label: "8-Seat Identity",
    url: "/content/rulesets/sample-identity/ui/sanguosha-eight-player-board-layout.json",
    layoutId: "sanguosha-eight-player-board"
  }
];
const LAYOUT_SNAP_SIZE = 8;
const CARD_TEMPLATE_REQUIRED_FIELDS = ["templateId", "version", "objectType", "nameKey"];
const CARD_TEMPLATE_OPTIONAL_FIELDS = ["descriptionKey", "tags", "behaviorIds", "assetRefs", "manaCost", "stats", "display", "metadata"];
const CARD_TEMPLATE_ALLOWED_FIELDS = new Set([...CARD_TEMPLATE_REQUIRED_FIELDS, ...CARD_TEMPLATE_OPTIONAL_FIELDS]);
const PROPERTY_DISPLAY_SOURCES = ["template", "stats", "counter", "resource", "metadata", "computed"];
const DEFAULT_PROPERTY_DISPLAY_SLOTS = [
  { id: "top-left", label: "Top Left Corner", objectTypes: ["card", "hero", "equipment", "minion", "identity"] },
  { id: "top-right", label: "Top Right Corner", objectTypes: ["card", "hero", "equipment", "minion", "identity"] },
  { id: "bottom-left", label: "Bottom Left Corner", objectTypes: ["equipment", "minion"] },
  { id: "bottom-right", label: "Bottom Right Corner", objectTypes: ["equipment", "minion"] }
];
const DEFAULT_PROPERTY_DISPLAY_ICONS = [
  { id: "mana", label: "Mana" },
  { id: "sword", label: "Attack" },
  { id: "heart", label: "Health" },
  { id: "durability", label: "Durability" }
];

const RUNTIME_WIDGET_RENDERERS = {
  HeroCard: (region, context) => renderHeroCard(context.playerId, region.id),
  CardRow: (region, context) => {
    if (region.kind === "battlefield") {
      return renderBattlefieldRegion(context.playerId, region);
    }
    if (region.kind === "hand") {
      return renderHandRegion(context.playerId, region);
    }
    return renderRuntimeWidgetFallback(region, `CardRow is not bound for ${labelFromId(region.kind)} regions.`);
  },
  EquipmentSlot: (region, context) => renderEquipmentRegion(context.playerId, region),
  DeckStack: (region, context) => renderDeckRegion(context.playerId, region),
  CustomWidget: (region) => renderRuntimeWidgetFallback(region, customWidgetText(region))
};

const ABSOLUTE_WIDGET_RENDERERS = {
  IdentityPlayerPanel: (region) => renderIdentitySeat(region),
  HeroCard: (region) => renderIdentitySeat(region),
  CardRow: (region) => renderIdentityCardStrip(region, zoneIdForAbsoluteCollection(region), labelFromId(region.kind)),
  EquipmentStrip: (region) => renderIdentityCardStrip(region, `zone_equipment_${selectedPlayerId}`, "Equipment"),
  EquipmentSlot: (region) => renderIdentityCardStrip(region, `zone_equipment_${selectedPlayerId}`, "Equipment"),
  JudgmentStrip: (region) => renderIdentityCardStrip(region, `zone_judgment_${selectedPlayerId}`, "Judgment"),
  DeckStack: (region) => renderIdentityPile(region, region.kind === "deck" ? "zone_shared_deck" : "zone_deck", "Deck"),
  DiscardPile: (region) => renderIdentityPile(region, "zone_discard", "Discard"),
  ActionPanel: (region) => renderIdentityPromptWindow(region),
  RoleSummary: (region) => renderIdentityRoleSummary(region),
  HistoryLog: (region) => renderIdentityHistory(region),
  ChatWindow: (region) => renderAbsoluteWidgetFallback(region, customWidgetText(region)),
  CustomWidget: (region) => renderAbsoluteWidgetFallback(region, customWidgetText(region))
};

const ASSET_REQUIRED_FIELDS = ["assetId", "version", "kind", "contentHash", "sourceUri", "license", "owner"];
const ASSET_OPTIONAL_FIELDS = [
  "publicPath",
  "mediaType",
  "width",
  "height",
  "durationMs",
  "frameCount",
  "generationId",
  "prompt",
  "previewRole",
  "usage"
];
const ASSET_ALLOWED_FIELDS = new Set([...ASSET_REQUIRED_FIELDS, ...ASSET_OPTIONAL_FIELDS]);
const ASSET_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

const KEYWORDS = {
  attack: {
    title: "Attack",
    body: "A card or object deals combat damage to the enemy hero. Minions exhaust after attacking."
  },
  damage: {
    title: "Damage",
    body: "Damage lowers health. A hero at zero or less health loses unless both heroes die together."
  },
  draw: {
    title: "Draw",
    body: "Move the top card of a deck into that player's hand. Empty decks can cause fatigue damage."
  },
  drawn: {
    title: "Draw",
    body: "A drawn card moved from deck to hand."
  },
  durability: {
    title: "Durability",
    body: "A weapon counter. Weapon attacks spend durability; the weapon is discarded at zero."
  },
  mana: {
    title: "Mana",
    body: "A spendable resource used to pay card costs during the active player's turn."
  }
};

const PLAYER_NAMES = {
  p1: "Player 1",
  p2: "Player 2"
};

let matchId = "";
let selectedPlayerId = "p1";
let state = null;
let events = [];
let commandCounter = 0;
let effectCounter = 0;
let selectedAction = null;
let authoredDefaultLayout = cloneLayout(DEFAULT_LAYOUT);
let authoredBoardLayoutDocument = null;
let boardLayoutDocument = null;
let layoutState = loadLayout();
let layoutEditorOpen = false;
let activeLayoutDrag = null;
let activeRegionDrag = null;
let selectedLayoutRegionId = "";
let layoutSnapEnabled = loadLayoutSnapEnabled();
let gameDefinitionDocument = null;
let localizationBundle = null;
let behaviorSummaryDocument = null;
let cardCatalog = null;
let authoredCardCatalog = null;
let cardStudioOpen = false;
let selectedCardTemplateId = "";
let cardTemplateFilter = "all";
let presentationCatalogId = "fallback";
let presentationCatalog = null;
let authoredPresentationCatalog = null;
let presentationEditorOpen = false;
let selectedPresentationEntryId = "";
let assetManifest = null;
let authoredAssetManifest = null;
let authoringStatus = null;
let assetLibraryOpen = false;
let selectedAssetId = "";
let assetFilterKind = "all";
let assetUsageIndex = {};
let previewFixtureDocument = null;
let previewPanelOpen = false;
let activePreviewFixture = null;
let previewMode = false;

const dom = {
  matchLine: document.querySelector("#matchLine"),
  playArea: document.querySelector("#playArea"),
  arenaScaleBox: document.querySelector("#arenaScaleBox"),
  arena: document.querySelector("#arena"),
  absolutePreviewBoard: document.querySelector("#absolutePreviewBoard"),
  effectLayer: document.querySelector("#effectLayer"),
  centerLane: document.querySelector("#centerLane"),
  turnPanel: document.querySelector("#turnPanel"),
  promptSummary: document.querySelector("#promptSummary"),
  chatWindow: document.querySelector("#chatWindow"),
  previewPanel: document.querySelector("#previewPanel"),
  previewPanelButton: document.querySelector("#previewPanelButton"),
  closePreviewPanelButton: document.querySelector("#closePreviewPanelButton"),
  previewFixtureCount: document.querySelector("#previewFixtureCount"),
  previewFixtureList: document.querySelector("#previewFixtureList"),
  previewPanelStatus: document.querySelector("#previewPanelStatus"),
  assetLibrary: document.querySelector("#assetLibrary"),
  assetLibraryButton: document.querySelector("#assetLibraryButton"),
  newAssetButton: document.querySelector("#newAssetButton"),
  closeAssetLibraryButton: document.querySelector("#closeAssetLibraryButton"),
  assetFilter: document.querySelector("#assetFilter"),
  assetCount: document.querySelector("#assetCount"),
  assetList: document.querySelector("#assetList"),
  assetDetail: document.querySelector("#assetDetail"),
  assetLibraryStatus: document.querySelector("#assetLibraryStatus"),
  cardStudio: document.querySelector("#cardStudio"),
  cardStudioButton: document.querySelector("#cardStudioButton"),
  closeCardStudioButton: document.querySelector("#closeCardStudioButton"),
  cardTemplateCount: document.querySelector("#cardTemplateCount"),
  cardTemplateFilter: document.querySelector("#cardTemplateFilter"),
  cardTemplateList: document.querySelector("#cardTemplateList"),
  cardTemplateDetail: document.querySelector("#cardTemplateDetail"),
  cardStudioStatus: document.querySelector("#cardStudioStatus"),
  presentationEditor: document.querySelector("#presentationEditor"),
  presentationEditorButton: document.querySelector("#presentationEditorButton"),
  closePresentationEditorButton: document.querySelector("#closePresentationEditorButton"),
  presentationEntryCount: document.querySelector("#presentationEntryCount"),
  presentationEntryList: document.querySelector("#presentationEntryList"),
  heroPresentationEditor: document.querySelector("#heroPresentationEditor"),
  presentationEntryJson: document.querySelector("#presentationEntryJson"),
  applyPresentationEntryButton: document.querySelector("#applyPresentationEntryButton"),
  copyPresentationCatalogButton: document.querySelector("#copyPresentationCatalogButton"),
  resetPresentationCatalogButton: document.querySelector("#resetPresentationCatalogButton"),
  presentationEditorStatus: document.querySelector("#presentationEditorStatus"),
  layoutGuides: document.querySelector("#layoutGuides"),
  layoutRegionLayer: document.querySelector("#layoutRegionLayer"),
  layoutEditor: document.querySelector("#layoutEditor"),
  layoutEditorButton: document.querySelector("#layoutEditorButton"),
  closeLayoutEditorButton: document.querySelector("#closeLayoutEditorButton"),
  layoutControls: document.querySelector("#layoutControls"),
  layoutRegionCount: document.querySelector("#layoutRegionCount"),
  layoutRegionPresetSelect: document.querySelector("#layoutRegionPresetSelect"),
  layoutRegionList: document.querySelector("#layoutRegionList"),
  layoutRegionDetail: document.querySelector("#layoutRegionDetail"),
  layoutDiagnostics: document.querySelector("#layoutDiagnostics"),
  layoutJson: document.querySelector("#layoutJson"),
  layoutEditorStatus: document.querySelector("#layoutEditorStatus"),
  fitLayoutButton: document.querySelector("#fitLayoutButton"),
  resetLayoutButton: document.querySelector("#resetLayoutButton"),
  addLayoutRegionButton: document.querySelector("#addLayoutRegionButton"),
  duplicateLayoutRegionButton: document.querySelector("#duplicateLayoutRegionButton"),
  mirrorLayoutRegionXButton: document.querySelector("#mirrorLayoutRegionXButton"),
  mirrorLayoutRegionYButton: document.querySelector("#mirrorLayoutRegionYButton"),
  fillLayoutRegionButton: document.querySelector("#fillLayoutRegionButton"),
  deleteLayoutRegionButton: document.querySelector("#deleteLayoutRegionButton"),
  snapLayoutToggle: document.querySelector("#snapLayoutToggle"),
  copyLayoutButton: document.querySelector("#copyLayoutButton"),
  importLayoutButton: document.querySelector("#importLayoutButton"),
  tooltipLayer: document.querySelector("#tooltipLayer"),
  newMatchButton: document.querySelector("#newMatchButton"),
  refreshButton: document.querySelector("#refreshButton"),
  p1Panel: document.querySelector("#p1Panel"),
  p2Panel: document.querySelector("#p2Panel"),
  selectP1: document.querySelector("#selectP1"),
  selectP2: document.querySelector("#selectP2"),
  turnText: document.querySelector("#turnText"),
  statusText: document.querySelector("#statusText"),
  endTurnButton: document.querySelector("#endTurnButton"),
  battleLog: document.querySelector("#battleLog")
};

dom.newMatchButton.addEventListener("click", () => startMatch());
dom.refreshButton.addEventListener("click", () => refresh());
dom.endTurnButton.addEventListener("click", () => submitCommand("end_turn", {}));
dom.promptSummary?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-prompt-action]");
  if (!button || button.disabled) {
    return;
  }

  if (button.dataset.promptAction === "end_turn") {
    submitCommand("end_turn", {});
    return;
  }

  const promptId = button.dataset.promptId ?? dom.promptSummary?.dataset.promptId;
  const responderId = button.dataset.promptResponder;
  if (!promptId || !responderId) {
    return;
  }

  if (button.dataset.promptAction === "answer_pass") {
    answerPrompt(promptId, "pass", responderId);
  } else if (button.dataset.promptAction === "response_behavior" && button.dataset.behaviorId) {
    answerPrompt(promptId, { action: "execute_behavior", behaviorId: button.dataset.behaviorId }, responderId);
  }
});
dom.selectP1.addEventListener("click", () => selectPlayer("p1"));
dom.selectP2.addEventListener("click", () => selectPlayer("p2"));

installLayoutEditor();
installAssetLibrary();
installCardStudio();
installPresentationEditor();
installPreviewPanel();
applyLayout();
annotateStaticLayoutRegions();
installViewportFitter();
render();
loadAuthoredBoardLayout();
loadLocalizationBundle();
loadBehaviorSummaries();
loadCardCatalog();
loadAuthoredPresentationCatalog();
loadAssetManifest();
loadPreviewFixtures();

async function startMatch() {
  if (RULESET_ID !== "sample-duel") {
    showError("Live demo matches are available for sample-duel. Use Preview for this ruleset.");
    return;
  }
  if (previewPanelOpen) {
    togglePreviewPanel(false);
  }
  previewMode = false;
  activePreviewFixture = null;
  dom.previewPanelButton?.classList.remove("selected");
  const response = await fetch("/matches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: RULESET_ID, demoDuel: true })
  });
  const payload = await readJson(response);
  if (!response.ok) {
    showError(payload.message ?? payload.error ?? "Could not create match");
    return;
  }

  matchId = payload.matchId;
  selectedPlayerId = "p1";
  selectedAction = null;
  await refresh();
}

async function refresh() {
  if (!matchId) {
    return;
  }

  const [statePayload, replayPayload] = await Promise.all([
    fetchJson(`/matches/${matchId}/state?admin=true`, { "x-millet-admin": "true" }),
    fetchJson(`/matches/${matchId}/replay?admin=true`, { "x-millet-admin": "true" })
  ]);
  state = statePayload.state;
  events = replayPayload.events ?? [];
  render();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `Request failed: ${response.status}`);
  }
  return payload;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function submitCommand(type, payload, playerId = selectedPlayerId) {
  if (previewMode) {
    showError("Preview fixture is read-only.");
    return;
  }
  if (!state || !matchId) {
    return;
  }

  const actingPlayerId = playerId;
  const command = {
    id: `cmd_demo_${actingPlayerId}_${++commandCounter}`,
    matchId,
    playerId: actingPlayerId,
    type,
    payload
  };

  const response = await fetch(`/matches/${matchId}/commands`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-millet-user-id": actingPlayerId === "p1" ? "u1" : "u2"
    },
    body: JSON.stringify({ command })
  });
  const result = await readJson(response);
  if (!response.ok) {
    showError(result.message ?? result.error ?? "Command rejected");
    return;
  }

  await refresh();
  playCommandEffect(command);
  const activePlayerId = state?.turn?.activePlayerId;
  if (activePlayerId) {
    selectedPlayerId = activePlayerId;
    render();
  }
}

function answerPrompt(promptId, answer, responderId) {
  return submitCommand("answer_prompt", { promptId, answer }, responderId);
}

function selectPlayer(playerId) {
  selectedPlayerId = playerId;
  render();
}

function installLayoutEditor() {
  renderLayoutControls();
  syncLayoutEditor();

  dom.layoutEditorButton?.addEventListener("click", () => toggleLayoutEditor());
  dom.closeLayoutEditorButton?.addEventListener("click", () => toggleLayoutEditor(false));
  dom.fitLayoutButton?.addEventListener("click", () => {
    layoutState = normalizeLayout(layoutState, { fitRows: true });
    commitLayoutChange("Rows fitted to the board.");
  });
  dom.resetLayoutButton?.addEventListener("click", () => {
    resetBoardLayoutDraft();
  });
  dom.copyLayoutButton?.addEventListener("click", async () => {
    const text = JSON.stringify(exportBoardLayoutDocument(), null, 2);
    dom.layoutJson.value = text;
    try {
      await navigator.clipboard.writeText(text);
      setLayoutStatus("Copied layout JSON.");
    } catch {
      dom.layoutJson.select();
      setLayoutStatus("Select the JSON field to copy.");
    }
  });
  dom.importLayoutButton?.addEventListener("click", () => {
    try {
      importBoardLayoutDraft(JSON.parse(dom.layoutJson.value));
      setLayoutStatus("Imported board layout JSON.");
    } catch (error) {
      setLayoutStatus(error instanceof Error ? error.message : "Invalid layout JSON.");
    }
  });
  dom.addLayoutRegionButton?.addEventListener("click", () => addLayoutRegion());
  dom.duplicateLayoutRegionButton?.addEventListener("click", () => duplicateSelectedLayoutRegion());
  dom.mirrorLayoutRegionXButton?.addEventListener("click", () => mirrorSelectedLayoutRegion("x"));
  dom.mirrorLayoutRegionYButton?.addEventListener("click", () => mirrorSelectedLayoutRegion("y"));
  dom.fillLayoutRegionButton?.addEventListener("click", () => fillSelectedLayoutRegion());
  dom.deleteLayoutRegionButton?.addEventListener("click", () => deleteSelectedLayoutRegion());
  dom.snapLayoutToggle?.addEventListener("change", () => {
    layoutSnapEnabled = Boolean(dom.snapLayoutToggle.checked);
    localStorage.setItem(LAYOUT_SNAP_STORAGE_KEY, layoutSnapEnabled ? "true" : "false");
    setLayoutStatus(layoutSnapEnabled ? `Snap enabled (${LAYOUT_SNAP_SIZE}px grid).` : "Snap disabled.");
    renderLayoutRegionEditor({ preserveDetailFocus: true });
  });
  dom.layoutControls?.addEventListener("input", (event) => {
    const documentInput = event.target.closest("[data-layout-document-field]");
    if (documentInput) {
      updateBoardLayoutDocumentFromInput(documentInput);
      return;
    }
    const input = event.target.closest("[data-layout-path]");
    if (!input) {
      return;
    }
    setLayoutValue(input.dataset.layoutPath, Number(input.value));
    commitLayoutChange();
  });
  dom.layoutControls?.addEventListener("click", (event) => {
    const templateButton = event.target.closest("[data-layout-template-action]");
    if (!templateButton) {
      return;
    }
    void handleLayoutTemplateAction(templateButton.dataset.layoutTemplateAction);
  });
  dom.layoutControls?.addEventListener("change", (event) => {
    const documentInput = event.target.closest("[data-layout-document-field]");
    if (documentInput) {
      updateBoardLayoutDocumentFromInput(documentInput);
    }
  });
  dom.layoutRegionList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout-region-id]");
    if (!button) {
      return;
    }
    selectLayoutRegion(button.dataset.layoutRegionId);
  });
  dom.layoutRegionDetail?.addEventListener("input", (event) => {
    const input = event.target.closest("[data-layout-region-field]");
    if (!input) {
      return;
    }
    updateSelectedLayoutRegionFromInput(input);
  });
  dom.layoutRegionDetail?.addEventListener("change", (event) => {
    const input = event.target.closest("[data-layout-region-field]");
    if (!input) {
      return;
    }
    updateSelectedLayoutRegionFromInput(input);
  });
  dom.layoutRegionLayer?.addEventListener("click", (event) => {
    const regionBox = event.target.closest("[data-region-id]");
    if (regionBox) {
      selectLayoutRegion(regionBox.dataset.regionId);
    }
  });
  dom.layoutRegionLayer?.addEventListener("pointerdown", startLayoutRegionDrag);
  dom.layoutGuides?.querySelectorAll("[data-layout-handle]").forEach((handle) => {
    handle.addEventListener("pointerdown", startLayoutDrag);
  });
  document.addEventListener("pointermove", updateLayoutDrag);
  document.addEventListener("pointerup", finishLayoutDrag);
  document.addEventListener("pointercancel", finishLayoutDrag);
}

function installAssetLibrary() {
  renderAssetLibrary();
  loadAuthoringStatus();

  dom.assetLibraryButton?.addEventListener("click", () => toggleAssetLibrary());
  dom.newAssetButton?.addEventListener("click", () => createNewAssetDraft());
  dom.closeAssetLibraryButton?.addEventListener("click", () => toggleAssetLibrary(false));
  dom.assetFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-filter]");
    if (!button) {
      return;
    }
    assetFilterKind = button.dataset.assetFilter;
    renderAssetLibrary();
  });
  dom.assetList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-id]");
    if (!button) {
      return;
    }
    selectedAssetId = button.dataset.assetId;
    renderAssetLibrary();
  });
  dom.assetDetail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-asset-action]");
    if (!button) {
      return;
    }
    handleAssetDetailAction(button.dataset.assetAction);
  });
  dom.assetDetail?.addEventListener("change", (event) => {
    const input = event.target.closest(".asset-file-input");
    if (!input) {
      return;
    }
    const file = input.files?.[0];
    if (file) {
      importAssetFileDraft(file);
    }
  });
}

function installCardStudio() {
  renderCardStudio();
  loadAuthoringStatus();

  dom.cardStudioButton?.addEventListener("click", () => toggleCardStudio());
  dom.closeCardStudioButton?.addEventListener("click", () => toggleCardStudio(false));
  dom.cardTemplateFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-card-filter]");
    if (!button) {
      return;
    }
    cardTemplateFilter = button.dataset.cardFilter;
    renderCardStudio();
  });
  dom.cardTemplateList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-card-template-id]");
    if (!button) {
      return;
    }
    selectedCardTemplateId = button.dataset.cardTemplateId;
    renderCardStudio();
  });
  dom.cardTemplateDetail?.addEventListener("click", (event) => {
    const behaviorButton = event.target.closest("[data-card-behavior-action]");
    if (behaviorButton) {
      handleCardBehaviorAction(behaviorButton.dataset.cardBehaviorAction, behaviorButton);
      return;
    }
    const displayButton = event.target.closest("[data-card-display-action]");
    if (displayButton) {
      handleCardDisplayAction(displayButton.dataset.cardDisplayAction, displayButton);
      return;
    }
    const button = event.target.closest("[data-card-action]");
    if (!button) {
      return;
    }
    handleCardTemplateAction(button.dataset.cardAction);
  });
  dom.cardTemplateDetail?.addEventListener("change", (event) => {
    const minionInput = event.target.closest("[data-minion-field]");
    if (minionInput) {
      updateMinionStudioDraftFromInput(minionInput);
      return;
    }
    const equipmentInput = event.target.closest("[data-equipment-field]");
    if (equipmentInput) {
      updateEquipmentStudioDraftFromInput(equipmentInput);
      return;
    }
    const frameInput = event.target.closest("[data-card-frame-field]");
    if (frameInput) {
      updateCardFrameDraftFromInput(frameInput);
      return;
    }
    const input = event.target.closest("[data-card-display-field]");
    if (!input) {
      return;
    }
    updateCardDisplayDraftFromInput(input);
  });
}

function installPresentationEditor() {
  renderPresentationEditor();

  dom.presentationEditorButton?.addEventListener("click", () => togglePresentationEditor());
  dom.closePresentationEditorButton?.addEventListener("click", () => togglePresentationEditor(false));
  dom.presentationEntryList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-presentation-entry-id]");
    if (!button) {
      return;
    }
    selectedPresentationEntryId = button.dataset.presentationEntryId;
    renderPresentationEditor();
  });
  dom.heroPresentationEditor?.addEventListener("click", (event) => {
    const displayButton = event.target.closest("[data-hero-display-action]");
    if (!displayButton) {
      return;
    }
    handleHeroAbilityDisplayAction(displayButton.dataset.heroDisplayAction, displayButton);
  });
  dom.heroPresentationEditor?.addEventListener("change", (event) => {
    const displayInput = event.target.closest("[data-hero-display-field]");
    if (displayInput) {
      updateHeroAbilityDisplayDraftFromInput(displayInput);
      return;
    }
    const input = event.target.closest("[data-hero-presentation-field]");
    if (input) {
      updateHeroPresentationDraftFromInput(input);
    }
  });
  dom.applyPresentationEntryButton?.addEventListener("click", () => applyPresentationEntryDraft());
  dom.resetPresentationCatalogButton?.addEventListener("click", () => resetPresentationCatalogDraft());
  dom.copyPresentationCatalogButton?.addEventListener("click", async () => {
    const text = JSON.stringify(presentationCatalog ?? authoredPresentationCatalog ?? {}, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setPresentationEditorStatus("Copied presentation catalog JSON.");
    } catch {
      dom.presentationEntryJson?.select();
      setPresentationEditorStatus("Select the JSON field to copy.");
    }
  });
}

function installPreviewPanel() {
  renderPreviewPanel();

  dom.previewPanelButton?.addEventListener("click", () => togglePreviewPanel());
  dom.closePreviewPanelButton?.addEventListener("click", () => togglePreviewPanel(false));
  dom.previewFixtureList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preview-fixture-id]");
    if (!button) {
      return;
    }

    const fixture = previewFixtures().find((candidate) => candidate.id === button.dataset.previewFixtureId);
    if (fixture) {
      applyPreviewFixture(fixture);
    }
  });
}

function togglePreviewPanel(open = !previewPanelOpen) {
  previewPanelOpen = open;
  if (previewPanelOpen) {
    if (layoutEditorOpen) {
      toggleLayoutEditor(false);
    }
    if (assetLibraryOpen) {
      toggleAssetLibrary(false);
    }
    if (cardStudioOpen) {
      toggleCardStudio(false);
    }
    if (presentationEditorOpen) {
      togglePresentationEditor(false);
    }
  }

  hideTooltip();
  dom.previewPanel.hidden = !previewPanelOpen;
  dom.previewPanelButton?.classList.toggle("selected", previewPanelOpen || previewMode);
  renderPreviewPanel();
}

function toggleAssetLibrary(open = !assetLibraryOpen) {
  assetLibraryOpen = open;
  if (assetLibraryOpen) {
    if (layoutEditorOpen) {
      toggleLayoutEditor(false);
    }
    if (previewPanelOpen) {
      togglePreviewPanel(false);
    }
    if (cardStudioOpen) {
      toggleCardStudio(false);
    }
    if (presentationEditorOpen) {
      togglePresentationEditor(false);
    }
  }

  hideTooltip();
  dom.assetLibrary.hidden = !assetLibraryOpen;
  dom.assetLibraryButton?.classList.toggle("selected", assetLibraryOpen);
  if (assetLibraryOpen) {
    loadAuthoringStatus();
  }
  renderAssetLibrary();
  renderCardStudio();
}

function toggleCardStudio(open = !cardStudioOpen) {
  cardStudioOpen = open;
  if (cardStudioOpen) {
    if (layoutEditorOpen) {
      toggleLayoutEditor(false);
    }
    if (previewPanelOpen) {
      togglePreviewPanel(false);
    }
    if (assetLibraryOpen) {
      toggleAssetLibrary(false);
    }
    if (presentationEditorOpen) {
      togglePresentationEditor(false);
    }
  }

  hideTooltip();
  dom.cardStudio.hidden = !cardStudioOpen;
  dom.cardStudioButton?.classList.toggle("selected", cardStudioOpen);
  if (cardStudioOpen) {
    loadAuthoringStatus();
  }
  renderCardStudio();
}

function togglePresentationEditor(open = !presentationEditorOpen) {
  presentationEditorOpen = open;
  if (presentationEditorOpen) {
    if (layoutEditorOpen) {
      toggleLayoutEditor(false);
    }
    if (previewPanelOpen) {
      togglePreviewPanel(false);
    }
    if (assetLibraryOpen) {
      toggleAssetLibrary(false);
    }
    if (cardStudioOpen) {
      toggleCardStudio(false);
    }
  }

  hideTooltip();
  dom.presentationEditor.hidden = !presentationEditorOpen;
  dom.presentationEditorButton?.classList.toggle("selected", presentationEditorOpen);
  renderPresentationEditor();
}

function renderPresentationEditor() {
  if (!dom.presentationEditor) {
    return;
  }

  const entries = presentationEntries();
  if (!selectedPresentationEntryId || !entries.some((entry) => entry.id === selectedPresentationEntryId)) {
    selectedPresentationEntryId = entries[0]?.id ?? "";
  }

  if (dom.presentationEntryCount) {
    dom.presentationEntryCount.textContent = presentationCatalog ? `${entries.length} entries` : "No catalog";
  }
  if (dom.presentationEntryList) {
    dom.presentationEntryList.innerHTML = entries.length > 0
      ? entries.map((entry) => renderPresentationEntryRow(entry)).join("")
      : `<div class="asset-empty">No presentation catalog</div>`;
  }
  const selected = entries.find((entry) => entry.id === selectedPresentationEntryId);
  if (dom.heroPresentationEditor) {
    dom.heroPresentationEditor.innerHTML = selected?.section === "heroes"
      ? renderHeroPresentationEditor(selected.value)
      : "";
  }
  if (dom.presentationEntryJson && document.activeElement !== dom.presentationEntryJson) {
    dom.presentationEntryJson.value = selected ? JSON.stringify(selected.value, null, 2) : "";
  }
}

function renderHeroPresentationEditor(hero) {
  const assets = hero.assets && typeof hero.assets === "object" ? hero.assets : {};
  const layout = hero.layout && typeof hero.layout === "object" ? hero.layout : {};
  const ability = hero.ability && typeof hero.ability === "object" ? hero.ability : {};
  const datalistId = `hero-art-assets-${safeDomId(hero.playerId)}`;
  const behaviorDatalistId = `hero-behaviors-${safeDomId(hero.playerId)}`;

  return `
    <div class="hero-studio-panel">
      <div class="hero-studio-preview">
        ${renderHeroPresentationPreview(hero)}
      </div>
      <div class="hero-studio-controls">
        <div class="card-display-head">
          <div>
            <strong>Hero Studio</strong>
            <span>${escapeHtml(hero.playerId)} · ${escapeHtml(layout.variant ?? "default")}</span>
          </div>
        </div>
        ${renderHeroStudioValidation(hero)}
        <div class="hero-studio-grid">
          <label class="card-frame-field">
            <span>Name</span>
            <input type="text" value="${escapeAttr(hero.name ?? "")}" data-hero-presentation-field="name">
          </label>
          <label class="card-frame-field">
            <span>Title</span>
            <input type="text" value="${escapeAttr(hero.title ?? "")}" data-hero-presentation-field="title">
          </label>
          <label class="card-frame-field wide">
            <span>Art path</span>
            <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.art ?? "")}" data-hero-presentation-field="assets.art">
          </label>
          <label class="card-frame-field wide">
            <span>Frame path</span>
            <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.frame ?? "")}" data-hero-presentation-field="assets.frame">
          </label>
          <label class="card-frame-field">
            <span>Variant</span>
            <input type="text" value="${escapeAttr(layout.variant ?? "")}" data-hero-presentation-field="layout.variant">
          </label>
          <label class="card-frame-field">
            <span>Fit</span>
            <select data-hero-presentation-field="layout.artFit">
              ${renderSelectOptions(["cover", "contain", "fill"], layout.artFit ?? "cover")}
            </select>
          </label>
          ${renderHeroPresentationNumberField("layout.artPositionX", "Art X", layout.artPositionX ?? 50, 0, 100, 1)}
          ${renderHeroPresentationNumberField("layout.artPositionY", "Art Y", layout.artPositionY ?? 50, 0, 100, 1)}
          ${renderHeroPresentationNumberField("layout.artHeight", "Art H", layout.artHeight ?? "", 32, 110, 1)}
        </div>
        <div class="hero-ability-editor">
          <div class="card-display-head">
            <div>
              <strong>Hero Ability</strong>
              <span>${escapeHtml(ability.behaviorId ?? "No behavior")}</span>
            </div>
          </div>
          <div class="hero-studio-grid">
            <label class="card-frame-field">
              <span>Ability</span>
              <input type="text" value="${escapeAttr(ability.name ?? "")}" data-hero-presentation-field="ability.name">
            </label>
            <label class="card-frame-field">
              <span>Action</span>
              <input type="text" value="${escapeAttr(ability.action ?? "")}" data-hero-presentation-field="ability.action">
            </label>
            <label class="card-frame-field">
              <span>Behavior</span>
              <input type="text" list="${escapeAttr(behaviorDatalistId)}" value="${escapeAttr(ability.behaviorId ?? "")}" data-hero-presentation-field="ability.behaviorId">
            </label>
            <label class="card-frame-field">
              <span>Target</span>
              <select data-hero-presentation-field="ability.targetMode">
                ${renderSelectOptions(["enemyHero", "selfHero", "battlefield", "targeted"], ability.targetMode ?? "enemyHero")}
              </select>
            </label>
            ${renderHeroPresentationNumberField("ability.manaCost", "Mana", ability.manaCost ?? 0, 0, 20, 1)}
            <label class="card-frame-field wide">
              <span>Text</span>
              <textarea data-hero-presentation-field="ability.text" rows="3">${escapeHtml(ability.text ?? "")}</textarea>
            </label>
          </div>
        </div>
        ${renderHeroAbilityDisplayEditor(hero)}
        ${renderAssetPathDatalist(datalistId)}
        ${renderHeroBehaviorDatalist(behaviorDatalistId)}
      </div>
    </div>
  `;
}

function renderHeroAbilityDisplayEditor(hero) {
  const ability = hero.ability && typeof hero.ability === "object" ? hero.ability : null;
  const display = Array.isArray(ability?.display) ? ability.display : [];
  const slots = propertyDisplaySlotsForObjectType("hero");
  const icons = propertyDisplayIcons();
  return `
    <div class="hero-ability-display-editor card-display-editor">
      <div class="card-display-head">
        <div>
          <strong>Ability Display</strong>
          <span>${display.length} badge${display.length === 1 ? "" : "s"}</span>
        </div>
        <button class="ghost" type="button" data-hero-display-action="add" ${ability ? "" : "disabled"}>Add Badge</button>
      </div>
      <div class="card-display-rows">
        ${ability
          ? display.length > 0
            ? display.map((property, index) => renderHeroAbilityDisplayRow(property, index, slots, icons)).join("")
            : `<div class="card-display-empty">No ability badges. Add one for hero power cost, cooldown, or status markers.</div>`
          : `<div class="card-display-empty">Add a hero ability before editing ability badges.</div>`}
      </div>
    </div>
  `;
}

function renderHeroAbilityDisplayRow(property, index, slots, icons) {
  return `
    <div class="card-display-row hero-display-row" data-hero-display-index="${index}">
      <label>
        <span>Property</span>
        <input type="text" value="${escapeAttr(property.property ?? "")}" data-hero-display-field="property" data-hero-display-index="${index}">
      </label>
      <label>
        <span>Source</span>
        <select data-hero-display-field="source" data-hero-display-index="${index}">
          ${renderSelectOptionsWithBlank(PROPERTY_DISPLAY_SOURCES, property.source ?? "", "Auto")}
        </select>
      </label>
      <label>
        <span>Slot</span>
        <select data-hero-display-field="slot" data-hero-display-index="${index}">
          ${renderDisplayRegistryOptions(slots, property.slot)}
        </select>
      </label>
      <label>
        <span>Icon</span>
        <select data-hero-display-field="icon" data-hero-display-index="${index}">
          ${renderDisplayRegistryOptions(icons, property.icon, "Auto")}
        </select>
      </label>
      <label>
        <span>Label</span>
        <input type="text" value="${escapeAttr(property.label ?? "")}" data-hero-display-field="label" data-hero-display-index="${index}">
      </label>
      <label>
        <span>Priority</span>
        <input type="number" step="1" value="${escapeAttr(property.priority ?? "")}" data-hero-display-field="priority" data-hero-display-index="${index}">
      </label>
      <button class="ghost" type="button" data-hero-display-action="remove" data-hero-display-index="${index}">Remove</button>
    </div>
  `;
}

function renderHeroStudioValidation(hero) {
  const validation = heroStudioValidation(hero);
  const items = [
    ...validation.errors.map((message) => ({ severity: "error", message })),
    ...validation.warnings.map((message) => ({ severity: "warning", message }))
  ];
  return `
    <div class="card-template-validation hero-studio-validation ${validation.errors.length > 0 ? "error" : validation.warnings.length > 0 ? "warning" : "ok"}">
      <strong>${validation.errors.length > 0 ? "Needs Fix" : validation.warnings.length > 0 ? "Warnings" : "Looks Valid"}</strong>
      ${items.length > 0
        ? items.map((item) => `<span class="${escapeAttr(item.severity)}">${escapeHtml(item.message)}</span>`).join("")
        : `<span>Hero ability and display metadata are ready.</span>`}
    </div>
  `;
}

function renderHeroPresentationNumberField(field, label, value, min, max, step) {
  return `
    <label class="card-frame-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${escapeAttr(min)}"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        value="${escapeAttr(value)}"
        data-hero-presentation-field="${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderHeroBehaviorDatalist(datalistId) {
  const behaviorIds = Object.keys(behaviorSummaryDocument?.behaviors ?? {}).sort();
  return `
    <datalist id="${escapeAttr(datalistId)}">
      ${behaviorIds.map((behaviorId) => `<option value="${escapeAttr(behaviorId)}"></option>`).join("")}
    </datalist>
  `;
}

function renderHeroPresentationPreview(hero) {
  const ability = hero.ability && typeof hero.ability === "object" ? hero.ability : null;
  const health = { current: 10, max: 10 };
  const manaCost = Number(ability?.manaCost ?? 0);
  const mana = { current: Math.max(manaCost, 2), max: Math.max(manaCost, 2) };
  const previewHero = presentationHeroToHeroDef(hero) ?? {
    name: hero.name ?? hero.playerId,
    title: hero.title ?? "Hero",
    art: hero.assets?.art,
    ability
  };
  return `
    <section
      class="hero hero-card hero-studio-card"
      ${heroPresentationStyle(previewHero)}
      data-region-kind="hero"
      tabindex="0"
      aria-label="${escapeAttr(`${previewHero.name}. ${previewHero.title}.`)}"
    >
      ${ability ? renderDisplayProperties({ ...ability, display: ability.display ?? [] }, {}, "hero-ability") : ""}
      <div class="hero-art" aria-hidden="true"></div>
      <div class="hero-title">
        <h2>${escapeHtml(previewHero.name)}</h2>
        <span class="active-badge">Preview</span>
      </div>
      <div class="hero-subtitle">${escapeHtml(previewHero.title)}</div>
      <div class="resource-grid">
        <div class="resource stat-health" data-stat-icon="heart"><span class="meta">Health</span><strong>${health.current}</strong></div>
        <div class="resource stat-mana" data-stat-icon="mana"><span class="meta">Mana</span><strong>${mana.current}/${mana.max}</strong></div>
      </div>
      ${ability ? `
        <div class="hero-ability-text">${renderRulesText(ability.text ?? "")}</div>
        <button class="hero-action" type="button" disabled>${escapeHtml(ability.action ?? "Ability")}</button>
      ` : `<div class="card-display-empty">No hero ability.</div>`}
    </section>
  `;
}

function renderPresentationEntryRow(entry) {
  const selected = entry.id === selectedPresentationEntryId;
  return `
    <button
      class="presentation-row ${selected ? "selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected ? "true" : "false"}"
      data-presentation-entry-id="${escapeAttr(entry.id)}"
    >
      <span class="preview-focus">${escapeHtml(labelFromId(entry.section))}</span>
      <span class="preview-copy">
        <strong>${escapeHtml(entry.key)}</strong>
        <span>${escapeHtml(entry.label)}</span>
      </span>
    </button>
  `;
}

function presentationEntries() {
  const catalog = presentationCatalog;
  if (!catalog || typeof catalog !== "object") {
    return [];
  }

  const entries = [];
  for (const section of ["cards", "equipment", "minions"]) {
    const sectionEntries = Array.isArray(catalog[section]) ? catalog[section] : [];
    sectionEntries.forEach((entry) => {
      if (!entry || typeof entry !== "object" || typeof entry.templateId !== "string") {
        return;
      }
      entries.push({
        id: `${section}:${entry.templateId}`,
        section,
        key: entry.templateId,
        label: entry.name ?? entry.templateId,
        value: entry
      });
    });
  }

  const heroes = Array.isArray(catalog.heroes) ? catalog.heroes : [];
  heroes.forEach((entry) => {
    if (!entry || typeof entry !== "object" || typeof entry.playerId !== "string") {
      return;
    }
    entries.push({
      id: `heroes:${entry.playerId}`,
      section: "heroes",
      key: entry.playerId,
      label: entry.name ?? entry.playerId,
      value: entry
    });
  });

  return entries;
}

function applyPresentationEntryDraft() {
  const selected = presentationEntries().find((entry) => entry.id === selectedPresentationEntryId);
  if (!selected || !presentationCatalog) {
    setPresentationEditorStatus("No presentation entry selected.");
    return;
  }

  try {
    const draft = JSON.parse(dom.presentationEntryJson.value);
    validatePresentationEntryDraft(selected, draft);
    const nextCatalog = replacePresentationEntry(presentationCatalog, selected, draft);
    localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextCatalog));
    applyPresentationCatalog(nextCatalog);
    renderPresentationEditor();
    render();
    setPresentationEditorStatus(`Applied local draft for ${selected.id}.`);
  } catch (error) {
    setPresentationEditorStatus(error instanceof Error ? error.message : "Invalid presentation entry JSON.");
  }
}

function validatePresentationEntryDraft(selected, draft) {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new Error("Presentation entry must be a JSON object.");
  }

  const identityField = selected.section === "heroes" ? "playerId" : "templateId";
  if (draft[identityField] !== selected.key) {
    throw new Error(`Keep ${identityField} as ${selected.key}.`);
  }
  if (typeof draft.name !== "string" || draft.name.length === 0) {
    throw new Error("Presentation entry requires a non-empty name.");
  }
}

function replacePresentationEntry(catalog, selected, draft) {
  const nextCatalog = cloneJson(catalog);
  const entries = Array.isArray(nextCatalog[selected.section]) ? nextCatalog[selected.section] : [];
  const identityField = selected.section === "heroes" ? "playerId" : "templateId";
  const index = entries.findIndex((entry) => entry?.[identityField] === selected.key);
  if (index === -1) {
    throw new Error(`Could not find ${selected.id}.`);
  }
  entries[index] = draft;
  nextCatalog[selected.section] = entries;
  return nextCatalog;
}

function resetPresentationCatalogDraft() {
  if (!authoredPresentationCatalog) {
    setPresentationEditorStatus("No authored presentation catalog loaded.");
    return;
  }

  localStorage.removeItem(PRESENTATION_STORAGE_KEY);
  applyPresentationCatalog(cloneJson(authoredPresentationCatalog));
  renderPresentationEditor();
  render();
  setPresentationEditorStatus("Reset to authored presentation catalog.");
}

function setPresentationEditorStatus(message) {
  if (dom.presentationEditorStatus) {
    dom.presentationEditorStatus.textContent = message;
  }
}

async function loadPreviewFixtures() {
  try {
    const response = await fetch(await resolvePreviewFixturesUrl());
    if (!response.ok) {
      throw new Error(`Preview fixture request failed: ${response.status}`);
    }

    previewFixtureDocument = await response.json();
    renderPreviewPanel();
    setPreviewPanelStatus(`Loaded ${previewFixtures().length} fixtures.`);
  } catch (error) {
    setPreviewPanelStatus(error instanceof Error ? error.message : "Could not load preview fixtures.");
  }
}

function renderPreviewPanel() {
  if (!dom.previewPanel) {
    return;
  }

  const fixtures = previewFixtures();
  if (dom.previewFixtureCount) {
    dom.previewFixtureCount.textContent = previewFixtureDocument ? `${fixtures.length} fixtures` : "Loading";
  }

  if (dom.previewFixtureList) {
    dom.previewFixtureList.innerHTML = fixtures.length > 0
      ? fixtures.map((fixture) => renderPreviewFixtureRow(fixture)).join("")
      : `<div class="asset-empty">No fixtures</div>`;
  }
}

function renderPreviewFixtureRow(fixture) {
  const selected = activePreviewFixture?.id === fixture.id;
  return `
    <button
      class="preview-row ${selected ? "selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected ? "true" : "false"}"
      data-preview-fixture-id="${escapeAttr(fixture.id)}"
    >
      <span class="preview-focus">${escapeHtml(labelFromId(fixture.focus))}</span>
      <span class="preview-copy">
        <strong>${escapeHtml(fixture.label)}</strong>
        <span>${escapeHtml(fixture.description ?? fixture.id)}</span>
      </span>
    </button>
  `;
}

function applyPreviewFixture(fixture) {
  previewMode = true;
  activePreviewFixture = fixture;
  matchId = "";
  selectedAction = null;
  selectedPlayerId = fixture.selectedPlayerId ?? fixture.viewerId ?? "p1";
  state = cloneJson(fixture.state);
  events = cloneJson(fixture.events ?? []);
  togglePreviewPanel(false);
  dom.previewPanelButton?.classList.add("selected");
  render();
}

function previewFixtures() {
  return Array.isArray(previewFixtureDocument?.fixtures) ? previewFixtureDocument.fixtures : [];
}

async function loadCardCatalog() {
  try {
    gameDefinitionDocument = await loadGameDefinitionDocument();
    const response = await fetch(await resolveCardCatalogUrl());
    if (!response.ok) {
      throw new Error(`Card catalog request failed: ${response.status}`);
    }

    authoredCardCatalog = await response.json();
    const draft = loadCardCatalogDraft();
    cardCatalog = draft ?? cloneJson(authoredCardCatalog);
    selectedCardTemplateId = selectedCardTemplateId || firstVisibleCardTemplate()?.templateId || "";
    renderCardStudio();
    setCardStudioStatus(draft ? "Loaded local card catalog draft." : `Loaded ${cardTemplates().length} card templates.`);
  } catch (error) {
    setCardStudioStatus(error instanceof Error ? error.message : "Could not load card catalog.");
  }
}

async function loadGameDefinitionDocument() {
  if (gameDefinitionDocument) {
    return gameDefinitionDocument;
  }

  const response = await fetch(GAME_DEFINITION_URL);
  if (!response.ok) {
    throw new Error(`Game definition request failed: ${response.status}`);
  }
  gameDefinitionDocument = await response.json();
  return gameDefinitionDocument;
}

async function loadLocalizationBundle() {
  try {
    const response = await fetch(LOCALIZATION_URL);
    if (!response.ok) {
      return;
    }
    localizationBundle = await response.json();
    renderCardStudio();
  } catch {
    localizationBundle = null;
  }
}

async function loadBehaviorSummaries() {
  try {
    const response = await fetch(BEHAVIOR_SUMMARY_URL);
    if (!response.ok) {
      throw new Error(`Behavior summary request failed: ${response.status}`);
    }
    behaviorSummaryDocument = await response.json();
    renderCardStudio();
  } catch (error) {
    behaviorSummaryDocument = null;
    setCardStudioStatus(error instanceof Error ? error.message : "Could not load behavior summaries.");
  }
}

async function resolveCardCatalogUrl() {
  try {
    const gameDefinition = await loadGameDefinitionDocument();
    const cardCatalogPath = gameDefinition?.cardCatalog;
    return typeof cardCatalogPath === "string" && cardCatalogPath.length > 0
      ? `${RULESET_BASE_URL}/${cardCatalogPath}`
      : FALLBACK_CARD_CATALOG_URL;
  } catch {
    return FALLBACK_CARD_CATALOG_URL;
  }
}

function renderCardStudio() {
  if (!dom.cardStudio) {
    return;
  }

  const templates = cardTemplates();
  const visibleTemplates = filteredCardTemplates();
  const selected = visibleTemplates.find((template) => template.templateId === selectedCardTemplateId) ?? visibleTemplates[0] ?? null;
  selectedCardTemplateId = selected?.templateId ?? "";

  renderCardTemplateFilters(templates);
  if (dom.cardTemplateCount) {
    dom.cardTemplateCount.textContent = cardCatalog ? `${visibleTemplates.length}/${templates.length} templates` : "Loading";
  }
  if (dom.cardTemplateList) {
    dom.cardTemplateList.innerHTML = visibleTemplates.length > 0
      ? visibleTemplates.map((template) => renderCardTemplateRow(template, template.templateId === selectedCardTemplateId)).join("")
      : `<div class="asset-empty">No templates</div>`;
  }
  if (dom.cardTemplateDetail) {
    dom.cardTemplateDetail.innerHTML = selected ? renderCardTemplateDetail(selected) : `<div class="asset-empty">No selection</div>`;
  }
}

function renderCardTemplateFilters(templates) {
  if (!dom.cardTemplateFilter) {
    return;
  }

  const types = ["all", ...Array.from(new Set(templates.map((template) => template.objectType).filter(Boolean))).sort()];
  if (!types.includes(cardTemplateFilter)) {
    cardTemplateFilter = "all";
  }

  dom.cardTemplateFilter.innerHTML = types.map((type) => {
    const count = type === "all" ? templates.length : templates.filter((template) => template.objectType === type).length;
    return `
      <button
        class="ghost ${cardTemplateFilter === type ? "selected" : ""}"
        type="button"
        role="tab"
        aria-selected="${cardTemplateFilter === type ? "true" : "false"}"
        data-card-filter="${escapeAttr(type)}"
      >${escapeHtml(type === "all" ? "All" : labelFromId(type))} ${count}</button>
    `;
  }).join("");
}

function renderCardTemplateRow(template, selected) {
  const summary = [
    labelFromId(template.objectType),
    template.tags?.slice(0, 2).map(labelFromId).join(", "),
    `${(template.behaviorIds ?? []).length} behaviors`
  ].filter(Boolean).join(" · ");
  const validation = cardTemplateValidation(template);
  return `
    <button
      class="card-template-row ${selected ? "selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected ? "true" : "false"}"
      data-card-template-id="${escapeAttr(template.templateId)}"
    >
      <span class="card-type-chip">${escapeHtml(labelFromId(template.objectType))}</span>
      <span class="asset-row-copy">
        <strong>${escapeHtml(cardTemplateDisplayName(template))}</strong>
        <span>${escapeHtml(summary)}</span>
      </span>
      <span class="card-validation-dot ${validation.errors.length > 0 ? "error" : validation.warnings.length > 0 ? "warning" : "ok"}" aria-hidden="true"></span>
    </button>
  `;
}

function renderCardTemplateDetail(template) {
  const hasDraft = Boolean(localStorage.getItem(CARD_CATALOG_STORAGE_KEY));
  const preview = renderCardTemplatePreview(template);
  const validation = cardTemplateValidation(template);
  return `
    ${preview}
    <div class="card-template-summary">
      <h3>${escapeHtml(cardTemplateDisplayName(template))}</h3>
      <dl class="asset-meta">
        ${renderTemplateMetaRows(template)}
      </dl>
      ${renderTemplateChips("Tags", template.tags)}
      ${renderTemplateChips("Behaviors", template.behaviorIds, (id) => behaviorAvailable(id))}
      ${renderTemplateChips("Assets", template.assetRefs, (id) => assetAvailable(id))}
      ${renderCardTemplateValidation(validation)}
    </div>
    ${renderCardBehaviorSync(template)}
    ${renderMinionStudio(template)}
    ${renderEquipmentStudio(template)}
    ${renderCardFrameEditor(template)}
    ${renderCardDisplayEditor(template)}
    <div class="card-template-editor">
      <div class="asset-editor-head">
        <strong>Template JSON</strong>
        <span>${hasDraft ? "Local draft active" : "Ruleset source"}</span>
      </div>
      <textarea class="card-template-json" spellcheck="false" aria-label="Card template JSON">${escapeHtml(JSON.stringify(template, null, 2))}</textarea>
      ${renderCardCatalogPromotionReview(template)}
      <div class="card-template-actions">
        <button type="button" data-card-action="apply">Apply Template</button>
        <button class="ghost" type="button" data-card-action="promote">Promote Catalog</button>
        <button class="ghost" type="button" data-card-action="copy">Copy Catalog</button>
        <button class="ghost" type="button" data-card-action="reset">Reset</button>
      </div>
    </div>
  `;
}

function renderCardFrameEditor(template) {
  const presentation = presentationEntryForTemplate(template.templateId);
  if (!presentation) {
    return `
      <div class="card-frame-editor missing">
        <div class="card-display-head">
          <div>
            <strong>Frame & Art</strong>
            <span>No presentation entry</span>
          </div>
        </div>
        <div class="card-display-empty">Create a presentation entry before editing art crop or frame assets.</div>
      </div>
    `;
  }

  const assets = presentation.assets && typeof presentation.assets === "object" ? presentation.assets : {};
  const layout = presentation.layout && typeof presentation.layout === "object" ? presentation.layout : {};
  const datalistId = `card-art-assets-${safeDomId(template.templateId)}`;
  return `
    <div class="card-frame-editor">
      <div class="card-display-head">
        <div>
          <strong>Frame & Art</strong>
          <span>${escapeHtml(layout.variant ?? "default")} presentation</span>
        </div>
      </div>
      <div class="card-frame-grid">
        <label class="card-frame-field wide">
          <span>Art path</span>
          <input
            type="text"
            list="${escapeAttr(datalistId)}"
            value="${escapeAttr(assets.art ?? "")}"
            data-card-frame-field="assets.art"
            aria-label="Card art asset path"
          >
        </label>
        <label class="card-frame-field wide">
          <span>Frame path</span>
          <input
            type="text"
            list="${escapeAttr(datalistId)}"
            value="${escapeAttr(assets.frame ?? "")}"
            data-card-frame-field="assets.frame"
            aria-label="Card frame asset path"
          >
        </label>
        <label class="card-frame-field">
          <span>Variant</span>
          <input type="text" value="${escapeAttr(layout.variant ?? "")}" data-card-frame-field="layout.variant">
        </label>
        <label class="card-frame-field">
          <span>Fit</span>
          <select data-card-frame-field="layout.artFit">
            ${renderSelectOptions(["cover", "contain", "fill"], layout.artFit ?? "cover")}
          </select>
        </label>
        ${renderCardFrameNumberField("layout.artPositionX", "Art X", layout.artPositionX ?? 50, 0, 100, 1)}
        ${renderCardFrameNumberField("layout.artPositionY", "Art Y", layout.artPositionY ?? 50, 0, 100, 1)}
        ${renderCardFrameNumberField("layout.artHeight", "Art H", layout.artHeight ?? "", 32, 110, 1)}
      </div>
      ${renderAssetPathDatalist(datalistId)}
    </div>
  `;
}

function renderCardFrameNumberField(field, label, value, min, max, step) {
  return `
    <label class="card-frame-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${escapeAttr(min)}"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        value="${escapeAttr(value)}"
        data-card-frame-field="${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderAssetPathDatalist(datalistId) {
  const paths = Array.from(new Set(
    (assetManifest?.assets ?? [])
      .map((asset) => asset?.publicPath)
      .filter((path) => typeof path === "string" && path.length > 0)
  )).sort();
  return `
    <datalist id="${escapeAttr(datalistId)}">
      ${paths.map((path) => `<option value="${escapeAttr(path)}"></option>`).join("")}
    </datalist>
  `;
}

function updateCardFrameDraftFromInput(input) {
  const selected = currentSelectedCardTemplate();
  if (!selected) {
    setCardStudioStatus("No card template selected.");
    return;
  }
  if (!presentationCatalog) {
    setCardStudioStatus("No presentation catalog loaded.");
    return;
  }

  const nextCatalog = cloneJson(presentationCatalog);
  const entry = findPresentationEntryRecord(nextCatalog, selected.templateId);
  if (!entry) {
    setCardStudioStatus("No presentation entry available for frame and art editing.");
    return;
  }

  setNestedPresentationValue(entry, input.dataset.cardFrameField, cardFrameInputValue(input));
  cleanupPresentationEntry(entry);
  localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextCatalog));
  applyPresentationCatalog(nextCatalog);
  renderPresentationEditor();
  renderCardStudio();
  render();
  setCardStudioStatus(`Updated frame and art presentation for ${selected.templateId}.`);
}

function updateHeroPresentationDraftFromInput(input) {
  const selected = presentationEntries().find((entry) => entry.id === selectedPresentationEntryId);
  if (!selected || selected.section !== "heroes" || !presentationCatalog) {
    setPresentationEditorStatus("No hero presentation entry selected.");
    return;
  }

  const nextCatalog = cloneJson(presentationCatalog);
  const entry = findHeroPresentationEntryRecord(nextCatalog, selected.key);
  if (!entry) {
    setPresentationEditorStatus(`Could not find hero presentation for ${selected.key}.`);
    return;
  }

  setNestedPresentationValue(entry, input.dataset.heroPresentationField, heroPresentationInputValue(input));
  cleanupPresentationEntry(entry);
  localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextCatalog));
  applyPresentationCatalog(nextCatalog);
  renderPresentationEditor();
  render();
  setPresentationEditorStatus(`Updated hero presentation for ${selected.key}.`);
}

function handleHeroAbilityDisplayAction(action, button) {
  const selected = currentSelectedHeroPresentationEntry();
  if (!selected || !presentationCatalog) {
    setPresentationEditorStatus("No hero presentation entry selected.");
    return;
  }

  const draftHero = cloneJson(selected.value);
  const display = ensureHeroAbilityDisplay(draftHero);
  if (!display) {
    setPresentationEditorStatus("No hero ability selected.");
    return;
  }

  if (action === "add") {
    display.push(defaultHeroAbilityDisplayProperty());
    applyHeroPresentationValue(selected, draftHero, `Added ability display badge to ${selected.key}.`);
    return;
  }

  if (action === "remove") {
    const index = Number(button.dataset.heroDisplayIndex);
    if (!Number.isInteger(index) || index < 0 || index >= display.length) {
      setPresentationEditorStatus("No ability display badge selected.");
      return;
    }
    display.splice(index, 1);
    applyHeroPresentationValue(selected, draftHero, `Removed ability display badge from ${selected.key}.`);
  }
}

function updateHeroAbilityDisplayDraftFromInput(input) {
  const selected = currentSelectedHeroPresentationEntry();
  if (!selected || !presentationCatalog) {
    setPresentationEditorStatus("No hero presentation entry selected.");
    return;
  }

  const draftHero = cloneJson(selected.value);
  const display = ensureHeroAbilityDisplay(draftHero);
  if (!display) {
    setPresentationEditorStatus("No hero ability selected.");
    return;
  }

  const index = Number(input.dataset.heroDisplayIndex);
  if (!Number.isInteger(index) || index < 0 || index >= display.length) {
    setPresentationEditorStatus("No ability display badge selected.");
    return;
  }

  const property = display[index];
  const field = input.dataset.heroDisplayField;
  if (field === "priority") {
    if (input.value === "") {
      delete property.priority;
    } else {
      property.priority = Number(input.value);
    }
  } else if (["source", "icon", "label"].includes(field) && input.value === "") {
    delete property[field];
  } else if (field) {
    property[field] = input.value;
  }

  applyHeroPresentationValue(selected, draftHero, `Updated ability display badge for ${selected.key}.`);
}

function currentSelectedHeroPresentationEntry() {
  const selected = presentationEntries().find((entry) => entry.id === selectedPresentationEntryId);
  return selected?.section === "heroes" ? selected : null;
}

function applyHeroPresentationValue(selected, draftHero, message) {
  cleanupPresentationEntry(draftHero);
  const nextCatalog = replacePresentationEntry(presentationCatalog, selected, draftHero);
  localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextCatalog));
  applyPresentationCatalog(nextCatalog);
  renderPresentationEditor();
  render();
  setPresentationEditorStatus(message);
}

function ensureHeroAbilityDisplay(hero) {
  if (!hero.ability || typeof hero.ability !== "object" || Array.isArray(hero.ability)) {
    return null;
  }
  if (!Array.isArray(hero.ability.display)) {
    hero.ability.display = [];
  }
  return hero.ability.display;
}

function defaultHeroAbilityDisplayProperty() {
  return { property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost", priority: 10 };
}

function heroPresentationInputValue(input) {
  if (input.type === "number") {
    if (input.value === "") {
      return undefined;
    }
    const value = Number(input.value);
    return Number.isFinite(value) ? value : undefined;
  }

  const value = input.value.trim();
  const field = input.dataset.heroPresentationField ?? "";
  if (field.startsWith("assets.") || field.startsWith("layout.")) {
    return value ? value : undefined;
  }
  if (field === "ability.text") {
    return input.value;
  }
  return value;
}

function cardFrameInputValue(input) {
  if (input.type === "number") {
    if (input.value === "") {
      return undefined;
    }
    const value = Number(input.value);
    return Number.isFinite(value) ? value : undefined;
  }
  const value = input.value.trim();
  return value ? value : undefined;
}

function setNestedPresentationValue(entry, path, value) {
  if (!path) {
    return;
  }
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((record, key) => {
    if (!record[key] || typeof record[key] !== "object" || Array.isArray(record[key])) {
      record[key] = {};
    }
    return record[key];
  }, entry);
  if (value === undefined) {
    delete target[lastKey];
  } else {
    target[lastKey] = value;
  }
}

function cleanupPresentationEntry(entry) {
  for (const key of ["assets", "layout"]) {
    if (entry[key] && typeof entry[key] === "object" && !Array.isArray(entry[key]) && Object.keys(entry[key]).length === 0) {
      delete entry[key];
    }
  }
}

function renderCardCatalogPromotionReview(template) {
  const hasDraft = Boolean(localStorage.getItem(CARD_CATALOG_STORAGE_KEY));
  const authoredTemplate = authoredCardCatalog?.templates?.find((entry) => entry?.templateId === template.templateId) ?? null;
  const diffRows = cardTemplateDiffRows(authoredTemplate, template);
  const summary = cardCatalogDiffSummary(authoredCardCatalog, cardCatalog);
  const status = authoringStatus ?? { gitAvailable: false, dirty: false, changedFiles: [] };
  const dirtyLabel = status.gitAvailable
    ? (status.dirty ? `${status.changedFiles.length} uncommitted change${status.changedFiles.length === 1 ? "" : "s"}` : "Clean worktree")
    : "Git status unavailable";

  return `
    <div class="asset-promotion-review card-catalog-promotion-review ${hasDraft ? "ready" : "idle"}">
      <div class="asset-review-head">
        <strong>Promotion Review</strong>
        <span class="${status.dirty ? "dirty" : "clean"}">${escapeHtml(dirtyLabel)}</span>
      </div>
      <div class="asset-review-grid">
        <span>Target</span>
        <strong>${escapeHtml(`packages/rulesets/${RULESET_ID}/card-catalog.json`)}</strong>
        <span>Mode</span>
        <strong>${escapeHtml(hasDraft ? "Replace card catalog" : "Waiting for local card catalog draft")}</strong>
        <span>Catalog</span>
        <strong>${escapeHtml(cardCatalogDiffLabel(summary))}</strong>
      </div>
      ${status.dirty ? `<p class="asset-review-warning">Promotion will add more workspace changes on top of the current dirty tree.</p>` : ""}
      ${diffRows.length > 0 ? `
        <div class="asset-diff-list">
          ${diffRows.map((row) => `
            <div>
              <span>${escapeHtml(row.field)}</span>
              <code>${escapeHtml(row.before)}</code>
              <code>${escapeHtml(row.after)}</code>
            </div>
          `).join("")}
        </div>
      ` : `<p class="asset-review-empty">No selected-template field changes yet.</p>`}
    </div>
  `;
}

function cardCatalogDiffSummary(beforeCatalog, afterCatalog) {
  const beforeTemplates = new Map((beforeCatalog?.templates ?? []).map((template) => [template?.templateId, template]).filter(([id]) => typeof id === "string"));
  const afterTemplates = new Map((afterCatalog?.templates ?? []).map((template) => [template?.templateId, template]).filter(([id]) => typeof id === "string"));
  let added = 0;
  let changed = 0;
  let removed = 0;

  afterTemplates.forEach((after, templateId) => {
    const before = beforeTemplates.get(templateId);
    if (!before) {
      added += 1;
    } else if (JSON.stringify(before) !== JSON.stringify(after)) {
      changed += 1;
    }
  });
  beforeTemplates.forEach((_, templateId) => {
    if (!afterTemplates.has(templateId)) {
      removed += 1;
    }
  });

  return { added, changed, removed, total: afterTemplates.size };
}

function cardCatalogDiffLabel(summary) {
  const parts = [
    summary.changed ? `${summary.changed} changed` : "",
    summary.added ? `${summary.added} added` : "",
    summary.removed ? `${summary.removed} removed` : ""
  ].filter(Boolean);
  return parts.length > 0 ? `${parts.join(", ")} / ${summary.total} templates` : `${summary.total} templates unchanged`;
}

function cardTemplateDiffRows(before, after) {
  if (!after) {
    return [];
  }
  const fields = ["version", "objectType", "nameKey", "descriptionKey", "manaCost", "stats", "tags", "behaviorIds", "assetRefs", "display", "metadata"];
  if (!before) {
    return fields
      .filter((field) => after[field] !== undefined)
      .map((field) => ({
        field,
        before: "-",
        after: summarizeCardDiffValue(after[field])
      }));
  }

  return fields
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({
      field,
      before: summarizeCardDiffValue(before[field]),
      after: summarizeCardDiffValue(after[field])
    }));
}

function summarizeCardDiffValue(value) {
  if (value === undefined) {
    return "-";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "[]";
  }
  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function renderCardDisplayEditor(template) {
  const display = template.display && typeof template.display === "object" ? template.display : {};
  const properties = Array.isArray(display.properties) ? display.properties : [];
  const slots = propertyDisplaySlotsForTemplate(template);
  const icons = propertyDisplayIcons();
  return `
    <div class="card-display-editor">
      <div class="card-display-head">
        <div>
          <strong>Property Layout</strong>
          <span>${properties.length} badge${properties.length === 1 ? "" : "s"}</span>
        </div>
        <button class="ghost" type="button" data-card-display-action="add">Add Badge</button>
      </div>
      <label class="card-display-layout-field">
        <span>Layout id</span>
        <input
          type="text"
          value="${escapeAttr(display.layout ?? "")}"
          data-card-display-field="layout"
          aria-label="Card display layout id"
        >
      </label>
      <div class="card-display-rows">
        ${properties.length > 0
          ? properties.map((property, index) => renderCardDisplayRow(property, index, slots, icons)).join("")
          : `<div class="card-display-empty">No property badges. Add one to define a self-contained card display.</div>`}
      </div>
    </div>
  `;
}

function renderEquipmentStudio(template) {
  if (template.objectType !== "equipment") {
    return "";
  }

  const presentation = presentationEntryForTemplate(template.templateId) ?? {};
  const behavior = presentation.behavior && typeof presentation.behavior === "object" ? presentation.behavior : {};
  const assets = presentation.assets && typeof presentation.assets === "object" ? presentation.assets : {};
  const stats = template.stats && typeof template.stats === "object" ? template.stats : {};
  const slot = equipmentSlotValue(template, presentation);
  const replacementMode = equipmentReplacementMode(template);
  const datalistId = `equipment-assets-${safeDomId(template.templateId)}`;
  const behaviorDatalistId = `equipment-behaviors-${safeDomId(template.templateId)}`;

  return `
    <div class="equipment-studio">
      <div class="card-display-head">
        <div>
          <strong>Equipment Studio</strong>
          <span>${escapeHtml(labelFromId(slot))} · ${escapeHtml(replacementModeLabel(replacementMode))}</span>
        </div>
      </div>
      <div class="equipment-studio-grid">
        <label class="card-frame-field">
          <span>Slot</span>
          <select data-equipment-field="slot">
            ${renderSelectOptions(["weapon", "armor", "mount", "treasure", "custom"], slot)}
          </select>
        </label>
        <label class="card-frame-field">
          <span>Replacement</span>
          <select data-equipment-field="metadata.replacementMode">
            ${renderSelectOptions(["replace", "reject", "stack", "custom"], replacementMode)}
          </select>
        </label>
        ${renderEquipmentNumberField("stats.attack", "Attack", stats.attack ?? "", -20, 20, 1)}
        ${renderEquipmentNumberField("stats.durability", "Durability", stats.durability ?? "", 0, 20, 1)}
        <label class="card-frame-field wide">
          <span>Frame path</span>
          <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.frame ?? "")}" data-equipment-field="presentation.assets.frame">
        </label>
        <label class="card-frame-field wide">
          <span>Icon path</span>
          <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.icon ?? "")}" data-equipment-field="presentation.assets.icon">
        </label>
      </div>
      <div class="equipment-action-editor">
        <div class="card-display-head">
          <div>
            <strong>Granted Action</strong>
            <span>${escapeHtml(behavior.behaviorId ?? template.behaviorIds?.[0] ?? "No behavior")}</span>
          </div>
        </div>
        <div class="equipment-studio-grid">
          <label class="card-frame-field">
            <span>Action</span>
            <input type="text" value="${escapeAttr(presentation.action ?? "")}" data-equipment-field="presentation.action">
          </label>
          <label class="card-frame-field">
            <span>Behavior</span>
            <input type="text" list="${escapeAttr(behaviorDatalistId)}" value="${escapeAttr(behavior.behaviorId ?? template.behaviorIds?.[0] ?? "")}" data-equipment-field="behavior.behaviorId">
          </label>
          <label class="card-frame-field">
            <span>Target</span>
            <select data-equipment-field="behavior.targetMode">
              ${renderSelectOptions(["enemyHero", "selfHero", "battlefield", "targeted"], behavior.targetMode ?? "enemyHero")}
            </select>
          </label>
          <label class="card-frame-field">
            <span>Selector</span>
            <input type="text" value="${escapeAttr(behavior.targetSelector ?? "target")}" data-equipment-field="behavior.targetSelector">
          </label>
          <label class="card-frame-field wide">
            <span>Text</span>
            <textarea data-equipment-field="presentation.text" rows="3">${escapeHtml(presentation.text ?? "")}</textarea>
          </label>
        </div>
      </div>
      ${renderAssetPathDatalist(datalistId)}
      ${renderEquipmentBehaviorDatalist(behaviorDatalistId)}
    </div>
  `;
}

function renderEquipmentNumberField(field, label, value, min, max, step) {
  return `
    <label class="card-frame-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${escapeAttr(min)}"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        value="${escapeAttr(value)}"
        data-equipment-field="${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderEquipmentBehaviorDatalist(datalistId) {
  const behaviorIds = Object.keys(behaviorSummaryDocument?.behaviors ?? {}).sort();
  return `
    <datalist id="${escapeAttr(datalistId)}">
      ${behaviorIds.map((behaviorId) => `<option value="${escapeAttr(behaviorId)}"></option>`).join("")}
    </datalist>
  `;
}

function equipmentSlotValue(template, presentation = {}) {
  const metadataSlot = typeof template.metadata?.slotId === "string" ? template.metadata.slotId : "";
  const tagSlot = (template.tags ?? []).find((tag) => ["weapon", "armor", "mount", "treasure"].includes(tag));
  const variant = typeof presentation.layout?.variant === "string" ? presentation.layout.variant : "";
  return metadataSlot || tagSlot || variant || "weapon";
}

function equipmentReplacementMode(template) {
  const value = template.metadata?.replacementMode;
  return typeof value === "string" && value.length > 0 ? value : "replace";
}

function replacementModeLabel(value) {
  if (value === "replace") {
    return "Replaces occupied slot";
  }
  if (value === "reject") {
    return "Requires empty slot";
  }
  if (value === "stack") {
    return "Allows stacked attachments";
  }
  return "Custom replacement";
}

function renderMinionStudio(template) {
  if (template.objectType !== "minion") {
    return "";
  }

  const presentation = presentationEntryForTemplate(template.templateId) ?? {};
  const behavior = presentation.behavior && typeof presentation.behavior === "object" ? presentation.behavior : {};
  const assets = presentation.assets && typeof presentation.assets === "object" ? presentation.assets : {};
  const stats = template.stats && typeof template.stats === "object" ? template.stats : {};
  const kind = minionKindValue(template, presentation);
  const deathTrigger = minionDeathTriggerBehaviorId(template);
  const modifierText = typeof template.metadata?.modifierText === "string" ? template.metadata.modifierText : "";
  const datalistId = `minion-assets-${safeDomId(template.templateId)}`;
  const behaviorDatalistId = `minion-behaviors-${safeDomId(template.templateId)}`;

  return `
    <div class="minion-studio">
      <div class="card-display-head">
        <div>
          <strong>Minion Studio</strong>
          <span>${escapeHtml(labelFromId(kind))} · ${escapeHtml(deathTrigger || "No death trigger")}</span>
        </div>
      </div>
      <div class="minion-studio-grid">
        <label class="card-frame-field">
          <span>Kind</span>
          <select data-minion-field="kind">
            ${renderSelectOptions(["minion", "token", "summon", "companion", "custom"], kind)}
          </select>
        </label>
        <label class="card-frame-field">
          <span>Token</span>
          <input type="text" value="${escapeAttr(template.metadata?.tokenVariant ?? "")}" data-minion-field="metadata.tokenVariant">
        </label>
        ${renderMinionNumberField("stats.attack", "Attack", stats.attack ?? "", -20, 20, 1)}
        ${renderMinionNumberField("stats.health", "Health", stats.health ?? "", 0, 40, 1)}
        <label class="card-frame-field wide">
          <span>Modifier badge</span>
          <input type="text" value="${escapeAttr(modifierText)}" data-minion-field="metadata.modifierText">
        </label>
        <label class="card-frame-field wide">
          <span>Frame path</span>
          <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.frame ?? "")}" data-minion-field="presentation.assets.frame">
        </label>
        <label class="card-frame-field wide">
          <span>Icon path</span>
          <input type="text" list="${escapeAttr(datalistId)}" value="${escapeAttr(assets.icon ?? "")}" data-minion-field="presentation.assets.icon">
        </label>
      </div>
      <div class="minion-action-editor">
        <div class="card-display-head">
          <div>
            <strong>Combat & Triggers</strong>
            <span>${escapeHtml(behavior.behaviorId ?? template.behaviorIds?.[0] ?? "No behavior")}</span>
          </div>
        </div>
        <div class="minion-studio-grid">
          <label class="card-frame-field">
            <span>Action</span>
            <input type="text" value="${escapeAttr(presentation.action ?? "")}" data-minion-field="presentation.action">
          </label>
          <label class="card-frame-field">
            <span>Attack Behavior</span>
            <input type="text" list="${escapeAttr(behaviorDatalistId)}" value="${escapeAttr(behavior.behaviorId ?? template.behaviorIds?.[0] ?? "")}" data-minion-field="behavior.behaviorId">
          </label>
          <label class="card-frame-field">
            <span>Target</span>
            <select data-minion-field="behavior.targetMode">
              ${renderSelectOptions(["enemyHero", "selfHero", "battlefield", "targeted"], behavior.targetMode ?? "enemyHero")}
            </select>
          </label>
          <label class="card-frame-field">
            <span>Selector</span>
            <input type="text" value="${escapeAttr(behavior.targetSelector ?? "target")}" data-minion-field="behavior.targetSelector">
          </label>
          <label class="card-frame-field wide">
            <span>Death Trigger</span>
            <input type="text" list="${escapeAttr(behaviorDatalistId)}" value="${escapeAttr(deathTrigger)}" data-minion-field="deathTriggerBehaviorId">
          </label>
          <label class="card-frame-field wide">
            <span>Text</span>
            <textarea data-minion-field="presentation.text" rows="3">${escapeHtml(presentation.text ?? "")}</textarea>
          </label>
        </div>
      </div>
      ${renderAssetPathDatalist(datalistId)}
      ${renderMinionBehaviorDatalist(behaviorDatalistId)}
    </div>
  `;
}

function renderMinionNumberField(field, label, value, min, max, step) {
  return `
    <label class="card-frame-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${escapeAttr(min)}"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        value="${escapeAttr(value)}"
        data-minion-field="${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderMinionBehaviorDatalist(datalistId) {
  const behaviorIds = Object.keys(behaviorSummaryDocument?.behaviors ?? {}).sort();
  return `
    <datalist id="${escapeAttr(datalistId)}">
      ${behaviorIds.map((behaviorId) => `<option value="${escapeAttr(behaviorId)}"></option>`).join("")}
    </datalist>
  `;
}

function minionKindValue(template, presentation = {}) {
  const metadataKind = typeof template.metadata?.minionKind === "string" ? template.metadata.minionKind : "";
  const tagKind = (template.tags ?? []).find((tag) => ["minion", "token", "summon", "companion", "custom"].includes(tag));
  const variant = typeof presentation.layout?.variant === "string" ? presentation.layout.variant : "";
  return metadataKind || tagKind || variant || "minion";
}

function minionDeathTriggerBehaviorId(template) {
  const metadataTrigger = typeof template.metadata?.deathTriggerBehaviorId === "string" ? template.metadata.deathTriggerBehaviorId : "";
  if (metadataTrigger) {
    return metadataTrigger;
  }
  const behaviorIds = Array.isArray(template.behaviorIds) ? template.behaviorIds : [];
  return behaviorIds.find((behaviorId) => /death/i.test(behaviorId)) ?? "";
}

function renderCardDisplayRow(property, index, slots, icons) {
  return `
    <div class="card-display-row" data-card-display-index="${index}">
      <label>
        <span>Property</span>
        <input type="text" value="${escapeAttr(property.property ?? "")}" data-card-display-field="property" data-card-display-index="${index}">
      </label>
      <label>
        <span>Source</span>
        <select data-card-display-field="source" data-card-display-index="${index}">
          ${renderSelectOptionsWithBlank(PROPERTY_DISPLAY_SOURCES, property.source ?? "", "Auto")}
        </select>
      </label>
      <label>
        <span>Slot</span>
        <select data-card-display-field="slot" data-card-display-index="${index}">
          ${renderDisplayRegistryOptions(slots, property.slot)}
        </select>
      </label>
      <label>
        <span>Icon</span>
        <select data-card-display-field="icon" data-card-display-index="${index}">
          ${renderDisplayRegistryOptions(icons, property.icon, "Auto")}
        </select>
      </label>
      <label>
        <span>Label</span>
        <input type="text" value="${escapeAttr(property.label ?? "")}" data-card-display-field="label" data-card-display-index="${index}">
      </label>
      <label>
        <span>Priority</span>
        <input type="number" step="1" value="${escapeAttr(property.priority ?? "")}" data-card-display-field="priority" data-card-display-index="${index}">
      </label>
      <button class="ghost" type="button" data-card-display-action="remove" data-card-display-index="${index}">Remove</button>
    </div>
  `;
}

function renderSelectOptionsWithBlank(options, selectedValue, blankLabel) {
  const values = selectedValue && !options.includes(selectedValue) ? [selectedValue, ...options] : options;
  return [
    `<option value="" ${selectedValue ? "" : "selected"}>${escapeHtml(blankLabel)}</option>`,
    ...values.map((value) => `<option value="${escapeAttr(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(labelFromId(value))}</option>`)
  ].join("");
}

function renderDisplayRegistryOptions(entries, selectedValue, blankLabel = "") {
  const normalizedEntries = entries.some((entry) => entry.id === selectedValue) || !selectedValue
    ? entries
    : [{ id: selectedValue, label: labelFromId(selectedValue), objectTypes: [] }, ...entries];
  const rendered = normalizedEntries.map((entry) => `
    <option value="${escapeAttr(entry.id)}" ${entry.id === selectedValue ? "selected" : ""}>${escapeHtml(entry.label ?? labelFromId(entry.id))}</option>
  `);
  return blankLabel
    ? [`<option value="" ${selectedValue ? "" : "selected"}>${escapeHtml(blankLabel)}</option>`, ...rendered].join("")
    : rendered.join("");
}

function propertyDisplaySlotsForTemplate(template) {
  return propertyDisplaySlotsForObjectType(template.objectType);
}

function propertyDisplaySlotsForObjectType(objectType) {
  return uniqueDisplayRegistryEntries([
    ...DEFAULT_PROPERTY_DISPLAY_SLOTS,
    ...displayRegistryEntries(boardLayoutDocument?.propertyDisplay?.slots)
  ]).filter((slot) => {
    const objectTypes = Array.isArray(slot.objectTypes) ? slot.objectTypes : [];
    return objectTypes.length === 0 || objectTypes.includes(objectType);
  });
}

function propertyDisplayIcons() {
  return uniqueDisplayRegistryEntries([
    ...DEFAULT_PROPERTY_DISPLAY_ICONS,
    ...displayRegistryEntries(boardLayoutDocument?.propertyDisplay?.icons)
  ]);
}

function displayRegistryEntries(entries) {
  return Array.isArray(entries)
    ? entries
        .filter((entry) => entry && typeof entry === "object" && typeof entry.id === "string" && entry.id.length > 0)
        .map((entry) => ({
          id: entry.id,
          label: typeof entry.label === "string" ? entry.label : labelFromId(entry.id),
          objectTypes: Array.isArray(entry.objectTypes) ? entry.objectTypes.filter((value) => typeof value === "string") : []
        }))
    : [];
}

function uniqueDisplayRegistryEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    return true;
  });
}

function renderCardTemplatePreview(template) {
  const info = cardTemplatePreviewInfo(template);
  const object = {
    id: `preview_${template.templateId}`,
    templateId: template.templateId,
    objectType: template.objectType,
    stats: template.stats,
    counters: template.stats
  };
  const detail = cardDetail(info, object);
  const style = cardPresentationStyle(info);
  return `
    <div class="card-template-preview">
      <article
        class="card disabled-card"
        ${style}
        data-template="${escapeAttr(template.templateId)}"
        data-tooltip-title="${escapeAttr(info.name)}"
        data-tooltip-body="${escapeAttr(cardTemplateTooltip(info, template))}"
        draggable="false"
        tabindex="0"
        aria-label="${escapeAttr(`${info.name}. ${detail}. ${info.text}`)}"
      >
        ${renderDisplayProperties(info, object)}
        <div class="card-art" aria-hidden="true"></div>
        <div>
          <div class="name">${escapeHtml(info.name)}</div>
          <div class="meta">${escapeHtml(detail)}</div>
        </div>
        <div class="text">${renderRulesText(info.text)}</div>
        <button class="card-action" type="button" disabled>${escapeHtml(info.action || "Preview")}</button>
      </article>
    </div>
  `;
}

function cardTemplatePreviewInfo(template) {
  const presentation = presentationEntryForTemplate(template.templateId);
  const display = template.display?.properties ?? presentation?.properties?.display ?? [];
  const layout = presentation?.layout && typeof presentation.layout === "object" ? presentation.layout : {};
  return {
    name: presentation?.name ?? cardTemplateDisplayName(template),
    manaCost: template.manaCost ?? presentation?.properties?.manaCost,
    stats: template.stats ?? presentation?.properties?.stats,
    metadata: { ...metadataFromTemplateTags(template), ...(template.metadata ?? {}) },
    text: presentation?.text ?? labelFromId(template.descriptionKey ?? template.nameKey),
    action: presentation?.action ?? labelFromId(template.behaviorIds?.[0] ?? "Preview"),
    art: presentation?.assets?.art,
    frame: presentation?.assets?.frame,
    artFit: layout.artFit,
    artPositionX: layout.artPositionX,
    artPositionY: layout.artPositionY,
    artHeight: layout.artHeight,
    display
  };
}

function metadataFromTemplateTags(template) {
  const tags = Array.isArray(template.tags) ? template.tags : [];
  const metadata = {};
  const suitTag = tags.find((tag) => tag.startsWith("suit_"));
  const colorTag = tags.find((tag) => tag.startsWith("color_"));
  const roleTag = tags.find((tag) => ["lord", "loyalist", "rebel", "spy"].includes(tag));
  if (suitTag) {
    metadata.suit = suitTag.slice("suit_".length);
  }
  if (colorTag) {
    metadata.color = colorTag.slice("color_".length);
  }
  if (roleTag) {
    metadata.role = roleTag;
  }
  return metadata;
}

function cardTemplateTooltip(info, template) {
  return [
    info.text,
    `Template: ${template.templateId}`,
    `Type: ${labelFromId(template.objectType)}`,
    template.behaviorIds?.length ? `Behaviors: ${template.behaviorIds.join(", ")}` : "",
    template.assetRefs?.length ? `Assets: ${template.assetRefs.join(", ")}` : ""
  ].filter(Boolean).join("\n");
}

function renderTemplateMetaRows(template) {
  const rows = [
    ["ID", template.templateId],
    ["Version", template.version],
    ["Type", labelFromId(template.objectType)],
    ["Name key", template.nameKey],
    ["Cost", template.manaCost],
    ["Stats", template.stats ? Object.entries(template.stats).map(([key, value]) => `${labelFromId(key)} ${value}`).join(", ") : ""],
    ["Display", template.display?.layout]
  ].filter(([, value]) => value !== undefined && value !== "");

  return rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}

function renderTemplateChips(label, values, availability = null) {
  const items = Array.isArray(values) ? values : [];
  return `
    <div class="card-template-chip-group" aria-label="${escapeAttr(label)}">
      <strong>${escapeHtml(label)}</strong>
      <div>
        ${items.length > 0
          ? items.map((value) => {
              const state = availability ? availability(value) : "ok";
              return `<span class="${state === "missing" ? "missing" : ""}">${escapeHtml(value)}</span>`;
            }).join("")
          : `<span class="muted">none</span>`}
      </div>
    </div>
  `;
}

function renderCardTemplateValidation(validation) {
  const rows = [
    ...validation.errors.map((message) => ({ severity: "error", message })),
    ...validation.warnings.map((message) => ({ severity: "warning", message }))
  ];
  return `
    <div class="card-template-validation ${validation.errors.length > 0 ? "error" : validation.warnings.length > 0 ? "warning" : "ok"}">
      <strong>${validation.errors.length > 0 ? "Needs Fix" : validation.warnings.length > 0 ? "Warnings" : "Looks Valid"}</strong>
      ${rows.length > 0
        ? rows.map((row) => `<span class="${escapeAttr(row.severity)}">${escapeHtml(row.message)}</span>`).join("")
        : `<span>Template shape and declared dependencies look valid.</span>`}
    </div>
  `;
}

function renderCardBehaviorSync(template) {
  const behaviorIds = Array.isArray(template.behaviorIds) ? template.behaviorIds : [];
  const presentation = presentationEntryForTemplate(template.templateId);
  const currentText = presentation?.text ?? "";
  const combinedText = combinedBehaviorCanonicalText(behaviorIds);
  const status = behaviorTextSyncStatus(currentText, combinedText, behaviorIds);
  return `
    <div class="card-behavior-sync ${escapeAttr(status.kind)}">
      <div class="card-behavior-head">
        <div>
          <strong>Behavior Sync</strong>
          <span>${escapeHtml(status.label)}</span>
        </div>
        <button
          class="ghost"
          type="button"
          data-card-behavior-action="use-generated-text"
          ${presentation && combinedText ? "" : "disabled"}
        >Use Generated Text</button>
      </div>
      <div class="card-behavior-text-grid">
        <span>Card text</span>
        <p>${currentText ? renderRulesText(currentText) : "No presentation text."}</p>
        <span>Generated</span>
        <p>${combinedText ? renderRulesText(combinedText) : "No behavior text available."}</p>
      </div>
      <div class="card-behavior-list">
        ${behaviorIds.length > 0
          ? behaviorIds.map((behaviorId) => renderBehaviorSyncRow(behaviorId)).join("")
          : `<div class="card-display-empty">No behavior ids declared on this template.</div>`}
      </div>
    </div>
  `;
}

function renderBehaviorSyncRow(behaviorId) {
  const summary = behaviorSummary(behaviorId);
  if (!summary) {
    return `
      <div class="behavior-sync-row missing">
        <div class="behavior-sync-title">
          <strong>${escapeHtml(behaviorId)}</strong>
          <span>Missing behavior summary</span>
        </div>
      </div>
    `;
  }

  const uxHints = summary.uxHints && typeof summary.uxHints === "object" ? summary.uxHints : {};
  const selectorEntries = Object.entries(uxHints.selectors ?? {});
  const effects = Array.isArray(uxHints.effects) ? uxHints.effects : [];
  const issues = Array.isArray(summary.templateIssues) ? summary.templateIssues : [];
  return `
    <div class="behavior-sync-row ${issues.length > 0 ? "warning" : "ok"}">
      <div class="behavior-sync-title">
        <strong>${escapeHtml(behaviorId)}</strong>
        <span>${escapeHtml(labelFromId(summary.kind ?? "behavior"))} · ${escapeHtml(summary.version ?? "0.1.0")}</span>
      </div>
      <p>${renderRulesText(summary.canonicalText ?? "")}</p>
      <div class="behavior-sync-chips">
        ${effects.map((effect) => `<span>${escapeHtml(labelFromId(effect))}</span>`).join("")}
        ${selectorEntries.map(([selectorId, selector]) => `<span>${escapeHtml(selectorSummary(selectorId, selector))}</span>`).join("")}
      </div>
      ${issues.length > 0 ? `
        <div class="behavior-sync-issues">
          ${issues.map((issue) => `<span class="${escapeAttr(issue.severity ?? "warning")}">${escapeHtml(issue.message ?? "Template issue")}</span>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function behaviorSummary(behaviorId) {
  return behaviorSummaryDocument?.behaviors?.[behaviorId] ?? null;
}

function combinedBehaviorCanonicalText(behaviorIds) {
  return behaviorIds
    .map((behaviorId) => behaviorSummary(behaviorId)?.canonicalText)
    .filter((text) => typeof text === "string" && text.length > 0)
    .join(" ");
}

function behaviorTextSyncStatus(currentText, generatedText, behaviorIds) {
  if (!Array.isArray(behaviorIds) || behaviorIds.length === 0) {
    return { kind: "idle", label: "No behavior refs" };
  }
  if (!generatedText) {
    return { kind: "missing", label: "Missing behavior summary" };
  }
  if (!currentText) {
    return { kind: "warning", label: "No card text" };
  }
  return normalizeTextForSync(currentText) === normalizeTextForSync(generatedText)
    ? { kind: "ok", label: "Text matches generated behavior text" }
    : { kind: "warning", label: "Review card text against generated behavior text" };
}

function normalizeTextForSync(text) {
  return String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function selectorSummary(selectorId, selector) {
  const from = selector?.from ? labelFromId(selector.from) : "Target";
  const count = selector?.count && typeof selector.count === "object" ? selector.count : {};
  const min = count.min ?? "?";
  const max = count.max ?? "?";
  return `${selectorId}: ${from} ${min}-${max}`;
}

function handleCardBehaviorAction(action) {
  if (action === "use-generated-text") {
    applyGeneratedBehaviorTextToPresentation();
  }
}

function applyGeneratedBehaviorTextToPresentation() {
  const selected = currentSelectedCardTemplate();
  if (!selected) {
    setCardStudioStatus("No card template selected.");
    return;
  }

  const generatedText = combinedBehaviorCanonicalText(selected.behaviorIds ?? []);
  if (!generatedText) {
    setCardStudioStatus("No generated behavior text available.");
    return;
  }

  const selectedPresentation = presentationEntryForTemplate(selected.templateId);
  if (!selectedPresentation || !presentationCatalog) {
    setCardStudioStatus("No presentation entry available for generated text.");
    return;
  }

  const nextCatalog = cloneJson(presentationCatalog);
  const entry = findPresentationEntryRecord(nextCatalog, selected.templateId);
  if (!entry) {
    setCardStudioStatus("Could not find presentation entry for generated text.");
    return;
  }

  entry.text = generatedText;
  localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextCatalog));
  applyPresentationCatalog(nextCatalog);
  renderPresentationEditor();
  renderCardStudio();
  render();
  setCardStudioStatus(`Applied generated behavior text to ${selected.templateId} presentation draft.`);
}

function findPresentationEntryRecord(catalog, templateId) {
  for (const section of ["cards", "equipment", "minions"]) {
    const entry = (catalog?.[section] ?? []).find((candidate) => candidate?.templateId === templateId);
    if (entry) {
      return entry;
    }
  }
  return null;
}

function findHeroPresentationEntryRecord(catalog, playerId) {
  return (catalog?.heroes ?? []).find((entry) => entry?.playerId === playerId) ?? null;
}

function handleCardTemplateAction(action) {
  if (action === "apply") {
    applyCardTemplateDraft();
  } else if (action === "promote") {
    promoteCardCatalogDraft();
  } else if (action === "copy") {
    copyCardCatalogDraft();
  } else if (action === "reset") {
    resetCardCatalogDraft();
  }
}

function handleCardDisplayAction(action, button) {
  const selected = currentSelectedCardTemplate();
  if (!selected) {
    setCardStudioStatus("No card template selected.");
    return;
  }

  const draftTemplate = cloneJson(selected);
  const display = ensureCardTemplateDisplay(draftTemplate);
  if (action === "add") {
    display.properties.push(defaultCardDisplayProperty(draftTemplate));
    applyCardTemplateValue(selected, draftTemplate, `Added display badge to ${draftTemplate.templateId}.`);
    return;
  }

  if (action === "remove") {
    const index = Number(button.dataset.cardDisplayIndex);
    if (!Number.isInteger(index) || index < 0 || index >= display.properties.length) {
      setCardStudioStatus("No display badge selected.");
      return;
    }
    display.properties.splice(index, 1);
    applyCardTemplateValue(selected, draftTemplate, `Removed display badge from ${draftTemplate.templateId}.`);
  }
}

function updateEquipmentStudioDraftFromInput(input) {
  const selected = currentSelectedCardTemplate();
  if (!selected || selected.objectType !== "equipment" || !cardCatalog) {
    setCardStudioStatus("No equipment template selected.");
    return;
  }

  const field = input.dataset.equipmentField;
  const value = equipmentStudioInputValue(input);
  const draftTemplate = cloneJson(selected);
  const nextCatalog = cloneJson(cardCatalog);
  let nextPresentationCatalog = presentationCatalog ? cloneJson(presentationCatalog) : null;
  let presentationEntry = nextPresentationCatalog ? findPresentationEntryRecord(nextPresentationCatalog, selected.templateId) : null;

  if (field === "slot") {
    setEquipmentSlotDraft(draftTemplate, value || "weapon");
    if (presentationEntry) {
      setNestedPresentationValue(presentationEntry, "layout.variant", value || "weapon");
    }
  } else if (field === "metadata.replacementMode") {
    setEquipmentMetadataValue(draftTemplate, "replacementMode", value || "replace");
  } else if (field?.startsWith("stats.")) {
    setEquipmentStatDraft(draftTemplate, field.slice("stats.".length), value);
    if (presentationEntry) {
      setNestedPresentationValue(presentationEntry, `properties.stats.${field.slice("stats.".length)}`, value);
    }
  } else if (field?.startsWith("presentation.")) {
    if (!presentationEntry) {
      setCardStudioStatus("No presentation entry available for this equipment.");
      return;
    }
    setNestedPresentationValue(presentationEntry, field.slice("presentation.".length), value);
  } else if (field?.startsWith("behavior.")) {
    if (!presentationEntry) {
      setCardStudioStatus("No presentation entry available for this equipment behavior.");
      return;
    }
    const behaviorField = field.slice("behavior.".length);
    setNestedPresentationValue(presentationEntry, `behavior.${behaviorField}`, value);
    if (behaviorField === "behaviorId") {
      setEquipmentBehaviorIdDraft(draftTemplate, value);
    }
  } else {
    return;
  }

  cleanupCardTemplateDraft(draftTemplate);
  validateCardTemplateDraft(selected, draftTemplate);
  const replacedCatalog = replaceCardTemplate(nextCatalog, selected.templateId, draftTemplate);
  validateCardCatalogDraft(replacedCatalog);
  cardCatalog = replacedCatalog;
  localStorage.setItem(CARD_CATALOG_STORAGE_KEY, JSON.stringify(replacedCatalog));
  selectedCardTemplateId = draftTemplate.templateId;

  if (presentationEntry && nextPresentationCatalog) {
    cleanupPresentationEntry(presentationEntry);
    localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextPresentationCatalog));
    applyPresentationCatalog(nextPresentationCatalog);
  }

  renderCardStudio();
  renderPresentationEditor();
  render();
  setCardStudioStatus(`Updated equipment studio field for ${draftTemplate.templateId}.`);
}

function updateMinionStudioDraftFromInput(input) {
  const selected = currentSelectedCardTemplate();
  if (!selected || selected.objectType !== "minion" || !cardCatalog) {
    setCardStudioStatus("No minion template selected.");
    return;
  }

  const field = input.dataset.minionField;
  const value = minionStudioInputValue(input);
  const draftTemplate = cloneJson(selected);
  const nextCatalog = cloneJson(cardCatalog);
  const nextPresentationCatalog = presentationCatalog ? cloneJson(presentationCatalog) : null;
  const presentationEntry = nextPresentationCatalog ? findPresentationEntryRecord(nextPresentationCatalog, selected.templateId) : null;

  if (field === "kind") {
    setMinionKindDraft(draftTemplate, value || "minion");
    if (presentationEntry) {
      setNestedPresentationValue(presentationEntry, "layout.variant", value || "minion");
    }
  } else if (field === "metadata.tokenVariant") {
    setTemplateMetadataValue(draftTemplate, "tokenVariant", value);
  } else if (field === "metadata.modifierText") {
    setTemplateMetadataValue(draftTemplate, "modifierText", value);
    syncMinionModifierDisplay(draftTemplate, value);
    if (presentationEntry) {
      setNestedPresentationValue(presentationEntry, "properties.metadata.modifierText", value);
      syncPresentationModifierDisplay(presentationEntry, value);
    }
  } else if (field === "deathTriggerBehaviorId") {
    setTemplateMetadataValue(draftTemplate, "deathTriggerBehaviorId", value);
    setMinionDeathTriggerDraft(draftTemplate, value);
  } else if (field?.startsWith("stats.")) {
    setTemplateStatDraft(draftTemplate, field.slice("stats.".length), value);
    if (presentationEntry) {
      setNestedPresentationValue(presentationEntry, `properties.stats.${field.slice("stats.".length)}`, value);
    }
  } else if (field?.startsWith("presentation.")) {
    if (!presentationEntry) {
      setCardStudioStatus("No presentation entry available for this minion.");
      return;
    }
    setNestedPresentationValue(presentationEntry, field.slice("presentation.".length), value);
  } else if (field?.startsWith("behavior.")) {
    if (!presentationEntry) {
      setCardStudioStatus("No presentation entry available for this minion behavior.");
      return;
    }
    const behaviorField = field.slice("behavior.".length);
    setNestedPresentationValue(presentationEntry, `behavior.${behaviorField}`, value);
    if (behaviorField === "behaviorId") {
      setPrimaryBehaviorIdDraft(draftTemplate, value);
    }
  } else {
    return;
  }

  cleanupCardTemplateDraft(draftTemplate);
  validateCardTemplateDraft(selected, draftTemplate);
  const replacedCatalog = replaceCardTemplate(nextCatalog, selected.templateId, draftTemplate);
  validateCardCatalogDraft(replacedCatalog);
  cardCatalog = replacedCatalog;
  localStorage.setItem(CARD_CATALOG_STORAGE_KEY, JSON.stringify(replacedCatalog));
  selectedCardTemplateId = draftTemplate.templateId;

  if (presentationEntry && nextPresentationCatalog) {
    cleanupPresentationEntry(presentationEntry);
    localStorage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(nextPresentationCatalog));
    applyPresentationCatalog(nextPresentationCatalog);
  }

  renderCardStudio();
  renderPresentationEditor();
  render();
  setCardStudioStatus(`Updated minion studio field for ${draftTemplate.templateId}.`);
}

function minionStudioInputValue(input) {
  if (input.type === "number") {
    if (input.value === "") {
      return undefined;
    }
    const value = Number(input.value);
    return Number.isFinite(value) ? value : undefined;
  }
  const value = input.value.trim();
  if (input.dataset.minionField === "presentation.text") {
    return input.value;
  }
  return value ? value : undefined;
}

function setMinionKindDraft(template, kind) {
  const normalizedKind = kind || "minion";
  const tags = Array.isArray(template.tags) ? template.tags.filter((tag) => !["minion", "token", "summon", "companion", "custom"].includes(tag)) : [];
  template.tags = uniqueValues([normalizedKind, ...tags]);
  setTemplateMetadataValue(template, "minionKind", normalizedKind);
}

function syncMinionModifierDisplay(template, value) {
  const display = ensureCardTemplateDisplay(template);
  display.properties = display.properties.filter((property) => !(property?.source === "metadata" && property?.property === "modifierText"));
  if (value) {
    display.properties.push({
      property: "modifierText",
      source: "metadata",
      slot: "top-right",
      label: "Modifier",
      priority: 15
    });
  }
}

function syncPresentationModifierDisplay(entry, value) {
  entry.properties = entry.properties && typeof entry.properties === "object" && !Array.isArray(entry.properties)
    ? entry.properties
    : {};
  const display = Array.isArray(entry.properties.display) ? entry.properties.display : [];
  entry.properties.display = display.filter((property) => !(property?.source === "metadata" && property?.property === "modifierText"));
  if (value) {
    entry.properties.display.push({
      property: "modifierText",
      source: "metadata",
      slot: "top-right",
      label: "Modifier"
    });
  }
}

function setMinionDeathTriggerDraft(template, behaviorId) {
  const existing = Array.isArray(template.behaviorIds) ? template.behaviorIds.filter((id) => id && id !== behaviorId) : [];
  const primary = existing.find((id) => !/death/i.test(id)) ?? "minion_attack";
  const rest = existing.filter((id) => id !== primary && !/death/i.test(id));
  template.behaviorIds = behaviorId ? uniqueValues([primary, behaviorId, ...rest]) : uniqueValues([primary, ...rest]);
}

function equipmentStudioInputValue(input) {
  if (input.type === "number") {
    if (input.value === "") {
      return undefined;
    }
    const value = Number(input.value);
    return Number.isFinite(value) ? value : undefined;
  }
  const value = input.value.trim();
  if (input.dataset.equipmentField === "presentation.text") {
    return input.value;
  }
  return value ? value : undefined;
}

function setEquipmentSlotDraft(template, slot) {
  const normalizedSlot = slot || "weapon";
  const tags = Array.isArray(template.tags) ? template.tags.filter((tag) => !["weapon", "armor", "mount", "treasure", "custom"].includes(tag)) : [];
  template.tags = uniqueValues([normalizedSlot, ...tags]);
  setTemplateMetadataValue(template, "slotId", normalizedSlot);
}

function setEquipmentMetadataValue(template, key, value) {
  setTemplateMetadataValue(template, key, value);
}

function setTemplateMetadataValue(template, key, value) {
  if (value === undefined || value === "") {
    if (template.metadata && typeof template.metadata === "object" && !Array.isArray(template.metadata)) {
      delete template.metadata[key];
    }
  } else {
    template.metadata = template.metadata && typeof template.metadata === "object" && !Array.isArray(template.metadata)
      ? template.metadata
      : {};
    template.metadata[key] = value;
  }
}

function setEquipmentStatDraft(template, stat, value) {
  setTemplateStatDraft(template, stat, value);
}

function setTemplateStatDraft(template, stat, value) {
  template.stats = template.stats && typeof template.stats === "object" && !Array.isArray(template.stats) ? template.stats : {};
  if (value === undefined) {
    delete template.stats[stat];
  } else {
    template.stats[stat] = value;
  }
}

function setEquipmentBehaviorIdDraft(template, behaviorId) {
  setPrimaryBehaviorIdDraft(template, behaviorId);
}

function setPrimaryBehaviorIdDraft(template, behaviorId) {
  if (!behaviorId) {
    delete template.behaviorIds;
    return;
  }
  const rest = Array.isArray(template.behaviorIds) ? template.behaviorIds.filter((id) => id !== behaviorId) : [];
  template.behaviorIds = uniqueValues([behaviorId, ...rest]);
}

function cleanupCardTemplateDraft(template) {
  if (template.metadata && typeof template.metadata === "object" && !Array.isArray(template.metadata) && Object.keys(template.metadata).length === 0) {
    delete template.metadata;
  }
  if (template.stats && typeof template.stats === "object" && !Array.isArray(template.stats) && Object.keys(template.stats).length === 0) {
    delete template.stats;
  }
  if (Array.isArray(template.tags) && template.tags.length === 0) {
    delete template.tags;
  }
  if (Array.isArray(template.behaviorIds) && template.behaviorIds.length === 0) {
    delete template.behaviorIds;
  }
}

function updateCardDisplayDraftFromInput(input) {
  const selected = currentSelectedCardTemplate();
  if (!selected) {
    return;
  }

  const draftTemplate = cloneJson(selected);
  const display = ensureCardTemplateDisplay(draftTemplate);
  const field = input.dataset.cardDisplayField;
  if (field === "layout") {
    if (input.value.trim()) {
      display.layout = input.value.trim();
    } else {
      delete display.layout;
    }
    applyCardTemplateValue(selected, draftTemplate, `Updated display layout for ${draftTemplate.templateId}.`);
    return;
  }

  const index = Number(input.dataset.cardDisplayIndex);
  if (!Number.isInteger(index) || index < 0 || index >= display.properties.length) {
    return;
  }
  const property = display.properties[index];
  if (field === "priority") {
    if (input.value === "") {
      delete property.priority;
    } else {
      property.priority = Number(input.value);
    }
  } else if (["source", "icon", "label"].includes(field) && input.value === "") {
    delete property[field];
  } else if (field) {
    property[field] = input.value;
  }

  applyCardTemplateValue(selected, draftTemplate, `Updated display badge for ${draftTemplate.templateId}.`);
}

function ensureCardTemplateDisplay(template) {
  if (!template.display || typeof template.display !== "object" || Array.isArray(template.display)) {
    template.display = {};
  }
  if (!Array.isArray(template.display.properties)) {
    template.display.properties = [];
  }
  return template.display;
}

function defaultCardDisplayProperty(template) {
  const slots = propertyDisplaySlotsForTemplate(template);
  const icons = propertyDisplayIcons();
  if (template.manaCost !== undefined) {
    return { property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost", priority: 10 };
  }
  if (template.stats?.attack !== undefined) {
    return { property: "attack", source: "stats", slot: "bottom-left", icon: "sword", label: "Attack", priority: 20 };
  }
  if (template.stats?.health !== undefined) {
    return { property: "health", source: "stats", slot: "bottom-right", icon: "heart", label: "Health", priority: 30 };
  }
  if (template.stats?.rank !== undefined) {
    return { property: "rank", source: "stats", slot: "suit-point", icon: "rank", label: "Point", priority: 10 };
  }
  if (template.objectType === "identity") {
    return { property: "role", source: "metadata", slot: "role-corner", icon: "faction", label: "Role", priority: 10 };
  }
  return {
    property: "manaCost",
    source: "template",
    slot: slots[0]?.id ?? "top-left",
    icon: icons[0]?.id ?? "mana",
    label: "Property",
    priority: 10
  };
}

function applyCardTemplateDraft() {
  const selected = currentSelectedCardTemplate();
  const textarea = dom.cardTemplateDetail?.querySelector(".card-template-json");
  if (!selected || !cardCatalog || !textarea) {
    setCardStudioStatus("No card template selected.");
    return;
  }

  try {
    const draftTemplate = JSON.parse(textarea.value);
    applyCardTemplateValue(selected, draftTemplate, `Applied local card template draft for ${draftTemplate.templateId}.`);
  } catch (error) {
    setCardStudioStatus(error instanceof Error ? error.message : "Invalid card template JSON.");
  }
}

function applyCardTemplateValue(selected, draftTemplate, message) {
  validateCardTemplateDraft(selected, draftTemplate);
  const nextCatalog = replaceCardTemplate(cardCatalog, selected.templateId, draftTemplate);
  validateCardCatalogDraft(nextCatalog);
  localStorage.setItem(CARD_CATALOG_STORAGE_KEY, JSON.stringify(nextCatalog));
  cardCatalog = nextCatalog;
  selectedCardTemplateId = draftTemplate.templateId;
  renderCardStudio();
  setCardStudioStatus(message);
}

async function promoteCardCatalogDraft() {
  if (!cardCatalog) {
    setCardStudioStatus("No card catalog loaded.");
    return;
  }

  try {
    validateCardCatalogDraft(cardCatalog);
    if (!localStorage.getItem(CARD_CATALOG_STORAGE_KEY)) {
      throw new Error("Promote requires a local card catalog draft.");
    }

    const response = await fetch("/authoring/cards/promote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rulesetId: RULESET_ID,
        catalog: cardCatalog
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? result.error ?? "Card catalog promotion failed.");
    }

    authoredCardCatalog = result.catalog;
    cardCatalog = cloneJson(result.catalog);
    localStorage.removeItem(CARD_CATALOG_STORAGE_KEY);
    selectedCardTemplateId = currentSelectedCardTemplate()?.templateId ?? firstVisibleCardTemplate()?.templateId ?? "";
    renderCardStudio();
    loadAuthoringStatus();
    setCardStudioStatus(`Promoted card catalog to ${result.path}.`);
  } catch (error) {
    setCardStudioStatus(error instanceof Error ? error.message : "Could not promote card catalog draft.");
  }
}

async function copyCardCatalogDraft() {
  if (!cardCatalog) {
    setCardStudioStatus("No card catalog loaded.");
    return;
  }

  const text = JSON.stringify(cardCatalog, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    setCardStudioStatus("Copied card catalog JSON.");
  } catch {
    const textarea = dom.cardTemplateDetail?.querySelector(".card-template-json");
    if (textarea) {
      textarea.value = text;
      textarea.select();
    }
    setCardStudioStatus("Select the JSON field to copy the catalog.");
  }
}

function resetCardCatalogDraft() {
  if (!authoredCardCatalog) {
    setCardStudioStatus("No authored card catalog loaded.");
    return;
  }

  localStorage.removeItem(CARD_CATALOG_STORAGE_KEY);
  cardCatalog = cloneJson(authoredCardCatalog);
  selectedCardTemplateId = currentSelectedCardTemplate()?.templateId ?? firstVisibleCardTemplate()?.templateId ?? "";
  renderCardStudio();
  setCardStudioStatus("Reset to authored card catalog.");
}

function loadCardCatalogDraft() {
  try {
    const stored = localStorage.getItem(CARD_CATALOG_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const draft = JSON.parse(stored);
    validateCardCatalogDraft(draft);
    return draft;
  } catch {
    localStorage.removeItem(CARD_CATALOG_STORAGE_KEY);
    return null;
  }
}

function validateCardCatalogDraft(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new Error("Card catalog must be a JSON object.");
  }
  if (typeof catalog.id !== "string" || catalog.id.length === 0) {
    throw new Error("Card catalog requires a non-empty id.");
  }
  if (typeof catalog.version !== "string" || catalog.version.length === 0) {
    throw new Error("Card catalog requires a non-empty version.");
  }
  if (!Array.isArray(catalog.templates) || catalog.templates.length === 0) {
    throw new Error("Card catalog requires at least one template.");
  }

  const ids = new Set();
  catalog.templates.forEach((template, index) => {
    validateCardTemplateShape(template, `Template ${index + 1}`);
    if (ids.has(template.templateId)) {
      throw new Error(`Duplicate card template id ${template.templateId}.`);
    }
    ids.add(template.templateId);
  });
}

function validateCardTemplateDraft(selected, draftTemplate) {
  validateCardTemplateShape(draftTemplate, "Card template");
  if (draftTemplate.templateId !== selected.templateId) {
    throw new Error(`Keep templateId as ${selected.templateId}.`);
  }
}

function validateCardTemplateShape(template, label) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  Object.keys(template).forEach((key) => {
    if (!CARD_TEMPLATE_ALLOWED_FIELDS.has(key)) {
      throw new Error(`${label} has unsupported field ${key}.`);
    }
  });

  CARD_TEMPLATE_REQUIRED_FIELDS.forEach((field) => {
    if (typeof template[field] !== "string" || template[field].length === 0) {
      throw new Error(`${label} requires non-empty ${field}.`);
    }
  });

  ["descriptionKey"].forEach((field) => {
    if (template[field] !== undefined && (typeof template[field] !== "string" || template[field].length === 0)) {
      throw new Error(`${label} ${field} must be a non-empty string.`);
    }
  });
  ["tags", "behaviorIds", "assetRefs"].forEach((field) => {
    if (template[field] !== undefined && (!Array.isArray(template[field]) || template[field].some((value) => typeof value !== "string" || value.length === 0))) {
      throw new Error(`${label} ${field} must be an array of non-empty strings.`);
    }
  });
  if (template.manaCost !== undefined && (!Number.isInteger(template.manaCost) || template.manaCost < 0)) {
    throw new Error(`${label} manaCost must be a non-negative integer.`);
  }
  if (template.stats !== undefined && (!template.stats || typeof template.stats !== "object" || Array.isArray(template.stats) || Object.values(template.stats).some((value) => typeof value !== "number"))) {
    throw new Error(`${label} stats must be an object of numeric values.`);
  }
  if (template.metadata !== undefined && (!template.metadata || typeof template.metadata !== "object" || Array.isArray(template.metadata))) {
    throw new Error(`${label} metadata must be a JSON object.`);
  }
  validateCardDisplayShape(template.display, label);
}

function validateCardDisplayShape(display, label) {
  if (display === undefined) {
    return;
  }
  if (!display || typeof display !== "object" || Array.isArray(display)) {
    throw new Error(`${label} display must be a JSON object.`);
  }
  if (display.layout !== undefined && (typeof display.layout !== "string" || display.layout.length === 0)) {
    throw new Error(`${label} display.layout must be a non-empty string.`);
  }
  if (display.properties !== undefined && !Array.isArray(display.properties)) {
    throw new Error(`${label} display.properties must be an array.`);
  }
  (display.properties ?? []).forEach((property, index) => {
    if (!property || typeof property !== "object" || Array.isArray(property)) {
      throw new Error(`${label} display property ${index + 1} must be a JSON object.`);
    }
    Object.keys(property).forEach((key) => {
      if (!["property", "source", "slot", "icon", "label", "priority"].includes(key)) {
        throw new Error(`${label} display property ${index + 1} has unsupported field ${key}.`);
      }
    });
    if (typeof property.property !== "string" || property.property.length === 0) {
      throw new Error(`${label} display property ${index + 1} requires property.`);
    }
    if (typeof property.slot !== "string" || property.slot.length === 0) {
      throw new Error(`${label} display property ${index + 1} requires slot.`);
    }
    if (property.source !== undefined && !PROPERTY_DISPLAY_SOURCES.includes(property.source)) {
      throw new Error(`${label} display property ${index + 1} has unsupported source ${property.source}.`);
    }
    ["icon", "label"].forEach((field) => {
      if (property[field] !== undefined && (typeof property[field] !== "string" || property[field].length === 0)) {
        throw new Error(`${label} display property ${index + 1} ${field} must be a non-empty string.`);
      }
    });
    if (property.priority !== undefined && !Number.isInteger(property.priority)) {
      throw new Error(`${label} display property ${index + 1} priority must be an integer.`);
    }
  });
}

function replaceCardTemplate(catalog, templateId, draftTemplate) {
  const nextCatalog = cloneJson(catalog);
  const templates = Array.isArray(nextCatalog.templates) ? nextCatalog.templates : [];
  const index = templates.findIndex((template) => template?.templateId === templateId);
  if (index === -1) {
    throw new Error(`Could not find card template ${templateId}.`);
  }
  templates[index] = draftTemplate;
  nextCatalog.templates = templates;
  return nextCatalog;
}

function cardTemplates() {
  return Array.isArray(cardCatalog?.templates)
    ? cardCatalog.templates.filter((template) => template && typeof template === "object")
    : [];
}

function filteredCardTemplates() {
  const templates = cardTemplates();
  return cardTemplateFilter === "all" ? templates : templates.filter((template) => template.objectType === cardTemplateFilter);
}

function firstVisibleCardTemplate() {
  return filteredCardTemplates()[0] ?? null;
}

function currentSelectedCardTemplate() {
  return cardTemplates().find((template) => template.templateId === selectedCardTemplateId) ?? null;
}

function cardTemplateDisplayName(template) {
  return presentationEntryForTemplate(template.templateId)?.name
    ?? localizationString(template.nameKey)
    ?? labelFromId(template.templateId);
}

function localizationString(key) {
  return typeof key === "string" ? localizationBundle?.strings?.[key] : undefined;
}

function presentationEntryForTemplate(templateId) {
  if (!presentationCatalog || typeof templateId !== "string") {
    return null;
  }
  for (const section of ["cards", "equipment", "minions"]) {
    const found = (presentationCatalog[section] ?? []).find((entry) => entry?.templateId === templateId);
    if (found) {
      return found;
    }
  }
  return null;
}

function heroStudioValidation(hero) {
  const errors = [];
  const warnings = [];
  if (!hero || typeof hero !== "object" || Array.isArray(hero)) {
    return { errors: ["Hero presentation entry must be a JSON object."], warnings };
  }

  if (typeof hero.playerId !== "string" || hero.playerId.length === 0) {
    errors.push("Hero requires playerId.");
  }
  if (typeof hero.name !== "string" || hero.name.length === 0) {
    errors.push("Hero requires a non-empty name.");
  }

  const ability = hero.ability;
  if (!ability || typeof ability !== "object" || Array.isArray(ability)) {
    errors.push("Hero ability is required.");
    return { errors, warnings };
  }

  for (const field of ["name", "behaviorId", "text", "action", "targetMode"]) {
    if (typeof ability[field] !== "string" || ability[field].length === 0) {
      errors.push(`Hero ability requires ${field}.`);
    }
  }
  if (ability.targetMode && !["enemyHero", "selfHero", "battlefield", "targeted"].includes(ability.targetMode)) {
    errors.push(`Hero ability targetMode ${ability.targetMode} is unsupported.`);
  }
  if (ability.manaCost !== undefined && (!Number.isInteger(ability.manaCost) || ability.manaCost < 0)) {
    errors.push("Hero ability manaCost must be a non-negative integer.");
  }
  if (ability.behaviorId && behaviorAvailable(ability.behaviorId) === "missing") {
    warnings.push(`Unknown behavior ${ability.behaviorId}.`);
  }

  addHeroAbilityDisplayValidationIssues(errors, ability.display);
  return { errors, warnings };
}

function addHeroAbilityDisplayValidationIssues(errors, display) {
  if (display === undefined) {
    return;
  }
  if (!Array.isArray(display)) {
    errors.push("Hero ability display must be an array.");
    return;
  }

  const slotIds = new Set(propertyDisplaySlotsForObjectType("hero").map((slot) => slot.id));
  const iconIds = new Set(propertyDisplayIcons().map((icon) => icon.id));
  display.forEach((property, index) => {
    const label = `Hero ability display property ${index + 1}`;
    if (!property || typeof property !== "object" || Array.isArray(property)) {
      errors.push(`${label} must be a JSON object.`);
      return;
    }
    Object.keys(property).forEach((key) => {
      if (!["property", "source", "slot", "icon", "label", "priority"].includes(key)) {
        errors.push(`${label} has unsupported field ${key}.`);
      }
    });
    if (typeof property.property !== "string" || property.property.length === 0) {
      errors.push(`${label} requires property.`);
    }
    if (typeof property.slot !== "string" || property.slot.length === 0) {
      errors.push(`${label} requires slot.`);
    } else if (!slotIds.has(property.slot)) {
      errors.push(`${label} uses unsupported slot ${property.slot}.`);
    }
    if (property.source !== undefined && !PROPERTY_DISPLAY_SOURCES.includes(property.source)) {
      errors.push(`${label} has unsupported source ${property.source}.`);
    }
    if (property.icon !== undefined && (typeof property.icon !== "string" || property.icon.length === 0)) {
      errors.push(`${label} icon must be a non-empty string.`);
    } else if (property.icon && !iconIds.has(property.icon)) {
      errors.push(`${label} uses unsupported icon ${property.icon}.`);
    }
    if (property.label !== undefined && (typeof property.label !== "string" || property.label.length === 0)) {
      errors.push(`${label} label must be a non-empty string.`);
    }
    if (property.priority !== undefined && !Number.isInteger(property.priority)) {
      errors.push(`${label} priority must be an integer.`);
    }
  });
}

function cardTemplateValidation(template) {
  const errors = [];
  const warnings = [];
  try {
    validateCardTemplateShape(template, `Template ${template.templateId ?? "unknown"}`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Template shape is invalid.");
  }

  (template.behaviorIds ?? []).forEach((behaviorId) => {
    if (behaviorAvailable(behaviorId) === "missing") {
      warnings.push(`Unknown behavior ${behaviorId}.`);
    }
  });
  (template.assetRefs ?? []).forEach((assetId) => {
    if (assetAvailable(assetId) === "missing") {
      warnings.push(`Unknown asset ${assetId}.`);
    }
  });

  return { errors, warnings };
}

function behaviorAvailable(behaviorId) {
  const behaviors = Array.isArray(gameDefinitionDocument?.behaviors) ? gameDefinitionDocument.behaviors : [];
  return behaviors.length === 0 || behaviors.includes(behaviorId) ? "ok" : "missing";
}

function assetAvailable(assetId) {
  const assets = Array.isArray(assetManifest?.assets) ? assetManifest.assets : [];
  return assets.length === 0 || assets.some((asset) => asset?.assetId === assetId) ? "ok" : "missing";
}

function setCardStudioStatus(message) {
  if (dom.cardStudioStatus) {
    dom.cardStudioStatus.textContent = message;
  }
}

async function loadAssetManifest() {
  try {
    const response = await fetch(ASSET_MANIFEST_URL);
    if (!response.ok) {
      throw new Error(`Asset manifest request failed: ${response.status}`);
    }

    authoredAssetManifest = await response.json();
    const draft = loadAssetManifestDraft();
    assetManifest = draft ?? cloneJson(authoredAssetManifest);
    assetUsageIndex = buildAssetUsageIndex();
    selectedAssetId = selectedAssetId || firstVisibleAsset()?.assetId || "";
    renderAssetLibrary();
    renderCardStudio();
    setAssetLibraryStatus(draft ? "Loaded local asset manifest draft." : `Loaded ${assetManifest.assets?.length ?? 0} assets.`);
  } catch (error) {
    setAssetLibraryStatus(error instanceof Error ? error.message : "Could not load asset manifest.");
  }
}

async function loadAuthoringStatus() {
  try {
    const response = await fetch("/authoring/status");
    if (!response.ok) {
      throw new Error(`Authoring status request failed: ${response.status}`);
    }
    authoringStatus = await response.json();
  } catch (error) {
    authoringStatus = {
      gitAvailable: false,
      dirty: false,
      changedFiles: [],
      message: error instanceof Error ? error.message : "Could not load authoring status."
    };
  }
  renderAssetLibrary();
}

function renderAssetLibrary() {
  if (!dom.assetLibrary) {
    return;
  }

  const assets = assetManifest?.assets ?? [];
  const visibleAssets = filteredAssets();
  const selected = visibleAssets.find((asset) => asset.assetId === selectedAssetId) ?? visibleAssets[0] ?? null;
  selectedAssetId = selected?.assetId ?? "";

  renderAssetFilters(assets);
  if (dom.assetCount) {
    dom.assetCount.textContent = assetManifest ? `${visibleAssets.length}/${assets.length} assets` : "Loading";
  }

  if (dom.assetList) {
    dom.assetList.innerHTML = visibleAssets.length > 0
      ? visibleAssets.map((asset) => renderAssetRow(asset, asset.assetId === selectedAssetId)).join("")
      : `<div class="asset-empty">No assets</div>`;
  }

  if (dom.assetDetail) {
    dom.assetDetail.innerHTML = selected ? renderAssetDetail(selected) : `<div class="asset-empty">No selection</div>`;
  }
}

function createNewAssetDraft() {
  if (!assetManifest) {
    setAssetLibraryStatus("No asset manifest loaded.");
    return;
  }

  const assetId = uniqueAssetId("new-card-art");
  const asset = {
    assetId,
    version: "0.1.0",
    kind: "card_art",
    contentHash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    sourceUri: `memory://${RULESET_ID}/draft/${assetId}`,
    license: "first-party-dev",
    owner: "millet",
    mediaType: "image/png",
    usage: ["new asset draft"]
  };
  const nextManifest = cloneJson(assetManifest);
  nextManifest.assets = [...(Array.isArray(nextManifest.assets) ? nextManifest.assets : []), asset];
  validateAssetManifestDraft(nextManifest);
  localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(nextManifest));
  assetManifest = nextManifest;
  assetUsageIndex = buildAssetUsageIndex();
  assetFilterKind = "all";
  selectedAssetId = assetId;
  renderAssetLibrary();
  setAssetLibraryStatus(`Created local asset draft ${assetId}. Import a file before promoting.`);
}

function uniqueAssetId(baseId) {
  const ids = new Set((assetManifest?.assets ?? []).map((asset) => asset.assetId));
  let candidate = baseId;
  let suffix = 2;
  while (ids.has(candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function renderAssetFilters(assets) {
  if (!dom.assetFilter) {
    return;
  }

  const kinds = ["all", ...Array.from(new Set(assets.map((asset) => asset.kind).filter(Boolean))).sort()];
  if (!kinds.includes(assetFilterKind)) {
    assetFilterKind = "all";
  }

  dom.assetFilter.innerHTML = kinds
    .map((kind) => {
      const count = kind === "all" ? assets.length : assets.filter((asset) => asset.kind === kind).length;
      const label = kind === "all" ? "All" : labelFromId(kind);
      return `
        <button
          class="ghost ${assetFilterKind === kind ? "selected" : ""}"
          type="button"
          role="tab"
          aria-selected="${assetFilterKind === kind ? "true" : "false"}"
          data-asset-filter="${escapeAttr(kind)}"
        >${escapeHtml(label)} ${count}</button>
      `;
    })
    .join("");
}

function renderAssetRow(asset, selected) {
  const usageCount = assetUsageIndex[asset.assetId]?.length ?? 0;
  const thumb = asset.publicPath
    ? `<span class="asset-thumb" style="--asset-thumb: url('${escapeHtml(asset.publicPath)}')" aria-hidden="true"></span>`
    : `<span class="asset-thumb no-preview" aria-hidden="true"></span>`;
  return `
    <button
      class="asset-row ${selected ? "selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected ? "true" : "false"}"
      data-asset-id="${escapeAttr(asset.assetId)}"
    >
      ${thumb}
      <span class="asset-row-copy">
        <strong>${escapeHtml(asset.assetId)}</strong>
        <span>${escapeHtml(labelFromId(asset.kind))} · ${asset.width ?? "?"}x${asset.height ?? "?"} · ${usageCount}</span>
      </span>
    </button>
  `;
}

function renderAssetDetail(asset) {
  const usage = assetUsageIndex[asset.assetId] ?? [];
  const hasDraft = Boolean(localStorage.getItem(ASSET_STORAGE_KEY));
  const promotionReview = renderAssetPromotionReview(asset);
  const preview = asset.publicPath
    ? `<div class="asset-preview"><img src="${escapeAttr(asset.publicPath)}" alt="${escapeAttr(asset.assetId)} preview"></div>`
    : `<div class="asset-preview no-preview">No preview</div>`;
  const hash = typeof asset.contentHash === "string" ? `${asset.contentHash.slice(0, 18)}...${asset.contentHash.slice(-8)}` : "";
  const rows = [
    ["Kind", labelFromId(asset.kind)],
    ["Size", asset.width && asset.height ? `${asset.width} x ${asset.height}` : ""],
    ["Frames", asset.frameCount],
    ["Path", asset.publicPath],
    ["Hash", hash],
    ["License", asset.license],
    ["Gen", asset.generationId]
  ].filter(([, value]) => value !== undefined && value !== "");

  return `
    ${preview}
    <div class="asset-detail-copy">
      <h3>${escapeHtml(asset.assetId)}</h3>
      <dl class="asset-meta">
        ${rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
      <div class="asset-usage">
        ${usage.length > 0 ? usage.map((item) => `<span>${escapeHtml(item)}</span>`).join("") : `<span>unused</span>`}
      </div>
      ${asset.prompt ? `<p class="asset-prompt">${escapeHtml(asset.prompt)}</p>` : ""}
    </div>
    <div class="asset-entry-editor">
      <div class="asset-editor-head">
        <strong>Manifest Entry</strong>
        <span>${hasDraft ? "Local draft active" : "Ruleset source"}</span>
      </div>
      <textarea class="asset-entry-json" spellcheck="false" aria-label="Asset manifest entry JSON">${escapeHtml(JSON.stringify(asset, null, 2))}</textarea>
      ${promotionReview}
      <div class="asset-editor-actions">
        <button type="button" data-asset-action="apply">Apply Entry</button>
        <label class="asset-import-button">
          <input class="asset-file-input" type="file" accept="image/*" aria-label="Import image file for selected asset">
          <span>Import File</span>
        </label>
        <button class="ghost" type="button" data-asset-action="promote">Promote</button>
        <button class="ghost" type="button" data-asset-action="copy">Copy Manifest</button>
        <button class="ghost" type="button" data-asset-action="reset">Reset</button>
      </div>
    </div>
  `;
}

function renderAssetPromotionReview(asset) {
  const authored = authoredAssetManifest?.assets?.find((entry) => entry?.assetId === asset.assetId) ?? null;
  const targetPath = promotedAssetTargetPath(asset);
  const diffRows = assetDiffRows(authored, asset);
  const status = authoringStatus ?? { gitAvailable: false, dirty: false, changedFiles: [] };
  const importedDraft = typeof asset.publicPath === "string" && asset.publicPath.startsWith("data:");
  const dirtyLabel = status.gitAvailable
    ? (status.dirty ? `${status.changedFiles.length} uncommitted change${status.changedFiles.length === 1 ? "" : "s"}` : "Clean worktree")
    : "Git status unavailable";

  return `
    <div class="asset-promotion-review ${importedDraft ? "ready" : "idle"}">
      <div class="asset-review-head">
        <strong>Promotion Review</strong>
        <span class="${status.dirty ? "dirty" : "clean"}">${escapeHtml(dirtyLabel)}</span>
      </div>
      <div class="asset-review-grid">
        <span>Target</span>
        <strong>${escapeHtml(targetPath ?? "Import a file to preview target path")}</strong>
        <span>Mode</span>
        <strong>${escapeHtml(importedDraft ? `${authored ? "Replace existing asset entry" : "Create new asset entry"}` : "Waiting for imported data URL draft")}</strong>
      </div>
      ${status.dirty ? `<p class="asset-review-warning">Promotion will add more workspace changes on top of the current dirty tree.</p>` : ""}
      ${diffRows.length > 0 ? `
        <div class="asset-diff-list">
          ${diffRows.map((row) => `
            <div>
              <span>${escapeHtml(row.field)}</span>
              <code>${escapeHtml(row.before)}</code>
              <code>${escapeHtml(row.after)}</code>
            </div>
          `).join("")}
        </div>
      ` : `<p class="asset-review-empty">No manifest field changes yet.</p>`}
    </div>
  `;
}

function promotedAssetTargetPath(asset) {
  const extension = assetExtensionForMediaType(asset.mediaType);
  return extension ? `/assets/imported/${RULESET_ID}/${asset.assetId}.${extension}` : "";
}

function assetExtensionForMediaType(mediaType) {
  if (mediaType === "image/png") {
    return "png";
  }
  if (mediaType === "image/jpeg") {
    return "jpg";
  }
  if (mediaType === "image/webp") {
    return "webp";
  }
  return "";
}

function assetDiffRows(before, after) {
  if (!after) {
    return [];
  }
  if (!before) {
    return ["assetId", "kind", "contentHash", "sourceUri", "publicPath", "mediaType", "width", "height", "usage"]
      .filter((field) => after[field] !== undefined)
      .map((field) => ({
        field,
        before: "-",
        after: summarizeAssetValue(after[field])
      }));
  }

  return ["contentHash", "sourceUri", "publicPath", "mediaType", "width", "height", "usage"]
    .filter((field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]))
    .map((field) => ({
      field,
      before: summarizeAssetValue(before[field]),
      after: summarizeAssetValue(after[field])
    }));
}

function summarizeAssetValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "string" && value.startsWith("data:")) {
    return `${value.slice(0, 28)}...`;
  }
  if (value === undefined) {
    return "-";
  }
  return String(value);
}

function handleAssetDetailAction(action) {
  if (action === "apply") {
    applyAssetEntryDraft();
  } else if (action === "promote") {
    promoteAssetEntryDraft();
  } else if (action === "copy") {
    copyAssetManifestDraft();
  } else if (action === "reset") {
    resetAssetManifestDraft();
  }
}

function applyAssetEntryDraft() {
  const selected = currentSelectedAsset();
  const textarea = dom.assetDetail?.querySelector(".asset-entry-json");
  if (!selected || !assetManifest || !textarea) {
    setAssetLibraryStatus("No asset entry selected.");
    return;
  }

  try {
    const draftEntry = JSON.parse(textarea.value);
    applyAssetEntryValue(selected, draftEntry, `Applied local asset draft for ${draftEntry.assetId}.`);
  } catch (error) {
    setAssetLibraryStatus(error instanceof Error ? error.message : "Invalid asset entry JSON.");
  }
}

function applyAssetEntryValue(selected, draftEntry, message) {
  validateAssetEntryDraft(selected, draftEntry);
  const nextManifest = replaceAssetEntry(assetManifest, selected.assetId, draftEntry);
  validateAssetManifestDraft(nextManifest);
  localStorage.setItem(ASSET_STORAGE_KEY, JSON.stringify(nextManifest));
  assetManifest = nextManifest;
  assetUsageIndex = buildAssetUsageIndex();
  selectedAssetId = draftEntry.assetId;
  renderAssetLibrary();
  setAssetLibraryStatus(message);
}

async function importAssetFileDraft(file) {
  const selected = currentSelectedAsset();
  const textarea = dom.assetDetail?.querySelector(".asset-entry-json");
  if (!selected || !assetManifest || !textarea) {
    setAssetLibraryStatus("No asset entry selected.");
    return;
  }

  if (file.size > ASSET_IMPORT_MAX_BYTES) {
    setAssetLibraryStatus(`Import draft is limited to ${Math.round(ASSET_IMPORT_MAX_BYTES / 1024 / 1024)} MB.`);
    return;
  }

  try {
    const [arrayBuffer, dataUrl] = await Promise.all([
      file.arrayBuffer(),
      readFileAsDataUrl(file)
    ]);
    const dimensions = await readImageDimensions(dataUrl);
    const draftEntry = JSON.parse(textarea.value);
    draftEntry.sourceUri = `local-file://${encodeURIComponent(file.name)}`;
    draftEntry.publicPath = dataUrl;
    draftEntry.mediaType = file.type || "application/octet-stream";
    draftEntry.contentHash = await sha256Hex(arrayBuffer);
    if (dimensions) {
      draftEntry.width = dimensions.width;
      draftEntry.height = dimensions.height;
    }
    draftEntry.usage = Array.from(new Set([...(Array.isArray(draftEntry.usage) ? draftEntry.usage : []), "local imported draft"]));
    applyAssetEntryValue(selected, draftEntry, `Imported ${file.name} into local asset draft.`);
  } catch (error) {
    setAssetLibraryStatus(error instanceof Error ? error.message : "Could not import asset file.");
  }
}

async function promoteAssetEntryDraft() {
  const selected = currentSelectedAsset();
  const textarea = dom.assetDetail?.querySelector(".asset-entry-json");
  if (!selected || !textarea) {
    setAssetLibraryStatus("No asset entry selected.");
    return;
  }

  try {
    const draftEntry = JSON.parse(textarea.value);
    validateAssetEntryDraft(selected, draftEntry);
    if (typeof draftEntry.publicPath !== "string" || !draftEntry.publicPath.startsWith("data:")) {
      throw new Error("Promote requires an imported data URL draft.");
    }

    const response = await fetch("/authoring/assets/promote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rulesetId: RULESET_ID,
        mode: authoredAssetManifest?.assets?.some((asset) => asset?.assetId === draftEntry.assetId) ? "replace" : "create",
        entry: draftEntry
      })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message ?? result.error ?? "Asset promotion failed.");
    }

    authoredAssetManifest = result.manifest;
    assetManifest = cloneJson(result.manifest);
    localStorage.removeItem(ASSET_STORAGE_KEY);
    assetUsageIndex = buildAssetUsageIndex();
    selectedAssetId = result.asset?.assetId ?? selected.assetId;
    renderAssetLibrary();
    loadAuthoringStatus();
    setAssetLibraryStatus(`Promoted ${selectedAssetId} to ${result.publicPath}.`);
  } catch (error) {
    setAssetLibraryStatus(error instanceof Error ? error.message : "Could not promote asset draft.");
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result ?? "")));
    reader.addEventListener("error", () => reject(new Error("Could not read asset file.")));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => resolve({ width: image.naturalWidth, height: image.naturalHeight }));
    image.addEventListener("error", () => resolve(null));
    image.src = dataUrl;
  });
}

async function sha256Hex(arrayBuffer) {
  const hash = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return `sha256:${Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function copyAssetManifestDraft() {
  if (!assetManifest) {
    setAssetLibraryStatus("No asset manifest loaded.");
    return;
  }

  const text = JSON.stringify(assetManifest, null, 2);
  try {
    await navigator.clipboard.writeText(text);
    setAssetLibraryStatus("Copied asset manifest JSON.");
  } catch {
    const textarea = dom.assetDetail?.querySelector(".asset-entry-json");
    if (textarea) {
      textarea.value = text;
      textarea.select();
    }
    setAssetLibraryStatus("Select the JSON field to copy the manifest.");
  }
}

function resetAssetManifestDraft() {
  if (!authoredAssetManifest) {
    setAssetLibraryStatus("No authored asset manifest loaded.");
    return;
  }

  localStorage.removeItem(ASSET_STORAGE_KEY);
  assetManifest = cloneJson(authoredAssetManifest);
  assetUsageIndex = buildAssetUsageIndex();
  selectedAssetId = currentSelectedAsset()?.assetId ?? firstVisibleAsset()?.assetId ?? "";
  renderAssetLibrary();
  setAssetLibraryStatus("Reset to authored asset manifest.");
}

function loadAssetManifestDraft() {
  try {
    const stored = localStorage.getItem(ASSET_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const draft = JSON.parse(stored);
    validateAssetManifestDraft(draft);
    return draft;
  } catch {
    localStorage.removeItem(ASSET_STORAGE_KEY);
    return null;
  }
}

function replaceAssetEntry(manifest, assetId, draftEntry) {
  const nextManifest = cloneJson(manifest);
  const assets = Array.isArray(nextManifest.assets) ? nextManifest.assets : [];
  const index = assets.findIndex((asset) => asset?.assetId === assetId);
  if (index === -1) {
    throw new Error(`Could not find asset ${assetId}.`);
  }
  assets[index] = draftEntry;
  nextManifest.assets = assets;
  return nextManifest;
}

function currentSelectedAsset() {
  const assets = assetManifest?.assets ?? [];
  return assets.find((asset) => asset.assetId === selectedAssetId) ?? null;
}

function validateAssetManifestDraft(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("Asset manifest must be a JSON object.");
  }
  if (typeof manifest.id !== "string" || manifest.id.length === 0) {
    throw new Error("Asset manifest requires a non-empty id.");
  }
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error("Asset manifest requires a non-empty version.");
  }
  if (!Array.isArray(manifest.assets)) {
    throw new Error("Asset manifest requires an assets array.");
  }

  const ids = new Set();
  manifest.assets.forEach((asset, index) => {
    validateAssetEntryShape(asset, `Asset ${index + 1}`);
    if (ids.has(asset.assetId)) {
      throw new Error(`Duplicate asset id ${asset.assetId}.`);
    }
    ids.add(asset.assetId);
  });
}

function validateAssetEntryDraft(selected, draftEntry) {
  validateAssetEntryShape(draftEntry, "Asset entry");
  if (draftEntry.assetId !== selected.assetId) {
    throw new Error(`Keep assetId as ${selected.assetId}.`);
  }
}

function validateAssetEntryShape(entry, label) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  Object.keys(entry).forEach((key) => {
    if (!ASSET_ALLOWED_FIELDS.has(key)) {
      throw new Error(`${label} has unsupported field ${key}.`);
    }
  });

  ASSET_REQUIRED_FIELDS.forEach((field) => {
    if (typeof entry[field] !== "string" || entry[field].length === 0) {
      throw new Error(`${label} requires non-empty ${field}.`);
    }
  });

  if (!/^sha256:[a-f0-9]{64}$/.test(entry.contentHash)) {
    throw new Error(`${label} contentHash must be sha256 plus 64 lowercase hex characters.`);
  }

  ["width", "height", "durationMs", "frameCount"].forEach((field) => {
    if (entry[field] !== undefined && (!Number.isInteger(entry[field]) || entry[field] < 1)) {
      throw new Error(`${label} ${field} must be a positive integer.`);
    }
  });

  if (entry.usage !== undefined && (!Array.isArray(entry.usage) || entry.usage.some((item) => typeof item !== "string" || item.length === 0))) {
    throw new Error(`${label} usage must be an array of non-empty strings.`);
  }

  ASSET_OPTIONAL_FIELDS
    .filter((field) => !["width", "height", "durationMs", "frameCount", "usage"].includes(field))
    .forEach((field) => {
      if (entry[field] !== undefined && (typeof entry[field] !== "string" || entry[field].length === 0)) {
        throw new Error(`${label} ${field} must be a non-empty string.`);
      }
    });
}

function filteredAssets() {
  const assets = assetManifest?.assets ?? [];
  return assetFilterKind === "all" ? assets : assets.filter((asset) => asset.kind === assetFilterKind);
}

function firstVisibleAsset() {
  return filteredAssets()[0] ?? null;
}

function buildAssetUsageIndex() {
  const index = {};
  const assets = assetManifest?.assets ?? [];
  const byPublicPath = new Map(assets.filter((asset) => asset.publicPath).map((asset) => [asset.publicPath, asset]));

  assets.forEach((asset) => {
    (asset.usage ?? []).forEach((usage) => addAssetUsage(index, asset.assetId, usage));
  });

  collectPresentationAssetUsage(index, byPublicPath);
  collectEffectAssetUsage(index, byPublicPath);
  addAssetUsageForPath(index, byPublicPath, "/assets/ember-duel-board.png", "demo background");

  return Object.fromEntries(
    Object.entries(index).map(([assetId, usages]) => [assetId, Array.from(new Set(usages)).sort()])
  );
}

function collectPresentationAssetUsage(index, byPublicPath) {
  if (!presentationCatalog) {
    return;
  }

  [
    ["cards", "card"],
    ["equipment", "equipment"],
    ["minions", "minion"]
  ].forEach(([section, label]) => {
    (presentationCatalog[section] ?? []).forEach((entry) => {
      Object.entries(entry.assets ?? {}).forEach(([role, path]) => {
        addAssetUsageForPath(index, byPublicPath, path, `${label} ${entry.templateId} ${role}`);
      });
    });
  });

  (presentationCatalog.heroes ?? []).forEach((hero) => {
    Object.entries(hero.assets ?? {}).forEach(([role, path]) => {
      addAssetUsageForPath(index, byPublicPath, path, `hero ${hero.playerId} ${role}`);
    });
  });
}

function collectEffectAssetUsage(index, byPublicPath) {
  Object.entries(EFFECTS).forEach(([effectId, effect]) => {
    addAssetUsageForPath(index, byPublicPath, effect.sheet, `effect ${effectId}`);
  });
}

function addAssetUsageForPath(index, byPublicPath, path, usage) {
  if (typeof path !== "string") {
    return;
  }

  const asset = byPublicPath.get(path);
  if (asset) {
    addAssetUsage(index, asset.assetId, usage);
  }
}

function addAssetUsage(index, assetId, usage) {
  if (!assetId || !usage) {
    return;
  }
  index[assetId] ??= [];
  index[assetId].push(usage);
}

function setAssetLibraryStatus(message) {
  if (dom.assetLibraryStatus) {
    dom.assetLibraryStatus.textContent = message;
  }
}

function setPreviewPanelStatus(message) {
  if (dom.previewPanelStatus) {
    dom.previewPanelStatus.textContent = message;
  }
}

function labelFromId(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeDomId(value) {
  return String(value ?? "item").replace(/[^a-zA-Z0-9_-]+/g, "_");
}

function cardPresentationStyle(info) {
  const styles = [];
  if (info.art) {
    styles.push(`--card-art: url('${cssUrlValue(info.art)}')`);
  }
  if (info.frame) {
    styles.push(`--card-frame: url('${cssUrlValue(info.frame)}')`);
  }
  if (info.artFit) {
    styles.push(`--card-art-fit: ${cardArtFitValue(info.artFit)}`);
  }
  const position = cardArtPositionValue(info.artPositionX, info.artPositionY);
  if (position) {
    styles.push(`--card-art-position: ${position}`);
  }
  const artHeight = Number(info.artHeight);
  if (Number.isFinite(artHeight) && artHeight > 0) {
    styles.push(`--card-art-height: ${Math.round(artHeight)}px`);
  }
  return styles.length > 0 ? `style="${escapeAttr(styles.join("; "))}"` : "";
}

function heroPresentationStyle(hero) {
  const styles = [];
  if (hero.art) {
    styles.push(`--hero-art: url('${cssUrlValue(hero.art)}')`);
  }
  if (hero.frame) {
    styles.push(`--hero-frame: url('${cssUrlValue(hero.frame)}')`);
  }
  if (hero.artFit) {
    styles.push(`--hero-art-fit: ${cardArtFitValue(hero.artFit)}`);
  }
  const position = cardArtPositionValue(hero.artPositionX, hero.artPositionY);
  if (position) {
    styles.push(`--hero-art-position: ${position}`);
  }
  const artHeight = Number(hero.artHeight);
  if (Number.isFinite(artHeight) && artHeight > 0) {
    styles.push(`--hero-art-height: ${Math.round(artHeight)}px`);
  }
  return styles.length > 0 ? `style="${escapeAttr(styles.join("; "))}"` : "";
}

function cssUrlValue(value) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/[\n\r]/g, "");
}

function cardArtFitValue(value) {
  if (value === "contain") {
    return "contain";
  }
  if (value === "fill") {
    return "100% 100%";
  }
  return "cover";
}

function cardArtPositionValue(x, y) {
  const positionX = Number(x);
  const positionY = Number(y);
  if (!Number.isFinite(positionX) && !Number.isFinite(positionY)) {
    return "";
  }
  return `${Number.isFinite(positionX) ? Math.round(positionX) : 50}% ${Number.isFinite(positionY) ? Math.round(positionY) : 50}%`;
}

function renderLayoutControls() {
  if (!dom.layoutControls) {
    return;
  }

  dom.layoutControls.innerHTML = `
    ${renderLayoutDocumentEditor()}
    <div class="layout-control-group">
      <div class="layout-control-group-head">
        <strong>1v1 Quick Tokens</strong>
        <span>Optional shortcuts</span>
      </div>
      ${LAYOUT_CONTROLS.map((control) => `
    <label class="layout-control">
      <span>
        <strong>${escapeHtml(control.label)}</strong>
        <output data-layout-output="${escapeAttr(control.path)}"></output>
      </span>
      <input
        type="range"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        data-layout-path="${escapeAttr(control.path)}"
      >
      <input
        type="number"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        data-layout-path="${escapeAttr(control.path)}"
        aria-label="${escapeAttr(control.label)}"
      >
    </label>
      `).join("")}
    </div>
  `;
  renderLayoutRegionPresetOptions();
}

function renderLayoutDocumentEditor() {
  const document = ensureBoardLayoutDocument();
  const scaling = normalizeScaling(document.scaling, {
    mode: "fit_viewport",
    minScale: PLAY_AREA.minScale,
    maxScale: 1
  });
  const metadata = document.metadata && typeof document.metadata === "object" ? document.metadata : {};
  return `
    <div class="layout-document-editor">
      <div class="layout-control-group-head">
        <strong>Document</strong>
        <span>${escapeHtml(document.kind ?? "board_layout")}</span>
      </div>
      <label class="layout-field wide">
        <span>Layout ID</span>
        <input type="text" value="${escapeAttr(document.id ?? "")}" data-layout-document-field="id">
      </label>
      <label class="layout-field">
        <span>Version</span>
        <input type="text" value="${escapeAttr(document.version ?? "")}" data-layout-document-field="version">
      </label>
      <label class="layout-field">
        <span>Scale Mode</span>
        <select data-layout-document-field="scaling.mode">
          ${renderSelectOptions(["fit_viewport", "fixed", "responsive"], scaling.mode)}
        </select>
      </label>
      <label class="layout-field wide">
        <span>Name</span>
        <input type="text" value="${escapeAttr(metadata.name ?? "")}" data-layout-document-field="metadata.name">
      </label>
      <div class="layout-geometry-grid">
        ${renderDocumentNumberField("logicalSize.width", "W", PLAY_AREA.width, 1, 4096)}
        ${renderDocumentNumberField("logicalSize.height", "H", PLAY_AREA.height, 1, 4096)}
        ${renderDocumentNumberField("scaling.minScale", "Min", scaling.minScale, 0.05, 2, 0.01)}
        ${renderDocumentNumberField("scaling.maxScale", "Max", scaling.maxScale, 0.05, 4, 0.01)}
      </div>
      ${renderLayoutTemplateEditor()}
    </div>
  `;
}

function renderLayoutTemplateEditor() {
  const activeTemplate = layoutTemplateIdForDocument(boardLayoutDocument) ?? "ruleset-default";
  return `
    <div class="layout-template-tools">
      <label class="layout-field">
        <span>Template</span>
        <select data-layout-template-select aria-label="Board layout template">
          ${BOARD_LAYOUT_TEMPLATES.map((template) => `
            <option value="${escapeAttr(template.id)}" ${template.id === activeTemplate ? "selected" : ""}>${escapeHtml(template.label)}</option>
          `).join("")}
        </select>
      </label>
      <button
        class="ghost"
        type="button"
        data-layout-template-action="apply"
        title="Apply selected board layout template to the local draft"
      >Apply</button>
    </div>
  `;
}

function renderDocumentNumberField(field, label, value, min, max, step = 1) {
  return `
    <label class="layout-field">
      <span>${escapeHtml(label)}</span>
      <input
        type="number"
        min="${escapeAttr(min)}"
        max="${escapeAttr(max)}"
        step="${escapeAttr(step)}"
        value="${escapeAttr(value)}"
        data-layout-document-field="${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderLayoutRegionPresetOptions() {
  if (!dom.layoutRegionPresetSelect) {
    return;
  }

  const currentValue = dom.layoutRegionPresetSelect.value || "custom";
  dom.layoutRegionPresetSelect.innerHTML = REGION_PRESETS.map((preset) => `
    <option value="${escapeAttr(preset.id)}" ${preset.id === currentValue ? "selected" : ""}>${escapeHtml(preset.label)}</option>
  `).join("");
}

function renderLayoutRegionGuides() {
  if (!dom.layoutRegionLayer) {
    return;
  }

  const regions = Array.isArray(boardLayoutDocument?.regions) ? boardLayoutDocument.regions : [];
  if (regions.length === 0) {
    dom.layoutRegionLayer.innerHTML = "";
    return;
  }

  const widgetsById = new Map(
    (Array.isArray(boardLayoutDocument?.widgets) ? boardLayoutDocument.widgets : [])
      .filter((widget) => widget && typeof widget === "object" && typeof widget.id === "string")
      .map((widget) => [widget.id, widget])
  );

  dom.layoutRegionLayer.innerHTML = regions.map((region, index) => {
    if (!region || typeof region !== "object") {
      return "";
    }

    const geometry = layoutGuideGeometry(region);
    if (!geometry) {
      return "";
    }

    const id = typeof region.id === "string" ? region.id : `region-${index}`;
    const kind = typeof region.kind === "string" ? region.kind : "custom";
    const ownerScope = typeof region.ownerScope === "string" ? region.ownerScope : "shared";
    const label = typeof region.label === "string" ? region.label : labelFromId(id);
    const widgetId = typeof region.widgetId === "string" ? region.widgetId : "";
    const widget = widgetsById.get(widgetId);
    const component = widget && typeof widget.component === "string" ? widget.component : widgetId || "Widget";
    const summary = [labelFromId(kind), component, labelFromId(ownerScope)].filter(Boolean).join(" · ");
    const selected = id === selectedLayoutRegionId;

    return `
      <div
        class="layout-region-box ${selected ? "selected" : ""}"
        role="button"
        tabindex="0"
        aria-selected="${selected ? "true" : "false"}"
        data-region-id="${escapeAttr(id)}"
        data-region-kind="${escapeAttr(kind)}"
        data-owner-scope="${escapeAttr(ownerScope)}"
        style="left: ${geometry.x}px; top: ${geometry.y}px; width: ${geometry.width}px; height: ${geometry.height}px;"
        title="${escapeAttr(`${label} · ${summary}`)}"
      >
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(summary)}</span>
        <button
          class="layout-region-resize"
          type="button"
          data-layout-region-resize="${escapeAttr(id)}"
          aria-label="Resize ${escapeAttr(label)}"
        ></button>
      </div>
    `;
  }).join("");
}

function renderLayoutRegionEditor(options = {}) {
  if (!dom.layoutRegionList || !dom.layoutRegionDetail) {
    return;
  }

  ensureSelectedLayoutRegion();
  const regions = layoutRegions();
  if (dom.layoutRegionCount) {
    dom.layoutRegionCount.textContent = `${regions.length} region${regions.length === 1 ? "" : "s"}`;
  }

  dom.layoutRegionList.innerHTML = regions.map((region) => renderLayoutRegionRow(region)).join("");
  [
    dom.duplicateLayoutRegionButton,
    dom.mirrorLayoutRegionXButton,
    dom.mirrorLayoutRegionYButton,
    dom.fillLayoutRegionButton,
    dom.deleteLayoutRegionButton
  ].forEach((button) => {
    if (button) {
      button.disabled = !selectedLayoutRegionId;
    }
  });
  if (dom.snapLayoutToggle) {
    dom.snapLayoutToggle.checked = layoutSnapEnabled;
  }

  const preserveDetail = options.preserveDetailFocus && dom.layoutRegionDetail.contains(document.activeElement);
  if (!preserveDetail) {
    dom.layoutRegionDetail.innerHTML = renderLayoutRegionDetail();
  }
  renderLayoutDiagnostics();
}

function renderLayoutRegionRow(region) {
  if (!region || typeof region !== "object") {
    return "";
  }

  const id = typeof region.id === "string" ? region.id : "";
  const metadata = layoutRegionMetadata(id);
  const selected = id === selectedLayoutRegionId;
  return `
    <button
      class="layout-region-row ${selected ? "selected" : ""}"
      type="button"
      role="option"
      aria-selected="${selected ? "true" : "false"}"
      data-layout-region-id="${escapeAttr(id)}"
    >
      <strong>${escapeHtml(metadata.label)}</strong>
      <span>${escapeHtml([labelFromId(metadata.kind), labelFromId(metadata.ownerScope)].filter(Boolean).join(" · "))}</span>
    </button>
  `;
}

function renderLayoutRegionDetail() {
  const region = selectedLayoutRegion();
  if (!region) {
    return `<div class="layout-region-empty">Select or add a region.</div>`;
  }

  const metadata = layoutRegionMetadata(region.id);
  const geometry = currentLayoutRegionGeometry(region) ?? { x: 0, y: 0, width: 120, height: 90 };
  const accepts = Array.isArray(region.accepts) ? region.accepts.join(", ") : "";
  return `
    <div class="layout-selection-summary">
      <strong>${escapeHtml(metadata.label)}</strong>
      <span>${escapeHtml([metadata.id, labelFromId(metadata.kind), labelFromId(metadata.ownerScope)].filter(Boolean).join(" · "))}</span>
      <code>${escapeHtml(`x${Math.round(geometry.x)} y${Math.round(geometry.y)} w${Math.round(geometry.width)} h${Math.round(geometry.height)}`)}</code>
    </div>
    <label class="layout-field wide">
      <span>Region ID</span>
      <input type="text" value="${escapeAttr(region.id)}" data-layout-region-field="id">
    </label>
    <label class="layout-field wide">
      <span>Label</span>
      <input type="text" value="${escapeAttr(metadata.label)}" data-layout-region-field="label">
    </label>
    <label class="layout-field">
      <span>Kind</span>
      <select data-layout-region-field="kind">
        ${renderSelectOptions(REGION_KIND_OPTIONS, metadata.kind)}
      </select>
    </label>
    <label class="layout-field">
      <span>Owner</span>
      <select data-layout-region-field="ownerScope">
        ${renderSelectOptions(REGION_OWNER_OPTIONS, metadata.ownerScope)}
      </select>
    </label>
    <label class="layout-field">
      <span>Widget</span>
      <input type="text" value="${escapeAttr(metadata.widgetId)}" data-layout-region-field="widgetId">
    </label>
    <label class="layout-field">
      <span>Visible</span>
      <select data-layout-region-field="visibleTo">
        ${renderSelectOptions(REGION_VISIBILITY_OPTIONS, metadata.visibleTo || "public")}
      </select>
    </label>
    <label class="layout-field">
      <span>Drop</span>
      <select data-layout-region-field="dropBehavior">
        ${renderSelectOptions(REGION_DROP_OPTIONS, metadata.dropBehavior || "none")}
      </select>
    </label>
    <label class="layout-field">
      <span>Overflow</span>
      <select data-layout-region-field="overflow">
        ${renderSelectOptions(REGION_OVERFLOW_OPTIONS, region.overflow || "compact")}
      </select>
    </label>
    <label class="layout-field checkbox-field">
      <input type="checkbox" ${metadata.targetable ? "checked" : ""} data-layout-region-field="targetable">
      <span>Targetable</span>
    </label>
    <label class="layout-field wide">
      <span>Accepts</span>
      <input type="text" value="${escapeAttr(accepts)}" data-layout-region-field="accepts">
    </label>
    <div class="layout-geometry-grid">
      ${renderGeometryField("x", geometry.x)}
      ${renderGeometryField("y", geometry.y)}
      ${renderGeometryField("width", geometry.width)}
      ${renderGeometryField("height", geometry.height)}
    </div>
  `;
}

function renderGeometryField(field, value) {
  return `
    <label class="layout-field">
      <span>${escapeHtml(field.toUpperCase())}</span>
      <input
        type="number"
        min="0"
        step="1"
        value="${escapeAttr(Math.round(value))}"
        data-layout-region-field="geometry.${escapeAttr(field)}"
      >
    </label>
  `;
}

function renderSelectOptions(options, selectedValue) {
  const hasSelected = options.includes(selectedValue);
  const values = hasSelected || !selectedValue ? options : [selectedValue, ...options];
  return values.map((value) => `
    <option value="${escapeAttr(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(labelFromId(value))}</option>
  `).join("");
}

function renderLayoutDiagnostics() {
  if (!dom.layoutDiagnostics) {
    return;
  }

  const diagnostics = boardLayoutDiagnostics();
  const errors = diagnostics.filter((issue) => issue.severity === "error");
  dom.layoutDiagnostics.classList.toggle("ok", errors.length === 0);
  dom.layoutDiagnostics.innerHTML = `
    <div class="layout-diagnostics-head">
      <strong>${errors.length === 0 ? "Layout Valid" : "Layout Needs Fix"}</strong>
      <span>${diagnostics.length} issue${diagnostics.length === 1 ? "" : "s"}</span>
    </div>
    ${diagnostics.length > 0
      ? diagnostics.map((issue) => `<span class="${escapeAttr(issue.severity)}">${escapeHtml(issue.message)}</span>`).join("")
      : `<span class="ok">No local layout issues detected.</span>`}
  `;
}

function boardLayoutDiagnostics() {
  const document = boardLayoutDocument;
  const issues = [];
  if (!document || typeof document !== "object") {
    return [{ severity: "error", message: "No board layout document loaded." }];
  }

  if (!document.id) {
    issues.push({ severity: "error", message: "Layout id is required." });
  }
  if (!document.version) {
    issues.push({ severity: "error", message: "Layout version is required." });
  }
  if (document.kind !== "board_layout") {
    issues.push({ severity: "error", message: "Layout kind must be board_layout." });
  }

  const width = Number(document.logicalSize?.width);
  const height = Number(document.logicalSize?.height);
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    issues.push({ severity: "error", message: "Logical width and height must be positive numbers." });
  }

  const scalingMode = document.scaling?.mode;
  if (!["fit_viewport", "fixed", "responsive"].includes(scalingMode)) {
    issues.push({ severity: "error", message: "Scaling mode must be fit_viewport, fixed, or responsive." });
  }
  const minScale = Number(document.scaling?.minScale ?? 0);
  const maxScale = Number(document.scaling?.maxScale ?? 1);
  if (Number.isFinite(minScale) && Number.isFinite(maxScale) && maxScale > 0 && minScale > maxScale) {
    issues.push({ severity: "warning", message: "Minimum scale is larger than maximum scale." });
  }

  const widgets = Array.isArray(document.widgets) ? document.widgets : [];
  const widgetIds = new Set();
  widgets.forEach((widget, index) => {
    const widgetId = typeof widget?.id === "string" ? widget.id : "";
    if (!widgetId) {
      issues.push({ severity: "error", message: `Widget ${index + 1} is missing an id.` });
      return;
    }
    if (widgetIds.has(widgetId)) {
      issues.push({ severity: "error", message: `Duplicate widget id ${widgetId}.` });
    }
    widgetIds.add(widgetId);
    if (!widget.component) {
      issues.push({ severity: "error", message: `Widget ${widgetId} is missing a component.` });
    }
  });

  const regions = Array.isArray(document.regions) ? document.regions : [];
  if (regions.length === 0) {
    issues.push({ severity: "error", message: "At least one region is required." });
  }
  const regionIds = new Set();
  regions.forEach((region, index) => {
    const regionId = typeof region?.id === "string" ? region.id : "";
    if (!regionId) {
      issues.push({ severity: "error", message: `Region ${index + 1} is missing an id.` });
      return;
    }
    if (regionIds.has(regionId)) {
      issues.push({ severity: "error", message: `Duplicate region id ${regionId}.` });
    }
    regionIds.add(regionId);
    if (!region.widgetId) {
      issues.push({ severity: "error", message: `Region ${regionId} is missing widgetId.` });
    } else if (widgetIds.size > 0 && !widgetIds.has(region.widgetId)) {
      issues.push({ severity: "error", message: `Region ${regionId} references unknown widget ${region.widgetId}.` });
    }
    const geometryIssue = layoutGeometryIssue(regionId, region.geometry, width, height);
    if (geometryIssue) {
      issues.push(geometryIssue);
    }
  });

  return issues;
}

function layoutGeometryIssue(regionId, geometry, boardWidth, boardHeight) {
  if (!geometry || typeof geometry !== "object") {
    return { severity: "error", message: `Region ${regionId} is missing geometry.` };
  }
  const x = Number(geometry.x);
  const y = Number(geometry.y);
  const width = Number(geometry.width);
  const height = Number(geometry.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { severity: "error", message: `Region ${regionId} geometry must have positive numeric x/y/width/height.` };
  }
  if (x < 0 || y < 0 || x + width > boardWidth || y + height > boardHeight) {
    return { severity: "error", message: `Region ${regionId} geometry exceeds ${Math.round(boardWidth)}x${Math.round(boardHeight)}.` };
  }
  return null;
}

function updateBoardLayoutDocumentFromInput(input) {
  const document = ensureBoardLayoutDocument();
  const field = input.dataset.layoutDocumentField;
  if (!field) {
    return;
  }

  if (field === "id" || field === "version") {
    document[field] = input.value.trim();
  } else if (field === "metadata.name") {
    document.metadata = document.metadata && typeof document.metadata === "object" ? document.metadata : {};
    if (input.value.trim()) {
      document.metadata.name = input.value.trim();
    } else {
      delete document.metadata.name;
    }
  } else if (field === "scaling.mode") {
    document.scaling = normalizeScaling({ ...document.scaling, mode: input.value }, document.scaling ?? {});
  } else if (field === "logicalSize.width" || field === "logicalSize.height") {
    document.logicalSize = normalizeLogicalSize({
      ...document.logicalSize,
      [field.endsWith("width") ? "width" : "height"]: Number(input.value)
    }, document.logicalSize ?? { width: PLAY_AREA.width, height: PLAY_AREA.height });
    applyPlayAreaFromBoardLayout(document);
  } else if (field === "scaling.minScale" || field === "scaling.maxScale") {
    const key = field.endsWith("minScale") ? "minScale" : "maxScale";
    document.scaling = normalizeScaling({
      ...document.scaling,
      [key]: Number(input.value)
    }, document.scaling ?? { mode: "fit_viewport", minScale: PLAY_AREA.minScale, maxScale: 1 });
    applyPlayAreaFromBoardLayout(document);
  }

  commitBoardLayoutDocumentChange("Updated layout document.", { preserveDetailFocus: true, preserveControlsFocus: true });
}

function layoutRegions() {
  return Array.isArray(boardLayoutDocument?.regions)
    ? boardLayoutDocument.regions.filter((region) => region && typeof region === "object")
    : [];
}

function selectedLayoutRegion() {
  return layoutRegions().find((region) => region.id === selectedLayoutRegionId) ?? null;
}

function ensureSelectedLayoutRegion() {
  const regions = layoutRegions();
  if (regions.some((region) => region.id === selectedLayoutRegionId)) {
    return;
  }
  selectedLayoutRegionId = typeof regions[0]?.id === "string" ? regions[0].id : "";
}

function selectLayoutRegion(regionId) {
  if (!regionId || !layoutRegions().some((region) => region.id === regionId)) {
    return;
  }
  selectedLayoutRegionId = regionId;
  renderLayoutRegionGuides();
  renderLayoutRegionEditor();
}

function updateSelectedLayoutRegionFromInput(input) {
  const region = selectedLayoutRegion();
  if (!region) {
    return;
  }

  const field = input.dataset.layoutRegionField;
  if (field === "id") {
    renameSelectedLayoutRegion(input.value.trim());
    return;
  }

  if (field === "targetable") {
    region.targetable = Boolean(input.checked);
  } else if (field === "accepts") {
    region.accepts = input.value
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  } else if (field?.startsWith("geometry.")) {
    const geometryField = field.slice("geometry.".length);
    const geometry = currentLayoutRegionGeometry(region) ?? { x: 0, y: 0, width: 120, height: 90 };
    geometry[geometryField] = Number(input.value);
    setLayoutRegionGeometry(region, geometry);
  } else if (field) {
    region[field] = input.value;
  }

  commitBoardLayoutDocumentChange("", { preserveDetailFocus: true });
}

function renameSelectedLayoutRegion(nextId) {
  const region = selectedLayoutRegion();
  if (!region) {
    return;
  }
  const previousId = region.id;
  if (!nextId) {
    setLayoutStatus("Region id is required.");
    renderLayoutRegionEditor();
    return;
  }
  if (nextId !== previousId && layoutRegions().some((candidate) => candidate.id === nextId)) {
    setLayoutStatus(`Region id ${nextId} is already used.`);
    renderLayoutRegionEditor();
    return;
  }

  region.id = nextId;
  selectedLayoutRegionId = nextId;
  commitBoardLayoutDocumentChange(`Renamed region ${previousId} to ${nextId}.`);
}

function addLayoutRegion() {
  const document = ensureBoardLayoutDocument();
  document.regions ??= [];
  const preset = selectedLayoutRegionPreset();
  const id = uniqueRegionId(defaultRegionIdForPreset(preset));
  const region = cloneJson(preset.region);
  region.id = id;
  if (!region.label || preset.id !== "custom") {
    region.label = labelFromId(id);
  }
  region.geometry = normalizedRegionGeometry(region.geometry) ?? { x: 0, y: 0, width: 120, height: 90 };
  ensureLayoutWidgetForPreset(preset, region.widgetId);
  document.regions.push(region);
  selectedLayoutRegionId = id;
  commitBoardLayoutDocumentChange(`Added ${preset.label} region.`);
}

function duplicateSelectedLayoutRegion() {
  const region = selectedLayoutRegion();
  const document = ensureBoardLayoutDocument();
  if (!region) {
    setLayoutStatus("Select a region to copy.");
    return;
  }

  const geometry = currentLayoutRegionGeometry(region) ?? { x: 0, y: 0, width: 120, height: 90 };
  const copy = cloneJson(region);
  copy.id = uniqueRegionId(`${region.id}_copy`);
  copy.label = `${layoutRegionMetadata(region.id).label} Copy`;
  copy.geometry = normalizedRegionGeometry({
    x: geometry.x + LAYOUT_SNAP_SIZE * 2,
    y: geometry.y + LAYOUT_SNAP_SIZE * 2,
    width: geometry.width,
    height: geometry.height
  });
  document.regions.push(copy);
  selectedLayoutRegionId = copy.id;
  commitBoardLayoutDocumentChange(`Copied region ${region.id}.`);
}

function mirrorSelectedLayoutRegion(axis) {
  const region = selectedLayoutRegion();
  const geometry = currentLayoutRegionGeometry(region);
  if (!region || !geometry) {
    setLayoutStatus("Select a region to flip.");
    return;
  }

  setLayoutRegionGeometry(region, axis === "x"
    ? {
        x: PLAY_AREA.width - geometry.x - geometry.width,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height
      }
    : {
        x: geometry.x,
        y: PLAY_AREA.height - geometry.y - geometry.height,
        width: geometry.width,
        height: geometry.height
      });
  commitBoardLayoutDocumentChange(axis === "x" ? "Region flipped horizontally." : "Region flipped vertically.");
}

function fillSelectedLayoutRegion() {
  const region = selectedLayoutRegion();
  if (!region) {
    setLayoutStatus("Select a region to fill.");
    return;
  }

  setLayoutRegionGeometry(region, {
    x: 0,
    y: 0,
    width: PLAY_AREA.width,
    height: PLAY_AREA.height
  });
  commitBoardLayoutDocumentChange("Region filled the logical board.");
}

function deleteSelectedLayoutRegion() {
  if (!selectedLayoutRegionId || !Array.isArray(boardLayoutDocument?.regions)) {
    return;
  }

  boardLayoutDocument.regions = boardLayoutDocument.regions.filter((region) => region?.id !== selectedLayoutRegionId);
  selectedLayoutRegionId = "";
  commitBoardLayoutDocumentChange("Deleted region.");
}

function selectedLayoutRegionPreset() {
  const presetId = dom.layoutRegionPresetSelect?.value || "custom";
  return REGION_PRESETS.find((preset) => preset.id === presetId) ?? REGION_PRESETS[0];
}

function defaultRegionIdForPreset(preset) {
  const ownerScope = preset.region?.ownerScope;
  const kind = preset.region?.kind || preset.id;
  if (ownerScope === "player" || ownerScope === "opponent") {
    return `${ownerScope}_${kind}`;
  }
  if (ownerScope === "match") {
    return `match_${kind}`;
  }
  return kind === "custom" ? "custom_region" : kind;
}

function ensureLayoutWidgetForPreset(preset, widgetId) {
  const document = ensureBoardLayoutDocument();
  if (!widgetId || document.widgets?.some((widget) => widget?.id === widgetId)) {
    return;
  }

  document.widgets ??= [];
  document.widgets.push({
    id: widgetId,
    kind: preset.widget?.kind ?? "custom",
    component: preset.widget?.component ?? componentForRegionKind(preset.region?.kind)
  });
}

function uniqueRegionId(baseId) {
  const used = new Set(layoutRegions().map((region) => region.id));
  let id = baseId;
  let suffix = 2;
  while (used.has(id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }
  return id;
}

function currentLayoutRegionGeometry(region) {
  return clampGuideGeometry(region?.geometry) ?? layoutTokenGeometry(region?.id);
}

function setLayoutRegionGeometry(region, geometry) {
  if (!region) {
    return;
  }

  region.geometry = normalizedRegionGeometry(geometry) ?? region.geometry;
}

function normalizedRegionGeometry(geometry) {
  const snapped = layoutSnapEnabled ? snapGeometry(geometry) : geometry;
  return clampGuideGeometry({
    x: snapped.x,
    y: snapped.y,
    width: Math.max(28, snapped.width),
    height: Math.max(28, snapped.height)
  });
}

function snapGeometry(geometry) {
  return {
    x: snapLayoutValue(geometry.x),
    y: snapLayoutValue(geometry.y),
    width: Math.max(LAYOUT_SNAP_SIZE, snapLayoutValue(geometry.width)),
    height: Math.max(LAYOUT_SNAP_SIZE, snapLayoutValue(geometry.height))
  };
}

function snapLayoutValue(value) {
  return Math.round(Number(value) / LAYOUT_SNAP_SIZE) * LAYOUT_SNAP_SIZE;
}

function countLayoutRegions() {
  return Array.isArray(boardLayoutDocument?.regions) ? boardLayoutDocument.regions.length : 0;
}

function layoutRegionById(regionId) {
  if (!regionId || !Array.isArray(boardLayoutDocument?.regions)) {
    return null;
  }
  return boardLayoutDocument.regions.find((region) => region && typeof region === "object" && region.id === regionId) ?? null;
}

function layoutWidgetById(widgetId) {
  if (!widgetId || !Array.isArray(boardLayoutDocument?.widgets)) {
    return null;
  }
  return boardLayoutDocument.widgets.find((widget) => widget && typeof widget === "object" && widget.id === widgetId) ?? null;
}

function runtimeRegionIdForPlayer(playerId, kind) {
  const side = playerId === "p2" ? "opponent" : "player";
  return `${side}_${kind}`;
}

function layoutRegionMetadata(regionId) {
  const region = layoutRegionById(regionId);
  const widget = layoutWidgetById(region?.widgetId);
  const inferred = inferRegionMetadata(regionId);
  const kind = typeof region?.kind === "string" ? region.kind : inferred.kind;
  const component = typeof widget?.component === "string" ? widget.component : componentForRegionKind(kind);
  const widgetKind = typeof widget?.kind === "string" ? widget.kind : "";
  const widgetConfig = widget?.config && typeof widget.config === "object" && !Array.isArray(widget.config) ? widget.config : {};

  return {
    id: regionId,
    kind,
    ownerScope: typeof region?.ownerScope === "string" ? region.ownerScope : inferred.ownerScope,
    label: typeof region?.label === "string" ? region.label : labelFromId(regionId),
    widgetId: typeof region?.widgetId === "string" ? region.widgetId : "",
    widgetKind,
    widgetConfig,
    component,
    targetable: typeof region?.targetable === "boolean" ? region.targetable : inferred.targetable,
    dropBehavior: typeof region?.dropBehavior === "string" ? region.dropBehavior : "",
    accepts: Array.isArray(region?.accepts) ? region.accepts.filter((value) => typeof value === "string") : [],
    visibleTo: typeof region?.visibleTo === "string" ? region.visibleTo : ""
  };
}

function componentForRegionKind(kind) {
  if (kind === "hero") {
    return "HeroCard";
  }
  if (kind === "battlefield" || kind === "hand") {
    return "CardRow";
  }
  if (kind === "equipment") {
    return "EquipmentSlot";
  }
  if (kind === "deck") {
    return "DeckStack";
  }
  if (kind === "action_window") {
    return "ActionPanel";
  }
  if (kind === "history_log") {
    return "HistoryLog";
  }
  if (kind === "chat") {
    return "ChatWindow";
  }
  return "UnknownRegion";
}

function inferRegionMetadata(regionId) {
  const id = String(regionId ?? "");
  const ownerScope = id.startsWith("opponent_") ? "opponent" : id.startsWith("player_") ? "player" : "shared";
  const kind = id.endsWith("_hero")
    ? "hero"
    : id.endsWith("_battlefield")
      ? "battlefield"
      : id.endsWith("_equipment")
        ? "equipment"
      : id.endsWith("_hand")
        ? "hand"
        : id.endsWith("_deck")
          ? "deck"
          : id === "turn_action_window"
            ? "action_window"
            : id === "history_log"
              ? "history_log"
              : id === "chat_window"
                ? "chat"
                : "custom";
  return {
    kind,
    ownerScope,
    targetable: kind === "hero" || kind === "battlefield"
  };
}

function layoutRegionAttributeMap(regionId, options = {}) {
  const metadata = layoutRegionMetadata(regionId);
  const map = {
    "data-region-id": metadata.id,
    "data-region-kind": metadata.kind,
    "data-region-owner-scope": metadata.ownerScope,
    "data-region-label": metadata.label,
    "data-region-targetable": String(metadata.targetable),
    "data-region-renderer": metadata.component
  };

  if (metadata.widgetId) {
    map["data-region-widget"] = metadata.widgetId;
  }
  if (metadata.widgetKind) {
    map["data-region-widget-kind"] = metadata.widgetKind;
  }
  if (metadata.component) {
    map["data-region-component"] = metadata.component;
  }
  if (metadata.dropBehavior) {
    map["data-drop-behavior"] = metadata.dropBehavior;
  }
  if (metadata.accepts.length > 0) {
    map["data-region-accepts"] = metadata.accepts.join(" ");
  }
  if (metadata.visibleTo) {
    map["data-region-visible-to"] = metadata.visibleTo;
  }
  if (options.targetArea) {
    map["data-target-area"] = options.targetArea;
  }

  return map;
}

function layoutRegionAttrs(regionId, options = {}) {
  return Object.entries(layoutRegionAttributeMap(regionId, options))
    .map(([name, value]) => `${name}="${escapeAttr(value)}"`)
    .join(" ");
}

function applyLayoutRegionAttrs(element, regionId, options = {}) {
  if (!element) {
    return;
  }

  const attrs = layoutRegionAttributeMap(regionId, options);
  const managedAttrs = [
    "data-region-id",
    "data-region-kind",
    "data-region-owner-scope",
    "data-region-label",
    "data-region-targetable",
    "data-region-widget",
    "data-region-widget-kind",
    "data-region-component",
    "data-region-renderer",
    "data-drop-behavior",
    "data-region-accepts",
    "data-region-visible-to",
    "data-target-area"
  ];
  managedAttrs.forEach((name) => element.removeAttribute(name));
  Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  if (!element.getAttribute("aria-label")) {
    element.setAttribute("aria-label", attrs["data-region-label"]);
  }
}

function annotateStaticLayoutRegions() {
  renderStaticRuntimeRegion(dom.turnPanel, "turn_action_window", "ActionPanel");
  renderStaticRuntimeRegion(dom.battleLog, "history_log", "HistoryLog");
  renderStaticRuntimeRegion(dom.chatWindow, "chat_window", "ChatWindow");
  renderChatWindow();
}

function renderStaticRuntimeRegion(element, regionId, expectedComponent) {
  if (!element) {
    return;
  }

  const region = layoutRegionMetadata(regionId);
  applyLayoutRegionAttrs(element, region.id);
  element.dataset.regionRendererExpected = expectedComponent;
  element.dataset.regionRendererStatus = region.component === expectedComponent ? "ready" : "fallback";
}

function renderChatWindow() {
  if (!dom.chatWindow) {
    return;
  }

  const region = layoutRegionMetadata("chat_window");
  const widget = layoutWidgetById(region.widgetId);
  const config = widget && typeof widget.config === "object" && widget.config !== null ? widget.config : {};
  const enabled = config.enabled === true;
  const placeholder = typeof config.placeholder === "string" ? config.placeholder : "Chat unavailable.";
  dom.chatWindow.dataset.tooltipTitle = region.label;
  dom.chatWindow.dataset.tooltipBody = placeholder;
  dom.chatWindow.tabIndex = 0;
  dom.chatWindow.innerHTML = `
    <strong>${escapeHtml(region.label)}</strong>
    <span>${enabled ? "Online" : "Offline"}</span>
    <small>0 messages</small>
  `;
}

function layoutGuideGeometry(region) {
  if (!region || typeof region !== "object") {
    return null;
  }

  const authoredGeometry = clampGuideGeometry(region.geometry);
  if (authoredGeometry) {
    return authoredGeometry;
  }

  const tokenGeometry = layoutTokenGeometry(region.id);
  if (tokenGeometry) {
    return clampGuideGeometry(tokenGeometry);
  }

  return null;
}

function layoutTokenGeometry(regionId) {
  const { arena, player, zones, center } = layoutState;
  const boardWidth = PLAY_AREA.width;
  const boardHeight = PLAY_AREA.height;
  const opponentTop = arena.padding;
  const centerTop = arena.padding + arena.opponentRow + arena.rowGap;
  const playerTop = centerTop + arena.centerRow + arena.rowGap;
  const heroX = arena.padding;
  const boardX = heroX + player.heroWidth + player.gap;
  const equipmentWidth = Math.min(118, Math.max(78, player.heroWidth * 0.52));
  const equipmentX = boardX + zones.boardWidth + zones.gap;
  const handX = equipmentX + equipmentWidth + zones.gap;
  const handWidth = Math.max(1, boardWidth - arena.padding - handX);
  const deckWidth = Math.min(64, Math.max(44, handWidth - zones.gap * 2));
  const opponentDeckHeight = Math.min(92, Math.max(52, arena.opponentRow - 24));
  const playerDeckHeight = Math.min(92, Math.max(52, arena.playerRow - 24));
  const chatWidth = Math.min(220, Math.max(128, player.heroWidth));
  const chatX = boardWidth - arena.padding - chatWidth;
  const historyX = arena.padding + center.turnWidth + center.gap;

  const geometries = {
    opponent_hero: { x: heroX, y: opponentTop, width: player.heroWidth, height: arena.opponentRow },
    opponent_battlefield: { x: boardX, y: opponentTop, width: zones.boardWidth, height: arena.opponentRow },
    opponent_equipment: { x: equipmentX, y: opponentTop, width: equipmentWidth, height: arena.opponentRow },
    opponent_hand: { x: handX, y: opponentTop, width: handWidth, height: arena.opponentRow },
    opponent_deck: {
      x: boardWidth - arena.padding - deckWidth,
      y: opponentTop + 12,
      width: deckWidth,
      height: opponentDeckHeight
    },
    turn_action_window: { x: arena.padding, y: centerTop, width: center.turnWidth, height: arena.centerRow },
    history_log: {
      x: historyX,
      y: centerTop,
      width: Math.max(1, chatX - center.gap - historyX),
      height: arena.centerRow
    },
    chat_window: { x: chatX, y: centerTop, width: chatWidth, height: arena.centerRow },
    player_hero: { x: heroX, y: playerTop, width: player.heroWidth, height: arena.playerRow },
    player_battlefield: { x: boardX, y: playerTop, width: zones.boardWidth, height: arena.playerRow },
    player_equipment: { x: equipmentX, y: playerTop, width: equipmentWidth, height: arena.playerRow },
    player_hand: { x: handX, y: playerTop, width: handWidth, height: arena.playerRow },
    player_deck: {
      x: boardWidth - arena.padding - deckWidth,
      y: Math.max(playerTop + 12, boardHeight - arena.padding - playerDeckHeight - 12),
      width: deckWidth,
      height: playerDeckHeight
    }
  };

  return geometries[regionId] ?? null;
}

function clampGuideGeometry(geometry) {
  if (!geometry || typeof geometry !== "object") {
    return null;
  }

  const rawX = Number(geometry.x);
  const rawY = Number(geometry.y);
  const rawWidth = Number(geometry.width);
  const rawHeight = Number(geometry.height);
  if (![rawX, rawY, rawWidth, rawHeight].every(Number.isFinite)) {
    return null;
  }

  const x = clampNumber(rawX, 0, PLAY_AREA.width - 1, 0);
  const y = clampNumber(rawY, 0, PLAY_AREA.height - 1, 0);
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(clampNumber(rawWidth, 1, PLAY_AREA.width - x, 1)),
    height: Math.round(clampNumber(rawHeight, 1, PLAY_AREA.height - y, 1))
  };
}

function toggleLayoutEditor(open = !layoutEditorOpen) {
  layoutEditorOpen = open;
  if (layoutEditorOpen && assetLibraryOpen) {
    toggleAssetLibrary(false);
  }
  if (layoutEditorOpen && cardStudioOpen) {
    toggleCardStudio(false);
  }
  if (layoutEditorOpen && previewPanelOpen) {
    togglePreviewPanel(false);
  }
  if (layoutEditorOpen && presentationEditorOpen) {
    togglePresentationEditor(false);
  }

  selectedAction = null;
  hideTooltip();
  dom.layoutEditor.hidden = !layoutEditorOpen;
  dom.layoutGuides?.setAttribute("aria-hidden", String(!layoutEditorOpen));
  dom.layoutEditorButton?.classList.toggle("selected", layoutEditorOpen);
  dom.arena?.classList.toggle("layout-editing", layoutEditorOpen);
  document.body.classList.toggle("layout-editor-open", layoutEditorOpen);
  paintSelectionState();
  syncLayoutEditor();
}

function loadLayout() {
  try {
    const draft = loadBoardLayoutDraft();
    if (!draft) {
      return cloneLayout(authoredDefaultLayout);
    }
    return isBoardLayoutDocument(draft) ? layoutTokensFromBoardLayout(draft) : normalizeLayout(draft);
  } catch {
    return cloneLayout(authoredDefaultLayout);
  }
}

async function loadAuthoredBoardLayout() {
  try {
    const response = await fetch(await resolveBoardLayoutUrl());
    if (!response.ok) {
      throw new Error(`Board layout request failed: ${response.status}`);
    }

    const boardLayout = await response.json();
    authoredBoardLayoutDocument = normalizeBoardLayoutDocument(boardLayout);
    const draft = loadBoardLayoutDraft();
    const hasDraft = Boolean(draft);
    const draftIsBoardLayoutDocument = isBoardLayoutDocument(draft);
    boardLayoutDocument = hasDraft
      ? normalizeBoardLayoutDocument(draft, authoredBoardLayoutDocument)
      : cloneJson(authoredBoardLayoutDocument);
    applyPlayAreaFromBoardLayout(boardLayoutDocument);
    authoredDefaultLayout = layoutTokensFromBoardLayout(authoredBoardLayoutDocument);
    layoutState = hasDraft ? layoutTokensFromBoardLayout(boardLayoutDocument) : cloneLayout(authoredDefaultLayout);
    ensureSelectedLayoutRegion();
    if (hasDraft && !draftIsBoardLayoutDocument) {
      syncRegionGeometriesFromLayoutTokens();
    }
    renderLayoutControls();
    applyLayout();
    renderLayoutRegionGuides();
    renderLayoutRegionEditor();
    annotateStaticLayoutRegions();
    syncLayoutEditor();
    setLayoutStatus(
      hasDraft
        ? `Loaded ruleset board layout with ${countLayoutRegions()} regions. Local edits are active.`
        : `Loaded ruleset board layout with ${countLayoutRegions()} regions.`
    );
    renderCardStudio();
    render();
  } catch (error) {
    setLayoutStatus(error instanceof Error ? error.message : "Could not load ruleset board layout.");
  }
}

async function loadAuthoredPresentationCatalog() {
  try {
    const catalogUrl = await resolvePresentationCatalogUrl();
    if (!catalogUrl) {
      setPresentationEditorStatus("No presentation catalog configured for this ruleset.");
      renderPresentationEditor();
      return;
    }

    const response = await fetch(catalogUrl);
    if (!response.ok) {
      throw new Error(`Presentation catalog request failed: ${response.status}`);
    }

    authoredPresentationCatalog = await response.json();
    const draft = loadPresentationCatalogDraft();
    applyPresentationCatalog(draft ?? cloneJson(authoredPresentationCatalog));
    renderPresentationEditor();
    setPresentationEditorStatus(draft ? "Loaded local presentation draft." : `Loaded ${presentationEntries().length} presentation entries.`);
    render();
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Could not load ruleset presentation catalog.");
    setPresentationEditorStatus(error instanceof Error ? error.message : "Could not load ruleset presentation catalog.");
  }
}

async function resolveBoardLayoutUrl() {
  try {
    const response = await fetch(GAME_DEFINITION_URL);
    if (!response.ok) {
      return FALLBACK_BOARD_LAYOUT_URL;
    }
    const gameDefinition = await response.json();
    const layoutPath = gameDefinition?.ui?.defaultBoardLayout;
    return typeof layoutPath === "string" && layoutPath.length > 0
      ? `${RULESET_BASE_URL}/${layoutPath}`
      : FALLBACK_BOARD_LAYOUT_URL;
  } catch {
    return FALLBACK_BOARD_LAYOUT_URL;
  }
}

async function resolvePresentationCatalogUrl() {
  try {
    const response = await fetch(GAME_DEFINITION_URL);
    if (!response.ok) {
      return FALLBACK_PRESENTATION_CATALOG_URL;
    }
    const gameDefinition = await response.json();
    const catalogPath = gameDefinition?.ui?.defaultPresentationCatalog;
    return typeof catalogPath === "string" && catalogPath.length > 0
      ? `${RULESET_BASE_URL}/${catalogPath}`
      : (RULESET_ID === "sample-duel" ? FALLBACK_PRESENTATION_CATALOG_URL : null);
  } catch {
    return RULESET_ID === "sample-duel" ? FALLBACK_PRESENTATION_CATALOG_URL : null;
  }
}

async function resolvePreviewFixturesUrl() {
  try {
    const response = await fetch(GAME_DEFINITION_URL);
    if (!response.ok) {
      return FALLBACK_PREVIEW_FIXTURES_URL;
    }
    const gameDefinition = await response.json();
    const fixturePath = gameDefinition?.ui?.defaultPreviewFixture;
    return typeof fixturePath === "string" && fixturePath.length > 0
      ? `${RULESET_BASE_URL}/${fixturePath}`
      : FALLBACK_PREVIEW_FIXTURES_URL;
  } catch {
    return FALLBACK_PREVIEW_FIXTURES_URL;
  }
}

function applyPlayAreaFromBoardLayout(boardLayout) {
  const width = Number(boardLayout?.logicalSize?.width);
  const height = Number(boardLayout?.logicalSize?.height);
  const minScale = Number(boardLayout?.scaling?.minScale);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    PLAY_AREA = {
      width,
      height,
      minScale: Number.isFinite(minScale) && minScale > 0 ? minScale : PLAY_AREA.minScale
    };
    dom.arena?.style.setProperty("--play-area-width", `${Math.round(width)}px`);
    dom.arena?.style.setProperty("--play-area-height", `${Math.round(height)}px`);
    window.dispatchEvent(new Event("resize"));
  }
}

function layoutTokensFromBoardLayout(boardLayout) {
  const tokens = boardLayout && typeof boardLayout === "object" ? boardLayout.tokens : null;
  return normalizeLayout({
    version: 1,
    ...(tokens && typeof tokens === "object" ? tokens : {})
  });
}

function layoutTokensForDocument(layout) {
  return mergeKnownLayoutTokens(layout, {});
}

function mergeKnownLayoutTokens(layout, existingTokens = {}) {
  const preservedTokens = existingTokens && typeof existingTokens === "object" && !Array.isArray(existingTokens)
    ? cloneJson(existingTokens)
    : {};
  const normalized = normalizeLayout(layout);
  for (const group of ["arena", "player", "zones", "center", "card"]) {
    const preservedGroup = preservedTokens[group] && typeof preservedTokens[group] === "object" && !Array.isArray(preservedTokens[group])
      ? preservedTokens[group]
      : {};
    preservedTokens[group] = {
      ...preservedGroup,
      ...cloneJson(normalized[group])
    };
  }
  return preservedTokens;
}

function loadBoardLayoutDraft() {
  try {
    const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(LAYOUT_STORAGE_KEY);
    return null;
  }
}

function loadLayoutSnapEnabled() {
  try {
    return localStorage.getItem(LAYOUT_SNAP_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function isBoardLayoutDocument(value) {
  return Boolean(
    value
    && typeof value === "object"
    && (
      value.kind === "board_layout"
      || value.logicalSize
      || value.scaling
      || value.tokens
      || Array.isArray(value.regions)
      || Array.isArray(value.widgets)
    )
  );
}

function normalizeBoardLayoutDocument(value, fallback = null) {
  const base = fallback
    ? cloneJson(fallback)
    : buildDefaultBoardLayoutDocument();

  if (!value || typeof value !== "object") {
    return base;
  }

  if (!isBoardLayoutDocument(value)) {
    base.tokens = mergeKnownLayoutTokens(normalizeLayout(value, { fitRows: true }), base.tokens);
    return base;
  }

  const next = {
    ...base,
    ...cloneJson(value)
  };
  next.kind = "board_layout";
  next.id = typeof next.id === "string" && next.id ? next.id : base.id;
  next.version = typeof next.version === "string" && next.version ? next.version : base.version;
  next.logicalSize = normalizeLogicalSize(next.logicalSize, base.logicalSize);
  next.scaling = normalizeScaling(next.scaling, base.scaling);
  next.tokens = mergeKnownLayoutTokens(layoutTokensFromBoardLayout(next), next.tokens);
  next.regions = Array.isArray(next.regions) ? next.regions.filter((region) => region && typeof region === "object") : [];
  next.widgets = Array.isArray(next.widgets) ? next.widgets.filter((widget) => widget && typeof widget === "object") : [];
  return next;
}

function normalizeLogicalSize(value, fallback) {
  const width = Number(value?.width);
  const height = Number(value?.height);
  return {
    width: Number.isFinite(width) && width > 0 ? Math.round(width) : fallback.width,
    height: Number.isFinite(height) && height > 0 ? Math.round(height) : fallback.height
  };
}

function normalizeScaling(value, fallback) {
  const minScale = Number(value?.minScale);
  const maxScale = Number(value?.maxScale);
  return {
    mode: typeof value?.mode === "string" ? value.mode : fallback.mode,
    minScale: Number.isFinite(minScale) && minScale > 0 ? minScale : fallback.minScale,
    maxScale: Number.isFinite(maxScale) && maxScale > 0 ? maxScale : fallback.maxScale
  };
}

function buildDefaultBoardLayoutDocument() {
  return {
    id: "local-board-layout",
    version: "0.1.0",
    kind: "board_layout",
    metadata: {
      name: "Local Board Layout",
      description: "Browser-authored board layout draft."
    },
    logicalSize: {
      width: PLAY_AREA.width,
      height: PLAY_AREA.height
    },
    scaling: {
      mode: "fit_viewport",
      minScale: PLAY_AREA.minScale,
      maxScale: 1
    },
    tokens: layoutTokensForDocument(DEFAULT_LAYOUT),
    propertyDisplay: { slots: [], icons: [] },
    regions: [],
    widgets: []
  };
}

function ensureBoardLayoutDocument() {
  if (!boardLayoutDocument) {
    boardLayoutDocument = normalizeBoardLayoutDocument(authoredBoardLayoutDocument);
  }
  boardLayoutDocument.regions ??= [];
  boardLayoutDocument.widgets ??= [];
  return boardLayoutDocument;
}

function exportBoardLayoutDocument() {
  const document = cloneJson(ensureBoardLayoutDocument());
  document.logicalSize = {
    width: PLAY_AREA.width,
    height: PLAY_AREA.height
  };
  document.scaling = normalizeScaling(document.scaling, {
    mode: "fit_viewport",
    minScale: PLAY_AREA.minScale,
    maxScale: 1
  });
  document.tokens = mergeKnownLayoutTokens(layoutState, document.tokens);
  return document;
}

function importBoardLayoutDraft(value) {
  const importingBoardLayoutDocument = isBoardLayoutDocument(value);
  const nextDocument = normalizeBoardLayoutDocument(value, boardLayoutDocument ?? authoredBoardLayoutDocument);
  boardLayoutDocument = nextDocument;
  applyPlayAreaFromBoardLayout(nextDocument);
  layoutState = layoutTokensFromBoardLayout(nextDocument);
  ensureSelectedLayoutRegion();
  renderLayoutControls();
  applyLayout({ syncRegions: !importingBoardLayoutDocument });
  saveLayout();
  syncLayoutEditor();
  annotateStaticLayoutRegions();
  render();
}

async function handleLayoutTemplateAction(action) {
  if (action !== "apply") {
    return;
  }

  const select = dom.layoutControls?.querySelector("[data-layout-template-select]");
  const templateId = select?.value || layoutTemplateIdForDocument(boardLayoutDocument) || "ruleset-default";
  const template = BOARD_LAYOUT_TEMPLATES.find((candidate) => candidate.id === templateId) ?? BOARD_LAYOUT_TEMPLATES[0];
  try {
    setLayoutStatus(`Loading ${template.label} layout.`);
    const templateDocument = await loadBoardLayoutTemplate(template);
    importBoardLayoutDraft(templateDocument);
    setLayoutStatus(`Applied ${template.label} layout as a local draft.`);
  } catch (error) {
    setLayoutStatus(error instanceof Error ? error.message : `Could not load ${template.label} layout.`);
  }
}

async function loadBoardLayoutTemplate(template) {
  if (template?.source === "authored") {
    if (!authoredBoardLayoutDocument) {
      throw new Error("Ruleset default layout is still loading.");
    }
    return cloneJson(authoredBoardLayoutDocument);
  }

  if (!template?.url) {
    throw new Error("Layout template is missing a source URL.");
  }

  const response = await fetch(template.url);
  if (!response.ok) {
    throw new Error(`Layout template request failed: ${response.status}`);
  }
  return await response.json();
}

function layoutTemplateIdForDocument(document) {
  const documentId = typeof document?.id === "string" ? document.id : "";
  const matched = BOARD_LAYOUT_TEMPLATES.find((template) => template.layoutId === documentId);
  if (matched) {
    return matched.id;
  }
  if (authoredBoardLayoutDocument && documentId === authoredBoardLayoutDocument.id) {
    return "ruleset-default";
  }
  return null;
}

function applyPresentationCatalog(catalog) {
  if (!catalog || typeof catalog !== "object") {
    return;
  }

  presentationCatalog = catalog;
  presentationCatalogId = typeof catalog.id === "string" ? catalog.id : "ruleset";
  dom.arena?.setAttribute("data-presentation-catalog", presentationCatalogId);

  const nextCardDefs = cloneJson(FALLBACK_CARD_DEFS);
  for (const section of ["cards", "equipment", "minions"]) {
    const entries = Array.isArray(catalog[section]) ? catalog[section] : [];
    entries.forEach((entry) => {
      const definition = presentationObjectToCardDef(entry);
      if (definition) {
        nextCardDefs[entry.templateId] = definition;
      }
    });
  }
  CARD_DEFS = nextCardDefs;

  const nextHeroDefs = cloneJson(FALLBACK_HERO_DEFS);
  const heroes = Array.isArray(catalog.heroes) ? catalog.heroes : [];
  heroes.forEach((hero) => {
    const definition = presentationHeroToHeroDef(hero);
    if (definition) {
      nextHeroDefs[hero.playerId] = definition;
    }
  });
  HERO_DEFS = nextHeroDefs;

  if (assetManifest) {
    assetUsageIndex = buildAssetUsageIndex();
    renderAssetLibrary();
  }
  renderCardStudio();
}

function loadPresentationCatalogDraft() {
  try {
    const stored = localStorage.getItem(PRESENTATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(PRESENTATION_STORAGE_KEY);
    return null;
  }
}

function presentationObjectToCardDef(entry) {
  if (!entry || typeof entry !== "object" || typeof entry.templateId !== "string") {
    return null;
  }

  return {
    name: entry.name ?? entry.templateId,
    manaCost: entry.properties?.manaCost,
    stats: entry.properties?.stats,
    metadata: entry.properties?.metadata && typeof entry.properties.metadata === "object" && !Array.isArray(entry.properties.metadata)
      ? entry.properties.metadata
      : undefined,
    text: entry.text ?? "",
    action: entry.action ?? "",
    art: entry.assets?.art,
    frame: entry.assets?.frame,
    artFit: entry.layout?.artFit,
    artPositionX: entry.layout?.artPositionX,
    artPositionY: entry.layout?.artPositionY,
    artHeight: entry.layout?.artHeight,
    display: entry.properties?.display ?? []
  };
}

function presentationHeroToHeroDef(hero) {
  if (!hero || typeof hero !== "object" || typeof hero.playerId !== "string") {
    return null;
  }

  return {
    name: hero.name ?? PLAYER_NAMES[hero.playerId] ?? hero.playerId,
    title: hero.title ?? "Hero",
    art: hero.assets?.art,
    frame: hero.assets?.frame,
    artFit: hero.layout?.artFit,
    artPositionX: hero.layout?.artPositionX,
    artPositionY: hero.layout?.artPositionY,
    artHeight: hero.layout?.artHeight,
    ability: hero.ability
      ? {
          name: hero.ability.name,
          behaviorId: hero.ability.behaviorId,
          text: hero.ability.text ?? "",
          action: hero.ability.action,
          targetMode: hero.ability.targetMode,
          display: hero.ability.display ?? [],
          manaCost: hero.ability.manaCost ?? 0
        }
      : null
  };
}

function saveLayout() {
  localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(exportBoardLayoutDocument()));
}

function cloneLayout(layout) {
  return cloneJson(layout);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeLayout(layout, options = {}) {
  const normalized = mergeLayout(cloneLayout(DEFAULT_LAYOUT), layout && typeof layout === "object" ? layout : {});

  Object.entries(LAYOUT_LIMITS).forEach(([group, limits]) => {
    Object.entries(limits).forEach(([key, [min, max]]) => {
      normalized[group][key] = clampNumber(Number(normalized[group][key]), min, max, DEFAULT_LAYOUT[group][key]);
    });
  });

  if (options.fitRows || totalRowHeight(normalized) > availableRowHeight(normalized)) {
    fitRowsToAvailable(normalized);
  }

  return normalized;
}

function mergeLayout(target, source) {
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && target[key] && typeof target[key] === "object") {
      mergeLayout(target[key], value);
      return;
    }
    target[key] = value;
  });
  return target;
}

function clampNumber(value, min, max, fallback) {
  const safeValue = Number.isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, safeValue));
}

function totalRowHeight(layout) {
  return layout.arena.opponentRow + layout.arena.centerRow + layout.arena.playerRow;
}

function availableRowHeight(layout) {
  return PLAY_AREA.height - layout.arena.padding * 2 - layout.arena.rowGap * 2;
}

function fitRowsToAvailable(layout) {
  const rows = ["opponentRow", "centerRow", "playerRow"];
  const target = availableRowHeight(layout);
  const minimums = rows.map((row) => LAYOUT_LIMITS.arena[row][0]);
  const minTotal = minimums.reduce((sum, value) => sum + value, 0);
  const remaining = Math.max(0, target - minTotal);
  const flex = rows.map((row, index) => Math.max(0, layout.arena[row] - minimums[index]));
  const flexTotal = flex.reduce((sum, value) => sum + value, 0) || 1;

  rows.forEach((row, index) => {
    layout.arena[row] = Math.round(minimums[index] + (flex[index] / flexTotal) * remaining);
  });

  const drift = Math.round(target - totalRowHeight(layout));
  layout.arena.playerRow += drift;
}

function getLayoutValue(path) {
  return path.split(".").reduce((value, key) => value?.[key], layoutState);
}

function setLayoutValue(path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  const target = keys.reduce((current, key) => current[key], layoutState);
  target[lastKey] = value;
  layoutState = normalizeLayout(layoutState);
}

function commitLayoutChange(message = "") {
  applyLayout({ syncRegions: true });
  saveLayout();
  syncLayoutEditor();
  if (message) {
    setLayoutStatus(message);
  }
}

function commitBoardLayoutDocumentChange(message = "", options = {}) {
  saveLayout();
  renderLayoutRegionGuides();
  renderLayoutRegionEditor({ preserveDetailFocus: Boolean(options.preserveDetailFocus) });
  syncLayoutJson();
  if (shouldRenderAbsolutePreviewBoard()) {
    render();
  }
  if (message) {
    setLayoutStatus(message);
  }
}

function resetBoardLayoutDraft() {
  boardLayoutDocument = normalizeBoardLayoutDocument(authoredBoardLayoutDocument);
  applyPlayAreaFromBoardLayout(boardLayoutDocument);
  layoutState = layoutTokensFromBoardLayout(boardLayoutDocument);
  selectedLayoutRegionId = "";
  localStorage.removeItem(LAYOUT_STORAGE_KEY);
  ensureSelectedLayoutRegion();
  renderLayoutControls();
  applyLayout();
  syncLayoutEditor();
  annotateStaticLayoutRegions();
  render();
  setLayoutStatus("Layout reset to the ruleset default.");
}

function applyLayout(options = {}) {
  if (!dom.arena) {
    return;
  }

  layoutState = normalizeLayout(layoutState);
  if (options.syncRegions) {
    syncRegionGeometriesFromLayoutTokens();
  }
  const { arena, player, zones, center, card } = layoutState;
  const setPx = (name, value) => dom.arena.style.setProperty(name, `${Math.round(value)}px`);
  const handleA = arena.padding + arena.opponentRow + arena.rowGap / 2;
  const centerTop = arena.padding + arena.opponentRow + arena.rowGap;
  const handleB = centerTop + arena.centerRow + arena.rowGap / 2;

  setPx("--arena-padding", arena.padding);
  setPx("--arena-row-gap", arena.rowGap);
  setPx("--row-opponent", arena.opponentRow);
  setPx("--row-center", arena.centerRow);
  setPx("--row-player", arena.playerRow);
  setPx("--player-hero-width", player.heroWidth);
  setPx("--player-gap", player.gap);
  setPx("--zone-board-width", zones.boardWidth);
  setPx("--zone-gap", zones.gap);
  setPx("--center-turn-width", center.turnWidth);
  setPx("--center-gap", center.gap);
  setPx("--card-width", card.width);
  setPx("--card-art-height", card.artHeight);
  setPx("--handle-row-a", handleA);
  setPx("--handle-row-b", handleB);
  setPx("--handle-hero-col", arena.padding + player.heroWidth + player.gap / 2);
  setPx("--handle-center-col", arena.padding + center.turnWidth + center.gap / 2);
  setPx("--center-row-top", centerTop);
  setPx("--center-row-height", arena.centerRow);
  renderLayoutRegionGuides();
}

function syncRegionGeometriesFromLayoutTokens() {
  const document = ensureBoardLayoutDocument();
  document.tokens = mergeKnownLayoutTokens(layoutState, document.tokens);
  document.regions.forEach((region) => {
    const tokenGeometry = layoutTokenGeometry(region?.id);
    if (tokenGeometry) {
      region.geometry = tokenGeometry;
    }
  });
}

function syncLayoutEditor() {
  if (!dom.layoutJson) {
    return;
  }

  LAYOUT_CONTROLS.forEach((control) => {
    const value = Math.round(getLayoutValue(control.path));
    document.querySelectorAll(`[data-layout-path="${CSS.escape(control.path)}"]`).forEach((input) => {
      if (document.activeElement !== input) {
        input.value = String(value);
      }
    });
    document.querySelectorAll(`[data-layout-output="${CSS.escape(control.path)}"]`).forEach((output) => {
      output.textContent = `${value}${control.unit}`;
    });
  });

  renderLayoutRegionEditor({ preserveDetailFocus: true });
  syncLayoutJson();
}

function syncLayoutJson() {
  if (!dom.layoutJson) {
    return;
  }
  if (document.activeElement !== dom.layoutJson) {
    dom.layoutJson.value = JSON.stringify(exportBoardLayoutDocument(), null, 2);
  }
}

function setLayoutStatus(message) {
  if (dom.layoutEditorStatus) {
    dom.layoutEditorStatus.textContent = message;
  }
}

function startLayoutDrag(event) {
  if (!layoutEditorOpen) {
    return;
  }

  event.preventDefault();
  activeLayoutDrag = {
    handle: event.currentTarget.dataset.layoutHandle
  };
  capturePointer(event.currentTarget, event.pointerId);
}

function startLayoutRegionDrag(event) {
  if (!layoutEditorOpen || event.button !== 0) {
    return;
  }

  const resizeHandle = event.target.closest("[data-layout-region-resize]");
  const regionBox = event.target.closest("[data-region-id]");
  const regionId = resizeHandle?.dataset.layoutRegionResize ?? regionBox?.dataset.regionId;
  const region = layoutRegionById(regionId);
  if (!region) {
    return;
  }

  const point = layoutEditorPointFromEvent(event);
  const geometry = currentLayoutRegionGeometry(region);
  if (!point || !geometry) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectLayoutRegion(regionId);
  activeRegionDrag = {
    type: resizeHandle ? "resize" : "move",
    regionId,
    startPoint: point,
    startGeometry: geometry
  };
  capturePointer(event.target, event.pointerId);
}

function capturePointer(element, pointerId) {
  try {
    element?.setPointerCapture?.(pointerId);
  } catch {
    // Pointer capture can fail in synthetic or interrupted pointer streams.
  }
}

function updateLayoutDrag(event) {
  if (activeRegionDrag) {
    updateLayoutRegionDrag(event);
    return;
  }

  if (!activeLayoutDrag) {
    return;
  }

  event.preventDefault();
  const point = layoutEditorPointFromEvent(event);
  if (!point) {
    return;
  }

  if (activeLayoutDrag.handle === "row-a") {
    resizeUpperRows(point.y);
  } else if (activeLayoutDrag.handle === "row-b") {
    resizeLowerRows(point.y);
  } else if (activeLayoutDrag.handle === "hero-col") {
    layoutState.player.heroWidth = point.x - layoutState.arena.padding - layoutState.player.gap / 2;
  } else if (activeLayoutDrag.handle === "center-col") {
    layoutState.center.turnWidth = point.x - layoutState.arena.padding - layoutState.center.gap / 2;
  }

  commitLayoutChange();
}

function updateLayoutRegionDrag(event) {
  event.preventDefault();
  const point = layoutEditorPointFromEvent(event);
  const region = layoutRegionById(activeRegionDrag.regionId);
  if (!point || !region) {
    return;
  }

  const dx = point.x - activeRegionDrag.startPoint.x;
  const dy = point.y - activeRegionDrag.startPoint.y;
  const start = activeRegionDrag.startGeometry;
  if (activeRegionDrag.type === "resize") {
    setLayoutRegionGeometry(region, {
      x: start.x,
      y: start.y,
      width: start.width + dx,
      height: start.height + dy
    });
  } else {
    setLayoutRegionGeometry(region, {
      x: start.x + dx,
      y: start.y + dy,
      width: start.width,
      height: start.height
    });
  }

  commitBoardLayoutDocumentChange("", { preserveDetailFocus: false });
}

function finishLayoutDrag() {
  if (activeRegionDrag) {
    activeRegionDrag = null;
    setLayoutStatus("Region geometry updated.");
  }
  activeLayoutDrag = null;
}

function arenaPointFromEvent(event) {
  if (!dom.arena) {
    return null;
  }

  const rect = dom.arena.getBoundingClientRect();
  const scale = Number(dom.arena.dataset.scale) || rect.width / PLAY_AREA.width || 1;
  return {
    x: (event.clientX - rect.left) / scale,
    y: (event.clientY - rect.top) / scale
  };
}

function layoutEditorPointFromEvent(event) {
  const point = arenaPointFromEvent(event);
  if (!point || !layoutSnapEnabled) {
    return point;
  }
  return {
    x: snapLayoutValue(point.x),
    y: snapLayoutValue(point.y)
  };
}

function resizeUpperRows(y) {
  const arena = layoutState.arena;
  const combined = arena.opponentRow + arena.centerRow;
  arena.opponentRow = y - arena.padding - arena.rowGap / 2;
  arena.opponentRow = clampNumber(
    arena.opponentRow,
    LAYOUT_LIMITS.arena.opponentRow[0],
    Math.min(LAYOUT_LIMITS.arena.opponentRow[1], combined - LAYOUT_LIMITS.arena.centerRow[0]),
    DEFAULT_LAYOUT.arena.opponentRow
  );
  arena.centerRow = combined - arena.opponentRow;
}

function resizeLowerRows(y) {
  const arena = layoutState.arena;
  const combined = arena.centerRow + arena.playerRow;
  arena.centerRow = y - arena.padding - arena.opponentRow - arena.rowGap * 1.5;
  arena.centerRow = clampNumber(
    arena.centerRow,
    LAYOUT_LIMITS.arena.centerRow[0],
    Math.min(LAYOUT_LIMITS.arena.centerRow[1], combined - LAYOUT_LIMITS.arena.playerRow[0]),
    DEFAULT_LAYOUT.arena.centerRow
  );
  arena.playerRow = combined - arena.centerRow;
}

function render() {
  dom.refreshButton.disabled = previewMode || !matchId;
  dom.endTurnButton.disabled = previewMode || !canSelectedPlayerAct();
  dom.selectP1.classList.toggle("selected", selectedPlayerId === "p1");
  dom.selectP2.classList.toggle("selected", selectedPlayerId === "p2");
  dom.previewPanelButton?.classList.toggle("selected", previewPanelOpen || previewMode);
  const absolutePreview = shouldRenderAbsolutePreviewBoard();
  dom.arena?.classList.toggle("absolute-preview-active", absolutePreview);

  if (!state) {
    dom.matchLine.textContent = RULESET_ID === "sample-duel"
      ? "Start a match to play a basic 1v1 engine demo."
      : "Open Preview to inspect this ruleset layout.";
    dom.turnText.textContent = "No match";
    dom.statusText.textContent = "Waiting";
    dom.p1Panel.innerHTML = "";
    dom.p2Panel.innerHTML = "";
    if (dom.absolutePreviewBoard) {
      dom.absolutePreviewBoard.innerHTML = "";
    }
    dom.battleLog.innerHTML = "";
    renderActionPanel();
    selectedAction = null;
    return;
  }

  const activePlayerId = state.turn.activePlayerId ?? "p1";
  if (previewMode && activePreviewFixture) {
    dom.matchLine.textContent = `${activePreviewFixture.label} · ${labelFromId(activePreviewFixture.focus)} preview`;
    dom.turnText.textContent = `${PLAYER_NAMES[activePlayerId] ?? activePlayerId} preview`;
    dom.statusText.innerHTML = `<span class="result">Read-only fixture</span>`;
  } else {
    dom.matchLine.textContent = `${matchId} · sequence ${state.lastSequence}`;
    dom.turnText.textContent = `${PLAYER_NAMES[activePlayerId] ?? activePlayerId} to act`;
    dom.statusText.innerHTML = state.status === "completed" ? `<span class="result">Completed</span>` : `Phase ${state.turn.phaseId ?? "setup"}`;
  }

  renderActionPanel();
  if (absolutePreview) {
    dom.absolutePreviewBoard.innerHTML = renderAbsolutePreviewBoard();
    dom.p2Panel.innerHTML = "";
    dom.p1Panel.innerHTML = "";
  } else {
    if (dom.absolutePreviewBoard) {
      dom.absolutePreviewBoard.innerHTML = "";
    }
    dom.p2Panel.innerHTML = renderPlayer("p2");
    dom.p1Panel.innerHTML = renderPlayer("p1");
  }
  bindActionButtons();
  bindNaturalActions();
  bindTooltips();
  paintSelectionState();
  renderLog();
}

function shouldRenderAbsolutePreviewBoard() {
  return previewMode && Boolean(state) && (Object.keys(state.players ?? {}).length > 2 || boardLayoutDocument?.id === "sanguosha-eight-player-board");
}

function renderActionPanel() {
  if (!dom.promptSummary) {
    return;
  }

  const prompt = openPromptForActionPanel();
  if (!state || !prompt) {
    dom.promptSummary.innerHTML = "";
    dom.promptSummary.removeAttribute("data-prompt-id");
    dom.promptSummary.removeAttribute("data-prompt-type");
    return;
  }

  const responder = currentPromptResponder(prompt);
  const actions = Array.isArray(prompt.payload?.actions) ? prompt.payload.actions : [];
  const allowedResponseBehaviors = Array.isArray(prompt.payload?.allowedResponseBehaviors) ? prompt.payload.allowedResponseBehaviors : [];
  const answeredCount = Array.isArray(prompt.answeredResponderIds) ? prompt.answeredResponderIds.length : 0;
  const responderCount = Array.isArray(prompt.responderIds) ? prompt.responderIds.length : 0;
  dom.promptSummary.dataset.promptId = prompt.id;
  dom.promptSummary.dataset.promptType = prompt.promptType;
  dom.promptSummary.innerHTML = `
    <div class="prompt-main">
      <span class="prompt-label">${escapeHtml(labelFromId(prompt.promptType))}</span>
      <strong>${escapeHtml(PLAYER_NAMES[responder] ?? responder ?? "Responder")}</strong>
      <span class="prompt-meta">${escapeHtml(promptMeta(prompt, answeredCount, responderCount))}</span>
    </div>
    <div class="prompt-responders">
      ${renderPromptResponders(prompt)}
    </div>
    <div class="prompt-actions">
      ${actions.map((action) => renderPromptAction(action, responder)).join("")}
      ${allowedResponseBehaviors.map((behaviorId) => renderPromptResponseBehavior(prompt, behaviorId, responder)).join("")}
      ${renderPromptPassAction(prompt, responder, actions)}
    </div>
  `;
}

function openPromptForActionPanel() {
  if (!state?.prompts) {
    return null;
  }

  return Object.values(state.prompts)
    .filter((prompt) => prompt?.status === "open")
    .sort((left, right) => Number(right.openedAtSequence ?? 0) - Number(left.openedAtSequence ?? 0))[0] ?? null;
}

function currentPromptResponder(prompt) {
  return prompt.currentResponderId ?? prompt.responderIds?.find((responderId) => !prompt.answeredResponderIds?.includes(responderId)) ?? prompt.responderIds?.[0] ?? state?.turn?.activePlayerId;
}

function promptMeta(prompt, answeredCount, responderCount) {
  const mode = labelFromId(prompt.responseMode ?? "single");
  if (responderCount > 1) {
    return `${mode} · ${answeredCount}/${responderCount}`;
  }
  return mode;
}

function renderPromptResponders(prompt) {
  const responderIds = Array.isArray(prompt.responderIds) ? prompt.responderIds : [];
  if (responderIds.length === 0) {
    return `<span class="prompt-responder muted">No responders</span>`;
  }

  return responderIds.map((responderId) => {
    const status = prompt.currentResponderId === responderId
      ? "current"
      : prompt.passedResponderIds?.includes(responderId)
        ? "passed"
        : prompt.answeredResponderIds?.includes(responderId)
          ? "answered"
          : "waiting";
    return `
      <span class="prompt-responder ${escapeAttr(status)}" data-responder-status="${escapeAttr(status)}">
        ${escapeHtml(PLAYER_NAMES[responderId] ?? labelFromId(responderId))}
      </span>
    `;
  }).join("");
}

function renderPromptAction(action, responder) {
  const label = labelFromId(action);
  if (action === "end_turn") {
    const disabled = previewMode || !responder || selectedPlayerId !== responder || !canPlayerAct(responder);
    return `<button class="prompt-chip" type="button" data-prompt-action="end_turn" ${disabled ? "disabled" : ""}>${escapeHtml(label)}</button>`;
  }
  return `<span class="prompt-chip passive">${escapeHtml(label)}</span>`;
}

function renderPromptResponseBehavior(prompt, behaviorId, responder) {
  if (typeof behaviorId !== "string" || behaviorId.length === 0) {
    return "";
  }

  const disabled = !canAnswerPrompt(prompt, responder);
  return `
    <button
      class="prompt-chip"
      type="button"
      data-prompt-action="response_behavior"
      data-prompt-id="${escapeAttr(prompt.id)}"
      data-prompt-responder="${escapeAttr(responder ?? "")}"
      data-behavior-id="${escapeAttr(behaviorId)}"
      ${disabled ? "disabled" : ""}
    >${escapeHtml(labelFromId(behaviorId))}</button>
  `;
}

function renderPromptPassAction(prompt, responder, actions) {
  const hasExplicitEndTurn = Array.isArray(actions) && actions.includes("end_turn");
  const hasResponseBehaviors = Array.isArray(prompt.payload?.allowedResponseBehaviors) && prompt.payload.allowedResponseBehaviors.length > 0;
  const shouldShowPass = !hasExplicitEndTurn && (hasResponseBehaviors || prompt.promptType !== "main_action" || prompt.responseMode !== "single");
  if (!shouldShowPass) {
    return "";
  }

  const disabled = !canAnswerPrompt(prompt, responder);
  return `
    <button
      class="prompt-chip ghost-chip"
      type="button"
      data-prompt-action="answer_pass"
      data-prompt-id="${escapeAttr(prompt.id)}"
      data-prompt-responder="${escapeAttr(responder ?? "")}"
      ${disabled ? "disabled" : ""}
    >Pass</button>
  `;
}

function canAnswerPrompt(prompt, responder) {
  if (previewMode || !state || !prompt || prompt.status !== "open" || !responder) {
    return false;
  }

  if (!prompt.responderIds?.includes(responder)) {
    return false;
  }

  return !prompt.currentResponderId || prompt.currentResponderId === responder;
}

function renderAbsolutePreviewBoard() {
  const regions = Array.isArray(boardLayoutDocument?.regions) ? boardLayoutDocument.regions : [];
  if (regions.length === 0) {
    return `<div class="absolute-empty">No authored board regions</div>`;
  }

  return regions.map((region) => renderAbsolutePreviewRegion(region)).join("");
}

function renderAbsolutePreviewRegion(region) {
  if (!region || typeof region !== "object" || typeof region.id !== "string") {
    return "";
  }

  const geometry = layoutGuideGeometry(region);
  if (!geometry) {
    return "";
  }

  const metadata = layoutRegionMetadata(region.id);
  const style = `left: ${geometry.x}px; top: ${geometry.y}px; width: ${geometry.width}px; height: ${geometry.height}px;`;
  const content = renderAbsoluteRegionContent(metadata);
  return `
    <section
      class="absolute-region absolute-region-${escapeAttr(metadata.kind)}"
      ${layoutRegionAttrs(metadata.id)}
      style="${style}"
      aria-label="${escapeAttr(metadata.label)}"
    >
      ${content}
    </section>
  `;
}

function renderAbsoluteRegionContent(region) {
  const renderer = ABSOLUTE_WIDGET_RENDERERS[region.component] ?? ABSOLUTE_WIDGET_RENDERERS.CustomWidget;
  return renderer(region);
}

function zoneIdForAbsoluteCollection(region) {
  if (region.kind === "hand") {
    return `zone_hand_${selectedPlayerId}`;
  }
  if (region.kind === "equipment") {
    return `zone_equipment_${selectedPlayerId}`;
  }
  if (region.kind === "judgment") {
    return `zone_judgment_${selectedPlayerId}`;
  }
  return `zone_${region.kind}_${selectedPlayerId}`;
}

function renderAbsoluteWidgetFallback(region, message) {
  return `
    <div class="widget-fallback">
      <strong>${escapeHtml(region.label)}</strong>
      <span>${escapeHtml(region.component || "CustomWidget")}</span>
      <small>${escapeHtml(message)}</small>
    </div>
  `;
}

function renderIdentitySeat(region) {
  const playerId = playerIdForSeatRegion(region.id);
  const player = playerId ? state.players?.[playerId] : null;
  if (!player) {
    return `<strong>${escapeHtml(region.label)}</strong><span class="identity-muted">Empty seat</span>`;
  }

  const role = identityRoleView(player);
  const health = player.resources?.health;
  const handCount = cardsInZone(`zone_hand_${playerId}`).length;
  const equipmentCount = cardsInZone(`zone_equipment_${playerId}`).length;
  const active = state.turn?.activePlayerId === playerId;
  const viewer = activePreviewFixture?.viewerId ?? selectedPlayerId;

  return `
    <div
      class="identity-seat ${active ? "active-seat" : ""} ${player.status !== "alive" ? "dim-seat" : ""}"
      data-role-visibility="${escapeAttr(role.visibility)}"
      data-seat-status="${escapeAttr(player.status ?? "unknown")}"
    >
      <div class="identity-seat-head">
        <strong>${escapeHtml(PLAYER_NAMES[playerId] ?? labelFromId(playerId))}</strong>
        ${renderIdentityRoleBadge(role)}
      </div>
      <div class="identity-seat-stats">
        <span>HP ${escapeHtml(health ? `${health.current}/${health.max ?? health.current}` : "-")}</span>
        <span>Hand ${handCount}</span>
        <span>Equip ${equipmentCount}</span>
      </div>
      <small>${escapeHtml(playerId === viewer ? "Viewer" : labelFromId(player.status ?? "unknown"))}</small>
    </div>
  `;
}

function renderIdentityCardStrip(region, zoneId, fallbackLabel) {
  const objects = cardsInZone(zoneId);
  return `
    <div class="identity-strip">
      <strong>${escapeHtml(region.label || fallbackLabel)}</strong>
      <div class="identity-mini-cards">
        ${objects.map((object) => renderIdentityObjectChip(object)).join("") || `<span class="identity-muted">Empty</span>`}
      </div>
    </div>
  `;
}

function renderIdentityPile(region, zoneId, fallbackLabel) {
  const objects = cardsInZone(zoneId);
  const top = objects[objects.length - 1];
  return `
    <div class="identity-pile">
      <strong>${escapeHtml(region.label || fallbackLabel)}</strong>
      <span class="identity-pile-count">${objects.length}</span>
      <small>${top ? escapeHtml(objectDisplayName(top)) : "Empty"}</small>
    </div>
  `;
}

function renderIdentityPromptWindow(region) {
  const prompt = openPromptForActionPanel();
  if (!prompt) {
    return `<strong>${escapeHtml(region.label)}</strong><span class="identity-muted">No open prompt</span>`;
  }

  const responder = currentPromptResponder(prompt);
  const actions = Array.isArray(prompt.payload?.actions) ? prompt.payload.actions : [];
  const responseBehaviors = Array.isArray(prompt.payload?.allowedResponseBehaviors) ? prompt.payload.allowedResponseBehaviors : [];
  return `
    <div class="identity-prompt">
      <span class="prompt-label">${escapeHtml(labelFromId(prompt.promptType))}</span>
      <strong>${escapeHtml(PLAYER_NAMES[responder] ?? responder ?? "Responder")}</strong>
      <small>${escapeHtml(promptMeta(prompt, prompt.answeredResponderIds?.length ?? 0, prompt.responderIds?.length ?? 0))}</small>
      <div class="prompt-responders">${renderPromptResponders(prompt)}</div>
      <div class="prompt-actions">
        ${actions.map((action) => renderPromptAction(action, responder)).join("")}
        ${responseBehaviors.map((behaviorId) => renderPromptResponseBehavior(prompt, behaviorId, responder)).join("")}
        ${renderPromptPassAction(prompt, responder, actions)}
      </div>
    </div>
  `;
}

function renderIdentityRoleSummary(region) {
  const players = Object.values(state.players ?? {});
  return `
    <div class="identity-summary">
      <strong>${escapeHtml(region.label)}</strong>
      <div class="identity-summary-list">
        ${players.map((player) => renderIdentityPlayerSummaryRow(player)).join("")}
      </div>
    </div>
  `;
}

function renderIdentityPlayerSummaryRow(player) {
  const role = identityRoleView(player);
  const health = player.resources?.health;
  const handSize = player.resources?.hand_size;
  const handCount = handSize?.current ?? cardsInZone(`zone_hand_${player.id}`).length;
  return `
    <span
      class="identity-player-summary ${role.visibility === "hidden" ? "hidden-player-summary" : ""}"
      data-role-visibility="${escapeAttr(role.visibility)}"
      data-seat-status="${escapeAttr(player.status ?? "unknown")}"
    >
      <b>${escapeHtml(PLAYER_NAMES[player.id] ?? labelFromId(player.id))}</b>
      ${renderIdentityRoleBadge(role)}
      <small>${escapeHtml(health ? `HP ${health.current}/${health.max ?? health.current}` : "HP -")}</small>
      <small>${escapeHtml(`Hand ${handCount}`)}</small>
      <small>${escapeHtml(labelFromId(player.status ?? "unknown"))}</small>
    </span>
  `;
}

function renderIdentityHistory(region) {
  return `
    <div class="identity-history">
      <strong>${escapeHtml(region.label)}</strong>
      ${events.slice(-5).reverse().map((event) => `<span>${escapeHtml(logLine(event))}</span>`).join("") || `<span class="identity-muted">No events</span>`}
    </div>
  `;
}

function renderIdentityObjectChip(object) {
  const hidden = object?.objectType === "hidden";
  return `
    <span class="identity-object-chip ${hidden ? "hidden-object-chip" : ""}">
      ${escapeHtml(hidden ? "Hidden Card" : objectDisplayName(object))}
    </span>
  `;
}

function objectDisplayName(object) {
  if (!object || object.objectType === "hidden") {
    return "Hidden Card";
  }
  return CARD_DEFS[object.templateId]?.name ?? labelFromId(object.templateId ?? object.objectType ?? "object");
}

function identityRoleView(player) {
  const roleObject = player?.roleRef ? state.objects?.[player.roleRef] : null;
  const viewer = activePreviewFixture?.viewerId ?? selectedPlayerId;
  if (!roleObject || roleObject.objectType === "hidden") {
    return {
      label: "Unknown",
      title: "Hidden Role",
      visibility: "hidden"
    };
  }

  const ownerVisible = typeof roleObject.ownerId === "string" && roleObject.ownerId === viewer;
  const template = typeof roleObject.templateId === "string" ? roleObject.templateId : roleObject.objectType;
  return {
    label: labelFromId(template),
    title: ownerVisible ? "Your Role" : "Public Role",
    visibility: ownerVisible ? "owner" : "public"
  };
}

function renderIdentityRoleBadge(role) {
  return `
    <span
      class="identity-role-badge role-${escapeAttr(role.visibility)}"
      title="${escapeAttr(role.title)}"
      aria-label="${escapeAttr(`${role.title}: ${role.label}`)}"
    >
      <i aria-hidden="true">${escapeHtml(role.visibility === "hidden" ? "?" : role.label.slice(0, 1))}</i>
      <span>${escapeHtml(role.label)}</span>
    </span>
  `;
}

function playerIdForSeatRegion(regionId) {
  const match = String(regionId ?? "").match(/^seat_(\d+)/);
  return match ? `p${match[1]}` : null;
}

function renderPlayer(playerId) {
  const regionIds = runtimeRegionIdsForPlayer(playerId);
  const heroRegionId = regionIds.find((regionId) => layoutRegionMetadata(regionId).kind === "hero") ?? runtimeRegionIdForPlayer(playerId, "hero");
  const collectionRegionIds = regionIds.filter((regionId) => ["battlefield", "equipment", "hand", "deck"].includes(layoutRegionMetadata(regionId).kind));

  return `
    ${renderRuntimeRegion(heroRegionId, { playerId })}
    <section class="zones" data-region-group="${escapeAttr(playerId === "p2" ? "opponent" : "player")}">
      ${collectionRegionIds.map((regionId) => renderRuntimeRegion(regionId, { playerId })).join("")}
    </section>
  `;
}

function runtimeRegionIdsForPlayer(playerId) {
  const ownerScope = playerId === "p2" ? "opponent" : "player";
  const authored = Array.isArray(boardLayoutDocument?.regions)
    ? boardLayoutDocument.regions
      .filter((region) => region && typeof region === "object" && region.ownerScope === ownerScope && ["hero", "battlefield", "equipment", "hand", "deck"].includes(region.kind))
      .sort((left, right) => Number(left.geometry?.x ?? 0) - Number(right.geometry?.x ?? 0))
      .map((region) => region.id)
      .filter((regionId) => typeof regionId === "string" && regionId.length > 0)
    : [];

  const fallback = ["hero", "battlefield", "equipment", "hand", "deck"].map((kind) => runtimeRegionIdForPlayer(playerId, kind));
  return uniqueValues([...authored, ...fallback]);
}

function renderRuntimeRegion(regionId, context) {
  const region = layoutRegionMetadata(regionId);
  const renderer = RUNTIME_WIDGET_RENDERERS[region.component] ?? RUNTIME_WIDGET_RENDERERS.CustomWidget;
  return renderer(region, context);
}

function renderRuntimeWidgetFallback(region, message) {
  return `
    <section
      class="widget-fallback runtime-widget-fallback"
      ${layoutRegionAttrs(region.id)}
      tabindex="0"
      data-tooltip-title="${escapeAttr(region.label)}"
      data-tooltip-body="${escapeAttr(message)}"
      aria-label="${escapeAttr(`${region.label}. ${message}`)}"
    >
      <strong>${escapeHtml(region.label)}</strong>
      <span>${escapeHtml(region.component || "CustomWidget")}</span>
      <small>${escapeHtml(message)}</small>
    </section>
  `;
}

function customWidgetText(region) {
  const text = region.widgetConfig?.placeholder ?? region.widgetConfig?.description;
  return typeof text === "string" && text.length > 0
    ? text
    : "No renderer registered for this widget component yet.";
}

function renderBattlefieldRegion(playerId, region) {
  const opponentId = opponentOf(playerId);
  const zones = [
    { id: `zone_board_${playerId}`, label: "Board", behaviorId: "minion_attack", zoneKind: "board", target: opponentId }
  ];

  return `
    <div class="zone" ${layoutRegionAttrs(region.id, { targetArea: targetAreaForRegion(region) })}>
      <h3>${escapeHtml(region.label)}</h3>
      <div class="cards">
        ${zones.flatMap((zone) => cardsInZone(zone.id).map((object) => renderCard(playerId, object, zone))).join("") || `<div class="empty">No board pieces</div>`}
      </div>
    </div>
  `;
}

function renderEquipmentRegion(playerId, region) {
  const opponentId = opponentOf(playerId);
  const objects = cardsInZone(`zone_weapon_${playerId}`);

  return `
    <div class="equipment-slot" ${layoutRegionAttrs(region.id)}>
      <h3>${escapeHtml(region.label)}</h3>
      <div class="equipment-cards">
        ${objects.map((object) => renderCard(playerId, object, { zoneKind: "weapon", target: opponentId })).join("") || `<div class="empty equipment-empty">No weapon</div>`}
      </div>
    </div>
  `;
}

function renderHandRegion(playerId, region) {
  const opponentId = opponentOf(playerId);

  return `
    <div class="zone" ${layoutRegionAttrs(region.id)}>
      <h3>${escapeHtml(region.label)}</h3>
      <div class="cards">
        ${cardsInZone(`zone_hand_${playerId}`).map((object) => renderCard(playerId, object, { zoneKind: "hand", target: opponentId })).join("") || `<div class="empty">No cards</div>`}
      </div>
    </div>
  `;
}

function renderDeckRegion(playerId, region) {
  const deckCount = cardsInZone(`zone_deck_${playerId}`).length;
  const discardCount = cardsInZone("zone_discard").filter((object) => object.ownerId === playerId).length;
  const graveyardCount = cardsInZone("zone_graveyard").filter((object) => object.ownerId === playerId).length;
  const fatigue = state.players[playerId]?.resources?.fatigue?.current ?? 0;
  const tooltip = [
    `${region.label}: ${deckCount} cards remain`,
    `Discard: ${discardCount}`,
    `Graveyard: ${graveyardCount}`,
    `Fatigue: ${fatigue}`
  ].join("\n");

  return `
    <aside
      class="deck-stack"
      ${layoutRegionAttrs(region.id)}
      data-tooltip-title="${escapeAttr(region.label)}"
      data-tooltip-body="${escapeAttr(tooltip)}"
      tabindex="0"
      aria-label="${escapeAttr(`${region.label}. ${deckCount} cards remain.`)}"
    >
      <span class="deck-stack-top" aria-hidden="true"></span>
      <strong>${escapeHtml(deckCount)}</strong>
      <span>Deck</span>
      <small>${escapeHtml(discardCount + graveyardCount)} out</small>
    </aside>
  `;
}

function targetAreaForRegion(region) {
  return region.kind === "battlefield" && region.targetable ? "battlefield" : "";
}

function uniqueValues(values) {
  return Array.from(new Set(values));
}

function renderHeroCard(playerId, regionId = runtimeRegionIdForPlayer(playerId, "hero")) {
  const player = state.players[playerId];
  const hero = HERO_DEFS[playerId] ?? { name: PLAYER_NAMES[playerId] ?? playerId, title: "Hero", ability: null };
  const health = player.resources.health;
  const mana = player.resources.mana;
  const isActive = state.turn.activePlayerId === playerId;
  const ability = hero.ability ? actionForHero(playerId) : null;
  const disabled = !ability;
  const tooltip = [
    hero.title,
    `Health: ${health.current}/${health.max ?? health.current}`,
    `Mana: ${mana.current}/${mana.max ?? mana.current}`,
    hero.ability ? `${hero.ability.name}: ${hero.ability.text}` : "No hero ability"
  ].join("\n");

  return `
    <section
      class="hero hero-card ${isActive ? "active-hero" : ""} ${disabled ? "disabled-card" : ""}"
      ${layoutRegionAttrs(regionId)}
      ${heroPresentationStyle(hero)}
      data-target-player="${playerId}"
      data-target-kind="hero"
      ${actionDataAttrs(ability)}
      draggable="${ability ? "true" : "false"}"
      data-tooltip-title="${escapeAttr(hero.name)}"
      data-tooltip-body="${escapeAttr(tooltip)}"
      tabindex="0"
    >
      ${hero.ability ? renderDisplayProperties(hero.ability, {}, "hero-ability") : ""}
      <div class="hero-art" aria-hidden="true"></div>
      <div class="hero-title">
        <h2>${escapeHtml(hero.name)}</h2>
        ${isActive ? `<span class="active-badge">Active</span>` : `<span class="meta">${escapeHtml(player.status)}</span>`}
      </div>
      <div class="hero-subtitle">${escapeHtml(hero.title)}</div>
      <div class="resource-grid">
        <div class="resource stat-health" data-stat-icon="heart"><span class="meta">Health</span><strong class="${health.current <= 3 ? "danger" : ""}">${health.current}</strong></div>
        <div class="resource stat-mana" data-stat-icon="mana"><span class="meta">Mana</span><strong>${mana.current}/${mana.max ?? mana.current}</strong></div>
      </div>
      ${hero.ability ? `
        <div class="hero-ability-text">${renderRulesText(hero.ability.text)}</div>
        <button
          class="hero-action"
          type="button"
          data-player="${playerId}"
          ${disabled ? "disabled" : ""}
        >${escapeHtml(hero.ability.action)}</button>
      ` : ""}
      ${renderOutcome(playerId)}
    </section>
  `;
}

function renderCard(playerId, object, context) {
  if (object.objectType === "hidden") {
    return renderHiddenCard();
  }

  const info = CARD_DEFS[object.templateId] ?? { name: object.templateId ?? object.id, text: object.objectType, action: "Use", display: [] };
  const action = actionForObject(playerId, object, context);
  const disabled = !action;
  const detail = cardDetail(info, object);
  const style = cardPresentationStyle(info);
  const tooltip = cardTooltipBody(info, object, playerId, detail, context);
  return `
    <article
      class="card ${disabled ? "disabled-card" : ""}"
      ${style}
      data-template="${escapeHtml(object.templateId ?? "unknown")}"
      ${actionDataAttrs(action)}
      data-tooltip-title="${escapeAttr(info.name)}"
      data-tooltip-body="${escapeAttr(tooltip)}"
      draggable="${action ? "true" : "false"}"
      tabindex="0"
      aria-label="${escapeAttr(`${info.name}. ${detail}. ${info.text}`)}"
    >
      ${renderDisplayProperties(info, object)}
      <div class="card-art" aria-hidden="true"></div>
      <div>
        <div class="name">${escapeHtml(info.name)}</div>
        <div class="meta">${escapeHtml(detail)}</div>
      </div>
      <div class="text">${renderRulesText(info.text)}</div>
      <button
        class="card-action"
        type="button"
        data-player="${playerId}"
        data-object="${object.id}"
        data-zone-kind="${context.zoneKind}"
        ${disabled ? "disabled" : ""}
      >${escapeHtml(info.action || "Use")}</button>
    </article>
  `;
}

function renderHiddenCard() {
  const title = "Hidden Card";
  const text = "Details hidden from this viewer.";
  return `
    <article
      class="card hidden-card disabled-card"
      data-template="hidden"
      data-tooltip-title="${escapeAttr(title)}"
      data-tooltip-body="${escapeAttr(text)}"
      draggable="false"
      tabindex="0"
      aria-label="${escapeAttr(`${title}. ${text}`)}"
    >
      <div class="card-art hidden-card-art" aria-hidden="true"></div>
      <div>
        <div class="name">${title}</div>
        <div class="meta">Hidden</div>
      </div>
      <div class="text">${text}</div>
      <button class="card-action" type="button" disabled>Hidden</button>
    </article>
  `;
}

function actionDataAttrs(action) {
  if (!action) {
    return "";
  }

  return [
    `data-action-player="${escapeAttr(action.playerId)}"`,
    `data-action-behavior="${escapeAttr(action.behaviorId)}"`,
    action.sourceObjectId ? `data-action-source-object="${escapeAttr(action.sourceObjectId)}"` : "",
    `data-action-target-mode="${escapeAttr(action.targetMode)}"`,
    action.targetSelector ? `data-action-target-selector="${escapeAttr(action.targetSelector)}"` : ""
  ].filter(Boolean).join(" ");
}

function cardDetail(info, object) {
  if (object.exhausted) {
    return "Exhausted";
  }
  if (object.counters?.durability !== undefined) {
    return `Durability ${object.counters.durability}`;
  }
  if (info.manaCost !== undefined) {
    return `Cost ${info.manaCost}`;
  }
  return "Ready";
}

function renderDisplayProperties(info, object, extraClass = "") {
  const properties = info.display ?? [];
  const slotIndexes = {};
  return properties
    .map((property) => {
      const value = displayPropertyValue(info, object, property);
      if (value === undefined || value === null || value === "") {
        return "";
      }
      const slotIndex = slotIndexes[property.slot] ?? 0;
      slotIndexes[property.slot] = slotIndex + 1;
      return `
        <span
          class="property-badge slot-${escapeAttr(property.slot)} icon-${escapeAttr(property.icon ?? property.property)} ${escapeAttr(extraClass)}"
          style="--badge-stack-index: ${slotIndex};"
          aria-label="${escapeAttr(`${property.label ?? property.property}: ${value}`)}"
          title="${escapeAttr(`${property.label ?? property.property}: ${value}`)}"
        >${escapeHtml(value)}</span>
      `;
    })
    .join("");
}

function displayPropertyValue(info, object, property) {
  if (property.source === "counter") {
    return object.counters?.[property.property] ?? info.stats?.[property.property];
  }
  if (property.source === "stats") {
    return object.stats?.[property.property] ?? info.stats?.[property.property];
  }
  if (property.source === "template" || property.source === undefined) {
    return info[property.property];
  }
  if (property.source === "metadata") {
    return info.metadata?.[property.property];
  }
  return info[property.property];
}

function cardTooltipBody(info, object, playerId, detail, context) {
  const owner = object.ownerId ?? playerId;
  const parts = [
    info.text,
    detail,
    `Owner: ${PLAYER_NAMES[owner] ?? owner}`,
    `Zone: ${context.zoneKind}`
  ];
  if (object.exhausted) {
    parts.push("Status: Exhausted");
  }
  if (object.counters?.durability !== undefined) {
    parts.push(`Durability: ${object.counters.durability}`);
  }
  return parts.join("\n");
}

function renderRulesText(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\b(Attack|attack|Damage|damage|Draw|draw|drawn|Durability|durability|Mana|mana)\b/g, (term) => {
    const keyword = KEYWORDS[term.toLowerCase()];
    if (!keyword) {
      return term;
    }
    return `<button class="keyword" type="button" data-tooltip-title="${escapeAttr(keyword.title)}" data-tooltip-body="${escapeAttr(keyword.body)}">${term}</button>`;
  });
}

function actionForHero(playerId) {
  const hero = HERO_DEFS[playerId];
  const ability = hero?.ability;
  const player = state?.players[playerId];
  if (!ability || !player || !canPlayerAct(playerId) || (player.resources.mana?.current ?? 0) < ability.manaCost) {
    return null;
  }

  return {
    kind: "hero",
    playerId,
    behaviorId: ability.behaviorId,
    targetMode: ability.targetMode,
    targetSelector: "target"
  };
}

function actionForObject(playerId, object, context) {
  if (!canObjectAct(playerId, object, context)) {
    return null;
  }

  if (context.zoneKind === "hand") {
    if (object.templateId === "coin") {
      return {
        kind: "card",
        playerId,
        behaviorId: "coin",
        sourceObjectId: object.id,
        targetMode: "selfHero"
      };
    }
    if (object.templateId === "firebolt") {
      return {
        kind: "card",
        playerId,
        behaviorId: "firebolt",
        sourceObjectId: object.id,
        targetMode: "enemyHero",
        targetSelector: "target"
      };
    }
    if (object.templateId === "nova") {
      return {
        kind: "card",
        playerId,
        behaviorId: "nova",
        sourceObjectId: object.id,
        targetMode: "battlefield"
      };
    }
  }

  if (context.zoneKind === "board") {
    return {
      kind: "card",
      playerId,
      behaviorId: "minion_attack",
      sourceObjectId: object.id,
      targetMode: "enemyHero",
      targetSelector: "target"
    };
  }

  if (context.zoneKind === "weapon") {
    return {
      kind: "card",
      playerId,
      behaviorId: "weapon_attack",
      sourceObjectId: object.id,
      targetMode: "enemyHero",
      targetSelector: "target"
    };
  }

  return null;
}

function canObjectAct(playerId, object, context) {
  if (!canPlayerAct(playerId) || object.objectType === "hidden") {
    return false;
  }

  if (context.zoneKind === "hand") {
    return ["firebolt", "nova", "coin"].includes(object.templateId);
  }

  if (context.zoneKind === "board") {
    return object.templateId === "loot_minion" && !object.exhausted;
  }

  if (context.zoneKind === "weapon") {
    return object.templateId === "training_axe" && (object.counters?.durability ?? 0) > 0;
  }

  return false;
}

function canSelectedPlayerAct() {
  return canPlayerAct(selectedPlayerId);
}

function canPlayerAct(playerId) {
  if (!state || state.status === "completed") {
    return false;
  }

  return !state.turn.activePlayerId || state.turn.activePlayerId === playerId;
}

function bindActionButtons() {
  document.querySelectorAll(".card-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      const source = button.closest("[data-action-behavior]");
      const action = actionFromElement(source);
      if (action) {
        quickApplyAction(action);
      }
    });
  });

  document.querySelectorAll(".hero-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      const source = button.closest("[data-action-behavior]");
      const action = actionFromElement(source);
      if (action) {
        quickApplyAction(action);
      }
    });
  });
}

function bindNaturalActions() {
  document.querySelectorAll("[data-action-behavior]").forEach((source) => {
    source.addEventListener("click", (event) => {
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      if (event.target.closest("button")) {
        return;
      }

      const target = event.target.closest("[data-target-player], [data-target-area]");
      if (selectedAction && target && applySelectedToTarget(target)) {
        return;
      }

      const action = actionFromElement(source);
      if (action) {
        selectedAction = action;
        selectedPlayerId = action.playerId;
        paintSelectionState(source);
      }
    });

    source.addEventListener("dragstart", (event) => {
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        event.preventDefault();
        return;
      }
      const action = actionFromElement(source);
      if (!action) {
        event.preventDefault();
        return;
      }
      selectedAction = action;
      selectedPlayerId = action.playerId;
      event.dataTransfer?.setData("text/plain", JSON.stringify(action));
      event.dataTransfer?.setDragImage(source, Math.min(40, source.clientWidth / 2), Math.min(40, source.clientHeight / 2));
      paintSelectionState(source);
    });
  });

  document.querySelectorAll("[data-target-player], [data-target-area]").forEach((target) => {
    target.addEventListener("click", (event) => {
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      if (!selectedAction || event.target.closest("button")) {
        return;
      }
      applySelectedToTarget(target);
    });

    target.addEventListener("dragover", (event) => {
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      if (selectedAction && isValidTarget(selectedAction, target)) {
        event.preventDefault();
      }
    });

    target.addEventListener("drop", (event) => {
      if (layoutEditorOpen || assetLibraryOpen || previewPanelOpen) {
        return;
      }
      if (!selectedAction) {
        const data = event.dataTransfer?.getData("text/plain");
        if (data) {
          selectedAction = JSON.parse(data);
        }
      }
      if (selectedAction && isValidTarget(selectedAction, target)) {
        event.preventDefault();
        applySelectedToTarget(target);
      }
    });
  });
}

function actionFromElement(element) {
  if (!element?.dataset?.actionBehavior) {
    return null;
  }

  return {
    kind: element.classList.contains("hero-card") ? "hero" : "card",
    playerId: element.dataset.actionPlayer,
    behaviorId: element.dataset.actionBehavior,
    sourceObjectId: element.dataset.actionSourceObject || undefined,
    targetMode: element.dataset.actionTargetMode,
    targetSelector: element.dataset.actionTargetSelector || undefined
  };
}

function quickApplyAction(action) {
  if (action.targetMode === "enemyHero") {
    return executeAction(action, { playerId: opponentOf(action.playerId) });
  }
  if (action.targetMode === "selfHero") {
    return executeAction(action, { playerId: action.playerId });
  }
  return executeAction(action, { area: "battlefield" });
}

function applySelectedToTarget(target) {
  if (!selectedAction || !isValidTarget(selectedAction, target)) {
    return false;
  }

  const targetInfo = target.dataset.targetPlayer
    ? { playerId: target.dataset.targetPlayer }
    : { area: target.dataset.targetArea };
  executeAction(selectedAction, targetInfo);
  selectedAction = null;
  paintSelectionState();
  return true;
}

function isValidTarget(action, target) {
  if (!action || !target) {
    return false;
  }

  const playerId = target.dataset.targetPlayer;
  const area = target.dataset.targetArea;

  if (action.targetMode === "enemyHero") {
    return Boolean(playerId && playerId !== action.playerId && targetRegionAllows(target, "hero"));
  }
  if (action.targetMode === "selfHero") {
    return playerId === action.playerId && targetRegionAllows(target, "hero");
  }
  if (action.targetMode === "battlefield") {
    return area === "battlefield" && targetRegionAllows(target, "battlefield");
  }
  return false;
}

function targetRegionAllows(target, expectedKind) {
  if (!target.dataset.regionId) {
    return true;
  }
  if (target.dataset.regionTargetable === "false") {
    return false;
  }
  return !target.dataset.regionKind || target.dataset.regionKind === expectedKind;
}

function executeAction(action, target) {
  const payload = {
    behaviorId: action.behaviorId,
    ...(action.sourceObjectId ? { sourceObjectId: action.sourceObjectId } : {})
  };

  if (action.targetSelector && target.playerId) {
    payload.selections = { [action.targetSelector]: [target.playerId] };
  }

  selectedAction = null;
  paintSelectionState();
  return submitCommand("execute_behavior", payload, action.playerId);
}

function paintSelectionState(preferredSource) {
  document.querySelectorAll(".selected-source").forEach((element) => element.classList.remove("selected-source"));
  document.querySelectorAll(".valid-target").forEach((element) => element.classList.remove("valid-target"));

  if (!selectedAction) {
    return;
  }

  const source =
    preferredSource ??
    document.querySelector(
      selectedAction.sourceObjectId
        ? `[data-action-source-object="${CSS.escape(selectedAction.sourceObjectId)}"]`
        : `.hero-card[data-action-player="${CSS.escape(selectedAction.playerId)}"]`
    );
  source?.classList.add("selected-source");

  document.querySelectorAll("[data-target-player], [data-target-area]").forEach((target) => {
    target.classList.toggle("valid-target", isValidTarget(selectedAction, target));
  });
}

function bindTooltips() {
  document.querySelectorAll("[data-tooltip-title][data-tooltip-body]").forEach((target) => {
    target.addEventListener("pointerenter", (event) => showTooltip(target, event));
    target.addEventListener("pointermove", (event) => positionTooltip(event.clientX, event.clientY));
    target.addEventListener("pointerleave", hideTooltip);
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("blur", hideTooltip);
  });
}

function showTooltip(target, event) {
  if (!dom.tooltipLayer) {
    return;
  }

  dom.tooltipLayer.innerHTML = `
    <strong>${escapeHtml(target.dataset.tooltipTitle ?? "")}</strong>
    <span>${escapeHtml(target.dataset.tooltipBody ?? "").replaceAll("\n", "<br>")}</span>
  `;
  dom.tooltipLayer.hidden = false;

  if (event && "clientX" in event) {
    positionTooltip(event.clientX, event.clientY);
  } else {
    const rect = target.getBoundingClientRect();
    positionTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
}

function positionTooltip(clientX, clientY) {
  if (!dom.tooltipLayer || dom.tooltipLayer.hidden) {
    return;
  }

  const margin = 10;
  const rect = dom.tooltipLayer.getBoundingClientRect();
  const x = Math.min(Math.max(margin, clientX + 14), window.innerWidth - rect.width - margin);
  const y = Math.min(Math.max(margin, clientY + 14), window.innerHeight - rect.height - margin);
  dom.tooltipLayer.style.left = `${x}px`;
  dom.tooltipLayer.style.top = `${y}px`;
}

function hideTooltip() {
  if (dom.tooltipLayer) {
    dom.tooltipLayer.hidden = true;
  }
}

function installViewportFitter() {
  const params = new URLSearchParams(window.location.search);
  const configuredScale = Number(params.get("scale"));
  const hasConfiguredScale = Number.isFinite(configuredScale) && configuredScale > 0;

  const fit = () => {
    if (!dom.playArea || !dom.arena || !dom.arenaScaleBox) {
      return;
    }

    const scale = hasConfiguredScale
      ? configuredScale
      : Math.max(
          PLAY_AREA.minScale,
          Math.min(1, dom.playArea.clientWidth / PLAY_AREA.width, dom.playArea.clientHeight / PLAY_AREA.height)
        );
    dom.arena.style.setProperty("--arena-scale", String(scale));
    dom.arenaScaleBox.style.width = `${PLAY_AREA.width * scale}px`;
    dom.arenaScaleBox.style.height = `${PLAY_AREA.height * scale}px`;
    dom.arena.dataset.scaleMode = hasConfiguredScale ? "configured" : "auto";
    dom.arena.dataset.scale = scale.toFixed(3);
  };

  fit();
  window.addEventListener("resize", fit);
  new ResizeObserver(fit).observe(dom.playArea);
}

function playCommandEffect(command) {
  const effect = effectForCommand(command);
  if (!effect || !dom.effectLayer) {
    return;
  }

  const burst = document.createElement("div");
  burst.className = `effect-burst effect-${effect.className} effect-at-${effect.anchor}`;
  burst.style.setProperty("--effect-sheet", `url('${effect.sheet}')`);
  burst.dataset.effectId = String(++effectCounter);
  dom.effectLayer.append(burst);
  window.setTimeout(() => burst.remove(), 850);
}

function effectForCommand(command) {
  if (command.type !== "execute_behavior") {
    return null;
  }

  const behaviorId = command.payload?.behaviorId;
  if (behaviorId === "firebolt" || behaviorId === "hero_focus") {
    return { ...EFFECTS.firebolt, anchor: opponentOf(command.playerId) };
  }
  if (behaviorId === "nova") {
    return { ...EFFECTS.nova, anchor: "center" };
  }
  if (behaviorId === "coin") {
    return { ...EFFECTS.coin, anchor: command.playerId };
  }
  if (behaviorId === "minion_attack" || behaviorId === "weapon_attack") {
    return { ...EFFECTS.attack, anchor: opponentOf(command.playerId) };
  }

  return null;
}

function renderOutcome(playerId) {
  const outcome = state.outcomes.find((candidate) => candidate.status === "completed");
  const result = outcome?.results.find((candidate) => candidate.playerId === playerId);
  return result ? `<div class="resource result"><span class="meta">Result</span><strong>${result.status}</strong></div>` : "";
}

function renderLog() {
  const rows = events
    .slice(-14)
    .reverse()
    .map((event) => `<div class="log-entry">${escapeHtml(logLine(event))}</div>`);
  dom.battleLog.innerHTML = rows.join("") || `<div class="empty">No events yet</div>`;
}

function logLine(event) {
  const payload = event.payload ?? {};
  if (event.type === "damage_dealt") {
    return `#${event.sequence} ${payload.targetPlayerId} took ${payload.amount} damage`;
  }
  if (event.type === "resource_changed") {
    return `#${event.sequence} ${payload.playerId} ${payload.resource} is ${payload.current}`;
  }
  if (event.type === "card_moved") {
    return `#${event.sequence} ${payload.objectId} moved to ${payload.toZoneId}`;
  }
  if (event.type === "outcome_declared") {
    return `#${event.sequence} Match completed`;
  }
  if (event.type === "turn_advanced") {
    return `#${event.sequence} Turn passed to ${payload.activePlayerId}`;
  }
  if (event.type === "phase_entered") {
    return `#${event.sequence} ${payload.activePlayerId} entered ${payload.phaseId}`;
  }
  return `#${event.sequence} ${event.type}`;
}

function cardsInZone(zoneId) {
  const zone = state.zones[zoneId];
  return (zone?.objectIds ?? []).map((objectId) => state.objects[objectId]).filter(Boolean);
}

function opponentOf(playerId) {
  return playerId === "p1" ? "p2" : "p1";
}

function showError(message) {
  dom.battleLog.insertAdjacentHTML("afterbegin", `<div class="log-entry danger">${escapeHtml(message)}</div>`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
