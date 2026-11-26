/* ==========================================================================
   Dati della pagina Mappa — unica fonte per mappa, legende e grafici
   della colonna di destra.

   - coordinate [longitudine, latitudine]: posizioni APPROSSIMATIVE delle
     sedi, da verificare
   - potenziale: punteggio di valorizzazione 0–100 (Figma: Data viz 2)
   - tipo: "fisico" | "digitale" | "digitalizzato" (Figma: Data viz 3).
     L'assegnazione per ente è PROVVISORIA: rispetta solo le proporzioni
     del design (60% digitalizzati, 30% fisici, 10% digitali)
   - bolla: posizione e raggio della bolla nel grafico "Potenziale"
     (coordinate del frame Figma, 425 × 330)
   ========================================================================== */

window.HF_MAPPA = {
  patrimoni: [
    { id: "dallara",     nome: "Dallara Academy",          prov: "PR", coordinate: [10.0122, 44.6900], potenziale: 45, tipo: "digitalizzato", bolla: { x: 372.9, y: 259.0 } },
    { id: "ducati",      nome: "Museo Ducati",             prov: "BO", coordinate: [11.2645, 44.5150], potenziale: 43, tipo: "digitalizzato", bolla: { x: 181.7, y: 252.6 } },
    { id: "maicc",       nome: "Museo Multimediale Autodromo di Imola Checco Costa (MAICC)", prov: "BO", coordinate: [11.7130, 44.3420], potenziale: 31, tipo: "digitale", bolla: { x: 239.0, y: 299.0 } },
    { id: "lamborghini", nome: "Museo Automobili Lamborghini", prov: "BO", coordinate: [11.1265, 44.6596], potenziale: 60, tipo: "digitalizzato", bolla: { x: 60.0,  y: 60.0 } },
    { id: "stanguellini",nome: "Museo Stanguellini",       prov: "MO", coordinate: [10.9550, 44.6395], potenziale: 75, tipo: "fisico",        bolla: { x: 172.3, y: 135.0 } },
    { id: "tecnostoria", nome: "Tecnostoria",              prov: "MO", coordinate: [10.9250, 44.6470], potenziale: 59, tipo: "fisico",        bolla: { x: 277.4, y: 217.6 } },
    { id: "ferrari",     nome: "Museo Ferrari",            prov: "MO", coordinate: [10.8613, 44.5297], potenziale: 31, tipo: "digitalizzato", bolla: { x: 31.0,  y: 146.2 } },
    { id: "maserati",    nome: "Collezione Maserati",      prov: "MO", coordinate: [10.8360, 44.6560], potenziale: 46, tipo: "digitalizzato", bolla: { x: 379.0, y: 168.0 } },
    { id: "bandini",     nome: "Collezione Auto Bandini",  prov: "FC", coordinate: [12.0408, 44.2227], potenziale: 69, tipo: "fisico",        bolla: { x: 70.7,  y: 238.0 } },
    { id: "baracca",     nome: "Museo Francesco Baracca",  prov: "RA", coordinate: [11.9110, 44.4210], potenziale: 55, tipo: "digitalizzato", bolla: { x: 299.0, y: 105.5 } }
  ],

  /* Flow generato (Figma: Dataviz-1): sequenza delle tappe, una linea ad
     arco tra ogni tappa e la successiva. PROVVISORIA, da verificare */
  flow: ["dallara", "maserati", "tecnostoria", "stanguellini", "ferrari", "lamborghini", "ducati", "maicc", "baracca", "bandini"],

  /* Classi di potenziale (Legenda 2): soglia minima inclusa.
     breve: etichetta della legenda in XS e S (senza "potenziale") */
  classiPotenziale: [
    { id: "molto",    etichetta: "Molto potenziale",    breve: "Molto",    min: 55, colore: "--color-5"  },
    { id: "discreto", etichetta: "Discreto potenziale", breve: "Discreto", min: 40, colore: "--color-4"  },
    { id: "poco",     etichetta: "Poco potenziale",     breve: "Poco",     min: 0,  colore: "--color-13" }
  ],

  /* Tipologie di patrimonio (Legenda 3).
     breve: etichetta della legenda in XS e S (senza "patrimoni") */
  tipi: [
    { id: "fisico",        etichetta: "Patrimoni fisici",        breve: "Fisici",        colore: "--color-5"    },
    { id: "digitale",      etichetta: "Patrimoni digitali",      breve: "Digitali",      colore: "--color-2"    },
    { id: "digitalizzato", etichetta: "Patrimoni digitalizzati", breve: "Digitalizzati", colore: "--color-main" }
  ],

  /* Grafico "Tipologia" (Figma: Data viz 4, frame 425 × 379): una bolla per
     tipo, la percentuale è calcolata dai patrimoni */
  bolleTipi: {
    fisico:        { x: 346.3, y: 300.3, r: 78.8 },
    digitale:      { x: 243.2, y: 319.9, r: 26.2 },
    digitalizzato: { x: 157.5, y: 157.5, r: 157.5 }
  }
};
