---
titolo: Sale ed eventi
ordine: 50
permessi: sale.vedi
moduli: sale
fornitore: no
---

Questo capitolo spiega come si prenotano le sale per convegni, riunioni, banchetti ed esami: il planning delle sale, la nuova prenotazione con fasce orarie e allestimenti, la pagina dell'evento con servizi, persone e pagamenti, e la configurazione delle sale.

Le pagine ci sono solo se per la tua struttura è acceso il modulo **Sale ed eventi**. Il modulo lo accende il fornitore del programma.

Le voci di menu sono **Ricevimento › Planning sale**, **Ricevimento › Prenotazioni sale** e **Impostazioni › Sale e fasce orarie**. I permessi, come compaiono nella pagina Ruoli:

| Permesso | Cosa permette |
|---|---|
| Vedere sale | Planning ed elenco delle sale, dettaglio degli eventi in sola lettura |
| Gestire prenotazioni sale | Creare e modificare le prenotazioni di sala |
| Configurare sale | Sale, allestimenti, fasce orarie, tariffe e pacchetti |

Per registrare i pagamenti di un evento serve anche **Registrare pagamenti**.

## Le parole da conoscere

- **Fascia oraria**: un pezzo di giornata con un nome, per esempio Mattina 08:00–13:00, Pomeriggio 14:00–19:00, Sera 19:00–24:00, Giornata intera 08:00–19:00. Si prenota per fascia oppure a ore.
- **Allestimento**: come è disposta la sala (platea, banchi di scuola, tavoli…), con la sua capienza e un costo eventuale.
- **Riassetto**: i minuti che servono fra un evento e l'altro per rimettere a posto la sala. Il programma li rispetta prima e dopo ogni evento.
- **Opzione**: la sala è tenuta per il cliente fino a una data. Blocca la sala come una conferma; alla scadenza compare solo un avviso, la sala **non** si libera da sola.

## Configurare sale e fasce orarie

Apri **Impostazioni › Sale e fasce orarie** ([Sale e fasce orarie](/impostazioni/sale)). Serve il permesso **Configurare sale**. Si fa una volta sola, all'inizio.

### Le fasce orarie

1. Controlla le fasce nella tabella **Fasce orarie**. Con **Modifica** cambi nome e orari (**Dalle**, **Alle**); con **+ Aggiungi fascia** ne crei una nuova; con **Elimina** e **Sì, elimina** la togli.
2. La spunta **Nel planning** dice se la fascia divide le celle del planning. Le fasce che ne coprono altre (es. Giornata intera) servono solo per prenotare e per il prezzo: lasciale senza spunta.

"24:00" vuol dire mezzanotte. Se elimini una fascia, le prenotazioni già fatte restano con i loro orari e prezzi.

### Le sale

1. Premi **+ Nuova sala**.
2. Compila **Nome** (es. Sala Congressi), **Capienza massima**, **Riassetto tra eventi (minuti)** e una **Descrizione**.
3. Scrivi il **prezzo per ogni fascia**. Una fascia lasciata vuota non ha prezzo fisso.
4. Se affitti la sala anche a ore, scrivi il **Prezzo orario (€)**; vuoto = non a ore.
5. Lascia la spunta **Attiva (prenotabile e visibile nel planning)** e premi **Salva**.
6. Con **+ Aggiungi allestimento** crea gli allestimenti della sala: nome (es. Platea), **Capienza**, **Costo**.

Come si calcola il prezzo: se l'orario coincide con una fascia a prezzo fisso vale il prezzo della fascia; altrimenti ore × prezzo orario. L'allestimento si aggiunge a parte. Il prezzo resta correggibile nella singola prenotazione.

Esempio: la Sala Congressi costa 300 € la Mattina e 500 € la Giornata intera, con prezzo orario 70 €. Prenotata dalle 08:00 alle 13:00 costa 300 €; dalle 15:00 alle 18:00 costa 3 × 70 = 210 €. Con l'allestimento a banchi di scuola da 50 € si aggiungono 50 €.

### I pacchetti per gli eventi

Nella stessa pagina, sotto le sale, c'è **Pacchetti per gli eventi**: servizi che di solito vanno insieme e che nell'evento si aggiungono con un clic.

