const DATA_URL = "./public/data/team-builder-data.json";
const STORAGE_KEY = "lumentale-team-builder:v1";
const THEME_STORAGE_KEY = "lumentale-team-builder:theme";
const TEAM_CODE_PREFIX = "LUMENTALE-TEAM:";
const DAMAGING_CATEGORIES = new Set(["PHYSICAL", "SPECIAL"]);
const STARTER_DEX_RANGE = { min: 1, max: 20, label: "#1-20" };
const LEGENDARY_DEX_RANGE = { min: 124, max: 136, label: "#124-136" };
const TYPE_ICONS = {
  NONE: "-",
  AURA: "Au",
  WATER: "Wa",
  FIRE: "Fi",
  ELECTRIC: "El",
  VIRUS: "Vi",
  FUROR: "Fu",
  FELICIS: "Fe",
  HORRENS: "Ho",
  MESTUS: "Me",
  SEREUM: "Se",
  EARTH: "Ea",
  WIND: "Wi",
  ICE: "Ic",
  PLANT: "Pl",
  METAL: "Mt",
  LIGHT: "Li",
  DARK: "Da"
};

const app = document.querySelector("#app");

let data = null;
let indexes = null;
let state = {
  search: "",
  selectedSlot: 0,
  theme: "light",
  team: Array(6).fill(null)
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatStatKey(key) {
  return data.rules.statLabels[key] || key;
}

function hiddenTypesForForm(form) {
  return form?.types?.hidden || [];
}

function sanitizeHiddenType(value, form) {
  const hiddenTypes = hiddenTypesForForm(form);
  if (hiddenTypes.length === 0) return null;
  return hiddenTypes.includes(value) ? value : hiddenTypes[0];
}

function abilitiesForForm(form) {
  return (form?.possibleQuirks || []).filter((ability) => indexes?.abilitiesById.has(ability.id));
}

function sanitizeAbility(value, form) {
  const abilities = abilitiesForForm(form);
  if (abilities.length === 0) return null;
  return abilities.some((ability) => ability.id === value) ? value : abilities[0].id;
}

function abilityForMember(member) {
  return member?.abilityId ? indexes.abilitiesById.get(member.abilityId) : null;
}

function canonicalMoveId(moveId) {
  if (!moveId) return null;
  return data?.moveAliases?.[moveId] || moveId;
}

function inDexRange(form, range) {
  return Number(form?.dexIndex) >= range.min && Number(form?.dexIndex) <= range.max;
}

async function init() {
  try {
    state.theme = loadTheme();
    applyTheme(state.theme);
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Missing data file: ${DATA_URL}`);
    data = await response.json();
    indexes = buildIndexes(data);
    state = { ...state, ...(loadState() || {}), theme: state.theme };
    sanitizeState();
    bindEvents();
    render();
  } catch (error) {
    app.innerHTML = `
      <div class="boot boot-error">
        <h1>Data not ready</h1>
        <p>${escapeHtml(error.message)}</p>
        <p>Run <code>node .\\scripts\\build-data.mjs</code> from the app folder.</p>
      </div>
    `;
  }
}

function buildIndexes(payload) {
  const formsById = new Map(payload.forms.map((form) => [form.id, form]));
  const movesById = new Map(payload.moves.map((move) => [move.id, move]));
  const abilitiesById = new Map((payload.quirks || []).map((ability) => [ability.id, ability]));
  const heldItemsById = new Map((payload.heldItems || []).map((item) => [item.id, item]));
  return { formsById, movesById, abilitiesById, heldItemsById };
}

function defaultStats(value) {
  return Object.fromEntries(data.rules.statKeys.map((key) => [key, value]));
}

function createMember(formId) {
  const form = indexes.formsById.get(formId);
  return {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    formId,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    statRolls: defaultStats(data.rules.statRollMax),
    statBoosts: defaultStats(0),
    luck: 0,
    abilityId: sanitizeAbility(null, form),
    heldItemId: null,
    hiddenType: sanitizeHiddenType(null, form),
    moves: Array(5).fill(null)
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    selectedSlot: state.selectedSlot,
    team: state.team
  }));
}

function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
  }
}

function applyTheme(theme) {
  document.body.dataset.theme = theme === "dark" ? "dark" : "light";
}

function sanitizeState() {
  state.selectedSlot = clamp(Number(state.selectedSlot || 0), 0, 5);
  state.team = Array.from({ length: 6 }, (_, index) => sanitizeMember(state.team?.[index]));
}

function sanitizeMember(member) {
  if (!member || !indexes.formsById.has(member.formId)) return null;
  const form = indexes.formsById.get(member.formId);
  const learnset = new Set(data.learnsets[member.formId] || []);
  const statRolls = {};
  const statBoosts = {};

  for (const key of data.rules.statKeys) {
    statRolls[key] = clamp(Number(member.statRolls?.[key] ?? data.rules.statRollMax), data.rules.statRollMin, data.rules.statRollMax);
    statBoosts[key] = clamp(Number(member.statBoosts?.[key] ?? 0), data.rules.statBoostMin, data.rules.statBoostPerStatCap);
  }

  const sanitized = {
    id: member.id || `${Date.now()}-${Math.random()}`,
    formId: member.formId,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    statRolls,
    statBoosts,
    luck: Number(member.luck || 0),
    abilityId: sanitizeAbility(member.abilityId, form),
    heldItemId: member.heldItemId && indexes.heldItemsById.has(member.heldItemId) ? member.heldItemId : null,
    hiddenType: sanitizeHiddenType(member.hiddenType, form),
    moves: Array.from({ length: 5 }, (_, index) => {
      const moveId = canonicalMoveId(member.moves?.[index]);
      return moveId && learnset.has(moveId) ? moveId : null;
    })
  };

  trimBoostBudget(sanitized);
  return sanitized;
}

function trimBoostBudget(member) {
  let total = totalBoosts(member);
  if (total <= data.rules.statBoostBudget) return;

  for (const key of [...data.rules.statKeys].reverse()) {
    if (total <= data.rules.statBoostBudget) break;
    const over = total - data.rules.statBoostBudget;
    const next = Math.max(0, member.statBoosts[key] - over);
    total -= member.statBoosts[key] - next;
    member.statBoosts[key] = next;
  }
}

function totalBoosts(member) {
  return data.rules.statKeys.reduce((sum, key) => sum + Number(member.statBoosts[key] || 0), 0);
}

function remainingBoosts(member) {
  return data.rules.statBoostBudget - totalBoosts(member);
}

function setSelectedSlot(slot) {
  state.selectedSlot = clamp(Number(slot), 0, 5);
  saveState();
  render();
}

function addFormToSlot(formId, slot) {
  if (!indexes.formsById.has(formId)) return;
  state.team[slot] = createMember(formId);
  state.selectedSlot = slot;
  saveState();
  render({ preserveDexScroll: true });
}

function addFormFromDex(formId) {
  const target = state.team[state.selectedSlot] ? state.team.findIndex((member) => !member) : state.selectedSlot;
  addFormToSlot(formId, target === -1 ? state.selectedSlot : target);
}

function swapSlots(from, to) {
  if (from === to) return;
  const next = [...state.team];
  const temp = next[to];
  next[to] = next[from];
  next[from] = temp;
  state.team = next;
  state.selectedSlot = to;
  saveState();
  render();
}

function clearSlot(slot) {
  state.team[slot] = null;
  saveState();
  render();
}

function selectedMember() {
  return state.team[state.selectedSlot] || null;
}

function selectedForm() {
  const member = selectedMember();
  return member ? indexes.formsById.get(member.formId) : null;
}

function filteredForms() {
  const query = normalize(state.search);
  if (!query) return data.forms;
  return data.forms.filter((form) => form.search.includes(query));
}

function resolveStats(form, member) {
  const constants = data.rules.constants;
  const level = member.battleLevel || data.rules.battleLevel;
  const bst = form.baseStatTotal || data.rules.statKeys.reduce((sum, key) => sum + form.baseStats[key], 0);
  const luckMultiplier = 1 + Number(member.luck || 0) * constants.luckScalar;

  return Object.fromEntries(data.rules.statKeys.map((key) => {
    const baseWithRoll = Number(form.baseStats[key] || 0) + Number(member.statRolls[key] || 0);
    const variance = baseWithRoll / (bst / constants.minBstDivisor);
    const boostTerm = Math.trunc(Number(member.statBoosts[key] || 0) / 3);
    const baseComponent = Math.sqrt(Math.pow(baseWithRoll, constants.powExponentBeforeSqrt)) * level / constants.baseComponentDivisor;
    const beforeLuck = key === "hp"
      ? Math.trunc(level * constants.levelHalfMultiplier + constants.nonHpFlat + boostTerm + baseComponent + level * constants.hpExtraLevelMultiplier + constants.hpExtraFlat)
      : Math.trunc(level * constants.levelHalfMultiplier * variance + constants.nonHpFlat + boostTerm + baseComponent);
    const statBeforeModifiers = Math.trunc(beforeLuck * luckMultiplier);
    const statMultiplier = statModifierMultiplier(form, member, key);

    return [key, Math.trunc(statBeforeModifiers * statMultiplier)];
  }));
}

function activeHeldItemStatModifiers(form, member, key) {
  const heldItem = member.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null;
  if (!heldItem) return [];

  return (heldItem.statModifiers || []).filter((modifier) => {
    if (!modifier.stats?.includes(key)) return false;
    if (modifier.condition === "canEvolve" && !form.canEvolve) return false;
    return true;
  });
}

function heldItemStatMultiplier(form, member, key) {
  return activeHeldItemStatModifiers(form, member, key)
    .reduce((multiplier, modifier) => multiplier * Number(modifier.multiplier || 1), 1);
}

function heldItemStatTitle(form, member, key) {
  const heldItem = member.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null;
  const modifiers = activeHeldItemStatModifiers(form, member, key);
  if (!heldItem || modifiers.length === 0) return "";

  const multiplier = heldItemStatMultiplier(form, member, key);
  const percent = Math.round((multiplier - 1) * 100);
  return `${heldItem.displayName}: ${percent >= 0 ? "+" : ""}${percent}% ${formatStatKey(key)}`;
}

function activeAbilityStatModifiers(form, member, key) {
  const ability = abilityForMember(member);
  if (!ability) return [];

  return (ability.statModifiers || []).map((modifier) => {
    if (!modifier.stats?.includes(key)) return null;

    if (modifier.condition === "allyAbility") {
      const hasAlly = state.team.some((teammate) => (
        teammate
        && teammate.id !== member.id
        && teammate.abilityId === modifier.abilityId
      ));
      return hasAlly ? modifier : null;
    }

    if (modifier.condition === "teamAbilityCount") {
      const count = state.team.filter((teammate) => teammate?.abilityId === modifier.abilityId).length;
      const thresholds = modifier.multipliersByCount || {};
      const selected = Object.keys(thresholds)
        .map(Number)
        .filter((threshold) => count >= threshold)
        .sort((a, b) => b - a)[0];
      return selected ? { ...modifier, multiplier: thresholds[selected], activeCount: count } : null;
    }

    return modifier;
  }).filter(Boolean);
}

function abilityStatMultiplier(form, member, key) {
  return activeAbilityStatModifiers(form, member, key)
    .reduce((multiplier, modifier) => multiplier * Number(modifier.multiplier || 1), 1);
}

function statModifierMultiplier(form, member, key) {
  return heldItemStatMultiplier(form, member, key) * abilityStatMultiplier(form, member, key);
}

function statModifierTitle(form, member, key) {
  const notes = [];
  const heldItemTitle = heldItemStatTitle(form, member, key);
  if (heldItemTitle) notes.push(heldItemTitle);

  const ability = abilityForMember(member);
  const abilityModifiers = activeAbilityStatModifiers(form, member, key);
  if (ability && abilityModifiers.length) {
    const multiplier = abilityStatMultiplier(form, member, key);
    const percent = Math.round((multiplier - 1) * 100);
    notes.push(`${ability.displayName}: ${percent >= 0 ? "+" : ""}${percent}% ${formatStatKey(key)}`);
  }

  return notes.join("; ");
}

function moveLabel(move) {
  if (!move) return "No move";
  const parts = [move.type, move.category];
  if (DAMAGING_CATEGORIES.has(move.category) && move.power > 0) parts.push(`${move.power} BP`);
  parts.push(moveTargetLabel(move));
  return `${move.displayName} - ${parts.join(" / ")}`;
}

function moveTargetLabel(move) {
  const targetType = String(move?.targetType || "").toLowerCase();
  const aoeType = String(move?.aoeType || "").toLowerCase();

  if (targetType === "self" && aoeType === "singletarget") return "Self";
  if (targetType === "ally" || targetType === "allyonly") return "Allies";
  if (targetType === "self" && (aoeType === "targetaoe" || aoeType === "adjacentaoe")) return "Allies";
  if (aoeType === "adjacentaoe") return "Adjacent Targets";
  if (aoeType === "targetaoe" || aoeType === "everyoneaoe") return "AoE";
  if (targetType === "self") return "Self";
  return "Single Target";
}

function typePill(type) {
  const value = type || "NONE";
  const lengthClass = typeLengthClass(value);
  return `
    <span class="type-pill type-${escapeHtml(String(value).toLowerCase())} ${lengthClass}">
      ${typeIconHtml(value)}
      <span class="type-name">${escapeHtml(value)}</span>
    </span>
  `;
}

function typeLengthClass(type) {
  const value = String(type || "");
  return value.length >= 8 ? "type-name-compact" : value.length >= 7 ? "type-name-small" : "";
}

function typeIconHtml(type) {
  const value = type || "NONE";
  const icon = TYPE_ICONS[value] || value.slice(0, 2);
  const iconPath = data?.typeIcons?.[value] || null;
  return iconPath
    ? `<img class="type-icon-img" src="${escapeHtml(iconPath)}" alt="" aria-hidden="true">`
    : `<span class="type-icon" aria-hidden="true">${escapeHtml(icon)}</span>`;
}

function spriteHtml(form, size = "small") {
  if (!form?.sprite) return `<div class="sprite-fallback ${size}">${escapeHtml(form?.name?.slice(0, 2) || "??")}</div>`;
  return `<img class="sprite ${size}" src="${escapeHtml(form.sprite)}" alt="">`;
}

function render(options = {}) {
  const dexScrollTop = options.preserveDexScroll ? document.querySelector(".dex-list")?.scrollTop : null;
  const member = selectedMember();
  const form = selectedForm();
  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      <main class="workspace">
        ${renderDex()}
        ${renderParty()}
        ${renderEditor(member, form)}
        ${renderCoverage()}
      </main>
    </div>
  `;
  if (dexScrollTop !== null && dexScrollTop !== undefined) {
    requestAnimationFrame(() => {
      const dexList = document.querySelector(".dex-list");
      if (dexList) dexList.scrollTop = dexScrollTop;
    });
  }
}

function renderHeader() {
  const filled = state.team.filter(Boolean).length;
  const isDark = state.theme === "dark";
  return `
    <header class="topbar">
      <div>
        <h1>Lumentale Team Builder</h1>
        <p>${filled}/6 slots filled. BP allocation uses level ${data.rules.allocationLevel}; preview stats use level ${data.rules.battleLevel}.</p>
      </div>
      <div class="topbar-actions">
        <button class="theme-toggle ${isDark ? "theme-toggle-dark" : ""}" type="button" data-action="toggle-theme" aria-label="Toggle dark mode" aria-pressed="${isDark}">
          <span class="theme-icon theme-icon-sun" aria-hidden="true"></span>
          <span class="theme-track" aria-hidden="true"><span class="theme-thumb"></span></span>
          <span class="theme-icon theme-icon-moon" aria-hidden="true"></span>
        </button>
        <button class="command" data-action="export-team">Export</button>
        <button class="command" data-action="import-team">Import</button>
        <button class="command subtle" data-action="reset-team">Reset</button>
        <a class="command kofi-link" href="https://ko-fi.com/emousedhm01" target="_blank" rel="noopener noreferrer">Donate</a>
      </div>
    </header>
  `;
}

function renderDex() {
  const forms = filteredForms();
  return `
    <section class="panel dex-panel" aria-label="Animon dex">
      <div class="panel-title">
        <h2>Animon Dex</h2>
        <span>${forms.length}/${data.forms.length}</span>
      </div>
      <input id="dex-search" class="search-input" type="search" value="${escapeHtml(state.search)}" placeholder="Search Animon, type, or move" autocomplete="off">
      <div class="dex-list">
        ${forms.map((form) => renderDexEntry(form)).join("")}
      </div>
    </section>
  `;
}

function renderDexEntry(form) {
  const learnCount = (data.learnsets[form.id] || []).length;
  return `
    <article class="dex-entry" draggable="true" data-form-id="${escapeHtml(form.id)}">
      ${spriteHtml(form, "tiny")}
      <button class="dex-main" data-action="add-form" data-form-id="${escapeHtml(form.id)}" title="Add ${escapeHtml(form.display)}">
        <span class="dex-name">${escapeHtml(form.display)}</span>
        <span class="dex-meta">#${escapeHtml(form.dexIndex ?? "-")} ${typePill(form.types.attribute)} ${typePill(form.types.main)}</span>
      </button>
      <span class="dex-count">${learnCount}</span>
    </article>
  `;
}

function renderParty() {
  return `
    <section class="panel party-panel" aria-label="Party">
      <div class="panel-title">
        <h2>Party</h2>
        <span>6 slots</span>
      </div>
      <div class="party-grid">
        ${state.team.map((member, index) => renderPartySlot(member, index)).join("")}
      </div>
    </section>
  `;
}

function renderPartySlot(member, index) {
  const selected = index === state.selectedSlot ? "selected" : "";
  if (!member) {
    return `
      <div class="party-slot empty ${selected}" data-slot="${index}">
        <button class="slot-select" data-action="select-slot" data-slot="${index}">
          <span class="slot-index">${index + 1}</span>
          <span>Drop Animon</span>
        </button>
      </div>
    `;
  }

  const form = indexes.formsById.get(member.formId);
  const moveCount = member.moves.filter(Boolean).length;
  const remaining = remainingBoosts(member);
  return `
    <div class="party-slot filled ${selected}" draggable="true" data-slot="${index}">
      <button class="slot-select" data-action="select-slot" data-slot="${index}">
        <span class="slot-index">${index + 1}</span>
        ${spriteHtml(form, "tiny")}
        <span class="slot-text">
          <strong>${escapeHtml(form.display)}</strong>
          <small>${moveCount}/5 moves, ${remaining} BP left</small>
        </span>
      </button>
      <button class="icon-command" title="Clear slot" data-action="clear-slot" data-slot="${index}">x</button>
    </div>
  `;
}

function renderEditor(member, form) {
  if (!member || !form) {
    return `
      <section class="panel editor-panel">
        <div class="empty-state">
          <h2>Select a slot</h2>
          <p>Drag an Animon from the dex or click one to fill the selected slot.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel editor-panel" aria-label="Selected Animon editor">
      ${renderEditorHeader(member, form)}
      ${renderAbilityEditor(member, form)}
      <div class="editor-body">
        ${renderMoveEditor(member, form)}
        ${renderStatEditor(member, form)}
        ${renderTypeMatchups(form)}
      </div>
    </section>
  `;
}

function renderEditorHeader(member, form) {
  return `
    <div class="editor-head">
      <div class="identity">
        ${spriteHtml(form, "large")}
        <div>
          <h2>${escapeHtml(form.display)}</h2>
          <div class="type-row">${typePill(form.types.attribute)} ${typePill(form.types.main)} ${renderHiddenTypePicker(member, form)}</div>
          <p>BST ${form.baseStatTotal} - SP ${form.sp}</p>
        </div>
      </div>
      <div class="editor-controls">
        <label class="form-switch">
          <span>Form</span>
          <select data-action="change-form">
            ${data.forms.map((option) => `
              <option value="${escapeHtml(option.id)}" ${option.id === form.id ? "selected" : ""}>${escapeHtml(option.display)}</option>
            `).join("")}
          </select>
        </label>
      </div>
    </div>
  `;
}

function renderAbilityEditor(member, form) {
  const abilityRefs = abilitiesForForm(form);
  const ability = abilityForMember(member);
  const abilityEffect = ability?.effectDetails || ability?.description || "No ability selected";
  const heldItem = member.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null;
  const heldItemEffect = heldItem?.actualEffect || heldItem?.description || "No held item selected";

  return `
    <div class="ability-strip">
      <label class="form-switch ability-switch">
        <span>Ability</span>
        <select data-action="change-ability" ${abilityRefs.length ? "" : "disabled"}>
          ${abilityRefs.length ? abilityRefs.map((ref) => {
            const option = indexes.abilitiesById.get(ref.id);
            const hiddenLabel = ref.isHidden ? " (Hidden)" : "";
            return `<option value="${escapeHtml(ref.id)}" ${ref.id === member.abilityId ? "selected" : ""}>${escapeHtml((option?.displayName || ref.displayName || ref.id) + hiddenLabel)}</option>`;
          }).join("") : `<option value="">No ability available</option>`}
        </select>
      </label>
      <div class="ability-effect" title="${escapeHtml(abilityEffect)}">
        ${escapeHtml(abilityEffect)}
      </div>
      <label class="form-switch held-item-switch">
        <span>Held Item</span>
        <select data-action="change-held-item">
          <option value="">No held item</option>
          ${(data.heldItems || []).map((item) => `
            <option value="${escapeHtml(item.id)}" ${item.id === member.heldItemId ? "selected" : ""}>${escapeHtml(item.displayName)}</option>
          `).join("")}
        </select>
      </label>
      <div class="held-item-effect" title="${escapeHtml(heldItemEffect)}">
        ${escapeHtml(heldItemEffect)}
      </div>
    </div>
  `;
}

function renderHiddenTypePicker(member, form) {
  const hiddenTypes = hiddenTypesForForm(form);
  if (hiddenTypes.length === 0) return "";

  const selectedType = sanitizeHiddenType(member.hiddenType, form);
  return `
    <label class="hidden-type-picker type-${escapeHtml(String(selectedType).toLowerCase())} ${typeLengthClass(selectedType)}" title="Hidden Type">
      ${typeIconHtml(selectedType)}
      <select data-action="change-hidden-type" aria-label="Hidden Type">
        ${hiddenTypes.map((type) => `
          <option value="${escapeHtml(type)}" ${type === selectedType ? "selected" : ""}>${escapeHtml(type)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderMoveEditor(member, form) {
  const learnset = data.learnsets[form.id] || [];
  const selectedMoves = new Set(member.moves.filter(Boolean));
  return `
    <section class="subpanel moves-panel">
      <div class="subpanel-title">
        <h3>Moves</h3>
        <span>${learnset.length} learnable</span>
      </div>
      <div class="move-slots">
        ${member.moves.map((moveId, index) => renderMoveSlot(index, moveId, learnset, selectedMoves)).join("")}
      </div>
    </section>
  `;
}

function renderMoveSlot(index, moveId, learnset, selectedMoves) {
  const move = moveId ? indexes.movesById.get(moveId) : null;
  return `
    <div class="move-slot">
      <label>
        <span>Move ${index + 1}</span>
        <select data-move-slot="${index}">
          <option value="">No move</option>
          ${learnset.map((id) => {
            const option = indexes.movesById.get(id);
            const isSelected = id === moveId;
            const disabled = selectedMoves.has(id) && !isSelected;
            return `<option value="${escapeHtml(id)}" ${isSelected ? "selected" : ""} ${disabled ? "disabled" : ""}>${escapeHtml(moveLabel(option))}</option>`;
          }).join("")}
        </select>
      </label>
      <div class="move-detail ${move ? "" : "muted"}">
        ${move ? renderMoveDetail(move) : "Empty slot"}
      </div>
    </div>
  `;
}

function renderMoveDetail(move) {
  const accuracy = move.accuracy > 0 ? `${move.accuracy}%` : "-";
  const parts = [
    `<span class="move-detail-part move-detail-type">${typePill(move.type)}</span>`,
    `<span class="move-detail-part">${escapeHtml(move.category)}</span>`
  ];

  if (DAMAGING_CATEGORIES.has(move.category) && move.power > 0) {
    parts.push(`<span class="move-detail-part">Power ${escapeHtml(move.power)}</span>`);
  }

  parts.push(`<span class="move-detail-part">Acc ${escapeHtml(accuracy)}</span>`);
  parts.push(`<span class="move-detail-part">SP ${escapeHtml(move.spCost)}</span>`);
  if (Number(move.cooldown || 0) > 0) {
    parts.push(`<span class="move-detail-part">CD ${escapeHtml(move.cooldown)}</span>`);
  }
  parts.push(`<span class="move-detail-part">${escapeHtml(moveTargetLabel(move))}</span>`);

  return parts.map((part, index) => `${index > 0 ? `<span class="move-break" aria-hidden="true">|</span>` : ""}${part}`).join("");
}

function renderStatEditor(member, form) {
  const stats = resolveStats(form, member);
  const used = totalBoosts(member);
  const remaining = remainingBoosts(member);
  return `
    <section class="subpanel stats-panel">
      <div class="subpanel-title">
        <h3>Stats</h3>
        <span data-bp-summary>${used}/${data.rules.statBoostBudget} BP</span>
      </div>
      <div class="rules-row">
        <span>Alloc Lv ${data.rules.allocationLevel}</span>
        <span>Preview Lv ${data.rules.battleLevel}</span>
        <span data-bp-remaining>${remaining} BP left</span>
      </div>
      <div class="stat-actions">
        <button class="command small" data-action="max-rolls">Max rolls</button>
        <button class="command small" data-action="balanced-bp">Balanced BP</button>
        <button class="command small subtle" data-action="clear-bp">Clear BP</button>
      </div>
      <div class="stat-table" role="table">
        <div class="stat-row stat-head" role="row">
          <span>Stat</span>
          <span>Base</span>
          <span>Roll</span>
          <span>BP</span>
          <span>Lv50</span>
        </div>
        ${data.rules.statKeys.map((key) => renderStatRow(member, form, stats, key)).join("")}
      </div>
    </section>
  `;
}

function renderStatRow(member, form, stats, key) {
  const roll = member.statRolls[key];
  const boost = member.statBoosts[key];
  const modifierMultiplier = statModifierMultiplier(form, member, key);
  const statTitle = statModifierTitle(form, member, key);
  return `
    <div class="stat-row" role="row" data-stat-row="${key}">
      <strong>${formatStatKey(key)}</strong>
      <span>${form.baseStats[key]}</span>
      <label class="range-cell">
        <input type="range" min="${data.rules.statRollMin}" max="${data.rules.statRollMax}" value="${roll}" data-stat-roll="${key}">
        <input type="number" min="${data.rules.statRollMin}" max="${data.rules.statRollMax}" value="${roll}" data-stat-roll="${key}">
      </label>
      <label class="range-cell">
        <input type="range" min="${data.rules.statBoostMin}" max="${data.rules.statBoostPerStatCap}" value="${boost}" data-stat-boost="${key}">
        <input type="number" min="${data.rules.statBoostMin}" max="${data.rules.statBoostPerStatCap}" value="${boost}" data-stat-boost="${key}">
      </label>
      <strong class="final-stat ${modifierMultiplier !== 1 ? "stat-modified" : ""}" data-final-stat="${key}" title="${escapeHtml(statTitle)}">${stats[key]}</strong>
    </div>
  `;
}

function renderTypeMatchups(form) {
  const groups = [
    { label: "Weaknesses", relations: new Set(["WEAKNESS"]) },
    { label: "Resists", relations: new Set(["RESISTANCE"]) },
    { label: "Immunities", relations: new Set(["NOEFF"]) },
    { label: "Reflects", relations: new Set(["REFLECT"]) }
  ].map((group) => ({
    ...group,
    types: (data.defenseTypes || []).filter((type) => group.relations.has(form.defenseRelations?.[type]))
  })).filter((group) => group.types.length > 0);

  if (!groups.length) return "";

  return `
    <section class="subpanel matchup-panel">
      <div class="subpanel-title">
        <h3>Type Matchups</h3>
        <span>${escapeHtml(form.display)}</span>
      </div>
      <div class="matchup-groups">
        ${groups.map((group) => `
          <div class="matchup-group">
            <h4>${escapeHtml(group.label)}</h4>
            <div class="matchup-chip-list">
              ${group.types.map((type) => typePill(type)).join("")}
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function teamEntries(members = state.team.filter(Boolean)) {
  return members
    .map((member) => ({ member, form: indexes.formsById.get(member.formId) }))
    .filter((entry) => entry.form);
}

function entryListLabel(entries) {
  return entries.map(({ form }) => form.display).join(", ");
}

function duplicateEntryGroups(entries, keyFn) {
  const groups = new Map();
  for (const entry of entries) {
    const key = keyFn(entry);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

function buildRuleViolations(members) {
  const entries = teamEntries(members);
  const violations = [];
  const starters = entries.filter(({ form }) => inDexRange(form, STARTER_DEX_RANGE));
  const legendaries = entries.filter(({ form }) => inDexRange(form, LEGENDARY_DEX_RANGE));

  if (starters.length > 1) {
    violations.push(`Starter limit: ${starters.length} selected (${STARTER_DEX_RANGE.label}): ${entryListLabel(starters)}`);
  }

  if (legendaries.length > 1) {
    violations.push(`Legendary limit: ${legendaries.length} selected (${LEGENDARY_DEX_RANGE.label}): ${entryListLabel(legendaries)}`);
  }

  for (const group of duplicateEntryGroups(entries, ({ form }) => `${normalize(form.animonName || form.name)}:${normalize(form.form)}`)) {
    violations.push(`Duplicate Animon/Form: ${group[0].form.display} x${group.length}`);
  }

  for (const group of duplicateEntryGroups(entries, ({ member }) => member.heldItemId)) {
    const item = indexes.heldItemsById.get(group[0].member.heldItemId);
    if (item) violations.push(`Duplicate held item: ${item.displayName} x${group.length}`);
  }

  return violations;
}

function renderRuleViolations(violations) {
  if (!violations.length) return "";
  return `
    <section class="coverage-section rule-check-section">
      <h3>Rule Checks</h3>
      <div class="rule-list">
        ${violations.map((violation) => `<div>${escapeHtml(violation)}</div>`).join("")}
      </div>
    </section>
  `;
}

function renderCoverage() {
  const members = state.team.filter(Boolean);
  const moveIds = members.flatMap((member) => member.moves.filter(Boolean));
  const moveCounts = new Map();
  const categoryCounts = new Map();
  const warnings = [];
  const ruleViolations = buildRuleViolations(members);
  let damagingMoveCount = 0;

  for (const id of moveIds) {
    const move = indexes.movesById.get(id);
    if (!move) continue;
    categoryCounts.set(move.category, (categoryCounts.get(move.category) || 0) + 1);
    if (DAMAGING_CATEGORIES.has(move.category)) {
      damagingMoveCount += 1;
      moveCounts.set(move.type, (moveCounts.get(move.type) || 0) + 1);
    }
  }

  for (const [index, member] of state.team.entries()) {
    if (!member) continue;
    const form = indexes.formsById.get(member.formId);
    if (remainingBoosts(member) > 0) warnings.push(`Slot ${index + 1}: ${remainingBoosts(member)} BP unspent`);
    if (member.moves.filter(Boolean).length < 5) warnings.push(`Slot ${index + 1}: open move slot`);
    if ((data.learnsets[form.id] || []).length === 0) warnings.push(`Slot ${index + 1}: no source learnset`);
  }

  return `
    <aside class="panel coverage-panel" aria-label="Coverage">
      <div class="panel-title">
        <h2>Coverage</h2>
        <span>${damagingMoveCount} attacks</span>
      </div>
      ${renderRuleViolations(ruleViolations)}
      <section class="coverage-section">
        <h3>Damaging Types</h3>
        <div class="chip-list">
          ${moveCounts.size ? [...moveCounts.entries()].sort((a, b) => b[1] - a[1]).map(([type, count]) => `
            <span class="coverage-chip">${typePill(type)} <strong>${count}</strong></span>
          `).join("") : `<span class="muted">No Physical/Special moves selected</span>`}
        </div>
      </section>
      <section class="coverage-section">
        <h3>Categories</h3>
        <div class="metric-grid">
          ${["PHYSICAL", "SPECIAL", "STATUS"].map((category) => `
            <div class="metric">
              <span>${category}</span>
              <strong>${categoryCounts.get(category) || 0}</strong>
            </div>
          `).join("")}
        </div>
      </section>
      ${renderWeaknesses(members)}
      <section class="coverage-section">
        <h3>Checks</h3>
        <div class="warning-list">
          ${warnings.length ? warnings.slice(0, 10).map((warning) => `<div>${escapeHtml(warning)}</div>`).join("") : `<div class="ok">Team shell complete</div>`}
        </div>
      </section>
    </aside>
  `;
}

function relationScore(relation) {
  if (relation === "WEAKNESS") return -1;
  if (relation === "RESISTANCE") return 1;
  if (relation === "NOEFF" || relation === "REFLECT") return 2;
  return 0;
}

function renderWeaknesses(members) {
  const rows = (data.defenseTypes || [])
    .map((type) => {
      let score = 0;
      let weak = 0;
      let resist = 0;
      let block = 0;
      for (const member of members) {
        const form = indexes.formsById.get(member.formId);
        const relation = form?.defenseRelations?.[type] || "NORMAL";
        const delta = relationScore(relation);
        score += delta;
        if (delta < 0) weak += 1;
        if (relation === "RESISTANCE") resist += 1;
        if (relation === "NOEFF" || relation === "REFLECT") block += 1;
      }
      return { type, score, weak, resist, block };
    })
    .sort((a, b) => a.score - b.score || b.weak - a.weak || a.type.localeCompare(b.type));

  return `
    <section class="coverage-section weakness-section">
      <h3>Weaknesses</h3>
      ${members.length ? `
        <div class="weakness-list">
          ${rows.map((row) => {
            const scoreClass = row.score < 0 ? "score-negative" : row.score > 0 ? "score-positive" : "score-zero";
            const scoreText = row.score > 0 ? `+${row.score}` : `${row.score}`;
            return `
              <div class="weakness-row">
                ${typePill(row.type)}
                <span class="weakness-breakdown">W ${row.weak} / R ${row.resist} / I/R ${row.block}</span>
                <strong class="${scoreClass}">${scoreText}</strong>
              </div>
            `;
          }).join("")}
        </div>
      ` : `<span class="muted">No party members selected</span>`}
    </section>
  `;
}

function bindEvents() {
  app.addEventListener("click", onClick);
  app.addEventListener("input", onInput);
  app.addEventListener("change", onChange);
  app.addEventListener("dragstart", onDragStart);
  app.addEventListener("dragover", onDragOver);
  app.addEventListener("drop", onDrop);
}

function onClick(event) {
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "add-form") {
    addFormFromDex(actionTarget.dataset.formId);
  } else if (action === "select-slot") {
    setSelectedSlot(actionTarget.dataset.slot);
  } else if (action === "clear-slot") {
    clearSlot(Number(actionTarget.dataset.slot));
  } else if (action === "clear-bp") {
    updateSelectedMember((member) => {
      member.statBoosts = defaultStats(0);
    });
  } else if (action === "max-rolls") {
    updateSelectedMember((member) => {
      member.statRolls = defaultStats(data.rules.statRollMax);
    });
  } else if (action === "balanced-bp") {
    updateSelectedMember((member) => {
      const perStat = Math.floor(data.rules.statBoostBudget / data.rules.statKeys.length);
      member.statBoosts = Object.fromEntries(data.rules.statKeys.map((key) => [key, perStat]));
    });
  } else if (action === "toggle-theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    saveTheme(state.theme);
    applyTheme(state.theme);
    render();
  } else if (action === "export-team") {
    exportTeam();
  } else if (action === "import-team") {
    importTeam();
  } else if (action === "reset-team") {
    if (confirm("Reset the current team?")) {
      state.team = Array(6).fill(null);
      state.selectedSlot = 0;
      saveState();
      render();
    }
  }
}

function onInput(event) {
  const target = event.target;
  if (target.id === "dex-search") {
    state.search = target.value;
    render();
    requestAnimationFrame(() => {
      const search = document.querySelector("#dex-search");
      if (search) {
        search.focus();
        search.setSelectionRange(search.value.length, search.value.length);
      }
    });
    return;
  }

  const rollKey = target.dataset?.statRoll;
  const boostKey = target.dataset?.statBoost;
  if (rollKey) {
    updateStatControl(target, "roll", rollKey);
  } else if (boostKey) {
    updateStatControl(target, "boost", boostKey);
  }
}

function onChange(event) {
  const target = event.target;
  if (target.dataset?.statRoll || target.dataset?.statBoost) {
    render();
    return;
  }

  if (target.dataset?.moveSlot !== undefined) {
    const slot = Number(target.dataset.moveSlot);
    updateSelectedMember((member) => {
      member.moves[slot] = target.value || null;
    });
    return;
  }

  if (target.dataset?.action === "change-form") {
    const nextFormId = target.value;
    if (!indexes.formsById.has(nextFormId)) return;
    updateSelectedMember((member) => {
      member.formId = nextFormId;
      const learnset = new Set(data.learnsets[nextFormId] || []);
      member.moves = member.moves.map((moveId) => moveId && learnset.has(moveId) ? moveId : null);
      member.hiddenType = sanitizeHiddenType(member.hiddenType, indexes.formsById.get(nextFormId));
      member.abilityId = sanitizeAbility(member.abilityId, indexes.formsById.get(nextFormId));
    });
    return;
  }

  if (target.dataset?.action === "change-hidden-type") {
    updateSelectedMember((member) => {
      member.hiddenType = sanitizeHiddenType(target.value, selectedForm());
    });
    return;
  }

  if (target.dataset?.action === "change-held-item") {
    const itemId = target.value || null;
    updateSelectedMember((member) => {
      member.heldItemId = itemId && indexes.heldItemsById.has(itemId) ? itemId : null;
    });
    return;
  }

  if (target.dataset?.action === "change-ability") {
    updateSelectedMember((member) => {
      member.abilityId = sanitizeAbility(target.value, selectedForm());
    });
    return;
  }

}

function updateSelectedMember(mutator) {
  const member = selectedMember();
  if (!member) return;
  mutator(member);
  trimBoostBudget(member);
  saveState();
  render();
}

function updateStatControl(target, kind, key) {
  const member = selectedMember();
  const form = selectedForm();
  if (!member || !form) return;

  if (kind === "roll") {
    member.statRolls[key] = clamp(Number(target.value), data.rules.statRollMin, data.rules.statRollMax);
  } else {
    const current = Number(member.statBoosts[key] || 0);
    const other = totalBoosts(member) - current;
    const max = Math.min(data.rules.statBoostPerStatCap, data.rules.statBoostBudget - other);
    member.statBoosts[key] = clamp(Number(target.value), data.rules.statBoostMin, max);
  }

  trimBoostBudget(member);
  saveState();
  syncStatControls(member, form);
}

function syncStatControls(member, form) {
  for (const key of data.rules.statKeys) {
    document.querySelectorAll(`[data-stat-roll="${key}"]`).forEach((input) => {
      input.value = member.statRolls[key];
    });
    document.querySelectorAll(`[data-stat-boost="${key}"]`).forEach((input) => {
      input.value = member.statBoosts[key];
    });
  }

  const stats = resolveStats(form, member);
  for (const key of data.rules.statKeys) {
    const finalCell = document.querySelector(`[data-final-stat="${key}"]`);
    if (finalCell) {
      const modifierMultiplier = statModifierMultiplier(form, member, key);
      finalCell.textContent = stats[key];
      finalCell.classList.toggle("stat-modified", modifierMultiplier !== 1);
      finalCell.title = statModifierTitle(form, member, key);
    }
  }

  const used = totalBoosts(member);
  const remaining = remainingBoosts(member);
  const bpSummary = document.querySelector("[data-bp-summary]");
  const bpRemaining = document.querySelector("[data-bp-remaining]");
  if (bpSummary) bpSummary.textContent = `${used}/${data.rules.statBoostBudget} BP`;
  if (bpRemaining) bpRemaining.textContent = `${remaining} BP left`;
}

function onDragStart(event) {
  const dexEntry = event.target.closest(".dex-entry");
  if (dexEntry) {
    event.dataTransfer.setData("application/x-lumentale-form", dexEntry.dataset.formId);
    event.dataTransfer.effectAllowed = "copy";
    return;
  }

  const partySlot = event.target.closest(".party-slot.filled");
  if (partySlot) {
    event.dataTransfer.setData("application/x-lumentale-slot", partySlot.dataset.slot);
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragOver(event) {
  if (event.target.closest(".party-slot")) event.preventDefault();
}

function onDrop(event) {
  const slotElement = event.target.closest(".party-slot");
  if (!slotElement) return;
  event.preventDefault();

  const targetSlot = Number(slotElement.dataset.slot);
  const formId = event.dataTransfer.getData("application/x-lumentale-form");
  const sourceSlot = event.dataTransfer.getData("application/x-lumentale-slot");

  if (formId) {
    addFormToSlot(formId, targetSlot);
  } else if (sourceSlot !== "") {
    swapSlots(Number(sourceSlot), targetSlot);
  }
}

function teamPayload() {
  return {
    format: "lumentale-team-builder",
    version: 1,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    exportedAtUtc: new Date().toISOString(),
    team: state.team
  };
}

function encodeTeamCode(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${TEAM_CODE_PREFIX}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function decodeTeamCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed) throw new Error("No team code found.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);

  const encoded = (trimmed.startsWith(TEAM_CODE_PREFIX) ? trimmed.slice(TEAM_CODE_PREFIX.length) : trimmed).replace(/\s+/g, "");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function readClipboardText() {
  try {
    if (navigator.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
  }
  return prompt("Paste team code:");
}

async function writeClipboardText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  prompt("Copy this team code:", text);
  return false;
}

async function exportTeam() {
  try {
    const code = encodeTeamCode(teamPayload());
    const copied = await writeClipboardText(code);
    if (copied) alert("Team code copied to clipboard.");
  } catch (error) {
    alert(`Export failed: ${error.message}`);
  }
}

async function importTeam() {
  try {
    const text = await readClipboardText();
    const parsed = decodeTeamCode(text);
    const importedTeam = Array.isArray(parsed) ? parsed : parsed.team;
    if (!Array.isArray(importedTeam)) throw new Error("No team array found.");
    state.team = Array.from({ length: 6 }, (_, index) => sanitizeMember(importedTeam[index]));
    state.selectedSlot = 0;
    saveState();
    render();
    alert("Team code imported.");
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

init();
