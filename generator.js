// =========================================================================
// GENERATOR.JS: MOTOR DE GENERACION AUTOMATICA Y ROTACION POR PATRONES
// =========================================================================

let genConfig = {
  daysCount: 3,
  level: "intermedio",
  phase: "3",
  method: "nucleo",
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
    desc: "Mantiene el peso y las repeticiones constantes en todas las series de trabajo. Ideal para estabilizar la tecnica y acumular tension mecanica.",
    format: (sets, phase) => {
      const p = {
        "1": { reps: "12-15", rpe: "65% (4/2/1)", rest: "60s" },
        "2": { reps: "10-12", rpe: "75% (2/0/2)", rest: "60s" },
        "3": { reps: "8-10",  rpe: "80% (Estable)", rest: "90s" },
        "4": { reps: "4-5",   rpe: "87.5% (Pesado)", rest: "3m" },
        "5": { reps: "5",     rpe: "85% / Explosivo", rest: "2m" }
      }[phase] || { reps: "8-10", rpe: "80%", rest: "90s" };
      return { sets, reps: p.reps, rpe: p.rpe, rest: p.rest };
    }
  },
  piramide_trunca: {
    name: "Piramide Trunca Ascendente (EAC Weightlifting I)",
    desc: "Sube el porcentaje de carga y baja las repeticiones en cada serie, frenando en el porcentaje objetivo del dia sin llegar al fallo maximo.",
    format: (sets, phase) => {
      if (phase === "4" || phase === "5") {
        const repMap = { 2: "5-3", 3: "6-4-2", 4: "6-5-4-3", 5: "6-5-4-3-2" };
        return { sets, reps: repMap[sets] || "6-5-4-3", rpe: "80-92.5%", rest: "3m" };
      }
      const repMap = { 2: "10-8", 3: "12-10-8", 4: "12-10-8-6", 5: "12-10-8-6-6" };
      return { sets, reps: repMap[sets] || "12-10-8-6", rpe: "65-80%", rest: "90s-2m" };
    }
  },
  piramidal_inverso: {
    name: "Piramidal Inverso (Descendente en Carga)",
    desc: "Ubica la serie mas pesada al principio (con el sistema nervioso fresco) y reduce la carga aumentando repeticiones en las series siguientes.",
    format: (sets, phase) => {
      if (phase === "4") {
        const repMap = { 2: "3-5", 3: "3-4-6", 4: "2-4-5-6", 5: "2-3-4-5-6" };
        return { sets, reps: repMap[sets] || "3-4-6", rpe: "90-80%", rest: "3m" };
      }
      const repMap = { 2: "8-10", 3: "6-8-10", 4: "6-8-10-12", 5: "6-8-8-10-12" };
      return { sets, reps: repMap[sets] || "6-8-10-12", rpe: "82.5-70%", rest: "2m" };
    }
  },
  trepada_rechazo: {
    name: "Trepada y Rechazo (Back-Off Sets - EAC)",
    desc: "Sube hasta el peso objetivo del dia y luego aplica series de rechazo (-10% de peso) para sumar volumen efectivo con tecnica limpia.",
    format: (sets, phase) => {
      if (phase === "4") {
        return { sets, reps: sets >= 4 ? "5-3-2 + 1x5" : "5-3 + 1x5", rpe: "90% / -10%", rest: "3m" };
      }
      return { sets, reps: sets >= 4 ? "10-8-6 + 1x10" : "10-8 + 1x10", rpe: "82.5% / -10%", rest: "2m" };
    }
  },
  escalera: {
    name: "Sistema Escalonado / Escalera (Jeronimo Milo)",
    desc: "Acumula volumen de calidad mediante escalones progresivos de repeticiones (ej. 1-2-3 o 2-3-5) manteniendo velocidad de ejecucion.",
    format: (sets, phase) => {
      if (phase === "4" || phase === "5") {
        return { sets, reps: "Esc. 1-2-3 (6 reps)", rpe: "82.5% (5RM)", rest: "2m" };
      }
      return { sets, reps: "Esc. 2-3-5 (10 reps)", rpe: "77.5% (8RM)", rest: "90s" };
    }
  },
  oleaje: {
    name: "Sistema en Oleaje / Ondulante (EAC / Milo)",
    desc: "Alterna olas de intensidad y repeticiones dentro de la misma sesion aprovechando la potenciacion post-tetanica.",
    format: (sets, phase) => {
      if (phase === "4") {
        return { sets: Math.max(4, sets), reps: "5-3-5-3", rpe: "82-90%", rest: "2.5m" };
      }
      return { sets: Math.max(4, sets), reps: "10-6-10-6", rpe: "72-82%", rest: "90s" };
    }
  },
  superserie_pha: {
    name: "Superseries Agonista-Antagonista / PHA (NASM OPT)",
    desc: "Agrupa patrones opuestos en biseries (B1/B2, C1/C2) optimizando la densidad de la clase y la accion cardiaca periferica.",
    format: (sets, phase) => {
      const reps = phase === "1" ? "12-15" : (phase === "4" ? "5" : "8-10");
      const rpe  = phase === "1" ? "65%" : (phase === "4" ? "85%" : "77.5%");
      return { sets, reps, rpe, rest: "60s" };
    }
  }
};

