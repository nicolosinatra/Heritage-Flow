/* ==========================================================================
   Scheda del caso studio — Heritage Flow (caso.html?id=<id>)
   Si apre dall'archivio (nome del caso) e dalla mappa (elenco degli enti e
   popup). I dati sono quelli di Export_Casi (js/dati-casi.js): prima la
   copia salvata, poi quella aggiornata dell'App web.

   Struttura (prima versione, senza riferimento Figma):
   1. intestazione: occhiello, titolo, sottotitolo, periodo, luogo, area
   2. corpo, da L su due righe: descrizione | immagini (se ci sono),
      possibili sviluppi e apertura | potenziale (barre degli indici, come
      Info): il grafico parte all'altezza dei possibili sviluppi
   4. gruppi di voci (GRUPPI): tag come nell'archivio, testi in elenco
   5. fonti: link
   ========================================================================== */

(function () {
  "use strict";

  var main = document.querySelector(".caso");
  if (!main || !window.HFDati) return;

  var id = new URLSearchParams(location.search).get("id");

  /* Campi della scheda, per gruppo. tipo: 'tag' (pillole), 'testo' (righe
     di testo libero), 'link' (indirizzi web) */
  var APERTURA = [
    { id: "tipologia_apertura", etichetta: "Tipologia di apertura", tipo: "tag" },
    { id: "periodi_apertura", etichetta: "Periodi di apertura", tipo: "tag" },
    { id: "ampiezza_orari", etichetta: "Giorni di apertura", tipo: "tag" },
    { id: "orari_apertura", etichetta: "Orari", tipo: "testo" }
  ];

  var GRUPPI = [
    { titolo: "Patrimonio", campi: [
      { id: "tipo_patrimonio", etichetta: "Tipo di patrimonio", tipo: "tag" },
      { id: "natura_patrimonio", etichetta: "Natura del patrimonio", tipo: "tag" },
      { id: "dimensione_patrimonio", etichetta: "Forma di accesso", tipo: "tag" },
      { id: "scala", etichetta: "Scala", tipo: "tag" },
      { id: "macrosettore", etichetta: "Macrosettore", tipo: "tag" },
      { id: "settore_attivita", etichetta: "Settore di attività", tipo: "tag" }
    ] },
    { titolo: "Esperienza", campi: [
      { id: "forme_valorizzazione_attuali", etichetta: "Forme attuali di valorizzazione", tipo: "tag" },
      { id: "tipo_fruizione", etichetta: "Tipo di fruizione", tipo: "tag" },
      { id: "impatto_obiettivi", etichetta: "Impatto e obiettivi", tipo: "tag" },
      { id: "tecnologie_digitali", etichetta: "Tecnologie digitali", tipo: "tag" },
      { id: "discipline_design", etichetta: "Discipline del design", tipo: "tag" }
    ] },
    { titolo: "Pubblico", campi: [
      { id: "fruitore_attuale", etichetta: "Fruitori attuali", tipo: "tag" },
      { id: "fasce_eta_fruitore", etichetta: "Fasce di età", tipo: "tag" },
      { id: "sistema_comunicazione", etichetta: "Sistema di comunicazione e promozione", tipo: "tag" },
      { id: "monitoraggio_visitatori", etichetta: "Monitoraggio dei visitatori", tipo: "tag" }
    ] },
    { titolo: "Accessibilità e servizi", campi: [
      { id: "accessibilita", etichetta: "Forme di accessibilità", tipo: "tag" },
      { id: "mezzi_trasporto", etichetta: "Mezzi di trasporto", tipo: "tag" },
      { id: "servizi_generali", etichetta: "Servizi generali garantiti", tipo: "tag" },
      { id: "sostenibilita", etichetta: "Sostenibilità", tipo: "tag" }
    ] },
    { titolo: "Ecosistema", campi: [
      { id: "connessioni_siti", etichetta: "Connessioni attive con altri siti", tipo: "testo" },
      { id: "connessioni_stakeholder", etichetta: "Connessioni attive con stakeholder di riferimento", tipo: "testo" },
      { id: "connessioni_altri_patrimoni", etichetta: "Connessioni attive con altre tipologie di patrimoni", tipo: "tag" },
      { id: "eventi_collaterali", etichetta: "Eventi collaterali", tipo: "testo" }
    ] },
    // In alto a sinistra, tra descrizione e apertura (vedi presentazione)
    { titolo: "Possibili sviluppi", inPresentazione: true, campi: [
      { id: "forme_valorizzazione_potenziali", etichetta: "Forme potenziali di valorizzazione", tipo: "tag" },
      { id: "valore_aggiunto_potenziale", etichetta: "Valore aggiunto potenziale", tipo: "tag" },
      { id: "fruitore_potenziale", etichetta: "Fruitori potenziali", tipo: "tag" },
      { id: "servizi_implementabili", etichetta: "Servizi implementabili", tipo: "tag" }
    ] },
    { titolo: "Fonti", campi: [
      { id: "link_riferimento", etichetta: "Link di riferimento", tipo: "link" },
      { id: "link_patrimoni_riferimento", etichetta: "Patrimoni di riferimento", tipo: "link" },
      { id: "bibliografia", etichetta: "Bibliografia e sitografia", tipo: "link" }
    ] }
  ];

  /* I cinque indici (colori e nomi come nella pagina Info) */
  var INDICI = [
    { id: "indice_digitale", nome: "Maturità digitale", classe: "barra--digitale" },
    { id: "indice_esperienza", nome: "Esperienza e design", classe: "barra--esperienza" },
    { id: "indice_accessibilita", nome: "Inclusività e accessibilità", classe: "barra--inclusivita" },
    { id: "indice_ecosistema", nome: "Connessione all’ecosistema", classe: "barra--ecosistema" },
    { id: "indice_utenti", nome: "Utenti e comunicazione", classe: "barra--comunicazione" }
  ];

  // "Patrimonio industriale" → "industriale" (come nell'archivio)
  var SENZA_PATRIMONIO = {
    tipo_patrimonio: true,
    natura_patrimonio: true,
    connessioni_altri_patrimoni: true
  };

  /* ------------------------------------------------------------------------
     Utilità
     ------------------------------------------------------------------------ */
  function crea(tag, classe, testo) {
    var el = document.createElement(tag);
    if (classe) el.className = classe;
    if (testo != null) el.textContent = testo;
    return el;
  }

  function valori(caso, campo) {
    var v = caso[campo.id];
    if (v == null || v === "") return [];
    var elenco = (Array.isArray(v) ? v : [String(v)]).filter(function (x) { return x !== ""; });
    if (SENZA_PATRIMONIO[campo.id]) elenco = elenco.map(function (x) { return x.replace(/^patrimonio\s+/i, ""); });
    return elenco;
  }

  function numero(v) {
    return v.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  }

  function testoPeriodo(caso) {
    var fine = caso.in_corso ? "in corso" : (caso.anno_fine != null ? String(caso.anno_fine) : "");
    if (caso.anno_inizio == null) return fine;
    return fine ? caso.anno_inizio + " – " + fine : String(caso.anno_inizio);
  }

  // Indirizzo leggibile: senza protocollo, "www." e barra finale
  function testoLink(url) {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }

  /* ------------------------------------------------------------------------
     Blocchi della scheda
     ------------------------------------------------------------------------ */
  // Pulsante indietro (freccia nel cerchio, come in "Genera"): torna alla
  // pagina da cui si è arrivati (archivio o mappa, che ritrova il suo
  // flow); se si è arrivati da fuori, porta all'archivio
  function indietro() {
    var a = crea("a", "caso__torna");
    a.href = "archivio.html";
    a.setAttribute("aria-label", "Torna indietro");
    var img = crea("img");
    img.src = "assets/mappa/genera-indietro.svg";
    img.alt = "";
    a.appendChild(img);
    a.addEventListener("click", function (e) {
      var dalSito = false;
      try { dalSito = new URL(document.referrer).origin === location.origin; } catch (err) { /* nessun referrer */ }
      if (dalSito && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
    return a;
  }

  function intestazione(caso) {
    var sezione = crea("section", "section caso__intro");
    sezione.setAttribute("aria-labelledby", "caso-titolo");
    sezione.appendChild(indietro());

    var gruppo = crea("div", "heading-group");
    gruppo.appendChild(crea("p", "text-label", "CASO STUDIO"));
    var h1 = crea("h1", "caso__titolo text-h2", caso.titolo || "");
    h1.id = "caso-titolo";
    gruppo.appendChild(h1);
    sezione.appendChild(gruppo);

    if (caso.sottotitolo) sezione.appendChild(crea("p", "caso__sottotitolo text-h4", caso.sottotitolo));

    // Dati principali: periodo, luogo, area d'influenza
    var dati = crea("dl", "caso__dati");
    function dato(etichetta, valore) {
      if (!valore) return;
      var riga = crea("div", "caso__dato");
      riga.appendChild(crea("dt", "text-label", etichetta));
      riga.appendChild(crea("dd", "text-body-small", valore));
      dati.appendChild(riga);
    }
    dato("Periodo", testoPeriodo(caso));
    var luogo = [caso.comune, window.HFDati.sigla(caso.provincia)].filter(Boolean).join(", ");
    dato("Luogo", [luogo, caso.regione].filter(Boolean).join(" · "));
    dato("Area d’influenza", valori(caso, { id: "area_influenza" }).join(", "));
    if (dati.children.length) sezione.appendChild(dati);
    return sezione;
  }

  function immagini(caso) {
    var urls = ["immagine_1", "immagine_2", "immagine_3"].map(function (k) { return caso[k]; })
      .filter(function (u) { return typeof u === "string" && /^https?:\/\//.test(u); });
    if (!urls.length) return null;
    var figure = crea("figure", "caso__immagini");
    figure.classList.add("caso__immagini--" + urls.length);
    urls.forEach(function (url, i) {
      var img = crea("img");
      img.src = url;
      img.alt = (caso.titolo || "Caso studio") + ", immagine " + (i + 1);
      img.loading = i ? "lazy" : "eager";
      img.decoding = "async";
      img.referrerPolicy = "no-referrer";
      // Immagine non raggiungibile: si toglie (e la figura, se resta vuota)
      img.addEventListener("error", function () {
        img.remove();
        if (!figure.querySelector("img")) figure.remove();
      });
      figure.appendChild(img);
    });
    return figure;
  }

  // Un campo: titolo e contenuto (pillole, righe di testo o link)
  function voce(caso, campo) {
    var voci = valori(caso, campo);
    if (!voci.length) return null;
    var li = crea("li", "elenco__voce caso__voce");
    li.appendChild(crea("h3", "caso__etichetta text-label", campo.etichetta));
    var ul;
    if (campo.tipo === "tag") {
      ul = crea("ul", "chips");
      voci.forEach(function (v) {
        var chip = crea("li", "chip chip--contorno text-label");
        chip.appendChild(crea("span", null, v));
        ul.appendChild(chip);
      });
    } else {
      ul = crea("ul", "caso__righe text-body-small");
      voci.forEach(function (v) {
        var riga = crea("li");
        if (campo.tipo === "link" && /^https?:\/\//.test(v)) {
          var a = crea("a", "caso__link", testoLink(v));
          a.href = v;
          a.target = "_blank";
          a.rel = "noopener";
          riga.appendChild(a);
        } else {
          riga.textContent = v;
        }
        ul.appendChild(riga);
      });
    }
    li.appendChild(ul);
    return li;
  }

  function elencoVoci(caso, campi) {
    var ul = crea("ul", "elenco caso__elenco");
    campi.forEach(function (campo) {
      var li = voce(caso, campo);
      if (li) ul.appendChild(li);
    });
    return ul.children.length ? ul : null;
  }

  // Descrizione e apertura
  // Possibili sviluppi (titolo H4 come "Apertura") e apertura: la parte
  // sinistra della seconda riga del corpo
  function sviluppiEApertura(caso) {
    var div = crea("div", "caso__presentazione");
    GRUPPI.forEach(function (g, i) {
      if (!g.inPresentazione) return;
      var s = gruppo(caso, g, i);
      if (!s) return;
      s.querySelector("h2").className = "caso__titolo-gruppo text-h4";
      div.appendChild(s);
    });
    var apertura = elencoVoci(caso, APERTURA);
    if (apertura) {
      var blocco = crea("div", "caso__blocco");
      blocco.appendChild(crea("h2", "text-h4", "Apertura"));
      blocco.appendChild(apertura);
      div.appendChild(blocco);
    }
    return div.children.length ? div : null;
  }

  // Potenziale: barre degli indici (stato attuale e margine fino a 100,
  // come l'esempio della pagina Info) e potenziale di valorizzazione
  function potenziale(caso, totale) {
    var figure = crea("figure", "esempio caso__potenziale");
    var titolo = crea("figcaption", "esempio__titolo");
    titolo.appendChild(crea("span", "text-h4", "Potenziale di valorizzazione"));
    if (typeof caso.potenziale_valorizzazione === "number") {
      var riga = numero(caso.potenziale_valorizzazione) + " / 100";
      if (caso.classifica_potenziale) riga += " · " + caso.classifica_potenziale + "° su " + totale + " casi studio";
      titolo.appendChild(crea("span", "text-label", riga));
    }
    figure.appendChild(titolo);

    var ul = crea("ul", "esempio__barre");
    INDICI.forEach(function (indice) {
      var v = caso[indice.id];
      if (typeof v !== "number") return;
      var attuale = Math.round(v);
      var li = crea("li", "barra " + indice.classe);
      li.style.setProperty("--valore", attuale);
      li.appendChild(crea("span", "barra__nome text-body-small", indice.nome));
      var traccia = crea("span", "barra__traccia");
      traccia.setAttribute("aria-hidden", "true");
      traccia.appendChild(crea("span", "barra__attuale"));
      li.appendChild(traccia);
      var valore = crea("span", "barra__valore");
      valore.appendChild(crea("span", "barra__margine text-h4", "+" + (100 - attuale)));
      valore.appendChild(document.createTextNode(" "));
      valore.appendChild(crea("span", "barra__stato text-label", "attuale " + attuale));
      li.appendChild(valore);
      ul.appendChild(li);
    });
    if (!ul.children.length) return null;
    figure.appendChild(ul);
    return figure;
  }

  function gruppo(caso, g, i) {
    var elenco = elencoVoci(caso, g.campi);
    if (!elenco) return null;
    var sezione = crea("section", "caso__gruppo");
    var h2 = crea("h2", "caso__titolo-gruppo text-h3", g.titolo);
    h2.id = "caso-gruppo-" + i;
    sezione.setAttribute("aria-labelledby", h2.id);
    sezione.appendChild(h2);
    sezione.appendChild(elenco);
    return sezione;
  }

  /* ------------------------------------------------------------------------
     Pagina
     ------------------------------------------------------------------------ */
  function messaggio(testo) {
    main.textContent = "";
    var sezione = crea("section", "section caso__intro");
    sezione.appendChild(crea("p", "caso__messaggio text-body", testo));
    var a = crea("a", "caso__indietro text-label", "Torna all’archivio");
    a.href = "archivio.html";
    sezione.appendChild(a);
    main.appendChild(sezione);
    main.removeAttribute("aria-busy");
  }

  function render(caso, totale) {
    document.title = "Heritage Flow — " + (caso.titolo || "Caso studio");
    main.textContent = "";
    main.appendChild(intestazione(caso));

    // Corpo, da L su due righe (css/caso.css):
    //   descrizione                      | immagini (o spazio vuoto)
    //   possibili sviluppi e apertura    | potenziale
    // su mobile in quest'ordine, uno sotto l'altro
    var corpo = crea("section", "section caso__corpo");
    corpo.setAttribute("aria-label", "Descrizione e potenziale");
    if (caso.descrizione) corpo.appendChild(crea("p", "caso__descrizione text-body", caso.descrizione));
    var foto = immagini(caso);
    if (foto) corpo.appendChild(foto);
    var sinistra = sviluppiEApertura(caso);
    if (sinistra) corpo.appendChild(sinistra);
    var pot = potenziale(caso, totale);
    if (pot) corpo.appendChild(pot);
    main.appendChild(corpo);

    var gruppi = crea("div", "section caso__gruppi");
    GRUPPI.forEach(function (g, i) {
      if (g.inPresentazione) return;
      var s = gruppo(caso, g, i);
      if (s) gruppi.appendChild(s);
    });
    main.appendChild(gruppi);
    main.removeAttribute("aria-busy");
  }

  if (!id) {
    messaggio("Nessun caso studio indicato.");
    return;
  }

  window.HFDati.osserva(function (dati) {
    var caso = dati.casi.filter(function (c) { return c.id === id; })[0];
    if (!caso) {
      messaggio("Caso studio non trovato.");
      return;
    }
    render(caso, dati.casi.length);
  }).catch(function (errore) {
    console.error("Caso studio: dati non disponibili.", errore);
    messaggio("Non è stato possibile caricare il caso studio. Riprova più tardi.");
  });
})();
