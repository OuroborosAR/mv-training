let presencialState = {
  activeTab: "grupos",
  selectedGroupId: "",
  selectedMonth: new Date().toISOString().slice(0, 7)
};

const DIAS_SEMANA_NOMBRES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const PAGOS_STORAGE_KEY = "planificador_presenciales_pagos_v1";

let presencialSyncQueue = [];
let isProcessingPresencialQueue = false;

function syncPresencialToSheet(payload) {
  if (!appState.sheetUrl) return;
  presencialSyncQueue.push(payload);
  processPresencialSyncQueue();
}

async function processPresencialSyncQueue() {
  if (isProcessingPresencialQueue) return;
  isProcessingPresencialQueue = true;

  let processedCount = 0;
  let totalInBatch = presencialSyncQueue.length;

  while (presencialSyncQueue.length > 0) {
    const nextPayload = presencialSyncQueue.shift();
    processedCount++;

    const bodyPayload = Object.assign({}, nextPayload, {
      pin: (typeof currentSession !== "undefined" && currentSession.coachPin) ? currentSession.coachPin : ""
    });

    try {
      if (typeof setCloudStatus === "function") {
        const progressText = totalInBatch > 1 ? ` (${processedCount}/${totalInBatch})` : "...";
        setCloudStatus(`Guardando en Excel${progressText}`, "var(--accent)");
      }
      const res = await fetch(appState.sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (data.status === "ok" && presencialSyncQueue.length === 0 && typeof setCloudStatus === "function") {
        setCloudStatus("Guardado en Excel", "var(--series-green)");
      }
    } catch (err) {
      if (typeof setCloudStatus === "function") setCloudStatus("Guardado local", "var(--series-yellow)");
    }
    totalInBatch = processedCount + presencialSyncQueue.length;
  }

  isProcessingPresencialQueue = false;
}

function normalizarFechaISO(fechaRaw) {
  if (!fechaRaw) return "";
  const str = String(fechaRaw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (str.includes("T00:00:00")) return str.slice(0, 10);

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : str;
}

function construirIdRegistro(groupId, dateISO) {
  return `prec_${groupId}_${normalizarFechaISO(dateISO)}`;
}

function normalizarYDepurarRegistros() {
  if (!Array.isArray(appState.presencialesRegistros)) {
    appState.presencialesRegistros = [];
    return;
  }

  const mapaUnicos = new Map();
  const idsDuplicados = [];
  let huboCambios = false;

  appState.presencialesRegistros.forEach(reg => {
    if (!reg || !reg.groupId) return;
    const fechaLimpia = normalizarFechaISO(reg.date);
    if (!fechaLimpia) return;

    if (reg.date !== fechaLimpia) {
      reg.date = fechaLimpia;
      huboCambios = true;
    }

    const clave = `${reg.groupId}__${fechaLimpia}`;
    if (!mapaUnicos.has(clave)) {
      mapaUnicos.set(clave, reg);
    } else {
      huboCambios = true;
      const existente = mapaUnicos.get(clave);
      if (reg.status === "SUSPENDIDA" && existente.status !== "SUSPENDIDA") {
        existente.status = "SUSPENDIDA";
        existente.reason = reg.reason || existente.reason;
        existente.amount = 0;
      } else if (reg.reason && !existente.reason) {
        existente.reason = reg.reason;
        existente.amount = reg.amount;
      }
      if (reg.id && reg.id !== existente.id) idsDuplicados.push(reg.id);
    }
  });

  if (huboCambios) {
    appState.presencialesRegistros = Array.from(mapaUnicos.values());
    saveToLocalStorage();
    idsDuplicados.forEach(dupId => syncPresencialToSheet({ action: "deletePresencialRecord", id: dupId }));
  }
}

function obtenerNombreMes(yearMonth) {
  if (!yearMonth) return "";
  const partes = String(yearMonth).trim().split("-");
  return partes.length >= 2 ? (MESES_LARGOS[parseInt(partes[1], 10) - 1] || yearMonth) : yearMonth;
}

function formatearFechaSinAnio(fechaISO) {
  const limpia = normalizarFechaISO(fechaISO);
  const partes = String(limpia || "").trim().split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : limpia;
}

function obtenerMontoRegistro(reg, valorBaseGrupo) {
  if (!reg || reg.status !== "DADA") return 0;
  const montoGuardado = Number(reg.amount);
  return montoGuardado > 0 ? montoGuardado : (Number(valorBaseGrupo) || 25000);
}

function getPagosMap() {
  try { return JSON.parse(localStorage.getItem(PAGOS_STORAGE_KEY) || "{}"); } catch (e) { return {}; }
}

function isGroupMonthPaid(groupId, yearMonth) {
  return Boolean(getPagosMap()[`${groupId}_${yearMonth}`]);
}

function toggleGroupMonthPaid(groupId, yearMonth) {
  const map = getPagosMap();
  const key = `${groupId}_${yearMonth}`;
  map[key] = !map[key];
  localStorage.setItem(PAGOS_STORAGE_KEY, JSON.stringify(map));
  renderPresencialesModule();
}

function obtenerNombreDiaFecha(fechaISO) {
  const limpia = normalizarFechaISO(fechaISO);
  const partes = limpia ? limpia.split("-") : [];
  if (partes.length < 3) return "";
  const fechaLocal = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10));
  return isNaN(fechaLocal.getTime()) ? "" : (DIAS_SEMANA_NOMBRES[fechaLocal.getDay()] || "");
}

