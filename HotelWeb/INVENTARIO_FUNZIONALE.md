# Inventario funzionale — Gestionale Hotel legacy

> Nome cartella/prodotto provvisorio (come per NuovoGestionale, la scelta del nome resta aperta).
> Analisi statica del codice in `C:\sorgenti\_Claude\Hotel` (VB.NET WinForms, ~30 progetti, MySQL).
> Ultimo aggiornamento: 2026-09-25.

Questo documento censisce **cosa fa oggi** ogni modulo del gestionale, le tabelle/regole di dominio
coinvolte e i problemi noti — è materiale per riprogettare schema dati e regole di business da zero,
non una descrizione da portare 1:1 nella riscrittura. Segue lo stesso approccio di
`NuovoGestionale/ARCHITETTURA.md`: prima si capisce cosa c'è, poi si decide cosa tenere.

---

## 1. Cose vere per (quasi) tutti i moduli

Non le ripeto in ogni scheda, valgono come sfondo comune:

- **Connessione duplicata identica in ogni modulo**: credenziali MySQL lette da file `.ini` in
  chiaro nella cartella dell'exe, con password di default hardcoded `"masterkey"` (retaggio
  Firebird) se il file manca.
- **SQL sempre per concatenazione di stringhe**, mai parametrizzato — superficie di SQL injection
  ovunque, oltre a bug di escaping su virgolette/decimali.
- **Flag booleani come stringhe `"si"`/`"no"`** invece di booleani nativi, in praticamente ogni
  tabella.
- **Colori UI (evidenziazione righe/celle) salvati come interi ARGB dentro tabelle di dominio**
  (`ht_carcamere`, `ht_tipicamera`, `ht_predisp`, `coloreGruppo`) — dettaglio di presentazione
  mischiato al dato, da separare.
- **Moduli anagrafici "lookup" quasi identici copiati e incollati**: TipoPren, PartenzePrev,
  PianiCamere, Profili, CarCamere, TipiCamera condividono la stessa struttura CRUD
  codice+descrizione con integrità referenziale verso una singola tabella figlia. Nel nuovo sistema
  è ragionevole diventino un'unica entità "tabella di lookup" generica invece di N moduli paralleli.
- **Nessuna transazione sulle operazioni multi-step**: pattern DELETE+reinsert (config, GesBookingSale,
  storicizzazione prezzi) senza transazione, quindi un errore a metà lascia stato parziale.
- **Codice morto/orfano lasciato nei sorgenti**: form duplicate non più incluse nel `.vbproj`
  (`frmGesstagNicola.vb`, `FrmGesCliSuppl.vb`), cartelle di backup parallele (`Booking_BKUP`,
  `GesCheckout_old`, `AssCamere_20150922`), grandi blocchi di query storiche commentate ("Mimmo
  del ..."). Prima di fidarsi di una funzione va controllato che sia quella davvero in uso.
- **Architettura a processi esterni**: i moduli si lanciano a vicenda con `Process.Start` passando
  parametri da riga di comando (utente, date, filtri) — fragile con caratteri speciali/culture
  diverse, nessuna vera sessione condivisa.

---

## 2. Prenotazioni camere e pricing (nucleo del sistema)

### Booking
Testata prenotazione (`ht_pretescon`): date previste, cliente, listino, trattamento, acconto,
conferma. "Gruppo" è solo un colore (`coloreGruppo`) + nome libero (`NomeGruppo`) sulla testata, non
un'entità — **causa diretta del problema segnalato**: non si può accorciare il soggiorno di un solo
componente del gruppo senza intervenire manualmente su più tabelle. `COD_PRENOT_COLLEGATO` collega
la prenotazione camere a una prenotazione sala (vedi GesBookingSale), non ad altre prenotazioni
camere: non è il meccanismo per gestire gruppi.

### AssCamere
Assegnazione delle camere fisiche alla prenotazione, riga per riga (`ht_asscam`) e generazione delle
righe giornaliere (`ht_occcamera`: una riga per notte/camera/ospite, con prezzo già calcolato e
CCliente proprio). **Il dettaglio a grana fine esiste già nel dato**: ogni notte di ogni ospite è una
riga a sé con la propria data e il proprio prezzo — il problema dello split gruppo è quindi di
UI/processo, non di modello dati minimo. Contiene `calcola_listino`, la funzione di calcolo prezzo
per notte, **duplicata quasi identica in almeno 3 punti del codice** (fix va replicato a mano).

### GenStag (stagionalità/pricing)
`ht_stagionalita`: cardinalità **fissa a 12 stagioni** per combinazione listino/tipo
camera/predisposizione, ciascuna con **fino a 5 intervalli di date** più 2 eccezioni e flag di
esclusione per giorno della settimana. Il controllo di sovrapposizione fra stagioni è presente nel
codice ma **disattivato** (commentato): possono coesistere stagioni con date sovrapposte senza
errore — probabile causa di prezzi "che non tornano". Prezzo finale in `ht_conflistini`
(listino × stagione × tipo camera × trattamento × predisposizione).

### TabLis / Trattamenti / Supplementi
Listini (`ht_listini`), trattamenti pasto (`ht_trattamenti`, con collegamento opzionale a un
articolo per cucina/fatturazione) e supplementi estra (`ht_supplementi`), questi ultimi con prezzo
storicizzato in `LSV` (listino vendite generale condiviso con l'intero gestionale articoli, non
specifico hotel) agganciato al listino base configurato in `ht_config.numListinoBase`.

### GesSupplementi
Addebito operativo di consumi extra al cliente (`ht_suppcam`), con un valore sentinella hardcoded
(camera `"TAPPO"`, prenotazione `999999999`) per gli addebiti senza camera — da sostituire con una
relazione nullable vera. `FlFatturato` ha **tre stati** (`si`/`no`/`me`=parzialmente fatturato), non
solo booleano.

### Config (HtTabCfg)
Parametri globali: articoli pasto di default, tassa di soggiorno (aliquota unica + tetto notti,
vedi §4), listino base, fasce d'età bambino (`ht_arcetabimbi`, che devono restare contigue — validato
a mano con cicli, non con un vincolo DB).

