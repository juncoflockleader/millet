import { assertStateInvariants } from "./invariants.ts";
import { selectorCanReachByEffectiveRange } from "./range.ts";
import { reduceEvent } from "./reducer.ts";
import type {
  CardMovedPayload,
  DamageDealtPayload,
  Id,
  MatchCommand,
  MatchEvent,
  MatchState,
  ObjectCounterChangedPayload,
  ObjectDestroyedPayload,
  ObjectExhaustedPayload,
  OutcomeDeclaredPayload,
  OutcomeState,
  PlayerStatus,
  PlayerStatusChangedPayload,
  PromptAnsweredPayload,
  PromptOpenedPayload,
  PromptState,
  ResourceChangedPayload,
  TriggerFiredPayload,
  TriggerRegisteredPayload
} from "./types.ts";

export class CommandRejectedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CommandRejectedError";
    this.code = code;
  }
}

export interface BehaviorLibrary {
  behaviors: Record<Id, BehaviorDefinition>;
}

export interface BehaviorDefinition {
  id: Id;
  version: string;
  kind: "card" | "ability" | "trigger" | "rules_module";
  trigger?: TriggerDefinition;
  costs?: CostDefinition[];
  selectors?: SelectorDefinition[];
  conditions?: ConditionDefinition[];
  effects: EffectDefinition[];
  text?: {
    template: string;
    params?: Record<string, unknown>;
  };
  ux?: Record<string, unknown>;
}

export interface TriggerDefinition {
  eventType: string;
  timing: "after";
  source?: "self" | "any";
  priority?: number;
  once?: boolean;
}

export type PlayerRef =
  | "controller"
  | "owner"
  | "command_player"
  | { id: Id }
  | { selector: Id };

export type ObjectRef = "self" | { id: Id } | { selector: Id };
export type ZoneRef = Id | { id: Id } | { owner: PlayerRef; zoneType: string };

export interface JudgmentMatchDefinition {
  suit?: string;
  tags?: string[];
  anyTags?: string[];
  rankMin?: number;
  rankMax?: number;
}

export interface DelayedJudgmentMissDefinition {
  moveToNextAliveJudgment?: boolean;
}

export type CostDefinition =
  | {
      type: "spend_resource";
      player: PlayerRef;
      resource: string;
      amount: number;
    };

export interface SelectorDefinition {
  id: Id;
  from: "players" | "objects";
  count: {
    min: number;
    max: number;
  };
  match?: {
    status?: PlayerStatus;
    notSelf?: boolean;
    objectTypes?: string[];
    tags?: string[];
    owner?: PlayerRef;
    zoneOwner?: PlayerRef;
    zoneType?: string;
    range?: {
      from: "controller" | PlayerRef;
      mode: "attack";
      baseRange?: number;
    };
  };
}

export type ConditionDefinition =
  | {
      type: "player_status";
      player: PlayerRef;
      status: PlayerStatus;
    }
  | {
      type: "resource_at_least";
      player: PlayerRef;
      resource: string;
      amount: number;
    }
  | {
      type: "object_ready";
      object: ObjectRef;
    };

export type EffectDefinition =
  | {
      type: "deal_damage";
      to: PlayerRef;
      amount: number;
      damageType?: string;
    }
  | {
      type: "deal_damage_all_players";
      amount: number;
      includeDead?: boolean;
      damageType?: string;
    }
  | {
      type: "heal";
      player: PlayerRef;
      amount: number;
      resource?: string;
    }
  | {
      type: "prevent_next_damage";
      player: PlayerRef;
      amount: number;
      reason?: string;
    }
  | {
      type: "move_card";
      object: ObjectRef;
      toZoneId: ZoneRef;
      toPosition?: number;
    }
  | {
      type: "equip_object";
      object: ObjectRef;
      player: PlayerRef;
      slotTag: string;
      discardZoneId?: ZoneRef;
    }
  | {
      type: "resolve_delayed_effect";
      object: ObjectRef;
      behaviorId: Id;
      target: PlayerRef;
      targetSelectorId?: Id;
      discardZoneId: ZoneRef;
    }
  | {
      type: "resolve_delayed_effects_in_zone";
      player: PlayerRef;
      zoneType: string;
      behaviorId: Id;
      target?: PlayerRef;
      targetSelectorId?: Id;
      objectTag?: string;
      discardZoneId: ZoneRef;
    }
  | {
      type: "resolve_delayed_judgment";
      object: ObjectRef;
      deckZoneId: ZoneRef;
      discardZoneId: ZoneRef;
      hit: JudgmentMatchDefinition;
      onHitBehaviorId: Id;
      target: PlayerRef;
      targetSelectorId?: Id;
      onMiss?: DelayedJudgmentMissDefinition;
    }
  | {
      type: "resolve_delayed_judgments_in_zone";
      player: PlayerRef;
      zoneType: string;
      objectTag?: string;
      deckZoneId: ZoneRef;
      discardZoneId: ZoneRef;
      hit: JudgmentMatchDefinition;
      onHitBehaviorId: Id;
      target?: PlayerRef;
      targetSelectorId?: Id;
      onMiss?: DelayedJudgmentMissDefinition;
    }
  | {
      type: "draw_cards";
      fromZoneId: ZoneRef;
      toZoneId: ZoneRef;
      count: number;
      emptyDeck?: {
        mode: "damage_player";
        player: PlayerRef;
        counter: string;
        startAt: number;
        incrementBy: number;
      };
    }
  | {
      type: "set_resource";
      player: PlayerRef;
      resource: string;
      current: number;
      max?: number;
      reason?: string;
    }
  | {
      type: "adjust_resource";
      player: PlayerRef;
      resource: string;
      delta: number;
      min?: number;
      max?: number;
      capAtResourceMax?: boolean;
      reason?: string;
    }
  | {
      type: "toggle_resource";
      player: PlayerRef;
      resource: string;
      offValue?: number;
      onValue?: number;
      reason?: string;
    }
  | {
      type: "execute_behavior_if_resource";
      player: PlayerRef;
      resource: string;
      equals?: number;
      atLeast?: number;
      behaviorId: Id;
      elseBehaviorId?: Id;
    }
  | {
      type: "discard_to_hand_limit";
      player: PlayerRef;
      handZoneId: ZoneRef;
      discardZoneId: ZoneRef;
      resource?: string;
      minimum?: number;
    }
  | {
      type: "set_player_status";
      player: PlayerRef;
      status: PlayerStatus;
      reason?: string;
    }
  | {
      type: "destroy_object";
      object: ObjectRef;
      toZoneId?: ZoneRef;
      reason?: string;
    }
  | {
      type: "set_object_exhausted";
      object: ObjectRef;
      exhausted: boolean;
      reason?: string;
    }
  | {
      type: "adjust_object_counter";
      object: ObjectRef;
      counter: string;
      delta: number;
      min?: number;
      max?: number;
      reason?: string;
    }
  | {
      type: "destroy_object_if_counter_at_most";
      object: ObjectRef;
      counter: string;
      value: number;
      toZoneId?: ZoneRef;
      reason?: string;
    }
  | {
      type: "register_trigger";
      source: ObjectRef;
      behaviorId: Id;
      eventType: string;
      priority?: number;
      once?: boolean;
    }
  | {
      type: "open_prompt";
      promptId: Id;
      responderIds: PlayerRef[];
      responderSelectorIds?: Id[];
      promptType: string;
      responseMode?: "single" | "all_in_order" | "any_until_success" | "priority_loop";
      payload?: unknown;
      defaultSelections?: Record<Id, PlayerRef[]>;
    };