function obtenerDiaLimpioRegistro(reg, groupScheduleText) {
  const diaCalculado = obtenerNombreDiaFecha(reg.date);
  const guardado = String(reg.time || "").trim();
  if (!guardado) return diaCalculado;
  if (groupScheduleText && guardado.toLowerCase() === String(groupScheduleText).trim().toLowerCase()) return diaCalculado;
  if (guardado.includes(",") || guardado.toLowerCase().includes(" y ")) return diaCalculado;
  return guardado;
}

function getOrCreatePresencialesView() {
  let viewPres = document.getElementById("coach-presenciales-view");
  if (!viewPres) {
    viewPres = document.createElement("section");
    viewPres.id = "coach-presenciales-view";
    viewPres.className = "section-collapsed no-print";
    const mainContainer = document.getElementById("main-container");
    const editorView = document.getElementById("coach-editor-view");
    if (mainContainer && editorView) mainContainer.insertBefore(viewPres, editorView);
    else if (mainContainer) mainContainer.appendChild(viewPres);
  }
  return viewPres;
}

function switchCoachMainTab(tab) {
  const viewPres = getOrCreatePresencialesView();
  document.getElementById("btn-mode-editor")?.classList.toggle("active", tab === "editor");
  document.getElementById("btn-mode-generator")?.classList.toggle("active", tab === "generator");
  document.getElementById("btn-mode-presenciales")?.classList.toggle("active", tab === "presenciales");

  document.getElementById("coach-editor-view")?.classList.toggle("section-collapsed", tab !== "editor");
  document.getElementById("coach-generator-view")?.classList.toggle("section-collapsed", tab !== "generator");
  viewPres?.classList.toggle("section-collapsed", tab !== "presenciales");

  const seriesSection = document.getElementById("weekly-series-section");
  if (seriesSection) {
    if (tab === "presenciales") seriesSection.classList.add("section-collapsed");
    else if (typeof showSeriesPanel !== "undefined" && showSeriesPanel) seriesSection.classList.remove("section-collapsed");
    if (typeof updateHeaderLayoutAndSpacer === "function") updateHeaderLayoutAndSpacer();
  }

  if (tab === "generator" && typeof renderGeneratorUI === "function") renderGeneratorUI();
  else if (tab === "presenciales") renderPresencialesModule();
  else if (tab === "editor" && typeof renderAll === "function") renderAll();
}

function calcularMetricasMes(yearMonth) {
  normalizarYDepurarRegistros();
  const grupos = appState.presencialesGrupos || [];
  const registros = (appState.presencialesRegistros || []).filter(r => normalizarFechaISO(r.date).startsWith(yearMonth));

  let totalGanado = 0, totalPerdido = 0, totalCobrado = 0, totalPendiente = 0, cantDadas = 0, cantSuspendidas = 0;

  const desgloseGrupos = grupos.map(g => {
    const regsGrupo = registros
      .filter(r => r.groupId === g.id)
      .sort((a, b) => normalizarFechaISO(a.date).localeCompare(normalizarFechaISO(b.date)));

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

    return { group: g, dadas, suspendidas, valorUnitario, subtotal: ganadoGrupo, perdido: perdidoGrupo, pagado };
  });

  const totalClases = cantDadas + cantSuspendidas;
  return {
    yearMonth,
    totalGanado,
    totalPerdido,
    potencialTotal: totalGanado + totalPerdido,
    totalCobrado,
    totalPendiente,
    cantDadas,
    cantSuspendidas,
    totalClases,
    efectividadPct: totalClases > 0 ? Math.round((cantDadas / totalClases) * 100) : 0,
    desgloseGrupos
  };
}