const SPLIT_BLUEPRINTS = {
  2: {
    splitLabel: "Full Body 2 Dias",
    days: [
      { focus: "Full Body A: Rodilla + Cadera + Empuje H + Traccion H", patterns: ["RODILLA", "CADERA", "EMPUJE_H", "TRACCION_H"] },
      { focus: "Full Body B: Cadera + Rodilla + Empuje V + Traccion V", patterns: ["CADERA", "RODILLA", "EMPUJE_V", "TRACCION_V"] }
    ]
  },
  3: {
    splitLabel: "Full Body 3 Dias",
    days: [
      { focus: "Full Body A: Enfasis Rodilla + Empuje H + Traccion H", patterns: ["RODILLA", "CADERA", "EMPUJE_H", "TRACCION_H"] },
      { focus: "Full Body B: Enfasis Cadera + Empuje V + Traccion V", patterns: ["CADERA", "RODILLA", "EMPUJE_V", "TRACCION_V"] },
      { focus: "Full Body C: Unilateral / Simetrico + Cadenas Cruzadas", patterns: ["RODILLA", "CADERA", "EMPUJE_H", "TRACCION_V"] }
    ]
  },
  4: {
    splitLabel: "Split por Patrones 4 Dias",
    days: [
      { focus: "Dia 1 — Torso A: Empuje Horizontal + Traccion Horizontal + Vertical", patterns: ["EMPUJE_H", "TRACCION_H", "EMPUJE_V", "TRACCION_V"] },
      { focus: "Dia 2 — Pierna A: Enfasis Dominante de Rodilla + Bisagra", patterns: ["RODILLA", "CADERA", "RODILLA"] },
      { focus: "Dia 3 — Torso B: Empuje Vertical + Traccion Vertical + Horizontal", patterns: ["EMPUJE_V", "TRACCION_V", "EMPUJE_H", "TRACCION_H"] },
      { focus: "Dia 4 — Pierna B: Enfasis Dominante de Cadera + Rodilla Unilateral", patterns: ["CADERA", "RODILLA", "CADERA"] }
    ]
  },
  5: {
    splitLabel: "Split por Patrones 5 Dias",
    days: [
      { focus: "Dia 1 — Empuje Horizontal + Traccion Horizontal", patterns: ["EMPUJE_H", "TRACCION_H", "EMPUJE_V"] },
      { focus: "Dia 2 — Dominante de Rodilla + Bisagra Complementaria", patterns: ["RODILLA", "CADERA", "RODILLA"] },
      { focus: "Dia 3 — Empuje Vertical + Traccion Vertical", patterns: ["EMPUJE_V", "TRACCION_V", "TRACCION_H"] },
      { focus: "Dia 4 — Dominante de Cadera + Rodilla Unilateral", patterns: ["CADERA", "RODILLA", "CADERA"] },
      { focus: "Dia 5 — Full Body Integrado / Patrones Complementarios", patterns: ["RODILLA", "CADERA", "EMPUJE_H", "TRACCION_V"] }
    ]
  }
};

window.addEventListener("DOMContentLoaded", () => {
  renderGeneratorUI();
});

