import { projectEvent, type MatchEvent, type ViewerContext } from "../../engine-core/src/index.ts";
import type { InMemoryMatchService, StoredMatch } from "./match-service.ts";

export interface SseWritable {
  write(chunk: string): unknown;
  end?(): unknown;
  on?(event: "close", listener: () => void): unknown;
}

export interface SseMessage {
  id?: string;
  event?: string;
  data?: unknown;
  retryMs?: number;
}

export interface SseStreamOptions {
  lastSequence?: number;
  includeBacklog?: boolean;
}

export const SSE_HEADERS = {
  "content-type": "text/event-stream",
  "cache-control": "no-cache",
  connection: "keep-alive"
} as const;

export function encodeSseMessage(message: SseMessage): string {
  const lines: string[] = [];

  if (message.id !== undefined) {
    lines.push(`id: ${message.id}`);
  }

  if (message.event !== undefined) {
    lines.push(`event: ${message.event}`);
  }

  if (message.retryMs !== undefined) {
    lines.push(`retry: ${message.retryMs}`);
  }

  if (message.data !== undefined) {
    const data = typeof message.data === "string" ? message.data : JSON.stringify(message.data);
    for (const line of data.split(/\r?\n/)) {
      lines.push(`data: ${line}`);
    }
  }

  return `${lines.join("\n")}\n\n`;
}

export function projectedBacklogEvents(match: StoredMatch, viewer: ViewerContext, lastSequence = 0): MatchEvent[] {
  return match.events
    .filter((event) => event.sequence > lastSequence)
    .map((event) => projectEvent(event, match.state, viewer))
    .filter((event): event is MatchEvent => event !== null);
}

export function writeSseEvents(sink: SseWritable, events: MatchEvent[]): void {
  for (const event of events) {
    sink.write(
      encodeSseMessage({
        id: String(event.sequence),
        event: event.type,
        data: event
      })
    );
  }
}

export function attachMatchEventSseStream(
  service: InMemoryMatchService,
  matchId: string,
  viewer: ViewerContext,
  sink: SseWritable,
  options: SseStreamOptions = {}
): () => void {
  const match = service.getMatch(matchId);
  if (!match) {
    throw new Error(`Match ${matchId} does not exist`);
  }

  sink.write(encodeSseMessage({ event: "ready", data: { matchId, lastSequence: match.state.lastSequence } }));

  if (options.includeBacklog ?? true) {
    writeSseEvents(sink, projectedBacklogEvents(match, viewer, options.lastSequence ?? 0));
  }

  const unsubscribe = service.subscribe(matchId, (events) => {
    const latest = service.getMatch(matchId);
    if (!latest) {
      return;
    }

    const projected = events.map((event) => projectEvent(event, latest.state, viewer)).filter((event): event is MatchEvent => event !== null);
    writeSseEvents(sink, projected);
  });

  sink.on?.("close", unsubscribe);
  return unsubscribe;
}
