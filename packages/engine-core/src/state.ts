import type { MatchState } from "./types.ts";

export function createEmptyMatchState(): MatchState {
  return {
    matchId: "",
    gameDefinitionId: "",
    gameDefinitionVersion: "",
    seed: "",
    rngCursor: 0,
    status: "setup",
    players: {},
    seats: [],
    objects: {},
    zones: {},
    turn: {
      turnNumber: 0,
      roundNumber: 0
    },
    prompts: {},
    triggers: [],
    outcomes: [],
    counters: {
      objectSequence: 0,
      transactionSequence: 0
    },
    lastSequence: 0
  };
}

export function cloneMatchState(state: MatchState): MatchState {
  return structuredClone(state);
}
