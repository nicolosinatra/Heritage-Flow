/* ==========================================================================
   Impostazioni della pagina Mappa: classi e tipi usati da mappa, legende e
   grafici della colonna di destra.
   I casi studio arrivano dal Google Sheet (foglio Export_Casi, via
   js/dati-casi.js): js/mappa.js tiene quelli che rispettano la frase
   composta in "Genera" (js/genera.js) e ne ricava il flow.
   Dal foglio:
   - coordinate: lon, lat
   - potenziale: potenziale_valorizzazione (0–100; più alto = più margine
     di valorizzazione rispetto al caso migliore)
   - tipo: dalla forma di accesso (colonna dimensione_patrimonio):
     "Patrimonio digitale" → digitale, "Patrimonio digitalizzato" →
     digitalizzato, "Non accessibile in digitale" o vuoto → fisico
   ========================================================================== */

window.HF_MAPPA = {
  /* Classi di potenziale (Legenda 2): soglia minima inclusa, sul
     potenziale_valorizzazione del foglio (oggi va da 2 a 48 circa).
     breve: etichetta della legenda in XS e S (senza "potenziale") */
  classiPotenziale: [
    { id: "molto",    etichetta: "Molto potenziale",    breve: "Molto",    min: 30, colore: "--color-5"  },
    { id: "discreto", etichetta: "Discreto potenziale", breve: "Discreto", min: 15, colore: "--color-4"  },
    { id: "poco",     etichetta: "Poco potenziale",     breve: "Poco",     min: 0,  colore: "--color-13" }
  ],

  /* Tipologie di patrimonio (Legenda 3).
     breve: etichetta della legenda in XS e S (senza "patrimoni") */
  tipi: [
    { id: "fisico",        etichetta: "Patrimoni fisici",        breve: "Fisici",        colore: "--color-5"    },
    { id: "digitale",      etichetta: "Patrimoni digitali",      breve: "Digitali",      colore: "--color-2"    },
    { id: "digitalizzato", etichetta: "Patrimoni digitalizzati", breve: "Digitalizzati", colore: "--color-main" }
  ],

  /* Relazioni con il territorio (Legenda 4): classi del livello
     "confini-comuni-numero-aziende" dello stile Mapbox (gruppo "Numero
     aziende"); motivo: nome dell'immagine dello sprite usata come trama */
  aziende: [
    { id: "zero",  etichetta: "Nessuna azienda", breve: "0",     motivo: "zero" },
    { id: "uno",   etichetta: "Da 1 a 10",       breve: "1–10",  motivo: "uno_o_piu" },
    { id: "dieci", etichetta: "Da 11 a 20",      breve: "11–20", motivo: "dieci_o_piu" },
    { id: "venti", etichetta: "Più di 20",       breve: "20+",   motivo: "venti_o_piu" }
  ],
  // nome del gruppo di livelli nello stile Mapbox, acceso nel passo
  gruppoAziende: "Numero aziende",

  /* Reti attive del grafico "Relazioni con il territorio" (righe di testo
     del foglio) */
  reti: [
    { id: "connessioni_siti",        etichetta: "Siti",        colore: "--color-9" },
    { id: "connessioni_stakeholder", etichetta: "Stakeholder", colore: "--color-12" },
    { id: "eventi_collaterali",      etichetta: "Eventi",      colore: "--color-6" }
  ],

  /* Area d'influenza (Legenda 5): valori del foglio, da locale a globale */
  aree: [
    { id: "Locale",       etichetta: "Locale",       breve: "Locale",   colore: "--color-6" },
    { id: "Regionale",    etichetta: "Regionale",    breve: "Region.",  colore: "--color-7" },
    { id: "Nazionale",    etichetta: "Nazionale",    breve: "Naz.",     colore: "--color-3" },
    { id: "Continentale", etichetta: "Continentale", breve: "Contin.",  colore: "--color-10" },
    { id: "Globale",      etichetta: "Globale",      breve: "Globale",  colore: "--color-11" }
  ],

  /* Profilo degli indici (Legenda 6): colori come nella pagina Info e nella
     scheda; sulla mappa ogni ente ha il colore del suo indice più alto */
  indici: [
    { id: "digitale",      campo: "indice_digitale",      etichetta: "Maturità digitale",           breve: "Digitale",    colore: "--color-4" },
    { id: "esperienza",    campo: "indice_esperienza",    etichetta: "Esperienza e design",         breve: "Esperienza",  colore: "--color-5" },
    { id: "accessibilita", campo: "indice_accessibilita", etichetta: "Inclusività e accessibilità", breve: "Accessib.",   colore: "--color-6" },
    { id: "ecosistema",    campo: "indice_ecosistema",    etichetta: "Connessione all’ecosistema",  breve: "Ecosistema",  colore: "--color-9" },
    { id: "utenti",        campo: "indice_utenti",        etichetta: "Utenti e comunicazione",      breve: "Utenti",      colore: "--color-8" }
  ]
};
