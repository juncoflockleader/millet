import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
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
  const runeDuel = buildRulesetBundle("packages/rulesets/sample-rune-duel");

  assert.equal(duel.id, "sample-duel");
  assert.equal(identity.id, "sample-identity");
  assert.equal(runeDuel.id, "sample-rune-duel");
  assert.ok(duel.contentHash.startsWith("sha256:"));
  assert.ok(identity.contentHash.startsWith("sha256:"));
  assert.ok(runeDuel.contentHash.startsWith("sha256:"));
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-duel").filter((issue) => issue.severity === "error"), []);
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-identity").filter((issue) => issue.severity === "error"), []);
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-rune-duel").filter((issue) => issue.severity === "error"), []);
  assert.deepEqual(validateRulesetDir("packages/rulesets/sample-basic-trio").filter((issue) => issue.severity === "error"), []);
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
          publicPath: "assets/card.png",
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
  assert.ok(errors.some((issue) => issue.message.includes("remote-card publicPath must start with /")));
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
          assetRefs: ["missing_asset"],
          display: {
            properties: [
              { property: "manaCost", slot: "center-orb", icon: "crystal" }
            ]
          }
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
  assert.ok(errors.some((issue) => issue.message.includes("Template known display property manaCost uses unsupported slot center-orb")));
  assert.ok(errors.some((issue) => issue.message.includes("Template known display property manaCost uses unsupported icon crystal")));
});

test("ruleset validation accepts property display registries from board layouts", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-display-registry-ruleset-"));
  mkdirSync(join(dir, "ui"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "display-registry-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      cardCatalog: "card-catalog.json",
      ui: {
        defaultBoardLayout: "ui/display-layout.json",
        boardLayouts: ["ui/display-layout.json"]
      }
    })
  );
  writeFileSync(
    join(dir, "card-catalog.json"),
    JSON.stringify({
      id: "display-registry-cards",
      version: "0.1.0",
      templates: [
        {
          templateId: "judgment_card",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.judgment.name",
          display: {
            properties: [
              { property: "suit", slot: "suit-point", icon: "suit" },
              { property: "rank", slot: "suit-point", icon: "rank" }
            ]
          }
        }
      ]
    })
  );
  writeFileSync(
    join(dir, "ui", "display-layout.json"),
    JSON.stringify({
      id: "display-layout",
      version: "0.1.0",
      kind: "board_layout",
      logicalSize: { width: 320, height: 240 },
      scaling: { mode: "fit_viewport" },
      propertyDisplay: {
        slots: [{ id: "suit-point", label: "Suit And Point" }],
        icons: [{ id: "suit", label: "Suit" }, { id: "rank", label: "Point" }]
      },
      regions: [
        {
          id: "hand",
          kind: "hand",
          ownerScope: "player",
          geometry: { x: 0, y: 0, width: 320, height: 80 },
          widgetId: "hand"
        }
      ],
      widgets: [{ id: "hand", kind: "card_collection", component: "CardRow" }]
    })
  );

  assert.deepEqual(validateRulesetDir(dir).filter((issue) => issue.severity === "error"), []);
});

