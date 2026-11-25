const URL_GOOGLE_SHEET_FIJA = "https://script.google.com/macros/s/AKfycbyUW5XWuSn7u99gfiZRwj1DLOtC6Pt6XaqWaPT3QGGI8lpSj9dm3-kPBPkIMUg6N-sU/exec";
const STORAGE_KEY = "planificador_cloud_clean_v7";

let drawerFilterPattern = "ALL";
let editingExerciseId = null;
let deferredInstallPrompt = null;
let lastScrollY = window.scrollY;
let showTopPanel = true;
let showSeriesPanel = true;

const PATTERN_CONFIG = {
  RODILLA:    { label: "Dominante de Rodilla", defaultBlock: "str" },
  CADERA:     { label: "Dominante de Cadera", defaultBlock: "str" },
  EMPUJE_H:   { label: "Empuje Horizontal", defaultBlock: "str" },
  EMPUJE_V:   { label: "Empuje Vertical", defaultBlock: "str" },
  TRACCION_H: { label: "Traccion Horizontal", defaultBlock: "str" },
  TRACCION_V: { label: "Traccion Vertical", defaultBlock: "str" },
  TRANSPORTE: { label: "Cargar y Llevar", defaultBlock: "str" },
  CORE:       { label: "Core / Zona Media", defaultBlock: "core" },
  PLIOMETRIA: { label: "Pliometria / Potencia", defaultBlock: "core" },
  MOVILIDAD:  { label: "Movilidad / Activacion", defaultBlock: "warm" }
};

const MOMENT_CONFIG = {
  warm: { label: "1. Entrada en Calor", short: "Entrada en Calor", sheetVal: "ENTRADA_CALOR" },
  core: { label: "2. Zona Media / Activación", short: "Zona Media / Act.", sheetVal: "ZONA_MEDIA" },
  str:  { label: "3. Bloque Principal", short: "Bloque Principal", sheetVal: "PRINCIPAL" },
  cool: { label: "4. Vuelta a la Calma", short: "Vuelta a la Calma", sheetVal: "VUELTA_CALMA" }
};

const TIER_CONFIG = {
  BASE:       { label: "Base / Poliarticular Bilateral (1er Ej.)", short: "Base Poliarticular" },
  INTEGRADO:  { label: "Integrado / Full Body Multiarticular", short: "Integrado / Full Body" },
  UNILATERAL: { label: "Secundario / Unilateral / Asimétrico", short: "Unilateral" },
  ANALITICO:  { label: "Analítico / Aislado / Correctivo", short: "Analítico / Correctivo" }
};

const NASM_PHASES = {
  "1": { name: "Fase 1: Estabilizacion", pct: 0.60, reps: "12-20", sets: "1-3", intensity: "50-70%", rest: "0-90s", focus: "Control postural y estabilidad articular.", def: { sets: 3, reps: "12-15", rpe: "60%", rest: "60s" } },
  "2": { name: "Fase 2: Fuerza Resistencia", pct: 0.70, reps: "8-12", sets: "2-4", intensity: "70-80%", rest: "0-60s", focus: "Trabajo combinado de fuerza base y estabilidad.", def: { sets: 3, reps: "10-12", rpe: "70%", rest: "75s" } },
  "3": { name: "Fase 3: Hipertrofia", pct: 0.75, reps: "6-12", sets: "3-5", intensity: "70-85%", rest: "60-90s", focus: "Volumen semanal objetivo de 12 a 16 series.", def: { sets: 4, reps: "8-10", rpe: "75%", rest: "90s" } },
  "4": { name: "Fase 4: Fuerza Maxima", pct: 0.85, reps: "1-5", sets: "4-6", intensity: "85-100%", rest: "3-5m", focus: "Cargas altas en patrones primarios.", def: { sets: 4, reps: "4-5", rpe: "85%", rest: "3m" } },
  "5": { name: "Fase 5: Potencia", pct: 0.85, reps: "3-5 + 5-6", sets: "3-5", intensity: "85% / 40% Vel", rest: "2-3m", focus: "Contrastes de fuerza pesada (85%) y potencia explosiva.", def: { sets: 4, reps: "3-5", rpe: "85%", rest: "2.5m" } }
};

const STRENGTH_PRESETS = {
  inicial_a:  { squat: 30, deadlift: 40, bench: 20, pulldown: 25 },
  inicial_b:  { squat: 45, deadlift: 55, bench: 35, pulldown: 40 },
  intermedio: { squat: 75, deadlift: 95, bench: 60, pulldown: 65 },
  avanzado:   { squat: 110, deadlift: 135, bench: 85, pulldown: 90 }
};

const BLOCK_DEFINITIONS = [
  { key: "warm", cssClass: "block-warm", title: "1. Entrada en Calor y Movilidad", defaultPattern: "MOVILIDAD" },
  { key: "core", cssClass: "block-core", title: "2. Zona Media y Activacion", defaultPattern: "CORE" },
  { key: "str",  cssClass: "block-str",  title: "3. Bloque Principal de Fuerza", defaultPattern: "RODILLA" },
  { key: "cool", cssClass: "block-cool", title: "4. Vuelta a la Calma", defaultPattern: "MOVILIDAD" }
];

