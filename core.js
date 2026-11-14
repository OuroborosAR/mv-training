// =========================================================================
// CORE.JS: ESTADO GLOBAL, CONSTANTES, FUERZA BASE 1RM Y MOTOR POR ELEMENTO
// =========================================================================

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
  warm: { label: "1. Entrada en Calor",        short: "Entrada en Calor", sheetVal: "ENTRADA_CALOR" },
  core: { label: "2. Zona Media / Activación", short: "Zona Media / Act.", sheetVal: "ZONA_MEDIA" },
  str:  { label: "3. Bloque Principal",        short: "Bloque Principal",  sheetVal: "PRINCIPAL" },
  cool: { label: "4. Vuelta a la Calma",       short: "Vuelta a la Calma", sheetVal: "VUELTA_CALMA" }
};

const TIER_CONFIG = {
  BASE:       { label: "Base / Poliarticular Bilateral (1er Ej.)", short: "Base Poliarticular" },
  INTEGRADO:  { label: "Integrado / Full Body Multiarticular",     short: "Integrado / Full Body" },
  UNILATERAL: { label: "Secundario / Unilateral / Asimétrico",     short: "Unilateral" },
  ANALITICO:  { label: "Analítico / Aislado / Correctivo",         short: "Analítico / Correctivo" }
};

const NASM_PHASES = {
  "1": { name: "Fase 1: Estabilizacion",     pct: 0.60,  reps: "12-20",     sets: "1-3", intensity: "50-70%",     rest: "0-90s",  focus: "Control postural y estabilidad articular.",                     def: { sets: 3, reps: "12-15", rpe: "60%",   rest: "60s" } },
  "2": { name: "Fase 2: Fuerza Resistencia", pct: 0.75,  reps: "8-12",      sets: "2-4", intensity: "70-80%",     rest: "0-60s",  focus: "Trabajo combinado de fuerza base y estabilidad.",               def: { sets: 3, reps: "10-12", rpe: "75%",   rest: "60s" } },
  "3": { name: "Fase 3: Hipertrofia",        pct: 0.80,  reps: "6-12",      sets: "3-5", intensity: "75-85%",     rest: "60-90s", focus: "Volumen semanal objetivo de 12 a 15 series (maximo 20).",      def: { sets: 4, reps: "8-10",  rpe: "80%",   rest: "75s" } },
  "4": { name: "Fase 4: Fuerza Maxima",      pct: 0.875, reps: "1-5",       sets: "4-6", intensity: "85-100%",    rest: "3-5m",   focus: "Cargas altas en patrones primarios.",                           def: { sets: 4, reps: "4-5",   rpe: "87.5%", rest: "3m" } },
  "5": { name: "Fase 5: Potencia",           pct: 0.85,  reps: "1-5 + 8-10",sets: "3-5", intensity: "85% / Vel",  rest: "1-2m",   focus: "Contrastes de fuerza pesada (85%) y velocidad explosiva.",     def: { sets: 4, reps: "5",     rpe: "85% / Explosivo", rest: "2m" } }
};

const STRENGTH_PRESETS = {
  inicial_a:  { squat: 30,  deadlift: 40,  bench: 20,  pulldown: 25 },
  inicial_b:  { squat: 45,  deadlift: 55,  bench: 35,  pulldown: 40 },
  intermedio: { squat: 75,  deadlift: 95,  bench: 60,  pulldown: 65 },
  avanzado:   { squat: 110, deadlift: 135, bench: 85,  pulldown: 90 }
};

