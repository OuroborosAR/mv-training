// =========================================================================
// GENERATOR.JS: MOTOR INTELIGENTE CON CONTROL DE SERIES, REPS Y JERARQUIA
// =========================================================================

let genConfig = {
  daysCount: 3,
  level: "intermedio",
  phase: "3",
  method: "nucleo",
  mainSetsScheme: "4_3", // "3_all" | "4_3" | "4_all" | "5_4"
  warmCoreSetsScheme: "2_2", // "2_2" | "2_3" | "1_2"
  customReps: "8-10",
  customRpe: "80%",
  customRest: "90s",
  selectedEquip: ["ALL"],
  includeTransport: true,
  includePlio: true
};

const BASE_EQUIP_CATEGORIES = [
  { key: "PESO_CORPORAL", label: "Peso Corporal / Calistenia", keywords: ["peso corporal", "libre", "suelo", "colchoneta", "pared"] },
  { key: "BARRA",         label: "Barra Olimpica / Discos",    keywords: ["barra", "landmine", "bumper", "disco"] },
  { key: "MANCUERNAS",    label: "Mancuernas (Dumbbells)",     keywords: ["mancuerna", "manc."] },
  { key: "KETTLEBELL",    label: "Kettlebells (Pesas Rusas)",  keywords: ["kettlebell", "kb"] },
  { key: "SUSPENSION",    label: "TRX / Anillas / Barra Fija", keywords: ["trx", "anilla", "suspensi", "barra fija", "paralelas"] },
  { key: "BANDAS_POLEA",  label: "Bandas / Poleas",            keywords: ["banda", "tiraband", "superband", "mini band", "polea", "sports flex"] },
  { key: "SANDBAG_CLAVA", label: "Corebag / Sandbag / Clavas", keywords: ["sandbag", "corebag", "bolsa", "clava", "macebell", "stone", "atlas"] },
  { key: "CAJON_MB_ACC",  label: "Cajon / Med Ball / Rueda / Sliders", keywords: ["cajón", "cajon", "med ball", "medicine", "pelota", "ab roll", "rueda", "slider", "deslizante", "valla", "soga", "foam"] }
];

