// =========================================================================
// UI-PWA.JS: ENCABEZADO INTELIGENTE, BOTONES FLOTANTES E INSTALACION PWA
// =========================================================================

function setupInstallablePWA() {
  try {
    const generateIconPNG = (size) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = Math.max(4, size * 0.04);
      ctx.strokeRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88);
      ctx.fillStyle = "#38bdf8";
      ctx.font = `bold ${Math.round(size * 0.36)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PT", size / 2, size / 2);
      return canvas.toDataURL("image/png");
    };

    const icon192 = generateIconPNG(192);
    const icon512 = generateIconPNG(512);

    const appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    appleIcon.href = icon192;
    document.head.appendChild(appleIcon);

    const cleanStartUrl = window.location.origin + window.location.pathname;
    const manifestObj = {
      id: cleanStartUrl,
      name: "Planificador de Entrenamiento",
      short_name: "Planificador",
      description: "Planificador de clases por patrones de movimiento",
      start_url: cleanStartUrl,
      scope: window.location.origin + "/",
      display: "standalone",
      background_color: "#0f172a",
      theme_color: "#0f172a",
      orientation: "any",
      icons: [
        { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "any maskable" }
      ]
    };

    const manifestStr = encodeURIComponent(JSON.stringify(manifestObj));
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.href = `data:application/manifest+json;charset=utf-8,${manifestStr}`;
    document.head.appendChild(manifestLink);

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById("btn-install-pwa");
      if (btn) btn.style.display = "inline-flex";
    });
  } catch (err) {
    console.warn("Aviso PWA:", err);
  }
}

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById("btn-install-pwa").style.display = "none";
}

function updateHeaderLayoutAndSpacer() {
  const wrapper = document.getElementById("fixed-header-wrapper");
  const topEl = document.getElementById("top-panel-section");
  const seriesEl = document.getElementById("weekly-series-section");
  const spacer = document.getElementById("header-spacer");
  const btnTop = document.getElementById("btn-float-top");
  const btnSeries = document.getElementById("btn-float-series");

  if (!wrapper || !topEl || !seriesEl || !spacer) return;

  topEl.classList.toggle("section-collapsed", !showTopPanel);
  seriesEl.classList.toggle("section-collapsed", !showSeriesPanel);

  const isTucked = wrapper.classList.contains("scroll-tucked");
  const activeTopVisible = showTopPanel && !isTucked;
  const activeSeriesVisible = showSeriesPanel && !isTucked;

  if (btnTop) btnTop.classList.toggle("btn-primary", activeTopVisible);
  if (btnSeries) btnSeries.classList.toggle("btn-primary", activeSeriesVisible);

  requestAnimationFrame(() => {
    spacer.style.height = wrapper.offsetHeight + "px";
  });
}

function toggleTopPanelManual() {
  const wrapper = document.getElementById("fixed-header-wrapper");
  if (wrapper.classList.contains("scroll-tucked")) {
    wrapper.classList.remove("scroll-tucked");
    showTopPanel = true;
  } else {
    showTopPanel = !showTopPanel;
  }
  updateHeaderLayoutAndSpacer();
}

function toggleWeeklySeriesManual() {
  const wrapper = document.getElementById("fixed-header-wrapper");
  if (wrapper.classList.contains("scroll-tucked")) {
    wrapper.classList.remove("scroll-tucked");
    showSeriesPanel = true;
  } else {
    showSeriesPanel = !showSeriesPanel;
  }
  updateHeaderLayoutAndSpacer();
}

function setupScrollHeaderBehavior() {
  const wrapper = document.getElementById("fixed-header-wrapper");

  window.addEventListener("scroll", () => {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;

    if (currentY <= 25) {
      if (wrapper.classList.contains("scroll-tucked")) {
        wrapper.classList.remove("scroll-tucked");
        updateHeaderLayoutAndSpacer();
      }
    } else if (delta > 12 && currentY > 90) {
      if (!wrapper.classList.contains("scroll-tucked")) {
        wrapper.classList.add("scroll-tucked");
        updateHeaderLayoutAndSpacer();
      }
    } else if (delta < -14) {
      if (wrapper.classList.contains("scroll-tucked")) {
        wrapper.classList.remove("scroll-tucked");
        updateHeaderLayoutAndSpacer();
      }
    }
    lastScrollY = currentY;
  }, { passive: true });

  window.addEventListener("resize", updateHeaderLayoutAndSpacer);
}