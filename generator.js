let genConfig = {
  daysCount: 3,
  level: "intermedio",
  phase: "3",
  method: "nucleo",
  mainSetsScheme: "4_3",
  warmCoreSetsScheme: "2_2",
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
    desc: "Mantiene el peso y las repeticiones estables en todas las series de trabajo (3 a 4 series).",
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
    desc: "Sube el porcentaje de carga y baja las repeticiones en cada serie sin llegar al fallo maximo.",
    getDefaults: (phase) => (phase === "4" || phase === "5")
      ? { reps: "6-5-4-3", rpe: "80-90%", rest: "2.5m" }
      : { reps: "12-10-8-6", rpe: "70-82.5%", rest: "90s" },
    formatRepsForSlot: (sets, phase) => (phase === "4" || phase === "5")
      ? (sets === 3 ? "6-4-2" : (sets >= 5 ? "6-5-4-3-2" : "6-5-4-3"))
      : (sets === 3 ? "12-10-8" : (sets >= 5 ? "12-10-8-6-6" : "12-10-8-6"))
  },
  piramidal_inverso: {
    name: "Piramidal Inverso (Descendente en Carga)",
    desc: "Ubica la serie mas pesada al principio y reduce la carga aumentando repeticiones.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "3-4-5-6", rpe: "90-80%", rest: "3m" }
      : { reps: "6-8-10-12", rpe: "82.5-72%", rest: "90s-2m" },
    formatRepsForSlot: (sets, phase) => phase === "4"
      ? (sets === 3 ? "3-4-6" : "3-4-5-6")
      : (sets === 3 ? "6-8-10" : "6-8-10-12")
  },
  trepada_rechazo: {
    name: "Trepada y Rechazo (Back-Off Sets - EAC)",
    desc: "Sube hasta el peso objetivo del dia y aplica series de rechazo (-10%) para sumar volumen.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "5-3-2 + 1x5", rpe: "90% / -10%", rest: "3m" }
      : { reps: "10-8-6 + 1x10", rpe: "82.5% / -10%", rest: "2m" },
    formatRepsForSlot: (sets, phase) => phase === "4"
      ? (sets === 3 ? "5-3 + 1x5" : "5-3-2 + 1x5")
      : (sets === 3 ? "10-8 + 1x10" : "10-8-6 + 1x10")
  },
  escalera: {
    name: "Sistema Escalonado / Escalera (Jeronimo Milo)",
    desc: "Acumula volumen de calidad mediante escalones progresivos manteniendo velocidad.",
    getDefaults: (phase) => (phase === "4" || phase === "5")
      ? { reps: "Esc. 1-2-3 (6 reps)", rpe: "82.5% (5RM)", rest: "2m" }
      : { reps: "Esc. 2-3-5 (10 reps)", rpe: "77.5% (8RM)", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  oleaje: {
    name: "Sistema en Oleaje / Ondulante (EAC / Milo)",
    desc: "Alterna olas de intensidad y repeticiones aprovechando la potenciacion post-tetanica.",
    getDefaults: (phase) => phase === "4"
      ? { reps: "5-3-5-3", rpe: "82-90%", rest: "2.5m" }
      : { reps: "10-6-10-6", rpe: "75-82.5%", rest: "90s" },
    formatRepsForSlot: (sets, phase, defaultReps) => defaultReps
  },
  superserie_pha: {
    name: "Superseries Agonista-Antagonista / PHA (NASM OPT)",
    desc: "Agrupa patrones opuestos en biseries optimizando la densidad de la clase.",
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
      { focus: "Full Body A: Base Rodilla + Empuje H + Bisagra + Traccion H", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["INTEGRADO", "UNILATERAL", "BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL", "INTEGRADO"] }] },
      { focus: "Full Body B: Base Cadera + Empuje V + Rodilla + Traccion V", slots: [{ pattern: "CADERA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["INTEGRADO", "UNILATERAL", "BASE"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL"] }] }
    ]
  },
  3: {
    splitLabel: "Full Body 3 Dias",
    isFullBody: true,
    days: [
      { focus: "Full Body A: Sentadilla Base + Press H Base + Bisagra Unilateral + Traccion H", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_H", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE", "UNILATERAL"] }] },
      { focus: "Full Body B: Peso Muerto Base + Empuje V Base + Rodilla Unilateral + Traccion V", slots: [{ pattern: "CADERA", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "EMPUJE_V", preferredTiers: ["BASE", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "UNILATERAL"] }] },
      { focus: "Full Body C: Poliarticular Integrado + Empuje / Traccion + Cadena Posterior", slots: [{ pattern: "RODILLA", preferredTiers: ["INTEGRADO", "BASE", "UNILATERAL"] }, { pattern: "CADERA", preferredTiers: ["INTEGRADO", "BASE", "UNILATERAL"] }, { pattern: "EMPUJE_H", preferredTiers: ["UNILATERAL", "BASE", "INTEGRADO"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "INTEGRADO", "BASE"] }] }
    ]
  },
  4: {
    splitLabel: "Split por Patrones 4 Dias",
    isFullBody: false,
    days: [
      { focus: "Dia 1 — Torso A: Press H Base + Remo Base + Empuje V + Traccion V", slots: [{ pattern: "EMPUJE_H", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["UNILATERAL", "BASE", "ANALITICO"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE", "ANALITICO"] }] },
      { focus: "Dia 2 — Pierna A (Rodilla): Sentadilla Base + Bisagra + Unilateral + Analitico", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO"] }, { pattern: "CADERA", preferredTiers: ["ANALITICO", "UNILATERAL"] }] },
      { focus: "Dia 3 — Torso B: Press V Base + Dominadas/Jalon + Empuje H + Traccion Escapular", slots: [{ pattern: "EMPUJE_V", preferredTiers: ["BASE"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_H", preferredTiers: ["UNILATERAL", "BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["ANALITICO", "UNILATERAL"] }] },
      { focus: "Dia 4 — Pierna B (Cadera): Peso Muerto Base + Rodilla Unilateral + Bisagra + Analitico", slots: [{ pattern: "CADERA", preferredTiers: ["BASE"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "BASE"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "INTEGRADO"] }, { pattern: "RODILLA", preferredTiers: ["ANALITICO", "UNILATERAL"] }] }
    ]
  },
  5: {
    splitLabel: "Split por Patrones 5 Dias",
    isFullBody: false,
    days: [
      { focus: "Dia 1 — Empuje H Base + Traccion H Base + Accesorios", slots: [{ pattern: "EMPUJE_H", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["BASE"] }, { pattern: "EMPUJE_H", preferredTiers: ["UNILATERAL", "ANALITICO"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "ANALITICO"] }] },
      { focus: "Dia 2 — Rodilla Base + Bisagra + Rodilla Unilateral", slots: [{ pattern: "RODILLA", preferredTiers: ["BASE"] }, { pattern: "CADERA", preferredTiers: ["BASE", "UNILATERAL"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "INTEGRADO"] }] },
      { focus: "Dia 3 — Empuje V Base + Traccion V Base + Escapular", slots: [{ pattern: "EMPUJE_V", preferredTiers: ["BASE"] }, { pattern: "TRACCION_V", preferredTiers: ["BASE"] }, { pattern: "TRACCION_H", preferredTiers: ["UNILATERAL", "ANALITICO"] }, { pattern: "TRACCION_V", preferredTiers: ["ANALITICO", "BASE"] }] },
      { focus: "Dia 4 — Cadera Base + Rodilla Unilateral + Cadena Posterior", slots: [{ pattern: "CADERA", preferredTiers: ["BASE"] }, { pattern: "RODILLA", preferredTiers: ["UNILATERAL", "BASE"] }, { pattern: "CADERA", preferredTiers: ["UNILATERAL", "ANALITICO"] }] },
      { focus: "Dia 5 — Full Body Integrado", slots: [{ pattern: "RODILLA", preferredTiers: ["INTEGRADO", "BASE"] }, { pattern: "CADERA", preferredTiers: ["INTEGRADO", "BASE"] }, { pattern: "EMPUJE_V", preferredTiers: ["INTEGRADO", "UNILATERAL"] }, { pattern: "TRACCION_H", preferredTiers: ["INTEGRADO", "UNILATERAL"] }] }
    ]
  }
};

window.addEventListener("DOMContentLoaded", () => {
  syncGenPrescriptionFromPhaseAndMethod();
  renderGeneratorUI();
});

function getLibraryPool() {
  if (appState.exercises?.length > 0) return appState.exercises;
  return typeof DEFAULT_EXERCISES !== "undefined" ? DEFAULT_EXERCISES : [];
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

function getSetsForMainSlot(slotIdx) {
  const isPrimary = slotIdx === 0 || slotIdx === 1;
  if (genConfig.mainSetsScheme === "3_all") return 3;
  if (genConfig.mainSetsScheme === "4_all") return 4;
  if (genConfig.mainSetsScheme === "5_4") return isPrimary ? 5 : 4;
  return isPrimary ? 4 : 3;
}

function getSetsForWarmAndCore() {
  if (genConfig.warmCoreSetsScheme === "1_2") return { warmSets: 1, coreSets: 2 };
  if (genConfig.warmCoreSetsScheme === "2_3") return { warmSets: 2, coreSets: 3 };
  return { warmSets: 2, coreSets: 2 };
}

function syncGenPrescriptionFromPhaseAndMethod() {
  const def = (TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo).getDefaults(genConfig.phase);
  genConfig.customReps = def.reps;
  genConfig.customRpe = def.rpe;
  genConfig.customRest = def.rest;
}

function onGenLevelChange(newLevel) {
  genConfig.level = newLevel;
  genConfig.mainSetsScheme = newLevel === "iniciado" ? "3_all" : (newLevel === "avanzado" ? "4_all" : "4_3");
  genConfig.warmCoreSetsScheme = newLevel === "avanzado" ? "2_3" : "2_2";
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
    return cat ? cat.keywords.some(kw => eqLower.includes(kw)) : false;
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
  return { rodilla, cadera, empuje, traccion, totalLower: rodilla + cadera, totalUpper: empuje + traccion };
}

function renderGeneratorUI() {
  const container = document.getElementById("coach-generator-view");
  if (!container) return;

  const categories = getAvailableEquipmentCategories();
  const matchingExercises = getLibraryPool().filter(ex => exerciseMatchesSelectedEquip(ex, categories));
  const methodObj = TRAINING_METHODS[genConfig.method] || TRAINING_METHODS.nucleo;
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];
  const vol = calculateProjectedWeeklyVolume();

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>Generador Inteligente por Bloques</span>
        <span class="tag-pattern">${matchingExercises.length} ejercicios compatibles</span>
      </div>

      <div class="gen-grid">
        <div class="form-group">
          <label>1. Frecuencia Semanal (2 a 5 Dias)</label>
          <select class="input-full" onchange="genConfig.daysCount=parseInt(this.value);renderGeneratorUI();">
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
            <option value="avanzado" ${genConfig.level === "avanzado" ? "selected" : ""}>Avanzado (4 series)</option>
          </select>
        </div>

        <div class="form-group">
          <label>3. Fase OPT (NASM)</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('phase', this.value)">
            <option value="1" ${genConfig.phase === "1" ? "selected" : ""}>Fase 1: Estabilizacion (60%)</option>
            <option value="2" ${genConfig.phase === "2" ? "selected" : ""}>Fase 2: Fuerza Resistencia (75%)</option>
            <option value="3" ${genConfig.phase === "3" ? "selected" : ""}>Fase 3: Hipertrofia (80%)</option>
            <option value="4" ${genConfig.phase === "4" ? "selected" : ""}>Fase 4: Fuerza Maxima (87.5%)</option>
            <option value="5" ${genConfig.phase === "5" ? "selected" : ""}>Fase 5: Potencia (85% / Vel)</option>
          </select>
        </div>

        <div class="form-group">
          <label>4. Metodo de Entrenamiento</label>
          <select class="input-full" onchange="onGenPhaseOrMethodChange('method', this.value)">
            ${Object.entries(TRAINING_METHODS).map(([k, m]) =>
              `<option value="${k}" ${genConfig.method === k ? "selected" : ""}>${escapeHtml(m.name)}</option>`
            ).join("")}
          </select>
        </div>
      </div>

      <div style="background:rgba(56,189,248,0.05); border:1px solid var(--border); border-radius:6px; padding:11px 13px; margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:9px;">
          <strong style="font-size:0.78rem; color:var(--accent); text-transform:uppercase;">5. Control de Series y Repeticiones</strong>
          <div style="display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
            <span style="font-size:0.72rem; color:var(--text-muted);">Presets:</span>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('3_all','8-10','80%','75s')">3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_3','8-10','80%','90s')">4/3 x 8-10</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','10-12','75%','60s')">4 x 10-12</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('4_all','6','82.5%','2m')">4 x 6</button>
            <button type="button" class="btn" style="padding:3px 8px; font-size:0.71rem;" onclick="applyQuickMiloPrescription('5_4','5','85%','2.5m')">5 x 5</button>
          </div>
        </div>

        <div class="gen-grid" style="margin-bottom:0;">
          <div class="form-group">
            <label>Series Bloque Principal</label>
            <select class="input-full" onchange="genConfig.mainSetsScheme=this.value; renderGeneratorUI();">
              <option value="3_all" ${genConfig.mainSetsScheme === "3_all" ? "selected" : ""}>3 Series en todos (3x)</option>
              <option value="4_3" ${genConfig.mainSetsScheme === "4_3" ? "selected" : ""}>4 en Básicos y 3 en Secundarios</option>
              <option value="4_all" ${genConfig.mainSetsScheme === "4_all" ? "selected" : ""}>4 Series en todos (4x)</option>
              <option value="5_4" ${genConfig.mainSetsScheme === "5_4" ? "selected" : ""}>5 en Básicos y 4 en Secundarios</option>
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
            <label>Repeticiones</label>
            <input type="text" class="input-full" value="${escapeHtml(genConfig.customReps)}" oninput="genConfig.customReps=this.value">
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div class="form-group">
              <label>Intensidad / %</label>
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
          Incluir Cargar y Llevar / Transporte (3 series)
        </label>
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
          <input type="checkbox" ${genConfig.includePlio ? "checked" : ""} onchange="genConfig.includePlio=this.checked;renderGeneratorUI();">
          Incluir Pliometria en Bloque 2 (2 series)
        </label>
      </div>

      <div class="gen-preview-bar">
        <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:0.78rem; align-items:center;">
          <span><strong>Series Semanales:</strong></span>
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

function getSmartCandidates({ block, pattern, preferredTiers, categories, level }) {
  const allExercises = getLibraryPool();

  let pool = allExercises.filter(ex => {
    const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
    return (!block || meta.block === block) && (!pattern || ex.pattern === pattern) && exerciseMatchesSelectedEquip(ex, categories);
  });

  if (pool.length === 0) {
    pool = allExercises.filter(ex => {
      const meta = typeof getExerciseMeta === "function" ? getExerciseMeta(ex) : { block: "str", tier: "BASE" };
      return (!block || meta.block === block) && (!pattern || ex.pattern === pattern);
    });
  }

  if (pool.length === 0 && pattern) pool = allExercises.filter(ex => ex.pattern === pattern);

  if (level === "iniciado" && pool.length > 1) {
    const safe = pool.filter(ex => !/pistol|muscle-up|handstand|snatch|arrancada|bottom-up|bent press|anyhow|zercher|good morning|buenos dias|buenos días/i.test(ex.name));
    if (safe.length > 0) pool = safe;
  }

  if (preferredTiers?.length > 0 && pool.length > 1) {
    for (const tierTarget of preferredTiers) {
      const matchingTier = pool.filter(ex => (typeof getExerciseMeta === "function" ? getExerciseMeta(ex).tier : "BASE") === tierTarget);
      if (matchingTier.length > 0) return matchingTier;
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
  const row = appState.days[appState.activeDayIndex]?.blocks[bKey]?.[rIdx];
  if (!row) return;

  const preferredTiers = bKey === "str"
    ? (rIdx <= 1 ? ["BASE", "INTEGRADO"] : ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"])
    : null;

  const candidates = getSmartCandidates({
    block: bKey,
    pattern: row.pattern,
    preferredTiers,
    categories: getAvailableEquipmentCategories(),
    level: genConfig.level
  });

  if (candidates.length === 0) return alert("No hay ejercicios cargados en la Biblioteca para este patrón y momento.");

  const others = candidates.filter(ex => ex.name.toLowerCase() !== String(row.name || "").trim().toLowerCase());
  const pool = others.length > 0 ? others : candidates;
  row.name = pool[Math.floor(Math.random() * pool.length)].name;

  if (typeof populateRowSuggestedWeights === "function") populateRowSuggestedWeights(row, bKey);
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

  appState.days = blueprint.days.map((dayPlan, dIdx) => {
    const warmRows = [
      { order: "1", name: pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm).name, pattern: "MOVILIDAD", sets: warmSets, reps: "30s-60s", rpe: "SMR / Movilidad", rest: "0s", w1: "", w2: "", w3: "", w4: "" },
      { order: "2", name: pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm).name, pattern: "MOVILIDAD", sets: warmSets, reps: "8-10", rpe: "Dinamico", rest: "30s", w1: "", w2: "", w3: "", w4: "" }
    ];

    const coreRows = [
      { order: "A1", name: pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore).name, pattern: "CORE", sets: coreSets, reps: "8-12 / 30s", rpe: "Control", rest: "45s", w1: "", w2: "", w3: "", w4: "" },
      { order: "A2", name: pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore).name, pattern: "CORE", sets: coreSets, reps: "8-10 c/l", rpe: "Estabilidad", rest: "45s", w1: "", w2: "", w3: "", w4: "" }
    ];

    if (genConfig.includePlio || genConfig.phase === "5") {
      coreRows.push({
        order: "A3",
        name: pickSmartExercise({ block: "core", pattern: "PLIOMETRIA", categories, level: genConfig.level }, usedIdsCore).name,
        pattern: "PLIOMETRIA",
        sets: 2,
        reps: "5-6",
        rpe: "Explosivo",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const strRows = dayPlan.slots.map((slot, sIdx) => {
      let tiersForSlot = slot.preferredTiers;
      if (genConfig.phase === "4" && sIdx < 2) tiersForSlot = ["BASE", "INTEGRADO"];
      else if (genConfig.phase === "1" && sIdx >= 2) tiersForSlot = ["UNILATERAL", "INTEGRADO", "ANALITICO", "BASE"];

      const ex = pickSmartExercise({ block: "str", pattern: slot.pattern, preferredTiers: tiersForSlot, categories, level: genConfig.level }, usedIdsStr);
      const setsForThisRow = getSetsForMainSlot(sIdx);
      const orderLabel = (genConfig.method === "superserie_pha" || genConfig.phase === "2")
        ? `${String.fromCharCode(66 + Math.floor(sIdx / 2))}${(sIdx % 2) + 1}`
        : `B${sIdx + 1}`;

      return {
        order: orderLabel,
        name: ex.name,
        pattern: slot.pattern,
        sets: setsForThisRow,
        reps: methodObj.formatRepsForSlot(setsForThisRow, genConfig.phase, genConfig.customReps || "8-10"),
        rpe: genConfig.customRpe || "80%",
        rest: genConfig.customRest || "90s",
        w1: "", w2: "", w3: "", w4: ""
      };
    });

    if (genConfig.includeTransport && dIdx % 2 === 0) {
      strRows.push({
        order: "D",
        name: pickSmartExercise({ block: "str", pattern: "TRANSPORTE", categories, level: genConfig.level }, usedIdsStr).name,
        pattern: "TRANSPORTE",
        sets: 3,
        reps: "20-30m / 30s",
        rpe: "Postura / Pesado",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

    const coolRows = [
      { order: "1", name: pickSmartExercise({ block: "cool", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsCool).name, pattern: "MOVILIDAD", sets: 1, reps: "2-3 min", rpe: "Relajacion / 90-90", rest: "0s", w1: "", w2: "", w3: "", w4: "" }
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