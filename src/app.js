const DATA_URL = "./public/data/team-builder-data.json";
const STORAGE_KEY = "lumentale-team-builder:v1";
const THEME_STORAGE_KEY = "lumentale-team-builder:theme";
const TEAM_CODE_PREFIX = "LUMENTALE-TEAM:";
const ANIMON_CODE_PREFIX = "LUMENTALE-ANIMON:";
const COMMUNITY_USAGE_SUPABASE_URL_META = "lumentale-community-usage-supabase-url";
const COMMUNITY_USAGE_SUPABASE_ANON_KEY_META = "lumentale-community-usage-supabase-anon-key";
const COMMUNITY_USAGE_TABLE_META = "lumentale-community-usage-table";
const COMMUNITY_USAGE_DEFAULT_TABLE = "team_current";
const COMMUNITY_USAGE_STORAGE_KEY = "lumentale-team-builder:community-usage:v1";
const COMMUNITY_USAGE_FORMAT = "lumentale-community-team-snapshot";
const COMMUNITY_USAGE_SUBMITTED_LIMIT = 500;
const ASSUMED_AFFECTION = 100;
const ASSUMED_AFFECTION_SCALAR = 0.0010000000474974513;
const DAMAGING_CATEGORIES = new Set(["PHYSICAL", "SPECIAL"]);
const RELATION_MULTIPLIERS = {
  WEAKNESS: 1.5,
  RESISTANCE: 0.3333333432674408,
  NOEFF: 0,
  NORMAL: 1,
  REFLECT: 1
};
const TYPE_DEFENSE_GROUPS = [
  { label: "Weak", relations: new Set(["WEAKNESS"]) },
  { label: "Resist", relations: new Set(["RESISTANCE"]) },
  { label: "Immune", relations: new Set(["NOEFF"]) },
  { label: "Reflect", relations: new Set(["REFLECT"]) }
];
const ALL_DAMAGE_TYPES = ["NONE", "CHAKRA", "ELECTRIC", "AURA", "ANOMALOUS", "GEO", "VIRUS", "ICE", "ANCIENT", "FIRE", "DEMON", "WATER", "DATA", "GRASS"];
const DAMAGE_WEATHER_EFFECTS = [
  { id: "Clear", label: "Clear", buffs: {}, debuffs: {} },
  { id: "HarshSun", label: "Harsh Sun", buffs: Object.fromEntries(ALL_DAMAGE_TYPES.filter((type) => type !== "DATA").map((type) => [type, 1.2000000476837158])), debuffs: { DATA: 0.800000011920929 } },
  { id: "Rain", label: "Rain", buffs: { WATER: 1.5 }, debuffs: {} },
  { id: "HeavyRain", label: "Heavy Rain", buffs: { WATER: 1.75 }, debuffs: {} },
  { id: "SandStorm", label: "Sand Storm", buffs: { GEO: 1.5 }, debuffs: {}, pendingDetail: "Aura proc not modeled" },
  { id: "Hail", label: "Hail", buffs: { ICE: 1.5 }, debuffs: {}, pendingDetail: "extra hail damage not modeled" },
  { id: "Rainbow", label: "Rainbow", buffs: {}, debuffs: {}, pendingDetail: "accuracy, critical, and healing effects not modeled" },
  { id: "Fog", label: "Fog", buffs: { ICE: 1.2999999523162842, DATA: 1.2999999523162842, VIRUS: 1.2999999523162842 }, debuffs: { AURA: 0.75 }, pendingDetail: "accuracy effect not modeled" },
  { id: "Snow", label: "Snow", buffs: { ICE: 1.2000000476837158, DATA: 1.2000000476837158 }, debuffs: { FIRE: 0.800000011920929 }, pendingDetail: "accuracy effect not modeled" },
  { id: "AshesRain", label: "Ashes Rain", buffs: { FIRE: 1.5 }, debuffs: {}, pendingDetail: "fire proc not modeled" }
];
const DAMAGE_TERRAIN_EFFECTS = [
  { id: "none", label: "None", detail: "None" },
  { id: "felicis-happiness-overload", label: "Felicis - Happiness Overload", detail: "healing domain; no direct damage change" },
  { id: "felicis-delightful-bliss", label: "Felicis - Delightful Bliss", detail: "healing and cleanse domain; no direct damage change" },
  {
    id: "furor-berserking-rampage",
    label: "Furor - Berserking Rampage",
    detail: "outgoing HP-change damage multiplier",
    unresolvedField: "Multiplier",
    nativeHook: "FurorDomainEffects.ChangeOutgoingDamage"
  },
  {
    id: "furor-roaring-burst",
    label: "Furor - Roaring Burst",
    detail: "super-effective damage multiplier",
    superEffectiveOnly: true,
    unresolvedField: "Multiplier",
    nativeHook: "FurorDomainEffects.ChangeSupereffectiveMultiplier"
  },
  { id: "horrens-paralyzing-horror", label: "Horrens - Paralyzing Horror", detail: "SP-cost domain; no direct damage change" },
  { id: "horrens-malevolent-shriek", label: "Horrens - Malevolent Shriek", detail: "reflects actual incoming HP loss to the source after damage", reflectActualDamage: true },
  { id: "mestus-grievances-desolation", label: "Mestus - Grievances Desolation", detail: "over-time damage multiplier; no direct hit damage change" },
  { id: "mestus-unfathomable-anxiety", label: "Mestus - Unfathomable Anxiety", detail: "separate domain damage proc; not added to direct hit damage" },
  {
    id: "sereum-sovereigns-calm",
    label: "Sereum - Sovereign's Calm",
    detail: "incoming HP-change damage multiplier",
    unresolvedField: "Multiplier",
    nativeHook: "SereumDomainEffects.ChangeIncomingDamage"
  },
  { id: "sereum-ultimate-authority", label: "Sereum - Ultimate Authority", detail: "ultimate-charge denial; no direct damage change" }
];
const DAMAGE_WEATHER_EFFECTS_BY_ID = new Map(DAMAGE_WEATHER_EFFECTS.map((effect) => [effect.id, effect]));
const DAMAGE_TERRAIN_EFFECTS_BY_ID = new Map(DAMAGE_TERRAIN_EFFECTS.map((effect) => [effect.id, effect]));
const DAMAGE_CONSTANTS = {
  statGuardFlat: 1,
  damageBaseDivisor: 100,
  percentScale: 100,
  levelLinearMultiplier: 5,
  levelLinearFlat: 10,
  levelLinearScale: 0.30000001192092896,
  levelRatioOffset: 25,
  finalBaseScale: 0.44999998807907104,
  baseDamageFlat: 7,
  stageScalar: 1.100000023841858,
  agilityStageScalar: 0.800000011920929,
  accuracyStageDiffScalar: 0.13333333333333333,
  stageFormulaPivot: 2,
  critChanceDenominator: 23,
  sereumCritChanceFlat: 33.33333,
  luckyBreakCritChanceMultiplier: 1.2999999523162842,
  furorTraitMultiplier: 1.314159,
  furorSynchronizedTraitMultiplier: 1.6,
  mestusTraitHpFraction: 0.05,
  synchroStatShareMultiplier: 1.5,
  boltRushDamagePerAgilityStage: 0.25,
  boltRushAccuracyPerAgilityStage: 0.15,
  nonsenseStackPerPreviousUse: 0.1,
  superEffectiveThreshold: 1.5,
  criticalBaseMultiplier: 1.7999999523162842
};
const MOVE_EFFECT_GUIDS = Object.freeze({
  BACTERIAL_SMASH: "c476e38a-eba1-4f9d-802f-822254d335a0",
  BOLT_RUSH: "bd78a6c6-1e04-449d-a8ec-20de4cea9f79",
  DIGIT_DRIVER: "c0265b5b-e63b-4785-bb74-723c1a83152e",
  DROPKICK: "88d77ae4-d878-449e-bc40-fdd13e169e2d",
  FATAL_CRUSH: "c38272ad-dc39-4a30-9271-3eb6d547d299",
  NONSENSE: "f613585c-5a9f-42a8-86a2-5866a6c4dbef",
  SNOWPLOUGH: "8e00c515-4af2-4b57-b487-b37c6053a8e2",
  SPARKLING_WATER: "b641cadc-56fe-436b-9a5a-8f032d5db429"
});
const ATTRIBUTE_TRAIT_TYPES = new Set(["SEREUM", "FELICIS", "HORRENS", "FUROR", "MESTUS"]);
const CROMACARTA_TRAIT_FLAT_BUFFS = {
  SEREUM: 16.66667,
  FELICIS: 0.15,
  FUROR: 0.15,
  HORRENS: 0.08,
  MESTUS: 0.05
};
const DAMAGE_STATE_DEFAULTS = Object.freeze({
  attackerSlot: 0,
  targetSlot: 0,
  moveSlot: 0,
  critical: false,
  forceElementalWeakness: false,
  attackerSynchronized: false,
  defenderSynchronized: false,
  defenderUpdraft: false,
  attackerAttributeActive: false,
  moveBravadoPrimed: false,
  movePreviousIceUsed: false,
  moveTargetDebuffed: false,
  movePreviousNonsenseUses: 0,
  attackerAttackStage: 0,
  attackerSpecialAttackStage: 0,
  attackerAgilityStage: 0,
  targetDefenseStage: 0,
  targetSpecialDefenseStage: 0,
  targetAgilityStage: 0,
  weatherEffect: "Clear",
  terrainEffect: "none",
  opponentAddFormId: null
});
const DAMAGE_NUMERIC_FIELDS = new Set([
  "attackerAttackStage",
  "attackerSpecialAttackStage",
  "attackerAgilityStage",
  "targetDefenseStage",
  "targetSpecialDefenseStage",
  "targetAgilityStage",
  "movePreviousNonsenseUses"
]);
const DAMAGE_SELECT_FIELDS = new Set([
  "weatherEffect",
  "terrainEffect"
]);
const MOVE_DESCRIPTION_CATEGORIES = new Set(["STATUS", "PHYSICAL", "SPECIAL"]);
const DAMAGE_TOGGLE_FIELDS = new Set([
  "critical",
  "forceElementalWeakness",
  "attackerSynchronized",
  "defenderSynchronized",
  "defenderUpdraft",
  "moveBravadoPrimed",
  "movePreviousIceUsed",
  "moveTargetDebuffed",
  "attackerAttributeActive"
]);
const UNDO_HISTORY_LIMIT = 3;
const STARTER_DEX_RANGE = { min: 1, max: 20, label: "#1-20" };
const LEGENDARY_DEX_RANGE = { min: 124, max: 136, label: "#124-136" };
const COMMUNITY_BANNED_ANIMON_NAMES = ["Kentaress", "Primalong"];
const COMMUNITY_BANNED_ITEM_NAMES = ["Silhouchain"];
const COMMUNITY_BANNED_ANIMON = new Set(COMMUNITY_BANNED_ANIMON_NAMES.map(normalize));
const COMMUNITY_BANNED_ITEMS = new Set(COMMUNITY_BANNED_ITEM_NAMES.map(normalize));
const ACTIVE_PARTY_SLOT_COUNT = 4;
const SAVED_TEAM_COUNT = 10;
const COMMUNITY_USAGE_MAJOR_COMPOSITION_CHANGE = 2;
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
let formSearchCache = new Map();
let undoHistory = {
  builder: [],
  damage: []
};
let communityUsageRequest = {
  teamId: null,
  hash: null,
  pending: false,
  error: null
};
let activeUndoInputKey = null;
let isRestoringUndo = false;
let state = {
  activeTab: "builder",
  search: "",
  selectedSlot: 0,
  activeTeamSlot: 0,
  activeOpponentTeamSlot: 0,
  communityUsageConsent: null,
  theme: "light",
  team: Array(6).fill(null),
  savedTeams: [],
  opponentTeam: Array(6).fill(null),
  damage: defaultDamageState()
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const f32 = (value) => Math.fround(Number(value));

function defaultDamageState() {
  return { ...DAMAGE_STATE_DEFAULTS };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

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
    formSearchCache = new Map();
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
  syncActiveSavedTeam();
  syncActiveOpponentSharedTeam();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activeTab: state.activeTab,
    selectedSlot: state.selectedSlot,
    activeTeamSlot: state.activeTeamSlot,
    activeOpponentTeamSlot: state.activeOpponentTeamSlot,
    communityUsageConsent: state.communityUsageConsent,
    team: state.team,
    savedTeams: state.savedTeams,
    opponentTeam: state.opponentTeam,
    damage: state.damage
  }));
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function undoTabKey(tab = state.activeTab) {
  return tab === "damage" ? "damage" : "builder";
}

function clearUndoHistory() {
  undoHistory = {
    builder: [],
    damage: []
  };
  activeUndoInputKey = null;
}

function captureUndoState() {
  syncActiveSavedTeam();
  syncActiveOpponentSharedTeam();
  return clonePlain({
    selectedSlot: state.selectedSlot,
    activeTeamSlot: state.activeTeamSlot,
    activeOpponentTeamSlot: state.activeOpponentTeamSlot,
    team: state.team,
    savedTeams: state.savedTeams,
    opponentTeam: state.opponentTeam,
    damage: state.damage
  });
}

function rememberUndo(inputKey = null) {
  if (isRestoringUndo) return;

  const tab = undoTabKey();
  const scopedInputKey = inputKey ? `${tab}:${inputKey}` : null;
  if (scopedInputKey && activeUndoInputKey === scopedInputKey) return;
  activeUndoInputKey = scopedInputKey;

  const snapshot = captureUndoState();
  const serialized = JSON.stringify(snapshot);
  const stack = undoHistory[tab];
  if (stack[stack.length - 1]?.serialized === serialized) return;

  stack.push({ snapshot, serialized });
  if (stack.length > UNDO_HISTORY_LIMIT) stack.shift();
}

function endUndoInputSession() {
  activeUndoInputKey = null;
}

function undoLastAction() {
  const stack = undoHistory[undoTabKey()];
  const entry = stack.pop();
  if (!entry) return;

  isRestoringUndo = true;
  try {
    const activeTab = state.activeTab;
    const theme = state.theme;
    const search = state.search;
    state = {
      ...state,
      ...clonePlain(entry.snapshot),
      activeTab,
      theme,
      search
    };
    sanitizeState();
    saveState();
    render();
  } finally {
    isRestoringUndo = false;
    endUndoInputSession();
  }
}

function isNativeUndoTarget(target) {
  if (!target || target === document.body) return false;
  if (target.isContentEditable) return true;
  if (target.id === "dex-search") return true;
  if (target.tagName === "TEXTAREA") return true;
  if (target.tagName !== "INPUT") return false;

  const type = String(target.type || "text").toLowerCase();
  return ["text", "search", "email", "url", "tel", "password"].includes(type)
    && target.dataset?.action !== "rename-team"
    && target.dataset?.action !== "rename-opponent-team";
}

function syncActiveSavedTeam() {
  state.activeTeamSlot = clamp(Math.trunc(finiteNumber(state.activeTeamSlot, 0)), 0, SAVED_TEAM_COUNT - 1);
  state.savedTeams = sanitizeSavedTeams(state.savedTeams, state.team);
  const active = state.savedTeams[state.activeTeamSlot];
  state.savedTeams[state.activeTeamSlot] = {
    ...active,
    name: sanitizeTeamName(active?.name, state.activeTeamSlot),
    team: sanitizeTeamArray(state.team)
  };
}

function syncActiveOpponentSharedTeam() {
  state.activeOpponentTeamSlot = clamp(Math.trunc(finiteNumber(state.activeOpponentTeamSlot, 0)), 0, SAVED_TEAM_COUNT - 1);
  state.savedTeams = sanitizeSavedTeams(state.savedTeams, state.team);
  if (state.activeOpponentTeamSlot === state.activeTeamSlot) {
    state.opponentTeam = sanitizeTeamArray(state.team);
    return;
  }

  const active = state.savedTeams[state.activeOpponentTeamSlot];
  state.savedTeams[state.activeOpponentTeamSlot] = {
    ...active,
    name: sanitizeTeamName(active?.name, state.activeOpponentTeamSlot),
    team: sanitizeTeamArray(state.opponentTeam)
  };
}

function savedTeamOptionLabel(slot, index) {
  return `${index + 1}. ${sanitizeTeamName(slot?.name, index)} (${(slot?.team || []).filter(Boolean).length}/6)`;
}

function switchSavedTeam(slot) {
  const nextSlot = clamp(Math.trunc(finiteNumber(slot, 0)), 0, SAVED_TEAM_COUNT - 1);
  if (nextSlot === state.activeTeamSlot) return;

  rememberUndo();
  syncActiveSavedTeam();
  state.activeTeamSlot = nextSlot;
  state.team = sanitizeTeamArray(state.savedTeams[nextSlot]?.team);
  if (state.activeOpponentTeamSlot === nextSlot) state.opponentTeam = sanitizeTeamArray(state.team);
  state.selectedSlot = effectiveFilledSlot(state.team, state.selectedSlot);
  state.damage.attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
  state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
  saveState();
  render();
}

