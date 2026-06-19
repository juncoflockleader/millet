import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildRulesetBundle, contentLockFromBundle, validateRulesetDir } from "./build.ts";
import { createRulesetDependencyReport } from "./dependencies.ts";
import { buildReviewedBehaviorArtifact, createBehaviorDraft, reviewBehaviorDraft } from "./draft-workflow.ts";
import { ContentRegistry } from "./registry.ts";
import { FileBundleStore, MissingContentBundleError, verifyContentLock } from "./store.ts";
import { generateCanonicalText, generateUxHints, validateBehaviorTemplates, validateBehaviorText } from "./text-sync.ts";
import { sampleDuelBehaviors } from "../../rulesets/sample-duel/sample-duel.ts";

test("validates and hashes sample ruleset bundles", () => {
  const duel = buildRulesetBundle("packages/rulesets/sample-duel");
  const identity = buildRulesetBundle("packages/rulesets/sample-identity");

  assert.equal(duel.id, "sample-duel");
  assert.equal(identity.id, "sample-identity");
  assert.ok(duel.contentHash.startsWith("sha256:"));
  assert.ok(identity.contentHash.startsWith("sha256:"));
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-duel").filter((issue) => issue.severity === "error"), []);
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-identity").filter((issue) => issue.severity === "error"), []);
});

test("ruleset validation rejects behavior manifest mismatches", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-invalid-ruleset-"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [],
      behaviors: ["listed_in_game_only"]
    })
  );
  writeFileSync(
    join(dir, "behaviors.json"),
    JSON.stringify({
      id: "invalid-ruleset-behaviors",
      version: "0.1.0",
      behaviors: ["listed_in_manifest_only"]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");
  assert.ok(errors.some((issue) => issue.message.includes("listed_in_game_only")));
  assert.ok(errors.some((issue) => issue.message.includes("listed_in_manifest_only")));
});

test("ruleset validation reports schema path errors", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-schema-invalid-ruleset-"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-schema-ruleset",
      version: 1,
      metadata: {},
      playerConfig: {},
      zones: [{ id: "", zoneType: "hand", scope: "player" }],
      unexpected: true
    })
  );
  writeFileSync(
    join(dir, "asset-manifest.json"),
    JSON.stringify({
      id: "invalid-assets",
      version: "0.1.0",
      assets: [{}]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");
  assert.ok(errors.some((issue) => issue.message.includes("Schema $.version: expected string")));
  assert.ok(errors.some((issue) => issue.message.includes("Schema $.zones[0].id: expected length at least 1")));
  assert.ok(errors.some((issue) => issue.message.includes("Schema $.unexpected: additional property is not allowed")));
  assert.ok(errors.some((issue) => issue.message.includes("Schema $.assets[0]: missing required property assetId")));
});

test("ruleset validation rejects malformed localization placeholders", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-localization-invalid-ruleset-"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-localization-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }]
    })
  );
  writeFileSync(
    join(dir, "localization.json"),
    JSON.stringify({
      id: "invalid-localization",
      version: "0.1.0",
      locale: "en",
      strings: {
        ok: "Draw {count} cards.",
        bad: "Hello {player",
        alsoBad: "Damage {2}."
      }
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");
  assert.ok(errors.some((issue) => issue.message.includes("Localization string bad has malformed placeholder syntax")));
  assert.ok(errors.some((issue) => issue.message.includes("Localization string alsoBad has malformed placeholder syntax")));
  assert.equal(errors.some((issue) => issue.message.includes("Localization string ok")), false);
});

test("ruleset validation rejects incompatible asset metadata", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-asset-invalid-ruleset-"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-asset-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }]
    })
  );
  writeFileSync(
    join(dir, "asset-manifest.json"),
    JSON.stringify({
      id: "invalid-assets",
      version: "0.1.0",
      assets: [
        {
          assetId: "remote-card",
          version: "0.1.0",
          kind: "card_art",
          contentHash: "sha256:not-a-real-hash",
          sourceUri: "ftp://example.invalid/card.png",
          license: "unknown",
          owner: "nobody",
          mediaType: "application/octet-stream",
          width: 32,
          height: 9000
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");
  assert.ok(errors.some((issue) => issue.message.includes("remote-card contentHash must be sha256 plus 64 lowercase hex characters")));
  assert.ok(errors.some((issue) => issue.message.includes("remote-card sourceUri scheme ftp: is not allowed")));
  assert.ok(errors.some((issue) => issue.message.includes("remote-card license unknown is not in the approved license list")));
  assert.ok(errors.some((issue) => issue.message.includes("remote-card mediaType application/octet-stream is not allowed")));
  assert.ok(errors.some((issue) => issue.message.includes("remote-card width must be between 64 and 8192px")));
  assert.ok(errors.some((issue) => issue.message.includes("remote-card height must be between 64 and 8192px")));
});

test("ruleset validation rejects invalid card catalog references", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-card-catalog-invalid-ruleset-"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-catalog-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      cardCatalog: "card-catalog.json",
      behaviors: ["known_behavior"]
    })
  );
  writeFileSync(
    join(dir, "behaviors.json"),
    JSON.stringify({
      id: "invalid-catalog-behaviors",
      version: "0.1.0",
      behaviors: ["known_behavior"]
    })
  );
  writeFileSync(
    join(dir, "asset-manifest.json"),
    JSON.stringify({
      id: "invalid-catalog-assets",
      version: "0.1.0",
      assets: [
        {
          assetId: "known_asset",
          version: "0.1.0",
          kind: "card_frame",
          contentHash: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          sourceUri: "memory://invalid-catalog/known_asset",
          license: "first-party-dev",
          owner: "millet",
          mediaType: "image/png",
          width: 512,
          height: 768
        }
      ]
    })
  );
  writeFileSync(
    join(dir, "localization.json"),
    JSON.stringify({
      id: "invalid-catalog-en",
      version: "0.1.0",
      locale: "en",
      strings: {
        "card.known.name": "Known"
      }
    })
  );
  writeFileSync(
    join(dir, "card-catalog.json"),
    JSON.stringify({
      id: "invalid-catalog-cards",
      version: "0.1.0",
      templates: [
        {
          templateId: "known",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.known.name",
          behaviorIds: ["missing_behavior"],
          assetRefs: ["missing_asset"]
        },
        {
          templateId: "known",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.missing.name",
          behaviorIds: ["known_behavior"],
          assetRefs: ["known_asset"]
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate card template id known")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown behavior missing_behavior")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown asset missing_asset")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown localization key card.missing.name")));
});

