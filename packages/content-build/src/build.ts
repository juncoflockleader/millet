import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assetManifestSchema,
  behaviorManifestSchema,
  boardLayoutSchema,
  cardCatalogSchema,
  gameDefinitionSchema,
  localizationBundleSchema,
  presentationCatalogSchema,
  uiPlaytestScriptSchema,
  uiPreviewFixtureSchema,
  validateJsonSchema,
  type JsonSchema
} from "../../content-schema/src/index.ts";
import { hashValue, type BundleRef, type ContentLock } from "../../engine-core/src/index.ts";

export interface ValidationIssue {
  severity: "error" | "warning";
  file: string;
  message: string;
}

export interface BuiltBundle {
  id: string;
  version: string;
  contentHash: string;
  files: Record<string, unknown>;
  issues: ValidationIssue[];
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8")) as unknown;
}

function collectJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      files.push(...collectJsonFiles(path));
    } else if (entry.endsWith(".json")) {
      files.push(path);
    }
  }

  return files.sort();
}

function addSchemaIssues(issues: ValidationIssue[], file: string, value: unknown, schema: JsonSchema): void {
  for (const issue of validateJsonSchema(value, schema)) {
    issues.push({
      severity: "error",
      file,
      message: `Schema ${issue.path}: ${issue.message}`
    });
  }
}

function addLocalizationPlaceholderIssues(issues: ValidationIssue[], file: string, localization: Record<string, unknown>): void {
  const strings = localization.strings;
  if (typeof strings !== "object" || strings === null || Array.isArray(strings)) {
    return;
  }

  for (const [key, value] of Object.entries(strings)) {
    if (typeof value !== "string") {
      continue;
    }

    const withoutValidPlaceholders = value.replace(/\{[A-Za-z_][A-Za-z0-9_]*\}/g, "");
    if (withoutValidPlaceholders.includes("{") || withoutValidPlaceholders.includes("}")) {
      issues.push({
        severity: "error",
        file,
        message: `Localization string ${key} has malformed placeholder syntax`
      });
    }
  }
}

const ALLOWED_ASSET_LICENSES = new Set(["first-party-dev", "cc0-1.0", "cc-by-4.0", "mit", "apache-2.0"]);
const ALLOWED_ASSET_URI_SCHEMES = new Set(["memory:", "file:", "https:"]);
const IMAGE_ASSET_KINDS = new Set([
  "avatar",
  "board_background",
  "card_art",
  "card_back",
  "card_frame",
  "icon",
  "vfx_sheet"
]);
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MIN_CARD_ASSET_DIMENSION = 64;
const MAX_CARD_ASSET_DIMENSION = 8192;
const DEFAULT_PROPERTY_DISPLAY_SLOTS = ["top-left", "top-right", "bottom-left", "bottom-right"];
const DEFAULT_PROPERTY_DISPLAY_ICONS = ["durability", "heart", "mana", "sword"];

interface PropertyDisplayRegistry {
  slots: Set<string>;
  icons: Set<string>;
}

function createDefaultPropertyDisplayRegistry(): PropertyDisplayRegistry {
  return {
    slots: new Set(DEFAULT_PROPERTY_DISPLAY_SLOTS),
    icons: new Set(DEFAULT_PROPERTY_DISPLAY_ICONS)
  };
}

function addPropertyDisplayDefinitionsToRegistry(registry: PropertyDisplayRegistry, layout: Record<string, unknown>): void {
  const propertyDisplay = layout.propertyDisplay;
  if (typeof propertyDisplay !== "object" || propertyDisplay === null || Array.isArray(propertyDisplay)) {
    return;
  }

  const record = propertyDisplay as Record<string, unknown>;
  for (const slot of Array.isArray(record.slots) ? record.slots : []) {
    if (typeof slot === "object" && slot !== null && !Array.isArray(slot)) {
      const slotId = (slot as Record<string, unknown>).id;
      if (typeof slotId === "string" && slotId.length > 0) {
        registry.slots.add(slotId);
      }
    }
  }

  for (const icon of Array.isArray(record.icons) ? record.icons : []) {
    if (typeof icon === "object" && icon !== null && !Array.isArray(icon)) {
      const iconId = (icon as Record<string, unknown>).id;
      if (typeof iconId === "string" && iconId.length > 0) {
        registry.icons.add(iconId);
      }
    }
  }
}