const TRAINING_METHODS = {
  nucleo: {
    name: "Series en el Nucleo (Carga Estable - EAC / Milo)",
    desc: "Mantiene el peso y las repeticiones estables en todas las series de trabajo (3 a 4 series). Ideal para consolidar tecnica y acumular tension mecanica.",
    getDefaults: (phase) => ({
      "1": { reps: "12-15", rpe: "60% (Control)", rest: "60s" },
      "2": { reps: "10-12", rpe: "75% (Estable)", rest: "60s" },
      "3": { reps: "8-10",  rpe: "80% (Hipertrofia)", rest: "90s" },
      "4": { reps: "4-6",   rpe: "87.5% (Pesado)", rest: "3m" },
      "5": { reps: "5",     rpe: "85% / Explosivo", rest: "2m" }
    }[phase] || { reps: "8-10", rpe: "80%", rest: "90s" }),
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  piramide_trunca: {
    name: "Piramide Trunca Ascendente (EAC Weightlifting I)",
    desc: "Sube el porcentaje de carga y baja las repeticiones en cada serie, frenando en el porcentaje objetivo del dia sin llegar al fallo maximo.",
    getDefaults: (phase) => (phase === "4" || phase === "5")
      ? { reps: "6-5-4-3", rpe: "80-90%", rest: "2.5m" }
      : { reps: "12-10-8-6", rpe: "70-82.5%", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => {
      if (phase === "4" || phase === "5") {
        return sets === 3 ? "6-4-2" : (sets >= 5 ? "6-5-4-3-2" : "6-5-4-3");
      }
      return sets === 3 ? "12-10-8" : (sets >= 5 ? "12-10-8-6-6" : "12-10-8-6");
    }
  },
  piramidal_inverso: {
    name: "Piramidal Inverso (Descendente en Carga)",
    desc: "Ubica la serie mas pesada al principio (con el sistema nervioso fresco) y reduce la carga aumentando repeticiones en las series siguientes.",
    getDefaults: (phase) => (phase === "4")
      ? { reps: "3-4-5-6", rpe: "90-80%", rest: "3m" }
      : { reps: "6-8-10-12", rpe: "82.5-72%", rest: "90s-2m" },
    formatRepsForSlot: (sets, phase, defaultReps) => {
      if (phase === "4") {
        return sets === 3 ? "3-4-6" : "3-4-5-6";
      }
      return sets === 3 ? "6-8-10" : "6-8-10-12";
    }
  },
  trepada_rechazo: {
    name: "Trepada y Rechazo (Back-Off Sets - EAC)",
    desc: "Sube hasta el peso objetivo del dia y luego aplica series de rechazo (-10% de peso) para sumar volumen efectivo con tecnica limpia.",
    getDefaults: (phase) => (phase === "4")
      ? { reps: "5-3-2 + 1x5", rpe: "90% / -10%", rest: "3m" }
      : { reps: "10-8-6 + 1x10", rpe: "82.5% / -10%", rest: "2m" },
    formatRepsForSlot: (sets, phase, defaultReps) => {
      if (phase === "4") return sets === 3 ? "5-3 + 1x5" : "5-3-2 + 1x5";
      return sets === 3 ? "10-8 + 1x10" : "10-8-6 + 1x10";
    }
  },
  escalera: {
    name: "Sistema Escalonado / Escalera (Jeronimo Milo)",
    desc: "Acumula volumen de calidad mediante escalones progresivos de repeticiones (ej. 1-2-3 o 2-3-5) manteniendo velocidad de ejecucion.",
    getDefaults: (phase) => (phase === "4" || phase === "5")
      ? { reps: "Esc. 1-2-3 (6 reps)", rpe: "82.5% (5RM)", rest: "2m" }
      : { reps: "Esc. 2-3-5 (10 reps)", rpe: "77.5% (8RM)", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  oleaje: {
    name: "Sistema en Oleaje / Ondulante (EAC / Milo)",
    desc: "Alterna olas de intensidad y repeticiones dentro de la misma sesion aprovechando la potenciacion post-tetanica.",
    getDefaults: (phase) => (phase === "4")
      ? { reps: "5-3-5-3", rpe: "82-90%", rest: "2.5m" }
      : { reps: "10-6-10-6", rpe: "75-82.5%", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  superserie_pha: {
    name: "Superseries Agonista-Antagonista / PHA (NASM OPT)",
    desc: "Agrupa patrones opuestos en biseries (B1/B2, C1/C2) optimizando la densidad de la clase y la accion cardiaca periferica.",
    getDefaults: (phase) => ({
      reps: phase === "1" ? "12-15" : (phase === "4" ? "5" : "8-10"),
      rpe: phase === "1" ? "60%" : (phase === "4" ? "87.5%" : "77.5%"),
      rest: "60s"
    }),
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  }
};

const SPLIT_BLUEPRINTS = {
  2: {
    splitLabel: "Full Body 2 Dias",
    isFullBody: true,
    days: [
      {
        focus: "Full Body A: Base Rodilla Bilateral + Empuje H Base + Bisagra Unilateral/Integrada + Traccion H",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "EMPUJE_H",   preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "CADERA",     preferredTiers: ["INTEGRADO", "UNILATERAL", "BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL", "INTEGRADO"] }
        ]
      },
      {
        focus: "Full Body B: Base Cadera Bilateral + Empuje V Base + Rodilla Unilateral/Integrada + Traccion V",
        slots: [
          { pattern: "CADERA",     preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "EMPUJE_V",   preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "RODILLA",    preferredTiers: ["INTEGRADO", "UNILATERAL", "BASE"] },
          { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL"] }
        ]
      }
    ]
  },
  3: {
    splitLabel: "Full Body 3 Dias",
    isFullBody: true,
    days: [
      {
        focus: "Full Body A: Sentadilla Base + Press Horizontal Base + Bisagra Unilateral + Traccion H",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "EMPUJE_H",   preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "CADERA",     preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL"] }
        ]
      },
      {
        focus: "Full Body B: Peso Muerto / Bisagra Base + Empuje Vertical Base + Rodilla Unilateral + Traccion V",
        slots: [
          { pattern: "CADERA",     preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "EMPUJE_V",   preferredTiers: ["BASE", "INTEGRADO"] },
          { pattern: "RODILLA",    preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] },
          { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL"] }
        ]
      },
      {
        focus: "Full Body C: Poliarticular Integrado (Total Body) + Empuje / Traccion + Cadena Posterior",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["INTEGRADO", "BASE", "UNILATERAL"] },
          { pattern: "CADERA",     preferredTiers: ["INTEGRADO", "BASE", "UNILATERAL"] },
          { pattern: "EMPUJE_H",   preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] },
          { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] }
        ]
      }
    ]
  },
  4: {
    splitLabel: "Split por Patrones 4 Dias",
    isFullBody: false,
    days: [
      {
        focus: "Dia 1 — Torso A: Press Horizontal Base + Remo Base + Empuje V Unilateral + Traccion V",
        slots: [
          { pattern: "EMPUJE_H",   preferredTiers: ["BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["BASE"] },
          { pattern: "EMPUJE_V",   preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] },
          { pattern: "TRACCION_V", preferredTiers: ["BASE", "ANALITICO"] }
        ]
      },
      {
        focus: "Dia 2 — Pierna A (Dominante Rodilla): Sentadilla Base + Bisagra Base + Rodilla Unilateral + Analitico",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["BASE"] },
          { pattern: "CADERA",     preferredTiers: ["BASE", "UNILATERAL"] },
          { pattern: "RODILLA",    preferredTiers: ["UNILATERAL", "INTEGRADO"] },
          { pattern: "CADERA",     preferredTiers: ["ANALITICO", "UNILATERAL"] }
        ]
      },
      {
        focus: "Dia 3 — Torso B: Press Vertical Base + Dominadas/Jalon Base + Empuje H Unilateral + Traccion Escapular",
        slots: [
          { pattern: "EMPUJE_V",   preferredTiers: ["BASE"] },
          { pattern: "TRACCION_V", preferredTiers: ["BASE"] },
          { pattern: "EMPUJE_H",   preferredTiers: ["UNILATERAL", "BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["ANALITICO", "UNILATERAL"] }
        ]
      },
      {
        focus: "Dia 4 — Pierna B (Dominante Cadera): Peso Muerto Base + Rodilla Unilateral + Bisagra Unilateral + Analitico",
        slots: [
          { pattern: "CADERA",     preferredTiers: ["BASE"] },
          { pattern: "RODILLA",    preferredTiers: ["UNILATERAL", "BASE"] },
          { pattern: "CADERA",     preferredTiers: ["UNILATERAL", "INTEGRADO"] },
          { pattern: "RODILLA",    preferredTiers: ["ANALITICO", "UNILATERAL"] }
        ]
      }
    ]
  },
  5: {
    splitLabel: "Split por Patrones 5 Dias",
    isFullBody: false,
    days: [
      {
        focus: "Dia 1 — Empuje Horizontal Base + Traccion Horizontal Base + Accesorios",
        slots: [
          { pattern: "EMPUJE_H",   preferredTiers: ["BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["BASE"] },
          { pattern: "EMPUJE_H",   preferredTiers: ["UNILATERAL", "ANALITICO"] },
          { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "ANALITICO"] }
        ]
      },
      {
        focus: "Dia 2 — Dominante de Rodilla Base + Bisagra Complementaria + Rodilla Unilateral",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["BASE"] },
          { pattern: "CADERA",     preferredTiers: ["BASE", "UNILATERAL"] },
          { pattern: "RODILLA",    preferredTiers: ["UNILATERAL", "INTEGRADO"] }
        ]
      },
      {
        focus: "Dia 3 — Empuje Vertical Base + Traccion Vertical Base + Hombro/Escapular",
        slots: [
          { pattern: "EMPUJE_V",   preferredTiers: ["BASE"] },
          { pattern: "TRACCION_V", preferredTiers: ["BASE"] },
          { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "ANALITICO"] },
          { pattern: "TRACCION_V", preferredTiers: ["ANALITICO", "BASE"] }
        ]
      },
      {
        focus: "Dia 4 — Dominante de Cadera Base (Big 3) + Rodilla Unilateral + Cadena Posterior Analitica",
        slots: [
          { pattern: "CADERA",     preferredTiers: ["BASE"] },
          { pattern: "RODILLA",    preferredTiers: ["UNILATERAL", "BASE"] },
          { pattern: "CADERA",     preferredTiers: ["UNILATERAL", "ANALITICO"] }
        ]
      },
      {
        focus: "Dia 5 — Full Body Integrado (Total Body / Potencia / Cadenas Cruzadas)",
        slots: [
          { pattern: "RODILLA",    preferredTiers: ["INTEGRADO", "BASE"] },
          { pattern: "CADERA",     preferredTiers: ["INTEGRADO", "BASE"] },
          { pattern: "EMPUJE_V",   preferredTiers: ["INTEGRADO", "UNILATERAL"] },
          { pattern: "TRACCION_H", preferredTiers: ["INTEGRADO", "UNILATERAL"] }
        ]
      }
    ]
  }
};

