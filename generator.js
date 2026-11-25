let genConfig = {
  daysCount: 3,
  level: "intermedio",
  phase: "3",
  method: "nucleo",
  mainSetsScheme: "4_3",
  warmCoreSetsScheme: "2_2",
  customReps: "8-10",
  customRpe: "75%",
  customRest: "90s",
  selectedEquip: ["ALL"],
  includeTransport: true,
  includePlio: true
};

const BASE_EQUIP_CATEGORIES = [
  { key: "PESO_CORPORAL", label: "Peso Corporal / Calistenia", keywords: ["peso corporal", "pesto corporal", "libre", "suelo", "colchoneta", "pared"] },
  { key: "BARRA",         label: "Barra Olimpica / Discos",    keywords: ["barra", "landmine", "bumper", "disco"] },
  { key: "MANCUERNAS",    label: "Mancuernas (Dumbbells)",     keywords: ["mancuerna", "macuerna", "manc.", "db"] },
  { key: "KETTLEBELL",    label: "Kettlebells (Pesas Rusas)",  keywords: ["kettlebell", "kettlebelt", "kb"] },
  { key: "MAQUINAS",      label: "Maquinas / Prensa / Smith",  keywords: ["máquina", "maquina", "machine", "prensa", "hack", "péndulo", "pendulo", "smith", "multipower", "sillón", "sillon", "camilla", "hammer", "dorsalera", "pec deck"] },
  { key: "SUSPENSION",    label: "TRX / Anillas / Barra Fija", keywords: ["trx", "anilla", "suspensi", "barra fija", "paralelas"] },
  { key: "BANDAS_POLEA",  label: "Bandas / Poleas",            keywords: ["banda", "tiraband", "superband", "mini band", "polea", "sports flex"] },
  { key: "SANDBAG_CLAVA", label: "Corebag / Sandbag / Clavas", keywords: ["sandbag", "corebag", "bolsa", "clava", "macebell", "stone", "atlas"] },
  { key: "CAJON_MB_ACC",  label: "Cajon / Med Ball / Rueda / Banco", keywords: ["cajón", "cajon", "med ball", "medicine", "pelota", "ab roll", "rueda", "slider", "deslizante", "valla", "soga", "foam", "banco", "ghd"] }
];

const PHASE_ALLOWED_METHODS = {
  "1": ["nucleo", "superserie_pha"],
  "2": ["superserie_pha", "nucleo", "piramide_trunca", "escalera"],
  "3": ["nucleo", "piramide_trunca", "piramidal_inverso", "trepada_rechazo", "escalera", "superserie_pha"],
  "4": ["nucleo", "trepada_rechazo", "piramide_trunca", "piramidal_inverso", "oleaje", "escalera"],
  "5": ["contraste", "oleaje", "nucleo"]
};

const TRAINING_METHODS = {
  nucleo: {
    name: "Series en el Nucleo (Carga Estable)",
    desc: "Mantiene peso y repeticiones estables en todas las series de trabajo.",
    getDefaults: (phase) => ({
      "1": { reps: "12-15", rpe: "60%", rest: "60s" },
      "2": { reps: "10-12", rpe: "70%", rest: "75s" },
      "3": { reps: "8-10",  rpe: "75%", rest: "90s" },
      "4": { reps: "4-5",   rpe: "85%", rest: "3m" },
      "5": { reps: "4-5",   rpe: "45% Vel", rest: "2.5m" }
    }[phase] || { reps: "8-10", rpe: "75%", rest: "90s" }),
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  superserie_pha: {
    name: "Superseries / PHA (Fuerza + Estab. o Antagonistas)",
    desc: "Agrupa pares (B1/B2, C1/C2) combinando fuerza estable con estabilizacion o patrones opuestos.",
    getDefaults: (phase) => ({
      "1": { reps: "12-15", rpe: "RIR 3", rest: "45s" },
      "2": { reps: "10-12", rpe: "70%",   rest: "60s" },
      "3": { reps: "8-10",  rpe: "73%",   rest: "75s" }
    }[phase] || { reps: "10-12", rpe: "70%", rest: "60s" }),
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  piramide_trunca: {
    name: "Piramide Trunca Ascendente (EAC)",
    desc: "Sube carga y baja repeticiones en cada serie del basico frenando antes del fallo.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "6-5-4-3", rpe: "78-87%", rest: "3m" }
      : { reps: "12-10-8-6", rpe: "68-80%", rest: "90s" },
    formatRepsForSlot: (sets, phase) => phase === "4"
      ? (sets === 3 ? "6-4-3" : (sets >= 5 ? "6-5-4-3-2" : "6-5-4-3"))
      : (sets === 3 ? "12-10-8" : (sets >= 5 ? "12-10-8-6-6" : "12-10-8-6"))
  },
  piramidal_inverso: {
    name: "Piramidal Inverso (Descendente en Carga)",
    desc: "Ubica la serie mas pesada al inicio del basico y reduce peso subiendo repeticiones.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "3-4-5-6", rpe: "87-78%", rest: "3m" }
      : { reps: "6-8-10-12", rpe: "80-70%", rest: "2m" },
    formatRepsForSlot: (sets, phase) => phase === "4"
      ? (sets === 3 ? "3-4-6" : "3-4-5-6")
      : (sets === 3 ? "6-8-10" : "6-8-10-12")
  },
  trepada_rechazo: {
    name: "Trepada y Rechazo / Back-Off (EAC)",
    desc: "Sube hasta el peso objetivo del dia en basicos y cierra con descarga (-10%) de volumen.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "5-3-2+5", rpe: "86%", rest: "3m" }
      : { reps: "10-8-6+10", rpe: "78%", rest: "2m" },
    formatRepsForSlot: (sets, phase) => phase === "4"
      ? (sets === 3 ? "5-3+5" : "5-3-2+5")
      : (sets === 3 ? "10-8+10" : "10-8-6+10")
  },
  escalera: {
    name: "Sistema Escalonado / Escalera (Milo)",
    desc: "Acumula volumen de calidad en escalones progresivos manteniendo velocidad limpia.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "Esc 1-2-3", rpe: "82%", rest: "2.5m" }
      : { reps: "Esc 2-3-5", rpe: "72%", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  oleaje: {
    name: "Sistema en Oleaje / Ondulante (PAP)",
    desc: "Alterna olas de carga y repeticiones aprovechando la potenciacion post-tetanica.",
    getDefaults: (phase) => phase === "5"
      ? { reps: "3-5-3-5", rpe: "82% / Vel", rest: "2.5m" }
      : { reps: "5-3-5-3", rpe: "80-88%", rest: "3m" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  contraste: {
    name: "Contraste PAP (Fuerza Pesada + Explosivo)",
    desc: "Empareja un basico pesado (85%) con un ejercicio explosivo del mismo patron.",
    getDefaults: () => ({ reps: "3-5", rpe: "85%", rest: "30s par" }),
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  }
};

const SPLIT_BLUEPRINTS = {
  2: {
    splitLabel: "Full Body 2 Dias",
    isFullBody: true,
    days: [
      { region: "full", focus: "Full Body A: Rodilla + Empuje H + Cadera + Traccion H", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL", "INTEGRADO"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL"] }] },
      { region: "full", focus: "Full Body B: Cadera + Traccion V + Rodilla + Empuje V", slots: [{ pattern: "CADERA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE", "UNILATERAL"] }] }
    ]
  },
  3: {
    splitLabel: "Full Body 3 Dias",
    isFullBody: true,
    days: [
      { region: "full", focus: "Full Body A: Rodilla + Empuje H + Cadera + Traccion H", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL"] }] },
      { region: "full", focus: "Full Body B: Cadera + Traccion V + Rodilla + Empuje V", slots: [{ pattern: "CADERA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE", "UNILATERAL"] }] },
      { region: "full", focus: "Full Body C: Rodilla + Empuje + Cadera + Traccion H", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO", "UNILATERAL"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "UNILATERAL", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL", "INTEGRADO"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] }] }
    ]
  },
  4: {
    splitLabel: "Split por Patrones 4 Dias",
    isFullBody: false,
    days: [
      { region: "upper", focus: "Dia 1 — Torso A: Empuje H + Traccion H + Empuje V + Traccion V", slots: [{ pattern: "EMPUJE_H", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL", "ANALITICO"] }] },
      { region: "lower", focus: "Dia 2 — Pierna A (Rodilla): Base + Cadera + Unilateral + Analitico", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "ANALITICO", "BASE"] }] },
      { region: "upper", focus: "Dia 3 — Torso B: Traccion V + Empuje V + Traccion H + Empuje H", slots: [{ pattern: "TRACCION_V", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }, { pattern: "EMPUJE_H", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }] },
      { region: "lower", focus: "Dia 4 — Pierna B (Cadera): Base + Rodilla + Unilateral + Analitico", slots: [{ pattern: "CADERA", preferredTiers: ["BASE"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "BASE"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "ANALITICO", "BASE"] }] }
    ]
  },
  5: {
    splitLabel: "Split por Patrones 5 Dias",
    isFullBody: false,
    days: [
      { region: "upper", focus: "Dia 1 — Torso A: Empuje H Base + Traccion H Base + Accesorio Empuje", slots: [{ pattern: "EMPUJE_H", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "UNILATERAL", "ANALITICO"] }] },
      { region: "lower", focus: "Dia 2 — Pierna A (Rodilla): Sentadilla Base + Bisagra + Unilateral", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO"] }] },
      { region: "upper", focus: "Dia 3 — Torso B: Traccion V Base + Empuje V Base + Traccion H", slots: [{ pattern: "TRACCION_V", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }] },
      { region: "lower", focus: "Dia 4 — Pierna B (Cadera): Peso Muerto Base + Rodilla Unilateral + Posterior", slots: [{ pattern: "CADERA", preferredTiers: ["BASE"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "BASE"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }] },
      { region: "full",  focus: "Dia 5 — Full Body Integrado: Equilibrio de Patrones", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO", "UNILATERAL"] }, { pattern: "CADERA", preferredTiers: ["BASE", "INTEGRADO", "UNILATERAL"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE", "UNILATERAL"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL"] }] }
    ]
  }
};

const PHASE5_CONTRAST_BLUEPRINTS = {
  2: {
    splitLabel: "Full Body 2 Dias (Contraste Potencia)",
    isFullBody: true,
    days: [
      { region: "full", focus: "Contraste A: Rodilla (F+P) + Empuje Horizontal (F+P)", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "EMPUJE_H", role: "strength" }, { pattern: "EMPUJE_H", role: "power" }] },
      { region: "full", focus: "Contraste B: Cadera (F+P) + Traccion (F+P)", slots: [{ pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }, { pattern: "TRACCION_H", role: "strength" }, { pattern: "TRACCION_H", role: "power" }] }
    ]
  },
  3: {
    splitLabel: "Full Body 3 Dias (Contraste Potencia)",
    isFullBody: true,
    days: [
      { region: "full", focus: "Contraste A: Rodilla (F+P) + Empuje Horizontal (F+P)", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "EMPUJE_H", role: "strength" }, { pattern: "EMPUJE_H", role: "power" }] },
      { region: "full", focus: "Contraste B: Cadera (F+P) + Traccion V (F+P)", slots: [{ pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }, { pattern: "TRACCION_V", role: "strength" }, { pattern: "TRACCION_V", role: "power" }] },
      { region: "full", focus: "Contraste C: Rodilla (F+P) + Empuje Vertical (F+P)", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "EMPUJE_V", role: "strength" }, { pattern: "EMPUJE_V", role: "power" }] }
    ]
  },
  4: {
    splitLabel: "Torso / Pierna 4 Dias (Contraste Potencia)",
    isFullBody: false,
    days: [
      { region: "upper", focus: "Dia 1 — Torso A Contraste: Empuje H (F+P) + Traccion H (F+P)", slots: [{ pattern: "EMPUJE_H", role: "strength" }, { pattern: "EMPUJE_H", role: "power" }, { pattern: "TRACCION_H", role: "strength" }, { pattern: "TRACCION_H", role: "power" }] },
      { region: "lower", focus: "Dia 2 — Pierna A Contraste: Rodilla (F+P) + Cadera (F+P)", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }] },
      { region: "upper", focus: "Dia 3 — Torso B Contraste: Empuje V (F+P) + Traccion V (F+P)", slots: [{ pattern: "EMPUJE_V", role: "strength" }, { pattern: "EMPUJE_V", role: "power" }, { pattern: "TRACCION_V", role: "strength" }, { pattern: "TRACCION_V", role: "power" }] },
      { region: "lower", focus: "Dia 4 — Pierna B Contraste: Cadera (F+P) + Rodilla (F+P)", slots: [{ pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }, { pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }] }
    ]
  },
  5: {
    splitLabel: "Split 5 Dias (Contraste Potencia)",
    isFullBody: false,
    days: [
      { region: "upper", focus: "Dia 1 — Empuje H Contraste + Traccion H Contraste", slots: [{ pattern: "EMPUJE_H", role: "strength" }, { pattern: "EMPUJE_H", role: "power" }, { pattern: "TRACCION_H", role: "strength" }, { pattern: "TRACCION_H", role: "power" }] },
      { region: "lower", focus: "Dia 2 — Rodilla Contraste + Cadera Contraste", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }] },
      { region: "upper", focus: "Dia 3 — Empuje V Contraste + Traccion V Contraste", slots: [{ pattern: "EMPUJE_V", role: "strength" }, { pattern: "EMPUJE_V", role: "power" }, { pattern: "TRACCION_V", role: "strength" }, { pattern: "TRACCION_V", role: "power" }] },
      { region: "lower", focus: "Dia 4 — Cadera Contraste + Rodilla Contraste", slots: [{ pattern: "CADERA", role: "strength" }, { pattern: "CADERA", role: "power" }, { pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }] },
      { region: "full",  focus: "Dia 5 — Potencia Global: Rodilla (F+P) + Empuje V (F+P)", slots: [{ pattern: "RODILLA", role: "strength" }, { pattern: "RODILLA", role: "power" }, { pattern: "EMPUJE_V", role: "strength" }, { pattern: "EMPUJE_V", role: "power" }] }
    ]
  }
};

