import type { MatchState } from "./types.ts";

export function assertStateInvariants(state: MatchState): void {
  const seenObjectIds = new Map<string, string>();

  for (const [zoneId, zone] of Object.entries(state.zones)) {
    if (zone.id !== zoneId) {
      throw new Error(`Zone key ${zoneId} does not match zone id ${zone.id}`);
    }

    if (zone.capacity !== undefined && zone.objectIds.length > zone.capacity) {
      throw new Error(`Zone ${zoneId} exceeds capacity ${zone.capacity}`);
    }

    const uniqueIds = new Set(zone.objectIds);
    if (uniqueIds.size !== zone.objectIds.length) {
      throw new Error(`Zone ${zoneId} contains duplicate object ids`);
    }

    zone.objectIds.forEach((objectId, position) => {
      const object = state.objects[objectId];

      if (!object) {
        throw new Error(`Zone ${zoneId} references missing object ${objectId}`);
      }

      if (object.zoneId !== zoneId) {
        throw new Error(`Object ${objectId} thinks it is in ${object.zoneId}, but zone ${zoneId} contains it`);
      }

      if (object.position !== position) {
        throw new Error(`Object ${objectId} has position ${object.position}, expected ${position}`);
      }

      const previousZoneId = seenObjectIds.get(objectId);
      if (previousZoneId) {
        throw new Error(`Object ${objectId} appears in both ${previousZoneId} and ${zoneId}`);
      }

      seenObjectIds.set(objectId, zoneId);
    });
  }

  for (const [objectId, object] of Object.entries(state.objects)) {
    if (object.id !== objectId) {
      throw new Error(`Object key ${objectId} does not match object id ${object.id}`);
    }

    const zone = state.zones[object.zoneId];
    if (!zone) {
      throw new Error(`Object ${objectId} references missing zone ${object.zoneId}`);
    }

    if (!seenObjectIds.has(objectId)) {
      throw new Error(`Object ${objectId} is not present in its zone ${object.zoneId}`);
    }
  }
}
