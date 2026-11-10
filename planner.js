// =========================================================================
// PLANNER.JS: GRILLA DE ENTRENAMIENTO, SERIES SEMANALES, PROGRESION Y PDF
// =========================================================================

function renderWeeklySeries() {
  const c = { RODILLA: 0, CADERA: 0, EMPUJE_H: 0, EMPUJE_V: 0, TRACCION_H: 0, TRACCION_V: 0, TRANSPORTE: 0, CORE: 0 };
  appState.days.forEach(d => {
    (d.blocks.str || []).forEach(r => { if (c[r.pattern] !== undefined) c[r.pattern] += (parseInt(r.sets) || 0); });
    (d.blocks.core || []).forEach(r => { if (c[r.pattern] !== undefined) c[r.pattern] += (parseInt(r.sets) || 0); });
  });
  const piernas = c.RODILLA + c.CADERA;
  const torso = c.EMPUJE_H + c.EMPUJE_V + c.TRACCION_H + c.TRACCION_V;
  const getCol = (s, macro) => s === 0 ? "#475569" : macro
    ? (s < 12 ? "var(--series-blue)" : s <= 15 ? "var(--series-green)" : s <= 20 ? "var(--series-yellow)" : "var(--series-red)")
    : (s <= 6 ? "var(--series-blue)" : s <= 10 ? "var(--series-green)" : "var(--series-yellow)");

  const items = [
    { t: "Tren Inferior", s: piernas, m: 20, macro: true },
    { t: "Tren Superior", s: torso, m: 20, macro: true },
    { t: "Rodilla", s: c.RODILLA, m: 12, macro: false },
    { t: "Cadera", s: c.CADERA, m: 12, macro: false },
    { t: "Empujes", s: c.EMPUJE_H + c.EMPUJE_V, m: 12, macro: false },
    { t: "Tracciones", s: c.TRACCION_H + c.TRACCION_V, m: 12, macro: false },
    { t: "Core / Transporte", s: c.CORE + c.TRANSPORTE, m: 16, macro: false }
  ];

  const container = document.getElementById("weekly-series-container");
  if (!container) return;

  container.innerHTML = items.map(i => {
    const col = getCol(i.s, i.macro);
    return `<div class="series-card ${i.macro ? 'highlight-group' : ''}">
      <div class="series-top"><span>${i.t}</span><span style="color:${col}">${i.s} / ${i.m}</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, (i.s / i.m) * 100)}%;background:${col}"></div></div>
    </div>`;
  }).join("");
}

function renderDayTabs() {
  const container = document.getElementById("day-tabs-container");
  if (!container) return;

  container.innerHTML = appState.days.map((d, i) => `
    <div style="display:inline-flex;">
      <button class="tab-btn ${i === appState.activeDayIndex ? 'active' : ''}" onclick="appState.activeDayIndex=${i};renderAll();">${d.title}</button>
      ${appState.days.length > 1 ? `<button class="btn-danger" style="border:none;padding:3px 7px;cursor:pointer;font-size:0.72rem;" onclick="removeDay(${i})">X</button>` : ''}
    </div>
  `).join("");
}

function addDay() {
  appState.days.push(createDefaultDay(appState.days.length + 1));
  appState.activeDayIndex = appState.days.length - 1;
  renderAll();
}

function removeDay(idx) {
  if (!confirm("¿Eliminar este dia?")) return;
  appState.days.splice(idx, 1);
  appState.days.forEach((d, i) => d.title = `Dia ${i + 1}`);
  appState.activeDayIndex = Math.max(0, appState.activeDayIndex - 1);
  renderAll();
}

function saveDayFocus() {
  appState.days[appState.activeDayIndex].focus = document.getElementById("day-focus-input").value;
  saveToLocalStorage();
}