export interface ExecuteBehaviorPayload {
  behaviorId: Id;
  sourceObjectId?: Id;
  selections?: Record<Id, Id[]>;
}

export interface AnswerPromptPayload {
  promptId: Id;
  answer: unknown;
}

interface PromptAutomationPayload {
  onPassBehavior?: Id;
  allowedResponseBehaviors?: Id[];
  defaultTargetFromResponder?: boolean;
  defaultSelections?: Record<Id, Id[]>;
}

interface PromptBehaviorAnswer {
  action?: string;
  behaviorId: Id;
  sourceObjectId?: Id;
  selections?: Record<Id, Id[]>;
}

export interface ResolutionContext {
  behaviorLibrary: BehaviorLibrary;
  outcomeMode?: "none" | "last_alive";
  deathMode?: "direct" | "dying";
  dyingPrompt?: {
    onPassBehavior: Id;
    targetSelectorId?: Id;
  };
}

export interface ResolutionResult {
  state: MatchState;
  events: MatchEvent[];
}

interface ResolutionSession {
  command: MatchCommand<ExecuteBehaviorPayload>;
  context: ResolutionContext;
  sourceObjectId?: Id;
  controllerId?: Id;
  ownerId?: Id;
  selections: Record<Id, Id[]>;
  state: MatchState;
  events: MatchEvent[];
  transactionId: Id;
  triggerDepth: number;
}

export interface SelectorCandidate {
  id: Id;
  legal: boolean;
  reasons: string[];
}

function eventVisibility() {
  return {
    default: {
      kind: "public" as const
    }
  };
}

function emit<TPayload>(session: ResolutionSession, type: string, payload: TPayload): void {
  const event: MatchEvent<TPayload> = {
    id: `evt_${session.state.lastSequence + 1}`,
    matchId: session.state.matchId,
    sequence: session.state.lastSequence + 1,
    transactionId: session.transactionId,
    type,
    payload,
    visibility: eventVisibility(),
    causedBy: {
      commandId: session.command.id
    }
  };

  session.state = reduceEvent(session.state, event);
  assertStateInvariants(session.state);
  session.events.push(event);

  if (session.triggerDepth < 8) {
    runAfterTriggers(session, event);
  }
}

function resolvePlayerRef(session: ResolutionSession, ref: PlayerRef): Id {
  if (ref === "command_player") {
    if (!session.command.playerId) {
      throw new CommandRejectedError("missing_command_player", "Command does not have a player id");
    }

    return session.command.playerId;
  }

  if (ref === "controller") {
    if (!session.controllerId) {
      throw new CommandRejectedError("missing_controller", "Behavior source does not have a controller");
    }

    return session.controllerId;
  }

  if (ref === "owner") {
    if (!session.ownerId) {
      throw new CommandRejectedError("missing_owner", "Behavior source does not have an owner");
    }

    return session.ownerId;
  }

  if ("id" in ref) {
    return ref.id;
  }

  const selectedIds = session.selections[ref.selector] ?? [];

  if (selectedIds.length !== 1) {
    throw new CommandRejectedError("invalid_selection", `Selector ${ref.selector} must resolve to exactly one player`);
  }

  return selectedIds[0]!;
}

function resolveObjectRef(session: ResolutionSession, ref: ObjectRef): Id {
  if (ref === "self") {
    if (!session.sourceObjectId) {
      throw new CommandRejectedError("missing_source_object", "Behavior does not have a source object");
    }

    return session.sourceObjectId;
  }

  if ("id" in ref) {
    return ref.id;
  }

  const selectedIds = session.selections[ref.selector] ?? [];

  if (selectedIds.length !== 1) {
    throw new CommandRejectedError("invalid_selection", `Selector ${ref.selector} must resolve to exactly one object`);
  }

  return selectedIds[0]!;
}

function resolveZoneRef(session: ResolutionSession, ref: ZoneRef): Id {
  if (typeof ref === "string") {
    return ref;
  }

  if ("id" in ref) {
    return ref.id;
  }

  const ownerId = resolvePlayerRef(session, ref.owner);
  const matches = Object.values(session.state.zones)
    .filter((zone) => zone.ownerId === ownerId && zone.zoneType === ref.zoneType)
    .map((zone) => zone.id)
    .sort();

  if (matches.length !== 1) {
    throw new CommandRejectedError(
      "ambiguous_zone_ref",
      `Expected exactly one ${ref.zoneType} zone for player ${ownerId}, got ${matches.length}`
    );
  }

  return matches[0]!;
}

function resolveTemplateId(session: ResolutionSession, id: Id): Id {
  return id.replace(/\{(player|command_player|source|next_sequence)\}/g, (_token, placeholder: string) => {
    if (placeholder === "source") {
      if (!session.sourceObjectId) {
        throw new CommandRejectedError("missing_source_object", "Template id requires a source object");
      }

      return session.sourceObjectId;
    }

    if (placeholder === "next_sequence") {
      return String(session.state.lastSequence + 1);
    }

    if (!session.command.playerId) {
      throw new CommandRejectedError("missing_command_player", "Template id requires a command player");
    }

    return session.command.playerId;
  });
}

function resolveSelectorRangePlayerRef(
  state: MatchState,
  ref: "controller" | PlayerRef,
  context: {
    controllerId?: Id;
  }
): Id | undefined {
  if (ref === "controller" || ref === "command_player") {
    return context.controllerId;
  }

  if (ref === "owner") {
    return undefined;
  }

  if ("id" in ref) {
    return state.players[ref.id] ? ref.id : undefined;
  }

  return undefined;
}

function isPassAnswer(answer: unknown): boolean {
  return answer === "pass" || (typeof answer === "object" && answer !== null && (answer as { action?: unknown }).action === "pass");
}

function promptBehaviorAnswer(answer: unknown): PromptBehaviorAnswer | undefined {
  if (typeof answer !== "object" || answer === null) {
    return undefined;
  }

  const candidate = answer as PromptBehaviorAnswer;
  if (typeof candidate.behaviorId !== "string" || candidate.behaviorId.length === 0) {
    return undefined;
  }

  return candidate;
}

