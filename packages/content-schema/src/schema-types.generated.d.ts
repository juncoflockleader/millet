/*
 * Generated from packages/content-schema/src/schemas.ts.
 * Run: node --experimental-strip-types scripts/millet.mjs gen-schema-types packages/content-schema/src/schema-types.generated.d.ts
 */

export interface MatchEventJson {
  "id": string;
  "matchId": string;
  "sequence": number;
  "transactionId": string;
  "type": string;
  "payload": unknown;
  "visibility": {
    "default": {
      "kind": string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  "causedBy"?: {
    [key: string]: unknown;
  };
  "stateHashAfter"?: string;
}

export interface GameDefinitionJson {
  "id": string;
  "version": string;
  "metadata": {
    [key: string]: unknown;
  };
  "playerConfig": {
    [key: string]: unknown;
  };
  "zones": {
    "id": string;
    "zoneType": string;
    "scope": "match" | "player";
    "capacity"?: number;
  }[];
  "resources"?: {
    "id": string;
    [key: string]: unknown;
  }[];
  "turnGraph"?: string[];
  "behaviors"?: string[];
  "cardCatalog"?: string;
  "ui"?: {
    "defaultBoardLayout"?: string;
    "boardLayouts"?: string[];
    "defaultPresentationCatalog"?: string;
    "presentationCatalogs"?: string[];
    "defaultPreviewFixture"?: string;
    "previewFixtures"?: string[];
    "defaultPlaytestScript"?: string;
    "playtestScripts"?: string[];
  };
}

export interface BehaviorManifestJson {
  "id": string;
  "version": string;
  "behaviors": string[];
}

export interface CardCatalogJson {
  "id": string;
  "version": string;
  "templates": {
    "templateId": string;
    "version": string;
    "objectType": string;
    "nameKey": string;
    "descriptionKey"?: string;
    "tags"?: string[];
    "behaviorIds"?: string[];
    "assetRefs"?: string[];
    "manaCost"?: number;
    "stats"?: {
      [key: string]: number;
    };
    "display"?: {
      "layout"?: string;
      "properties"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
      [key: string]: unknown;
    };
    "metadata"?: {
      [key: string]: unknown;
    };
  }[];
}

export interface BoardLayoutJson {
  "id": string;
  "version": string;
  "kind": "board_layout";
  "metadata"?: {
    [key: string]: unknown;
  };
  "logicalSize": {
    "width": number;
    "height": number;
  };
  "scaling": {
    "mode": "fit_viewport" | "fixed" | "responsive";
    "minScale"?: number;
    "maxScale"?: number;
  };
  "tokens"?: {
    [key: string]: unknown;
  };
  "propertyDisplay"?: {
    "slots"?: {
      "id": string;
      "label"?: string;
      "description"?: string;
      "regionKinds"?: string[];
      "objectTypes"?: string[];
    }[];
    "icons"?: {
      "id": string;
      "label"?: string;
      "description"?: string;
      "assetRef"?: string;
    }[];
  };
  "regions": {
    "id": string;
    "kind": "hero" | "hand" | "deck" | "discard" | "graveyard" | "battlefield" | "equipment" | "judgment" | "prompt" | "action_window" | "chat" | "history_log" | "opponent_summary" | "spectator_overlay" | "debug_overlay" | "custom";
    "ownerScope": "player" | "opponent" | "shared" | "match" | "spectator";
    "dataSource"?: {
      "zoneType"?: string;
    };
    "label"?: string;
    "geometry": {
      "x": number;
      "y": number;
      "width": number;
      "height": number;
    };
    "widgetId": string;
    "accepts"?: string[];
    "targetable"?: boolean;
    "dropBehavior"?: string;
    "overflow"?: "fan" | "scroll" | "stack" | "compact" | "hidden";
    "visibleTo"?: "owner" | "opponent" | "public" | "admin";
  }[];
  "widgets": {
    "id": string;
    "kind": "card_collection" | "single_object" | "system" | "debug" | "custom";
    "component": string;
    "config"?: {
      [key: string]: unknown;
    };
  }[];
}

export interface PresentationCatalogJson {
  "id": string;
  "version": string;
  "kind": "presentation_catalog";
  "metadata"?: {
    [key: string]: unknown;
  };
  "cards"?: {
    "templateId": string;
    "name": string;
    "text": string;
    "action"?: string;
    "assets"?: {
      "art"?: string;
      "frame"?: string;
      "icon"?: string;
    };
    "layout"?: {
      "variant"?: string;
      [key: string]: unknown;
    };
    "properties"?: {
      "manaCost"?: number;
      "stats"?: {
        [key: string]: number;
      };
      "display"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
      [key: string]: unknown;
    };
    "behavior"?: {
      "behaviorId"?: string;
      "targetMode"?: "enemyHero" | "selfHero" | "battlefield" | "targeted";
      "targetSelector"?: string;
    };
  }[];
  "equipment"?: {
    "templateId": string;
    "name": string;
    "text": string;
    "action"?: string;
    "assets"?: {
      "art"?: string;
      "frame"?: string;
      "icon"?: string;
    };
    "layout"?: {
      "variant"?: string;
      [key: string]: unknown;
    };
    "properties"?: {
      "manaCost"?: number;
      "stats"?: {
        [key: string]: number;
      };
      "display"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
      [key: string]: unknown;
    };
    "behavior"?: {
      "behaviorId"?: string;
      "targetMode"?: "enemyHero" | "selfHero" | "battlefield" | "targeted";
      "targetSelector"?: string;
    };
  }[];
  "minions"?: {
    "templateId": string;
    "name": string;
    "text": string;
    "action"?: string;
    "assets"?: {
      "art"?: string;
      "frame"?: string;
      "icon"?: string;
    };
    "layout"?: {
      "variant"?: string;
      [key: string]: unknown;
    };
    "properties"?: {
      "manaCost"?: number;
      "stats"?: {
        [key: string]: number;
      };
      "display"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
      [key: string]: unknown;
    };
    "behavior"?: {
      "behaviorId"?: string;
      "targetMode"?: "enemyHero" | "selfHero" | "battlefield" | "targeted";
      "targetSelector"?: string;
    };
  }[];
  "heroes"?: {
    "playerId": string;
    "templateId"?: string;
    "name": string;
    "title": string;
    "assets"?: {
      "art"?: string;
      "frame"?: string;
      "icon"?: string;
    };
    "layout"?: {
      "variant"?: string;
      [key: string]: unknown;
    };
    "properties"?: {
      "display"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
      [key: string]: unknown;
    };
    "ability"?: {
      "name": string;
      "behaviorId": string;
      "text": string;
      "action": string;
      "targetMode": "enemyHero" | "selfHero" | "battlefield" | "targeted";
      "manaCost"?: number;
      "display"?: {
        "property": string;
        "source"?: "template" | "stats" | "counter" | "resource" | "metadata" | "computed";
        "slot": string;
        "icon"?: string;
        "label"?: string;
        "priority"?: number;
      }[];
    };
  }[];
}

export interface UiPreviewFixtureJson {
  "id": string;
  "version": string;
  "kind": "ui_preview_fixture";
  "metadata"?: {
    [key: string]: unknown;
  };
  "fixtures": {
    "id": string;
    "label": string;
    "description"?: string;
    "focus": "card" | "hero" | "equipment" | "minion" | "full-board";
    "viewerId"?: string;
    "selectedPlayerId"?: string;
    "state": {
      "status": string;
      "lastSequence": number;
      "players": {
        [key: string]: {
          "id": string;
          "status": string;
          "resources": {
            [key: string]: {
              "current": number;
              "max"?: number;
              [key: string]: unknown;
            };
          };
          [key: string]: unknown;
        };
      };
      "zones": {
        [key: string]: {
          "id": string;
          "objectIds": string[];
          [key: string]: unknown;
        };
      };
      "objects": {
        [key: string]: {
          "id": string;
          "objectType": string;
          "templateId"?: string;
          "ownerId"?: string;
          "exhausted"?: boolean;
          "stats"?: {
            [key: string]: number;
          };
          "counters"?: {
            [key: string]: number;
          };
          [key: string]: unknown;
        };
      };
      "turn": {
        "activePlayerId": string;
        "phaseId"?: string;
        [key: string]: unknown;
      };
      "outcomes": {
        [key: string]: unknown;
      }[];
      [key: string]: unknown;
    };
    "events"?: {
      [key: string]: unknown;
    }[];
  }[];
}

export interface UiPlaytestScriptJson {
  "id": string;
  "version": string;
  "kind": "ui_playtest_script";
  "metadata"?: {
    [key: string]: unknown;
  };
  "scripts": {
    "id": string;
    "label": string;
    "description"?: string;
    "mode"?: "live_match" | "fixture";
    "match"?: {
      "rulesetId"?: string;
      "playerCount"?: number;
      "demoDuel"?: boolean;
      [key: string]: unknown;
    };
    "steps": {
      "id": string;
      "label"?: string;
      "action": "create_match" | "submit_command" | "fetch_state" | "fetch_replay" | "assert_resource";
      "match"?: {
        "rulesetId"?: string;
        "playerCount"?: number;
        "demoDuel"?: boolean;
        [key: string]: unknown;
      };
      "command"?: {
        "id"?: string;
        "matchId"?: string;
        "playerId": string;
        "userId"?: string;
        "type": string;
        "payload"?: unknown;
        [key: string]: unknown;
      };
      "expect"?: {
        "playerId"?: string;
        "resource"?: string;
        "current"?: number;
        "minCount"?: number;
        "eventType"?: string;
        [key: string]: unknown;
      };
    }[];
    "expect"?: {
      [key: string]: unknown;
    };
  }[];
}

export interface AssetManifestJson {
  "id": string;
  "version": string;
  "assets": {
    "assetId": string;
    "version": string;
    "kind": string;
    "contentHash": string;
    "sourceUri": string;
    "license": string;
    "owner": string;
    "publicPath"?: string;
    "mediaType"?: string;
    "width"?: number;
    "height"?: number;
    "durationMs"?: number;
    "frameCount"?: number;
    "generationId"?: string;
    "prompt"?: string;
    "previewRole"?: string;
    "usage"?: string[];
  }[];
}

export interface LocalizationBundleJson {
  "id": string;
  "version": string;
  "locale": string;
  "strings": {
    [key: string]: string;
  };
}

export interface ReplayFixtureJson {
  "id": string;
  "events": {
    "id": string;
    "matchId": string;
    "sequence": number;
    "transactionId": string;
    "type": string;
    "payload": unknown;
    "visibility": {
      "default": {
        "kind": string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    "causedBy"?: {
      [key: string]: unknown;
    };
    "stateHashAfter"?: string;
  }[];
  "expect"?: {
    "finalStateHash"?: string;
    "objectZones"?: {
      [key: string]: string;
    };
    "zoneObjects"?: {
      [key: string]: string[];
    };
  };
}
