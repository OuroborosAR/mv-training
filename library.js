// =========================================================================
// LIBRARY.JS: PANEL DE BIBLIOTECA CON EXPLICACIÓN GUARDADA EN GOOGLE SHEETS
// =========================================================================

let drawerFilterMoment = "ALL";

function initStaticControls() {
  const patSelect = document.getElementById("new-ex-pattern");
  if (patSelect) {
    patSelect.innerHTML = buildPatternOptions("RODILLA");
    patSelect.addEventListener("change", () => {
      if (!editingExerciseId) {
        const blockSel = document.getElementById("new-ex-block");
        const cfg = PATTERN_CONFIG[patSelect.value];
        if (blockSel && cfg) blockSel.value = cfg.defaultBlock;
      }
    });
  }

  const equipInput = document.getElementById("new-ex-equip");
  if (equipInput && !document.getElementById("new-ex-block")) {
    const gridContainer = equipInput.parentNode;

    const blockSelect = document.createElement("select");
    blockSelect.id = "new-ex-block";
    blockSelect.className = "input-full";
    blockSelect.title = "Momento de la clase donde se utilizará";
    blockSelect.innerHTML = buildMomentOptions("str");

    const tierSelect = document.createElement("select");
    tierSelect.id = "new-ex-tier";
    tierSelect.className = "input-full";
    tierSelect.title = "Jerarquía / prioridad en el bloque principal";
    tierSelect.innerHTML = buildTierOptions("BASE");

    const descInput = document.createElement("textarea");
    descInput.id = "new-ex-desc";
    descInput.className = "input-full";
    descInput.rows = 2;
    descInput.placeholder = "Explicación técnica / pautas del ejercicio (Se guarda en Google Sheets)...";
    descInput.style.gridColumn = "span 2";
    descInput.style.resize = "vertical";

    const actionDiv = document.getElementById("btn-save-ex-form")?.parentNode;
    if (actionDiv) {
      gridContainer.insertBefore(blockSelect, actionDiv);
      gridContainer.insertBefore(tierSelect, actionDiv);
      gridContainer.insertBefore(descInput, actionDiv);
    }
  }

  const pillsContainer = document.getElementById("drawer-pills");
  if (pillsContainer && !document.getElementById("drawer-moment-pills")) {
    const momentBar = document.createElement("div");
    momentBar.id = "drawer-moment-pills";
    momentBar.className = "filter-pills";
    momentBar.style.marginBottom = "4px";
    momentBar.innerHTML = [
      ["ALL", "Todos los Momentos"],
      ["warm", "1. Entrada Calor"],
      ["core", "2. Zona Media"],
      ["str", "3. Principal"],
      ["cool", "4. Vuelta Calma"]
    ].map((m, idx) =>
      `<span class="pill ${idx === 0 ? 'active' : ''}" onclick="setDrawerMomentFilter('${m[0]}', this)">${m[1]}</span>`
    ).join("");
    pillsContainer.parentNode.insertBefore(momentBar, pillsContainer);
  }

  const pills = [
    ["ALL", "Todos"], ["RODILLA", "Rodilla"], ["CADERA", "Cadera"],
    ["EMPUJE_H", "Empuje H"], ["EMPUJE_V", "Empuje V"],
    ["TRACCION_H", "Traccion H"], ["TRACCION_V", "Traccion V"],
    ["CORE", "Core"], ["TRANSPORTE", "Transporte"],
    ["PLIOMETRIA", "Pliometria"], ["MOVILIDAD", "Movilidad"]
  ];

  if (pillsContainer) {
    pillsContainer.innerHTML = pills.map((p, i) =>
      `<span class="pill ${i === 0 ? 'active' : ''}" onclick="setDrawerFilter('${p[0]}', this)">${p[1]}</span>`
    ).join("");
  }
}

function toggleLibraryDrawer() {
  const drawer = document.getElementById("library-drawer");
  if (!drawer) return;
  const isOpen = drawer.classList.toggle("open");
  document.getElementById("main-container")?.classList.toggle("drawer-open", isOpen);
  document.getElementById("btn-float-lib")?.classList.toggle("btn-primary", isOpen);
  renderDrawerLibrary();
}

function setDrawerMomentFilter(momentKey, el) {
  drawerFilterMoment = momentKey;
  document.querySelectorAll("#drawer-moment-pills .pill").forEach(p => p.classList.remove("active"));
  if (el) el.classList.add("active");
  renderDrawerLibrary();
}

function setDrawerFilter(pat, el) {
  drawerFilterPattern = pat;
  document.querySelectorAll("#drawer-pills .pill").forEach(p => p.classList.remove("active"));
  if (el) el.classList.add("active");
  renderDrawerLibrary();
}

