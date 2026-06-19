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
    "metadata"?: {
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
    "mediaType"?: string;
    "width"?: number;
    "height"?: number;
    "durationMs"?: number;
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
