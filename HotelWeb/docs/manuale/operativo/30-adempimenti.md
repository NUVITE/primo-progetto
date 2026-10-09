---
titolo: Polizia, ISTAT e tassa di soggiorno
ordine: 30
permessi: adempimenti.invia
moduli:
fornitore: no
---

Chi ospita persone deve fare alcune comunicazioni agli enti pubblici: le **schedine alla Polizia**, il **movimento turistico per l'ISTAT** e il **rendiconto della tassa di soggiorno** al Comune. Il programma prepara i dati a partire dai check-in e dai check-out, ti ricorda le scadenze e, dove possibile, invia tutto con un pulsante.

> L'invio lo fai sempre tu: il programma non manda nulla da solo. Questo capitolo spiega cosa fa il programma, non sostituisce le norme né il parere di un consulente. Termini e regole possono cambiare: nel dubbio verifica con la Questura, la Regione o il Comune.

Chi può usare queste pagine: serve il permesso **Inviare schedine e ISTAT**. Per il rendiconto della tassa serve anche **Vedere importi**. Le credenziali dei portali le inserisce chi ha il permesso **Configurare l'hotel**.

## Gli avvisi in cima alle pagine

Chi ha il permesso **Inviare schedine e ISTAT** vede in cima a ogni pagina una barra quando c'è qualcosa da comunicare. La barra si aggiorna a ogni cambio pagina e ogni due minuti.

- **Gialla**: c'è qualcosa da inviare, ma il termine non è passato. Per esempio: "3 schedine di Polizia da inviare — la prima scade tra 5 ore".
- **Rossa**: almeno un termine è già passato. Per esempio: "una è oltre il termine".

Ogni barra ha un pulsante che porta alla pagina giusta: **Vai alle schedine** o **Vai all'ISTAT**.

Per l'ISTAT la barra non compare subito. Con Ross1000 compare quando un giorno è indietro da almeno una settimana o quando il termine è vicino (10 giorni o meno). Con SPOT compare dal 1° del mese successivo, se restano giorni indietro.

## Configurare i collegamenti

Si fa una volta sola, e di nuovo solo quando cambiano le password dei portali. Apri **Impostazioni › Adempimenti (Polizia, ISTAT)** ([Adempimenti](/impostazioni/adempimenti)).

### Alloggiati Web (Polizia)

1. Entra nel portale Alloggiati Web con le credenziali della struttura.
2. Dal menu utente scegli **«Chiave Web Service»** e genera la chiave (se ne può generare una sola al giorno).
3. Nel programma scrivi **Utente**, **Password** e **Chiave Web Service**.
4. Premi **Salva e prova l'accesso**. Se la Polizia accetta, compare "Credenziali salvate: la Polizia ha accettato l'accesso." e la data della verifica.

Più tardi puoi ripetere il controllo con **Prova di nuovo l'accesso**. Le password si salvano cifrate e non vengono mai mostrate: per non cambiarle lascia vuoti i campi.

> Ogni volta che cambi la password del portale Alloggiati Web devi rigenerare la chiave e reinserirla qui, altrimenti l'invio smette di funzionare.

### ISTAT

Il sistema della Regione (**Ross1000** o **SPOT** della Puglia) lo attiva il gestore della piattaforma. Finché non è attivo, la pagina lo dice e non c'è niente da compilare.

- **Primo giorno da comunicare**: il primo giorno che comunicherà HotelWeb. I giorni prima restano quelli già inviati con il vecchio programma o a mano.
- Solo per Ross1000: **Codice struttura**, **Regione (servizio web)**, **Utente di trasmissione** e **Password di trasmissione**. Li rilascia l'ufficio turismo della Regione. Se al portale entri con SPID o CIE, le credenziali di trasmissione vanno chieste a parte.

Premi **Salva**. Per Ross1000 la prova vera è il primo invio dalla pagina ISTAT: la Regione non offre un controllo a parte.

## Schedine di Polizia

La legge chiede di comunicare alla Questura le persone alloggiate. Il programma lo fa con il servizio Alloggiati Web della Polizia di Stato. La pagina è **Ricevimento › Schedine Polizia** ([Schedine Polizia](/schedine)).

### Quali schedine compaiono

Nell'elenco **Da inviare** compaiono le persone **arrivate** (check-in confermato) la cui schedina non è ancora stata comunicata. Per ognuna vedi:

- **Ospite**, con la nota "familiare" o "membro del gruppo" se non è il capofamiglia o il capogruppo;
- **Camera**;
- **Arrivo** e numero di notti;
- **Termine**: per esempio "scade tra 5 ore" (in giallo) o "scaduto da 2 ore" (in rosso);
- **Stato**: **pronta** oppure "mancano: …" con i dati che mancano.

