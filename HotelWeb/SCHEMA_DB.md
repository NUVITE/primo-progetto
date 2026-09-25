# Schema dati — bozza concreta

> Traduce `MODELLO_DATI.md` in tabelle/campi concreti. È ancora una bozza da discutere, non DDL
> definitivo da eseguire: nomi ed esatti tipi si affinano quando si scrive la prima fetta verticale.
> Convenzioni valide per tutte le tabelle salvo dove indicato diversamente.

## Convenzioni

- Chiave primaria `id` (intero autoincrementale), tranne dove serve un codice leggibile (es. codice
  camera) — in quel caso il codice resta comunque affiancato da un `id` tecnico, per non ripetere
  l'errore del sistema legacy dove il numero di documento/codice è anche la chiave (vedi regola
  NuovoGestionale §6.1: numero e chiave tecnica sono cose diverse).
- Ogni tabella "di dominio" (non le pure lookup globali) ha `hotel_id` — multi-tenant a schema
  condiviso come deciso.
- Ogni tabella ha `creato_il`, `creato_da`, `modificato_il`, `modificato_da` — tracciamento
  obbligatorio fin dal giorno 1 (non si aggiunge a posteriori, stessa ragione di NuovoGestionale §6.3).
- Nessun campo booleano come stringa "si"/"no": booleano vero.
- Nessun colore ARGB dentro tabelle di dominio: la colorazione UI è responsabilità del front-end
  (es. colore assegnato per tipo/categoria a livello di configurazione UI, non di dato).

---

## 1. Struttura e anagrafiche camere

**hotel** — id, ragione_sociale, comune_istat (FK verso comune per la tassa di soggiorno), categoria
(stelle/tipologia ricettiva, serve per gli scaglioni tassa/listino), indirizzo, dati fiscali.

**comune** — id, codice_istat, nome, provincia. Tabella di riferimento nazionale, non per-hotel.

**camera** — id, hotel_id, codice (numero/nome camera), tipo_camera_id, piano_id, capienza_adulti,
capienza_bambini, attivo (per "camera fuori uso permanentemente", diverso da indisponibilità
temporanea sotto).

**tipo_camera**, **caratteristica_camera**, **piano**, **predisposizione** — quattro tabelle di
lookup semplici (id, hotel_id, codice, descrizione), collegate a `camera` con relazioni N:N dove
serve (una camera può avere più caratteristiche). Nel legacy erano 4 moduli quasi identici: qui
restano 4 tabelle perché il dominio è comunque diverso (piano ≠ caratteristica ≠ predisposizione),
ma condividono lo stesso componente UI generico di gestione lookup.

**camera_indisponibilita** — id, camera_id, dal, al (intervallo vero, non espanso giorno per giorno
come nel legacy), motivo, note. Vincolo: nessuna sovrapposizione di intervalli per la stessa camera
(enforced, non una funzione disattivabile).

---

## 2. Ospiti e documenti PS

**ospite** — id, hotel_id (o globale se si vuole un'anagrafica condivisibile tra strutture dello
stesso gruppo — da decidere quando serve), cognome, nome, data_nascita, sesso, comune_nascita_id,
nazione_nascita_id, cittadinanza_id, tipo_documento_id, numero_documento, comune_rilascio_id,
listino_personalizzato_id (nullable), note, flag_vip, flag_indesiderato.

Sostituisce la tripla legacy `nom`/`cli`/`ht_clientiagg`: un'unica anagrafica invece di tre tabelle
scollegate.

**ospite_esenzione_tassa** — id, ospite_id, motivo_esenzione_id, data_inizio, data_fine (nullable),
riferimento (es. numero verbale invalidità, se richiesto dal regolamento). Un'esenzione è legata
all'ospite, non a un flag sulla singola notte come nel legacy — più facile da riusare su soggiorni
diversi dello stesso ospite.

**export_ps** — id, hotel_id, periodo_dal, periodo_al, file_generato, generato_il, generato_da. Log
degli export Alloggiati Web effettuati — nel legacy l'unica traccia era un flag booleano
`FlInviata`, qui resta uno storico completo.

---

## 3. Prenotazioni, gruppi, soggiorni

**gruppo** — id, hotel_id, nome, referente_ospite_id (nullable), note, convenzione_tariffaria_id
(nullable, per un listino di gruppo dedicato).

**prenotazione** — id, hotel_id, gruppo_id (nullable), ospite_prenotante_id, ospite_pagante_id,
canale (diretta/telefono/agenzia/widget-web — enum aperto), stato (opzione/confermata/annullata),
data_creazione, acconto_richiesto, acconto_ricevuto, note. **Non contiene date di
inizio/fine**: quelle sono calcolate dai segmenti collegati.

**segmento_soggiorno** — id, prenotazione_id, camera_id, ospite_id, tipo_camera_id (congelato al
momento della creazione, indipendente da eventuali modifiche future al tipo camera), trattamento_id,
listino_id, data_inizio, data_fine, stato (previsto/in_corso/concluso/annullato),
segmento_precedente_id (nullable — collega un cambio-camera al segmento che lo precede, per
ricostruire la storia di un ospite che ha cambiato stanza).

**notte_soggiorno** — id, segmento_id, data, prezzo, motivo_prezzo (quale regola ha vinto: listino
base/personalizzato/gruppo — tracciato esplicitamente, cosa che nel legacy mancava). Rigenerabile:
se il listino cambia retroattivamente, queste righe si ricalcolano, non sono l'unica fonte di verità
sul prezzo (il prezzo "vero" è la regola + la data, questa tabella è una cache per i report).