1. Premi **Nuovo pacchetto** e scrivi **Nome** (es. Giornata congressuale) e **Descrizione**.
2. Per ogni riga scegli un servizio del catalogo o **Altro (scrivi la descrizione)**, il **Prezzo €** e la **Quantità**: **a persona** (moltiplicata per i partecipanti) o **a evento** (una volta). Con **Aggiungi un servizio** aggiungi righe.
3. Premi **Salva**.

Esempio: coffee break 6 € e pranzo 25 € a persona, videoproiettore 50 € a evento. Con 40 partecipanti fanno 6 × 40 + 25 × 40 + 50 = 1.290 € al giorno.

Modificare o eliminare un pacchetto non cambia gli eventi a cui è già stato applicato.

## Il planning delle sale

Apri **Ricevimento › Planning sale** ([Planning sale](/sale/planning)). Ogni riga è una sala; ogni giorno è diviso nelle fasce del planning (M, P, S). Vedi 14 giorni alla volta.

- Bianco = **Libera**; giallo = **Opzione**; verde petrolio = **Confermata**. Sulla cella occupata c'è l'iniziale del titolo dell'evento; passandoci sopra leggi il titolo intero.
- Con **← 7 giorni**, **Oggi**, il calendario e **7 giorni →** ti sposti.
- Clicca una fascia **libera** per prenotarla: sala, giorno e fascia sono già compilati. Serve il permesso **Gestire prenotazioni sale**.
- Clicca una fascia colorata per aprire l'evento.

Se compare *Nessuna sala attiva*, le sale vanno create prima in **Impostazioni › Sale e fasce orarie**.

## Prenotazioni sale

Apri **Ricevimento › Prenotazioni sale** ([Prenotazioni sale](/sale/prenotazioni)). Qui trovi tutti gli eventi, dal più recente, con **Evento**, **Per**, **Date**, **Sale** e **Stato**. Clicca sul titolo per aprirlo.

## Fare una nuova prenotazione di sala

Premi **+ Nuova prenotazione** (o **+ Nuova** nel planning). Serve il permesso **Gestire prenotazioni sale**.

### I dati dell'evento

1. Scrivi il **Titolo dell'evento** (es. Convegno annuale).
2. Scegli lo **Stato**: **Opzione** o **Confermata**. Per l'opzione indica **Opzione valida fino al**.
3. Scegli il **Cliente o azienda**. Se è un cliente esterno nuovo premi **+ Nuovo**, compila la scheda e salva: il cliente viene scelto da solo. I clienti si gestiscono anche in **Anagrafiche › Clienti e aziende**.
4. Oppure, se l'evento è di ospiti già prenotati in camera, scegli **Collegata a prenotazione camere**. Serve almeno uno dei due: cliente o prenotazione.
5. Indica i **Partecipanti** e, se servono, le **Note**.

### Sale e orari

1. Scegli la **Sala** e il **Giorno**.
2. Scegli la **Fascia**, oppure **Orario libero (a ore)** e scrivi **Dalle** e **Alle**.
3. Scegli l'**Allestimento** (o **Nessuno**) e, se in questa sala sono di meno, i **Partecipanti (se diversi)**.

Sotto i campi il programma ti dice subito se la sala è **Libera** e quanto costa, per esempio "Libera · 300,00 € (Fascia Mattina) + allestimento 50,00 €". Se è occupata ti dice da quale evento, compreso il riassetto. Se i partecipanti sono più della capienza compare un avviso giallo **Capienza**.

Per un evento su più giorni:

- **+ Giorno successivo (stessa sala e orario)** aggiunge il giorno dopo;
- **+ Altra sala o orario** aggiunge un'altra riga (es. sala plenaria la mattina e due salette il pomeriggio);
- **Ripeti su più giorni** ripete le stesse sale e orari fino a una data (**Fino al (compreso)**) nei giorni della settimana spuntati. Esempio: una sessione d'esami dal lunedì al venerdì per tre settimane. Il programma conta i giorni prima di salvare.

Premi **Crea prenotazione**. Se anche un solo giorno non è libero, non si prenota niente e il messaggio elenca i giorni occupati.

## La pagina dell'evento