function renderBlocks() {
  const day = appState.days[appState.activeDayIndex];
  if (!day) return;

  document.getElementById("current-day-title").textContent = day.title;
  document.getElementById("day-focus-input").value = day.focus || "";

  document.getElementById("blocks-container").innerHTML = BLOCK_DEFINITIONS.map(b => {
    const rows = day.blocks[b.key] || [];
    return `<div class="workout-block ${b.cssClass}">
      <div class="block-header">
        <span>${b.title}</span>
        <button class="btn no-print" onclick="addRow('${b.key}','${b.defaultPattern}')">+ Agregar Ejercicio</button>
      </div>
      <div class="table-responsive">
        <table class="plan-table">
          <thead>
            <tr>
              <th style="width:52px;">Ord</th>
              <th class="col-ex">Ejercicio</th>
              <th style="width:165px;">Patron (Interno)</th>
              <th style="width:58px;">Series</th>
              <th style="width:76px;">Reps</th>
              <th style="width:76px;">Carga/Int</th>
              <th style="width:64px;">Pausa</th>
              <th class="week-col">Sem 1</th>
              <th class="week-col">Sem 2</th>
              <th class="week-col">Sem 3</th>
              <th class="week-col">Sem 4</th>
              <th class="no-print" style="width:42px;"></th>
            </tr>
          </thead>
          <tbody>
            ${rows.length === 0 ? `<tr><td colspan="12" style="text-align:center;color:var(--text-muted);padding:12px;">Sin ejercicios cargados.</td></tr>` :
            rows.map((r, rIdx) => `<tr>
              <td><input class="input-sm" value="${escapeHtml(r.order)}" oninput="updateCell('${b.key}',${rIdx},'order',this.value)"></td>
              <td class="col-ex">
                <div style="display:flex;gap:4px;align-items:center;">
                  <input class="input-exercise-name" value="${escapeHtml(r.name)}" placeholder="Escribir o editar ejercicio..." oninput="updateCell('${b.key}',${rIdx},'name',this.value)">
                  <button class="btn btn-icon-action no-print" title="Rotar por otro ejercicio del mismo patrón" onclick="rotateRowExercise('${b.key}',${rIdx})">Rotar</button>
                  <button class="btn btn-icon-action no-print" title="Guardar este nombre en la Biblioteca" onclick="quickSaveRowExercise('${b.key}',${rIdx})">+</button>
                </div>
              </td>
              <td><select class="input-full" style="min-width:145px;" onchange="updateCell('${b.key}',${rIdx},'pattern',this.value)">${buildPatternOptions(r.pattern)}</select></td>
              <td><input type="number" class="input-sm" value="${r.sets}" oninput="updateCell('${b.key}',${rIdx},'sets',this.value)"></td>
              <td><input class="input-md" value="${escapeHtml(r.reps)}" oninput="updateCell('${b.key}',${rIdx},'reps',this.value)"></td>
              <td><input class="input-md" value="${escapeHtml(r.rpe)}" oninput="updateCell('${b.key}',${rIdx},'rpe',this.value)"></td>
              <td><input class="input-sm" value="${escapeHtml(r.rest)}" oninput="updateCell('${b.key}',${rIdx},'rest',this.value)"></td>
              <td class="week-cell"><input class="input-md" value="${escapeHtml(r.w1)}" oninput="updateCell('${b.key}',${rIdx},'w1',this.value)"></td>
              <td class="week-cell"><input class="input-md" value="${escapeHtml(r.w2)}" oninput="updateCell('${b.key}',${rIdx},'w2',this.value)"></td>
              <td class="week-cell"><input class="input-md" value="${escapeHtml(r.w3)}" oninput="updateCell('${b.key}',${rIdx},'w3',this.value)"></td>
              <td class="week-cell"><input class="input-md" value="${escapeHtml(r.w4)}" oninput="updateCell('${b.key}',${rIdx},'w4',this.value)"></td>
              <td class="no-print"><button class="btn btn-danger" style="padding:5px 9px;" onclick="deleteRow('${b.key}',${rIdx})">X</button></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
  }).join("");
}

function updateCell(bKey, rIdx, field, val) {
  const row = appState.days[appState.activeDayIndex].blocks[bKey][rIdx];
  row[field] = field === "sets" ? (parseInt(val) || 0) : val;
  if (field === "sets" || field === "pattern") renderWeeklySeries();
  saveToLocalStorage();
}

function addRow(bKey, pat, name = "") {
  const def = NASM_PHASES[appState.meta.nasmPhase || "3"].def;
  const list = appState.days[appState.activeDayIndex].blocks[bKey];
  list.push({
    order: bKey === "str" ? `B${list.length + 1}` : `${list.length + 1}`,
    name,
    pattern: pat,
    sets: bKey === "str" ? def.sets : 2,
    reps: def.reps,
    rpe: def.rpe,
    rest: def.rest,
    w1: "", w2: "", w3: "", w4: ""
  });
  renderAll();
}

