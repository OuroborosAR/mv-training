// ============================================================================
// PRESENCIALES.JS: GRUPOS, ASISTENCIA, LIQUIDACIÓN WHATSAPP Y VISOR FINANCIERO
// ============================================================================

let presencialState = {
  activeTab: "grupos", // "grupos" | "asistencia" | "liquidacion" | "finanzas"
  selectedGroupId: "",
  selectedMonth: new Date().toISOString().slice(0, 7) // "YYYY-MM"
};

const DIAS_SEMANA_NOMBRES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado"
];

const MESES_CORTOS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const MESES_LARGOS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const PAGOS_STORAGE_KEY = "planificador_presenciales_pagos_v1";

// Convierte "2026-10" en "Octubre"
function obtenerNombreMes(yearMonth) {
  if (!yearMonth) return "";
  const partes = String(yearMonth).trim().split("-");
  if (partes.length < 2) return yearMonth;
  const mesIdx = parseInt(partes[1], 10) - 1;
  return MESES_LARGOS[mesIdx] || yearMonth;
}

// Convierte "2026-10-02" en "02/10"
function formatearFechaSinAnio(fechaISO) {
  const partes = String(fechaISO || "").trim().split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : fechaISO;
}

// Obtiene el monto real contabilizado de un registro
function obtenerMontoRegistro(reg, valorBaseGrupo) {
  if (!reg || reg.status !== "DADA") return 0;
  const montoGuardado = Number(reg.amount);
  return montoGuardado > 0 ? montoGuardado : (Number(valorBaseGrupo) || 25000);
}

// Inyecta estilos adaptables para celular y gráficos financieros sin tocar styles.css
function injectPresencialesStyles() {
  if (document.getElementById("presenciales-injected-styles")) return;
  const st = document.createElement("style");
  st.id = "presenciales-injected-styles";
  st.textContent = `
    .pres-nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 6px;
      width: 100%;
    }
    .pres-nav-grid .btn {
      justify-content: center;
      padding: 8px 10px;
      font-size: 0.78rem;
    }
    .fin-kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .fin-kpi-card {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 4px;
    }
    .fin-kpi-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--text-muted);
      font-weight: 700;
    }
    .fin-kpi-value {
      font-size: 1.3rem;
      font-weight: 800;
      line-height: 1.2;
    }
    .fin-kpi-sub {
      font-size: 0.74rem;
      color: var(--text-muted);
    }
    .fin-dual-bar {
      width: 100%;
      height: 10px;
      background: rgba(239, 68, 68, 0.25);
      border-radius: 999px;
      overflow: hidden;
      display: flex;
      margin-top: 4px;
    }
    .fin-dual-fill-green {
      background: var(--series-green);
      height: 100%;
      transition: width 0.25s ease;
    }
    .fin-dual-fill-red {
      background: var(--series-red);
      height: 100%;
      transition: width 0.25s ease;
    }
    .fin-group-row {
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .fin-year-chart {
      display: grid;
      grid-template-columns: repeat(12, minmax(38px, 1fr));
      gap: 6px;
      align-items: end;
      height: 170px;
      padding: 18px 6px 6px;
      background: var(--bg-input);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow-x: auto;
    }
    .fin-month-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
      cursor: pointer;
      user-select: none;
    }
    .fin-month-val {
      font-size: 0.63rem;
      color: var(--text-muted);
      margin-bottom: 4px;
      white-space: nowrap;
    }
    .fin-month-bar-wrap {
      width: 100%;
      max-width: 28px;
      height: 110px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 4px 4px 0 0;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }
    .fin-month-bar {
      width: 100%;
      background: var(--accent-dark);
      border-top: 2px solid var(--accent);
      border-radius: 4px 4px 0 0;
      transition: height 0.25s ease;
    }
    .fin-month-col.active .fin-month-bar {
      background: var(--series-green);
      border-top-color: #ffffff;
    }
    .fin-month-lbl {
      font-size: 0.68rem;
      font-weight: 700;
      margin-top: 5px;
      color: var(--text-muted);
    }
    .fin-month-col.active .fin-month-lbl {
      color: var(--accent);
    }
    @media (max-width: 768px) {
      .pres-nav-grid {
        grid-template-columns: 1fr 1fr;
      }
      .fin-kpi-grid {
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .fin-kpi-value {
        font-size: 1.08rem;
      }
      .fin-year-chart {
        grid-template-columns: repeat(12, minmax(34px, 1fr));
        height: 155px;
      }
    }
  `;
  document.head.appendChild(st);
}

// Estado local de pagos (Cobrado / Pendiente por grupo y mes)
function getPagosMap() {
  try {
    return JSON.parse(localStorage.getItem(PAGOS_STORAGE_KEY) || "{}");
  } catch (e) {
    return {};
  }
}

function isGroupMonthPaid(groupId, yearMonth) {
  const map = getPagosMap();
  return Boolean(map[`${groupId}_${yearMonth}`]);
}

function toggleGroupMonthPaid(groupId, yearMonth) {
  const map = getPagosMap();
  const key = `${groupId}_${yearMonth}`;
  map[key] = !map[key];
  localStorage.setItem(PAGOS_STORAGE_KEY, JSON.stringify(map));
  renderPresencialesModule();
}

// Devuelve el nombre exacto del día ("Lunes", "Miércoles", etc.) a partir de "YYYY-MM-DD"
function obtenerNombreDiaFecha(fechaISO) {
  if (!fechaISO) return "";
  const partes = String(fechaISO).trim().split("-");
  if (partes.length < 3) return "";
  const anio = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  const fechaLocal = new Date(anio, mes, dia);
  if (isNaN(fechaLocal.getTime())) return "";
  return DIAS_SEMANA_NOMBRES[fechaLocal.getDay()] || "";
}