---

## 4. Listini e tariffe

**listino** — id, hotel_id, codice, descrizione, tipo (base/personalizzato/gruppo), listino_padre_id
(nullable, per i listini bambino agganciati a un listino adulto come nel legacy, ma esplicito).

**fascia_eta_bambino** — id, hotel_id, eta_da, eta_a, listino_id. Vincolo di non sovrapposizione
enforced (nel legacy era un controllo manuale a cicli).

**periodo_tariffario** — id, listino_id, tipo_camera_id, predisposizione_id (nullable), dal, al,
esclusioni_giorno_settimana (bitmask o tabella figlia, es. "escluso sabato"). **Numero di periodi
per listino/tipo camera libero** (non più fisso a 5+2 come `ht_stagionalita`), sovrapposizioni
bloccate per costruzione.

**prezzo_periodo** — id, periodo_tariffario_id, trattamento_id, prezzo. Sostituisce
`ht_conflistini`.

---

## 5. Tassa di soggiorno

**regolamento_tassa_comune** — id, comune_id, categoria_struttura (nullable = vale per tutte le
categorie, altrimenti riferimento a una scala categoria/stelle), aliquota, base_calcolo
(per_persona_per_notte è il default), tetto_notti, tetto_notti_tipo (per_soggiorno /
per_anno_solare), periodo_validita_dal, periodo_validita_al (validità del regolamento nel tempo, per
non alterare il calcolo di soggiorni passati), stagionalita_dal, stagionalita_al (nullable = tutto
l'anno; valorizzato per casi come Bisceglie, solo maggio-ottobre), arrotondamento_decimali.

**motivo_esenzione_tassa** — id, comune_id (o globale + override per comune), codice, descrizione,
eta_soglia (nullable, per le esenzioni per età, che variano da comune a comune — vedi
`TASSA_SOGGIORNO_PUGLIA.md`: 12 a Bisceglie, 16 a Trani, discordante a Bari).

**tassa_notte** — id, notte_soggiorno_id, regolamento_id, importo, esente (bool), motivo_esenzione_id
(nullable). Calcolato dal motore tassa applicando il regolamento attivo alla data della notte più
l'anagrafica/esenzioni dell'ospite — mai un totale scritto a mano.

---

## 6. Sale ed eventi

**sala** — id, hotel_id, nome, capienza, note. Entità propria, non un "articolo" di magazzino.

**occupazione_sala** — id, sala_id, prenotazione_sala_id, data, fascia (mattina/pomeriggio/sera/
intera_giornata), stato. Stesso principio del segmento soggiorno (si apre/chiude, non
delete+reinsert).

**prenotazione_sala** — id, hotel_id, gruppo_id (nullable), ospite_id, prenotazione_camere_id
(nullable — collega l'evento a eventuali camere prenotate per i partecipanti, sostituisce
`COD_PRENOT_COLLEGATO`), stato, acconto.

**attrezzatura** — id, hotel_id, codice, descrizione, prezzo. Catalogo proprio (non più `ART`/`LSV`
riciclate).

**attrezzatura_noleggiata** — id, occupazione_sala_id, attrezzatura_id, quantita, prezzo_applicato,
fatturato (bool).

---

## 7. Volutamente fuori da questa prima bozza

Non ancora modellato, da affrontare quando si arriva alla fetta verticale corrispondente (stesso
metodo di NuovoGestionale — non si disegna tutto prima di costruire nulla):

- **Fatturazione/incassi**: come una notte_soggiorno o un'attrezzatura_noleggiata diventa una riga di
  fattura/ricevuta. **Requisito già fissato per quando ci si arriva**: invio fattura elettronica via
  FTPA (Tosnet) come in NuovoGestionale, **oppure**, a scelta del cliente struttura, generazione del
  solo file XML della fattura che il cliente importerà nel portale SDI che preferisce — quindi il
  motore fatture deve poter produrre l'XML come output indipendente dal canale di invio, non solo
  come passo interno prima di spedire via FTPA.
- **Utenti e permessi**: chi può fare cosa (es. l'utente-cucina in sola lettura del legacy diventerà
  un vero ruolo, non un confronto sul nome utente DB).
- **Governanti/pulizie**: nel legacy è solo un flag booleano sulla camera. Se vuoi tracciare
  davvero chi ha pulito cosa e quando (utile anche per una futura app dedicata alle cameriere), è
  un'area da progettare a parte — per ora lascio solo il flag booleano ereditato dal legacy su
  `camera` (`da_pulire`) senza storicizzarlo, salvo tua indicazione diversa.
- **Statistiche/report**: il legacy non ha nulla da cui partire (modulo vuoto) — struttura dati per
  occupazione/RevPAR da disegnare quando arriviamo lì.

---

## Prossimo passo

Con questo schema si può iniziare la **prima fetta verticale completa**: probabilmente "crea una
prenotazione, assegna una camera, genera le notti con il prezzo, calcola la tassa di soggiorno" —
attraversa già booking, camere, listini e tassa di soggiorno in un colpo solo, esattamente come
indicato per NuovoGestionale (la prima fetta tocca tutte le aree, non si costruisce un'area alla
volta). Fammi sapere se questa è la fetta giusta da cui partire o se preferisci iniziarne un'altra.
