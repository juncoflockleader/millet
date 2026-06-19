import type { MatchState, OutcomeResult, ResourceState } from "../../engine-core/src/index.ts";

export interface DiffEntry {
  path: string;
  left: unknown;
  right: unknown;
}

export interface SemanticDiffEntry {
  category: "match" | "turn" | "player" | "zone" | "object" | "prompt" | "outcome";
  id?: string;
  field?: string;
  summary: string;
  left?: unknown;
  right?: unknown;
}

export interface MatchStateDiffReport {
  equal: boolean;
  diffs: DiffEntry[];
  semanticDiffs: SemanticDiffEntry[];
  counts: {
    structural: number;
    semantic: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function diffValues(left: unknown, right: unknown, path = "$"): DiffEntry[] {
  if (Object.is(left, right)) {
    return [];
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    const length = Math.max(left.length, right.length);
    const diffs: DiffEntry[] = [];

    for (let index = 0; index < length; index += 1) {
      diffs.push(...diffValues(left[index], right[index], `${path}[${index}]`));
    }

    return diffs;
  }

  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    const diffs: DiffEntry[] = [];

    for (const key of [...keys].sort()) {
      diffs.push(...diffValues(left[key], right[key], `${path}.${key}`));
    }

    return diffs;
  }

  return [{ path, left, right }];
}

export function createMatchStateDiff(left: MatchState, right: MatchState): MatchStateDiffReport {
  const diffs = diffValues(left, right);
  const semanticDiffs = [
    ...diffMatchMetadata(left, right),
    ...diffTurn(left, right),
    ...diffPlayers(left, right),
    ...diffZones(left, right),
    ...diffObjects(left, right),
    ...diffPrompts(left, right),
    ...diffOutcomes(left, right)
  ];

  return {
    equal: diffs.length === 0,
    diffs,
    semanticDiffs,
    counts: {
      structural: diffs.length,
      semantic: semanticDiffs.length
    }
  };
}

function diffMatchMetadata(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const field of ["matchId", "gameDefinitionId", "gameDefinitionVersion", "status", "seed", "rngCursor", "lastSequence"] as const) {
    if (!Object.is(left[field], right[field])) {
      entries.push({
        category: "match",
        field,
        summary: `Match ${field} changed from ${formatValue(left[field])} to ${formatValue(right[field])}.`,
        left: left[field],
        right: right[field]
      });
    }
  }

  return entries;
}

function diffTurn(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const field of ["turnNumber", "roundNumber", "activePlayerId", "phaseId", "priorityPlayerId"] as const) {
    if (!Object.is(left.turn[field], right.turn[field])) {
      entries.push({
        category: "turn",
        field,
        summary: `Turn ${field} changed from ${formatValue(left.turn[field])} to ${formatValue(right.turn[field])}.`,
        left: left.turn[field],
        right: right.turn[field]
      });
    }
  }

  return entries;
}

function diffPlayers(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const playerId of sortedKeys(left.players, right.players)) {
    const leftPlayer = left.players[playerId];
    const rightPlayer = right.players[playerId];

    if (!leftPlayer || !rightPlayer) {
      entries.push({
        category: "player",
        id: playerId,
        summary: leftPlayer ? `Player ${playerId} was removed.` : `Player ${playerId} was added.`,
        left: leftPlayer,
        right: rightPlayer
      });
      continue;
    }

    for (const field of ["userId", "seatId", "controllerId", "status", "roleRef", "characterRef", "heroRef", "teamId", "factionId"] as const) {
      if (!Object.is(leftPlayer[field], rightPlayer[field])) {
        entries.push({
          category: "player",
          id: playerId,
          field,
          summary: `Player ${playerId} ${field} changed from ${formatValue(leftPlayer[field])} to ${formatValue(rightPlayer[field])}.`,
          left: leftPlayer[field],
          right: rightPlayer[field]
        });
      }
    }

    for (const resource of sortedKeys(leftPlayer.resources, rightPlayer.resources)) {
      const leftResource = leftPlayer.resources[resource];
      const rightResource = rightPlayer.resources[resource];
      if (!resourceEquals(leftResource, rightResource)) {
        entries.push({
          category: "player",
          id: playerId,
          field: `resources.${resource}`,
          summary: `Player ${playerId} ${resource} changed from ${formatResource(leftResource)} to ${formatResource(rightResource)}.`,
          left: leftResource,
          right: rightResource
        });
      }
    }
  }

  return entries;
}

