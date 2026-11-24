/* ==========================================================================
   Homepage — Heritage Flow
   Cambia lo stato della pagina in base alla metà dello schermo indicata:
     - all'apertura, con il mouse fuori dalla finestra
       o nella fascia centrale (±--home-center-margin)   → "default"
     - metà sinistra                                      → "sx"
     - metà destra                                        → "dx"
   Le transizioni sono gestite in CSS (css/home.css) tramite data-state.

   Mouse / penna: la sfumatura segue il puntatore, il click apre la pagina.
   Touch: tenere premuto o trascinare il dito mostra la sfumatura (senza
   aprire nulla); un tocco veloce mostra la sfumatura della metà toccata
   e, finita la transizione, apre la pagina.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector(".home");
  if (!root) return;

  var HOLD_DELAY = 250;   // ms di pressione oltre i quali il tocco è "tenuto"
  var MOVE_TOLERANCE = 10; // px di spostamento oltre i quali il tocco è un trascinamento

  var current = "default";

  function setState(next) {
    if (next === current) return;
    current = next;
    root.dataset.state = next;
  }

  // Fascia centrale "neutra" che riporta alla versione default: il puntatore
  // deve allontanarsi di almeno centerMargin px dal centro dello schermo per
  // attivare la metà sinistra o destra. Il valore viene dalla variabile CSS
  // --home-center-margin (css/home.css), la stessa che restringe i link.
  var centerMargin = 0;

  function readCenterMargin() {
    var value = getComputedStyle(root).getPropertyValue("--home-center-margin");
    centerMargin = parseFloat(value) || 0;
  }

  readCenterMargin();
  window.addEventListener("resize", readCenterMargin); // segue le media query

  function stateFromX(x) {
    var offset = x - window.innerWidth / 2;
    if (Math.abs(offset) < centerMargin) return "default";
    return offset < 0 ? "sx" : "dx";
  }

  /* ------------------------------------------------------------------------
     Mouse e penna: segue il puntatore tra le due metà
     ------------------------------------------------------------------------ */
  document.addEventListener("pointermove", function (event) {
    if (event.pointerType === "touch") return;
    setState(stateFromX(event.clientX));
  });

  /* ------------------------------------------------------------------------
     Touch: tocco veloce → apre la pagina; pressione lunga o trascinamento
     → solo anteprima della sfumatura
     ------------------------------------------------------------------------ */
  var touch = null; // { id, startX, startY, timer, preview }

  function startPreview(x) {
    touch.preview = true;
    setState(stateFromX(x));
  }

  function endTouch() {
    if (!touch) return;
    clearTimeout(touch.timer);
    touch.id = null;
  }

  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch" || !event.isPrimary) return;

    if (touch) clearTimeout(touch.timer);
    var x = event.clientX;
    touch = {
      id: event.pointerId,
      startX: x,
      startY: event.clientY,
      preview: false,
      timer: setTimeout(function () { startPreview(x); }, HOLD_DELAY)
    };
  });

  document.addEventListener("pointermove", function (event) {
    if (!touch || event.pointerId !== touch.id) return;

    if (!touch.preview) {
      var dx = event.clientX - touch.startX;
      var dy = event.clientY - touch.startY;
      if (Math.hypot(dx, dy) < MOVE_TOLERANCE) return;
      clearTimeout(touch.timer);
    }
    startPreview(event.clientX);
  });

  document.addEventListener("pointerup", function (event) {
    if (touch && event.pointerId === touch.id) endTouch();
  });

  document.addEventListener("pointercancel", function (event) {
    if (touch && event.pointerId === touch.id) {
      touch.preview = true; // gesto interrotto: non aprire nessuna pagina
      endTouch();
    }
  });

  /* ------------------------------------------------------------------------
     Link delle due metà
     ------------------------------------------------------------------------ */
  // Durata della transizione verde, letta dalla variabile CSS --home-duration
  // (300ms; quasi zero con "riduci movimento")
  function transitionDuration() {
    var value = getComputedStyle(root).getPropertyValue("--home-duration").trim();
    var ms = parseFloat(value) || 0;
    return /ms$/.test(value) ? ms : ms * 1000;
  }

  var TAP_HOLD = 100; // ms in più per vedere la sfumatura completa prima di uscire
  var navigating = false;

  root.querySelectorAll(".home__half").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var wasTouch = !!touch;
      var wasPreview = touch && touch.preview;
      touch = null;

      // Dopo una pressione lunga o un trascinamento il click non apre la pagina
      if (wasPreview) {
        event.preventDefault();
        return;
      }

      // Tocco veloce: prima la transizione verde della metà toccata, poi
      // si apre la pagina
      if (wasTouch) {
        event.preventDefault();
        if (navigating) return;
        navigating = true;
        setState(link.dataset.side);
        var href = link.href;
        setTimeout(function () {
          window.location.href = href;
        }, transitionDuration() + TAP_HOLD);
      }
    });

    // Niente menu contestuale del link durante la pressione lunga
    link.addEventListener("contextmenu", function (event) {
      if (touch) event.preventDefault();
    });

    // Tastiera: il link con il focus mostra la versione della sua metà
    link.addEventListener("focus", function () {
      setState(link.dataset.side);
    });
  });

  /* ------------------------------------------------------------------------
     Il mouse esce dalla finestra: si torna alla versione di default
     ------------------------------------------------------------------------ */
  document.documentElement.addEventListener("mouseleave", function () {
    setState("default");
  });
  window.addEventListener("blur", function () {
    setState("default");
  });

  // Tornando indietro (pagina ripresa dalla cache del browser) si riparte
  // dalla versione di default
  window.addEventListener("pageshow", function (event) {
    if (!event.persisted) return;
    navigating = false;
    touch = null;
    setState("default");
  });
})();