function nextResponder(prompt: PromptState, responderId: Id, answeredResponderIds: Id[] = []): Id | undefined {
  if (prompt.responderIds.length === 0) {
    return undefined;
  }

  const startIndex = prompt.responderIds.indexOf(responderId);
  const offsetStart = startIndex === -1 ? 0 : startIndex + 1;

  for (let offset = 0; offset < prompt.responderIds.length; offset += 1) {
    const candidate = prompt.responderIds[(offsetStart + offset) % prompt.responderIds.length]!;
    if (!answeredResponderIds.includes(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function resolvePromptProgress(
  prompt: PromptState,
  responderId: Id,
  answer: unknown
): Pick<PromptAnsweredPayload, "status" | "nextResponderId" | "passedResponderIds"> {
  const mode = prompt.responseMode ?? "single";
  const answeredResponderIds = [...(prompt.answeredResponderIds ?? [])];

  if (!answeredResponderIds.includes(responderId)) {
    answeredResponderIds.push(responderId);
  }

  if (mode === "single") {
    return { status: "answered" };
  }

  if (mode === "all_in_order") {
    const nextResponderId = nextResponder(prompt, responderId, answeredResponderIds);
    return nextResponderId ? { status: "open", nextResponderId } : { status: "answered" };
  }

  if (mode === "any_until_success") {
    if (!isPassAnswer(answer)) {
      return { status: "answered" };
    }

    const nextResponderId = nextResponder(prompt, responderId, answeredResponderIds);
    return nextResponderId ? { status: "open", nextResponderId } : { status: "answered" };
  }

  const passedResponderIds = isPassAnswer(answer) ? [...(prompt.passedResponderIds ?? []), responderId] : [];
  const uniquePassedResponderIds = [...new Set(passedResponderIds)];

  if (uniquePassedResponderIds.length >= prompt.responderIds.length) {
    return { status: "answered", passedResponderIds: uniquePassedResponderIds };
  }

  return {
    status: "open",
    nextResponderId: nextResponder(prompt, responderId) ?? prompt.responderIds[0],
    passedResponderIds: uniquePassedResponderIds
  };
}

export function getSelectorCandidates(
  state: MatchState,
  behavior: BehaviorDefinition,
  selectorId: Id,
  context: {
    controllerId?: Id;
  } = {}
): SelectorCandidate[] {
  const selector = behavior.selectors?.find((candidate) => candidate.id === selectorId);

  if (!selector) {
    throw new CommandRejectedError("missing_selector", `Selector ${selectorId} does not exist`);
  }

  if (selector.from === "players") {
    return Object.values(state.players).map((player) => {
      const reasons: string[] = [];

      if (selector.match?.status && player.status !== selector.match.status) {
        reasons.push(`status_not_${selector.match.status}`);
      }

      if (selector.match?.notSelf && player.id === context.controllerId) {
        reasons.push("self_not_allowed");
      }

      if (selector.match?.range) {
        const fromPlayerId = resolveSelectorRangePlayerRef(state, selector.match.range.from, context);

        if (!fromPlayerId || !selectorCanReachByEffectiveRange(state, fromPlayerId, player.id, selector.match.range.baseRange ?? 1)) {
          reasons.push("out_of_range");
        }
      }

      return {
        id: player.id,
        legal: reasons.length === 0,
        reasons
      };
    });
  }

  return Object.values(state.objects).map((object) => {
    const reasons: string[] = [];

    if (selector.match?.objectTypes && !selector.match.objectTypes.includes(object.objectType)) {
      reasons.push("object_type_not_allowed");
    }

    if (selector.match?.tags && !selector.match.tags.every((tag) => object.tags.includes(tag))) {
      reasons.push("missing_required_tag");
    }

    if (selector.match?.owner) {
      const ownerId = resolveSelectorRangePlayerRef(state, selector.match.owner, context);
      if (!ownerId || object.ownerId !== ownerId) {
        reasons.push("owner_not_allowed");
      }
    }

    if (selector.match?.zoneType) {
      const zone = state.zones[object.zoneId];
      if (zone?.zoneType !== selector.match.zoneType) {
        reasons.push(`zone_not_${selector.match.zoneType}`);
      }
    }

    if (selector.match?.zoneOwner) {
      const zoneOwnerId = resolveSelectorRangePlayerRef(state, selector.match.zoneOwner, context);
      const zone = state.zones[object.zoneId];
      if (!zoneOwnerId || zone?.ownerId !== zoneOwnerId) {
        reasons.push("zone_owner_not_allowed");
      }
    }

    return {
      id: object.id,
      legal: reasons.length === 0,
      reasons
    };
  });
}

function validateSelectors(state: MatchState, behavior: BehaviorDefinition, session: ResolutionSession): void {
  for (const selector of behavior.selectors ?? []) {
    const selectedIds = session.selections[selector.id] ?? [];

    if (selectedIds.length < selector.count.min || selectedIds.length > selector.count.max) {
      throw new CommandRejectedError(
        "invalid_selection_count",
        `Selector ${selector.id} expected ${selector.count.min}-${selector.count.max} selections, got ${selectedIds.length}`
      );
    }

    const legalIds = new Set(
      getSelectorCandidates(state, behavior, selector.id, { controllerId: session.controllerId })
        .filter((candidate) => candidate.legal)
        .map((candidate) => candidate.id)
    );

    for (const selectedId of selectedIds) {
      if (!legalIds.has(selectedId)) {
        throw new CommandRejectedError("illegal_selection", `Selection ${selectedId} is not legal for selector ${selector.id}`);
      }
    }
  }
}

function validateCondition(session: ResolutionSession, condition: ConditionDefinition): void {
  if (condition.type === "player_status") {
    const playerId = resolvePlayerRef(session, condition.player);
    const player = session.state.players[playerId];

    if (!player || player.status !== condition.status) {
      throw new CommandRejectedError("condition_failed", `Player ${playerId} does not have status ${condition.status}`);
    }
  } else if (condition.type === "resource_at_least") {
    const playerId = resolvePlayerRef(session, condition.player);
    const player = session.state.players[playerId];
    const resource = player?.resources[condition.resource];

    if (!resource || resource.current < condition.amount) {
      throw new CommandRejectedError("condition_failed", `Player ${playerId} does not have ${condition.amount} ${condition.resource}`);
    }
  } else if (condition.type === "object_ready") {
    const objectId = resolveObjectRef(session, condition.object);
    const object = session.state.objects[objectId];

    if (!object || object.exhausted) {
      throw new CommandRejectedError("condition_failed", `Object ${objectId} is exhausted or missing`);
    }
  }
}

function payCost(session: ResolutionSession, cost: CostDefinition): void {
  if (cost.type === "spend_resource") {
    const playerId = resolvePlayerRef(session, cost.player);
    const player = session.state.players[playerId];
    const resource = player?.resources[cost.resource];

    if (!player || !resource) {
      throw new CommandRejectedError("missing_resource", `Player ${playerId} does not have resource ${cost.resource}`);
    }

    if (resource.current < cost.amount) {
      throw new CommandRejectedError("insufficient_resource", `Player ${playerId} cannot spend ${cost.amount} ${cost.resource}`);
    }

    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: cost.resource,
      current: resource.current - cost.amount,
      max: resource.max,
      reason: "cost"
    });
  }
}

function checkDeathsAndOutcomes(session: ResolutionSession): void {
  for (const player of Object.values(session.state.players)) {
    const health = player.resources.health;

    if (player.status === "alive" && health && health.current <= 0) {
      if (session.context.deathMode === "dying") {
        const responderIds = Object.values(session.state.players)
          .filter((candidate) => candidate.status === "alive" && candidate.id !== player.id)
          .map((candidate) => candidate.id);
        emit<PlayerStatusChangedPayload>(session, "player_status_changed", {
          playerId: player.id,
          status: "dying",
          reason: "health_zero"
        });
        emit<PromptOpenedPayload>(session, "prompt_opened", {
          prompt: {
            id: `prompt_rescue_${player.id}_${session.state.lastSequence + 1}`,
            status: "open",
            responderIds,
            currentResponderId: responderIds[0],
            answeredResponderIds: [],
            passedResponderIds: [],
            promptType: "rescue",
            responseMode: "any_until_success",
            payload: {
              dyingPlayerId: player.id,
              ...(session.context.dyingPrompt
                ? {
                    onPassBehavior: session.context.dyingPrompt.onPassBehavior,
                    defaultSelections: {
                      [session.context.dyingPrompt.targetSelectorId ?? "target"]: [player.id]
                    }
                  }
                : {})
            },
            responses: {},
            openedAtSequence: session.state.lastSequence + 1
          }
        });
        continue;
      }

      emit<PlayerStatusChangedPayload>(session, "player_status_changed", {
        playerId: player.id,
        status: "dead",
        reason: "health_zero"
      });
    }
  }

  if (session.context.outcomeMode !== "last_alive") {
    return;
  }

  if (session.state.status === "completed" || session.state.outcomes.some((outcome) => outcome.status === "completed")) {
    return;
  }

  const players = Object.values(session.state.players);
  const alivePlayers = players.filter((player) => player.status === "alive");

  if (players.length > 1 && alivePlayers.length === 0) {
    const outcome: OutcomeState = {
      id: `outcome_${session.state.outcomes.length + 1}`,
      status: "completed",
      results: players.map((player) => ({
        playerId: player.id,
        status: "draw",
        reason: "simultaneous_elimination"
      }))
    };

    emit<OutcomeDeclaredPayload>(session, "outcome_declared", { outcome });
    return;
  }

  if (players.length > 1 && alivePlayers.length === 1) {
    const winner = alivePlayers[0]!;
    const outcome: OutcomeState = {
      id: `outcome_${session.state.outcomes.length + 1}`,
      status: "completed",
      results: players.map((player) => ({
        playerId: player.id,
        status: player.id === winner.id ? "won" : "lost",
        reason: player.id === winner.id ? "last_alive" : "dead"
      }))
    };

    emit<OutcomeDeclaredPayload>(session, "outcome_declared", { outcome });
  }
}

function runBehaviorEffects(session: ResolutionSession, behavior: BehaviorDefinition): void {
  const queue = [...behavior.effects];
  while (queue.length > 0) {
    runEffect(session, queue.shift()!);
  }
}

function executeBehaviorInSession(
  session: ResolutionSession,
  behaviorId: Id,
  options: {
    sourceObjectId?: Id;
    controllerId?: Id;
    selections?: Record<Id, Id[]>;
  } = {}
): void {
  const behavior = session.context.behaviorLibrary.behaviors[behaviorId];

  if (!behavior) {
    throw new CommandRejectedError("missing_behavior", `Behavior ${behaviorId} does not exist`);
  }

  const sourceObject = options.sourceObjectId ? session.state.objects[options.sourceObjectId] : undefined;
  if (options.sourceObjectId && !sourceObject) {
    throw new CommandRejectedError("missing_object", `Behavior source object ${options.sourceObjectId} does not exist`);
  }

  const previousSourceObjectId = session.sourceObjectId;
  const previousControllerId = session.controllerId;
  const previousOwnerId = session.ownerId;
  const previousSelections = session.selections;

  session.sourceObjectId = options.sourceObjectId;
  session.controllerId = sourceObject?.controllerId ?? options.controllerId ?? session.command.playerId;
  session.ownerId = sourceObject?.ownerId;
  session.selections = structuredClone(options.selections ?? {});

  validateSelectors(session.state, behavior, session);
  for (const condition of behavior.conditions ?? []) {
    validateCondition(session, condition);
  }
  for (const cost of behavior.costs ?? []) {
    payCost(session, cost);
  }
  runBehaviorEffects(session, behavior);

  session.sourceObjectId = previousSourceObjectId;
  session.controllerId = previousControllerId;
  session.ownerId = previousOwnerId;
  session.selections = previousSelections;
}

function eventSourceMatches(trigger: TriggerDefinition | undefined, sourceObjectId: Id | undefined, event: MatchEvent): boolean {
  if (!trigger || trigger.source !== "self") {
    return true;
  }

  if (!sourceObjectId) {
    return false;
  }

  const payload = event.payload as Record<string, unknown>;
  return payload.objectId === sourceObjectId || payload.sourceObjectId === sourceObjectId;
}

function runAfterTriggers(session: ResolutionSession, event: MatchEvent): void {
  if (event.type === "trigger_fired" || event.type === "trigger_registered") {
    return;
  }

  const triggers = session.state.triggers
    .filter((trigger) => trigger.eventType === event.type && trigger.timing === "after")
    .filter((trigger) => !trigger.once || trigger.firedCount === 0)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.id.localeCompare(right.id);
    });

  for (const trigger of triggers) {
    const behavior = session.context.behaviorLibrary.behaviors[trigger.behaviorId];

    if (!behavior || !eventSourceMatches(behavior.trigger, trigger.sourceObjectId, event)) {
      continue;
    }

    emit<TriggerFiredPayload>(session, "trigger_fired", {
      triggerId: trigger.id
    });

    const sourceObject = trigger.sourceObjectId ? session.state.objects[trigger.sourceObjectId] : undefined;
    const previousSourceObjectId = session.sourceObjectId;
    const previousControllerId = session.controllerId;
    const previousOwnerId = session.ownerId;
    session.sourceObjectId = trigger.sourceObjectId;
    session.controllerId = trigger.controllerId ?? sourceObject?.controllerId;
    session.ownerId = sourceObject?.ownerId;
    session.triggerDepth += 1;
    runBehaviorEffects(session, behavior);
    session.triggerDepth -= 1;
    session.sourceObjectId = previousSourceObjectId;
    session.controllerId = previousControllerId;
    session.ownerId = previousOwnerId;
  }
}