window.addEventListener("DOMContentLoaded", () => {
  syncGenPrescriptionFromPhaseAndMethod();
  renderGeneratorUI();
});

function getLibraryPool() {
  if (appState.exercises && appState.exercises.length > 0) return appState.exercises;
  if (typeof DEFAULT_EXERCISES !== "undefined") return DEFAULT_EXERCISES;
  return [];
}

function getAvailableEquipmentCategories() {
  const exercises = getLibraryPool();
  const customEquips = new Set();

  exercises.forEach(ex => {
    const raw = String(ex.equip || "").trim();
    if (!raw) return;
    const lower = raw.toLowerCase();
    const matchedBase = BASE_EQUIP_CATEGORIES.some(cat =>
      cat.keywords.some(kw => lower.includes(kw))
    );
    if (!matchedBase) customEquips.add(raw);
  });

  const dynamicCats = Array.from(customEquips).map(eq => ({
    key: "CUSTOM_" + eq.toUpperCase(),
    label: eq,
    keywords: [eq.toLowerCase()]
  }));

  return [...BASE_EQUIP_CATEGORIES, ...dynamicCats];
}

// Determina las series exactas de cada ejercicio del Bloque Principal (siempre entre 3 y 5 series)
function getSetsForMainSlot(slotIdx) {
  const isPrimarySlot = slotIdx === 0 || slotIdx === 1;
  switch (genConfig.mainSetsScheme) {
    case "3_all": return 3;
    case "4_3":   return isPrimarySlot ? 4 : 3;
    case "4_all": return 4;
    case "5_4":   return isPrimarySlot ? 5 : 4;
    default:      return isPrimarySlot ? 4 : 3;
  }
}

