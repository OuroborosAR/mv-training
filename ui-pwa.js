// =========================================================================
// UI-PWA.JS: ENCABEZADO INTELIGENTE, BOTONES FLOTANTES E INSTALACION PWA
// =========================================================================

function setupInstallablePWA() {
  try {
    // 1. Enlazar manifest.json real compatible con GitHub Pages
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "./manifest.json";
      document.head.appendChild(manifestLink);
    }

    // 2. Registrar Service Worker para habilitar la instalacion en Android
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service Worker no registrado:", err);
      });
    }

    // 3. Capturar evento de instalacion de Chrome
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById("btn-install-pwa");
      if (btn) btn.style.display = "inline-flex";
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      const btn = document.getElementById("btn-install-pwa");
      if (btn) btn.style.display = "none";
    });
  } catch (err) {
    console.warn("Aviso PWA:", err);
  }
}

async function installPWA() {
  if (!deferredInstallPrompt) {
    alert("Para instalarla: toca los 3 puntos arriba a la derecha en Chrome y selecciona 'Instalar aplicacion' o 'Agregar a la pantalla principal'.");
    return;
  }
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