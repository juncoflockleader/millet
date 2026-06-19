import { cloneMatchState } from "./state.ts";
import type {
  CardMovedPayload,
  DamageDealtPayload,
  MatchEvent,
  MatchInitializedPayload,
  MatchState,
  ObjectCreatedPayload,
  ObjectCounterChangedPayload,
  ObjectDestroyedPayload,
  ObjectExhaustedPayload,
  OutcomeDeclaredPayload,
  PlayerSeatedPayload,
  PlayerStatusChangedPayload,
  PromptAnsweredPayload,
  PromptClosedPayload,
  PromptOpenedPayload,
  ResourceChangedPayload,
  TriggerFiredPayload,
  TriggerRegisteredPayload,
  TurnAdvancedPayload,
  ZoneCreatedPayload
} from "./types.ts";

function normalizeZonePositions(state: MatchState, zoneId: string): void {
  const zone = state.zones[zoneId];

  if (!zone) {
    throw new Error(`Cannot normalize missing zone ${zoneId}`);
  }

  zone.objectIds.forEach((objectId, position) => {
    const object = state.objects[objectId];

    if (!object) {
      throw new Error(`Zone ${zoneId} references missing object ${objectId}`);
    }

    object.zoneId = zoneId;
    object.position = position;
  });
}

function insertObjectId(state: MatchState, zoneId: string, objectId: string, position?: number): void {
  const zone = state.zones[zoneId];

  if (!zone) {
    throw new Error(`Cannot insert object ${objectId}; zone ${zoneId} does not exist`);
  }

  if (zone.objectIds.includes(objectId)) {
    throw new Error(`Zone ${zoneId} already contains object ${objectId}`);
  }

  const index = position ?? zone.objectIds.length;

  if (!Number.isInteger(index) || index < 0 || index > zone.objectIds.length) {
    throw new Error(`Invalid insert position ${String(position)} for zone ${zoneId}`);
  }

  if (zone.capacity !== undefined && zone.objectIds.length + 1 > zone.capacity) {
    throw new Error(`Zone ${zoneId} capacity ${zone.capacity} would be exceeded`);
  }

  zone.objectIds.splice(index, 0, objectId);
  normalizeZonePositions(state, zoneId);
}

function removeObjectId(state: MatchState, zoneId: string, objectId: string): void {
  const zone = state.zones[zoneId];

  if (!zone) {
    throw new Error(`Cannot remove object ${objectId}; zone ${zoneId} does not exist`);
  }

  const index = zone.objectIds.indexOf(objectId);

  if (index === -1) {
    throw new Error(`Zone ${zoneId} does not contain object ${objectId}`);
  }

  zone.objectIds.splice(index, 1);
  normalizeZonePositions(state, zoneId);
}

function reduceMatchInitialized(state: MatchState, event: MatchEvent<MatchInitializedPayload>): MatchState {
  if (state.lastSequence !== 0) {
    throw new Error("match_initialized must be the first event");
  }

  const next = cloneMatchState(state);
  next.matchId = event.payload.matchId;
  next.gameDefinitionId = event.payload.gameDefinitionId;
  next.gameDefinitionVersion = event.payload.gameDefinitionVersion;
  next.contentLock = event.payload.contentLock;
  next.seed = event.payload.seed;
  next.status = "setup";
  next.lastSequence = event.sequence;
  return next;
}

function reducePlayerSeated(state: MatchState, event: MatchEvent<PlayerSeatedPayload>): MatchState {
  const next = cloneMatchState(state);
  const { player, seat } = event.payload;

  if (next.players[player.id]) {
    throw new Error(`Player ${player.id} already exists`);
  }

  if (next.seats.some((existingSeat) => existingSeat.id === seat.id)) {
    throw new Error(`Seat ${seat.id} already exists`);
  }

  next.players[player.id] = structuredClone(player);
  next.seats.push(structuredClone(seat));
  next.seats.sort((left, right) => left.index - right.index);
  next.lastSequence = event.sequence;
  return next;
}

function reduceZoneCreated(state: MatchState, event: MatchEvent<ZoneCreatedPayload>): MatchState {
  const next = cloneMatchState(state);
  const zone = structuredClone(event.payload.zone);

  if (next.zones[zone.id]) {
    throw new Error(`Zone ${zone.id} already exists`);
  }

  zone.objectIds = [...zone.objectIds];
  next.zones[zone.id] = zone;
  normalizeZonePositions(next, zone.id);
  next.lastSequence = event.sequence;
  return next;
}

