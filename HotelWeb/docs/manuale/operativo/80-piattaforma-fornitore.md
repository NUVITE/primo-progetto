---
titolo: Piattaforma (per il fornitore)
ordine: 80
permessi:
moduli:
fornitore: si
---

Questo capitolo è per chi gestisce la piattaforma: il fornitore del programma, che crea le strutture, accende i moduli, inserisce i regolamenti della tassa di soggiorno e tiene d'occhio i backup. Il programma lo chiama **gestore della piattaforma** o **superadmin**.

Il gruppo di menu **Piattaforma** compare solo ai superadmin. Le strutture non lo vedono. I dettagli del server (installazione, backup, aggiornamenti) sono nel **Manuale tecnico**, che trovi nello stesso menu.

## Piattaforma › Hotel: l'elenco delle strutture

Apri **Piattaforma › Hotel** ([Hotel](/piattaforma/hotel)). In alto c'è il riquadro dei backup (vedi più avanti); sotto, la tabella di tutte le strutture:

| Colonna | Cosa mostra |
|---|---|
| Hotel | il nome: cliccalo per aprire il dettaglio |
| Comune, Tipologia, Categoria | dove si trova, che struttura è, la categoria per la tassa di soggiorno |
| Camere, Utenti | quante camere e quanti utenti (i superadmin non contano) |
| Moduli e funzioni | i moduli accesi (*Solo base* se nessuno) e, sotto, le funzioni che la struttura ha spento |
| Avvio | *Pronta* in verde, oppure *Da completare 5/9* in ambra; in rosso *1 passo tocca a te* se manca qualcosa che devi fare tu |
| Stato | *Attivo* o *Disattivato* |

Guarda spesso la colonna **Avvio**: la scritta rossa ti dice che una struttura sta aspettando te.

## Creare un nuovo hotel

1. In **Piattaforma › Hotel** premi **+ Nuovo hotel**.
2. Nel riquadro **Struttura** compila **Nome dell'hotel** e **Comune** (obbligatori). Se il comune non c'è, premi **+ Nuovo** e scrivi nome, provincia (due lettere, es. `PE`) e codice ISTAT a 6 cifre, poi **Aggiungi comune**.
3. Scegli la **Tipologia della struttura** (albergo, B&B, case e appartamenti per vacanze…). Adatta il programma: nomi delle unità e profilo di partenza.
4. Scegli la **Categoria (per la tassa di soggiorno)**. Se il comune ha un regolamento in vigore, scegli dall'elenco delle sue categorie; altrimenti scrivila (es. *Albergo 3 stelle*). Senza categoria si applica la tariffa predefinita del regolamento.
5. Compila indirizzo, CAP, telefono, email e, se lo sai già, il **Sistema per la statistica ISTAT** (Ross1000 o SPOT - DMS Puglia).
6. Nel riquadro **Dati fiscali** scrivi ragione sociale, partita IVA (11 cifre), codice fiscale e PEC.
7. Nel riquadro **Primo amministratore (facoltativo)** scrivi nome, email e **Password iniziale** del titolare. La password deve avere almeno 10 caratteri e non essere troppo comune.
8. Premi **Crea hotel**. Si apre il dettaglio della nuova struttura.

### Cosa succede alla creazione

- La struttura riceve i ruoli predefiniti, un **Listino base**, i trattamenti e le fasce orarie delle sale.
- Si applica subito il **profilo della tipologia**: moduli, gestione degli utenti, trattamenti e funzioni spente adatti a quel tipo di struttura.
- Se hai indicato l'amministratore, può entrare subito. Al primo accesso deve cambiare la password e attivare la verifica in due passaggi.

*Esempio*: B&B "Il Glicine" a Pescara, categoria *B&B*. Il profilo B&B prevede un titolare unico, il trattamento B&B e le funzioni Gruppi, Agenzie e Uso diurno spente.

Messaggi comuni: *"Esiste già un utente con l'email dell'amministratore: collegalo dopo, dalla pagina Utenti dell'hotel."*, *"La partita IVA deve avere 11 cifre."*, *"Il codice ISTAT del comune ha 6 cifre (es. 058091 per Roma)."*

