# Modello dati — proposta

> Basato su `INVENTARIO_FUNZIONALE.md` e sulle decisioni prese il 2026-09-25:
> sale/eventi in scope da subito; split gruppo deve coprire anche cambio camera e arrivi/partenze
> fuori dalle date originarie; tassa di soggiorno con motore per-comune fin da subito (demo in hotel
> e B&B di Trani, Andria, Bisceglie, Bari).
>
> Questo è un modello concettuale (entità, campi, relazioni, regole), non ancora DDL: serve per
> discutere la forma prima di scriverla.

---

## 1. Principio guida

Il difetto centrale del sistema attuale è che **la prenotazione è un blocco unico e rigido**
(una testata con una data inizio e una data fine), e tutto ciò che si scosta da quel blocco — un
ospite che parte prima, uno che arriva dopo, un cambio camera — non ha un posto dove stare, quindi
si risolve annullando e rifacendo.

La correzione è: **l'unità di soggiorno non è la prenotazione, è il segmento camera-ospite**. Una
prenotazione (o un gruppo) è semplicemente l'insieme dei segmenti che la compongono. Aggiungere,
accorciare, allungare o spostare un ospite è sempre la stessa operazione — chiudere un segmento e/o
aprirne uno nuovo — mai una cancellazione totale.

---

## 2. Entità: Prenotazioni e soggiorni

### Prenotazione (Booking)
Il contenitore commerciale: chi prenota, chi paga, come è arrivata (diretta, telefono, agenzia,
futuro widget web), stato (opzione / confermata / annullata), acconto, note.

- Non contiene più le date di inizio/fine: quelle vivono nei segmenti (vedi sotto). Le date "previste"
  mostrate in agenda sono calcolate come min/max dei segmenti collegati — dato derivato, mai scritto
  a mano in un secondo posto.
- `gruppo_id` opzionale: se valorizzato, la prenotazione fa parte di un gruppo più ampio.

### Gruppo (Group)
Entità di prima classe, non più un colore su un campo. Nome gruppo, referente, eventuale contratto/
convenzione tariffaria. Una prenotazione può stare da sola o appartenere a un gruppo insieme ad altre.
Serve per gestire il caso "un componente arriva dopo" senza forzarlo dentro la prenotazione di
qualcun altro: resta un segmento a sé, collegato allo stesso gruppo.

### Segmento di soggiorno (StaySegment) — l'entità chiave
Una riga = un ospite (o più ospiti che condividono la stessa camera per lo stesso periodo, es. una
coppia) in una camera specifica, per un intervallo di date continuo.

Campi: prenotazione di appartenenza, camera, tipo camera al momento della prenotazione, trattamento,
listino/tariffa applicata, data inizio, data fine, ospiti (adulti/bambini con età), stato (previsto /
in corso / concluso / annullato).

**Come si modellano i casi reali che mi hai indicato:**

