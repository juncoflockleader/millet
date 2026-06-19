const CARD_DEFS = {
  firebolt: {
    name: "Firebolt",
    manaCost: 2,
    text: "Deal 3 damage to the enemy hero.",
    action: "Cast",
    art: "/assets/cards/firebolt.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  nova: {
    name: "Nova",
    manaCost: 2,
    text: "Deal 2 damage to both heroes.",
    action: "Cast",
    art: "/assets/cards/nova.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  coin: {
    name: "Coin",
    manaCost: 0,
    text: "Gain 1 mana this turn.",
    action: "Play",
    art: "/assets/cards/coin.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  reward: {
    name: "Reward",
    manaCost: 0,
    text: "A drawn test card.",
    action: "",
    art: "/assets/cards/reward.png",
    display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }]
  },
  loot_minion: {
    name: "Loot Minion",
    stats: { attack: 1, health: 1 },
    text: "Attack for 1 damage.",
    action: "Attack",
    art: "/assets/cards/loot-minion.png",
    display: [
      { property: "attack", source: "stats", slot: "bottom-left", icon: "sword", label: "Attack" },
      { property: "health", source: "stats", slot: "bottom-right", icon: "heart", label: "Health" }
    ]
  },
  training_axe: {
    name: "Training Axe",
    stats: { attack: 2, durability: 2 },
    text: "Attack for 2 damage. Loses durability.",
    action: "Swing",
    art: "/assets/cards/training-axe.png",
    display: [
      { property: "attack", source: "stats", slot: "bottom-left", icon: "sword", label: "Attack" },
      { property: "durability", source: "counter", slot: "bottom-right", icon: "durability", label: "Durability" }
    ]
  }
};

const HERO_DEFS = {
  p1: {
    name: "Player 1",
    title: "Ember Adept",
    art: "/assets/cards/firebolt.png",
    ability: {
      name: "Focus Flame",
      behaviorId: "hero_focus",
      text: "Spend 2 mana to deal 1 damage to the enemy hero.",
      action: "Focus",
      targetMode: "enemyHero",
      display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }],
      manaCost: 2
    }
  },
  p2: {
    name: "Player 2",
    title: "Ash Warden",
    art: "/assets/cards/nova.png",
    ability: {
      name: "Focus Flame",
      behaviorId: "hero_focus",
      text: "Spend 2 mana to deal 1 damage to the enemy hero.",
      action: "Focus",
      targetMode: "enemyHero",
      display: [{ property: "manaCost", source: "template", slot: "top-left", icon: "mana", label: "Cost" }],
      manaCost: 2
    }
  }
};

const EFFECTS = {
  firebolt: { sheet: "/assets/effects/firebolt-sheet.png", className: "firebolt" },
  nova: { sheet: "/assets/effects/nova-sheet.png", className: "nova" },
  coin: { sheet: "/assets/effects/coin-sheet.png", className: "coin" },
  attack: { sheet: "/assets/effects/attack-slash-sheet.png", className: "attack" }
};

const PLAY_AREA = {
  width: 1120,
  height: 620,
  minScale: 0.2
};

const KEYWORDS = {
  attack: {
    title: "Attack",
    body: "A card or object deals combat damage to the enemy hero. Minions exhaust after attacking."
  },
  damage: {
    title: "Damage",
    body: "Damage lowers health. A hero at zero or less health loses unless both heroes die together."
  },
  draw: {
    title: "Draw",
    body: "Move the top card of a deck into that player's hand. Empty decks can cause fatigue damage."
  },
  drawn: {
    title: "Draw",
    body: "A drawn card moved from deck to hand."
  },
  durability: {
    title: "Durability",
    body: "A weapon counter. Weapon attacks spend durability; the weapon is discarded at zero."
  },
  mana: {
    title: "Mana",
    body: "A spendable resource used to pay card costs during the active player's turn."
  }
};

const PLAYER_NAMES = {
  p1: "Player 1",
  p2: "Player 2"
};

let matchId = "";
let selectedPlayerId = "p1";
let state = null;
let events = [];
let commandCounter = 0;
let effectCounter = 0;
let selectedAction = null;