function renderPresencialesModule() {
  normalizarYDepurarRegistros();
  const container = getOrCreatePresencialesView();
  if (!container) return;

  const metricas = calcularMetricasMes(presencialState.selectedMonth);
  const nombreMes = obtenerNombreMes(presencialState.selectedMonth);

  container.innerHTML = `
    <div class="control-strip no-print" style="margin-bottom:12px; flex-direction:column; align-items:stretch; gap:10px;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <strong style="font-size:0.85rem; color:var(--accent); text-transform:uppercase;">Gestión de Clases Presenciales</strong>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; font-size:0.78rem;">
          <span>${nombreMes}: <strong style="color:var(--series-green);">$${metricas.totalGanado.toLocaleString("es-AR")}</strong></span>
          <span style="color:var(--text-muted);">|</span>
          <span>Dadas: <strong>${metricas.cantDadas}</strong> / Susp: <strong style="color:var(--series-red);">${metricas.cantSuspendidas}</strong></span>
        </div>
      </div>
      <div class="pres-nav-grid">
        <button class="btn ${presencialState.activeTab === "grupos" ? "btn-primary" : ""}" onclick="switchPresencialTab('grupos')">1. Grupos y Horarios</button>
        <button class="btn ${presencialState.activeTab === "asistencia" ? "btn-primary" : ""}" onclick="switchPresencialTab('asistencia')">2. Registro y Suspensiones</button>
        <button class="btn ${presencialState.activeTab === "liquidacion" ? "btn-primary" : ""}" onclick="switchPresencialTab('liquidacion')">3. Cierre y WhatsApp</button>
        <button class="btn ${presencialState.activeTab === "finanzas" ? "btn-primary" : ""}" onclick="switchPresencialTab('finanzas')">4. Visor de Finanzas</button>
      </div>
    </div>
    <div id="presenciales-content-area"></div>
  `;

  const contentArea = document.getElementById("presenciales-content-area");
  if (presencialState.activeTab === "grupos") renderGruposView(contentArea);
  else if (presencialState.activeTab === "asistencia") renderAsistenciaView(contentArea);
  else if (presencialState.activeTab === "liquidacion") renderLiquidacionView(contentArea);
  else renderFinanzasView(contentArea);
}

function switchPresencialTab(tab) {
  presencialState.activeTab = tab;
  renderPresencialesModule();
}