test("ruleset validation rejects invalid UI board layouts", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-ui-layout-invalid-ruleset-"));
  mkdirSync(join(dir, "ui"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-ui-layout-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      ui: {
        defaultBoardLayout: "ui/bad-layout.json",
        boardLayouts: ["ui/bad-layout.json", "ui/missing-layout.json"]
      }
    })
  );
  writeFileSync(
    join(dir, "ui", "bad-layout.json"),
    JSON.stringify({
      id: "bad-layout",
      version: "0.1.0",
      kind: "board_layout",
      logicalSize: { width: 1120, height: 620 },
      scaling: { mode: "fit_viewport" },
      propertyDisplay: {
        slots: [{ id: "badge" }, { id: "badge" }],
        icons: [{ id: "gem" }, { id: "gem" }]
      },
      regions: [
        {
          id: "hand",
          kind: "hand",
          ownerScope: "player",
          geometry: { x: 0, y: 0, width: 320, height: 160 },
          widgetId: "missing-widget"
        },
        {
          id: "hand",
          kind: "hand",
          ownerScope: "player",
          geometry: { x: 0, y: 0, width: 320, height: 160 },
          widgetId: "missing-widget"
        },
        {
          id: "off_board",
          kind: "custom",
          ownerScope: "shared",
          dataSource: { zoneType: "void" },
          geometry: { x: 1110, y: 610, width: 30, height: 20 },
          widgetId: "duplicate-widget"
        }
      ],
      widgets: [
        {
          id: "duplicate-widget",
          kind: "card_collection",
          component: "CardRow"
        },
        {
          id: "duplicate-widget",
          kind: "card_collection",
          component: "CardRow"
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");

  assert.ok(errors.some((issue) => issue.message.includes("Duplicate board layout region id hand")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate board layout widget id duplicate-widget")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown widget missing-widget")));
  assert.ok(errors.some((issue) => issue.message.includes("Region off_board geometry exceeds logical board bounds 1120x620")));
  assert.ok(errors.some((issue) => issue.message.includes("Region off_board dataSource references unknown zone type void")));
  assert.ok(errors.some((issue) => issue.message.includes("Board layout ui/missing-layout.json is missing")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate property display slot id badge")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate property display icon id gem")));
});

test("ruleset validation rejects invalid UI presentation catalogs", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-ui-presentation-invalid-ruleset-"));
  mkdirSync(join(dir, "ui"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-ui-presentation-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      cardCatalog: "card-catalog.json",
      behaviors: ["known_behavior"],
      ui: {
        defaultPresentationCatalog: "ui/bad-presentation.json",
        presentationCatalogs: ["ui/bad-presentation.json", "ui/missing-presentation.json"]
      }
    })
  );
  writeFileSync(
    join(dir, "behaviors.json"),
    JSON.stringify({
      id: "invalid-ui-presentation-behaviors",
      version: "0.1.0",
      behaviors: ["known_behavior"]
    })
  );
  writeFileSync(
    join(dir, "card-catalog.json"),
    JSON.stringify({
      id: "invalid-ui-presentation-cards",
      version: "0.1.0",
      templates: [
        {
          templateId: "known",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.known.name",
          behaviorIds: ["known_behavior"]
        }
      ]
    })
  );
  writeFileSync(
    join(dir, "ui", "bad-presentation.json"),
    JSON.stringify({
      id: "bad-presentation",
      version: "0.1.0",
      kind: "presentation_catalog",
      cards: [
        {
          templateId: "known",
          name: "Known",
          text: "Known text.",
          behavior: { behaviorId: "missing_behavior" },
          properties: {
            display: [
              { property: "manaCost", slot: "banner-left", icon: "gem" }
            ]
          }
        },
        {
          templateId: "known",
          name: "Duplicate",
          text: "Duplicate text."
        },
        {
          templateId: "missing_template",
          name: "Missing",
          text: "Missing text."
        }
      ],
      heroes: [
        {
          playerId: "p1",
          name: "Hero",
          title: "Hero",
          ability: {
            name: "Bad Ability",
            behaviorId: "missing_hero_behavior",
            text: "Bad.",
            action: "Use",
            targetMode: "enemyHero",
            display: [
              { property: "manaCost", slot: "hero-center", icon: "flame" }
            ]
          }
        },
        {
          playerId: "p1",
          name: "Duplicate Hero",
          title: "Hero"
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");

  assert.ok(errors.some((issue) => issue.message.includes("Presentation catalog ui/missing-presentation.json is missing")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate presentation template id known")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown card template missing_template")));
  assert.ok(errors.some((issue) => issue.message.includes("references unknown behavior missing_behavior")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate hero presentation player id p1")));
  assert.ok(errors.some((issue) => issue.message.includes("ability references unknown behavior missing_hero_behavior")));
  assert.ok(errors.some((issue) => issue.message.includes("Presentation known display property manaCost uses unsupported slot banner-left")));
  assert.ok(errors.some((issue) => issue.message.includes("Presentation known display property manaCost uses unsupported icon gem")));
  assert.ok(errors.some((issue) => issue.message.includes("Hero p1 ability display property manaCost uses unsupported slot hero-center")));
  assert.ok(errors.some((issue) => issue.message.includes("Hero p1 ability display property manaCost uses unsupported icon flame")));
});

test("ruleset validation rejects invalid UI preview fixtures", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-ui-preview-invalid-ruleset-"));
  mkdirSync(join(dir, "ui"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-ui-preview-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      cardCatalog: "card-catalog.json",
      ui: {
        defaultPreviewFixture: "ui/bad-preview.json",
        previewFixtures: ["ui/bad-preview.json", "ui/missing-preview.json"]
      }
    })
  );
  writeFileSync(
    join(dir, "card-catalog.json"),
    JSON.stringify({
      id: "invalid-ui-preview-cards",
      version: "0.1.0",
      templates: [
        {
          templateId: "known",
          version: "0.1.0",
          objectType: "card",
          nameKey: "card.known.name"
        }
      ]
    })
  );
  writeFileSync(
    join(dir, "ui", "bad-preview.json"),
    JSON.stringify({
      id: "bad-preview",
      version: "0.1.0",
      kind: "ui_preview_fixture",
      fixtures: [
        {
          id: "bad",
          label: "Bad Preview",
          focus: "card",
          viewerId: "p4",
          selectedPlayerId: "p3",
          state: {
            status: "active",
            lastSequence: 0,
            turn: { activePlayerId: "p9" },
            players: {
              p1: { id: "p1", status: "alive", resources: { health: { current: 10 } } },
              p2: { id: "p2", status: "alive", resources: { health: { current: 10 } } }
            },
            zones: {
              zone_hand_p1: { id: "other_zone", objectIds: ["missing_object", "obj_key", "hidden_leak", "visible_missing"] }
            },
            objects: {
              obj_key: { id: "other_id", objectType: "card", templateId: "missing_template", ownerId: "p9" },
              hidden_leak: {
                id: "hidden_leak",
                objectType: "hidden",
                templateId: "known",
                ownerId: "p1",
                stats: { attack: 1 },
                counters: { durability: 1 },
                tags: ["spell"],
                exhausted: true
              },
              visible_missing: { id: "visible_missing", objectType: "card", ownerId: "p1" }
            },
            outcomes: []
          }
        },
        {
          id: "bad",
          label: "Duplicate",
          focus: "hero",
          state: {
            status: "active",
            lastSequence: 1,
            turn: { activePlayerId: "p1" },
            players: {
              p1: { id: "p1", status: "alive", resources: { health: { current: 10 } } }
            },
            zones: {},
            objects: {},
            outcomes: []
          }
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");

  assert.ok(errors.some((issue) => issue.message.includes("UI preview fixture ui/missing-preview.json is missing")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate UI preview fixture id bad")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad viewerId references unknown player p4")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad selectedPlayerId references unknown player p3")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad turn references unknown active player p9")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad object key obj_key does not match id other_id")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad object other_id references unknown card template missing_template")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad object other_id references unknown owner p9")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose templateId")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose ownerId")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose stats")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose counters")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose tags")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad hidden object hidden_leak must not expose exhausted")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad object visible_missing must declare templateId unless it is hidden")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad zone key zone_hand_p1 does not match id other_zone")));
  assert.ok(errors.some((issue) => issue.message.includes("Preview fixture bad zone other_zone references unknown object missing_object")));
});

test("ruleset validation rejects invalid UI playtest scripts", () => {
  const dir = mkdtempSync(join(tmpdir(), "millet-ui-playtest-invalid-ruleset-"));
  mkdirSync(join(dir, "ui"));
  writeFileSync(
    join(dir, "game-definition.json"),
    JSON.stringify({
      id: "invalid-ui-playtest-ruleset",
      version: "0.1.0",
      metadata: {},
      playerConfig: {},
      zones: [{ id: "hand", zoneType: "hand", scope: "player" }],
      behaviors: ["known_behavior"],
      ui: {
        defaultPlaytestScript: "ui/bad-playtests.json",
        playtestScripts: ["ui/bad-playtests.json", "ui/missing-playtests.json"]
      }
    })
  );
  writeFileSync(
    join(dir, "behaviors.json"),
    JSON.stringify({
      id: "invalid-ui-playtest-behaviors",
      version: "0.1.0",
      behaviors: ["known_behavior"]
    })
  );
  writeFileSync(
    join(dir, "ui", "bad-playtests.json"),
    JSON.stringify({
      id: "bad-playtests",
      version: "0.1.0",
      kind: "ui_playtest_script",
      scripts: [
        {
          id: "bad",
          label: "Bad Playtest",
          mode: "live_match",
          steps: [
            {
              id: "cast",
              action: "submit_command",
              command: {
                playerId: "p1",
                type: "execute_behavior",
                payload: { behaviorId: "missing_behavior" }
              }
            },
            {
              id: "cast",
              action: "fetch_state"
            }
          ]
        },
        {
          id: "bad",
          label: "Duplicate Playtest",
          steps: [
            {
              id: "create",
              action: "create_match",
              match: { rulesetId: "invalid-ui-playtest-ruleset" }
            }
          ]
        }
      ]
    })
  );

  const errors = validateRulesetDir(dir).filter((issue) => issue.severity === "error");

  assert.ok(errors.some((issue) => issue.message.includes("UI playtest script ui/missing-playtests.json is missing")));
  assert.ok(errors.some((issue) => issue.message.includes("Duplicate UI playtest script id bad")));
  assert.ok(errors.some((issue) => issue.message.includes("Playtest script bad has duplicate step id cast")));
  assert.ok(errors.some((issue) => issue.message.includes("Playtest script bad step cast references unknown behavior missing_behavior")));
  assert.ok(errors.some((issue) => issue.message.includes("Playtest script bad live_match must include a create_match step")));
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
  assert.deepEqual(generateUxHints(behavior).visualEffect, { key: "firebolt", anchor: "opponent" });
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