function reduceObjectCreated(state: MatchState, event: MatchEvent<ObjectCreatedPayload>): MatchState {
  const next = cloneMatchState(state);
  const object = structuredClone(event.payload.object);

  if (next.objects[object.id]) {
    throw new Error(`Object ${object.id} already exists`);
  }

  if (!next.zones[object.zoneId]) {
    throw new Error(`Object ${object.id} references missing zone ${object.zoneId}`);
  }

  next.objects[object.id] = object;
  insertObjectId(next, object.zoneId, object.id, object.position);
  next.counters.objectSequence = Math.max(next.counters.objectSequence, object.createdAtSequence);
  next.lastSequence = event.sequence;
  return next;
}

function reduceCardMoved(state: MatchState, event: MatchEvent<CardMovedPayload>): MatchState {
  const next = cloneMatchState(state);
  const { objectId, fromZoneId, toZoneId, toPosition } = event.payload;
  const object = next.objects[objectId];

  if (!object) {
    throw new Error(`Cannot move missing object ${objectId}`);
  }

  const actualFromZoneId = fromZoneId ?? object.zoneId;

  if (object.zoneId !== actualFromZoneId) {
    throw new Error(`Object ${objectId} is in ${object.zoneId}, not ${actualFromZoneId}`);
  }

  if (!next.zones[toZoneId]) {
    throw new Error(`Cannot move object ${objectId}; target zone ${toZoneId} does not exist`);
  }

  removeObjectId(next, actualFromZoneId, objectId);
  object.zoneId = toZoneId;
  object.lastChangedAtSequence = event.sequence;
  insertObjectId(next, toZoneId, objectId, toPosition);
  next.lastSequence = event.sequence;
  return next;
}

function reduceResourceChanged(state: MatchState, event: MatchEvent<ResourceChangedPayload>): MatchState {
  const next = cloneMatchState(state);
  const player = next.players[event.payload.playerId];

  if (!player) {
    throw new Error(`Cannot change resource for missing player ${event.payload.playerId}`);
  }

  player.resources[event.payload.resource] = {
    current: event.payload.current,
    max: event.payload.max
  };
  next.lastSequence = event.sequence;
  return next;
}

function reduceDamageDealt(state: MatchState, event: MatchEvent<DamageDealtPayload>): MatchState {
  const next = cloneMatchState(state);

  if (!next.players[event.payload.targetPlayerId]) {
    throw new Error(`Cannot deal damage to missing player ${event.payload.targetPlayerId}`);
  }

  if (event.payload.sourcePlayerId && !next.players[event.payload.sourcePlayerId]) {
    throw new Error(`Damage source player ${event.payload.sourcePlayerId} does not exist`);
  }

  if (event.payload.sourceObjectId && !next.objects[event.payload.sourceObjectId]) {
    throw new Error(`Damage source object ${event.payload.sourceObjectId} does not exist`);
  }

  if (!Number.isFinite(event.payload.amount) || event.payload.amount < 0) {
    throw new Error(`Damage amount must be non-negative, got ${event.payload.amount}`);
  }

  next.lastSequence = event.sequence;
  return next;
}

function reducePlayerStatusChanged(state: MatchState, event: MatchEvent<PlayerStatusChangedPayload>): MatchState {
  const next = cloneMatchState(state);
  const player = next.players[event.payload.playerId];

  if (!player) {
    throw new Error(`Cannot change status for missing player ${event.payload.playerId}`);
  }

  player.status = event.payload.status;
  next.lastSequence = event.sequence;
  return next;
}

function reduceOutcomeDeclared(state: MatchState, event: MatchEvent<OutcomeDeclaredPayload>): MatchState {
  const next = cloneMatchState(state);

  if (next.outcomes.some((outcome) => outcome.id === event.payload.outcome.id)) {
    throw new Error(`Outcome ${event.payload.outcome.id} already exists`);
  }

  next.outcomes.push(structuredClone(event.payload.outcome));
  if (event.payload.outcome.status === "completed") {
    next.status = "completed";
  }
  next.lastSequence = event.sequence;
  return next;
}

function reducePhaseEntered(state: MatchState, event: MatchEvent<{ phaseId: string; activePlayerId?: string }>): MatchState {
  const next = cloneMatchState(state);
  next.turn.phaseId = event.payload.phaseId;
  next.turn.activePlayerId = event.payload.activePlayerId;
  next.lastSequence = event.sequence;
  return next;
}

