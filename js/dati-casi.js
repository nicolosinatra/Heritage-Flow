/* ==========================================================================
   Dati dei casi studio — Heritage Flow
   Fonte: Google Sheet "Test Heritage Flow - Automotive", foglio Export_Casi,
   letto dall'App web di Apps Script (apps-script/script_dataset.gs), che
   pubblica solo le colonne scelte. Il foglio resta privato.

   L'App web impiega 1-3 secondi a rispondere: per non far aspettare la
   pagina, i dati arrivano in due tempi.
   1. Subito: la copia salvata nel browser all'ultima visita (localStorage)
      oppure, alla prima visita, la copia di riserva dati/casi.json.
   2. Appena risponde l'App web: i dati aggiornati, solo se sono cambiati.

   HFDati.osserva(funzione) → chiama funzione(dati) a ogni versione nuova
     dei dati ({ aggiornato, casi: [...] }), quindi una o due volte.
     Restituisce una Promise che fallisce solo se nessuna fonte ha risposto.
   HFDati.carica() → Promise della versione più aggiornata disponibile
     (aspetta l'App web; se non risponde usa la copia di riserva).

   Aggiornare la copia di riserva (dalla cartella del sito):
     curl -L "<URL_API>" -o dati/casi.json
   ========================================================================== */

(function () {
  "use strict";

  var URL_API =
    "https://script.google.com/macros/s/AKfycbzGt9HU0Bo62t5JgGEQwGZ7LA3LUXNV6SleRf7mNInLhXDigcH2uVAVKWiEqsW7UnoK/exec";
  var URL_RISERVA = "dati/casi.json";
  var CHIAVE_MEMORIA = "heritage-flow:casi";
  // La prima chiamata all'App web può richiedere qualche secondo
  var ATTESA_MS = 8000;

  function scarica(url, attesa) {
    var controllo = new AbortController();
    var timer = setTimeout(function () { controllo.abort(); }, attesa);
    return fetch(url, { signal: controllo.signal })
      .then(function (risposta) {
        if (!risposta.ok) throw new Error("HTTP " + risposta.status);
        return risposta.json();
      })
      .then(function (dati) {
        if (!dati || !Array.isArray(dati.casi)) throw new Error("Formato non valido");
        return dati;
      })
      .finally(function () { clearTimeout(timer); });
  }

  function leggiMemoria() {
    try {
      var salvato = localStorage.getItem(CHIAVE_MEMORIA);
      var dati = salvato && JSON.parse(salvato);
      return dati && Array.isArray(dati.casi) ? dati : null;
    } catch (e) {
      return null; // localStorage non disponibile o dati rovinati
    }
  }

  function salvaMemoria(dati) {
    try {
      localStorage.setItem(CHIAVE_MEMORIA, JSON.stringify(dati));
    } catch (e) { /* spazio pieno o navigazione privata: pazienza */ }
  }

  // Una sola richiesta all'App web per pagina, anche con più chiamate
  var richiestaApi = null;
  function api() {
    if (!richiestaApi) {
      richiestaApi = scarica(URL_API, ATTESA_MS).then(function (dati) {
        salvaMemoria(dati);
        return dati;
      });
    }
    return richiestaApi;
  }

  function osserva(funzione) {
    var firma = null;      // per non consegnare due volte gli stessi casi
    var arrivataApi = false;

    function consegna(dati) {
      var nuova = JSON.stringify(dati.casi);
      if (nuova === firma) return;
      firma = nuova;
      funzione(dati);
    }

    // 1. Subito: copia dell'ultima visita, altrimenti copia di riserva
    var memoria = leggiMemoria();
    var riserva = null;
    if (memoria) {
      consegna(memoria);
    } else {
      riserva = scarica(URL_RISERVA, ATTESA_MS).then(function (dati) {
        if (!arrivataApi) consegna(dati);
      });
    }

    // 2. Dati aggiornati dall'App web
    return api()
      .then(function (dati) {
        arrivataApi = true;
        consegna(dati);
      })
      .catch(function (errore) {
        console.warn("Dati: App web non disponibile, resta la copia locale.", errore);
        if (firma !== null) return;
        // Niente in memoria: aspetta la copia di riserva (se fallisce
        // anche quella, la Promise fallisce)
        return riserva || Promise.reject(errore);
      });
  }

  function carica() {
    return api().catch(function (errore) {
      console.warn("Dati: App web non disponibile, uso la copia di riserva.", errore);
      return scarica(URL_RISERVA, ATTESA_MS);
    });
  }

  window.HFDati = { osserva: osserva, carica: carica };
})();
