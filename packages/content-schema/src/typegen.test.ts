import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { generateDefaultSchemaTypes } from "./typegen.ts";

test("generates TypeScript declarations from hand-authored schemas", () => {
  const declarations = generateDefaultSchemaTypes();

  assert.match(declarations, /export interface GameDefinitionJson/);
  assert.match(declarations, /"scope": "match" \| "player";/);
  assert.match(declarations, /"cardCatalog"\?: string;/);
  assert.match(declarations, /export interface CardCatalogJson/);
  assert.match(declarations, /"templateId": string;/);
  assert.match(declarations, /export interface BoardLayoutJson/);
  assert.match(declarations, /"kind": "board_layout";/);
  assert.match(declarations, /"ownerScope": "player" \| "opponent" \| "shared" \| "match" \| "spectator";/);
  assert.match(declarations, /export interface PresentationCatalogJson/);
  assert.match(declarations, /"kind": "presentation_catalog";/);
  assert.match(declarations, /"heroes"\?: \{/);
  assert.match(declarations, /export interface UiPreviewFixtureJson/);
  assert.match(declarations, /"kind": "ui_preview_fixture";/);
  assert.match(declarations, /"focus": "card" \| "hero" \| "equipment" \| "minion" \| "full-board";/);
  assert.match(declarations, /export interface UiPlaytestScriptJson/);
  assert.match(declarations, /"kind": "ui_playtest_script";/);
  assert.match(declarations, /"action": "create_match" \| "submit_command" \| "fetch_state" \| "fetch_replay" \| "assert_resource";/);
  assert.match(declarations, /export interface AssetManifestJson/);
  assert.match(declarations, /"assets": \{\n\s+"assetId": string;/);
  assert.match(declarations, /"mediaType"\?: string;/);
  assert.match(declarations, /"width"\?: number;/);
  assert.match(declarations, /"height"\?: number;/);
  assert.match(declarations, /"publicPath"\?: string;/);
  assert.match(declarations, /"frameCount"\?: number;/);
  assert.match(declarations, /"usage"\?: string\[\];/);
  assert.match(declarations, /export interface ReplayFixtureJson/);
  assert.match(declarations, /\[key: string\]: unknown;/);
});

test("checked-in generated schema declarations are current", () => {
  const generatedPath = join("packages", "content-schema", "src", "schema-types.generated.d.ts");
  const current = readFileSync(generatedPath, "utf8");

  assert.equal(current, generateDefaultSchemaTypes());
});
