// =========================================================================
// CLOUD.JS: CONEXION AUTENTICADA CON GOOGLE SHEETS
// =========================================================================

function toggleCloudBar() {
  const wrapper = document.getElementById("fixed-header-wrapper");
  wrapper.classList.remove("scroll-tucked");
  showTopPanel = true;
  document.getElementById("cloud-bar").classList.toggle("section-collapsed");
  if (typeof updateHeaderLayoutAndSpacer === "function") {
    updateHeaderLayoutAndSpacer();
  }
}

function setCloudStatus(text, color) {
  const el = document.getElementById("cloud-status");
  if (el) {
    el.textContent = text;
    el.style.color = color;
  }
}

function saveSheetUrl() {
  appState.sheetUrl = document.getElementById("gsheet-url-input").value.trim();
  saveToLocalStorage();
  if (appState.sheetUrl) {
    document.getElementById("cloud-bar").classList.add("section-collapsed");
    if (typeof updateHeaderLayoutAndSpacer === "function") {
      updateHeaderLayoutAndSpacer();
    }
    syncFromGoogleSheet(true);
  }
}

async function syncFromGoogleSheet(showAlert) {
  if (!appState.sheetUrl) return;
  if (!currentSession || currentSession.role !== "coach" || !currentSession.coachPin) return;

  setCloudStatus("Sincronizando...", "var(--accent)");
  try {
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "loginCoach", pin: currentSession.coachPin })
    });
    const data = await res.json();
    if (data.status === "ok") {
      appState.exercises = data.exercises || [];
      appState.routines = data.routines || [];
      appState.clients = data.clients || [];
      if (appState.days.length === 0 && appState.routines.length > 0) {
        appState.days = JSON.parse(JSON.stringify(appState.routines[0].days));
      }
      saveToLocalStorage();
      populateDropdowns();
      renderAll();
      setCloudStatus("Guardado en Excel", "var(--series-green)");
      if (showAlert) alert("Datos sincronizados correctamente con Google Sheets.");
    } else if (showAlert) {
      alert(data.message || "Error de autenticacion con Google Sheets.");
    }
  } catch (err) {
    console.error(err);
    setCloudStatus("Modo Local (Sin red)", "var(--series-yellow)");
    if (showAlert) alert("No se pudo conectar con Google Sheets.");
  }
}

async function sendToGoogleSheet(payload) {
  saveToLocalStorage();
  if (!appState.sheetUrl) return;
  setCloudStatus("Guardando en Excel...", "var(--accent)");
  try {
    const securePayload = Object.assign({}, payload, {
      pin: (currentSession && currentSession.coachPin) ? currentSession.coachPin : ""
    });
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(securePayload)
    });
    const data = await res.json();
    if (data.status === "ok") {
      setCloudStatus("Guardado en Excel", "var(--series-green)");
    } else {
      setCloudStatus("Error de permisos", "var(--series-red)");
    }
  } catch (e) {
    setCloudStatus("Guardado local", "var(--series-yellow)");
  }
}

