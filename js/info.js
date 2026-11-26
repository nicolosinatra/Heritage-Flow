/* ==========================================================================
   Pagina Info — aggiorna con i dati del foglio (js/dati-casi.js):
   - l'esempio (figure[data-esempio]): barre dei cinque indici, potenziale
     di valorizzazione e classifica del caso;
   - il numero dei casi studio ([data-campo="numero-casi"]).
   Nell'HTML ci sono già i valori al 26/11/2026: se i dati non arrivano la
   pagina resta com'è.
   ========================================================================== */

(function () {
  "use strict";

  if (!window.HFDati) return;

  // data-indice delle barre → colonna del foglio
  var INDICI = {
    digitale: "indice_digitale",
    esperienza: "indice_esperienza",
    inclusivita: "indice_accessibilita",
    ecosistema: "indice_ecosistema",
    comunicazione: "indice_utenti"
  };

  function numero(v) {
    return v.toLocaleString("it-IT", { maximumFractionDigits: 1 });
  }

  function aggiornaEsempio(figura, caso, totale) {
    var titolo = figura.querySelector('[data-campo="titolo"]');
    if (titolo && caso.titolo) titolo.textContent = caso.titolo;
    var sotto = figura.querySelector('[data-campo="sottotitolo"]');
    if (sotto && typeof caso.potenziale_valorizzazione === "number") {
      sotto.textContent = "Potenziale di valorizzazione " + numero(caso.potenziale_valorizzazione) + " / 100" +
        (caso.classifica_potenziale ? " · " + caso.classifica_potenziale + "° su " + totale + " casi studio" : "");
    }
    figura.querySelectorAll("[data-indice]").forEach(function (barra) {
      var v = caso[INDICI[barra.dataset.indice]];
      if (typeof v !== "number") return;
      var attuale = Math.round(v);
      barra.style.setProperty("--valore", attuale);
      barra.querySelector(".barra__margine").textContent = "+" + (100 - attuale);
      barra.querySelector(".barra__stato").textContent = "attuale " + attuale;
    });
  }

  window.HFDati.osserva(function (dati) {
    var figura = document.querySelector("[data-esempio]");
    var caso = figura && dati.casi.filter(function (c) { return c.id === figura.dataset.esempio; })[0];
    if (caso) aggiornaEsempio(figura, caso, dati.casi.length);
    document.querySelectorAll('[data-campo="numero-casi"]').forEach(function (el) {
      el.textContent = String(dati.casi.length);
    });
  }).catch(function () { /* restano i valori scritti nell'HTML */ });
})();