function switchOpponentSavedTeam(slot) {
  const nextSlot = clamp(Math.trunc(finiteNumber(slot, 0)), 0, SAVED_TEAM_COUNT - 1);
  if (nextSlot === state.activeOpponentTeamSlot) return;

  rememberUndo();
  syncActiveSavedTeam();
  syncActiveOpponentSharedTeam();
  state.activeOpponentTeamSlot = nextSlot;
  state.opponentTeam = sanitizeTeamArray(nextSlot === state.activeTeamSlot ? state.team : state.savedTeams[nextSlot]?.team);
  state.damage.targetSlot = effectiveFilledSlot(state.opponentTeam, state.damage.targetSlot);
  saveState();
  render();
}

function renameSavedTeam(name) {
  rememberUndo(`rename-team:${state.activeTeamSlot}`);
  state.savedTeams = sanitizeSavedTeams(state.savedTeams, state.team);
  state.savedTeams[state.activeTeamSlot].name = String(name ?? "").slice(0, 48);
  saveState();
  const option = document.querySelector(`[data-action="change-team-slot"] option[value="${state.activeTeamSlot}"]`);
  if (option) option.textContent = savedTeamOptionLabel(state.savedTeams[state.activeTeamSlot], state.activeTeamSlot);
}

function renameOpponentSavedTeam(name) {
  rememberUndo(`rename-opponent-team:${state.activeOpponentTeamSlot}`);
  state.savedTeams = sanitizeSavedTeams(state.savedTeams, state.team);
  state.savedTeams[state.activeOpponentTeamSlot].name = String(name ?? "").slice(0, 48);
  saveState();
  document
    .querySelectorAll(`[data-action="change-team-slot"] option[value="${state.activeOpponentTeamSlot}"], [data-action="change-opponent-team-slot"] option[value="${state.activeOpponentTeamSlot}"]`)
    .forEach((option) => {
      option.textContent = savedTeamOptionLabel(state.savedTeams[state.activeOpponentTeamSlot], state.activeOpponentTeamSlot);
    });
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
  state.activeTab = state.activeTab === "damage" ? "damage" : "builder";
  state.selectedSlot = clamp(Number(state.selectedSlot || 0), 0, 5);
  state.activeTeamSlot = clamp(Math.trunc(finiteNumber(state.activeTeamSlot, 0)), 0, SAVED_TEAM_COUNT - 1);
  state.activeOpponentTeamSlot = clamp(Math.trunc(finiteNumber(state.activeOpponentTeamSlot, 0)), 0, SAVED_TEAM_COUNT - 1);
  state.communityUsageConsent = state.communityUsageConsent === true
    ? true
    : state.communityUsageConsent === false
      ? false
      : null;
  const loadedTeam = sanitizeTeamArray(state.team);
  state.savedTeams = sanitizeSavedTeams(state.savedTeams, loadedTeam);
  state.team = sanitizeTeamArray(state.savedTeams[state.activeTeamSlot]?.team);
  state.opponentTeam = sanitizeTeamArray(state.activeOpponentTeamSlot === state.activeTeamSlot
    ? state.team
    : state.savedTeams[state.activeOpponentTeamSlot]?.team);
  state.damage = sanitizeDamageState(state.damage);
  state.damage.attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
  state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
  state.damage.targetSlot = effectiveFilledSlot(state.opponentTeam, state.damage.targetSlot);
}

function sanitizeTeamArray(team) {
  return Array.from({ length: 6 }, (_, index) => sanitizeMember(team?.[index]));
}

function sanitizeTeamName(value, index) {
  const name = String(value ?? "").trim();
  return name || `Team ${index + 1}`;
}

function sanitizeSavedTeams(savedTeams, fallbackTeam = Array(6).fill(null)) {
  const slots = Array.isArray(savedTeams) ? savedTeams : [];
  return Array.from({ length: SAVED_TEAM_COUNT }, (_, index) => {
    const slot = slots[index] || {};
    const team = Array.isArray(slot.team) ? slot.team : (index === 0 ? fallbackTeam : null);
    return {
      name: sanitizeTeamName(slot.name, index),
      team: sanitizeTeamArray(team),
      usageTeamId: sanitizeUsageTeamId(slot.usageTeamId),
      usageCompositionBaseline: sanitizeUsageComposition(slot.usageCompositionBaseline)
    };
  });
}

function sanitizeUsageTeamId(value) {
  const text = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{16,80}$/.test(text) ? text : null;
}

function sanitizeUsageComposition(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 6);
}

