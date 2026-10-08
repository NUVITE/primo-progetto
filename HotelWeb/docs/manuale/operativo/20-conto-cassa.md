---
titolo: Conto, pagamenti e cassa
ordine: 20
permessi: pagamenti.registra, cassa.chiudi, addebiti.registra
moduli:
fornitore: no
---

Questo capitolo segue i soldi: dal conto della prenotazione (cosa deve pagare l'ospite) agli incassi, ai consumi dei reparti, fino alla chiusura della cassa a fine giornata e al giornale d'albergo.

> Il programma prepara il conto e i dati per la fattura, ma **non emette documenti fiscali**: il proforma non è una fattura e la fattura la fa il gestionale con i dati che gli passi.

## Chi può fare cosa

| Cosa | Permesso nella pagina Ruoli |
|---|---|
| Vedere il conto e gli importi | Vedere importi |
| Incassare acconti e saldi, rimborsi, storni, conto diviso, conti sospesi | Registrare pagamenti |
| Segnare consumi ed esborsi sul conto, stornarli | Registrare addebiti |
| Fare un abbuono (sconto) sul conto | Modificare i prezzi (oltre a Registrare addebiti) |
| Cassa del giorno e chiusura | Chiusura di cassa |
| Giornale d'albergo | Chiusura di cassa oppure Registrare pagamenti |

Chi ha «Registrare pagamenti» o «Chiusura di cassa» vede anche gli importi, anche se il ruolo non ha «Vedere importi».

## Il conto della prenotazione

@video conto Un consumo sul conto, il saldo incassato e la cassa del giorno (circa 2 minuti, senza audio).

Apri la prenotazione da [Prenotazioni](/prenotazioni) e scorri fino alla sezione **Conto**. Qui c'è tutto quello che l'ospite deve pagare, voce per voce, con l'IVA. Se non vedi la sezione, il tuo ruolo non ha il permesso «Vedere importi».

Il conto ha due tipi di righe:

- **righe automatiche**, che il programma ricava dalla prenotazione e aggiorna da solo: le camere (con le notti e il trattamento), l'uso diurno, i servizi aggiunti, l'imposta di soggiorno e, per una prenotazione annullata, la penale;
- **righe a mano**: i consumi dei reparti (bar, ristorante, frigobar…), gli esborsi e gli abbuoni.

Ogni riga mostra **Data**, **Voce**, **Q.tà**, **Importo** e **IVA**. In fondo c'è il **Totale** e sotto il **Riepilogo IVA**, con l'imponibile e l'imposta per ogni aliquota.

### Prezzi IVA inclusa e scorporo

Tutti i prezzi del programma sono **IVA inclusa**. L'imponibile e l'IVA si ricavano per scorporo: importo diviso (1 + aliquota).

Esempio: una doppia a 90 € a notte per 3 notti, IVA 10%.

- Riga camera: 270,00 €
- Imponibile: 270 / 1,10 = 245,45 €
- IVA: 270,00 − 245,45 = 24,55 €

Da dove viene l'aliquota di ogni riga:

- **camere, trattamento e uso diurno**: l'aliquota dell'alloggio, impostata in **Impostazioni › Reparti e IVA**;
- **servizi**: l'aliquota del servizio nel catalogo, se c'è; altrimenti quella dell'alloggio;
- **consumi**: l'aliquota del reparto;
- **imposta di soggiorno, esborsi e penale**: fuori campo IVA (nel conto compare il motivo al posto dell'aliquota).

> Le aliquote con cui nasce un hotel sono solo un punto di partenza. Chi configura l'hotel le controlla con il commercialista in **Impostazioni › Reparti e IVA**.

### Il proforma

Il pulsante **Proforma**, in alto a destra nella sezione Conto, apre in una nuova scheda il conto pronto da stampare. In testa c'è scritto *Non è un documento fiscale*. Serve per far controllare il conto all'ospite prima del saldo.

## Segnare un consumo, un esborso o un abbuono dalla prenotazione

Sotto il conto ci sono tre pulsanti: **Consumo**, **Esborso** e **Abbuono**. Li vede chi ha «Registrare addebiti»; **Abbuono** compare solo se hai anche «Modificare i prezzi».

- **Consumo**: bar, ristorante, frigobar, lavanderia… L'IVA è quella del reparto.
- **Esborso**: una spesa anticipata per l'ospite, per esempio un taxi o un biglietto. È fuori campo IVA.
- **Abbuono**: toglie un importo dal conto, sempre con il motivo.

Passi per un consumo:

1. Premi **Consumo**.
2. Scegli il **Reparto** (obbligatorio).
3. Se la prenotazione ha più camere, scegli la **Camera**. Con una sola camera è già scelta.
4. Controlla la **Data** (propone oggi).
5. Scrivi la **Descrizione** (es. "2 caffè"), la **Quantità** e il **Prezzo unitario (€, IVA inclusa)**.
6. Se c'è, scrivi il **N. buono**. Nel campo **Nota** puoi aggiungere un appunto.
7. Premi **Segna sul conto**.

Esempio: due caffè al bar a 1,50 €. Reparto Bar, quantità 2, prezzo 1,50: in conto 3,00 €, di cui IVA 10% 0,27 €.

Per un **abbuono** il modulo cambia: al posto del reparto c'è **Su quale reparto (IVA)**, con la prima scelta "Camere e trattamento" (l'aliquota dell'alloggio); il prezzo diventa **Importo da togliere (€)** e il **Motivo** è obbligatorio. Esempio: la doccia non funzionava e regali 20 € sulla camera: scegli "Camere e trattamento", importo 20, motivo "doccia guasta camera 104". Nel conto la riga compare in negativo con l'etichetta *abbuono*.

Se non ci sono reparti attivi, compare l'avviso *Nessun reparto attivo: si creano in Impostazioni › Reparti e IVA.*

### Stornare un addebito sbagliato

Un addebito sbagliato **non si cancella: si storna**.

1. Sulla riga sbagliata premi **Storna**.
2. Scrivi il **Motivo**.
3. Premi di nuovo **Storna** per confermare (oppure **No**).

La riga resta visibile, barrata, con chi l'ha stornata e il motivo, e non conta più nel totale. Solo le righe a mano (consumi, esborsi, abbuoni) si stornano; le righe automatiche cambiano modificando la prenotazione.

> Una prenotazione annullata non accetta più addebiti.

## Addebiti dei reparti (anche da tablet)

La pagina **Ricevimento › Addebiti dei reparti** ([Addebiti dei reparti](/addebiti)) è pensata per il bar, il ristorante o il portiere, anche su tablet. Chi la usa vede solo il numero di camera e il nome dell'ospite, non il resto della prenotazione. Serve il permesso «Registrare addebiti».

1. In **Camere con ospiti in casa** tocca la camera dell'ospite. Compaiono solo le camere con ospiti già arrivati e non ancora partiti.
2. Scegli il **Reparto**, scrivi **Cosa** ha consumato, la **Quantità** e il **Prezzo cad. (€)**, e il **N. buono** se c'è.
3. Premi **Segna sul conto**. Compare il messaggio *Segnato sul conto della camera…* e torni all'elenco delle camere. Con **Altra camera** torni indietro senza segnare nulla.

Da questa pagina si segnano solo **consumi**, sempre con la data di oggi. Esborsi e abbuoni si fanno dal conto della prenotazione.

In basso, **Addebiti di oggi** elenca gli addebiti del giorno con ora e operatore. Se hai sbagliato, premi **Storna**, scrivi il motivo e conferma.

Se una camera non compare, l'ospite non risulta arrivato: va fatto prima il check-in. Se provi a segnare su una camera che nel frattempo è partita, compare *La camera non ha ospiti in casa oggi.*

## Registrare un pagamento

Nella prenotazione, la sezione **Pagamenti** mostra gli incassi già registrati e quanto manca. Serve il permesso «Registrare pagamenti».

1. Premi **Registra pagamento**. Il programma propone già un importo: l'acconto che manca, se è stato richiesto; altrimenti quanto resta da pagare.
2. Scegli il **Tipo**: Caparra confirmatoria, Acconto, Saldo o Rimborso.
3. Controlla l'**Importo (€)**.
4. Scegli il **Metodo**: Contanti, Carta di credito, Bancomat, Bonifico, Assegno, Altro.
5. Controlla la **Data**: è la data che conta per la cassa.
6. Se il conto è diviso, scegli nel campo **Paga** chi sta pagando (ti mostra quanto deve ciascuno).
7. Se serve, scrivi una **Nota** (es. il numero del bonifico) e premi **Registra**.

Esempio: soggiorno di 285 € (270 € di camera, 3 € di bar, 12 € di imposta di soggiorno). All'atto della prenotazione l'ospite versa un acconto del 30% sulla camera, 81 € con bonifico. Al check-out restano da pagare 204 €.

"Da pagare" comprende sempre l'imposta di soggiorno. Il pagamento **non è una ricevuta né una fattura**.

### Acconto richiesto

Chi gestisce le prenotazioni può indicare con **Acconto richiesto** (o **Scadenza opzione e acconto**, se la prenotazione è in opzione) l'importo e la data entro cui arrivare. Finché l'acconto non è arrivato compare *Acconto da ricevere* con l'importo; dopo la data compare anche *(scaduto)*.

### Rimborso

Per restituire soldi registra un pagamento di tipo **Rimborso**. Nell'elenco compare in rosso con il segno meno. Non si può rimborsare più di quanto incassato: il programma risponde *Non si può rimborsare più di quanto incassato*.

### Stornare un pagamento sbagliato

Un incasso sbagliato non si cancella: sotto il pagamento premi **Storna**, scrivi il **Motivo dello storno** e conferma con **Storna**. Il pagamento resta visibile, barrato, con chi l'ha stornato, quando e perché.

Lo storno si registra nella cassa **del giorno in cui lo fai**, come movimento contrario.

### Giornata di cassa chiusa

Quando una giornata è chiusa in cassa, non si registrano più pagamenti con quella data. Se ci provi, compare:

*La cassa del 07/10/2026 è già chiusa: riaprila dalla pagina Cassa o usa un'altra data.*

Lo stesso vale per uno storno o per una cauzione se è già chiusa la cassa di oggi. Puoi cambiare la data del pagamento oppure chiedere a chi ha «Chiusura di cassa» di riaprire la giornata.

## Conto diviso tra ospite e cliente

Quando paga un'azienda o un'agenzia, il conto si divide fra gli **intestatari**: l'ospite e il cliente che paga. Il cliente è quello indicato in **Chi paga** nella sezione *Provenienza e condizioni* della prenotazione; per le agenzie lo imposta anche il voucher (vedi il capitolo sulle agenzie).

Con più intestatari, sopra il conto compare il campo **Chi paga cosa**, con tre regole:

- **Camere e trattamento al cliente, extra e tassa all'ospite** (la regola di partenza): camere, servizi prenotati e penale al cliente; consumi, esborsi e imposta di soggiorno all'ospite;
- **Tutto all'ospite**;
- **Tutto al cliente**.

La regola vale per tutte le righe. Una singola riga si sposta dalla colonna **A carico di**; il pulsante con la freccia circolare (*Torna alla regola*) la riporta com'era.

Sotto il conto c'è un riquadro per ogni intestatario con **Conto**, **Pagato** e **Da pagare**. Ognuno ha il suo saldo: quando registri un pagamento scegli chi paga nel campo **Paga**.

Esempio: un rappresentante dorme 2 notti a 95 € in una camera pagata dalla sua azienda. Con la regola di partenza l'azienda ha 190 € di camere; l'ospite ha 8 € di bar e 4 € di imposta di soggiorno e paga 12 € alla partenza.

Per cambiare la regola, spostare le righe e segnare le fatture serve «Registrare pagamenti».

## Righe da passare al gestionale per la fattura

Nel riquadro di ogni intestatario (titolo **Fattura**, oppure **Conto per intestatario e fattura** se il conto è diviso) il programma dice cosa c'è da fatturare:

- *Da fatturare: …* con il numero di righe;
- *Già passato al gestionale: …* se una parte è già stata inviata;
- *Niente da fatturare.* quando è tutto inviato.

Passi:

1. Premi **Dati (JSON)** o **CSV** per scaricare i dati: intestatario con i dati fiscali (partita IVA, codice SDI, PEC…), righe con aliquota o natura, riepilogo IVA.
2. Passa i dati al gestionale ed emetti la fattura lì.
3. Torna qui e premi **Segna come inviati**, poi conferma con **Sì, segna**.

Se dopo l'invio il conto cambia, il programma prepara solo la differenza: una riga in più diventa un *Conguaglio*. Se invece il conto diminuisce, compare in rosso *Dopo l'invio il conto è diminuito di …: serve una nota di credito.*

## Conti aperti e sospesi

Un soggiorno deve finire con il saldo pagato oppure con un conto **in sospeso** dichiarato, mai con un "da pagare" dimenticato.

### Al check-out o nella prenotazione

Quando tutti sono partiti ma il conto non è saldato, nella prenotazione (e al check-out) compare l'avviso *Tutti partiti, ma il conto non è saldato*. Per una prenotazione annullata con penale non incassata compare *Penale da incassare.* Hai due strade:

- registri il pagamento;
- premi **Lascia in sospeso**, scegli **A carico di** (l'ospite o un cliente dell'anagrafica), scrivi la **Nota** (obbligatoria: perché resta aperto e come verrà pagato) e premi **Conferma sospeso**.

Esempio: gruppo partito sabato, l'agenzia paga con bonifico a 30 giorni. Lasci in sospeso a carico dell'agenzia con la nota "bonifico a 30 gg, fattura n. 15".

Il sospeso **si chiude da solo** quando registri il pagamento che porta il saldo a zero. Con **Togli dal sospeso** lo annulli a mano.

### La pagina Conti aperti e sospesi

**Ricevimento › Conti aperti e sospesi** ([Conti aperti e sospesi](/conti)) raccoglie i conti da chiudere (per i soggiorni, quelli finiti negli ultimi 18 mesi circa), con il totale da incassare in testa. Serve «Registrare pagamenti». I gruppi sono:

- **Partiti con il conto da saldare**: nessuno ha ancora deciso. Hanno l'etichetta *da decidere*.
- **Conti in sospeso**: lasciati aperti con una nota.
- **Penali da incassare**: prenotazioni annullate con una penale più alta di quanto già incassato.
- **Eventi in sala da saldare**: compare solo se l'hotel usa le sale.

Clicca sul nome per aprire la prenotazione e registrare il pagamento.

Per i conti in sospeso c'è il pulsante **Sollecitato oggi**: segna che oggi hai chiesto il pagamento. Nella colonna **A carico di** compare *sollecitato il …*. Il programma non invia nessun sollecito: registra solo che l'hai fatto tu.

Quando non c'è nulla da chiudere, la pagina dice *Tutti i conti sono chiusi.*

## Cassa e chiusura del giorno

**Ricevimento › Cassa e chiusura del giorno** ([Cassa](/cassa)) mostra tutti gli incassi e i rimborsi registrati con la data del giorno, sulle camere e sugli eventi in sala. Serve il permesso «Chiusura di cassa».

In alto scegli il giorno con **Giorno prima**, **Giorno dopo**, il calendario o **Oggi**. Non si va oltre oggi. Il pulsante **Stampa** stampa la pagina.

La pagina mostra:

- **Per metodo**: contanti, carta, bancomat… con il **Totale**;
- **Per operatore**: quanto ha incassato ciascuno;
- **Addebiti dei reparti**: i consumi segnati quel giorno sul conto delle camere. Non sono incassi: si pagano al saldo;
- **Movimenti**: ogni incasso con ora, prenotazione o evento, operatore e importo. Un pagamento stornato lo stesso giorno resta visibile, barrato, e non conta. Uno storno di un pagamento di un altro giorno compare come *Storno del …* in negativo;
- **Cauzioni**, se ce ne sono: i depositi degli ospiti incassati, restituiti o trattenuti.

### Le cauzioni nei contanti

Le cauzioni **non sono incassi**, ma il contante entra ed esce dal cassetto. Per questo la pagina mostra il *Saldo delle cauzioni in contanti*, che conta nei contanti attesi alla chiusura. Una cauzione di 50 € in contanti incassata oggi e non ancora restituita aggiunge 50 € ai contanti attesi.

### Chiudere la giornata

1. Premi **Chiudi la giornata…**.
2. **Fondo all'apertura (€)**: il programma propone il fondo lasciato alla chiusura precedente. Lascialo vuoto se non usi il fondo cassa.
3. **Contanti contati (€)**: facoltativo. Se hai scritto il fondo, sotto il campo compare *Attesi: …*.
4. **Fondo lasciato per domani (€)**: quanto resta nel cassetto per il giorno dopo.
5. Se i contanti non tornano compare *I contanti non tornano: differenza …*: scrivi il motivo nella **Nota**.
6. Premi **Chiudi la giornata**. Compare *Giornata chiusa.*

Esempio: fondo all'apertura 100 €, incassati in contanti 250 €, nessuna cauzione: in cassa devono esserci 350 €. Se ne conti 345 €, la differenza di −5 € va spiegata nella nota. Lasci 100 € di fondo per domani.

Il fondo cassa è facoltativo: chi non lo usa chiude e basta. Ma se scrivi i contanti contati, serve anche il fondo all'apertura (anche 0), altrimenti il programma risponde *Per confrontare i contanti contati serve il fondo all'apertura (anche 0).* Se la differenza c'è e la nota è vuota, la chiusura viene rifiutata.

Dopo la chiusura la sezione mostra chi ha chiuso e quando, il totale, il fondo, i contanti attesi e contati, la **Differenza** e il fondo lasciato. Da quel momento **non si registrano più pagamenti con quella data**: il totale resta quello controllato. Se dopo la chiusura cambia qualcosa nei movimenti, compare l'avviso *Dopo la chiusura sono cambiati dei movimenti* con i metodi interessati.

### Riaprire una giornata

Se devi correggere un pagamento con una data già chiusa:

1. Vai sul giorno chiuso e premi **Riapri la giornata**.
2. Conferma con **Sì, riapri**.
3. Correggi il pagamento nella prenotazione.
4. Torna in cassa e chiudi di nuovo la giornata.

In fondo alla pagina, **Ultime giornate chiuse** elenca le ultime 14 giornate chiuse con chi le ha chiuse e il totale; se i contanti non tornavano c'è un'etichetta rossa con la differenza. Clicca sulla data per aprire quel giorno.

## Il giornale d'albergo

**Ricevimento › Giornale d'albergo** ([Giornale d'albergo](/giornale)) è la *main courante*: per ogni prenotazione gli addebiti del giorno divisi per colonna e i pagamenti ricevuti. Serve «Chiusura di cassa» oppure «Registrare pagamenti».

