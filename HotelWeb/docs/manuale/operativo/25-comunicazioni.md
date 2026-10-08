---
titolo: Email, preventivi e questionari
ordine: 25
permessi: comunicazioni.invia, prenotazioni.gestisci, questionari.vedi
moduli:
fornitore: no
---

Il programma scrive agli ospiti dalla **casella di posta dell'hotel**: conferme, richieste di acconto, promemoria, ringraziamenti. Da qui prepari anche i **preventivi** che l'ospite apre e accetta online, e raccogli i **questionari di gradimento** dopo la partenza.

Ogni email inviata resta nello storico, con data, ora e nome di chi l'ha mandata.

## Prima di tutto: configurare la posta

Senza la casella configurata nessuna email può partire. Lo fa una volta sola chi ha il permesso **Configurare l'hotel**.

1. Apri **Impostazioni › Email e modelli** ([Email e modelli](/impostazioni/email)).
2. Nel riquadro **Server di posta in uscita (SMTP)** compila i campi. Sono gli stessi dati che usi nel programma di posta o sullo smartphone:
   - **Server**, per esempio `smtps.esempio.it`;
   - **Porta** e **Sicurezza**: scegliendo *SSL/TLS* la porta diventa 465, scegliendo *STARTTLS* diventa 587; *Nessuna* è sconsigliata;
   - **Utente**, di solito l'indirizzo email della casella;
   - **Password** della casella (si salva cifrata);
   - **Nome del mittente**, per esempio il nome dell'hotel;
   - **Indirizzo del mittente**;
   - **Risposte a** (facoltativo): l'indirizzo dove arrivano le risposte degli ospiti.
3. Premi **Salva**. Compare "Configurazione salvata.".
4. Sotto compare **Email di prova**: scrivi un indirizzo nel campo **A** e premi **Invia la prova**. Se arriva, la posta funziona.

Sotto il pulsante il programma ricorda l'ultima prova, con data e risultato ("riuscita" oppure "non riuscita" con il motivo).

> Quando modifichi la configurazione puoi lasciare vuota la password: resta quella salvata.

Nella stessa pagina, nel riquadro **Bonifici degli acconti**, scrivi l'**IBAN dell'hotel** e premi **Salva**: compare nelle email di richiesta dell'acconto.

> Perché le email non finiscano nello spam, il dominio dell'hotel deve avere i record **SPF** e **DKIM**. Di solito li imposta chi gestisce il dominio. Il provider della casella può anche avere un limite di email all'ora o al giorno.

## I modelli delle email

Il programma ha già dei testi pronti, in italiano e in inglese:

| Modello | Quando si usa |
|---|---|
| Conferma della prenotazione | Riepilogo di date, camere, persone, trattamento e totale |
| Richiesta di acconto | Importo, scadenza, IBAN e causale del bonifico |
| Promemoria prima dell'arrivo | Qualche giorno prima: orario di check-in e contatti |
| Ringraziamento dopo la partenza | Grazie e link al questionario di gradimento |
| Preventivo | Link alla pagina del preventivo online |
| Istruzioni di arrivo | Per chi entra da solo: istruzioni e codice di accesso |
| Email libera | Solo saluto e firma: il resto lo scrivi tu |

### Cambiare un modello

1. In **Impostazioni › Email e modelli**, riquadro **Modelli delle email**, scegli il modello e la lingua.
2. Modifica **Oggetto** e **Testo**.
3. Premi **Salva il modello**. Accanto al nome compare l'etichetta **modificato**.

Per tornare al testo originale del programma premi **Testo di partenza**.

### I segnaposto

Nei testi trovi parole tra doppie graffe, come `{{nome}}` o `{{arrivo}}`. Sono i **segnaposto**: al momento dell'invio il programma li sostituisce con i dati della prenotazione. Per esempio "Gentile `{{nome}}` `{{cognome}}`" diventa "Gentile Mario Rossi".

L'elenco completo, con la spiegazione di ognuno, è a destra del testo nella pagina dei modelli. I più usati:

- `{{arrivo}}`, `{{partenza}}`, `{{notti}}`, `{{persone}}`, `{{camere}}`, `{{trattamento}}`;
- `{{totale}}`, `{{pagato}}`, `{{da_pagare}}`, `{{acconto}}`, `{{acconto_entro}}`;
- `{{iban}}`, `{{causale}}` (per esempio "Prenotazione n. 245 Rossi");
- `{{checkin_dalle}}`, `{{checkout_entro}}`, `{{hotel}}`, `{{telefono_hotel}}`, `{{indirizzo_hotel}}`.

