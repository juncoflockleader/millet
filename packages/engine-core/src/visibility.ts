import type { GameObjectState, MatchEvent, MatchState, PromptState, Visibility } from "./types.ts";

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

function redactObject(object: GameObjectState): GameObjectState {
  return {
    id: object.id,
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

  for (const [objectId, object] of Object.entries(projected.objects)) {
    if (!canView(object.visibility, object, viewer)) {
      projected.objects[objectId] = redactObject(object);
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

  return structuredClone(event);
}

export function projectPrompt(prompt: PromptState, viewer: ViewerContext): PromptState | null {
  if (viewer.admin || (viewer.playerId && prompt.responderIds.includes(viewer.playerId))) {
    return structuredClone(prompt);
  }

  return null;
}
