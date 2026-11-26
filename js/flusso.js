/* ==========================================================================
   Heritage Flow — come nasce un flow (heritage-flow.html)
   Lo schema del flow in verticale: per ogni tappa (patrimonio, tempo,
   filiera, utenti) i nodi delle voci, uno sotto l'altro su una colonna
   (la linea puntinata dello schema), e accanto tutte le opzioni. Le voci e
   le opzioni sono quelle di "Genera" (js/flow-campi.js).
   Un esempio (ESEMPIO) sceglie un'opzione per tappa: la linea arancione
   collega le scelte con archi a sinistra della colonna e arriva al FLOW;
   si disegna man mano che la pagina scorre.
   ========================================================================== */

(function () {
  "use strict";

  var lista = document.querySelector('[data-flusso="tappe"]');
  var CAMPI = window.HF_FLOW_CAMPI;
  if (!lista || !CAMPI) return;

  var schema = lista.closest(".flusso__schema");
  var svgLinee = schema.querySelector(".flusso__linee");
  var SVG_NS = "http://www.w3.org/2000/svg";

  function campo(id) {
    return CAMPI.filter(function (c) { return c.id === id; })[0];
  }

  function gruppo(id, i) {
    var c = campo(id);
    return c && c.gruppi && c.gruppi[i] ? c.gruppi[i].voci : [];
  }

  // Decenni di un secolo (fino a quello in corso)
  function decenni(secolo) {
    var anno = new Date().getFullYear();
    var out = [];
    for (var a = +secolo; a < +secolo + 100 && a <= anno; a += 10) out.push(String(a));
    return out;
  }

  /* L'esempio: il percorso dello schema Figma (Tipologia → Periodo →
     Macrosettore → Fasce d'età). scelta: indice della voce scelta nella
     tappa e opzioni evidenziate */
  var ESEMPIO = {
    patrimonio: "industriale",
    dal: "1920",
    al: "oggi",
    macrosettore: "industrie manifatturiere e produttive",
    eta: "giovani adulti: 18–34"
  };

  /* Le tappe dello schema, con i colori di Figma (Flow schema).
     voci: { titolo, righe: [{ etichetta?, opzioni, scelte }] }, scelta:
     true sulla voce da cui passa l'esempio */
  var inizi = (campo("periodo") || {}).inizi || [];
  var TAPPE = [
    {
      id: "patrimonio", nome: "patrimonio", colore: "--color-main-light",
      testo: "Quale patrimonio? Si sceglie almeno una voce tra tipologia, natura e dimensione. Più voci si sommano: “industriale e museale”.",
      voci: [
        { titolo: "Tipologia", scelta: true, righe: [{ opzioni: gruppo("patrimonio", 0), scelte: [ESEMPIO.patrimonio] }] },
        { titolo: "Natura", righe: [{ opzioni: gruppo("patrimonio", 2), scelte: [] }] },
        { titolo: "Dimensione", righe: [{ opzioni: gruppo("patrimonio", 1), scelte: [] }] }
      ]
    },
    {
      id: "tempo", nome: "tempo", colore: "--color-2",
      testo: "In quale periodo? Un intervallo: prima il secolo, poi il decennio di inizio e di fine, fino a oggi. Entrano i casi studio attivi in almeno un anno dell’intervallo.",
      voci: [
        { titolo: "Periodo", scelta: true, righe: [
          { etichetta: "secolo", opzioni: inizi, scelte: ["1900"] },
          { etichetta: "dal", opzioni: decenni("1900"), scelte: [ESEMPIO.dal] },
          { etichetta: "al", opzioni: decenni("1900").filter(function (a) { return +a > +ESEMPIO.dal; }).concat(["oggi"]), scelte: [ESEMPIO.al] }
        ] }
      ]
    },
    {
      id: "filiera", nome: "filiera", colore: "--color-3",
      testo: "Quale filiera? Il macrosettore e il settore di attività in cui operano i patrimoni.",
      voci: [
        { titolo: "Macrosettore", scelta: true, righe: [{ opzioni: gruppo("settore", 0), scelte: [ESEMPIO.macrosettore] }] },
        { titolo: "Settore", righe: [{ opzioni: gruppo("settore", 1), scelte: [] }] }
      ]
    },
    {
      id: "utenti", nome: "utenti", colore: "--color-8",
      testo: "Per chi? Le tipologie di pubblico e le fasce di età a cui si rivolge il flow.",
      voci: [
        { titolo: "Tipologie", righe: [{ opzioni: gruppo("utenti", 0), scelte: [] }] },
        { titolo: "Fasce d’età", scelta: true, righe: [{ opzioni: gruppo("utenti", 1), scelte: [ESEMPIO.eta] }] }
      ]
    }
  ];

  var FRASE = "Flow sul patrimonio " + ESEMPIO.patrimonio + " dal " + ESEMPIO.dal +
    (ESEMPIO.al === "oggi" ? " ad oggi" : " al " + ESEMPIO.al) +
    " del settore " + ESEMPIO.macrosettore + " per " + ESEMPIO.eta;

  /* ------------------------------------------------------------------------
     Costruzione
     ------------------------------------------------------------------------ */
  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (testo != null) el.textContent = testo;
    return el;
  }

  function segno(src, classe) {
    var s = crea("span", "flusso__segno " + (classe || ""));
    s.setAttribute("aria-hidden", "true");
    var img = crea("img");
    img.src = src;
    img.alt = "";
    s.appendChild(img);
    return s;
  }

  TAPPE.forEach(function (tappa, i) {
    var li = crea("li", "flusso__tappa");
    li.style.setProperty("--tappa-colore", "var(" + tappa.colore + ")");
    li.dataset.tappa = tappa.id;

    var testa = crea("div", "flusso__testa");
    testa.appendChild(crea("h2", "flusso__nome text-h2", tappa.nome));
    testa.appendChild(crea("p", "flusso__testo text-body-small", tappa.testo));
    li.appendChild(testa);

    var voci = crea("ul", "flusso__voci");
    tappa.voci.forEach(function (voce) {
      var v = crea("li", "flusso__voce" + (voce.scelta ? " is-scelta" : ""));
      var nodo = crea("span", "flusso__nodo");
      nodo.setAttribute("aria-hidden", "true");
      v.appendChild(nodo);
      v.appendChild(crea("h3", "flusso__voce-nome text-h4", voce.titolo));
      var righe = crea("div", "flusso__righe");
      voce.righe.forEach(function (riga) {
        var r = crea("div", "flusso__riga");
        if (riga.etichetta) r.appendChild(crea("span", "flusso__etichetta text-label", riga.etichetta));
        var ul = crea("ul", "chips flusso__opzioni");
        riga.opzioni.forEach(function (o) {
          var scelta = riga.scelte.indexOf(o) >= 0;
          var chip = crea("li", "chip chip--contorno flusso__opzione text-label" + (scelta ? " is-scelta" : ""));
          chip.appendChild(crea("span", null, o));
          if (scelta) chip.setAttribute("aria-label", o + " (scelta dell’esempio)");
          ul.appendChild(chip);
        });
        r.appendChild(ul);
        righe.appendChild(r);
      });
      v.appendChild(righe);
      voci.appendChild(v);
    });
    li.appendChild(voci);

    // ⊕ tra una tappa e l'altra, → prima del flow (come nello schema)
    li.appendChild(i < TAPPE.length - 1
      ? segno("assets/mappa/genera-piu.svg")
      : segno("assets/mappa/genera-indietro.svg", "flusso__segno--freccia"));
    lista.appendChild(li);
  });

  // Il flow: cerchio, frase dell'esempio e link per generarne uno
  var esito = crea("li", "flusso__tappa flusso__esito");
  var nodoFlow = crea("span", "flusso__nodo flusso__nodo--flow text-h3-brukt", "FLOW");
  nodoFlow.setAttribute("aria-hidden", "true");
  esito.appendChild(nodoFlow);
  var corpo = crea("div", "flusso__esito-testo");
  corpo.appendChild(crea("h2", "flusso__nome text-h2", "il flow"));
  corpo.appendChild(crea("p", "flusso__testo text-body-small",
    "La mappa tiene i casi studio che rispettano tutte le scelte (per ogni voce basta una delle opzioni scelte) e li collega in un itinerario, dal più a ovest passando ogni volta al più vicino. Con le scelte dell’esempio:"));
  corpo.appendChild(crea("p", "flusso__frase text-h4", FRASE));
  var link = crea("a", "flusso__link text-button", "Genera il tuo flow");
  link.href = "mappa.html";
  corpo.appendChild(link);
  esito.appendChild(corpo);
  lista.appendChild(esito);

  /* ------------------------------------------------------------------------
     Linee: archi a sinistra della colonna dei nodi. Sottili da ogni nodo
     al nodo scelto della tappa successiva (come nello schema), arancione
     spessa tra i nodi scelti fino al FLOW, disegnata scorrendo
     ------------------------------------------------------------------------ */
  var principale = null;
  var lunghezza = 0;

  function centro(el, base) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top };
  }

  // Arco da a a b (b più in basso): parte e arriva in orizzontale verso
  // sinistra, curva nel margine; più lontani i nodi, più ampio l'arco
  function arco(a, b, margine) {
    var largo = Math.min(margine, 12 + (b.y - a.y) * 0.12);
    return "M" + a.x + " " + a.y +
      " C" + (a.x - largo) + " " + a.y + " " + (b.x - largo) + " " + b.y + " " + b.x + " " + b.y;
  }

  function path(d, classe) {
    var p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    p.setAttribute("class", classe);
    svgLinee.appendChild(p);
    return p;
  }

  function disegna() {
    var base = schema.getBoundingClientRect();
    svgLinee.setAttribute("width", base.width);
    svgLinee.setAttribute("height", base.height);
    svgLinee.textContent = "";
    var primoNodo = lista.querySelector(".flusso__nodo");
    var margine = Math.max(8, primoNodo.getBoundingClientRect().left - base.left - 4);

    var tappe = Array.prototype.slice.call(lista.querySelectorAll(".flusso__tappa"));
    var scelti = [];
    tappe.forEach(function (t, i) {
      var nodi = Array.prototype.slice.call(t.querySelectorAll(".flusso__nodo"));
      var scelto = t.querySelector(".is-scelta > .flusso__nodo") || nodi[0];
      scelti.push(centro(scelto, base));
      var dopo = tappe[i + 1];
      if (!dopo) return;
      var prossimo = dopo.querySelector(".is-scelta > .flusso__nodo") || dopo.querySelector(".flusso__nodo");
      var b = centro(prossimo, base);
      nodi.forEach(function (n) {
        if (n === scelto) return;
        path(arco(centro(n, base), b, margine * 0.6), "flusso__linea");
      });
    });

    var d = "";
    for (var i = 0; i < scelti.length - 1; i++) {
      var tratto = arco(scelti[i], scelti[i + 1], margine);
      d += i ? tratto.replace(/^M[^C]+/, "") : tratto;
    }
    principale = path(d, "flusso__linea flusso__linea--flow");
    lunghezza = principale.getTotalLength();
    principale.style.strokeDasharray = lunghezza;
    aggiornaScorrimento();
  }

  // La linea arriva fin dove è arrivata la metà dello schermo
  var ridotto = window.matchMedia("(prefers-reduced-motion: reduce)");

  function aggiornaScorrimento() {
    if (!principale) return;
    if (ridotto.matches) {
      principale.style.strokeDashoffset = 0;
      lista.querySelectorAll(".flusso__tappa").forEach(function (t) { t.classList.add("is-raggiunta"); });
      return;
    }
    var r = schema.getBoundingClientRect();
    var punto = window.innerHeight * 0.6 - r.top;
    var avanzamento = Math.min(Math.max(punto / r.height, 0), 1);
    // si cerca il punto della linea all'altezza raggiunta
    var basso = 0, alto = lunghezza;
    var y = punto;
    for (var k = 0; k < 20; k++) {
      var m = (basso + alto) / 2;
      if (principale.getPointAtLength(m).y < y) basso = m; else alto = m;
    }
    principale.style.strokeDashoffset = avanzamento >= 1 ? 0 : lunghezza - basso;
    lista.querySelectorAll(".flusso__tappa").forEach(function (t) {
      var top = t.getBoundingClientRect().top - r.top;
      t.classList.toggle("is-raggiunta", top < punto);
    });
  }

  window.addEventListener("scroll", aggiornaScorrimento, { passive: true });
  window.addEventListener("resize", disegna);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(disegna);
  requestAnimationFrame(disegna);
})();
