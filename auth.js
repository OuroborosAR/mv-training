// =========================================================================
// AUTH.JS: VALIDACION EN SERVIDOR (GOOGLE SHEETS) SIN CLAVES EN EL FRONTEND
// =========================================================================

const SESSION_KEY = "planificador_active_session_v2";

let currentSession = {
  role: null,        // "coach" | "student"
  coachPin: "",      // Solo se guarda en el dispositivo del entrenador tras validar en Google
  clientName: "",
  clientPhone: "",
  activeRoutineId: "",
  activeStudentDayIdx: 0,
  studentTab: "routines",
  studentExFilter: "ALL"
};

window.addEventListener("DOMContentLoaded", async () => {
  await restoreOrShowLogin();
});

function showAuthLoading(msg) {
  const overlay = document.getElementById("auth-overlay");
  const loadingBox = document.getElementById("auth-loading-box");
  const loginBox = document.getElementById("auth-login-box");
  const msgEl = document.getElementById("auth-loading-msg");

  if (overlay) overlay.classList.remove("section-collapsed");
  if (loadingBox) loadingBox.classList.remove("section-collapsed");
  if (loginBox) loginBox.classList.add("section-collapsed");
  if (msgEl && msg) msgEl.textContent = msg;
}

function showLoginPrompt(errorMsg = "") {
  const overlay = document.getElementById("auth-overlay");
  const loadingBox = document.getElementById("auth-loading-box");
  const loginBox = document.getElementById("auth-login-box");
  const errEl = document.getElementById("auth-error-msg");

  if (overlay) overlay.classList.remove("section-collapsed");
  if (loadingBox) loadingBox.classList.add("section-collapsed");
  if (loginBox) loginBox.classList.remove("section-collapsed");
  if (errEl) errEl.textContent = errorMsg;
}

function switchAuthTab(mode) {
  const tabStudent = document.getElementById("tab-auth-student");
  const tabCoach = document.getElementById("tab-auth-coach");
  const formStudent = document.getElementById("form-auth-student");
  const formCoach = document.getElementById("form-auth-coach");
  const errEl = document.getElementById("auth-error-msg");
  if (errEl) errEl.textContent = "";

  if (mode === "coach") {
    tabCoach.classList.add("active");
    tabStudent.classList.remove("active");
    formCoach.classList.remove("section-collapsed");
    formStudent.classList.add("section-collapsed");
    document.getElementById("auth-coach-pin").focus();
  } else {
    tabStudent.classList.add("active");
    tabCoach.classList.remove("active");
    formStudent.classList.remove("section-collapsed");
    formCoach.classList.add("section-collapsed");
    document.getElementById("auth-student-input").focus();
  }
}

function syncCoachPhoneField() {
  const phoneInput = document.getElementById("client-phone");
  if (!phoneInput) return;
  const match = String(appState.meta.clientNotes || "").match(/\[TEL:([^\]]+)\]/);
  phoneInput.value = match ? match[1].trim() : (appState.meta.clientPhone || "");
}

function saveCoachPhoneToMeta() {
  const phoneInput = document.getElementById("client-phone");
  if (!phoneInput) return;
  const phoneVal = phoneInput.value.trim();
  appState.meta.clientPhone = phoneVal;

  let cleanNotes = String(appState.meta.clientNotes || "").replace(/\s*\[TEL:[^\]]+\]/g, "").trim();
  if (phoneVal) {
    cleanNotes = `[TEL:${phoneVal}] ` + cleanNotes;
  }
  appState.meta.clientNotes = cleanNotes;
  const notesEl = document.getElementById("client-notes");
  if (notesEl) notesEl.value = cleanNotes;
  saveToLocalStorage();
}