function obtenerDiaLimpioRegistro(reg, groupScheduleText) {
  const diaCalculado = obtenerNombreDiaFecha(reg.date);
  const guardado = String(reg.time || "").trim();

  if (!guardado) return diaCalculado;
  if (groupScheduleText && guardado.toLowerCase() === String(groupScheduleText).trim().toLowerCase()) {
    return diaCalculado;
  }
  if (guardado.includes(",") || guardado.toLowerCase().includes(" y ")) {
    return diaCalculado;
  }
  return guardado;
}

function getOrCreatePresencialesView() {
  injectPresencialesStyles();
  let viewPres = document.getElementById("coach-presenciales-view");
  if (!viewPres) {
    viewPres = document.createElement("section");
    viewPres.id = "coach-presenciales-view";
    viewPres.className = "section-collapsed no-print";
    const mainContainer = document.getElementById("main-container");
    const editorView = document.getElementById("coach-editor-view");
    if (mainContainer && editorView) {
      mainContainer.insertBefore(viewPres, editorView);
    } else if (mainContainer) {
      mainContainer.appendChild(viewPres);
    }
  }
  return viewPres;
}

// Controla las 3 pestañas principales del Entrenador y oculta Series Semanales en Presenciales
function switchCoachMainTab(tab) {
  const btnEditor = document.getElementById("btn-mode-editor");
  const btnGen = document.getElementById("btn-mode-generator");
  const btnPres = document.getElementById("btn-mode-presenciales");

  const viewEditor = document.getElementById("coach-editor-view");
  const viewGen = document.getElementById("coach-generator-view");
  const viewPres = getOrCreatePresencialesView();
  const seriesSection = document.getElementById("weekly-series-section");

  if (btnEditor) btnEditor.classList.toggle("active", tab === "editor");
  if (btnGen) btnGen.classList.toggle("active", tab === "generator");
  if (btnPres) btnPres.classList.toggle("active", tab === "presenciales");

  if (viewEditor) viewEditor.classList.toggle("section-collapsed", tab !== "editor");
  if (viewGen) viewGen.classList.toggle("section-collapsed", tab !== "generator");
  if (viewPres) viewPres.classList.toggle("section-collapsed", tab !== "presenciales");

  if (seriesSection) {
    if (tab === "presenciales") {
      seriesSection.classList.add("section-collapsed");
    } else if (typeof showSeriesPanel !== "undefined" && showSeriesPanel) {
      seriesSection.classList.remove("section-collapsed");
    }
    if (typeof updateHeaderLayoutAndSpacer === "function") {
      updateHeaderLayoutAndSpacer();
    }
  }

  if (tab === "generator" && typeof renderGeneratorView === "function") {
    renderGeneratorView();
  } else if (tab === "presenciales") {
    renderPresencialesModule();
  } else if (tab === "editor" && typeof renderAll === "function") {
    renderAll();
  }
}

async function syncPresencialToSheet(payload) {
  if (!appState.sheetUrl) return;
  const bodyPayload = Object.assign({}, payload, {
    pin: (typeof currentSession !== "undefined" && currentSession.coachPin) ? currentSession.coachPin : ""
  });

  try {
    if (typeof setCloudStatus === "function") setCloudStatus("Sincronizando...", "var(--accent)");
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(bodyPayload)
    });
    const data = await res.json();
    if (data.status === "ok" && typeof setCloudStatus === "function") {
      setCloudStatus("Guardado en Excel", "var(--series-green)");
    }
  } catch (err) {
    if (typeof setCloudStatus === "function") setCloudStatus("Guardado local", "var(--series-yellow)");
  }
}

// Calcula las métricas financieras de un mes ("YYYY-MM") sumando el monto real de cada clase dada
function calcularMetricasMes(yearMonth) {
  const grupos = appState.presencialesGrupos || [];
  const registros = (appState.presencialesRegistros || []).filter(r =>
    String(r.date || "").startsWith(yearMonth)
  );

  let totalGanado = 0;
  let totalPerdido = 0;
  let totalCobrado = 0;
  let totalPendiente = 0;
  let cantDadas = 0;
  let cantSuspendidas = 0;

  const desgloseGrupos = grupos.map(g => {
    const regsGrupo = registros
      .filter(r => r.groupId === g.id)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const dadas = regsGrupo.filter(r => r.status === "DADA");
    const suspendidas = regsGrupo.filter(r => r.status === "SUSPENDIDA");
    const valorUnitario = Number(g.price) || 25000;

    const ganadoGrupo = dadas.reduce((acc, r) => acc + obtenerMontoRegistro(r, valorUnitario), 0);
    const perdidoGrupo = suspendidas.length * valorUnitario;
    const pagado = isGroupMonthPaid(g.id, yearMonth);

    totalGanado += ganadoGrupo;
    totalPerdido += perdidoGrupo;
    cantDadas += dadas.length;
    cantSuspendidas += suspendidas.length;

    if (pagado) totalCobrado += ganadoGrupo;
    else totalPendiente += ganadoGrupo;

    return {
      group: g,
      dadas,
      suspendidas,
      valorUnitario,
      subtotal: ganadoGrupo,
      perdido: perdidoGrupo,
      pagado
    };
  });

  const totalClases = cantDadas + cantSuspendidas;
  const efectividadPct = totalClases > 0 ? Math.round((cantDadas / totalClases) * 100) : 0;
  const potencialTotal = totalGanado + totalPerdido;

  return {
    yearMonth,
    totalGanado,
    totalPerdido,
    potencialTotal,
    totalCobrado,
    totalPendiente,
    cantDadas,
    cantSuspendidas,
    totalClases,
    efectividadPct,
    desgloseGrupos
  };
}

