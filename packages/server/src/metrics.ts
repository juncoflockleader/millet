import { createEmptyMatchState, hashValue, reduceEvent, type ContentLock, type MatchEvent, type MatchState } from "../../engine-core/src/index.ts";

export interface MatchMetrics {
  matchId: string;
  status: string;
  eventCount: number;
  eventTypes: Record<string, number>;
  promptCount: number;
  damageEvents: number;
  cardsMoved: number;
  deaths: number;
  outcomeCount: number;
  currentTurn: number;
  currentPhase?: string;
}

export function collectMatchMetrics(state: MatchState, events: readonly MatchEvent[]): MatchMetrics {
  return {
    matchId: state.matchId,
    status: state.status,
    eventCount: events.length,
    eventTypes: countEventsByType(events),
    promptCount: events.filter((event) => event.type === "prompt_opened").length,
    damageEvents: events.filter((event) => event.type === "damage_dealt").length,
    cardsMoved: events.filter((event) => event.type === "card_moved").length,
    deaths: Object.values(state.players).filter((player) => player.status === "dead").length,
    outcomeCount: state.outcomes.length,
    currentTurn: state.turn.turnNumber,
    currentPhase: state.turn.phaseId
  };
}

export interface MatchMetricsSnapshot {
  format: "millet.metrics.v1";
  matchId: string;
  gameDefinitionId: string;
  gameDefinitionVersion: string;
  status: string;
  lastSequence: number;
  stateHash: string;
  contentHashes: string[];
  activePlayerId?: string;
  currentPhase?: string;
  players: {
    id: string;
    status: string;
    factionId?: string;
    health?: number;
    maxHealth?: number;
  }[];
  openPrompts: {
    id: string;
    promptType: string;
    responseMode?: string;
    responderIds: string[];
    currentResponderId?: string;
    openedAtSequence: number;
  }[];
  outcomes: {
    id: string;
    status: string;
    results: {
      playerId: string;
      status: string;
      reason: string;
      faction?: string;
    }[];
  }[];
  metrics: MatchMetrics;
}