function switchCoachMainTab(tab) {
  const btnEditor = document.getElementById("btn-mode-editor");
  const btnGen = document.getElementById("btn-mode-generator");
  const genView = document.getElementById("coach-generator-view");
  const editorView = document.getElementById("coach-editor-view");

  if (!btnEditor || !btnGen || !genView || !editorView) return;

  if (tab === "generator") {
    btnGen.classList.add("active");
    btnEditor.classList.remove("active");
    genView.classList.remove("section-collapsed");
    editorView.classList.add("section-collapsed");
    renderGeneratorUI();
  } else {
    btnEditor.classList.add("active");
    btnGen.classList.remove("active");
    genView.classList.add("section-collapsed");
    editorView.classList.remove("section-collapsed");
    renderAll();
  }
}

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

function calculateTargetSeriesPerPattern(daysCount, level) {
  const targetWeeklyMacro = level === "iniciado" ? 10 : (level === "intermedio" ? 14 : 17);
  const blueprint = SPLIT_BLUEPRINTS[daysCount] || SPLIT_BLUEPRINTS[3];

  let lowerSlots = 0;
  let upperSlots = 0;
  blueprint.days.forEach(d => {
    d.patterns.forEach(p => {
      if (p === "RODILLA" || p === "CADERA") lowerSlots++;
      else upperSlots++;
    });
  });

  const distribute = (totalTarget, slotsCount) => {
    const base = Math.max(2, Math.floor(totalTarget / slotsCount));
    const rem = totalTarget - (base * slotsCount);
    return Array.from({ length: slotsCount }, (_, i) => {
      const val = i < rem ? base + 1 : base;
      return Math.min(4, Math.max(2, val));
    });
  };

  return {
    lowerSeriesQueue: distribute(targetWeeklyMacro, lowerSlots),
    upperSeriesQueue: distribute(targetWeeklyMacro, upperSlots)
  };
}

function renderGeneratorUI() {
  const container = document.getElementById("coach-generator-view");
  if (!container) return;

  const categories = getAvailableEquipmentCategories();
  const exercisesPool = getLibraryPool();
  const matchingExercises = exercisesPool.filter(ex => exerciseMatchesSelectedEquip(ex, categories));
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const volPreview = calculateTargetSeriesPerPattern(genConfig.daysCount, genConfig.level);

  const totalLower = volPreview.lowerSeriesQueue.reduce((a, b) => a + b, 0);
  const totalUpper = volPreview.upperSeriesQueue.reduce((a, b) => a + b, 0);

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>Generador Automatico de Rutinas por Patrones</span>
        <span class="tag-pattern">${matchingExercises.length} ejercicios compatibles</span>
      </div>

      <div class="gen-grid">
        <div class="form-group">
          <label>1. Frecuencia Semanal (2 a 5 Dias)</label>
          <select class="input-full" onchange="genConfig.daysCount=parseInt(this.value);renderGeneratorUI();">
            <option value="2" ${genConfig.daysCount === 2 ? "selected" : ""}>2 Dias / Semana (Full Body A/B)</option>
            <option value="3" ${genConfig.daysCount === 3 ? "selected" : ""}>3 Dias / Semana (Full Body Patrones A/B/C)</option>
            <option value="4" ${genConfig.daysCount === 4 ? "selected" : ""}>4 Dias / Semana (Split Torso / Pierna por Patrones)</option>
            <option value="5" ${genConfig.daysCount === 5 ? "selected" : ""}>5 Dias / Semana (Split por Patrones 5 Dias)</option>
          </select>
        </div>

        <div class="form-group">
          <label>2. Nivel del Alumno (Control de Volumen Semanal)</label>
          <select class="input-full" onchange="genConfig.level=this.value;renderGeneratorUI();">
            <option value="iniciado" ${genConfig.level === "iniciado" ? "selected" : ""}>Iniciado / Principiante (10-12 series/sem)</option>
            <option value="intermedio" ${genConfig.level === "intermedio" ? "selected" : ""}>Intermedio — Rango Ideal (12-15 series/sem)</option>
            <option value="avanzado" ${genConfig.level === "avanzado" ? "selected" : ""}>Avanzado (16-18 series/sem - Tope seguro &lt;20)</option>
          </select>
        </div>

        <div class="form-group">
          <label>3. Fase del Modelo OPT (NASM)</label>
          <select class="input-full" onchange="genConfig.phase=this.value;renderGeneratorUI();">
            <option value="1" ${genConfig.phase === "1" ? "selected" : ""}>Fase 1: Estabilizacion</option>
            <option value="2" ${genConfig.phase === "2" ? "selected" : ""}>Fase 2: Fuerza Resistencia</option>
            <option value="3" ${genConfig.phase === "3" ? "selected" : ""}>Fase 3: Hipertrofia</option>
            <option value="4" ${genConfig.phase === "4" ? "selected" : ""}>Fase 4: Fuerza Maxima</option>
            <option value="5" ${genConfig.phase === "5" ? "selected" : ""}>Fase 5: Potencia</option>
          </select>
        </div>

        <div class="form-group">
          <label>4. Metodo de Entrenamiento (EAC / Milo / NASM)</label>
          <select class="input-full" onchange="genConfig.method=this.value;renderGeneratorUI();">
            ${Object.entries(TRAINING_METHODS).map(([k, m]) =>
              `<option value="${k}" ${genConfig.method === k ? "selected" : ""}>${escapeHtml(m.name)}</option>`
            ).join("")}
          </select>
        </div>
      </div>

      <div class="gen-method-info">
        <strong style="color:var(--text-main);">${escapeHtml(methodObj.name)}:</strong> ${escapeHtml(methodObj.desc)}
      </div>

      <div class="form-group">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
          <label style="margin:0;">5. Filtrar por Elementos Disponibles (También aplica al botón "Rotar" de la tabla)</label>
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
          Incluir Cargar y Llevar / Transporte (Milo) en el Bloque de Fuerza
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includePlio ? "checked" : ""} onchange="genConfig.includePlio=this.checked;renderGeneratorUI();">
          Incluir Pliometria / Potencia en el Bloque 2 (Activacion)
        </label>
      </div>

      <div class="gen-preview-bar">
        <div style="display:flex; gap:14px; flex-wrap:wrap; font-size:0.8rem;">
          <span><strong>Volumen Semanal Proyectado:</strong></span>
          <span style="color:var(--series-green); font-weight:700;">Tren Inferior: ${totalLower} series/sem</span>
          <span style="color:var(--series-green); font-weight:700;">Tren Superior: ${totalUpper} series/sem</span>
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

