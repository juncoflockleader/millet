import {
  createEmptyMatchState,
  advanceTurnToNextAlive,
  assertStateInvariants,
  projectEvent,
  projectState,
  reduceEvent,
  resolveCommand,
  runPhaseGraph,
  type BehaviorLibrary,
  type ExecuteBehaviorPayload,
  type MatchCommand,
  type MatchEvent,
  type MatchState,
  type PlayerStatus,
  type ViewerContext
} from "../../engine-core/src/index.ts";
import { buildRulesetBundle, contentLockFromBundle, type BuiltBundle } from "../../content-build/src/build.ts";
import type { FileBundleStore } from "../../content-build/src/store.ts";
import { createSampleDuelSetupEvents, sampleDuelBehaviors, sampleDuelPhaseGraph } from "../../rulesets/sample-duel/sample-duel.ts";
import {
  createSampleIdentitySetupEvents,
  evaluateIdentityOutcome,
  sampleIdentityBehaviors,
  sampleIdentityPhaseGraph
} from "../../rulesets/sample-identity/sample-identity.ts";
import { DeterministicScheduler, type ScheduledAction } from "./scheduler.ts";

export interface StoredMatch {
  id: string;
  rulesetId: "sample-duel" | "sample-identity";
  state: MatchState;
  events: MatchEvent[];
  snapshots: { sequence: number; state: MatchState }[];
  behaviorLibrary: BehaviorLibrary;
}

const RULESET_DIRS: Record<StoredMatch["rulesetId"], string> = {
  "sample-duel": "packages/rulesets/sample-duel",
  "sample-identity": "packages/rulesets/sample-identity"
};

const COMMAND_ALLOWED_PLAYER_STATUSES: PlayerStatus[] = ["alive", "dying"];

export interface MatchServiceOptions {
  bundleStore?: Pick<FileBundleStore, "put">;
  scheduler?: DeterministicScheduler;
  scheduledActions?: readonly ScheduledAction[];
}

export interface PromptDefaultPassOptions {
  id?: string;
  commandId?: string;
  matchId: string;
  promptId: string;
  dueAtMs: number;
  responderId?: string;
  answer?: unknown;
}

export interface TurnTimeoutOptions {
  id?: string;
  commandId?: string;
  matchId: string;
  dueAtMs: number;
  playerId?: string;
  phaseId?: string;
}

export interface ReconnectGraceOptions {
  id?: string;
  commandId?: string;
  matchId: string;
  playerId: string;
  dueAtMs: number;
  expireStatus?: Extract<PlayerStatus, "conceded" | "eliminated">;
  reason?: string;
}

export interface AutoDiscardOptions {
  id?: string;
  commandId?: string;
  matchId: string;
  playerId: string;
  dueAtMs: number;
  handZoneId?: string;
  discardZoneId?: string;
  keepCount?: number;
  reason?: string;
}

export interface UserSession {
  userId?: string;
  admin?: boolean;
}