window.addEventListener("DOMContentLoaded", () => {
  ensureValidMethodForPhase();
  syncGenPrescriptionFromPhaseAndMethod();
  renderGeneratorUI();
});

function ensureValidMethodForPhase() {
  const allowed = PHASE_ALLOWED_METHODS[genConfig.phase] || ["nucleo"];
  if (!allowed.includes(genConfig.method)) genConfig.method = allowed[0];
}

function getLibraryPool() {
  if (appState.exercises?.length > 0) return appState.exercises;
  return typeof DEFAULT_EXERCISES !== "undefined" ? DEFAULT_EXERCISES : [];
}

function getActiveBlueprint() {
  if (genConfig.phase === "5") return PHASE5_CONTRAST_BLUEPRINTS[genConfig.daysCount] || PHASE5_CONTRAST_BLUEPRINTS[3];
  return SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
}

function getCanonicalExerciseKey(name) {
  let s = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(cat\s+cow)\b/g, "gato vaca")
    .replace(/\b(dead\s+bug)\b/g, "bicho muerto")
    .replace(/\b(side\s+plank)\b/g, "plancha lateral")
    .replace(/\b(bird\s+dog)\b/g, "perro caza")
    .replace(/\b(pull\s+ups?|chin\s+ups?)\b/g, "dominada")
    .replace(/\b(bench\s+press)\b/g, "press banca")
    .replace(/\b(rdl)\b/g, "peso muerto rumano")
    .replace(/\b(con|de|del|en|a|al|el|la|los|las|plano|plana|estricto|estricta|estrictas|convencional|pronas|prono)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^plancha\s*(frontal|isometrica|activa|prono|comun|basica)?$/.test(s)) return "plancha frontal";
  if (/^press banca( barra)?$/.test(s)) return "press banca barra";
  if (/^sentadilla( barra)?$/.test(s)) return "sentadilla barra";
  if (/^peso muerto( barra)?$/.test(s)) return "peso muerto barra";
  return s;
}

function isSameExerciseSemantic(nameA, nameB) {
  const kA = getCanonicalExerciseKey(nameA);
  const kB = getCanonicalExerciseKey(nameB);
  return Boolean(kA && kB && kA === kB);
}

function getAvailableEquipmentCategories() {
  const customEquips = new Set();
  getLibraryPool().forEach(ex => {
    const raw = String(ex.equip || "").trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (!BASE_EQUIP_CATEGORIES.some(cat => cat.keywords.some(kw => lower.includes(kw)))) {
      customEquips.add(raw);
    }
  });
  return [
    ...BASE_EQUIP_CATEGORIES,
    ...Array.from(customEquips).map(eq => ({ key: "CUSTOM_" + eq.toUpperCase(), label: eq, keywords: [eq.toLowerCase()] }))
  ];
}

function isHomeOnlyEquipSelection() {
  if (genConfig.selectedEquip.includes("ALL")) return false;
  return genConfig.selectedEquip.every(k => k === "PESO_CORPORAL" || k === "BANDAS_POLEA");
}

