# Heritage Flow: contesto del progetto

Prototipo (Figma + HTML/CSS/JS) su casi studio di patrimonio automotive della Motor Valley. I dati e le visualizzazioni vengono generati da un Google Sheet.

## Fonte dati
- Google Sheet **"Test Heritage Flow - Automotive"**, ID `1Nul0e76MrRNghI9y_7r1OIIyzUTKpj37xI4KlhpF6Dk` (locale it_IT).
- Formule con separatore `;`, virgola decimale, punto come separatore delle migliaia.
- Casi di studio: uno per colonna in `Template_Scheda_analitica` (colonne C.., campi nelle righe 2-52, `riga_template` = riga del foglio).

## Fogli principali
| Foglio | Ruolo |
|---|---|
| Template_Scheda_analitica | Inserimento dati (un caso per colonna). Campi a scelta multipla con chip e selezione multipla. |
| Anagrafica, Flussi narrativi, Dati esperienza di fruizione, Dati descrizione ecosistema | Vocabolari controllati per i menu a tendina |
| Dizionario_campi | Un campo per riga: tipo, vocabolario, indice e peso, regola di calcolo |
| Controlli_qualita | Controlli di coerenza (C3 = somma errori, deve essere 0) |
| Indici_Definizioni | Voci di ogni indice: tipo di calcolo, peso, soglia, opzioni incluse o escluse, vocabolario |
| Indici_Scale | Punteggi per i campi a scelta singola (accessibilita_digitale, area, apertura, monitoraggio, periodi) |
| Punteggi_voci | Punteggio di ogni voce per ogni caso (calcolato) |
| indice complessivo | Indici, media, potenziale e classifica (calcolato) |
| Export_Casi | Foglio piatto per VS Code: una riga per caso, colonne A..BP |
| Tabella per CMS | Vecchia tabella, mantenuta, non eliminata |

## Export_Casi (fonte per lo script)
- Una riga per caso, intestazioni in riga 1. Colonne da `id` a `monitoraggio_visitatori` (A..BC), poi gli indici (BD..BK) e i potenziali (BL..BP).
- Campi a scelta multipla uniti con `|`; le liste di testo hanno le righe unite con `|`.
- `lon` e `lat` numerici, ricavati dal campo coordinate.
- `visitatori_annui` è vuoto per tutti i casi (nessun dato affidabile); il testo sta in `visitatori_note`.
- Colonne indice: `indice_digitale`, `indice_esperienza`, `indice_accessibilita`, `indice_ecosistema`, `indice_utenti`, `indice_media`, `potenziale_valorizzazione`, `classifica_potenziale`, `potenziale_<indice>`.