| Caso reale | Operazione sul modello |
|---|---|
| Un ospite parte prima del previsto | Si accorcia la data fine del suo segmento; i segmenti degli altri componenti del gruppo restano intatti |
| Un ospite si ferma più a lungo (se c'è disponibilità) | Si allunga la data fine del segmento, previo controllo di disponibilità della stessa camera (o riassegnazione) per le notti aggiuntive |
| Un componente del gruppo arriva a soggiorno iniziato | Si crea un **nuovo segmento**, collegato allo stesso gruppo, con data inizio nel mezzo del periodo del gruppo |
| Cambio camera (o tipo camera) a metà soggiorno | Si **chiude** il segmento corrente (data fine = giorno del cambio) e se ne **apre uno nuovo** nella nuova camera dal giorno successivo, stessa prenotazione/ospite — il conto e lo storico prezzi restano corretti perché ogni segmento ha la propria tariffa |

Nessuno di questi casi richiede annullare la prenotazione: sono tutte modifiche puntuali a uno o più
segmenti, con un controllo di disponibilità esplicito prima di confermare (stesso motore usato per le
nuove prenotazioni, vedi §5).

### Notte (StayNight) — dato derivato, mai fonte di verità
Una riga per notte generata dal segmento, con il prezzo calcolato in quel momento. Serve per i report
(tassa di soggiorno, occupazione, fatturazione) esattamente come oggi `ht_occcamera`, con una
differenza fondamentale rispetto al sistema attuale: **è sempre ricalcolabile dai segmenti e dal
listino attivo**. Se il prezzo di un listino viene corretto retroattivamente, le notti si
rigenerano — non è un dato "scritto una volta e mai più toccato" come oggi.

---

## 3. Camere, tipi, listini — motore prezzi unico

- **Camera**: entità propria, senza il side-effect nascosto di oggi (creare una camera non crea più
  automaticamente un "articolo" di magazzino — se serve un collegamento con la fatturazione sarà un
  riferimento esplicito, non un inserimento parallelo silenzioso).
- **Tipo camera**, **Caratteristica**, **Disposizione/allestimento**: restano dimensioni distinte
  come oggi, ma diventano istanze di un'unica entità generica "attributo camera" configurabile,
  invece di 3 moduli/tabelle quasi identici da mantenere in parallelo.
- **Tariffa stagionale**: sostituisce `ht_stagionalita`. Invece delle 12 stagioni fisse con 5
  intervalli ciascuna, un periodo tariffario è **un intervallo di date qualsiasi**, in numero
  arbitrario, con **sovrapposizioni bloccate per costruzione** (vincolo, non una checkbox
  disattivabile come nel codice attuale — la sovrapposizione oggi è un bug silente, qui deve essere
  impossibile da salvare).
- **Motore di calcolo prezzo**: un solo servizio, richiamato ovunque serva un prezzo (creazione
  segmento, estensione, cambio camera, report) — mai ricalcolato con una copia locale della logica
  come le 3 copie di `calcola_listino` di oggi. Stessa cascata di oggi (listino personalizzato
  cliente → listino gruppo/convenzione → listino base) ma con un log esplicito di quale regola ha
  vinto, cosa che oggi manca e rende difficile capire "perché questo prezzo".

---

## 4. Tassa di soggiorno — motore per comune (prioritario per la demo Puglia)

Sostituisce la logica fissa "Roma Capitale" con un **regolamento configurabile per struttura**,
perché ogni comune (Trani, Andria, Bisceglie, Bari inclusi) ha le proprie regole e possono differire
tutte tra loro.

### Regolamento comunale (Municipal Tax Rule)
Configurato per hotel/struttura (ogni struttura appartiene a un comune), con:
- **Aliquota**: può essere unica o **a scaglioni per categoria della struttura** (stelle/tipologia
  ricettiva) — molti comuni pugliesi differenziano hotel da B&B/affittacamere.
- **Base di calcolo**: per persona per notte pernottata (il caso più comune), con la convenzione
  standard di escludere la notte di partenza — parametrizzabile perché non è garantito sia identico
  ovunque.
- **Tetto notti**: numero massimo di notti tassabili, che può essere per singolo soggiorno o per
  anno solare per persona — i due modelli esistono entrambi nei regolamenti italiani, va reso
  esplicito quale vale per ogni comune configurato.
- **Esenzioni**: elenco configurabile (non fisso come oggi), tipicamente per età (soglia
  configurabile, spesso variabile da comune a comune), motivo (disabilità, forze dell'ordine,
  autisti, guide turistiche...), o categoria cliente.
- **Arrotondamento**: a quanti decimali/centesimi.
- **Validità temporale**: un regolamento ha una data di decorrenza — i comuni li aggiornano, e la
  tassa applicata a un soggiorno passato non deve cambiare se il regolamento cambia dopo.
- **Periodo di applicabilità nell'anno**: alcuni comuni (es. Bisceglie, solo 1 maggio-31 ottobre)
  applicano la tassa solo in una finestra stagionale, altri (es. Bari, Trani) tutto l'anno — va
  modellato come campo esplicito del regolamento, non assunto "sempre attivo" come nel sistema
  legacy. Confermato dalla ricerca sui 4 comuni della demo, vedi `TASSA_SOGGIORNO_PUGLIA.md`.
- **Assenza di regolamento**: un comune può non avere alcuna imposta di soggiorno attiva (è il caso
  di Andria al momento di questa analisi) — il modello deve supportare "nessuna tassa" come stato
  valido per una struttura, non solo tariffe diverse da zero.

Il calcolo per ogni notte (`StayNight`) applica il regolamento attivo alla data di quella notte,
guardando categoria struttura, età/motivo esenzione dell'ospite. Il totale del soggiorno/del periodo
per la reportistica alla Questura/Comune è sempre una somma derivata dalle notti, mai un numero
scritto a mano.

**Prima della demo**: i valori reali (aliquote, categorie, esenzioni, tetto notti) di Trani, Andria,
Bisceglie e Bari vanno presi dai regolamenti comunali ufficiali — non li invento e non li assumo
uguali tra loro. Se vuoi, posso cercarli online adesso e prepararti una configurazione di esempio
realistica per la demo (dimmelo esplicitamente, così sai che sto verificando fonti pubbliche e non
citando a memoria).

---

## 5. Disponibilità — un solo motore, usato ovunque

Ogni operazione che tocca le date di un segmento (nuova prenotazione, estensione, cambio camera,
futura richiesta dal widget web pubblico) passa dallo **stesso controllo di disponibilità**: nessuna
schermata calcola la disponibilità con una propria query come succede oggi in almeno 3 punti diversi
(booking, tableau, stampa fermate/partenze). Questo è anche ciò che rende sicuro estendere un
soggiorno "se c'è disponibilità", come hai detto: il controllo è sempre lo stesso, non una verifica
manuale a occhio da parte della reception.

---

## 6. Sale ed eventi (in scope da subito)

Stessa impostazione concettuale delle camere, ma senza riciclare le tabelle generiche di magazzino
come fa il sistema attuale (`ART`/`LSV` con categoria e listino hardcoded):

- **Spazio/Sala**: entità propria (nome, capienza, dotazioni), non un "articolo".
- **Occupazione sala**: analogo al segmento di soggiorno ma per fasce orarie/giornata intera invece
  che per notti — stesso principio (segmenti che si aprono/chiudono), non delete+reinsert come oggi.
- **Attrezzatura a noleggio**: catalogo proprio, collegato all'occupazione sala.
- Il collegamento opzionale a una prenotazione camere (oggi `COD_PRENOT_COLLEGATO`) resta come
  riferimento esplicito tra un evento e le camere prenotate per i partecipanti.

---

## 6bis. Inserimento ospite in fase di prenotazione — deve restare "free"

Requisito esplicito: anche se l'anagrafica ospiti è ben codificata (tutti i dati di chi ha già
soggiornato), **l'inserimento di una prenotazione in backoffice non deve costringere l'operatore a
passare da una gestione clienti separata**. Il flusso è:

