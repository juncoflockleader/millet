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
    },
    ui: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaultBoardLayout: { type: "string", minLength: 1 },
        boardLayouts: {
          type: "array",
          items: { type: "string", minLength: 1 }
        },
        defaultPresentationCatalog: { type: "string", minLength: 1 },
        presentationCatalogs: {
          type: "array",
          items: { type: "string", minLength: 1 }
        },
        defaultPreviewFixture: { type: "string", minLength: 1 },
        previewFixtures: {
          type: "array",
          items: { type: "string", minLength: 1 }
        },
        defaultPlaytestScript: { type: "string", minLength: 1 },
        playtestScripts: {
          type: "array",
          items: { type: "string", minLength: 1 }
        }
      }
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

export const boardLayoutSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/board-layout.schema.json",
  type: "object",
  required: ["id", "version", "kind", "logicalSize", "scaling", "regions", "widgets"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    kind: { enum: ["board_layout"] },
    metadata: {
      type: "object",
      additionalProperties: true
    },
    logicalSize: {
      type: "object",
      required: ["width", "height"],
      additionalProperties: false,
      properties: {
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 }
      }
    },
    scaling: {
      type: "object",
      required: ["mode"],
      additionalProperties: false,
      properties: {
        mode: { enum: ["fit_viewport", "fixed", "responsive"] },
        minScale: { type: "number", minimum: 0 },
        maxScale: { type: "number", minimum: 0 }
      }
    },
    tokens: {
      type: "object",
      additionalProperties: true
    },
    propertyDisplay: {
      type: "object",
      additionalProperties: false,
      properties: {
        slots: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            additionalProperties: false,
            properties: {
              id: { type: "string", minLength: 1 },
              label: { type: "string", minLength: 1 },
              description: { type: "string", minLength: 1 },
              regionKinds: {
                type: "array",
                items: { type: "string", minLength: 1 }
              },
              objectTypes: {
                type: "array",
                items: { type: "string", minLength: 1 }
              }
            }
          }
        },
        icons: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            additionalProperties: false,
            properties: {
              id: { type: "string", minLength: 1 },
              label: { type: "string", minLength: 1 },
              description: { type: "string", minLength: 1 },
              assetRef: { type: "string", minLength: 1 }
            }
          }
        }
      }
    },
    regions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "kind", "ownerScope", "geometry", "widgetId"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          kind: {
            enum: [
              "hero",
              "hand",
              "deck",
              "discard",
              "graveyard",
              "battlefield",
              "equipment",
              "judgment",
              "prompt",
              "action_window",
              "chat",
              "history_log",
              "opponent_summary",
              "spectator_overlay",
              "debug_overlay",
              "custom"
            ]
          },
          ownerScope: { enum: ["player", "opponent", "shared", "match", "spectator"] },
          label: { type: "string", minLength: 1 },
          geometry: {
            type: "object",
            required: ["x", "y", "width", "height"],
            additionalProperties: false,
            properties: {
              x: { type: "number", minimum: 0 },
              y: { type: "number", minimum: 0 },
              width: { type: "number", minimum: 1 },
              height: { type: "number", minimum: 1 }
            }
          },
          widgetId: { type: "string", minLength: 1 },
          accepts: {
            type: "array",
            items: { type: "string", minLength: 1 }
          },
          targetable: { type: "boolean" },
          dropBehavior: { type: "string", minLength: 1 },
          overflow: { enum: ["fan", "scroll", "stack", "compact", "hidden"] },
          visibleTo: { enum: ["owner", "opponent", "public", "admin"] }
        }
      }
    },
    widgets: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "kind", "component"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          kind: { enum: ["card_collection", "single_object", "system", "debug", "custom"] },
          component: { type: "string", minLength: 1 },
          config: {
            type: "object",
            additionalProperties: true
          }
        }
      }
    }
  }
} as const;

const previewResourceSchema = {
  type: "object",
  required: ["current"],
  additionalProperties: true,
  properties: {
    current: { type: "number" },
    max: { type: "number" }
  }
} as const satisfies JsonSchema;

const previewPlayerSchema = {
  type: "object",
  required: ["id", "status", "resources"],
  additionalProperties: true,
  properties: {
    id: { type: "string", minLength: 1 },
    status: { type: "string", minLength: 1 },
    resources: {
      type: "object",
      additionalProperties: previewResourceSchema
    }
  }
} as const satisfies JsonSchema;