function damageAfterEquipmentReduction(state: MatchState, targetPlayerId: Id, amount: number): number {
  const reduction = Math.max(0, equipmentStatTotal(state, targetPlayerId, "damageReduction"));
  return Math.max(0, amount - reduction);
}

function applyDamagePrevention(session: ResolutionSession, targetPlayerId: Id, amount: number): number {
  const target = session.state.players[targetPlayerId];
  const preventionResource = target?.resources.prevent_next_damage;
  const prevention = Math.max(0, preventionResource?.current ?? 0);

  if (prevention === 0 || amount === 0) {
    return amount;
  }

  const prevented = Math.min(amount, prevention);
  emit<ResourceChangedPayload>(session, "resource_changed", {
    playerId: targetPlayerId,
    resource: "prevent_next_damage",
    current: prevention - prevented,
    max: preventionResource?.max,
    reason: "damage_prevented"
  });

  return amount - prevented;
}

function equipmentStatTotal(state: MatchState, playerId: Id, stat: string): number {
  let total = 0;

  for (const zone of Object.values(state.zones)) {
    if (zone.ownerId !== playerId || zone.zoneType !== "equipment") {
      continue;
    }

    for (const objectId of zone.objectIds) {
      total += state.objects[objectId]?.stats[stat] ?? 0;
    }
  }

  return total;
}