const dom = {
  matchLine: document.querySelector("#matchLine"),
  playArea: document.querySelector("#playArea"),
  arenaScaleBox: document.querySelector("#arenaScaleBox"),
  arena: document.querySelector("#arena"),
  effectLayer: document.querySelector("#effectLayer"),
  tooltipLayer: document.querySelector("#tooltipLayer"),
  newMatchButton: document.querySelector("#newMatchButton"),
  refreshButton: document.querySelector("#refreshButton"),
  p1Panel: document.querySelector("#p1Panel"),
  p2Panel: document.querySelector("#p2Panel"),
  selectP1: document.querySelector("#selectP1"),
  selectP2: document.querySelector("#selectP2"),
  turnText: document.querySelector("#turnText"),
  statusText: document.querySelector("#statusText"),
  endTurnButton: document.querySelector("#endTurnButton"),
  battleLog: document.querySelector("#battleLog")
};

dom.newMatchButton.addEventListener("click", () => startMatch());
dom.refreshButton.addEventListener("click", () => refresh());
dom.endTurnButton.addEventListener("click", () => submitCommand("end_turn", {}));
dom.selectP1.addEventListener("click", () => selectPlayer("p1"));
dom.selectP2.addEventListener("click", () => selectPlayer("p2"));

installViewportFitter();
render();

async function startMatch() {
  const response = await fetch("/matches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rulesetId: "sample-duel", demoDuel: true })
  });
  const payload = await readJson(response);
  if (!response.ok) {
    showError(payload.message ?? payload.error ?? "Could not create match");
    return;
  }

  matchId = payload.matchId;
  selectedPlayerId = "p1";
  selectedAction = null;
  await refresh();
}

async function refresh() {
  if (!matchId) {
    return;
  }

  const [statePayload, replayPayload] = await Promise.all([
    fetchJson(`/matches/${matchId}/state?admin=true`, { "x-millet-admin": "true" }),
    fetchJson(`/matches/${matchId}/replay?admin=true`, { "x-millet-admin": "true" })
  ]);
  state = statePayload.state;
  events = replayPayload.events ?? [];
  render();
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  const payload = await readJson(response);
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `Request failed: ${response.status}`);
  }
  return payload;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function submitCommand(type, payload, playerId = selectedPlayerId) {
  if (!state || !matchId) {
    return;
  }

  const actingPlayerId = playerId;
  const command = {
    id: `cmd_demo_${actingPlayerId}_${++commandCounter}`,
    matchId,
    playerId: actingPlayerId,
    type,
    payload
  };

  const response = await fetch(`/matches/${matchId}/commands`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-millet-user-id": actingPlayerId === "p1" ? "u1" : "u2"
    },
    body: JSON.stringify({ command })
  });
  const result = await readJson(response);
  if (!response.ok) {
    showError(result.message ?? result.error ?? "Command rejected");
    return;
  }

  await refresh();
  playCommandEffect(command);
  const activePlayerId = state?.turn?.activePlayerId;
  if (activePlayerId) {
    selectedPlayerId = activePlayerId;
    render();
  }
}

function selectPlayer(playerId) {
  selectedPlayerId = playerId;
  render();
}

function render() {
  dom.refreshButton.disabled = !matchId;
  dom.endTurnButton.disabled = !canSelectedPlayerAct();
  dom.selectP1.classList.toggle("selected", selectedPlayerId === "p1");
  dom.selectP2.classList.toggle("selected", selectedPlayerId === "p2");

  if (!state) {
    dom.matchLine.textContent = "Start a match to play a basic 1v1 engine demo.";
    dom.turnText.textContent = "No match";
    dom.statusText.textContent = "Waiting";
    dom.p1Panel.innerHTML = "";
    dom.p2Panel.innerHTML = "";
    dom.battleLog.innerHTML = "";
    selectedAction = null;
    return;
  }

  dom.matchLine.textContent = `${matchId} · sequence ${state.lastSequence}`;
  const activePlayerId = state.turn.activePlayerId ?? "p1";
  dom.turnText.textContent = `${PLAYER_NAMES[activePlayerId] ?? activePlayerId} to act`;
  dom.statusText.innerHTML = state.status === "completed" ? `<span class="result">Completed</span>` : `Phase ${state.turn.phaseId ?? "setup"}`;

  dom.p2Panel.innerHTML = renderPlayer("p2");
  dom.p1Panel.innerHTML = renderPlayer("p1");
  bindActionButtons();
  bindNaturalActions();
  bindTooltips();
  paintSelectionState();
  renderLog();
}