function addAssetCompatibilityIssues(issues: ValidationIssue[], file: string, manifest: Record<string, unknown>): void {
  if (!Array.isArray(manifest.assets)) {
    return;
  }

  manifest.assets.forEach((asset, index) => {
    if (typeof asset !== "object" || asset === null || Array.isArray(asset)) {
      return;
    }

    const record = asset as Record<string, unknown>;
    const prefix = `Asset ${typeof record.assetId === "string" ? record.assetId : index}`;

    if (typeof record.contentHash === "string" && !/^sha256:[a-f0-9]{64}$/.test(record.contentHash)) {
      issues.push({
        severity: "error",
        file,
        message: `${prefix} contentHash must be sha256 plus 64 lowercase hex characters`
      });
    }

    if (typeof record.sourceUri === "string") {
      try {
        const uri = new URL(record.sourceUri);
        if (!ALLOWED_ASSET_URI_SCHEMES.has(uri.protocol)) {
          issues.push({
            severity: "error",
            file,
            message: `${prefix} sourceUri scheme ${uri.protocol} is not allowed`
          });
        }
      } catch {
        issues.push({
          severity: "error",
          file,
          message: `${prefix} sourceUri must be an absolute URI`
        });
      }
    }

    if (typeof record.license === "string" && !ALLOWED_ASSET_LICENSES.has(record.license)) {
      issues.push({
        severity: "error",
        file,
        message: `${prefix} license ${record.license} is not in the approved license list`
      });
    }

    if (typeof record.publicPath === "string" && !record.publicPath.startsWith("/")) {
      issues.push({
        severity: "error",
        file,
        message: `${prefix} publicPath must start with /`
      });
    }

    if (typeof record.kind === "string" && IMAGE_ASSET_KINDS.has(record.kind)) {
      if (typeof record.mediaType !== "string") {
        issues.push({
          severity: "error",
          file,
          message: `${prefix} image asset must declare mediaType`
        });
      } else if (!ALLOWED_IMAGE_MEDIA_TYPES.has(record.mediaType)) {
        issues.push({
          severity: "error",
          file,
          message: `${prefix} mediaType ${record.mediaType} is not allowed for image asset kind ${record.kind}`
        });
      }

      for (const dimension of ["width", "height"] as const) {
        const value = record[dimension];
        if (!Number.isInteger(value)) {
          issues.push({
            severity: "error",
            file,
            message: `${prefix} image asset must declare integer ${dimension}`
          });
        } else if ((value as number) < MIN_CARD_ASSET_DIMENSION || (value as number) > MAX_CARD_ASSET_DIMENSION) {
          issues.push({
            severity: "error",
            file,
            message: `${prefix} ${dimension} must be between ${MIN_CARD_ASSET_DIMENSION} and ${MAX_CARD_ASSET_DIMENSION}px`
          });
        }
      }
    }
  });
}

function addPropertyDisplayIssues(
  issues: ValidationIssue[],
  file: string,
  displays: unknown,
  context: string,
  registry: PropertyDisplayRegistry
): void {
  if (!Array.isArray(displays)) {
    return;
  }

  displays.forEach((display, index) => {
    if (typeof display !== "object" || display === null || Array.isArray(display)) {
      return;
    }

    const record = display as Record<string, unknown>;
    const property = typeof record.property === "string" && record.property.length > 0 ? record.property : String(index);

    if (typeof record.slot === "string" && !registry.slots.has(record.slot)) {
      issues.push({
        severity: "error",
        file,
        message: `${context} display property ${property} uses unsupported slot ${record.slot}`
      });
    }

    if (typeof record.icon === "string" && !registry.icons.has(record.icon)) {
      issues.push({
        severity: "error",
        file,
        message: `${context} display property ${property} uses unsupported icon ${record.icon}`
      });
    }
  });
}

