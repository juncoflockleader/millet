import type {
  BehaviorLibrary,
  ContentLock,
  MatchEvent,
  MatchState,
  OutcomeState,
  PhaseGraphDefinition,
  ResolutionContext
} from "../../engine-core/src/index.ts";
import { createSampleDuelSetupEvents, sampleDuelBehaviors, sampleDuelPhaseGraph } from "../../rulesets/sample-duel/sample-duel.ts";
import {
  createSampleIdentitySetupEvents,
  evaluateIdentityOutcome,
  sampleIdentityBehaviors,
  sampleIdentityPhaseGraph
} from "../../rulesets/sample-identity/sample-identity.ts";
import {
  createSampleBasicTrioSetupEvents,
  sampleBasicTrioBehaviors,
  sampleBasicTrioPhaseGraph,
  type BasicTrioClassId
} from "../../rulesets/sample-basic-trio/sample-basic-trio.ts";
import {
  createSampleManaClashSetupEvents,
  sampleManaClashBehaviors,
  sampleManaClashPhaseGraph
} from "../../rulesets/sample-mana-clash/sample-mana-clash.ts";
import { createSampleRuneDuelSetupEvents, sampleRuneDuelBehaviors, sampleRuneDuelPhaseGraph } from "../../rulesets/sample-rune-duel/sample-rune-duel.ts";

export const REGISTERED_RULESET_IDS = ["sample-duel", "sample-identity", "sample-rune-duel", "sample-basic-trio", "sample-mana-clash"] as const;
export type RegisteredRulesetId = typeof REGISTERED_RULESET_IDS[number];

export interface RegisteredRuleset {
  id: RegisteredRulesetId;
  dir: string;
  behaviorLibrary: BehaviorLibrary;
  phaseGraph?: PhaseGraphDefinition;
  createSetupEvents: (options: RegisteredRulesetSetupOptions) => MatchEvent[];
  shouldRunPhaseOnCreate?: (options: RegisteredRulesetSetupOptions) => boolean;
  resolution: Pick<ResolutionContext, "outcomeMode" | "deathMode" | "dyingPrompt">;
  beforeEndTurnPhase?: string;
  evaluateOutcome?: (state: MatchState) => OutcomeState | undefined;
}

export interface RegisteredRulesetSetupOptions {
  contentLock?: ContentLock;
  playerCount?: 6 | 8;
  demoDuel?: boolean;
  p1Class?: BasicTrioClassId;
  p2Class?: BasicTrioClassId;
}

export const REGISTERED_RULESETS: Record<RegisteredRulesetId, RegisteredRuleset> = {
  "sample-duel": {
    id: "sample-duel",
    dir: "packages/rulesets/sample-duel",
    behaviorLibrary: sampleDuelBehaviors,
    phaseGraph: sampleDuelPhaseGraph,
    createSetupEvents: (options) =>
      createSampleDuelSetupEvents({
        contentLock: options.contentLock,
        ...(options.demoDuel
          ? {
              p1Health: 10,
              p2Health: 10,
              p1Mana: 10,
              p2Mana: 10,
              mirrorP2Hand: true
            }
          : {})
      }),
    shouldRunPhaseOnCreate: (options) => options.demoDuel === true,
    resolution: {
      outcomeMode: "last_alive",
      deathMode: "direct"
    }
  },
  "sample-identity": {
    id: "sample-identity",
    dir: "packages/rulesets/sample-identity",
    behaviorLibrary: sampleIdentityBehaviors,
    phaseGraph: sampleIdentityPhaseGraph,
    createSetupEvents: (options) =>
      createSampleIdentitySetupEvents({
        playerCount: options.playerCount ?? 6,
        contentLock: options.contentLock
      }),
    resolution: {
      outcomeMode: "none",
      deathMode: "dying",
      dyingPrompt: { onPassBehavior: "finish_dying" }
    },
    beforeEndTurnPhase: "discard",
    evaluateOutcome: evaluateIdentityOutcome
  },
  "sample-rune-duel": {
    id: "sample-rune-duel",
    dir: "packages/rulesets/sample-rune-duel",
    behaviorLibrary: sampleRuneDuelBehaviors,
    phaseGraph: sampleRuneDuelPhaseGraph,
    createSetupEvents: (options) =>
      createSampleRuneDuelSetupEvents({
        contentLock: options.contentLock,
        ...(options.demoDuel
          ? {
              p1Health: 12,
              p2Health: 12,
              p1Mana: 4,
              p2Mana: 4,
              mirrorP2Hand: true
            }
          : {})
      }),
    shouldRunPhaseOnCreate: (options) => options.demoDuel === true,
    resolution: {
      outcomeMode: "last_alive",
      deathMode: "direct"
    }
  },
  "sample-basic-trio": {
    id: "sample-basic-trio",
    dir: "packages/rulesets/sample-basic-trio",
    behaviorLibrary: sampleBasicTrioBehaviors,
    phaseGraph: sampleBasicTrioPhaseGraph,
    createSetupEvents: (options) =>
      createSampleBasicTrioSetupEvents({
        contentLock: options.contentLock,
        p1Class: options.p1Class,
        p2Class: options.p2Class,
        ...(options.demoDuel
          ? {
              p1Health: 30,
              p2Health: 30,
              p1Mana: 10,
              p2Mana: 10
            }
          : {})
      }),
    shouldRunPhaseOnCreate: (options) => options.demoDuel === true,
    resolution: {
      outcomeMode: "last_alive",
      deathMode: "direct"
    }
  },
  "sample-mana-clash": {
    id: "sample-mana-clash",
    dir: "packages/rulesets/sample-mana-clash",
    behaviorLibrary: sampleManaClashBehaviors,
    phaseGraph: sampleManaClashPhaseGraph,
    createSetupEvents: (options) =>
      createSampleManaClashSetupEvents({
        contentLock: options.contentLock,
        ...(options.demoDuel
          ? {
              p1Health: 20,
              p2Health: 20,
              p1Mana: 0,
              p2Mana: 0,
              mirrorP2Hand: true
            }
          : {})
      }),
    shouldRunPhaseOnCreate: (options) => options.demoDuel === true,
    resolution: {
      outcomeMode: "last_alive",
      deathMode: "direct"
    }
  }
};

export function isRegisteredRulesetId(value: string | undefined): value is RegisteredRulesetId {
  return REGISTERED_RULESET_IDS.includes(value as RegisteredRulesetId);
}

export function registeredRuleset(value: string): RegisteredRuleset {
  if (!isRegisteredRulesetId(value)) {
    throw new Error(`Unknown ruleset ${value}`);
  }
  return REGISTERED_RULESETS[value];
}