**Domande aperte per questa area:** la sovrapposizione stagioni va bloccata di default nel nuovo
sistema (oggi è permessa per errore, non per scelta)? Il modello "un soggiorno per camera/ospite con
propria data fine" basta a coprire tutti i casi reali di split gruppo che vedete in reception, o ce
ne sono altri (es. cambio camera a metà soggiorno) da considerare?

---

## 3. Camere e planning

### Camere / CamereIndis / CarCamere / TipiCamera / PianiCamere / Predisp
Anagrafica camere (`ht_camere`) con tipo, piano, caratteristica, predisposizione — ognuna di queste
dimensioni è un modulo CRUD quasi identico agli altri (vedi §1). Punto degno di nota: creare una
camera scrive **anche** una riga nella tabella generale articoli (`art`), per renderla vendibile —
accoppiamento implicito con il modulo articoli/listini che va reso esplicito nel redesign, non
riprodotto come side-effect nascosto. Indisponibilità camere (`ht_indispcam`) è modellata
**espandendo ogni intervallo in una riga per giorno** (denormalizzato), con due logiche di
cancellazione incoerenti tra loro (uguaglianza esatta vs. `BETWEEN`) — modello da rifare come
intervallo singolo con vincoli di sovrapposizione.

### GesTableau / stampa_tableu
Vista planning camere × giorni (occupate/libere/indisponibili, colore gruppo, filtro pulizia). Query
centrale enorme con molte versioni storiche commentate.