## Il dettaglio di un hotel

Clicca il nome di un hotel nell'elenco. La pagina ha più riquadri.

### Stato e Lavora su questo hotel

Il riquadro **Stato** dice se l'hotel è *Attivo* o *Disattivato*.

- **Disattiva hotel**: chiede conferma (*"Nessun utente dell'hotel potrà più accedere. Confermi?"*); premi **Disattiva**. I dati restano. Per tornare indietro premi **Riattiva hotel**.
- **Lavora su questo hotel**: entri nella struttura come se fossi un suo utente, con tutti i permessi, e arrivi al planning. Funziona anche con un hotel disattivato. Per cambiare struttura in seguito usa il selettore degli hotel nella barra laterale.

### Moduli attivi

Planning, prenotazioni, camere, servizi, utenti e ruoli sono sempre inclusi. Gli altri moduli si accendono con la spunta:

- **Sale ed eventi**, **Ristorazione**, **Pulizie e riassetto**, **Manutenzioni**, **Portineria**.
- I moduli con l'etichetta *in arrivo* (Magazzino, Fatturazione, Schedina PS, Ross1000, Report e stampe) non si possono ancora accendere.

Un modulo spento nasconde menu e permessi collegati; i dati restano.

### Primo avvio della struttura

Mostra gli stessi passi che il titolare vede in **Impostazioni › Primo avvio**, in sola lettura: dati della struttura, camere e tipi, listino e prezzi, politica di cancellazione, regolamento della tassa di soggiorno, Alloggiati Web, statistica ISTAT, casella email, utenti.

- Spunta verde: fatto.
- Cerchio grigio: lo deve fare la struttura.
- **Chiave inglese rossa**: tocca a te. Accanto c'è il collegamento: *Tassa di soggiorno* per il regolamento del comune, *Sistema ISTAT nei dati qui sotto* per la statistica.

Sotto, **Funzioni del nucleo** mostra quali funzioni (Gruppi, Agenzie e allotment, Uso diurno, Richieste e preventivi) la struttura ha spento. Le accende e le spegne la struttura in **Impostazioni › Struttura**.

### Profilo della tipologia

Il riquadro mostra il profilo della tipologia e l'elenco di cosa cambierebbe applicandolo (*Accende il modulo…*, *Spegne la funzione…*, *Offre il trattamento…*). Se è tutto in linea leggi *"La struttura è già impostata come il profilo."*

1. Premi **Applica il profilo**.
2. Alla domanda *Confermi?* premi **Sì, applica il profilo**.

Il modulo Sale ed eventi non cambia e niente si cancella. Se il profilo prevede il titolare unico ma la struttura ha già più utenti, la gestione resta a ruoli: un avviso lo spiega.

> Serve quando cambi la tipologia di una struttura già avviata: salvare la nuova tipologia **non** riapplica il profilo da solo.

### Dati e sistema ISTAT

In fondo c'è lo stesso modulo della creazione (senza l'amministratore). Qui cambi nome, comune, tipologia, categoria per la tassa, dati fiscali e **Sistema per la statistica ISTAT**: decide quali voci di motivo del viaggio e mezzo di trasporto compaiono al check-in. Premi **Salva**; compare *Salvato*.

Questi dati la struttura li vede in **Impostazioni › Struttura** ma non può cambiarli, perché decidono tassa di soggiorno e adempimenti.

## Lo stato dei backup

In cima a **Piattaforma › Hotel** c'è il riquadro dei backup. Ogni notte alle 3 il server copia e verifica il database; il PC dell'ufficio scarica l'ultima copia quando è acceso.

| Colore e titolo | Significato | Cosa fare |
|---|---|---|
| Verde, *Backup a posto* | ultimo backup riuscito e copia sul PC recente | niente |
| Ambra, *Backup: da controllare* | la copia sul PC è ferma da più di 3 giorni o non è mai stata scaricata | accendi il PC che scarica le copie e controlla che l'operazione pianificata giri |
| Rosso, *Backup: attenzione* | l'ultimo backup è fallito, oppure non ce n'è uno riuscito da più di 26 ore | leggi il messaggio e intervieni sul server il prima possibile (vedi Manuale tecnico) |
| Grigio, *Backup non installati* | sul server i backup notturni non ci sono | installali (vedi Manuale tecnico) |