function reducePromptOpened(state: MatchState, event: MatchEvent<PromptOpenedPayload>): MatchState {
  const next = cloneMatchState(state);
  const prompt = structuredClone(event.payload.prompt);

  if (next.prompts[prompt.id]) {
    throw new Error(`Prompt ${prompt.id} already exists`);
  }

  prompt.openedAtSequence = event.sequence;
  next.prompts[prompt.id] = prompt;
  next.lastSequence = event.sequence;
  return next;
}

function reducePromptAnswered(state: MatchState, event: MatchEvent<PromptAnsweredPayload>): MatchState {
  const next = cloneMatchState(state);
  const prompt = next.prompts[event.payload.promptId];

  if (!prompt) {
    throw new Error(`Prompt ${event.payload.promptId} does not exist`);
  }

  if (prompt.status !== "open") {
    throw new Error(`Prompt ${prompt.id} is not open`);
  }

  if (event.payload.responderId) {
    prompt.responses = prompt.responses ?? {};
    prompt.responses[event.payload.responderId] = structuredClone(event.payload.answer);
    prompt.answeredResponderIds = prompt.answeredResponderIds ?? [];
    if (!prompt.answeredResponderIds.includes(event.payload.responderId)) {
      prompt.answeredResponderIds.push(event.payload.responderId);
    }
  }

  prompt.status = event.payload.status ?? "answered";
  prompt.answer = structuredClone(event.payload.answer);
  prompt.currentResponderId = event.payload.status === "open" ? event.payload.nextResponderId : undefined;
  prompt.passedResponderIds = event.payload.passedResponderIds ? [...event.payload.passedResponderIds] : undefined;
  next.lastSequence = event.sequence;
  return next;
}

function reducePromptClosed(state: MatchState, event: MatchEvent<PromptClosedPayload>): MatchState {
  const next = cloneMatchState(state);
  const prompt = next.prompts[event.payload.promptId];

  if (!prompt) {
    throw new Error(`Prompt ${event.payload.promptId} does not exist`);
  }

  if (prompt.status !== "open") {
    throw new Error(`Prompt ${prompt.id} is not open`);
  }

  prompt.status = event.payload.status;
  next.lastSequence = event.sequence;
  return next;
}

function reduceTriggerRegistered(state: MatchState, event: MatchEvent<TriggerRegisteredPayload>): MatchState {
  const next = cloneMatchState(state);
  const trigger = structuredClone(event.payload.trigger);

  if (next.triggers.some((existing) => existing.id === trigger.id)) {
    throw new Error(`Trigger ${trigger.id} already exists`);
  }

  next.triggers.push(trigger);
  next.triggers.sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.id.localeCompare(right.id);
  });
  next.lastSequence = event.sequence;
  return next;
}

function reduceTriggerFired(state: MatchState, event: MatchEvent<TriggerFiredPayload>): MatchState {
  const next = cloneMatchState(state);
  const trigger = next.triggers.find((candidate) => candidate.id === event.payload.triggerId);

  if (!trigger) {
    throw new Error(`Trigger ${event.payload.triggerId} does not exist`);
  }

  trigger.firedCount += 1;
  next.lastSequence = event.sequence;
  return next;
}

function reduceObjectDestroyed(state: MatchState, event: MatchEvent<ObjectDestroyedPayload>): MatchState {
  const next = cloneMatchState(state);
  const object = next.objects[event.payload.objectId];

  if (!object) {
    throw new Error(`Cannot destroy missing object ${event.payload.objectId}`);
  }

  if (object.zoneId !== event.payload.fromZoneId) {
    throw new Error(`Object ${object.id} is in ${object.zoneId}, not ${event.payload.fromZoneId}`);
  }

  if (event.payload.toZoneId) {
    if (!next.zones[event.payload.toZoneId]) {
      throw new Error(`Destroy target zone ${event.payload.toZoneId} does not exist`);
    }

    removeObjectId(next, event.payload.fromZoneId, object.id);
    object.zoneId = event.payload.toZoneId;
    object.lastChangedAtSequence = event.sequence;
    insertObjectId(next, event.payload.toZoneId, object.id);
  } else {
    removeObjectId(next, event.payload.fromZoneId, object.id);
    delete next.objects[object.id];
    next.triggers = next.triggers.filter((trigger) => trigger.sourceObjectId !== object.id);
  }

  next.lastSequence = event.sequence;
  return next;
}

