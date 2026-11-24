/* ==========================================================================
   Genera un nuovo flow (Figma: GenerareFlow-L) — pagina Mappa
   Schermata iniziale: si compone la frase
     "Genera un nuovo flow per il turismo sul patrimonio ___ dal ___ al ___
      del settore ___ per ___"
   - A sinistra i campi: ⊕ aggiunge, ⊖ toglie. Tutti i campi tranne il
     periodo possono avere più valori ("industriale e architettonico"): ⊕ ne
     aggiunge un altro, ⊖ toglie l'ultimo (con un solo valore toglie il
     campo). Il patrimonio è obbligatorio: ne resta sempre almeno uno.
   - Passando su ⊕ (o con il focus) la frase mostra al 30% il campo che
     verrebbe aggiunto, vuoto e del suo colore.
   - Mentre si sceglie un valore la colonna sinistra è spenta e a destra ci
     sono le voci; a scelta fatta compaiono l'invito e il pulsante "Genera".
   - Il periodo si sceglie in due passaggi: data di inizio, poi di fine
     ("ad oggi" se la fine è "oggi"). Per ciascuna si sceglie il secolo e poi
     il decennio (Figma: opzioniDate); la freccia (o Esc) torna ai secoli.
   - "Genera" chiude la schermata e il titolo della mappa diventa la frase.
     I dati della mappa restano quelli di js/mappa-dati.js.
   Le pillole già compilate nella frase sono cliccabili per cambiarle.
   ========================================================================== */

