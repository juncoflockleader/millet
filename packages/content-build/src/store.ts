import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { BundleRef, ContentLock, MatchState } from "../../engine-core/src/index.ts";
import type { BuiltBundle } from "./build.ts";

export interface BundleStore {
  get(contentHash: string): BuiltBundle | undefined;
}

export class MissingContentBundleError extends Error {
  readonly contentHash: string;

  constructor(ref: BundleRef) {
    super(`Missing content bundle ${ref.id}@${ref.version} (${ref.contentHash})`);
    this.name = "MissingContentBundleError";
    this.contentHash = ref.contentHash;
  }
}

export class FileBundleStore implements BundleStore {
  readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
    mkdirSync(rootDir, { recursive: true });
  }

  put(bundle: BuiltBundle): BuiltBundle {
    const path = this.pathFor(bundle.contentHash);

    if (existsSync(path)) {
      const existing = this.require(bundle.contentHash);
      if (JSON.stringify(existing.files) !== JSON.stringify(bundle.files)) {
        throw new Error(`Content hash collision for ${bundle.contentHash}`);
      }

      return existing;
    }

    writeFileSync(path, JSON.stringify(bundle, null, 2));
    return structuredClone(bundle);
  }

  get(contentHash: string): BuiltBundle | undefined {
    const path = this.pathFor(contentHash);
    if (!existsSync(path)) {
      return undefined;
    }

    return JSON.parse(readFileSync(path, "utf8")) as BuiltBundle;
  }

  require(contentHash: string): BuiltBundle {
    const bundle = this.get(contentHash);
    if (!bundle) {
      throw new Error(`Bundle ${contentHash} is not available in ${this.rootDir}`);
    }

    return bundle;
  }

  list(): BuiltBundle[] {
    return readdirSync(this.rootDir)
      .filter((entry) => entry.endsWith(".json"))
      .sort()
      .map((entry) => JSON.parse(readFileSync(join(this.rootDir, entry), "utf8")) as BuiltBundle);
  }

  private pathFor(contentHash: string): string {
    return join(this.rootDir, `${encodeURIComponent(contentHash)}.json`);
  }
}

export function refsFromContentLock(contentLock: ContentLock): BundleRef[] {
  const refs = [
    contentLock.gameDefinition,
    contentLock.cardCatalog,
    contentLock.behaviorLibrary,
    contentLock.assetBundle,
    contentLock.localizationBundle
  ].filter((ref): ref is BundleRef => Boolean(ref));

  return [...new Map(refs.map((ref) => [ref.contentHash, ref])).values()];
}

export function verifyContentLock(contentLock: ContentLock | undefined, store: BundleStore): void {
  if (!contentLock) {
    throw new Error("Match has no content lock");
  }

  for (const ref of refsFromContentLock(contentLock)) {
    const bundle = store.get(ref.contentHash);

    if (!bundle) {
      throw new MissingContentBundleError(ref);
    }

    if (bundle.id !== ref.id || bundle.version !== ref.version || bundle.contentHash !== ref.contentHash) {
      throw new Error(
        `Content lock mismatch for ${ref.id}@${ref.version}: expected ${ref.contentHash}, got ${bundle.id}@${bundle.version} ${bundle.contentHash}`
      );
    }
  }
}

export function verifyMatchContentLock(state: MatchState, store: BundleStore): void {
  verifyContentLock(state.contentLock, store);
}