function diffZones(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const zoneId of sortedKeys(left.zones, right.zones)) {
    const leftZone = left.zones[zoneId];
    const rightZone = right.zones[zoneId];

    if (!leftZone || !rightZone) {
      entries.push({
        category: "zone",
        id: zoneId,
        summary: leftZone ? `Zone ${zoneId} was removed.` : `Zone ${zoneId} was added.`,
        left: leftZone,
        right: rightZone
      });
      continue;
    }

    for (const field of ["ownerId", "zoneType", "ordering", "capacity"] as const) {
      if (!Object.is(leftZone[field], rightZone[field])) {
        entries.push({
          category: "zone",
          id: zoneId,
          field,
          summary: `Zone ${zoneId} ${field} changed from ${formatValue(leftZone[field])} to ${formatValue(rightZone[field])}.`,
          left: leftZone[field],
          right: rightZone[field]
        });
      }
    }

    const added = rightZone.objectIds.filter((objectId) => !leftZone.objectIds.includes(objectId));
    const removed = leftZone.objectIds.filter((objectId) => !rightZone.objectIds.includes(objectId));
    const sameMembers = added.length === 0 && removed.length === 0;
    const sameOrder = sameMembers && leftZone.objectIds.some((objectId, index) => rightZone.objectIds[index] !== objectId);

    if (added.length > 0 || removed.length > 0 || sameOrder) {
      entries.push({
        category: "zone",
        id: zoneId,
        field: "objectIds",
        summary: summarizeZoneMembership(zoneId, added, removed, sameOrder),
        left: leftZone.objectIds,
        right: rightZone.objectIds
      });
    }
  }

  return entries;
}

function diffObjects(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const objectId of sortedKeys(left.objects, right.objects)) {
    const leftObject = left.objects[objectId];
    const rightObject = right.objects[objectId];

    if (!leftObject || !rightObject) {
      entries.push({
        category: "object",
        id: objectId,
        summary: leftObject ? `Object ${objectId} was removed.` : `Object ${objectId} was added.`,
        left: leftObject,
        right: rightObject
      });
      continue;
    }

    for (const field of ["templateId", "objectType", "ownerId", "controllerId", "creatorId", "zoneId", "position", "exhausted"] as const) {
      if (!Object.is(leftObject[field], rightObject[field])) {
        const summary =
          field === "zoneId"
            ? `Object ${objectId} moved from ${formatValue(leftObject.zoneId)} to ${formatValue(rightObject.zoneId)}.`
            : `Object ${objectId} ${field} changed from ${formatValue(leftObject[field])} to ${formatValue(rightObject[field])}.`;
        entries.push({
          category: "object",
          id: objectId,
          field,
          summary,
          left: leftObject[field],
          right: rightObject[field]
        });
      }
    }

    for (const field of ["tags", "keywords", "attachments", "modifiers"] as const) {
      if (!sameStringArray(leftObject[field], rightObject[field])) {
        entries.push({
          category: "object",
          id: objectId,
          field,
          summary: `Object ${objectId} ${field} changed from ${formatList(leftObject[field])} to ${formatList(rightObject[field])}.`,
          left: leftObject[field],
          right: rightObject[field]
        });
      }
    }
  }

  return entries;
}

function diffPrompts(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];

  for (const promptId of sortedKeys(left.prompts, right.prompts)) {
    const leftPrompt = left.prompts[promptId];
    const rightPrompt = right.prompts[promptId];

    if (!leftPrompt || !rightPrompt) {
      entries.push({
        category: "prompt",
        id: promptId,
        summary: leftPrompt ? `Prompt ${promptId} was removed.` : `Prompt ${promptId} was added.`,
        left: leftPrompt,
        right: rightPrompt
      });
      continue;
    }

    for (const field of ["status", "promptType", "responseMode", "currentResponderId", "openedAtSequence"] as const) {
      if (!Object.is(leftPrompt[field], rightPrompt[field])) {
        entries.push({
          category: "prompt",
          id: promptId,
          field,
          summary: `Prompt ${promptId} ${field} changed from ${formatValue(leftPrompt[field])} to ${formatValue(rightPrompt[field])}.`,
          left: leftPrompt[field],
          right: rightPrompt[field]
        });
      }
    }
  }

  return entries;
}

