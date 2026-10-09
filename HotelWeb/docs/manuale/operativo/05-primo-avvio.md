---
titolo: Primo avvio: configurare la struttura
ordine: 5
permessi: hotel.configura, camere.gestisci, listini.gestisci
moduli:
fornitore: no
---

Prima di prendere la prima prenotazione bisogna dire al programma com'è fatta la struttura: dati, camere, prezzi, regole di cancellazione, collegamenti con Polizia e ISTAT, email. Questo capitolo segue l'ordine giusto, pagina per pagina.

Chi può farlo: il permesso **Configurare l'hotel** serve per Primo avvio, Struttura, Trattamenti, Reparti e IVA, Email e modelli e Adempimenti; **Gestire camere** per le camere; **Gestire listini e servizi** per listini e politiche di cancellazione.

## Camere o appartamenti

Il programma usa la parola giusta per la tua struttura. La **tipologia** (albergo, B&B, affittacamere, casa vacanze, residence…) la imposta il fornitore del programma.

- Albergo, B&B, affittacamere, casa per ferie, agriturismo: **camere**.
- Residenza turistico-alberghiera, case e appartamenti per vacanze, residence: **appartamenti**.

Così il menu dice **Impostazioni › Appartamenti** invece di **Impostazioni › Camere**, e il primo avvio dice "Appartamenti e tipi". In questo capitolo scriviamo "camera": se la tua struttura affitta appartamenti, leggi "appartamento". In alcune pagine (per esempio nel dettaglio della prenotazione, *Aggiungi una camera*) certe scritte restano "camera" anche nelle case vacanze.

## La pagina Primo avvio

Apri **Impostazioni › Primo avvio** ([Primo avvio](/impostazioni/avvio)). In alto vedi quanti passi hai fatto (es. *4 passi fatti su 9*) e una barra di avanzamento. Sotto c'è l'elenco dei passi:

| Passo | Quando è fatto | Chi lo fa |
|---|---|---|
| 1. Dati della struttura | indirizzo, telefono, email, orari di check-in e check-out compilati | tu |
| 2. Camere e tipi | almeno una camera attiva | tu |
| 3. Listino e prezzi | ogni tipo con camere attive ha prezzi nel Listino base da oggi in poi | tu |
| 4. Politica di cancellazione | almeno una politica | tu |
| 5. Regolamento della tassa di soggiorno | il regolamento del comune è in vigore | il fornitore |
| 6. Alloggiati Web (schedine di Polizia) | credenziali inserite e provate con successo | tu |
| 7. Statistica ISTAT | sistema regionale attivo e dati compilati | il fornitore attiva il sistema, tu completi i dati |
| 8. Casella email dell'hotel | casella configurata e prova riuscita | tu |
| 9. Utenti | titolare unico, oppure almeno due utenti | tu |

- Accanto a ogni passo c'è un cerchio vuoto (da fare) o un segno di spunta verde (fatto). Sotto, una riga dice cosa manca, per esempio *Mancano: telefono, orario di check-out.*
- Il pulsante **Vai** porta alla pagina dove si fa il passo.
- I passi che non puoi fare tu hanno l'etichetta **Lo fa il fornitore** e non hanno il pulsante: chiedi al fornitore del programma.
- Lo stato si aggiorna da solo: non c'è niente da salvare in questa pagina.

Finché manca qualcosa, chi ha **Configurare l'hotel** vede sopra il planning un promemoria con il prossimo passo e il pulsante **Primo avvio**. Quando i passi sono tutti fatti il promemoria sparisce; la pagina resta, per controllare.

Il passo 9 (Utenti) è spiegato nel capitolo [Utenti, ruoli e sicurezza](/manuale/utenti-sicurezza).

## 1. Dati della struttura

Apri **Impostazioni › Struttura** ([Struttura](/impostazioni/struttura)).

