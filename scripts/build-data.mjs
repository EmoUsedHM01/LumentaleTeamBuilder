import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(appRoot, "..");
const dataOutDir = join(appRoot, "public", "data");
const spriteOutDir = join(appRoot, "public", "assets", "animon");
const typeIconSourceDir = join(workspaceRoot, "TypeIconsPNGs");
const typeIconOutDir = join(appRoot, "public", "assets", "type-icons");

const statKeys = ["hp", "atk", "def", "spAtk", "spDef", "agility"];
const nonHpStatKeys = statKeys.filter((key) => key !== "hp");
const statLabels = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spAtk: "SpA",
  spDef: "SpD",
  agility: "Agi"
};

const spriteAliases = new Map(Object.entries({
  dolegamii: "Dolegami",
  meloquinia: "Meloquina",
  luxecko: "Luxeco",
  armansient: "Armancient",
  kerocrack: "Kerocrak",
  pinouflage: "Pinuflage",
  iotamor: "Lotamor",
  "veveso:traditionalessence": "Veveso-T",
  "veveso:moodyessence": "Veveso-M",
  "veveso:infernoessence": "Veveso-I",
  "veveso:horridessence": "Veveso-H",
  "veveso:simpleessence": "Veveso-S",
  "lobstrike:mestus": "Lobstrike-N",
  "lobstrike:furor": "Lobstrike-S",
  "minube:yellownebula": "Minube_Yellow",
  "minube:greennebula": "Minube-Green",
  "minube:bluenebula": "Minube_Blue",
  "minube:violetnebula": "Minube_Pink",
  "minube:rednebula": "Minube_Red",
  "minube:orangenebula": "Minube_Orange",
  "toypette:roundshape": "Toypette-C",
  "toypette:trishape": "Toypette-T",
  "toypette:quadshape": "Toypette-Q",
  "rushog:felicis": "Rushog-N_Fix",
  "rushog:furor": "Rushog-S",
  "cimitrick:horrens": "Chimitrik-S",
  "cimitrick:sereum": "Chimitrik-N",
  "canabble:furor": "Canabble-S",
  "canabble:sereum": "Canabble-N",
  "dualine:embodiedform": "Dualine-Embodied",
  "morsiver:wornout": "Morsiver_Phase1",
  "morsiver:burnout": "Morsiver_Phase2",
  "majetsune:controlledform": "Majetsune-G",
  "majetsune:trueform": "Majetsune-P",
  "blumester:mestusclosed": "Bluemester-S_Phase1",
  "blumester:horrens": "Bluemester-N",
  "blumester:mestus": "Bluemester-S",
  "blumester:bossmclosed": "Bluemester-N",
  "blumester:bossn": "Bluemester-N",
  "blumester:boss": "Bluemester-S",
  "blumester:horrensfire": "Bluemester-N_Fire",
  "dualine:freeform": "Dualine-FF",
  "knequital:sealed": "Knequital_Normal",
  "knequital:drawn": "Knequital",
  "patround:pursuitmode": "Patround-Pursuit",
  "patround:patrolmode": "Patround"
}));

function exclusionReason(form) {
  const name = normalizeName(form.name);
  const formName = normalizeName(form.form);
  const display = normalizeName(form.display);

  if (name === "blumester" && (formName.includes("boss") || display.includes("boss"))) {
    return "Blumester boss form";
  }
  if (name === "majetsune") return "Majetsune unavailable";
  if (name === "eterjian") return "Eterjian unavailable";
  if (name === "nuclheart" && formName !== "baseform") return "Nuclheart non-base form";
  if ((name === "kokepole" || name === "wicedom") && formName === "phase1") return "Phase1 form unavailable";
  return "";
}

