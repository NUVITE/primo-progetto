# Alloggiati Web e rilevazione ISTAT (Ross1000 / SPOT): specifiche per il check-in

Ricerca del 29/09/2026. Legenda per ogni dato:

- **[UFF]** = confermato da fonte ufficiale (link indicato)
- **[SEC]** = solo fonte secondaria (link indicato), da verificare
- **[NT]** = non trovato

I documenti ufficiali citati sono stati scaricati e letti per intero (PDF convertiti in testo, CSV e XSD aperti), non riassunti da motori di ricerca.

---

## 1. ALLOGGIATI WEB (Polizia di Stato, art. 109 TULPS)

### 1.1 Fonti ufficiali usate

| Documento | Link | Note |
|---|---|---|
| Manuale Utente ("Guida Servizio Alloggiati Web", 35 pag., cap. 12 "File tracciato record") | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Download/Manuali/MANUALEALBERGHI.pdf | linkato da SupManuali.aspx; senza data di revisione |
| Manuale Web-Services "WS_ALLOGGIATI – Documento di Descrizione" Rev. 01 del 24/01/2022 (21 pag.) | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Download/Manuali/MANUALEWS.pdf | è l'ultima versione pubblicata sul portale |
| Pagina manuali | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/SupManuali.aspx | |
| Pagina tabelle | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Tabelle.aspx | |
| FAQ del portale | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/FAQ.aspx | |
| WSDL del servizio | https://alloggiatiweb.poliziadistato.it/service/service.asmx?wsdl | scaricato e letto |
| Art. 109 TULPS aggiornato (con note) – Questura | https://questure.poliziadistato.it/statics/05/art.109-tulps-aggiornato.pdf?lang=it | |

### 1.2 Il tracciato è ancora quello? SÌ, è identico

Il record del vecchio gestionale corrisponde **esattamente** al tracciato attuale **[UFF]** (manuale utente cap. 12 e manuale WS cap. 4, "Tabella 1"). Non risultano campi aggiunti. Totale 168 caratteri di dati + CR LF (170 per riga), tranne l'ultima riga che non ha CR LF.