In alto, nel riquadro **Gestiti dalla piattaforma**, vedi **Nome**, **Comune**, **Tipologia**, **Categoria (tassa di soggiorno)** e **Statistica ISTAT**. Non li puoi cambiare: decidono la tassa di soggiorno e gli adempimenti, quindi li gestisce il fornitore.

Compila poi:

1. **Dati fiscali**: **Ragione sociale**, **Partita IVA** (11 cifre), **Codice fiscale**, **PEC**. Compaiono nell'intestazione di ricevute e documenti.
2. **Indirizzo, contatti e orari**: **Indirizzo**, **CAP** (5 cifre), **Telefono**, **Email**, **Check-in dalle**, **Check-out entro le**.
3. **Giorni di validità di un'opzione**: la scadenza proposta per le nuove opzioni, da 0 a 60 giorni (0 = nessuna). Es. 3 giorni.
4. **Orario limite di arrivo**: per le prenotazioni senza garanzia, oltre quest'ora l'ospite non arrivato è un possibile no-show. Es. 20:00.
5. Premi **Salva**. Compare *Dati salvati.*

### Periodi di chiusura

Nella sezione **Periodi di chiusura** indichi i giorni in cui la struttura è chiusa: all'ISTAT si comunicano come chiusi, con camere e letti a zero. Scrivi **Dal**, **Al** (compresi), una **Nota** se vuoi, e premi **Aggiungi**. Per toglierne uno premi **Elimina** e conferma con **Sì, elimina**.

Esempio: chiusura invernale dal 07/01 al 28/02. Se la struttura è sempre aperta lascia l'elenco vuoto.

### Funzioni usate

In fondo alla pagina, nella sezione **Funzioni usate**, spegni quello che la struttura non usa: sparisce da menu e maschere e il lavoro resta più semplice. I dati già registrati restano e si riaccende in ogni momento.

- **Gruppi**: prenotazioni di gruppo con un nome comune (scuole, comitive, squadre).
- **Agenzie e allotment**: camere riservate alle agenzie, voucher, estratto conto con le commissioni.
- **Uso diurno**: camera usata solo di giorno, senza pernottamento.
- **Richieste e preventivi**: richieste di disponibilità e preventivi online con accettazione.

Basta togliere o mettere la spunta: la modifica vale subito e il menu si aggiorna. I moduli (ristorazione, pulizie, portineria…) invece li attiva il fornitore.

Esempio: un B&B di 4 camere che lavora solo con privati spegne **Gruppi**, **Agenzie e allotment** e **Uso diurno**.

## 2. Camere e tipi

Apri **Impostazioni › Camere** ([Camere](/camere/gestione)).

### Tipi camera

I prezzi dei listini sono **per tipo**, quindi parti dai tipi.

1. Nella sezione **Tipi camera** scrivi un **Codice** breve (es. `DBL`) e la **Descrizione** (es. `Doppia`).
2. Premi **+ Aggiungi**.

Nella tabella, per ogni tipo, puoi indicare (il valore si salva quando esci dal campo):

- **Letti agg.**: quanti letti aggiunti sono possibili oltre la capienza (da 0 a 5).
- **Animali**: spunta se gli animali sono ammessi.
- **Day use €/ora**: prezzo all'ora proposto per l'uso diurno.
- **Pulizia finale €**: si aggiunge da sola, una volta per soggiorno, a ogni nuova prenotazione di questo tipo.
- **Cauzione €**: deposito proposto, da restituire alla partenza.

### Camere

Nella sezione **Camere**, in fondo:

1. Scrivi il **Codice** (il numero della camera, es. `101`) e il **Piano** (es. `Piano 1`).
2. Scegli il **Tipo**.
3. Indica **Cap. adulti** e **Cap. bambini**.
4. Premi **+ Aggiungi camera**.

Esempio: un piccolo hotel con 3 doppie (101, 102, 103: 2 adulti, 1 bambino) e una tripla (201: 3 adulti).

Nell'elenco puoi:

- cambiare il **Tipo** di una camera dalla tendina (le prenotazioni già fatte non cambiano);
- premere **Attiva** per disattivarla (diventa **Disattivata**), e premere di nuovo per riattivarla. Solo le camere attive contano per il primo avvio;
- nella colonna **Arrivo autonomo** scrivere le **Istruzioni di arrivo** e il **Codice di accesso fisso** (porta, cassetta delle chiavi) per chi arriva da solo, poi **Salva**. Partono con l'email «Istruzioni di arrivo», che si invia dalla prenotazione.

### Fuori servizio

Per una camera in manutenzione usa la sezione **Fuori servizio / manutenzione**: nel periodo indicato non si può prenotare.

1. Scegli la **Camera**, le date **Dal** e **Al** e scrivi il **Motivo** (es. `rifacimento bagno`).
2. Premi **+ Segna fuori servizio**.

Se nel periodo ci sono già prenotazioni assegnate a quella camera, il programma rifiuta: *Ci sono prenotazioni già assegnate a questa camera nel periodo indicato: spostale prima di segnarla fuori servizio.* La data **Al** deve essere dopo **Dal**. Per togliere un fuori servizio premi **Rimuovi**.

## 3. Listini e tariffe

Apri **Impostazioni › Listini e tariffe** ([Listini e tariffe](/impostazioni/listini)). Ogni struttura nasce con il **Listino base**: è quello che conta per il primo avvio.

1. In alto scegli il listino dai pulsanti. Con **+ Nuovo listino** ne crei un altro (Codice, descrizione, spunta **per gruppi**, poi **Crea**), per esempio per le scuole.
2. Nella sezione **Regole del listino** premi **Modifica** e scegli **Prezzo a camera** o **Prezzo a persona**. Con il prezzo a persona puoi indicare il **Supplemento singola (doppia uso singola)** in € per notte o in % della quota.
3. Spunta le **Notti con il prezzo weekend** (la notte di venerdì è quella tra venerdì e sabato) e scegli la **Politica di cancellazione** del listino, oppure lascia quella predefinita dell'hotel. Premi **Salva**.
4. Nella parte **Trattamenti** premi **Modifica** e scrivi il supplemento **per persona per notte** di ogni trattamento; lascia vuoto se è compreso nel prezzo.
5. Per ogni tipo di camera, in fondo, aggiungi i **periodi**: **Dal**, **Al (compreso)**, prezzo per notte e, se vuoi, il prezzo **Weekend** (vuoto = come le altre notti). Premi **+ Aggiungi periodo**.

Esempio: Doppia, dal 01/04 al 30/06 a 90 € a notte, weekend 110 €; dal 01/07 al 31/08 a 120 €. Mezza pensione +20 € a persona: 2 adulti in doppia ad aprile, un martedì, pagano 90 + 20 + 20 = 130 € a notte.

Le altre parti della pagina:

- **Supplementi per stagione**: un supplemento del trattamento diverso in una stagione (es. mezza pensione +28 € dal 01/07 al 31/08), anche per un solo tipo di camera.
- **Riduzioni per età**: sconti per bambini in base all'età all'arrivo (**Da anni**, **A anni**, tipo **Percentuale**, **Importo € per notte**, **Gratis**, e nei listini a camera **Supplemento € per notte (letto aggiunto)**; spunta **solo dal 3° letto** se serve). Es. 3–11 anni −50% dal 3° letto.
- Sopra ogni tipo, un riquadro giallo elenca le date **senza tariffa nei prossimi 12 mesi**: le prenotazioni in quelle date restano con il prezzo da completare.
- **Completa le notti senza prezzo**: per le prenotazioni fatte quando la tariffa mancava, usa i prezzi attuali del listino.

I periodi dello stesso tipo non possono sovrapporsi: il programma lo dice, per esempio *Si sovrappone al periodo dal 01/07/2026 al 31/08/2026 (120.00 €).* Ogni modifica vale per le nuove prenotazioni: quelle già fatte conservano il prezzo concordato.

