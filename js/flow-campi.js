/* ==========================================================================
   Campi del flow: le voci tra cui si sceglie per generare un flow.
   Li usano js/genera.js (frase di "Genera" nella pagina Mappa) e
   js/flusso.js (spiegazione nella pagina Heritage Flow): modificandoli qui
   cambiano in entrambe.
   Nell'ordine in cui compaiono nella frase (Figma: Opzioni sx).
   colore: variabile di style.css; prima: parole che precedono la pillola
   ========================================================================== */

window.HF_FLOW_CAMPI = [
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