function reduceObjectExhausted(state: MatchState, event: MatchEvent<ObjectExhaustedPayload>): MatchState {
  const next = cloneMatchState(state);
  const object = next.objects[event.payload.objectId];

  if (!object) {
    throw new Error(`Cannot set exhaustion for missing object ${event.payload.objectId}`);
  }

  object.exhausted = event.payload.exhausted;
  object.lastChangedAtSequence = event.sequence;
  next.lastSequence = event.sequence;
  return next;
}

function reduceObjectCounterChanged(state: MatchState, event: MatchEvent<ObjectCounterChangedPayload>): MatchState {
  const next = cloneMatchState(state);
  const object = next.objects[event.payload.objectId];

  if (!object) {
    throw new Error(`Cannot change counter for missing object ${event.payload.objectId}`);
  }

  object.counters[event.payload.counter] = event.payload.value;
  object.lastChangedAtSequence = event.sequence;
  next.lastSequence = event.sequence;
  return next;
}

function reduceTurnAdvanced(state: MatchState, event: MatchEvent<TurnAdvancedPayload>): MatchState {
  const next = cloneMatchState(state);

  if (!next.players[event.payload.activePlayerId]) {
    throw new Error(`Cannot advance turn to missing player ${event.payload.activePlayerId}`);
  }

  next.turn.activePlayerId = event.payload.activePlayerId;
  next.turn.turnNumber = event.payload.turnNumber;
  next.turn.roundNumber = event.payload.roundNumber;
  next.turn.phaseId = undefined;
  next.lastSequence = event.sequence;
  return next;
}

export function reduceEvent(state: MatchState, event: MatchEvent): MatchState {
  if (event.sequence !== state.lastSequence + 1) {
    throw new Error(`Expected event sequence ${state.lastSequence + 1}, got ${event.sequence}`);
  }

  switch (event.type) {
    case "match_initialized":
      return reduceMatchInitialized(state, event as MatchEvent<MatchInitializedPayload>);
    case "player_seated":
      return reducePlayerSeated(state, event as MatchEvent<PlayerSeatedPayload>);
    case "zone_created":
      return reduceZoneCreated(state, event as MatchEvent<ZoneCreatedPayload>);
    case "object_created":
      return reduceObjectCreated(state, event as MatchEvent<ObjectCreatedPayload>);
    case "card_moved":
      return reduceCardMoved(state, event as MatchEvent<CardMovedPayload>);
    case "resource_changed":
      return reduceResourceChanged(state, event as MatchEvent<ResourceChangedPayload>);
    case "damage_dealt":
      return reduceDamageDealt(state, event as MatchEvent<DamageDealtPayload>);
    case "player_status_changed":
      return reducePlayerStatusChanged(state, event as MatchEvent<PlayerStatusChangedPayload>);
    case "outcome_declared":
      return reduceOutcomeDeclared(state, event as MatchEvent<OutcomeDeclaredPayload>);
    case "phase_entered":
      return reducePhaseEntered(state, event as MatchEvent<{ phaseId: string; activePlayerId?: string }>);
    case "prompt_opened":
      return reducePromptOpened(state, event as MatchEvent<PromptOpenedPayload>);
    case "prompt_answered":
      return reducePromptAnswered(state, event as MatchEvent<PromptAnsweredPayload>);
    case "prompt_closed":
      return reducePromptClosed(state, event as MatchEvent<PromptClosedPayload>);
    case "trigger_registered":
      return reduceTriggerRegistered(state, event as MatchEvent<TriggerRegisteredPayload>);
    case "trigger_fired":
      return reduceTriggerFired(state, event as MatchEvent<TriggerFiredPayload>);
    case "object_destroyed":
      return reduceObjectDestroyed(state, event as MatchEvent<ObjectDestroyedPayload>);
    case "object_exhausted":
      return reduceObjectExhausted(state, event as MatchEvent<ObjectExhaustedPayload>);
    case "object_counter_changed":
      return reduceObjectCounterChanged(state, event as MatchEvent<ObjectCounterChangedPayload>);
    case "turn_advanced":
      return reduceTurnAdvanced(state, event as MatchEvent<TurnAdvancedPayload>);
    default:
      throw new Error(`Unknown event type ${event.type}`);
  }
}
