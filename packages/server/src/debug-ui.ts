import type { MatchEvent, MatchState } from "../../engine-core/src/index.ts";
import { createMetricsSnapshot } from "./metrics.ts";

export interface MatchDebugHtmlOptions {
  title?: string;
  eventLimit?: number;
}

interface HtmlCell {
  html: string;
}

export function renderMatchDebugHtml(
  state: MatchState,
  events: readonly MatchEvent[],
  options: MatchDebugHtmlOptions = {}
): string {
  const snapshot = createMetricsSnapshot(state, events);
  const eventLimit = options.eventLimit ?? 200;
  const timelineEvents = events.slice(Math.max(0, events.length - eventLimit));
  const title = options.title ?? `Millet Debug - ${state.matchId}`;
  const eventTypeRows = Object.entries(snapshot.metrics.eventTypes)
    .map(([type, count]) => tableRow([type, String(count)]))
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --surface: #ffffff;
      --line: #d7dce3;
      --text: #19202a;
      --muted: #647184;
      --blue: #2457d6;
      --green: #177245;
      --red: #b92f2f;
      --amber: #8a5b00;
      --ink: #0f1722;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    header {
      background: var(--ink);
      color: white;
      padding: 24px clamp(16px, 4vw, 48px);
    }

    header h1 {
      margin: 0 0 8px;
      font-size: clamp(24px, 4vw, 34px);
      letter-spacing: 0;
    }

    header p {
      margin: 0;
      color: #c6d0df;
      overflow-wrap: anywhere;
    }

    main {
      max-width: 1360px;
      margin: 0 auto;
      padding: 24px clamp(16px, 4vw, 48px) 48px;
    }

    section {
      margin: 0 0 24px;
    }

    h2 {
      margin: 0 0 12px;
      font-size: 18px;
      letter-spacing: 0;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }

    .metric {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 14px;
      min-height: 86px;
    }

    .metric strong {
      display: block;
      font-size: 24px;
      line-height: 1.1;
      color: var(--blue);
      overflow-wrap: anywhere;
    }

    .metric span {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
    }

    .columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 18px;
      align-items: start;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    .panel h2 {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: #fdfefe;
      margin: 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th,
    td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      background: #fafbfc;
    }

    tr:last-child td {
      border-bottom: 0;
    }

    .status {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 700;
      background: #e8eefc;
      color: var(--blue);
    }

    .status.dead,
    .status.lost,
    .status.completed {
      background: #f9e6e6;
      color: var(--red);
    }

    .status.alive,
    .status.won,
    .status.active {
      background: #e4f5ec;
      color: var(--green);
    }

    .status.open,
    .status.pending,
    .status.dying {
      background: #fff2d0;
      color: var(--amber);
    }

    .timeline {
      display: grid;
      gap: 10px;
    }

    .timeline-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      margin: 0 0 12px;
    }

    .timeline-toolbar input {
      min-width: min(100%, 320px);
      flex: 1;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 9px 10px;
      font: inherit;
      background: var(--surface);
      color: var(--text);
    }

    .timeline-count {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .muted {
      color: var(--muted);
    }

    details.object-list summary {
      cursor: pointer;
      color: var(--blue);
      font-weight: 700;
    }

    details.object-list ul {
      list-style: none;
      margin: 10px 0 0;
      padding: 0;
      display: grid;
      gap: 8px;
    }

    .object-item {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      background: #fbfcfe;
    }

    .object-id {
      display: block;
      font-weight: 700;
      color: var(--text);
    }

    .object-meta {
      display: block;
      color: var(--muted);
      font-size: 12px;
    }

    details.event {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
    }

    details.event summary {
      cursor: pointer;
      padding: 10px 12px;
      display: flex;
      gap: 12px;
      align-items: center;
      list-style: none;
    }

    details.event summary::-webkit-details-marker {
      display: none;
    }

    .seq {
      min-width: 64px;
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }

    .type {
      font-weight: 700;
      color: var(--blue);
    }

    pre {
      margin: 0;
      padding: 12px;
      border-top: 1px solid var(--line);
      background: #101820;
      color: #eaf2ff;
      overflow: auto;
      font-size: 12px;
    }

    .empty {
      padding: 14px 16px;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(state.matchId)}</h1>
    <p>${escapeHtml(state.gameDefinitionId)} ${escapeHtml(state.gameDefinitionVersion)} | ${escapeHtml(snapshot.stateHash)}</p>
  </header>
  <main>
    <section class="summary-grid" aria-label="Match summary">
      ${metric("Status", html(statusBadge(state.status)))}
      ${metric("Last Sequence", String(state.lastSequence))}
      ${metric("Events", String(events.length))}
      ${metric("Turn", String(state.turn.turnNumber))}
      ${metric("Phase", state.turn.phaseId ?? "none")}
      ${metric("Active Player", state.turn.activePlayerId ?? "none")}
      ${metric("Open Prompts", String(snapshot.openPrompts.length))}
      ${metric("Outcomes", String(state.outcomes.length))}
    </section>

    <section class="columns">
      <div class="panel">
        <h2>Players</h2>
        ${table(["Player", "Status", "Faction", "Health"], snapshot.players.map((player) => [
          player.id,
          html(statusBadge(player.status)),
          player.factionId ?? "",
          player.health === undefined ? "" : `${player.health}/${player.maxHealth ?? ""}`
        ]))}
      </div>

      <div class="panel">
        <h2>Open Prompts</h2>
        ${snapshot.openPrompts.length === 0 ? empty("No open prompts.") : table(["Prompt", "Type", "Responder", "Opened"], snapshot.openPrompts.map((prompt) => [
          prompt.id,
          prompt.promptType,
          prompt.currentResponderId ?? prompt.responderIds.join(", "),
          String(prompt.openedAtSequence)
        ]))}
      </div>

      <div class="panel">
        <h2>Event Types</h2>
        <table>
          <thead><tr><th>Type</th><th>Count</th></tr></thead>
          <tbody>${eventTypeRows}</tbody>
        </table>
      </div>
    </section>

    <section class="columns">
      <div class="panel">
        <h2>Zones</h2>
        ${table(["Zone", "Count", "Objects"], Object.values(state.zones).sort((left, right) => left.id.localeCompare(right.id)).map((zone) => [
          zone.id,
          String(zone.objectIds.length),
          html(renderZoneObjects(state, zone.objectIds))
        ]))}
      </div>

      <div class="panel">
        <h2>Outcomes</h2>
        ${state.outcomes.length === 0 ? empty("No outcomes declared.") : table(["Outcome", "Status", "Results"], state.outcomes.map((outcome) => [
          outcome.id,
          html(statusBadge(outcome.status)),
          outcome.results.map((result) => `${result.playerId}: ${result.status} (${result.reason})`).join("; ")
        ]))}
      </div>
    </section>

    <section class="columns">
      <div class="panel">
        <h2>Objects</h2>
        ${table(["Object", "Type", "Owner", "Controller", "Zone", "Tags"], Object.values(state.objects).sort((left, right) => left.id.localeCompare(right.id)).map((object) => [
          html(`<details class="object-list"><summary>${escapeHtml(object.id)}</summary><pre>${escapeHtml(JSON.stringify(object, null, 2))}</pre></details>`),
          object.objectType,
          object.ownerId ?? "",
          object.controllerId ?? "",
          object.zoneId,
          object.tags.join(", ")
        ]))}
      </div>
    </section>

    <section>
      <h2>Timeline</h2>
      <div class="timeline-toolbar">
        <input id="eventFilter" type="search" placeholder="Filter timeline" aria-label="Filter timeline events">
        <span class="timeline-count" id="timelineCount">${timelineEvents.length} / ${timelineEvents.length} events</span>
      </div>
      <div class="timeline">
        ${timelineEvents.map(renderEvent).join("") || empty("No events.")}
      </div>
    </section>

    <script type="application/json" id="millet-debug-data">${escapeScriptJson(JSON.stringify({ snapshot, state, events }, null, 2))}</script>
    <script>
      (() => {
        const input = document.getElementById("eventFilter");
        const count = document.getElementById("timelineCount");
        const eventNodes = Array.from(document.querySelectorAll("details.event"));

        function applyFilter() {
          const query = input ? input.value.trim().toLowerCase() : "";
          let visible = 0;

          for (const node of eventNodes) {
            const matches = query.length === 0 || String(node.dataset.eventSearch || "").includes(query);
            node.hidden = !matches;
            if (matches) {
              visible += 1;
            }
          }

          if (count) {
            count.textContent = visible + " / " + eventNodes.length + " events";
          }
        }

        if (input) {
          input.addEventListener("input", applyFilter);
        }

        applyFilter();
      })();
    </script>
  </main>
</body>
</html>
`;
}

function metric(label: string, value: string | HtmlCell): string {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${cellHtml(value)}</strong></div>`;
}

