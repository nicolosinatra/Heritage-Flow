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
  ]
};