function sanitizeDamageState(damage) {
  const next = { ...DAMAGE_STATE_DEFAULTS, ...(damage || {}) };
  return {
    attackerSlot: clamp(Math.trunc(finiteNumber(next.attackerSlot, 0)), 0, 5),
    targetSlot: clamp(Math.trunc(finiteNumber(next.targetSlot, 0)), 0, 5),
    moveSlot: clamp(Math.trunc(finiteNumber(next.moveSlot, 0)), 0, 4),
    critical: Boolean(next.critical),
    forceElementalWeakness: Boolean(next.forceElementalWeakness),
    attackerSynchronized: Boolean(next.attackerSynchronized),
    defenderSynchronized: Boolean(next.defenderSynchronized),
    defenderUpdraft: Boolean(next.defenderUpdraft),
    attackerAttributeActive: Boolean(next.attackerAttributeActive),
    moveBravadoPrimed: Boolean(next.moveBravadoPrimed),
    movePreviousIceUsed: Boolean(next.movePreviousIceUsed),
    moveTargetDebuffed: Boolean(next.moveTargetDebuffed),
    movePreviousNonsenseUses: clamp(Math.trunc(finiteNumber(next.movePreviousNonsenseUses, 0)), 0, 10),
    attackerAttackStage: clamp(Math.trunc(finiteNumber(next.attackerAttackStage, 0)), -6, 6),
    attackerSpecialAttackStage: clamp(Math.trunc(finiteNumber(next.attackerSpecialAttackStage, 0)), -6, 6),
    attackerAgilityStage: clamp(Math.trunc(finiteNumber(next.attackerAgilityStage, 0)), -6, 6),
    targetDefenseStage: clamp(Math.trunc(finiteNumber(next.targetDefenseStage, 0)), -6, 6),
    targetSpecialDefenseStage: clamp(Math.trunc(finiteNumber(next.targetSpecialDefenseStage, 0)), -6, 6),
    targetAgilityStage: clamp(Math.trunc(finiteNumber(next.targetAgilityStage, 0)), -6, 6),
    weatherEffect: DAMAGE_WEATHER_EFFECTS_BY_ID.has(next.weatherEffect) ? next.weatherEffect : "Clear",
    terrainEffect: DAMAGE_TERRAIN_EFFECTS_BY_ID.has(next.terrainEffect) ? next.terrainEffect : "none",
    opponentAddFormId: indexes?.formsById.has(next.opponentAddFormId)
      ? next.opponentAddFormId
      : data?.forms?.[0]?.id || null
  };
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

function normalizePartySide(side) {
  return side === "opponent" ? "opponent" : "current";
}

function isActiveTeamSlot(index) {
  return Number(index) >= 0 && Number(index) < ACTIVE_PARTY_SLOT_COUNT;
}

function activeSlotClass(index) {
  return isActiveTeamSlot(index) ? "team-active-slot" : "";
}

function activeTeamMembers(team) {
  return (team || []).slice(0, ACTIVE_PARTY_SLOT_COUNT).filter(Boolean);
}

function activeBattleEntries(team, side) {
  return (team || [])
    .map((member, slot) => ({ member, slot }))
    .filter((entry) => entry.member && isActiveTeamSlot(entry.slot))
    .map((entry) => battleEntry(team, entry.slot, side))
    .filter(Boolean);
}

function setSelectedSlot(slot) {
  state.selectedSlot = clamp(Number(slot), 0, 5);
  saveState();
  render();
}

function addFormToSlot(formId, slot) {
  if (!indexes.formsById.has(formId)) return;
  rememberUndo();
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
  movePartyMember("current", from, "current", to);
}

function clearSlot(slot) {
  if (!state.team[slot]) return;
  rememberUndo();
  state.team[slot] = null;
  saveState();
  render();
}

function teamForDamageSide(side) {
  return teamForPartySide(side);
}

function teamForPartySide(side) {
  return normalizePartySide(side) === "opponent" ? state.opponentTeam : state.team;
}

function setTeamForPartySide(side, team) {
  if (normalizePartySide(side) === "opponent") {
    state.opponentTeam = team;
  } else {
    state.team = team;
  }
}

function selectedDamageSlot(side) {
  return side === "opponent" ? state.damage.targetSlot : state.damage.attackerSlot;
}

function selectedDamageMember(side) {
  return teamForDamageSide(side)[selectedDamageSlot(side)] || null;
}

function updateDamageMember(side, mutator) {
  const member = selectedDamageMember(side);
  if (!member) return;
  rememberUndo();
  mutator(member);
  trimBoostBudget(member);
  state.damage = sanitizeDamageState(state.damage);
  saveState();
  render();
}

function addOpponentForm(formId) {
  if (!indexes.formsById.has(formId)) return;
  rememberUndo();
  const emptySlot = state.opponentTeam.findIndex((member) => !member);
  const slot = emptySlot === -1 ? state.damage.targetSlot : emptySlot;
  state.opponentTeam[slot] = createMember(formId);
  state.damage.targetSlot = slot;
  saveState();
  render();
}

function addFormToTeamSlot(formId, side, slot) {
  const targetSide = normalizePartySide(side);
  if (targetSide === "opponent") {
    if (!indexes.formsById.has(formId)) return;
    const targetSlot = clamp(Math.trunc(finiteNumber(slot, 0)), 0, 5);
    rememberUndo();
    state.opponentTeam[targetSlot] = createMember(formId);
    state.damage.targetSlot = targetSlot;
    saveState();
    render({ preserveDexScroll: true });
    return;
  }

  addFormToSlot(formId, slot);
}

function movePartyMember(sourceSide, sourceSlot, targetSide, targetSlot) {
  const fromSide = normalizePartySide(sourceSide);
  const toSide = normalizePartySide(targetSide);
  const fromSlot = clamp(Math.trunc(finiteNumber(sourceSlot, 0)), 0, 5);
  const toSlot = clamp(Math.trunc(finiteNumber(targetSlot, 0)), 0, 5);
  if (fromSide === toSide && fromSlot === toSlot) return;

  const sourceTeam = [...teamForPartySide(fromSide)];
  const draggedMember = sourceTeam[fromSlot];
  if (!draggedMember) return;

  rememberUndo();
  if (fromSide === toSide) {
    const nextTeam = [...sourceTeam];
    nextTeam[fromSlot] = nextTeam[toSlot];
    nextTeam[toSlot] = draggedMember;
    setTeamForPartySide(fromSide, nextTeam);
  } else {
    const targetTeam = [...teamForPartySide(toSide)];
    const targetMember = targetTeam[toSlot] || null;
    sourceTeam[fromSlot] = targetMember;
    targetTeam[toSlot] = draggedMember;
    setTeamForPartySide(fromSide, sourceTeam);
    setTeamForPartySide(toSide, targetTeam);
  }

  if (toSide === "current") {
    state.selectedSlot = toSlot;
    state.damage.attackerSlot = toSlot;
  } else if (fromSide === "current" && state.damage.attackerSlot === fromSlot) {
    state.selectedSlot = effectiveFilledSlot(state.team, fromSlot);
    state.damage.attackerSlot = state.selectedSlot;
  } else if (fromSide === "current") {
    state.selectedSlot = effectiveFilledSlot(state.team, state.selectedSlot);
    state.damage.attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
  }

  if (toSide === "opponent") {
    state.damage.targetSlot = toSlot;
  } else if (fromSide === "opponent" && state.damage.targetSlot === fromSlot) {
    state.damage.targetSlot = effectiveFilledSlot(state.opponentTeam, fromSlot);
  } else if (fromSide === "opponent") {
    state.damage.targetSlot = effectiveFilledSlot(state.opponentTeam, state.damage.targetSlot);
  }

  state.damage = sanitizeDamageState(state.damage);
  state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
  saveState();
  render();
}

function swapCurrentAndOpponentTeams() {
  rememberUndo();
  syncActiveSavedTeam();
  syncActiveOpponentSharedTeam();
  const nextTeam = sanitizeTeamArray(state.opponentTeam);
  const nextOpponent = sanitizeTeamArray(state.team);
  const nextActiveTeamSlot = state.activeOpponentTeamSlot;
  const nextActiveOpponentTeamSlot = state.activeTeamSlot;
  const nextAttackerSlot = effectiveFilledSlot(nextTeam, state.damage.targetSlot);
  const nextTargetSlot = effectiveFilledSlot(nextOpponent, state.damage.attackerSlot);
  state.activeTeamSlot = nextActiveTeamSlot;
  state.activeOpponentTeamSlot = nextActiveOpponentTeamSlot;
  state.team = nextTeam;
  state.opponentTeam = nextOpponent;
  state.selectedSlot = nextAttackerSlot;
  state.damage.attackerSlot = nextAttackerSlot;
  state.damage.targetSlot = nextTargetSlot;
  state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
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
  return data.forms.filter((form) => formSearchText(form).includes(query));
}

function formSearchText(form) {
  if (formSearchCache.has(form.id)) return formSearchCache.get(form.id);

  const parts = [form.search];
  for (const quirk of form.possibleQuirks || []) {
    const detail = indexes.abilitiesById.get(quirk.id);
    parts.push(quirk.displayName, detail?.displayName);
  }

  const searchText = normalize(parts.filter(Boolean).join(" "));
  formSearchCache.set(form.id, searchText);
  return searchText;
}

function formBaseStatTotal(form) {
  return Number(form?.baseStatTotal) || data.rules.statKeys.reduce((sum, key) => sum + Number(form?.baseStats?.[key] || 0), 0);
}

function resolveStats(form, member, teamContext = state.team) {
  const constants = data.rules.constants;
  const level = member.battleLevel || data.rules.battleLevel;
  const bst = formBaseStatTotal(form);
  const assumedAffection = finiteNumber(constants.affectionMax, ASSUMED_AFFECTION);
  const affectionScalar = finiteNumber(constants.affectionScalar ?? constants.luckScalar, ASSUMED_AFFECTION_SCALAR);
  const affectionMultiplier = 1 + assumedAffection * affectionScalar;

  return Object.fromEntries(data.rules.statKeys.map((key) => {
    const baseWithRoll = Number(form.baseStats[key] || 0) + Number(member.statRolls[key] || 0);
    const variance = baseWithRoll / (bst / constants.minBstDivisor);
    const boostTerm = Math.trunc(Number(member.statBoosts[key] || 0) / 3);
    const baseComponent = Math.sqrt(Math.pow(baseWithRoll, constants.powExponentBeforeSqrt)) * level / constants.baseComponentDivisor;
    const beforeAffection = key === "hp"
      ? Math.trunc(level * constants.levelHalfMultiplier + constants.nonHpFlat + boostTerm + baseComponent + level * constants.hpExtraLevelMultiplier + constants.hpExtraFlat)
      : Math.trunc(level * constants.levelHalfMultiplier * variance + constants.nonHpFlat + boostTerm + baseComponent);
    const statBeforeModifiers = Math.trunc(beforeAffection * affectionMultiplier);
    const statMultiplier = statModifierMultiplier(form, member, key, teamContext);

    return [key, Math.trunc(statBeforeModifiers * statMultiplier)];
  }));
}

function synchroStatMultiplier(form, key) {
  if (key === "hp") return 1;
  const baseStat = Number(form?.baseStats?.[key] || 0);
  const bst = formBaseStatTotal(form);
  if (!baseStat || !bst) return 1;
  return 1 + baseStat * DAMAGE_CONSTANTS.synchroStatShareMultiplier / bst;
}

function applySynchroStatBoosts(stats, form, synchronized = false) {
  if (!synchronized) return stats;
  return Object.fromEntries(data.rules.statKeys.map((key) => {
    const value = finiteNumber(stats?.[key], 0);
    return [key, key === "hp" ? value : Math.trunc(value * synchroStatMultiplier(form, key))];
  }));
}

function resolveDamageStats(form, member, teamContext = state.team, synchronized = false) {
  return applySynchroStatBoosts(resolveStats(form, member, teamContext), form, synchronized);
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

function activeAbilityStatModifiers(form, member, key, teamContext = state.team) {
  const ability = abilityForMember(member);
  if (!ability) return [];
  const activeMembers = activeTeamMembers(teamContext);

  return (ability.statModifiers || []).map((modifier) => {
    if (!modifier.stats?.includes(key)) return null;

    if (modifier.condition === "allyAbility") {
      const hasAlly = activeMembers.some((teammate) => (
        teammate
        && teammate.id !== member.id
        && teammate.abilityId === modifier.abilityId
      ));
      return hasAlly ? modifier : null;
    }

    if (modifier.condition === "teamAbilityCount") {
      const count = activeMembers.filter((teammate) => teammate?.abilityId === modifier.abilityId).length;
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

function abilityStatMultiplier(form, member, key, teamContext = state.team) {
  return activeAbilityStatModifiers(form, member, key, teamContext)
    .reduce((multiplier, modifier) => multiplier * Number(modifier.multiplier || 1), 1);
}

function statModifierMultiplier(form, member, key, teamContext = state.team) {
  return heldItemStatMultiplier(form, member, key) * abilityStatMultiplier(form, member, key, teamContext);
}

function statModifierTitle(form, member, key, teamContext = state.team) {
  const notes = [];
  const heldItemTitle = heldItemStatTitle(form, member, key);
  if (heldItemTitle) notes.push(heldItemTitle);

  const ability = abilityForMember(member);
  const abilityModifiers = activeAbilityStatModifiers(form, member, key, teamContext);
  if (ability && abilityModifiers.length) {
    const multiplier = abilityStatMultiplier(form, member, key, teamContext);
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

function isDamageMove(move) {
  return Number(move?.power || 0) > 0;
}

function moveGuid(move) {
  return move?.guid || String(move?.id || "").split(":")[0] || "";
}

function heldItemForMember(member) {
  return member?.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null;
}

function abilityIdForMember(member) {
  const ability = abilityForMember(member);
  return ability?.id || ability?.internalName || null;
}

function teamAbilityCount(team, abilityId) {
  return activeTeamMembers(team).filter((member) => abilityIdForMember(member) === abilityId).length;
}

function stackedTeamModifierLabel(label, count) {
  return count > 1 ? `${label} (${count} active)` : label;
}

function memberElementalTypes(form, member) {
  return [form?.types?.main, member?.hiddenType]
    .filter((type) => type && type !== "NONE");
}

function memberHasMoveType(form, member, moveType) {
  return moveType && moveType !== "NONE" && memberElementalTypes(form, member).includes(moveType);
}

function effectiveFilledSlot(team, preferredSlot) {
  const preferred = clamp(Math.trunc(finiteNumber(preferredSlot, 0)), 0, 5);
  if (team[preferred]) return preferred;
  const first = team.findIndex(Boolean);
  return first === -1 ? preferred : first;
}

function effectiveMoveSlot(member, preferredSlot) {
  const preferred = clamp(Math.trunc(finiteNumber(preferredSlot, 0)), 0, 4);
  if (member?.moves?.[preferred]) return preferred;
  const first = member?.moves?.findIndex(Boolean) ?? -1;
  return first === -1 ? preferred : first;
}

function battleEntry(team, slot, side, options = {}) {
  const member = team[slot] || null;
  const form = member ? indexes.formsById.get(member.formId) : null;
  if (!member || !form) return null;
  const synchronized = Boolean(options.synchronized);
  return {
    side,
    slot,
    member,
    form,
    synchronized,
    stats: resolveDamageStats(form, member, team, synchronized),
    ability: abilityForMember(member),
    heldItem: heldItemForMember(member)
  };
}

function damageSelection() {
  const attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
  const targetSlot = effectiveFilledSlot(state.opponentTeam, state.damage.targetSlot);
  const attacker = battleEntry(state.team, attackerSlot, "current", {
    synchronized: state.damage.attackerSynchronized
  });
  const target = battleEntry(state.opponentTeam, targetSlot, "opponent", {
    synchronized: state.damage.defenderSynchronized
  });
  const moveSlot = effectiveMoveSlot(attacker?.member, state.damage.moveSlot);
  const moveId = attacker?.member?.moves?.[moveSlot] || null;
  const move = moveId ? indexes.movesById.get(moveId) : null;
  return { attackerSlot, targetSlot, attacker, target, moveSlot, move };
}

function effectiveMoveTypeForDamage(entry, move) {
  const baseType = move?.type || "NONE";
  if (abilityIdForMember(entry?.member) === "Bolsterer") {
    return {
      type: "NONE",
      notes: ["Indifference: move type becomes NONE"]
    };
  }
  return { type: baseType, notes: [] };
}

function relationForDamage(moveType, targetForm) {
  if (!moveType || moveType === "NONE") return "NORMAL";
  return targetForm?.defenseRelations?.[moveType] || "NORMAL";
}

function stabMultiplier(form, member, moveType) {
  return memberHasMoveType(form, member, moveType) ? 1.5 : 1;
}

function damageStatKeys(move) {
  if (move?.category === "PHYSICAL") {
    return { attackKey: "atk", defenseKey: "def", source: "Physical" };
  }
  return { attackKey: "spAtk", defenseKey: "spDef", source: move?.category === "STATUS" ? "Status damage uses special stats" : "Special" };
}

function stageMultiplier(stage, key) {
  if (key === "hp") return 1;
  const scale = key === "agility" ? DAMAGE_CONSTANTS.agilityStageScalar : DAMAGE_CONSTANTS.stageScalar;
  const term = f32(f32(stage) * scale);
  let multiplier = 1;
  if (term > 0) {
    multiplier = f32(f32(term + DAMAGE_CONSTANTS.stageFormulaPivot) / DAMAGE_CONSTANTS.stageFormulaPivot);
  } else if (term < 0) {
    multiplier = f32(DAMAGE_CONSTANTS.stageFormulaPivot / f32(DAMAGE_CONSTANTS.stageFormulaPivot - term));
  }
  return key === "agility" ? f32(Math.sqrt(multiplier)) : multiplier;
}

function liveStatValue(baseValue, stage, key) {
  return Math.trunc(f32(f32(baseValue) * stageMultiplier(stage, key)));
}

function truncTowardZero(value) {
  return value < 0 ? Math.ceil(value) : Math.trunc(value);
}

function damageFormula({ skillPower, attackerLevel, attack, defense, targetLevel }) {
  const attackPlus = f32(f32(attack) + DAMAGE_CONSTANTS.statGuardFlat);
  const defensePlus = f32(f32(defense) + DAMAGE_CONSTANTS.statGuardFlat);
  const attackDefenseRatio = f32(attackPlus / defensePlus);
  const levelLinear = f32(
    f32(f32(f32(attackerLevel) * DAMAGE_CONSTANTS.levelLinearMultiplier) + DAMAGE_CONSTANTS.levelLinearFlat)
      * DAMAGE_CONSTANTS.levelLinearScale
  );
  const afterBaseDivisor = f32(f32(attackDefenseRatio * levelLinear) / DAMAGE_CONSTANTS.damageBaseDivisor);
  const afterSkillPower = f32(afterBaseDivisor * f32(skillPower));
  const levelRatio = f32(
    f32(f32(attackerLevel) + DAMAGE_CONSTANTS.levelRatioOffset)
      / f32(f32(targetLevel) + DAMAGE_CONSTANTS.levelRatioOffset)
  );
  const afterLevelRatio = f32(afterSkillPower * levelRatio);
  const afterFinalScale = f32(afterLevelRatio * DAMAGE_CONSTANTS.finalBaseScale);
  const baseDamageFloat = f32(afterFinalScale + DAMAGE_CONSTANTS.baseDamageFlat);
  return {
    attackDefenseRatio,
    levelLinear,
    levelRatio,
    baseDamageFloat,
    nativeFloat: baseDamageFloat
  };
}

function pushDamageModifier(target, label, multiplier, phase = "stack") {
  const numeric = Number(multiplier);
  if (!Number.isFinite(numeric) || numeric === 1) return;
  target.notes.push({ label, multiplier: numeric, phase });
  if (phase === "critical") {
    target.criticalMultiplier *= numeric;
  } else {
    target.stackMultiplier *= numeric;
  }
}

function knownDamageModifiers({ attacker, target, attackerTeam, targetTeam, moveType, critical }) {
  const result = {
    stackMultiplier: 1,
    criticalMultiplier: 1,
    notes: [],
    warnings: []
  };
  const attackerAbilityId = abilityIdForMember(attacker.member);
  const targetAbilityId = abilityIdForMember(target.member);
  const attackerAbilityName = attacker.ability?.displayName || attackerAbilityId;
  const targetAbilityName = target.ability?.displayName || targetAbilityId;
  const handymanCount = teamAbilityCount(attackerTeam, "Handyman");
  const protectiveInstinctCount = teamAbilityCount(targetTeam, "ShieldSpirit");

  if (handymanCount > 0) {
    pushDamageModifier(result, stackedTeamModifierLabel("Handyman team damage", handymanCount), 1.15 ** handymanCount);
  }
  if (protectiveInstinctCount > 0) {
    pushDamageModifier(result, stackedTeamModifierLabel("Protective Instinct team damage reduction", protectiveInstinctCount), 0.9 ** protectiveInstinctCount);
  }

  if (attackerAbilityId === "Clumsy") pushDamageModifier(result, attackerAbilityName, 1.2);
  if (attackerAbilityId === "Echoblow") pushDamageModifier(result, attackerAbilityName, 0.7);
  if (attackerAbilityId === "Headlong") pushDamageModifier(result, attackerAbilityName, 1.5);
  if (attackerAbilityId === "Bolsterer") pushDamageModifier(result, attackerAbilityName, 1.7);
  if (attackerAbilityId === "MartialSoul" && (moveType === "CHAKRA" || moveType === "NONE")) {
    pushDamageModifier(result, attackerAbilityName, 1.5);
  }
  if (attackerAbilityId === "Typical" && memberHasMoveType(attacker.form, attacker.member, moveType)) {
    pushDamageModifier(result, attackerAbilityName, 1.5);
  }
  if (attackerAbilityId === "HeavyHitter" && critical) {
    pushDamageModifier(result, `${attackerAbilityName} critical`, 1.5, "critical");
  }
  if (targetAbilityId === "HardBoiled" && state.damage.critical) {
    result.warnings.push(`${targetAbilityName} blocks critical hits.`);
  }

  const attackerItem = attacker.heldItem;
  const targetItem = target.heldItem;
  const attackerItemClass = attackerItem?.battleEffectClass;
  const targetItemClass = targetItem?.battleEffectClass;
  const cardTypes = {
    CartardenteEffect: "FIRE",
    CartenergicaEffect: "ELECTRIC",
    CartagelataEffect: "ICE",
    CartinfaustaEffect: "ANOMALOUS"
  };

  if (attackerItemClass === "PiomboguantoEffect") pushDamageModifier(result, attackerItem.displayName, 1.35);
  if (attackerItemClass === "ManualedusoEffect" && moveType === "NONE") pushDamageModifier(result, attackerItem.displayName, 1.25);
  if (cardTypes[attackerItemClass] && cardTypes[attackerItemClass] === moveType) {
    pushDamageModifier(result, attackerItem.displayName, 1.15);
  }
  if (targetItemClass === "GrangiubbottoEffect") pushDamageModifier(result, targetItem.displayName, 0.7);
  if (targetItemClass === "AttivascudoEffect") {
    result.warnings.push("Instashield shield amount is not auto-applied.");
  }

  return result;
}

function pushMoveDamageModifier(result, label, multiplier) {
  const numeric = Number(multiplier);
  if (!Number.isFinite(numeric) || numeric === 1) return;
  result.stackMultiplier = f32(result.stackMultiplier * f32(numeric));
  result.notes.push({ label, multiplier: numeric });
}

function applyAgilityChargeMoveEffect(result, label) {
  const agilityStage = Math.max(0, Math.trunc(finiteNumber(state.damage.attackerAgilityStage, 0)));
  const damageMultiplier = f32(1 + agilityStage * DAMAGE_CONSTANTS.boltRushDamagePerAgilityStage);
  const accuracyMultiplier = f32(1 - agilityStage * DAMAGE_CONSTANTS.boltRushAccuracyPerAgilityStage);

  if (agilityStage > 0) {
    pushMoveDamageModifier(result, `${label} Agi +${agilityStage}`, damageMultiplier);
    result.accuracyMultiplier = f32(result.accuracyMultiplier * accuracyMultiplier);
    result.accuracyNotes.push({ label: `${label} Agi +${agilityStage}`, multiplier: accuracyMultiplier });
  }
  result.afterMoveNotes.push(`${label}: hit raises Agility by 1; miss resets Agility to -1`);
}

function selectedMoveEffects({ move }) {
  const result = {
    effectivePower: Number(move?.power || 0),
    stackMultiplier: 1,
    accuracyMultiplier: 1,
    bypassAccuracy: false,
    bypassAccuracyLabel: null,
    forceCritical: false,
    forceCriticalLabel: null,
    critChanceMultiplier: 1,
    notes: [],
    accuracyNotes: [],
    critChanceNotes: [],
    powerNotes: [],
    afterMoveNotes: [],
    warnings: []
  };
  if (!move) return result;

  const guid = moveGuid(move);
  if (guid === MOVE_EFFECT_GUIDS.BOLT_RUSH) {
    applyAgilityChargeMoveEffect(result, "Bolt Rush");
  }
  if (state.damage.moveBravadoPrimed && DAMAGING_CATEGORIES.has(move.category)) {
    applyAgilityChargeMoveEffect(result, "Bravado");
  }

  if (guid === MOVE_EFFECT_GUIDS.NONSENSE) {
    const count = clamp(Math.trunc(finiteNumber(state.damage.movePreviousNonsenseUses, 0)), 0, 10);
    if (count > 0) {
      pushMoveDamageModifier(result, `Nonsense previous uses x${count}`, 1 + count * DAMAGE_CONSTANTS.nonsenseStackPerPreviousUse);
    }
  }

  if (guid === MOVE_EFFECT_GUIDS.SNOWPLOUGH && state.damage.movePreviousIceUsed) {
    pushMoveDamageModifier(result, "Previous Ice move", 2);
  }

  if (guid === MOVE_EFFECT_GUIDS.BACTERIAL_SMASH && state.damage.moveTargetDebuffed) {
    pushMoveDamageModifier(result, "Target has negative BattleEffect", 1.5);
  }

  if (state.damage.defenderUpdraft) {
    if (guid === MOVE_EFFECT_GUIDS.DROPKICK) {
      result.effectivePower = 160;
      result.powerNotes.push("Dropkick target has Updraft: BP set to 160");
    }
    if (move.category === "PHYSICAL") {
      pushMoveDamageModifier(result, "Defender Updraft Physical", 0.5);
    } else if (move.category === "SPECIAL") {
      pushMoveDamageModifier(result, "Defender Updraft Special", 1.25);
    }
  }

  if (guid === MOVE_EFFECT_GUIDS.DIGIT_DRIVER) {
    result.bypassAccuracy = true;
    result.bypassAccuracyLabel = "Digit Driver";
  }

  if (guid === MOVE_EFFECT_GUIDS.SPARKLING_WATER) {
    result.forceCritical = true;
    result.forceCriticalLabel = "Sparkling Water";
  }

  if (guid === MOVE_EFFECT_GUIDS.FATAL_CRUSH) {
    result.critChanceMultiplier = f32(result.critChanceMultiplier * 5);
    result.critChanceNotes.push({ label: "Fatal Crush", multiplier: 5 });
  }

  return result;
}

function formatChance(value) {
  const rounded = roundForDisplay(value, Number.isInteger(Number(value)) ? 0 : 1);
  return `${rounded}%`;
}

function criticalChanceFromStage(stage) {
  let critUnits = 2;
  const positiveStage = Math.max(0, Math.trunc(finiteNumber(stage, 0)));
  for (let index = 0; index < positiveStage; index += 1) {
    critUnits += 1 + index;
  }
  return f32(f32(critUnits / DAMAGE_CONSTANTS.critChanceDenominator) * DAMAGE_CONSTANTS.percentScale);
}

function attackerTraitState(attacker) {
  const attribute = attacker?.form?.types?.attribute || "NONE";
  const attributeActive = Boolean(state.damage.attackerAttributeActive);
  const synchronized = Boolean(state.damage.attackerSynchronized);
  const active = ATTRIBUTE_TRAIT_TYPES.has(attribute) && attributeActive;
  const attributeItemActive = attributeActive && attacker?.heldItem?.battleEffectClass === "CromacartaEffect";
  const cromacartaBuff = attributeItemActive
    ? Number(CROMACARTA_TRAIT_FLAT_BUFFS[attribute] || 0)
    : 0;
  return {
    attribute,
    active,
    attributeActive,
    synchronized,
    flatBuff: active ? cromacartaBuff : 0,
    itemBuffName: attributeItemActive ? attacker.heldItem.displayName || "Chromacatcher" : null
  };
}

function describeTraitState(trait) {
  if (!trait.active) return trait.synchronized ? "sync selected; trait not activated" : "off";
  const sources = [];
  if (trait.attributeActive) sources.push("activation");
  if (trait.synchronized) sources.push("sync");
  if (trait.flatBuff) sources.push(`${trait.itemBuffName || "Chromacatcher"} +${roundForDisplay(trait.flatBuff, 2)}`);
  return sources.join("; ");
}

function attributeDamageEffects(attacker, target, damageFloat, options = {}) {
  const trait = attackerTraitState(attacker);
  const result = {
    trait,
    damageFloat,
    damageMultiplier: 1,
    flatDamage: 0,
    hpFraction: 0,
    label: trait.active ? typePill(trait.attribute) : "off",
    detail: describeTraitState(trait),
    warnings: []
  };

  if (!trait.active) return result;

  if (trait.attribute === "FUROR") {
    const baseMultiplier = trait.synchronized
      ? DAMAGE_CONSTANTS.furorSynchronizedTraitMultiplier
      : DAMAGE_CONSTANTS.furorTraitMultiplier;
    const damageMultiplier = f32(baseMultiplier + trait.flatBuff);
    result.damageMultiplier = damageMultiplier;
    result.damageFloat = f32(damageFloat * damageMultiplier);
    result.detail = `${formatMultiplier(damageMultiplier)} damage (${describeTraitState(trait)})`;
  } else if (trait.attribute === "SEREUM") {
    result.detail = `crit chance only (${describeTraitState(trait)})`;
  } else if (trait.attribute === "FELICIS") {
    result.detail = `no direct damage change (${describeTraitState(trait)})`;
  } else if (trait.attribute === "HORRENS") {
    result.detail = options.horrensNeutralizedResistance
      ? `neutralized resistance (${describeTraitState(trait)})`
      : `pending non-resistance branch (${describeTraitState(trait)})`;
    result.warnings.push("HORRENS resistance neutralization is modeled; the remaining native threshold branch is still partially decoded.");
  } else if (trait.attribute === "MESTUS") {
    const baseFraction = DAMAGE_CONSTANTS.mestusTraitHpFraction;
    const syncFraction = trait.synchronized ? DAMAGE_CONSTANTS.mestusTraitHpFraction : 0;
    const itemFraction = Number(trait.flatBuff || 0);
    const hpFraction = f32(f32(baseFraction + syncFraction) + itemFraction);
    const targetHp = Number(target?.stats?.hp || 0);
    const flatDamage = f32(targetHp * hpFraction);
    result.hpFraction = hpFraction;
    result.flatDamage = flatDamage;
    result.damageFloat = f32(damageFloat + flatDamage);
    result.detail = `${roundForDisplay(hpFraction * 100, 1)}% target max HP (+${roundForDisplay(flatDamage, 2)} damage; ${describeTraitState(trait)})`;
  } else {
    result.detail = `pending direct damage branch (${describeTraitState(trait)})`;
    result.warnings.push(`${trait.attribute} Attribute activation is selected, but that direct damage branch is not fully decoded yet.`);
  }

  return result;
}

function calculateHitChance({ attacker, target, move, moveEffects }) {
  const baseAccuracy = Number(move?.accuracy || 0);
  if (baseAccuracy <= 0) {
    return {
      chance: null,
      display: "-",
      detail: "No accuracy value",
      modifiers: []
    };
  }

  const modifiers = [];
  const attackerAbilityId = abilityIdForMember(attacker.member);
  const targetAbilityId = abilityIdForMember(target.member);
  const attackerAbilityName = attacker.ability?.displayName || attackerAbilityId;
  const targetAbilityName = target.ability?.displayName || targetAbilityId;

  if (attackerAbilityId === "ClearTarget") {
    return {
      chance: 100,
      display: "100%",
      detail: `${attackerAbilityName}: always hits`,
      modifiers: [{ label: attackerAbilityName, multiplier: "guaranteed" }]
    };
  }

  if (targetAbilityId === "ClearTarget") {
    return {
      chance: 100,
      display: "100%",
      detail: `${targetAbilityName}: attacks never miss`,
      modifiers: [{ label: targetAbilityName, multiplier: "guaranteed" }]
    };
  }

  if (moveEffects?.bypassAccuracy) {
    return {
      chance: 100,
      display: "100%",
      detail: `${moveEffects.bypassAccuracyLabel || move.displayName}: bypasses accuracy`,
      modifiers: [{ label: moveEffects.bypassAccuracyLabel || move.displayName, multiplier: "guaranteed" }]
    };
  }

  let chance = baseAccuracy;
  if (attackerAbilityId === "SniperSense") {
    chance *= 1.2;
    modifiers.push({ label: attackerAbilityName, multiplier: 1.2 });
  }
  if (attackerAbilityId === "Headlong") {
    chance *= 0.75;
    modifiers.push({ label: attackerAbilityName, multiplier: 0.75 });
  }

  const stageDifference = Number(state.damage.attackerAgilityStage || 0) - Number(state.damage.targetAgilityStage || 0);
  const stageMultiplier = 1 + stageDifference * DAMAGE_CONSTANTS.accuracyStageDiffScalar;
  if (stageDifference !== 0) {
    chance *= stageMultiplier;
    modifiers.push({
      label: `Agi stage diff ${stageDifference >= 0 ? "+" : ""}${stageDifference}`,
      multiplier: stageMultiplier
    });
  }

  if (Number.isFinite(moveEffects?.accuracyMultiplier) && moveEffects.accuracyMultiplier !== 1) {
    chance *= moveEffects.accuracyMultiplier;
    modifiers.push(...moveEffects.accuracyNotes);
  }

  chance = clamp(chance, 0, 100);
  return {
    chance,
    display: `${roundForDisplay(chance, chance % 1 === 0 ? 0 : 1)}%`,
    detail: modifiers.length
      ? modifiers.map((modifier) => `${modifier.label} ${formatMultiplier(modifier.multiplier)}`).join("; ")
      : `Base ${baseAccuracy}%`,
    modifiers
  };
}

function calculateCritChance({ attacker, target, move, moveEffects }) {
  const attackerAbilityId = abilityIdForMember(attacker.member);
  const attackerAbilityName = attacker.ability?.displayName || attackerAbilityId;
  const targetAbilityId = abilityIdForMember(target.member);
  const targetAbilityName = target.ability?.displayName || targetAbilityId;

  if (move?.category === "STATUS") {
    return {
      chance: 0,
      display: "0%",
      detail: "Status move",
      modifiers: [],
      warnings: []
    };
  }

  if (targetAbilityId === "HardBoiled") {
    return {
      chance: 0,
      display: "0%",
      detail: `${targetAbilityName} blocks crits`,
      modifiers: [],
      warnings: []
    };
  }

  if (moveEffects?.forceCritical) {
    return {
      chance: 100,
      display: "100%",
      detail: `${moveEffects.forceCriticalLabel || move.displayName}: always crits`,
      modifiers: [{ label: moveEffects.forceCriticalLabel || move.displayName, flat: 100 }],
      warnings: []
    };
  }

  if (state.damage.critical) {
    return {
      chance: 100,
      display: "100%",
      detail: "Forced",
      modifiers: [{ label: "Manual critical", flat: 100 }],
      warnings: []
    };
  }

  const agilityStage = Math.max(0, Math.trunc(finiteNumber(state.damage.attackerAgilityStage, 0)));
  const baseChance = criticalChanceFromStage(agilityStage);
  let chance = baseChance;
  const modifiers = [];
  const trait = attackerTraitState(attacker);

  if (trait.active && trait.attribute === "SEREUM") {
    const flatBonus = f32(DAMAGE_CONSTANTS.sereumCritChanceFlat + trait.flatBuff);
    chance = f32(chance + flatBonus);
    modifiers.push({ label: "SEREUM Attribute", flat: flatBonus });
  }
  if (attackerAbilityId === "LuckyStar") {
    const multiplier = DAMAGE_CONSTANTS.luckyBreakCritChanceMultiplier;
    chance = f32(chance * multiplier);
    modifiers.push({ label: attackerAbilityName, multiplier });
  }
  if (Number.isFinite(moveEffects?.critChanceMultiplier) && moveEffects.critChanceMultiplier !== 1) {
    chance = f32(chance * moveEffects.critChanceMultiplier);
    modifiers.push(...moveEffects.critChanceNotes);
  }

  chance = clamp(chance, 0, 100);
  const modifierDetails = modifiers.map((modifier) => {
    if (Number.isFinite(modifier.flat)) return `${modifier.label} +${formatChance(modifier.flat)}`;
    if (Number.isFinite(modifier.multiplier)) return `${modifier.label} ${formatMultiplier(modifier.multiplier)}`;
    return modifier.label;
  });
  return {
    chance,
    display: formatChance(chance),
    detail: modifierDetails.length
      ? `Base ${formatChance(baseChance)}; ${modifierDetails.join("; ")}`
      : `Base ${formatChance(baseChance)}`,
    modifiers,
    warnings: []
  };
}

function selectedWeatherEffect() {
  return DAMAGE_WEATHER_EFFECTS_BY_ID.get(state.damage.weatherEffect) || DAMAGE_WEATHER_EFFECTS[0];
}

function selectedTerrainEffect() {
  return DAMAGE_TERRAIN_EFFECTS_BY_ID.get(state.damage.terrainEffect) || DAMAGE_TERRAIN_EFFECTS[0];
}

function terrainDomainEffect(terrain, { isSuperEffective = false } = {}) {
  const result = {
    damageMultiplier: 1,
    superEffectiveMultiplier: 1,
    displayMultiplier: 1,
    reflectActualDamage: Boolean(terrain.reflectActualDamage),
    detail: terrain.detail || `${terrain.label}: no direct damage change`,
    warnings: []
  };

  if (terrain.id === "none") return result;

  if (Number.isFinite(terrain.damageMultiplier)) {
    result.damageMultiplier = f32(result.damageMultiplier * f32(terrain.damageMultiplier));
  }

  if (terrain.superEffectiveOnly) {
    if (Number.isFinite(terrain.superEffectiveMultiplier)) {
      if (isSuperEffective) {
        result.superEffectiveMultiplier = f32(result.superEffectiveMultiplier * f32(terrain.superEffectiveMultiplier));
      } else {
        result.detail = `${terrain.detail}; requires weakness/super-effective hit`;
      }
    } else if (isSuperEffective) {
      result.warnings.push(`${terrain.label} uses serialized ${terrain.unresolvedField}; current data does not expose its numeric value.`);
    } else {
      result.detail = `${terrain.detail}; requires weakness/super-effective hit`;
    }
  } else if (terrain.unresolvedField) {
    result.warnings.push(`${terrain.label} uses serialized ${terrain.unresolvedField}; current data does not expose its numeric value.`);
  }

  result.displayMultiplier = f32(result.damageMultiplier * result.superEffectiveMultiplier);
  if (terrain.nativeHook) {
    result.detail = `${result.detail} (${terrain.nativeHook})`;
  }
  return result;
}

function fieldDamageEffects(moveType, options = {}) {
  const weather = selectedWeatherEffect();
  const terrain = selectedTerrainEffect();
  let weatherMultiplier = 1;
  const weatherNotes = [];

  const weatherBuff = weather.buffs?.[moveType];
  if (Number.isFinite(weatherBuff)) {
    weatherMultiplier = f32(weatherMultiplier * f32(weatherBuff));
    weatherNotes.push(`${weather.label}: ${moveType} ${formatMultiplier(weatherBuff)}`);
  }

  const weatherDebuff = weather.debuffs?.[moveType];
  if (Number.isFinite(weatherDebuff)) {
    weatherMultiplier = f32(weatherMultiplier * f32(weatherDebuff));
    weatherNotes.push(`${weather.label}: ${moveType} ${formatMultiplier(weatherDebuff)}`);
  }

  if (weather.pendingDetail) weatherNotes.push(weather.pendingDetail);
  const terrainEffect = terrainDomainEffect(terrain, options);

  return {
    weather,
    terrain,
    weatherMultiplier,
    terrainMultiplier: terrainEffect.displayMultiplier,
    terrainDamageMultiplier: terrainEffect.damageMultiplier,
    terrainSuperEffectiveMultiplier: terrainEffect.superEffectiveMultiplier,
    reflectActualDamage: terrainEffect.reflectActualDamage,
    multiplier: f32(weatherMultiplier * terrainEffect.damageMultiplier),
    weatherDetail: weatherNotes.length ? weatherNotes.join("; ") : `${weather.label}: no damage change`,
    terrainDetail: terrainEffect.detail,
    warnings: terrainEffect.warnings
  };
}

function calculateDamagePreview() {
  const selection = damageSelection();
  const warnings = [];
  const { attacker, target, move } = selection;
  if (!attacker || !target || !move) {
    return { ready: false, selection, warnings: ["Select an attacker, target, and move."] };
  }
  if (!isDamageMove(move)) {
    return { ready: false, selection, warnings: ["Selected move has no direct damage power."] };
  }

  const effectiveType = effectiveMoveTypeForDamage(attacker, move);
  warnings.push(...effectiveType.notes);
  const naturalRelation = relationForDamage(effectiveType.type, target.form);
  const forcedWeakness = Boolean(state.damage.forceElementalWeakness);
  const relationBeforeTrait = forcedWeakness ? "WEAKNESS" : naturalRelation;
  const attackerTrait = attackerTraitState(attacker);
  const horrensNeutralizedResistance = attackerTrait.active && attackerTrait.attribute === "HORRENS" && relationBeforeTrait === "RESISTANCE";
  const relation = horrensNeutralizedResistance ? "NORMAL" : relationBeforeTrait;
  const effectivenessMultiplier = RELATION_MULTIPLIERS[relation] ?? 1;
  const reflected = !forcedWeakness && relation === "REFLECT";
  const { attackKey, defenseKey, source } = damageStatKeys(move);
  const attackStage = attackKey === "atk" ? state.damage.attackerAttackStage : state.damage.attackerSpecialAttackStage;
  const defenseStage = defenseKey === "def" ? state.damage.targetDefenseStage : state.damage.targetSpecialDefenseStage;
  const attack = liveStatValue(attacker.stats[attackKey], attackStage, attackKey);
  const defense = liveStatValue(target.stats[defenseKey], defenseStage, defenseKey);
  const attackerSynchroMultiplier = synchroStatMultiplier(attacker.form, attackKey);
  const defenderSynchroMultiplier = synchroStatMultiplier(target.form, defenseKey);
  const moveEffects = selectedMoveEffects({ move });
  warnings.push(...moveEffects.warnings);
  const targetAbilityId = abilityIdForMember(target.member);
  const critical = Boolean((state.damage.critical || moveEffects.forceCritical) && move.category !== "STATUS" && targetAbilityId !== "HardBoiled");
  const criticalReason = moveEffects.forceCritical ? moveEffects.forceCriticalLabel : "forced";
  const known = knownDamageModifiers({
    attacker,
    target,
    attackerTeam: state.team,
    targetTeam: state.opponentTeam,
    moveType: effectiveType.type,
    critical
  });
  warnings.push(...known.warnings);
  const hitChance = calculateHitChance({ attacker, target, move, moveEffects });
  const critChance = calculateCritChance({ attacker, target, move, moveEffects });
  warnings.push(...critChance.warnings);
  const isSuperEffective = effectivenessMultiplier >= DAMAGE_CONSTANTS.superEffectiveThreshold;
  const fieldEffects = fieldDamageEffects(effectiveType.type, { isSuperEffective });
  warnings.push(...fieldEffects.warnings);

  const base = damageFormula({
    skillPower: moveEffects.effectivePower,
    attackerLevel: Number(attacker.member.battleLevel || data.rules.battleLevel),
    attack,
    defense,
    targetLevel: Number(target.member.battleLevel || data.rules.battleLevel)
  });
  const effectivenessAfterSuper = f32(effectivenessMultiplier * f32(fieldEffects.terrainSuperEffectiveMultiplier));
  const stab = stabMultiplier(attacker.form, attacker.member, effectiveType.type);
  const effectivenessTimesStab = f32(effectivenessAfterSuper * f32(stab));
  const criticalStageMultiplier = critical ? DAMAGE_CONSTANTS.criticalBaseMultiplier : 1;
  const criticalCombined = f32(criticalStageMultiplier * f32(critical ? known.criticalMultiplier : 1));
  const stackMultiplier = f32(f32(f32(known.stackMultiplier) * f32(moveEffects.stackMultiplier)) * f32(fieldEffects.multiplier));
  const afterCrit = f32(effectivenessTimesStab * criticalCombined);
  const afterStack = f32(afterCrit * stackMultiplier);
  const afterBaseDamage = f32(afterStack * base.nativeFloat);
  const attributeEffects = attributeDamageEffects(attacker, target, afterBaseDamage, { horrensNeutralizedResistance });
  warnings.push(...attributeEffects.warnings);
  const truncatedBeforeFlat = truncTowardZero(attributeEffects.damageFloat);
  const finalDamage = truncatedBeforeFlat;
  const targetHp = Number(target.stats.hp || 0);
  const damageRecipient = reflected ? attacker : target;
  const damageRecipientHp = Number(damageRecipient.stats.hp || 0);
  const damageRecipientRole = reflected ? "Attacker" : "Target";
  const fieldReflectedDamage = fieldEffects.reflectActualDamage && !reflected ? finalDamage : 0;

  return {
    ready: true,
    selection,
    moveType: effectiveType.type,
    relation,
    naturalRelation,
    relationBeforeTrait,
    forcedWeakness,
    horrensNeutralizedResistance,
    reflected,
    effectivenessMultiplier,
    isSuperEffective,
    stab,
    attackKey,
    defenseKey,
    attack,
    defense,
    attackStage,
    defenseStage,
    skillPower: moveEffects.effectivePower,
    attackerSynchronized: Boolean(attacker.synchronized),
    defenderSynchronized: Boolean(target.synchronized),
    attackerSynchroMultiplier,
    defenderSynchroMultiplier,
    categorySource: source,
    critical,
    criticalReason,
    criticalStageMultiplier,
    known,
    moveEffects,
    hitChance,
    critChance,
    fieldEffects,
    attributeEffects,
    stackMultiplier,
    base,
    afterBaseDamage,
    truncatedBeforeFlat,
    finalDamage,
    targetHp,
    targetPercent: targetHp > 0 ? finalDamage / targetHp * 100 : 0,
    damageRecipientRole,
    damageRecipientName: damageRecipient.form.display,
    damageRecipientHp,
    damageRecipientPercent: damageRecipientHp > 0 ? finalDamage / damageRecipientHp * 100 : 0,
    fieldReflectedDamage,
    warnings
  };
}

function predictedTurnOrder() {
  const entries = [
    ...activeBattleEntries(state.team, "current"),
    ...activeBattleEntries(state.opponentTeam, "opponent")
  ].map((entry) => ({
    ...entry,
    agility: turnOrderAgility(entry),
    lateAction: abilityIdForMember(entry.member) === "JustAsPlanned"
  }));

  entries.sort((a, b) => (
    Number(a.lateAction) - Number(b.lateAction)
    || b.agility - a.agility
    || (a.side === "current" ? 0 : 1) - (b.side === "current" ? 0 : 1)
    || a.slot - b.slot
  ));

  const tieCounts = new Map();
  for (const entry of entries) {
    const key = `${entry.lateAction}:${entry.agility}`;
    tieCounts.set(key, (tieCounts.get(key) || 0) + 1);
  }

  return entries.map((entry, index) => ({
    ...entry,
    order: index + 1,
    tied: tieCounts.get(`${entry.lateAction}:${entry.agility}`) > 1
  }));
}

function damageEntrySynchronized(entry) {
  if (entry.side === "current" && entry.slot === state.damage.attackerSlot) {
    return Boolean(state.damage.attackerSynchronized);
  }
  if (entry.side === "opponent" && entry.slot === state.damage.targetSlot) {
    return Boolean(state.damage.defenderSynchronized);
  }
  return Boolean(entry.synchronized);
}

function turnOrderAgility(entry) {
  let stage = 0;
  if (entry.side === "current" && entry.slot === state.damage.attackerSlot) {
    stage = state.damage.attackerAgilityStage;
  } else if (entry.side === "opponent" && entry.slot === state.damage.targetSlot) {
    stage = state.damage.targetAgilityStage;
  }
  const stats = applySynchroStatBoosts(entry.stats, entry.form, damageEntrySynchronized(entry));
  return liveStatValue(stats.agility, stage, "agility");
}

function roundForDisplay(value, places = 2) {
  const multiplier = 10 ** places;
  return Math.round(Number(value) * multiplier) / multiplier;
}

function formatMultiplier(value) {
  return `x${roundForDisplay(value, 2)}`;
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
  app.innerHTML = `
    <div class="app-shell">
      ${renderHeader()}
      ${state.activeTab === "damage" ? renderDamageCalculator() : renderTeamBuilder()}
    </div>
    ${renderCommunityUsageConsentDialog()}
  `;
  if (dexScrollTop !== null && dexScrollTop !== undefined) {
    requestAnimationFrame(() => {
      const dexList = document.querySelector(".dex-list");
      if (dexList) dexList.scrollTop = dexScrollTop;
    });
  }
  maybeSubmitCommunityUsage();
}

function renderTeamBuilder() {
  const member = selectedMember();
  const form = selectedForm();
  return `
    <main class="workspace" aria-label="Team builder">
      ${renderDex()}
      ${renderParty()}
      ${renderEditor(member, form)}
      ${renderCoverage()}
    </main>
  `;
}

function renderDamageCalculator() {
  const preview = calculateDamagePreview();
  return `
    <main class="damage-workspace" aria-label="Damage calculator">
      ${renderDamagePartyPanel({
        title: "Current Party",
        side: "current",
        team: state.team,
        selectedSlot: preview.selection.attackerSlot,
        action: "select-damage-attacker"
      })}
      ${renderDamagePartyPanel({
        title: "Opposing Party",
        side: "opponent",
        team: state.opponentTeam,
        selectedSlot: preview.selection.targetSlot,
        action: "select-damage-target"
      })}
      ${renderDamageCalcPanel(preview)}
      ${renderTurnOrderPanel()}
    </main>
  `;
}

function renderDamagePartyPanel({ title, side, team, selectedSlot, action }) {
  const filled = team.filter(Boolean).length;
  const isOpponent = side === "opponent";
  const savedTeams = state.savedTeams;
  const activeSlot = isOpponent ? state.activeOpponentTeamSlot : state.activeTeamSlot;
  const activeTeam = savedTeams[activeSlot] || { name: `Team ${activeSlot + 1}`, team };
  return `
    <section class="panel damage-party-panel damage-${escapeHtml(side)}-panel" aria-label="${escapeHtml(title)}">
      <div class="panel-title">
        <h2>${escapeHtml(title)}</h2>
        <span>${filled}/6</span>
      </div>
      ${renderTeamManager({
        activeTeam,
        activeSlot,
        savedTeams,
        selectAction: isOpponent ? "change-opponent-team-slot" : "change-team-slot",
        renameAction: isOpponent ? "rename-opponent-team" : "rename-team"
      })}
      ${isOpponent ? `
        <div class="damage-panel-actions">
          <button class="command small" type="button" data-action="add-opponent-member">Add</button>
          <button class="command small" type="button" data-action="import-opponent-team">Import</button>
          <button class="command small" type="button" data-action="export-opponent-team">Export</button>
          <button class="command small" type="button" data-action="swap-damage-parties">Swap</button>
          <button class="command small subtle" type="button" data-action="clear-opponent-team">Clear</button>
          <label class="damage-add-picker">
            <span class="visually-hidden">Add opposing Animon</span>
            <select data-action="change-opponent-add-form" aria-label="Add opposing Animon">
              ${data.forms.map((form) => `
                <option value="${escapeHtml(form.id)}" ${form.id === state.damage.opponentAddFormId ? "selected" : ""}>${escapeHtml(form.display)}</option>
              `).join("")}
            </select>
          </label>
        </div>
      ` : ""}
      <div class="damage-member-list">
        ${team.map((member, index) => renderDamageMemberCard(member, index, team, side, selectedSlot, action)).join("")}
      </div>
    </section>
  `;
}

function renderDamageMemberCard(member, index, team, side, selectedSlot, action) {
  const selected = member && index === selectedSlot ? "selected" : "";
  const active = activeSlotClass(index);
  const activeTitle = isActiveTeamSlot(index) ? "Active team slot" : "";
  if (!member) {
    return `
      <div class="damage-member-card empty ${active}" data-party-side="${escapeHtml(side)}" data-slot="${index}" title="${escapeHtml(activeTitle)}">
        <span class="slot-index">${index + 1}</span>
        <span class="muted">Empty</span>
      </div>
    `;
  }

  const form = indexes.formsById.get(member.formId);
  const synchronized = side === "current"
    ? index === state.damage.attackerSlot && state.damage.attackerSynchronized
    : index === state.damage.targetSlot && state.damage.defenderSynchronized;
  const stats = resolveDamageStats(form, member, team, synchronized);
  const moveCount = member.moves.filter(Boolean).length;
  return `
    <button class="damage-member-card ${selected} ${active}" type="button" draggable="true" data-action="${escapeHtml(action)}" data-party-side="${escapeHtml(side)}" data-slot="${index}" title="${escapeHtml(activeTitle)}">
      <span class="slot-index">${index + 1}</span>
      ${spriteHtml(form, "tiny")}
      <span class="damage-member-text">
        <strong>${escapeHtml(form.display)}</strong>
        <small>${side === "current" ? `${moveCount}/5 moves` : "target"} - Agi ${stats.agility}</small>
      </span>
    </button>
  `;
}

function renderDamageCalcPanel(preview) {
  const attackerName = preview.selection.attacker?.form.display || "No attacker";
  const targetName = preview.selection.target?.form.display || "No target";
  return `
    <section class="panel damage-calc-panel" aria-label="Damage result">
      <div class="panel-title">
        <h2>Damage Calculator</h2>
        <span>${escapeHtml(attackerName)} -> ${escapeHtml(targetName)}</span>
      </div>
      <div class="damage-calc-scroll">
        ${renderDamageMovePicker(preview.selection)}
        ${renderDamageSetupRow(preview.selection)}
        ${renderDamageResult(preview)}
      </div>
    </section>
  `;
}

function renderDamageSetupRow(selection) {
  return `
    <section class="damage-setup-row" aria-label="Damage setup">
      <div class="damage-stat-panels" aria-label="Stat distributions">
        ${renderDamageStatEditor("current", selection.attacker, "Attacker Stats")}
        ${renderDamageStatEditor("opponent", selection.target, "Defender Stats")}
      </div>
      ${renderDamageBattleControls()}
    </section>
  `;
}

function renderDamageStatEditor(side, entry, title) {
  if (!entry) {
    return `
      <section class="subpanel damage-section">
        <div class="subpanel-title"><h3>${escapeHtml(title)}</h3><span>Empty</span></div>
        <div class="damage-section-body muted">Select a ${side === "opponent" ? "target" : "party member"}.</div>
      </section>
    `;
  }

  const used = totalBoosts(entry.member);
  const remaining = remainingBoosts(entry.member);
  return `
    <section class="subpanel damage-section damage-stat-editor">
      <div class="subpanel-title">
        <h3>${escapeHtml(title)}</h3>
        <span>${used}/${data.rules.statBoostBudget} BP</span>
      </div>
      <div class="damage-stat-actions">
        <button class="command small" type="button" data-action="damage-balanced-bp" data-side="${escapeHtml(side)}">Balanced</button>
        <button class="command small subtle" type="button" data-action="damage-clear-bp" data-side="${escapeHtml(side)}">Clear BP</button>
      </div>
      <div class="damage-stat-summary">${escapeHtml(entry.form.display)} - ${remaining} BP left${entry.synchronized ? " - Synchro stats" : ""}</div>
      <div class="damage-stat-table" role="table">
        <div class="damage-stat-row damage-stat-head" role="row">
          <span>Stat</span>
          <span>BP</span>
          <span>Lv50</span>
        </div>
        ${data.rules.statKeys.map((key) => renderDamageStatRow(side, entry, key)).join("")}
      </div>
    </section>
  `;
}

function renderDamageStatRow(side, entry, key) {
  const boost = entry.member.statBoosts[key];
  return `
    <div class="damage-stat-row" role="row">
      <strong>${formatStatKey(key)}</strong>
      <div class="range-cell damage-bp-cell">
        <input type="range" min="${data.rules.statBoostMin}" max="${data.rules.statBoostPerStatCap}" value="${escapeHtml(boost)}" data-damage-side="${escapeHtml(side)}" data-damage-stat-boost="${escapeHtml(key)}" aria-label="${escapeHtml(`${side} ${formatStatKey(key)} BP slider`)}">
        <input type="number" min="${data.rules.statBoostMin}" max="${data.rules.statBoostPerStatCap}" value="${escapeHtml(boost)}" data-damage-side="${escapeHtml(side)}" data-damage-stat-boost="${escapeHtml(key)}" aria-label="${escapeHtml(`${side} ${formatStatKey(key)} BP`)}">
      </div>
      <strong>${entry.stats[key]}</strong>
    </div>
  `;
}

function renderDamageMovePicker(selection) {
  const member = selection.attacker?.member;
  if (!member) {
    return `
      <section class="subpanel damage-section">
        <div class="subpanel-title"><h3>Move</h3><span>No attacker</span></div>
        <div class="damage-section-body muted">Current party is empty.</div>
      </section>
    `;
  }

  return `
    <section class="subpanel damage-section">
      <div class="subpanel-title">
        <h3>Move</h3>
        <span>Slot ${selection.moveSlot + 1}</span>
      </div>
      <div class="damage-section-body">
        <label class="form-switch">
          <span>Selected Move</span>
          <select data-action="change-damage-move">
            ${member.moves.map((moveId, index) => {
              const move = moveId ? indexes.movesById.get(moveId) : null;
              const label = move ? moveLabel(move) : `Move ${index + 1} - Empty`;
              return `<option value="${index}" ${index === selection.moveSlot ? "selected" : ""}>${escapeHtml(label)}</option>`;
            }).join("")}
          </select>
        </label>
        ${selection.move ? `<div class="move-detail">${renderMoveDetail(selection.move)}</div>` : `<div class="move-detail muted">No move selected</div>`}
        ${renderDamageTargetDefences(selection.target)}
      </div>
    </section>
  `;
}

function renderDamageTargetDefences(target) {
  if (!target?.form) {
    return `<div class="damage-defence-row muted">Select a defender to view type defences.</div>`;
  }

  const groups = typeDefenseGroups(target.form, true);
  return `
    <div class="damage-defence-row" aria-label="${escapeHtml(target.form.display)} type defences">
      <div class="damage-defence-heading">
        <span>Defender Type Defences</span>
        <strong>${typePill(target.form.types.attribute)} ${typePill(target.form.types.main)}</strong>
      </div>
      <div class="damage-defence-grid">
        ${groups.map((group) => `
          <div class="damage-defence-cell">
            <span>${escapeHtml(group.label)}</span>
            <div class="matchup-chip-list">
              ${group.types.length ? group.types.map((type) => typePill(type)).join("") : `<small>None</small>`}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderDamageBattleControls() {
  const selection = damageSelection();
  return `
    <section class="subpanel damage-section">
      <div class="subpanel-title">
        <h3>Battle Modifiers</h3>
        <span>Stages + Field</span>
      </div>
      <div class="modifier-groups">
        <div class="modifier-group">
          <h4>Attacker State</h4>
          <div class="calc-control-grid attacker-state-grid">
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="attackerSynchronized" ${state.damage.attackerSynchronized ? "checked" : ""}>
              <span>Synchronisation</span>
            </label>
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="attackerAttributeActive" ${state.damage.attackerAttributeActive ? "checked" : ""}>
              <span>Attribute activation</span>
            </label>
          </div>
        </div>
        <div class="modifier-group">
          <h4>Attacker Changes</h4>
          <div class="calc-control-grid stage-grid">
            ${renderDamageNumberField("attackerAttackStage", "Atk", -6, 6, 1)}
            ${renderDamageNumberField("attackerSpecialAttackStage", "SpA", -6, 6, 1)}
            ${renderDamageNumberField("attackerAgilityStage", "Agi", -6, 6, 1)}
          </div>
        </div>
        <div class="modifier-group">
          <h4>Defender State</h4>
          <div class="calc-control-grid attacker-state-grid">
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="defenderSynchronized" ${state.damage.defenderSynchronized ? "checked" : ""}>
              <span>Synchronisation</span>
            </label>
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="defenderUpdraft" ${state.damage.defenderUpdraft ? "checked" : ""}>
              <span>Updraft</span>
            </label>
          </div>
        </div>
        <div class="modifier-group">
          <h4>Defender Changes</h4>
          <div class="calc-control-grid stage-grid">
            ${renderDamageNumberField("targetDefenseStage", "Def", -6, 6, 1)}
            ${renderDamageNumberField("targetSpecialDefenseStage", "SpD", -6, 6, 1)}
            ${renderDamageNumberField("targetAgilityStage", "Agi", -6, 6, 1)}
          </div>
        </div>
        <div class="modifier-group">
          <h4>Damage</h4>
          <div class="calc-control-grid field-effect-grid">
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="critical" ${state.damage.critical ? "checked" : ""}>
              <span>Critical</span>
            </label>
            <label class="calc-check">
              <input type="checkbox" data-damage-toggle="forceElementalWeakness" ${state.damage.forceElementalWeakness ? "checked" : ""}>
              <span>Weakness</span>
            </label>
            ${renderDamageSelectField("weatherEffect", "Weather", DAMAGE_WEATHER_EFFECTS)}
            ${renderDamageSelectField("terrainEffect", "Terrain", DAMAGE_TERRAIN_EFFECTS)}
          </div>
        </div>
        ${renderMoveEffectControls(selection.move)}
      </div>
    </section>
  `;
}

function renderMoveEffectControls(move) {
  const guid = moveGuid(move);
  const controls = [];
  if (move && DAMAGING_CATEGORIES.has(move.category) && Number(move.power || 0) > 0) {
    controls.push(`
      <label class="calc-check">
        <input type="checkbox" data-damage-toggle="moveBravadoPrimed" ${state.damage.moveBravadoPrimed ? "checked" : ""}>
        <span>Bravado primed</span>
      </label>
    `);
  }
  if (guid === MOVE_EFFECT_GUIDS.SNOWPLOUGH) {
    controls.push(`
      <label class="calc-check">
        <input type="checkbox" data-damage-toggle="movePreviousIceUsed" ${state.damage.movePreviousIceUsed ? "checked" : ""}>
        <span>Prior Ice move</span>
      </label>
    `);
  }
  if (guid === MOVE_EFFECT_GUIDS.BACTERIAL_SMASH) {
    controls.push(`
      <label class="calc-check">
        <input type="checkbox" data-damage-toggle="moveTargetDebuffed" ${state.damage.moveTargetDebuffed ? "checked" : ""}>
        <span>Target debuffed</span>
      </label>
    `);
  }
  if (guid === MOVE_EFFECT_GUIDS.NONSENSE) {
    controls.push(renderDamageNumberField("movePreviousNonsenseUses", "Nonsense uses", 0, 10, 1));
  }
  if (!controls.length) return "";
  return `
    <div class="modifier-group">
      <h4>Move Effects</h4>
      <div class="calc-control-grid field-effect-grid">
        ${controls.join("")}
      </div>
    </div>
  `;
}

function renderDamageNumberField(field, label, min, max, step) {
  return `
    <label class="calc-field">
      <span>${escapeHtml(label)}</span>
      <input type="number" min="${min}" max="${max}" step="${step}" value="${escapeHtml(state.damage[field])}" data-damage-field="${escapeHtml(field)}">
    </label>
  `;
}

function renderDamageSelectField(field, label, options) {
  return `
    <label class="calc-field">
      <span>${escapeHtml(label)}</span>
      <select data-damage-field="${escapeHtml(field)}">
        ${options.map((option) => `
          <option value="${escapeHtml(option.id)}" ${state.damage[field] === option.id ? "selected" : ""}>${escapeHtml(option.label)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function damageTypeDetail(preview) {
  const detail = [`${preview.relation} ${formatMultiplier(preview.effectivenessMultiplier)}`];
  if (preview.forcedWeakness) {
    detail.push(`natural ${preview.naturalRelation}`);
  }
  if (preview.horrensNeutralizedResistance) {
    detail.push(`HORRENS neutralized ${preview.relationBeforeTrait}`);
  }
  return detail.join("; ");
}

function damageTypeTraceDetail(preview) {
  if (preview.forcedWeakness) {
    return `forced weakness; natural ${preview.naturalRelation}`;
  }
  if (preview.horrensNeutralizedResistance) {
    return `HORRENS neutralized ${preview.relationBeforeTrait}`;
  }
  return preview.relation;
}

function synchroStatTraceDetail(entry, key) {
  const baseStat = Number(entry?.form?.baseStats?.[key] || 0);
  const bst = formBaseStatTotal(entry?.form);
  return `${formatStatKey(key)} base ${baseStat}/${bst}`;
}

function renderMovePowerTrace(preview) {
  const originalPower = Number(preview.selection.move.power || 0);
  if (preview.skillPower === originalPower && !preview.moveEffects.powerNotes.length) return "";
  return renderTraceRow("Move Power", preview.skillPower, preview.moveEffects.powerNotes.join("; ") || `base ${originalPower}`);
}

function renderMoveEffectTrace(moveEffects) {
  if (!moveEffects?.notes?.length && moveEffects?.stackMultiplier === 1) return "";
  return renderTraceRow("Move Effect", formatMultiplier(moveEffects.stackMultiplier), renderKnownModifierText(moveEffects.notes));
}

function renderAfterMoveTrace(moveEffects) {
  if (!moveEffects?.afterMoveNotes?.length) return "";
  return renderTraceRow("After Move", "-", moveEffects.afterMoveNotes.join("; "));
}

function renderDamageResult(preview) {
  if (!preview.ready) {
    return `
      <section class="subpanel damage-section damage-result-panel">
        <div class="subpanel-title">
          <h3>Result</h3>
          <span>Waiting</span>
        </div>
        <div class="empty-state compact">
          <h2>No calculation</h2>
          <p>${escapeHtml(preview.warnings[0] || "Missing setup.")}</p>
        </div>
      </section>
    `;
  }

  const recipientPercent = roundForDisplay(preview.damageRecipientPercent, 1);
  const koText = preview.finalDamage <= 0
    ? "0 damage"
    : preview.finalDamage >= preview.damageRecipientHp
      ? "KO"
      : `${Math.ceil((preview.damageRecipientHp - preview.finalDamage) / preview.finalDamage) + 1} hits`;
  const hpLabel = preview.reflected ? "Attacker HP" : "Target HP";
  return `
    <section class="subpanel damage-section damage-result-panel">
      <div class="subpanel-title">
        <h3>Result</h3>
        <span>${escapeHtml(preview.selection.move.displayName)}</span>
      </div>
      <div class="damage-summary-grid">
        <div class="damage-total">
          <span>Damage</span>
          <strong>${escapeHtml(preview.finalDamage)}</strong>
          <small>${escapeHtml(recipientPercent)}% HP</small>
        </div>
        <div class="damage-metric">
          <span>${escapeHtml(hpLabel)}</span>
          <strong>${escapeHtml(preview.damageRecipientHp)}</strong>
          <small>${escapeHtml(koText)}</small>
        </div>
        <div class="damage-metric">
          <span>Type</span>
          <strong>${typePill(preview.moveType)}</strong>
          <small>${escapeHtml(damageTypeDetail(preview))}</small>
        </div>
        <div class="damage-metric">
          <span>Hit Chance</span>
          <strong>${escapeHtml(preview.hitChance.display)}</strong>
          <small>${escapeHtml(preview.hitChance.detail)}</small>
        </div>
        <div class="damage-metric">
          <span>Crit Chance</span>
          <strong>${escapeHtml(preview.critChance.display)}</strong>
          <small>${escapeHtml(preview.critChance.detail)}</small>
        </div>
      </div>
      <div class="damage-trace">
        ${renderTraceRow("Stats", `${formatStatKey(preview.attackKey)} ${preview.attack} vs ${formatStatKey(preview.defenseKey)} ${preview.defense}`, preview.categorySource)}
        ${preview.attackerSynchronized ? renderTraceRow("Attacker Sync", formatMultiplier(preview.attackerSynchroMultiplier), synchroStatTraceDetail(preview.selection.attacker, preview.attackKey)) : ""}
        ${preview.defenderSynchronized ? renderTraceRow("Defender Sync", formatMultiplier(preview.defenderSynchroMultiplier), synchroStatTraceDetail(preview.selection.target, preview.defenseKey)) : ""}
        ${renderTraceRow("Recipient", preview.damageRecipientRole, preview.damageRecipientName)}
        ${renderMovePowerTrace(preview)}
        ${renderTraceRow("Base", roundForDisplay(preview.base.baseDamageFloat, 4), "before multipliers")}
        ${renderTraceRow("Type", formatMultiplier(preview.effectivenessMultiplier), damageTypeTraceDetail(preview))}
        ${renderTraceRow("STAB", formatMultiplier(preview.stab), memberHasMoveType(preview.selection.attacker.form, preview.selection.attacker.member, preview.moveType) ? "matched" : "none")}
        ${renderTraceRow("Critical", preview.critical ? formatMultiplier(preview.criticalStageMultiplier * preview.known.criticalMultiplier) : "x1", preview.critical ? preview.criticalReason : "off")}
        ${renderTraceRow("Crit Chance", preview.critChance.display, preview.critChance.detail)}
        ${renderMoveEffectTrace(preview.moveEffects)}
        ${renderTraceRow("Known", formatMultiplier(preview.known.stackMultiplier), renderKnownModifierText(preview.known.notes))}
        ${renderTraceRow("Weather", formatMultiplier(preview.fieldEffects.weatherMultiplier), preview.fieldEffects.weatherDetail)}
        ${renderTraceRow("Terrain", formatMultiplier(preview.fieldEffects.terrainMultiplier), preview.fieldEffects.terrainDetail)}
        ${preview.fieldReflectedDamage ? renderTraceRow("Field Extra", preview.fieldReflectedDamage, "Malevolent Shriek reflected damage to attacker after HP loss") : ""}
        ${renderTraceRow("Attribute", preview.attributeEffects.label, preview.attributeEffects.detail)}
        ${renderAfterMoveTrace(preview.moveEffects)}
        ${renderTraceRow("Rounding", preview.truncatedBeforeFlat, "trunc after attribute effects")}
      </div>
      ${renderDamageWarnings(preview)}
    </section>
  `;
}

function renderTraceRow(label, value, detail) {
  return `
    <div class="damage-trace-row">
      <span>${escapeHtml(label)}</span>
      <strong>${typeof value === "string" && value.includes("<") ? value : escapeHtml(value)}</strong>
      <small>${typeof detail === "string" && detail.includes("<") ? detail : escapeHtml(detail || "")}</small>
    </div>
  `;
}

function renderKnownModifierText(notes) {
  if (!notes.length) return "none";
  return notes.map((note) => `${note.label} ${formatMultiplier(note.multiplier)}`).join("; ");
}

function renderDamageWarnings(preview) {
  const warnings = [...preview.warnings];
  if (preview.reflected) warnings.push("Reflected damage uses the defender's defensive stat, then applies the final damage to the attacker.");
  if (!warnings.length) return "";
  return `
    <div class="warning-list damage-warning-list">
      ${warnings.map((warning) => `<div>${escapeHtml(warning)}</div>`).join("")}
    </div>
  `;
}

function renderTurnOrderPanel() {
  const order = predictedTurnOrder();
  return `
    <aside class="panel turn-order-panel" aria-label="Predicted turn order">
      <div class="panel-title">
        <h2>Turn Order</h2>
        <span>${order.length} active</span>
      </div>
      <div class="turn-order-list">
        ${order.length ? order.map(renderTurnOrderRow).join("") : `<div class="damage-section-body muted">Import or build parties.</div>`}
      </div>
    </aside>
  `;
}

function renderTurnOrderRow(entry) {
  const sideLabel = entry.side === "current" ? "Current" : "Enemy";
  const notes = [
    entry.tied ? "tie" : "",
    entry.lateAction ? "late" : ""
  ].filter(Boolean).join(", ");
  return `
    <div class="turn-order-row ${entry.side}">
      <strong class="turn-rank">${entry.order}</strong>
      ${spriteHtml(entry.form, "tiny")}
      <span class="turn-order-name">
        <strong>${escapeHtml(entry.form.display)}</strong>
        <small>${sideLabel} ${entry.slot + 1}${notes ? ` - ${escapeHtml(notes)}` : ""}</small>
      </span>
      <span class="turn-agility">Agi ${entry.agility}</span>
    </div>
  `;
}

function renderHeader() {
  const filled = state.team.filter(Boolean).length;
  const isDark = state.theme === "dark";
  const usageEnabled = state.communityUsageConsent === true;
  return `
    <header class="topbar">
      <nav class="app-tabs" aria-label="App sections">
        <button class="app-tab app-tab-builder ${state.activeTab === "builder" ? "active" : ""}" type="button" data-action="switch-tab" data-tab="builder" aria-current="${state.activeTab === "builder" ? "page" : "false"}">
          <span class="app-tab-title">Lumentale Team Builder</span>
          <span class="app-tab-subtitle">${filled}/6 slots filled</span>
        </button>
        <button class="app-tab app-tab-calc ${state.activeTab === "damage" ? "active" : ""}" type="button" data-action="switch-tab" data-tab="damage" aria-current="${state.activeTab === "damage" ? "page" : "false"}">
          <span class="app-tab-title">Damage Calculator</span>
          <span class="app-tab-subtitle">Individual and Team support</span>
        </button>
      </nav>
      <div class="topbar-actions">
        <button class="usage-toggle ${usageEnabled ? "usage-toggle-on" : ""}" type="button" data-action="toggle-community-usage" aria-label="Toggle anonymous usage sharing" aria-pressed="${usageEnabled}">
          <span class="usage-toggle-label">Usage</span>
          <span class="usage-track" aria-hidden="true"><span class="usage-thumb"></span></span>
        </button>
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

function renderCommunityUsageConsentDialog() {
  if (state.communityUsageConsent !== null) return "";
  return `
    <div class="modal-backdrop" role="presentation">
      <section class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="community-usage-title">
        <h2 id="community-usage-title">Share Community Usage?</h2>
        <p>
          Are you cool with sharing anonymous completed teams for community usage stats?
        </p>
        <p>
          All it sends is Animon and their forms, moves, items, ability, hidden type, rolls, and BP.
        </p>
        <div class="consent-actions">
          <button class="command subtle" type="button" data-action="set-community-usage-consent" data-consent="false">No</button>
          <button class="command" type="button" data-action="set-community-usage-consent" data-consent="true">Yes</button>
        </div>
      </section>
    </div>
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
      <input id="dex-search" class="search-input" type="search" value="${escapeHtml(state.search)}" placeholder="Search Animon, type, move, or quirk" autocomplete="off">
      <div class="dex-list">
        ${forms.map((form) => renderDexEntry(form)).join("")}
      </div>
    </section>
  `;
}

function renderDexEntry(form) {
  const bst = formBaseStatTotal(form);
  return `
    <article class="dex-entry" draggable="true" data-form-id="${escapeHtml(form.id)}">
      ${spriteHtml(form, "tiny")}
      <button class="dex-main" data-action="add-form" data-form-id="${escapeHtml(form.id)}" title="Add ${escapeHtml(form.display)}">
        <span class="dex-name">${escapeHtml(form.display)}</span>
        <span class="dex-meta">#${escapeHtml(form.dexIndex ?? "-")} ${typePill(form.types.attribute)} ${typePill(form.types.main)}</span>
      </button>
      <span class="dex-count" title="Base stat total">${bst}</span>
    </article>
  `;
}

function renderParty() {
  const activeTeam = state.savedTeams[state.activeTeamSlot] || { name: `Team ${state.activeTeamSlot + 1}`, team: state.team };
  return `
    <section class="panel party-panel" aria-label="Party">
      <div class="panel-title">
        <h2>Party</h2>
        <span>6 slots</span>
      </div>
      ${renderTeamManager({
        activeTeam,
        activeSlot: state.activeTeamSlot,
        savedTeams: state.savedTeams,
        selectAction: "change-team-slot",
        renameAction: "rename-team"
      })}
      <div class="party-grid">
        ${state.team.map((member, index) => renderPartySlot(member, index)).join("")}
      </div>
    </section>
  `;
}

function renderTeamManager({ activeTeam, activeSlot, savedTeams, selectAction, renameAction }) {
  return `
    <div class="team-manager">
      <label class="team-manager-field">
        <span>Team Slot</span>
        <select data-action="${escapeHtml(selectAction)}">
          ${savedTeams.map((slot, index) => `
            <option value="${index}" ${index === activeSlot ? "selected" : ""}>${escapeHtml(savedTeamOptionLabel(slot, index))}</option>
          `).join("")}
        </select>
      </label>
      <label class="team-manager-field">
        <span>Team Name</span>
        <input type="text" value="${escapeHtml(activeTeam.name)}" maxlength="48" data-action="${escapeHtml(renameAction)}" autocomplete="off">
      </label>
    </div>
  `;
}

function renderPartySlot(member, index) {
  const selected = index === state.selectedSlot ? "selected" : "";
  const active = activeSlotClass(index);
  const activeTitle = isActiveTeamSlot(index) ? "Active team slot" : "";
  if (!member) {
    return `
      <div class="party-slot empty ${selected} ${active}" data-party-side="current" data-slot="${index}" title="${escapeHtml(activeTitle)}">
        <button class="slot-select" data-action="select-slot" data-slot="${index}">
          <span class="slot-index">${index + 1}</span>
          <span>Drop Animon</span>
        </button>
        <button class="command small party-slot-import" type="button" data-action="import-animon-slot" data-slot="${index}">Import</button>
      </div>
    `;
  }

  const form = indexes.formsById.get(member.formId);
  const moveCount = member.moves.filter(Boolean).length;
  const remaining = remainingBoosts(member);
  return `
    <div class="party-slot filled ${selected} ${active}" draggable="true" data-party-side="current" data-slot="${index}" title="${escapeHtml(activeTitle)}">
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
          <p>BST ${formBaseStatTotal(form)} - SP ${form.sp}</p>
        </div>
      </div>
      <div class="editor-controls">
        <div class="editor-member-actions" aria-label="Selected Animon import and export">
          <button class="command small" type="button" data-action="export-animon">Export</button>
          <button class="command small" type="button" data-action="import-animon">Import</button>
        </div>
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
      ${move ? renderMoveDescription(move) : ""}
    </div>
  `;
}

function renderMoveDescription(move) {
  if (!MOVE_DESCRIPTION_CATEGORIES.has(move.category) || !move.description) return "";
  return `<div class="move-description">${escapeHtml(move.description)}</div>`;
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
  const groups = typeDefenseGroups(form, false).map((group) => ({
    ...group,
    label: {
      Weak: "Weaknesses",
      Resist: "Resists",
      Immune: "Immunities",
      Reflect: "Reflects"
    }[group.label] || group.label
  }));

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

function typeDefenseGroups(form, includeEmpty) {
  return TYPE_DEFENSE_GROUPS.map((group) => ({
    ...group,
    types: (data.defenseTypes || []).filter((type) => group.relations.has(form?.defenseRelations?.[type]))
  })).filter((group) => includeEmpty || group.types.length > 0);
}

function teamEntries(members = state.team.filter(Boolean)) {
  return members
    .map((member) => ({ member, form: indexes.formsById.get(member.formId) }))
    .filter((entry) => entry.form);
}

function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}

function buildTeamShellWarnings(team = state.team) {
  const warnings = [];
  const members = (team || []).filter(Boolean);
  const missingSlots = Math.max(0, 6 - members.length);

  if (missingSlots > 0) {
    warnings.push(`${missingSlots} open party ${pluralize(missingSlots, "slot")}`);
  }

  for (const [index, member] of (team || []).entries()) {
    if (!member) continue;
    const form = indexes.formsById.get(member.formId);
    if (remainingBoosts(member) > 0) warnings.push(`Slot ${index + 1}: ${remainingBoosts(member)} BP unspent`);
    if (member.moves.filter(Boolean).length < 5) warnings.push(`Slot ${index + 1}: open move slot`);
    if (!form || (data.learnsets[form.id] || []).length === 0) warnings.push(`Slot ${index + 1}: no source learnset`);
  }

  return warnings;
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

function isCommunityBannedAnimon(form) {
  return COMMUNITY_BANNED_ANIMON.has(normalize(form?.animonName || form?.name || form?.display));
}

function isCommunityBannedItem(item) {
  return item && (
    COMMUNITY_BANNED_ITEMS.has(normalize(item.displayName))
    || COMMUNITY_BANNED_ITEMS.has(normalize(item.internalName))
  );
}

function buildRuleViolations(members) {
  const entries = teamEntries(members);
  const violations = [];
  const starters = entries.filter(({ form }) => inDexRange(form, STARTER_DEX_RANGE));
  const bannedAnimon = entries.filter(({ form }) => isCommunityBannedAnimon(form));
  const legendaries = entries.filter(({ form }) => inDexRange(form, LEGENDARY_DEX_RANGE));
  const starterOrLegendary = [...starters, ...legendaries];

  if (bannedAnimon.length > 0) {
    violations.push(`Banned Animon: ${entryListLabel(bannedAnimon)}`);
  }

  if (starterOrLegendary.length > 1) {
    violations.push(`Starter/Legendary limit: ${starterOrLegendary.length} selected (${STARTER_DEX_RANGE.label} or ${LEGENDARY_DEX_RANGE.label}): ${entryListLabel(starterOrLegendary)}`);
  }

  for (const group of duplicateEntryGroups(entries, ({ form }) => `${normalize(form.animonName || form.name)}:${normalize(form.form)}`)) {
    violations.push(`Duplicate Animon/Form: ${group[0].form.display} x${group.length}`);
  }

  for (const group of duplicateEntryGroups(entries, ({ member }) => member.heldItemId)) {
    const item = indexes.heldItemsById.get(group[0].member.heldItemId);
    if (item) violations.push(`Duplicate held item: ${item.displayName} x${group.length}`);
  }

  const bannedItems = entries
    .map(({ member, form }) => ({
      form,
      item: member.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null
    }))
    .filter(({ item }) => isCommunityBannedItem(item));
  if (bannedItems.length > 0) {
    violations.push(`Banned held item: ${bannedItems.map(({ form, item }) => `${item.displayName} on ${form.display}`).join(", ")}`);
  }

  return violations;
}

function renderRulesetInfo() {
  const rules = [
    `Maximum 1 total Starter or Legendary Animon (${STARTER_DEX_RANGE.label} or ${LEGENDARY_DEX_RANGE.label}).`,
    `Banned Animon: ${COMMUNITY_BANNED_ANIMON_NAMES.join(", ")}.`,
    `Banned item: ${COMMUNITY_BANNED_ITEM_NAMES.join(", ")}.`,
    "No duplicate Animon and Form combinations.",
    "No duplicate held items."
  ];
  return `
    <button class="ruleset-info-button" type="button" aria-label="Current ruleset information">
      <span class="ruleset-info-icon" aria-hidden="true">i</span>
      <span class="ruleset-info-popover" role="tooltip">
        <strong>Current community ruleset</strong>
        ${rules.map((rule) => `<span>${escapeHtml(rule)}</span>`).join("")}
      </span>
    </button>
  `;
}

function renderRuleViolations(violations) {
  return `
    <section class="coverage-section rule-check-section ${violations.length ? "" : "rule-check-section-ok"}">
      <div class="coverage-section-heading">
        <h3>Ruleset Checks</h3>
        ${renderRulesetInfo()}
      </div>
      <div class="${violations.length ? "rule-list" : "warning-list"}">
        ${violations.length
          ? violations.map((violation) => `<div>${escapeHtml(violation)}</div>`).join("")
          : `<div class="ok">All good</div>`}
      </div>
    </section>
  `;
}

function orderedStats(stats) {
  return Object.fromEntries(data.rules.statKeys.map((key) => [key, Number(stats?.[key] || 0)]));
}

function communityUsageMoveSnapshot(moveId) {
  const move = indexes.movesById.get(moveId);
  if (!move) return { id: moveId, name: moveId };
  return {
    id: move.id,
    name: move.displayName || move.name || move.internalName || move.id,
    type: move.type || null,
    category: move.category || null,
    power: Number.isFinite(Number(move.power)) ? Number(move.power) : null,
    target: move.target || move.aoeType || move.aoe || null
  };
}

function communityUsageImportPayload(team = state.team) {
  return {
    format: "lumentale-team-builder",
    version: 1,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    team: (team || []).map((member) => member ? {
      formId: member.formId,
      allocationLevel: data.rules.allocationLevel,
      battleLevel: data.rules.battleLevel,
      statRolls: orderedStats(member.statRolls),
      statBoosts: orderedStats(member.statBoosts),
      luck: Number(member.luck || 0),
      abilityId: member.abilityId || null,
      heldItemId: member.heldItemId || null,
      hiddenType: member.hiddenType || null,
      moves: Array.from({ length: 5 }, (_, index) => member.moves?.[index] || null)
    } : null)
  };
}

function buildCommunityUsageSnapshotBase(team = state.team) {
  const members = (team || []).map((member, index) => {
    if (!member) return null;
    const form = indexes.formsById.get(member.formId);
    if (!form) return null;
    const ability = member.abilityId ? indexes.abilitiesById.get(member.abilityId) : null;
    const item = member.heldItemId ? indexes.heldItemsById.get(member.heldItemId) : null;
    return {
      slot: index + 1,
      formId: member.formId,
      display: form.display,
      animonName: form.animonName || form.name || form.display,
      formName: form.form || "Base Form",
      dexIndex: Number(form.dexIndex || 0),
      types: {
        attribute: form.types?.attribute || null,
        main: form.types?.main || null,
        hidden: member.hiddenType || null
      },
      ability: ability ? {
        id: ability.id,
        name: ability.displayName || ability.name || ability.id
      } : null,
      heldItem: item ? {
        id: item.id,
        name: item.displayName || item.internalName || item.id
      } : null,
      moves: Array.from({ length: 5 }, (_, moveIndex) => member.moves?.[moveIndex] || null).map(communityUsageMoveSnapshot),
      statRolls: orderedStats(member.statRolls),
      statBoosts: orderedStats(member.statBoosts)
    };
  }).filter(Boolean);

  return {
    format: COMMUNITY_USAGE_FORMAT,
    version: 1,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    members,
    ruleViolations: buildRuleViolations((team || []).filter(Boolean)),
    summary: {
      forms: members.map((member) => member.formId),
      animon: members.map((member) => member.animonName),
      abilities: members.map((member) => member.ability?.id || null),
      heldItems: members.map((member) => member.heldItem?.id || null),
      moves: members.flatMap((member) => member.moves.map((move) => move.id))
    }
  };
}

function stableStringify(value) {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function communityUsageHashMember(member) {
  const { slot, ...rest } = member;
  return rest;
}

function communityUsageHashSource(snapshot) {
  const members = snapshot.members
    .map(communityUsageHashMember)
    .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)));
  return {
    format: snapshot.format,
    version: snapshot.version,
    allocationLevel: snapshot.allocationLevel,
    battleLevel: snapshot.battleLevel,
    members
  };
}

function hashString(value) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    const ch = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `${(h2 >>> 0).toString(16).padStart(8, "0")}${(h1 >>> 0).toString(16).padStart(8, "0")}`;
}

function communityUsageSnapshotHash(baseSnapshot) {
  return hashString(stableStringify(communityUsageHashSource(baseSnapshot)));
}

function createCommunityUsageTeamId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return hashString(`${Date.now()}:${Math.random()}:${navigator.userAgent || ""}`);
}

function communityUsageComposition(team = state.team) {
  return sanitizeUsageComposition((team || []).filter(Boolean).map((member) => member.formId));
}

function communityUsageCompositionChangeCount(previous, current) {
  const previousEntries = sanitizeUsageComposition(previous);
  const currentEntries = sanitizeUsageComposition(current);
  const previousCounts = new Map();
  for (const entry of previousEntries) {
    previousCounts.set(entry, (previousCounts.get(entry) || 0) + 1);
  }

  let shared = 0;
  for (const entry of currentEntries) {
    const count = previousCounts.get(entry) || 0;
    if (count <= 0) continue;
    shared += 1;
    previousCounts.set(entry, count - 1);
  }

  return Math.max(previousEntries.length, currentEntries.length) - shared;
}

function prepareCommunityUsageTeamRecord(hash, composition) {
  syncActiveSavedTeam();
  const slot = state.savedTeams[state.activeTeamSlot];
  const baseline = sanitizeUsageComposition(slot.usageCompositionBaseline);
  const changedFromBaseline = baseline.length
    ? communityUsageCompositionChangeCount(baseline, composition)
    : 0;

  let teamId = sanitizeUsageTeamId(slot.usageTeamId);
  let isNewUsageTeam = false;
  const store = loadCommunityUsageStore();

  if (!teamId && store.submittedHashes.includes(hash)) {
    teamId = hash;
  }

  if (!teamId || (baseline.length === 6 && changedFromBaseline >= COMMUNITY_USAGE_MAJOR_COMPOSITION_CHANGE)) {
    teamId = createCommunityUsageTeamId();
    isNewUsageTeam = true;
  }

  slot.usageTeamId = teamId;
  if (isNewUsageTeam || baseline.length !== 6) {
    slot.usageCompositionBaseline = sanitizeUsageComposition(composition);
  }

  saveState();
  return {
    teamId,
    baseline: sanitizeUsageComposition(slot.usageCompositionBaseline),
    changedFromBaseline,
    isNewUsageTeam
  };
}

function metaContent(name) {
  return document.querySelector(`meta[name="${name}"]`)?.getAttribute("content")?.trim() || "";
}

function communityUsageSupabaseConfig() {
  return {
    url: metaContent(COMMUNITY_USAGE_SUPABASE_URL_META).replace(/\/+$/, "").replace(/\/rest\/v1$/i, ""),
    anonKey: metaContent(COMMUNITY_USAGE_SUPABASE_ANON_KEY_META),
    table: metaContent(COMMUNITY_USAGE_TABLE_META) || COMMUNITY_USAGE_DEFAULT_TABLE
  };
}

function hasCommunityUsageDatabaseConfig() {
  const config = communityUsageSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.table);
}

function communityUsageSupabaseHeaders(key, prefer = "return=minimal") {
  const headers = {
    "Content-Type": "application/json",
    "apikey": key,
    "Prefer": prefer
  };
  if (String(key || "").startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function loadCommunityUsageStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMMUNITY_USAGE_STORAGE_KEY) || "{}");
    return {
      submittedHashes: Array.isArray(parsed.submittedHashes)
        ? parsed.submittedHashes.filter(Boolean).slice(-COMMUNITY_USAGE_SUBMITTED_LIMIT)
        : [],
      currentTeamHashes: parsed.currentTeamHashes && typeof parsed.currentTeamHashes === "object"
        ? Object.fromEntries(Object.entries(parsed.currentTeamHashes).filter(([teamId, hash]) => sanitizeUsageTeamId(teamId) && hash))
        : {}
    };
  } catch {
    return { submittedHashes: [], currentTeamHashes: {} };
  }
}

function saveCommunityUsageStore(store) {
  try {
    const currentTeamHashes = Object.fromEntries(
      Object.entries(store.currentTeamHashes || {}).filter(([teamId, hash]) => sanitizeUsageTeamId(teamId) && hash)
    );
    localStorage.setItem(COMMUNITY_USAGE_STORAGE_KEY, JSON.stringify({
      submittedHashes: (store.submittedHashes || []).slice(-COMMUNITY_USAGE_SUBMITTED_LIMIT),
      currentTeamHashes
    }));
  } catch {
  }
}

function communityUsageSubmitted(teamId, hash) {
  return Boolean(teamId && hash && loadCommunityUsageStore().currentTeamHashes?.[teamId] === hash);
}

function markCommunityUsageSubmitted(teamId, hash) {
  const store = loadCommunityUsageStore();
  if (!store.submittedHashes.includes(hash)) store.submittedHashes.push(hash);
  if (teamId) store.currentTeamHashes[teamId] = hash;
  saveCommunityUsageStore(store);
}

function communityUsageStatusDetails(warnings = buildTeamShellWarnings(state.team)) {
  if (state.communityUsageConsent === false) {
    return {
      kind: "blocked",
      title: "Usage sharing off",
      message: "Turn on Usage in the top bar to share anonymous completed teams."
    };
  }

  if (state.communityUsageConsent !== true) {
    return {
      kind: "blocked",
      title: "Permission needed",
      message: "Choose Yes or No for anonymous community usage sharing."
    };
  }

  if (warnings.length) {
    return {
      kind: "pending",
      title: "Not ready",
      message: "Fill 6 slots, 5 moves each, and spend all BP to queue usage."
    };
  }

  const baseSnapshot = buildCommunityUsageSnapshotBase();
  const hash = communityUsageSnapshotHash(baseSnapshot);
  const teamId = sanitizeUsageTeamId(state.savedTeams[state.activeTeamSlot]?.usageTeamId);
  if (communityUsageSubmitted(teamId, hash)) {
    return {
      kind: "ok",
      title: "Usage saved",
      message: `Team ${teamId.slice(0, 8)} is up to date.`
    };
  }

  if (communityUsageRequest.pending && communityUsageRequest.teamId === teamId && communityUsageRequest.hash === hash) {
    return {
      kind: "saving",
      title: "Saving usage",
      message: "Updating completed team usage now."
    };
  }

  if (communityUsageRequest.error && communityUsageRequest.teamId === teamId && communityUsageRequest.hash === hash) {
    return {
      kind: "error",
      title: "Usage failed",
      message: communityUsageRequest.error
    };
  }

  if (!hasCommunityUsageDatabaseConfig()) {
    return {
      kind: "blocked",
      title: "Usage ready",
      message: "Supabase database not configured yet."
    };
  }

  return {
    kind: "ready",
    title: "Usage ready",
    message: "Completed team usage will save automatically."
  };
}

function renderCommunityUsageStatus(warnings) {
  const status = communityUsageStatusDetails(warnings);
  return `
    <section class="coverage-section community-usage-section">
      <h3>Community Usage</h3>
      <div class="community-usage-status community-usage-${escapeHtml(status.kind)}" data-community-usage-status>
        <strong>${escapeHtml(status.title)}</strong>
        <span>${escapeHtml(status.message)}</span>
      </div>
    </section>
  `;
}

function updateCommunityUsageStatusElement() {
  const element = document.querySelector("[data-community-usage-status]");
  if (!element) return;
  const status = communityUsageStatusDetails();
  element.className = `community-usage-status community-usage-${status.kind}`;
  element.innerHTML = `
    <strong>${escapeHtml(status.title)}</strong>
    <span>${escapeHtml(status.message)}</span>
  `;
}

async function maybeSubmitCommunityUsage() {
  if (!data || !indexes || state.activeTab !== "builder") return;
  if (state.communityUsageConsent !== true) {
    updateCommunityUsageStatusElement();
    return;
  }

  const warnings = buildTeamShellWarnings(state.team);
  if (warnings.length) {
    updateCommunityUsageStatusElement();
    return;
  }

  const baseSnapshot = buildCommunityUsageSnapshotBase();
  const hash = communityUsageSnapshotHash(baseSnapshot);
  const config = communityUsageSupabaseConfig();
  if (!config.url || !config.anonKey || !config.table) {
    updateCommunityUsageStatusElement();
    return;
  }

  const composition = communityUsageComposition(state.team);
  const usageTeam = prepareCommunityUsageTeamRecord(hash, composition);
  const teamId = usageTeam.teamId;

  if (communityUsageSubmitted(teamId, hash)) {
    if (communityUsageRequest.teamId === teamId && communityUsageRequest.hash === hash) {
      communityUsageRequest = { teamId, hash, pending: false, error: null };
    }
    updateCommunityUsageStatusElement();
    return;
  }

  if (communityUsageRequest.pending && communityUsageRequest.teamId === teamId && communityUsageRequest.hash === hash) {
    updateCommunityUsageStatusElement();
    return;
  }

  communityUsageRequest = { teamId, hash, pending: true, error: null };
  updateCommunityUsageStatusElement();

  try {
    const snapshot = {
      ...baseSnapshot,
      teamId,
      snapshotHash: hash,
      usageModel: "team_current",
      usageCompositionBaseline: usageTeam.baseline,
      usageCompositionChangedFromBaseline: usageTeam.changedFromBaseline,
      usageStartedNewTeam: usageTeam.isNewUsageTeam,
      submittedAtUtc: new Date().toISOString(),
      pageUrl: location.href,
      teamCode: encodeTeamCode(communityUsageImportPayload(state.team))
    };
    const response = await fetch(`${config.url}/rest/v1/rpc/submit_team_current`, {
      method: "POST",
      mode: "cors",
      headers: communityUsageSupabaseHeaders(config.anonKey),
      body: JSON.stringify({
        payload_team_id: teamId,
        payload_snapshot_hash: hash,
        payload_snapshot: snapshot
      })
    });
    if (!response.ok && response.status !== 409) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Supabase returned ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}`);
    }
    markCommunityUsageSubmitted(teamId, hash);
    communityUsageRequest = { teamId, hash, pending: false, error: null };
  } catch (error) {
    communityUsageRequest = {
      teamId,
      hash,
      pending: false,
      error: error.message || "Supabase request failed."
    };
    console.warn("Community usage snapshot failed", error);
  }

  updateCommunityUsageStatusElement();
}

function renderCoverage() {
  const members = state.team.filter(Boolean);
  const moveIds = members.flatMap((member) => member.moves.filter(Boolean));
  const moveCounts = new Map();
  const categoryCounts = new Map();
  const warnings = buildTeamShellWarnings(state.team);
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

  return `
    <aside class="panel coverage-panel" aria-label="Coverage">
      <div class="panel-title">
        <h2>Coverage</h2>
        <span>${damagingMoveCount} attacks</span>
      </div>
      ${renderRuleViolations(ruleViolations)}
      <section class="coverage-section">
        <h3>Checks</h3>
        <div class="warning-list">
          ${warnings.length ? warnings.slice(0, 10).map((warning) => `<div>${escapeHtml(warning)}</div>`).join("") : `<div class="ok">All good</div>`}
        </div>
      </section>
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
      ${renderCommunityUsageStatus(warnings)}
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
  app.addEventListener("focusin", onRulesetInfoIntent);
  app.addEventListener("pointerenter", onRulesetInfoIntent, true);
  app.addEventListener("focusout", onFocusOut);
  app.addEventListener("dragstart", onDragStart);
  app.addEventListener("dragover", onDragOver);
  app.addEventListener("drop", onDrop);
  document.addEventListener("keydown", onKeyDown);
}

function positionRulesetInfoPopover(button) {
  const rect = button.getBoundingClientRect();
  const viewportPadding = 12;
  const preferredWidth = Math.min(260, window.innerWidth - viewportPadding * 2);
  const x = clamp(rect.right, viewportPadding + preferredWidth, window.innerWidth - viewportPadding);
  const y = clamp(rect.top, viewportPadding, window.innerHeight - viewportPadding);
  button.style.setProperty("--ruleset-info-x", `${x}px`);
  button.style.setProperty("--ruleset-info-y", `${y}px`);
  button.style.setProperty("--ruleset-info-width", `${preferredWidth}px`);
}

function onRulesetInfoIntent(event) {
  const button = event.target.closest?.(".ruleset-info-button");
  if (button) positionRulesetInfoPopover(button);
}

function onKeyDown(event) {
  const wantsUndo = (event.ctrlKey || event.metaKey)
    && !event.altKey
    && !event.shiftKey
    && String(event.key).toLowerCase() === "z";
  if (!wantsUndo || isNativeUndoTarget(event.target)) return;

  event.preventDefault();
  undoLastAction();
}

function onFocusOut() {
  endUndoInputSession();
}

function setCommunityUsageConsent(enabled) {
  state.communityUsageConsent = Boolean(enabled);
  saveState();
  render();
}

function onClick(event) {
  onRulesetInfoIntent(event);
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
  } else if (action === "toggle-community-usage") {
    setCommunityUsageConsent(state.communityUsageConsent !== true);
  } else if (action === "set-community-usage-consent") {
    setCommunityUsageConsent(actionTarget.dataset.consent === "true");
  } else if (action === "switch-tab") {
    const nextTab = actionTarget.dataset.tab === "damage" ? "damage" : "builder";
    if (nextTab !== state.activeTab) {
      state.activeTab = nextTab;
      clearUndoHistory();
      saveState();
      render();
    }
  } else if (action === "export-team") {
    exportTeam();
  } else if (action === "import-team") {
    importTeam();
  } else if (action === "export-animon") {
    exportSelectedAnimon();
  } else if (action === "import-animon") {
    importSelectedAnimon();
  } else if (action === "import-animon-slot") {
    importAnimonIntoSlot(actionTarget.dataset.slot);
  } else if (action === "select-damage-attacker") {
    state.damage.attackerSlot = clamp(Math.trunc(finiteNumber(actionTarget.dataset.slot, 0)), 0, 5);
    const member = state.team[state.damage.attackerSlot];
    state.damage.moveSlot = effectiveMoveSlot(member, state.damage.moveSlot);
    saveState();
    render();
  } else if (action === "select-damage-target") {
    state.damage.targetSlot = clamp(Math.trunc(finiteNumber(actionTarget.dataset.slot, 0)), 0, 5);
    saveState();
    render();
  } else if (action === "add-opponent-member") {
    addOpponentForm(state.damage.opponentAddFormId);
  } else if (action === "import-opponent-team") {
    importOpponentTeam();
  } else if (action === "export-opponent-team") {
    exportOpponentTeam();
  } else if (action === "swap-damage-parties") {
    swapCurrentAndOpponentTeams();
  } else if (action === "damage-balanced-bp") {
    updateDamageMember(actionTarget.dataset.side, (member) => {
      const perStat = Math.floor(data.rules.statBoostBudget / data.rules.statKeys.length);
      member.statBoosts = Object.fromEntries(data.rules.statKeys.map((key) => [key, perStat]));
    });
  } else if (action === "damage-clear-bp") {
    updateDamageMember(actionTarget.dataset.side, (member) => {
      member.statBoosts = defaultStats(0);
    });
  } else if (action === "clear-opponent-team") {
    if (confirm("Clear the opposing party?")) {
      rememberUndo();
      state.opponentTeam = Array(6).fill(null);
      state.damage.targetSlot = 0;
      saveState();
      render();
    }
  } else if (action === "reset-team") {
    if (confirm("Reset the current team?")) {
      rememberUndo();
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

  if (target.dataset?.action === "rename-team") {
    renameSavedTeam(target.value);
    return;
  }

  if (target.dataset?.action === "rename-opponent-team") {
    renameOpponentSavedTeam(target.value);
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
    endUndoInputSession();
    return;
  }

  if (target.dataset?.damageStatRoll) {
    updateDamageStatControl(target, "roll", target.dataset.damageSide, target.dataset.damageStatRoll);
    endUndoInputSession();
    return;
  }

  if (target.dataset?.damageStatBoost) {
    updateDamageStatControl(target, "boost", target.dataset.damageSide, target.dataset.damageStatBoost);
    endUndoInputSession();
    return;
  }

  if (target.dataset?.damageField) {
    updateDamageField(target.dataset.damageField, target.value);
    return;
  }

  if (target.dataset?.damageToggle) {
    updateDamageField(target.dataset.damageToggle, target.checked);
    return;
  }

  if (target.dataset?.moveSlot !== undefined) {
    const slot = Number(target.dataset.moveSlot);
    updateSelectedMember((member) => {
      member.moves[slot] = target.value || null;
    });
    return;
  }

  if (target.dataset?.action === "change-damage-move") {
    rememberUndo();
    state.damage.moveSlot = clamp(Math.trunc(finiteNumber(target.value, 0)), 0, 4);
    saveState();
    render();
    return;
  }

  if (target.dataset?.action === "change-opponent-add-form") {
    state.damage.opponentAddFormId = indexes.formsById.has(target.value) ? target.value : data.forms[0]?.id || null;
    saveState();
    render();
    return;
  }

  if (target.dataset?.action === "change-team-slot") {
    switchSavedTeam(target.value);
    return;
  }

  if (target.dataset?.action === "change-opponent-team-slot") {
    switchOpponentSavedTeam(target.value);
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

function updateDamageField(field, value) {
  rememberUndo();
  if (DAMAGE_TOGGLE_FIELDS.has(field)) {
    state.damage[field] = Boolean(value);
  } else if (DAMAGE_NUMERIC_FIELDS.has(field)) {
    state.damage[field] = value;
  } else if (DAMAGE_SELECT_FIELDS.has(field)) {
    state.damage[field] = value;
  }
  state.damage = sanitizeDamageState(state.damage);
  saveState();
  render();
}

function updateDamageStatControl(target, kind, side, key) {
  const member = selectedDamageMember(side);
  if (!member || !data.rules.statKeys.includes(key)) return;

  rememberUndo(`damage-stat:${side}:${selectedDamageSlot(side)}:${kind}:${key}`);
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
  render();
}

function updateSelectedMember(mutator) {
  const member = selectedMember();
  if (!member) return;
  rememberUndo();
  mutator(member);
  trimBoostBudget(member);
  saveState();
  render();
}

function updateStatControl(target, kind, key) {
  const member = selectedMember();
  const form = selectedForm();
  if (!member || !form) return;

  rememberUndo(`builder-stat:${state.selectedSlot}:${kind}:${key}`);
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

  const partySlot = event.target.closest(".party-slot.filled, .damage-member-card:not(.empty)");
  if (partySlot) {
    const payload = {
      side: normalizePartySide(partySlot.dataset.partySide),
      slot: clamp(Math.trunc(finiteNumber(partySlot.dataset.slot, 0)), 0, 5)
    };
    event.dataTransfer.setData("application/x-lumentale-party-member", JSON.stringify(payload));
    event.dataTransfer.setData("application/x-lumentale-slot", String(payload.slot));
    event.dataTransfer.effectAllowed = "move";
  }
}

function onDragOver(event) {
  if (partyDropTarget(event.target)) event.preventDefault();
}

function onDrop(event) {
  const slotElement = partyDropTarget(event.target);
  if (!slotElement) return;
  event.preventDefault();

  const targetSlot = Number(slotElement.dataset.slot);
  const targetSide = normalizePartySide(slotElement.dataset.partySide);
  const formId = event.dataTransfer.getData("application/x-lumentale-form");
  const partyPayload = event.dataTransfer.getData("application/x-lumentale-party-member");
  const sourceSlot = event.dataTransfer.getData("application/x-lumentale-slot");

  if (formId) {
    addFormToTeamSlot(formId, targetSide, targetSlot);
  } else if (partyPayload) {
    try {
      const source = JSON.parse(partyPayload);
      movePartyMember(source.side, source.slot, targetSide, targetSlot);
    } catch {
    }
  } else if (sourceSlot !== "") {
    movePartyMember("current", Number(sourceSlot), targetSide, targetSlot);
  }
}

function partyDropTarget(target) {
  return target.closest?.(".party-slot[data-party-side], .damage-member-card[data-party-side]") || null;
}

function teamPayload(members = state.team) {
  return {
    format: "lumentale-team-builder",
    version: 1,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    exportedAtUtc: new Date().toISOString(),
    team: members
  };
}

function animonPayload(member) {
  return {
    format: "lumentale-team-builder-animon",
    version: 1,
    allocationLevel: data.rules.allocationLevel,
    battleLevel: data.rules.battleLevel,
    exportedAtUtc: new Date().toISOString(),
    member
  };
}

function memberFromImportPayload(parsed) {
  if (!parsed) return null;
  if (parsed.member) return parsed.member;
  if (Array.isArray(parsed.team)) return parsed.team.find(Boolean) || null;
  if (Array.isArray(parsed)) return parsed.find(Boolean) || null;
  if (parsed.formId) return parsed;
  return null;
}

function encodeTeamCode(payload, prefix = TEAM_CODE_PREFIX) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `${prefix}${btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function decodeTeamCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed) throw new Error("No team code found.");
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);

  const codePrefix = [TEAM_CODE_PREFIX, ANIMON_CODE_PREFIX].find((prefix) => trimmed.startsWith(prefix));
  const encoded = (codePrefix ? trimmed.slice(codePrefix.length) : trimmed).replace(/\s+/g, "");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

async function readClipboardText(label = "team code") {
  try {
    if (navigator.clipboard?.readText) return await navigator.clipboard.readText();
  } catch {
  }
  return prompt(`Paste ${label}:`);
}

async function writeClipboardText(text, label = "team code") {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  prompt(`Copy this ${label}:`, text);
  return false;
}

async function exportTeam(members = state.team, label = "Team") {
  try {
    const code = encodeTeamCode(teamPayload(members));
    const copied = await writeClipboardText(code);
    if (copied) alert(`${label} code copied to clipboard.`);
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
    rememberUndo();
    state.team = sanitizeTeamArray(importedTeam);
    state.selectedSlot = 0;
    state.damage.attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
    state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
    saveState();
    render();
    alert("Team code imported.");
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

async function exportSelectedAnimon() {
  try {
    const member = selectedMember();
    if (!member) throw new Error("No selected Animon found.");
    const code = encodeTeamCode(animonPayload(member), ANIMON_CODE_PREFIX);
    const copied = await writeClipboardText(code, "Animon code");
    if (copied) alert("Animon code copied to clipboard.");
  } catch (error) {
    alert(`Export failed: ${error.message}`);
  }
}

async function importSelectedAnimon() {
  await importAnimonIntoSlot(state.selectedSlot);
}

async function importAnimonIntoSlot(slot = state.selectedSlot) {
  try {
    const targetSlot = clamp(Math.trunc(finiteNumber(slot, state.selectedSlot)), 0, 5);
    const text = await readClipboardText("Animon code");
    const parsed = decodeTeamCode(text);
    const importedMember = sanitizeMember(memberFromImportPayload(parsed));
    if (!importedMember) throw new Error("No Animon found in code.");
    rememberUndo();
    importedMember.id = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    state.team[targetSlot] = importedMember;
    state.selectedSlot = targetSlot;
    state.damage.attackerSlot = effectiveFilledSlot(state.team, state.damage.attackerSlot);
    state.damage.moveSlot = effectiveMoveSlot(state.team[state.damage.attackerSlot], state.damage.moveSlot);
    saveState();
    render();
    alert("Animon code imported.");
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

async function exportOpponentTeam() {
  await exportTeam(state.opponentTeam, "Opponent party");
}

async function importOpponentTeam() {
  try {
    const text = await readClipboardText();
    const parsed = decodeTeamCode(text);
    const importedTeam = Array.isArray(parsed) ? parsed : parsed.team;
    if (!Array.isArray(importedTeam)) throw new Error("No team array found.");
    rememberUndo();
    state.opponentTeam = sanitizeTeamArray(importedTeam);
    state.damage.targetSlot = effectiveFilledSlot(state.opponentTeam, state.damage.targetSlot);
    saveState();
    render();
    alert("Opponent party code imported.");
  } catch (error) {
    alert(`Import failed: ${error.message}`);
  }
}

init();
