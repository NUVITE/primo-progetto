---
titolo: Clienti, agenzie, ospiti e servizi
ordine: 55
permessi: prenotazioni.gestisci, listini.gestisci, pagamenti.registra
moduli:
fornitore: no
---

Il menu **Anagrafiche** raccoglie le schede con cui lavori tutti i giorni: i clienti e le aziende che prenotano o pagano, le agenzie con i loro allotment, gli ospiti che dormono in hotel e il catalogo dei servizi.

Una distinzione importante:

- l'**ospite** è la persona che dorme in hotel (scheda in **Anagrafiche › Ospiti**);
- il **cliente** è chi prenota o paga senza essere per forza in camera: un'azienda, un'agenzia, un portale online, un privato che organizza un evento (scheda in **Anagrafiche › Clienti e aziende**).

## Chi può fare cosa

| Pagina | Permesso nella pagina Ruoli |
|---|---|
| Anagrafiche › Ospiti | Gestire prenotazioni |
| Unire due schede ospite | Unire ospiti doppi |
| Anagrafiche › Clienti e aziende | Gestire prenotazioni oppure Gestire prenotazioni sale |
| Anagrafiche › Agenzie e allotment | Gestire listini e servizi (allotment) oppure Registrare pagamenti (estratto conto) |
| Anagrafiche › Servizi | Gestire listini e servizi |

## Clienti e aziende

Apri **Anagrafiche › Clienti e aziende** ([Clienti e aziende](/clienti)). L'elenco mostra per ogni cliente il tipo, la partita IVA o il codice fiscale, il comune, i contatti e la colonna **Uso**, che dice in quanti eventi e prenotazioni compare. Con il campo *Cerca per nome, P.IVA, comune…* filtri l'elenco mentre scrivi.

### Creare un cliente

1. Premi **+ Nuovo cliente**.
2. Scegli il tipo: **Azienda / ente**, **Privato**, **Agenzia / tour operator** o **Portale online**.
3. Scrivi la **Ragione sociale** (per un privato il campo si chiama **Nome e cognome**). È l'unico campo obbligatorio.
4. Compila quello che serve: **Partita IVA**, **Codice fiscale**, **Indirizzo**, **CAP**, **Comune**, **Prov.**, **Referente**, **Telefono**, **Email**, **PEC**, **Codice destinatario SDI**, **Note**.
5. Per agenzie e portali compare anche **Commissione %** (es. 15).
6. Premi **Salva cliente**.

I dati fiscali (partita IVA, codice SDI, PEC, indirizzo) sono quelli che finiscono nei dati per la fattura quando il cliente paga una parte del conto.

Il programma controlla i dati e risponde con messaggi chiari, per esempio:

- *La partita IVA deve avere 11 cifre.*
- *Il codice fiscale ha 16 caratteri (o 11 cifre per le aziende).*
- *Il CAP ha 5 cifre.* / *La provincia è la sigla di 2 lettere.*
- *Il codice destinatario SDI ha 7 caratteri.*
- *Partita IVA già presente: …* se un altro cliente ha la stessa partita IVA.

### Modificare, disattivare, eliminare

- **Modifica** apre la scheda per correggerla.
- Un cliente che non usi più si **disattiva** togliendo la spunta **Attivo**: resta nelle prenotazioni e negli eventi passati e nell'elenco compare in grigio con l'etichetta *non attivo*.
- **Elimina** compare solo per un cliente mai usato (0 eventi e 0 prenotazioni). Conferma con **Sì, elimina**.

### Dove si usa il cliente

Nella prenotazione, sezione **Provenienza e condizioni**, premi **Modifica**:

- **Tramite (azienda, agenzia, portale)**: chi ha portato la prenotazione;
- **Chi paga**: il cliente che paga (vuoto = paga l'ospite).

Quando c'è un cliente che paga, il conto si divide fra ospite e cliente. Come funziona il conto diviso è spiegato nel capitolo sul conto e la cassa.

## Agenzie e allotment

La pagina **Anagrafiche › Agenzie e allotment** ([Agenzie e allotment](/agenzie)) serve per lavorare con agenzie e tour operator: camere riservate (allotment), voucher ed estratto conto con le commissioni.

> Agenzie e allotment è una **funzione** che la struttura può spegnere in **Impostazioni › Struttura**, sezione **Funzioni usate**. Spenta, sparisce dal menu e dalle maschere (anche il voucher nella prenotazione); i dati restano e tornano visibili riaccendendola. Se apri la pagina con la funzione spenta, il programma te lo dice.

Le agenzie non si creano qui: un'agenzia è un cliente di tipo **Agenzia / tour operator** o **Portale online** creato in **Clienti e aziende**, con la sua commissione. Se non ce n'è nessuna, la pagina lo segnala con un collegamento.

### Cos'è un allotment

Un **allotment** riserva a un'agenzia un certo numero di camere di un tipo in un periodo. Le prenotazioni con quell'agenzia (indicata in **Tramite**) usano quelle camere; per gli altri non risultano libere.

Il **release** è il numero di giorni prima di ogni notte in cui le camere non usate tornano in vendita da sole.

Esempio: Agenzia Sole ha 4 doppie dal 1 al 31 luglio con release 14 giorni. Il 17 luglio le camere non usate per la notte del 31 tornano in vendita.

### Creare un allotment

Serve il permesso «Gestire listini e servizi».

1. Premi **Nuovo allotment**.
2. Scegli l'**Agenzia** e il **Tipo di camera**.
3. Indica **Dal (prima notte)** e **Al (giorno di fine, escluso)**. Per tutto luglio: dal 01/07 al 01/08.
4. Scrivi quante **Camere** riservare.
5. Scrivi il **Release (giorni prima)**. Con 0 le camere restano riservate fino alla notte.
6. Se vuoi, aggiungi una **Nota** (es. "contratto 2027, prezzo netto concordato").
7. Premi **Salva**. Compare *Allotment salvato.*

Controlli del programma: non puoi riservare più camere di quelle che esistono di quel tipo (*Di questo tipo ci sono solo … camere.*), il release va da 0 a 90 giorni e la fine deve essere dopo l'inizio.

### Seguire gli allotment

L'elenco **Allotment in corso e futuri** mostra per ogni allotment l'agenzia, quante camere di che tipo, il periodo, quante ne ha usate al massimo l'agenzia, il release e la data del prossimo release. A destra:

- un'etichetta gialla *… notti-camera bloccate*: le notti future ancora riservate e non usate;
- *niente di bloccato*: tutto usato o già rilasciato.

Con il menu *Tutte le agenzie* vedi gli allotment di una sola agenzia. Gli allotment già finiti non compaiono.

**Modifica** riapre l'allotment. Il cestino lo elimina dopo la conferma con **Elimina**: compare *Allotment eliminato: le camere tornano in vendita.*

### Prenotare camere in allotment

Se fai una nuova prenotazione e le camere libere di quel tipo sono solo quelle in allotment di un'agenzia, il programma non blocca ma avvisa: *… Puoi prenotarle lo stesso, ma togli disponibilità all'agenzia.*

### Il voucher

Quando l'agenzia manda un voucher, lo segni nella prenotazione. Serve «Gestire prenotazioni».

1. Nella prenotazione, sezione **Provenienza e condizioni**, controlla che in **Tramite** ci sia l'agenzia. Il voucher compare solo per un'agenzia o un portale.
2. Alla voce **Voucher dell'agenzia** premi **Aggiungi**.
3. Scrivi il **Numero** e scegli cosa copre:
   - **Camere e trattamento (extra e tassa a carico dell'ospite)**;
   - **Tutto (anche gli extra)**.
4. Premi **Salva**.

Il conto si divide da solo: quello che copre il voucher va all'agenzia, che diventa anche il cliente che paga. Per togliere il voucher premi **Modifica**, svuota il numero e salva: il conto torna come prima.

Esempio: voucher n. 4512 "Camere e trattamento" per 3 notti in doppia a 90 €. All'agenzia vanno 270 € di camere; l'ospite paga al check-out il bar (6 €) e l'imposta di soggiorno (12 €).

### Estratto conto e commissioni

La sezione **Estratto conto** la vede chi ha «Registrare pagamenti» e «Vedere importi».

1. Scegli l'**Agenzia** (tra parentesi c'è la sua commissione).
2. Indica il periodo: **Partenze dal** … **al**.
3. Premi **Mostra**.

Compaiono le prenotazioni dell'agenzia con partenza nel periodo, comprese quelle annullate con penale (etichetta *annullata, penale*). Le colonne:

- **Soggiorno**: camere e servizi prenotati, la base della commissione (per un'annullata, la penale);
- **Commissione**: soggiorno per la percentuale dell'agenzia;
- **Netto**: soggiorno meno commissione;
- **A carico agenzia**: la parte del conto diviso che paga l'agenzia (con il voucher);
- **Pagato**: quanto ha già pagato l'agenzia;
- **Saldo**: quanto deve ancora (in rosso se è più di zero).

In fondo c'è la riga **Totale**. Con **CSV** scarichi l'estratto, con **Stampa** lo stampi.

Esempio: soggiorno 1.000 €, commissione 15% = 150 €, netto 850 €. Con un voucher "camere e trattamento" l'agenzia paga 1.000 € e trattiene o fattura i 150 €.

Se l'agenzia non ha la commissione nella sua scheda, l'estratto dice *commissione non indicata* e la colonna Commissione è a zero.

Per incassare dall'agenzia registri il pagamento nella prenotazione, scegliendo l'agenzia nel campo **Paga**. Se l'agenzia paga a 30 giorni, al check-out lasci il conto in sospeso a suo carico.

## Ospiti e scheda ospite

**Anagrafiche › Ospiti** ([Ospiti](/ospiti)) contiene le schede delle persone che hanno soggiornato o prenotato. Serve «Gestire prenotazioni».

### Cercare un ospite

Scrivi nome, cognome, email o telefono e premi **Cerca**. I pulsanti sotto filtrano l'elenco: **Tutti**, **Abituali**, **Di riguardo**, **Con consenso marketing**, **Possibili doppioni**. Senza ricerca vedi prima gli ultimi ospiti modificati; il programma mostra al massimo 200 ospiti, oltre ti chiede di restringere la ricerca.

Accanto al nome possono comparire le etichette *Di riguardo*, *Abituale*, *Marketing sì*, *Preferenze* e *Doppione?* con il motivo. Le colonne **Soggiorni** e **Ultima partenza** contano i soggiorni già conclusi.

Un ospite è **abituale** dal secondo soggiorno. Con un solo soggiorno la scheda dice *Già ospite da noi (1 soggiorno)*.

### La scheda ospite

Clicca sul nome per aprire la scheda. Contiene:

- **In breve**: soggiorni, notti, ultima partenza, prossimo arrivo, prenotazioni annullate; un'etichetta dice se i dati per la schedina della Polizia sono presenti o da completare al check-in;
- **Anagrafica e preferenze**: **Nome**, **Cognome**, **Telefono**, **Email**, **Data di nascita**, **Lingua delle email** (*Automatica* = italiano per gli italiani, altrimenti inglese), **Preferenze**, **Note interne** e la spunta per l'ospite di riguardo;
- **Soggiorni e prenotazioni**: tutte le prenotazioni in cui compare, come chi ha prenotato o come ospite in camera, con lo stato (*Concluso*, *In corso*, *In arrivo*, *Annullata*);
- **Consenso al marketing**;
- **Possibili doppioni**, se ce ne sono;
- **Reclami**, se ce ne sono e hai il permesso per i reclami;
- **Email inviate**: le ultime email mandate all'ospite.

Dopo una modifica premi **Salva**; con **Annulla modifiche** torni ai dati di prima. I dati per la schedina (documento, luogo di nascita, cittadinanza) non si scrivono qui: si compilano al check-in.

### Ospiti di riguardo e preferenze

Spunta **Ospite di riguardo (VIP): viene segnalato nella prenotazione** e scrivi nelle **Preferenze** quello che serve sapere, per esempio "camera ai piani alti, cuscino basso, quotidiano al mattino".

Quando questo ospite ha una prenotazione, in testa al dettaglio compare il riquadro **Ospiti da conoscere** con il nome, *di riguardo*, i soggiorni precedenti e le preferenze. Così il ricevimento lo sa prima dell'arrivo.

### Consenso al marketing

Il consenso al marketing è separato dalla privacy del soggiorno: senza consenso l'ospite riceve solo le email della sua prenotazione.

1. In **Come è stato dato** scegli: *Modulo firmato*, *Per email*, *A voce (al banco o al telefono)*, *Dal sito*.
2. Premi **Registra il consenso**.

Il programma ricorda quando, come e chi l'ha raccolto. Se l'ospite cambia idea premi **Revoca il consenso**: resta scritto quando è stato revocato e da chi.

### Unire due schede doppie

Capita che lo stesso ospite abbia due schede, per esempio "Rossi Mario" e "Mario Rossi". Il programma segnala un **possibile doppione** quando due schede hanno:

- lo stesso nome e cognome (anche scambiati), con date di nascita uguali o mancanti;
- la stessa email o lo stesso telefono, ma solo con lo stesso cognome;
- lo stesso numero di documento.

Per unirle serve il permesso «Unire ospiti doppi».

1. Apri la scheda che vuoi **tenere**.
2. In **Possibili doppioni**, sotto l'altra scheda, premi **Unisci in questa scheda**.
3. Leggi l'avviso e premi **Conferma l'unione**.

Le prenotazioni, i soggiorni e le email dell'altra scheda passano a questa; i dati mancanti qui si completano con i suoi, note e preferenze si sommano, e l'altra scheda viene eliminata. **Non si può annullare.** Sotto la sezione resta scritto *Già unite qui:* con il nome, la data e chi ha unito.

Il programma rifiuta l'unione quando le schede sono chiaramente due persone:

- *Le date di nascita sono diverse…*: correggi prima la data sbagliata, se è un errore;
- *I due ospiti dormono nella stessa camera: sono due persone diverse.*;
- *I due ospiti sono nella stessa prenotazione come persone diverse: non si possono unire.*

## Servizi

**Anagrafiche › Servizi** ([Servizi](/servizi)) è il catalogo dei servizi e supplementi che poi si aggiungono alle prenotazioni: letto aggiunto, cuccia per il cane, colazione in camera, parcheggio. La pagina si intitola **Servizi aggiuntivi**. Serve «Gestire listini e servizi».

### Aggiungere un servizio

In fondo al catalogo:

1. Scrivi il **Nome** e il **Prezzo** (IVA inclusa, come tutti i prezzi del programma).
2. Scegli come si addebita: **una tantum**, **per notte** o **per persona per notte**. La quantità si calcola da sola dalle notti e dalle persone delle camere scelte.
3. Scegli l'effetto sulla camera: **nessun effetto**, **letto aggiunto (+1 posto)** o **animale (solo camere che li ammettono)**.
4. Premi **+ Aggiungi**.

Esempio: "Parcheggio" a 10 € per notte. Aggiunto a una prenotazione di 3 notti diventa 30 €. "Colazione in camera" a 8 € per persona per notte, per 2 persone e 3 notti, diventa 48 €.

### Effetti sulla camera

- **Letto aggiunto**: aumenta i posti della camera, entro il massimo previsto per quel tipo di camera. Va assegnato a una camera precisa.
- **Animale**: si può aggiungere solo nei tipi di camera che ammettono animali (si imposta in **Impostazioni › Camere**). Altrimenti il programma risponde *Animali non ammessi nelle camere …*.

### IVA del servizio

Nella colonna **IVA %** puoi scrivere l'aliquota del servizio; si salva quando esci dal campo. Vuoto (*come camere*) = la stessa aliquota delle camere e dei trattamenti.

### Modificare, disattivare, eliminare

- **Modifica** cambia nome, prezzo, modo di addebito ed effetto; poi **Salva**.
- Il pulsante **Attivo** / **Disattivato** accende e spegne il servizio: uno disattivato non si propone nelle nuove prenotazioni.
- **Elimina** funziona solo per un servizio mai usato. Se è già stato addebitato su prenotazioni o eventi, il programma risponde *Servizio già usato in … : non si può eliminare, disattivalo.*

Un servizio a prezzo libero, con l'importo deciso al momento, non serve nel catalogo: si aggiunge direttamente dal dettaglio della prenotazione.

## Da sapere

- Ospite e cliente sono due anagrafiche diverse: l'ospite dorme, il cliente prenota o paga.
- Clienti e servizi già usati non si eliminano: si disattivano, così lo storico resta corretto.
- L'unione di due ospiti non si annulla: controlla bene prima di confermare.
- La commissione dell'agenzia è solo un calcolo per l'estratto conto: il programma non emette fatture per le commissioni.

## Problemi frequenti

- **Il menu Agenzie e allotment non c'è.** La funzione è spenta in **Impostazioni › Struttura**, oppure non hai né «Gestire listini e servizi» né «Registrare pagamenti».
- **Non vedo l'estratto conto.** Servono «Registrare pagamenti» e «Vedere importi».
- **Nell'allotment non trovo l'agenzia.** Il cliente non è di tipo agenzia o portale, oppure non è attivo.
- **Non compare il campo voucher.** In **Tramite** non c'è un'agenzia o un portale.
- **Non vedo il pulsante Unisci in questa scheda.** Serve il permesso «Unire ospiti doppi».