## 4. Trattamenti

Apri **Impostazioni › Trattamenti** ([Trattamenti](/impostazioni/trattamenti)). La struttura nasce con **B&B**, **Mezza pensione** e **Pensione completa**.

- Le spunte **colazione**, **pranzo** e **cena** dicono quali pasti comprende il trattamento: servono al foglio del giorno della ristorazione per contare i coperti.
- Le frecce **↑** e **↓** cambiano l'ordine in cui compaiono nella prenotazione.
- **Rinomina** cambia il nome; il pulsante **Attivo** lo disattiva (diventa **Disattivato**). Deve restare almeno un trattamento attivo.
- Per aggiungerne uno scrivi il nome (es. `Solo pernottamento`) e premi **+ Aggiungi**.

Se è attivo un solo trattamento, nella nuova prenotazione la scelta non compare e si usa quello. Rinominare o disattivare non cambia le prenotazioni già fatte. Il prezzo dei trattamenti si mette nei listini (vedi sopra).

## 5. Politiche di cancellazione

Apri **Impostazioni › Politiche di cancellazione** ([Politiche di cancellazione](/impostazioni/politiche)).

1. Premi **Da modello «Standard 48/24 ore»**, **Da modello «Non rimborsabile»** oppure **Nuova**.
2. Scrivi il **Nome**.
3. Compila gli scaglioni: **Se mancano almeno… ore all'arrivo**, la **Penale** (**Nessuna penale**, **Notti (le prime N)**, **% del soggiorno**, **Importo fisso (€)**) e il **Valore**. Con **Aggiungi uno scaglione** ne aggiungi altri.
4. Scegli la penale per **Mancato arrivo (no-show)**.
5. Controlla il riquadro **Come la leggerà il cliente** e premi **Salva**.

Esempio (modello Standard 48/24 ore): 48 ore → nessuna penale; 24 ore → 1 notte; 0 ore → 100%. Chi annulla 30 ore prima paga la prima notte; chi annulla la mattina dell'arrivo paga tutto.

La prima politica creata diventa la **predefinita** e vale per le nuove prenotazioni; con **Rendi predefinita** ne scegli un'altra. Un listino può avere la sua (vedi **Regole del listino**). L'arrivo si conta dall'orario di check-in; la base della penale è il soggiorno senza la tassa di soggiorno. All'annullamento il programma propone la penale, che resta sempre modificabile. Modificare o eliminare una politica non cambia le prenotazioni già fatte.

## 6. Reparti e IVA

Apri **Impostazioni › Reparti e IVA** ([Reparti e IVA](/impostazioni/reparti)). I prezzi si scrivono sempre IVA inclusa.

- **Camere e trattamenti**: l'**IVA (%)** di camere, pensione o mezza pensione, uso diurno e servizi senza aliquota propria. Premi **Salva**.
- **Reparti**: chi segna i consumi sul conto (Bar, Ristorante, Frigobar, Lavanderia, Garage, Telefono, Esborsi). Con **Nuovo reparto** o **Modifica** indichi **Nome**, **IVA (%)** (vuoto = fuori campo IVA), **Esborso (spese anticipate)** e **Attivo**.
- **Articoli (…)**: per i reparti normali, articoli a prezzo fisso da segnare con un tocco (es. acqua del frigobar 2,00 €). Con **Nuovo articolo** indichi **Articolo** e **Prezzo (€, IVA inclusa)**.

Esempio: Bar al 10%, due caffè a 1,50 € = 3,00 € in conto, imponibile 2,73 € e IVA 0,27 €.

> Le aliquote di partenza sono indicative: il programma stesso chiede di verificarle con il commercialista.

## 7. Email e modelli

Apri **Impostazioni › Email e modelli** ([Email e modelli](/impostazioni/email)). Le email agli ospiti partono dalla casella dell'hotel.

