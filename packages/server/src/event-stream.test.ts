import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attachMatchEventSseStream,
  encodeSseMessage,
  projectedBacklogEvents,
  type SseWritable
} from "./event-stream.ts";
import { InMemoryMatchService } from "./match-service.ts";

class MemorySseSink implements SseWritable {
  chunks: string[] = [];
  closeListener?: () => void;

  write(chunk: string): void {
    this.chunks.push(chunk);
  }

  on(event: "close", listener: () => void): void {
    if (event === "close") {
      this.closeListener = listener;
    }
  }

  close(): void {
    this.closeListener?.();
  }

  text(): string {
    return this.chunks.join("");
  }
}

test("encodes server-sent events with id, event, and JSON data", () => {
  assert.equal(
    encodeSseMessage({
      id: "7",
      event: "damage_dealt",
      data: { amount: 3 }
    }),
    "id: 7\nevent: damage_dealt\ndata: {\"amount\":3}\n\n"
  );
});

test("projected SSE backlog redacts hidden identity events", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-identity");
  const events = projectedBacklogEvents(match, { playerId: "p2", seatId: "seat_2" });
  const hiddenRoleEvent = events.find((event) => {
    const payload = event.payload as { object?: { id?: string; objectType?: string } };
    return event.type === "object_created" && payload.object?.objectType === "hidden";
  });

  assert.ok(hiddenRoleEvent);
  const payload = hiddenRoleEvent.payload as { object?: { id?: string; objectType?: string; templateId?: string } };
  assert.match(payload.object?.id ?? "", /^hidden_/);
  assert.equal(payload.object?.templateId, undefined);
  assert.doesNotMatch(JSON.stringify(events), /role_p3/);
});

test("attached SSE stream writes future projected match events and can unsubscribe", () => {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  const sink = new MemorySseSink();
  const unsubscribe = attachMatchEventSseStream(service, match.id, { playerId: "p1" }, sink, {
    includeBacklog: false,
    lastSequence: match.state.lastSequence
  });

  service.submitCommand(match.id, {
    id: "cmd_stream_firebolt",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });

  assert.match(sink.text(), /event: ready/);
  assert.match(sink.text(), /event: damage_dealt/);
  assert.match(sink.text(), /event: outcome_declared/);

  const chunksBeforeUnsubscribe = sink.chunks.length;
  unsubscribe();
  assert.throws(() =>
    service.submitCommand(match.id, {
      id: "cmd_after_stream_done",
      matchId: match.id,
      playerId: "p1",
      type: "execute_behavior",
      payload: {
        behaviorId: "nova",
        sourceObjectId: "card_nova",
        selections: {}
      }
    })
  );
  assert.equal(sink.chunks.length, chunksBeforeUnsubscribe);
});
