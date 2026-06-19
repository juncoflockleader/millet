import type { BuiltBundle } from "./build.ts";

export type BundleState = "draft" | "validated" | "playtest" | "published" | "deprecated" | "rolled_back";

export interface RegistryEntry {
  id: string;
  version: string;
  contentHash: string;
  state: BundleState;
  bundle: BuiltBundle;
  previousHash?: string;
}

export class ContentRegistry {
  private readonly entries = new Map<string, RegistryEntry>();

  addDraft(bundle: BuiltBundle): RegistryEntry {
    return this.add(bundle, "draft");
  }

  validate(bundle: BuiltBundle): RegistryEntry {
    if (bundle.issues.some((issue) => issue.severity === "error")) {
      throw new Error(`Bundle ${bundle.id}@${bundle.version} has validation errors`);
    }

    return this.add(bundle, "validated");
  }

  publish(bundle: BuiltBundle): RegistryEntry {
    if (bundle.issues.some((issue) => issue.severity === "error")) {
      throw new Error(`Cannot publish invalid bundle ${bundle.id}@${bundle.version}`);
    }

    const warnings = bundle.issues.filter((issue) => issue.severity === "warning");
    if (warnings.length > 0) {
      throw new Error(`Cannot publish bundle ${bundle.id}@${bundle.version} with validation warnings`);
    }

    const existingPublished = this.findPublished(bundle.id);
    if (existingPublished) {
      existingPublished.state = "deprecated";
    }

    return this.add(bundle, "published", existingPublished?.contentHash);
  }

  rollback(id: string, targetHash: string): RegistryEntry {
    const target = this.entries.get(targetHash);

    if (!target || target.id !== id) {
      throw new Error(`Cannot roll back ${id}; target ${targetHash} is missing`);
    }

    const current = this.findPublished(id);
    if (current) {
      current.state = "rolled_back";
    }

    const restored: RegistryEntry = {
      ...target,
      state: "published",
      previousHash: current?.contentHash
    };
    this.entries.set(restored.contentHash, restored);
    return structuredClone(restored);
  }

  get(contentHash: string): RegistryEntry | undefined {
    const entry = this.entries.get(contentHash);
    return entry ? structuredClone(entry) : undefined;
  }

  list(): RegistryEntry[] {
    return [...this.entries.values()].map((entry) => structuredClone(entry));
  }

  private add(bundle: BuiltBundle, state: BundleState, previousHash?: string): RegistryEntry {
    const existing = this.entries.get(bundle.contentHash);
    if (existing && JSON.stringify(existing.bundle.files) !== JSON.stringify(bundle.files)) {
      throw new Error(`Content hash collision for ${bundle.contentHash}`);
    }

    const entry: RegistryEntry = {
      id: bundle.id,
      version: bundle.version,
      contentHash: bundle.contentHash,
      state,
      bundle: structuredClone(bundle),
      previousHash
    };
    this.entries.set(entry.contentHash, entry);
    return structuredClone(entry);
  }

  private findPublished(id: string): RegistryEntry | undefined {
    return [...this.entries.values()].find((entry) => entry.id === id && entry.state === "published");
  }
}