function renderPresencialesModule() {
  const container = getOrCreatePresencialesView();
  if (!container) return;

  const metricasRapidas = calcularMetricasMes(presencialState.selectedMonth);
  const nombreMesActual = obtenerNombreMes(presencialState.selectedMonth);

  container.innerHTML = `
    <div class="control-strip no-print" style="margin-bottom: 12px; flex-direction: column; align-items: stretch; gap: 10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <strong style="font-size:0.85rem; color:var(--accent); text-transform:uppercase;">Gestión de Clases Presenciales</strong>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:0.78rem;">
          <span>${nombreMesActual}: <strong style="color:var(--series-green);">$${metricasRapidas.totalGanado.toLocaleString('es-AR')}</strong></span>
          <span style="color:var(--text-muted);">|</span>
          <span>Dadas: <strong>${metricasRapidas.cantDadas}</strong> / Susp: <strong style="color:var(--series-red);">${metricasRapidas.cantSuspendidas}</strong></span>
        </div>
      </div>
      <div class="pres-nav-grid">
        <button class="btn ${presencialState.activeTab === 'grupos' ? 'btn-primary' : ''}" onclick="switchPresencialTab('grupos')">1. Grupos y Horarios</button>
        <button class="btn ${presencialState.activeTab === 'asistencia' ? 'btn-primary' : ''}" onclick="switchPresencialTab('asistencia')">2. Registro y Suspensiones</button>
        <button class="btn ${presencialState.activeTab === 'liquidacion' ? 'btn-primary' : ''}" onclick="switchPresencialTab('liquidacion')">3. Cierre y WhatsApp</button>
        <button class="btn ${presencialState.activeTab === 'finanzas' ? 'btn-primary' : ''}" onclick="switchPresencialTab('finanzas')">4. Visor de Finanzas</button>
      </div>
    </div>
    <div id="presenciales-content-area"></div>
  `;

  const contentArea = document.getElementById("presenciales-content-area");
  if (presencialState.activeTab === "grupos") {
    renderGruposView(contentArea);
  } else if (presencialState.activeTab === "asistencia") {
    renderAsistenciaView(contentArea);
  } else if (presencialState.activeTab === "liquidacion") {
    renderLiquidacionView(contentArea);
  } else {
    renderFinanzasView(contentArea);
  }
}

function switchPresencialTab(tab) {
  presencialState.activeTab = tab;
  renderPresencialesModule();
}

// ============================================================================
// 1. GESTIÓN DE GRUPOS Y PERSONALIZADOS
// ============================================================================
function renderGruposView(container) {
  const grupos = appState.presencialesGrupos || [];

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title">
        <span id="p-grp-form-title">Nuevo Grupo o Personalizado Presencial</span>
      </div>
      <input type="hidden" id="p-grp-edit-id" value="">
      <div class="client-form" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
        <div class="form-group">
          <label>Nombre del Grupo / Alumno</label>
          <input type="text" id="p-grp-name" placeholder="Ej: Grupo Carregal o Duo 20k/40k">
        </div>
        <div class="form-group">
          <label>Integrantes</label>
          <input type="text" id="p-grp-members" placeholder="Clara, Santi, Ale...">
        </div>
        <div class="form-group">
          <label>Dias y Horarios (Ej: Lunes, Miercoles y Viernes 7:00)</label>
          <input type="text" id="p-grp-schedule" placeholder="Lunes, Miercoles y Viernes 7:00">
        </div>
        <div class="form-group">
          <label>Valor por Clase ($)</label>
          <input type="number" id="p-grp-price" value="25000">
        </div>
        <div class="form-group">
          <label>WhatsApp (Para enviar resumen)</label>
          <input type="tel" id="p-grp-phone" placeholder="54911...">
        </div>
        <div class="form-group">
          <label>Estado</label>
          <select id="p-grp-status">
            <option value="ACTIVO">Activo</option>
            <option value="BAJA">Baja</option>
          </select>
        </div>
      </div>
      <div style="margin-top: 10px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
        <button class="btn" id="btn-cancel-grp-edit" style="display:none;" onclick="renderPresencialesModule()">Cancelar Edicion</button>
        <button class="btn btn-success" id="btn-save-grp" onclick="savePresencialGroupFromUI()">Guardar Grupo en Base de Datos</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Grilla de Grupos y Personalizados (${grupos.length})</span>
      </div>
      <div class="table-responsive">
        <table class="plan-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Integrantes</th>
              <th>Dias y Horarios</th>
              <th>Valor Base ($)</th>
              <th>WhatsApp</th>
              <th>Estado</th>
              <th style="width:170px;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${grupos.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-muted);">No hay grupos cargados todavia.</td></tr>` :
            grupos.map(g => `
              <tr>
                <td><strong>${escapeHtml(g.name)}</strong></td>
                <td>${escapeHtml(g.members)}</td>
                <td>${escapeHtml(g.scheduleText)}</td>
                <td>$${Number(g.price || 25000).toLocaleString('es-AR')}</td>
                <td>${escapeHtml(g.phone)}</td>
                <td><span class="tag-pattern" style="background:${g.status === 'ACTIVO' ? 'var(--series-green)' : 'var(--series-red)'}; color:#fff;">${g.status}</span></td>
                <td style="display:flex; gap:4px;">
                  <button class="btn btn-primary" style="padding:4px 8px; font-size:0.75rem;" onclick="selectGroupForAttendance('${g.id}')">Fechas</button>
                  <button class="btn" style="padding:4px 8px; font-size:0.75rem;" onclick="editPresencialGroup('${g.id}')">Editar</button>
                  <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePresencialGroup('${g.id}')">X</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function editPresencialGroup(groupId) {
  const g = (appState.presencialesGrupos || []).find(item => item.id === groupId);
  if (!g) return;
  document.getElementById("p-grp-edit-id").value = g.id;
  document.getElementById("p-grp-name").value = g.name || "";
  document.getElementById("p-grp-members").value = g.members || "";
  document.getElementById("p-grp-schedule").value = g.scheduleText || "";
  document.getElementById("p-grp-price").value = g.price || 25000;
  document.getElementById("p-grp-phone").value = g.phone || "";
  document.getElementById("p-grp-status").value = g.status || "ACTIVO";
  document.getElementById("p-grp-form-title").textContent = "Editando Grupo: " + g.name;
  document.getElementById("btn-cancel-grp-edit").style.display = "inline-flex";
}