function renderGruposView(container) {
  const grupos = appState.presencialesGrupos || [];

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title"><span id="p-grp-form-title">Nuevo Grupo o Personalizado Presencial</span></div>
      <input type="hidden" id="p-grp-edit-id" value="">
      <div class="client-form" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
        <div class="form-group">
          <label>Nombre del Grupo / Alumno</label>
          <input type="text" id="p-grp-name" placeholder="Ej: Grupo Carregal">
        </div>
        <div class="form-group">
          <label>Integrantes</label>
          <input type="text" id="p-grp-members" placeholder="Clara, Santi, Ale...">
        </div>
        <div class="form-group">
          <label>Dias y Horarios</label>
          <input type="text" id="p-grp-schedule" placeholder="Lunes, Miercoles y Viernes 7:00">
        </div>
        <div class="form-group">
          <label>Valor por Clase ($)</label>
          <input type="number" id="p-grp-price" value="25000">
        </div>
        <div class="form-group">
          <label>WhatsApp</label>
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
      <div style="margin-top:10px; display:flex; justify-content:flex-end; gap:8px; flex-wrap:wrap;">
        <button class="btn" id="btn-cancel-grp-edit" style="display:none;" onclick="renderPresencialesModule()">Cancelar</button>
        <button class="btn btn-success" id="btn-save-grp" onclick="savePresencialGroupFromUI()">Guardar Grupo</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span>Grilla de Grupos (${grupos.length})</span></div>
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
            ${grupos.length === 0 ? `<tr><td colspan="7" style="text-align:center; padding:15px; color:var(--text-muted);">No hay grupos cargados.</td></tr>` :
            grupos.map(g => `
              <tr>
                <td><strong>${escapeHtml(g.name)}</strong></td>
                <td>${escapeHtml(g.members)}</td>
                <td>${escapeHtml(g.scheduleText)}</td>
                <td>$${Number(g.price || 25000).toLocaleString("es-AR")}</td>
                <td>${escapeHtml(g.phone)}</td>
                <td><span class="tag-pattern" style="background:${g.status === "ACTIVO" ? "var(--series-green)" : "var(--series-red)"}; color:#fff;">${g.status}</span></td>
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
  if (!name) return alert("Ingresa el nombre del grupo o alumno.");

  const editId = document.getElementById("p-grp-edit-id").value.trim();
  const groupObj = {
    id: editId || ("pgrp_" + Date.now()),
    name,
    members: document.getElementById("p-grp-members").value.trim(),
    scheduleText: document.getElementById("p-grp-schedule").value.trim(),
    price: parseFloat(document.getElementById("p-grp-price").value) || 25000,
    phone: document.getElementById("p-grp-phone").value.trim(),
    status: document.getElementById("p-grp-status").value,
    updatedAt: new Date().toLocaleDateString(),
    schedule: {}
  };

  if (!appState.presencialesGrupos) appState.presencialesGrupos = [];
  const idx = appState.presencialesGrupos.findIndex(g => g.id === groupObj.id);
  if (idx !== -1) appState.presencialesGrupos[idx] = groupObj;
  else appState.presencialesGrupos.push(groupObj);

  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialGroup", group: groupObj });
  renderPresencialesModule();
}

function deletePresencialGroup(id) {
  if (!confirm("¿Eliminar este grupo de presenciales?")) return;
  appState.presencialesGrupos = (appState.presencialesGrupos || []).filter(g => g.id !== id);
  saveToLocalStorage();
  syncPresencialToSheet({ action: "deletePresencialGroup", id });
  renderPresencialesModule();
}

function selectGroupForAttendance(groupId) {
  presencialState.selectedGroupId = groupId;
  presencialState.activeTab = "asistencia";
  renderPresencialesModule();
}

function renderAsistenciaView(container) {
  const grupos = appState.presencialesGrupos || [];
  if (grupos.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:20px;">Primero debes crear al menos un grupo en la pestaña 1.</div>`;
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
    .filter(r => r.groupId === currentGroup.id && normalizarFechaISO(r.date).startsWith(currentMonth))
    .sort((a, b) => normalizarFechaISO(a.date).localeCompare(normalizarFechaISO(b.date)));

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title">
        <span>Registro: ${escapeHtml(currentGroup.name)} (${escapeHtml(currentGroup.scheduleText)})</span>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select onchange="presencialState.selectedGroupId=this.value; renderPresencialesModule();" style="padding:6px 8px;">
            ${grupos.map(g => `<option value="${g.id}" ${g.id === currentGroup.id ? "selected" : ""}>${escapeHtml(g.name)}</option>`).join("")}
          </select>
          <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
        </div>
      </div>

      <div style="margin-bottom:10px; display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="generarFechasMesAutomaticas('${currentGroup.id}', '${currentMonth}')">+ Generar Mes</button>
        <button class="btn" onclick="generarFechasAnioAutomaticas('${currentGroup.id}', '${currentMonth.slice(0, 4)}')">+ Generar Año (${currentMonth.slice(0, 4)})</button>
        <button class="btn btn-success" onclick="agregarClaseExtraIndividual('${currentGroup.id}', '${currentMonth}')">+ Fecha Puntual</button>
        <button class="btn btn-danger" onclick="limpiarFechasMesGrupo('${currentGroup.id}', '${currentMonth}')">Vaciar Mes</button>
      </div>

      <div class="table-responsive">
        <table class="plan-table">
          <thead>
            <tr>
              <th style="width:90px;">Fecha</th>
              <th style="width:120px;">Dia</th>
              <th style="width:210px;">Estado</th>
              <th>Motivo / Nota</th>
              <th style="width:120px; text-align:center;">Valor ($)</th>
              <th style="width:65px;">Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${registrosMes.length === 0 ? `<tr><td colspan="6" style="text-align:center; padding:15px; color:var(--text-muted);">No hay fechas cargadas en ${currentMonth}.</td></tr>` :
            registrosMes.map(reg => {
              const diaMostrar = obtenerDiaLimpioRegistro(reg, currentGroup.scheduleText);
              const montoActual = obtenerMontoRegistro(reg, valorBase);
              const esMitad = reg.status === "DADA" && montoActual === valorMitad && valorBase !== valorMitad;
              return `
              <tr>
                <td><strong>${escapeHtml(formatearFechaSinAnio(reg.date))}</strong></td>
                <td><input type="text" class="input-full" value="${escapeHtml(diaMostrar)}" onchange="updateRecordField('${reg.id}', 'time', this.value)"></td>
                <td>
                  <select class="input-full" onchange="handleEstadoClaseChange('${reg.id}', this.value)">
                    <option value="DADA" ${reg.status === "DADA" && !esMitad ? "selected" : ""}>Clase Dada ($${valorBase.toLocaleString("es-AR")})</option>
                    <option value="DADA_MITAD" ${esMitad ? "selected" : ""}>1 Persona / Mitad ($${valorMitad.toLocaleString("es-AR")})</option>
                    <option value="SUSPENDIDA" ${reg.status === "SUSPENDIDA" ? "selected" : ""}>Suspendida ($0)</option>
                  </select>
                </td>
                <td><input type="text" class="input-full" id="reason_${reg.id}" value="${escapeHtml(reg.reason || "")}" placeholder="Motivo o nota..." onchange="updateRecordField('${reg.id}', 'reason', this.value)"></td>
                <td style="text-align:center;">
                  <input type="number" class="input-full" style="text-align:center; font-weight:700; color:${reg.status === "DADA" ? "var(--series-green)" : "var(--text-muted)"};" value="${montoActual}" ${reg.status === "SUSPENDIDA" ? "disabled" : ""} onchange="updateRecordAmount('${reg.id}', this.value)">
                </td>
                <td style="text-align:center;">
                  <button class="btn btn-danger" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePresencialRecord('${reg.id}')">X</button>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function detectarDiasSemana(texto) {
  const textLower = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const days = [];
  if (/\b(lunes|lun)\b/.test(textLower)) days.push(1);
  if (/\b(martes|mar)\b/.test(textLower)) days.push(2);
  if (/\b(miercoles|mie)\b/.test(textLower)) days.push(3);
  if (/\b(jueves|jue)\b/.test(textLower)) days.push(4);
  if (/\b(viernes|vie)\b/.test(textLower)) days.push(5);
  if (/\b(sabado|sab)\b/.test(textLower)) days.push(6);
  if (/\b(domingo|dom)\b/.test(textLower)) days.push(0);
  return days;
}

function generarFechasMesAutomaticas(groupId, yearMonth, silent = false) {
  normalizarYDepurarRegistros();
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const targetDays = detectarDiasSemana(group.scheduleText);
  if (targetDays.length === 0) {
    if (!silent) alert("En 'Dias y Horarios' escribi los dias (ej: Lunes, Miercoles y Viernes 7:00).");
    return;
  }

  const [yStr, mStr] = yearMonth.split("-");
  const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
  const month = date.getMonth();
  const addedRecords = [];

  if (!appState.presencialesRegistros) appState.presencialesRegistros = [];

  while (date.getMonth() === month) {
    if (targetDays.includes(date.getDay())) {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const existe = appState.presencialesRegistros.some(r => r.groupId === group.id && normalizarFechaISO(r.date) === dateString);
      if (!existe) {
        const rec = {
          id: construirIdRegistro(group.id, dateString),
          groupId: group.id,
          groupName: group.name,
          date: dateString,
          time: obtenerNombreDiaFecha(dateString),
          status: "DADA",
          reason: "",
          attendance: group.members || "Presente",
          amount: Number(group.price) || 25000,
          updatedAt: new Date().toLocaleDateString()
        };
        appState.presencialesRegistros.push(rec);
        addedRecords.push(rec);
      }
    }
    date.setDate(date.getDate() + 1);
  }

  if (addedRecords.length === 0) {
    if (!silent) alert("Ya estaban generadas todas las fechas de este mes.");
    return;
  }

  saveToLocalStorage();
  addedRecords.forEach(rec => syncPresencialToSheet({ action: "savePresencialRecord", record: rec }));
  if (!silent) renderPresencialesModule();
}

function generarFechasAnioAutomaticas(groupId, yearStr) {
  if (!confirm(`¿Generar automáticamente todas las fechas del año ${yearStr} para este grupo?`)) return;
  for (let m = 1; m <= 12; m++) generarFechasMesAutomaticas(groupId, `${yearStr}-${String(m).padStart(2, "0")}`, true);
  renderPresencialesModule();
}

function limpiarFechasMesGrupo(groupId, yearMonth) {
  if (!confirm(`¿Eliminar todas las fechas cargadas en ${obtenerNombreMes(yearMonth)} (${yearMonth})?`)) return;
  const aBorrar = (appState.presencialesRegistros || []).filter(r => r.groupId === groupId && normalizarFechaISO(r.date).startsWith(yearMonth));
  appState.presencialesRegistros = (appState.presencialesRegistros || []).filter(r => !(r.groupId === groupId && normalizarFechaISO(r.date).startsWith(yearMonth)));
  saveToLocalStorage();
  aBorrar.forEach(r => syncPresencialToSheet({ action: "deletePresencialRecord", id: r.id }));
  renderPresencialesModule();
}

function agregarClaseExtraIndividual(groupId, yearMonth) {
  normalizarYDepurarRegistros();
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const fechaStr = prompt("Ingresa la fecha (YYYY-MM-DD):", yearMonth + "-01");
  if (!fechaStr) return;

  const cleanDate = normalizarFechaISO(fechaStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) return alert("Formato inválido. Usa YYYY-MM-DD.");

  if (!appState.presencialesRegistros) appState.presencialesRegistros = [];
  if (appState.presencialesRegistros.some(r => r.groupId === group.id && normalizarFechaISO(r.date) === cleanDate)) {
    return alert("Esa fecha ya está registrada.");
  }

  const newRec = {
    id: construirIdRegistro(group.id, cleanDate),
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
    let motivo = document.getElementById(`reason_${recordId}`)?.value.trim() || rec.reason || "";
    if (!motivo || motivo === "1 persona") {
      motivo = prompt("Motivo de suspensión (Obligatorio):", "") || "";
      if (!motivo.trim()) {
        alert("Debes ingresar un motivo.");
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

  rec.date = normalizarFechaISO(rec.date);
  rec.time = obtenerDiaLimpioRegistro(rec, group ? group.scheduleText : "");
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
  renderPresencialesModule();
}

function updateRecordAmount(recordId, val) {
  const rec = (appState.presencialesRegistros || []).find(r => r.id === recordId);
  if (!rec) return;
  rec.date = normalizarFechaISO(rec.date);
  rec.amount = Math.max(0, parseFloat(val) || 0);
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
  renderPresencialesModule();
}

function updateRecordField(recordId, field, val) {
  const rec = (appState.presencialesRegistros || []).find(r => r.id === recordId);
  if (!rec) return;
  rec.date = normalizarFechaISO(rec.date);
  rec[field] = val;
  rec.updatedAt = new Date().toLocaleDateString();
  saveToLocalStorage();
  syncPresencialToSheet({ action: "savePresencialRecord", record: rec });
}

function deletePresencialRecord(id) {
  const target = (appState.presencialesRegistros || []).find(r => r.id === id);
  const targetDate = target ? normalizarFechaISO(target.date) : "";
  const targetGroup = target ? target.groupId : "";

  const toDelete = (appState.presencialesRegistros || []).filter(
    r => r.id === id || (targetDate && r.groupId === targetGroup && normalizarFechaISO(r.date) === targetDate)
  );

  appState.presencialesRegistros = (appState.presencialesRegistros || []).filter(r => !toDelete.some(d => d.id === r.id));
  saveToLocalStorage();
  toDelete.forEach(d => syncPresencialToSheet({ action: "deletePresencialRecord", id: d.id }));
  renderPresencialesModule();
}

function renderLiquidacionView(container) {
  const currentMonth = presencialState.selectedMonth;
  const nombreMes = obtenerNombreMes(currentMonth);
  const m = calcularMetricasMes(currentMonth);

  container.innerHTML = `
    <div class="card" style="margin-bottom:15px;">
      <div class="card-title">
        <span>Cierre Mensual y WhatsApp (${nombreMes})</span>
        <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
      </div>

      <div class="fin-kpi-grid">
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Total a Facturar</span>
          <span class="fin-kpi-value" style="color:var(--series-green);">$${m.totalGanado.toLocaleString("es-AR")}</span>
          <span class="fin-kpi-sub">${m.cantDadas} clases dadas en ${nombreMes}</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Cobrado vs. Pendiente</span>
          <span class="fin-kpi-value" style="color:var(--accent);">$${m.totalCobrado.toLocaleString("es-AR")}</span>
          <span class="fin-kpi-sub">Falta cobrar: $${m.totalPendiente.toLocaleString("es-AR")}</span>
        </div>
      </div>

      ${m.desgloseGrupos.map(item => `
        <div style="border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:12px; background:var(--bg-input);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
            <div>
              <h4 style="margin:0; color:var(--accent);">${escapeHtml(item.group.name)}</h4>
              <span style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.group.members)} | ${escapeHtml(item.group.scheduleText)}</span>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
              <span style="font-size:0.8rem; color:var(--text-muted);">Dadas: <strong>${item.dadas.length}</strong> | Susp: <strong>${item.suspendidas.length}</strong></span>
              <strong style="color:var(--series-green); font-size:0.95rem;">$${item.subtotal.toLocaleString("es-AR")}</strong>
              <button class="btn ${item.pagado ? "btn-success" : "btn-warning"}" style="padding:5px 9px; font-size:0.73rem;" onclick="toggleGroupMonthPaid('${item.group.id}', '${currentMonth}')">${item.pagado ? "Cobrado" : "Pendiente"}</button>
              <button class="btn btn-primary" style="padding:5px 10px; font-size:0.75rem;" onclick="enviarResumenWhatsApp('${item.group.id}', '${currentMonth}')">WhatsApp</button>
            </div>
          </div>

          <div style="font-size:0.79rem; color:var(--text-main); line-height:1.5;">
            <div><strong>Dadas (${item.dadas.length}):</strong> ${item.dadas.length > 0 ? item.dadas.map(d => {
              const montoD = obtenerMontoRegistro(d, item.valorUnitario);
              return `${formatearFechaSinAnio(d.date)} (${obtenerNombreDiaFecha(d.date)})${montoD !== item.valorUnitario ? ` [$${montoD.toLocaleString("es-AR")}]` : ""}`;
            }).join(", ") : "Ninguna"}</div>
            <div><strong>Suspendidas (${item.suspendidas.length}):</strong> ${item.suspendidas.length > 0 ? item.suspendidas.map(s => `${formatearFechaSinAnio(s.date)} (${s.reason || "Sin motivo"})`).join(", ") : "Ninguna"}</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFinanzasView(container) {
  const currentMonth = presencialState.selectedMonth;
  const currentYear = currentMonth.slice(0, 4);
  const nombreMes = obtenerNombreMes(currentMonth);
  const m = calcularMetricasMes(currentMonth);

  const datosAnuales = [];
  let maxFacturacionMes = 1, totalAnualFacturado = 0, totalAnualDadas = 0, totalAnualSuspendidas = 0, mesesConActividad = 0;

  for (let idx = 0; idx < 12; idx++) {
    const ym = `${currentYear}-${String(idx + 1).padStart(2, "0")}`;
    const metMes = calcularMetricasMes(ym);
    datosAnuales.push({ label: MESES_CORTOS[idx], ym, ganado: metMes.totalGanado, dadas: metMes.cantDadas, suspendidas: metMes.cantSuspendidas });
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
      motivosMap[mot].count++;
      motivosMap[mot].monto += item.valorUnitario;
    });
  });
  const listaMotivos = Object.keys(motivosMap).map(k => ({ motivo: k, count: motivosMap[k].count, monto: motivosMap[k].monto })).sort((a, b) => b.monto - a.monto);

  container.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div class="card-title">
        <span>Visor de Finanzas (${nombreMes})</span>
        <input type="month" value="${currentMonth}" onchange="presencialState.selectedMonth=this.value; renderPresencialesModule();" style="padding:6px 8px;">
      </div>

      <div class="fin-kpi-grid">
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Ganado en ${nombreMes}</span>
          <span class="fin-kpi-value" style="color:var(--series-green);">$${m.totalGanado.toLocaleString("es-AR")}</span>
          <span class="fin-kpi-sub">${m.cantDadas} clases dadas</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Potencial sin Bajas</span>
          <span class="fin-kpi-value" style="color:var(--accent);">$${m.potencialTotal.toLocaleString("es-AR")}</span>
          <span class="fin-kpi-sub">${m.totalClases} programadas</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">No Percibido</span>
          <span class="fin-kpi-value" style="color:var(--series-red);">$${m.totalPerdido.toLocaleString("es-AR")}</span>
          <span class="fin-kpi-sub">${m.cantSuspendidas} suspendidas</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Efectividad</span>
          <span class="fin-kpi-value" style="color:${m.efectividadPct >= 80 ? "var(--series-green)" : (m.efectividadPct >= 60 ? "var(--series-yellow)" : "var(--series-red)")};">${m.efectividadPct}%</span>
          <div class="fin-dual-bar">
            <div class="fin-dual-fill-green" style="width:${m.efectividadPct}%;"></div>
            <div class="fin-dual-fill-red" style="width:${m.totalClases > 0 ? 100 - m.efectividadPct : 0}%;"></div>
          </div>
          <span class="fin-kpi-sub">${m.cantDadas} dadas / ${m.cantSuspendidas} susp.</span>
        </div>
      </div>

      <div style="margin-top:16px;">
        <div style="font-size:0.8rem; font-weight:700; color:var(--accent); text-transform:uppercase; margin-bottom:8px;">Comparativa por Grupo (${nombreMes})</div>
        ${m.desgloseGrupos.map(item => {
          const totG = item.dadas.length + item.suspendidas.length;
          const pctDadas = totG > 0 ? Math.round((item.dadas.length / totG) * 100) : 0;
          const peso = m.totalGanado > 0 ? Math.round((item.subtotal / m.totalGanado) * 100) : 0;
          return `
            <div class="fin-group-row">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:4px;">
                <div><strong>${escapeHtml(item.group.name)}</strong> <span style="font-size:0.74rem; color:var(--text-muted);">(${item.dadas.length} dadas / ${item.suspendidas.length} susp.)</span></div>
                <div style="font-size:0.84rem;"><strong style="color:var(--series-green);">$${item.subtotal.toLocaleString("es-AR")}</strong> <span style="font-size:0.72rem; color:var(--text-muted);">(${peso}%)</span></div>
              </div>
              <div class="fin-dual-bar" style="height:10px;">
                <div class="fin-dual-fill-green" style="width:${pctDadas}%;"></div>
                <div class="fin-dual-fill-red" style="width:${totG > 0 ? 100 - pctDadas : 0}%;"></div>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-top:4px;">
                <span>Asistencia: ${pctDadas}%</span>
                <span>No percibido: $${item.perdido.toLocaleString("es-AR")}</span>
              </div>
            </div>`;
        }).join("")}
      </div>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <div class="card-title">
        <span>Facturacion Anual (${currentYear})</span>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          Acumulado: <strong style="color:var(--series-green);">$${totalAnualFacturado.toLocaleString("es-AR")}</strong> | Promedio/mes: <strong>$${promedioMensual.toLocaleString("es-AR")}</strong>
        </div>
      </div>
      <div class="fin-year-chart">
        ${datosAnuales.map(d => {
          const alturaPct = d.ganado > 0 ? Math.max(8, Math.round((d.ganado / maxFacturacionMes) * 100)) : 2;
          const montoCorto = d.ganado >= 1000 ? "$" + Math.round(d.ganado / 1000) + "k" : "$0";
          return `
            <div class="fin-month-col ${d.ym === currentMonth ? "active" : ""}" onclick="presencialState.selectedMonth='${d.ym}'; renderPresencialesModule();" title="${d.ym}: $${d.ganado.toLocaleString("es-AR")}">
              <span class="fin-month-val">${montoCorto}</span>
              <div class="fin-month-bar-wrap"><div class="fin-month-bar" style="height:${alturaPct}%;"></div></div>
              <span class="fin-month-lbl">${d.label}</span>
            </div>`;
        }).join("")}
      </div>
    </div>

    <div class="card">
      <div class="card-title"><span>Motivos de Suspension (${nombreMes})</span></div>
      ${listaMotivos.length === 0 ? `<div style="font-size:0.8rem; color:var(--text-muted);">No hubo clases suspendidas.</div>` : `
        <div class="table-responsive">
          <table class="plan-table">
            <thead><tr><th>Motivo</th><th style="width:130px; text-align:center;">Cantidad</th><th style="width:150px; text-align:right;">No Percibido ($)</th></tr></thead>
            <tbody>
              ${listaMotivos.map(mItem => `
                <tr>
                  <td><strong>${escapeHtml(mItem.motivo)}</strong></td>
                  <td style="text-align:center;">${mItem.count}</td>
                  <td style="text-align:right; color:var(--series-red); font-weight:700;">$${mItem.monto.toLocaleString("es-AR")}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`}
    </div>
  `;
}

function enviarResumenWhatsApp(groupId, yearMonth) {
  normalizarYDepurarRegistros();
  const group = (appState.presencialesGrupos || []).find(g => g.id === groupId);
  if (!group) return;

  const registros = (appState.presencialesRegistros || [])
    .filter(r => r.groupId === group.id && normalizarFechaISO(r.date).startsWith(yearMonth))
    .sort((a, b) => normalizarFechaISO(a.date).localeCompare(normalizarFechaISO(b.date)));

  const dadas = registros.filter(r => r.status === "DADA");
  const suspendidas = registros.filter(r => r.status === "SUSPENDIDA");
  const valorUnitario = Number(group.price) || 25000;
  const subtotal = dadas.reduce((acc, r) => acc + obtenerMontoRegistro(r, valorUnitario), 0);
  const tieneVariables = dadas.some(d => obtenerMontoRegistro(d, valorUnitario) !== valorUnitario);

  let mensaje = `Paso las clases del mes de ${obtenerNombreMes(yearMonth)}:\n\n*Clases dadas (${dadas.length}):*\n`;
  if (dadas.length > 0) {
    dadas.forEach(d => {
      const montoDia = obtenerMontoRegistro(d, valorUnitario);
      const extra = tieneVariables ? ` - $${montoDia.toLocaleString("es-AR")}${d.reason ? ` (${d.reason})` : ""}` : "";
      mensaje += `• ${formatearFechaSinAnio(d.date)} (${obtenerNombreDiaFecha(d.date)})${extra}\n`;
    });
  } else {
    mensaje += `• Sin clases registradas\n`;
  }

  if (suspendidas.length > 0) {
    mensaje += `\n*Clases suspendidas (${suspendidas.length}):*\n`;
    suspendidas.forEach(s => {
      mensaje += `• ${formatearFechaSinAnio(s.date)} (${obtenerNombreDiaFecha(s.date)}) - Motivo: ${s.reason || "Sin especificar"}\n`;
    });
  }

  if (!tieneVariables) mensaje += `\n*Valor por clase:* $${valorUnitario.toLocaleString("es-AR")}`;
  mensaje += `\n*Total a abonar (${dadas.length} clases dadas):* $${subtotal.toLocaleString("es-AR")}`;

  const phoneClean = String(group.phone || "").replace(/\D/g, "");
  window.open(
    phoneClean
      ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(mensaje)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`,
    "_blank"
  );
}