function analyzeExerciseNature(ex) {
  const name = String(ex?.name || "").toLowerCase();
  const equip = String(ex?.equip || (typeof findExerciseEquipmentText === "function" ? findExerciseEquipmentText(ex?.name) : "") || "").toLowerCase();
  const full = `${name} ${equip}`;

  const isTGU = /turkish|levantada turca|levantamiento turco|\btgu\b|windmill|molino|bent press|anyhow/i.test(name);
  const isSMR = /smr|foam|rodillo|pelota.*masaje|liberaci/i.test(full);
  const isStretch = /estiramiento|elongaci|respiraci|90-90|relajaci/i.test(name);
  const isCardioAct = /cinta|treadmill|pasadas|km\/h|correr|running|ergómetro|ergometro|airbike|assault|jumping jack|plancha jack|plank jack|\bjacks\b|skip|soga|cuerda|trote|mountain climber|escalador|high knees|talones|bici|burpee/i.test(name);
  const isIsometric = /plancha|plank|isométric|isometric|hollow|wall sit|dead hang|hold|estático|estatico|puente.*sost/i.test(name)
    && !/remo|row|toque|tap|marcha|camina|dinámic|dinamic|push-up|jack|escalador|climber/i.test(name);

  const isOptionalBilateral = /bilateral o 1|2 piernas o 1/i.test(name);
  const hasExplicitSingleLimb = !isOptionalBilateral && /1 pierna|una pierna|unipodal|1 brazo|un brazo|1 mano|una mano|búlgara|bulgara|estocada|zancada|lunge|split|step-up|subida|serrucho|\blateral\b|side plank|side bend|maleta|suitcase|waiter|mesero|bird-dog|perro de caza|dead bug|bicho muerto|pallof|woodchop|leñador|medio arrodillado|half-kneeling|alternad|c\/l|renegade|posición de plancha|posicion de plancha|rotación torácica|rotacion toracica|halo|alrededor/i.test(name);
  const isBilateralExplicit = !hasExplicitSingleLimb && /\bbilateral\b|2 piernas|dos piernas|a 2 piernas/i.test(name);
  const isUnilateral = hasExplicitSingleLimb || (!isBilateralExplicit && !isOptionalBilateral && isTGU);

  const isPullup = /dominada|pull-up|chin-up/i.test(name);
  const isMisclassifiedCore = /espinal|superman|hiperextensi|hyperextension/i.test(name);
  const isOlympicLift = /clean|cargada|snatch|arrancada|jerk|segundo tiempo/i.test(name);
  const isHomeImprovised = /en casa|puerta|mesa|toalla|mochila|botella|silla|sillón de casa/i.test(full);
  const isHighSkillBW = /pistol|muscle-up|handstand|dragon flag|human flag/i.test(name);
  const isBarbell = /\bbarra\b(?!\s*fija)|olímpica|olimpica|hexagonal|trap bar/i.test(full);
  const isMachine = /prensa|hack|péndulo|pendulo|sillón|sillon|camilla|máquina|maquina|machine|hammer|smith|multipower|dorsalera|pec deck|pecfly|pec fly|contractora|predicador/i.test(full);
  const isSingleJoint = /curl|scott|predicador|extensión de cuádriceps|extension de cuadriceps|leg extension|leg curl|sillón|sillon|camilla|vuelo|elevación lateral|elevacion lateral|apertura|pecfly|pec fly|pec deck|contractora|\bfly\b|cruce|face pull|pull-apart|scaption|pájaro|pajaro|gemelo|pantorrilla|tríceps|triceps|bíceps|biceps|aducci|abducci|aductor|abductor|aisla/i.test(full);
  const isExplosivePower = (isOlympicLift || /push press|swing|thruster|salto|jump|\bhop\b|bound|med ball|medicine ball|balón medicinal|balon medicinal|pelota medicinal|lanzamiento|throw|slam|explosiv|pliométric|pliometric|balístic|balistic|velocidad|speed|clap|rebote/i.test(full)) && !isCardioAct;
  const isStabilization = /trx|anilla|suspensi|fitball|bosu|inestable|banda|tiraband|superband|mini band|medio arrodillado|half-kneeling|bottom-up|estabilidad|equilibrio|balance|palo|silla|pared|posición de plancha|posicion de plancha|renegade|1 pierna|una pierna|unipodal|1 brazo|un brazo|estocada|búlgara|bulgara|step-up|subida|rotatorio|asimétric|asimetric/i.test(full);

  const hasLoadInName = /\b(lastre|lastrad\w*|chaleco|mancuerna\w*|macuerna\w*|dumbbell\w*|manc\.?|db|kettlebell\w*|kettlebelt\w*|kb|disco\w*|polea\w*|máquina\w*|maquina\w*|prensa|smith|multipower|landmine|sandbag|corebag)\b|\bbarra\b(?!\s*fija)/i.test(name);
  const isLoadedEquip = hasLoadInName || /\b(lastre|lastrad\w*|chaleco|mancuerna\w*|macuerna\w*|dumbbell\w*|manc\.?|db|kettlebell\w*|kettlebelt\w*|kb|disco\w*|polea\w*|máquina\w*|maquina\w*|prensa|smith|multipower|landmine|sandbag|corebag)\b|\bbarra\b(?!\s*fija)/i.test(equip);
  const isFreeCompound = (isBarbell || /landmine|mancuerna|macuerna|kettlebell|kettlebelt|\bkb\b|dominada|pull-up|chin-up|fondo|dip|sandbag|corebag/i.test(full)) && !isMachine && !isSingleJoint;

  const isBodyweight = isPullup
    || ((isHighSkillBW || /push-up|flexion|lagartija|fondo|dip|trx|anilla|suspensi|peso corporal|pesto corporal|barra fija|paralelas|air squat|sentadilla libre|remo invertido|australian|ab roll|rueda|slider|deslizante|puente de glúteos|puente de gluteos|floor bridge|puerta|mesa|espinal|superman/i.test(name)) && !hasLoadInName)
    || (!isLoadedEquip && /peso corporal|pesto corporal|libre|suelo|colchoneta|pared|banda|mini band|superband|tiraband/i.test(full));

  const isBeginnerRegression = /regresi[oó]n|rodillas apoyadas|de rodillas.*push|en pared|contra la pared|asistid|a una silla|en silla|manos elevadas|inclinada.*pared/i.test(name);
  const isStabilityLimited = /bottom-up|estabilidad de hombro|medio arrodillado|half-kneeling|posición de plancha|posicion de plancha|renegade|bosu|fitball|inestable|1 pierna|una pierna|unipodal|banda|tiraband|mini band|superband/i.test(full);

  return {
    isTGU, isSMR, isStretch, isCardioAct, isIsometric,
    isUnilateral, isPullup, isMisclassifiedCore, isOlympicLift, isHomeImprovised, isHighSkillBW,
    isBarbell, isMachine, isSingleJoint, isExplosivePower, isStabilization,
    isLoadedEquip, isFreeCompound, isBodyweight,
    isBeginnerRegression, isStabilityLimited
  };
}

function getSlotRoleForPhase(phase, slotIdx, daysCount = genConfig.daysCount, dayIdx = 0) {
  if (phase === "5") return slotIdx % 2 === 0 ? "strength" : "power";
  if (phase === "2") return slotIdx < 2 ? "strength" : "stab";
  if (daysCount === 5) {
    if (dayIdx < 4) return slotIdx === 0 ? "primary" : (slotIdx === 1 ? "compound_sec" : "secondary");
    return slotIdx <= 1 ? "compound_sec" : "secondary";
  }
  if (daysCount === 4) return slotIdx === 0 ? "primary" : (slotIdx === 1 ? "compound_sec" : "secondary");
  return slotIdx < 2 ? "primary" : "secondary";
}

function matchesContrastPowerPattern(ex, targetPattern) {
  const full = `${ex.name || ""} ${ex.equip || ""}`.toLowerCase();
  if (targetPattern === "RODILLA") return /box jump|squat jump|salto|jump|\bhop\b|bound|thruster|pliométric|pliometric/i.test(full) && !/pecho|chest|slam/i.test(full);
  if (targetPattern === "CADERA") return /swing|clean|cargada|snatch|arrancada|salto en largo|broad jump|bound|\bhop\b|levantamiento de objeto/i.test(full);
  if (targetPattern === "EMPUJE_H") return /pase de pecho|chest pass|med ball|balón medicinal|balon medicinal|pelota medicinal|push-up.*plio|clap|lanzamiento|throw|explosiv/i.test(full);
  if (targetPattern === "EMPUJE_V") return /push press|jerk|segundo tiempo|thruster|snatch|arrancada|med ball|lanzamiento|throw/i.test(full);
  if (targetPattern === "TRACCION_H" || targetPattern === "TRACCION_V") return /slam|clean|cargada|snatch|arrancada|med ball|pendlay|explosiv|muscle-up/i.test(full);
  return analyzeExerciseNature(ex).isExplosivePower;
}