Le colonne sono:

- **Alloggio**: il prezzo della notte, con il trattamento (c'è sempre);
- una colonna per ogni **reparto** con consumi quel giorno (Bar, Ristorante…);
- **Esborsi**, **Abbuoni** (in negativo) e **Tassa di soggiorno**, solo se quel giorno ci sono movimenti;
- **Totale addebiti** e **Pagamenti** (i rimborsi li riducono).

Le righe sono in ordine di camera; le prenotazioni senza camera assegnata vanno in fondo. L'ultima riga, **Chiusura contabile**, somma ogni colonna: sono i ricavi del giorno per reparto. Gli stessi totali sono riassunti in alto nella sezione **Chiusura contabile del giorno**.

Esempio di una riga: camera 104, ospite Rossi Mario, Alloggio 90,00, Bar 3,00, Tassa di soggiorno 4,00, Totale addebiti 97,00. La colonna Pagamenti è vuota se quel giorno l'ospite non ha pagato nulla.

Cambi giorno con le frecce, il calendario o **Oggi**; **Stampa** stampa il giornale. Gli incassi per metodo e il conteggio dei contanti non sono qui: sono nella cassa del giorno. Gli eventi in sala non compaiono nel giornale.

## Da sapere

- Niente si cancella: addebiti e pagamenti sbagliati si **stornano** con il motivo e restano visibili con chi e quando.
- Un pagamento conta nella cassa del giorno della sua **data**; uno storno nella cassa del giorno in cui lo fai.
- Gli addebiti dei reparti non sono incassi: entrano nel conto e si pagano al saldo.
- Il proforma e i pagamenti non sono documenti fiscali. Le fatture le emette il gestionale.
- Le aliquote IVA le decide chi configura l'hotel in **Impostazioni › Reparti e IVA**; il programma fa solo i calcoli.

## Problemi frequenti

- **Non vedo la sezione Conto nella prenotazione.** Il tuo ruolo non ha «Vedere importi» (né «Registrare pagamenti»).
- **Non c'è il pulsante Abbuono.** Serve anche il permesso «Modificare i prezzi».
- **La camera non compare in Addebiti dei reparti.** L'ospite non ha fatto il check-in, oppure è già partito.
- **«La cassa del … è già chiusa».** Usa un'altra data o fai riaprire la giornata da chi ha «Chiusura di cassa».
- **«I contanti contati … non tornano con quelli attesi … scrivi una nota».** Scrivi nella nota il motivo della differenza e chiudi di nuovo.
- **Il conto diviso non compare.** Nella prenotazione non è indicato nessun cliente in **Chi paga** (o nessun voucher di agenzia): paga tutto l'ospite.
