/* ==========================================================================
   Pagina Mappa — scrollytelling con Mapbox
   - Ogni .step della colonna destra è un passo (data-step). Quando un passo
     attraversa la metà dello schermo diventa attivo: data-step su .mappa
     cambia la legenda (CSS) e la mappa aggiorna i suoi livelli (qui sotto).
   - Passi:  flow        → archi del flow generato (Figma: Dataviz-1)
             potenziale  → punti per classe e punteggio (Figma: Dataviz-2)
             tipologia   → punti per tipo di patrimonio (Figma: Dataviz-3)
   - Elenco enti, legende e grafici a bolle sono generati da js/mappa-dati.js.
   - Passando su un ente (mappa, elenco o bolla) si evidenzia ovunque.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector(".mappa");
  var DATI = window.HF_MAPPA;
  if (!root || !DATI) return;

  var CONFIG = window.HF_MAPBOX || {};
  var SVG_NS = "http://www.w3.org/2000/svg";
  var TRANSITION = { duration: 600, delay: 0 };

  var currentStep = root.dataset.step;
  var map = null;
  var mapReady = false;

  var byId = {};
  DATI.patrimoni.forEach(function (p) { byId[p.id] = p; });

  /* Colori dalle variabili CSS di style.css (unica fonte) */
  var styles = getComputedStyle(document.documentElement);
  function cssColor(name) {
    return styles.getPropertyValue(name).trim();
  }

  // Classi ordinate per soglia crescente (servono a "step" di Mapbox)
  var classi = DATI.classiPotenziale.slice().sort(function (a, b) { return a.min - b.min; });

  function classeDi(punteggio) {
    var trovata = classi[0];
    classi.forEach(function (c) { if (punteggio >= c.min) trovata = c; });
    return trovata;
  }

  var tipiById = {};
  DATI.tipi.forEach(function (t) { tipiById[t.id] = t; });

  /* ------------------------------------------------------------------------
     Colonna destra e legende
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function renderEnti() {
    var list = root.querySelector('[data-elenco="enti"]');
    if (!list) return;
    DATI.patrimoni.forEach(function (p) {
      var li = el("li");
      li.dataset.id = p.id;
      li.appendChild(el("span", "enti__nome", p.nome));
      li.appendChild(el("span", "enti__prov", p.prov));
      list.appendChild(li);
    });
  }

  function renderLegende() {
    root.querySelectorAll("[data-voci]").forEach(function (list) {
      (DATI[list.dataset.voci] || []).forEach(function (voce) {
        var li = el("li", "legenda__voce text-body");
        var chiave = el("span", "legenda__chiave");
        chiave.style.setProperty("--voce-colore", "var(" + voce.colore + ")");
        li.appendChild(chiave);
        li.appendChild(el("span", null, voce.etichetta));
        list.appendChild(li);
      });
    });
  }

  function svg(tag, attrs) {
    var node = document.createElementNS(SVG_NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    return node;
  }

  function bolla(x, y, r, colore, etichetta, fontSize, titolo) {
    var g = svg("g", { "class": "bolla" });
    var t = svg("title");
    t.textContent = titolo;
    g.appendChild(t);
    g.appendChild(svg("circle", { cx: x, cy: y, r: r, fill: colore }));
    var text = svg("text", { x: x, y: y, "font-size": fontSize });
    text.textContent = etichetta;
    g.appendChild(text);
    return g;
  }

  // Figma: Data viz 2 — una bolla per ente, raggio = punteggio
  function renderGraficoPotenziale() {
    var fig = root.querySelector('[data-grafico="potenziale"]');
    if (!fig) return;
    var s = svg("svg", { viewBox: "0 0 425 330", role: "img",
      "aria-label": "Punteggio di potenziale di valorizzazione per ciascun ente" });
    DATI.patrimoni.forEach(function (p) {
      var r = p.potenziale;
      var size = r >= 59 ? 32 : r >= 43 ? 24 : 16;
      var g = bolla(p.bolla.x, p.bolla.y, r, cssColor(classeDi(r).colore),
        r + " / 100", size, p.nome + ": " + r + " / 100");
      g.dataset.id = p.id;
      s.appendChild(g);
    });
    fig.appendChild(s);
  }

  // Figma: Data viz 4 — una bolla per tipo, percentuale sul totale
  function renderGraficoTipologia() {
    var fig = root.querySelector('[data-grafico="tipologia"]');
    if (!fig) return;
    var totale = DATI.patrimoni.length;
    var s = svg("svg", { viewBox: "0 0 425 379", role: "img",
      "aria-label": "Quota di enti per tipo di patrimonio" });
    DATI.tipi.forEach(function (tipo) {
      var pos = DATI.bolleTipi[tipo.id];
      if (!pos) return;
      var n = DATI.patrimoni.filter(function (p) { return p.tipo === tipo.id; }).length;
      var perc = Math.round((n / totale) * 100) + "%";
      var size = pos.r >= 100 ? 56 : pos.r >= 50 ? 32 : 24;
      s.appendChild(bolla(pos.x, pos.y, pos.r, cssColor(tipo.colore), perc, size,
        tipo.etichetta + ": " + perc));
    });
    fig.appendChild(s);
  }

  /* ------------------------------------------------------------------------
     Evidenziazione condivisa tra mappa, elenco e bolle
     ------------------------------------------------------------------------ */
  var highlighted = null;

  function highlight(id) {
    if (id === highlighted) return;
    if (highlighted) {
      root.querySelectorAll('[data-id="' + highlighted + '"]').forEach(function (n) {
        n.classList.remove("is-highlighted");
      });
      if (mapReady) map.setFeatureState({ source: "patrimoni", id: highlighted }, { hover: false });
    }
    highlighted = id;
    if (id) {
      root.querySelectorAll('[data-id="' + id + '"]').forEach(function (n) {
        n.classList.add("is-highlighted");
      });
      if (mapReady) map.setFeatureState({ source: "patrimoni", id: id }, { hover: true });
    }
  }

  function bindHighlight() {
    root.querySelectorAll(".mappa__steps [data-id]").forEach(function (node) {
      node.addEventListener("mouseenter", function () { highlight(node.dataset.id); });
      node.addEventListener("mouseleave", function () { highlight(null); });
    });
  }

  /* ------------------------------------------------------------------------
     Dati geografici
     ------------------------------------------------------------------------ */
  function puntiGeoJSON() {
    return {
      type: "FeatureCollection",
      features: DATI.patrimoni.map(function (p) {
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: p.coordinate },
          properties: { id: p.id, nome: p.nome, prov: p.prov, potenziale: p.potenziale, tipo: p.tipo }
        };
      })
    };
  }

  // Arco tra due punti: curva di Bézier quadratica che si alza verso nord
  function arco(a, b, campioni) {
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var dist = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / (dist || 1);
    var ny = dx / (dist || 1);
    if (ny < 0) { nx = -nx; ny = -ny; }        // sempre verso nord
    var bulge = dist * 0.35;
    var c = [(a[0] + b[0]) / 2 + nx * bulge, (a[1] + b[1]) / 2 + ny * bulge];
    var coords = [];
    for (var i = 0; i <= campioni; i++) {
      var t = i / campioni;
      var u = 1 - t;
      coords.push([
        u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
        u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]
      ]);
    }
    return coords;
  }

  function flowGeoJSON() {
    var features = [];
    for (var i = 0; i < DATI.flow.length - 1; i++) {
      var a = byId[DATI.flow[i]];
      var b = byId[DATI.flow[i + 1]];
      if (!a || !b) continue;
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: arco(a.coordinate, b.coordinate, 48) },
        properties: { da: a.id, a: b.id, ordine: i }
      });
    }
    return { type: "FeatureCollection", features: features };
  }

  /* ------------------------------------------------------------------------
     Stile dei livelli per ogni passo
     ------------------------------------------------------------------------ */
  // Raggio più grande quando l'ente è evidenziato
  function conHover(raggio) {
    return ["case", ["boolean", ["feature-state", "hover"], false], ["+", raggio, 4], raggio];
  }

  function coloreClassi() {
    var expr = ["step", ["get", "potenziale"], cssColor(classi[0].colore)];
    classi.slice(1).forEach(function (c) { expr.push(c.min, cssColor(c.colore)); });
    return expr;
  }

  function coloreTipi() {
    var expr = ["match", ["get", "tipo"]];
    DATI.tipi.forEach(function (t) { expr.push(t.id, cssColor(t.colore)); });
    expr.push(cssColor("--color-dark"));
    return expr;
  }

  var STEP_STYLES = {
    flow: function () {
      return {
        lineOpacity: 1,
        radius: conHover(8),
        color: cssColor("--color-main")
      };
    },
    potenziale: function () {
      return {
        lineOpacity: 0,
        radius: conHover(["interpolate", ["linear"], ["get", "potenziale"], 30, 8, 75, 22]),
        color: coloreClassi()
      };
    },
    tipologia: function () {
      return {
        lineOpacity: 0,
        radius: conHover(10),
        color: coloreTipi()
      };
    }
  };

  function applyStepToMap(step) {
    if (!mapReady || !STEP_STYLES[step]) return;
    var s = STEP_STYLES[step]();
    map.setPaintProperty("flow-linee", "line-opacity", s.lineOpacity);
    map.setPaintProperty("patrimoni-punti", "circle-radius", s.radius);
    map.setPaintProperty("patrimoni-punti", "circle-color", s.color);
  }

  /* ------------------------------------------------------------------------
     Mappa
     ------------------------------------------------------------------------ */
  function avviso(container, testo) {
    container.appendChild(el("p", "mappa__avviso text-body", testo));
  }

  function popupHTML(p) {
    var dato;
    if (currentStep === "potenziale") dato = "Potenziale " + p.potenziale + " / 100 — " + classeDi(p.potenziale).etichetta;
    else if (currentStep === "tipologia") dato = (tipiById[p.tipo] || {}).etichetta || "";
    else dato = "Tappa " + (DATI.flow.indexOf(p.id) + 1) + " del flow";

    var box = el("div", "mappa__popup");
    box.appendChild(el("span", "text-label", p.nome + " (" + p.prov + ")"));
    box.appendChild(el("span", "mappa__popup-dato text-label", dato));
    return box;
  }

  function initMap() {
    var container = document.getElementById("mappa-map");
    if (!container) return;

    if (!window.mapboxgl) {
      avviso(container, "Impossibile caricare Mapbox GL JS.");
      return;
    }
    if (!CONFIG.token) {
      avviso(container, "Manca il token Mapbox: inseriscilo in js/mapbox-config.js.");
      return;
    }

    mapboxgl.accessToken = CONFIG.token;

    var bounds = new mapboxgl.LngLatBounds();
    DATI.patrimoni.forEach(function (p) { bounds.extend(p.coordinate); });

    map = new mapboxgl.Map({
      container: container,
      style: CONFIG.style || "mapbox://styles/mapbox/light-v11",
      bounds: bounds,
      fitBoundsOptions: { padding: 60 },
      attributionControl: true,
      language: "it"
    });

    // La rotella fa scorrere la pagina (scrollytelling), lo zoom resta
    // disponibile con i pulsanti, il doppio click e il pinch
    map.scrollZoom.disable();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", function () {
      map.addSource("flow", { type: "geojson", data: flowGeoJSON() });
      map.addSource("patrimoni", { type: "geojson", data: puntiGeoJSON(), promoteId: "id" });

      map.addLayer({
        id: "flow-linee",
        type: "line",
        source: "flow",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": cssColor("--color-7"),
          "line-width": 3,
          "line-opacity": 0,
          "line-opacity-transition": TRANSITION
        }
      });

      map.addLayer({
        id: "patrimoni-punti",
        type: "circle",
        source: "patrimoni",
        paint: {
          "circle-radius": 8,
          "circle-color": cssColor("--color-main"),
          "circle-stroke-width": 1,
          "circle-stroke-color": cssColor("--color-dark"),
          "circle-radius-transition": TRANSITION,
          "circle-color-transition": TRANSITION
        }
      });

      mapReady = true;
      applyStepToMap(currentStep);
      bindMapEvents();
    });

    // Il riquadro cambia altezza con il layout: la mappa si adegua
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { map.resize(); }).observe(container);
    }
  }

  function bindMapEvents() {
    var popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });

    map.on("mousemove", "patrimoni-punti", function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      var p = byId[f.properties.id];
      map.getCanvas().style.cursor = "pointer";
      highlight(p.id);
      popup.setLngLat(p.coordinate).setDOMContent(popupHTML(p)).addTo(map);
    });

    map.on("mouseleave", "patrimoni-punti", function () {
      map.getCanvas().style.cursor = "";
      highlight(null);
      popup.remove();
    });

    // Click / tocco: centra la mappa sull'ente
    map.on("click", "patrimoni-punti", function (e) {
      var f = e.features && e.features[0];
      if (!f) return;
      var p = byId[f.properties.id];
      map.easeTo({ center: p.coordinate, zoom: Math.max(map.getZoom(), 9) });
      popup.setLngLat(p.coordinate).setDOMContent(popupHTML(p)).addTo(map);
    });
  }

  /* ------------------------------------------------------------------------
     Scorrimento: il passo che attraversa la metà dello schermo è attivo
     ------------------------------------------------------------------------ */
  function setStep(step) {
    if (!step || step === currentStep) return;
    currentStep = step;
    root.dataset.step = step;
    root.querySelectorAll(".step").forEach(function (s) {
      s.classList.toggle("is-active", s.dataset.step === step);
    });
    applyStepToMap(step);
  }

  function observeSteps() {
    var steps = root.querySelectorAll(".step");
    if (!("IntersectionObserver" in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setStep(entry.target.dataset.step);
      });
    }, { rootMargin: "-50% 0px -50% 0px", threshold: 0 });
    steps.forEach(function (s) { observer.observe(s); });
  }

  renderEnti();
  renderLegende();
  renderGraficoPotenziale();
  renderGraficoTipologia();
  bindHighlight();
  observeSteps();
  initMap();
})();