function table(headers: string[], rows: (string | HtmlCell)[][]): string {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => tableRow(row))
    .join("")}</tbody></table>`;
}

function tableRow(cells: (string | HtmlCell)[]): string {
  return `<tr>${cells.map((cell) => `<td>${cellHtml(cell)}</td>`).join("")}</tr>`;
}

function html(value: string): HtmlCell {
  return { html: value };
}

function cellHtml(value: string | HtmlCell): string {
  return typeof value === "string" ? escapeHtml(value) : value.html;
}

function empty(text: string): string {
  return `<div class="empty">${escapeHtml(text)}</div>`;
}

function statusBadge(status: string): string {
  return `<span class="status ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

function renderZoneObjects(state: MatchState, objectIds: string[]): string {
  if (objectIds.length === 0) {
    return `<span class="muted">empty</span>`;
  }

  return `<details class="object-list"><summary>${objectIds.length} object${objectIds.length === 1 ? "" : "s"}</summary><ul>${objectIds
    .map((objectId) => {
      const object = state.objects[objectId];
      if (!object) {
        return `<li class="object-item"><span class="object-id">${escapeHtml(objectId)}</span><span class="object-meta">missing object state</span></li>`;
      }

      const meta = [object.templateId, object.objectType, object.tags.join(" ")].filter(Boolean).join(" | ");
      return `<li class="object-item"><span class="object-id">${escapeHtml(object.id)}</span><span class="object-meta">${escapeHtml(meta)}</span></li>`;
    })
    .join("")}</ul></details>`;
}

function renderEvent(event: MatchEvent): string {
  const search = `${event.sequence} ${event.type} ${event.transactionId} ${JSON.stringify(event.payload)}`.toLowerCase();
  return `<details class="event" data-event-search="${escapeHtml(search)}">
    <summary><span class="seq">#${event.sequence}</span><span class="type">${escapeHtml(event.type)}</span><span>${escapeHtml(event.transactionId)}</span></summary>
    <pre>${escapeHtml(JSON.stringify(event, null, 2))}</pre>
  </details>`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeScriptJson(value: string): string {
  return value.replaceAll("</script", "<\\/script");
}