function savePresencialGroupFromUI() {
  const name = document.getElementById("p-grp-name").value.trim();
  if (!name) {
    alert("Ingresa el nombre del grupo o alumno.");
    return;
  }

  const editId = document.getElementById("p-grp-edit-id").value.trim();
  const groupObj = {
    id: editId || ("pgrp_" + Date.now()),
    name: name,
    members: document.getElementById("p-grp-members").value.trim(),
    scheduleText: document.getElementById("p-grp-schedule").value.trim(),
    price: parseFloat(document.getElementById("p-grp-price").value) || 25000,
    phone: document.getElementById("p-grp-phone").value.trim(),
    status: document.getElementById("p-grp-status").value,
    updatedAt: new Date().toLocaleDateString(),
    schedule: {}
  };

  if (!appState.presencialesGrupos) appState.presencialesGrupos = [];
  const existingIdx = appState.presencialesGrupos.findIndex(g => g.id === groupObj.id);
  if (existingIdx !== -1) {
    appState.presencialesGrupos[existingIdx] = groupObj;
  } else {
    appState.presencialesGrupos.push(groupObj);
  }

  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialGroup", group: groupObj });
  renderPresencialesModule();
}

function deletePresencialGroup(id) {
  if (!confirm("¿Eliminar este grupo de presenciales?")) return;
  appState.presencialesGrupos = (appState.presencialesGrupos || []).filter(g => g.id !== id);
  saveToLocalStorage();
  syncPresencialToSheet({ action: "deletePresencialGroup", id: id });
  renderPresencialesModule();
}

function selectGroupForAttendance(groupId) {
  presencialState.selectedGroupId = groupId;
  presencialState.activeTab = "asistencia";
  renderPresencialesModule();
}