function scoreRegionMatch(ex, block, dayRegion) {
  if (!dayRegion || dayRegion === "full") return 0;
  const full = `${ex.name || ""} ${ex.equip || ""}`.toLowerCase();
  const isLowerMob = /cadera|tobillo|rodilla|isquio|glúteo|gluteo|gemelo|cuádriceps|cuadriceps|tfl|aductor|pierna|salto|jump|\bhop\b|bound|cajón|cajon/i.test(full);
  const isUpperMob = /hombro|muñeca|muneca|codo|escápula|escapula|pecho|dorsal|cuello|cervical|med ball|pase de pecho|lanzamiento|slam|push-up/i.test(full);

  if (dayRegion === "lower") {
    if (isLowerMob && !isUpperMob) return 5;
    if (isUpperMob && !isLowerMob) return -6;
  }
  if (dayRegion === "upper") {
    if (isUpperMob && !isLowerMob) return 5;
    if (isLowerMob && !isUpperMob) return -6;
  }
  return 0;
}

function scoreExerciseForPhase(ex, phase, slotRole, slotIdx, targetPattern = "") {
  const n = analyzeExerciseNature(ex);
  const tier = typeof getExerciseMeta === "function" ? getExerciseMeta(ex).tier : "BASE";
  const full = `${ex.name || ""} ${ex.equip || ""}`.toLowerCase();
  const isAccessoryHingeOrSkill = /good morning|buenos días|buenos dias|anyhow|bent press|windmill|turkish|\btgu\b|pull-through|bottom-up/i.test(full);
  let score = 0;

  if (n.isMisclassifiedCore) return -10;

  if (phase === "1") {
    if (n.isStabilization || tier === "UNILATERAL" || tier === "INTEGRADO") score += 4;
    if (n.isBodyweight || /polea|banda|mancuerna|kettlebell|trx/i.test(full)) score += 2;
    if (n.isExplosivePower || n.isTGU || n.isHighSkillBW) score -= 7;
    if (n.isMachine) score -= 3;
    if (/barra olímpica|barra olimpica|trasnuca|back squat|peso muerto convencional|good morning/i.test(full)) score -= 3;
    return score;
  }

  if (phase === "2") {
    if (slotRole === "stab") {
      if ((n.isStabilization || n.isBodyweight || tier === "UNILATERAL") && !n.isHighSkillBW && !n.isSingleJoint) score += 5;
      if (n.isMachine || n.isExplosivePower || n.isSingleJoint || n.isHighSkillBW) score -= 7;
    } else {
      const isPureStrengthLift = n.isLoadedEquip && !n.isBodyweight && !n.isStabilization && !n.isSingleJoint && !isAccessoryHingeOrSkill && !n.isUnilateral;
      if (isPureStrengthLift && (tier === "BASE" || n.isFreeCompound || n.isMachine)) score += 8;
      else if (n.isFreeCompound && !n.isBodyweight && !n.isSingleJoint && !isAccessoryHingeOrSkill) score += 4;
      if (n.isBodyweight && !n.isPullup && !/fondo|dip/i.test(full)) score -= 7;
      if (n.isStabilization || n.isSingleJoint || isAccessoryHingeOrSkill || n.isExplosivePower || n.isBeginnerRegression || n.isTGU) score -= 8;
    }
    return score;
  }

  if (phase === "3") {
    if (slotRole === "primary" || slotRole === "compound_sec") {
      if ((n.isMachine || n.isLoadedEquip) && !n.isSingleJoint && !n.isExplosivePower && !n.isStabilityLimited && !isAccessoryHingeOrSkill) score += 6;
      if (tier === "BASE") score += 2;
      if (n.isSingleJoint || isAccessoryHingeOrSkill || n.isExplosivePower || n.isTGU) score -= 8;
    } else {
      if (n.isMachine || n.isLoadedEquip) score += 3;
      if (tier === "ANALITICO" || tier === "UNILATERAL" || n.isSingleJoint) score += 2;
      if (n.isExplosivePower || n.isTGU) score -= 6;
    }
    if (/bosu|fitball|inestable|posición de plancha|posicion de plancha/i.test(full)) score -= 4;
    return score;
  }

  if (phase === "4") {
    if (slotRole === "primary") {
      if (n.isBarbell && tier === "BASE" && !n.isUnilateral && !n.isSingleJoint && !isAccessoryHingeOrSkill) score += 8;
      else if (n.isFreeCompound && tier === "BASE" && !n.isUnilateral && !isAccessoryHingeOrSkill) score += 5;
      else if (/prensa|hack|dorsalera|jalón|jalon/i.test(full) && !n.isSingleJoint) score += 4;
      if (/kettlebell|\bkb\b/i.test(full) && !n.isBarbell) score -= 3;
      if (isAccessoryHingeOrSkill || n.isSingleJoint || n.isExplosivePower || n.isStabilityLimited) score -= 9;
      if (n.isBodyweight && !/dominada|pull-up|chin-up|fondo|dip/i.test(full)) score -= 6;
    } else if (slotRole === "compound_sec") {
      if ((n.isFreeCompound || /prensa|hack|polea|dorsalera|jalón|jalon|máquina|maquina/i.test(full)) && !n.isSingleJoint && !n.isStabilityLimited && !isAccessoryHingeOrSkill) score += 6;
      if (tier === "BASE") score += 2;
      if (n.isSingleJoint || n.isStabilityLimited || isAccessoryHingeOrSkill || n.isExplosivePower) score -= 9;
    } else {
      if (n.isLoadedEquip && !n.isSingleJoint && !n.isExplosivePower && !n.isTGU && !isAccessoryHingeOrSkill) score += 5;
      if (n.isSingleJoint || isAccessoryHingeOrSkill || n.isExplosivePower || n.isStabilityLimited || /banda|fitball|bosu|pared|silla/i.test(full)) score -= 8;
    }
    return score;
  }

  if (phase === "5") {
    if (slotRole === "power") {
      if (targetPattern && matchesContrastPowerPattern(ex, targetPattern)) score += 9;
      else if (n.isExplosivePower) score += 5;
      else if (tier === "INTEGRADO" && !n.isMachine && !n.isSingleJoint) score += 1;
      if (n.isMachine || n.isSingleJoint || n.isIsometric || n.isBeginnerRegression || n.isCardioAct) score -= 8;
    } else {
      if (n.isBarbell && tier === "BASE" && !n.isExplosivePower && !n.isUnilateral && !n.isSingleJoint && !isAccessoryHingeOrSkill) score += 8;
      else if (n.isFreeCompound && !n.isExplosivePower && !n.isTGU && !n.isSingleJoint && !isAccessoryHingeOrSkill) score += 4;
      if (n.isMachine || n.isSingleJoint || n.isBeginnerRegression || n.isIsometric || n.isExplosivePower || n.isTGU || isAccessoryHingeOrSkill) score -= 8;
    }
    return score;
  }

  return score;
}

function appendPerSide(repsStr, isUnilateral) {
  const clean = String(repsStr || "").trim();
  if (!isUnilateral || !clean || /c\/l|lado|pierna|brazo|esc|m\b/i.test(clean)) return clean;
  return `${clean} c/l`;
}