function addCardCatalogIssues(
  issues: ValidationIssue[],
  file: string,
  catalog: Record<string, unknown>,
  behaviorIds: Set<string>,
  assetIds: Set<string>,
  localizationKeys: Set<string>,
  cardTemplateIds: Set<string>,
  propertyDisplayRegistry: PropertyDisplayRegistry
): void {
  if (!Array.isArray(catalog.templates)) {
    return;
  }

  const templateIds = new Set<string>();

  catalog.templates.forEach((template, index) => {
    if (typeof template !== "object" || template === null || Array.isArray(template)) {
      return;
    }

    const record = template as Record<string, unknown>;
    const templateId = typeof record.templateId === "string" ? record.templateId : String(index);
    const prefix = `Template ${templateId}`;

    if (typeof record.templateId === "string") {
      if (templateIds.has(record.templateId)) {
        issues.push({ severity: "error", file, message: `Duplicate card template id ${record.templateId}` });
      }
      templateIds.add(record.templateId);
      cardTemplateIds.add(record.templateId);
    }

    for (const keyField of ["nameKey", "descriptionKey"]) {
      const localizationKey = record[keyField];
      if (typeof localizationKey === "string" && localizationKeys.size > 0 && !localizationKeys.has(localizationKey)) {
        issues.push({ severity: "error", file, message: `${prefix} references unknown localization key ${localizationKey}` });
      }
    }

    for (const behaviorId of Array.isArray(record.behaviorIds) ? record.behaviorIds : []) {
      if (typeof behaviorId === "string" && !behaviorIds.has(behaviorId)) {
        issues.push({ severity: "error", file, message: `${prefix} references unknown behavior ${behaviorId}` });
      }
    }

    for (const assetId of Array.isArray(record.assetRefs) ? record.assetRefs : []) {
      if (typeof assetId === "string" && !assetIds.has(assetId)) {
        issues.push({ severity: "error", file, message: `${prefix} references unknown asset ${assetId}` });
      }
    }

    const display = record.display;
    if (typeof display === "object" && display !== null && !Array.isArray(display)) {
      addPropertyDisplayIssues(issues, file, (display as Record<string, unknown>).properties, prefix, propertyDisplayRegistry);
    }
  });
}

function addPresentationCatalogIssues(
  issues: ValidationIssue[],
  file: string,
  catalog: Record<string, unknown>,
  cardTemplateIds: Set<string>,
  behaviorIds: Set<string>,
  propertyDisplayRegistry: PropertyDisplayRegistry
): void {
  const presentationTemplateIds = new Set<string>();

  for (const section of ["cards", "equipment", "minions"] as const) {
    const entries = catalog[section];
    if (!Array.isArray(entries)) {
      continue;
    }

    entries.forEach((entry, index) => {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
        return;
      }

      const record = entry as Record<string, unknown>;
      const templateId = typeof record.templateId === "string" ? record.templateId : `${section}[${index}]`;
      if (typeof record.templateId === "string") {
        if (presentationTemplateIds.has(record.templateId)) {
          issues.push({ severity: "error", file, message: `Duplicate presentation template id ${record.templateId}` });
        }
        presentationTemplateIds.add(record.templateId);

        if (cardTemplateIds.size > 0 && !cardTemplateIds.has(record.templateId)) {
          issues.push({ severity: "error", file, message: `Presentation ${templateId} references unknown card template ${record.templateId}` });
        }
      }

      const behavior = record.behavior;
      if (typeof behavior === "object" && behavior !== null && !Array.isArray(behavior)) {
        const behaviorId = (behavior as Record<string, unknown>).behaviorId;
        if (typeof behaviorId === "string" && behaviorIds.size > 0 && !behaviorIds.has(behaviorId)) {
          issues.push({ severity: "error", file, message: `Presentation ${templateId} references unknown behavior ${behaviorId}` });
        }
      }

      const properties = record.properties;
      if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
        addPropertyDisplayIssues(issues, file, (properties as Record<string, unknown>).display, `Presentation ${templateId}`, propertyDisplayRegistry);
      }
    });
  }

  const heroIds = new Set<string>();
  const heroes = catalog.heroes;
  if (Array.isArray(heroes)) {
    heroes.forEach((hero, index) => {
      if (typeof hero !== "object" || hero === null || Array.isArray(hero)) {
        return;
      }

      const record = hero as Record<string, unknown>;
      const playerId = typeof record.playerId === "string" ? record.playerId : `heroes[${index}]`;
      if (typeof record.playerId === "string") {
        if (heroIds.has(record.playerId)) {
          issues.push({ severity: "error", file, message: `Duplicate hero presentation player id ${record.playerId}` });
        }
        heroIds.add(record.playerId);
      }

      if (typeof record.templateId === "string" && cardTemplateIds.size > 0 && !cardTemplateIds.has(record.templateId)) {
        issues.push({ severity: "error", file, message: `Hero ${playerId} references unknown card template ${record.templateId}` });
      }

      const ability = record.ability;
      if (typeof ability === "object" && ability !== null && !Array.isArray(ability)) {
        const abilityRecord = ability as Record<string, unknown>;
        const behaviorId = abilityRecord.behaviorId;
        if (typeof behaviorId === "string" && behaviorIds.size > 0 && !behaviorIds.has(behaviorId)) {
          issues.push({ severity: "error", file, message: `Hero ${playerId} ability references unknown behavior ${behaviorId}` });
        }
        addPropertyDisplayIssues(issues, file, abilityRecord.display, `Hero ${playerId} ability`, propertyDisplayRegistry);
      }

      const properties = record.properties;
      if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
        addPropertyDisplayIssues(issues, file, (properties as Record<string, unknown>).display, `Hero ${playerId}`, propertyDisplayRegistry);
      }
    });
  }
}