const previewObjectSchema = {
  type: "object",
  required: ["id", "objectType"],
  additionalProperties: true,
  properties: {
    id: { type: "string", minLength: 1 },
    objectType: { type: "string", minLength: 1 },
    templateId: { type: "string", minLength: 1 },
    ownerId: { type: "string", minLength: 1 },
    exhausted: { type: "boolean" },
    stats: {
      type: "object",
      additionalProperties: { type: "number" }
    },
    counters: {
      type: "object",
      additionalProperties: { type: "number" }
    }
  }
} as const satisfies JsonSchema;

const previewZoneSchema = {
  type: "object",
  required: ["id", "objectIds"],
  additionalProperties: true,
  properties: {
    id: { type: "string", minLength: 1 },
    objectIds: {
      type: "array",
      items: { type: "string", minLength: 1 }
    }
  }
} as const satisfies JsonSchema;

const previewStateSchema = {
  type: "object",
  required: ["status", "lastSequence", "players", "zones", "objects", "turn", "outcomes"],
  additionalProperties: true,
  properties: {
    status: { type: "string", minLength: 1 },
    lastSequence: { type: "integer", minimum: 0 },
    players: {
      type: "object",
      additionalProperties: previewPlayerSchema
    },
    zones: {
      type: "object",
      additionalProperties: previewZoneSchema
    },
    objects: {
      type: "object",
      additionalProperties: previewObjectSchema
    },
    turn: {
      type: "object",
      required: ["activePlayerId"],
      additionalProperties: true,
      properties: {
        activePlayerId: { type: "string", minLength: 1 },
        phaseId: { type: "string", minLength: 1 }
      }
    },
    outcomes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: true
      }
    }
  }
} as const satisfies JsonSchema;

export const uiPreviewFixtureSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/ui-preview-fixture.schema.json",
  type: "object",
  required: ["id", "version", "kind", "fixtures"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    kind: { enum: ["ui_preview_fixture"] },
    metadata: {
      type: "object",
      additionalProperties: true
    },
    fixtures: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "label", "focus", "state"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          focus: { enum: ["card", "hero", "equipment", "minion", "full-board"] },
          viewerId: { type: "string", minLength: 1 },
          selectedPlayerId: { type: "string", minLength: 1 },
          state: previewStateSchema,
          events: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true
            }
          }
        }
      }
    }
  }
} as const;

const uiPlaytestCommandSchema = {
  type: "object",
  required: ["playerId", "type"],
  additionalProperties: true,
  properties: {
    id: { type: "string", minLength: 1 },
    matchId: { type: "string", minLength: 1 },
    playerId: { type: "string", minLength: 1 },
    userId: { type: "string", minLength: 1 },
    type: { type: "string", minLength: 1 },
    payload: true
  }
} as const satisfies JsonSchema;

const uiPlaytestStepSchema = {
  type: "object",
  required: ["id", "action"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    label: { type: "string", minLength: 1 },
    action: { enum: ["create_match", "submit_command", "fetch_state", "fetch_replay", "assert_resource"] },
    match: {
      type: "object",
      additionalProperties: true,
      properties: {
        rulesetId: { type: "string", minLength: 1 },
        playerCount: { type: "integer", minimum: 1 },
        demoDuel: { type: "boolean" }
      }
    },
    command: uiPlaytestCommandSchema,
    expect: {
      type: "object",
      additionalProperties: true,
      properties: {
        playerId: { type: "string", minLength: 1 },
        resource: { type: "string", minLength: 1 },
        current: { type: "number" },
        minCount: { type: "integer", minimum: 0 },
        eventType: { type: "string", minLength: 1 }
      }
    }
  }
} as const satisfies JsonSchema;

export const uiPlaytestScriptSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/ui-playtest-script.schema.json",
  type: "object",
  required: ["id", "version", "kind", "scripts"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    kind: { enum: ["ui_playtest_script"] },
    metadata: {
      type: "object",
      additionalProperties: true
    },
    scripts: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "label", "steps"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          mode: { enum: ["live_match", "fixture"] },
          match: {
            type: "object",
            additionalProperties: true,
            properties: {
              rulesetId: { type: "string", minLength: 1 },
              playerCount: { type: "integer", minimum: 1 },
              demoDuel: { type: "boolean" }
            }
          },
          steps: {
            type: "array",
            minItems: 1,
            items: uiPlaytestStepSchema
          },
          expect: {
            type: "object",
            additionalProperties: true
          }
        }
      }
    }
  }
} as const;