function judgmentCardMatches(card: { tags: string[]; stats: Record<string, number> }, match: JudgmentMatchDefinition): boolean {
  if (match.suit) {
    const suitTag = match.suit.startsWith("suit_") ? match.suit : `suit_${match.suit}`;
    if (!card.tags.includes(suitTag)) {
      return false;
    }
  }

  if (match.tags && !match.tags.every((tag) => card.tags.includes(tag))) {
    return false;
  }

  if (match.anyTags && match.anyTags.length > 0 && !match.anyTags.some((tag) => card.tags.includes(tag))) {
    return false;
  }

  if (match.rankMin !== undefined || match.rankMax !== undefined) {
    const rank = card.stats.rank;
    if (typeof rank !== "number") {
      return false;
    }

    if (match.rankMin !== undefined && rank < match.rankMin) {
      return false;
    }

    if (match.rankMax !== undefined && rank > match.rankMax) {
      return false;
    }
  }

  return true;
}

function nextAliveOwnedZoneId(state: MatchState, currentPlayerId: Id, zoneType: string): Id | undefined {
  const currentPlayer = state.players[currentPlayerId];
  const orderedSeats = [...state.seats].sort((left, right) => left.index - right.index);
  const startIndex = currentPlayer ? orderedSeats.findIndex((seat) => seat.id === currentPlayer.seatId) : -1;

  if (startIndex === -1) {
    return undefined;
  }

  for (let offset = 1; offset < orderedSeats.length; offset += 1) {
    const seat = orderedSeats[(startIndex + offset) % orderedSeats.length]!;
    const player = seat.playerId ? state.players[seat.playerId] : undefined;

    if (player?.status !== "alive") {
      continue;
    }

    const matchingZoneIds = Object.values(state.zones)
      .filter((zone) => zone.ownerId === player.id && zone.zoneType === zoneType)
      .map((zone) => zone.id)
      .sort();

    if (matchingZoneIds.length > 1) {
      throw new CommandRejectedError("ambiguous_zone_ref", `Expected at most one ${zoneType} zone for player ${player.id}, got ${matchingZoneIds.length}`);
    }

    if (matchingZoneIds[0]) {
      return matchingZoneIds[0];
    }
  }

  return undefined;
}

function resolveDelayedJudgmentObject(
  session: ResolutionSession,
  resolution: {
    objectId: Id;
    deckZoneId: Id;
    discardZoneId: Id;
    hit: JudgmentMatchDefinition;
    onHitBehaviorId: Id;
    targetPlayerId: Id;
    targetSelectorId?: Id;
    onMiss?: DelayedJudgmentMissDefinition;
  }
): void {
  const object = session.state.objects[resolution.objectId];
  const deckZone = session.state.zones[resolution.deckZoneId];

  if (!object) {
    throw new CommandRejectedError("missing_object", `Delayed judgment object ${resolution.objectId} does not exist`);
  }

  if (!deckZone) {
    throw new CommandRejectedError("missing_zone", `Judgment deck zone ${resolution.deckZoneId} does not exist`);
  }

  if (!session.state.zones[resolution.discardZoneId]) {
    throw new CommandRejectedError("missing_zone", `Judgment discard zone ${resolution.discardZoneId} does not exist`);
  }

  const judgmentCardId = deckZone.objectIds[0];
  if (!judgmentCardId) {
    throw new CommandRejectedError("empty_zone", `Judgment deck zone ${resolution.deckZoneId} is empty`);
  }

  emit<CardMovedPayload>(session, "card_moved", {
    objectId: judgmentCardId,
    fromZoneId: resolution.deckZoneId,
    toZoneId: resolution.discardZoneId
  });

  const judgmentCard = session.state.objects[judgmentCardId];
  if (!judgmentCard) {
    throw new CommandRejectedError("missing_object", `Judgment card ${judgmentCardId} does not exist`);
  }

  if (judgmentCardMatches(judgmentCard, resolution.hit)) {
    executeBehaviorInSession(session, resolution.onHitBehaviorId, {
      sourceObjectId: resolution.objectId,
      controllerId: session.command.playerId,
      selections: {
        [resolution.targetSelectorId ?? "target"]: [resolution.targetPlayerId]
      }
    });

    const resolvedObject = session.state.objects[resolution.objectId];
    if (resolvedObject) {
      emit<CardMovedPayload>(session, "card_moved", {
        objectId: resolution.objectId,
        fromZoneId: resolvedObject.zoneId,
        toZoneId: resolution.discardZoneId
      });
    }
    return;
  }

  const missedObject = session.state.objects[resolution.objectId];
  if (!missedObject) {
    return;
  }

  if (resolution.onMiss?.moveToNextAliveJudgment) {
    const currentZone = session.state.zones[missedObject.zoneId];
    const currentPlayerId = currentZone?.ownerId ?? missedObject.ownerId ?? resolution.targetPlayerId;
    const nextZoneId = nextAliveOwnedZoneId(session.state, currentPlayerId, currentZone?.zoneType ?? "judgment");

    if (nextZoneId && missedObject.zoneId !== nextZoneId) {
      emit<CardMovedPayload>(session, "card_moved", {
        objectId: resolution.objectId,
        fromZoneId: missedObject.zoneId,
        toZoneId: nextZoneId
      });
      return;
    }
  }

  emit<CardMovedPayload>(session, "card_moved", {
    objectId: resolution.objectId,
    fromZoneId: missedObject.zoneId,
    toZoneId: resolution.discardZoneId
  });
}

