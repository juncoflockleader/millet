import type { GameObjectState, Id, MatchEvent, MatchState, PlayerState, PromptState, Visibility } from "./types.ts";

export interface ViewerContext {
  playerId?: string;
  seatId?: string;
  teamId?: string;
  admin?: boolean;
}

function canView(visibility: Visibility, object: Pick<GameObjectState, "ownerId" | "controllerId"> | undefined, viewer: ViewerContext): boolean {
  if (viewer.admin) {
    return true;
  }

  switch (visibility.kind) {
    case "public":
      return true;
    case "owner":
      return Boolean(viewer.playerId && object?.ownerId === viewer.playerId);
    case "controller":
      return Boolean(viewer.playerId && object?.controllerId === viewer.playerId);
    case "player":
      return Boolean(viewer.playerId && visibility.playerIds.includes(viewer.playerId));
    case "seat":
      return Boolean(viewer.seatId && visibility.seatIds.includes(viewer.seatId));
    case "team":
      return Boolean(viewer.teamId && visibility.teamIds.includes(viewer.teamId));
    case "admin":
    case "hidden":
      return false;
  }
}

function redactedObjectId(object: GameObjectState): Id {
  const zone = object.zoneId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  return `hidden_${zone}_${object.createdAtSequence}`;
}

function redactObject(object: GameObjectState, id = redactedObjectId(object)): GameObjectState {
  return {
    id,
    objectType: "hidden",
    zoneId: object.zoneId,
    position: object.position,
    visibility: { kind: "hidden" },
    stats: {},
    counters: {},
    tags: [],
    keywords: [],
    attachments: [],
    modifiers: [],
    createdAtSequence: object.createdAtSequence,
    lastChangedAtSequence: object.lastChangedAtSequence
  };
}

export function projectState(state: MatchState, viewer: ViewerContext): MatchState {
  const projected = structuredClone(state);
  const redactedIds = new Map<Id, Id>();

  for (const [objectId, object] of Object.entries(state.objects)) {
    if (!canView(object.visibility, object, viewer)) {
      redactedIds.set(objectId, redactedObjectId(object));
    }
  }

  projected.objects = Object.fromEntries(
    Object.entries(state.objects).map(([objectId, object]) => {
      const redactedId = redactedIds.get(objectId);
      return redactedId
        ? [redactedId, redactObject(object, redactedId)]
        : [objectId, structuredClone(object)];
    })
  );

  for (const zone of Object.values(projected.zones)) {
    zone.objectIds = zone.objectIds.map((objectId) => redactedIds.get(objectId) ?? objectId);
  }

  for (const object of Object.values(projected.objects)) {
    object.attachments = object.attachments.map((objectId) => redactedIds.get(objectId) ?? objectId);
    object.modifiers = object.modifiers.map((objectId) => redactedIds.get(objectId) ?? objectId);
  }

  for (const player of Object.values(projected.players)) {
    projectPlayerRefs(player, redactedIds);
  }

  for (const trigger of projected.triggers) {
    if (trigger.sourceObjectId && redactedIds.has(trigger.sourceObjectId)) {
      trigger.sourceObjectId = redactedIds.get(trigger.sourceObjectId)!;
    }
  }

  projected.prompts = Object.fromEntries(
    Object.entries(projected.prompts).filter(([, prompt]) => projectPrompt(prompt, viewer) !== null)
  );

  return projected;
}

export function projectEvent(event: MatchEvent, _state: MatchState, viewer: ViewerContext): MatchEvent | null {
  if (!canView(event.visibility.default, undefined, viewer)) {
    return null;
  }

  if (event.type === "object_created") {
    const payload = event.payload as { object?: GameObjectState };
    if (payload.object && !canView(payload.object.visibility, payload.object, viewer)) {
      return {
        ...event,
        payload: {
          object: redactObject(payload.object)
        }
      };
    }
  }

  if (event.type === "prompt_opened") {
    const payload = event.payload as { prompt?: PromptState };
    if (payload.prompt && !projectPrompt(payload.prompt, viewer)) {
      return null;
    }
  }

  const projected = structuredClone(event);
  projected.payload = projectPayloadReferences(projected.payload, _state, viewer);
  return projected;
}

export function projectPrompt(prompt: PromptState, viewer: ViewerContext): PromptState | null {
  if (viewer.admin || (viewer.playerId && prompt.responderIds.includes(viewer.playerId))) {
    return structuredClone(prompt);
  }

  return null;
}

function projectPlayerRefs(player: PlayerState, redactedIds: Map<Id, Id>): void {
  for (const key of ["roleRef", "characterRef", "heroRef"] as const) {
    const ref = player[key];
    if (ref && redactedIds.has(ref)) {
      player[key] = redactedIds.get(ref);
    }
  }
}

function projectPayloadReferences(payload: unknown, state: MatchState, viewer: ViewerContext): unknown {
  if (Array.isArray(payload)) {
    return payload.map((value) => projectPayloadReferences(value, state, viewer));
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const source = payload as Record<string, unknown>;
  const hiddenObjectRef = hiddenReferencedObject(source, state, viewer);
  const next: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(source)) {
    if (key === "templateId" && hiddenObjectRef) {
      continue;
    }

    if (isObjectReferenceKey(key) && typeof value === "string") {
      next[key] = projectObjectReference(value, state, viewer);
      continue;
    }

    if (key === "objectIds" && Array.isArray(value)) {
      next[key] = value.map((objectId) =>
        typeof objectId === "string" ? projectObjectReference(objectId, state, viewer) : objectId
      );
      continue;
    }

    next[key] = projectPayloadReferences(value, state, viewer);
  }

  return next;
}

function hiddenReferencedObject(payload: Record<string, unknown>, state: MatchState, viewer: ViewerContext): GameObjectState | undefined {
  for (const key of ["objectId", "sourceObjectId", "targetObjectId", "roleRef", "characterRef", "heroRef"]) {
    const objectId = payload[key];
    if (typeof objectId === "string") {
      const object = state.objects[objectId];
      if (object && !canView(object.visibility, object, viewer)) {
        return object;
      }
    }
  }

  return undefined;
}

function isObjectReferenceKey(key: string): boolean {
  return key === "objectId" || key === "sourceObjectId" || key === "targetObjectId" || key === "roleRef" || key === "characterRef" || key === "heroRef";
}

function projectObjectReference(objectId: Id, state: MatchState, viewer: ViewerContext): Id {
  const object = state.objects[objectId];
  return object && !canView(object.visibility, object, viewer) ? redactedObjectId(object) : objectId;
}