function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function safeFileName(name) {
  return String(name)
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function compactMove(move) {
  return {
    id: move.id,
    guid: move.guid,
    internalName: move.internalName,
    displayName: move.displayName || move.internalName,
    variant: move.variant || "base",
    variantIndex: Number(move.variantIndex || 0),
    type: move.type || "NONE",
    category: move.category || "STATUS",
    power: Number(move.power || 0),
    accuracy: Number(move.accuracy || 0),
    spCost: Number(move.spCost || 0),
    cooldown: Number(move.cooldown || 0),
    targetType: move.targetType || "",
    aoeType: move.aoeType || "",
    contact: Boolean(move.contact),
    effects: move.effectDetails || move.effects || "",
    description: move.description || move.descriptionRaw || ""
  };
}

function latestMoveByGuid(moves) {
  const latest = new Map();
  for (const move of moves) {
    const key = move.guid || move.id;
    const current = latest.get(key);
    const variantIndex = Number(move.variantIndex || 0);
    const currentIndex = Number(current?.variantIndex || 0);
    if (!current || variantIndex > currentIndex) latest.set(key, move);
  }
  return latest;
}

function resolveInheritedLearnset(formId, explicitLearnsets, evolutionParents, memo = new Map(), visiting = new Set()) {
  if (memo.has(formId)) return memo.get(formId);

  const resolved = new Set(explicitLearnsets.get(formId) || []);
  if (visiting.has(formId)) return resolved;

  visiting.add(formId);
  for (const parentId of evolutionParents.get(formId) || []) {
    for (const moveId of resolveInheritedLearnset(parentId, explicitLearnsets, evolutionParents, memo, visiting)) {
      resolved.add(moveId);
    }
  }
  visiting.delete(formId);

  memo.set(formId, resolved);
  return resolved;
}

function compactHeldItem(item) {
  return {
    id: item.guid,
    displayName: item.displayName || item.internalName,
    internalName: item.internalName || item.displayName,
    description: item.description || item.descriptionRaw || "",
    actualEffect: item.actualEffect || "",
    battleEffectClass: item.battleEffectClass || item.battleEffectClassRaw || "",
    itemType: item.itemType || "MISC",
    statModifiers: heldItemStatModifiers(item)
  };
}

function compactQuirk(quirk) {
  return {
    id: quirk.internalName,
    internalName: quirk.internalName,
    displayName: quirk.displayName || quirk.internalName,
    description: quirk.description || "",
    effectDetails: quirk.effectDetails || "",
    statModifiers: quirkStatModifiers(quirk)
  };
}

function heldItemStatModifiers(item) {
  switch (item.battleEffectClass || item.battleEffectClassRaw) {
    case "ScatolaAmbiguaEffect":
      return [{
        stats: ["atk", "def", "spAtk", "spDef", "agility"],
        multiplier: 1.2,
        condition: "canEvolve"
      }];
    case "SparadiceEffect":
      return [{ stats: ["atk"], multiplier: 1.5 }];
    case "RadicannoneEffect":
      return [{ stats: ["spAtk"], multiplier: 1.5 }];
    default:
      return [];
  }
}

function quirkStatModifiers(quirk) {
  switch (quirk.internalName) {
    case "Hypermight":
      return [{ stats: ["atk", "spAtk"], multiplier: 2 }];
    case "Anode":
      return [{
        stats: nonHpStatKeys,
        multiplier: 1.2,
        condition: "allyAbility",
        abilityId: "Catode"
      }];
    case "Catode":
      return [{
        stats: nonHpStatKeys,
        multiplier: 1.2,
        condition: "allyAbility",
        abilityId: "Anode"
      }];
    case "Totem":
      return [{
        stats: nonHpStatKeys,
        condition: "teamAbilityCount",
        abilityId: "Totem",
        multipliersByCount: {
          2: 1.2,
          3: 1.4,
          4: 1.6
        }
      }];
    default:
      return [];
  }
}

function makeSearchText(form, moves) {
  const parts = [
    form.display,
    form.name,
    form.form,
    form.animon?.name,
    form.types?.attribute,
    form.types?.main,
    ...(form.types?.hidden || []),
    ...moves.map((move) => move.displayName || move.internalName)
  ];
  return normalizeName(parts.join(" "));
}

function findSprite(form, spriteByKey, spriteByOriginal) {
  const aliasKey = `${normalizeName(form.name)}:${normalizeName(form.form)}`;
  const alias = spriteAliases.get(aliasKey) || spriteAliases.get(normalizeName(form.name));
  const candidates = [
    alias,
    form.display,
    form.name,
    form.animon?.name,
    `${form.name}-${form.form}`,
    `${form.animon?.name}-${form.form}`
  ].filter(Boolean);

  for (const candidate of candidates) {
    const byOriginal = spriteByOriginal.get(candidate);
    if (byOriginal) return byOriginal;
    const byKey = spriteByKey.get(normalizeName(candidate));
    if (byKey) return byKey;
  }
  return null;
}

await mkdir(dataOutDir, { recursive: true });
await mkdir(spriteOutDir, { recursive: true });
await mkdir(typeIconOutDir, { recursive: true });

const formsSource = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "forms.json"));
const rawFormsSource = await readJson(join(workspaceRoot, ".unpackedData", "FormData.json"));
const movesSource = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "moves.json"));
const quirksSource = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "quirks.json"));
const heldItemsSource = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "held_items.json"));
const statFormula = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "stat_formula.json"));
const typeChart = await readJson(join(workspaceRoot, "DamageCalculatorResearch", "data", "type_chart.json"));
const spriteManifest = await readJson(join(workspaceRoot, "AnimonInventoryGifs_Scale1_12fps", "manifest.json"));
const excludedForms = formsSource.forms
  .map((form) => ({ display: form.display, reason: exclusionReason(form) }))
  .filter((entry) => entry.reason);