// LOGIN DE ENTRENADOR VALIDADO EN GOOGLE APPS SCRIPT
async function loginAsCoach(pinOverride) {
  const pinInput = document.getElementById("auth-coach-pin");
  const pinToUse = (pinOverride !== undefined ? pinOverride : (pinInput ? pinInput.value : "")).trim();

  if (!pinToUse) {
    showLoginPrompt("Ingresa tu clave de entrenador.");
    return;
  }

  showAuthLoading("Verificando clave de entrenador en Google Sheets...");

  try {
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "loginCoach", pin: pinToUse })
    });
    const data = await res.json();

    if (data.status !== "ok") {
      localStorage.removeItem(SESSION_KEY);
      showLoginPrompt(data.message || "Clave de entrenador incorrecta.");
      switchAuthTab("coach");
      return;
    }

    appState.exercises = data.exercises || [];
    appState.routines = data.routines || [];
    appState.clients = data.clients || [];
    appState.presencialesGrupos = data.presencialesGrupos || [];
    appState.presencialesRegistros = data.presencialesRegistros || [];

    if (appState.days.length === 0 && appState.routines.length > 0) {
      appState.days = JSON.parse(JSON.stringify(appState.routines[0].days));
    }

    if (pinInput) pinInput.value = "";
    currentSession = {
      role: "coach",
      coachPin: pinToUse,
      clientName: "",
      clientPhone: ""
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    saveToLocalStorage();
    populateDropdowns();
    setCloudStatus("Guardado en Excel", "var(--series-green)");
    applyRoleView();
  } catch (err) {
    showLoginPrompt("Error de red al conectar con Google Sheets.");
    switchAuthTab("coach");
  }
}

// LOGIN DE ALUMNO VALIDADO EN GOOGLE APPS SCRIPT (SOLO DESCARGA SUS RUTINAS)
async function loginAsStudent(inputOverride) {
  const studentEl = document.getElementById("auth-student-input");
  const rawInput = (inputOverride !== undefined ? inputOverride : (studentEl ? studentEl.value : "")).trim();

  if (!rawInput) {
    showLoginPrompt("Ingresa tu numero de telefono o nombre.");
    return;
  }

  showAuthLoading("Buscando tus rutinas asignadas...");

  try {
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "loginStudent", studentInput: rawInput })
    });
    const data = await res.json();

    if (data.status !== "ok") {
      localStorage.removeItem(SESSION_KEY);
      showLoginPrompt(data.message || "No encontramos rutinas para ese telefono o nombre.");
      switchAuthTab("student");
      return;
    }

    // El alumno solo recibe el catalogo de ejercicios y sus propias rutinas
    appState.exercises = data.exercises || [];
    appState.routines = data.routines || [];
    appState.clients = [];
    appState.presencialesGrupos = [];
    appState.presencialesRegistros = [];

    if (studentEl) studentEl.value = "";
    currentSession = {
      role: "student",
      coachPin: "",
      clientName: data.clientName,
      clientPhone: rawInput,
      activeRoutineId: (data.routines && data.routines[0]) ? data.routines[0].id : "",
      activeStudentDayIdx: 0,
      studentTab: "routines",
      studentExFilter: "ALL"
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    saveToLocalStorage();
    applyRoleView();
  } catch (err) {
    showLoginPrompt("No se pudo conectar con la base de datos.");
    switchAuthTab("student");
  }
}

async function restoreOrShowLogin() {
  const saved = localStorage.getItem(SESSION_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.role === "coach" && parsed.coachPin) {
        await loginAsCoach(parsed.coachPin);
        return;
      }
      if (parsed && parsed.role === "student" && parsed.clientPhone) {
        await loginAsStudent(parsed.clientPhone);
        return;
      }
    } catch (e) {}
  }
  showLoginPrompt();
}

function logoutSession() {
  localStorage.removeItem(SESSION_KEY);
  currentSession = {
    role: null,
    coachPin: "",
    clientName: "",
    clientPhone: "",
    activeRoutineId: "",
    activeStudentDayIdx: 0,
    studentTab: "routines",
    studentExFilter: "ALL"
  };
  appState.clients = [];
  appState.routines = [];
  appState.presencialesGrupos = [];
  appState.presencialesRegistros = [];
  saveToLocalStorage();
  const drawer = document.getElementById("library-drawer");
  if (drawer) drawer.classList.remove("open");
  showLoginPrompt();
}