function renderPlayer(playerId) {
  const player = state.players[playerId];
  const opponentId = opponentOf(playerId);
  const zones = [
    { id: `zone_board_${playerId}`, label: "Board", behaviorId: "minion_attack", zoneKind: "board", target: opponentId },
    { id: `zone_weapon_${playerId}`, label: "Weapon", behaviorId: "weapon_attack", zoneKind: "weapon", target: opponentId },
    { id: `zone_hand_${playerId}`, label: "Hand", zoneKind: "hand", target: opponentId }
  ];

  return `
    ${renderHeroCard(playerId)}
    <section class="zones">
      <div class="zone">
        <h3>Board / Weapon</h3>
        <div class="cards">
          ${zones.slice(0, 2).flatMap((zone) => cardsInZone(zone.id).map((object) => renderCard(playerId, object, zone))).join("") || `<div class="empty">No board pieces</div>`}
        </div>
      </div>
      <div class="zone">
        <h3>Hand</h3>
        <div class="cards">
          ${cardsInZone(`zone_hand_${playerId}`).map((object) => renderCard(playerId, object, { zoneKind: "hand", target: opponentId })).join("") || `<div class="empty">No cards</div>`}
        </div>
      </div>
    </section>
  `;
}

function renderHeroCard(playerId) {
  const player = state.players[playerId];
  const hero = HERO_DEFS[playerId] ?? { name: PLAYER_NAMES[playerId] ?? playerId, title: "Hero", ability: null };
  const health = player.resources.health;
  const mana = player.resources.mana;
  const isActive = state.turn.activePlayerId === playerId;
  const ability = hero.ability ? actionForHero(playerId) : null;
  const disabled = !ability;
  const tooltip = [
    hero.title,
    `Health: ${health.current}/${health.max ?? health.current}`,
    `Mana: ${mana.current}/${mana.max ?? mana.current}`,
    hero.ability ? `${hero.ability.name}: ${hero.ability.text}` : "No hero ability"
  ].join("\n");

  return `
    <section
      class="hero hero-card ${isActive ? "active-hero" : ""} ${disabled ? "disabled-card" : ""}"
      data-target-player="${playerId}"
      data-target-kind="hero"
      ${actionDataAttrs(ability)}
      draggable="${ability ? "true" : "false"}"
      data-tooltip-title="${escapeAttr(hero.name)}"
      data-tooltip-body="${escapeAttr(tooltip)}"
      tabindex="0"
    >
      ${hero.ability ? renderDisplayProperties(hero.ability, {}, "hero-ability") : ""}
      <div class="hero-art" style="--hero-art: url('${escapeHtml(hero.art ?? "")}')" aria-hidden="true"></div>
      <div class="hero-title">
        <h2>${escapeHtml(hero.name)}</h2>
        ${isActive ? `<span class="active-badge">Active</span>` : `<span class="meta">${escapeHtml(player.status)}</span>`}
      </div>
      <div class="hero-subtitle">${escapeHtml(hero.title)}</div>
      <div class="resource-grid">
        <div class="resource stat-health" data-stat-icon="heart"><span class="meta">Health</span><strong class="${health.current <= 3 ? "danger" : ""}">${health.current}</strong></div>
        <div class="resource stat-mana" data-stat-icon="mana"><span class="meta">Mana</span><strong>${mana.current}/${mana.max ?? mana.current}</strong></div>
      </div>
      ${hero.ability ? `
        <div class="hero-ability-text">${renderRulesText(hero.ability.text)}</div>
        <button
          class="hero-action"
          type="button"
          data-player="${playerId}"
          ${disabled ? "disabled" : ""}
        >${escapeHtml(hero.ability.action)}</button>
      ` : ""}
      ${renderOutcome(playerId)}
    </section>
  `;
}