(function () {
  "use strict";

  var box = document.getElementById("genera");
  if (!box) return;

  var frase = box.querySelector('[data-genera="frase"]');
  var listaCampi = box.querySelector('[data-genera="campi"]');
  var pannello = box.querySelector('[data-genera="pannello"]');
  var main = document.querySelector(".page__main");
  var titoloMappa = document.querySelector(".mappa__title");

  var ICONA_MENO = "assets/mappa/genera-meno.svg";
  var ICONA_PIU = "assets/mappa/genera-piu.svg";
  var ICONA_INDIETRO = "assets/mappa/genera-indietro.svg";
  var VUOTO = "_ _ _";

  /* Campi della frase, nell'ordine in cui compaiono (Figma: Opzioni sx).
     colore: variabile di style.css; prima: parole che precedono la pillola */
  var CAMPI = [
    {
      id: "patrimonio", nome: "tipo di patrimonio", colore: "--color-9",
      prima: "sul patrimonio", obbligatorio: true,
      multiplo: true,   // più valori: "industriale e architettonico"
      gruppi: [
        { titolo: "tipo di patrimonio", voci: ["archeologico", "architettonico", "artigianale", "artistico", "dissonante", "industriale", "letterario", "museale", "naturalistico", "paesaggistico", "urbano"] },
        { titolo: "dimensione del patrimonio", voci: ["materiale - tangibile", "immateriale - intangibile"] },
        { titolo: "natura del patrimonio", voci: ["digitale", "digitalizzato", "fisico"] }
      ]
    },
    {
      id: "periodo", nome: "periodo temporale", colore: "--color-2",
      periodo: true,
      inizi: ["1600", "1700", "1800", "1900", "2000"]
    },
    {
      id: "settore", nome: "settore di attività", colore: "--color-7",
      prima: "del settore",
      multiplo: true,
      gruppi: [
        { titolo: "macrosettore di attività", voci: ["industrie culturali e creative", "industrie manifatturiere e produttive", "istruzione, formazione e ricerca"] },
        { titolo: "settore di attività", voci: ["alimentare", "architettura", "arte", "audiovisivo", "automotive", "ceramica", "comunicazione visiva", "danza", "design del prodotto", "editoria", "fotografia", "moda", "musica", "tessile"] }
      ]
    },
    {
      id: "utenti", nome: "tipologia di utenti", colore: "--color-8",
      prima: "per",
      multiplo: true,
      gruppi: [
        { titolo: "tipologie di utenti", voci: ["gli amatori", "i cittadini", "le famiglie", "gli specialisti del settore", "gli studenti", "i turisti"] },
        { titolo: "fasce di età", voci: ["bambini: 0–10", "adolescenti: 11–17", "giovani adulti: 18–34", "adulti: 35–64", "senior: 65+"] }
      ]
    }
  ];

  var campoById = {};
  CAMPI.forEach(function (c) { campoById[c.id] = c; });

  var stato = {
    attivi: { patrimonio: true },   // campi presenti nella frase
    valori: {},                     // periodo: { dal, al }
    inModifica: "patrimonio",       // campo di cui si sta scegliendo il valore
    fasePeriodo: "dal",             // "dal" | "al"
    secolo: null,                   // periodo: secolo aperto sui decenni
    indice: 0                       // campo multiplo: quale valore si sceglie
  };
  stato.valori.patrimonio = [];

  /* ------------------------------------------------------------------------
     Utilità
     ------------------------------------------------------------------------ */
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function haValore(id) {
    var v = stato.valori[id];
    if (id === "periodo") return !!(v && v.dal && v.al);
    if (campoById[id].multiplo) return !!(v && v.length);
    return !!v;
  }

  // "al 1900" / "ad oggi"
  function preposizioneFine(al) {
    return al === "oggi" ? "ad" : "al";
  }

  // Più voci dello stesso campo: "a, b e c" (virgole, "e" prima dell'ultima)
  function elenco(voci) {
    if (voci.length < 2) return voci.join("");
    return voci.slice(0, -1).join(", ") + " e " + voci[voci.length - 1];
  }

  // Testo della frase (per il titolo della mappa)
  function testoFrase() {
    var parti = [];
    CAMPI.forEach(function (c) {
      if (!stato.attivi[c.id] || !haValore(c.id)) return;
      if (c.periodo) {
        var p = stato.valori.periodo;
        parti.push("dal " + p.dal + " " + preposizioneFine(p.al) + " " + p.al);
      } else if (c.multiplo) {
        parti.push(c.prima + " " + elenco(stato.valori[c.id]));
      } else {
        parti.push(c.prima + " " + stato.valori[c.id]);
      }
    });
    return parti.join(" ");
  }

  /* ------------------------------------------------------------------------
     Frase (Figma: Composizione Frase Flow)
     ------------------------------------------------------------------------ */
  // azione: cosa fa il click (riapre il campo per cambiare quel valore)
  // Il pulsante contiene .genera__pillola-testo, che porta l'aspetto della
  // pillola (bordo, padding, riempimento): sotto L va a capo come il testo
  function testoPillola(testo) {
    return el("span", "genera__pillola-testo", testo);
  }

  function pillola(campo, valore, quale, azione) {
    var b = el("button", "genera__pillola text-flow-option");
    b.appendChild(testoPillola(valore || VUOTO));
    b.type = "button";
    b.style.setProperty("--genera-colore", "var(" + campo.colore + ")");
    if (!valore) b.classList.add("is-vuota");
    // Cliccabile solo a scelta conclusa: riapre il campo per cambiarlo
    b.disabled = !!stato.inModifica;
    b.setAttribute("aria-label", campo.nome + (quale ? " (" + quale + ")" : "") + ": " +
      (valore || "da scegliere") + (b.disabled ? "" : ", cambia"));
    b.addEventListener("click", azione);
    return b;
  }

  function pezzo(parole, pill, classe) {
    var span = el("span", "genera__pezzo" + (classe ? " " + classe : ""));
    if (parole) span.appendChild(el("span", null, parole));
    span.appendChild(pill);
    return span;
  }

  // Anteprima al passaggio su ⊕ (Figma: GenerareFlow-L/Variant11): il campo
  // che verrebbe aggiunto, vuoto e al 30%, nel suo punto della frase
  function pezzoFinto(campo, parole) {
    var pill = el("span", "genera__pillola text-flow-option is-vuota");
    pill.appendChild(testoPillola(VUOTO));
    pill.style.setProperty("--genera-colore", "var(" + campo.colore + ")");
    var p = pezzo(parole, pill, "is-anteprima");
    p.setAttribute("aria-hidden", "true");
    return p;
  }

  // (per un campo multiplo già presente l'anteprima è dentro il suo elenco)
  function pezziAnteprima(campo) {
    if (campo.periodo) return [pezzoFinto(campo, "dal"), pezzoFinto(campo, "al")];
    return [pezzoFinto(campo, campo.prima)];
  }

  // Elenco di un campo multiplo: "sul patrimonio [a], [b] e [c]". La
  // virgola sta attaccata alla voce che la precede; la "e" introduce
  // l'ultima. Comprende la voce vuota che si sta aggiungendo e l'anteprima,
  // così le virgole sono già quelle della frase finale
  function pezziElenco(c, anteprima) {
    var v = stato.valori[c.id];
    var lista = v.map(function (x) { return { valore: x }; });
    if (stato.inModifica === c.id && stato.indice >= v.length) lista.push({ valore: null });
    if (anteprima) lista.push({ finta: true });

    var ultimo = lista.length - 1;
    return lista.map(function (voce, i) {
      var parole = i === 0 ? c.prima : (i === ultimo ? "e" : null);
      if (voce.finta) return pezzoFinto(c, parole);
      var p = pezzo(parole, pillola(c, voce.valore, lista.length > 1 ? String(i + 1) : null,
        function () { modifica(c.id, i); }));
      // virgola dopo ogni voce tranne le ultime due
      if (i < ultimo - 1) p.appendChild(el("span", "genera__virgola", ","));
      return p;
    });
  }

  // anteprima: id del campo il cui ⊕ è sotto il puntatore (o ha il focus)
  function renderFrase(anteprima) {
    frase.textContent = "";
    CAMPI.forEach(function (c) {
      if (stato.attivi[c.id]) {
        var v = stato.valori[c.id];
        if (c.periodo) {
          var p = v || {};
          var riapri = function () { modifica("periodo"); };
          frase.appendChild(pezzo("dal", pillola(c, p.dal, "inizio", riapri)));
          var inAttesa = stato.inModifica === "periodo" && stato.fasePeriodo === "dal";
          frase.appendChild(pezzo(preposizioneFine(p.al), pillola(c, p.al, "fine", riapri), inAttesa ? "is-attesa" : ""));
        } else if (c.multiplo) {
          pezziElenco(c, anteprima === c.id).forEach(function (p) { frase.appendChild(p); });
          return;
        } else {
          frase.appendChild(pezzo(c.prima, pillola(c, v, null, function () { modifica(c.id); })));
        }
      }
      if (anteprima === c.id) {
        pezziAnteprima(c).forEach(function (p) { frase.appendChild(p); });
      }
    });
  }

  /* ------------------------------------------------------------------------
     Campi a sinistra (Figma: Opzioni sx)
     ------------------------------------------------------------------------ */
  function icona(src, etichetta, attivo, azione) {
    var b = el("button", "genera__icona");
    b.type = "button";
    b.disabled = !attivo;
    b.setAttribute("aria-label", etichetta);
    var img = el("img");
    img.src = src;
    img.alt = "";
    b.appendChild(img);
    b.addEventListener("click", azione);
    return b;
  }

  // Campi multipli (tutti tranne il periodo): ⊕ aggiunge il campo o un altro
  // valore (finché ci sono voci da scegliere), ⊖ toglie l'ultimo valore; con
  // un solo valore toglie il campo, tranne il patrimonio che è obbligatorio.
  // Periodo: ⊕ se assente, ⊖ se presente.
  function numeroVoci(c) {
    return c.gruppi.reduce(function (n, g) { return n + g.voci.length; }, 0);
  }

  function puoAggiungereCampo(c) {
    if (stato.inModifica) return false;
    if (!stato.attivi[c.id]) return true;
    return !!c.multiplo && stato.valori[c.id].length < numeroVoci(c);
  }

  function puoTogliereCampo(c) {
    if (stato.inModifica || !stato.attivi[c.id]) return false;
    if (c.multiplo && stato.valori[c.id].length > 1) return true;
    return !c.obbligatorio;
  }

  // Spazio per le anteprime: la frase tiene l'altezza della sua versione più
  // lunga (con l'anteprima che va più a capo). Senza, quando l'anteprima
  // aggiunge una riga, tutto sotto scende, ⊕ sfugge al puntatore e
  // l'anteprima sparisce e ricompare di continuo.
  function riservaSpazioAnteprime() {
    // Si misura il contenitore di titolo + frase: sotto L sono un unico
    // testo continuo (la frase è in linea e non può avere un'altezza minima)
    var contenitore = frase.parentNode;
    contenitore.style.minHeight = "";
    var altezza = function () { return contenitore.getBoundingClientRect().height; };
    var max = altezza();
    CAMPI.forEach(function (c) {
      if (!puoAggiungereCampo(c)) return;
      renderFrase(c.id);
      max = Math.max(max, altezza());
    });
    renderFrase();
    contenitore.style.minHeight = max + "px";
  }

  function renderCampi() {
    listaCampi.textContent = "";
    var inScelta = !!stato.inModifica;
    listaCampi.classList.toggle("is-spenta", inScelta);
    CAMPI.forEach(function (c) {
      var presente = !!stato.attivi[c.id];
      var li = el("li", "genera__campo text-label");
      li.appendChild(el("span", "genera__campo-nome", c.nome));

      var puoTogliere = puoTogliereCampo(c);
      var puoAggiungere = puoAggiungereCampo(c);
      var piuValori = c.multiplo && presente && stato.valori[c.id].length > 1;

      li.appendChild(icona(ICONA_MENO, (piuValori ? "Togli l'ultimo: " : "Togli: ") + c.nome,
        puoTogliere, function () { togli(c.id); }));
      var piu = icona(ICONA_PIU, (c.multiplo && presente ? "Aggiungi un altro: " : "Aggiungi: ") + c.nome,
        puoAggiungere, function () { aggiungi(c.id); });

      // Anteprima del campo da aggiungere nella frase
      // (solo se ⊕ è utilizzabile: alcuni browser mandano gli eventi del
      // mouse anche ai pulsanti disattivati)
      function mostra() { if (puoAggiungereCampo(c)) renderFrase(c.id); }
      function nascondi() { if (puoAggiungereCampo(c)) renderFrase(); }
      piu.addEventListener("mouseenter", mostra);
      // Con il focus solo da tastiera, non quando arriva dopo un click
      piu.addEventListener("focus", function () { if (piu.matches(":focus-visible")) mostra(); });
      piu.addEventListener("mouseleave", nascondi);
      piu.addEventListener("blur", nascondi);

      li.appendChild(piu);
      listaCampi.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------------
     Pannello a destra (Figma: Opzioni dx)
     ------------------------------------------------------------------------ */
  // azione: di norma sceglie il valore; i secoli invece aprono i decenni
  function opzione(campo, valore, scelta, extraClass, azione) {
    var b = el("button", "genera__opzione text-label" + (extraClass ? " " + extraClass : ""), valore);
    b.type = "button";
    b.style.setProperty("--genera-colore", "var(" + campo.colore + ")");
    b.setAttribute("aria-pressed", scelta ? "true" : "false");
    b.addEventListener("click", azione || function () { scegli(campo.id, valore); });
    return b;
  }

  /* Periodo (Figma: opzioniDate): prima i secoli, cliccando un secolo i
     suoi decenni con la freccia per tornare indietro. Per la fine solo date
     successive all'inizio, più "oggi". I decenni arrivano a quello in corso */
  var ANNO_CORRENTE = new Date().getFullYear();

  function decenni(secolo) {
    var lista = [];
    for (var a = +secolo; a < +secolo + 100 && a <= ANNO_CORRENTE; a += 10) lista.push(String(a));
    return lista;
  }

  function secoloDi(anno) {
    return String(Math.floor(+anno / 100) * 100);
  }

  function opzioniPeriodo(campo) {
    var p = stato.valori.periodo || {};
    var fine = stato.fasePeriodo === "al";
    var attuale = fine ? p.al : p.dal;
    var valido = function (anno) { return !fine || +anno > +p.dal; };
    var bottoni = [];

    if (stato.secolo) {
      var indietro = icona(ICONA_INDIETRO, "Torna ai secoli", true, function () {
        stato.secolo = null;
        render(true);
      });
      indietro.classList.add("genera__indietro");
      bottoni.push(indietro);
      decenni(stato.secolo).filter(valido).forEach(function (a) {
        bottoni.push(opzione(campo, a, a === attuale, "genera__opzione--data"));
      });
    } else {
      campo.inizi.forEach(function (s) {
        // Un secolo compare se ha almeno un decennio sceglibile
        if (!decenni(s).some(valido)) return;
        var b = opzione(campo, s, attuale && attuale !== "oggi" && secoloDi(attuale) === s,
          "genera__opzione--data", function () {
            stato.secolo = s;
            render(true);
          });
        b.setAttribute("aria-label", s + ": mostra i decenni");
        bottoni.push(b);
      });
      if (fine) bottoni.push(opzione(campo, "oggi", attuale === "oggi", "genera__opzione--data"));
    }
    return gruppo(null, bottoni);
  }

  function gruppo(titolo, bottoni) {
    var g = el("div", "genera__gruppo");
    if (titolo) g.appendChild(el("p", "genera__gruppo-titolo text-label", titolo));
    var lista = el("div", "genera__voci");
    bottoni.forEach(function (b) { lista.appendChild(b); });
    g.appendChild(lista);
    return g;
  }

  function renderPannello() {
    pannello.textContent = "";
    var campo = campoById[stato.inModifica];

    if (!campo) {
      var invito = el("div", "genera__invito");
      invito.appendChild(el("p", "text-h4", "Aggiungi un nuovo campo tra quelli a sinistra oppure genera il Flow"));
      var btn = el("button", "genera__bottone text-h3", "Genera");
      btn.type = "button";
      btn.addEventListener("click", genera);
      invito.appendChild(btn);
      pannello.appendChild(invito);
      return;
    }

    var scelta = el("div", "genera__scelta");
    if (campo.periodo) {
      scelta.appendChild(el("p", "text-h4",
        stato.fasePeriodo === "dal" ? "Seleziona una data di inizio" : "Seleziona una data di fine"));
      scelta.appendChild(opzioniPeriodo(campo));
    } else {
      scelta.appendChild(el("p", "text-h4", "Seleziona una tra le seguenti voci"));
      // Campo multiplo: niente voci già scelte negli altri valori
      var attuale = campo.multiplo ? stato.valori[campo.id][stato.indice] : stato.valori[campo.id];
      var altri = campo.multiplo ? stato.valori[campo.id].filter(function (v, i) { return i !== stato.indice; }) : [];
      campo.gruppi.forEach(function (g) {
        var voci = g.voci.filter(function (v) { return altri.indexOf(v) < 0; });
        if (!voci.length) return;
        scelta.appendChild(gruppo(g.titolo, voci.map(function (v) {
          return opzione(campo, v, v === attuale);
        })));
      });
    }
    pannello.appendChild(scelta);
  }

  function render(fuoco) {
    renderFrase();
    renderCampi();
    renderPannello();
    riservaSpazioAnteprime();
    // Dopo ogni passaggio il focus va al primo elemento utile a destra
    if (fuoco) {
      var primo = pannello.querySelector("button");
      if (primo) primo.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------------
     Azioni
     ------------------------------------------------------------------------ */
  function aggiungi(id) {
    var multiplo = campoById[id].multiplo;
    if (!stato.attivi[id] && multiplo) stato.valori[id] = [];
    stato.attivi[id] = true;
    // Campo multiplo: si sceglie un valore in più, in coda
    modifica(id, multiplo ? stato.valori[id].length : 0);
  }

  // indice: per il campo multiplo, quale valore si sta scegliendo
  function modifica(id, indice) {
    stato.inModifica = id;
    stato.indice = indice || 0;
    stato.secolo = null;
    if (id === "periodo") stato.fasePeriodo = "dal";
    render(true);
  }

  function togli(id) {
    if (campoById[id].multiplo && stato.valori[id].length > 1) {
      stato.valori[id].pop();
    } else {
      delete stato.attivi[id];
      delete stato.valori[id];
    }
    render(false);
    var piu = listaCampi.querySelectorAll(".genera__campo")[CAMPI.indexOf(campoById[id])];
    if (piu) piu.querySelectorAll("button")[1].focus({ preventScroll: true });
  }

  function scegli(id, valore) {
    stato.secolo = null;
    if (id === "periodo") {
      if (stato.fasePeriodo === "dal") {
        var prima = stato.valori.periodo || {};
        // La fine resta valida solo se viene dopo il nuovo inizio
        var al = prima.al && (prima.al === "oggi" || +prima.al > +valore) ? prima.al : null;
        stato.valori.periodo = { dal: valore, al: al };
        stato.fasePeriodo = "al";
        render(true);
        return;
      }
      stato.valori.periodo.al = valore;
    } else if (campoById[id].multiplo) {
      stato.valori[id][stato.indice] = valore;
    } else {
      stato.valori[id] = valore;
    }
    stato.inModifica = null;
    render(true);
  }

  // Esc: annulla la scelta in corso. Un campo appena aggiunto e ancora
  // vuoto viene tolto; se si stava aggiungendo un valore in più a un campo
  // multiplo, si lascia perdere quel valore. Il primo patrimonio,
  // obbligatorio, resta da scegliere
  function annulla() {
    var id = stato.inModifica;
    if (!id) return;
    // Decenni aperti: Esc torna prima ai secoli
    if (stato.secolo) {
      stato.secolo = null;
      render(true);
      return;
    }
    var c = campoById[id];
    if (c.obbligatorio && !haValore(id)) return;
    if (!haValore(id)) {
      delete stato.attivi[id];
      delete stato.valori[id];
    }
    stato.inModifica = null;
    render(true);
  }

  /* ------------------------------------------------------------------------
     Apertura e chiusura
     ------------------------------------------------------------------------ */
  function apri() {
    document.documentElement.classList.add("genera-aperta");
    if (main) main.inert = true;
    render(false);
    box.focus({ preventScroll: true });
  }

  function genera() {
    if (!haValore("patrimonio")) return;
    if (titoloMappa) titoloMappa.textContent = "Flow " + testoFrase();

    box.classList.add("is-chiusa");
    if (main) main.inert = false;
    var fatto = false;
    function fine() {
      if (fatto) return;
      fatto = true;
      box.removeEventListener("transitionend", suFine);
      document.documentElement.classList.remove("genera-aperta");
      box.classList.remove("is-chiusa");
      if (titoloMappa) {
        titoloMappa.tabIndex = -1;
        titoloMappa.focus({ preventScroll: true });
      }
    }
    // Solo la dissolvenza della schermata (l'evento risale anche dagli
    // elementi interni, es. il colore di una pillola)
    function suFine(e) {
      if (e.target === box && e.propertyName === "opacity") fine();
    }
    box.addEventListener("transitionend", suFine);
    setTimeout(fine, 600);   // se la transizione non parte (movimento ridotto)
  }

  box.addEventListener("keydown", function (e) {
    if (e.key === "Escape") annulla();
  });

  // Cambiando la larghezza la frase va a capo in punti diversi
  window.addEventListener("resize", function () {
    if (document.documentElement.classList.contains("genera-aperta")) riservaSpazioAnteprime();
  });

  apri();
})();