## Collegamento con il sito
- App web di Apps Script (`apps-script/script_dataset.gs`, copia del codice nel foglio): legge `Export_Casi` e restituisce in JSON solo le colonne in `CAMPI_PUBBLICI` (liste già divise su `|`). Il foglio è privato (condivisione "Con limitazioni").
- Dopo ogni modifica allo script: Gestisci deployment → modifica → Nuova versione (l'URL resta lo stesso).
- `js/dati-casi.js`: `HFDati.osserva(fn)` consegna subito la copia salvata nel browser (localStorage) o, alla prima visita, la copia di riserva `dati/casi.json`, poi i dati dell'App web se sono cambiati. `HFDati.carica()` aspetta l'App web (riserva se non risponde entro 8 s). La copia di riserva va aggiornata ogni tanto con `curl -L "<URL>" -o dati/casi.json`.
- Pagine collegate: archivio (`js/archivio.js`, con pannello filtri: ordine, periodo, colonne visibili, vista elenco/griglia; i campi disponibili sono in `CAMPI` e `GRUPPI`). Mappa (`js/mappa.js`): prende i casi da `HFDati`, tiene quelli che rispettano la frase di "Genera" (`js/genera.js` → `HFMappa.filtra`: per ogni gruppo di voci almeno una, più il periodo) e li ordina come flow (dal caso più a ovest, ogni volta il più vicino). Potenziale da `potenziale_valorizzazione`; tipo fisico/digitale/digitalizzato da `dimensione_patrimonio` (forma di accesso, vuoto = fisico). Soglie delle classi di potenziale ed etichette in `js/mappa-dati.js`. `HFDati.sigla(provincia)` dà la sigla della provincia. Scheda del caso studio: `caso.html?id=<id>` (`js/caso.js`, `css/caso.css`; prima versione senza Figma), aperta dal nome nell'archivio, dalla freccia nell'elenco enti della mappa e dal popup aperto con un click. Il pulsante indietro della scheda (freccia nel cerchio) torna alla pagina di provenienza; la mappa salva l'ultima frase in sessionStorage (`heritage-flow:frase`) e la ritrova solo tornando dalla scheda (indietro del browser o del pulsante), altrimenti si apre "Genera".

## Modello degli indici (scala 0-100)
- **Punteggio di voce** = min(n / soglia, 1). Tipi di calcolo:
  - `opzioni`: numero di opzioni scelte, contate sul vocabolario (con esclusioni o inclusioni a regex);
  - `righe`: numero di righe di testo;
  - `scala`: valore preso da Indici_Scale.
- **Indice** = 100 × Σ(peso × punteggio di voce). **Media** = media dei 5 indici.
- **Potenziale** di un indice = massimo tra i casi meno il valore del caso. **potenziale_valorizzazione** = media dei 5 potenziali. **classifica_potenziale** = rango decrescente.

### I 5 indici e i pesi
- **Digitale**: accessibilità digitale 25%, tecnologie 35% (soglia 5, esclusi "siti web" e "Nessuna"), fruizione digitale 25% (soglia 4), valorizzazione digitale 15% (soglia 4).
- **Esperienza**: valorizzazione, fruizione e design (soglia 6 ciascuna) e impatto (soglia 7), 25% ciascuna.
- **Accessibilità**: forme di accessibilità 25% (soglia 7, "assente" non conta), trasporti 20% (soglia 6), servizi 20% (soglia 7, "altro" non conta), apertura 20% (scala), periodi di apertura 15% (scala).
- **Ecosistema**: siti, stakeholder (righe, soglia 6), patrimoni collegati (opzioni, soglia 4), eventi (righe, soglia 5), area di influenza (scala), 20% ciascuno.
- **Utenti**: fruitori 30% (soglia 7), fasce di età 25% (soglia 5), comunicazione 25% (soglia 8), monitoraggio visitatori 20% (scala).
- La sostenibilità (riga 43) è fuori da tutti gli indici: resta dato descrittivo.
- Scala dei periodi di apertura: tutto l'anno 1, una stagione 0,5, festività e ricorrenze 0,3, date specifiche 0,2 (modificabile in Indici_Scale).

## Note tecniche sul foglio (Google Sheets, it_IT)
- Non usare `NUMBERVALUE` (dà `#NAME?`): usare `VALUE(SUBSTITUTE(x;".";","))`.
- `SPLIT` converte in numeri le stringhe che sembrano numeri.
- Nelle variabili di `LET` non usare nomi che sembrano riferimenti di cella.
- Chip e selezione multipla nei menu a tendina si impostano solo dall'interfaccia, non via API.
- Con `copyPaste` e `PASTE_DATA_VALIDATION` gli intervalli relativi scorrono: usare `setDataValidation` con intervalli assoluti.
- Scrivendo valori via API, un apostrofo iniziale viene consumato; un apostrofo in mezzo al testo va scritto singolo.

## Da fare
1. **Script di fetch e snapshot JSON per VS Code.** Da decidere: CSV pubblicato dal foglio oppure chiave API Google. Lo script legge `Export_Casi` e scrive un JSON (liste divise su `|`, numeri convertiti).
2. Ripristinare il vocabolario di "Valore aggiunto potenziale" (colonna I di 'Dati esperienza di fruizione', con "coinvolgimento esperienziale" come voce unica) e ricollegare le regole di validazione delle righe 46 (C46:M46 e N46:AB46).
3. Completare i dati mancanti (campi di Stanguellini, anno di inizio di Tecnostoria).
4. Aggiornare la dashboard, che usa ancora dati offline vecchi.
5. Decidere se rinominare il campo "Accessibilità" del Template in "Forme di accessibilità" (la voce dell'indice si chiama già così).

## Stato attuale (25/11/2026)
Primo per potenziale: Museo Stanguellini (47,8), poi Collezione Auto Bandini (43,0) e Collezione Maserati Umberto Panini (33,2). In fondo: Museo Ferrari (5,6) e MAICC (2,3). I valori cambiano se si modificano i dati.
