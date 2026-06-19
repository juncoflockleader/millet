import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  assetManifestSchema,
  behaviorManifestSchema,
  cardCatalogSchema,
  gameDefinitionSchema,
  localizationBundleSchema,
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
const IMAGE_ASSET_KINDS = new Set(["card_art", "card_back", "card_frame", "avatar", "icon"]);
const ALLOWED_IMAGE_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const MIN_CARD_ASSET_DIMENSION = 64;
const MAX_CARD_ASSET_DIMENSION = 8192;

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

function addCardCatalogIssues(
  issues: ValidationIssue[],
  file: string,
  catalog: Record<string, unknown>,
  behaviorIds: Set<string>,
  assetIds: Set<string>,
  localizationKeys: Set<string>
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
  });
}

export function validateRulesetDir(dir: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const jsonFiles = collectJsonFiles(dir);
  const fileNames = new Set(jsonFiles.map((file) => relative(dir, file)));
  const behaviorIds = new Set<string>();
  const assetIds = new Set<string>();
  const localizationKeys = new Set<string>();

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
  if (fileNames.has(cardCatalogFile)) {
    const cardCatalogPath = join(dir, cardCatalogFile);
    const catalog = readJson(cardCatalogPath) as Record<string, unknown>;
    addSchemaIssues(issues, cardCatalogPath, catalog, cardCatalogSchema);
    addCardCatalogIssues(issues, cardCatalogPath, catalog, behaviorIds, assetIds, localizationKeys);
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