function diffOutcomes(left: MatchState, right: MatchState): SemanticDiffEntry[] {
  const entries: SemanticDiffEntry[] = [];
  const leftOutcomes = Object.fromEntries(left.outcomes.map((outcome) => [outcome.id, outcome]));
  const rightOutcomes = Object.fromEntries(right.outcomes.map((outcome) => [outcome.id, outcome]));

  for (const outcomeId of sortedKeys(leftOutcomes, rightOutcomes)) {
    const leftOutcome = leftOutcomes[outcomeId];
    const rightOutcome = rightOutcomes[outcomeId];

    if (!leftOutcome || !rightOutcome) {
      entries.push({
        category: "outcome",
        id: outcomeId,
        summary: leftOutcome ? `Outcome ${outcomeId} was removed.` : `Outcome ${outcomeId} was added.`,
        left: leftOutcome,
        right: rightOutcome
      });
      continue;
    }

    if (leftOutcome.status !== rightOutcome.status) {
      entries.push({
        category: "outcome",
        id: outcomeId,
        field: "status",
        summary: `Outcome ${outcomeId} status changed from ${leftOutcome.status} to ${rightOutcome.status}.`,
        left: leftOutcome.status,
        right: rightOutcome.status
      });
    }

    const resultEntries = diffOutcomeResults(leftOutcome.results, rightOutcome.results);
    for (const entry of resultEntries) {
      entries.push({ category: "outcome", id: outcomeId, ...entry });
    }
  }

  return entries;
}

function diffOutcomeResults(
  left: readonly OutcomeResult[],
  right: readonly OutcomeResult[]
): Omit<SemanticDiffEntry, "category" | "id">[] {
  const entries: Omit<SemanticDiffEntry, "category" | "id">[] = [];
  const leftResults = Object.fromEntries(left.map((result) => [result.playerId, result]));
  const rightResults = Object.fromEntries(right.map((result) => [result.playerId, result]));

  for (const playerId of sortedKeys(leftResults, rightResults)) {
    const leftResult = leftResults[playerId];
    const rightResult = rightResults[playerId];

    if (!leftResult || !rightResult) {
      entries.push({
        field: `results.${playerId}`,
        summary: leftResult ? `Outcome result for ${playerId} was removed.` : `Outcome result for ${playerId} was added.`,
        left: leftResult,
        right: rightResult
      });
      continue;
    }

    for (const field of ["status", "reason", "faction"] as const) {
      if (!Object.is(leftResult[field], rightResult[field])) {
        entries.push({
          field: `results.${playerId}.${field}`,
          summary: `Outcome result for ${playerId} ${field} changed from ${formatValue(leftResult[field])} to ${formatValue(rightResult[field])}.`,
          left: leftResult[field],
          right: rightResult[field]
        });
      }
    }
  }

  return entries;
}

function sortedKeys<T>(left: Record<string, T>, right: Record<string, T>): string[] {
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
}

function resourceEquals(left: ResourceState | undefined, right: ResourceState | undefined): boolean {
  return left?.current === right?.current && left?.max === right?.max;
}

function formatResource(resource: ResourceState | undefined): string {
  if (!resource) {
    return "missing";
  }

  return resource.max === undefined ? String(resource.current) : `${resource.current}/${resource.max}`;
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => right[index] === value);
}

function formatList(values: readonly string[]): string {
  return values.length === 0 ? "[]" : `[${values.join(", ")}]`;
}

function summarizeZoneMembership(zoneId: string, added: string[], removed: string[], reordered: boolean): string {
  const parts = [];
  if (added.length > 0) {
    parts.push(`added ${formatList(added)}`);
  }
  if (removed.length > 0) {
    parts.push(`removed ${formatList(removed)}`);
  }
  if (reordered) {
    parts.push("reordered existing objects");
  }

  return `Zone ${zoneId} ${parts.join("; ")}.`;
}

function formatValue(value: unknown): string {
  return value === undefined ? "missing" : JSON.stringify(value);
}