const DEFAULT_PATTERN_CUES = {
  RODILLA: "Mantener planta del pie apoyada completa, rodillas alineadas con la punta del pie y tronco estable.",
  CADERA: "Iniciar el movimiento llevando la cadera hacia atrás (bisagra), columna neutra y carga próxima al centro de masa.",
  EMPUJE_H: "Retraer y deprimir escápulas contra el apoyo, codos a ~45° del tronco y control en la fase excéntrica.",
  EMPUJE_V: "Glúteos y zona media activos para evitar hiperextensión lumbar; empujar alineando la carga sobre los hombros.",
  TRACCION_H: "Iniciar con retracción escapular y traccionar con el codo hacia la cadera manteniendo el cuello relajado.",
  TRACCION_V: "Deprimir los hombros lejos de las orejas antes de traccionar hacia el pecho con control.",
  TRANSPORTE: "Postura erguida, mirada al frente y pelvis nivelada evitando inclinación lateral o rotación.",
  CORE: "Mantener rigidez abdominal y exhalación activa impidiendo cualquier movimiento compensatorio en la zona lumbar.",
  PLIOMETRIA: "Extensión explosiva de triple articulación en el despegue y aterrizaje suave absorbiendo con cadera y rodillas.",
  MOVILIDAD: "Ejecución controlada en rango articular completo sin dolor, acompañando cada repetición con la respiración."
};

let appState = {
  sheetUrl: URL_GOOGLE_SHEET_FIJA,
  meta: {
    clientId: "",
    clientName: "",
    clientPhone: "",
    coachName: "",
    clientGoal: "",
    splitType: "Full Body 3 Dias",
    startDate: new Date().toISOString().split("T")[0],
    clientNotes: "",
    nasmPhase: "3",
    baseRM: { preset: "inicial_b", squat: 45, deadlift: 55, bench: 35, pulldown: 40 }
  },
  activeDayIndex: 0,
  days: [],
  exercises: [],
  routines: [],
  clients: [],
  presencialesGrupos: [],
  presencialesRegistros: []
};

function normalizeMomentKey(rawVal) {
  const v = String(rawVal || "").trim().toUpperCase();
  if (v === "WARM" || v === "ENTRADA_CALOR" || v.includes("CALOR")) return "warm";
  if (v === "CORE" || v === "ZONA_MEDIA" || v.includes("ACTIVAC")) return "core";
  if (v === "COOL" || v === "VUELTA_CALMA" || v.includes("CALMA")) return "cool";
  if (v === "STR" || v === "PRINCIPAL" || v.includes("FUERZA")) return "str";
  return "";
}

function normalizeTierKey(rawVal) {
  const v = String(rawVal || "").trim().toUpperCase();
  if (v === "BASE" || v.includes("POLIARTICULAR") || v.includes("BASICO") || v.includes("BÁSICO")) return "BASE";
  if (v === "INTEGRADO" || v.includes("FULL") || v.includes("TOTAL")) return "INTEGRADO";
  if (v === "UNILATERAL" || v.includes("SECUNDARIO") || v.includes("UNIPODAL")) return "UNILATERAL";
  if (v === "ANALITICO" || v === "ANALÍTICO" || v.includes("AISLADO") || v.includes("CORRECTIVO")) return "ANALITICO";
  return "";
}

function inferExerciseMoment(ex) {
  if (!ex) return "str";
  const tagMatch = String(ex.author || "").match(/\[BLQ:([a-z]+)\|ROL:([A-Z_]+)\]/i);
  if (tagMatch && MOMENT_CONFIG[tagMatch[1].toLowerCase()]) return tagMatch[1].toLowerCase();

  const explicit = normalizeMomentKey(ex.block || ex.momento);
  if (explicit) return explicit;

  const name = String(ex.name || "").toLowerCase();
  const pat = String(ex.pattern || "RODILLA").toUpperCase();
  if (pat === "MOVILIDAD") return /estiramiento|respiraci|relajaci|elongaci|estático|estatico|calma/i.test(name) ? "cool" : "warm";
  if (pat === "CORE" || pat === "PLIOMETRIA") return "core";
  return "str";
}

function inferExerciseTier(ex) {
  if (!ex) return "BASE";
  const tagMatch = String(ex.author || "").match(/\[BLQ:([a-z]+)\|ROL:([A-Z_]+)\]/i);
  if (tagMatch && TIER_CONFIG[tagMatch[2].toUpperCase()]) return tagMatch[2].toUpperCase();

  const explicit = normalizeTierKey(ex.tier || ex.jerarquia);
  if (explicit) return explicit;

  const name = String(ex.name || "").toLowerCase();
  const pat = String(ex.pattern || "RODILLA").toUpperCase();

  if (/thruster|squat a press|squat a remo|squat to row|step-up.*press|subida.*press|clean|cargada|snatch|arrancada|swing|push press|push jerk|anyhow|levantamiento de objeto|turkish|levantada turca|windmill|molino|woodchop|lift & chop/i.test(name)) return "INTEGRADO";
  if (/curl|scott|predicador|leg curl|leg extension|extensión de cuádriceps|extension de cuadriceps|sillón|sillon|camilla|deslizante|hamstring|puente de glúteos|puente de gluteos|floor bridge|scaption|plano escapular|y-w|face pull|vuelo|apertura|pecfly|pec fly|pec deck|contractora|pull-apart|jefferson|back extension|banco romano|slr|tríceps|triceps|bíceps|biceps|abducci|aducci|gemelo|pantorrilla|sóleo|soleo|calf|aisla/i.test(name)) return "ANALITICO";
  if (/búlgara|bulgara|estocada|lunge|step-up|subida al caj|pistol|1 pierna|una pierna|unipodal|unilateral|1 brazo|un brazo|1 mano|una mano|medio arrodillado|half-kneeling|rotatorio|asimétric|asimetric|alternad|suitcase|maleta|waiter/i.test(name)) return "UNILATERAL";
  if (["RODILLA", "CADERA", "EMPUJE_H", "EMPUJE_V", "TRACCION_H", "TRACCION_V"].includes(pat)) return "BASE";
  return "INTEGRADO";
}