// ============================================================================
// 2. REGISTRO DE ASISTENCIA, OPCIÓN 1 PERSONA (50%) Y SUSPENSIONES
// ============================================================================
function renderAsistenciaView(container) {
  const grupos = appState.presencialesGrupos || [];
  if (grupos.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:20px;">Primero debes crear al menos un grupo o personalizado en la pestaña 1.</div>`;
    return;
  }

  if (!presencialState.selectedGroupId || !grupos.some(g => g.id === presencialState.selectedGroupId)) {
    presencialState.selectedGroupId = grupos[0].id;
  }

  const currentGroup = grupos.find(g => g.id === presencialState.selectedGroupId) || grupos[0];
  const currentMonth = presencialState.selectedMonth;
  const valorBase = Number(currentGroup.price) || 25000;
  const valorMitad = Math.round(valorBase / 2);

  const registrosMes = (appState.presencialesRegistros || [])
    .filter(r => r.groupId === currentGroup.id && String(r.date || "").startsWith(currentMonth))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Registro de Clases: ${escapeHtml(currentGroup.name)} (${escapeHtml(currentGroup.scheduleText)})</span>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select onchange="presencialState.selectedGroupId=this.value; renderPresencialesModule();" style="padding:6px 8px;">
            ${grupos.map(g => `<option value="${g.id}" ${g.id === currentGroup.id ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join("")}
          </select>
          <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
        </div>
      </div>

      <div style="margin-bottom:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="generarFechasMesAutomaticas('${currentGroup.id}', '${currentMonth}')">+ Generar Fechas del Mes</button>
        <button class="btn" onclick="generarFechasAnioAutomaticas('${currentGroup.id}', '${currentMonth.slice(0, 4)}')">+ Generar Todo el Año (${currentMonth.slice(0, 4)})</button>
        <button class="btn btn-success" onclick="agregarClaseExtraIndividual('${currentGroup.id}', '${currentMonth}')">+ Sumar Fecha / Cambio Puntual</button>
      </div>

      <div class="table-responsive">
        <table class="plan-table">
          <thead>
            <tr>
              <th style="width:90px;">Fecha</th>
              <th style="width:120px;">Dia</th>
              <th style="width:210px;">Estado de Clase</th>
              <th>Motivo de Suspension / Nota</th>
              <th style="width:120px; text-align:center;">Valor ($)</th>
              <th style="width:65px;">Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${registrosMes.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">
                  No hay fechas cargadas en ${currentMonth}. Toca "+ Generar Fechas del Mes" o "+ Generar Todo el Año".
                </td>
              </tr>
            ` : registrosMes.map(reg => {
              const diaMostrar = obtenerDiaLimpioRegistro(reg, currentGroup.scheduleText);
              const montoActual = obtenerMontoRegistro(reg, valorBase);
              const esMitad = reg.status === "DADA" && montoActual === valorMitad && valorBase !== valorMitad;
              return `
              <tr>
                <td><strong>${escapeHtml(formatearFechaSinAnio(reg.date))}</strong></td>
                <td><input type="text" class="input-full" value="${escapeHtml(diaMostrar)}" onchange="updateRecordField('${reg.id}', 'time', this.value)"></td>
                <td>
                  <select class="input-full" onchange="handleEstadoClaseChange('${reg.id}', this.value)">
                    <option value="DADA" ${reg.status === 'DADA' && !esMitad ? 'selected' : ''}>Clase Dada ($${valorBase.toLocaleString('es-AR')})</option>
                    <option value="DADA_MITAD" ${esMitad ? 'selected' : ''}>1 Persona / Mitad ($${valorMitad.toLocaleString('es-AR')})</option>
                    <option value="SUSPENDIDA" ${reg.status === 'SUSPENDIDA' ? 'selected' : ''}>Suspendida ($0)</option>
                  </select>
                </td>
                <td>
                  <input type="text" class="input-full" id="reason_${reg.id}" value="${escapeHtml(reg.reason || '')}" placeholder="Motivo si se suspende o cambio..." onchange="updateRecordField('${reg.id}', 'reason', this.value)">
                </td>
                <td style="text-align:center;">
                  <input type="number" class="input-full" style="text-align:center; font-weight:700; color:${reg.status === 'DADA' ? 'var(--series-green)' : 'var(--text-muted)'};" value="${montoActual}" ${reg.status === 'SUSPENDIDA' ? 'disabled' : ''} onchange="updateRecordAmount('${reg.id}', this.value)">
                </td>
                <td style="text-align:center;">
                  <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePresencialRecord('${reg.id}')">X</button>
                </td>
              </tr>
            `;}).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function detectarDiasSemana(texto) {
  const textLower = String(texto || "").toLowerCase();
  const targetDays = [];
  if (textLower.includes("lunes") || textLower.includes("lun")) targetDays.push(1);
  if (textLower.includes("martes") || textLower.includes("mar")) targetDays.push(2);
  if (textLower.includes("miercoles") || textLower.includes("miércoles") || textLower.includes("mie") || textLower.includes("mié")) targetDays.push(3);
  if (textLower.includes("jueves") || textLower.includes("jue")) targetDays.push(4);
  if (textLower.includes("viernes") || textLower.includes("vie")) targetDays.push(5);
  if (textLower.includes("sabado") || textLower.includes("sábado") || textLower.includes("sab") || textLower.includes("sáb")) targetDays.push(6);
  if (textLower.includes("domingo") || textLower.includes("dom")) targetDays.push(0);
  return targetDays;
}

function generarFechasMesAutomaticas(groupId, yearMonth, silent = false) {
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const targetDays = detectarDiasSemana(group.scheduleText);
  if (targetDays.length === 0) {
    if (!silent) alert("En 'Dias y Horarios' del grupo escribi los dias (ej: Lunes, Miercoles y Viernes 7:00) para generar las fechas automaticamente.");
    return;
  }

  const [yStr, mStr] = yearMonth.split("-");
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const date = new Date(year, month, 1);
  const addedRecords = [];

  while (date.getMonth() === month) {
    if (targetDays.includes(date.getDay())) {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const existe = (appState.presencialesRegistros || []).some(r => r.groupId === group.id && r.date === dateString);
      if (!existe) {
        addedRecords.push({
          id: "prec_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
          groupId: group.id,
          groupName: group.name,
          date: dateString,
          time: obtenerNombreDiaFecha(dateString),
          status: "DADA",
          reason: "",
          attendance: group.members || "Presente",
          amount: Number(group.price) || 25000,
          updatedAt: new Date().toLocaleDateString()
        });
      }
    }
    date.setDate(date.getDate() + 1);
  }

  if (addedRecords.length === 0) {
    if (!silent) alert("Ya estaban generadas las fechas de este mes.");
    return;
  }

  if (!appState.presencialesRegistros) appState.presencialesRegistros = [];
  appState.presencialesRegistros.push(...addedRecords);
  saveToLocalStorage();
  addedRecords.forEach(rec => syncPresencialToSheet({ action: "savePresencialRecord", record: rec }));
  if (!silent) renderPresencialesModule();
}

function generarFechasAnioAutomaticas(groupId, yearStr) {
  for (let m = 1; m <= 12; m++) {
    generarFechasMesAutomaticas(groupId, `${yearStr}-${String(m).padStart(2, "0")}`, true);
  }
  renderPresencialesModule();
  alert(`Se generaron todas las fechas del año ${yearStr}.`);
}

function agregarClaseExtraIndividual(groupId, yearMonth) {
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const fechaStr = prompt("Ingresa la fecha de la clase (YYYY-MM-DD):", yearMonth + "-01");
  if (!fechaStr) return;

  const cleanDate = fechaStr.trim();
  const newRec = {
    id: "prec_" + Date.now(),
    groupId: group.id,
    groupName: group.name,
    date: cleanDate,
    time: obtenerNombreDiaFecha(cleanDate) || "Extra",
    status: "DADA",
    reason: "Fecha agregada / cambio de horario",
    attendance: group.members || "Presente",
    amount: Number(group.price) || 25000,
    updatedAt: new Date().toLocaleDateString()
  };

  if (!appState.presencialesRegistros) appState.presencialesRegistros = [];
  appState.presencialesRegistros.push(newRec);
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: newRec });
  renderPresencialesModule();
}

function handleEstadoClaseChange(recordId, selectedOption) {
  const rec = (appState.presencialesRegistros || []).find(r => r.id === recordId);
  if (!rec) return;

  const group = (appState.presencialesGrupos || []).find(g => g.id === rec.groupId);
  const valorClase = group ? (Number(group.price) || 25000) : 25000;

  if (selectedOption === "SUSPENDIDA") {
    const reasonInput = document.getElementById(`reason_${recordId}`);
    let motivo = reasonInput ? reasonInput.value.trim() : (rec.reason || "");
    if (!motivo || motivo === "1 persona") {
      motivo = prompt("Indica el motivo por el cual se suspendio la clase (Obligatorio):", "") || "";
      if (!motivo.trim()) {
        alert("Debes ingresar un motivo para marcar la clase como suspendida.");
        renderPresencialesModule();
        return;
      }
    }
    rec.status = "SUSPENDIDA";
    rec.reason = motivo.trim();
    rec.amount = 0;
  } else if (selectedOption === "DADA_MITAD") {
    rec.status = "DADA";
    rec.amount = Math.round(valorClase / 2);
    if (!rec.reason) rec.reason = "1 persona";
  } else {
    rec.status = "DADA";
    rec.amount = valorClase;
    if (rec.reason === "1 persona") rec.reason = "";
  }

  rec.time = obtenerDiaLimpioRegistro(rec, group ? group.scheduleText : "");
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
  renderPresencialesModule();
}

function updateRecordAmount(recordId, val) {
  const rec = (appState.presencialesRegistros || []).find(r => r.id === recordId);
  if (!rec) return;
  rec.amount = Math.max(0, parseFloat(val) || 0);
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
  renderPresencialesModule();
}

function updateRecordField(recordId, field, val) {
  const rec = (appState.presencialesRegistros || []).find(r => r.id === recordId);
  if (!rec) return;
  rec[field] = val;
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
}

function deletePresencialRecord(id) {
  appState.presencialesRegistros = (appState.presencialesRegistros || []).filter(r => r.id !== id);
  saveToLocalStorage();
  syncPresencialToSheet({ action: "deletePresencialRecord", id: id });
  renderPresencialesModule();
}

// ============================================================================
// 3. CIERRE DE MES, ESTADO DE PAGO Y ENVÍO POR WHATSAPP
// ============================================================================
function renderLiquidacionView(container) {
  const currentMonth = presencialState.selectedMonth;
  const nombreMes = obtenerNombreMes(currentMonth);
  const m = calcularMetricasMes(currentMonth);

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Cierre Mensual y Envio por WhatsApp (${nombreMes})</span>
        <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
      </div>

      <div class="fin-kpi-grid">
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Total a Facturar (Clases Dadas)</span>
          <span class="fin-kpi-value" style="color:var(--series-green);">$${m.totalGanado.toLocaleString('es-AR')}</span>
          <span class="fin-kpi-sub">${m.cantDadas} clases dadas en ${nombreMes}</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Cobrado vs. Pendiente</span>
          <span class="fin-kpi-value" style="color:var(--accent);">$${m.totalCobrado.toLocaleString('es-AR')}</span>
          <span class="fin-kpi-sub">Falta cobrar: $${m.totalPendiente.toLocaleString('es-AR')}</span>
        </div>
      </div>

      ${m.desgloseGrupos.map(item => `
        <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 12px; background: var(--bg-card);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
            <div>
              <h4 style="margin:0; color:var(--accent);">${escapeHtml(item.group.name)}</h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.group.members)} | ${escapeHtml(item.group.scheduleText)}</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <span style="font-size:0.8rem; color:var(--text-muted);">Dadas: <strong>${item.dadas.length}</strong> | Susp: <strong>${item.suspendidas.length}</strong></span>
              <strong style="color:var(--series-green); font-size:0.95rem;">$${item.subtotal.toLocaleString('es-AR')}</strong>
              <button class="btn ${item.pagado ? 'btn-success' : 'btn-warning'}" style="padding:5px 9px; font-size:0.73rem;" onclick="toggleGroupMonthPaid('${item.group.id}', '${currentMonth}')">
                ${item.pagado ? 'Cobrado' : 'Pendiente'}
              </button>
              <button class="btn btn-primary" style="padding:5px 10px; font-size:0.75rem;" onclick="enviarResumenWhatsApp('${item.group.id}', '${currentMonth}')">
                Enviar WhatsApp
              </button>
            </div>
          </div>

          <div style="font-size:0.79rem; color:var(--text-main); line-height:1.5;">
            <div><strong>Fechas Dadas (${item.dadas.length}):</strong> ${item.dadas.length > 0 ? item.dadas.map(d => {
              const montoD = obtenerMontoRegistro(d, item.valorUnitario);
              const acl = montoD !== item.valorUnitario ? ` [$${montoD.toLocaleString('es-AR')}]` : "";
              return `${formatearFechaSinAnio(d.date)} (${obtenerNombreDiaFecha(d.date)})${acl}`;
            }).join(", ") : "Ninguna"}</div>
            <div><strong>Fechas Suspendidas (${item.suspendidas.length}):</strong> ${item.suspendidas.length > 0 ? item.suspendidas.map(s => `${formatearFechaSinAnio(s.date)} (${s.reason || 'Sin motivo'})`).join(", ") : "Ninguna"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

// ============================================================================
// 4. VISOR GENERAL DE FINANZAS, GRÁFICOS Y AUDITORÍA DE SUSPENSIONES
// ============================================================================
function renderFinanzasView(container) {
  const currentMonth = presencialState.selectedMonth;
  const currentYear = currentMonth.slice(0, 4);
  const nombreMes = obtenerNombreMes(currentMonth);
  const m = calcularMetricasMes(currentMonth);

  const datosAnuales = [];
  let maxFacturacionMes = 1;
  let totalAnualFacturado = 0;
  let totalAnualDadas = 0;
  let totalAnualSuspendidas = 0;
  let mesesConActividad = 0;

  for (let idx = 0; idx < 12; idx++) {
    const ym = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
    const metMes = calcularMetricasMes(ym);
    datosAnuales.push({
      mesIdx: idx,
      label: MESES_CORTOS[idx],
      ym: ym,
      ganado: metMes.totalGanado,
      dadas: metMes.cantDadas,
      suspendidas: metMes.cantSuspendidas
    });
    if (metMes.totalGanado > maxFacturacionMes) maxFacturacionMes = metMes.totalGanado;
    totalAnualFacturado += metMes.totalGanado;
    totalAnualDadas += metMes.cantDadas;
    totalAnualSuspendidas += metMes.cantSuspendidas;
    if (metMes.totalClases > 0) mesesConActividad++;
  }

  const promedioMensual = mesesConActividad > 0 ? Math.round(totalAnualFacturado / mesesConActividad) : 0;

  const motivosMap = {};
  m.desgloseGrupos.forEach(item => {
    item.suspendidas.forEach(s => {
      const mot = (s.reason || "Sin especificar").trim();
      if (!motivosMap[mot]) motivosMap[mot] = { count: 0, monto: 0 };
      motivosMap[mot].count += 1;
      motivosMap[mot].monto += item.valorUnitario;
    });
  });
  const listaMotivos = Object.keys(motivosMap)
    .map(k => ({ motivo: k, count: motivosMap[k].count, monto: motivosMap[k].monto }))
    .sort((a, b) => b.monto - a.monto);

  container.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Visor de Finanzas y Estadisticas (${nombreMes})</span>
        <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
      </div>

      <div class="fin-kpi-grid">
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Lo Ganado en ${nombreMes}</span>
          <span class="fin-kpi-value" style="color:var(--series-green);">$${m.totalGanado.toLocaleString('es-AR')}</span>
          <span class="fin-kpi-sub">${m.cantDadas} clases dadas contabilizadas</span>
        </div>

        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Potencial sin Bajas</span>
          <span class="fin-kpi-value" style="color:var(--accent);">$${m.potencialTotal.toLocaleString('es-AR')}</span>
          <span class="fin-kpi-sub">${m.totalClases} clases programadas en total</span>
        </div>

        <div class="fin-kpi-card">
          <span class="fin-kpi-label">No Percibido (Suspendidas)</span>
          <span class="fin-kpi-value" style="color:var(--series-red);">$${m.totalPerdido.toLocaleString('es-AR')}</span>
          <span class="fin-kpi-sub">${m.cantSuspendidas} clases suspendidas en el mes</span>
        </div>

        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Dadas vs. Suspendidas</span>
          <span class="fin-kpi-value" style="color:${m.efectividadPct >= 80 ? 'var(--series-green)' : (m.efectividadPct >= 60 ? 'var(--series-yellow)' : 'var(--series-red)')};">
            ${m.efectividadPct}% Dictado
          </span>
          <div class="fin-dual-bar">
            <div class="fin-dual-fill-green" style="width:${m.efectividadPct}%;"></div>
            <div class="fin-dual-fill-red" style="width:${m.totalClases > 0 ? (100 - m.efectividadPct) : 0}%;"></div>
          </div>
          <span class="fin-kpi-sub">${m.cantDadas} dadas / ${m.cantSuspendidas} suspendidas</span>
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-size:0.82rem; font-weight:700; color:var(--accent); text-transform:uppercase; margin-bottom:8px;">
          Comparativa por Grupo: Clases Dadas vs. Suspendidas (${nombreMes})
        </div>
        ${m.desgloseGrupos.length === 0 ? `<div style="font-size:0.8rem; color:var(--text-muted);">No hay grupos registrados.</div>` :
        m.desgloseGrupos.map(item => {
          const totG = item.dadas.length + item.suspendidas.length;
          const pctDadas = totG > 0 ? Math.round((item.dadas.length / totG) * 100) : 0;
          const pctSusp = totG > 0 ? (100 - pctDadas) : 0;
          const pesoEnFacturacion = m.totalGanado > 0 ? Math.round((item.subtotal / m.totalGanado) * 100) : 0;

          return `
            <div class="fin-group-row">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
                <div>
                  <strong>${escapeHtml(item.group.name)}</strong>
                  <span style="font-size:0.74rem; color:var(--text-muted); margin-left:6px;">(${item.dadas.length} dadas / ${item.suspendidas.length} susp.)</span>
                </div>
                <div style="font-size:0.84rem;">
                  <strong style="color:var(--series-green);">$${item.subtotal.toLocaleString('es-AR')}</strong>
                  <span style="font-size:0.72rem; color:var(--text-muted); margin-left:4px;">(${pesoEnFacturacion}% del mes)</span>
                </div>
              </div>
              <div class="fin-dual-bar" style="height:12px;">
                <div class="fin-dual-fill-green" style="width:${pctDadas}%;" title="Clases Dadas: ${item.dadas.length}"></div>
                <div class="fin-dual-fill-red" style="width:${pctSusp}%;" title="Suspendidas: ${item.suspendidas.length}"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                <span>Asistencia efectiva: ${pctDadas}%</span>
                <span>No percibido por bajas: $${item.perdido.toLocaleString('es-AR')}</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <div class="card-title" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Evolucion de Facturacion Anual (${currentYear})</span>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          Acumulado ${currentYear}: <strong style="color:var(--series-green);">$${totalAnualFacturado.toLocaleString('es-AR')}</strong> | Promedio/mes: <strong>$${promedioMensual.toLocaleString('es-AR')}</strong>
        </div>
      </div>
      <p style="font-size:0.74rem; color:var(--text-muted); margin-bottom:8px;">
        Toca cualquier columna para abrir el detalle de ese mes (${totalAnualDadas} clases dadas y ${totalAnualSuspendidas} suspendidas en el año).
      </p>
      <div class="fin-year-chart">
        ${datosAnuales.map(d => {
          const alturaPct = d.ganado > 0 ? Math.max(8, Math.round((d.ganado / maxFacturacionMes) * 100)) : 2;
          const montoCorto = d.ganado >= 1000 ? "$" + Math.round(d.ganado / 1000) + "k" : "$0";
          const isCurrent = d.ym === currentMonth;
          return `
            <div class="fin-month-col ${isCurrent ? 'active' : ''}" onclick="presencialState.selectedMonth='${d.ym}'; renderPresencialesModule();" title="${d.ym}: $${d.ganado.toLocaleString('es-AR')} (${d.dadas} dadas / ${d.suspendidas} susp)">
              <span class="fin-month-val">${montoCorto}</span>
              <div class="fin-month-bar-wrap">
                <div class="fin-month-bar" style="height:${alturaPct}%;"></div>
              </div>
              <span class="fin-month-lbl">${d.label}</span>
            </div>
          `;
        }).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        <span>Motivos de Suspension en ${nombreMes}</span>
      </div>
      ${listaMotivos.length === 0 ? `
        <div style="font-size:0.8rem; color:var(--text-muted); padding:6px 0;">
          No hubo clases suspendidas en ${nombreMes}.
        </div>
      ` : `
        <div class="table-responsive">
          <table class="plan-table">
            <thead>
              <tr>
                <th>Motivo Registrado</th>
                <th style="width:130px; text-align:center;">Clases Suspendidas</th>
                <th style="width:150px; text-align:right;">Monto No Percibido ($)</th>
              </tr>
            </thead>
            <tbody>
              ${listaMotivos.map(mItem => `
                <tr>
                  <td><strong>${escapeHtml(mItem.motivo)}</strong></td>
                  <td style="text-align:center;">${mItem.count}</td>
                  <td style="text-align:right; color:var(--series-red); font-weight:700;">$${mItem.monto.toLocaleString('es-AR')}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

// ============================================================================
// MENSAJE DE WHATSAPP LIMPIO (SOPORTA TARIFA FIJA Y TARIFA VARIABLE 20K/40K)
// ============================================================================
function enviarResumenWhatsApp(groupId, yearMonth) {
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const registros = (appState.presencialesRegistros || [])
    .filter(r => r.groupId === group.id && String(r.date || "").startsWith(yearMonth))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const dadas = registros.filter(r => r.status === "DADA");
  const suspendidas = registros.filter(r => r.status === "SUSPENDIDA");
  const valorUnitario = Number(group.price) || 25000;
  const subtotal = dadas.reduce((acc, r) => acc + obtenerMontoRegistro(r, valorUnitario), 0);
  const nombreMes = obtenerNombreMes(yearMonth);

  // Detecta si en el mes hubo días con valor diferente (ej. $20.000 cuando fue 1 persona y $40.000 cuando fueron los 2)
  const tieneMontosVariables = dadas.some(d => obtenerMontoRegistro(d, valorUnitario) !== valorUnitario);

  let mensaje = `Paso las clases del mes de ${nombreMes}:\n\n`;
  mensaje += `*Clases dadas (${dadas.length}):*\n`;
  if (dadas.length > 0) {
    dadas.forEach(d => {
      const diaNombre = obtenerNombreDiaFecha(d.date);
      const montoDia = obtenerMontoRegistro(d, valorUnitario);
      if (tieneMontosVariables) {
        const notaExtra = d.reason ? ` (${d.reason})` : "";
        mensaje += `• ${formatearFechaSinAnio(d.date)} (${diaNombre}) - $${montoDia.toLocaleString('es-AR')}${notaExtra}\n`;
      } else {
        mensaje += `• ${formatearFechaSinAnio(d.date)} (${diaNombre})\n`;
      }
    });
  } else {
    mensaje += `• Sin clases registradas\n`;
  }

  if (suspendidas.length > 0) {
    mensaje += `\n*Clases suspendidas (${suspendidas.length}):*\n`;
    suspendidas.forEach(s => {
      const diaNombre = obtenerNombreDiaFecha(s.date);
      mensaje += `• ${formatearFechaSinAnio(s.date)} (${diaNombre}) - Motivo: ${s.reason || 'Sin especificar'}\n`;
    });
  }

  if (!tieneMontosVariables) {
    mensaje += `\n*Valor por clase:* $${valorUnitario.toLocaleString('es-AR')}`;
  }
  mensaje += `\n*Total a abonar (${dadas.length} clases dadas):* $${subtotal.toLocaleString('es-AR')}`;

  const phoneClean = String(group.phone || "").replace(/\D/g, "");
  const url = phoneClean
    ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(mensaje)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}