Alcuni valgono solo per un modello: `{{link_preventivo}}` e `{{valido_fino}}` per il preventivo, `{{link_questionario}}` per il ringraziamento, `{{istruzioni_arrivo}}` e `{{codice_accesso}}` per le istruzioni di arrivo.

## Scrivere un'email dalla prenotazione

Serve il permesso **Inviare email agli ospiti**.

1. Apri la prenotazione e cerca il riquadro **Comunicazioni**.
2. Premi **Scrivi un'email**. Si apre la bozza con il modello *Conferma della prenotazione*.
3. Scegli il **Modello** e la **Lingua**. Il testo si ricompone da solo con i dati della prenotazione.
4. Nel campo **A** scegli il destinatario: chi ha prenotato, chi paga oppure il cliente (azienda o agenzia), se hanno un indirizzo email. Puoi anche scegliere **Un altro indirizzo…** e scriverlo nel campo **Indirizzo**.
5. Rileggi **Oggetto** e **Testo**: puoi correggerli a mano solo per questa email.
6. Premi **Invia**. Compare "Email inviata a …".

Per rinunciare premi **Annulla**.

### La lingua

Il programma propone la lingua dell'ospite, se è indicata nella sua scheda. Altrimenti propone l'italiano per gli italiani e l'inglese per tutti gli altri. Puoi sempre cambiarla dal campo **Lingua**.

### Esempio

La famiglia Bianchi ha prenotato una doppia dal 10 al 13 giugno, 3 notti a 90 € a notte: totale 270 €. Vuoi chiedere un acconto del 30%, cioè 81 €.

