export type JsonSchema =
  | boolean
  | {
      type?: "object" | "array" | "string" | "integer" | "number" | "boolean";
      required?: string[];
      additionalProperties?: boolean | JsonSchema;
      properties?: Record<string, JsonSchema>;
      items?: JsonSchema;
      minItems?: number;
      minLength?: number;
      minimum?: number;
      enum?: unknown[];
    };

export interface SchemaValidationError {
  path: string;
  message: string;
}

export const matchEventSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/match-event.schema.json",
  type: "object",
  required: ["id", "matchId", "sequence", "transactionId", "type", "payload", "visibility"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    matchId: { type: "string", minLength: 1 },
    sequence: { type: "integer", minimum: 1 },
    transactionId: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    payload: true,
    visibility: {
      type: "object",
      required: ["default"],
      additionalProperties: true,
      properties: {
        default: {
          type: "object",
          required: ["kind"],
          additionalProperties: true,
          properties: {
            kind: { type: "string" }
          }
        }
      }
    },
    causedBy: { type: "object" },
    stateHashAfter: { type: "string" }
  }
} as const;

export const gameDefinitionSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/game-definition.schema.json",
  type: "object",
  required: ["id", "version", "metadata", "playerConfig", "zones"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    metadata: {
      type: "object",
      additionalProperties: true
    },
    playerConfig: {
      type: "object",
      additionalProperties: true
    },
    zones: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "zoneType", "scope"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          zoneType: { type: "string", minLength: 1 },
          scope: { enum: ["match", "player"] },
          capacity: { type: "integer", minimum: 0 }
        }
      }
    },
    resources: {
      type: "array",
      items: {
        type: "object",
        required: ["id"],
        additionalProperties: true,
        properties: {
          id: { type: "string", minLength: 1 }
        }
      }
    },
    turnGraph: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    behaviors: {
      type: "array",
      items: { type: "string", minLength: 1 }
    },
    cardCatalog: {
      type: "string",
      minLength: 1
    }
  }
} as const;

export const behaviorManifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/behavior-manifest.schema.json",
  type: "object",
  required: ["id", "version", "behaviors"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    behaviors: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  }
} as const;

export const cardCatalogSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/card-catalog.schema.json",
  type: "object",
  required: ["id", "version", "templates"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    templates: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["templateId", "version", "objectType", "nameKey"],
        additionalProperties: false,
        properties: {
          templateId: { type: "string", minLength: 1 },
          version: { type: "string", minLength: 1 },
          objectType: { type: "string", minLength: 1 },
          nameKey: { type: "string", minLength: 1 },
          descriptionKey: { type: "string", minLength: 1 },
          tags: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          behaviorIds: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          assetRefs: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          manaCost: { type: "integer", minimum: 0 },
          stats: {
            type: "object",
            additionalProperties: { type: "number" }
          },
          display: {
            type: "object",
            additionalProperties: true,
            properties: {
              layout: { type: "string", minLength: 1 },
              properties: {
                type: "array",
                items: {
                  type: "object",
                  required: ["property", "slot"],
                  additionalProperties: false,
                  properties: {
                    property: { type: "string", minLength: 1 },
                    source: { enum: ["template", "stats", "counter", "resource", "metadata", "computed"] },
                    slot: { type: "string", minLength: 1 },
                    icon: { type: "string", minLength: 1 },
                    label: { type: "string", minLength: 1 },
                    priority: { type: "integer" }
                  }
                }
              }
            }
          },
          metadata: {
            type: "object",
            additionalProperties: true
          }
        }
      }
    }
  }
} as const;

export const assetManifestSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/asset-manifest.schema.json",
  type: "object",
  required: ["id", "version", "assets"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    assets: {
      type: "array",
      items: {
        type: "object",
        required: ["assetId", "version", "kind", "contentHash", "sourceUri", "license", "owner"],
        additionalProperties: false,
        properties: {
          assetId: { type: "string", minLength: 1 },
          version: { type: "string", minLength: 1 },
          kind: { type: "string", minLength: 1 },
          contentHash: { type: "string", minLength: 1 },
          sourceUri: { type: "string", minLength: 1 },
          license: { type: "string", minLength: 1 },
          owner: { type: "string", minLength: 1 },
          mediaType: { type: "string", minLength: 1 },
          width: { type: "integer", minimum: 1 },
          height: { type: "integer", minimum: 1 },
          durationMs: { type: "integer", minimum: 1 }
        }
      }
    }
  }
} as const;

export const localizationBundleSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/localization-bundle.schema.json",
  type: "object",
  required: ["id", "version", "locale", "strings"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    locale: { type: "string", minLength: 1 },
    strings: {
      type: "object",
      additionalProperties: { type: "string" }
    }
  }
} as const;

function typeMatches(value: unknown, expected: NonNullable<Exclude<JsonSchema, boolean>["type"]>): boolean {
  if (expected === "array") {
    return Array.isArray(value);
  }

  if (expected === "integer") {
    return Number.isInteger(value);
  }

  if (expected === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (expected === "object") {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  return typeof value === expected;
}

export function validateJsonSchema(value: unknown, schema: JsonSchema, path = "$"): SchemaValidationError[] {
  if (schema === true) {
    return [];
  }

  if (schema === false) {
    return [{ path, message: "value is not allowed" }];
  }

  const issues: SchemaValidationError[] = [];

  if (schema.type && !typeMatches(value, schema.type)) {
    issues.push({ path, message: `expected ${schema.type}` });
    return issues;
  }

  if (schema.enum && !schema.enum.some((candidate) => Object.is(candidate, value))) {
    issues.push({ path, message: `expected one of ${schema.enum.map(String).join(", ")}` });
  }

  if (typeof value === "string" && schema.minLength !== undefined && value.length < schema.minLength) {
    issues.push({ path, message: `expected length at least ${schema.minLength}` });
  }

  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    issues.push({ path, message: `expected at least ${schema.minimum}` });
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      issues.push({ path, message: `expected at least ${schema.minItems} item(s)` });
    }

    if (schema.items) {
      value.forEach((item, index) => {
        issues.push(...validateJsonSchema(item, schema.items!, `${path}[${index}]`));
      });
    }
  }

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const properties = schema.properties ?? {};

    for (const field of schema.required ?? []) {
      if (!(field in record)) {
        issues.push({ path, message: `missing required property ${field}` });
      }
    }

    for (const [field, fieldSchema] of Object.entries(properties)) {
      if (field in record) {
        issues.push(...validateJsonSchema(record[field], fieldSchema, `${path}.${field}`));
      }
    }

    const additionalFields = Object.keys(record).filter((field) => !(field in properties));
    if (schema.additionalProperties === false) {
      for (const field of additionalFields) {
        issues.push({ path: `${path}.${field}`, message: "additional property is not allowed" });
      }
    } else if (schema.additionalProperties && schema.additionalProperties !== true) {
      for (const field of additionalFields) {
        issues.push(...validateJsonSchema(record[field], schema.additionalProperties, `${path}.${field}`));
      }
    }
  }

  return issues;
}

export const replayFixtureSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/replay-fixture.schema.json",
  type: "object",
  required: ["id", "events"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    events: {
      type: "array",
      minItems: 1,
      items: matchEventSchema
    },
    expect: {
      type: "object",
      additionalProperties: false,
      properties: {
        finalStateHash: { type: "string" },
        objectZones: {
          type: "object",
          additionalProperties: { type: "string" }
        },
        zoneObjects: {
          type: "object",
          additionalProperties: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    }
  }
} as const;
