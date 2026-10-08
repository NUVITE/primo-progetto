---
titolo: Case vacanze e appartamenti
ordine: 60
permessi: camere.gestisci, prenotazioni.gestisci, pagamenti.registra
moduli:
fornitore: no
---

Alcune funzioni sono nate per case vacanze, residence e appartamenti: la pulizia finale, la cauzione e l'arrivo autonomo con il codice per entrare. Le può usare qualsiasi struttura: un albergo può chiedere una cauzione per una suite, un B&B può mandare il codice della cassetta delle chiavi a chi arriva tardi.

In questo capitolo scriviamo "camera". Se la tua struttura affitta appartamenti, sullo schermo leggi "appartamento".

## Tipologia della struttura e nomi delle unità

La **tipologia** dice al programma che tipo di struttura sei. La imposta il fornitore del programma; tu la vedi in **Impostazioni › Struttura**, nel riquadro *Gestiti dalla piattaforma*. Per cambiarla rivolgiti al fornitore.

La tipologia decide come si chiamano le unità che affitti:

| Tipologia | Il programma dice |
|---|---|
| Albergo / hotel | camere |
| B&B (bed and breakfast) | camere |
| Affittacamere | camere |
| Casa per ferie | camere |
| Agriturismo | camere |
| Residenza turistico-alberghiera | appartamenti |
| Case e appartamenti per vacanze | appartamenti |
| Residence | appartamenti |

Così in una casa vacanze il menu mostra **Ricevimento › Planning appartamenti** e **Impostazioni › Appartamenti**, e chi pulisce trova **Piani e manutenzioni › I miei appartamenti**. Anche la pagina degli appartamenti parla di *Tipi appartamento* e *+ Aggiungi appartamento*. Alcune scritte in altre pagine (per esempio *Aggiungi una camera* nel dettaglio della prenotazione) restano uguali per tutti.

> La tipologia adatta il programma alla struttura. Non certifica la classificazione: quella resta quella autorizzata dal comune.

Quando il fornitore crea la struttura, applica anche il **profilo di partenza** della tipologia. Per le case e appartamenti per vacanze il profilo prevede: un solo titolare che fa tutto, il modulo Pulizie e riassetto, il trattamento *Solo pernottamento*, le funzioni *Gruppi* e *Uso diurno* spente. È solo un punto di partenza: si cambia tutto, voce per voce.

## Funzioni che puoi spegnere

Quello che non usi si spegne, così il lavoro di tutti i giorni resta più semplice. Apri **Impostazioni › Struttura** ([Struttura](/impostazioni/struttura)) e cerca il riquadro **Funzioni usate**. Serve il permesso **Configurare l'hotel**.

Le funzioni sono quattro:

- **Gruppi**: prenotazioni di gruppo con un nome comune (scuole, comitive, squadre).
- **Agenzie e allotment**: camere riservate alle agenzie, voucher, estratto conto con le commissioni.
- **Uso diurno**: camera usata solo di giorno, senza pernottamento.
- **Richieste e preventivi**: richieste di disponibilità e preventivi online con accettazione.

Togli la spunta per spegnere una funzione: compare il messaggio *"Uso diurno: spenta."* e la voce sparisce dal menu e dalle maschere. I dati già registrati restano. Rimetti la spunta e la funzione torna come prima.

> Trattamenti e listini non hanno un interruttore: se ne hai attivo uno solo, nella nuova prenotazione la scelta non compare e si usa quello. I moduli (ristorazione, pulizie, portineria…) li attiva il fornitore del programma.

## Pulizia finale

Molte case vacanze fanno pagare una pulizia finale fissa per ogni soggiorno. Il programma la aggiunge da sola alle nuove prenotazioni.

Chi può impostarla: chi ha il permesso **Gestire camere**.

### Impostare il prezzo