1. L'operatore digita nome/cognome direttamente nella finestra di booking.
2. Il sistema cerca **per frammenti** (like/full-text, non solo uguaglianza) tra gli ospiti già
   censiti e mostra eventuali corrispondenze.
3. Se trova corrispondenze, chiede all'operatore se vuole selezionare un ospite esistente o crearne
   uno nuovo.
4. Se l'operatore sceglie "nuovo", i campi minimi dell'ospite si inseriscono **nella stessa finestra
   di booking**, non in una schermata di gestione clienti a parte.
5. Al salvataggio della prenotazione, il sistema scrive (o aggiorna) il record nell'anagrafica
   ospiti vera e propria — la prenotazione non tiene una copia locale dei dati cliente.

Conseguenza per l'anagrafica ospite (§7): serve un set minimo di campi obbligatori per creare
l'ospite al volo (nome, cognome — il resto, compresi i dati documento richiesti dalla schedina PS,
si completa più avanti, come già succede oggi con SchedPS che segnala i dati mancanti solo al
momento di stampare la schedina). Serve inoltre un endpoint di ricerca ospiti per frammento di testo,
usato dalla UI di booking in tempo reale mentre l'operatore digita.

## 7. Anagrafica ospiti e schedina PS

- **Cliente/Ospite**: un'unica anagrafica (oggi sparsa tra `nom`, `cli`, `ht_clientiagg`), con
  un'estensione per i dati commerciali (listino personalizzato, note, VIP) invece di tabelle
  parallele scollegate.
- **Documento identità/dati PS**: sotto-entità dell'ospite con i campi richiesti dal tracciato
  Alloggiati Web (già verificato corretto nell'inventario) — tipo alloggiato calcolato dal ruolo
  dell'ospite nel segmento/gruppo (singolo, capofamiglia, componente, capogruppo) invece di un campo
  gestito a mano.

---

## 8. Regole non negoziabili (dal giorno 1)

Stesse ragioni di `NuovoGestionale/ARCHITETTURA.md`, applicate qui:

1. Il segmento camera-ospite ha le proprie date: split, estensione, cambio camera sono operazioni di
   dominio esplicite, mai una cancellazione totale.
2. Un solo motore di calcolo prezzo, mai duplicato nelle schermate.
3. Tassa di soggiorno: motore a regole per comune, mai hardcoded su una singola città.
4. Un solo motore di disponibilità, usato da ogni punto che tocca le date (backoffice e futuro
   widget web).
5. Stato derivato (prezzo notte, totale soggiorno, tassa dovuta, date prenotazione) sempre
   ricostruibile dalle regole correnti — mai l'unica fonte di verità.
6. API fin dal primo giorno, multi-hotel per costruzione (`hotel_id` su ogni tabella).

---

## 9. Aperti prima di popolare dati reali

- Valori reali del regolamento tassa di soggiorno per Trani, Andria, Bisceglie, Bari — da verificare
  su fonti ufficiali, non da assumere (vedi §4).
- Confermare se `ht_buksal`, letto sia da GesCucine/stampa_sale sia da GesBookingSale nel sistema
  attuale, è davvero la stessa tabella riusata per due scopi diversi o un'omonimia — non impatta il
  nuovo modello (che separa comunque pasti e sale) ma vale la pena chiarirlo per capire se nel
  sistema attuale c'è già un bug di sovrapposizione dati.
- Verificare il tracciato Alloggiati Web contro le specifiche ministeriali più recenti prima di
  copiarlo (l'inventario lo dà per corretto sulla base del codice, ma i tracciati cambiano nel tempo).