function getSetsForWarmAndCore() {
  if (genConfig.warmCoreSetsScheme === "1_2") return { warmSets: 1, coreSets: 2 };
  if (genConfig.warmCoreSetsScheme === "2_3") return { warmSets: 2, coreSets: 3 };
  return { warmSets: 2, coreSets: 2 };
}

function syncGenPrescriptionFromPhaseAndMethod() {
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const def = methodObj.getDefaults(genConfig.phase);
  genConfig.customReps = def.reps;
  genConfig.customRpe  = def.rpe;
  genConfig.customRest = def.rest;
}

function onGenLevelChange(newLevel) {
  genConfig.level = newLevel;
  if (newLevel === "iniciado") {
    genConfig.mainSetsScheme = "3_all";
    genConfig.warmCoreSetsScheme = "2_2";
  } else if (newLevel === "intermedio") {
    genConfig.mainSetsScheme = "4_3";
    genConfig.warmCoreSetsScheme = "2_2";
  } else {
    genConfig.mainSetsScheme = "4_all";
    genConfig.warmCoreSetsScheme = "2_3";
  }
  renderGeneratorUI();
}

function onGenPhaseOrMethodChange(field, val) {
  genConfig[field] = val;
  if (field === "phase") {
    if (val === "1") genConfig.mainSetsScheme = "3_all";
    else if (val === "4") genConfig.mainSetsScheme = "4_all";
    else if (genConfig.level === "intermedio") genConfig.mainSetsScheme = "4_3";
  }
  syncGenPrescriptionFromPhaseAndMethod();
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
    if (!cat) return false;
    return cat.keywords.some(kw => eqLower.includes(kw));
  });
}

function calculateProjectedWeeklyVolume() {
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
  let rodilla = 0, cadera = 0, empuje = 0, traccion = 0;

  blueprint.days.forEach(d => {
    d.slots.forEach((s, idx) => {
      const sets = getSetsForMainSlot(idx);
      if (s.pattern === "RODILLA") rodilla += sets;
      else if (s.pattern === "CADERA") cadera += sets;
      else if (s.pattern.startsWith("EMPUJE")) empuje += sets;
      else if (s.pattern.startsWith("TRACCION")) traccion += sets;
    });
  });

  return {
    rodilla,
    cadera,
    empuje,
    traccion,
    totalLower: rodilla + cadera,
    totalUpper: empuje + traccion
  };
}

