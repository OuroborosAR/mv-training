function closeExerciseDemoModal() {
  document.getElementById("exercise-demo-modal")?.classList.add("section-collapsed");
}

function openExerciseDemoModal(exName, patKey) {
  let modal = document.getElementById("exercise-demo-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "exercise-demo-modal";
    modal.className = "auth-overlay no-print";
    modal.style.zIndex = "9800";
    document.body.appendChild(modal);
  }

  const cleanName = String(exName || "").trim();
  const foundEx = (appState.exercises || []).find(
    e => String(e.name || "").trim().toLowerCase() === cleanName.toLowerCase()
  );
  const pat = patKey || (foundEx ? foundEx.pattern : "RODILLA");
  const patLabel = PATTERN_CONFIG[pat]?.label || pat;
  const equipLabel = foundEx?.equip || "Según prescripción";
  const savedDesc = foundEx ? extractExerciseDescription(foundEx) : "";
  const explanationToShow = savedDesc || DEFAULT_PATTERN_CUES[pat] || DEFAULT_PATTERN_CUES.RODILLA;
  const isCoach = typeof currentSession !== "undefined" && currentSession.role === "coach";

  modal.innerHTML = `
    <div class="auth-card" style="max-width:460px; text-align:left; padding:18px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; margin-bottom:12px;">
        <div>
          <span class="tag-pattern">${escapeHtml(patLabel)}</span>
          <h3 style="font-size:1.02rem; color:var(--text-main); margin-top:4px;">${escapeHtml(cleanName || "Detalle del Ejercicio")}</h3>
        </div>
        <button class="btn" style="padding:4px 9px;" onclick="closeExerciseDemoModal()">X</button>
      </div>

      <div style="background:var(--bg-input); border:1px solid var(--border); border-radius:6px; padding:8px 11px; font-size:0.78rem; margin-bottom:12px;">
        <span><strong>Elemento:</strong> ${escapeHtml(equipLabel)}</span>
      </div>

      <div style="background:var(--bg-input); border-left:3px solid var(--accent); padding:10px 12px; border-radius:6px; font-size:0.82rem; margin-bottom:14px;">
        <div style="font-size:0.71rem; text-transform:uppercase; color:var(--accent); font-weight:700; margin-bottom:6px;">
          Explicación Técnica y Pautas de Ejecución
        </div>
        ${isCoach ? `
          <textarea id="modal-ex-desc-input" rows="4" class="input-full" style="resize:vertical; line-height:1.45;" placeholder="Escribí acá la explicación técnica...">${escapeHtml(explanationToShow)}</textarea>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; gap:8px;">
            <span style="font-size:0.7rem; color:var(--text-muted);">${savedDesc ? "Guardada en Excel" : "Sugerencia base por patrón"}</span>
            <button type="button" class="btn btn-success" style="font-size:0.74rem; padding:5px 10px;" onclick="saveExplanationFromModal('${escapeJsAttr(cleanName)}', '${escapeJsAttr(pat)}')">Guardar en Excel</button>
          </div>
        ` : `
          <div style="color:var(--text-main); line-height:1.5; white-space:pre-line;">${escapeHtml(explanationToShow)}</div>
        `}
      </div>

      <button class="btn" style="width:100%; justify-content:center;" onclick="closeExerciseDemoModal()">Cerrar</button>
    </div>
  `;

  modal.classList.remove("section-collapsed");
}

async function saveExplanationFromModal(exName, patKey) {
  const newDesc = document.getElementById("modal-ex-desc-input")?.value.trim() || "";
  const cleanName = String(exName || "").trim();
  if (!cleanName) return;

  let target = (appState.exercises || []).find(
    e => String(e.name || "").trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (target) {
    const meta = getExerciseMeta(target);
    target.desc = newDesc;
    target.block = meta.block;
    target.momento = MOMENT_CONFIG[meta.block]?.sheetVal || "PRINCIPAL";
    target.tier = meta.tier;
    target.jerarquia = meta.tier;
    target.author = buildEncodedExerciseAuthor(meta.cleanAuthor, meta.block, meta.tier, newDesc);
    saveToLocalStorage();
    renderAll();
    if (typeof sendToGoogleSheet === "function") {
      await sendToGoogleSheet({ action: "addExercise", exercise: target });
    }
  } else {
    const block = PATTERN_CONFIG[patKey]?.defaultBlock || "str";
    const tier = inferExerciseTier({ name: cleanName, pattern: patKey });
    target = {
      id: "ex_" + Date.now(),
      name: cleanName,
      pattern: patKey || "RODILLA",
      equip: "Libre",
      desc: newDesc,
      block,
      momento: MOMENT_CONFIG[block]?.sheetVal || "PRINCIPAL",
      tier,
      jerarquia: tier,
      author: buildEncodedExerciseAuthor(appState.meta.coachName || "Propio", block, tier, newDesc)
    };
    appState.exercises.unshift(target);
    saveToLocalStorage();
    renderAll();
    if (typeof sendToGoogleSheet === "function") {
      await sendToGoogleSheet({ action: "addExercise", exercise: target });
    }
  }

  closeExerciseDemoModal();
}