export interface ViewerRequest {
  playerId?: string;
  seatId?: string;
  admin?: boolean;
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class InMemoryMatchService {
  private readonly matches = new Map<string, StoredMatch>();
  private readonly subscribers = new Map<string, Set<(events: MatchEvent[]) => void>>();
  private readonly bundleStore?: Pick<FileBundleStore, "put">;
  readonly scheduler: DeterministicScheduler;

  constructor(options: MatchServiceOptions = {}) {
    this.bundleStore = options.bundleStore;
    this.scheduler = options.scheduler ?? new DeterministicScheduler(options.scheduledActions);
  }

  createMatch(rulesetId: "sample-duel" | "sample-identity", options: { playerCount?: 6 | 8 } = {}): StoredMatch {
    const bundle = this.buildAndStoreRulesetBundle(rulesetId);
    const contentLock = contentLockFromBundle(bundle);
    const setupEvents =
      rulesetId === "sample-duel"
        ? createSampleDuelSetupEvents({ contentLock })
        : createSampleIdentitySetupEvents({ playerCount: options.playerCount ?? 6, contentLock });
    const state = setupEvents.reduce((current, event) => reduceEvent(current, event), createEmptyMatchState());
    const match: StoredMatch = {
      id: state.matchId,
      rulesetId,
      state,
      events: setupEvents,
      snapshots: [{ sequence: state.lastSequence, state: structuredClone(state) }],
      behaviorLibrary: rulesetId === "sample-duel" ? sampleDuelBehaviors : sampleIdentityBehaviors
    };

    this.matches.set(match.id, match);
    return match;
  }

  private buildAndStoreRulesetBundle(rulesetId: StoredMatch["rulesetId"]): BuiltBundle {
    const bundle = buildRulesetBundle(RULESET_DIRS[rulesetId]);
    const errors = bundle.issues.filter((issue) => issue.severity === "error");
    if (errors.length > 0) {
      throw new Error(`Ruleset ${rulesetId} has validation errors: ${errors.map((issue) => issue.message).join("; ")}`);
    }

    this.bundleStore?.put(bundle);
    return bundle;
  }

  getMatch(matchId: string): StoredMatch | undefined {
    return this.matches.get(matchId);
  }

  restoreMatch(match: StoredMatch): StoredMatch {
    const restored: StoredMatch = {
      ...match,
      state: structuredClone(match.state),
      events: structuredClone(match.events),
      snapshots: structuredClone(match.snapshots),
      behaviorLibrary: match.behaviorLibrary
    };
    this.matches.set(restored.id, restored);
    return restored;
  }

  disconnectPlayer(matchId: string, playerId: string, reason = "disconnect"): StoredMatch {
    return this.applyPlayerStatusChange(matchId, playerId, "disconnected", reason, `cmd_disconnect_${matchId}_${playerId}`);
  }

  reconnectPlayer(matchId: string, playerId: string, status: Extract<PlayerStatus, "alive" | "dying"> = "alive"): StoredMatch {
    return this.applyPlayerStatusChange(matchId, playerId, status, "reconnect", `cmd_reconnect_${matchId}_${playerId}`);
  }

  submitCommandForSession(matchId: string, command: MatchCommand, session: UserSession): StoredMatch {
    const match = this.requireMatch(matchId);
    this.authorizeSessionForPlayer(match, command.playerId, session);
    return this.submitCommand(matchId, command);
  }

  viewerForSession(matchId: string, session: UserSession, request: ViewerRequest = {}): ViewerContext {
    const match = this.requireMatch(matchId);

    if (request.admin) {
      if (!session.admin) {
        throw new AuthorizationError("Admin projection requires an admin session");
      }

      return { admin: true };
    }

    const requestedPlayerId = request.playerId ?? this.playerIdForUser(match, session.userId);
    if (requestedPlayerId) {
      this.authorizeSessionForPlayer(match, requestedPlayerId, session);
      const player = match.state.players[requestedPlayerId]!;
      return {
        playerId: requestedPlayerId,
        seatId: request.seatId ?? player.seatId
      };
    }

    if (request.seatId) {
      const seat = match.state.seats.find((candidate) => candidate.id === request.seatId);
      if (seat?.playerId) {
        this.authorizeSessionForPlayer(match, seat.playerId, session);
      }
      return { seatId: request.seatId };
    }

    return {};
  }

  reconnectForSession(matchId: string, session: UserSession, request: ViewerRequest = {}, lastSequence = 0): { state: MatchState; events: MatchEvent[] } {
    return this.reconnect(matchId, this.viewerForSession(matchId, session, request), lastSequence);
  }

  submitCommand(matchId: string, command: MatchCommand): StoredMatch {
    const match = this.matches.get(matchId);

    if (!match) {
      throw new Error(`Match ${matchId} does not exist`);
    }

    if (match.state.status === "completed") {
      throw new Error(`Match ${matchId} is completed`);
    }

    this.authorizeCommand(match, command);

    if (command.type === "end_turn") {
      if (!command.playerId) {
        throw new Error("end_turn requires playerId");
      }

      let state = match.state;
      const events: MatchEvent[] = [];

      if (match.rulesetId === "sample-identity" && state.turn.activePlayerId === command.playerId && state.turn.phaseId === "play") {
        const cleanupRun = runPhaseGraph(state, sampleIdentityPhaseGraph, {
          activePlayerId: command.playerId,
          behaviorLibrary: match.behaviorLibrary,
          deathMode: "dying"
        }, {
          fromPhaseId: "discard"
        });
        state = cleanupRun.state;
        events.push(...cleanupRun.events);
      }

      const advanced = advanceTurnToNextAlive(state, command.playerId);
      state = advanced.state;
      events.push(advanced.event);

      if (match.rulesetId === "sample-duel") {
        const phaseRun = runPhaseGraph(state, sampleDuelPhaseGraph, {
          activePlayerId: state.turn.activePlayerId!,
          behaviorLibrary: match.behaviorLibrary,
          outcomeMode: "last_alive"
        });
        state = phaseRun.state;
        events.push(...phaseRun.events);
      } else if (match.rulesetId === "sample-identity") {
        const phaseRun = runPhaseGraph(state, sampleIdentityPhaseGraph, {
          activePlayerId: state.turn.activePlayerId!,
          behaviorLibrary: match.behaviorLibrary,
          deathMode: "dying"
        });
        state = phaseRun.state;
        events.push(...phaseRun.events);
      }

      match.state = state;
      match.events.push(...events);
      const outcomeEvent = this.appendIdentityOutcomeIfComplete(match, command.id);
      this.publish(matchId, outcomeEvent ? [...events, outcomeEvent] : events);
      match.snapshots.push({ sequence: match.state.lastSequence, state: structuredClone(match.state) });
      return match;
    }

    const result = resolveCommand(match.state, command, {
      behaviorLibrary: match.behaviorLibrary,
      outcomeMode: match.rulesetId === "sample-duel" ? "last_alive" : "none",
      deathMode: match.rulesetId === "sample-identity" ? "dying" : "direct",
      dyingPrompt: match.rulesetId === "sample-identity" ? { onPassBehavior: "finish_dying" } : undefined
    });
    match.state = result.state;
    match.events.push(...result.events);
    const outcomeEvent = this.appendIdentityOutcomeIfComplete(match, command.id);
    this.publish(matchId, outcomeEvent ? [...result.events, outcomeEvent] : result.events);

    if (match.state.lastSequence % 50 === 0 || match.state.status === "completed") {
      match.snapshots.push({ sequence: match.state.lastSequence, state: structuredClone(match.state) });
    }

    return match;
  }

  private authorizeCommand(match: StoredMatch, command: MatchCommand): void {
    if (command.matchId !== match.id) {
      throw new Error(`Command ${command.id} targets match ${command.matchId}, not ${match.id}`);
    }

    if (!command.playerId) {
      throw new Error(`Command ${command.id} requires playerId`);
    }

    const player = match.state.players[command.playerId];
    if (!player) {
      throw new Error(`Player ${command.playerId} is not seated in match ${match.id}`);
    }

    if (!COMMAND_ALLOWED_PLAYER_STATUSES.includes(player.status)) {
      throw new Error(`Player ${command.playerId} cannot act while ${player.status}`);
    }

    if (command.type === "end_turn") {
      const activePlayerId = match.state.turn.activePlayerId;
      if (activePlayerId && activePlayerId !== command.playerId) {
        throw new Error(`Player ${command.playerId} cannot end turn for active player ${activePlayerId}`);
      }
      return;
    }

    if (command.type === "answer_prompt") {
      const payload = command.payload as { promptId?: string };
      const promptId = payload.promptId;
      const prompt = promptId ? match.state.prompts[promptId] : undefined;
      if (!prompt || prompt.status !== "open") {
        throw new Error(`Prompt ${promptId ?? ""} is not open`.trim());
      }

      if (!prompt.responderIds.includes(command.playerId)) {
        throw new Error(`Player ${command.playerId} cannot answer prompt ${prompt.id}`);
      }

      if (prompt.currentResponderId && prompt.currentResponderId !== command.playerId) {
        throw new Error(`Prompt ${prompt.id} is waiting for ${prompt.currentResponderId}, not ${command.playerId}`);
      }
      return;
    }

    if (command.type === "execute_behavior") {
      const payload = command.payload as ExecuteBehaviorPayload;
      if (payload.sourceObjectId) {
        const sourceObject = match.state.objects[payload.sourceObjectId];
        if (!sourceObject) {
          throw new Error(`Source object ${payload.sourceObjectId} does not exist`);
        }

        if (sourceObject.controllerId && sourceObject.controllerId !== command.playerId) {
          throw new Error(`Player ${command.playerId} does not control source object ${payload.sourceObjectId}`);
        }
      }
      return;
    }

    throw new Error(`Unknown command type ${command.type}`);
  }

  private authorizeSessionForPlayer(match: StoredMatch, playerId: string | undefined, session: UserSession): void {
    if (session.admin) {
      return;
    }

    if (!playerId) {
      throw new AuthorizationError("Command requires a player id");
    }

    if (!session.userId) {
      throw new AuthorizationError("User session is required");
    }

    const player = match.state.players[playerId];
    if (!player) {
      throw new AuthorizationError(`Player ${playerId} is not seated in match ${match.id}`);
    }

    if (player.userId !== session.userId) {
      throw new AuthorizationError(`User ${session.userId} cannot act as player ${playerId}`);
    }
  }

  private playerIdForUser(match: StoredMatch, userId: string | undefined): string | undefined {
    if (!userId) {
      return undefined;
    }

    return Object.values(match.state.players).find((player) => player.userId === userId)?.id;
  }

  subscribe(matchId: string, listener: (events: MatchEvent[]) => void): () => void {
    const listeners = this.subscribers.get(matchId) ?? new Set<(events: MatchEvent[]) => void>();
    listeners.add(listener);
    this.subscribers.set(matchId, listeners);

    return () => {
      listeners.delete(listener);
    };
  }

  scheduleDefaultAction(action: Omit<ScheduledAction, "status">): ScheduledAction {
    return this.scheduler.schedule(action);
  }

  scheduleTurnTimeout(options: TurnTimeoutOptions): ScheduledAction {
    const match = this.requireMatch(options.matchId);
    const activePlayerId = options.playerId ?? match.state.turn.activePlayerId;
    if (!activePlayerId) {
      throw new Error(`Match ${options.matchId} has no active player for a turn timeout`);
    }

    if (match.state.turn.activePlayerId && match.state.turn.activePlayerId !== activePlayerId) {
      throw new Error(`Cannot schedule a turn timeout for ${activePlayerId}; active player is ${match.state.turn.activePlayerId}`);
    }

    const phaseId = options.phaseId ?? match.state.turn.phaseId;
    const id = options.id ?? `turn_timeout_${options.matchId}_${activePlayerId}_${match.state.turn.turnNumber}_${options.dueAtMs}`;
    const commandId = options.commandId ?? `cmd_${id}`;
    return this.scheduler.schedule({
      id,
      matchId: options.matchId,
      dueAtMs: options.dueAtMs,
      command: {
        id: commandId,
        matchId: options.matchId,
        playerId: activePlayerId,
        type: "end_turn",
        payload: {
          reason: "turn_timeout"
        }
      },
      guard: {
        type: "active_turn",
        activePlayerId,
        turnNumber: match.state.turn.turnNumber,
        phaseId
      }
    });
  }

  schedulePromptDefaultPass(options: PromptDefaultPassOptions): ScheduledAction {
    const match = this.requireMatch(options.matchId);

    const prompt = match.state.prompts[options.promptId];
    if (!prompt || prompt.status !== "open") {
      throw new Error(`Prompt ${options.promptId} is not open`);
    }

    const responderId = options.responderId ?? prompt.currentResponderId ?? prompt.responderIds[0];
    if (!responderId || !prompt.responderIds.includes(responderId)) {
      throw new Error(`Prompt ${options.promptId} has no responder ${responderId ?? ""}`.trim());
    }

    if (prompt.currentResponderId && prompt.currentResponderId !== responderId) {
      throw new Error(`Prompt ${options.promptId} is waiting for ${prompt.currentResponderId}, not ${responderId}`);
    }

    const id = options.id ?? `prompt_timeout_${options.matchId}_${options.promptId}_${responderId}_${options.dueAtMs}`;
    const commandId = options.commandId ?? `cmd_${id}`;
    return this.scheduler.schedule({
      id,
      matchId: options.matchId,
      dueAtMs: options.dueAtMs,
      command: {
        id: commandId,
        matchId: options.matchId,
        playerId: responderId,
        type: "answer_prompt",
        payload: {
          promptId: options.promptId,
          answer: options.answer ?? "pass"
        }
      },
      guard: {
        type: "prompt_open",
        promptId: options.promptId,
        responderId,
        openedAtSequence: prompt.openedAtSequence
      }
    });
  }

  scheduleReconnectGrace(options: ReconnectGraceOptions): ScheduledAction {
    const match = this.requireMatch(options.matchId);
    const player = match.state.players[options.playerId];
    if (!player) {
      throw new Error(`Player ${options.playerId} is not seated in match ${options.matchId}`);
    }

    if (player.status !== "disconnected") {
      throw new Error(`Reconnect grace requires ${options.playerId} to be disconnected, not ${player.status}`);
    }

    const id = options.id ?? `reconnect_grace_${options.matchId}_${options.playerId}_${options.dueAtMs}`;
    const commandId = options.commandId ?? `cmd_${id}`;
    return this.scheduler.schedule({
      id,
      matchId: options.matchId,
      dueAtMs: options.dueAtMs,
      command: {
        id: commandId,
        matchId: options.matchId,
        type: "system_set_player_status",
        payload: {
          playerId: options.playerId,
          status: options.expireStatus ?? "conceded",
          reason: options.reason ?? "reconnect_grace_expired"
        }
      },
      guard: {
        type: "player_status",
        playerId: options.playerId,
        status: "disconnected"
      }
    });
  }

  scheduleAutoDiscard(options: AutoDiscardOptions): ScheduledAction {
    const match = this.requireMatch(options.matchId);
    const player = match.state.players[options.playerId];
    if (!player) {
      throw new Error(`Player ${options.playerId} is not seated in match ${options.matchId}`);
    }

    const handZoneId = options.handZoneId ?? this.singleZoneFor(match, options.playerId, "hand");
    const discardZoneId = options.discardZoneId ?? this.singleZoneFor(match, undefined, "discard");
    const keepCount = options.keepCount ?? Math.max(0, player.resources.health?.current ?? 0);
    const id = options.id ?? `auto_discard_${options.matchId}_${options.playerId}_${handZoneId}_${options.dueAtMs}`;
    const commandId = options.commandId ?? `cmd_${id}`;

    return this.scheduler.schedule({
      id,
      matchId: options.matchId,
      dueAtMs: options.dueAtMs,
      command: {
        id: commandId,
        matchId: options.matchId,
        playerId: options.playerId,
        type: "auto_discard",
        payload: {
          playerId: options.playerId,
          handZoneId,
          discardZoneId,
          keepCount,
          reason: options.reason ?? "auto_discard"
        }
      },
      guard: {
        type: "zone_over_limit",
        zoneId: handZoneId,
        limit: keepCount
      }
    });
  }

  advanceTime(nowMs: number): StoredMatch[] {
    const updated: StoredMatch[] = [];

    for (const action of this.scheduler.due(nowMs)) {
      if (!this.scheduledActionGuardAllows(action)) {
        this.scheduler.cancel(action.id);
        continue;
      }

      this.scheduler.markFired(action.id);
      const match = this.fireScheduledAction(action);
      if (match) {
        updated.push(match);
      }
    }

    return updated;
  }

  private fireScheduledAction(action: ScheduledAction): StoredMatch | undefined {
    if (action.command.matchId !== action.matchId) {
      throw new Error(`Scheduled action ${action.id} command targets match ${action.command.matchId}, not ${action.matchId}`);
    }

    if (action.command.type === "system_set_player_status") {
      const payload = action.command.payload as { playerId?: string; status?: PlayerStatus; reason?: string };
      if (!payload.playerId || !payload.status) {
        throw new Error(`Scheduled action ${action.id} has an invalid status payload`);
      }

      return this.applyPlayerStatusChange(action.matchId, payload.playerId, payload.status, payload.reason, action.command.id);
    }

    if (action.command.type === "auto_discard") {
      return this.applyAutoDiscard(action);
    }

    return this.submitCommand(action.matchId, action.command);
  }

  private scheduledActionGuardAllows(action: ScheduledAction): boolean {
    if (!action.guard) {
      return true;
    }

    const match = this.matches.get(action.matchId);
    if (!match) {
      return false;
    }

    if (action.guard.type === "prompt_open") {
      const prompt = match.state.prompts[action.guard.promptId];
      if (!prompt || prompt.status !== "open") {
        return false;
      }

      if (action.guard.openedAtSequence !== undefined && prompt.openedAtSequence !== action.guard.openedAtSequence) {
        return false;
      }

      if (action.guard.responderId && !prompt.responderIds.includes(action.guard.responderId)) {
        return false;
      }

      if (action.guard.responderId && prompt.currentResponderId && prompt.currentResponderId !== action.guard.responderId) {
        return false;
      }
    }

    if (action.guard.type === "active_turn") {
      if (match.state.status === "completed") {
        return false;
      }

      if (match.state.turn.activePlayerId !== action.guard.activePlayerId) {
        return false;
      }

      if (match.state.turn.turnNumber !== action.guard.turnNumber) {
        return false;
      }

      if (action.guard.phaseId !== undefined && match.state.turn.phaseId !== action.guard.phaseId) {
        return false;
      }
    }

    if (action.guard.type === "player_status") {
      if (match.state.players[action.guard.playerId]?.status !== action.guard.status) {
        return false;
      }
    }

    if (action.guard.type === "zone_over_limit") {
      const zone = match.state.zones[action.guard.zoneId];
      if (!zone || zone.objectIds.length <= action.guard.limit) {
        return false;
      }
    }

    return true;
  }

  private requireMatch(matchId: string): StoredMatch {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} does not exist`);
    }

    return match;
  }

  private singleZoneFor(match: StoredMatch, ownerId: string | undefined, zoneType: string): string {
    const matches = Object.values(match.state.zones)
      .filter((zone) => zone.ownerId === ownerId && zone.zoneType === zoneType)
      .map((zone) => zone.id)
      .sort();

    if (matches.length !== 1) {
      throw new Error(`Expected one ${zoneType} zone for ${ownerId ?? "match"}, got ${matches.length}`);
    }

    return matches[0]!;
  }

  private applyPlayerStatusChange(
    matchId: string,
    playerId: string,
    status: PlayerStatus,
    reason: string | undefined,
    commandId: string
  ): StoredMatch {
    const match = this.requireMatch(matchId);
    const player = match.state.players[playerId];
    if (!player) {
      throw new Error(`Player ${playerId} is not seated in match ${matchId}`);
    }

    if (player.status === status) {
      return match;
    }

    const event = this.appendServiceEvent(
      match,
      "player_status_changed",
      {
        playerId,
        status,
        reason
      },
      commandId
    );
    this.commitServiceEvents(match, [event]);
    return match;
  }

  private applyAutoDiscard(action: ScheduledAction): StoredMatch | undefined {
    const match = this.requireMatch(action.matchId);
    const payload = action.command.payload as {
      playerId?: string;
      handZoneId?: string;
      discardZoneId?: string;
      keepCount?: number;
      reason?: string;
    };

    if (!payload.playerId || !payload.handZoneId || !payload.discardZoneId || payload.keepCount === undefined) {
      throw new Error(`Scheduled action ${action.id} has an invalid auto-discard payload`);
    }

    const handZone = match.state.zones[payload.handZoneId];
    if (!handZone) {
      throw new Error(`Auto-discard hand zone ${payload.handZoneId} does not exist`);
    }

    if (handZone.ownerId !== payload.playerId) {
      throw new Error(`Auto-discard zone ${payload.handZoneId} does not belong to ${payload.playerId}`);
    }

    if (!match.state.zones[payload.discardZoneId]) {
      throw new Error(`Auto-discard target zone ${payload.discardZoneId} does not exist`);
    }

    const surplus = handZone.objectIds.length - payload.keepCount;
    if (surplus <= 0) {
      return undefined;
    }

    const objectIds = handZone.objectIds.slice(-surplus);
    const events = objectIds.map((objectId) =>
      this.appendServiceEvent(
        match,
        "card_moved",
        {
          objectId,
          fromZoneId: payload.handZoneId,
          toZoneId: payload.discardZoneId
        },
        action.command.id
      )
    );
    this.commitServiceEvents(match, events);
    return match;
  }

  private appendServiceEvent<TPayload>(
    match: StoredMatch,
    type: string,
    payload: TPayload,
    commandId: string
  ): MatchEvent<TPayload> {
    const event: MatchEvent<TPayload> = {
      id: `evt_${match.state.lastSequence + 1}`,
      matchId: match.id,
      sequence: match.state.lastSequence + 1,
      transactionId: `tx_${commandId}`,
      type,
      payload,
      visibility: {
        default: {
          kind: "public"
        }
      },
      causedBy: {
        commandId
      }
    };

    match.state = reduceEvent(match.state, event);
    assertStateInvariants(match.state);
    match.events.push(event);
    return event;
  }

  private commitServiceEvents(match: StoredMatch, events: MatchEvent[]): void {
    if (events.length === 0) {
      return;
    }

    this.publish(match.id, events);
    match.snapshots.push({ sequence: match.state.lastSequence, state: structuredClone(match.state) });
  }

  private appendIdentityOutcomeIfComplete(match: StoredMatch, commandId: string): MatchEvent | undefined {
    if (match.rulesetId !== "sample-identity" || match.state.status === "completed" || match.state.outcomes.some((outcome) => outcome.status === "completed")) {
      return undefined;
    }

    const outcome = evaluateIdentityOutcome(match.state);
    if (!outcome) {
      return undefined;
    }

    const event: MatchEvent = {
      id: `evt_${match.state.lastSequence + 1}`,
      matchId: match.id,
      sequence: match.state.lastSequence + 1,
      transactionId: `tx_${commandId}`,
      type: "outcome_declared",
      payload: { outcome },
      visibility: {
        default: {
          kind: "public"
        }
      },
      causedBy: {
        commandId
      }
    };

    match.state = reduceEvent(match.state, event);
    assertStateInvariants(match.state);
    match.events.push(event);
    return event;
  }

  private publish(matchId: string, events: MatchEvent[]): void {
    const listeners = this.subscribers.get(matchId);
    if (!listeners || events.length === 0) {
      return;
    }

    for (const listener of listeners) {
      listener(events.map((event) => structuredClone(event)));
    }
  }

  reconnect(matchId: string, viewer: ViewerContext, lastSequence = 0): { state: MatchState; events: MatchEvent[] } {
    const match = this.matches.get(matchId);

    if (!match) {
      throw new Error(`Match ${matchId} does not exist`);
    }

    return {
      state: projectState(match.state, viewer),
      events: match.events
        .filter((event) => event.sequence > lastSequence)
        .map((event) => projectEvent(event, match.state, viewer))
        .filter((event): event is MatchEvent => event !== null)
    };
  }
}
