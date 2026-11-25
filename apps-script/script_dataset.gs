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
 * Una copia di questo file è tenuta nel repo del sito (apps-script/Codice.gs):
 * se la modifichi nell'editor di Apps Script, aggiorna anche quella.
 */

// Foglio da leggere (intestazioni in riga 1, un caso per riga)
const FOGLIO = 'Export_Casi';

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

  const casi = [];
  for (let r = 1; r < valori.length; r++) {
    const riga = valori[r];
    // Salta le righe senza id (vuote o di servizio)
    if ('id' in colonne && String(riga[colonne.id]).trim() === '') continue;

    const caso = {};
    Object.keys(colonne).forEach(function (nome) {
      caso[nome] = converti_(riga[colonne[nome]], CAMPI_PUBBLICI[nome]);
    });
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