Dall'elenco o dal planning apri l'evento. In alto vedi titolo, stato, cliente o prenotazione collegata, partecipanti e note. Gli avvisi in giallo ti segnalano, per esempio, un'**opzione scaduta** o i **partecipanti oltre la capienza** di una sala.

### Confermare, cambiare, annullare

Premi **Modifica dati, stato o cliente**. Puoi confermare l'opzione, cambiare cliente o partecipanti, oppure scegliere lo stato **Annullata**: le sale si liberano. Premi **Salva**.

Un evento annullato si può riattivare solo se nel frattempo nessun altro ha preso le sue sale.

### Sale e orari

Nella tabella **Sale e orari** ogni riga è una sala in un giorno, con orario, allestimento, partecipanti e prezzi.

- **Modifica**: cambi sala, orario o allestimento. Salvando il prezzo si ricalcola, anche se era stato corretto a mano.
- **Prezzo**: correggi il prezzo di quella sala, per esempio per uno sconto concordato.
- **Togli**: togli la sala dall'evento. L'ultima sala non si toglie: per liberarla annulla la prenotazione.
- **+ Aggiungi giorno, sala o orario**: aggiungi altre righe, anche con la ripetizione su più giorni.

### Servizi

Nella sezione **Servizi** aggiungi coffee break, pranzi, attrezzature.

1. Premi **+ Aggiungi servizio (coffee break, pranzo, attrezzature…)**.
2. Scegli il **Servizio** dal catalogo, oppure **Altro (descrizione libera)** e scrivi la **Descrizione**.
3. Indica **Prezzo unitario**, **Quantità**, **Giorno** e, se vuoi, le **Note**.
4. Premi **Aggiungi**.

Con **Applica un pacchetto** scegli il **Pacchetto**, i **Giorni** (tutti i giorni dell'evento o solo uno) e i **Partecipanti**, poi premi **Applica**. Il programma crea un servizio per ogni riga del pacchetto; i servizi restano modificabili uno per uno e portano il nome del pacchetto. Il totale dell'evento si aggiorna subito.

### Relatori e organizzatori

Nella sezione **Relatori e organizzatori** premi **Aggiungi persona** e compila **Nome e cognome**, **Ruolo** (Relatore, Organizzatore, Tecnico, Altro), **Telefono**, **Email**, **Note** (es. arriva in treno alle 8:30).

Per ogni persona puoi:

- **Collega una prenotazione**: scegli la sua prenotazione di camera o di uso diurno;
- **Uso diurno**: prenoti per lei una camera di giorno, già collegata all'evento.

Esempio: il relatore arriva la mattina dell'esame e riparte la sera. Con **Uso diurno** gli prenoti una camera dalle 9 alle 18.

### Totali e pagamenti

In fondo vedi **Sale e allestimenti**, **Servizi**, **Totale evento**, **Pagato** e **Da pagare** (in rosso se manca ancora qualcosa).

Con il permesso **Registrare pagamenti** premi **Registra pagamento** e scegli il tipo (Caparra confirmatoria, Acconto, Saldo), l'**Importo (€)**, il **Metodo** e una nota (es. numero del bonifico). Premi **Registra**. Un pagamento sbagliato si toglie con **Storna**, scrivendo il motivo. Per un evento annullato già pagato c'è **Registra rimborso**.

## Da sapere

- L'opzione scaduta non libera la sala: devi confermarla o annullarla tu.
- Il riassetto conta sempre: se la Sala Congressi ha 30 minuti di riassetto e un evento finisce alle 13:00, la stessa sala è libera dalle 13:30.
- Chi ha solo **Vedere sale** vede planning, elenco ed eventi, ma non può prenotare né modificare.

## Problemi frequenti

- *Indica il cliente oppure collega una prenotazione di camere.*: scegli almeno uno dei due.
- *La sala … non ha un prezzo per l'orario …*: l'orario non coincide con una fascia a prezzo fisso e la sala non ha il prezzo orario. Chiedi a chi configura le sale di aggiungerlo, oppure scegli una fascia.
- *È l'unica sala dell'evento: per liberarla annulla la prenotazione.*: l'evento deve avere almeno una sala.
- *Indica il numero di partecipanti: il pacchetto ha servizi a persona.*: scrivi i partecipanti prima di premere **Applica**.
