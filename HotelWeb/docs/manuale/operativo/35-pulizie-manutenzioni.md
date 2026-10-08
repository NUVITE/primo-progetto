---
titolo: Pulizie e manutenzioni
ordine: 35
permessi: pulizie.vedi, pulizie.mie, pulizie.gestisci, pulizie.oggetti, manutenzioni.segnala
moduli:
fornitore: no
---

Questo capitolo è per chi lavora ai piani: governante, cameriere, manutentori e reception. Spiega lo stato delle camere, il foglio di lavoro del giorno, le richieste degli ospiti, gli oggetti smarriti e i guasti.

Le pagine stanno nel gruppo **Piani e manutenzioni** del menu. Ci sono solo se per la tua struttura è acceso il modulo **Pulizie e riassetto** (stato camere, foglio dei piani, le mie camere, richieste, oggetti smarriti) o il modulo **Manutenzioni** (guasti). I moduli li accende il fornitore del programma: se una voce non c'è, chiedi a lui.

> Nelle case vacanze il programma dice "appartamenti" al posto di "camere": per esempio la voce di menu diventa **Stato appartamenti**. Il funzionamento è lo stesso.

## Gli stati di pulizia

Ogni camera ha uno di questi stati, con un pallino colorato:

| Stato | Colore | Cosa vuol dire |
|---|---|---|
| Da pulire | rosso | Dopo una partenza: pulizia completa |
| Da rifare | ambra | Camera occupata (fermata): riassetto del giorno |
| In pulizia | blu | La cameriera ci sta lavorando |
| Da controllare | viola | Pulita, aspetta il controllo della governante |
| Pronta | verde | Pulita e controllata |

Il programma cambia alcuni stati da solo:

- al **check-out**, se nella camera non resta nessuno, la camera diventa **Da pulire**;
- ogni mattina le camere occupate che restano (le "fermate") tornano **Da rifare**: il riassetto è di ogni giorno;
- quando un guasto che teneva la camera fuori servizio è risolto, la camera passa **Da pulire**.

## Stato camere

Apri **Piani e manutenzioni › Stato camere** ([Stato camere](/pulizie)). Serve il permesso **Vedere lo stato delle camere**. Per cambiare gli stati serve **Gestire le pulizie** (di solito la governante e la reception).

Le camere sono divise per piano. Su ogni camera vedi numero, tipo, stato, occupazione di oggi (Libera, In arrivo, Occupata, In partenza, Partiti oggi) e il nome dell'ospite. In cima trovi il conteggio per stato e tre filtri: **Tutte**, **Da fare**, **Arrivi di oggi**.

Il programma ti avvisa:

- se ci sono **arrivi di oggi in camere non ancora pronte** (vanno fatte per prime);
- se una camera è **fuori servizio**;
- se ci sono **guasti aperti**: tocca la scritta "1 guasto aperto" per vederli.

### Cambiare lo stato di una camera

Sotto ogni camera compaiono i pulsanti dell'azione giusta:

1. Camera **Da pulire** o **Da rifare**: premi **Inizia** quando entri, oppure **Finita** se l'hai già fatta.
2. Camera **In pulizia**: premi **Finita** (o **Finita (da controllare)** se c'è il controllo della governante).
3. Camera **Da controllare**: la governante preme **Controllata: pronta** oppure **Da rifare** se non va bene.

Per scegliere uno stato qualsiasi premi **Cambia…** e poi lo stato che vuoi. Sotto la camera resta scritto chi ha fatto l'ultimo cambio e quando.

### Non disturbare

Sulle camere occupate c'è il pulsante **Non disturbare**: la camera prende l'etichetta rossa "non disturbare". Vale solo per oggi: domani sparisce da sola. Per toglierla prima premi **Togli non disturbare**.

### Il rapporto della governante

Premi **Rapporto governante**. Su ogni camera scegli se l'hai trovata **occupata** o **libera** e, se serve, scrivi una nota (es. "letto non usato"). Se quello che hai trovato non coincide con la reception compare una **discrepanza**, per esempio:

- *Risulta occupata ma la camera è libera: l'ospite è forse partito senza check-out?*
- *Risulta libera ma la camera è occupata: c'è qualcuno non registrato o un check-out fatto per sbaglio?*

Le discrepanze compaiono in rosso in cima alla pagina, con il collegamento **apri la prenotazione**.

### Impostazioni delle pulizie

In fondo alla pagina, chi ha il permesso **Configurare l'hotel** trova la sezione **Impostazioni**:

- **Controllo della governante prima che la camera sia pronta**: con la spunta, dopo **Finita** la camera passa "Da controllare"; senza, diventa subito "Pronta" (comodo nelle strutture piccole).
- **Biancheria delle camere fermate**: **Lenzuola ogni** N notti, **Asciugamani ogni** N notti (vuoto = su richiesta dell'ospite), **Couverture serale**. Premi **Salva**. Si scrive un numero da 1 a 14. In partenza si cambia sempre tutto.

Esempio: lenzuola ogni 3 notti e asciugamani vuoto. Un ospite arriva lunedì: giovedì mattina (terza notte) il foglio dice "cambio lenzuola, asciugamani su richiesta".

## Foglio dei piani

Apri **Piani e manutenzioni › Foglio dei piani** ([Foglio dei piani](/pulizie/foglio)). Serve il permesso **Gestire le pulizie**: è la pagina della governante.

Qui ci sono le camere da fare oggi, in questo ordine: prima quelle con un **arrivo**, poi le **partenze** (pulizia completa), poi le **fermate** (riassetto). Per ogni camera leggi:

- il lavoro: **Partenza: pulizia completa** oppure **Fermata: riassetto**;
- l'arrivo di oggi, con l'ora prevista e le persone (es. "Arrivo oggi verso le 15:00 · 2 ad., 1 bamb.");
- la biancheria: "cambio completo" in partenza; nelle fermate per esempio "cambio lenzuola, asciugamani su richiesta";
- "couverture stasera", se la couverture è accesa.

### Dividere le camere fra le cameriere

Le cameriere sono gli utenti con il permesso **Pulire le proprie camere** (ruolo Cameriera ai piani). Se non ce n'è nessuna, la pagina te lo segnala.

1. Nella sezione **Cameriere di oggi** togli la spunta a chi oggi non c'è.
2. Premi **Proponi divisione**. Il programma divide le camere per piano, con un carico pari: una partenza vale il doppio di un riassetto.
3. Se vuoi, sposta una camera con il menu a tendina accanto (scegli un nome o **Non assegnata**).

Esempio: 8 partenze e 6 fermate con 2 cameriere fanno 11 "punti" di lavoro, 5,5 a testa, ognuna su piani vicini. Le camere già fatte restano a chi le ha fatte.

Accanto a ogni nome vedi quante camere ha, il carico e quante ne ha già fatte. Con **Stampa** stampi il foglio: ogni cameriera ha la sua pagina. **Aggiorna** ricarica i dati.

Quando una camera ha un esito ("fatta", "non disturbare", "riassetto rifiutato") compare il pulsante **Riapri**, per rimetterla da fare.

## Le mie camere (per la cameriera)

Apri **Piani e manutenzioni › Le mie camere** ([Le mie camere](/pulizie/mie)). Serve il permesso **Pulire le proprie camere**. La pagina è pensata per il **telefono**: la usi mentre giri per i piani.

Vedi solo le camere che la governante ti ha assegnato oggi, nell'ordine in cui farle. Le camere con un arrivo hanno il bordo rosso. Se non hai camere compare *Oggi non hai camere assegnate.*

1. Quando entri in camera tocca **Inizia**.
2. Quando esci tocca **Finita**. Se c'è il controllo della governante, la camera aspetta il suo controllo.

Nelle camere fermate trovi anche:

- **Non disturbare**: c'è il cartello sulla porta. Puoi scrivere una nota (es. "cartello sulla porta alle 11") e toccare **Conferma**.
- **Riassetto rifiutato**: l'ospite non vuole il riassetto. Anche qui una nota facoltativa e **Conferma**.

Altri pulsanti, sotto ogni camera:

- **Frigobar**: segna con **+** e **−** cosa è stato consumato, poi **Segna sul conto**. Gli articoli finiscono subito sul conto della camera. Il pulsante c'è solo se la struttura ha gli articoli del frigobar (si impostano in **Impostazioni › Reparti e IVA**). Se nessuno è stato in camera da ieri a oggi compare *Nessun ospite in questa camera da ieri a oggi: avvisa la reception.*
- **Oggetto dimenticato**: descrivi cosa hai trovato e tocca **Registra**. Poi consegnalo alla governante.
- **Segnala un guasto**: scrivi cosa non va, metti la spunta **Urgente: la camera non si può usare** se serve, tocca **Invia**.

Le camere chiuse scendono in fondo; con **Riapri** le rimetti da fare.

## Richieste degli ospiti

Apri **Piani e manutenzioni › Richieste degli ospiti** ([Richieste degli ospiti](/richieste)). Serve il permesso **Vedere lo stato delle camere**.

Gli ospiti chiedono dal QR del cartoncino che ricevono al check-in: asciugamani in più, cuscino, coperta, culla o lettino, prodotti da bagno, sveglia o altro. La pagina si aggiorna da sola ogni 30 secondi: tienila aperta sul tablet della governante o della reception. Le richieste arrivate dal QR hanno l'etichetta **QR**.

Per una richiesta ricevuta a voce o al telefono:

1. Premi **Nuova richiesta**.
2. Scegli la **Camera** e **Cosa**. Per la sveglia indica anche **Alle** (giorno e ora). Aggiungi i **Dettagli** se servono.
3. Premi **Registra**.

Quando hai portato quello che serviva premi **Fatta**: l'ospite lo vede sul suo telefono. Per annullare premi la **X**, scrivi il **Motivo** e premi **Annulla**. Con **Chiuse** vedi le richieste chiuse negli ultimi 7 giorni.

## Oggetti smarriti

Apri **Piani e manutenzioni › Oggetti smarriti** ([Oggetti smarriti](/oggetti-smarriti)). Serve il permesso **Oggetti smarriti**.

1. Premi **Oggetto trovato**.
2. Compila **Trovato il**, **Camera** (oppure **Zona comune** e scrivi **Dove**, es. hall, piscina), **Conservato in** (es. cassaforte della reception) e **Oggetto**.
3. Premi **Registra**.

Esempio: "Caricabatterie bianco con cavo USB-C", camera 12, conservato nell'armadio della governante. Descrivi l'oggetto in modo da riconoscerlo, senza aprire borse o portafogli se non per cercare un nome.

Se l'oggetto è stato trovato in una camera, il programma propone il **probabile proprietario**: chi ha lasciato la camera quel giorno o il giorno prima, con telefono ed email. Alla consegna premi **Restituito**, scrivi a chi e premi **Conferma**. Se non lo cerca nessuno premi **Smaltito** e scrivi come (es. donato, buttato).

Dopo un certo numero di mesi in deposito l'oggetto prende l'etichetta **da smaltire**. I mesi li decide chi ha il permesso **Configurare l'hotel**, in fondo alla pagina (da 1 a 36).

> Per gli oggetti di cui non si trova il proprietario possono valere regole di legge (ad esempio la consegna al Comune): verificale con il consulente prima di smaltire oggetti di valore.

## Manutenzioni

Apri **Piani e manutenzioni › Manutenzioni** ([Manutenzioni](/manutenzioni)). Con il permesso **Segnalare guasti** segnali e vedi i guasti; con **Gestire le manutenzioni** (il manutentore) li prendi in carico e li chiudi. La pagina funziona bene anche da telefono.

### Segnalare un guasto

1. Premi **Segnala un guasto**.
2. Scegli la **Camera**, oppure lascia **Zona comune** e scrivi la **Zona** (es. ascensore, sala colazioni, giardino).
3. In **Cosa non va** descrivi il guasto in modo che il manutentore porti l'attrezzo giusto.
4. Metti la spunta **Urgente (la camera o la zona non si può usare)** se serve.
5. Premi **Invia**.

Esempio: "Camera 21: il rubinetto della doccia perde, il piatto doccia si allaga." Anche gli ospiti possono segnalare un guasto dal QR del cartoncino: quelle segnalazioni hanno l'etichetta **dall'ospite**.

### Prendere in carico e risolvere

Per il manutentore:

1. Premi **Prendo io**: la segnalazione passa **In lavorazione** a tuo nome. Se i manutentori sono più di uno puoi assegnarla a un collega con il menu a tendina.
2. Quando hai finito premi **Risolta**, scrivi **Cosa hai fatto** e premi **Conferma**.
3. Se la segnalazione è sbagliata o doppia premi **Annulla**, scrivi **Perché si annulla** e premi **Conferma**.

I filtri in alto: **Aperte**, **Assegnate a me** (solo per chi gestisce le manutenzioni), **Chiuse**. Con **Storico di una camera…** vedi tutti i guasti di una camera.

### Mettere una camera fuori servizio

Se un guasto **urgente** in camera la rende inutilizzabile, la reception può toglierla dalla vendita. Serve il permesso **Gestire prenotazioni** o **Gestire camere**.

1. Sulla segnalazione premi **Metti fuori servizio**.
2. Scegli **Fuori servizio da oggi fino al (escluso)**.
3. Premi **Conferma**.

Quando il guasto è segnato **Risolta** (o annullato) la camera torna disponibile da sola da oggi, e dopo la risoluzione passa **Da pulire**.

## Da sapere

- Lo stato di pulizia compare anche nel planning e al check-in: se la camera non è pronta il programma lo segnala, ma non blocca il check-in.
- Il cartoncino con il QR per gli ospiti si stampa dalla pagina di check-in della camera, con il pulsante **Cartoncino servizi in camera**. Sul cartoncino compaiono le richieste se è acceso il modulo Pulizie, i guasti se è acceso il modulo Manutenzioni.

## Problemi frequenti

- *Questa camera non è tra le tue di oggi.*: la governante l'ha assegnata a un'altra persona. Premi **Aggiorna**.
- *Mettere una camera fuori servizio spetta alla reception.*: non hai i permessi per farlo; avvisa la reception.
- *Ci sono prenotazioni già assegnate a questa camera nel periodo indicato: spostale prima di segnarla fuori servizio.*: la reception deve prima spostare quelle prenotazioni su un'altra camera.
- *La camera è già fuori servizio per questo guasto.*: il fuori servizio c'è già; finisce da solo quando il guasto è risolto.