Il programma calcola il termine così: **24 ore dall'arrivo**, oppure **6 ore** se il soggiorno è di una notte sola. L'orologio parte quando confermi l'arrivo al check-in.

*Esempio: la famiglia Verdi fa il check-in alle 15:00 di lunedì per 3 notti. Le schedine scadono martedì alle 15:00. Un ospite di una sola notte arrivato alle 22:00 ha tempo fino alle 4:00.*

### Completare i dati mancanti

Se una persona ha dati mancanti (per esempio il documento o il luogo di nascita), la schedina non si può inviare. Premi **Completa al check-in**: si apre il check-in della camera, dove inserisci i dati.

### Inviare alla Polizia

1. Controlla che le schedine siano **pronte**.
2. Premi **Invia alla Polizia (N)**, dove N è il numero di schedine pronte. Partono tutte insieme.
3. Leggi l'esito: "Inviate 4: 4 accettate dalla Polizia.".

La Polizia accetta solo le righe corrette. Una schedina scartata resta nell'elenco con la scritta "Scartata dalla Polizia:" e il motivo. Correggi i dati al check-in e invia di nuovo.

Se vuoi sapere prima cosa verrebbe scartato, premi **Controlla senza inviare**: la Polizia verifica le schedine **senza trasmetterle**. È utile la prima volta che usi le credenziali vere.

### In alternativa: il file da caricare

Se l'invio diretto non è configurato, o se il servizio della Polizia non risponde:

1. Premi **Scarica il file**. Il programma prepara un file di testo con tutte le schedine pronte.
2. Caricalo sul portale Alloggiati Web.
3. Quando sei sicuro che il portale l'ha accettato, torna nel programma e premi **Sì, segna come inviate**.

> Segna come inviate solo dopo aver controllato sul portale. Il programma non può sapere se il caricamento è andato bene.

### Invii e ricevute

Il riquadro **Invii e ricevute** mostra:

- **Ultimi invii**: data e ora, modalità ("servizio web" o "file caricato"), operatore e quante schedine sono state accettate, per esempio "4 su 5 accettate";
- **Ricevute della Polizia**: un pulsante per ogni giorno, che apre il PDF.

Le ricevute degli invii diretti sono disponibili **dal giorno dopo** e il programma le scarica da solo quando apri la pagina. Per i file caricati a mano la ricevuta si prende dal portale.

> Le ricevute vanno conservate 5 anni.

## ISTAT movimento turistico

Per la statistica la Regione vuole sapere, giorno per giorno, se la struttura era aperta, quante camere erano occupate e quante persone sono arrivate e partite. Il programma lo calcola dai check-in e dai check-out. La pagina è **Ricevimento › ISTAT movimento turistico** ([ISTAT](/istat)).

### Con Ross1000 (per esempio il Lazio)

1. Nel riquadro **Da comunicare** leggi da quale giorno a quale giorno ci sono dati da inviare e il primo termine.
2. Premi **Invia alla Regione (N)**: partono tutti i giorni fino a ieri non ancora comunicati.
3. Leggi l'esito, per esempio "Inviati 6 giorni: 6 accettati per intero.".

Il termine è **la fine del mese successivo**, ma conviene inviare spesso. *Esempio: i giorni di marzo vanno comunicati entro il 30 aprile.*

Se dopo l'invio correggi un check-in, il giorno diventa "cambiato dopo l'invio": basta inviare di nuovo, la Regione sostituisce i dati.

### Con SPOT (Puglia)

SPOT vuole tutti i giorni uno dopo l'altro, senza buchi.

1. Premi **Scarica il file**. Il programma prepara un file con i giorni da comunicare, a partire dal più vecchio.
2. Caricalo sul portale SPOT.
3. Quando il portale l'ha accettato, premi **Sì, segna come caricati**.

Il termine è **il 10 del mese successivo**. Il primo file contiene anche l'"avvio": gli ospiti già presenti la sera prima del primo giorno, come chiede SPOT.

> Se modifichi un giorno già caricato su SPOT, il programma lo segnala ma non lo ricarica: va corretto a mano anche sul portale SPOT.

### Il calendario del mese

Sotto c'è il riquadro del mese, con i pulsanti **Mese prima** e **Mese dopo**. Per ogni giorno fino a ieri vedi:

| Colonna | Cosa vuol dire |
|---|---|
| Camere | Occupate su disponibili (le camere fuori servizio non contano) |
| Letti | Posti letto delle camere disponibili, senza i letti aggiunti |
| Arrivi | Persone arrivate quel giorno |
| Partenze | Persone partite quel giorno |
| Presenti | Persone che hanno dormito in struttura quella notte |
| Stato | da comunicare, comunicato, cambiato dopo l'invio, scarti, dati incompleti |

