/**
 * Heritage Flow — API pubblica dei casi studio
 * ---------------------------------------------------------------------------
 * Da incollare in: Google Sheet "Test Heritage Flow - Automotive"
 *                  → Estensioni → Apps Script → file Codice.gs
 *
 * Pubblicato come App web, restituisce in JSON SOLO le colonne di
 * Export_Casi elencate in CAMPI_PUBBLICI. Il foglio resta privato: lo script
 * legge con l'account di chi lo pubblica, il sito vede solo questa uscita.
 *
 * Risposta:
 *   { "aggiornato": "2026-11-25T10:00:00.000Z", "casi": [ { ... }, ... ] }
 *
 * Una copia di questo file è tenuta nel repo del sito (apps-script/script_dataset.gs):
 * se la modifichi nell'editor di Apps Script, aggiorna anche quella.
 */

// Foglio da leggere (intestazioni in riga 1, un caso per riga)
const FOGLIO = 'Export_Casi';

// Punteggi delle singole voci degli indici (0-100), calcolati qui con le
// regole di Indici_Definizioni (e le scale di Indici_Scale) dai dati di
// Export_Casi. Escono nel campo "punteggi_voci" di ogni caso:
//   { digitale: { "Accessibilità digitale": 100, ... }, esperienza: {...} }
// false = non pubblicarli
const PUBBLICA_PUNTEGGI_VOCI = true;
const FOGLIO_DEFINIZIONI = 'Indici_Definizioni';
const FOGLIO_SCALE = 'Indici_Scale';

// Secondi per cui la risposta resta in cache (0 = sempre dati freschi).
// Con 60 il sito risponde più in fretta e una modifica al foglio compare
// entro un minuto.
const CACHE_SECONDI = 60;

/**
 * Colonne pubblicate e come trasformarle:
 *   'testo'  → stringa (vuoto → null)
 *   'numero' → numero (vuoto o non numerico → null)
 *   'lista'  → array, divisa su "|" (vuoto → [])
 *   'anno'   → numero intero; accetta anche una data
 *   'si_no'  → true / false (casella di controllo o testo TRUE/FALSE)
 *
 * Immagini (immagine_1…3): il nome di un file della cartella
 * assets/caso-studio/ del sito (es. museo-ferrari-1.jpg) oppure un
 * indirizzo https:// completo.
 *
 * Tutto ciò che NON è qui non esce dal foglio. Ci sono tutte le colonne di
 * Export_Casi nello stesso ordine: quelle commentate con // restano private.
 * Per pubblicarne una togli i // all'inizio della riga, per nasconderla
 * aggiungili. Poi: Gestisci deployment → modifica → Nuova versione.
 */