function applyRoleView() {
  const overlay = document.getElementById("auth-overlay");
  const coachHeader = document.getElementById("fixed-header-wrapper");
  const headerSpacer = document.getElementById("header-spacer");
  const floatingBtns = document.querySelector(".floating-controls");
  const coachMain = document.getElementById("main-container");
  const studentPortal = document.getElementById("student-portal-view");

  if (overlay) overlay.classList.add("section-collapsed");

  if (currentSession.role === "coach") {
    coachHeader.classList.remove("section-collapsed");
    headerSpacer.classList.remove("section-collapsed");
    floatingBtns.classList.remove("section-collapsed");
    coachMain.classList.remove("section-collapsed");
    studentPortal.classList.add("section-collapsed");
    syncCoachPhoneField();
    renderAll();
  } else if (currentSession.role === "student") {
    coachHeader.classList.add("section-collapsed");
    headerSpacer.classList.add("section-collapsed");
    floatingBtns.classList.add("section-collapsed");
    coachMain.classList.add("section-collapsed");
    studentPortal.classList.remove("section-collapsed");
    renderStudentPortal();
  }
}

// =========================================================================
// PORTAL DEL ALUMNO Y GUARDADO DE PESOS EN SEMANAS 1 A 4
// =========================================================================
function switchStudentTab(tabName) {
  currentSession.studentTab = tabName;
  renderStudentPortal();
}

function getStudentAssignedRoutines() {
  return appState.routines || [];
}

function selectStudentRoutine(routineId) {
  currentSession.activeRoutineId = routineId;
  currentSession.activeStudentDayIdx = 0;
  renderStudentPortal();
}

function selectStudentDay(dayIdx) {
  currentSession.activeStudentDayIdx = dayIdx;
  renderStudentPortal();
}

function setStudentExerciseFilter(pat) {
  currentSession.studentExFilter = pat;
  renderStudentExercisesList();
}

function setStudentSaveStatus(text, color) {
  const el = document.getElementById("student-save-status");
  if (el) {
    el.textContent = text;
    el.style.color = color;
  }
}

function updateStudentWeight(routineId, dayIdx, blockKey, rowIdx, weekField, val) {
  const routine = (appState.routines || []).find(r => r.id === routineId);
  if (!routine || !routine.days || !routine.days[dayIdx]) return;

  const list = routine.days[dayIdx].blocks[blockKey];
  if (!list || !list[rowIdx]) return;

  list[rowIdx][weekField] = val;
  routine.updatedAt = new Date().toLocaleDateString();

  saveToLocalStorage();
  setStudentSaveStatus("Cambios pendientes de envio...", "var(--series-yellow)");
}

async function syncStudentRoutineWeights(routineId, showManualAlert = false) {
  const routine = (appState.routines || []).find(r => r.id === routineId);
  if (!routine) return;

  saveToLocalStorage();
  setStudentSaveStatus("Guardando pesos en la nube...", "var(--accent)");
  try {
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "saveStudentWeights",
        routineId: routine.id,
        clientName: currentSession.clientName,
        days: routine.days
      })
    });
    const data = await res.json();
    if (data.status === "ok") {
      setStudentSaveStatus("Pesos sincronizados", "var(--series-green)");
      if (showManualAlert) alert("Tus pesos fueron guardados correctamente.");
    } else {
      setStudentSaveStatus("Error al guardar", "var(--series-red)");
    }
  } catch (err) {
    setStudentSaveStatus("Guardado local (Sin red)", "var(--series-yellow)");
  }
}

function printStudentActiveRoutine() {
  const assigned = getStudentAssignedRoutines();
  const activeRut = assigned.find(r => r.id === currentSession.activeRoutineId) || assigned[0];
  if (!activeRut) return;

  const backupMeta = JSON.parse(JSON.stringify(appState.meta));
  const backupDays = JSON.parse(JSON.stringify(appState.days));

  appState.meta.clientName = currentSession.clientName;
  appState.meta.clientGoal = activeRut.goal || "";
  appState.days = JSON.parse(JSON.stringify(activeRut.days || []));

  buildPrintAllDaysView();
  window.print();

  appState.meta = backupMeta;
  appState.days = backupDays;
}

function renderStudentPortal() {
  document.getElementById("student-welcome-name").textContent = currentSession.clientName;

  const btnTabRoutines = document.getElementById("btn-st-tab-routines");
  const btnTabExercises = document.getElementById("btn-st-tab-exercises");
  const secRoutines = document.getElementById("student-routines-section");
  const secExercises = document.getElementById("student-exercises-section");

  if (currentSession.studentTab === "exercises") {
    btnTabExercises.classList.add("btn-primary");
    btnTabRoutines.classList.remove("btn-primary");
    secExercises.classList.remove("section-collapsed");
    secRoutines.classList.add("section-collapsed");
    renderStudentExercisesList();
  } else {
    btnTabRoutines.classList.add("btn-primary");
    btnTabExercises.classList.remove("btn-primary");
    secRoutines.classList.remove("section-collapsed");
    secExercises.classList.add("section-collapsed");
    renderStudentRoutinesView();
  }
}

