function toggleCloudBar() {
  const wrapper = document.getElementById("fixed-header-wrapper");
  wrapper.classList.remove("scroll-tucked");
  showTopPanel = true;
  document.getElementById("cloud-bar").classList.toggle("section-collapsed");
  if (typeof updateHeaderLayoutAndSpacer === "function") updateHeaderLayoutAndSpacer();
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
    if (typeof updateHeaderLayoutAndSpacer === "function") updateHeaderLayoutAndSpacer();
    syncFromGoogleSheet(true);
  }
}

async function syncFromGoogleSheet(showAlert) {
  if (!appState.sheetUrl || !currentSession || currentSession.role !== "coach" || !currentSession.coachPin) return;

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
      appState.presencialesGrupos = data.presencialesGrupos || [];
      appState.presencialesRegistros = data.presencialesRegistros || [];

      if (typeof normalizarYDepurarRegistros === "function") normalizarYDepurarRegistros();
      if (appState.days.length === 0 && appState.routines.length > 0) {
        appState.days = JSON.parse(JSON.stringify(appState.routines[0].days));
      }

      saveToLocalStorage();
      populateDropdowns();
      renderAll();

      const viewPres = document.getElementById("coach-presenciales-view");
      if (typeof renderPresencialesModule === "function" && viewPres && !viewPres.classList.contains("section-collapsed")) {
        renderPresencialesModule();
      }
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
    const res = await fetch(appState.sheetUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({}, payload, { pin: currentSession?.coachPin || "" }))
    });
    const data = await res.json();
    setCloudStatus(
      data.status === "ok" ? "Guardado en Excel" : "Error de permisos",
      data.status === "ok" ? "var(--series-green)" : "var(--series-red)"
    );
  } catch (e) {
    setCloudStatus("Guardado local", "var(--series-yellow)");
  }
}