const BLOCK_DEFINITIONS = [
  { key: "warm", cssClass: "block-warm", title: "1. Entrada en Calor y Movilidad", defaultPattern: "MOVILIDAD" },
  { key: "core", cssClass: "block-core", title: "2. Zona Media y Activacion", defaultPattern: "CORE" },
  { key: "str",  cssClass: "block-str",  title: "3. Bloque Principal de Fuerza", defaultPattern: "RODILLA" },
  { key: "cool", cssClass: "block-cool", title: "4. Vuelta a la Calma", defaultPattern: "MOVILIDAD" }
];

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
  if (v === "STR"  || v === "PRINCIPAL" || v.includes("FUERZA")) return "str";
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
  const rawAuthor = String(ex.author || "");
  const tagMatch = rawAuthor.match(/\[BLQ:([a-z]+)\|ROL:([A-Z_]+)\]/i);
  if (tagMatch && MOMENT_CONFIG[tagMatch[1].toLowerCase()]) {
    return tagMatch[1].toLowerCase();
  }

  const explicit = normalizeMomentKey(ex.block || ex.momento);
  if (explicit) return explicit;

  const name = String(ex.name || "").toLowerCase();
  const pat = String(ex.pattern || "RODILLA").toUpperCase();

  if (pat === "MOVILIDAD") {
    if (/estiramiento|respiraci|relajaci|elongaci|estático|estatico|calma/i.test(name)) {
      return "cool";
    }
    return "warm";
  }
  if (pat === "CORE" || pat === "PLIOMETRIA") {
    return "core";
  }
  return "str";
}

function inferExerciseTier(ex) {
  if (!ex) return "BASE";
  const rawAuthor = String(ex.author || "");
  const tagMatch = rawAuthor.match(/\[BLQ:([a-z]+)\|ROL:([A-Z_]+)\]/i);
  if (tagMatch && TIER_CONFIG[tagMatch[2].toUpperCase()]) {
    return tagMatch[2].toUpperCase();
  }

  const explicit = normalizeTierKey(ex.tier || ex.jerarquia);
  if (explicit) return explicit;

  const name = String(ex.name || "").toLowerCase();
  const pat = String(ex.pattern || "RODILLA").toUpperCase();

  if (/thruster|squat a press|squat a remo|squat to row|step-up.*press|subida.*press|clean|cargada|snatch|arrancada|swing|push press|push jerk|anyhow|levantamiento de objeto|turkish|levantada turca|windmill|molino|woodchop|lift & chop/i.test(name)) {
    return "INTEGRADO";
  }
  if (/búlgara|bulgara|estocada|lunge|step-up|subida al caj|pistol|1 pierna|una pierna|unipodal|unilateral|1 brazo|un brazo|1 mano|una mano|medio arrodillado|half-kneeling|rotatorio|asimétric|asimetric|alternad|suitcase|maleta|waiter/i.test(name)) {
    return "UNILATERAL";
  }
  if (/curl femoral|leg curl|deslizante|hamstring|puente de glúteos|puente de gluteos|floor bridge|scaption|plano escapular|y-w|face pull|vuelo|apertura|pull-apart|jefferson|back extension|banco romano|slr|aisla/i.test(name)) {
    return "ANALITICO";
  }
  if (["RODILLA", "CADERA", "EMPUJE_H", "EMPUJE_V", "TRACCION_H", "TRACCION_V"].includes(pat)) {
    return "BASE";
  }
  return "INTEGRADO";
}

function getExerciseMeta(ex) {
  const block = inferExerciseMoment(ex);
  const tier = inferExerciseTier(ex);
  const cleanAuthor = String(ex?.author || "Propio").replace(/\s*\[BLQ:[^\]]+\]\s*/gi, "").trim() || "Propio";
  return { block, tier, cleanAuthor };
}

function enrichExercisesMetadata() {
  if (!Array.isArray(appState.exercises)) return;
  appState.exercises.forEach(ex => {
    ex.block = inferExerciseMoment(ex);
    ex.tier = inferExerciseTier(ex);
  });
}

// =========================================================================
// MOTOR BIOMECÁNICO DE CARGAS SEGÚN PATRÓN, VARIANTE Y ELEMENTO
// =========================================================================

