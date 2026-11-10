// =========================================================================
// CORE.JS: ESTADO GLOBAL, CONSTANTES Y ALMACENAMIENTO LOCAL
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

const NASM_PHASES = {
  "1": { name: "Fase 1: Estabilizacion", reps: "12-20", sets: "1-3", intensity: "50-70%", rest: "0-90s", focus: "Control postural y estabilidad articular.", def: { sets: 3, reps: "15", rpe: "65%", rest: "60s" } },
  "2": { name: "Fase 2: Fuerza Resistencia", reps: "8-12", sets: "2-4", intensity: "70-80%", rest: "0-60s", focus: "Trabajo combinado de fuerza base y estabilidad.", def: { sets: 3, reps: "10", rpe: "75%", rest: "60s" } },
  "3": { name: "Fase 3: Hipertrofia", reps: "6-12", sets: "3-5", intensity: "75-85%", rest: "60-90s", focus: "Volumen semanal objetivo de 12 a 15 series (maximo 20).", def: { sets: 4, reps: "8-10", rpe: "80%", rest: "75s" } },
  "4": { name: "Fase 4: Fuerza Maxima", reps: "1-5", sets: "4-6", intensity: "85-100%", rest: "3-5m", focus: "Cargas altas en patrones primarios.", def: { sets: 4, reps: "4-5", rpe: "87.5%", rest: "3m" } },
  "5": { name: "Fase 5: Potencia", reps: "1-5 + 8-10", sets: "3-5", intensity: "85% / Vel", rest: "1-2m", focus: "Contrastes de fuerza y velocidad.", def: { sets: 4, reps: "5 + 8", rpe: "Explosivo", rest: "2m" } }
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
    coachName: "",
    clientGoal: "",
    splitType: "Full Body 3 Dias",
    startDate: new Date().toISOString().split("T")[0],
    clientNotes: "",
    nasmPhase: "3"
  },
  activeDayIndex: 0,
  days: [],
  exercises: [],
  routines: [],
  clients: []
};

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
}

function updateNASMAssistant() {
  const k = document.getElementById("nasm-phase-select").value;
  appState.meta.nasmPhase = k;
  const p = NASM_PHASES[k];
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
    .replace(/"/g, "&quot;");
}

function renderAll() {
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
  loadFromLocalStorage();
  document.getElementById("cloud-bar").classList.add("section-collapsed");
  syncMetaInputs();
  updateNASMAssistant();
  renderAll();
});

window.addEventListener("beforeprint", () => {
  if (typeof buildPrintAllDaysView === "function") buildPrintAllDaysView();
});