test("ruleset dependency report summarizes files and content references", () => {
  const report = createRulesetDependencyReport(buildRulesetBundle("packages/rulesets/sample-duel"));

  assert.equal(report.id, "sample-duel");
  assert.ok(report.nodes.some((node) => node.id === "file:game-definition.json"));
  assert.ok(report.nodes.some((node) => node.id === "file:card-catalog.json"));
  assert.ok(report.nodes.some((node) => node.id === "card_template:firebolt"));
  assert.ok(report.nodes.some((node) => node.id === "behavior:firebolt"));
  assert.ok(report.nodes.some((node) => node.id === "zone:weapon"));
  assert.ok(report.nodes.some((node) => node.id === "asset:card-frame-default"));
  assert.ok(report.nodes.some((node) => node.id === "localization:prompt.mulligan"));
  assert.ok(report.edges.some((edge) => edge.from === "file:game-definition.json" && edge.to === "behavior:firebolt" && edge.kind === "references"));
  assert.ok(report.edges.some((edge) => edge.from === "file:behaviors.json" && edge.to === "behavior:firebolt" && edge.kind === "declares"));
  assert.ok(report.edges.some((edge) => edge.from === "file:card-catalog.json" && edge.to === "card_template:firebolt" && edge.kind === "declares"));
  assert.ok(report.edges.some((edge) => edge.from === "card_template:firebolt" && edge.to === "behavior:firebolt" && edge.kind === "references"));
  assert.ok(report.edges.some((edge) => edge.from === "card_template:firebolt" && edge.to === "asset:card-frame-default" && edge.kind === "references"));
});

test("generates behavior text and UX hints from behavior definitions", () => {
  const behavior = sampleDuelBehaviors.behaviors.firebolt!;

  assert.equal(generateCanonicalText(behavior), "Deal 3 damage. Move this card.");
  assert.deepEqual(validateBehaviorText(behavior), []);
  assert.deepEqual(generateUxHints(behavior).effects, ["deal_damage", "move_card"]);
});

test("validates prompt and log templates against projection-safe placeholders", () => {
  const behavior = {
    ...sampleDuelBehaviors.behaviors.firebolt!,
    text: {
      template: "Deal {amount} damage to {target}."
    },
    ux: {
      prompt: {
        title: "Choose {target}"
      },
      logTemplate: "{source} deals {amount} damage to {target}."
    }
  };

  assert.deepEqual(validateBehaviorText(behavior), []);
  assert.deepEqual(validateBehaviorTemplates(behavior), []);
});

test("rejects public prompt and log templates that reference hidden object fields", () => {
  const behavior = {
    ...sampleDuelBehaviors.behaviors.firebolt!,
    ux: {
      logTemplate: "{source} reveals {templateId} from {targetHand}."
    }
  };

  const issues = validateBehaviorTemplates(behavior);

  assert.ok(issues.some((issue) => issue.severity === "error" && issue.message.includes("{templateId}")));
  assert.ok(issues.some((issue) => issue.severity === "error" && issue.message.includes("{targetHand}")));
});

