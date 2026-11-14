// =========================================================================
// GENERATOR.JS: MOTOR INTELIGENTE POR BLOQUES, JERARQUIA Y CARGA AUTOMATICA
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
        "1": { reps: "12-15", rpe: "60% (4/2/1)", rest: "60s" },
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
      const rpe  = phase === "1" ? "60%" : (phase === "4" ? "87.5%" : "77.5%");
      return { sets, reps, rpe, rest: "60s" };
    }
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
    d.slots.forEach(s => {
      if (s.pattern === "RODILLA" || s.pattern === "CADERA") lowerSlots++;
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
    lowerSeriesQueue: distribute(targetWeeklyMacro, Math.max(1, lowerSlots)),
    upperSeriesQueue: distribute(targetWeeklyMacro, Math.max(1, upperSlots))
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
  const blueprint = SPLIT_BLUEPRINTS[genConfig.daysCount] || SPLIT_BLUEPRINTS[3];

  const totalLower = volPreview.lowerSeriesQueue.reduce((a, b) => a + b, 0);
  const totalUpper = volPreview.upperSeriesQueue.reduce((a, b) => a + b, 0);

  container.innerHTML = `
    <div class="card">
      <div class="card-title">
        <span>Generador Inteligente por Bloques y Jerarquia Poliarticular</span>
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
            <option value="1" ${genConfig.phase === "1" ? "selected" : ""}>Fase 1: Estabilizacion (Control y Asimetrias - 60%)</option>
            <option value="2" ${genConfig.phase === "2" ? "selected" : ""}>Fase 2: Fuerza Resistencia (Biseries Base + Estable - 75%)</option>
            <option value="3" ${genConfig.phase === "3" ? "selected" : ""}>Fase 3: Hipertrofia (Poliarticular + Volumen - 80%)</option>
            <option value="4" ${genConfig.phase === "4" ? "selected" : ""}>Fase 4: Fuerza Maxima (Prioridad Absoluta Big 3 / Base - 87.5%)</option>
            <option value="5" ${genConfig.phase === "5" ? "selected" : ""}>Fase 5: Potencia (Contrastes Base + Explosivo - 85%)</option>
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
        <div style="margin-bottom:4px;"><strong style="color:var(--text-main);">${escapeHtml(methodObj.name)}:</strong> ${escapeHtml(methodObj.desc)}</div>
        <div style="color:var(--accent); font-size:0.76rem;">
          <strong>Criterio de Seleccion Activo (${blueprint.splitLabel}):</strong>
          ${blueprint.isFullBody
            ? "Abre cada sesion con ejercicios Base Poliarticulares (Sentadilla, Peso Muerto, Press, Dominadas/Remo) e Integrados (Total Body), calculando los kilos sugeridos desde el 1RM Base del cliente."
            : "Abre cada dia con el ejercicio Base Poliarticular del patron principal (1°), seguido de variantes Unilaterales (2°) y Accesorios/Analiticos (3°-4°) con sus respectivos pesos sugeridos."}
        </div>
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
          Incluir Cargar y Llevar / Transporte (Milo) al cierre del Bloque Principal
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

// Botón "Rotar": cambia el ejercicio y recalcula automáticamente los pesos de Sem 1 a 4 según su nuevo elemento y variante
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
  const volQueues = calculateTargetSeriesPerPattern(genConfig.daysCount, genConfig.level);

  let lowerIdx = 0;
  let upperIdx = 0;
  const usedIdsWarm = new Set();
  const usedIdsCore = new Set();
  const usedIdsStr  = new Set();
  const usedIdsCool = new Set();

  const generatedDays = blueprint.days.map((dayPlan, dIdx) => {
    const warmEx1 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm);
    const warmEx2 = pickSmartExercise({ block: "warm", pattern: "MOVILIDAD", categories, level: genConfig.level }, usedIdsWarm);
    const warmRows = [
      { order: "1", name: warmEx1.name, pattern: "MOVILIDAD", sets: 1, reps: "30s-60s", rpe: "SMR / Suave", rest: "0s", w1: "", w2: "", w3: "", w4: "" },
      { order: "2", name: warmEx2.name, pattern: "MOVILIDAD", sets: 2, reps: "8-10", rpe: "Dinamico", rest: "30s", w1: "", w2: "", w3: "", w4: "" }
    ];

    const coreEx1 = pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore);
    const coreEx2 = pickSmartExercise({ block: "core", pattern: "CORE", categories, level: genConfig.level }, usedIdsCore);
    const coreSets = genConfig.level === "iniciado" ? 2 : 3;
    const coreRows = [
      { order: "A1", name: coreEx1.name, pattern: "CORE", sets: coreSets, reps: "8-12 / 30s", rpe: "Control", rest: "45s", w1: "", w2: "", w3: "", w4: "" },
      { order: "A2", name: coreEx2.name, pattern: "CORE", sets: 2, reps: "8-10 c/l", rpe: "Estabilidad", rest: "45s", w1: "", w2: "", w3: "", w4: "" }
    ];

    if (genConfig.includePlio || genConfig.phase === "5") {
      const plioEx = pickSmartExercise({ block: "core", pattern: "PLIOMETRIA", categories, level: genConfig.level }, usedIdsCore);
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

      const isLower = (slot.pattern === "RODILLA" || slot.pattern === "CADERA");
      const rawSets = isLower
        ? (volQueues.lowerSeriesQueue[lowerIdx++] || 3)
        : (volQueues.upperSeriesQueue[upperIdx++] || 3);

      const formatted = methodObj.format(rawSets, genConfig.phase);

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
        sets: formatted.sets,
        reps: formatted.reps,
        rpe: formatted.rpe,
        rest: formatted.rest,
        w1: "", w2: "", w3: "", w4: ""
      };
    });

    if (genConfig.includeTransport && (dIdx % 2 === 0)) {
      const carryEx = pickSmartExercise({ block: "str", pattern: "TRANSPORTE", categories, level: genConfig.level }, usedIdsStr);
      strRows.push({
        order: "D",
        name: carryEx.name,
        pattern: "TRANSPORTE",
        sets: 2,
        reps: "20-30m / 30s",
        rpe: "Postura / Pesado",
        rest: "60s",
        w1: "", w2: "", w3: "", w4: ""
      });
    }

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