function runEffect(session: ResolutionSession, effect: EffectDefinition): void {
  if (effect.type === "deal_damage") {
    const targetPlayerId = resolvePlayerRef(session, effect.to);
    const target = session.state.players[targetPlayerId];

    if (!target) {
      throw new CommandRejectedError("missing_target", `Target player ${targetPlayerId} does not exist`);
    }

    const health = target.resources.health;
    if (!health) {
      throw new CommandRejectedError("missing_health", `Target player ${targetPlayerId} does not have health`);
    }

    const amount = applyDamagePrevention(session, targetPlayerId, damageAfterEquipmentReduction(session.state, targetPlayerId, effect.amount));
    const currentHealth = session.state.players[targetPlayerId]?.resources.health;
    emit<DamageDealtPayload>(session, "damage_dealt", {
      sourceObjectId: session.sourceObjectId,
      sourcePlayerId: session.controllerId,
      targetPlayerId,
      amount,
      damageType: effect.damageType ?? "normal"
    });
    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId: targetPlayerId,
      resource: "health",
      current: (currentHealth ?? health).current - amount,
      max: (currentHealth ?? health).max,
      reason: "damage"
    });
    checkDeathsAndOutcomes(session);
  } else if (effect.type === "deal_damage_all_players") {
    const targets = Object.values(session.state.players).filter((player) => effect.includeDead || player.status === "alive");

    for (const target of targets) {
      const health = target.resources.health;
      if (!health) {
        continue;
      }

      const amount = applyDamagePrevention(session, target.id, damageAfterEquipmentReduction(session.state, target.id, effect.amount));
      const currentHealth = session.state.players[target.id]?.resources.health;
      emit<DamageDealtPayload>(session, "damage_dealt", {
        sourceObjectId: session.sourceObjectId,
        sourcePlayerId: session.controllerId,
        targetPlayerId: target.id,
        amount,
        damageType: effect.damageType ?? "normal"
      });
      emit<ResourceChangedPayload>(session, "resource_changed", {
        playerId: target.id,
        resource: "health",
        current: (currentHealth ?? health).current - amount,
        max: (currentHealth ?? health).max,
        reason: "damage"
      });
    }

    checkDeathsAndOutcomes(session);
  } else if (effect.type === "heal") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];
    const resourceName = effect.resource ?? "health";
    const resource = player?.resources[resourceName];

    if (!player || !resource) {
      throw new CommandRejectedError("missing_resource", `Player ${playerId} does not have resource ${resourceName}`);
    }

    const uncapped = resource.current + effect.amount;
    const current = resource.max === undefined ? uncapped : Math.min(resource.max, uncapped);

    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: resourceName,
      current,
      max: resource.max,
      reason: "heal"
    });
  } else if (effect.type === "prevent_next_damage") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];

    if (!player) {
      throw new CommandRejectedError("missing_player", `Player ${playerId} does not exist`);
    }

    const resourceName = "prevent_next_damage";
    const current = player.resources[resourceName]?.current ?? 0;
    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: resourceName,
      current: current + effect.amount,
      max: player.resources[resourceName]?.max,
      reason: effect.reason ?? "prevent_next_damage"
    });
  } else if (effect.type === "move_card") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];
    const toZoneId = resolveZoneRef(session, effect.toZoneId);

    if (!object) {
      throw new CommandRejectedError("missing_object", `Object ${objectId} does not exist`);
    }

    emit<CardMovedPayload>(session, "card_moved", {
      objectId,
      fromZoneId: object.zoneId,
      toZoneId,
      toPosition: effect.toPosition
    });
  } else if (effect.type === "equip_object") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];
    const playerId = resolvePlayerRef(session, effect.player);
    const toZoneId = resolveZoneRef(session, { owner: { id: playerId }, zoneType: "equipment" });

    if (!object) {
      throw new CommandRejectedError("missing_object", `Equipment object ${objectId} does not exist`);
    }

    if (!object.tags.includes(effect.slotTag)) {
      throw new CommandRejectedError("slot_mismatch", `Object ${objectId} does not have equipment slot tag ${effect.slotTag}`);
    }

    const discardZoneId = effect.discardZoneId ? resolveZoneRef(session, effect.discardZoneId) : undefined;
    const equipmentZone = session.state.zones[toZoneId];
    const existingSlotObjectIds = [...(equipmentZone?.objectIds ?? [])].filter((candidateId) => {
      const candidate = session.state.objects[candidateId];
      return candidateId !== objectId && candidate?.tags.includes(effect.slotTag);
    });

    for (const existingObjectId of existingSlotObjectIds) {
      const existingObject = session.state.objects[existingObjectId];
      if (!existingObject) {
        continue;
      }

      if (!discardZoneId) {
        throw new CommandRejectedError("missing_discard_zone", `Equipping ${objectId} would replace ${existingObjectId}, but no discard zone was provided`);
      }

      emit<CardMovedPayload>(session, "card_moved", {
        objectId: existingObjectId,
        fromZoneId: existingObject.zoneId,
        toZoneId: discardZoneId
      });
    }

    if (object.zoneId !== toZoneId) {
      emit<CardMovedPayload>(session, "card_moved", {
        objectId,
        fromZoneId: object.zoneId,
        toZoneId
      });
    }
  } else if (effect.type === "resolve_delayed_effect") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];
    const targetPlayerId = resolvePlayerRef(session, effect.target);
    const discardZoneId = resolveZoneRef(session, effect.discardZoneId);

    if (!object) {
      throw new CommandRejectedError("missing_object", `Delayed effect object ${objectId} does not exist`);
    }

    executeBehaviorInSession(session, effect.behaviorId, {
      sourceObjectId: objectId,
      controllerId: session.command.playerId,
      selections: {
        [effect.targetSelectorId ?? "target"]: [targetPlayerId]
      }
    });

    const delayedObject = session.state.objects[objectId];
    if (delayedObject) {
      emit<CardMovedPayload>(session, "card_moved", {
        objectId,
        fromZoneId: delayedObject.zoneId,
        toZoneId: discardZoneId
      });
    }
  } else if (effect.type === "resolve_delayed_effects_in_zone") {
    const playerId = resolvePlayerRef(session, effect.player);
    const zoneId = resolveZoneRef(session, { owner: { id: playerId }, zoneType: effect.zoneType });
    const discardZoneId = resolveZoneRef(session, effect.discardZoneId);
    const targetPlayerId = resolvePlayerRef(session, effect.target ?? { id: playerId });
    const objectIds = [...(session.state.zones[zoneId]?.objectIds ?? [])].filter((objectId) => {
      const object = session.state.objects[objectId];
      return object && (!effect.objectTag || object.tags.includes(effect.objectTag));
    });

    for (const objectId of objectIds) {
      const object = session.state.objects[objectId];
      if (!object || object.zoneId !== zoneId) {
        continue;
      }

      executeBehaviorInSession(session, effect.behaviorId, {
        sourceObjectId: objectId,
        controllerId: session.command.playerId,
        selections: {
          [effect.targetSelectorId ?? "target"]: [targetPlayerId]
        }
      });

      const delayedObject = session.state.objects[objectId];
      if (delayedObject) {
        emit<CardMovedPayload>(session, "card_moved", {
          objectId,
          fromZoneId: delayedObject.zoneId,
          toZoneId: discardZoneId
        });
      }
    }
  } else if (effect.type === "resolve_delayed_judgment") {
    const objectId = resolveObjectRef(session, effect.object);
    const deckZoneId = resolveZoneRef(session, effect.deckZoneId);
    const discardZoneId = resolveZoneRef(session, effect.discardZoneId);
    const targetPlayerId = resolvePlayerRef(session, effect.target);

    resolveDelayedJudgmentObject(session, {
      objectId,
      deckZoneId,
      discardZoneId,
      hit: effect.hit,
      onHitBehaviorId: effect.onHitBehaviorId,
      targetPlayerId,
      targetSelectorId: effect.targetSelectorId,
      onMiss: effect.onMiss
    });
  } else if (effect.type === "resolve_delayed_judgments_in_zone") {
    const playerId = resolvePlayerRef(session, effect.player);
    const zoneId = resolveZoneRef(session, { owner: { id: playerId }, zoneType: effect.zoneType });
    const deckZoneId = resolveZoneRef(session, effect.deckZoneId);
    const discardZoneId = resolveZoneRef(session, effect.discardZoneId);
    const targetPlayerId = resolvePlayerRef(session, effect.target ?? { id: playerId });
    const objectIds = [...(session.state.zones[zoneId]?.objectIds ?? [])].filter((objectId) => {
      const object = session.state.objects[objectId];
      return object && (!effect.objectTag || object.tags.includes(effect.objectTag));
    });

    for (const objectId of objectIds) {
      const object = session.state.objects[objectId];
      if (!object || object.zoneId !== zoneId) {
        continue;
      }

      resolveDelayedJudgmentObject(session, {
        objectId,
        deckZoneId,
        discardZoneId,
        hit: effect.hit,
        onHitBehaviorId: effect.onHitBehaviorId,
        targetPlayerId,
        targetSelectorId: effect.targetSelectorId,
        onMiss: effect.onMiss
      });
    }
  } else if (effect.type === "draw_cards") {
    const fromZoneId = resolveZoneRef(session, effect.fromZoneId);
    const toZoneId = resolveZoneRef(session, effect.toZoneId);

    for (let index = 0; index < effect.count; index += 1) {
      const fromZone = session.state.zones[fromZoneId];

      if (!fromZone) {
        throw new CommandRejectedError("missing_zone", `Draw source zone ${fromZoneId} does not exist`);
      }

      const objectId = fromZone.objectIds[0];
      if (!objectId) {
        if (!effect.emptyDeck) {
          throw new CommandRejectedError("empty_zone", `Draw source zone ${fromZoneId} is empty`);
        }

        const playerId = resolvePlayerRef(session, effect.emptyDeck.player);
        const player = session.state.players[playerId];

        if (!player) {
          throw new CommandRejectedError("missing_player", `Empty-deck player ${playerId} does not exist`);
        }

        const counter = player.resources[effect.emptyDeck.counter]?.current ?? effect.emptyDeck.startAt - effect.emptyDeck.incrementBy;
        const nextCounter = counter + effect.emptyDeck.incrementBy;
        emit<ResourceChangedPayload>(session, "resource_changed", {
          playerId,
          resource: effect.emptyDeck.counter,
          current: nextCounter,
          reason: "empty_deck_counter"
        });

        const health = player.resources.health;
        if (!health) {
          throw new CommandRejectedError("missing_health", `Empty-deck player ${playerId} does not have health`);
        }

        emit<DamageDealtPayload>(session, "damage_dealt", {
          sourcePlayerId: playerId,
          targetPlayerId: playerId,
          amount: nextCounter,
          damageType: "fatigue"
        });
        emit<ResourceChangedPayload>(session, "resource_changed", {
          playerId,
          resource: "health",
          current: health.current - nextCounter,
          max: health.max,
          reason: "fatigue"
        });
        checkDeathsAndOutcomes(session);
        continue;
      }

      emit<CardMovedPayload>(session, "card_moved", {
        objectId,
        fromZoneId,
        toZoneId
      });
    }
  } else if (effect.type === "set_resource") {
    const playerId = resolvePlayerRef(session, effect.player);
    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: effect.resource,
      current: effect.current,
      max: effect.max,
      reason: effect.reason
    });
    checkDeathsAndOutcomes(session);
  } else if (effect.type === "adjust_resource") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];

    if (!player) {
      throw new CommandRejectedError("missing_player", `Adjust resource player ${playerId} does not exist`);
    }

    const resource = player.resources[effect.resource];
    const current = resource?.current ?? 0;
    const max = effect.max ?? resource?.max;
    let next = current + effect.delta;

    if (effect.capAtResourceMax && max !== undefined) {
      next = Math.min(next, max);
    }

    if (effect.min !== undefined) {
      next = Math.max(next, effect.min);
    }

    if (effect.max !== undefined) {
      next = Math.min(next, effect.max);
    }

    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: effect.resource,
      current: next,
      max,
      reason: effect.reason ?? "adjust"
    });
    checkDeathsAndOutcomes(session);
  } else if (effect.type === "toggle_resource") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];

    if (!player) {
      throw new CommandRejectedError("missing_player", `Toggle resource player ${playerId} does not exist`);
    }

    const offValue = effect.offValue ?? 0;
    const onValue = effect.onValue ?? 1;
    const current = player.resources[effect.resource]?.current ?? offValue;
    emit<ResourceChangedPayload>(session, "resource_changed", {
      playerId,
      resource: effect.resource,
      current: current === onValue ? offValue : onValue,
      max: player.resources[effect.resource]?.max,
      reason: effect.reason ?? "toggle"
    });
  } else if (effect.type === "execute_behavior_if_resource") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];

    if (!player) {
      throw new CommandRejectedError("missing_player", `Conditional resource player ${playerId} does not exist`);
    }

    const current = player.resources[effect.resource]?.current ?? 0;
    const equals = effect.equals === undefined || current === effect.equals;
    const atLeast = effect.atLeast === undefined || current >= effect.atLeast;
    const behaviorId = equals && atLeast ? effect.behaviorId : effect.elseBehaviorId;

    if (behaviorId) {
      executeBehaviorInSession(session, behaviorId, {
        controllerId: session.controllerId,
        selections: session.selections
      });
    }
  } else if (effect.type === "discard_to_hand_limit") {
    const playerId = resolvePlayerRef(session, effect.player);
    const player = session.state.players[playerId];
    const handZoneId = resolveZoneRef(session, effect.handZoneId);
    const discardZoneId = resolveZoneRef(session, effect.discardZoneId);
    const resourceName = effect.resource ?? "health";
    const limit = Math.max(effect.minimum ?? 0, player?.resources[resourceName]?.current ?? 0);

    if (!player) {
      throw new CommandRejectedError("missing_player", `Discard player ${playerId} does not exist`);
    }

    if (!session.state.zones[handZoneId]) {
      throw new CommandRejectedError("missing_zone", `Discard hand zone ${handZoneId} does not exist`);
    }

    while ((session.state.zones[handZoneId]?.objectIds.length ?? 0) > limit) {
      const handZone = session.state.zones[handZoneId]!;
      const objectId = handZone.objectIds.at(-1);
      if (!objectId) {
        break;
      }

      emit<CardMovedPayload>(session, "card_moved", {
        objectId,
        fromZoneId: handZoneId,
        toZoneId: discardZoneId
      });
    }
  } else if (effect.type === "set_player_status") {
    const playerId = resolvePlayerRef(session, effect.player);
    emit<PlayerStatusChangedPayload>(session, "player_status_changed", {
      playerId,
      status: effect.status,
      reason: effect.reason
    });
    checkDeathsAndOutcomes(session);
  } else if (effect.type === "destroy_object") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];
    const toZoneId = effect.toZoneId ? resolveZoneRef(session, effect.toZoneId) : undefined;

    if (!object) {
      throw new CommandRejectedError("missing_object", `Object ${objectId} does not exist`);
    }

    emit<ObjectDestroyedPayload>(session, "object_destroyed", {
      objectId,
      fromZoneId: object.zoneId,
      toZoneId,
      reason: effect.reason
    });
  } else if (effect.type === "set_object_exhausted") {
    const objectId = resolveObjectRef(session, effect.object);
    if (!session.state.objects[objectId]) {
      throw new CommandRejectedError("missing_object", `Object ${objectId} does not exist`);
    }
    emit<ObjectExhaustedPayload>(session, "object_exhausted", {
      objectId,
      exhausted: effect.exhausted,
      reason: effect.reason
    });
  } else if (effect.type === "adjust_object_counter") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];

    if (!object) {
      throw new CommandRejectedError("missing_object", `Object ${objectId} does not exist`);
    }

    let value = (object.counters[effect.counter] ?? 0) + effect.delta;

    if (effect.min !== undefined) {
      value = Math.max(value, effect.min);
    }

    if (effect.max !== undefined) {
      value = Math.min(value, effect.max);
    }

    emit<ObjectCounterChangedPayload>(session, "object_counter_changed", {
      objectId,
      counter: effect.counter,
      value,
      reason: effect.reason ?? "adjust"
    });
  } else if (effect.type === "destroy_object_if_counter_at_most") {
    const objectId = resolveObjectRef(session, effect.object);
    const object = session.state.objects[objectId];
    const toZoneId = effect.toZoneId ? resolveZoneRef(session, effect.toZoneId) : undefined;

    if (!object) {
      throw new CommandRejectedError("missing_object", `Object ${objectId} does not exist`);
    }

    if ((object.counters[effect.counter] ?? 0) <= effect.value) {
      emit<ObjectDestroyedPayload>(session, "object_destroyed", {
        objectId,
        fromZoneId: object.zoneId,
        toZoneId,
        reason: effect.reason
      });
    }
  } else if (effect.type === "register_trigger") {
    const sourceObjectId = resolveObjectRef(session, effect.source);
    const sourceObject = session.state.objects[sourceObjectId];

    if (!sourceObject) {
      throw new CommandRejectedError("missing_object", `Trigger source ${sourceObjectId} does not exist`);
    }

    emit<TriggerRegisteredPayload>(session, "trigger_registered", {
      trigger: {
        id: `trigger_${sourceObjectId}_${effect.behaviorId}_${session.state.triggers.length + 1}`,
        sourceObjectId,
        controllerId: sourceObject.controllerId,
        behaviorId: effect.behaviorId,
        eventType: effect.eventType,
        timing: "after",
        priority: effect.priority ?? 100,
        once: effect.once ?? true,
        firedCount: 0
      }
    });
  } else if (effect.type === "open_prompt") {
    const responderIds = [
      ...effect.responderIds.map((responder) => resolvePlayerRef(session, responder)),
      ...(effect.responderSelectorIds ?? []).flatMap((selectorId) => session.selections[selectorId] ?? [])
    ];
    const uniqueResponderIds = [...new Set(responderIds)];
    const defaultSelections = Object.fromEntries(
      Object.entries(effect.defaultSelections ?? {}).map(([selectorId, refs]) => [selectorId, refs.map((ref) => resolvePlayerRef(session, ref))])
    );
    const hasDefaultSelections = Object.keys(defaultSelections).length > 0;
    const basePayload = typeof effect.payload === "object" && effect.payload !== null && !Array.isArray(effect.payload) ? effect.payload : {};
    const payload = hasDefaultSelections
      ? {
          ...basePayload,
          defaultSelections: {
            ...((basePayload as PromptAutomationPayload).defaultSelections ?? {}),
            ...defaultSelections
          }
        }
      : effect.payload;

    for (const responderId of uniqueResponderIds) {
      if (!session.state.players[responderId]) {
        throw new CommandRejectedError("missing_player", `Prompt responder ${responderId} does not exist`);
      }
    }

    emit<PromptOpenedPayload>(session, "prompt_opened", {
      prompt: {
        id: resolveTemplateId(session, effect.promptId),
        status: "open",
        responderIds: uniqueResponderIds,
        currentResponderId: uniqueResponderIds[0],
        answeredResponderIds: [],
        passedResponderIds: [],
        promptType: effect.promptType,
        responseMode: effect.responseMode ?? "single",
        payload,
        responses: {},
        openedAtSequence: session.state.lastSequence + 1
      }
    });
  }
}