test("allows private-scoped UX templates to reference raw hidden placeholders", () => {
  const behavior = {
    ...sampleDuelBehaviors.behaviors.firebolt!,
    ux: {
      privateLogTemplate: "You played {templateId} from {sourceObjectId}."
    }
  };

  assert.deepEqual(validateBehaviorTemplates(behavior), []);
});

test("behavior draft workflow requires validation and manual review before artifact export", () => {
  const draft = createBehaviorDraft({
    id: "draft_firebolt",
    prose: "Deal damage to a chosen enemy.",
    proposedBehavior: sampleDuelBehaviors.behaviors.firebolt!,
    proposedText: "Deal {amount} damage to {target}.",
    source: "llm"
  });

  assert.equal(draft.status, "draft");
  assert.equal(draft.reviewRequired, true);
  assert.equal(draft.validationIssues.length, 0);
  assert.throws(() => buildReviewedBehaviorArtifact(draft), /without approval/);

  const approved = reviewBehaviorDraft(draft, {
    reviewerId: "designer_1",
    approved: true,
    notes: "AST and text reviewed."
  });
  const artifact = buildReviewedBehaviorArtifact(approved);

  assert.equal(artifact.reviewedText, "Deal {amount} damage to {target}.");
  assert.equal(artifact.behavior.text?.template, "Deal {amount} damage to {target}.");
  assert.equal(artifact.review.reviewerId, "designer_1");
  assert.equal(artifact.source, "llm");
  assert.ok(artifact.contentHash.startsWith("sha256:"));
  assert.equal("prose" in artifact, false);
});

test("behavior draft workflow blocks unsafe generated public text even after approval", () => {
  const draft = createBehaviorDraft({
    id: "draft_unsafe_firebolt",
    prose: "Reveal the exact hidden card template.",
    proposedBehavior: sampleDuelBehaviors.behaviors.firebolt!,
    proposedText: "Reveal {templateId} from {targetHand}."
  });
  const approved = reviewBehaviorDraft(draft, {
    reviewerId: "designer_1",
    approved: true
  });

  assert.ok(draft.validationIssues.some((issue) => issue.severity === "error"));
  assert.throws(() => buildReviewedBehaviorArtifact(approved), /validation issues/);
});

test("content registry validates, publishes, deprecates, and rolls back immutable bundles", () => {
  const registry = new ContentRegistry();
  const duel = buildRulesetBundle("packages/rulesets/sample-duel");
  const identity = buildRulesetBundle("packages/rulesets/sample-identity");

  const validated = registry.validate(duel);
  assert.equal(validated.state, "validated");

  const publishedDuel = registry.publish(duel);
  assert.equal(publishedDuel.state, "published");

  const publishedIdentity = registry.publish(identity);
  assert.equal(publishedIdentity.state, "published");

  const republishedDuel = registry.publish(duel);
  assert.equal(republishedDuel.state, "published");

  const rolledBack = registry.rollback("sample-duel", duel.contentHash);
  assert.equal(rolledBack.state, "published");
  assert.ok(registry.list().some((entry) => entry.id === "sample-identity" && entry.state === "published"));

  publishedDuel.bundle.files["game-definition.json"] = { mutated: true };
  assert.notDeepEqual(registry.get(duel.contentHash)?.bundle.files["game-definition.json"], { mutated: true });
});

test("content registry blocks publish when validation warnings remain", () => {
  const registry = new ContentRegistry();
  const bundle = buildRulesetBundle("packages/rulesets/sample-duel");
  const warningBundle = {
    ...bundle,
    contentHash: `${bundle.contentHash}-warning`,
    issues: [
      ...bundle.issues,
      {
        severity: "warning" as const,
        file: "game-definition.json",
        message: "designer note"
      }
    ]
  };

  assert.equal(registry.validate(warningBundle).state, "validated");
  assert.throws(() => registry.publish(warningBundle), /validation warnings/);
});

test("file bundle store verifies content locks and reports missing hashes clearly", () => {
  const bundle = buildRulesetBundle("packages/rulesets/sample-duel");
  const store = new FileBundleStore(mkdtempSync(join(tmpdir(), "millet-bundles-")));
  const stored = store.put(bundle);

  assert.equal(stored.contentHash, bundle.contentHash);
  assert.equal(store.require(bundle.contentHash).id, "sample-duel");
  verifyContentLock(contentLockFromBundle(bundle), store);

  assert.throws(
    () =>
      verifyContentLock(
        {
          gameDefinition: {
            id: "sample-duel",
            version: "0.1.0",
            contentHash: "sha256:missing"
          }
        },
        store
      ),
    MissingContentBundleError
  );
});
