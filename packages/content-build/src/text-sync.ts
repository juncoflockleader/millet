import type { BehaviorDefinition, EffectDefinition, SelectorDefinition } from "../../engine-core/src/index.ts";

export interface TextSyncIssue {
  severity: "error" | "warning";
  behaviorId: string;
  message: string;
}

interface TemplateCandidate {
  path: string;
  template: string;
  privateScope: boolean;
}

const TEMPLATE_PLACEHOLDER_PATTERN = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const BASE_PUBLIC_PLACEHOLDERS = new Set([
  "amount",
  "behaviorId",
  "controller",
  "count",
  "counter",
  "damageType",
  "owner",
  "player",
  "promptType",
  "reason",
  "resource",
  "responder",
  "source",
  "status",
  "target",
  "value"
]);

function numericText(value: unknown): string {
  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object" && value !== null && "source" in value) {
    const definition = value as {
      source?: string;
      values?: unknown[];
      stat?: string;
      counter?: string;
      resource?: string;
      base?: number;
      multiplier?: number;
      delta?: number;
    };
    if (definition.source === "sum") {
      return (definition.values ?? []).map((part) => numericText(part)).join(" + ") || "0";
    }

    const source =
      definition.source === "object_stat"
        ? definition.stat
        : definition.source === "object_counter"
          ? definition.counter
          : definition.source === "matching_object_stat_sum"
            ? `${definition.base ?? 0} + ${definition.stat ?? "matching stat"}`
            : definition.resource;
    const multiplier = definition.multiplier === undefined ? "" : ` x${definition.multiplier}`;
    const delta = definition.delta === undefined ? "" : definition.delta >= 0 ? ` +${definition.delta}` : ` ${definition.delta}`;
    return `${source ?? "value"}${multiplier}${delta}`;
  }

  return "value";
}

function effectText(effect: EffectDefinition): string {
  switch (effect.type) {
    case "deal_damage":
      return `Deal ${numericText(effect.amount)} damage.`;
    case "deal_damage_to_object":
      return `Deal ${numericText(effect.amount)} damage to an object.`;
    case "deal_damage_to_matching_objects":
      return `Deal ${numericText(effect.amount)} damage to matching objects.`;
    case "deal_damage_to_random_targets":
      return `Deal ${numericText(effect.amount)} damage to ${numericText(effect.count)} random targets.`;
    case "deal_damage_all_players":
      return `Deal ${numericText(effect.amount)} damage to all players.`;
    case "deal_damage_to_matching_players":
      return `Deal ${numericText(effect.amount)} damage to matching players.`;
    case "heal":
      return `Restore ${numericText(effect.amount)} health.`;
    case "heal_object":
      return `Restore ${numericText(effect.amount)} health to an object.`;
    case "heal_matching_objects":
      return `Restore ${numericText(effect.amount)} health to matching objects.`;
    case "prevent_next_damage":
      return `Prevent the next ${effect.amount} damage.`;
    case "draw_cards":
      return `Draw ${effect.count} card${effect.count === 1 ? "" : "s"}.`;
    case "move_card":
      return "Move this card.";
    case "equip_object":
      return `Equip an object as ${effect.slotTag}.`;
    case "play_object":
      return `Play a ${effect.objectType ?? "object"}.`;
    case "copy_random_object_from_zone":
      return "Copy a random object into a zone.";
    case "resolve_delayed_effect":
      return "Resolve a delayed effect.";
    case "resolve_delayed_effects_in_zone":
      return "Resolve delayed effects in a zone.";
    case "resolve_delayed_judgment":
      return "Judge a card, then resolve a delayed effect on hit.";
    case "resolve_delayed_judgments_in_zone":
      return "Judge and resolve delayed effects in a zone.";
    case "destroy_object":
      return "Destroy an object.";
    case "discard_to_hand_limit":
      return "Discard down to hand limit.";
    case "set_object_exhausted":
      return effect.exhausted ? "Exhaust an object." : "Ready an object.";
    case "set_object_exhausted_on_matching_objects":
      return effect.exhausted ? "Exhaust matching objects." : "Ready matching objects.";
    case "set_object_keyword":
      return effect.present ? `Give an object ${effect.keyword}.` : `Remove ${effect.keyword} from an object.`;
    case "set_object_keyword_on_matching_objects":
      return effect.present ? `Give matching objects ${effect.keyword}.` : `Remove ${effect.keyword} from matching objects.`;
    case "transform_object":
      return `Transform an object${effect.templateId ? ` into ${effect.templateId}` : ""}.`;
    case "change_object_control":
      return "Change control of an object.";
    case "create_object":
      return `Create a ${effect.object.objectType}.`;
    case "adjust_object_counter":
      return `Adjust ${effect.counter} by ${effect.delta}.`;
    case "set_object_stat":
      return `Set ${effect.stat} to ${numericText(effect.value)}.`;
    case "adjust_object_stat":
      return `Adjust ${effect.stat} by ${numericText(effect.delta)}.`;
    case "adjust_object_stat_on_matching_objects":
      return `Adjust matching ${effect.stat} by ${numericText(effect.delta)}.`;
    case "destroy_object_if_counter_at_most":
      return `Destroy an object if ${effect.counter} is at most ${effect.value}.`;
    case "register_trigger":
      return "Register a triggered ability.";
    case "open_prompt":
      return `Open a ${effect.promptType} prompt.`;
    case "set_resource":
      return `Set ${effect.resource} to ${effect.current}.`;
    case "adjust_resource":
      return `Adjust ${effect.resource} by ${effect.delta}.`;
    case "toggle_resource":
      return `Toggle ${effect.resource}.`;
    case "execute_behavior_if_resource":
      return `Resolve ${effect.behaviorId} if ${effect.resource} matches.`;
    case "set_player_status":
      return `Set a player status to ${effect.status}.`;
  }
}