function extractExerciseDescription(ex) {
  if (!ex) return "";
  if (ex.desc) return String(ex.desc).trim();
  const match = String(ex.author || "").match(/\[DESC:([^\]]+)\]/i);
  return match ? match[1].trim() : "";
}

function buildEncodedExerciseAuthor(baseAuthor, block, tier, descText) {
  const cleanAuthor = String(baseAuthor || "Propio")
    .replace(/\s*\[(BLQ|DESC|IMG|VID):[^\]]+\]\s*/gi, "")
    .trim() || "Propio";
  const safeBlock = MOMENT_CONFIG[block] ? block : "str";
  const safeTier = TIER_CONFIG[tier] ? tier : "BASE";
  const safeDesc = String(descText || "").replace(/[\[\]]/g, "").trim();
  return `[BLQ:${safeBlock}|ROL:${safeTier}]${safeDesc ? ` [DESC:${safeDesc}]` : ""} ${cleanAuthor}`;
}

function getExerciseMeta(ex) {
  const block = inferExerciseMoment(ex);
  const tier = inferExerciseTier(ex);
  const desc = extractExerciseDescription(ex);
  const cleanAuthor = String(ex?.author || "Propio")
    .replace(/\s*\[(BLQ|DESC|IMG|VID):[^\]]+\]\s*/gi, "")
    .trim() || "Propio";
  return { block, tier, desc, cleanAuthor };
}

function enrichExercisesMetadata() {
  if (!Array.isArray(appState.exercises)) return;
  appState.exercises.forEach(ex => {
    ex.block = inferExerciseMoment(ex);
    ex.tier = inferExerciseTier(ex);
    ex.desc = extractExerciseDescription(ex);
  });
}

function buildExerciseThumbnailBtn(exName, patKey) {
  const cleanName = String(exName || "").trim();
  const pat = String(patKey || "RODILLA").toUpperCase();
  const foundEx = (appState.exercises || []).find(
    e => String(e.name || "").trim().toLowerCase() === cleanName.toLowerCase()
  );
  const hasCustomDesc = Boolean(foundEx && extractExerciseDescription(foundEx));
  return `<button type="button" class="ex-info-btn ${hasCustomDesc ? "has-custom-desc" : ""} no-print" title="Ver explicación técnica" onclick="openExerciseDemoModal('${escapeHtml(cleanName || "Ejercicio")}', '${escapeHtml(pat)}')">▶</button>`;
}

function extractRMFromNotes(notesStr) {
  const def = { preset: "inicial_b", squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const match = String(notesStr || "").match(/\[RM:([^\]]+)\]/i);
  if (!match) return def;

  match[1].split(",").forEach(p => {
    const [k, v] = p.split("=");
    if (!k || v === undefined) return;
    const key = k.trim().toUpperCase();
    if (key === "LVL") def.preset = v.trim();
    if (key === "SQ")  def.squat = parseFloat(v) || def.squat;
    if (key === "DL")  def.deadlift = parseFloat(v) || def.deadlift;
    if (key === "BP")  def.bench = parseFloat(v) || def.bench;
    if (key === "PD")  def.pulldown = parseFloat(v) || def.pulldown;
  });
  return def;
}

function syncStrengthFieldsFromMeta() {
  const rm = extractRMFromNotes(appState.meta.clientNotes);
  appState.meta.baseRM = rm;
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal("rm-preset-select", rm.preset || "custom");
  setVal("rm-squat", rm.squat);
  setVal("rm-deadlift", rm.deadlift);
  setVal("rm-bench", rm.bench);
  setVal("rm-pulldown", rm.pulldown);
}

function composeMetadataTagsIntoNotes() {
  const phoneInput = document.getElementById("client-phone");
  const phoneVal = phoneInput ? phoneInput.value.trim() : (appState.meta.clientPhone || "");
  appState.meta.clientPhone = phoneVal;

  const rm = appState.meta.baseRM || { preset: "inicial_b", squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const rmTag = `[RM:LVL=${rm.preset || "custom"},SQ=${rm.squat},DL=${rm.deadlift},BP=${rm.bench},PD=${rm.pulldown}]`;
  const telTag = phoneVal ? `[TEL:${phoneVal}]` : "";

  const rawNotes = String(appState.meta.clientNotes || "")
    .replace(/\s*\[(TEL|RM):[^\]]+\]/gi, "")
    .trim();

  const prefix = [telTag, rmTag].filter(Boolean).join(" ");
  appState.meta.clientNotes = (prefix ? prefix + " " : "") + rawNotes;

  const notesEl = document.getElementById("client-notes");
  if (notesEl) notesEl.value = appState.meta.clientNotes;
}