| # | Campo | Da | A | Lung. | Tipi 16-17-18 | Tipi 19-20 | Vincoli / formato |
|---|---|---|---|---|---|---|---|
| 1 | Tipo alloggiato | 0 | 1 | 2 | Obbl. | Obbl. | Codice tabella Tipi Alloggiato |
| 2 | Data arrivo | 2 | 11 | 10 | Obbl. | Obbl. | `gg/mm/aaaa`; solo oggi o ieri |
| 3 | Giorni permanenza | 12 | 13 | 2 | Obbl. | Obbl. | massimo 30 gg |
| 4 | Cognome | 14 | 63 | 50 | Obbl. | Obbl. | allineato a sinistra, riempito di spazi |
| 5 | Nome | 64 | 93 | 30 | Obbl. | Obbl. | riempito di spazi |
| 6 | Sesso | 94 | 94 | 1 | Obbl. | Obbl. | `1` = M, `2` = F |
| 7 | Data nascita | 95 | 104 | 10 | Obbl. | Obbl. | `gg/mm/aaaa` |
| 8 | Comune nascita | 105 | 113 | 9 | Obbl. se nato in Italia | Obbl. se nato in Italia | codice tabella Comuni; 9 spazi se nato all'estero |
| 9 | Provincia nascita | 114 | 115 | 2 | Obbl. se nato in Italia | Obbl. se nato in Italia | sigla (Roma = `RM`); 2 spazi se estero |
| 10 | Stato nascita | 116 | 124 | 9 | Obbl. | Obbl. | codice tabella Stati (anche per l'Italia: `100000100`) |
| 11 | Cittadinanza | 125 | 133 | 9 | Obbl. | Obbl. | codice tabella Stati |
| 12 | Tipo documento | 134 | 138 | 5 | Obbl. | **spazi** | codice tabella Documenti |
| 13 | Numero documento | 139 | 158 | 20 | Obbl. | **spazi** | riempito di spazi |
| 14 | Luogo rilascio documento | 159 | 167 | 9 | Obbl. | **spazi** | codice Comune se rilasciato in Italia, altrimenti codice Stato |

Regole generali **[UFF]** (manuale utente cap. 12):
- file di testo con **codifica UTF-8**, **massimo 1000 righe**, una riga per alloggiato;
- i primi 11 campi (134 caratteri) sono obbligatori per tutti i tipi; i 3 campi del documento (34 caratteri) solo per 16/17/18, mentre per 19/20 vanno messi 34 spazi;
- familiari e membri del gruppo vanno scritti **nelle righe subito dopo** il relativo capofamiglia o capogruppo;
- nell'inserimento manuale sul portale la data di arrivo può essere solo quella di oggi o di ieri, e la permanenza al massimo 30 giorni.

**Variante "File Unico – Gestione Appartamenti"** [UFF] (manuale utente cap. 12.1, manuale WS "Tabella 2"): stesso record + **IdAppartamento** (6 caratteri, posizioni 168-173), per un totale di 174 caratteri (176 con CR LF). Vale solo per le utenze di categoria "Gestione Appartamenti" (locazioni brevi). Per un hotel serve il tracciato standard a 168 caratteri.

Nota: un risultato di ricerca web parlava di "188 caratteri". Nei manuali ufficiali attuali questo numero non compare: i valori sono 168/170 e 174/176. Da considerare un errore della fonte secondaria.

Tabella di confronto con il vecchio gestionale:

| Vecchio gestionale | Tracciato ufficiale | Esito |
|---|---|---|
| tipoAlloggiato(2) | 2 | uguale |
| dataArrivo(10) | 10 | uguale |
| giorniPermanenza(2) | 2 | uguale |
| cognome(50) | 50 | uguale |
| nome(30) | 30 | uguale |
| sesso(1) | 1 | uguale |
| dataNascita(10) | 10 | uguale |
| comuneNascita(9) | 9 | uguale |
| provinciaNascita(2) | 2 | uguale |
| statoNascita(9) | 9 | uguale |
| cittadinanza(9) | 9 | uguale |
| tipoDocumento(5) | 5 | uguale |
| numeroDocumento(20) | 20 | uguale |
| luogoRilascio(9) | 9 | uguale |

**Differenze rispetto al vecchio modo di lavorare:** il tracciato non è cambiato. La novità è il canale di invio: esiste un **web service SOAP ufficiale con token** (§1.5), che accetta le stesse righe da 168 caratteri.

### 1.3 Codici tipo alloggiato **[UFF]**

Presi dalla tabella scaricata il 29/09/2026 (`tipo_alloggiato.csv`):

| Codice | Descrizione | Documento obbligatorio |
|---|---|---|
| 16 | OSPITE SINGOLO | sì |
| 17 | CAPO FAMIGLIA | sì |
| 18 | CAPO GRUPPO | sì |
| 19 | FAMILIARE | no (34 spazi) |
| 20 | MEMBRO GRUPPO | no (34 spazi) |

Tutti gli altri campi (anagrafica, nascita, cittadinanza) sono obbligatori anche per 19 e 20 [UFF].

### 1.4 Tabelle di riferimento **[UFF]**

**Sono pubbliche, senza login.** Si scaricano dalla pagina Tabelle.aspx con questi link diretti:

| Tabella | URL | Nome file | Righe (29/09/2026) | Colonne |
|---|---|---|---|---|
| Comuni | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/ashx/Download.ashx?ID=0&N=COMUNI | comuni.csv | 11.294 righe di dati | `Codice,Descrizione,Provincia,DataFineVal` |
| Stati | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/ashx/Download.ashx?ID=1&N=STATI | stati.csv | 236 | `Codice,Descrizione,Provincia,DataFineVal` (Provincia = `ES`) |
| Documenti | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/ashx/Download.ashx?ID=2&N=DOCUMENTI | documenti.csv | 95 | `Codice,Descrizione` |
| Tipo alloggiato | https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/ashx/Download.ashx?ID=3&N=TIPO_ALLOGGIATO | tipo_alloggiato.csv | 5 | `Codice,Descrizione` |

Formato verificato sui file scaricati:
- separatore **virgola**, riga di intestazione, fine riga **CRLF**, nessun delimitatore di testo;
- nei file di oggi ci sono solo caratteri **ASCII**: le descrizioni sono in maiuscolo e usano l'apostrofo al posto dell'accento (es. `CARTA DI IDENTITA'`). La codifica ufficiale non è dichiarata, quindi conviene leggerli come UTF-8;
- `DataFineVal` è vuoto se il codice è valido, altrimenti vale `gg/mm/aaaa hh:mm:ss`. Nei comuni ci sono 3.396 righe cessate e 7.898 valide; negli stati 4 cessati (es. CECOSLOVACCHIA, MACEDONIA 13/02/2019).
- **Comuni soppressi e cambi di provincia:** nella tabella restano con la data di fine validità, e lo stesso nome può comparire con più codici. Esempio che riguarda i clienti BAT: `ANDRIA,BA` (416072005) cessato il 26/07/2009 e `ANDRIA,BT` (416110001) valido; lo stesso vale per BARLETTA e TRANI. Conseguenze per il software:
  - per il **luogo di nascita** si deve poter scegliere il codice valido **alla data di nascita**, anche se oggi è cessato. È un'inferenza logica: il manuale non lo dice esplicitamente [NT come regola scritta];
  - per il **luogo di rilascio** e per la **residenza** si usano i codici validi oggi;
  - la ricerca va fatta per nome + provincia + validità, non solo per nome.
- Codici utili: ITALIA = `100000100` [UFF, stati.csv]; ROMA = `412058091`, BARI = `416072006` [UFF, comuni.csv].

**Tramite web service** [UFF, manuale WS §3.2 e metodo `Tabella`]: con il metodo `Tabella` si scaricano `Luoghi`, `Tipi_Documento`, `Tipi_Alloggiato`, `TipoErrore` e `ListaAppartamenti`. Il CSV restituito usa come separatore il **punto e virgola** `;`, diverso dalla virgola dei file pubblici. Il WSDL non ha una tabella "Stati" separata: probabilmente "Luoghi" contiene comuni e stati insieme [inferenza, non verificata perché serve un token].

Aggiornamento automatico delle tabelle: **[NT]** non è pubblicata una data o una frequenza. Conviene riscaricarle periodicamente, ad esempio ogni settimana, con un job.

### 1.5 Web service ufficiale **[UFF]** (manuale WS Rev. 01 del 24/01/2022 + WSDL)

- Base normativa: art. 5 c. 1-bis DL 53/2019 e DM Interno 16/09/2021 (G.U. 14/10/2021), in vigore dal 12/01/2022 per collegare i gestionali direttamente al sistema.
- Tipo: **SOAP 1.2**. Endpoint `https://alloggiatiweb.poliziadistato.it/service/service.asmx`, namespace `AlloggiatiService`.
- Autenticazione:
  1. il gestore genera una **WSKEY** dal portale, nel menu utente alla voce "Chiave Web Service";
  2. `GenerateToken(Utente, Password, WsKey)` restituisce un token con `issued` e `expires`;
  3. le altre chiamate usano `Utente` + `token`.
  Si può generare una sola nuova WSKEY al giorno, e **a ogni cambio password va rigenerata** [UFF, manuale utente cap. 10]. HotelWeb dovrà quindi conservare utente, password e WSKEY di ogni struttura (cifrati) e gestire il rinnovo.
- Metodi (dal WSDL):
  - `GenerateToken`, `Authentication_Test`;
  - `Test` (solo controllo) e `Send` (controllo + invio): input `ElencoSchedine` = lista di stringhe, ognuna una riga del tracciato a 168 caratteri. Restituiscono `ElencoSchedineEsito` con `SchedineValide` e l'esito riga per riga (`esito`, `ErroreCod`, `ErroreDes`, `ErroreDettaglio`). **Vengono acquisite solo le schedine corrette**, quindi le righe scartate vanno gestite;
  - `Ricevuta(Data)`: PDF della ricevuta, disponibile per gli ultimi 30 giorni, escluso oggi. Le ricevute vanno **conservate 5 anni** [UFF, FAQ];
  - `Tabella(tipo)`;
  - metodi `GestioneAppartamenti_*` per le locazioni brevi (non servono agli hotel).
- Ambiente di test separato: **[NT]**. L'unico strumento di prova indicato è il metodo `Test`, che valida le righe senza inviarle.

### 1.6 Termini di invio **[UFF]**

Art. 109 c. 3 TULPS, testo vigente: la comunicazione va fatta **entro 24 ore dall'arrivo** e, **per i soggiorni non superiori a 24 ore, entro 6 ore dall'arrivo**. La regola delle 6 ore è stata introdotta dall'art. 5 c. 1 DL 53/2019, in vigore dal 12/01/2022 (fonte: nota 228/230 del PDF Questura sopra). Anche il manuale utente riporta 24 h / 6 h.

- Un blog commerciale sostiene che un "Decreto Sicurezza 2025" abbia esteso le 6 ore alle locazioni turistiche **[SEC, non confermato]**: https://www.lodgify.com/blog/it/alloggiati-web/ . Nel testo ufficiale dell'art. 109 che ho consultato questa estensione non c'è. Da verificare prima di usarla come regola.
- Obbligo esteso alle locazioni sotto i 30 giorni (art. 19-bis DL 113/2018) [UFF, FAQ portale].

---

## 2. RILEVAZIONE MOVIMENTO TURISTICO ISTAT (Ross1000 e sistemi regionali)

### 2.1 Quale sistema in quale regione

**Regioni che usano Ross1000 / Turismo5** (elenco endpoint ufficiale nel tracciato Ross1000 v3 del 18/03/2026) **[UFF]**:
- Piemonte
- Toscana, solo Città Metropolitana di Firenze e province di Pistoia e Prato
- Abruzzo
- Veneto
- Emilia-Romagna
- Marche
- Lombardia
- Calabria
- Sardegna
- Liguria
- Basilicata (endpoint `checkinV1` su turitweb)
- **Lazio**
- Molise

Fonte: https://www.ross1000.it/source/tracciato-xml.pdf (pag. 19).

**LAZIO → Ross1000 ("Ross 1000-Lazio")** **[UFF]**
- Pagina Regione Lazio: https://www.regione.lazio.it/cittadini/turismo/studi-innovazione-statistica. Riporta che tutti i gestori comunicano arrivi e presenze "attraverso il sistema informatico regionale, denominato Ross 1000-Lazio", con compilazione online del modello ISTAT C/59 oppure importazione di file XML dal gestionale.
- Portale: https://lazioturismo.ross1000.it (accesso SPID). Endpoint web service: `https://lazioturismo.ross1000.it/ws/checkinV2?wsdl` [UFF, tracciato v3].
- Termine per l'invio: art. 28 L.R. Lazio 13/2007, "entro e non oltre il mese successivo dall'arrivo del cliente" [UFF, pagina Regione Lazio].
- Passaggio da RADAR a Ross1000 per i flussi ISTAT dal 21/05/2025, con RADAR attivo fino al 30/03/2025 **[SEC]**: https://chekin.com/it/blog/ross1000-lazio/ . Sul sito ross1000.it c'è la conferma ufficiale che la banca dati nasce "dall'integrazione tra i sistemi ROSS 1000 e Radar" (evento dell'11/03/2025): https://www.ross1000.it/it/ross-1000-e-regione-lazio-nuova-banca-dati-per-il-turismo.php . La data esatta del 21/05/2025 **non l'ho trovata in una fonte ufficiale**.

**PUGLIA (Bari e BAT) → NON Ross1000: usa SPOT** ("Sistema Puglia per l'Osservatorio Turistico"), dentro il **DMS Puglia** (www.dms.puglia.it, gestito dall'Agenzia regionale del turismo Pugliapromozione / InnovaPuglia) **[UFF]**
- Manuale SPOT Online 2025 vers. 1 (09/25): https://info.ect.regione.puglia.it/wp-content/uploads/2025/10/Manuale-di-utilizzo-di-SPOT-Online_2025-vers.1_09_25-1.pdf
- Specifiche per software house "SPOT Modalità Online – Specifiche del sistema" Ver. 1.0 del 13/02/2020: https://aret.regione.puglia.it/documents/34206/0/Spot+online+specifiche.pdf/573d004d-4a54-6f13-7c86-2560977a1304
- XSD `movimentogiornaliero-0.6.xsd` e `datatype-0.6.xsd`, più un XML di esempio, nella pagina https://aret.regione.puglia.it/en/come-fare-per/dettaglio-ambito/-/asset_publisher/oE36UdluCV87/content/ambito-spot
- Base normativa: L.R. Puglia 49/2017. Invio **entro il giorno 10 di ogni mese** per il mese precedente [UFF, manuale 2025].
- Canali: upload del file XML su SPOT Online (accesso SPID/CIE al DMS) oppure inserimento manuale. Web service per l'invio automatico da gestionale: **[NT]**, nei documenti ufficiali trovati c'è solo l'upload del file.
- Prerequisito: SPOT si attiva solo dopo che la struttura ha inviato la Comunicazione Prezzi e Servizi (CPS) sul DMS [UFF].

Nomi dei sistemi delle regioni non elencate sopra (Campania, Sicilia, Umbria, Friuli, Trentino-Alto Adige, Valle d'Aosta, resto della Toscana): **[NT]**, non ricercati perché fuori dal perimetro Lazio/Puglia.

### 2.2 Tracciato Ross1000 (vale per il Lazio) **[UFF]**

Fonte: "Tracciato record di integrazione dati (XML) – Istruzioni per le software house", **Versione 3 del 18/03/2026**, https://www.ross1000.it/source/tracciato-xml.pdf . Esiste anche un tracciato TXT (https://www.ross1000.it/source/tracciato-txt.pdf, non letto) e il sito indica l'XML come "scelta consigliata". La versione 2.4 del 29/09/2021, pubblicata dall'Emilia-Romagna, ha gli stessi elenchi di codici. Il documento è unico per tutte le regioni Ross1000 e cambia solo l'endpoint.

**Struttura generale**
- XML UTF-8. Radice `<movimenti>` con `<codice>` (codice struttura assegnato dall'ente) e `<prodotto>` (nome del gestionale).
- Un `<movimento>` per **ogni giorno** in ordine crescente, **compresi i giorni di chiusura**. Contiene:
  - `<data>` (formato `aaaammgg`);
  - `<struttura>` (obbligatorio);
  - `<arrivi>`, `<partenze>`, `<prenotazioni>`, `<rettifiche>`, tutti opzionali.

**`<struttura>` – dati giornalieri della struttura (tutti obbligatori)**

| Campo | Contenuto |
|---|---|
| `apertura` | `SI` / `NO` |
| `camereoccupate` | camere occupate nel giorno |
| `cameredisponibili` | unità ricettive potenzialmente vendibili |
| `lettidisponibili` | persone potenzialmente ospitabili |

Se la struttura è chiusa (`NO`), gli altri tre campi valgono 0.

**`<arrivo>` – un elemento per ogni ospite**

| Campo | Obbl. | Note |
|---|---|---|
| `idswh` | sì | ID univoco e **immutabile** del check-in dell'ospite, max 20 caratteri |
| `tipoalloggiato` | sì | codici Polizia 16-20 |
| `idcapo` | se 19/20 | = `idswh` del capo, che va trasmesso prima dei componenti |
| `cognome` | non indicato come obbligatorio | max 50 caratteri (manca negli esempi ufficiali) |
| `nome` | non indicato come obbligatorio | max 30 caratteri |
| `sesso` | sì | `M` / `F` (attenzione: diverso da Alloggiati, che usa 1/2) |
| `cittadinanza` | sì | codice Stato Polizia |
| `statoresidenza` | sì | codice Stato Polizia |
| `luogoresidenza` | sì se residente in Italia | codice Comune Polizia; per gli stranieri codice **NUTS** oppure testo libero (max 30 caratteri) |
| `datanascita` | sì | `aaaammgg` (quindi data di nascita, non età) |
| `statonascita` | no | codice Stato |
| `comunenascita` | solo se nato in Italia | altrimenti vuoto |
| `tipoturismo` | **sì** | descrizione dalla lista qui sotto |
| `mezzotrasporto` | **sì** | descrizione dalla lista qui sotto |
| `canaleprenotazione` | no | lista |
| `titolostudio` | no | lista |
| `professione` | no | lista non fornita [NT] |
| `esenzioneimposta` | no | codice da chiedere al singolo comune |

Se le regole di obbligatorietà non sono rispettate, l'ospite viene scartato.

Tabelle di codifica da usare: quelle della Polizia (Tabelle.aspx) e i codici NUTS forniti da GIES: https://www.gies.it/Turismo/nuts-gies2020.zip [UFF, citato nel tracciato].

**Altri elementi**
- **`<partenza>`**: `idswh`, `tipoalloggiato`, `arrivo` (data di arrivo). Tutti obbligatori.
- **`<prenotazione>`** (facoltativa): `idswh`, `arrivo`, `partenza`, `ospiti`, `camere` (obbligatori); `prezzo`, `canaleprenotazione`, `statoprovenienza`, `comuneprovenienza` (facoltativi).
- **`<rettifiche>`**:
  - `<eliminazione>` (`idswh`, `tipoalloggiato` oppure `99` se si tratta di una prenotazione, `arrivo`);
  - `<cancellazione>` e `<conferma>` di una prenotazione.
- **Correzioni**: per modificare un arrivo si reinvia il movimento del giorno di arrivo; per modificare una partenza si invia il movimento del giorno della nuova partenza.

**LISTE UFFICIALI Ross1000** [UFF, tracciato v3 pag. 15-16]. Il valore è la **descrizione testuale**, non un codice numerico.

| Tipo turismo (`tipoturismo`) | Mezzo di trasporto (`mezzotrasporto`) |
|---|---|
| Culturale | Auto |
| Balneare | Aereo |
| Congressuale/Affari | Aereo+Pullman |
| Fieristico | Aereo+Navetta/Taxi/Auto |
| Sportivo/Fitness | Aereo+Treno |
| Scolastico | Treno |
| Religioso | Pullman |
| Sociale | Caravan/Autocaravan |
| Parchi Tematici | Barca/Nave/Traghetto |
| Termale/Trattamenti salute | Moto |
| Enogastronomico | Bicicletta |
| Cicloturismo | A piedi |
| Escursionistico/Naturalistico | Altro mezzo |
| Altro motivo | Non Specificato |
| Non specificato | |

| Canale di prenotazione | Titolo di studio |
|---|---|
| Diretta tradizionale | Licenza elementare |
| Diretta web | Diploma |
| Indiretta tradizionale | Laurea |
| Indiretta web | Altro titolo |
| Altro canale | Non specificato |
| Non specificato | |

Note sulle liste:
- Negli esempi ufficiali i valori sono scritti in MAIUSCOLO (`ENOGASTRONOMICO`, `AUTO`, `AEREO`, `DIRETTA WEB`). Se il confronto sia sensibile a maiuscole/minuscole **[NT]**: conviene inviare il testo della lista in maiuscolo come negli esempi e fare un test di invio.
- Nella lista le voci "Lavoro", "Salute" e "Visita parenti" **non esistono** come tali. Le più vicine sono "Congressuale/Affari", "Termale/Trattamenti salute" e "Altro motivo". Anche "Noleggio" e "Bus" non esistono: esistono "Auto" e "Pullman".
- Liste uguali in tutte le regioni Ross1000? Il documento è unico e non prevede varianti regionali, e la v2.4 dell'Emilia-Romagna ha le stesse liste [UFF]. Eventuali personalizzazioni lato Lazio: **[NT]**.
- `tipoturismo` e `mezzotrasporto` sono **obbligatori** nel tracciato, ma è ammesso il valore "Non specificato".

**Invio Ross1000** [UFF]
- Upload del file XML dal portale, oppure **web service SOAP** `…/ws/checkinV2?wsdl`, operazione `inviaMovimentazione` (namespace `http://checkin.ws.service.turismo5.gies.it/`), con autenticazione **HTTP Basic** (username/password di trasmissione).
- Per le installazioni con accesso SPID/CIE le credenziali di trasmissione vanno chieste all'Ufficio Turismo competente (per il Lazio: bancadatiturismolazio@regione.lazio.it [UFF, pagina Regione]).
- Cadenza: il tracciato chiede un movimento per ogni giorno dell'anno. Nel Lazio il termine è "entro il mese successivo all'arrivo". Un invio giornaliero automatico è compatibile con entrambi.

### 2.3 Tracciato SPOT Puglia **[UFF]** (specifiche v1.0 del 13/02/2020 + XSD 0.6)

È un **tracciato diverso** da Ross1000.
- **Anonimo**: niente nome, cognome o data di nascita. Si usa l'**età**.
- Radice `<movimenti vendor="...">`.
- `<movimento type="MP|NM|EC" data="aaaa-mm-gg">`, dove MP = con movimento, NM = nessun movimento, EC = esercizio chiuso. Le date sono in formato ISO, non `aaaammgg`.
- I giorni devono essere **consecutivi**: se ne manca uno, l'elaborazione si ferma alla data mancante.
- Al primo invio va mandato lo **startup** con gli ospiti presenti la notte precedente.

**`<arrivo>` – solo tipi 16/17/18** (XSD `AlloggiatoType` = 16, 17, 18)

| Campo | Obbl. | Note |
|---|---|---|
| `codiceclientesr` | sì | ID ospite nel gestionale, **senza dati anagrafici** (niente codice fiscale) |
| `tipologiaalloggiato` | sì | 16 / 17 / 18 |
| `sesso` | sì | `M` / `F` |
| `cittadinanza` | sì | codice Stato Polizia **attivo** |
| `paeseresidenza` **oppure** `comuneresidenza` | sì | codici Polizia; nell'XSD solo codici attivi |
| `occupazionepostoletto` | sì | `si` / `no` (nell'XSD in minuscolo) |
| `dayuse` | sì | `si` / `no` |
| `eta` | sì | età al check-in, intero ≥ 0 |
| `caratteristicheviaggio` | no ma "fortemente consigliato" | più valori possibili |
| `duratasoggiorno` | idem | giorni |
| `mezzotrasportoarrivo` | idem | |
| `mezzotrasportomovimento` | idem | |
| `motivazioniviaggio` | idem | |
| `titolostudio` | no | |
| `componenti` | obbligatorio per 17/18, vietato per 16 | un `<componente>` per ogni familiare o membro del gruppo |

- Ogni **`<componente>`** ha: `codiceclientesr`, `sesso`, `cittadinanza`, residenza, `occupazionepostoletto`, `eta`, `titolostudio` (opzionale). Motivo, mezzi e durata sono **ereditati dal capo**.
- **`<partenze>`**: elenco di `codiceclientesr`. Il codice del capo fa partire tutto il gruppo, salvo l'attributo `partenzacapogrupposeparata="SI"`. Può contenere `<datiqualitativi>` per inviare o correggere motivo e mezzi alla partenza.
- **`<datistruttura>`**: `cameredisponibili`, `postilettodisponibili` (al netto dei letti aggiunti; un matrimoniale conta 2), `camereoccupate`. Regole: occupate ≤ disponibili ≤ posti letto.

**LISTE UFFICIALI SPOT** (enumerazioni in `datatype-0.6.xsd`, valore = codice testuale)

- `motivazioniviaggio`: `BALNEARE`, `RELIGIOSO` (pellegrinaggio e religioso), `SPORTIVOBENESSERE`, `ARTECULTURAEVENTI`, `NATURA`, `ENOGASTRONOMIA`, `AFFARICONGRESSI`, `VISITAPARENTI` (parenti e amici), `PERSONALE` (altri motivi personali, es. cure mediche)
- `mezzotrasportoarrivo` (mezzo principale per arrivare in Puglia): `AEREOCOMPLINEA`, `AEREOCHARTLOW`, `TRAGHETTO`, `NAVEPRIV` (yacht), `CROCIERA`, `TRENO`, `BUS`, `AUTO`, `ROULOTTE` (auto con roulotte), `CAMPER`, `BICI`, `MOTO`
- `mezzotrasportomovimento` (mezzo principale per muoversi in Puglia): come il precedente **senza** i due valori "aereo"
- `caratteristicheviaggio` (più valori ammessi): `DIRETTAALLOGGIOINTERNET`, `DIRETTAALLOGGIOSR`, `MEZZOTRASPORTOARRIVOINTERNET`, `MEZZOTRASPORTOMOVIMENTOINTERNET`, `AGENZIA`, `TOUR`, `ASSOCIAZIONE`
- `titolostudio`: `NESSUNTITOLO`, `ELEMENTARE`, `MEDIA`, `SUPERIORE`, `UNIVERSITA`
- **Non esiste** un valore "non specificato": se il dato non si conosce, si omette l'elemento, perché è facoltativo.

Attenzione: l'XSD 0.6 è di fine 2023 e contiene **l'elenco dei comuni attivi** "congelato" (8.239 codici). Se nel frattempo nascono nuovi comuni, la validazione XSD potrebbe rifiutarli. Se SPOT abbia aggiornato l'XSD: **[NT]**.

### 2.4 Confronto rapido Lazio (Ross1000) / Puglia (SPOT)

| Aspetto | Ross1000 (Lazio) | SPOT (Puglia) |
|---|---|---|
| Nominativo | cognome e nome presenti (non obbligatori) | assente (anonimo) |
| Nascita | data di nascita `aaaammgg` | solo età al check-in |
| Sesso | M/F | M/F |
| Componenti gruppo | righe separate 19/20 con `idcapo` | annidati in `<componenti>` del capo (16/17/18 soltanto) |
| Motivo | `tipoturismo` obbligatorio (15 voci, testo) | `motivazioniviaggio` facoltativo (9 codici) |
| Mezzo | `mezzotrasporto` obbligatorio (14 voci) | `mezzotrasportoarrivo` + `mezzotrasportomovimento` facoltativi |
| Canale | `canaleprenotazione` (6 voci) | `caratteristicheviaggio` (7 codici, più valori) |
| Posto letto / day use | no | `occupazionepostoletto`, `dayuse` obbligatori |
| Dati struttura | apertura, camere occupate/disponibili, letti disponibili | camere disponibili, posti letto disponibili, camere occupate; `type` EC/NM |
| Invio | web service SOAP (HTTP Basic) o upload | solo upload XML (web service [NT]) |
| Termine | entro il mese successivo all'arrivo | entro il 10 del mese successivo |

---

## 3. Lacune (cose NON trovate in fonti ufficiali)

1. Data ufficiale del passaggio RADAR → Ross1000 per i flussi ISTAT nel Lazio (il 21/05/2025 viene solo da fonte secondaria).
2. Se Ross1000 confronta `tipoturismo` e `mezzotrasporto` distinguendo maiuscole/minuscole.
3. Lista ufficiale dei valori di `professione` (Ross1000).
4. Web service per l'invio automatico a SPOT Puglia; aggiornamenti dell'XSD SPOT dopo la 0.6.
5. Ambiente di test del web service Alloggiati (esiste solo il metodo `Test`).
6. Frequenza di aggiornamento delle tabelle Polizia; codifica dichiarata dei CSV.
7. Estensione a 6 ore del termine Alloggiati per le locazioni turistiche ("Decreto Sicurezza 2025"): solo fonte secondaria, non riscontrata nel testo dell'art. 109.
8. Sistemi delle altre regioni fuori dal Lazio e dalla Puglia (non cercati).

---

## 4. Implicazioni per il modello dati

### 4.1 Per ospite (una riga per persona nel soggiorno)

| Campo | Alloggiati | Ross1000 (Lazio) | SPOT (Puglia) | Note |
|---|---|---|---|---|
| ID ospite-soggiorno stabile (≤ 20 caratteri, senza dati anagrafici) | – | **obbl.** (`idswh`) | **obbl.** (`codiceclientesr`) | UUID corto o progressivo; non deve mai cambiare |
| Tipo alloggiato 16-20 | **obbl.** | **obbl.** | **obbl.** (solo 16/17/18; 19/20 diventano componenti) | |
| Riferimento al capo (per 19/20) | ordine delle righe | **obbl.** (`idcapo`) | annidamento | FK verso l'ospite capo |
| Cognome (50) | **obbl.** | facoltativo | – | |
| Nome (30) | **obbl.** | facoltativo | – | |
| Sesso | **obbl.** (1/2) | **obbl.** (M/F) | **obbl.** (M/F) | salvare M/F e convertire in uscita |
| Data di nascita | **obbl.** | **obbl.** | – (si calcola l'età al check-in) | |
| Stato di nascita (cod. Polizia) | **obbl.** | facoltativo | – | |
| Comune di nascita (cod. Polizia) + provincia | **obbl. se nato in Italia** | se nato in Italia | – | FK verso un comune valido alla data di nascita (anche cessato) |
| Cittadinanza (cod. Stato) | **obbl.** | **obbl.** | **obbl.** (solo attivi) | |
| Stato di residenza (cod. Stato) | – | **obbl.** | **obbl.** (in alternativa al comune) | **campo non richiesto da Alloggiati ma necessario per l'ISTAT** |
| Comune di residenza (cod. Polizia) | – | **obbl. se residente in Italia** | **obbl. se residente in Italia** | |
| Località estera di residenza (NUTS o testo max 30) | – | facoltativo | – | tabella NUTS GIES opzionale |
| Tipo documento (cod. 5) | **obbl. per 16/17/18** | – | – | |
| Numero documento (20) | **obbl. per 16/17/18** | – | – | dato sensibile: minimizzare e conservare solo il necessario |
| Luogo di rilascio (cod. Comune o Stato) | **obbl. per 16/17/18** | – | – | campo polimorfico: tipo luogo + codice |
| Occupa posto letto (sì/no) | – | – | **obbl.** | default sì |
| Titolo di studio | – | facoltativo | facoltativo | due liste diverse: salvare un valore interno e mappare |
| Professione | – | facoltativo | – | lista [NT] |
| Codice esenzione imposta di soggiorno | – | facoltativo | – | si collega al modulo tassa di soggiorno |

### 4.2 Per soggiorno / check-in (a livello del capo o dell'ospite singolo)

| Campo | Alloggiati | Ross1000 | SPOT | Note |
|---|---|---|---|---|
| Data di arrivo | **obbl.** (gg/mm/aaaa) | **obbl.** (aaaammgg) | **obbl.** (data movimento, ISO) | |
| Data di partenza effettiva | – | **obbl.** alla partenza | **obbl.** alla partenza | |
| Giorni di permanenza dichiarati (max 30) | **obbl.** | – | `duratasoggiorno` facoltativo | per soggiorni > 30 gg Alloggiati accetta max 30 |
| Day use (arrivo e partenza nello stesso giorno con pernotto) | – | – | **obbl.** | si può ricavare |
| Motivo del viaggio | – | **obbl.** (lista Ross1000, "Non specificato" ammesso) | facoltativo (lista SPOT) | **due liste diverse e non mappabili 1:1**: conviene salvare il codice della lista della regione della struttura |
| Mezzo di trasporto | – | **obbl.** (lista Ross1000) | facoltativo: *due* campi (arrivo e movimento) | idem |
| Canale di prenotazione | – | facoltativo (lista Ross1000) | facoltativo, più valori (lista SPOT) | ricavabile in parte dal canale della prenotazione |
| Esito invio Alloggiati (data/ora, esito per riga, codice errore) + ricevuta PDF | registro | – | – | ricevute da conservare 5 anni |
| Stato di invio ISTAT (movimento trasmesso sì/no, data) | – | registro | registro | |

Scelta consigliata: nella configurazione della struttura indicare il **sistema ISTAT** (`ROSS1000` / `SPOT`). Il form di check-in mostra la lista di motivo e mezzo corrispondente e salva il codice nativo del sistema, così si evitano mappature con perdita di informazione. Il vincolo di obbligatorietà di motivo e mezzo vale solo per Ross1000.

### 4.3 Per struttura, per giorno

| Campo | Ross1000 | SPOT |
|---|---|---|
| Aperta / chiusa nel giorno | **obbl.** (`apertura`) | **obbl.** (`type` EC) |
| Camere disponibili | **obbl.** | **obbl.** |
| Letti / posti letto disponibili | **obbl.** (`lettidisponibili`) | **obbl.** (`postilettodisponibili`, esclusi i letti aggiunti) |
| Camere occupate | **obbl.** | **obbl.** |

Servono quindi: un **calendario di apertura** della struttura, camere e posti letto vendibili **per giorno** (non solo l'anagrafica fissa, perché camere fuori servizio o chiusure cambiano il valore) e il conteggio delle camere occupate dal planning.

### 4.4 Configurazione e credenziali per struttura

- **Alloggiati**: utente, password e **WSKEY** (cifrati), questura di competenza, tipo utenza (struttura / gestione appartamenti).
- **Ross1000**: codice struttura (`<codice>`), username e password di trasmissione web service, URL dell'endpoint regionale.
- **SPOT**: nome vendor, data di inizio interazione (per lo startup).

### 4.5 Tabelle di riferimento necessarie

| Tabella | Fonte | Colonne da salvare |
|---|---|---|
| Comuni | Polizia `comuni.csv` (pubblico) | codice (9), descrizione, sigla provincia, data fine validità |
| Stati | Polizia `stati.csv` (pubblico) | codice (9), descrizione, data fine validità |
| Tipi documento | Polizia `documenti.csv` (pubblico) | codice (5), descrizione |
| Tipi alloggiato | Polizia `tipo_alloggiato.csv` (pubblico) | codice (2), descrizione |
| Motivo / mezzo / canale / titolo di studio Ross1000 | tracciato Ross1000 v3 (tabella statica nel codice) | valore testuale |
| Motivazione / mezzo arrivo / mezzo movimento / caratteristiche / titolo di studio SPOT | `datatype-0.6.xsd` (tabella statica) | codice |
| NUTS (facoltativa) | https://www.gies.it/Turismo/nuts-gies2020.zip | codice NUTS, descrizione |

Job di aggiornamento periodico delle 4 tabelle Polizia (URL pubblici `Download.ashx`). I codici cessati non si cancellano mai: servono per le date di nascita e per lo storico.

### 4.6 Cosa è obbligatorio al check-in (sintesi operativa)

- **Tutti gli ospiti**:
  - cognome, nome;
  - sesso, data di nascita;
  - stato di nascita (e comune + provincia se nato in Italia);
  - cittadinanza;
  - **stato di residenza (e comune se residente in Italia)**;
  - tipo alloggiato (e capo di riferimento per 19/20).
- **Solo ospite singolo, capofamiglia e capogruppo**: tipo documento, numero documento, luogo di rilascio.
- **Per il soggiorno** (sul capo o sul singolo): data di arrivo, giorni di permanenza (max 30); **nel Lazio** anche motivo (tipo turismo) e mezzo di trasporto, con "Non specificato" ammesso.
- **In Puglia**: occupazione del posto letto per ogni ospite. Motivo, mezzi e canale sono facoltativi ma raccomandati.
- **Tempi**: invio Alloggiati entro 24 h dall'arrivo (6 h se il soggiorno dura ≤ 24 h). Invio ISTAT: Lazio entro il mese successivo all'arrivo, Puglia entro il 10 del mese successivo.