Nel riquadro leggi anche l'ultimo backup riuscito (con dimensione e numero di tabelle verificate), quante copie giornaliere, settimanali e mensili ci sono sul server e quando è stata scaricata l'ultima copia sul PC.

Quando lo stato è ambra o rosso, a te compare anche un avviso in cima a tutte le pagine (*Backup da controllare* o *Backup: attenzione*) con il collegamento **Vedi i backup**. Le strutture non lo vedono.

> Il riquadro ricorda di conservare a parte, in un gestore di password, la chiave delle credenziali del server: senza, dopo un ripristino le password di posta, Alloggiati e Ross1000 vanno reinserite.

## Piattaforma › Tassa di soggiorno

Qui inserisci i regolamenti dei comuni ([Tassa di soggiorno](/piattaforma/tassa)). Per ogni comune vedi gli hotel che ci stanno e le **versioni** del regolamento, ognuna valida da una data. Le etichette dicono *in vigore* o *da confermare*. Un comune senza versioni non applica la tassa.

### Nuova versione

Quando il Comune cambia tariffe o esenzioni, non modificare la versione vecchia: creane una nuova.

1. Sotto il comune premi **+ Nuova versione da una data**.
2. Scegli **Valida dal** e, in **Parti da**, una *Copia della versione…* oppure *Versione vuota*.
3. Premi **Crea**. Si apre la nuova versione.

La versione in vigore a quella data si chiude al giorno prima: le notti precedenti restano calcolate come prima.

### Cosa si compila