function extractRMFromNotes(notesStr) {
  const def = { preset: "inicial_b", squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const match = String(notesStr || "").match(/\[RM:([^\]]+)\]/i);
  if (!match) return def;

  const parts = match[1].split(",");
  parts.forEach(p => {
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

  const presetEl = document.getElementById("rm-preset-select");
  const sqEl = document.getElementById("rm-squat");
  const dlEl = document.getElementById("rm-deadlift");
  const bpEl = document.getElementById("rm-bench");
  const pdEl = document.getElementById("rm-pulldown");

  if (presetEl) presetEl.value = rm.preset || "custom";
  if (sqEl) sqEl.value = rm.squat;
  if (dlEl) dlEl.value = rm.deadlift;
  if (bpEl) bpEl.value = rm.bench;
  if (pdEl) pdEl.value = rm.pulldown;
}

function composeMetadataTagsIntoNotes() {
  const phoneInput = document.getElementById("client-phone");
  const phoneVal = phoneInput ? phoneInput.value.trim() : (appState.meta.clientPhone || "");
  appState.meta.clientPhone = phoneVal;

  const rm = appState.meta.baseRM || { preset: "inicial_b", squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const rmTag = `[RM:LVL=${rm.preset || "custom"},SQ=${rm.squat},DL=${rm.deadlift},BP=${rm.bench},PD=${rm.pulldown}]`;
  const telTag = phoneVal ? `[TEL:${phoneVal}]` : "";

  let rawNotes = String(appState.meta.clientNotes || "")
    .replace(/\s*\[TEL:[^\]]+\]/gi, "")
    .replace(/\s*\[RM:[^\]]+\]/gi, "")
    .trim();

  const prefix = [telTag, rmTag].filter(Boolean).join(" ");
  appState.meta.clientNotes = (prefix ? prefix + " " : "") + rawNotes;

  const notesEl = document.getElementById("client-notes");
  if (notesEl) notesEl.value = appState.meta.clientNotes;
}

function saveStrengthFieldsToMeta() {
  const presetEl = document.getElementById("rm-preset-select");
  const sqEl = document.getElementById("rm-squat");
  const dlEl = document.getElementById("rm-deadlift");
  const bpEl = document.getElementById("rm-bench");
  const pdEl = document.getElementById("rm-pulldown");

  appState.meta.baseRM = {
    preset: presetEl ? presetEl.value : "custom",
    squat: parseFloat(sqEl?.value) || 45,
    deadlift: parseFloat(dlEl?.value) || 55,
    bench: parseFloat(bpEl?.value) || 35,
    pulldown: parseFloat(pdEl?.value) || 40
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

// Busca el elemento registrado del ejercicio en la Biblioteca (Barra, Mancuerna, Polea, Máquina, etc.)
function findExerciseEquipmentText(exerciseName) {
  const clean = String(exerciseName || "").trim().toLowerCase();
  if (!clean || !Array.isArray(appState.exercises)) return "";
  const found = appState.exercises.find(e => String(e.name || "").trim().toLowerCase() === clean);
  return found ? String(found.equip || "").toLowerCase() : "";
}

// Calcula el 1RM específico del ejercicio adaptando el % según el elemento y la biomecánica (Boyle, EAC, Milo, NASM)
function estimateExercise1RM(row, customRM = null) {
  const rm = customRM || appState.meta.baseRM || { squat: 45, deadlift: 55, bench: 35, pulldown: 40 };
  const name = String(row.name || "").toLowerCase();
  const equip = findExerciseEquipmentText(row.name);
  const fullText = `${name} ${equip}`;
  const pat = String(row.pattern || "RODILLA").toUpperCase();

  // 1. Excluir ejercicios puramente de peso corporal, bandas elásticas, movilidad o saltos sin carga
  if (/air squat|sentadilla libre|push-up|flexiones|plancha|side plank|bird-dog|dead bug|bicho muerto|curl-up|ab wheel|rueda abdominal|smr|foam|rodillo|gato-vaca|tube walking|mini band|superband|tiraband|banda elástica|banda elastica|estiramiento|respiraci|box jump|salto al caj|salto en largo|drop jump|depth jump|hop|bound|skip|trx|anillas|dominadas exc|pistol|handstand|sissy/i.test(fullText) && !/lastre|lastrad|mancuerna|barra|kettlebell|disco/i.test(fullText)) {
    return null;
  }

  // Detectores de elemento
  const isLegPress = /prensa 45|prensa de piernas|leg press|prensa inclinada|prensa horizontal/i.test(fullText);
  const isHackOrPendulum = /hack|péndulo|pendulo|belt squat/i.test(fullText);
  const isSmith = /multipower|smith/i.test(fullText);
  const isMachine = /máquina|maquina|machine|hammer|sillón|sillon|camilla/i.test(fullText);
  const isPulley = /polea|cable|dorsalera|jalón|jalon|face pull|pull-through|woodchop|lift & chop|pallof/i.test(fullText);
  const isDumbbell = /mancuerna|dumbbell|manc\./i.test(fullText);
  const isKettlebell = /kettlebell|\bkb\b|pesa rusa/i.test(fullText);
  const isLandmine = /landmine|barra t|remo t/i.test(fullText);
  const isSandbagOrClub = /sandbag|corebag|bolsa|clava|macebell|atlas|stone/i.test(fullText);
  const isMedBall = /med ball|medicine ball|balón medicinal|balon medicinal|pelota/i.test(fullText);
  const isUnilateral = /búlgara|bulgara|split squat|estocada|lunge|step-up|subida al caj|1 pierna|una pierna|unipodal|1 brazo|un brazo|1 mano|una mano|serrucho|medio arrodillado|half-kneeling|maleta|suitcase|waiter/i.test(fullText);

  // 2. Lanzamientos de Medicine Ball / Pliometría cargada (NASM: ~10% del 1RM base)
  if (isMedBall || pat === "PLIOMETRIA") {
    return Math.max(3, rm.bench * 0.12);
  }

  // 3. Cálculo por Patrón de Movimiento y Elemento
  if (pat === "RODILLA") {
    const base = rm.squat;
    if (isLegPress) return base * 2.00;                         // Prensa 45°: ~200% de la Sentadilla libre
    if (isHackOrPendulum) return base * 1.30;                   // Hack / Belt Squat: ~130%
    if (/sillón|sillon|extensión de cuádriceps|leg extension/i.test(fullText)) {
      return isUnilateral ? base * 0.24 : base * 0.48;          // Sillón de cuádriceps: ~48% bilateral / 24% unipodal
    }
    if (isSmith) return isUnilateral ? base * 0.70 : base * 1.08;
    if (/frontal|front squat/i.test(fullText) && !isKettlebell && !isDumbbell) {
      return base * 0.75;                                       // EAC Weightlifting: Front Squat = 70-80% de Back Squat
    }
    if (/zercher/i.test(fullText)) return base * 0.70;          // EAC Weightlifting: Zercher Squat
    if (/goblet|copa/i.test(fullText)) return base * 0.42;      // Milo: Goblet Squat con 1 KB o 1 Mancuerna al pecho
    if (isUnilateral) {
      // Boyle / Dan John: Sentadilla Split / Búlgara con mancuernas (~32% de Sentadilla por mano) vs con Barra (65%)
      if (isDumbbell || isKettlebell) return base * 0.32;
      if (isSandbagOrClub || isLandmine) return base * 0.50;
      return base * 0.65;
    }
    if (isDumbbell || isKettlebell) return base * 0.36;         // Sentadilla con 2 mancuernas o 2 KB en rack (peso c/u)
    if (isSandbagOrClub) return base * 0.55;
    if (isLandmine) return base * 0.60;
    return base * 1.00;                                         // Sentadilla Trasera con Barra (100%)
  }

  if (pat === "CADERA") {
    const base = rm.deadlift;
    if (/hip thrust/i.test(fullText)) {
      return (isDumbbell || isKettlebell) ? base * 0.45 : base * 1.15; // Hip Thrust con barra/máquina: 115%
    }
    if (/hexagonal|trap bar|rack pull|bloques/i.test(fullText)) return base * 1.12;
    if (/cargada|clean/i.test(fullText)) {
      // Dan John / Boyle: Cargada con barra = 100% Press Banca (~80% Sentadilla)
      return (isDumbbell || isKettlebell) ? rm.bench * 0.38 : rm.bench * 1.00;
    }
    if (/arrancada|snatch/i.test(fullText)) {
      return (isDumbbell || isKettlebell) ? rm.bench * 0.30 : base * 0.55;
    }
    if (/swing/i.test(fullText)) {
      return isUnilateral ? base * 0.34 : base * 0.42;          // Milo: Swing con Kettlebell (peso único)
    }
    if (/camilla|sillón|leg curl|curl femoral/i.test(fullText)) {
      return isUnilateral ? base * 0.17 : base * 0.34;          // Camilla isquiotibiales (máquina)
    }
    if (isPulley || /pull-through/i.test(fullText)) return base * 0.45;
    if (/buenos días|buenos dias|good morning/i.test(fullText)) return base * 0.50;
    if (/rumano|rdl|piernas rígidas|piernas semirrígidas/i.test(fullText)) {
      if (isUnilateral) return (isDumbbell || isKettlebell) ? base * 0.25 : base * 0.50;
      if (isDumbbell || isKettlebell) return base * 0.32;       // RDL con Mancuernas (peso por mano)
      return base * 0.75;                                       // RDL con Barra: 75% del Peso Muerto
    }
    if (isUnilateral) {
      return (isDumbbell || isKettlebell) ? base * 0.25 : base * 0.50;
    }
    if (/puente de glúteos|floor bridge/i.test(fullText)) return base * 0.55;
    if (isDumbbell || isKettlebell) return base * 0.35;
    if (isSandbagOrClub) return base * 0.60;
    return base * 1.00;                                         // Peso Muerto Convencional / Sumo con Barra (100%)
  }

  if (pat === "EMPUJE_H") {
    const base = rm.bench;
    if (/apertura|fly|cruce en polea|cruces/i.test(fullText)) {
      return base * 0.22;                                       // Milo (Palanca larga): Aperturas / Cruces en polea (por mano)
    }
    if (isMachine || isSmith) return base * 1.10;               // Chest Press en Máquina / Multipower: 110%
    if (/inclinad/i.test(fullText)) {
      return (isDumbbell || isKettlebell) ? base * 0.36 : base * 0.82; // Inclinado: 82% barra / 36% por mancuerna
    }
    if (isPulley) return isUnilateral ? base * 0.32 : base * 0.60;
    if (isLandmine) return base * 0.55;
    if (isDumbbell || isKettlebell) {
      return isUnilateral ? base * 0.40 : base * 0.42;          // Press Plano / Floor Press con Mancuernas o KB (peso por mano)
    }
    return base * 1.00;                                         // Press de Banca Plano con Barra (100%)
  }

  if (pat === "EMPUJE_V") {
    const base = rm.bench;
    if (/vuelo|elevación lateral|elevacion lateral|scaption|plano escapular|frontal/i.test(fullText)) {
      return base * 0.14;                                       // Milo (Palanca larga): Vuelos laterales / Scaption (por mano)
    }
    if (/push press|jerk|segundo tiempo/i.test(fullText)) {
      // Dan John / Milo: Push Press / Jerk mueve ~80% de la Banca con barra o ~35% por mancuerna/KB
      return (isDumbbell || isKettlebell) ? base * 0.35 : base * 0.80;
    }
    if (/thruster|squat a press/i.test(fullText)) {
      return (isDumbbell || isKettlebell) ? base * 0.30 : base * 0.60;
    }
    if (/bottom-up|sots|windmill|molino/i.test(fullText)) {
      return base * 0.20;                                       // Milo: Estabilidad extrema de hombro con KB
    }
    if (isMachine || isSmith) return base * 0.75;               // Shoulder Press en máquina guiada: 75% de Banca
    if (isLandmine) return isUnilateral ? base * 0.38 : base * 0.52;
    if (isDumbbell || isKettlebell || isUnilateral) {
      return base * 0.28;                                       // Milo: Press estricto con 1 o 2 Mancuernas / KB (peso por mano)
    }
    return base * 0.65;                                         // Press Militar Estricto con Barra: 65% de Banca
  }

  if (pat === "TRACCION_V") {
    const base = rm.pulldown;
    if (/pull-over|pullover|brazos rectos/i.test(fullText)) return base * 0.42;
    if (isMachine) return base * 1.08;
    if (/dominada|chin-up|pull-up/i.test(fullText)) {
      return /lastre|lastrad/i.test(fullText) ? base * 0.25 : null; // Dominadas libres = Peso corporal
    }
    if (isUnilateral && isPulley) return base * 0.48;           // Jalón unilateral en polea
    return base * 1.00;                                         // Dorsalera / Jalón al pecho en polea (100%)
  }

  if (pat === "TRACCION_H") {
    const base = rm.pulldown;
    if (/face pull|vuelo posterior|pájaro|pajaro|y-w|pull-apart|rotación externa/i.test(fullText)) {
      return base * 0.24;                                       // Tracción escapular / analítica en polea o mancuernas
    }
    if (isMachine) return base * 1.10;                          // Remo en máquina Hammer / palanca: 110%
    if (isPulley) return isUnilateral ? base * 0.46 : base * 0.95; // Remo sentado en polea baja: 95%
    if (isLandmine) return isUnilateral ? base * 0.48 : base * 0.85;
    if (isDumbbell || isKettlebell || isUnilateral) {
      return isUnilateral ? base * 0.45 : base * 0.38;          // Remo serrucho/gorila 1 brazo (45%) vs 2 mancuernas (38% c/u)
    }
    return base * 0.95;                                         // Remo con Barra (Pendlay / 90° / Seal Row): 95% de Dorsalera
  }

  if (pat === "TRANSPORTE") {
    // Milo: Caminata del Granjero (pesada por mano), Maleta (unilateral) y Mesero (Waiter overhead)
    if (/mesero|waiter|overhead/i.test(fullText)) return rm.bench * 0.28;
    if (/maleta|suitcase/i.test(fullText)) return rm.deadlift * 0.35;
    if (/zercher|abrazo|bear hug|sandbag/i.test(fullText)) return rm.deadlift * 0.60;
    return rm.deadlift * 0.42;                                  // Granjero (peso por cada mancuerna/KB)
  }

  if (pat === "CORE") {
    if (/turkish|levantada turca|tgu/i.test(fullText)) {
      return rm.bench * 0.35;                                   // Milo: TGU (~1.25x del Press KB unilateral)
    }
    if (/windmill|molino/i.test(fullText)) return rm.bench * 0.25;
    if (/woodchop|lift & chop|pallof|rotación en polea/i.test(fullText)) return rm.pulldown * 0.30;
    return null;
  }

  return null;
}

function roundToGymStep(val, step) {
  const s = parseFloat(step) || 1;
  const rounded = Math.round(val / s) * s;
  return Number(rounded.toFixed(2));
}

// Calcula y rellena los pesos de toda la rutina activa usando los 4 básicos, el elemento y el % de la Fase OPT
function applyBaseStrengthToRoutine(includeProgression = true, customRM = null) {
  if (!customRM) saveStrengthFieldsToMeta();
  const phaseKey = appState.meta.nasmPhase || "3";
  const phaseObj = NASM_PHASES[phaseKey] || NASM_PHASES["3"];
  const step = parseFloat(document.getElementById("rounding-select")?.value) || 1;
  const progRate = 0.025;

  appState.days.forEach(d => {
    ["str", "core"].forEach(bKey => {
      const rows = d.blocks[bKey] || [];
      rows.forEach(r => {
        const est1RM = estimateExercise1RM(r, customRM);
        if (!est1RM || est1RM <= 0) return;

        // En Fase 5 (Potencia), los ejercicios explosivos o balísticos trabajan al 35-45% o con carga moderada (NASM)
        let targetIntensity = (bKey === "core") ? 0.65 : phaseObj.pct;
        if (phaseKey === "5" && /velocidad|speed|salto|jump|explosiv|balístic/i.test(r.name)) {
          targetIntensity = 0.40;
        }

        const w1Val = Math.max(step, roundToGymStep(est1RM * targetIntensity, step));
        r.w1 = String(w1Val);
        if (includeProgression) {
          r.w2 = String(roundToGymStep(w1Val * (1 + progRate), step));
          r.w3 = String(roundToGymStep(w1Val * (1 + progRate * 2), step));
          r.w4 = String(roundToGymStep(w1Val * (1 + progRate * 3), step));
        }
      });
    });
  });

  renderAll();
}

function onPhaseSelectChange() {
  const prevPhaseKey = String(appState.meta.nasmPhase || "3");
  const newPhaseKey = document.getElementById("nasm-phase-select").value;
  const prevPhase = NASM_PHASES[prevPhaseKey] || NASM_PHASES["3"];
  const newPhase = NASM_PHASES[newPhaseKey] || NASM_PHASES["3"];

  appState.meta.nasmPhase = newPhaseKey;
  updateNASMAssistant();

  const step = parseFloat(document.getElementById("rounding-select")?.value) || 1;
  const ratio = prevPhase.pct > 0 ? (newPhase.pct / prevPhase.pct) : 1;

  appState.days.forEach(d => {
    const strRows = d.blocks.str || [];
    strRows.forEach(r => {
      if (r.pattern !== "TRANSPORTE") {
        r.sets = newPhase.def.sets;
        r.reps = newPhase.def.reps;
        r.rpe  = newPhase.def.rpe;
        r.rest = newPhase.def.rest;
      }

      const w1Num = parseFloat(String(r.w1 || "").replace(",", "."));
      if (!isNaN(w1Num) && w1Num > 0) {
        ["w1", "w2", "w3", "w4"].forEach(wk => {
          const val = parseFloat(String(r[wk] || "").replace(",", "."));
          if (!isNaN(val) && val > 0) {
            r[wk] = String(Math.max(step, roundToGymStep(val * ratio, step)));
          }
        });
      } else {
        const est1RM = estimateExercise1RM(r);
        if (est1RM && est1RM > 0) {
          const w1Calc = Math.max(step, roundToGymStep(est1RM * newPhase.pct, step));
          r.w1 = String(w1Calc);
          r.w2 = String(roundToGymStep(w1Calc * 1.025, step));
          r.w3 = String(roundToGymStep(w1Calc * 1.05, step));
          r.w4 = String(roundToGymStep(w1Calc * 1.075, step));
        }
      }
    });
  });

  renderAll();
}

function buildMomentOptions(sel) {
  return Object.entries(MOMENT_CONFIG)
    .map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.label}</option>`)
    .join("");
}

function buildTierOptions(sel) {
  return Object.entries(TIER_CONFIG)
    .map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.label}</option>`)
    .join("");
}

function createDefaultDay(num) {
  return {
    title: `Dia ${num}`,
    focus: "",
    blocks: { warm: [], core: [], str: [], cool: [] }
  };
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
  if (!appState.meta.baseRM) {
    appState.meta.baseRM = extractRMFromNotes(appState.meta.clientNotes);
  }
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

function buildPatternOptions(sel) {
  return Object.entries(PATTERN_CONFIG)
    .map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${v.label}</option>`)
    .join("");
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
  wrapper.style.position = "relative";
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.width = "100%";

  pinInput.parentNode.insertBefore(wrapper, pinInput);
  wrapper.appendChild(pinInput);
  pinInput.style.width = "100%";
  pinInput.style.paddingRight = "40px";

  const eyeOpenSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOffSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.id = "btn-toggle-coach-pin";
  toggleBtn.title = "Mostrar / ocultar PIN";
  toggleBtn.innerHTML = eyeOpenSvg;
  toggleBtn.style.cssText = "position:absolute; right:8px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:4px; display:flex; align-items:center; justify-content:center;";

  toggleBtn.addEventListener("click", () => {
    const isHidden = pinInput.type === "password";
    pinInput.type = isHidden ? "text" : "password";
    toggleBtn.innerHTML = isHidden ? eyeOffSvg : eyeOpenSvg;
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