function saveStrengthFieldsToMeta() {
  appState.meta.baseRM = {
    preset: document.getElementById("rm-preset-select")?.value || "custom",
    squat: parseFloat(document.getElementById("rm-squat")?.value) || 45,
    deadlift: parseFloat(document.getElementById("rm-deadlift")?.value) || 55,
    bench: parseFloat(document.getElementById("rm-bench")?.value) || 35,
    pulldown: parseFloat(document.getElementById("rm-pulldown")?.value) || 40
  };
  composeMetadataTagsIntoNotes();
  saveToLocalStorage();
}

function applyStrengthPreset(presetKey) {
  const p = STRENGTH_PRESETS[presetKey];
  if (p) {
    document.getElementById("rm-squat").value = p.squat;
    document.getElementById("rm-deadlift").value = p.deadlift;
    document.getElementById("rm-bench").value = p.bench;
    document.getElementById("rm-pulldown").value = p.pulldown;
  }
  saveStrengthFieldsToMeta();
}

function onManualStrengthInput() {
  const presetEl = document.getElementById("rm-preset-select");
  if (presetEl) presetEl.value = "custom";
  saveStrengthFieldsToMeta();
}

function findExerciseEquipmentText(exerciseName) {
  const clean = String(exerciseName || "").trim().toLowerCase();
  if (!clean || !Array.isArray(appState.exercises)) return "";
  const found = appState.exercises.find(e => String(e.name || "").trim().toLowerCase() === clean);
  return found ? String(found.equip || "").toLowerCase() : "";
}

