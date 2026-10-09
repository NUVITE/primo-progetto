# Come si scrive il manuale

Il manuale si legge **dentro il programma**: menu Aiuto › Manuale (operativo, per chi usa il
programma) e Piattaforma › Manuale tecnico (per chi lo sviluppa e lo gestisce). Ogni capitolo è un
file `.md` in `operativo/` o `tecnico/`; questo file non è un capitolo.

Quando si aggiunge o si cambia una funzione, si aggiorna il capitolo nella stessa modifica.

## Intestazione di ogni capitolo

```
---
titolo: Planning e prenotazioni
ordine: 10
permessi: prenotazioni.vedi
moduli:
fornitore: no
---
```

- `ordine`: posizione nell'indice (numeri crescenti).
- `permessi`: codici di `src/lib/permessi.ts` separati da virgola; il capitolo si vede se l'utente ne
  ha almeno uno. Vuoto = tutti.
- `moduli`: moduli che devono essere accesi (`sale`, `ristorazione`, `pulizie`, `manutenzioni`,
  `portineria`). Vuoto = nessuno.
- `fornitore: si` = solo per il gestore della piattaforma.
- Il nome del file è `NN-slug.md`: lo slug (senza numero) è l'indirizzo, es. `/manuale/planning`.

## Markdown ammesso (ridotto, niente HTML)

`#` titolo (non serve: il titolo viene dall'intestazione), `##` paragrafo (compare nell'indice del
capitolo), `###` sotto-paragrafo; elenchi `-` e `1.`; `**grassetto**`, `*corsivo*`, `` `codice` ``;
collegamenti `[testo](/pagina)` (interni all'app) o `[testo](https://...)`; blocchi di codice con
tre apici inversi; note con `>` all'inizio della riga; tabelle semplici `| a | b |` con la riga
`|---|---|` sotto le intestazioni; video dimostrativi con una riga `@video nome Didascalia`, che mostra
`public/video/nome.webm` (vedi Manuale tecnico › Collaudi, "Video dimostrativi"). Niente HTML,
niente immagini, niente commenti `<!-- -->`.

## Stile del manuale operativo

- **Italiano semplice**, per chi lavora al ricevimento, ai piani o in cucina, e per gli studenti
  dell'istituto alberghiero. Frasi brevi. Si dà del tu ("apri", "scegli", "premi").
- **Solo quello che il programma fa davvero**: ogni passo va verificato nel codice
  (`src/app/**/page.tsx`, i componenti, le azioni e `src/lib/*`). Mai inventare pulsanti, campi o
  comportamenti. Nel dubbio, non scriverlo.
- **Nomi esatti** di menu, pagine, pulsanti e campi come compaiono sullo schermo (`src/app/menu.ts`,
  le etichette nei componenti). Il menu si scrive così: **Ricevimento › Planning camere**.
- Le unità: il programma dice "camere" o "appartamenti" secondo la tipologia della struttura.
  Scrivere "camera" e, dove serve, ricordare che nelle case vacanze compare "appartamento".
- Per ogni funzione: a cosa serve, **chi può usarla** (nome del permesso come appare nella pagina
  Ruoli), i passi numerati, cosa succede dopo, gli errori e i messaggi più comuni.
- Esempi concreti con numeri verosimili (una doppia a 90 € a notte, un acconto del 30%).
- Collegamenti alle pagine del programma con il loro indirizzo, es. `[Prenotazioni](/prenotazioni)`.
- Struttura consigliata: una o due frasi iniziali; un paragrafo `##` per attività
  ("Fare una prenotazione", "Confermare un'opzione"…); in fondo `## Da sapere` (regole, eccezioni)
  e, se utili, `## Problemi frequenti`.
- Le note normative (Polizia, ISTAT, tassa di soggiorno, IVA) si scrivono con prudenza: si spiega
  cosa fa il programma, non si danno consigli legali o fiscali.

## Stile del manuale tecnico

Per sviluppatori: architettura, scelte e motivi, convenzioni del codice, comandi esatti. Mai
password, chiavi o valori del `.env`: solo i nomi delle variabili.
