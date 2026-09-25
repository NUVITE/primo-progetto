# Imposta di soggiorno — Bari, Trani, Bisceglie, Andria

> Raccolto da fonti pubbliche (siti comunali, stampa locale) il 2026-09-25, per preparare dati di
> esempio realistici per la demo. **Non sono valori certificati**: dove le fonti secondarie sono in
> disaccordo lo segnalo esplicitamente. Prima di usarli con un cliente vero, verificare sul
> regolamento comunale ufficiale (spesso pubblicato anche sul portale del Ministero
> dell'Economia/Federalismo Fiscale).

---

## Bari

**Tariffe per categoria struttura** (per persona/notte):
- Alberghi 5 stelle/lusso: €4,00 — 4 stelle: €3,00 — 3 stelle: €2,00 — 1-2 stelle: €1,50
- Extralberghiero (B&B, case vacanza, affittacamere, locazioni brevi tipo Airbnb/Booking): €2,00
- Ostelli e campeggi: €1,50

**Tetto massimo:** 4 pernottamenti consecutivi — dal quinto in poi il soggiorno è esente.

**Periodo di applicabilità:** tutto l'anno.

**Esenzioni:** residenti a Bari; minorenni (**soglia età discordante tra le fonti: 11, 14 o 18 anni
a seconda dell'articolo consultato — verificare sul regolamento ufficiale prima della demo**);
pazienti ricoverati e accompagnatori (max 2); autisti bus e guide turistiche (1 ogni 20
partecipanti); ospiti alloggiati dal Comune per emergenze; forze dell'ordine/vigili del fuoco in
servizio; riduzione 50% per convenzioni aziendali, gruppi scolastici, atleti under 16 in eventi
organizzati.

**Nota:** il regolamento risale a fine 2023, con tariffe aggiornate per il 2026 — buona base per la
demo ma la soglia età minorenni va confermata.

Fonti: [Comune di Bari](https://www.comune.bari.it/-/imposta-di-soggiorno-giunta-comunale-approva-disciplinare-tariffe) · [BusinessMobility.travel](https://www.businessmobility.travel/tassa-soggiorno-bari-2026-tutto-sulle-nuove-tariffe-ed-esenzioni/37792/) · [BariToday](https://www.baritoday.it/economia/tassa-soggiorno-bari-comune-approva-tariffe.html)

---

## Trani

**Tariffe:**
- €1,50: alberghi, residenze turistiche alberghiere, villaggi turistici, B&B, agriturismi, case
  vacanza/appartamenti
- €1,00: affittacamere, campeggi, ostelli, locazioni brevi, altre strutture ricettive

**Tetto massimo:** 6 pernottamenti consecutivi.

**Periodo di applicabilità:** tutto l'anno.

**Esenzioni:** minori fino a 16 anni; persone con disabilità (indennità di accompagnamento) e il
loro accompagnatore; dipendenti della struttura dove alloggiano; autisti bus e guide turistiche per
gruppi organizzati; forze dell'ordine/vigili del fuoco in servizio; persone alloggiate dalla P.A.
per emergenze/calamità; volontari di protezione civile/soccorso.

**Entrata in vigore:** 1 maggio 2026 (regolamento approvato con delibera CC n.4 del 26/01/2026,
tariffe con delibera n.20 del 25/02/2026) — è il regolamento più recente tra i 4, quindi
probabilmente il più affidabile come fonte.

Fonti: [TraniLive](https://tranilive.it/2026/03/29/turismo-dal-primo-maggio-entra-in-vigore-a-trani-imposta-di-soggiorno-scadenze-esenzioni-e-sanzioni/) · [TraniViva](https://www.traniviva.it/notizie/imposta-di-soggiorno-a-trani-al-via-dal-1-maggio-2026/)

---

## Bisceglie

**Tariffe:**
- €1,00: quasi tutte le strutture ricettive
- €2,00: unità immobiliari in locazione breve (L. 96/2017)

**Tetto massimo:** 7 pernottamenti.

**Periodo di applicabilità:** **solo dal 1 maggio al 31 ottobre** — a differenza di Bari e Trani non
è annuale. Punto rilevante per il modello dati: conferma che serve un campo esplicito "finestra
stagionale del regolamento", non solo la data di decorrenza.

**Esenzioni:** minori di 12 anni; residenti a Bisceglie; accompagnatori di degenti ospedalieri (max
2) e pazienti in day hospital; disabili gravi con un accompagnatore; forze dell'ordine; volontari in
occasione di calamità; donne vittime di violenza e figli.

**Entrata in vigore:** 28 marzo 2026 (delibera consiliare del 27/01/2026).

Fonti: [Bisceglie24](https://www.bisceglie24.it/attualita/approvato-il-regolamento-sullimposta-di-soggiorno-a-bisceglie/) · [scheda sintetica Confcommercio](https://bisceglie.gocity.it/library/allegati/confcommercio_bisceglie_scheda_sintetica_imposta_di_soggiorno_bisceglie.pdf)

---

## Andria

**Nessuna imposta di soggiorno risulta attiva** al momento di questa ricerca (settembre 2026). Le
notizie trovate sul consiglio comunale di Andria nel 2026 riguardano altri argomenti tributari
(regolamento generale entrate, definizione agevolata), non l'istituzione della tassa di soggiorno.
È plausibile che sia in discussione (gli altri 3 comuni del territorio l'hanno introdotta proprio
nel 2026) ma non ho trovato conferma di un regolamento approvato.

**Per la demo:** questo è in realtà un caso utile da mostrare — un hotel/B&B di Andria configurato
con "nessun regolamento tassa di soggiorno attivo" dimostra che il sistema gestisce anche l'assenza
della tassa, non solo tariffe diverse da zero. Da confermare comunque con una telefonata/verifica
diretta al Comune prima della demo, nel caso sia stata approvata di recente e non ancora coperta
dalla stampa.

---

## Riepilogo per il modello dati

| Comune | Tariffa base | Tetto notti | Periodo anno | Età esente minori |
|---|---|---|---|---|
| Bari | €1,50–4,00 (per stelle) | 4 | Tutto l'anno | discordante (11/14/18) — da verificare |
| Trani | €1,00–1,50 | 6 | Tutto l'anno | 16 |
| Bisceglie | €1,00–2,00 | 7 | 1 mag–31 ott | 12 |
| Andria | — (nessuna) | — | — | — |

Quattro comuni confinanti, quattro combinazioni diverse di aliquota/tetto/periodo/soglia età — è
esattamente la conferma che serve un motore configurabile, non quattro logiche hardcoded.