const CAMPI_PUBBLICI = {
  // Identità
  id: 'testo',
  titolo: 'testo',
  sottotitolo: 'testo',
  anno_inizio: 'anno',
  anno_fine: 'anno',
  in_corso: 'si_no',

  // Luogo
  lon: 'numero',
  lat: 'numero',
  comune: 'testo',
  provincia: 'testo',
  regione: 'testo',

  // Descrizione e apertura
  descrizione: 'testo',
  tipologia_apertura: 'testo',
  periodi_apertura: 'testo',
  orari_apertura: 'testo',
  // visitatori_annui: 'numero',
  // visitatori_note: 'testo',
  scala: 'lista',
  immagine_1: 'testo',
  immagine_2: 'testo',
  immagine_3: 'testo',
  // Crediti delle immagini, uniti con "|" nello stesso ordine delle
  // immagini (una voce sola vale per tutte). Finché la colonna non c'è in
  // Export_Casi viene saltata (avviso nel registro)
  crediti_immagini: 'lista',
  link_riferimento: 'lista',
  bibliografia: 'lista',

  // Classificazione
  tipo_patrimonio: 'lista',
  natura_patrimonio: 'lista',
  dimensione_patrimonio: 'testo',
  macrosettore: 'lista',
  settore_attivita: 'lista',

  // Esperienza di fruizione
  forme_valorizzazione_attuali: 'lista',
  tipo_fruizione: 'lista',
  impatto_obiettivi: 'lista',
  fruitore_attuale: 'lista',
  fasce_eta_fruitore: 'lista',
  tecnologie_digitali: 'lista',
  discipline_design: 'lista',
  accessibilita: 'lista',
  sistema_comunicazione: 'lista',

  // Ecosistema
  connessioni_siti: 'lista',
  connessioni_stakeholder: 'lista',
  connessioni_altri_patrimoni: 'lista',
  link_patrimoni_riferimento: 'lista',
  eventi_collaterali: 'lista',
  area_influenza: 'testo',
  mezzi_trasporto: 'lista',
  servizi_generali: 'lista',
  sostenibilita: 'lista',

  // Potenziale
  // patrimonio_nascosto: 'testo',
  forme_valorizzazione_potenziali: 'lista',
  valore_aggiunto_potenziale: 'lista',
  // connessioni_potenziali_stakeholder: 'lista',
  fruitore_potenziale: 'lista',
  servizi_implementabili: 'lista',
  // note: 'testo',
  ampiezza_orari: 'testo',
  monitoraggio_visitatori: 'testo',

  // Indici (0-100) e potenziale calcolato
  indice_digitale: 'numero',
  indice_esperienza: 'numero',
  indice_accessibilita: 'numero',
  indice_ecosistema: 'numero',
  indice_utenti: 'numero',
  indice_media: 'numero',
  potenziale_valorizzazione: 'numero',
  classifica_potenziale: 'numero',
  potenziale_digitale: 'numero',
  potenziale_esperienza: 'numero',
  potenziale_accessibilita: 'numero',
  potenziale_ecosistema: 'numero',
  potenziale_utenti: 'numero',
};

/** Punto d'ingresso dell'App web (GET). */
function doGet() {
  let corpo;
  try {
    corpo = leggiConCache_();
  } catch (err) {
    console.error(err);
    // Nessun dettaglio interno nella risposta pubblica
    corpo = JSON.stringify({ errore: 'Dati non disponibili' });
  }
  return ContentService.createTextOutput(corpo)
    .setMimeType(ContentService.MimeType.JSON);
}

function leggiConCache_() {
  const cache = CacheService.getScriptCache();
  if (CACHE_SECONDI > 0) {
    const salvato = cache.get('casi');
    if (salvato) return salvato;
  }
  const corpo = JSON.stringify(esporta_());
  // La cache accetta al massimo ~100 KB per voce
  if (CACHE_SECONDI > 0 && corpo.length < 100000) {
    cache.put('casi', corpo, CACHE_SECONDI);
  }
  return corpo;
}

function esporta_() {
  const foglio = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
  if (!foglio) throw new Error('Foglio "' + FOGLIO + '" non trovato');

  // getValues() restituisce i numeri come numeri: niente problemi di
  // virgola decimale del locale it_IT
  const valori = foglio.getDataRange().getValues();
  const intestazioni = valori[0].map(function (h) { return String(h).trim(); });

  const colonne = {};
  Object.keys(CAMPI_PUBBLICI).forEach(function (nome) {
    const i = intestazioni.indexOf(nome);
    if (i === -1) console.warn('Colonna mancante in ' + FOGLIO + ': ' + nome);
    else colonne[nome] = i;
  });

  // Se le definizioni non si leggono, i punteggi delle voci non escono ma
  // il resto dell'esportazione funziona
  let punteggi = null;
  if (PUBBLICA_PUNTEGGI_VOCI) {
    try { punteggi = preparaPunteggiVoci_(); } catch (err) { console.error(err); }
  }

  const casi = [];
  for (let r = 1; r < valori.length; r++) {
    const riga = valori[r];
    // Salta le righe senza id (vuote o di servizio)
    if ('id' in colonne && String(riga[colonne.id]).trim() === '') continue;

    const caso = {};
    Object.keys(colonne).forEach(function (nome) {
      caso[nome] = converti_(riga[colonne[nome]], CAMPI_PUBBLICI[nome]);
    });
    if (punteggi) caso.punteggi_voci = punteggi.perCaso(riga, intestazioni).pubblici;
    casi.push(caso);
  }

  return { aggiornato: new Date().toISOString(), casi: casi };
}

