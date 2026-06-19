import type { BuiltBundle, ValidationIssue } from "./build.ts";

export interface DependencyNode {
  id: string;
  type: "ruleset" | "file" | "behavior" | "zone" | "asset" | "localization" | "card_template";
  label: string;
  file?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  kind: "contains" | "references" | "declares";
}

export interface RulesetDependencyReport {
  id: string;
  version: string;
  contentHash: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  issues: ValidationIssue[];
}

function node(id: string, type: DependencyNode["type"], label: string, file?: string): DependencyNode {
  return { id, type, label, file };
}

function edge(from: string, to: string, kind: DependencyEdge["kind"]): DependencyEdge {
  return { from, to, kind };
}

export function createRulesetDependencyReport(bundle: BuiltBundle): RulesetDependencyReport {
  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  const rulesetNodeId = `ruleset:${bundle.id}`;

  function addNode(dependencyNode: DependencyNode): void {
    nodes.set(dependencyNode.id, dependencyNode);
  }

  function addEdge(from: string, to: string, kind: DependencyEdge["kind"]): void {
    edges.push(edge(from, to, kind));
  }

  addNode(node(rulesetNodeId, "ruleset", `${bundle.id}@${bundle.version}`));

  for (const file of Object.keys(bundle.files).sort()) {
    const fileNodeId = `file:${file}`;
    addNode(node(fileNodeId, "file", file, file));
    addEdge(rulesetNodeId, fileNodeId, "contains");
  }

  const gameDefinition = bundle.files["game-definition.json"] as
    | {
        behaviors?: unknown[];
        cardCatalog?: unknown;
        zones?: { id?: unknown; zoneType?: unknown }[];
      }
    | undefined;
  const behaviorManifest = bundle.files["behaviors.json"] as { behaviors?: unknown[] } | undefined;
  const assetManifest = bundle.files["asset-manifest.json"] as { assets?: { assetId?: unknown }[] } | undefined;
  const cardCatalogFile = typeof gameDefinition?.cardCatalog === "string" ? gameDefinition.cardCatalog : "card-catalog.json";
  const cardCatalog = bundle.files[cardCatalogFile] as
    | { templates?: { templateId?: unknown; behaviorIds?: unknown[]; assetRefs?: unknown[] }[] }
    | undefined;
  const localization = bundle.files["localization.json"] as { strings?: Record<string, unknown> } | undefined;

  for (const behaviorId of gameDefinition?.behaviors ?? []) {
    if (typeof behaviorId !== "string") {
      continue;
    }

    const behaviorNodeId = `behavior:${behaviorId}`;
    addNode(node(behaviorNodeId, "behavior", behaviorId));
    addEdge("file:game-definition.json", behaviorNodeId, "references");
  }

  for (const behaviorId of behaviorManifest?.behaviors ?? []) {
    if (typeof behaviorId !== "string") {
      continue;
    }

    const behaviorNodeId = `behavior:${behaviorId}`;
    addNode(node(behaviorNodeId, "behavior", behaviorId));
    addEdge("file:behaviors.json", behaviorNodeId, "declares");
  }

  for (const zone of gameDefinition?.zones ?? []) {
    if (typeof zone.id !== "string") {
      continue;
    }

    const zoneNodeId = `zone:${zone.id}`;
    addNode(node(zoneNodeId, "zone", typeof zone.zoneType === "string" ? `${zone.id} (${zone.zoneType})` : zone.id));
    addEdge("file:game-definition.json", zoneNodeId, "declares");
  }

  for (const asset of assetManifest?.assets ?? []) {
    if (typeof asset.assetId !== "string") {
      continue;
    }

    const assetNodeId = `asset:${asset.assetId}`;
    addNode(node(assetNodeId, "asset", asset.assetId));
    addEdge("file:asset-manifest.json", assetNodeId, "declares");
  }

  for (const template of cardCatalog?.templates ?? []) {
    if (typeof template.templateId !== "string") {
      continue;
    }

    const templateNodeId = `card_template:${template.templateId}`;
    addNode(node(templateNodeId, "card_template", template.templateId));
    addEdge(`file:${cardCatalogFile}`, templateNodeId, "declares");

    for (const behaviorId of template.behaviorIds ?? []) {
      if (typeof behaviorId !== "string") {
        continue;
      }

      const behaviorNodeId = `behavior:${behaviorId}`;
      addNode(node(behaviorNodeId, "behavior", behaviorId));
      addEdge(templateNodeId, behaviorNodeId, "references");
    }

    for (const assetId of template.assetRefs ?? []) {
      if (typeof assetId !== "string") {
        continue;
      }

      const assetNodeId = `asset:${assetId}`;
      addNode(node(assetNodeId, "asset", assetId));
      addEdge(templateNodeId, assetNodeId, "references");
    }
  }

  for (const key of Object.keys(localization?.strings ?? {}).sort()) {
    const localizationNodeId = `localization:${key}`;
    addNode(node(localizationNodeId, "localization", key));
    addEdge("file:localization.json", localizationNodeId, "declares");
  }

  return {
    id: bundle.id,
    version: bundle.version,
    contentHash: bundle.contentHash,
    nodes: [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    edges: edges.sort((left, right) => `${left.from}:${left.to}:${left.kind}`.localeCompare(`${right.from}:${right.to}:${right.kind}`)),
    issues: bundle.issues
  };
}
