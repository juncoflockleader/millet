import { resolveCommand, type BehaviorLibrary } from "./behavior.ts";
import { reduceEvent } from "./reducer.ts";
import type { MatchCommand, MatchEvent, MatchState, ResourceChangedPayload, TurnAdvancedPayload } from "./types.ts";

export function nextAliveSeat(state: MatchState, currentSeatId: string): string | undefined {
  const orderedSeats = [...state.seats].sort((left, right) => left.index - right.index);
  const startIndex = orderedSeats.findIndex((seat) => seat.id === currentSeatId);

  if (startIndex === -1 || orderedSeats.length === 0) {
    return undefined;
  }

  for (let offset = 1; offset <= orderedSeats.length; offset += 1) {
    const seat = orderedSeats[(startIndex + offset) % orderedSeats.length]!;
    const player = seat.playerId ? state.players[seat.playerId] : undefined;

    if (player?.status === "alive") {
      return seat.id;
    }
  }

  return undefined;
}

export function seatDistance(state: MatchState, fromSeatId: string, toSeatId: string): number {
  if (fromSeatId === toSeatId) {
    return 0;
  }

  const aliveSeats = [...state.seats]
    .sort((left, right) => left.index - right.index)
    .filter((seat) => {
      const player = seat.playerId ? state.players[seat.playerId] : undefined;
      return player?.status === "alive";
    });

  const fromIndex = aliveSeats.findIndex((seat) => seat.id === fromSeatId);
  const toIndex = aliveSeats.findIndex((seat) => seat.id === toSeatId);

  if (fromIndex === -1 || toIndex === -1) {
    return Number.POSITIVE_INFINITY;
  }

  const clockwise = (toIndex - fromIndex + aliveSeats.length) % aliveSeats.length;
  const counterClockwise = (fromIndex - toIndex + aliveSeats.length) % aliveSeats.length;
  return Math.min(clockwise, counterClockwise);
}

export function canReachByRange(state: MatchState, fromPlayerId: string, toPlayerId: string, range: number): boolean {
  const from = state.players[fromPlayerId];
  const to = state.players[toPlayerId];

  if (!from || !to) {
    return false;
  }

  return effectiveSeatDistance(state, fromPlayerId, toPlayerId) <= range;
}

export function orderedAlivePlayersFrom(state: MatchState, playerId: string): string[] {
  const player = state.players[playerId];
  if (!player) {
    return [];
  }

  const orderedSeats = [...state.seats].sort((left, right) => left.index - right.index);
  const startIndex = orderedSeats.findIndex((seat) => seat.id === player.seatId);

  if (startIndex === -1) {
    return [];
  }

  const ordered: string[] = [];
  for (let offset = 0; offset < orderedSeats.length; offset += 1) {
    const seat = orderedSeats[(startIndex + offset) % orderedSeats.length]!;
    const candidate = seat.playerId ? state.players[seat.playerId] : undefined;
    if (candidate?.status === "alive") {
      ordered.push(candidate.id);
    }
  }

  return ordered;
}

export function effectiveAttackRange(state: MatchState, playerId: string, baseRange = 1): number {
  let range = baseRange;

  for (const zone of Object.values(state.zones)) {
    if (zone.ownerId !== playerId || zone.zoneType !== "equipment") {
      continue;
    }

    for (const objectId of zone.objectIds) {
      const object = state.objects[objectId];
      range += object?.stats.attackRangeModifier ?? 0;
    }
  }

  return Math.max(0, range);
}

export function effectiveSeatDistance(state: MatchState, fromPlayerId: string, toPlayerId: string): number {
  const from = state.players[fromPlayerId];
  const to = state.players[toPlayerId];

  if (!from || !to) {
    return Number.POSITIVE_INFINITY;
  }

  const baseDistance = seatDistance(state, from.seatId, to.seatId);
  if (!Number.isFinite(baseDistance)) {
    return baseDistance;
  }

  return Math.max(
    0,
    baseDistance +
      equipmentStatTotal(state, fromPlayerId, "outgoingDistanceModifier") +
      equipmentStatTotal(state, toPlayerId, "incomingDistanceModifier")
  );
}

export function canReachByEffectiveRange(state: MatchState, fromPlayerId: string, toPlayerId: string, baseRange = 1): boolean {
  return canReachByRange(state, fromPlayerId, toPlayerId, effectiveAttackRange(state, fromPlayerId, baseRange));
}