function getCandidatesForPattern(pattern, categories, level) {
  const allExercises = getLibraryPool();
  let candidates = allExercises.filter(ex =>
    ex.pattern === pattern && exerciseMatchesSelectedEquip(ex, categories)
  );

  if (candidates.length === 0) {
    candidates = allExercises.filter(ex => ex.pattern === pattern);
  }

  if (level === "iniciado" && candidates.length > 1) {
    const beginnerSafe = candidates.filter(ex =>
      !/pistol|muscle-up|handstand|snatch|arrancada|bottom-up|bent press|anyhow|zercher/i.test(ex.name)
    );
    if (beginnerSafe.length > 0) candidates = beginnerSafe;
  }

  return candidates;
}

function pickExerciseFromLibrary(pattern, usedIds, categories, level) {
  const candidates = getCandidatesForPattern(pattern, categories, level);
  const unused = candidates.filter(ex => !usedIds.has(ex.id));
  const pool = unused.length > 0 ? unused : candidates;

  if (pool.length === 0) {
    return { id: "fallback_" + pattern, name: "Ejercicio " + (PATTERN_CONFIG[pattern]?.label || pattern) };
  }

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  usedIds.add(chosen.id);
  return chosen;
}

// Funcion del boton "Rotar" en cada fila de la tabla del Editor
function rotateRowExercise(bKey, rIdx) {
  const day = appState.days[appState.activeDayIndex];
  if (!day || !day.blocks[bKey] || !day.blocks[bKey][rIdx]) return;

  const row = day.blocks[bKey][rIdx];
  const categories = getAvailableEquipmentCategories();
  const candidates = getCandidatesForPattern(row.pattern, categories, genConfig.level);

  if (candidates.length === 0) {
    alert("No hay ejercicios cargados en la Biblioteca para este patrón.");
    return;
  }

  const otherCandidates = candidates.filter(ex => ex.name.toLowerCase() !== String(row.name || "").trim().toLowerCase());
  const pool = otherCandidates.length > 0 ? otherCandidates : candidates;
  const chosen = pool[Math.floor(Math.random() * pool.length)];

  row.name = chosen.name;
  saveToLocalStorage();
  renderBlocks();
}