function prescribeRowForExercise(ex, block, slotIdx, sets, phase, methodKey, slotRole = null) {
  const n = analyzeExerciseNature(ex);
  const methodObj = TRAINING_METHODS[methodKey] || TRAINING_METHODS.nucleo;
  const role = slotRole || getSlotRoleForPhase(phase, slotIdx);
  const isPrimary = role === "primary" || role === "strength";

  if (block === "warm") {
    if (n.isSMR) return { reps: "30-45s", rpe: "SMR", rest: "0s" };
    if (n.isStretch) return { reps: n.isUnilateral ? "30s c/l" : "30-45s", rpe: "Movil.", rest: "0s" };
    if (n.isCardioAct) return { reps: "30-40s", rpe: "Activ.", rest: "20s" };
    if (n.isIsometric) return { reps: n.isUnilateral ? "20s c/l" : "25-30s", rpe: "Activ.", rest: "20s" };
    return { reps: n.isUnilateral ? "6-8 c/l" : "8-10", rpe: "Dinám.", rest: "20s" };
  }

  if (block === "cool") {
    if (/caminat|cinta|bici|elíptic|eliptic|trote|cardio/i.test(ex.name || "")) {
      return { reps: "5-10 min", rpe: "Suave", rest: "0s" };
    }
    return { reps: n.isUnilateral ? "30-45s c/l" : "45-60s", rpe: "Suave", rest: "0s" };
  }

  if (block === "core") {
    if (ex.pattern === "PLIOMETRIA") {
      if (n.isCardioAct) return { reps: "30-40s", rpe: "Activ.", rest: "30s" };
      return { reps: n.isUnilateral ? "4-5 c/l" : "4-6", rpe: "Explos.", rest: "60s" };
    }
    if (n.isTGU) return { reps: phase === "4" || phase === "5" ? "1-2 c/l" : "2-3 c/l", rpe: "RPE 8", rest: "60s" };
    if (n.isCardioAct) return { reps: "20-30s", rpe: "Dinám.", rest: "30s" };
    if (n.isIsometric) return { reps: n.isUnilateral ? "25-35s c/l" : "30-45s", rpe: "Control", rest: "45s" };
    return { reps: n.isUnilateral ? "8-10 c/l" : "8-12", rpe: "RIR 2", rest: "45s" };
  }

  if (ex.pattern === "TRANSPORTE") {
    return { reps: n.isUnilateral ? "20m c/l" : "25-30m", rpe: "RPE 8", rest: "60s" };
  }

  if (n.isTGU) return { reps: "2-3 c/l", rpe: "RPE 8", rest: "90s" };

  if (n.isSingleJoint) {
    return {
      reps: appendPerSide(phase === "1" ? "12-15" : "10-12", n.isUnilateral),
      rpe: phase === "1" ? "RIR 3" : "RIR 2",
      rest: "60s"
    };
  }

  if (phase === "5") {
    if (role === "power") {
      const isPurePlio = n.isBodyweight || ex.pattern === "PLIOMETRIA" || /med ball|balón medicinal|balon medicinal|salto|jump|\bhop\b|bound|slam|throw|clap/i.test(ex.name || "");
      return {
        reps: appendPerSide(isPurePlio ? "5-6" : "4-6", n.isUnilateral),
        rpe: isPurePlio ? "Explos." : "40% Vel",
        rest: "2.5m"
      };
    }
    return {
      reps: appendPerSide("3-5", n.isUnilateral),
      rpe: n.isBodyweight ? "RIR 1" : "85%",
      rest: "30s par"
    };
  }

  if (phase === "2" && role === "stab") {
    const stabReps = n.isHighSkillBW ? "5-6" : (/dominada|pull-up|chin-up/i.test(ex.name || "") ? "6-10" : "10-12");
    return { reps: appendPerSide(stabReps, n.isUnilateral), rpe: "RIR 2", rest: "60s" };
  }

  const baseReps = methodObj.formatRepsForSlot(sets, phase, genConfig.customReps || "8-10");
  const baseRpe = (genConfig.customRpe || "75%").split("(")[0].split("/")[0].trim();
  const baseRest = genConfig.customRest || "90s";

  if (n.isBodyweight) {
    const bwReps = n.isHighSkillBW ? "5-6" : (phase === "1" ? "10-15" : (phase === "4" ? "6-8" : (/dominada|pull-up|chin-up/i.test(ex.name || "") ? "6-10" : "8-12")));
    const bwRir = phase === "1" ? "RIR 3" : (phase === "4" ? "RIR 1" : "RIR 2");
    const bwRest = (isPrimary || phase === "4" || n.isPullup) ? "2m" : "60s";
    return { reps: appendPerSide(bwReps, n.isUnilateral), rpe: bwRir, rest: bwRest };
  }

  const isSpecialMethod = ["trepada_rechazo", "piramide_trunca", "piramidal_inverso", "oleaje", "escalera"].includes(methodKey);
  if (isPrimary && !n.isStabilityLimited && !(isSpecialMethod && n.isUnilateral)) {
    const isHeavyLower = ex.pattern === "RODILLA" || ex.pattern === "CADERA";
    const primRest = phase === "4" ? "3m" : (phase === "3" && isHeavyLower && baseRest === "90s" ? "2m" : baseRest);
    return {
      reps: appendPerSide(baseReps, n.isUnilateral),
      rpe: n.isUnilateral ? (phase === "4" ? "RIR 1" : "RIR 2") : baseRpe,
      rest: primRest
    };
  }

  const secReps = phase === "1" ? "12-15" : (phase === "4" ? "6-8" : (n.isUnilateral ? "8-10" : "10-12"));
  const secRpe = phase === "1" ? "RIR 3" : "RIR 2";
  const secRest = phase === "4" ? "2m" : "60-75s";
  return { reps: appendPerSide(secReps, n.isUnilateral), rpe: secRpe, rest: secRest };
}

function buildSpecificWarmupRow(primaryRow, warmSets, dayRegion, weekUsedWarm, dayUsedKeys, categories) {
  if (primaryRow && primaryRow.name) {
    const n = analyzeExerciseNature(primaryRow);
    if (!n.isBodyweight && !n.isExplosivePower) {
      const shortName = String(primaryRow.name).replace(/\([^)]*\)/g, "").trim();
      const loadCue = n.isBarbell ? "barra sola / liviano" : "carga baja";
      return {
        order: "2",
        name: `Aprox. ${shortName} (${loadCue})`,
        pattern: "MOVILIDAD",
        sets: warmSets,
        reps: "8-10",
        rpe: "Aprox.",
        rest: "45s",
        w1: "", w2: "", w3: "", w4: ""
      };
    }
  }
  const warmEx2 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level, dayRegion, excludeSMR: true }, weekUsedWarm, dayUsedKeys);
  const rxW2 = prescribeRowForExercise(warmEx2, "warm", 1, warmSets, genConfig.phase, genConfig.method);
  return { order: "2", name: warmEx2.name, pattern: "MOVILIDAD", sets: warmSets, reps: rxW2.reps, rpe: rxW2.rpe, rest: rxW2.rest, w1: "", w2: "", w3: "", w4: "" };
}

function getSetsForMainSlot(slotIdx, dayIdx = 0) {
  const days = genConfig.daysCount;
  if (genConfig.phase === "5") {
    const isFirstPair = slotIdx < 2;
    if (genConfig.mainSetsScheme === "3_all") return 3;
    if (genConfig.mainSetsScheme === "4_all") return (days === 5 && dayIdx === 4) ? 3 : 4;
    if (genConfig.mainSetsScheme === "5_4") return isFirstPair ? 5 : 4;
    return isFirstPair ? 4 : 3;
  }

  if (genConfig.mainSetsScheme === "3_all") return 3;
  if (genConfig.mainSetsScheme === "4_all") return (days === 5 && dayIdx === 4) ? 3 : 4;
  if (genConfig.mainSetsScheme === "5_4") {
    if (days >= 4) return (slotIdx === 0 && (days === 4 || dayIdx < 4)) ? 4 : 3;
    return slotIdx <= 1 ? 5 : 4;
  }
  if (days === 2) return 4;
  if (days === 3) return slotIdx <= 1 ? 4 : 3;
  if (days === 4) return slotIdx === 0 ? 4 : 3;
  return (slotIdx === 0 && dayIdx < 4) ? 4 : 3;
}

function getSetsForWarmAndCore(hasTransportThisDay = false) {
  const base = genConfig.warmCoreSetsScheme === "1_2"
    ? { warmSets: 1, coreSets: 2 }
    : (genConfig.warmCoreSetsScheme === "2_3" ? { warmSets: 2, coreSets: 3 } : { warmSets: 2, coreSets: 2 });

  if (genConfig.daysCount >= 4) return { warmSets: base.warmSets, coreSets: Math.min(2, base.coreSets), coreCount: 1 };
  if (genConfig.daysCount === 3) return { warmSets: base.warmSets, coreSets: Math.min(2, base.coreSets), coreCount: hasTransportThisDay ? 1 : 2 };
  return { warmSets: base.warmSets, coreSets: base.coreSets, coreCount: 2 };
}

function shouldAddTransportOnDay(dIdx) {
  if (!genConfig.includeTransport) return false;
  if (genConfig.daysCount === 2) return dIdx === 0 || dIdx === 1;
  return dIdx === 0 || dIdx === 2;
}

function syncGenPrescriptionFromPhaseAndMethod() {
  ensureValidMethodForPhase();
  const def = (TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo).getDefaults(genConfig.phase);
  genConfig.customReps = def.reps;
  genConfig.customRpe = def.rpe;
  genConfig.customRest = def.rest;
}

function onGenLevelChange(newLevel) {
  genConfig.level = newLevel;
  if (genConfig.daysCount >= 4) {
    genConfig.mainSetsScheme = newLevel === "iniciado" ? "3_all" : "4_3";
  } else {
    genConfig.mainSetsScheme = newLevel === "iniciado" ? "3_all" : (newLevel === "avanzado" ? "4_all" : "4_3");
  }
  genConfig.warmCoreSetsScheme = (newLevel === "avanzado" && genConfig.daysCount <= 2) ? "2_3" : "2_2";
  renderGeneratorUI();
}

function onGenPhaseOrMethodChange(field, val) {
  genConfig[field] = val;
  if (field === "phase") {
    ensureValidMethodForPhase();
    if (val === "1") genConfig.mainSetsScheme = "3_all";
    else if ((val === "4" || val === "5") && genConfig.daysCount <= 3) genConfig.mainSetsScheme = "4_all";
    else genConfig.mainSetsScheme = "4_3";
  }
  syncGenPrescriptionFromPhaseAndMethod();
  renderGeneratorUI();
}