1. Apri **Impostazioni › Camere** (o **Impostazioni › Appartamenti**): [Camere](/camere/gestione).
2. Nella tabella **Tipi camera** (nelle case vacanze **Tipi appartamento**) trova la colonna **Pulizia finale €**.
3. Scrivi il prezzo nella riga del tipo, per esempio `50` per il bilocale e `70` per il trilocale.
4. Esci dal campo (clic altrove o tasto Tab): il valore si salva da solo.

Lascia il campo vuoto (o scrivi 0) se quel tipo non ha pulizia finale.

### Cosa succede nelle prenotazioni

- A ogni **nuova prenotazione** il programma aggiunge il servizio **Pulizia finale**, una volta per ogni camera il cui tipo ha il prezzo. Vale sia per la prenotazione completa sia per quella veloce dal planning, e anche quando aggiungi una camera a una prenotazione che c'è già.
- Il servizio compare nei **Servizi aggiuntivi** della prenotazione, con la nota *"Aggiunta in automatico dal tipo di camera"*. Puoi modificarlo o eliminarlo come gli altri servizi (per esempio se fai uno sconto a un ospite affezionato).
- Mentre compili la nuova prenotazione vedi già l'importo: accanto al prezzo della camera compare *"+ pulizia finale € 50.00"* e nel riepilogo c'è la riga **Pulizia finale**.
- Il **cambio camera** non aggiunge una seconda pulizia: resta quella della prima camera.
- Se la stessa camera ha già una pulizia finale, il programma non la duplica.

> Il prezzo cambiato in Impostazioni vale per le prenotazioni nuove. Quelle già fatte tengono la pulizia che avevano.

*Esempio*: bilocale a 90 € a notte per 4 notti, pulizia finale 50 €. Il soggiorno costa 360 € + 50 € = 410 €.

### Nei preventivi

Nei preventivi la pulizia finale si mostra **a parte**, una per camera. Nella pagina della richiesta leggi *"Più pulizia finale € 50,00, mostrata a parte all'ospite"*; l'ospite, nella pagina del preventivo, vede *"più pulizia finale"* accanto al prezzo. Quando l'ospite accetta, la prenotazione che nasce aggiunge la pulizia da sola.

## Cauzione

La cauzione è un **deposito** che l'ospite lascia all'arrivo e che gli restituisci alla partenza. Non è un pagamento del conto: sta fuori dal conto e dal giornale d'albergo.

Chi può usarla: chi ha il permesso **Registrare pagamenti**. Il prezzo proposto per tipo lo imposta chi ha **Gestire camere**.

### Impostare la cauzione proposta

1. Apri **Impostazioni › Camere** ([Camere](/camere/gestione)).
2. Nella tabella **Tipi camera** (nelle case vacanze **Tipi appartamento**) scrivi l'importo nella colonna **Cauzione €**, per esempio `200`.
3. Esci dal campo: si salva da solo.

Nella prenotazione il programma propone la somma delle cauzioni dei tipi delle sue camere (le camere annullate non contano). Due appartamenti con cauzione 200 € ciascuno: si propongono 400 €.

Il riquadro **Cauzione** compare nella prenotazione solo se c'è una cauzione proposta o se ne hai già incassata una.

### Incassare la cauzione

1. Apri la prenotazione e cerca il riquadro **Cauzione**. Leggi *"Da chiedere: 200,00 €"*.
2. Premi **Incassa la cauzione**.
3. Controlla l'**Importo (€)** (puoi cambiarlo) e scegli il **Metodo**: Contanti, Carta di credito, Bancomat, Bonifico, Assegno o Altro. Della carta non si salva nessun dato.
4. Premi **Registra l'incasso**.

Il riquadro mostra quanto hai incassato, con che metodo, il giorno e chi l'ha registrato, e l'etichetta **Da restituire alla partenza**. Anche la pagina di check-in della camera ricorda: *"Cauzione di 200,00 € da restituire prima della partenza"*.

### Restituire la cauzione

