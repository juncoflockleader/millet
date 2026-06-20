import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createEmptyMatchState,
  reduceEvent,
  type MatchEvent,
  type MatchState
} from "../../engine-core/src/index.ts";
import { verifyMatchContentLock, type BundleStore } from "../../content-build/src/store.ts";
import type { StoredMatch } from "./match-service.ts";
import { registeredRuleset } from "./ruleset-registry.ts";
import type { ScheduledAction } from "./scheduler.ts";

export interface FileMatchStoreOptions {
  bundleStore?: BundleStore;
  maxSnapshots?: number;
}

export class FileMatchStore {
  readonly rootDir: string;
  private readonly bundleStore?: BundleStore;
  private readonly maxSnapshots?: number;

  constructor(rootDir: string, options: FileMatchStoreOptions = {}) {
    this.rootDir = rootDir;
    this.bundleStore = options.bundleStore;
    this.maxSnapshots = options.maxSnapshots;
    mkdirSync(rootDir, { recursive: true });
  }

  save(match: StoredMatch): void {
    const dir = join(this.rootDir, match.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "match.json"),
      JSON.stringify(
        {
          id: match.id,
          rulesetId: match.rulesetId
        },
        null,
        2
      )
    );
    writeFileSync(join(dir, "events.json"), JSON.stringify(match.events, null, 2));
    writeFileSync(join(dir, "snapshots.json"), JSON.stringify(this.retainedSnapshots(match.snapshots), null, 2));
  }

  load(matchId: string): StoredMatch {
    const dir = join(this.rootDir, matchId);
    const metadata = JSON.parse(readFileSync(join(dir, "match.json"), "utf8")) as Pick<StoredMatch, "id" | "rulesetId">;
    const events = JSON.parse(readFileSync(join(dir, "events.json"), "utf8")) as MatchEvent[];
    const snapshots = JSON.parse(readFileSync(join(dir, "snapshots.json"), "utf8")) as { sequence: number; state: MatchState }[];
    const state = events.reduce((current, event) => reduceEvent(current, event), createEmptyMatchState());

    if (this.bundleStore) {
      verifyMatchContentLock(state, this.bundleStore);
    }

    return {
      id: metadata.id,
      rulesetId: metadata.rulesetId,
      state,
      events,
      snapshots,
      behaviorLibrary: registeredRuleset(metadata.rulesetId).behaviorLibrary
    };
  }

  private retainedSnapshots(snapshots: StoredMatch["snapshots"]): StoredMatch["snapshots"] {
    if (this.maxSnapshots === undefined) {
      return snapshots;
    }

    if (!Number.isInteger(this.maxSnapshots) || this.maxSnapshots < 1) {
      throw new Error(`maxSnapshots must be a positive integer, got ${String(this.maxSnapshots)}`);
    }

    return snapshots.slice(-this.maxSnapshots);
  }
}

export class FileScheduledActionStore {
  readonly rootDir: string;
  private readonly filePath: string;
  private readonly maxActions?: number;

  constructor(rootDir: string, options: { maxActions?: number } = {}) {
    this.rootDir = rootDir;
    this.filePath = join(rootDir, "scheduled-actions.json");
    this.maxActions = options.maxActions;
    mkdirSync(rootDir, { recursive: true });
  }

  save(actions: readonly ScheduledAction[]): void {
    writeFileSync(this.filePath, JSON.stringify(this.retainedActions(actions), null, 2));
  }

  load(): ScheduledAction[] {
    if (!existsSync(this.filePath)) {
      return [];
    }

    return JSON.parse(readFileSync(this.filePath, "utf8")) as ScheduledAction[];
  }

  private retainedActions(actions: readonly ScheduledAction[]): ScheduledAction[] {
    if (this.maxActions === undefined) {
      return [...actions];
    }

    if (!Number.isInteger(this.maxActions) || this.maxActions < 1) {
      throw new Error(`maxActions must be a positive integer, got ${String(this.maxActions)}`);
    }

    return [...actions]
      .sort((left, right) => {
        if (left.dueAtMs !== right.dueAtMs) {
          return left.dueAtMs - right.dueAtMs;
        }

        return left.id.localeCompare(right.id);
      })
      .slice(-this.maxActions);
  }
}