export function resolveCommand(state: MatchState, command: MatchCommand, context: ResolutionContext): ResolutionResult {
  if (command.type === "answer_prompt") {
    const payload = command.payload as AnswerPromptPayload;
    const prompt = state.prompts[payload.promptId];

    if (!prompt) {
      throw new CommandRejectedError("missing_prompt", `Prompt ${payload.promptId} does not exist`);
    }

    if (prompt.status !== "open") {
      throw new CommandRejectedError("prompt_not_open", `Prompt ${payload.promptId} is not open`);
    }

    if (command.playerId && !prompt.responderIds.includes(command.playerId)) {
      throw new CommandRejectedError("not_prompt_responder", `Player ${command.playerId} cannot answer prompt ${payload.promptId}`);
    }

    if (!command.playerId) {
      throw new CommandRejectedError("missing_command_player", `Prompt ${payload.promptId} requires a responder player id`);
    }

    if (prompt.currentResponderId && prompt.currentResponderId !== command.playerId) {
      throw new CommandRejectedError(
        "not_current_responder",
        `Player ${command.playerId} cannot answer prompt ${payload.promptId}; waiting for ${prompt.currentResponderId}`
      );
    }

    const progress = resolvePromptProgress(prompt, command.playerId, payload.answer);
    const session: ResolutionSession = {
      command: command as MatchCommand<ExecuteBehaviorPayload>,
      context,
      selections: {},
      state: structuredClone(state),
      events: [],
      transactionId: command.id,
      triggerDepth: 0
    };
    emit<PromptAnsweredPayload>(session, "prompt_answered", {
      promptId: payload.promptId,
      responderId: command.playerId,
      status: progress.status,
      nextResponderId: progress.nextResponderId,
      passedResponderIds: progress.passedResponderIds,
      answer: payload.answer
    });

    const promptPayload = (prompt.payload ?? {}) as PromptAutomationPayload;
    const responseBehavior = promptBehaviorAnswer(payload.answer);
    if (responseBehavior) {
      if (
        promptPayload.allowedResponseBehaviors &&
        !promptPayload.allowedResponseBehaviors.includes(responseBehavior.behaviorId)
      ) {
        throw new CommandRejectedError(
          "response_behavior_not_allowed",
          `Behavior ${responseBehavior.behaviorId} is not allowed for prompt ${payload.promptId}`
        );
      }

      const selections = structuredClone(promptPayload.defaultSelections ?? {});
      for (const [selectorId, selectedIds] of Object.entries(responseBehavior.selections ?? {})) {
        selections[selectorId] = [...selectedIds];
      }

      executeBehaviorInSession(session, responseBehavior.behaviorId, {
        sourceObjectId: responseBehavior.sourceObjectId,
        controllerId: command.playerId,
        selections
      });
    }

    if (isPassAnswer(payload.answer) && progress.status === "answered" && promptPayload.onPassBehavior) {
      const selections = structuredClone(promptPayload.defaultSelections ?? {});

      if (promptPayload.defaultTargetFromResponder && command.playerId) {
        selections.target = [command.playerId];
      }

      executeBehaviorInSession(session, promptPayload.onPassBehavior, {
        controllerId: command.playerId,
        selections
      });
    }

    return {
      state: session.state,
      events: session.events
    };
  }

  if (command.type !== "execute_behavior") {
    throw new CommandRejectedError("unknown_command", `Unknown command type ${command.type}`);
  }

  const payload = command.payload as ExecuteBehaviorPayload;
  const behavior = context.behaviorLibrary.behaviors[payload.behaviorId];

  if (!behavior) {
    throw new CommandRejectedError("missing_behavior", `Behavior ${payload.behaviorId} does not exist`);
  }

  const sourceObject = payload.sourceObjectId ? state.objects[payload.sourceObjectId] : undefined;
  const session: ResolutionSession = {
    command: command as MatchCommand<ExecuteBehaviorPayload>,
    context,
    sourceObjectId: payload.sourceObjectId,
    controllerId: sourceObject?.controllerId ?? command.playerId,
    ownerId: sourceObject?.ownerId,
    selections: payload.selections ?? {},
    state: structuredClone(state),
    events: [],
    transactionId: command.id,
    triggerDepth: 0
  };

  validateSelectors(session.state, behavior, session);

  for (const condition of behavior.conditions ?? []) {
    validateCondition(session, condition);
  }

  for (const cost of behavior.costs ?? []) {
    payCost(session, cost);
  }

  runBehaviorEffects(session, behavior);

  return {
    state: session.state,
    events: session.events
  };
}