function renderCard(playerId, object, context) {
  const info = CARD_DEFS[object.templateId] ?? { name: object.templateId ?? object.id, text: object.objectType, action: "Use", display: [] };
  const action = actionForObject(playerId, object, context);
  const disabled = !action;
  const detail = cardDetail(info, object);
  const art = info.art ? ` style="--card-art: url('${escapeHtml(info.art)}')"` : "";
  const tooltip = cardTooltipBody(info, object, playerId, detail, context);
  return `
    <article
      class="card ${disabled ? "disabled-card" : ""}"
      data-template="${escapeHtml(object.templateId ?? "unknown")}"
      ${actionDataAttrs(action)}
      data-tooltip-title="${escapeAttr(info.name)}"
      data-tooltip-body="${escapeAttr(tooltip)}"
      draggable="${action ? "true" : "false"}"
      tabindex="0"
      aria-label="${escapeAttr(`${info.name}. ${detail}. ${info.text}`)}"
    >
      ${renderDisplayProperties(info, object)}
      <div class="card-art"${art} aria-hidden="true"></div>
      <div>
        <div class="name">${escapeHtml(info.name)}</div>
        <div class="meta">${escapeHtml(detail)}</div>
      </div>
      <div class="text">${renderRulesText(info.text)}</div>
      <button
        class="card-action"
        type="button"
        data-player="${playerId}"
        data-object="${object.id}"
        data-zone-kind="${context.zoneKind}"
        ${disabled ? "disabled" : ""}
      >${escapeHtml(info.action || "Use")}</button>
    </article>
  `;
}

function actionDataAttrs(action) {
  if (!action) {
    return "";
  }

  return [
    `data-action-player="${escapeAttr(action.playerId)}"`,
    `data-action-behavior="${escapeAttr(action.behaviorId)}"`,
    action.sourceObjectId ? `data-action-source-object="${escapeAttr(action.sourceObjectId)}"` : "",
    `data-action-target-mode="${escapeAttr(action.targetMode)}"`,
    action.targetSelector ? `data-action-target-selector="${escapeAttr(action.targetSelector)}"` : ""
  ].filter(Boolean).join(" ");
}

function cardDetail(info, object) {
  if (object.exhausted) {
    return "Exhausted";
  }
  if (object.counters?.durability !== undefined) {
    return `Durability ${object.counters.durability}`;
  }
  if (info.manaCost !== undefined) {
    return `Cost ${info.manaCost}`;
  }
  return "Ready";
}

function renderDisplayProperties(info, object, extraClass = "") {
  const properties = info.display ?? [];
  return properties
    .map((property) => {
      const value = displayPropertyValue(info, object, property);
      if (value === undefined || value === null || value === "") {
        return "";
      }
      return `
        <span
          class="property-badge slot-${escapeAttr(property.slot)} icon-${escapeAttr(property.icon ?? property.property)} ${escapeAttr(extraClass)}"
          aria-label="${escapeAttr(`${property.label ?? property.property}: ${value}`)}"
          title="${escapeAttr(`${property.label ?? property.property}: ${value}`)}"
        >${escapeHtml(value)}</span>
      `;
    })
    .join("");
}

function displayPropertyValue(info, object, property) {
  if (property.source === "counter") {
    return object.counters?.[property.property] ?? info.stats?.[property.property];
  }
  if (property.source === "stats") {
    return object.stats?.[property.property] ?? info.stats?.[property.property];
  }
  if (property.source === "template" || property.source === undefined) {
    return info[property.property];
  }
  if (property.source === "metadata") {
    return info.metadata?.[property.property];
  }
  return info[property.property];
}

function cardTooltipBody(info, object, playerId, detail, context) {
  const owner = object.ownerId ?? playerId;
  const parts = [
    info.text,
    detail,
    `Owner: ${PLAYER_NAMES[owner] ?? owner}`,
    `Zone: ${context.zoneKind}`
  ];
  if (object.exhausted) {
    parts.push("Status: Exhausted");
  }
  if (object.counters?.durability !== undefined) {
    parts.push(`Durability: ${object.counters.durability}`);
  }
  return parts.join("\n");
}

function renderRulesText(text) {
  const escaped = escapeHtml(text);
  return escaped.replace(/\b(Attack|attack|Damage|damage|Draw|draw|drawn|Durability|durability|Mana|mana)\b/g, (term) => {
    const keyword = KEYWORDS[term.toLowerCase()];
    if (!keyword) {
      return term;
    }
    return `<button class="keyword" type="button" data-tooltip-title="${escapeAttr(keyword.title)}" data-tooltip-body="${escapeAttr(keyword.body)}">${term}</button>`;
  });
}

function actionForHero(playerId) {
  const hero = HERO_DEFS[playerId];
  const ability = hero?.ability;
  const player = state?.players[playerId];
  if (!ability || !player || !canPlayerAct(playerId) || (player.resources.mana?.current ?? 0) < ability.manaCost) {
    return null;
  }

  return {
    kind: "hero",
    playerId,
    behaviorId: ability.behaviorId,
    targetMode: ability.targetMode,
    targetSelector: "target"
  };
}