function onGenDaysChange(val) {
  genConfig.daysCount = parseInt(val, 10) || 3;
  if (genConfig.daysCount >= 4 && genConfig.mainSetsScheme === "4_all") {
    genConfig.mainSetsScheme = "4_3";
  }
  renderGeneratorUI();
}

function applyQuickMiloPrescription(setsScheme, repsStr, rpeStr, restStr) {
  genConfig.mainSetsScheme = setsScheme;
  genConfig.customReps = repsStr;
  genConfig.customRpe = rpeStr;
  genConfig.customRest = restStr;
  renderGeneratorUI();
}

function toggleGenEquip(key) {
  if (key === "ALL") {
    genConfig.selectedEquip = ["ALL"];
  } else {
    genConfig.selectedEquip = genConfig.selectedEquip.filter(k => k !== "ALL");
    if (genConfig.selectedEquip.includes(key)) {
      genConfig.selectedEquip = genConfig.selectedEquip.filter(k => k !== key);
      if (genConfig.selectedEquip.length === 0) genConfig.selectedEquip = ["ALL"];
    } else {
      genConfig.selectedEquip.push(key);
    }
  }
  renderGeneratorUI();
}

function setQuickEquipPreset(keys) {
  genConfig.selectedEquip = keys;
  renderGeneratorUI();
}

function exerciseMatchesSelectedEquip(ex, allCategories) {
  if (genConfig.selectedEquip.includes("ALL")) return true;
  const eqLower = String(ex.equip || "Peso Corporal").toLowerCase();
  return genConfig.selectedEquip.some(selKey => {
    const cat = allCategories.find(c => c.key === selKey);
    return cat ? cat.keywords.some(kw => eqLower.includes(kw)) : false;
  });
}

function calculateProjectedWeeklyVolume() {
  const blueprint = getActiveBlueprint();
  let rodilla = 0, cadera = 0, empuje = 0, traccion = 0;
  blueprint.days.forEach((d, dIdx) => {
    d.slots.forEach((s, idx) => {
      if (genConfig.phase === "5" && s.role === "power") return;
      const sets = getSetsForMainSlot(idx, dIdx);
      if (s.pattern === "RODILLA") rodilla += sets;
      else if (s.pattern === "CADERA") cadera += sets;
      else if (s.pattern.startsWith("EMPUJE")) empuje += sets;
      else if (s.pattern.startsWith("TRACCION")) traccion += sets;
    });
  });
  return { rodilla, cadera, empuje, traccion, totalLower: rodilla + cadera, totalUpper: empuje + traccion };
}

