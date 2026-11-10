// =========================================================================
// LIBRARY.JS: PANEL LATERAL DE BIBLIOTECA, FILTROS Y EDICION DE EJERCICIOS
// =========================================================================

function initStaticControls() {
  const patSelect = document.getElementById("new-ex-pattern");
  if (patSelect) {
    patSelect.innerHTML = buildPatternOptions("RODILLA");
  }

  const pills = [
    ["ALL", "Todos"], ["RODILLA", "Rodilla"], ["CADERA", "Cadera"],
    ["EMPUJE_H", "Empuje H"], ["EMPUJE_V", "Empuje V"],
    ["TRACCION_H", "Traccion H"], ["TRACCION_V", "Traccion V"],
    ["CORE", "Core"], ["TRANSPORTE", "Transporte"],
    ["PLIOMETRIA", "Pliometria"], ["MOVILIDAD", "Movilidad"]
  ];

  const pillsContainer = document.getElementById("drawer-pills");
  if (pillsContainer) {
    pillsContainer.innerHTML = pills.map((p, i) =>
      `<span class="pill ${i === 0 ? 'active' : ''}" onclick="setDrawerFilter('${p[0]}', this)">${p[1]}</span>`
    ).join("");
  }
}

function toggleLibraryDrawer() {
  const drawer = document.getElementById("library-drawer");
  const isOpen = drawer.classList.toggle("open");
  document.getElementById("main-container").classList.toggle("drawer-open", isOpen);
  document.getElementById("btn-float-lib").classList.toggle("btn-primary", isOpen);
  renderDrawerLibrary();
}

function setDrawerFilter(pat, el) {
  drawerFilterPattern = pat;
  document.querySelectorAll("#drawer-pills .pill").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  renderDrawerLibrary();
}

function renderDrawerLibrary() {
  const searchInput = document.getElementById("drawer-search");
  const q = (searchInput ? searchInput.value : "").toLowerCase();
  const filtered = appState.exercises.filter(ex => {
    const matchPat = drawerFilterPattern === "ALL" || ex.pattern === drawerFilterPattern;
    const matchQ = !q || ex.name.toLowerCase().includes(q) || (ex.equip || "").toLowerCase().includes(q);
    return matchPat && matchQ;
  });

  const listEl = document.getElementById("drawer-list");
  if (!listEl) return;

  listEl.innerHTML = filtered.map(ex => {
    const cfg = PATTERN_CONFIG[ex.pattern] || { label: ex.pattern, defaultBlock: "str" };
    return `<div class="exercise-item">
      <div class="ex-info">
        <h4>${escapeHtml(ex.name)}</h4>
        <div class="ex-meta"><span class="tag-pattern">${cfg.label}</span>${escapeHtml(ex.equip)} • ${escapeHtml(ex.author)}</div>
      </div>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-primary" style="padding:4px 8px;font-size:0.72rem;" onclick="addRow('${cfg.defaultBlock}','${ex.pattern}','${escapeHtml(ex.name)}')">Agregar</button>
        <button class="btn" style="padding:4px 7px;font-size:0.72rem;" onclick="startEditExercise('${ex.id}')">Editar</button>
        <button class="btn btn-danger" style="padding:4px 7px;font-size:0.72rem;" onclick="deleteExerciseFromCloud('${ex.id}')">X</button>
      </div>
    </div>`;
  }).join("");
}

function startEditExercise(id) {
  const ex = appState.exercises.find(e => e.id === id);
  if (!ex) return;
  editingExerciseId = ex.id;

  document.getElementById("new-ex-name").value = ex.name || "";
  document.getElementById("new-ex-pattern").value = ex.pattern || "RODILLA";
  document.getElementById("new-ex-equip").value = ex.equip || "";

  document.getElementById("drawer-form-title").textContent = "Editando Ejercicio";
  document.getElementById("btn-save-ex-form").textContent = "Guardar Cambios";
  document.getElementById("btn-cancel-ex-edit").style.display = "inline-flex";
  document.getElementById("drawer-form-box").classList.add("editing-mode");

  document.querySelector(".drawer-body").scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("new-ex-name").focus();
}

function cancelExerciseEdit() {
  editingExerciseId = null;
  document.getElementById("new-ex-name").value = "";
  document.getElementById("new-ex-equip").value = "";
  document.getElementById("drawer-form-title").textContent = "Nuevo Ejercicio";
  document.getElementById("btn-save-ex-form").textContent = "Guardar en Biblioteca";
  document.getElementById("btn-cancel-ex-edit").style.display = "none";
  document.getElementById("drawer-form-box").classList.remove("editing-mode");
}

async function saveExerciseFromDrawerForm() {
  const nameEl = document.getElementById("new-ex-name");
  const patEl = document.getElementById("new-ex-pattern");
  const eqEl = document.getElementById("new-ex-equip");
  const name = nameEl.value.trim();
  if (!name) {
    alert("Ingrese el nombre del ejercicio.");
    return;
  }

  if (editingExerciseId) {
    const target = appState.exercises.find(e => e.id === editingExerciseId);
    if (target) {
      const oldName = target.name;
      target.name = name;
      target.pattern = patEl.value;
      target.equip = eqEl.value.trim() || "Libre";

      appState.days.forEach(d => {
        Object.values(d.blocks).forEach(list => {
          list.forEach(row => {
            if (row.name === oldName) {
              row.name = target.name;
              row.pattern = target.pattern;
            }
          });
        });
      });

      cancelExerciseEdit();
      renderAll();
      await sendToGoogleSheet({ action: "deleteExercise", id: target.id });
      await sendToGoogleSheet({ action: "addExercise", exercise: target });
      return;
    }
  }

  const newEx = {
    id: "ex_" + Date.now(),
    name: name,
    pattern: patEl.value,
    equip: eqEl.value.trim() || "Libre",
    author: appState.meta.coachName || "Propio"
  };
  appState.exercises.unshift(newEx);
  nameEl.value = "";
  eqEl.value = "";
  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "addExercise", exercise: newEx });
}

async function quickSaveRowExercise(blockKey, rIdx) {
  const row = appState.days[appState.activeDayIndex]?.blocks[blockKey]?.[rIdx];
  if (!row || !row.name.trim()) {
    alert("Escriba primero el nombre del ejercicio en la fila.");
    return;
  }
  const equip = prompt(`Elemento para "${row.name}":`, "Libre");
  if (equip === null) return;
  const newEx = {
    id: "ex_" + Date.now(),
    name: row.name.trim(),
    pattern: row.pattern,
    equip: equip || "Libre",
    author: "Propio"
  };
  appState.exercises.unshift(newEx);
  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "addExercise", exercise: newEx });
  alert(`"${newEx.name}" guardado en la biblioteca.`);
}

async function deleteExerciseFromCloud(id) {
  if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
  if (editingExerciseId === id) cancelExerciseEdit();
  appState.exercises = appState.exercises.filter(e => e.id !== id);
  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "deleteExercise", id });
}