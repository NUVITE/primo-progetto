---
titolo: Utenti, ruoli e sicurezza
ordine: 70
permessi: utenti.gestisci, ruoli.gestisci
moduli:
fornitore: no
---

Qui decidi chi può entrare nel programma e cosa può fare: gli **utenti** sono le persone, i **ruoli** sono gli insiemi di permessi (Reception, Governante, Cucina…). Il **registro degli accessi** ti fa vedere chi è entrato e quando.

Chi può farlo: le pagine **Utenti** e **Registro accessi** richiedono il permesso **Gestire utenti**; la pagina **Ruoli** richiede **Gestire ruoli**.

> Chi ha **Gestire utenti** o **Configurare l'hotel** deve usare la verifica in due passaggi: il programma gliela fa attivare al primo accesso. Vedi il capitolo [Primi passi](/manuale/primi-passi).

## Come è organizzata la struttura

Apri **Impostazioni › Utenti** ([Utenti](/utenti)). Nella sezione **Come è organizzata la struttura** scegli una delle due modalità.

- **Titolare unico**: un solo utente, con tutti i permessi. Non si possono aggiungere altri utenti. Va bene per un B&B o una piccola struttura dove una persona fa tutto.
- **Più utenti con ruoli**: ogni utente ha un **ruolo principale** ed eventualmente **ruoli in più**. I permessi si sommano.

Per passare al titolare unico nell'hotel deve esserci al massimo un utente. Altrimenti compare *Nell'hotel ci sono 3 utenti: con il titolare unico ce ne può essere uno solo. Rimuovi prima gli altri.* (il numero cambia). Passando al titolare unico i ruoli in più vengono tolti.

Si può tornare a **Più utenti con ruoli** in ogni momento. Il titolare riprende il ruolo che aveva prima; se quel ruolo non permette di gestire gli utenti, il programma gli assegna il ruolo **Amministratore**, così la struttura non resta senza nessuno che possa aggiungere o modificare utenti. Controlla comunque il suo ruolo nella colonna **Ruolo**: da quel momento valgono i permessi di quel ruolo.

## Aggiungere un utente

Nella sezione **Nuovo utente**:

1. Scrivi il **Nome** (es. `Giulia Bianchi`) e l'**Email** (es. `giulia.bianchi@hotelmare.it`).
2. Scrivi una **Password iniziale (min. 10 caratteri, si cambia al primo accesso)**.
3. Scegli il **Ruolo** (la tendina propone **Reception**).
4. Premi **+ Aggiungi utente**.

Comunica a Giulia email e password iniziale di persona o al telefono. Al primo accesso il programma le chiede di sceglierne una sua. Finché non lo fa, accanto al nome compare l'etichetta **password temporanea**.

La password iniziale deve rispettare le stesse regole di tutte le password (almeno 10 caratteri, non troppo comune, senza nome o email della persona). Se non va bene compare un messaggio che inizia con *Password iniziale:* e dice il motivo.

### Errori comuni

- *Esiste già un utente con questa email: per collegarlo a questo hotel contatta il gestore della piattaforma.* L'account esiste già, per esempio perché la persona lavora in un'altra struttura. Solo il fornitore del programma può collegarlo anche alla tua.
- *La struttura è gestita da un titolare unico: per aggiungere altri utenti passa alla gestione con ruoli.*
- *Non puoi assegnare permessi che tu stesso non hai.* Hai scelto un ruolo con più permessi dei tuoi (vedi le regole più sotto).

## Cambiare il ruolo e i ruoli in più

Nella tabella **Utenti dell'hotel**, colonna **Ruolo**:

- cambia il **ruolo principale** dalla tendina: vale subito;
- premi **+ ruoli in più** per aggiungere altri ruoli. Spunta quelli che servono e premi **Salva**. Sotto la tendina compaiono i ruoli aggiunti, es. *+ Governante*.

Esempio: Luca lavora in reception ma il sabato sostituisce la governante. Gli dai **Reception** come ruolo principale e **Governante** come ruolo in più: può fare le cose di entrambi.

