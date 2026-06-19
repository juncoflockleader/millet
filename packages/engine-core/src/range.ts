import type { MatchState } from "./types.ts";

export function selectorSeatDistance(state: MatchState, fromSeatId: string, toSeatId: string): number {
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

export function selectorEffectiveAttackRange(state: MatchState, playerId: string, baseRange = 1): number {
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

export function selectorCanReachByEffectiveRange(state: MatchState, fromPlayerId: string, toPlayerId: string, baseRange = 1): boolean {
  const from = state.players[fromPlayerId];
  const to = state.players[toPlayerId];

  if (!from || !to) {
    return false;
  }

  return selectorEffectiveSeatDistance(state, fromPlayerId, toPlayerId) <= selectorEffectiveAttackRange(state, fromPlayerId, baseRange);
}

export function selectorEffectiveSeatDistance(state: MatchState, fromPlayerId: string, toPlayerId: string): number {
  const from = state.players[fromPlayerId];
  const to = state.players[toPlayerId];

  if (!from || !to) {
    return Number.POSITIVE_INFINITY;
  }

  const baseDistance = selectorSeatDistance(state, from.seatId, to.seatId);
  if (!Number.isFinite(baseDistance)) {
    return baseDistance;
  }

  return Math.max(
    0,
    baseDistance +
      selectorEquipmentStatTotal(state, fromPlayerId, "outgoingDistanceModifier") +
      selectorEquipmentStatTotal(state, toPlayerId, "incomingDistanceModifier")
  );
}

function selectorEquipmentStatTotal(state: MatchState, playerId: string, stat: string): number {
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