1. Nella prenotazione, con il pulsante **Acconto richiesto** (o **Scadenza opzione e acconto** se è un'opzione), scrivi **Acconto richiesto (€)** 81 e la data in **Entro il**, poi premi **Salva**.
2. Nel riquadro **Comunicazioni** premi **Scrivi un'email** e scegli il modello *Richiesta di acconto*.
3. Il testo riporta "un acconto di 81,00 €", la scadenza, l'IBAN e la causale "Prenotazione n. … Bianchi".
4. Premi **Invia**.

### Lo storico

Sotto la bozza c'è l'elenco delle email già mandate per questa prenotazione: modello, destinatario, oggetto, esito, data e operatore. Premi su una riga per rileggere il testo.

L'esito può essere:

- **inviata** (verde): l'email è partita;
- **errore** (rosso): il server di posta l'ha rifiutata; aprendo la riga leggi il motivo;
- **simulata** (blu): succede solo nell'ambiente di prova, dove le email non partono davvero.

### Istruzioni di arrivo

Se la camera o l'appartamento ha l'**arrivo autonomo** (istruzioni e codice per entrare da soli), nella prenotazione compare il riquadro **Arrivo autonomo** con il pulsante **Invia le istruzioni** (o **Invia di nuovo le istruzioni**). Il pulsante apre la bozza delle **Istruzioni di arrivo** nel riquadro Comunicazioni.

Queste email contengono il codice di accesso: le può preparare e inviare solo chi ha anche il permesso **Gestire prenotazioni**. Chi non ce l'ha vede nello storico la scritta "(Testo nascosto: contiene il codice di accesso.)".

Pochi giorni prima di un arrivo autonomo senza istruzioni inviate, in cima alle pagine compare l'avviso "Un arrivo autonomo senza istruzioni inviate", con il pulsante **Vedi gli arrivi**, che apre la pagina **Istruzioni di arrivo da inviare**.

## Richieste e preventivi

Ogni "avete posto?" che arriva al telefono, per email o di persona si registra qui. Dalla richiesta prepari un **preventivo** con fino a 3 proposte e lo mandi all'ospite. L'ospite apre un link, vede prezzi e condizioni e può **accettare online**.

Chi può usarla: serve il permesso **Gestire prenotazioni** insieme a **Vedere importi** (i preventivi hanno prezzi). Per mandarli per email serve anche **Inviare email agli ospiti**. La voce di menu è **Ricevimento › Richieste e preventivi** ([Richieste e preventivi](/preventivi)). Se la struttura non usa i preventivi, la funzione si può spegnere in **Impostazioni › Struttura**, riquadro **Funzioni usate**.

### Registrare una richiesta

1. Premi **Nuova richiesta**.
2. Compila i campi. Bastano **Nome**, **Cognome**, **Arrivo** e **Partenza**; gli altri aiutano a fare la proposta giusta:
   - **Arrivata da**: Telefono, Email, Sito web, Di persona, Altro;
   - **Lingua**, **Email**, **Telefono**;
   - **Camere**, **Adulti per camera**, **Età dei bambini** (per camera, separate da virgola, per esempio `8, 3`);
   - **Trattamento desiderato**, **Budget**, **Note**.
3. Premi **Salva e prepara il preventivo**. Si apre la pagina della richiesta.

*Esempio: la famiglia Rossi telefona per 2 adulti e un bambino di 8 anni, dal 10 al 13 giugno, mezza pensione, budget 120 € a notte.*

### Preparare il preventivo

1. Nella pagina della richiesta premi **Nuovo preventivo**.
2. Per la **Proposta 1** scegli **Tipo di camera**, **Listino** e **Trattamento**, poi premi **Calcola**.
3. Il programma mostra il prezzo del listino e quante camere di quel tipo sono libere in quelle date. Il prezzo entra nel campo **Prezzo totale (€)**: è il totale di tutte le camere e tutte le notti, **senza tassa di soggiorno**. Puoi cambiarlo, per esempio per fare uno sconto.
4. Se vuoi, scrivi una nota per l'ospite (per esempio "vista mare").
5. Con **Altra proposta** aggiungi una seconda e una terza proposta.
6. Indica **Valido fino al** (il programma propone una settimana da oggi), l'eventuale **Acconto richiesto (€)** e un **Messaggio per l'ospite**, che compare in cima al preventivo online.
7. Premi **Crea il preventivo**. Compare "Preventivo pronto: ora mandalo all'ospite.".

Se le camere libere sono meno di quelle richieste, la riga del calcolo diventa rossa. Se il listino non ha tutti i prezzi per quelle date, il programma lo dice e il prezzo lo scrivi tu.

Se il tipo di camera ha una pulizia finale, il calcolo la indica a parte: l'ospite la vede accanto al prezzo, e all'accettazione la prenotazione la aggiunge da sola.

### Mandare il preventivo

Sotto il preventivo hai tre strade:

- **Invia per email**: si apre la bozza con il modello *Preventivo* e il link già inserito. Controlla **A**, **Lingua**, **Oggetto** e **Testo** e premi **Invia**.
- **Copia il link**: copia l'indirizzo del preventivo, da incollare in WhatsApp o in un messaggio.
- **Segna come inviato (per altra via)**: se hai mandato il link senza email, così il preventivo risulta inviato.

Il preventivo passa da *Da inviare* a *Inviato*. Quando l'ospite apre il link diventa *Visto dall'ospite*, con data e ora.

### Cosa vede l'ospite

Con il link l'ospite apre una pagina pubblica, in italiano o in inglese secondo la lingua della richiesta. Vede le proposte con il prezzo totale, il prezzo a notte per camera, le note, le condizioni di cancellazione del listino, l'acconto richiesto e la scadenza. In fondo c'è la frase "Tassa di soggiorno esclusa, si paga in hotel.".

Per ogni proposta c'è il pulsante **Accetto questa proposta**, con una conferma. C'è anche **Non mi interessa**, dove l'ospite può scrivere il motivo.

### Quando l'ospite accetta

Il programma controlla che le camere siano ancora libere. Se sì:

- crea la **prenotazione in opzione**, con le camere ancora da assegnare e l'acconto del preventivo;
- se il prezzo del preventivo era diverso dal listino, lo mette come prezzo concordato;
- la richiesta diventa *Accettata*.

In cima alle pagine compare l'avviso "Un ospite ha risposto online a un preventivo", con il pulsante **Vai ai preventivi**. La richiesta in elenco ha l'etichetta **risposta online da guardare**. Quando la apri, l'avviso sparisce e un messaggio ti porta alla nuova prenotazione: assegna le camere e manda la richiesta di acconto.

Se nel frattempo le camere sono state occupate, l'ospite legge un messaggio che lo invita a contattare l'hotel.

### Chiudere una richiesta senza prenotazione

Nella pagina della richiesta, in **Chiudi senza prenotazione**, scegli il motivo (per esempio *Prezzo troppo alto* o *Ha scelto un'altra struttura*) e premi **Chiudi**.

I preventivi inviati e non accettati entro la scadenza diventano *Scaduto* da soli, con il motivo *Nessuna risposta*.

### Le statistiche delle richieste

In fondo alla pagina **Richieste e preventivi**, il riquadro **Ultimi 90 giorni** dice quante richieste sono arrivate, quante hanno avuto un preventivo, quante sono diventate prenotazioni e la **Conversione** in percentuale, anche divisa per canale. Elenca anche perché si perdono.

*Esempio: 40 richieste, 10 diventate prenotazioni: conversione 25%.*

## Questionari e ringraziamenti

Dopo la partenza l'ospite riceve un'email di ringraziamento con il link a un breve questionario. La pagina è **Ricevimento › Questionari e ringraziamenti** ([Questionari](/questionari)) e serve il permesso **Vedere i questionari**.

### Il questionario dell'ospite

L'ospite apre il link e risponde:

- **Nel complesso**: da 1 a 5 stelle (obbligatorio);
- voci facoltative: La camera, Pulizia, Colazione e ristorazione, Cortesia del personale, Posizione, Rapporto qualità/prezzo;
- **Ci consiglierebbe ad amici e parenti?** Sì o No;
- un commento libero.

Si compila una volta sola, entro 90 giorni. A chi dà 4 o 5 stelle la pagina propone di lasciare una recensione online, se l'hotel ha indicato la pagina delle recensioni.

### Mandare il ringraziamento

Ci sono tre modi:

- **Da solo al check-out**: se è attiva l'impostazione, parte quando esce l'ultima camera della prenotazione. Il check-out non si blocca mai: se l'email non parte, compare solo un messaggio.
- **Dalla prenotazione**: riquadro **Comunicazioni**, modello *Ringraziamento dopo la partenza*.
- **Dall'elenco**: nel riquadro **Partenze da ringraziare** (ultimi 30 giorni, senza ringraziamento) premi **Invia ringraziamento**. Serve il permesso **Inviare email agli ospiti**.

Il ringraziamento va a chi ha prenotato, nella sua lingua, e una volta sola per prenotazione. Se l'ospite non ha un indirizzo email, in elenco leggi "senza email".

### Leggere i risultati

1. Scegli il periodo in **Compilati dal** e **al** (il programma propone l'ultimo anno) e premi **Mostra**.
2. Nel riquadro **Risultati del periodo** leggi: **Questionari inviati**, **Compilati** (con la percentuale), **Voto complessivo medio** e **Ci consiglierebbero**. Sotto c'è la media di ogni voce.
3. Nel riquadro **Risposte degli ospiti** leggi ogni questionario, con stelle, voti, commento e i collegamenti all'ospite e alla prenotazione. Con **Solo voti bassi (fino a 2)** vedi solo quelli negativi.

*Esempio: 50 questionari inviati, 20 compilati (40%), voto medio 4,3 su 5.*

### I voti bassi

Un questionario con voto complessivo di 1 o 2 stelle resta evidenziato in rosso. In cima alle pagine compare l'avviso "Un ospite ha dato un voto basso nel questionario". Leggilo e premi **Segna come letto**: resta scritto chi l'ha letto e quando.

### Le impostazioni dei questionari

Chi ha il permesso **Configurare l'hotel** vede in fondo alla pagina il riquadro **Impostazioni**:

- la spunta **Manda da solo il ringraziamento con il questionario al check-out dell'ultima camera**;
- **Pagina delle recensioni**: un indirizzo che inizia con `https://`, per esempio la pagina dell'hotel su Google o TripAdvisor. Vuoto = non si propone.

Premi **Salva**.

## Da sapere

- Senza il permesso **Vedere importi**, totale, pagato, da pagare e acconto non vengono riempiti: restano tra graffe e l'email non parte finché non li scrivi tu.
- Il programma non invia un'email se nel testo restano segnaposto tra `{{ }}`: il pulsante **Invia** resta spento e compare l'avviso "Mancano dei dati".
- Le email partono dalla casella dell'hotel con il testo così come lo vedi, senza grafica né immagini; le risposte degli ospiti arrivano a quella casella (o all'indirizzo di **Risposte a**), non nel programma.
- Il link del preventivo e quello del questionario sono segreti: chi li ha può aprire la pagina. Non pubblicarli.

## Problemi frequenti

- **Il riquadro Comunicazioni dice "La posta non è configurata"**: inserisci i dati in **Impostazioni › Email e modelli**.
- **"Mancano dei dati: {{acconto_entro}}"**: nella prenotazione manca la scadenza dell'acconto. Completala nella prenotazione (campo **Entro il**), oppure scrivi la data nel testo.
- **"Mancano dei dati: {{iban}}"**: scrivi l'IBAN in **Impostazioni › Email e modelli**, riquadro **Bonifici degli acconti**.
- **L'email ha esito "errore"**: apri la riga nello storico e leggi il motivo. Spesso è la password cambiata o un limite del provider: prova con **Invia la prova**.
- **"Il ringraziamento è già stato inviato."**: per ogni prenotazione il ringraziamento parte una volta sola.
- **L'ospite dice che il preventivo è scaduto**: un preventivo scaduto chiude anche la richiesta (stato *Scaduta*). Aprila dalla scheda **Chiuse** dell'elenco: puoi correggerla (per esempio le date) e premere **Nuovo preventivo**. Quando lo invii, la richiesta torna tra quelle aperte.