function actionForObject(playerId, object, context) {
  if (!canObjectAct(playerId, object, context)) {
    return null;
  }

  if (context.zoneKind === "hand") {
    if (object.templateId === "coin") {
      return {
        kind: "card",
        playerId,
        behaviorId: "coin",
        sourceObjectId: object.id,
        targetMode: "selfHero"
      };
    }
    if (object.templateId === "firebolt") {
      return {
        kind: "card",
        playerId,
        behaviorId: "firebolt",
        sourceObjectId: object.id,
        targetMode: "enemyHero",
        targetSelector: "target"
      };
    }
    if (object.templateId === "nova") {
      return {
        kind: "card",
        playerId,
        behaviorId: "nova",
        sourceObjectId: object.id,
        targetMode: "battlefield"
      };
    }
  }

  if (context.zoneKind === "board") {
    return {
      kind: "card",
      playerId,
      behaviorId: "minion_attack",
      sourceObjectId: object.id,
      targetMode: "enemyHero",
      targetSelector: "target"
    };
  }

  if (context.zoneKind === "weapon") {
    return {
      kind: "card",
      playerId,
      behaviorId: "weapon_attack",
      sourceObjectId: object.id,
      targetMode: "enemyHero",
      targetSelector: "target"
    };
  }

  return null;
}

function canObjectAct(playerId, object, context) {
  if (!canPlayerAct(playerId) || object.objectType === "hidden") {
    return false;
  }

  if (context.zoneKind === "hand") {
    return ["firebolt", "nova", "coin"].includes(object.templateId);
  }

  if (context.zoneKind === "board") {
    return object.templateId === "loot_minion" && !object.exhausted;
  }

  if (context.zoneKind === "weapon") {
    return object.templateId === "training_axe" && (object.counters?.durability ?? 0) > 0;
  }

  return false;
}

function canSelectedPlayerAct() {
  return canPlayerAct(selectedPlayerId);
}

function canPlayerAct(playerId) {
  if (!state || state.status === "completed") {
    return false;
  }

  return !state.turn.activePlayerId || state.turn.activePlayerId === playerId;
}

function bindActionButtons() {
  document.querySelectorAll(".card-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const source = button.closest("[data-action-behavior]");
      const action = actionFromElement(source);
      if (action) {
        quickApplyAction(action);
      }
    });
  });

  document.querySelectorAll(".hero-action").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const source = button.closest("[data-action-behavior]");
      const action = actionFromElement(source);
      if (action) {
        quickApplyAction(action);
      }
    });
  });
}

function bindNaturalActions() {
  document.querySelectorAll("[data-action-behavior]").forEach((source) => {
    source.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        return;
      }

      const target = event.target.closest("[data-target-player], [data-target-area]");
      if (selectedAction && target && applySelectedToTarget(target)) {
        return;
      }

      const action = actionFromElement(source);
      if (action) {
        selectedAction = action;
        selectedPlayerId = action.playerId;
        paintSelectionState(source);
      }
    });

    source.addEventListener("dragstart", (event) => {
      const action = actionFromElement(source);
      if (!action) {
        event.preventDefault();
        return;
      }
      selectedAction = action;
      selectedPlayerId = action.playerId;
      event.dataTransfer?.setData("text/plain", JSON.stringify(action));
      event.dataTransfer?.setDragImage(source, Math.min(40, source.clientWidth / 2), Math.min(40, source.clientHeight / 2));
      paintSelectionState(source);
    });
  });

  document.querySelectorAll("[data-target-player], [data-target-area]").forEach((target) => {
    target.addEventListener("click", (event) => {
      if (!selectedAction || event.target.closest("button")) {
        return;
      }
      applySelectedToTarget(target);
    });

    target.addEventListener("dragover", (event) => {
      if (selectedAction && isValidTarget(selectedAction, target)) {
        event.preventDefault();
      }
    });

    target.addEventListener("drop", (event) => {
      if (!selectedAction) {
        const data = event.dataTransfer?.getData("text/plain");
        if (data) {
          selectedAction = JSON.parse(data);
        }
      }
      if (selectedAction && isValidTarget(selectedAction, target)) {
        event.preventDefault();
        applySelectedToTarget(target);
      }
    });
  });
}

