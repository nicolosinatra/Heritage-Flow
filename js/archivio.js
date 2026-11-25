/* ==========================================================================
   Archivio — Heritage Flow
   Genera l'elenco dei casi studio dai dati di js/dati-casi.js e gestisce il
   pannello dei filtri (Figma: Frame 180), che compare al posto del pulsante
   "Filtri" e si richiude con "Comprimi" (o Esc, o un click fuori):
   - Ordina per: A-Z / Z-A sul titolo.
   - Periodo temporale: mostra i casi attivi in almeno un anno tra Inizio e
     Fine (un caso "in corso" arriva fino all'anno attuale; senza anno di
     inizio resta sempre visibile).
   - Voci da visualizzare: le colonne della tabella (il nome c'è sempre).
   - Vista: elenco (tabella da L, schede sotto L) o griglia di schede.

   Ogni campo di CAMPI ha:
     id        chiave (per i campi del foglio è il nome della colonna)
     etichetta testo dell'intestazione e del titolo del gruppo
     tipo      'breve' (testo senza titolo nella scheda: periodo, luogo),
               'tag'   (pillole: liste o voci di un vocabolario),
               'testo' (righe di testo libero)
     peso      larghezza relativa della colonna (fr)
     attivo    visibile all'apertura della pagina
   L'ordine di CAMPI è l'ordine delle colonne; GRUPPI è l'ordine nel pannello.
   ========================================================================== */