Con il titolare unico la colonna dice **Titolare (tutti i permessi)** e non si cambia.

## Etichette accanto al nome

- **(tu)**: sei tu.
- **verifica in due passaggi**: la persona accede con password e codice dal telefono.
- **password temporanea**: la persona non ha ancora scelto la sua password (password iniziale o reimpostata).

## Password dimenticata: Reimposta password

Se un collega ha dimenticato la password:

1. Nella sua riga premi **Reimposta password**.
2. Alla domanda *Creare una password temporanea per…?* premi **Reimposta**.
3. Compare la **password temporanea**, di 12 caratteri in tre gruppi (es. `Hk7m-P2qa-Zr4t`). Scritta così si detta facilmente: non ha caratteri che si confondono come 0 e O.
4. Comunicala di persona o al telefono, **non per email**, poi premi **Fatto, chiudi**.

Cosa succede:

- la password temporanea **non si potrà più rivedere**;
- le sessioni che il collega aveva aperte si chiudono e i dispositivi ricordati vengono dimenticati;
- al primo accesso dovrà sceglierne una sua.

La tua password non la reimposti da qui: la cambi da **Il mio profilo**.

## Telefono perso: Azzera verifica

Se un collega ha perso o cambiato il telefono e non ha più i codici di riserva:

1. Nella sua riga premi **Azzera verifica** (c'è solo se ha la verifica attiva).

La verifica in due passaggi del collega si spegne e le sue sessioni si chiudono. Al prossimo accesso entra con la sola password; se la verifica è obbligatoria per il suo ruolo, il programma gliela fa riattivare subito con il telefono nuovo.

Prima di azzerare, accertati che sia davvero lui a chiederlo (di persona o richiamandolo a un numero che conosci).

## Rimuovere un utente

1. Nella sua riga premi **Rimuovi dall'hotel**.
2. Alla domanda *Togliere l'accesso a…?* premi **Rimuovi**.

La persona non entra più in questa struttura. L'account resta, se lavora anche in altre strutture. Fallo il giorno in cui un collaboratore smette di lavorare da voi, per esempio a fine stagione.

## Regole di sicurezza

Il programma applica sempre queste regole, anche se il pulsante si vede.

- **Non si concede ciò che non si ha.** Non puoi dare a un utente o a un ruolo un permesso che tu non hai. Messaggio: *Non puoi assegnare permessi che tu stesso non hai.*
- **Non si tocca chi ha più permessi.** Non puoi cambiare ruolo, reimpostare la password, azzerare la verifica o rimuovere un utente con più permessi dei tuoi. Messaggio: *Non puoi modificare un utente con più permessi dei tuoi.* Esempio: un Direttore non può declassare l'Amministratore.
- **L'hotel non resta senza chi gestisce gli utenti.** Se una modifica lascerebbe l'hotel senza nessuno con **Gestire utenti**, viene annullata: *Operazione annullata: l'hotel resterebbe senza nessun utente in grado di gestire gli utenti.*
- **Account su più strutture.** Se la persona lavora anche in un'altra struttura, la password e la verifica gliele reimposta il fornitore della piattaforma: il programma lo dice con un messaggio.

## Ruoli

Apri **Impostazioni › Ruoli** ([Ruoli](/ruoli)). Ogni struttura nasce con dei ruoli pronti: Amministratore, Direttore, Reception, Eventi / Commerciale, Cucina, Sala, Room service, Governante, Cameriera ai piani, Manutenzione, Portiere, Portiere di notte. Puoi cambiarli come vuoi.

Ogni ruolo è un riquadro con il nome, il numero di utenti che lo hanno come ruolo principale e i permessi, raggruppati per area: **Prenotazioni**, **Configurazione**, **Utenti** e, se i moduli sono attivi, **Sale**, **Ristorazione**, **Pulizie**, **Manutenzioni**, **Portineria**. Ogni permesso ha il nome e una riga che spiega cosa consente.

### Cambiare i permessi di un ruolo

Spunta o togli la spunta accanto al permesso. La modifica vale **subito** per tutti gli utenti con quel ruolo.

Alcuni permessi ne portano con sé altri, perché chi gestisce qualcosa deve anche vederlo. Esempi:

- spuntando **Gestire prenotazioni** si aggiunge anche **Vedere prenotazioni**;
- spuntando **Registrare pagamenti** si aggiungono **Vedere prenotazioni** e **Vedere importi**;
- togliendo **Vedere prenotazioni** si tolgono anche i permessi che ne hanno bisogno (es. **Gestire prenotazioni**).

Le spunte dei permessi che tu non hai sono grigie e non si cambiano. Se un ruolo ha permessi che tu non hai, sotto il nome compare *ha permessi che tu non hai: non modificabile*.

### Creare, rinominare, eliminare

- **Nuovo ruolo**: scrivi il **Nome** (es. `Stagista reception`), in **Parti dai permessi di** scegli un ruolo da copiare oppure **Nessun permesso**, poi premi **+ Crea ruolo**. Poi sistema le spunte.
- **Rinomina**: cambia il nome; premi **Salva**.
- **Elimina**: compare solo se nessun utente ha quel ruolo come principale. Conferma con **Elimina**.

Esempio: per gli studenti in stage crei **Stagista reception** partendo da **Reception** e togli **Registrare pagamenti**, **Chiusura di cassa** e **Inviare schedine e ISTAT**.

## Registro accessi

Apri **Impostazioni › Registro accessi** ([Registro accessi](/utenti/accessi)). Vedi chi è entrato, quando e da quale indirizzo di rete, per gli utenti della tua struttura. All'apertura mostra gli ultimi 30 giorni.

1. Scegli il periodo con **Dal** e **Al** e premi **Mostra**.
2. Con **Utente** guardi una sola persona (o **Tutti**).
3. Con **Solo password sbagliate e blocchi** vedi solo i problemi.

La tabella ha le colonne **Quando**, **Chi**, **Cosa**, **Indirizzo**. Nella colonna **Cosa** trovi, per esempio: **Accesso**, **Password sbagliata**, **Tentativo durante il blocco**, **Codice di verifica sbagliato**, **Password cambiata**, **Password reimpostata** (con chi l'ha fatto), **Uscita dagli altri dispositivi**, **Verifica in due passaggi attivata**, **spenta** o **azzerata**, **Accesso con un codice di riserva**. Password sbagliate, codici sbagliati e blocchi sono in rosso.

Si vedono al massimo gli ultimi 500 eventi: se sono di più, restringi il periodo o scegli un utente. Il registro si conserva 12 mesi, poi si cancella da solo.

Esempio: lunedì mattina vedi 5 righe rosse **Password sbagliata** alle 3 di notte sull'account di Anna, che quella notte non lavorava. Qualcuno potrebbe provare a indovinare la sua password: reimpostala da **Utenti** e avvisa Anna.

## Consigli di sicurezza

- **Un account per persona.** Mai un account "reception" condiviso: il registro deve dire chi ha fatto cosa.
- **Il ruolo più piccolo che basta.** Dai a ognuno solo i permessi che usa. Uno stagista non ha bisogno di **Chiusura di cassa**.
- **Togli l'accesso quando qualcuno se ne va**, lo stesso giorno, con **Rimuovi dall'hotel**.
- **Password temporanee solo a voce**, mai per email o messaggio scritto.
- **Ricorda questo dispositivo** solo sui computer personali, non su quelli condivisi della reception.
- **Guarda il registro accessi** ogni tanto, soprattutto le righe rosse.
- **Almeno due persone con Gestire utenti**, se la struttura ha più utenti: se una è assente o perde il telefono, l'altra può aiutarla.

## Problemi frequenti

- **Non vedo il pulsante Elimina su un ruolo.** Qualcuno ha ancora quel ruolo come principale: cambia prima il suo ruolo.
- **"Questo utente lavora anche in un'altra struttura…"** La password o la verifica le reimposta il gestore della piattaforma.
- **Ho cambiato i permessi ma il collega non vede la voce nel menu.** Fagli ricaricare la pagina. Se il permesso riguarda un modulo non attivo (es. Ristorazione), la voce non compare comunque.