async function generateAutomaticRoutine(autoSaveToCloud) {
  const categories = getAvailableEquipmentCategories();
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const volQueues = calculateTargetSeriesPerPattern(genConfig.daysCount, genConfig.level);

  let lowerIdx = 0;
  let upperIdx = 0;
  const usedIds = new Set();

  const generatedDays = blueprint.days.map((dayPlan, dIdx) => {
    const warmEx1 = pickExerciseFromLibrary("MOVILIDAD", usedIds, categories, genConfig.level);
    const warmEx2 = pickExerciseFromLibrary("MOVILIDAD", usedIds, categories, genConfig.level);
    const warmRows = [
      { order: "1", name: warmEx1.name, pattern: "MOVILIDAD", sets: 1, reps: "30s-60s", rpe: "Suave", rest: "0s", w1: "", w2: "", w3: "", w4: "" },
      { order: "2", name: warmEx2.name, pattern: "MOVILIDAD", sets: 2, reps: "10-12", rpe: "Fluido", rest: "30s", w1: "", w2: "", w3: "", w4: "" }
    ];

    const coreEx1 = pickExerciseFromLibrary("CORE", usedIds, categories, genConfig.level);
    const coreEx2 = pickExerciseFromLibrary("CORE", usedIds, categories, genConfig.level);
    const coreSets = genConfig.level === "iniciado" ? 2 : 3;
    const coreRows = [
      { order: "A1", name: coreEx1.name, pattern: "CORE", sets: coreSets, reps: "8-12 / 30s", rpe: "Control", rest: "45s", w1: "", w2: "", w3: "", w4: "" },
      { order: "A2", name: coreEx2.name, pattern: "CORE", sets: 2, reps: "8-10 c/l", rpe: "Control", rest: "45s", w1: "", w2: "", w3: "", w4: "" }
    ];

    if (genConfig.includePlio || genConfig.phase === "5") {
      const plioEx = pickExerciseFromLibrary("PLIOMETRIA", usedIds, categories, genConfig.level);
      coreRows.push({
        order: "A3",
        name: plioEx.name,
        pattern: "PLIOMETRIA",
        sets: 3,
        reps: "5-6",
        rpe: "Explosivo",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const strRows = dayPlan.patterns.map((pat, pIdx) => {
      const ex = pickExerciseFromLibrary(pat, usedIds, categories, genConfig.level);
      const isLower = (pat === "RODILLA" || pat === "CADERA");
      const rawSets = isLower
        ? (volQueues.lowerSeriesQueue[lowerIdx++] || 3)
        : (volQueues.upperSeriesQueue[upperIdx++] || 3);

      const formatted = methodObj.format(rawSets, genConfig.phase);

      let orderLabel = `B${pIdx + 1}`;
      if (genConfig.method === "superserie_pha" || genConfig.phase === "2") {
        const pairChar = String.fromCharCode(66 + Math.floor(pIdx / 2));
        const pairNum = (pIdx % 2) + 1;
        orderLabel = `${pairChar}${pairNum}`;
      }

      return {
        order: orderLabel,
        name: ex.name,
        pattern: pat,
        sets: formatted.sets,
        reps: formatted.reps,
        rpe: formatted.rpe,
        rest: formatted.rest,
        w1: "", w2: "", w3: "", w4: ""
      };
    });

    if (genConfig.includeTransport && (dIdx % 2 === 0)) {
      const carryEx = pickExerciseFromLibrary("TRANSPORTE", usedIds, categories, genConfig.level);
      strRows.push({
        order: "D",
        name: carryEx.name,
        pattern: "TRANSPORTE",
        sets: 2,
        reps: "20-30m / 30s",
        rpe: "Pesado",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const coolEx = pickExerciseFromLibrary("MOVILIDAD", new Set(), categories, genConfig.level);
    const coolRows = [
      { order: "1", name: coolEx.name, pattern: "MOVILIDAD", sets: 1, reps: "30s-2m", rpe: "Relajacion", rest: "0s", w1: "", w2: "", w3: "", w4: "" }
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
  switchCoachMainTab("editor");

  if (autoSaveToCloud && typeof saveRoutineToCloud === "function") {
    await saveRoutineToCloud();
  }
}