(function () {
  "use strict";

  var main = document.querySelector(".archivio");
  var lista = main && main.querySelector(".archivio__lista");
  if (!lista || !window.HFDati) return;

  var intestazioni = main.querySelector(".archivio__intestazioni");
  var pulsante = main.querySelector(".archivio__filtri-pulsante");
  var pannello = main.querySelector(".archivio__filtri");
  var contenitoreVoci = pannello.querySelector('[data-filtri="voci"]');

  var tabella = main.querySelector(".archivio__tabella");

  var ANNO_ATTUALE = new Date().getFullYear();

  // Oltre questo numero di voci la tabella esce dallo schermo
  var COLONNE_IN_SCHERMO = 4;
  // Larghezza di una colonna di peso 1 (Tipi di patrimonio a 1280px)
  var UNITA_COLONNA = 290;

  // Sigle delle province (le altre restano con il nome intero)
  var SIGLE = {
    "Bologna": "BO",
    "Ferrara": "FE",
    "Forlì-Cesena": "FC",
    "Modena": "MO",
    "Parma": "PR",
    "Piacenza": "PC",
    "Ravenna": "RA",
    "Reggio Emilia": "RE",
    "Reggio nell'Emilia": "RE",
    "Rimini": "RN"
  };

  var CAMPI = [
    { id: "periodo", etichetta: "Periodo temporale", tipo: "breve", peso: 0.5, attivo: true },
    { id: "periodi_apertura", etichetta: "Periodi di apertura", tipo: "tag", peso: 0.75 },
    { id: "scala", etichetta: "Scala", tipo: "tag", peso: 1 },
    { id: "tipo_patrimonio", etichetta: "Tipi di patrimonio", voce: "Tipo di patrimonio", tipo: "tag", peso: 1, attivo: true },
    { id: "natura_patrimonio", etichetta: "Natura del patrimonio", tipo: "tag", peso: 1 },
    { id: "dimensione_patrimonio", etichetta: "Forma di accesso", tipo: "tag", peso: 0.75 },
    { id: "macrosettore", etichetta: "Macrosettore", tipo: "tag", peso: 1 },
    { id: "settore_attivita", etichetta: "Settore di attività", tipo: "tag", peso: 1 },
    { id: "forme_valorizzazione_attuali", etichetta: "Forme attuali di valorizzazione", voce: "Forme di valorizzazione", tipo: "tag", peso: 1.25, attivo: true },
    { id: "tipo_fruizione", etichetta: "Tipo di fruizione", tipo: "tag", peso: 1 },
    { id: "impatto_obiettivi", etichetta: "Impatto e obiettivi", tipo: "tag", peso: 1 },
    { id: "fruitore_attuale", etichetta: "Tipologia di fruitore attuale", tipo: "tag", peso: 1.25 },
    { id: "fasce_eta_fruitore", etichetta: "Fasce di età fruitore attuale", tipo: "tag", peso: 1 },
    { id: "tecnologie_digitali", etichetta: "Tecnologie digitali utilizzate", tipo: "tag", peso: 1 },
    { id: "accessibilita", etichetta: "Accessibilità", tipo: "tag", peso: 1 },
    { id: "sistema_comunicazione", etichetta: "Sistema di comunicazione e promozione", tipo: "tag", peso: 1.25 },
    { id: "connessioni_stakeholder", etichetta: "Connessioni attive con stakeholder di riferimento", tipo: "testo", peso: 1.25 },
    { id: "connessioni_altri_patrimoni", etichetta: "Connessioni attive con altre tipologie di patrimoni di riferimento", tipo: "tag", peso: 1 },
    { id: "area_influenza", etichetta: "Area d’influenza", tipo: "tag", peso: 0.75 },
    { id: "mezzi_trasporto", etichetta: "Mezzi di trasporto", tipo: "tag", peso: 1 },
    { id: "servizi_generali", etichetta: "Servizi generali garantiti", tipo: "tag", peso: 1 },
    { id: "luogo", etichetta: "Luogo", tipo: "breve", peso: 0.5, attivo: true }
  ];

  var GRUPPI = [
    { titolo: "Anagrafica", aperto: true,
      campi: ["periodo", "periodi_apertura", "scala", "luogo"] },
    { titolo: "Patrimonio", aperto: false,
      campi: ["tipo_patrimonio", "natura_patrimonio", "dimensione_patrimonio", "macrosettore", "settore_attivita"] },
    { titolo: "Esperienza", aperto: false,
      campi: ["forme_valorizzazione_attuali", "tipo_fruizione", "impatto_obiettivi", "fruitore_attuale",
              "fasce_eta_fruitore", "tecnologie_digitali", "accessibilita"] },
    { titolo: "Info ecosistema", aperto: false,
      campi: ["sistema_comunicazione", "connessioni_stakeholder", "connessioni_altri_patrimoni",
              "area_influenza", "mezzi_trasporto", "servizi_generali"] }
  ];

  var perId = {};
  CAMPI.forEach(function (campo) { perId[campo.id] = campo; });

  var casi = [];

  // Filtri scelti cliccando i tag nella tabella: [{ campo, valore }].
  // Si sommano (un caso deve averli tutti); un secondo click li toglie
  var filtriTag = [];

  function chiaveTag(campo, valore) { return campo + "\u0000" + valore; }

  function tagAttivo(campo, valore) {
    return filtriTag.some(function (f) { return f.campo === campo && f.valore === valore; });
  }

  /* ------------------------------------------------------------------------
     Testi dei campi
     ------------------------------------------------------------------------ */
  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (testo != null) el.textContent = testo;
    return el;
  }

  function testoPeriodo(caso) {
    var fine = caso.in_corso ? "in corso" : (caso.anno_fine != null ? String(caso.anno_fine) : "");
    if (caso.anno_inizio == null) return fine;
    return fine ? caso.anno_inizio + " - " + fine : String(caso.anno_inizio);
  }

  // "Patrimonio industriale" → "industriale" (nei campi dove ogni voce
  // inizia con "Patrimonio")
  var SENZA_PATRIMONIO = {
    tipo_patrimonio: true,
    natura_patrimonio: true,
    connessioni_altri_patrimoni: true
  };

  function senzaPatrimonio(voce) {
    return voce.replace(/^patrimonio\s+/i, "");
  }

  function valori(caso, campo) {
    var v = caso[campo.id];
    if (v == null || v === "") return [];
    var elenco = Array.isArray(v) ? v : [String(v)];
    return SENZA_PATRIMONIO[campo.id] ? elenco.map(senzaPatrimonio) : elenco;
  }

  function campoBreve(caso, campo) {
    var p = crea("p", "archivio__campo archivio__campo--breve text-label");
    p.appendChild(crea("span", "archivio__etichetta", campo.etichetta + ": "));
    if (campo.id === "periodo") {
      p.appendChild(document.createTextNode(testoPeriodo(caso)));
    } else {
      var provincia = caso.provincia ? (SIGLE[caso.provincia] || caso.provincia) : "";
      var riga1 = [caso.comune, provincia].filter(Boolean).join(", ");
      if (riga1) p.appendChild(document.createTextNode(riga1 + "."));
      if (riga1 && caso.regione) p.appendChild(document.createElement("br"));
      if (caso.regione) p.appendChild(document.createTextNode(caso.regione));
    }
    return p;
  }

  function campoGruppo(caso, campo) {
    var div = crea("div", "archivio__campo archivio__gruppo");
    div.appendChild(crea("h3", "archivio__titolo-gruppo text-label", campo.etichetta));
    var voci = valori(caso, campo);
    var ul = crea("ul", campo.tipo === "testo" ? "archivio__testi" : "chips");
    voci.forEach(function (voce) {
      if (campo.tipo === "testo") {
        ul.appendChild(crea("li", "text-label", voce));
        return;
      }
      // Tag cliccabile: filtra i casi con lo stesso valore (aria-pressed =
      // filtro attivo, colorato)
      var li = crea("li");
      var tag = crea("button", "chip chip--contorno chip--filtro text-label");
      tag.type = "button";
      tag.dataset.campo = campo.id;
      tag.dataset.valore = voce;
      tag.setAttribute("aria-pressed", String(tagAttivo(campo.id, voce)));
      tag.appendChild(crea("span", null, voce));
      li.appendChild(tag);
      ul.appendChild(li);
    });
    if (!voci.length) ul.appendChild(crea("li", "archivio__vuoto text-label", "—"));
    div.appendChild(ul);
    return div;
  }

  function voce(caso, attivi) {
    var li = crea("li", "archivio__voce");
    li.appendChild(crea("h2", "archivio__nome text-label", caso.titolo || ""));
    attivi.forEach(function (campo) {
      li.appendChild(campo.tipo === "breve" ? campoBreve(caso, campo) : campoGruppo(caso, campo));
    });
    return li;
  }

  /* ------------------------------------------------------------------------
     Filtri, ordine, colonne
     ------------------------------------------------------------------------ */
  function anno(input) {
    var n = parseInt(input.value, 10);
    return isNaN(n) ? null : n;
  }

  function nelPeriodo(caso, inizio, fine) {
    if (caso.anno_inizio == null) return true;
    var ultimo = caso.in_corso ? ANNO_ATTUALE : (caso.anno_fine != null ? caso.anno_fine : caso.anno_inizio);
    if (fine != null && caso.anno_inizio > fine) return false;
    if (inizio != null && ultimo < inizio) return false;
    return true;
  }

  function render() {
    var f = pannello.elements;
    var attivi = CAMPI.filter(function (campo) {
      var casella = f["campo-" + campo.id];
      return casella && casella.checked;
    });
    var inizio = anno(f.inizio);
    var fine = anno(f.fine);
    var verso = f.ordine.value === "za" ? -1 : 1;

    main.classList.toggle("archivio--griglia", f.vista.value === "griglia");

    // Colonne della tabella: nome + campi attivi.
    // Fino a COLONNE_IN_SCHERMO voci le colonne si dividono la larghezza
    // dello schermo (minimo: una pillola come "tutela e conservazione" su
    // una riga). Oltre, ogni colonna tiene almeno la larghezza che ha con le
    // voci iniziali a 1280px (peso × UNITA_COLONNA) e la tabella scorre in
    // orizzontale, con la colonna dei nomi bloccata.
    var larghe = attivi.length > COLONNE_IN_SCHERMO;
    var somma = 0;
    var colonne = [{ tipo: "nome", peso: 0.5 }].concat(attivi).map(function (campo) {
      var minimo = campo.tipo === "nome" ? 120 : campo.tipo === "breve" ? 100 : campo.tipo === "testo" ? 200 : 190;
      if (larghe) minimo = Math.max(minimo, Math.round(campo.peso * UNITA_COLONNA));
      somma += minimo;
      return "minmax(" + minimo + "px, " + campo.peso + "fr)";
    });
    main.style.setProperty("--archivio-colonne", colonne.join(" "));
    // Larghezza minima di righe e intestazioni: colonne + spazi tra loro
    main.style.setProperty("--archivio-larghezza",
      "calc(" + somma + "px + " + (colonne.length - 1) + " * var(--space-s))");

    intestazioni.replaceChildren.apply(intestazioni,
      ["Caso studio"].concat(attivi.map(function (c) { return c.etichetta; }))
        .map(function (t) { return crea("span", null, t); }));

    // Un filtro da tag vale solo finché la sua colonna è visibile
    filtriTag = filtriTag.filter(function (f) {
      return attivi.some(function (campo) { return campo.id === f.campo; });
    });

    var visibili = casi
      .filter(function (caso) { return nelPeriodo(caso, inizio, fine); })
      .filter(function (caso) {
        return filtriTag.every(function (f) {
          return valori(caso, perId[f.campo]).indexOf(f.valore) !== -1;
        });
      })
      .sort(function (a, b) {
        return verso * String(a.titolo || "").localeCompare(String(b.titolo || ""), "it", { sensitivity: "base" });
      });

    var frammento = document.createDocumentFragment();
    visibili.forEach(function (caso) { frammento.appendChild(voce(caso, attivi)); });
    if (!visibili.length) {
      frammento.appendChild(crea("li", "archivio__messaggio text-label",
        "Nessun caso studio corrisponde ai filtri scelti."));
    }
    lista.replaceChildren(frammento);
    aggiornaScorrimento();
  }

  /* ------------------------------------------------------------------------
     Tag nella tabella come filtri: click = mostra solo i casi con quel
     valore (il tag resta colorato); secondo click = filtro tolto
     ------------------------------------------------------------------------ */
  lista.addEventListener("click", function (e) {
    var tag = e.target.closest(".chip--filtro");
    if (!tag) return;
    var campo = tag.dataset.campo;
    var valore = tag.dataset.valore;
    if (tagAttivo(campo, valore)) {
      filtriTag = filtriTag.filter(function (f) { return !(f.campo === campo && f.valore === valore); });
    } else {
      filtriTag.push({ campo: campo, valore: valore });
    }
    var daTastiera = tag.matches(":focus-visible");
    render();
    // L'elenco è ridisegnato: il focus torna su un tag con lo stesso valore
    if (daTastiera) {
      var chiave = chiaveTag(campo, valore);
      var nuovo = Array.prototype.find.call(lista.querySelectorAll(".chip--filtro"), function (t) {
        return chiaveTag(t.dataset.campo, t.dataset.valore) === chiave;
      });
      if (nuovo) nuovo.focus();
    }
  });

  /* ------------------------------------------------------------------------
     Scorrimento orizzontale della tabella: classi per le sfumature
     (CSS), su tabella e intestazioni:
            .is-scorsa = c'è contenuto nascosto a sinistra (sotto i nomi)
            .is-altro  = c'è contenuto nascosto a destra
     ------------------------------------------------------------------------ */
  var scorrevoli = main.querySelectorAll(".archivio__scorre"); // tabella + intestazioni
  var finestraIntestazioni = main.querySelector(".archivio__intestazioni-finestra");

  function aggiornaScorrimento() {
    var x = tabella.scrollLeft;
    var scorsa = x > 0;
    var altro = x + tabella.clientWidth < tabella.scrollWidth - 1;
    // Le intestazioni (fuori dalla tabella) seguono lo scorrimento orizzontale
    finestraIntestazioni.scrollLeft = x;
    scorrevoli.forEach(function (el) {
      el.classList.toggle("is-scorsa", scorsa);
      el.classList.toggle("is-altro", altro);
    });
    aggiornaFrecce();
  }

  tabella.addEventListener("scroll", aggiornaScorrimento, { passive: true });
  window.addEventListener("resize", aggiornaScorrimento);

  // Testata ferma sotto la navbar: la sfumatura sotto le intestazioni c'è
  // solo quando la pagina è scorsa e le voci passano sotto la testata
  var testa = main.querySelector(".archivio__testa");
  function aggiornaTesta() {
    testa.classList.toggle("is-ferma", window.scrollY > 0);
  }
  window.addEventListener("scroll", aggiornaTesta, { passive: true });
  aggiornaTesta();

  /* ------------------------------------------------------------------------
     Frecce "colonna precedente / successiva" (L/XL con mouse, stili in
     archivio.css). Ognuna c'è solo se ci sono colonne nascoste da quel lato:
     - avanti:   si vede con il mouse a meno di ZONA_FRECCIA px dal bordo
                 destro della finestra;
     - indietro: sta subito a destra della colonna dei nomi e si vede con il
                 mouse a meno di ZONA_FRECCIA px da lì (nomi compresi).
     Si vedono anche quando hanno il focus da tastiera. Al click la colonna
     successiva / precedente scorre fino ad affiancarsi alla colonna dei nomi.
     ------------------------------------------------------------------------ */
  var frecce = {
    avanti: main.querySelector(".archivio__freccia--avanti"),
    indietro: main.querySelector(".archivio__freccia--indietro")
  };
  var ZONA_FRECCIA = 160;
  var mouseX = null; // null = mouse fuori dalla finestra o sopra il pannello
  var movimentoRidotto = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Dove inizia la parte che scorre (subito dopo la colonna dei nomi),
  // in px dal bordo sinistro della finestra
  function inizioScorrevole() {
    var nomi = intestazioni.firstElementChild;
    if (!nomi) return 0;
    var spazio = parseFloat(getComputedStyle(intestazioni).columnGap) || 0;
    return nomi.getBoundingClientRect().right + spazio;
  }

  function aggiornaFrecce() {
    var elenco = !main.classList.contains("archivio--griglia");
    var destra = elenco && tabella.classList.contains("is-altro");
    var sinistra = elenco && tabella.classList.contains("is-scorsa");
    var inizio = inizioScorrevole();
    var libero = mouseX !== null && pannello.hidden;

    main.style.setProperty("--archivio-freccia-sinistra", inizio + "px");
    // Larghezza della colonna dei nomi: da lì parte la sfumatura sinistra
    var nomi = intestazioni.firstElementChild;
    if (nomi) {
      main.style.setProperty("--archivio-nomi",
        (nomi.getBoundingClientRect().right - tabella.getBoundingClientRect().left) + "px");
    }
    frecce.avanti.hidden = !destra;
    frecce.avanti.classList.toggle("is-visibile",
      destra && libero && mouseX > window.innerWidth - ZONA_FRECCIA);
    frecce.indietro.hidden = !sinistra;
    frecce.indietro.classList.toggle("is-visibile",
      sinistra && libero && mouseX < inizio + ZONA_FRECCIA);
  }

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientY > tabella.getBoundingClientRect().top ? e.clientX : null;
    aggiornaFrecce();
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", function () {
    mouseX = null;
    aggiornaFrecce();
  });

  // verso: 1 = colonna successiva, -1 = precedente
  function vaiAColonna(verso) {
    var celle = intestazioni.children;
    var inizio = inizioScorrevole();
    var bersaglio = null;
    for (var i = 1; i < celle.length; i++) {
      var x = celle[i].getBoundingClientRect().left;
      if (verso > 0 && x > inizio + 1) { bersaglio = x; break; }
      if (verso < 0 && x < inizio - 1) bersaglio = x; // l'ultima prima dei nomi
    }
    if (bersaglio === null) return;
    tabella.scrollBy({
      left: bersaglio - inizio,
      behavior: movimentoRidotto.matches ? "auto" : "smooth"
    });
  }

  frecce.avanti.addEventListener("click", function () { vaiAColonna(1); });
  frecce.indietro.addEventListener("click", function () { vaiAColonna(-1); });

  /* ------------------------------------------------------------------------
     Pannello: voci da visualizzare (generate da GRUPPI)
     ------------------------------------------------------------------------ */
  GRUPPI.forEach(function (gruppo, i) {
    var box = crea("div", "filtri__gruppo");
    var idElenco = "filtri-gruppo-" + i;
    var apri = crea("button", "filtri__gruppo-titolo text-menu");
    apri.type = "button";
    apri.setAttribute("aria-expanded", String(gruppo.aperto));
    apri.setAttribute("aria-controls", idElenco);
    apri.appendChild(crea("span", null, gruppo.titolo));
    box.appendChild(apri);

    var elenco = crea("div", "filtri__gruppo-voci");
    elenco.id = idElenco;
    elenco.hidden = !gruppo.aperto;

    // Voce "All": attiva o toglie tutte le voci del gruppo. È spuntata solo
    // se lo sono tutte (a metà: indeterminate, per gli screen reader).
    // Non ha il prefisso "campo-", quindi render() la ignora
    var labelTutte = crea("label", "filtri__opzione filtri__opzione--voce filtri__opzione--tutte text-label");
    var tutte = crea("input");
    tutte.type = "checkbox";
    tutte.name = "tutte-" + i;
    labelTutte.appendChild(tutte);
    labelTutte.appendChild(crea("span", null, "All"));
    elenco.appendChild(labelTutte);

    var caselle = [];
    gruppo.campi.forEach(function (id) {
      var campo = perId[id];
      var label = crea("label", "filtri__opzione filtri__opzione--voce text-label");
      var casella = crea("input");
      casella.type = "checkbox";
      casella.name = "campo-" + id;
      casella.checked = !!campo.attivo;
      label.appendChild(casella);
      label.appendChild(crea("span", null, campo.voce || campo.etichetta));
      elenco.appendChild(label);
      caselle.push(casella);
    });
    box.appendChild(elenco);

    function aggiornaTutte() {
      var spuntate = caselle.filter(function (c) { return c.checked; }).length;
      tutte.checked = spuntate === caselle.length;
      tutte.indeterminate = spuntate > 0 && spuntate < caselle.length;
    }
    aggiornaTutte();

    // Gli ascoltatori sul gruppo scattano prima di quello del pannello
    // (che ridisegna l'elenco), quindi le caselle sono già aggiornate
    tutte.addEventListener("input", function () {
      caselle.forEach(function (c) { c.checked = tutte.checked; });
      tutte.indeterminate = false;
    });
    caselle.forEach(function (c) { c.addEventListener("input", aggiornaTutte); });

    apri.addEventListener("click", function () {
      var aperto = apri.getAttribute("aria-expanded") !== "true";
      apri.setAttribute("aria-expanded", String(aperto));
      elenco.hidden = !aperto;
    });
    contenitoreVoci.appendChild(box);
  });

  pannello.elements.fine.value = ANNO_ATTUALE;

  pannello.addEventListener("input", function () { if (casi.length) render(); });
  pannello.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ------------------------------------------------------------------------
     Pannello a comparsa: pulsante, Esc, click fuori
     ------------------------------------------------------------------------ */
  function apriPannello(aperto) {
    pannello.hidden = !aperto;
    pulsante.setAttribute("aria-expanded", String(aperto));
    aggiornaFrecce(); // le frecce non compaiono sopra il pannello
  }

  pulsante.addEventListener("click", function () {
    var aperto = pannello.hidden;
    apriPannello(aperto);
    if (aperto) pannello.querySelector(".filtri__comprimi").focus();
  });

  // "Comprimi" richiude il pannello e riporta il focus sul pulsante Filtri
  pannello.querySelector(".filtri__comprimi").addEventListener("click", function () {
    apriPannello(false);
    pulsante.focus();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !pannello.hidden) {
      apriPannello(false);
      pulsante.focus();
    }
  });

  document.addEventListener("click", function (e) {
    if (!pannello.hidden && !pannello.contains(e.target) && !pulsante.contains(e.target)) {
      apriPannello(false);
    }
  });

  /* ------------------------------------------------------------------------
     Dati
     ------------------------------------------------------------------------ */
  // Prima la copia locale (subito), poi i dati aggiornati del foglio se
  // sono cambiati: l'elenco si ridisegna con i filtri scelti nel pannello
  window.HFDati.osserva(function (dati) {
    casi = dati.casi;
    render();
    lista.removeAttribute("aria-busy");
  })
    .catch(function (errore) {
      console.error("Archivio: dati non disponibili.", errore);
      lista.replaceChildren(crea("li", "archivio__messaggio text-label",
        "Non è stato possibile caricare l'archivio. Riprova più tardi."));
      lista.removeAttribute("aria-busy");
    });
})();