- **Dati generali**: validità, stagionalità (formato MM-GG, es. `05-01` e `10-31`; vuoto = tutto l'anno), atto di riferimento, link alla fonte ufficiale, *I residenti nel comune sono fuori campo*, *Il conteggio delle notti consecutive riparte il 1° gennaio*, note. Il campo **Da confermare con il Comune** compare come avviso alla reception. Premi **Salva dati generali**.
- **Tariffe per categoria di struttura**: categoria, **€ / persona / notte**, **Tetto notti**, **Conteggio del tetto** (notti consecutive nella struttura, oppure anche in altre strutture con la ricevuta dell'ospite) e **Predefinita** (vale per le categorie non previste). La categoria va scritta come nei dati dell'hotel. Premi **+ Tariffa** e poi **Salva tariffe**.
- **Esenzioni, riduzioni e tetti speciali**: ogni regola ha codice, tipo, articolo e descrizione. I tipi sono *Per età (automatica)*, *Esenzione dichiarata*, *Riduzione %* e *Tetto annuo*. Le regole per età si applicano da sole; le altre le registra la reception sull'ospite. Il **Limite (avviso)** mostra un avviso, non blocca. Premi **+ Regola** e poi **Salva regole**.

*Esempio* (numeri di fantasia): versione valida dal 01/01/2027, categoria *Albergo 3 stelle* a 2,50 € a persona a notte con tetto di 7 notti; una regola per età rende esenti i minori di 14 anni.

### Versioni già usate

Una versione usata in soggiorni chiusi è **in sola lettura**: compare un avviso e i campi sono bloccati. Così i conti passati restano corretti. Una versione mai usata si può togliere con **Elimina versione** (e poi **Elimina** per confermare).

Messaggi comuni: *"Esiste già una versione che inizia il … o dopo: modifica quella."*, *"Due tariffe hanno la stessa categoria."*, *"Una sola tariffa può essere la predefinita."*

> Le regole vanno lette sul regolamento ufficiale del Comune. Il programma calcola quello che inserisci: non verifica che sia corretto.

## Piattaforma › Tabelle Polizia

Comuni, stati e tipi di documento ufficiali di Alloggiati Web servono al check-in per la schedina di Polizia e per l'ISTAT ([Tabelle Polizia](/piattaforma/tabelle-polizia)). La pagina mostra quanti comuni (e quanti validi oggi), stati e tipi di documento sono caricati, e la data dell'ultimo aggiornamento.

1. Premi **Aggiorna dal portale Alloggiati** (durante lo scaricamento il pulsante dice *Scaricamento in corso...*).
2. Alla fine leggi quanti comuni, stati e tipi di documento sono stati aggiornati.

Aggiornale quando la Polizia pubblica nuove tabelle, per esempio dopo la nascita o la fusione di comuni. I codici cessati restano: servono per chi è nato in un comune che non esiste più. Se le tabelle non sono mai state caricate, al check-in non si possono indicare luoghi e documenti.

## Piattaforma › Accessi

La pagina **Accessi alla piattaforma** ([Accessi](/piattaforma/accessi)) raccoglie gli accessi di tutte le strutture, compresi i tentativi con email che non appartengono a nessun utente. Si apre sugli ultimi 7 giorni.

- Filtra con **Dal**, **Al** e **Utente**, poi premi **Mostra**.
- Spunta **Solo password sbagliate e blocchi** per vedere solo i problemi.
- Ogni riga dice quando, chi, cosa (accesso, password sbagliata, password cambiata, verifica attivata o azzerata, accesso con un codice di riserva…) e da quale indirizzo di rete. I problemi sono in rosso.

Il registro si conserva 12 mesi. Ogni struttura ha il suo registro in **Impostazioni › Registro accessi**, con i soli propri utenti.

## Gestori della piattaforma (superadmin)

I superadmin si gestiscono dalla pagina **Impostazioni › Utenti** di qualunque hotel. Lì, solo tu vedi in più:

- il riquadro **Gestori della piattaforma (superadmin)**: chi sono, con il pulsante **Togli superadmin**;
- su ogni utente della struttura il pulsante **Rendi superadmin**;
- la colonna **Account**, con *Attivo* / *Disattivato*: vale per tutti gli hotel dell'utente;
- nel **Nuovo utente**, se l'email esiste già, l'utente viene collegato a questo hotel con il ruolo scelto.

Un superadmin vede tutti gli hotel, anche quelli creati in futuro, con tutti i permessi. Deve restare almeno un superadmin attivo (*"Deve restare almeno un superadmin attivo."*) e non puoi disattivare il tuo stesso account.

Se un utente lavora in più strutture e perde il telefono, la verifica in due passaggi gliela azzeri tu con **Azzera verifica**: l'amministratore della singola struttura non può farlo.

## Verifica in due passaggi

Per il fornitore la verifica in due passaggi è **obbligatoria**. Dopo la password serve il codice a 6 cifre dell'app sul telefono, oppure uno dei codici di riserva. Se non è ancora attiva, al primo accesso il programma chiede subito di attivarla, prima di qualsiasi altra cosa. Come si attiva e si usa è spiegato nel capitolo [Primi passi](/manuale/primi-passi).

Conserva i codici di riserva in un posto sicuro: con il tuo account si entra in tutte le strutture.

## Da sapere

- Tipologia, categoria, comune e sistema ISTAT di una struttura li cambi solo tu: influiscono su tassa di soggiorno e adempimenti.
- Disattivare un hotel blocca l'accesso ai suoi utenti, ma non cancella nulla.
- Un modulo o una funzione spenti nascondono menu e maschere; i dati restano.
- Una versione del regolamento della tassa usata in soggiorni chiusi non si modifica più: per un cambio crea una nuova versione da una data.

## Problemi frequenti

- **Una struttura dice che manca il regolamento della tassa.** Apri **Piattaforma › Tassa di soggiorno**, cerca il comune e crea una versione in vigore. Controlla che la categoria dell'hotel sia scritta come nelle tariffe.
- **Al check-in mancano le voci ISTAT.** Imposta il **Sistema per la statistica ISTAT** nel dettaglio dell'hotel.
- **Ho cambiato la tipologia ma i moduli sono quelli di prima.** Premi **Applica il profilo** nel riquadro del profilo.
- **Il titolare non riesce a entrare.** Controlla che l'hotel sia *Attivo* e guarda in **Piattaforma › Accessi** se ci sono password sbagliate o blocchi.