function estimateExercise1RM(row, customRM = null) {
  const rm = customRM || appState.meta.baseRM || { squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const name = String(row.name || "").toLowerCase();
  const equip = findExerciseEquipmentText(row.name);
  const fullText = `${name} ${equip}`;
  const pat = String(row.pattern || "RODILLA").toUpperCase();

  if (pat === "MOVILIDAD" || /^aprox\./i.test(name)) return null;

  if (/dominada|chin-up|pull-up/i.test(fullText)) {
    const activePhase = String(appState.meta.nasmPhase || "3");
    const canAddLoad = /lastre|lastrad/i.test(fullText) && rm.pulldown >= 75 && (activePhase === "4" || activePhase === "5");
    return canAddLoad ? rm.pulldown * 0.20 : null;
  }

  const hasLoadInName = /\b(lastre|lastrad\w*|chaleco|mancuerna\w*|macuerna\w*|dumbbell\w*|manc\.?|db|kettlebell\w*|kettlebelt\w*|kb|pesa rusa|disco\w*|polea\w*|cable\w*|máquina\w*|maquina\w*|machine|prensa|hack|péndulo|pendulo|smith|multipower|landmine|sandbag|corebag|bolsa|med ball|medicine ball|balón medicinal|balon medicinal|pelota medicinal)\b|\bbarra\b(?!\s*fija)/i.test(name);
  const hasExternalLoad = hasLoadInName || /\b(lastre|lastrad\w*|chaleco|mancuerna\w*|macuerna\w*|dumbbell\w*|manc\.?|db|kettlebell\w*|kettlebelt\w*|kb|pesa rusa|disco\w*|polea\w*|cable\w*|máquina\w*|maquina\w*|machine|prensa|hack|péndulo|pendulo|smith|multipower|landmine|sandbag|corebag|bolsa|clava|clavas|macebell|med ball|medicine ball|balón medicinal|balon medicinal|pelota medicinal)\b|\bbarra\b(?!\s*fija)/i.test(equip);

  const isStrictlyBodyweightName = /pistol|sentadilla a 1 pierna|air squat|sentadilla libre|push-up|flexiones|lagartija|plancha|plank|bird-dog|dead bug|bicho muerto|curl-up|ab wheel|rueda abdominal|rollout|smr|foam|rodillo|gato-vaca|cat-cow|tube walking|estiramiento|respiraci|box jump|salto|jump|\bhop\b|bound|skip|handstand|sissy|remo invertido|australian|remo en puerta|puerta|mesa|fondos|dips|muscle-up|jumping jack|burpee|mountain climber|escalador|cinta|pasadas|km\/h|trote|correr|bici|banda elástica|banda elastica|en casa|espinal|superman/i.test(name);
  const isBodyweightEquip = /peso corporal|pesto corporal|colchoneta|suelo|pared|trx|anilla|suspensi|barra fija|paralelas|mini band|superband|tiraband|banda elástica|banda elastica/i.test(fullText);

  if (isStrictlyBodyweightName && !hasLoadInName) return null;
  if (isBodyweightEquip && !hasExternalLoad) return null;

  const isBarbell = /\bbarra\b(?!\s*fija)|olímpica|olimpica|hexagonal|trap bar/i.test(fullText);
  const isLegPress = /prensa 45|prensa de piernas|leg press|prensa inclinada|prensa horizontal/i.test(fullText);
  const isHackOrPendulum = /hack|péndulo|pendulo|belt squat/i.test(fullText);
  const isSmith = /multipower|smith/i.test(fullText);
  const isMachine = /máquina|maquina|machine|hammer|sillón|sillon|camilla|pec deck|pecfly|pec fly|contractora/i.test(fullText);
  const isPulley = /polea|cable|dorsalera|jalón|jalon|face pull|pull-through|woodchop|lift & chop|pallof/i.test(fullText);
  const isDumbbell = /mancuerna|macuerna|dumbbell|manc\.|\bdb\b/i.test(fullText);
  const isKettlebell = /kettlebell|kettlebelt|\bkb\b|pesa rusa/i.test(fullText);
  const isFreeHandWeight = (isDumbbell || isKettlebell) && !isBarbell;
  const isLandmine = /landmine|barra t|remo t/i.test(fullText);
  const isSandbagOrClub = /sandbag|corebag|bolsa|\b(clava|clavas)\b|macebell|atlas|stone/i.test(fullText);
  const isMedBall = /med ball|medicine ball|balón medicinal|balon medicinal|pelota medicinal/i.test(fullText) && !/cable|polea/i.test(name);

  const isOptionalBilateral = /bilateral o 1|2 piernas o 1/i.test(name);
  const hasExplicitSingleLimb = !isOptionalBilateral && /1 pierna|una pierna|unipodal|1 brazo|un brazo|1 mano|una mano|búlgara|bulgara|estocada|zancada|lunge|split squat|step-up|subida al caj|serrucho|medio arrodillado|half-kneeling|maleta|suitcase|waiter/i.test(name);
  const isBilateralExplicit = !hasExplicitSingleLimb && /\bbilateral\b|2 piernas|dos piernas|a 2 piernas/i.test(name);
  const isUnilateral = hasExplicitSingleLimb || (!isBilateralExplicit && !isOptionalBilateral && /1 pierna|una pierna|unipodal|1 brazo|un brazo|1 mano|una mano/i.test(fullText));

  if (isMedBall) return Math.max(3, rm.bench * 0.10);

  if (pat === "PLIOMETRIA") {
    if (/snatch|arrancada/i.test(fullText)) return (isDumbbell || isKettlebell || isUnilateral) ? rm.bench * 0.28 : rm.deadlift * 0.50;
    if (/cargada|clean/i.test(fullText)) return (isDumbbell || isKettlebell || isUnilateral) ? rm.bench * 0.34 : rm.bench * 0.85;
    return hasExternalLoad ? Math.max(4, rm.squat * 0.30) : null;
  }

  if (pat === "RODILLA") {
    const base = rm.squat;
    if (/gemelo|pantorrilla|sóleo|soleo|calf/i.test(fullText)) return isUnilateral ? base * 0.35 : base * 0.85;
    if (isLegPress) return base * 2.0;
    if (isHackOrPendulum) return base * 1.3;
    if (/sillón|sillon|extensión de cuádriceps|extension de cuadriceps|leg extension/i.test(fullText)) return isUnilateral ? base * 0.24 : base * 0.48;
    if (isSmith) return isUnilateral ? base * 0.7 : base * 1.08;
    if (/frontal|front squat/i.test(fullText) && !isFreeHandWeight) return base * 0.75;
    if (/zercher/i.test(fullText)) return base * 0.7;
    if (/goblet|copa|sumo/i.test(fullText) && isFreeHandWeight) return base * 0.44;
    if (isUnilateral) return isFreeHandWeight ? base * 0.32 : ((isSandbagOrClub || isLandmine) ? base * 0.5 : base * 0.65);
    if (isFreeHandWeight) return base * 0.36;
    if (isSandbagOrClub) return base * 0.55;
    if (isLandmine) return base * 0.6;
    return base;
  }

  if (pat === "CADERA") {
    const base = rm.deadlift;
    if (/abducci|aducci/i.test(fullText)) return base * 0.40;
    if (/hip thrust/i.test(fullText)) {
      if (isUnilateral) return isFreeHandWeight ? base * 0.25 : (isBarbell ? base * 0.45 : null);
      return isFreeHandWeight ? base * 0.45 : base * 1.15;
    }
    if (/hexagonal|trap bar|rack pull|bloques/i.test(fullText)) return base * 1.12;
    if (/snatch|arrancada/i.test(fullText)) return (isDumbbell || isKettlebell || isUnilateral) ? rm.bench * 0.28 : base * 0.55;
    if (/cargada|clean/i.test(fullText)) return (isDumbbell || isKettlebell || isUnilateral) ? rm.bench * 0.34 : rm.bench;
    if (/swing/i.test(fullText)) return isUnilateral ? base * 0.34 : base * 0.42;
    if (/camilla|sillón|sillon|leg curl|curl femoral/i.test(fullText)) return isUnilateral ? base * 0.17 : base * 0.34;
    if (isPulley || /pull-through/i.test(fullText)) return base * 0.45;
    if (/buenos días|buenos dias|good morning/i.test(fullText)) return base * 0.5;
    if (/rumano|rdl|piernas rígidas|piernas semirrígidas/i.test(fullText)) {
      if (isUnilateral) return isFreeHandWeight ? base * 0.25 : base * 0.5;
      return isFreeHandWeight ? base * 0.32 : base * 0.75;
    }
    if (isUnilateral) return isFreeHandWeight ? base * 0.25 : base * 0.5;
    if (/puente de glúteos|puente de gluteos|floor bridge/i.test(fullText)) return base * 0.55;
    if (isFreeHandWeight) return base * 0.35;
    if (isSandbagOrClub) return base * 0.6;
    return base;
  }

  if (pat === "EMPUJE_H") {
    const base = rm.bench;
    if (/tríceps|triceps|rompecráneos|rompecraneos|francés|frances/i.test(fullText)) return (isFreeHandWeight || isUnilateral) ? base * 0.20 : base * 0.45;
    if (/apertura|fly|pecfly|pec fly|cruce en polea|cruces|pec deck|contractora/i.test(fullText)) return base * 0.22;
    if (isMachine || isSmith) return base * 1.1;
    if (/inclinad/i.test(fullText)) return isFreeHandWeight ? base * 0.36 : base * 0.82;
    if (isPulley) return isUnilateral ? base * 0.32 : base * 0.55;
    if (isLandmine) return base * 0.55;
    if (isFreeHandWeight) return isUnilateral ? base * 0.4 : base * 0.42;
    return base;
  }

  if (pat === "EMPUJE_V") {
    const base = rm.bench;
    if (/tríceps|triceps/i.test(fullText)) return (isFreeHandWeight || isUnilateral) ? base * 0.20 : base * 0.45;
    if (/vuelo|elevación lateral|elevacion lateral|scaption|plano escapular|frontal/i.test(fullText)) return base * 0.14;
    if (/push press|jerk|segundo tiempo/i.test(fullText)) return isFreeHandWeight ? base * 0.35 : base * 0.8;
    if (/thruster|squat a press/i.test(fullText)) return isFreeHandWeight ? base * 0.3 : base * 0.6;
    if (/bottom-up|sots|windmill|molino|anyhow/i.test(fullText)) return base * 0.22;
    if (isMachine || isSmith) return base * 0.75;
    if (isLandmine) return isUnilateral ? base * 0.38 : base * 0.52;
    if (isFreeHandWeight || isUnilateral) return base * 0.28;
    return base * 0.65;
  }

  if (pat === "TRACCION_V") {
    const base = rm.pulldown;
    if (/bíceps|biceps|martillo|predicador|scott/i.test(fullText)) return (isFreeHandWeight || isUnilateral) ? base * 0.22 : base * 0.48;
    if (/pull-over|pullover|brazos rectos/i.test(fullText)) return base * 0.42;
    if (isMachine) return base * 1.08;
    if (isUnilateral && isPulley) return base * 0.48;
    return base;
  }

  if (pat === "TRACCION_H") {
    const base = rm.pulldown;
    if (/bíceps|biceps|martillo|predicador|scott/i.test(fullText)) return (isFreeHandWeight || isUnilateral) ? base * 0.22 : base * 0.48;
    if (/posición de plancha|posicion de plancha|renegade/i.test(fullText)) return base * 0.28;
    if (/rotatorio|rotaci/i.test(fullText) && isUnilateral) return base * 0.34;
    if (/face pull|vuelo posterior|pájaro|pajaro|y-w|pull-apart|rotación externa/i.test(fullText)) return base * 0.24;
    if (isMachine) return base * 1.1;
    if (isPulley) return isUnilateral ? base * 0.46 : base * 0.95;
    if (isLandmine) return isUnilateral ? base * 0.48 : base * 0.85;
    if (isFreeHandWeight || isUnilateral) return isUnilateral ? base * 0.45 : base * 0.38;
    return base * 0.95;
  }

  if (pat === "TRANSPORTE") {
    if (/mesero|waiter|overhead/i.test(fullText)) return rm.bench * 0.28;
    if (/maleta|suitcase/i.test(fullText)) return rm.deadlift * 0.35;
    if (/zercher|abrazo|bear hug|sandbag/i.test(fullText)) return rm.deadlift * 0.6;
    return rm.deadlift * 0.42;
  }

  if (pat === "CORE") {
    if (/turkish|levantada turca|levantamiento turco|\btgu\b/i.test(fullText)) return rm.bench * 0.35;
    if (/windmill|molino/i.test(fullText)) return rm.bench * 0.25;
    if (/side bend|inclinación lateral|inclinacion lateral/i.test(fullText)) return rm.deadlift * 0.24;
    if (/leñador|lenador|woodchop|lift & chop|alto-bajo|pallof|rotación en polea|crunch.*polea|crunch.*máquina|crunch.*maquina/i.test(fullText)) return rm.pulldown * 0.35;
    return null;
  }

  return null;
}

function roundToGymStep(val, step) {
  const s = parseFloat(step) || 1;
  return Number((Math.round(val / s) * s).toFixed(2));
}

function inferTargetPctFromRow(row, bKey, phaseKey) {
  const phaseObj = NASM_PHASES[phaseKey] || NASM_PHASES["3"];
  const fullName = String(row.name || "").toLowerCase();
  const equip = findExerciseEquipmentText(row.name);

  if (/med ball|medicine ball|balón medicinal|balon medicinal|pelota medicinal/i.test(`${fullName} ${equip}`) && !/cable|polea/i.test(fullName)) return 1.0;
  if (phaseKey === "5" && /velocidad|speed|salto|jump|explosiv|balístic|vel\b/i.test(`${fullName} ${row.rpe || ""}`)) return 0.40;
  if (bKey === "core") return /turkish|levantada turca|\btgu\b/i.test(fullName) ? 0.72 : 0.65;
  if (row.pattern === "TRANSPORTE") return 0.75;

  const rangePct = String(row.rpe || "").match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*%/);
  if (rangePct) {
    const avg = (parseFloat(rangePct[1]) + parseFloat(rangePct[2])) / 2;
    if (avg >= 30 && avg <= 100) return avg / 100;
  }

  const pctMatches = String(row.rpe || "").match(/(\d+(?:\.\d+)?)\s*%/g);
  if (pctMatches && pctMatches.length > 0) {
    const nums = pctMatches.map(s => parseFloat(s));
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    if (avg >= 30 && avg <= 100) return avg / 100;
  }

  const repNums = String(row.reps || "").match(/\d+/g);
  if (repNums && repNums.length > 0 && !/\d\s*(s|seg|min|m)\b/i.test(row.reps || "")) {
    const avgReps = repNums.slice(0, 2).reduce((a, b) => a + parseFloat(b), 0) / Math.min(2, repNums.length);
    if (avgReps <= 3) return 0.88;
    if (avgReps <= 5) return 0.84;
    if (avgReps <= 7) return 0.78;
    if (avgReps <= 10) return 0.73;
    if (avgReps <= 12) return 0.68;
    if (avgReps <= 15) return 0.62;
    return 0.55;
  }

  return phaseObj.pct;
}

