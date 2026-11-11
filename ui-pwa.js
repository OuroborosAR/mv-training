// =========================================================================
// UI-PWA.JS: PANEL SUPERIOR SOLO ARRIBA DE TODO + BOTON SERIES Y BIBLIOTECA
// =========================================================================

function setupInstallablePWA() {
  try {
    if (!document.querySelector('link[rel="manifest"]')) {
      const manifestLink = document.createElement("link");
      manifestLink.rel = "manifest";
      manifestLink.href = "./manifest.json";
      document.head.appendChild(manifestLink);
    }

    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("Service Worker no registrado:", err);
      });
    }

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
  const btnSeries = document.getElementById("btn-float-series");

  if (!wrapper || !topEl || !seriesEl || !spacer) return;

  // El contenedor general nunca usa scroll-tucked para que Series Semanales
  // pueda mostrarse u ocultarse libremente con su boton de abajo.
  wrapper.classList.remove("scroll-tucked");

  // El panel superior SOLO se muestra cuando estamos arriba de todo (scrollY <= 15)
  const isAtVeryTop = window.scrollY <= 15;
  topEl.classList.toggle("section-collapsed", !isAtVeryTop);

  // El panel de Series Semanales responde a su boton inferior en cualquier momento
  seriesEl.classList.toggle("section-collapsed", !showSeriesPanel);

  if (btnSeries) {
    btnSeries.classList.toggle("btn-primary", showSeriesPanel);
  }

  requestAnimationFrame(() => {
    if (isAtVeryTop) {
      spacer.style.height = wrapper.offsetHeight + "px";
    }
  });
}

function toggleTopPanelManual() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function toggleWeeklySeriesManual() {
  showSeriesPanel = !showSeriesPanel;
  updateHeaderLayoutAndSpacer();
}

function setupScrollHeaderBehavior() {
  let wasAtTop = window.scrollY <= 15;

  window.addEventListener("scroll", () => {
    const isAtTop = window.scrollY <= 15;
    if (isAtTop !== wasAtTop) {
      wasAtTop = isAtTop;
      updateHeaderLayoutAndSpacer();
    }
    lastScrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener("resize", updateHeaderLayoutAndSpacer);
}