export function generateCanonicalText(behavior: BehaviorDefinition): string {
  if (behavior.text?.template) {
    return behavior.text.template;
  }

  return behavior.effects.map((effect) => effectText(effect)).join(" ");
}

export function generateUxHints(behavior: BehaviorDefinition): Record<string, unknown> {
  const selectors = Object.fromEntries((behavior.selectors ?? []).map((selector: SelectorDefinition) => [
    selector.id,
    {
      from: selector.from,
      count: selector.count,
      match: selector.match ?? {}
    }
  ]));

  return {
    selectors,
    effects: behavior.effects.map((effect) => effect.type),
    ...(behavior.ux ?? {})
  };
}

function templatePlaceholders(template: string): string[] {
  return [...template.matchAll(TEMPLATE_PLACEHOLDER_PATTERN)].map((match) => match[1]!);
}

function hasMalformedPlaceholderSyntax(template: string): boolean {
  return template.replace(TEMPLATE_PLACEHOLDER_PATTERN, "").includes("{") || template.replace(TEMPLATE_PLACEHOLDER_PATTERN, "").includes("}");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrivateTemplatePath(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized.includes("private") || normalized.includes("owner") || normalized.includes("responder");
}

function isPrivateTemplateRecord(value: Record<string, unknown>): boolean {
  for (const field of ["visibility", "audience", "scope"]) {
    const marker = value[field];
    if (typeof marker === "string" && marker !== "public") {
      return true;
    }
  }

  return false;
}

function isTemplateLikePath(path: string): boolean {
  const normalized = path.toLowerCase();
  return normalized.includes("template") || normalized.includes("title") || normalized.includes("label") || normalized.includes("log");
}

function collectTemplateCandidates(value: unknown, path: string, privateScope: boolean): TemplateCandidate[] {
  if (typeof value === "string") {
    if (value.includes("{") || value.includes("}") || isTemplateLikePath(path)) {
      return [{ path, template: value, privateScope: privateScope || isPrivateTemplatePath(path) }];
    }

    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectTemplateCandidates(entry, `${path}[${index}]`, privateScope));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nextPrivateScope = privateScope || isPrivateTemplatePath(path) || isPrivateTemplateRecord(value);
  return Object.entries(value).flatMap(([key, entry]) => collectTemplateCandidates(entry, path ? `${path}.${key}` : key, nextPrivateScope));
}

function publicPlaceholderSet(behavior: BehaviorDefinition): Set<string> {
  const placeholders = new Set(BASE_PUBLIC_PLACEHOLDERS);

  for (const selector of behavior.selectors ?? []) {
    placeholders.add(selector.id);
  }

  for (const effect of behavior.effects) {
    placeholders.add(effect.type);
    switch (effect.type) {
      case "deal_damage":
      case "deal_damage_to_object":
      case "deal_damage_to_matching_objects":
      case "deal_damage_to_random_targets":
      case "deal_damage_all_players":
      case "deal_damage_to_matching_players":
        placeholders.add("amount");
        placeholders.add("count");
        placeholders.add("damageType");
        break;
      case "heal":
      case "heal_object":
      case "heal_matching_objects":
      case "prevent_next_damage":
      case "draw_cards":
        placeholders.add("count");
        placeholders.add("amount");
        placeholders.add("reason");
        break;
      case "equip_object":
        placeholders.add("slotTag");
        break;
      case "play_object":
        placeholders.add("objectType");
        placeholders.add("fromZoneType");
        placeholders.add("reason");
        placeholders.add("behaviorId");
        break;
      case "copy_random_object_from_zone":
        placeholders.add("reason");
        break;
      case "set_object_keyword":
      case "set_object_keyword_on_matching_objects":
        placeholders.add("keyword");
        placeholders.add("reason");
        break;
      case "transform_object":
        placeholders.add("templateId");
        placeholders.add("objectType");
        placeholders.add("reason");
        break;
      case "change_object_control":
        placeholders.add("controller");
        placeholders.add("reason");
        break;
      case "open_prompt":
        placeholders.add("promptType");
        break;
      case "set_resource":
      case "adjust_resource":
      case "toggle_resource":
      case "execute_behavior_if_resource":
        placeholders.add("resource");
        placeholders.add("behaviorId");
        break;
      case "set_player_status":
        placeholders.add("status");
        break;
      case "adjust_object_counter":
      case "destroy_object_if_counter_at_most":
        placeholders.add("counter");
        placeholders.add("value");
        break;
      case "set_object_stat":
      case "adjust_object_stat":
      case "adjust_object_stat_on_matching_objects":
        placeholders.add("stat");
        placeholders.add("value");
        break;
      case "create_object":
        placeholders.add("objectType");
        break;
    }
  }

  return placeholders;
}

function isPrivatePlaceholder(placeholder: string): boolean {
  const normalized = placeholder.toLowerCase();
  return (
    normalized.includes("templateid") ||
    normalized.includes("objectid") ||
    normalized.includes("zoneid") ||
    normalized.includes("ownerid") ||
    normalized.includes("controllerid") ||
    normalized.includes("creatorid") ||
    normalized.includes("role") ||
    normalized.includes("identity") ||
    normalized.includes("hand") ||
    normalized.includes("deck") ||
    normalized.includes("hidden") ||
    normalized.includes("private") ||
    normalized.includes("cardtemplate")
  );
}

export function validateBehaviorTemplates(behavior: BehaviorDefinition): TextSyncIssue[] {
  const issues: TextSyncIssue[] = [];
  const allowedPublicPlaceholders = publicPlaceholderSet(behavior);
  const candidates = [
    ...(behavior.text?.template ? [{ path: "text.template", template: behavior.text.template, privateScope: false }] : []),
    ...collectTemplateCandidates(behavior.ux, "ux", false)
  ];

  for (const candidate of candidates) {
    if (hasMalformedPlaceholderSyntax(candidate.template)) {
      issues.push({
        severity: "error",
        behaviorId: behavior.id,
        message: `${candidate.path} has malformed placeholder syntax`
      });
      continue;
    }

    for (const placeholder of templatePlaceholders(candidate.template)) {
      if (!candidate.privateScope && isPrivatePlaceholder(placeholder)) {
        issues.push({
          severity: "error",
          behaviorId: behavior.id,
          message: `${candidate.path} references private placeholder {${placeholder}} in a public template`
        });
        continue;
      }

      if (!allowedPublicPlaceholders.has(placeholder) && !isPrivatePlaceholder(placeholder)) {
        issues.push({
          severity: "warning",
          behaviorId: behavior.id,
          message: `${candidate.path} references unresolved placeholder {${placeholder}}`
        });
      }
    }
  }

  return issues;
}

export function validateBehaviorText(behavior: BehaviorDefinition): TextSyncIssue[] {
  const issues: TextSyncIssue[] = validateBehaviorTemplates(behavior);
  const canonical = generateCanonicalText(behavior).toLowerCase();
  const canonicalPlaceholders = new Set(templatePlaceholders(generateCanonicalText(behavior)));

  for (const effect of behavior.effects) {
    if (effect.type === "deal_damage" && !canonical.includes(String(effect.amount)) && !canonicalPlaceholders.has("amount")) {
      issues.push({
        severity: "warning",
        behaviorId: behavior.id,
        message: `Text does not mention damage amount ${effect.amount}`
      });
    }

    if (effect.type === "draw_cards" && !canonical.includes(String(effect.count)) && !canonicalPlaceholders.has("count")) {
      issues.push({
        severity: "warning",
        behaviorId: behavior.id,
        message: `Text does not mention draw count ${effect.count}`
      });
    }
  }

  return issues;
}
