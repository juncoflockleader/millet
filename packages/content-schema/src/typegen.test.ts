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
  assert.match(declarations, /export interface AssetManifestJson/);
  assert.match(declarations, /"assets": \{\n\s+"assetId": string;/);
  assert.match(declarations, /"mediaType"\?: string;/);
  assert.match(declarations, /"width"\?: number;/);
  assert.match(declarations, /"height"\?: number;/);
  assert.match(declarations, /export interface ReplayFixtureJson/);
  assert.match(declarations, /\[key: string\]: unknown;/);
});

test("checked-in generated schema declarations are current", () => {
  const generatedPath = join("packages", "content-schema", "src", "schema-types.generated.d.ts");
  const current = readFileSync(generatedPath, "utf8");

  assert.equal(current, generateDefaultSchemaTypes());
});