function renderGeneratorUI() {
  const container = document.getElementById("coach-generator-view");
  if (!container) return;

  ensureValidMethodForPhase();
  const categories = getAvailableEquipmentCategories();
  const matchingExercises = getLibraryPool().filter(ex => exerciseMatchesSelectedEquip(ex, categories));
  const allowedMethodKeys = PHASE_ALLOWED_METHODS[genConfig.phase] || ["nucleo"];
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const vol = calculateProjectedWeeklyVolume();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>Generador Inteligente por Bloques y Fases</span>
        <span class="tag-pattern">${matchingExercises.length} ejercicios compatibles</span>
      </div>

      <div class="gen-grid">
        <div class="form-group">
          <label>1. Frecuencia Semanal (2 a 5 Dias)</label>
          <select class="input-full" onchange="onGenDaysChange(this.value)">
            <option value="2" ${genConfig.daysCount === 2 ? "selected" : ""}>2 Dias / Semana — Full Body</option>
            <option value="3" ${genConfig.daysCount === 3 ? "selected" : ""}>3 Dias / Semana — Full Body A/B/C</option>
            <option value="4" ${genConfig.daysCount === 4 ? "selected" : ""}>4 Dias / Semana — Split Torso / Pierna</option>
            <option value="5" ${genConfig.daysCount === 5 ? "selected" : ""}>5 Dias / Semana — Split Patrones + Integrado</option>
          </select>
        </div>

        <div class="form-group">
          <label>2. Nivel del Alumno</label>
          <select class="input-full" onchange="onGenLevelChange(this.value)">
            <option value="iniciado" ${genConfig.level === "iniciado" ? "selected" : ""}>Iniciado (3 series)</option>
            <option value="intermedio" ${genConfig.level === "intermedio" ? "selected" : ""}>Intermedio (4/3 series)</option>
            <option value="avanzado" ${genConfig.level === "avanzado" ? "selected" : ""}>Avanzado (4/3 a 4 series)</option>
          </select>
        </div>

        <div class="form-group">
          <label>3. Fase OPT (Define Ejercicios, Cargas y Métodos)</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('phase', this.value)">
            <option value="1" ${genConfig.phase === "1" ? "selected" : ""}>Fase 1: Estabilizacion (Control / Estabilidad)</option>
            <option value="2" ${genConfig.phase === "2" ? "selected" : ""}>Fase 2: Fuerza Resistencia (Fuerza + Estab.)</option>
            <option value="3" ${genConfig.phase === "3" ? "selected" : ""}>Fase 3: Hipertrofia (Estables / Máquinas / Barra)</option>
            <option value="4" ${genConfig.phase === "4" ? "selected" : ""}>Fase 4: Fuerza Maxima (Básicos Pesados)</option>
            <option value="5" ${genConfig.phase === "5" ? "selected" : ""}>Fase 5: Potencia (Contraste Fuerza + Explosivo)</option>
          </select>
        </div>

        <div class="form-group">
          <label>4. Metodo Compatible con Fase ${genConfig.phase}</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('method', this.value)">
            ${allowedMethodKeys.map(k => {
              const m = TRAINING_METHODS[k];
              return `<option value="${k}" ${genConfig.method === k ? "selected" : ""}>${escapeHtml(m.name)}</option>`;
            }).join("")}
          </select>
        </div>
      </div>

      <div style="background:rgba(56,189,248,0.05); border:1px solid var(--border); border-radius:6px; padding:11px 13px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:9px;">
          <strong style="font-size:0.78rem; color:var(--accent); text-transform:uppercase;">5. Control de Básicos (Secundarios, Contraste y Core se adaptan solos)</strong>
          <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
            <span style="font-size:0.72rem; color:var(--text-muted);">Presets:</span>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('3_all','8-10','75%','90s')">3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_3','8-10','75%','90s')">4/3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','10-12','70%','75s')">4 x 10-12</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','6','80%','2m')">4 x 6</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('5_4','5','85%','3m')">5 x 5</button>
          </div>
        </div>

        <div class="gen-grid" style="margin-bottom:0;">
          <div class="form-group">
            <label>Series Bloque Principal</label>
            <select class="input-full" onchange="genConfig.mainSetsScheme=this.value; renderGeneratorUI();">
              <option value="3_all" ${genConfig.mainSetsScheme === "3_all" ? "selected" : ""}>3 Series en todos (3x)</option>
              <option value="4_3" ${genConfig.mainSetsScheme === "4_3" ? "selected" : ""}>Equilibrado 4/3 (Recomendado)</option>
              <option value="4_all" ${genConfig.mainSetsScheme === "4_all" ? "selected" : ""}>4 Series en todos (4x)</option>
              <option value="5_4" ${genConfig.mainSetsScheme === "5_4" ? "selected" : ""}>Alto Volumen (5/4)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Series Calor / Zona Media</label>
            <select class="input-full" onchange="genConfig.warmCoreSetsScheme=this.value; renderGeneratorUI();">
              <option value="2_2" ${genConfig.warmCoreSetsScheme === "2_2" ? "selected" : ""}>2 Calor / 2 Zona Media</option>
              <option value="2_3" ${genConfig.warmCoreSetsScheme === "2_3" ? "selected" : ""}>2 Calor / 3 Zona Media</option>
              <option value="1_2" ${genConfig.warmCoreSetsScheme === "1_2" ? "selected" : ""}>1 Calor / 2 Zona Media</option>
            </select>
          </div>

          <div class="form-group">
            <label>Repeticiones (Básicos)</label>
            <input type="text" class="input-full" value="${escapeHtml(genConfig.customReps)}" oninput="genConfig.customReps=this.value">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div class="form-group">
              <label>Intensidad (Básicos)</label>
              <input type="text" class="input-full" value="${escapeHtml(genConfig.customRpe)}" oninput="genConfig.customRpe=this.value">
            </div>
            <div class="form-group">
              <label>Pausa</label>
              <input type="text" class="input-full" value="${escapeHtml(genConfig.customRest)}" oninput="genConfig.customRest=this.value">
            </div>
          </div>
        </div>
      </div>

      <div class="gen-method-info">
        <div><strong style="color:var(--text-main);">${escapeHtml(methodObj.name)}:</strong> ${escapeHtml(methodObj.desc)}</div>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <label style="margin:0;">6. Elementos Disponibles</label>
          <div style="display:flex; gap:5px; flex-wrap:wrap;">
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['ALL'])">Todos</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['PESO_CORPORAL'])">Solo Peso Corporal</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['MANCUERNAS','KETTLEBELL','PESO_CORPORAL'])">Mancuernas / KB</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['BARRA','PESO_CORPORAL'])">Barra + BW</button>
          </div>
        </div>

        <div class="gen-equip-pills">
          <span class="gen-equip-pill ${genConfig.selectedEquip.includes("ALL") ? "active" : ""}" onclick="toggleGenEquip('ALL')">Todos</span>
          ${categories.map(cat => `
            <span class="gen-equip-pill ${genConfig.selectedEquip.includes(cat.key) ? "active" : ""}" onclick="toggleGenEquip('${cat.key}')">${escapeHtml(cat.label)}</span>
          `).join("")}
        </div>
      </div>

      <div class="gen-options-row">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includeTransport ? "checked" : ""} onchange="genConfig.includeTransport=this.checked;renderGeneratorUI();">
          Incluir Cargar y Llevar / Transporte (max 2 dias/sem)
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includePlio ? "checked" : ""} onchange="genConfig.includePlio=this.checked;renderGeneratorUI();">
          Incluir Pliometria en Bloque 2 (acorde al dia y fase)
        </label>
      </div>

      <div class="gen-preview-bar">
        <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.78rem; align-items:center;">
          <span><strong>Series Semanales${genConfig.phase === "5" ? " (Fuerza Base)" : ""}:</strong></span>
          <span style="color:var(--series-green); font-weight:700;">Rodilla: ${vol.rodilla}</span>
          <span style="color:var(--series-green); font-weight:700;">Cadera: ${vol.cadera}</span>
          <span style="color:var(--series-green); font-weight:700;">Empujes: ${vol.empuje}</span>
          <span style="color:var(--series-green); font-weight:700;">Tracciones: ${vol.traccion}</span>
          <span style="color:var(--text-muted);">| Inf: ${vol.totalLower} • Sup: ${vol.totalUpper}</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" style="padding:9px 16px;" onclick="generateAutomaticRoutine(false)">Generar y Editar</button>
          <button class="btn btn-success" style="padding:9px 16px;" onclick="generateAutomaticRoutine(true)">Generar y Guardar</button>
        </div>
      </div>
    </div>
  `;
}

function getSmartCandidates({ block, pattern, preferredTiers, categories, level, phase = null, slotRole = null, slotIdx = 0, dayRegion = "full", excludeSMR = false }) {
  const allExercises = getLibraryPool();
  let pool = [];

  if (block === "str" && phase === "5" && slotRole === "power") {
    pool = allExercises.filter(ex =>
      exerciseMatchesSelectedEquip(ex, categories) &&
      analyzeExerciseNature(ex).isExplosivePower &&
      matchesContrastPowerPattern(ex, pattern)
    );
    if (pool.length === 0) {
      pool = allExercises.filter(ex => analyzeExerciseNature(ex).isExplosivePower && matchesContrastPowerPattern(ex, pattern));
    }
    if (pool.length === 0) {
      pool = allExercises.filter(ex => exerciseMatchesSelectedEquip(ex, categories) && (ex.pattern === "PLIOMETRIA" || analyzeExerciseNature(ex).isExplosivePower) && !analyzeExerciseNature(ex).isCardioAct);
    }
  } else {
    pool = allExercises.filter(ex => {
      const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
      return (!block || meta.block === block) && (!pattern || ex.pattern === pattern) && exerciseMatchesSelectedEquip(ex, categories);
    });
  }

  if (pool.length === 0) {
    pool = allExercises.filter(ex => {
      const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
      return (!block || meta.block === block) && (!pattern || ex.pattern === pattern);
    });
  }

  if (pool.length === 0 && pattern) pool = allExercises.filter(ex => ex.pattern === pattern);

  if (!isHomeOnlyEquipSelection() && pool.length > 1) {
    const gymReady = pool.filter(ex => !analyzeExerciseNature(ex).isHomeImprovised);
    if (gymReady.length > 0) pool = gymReady;
  }

  if (pattern === "PLIOMETRIA" && pool.length > 1) {
    let purePlio = pool.filter(ex => !analyzeExerciseNature(ex).isCardioAct);
    if (block === "core" && phase && phase !== "5") {
      const nonOly = purePlio.filter(ex => !analyzeExerciseNature(ex).isOlympicLift);
      if (nonOly.length > 0) purePlio = nonOly;
    }
    if (purePlio.length > 0) pool = purePlio;
  }

  if (block === "warm" && pool.length > 1) {
    const pureMob = pool.filter(ex => !analyzeExerciseNature(ex).isLoadedEquip && !/goblet|sentadilla con/i.test(ex.name));
    if (pureMob.length > 0) pool = pureMob;
    if (excludeSMR) {
      const nonSmr = pool.filter(ex => !analyzeExerciseNature(ex).isSMR);
      if (nonSmr.length > 0) pool = nonSmr;
    }
  }

  if ((block === "warm" || pattern === "PLIOMETRIA") && dayRegion !== "full" && pool.length > 1) {
    const regScored = pool.map(ex => ({ ex, s: scoreRegionMatch(ex, block, dayRegion) }));
    const maxS = Math.max(...regScored.map(r => r.s));
    let bestReg = regScored.filter(r => r.s >= Math.max(0, maxS - 1)).map(r => r.ex);
    if (bestReg.length < 2) bestReg = regScored.filter(r => r.s >= 0).map(r => r.ex);
    if (bestReg.length > 0) pool = bestReg;
  }

  if (level === "iniciado" && pool.length > 1) {
    const safe = pool.filter(ex => !/pistol|muscle-up|handstand|snatch|arrancada|bottom-up|bent press|anyhow|zercher|good morning|buenos dias|buenos días|turkish|levantada turca/i.test(ex.name));
    if (safe.length > 0) pool = safe;
  } else if ((level === "intermedio" || level === "avanzado") && pool.length > 1) {
    const nonReg = pool.filter(ex => !analyzeExerciseNature(ex).isBeginnerRegression);
    if (nonReg.length > 0) pool = nonReg;
  }

  if (block === "str" && phase && pool.length > 1) {
    const scored = pool.map(ex => ({ ex, score: scoreExerciseForPhase(ex, phase, slotRole, slotIdx, pattern) }));
    const maxScore = Math.max(...scored.map(s => s.score));
    const phaseBest = scored.filter(s => s.score >= maxScore - 2 && (maxScore > 0 ? s.score > 0 : true)).map(s => s.ex);
    if (phaseBest.length > 0) pool = phaseBest;
  }

  const effectiveTiers = (preferredTiers && (phase === "4" || phase === "2"))
    ? preferredTiers.filter(t => t !== "ANALITICO")
    : preferredTiers;

  if (effectiveTiers?.length > 0 && pool.length > 1 && !(phase === "5" && slotRole === "power")) {
    for (const tierTarget of effectiveTiers) {
      const matchingTier = pool.filter(ex => (typeof getExerciseMeta === "function" ? getExerciseMeta(ex).tier : "BASE") === tierTarget);
      if (matchingTier.length > 0) return matchingTier;
    }
  }

  return pool;
}

function pickSmartExercise(options, weekUsedKeys, dayUsedKeys = new Set()) {
  const candidates = getSmartCandidates(options);

  const notInDay = candidates.filter(ex => !dayUsedKeys.has(getCanonicalExerciseKey(ex.name)));
  const poolStep1 = notInDay.length > 0 ? notInDay : candidates;

  const notInWeek = poolStep1.filter(ex => !weekUsedKeys.has(getCanonicalExerciseKey(ex.name)));
  const finalPool = notInWeek.length > 0 ? notInWeek : poolStep1;

  if (finalPool.length === 0) {
    const patLabel = PATTERN_CONFIG[options.pattern]?.label || options.pattern || "General";
    return { id: "fallback_" + Math.random(), name: "Ejercicio " + patLabel, pattern: options.pattern || "RODILLA", equip: "Libre" };
  }

  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
  const cKey = getCanonicalExerciseKey(chosen.name);
  weekUsedKeys.add(cKey);
  dayUsedKeys.add(cKey);
  return chosen;
}

function rotateRowExercise(bKey, rIdx) {
  const day = appState.days[appState.activeDayIndex];
  const row = day?.blocks[bKey]?.[rIdx];
  if (!row) return;

  const activePhase = appState.meta.nasmPhase || genConfig.phase || "3";
  const slotRole = bKey === "str" ? getSlotRoleForPhase(activePhase, rIdx, appState.days.length, appState.activeDayIndex) : null;
  const contrastPattern = (bKey === "str" && activePhase === "5" && slotRole === "power" && rIdx > 0)
    ? (day.blocks[bKey][rIdx - 1]?.pattern || row.pattern)
    : row.pattern;

  const preferredTiers = bKey === "str"
    ? (slotRole === "primary" || slotRole === "strength" || slotRole === "compound_sec" ? ["BASE", "INTEGRADO"] : ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"])
    : null;

  const dayRegion = /torso|empuje|traccion/i.test(day.focus || "") && !/pierna|rodilla|cadera|full body/i.test(day.focus || "")
    ? "upper"
    : (/pierna|rodilla|cadera/i.test(day.focus || "") && !/torso|empuje|traccion|full body/i.test(day.focus || "") ? "lower" : "full");

  const candidates = getSmartCandidates({
    block: bKey,
    pattern: contrastPattern,
    preferredTiers,
    categories: getAvailableEquipmentCategories(),
    level: genConfig.level,
    phase: activePhase,
    slotRole,
    slotIdx: rIdx,
    dayRegion
  });

  if (candidates.length === 0) return alert("No hay ejercicios cargados en la Biblioteca para este patrón y momento.");

  const dayExistingKeys = new Set(Object.values(day.blocks).flat().map(r => getCanonicalExerciseKey(r.name)));
  const others = candidates.filter(ex => !isSameExerciseSemantic(ex.name, row.name) && !dayExistingKeys.has(getCanonicalExerciseKey(ex.name)));
  const pool = others.length > 0 ? others : candidates.filter(ex => !isSameExerciseSemantic(ex.name, row.name));
  const finalPool = pool.length > 0 ? pool : candidates;
  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];

  row.name = chosen.name;
  if (bKey === "str" && activePhase === "5" && slotRole === "power" && chosen.pattern) {
    row.pattern = chosen.pattern;
  }

  const rx = prescribeRowForExercise(chosen, bKey, rIdx, row.sets || 3, activePhase, genConfig.method, slotRole);
  row.reps = rx.reps;
  row.rpe = rx.rpe;
  row.rest = rx.rest;

  if (typeof populateRowSuggestedWeights === "function") populateRowSuggestedWeights(row, bKey);
  saveToLocalStorage();
  renderBlocks();
  renderWeeklySeries();
}

async function generateAutomaticRoutine(autoSaveToCloud) {
  ensureValidMethodForPhase();
  const categories = getAvailableEquipmentCategories();
  const blueprint = getActiveBlueprint();
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;

  const weekUsedWarm = new Set();
  const weekUsedCore = new Set();
  const weekUsedStr  = new Set();
  const weekUsedCool = new Set();

  appState.days = blueprint.days.map((dayPlan, dIdx) => {
    const dayRegion = dayPlan.region || "full";
    const dayUsedKeys = new Set();
    const addTransportToday = shouldAddTransportOnDay(dIdx);
    const { warmSets, coreSets, coreCount } = getSetsForWarmAndCore(addTransportToday);

    const strRows = dayPlan.slots.map((slot, sIdx) => {
      const slotRole = slot.role || getSlotRoleForPhase(genConfig.phase, sIdx, genConfig.daysCount, dIdx);
      let tiersForSlot = slot.preferredTiers;
      if (genConfig.phase === "5" && slotRole === "strength") tiersForSlot = ["BASE", "INTEGRADO"];
      else if (genConfig.phase === "4" && (slotRole === "primary" || slotRole === "compound_sec")) tiersForSlot = ["BASE", "INTEGRADO"];
      else if (genConfig.phase === "2" && slotRole === "strength") tiersForSlot = ["BASE"];
      else if (genConfig.phase === "1" && sIdx >= 2) tiersForSlot = ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"];

      const ex = pickSmartExercise({
        block: "str",
        pattern: slot.pattern,
        preferredTiers: tiersForSlot,
        categories,
        level: genConfig.level,
        phase: genConfig.phase,
        slotRole,
        slotIdx: sIdx,
        dayRegion
      }, weekUsedStr, dayUsedKeys);

      const setsForThisRow = getSetsForMainSlot(sIdx, dIdx);
      const rx = prescribeRowForExercise(ex, "str", sIdx, setsForThisRow, genConfig.phase, genConfig.method, slotRole);
      const orderLabel = (genConfig.method === "superserie_pha" || genConfig.method === "contraste" || genConfig.phase === "2" || genConfig.phase === "5")
        ? `${String.fromCharCode(66 + Math.floor(sIdx / 2))}${(sIdx % 2) + 1}`
        : `B${sIdx + 1}`;

      const rowPattern = (genConfig.phase === "5" && slotRole === "power" && ex.pattern) ? ex.pattern : slot.pattern;

      return {
        order: orderLabel,
        name: ex.name,
        pattern: rowPattern,
        sets: setsForThisRow,
        reps: rx.reps,
        rpe: rx.rpe,
        rest: rx.rest,
        w1: "", w2: "", w3: "", w4: ""
      };
    });

    if (addTransportToday) {
      const carryEx = pickSmartExercise({ block: "str", pattern: "TRANSPORTE", categories, level: genConfig.level }, weekUsedStr, dayUsedKeys);
      const rxT = prescribeRowForExercise(carryEx, "str", strRows.length, 3, genConfig.phase, genConfig.method);
      strRows.push({
        order: "D",
        name: carryEx.name,
        pattern: "TRANSPORTE",
        sets: 3,
        reps: rxT.reps,
        rpe: rxT.rpe,
        rest: rxT.rest,
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const warmEx1 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level, dayRegion }, weekUsedWarm, dayUsedKeys);
    const rxW1 = prescribeRowForExercise(warmEx1, "warm", 0, warmSets, genConfig.phase, genConfig.method);
    const warmRow2 = buildSpecificWarmupRow(strRows[0], warmSets, dayRegion, weekUsedWarm, dayUsedKeys, categories);
    const warmRows = [
      { order: "1", name: warmEx1.name, pattern: "MOVILIDAD", sets: warmSets, reps: rxW1.reps, rpe: rxW1.rpe, rest: rxW1.rest, w1: "", w2: "", w3: "", w4: "" },
      warmRow2
    ];

    const coreRows = [];
    for (let c = 0; c < coreCount; c++) {
      const coreEx = pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level, dayRegion }, weekUsedCore, dayUsedKeys);
      const rxC = prescribeRowForExercise(coreEx, "core", c, coreSets, genConfig.phase, genConfig.method);
      coreRows.push({
        order: `A${c + 1}`,
        name: coreEx.name,
        pattern: "CORE",
        sets: coreSets,
        reps: rxC.reps,
        rpe: rxC.rpe,
        rest: rxC.rest,
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const shouldAddPlio = genConfig.includePlio && genConfig.phase !== "5" && genConfig.phase !== "1" && (
      genConfig.daysCount <= 3 || dayRegion === "lower" || (genConfig.phase !== "4" && dIdx === 0)
    );
    if (shouldAddPlio) {
      const plioEx = pickSmartExercise({ block: "core", pattern: "PLIOMETRIA", categories, level: genConfig.level, phase: genConfig.phase, dayRegion }, weekUsedCore, dayUsedKeys);
      const rxP = prescribeRowForExercise(plioEx, "core", coreRows.length, 2, genConfig.phase, genConfig.method);
      coreRows.push({
        order: `A${coreRows.length + 1}`,
        name: plioEx.name,
        pattern: "PLIOMETRIA",
        sets: 2,
        reps: rxP.reps,
        rpe: rxP.rpe,
        rest: rxP.rest,
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const coolEx = pickSmartExercise({ block: "cool", pattern: "MOVILIDAD", categories, level: genConfig.level, dayRegion }, weekUsedCool, dayUsedKeys);
    const rxCool = prescribeRowForExercise(coolEx, "cool", 0, 1, genConfig.phase, genConfig.method);
    const coolRows = [
      { order: "1", name: coolEx.name, pattern: "MOVILIDAD", sets: 1, reps: rxCool.reps, rpe: rxCool.rpe, rest: rxCool.rest, w1: "", w2: "", w3: "", w4: "" }
    ];

    return { title: `Dia ${dIdx + 1}`, focus: dayPlan.focus, blocks: { warm: warmRows, core: coreRows, str: strRows, cool: coolRows } };
  });

  appState.activeDayIndex = 0;
  appState.meta.splitType = blueprint.splitLabel;
  appState.meta.nasmPhase = genConfig.phase;
  appState.meta.clientGoal = `${methodObj.name.split("(")[0].trim()} - Nivel ${genConfig.level.toUpperCase()}`;

  syncMetaInputs();
  updateNASMAssistant();
  if (typeof applyBaseStrengthToRoutine === "function") applyBaseStrengthToRoutine(true);
  switchCoachMainTab("editor");
  if (autoSaveToCloud && typeof saveRoutineToCloud === "function") await saveRoutineToCloud();
}