function addBoardLayoutIssues(issues: ValidationIssue[], file: string, layout: Record<string, unknown>): void {
  const widgetIds = new Set<string>();
  const regionIds = new Set<string>();
  const logicalSize =
    typeof layout.logicalSize === "object" && layout.logicalSize !== null && !Array.isArray(layout.logicalSize)
      ? (layout.logicalSize as Record<string, unknown>)
      : null;
  const boardWidth = finiteNumber(logicalSize?.width) ? logicalSize.width : null;
  const boardHeight = finiteNumber(logicalSize?.height) ? logicalSize.height : null;

  if (Array.isArray(layout.widgets)) {
    layout.widgets.forEach((widget, index) => {
      if (typeof widget !== "object" || widget === null || Array.isArray(widget)) {
        return;
      }

      const widgetId = (widget as Record<string, unknown>).id;
      if (typeof widgetId !== "string" || widgetId.length === 0) {
        return;
      }

      if (widgetIds.has(widgetId)) {
        issues.push({ severity: "error", file, message: `Duplicate board layout widget id ${widgetId}` });
      }
      widgetIds.add(widgetId);
    });
  }

  if (Array.isArray(layout.regions)) {
    layout.regions.forEach((region, index) => {
      if (typeof region !== "object" || region === null || Array.isArray(region)) {
        return;
      }

      const record = region as Record<string, unknown>;
      const regionId = typeof record.id === "string" ? record.id : String(index);
      if (typeof record.id === "string") {
        if (regionIds.has(record.id)) {
          issues.push({ severity: "error", file, message: `Duplicate board layout region id ${record.id}` });
        }
        regionIds.add(record.id);
      }

      const widgetId = record.widgetId;
      if (typeof widgetId === "string" && widgetIds.size > 0 && !widgetIds.has(widgetId)) {
        issues.push({ severity: "error", file, message: `Region ${regionId} references unknown widget ${widgetId}` });
      }

      const geometry = record.geometry;
      if (
        boardWidth !== null &&
        boardHeight !== null &&
        typeof geometry === "object" &&
        geometry !== null &&
        !Array.isArray(geometry)
      ) {
        const geometryRecord = geometry as Record<string, unknown>;
        const { x, y, width, height } = geometryRecord;
        if (finiteNumber(x) && finiteNumber(y) && finiteNumber(width) && finiteNumber(height)) {
          if (x + width > boardWidth || y + height > boardHeight) {
            issues.push({
              severity: "error",
              file,
              message: `Region ${regionId} geometry exceeds logical board bounds ${boardWidth}x${boardHeight}`
            });
          }
        }
      }
    });
  }

  const propertyDisplay = layout.propertyDisplay;
  if (typeof propertyDisplay === "object" && propertyDisplay !== null && !Array.isArray(propertyDisplay)) {
    const record = propertyDisplay as Record<string, unknown>;
    for (const [field, label] of [
      ["slots", "slot"],
      ["icons", "icon"]
    ] as const) {
      const ids = new Set<string>();
      for (const entry of Array.isArray(record[field]) ? record[field] : []) {
        if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
          continue;
        }
        const id = (entry as Record<string, unknown>).id;
        if (typeof id !== "string" || id.length === 0) {
          continue;
        }
        if (ids.has(id)) {
          issues.push({ severity: "error", file, message: `Duplicate property display ${label} id ${id}` });
        }
        ids.add(id);
      }
    }
  }
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function addUiPreviewFixtureIssues(
  issues: ValidationIssue[],
  file: string,
  document: Record<string, unknown>,
  cardTemplateIds: Set<string>
): void {
  if (!Array.isArray(document.fixtures)) {
    return;
  }

  const fixtureIds = new Set<string>();

  document.fixtures.forEach((fixture, index) => {
    if (typeof fixture !== "object" || fixture === null || Array.isArray(fixture)) {
      return;
    }

    const record = fixture as Record<string, unknown>;
    const fixtureId = typeof record.id === "string" ? record.id : `fixtures[${index}]`;

    if (typeof record.id === "string") {
      if (fixtureIds.has(record.id)) {
        issues.push({ severity: "error", file, message: `Duplicate UI preview fixture id ${record.id}` });
      }
      fixtureIds.add(record.id);
    }

    const state = record.state;
    if (typeof state !== "object" || state === null || Array.isArray(state)) {
      return;
    }

    const stateRecord = state as Record<string, unknown>;
    const players = stateRecord.players;
    const zones = stateRecord.zones;
    const objects = stateRecord.objects;
    const playerIds =
      typeof players === "object" && players !== null && !Array.isArray(players)
        ? new Set(Object.keys(players))
        : new Set<string>();
    const objectIds =
      typeof objects === "object" && objects !== null && !Array.isArray(objects)
        ? new Set(Object.keys(objects))
        : new Set<string>();

    for (const playerField of ["viewerId", "selectedPlayerId"] as const) {
      const playerId = record[playerField];
      if (typeof playerId === "string" && playerIds.size > 0 && !playerIds.has(playerId)) {
        issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} ${playerField} references unknown player ${playerId}` });
      }
    }

    const turn = stateRecord.turn;
    if (typeof turn === "object" && turn !== null && !Array.isArray(turn)) {
      const activePlayerId = (turn as Record<string, unknown>).activePlayerId;
      if (typeof activePlayerId === "string" && playerIds.size > 0 && !playerIds.has(activePlayerId)) {
        issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} turn references unknown active player ${activePlayerId}` });
      }
    }

    if (typeof objects === "object" && objects !== null && !Array.isArray(objects)) {
      for (const [objectKey, object] of Object.entries(objects)) {
        if (typeof object !== "object" || object === null || Array.isArray(object)) {
          continue;
        }

        const objectRecord = object as Record<string, unknown>;
        const objectId = typeof objectRecord.id === "string" ? objectRecord.id : objectKey;
        if (typeof objectRecord.id === "string" && objectRecord.id !== objectKey) {
          issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} object key ${objectKey} does not match id ${objectRecord.id}` });
        }

        const objectType = objectRecord.objectType;
        const templateId = objectRecord.templateId;
        if (objectType === "hidden") {
          if (typeof templateId === "string") {
            issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} hidden object ${objectId} must not expose templateId` });
          }
          if (typeof objectRecord.ownerId === "string") {
            issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} hidden object ${objectId} must not expose ownerId` });
          }
          for (const field of ["controllerId", "creatorId", "exhausted"] as const) {
            if (field in objectRecord) {
              issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} hidden object ${objectId} must not expose ${field}` });
            }
          }
          for (const field of ["stats", "counters", "tags", "keywords", "attachments", "modifiers"] as const) {
            const value = objectRecord[field];
            const count = Array.isArray(value)
              ? value.length
              : typeof value === "object" && value !== null
                ? Object.keys(value).length
                : 0;
            if (count > 0) {
              issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} hidden object ${objectId} must not expose ${field}` });
            }
          }
          continue;
        }

        if (typeof templateId !== "string") {
          issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} object ${objectId} must declare templateId unless it is hidden` });
        }
        if (typeof templateId === "string" && cardTemplateIds.size > 0 && !cardTemplateIds.has(templateId)) {
          issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} object ${objectId} references unknown card template ${templateId}` });
        }

        const ownerId = objectRecord.ownerId;
        if (typeof ownerId === "string" && playerIds.size > 0 && !playerIds.has(ownerId)) {
          issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} object ${objectId} references unknown owner ${ownerId}` });
        }
      }
    }

    if (typeof zones === "object" && zones !== null && !Array.isArray(zones)) {
      for (const [zoneKey, zone] of Object.entries(zones)) {
        if (typeof zone !== "object" || zone === null || Array.isArray(zone)) {
          continue;
        }

        const zoneRecord = zone as Record<string, unknown>;
        const zoneId = typeof zoneRecord.id === "string" ? zoneRecord.id : zoneKey;
        if (typeof zoneRecord.id === "string" && zoneRecord.id !== zoneKey) {
          issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} zone key ${zoneKey} does not match id ${zoneRecord.id}` });
        }

        for (const objectId of Array.isArray(zoneRecord.objectIds) ? zoneRecord.objectIds : []) {
          if (typeof objectId === "string" && !objectIds.has(objectId)) {
            issues.push({ severity: "error", file, message: `Preview fixture ${fixtureId} zone ${zoneId} references unknown object ${objectId}` });
          }
        }
      }
    }
  });
}

function addUiPlaytestScriptIssues(
  issues: ValidationIssue[],
  file: string,
  document: Record<string, unknown>,
  behaviorIds: Set<string>
): void {
  if (!Array.isArray(document.scripts)) {
    return;
  }

  const scriptIds = new Set<string>();

  document.scripts.forEach((script, index) => {
    if (typeof script !== "object" || script === null || Array.isArray(script)) {
      return;
    }

    const record = script as Record<string, unknown>;
    const scriptId = typeof record.id === "string" ? record.id : `scripts[${index}]`;

    if (typeof record.id === "string") {
      if (scriptIds.has(record.id)) {
        issues.push({ severity: "error", file, message: `Duplicate UI playtest script id ${record.id}` });
      }
      scriptIds.add(record.id);
    }

    const steps = record.steps;
    if (!Array.isArray(steps)) {
      return;
    }

    const stepIds = new Set<string>();
    let hasCreateMatch = false;

    steps.forEach((step, stepIndex) => {
      if (typeof step !== "object" || step === null || Array.isArray(step)) {
        return;
      }

      const stepRecord = step as Record<string, unknown>;
      const stepId = typeof stepRecord.id === "string" ? stepRecord.id : `steps[${stepIndex}]`;
      if (typeof stepRecord.id === "string") {
        if (stepIds.has(stepRecord.id)) {
          issues.push({ severity: "error", file, message: `Playtest script ${scriptId} has duplicate step id ${stepRecord.id}` });
        }
        stepIds.add(stepRecord.id);
      }

      if (stepRecord.action === "create_match") {
        hasCreateMatch = true;
      }

      const command = stepRecord.command;
      if (stepRecord.action === "submit_command" && typeof command === "object" && command !== null && !Array.isArray(command)) {
        const payload = (command as Record<string, unknown>).payload;
        if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
          const behaviorId = (payload as Record<string, unknown>).behaviorId;
          if (typeof behaviorId === "string" && behaviorIds.size > 0 && !behaviorIds.has(behaviorId)) {
            issues.push({
              severity: "error",
              file,
              message: `Playtest script ${scriptId} step ${stepId} references unknown behavior ${behaviorId}`
            });
          }
        }
      }
    });

    if ((record.mode ?? "live_match") === "live_match" && !hasCreateMatch) {
      issues.push({ severity: "error", file, message: `Playtest script ${scriptId} live_match must include a create_match step` });
    }
  });
}

export function validateRulesetDir(dir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const jsonFiles = collectJsonFiles(dir);
  const fileNames = new Set(jsonFiles.map((file) => relative(dir, file)));
  const behaviorIds = new Set<string>();
  const assetIds = new Set<string>();
  const cardTemplateIds = new Set<string>();
  const localizationKeys = new Set<string>();
  const propertyDisplayRegistry = createDefaultPropertyDisplayRegistry();

  if (!fileNames.has("game-definition.json")) {
    issues.push({ severity: "error", file: dir, message: "Missing game-definition.json" });
    return issues;
  }

  const gameDefinitionPath = join(dir, "game-definition.json");
  const gameDefinition = readJson(gameDefinitionPath) as Record<string, unknown>;
  addSchemaIssues(issues, gameDefinitionPath, gameDefinition, gameDefinitionSchema);

  for (const field of ["id", "version", "metadata", "playerConfig", "zones"]) {
    if (!(field in gameDefinition)) {
      issues.push({ severity: "error", file: gameDefinitionPath, message: `Missing required field ${field}` });
    }
  }

  if (Array.isArray(gameDefinition.behaviors) && !fileNames.has("behaviors.json")) {
    issues.push({ severity: "warning", file: gameDefinitionPath, message: "Game references behaviors but has no behaviors.json manifest" });
  }

  if (typeof gameDefinition.cardCatalog === "string" && !fileNames.has(gameDefinition.cardCatalog)) {
    issues.push({ severity: "error", file: gameDefinitionPath, message: `Card catalog ${gameDefinition.cardCatalog} is missing` });
  }

  if (typeof gameDefinition.ui === "object" && gameDefinition.ui !== null && !Array.isArray(gameDefinition.ui)) {
    const uiConfig = gameDefinition.ui as Record<string, unknown>;
    const referencedLayouts = new Set<string>();
    if (typeof uiConfig.defaultBoardLayout === "string") {
      referencedLayouts.add(uiConfig.defaultBoardLayout);
    }
    if (Array.isArray(uiConfig.boardLayouts)) {
      for (const layoutRef of uiConfig.boardLayouts) {
        if (typeof layoutRef === "string") {
          referencedLayouts.add(layoutRef);
        }
      }
    }
    for (const layoutRef of referencedLayouts) {
      if (!fileNames.has(layoutRef)) {
        issues.push({ severity: "error", file: gameDefinitionPath, message: `Board layout ${layoutRef} is missing` });
      }
    }

    const referencedPresentationCatalogs = new Set<string>();
    if (typeof uiConfig.defaultPresentationCatalog === "string") {
      referencedPresentationCatalogs.add(uiConfig.defaultPresentationCatalog);
    }
    if (Array.isArray(uiConfig.presentationCatalogs)) {
      for (const catalogRef of uiConfig.presentationCatalogs) {
        if (typeof catalogRef === "string") {
          referencedPresentationCatalogs.add(catalogRef);
        }
      }
    }
    for (const catalogRef of referencedPresentationCatalogs) {
      if (!fileNames.has(catalogRef)) {
        issues.push({ severity: "error", file: gameDefinitionPath, message: `Presentation catalog ${catalogRef} is missing` });
      }
    }

    const referencedPreviewFixtures = new Set<string>();
    if (typeof uiConfig.defaultPreviewFixture === "string") {
      referencedPreviewFixtures.add(uiConfig.defaultPreviewFixture);
    }
    if (Array.isArray(uiConfig.previewFixtures)) {
      for (const fixtureRef of uiConfig.previewFixtures) {
        if (typeof fixtureRef === "string") {
          referencedPreviewFixtures.add(fixtureRef);
        }
      }
    }
    for (const fixtureRef of referencedPreviewFixtures) {
      if (!fileNames.has(fixtureRef)) {
        issues.push({ severity: "error", file: gameDefinitionPath, message: `UI preview fixture ${fixtureRef} is missing` });
      }
    }

    const referencedPlaytestScripts = new Set<string>();
    if (typeof uiConfig.defaultPlaytestScript === "string") {
      referencedPlaytestScripts.add(uiConfig.defaultPlaytestScript);
    }
    if (Array.isArray(uiConfig.playtestScripts)) {
      for (const scriptRef of uiConfig.playtestScripts) {
        if (typeof scriptRef === "string") {
          referencedPlaytestScripts.add(scriptRef);
        }
      }
    }
    for (const scriptRef of referencedPlaytestScripts) {
      if (!fileNames.has(scriptRef)) {
        issues.push({ severity: "error", file: gameDefinitionPath, message: `UI playtest script ${scriptRef} is missing` });
      }
    }
  }

  if (fileNames.has("behaviors.json")) {
    const behaviorsPath = join(dir, "behaviors.json");
    const behaviors = readJson(behaviorsPath) as Record<string, unknown>;
    addSchemaIssues(issues, behaviorsPath, behaviors, behaviorManifestSchema);

    if (!Array.isArray(behaviors.behaviors)) {
      issues.push({ severity: "error", file: behaviorsPath, message: "behaviors must be an array" });
    } else {
      for (const behaviorId of behaviors.behaviors) {
        if (typeof behaviorId !== "string" || behaviorId.length === 0) {
          issues.push({ severity: "error", file: behaviorsPath, message: "behavior ids must be non-empty strings" });
          continue;
        }

        if (behaviorIds.has(behaviorId)) {
          issues.push({ severity: "error", file: behaviorsPath, message: `Duplicate behavior id ${behaviorId}` });
        }

        behaviorIds.add(behaviorId);
      }

      if (Array.isArray(gameDefinition.behaviors)) {
        const gameBehaviorIds = new Set<string>();

        for (const behaviorId of gameDefinition.behaviors) {
          if (typeof behaviorId !== "string" || behaviorId.length === 0) {
            issues.push({ severity: "error", file: gameDefinitionPath, message: "game behavior ids must be non-empty strings" });
            continue;
          }

          if (gameBehaviorIds.has(behaviorId)) {
            issues.push({ severity: "error", file: gameDefinitionPath, message: `Duplicate game behavior id ${behaviorId}` });
          }

          gameBehaviorIds.add(behaviorId);

          if (!behaviorIds.has(behaviorId)) {
            issues.push({ severity: "error", file: gameDefinitionPath, message: `Behavior ${behaviorId} is missing from behaviors.json` });
          }
        }

        for (const behaviorId of behaviorIds) {
          if (!gameBehaviorIds.has(behaviorId)) {
            issues.push({ severity: "error", file: behaviorsPath, message: `Behavior ${behaviorId} is not referenced by game-definition.json` });
          }
        }
      }
    }
  }

  if (fileNames.has("asset-manifest.json")) {
    const assetManifestPath = join(dir, "asset-manifest.json");
    const manifest = readJson(assetManifestPath) as Record<string, unknown>;
    addSchemaIssues(issues, assetManifestPath, manifest, assetManifestSchema);
    addAssetCompatibilityIssues(issues, assetManifestPath, manifest);
    if (!Array.isArray(manifest.assets)) {
      issues.push({ severity: "error", file: assetManifestPath, message: "assets must be an array" });
    } else {
      for (const asset of manifest.assets) {
        if (typeof asset === "object" && asset !== null && !Array.isArray(asset)) {
          const assetId = (asset as Record<string, unknown>).assetId;
          if (typeof assetId === "string") {
            assetIds.add(assetId);
          }
        }
      }
    }
  }

  if (fileNames.has("localization.json")) {
    const localizationPath = join(dir, "localization.json");
    const localization = readJson(localizationPath) as Record<string, unknown>;
    addSchemaIssues(issues, localizationPath, localization, localizationBundleSchema);
    addLocalizationPlaceholderIssues(issues, localizationPath, localization);
    if (!localization.locale || typeof localization.strings !== "object") {
      issues.push({ severity: "error", file: localizationPath, message: "localization requires locale and strings" });
    } else if (localization.strings && typeof localization.strings === "object" && !Array.isArray(localization.strings)) {
      for (const key of Object.keys(localization.strings)) {
        localizationKeys.add(key);
      }
    }
  }

  const cardCatalogFile = typeof gameDefinition.cardCatalog === "string" ? gameDefinition.cardCatalog : "card-catalog.json";
  for (const uiFile of [...fileNames].filter((fileName) => fileName.startsWith("ui/") && fileName.endsWith(".json")).sort()) {
    const uiDocument = readJson(join(dir, uiFile)) as Record<string, unknown>;
    if (uiDocument.kind === "board_layout") {
      addPropertyDisplayDefinitionsToRegistry(propertyDisplayRegistry, uiDocument);
    }
  }

  if (fileNames.has(cardCatalogFile)) {
    const cardCatalogPath = join(dir, cardCatalogFile);
    const catalog = readJson(cardCatalogPath) as Record<string, unknown>;
    addSchemaIssues(issues, cardCatalogPath, catalog, cardCatalogSchema);
    addCardCatalogIssues(issues, cardCatalogPath, catalog, behaviorIds, assetIds, localizationKeys, cardTemplateIds, propertyDisplayRegistry);
  }

  for (const uiFile of [...fileNames].filter((fileName) => fileName.startsWith("ui/") && fileName.endsWith(".json")).sort()) {
    const uiPath = join(dir, uiFile);
    const uiDocument = readJson(uiPath) as Record<string, unknown>;
    if (uiDocument.kind === "board_layout") {
      addSchemaIssues(issues, uiPath, uiDocument, boardLayoutSchema);
      addBoardLayoutIssues(issues, uiPath, uiDocument);
    } else if (uiDocument.kind === "presentation_catalog") {
      addSchemaIssues(issues, uiPath, uiDocument, presentationCatalogSchema);
      addPresentationCatalogIssues(issues, uiPath, uiDocument, cardTemplateIds, behaviorIds, propertyDisplayRegistry);
    } else if (uiDocument.kind === "ui_preview_fixture") {
      addSchemaIssues(issues, uiPath, uiDocument, uiPreviewFixtureSchema);
      addUiPreviewFixtureIssues(issues, uiPath, uiDocument, cardTemplateIds);
    } else if (uiDocument.kind === "ui_playtest_script") {
      addSchemaIssues(issues, uiPath, uiDocument, uiPlaytestScriptSchema);
      addUiPlaytestScriptIssues(issues, uiPath, uiDocument, behaviorIds);
    } else {
      issues.push({ severity: "error", file: uiPath, message: `Unsupported UI document kind ${String(uiDocument.kind)}` });
    }
  }

  return issues;
}

export function buildRulesetBundle(dir: string): BuiltBundle {
  const jsonFiles = collectJsonFiles(dir);
  const files = Object.fromEntries(jsonFiles.map((file) => [relative(dir, file), readJson(file)]));
  const gameDefinition = files["game-definition.json"] as { id?: string; version?: string } | undefined;
  const issues = validateRulesetDir(dir);

  return {
    id: gameDefinition?.id ?? "unknown",
    version: gameDefinition?.version ?? "0.0.0",
    contentHash: hashValue(files),
    files,
    issues
  };
}

export function bundleRefFromBundle(bundle: BuiltBundle): BundleRef {
  return {
    id: bundle.id,
    version: bundle.version,
    contentHash: bundle.contentHash
  };
}

export function contentLockFromBundle(bundle: BuiltBundle): ContentLock {
  const ref = bundleRefFromBundle(bundle);
  return {
    gameDefinition: ref
  };
}