function applyBaseStrengthToRoutine(includeProgression = true, customRM = null) {
  if (!customRM) saveStrengthFieldsToMeta();
  const phaseKey = appState.meta.nasmPhase || "3";
  const step = parseFloat(document.getElementById("rounding-select")?.value) || 1;

  appState.days.forEach(d => {
    ["str", "core"].forEach(bKey => {
      (d.blocks[bKey] || []).forEach(r => {
        const est1RM = estimateExercise1RM(r, customRM);
        if (!est1RM || est1RM <= 0) {
          r.w1 = r.w2 = r.w3 = r.w4 = "";
          return;
        }
        const targetIntensity = inferTargetPctFromRow(r, bKey, phaseKey);
        const w1Val = Math.max(step, roundToGymStep(est1RM * targetIntensity, step));
        r.w1 = String(w1Val);
        if (includeProgression) {
          r.w2 = String(roundToGymStep(w1Val * 1.025, step));
          r.w3 = String(roundToGymStep(w1Val * 1.05, step));
          r.w4 = String(roundToGymStep(w1Val * 1.075, step));
        }
      });
    });
  });

  renderAll();
}


function onPhaseSelectChange() {
  const newPhaseKey = document.getElementById("nasm-phase-select").value;
  appState.meta.nasmPhase = newPhaseKey;
  if (typeof genConfig !== "undefined") {
    genConfig.phase = newPhaseKey;
    if (typeof syncGenPrescriptionFromPhaseAndMethod === "function") syncGenPrescriptionFromPhaseAndMethod();
  }
  updateNASMAssistant();

  const newPhase = NASM_PHASES[newPhaseKey] || NASM_PHASES["3"];
  appState.days.forEach((d, dIdx) => {
    (d.blocks.str || []).forEach((r, rIdx) => {
      if (r.pattern === "TRANSPORTE") return;
      if (typeof prescribeRowForExercise === "function") {
        const foundEx = (appState.exercises || []).find(
          e => String(e.name || "").trim().toLowerCase() === String(r.name || "").trim().toLowerCase()
        );
        const exObj = foundEx || { name: r.name, pattern: r.pattern, equip: "" };
        const slotRole = typeof getSlotRoleForPhase === "function"
          ? getSlotRoleForPhase(newPhaseKey, rIdx, appState.days.length, dIdx)
          : (rIdx < 2 ? "primary" : "secondary");
        const methodKey = (typeof genConfig !== "undefined" && genConfig.method) ? genConfig.method : "nucleo";
        const rx = prescribeRowForExercise(exObj, "str", rIdx, r.sets || newPhase.def.sets, newPhaseKey, methodKey, slotRole);
        r.reps = rx.reps;
        r.rpe = rx.rpe;
        r.rest = rx.rest;
      } else {
        r.sets = newPhase.def.sets;
        r.reps = newPhase.def.reps;
        r.rpe  = newPhase.def.rpe;
        r.rest = newPhase.def.rest;
      }
    });
  });

  applyBaseStrengthToRoutine(true);
}