function renderStudentRoutinesView() {
  const container = document.getElementById("student-routines-content");
  const assigned = getStudentAssignedRoutines();

  if (assigned.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center; padding:28px;">
        <h3 style="color:var(--accent); margin-bottom:6px;">Sin rutinas asignadas</h3>
        <p style="font-size:0.85rem; color:var(--text-muted);">
          Todavia no hay rutinas guardadas bajo el nombre <strong>${escapeHtml(currentSession.clientName)}</strong>.
        </p>
      </div>
    `;
    return;
  }

  if (!currentSession.activeRoutineId || !assigned.some(r => r.id === currentSession.activeRoutineId)) {
    currentSession.activeRoutineId = assigned[0].id;
  }

  const activeRoutine = assigned.find(r => r.id === currentSession.activeRoutineId) || assigned[0];
  const days = activeRoutine.days || [];
  if (currentSession.activeStudentDayIdx >= days.length) {
    currentSession.activeStudentDayIdx = 0;
  }
  const dIdx = currentSession.activeStudentDayIdx;
  const currentDay = days[dIdx] || { title: "Dia 1", focus: "", blocks: {} };

  const routineSelectorHtml = `
    <div class="control-strip" style="margin-bottom:14px;">
      <div class="strip-section">
        <strong style="font-size:0.8rem; color:var(--text-muted);">Mis Rutinas (${assigned.length}):</strong>
        <select onchange="selectStudentRoutine(this.value)" style="min-width:220px;">
          ${assigned.map(r => `<option value="${r.id}" ${r.id === activeRoutine.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join("")}
        </select>
        ${activeRoutine.goal ? `<span class="tag-pattern" style="font-size:0.75rem; padding:4px 8px;">Objetivo: ${escapeHtml(activeRoutine.goal)}</span>` : ""}
      </div>
      <div class="strip-section">
        <span id="student-save-status" style="font-size:0.75rem; color:var(--text-muted);">Anota tus cargas en Sem 1 a 4</span>
        <button class="btn btn-primary" onclick="syncStudentRoutineWeights('${activeRoutine.id}', true)">Guardar Mis Pesos</button>
        <button class="btn btn-success" onclick="printStudentActiveRoutine()">Descargar PDF</button>
      </div>
    </div>
  `;

  const dayTabsHtml = `
    <div class="tabs-bar">
      <div class="day-tabs">
        ${days.map((d, idx) => `
          <button class="tab-btn ${idx === dIdx ? 'active' : ''}" onclick="selectStudentDay(${idx})">
            ${escapeHtml(d.title)}
          </button>
        `).join("")}
      </div>
      <div style="font-size:0.82rem; color:var(--accent); font-weight:600;">
        ${escapeHtml(currentDay.focus || "")}
      </div>
    </div>
  `;

  const blocksHtml = BLOCK_DEFINITIONS.map(b => {
    const rows = (currentDay.blocks && currentDay.blocks[b.key]) || [];
    if (rows.length === 0) return "";
    return `
      <div class="workout-block ${b.cssClass}">
        <div class="block-header">
          <span>${b.title}</span>
        </div>
        <div class="table-responsive">
          <table class="plan-table">
            <thead>
              <tr>
                <th style="width:50px;">Ord</th>
                <th class="col-ex">Ejercicio</th>
                <th style="width:65px; text-align:center;">Series</th>
                <th style="width:85px; text-align:center;">Reps</th>
                <th style="width:85px; text-align:center;">Carga/Int</th>
                <th style="width:70px; text-align:center;">Pausa</th>
                <th class="week-col">Sem 1 (Kg)</th>
                <th class="week-col">Sem 2 (Kg)</th>
                <th class="week-col">Sem 3 (Kg)</th>
                <th class="week-col">Sem 4 (Kg)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, rIdx) => `
                <tr>
                  <td style="text-align:center; font-weight:600;">${escapeHtml(r.order)}</td>
                  <td class="col-ex"><strong>${escapeHtml(r.name)}</strong></td>
                  <td style="text-align:center;">${r.sets}</td>
                  <td style="text-align:center;">${escapeHtml(r.reps)}</td>
                  <td style="text-align:center;">${escapeHtml(r.rpe)}</td>
                  <td style="text-align:center;">${escapeHtml(r.rest)}</td>
                  <td class="week-cell">
                    <input type="text" class="input-md" value="${escapeHtml(r.w1 || "")}" placeholder="-"
                      oninput="updateStudentWeight('${activeRoutine.id}', ${dIdx}, '${b.key}', ${rIdx}, 'w1', this.value)"
                      onchange="syncStudentRoutineWeights('${activeRoutine.id}', false)">
                  </td>
                  <td class="week-cell">
                    <input type="text" class="input-md" value="${escapeHtml(r.w2 || "")}" placeholder="-"
                      oninput="updateStudentWeight('${activeRoutine.id}', ${dIdx}, '${b.key}', ${rIdx}, 'w2', this.value)"
                      onchange="syncStudentRoutineWeights('${activeRoutine.id}', false)">
                  </td>
                  <td class="week-cell">
                    <input type="text" class="input-md" value="${escapeHtml(r.w3 || "")}" placeholder="-"
                      oninput="updateStudentWeight('${activeRoutine.id}', ${dIdx}, '${b.key}', ${rIdx}, 'w3', this.value)"
                      onchange="syncStudentRoutineWeights('${activeRoutine.id}', false)">
                  </td>
                  <td class="week-cell">
                    <input type="text" class="input-md" value="${escapeHtml(r.w4 || "")}" placeholder="-"
                      oninput="updateStudentWeight('${activeRoutine.id}', ${dIdx}, '${b.key}', ${rIdx}, 'w4', this.value)"
                      onchange="syncStudentRoutineWeights('${activeRoutine.id}', false)">
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = routineSelectorHtml + dayTabsHtml + (blocksHtml || `<div class="card">Este dia no tiene ejercicios cargados.</div>`);
}

function renderStudentExercisesList() {
  const pillsContainer = document.getElementById("student-ex-pills");
  const listContainer = document.getElementById("student-ex-grid");
  const searchEl = document.getElementById("student-ex-search");
  const q = (searchEl ? searchEl.value : "").toLowerCase();

  const pills = [
    ["ALL", "Todos"], ["RODILLA", "Rodilla"], ["CADERA", "Cadera"],
    ["EMPUJE_H", "Empuje H"], ["EMPUJE_V", "Empuje V"],
    ["TRACCION_H", "Traccion H"], ["TRACCION_V", "Traccion V"],
    ["CORE", "Core"], ["TRANSPORTE", "Transporte"],
    ["PLIOMETRIA", "Pliometria"], ["MOVILIDAD", "Movilidad"]
  ];

  if (pillsContainer) {
    pillsContainer.innerHTML = pills.map(p =>
      `<span class="pill ${currentSession.studentExFilter === p[0] ? 'active' : ''}" onclick="setStudentExerciseFilter('${p[0]}')">${p[1]}</span>`
    ).join("");
  }

  const filtered = (appState.exercises || []).filter(ex => {
    const matchPat = currentSession.studentExFilter === "ALL" || ex.pattern === currentSession.studentExFilter;
    const matchQ = !q || ex.name.toLowerCase().includes(q) || (ex.equip || "").toLowerCase().includes(q);
    return matchPat && matchQ;
  });

  if (listContainer) {
    listContainer.innerHTML = filtered.length === 0
      ? `<div style="color:var(--text-muted); font-size:0.85rem;">No se encontraron ejercicios con ese filtro.</div>`
      : filtered.map(ex => {
          const cfg = PATTERN_CONFIG[ex.pattern] || { label: ex.pattern };
          return `
            <div class="exercise-item">
              <div class="ex-info">
                <h4>${escapeHtml(ex.name)}</h4>
                <div class="ex-meta">
                  <span class="tag-pattern">${cfg.label}</span>
                  Elemento: ${escapeHtml(ex.equip || "Libre")}
                </div>
              </div>
            </div>
          `;
        }).join("");
  }
}