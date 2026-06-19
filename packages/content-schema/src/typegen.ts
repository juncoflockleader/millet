import {
  assetManifestSchema,
  behaviorManifestSchema,
  cardCatalogSchema,
  gameDefinitionSchema,
  localizationBundleSchema,
  matchEventSchema,
  replayFixtureSchema,
  type JsonSchema
} from "./schemas.ts";

export interface SchemaTypeDefinition {
  name: string;
  schema: JsonSchema;
}

const DEFAULT_SCHEMA_TYPES: SchemaTypeDefinition[] = [
  { name: "MatchEventJson", schema: matchEventSchema },
  { name: "GameDefinitionJson", schema: gameDefinitionSchema },
  { name: "BehaviorManifestJson", schema: behaviorManifestSchema },
  { name: "CardCatalogJson", schema: cardCatalogSchema },
  { name: "AssetManifestJson", schema: assetManifestSchema },
  { name: "LocalizationBundleJson", schema: localizationBundleSchema },
  { name: "ReplayFixtureJson", schema: replayFixtureSchema }
];

function indent(level: number): string {
  return "  ".repeat(level);
}

function literalType(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null) {
    return "null";
  }

  return "unknown";
}

function schemaToType(schema: JsonSchema | undefined, level: number): string {
  if (schema === undefined || schema === true) {
    return "unknown";
  }

  if (schema === false) {
    return "never";
  }

  if (schema.enum) {
    return schema.enum.map(literalType).join(" | ");
  }

  switch (schema.type) {
    case "string":
      return "string";
    case "integer":
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      return `${schemaToType(schema.items, level)}[]`;
    case "object":
      return objectSchemaToType(schema, level);
    default:
      if (schema.properties || schema.additionalProperties) {
        return objectSchemaToType(schema, level);
      }
      return "unknown";
  }
}

function objectSchemaToType(schema: Exclude<JsonSchema, boolean>, level: number): string {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const lines: string[] = ["{"];

  for (const [property, propertySchema] of Object.entries(properties)) {
    const optional = required.has(property) ? "" : "?";
    lines.push(`${indent(level + 1)}${JSON.stringify(property)}${optional}: ${schemaToType(propertySchema, level + 1)};`);
  }

  if (schema.additionalProperties === true || schema.additionalProperties === undefined) {
    lines.push(`${indent(level + 1)}[key: string]: unknown;`);
  } else if (schema.additionalProperties && schema.additionalProperties !== false) {
    lines.push(`${indent(level + 1)}[key: string]: ${schemaToType(schema.additionalProperties, level + 1)};`);
  }

  lines.push(`${indent(level)}}`);
  return lines.join("\n");
}

export function generateTypeDeclarations(definitions: readonly SchemaTypeDefinition[]): string {
  const blocks = definitions.map((definition) => {
    const body = schemaToType(definition.schema, 0);
    if (body.startsWith("{\n")) {
      return `export interface ${definition.name} ${body}`;
    }

    return `export type ${definition.name} = ${body};`;
  });

  return [
    [
      "/*",
      " * Generated from packages/content-schema/src/schemas.ts.",
      " * Run: node --experimental-strip-types scripts/millet.mjs gen-schema-types packages/content-schema/src/schema-types.generated.d.ts",
      " */"
    ].join("\n"),
    ...blocks
  ].join("\n\n") + "\n";
}

export function generateDefaultSchemaTypes(): string {
  return generateTypeDeclarations(DEFAULT_SCHEMA_TYPES);
}