function buildMomentOptions(sel) {
  return Object.entries(MOMENT_CONFIG).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.label}</option>`).join("");
}

function buildTierOptions(sel) {
  return Object.entries(TIER_CONFIG).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.label}</option>`).join("");
}

function buildPatternOptions(sel) {
  return Object.entries(PATTERN_CONFIG).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${v.label}</option>`).join("");
}

function createDefaultDay(num) {
  return { title: `Dia ${num}`, focus: "", blocks: { warm: [], core: [], str: [], cool: [] } };
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { Object.assign(appState, JSON.parse(saved)); } catch (e) {}
  }
  appState.sheetUrl = URL_GOOGLE_SHEET_FIJA || appState.sheetUrl;
  if (!appState.days || appState.days.length === 0) {
    appState.days = [createDefaultDay(1), createDefaultDay(2), createDefaultDay(3)];
  }
  if (!appState.meta.baseRM) appState.meta.baseRM = extractRMFromNotes(appState.meta.clientNotes);
  enrichExercisesMetadata();
  const urlInput = document.getElementById("gsheet-url-input");
  if (urlInput) urlInput.value = appState.sheetUrl || "";
  if (typeof populateDropdowns === "function") populateDropdowns();
}

function saveMeta() {
  appState.meta.clientName = document.getElementById("client-name").value;
  appState.meta.coachName = document.getElementById("coach-name").value;
  appState.meta.clientGoal = document.getElementById("client-goal").value;
  appState.meta.splitType = document.getElementById("split-type").value;
  appState.meta.startDate = document.getElementById("start-date").value;
  appState.meta.clientNotes = document.getElementById("client-notes").value;
  saveToLocalStorage();
}

function syncMetaInputs() {
  document.getElementById("client-name").value = appState.meta.clientName || "";
  document.getElementById("coach-name").value = appState.meta.coachName || "";
  document.getElementById("client-goal").value = appState.meta.clientGoal || "";
  document.getElementById("split-type").value = appState.meta.splitType || "Full Body 3 Dias";
  document.getElementById("start-date").value = appState.meta.startDate || "";
  document.getElementById("client-notes").value = appState.meta.clientNotes || "";
  document.getElementById("nasm-phase-select").value = appState.meta.nasmPhase || "3";
  if (typeof syncCoachPhoneField === "function") syncCoachPhoneField();
  syncStrengthFieldsFromMeta();
}

function updateNASMAssistant() {
  const k = document.getElementById("nasm-phase-select").value;
  appState.meta.nasmPhase = k;
  const p = NASM_PHASES[k] || NASM_PHASES["3"];
  document.getElementById("nasm-assistant-content").innerHTML = `
    <div><strong>Criterio:</strong> ${p.focus}</div>
    <div class="nasm-params">
      <div class="nasm-param-item"><span>Reps / Series</span><strong>${p.reps} (${p.sets})</strong></div>
      <div class="nasm-param-item"><span>Intensidad / Pausa</span><strong>${p.intensity} | ${p.rest}</strong></div>
    </div>
  `;
  saveToLocalStorage();
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setupCoachPinVisibilityToggle() {
  const pinInput = document.getElementById("auth-coach-pin");
  if (!pinInput || document.getElementById("btn-toggle-coach-pin")) return;

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:relative; display:flex; align-items:center; width:100%;";
  pinInput.parentNode.insertBefore(wrapper, pinInput);
  wrapper.appendChild(pinInput);
  pinInput.style.width = "100%";
  pinInput.style.paddingRight = "40px";

  const eyeOpen = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.id = "btn-toggle-coach-pin";
  toggleBtn.title = "Mostrar / ocultar PIN";
  toggleBtn.innerHTML = eyeOpen;
  toggleBtn.style.cssText = "position:absolute; right:8px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px; display:flex; align-items:center;";

  toggleBtn.addEventListener("click", () => {
    const isHidden = pinInput.type === "password";
    pinInput.type = isHidden ? "text" : "password";
    toggleBtn.innerHTML = isHidden ? eyeOff : eyeOpen;
    toggleBtn.style.color = isHidden ? "var(--accent)" : "var(--text-muted)";
    pinInput.focus();
  });

  wrapper.appendChild(toggleBtn);
}

function renderAll() {
  enrichExercisesMetadata();
  if (typeof renderDayTabs === "function") renderDayTabs();
  if (typeof renderBlocks === "function") renderBlocks();
  if (typeof renderWeeklySeries === "function") renderWeeklySeries();
  if (typeof renderDrawerLibrary === "function") renderDrawerLibrary();
  if (typeof updateHeaderLayoutAndSpacer === "function") updateHeaderLayoutAndSpacer();
  saveToLocalStorage();
}

window.addEventListener("DOMContentLoaded", () => {
  if (typeof setupInstallablePWA === "function") setupInstallablePWA();
  if (typeof setupScrollHeaderBehavior === "function") setupScrollHeaderBehavior();
  if (typeof initStaticControls === "function") initStaticControls();
  setupCoachPinVisibilityToggle();
  loadFromLocalStorage();
  document.getElementById("cloud-bar").classList.add("section-collapsed");
  syncMetaInputs();
  updateNASMAssistant();
  renderAll();
});

window.addEventListener("beforeprint", () => {
  if (typeof buildPrintAllDaysView === "function") buildPrintAllDaysView();
});