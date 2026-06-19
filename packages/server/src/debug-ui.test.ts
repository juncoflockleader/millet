import { test } from "node:test";
import assert from "node:assert/strict";
import { renderMatchDebugHtml } from "./debug-ui.ts";
import { InMemoryMatchService } from "./match-service.ts";

function completedDuel() {
  const service = new InMemoryMatchService();
  const match = service.createMatch("sample-duel");
  return service.submitCommand(match.id, {
    id: "cmd_firebolt_debug_html",
    matchId: match.id,
    playerId: "p1",
    type: "execute_behavior",
    payload: {
      behaviorId: "firebolt",
      sourceObjectId: "card_firebolt",
      selections: { target: ["p2"] }
    }
  });
}

test("renderMatchDebugHtml builds a static match debugger page", () => {
  const match = completedDuel();
  const html = renderMatchDebugHtml(match.state, match.events);

  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<h1>sample_duel_match<\/h1>/);
  assert.match(html, /Players/);
  assert.match(html, /Open Prompts/);
  assert.match(html, /Event Types/);
  assert.match(html, /Objects/);
  assert.match(html, /class="object-list"/);
  assert.match(html, /card_firebolt/);
  assert.match(html, /Timeline/);
  assert.match(html, /id="eventFilter"/);
  assert.match(html, /id="timelineCount"/);
  assert.match(html, /data-event-search=/);
  assert.match(html, /damage_dealt/);
  assert.match(html, /outcome_declared/);
  assert.match(html, /millet-debug-data/);
});

test("renderMatchDebugHtml escapes unsafe visible and embedded data", () => {
  const match = completedDuel();
  const events = structuredClone(match.events);
  events[0]!.payload = {
    label: "</script><script>bad()</script>",
    html: "<b>bold</b>"
  };

  const html = renderMatchDebugHtml(match.state, events, {
    title: "<Debug>"
  });

  assert.match(html, /<title>&lt;Debug&gt;<\/title>/);
  assert.match(html, /&lt;b&gt;bold&lt;\/b&gt;/);
  assert.match(html, /<\\\/script><script>bad\(\)<\\\/script>/);
  assert.doesNotMatch(html, /<\/script><script>bad\(\)<\/script>/);
});