function actionFromElement(element) {
  if (!element?.dataset?.actionBehavior) {
    return null;
  }

  return {
    kind: element.classList.contains("hero-card") ? "hero" : "card",
    playerId: element.dataset.actionPlayer,
    behaviorId: element.dataset.actionBehavior,
    sourceObjectId: element.dataset.actionSourceObject || undefined,
    targetMode: element.dataset.actionTargetMode,
    targetSelector: element.dataset.actionTargetSelector || undefined
  };
}

function quickApplyAction(action) {
  if (action.targetMode === "enemyHero") {
    return executeAction(action, { playerId: opponentOf(action.playerId) });
  }
  if (action.targetMode === "selfHero") {
    return executeAction(action, { playerId: action.playerId });
  }
  return executeAction(action, { area: "battlefield" });
}

function applySelectedToTarget(target) {
  if (!selectedAction || !isValidTarget(selectedAction, target)) {
    return false;
  }

  const targetInfo = target.dataset.targetPlayer
    ? { playerId: target.dataset.targetPlayer }
    : { area: target.dataset.targetArea };
  executeAction(selectedAction, targetInfo);
  selectedAction = null;
  paintSelectionState();
  return true;
}

function isValidTarget(action, target) {
  if (!action || !target) {
    return false;
  }

  const playerId = target.dataset.targetPlayer;
  const area = target.dataset.targetArea;

  if (action.targetMode === "enemyHero") {
    return Boolean(playerId && playerId !== action.playerId);
  }
  if (action.targetMode === "selfHero") {
    return playerId === action.playerId;
  }
  if (action.targetMode === "battlefield") {
    return area === "battlefield";
  }
  return false;
}

function executeAction(action, target) {
  const payload = {
    behaviorId: action.behaviorId,
    ...(action.sourceObjectId ? { sourceObjectId: action.sourceObjectId } : {})
  };

  if (action.targetSelector && target.playerId) {
    payload.selections = { [action.targetSelector]: [target.playerId] };
  }

  selectedAction = null;
  paintSelectionState();
  return submitCommand("execute_behavior", payload, action.playerId);
}

function paintSelectionState(preferredSource) {
  document.querySelectorAll(".selected-source").forEach((element) => element.classList.remove("selected-source"));
  document.querySelectorAll(".valid-target").forEach((element) => element.classList.remove("valid-target"));

  if (!selectedAction) {
    return;
  }

  const source =
    preferredSource ??
    document.querySelector(
      selectedAction.sourceObjectId
        ? `[data-action-source-object="${CSS.escape(selectedAction.sourceObjectId)}"]`
        : `.hero-card[data-action-player="${CSS.escape(selectedAction.playerId)}"]`
    );
  source?.classList.add("selected-source");

  document.querySelectorAll("[data-target-player], [data-target-area]").forEach((target) => {
    target.classList.toggle("valid-target", isValidTarget(selectedAction, target));
  });
}

function bindTooltips() {
  document.querySelectorAll("[data-tooltip-title][data-tooltip-body]").forEach((target) => {
    target.addEventListener("pointerenter", (event) => showTooltip(target, event));
    target.addEventListener("pointermove", (event) => positionTooltip(event.clientX, event.clientY));
    target.addEventListener("pointerleave", hideTooltip);
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("blur", hideTooltip);
  });
}