function populateDropdowns(selectedRoutineId = "") {
  const cliSel = document.getElementById("client-select");
  if (cliSel) {
    cliSel.innerHTML = `<option value="">-- Seleccionar Cliente (${appState.clients.length}) --</option>` +
      appState.clients.map(c =>
        `<option value="${c.id}" ${c.id === appState.meta.clientId ? "selected" : ""}>${escapeHtml(c.name)}</option>`
      ).join("");
  }

  const rutSel = document.getElementById("preset-routine-select");
  if (rutSel) {
    rutSel.innerHTML = `<option value="">-- Seleccionar Rutina (${appState.routines.length}) --</option>` +
      appState.routines.map(r => {
        const cleanName = String(r.name || "").replace(/[^\w\sáéíóúÁÉÍÓÚñÑ.,()-]/g, "").trim();
        return `<option value="${r.id}" ${r.id === selectedRoutineId ? "selected" : ""}>${escapeHtml(cleanName)} ${r.clientName ? "(" + escapeHtml(r.clientName) + ")" : ""}</option>`;
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

  const clientNameLower = String(c.name || "").trim().toLowerCase();
  const matchingRoutine = (appState.routines || []).find(
    r => String(r.clientName || "").trim().toLowerCase() === clientNameLower
  );

  if (matchingRoutine?.days?.length > 0) {
    appState.days = JSON.parse(JSON.stringify(matchingRoutine.days));
    appState.activeDayIndex = 0;
    if (matchingRoutine.phase) appState.meta.nasmPhase = matchingRoutine.phase;
    if (matchingRoutine.split) appState.meta.splitType = matchingRoutine.split;
    if (matchingRoutine.goal) appState.meta.clientGoal = matchingRoutine.goal;
    populateDropdowns(matchingRoutine.id);
  } else {
    populateDropdowns("");
  }

  syncMetaInputs();
  updateNASMAssistant();
  renderAll();
}

function loadPresetRoutine() {
  const id = document.getElementById("preset-routine-select").value;
  if (!id) return;
  const r = appState.routines.find(x => x.id === id);
  if (!r) return;

  if (r.clientName) {
    appState.meta.clientName = r.clientName;
    const matchedClient = (appState.clients || []).find(
      c => String(c.name || "").trim().toLowerCase() === String(r.clientName).trim().toLowerCase()
    );
    if (matchedClient) {
      appState.meta.clientId = matchedClient.id;
      appState.meta.clientNotes = matchedClient.notes || r.notes || "";
      appState.meta.coachName = matchedClient.coachName || appState.meta.coachName;
    } else {
      appState.meta.clientId = "";
      appState.meta.clientNotes = r.notes || "";
    }
  } else {
    appState.meta.clientNotes = r.notes || appState.meta.clientNotes;
  }

  appState.meta.splitType = r.split || appState.meta.splitType;
  appState.meta.nasmPhase = r.phase || "3";
  appState.meta.clientGoal = r.goal || "";
  appState.days = JSON.parse(JSON.stringify(r.days || [createDefaultDay(1)]));
  appState.activeDayIndex = 0;

  populateDropdowns(r.id);
  syncMetaInputs();
  updateNASMAssistant();
  renderAll();
}

async function saveClientToCloud() {
  const name = document.getElementById("client-name").value.trim();
  if (!name) return alert("Ingrese el nombre del cliente.");
  if (typeof composeMetadataTagsIntoNotes === "function") composeMetadataTagsIntoNotes();

  const existing = appState.clients.find(c => c.name.toLowerCase() === name.toLowerCase());
  const clientObj = {
    id: existing ? existing.id : "cli_" + Date.now(),
    name,
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
  populateDropdowns(document.getElementById("preset-routine-select")?.value || "");
  await sendToGoogleSheet({ action: "saveClient", client: clientObj });
  alert(`Cliente "${name}" guardado con sus niveles de fuerza base.`);
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
  if (typeof composeMetadataTagsIntoNotes === "function") composeMetadataTagsIntoNotes();

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

  populateDropdowns(routineObj.id);
  await sendToGoogleSheet({ action: "saveRoutine", routine: routineObj });
  alert(`Rutina "${routineObj.name}" guardada.`);
}

async function deleteSelectedRoutine() {
  const id = document.getElementById("preset-routine-select").value;
  if (!id || !confirm("¿Eliminar esta rutina?")) return;
  appState.routines = appState.routines.filter(r => r.id !== id);
  populateDropdowns();
  await sendToGoogleSheet({ action: "deleteRoutine", id });
}

function openExportRoutineModal() {
  const modal = document.getElementById("export-routine-modal");
  const selectEl = document.getElementById("export-target-client-select");
  if (!modal || !selectEl) return;

  selectEl.innerHTML = `<option value="">-- Seleccionar Cliente Existente (${appState.clients.length}) --</option>` +
    appState.clients.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  document.getElementById("export-target-client-name").value = "";
  document.getElementById("export-target-routine-name").value = "Rutina - ";
  modal.classList.remove("section-collapsed");
}

function closeExportRoutineModal() {
  document.getElementById("export-routine-modal")?.classList.add("section-collapsed");
}

function onExportClientSelectChange() {
  const id = document.getElementById("export-target-client-select").value;
  const c = (appState.clients || []).find(x => x.id === id);
  const nameEl = document.getElementById("export-target-client-name");
  if (c && nameEl) {
    nameEl.value = c.name;
    updateExportRoutineDefaultName();
  }
}

function updateExportRoutineDefaultName() {
  const clientName = document.getElementById("export-target-client-name").value.trim();
  const rutNameEl = document.getElementById("export-target-routine-name");
  if (rutNameEl) rutNameEl.value = clientName ? `Rutina - ${clientName}` : "Nueva Rutina";
}

async function confirmExportRoutineToClient() {
  const targetClientId = document.getElementById("export-target-client-select").value;
  const targetClientName = document.getElementById("export-target-client-name").value.trim();
  const targetRoutineName = document.getElementById("export-target-routine-name").value.trim() || `Rutina - ${targetClientName}`;
  const recalcWeights = document.getElementById("export-recalc-weights").checked;
  const saveCloud = document.getElementById("export-save-cloud").checked;

  if (!targetClientName) return alert("Selecciona o escribe el nombre del cliente destino.");

  let targetClient = (appState.clients || []).find(
    c => c.id === targetClientId || c.name.toLowerCase() === targetClientName.toLowerCase()
  );

  if (targetClient) {
    appState.meta.clientId = targetClient.id;
    appState.meta.clientName = targetClient.name;
    appState.meta.coachName = targetClient.coachName || appState.meta.coachName;
    appState.meta.clientGoal = targetClient.goal || appState.meta.clientGoal;
    appState.meta.clientNotes = targetClient.notes || "";
  } else {
    appState.meta.clientId = "cli_" + Date.now();
    appState.meta.clientName = targetClientName;
    appState.meta.clientPhone = "";
    appState.meta.clientNotes = "";
    composeMetadataTagsIntoNotes();

    targetClient = {
      id: appState.meta.clientId,
      name: targetClientName,
      coachName: appState.meta.coachName,
      goal: appState.meta.clientGoal,
      split: appState.meta.splitType,
      phase: appState.meta.nasmPhase,
      notes: appState.meta.clientNotes,
      updatedAt: new Date().toLocaleDateString()
    };
    appState.clients.unshift(targetClient);
    if (saveCloud) await sendToGoogleSheet({ action: "saveClient", client: targetClient });
  }

  syncMetaInputs();

  if (recalcWeights && typeof applyBaseStrengthToRoutine === "function") {
    applyBaseStrengthToRoutine(true, extractRMFromNotes(targetClient.notes));
  }

  const newRoutineObj = {
    id: "rut_" + Date.now(),
    name: targetRoutineName,
    clientName: targetClient.name,
    split: appState.meta.splitType,
    phase: appState.meta.nasmPhase,
    goal: appState.meta.clientGoal,
    notes: appState.meta.clientNotes,
    updatedAt: new Date().toLocaleDateString(),
    days: JSON.parse(JSON.stringify(appState.days))
  };

  appState.routines.unshift(newRoutineObj);
  populateDropdowns(newRoutineObj.id);
  closeExportRoutineModal();
  renderAll();

  if (saveCloud) await sendToGoogleSheet({ action: "saveRoutine", routine: newRoutineObj });
}

function exportJSON() {
  const a = document.createElement("a");
  a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
  a.download = `respaldo_planificador_${Date.now()}.json`;
  a.click();
}