1. In **Server di posta in uscita (SMTP)** scrivi **Server**, **Porta**, **Sicurezza** (SSL/TLS di solito 465, STARTTLS di solito 587), **Utente**, **Password**, **Nome del mittente**, **Indirizzo del mittente** e, se vuoi, **Risposte a**. Sono gli stessi dati del programma di posta o dello smartphone.
2. Premi **Salva**.
3. In **Email di prova** scrivi un indirizzo nel campo **A** e premi **Invia la prova**. Il passo del primo avvio è fatto solo quando la prova è **riuscita**.
4. In **Bonifici degli acconti** scrivi l'**IBAN dell'hotel** e premi **Salva**: compare nelle email di richiesta di acconto.
5. In **Modelli delle email** scegli il modello (Conferma della prenotazione, Richiesta di acconto, Promemoria, Ringraziamento, Preventivo, Istruzioni di arrivo, Email libera) e la lingua (Italiano o English). Modifica **Oggetto** e **Testo** e premi **Salva il modello**. I segnaposto tra `{{ }}` si riempiono da soli: «Gentile {{nome}} {{cognome}}» diventa «Gentile Mario Rossi». Con **Testo di partenza** torni al testo originale.

La password si salva cifrata: quando modifichi altri dati puoi lasciarla vuota. Se la prova non riesce, il messaggio dice il motivo: controlla server, porta e password.

## 8. Adempimenti (Polizia, ISTAT)

Apri **Impostazioni › Adempimenti (Polizia, ISTAT)** ([Adempimenti](/impostazioni/adempimenti)). Si fa una volta sola, e di nuovo quando cambiano le password dei portali. Le password si salvano cifrate e non vengono mai mostrate.

### Alloggiati Web (Polizia di Stato)

1. Entra nel portale Alloggiati Web con le credenziali della struttura e, dal menu utente, genera la **Chiave Web Service**.
2. In HotelWeb scrivi **Utente**, **Password** e **Chiave Web Service**.
3. Premi **Salva e prova l'accesso**. Se va bene compare *Credenziali salvate: la Polizia ha accettato l'accesso.* e la scritta **Accesso verificato il…**.

Se la prova non riesce le credenziali restano salvate: correggile e riprova (anche con **Prova di nuovo l'accesso**). Ogni volta che cambi la password del portale la chiave va rigenerata e reinserita qui.

### ISTAT movimento turistico

Il sistema della regione (Ross1000 o SPOT Puglia) lo attiva il fornitore. Finché non è attivo vedi un avviso che lo dice. Quando è attivo:

- **SPOT**: indica il **Primo giorno da comunicare** e premi **Salva**.
- **Ross1000**: indica il **Primo giorno da comunicare**, il **Codice struttura**, la **Regione (servizio web)**, l'**Utente di trasmissione** e la **Password di trasmissione**, poi **Salva**. La prova vera è il primo invio dalla pagina ISTAT.

Il primo giorno è il primo che comunicherà HotelWeb: i giorni precedenti restano quelli già inviati con il vecchio programma o a mano.

## Da sapere

- Puoi fare i passi in un altro ordine, ma i prezzi richiedono prima i tipi di camera.
- Regolamento della tassa di soggiorno, nome, comune, tipologia, categoria e sistema ISTAT li gestisce il fornitore.
- Il programma spiega cosa fa con Polizia, ISTAT e IVA, ma non sostituisce il consulente: per le regole fiscali e normative rivolgiti al commercialista o agli uffici competenti.

## Problemi frequenti

- **Il passo "Listino e prezzi" resta da fare.** Manca un periodo da oggi in poi nel **Listino base** per uno dei tipi con camere attive: la riga del passo dice quali.
- **Il passo "Casella email dell'hotel" resta da fare.** La configurazione è salvata ma la prova non è riuscita o non è stata fatta: premi **Invia la prova**.
- **Il passo "Alloggiati Web" dice "Credenziali inserite ma non ancora provate".** Premi **Prova di nuovo l'accesso** e leggi il messaggio.