function addExerciseByIdToDay(exId) {
  const ex = (appState.exercises || []).find(e => e.id === exId);
  if (!ex) return;
  const exBlock = inferExerciseMoment(ex);
  addRow(exBlock, ex.pattern, ex.name);
}

function renderDrawerLibrary() {
  if (typeof enrichExercisesMetadata === "function") enrichExercisesMetadata();
  const searchInput = document.getElementById("drawer-search");
  const q = (searchInput ? searchInput.value : "").toLowerCase();

  const filtered = (appState.exercises || []).filter(ex => {
    const exMoment = inferExerciseMoment(ex);
    const matchMoment = drawerFilterMoment === "ALL" || exMoment === drawerFilterMoment;
    const matchPat = drawerFilterPattern === "ALL" || ex.pattern === drawerFilterPattern;
    const matchQ = !q || ex.name.toLowerCase().includes(q) || (ex.equip || "").toLowerCase().includes(q);
    return matchMoment && matchPat && matchQ;
  });

  const listEl = document.getElementById("drawer-list");
  if (!listEl) return;

  const tierColors = {
    BASE: "rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4);",
    INTEGRADO: "rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4);",
    UNILATERAL: "rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245,158,11,0.4);",
    ANALITICO: "rgba(148, 163, 184, 0.2); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.4);"
  };

  listEl.innerHTML = filtered.map(ex => {
    const cfg = PATTERN_CONFIG[ex.pattern] || { label: ex.pattern, defaultBlock: "str" };
    const exBlock = inferExerciseMoment(ex);
    const exTier = inferExerciseTier(ex);
    const momentInfo = MOMENT_CONFIG[exBlock] || MOMENT_CONFIG.str;
    const tierInfo = TIER_CONFIG[exTier] || TIER_CONFIG.BASE;
    const badgeStyle = tierColors[exTier] || tierColors.BASE;

    return `<div class="exercise-item">
      <div style="display:flex; gap:8px; align-items:center; min-width:0;">
        ${buildExerciseThumbnailBtn(ex.name, ex.pattern)}
        <div class="ex-info" style="min-width:0;">
          <h4>${escapeHtml(ex.name)}</h4>
          <div class="ex-meta" style="display:flex; flex-wrap:wrap; gap:4px; align-items:center; margin-top:4px;">
            <span class="tag-pattern">${cfg.label}</span>
            <span class="tag-pattern" style="background:rgba(139,92,246,0.18); color:#c4b5fd;">${momentInfo.short}</span>
            ${exBlock === "str" ? `<span class="tag-pattern" style="background:${badgeStyle}">${tierInfo.short}</span>` : ""}
            <span>${escapeHtml(ex.equip)}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0;">
        <button class="btn btn-primary" style="padding:4px 8px;font-size:0.72rem;" onclick="addExerciseByIdToDay('${escapeHtml(ex.id)}')">Agregar</button>
        <button class="btn" style="padding:4px 7px;font-size:0.72rem;" onclick="startEditExercise('${escapeHtml(ex.id)}')">Editar</button>
        <button class="btn btn-danger" style="padding:4px 7px;font-size:0.72rem;" onclick="deleteExerciseFromCloud('${escapeHtml(ex.id)}')">X</button>
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

  const blockEl = document.getElementById("new-ex-block");
  const tierEl = document.getElementById("new-ex-tier");
  const descEl = document.getElementById("new-ex-desc");
  if (blockEl) blockEl.value = inferExerciseMoment(ex);
  if (tierEl) tierEl.value = inferExerciseTier(ex);
  if (descEl) descEl.value = extractExerciseDescription(ex);

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
  const blockEl = document.getElementById("new-ex-block");
  const tierEl = document.getElementById("new-ex-tier");
  const descEl = document.getElementById("new-ex-desc");
  if (blockEl) blockEl.value = "str";
  if (tierEl) tierEl.value = "BASE";
  if (descEl) descEl.value = "";

  document.getElementById("drawer-form-title").textContent = "Nuevo Ejercicio";
  document.getElementById("btn-save-ex-form").textContent = "Guardar en Biblioteca";
  document.getElementById("btn-cancel-ex-edit").style.display = "none";
  document.getElementById("drawer-form-box").classList.remove("editing-mode");
}

async function saveExerciseFromDrawerForm() {
  const nameEl = document.getElementById("new-ex-name");
  const patEl = document.getElementById("new-ex-pattern");
  const eqEl = document.getElementById("new-ex-equip");
  const blockEl = document.getElementById("new-ex-block");
  const tierEl = document.getElementById("new-ex-tier");
  const descEl = document.getElementById("new-ex-desc");

  const name = nameEl.value.trim();
  if (!name) {
    alert("Ingrese el nombre del ejercicio.");
    return;
  }

  const chosenBlock = blockEl ? blockEl.value : (PATTERN_CONFIG[patEl.value]?.defaultBlock || "str");
  const chosenTier = tierEl ? tierEl.value : inferExerciseTier({ name, pattern: patEl.value });
  const sheetMoment = MOMENT_CONFIG[chosenBlock]?.sheetVal || "PRINCIPAL";
  const descText = descEl ? descEl.value.trim() : "";
  const encodedAuthor = buildEncodedExerciseAuthor(appState.meta.coachName || "Propio", chosenBlock, chosenTier, descText);

  if (editingExerciseId) {
    const target = appState.exercises.find(e => e.id === editingExerciseId);
    if (target) {
      const oldName = target.name;
      target.name = name;
      target.pattern = patEl.value;
      target.equip = eqEl.value.trim() || "Libre";
      target.author = encodedAuthor;
      target.block = chosenBlock;
      target.momento = sheetMoment;
      target.tier = chosenTier;
      target.jerarquia = chosenTier;
      target.desc = descText;

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
    author: encodedAuthor,
    block: chosenBlock,
    momento: sheetMoment,
    tier: chosenTier,
    jerarquia: chosenTier,
    desc: descText
  };
  appState.exercises.unshift(newEx);
  nameEl.value = "";
  eqEl.value = "";
  if (descEl) descEl.value = "";
  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "addExercise", exercise: newEx });
}

async function quickSaveRowExercise(blockKey, rIdx) {
  const row = appState.days[appState.activeDayIndex]?.blocks[blockKey]?.[rIdx];
  if (!row || !row.name.trim()) {
    alert("Escriba primero el nombre del ejercicio en la fila.");
    return;
  }

  const momentInfo = MOMENT_CONFIG[blockKey] || MOMENT_CONFIG.str;
  const equip = prompt(`Guardar "${row.name}" en [${momentInfo.short}].\nElemento (ej: Barra, Mancuernas, Kettlebell, Peso Corporal):`, "Libre");
  if (equip === null) return;

  let chosenTier = inferExerciseTier({ name: row.name, pattern: row.pattern });
  if (blockKey === "str") {
    const suggested = rIdx === 0 ? "BASE" : chosenTier;
    const tierPrompt = prompt(
      `Jerarquía en el Bloque Principal para "${row.name}":\n` +
      `1 = BASE (Poliarticular Bilateral - 1er ejercicio: Sentadilla, Peso Muerto, Banca, Militar, Dominadas)\n` +
      `2 = INTEGRADO (Full Body / Multiarticular dinámico: Thruster, Clean, Swing, Squat a Press)\n` +
      `3 = UNILATERAL (Secundario a 1 pierna o 1 brazo: Búlgara, Estocada, RDL 1p, Remo 1b)\n` +
      `4 = ANALITICO (Aislado / Correctivo: Curl femoral, Puente glúteos, Face pull, Scaption)`,
      suggested === "BASE" ? "1" : (suggested === "INTEGRADO" ? "2" : (suggested === "UNILATERAL" ? "3" : "4"))
    );
    if (tierPrompt === "1") chosenTier = "BASE";
    else if (tierPrompt === "2") chosenTier = "INTEGRADO";
    else if (tierPrompt === "3") chosenTier = "UNILATERAL";
    else if (tierPrompt === "4") chosenTier = "ANALITICO";
  }

  const existing = appState.exercises.find(e => e.name.toLowerCase() === row.name.trim().toLowerCase());
  const prevDesc = existing ? extractExerciseDescription(existing) : "";
  const exObj = {
    id: existing ? existing.id : ("ex_" + Date.now()),
    name: row.name.trim(),
    pattern: row.pattern,
    equip: equip.trim() || "Libre",
    author: buildEncodedExerciseAuthor(appState.meta.coachName || "Propio", blockKey, chosenTier, prevDesc),
    block: blockKey,
    momento: momentInfo.sheetVal,
    tier: chosenTier,
    jerarquia: chosenTier,
    desc: prevDesc
  };

  if (existing) {
    Object.assign(existing, exObj);
    await sendToGoogleSheet({ action: "deleteExercise", id: exObj.id });
  } else {
    appState.exercises.unshift(exObj);
  }

  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "addExercise", exercise: exObj });
  alert(`"${exObj.name}" guardado como [${momentInfo.short}${blockKey === 'str' ? ' • ' + TIER_CONFIG[chosenTier].short : ''}].`);
}

async function deleteExerciseFromCloud(id) {
  if (!confirm("¿Eliminar este ejercicio de la biblioteca?")) return;
  if (editingExerciseId === id) cancelExerciseEdit();
  appState.exercises = appState.exercises.filter(e => e.id !== id);
  renderDrawerLibrary();
  await sendToGoogleSheet({ action: "deleteExercise", id });
}