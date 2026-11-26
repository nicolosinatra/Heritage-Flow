/* ==========================================================================
   Pagina Mappa — scrollytelling con Mapbox
   - Ogni .step della colonna destra è un passo (data-step). Quando un passo
     attraversa la metà dello schermo diventa attivo: data-step su .mappa
     cambia la legenda (CSS) e la mappa aggiorna i suoi livelli (qui sotto).
   - Passi:  flow        → archi del flow generato (Figma: Dataviz-1)
             potenziale  → punti colorati per classe (Figma: Dataviz-2)
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
      // Cliccabile (anche da tastiera): zoom sul caso studio nella mappa
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-label", p.nome + " (" + p.prov + "): mostra sulla mappa");
      li.appendChild(el("span", "enti__nome", p.nome));
      li.appendChild(el("span", "enti__prov", p.prov));
      li.addEventListener("click", function () { zoomSuEnte(p.id); });
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          zoomSuEnte(p.id);
        }
      });
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
        // Etichetta intera e breve: il CSS mostra la breve in XS e S
        li.appendChild(el("span", "legenda__testo", voce.etichetta));
        if (voce.breve) li.appendChild(el("span", "legenda__testo-breve", voce.breve));
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
    // Gruppo sulla mappa che contiene l'ente
    root.querySelectorAll(".mappa__cluster").forEach(function (n) {
      var ids = (n.dataset.ids || "").split(" ");
      n.classList.toggle("is-highlighted", !!id && ids.indexOf(id) >= 0);
    });
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

  // Arco tra due punti (Figma: Dataviz-1): parte dalle tappe verso l'alto e
  // si alza verso nord, come un ponte visto in prospettiva.
  // È costruito come un tracciato di Illustrator/Figma: tre punti di
  // ancoraggio (tappa a → cima → tappa b) uniti da due curve di Bézier.
  //   - In cima la maniglia è orizzontale e simmetrica (punto "smooth"): la
  //     tangente è continua.
  //   - Le maniglie alle tappe sono calcolate in modo che le due metà abbiano
  //     anche la stessa curvatura in cima: niente spigolo, anche quando le
  //     tappe sono ad altezze diverse.
  // Calcolato in coordinate Mercator (quelle dello schermo), così non si
  // schiaccia.
  // ARCO_ALTEZZA: altezza della cima sopra la tappa più alta, in frazioni di
  // metà distanza tra le tappe (1 = alto come un semicerchio).
  var ARCO_ALTEZZA = 0.75;
  // ARCO_MANIGLIA_CIMA: lunghezza delle maniglie in cima, in frazioni di metà
  // larghezza dell'arco. 0.55 = tondo come un cerchio, di più = cima più piatta
  // e morbida, di meno = cima più stretta.
  var ARCO_MANIGLIA_CIMA = 0.45;
  // ARCO_MANIGLIA_BASE: lunghezza delle maniglie alle tappe (sul lato più
  // basso dell'arco), in frazioni della sua altezza. 0.55 = come un cerchio.
  var ARCO_MANIGLIA_BASE = 0.55;
  // ARCO_APERTURA: inclinazione delle maniglie alle tappe, in gradi. 0 =
  // l'arco parte in verticale, più alto = parte più aperto verso l'esterno.
  var ARCO_APERTURA = 0;
  // ARCO_CAMPIONI: punti con cui è disegnato ogni arco (più = più fluido)
  var ARCO_CAMPIONI = 256;

  function bezier(p0, p1, p2, p3, t) {
    var u = 1 - t;
    var k0 = u * u * u, k1 = 3 * u * u * t, k2 = 3 * u * t * t, k3 = t * t * t;
    return {
      x: k0 * p0.x + k1 * p1.x + k2 * p2.x + k3 * p3.x,
      y: k0 * p0.y + k1 * p1.y + k2 * p2.y + k3 * p3.y
    };
  }

  function arco(a, b, campioni) {
    var pa = mapboxgl.MercatorCoordinate.fromLngLat(a);
    var pb = mapboxgl.MercatorCoordinate.fromLngLat(b);
    var dx = pb.x - pa.x;
    var dy = pb.y - pa.y;
    var corda = Math.sqrt(dx * dx + dy * dy);
    if (!corda) return [a, b];

    // Ancoraggio in cima, a metà tra le tappe (y cresce verso sud)
    var cima = { x: (pa.x + pb.x) / 2, y: Math.min(pa.y, pb.y) - ARCO_ALTEZZA * corda / 2 };
    var semiLarghezza = dx / 2;                       // con segno: verso di b
    var hA = pa.y - cima.y;                           // altezza dell'arco sopra a
    var hB = pb.y - cima.y;                           // e sopra b

    // Maniglie della cima: orizzontali e simmetriche
    var manCima = semiLarghezza * ARCO_MANIGLIA_CIMA;
    var cimaIn = { x: cima.x - manCima, y: cima.y };
    var cimaOut = { x: cima.x + manCima, y: cima.y };

    // Maniglie alle tappe: la parte verticale che resta "scoperta" sotto la
    // cima (h · (1 − k)) è uguale sui due lati → stessa curvatura in cima
    var scoperta = Math.min(hA, hB) * (1 - ARCO_MANIGLIA_BASE);
    var ap = ARCO_APERTURA * Math.PI / 180;
    function maniglia(p, h, versoEsterno) {
      var lungh = Math.max(h - scoperta, 0);
      return {
        x: p.x + versoEsterno * Math.tan(ap) * lungh,
        y: p.y - lungh
      };
    }
    var verso = dx >= 0 ? 1 : -1;
    var manA = maniglia(pa, hA, -verso);
    var manB = maniglia(pb, hB, verso);

    var meta = Math.floor(campioni / 2);
    var coords = [];
    function aggiungi(p) {
      var ll = new mapboxgl.MercatorCoordinate(p.x, p.y).toLngLat();
      coords.push([ll.lng, ll.lat]);
    }
    for (var i = 0; i <= meta; i++) aggiungi(bezier(pa, manA, cimaIn, cima, i / meta));
    for (var j = 1; j <= meta; j++) aggiungi(bezier(cima, cimaOut, manB, pb, j / meta));

    coords[0] = a;          // estremi esatti
    coords[coords.length - 1] = b;
    return coords;
  }

  // Coppie di tappe collegate: la sequenza del flow più un arco che unisce
  // l'ente più a ovest a quello più a est (Figma: arco esterno di Dataviz-1)
  function coppieFlow() {
    var coppie = [];
    for (var i = 0; i < DATI.flow.length - 1; i++) {
      coppie.push([DATI.flow[i], DATI.flow[i + 1]]);
    }
    var ovest = DATI.patrimoni[0];
    var est = DATI.patrimoni[0];
    DATI.patrimoni.forEach(function (p) {
      if (p.coordinate[0] < ovest.coordinate[0]) ovest = p;
      if (p.coordinate[0] > est.coordinate[0]) est = p;
    });
    if (ovest !== est) coppie.push([ovest.id, est.id]);
    return coppie;
  }

  // posizioni: id → punto mostrato sulla mappa (il centro del gruppo se
  // l'ente è raggruppato). Gli archi tra enti dello stesso gruppo spariscono.
  function flowGeoJSON(posizioni) {
    posizioni = posizioni || {};
    var features = [];
    coppieFlow().forEach(function (coppia, i) {
      var a = byId[coppia[0]];
      var b = byId[coppia[1]];
      if (!a || !b) return;
      var pa = posizioni[a.id] || a.coordinate;
      var pb = posizioni[b.id] || b.coordinate;
      if (pa[0] === pb[0] && pa[1] === pb[1]) return;
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: arco(pa, pb, ARCO_CAMPIONI) },
        properties: { da: a.id, a: b.id, ordine: i }
      });
    });
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

  // Figma: Dataviz-1/2/3 — punti tutti uguali (16px, bordo scuro), cambia
  // solo il colore di riempimento
  var PUNTO_RAGGIO = 8;

  var STEP_STYLES = {
    flow: function () {
      return { lineOpacity: 1, color: cssColor("--color-light") };
    },
    potenziale: function () {
      return { lineOpacity: 0, color: coloreClassi() };
    },
    tipologia: function () {
      return { lineOpacity: 0, color: coloreTipi() };
    }
  };

  function applyStepToMap(step) {
    if (!mapReady || !STEP_STYLES[step]) return;
    var s = STEP_STYLES[step]();
    map.setPaintProperty("flow-linee", "line-opacity", s.lineOpacity);
    map.setPaintProperty("patrimoni-punti", "circle-color", s.color);
    Object.keys(clusterMarkers).forEach(function (id) {
      disegnaCluster(clusterMarkers[id].node, clusterMarkers[id].props);
    });
  }

  /* ------------------------------------------------------------------------
     Gruppi di enti vicini (Figma: "Casi studio Flow"): un cerchio diviso in
     spicchi, uno per ente, con il numero di enti al centro. Usa il
     clustering di Mapbox: con lo zoom i gruppi si separano.
     ------------------------------------------------------------------------ */
  var CLUSTER_RAGGIO = 25;     // distanza (px) entro cui gli enti si uniscono
  var CLUSTER_MAX_ZOOM = 11;   // oltre questo zoom i punti sono sempre separati
  var clusterMarkers = {};     // cluster_id → { marker, node, props, onMap }

  // Conteggi per classe e per tipo dentro ogni gruppo (per gli spicchi)
  function clusterProperties() {
    var props = {};
    classi.forEach(function (c, i) {
      var sopra = classi[i + 1];
      var cond = [">=", ["get", "potenziale"], c.min];
      if (sopra) cond = ["all", cond, ["<", ["get", "potenziale"], sopra.min]];
      props["classe_" + c.id] = ["+", ["case", cond, 1, 0]];
    });
    DATI.tipi.forEach(function (t) {
      props["tipo_" + t.id] = ["+", ["case", ["==", ["get", "tipo"], t.id], 1, 0]];
    });
    return props;
  }

  function spicchiCluster(props) {
    if (currentStep === "potenziale") {
      return classi.slice().reverse().map(function (c) {
        return { colore: cssColor(c.colore), n: props["classe_" + c.id] || 0 };
      });
    }
    if (currentStep === "tipologia") {
      return DATI.tipi.map(function (t) {
        return { colore: cssColor(t.colore), n: props["tipo_" + t.id] || 0 };
      });
    }
    return [{ colore: cssColor("--color-light"), n: props.point_count }];
  }

  function disegnaCluster(node, props) {
    var totale = props.point_count;
    var stops = [];
    var da = 0;
    spicchiCluster(props).forEach(function (s) {
      if (!s.n) return;
      var a = da + (s.n / totale) * 360;
      stops.push(s.colore + " " + da + "deg " + a + "deg");
      da = a;
    });
    node.style.setProperty("--cluster-spicchi", "conic-gradient(" + stops.join(", ") + ")");
  }

  function creaCluster(id, props, coord) {
    var node = el("button", "mappa__cluster text-h4", String(props.point_count));
    node.type = "button";
    var lato = Math.min(PUNTO_RAGGIO * 2 * props.point_count, 64);
    node.style.setProperty("--cluster-lato", lato + "px");
    node.setAttribute("aria-label", props.point_count + " enti vicini: avvicina la mappa");

    // Mapbox posiziona il marker con "transform" sull'elemento esterno: il
    // cerchio sta dentro, così il suo ingrandimento non ne sposta la posizione
    var contenitore = el("div", "mappa__cluster-marker");
    contenitore.appendChild(node);

    var gruppo = {
      node: node,
      props: props,
      coord: coord,
      ids: null,               // enti del gruppo, arrivano in modo asincrono
      marker: new mapboxgl.Marker({ element: contenitore }).setLngLat(coord),
      onMap: false
    };

    var source = map.getSource("patrimoni");
    source.getClusterLeaves(id, Infinity, 0, function (err, leaves) {
      if (err || !leaves) return;
      var ids = leaves.map(function (f) { return f.properties.id; });
      gruppo.ids = ids;
      node.dataset.ids = ids.join(" ");
      node.title = ids.map(function (i) { return byId[i].nome; }).join(", ");
      if (highlighted && ids.indexOf(highlighted) >= 0) node.classList.add("is-highlighted");
      map.triggerRepaint();    // ricalcola gli archi con il gruppo completo
    });

    node.addEventListener("click", function () {
      source.getClusterExpansionZoom(id, function (err, zoom) {
        if (err) return;
        map.easeTo({ center: coord, zoom: zoom });
      });
    });

    disegnaCluster(node, props);
    return gruppo;
  }

  // Gli archi del flow seguono i gruppi: un ente raggruppato è collegato al
  // centro del suo gruppo. Si ricalcolano solo quando i gruppi cambiano.
  var flowChiave = null;

  function aggiornaFlow(visibili) {
    var ids = Object.keys(visibili).sort();
    var pronti = ids.every(function (id) { return clusterMarkers[id].ids; });
    if (!pronti) return;                     // aspetta gli enti dei gruppi
    var chiave = ids.join(",");
    if (chiave === flowChiave) return;
    flowChiave = chiave;

    var posizioni = {};
    ids.forEach(function (id) {
      var g = clusterMarkers[id];
      g.ids.forEach(function (enteId) { posizioni[enteId] = g.coord; });
    });
    map.getSource("flow").setData(flowGeoJSON(posizioni));
  }

  function aggiornaCluster() {
    if (!mapReady || !map.isSourceLoaded("patrimoni")) return;
    var visibili = {};
    map.querySourceFeatures("patrimoni").forEach(function (f) {
      var props = f.properties;
      if (!props.cluster) return;
      var id = props.cluster_id;
      if (visibili[id]) return;
      visibili[id] = true;
      var m = clusterMarkers[id] || (clusterMarkers[id] = creaCluster(id, props, f.geometry.coordinates));
      if (!m.onMap) { m.marker.addTo(map); m.onMap = true; }
    });
    Object.keys(clusterMarkers).forEach(function (id) {
      if (!visibili[id] && clusterMarkers[id].onMap) {
        clusterMarkers[id].marker.remove();
        clusterMarkers[id].onMap = false;
      }
    });
    aggiornaFlow(visibili);
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

  // Vista iniziale: il centro sta tra quello dei casi studio e quello dei
  // casi studio con gli archi (VISTA_EQUILIBRIO: 0 = solo casi studio,
  // 1 = casi studio + archi). Lo zoom è il più alto con cui i casi studio
  // hanno PUNTI_MARGINE px di margine e gli archi ARCHI_MARGINE px.
  // Sotto L (XS, S, M) la mappa è piccola: margini ridotti, zoom più vicino.
  var VISTA_EQUILIBRIO = 0.5;
  var PUNTI_MARGINE = 60;
  var ARCHI_MARGINE = 32;
  var PUNTI_MARGINE_PICCOLO = 24;
  var ARCHI_MARGINE_PICCOLO = 12;

  function mercatore(coord) {
    return mapboxgl.MercatorCoordinate.fromLngLat(coord);
  }

  function centroRiquadro(punti) {
    var xs = punti.map(function (m) { return m.x; });
    var ys = punti.map(function (m) { return m.y; });
    return {
      x: (Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2,
      y: (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2
    };
  }

  // Zoom massimo con cui tutti i punti stanno nel riquadro attorno al centro.
  // Ampiezza del mondo in px allo zoom z: 512 · 2^z
  function zoomMassimo(punti, centro, margine, w, h) {
    var maxDx = 0;
    var maxDy = 0;
    punti.forEach(function (m) {
      maxDx = Math.max(maxDx, Math.abs(m.x - centro.x));
      maxDy = Math.max(maxDy, Math.abs(m.y - centro.y));
    });
    var zoom = 22;
    var metaW = w / 2 - margine;
    var metaH = h / 2 - margine;
    if (maxDx > 0 && metaW > 0) zoom = Math.min(zoom, Math.log2(metaW / (maxDx * 512)));
    if (maxDy > 0 && metaH > 0) zoom = Math.min(zoom, Math.log2(metaH / (maxDy * 512)));
    return zoom;
  }

  var vistaBase = null;      // { center, zoom } calcolati qui sotto

  // Pulsante sotto + e −: riporta la mappa alla vista iniziale. Solo su
  // richiesta: il cambio di passo non tocca la vista.
  function ControlloVistaIniziale() {}
  ControlloVistaIniziale.prototype.onAdd = function () {
    var box = el("div", "mapboxgl-ctrl mapboxgl-ctrl-group");
    var btn = el("button", "mappa__ctrl-vista");
    btn.type = "button";
    btn.title = "Torna alla vista iniziale";
    btn.setAttribute("aria-label", "Torna alla vista iniziale");
    btn.appendChild(el("span", "mapboxgl-ctrl-icon"));
    btn.addEventListener("click", tornaAllaVistaIniziale);
    box.appendChild(btn);
    this._box = box;
    return box;
  };
  ControlloVistaIniziale.prototype.onRemove = function () {
    this._box.remove();
  };

  function tornaAllaVistaIniziale() {
    if (!vistaBase) return;
    if (popup) popup.remove();
    map.flyTo({ center: vistaBase.center, zoom: vistaBase.zoom, speed: 1.2, essential: true });
  }

  function vistaIniziale(container) {
    var punti = DATI.patrimoni.map(function (p) { return mercatore(p.coordinate); });
    var archi = [];
    flowGeoJSON().features.forEach(function (f) {
      f.geometry.coordinates.forEach(function (c) { archi.push(mercatore(c)); });
    });

    var cPunti = centroRiquadro(punti);
    var cTutto = centroRiquadro(punti.concat(archi));
    var centro = {
      x: cPunti.x + (cTutto.x - cPunti.x) * VISTA_EQUILIBRIO,
      y: cPunti.y + (cTutto.y - cPunti.y) * VISTA_EQUILIBRIO
    };

    var w = container.clientWidth;
    var h = container.clientHeight;
    var grande = window.matchMedia("(min-width: 992px)").matches;
    var zoom = Math.min(
      zoomMassimo(punti, centro, grande ? PUNTI_MARGINE : PUNTI_MARGINE_PICCOLO, w, h),
      zoomMassimo(archi, centro, grande ? ARCHI_MARGINE : ARCHI_MARGINE_PICCOLO, w, h)
    );
    var lngLat = new mapboxgl.MercatorCoordinate(centro.x, centro.y).toLngLat();
    vistaBase = { center: lngLat, zoom: zoom };
    map.jumpTo(vistaBase);
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
      // Logo e attribuzione sono obbligatori (condizioni d'uso di Mapbox):
      // l'attribuzione si aggiunge sotto, compatta in tutte le versioni
      attributionControl: false,
      language: "it"
    });
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
    vistaIniziale(container);

    // Gesti di Mapbox attivi: con il puntatore sulla mappa rotella e
    // trackpad zoomano, trascinando si sposta, su mobile pinch e trascinamento.
    // Fuori dalla mappa la rotella fa scorrere la pagina (scrollytelling).
    // Rotazione e inclinazione restano spente: gli archi vanno sempre verso nord.
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();
    map.touchPitch.disable();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new ControlloVistaIniziale(), "top-right");

    map.on("load", function () {
      // tolerance 0: Mapbox non semplifica le linee, gli archi restano curvi
      map.addSource("flow", { type: "geojson", data: flowGeoJSON(), tolerance: 0 });
      map.addSource("patrimoni", {
        type: "geojson",
        data: puntiGeoJSON(),
        promoteId: "id",
        cluster: true,
        clusterRadius: CLUSTER_RAGGIO,
        clusterMaxZoom: CLUSTER_MAX_ZOOM,
        clusterProperties: clusterProperties()
      });

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
        filter: ["!", ["has", "point_count"]],   // i gruppi sono marker HTML
        paint: {
          "circle-radius": conHover(PUNTO_RAGGIO),
          "circle-color": cssColor("--color-light"),
          "circle-stroke-width": 1,
          "circle-stroke-color": cssColor("--color-dark"),
          "circle-radius-transition": TRANSITION,
          "circle-color-transition": TRANSITION
        }
      });

      mapReady = true;
      applyStepToMap(currentStep);
      bindMapEvents();
      map.on("render", aggiornaCluster);
    });

    // Il riquadro cambia altezza con il layout: la mappa si adegua
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { map.resize(); }).observe(container);
    }
  }

  var popup = null;

  // Zoom su un caso studio (click sull'elenco di destra). Lo zoom supera
  // CLUSTER_MAX_ZOOM, così l'ente è sempre separato dai gruppi.
  var ZOOM_ENTE = CLUSTER_MAX_ZOOM + 1;

  function zoomSuEnte(id) {
    var p = byId[id];
    if (!p || !mapReady) return;
    map.flyTo({ center: p.coordinate, zoom: ZOOM_ENTE, speed: 1.2, essential: true });
    popup.setLngLat(p.coordinate).setDOMContent(popupHTML(p)).addTo(map);

    // Sotto L la mappa sta sopra l'elenco: se non si vede, ci si torna
    var box = map.getContainer().getBoundingClientRect();
    if (box.bottom < 0 || box.top > window.innerHeight) {
      map.getContainer().scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function bindMapEvents() {
    popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 14 });

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
     Scorrimento: il passo che attraversa la metà dell'area che scorre è
     attivo. Da L scorre la pagina; sotto L scorre solo il contenitore dei
     passi (css/mappa.css), quindi si osserva quello.
     ------------------------------------------------------------------------ */
  var modoL = window.matchMedia("(min-width: 992px)");
  var stepObserver = null;
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
    if (stepObserver) stepObserver.disconnect();
    stepObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setStep(entry.target.dataset.step);
      });
    }, {
      root: modoL.matches ? null : root.querySelector(".mappa__steps"),
      rootMargin: "-50% 0px -50% 0px",
      threshold: 0
    });
    steps.forEach(function (s) { stepObserver.observe(s); });
  }

  // Passando da L a M (o viceversa) cambia l'area che scorre
  modoL.addEventListener("change", observeSteps);

  renderEnti();
  renderLegende();
  renderGraficoPotenziale();
  renderGraficoTipologia();
  bindHighlight();
  observeSteps();
  initMap();
})();