export function createMetricsSnapshot(state: MatchState, events: readonly MatchEvent[]): MatchMetricsSnapshot {
  return {
    format: "millet.metrics.v1",
    matchId: state.matchId,
    gameDefinitionId: state.gameDefinitionId,
    gameDefinitionVersion: state.gameDefinitionVersion,
    status: state.status,
    lastSequence: state.lastSequence,
    stateHash: hashValue(state),
    contentHashes: contentHashesFromLock(state.contentLock),
    activePlayerId: state.turn.activePlayerId,
    currentPhase: state.turn.phaseId,
    players: Object.values(state.players)
      .map((player) => ({
        id: player.id,
        status: player.status,
        factionId: player.factionId,
        health: player.resources.health?.current,
        maxHealth: player.resources.health?.max
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    openPrompts: Object.values(state.prompts)
      .filter((prompt) => prompt.status === "open")
      .map((prompt) => ({
        id: prompt.id,
        promptType: prompt.promptType,
        responseMode: prompt.responseMode,
        responderIds: [...prompt.responderIds],
        currentResponderId: prompt.currentResponderId,
        openedAtSequence: prompt.openedAtSequence
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    outcomes: state.outcomes
      .map((outcome) => ({
        id: outcome.id,
        status: outcome.status,
        results: outcome.results.map((result) => ({
          playerId: result.playerId,
          status: result.status,
          reason: result.reason,
          faction: result.faction
        }))
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    metrics: collectMatchMetrics(state, events)
  };
}

export function formatMetricsText(snapshot: MatchMetricsSnapshot): string {
  const matchLabels = {
    match_id: snapshot.matchId,
    game_definition_id: snapshot.gameDefinitionId,
    status: snapshot.status
  };
  const lines = [
    "# HELP millet_match_last_sequence Last applied event sequence for a match.",
    "# TYPE millet_match_last_sequence gauge",
    `millet_match_last_sequence${formatLabels(matchLabels)} ${snapshot.lastSequence}`,
    "# HELP millet_match_events_total Total events observed for a match.",
    "# TYPE millet_match_events_total counter",
    `millet_match_events_total${formatLabels(matchLabels)} ${snapshot.metrics.eventCount}`,
    "# HELP millet_match_event_type_total Events observed by type for a match.",
    "# TYPE millet_match_event_type_total counter"
  ];

  for (const [eventType, count] of Object.entries(snapshot.metrics.eventTypes)) {
    lines.push(`millet_match_event_type_total${formatLabels({ ...matchLabels, event_type: eventType })} ${count}`);
  }

  lines.push(
    "# HELP millet_match_open_prompts Current open prompt count for a match.",
    "# TYPE millet_match_open_prompts gauge",
    `millet_match_open_prompts${formatLabels(matchLabels)} ${snapshot.openPrompts.length}`,
    "# HELP millet_match_dead_players Current dead player count for a match.",
    "# TYPE millet_match_dead_players gauge",
    `millet_match_dead_players${formatLabels(matchLabels)} ${snapshot.metrics.deaths}`,
    "# HELP millet_match_outcomes Current outcome count for a match.",
    "# TYPE millet_match_outcomes gauge",
    `millet_match_outcomes${formatLabels(matchLabels)} ${snapshot.metrics.outcomeCount}`
  );

  return `${lines.join("\n")}\n`;
}

export interface DebugReport {
  matchId: string;
  status: string;
  players: { id: string; status: string; factionId?: string; health?: number }[];
  zones: { id: string; count: number; objectIds: string[] }[];
  openPrompts: string[];
  lastEvent?: { sequence: number; type: string };
  transactions: TransactionLogEntry[];
  metrics: MatchMetrics;
}

export function createDebugReport(state: MatchState, events: readonly MatchEvent[]): DebugReport {
  const lastEvent = events.at(-1);
  return {
    matchId: state.matchId,
    status: state.status,
    players: Object.values(state.players).map((player) => ({
      id: player.id,
      status: player.status,
      factionId: player.factionId,
      health: player.resources.health?.current
    })),
    zones: Object.values(state.zones).map((zone) => ({
      id: zone.id,
      count: zone.objectIds.length,
      objectIds: [...zone.objectIds]
    })),
    openPrompts: Object.values(state.prompts)
      .filter((prompt) => prompt.status === "open")
      .map((prompt) => prompt.id),
    lastEvent: lastEvent ? { sequence: lastEvent.sequence, type: lastEvent.type } : undefined,
    transactions: createTransactionLog(events),
    metrics: collectMatchMetrics(state, events)
  };
}

export interface TransactionLogEntry {
  matchId: string;
  transactionId: string;
  commandId?: string;
  firstSequence: number;
  lastSequence: number;
  eventCount: number;
  eventTypes: string[];
  stateHashAfter: string;
}

export function createTransactionLog(events: readonly MatchEvent[]): TransactionLogEntry[] {
  const entries: TransactionLogEntry[] = [];
  let replayState = createEmptyMatchState();
  let current:
    | Omit<TransactionLogEntry, "eventTypes" | "stateHashAfter"> & {
        eventTypes: Set<string>;
      }
    | undefined;

  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    if (current && current.transactionId !== event.transactionId) {
      entries.push(finalizeTransactionLogEntry(current, hashValue(replayState)));
      current = undefined;
    }

    if (!current) {
      current = {
        matchId: event.matchId,
        transactionId: event.transactionId,
        commandId: event.causedBy?.commandId,
        firstSequence: event.sequence,
        lastSequence: event.sequence,
        eventCount: 0,
        eventTypes: new Set<string>()
      };
    }

    current.lastSequence = event.sequence;
    current.eventCount += 1;
    current.eventTypes.add(event.type);
    if (!current.commandId && event.causedBy?.commandId) {
      current.commandId = event.causedBy.commandId;
    }
    replayState = reduceEvent(replayState, event);
  }

  if (current) {
    entries.push(finalizeTransactionLogEntry(current, hashValue(replayState)));
  }

  return entries;
}

function finalizeTransactionLogEntry(
  entry: Omit<TransactionLogEntry, "eventTypes" | "stateHashAfter"> & { eventTypes: Set<string> },
  stateHashAfter: string
): TransactionLogEntry {
  return {
    ...entry,
    eventTypes: [...entry.eventTypes].sort(),
    stateHashAfter
  };
}

function countEventsByType(events: readonly MatchEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const event of events) {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
  }

  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function contentHashesFromLock(contentLock: ContentLock | undefined): string[] {
  if (!contentLock) {
    return [];
  }

  return [
    contentLock.gameDefinition,
    contentLock.cardCatalog,
    contentLock.behaviorLibrary,
    contentLock.assetBundle,
    contentLock.localizationBundle
  ]
    .filter((bundle): bundle is NonNullable<typeof bundle> => bundle !== undefined)
    .map((bundle) => bundle.contentHash)
    .sort();
}

function formatLabels(labels: Record<string, string>): string {
  return `{${Object.entries(labels)
    .map(([key, value]) => `${key}="${escapeLabelValue(value)}"`)
    .join(",")}}`;
}

function escapeLabelValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}
