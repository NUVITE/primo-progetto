---
titolo: Integrazioni esterne
ordine: 8
fornitore: si
---

## Alloggiati Web (Polizia di Stato)

- Servizio web SOAP della Questura (`src/lib/alloggiati.ts`, descrizione in
  `ALLOGGIATI_ROSS1000_SPECIFICHE.md`). Credenziali per hotel (utente, password, WSKey) cifrate.
- Invio dal programma con controllo preventivo, oppure file di testo da caricare a mano sul portale;
  ricevute in PDF scaricabili.
- Le **tabelle della Polizia** (luoghi, documenti) si aggiornano da **Piattaforma › Tabelle Polizia**
  (`src/lib/tabellePolizia.ts`).

## ISTAT movimento turistico

- **Ross1000** (invio dal programma, credenziali per hotel) o **SPOT** (file da caricare):
  `src/lib/movimentoIstat.ts`. Il sistema lo attiva il fornitore nei dati dell'hotel.

## Tassa di soggiorno

- Regolamenti per comune gestiti dal fornitore (**Piattaforma › Tassa di soggiorno**,
  `src/lib/regolamentiTassa.ts`), calcolo per persona e per notte (`src/lib/tassaSoggiorno.ts`),
  rendiconto (`src/lib/rendicontoTassa.ts`). Note sulle norme in `TASSA_SOGGIORNO_*.md`.

## Posta

- Ogni hotel usa la **sua** casella SMTP (`src/lib/email.ts`, nodemailer), password cifrata.
  Nessun servizio di invio terzo.
- `EMAIL_SIMULA=1` (solo sviluppo): nessuna email parte, lo storico le segna "simulata". I collaudi
  usano un trasporto finto.

## Pagine pubbliche per gli ospiti

Senza login, con un codice casuale nell'indirizzo: room service `/rs/<codice>` (dal QR del
cartoncino in camera), preventivo `/pv/<codice>`, questionario `/qs/<codice>`. Un codice sbagliato
risponde 404.
