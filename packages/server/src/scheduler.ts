import type { MatchCommand } from "../../engine-core/src/index.ts";

export type ScheduledActionGuard =
  | {
      type: "prompt_open";
      promptId: string;
      responderId?: string;
      openedAtSequence?: number;
    }
  | {
      type: "active_turn";
      activePlayerId: string;
      turnNumber: number;
      phaseId?: string;
    }
  | {
      type: "player_status";
      playerId: string;
      status: string;
    }
  | {
      type: "zone_over_limit";
      zoneId: string;
      limit: number;
    };

export interface ScheduledAction {
  id: string;
  matchId: string;
  dueAtMs: number;
  command: MatchCommand;
  guard?: ScheduledActionGuard;
  status: "scheduled" | "fired" | "cancelled";
}

export class DeterministicScheduler {
  private readonly actions = new Map<string, ScheduledAction>();

  constructor(actions: readonly ScheduledAction[] = []) {
    for (const action of actions) {
      if (this.actions.has(action.id)) {
        throw new Error(`Scheduled action ${action.id} already exists`);
      }

      this.actions.set(action.id, structuredClone(action));
    }
  }

  schedule(action: Omit<ScheduledAction, "status">): ScheduledAction {
    if (this.actions.has(action.id)) {
      throw new Error(`Scheduled action ${action.id} already exists`);
    }

    const scheduled: ScheduledAction = {
      ...structuredClone(action),
      status: "scheduled"
    };
    this.actions.set(scheduled.id, scheduled);
    return scheduled;
  }

  cancel(id: string): void {
    const action = this.actions.get(id);
    if (action && action.status === "scheduled") {
      action.status = "cancelled";
    }
  }

  due(nowMs: number): ScheduledAction[] {
    return [...this.actions.values()]
      .filter((action) => action.status === "scheduled" && action.dueAtMs <= nowMs)
      .sort((left, right) => {
        if (left.dueAtMs !== right.dueAtMs) {
          return left.dueAtMs - right.dueAtMs;
        }

        return left.id.localeCompare(right.id);
      });
  }

  markFired(id: string): void {
    const action = this.actions.get(id);
    if (!action) {
      throw new Error(`Scheduled action ${id} does not exist`);
    }

    action.status = "fired";
  }

  all(): ScheduledAction[] {
    return [...this.actions.values()].map((action) => structuredClone(action));
  }
}