### Governanti
Solo un'anagrafica piatta di nominativi collegati come "governante di default" alla camera
(`ht_camere.CGovernante`) — **nessuna gestione di turni, reperibilità o storico pulizie**. Lo stato
"da pulire/pulita" è un singolo flag booleano sulla camera, senza data né operatore: chi ha pulito
cosa e quando non è tracciato da nessuna parte. Da riprogettare come vero workflow se serve
tracciabilità (utile anche per un'eventuale app per le cameriere).

**Nota:** il modulo `Profili` (anagrafica profili/etichette cliente) ha classi ed event handler
ancora nominati `FrmGovernanti` internamente — evidente copia-incolla mai ripulita da un altro
modulo, non un bug funzionale ma un indizio che il codice è stato clonato spesso senza pulizia.

---

## 4. Compliance: schedina PS e tassa di soggiorno

### SchedPS / ExportPS / ImpTabPS
Compilazione a video della schedina (con validazione completezza dati anagrafici/documento) e
**export testuale a lunghezza fissa che corrisponde esattamente al tracciato ufficiale Alloggiati
Web** del Ministero dell'Interno (record da 164 caratteri, campi e larghezze verificati nel
codice). Buona notizia: **è implementato correttamente e va riprodotto fedelmente**, non reinventato.
Punti da sistemare: formattazione data non esplicita nel codice (dipende dal formato di visualizzazione
della griglia, fragile), encoding di scrittura file non forzato, nome file di export non ordinabile
cronologicamente. `ImpTabPS` importa le tabelle ufficiali comuni/nazioni/documenti da CSV, senza
transazione (svuota la tabella prima di validare l'intero file).

### stampa_tassa_soggiorno / EsenzioniSogg
Confermato nell'analisi precedente: aliquota flat unica e tetto notti globali, con logica **cucita
sul regolamento di Roma Capitale** (split residenti/non residenti a Roma). `EsenzioniSogg` è solo un
dizionario piatto di codici esenzione (nessuna regola automatica per età/soggiorno). Per rivendere il
prodotto a hotel in altri comuni serve un motore configurabile per comune (aliquota per categoria,
esenzioni per età, tetto notti), non questo report riadattato.

**Domanda aperta:** il tracciato Alloggiati Web è verificato l'ultima volta quando? Andrebbe
ricontrollato contro le specifiche attuali del Ministero prima di darlo per buono (i tracciati
cambiano di tanto in tanto).

---

## 5. Sale meeting/eventi — un secondo motore di booking parallelo

`GesBookingSale`/`TabSale`/`stampa_sale` non sono un'appendice minore: sono **un intero sotto-sistema
di prenotazione parallelo** a quello delle camere, con propria vista Gantt (sale × giorni, 3 fasce
orarie M/P/S che collassano in "Intero" se prenotate tutte), lista d'attesa automatica, noleggio
attrezzature, acconti dedicati e collegamento opzionale a una prenotazione camere collegata
(`COD_PRENOT_COLLEGATO`). Le sale sono modellate **riciclando le tabelle generiche di
magazzino/vendita** (`ART` con categoria hardcoded `'0001'`, `LSV` con listino hardcoded `'SALE'`,
`TIV`, `TMR`, `TUB`) — un accoppiamento improprio col modulo prodotti che andrebbe eliminato dando
alle sale un'entità di dominio propria. Salvataggio con DELETE completo + reinsert (non update),
senza transazione.

**Domanda aperta e rilevante per lo scope:** questa struttura fa banchetti/meeting/eventi oltre alle
camere? Se sì, è nello scope della v1 della riscrittura o si può rimandare a una fase successiva? È
una scelta di perimetro (come per le "fette verticali" di NuovoGestionale), non tecnica.

---

## 6. Cucina e servizi

### GesCucine / stampa_cucine / stampa_servizi_cucine
Pianificazione pasti (colazione/pranzo/cena) per cliente/giorno con **10 tipologie di cella**
(pasto base, variante box, celiaco, colazione rinforzata, menù richiesto, buffet...), vista
"automatica" da prenotazioni più override manuale (`ht_cucina_mod`). L'utente cucina ha permessi di
sola lettura legati al proprio codice utente DB (non a un ruolo). `stampa_cucine` duplica per intero
la logica/query di `GesCucine` (manutenzione doppia). Orari/servizi extra in tabella separata
(`ht_orari_cucine`), con stampa gemella `stampa_servizi_cucine`.

**Attenzione da verificare:** sia `GesCucine`/`stampa_sale` che `GesBookingSale` toccano una tabella
chiamata `ht_buksal`, ma con semantiche apparentemente diverse (booking pasti vs. booking sala) — va
chiarito se è davvero la stessa tabella riusata per due scopi o un'omonimia letta male dagli agenti
di analisi, prima di disegnare lo schema nuovo.

---

## 7. Anagrafica clienti

### Profili / ProfiliCli / ClientiAgg
`Profili`+`ProfiliCli` gestiscono etichette cliente N:N con salvataggio "distruttivo" (cancella
tutto e reinserisce a ogni salvataggio, senza transazione). `ClientiAgg` è la vera estensione
commerciale del cliente: listino personalizzato, trattamento, tipo documento fiscale, esenzione
soggiorno, flag VIP/indesiderato/legge196, dati agente/provvigioni — con generazione codice cliente
via `MAX(codice)+1` (non sicura in concorrenza) e porzioni di logica fatturazione/ricevuta lasciate
commentate/disattivate nel codice, da chiarire con l'utente prima di decidere se servono ancora.

---

## 8. Stampe operative "gemelle" da unificare

`stampa_booking`, `stampa_fermate_partenze`, e la parte "fermate/partenze" duplicata dentro
`GesStampe` condividono la stessa query/logica di dominio ("camera fermata" = presente tra arrivo e
partenza con FLIN=si/FLOUT=no) copiata in 3 punti diversi. Nel nuovo sistema è materiale per un solo
servizio di reportistica, non per 3 export separati. Tutte le stampe sono disegnate a mano con
coordinate pixel fisse (`Graphics.DrawString`), da rifare come report parametrico/PDF.

---

## 9. Modulo vuoto

**Statistiche**: il form esiste ma è completamente vuoto (nessuna query, nessun calcolo). Non c'è
nulla da migrare: reportistica/occupazione/RevPAR va progettata da zero, è un'area di puro scope da
definire con te (cosa vuoi vedere: occupazione %, RevPAR, andamento per tipo camera/canale, ecc.).

---

## 10. Prossimo passo proposto

Con questo quadro, il prossimo passo naturale (stessa sequenza di NuovoGestionale) è **disegnare lo
schema dati da zero**, risolvendo esplicitamente i punti lasciati aperti sopra:
soggiorno-per-ospite come entità di prima classe, tassa di soggiorno parametrica per comune, un solo
motore di calcolo prezzo, lookup table generica al posto degli N moduli anagrafici clonati.

Prima però ci sono alcune domande la cui risposta cambia la forma dello schema — te le giro come
domande mirate.