function showTooltip(target, event) {
  if (!dom.tooltipLayer) {
    return;
  }

  dom.tooltipLayer.innerHTML = `
    <strong>${escapeHtml(target.dataset.tooltipTitle ?? "")}</strong>
    <span>${escapeHtml(target.dataset.tooltipBody ?? "").replaceAll("\n", "<br>")}</span>
  `;
  dom.tooltipLayer.hidden = false;

  if (event && "clientX" in event) {
    positionTooltip(event.clientX, event.clientY);
  } else {
    const rect = target.getBoundingClientRect();
    positionTooltip(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
}

function positionTooltip(clientX, clientY) {
  if (!dom.tooltipLayer || dom.tooltipLayer.hidden) {
    return;
  }

  const margin = 10;
  const rect = dom.tooltipLayer.getBoundingClientRect();
  const x = Math.min(Math.max(margin, clientX + 14), window.innerWidth - rect.width - margin);
  const y = Math.min(Math.max(margin, clientY + 14), window.innerHeight - rect.height - margin);
  dom.tooltipLayer.style.left = `${x}px`;
  dom.tooltipLayer.style.top = `${y}px`;
}

function hideTooltip() {
  if (dom.tooltipLayer) {
    dom.tooltipLayer.hidden = true;
  }
}

function installViewportFitter() {
  const params = new URLSearchParams(window.location.search);
  const configuredScale = Number(params.get("scale"));
  const hasConfiguredScale = Number.isFinite(configuredScale) && configuredScale > 0;

  const fit = () => {
    if (!dom.playArea || !dom.arena || !dom.arenaScaleBox) {
      return;
    }

    const scale = hasConfiguredScale
      ? configuredScale
      : Math.max(
          PLAY_AREA.minScale,
          Math.min(1, dom.playArea.clientWidth / PLAY_AREA.width, dom.playArea.clientHeight / PLAY_AREA.height)
        );
    dom.arena.style.setProperty("--arena-scale", String(scale));
    dom.arenaScaleBox.style.width = `${PLAY_AREA.width * scale}px`;
    dom.arenaScaleBox.style.height = `${PLAY_AREA.height * scale}px`;
    dom.arena.dataset.scaleMode = hasConfiguredScale ? "configured" : "auto";
    dom.arena.dataset.scale = scale.toFixed(3);
  };

  fit();
  window.addEventListener("resize", fit);
  new ResizeObserver(fit).observe(dom.playArea);
}

function playCommandEffect(command) {
  const effect = effectForCommand(command);
  if (!effect || !dom.effectLayer) {
    return;
  }

  const burst = document.createElement("div");
  burst.className = `effect-burst effect-${effect.className} effect-at-${effect.anchor}`;
  burst.style.setProperty("--effect-sheet", `url('${effect.sheet}')`);
  burst.dataset.effectId = String(++effectCounter);
  dom.effectLayer.append(burst);
  window.setTimeout(() => burst.remove(), 850);
}

function effectForCommand(command) {
  if (command.type !== "execute_behavior") {
    return null;
  }

  const behaviorId = command.payload?.behaviorId;
  if (behaviorId === "firebolt" || behaviorId === "hero_focus") {
    return { ...EFFECTS.firebolt, anchor: opponentOf(command.playerId) };
  }
  if (behaviorId === "nova") {
    return { ...EFFECTS.nova, anchor: "center" };
  }
  if (behaviorId === "coin") {
    return { ...EFFECTS.coin, anchor: command.playerId };
  }
  if (behaviorId === "minion_attack" || behaviorId === "weapon_attack") {
    return { ...EFFECTS.attack, anchor: opponentOf(command.playerId) };
  }

  return null;
}

function renderOutcome(playerId) {
  const outcome = state.outcomes.find((candidate) => candidate.status === "completed");
  const result = outcome?.results.find((candidate) => candidate.playerId === playerId);
  return result ? `<div class="resource result"><span class="meta">Result</span><strong>${result.status}</strong></div>` : "";
}

function renderLog() {
  const rows = events
    .slice(-14)
    .reverse()
    .map((event) => `<div class="log-entry">${escapeHtml(logLine(event))}</div>`);
  dom.battleLog.innerHTML = rows.join("") || `<div class="empty">No events yet</div>`;
}

function logLine(event) {
  const payload = event.payload ?? {};
  if (event.type === "damage_dealt") {
    return `#${event.sequence} ${payload.targetPlayerId} took ${payload.amount} damage`;
  }
  if (event.type === "resource_changed") {
    return `#${event.sequence} ${payload.playerId} ${payload.resource} is ${payload.current}`;
  }
  if (event.type === "card_moved") {
    return `#${event.sequence} ${payload.objectId} moved to ${payload.toZoneId}`;
  }
  if (event.type === "outcome_declared") {
    return `#${event.sequence} Match completed`;
  }
  if (event.type === "turn_advanced") {
    return `#${event.sequence} Turn passed to ${payload.activePlayerId}`;
  }
  if (event.type === "phase_entered") {
    return `#${event.sequence} ${payload.activePlayerId} entered ${payload.phaseId}`;
  }
  return `#${event.sequence} ${event.type}`;
}

function cardsInZone(zoneId) {
  const zone = state.zones[zoneId];
  return (zone?.objectIds ?? []).map((objectId) => state.objects[objectId]).filter(Boolean);
}

function opponentOf(playerId) {
  return playerId === "p1" ? "p2" : "p1";
}

function showError(message) {
  dom.battleLog.insertAdjacentHTML("afterbegin", `<div class="log-entry danger">${escapeHtml(message)}</div>`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