Nei giorni del calendario di chiusura (si imposta in **Impostazioni › Struttura**) compare "chiuso" e tutto vale zero.

*Esempio: due coniugi arrivano il 10 e partono il 13. Risultano 2 "arrivi" il 10, "presenti" il 10, l'11 e il 12, e 2 "partenze" il 13. Un cambio camera a metà soggiorno non è una nuova partenza.*

Sotto i giorni con problemi il programma scrive cosa non va, per esempio "partenza prevista ma check-out non registrato" oppure "arrivo previsto ma check-in non registrato". Correggi il check-in o il check-out e il giorno si ricalcola.

### Dati incompleti

Un giorno con un ospite senza dati non parte. Con Ross1000 gli altri giorni partono lo stesso; con SPOT il file si ferma al primo giorno incompleto. Il riquadro **Da comunicare** elenca chi completare, con il collegamento alla prenotazione.

## Tassa di soggiorno

Il programma calcola la tassa di soggiorno **per ogni persona e per ogni notte**, secondo il regolamento del Comune dell'hotel. Le regole dei Comuni le inserisce e le aggiorna il fornitore del programma.

### Le regole del tuo Comune

Apri **Ricevimento › Regole tassa di soggiorno** ([Regole tassa di soggiorno](/tassa-soggiorno)). La pagina è in sola lettura e riassume il regolamento in vigore oggi:

- da quando vale e il riferimento all'atto del Comune, con il collegamento alla **Fonte ufficiale** se c'è;
- se si applica tutto l'anno o solo in una stagione;
- se i residenti nel comune sono esclusi;
- la tariffa del tuo hotel, per persona e per notte, e il tetto di notti;
- le **Esenzioni, riduzioni e tetti speciali**, con il documento richiesto;
- **Tutte le tariffe del comune**, per categoria.

Questa pagina serve a sapere cosa chiedere agli ospiti. Se noti qualcosa di diverso dal regolamento del Comune, avvisa il fornitore.

### Come si calcola

Per ogni notte il programma controlla, in quest'ordine:

1. se quel giorno la tassa è in vigore e se è in stagione;
2. se l'ospite è residente nel comune (quando il regolamento lo esclude);
3. l'età, dalla data di nascita: le esenzioni per età sono automatiche, e un compleanno durante il soggiorno conta;
4. le esenzioni dichiarate dall'ospite;
5. il tetto di notti consecutive;
6. il tetto annuo, se previsto;
7. le riduzioni: non si sommano, vale la più favorevole.

Ogni notte riceve un esito: Tassata, Ridotta, Esente, Oltre il tetto di notti, Oltre il tetto annuo, Residente (fuori campo), Fuori stagione, Tariffa mancante.

*Esempio: tassa di 2 € a persona a notte con tetto di 5 notti. Due adulti e un bambino esente per età restano 7 notti. Ogni adulto paga 5 × 2 € = 10 €, il bambino 0 €: in tutto 20 €.*

### Nella prenotazione

Nella prenotazione il riquadro **Tassa di soggiorno** ha una scheda per ogni ospite: notti tassate, esenti, oltre il tetto e il totale (il totale lo vede solo chi ha **Vedere importi**). Con **Notte per notte** vedi l'esito di ogni notte.

Se manca la data di nascita, compare "data di nascita mancante: esenzioni per età non verificabili".

Chi ha il permesso **Gestire prenotazioni** può registrare:

- **Residente nel comune (fuori campo)**;
- **L'ospite rifiuta di pagare**, con una nota: l'imposta resta dovuta e va segnalata al Comune;
- **Notti consecutive già pagate in un'altra struttura subito prima**;
- **Notti già pagate nell'anno**, se il regolamento ha un tetto annuo.

Poi premi **Salva e ricalcola**.

### Registrare un'esenzione dichiarata

Alcune esenzioni richiedono una dichiarazione dell'ospite (per esempio chi accompagna un paziente).

1. Nella scheda dell'ospite premi **Aggiungi esenzione o riduzione**.
2. Scegli il **Motivo**. Il programma mostra il riferimento, il documento richiesto e gli eventuali limiti.
3. Indica il periodo con **Coperta dal** e **Fino al, esclusa** (vuoti = tutto il soggiorno).
4. Scrivi **Tipo documento**, **Estremi** (la copia non si conserva), **Consegnata il** ed eventuali **Note**.
5. Premi **Registra e ricalcola**.

### Chiudere il soggiorno

Finché il soggiorno è aperto la tassa è **provvisoria** e si ricalcola a ogni modifica. Al check-out, quando tutte le camere dell'ospite sono partite, diventa **definitiva** da sola. Puoi anche chiuderla a mano con **Chiudi soggiorno (check-out)** e confermare con **Sì, chiudi**.