1. Nel riquadro **Cauzione** premi **Restituisci**.
2. Nel campo **Trattenuta (€)** lascia `0` se restituisci tutto.
3. In **Si restituisce con** scegli il metodo (il programma propone quello dell'incasso).
4. Se trattieni qualcosa, scrivi l'importo e il **Motivo della trattenuta** (es. *lenzuolo macchiato, telecomando mancante*). Sotto leggi quanto restituisci.
5. Premi **Registra la restituzione**.

Il riquadro diventa **Restituita**, con la data, chi l'ha registrata e l'importo.

### La trattenuta per danni

Se trattieni una parte, il programma fa tutto in un'unica operazione:

- aggiunge al conto un addebito **Risarcimento danni**, fuori campo IVA, con il motivo come nota. Il reparto *Risarcimento danni (cauzione)* si crea da solo la prima volta;
- registra un pagamento di pari importo, con la nota *"Trattenuta dalla cauzione"*.

Il conto resta in pari: il danno è addebitato e già pagato con la cauzione.

*Esempio*: cauzione di 200 € in contanti, telecomando rotto da 30 €. Trattenuta 30 €, motivo "telecomando rotto". All'ospite restituisci 170 € in contanti; sul conto compaiono l'addebito Risarcimento danni di 30 € e il pagamento di 30 €.

> Il programma tratta la trattenuta come risarcimento fuori campo IVA. Il trattamento fiscale corretto va confermato con il tuo commercialista.

### Nella cassa del giorno

In **Ricevimento › Cassa e chiusura del giorno** ([Cassa](/cassa)) le cauzioni hanno un riquadro tutto loro, **Cauzioni**: *cauzione incassata* (in più), *cauzione restituita* e *trattenuta passata al conto* (in meno). La trattenuta passa dalle cauzioni agli incassi. In fondo leggi il **Saldo delle cauzioni in contanti**, che conta nei contanti attesi alla chiusura.

### Messaggi frequenti

- *"La cassa del 12/08/2026 è già chiusa: riaprila dalla pagina Cassa o usa un'altra data."*: la giornata è chiusa; incasso e restituzione si registrano sempre con la data di oggi.
- *"Scrivi il motivo della trattenuta (es. danno, oggetto mancante)."*: hai indicato una trattenuta senza motivo.
- *"La trattenuta non può superare la cauzione."*
- *"La cauzione di questa prenotazione è già registrata."*: ogni prenotazione ha una sola cauzione.

## Arrivo autonomo

Con l'arrivo autonomo (self check-in) l'ospite entra da solo: riceve per email le istruzioni e il codice per aprire la porta o la cassetta delle chiavi.

### Istruzioni e codice di ogni camera

Serve il permesso **Gestire camere**.

1. Apri **Impostazioni › Camere** ([Camere](/camere/gestione)) e scendi alla tabella **Camere**.
2. Nella colonna **Arrivo autonomo** premi **Aggiungi** sulla riga della camera.
3. In **Istruzioni di arrivo** scrivi come arrivare ed entrare. Esempio: *"Il portone è in via Roma 12. La cassetta delle chiavi è a destra del citofono: apri con il codice e prendi le chiavi dell'appartamento, 2° piano."*
4. In **Codice di accesso fisso** scrivi il codice della porta o della cassetta, per esempio `4821`.
5. Premi **Salva**.

Il pulsante della colonna ora dice *Istruzioni e codice* (oppure solo *Istruzioni* o *codice*): premilo per modificare. Le istruzioni arrivano a 5000 caratteri; il codice va su una riga sola, al massimo 40 caratteri.

### Il riquadro nella prenotazione

Se una camera della prenotazione ha istruzioni o codice, nella prenotazione compare il riquadro **Arrivo autonomo**. Lo vede chi ha il permesso **Gestire prenotazioni**. Per ogni camera mostra:

- il codice valido, con *(fisso)* se è quello della camera o *(di questo soggiorno)* se ne hai dato uno apposta;
- l'etichetta *senza istruzioni* se la camera ha il codice ma non le istruzioni;
- in fondo, *Istruzioni inviate* con data, indirizzo e chi le ha mandate, oppure *Istruzioni non ancora inviate*.

### Un codice per un solo soggiorno

Alcune serrature generano un codice diverso per ogni ospite.

1. Nel riquadro **Arrivo autonomo** premi **Codice per questo soggiorno** sulla camera.
2. Scrivi il codice e premi **Salva**.

Il nuovo codice sostituisce quello fisso solo per questa prenotazione. Per cambiarlo premi **Cambia**; per tornare a quello della camera premi **Torna al codice fisso**.

### Inviare le istruzioni

L'email **Istruzioni di arrivo** non parte da sola: la mandi tu. Servono i permessi **Gestire prenotazioni** e **Inviare email agli ospiti**, e la casella email dell'hotel configurata.

1. Nel riquadro **Arrivo autonomo** premi **Invia le istruzioni** (dopo il primo invio diventa **Invia di nuovo le istruzioni**).
2. Si apre il riquadro delle email con il modello *Istruzioni di arrivo* già scelto: istruzioni, codice, date e orari sono già nel testo.
3. Controlla il destinatario e la lingua, poi premi **Invia**.

Se la prenotazione ha più camere, l'email elenca istruzioni e codici con il nome di ognuna (es. *Appartamento 3: 4821*). Se mancano dei dati compare *"Mancano dei dati"*: completali nel testo prima di inviare. Il testo del modello si adatta in **Impostazioni › Email e modelli**. Come funzionano le email lo trovi nel capitolo [Comunicazioni](/manuale/comunicazioni).

> Il testo di questa email contiene il codice di accesso: nello storico delle email lo vede solo chi ha **Gestire prenotazioni**.

### Il promemoria

Pochi giorni prima dell'arrivo il programma ti ricorda le istruzioni non ancora partite. Conta le prenotazioni che arrivano da oggi ai prossimi **3 giorni** in una camera con istruzioni o codice, senza email *Istruzioni di arrivo* già inviata.

- In cima alle pagine compare l'avviso *"2 arrivi autonomi senza istruzioni inviate"* con il collegamento **Vedi gli arrivi**.
- Nel **Cruscotto** c'è il riquadro **Istruzioni di arrivo**.
- La pagina **Istruzioni di arrivo da inviare** ([apri](/prenotazioni/istruzioni-arrivo)) elenca arrivo, numero della prenotazione, ospite e camere. Un arrivo di oggi ha l'etichetta *oggi*; un ospite senza indirizzo ha l'etichetta *senza email*. Premi **Apri la prenotazione** per inviare.

L'avviso lo vede chi ha sia **Gestire prenotazioni** sia **Inviare email agli ospiti**.

## Da sapere

- Prezzo della pulizia finale e cauzione proposta sono **per tipo** di camera; istruzioni e codice fisso sono **per camera**.
- La pulizia finale è un normale servizio aggiuntivo: si modifica o si elimina dalla prenotazione.
- La cauzione non entra nel conto né nel giornale d'albergo; entra solo nella cassa del giorno, a parte.
- Il promemoria guarda solo l'arrivo vero (la prima camera), non i cambi camera. L'uso diurno non conta.
- Le funzioni spente nascondono menu e maschere, ma non cancellano nulla.

## Problemi frequenti

- **Non vedo il riquadro Cauzione.** Il tipo della camera non ha una cauzione in **Cauzione €**, oppure non hai il permesso **Registrare pagamenti**.
- **Non vedo il riquadro Arrivo autonomo.** Nessuna camera della prenotazione ha istruzioni o codice, la camera non è ancora assegnata, oppure non hai **Gestire prenotazioni**.
- **Manca il pulsante Invia le istruzioni.** La casella email dell'hotel non è configurata (**Impostazioni › Email e modelli**) o non hai **Inviare email agli ospiti**.
- **La pulizia finale non compare in una prenotazione vecchia.** Si aggiunge solo alle prenotazioni create dopo aver impostato il prezzo. Aggiungila a mano nei **Servizi aggiuntivi**.