const playableForms = formsSource.forms.filter((form) => !exclusionReason(form));
const rawFormByGuid = new Map((Array.isArray(rawFormsSource) ? rawFormsSource : [])
  .map((form) => [form.guid || form._guid, form]));
const typeChartByForm = new Map((typeChart.forms || []).map((form) => [form.guid, form]));
const defenseTypes = (typeChart.weaknessArrayMapping?.attackTypeOrder || [])
  .map((entry) => entry.attackType);

const spriteByKey = new Map();
const spriteByOriginal = new Map();
for (const sprite of spriteManifest.exported || []) {
  spriteByKey.set(normalizeName(sprite.name), sprite);
  spriteByOriginal.set(sprite.name, sprite);
}

const latestRawMoveByGuid = latestMoveByGuid(movesSource.moves);
const moveAliases = Object.fromEntries(movesSource.moves.map((move) => {
  const latest = latestRawMoveByGuid.get(move.guid || move.id);
  return [move.id, latest?.id || move.id];
}));
const moves = [...latestRawMoveByGuid.values()].map(compactMove);
const moveById = new Map(moves.map((move) => [move.id, move]));
const quirks = (quirksSource.quirks || [])
  .map(compactQuirk)
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
const quirkById = new Map(quirks.map((quirk) => [quirk.id, quirk]));
const heldItems = (heldItemsSource.heldItems || [])
  .map(compactHeldItem)
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
const allFormIds = new Set([
  ...formsSource.forms.map((form) => form.guid).filter(Boolean),
  ...(Array.isArray(rawFormsSource) ? rawFormsSource : []).map((form) => form.guid || form._guid).filter(Boolean)
]);
const explicitLearnsets = new Map([...allFormIds].map((formId) => [formId, new Set()]));
for (const move of movesSource.moves) {
  const latestMoveId = moveAliases[move.id] || move.id;
  for (const learned of move.learnedByForms || []) {
    if (!explicitLearnsets.has(learned.formGuid)) explicitLearnsets.set(learned.formGuid, new Set());
    explicitLearnsets.get(learned.formGuid).add(latestMoveId);
  }
}
const evolutionParents = new Map();
for (const rawForm of Array.isArray(rawFormsSource) ? rawFormsSource : []) {
  const sourceId = rawForm.guid || rawForm._guid;
  if (!sourceId) continue;
  for (const evolution of rawForm.Evolutions || []) {
    const targetId = evolution?.EvolutionTarget?.guid;
    if (!targetId) continue;
    if (!evolutionParents.has(targetId)) evolutionParents.set(targetId, new Set());
    evolutionParents.get(targetId).add(sourceId);
  }
}
const inheritedLearnsetMemo = new Map();
const learnsets = Object.fromEntries(playableForms.map((form) => [
  form.guid,
  [...resolveInheritedLearnset(form.guid, explicitLearnsets, evolutionParents, inheritedLearnsetMemo)]
    .filter((moveId) => moveById.has(moveId))
]));
for (const moveIds of Object.values(learnsets)) {
  moveIds.sort((a, b) => {
    const ma = moveById.get(a);
    const mb = moveById.get(b);
    return (ma?.displayName || "").localeCompare(mb?.displayName || "");
  });
}

const spriteCopies = new Map();
const missingSprites = [];
const forms = [];