function converti_(v, tipo) {
  const vuoto = v === '' || v === null || v === undefined;
  switch (tipo) {
    case 'numero': {
      if (vuoto) return null;
      if (typeof v === 'number') return v;
      // Testo con formato italiano: "1.234,5" → 1234.5
      const n = Number(String(v).trim().replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    }
    case 'anno': {
      if (vuoto) return null;
      if (v instanceof Date) return v.getFullYear();
      const n = parseInt(String(v), 10);
      return isNaN(n) ? null : n;
    }
    case 'si_no':
      if (vuoto) return null;
      if (typeof v === 'boolean') return v;
      return /^(true|vero|sì|si|x|1)$/i.test(String(v).trim());
    case 'lista':
      if (vuoto) return [];
      return String(v).split('|')
        .map(function (s) { return s.trim(); })
        .filter(function (s) { return s !== ''; });
    default:
      if (vuoto) return null;
      if (v instanceof Date) return v.toISOString().slice(0, 10);
      return String(v).trim();
  }
}

/**
 * Punteggi delle voci degli indici (modello di CLAUDE.md):
 *   punteggio di voce = min(n / soglia, 1), dove n è
 *     'opzioni': opzioni scelte che stanno nel vocabolario, tolte quelle di
 *                opzioni_escluse e, se c'è, tenute solo quelle di
 *                opzioni_incluse (espressioni regolari)
 *     'righe':   numero di righe di testo (voci unite con "|")
 *   'scala': valore della scala in Indici_Scale (0-1); con più valori
 *            scelti la somma, fino a 1
 *   indice = 100 × Σ (peso × punteggio di voce)
 * Restituisce { definizioni, perCaso(riga, intestazioni) → { pubblici,
 * indici } } (pubblici: 0-100 per etichetta; indici: ricalcolati, per i
 * controlli).
 */
function preparaPunteggiVoci_() {
  const ss = SpreadsheetApp.getActive();
  const def = ss.getSheetByName(FOGLIO_DEFINIZIONI);
  if (!def) throw new Error('Foglio "' + FOGLIO_DEFINIZIONI + '" non trovato');
  const v = def.getDataRange().getValues();
  const h = v[0].map(function (x) { return String(x).trim(); });
  const c = function (nome) { return h.indexOf(nome); };
  const testo = function (riga, nome) { return c(nome) < 0 ? '' : String(riga[c(nome)]).trim(); };
  const regex = function (t) {
    if (!t) return null;
    try { return new RegExp(t, 'i'); } catch (e) { console.warn('Regola non valida: ' + t); return null; }
  };

  const definizioni = v.slice(1).filter(function (r) { return testo(r, 'voce'); }).map(function (r) {
    return {
      indice: testo(r, 'indice'),
      voce: testo(r, 'voce'),
      etichetta: testo(r, 'etichetta') || testo(r, 'voce'),
      campo: testo(r, 'campo'),
      tipo: testo(r, 'tipo_calcolo').toLowerCase(),
      peso: converti_(r[c('peso')], 'numero') || 0,
      soglia: converti_(r[c('soglia_punteggio_pieno')], 'numero'),
      escluse: regex(testo(r, 'opzioni_escluse')),
      incluse: regex(testo(r, 'opzioni_incluse')),
      vocabolario: testo(r, 'vocabolario_intervallo')
    };
  });

  // Vocabolari (una lettura per intervallo)
  const vocabolari = {};
  definizioni.forEach(function (d) {
    if (!d.vocabolario || vocabolari[d.vocabolario]) return;
    try {
      const voci = {};
      ss.getRange(d.vocabolario).getValues().forEach(function (r) {
        r.forEach(function (x) { const t = String(x).trim().toLowerCase(); if (t) voci[t] = true; });
      });
      vocabolari[d.vocabolario] = voci;
    } catch (e) { console.warn('Vocabolario non leggibile: ' + d.vocabolario); }
  });

  const scala = leggiScale_(ss, definizioni);

  function perCaso(riga, intestazioni) {
    const pubblici = {};
    const indici = {};
    definizioni.forEach(function (d) {
      const i = intestazioni.indexOf(d.campo);
      const grezzo = i < 0 ? '' : riga[i];
      const voci = converti_(grezzo, 'lista');
      let p = 0;
      if (d.tipo === 'scala') {
        // Più valori scelti (es. periodi "Primavera|Estate|Autunno"): si
        // sommano, fino a 1 (come nel foglio)
        const visti = {};
        voci.forEach(function (x) {
          const k = x.toLowerCase();
          if (!visti[k]) { visti[k] = true; p += scala(d, x); }
        });
        p = Math.min(p, 1);
      } else {
        let n;
        if (d.tipo === 'righe') {
          n = voci.length;
        } else {
          const vocab = vocabolari[d.vocabolario];
          const scelte = {};
          voci.forEach(function (x) {
            if (vocab && !vocab[x.toLowerCase()]) return;
            if (d.escluse && d.escluse.test(x)) return;
            if (d.incluse && !d.incluse.test(x)) return;
            scelte[x.toLowerCase()] = true;
          });
          n = Object.keys(scelte).length;
        }
        p = d.soglia ? Math.min(n / d.soglia, 1) : 0;
      }
      pubblici[d.indice] = pubblici[d.indice] || {};
      pubblici[d.indice][d.etichetta] = Math.round(p * 1000) / 10;
      indici[d.indice] = (indici[d.indice] || 0) + 100 * d.peso * p;
    });
    return { pubblici: pubblici, indici: indici };
  }

  return { definizioni: definizioni, perCaso: perCaso };
}

/**
 * Scale (Indici_Scale): per una voce di tipo 'scala' cerca la riga con il
 * valore del caso e ne prende il numero (0-1, o 0-100 diviso per 100).
 * Riconosce sia righe "chiave | valore | punteggio" (chiave = nome della
 * voce o del campo) sia blocchi con la chiave su una riga e sotto le righe
 * "valore | punteggio".
 */
function leggiScale_(ss, definizioni) {
  const foglio = ss.getSheetByName(FOGLIO_SCALE);
  const righe = foglio ? foglio.getDataRange().getValues() : [];
  const norm = function (x) { return String(x).trim().toLowerCase(); };
  const chiavi = {};
  definizioni.forEach(function (d) {
    if (d.tipo !== 'scala') return;
    [d.voce, d.campo].forEach(function (k) { if (k) chiavi[norm(k)] = true; });
  });
  return function (d, valore) {
    if (!valore) return 0;
    const cercato = norm(valore);
    const mie = [norm(d.voce), norm(d.campo)];
    let blocco = null;
    for (let r = 0; r < righe.length; r++) {
      const celle = righe[r].map(norm);
      const chiave = celle.filter(function (x) { return chiavi[x]; })[0];
      if (chiave) blocco = chiave;
      const nostra = mie.indexOf(chiave) >= 0 || (!chiave && mie.indexOf(blocco) >= 0);
      if (!nostra || celle.indexOf(cercato) < 0) continue;
      const numeri = righe[r].filter(function (x) { return typeof x === 'number'; });
      if (!numeri.length) continue;
      const n = numeri[numeri.length - 1];
      return n > 1 ? n / 100 : n;
    }
    console.warn('Scala: valore non trovato per ' + d.voce + ': ' + valore);
    return 0;
  };
}

/**
 * Da lanciare a mano dall'editor (menu ▶ Esegui): calcola i punteggi delle
 * voci per tutti i casi e li confronta con gli indici di Export_Casi. Nel
 * Registro esecuzioni: il contenuto di Indici_Scale, le definizioni lette,
 * i punteggi del primo caso e, per ogni caso, gli indici che non tornano.
 */
function provaVociIndici() {
  const ss = SpreadsheetApp.getActive();
  const scale = ss.getSheetByName(FOGLIO_SCALE);
  if (scale) {
    console.log(FOGLIO_SCALE + ':');
    scale.getDataRange().getDisplayValues().forEach(function (r, i) {
      if (r.join('').trim()) console.log((i + 1) + ': ' + r.join(' | '));
    });
  }
  const punteggi = preparaPunteggiVoci_();
  console.log('Voci definite: ' + punteggi.definizioni.map(function (d) {
    return d.indice + '/' + d.voce + ' (' + d.tipo + ', ' + d.campo + ')';
  }).join(', '));

  const valori = ss.getSheetByName(FOGLIO).getDataRange().getValues();
  const intestazioni = valori[0].map(function (h) { return String(h).trim(); });
  let errori = 0;
  for (let r = 1; r < valori.length; r++) {
    const riga = valori[r];
    const id = riga[intestazioni.indexOf('id')];
    if (!String(id).trim()) continue;
    const ris = punteggi.perCaso(riga, intestazioni);
    if (r === 1) console.log('Punteggi di ' + id + ':\n' + JSON.stringify(ris.pubblici, null, 2));
    Object.keys(ris.indici).forEach(function (k) {
      const col = intestazioni.indexOf('indice_' + k);
      if (col < 0) return;
      const atteso = converti_(riga[col], 'numero');
      const calcolato = Math.round(ris.indici[k] * 10) / 10;
      if (atteso == null || Math.abs(atteso - calcolato) > 0.15) {
        errori++;
        console.log(id + ' · indice_' + k + ': foglio ' + atteso + ', calcolato ' + calcolato);
      }
    });
  }
  console.log(errori ? errori + ' indici non tornano (vedi sopra)' : 'Tutti gli indici ricalcolati coincidono con Export_Casi');
}

/**
 * Da lanciare a mano dall'editor (menu ▶ Esegui): scrive nel Registro
 * esecuzioni le prime righe di Punteggi_voci e Indici_Definizioni, per
 * capire come pubblicare i punteggi delle singole voci degli indici.
 * Non pubblica nulla.
 */
function provaPunteggiVoci() {
  ['Punteggi_voci', 'Indici_Definizioni'].forEach(function (nome) {
    const foglio = SpreadsheetApp.getActive().getSheetByName(nome);
    if (!foglio) { console.log('Foglio "' + nome + '" non trovato'); return; }
    const righe = Math.min(foglio.getLastRow(), 8);
    const colonne = Math.min(foglio.getLastColumn(), 20);
    console.log(nome + ': ' + foglio.getLastRow() + ' righe × ' + foglio.getLastColumn() + ' colonne');
    foglio.getRange(1, 1, righe, colonne).getDisplayValues().forEach(function (riga, i) {
      console.log((i + 1) + ': ' + riga.join(' | '));
    });
  });
}

/**
 * Da lanciare a mano dall'editor (menu ▶ Esegui) per controllare i nomi:
 * nel Registro esecuzioni compaiono le intestazioni di Export_Casi, le
 * colonne di CAMPI_PUBBLICI non trovate e il primo caso esportato.
 */
function provaEsportazione() {
  const foglio = SpreadsheetApp.getActive().getSheetByName(FOGLIO);
  const intestazioni = foglio.getRange(1, 1, 1, foglio.getLastColumn()).getValues()[0];
  console.log('Intestazioni di ' + FOGLIO + ':\n' + intestazioni.join('\n'));

  const mancanti = Object.keys(CAMPI_PUBBLICI).filter(function (n) {
    return intestazioni.map(String).map(function (h) { return h.trim(); }).indexOf(n) === -1;
  });
  console.log(mancanti.length
    ? 'Colonne NON trovate: ' + mancanti.join(', ')
    : 'Tutte le colonne di CAMPI_PUBBLICI sono state trovate');

  const dati = esporta_();
  console.log('Casi esportati: ' + dati.casi.length);
  console.log('Primo caso:\n' + JSON.stringify(dati.casi[0], null, 2));
}