function equipmentStatTotal(state: MatchState, playerId: string, stat: string): number {
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

export function advanceTurnToNextAlive(state: MatchState, currentPlayerId: string): { state: MatchState; event: MatchEvent<TurnAdvancedPayload> } {
  const currentPlayer = state.players[currentPlayerId];

  if (!currentPlayer) {
    throw new Error(`Cannot advance from missing player ${currentPlayerId}`);
  }

  const nextSeatId = nextAliveSeat(state, currentPlayer.seatId);
  const nextSeat = nextSeatId ? state.seats.find((seat) => seat.id === nextSeatId) : undefined;
  const activePlayerId = nextSeat?.playerId;

  if (!activePlayerId) {
    throw new Error(`No next alive player after ${currentPlayerId}`);
  }

  const event: MatchEvent<TurnAdvancedPayload> = {
    id: `evt_${state.lastSequence + 1}`,
    matchId: state.matchId,
    sequence: state.lastSequence + 1,
    transactionId: `tx_turn_${state.lastSequence + 1}`,
    type: "turn_advanced",
    payload: {
      previousPlayerId: currentPlayerId,
      activePlayerId,
      turnNumber: state.turn.turnNumber + 1,
      roundNumber: activePlayerId === state.seats[0]?.playerId ? state.turn.roundNumber + 1 : state.turn.roundNumber
    },
    visibility: {
      default: {
        kind: "public"
      }
    }
  };

  return {
    state: reduceEvent(state, event),
    event
  };
}

export interface PhaseDefinition {
  id: string;
  entryBehaviors?: string[];
  actionWindow?: boolean;
  skipResource?: string;
  insertAfter?: {
    resource: string;
    phaseId: string;
    consume?: boolean;
  };
  next?: string;
}

export interface PhaseGraphDefinition {
  start: string;
  phases: PhaseDefinition[];
}

export interface PhaseRunContext {
  behaviorLibrary: BehaviorLibrary;
  activePlayerId: string;
  outcomeMode?: "none" | "last_alive";
  deathMode?: "direct" | "dying";
}

export interface PhaseRunResult {
  state: MatchState;
  events: MatchEvent[];
  stoppedAtActionWindow: boolean;
}

function emitPhaseEvent(state: MatchState, transactionId: string, type: string, payload: unknown): { state: MatchState; event: MatchEvent } {
  const event: MatchEvent = {
    id: `evt_${state.lastSequence + 1}`,
    matchId: state.matchId,
    sequence: state.lastSequence + 1,
    transactionId,
    type,
    payload,
    visibility: {
      default: {
        kind: "public"
      }
    }
  };

  return {
    state: reduceEvent(state, event),
    event
  };
}

export function runPhaseGraph(
  initialState: MatchState,
  graph: PhaseGraphDefinition,
  context: PhaseRunContext,
  options: { fromPhaseId?: string; maxTransitions?: number } = {}
): PhaseRunResult {
  const phaseById = new Map(graph.phases.map((phase) => [phase.id, phase]));
  const events: MatchEvent[] = [];
  let state = structuredClone(initialState);
  let phaseId = options.fromPhaseId ?? state.turn.phaseId ?? graph.start;
  const maxTransitions = options.maxTransitions ?? graph.phases.length * 2;

  for (let transitionCount = 0; transitionCount < maxTransitions; transitionCount += 1) {
    const phase = phaseById.get(phaseId);

    if (!phase) {
      throw new Error(`Unknown phase ${phaseId}`);
    }

    if (phase.skipResource) {
      const player = state.players[context.activePlayerId];
      const resource = player?.resources[phase.skipResource];

      if ((resource?.current ?? 0) > 0) {
        const skipped = emitPhaseEvent(state, `tx_phase_${state.lastSequence + 1}`, "resource_changed", {
          playerId: context.activePlayerId,
          resource: phase.skipResource,
          current: resource!.current - 1,
          max: resource!.max,
          reason: `skip_phase:${phase.id}`
        } satisfies ResourceChangedPayload);
        state = skipped.state;
        events.push(skipped.event);

        if (!phase.next) {
          return {
            state,
            events,
            stoppedAtActionWindow: false
          };
        }

        phaseId = phase.next;
        continue;
      }
    }

    const entered = emitPhaseEvent(state, `tx_phase_${state.lastSequence + 1}`, "phase_entered", {
      phaseId,
      activePlayerId: context.activePlayerId
    });
    state = entered.state;
    state.turn.phaseId = phaseId;
    state.turn.activePlayerId = context.activePlayerId;
    events.push(entered.event);

    for (const behaviorId of phase.entryBehaviors ?? []) {
      const command: MatchCommand = {
        id: `cmd_phase_${state.lastSequence + 1}_${behaviorId}`,
        matchId: state.matchId,
        playerId: context.activePlayerId,
        type: "execute_behavior",
        payload: {
          behaviorId
        }
      };
      const result = resolveCommand(state, command, {
        behaviorLibrary: context.behaviorLibrary,
        outcomeMode: context.outcomeMode,
        deathMode: context.deathMode
      });
      state = result.state;
      events.push(...result.events);
    }

    if (phase.actionWindow) {
      return {
        state,
        events,
        stoppedAtActionWindow: true
      };
    }

    if (phase.insertAfter) {
      const player = state.players[context.activePlayerId];
      const resource = player?.resources[phase.insertAfter.resource];

      if ((resource?.current ?? 0) > 0) {
        if (phase.insertAfter.consume !== false) {
          const consumed = emitPhaseEvent(state, `tx_phase_${state.lastSequence + 1}`, "resource_changed", {
            playerId: context.activePlayerId,
            resource: phase.insertAfter.resource,
            current: resource!.current - 1,
            max: resource!.max,
            reason: `insert_phase:${phase.id}:${phase.insertAfter.phaseId}`
          } satisfies ResourceChangedPayload);
          state = consumed.state;
          events.push(consumed.event);
        }

        phaseId = phase.insertAfter.phaseId;
        continue;
      }
    }

    if (!phase.next) {
      return {
        state,
        events,
        stoppedAtActionWindow: false
      };
    }

    phaseId = phase.next;
  }

  throw new Error(`Phase graph exceeded max transitions ${maxTransitions}`);
}