function renderGeneratorUI() {
  const container = document.getElementById("coach-generator-view");
  if (!container) return;

  const categories = getAvailableEquipmentCategories();
  const exercisesPool = getLibraryPool();
  const matchingExercises = exercisesPool.filter(ex => exerciseMatchesSelectedEquip(ex, categories));
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
  const vol = calculateProjectedWeeklyVolume();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>Generador Inteligente por Bloques y Control de Dosificacion</span>
        <span class="tag-pattern">${matchingExercises.length} ejercicios compatibles</span>
      </div>

      <div class="gen-grid">
        <div class="form-group">
          <label>1. Frecuencia Semanal y Estructura (2 a 5 Dias)</label>
          <select class="input-full" onchange="genConfig.daysCount=parseInt(this.value);renderGeneratorUI();">
            <option value="2" ${genConfig.daysCount === 2 ? "selected" : ""}>2 Dias / Semana — Full Body (Prioridad Poliarticular Global)</option>
            <option value="3" ${genConfig.daysCount === 3 ? "selected" : ""}>3 Dias / Semana — Full Body Patrones A/B/C (Base + Unilateral)</option>
            <option value="4" ${genConfig.daysCount === 4 ? "selected" : ""}>4 Dias / Semana — Split Torso / Pierna (1° Base -> 2° Unilateral -> 3° Analitico)</option>
            <option value="5" ${genConfig.daysCount === 5 ? "selected" : ""}>5 Dias / Semana — Split por Patrones + Dia 5 Integrado</option>
          </select>
        </div>

        <div class="form-group">
          <label>2. Nivel del Alumno (Ajusta complejidad y series sugeridas)</label>
          <select class="input-full" onchange="onGenLevelChange(this.value)">
            <option value="iniciado" ${genConfig.level === "iniciado" ? "selected" : ""}>Iniciado / Base (Sugiere 3 series en Bloque Principal)</option>
            <option value="intermedio" ${genConfig.level === "intermedio" ? "selected" : ""}>Intermedio (Sugiere 4 series en Basicos y 3 en Secundarios)</option>
            <option value="avanzado" ${genConfig.level === "avanzado" ? "selected" : ""}>Avanzado (Sugiere 4 series en todos los ejercicios principales)</option>
          </select>
        </div>

        <div class="form-group">
          <label>3. Fase del Modelo OPT (NASM)</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('phase', this.value)">
            <option value="1" ${genConfig.phase === "1" ? "selected" : ""}>Fase 1: Estabilizacion (12-15 reps - 60%)</option>
            <option value="2" ${genConfig.phase === "2" ? "selected" : ""}>Fase 2: Fuerza Resistencia (10-12 reps - 75%)</option>
            <option value="3" ${genConfig.phase === "3" ? "selected" : ""}>Fase 3: Hipertrofia (8-10 reps - 80%)</option>
            <option value="4" ${genConfig.phase === "4" ? "selected" : ""}>Fase 4: Fuerza Maxima (4-6 reps - 87.5%)</option>
            <option value="5" ${genConfig.phase === "5" ? "selected" : ""}>Fase 5: Potencia (5 reps - 85% / Explosivo)</option>
          </select>
        </div>

        <div class="form-group">
          <label>4. Metodo de Entrenamiento (EAC / Milo / NASM)</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('method', this.value)">
            ${Object.entries(TRAINING_METHODS).map(([k, m]) =>
              `<option value="${k}" ${genConfig.method === k ? "selected" : ""}>${escapeHtml(m.name)}</option>`
            ).join("")}
          </select>
        </div>
      </div>

      <!-- PANEL DE CONTROL DIRECTO DE SERIES, REPETICIONES E INTENSIDAD -->
      <div style="background:rgba(56,189,248,0.05); border:1px solid var(--border); border-radius:6px; padding:11px 13px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:9px;">
          <strong style="font-size:0.78rem; color:var(--accent); text-transform:uppercase;">
            5. Control Directo de Series y Repeticiones (Editable antes de generar)
          </strong>
          <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
            <span style="font-size:0.72rem; color:var(--text-muted);">Presets Milo / Gym:</span>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('3_all','8-10','80%','75s')">3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_3','8-10','80%','90s')">4/3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','10-12','75%','60s')">4 x 10-12</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','6','82.5%','2m')">4 x 6</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('5_4','5','85%','2.5m')">5 x 5</button>
          </div>
        </div>

        <div class="gen-grid" style="margin-bottom:0;">
          <div class="form-group">
            <label>Series en Bloque Principal (Fuerza)</label>
            <select class="input-full" onchange="genConfig.mainSetsScheme=this.value; renderGeneratorUI();">
              <option value="3_all" ${genConfig.mainSetsScheme === "3_all" ? "selected" : ""}>3 Series en todos los ejercicios (3x)</option>
              <option value="4_3" ${genConfig.mainSetsScheme === "4_3" ? "selected" : ""}>4 Series en Básicos (1°-2°) y 3 en Secundarios (3°-4°)</option>
              <option value="4_all" ${genConfig.mainSetsScheme === "4_all" ? "selected" : ""}>4 Series en todos los ejercicios (4x)</option>
              <option value="5_4" ${genConfig.mainSetsScheme === "5_4" ? "selected" : ""}>5 Series en Básicos y 4 en Secundarios (5x / 4x)</option>
            </select>
          </div>

          <div class="form-group">
            <label>Series en Entrada en Calor y Zona Media</label>
            <select class="input-full" onchange="genConfig.warmCoreSetsScheme=this.value; renderGeneratorUI();">
              <option value="2_2" ${genConfig.warmCoreSetsScheme === "2_2" ? "selected" : ""}>2 Series Entrada en Calor / 2 Series Zona Media</option>
              <option value="2_3" ${genConfig.warmCoreSetsScheme === "2_3" ? "selected" : ""}>2 Series Entrada en Calor / 3 Series Zona Media</option>
              <option value="1_2" ${genConfig.warmCoreSetsScheme === "1_2" ? "selected" : ""}>1 Serie Entrada en Calor / 2 Series Zona Media</option>
            </select>
          </div>

          <div class="form-group">
            <label>Repeticiones (Bloque Principal)</label>
            <input type="text" class="input-full" value="${escapeHtml(genConfig.customReps)}" oninput="genConfig.customReps=this.value" placeholder="Ej: 8-10 o 12-10-8-6">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div class="form-group">
              <label>Intensidad / %</label>
              <input type="text" class="input-full" value="${escapeHtml(genConfig.customRpe)}" oninput="genConfig.customRpe=this.value" placeholder="Ej: 80%">
            </div>
            <div class="form-group">
              <label>Pausa</label>
              <input type="text" class="input-full" value="${escapeHtml(genConfig.customRest)}" oninput="genConfig.customRest=this.value" placeholder="Ej: 90s">
            </div>
          </div>
        </div>
      </div>

      <div class="gen-method-info">
        <div style="margin-bottom:4px;"><strong style="color:var(--text-main);">${escapeHtml(methodObj.name)}:</strong> ${escapeHtml(methodObj.desc)}</div>
        <div style="color:var(--accent); font-size:0.76rem;">
          <strong>Estructura Activa (${blueprint.splitLabel}):</strong>
          ${blueprint.isFullBody
            ? "Abre cada sesion con ejercicios Base Poliarticulares (Sentadilla, Peso Muerto, Press, Dominadas/Remo) e Integrados, calculando los kilos desde el 1RM Base del cliente."
            : "Abre cada dia con el ejercicio Base Poliarticular del patron principal (1°), seguido de variantes Unilaterales (2°) y Accesorios/Analiticos (3°-4°)."}
        </div>
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <label style="margin:0;">6. Filtrar por Elementos Disponibles (También aplica al botón "Rotar" de la tabla)</label>
          <div style="display:flex; gap:5px; flex-wrap:wrap;">
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['ALL'])">Todos</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['PESO_CORPORAL'])">Solo Peso Corporal</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['MANCUERNAS','KETTLEBELL','PESO_CORPORAL'])">Mancuernas / KB</button>
            <button class="btn" style="padding:3px 8px; font-size:0.72rem;" onclick="setQuickEquipPreset(['BARRA','PESO_CORPORAL'])">Solo Barra + BW</button>
          </div>
        </div>

        <div class="gen-equip-pills">
          <span class="gen-equip-pill ${genConfig.selectedEquip.includes('ALL') ? 'active' : ''}" onclick="toggleGenEquip('ALL')">
            Todos los Elementos
          </span>
          ${categories.map(cat => `
            <span class="gen-equip-pill ${genConfig.selectedEquip.includes(cat.key) ? 'active' : ''}" onclick="toggleGenEquip('${cat.key}')">
              ${escapeHtml(cat.label)}
            </span>
          `).join("")}
        </div>
      </div>

      <div class="gen-options-row">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includeTransport ? "checked" : ""} onchange="genConfig.includeTransport=this.checked;renderGeneratorUI();">
          Incluir Cargar y Llevar / Transporte (Milo) al cierre del Bloque Principal (3 series)
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includePlio ? "checked" : ""} onchange="genConfig.includePlio=this.checked;renderGeneratorUI();">
          Incluir Pliometria / Potencia en el Bloque 2 (Activacion - 2 series)
        </label>
      </div>

      <div class="gen-preview-bar">
        <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.78rem; align-items:center;">
          <span><strong>Series Semanales por Patrón:</strong></span>
          <span style="color:var(--series-green); font-weight:700;">Rodilla: ${vol.rodilla}</span>
          <span style="color:var(--series-green); font-weight:700;">Cadera: ${vol.cadera}</span>
          <span style="color:var(--series-green); font-weight:700;">Empujes: ${vol.empuje}</span>
          <span style="color:var(--series-green); font-weight:700;">Tracciones: ${vol.traccion}</span>
          <span style="color:var(--text-muted);">| Total Inf: ${vol.totalLower} • Sup: ${vol.totalUpper}</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" style="padding:9px 16px; font-weight:700;" onclick="generateAutomaticRoutine(false)">
            Generar y Editar en Planilla
          </button>
          <button class="btn btn-success" style="padding:9px 16px; font-weight:700;" onclick="generateAutomaticRoutine(true)">
            Generar y Guardar en Excel
          </button>
        </div>
      </div>
    </div>
  `;
}

function getSmartCandidates({ block, pattern, preferredTiers, categories, level }) {
  const allExercises = getLibraryPool();

  let pool = allExercises.filter(ex => {
    const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
    const matchBlock = !block || meta.block === block;
    const matchPattern = !pattern || ex.pattern === pattern;
    return matchBlock && matchPattern && exerciseMatchesSelectedEquip(ex, categories);
  });

  if (pool.length === 0) {
    pool = allExercises.filter(ex => {
      const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
      return (!block || meta.block === block) && (!pattern || ex.pattern === pattern);
    });
  }

  if (pool.length === 0 && pattern) {
    pool = allExercises.filter(ex => ex.pattern === pattern);
  }

  if (level === "iniciado" && pool.length > 1) {
    const beginnerSafe = pool.filter(ex =>
      !/pistol|muscle-up|handstand|snatch|arrancada|bottom-up|bent press|anyhow|zercher|good morning|buenos dias|buenos días/i.test(ex.name)
    );
    if (beginnerSafe.length > 0) pool = beginnerSafe;
  }

  if (preferredTiers && preferredTiers.length > 0 && pool.length > 1) {
    for (const tierTarget of preferredTiers) {
      const matchingTier = pool.filter(ex => {
        const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { tier: "BASE" };
        return meta.tier === tierTarget;
      });
      if (matchingTier.length > 0) {
        return matchingTier;
      }
    }
  }

  return pool;
}

function pickSmartExercise(options, usedIds) {
  const candidates = getSmartCandidates(options);
  const unused = candidates.filter(ex => !usedIds.has(ex.id));
  const finalPool = unused.length > 0 ? unused : candidates;

  if (finalPool.length === 0) {
    const patLabel = PATTERN_CONFIG[options.pattern]?.label || options.pattern || "General";
    return { id: "fallback_" + Math.random(), name: "Ejercicio " + patLabel };
  }

  const chosen = finalPool[Math.floor(Math.random() * finalPool.length)];
  usedIds.add(chosen.id);
  return chosen;
}

function rotateRowExercise(bKey, rIdx) {
  const day = appState.days[appState.activeDayIndex];
  if (!day || !day.blocks[bKey] || !day.blocks[bKey][rIdx]) return;

  const row = day.blocks[bKey][rIdx];
  const categories = getAvailableEquipmentCategories();

  let preferredTiers = null;
  if (bKey === "str") {
    if (rIdx === 0 || rIdx === 1) {
      preferredTiers = ["BASE", "INTEGRADO"];
    } else {
      preferredTiers = ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"];
    }
  }

  const candidates = getSmartCandidates({
    block: bKey,
    pattern: row.pattern,
    preferredTiers,
    categories,
    level: genConfig.level
  });

  if (candidates.length === 0) {
    alert("No hay ejercicios cargados en la Biblioteca para este patrón y momento de clase.");
    return;
  }

  const otherCandidates = candidates.filter(ex => ex.name.toLowerCase() !== String(row.name || "").trim().toLowerCase());
  const pool = otherCandidates.length > 0 ? otherCandidates : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  row.name = chosen.name;

  if (typeof populateRowSuggestedWeights === "function") {
    populateRowSuggestedWeights(row, bKey);
  }

  saveToLocalStorage();
  renderBlocks();
}

async function generateAutomaticRoutine(autoSaveToCloud) {
  const categories = getAvailableEquipmentCategories();
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const { warmSets, coreSets } = getSetsForWarmAndCore();

  const usedIdsWarm = new Set();
  const usedIdsCore = new Set();
  const usedIdsStr  = new Set();
  const usedIdsCool = new Set();

  const generatedDays = blueprint.days.map((dayPlan, dIdx) => {
    // 1. ENTRADA EN CALOR (1 a 2 series según configuración)
    const warmEx1 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm);
    const warmEx2 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm);
    const warmRows = [
      { order: "1", name: warmEx1.name, pattern: "MOVILIDAD", sets: warmSets, reps: "30s-60s", rpe: "SMR / Movilidad", rest: "0s", w1: "", w2: "", w3: "", w4: "" },
      { order: "2", name: warmEx2.name, pattern: "MOVILIDAD", sets: warmSets, reps: "8-10", rpe: "Dinamico", rest: "30s", w1: "", w2: "", w3: "", w4: "" }
    ];

    // 2. ZONA MEDIA Y ACTIVACIÓN (2 series por defecto, o 3 si se eligió 2_3)
    const coreEx1 = pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore);
    const coreEx2 = pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore);
    const coreRows = [
      { order: "A1", name: coreEx1.name, pattern: "CORE", sets: coreSets, reps: "8-12 / 30s", rpe: "Control", rest: "45s", w1: "", w2: "", w3: "", w4: "" },
      { order: "A2", name: coreEx2.name, pattern: "CORE", sets: coreSets, reps: "8-10 c/l", rpe: "Estabilidad", rest: "45s", w1: "", w2: "", w3: "", w4: "" }
    ];

    if (genConfig.includePlio || genConfig.phase === "5") {
      const plioEx = pickSmartExercise({ block: "core", pattern: "PLIOMETRIA", categories, level: genConfig.level }, usedIdsCore);
      coreRows.push({
        order: "A3",
        name: plioEx.name,
        pattern: "PLIOMETRIA",
        sets: 2,
        reps: "5-6",
        rpe: "Explosivo",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    // 3. BLOQUE PRINCIPAL DE FUERZA (Siempre 3, 4 o 5 series según el esquema elegido)
    const strRows = dayPlan.slots.map((slot, sIdx) => {
      let tiersForSlot = slot.preferredTiers;
      if (genConfig.phase === "4" && sIdx < 2) {
        tiersForSlot = ["BASE", "INTEGRADO"];
      } else if (genConfig.phase === "1" && sIdx >= 2) {
        tiersForSlot = ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"];
      }

      const ex = pickSmartExercise({
        block: "str",
        pattern: slot.pattern,
        preferredTiers: tiersForSlot,
        categories,
        level: genConfig.level
      }, usedIdsStr);

      const setsForThisRow = getSetsForMainSlot(sIdx);
      const repsForThisRow = methodObj.formatRepsForSlot(setsForThisRow, genConfig.phase, genConfig.customReps || "8-10");

      let orderLabel = `B${sIdx + 1}`;
      if (genConfig.method === "superserie_pha" || genConfig.phase === "2") {
        const pairChar = String.fromCharCode(66 + Math.floor(sIdx / 2));
        const pairNum = (sIdx % 2) + 1;
        orderLabel = `${pairChar}${pairNum}`;
      }

      return {
        order: orderLabel,
        name: ex.name,
        pattern: slot.pattern,
        sets: setsForThisRow,
        reps: repsForThisRow,
        rpe: genConfig.customRpe || "80%",
        rest: genConfig.customRest || "90s",
        w1: "", w2: "", w3: "", w4: ""
      };
    });

    if (genConfig.includeTransport && (dIdx % 2 === 0)) {
      const carryEx = pickSmartExercise({ block: "str", pattern: "TRANSPORTE", categories, level: genConfig.level }, usedIdsStr);
      strRows.push({
        order: "D",
        name: carryEx.name,
        pattern: "TRANSPORTE",
        sets: 3,
        reps: "20-30m / 30s",
        rpe: "Postura / Pesado",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    // 4. VUELTA A LA CALMA (1 a 2 series suaves)
    const coolEx = pickSmartExercise({ block: "cool", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsCool);
    const coolRows = [
      { order: "1", name: coolEx.name, pattern: "MOVILIDAD", sets: 1, reps: "2-3 min", rpe: "Relajacion / 90-90", rest: "0s", w1: "", w2: "", w3: "", w4: "" }
    ];

    return {
      title: `Dia ${dIdx + 1}`,
      focus: dayPlan.focus,
      blocks: {
        warm: warmRows,
        core: coreRows,
        str: strRows,
        cool: coolRows
      }
    };
  });

  appState.days = generatedDays;
  appState.activeDayIndex = 0;
  appState.meta.splitType = blueprint.splitLabel;
  appState.meta.nasmPhase = genConfig.phase;
  appState.meta.clientGoal = `${methodObj.name.split("(")[0].trim()} - Nivel ${genConfig.level.toUpperCase()}`;

  syncMetaInputs();
  updateNASMAssistant();

  if (typeof applyBaseStrengthToRoutine === "function") {
    applyBaseStrengthToRoutine(true);
  }

  switchCoachMainTab("editor");

  if (autoSaveToCloud && typeof saveRoutineToCloud === "function") {
    await saveRoutineToCloud();
  }
}