Una tassa definitiva si può solo riaprire con **Riapri per rettifica**, scrivendo il motivo. Serve il permesso **Riaprire soggiorni chiusi** e resta traccia di chi e quando.

## Rendiconto tassa di soggiorno

Il Comune chiede di comunicare periodicamente quanti ospiti e quante notti ci sono stati e quanta tassa è stata incassata. La pagina è **Ricevimento › Rendiconto tassa di soggiorno** ([Rendiconto](/rendiconto-tassa)).

### Scegliere il periodo

Il programma apre già l'ultimo periodo concluso, quello da presentare. Il periodo (trimestre o semestre) dipende dal regolamento del Comune. Puoi sceglierne un altro con **Anno** e **Periodo**; c'è anche l'anno intero, per la dichiarazione annuale.

Sotto vedi le date del periodo e la scadenza della comunicazione (e del versamento, se è diversa). Le scadenze vengono dal regolamento del Comune. Un periodo non ancora finito ha l'etichetta "periodo in corso: numeri provvisori".

### Da comunicare al Comune

Il riquadro mostra i numeri da riportare sul portale del Comune:

- **Ospiti**: persone che hanno dormito almeno una notte nel periodo, anche se arrivate prima;
- **Pernottamenti totali**: tutte le notti di tutte le persone, **compresi esenti e residenti**;
- **Pernottamenti tassati** (con quanti ridotti);
- **Imposta dovuta**.

Una notte vale per il periodo in cui cade: un soggiorno a cavallo di due trimestri si divide tra i due.

*Esempio: due coniugi dal 30 marzo al 2 aprile. Nel 1° trimestre: 2 ospiti e 4 pernottamenti (30 e 31 marzo). Nel 2° trimestre: 2 ospiti e 2 pernottamenti (1 aprile).*

Sotto trovi le **Esenzioni per motivo** e le **Altre notti non tassate**. Se qualcuno ha rifiutato di pagare, un avviso dice quanto va segnalato al Comune e quanto resta **da versare**.

Con **Elenco ospiti (Excel)** scarichi l'elenco degli ospiti del periodo; con **Stampa / PDF** stampi la pagina.

### Riconciliazione con le schedine di Polizia

Il Comune può confrontare i tuoi numeri con quelli delle schedine. I numeri spesso non coincidono, e il programma spiega perché, ospite per ospite:

- la schedina dichiara all'arrivo i **giorni previsti** e non si corregge: se l'ospite parte prima, i numeri restano diversi;
- le notti esenti o oltre il tetto ci sono per la Polizia ma non sono tassate.

*Esempio: schedina con 5 giorni, ospite partito dopo 3 notti, bambino esente. Polizia 5, effettive 3, tassate 0. Causa: partenza anticipata ed esenzione per età.*

Per ogni soggiorno vedi **Polizia**, **Effettive**, **Tassate** e **Perché**. La spunta **Mostra solo i soggiorni con differenze** è attiva all'inizio. Qui contano i soggiorni arrivati nel periodo, interi, come fa la Questura.

## Da sapere

- Le schedine compaiono solo per le persone di cui hai **confermato l'arrivo** al check-in: un check-in dimenticato vuol dire una schedina che non compare. Anche i numeri ISTAT si basano sui check-in e check-out registrati.
- I dati ISTAT si comunicano fino a **ieri**: il giorno in corso non è ancora finito.
- Il programma conserva per ogni ospite i giorni dichiarati alla Polizia: servono alla riconciliazione del rendiconto.
- Il rendiconto non sa se l'hai già presentato al Comune: a termine passato scrive solo "Termine era il …".

## Problemi frequenti

- **"L'invio diretto non è ancora configurato"**: mancano le credenziali di Alloggiati Web. Nel frattempo usa **Scarica il file**.
- **"La Polizia non accetta le credenziali"**: se avete cambiato la password del portale, rigenerate la chiave Web Service e aggiornatela in **Impostazioni › Adempimenti (Polizia, ISTAT)**.
- **"Il servizio della Polizia non risponde"**: riprova tra poco oppure usa **Scarica il file** e caricalo sul portale.
- **Una schedina resta "mancano: …"**: apri **Completa al check-in** e inserisci i dati richiesti.
- **"La Regione ha rifiutato le credenziali"**: controlla utente e password di trasmissione in **Impostazioni › Adempimenti (Polizia, ISTAT)**.
- **Nel rendiconto "notti non hanno la tassa calcolata"**: manca il regolamento per quelle date o la tariffa per la categoria dell'hotel. Avvisa il fornitore prima di presentare il rendiconto.
- **"Per il rendiconto della tassa serve anche il permesso «Vedere importi»"**: chiedi all'amministratore di aggiungerlo al tuo ruolo.