const propertyDisplaySchema = {
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
} as const satisfies JsonSchema;

const presentationObjectSchema = {
  type: "object",
  required: ["templateId", "name", "text"],
  additionalProperties: false,
  properties: {
    templateId: { type: "string", minLength: 1 },
    name: { type: "string", minLength: 1 },
    text: { type: "string" },
    action: { type: "string" },
    assets: {
      type: "object",
      additionalProperties: false,
      properties: {
        art: { type: "string", minLength: 1 },
        frame: { type: "string", minLength: 1 },
        icon: { type: "string", minLength: 1 }
      }
    },
    layout: {
      type: "object",
      additionalProperties: true,
      properties: {
        variant: { type: "string", minLength: 1 }
      }
    },
    properties: {
      type: "object",
      additionalProperties: true,
      properties: {
        manaCost: { type: "integer", minimum: 0 },
        stats: {
          type: "object",
          additionalProperties: { type: "number" }
        },
        display: {
          type: "array",
          items: propertyDisplaySchema
        }
      }
    },
    behavior: {
      type: "object",
      additionalProperties: false,
      properties: {
        behaviorId: { type: "string", minLength: 1 },
        targetMode: { enum: ["enemyHero", "selfHero", "battlefield", "targeted"] },
        targetSelector: { type: "string", minLength: 1 }
      }
    }
  }
} as const satisfies JsonSchema;

export const presentationCatalogSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://millet.dev/schemas/presentation-catalog.schema.json",
  type: "object",
  required: ["id", "version", "kind"],
  additionalProperties: false,
  properties: {
    id: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    kind: { enum: ["presentation_catalog"] },
    metadata: {
      type: "object",
      additionalProperties: true
    },
    cards: {
      type: "array",
      items: presentationObjectSchema
    },
    equipment: {
      type: "array",
      items: presentationObjectSchema
    },
    minions: {
      type: "array",
      items: presentationObjectSchema
    },
    heroes: {
      type: "array",
      items: {
        type: "object",
        required: ["playerId", "name", "title"],
        additionalProperties: false,
        properties: {
          playerId: { type: "string", minLength: 1 },
          templateId: { type: "string", minLength: 1 },
          name: { type: "string", minLength: 1 },
          title: { type: "string", minLength: 1 },
          assets: {
            type: "object",
            additionalProperties: false,
            properties: {
              art: { type: "string", minLength: 1 },
              frame: { type: "string", minLength: 1 },
              icon: { type: "string", minLength: 1 }
            }
          },
          layout: {
            type: "object",
            additionalProperties: true,
            properties: {
              variant: { type: "string", minLength: 1 }
            }
          },
          properties: {
            type: "object",
            additionalProperties: true,
            properties: {
              display: {
                type: "array",
                items: propertyDisplaySchema
              }
            }
          },
          ability: {
            type: "object",
            required: ["name", "behaviorId", "text", "action", "targetMode"],
            additionalProperties: false,
            properties: {
              name: { type: "string", minLength: 1 },
              behaviorId: { type: "string", minLength: 1 },
              text: { type: "string" },
              action: { type: "string", minLength: 1 },
              targetMode: { enum: ["enemyHero", "selfHero", "battlefield", "targeted"] },
              manaCost: { type: "integer", minimum: 0 },
              display: {
                type: "array",
                items: propertyDisplaySchema
              }
            }
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
          publicPath: { type: "string", minLength: 1 },
          mediaType: { type: "string", minLength: 1 },
          width: { type: "integer", minimum: 1 },
          height: { type: "integer", minimum: 1 },
          durationMs: { type: "integer", minimum: 1 },
          frameCount: { type: "integer", minimum: 1 },
          generationId: { type: "string", minLength: 1 },
          prompt: { type: "string", minLength: 1 },
          previewRole: { type: "string", minLength: 1 },
          usage: {
            type: "array",
            items: { type: "string", minLength: 1 }
          }
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