for (const form of playableForms) {
  const rawForm = rawFormByGuid.get(form.guid);
  const evolutionTargets = (rawForm?.Evolutions || [])
    .map((evolution) => evolution?.EvolutionTarget?.guid)
    .filter(Boolean);
  const sprite = findSprite(form, spriteByKey, spriteByOriginal);
  let spritePath = null;
  let spriteSize = null;
  if (sprite) {
    const filename = `${safeFileName(sprite.name)}.gif`;
    const destination = join(spriteOutDir, filename);
    if (!spriteCopies.has(sprite.gif)) {
      spriteCopies.set(sprite.gif, destination);
      await copyFile(sprite.gif, destination);
    }
    spritePath = `./public/assets/animon/${filename}`;
    spriteSize = sprite.size || null;
  } else {
    missingSprites.push(form.display);
  }

  const formMoves = (learnsets[form.guid] || []).map((id) => moveById.get(id)).filter(Boolean);
  const typeChartForm = typeChartByForm.get(form.guid);
  forms.push({
    id: form.guid,
    display: form.display,
    name: form.name,
    form: form.form,
    animonName: form.animon?.name || form.name,
    dexIndex: form.animon?.workbookIndex ?? form.animon?.rawIndex ?? null,
    types: {
      attribute: form.types?.attribute || "NONE",
      main: form.types?.main || "NONE",
      hidden: form.types?.hidden || []
    },
    sp: Number(form.sp || 0),
    baseStats: Object.fromEntries(statKeys.map((key) => [key, Number(form.baseStats?.[key] || 0)])),
    baseStatTotal: Number(form.baseStatTotal || 0),
    possibleQuirks: (form.possibleQuirks || []).map((quirk) => ({
      id: quirk.internalName,
      internalName: quirk.internalName,
      displayName: quirkById.get(quirk.internalName)?.displayName || quirk.internalName,
      isHidden: Boolean(quirk.isHidden)
    })).filter((quirk) => quirkById.has(quirk.id)),
    canEvolve: evolutionTargets.length > 0,
    evolutionTargets,
    defenseRelations: Object.fromEntries(defenseTypes.map((type) => [
      type,
      typeChartForm?.relations?.[type]?.relation || "NORMAL"
    ])),
    sprite: spritePath,
    spriteSize,
    search: makeSearchText(form, formMoves)
  });
}

forms.sort((a, b) => {
  const ai = a.dexIndex ?? 9999;
  const bi = b.dexIndex ?? 9999;
  return ai === bi ? a.display.localeCompare(b.display) : ai - bi;
});

const emptyLearnsets = forms.filter((form) => (learnsets[form.id] || []).length === 0).map((form) => form.display);
const knownTypes = [...new Set([
  ...moves.map((move) => move.type),
  ...forms.map((form) => form.types.attribute),
  ...forms.map((form) => form.types.main),
  ...forms.flatMap((form) => form.types.hidden)
])].filter(Boolean).sort();

const typeIcons = {};
try {
  const iconFiles = (await readdir(typeIconSourceDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
    .map((entry) => entry.name);
  for (const file of iconFiles) {
    const typeKey = basename(file, ".png").toUpperCase();
    const source = join(typeIconSourceDir, file);
    const filename = `${typeKey.toLowerCase()}.png`;
    const destination = join(typeIconOutDir, filename);
    await copyFile(source, destination);
    typeIcons[typeKey] = `./public/assets/type-icons/${filename}`;
  }
} catch (error) {
  console.warn(`Type icon copy skipped: ${error.message}`);
}

const output = {
  metadata: {
    appDataVersion: "0.1.0",
    generatedAtUtc: new Date().toISOString(),
    sourceFingerprint: formsSource.metadata?.sourceFingerprint || statFormula.metadata?.sourceFingerprint || "",
    sourceCounts: {
      forms: forms.length,
      rawForms: formsSource.forms.length,
      excludedForms: excludedForms.length,
      moves: moves.length,
      rawMoves: movesSource.moves.length,
      quirks: quirks.length,
      heldItems: heldItems.length,
      copiedSprites: spriteCopies.size,
      typeIcons: Object.keys(typeIcons).length
    }
  },
  rules: {
    allocationLevel: 100,
    battleLevel: 50,
    statRollMin: 0,
    statRollMax: 10,
    statBoostMin: 0,
    statBoostPerStatCap: 186,
    statBoostBudget: 408,
    statKeys,
    statLabels,
    formula: statFormula.formula,
    constants: statFormula.constants
  },
  types: knownTypes,
  defenseTypes,
  typeIcons,
  forms,
  moves,
  moveAliases,
  quirks,
  heldItems,
  learnsets,
  typeChartMetadata: typeChart.metadata || {},
  validation: {
    missingSprites,
    emptyLearnsets,
    excludedForms
  }
};

const dataPath = join(dataOutDir, "team-builder-data.json");
await writeFile(dataPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

console.log(`Wrote ${relative(appRoot, dataPath)}`);
console.log(`Forms: ${forms.length}`);
console.log(`Moves: ${moves.length}`);
console.log(`Sprites copied: ${spriteCopies.size}`);
if (missingSprites.length) console.warn(`Missing sprites: ${missingSprites.length}`);
if (emptyLearnsets.length) console.warn(`Empty learnsets: ${emptyLearnsets.length}`);