function populateDropdowns() {
  const cliSel = document.getElementById("client-select");
  if (cliSel) {
    cliSel.innerHTML = `<option value="">-- Seleccionar Cliente (${appState.clients.length}) --</option>` +
      appState.clients.map(c =>
        `<option value="${c.id}" ${c.id === appState.meta.clientId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
      ).join("");
  }

  const rutSel = document.getElementById("preset-routine-select");
  if (rutSel) {
    rutSel.innerHTML = `<option value="">-- Seleccionar Rutina (${appState.routines.length}) --</option>` +
      appState.routines.map(r => {
        const cleanName = String(r.name || "").replace(/[^\w\sáéíóúÁÉÍÓÚñÑ.,()-]/g, "").trim();
        return `<option value="${r.id}">${escapeHtml(cleanName)} ${r.clientName ? '(' + escapeHtml(r.clientName) + ')' : ''}</option>`;
      }).join("");
  }
}

function loadSelectedClient() {
  const id = document.getElementById("client-select").value;
  if (!id) return;
  const c = appState.clients.find(x => x.id === id);
  if (!c) return;
  appState.meta.clientId = c.id;
  appState.meta.clientName = c.name;
  appState.meta.coachName = c.coachName || appState.meta.coachName;
  appState.meta.clientGoal = c.goal || "";
  appState.meta.splitType = c.split || "Full Body 3 Dias";
  appState.meta.nasmPhase = c.phase || "3";
  appState.meta.clientNotes = c.notes || "";
  syncMetaInputs();
  updateNASMAssistant();
  saveToLocalStorage();
}

async function saveClientToCloud() {
  const name = document.getElementById("client-name").value.trim();
  if (!name) {
    alert("Ingrese el nombre del cliente.");
    return;
  }
  const existing = appState.clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  const clientObj = {
    id: existing ? existing.id : "cli_" + Date.now(),
    name: name,
    coachName: appState.meta.coachName,
    goal: appState.meta.clientGoal,
    split: appState.meta.splitType,
    phase: appState.meta.nasmPhase,
    notes: appState.meta.clientNotes,
    updatedAt: new Date().toLocaleDateString()
  };
  if (existing) Object.assign(existing, clientObj);
  else appState.clients.unshift(clientObj);
  appState.meta.clientId = clientObj.id;
  populateDropdowns();
  await sendToGoogleSheet({ action: "saveClient", client: clientObj });
  alert(`Cliente "${name}" guardado.`);
}

async function deleteSelectedClient() {
  const id = document.getElementById("client-select").value;
  if (!id || !confirm("¿Eliminar este cliente del registro?")) return;
  appState.clients = appState.clients.filter(c => c.id !== id);
  populateDropdowns();
  await sendToGoogleSheet({ action: "deleteClient", id });
}

async function saveRoutineToCloud() {
  const defaultName = appState.meta.clientName ? `Rutina - ${appState.meta.clientName}` : "Nueva Rutina";
  const name = prompt("Nombre de la rutina para guardar:", defaultName);
  if (!name || !name.trim()) return;
  const existing = appState.routines.find(r => r.name.toLowerCase() === name.trim().toLowerCase());
  const routineObj = {
    id: existing ? existing.id : "rut_" + Date.now(),
    name: name.trim(),
    clientName: appState.meta.clientName || "",
    split: appState.meta.splitType,
    phase: appState.meta.nasmPhase,
    goal: appState.meta.clientGoal,
    notes: appState.meta.clientNotes,
    updatedAt: new Date().toLocaleDateString(),
    days: JSON.parse(JSON.stringify(appState.days))
  };
  if (existing) Object.assign(existing, routineObj);
  else appState.routines.unshift(routineObj);
  populateDropdowns();
  await sendToGoogleSheet({ action: "saveRoutine", routine: routineObj });
  alert(`Rutina "${routineObj.name}" guardada.`);
}

function loadPresetRoutine() {
  const id = document.getElementById("preset-routine-select").value;
  if (!id) return;
  const r = appState.routines.find(x => x.id === id);
  if (!r || !confirm(`¿Cargar la rutina "${r.name}"?`)) return;
  if (r.clientName) appState.meta.clientName = r.clientName;
  appState.meta.splitType = r.split || appState.meta.splitType;
  appState.meta.nasmPhase = r.phase || "3";
  appState.meta.clientGoal = r.goal || "";
  appState.meta.clientNotes = r.notes || "";
  appState.days = JSON.parse(JSON.stringify(r.days || [createDefaultDay(1)]));
  appState.activeDayIndex = 0;
  syncMetaInputs();
  updateNASMAssistant();
  renderAll();
}

async function deleteSelectedRoutine() {
  const id = document.getElementById("preset-routine-select").value;
  if (!id || !confirm("¿Eliminar esta rutina?")) return;
  appState.routines = appState.routines.filter(r => r.id !== id);
  populateDropdowns();
  await sendToGoogleSheet({ action: "deleteRoutine", id });
}

function exportJSON() {
  const a = document.createElement("a");
  a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  a.download = `respaldo_planificador_${Date.now()}.json`;
  a.click();
}