function deleteRow(bKey, rIdx) {
  appState.days[appState.activeDayIndex].blocks[bKey].splice(rIdx, 1);
  renderAll();
}

function applyProgression(pct) {
  const step = parseFloat(document.getElementById("rounding-select").value) || 1;
  const rate = pct / 100;
  appState.days.forEach(d => Object.values(d.blocks).forEach(list => list.forEach(r => {
    const base = parseFloat(String(r.w1).replace(",", "."));
    if (!isNaN(base) && base > 0) {
      r.w2 = String(Math.round((base * (1 + rate)) / step) * step);
      r.w3 = String(Math.round((base * (1 + rate * 2)) / step) * step);
      r.w4 = String(Math.round((base * (1 + rate * 3)) / step) * step);
    }
  })));
  renderAll();
}

function buildPrintAllDaysView() {
  const buildClientBannerHtml = () => `
    <div class="print-page-client-banner">
      <div class="print-banner-left">
        <span class="print-banner-title">Plan de Entrenamiento</span>
        <span class="print-banner-client">Alumno/a: ${escapeHtml(appState.meta.clientName || "-")}</span>
      </div>
      <div class="print-banner-meta">
        ${appState.meta.coachName ? `<span><strong>Entrenador:</strong> ${escapeHtml(appState.meta.coachName)}</span>` : ""}
        ${appState.meta.clientGoal ? `<span><strong>Objetivo:</strong> ${escapeHtml(appState.meta.clientGoal)}</span>` : ""}
        ${appState.meta.startDate ? `<span><strong>Fecha:</strong> ${escapeHtml(appState.meta.startDate)}</span>` : ""}
      </div>
    </div>
  `;

  const pagesHtml = appState.days.map(d => {
    const totalRows = BLOCK_DEFINITIONS.reduce((acc, b) => acc + ((d.blocks[b.key] || []).length), 0);
    const densityClass = totalRows > 16 ? "density-ultra" : (totalRows > 11 ? "density-compact" : "");

    return `
      <div class="print-day-page ${densityClass}">
        ${buildClientBannerHtml()}
        <div class="print-day-bar">
          <span>${escapeHtml(d.title)}</span>
          <span style="font-weight:400;">${escapeHtml(d.focus || "")}</span>
        </div>
        ${BLOCK_DEFINITIONS.map(b => {
          const rows = d.blocks[b.key] || [];
          if (!rows.length) return "";
          return `<div class="print-block-box">
            <div class="print-block-title">${b.title}</div>
            <table class="print-table">
              <thead>
                <tr>
                  <th class="p-col-ord">Ord</th>
                  <th class="p-col-ex">Ejercicio</th>
                  <th class="p-col-ser">Series</th>
                  <th class="p-col-rep">Reps/Tpo</th>
                  <th class="p-col-int">Carga/Int</th>
                  <th class="p-col-pau">Pausa</th>
                  <th class="p-col-wk">Sem 1</th>
                  <th class="p-col-wk">Sem 2</th>
                  <th class="p-col-wk">Sem 3</th>
                  <th class="p-col-wk">Sem 4</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td class="p-col-ord">${escapeHtml(r.order)}</td>
                    <td class="p-col-ex"><strong>${escapeHtml(r.name)}</strong></td>
                    <td class="p-col-ser">${r.sets}</td>
                    <td class="p-col-rep">${escapeHtml(r.reps)}</td>
                    <td class="p-col-int">${escapeHtml(r.rpe)}</td>
                    <td class="p-col-pau">${escapeHtml(r.rest)}</td>
                    <td class="p-col-wk">${escapeHtml(r.w1)}</td>
                    <td class="p-col-wk">${escapeHtml(r.w2)}</td>
                    <td class="p-col-wk">${escapeHtml(r.w3)}</td>
                    <td class="p-col-wk">${escapeHtml(r.w4)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;
        }).join("")}
      </div>
    `;
  }).join("");

  document.getElementById("print-all-days-container").innerHTML = pagesHtml;
}

function printFullRoutine() {
  buildPrintAllDaysView();
  window.print();
}

function resetPlanner() {
  if (!confirm("¿Limpiar los dias en pantalla para armar una rutina nueva?")) return;
  appState.days = [createDefaultDay(1), createDefaultDay(2), createDefaultDay(3)];
  appState.activeDayIndex = 0;
  renderAll();
}