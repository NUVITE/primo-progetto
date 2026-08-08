import { PrismaClient } from "../app/generated/prisma/client.ts";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { SUGGESTIONS, DAY_COORDS } from "./suggerimenti.ts";
import { MEALS_BY_DAY, type MealInput } from "./ristoranti.ts";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const SHARED_PASSWORD = process.env.FAMILY_SHARED_PASSWORD ?? "cambiami2026";

const FAMILIES = [
  { code: "SERINO", displayName: "Famiglia Serino" },
  { code: "GIANNELLA", displayName: "Famiglia Giannella" },
  { code: "CAFAGNA", displayName: "Famiglia Cafagna" },
  { code: "DICUONZO", displayName: "Famiglia Dicuonzo" },
];

interface ActivityInput {
  time?: string;
  title: string;
  address?: string;
  mapsQuery?: string;
  zone?: string;
  transportMode?: string;
  cost?: string;
  notes?: string;
  requiresDocument?: string;
}

interface DayInput {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  title: string;
  location: string;
  hotelName?: string;
  hotelInfo?: string;
  wakeInfo?: string;
  luggageNote?: string;
  dressCode?: string;
  summary?: string;
  activities: ActivityInput[];
  // I locali suggeriti dall'agenzia stanno in ristoranti.ts, tutti quanti:
  // vanno riportati integralmente, senza selezioni.
}

// Testi ripresi pari pari dal "Programma di viaggio completo" di C&C Viaggi
// (programma_completo.pdf): summary, dressCode e le note delle attivita' sono
// le parole dell'agenzia, non una nostra sintesi. Dove il programma aveva
// paragrafi descrittivi extra (sezioni "■", box RIFERIMENTI OPERATIVI/
// SUGGERIMENTI, istruzioni passo-passo) sono stati riportati per intero,
// incorporati nella nota dell'attivita' piu' vicina o come voce a se' quando
// non legati a un orario preciso (time: "—").
const DAYS: DayInput[] = [
  {
    date: "2026-08-09",
    dayNumber: 1,
    title: "Bari > Monaco > Los Angeles",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    hotelInfo: "5711 W Century Blvd, Los Angeles CA 90045 - Tel. +1 310 410 4000",
    wakeInfo: "Sveglia e trasferimento verso l'aeroporto di Bari alle 03:30",
    dressCode: "In aereo vestitevi comodi e a strati: la cabina è fredda. A Los Angeles trovate 27–28 gradi con aria secca, ma appena cala il sole la brezza dall'oceano fa scendere la temperatura anche di dieci gradi: tenete una felpa nel bagaglio a mano.",
    summary: "Si parte. Da Bari raggiungete Monaco di Baviera con un volo Air Dolomiti per Lufthansa e da lì, a bordo dell'Airbus A380, il più grande aereo di linea del mondo, attraversate l'Atlantico e l'intero continente americano fino a Los Angeles. Dodici ore esatte di volo con pasti a bordo: cercate di dormire nella parte centrale del viaggio e regolate l'orologio sul fuso californiano appena decollati da Monaco. Tra la sveglia a Bari e l'ora di andare a letto in California passeranno quasi ventiquattro ore: sarà la giornata più lunga del viaggio.",
    activities: [
      { time: "04:15", title: "Presentazione al banco check-in", address: "Aeroporto di Bari", notes: "Consegnate i bagagli: viaggeranno diretti fino a Los Angeles." },
      { time: "06:00", title: "Partenza LH 1901 per Monaco di Baviera", notes: "Embraer 195. Ristoro a pagamento a bordo. Posti assegnati (check-in fatto): Daniele 7F, Alessandra 8F, Claudia 7C, Elena 7A, Maria 7D.", requiresDocument: "Carta d'imbarco" },
      { time: "07:45", title: "Arrivo a Monaco, Terminal 2", notes: "Restate in area transiti: non dovete ritirare i bagagli." },
      { time: "07:45–12:15", title: "Scalo di 4 ore e 30", notes: "Tempo abbondante e nessuna fretta. Come sfruttarlo: il Terminal 2 è uno dei più piacevoli d'Europa, con una vera birreria con birrificio interno (Airbräu, area transiti, con giardino), ristoranti veri e non solo fast food, e al Terminal 2 satellite una terrazza panoramica sulle piste. Con quattro ore e mezza potete pranzare con calma: fatelo, perché il pasto a bordo dell'A380 arriverà circa un'ora e mezza dopo il decollo. Approfittatene anche per sgranchirvi le gambe camminando: sarete seduti per dodici ore. Il wi-fi dell'aeroporto è gratuito e illimitato." },
      { time: "12:15", title: "Partenza LH 452 per Los Angeles", notes: "Airbus A380. Pasti inclusi. Posti assegnati (check-in fatto): Daniele 86B, Alessandra 86A, Claudia 86D, Elena 86E, Maria 86C.", requiresDocument: "Carta d'imbarco" },
      { time: "15:15", title: "Atterraggio a Los Angeles – Terminal B (Tom Bradley International)", notes: "Controlli di frontiera e ritiro bagagli: mettete in conto un'ora abbondante. Preparate passaporto ed ESTA: alla domanda dell'ufficiale rispondete con semplicità, turismo, il nome dell'hotel (Hilton Los Angeles Airport, 5711 West Century Boulevard) e la durata del soggiorno." },
      { time: "17:00", title: "Navetta e arrivo in hotel", address: "Hilton Los Angeles Airport, 5711 W Century Blvd", transportMode: "navetta gratuita dell'hotel", cost: "incluso", notes: "Check-in dalle 16:00: la camera vi aspetta. Uscendo dall'area bagagli vi trovate al piano arrivi: salite al piano superiore, quello delle partenze. Seguite i cartelli «Hotel & Courtesy Shuttles» e uscite dal terminal. Sul marciapiede esterno cercate il cartello rosso «Hotel & Private Parking Shuttle»: è la fermata delle navette degli hotel. Attendete la navetta con la scritta Hilton Los Angeles Airport (passa ogni 10–15 minuti); il tragitto dura 5 minuti. Il servizio è gratuito, ma è buona educazione lasciare 1–2 $ all'autista che carica le valigie. Verrà richiesta una carta di credito a garanzia per gli extra: è prassi in tutti gli hotel americani." },
    ],
  },
  {
    date: "2026-08-10",
    dayNumber: 2,
    title: "Universal Studios Hollywood",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    dressCode: "Scarpe da ginnastica già rodate: farete tra i dodici e i quindici chilometri a piedi. Cappello, occhiali da sole e crema solare sono indispensabili, perché le code sono spesso al sole. Portate una felpa leggera nello zaino per la sera e, se pensate di fare Jurassic World, una maglietta di ricambio.",
    summary: "La prima giornata piena in California è dedicata al parco più cinematografico del mondo. Il vostro biglietto è valido per due giorni di ingresso da utilizzare entro sette giorni dalla prima visita: se oggi non riuscite a vedere tutto, potrete tornare domani pomeriggio, quando il city tour vi lascerà a Hollywood, a due sole fermate di metropolitana dal parco. È un'opportunità che vale la pena tenere a mente.",
    activities: [
      { time: "07:00", title: "Colazione Grab & Go nella hall dell'hotel", notes: "Una brioche, una bevanda, un frutto." },
      { time: "07:45", title: "Partenza per Universal City", notes: "Mettete in conto 45–60 minuti di viaggio." },
      { time: "09:00", title: "Apertura del parco", requiresDocument: "Biglietto Universal Studios (2 giorni)", notes: "Entrare all'apertura fa davvero la differenza sulle code." },
      { time: "—", title: "Il parco: cosa non perdere", notes: "Universal Studios Hollywood non è solo un parco divertimenti, è uno studio cinematografico vero e ancora in attività, il più antico del mondo ancora funzionante, aperto da Carl Laemmle nel 1915. L'attrazione principale è lo Studio Tour, un giro in trenino di circa un'ora tra i set reali: la piazza di Chi ha incastrato Roger Rabbit, l'aereo precipitato di La guerra dei mondi, il quartiere di Psycho con la casa dei Bates, l'inondazione di Flash Flood. Fatelo per primo, appena entrati, quando la fila è ancora corta.\n\nThe Wizarding World of Harry Potter: il castello di Hogwarts ricostruito in scala, il villaggio di Hogsmeade, la Burrobirra e la spettacolare attrazione Forbidden Journey. Nel pomeriggio è l'area più affollata del parco.\n\nSuper Nintendo World: l'area più recente e visivamente sorprendente, con il Regno dei Funghi ricostruito a grandezza naturale, Mario Kart in realtà aumentata. Può richiedere una prenotazione a orario tramite l'app del parco nei giorni di grande affluenza.\n\nJurassic World, Transformers e The Simpsons: le altre grandi attrazioni, tutte al Lower Lot raggiungibile con la lunghissima scala mobile centrale, uno spettacolo in sé. Portate un cambio o un poncho: sulla giostra di Jurassic World ci si bagna sul serio." },
      { time: "—", title: "Consigli pratici per la giornata", notes: "Scaricate l'app Universal Studios Hollywood prima di entrare: mostra i tempi d'attesa in tempo reale e la mappa. Il parco è costruito su due livelli collegati dalla scala mobile: organizzate la visita per livello, non a zig-zag, o passerete la giornata a salire e scendere. Portate acqua (potete riempire le borracce alle fontanelle) e sappiate che all'ingresso c'è un controllo di sicurezza con metal detector." },
      { time: "dalle 18:00", title: "Rientro con calma, oppure cena al CityWalk e rientro più tardi" },
    ],
  },
  {
    date: "2026-08-11",
    dayNumber: 3,
    title: "City tour guidato di Los Angeles",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    dressCode: "Giornata di cammino in città: scarpe comode, cappello e occhiali da sole. Se scegliete la spiaggia, aggiungete costume e asciugamano in uno zainetto e ricordate che a Santa Monica, sul molo, il vento è teso: la felpa serve anche in agosto.",
    summary: "Los Angeles è una città che non ha un centro, ma cento centri: fondata dai coloni messicani nel 1781 con il nome di El Pueblo de Nuestra Señora la Reina de los Ángeles, oggi ospita comunità provenienti da oltre 140 Paesi. Il city tour vi farà capire come è fatta, prima di lasciarvi liberi di esplorarla.",
    activities: [
      { time: "08:00", title: "Partenza alle 08:15 dalla hall dell'Hilton LAX", requiresDocument: "Voucher TeamAmerica LAXS City Tours 4hrs - Rif. 1447289", notes: "Vi raccomandiamo di essere nella lobby entro le 08:00: il pullman non attende i ritardatari. Tour di mezza giornata (circa 4 ore) con guida in italiano, spagnolo e inglese." },
      { time: "08:15", title: "City tour guidato di Los Angeles", notes: "Downtown e Olvera Street: il cuore storico e finanziario, grattacieli di vetro accanto alle case di adobe dell'inizio dell'Ottocento. Olvera Street è la strada più antica di Los Angeles, un mercato messicano di bancarelle colorate, taquerias e mariachi dove si respira ancora la città delle origini.\n\nHollywood Boulevard e la Walk of Fame: oltre 2.700 stelle incastonate nel marciapiede lungo quindici isolati, ognuna con il nome di un artista premiato per il contributo allo spettacolo. Davanti al TCL Chinese Theatre, il cinema in stile pagoda del 1927, si trovano le impronte di mani e piedi delle star nel cemento. Accanto, il Dolby Theatre, dove ogni anno si consegnano gli Oscar.\n\nLa scritta HOLLYWOOD: nata nel 1923 come cartellone pubblicitario di una lottizzazione immobiliare (diceva HOLLYWOODLAND) e sopravvissuta a se stessa fino a diventare il simbolo mondiale del cinema. I punti migliori per fotografarla sono l'ultimo piano del centro commerciale Ovation Hollywood e il Griffith Observatory." },
      { time: "12:30", title: "Fine tour a Hollywood: il pullman non rientra in hotel", notes: "Questo è il punto più importante della giornata da organizzare. A fine mattinata il pullman si ferma a Hollywood e prosegue con l'escursione facoltativa Los Angeles by the beach. Chi non la acquista resta libero a Hollywood e rientra in hotel autonomamente. Avete quindi tre possibilità, tutte valide:\n\nOpzione 1 — Escursione facoltativa «Los Angeles by the beach» (60 $ a persona, in contanti). Il pullman prosegue verso Santa Monica, con il suo molo, la ruota panoramica e il cartello che segna la fine della Route 66, e verso Venice Beach, il lungomare più eccentrico d'America tra artisti di strada, campi da basket e Muscle Beach. È la soluzione più comoda e vi lascia direttamente in hotel.\n\nOpzione 2 — Secondo ingresso a Universal Studios. Il vostro biglietto ne prevede due entro sette giorni. Dalla stazione Hollywood/Highland la linea B (rossa) porta a Universal City in 2 fermate e 5 minuti. È il modo migliore per godersi con calma quello che non siete riusciti a vedere ieri.\n\nOpzione 3 — Pomeriggio libero a Hollywood. Walk of Fame, Chinese Theatre, il museo delle cere Madame Tussauds, lo shopping da Ovation Hollywood e il Griffith Observatory (a 20 minuti di taxi, ingresso gratuito, panorama e scritta Hollywood: apre alle 12:00)." },
      { time: "18:00", title: "Rientro autonomo in hotel se non si è scelta l'escursione", notes: "Per rientrare da Hollywood all'Hilton LAX: il modo più semplice è Uber/Lyft, circa 45–60 minuti e 50–70 $ per auto a seconda del traffico (evitate la fascia 16:00–19:00, quando Los Angeles si blocca). In alternativa: metro linea B da Hollywood/Highland fino a 7th St/Metro Center, linea A fino a Willowbrook, linea C fino a LAX/Metro Transit Center e navetta finale dell'hotel: circa 1h30 e 1,75 $ a persona." },
    ],
  },
  {
    date: "2026-08-12",
    dayNumber: 4,
    title: "Los Angeles > Calico Ghost Town > Las Vegas",
    location: "Las Vegas",
    hotelName: "Sahara Las Vegas",
    hotelInfo: "2535 Las Vegas Blvd S, Las Vegas - Tel. +1 702 761 7000",
    luggageNote: "Valigie pronte in hall entro le 07:45: inizia il TeamTour West, facchinaggio incluso (una valigia a testa)",
    dressCode: "Oggi si viaggia in pullman con aria condizionata molto fredda e si scende a Calico con 38–40 gradi: la felpa tenetela sempre a portata di mano. A Calico servono scarpe chiuse (terreno sassoso e polveroso), cappello e acqua. Per la sera a Las Vegas, se pensate di entrare nei ristoranti o nei locali degli hotel, evitate canottiere e infradito.",
    summary: "Oggi lasciate l'oceano e vi mettete in viaggio verso l'interno. La strada attraversa il deserto del Mojave, un paesaggio che cambia completamente nel giro di un'ora: le palme lasciano il posto ai Joshua Tree e la temperatura sale rapidamente. Sono circa cinque ore di viaggio, con sosta a metà strada.",
    activities: [
      { time: "07:45", title: "Bagagli pronti in hall", requiresDocument: "Voucher TeamAmerica LAXE TeamTour West Multilingual - Rif. 1447289" },
      { time: "08:15", title: "Partenza per Las Vegas con guida bilingue" },
      { time: "—", title: "Calico Ghost Town", notes: "La città fantasma più famosa della California. Nel 1881 qui si scoprì l'argento e in pochi anni Calico arrivò a 1.200 abitanti, 500 miniere, ventidue saloon e un giornale. Quando nel 1896 il prezzo dell'argento crollò, la città venne abbandonata nel giro di pochi mesi. Fu Walter Knott, il fondatore di Knott's Berry Farm, a restaurarla negli anni Cinquanta. Oggi ci si passeggia tra le botteghe di legno, si entra nella miniera Maggie, si vede la casa costruita interamente con bottiglie di vetro e si scatta la fotografia più western del viaggio. Il paesaggio circostante, dalle rocce screziate di rosa, verde e giallo, spiega il nome: calico è il tessuto stampato a colori." },
      { time: "sera", title: "Arrivo a Las Vegas", notes: "Nel tardo pomeriggio, quando comincia a scendere il sole, sull'orizzonte del deserto compaiono i grattacieli della Strip. Las Vegas nasce nel 1905 come stazione ferroviaria in mezzo al nulla e diventa quello che è oggi dopo il 1931, anno in cui il Nevada legalizza il gioco d'azzardo. Sistemazione al Sahara Las Vegas, all'estremità nord della Strip: uno degli hotel storici della città, aperto nel 1952, dove hanno cantato Frank Sinatra e il Rat Pack e dove sono stati girati i primi Ocean's Eleven.\n\nEscursione facoltativa: Las Vegas by night – luci e suoni, 60 $ a persona in contanti, da prenotare in giornata alla guida. Un giro serale guidato tra gli hotel-monumento della Strip con gli spettacoli gratuiti: le fontane danzanti del Bellagio, il vulcano del Mirage, la Fremont Street Experience con la volta di led lunga 450 metri. La consigliamo: Las Vegas di notte è una città diversa da quella del giorno, e farsi accompagnare la prima sera vi permette di orientarvi senza camminare per chilometri nella calura.\n\nCome muoversi: se preferite muovervi da soli, dal Sahara parte il monorail (stazione dentro l'hotel) che percorre tutta la Strip fino all'MGM Grand, circa 6 $ a corsa. In alternativa Uber e Lyft sono ovunque ed economici. Non fidatevi delle distanze: sulla Strip due hotel che sembrano vicini possono essere a venti minuti di cammino, con 38 gradi." },
    ],
  },
  {
    date: "2026-08-13",
    dayNumber: 5,
    title: "Las Vegas > Grand Canyon > Williams",
    location: "Arizona",
    hotelName: "Comfort Inn Near Grand Canyon (Williams)",
    dressCode: "Sul bordo del canyon fa caldo di giorno (30–33 gradi) ma la sera a Williams, che sta a 2.000 metri, la temperatura scende sotto i 15: oggi la felpa vi servirà davvero. Scarpe chiuse con suola scolpita per il Rim Trail, cappello a tesa larga e occhiali da sole. In agosto sono frequenti i temporali pomeridiani improvvisi: un k-way leggero nello zaino è una buona idea.",
    summary: "Giornata lunga ma memorabile. Si parte presto verso est, si attraversa la diga di Hoover e il confine dell'Arizona (dove l'orologio non cambia, perché l'Arizona è l'unico stato dell'ovest a non adottare l'ora legale) e si sale verso l'altopiano del Colorado, fino ai 2.100 metri del bordo sud del Grand Canyon.",
    activities: [
      { time: "—", title: "Grand Canyon – South Rim", notes: "Non esiste fotografia che lo renda. Il Colorado ha impiegato sei milioni di anni per incidere una gola lunga 446 chilometri, profonda più di 1.800 metri e larga fino a 29: le pareti mostrano due miliardi di anni di storia della Terra, strato dopo strato, come le pagine di un libro aperto. Il primo affaccio è sempre uno shock: il cervello fatica a dare una scala a ciò che vede. Dedicate qualche minuto al silenzio, prima delle fotografie.\n\nI punti panoramici: la sosta principale è nell'area del Grand Canyon Village e dei belvedere di Mather Point e Yavapai Point, dove si trova anche il Geology Museum con le grandi vetrate sul vuoto. Se avete tempo, la passeggiata pianeggiante lungo il Rim Trail tra un belvedere e l'altro regala scorci sempre diversi ed è alla portata di tutti. Attenzione ai bordi: non ci sono parapetti ovunque e la roccia è friabile.\n\nEscursione facoltativa: Grand Canyon Air Tour, 245 $ a persona (pagabile anche con carta di credito). Sorvolo di 45–50 minuti in aereo sul canyon. È l'escursione più costosa del viaggio ma restituisce una prospettiva impossibile da terra, con la vista sulla confluenza del Little Colorado e sul North Rim. Da valutare se non soffrite il mal d'aria: i piccoli velivoli in quota risentono delle turbolenze termiche di metà giornata.\n\nSuggerimenti: al Grand Canyon l'aria è secchissima e a 2.100 metri ci si disidrata senza accorgersene, bevete costantemente. Il sole a quella quota è molto più forte di quanto sembri, la crema solare è obbligatoria. Non allontanatevi dai sentieri segnati e tenete i bambini per mano vicino al bordo. Gli scoiattoli sono simpatici ma non vanno assolutamente nutriti: sono l'animale che causa più morsi ai visitatori del parco." },
      { time: "sera", title: "Arrivo a Williams, Arizona", notes: "Il pernottamento è nella cittadina di Williams, poco più di 3.000 abitanti, nota per essere stata l'ultima città della Route 66 a essere bypassata dall'autostrada, nel 1984. La via principale è rimasta quella di allora: insegne al neon, negozi di souvenir western, saloon con musica dal vivo e vecchie automobili parcheggiate. Una passeggiata serale di venti minuti vi porta da un capo all'altro del centro: fatela, ne vale la pena." },
    ],
  },
  {
    date: "2026-08-14",
    dayNumber: 6,
    title: "Williams > Monument Valley > Page",
    location: "Terra Navajo",
    hotelName: "Holiday Inn Express & Suites Page",
    dressCode: "Giornata di sole pieno e polvere rossa. Consigliata una maglia a manica lunga leggera: protegge dal sole meglio di qualsiasi crema. Se fate il jeep tour, portate una bandana o un foulard per naso e bocca (le jeep sono scoperte e la polvere è tanta), occhiali da sole avvolgenti e proteggete la fotocamera. Evitate i vestiti chiari e delicati: la sabbia rossa di Monument Valley lascia tracce difficili da mandare via.",
    summary: "Colazione a buffet e partenza verso nord-est, nel cuore della Nazione Navajo, il più grande territorio indiano degli Stati Uniti: 71.000 chilometri quadrati, una superficie pari a quella dell'Irlanda, con leggi, polizia e fuso orario propri. Attenzione: qui l'orologio va avanti di un'ora, perché la Nazione Navajo, a differenza del resto dell'Arizona, adotta l'ora legale.",
    activities: [
      { time: "—", title: "Monument Valley", notes: "È il paesaggio che tutti abbiamo in testa quando pensiamo al west, anche senza esserci mai stati. I mittens, le grandi mesa e i pinnacoli di arenaria rossa alti fino a 300 metri sono i resti di un altopiano eroso da cinquanta milioni di anni di vento e acqua. Dal 1938 John Ford vi ambientò nove film, a partire da Ombre rosse, e da allora la valle è entrata nell'immaginario del cinema mondiale: qui Sergio Leone, Easy Rider, Thelma & Louise e la corsa di Tom Hanks in Forrest Gump, che si ferma di colpo sulla Highway 163.\n\nIl Visitor Center e il panorama: chi non partecipa al jeep tour resta all'area del View Point, la grande terrazza panoramica davanti alle West e East Mitten Butte e alla Merrick Butte, la vista più classica, quella delle cartoline. Vale la pena visitare anche il piccolo museo Navajo e le bancarelle di artigianato, dove le famiglie del posto vendono gioielli in argento e turchese lavorati a mano.\n\nEscursione facoltativa: Monument Valley Jeep Tour, 80 $ a persona in contanti, durata 1 ora e mezza / 2 ore. È l'escursione che consigliamo più di ogni altra. Il fondovalle di Monument Valley è territorio tribale e vi si può accedere soltanto accompagnati da una guida Navajo: senza jeep si resta sulla terrazza panoramica, con la jeep si entra fra i monoliti, si arriva a John Ford's Point e alla Totem Pole, si visitano gli archi naturali e un hogan tradizionale, e si ascoltano i racconti di chi in quella valle ci vive. La differenza tra vedere Monument Valley e attraversarla è enorme." },
      { time: "sera", title: "Arrivo a Page", notes: "Nel tardo pomeriggio arrivo a Page, cittadina nata nel 1957 per ospitare gli operai che costruivano la diga di Glen Canyon e oggi base di partenza per Antelope Canyon e Lake Powell. Se avete un'ora di luce, chiedete alla guida un passaggio o un taxi per l'affaccio sulla diga: il contrasto tra il blu del lago e il rosso della roccia è spettacolare.\n\nEscursione facoltativa: Lake Powell Air Tour, 225 $ a persona (pagabile anche con carta), 40–45 minuti. Sorvolo del Lake Powell, il secondo bacino artificiale degli Stati Uniti, e della celebre ansa di Horseshoe Bend. Bellissimo, soprattutto per chi ama la fotografia. Se dovete scegliere un solo volo panoramico tra i due proposti, la maggior parte dei viaggiatori preferisce quello sul Grand Canyon." },
    ],
  },
  {
    date: "2026-08-15",
    dayNumber: 7,
    title: "Page > Antelope Canyon > Bryce Canyon",
    location: "Utah",
    hotelName: "Best Western Ruby's Inn",
    dressCode: "È il giorno con la maggiore escursione termica del viaggio: 35 gradi ad Antelope Canyon al mattino, 15–18 gradi a Bryce la sera e meno di 10 all'alba. Vestitevi a strati e tenete il pile o il piumino leggero nel bagaglio a mano, non in valigia. Ad Antelope servono scarpe chiuse (non sono ammessi infradito e sandali aperti) e niente zaini. A Bryce, in agosto, i temporali di metà pomeriggio sono frequenti: k-way.",
    summary: "Ferragosto in Arizona e Utah, con due dei luoghi più fotografati del pianeta. Giornata più breve come chilometraggio, ma intensissima.",
    activities: [
      { time: "—", title: "Antelope Canyon", notes: "Un slot canyon: una fenditura strettissima scavata nell'arenaria Navajo dalle piene improvvise che, per migliaia di anni, hanno levigato la roccia come acqua su cera. Si cammina dentro un corridoio largo pochi metri con pareti alte venti, che il sole di mezzogiorno accende di arancione, rosa e viola, disegnando fasci di luce che sembrano solidi. È accessibile solo con guide Navajo e la visita è contingentata: si entra in gruppo, si cammina in fila e si esce dall'altra parte. Portate solo il telefono o la macchina fotografica: zaini, borse, treppiedi e bastoni per selfie non sono ammessi. Il pavimento è di sabbia finissima: servono scarpe chiuse." },
      { time: "—", title: "Il viaggio verso Bryce Canyon", notes: "Si risale verso nord-ovest lungo la Highway 89, attraversando il confine dello Utah (l'orologio non cambia) e i paesaggi a strati del Grand Staircase-Escalante. Si sale progressivamente di quota: Bryce Canyon si trova tra i 2.400 e i 2.700 metri, e lo si sente nell'aria, improvvisamente fresca e profumata di pino.\n\nBryce Canyon: non è un canyon, tecnicamente, è un anfiteatro naturale scavato sul fianco di un altopiano. Il fondo è occupato da migliaia di hoodoos: pinnacoli di roccia scolpiti dal gelo e dal disgelo, che ripetuti per duecento notti all'anno spaccano la pietra millimetro dopo millimetro. I colori variano dall'arancio al rosa al bianco a seconda dell'ora. I punti panoramici classici sono Sunset Point, Sunrise Point e Inspiration Point, tutti a pochi minuti l'uno dall'altro. Il pernottamento è al Ruby's Inn, storica locanda di famiglia aperta nel 1916, praticamente all'ingresso del parco.\n\nSuggerimenti: se ne avete la possibilità, alzatevi per l'alba, a Bryce è il momento più magico della giornata, quando i primi raggi accendono gli hoodoos uno a uno. Sunrise Point è a pochi minuti dal Ruby's Inn e alle 6 del mattino la temperatura sarà intorno agli 8–10 gradi: copritevi bene. Sappiate anche che in Utah le regole sulla vendita di alcolici sono molto restrittive: birra a bassa gradazione nei supermercati, il resto solo nei negozi statali e nei ristoranti con licenza." },
    ],
  },
  {
    date: "2026-08-16",
    dayNumber: 8,
    title: "Bryce Canyon > Zion > Las Vegas",
    location: "Las Vegas",
    hotelName: "Sahara Las Vegas",
    dressCode: "A Zion fa molto caldo e afoso (35–38 gradi): abbigliamento leggerissimo, cappello e almeno un litro d'acqua a testa. Per la sera a Las Vegas, se avete in programma un ristorante o uno spettacolo, tenete pronto qualcosa di più curato: pantaloni lunghi e camicia, o un abito leggero. Ricordate sempre la felpa per l'aria condizionata degli interni.",
    summary: "Ultimo giorno di parchi. Si scende dall'altopiano dello Utah verso il deserto del Nevada, con una sosta in quello che molti considerano il più bel parco nazionale degli Stati Uniti.",
    activities: [
      { time: "—", title: "Zion National Park", notes: "Se a Bryce si guarda il paesaggio dall'alto, a Zion lo si guarda dal basso: si percorre il fondo di una gola scavata dal fiume Virgin, con pareti verticali di arenaria alte fino a 700 metri che cambiano colore dal crema al rosso acceso. I mormoni che lo colonizzarono a metà Ottocento gli diedero nomi biblici — il Trono Bianco, i Patriarchi, il Tempio di Sinawava — convinti di aver trovato un santuario naturale. È il parco più verde e più vivo del viaggio, con pioppi lungo il fiume e cervi che si avvicinano alle strade.\n\nNota sul percorso: Zion chiuderà il tunnel di Zion–Mount Carmel ai veicoli fuori sagoma in una data del 2026 non ancora comunicata. Se la chiusura fosse già in vigore, TeamAmerica proseguirà direttamente per Las Vegas senza la visita a Zion. La guida vi informerà in loco: si tratta di una variazione tecnica indipendente dalla nostra agenzia." },
      { time: "pomeriggio", title: "Rientro al Sahara Las Vegas, serata libera", notes: "Nel pomeriggio si rientra al Sahara Las Vegas, con la serata completamente libera. Dopo sei giorni di deserti e silenzi, l'impatto con la Strip è volutamente eccessivo: qui non ci sono monumenti né musei, c'è solo intrattenimento, e va preso per quello che è. È anche la sera giusta per uno spettacolo: il Cirque du Soleil ha diversi show permanenti in città e i biglietti si trovano spesso in giornata, anche scontati, ai chioschi Tix4Tonight lungo la Strip.\n\nSuggerimenti: cose gratuite e imperdibili sulla Strip, tutte a poca distanza l'una dall'altra: le fontane del Bellagio (ogni 15 minuti dalle 20:00, con musica), il giardino botanico e il soffitto di vetro di Chihuly sempre al Bellagio, il canale con le gondole del Venetian, i giardini tropicali del Flamingo con i fenicotteri veri, la Fremont Street Experience nella città vecchia. Se cenate al buffet, sappiate che i migliori sono il Bacchanal al Caesars Palace e il Wicked Spoon al Cosmopolitan: costosi ma memorabili." },
    ],
  },
  {
    date: "2026-08-17",
    dayNumber: 9,
    title: "Las Vegas: giornata libera, volo per New York",
    location: "Las Vegas / in volo",
    dressCode: "Per il volo notturno vestitevi comodi e a strati: pantaloni lunghi leggeri, felpa o giacchino, calzini. La cabina sarà fredda e a New York, alle sei del mattino, farete colazione con 24 gradi e molta umidità. Tenete nel bagaglio a mano tutto ciò che vi servirà nelle prime ore a New York: la camera d'albergo, con ogni probabilità, non sarà pronta prima delle 15.",
    luggageNote: "Check-out ore 11:00, bagagli al bell desk dell'hotel (gratuito, ritirare lo scontrino - fotografatelo)",
    summary: "Attenzione: oggi non prendete il pullman del tour. Il TeamTour West prevede il rientro in bus a Los Angeles con arrivo in aeroporto verso le 14:00, ma il vostro viaggio prosegue da Las Vegas: rimanete in città e volate direttamente a New York in serata. Comunicatelo alla guida già il giorno prima, così da non essere attesi alla partenza.",
    activities: [
      { time: "08:00", title: "Colazione con calma in hotel" },
      { time: "11:00", title: "Check-out", notes: "Lasciate i bagagli al bell desk dell'hotel: è un servizio gratuito e sicuro, vi daranno uno scontrino." },
      { time: "11:00–18:30", title: "Giornata libera a Las Vegas", notes: "La piscina dell'hotel: con 40 gradi è l'opzione più sensata per la mattina. Il Sahara ha tre piscine e potete usarle anche dopo il check-out: chiedete alla reception dove cambiarvi. Tenete un costume nel bagaglio a mano.\n\nUn ultimo giro sulla Strip: il monorail parte dall'hotel e percorre tutta l'avenue, potete scendere al Venetian per il canale con le gondole, al Bellagio per le fontane e il giardino botanico, al Caesars Palace per i Forum Shops. Muovetevi tra un interno e l'altro, non camminate all'aperto nelle ore centrali.\n\nThe STRAT SkyPod: a cinque minuti a piedi dal Sahara, la torre più alta di Las Vegas, 350 metri, con terrazza panoramica e giostre estreme in cima. Ingresso a pagamento, ma è la vista migliore sulla città.\n\nDowntown e Fremont Street: in taxi, quindici minuti, la Las Vegas delle origini, con le insegne al neon storiche del Neon Museum e la volta di led della Fremont Street Experience. Molto più autentica della Strip.\n\nOutlet shopping: le Las Vegas North Premium Outlets sono a dieci minuti dall'hotel e offrono i prezzi migliori del viaggio su abbigliamento e sportivo. Se avete spazio in valigia, è il momento giusto." },
      { time: "18:30", title: "Rientro in hotel, ritiro bagagli", notes: "Ultimo passaggio in bagno per rinfrescarsi. Cambiatevi: viaggerete di notte." },
      { time: "19:00", title: "Partenza del transfer privato per l'aeroporto Harry Reid, Terminal 3", requiresDocument: "Transfer privato Sahara Las Vegas > Aeroporto Harry Reid (LAS)", notes: "Appuntamento alle 19:00 all'ingresso principale dell'hotel. Minivan fino a 7 passeggeri, mance e pedaggi inclusi, 15 minuti di attesa gratuiti. L'autista vi attenderà con un cartello con il nome del capo pratica e vi contatterà via SMS o WhatsApp: tenete il telefono acceso e raggiungibile. Le informazioni sul vettore arrivano 2–3 ore prima." },
      { time: "19:30-22:00", title: "In aeroporto con ampio anticipo", notes: "Fate i controlli con calma e cenate al terminal, perché sul volo il ristoro è a pagamento." },
      { time: "22:38", title: "Partenza UA 1681 per Newark", notes: "Boeing 737 MAX. 4 ore e 52 di volo, ma con le tre ore di fuso in avanti atterrerete alle 06:30: dormite il più possibile, domani sarà una giornata piena.\n\nSuggerimenti: prima di lasciare l'hotel controllate accuratamente cassaforte, cassetti e bagno, è il cambio di stato più delicato del viaggio. Fate una foto del numero di scontrino del deposito bagagli." },
    ],
  },
  {
    date: "2026-08-18",
    dayNumber: 10,
    title: "Arrivo a New York - MoMA, Hudson Yards, Empire State",
    location: "New York - Midtown/West Side",
    hotelName: "Hotel Riu Plaza New York Times Square",
    hotelInfo: "305 West 46th Street, Manhattan NY 10036 - Tel. +1 646 864 1100",
    dressCode: "Giornata lunghissima, di cammino continuo dopo una notte in aereo: le scarpe più comode che avete. Abbigliamento leggero ma con una felpa o un maglioncino nello zaino, perché il MoMA è molto climatizzato e la terrazza dell'Empire State, di sera, è ventosa. Per il 230 Fifth ricordate il dress code: niente pantaloncini sportivi né ciabatte.",
    summary: "Le stanze non sono disponibili prima delle 14:00-15:00: lasciate i bagagli al deposito hotel (gratuito) e iniziate subito la visita della città.",
    activities: [
      { time: "06:30", title: "Atterraggio a Newark, Terminal C", notes: "Volo interno: nessun controllo doganale, si va diretti al ritiro bagagli." },
      { time: "07:15", title: "Uscita dal terminal e incontro con l'autista", requiresDocument: "Transfer privato Aeroporto Newark (EWR) - Prenotazione T2785671", zone: "midtown", transportMode: "transfer privato (furgoncino 11 posti, Llevame NYC)", notes: "Con il traffico del mattino mettete in conto 45–60 minuti fino a Manhattan. L'autista vi attende nella hall degli arrivi con un cartello con il nome del capo pratica e vi scriverà dal momento dell'atterraggio per coordinare il punto esatto di incontro. Non uscite dal terminal se non lo trovate: chiamate il fornitore. Tempo di attesa massimo un'ora dall'atterraggio." },
      { time: "08:15", title: "Arrivo al Riu Plaza", notes: "Il check-in è dalle 15:00: lasciate i bagagli al deposito (servizio gratuito) e chiedete se una camera è già disponibile, capita spesso." },
      { time: "08:45", title: "Colazione", notes: "Se la camera non è pronta, chiedete alla reception se potete usufruire comunque della sala colazioni; in alternativa, a due passi trovate ottimi bar." },
      { time: "09:45", title: "Passeggiata di avvicinamento verso il MoMA", zone: "midtown", transportMode: "piedi (15 minuti lungo la 6th Avenue)", notes: "Un primo assaggio di Midtown." },
      { time: "10:30", title: "Ingresso al MoMA", address: "11 West 53rd Street, New York", zone: "midtown", cost: "incluso", requiresDocument: "Voucher MoMA STAMPATO - Rif. 254-7188066", notes: "MoMA – Museum of Modern Art: undici piani che raccontano tutto quello che è successo all'arte dal 1880 a oggi. Al quinto piano c'è il cuore: La notte stellata di Van Gogh, Les Demoiselles d'Avignon di Picasso, La persistenza della memoria di Dalí, le ninfee di Monet in una sala dedicata. Al quarto l'arte del dopoguerra: Pollock, Rothko, la Marilyn e le zuppe Campbell di Warhol. Non trascurate il Sculpture Garden al piano terra, un giardino silenzioso in mezzo ai grattacieli, e il terzo piano con architettura e design, dove sono esposti oggetti d'uso quotidiano diventati icone. Con calma servono due ore e mezza. Regole: controllo borse all'ingresso, zaini grandi al guardaroba, vietato mangiare e bere nelle sale, fotografie senza flash consentite nelle gallerie della collezione permanente." },
      { time: "13:00", title: "Pranzo in zona e trasferimento verso Hudson Yards" },
      { time: "13:30", title: "Hudson Yards, Vessel, High Line, Chelsea Market, Little Island, Flatiron District", zone: "midtown", transportMode: "metro linea E (10 minuti) poi a piedi", cost: "incluso", notes: "Hudson Yards e il Vessel: il quartiere più nuovo di New York, costruito su una piattaforma sopra i binari ferroviari. Al centro c'è il Vessel, la struttura a nido d'ape di Thomas Heatherwick alta 46 metri, con 154 rampe di scale interconnesse: si sale su prenotazione, ma anche solo vederla da sotto vale la sosta. Accanto, The Edge, la terrazza panoramica sospesa nel vuoto a 345 metri con il pavimento di vetro (ingresso a pagamento, non incluso: circa 44 $). Avendo già Empire State e Top of the Rock, potete tranquillamente limitarvi ad ammirarlo dall'esterno.\n\nLa High Line: un'ex ferrovia sopraelevata degli anni Trenta, dismessa nel 1980 e salvata dalla demolizione da due residenti del quartiere, trasformata in un parco lineare lungo 2,3 chilometri sospeso a nove metri d'altezza. Si cammina tra graminacee, betulle e scorci sull'Hudson, passando attraverso i palazzi. Salite all'accesso di 34th Street/Hudson Yards e camminate verso sud.\n\nChelsea Market: a metà della High Line, scendete alla 16th Street, l'ex fabbrica dei biscotti Oreo è oggi un mercato coperto di mattoni e tubature a vista con una trentina di banchi di cibo da tutto il mondo. Il posto migliore della giornata per un pranzo veloce.\n\nLittle Island: il parco galleggiante inaugurato nel 2021 sul Pier 55, 132 tulipani di cemento emergono dall'acqua dell'Hudson sostenendo un giardino ondulato con vista sul fiume e sui tramonti. Ingresso libero, accesso da 13th Street e West Side Highway, a cinque minuti dalla fine della High Line.\n\nFlatiron District: risalite verso est fino alla Flatiron Building, il grattacielo a forma di ferro da stiro del 1902, largo appena due metri sulla punta: quando fu costruito i newyorkesi scommettevano su quando sarebbe crollato. Di fronte, Madison Square Park, dove nel 2004 è nato il primo chiosco di Shake Shack." },
      { time: "19:30", title: "Empire State Building", address: "20 W 34th St, New York", zone: "midtown", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Il grattacielo più famoso del mondo, tirato su in soli 410 giorni durante la Grande Depressione e inaugurato nel 1931. L'osservatorio dell'86° piano, all'aperto, è quello di King Kong, Insonnia d'amore e Un amore splendido. In agosto è aperto fino all'una di notte: alle 19:30 arriverete con la luce del tramonto e uscirete con la città accesa, che è il momento migliore in assoluto. Non perdetevi la lobby art decò e il museo interattivo al secondo piano." },
      { time: "21:00", title: "Aperitivo/cena al 230 Fifth rooftop", zone: "midtown", transportMode: "piedi (8 minuti)", cost: "$$$" },
    ],
  },
  {
    date: "2026-08-19",
    dayNumber: 11,
    title: "Tour dei Contrasti - Bronx, Queens, Brooklyn",
    location: "New York - Brooklyn",
    hotelName: "Hotel Riu Plaza New York Times Square",
    dressCode: "Il tour è in pullman con soste all'aperto, il pomeriggio è tutto a piedi: oggi camminerete circa dieci chilometri. Scarpe comode, cappello e acqua. Sul ponte di Brooklyn e sulla Promenade c'è sempre vento, e la sera nel Village l'aria si fa piacevole: portate una felpa leggera. Per la cena da Olio e Più va benissimo un abbigliamento casual curato.",
    summary: "Tour guidato in italiano (Bronx-Queens-Brooklyn) fino alle 14:00 a Dumbo, poi pomeriggio in autonomia verso Manhattan attraversando il Ponte di Brooklyn.",
    activities: [
      { time: "08:45", title: "Ritrovo al punto d'incontro «K»", requiresDocument: "QR code Tour dei Contrasti - Ordine WC-214392, ID 2e7bece9-0351-47a3-aaf3-6132b218fe78", notes: "Fornitore Il Mio Viaggio a New York. Presentatevi con dieci minuti di anticipo e mostrate alla guida il QR code del biglietto elettronico. L'indirizzo esatto del punto «K» è indicato sulla e-mail di conferma: verificatelo la sera prima e localizzatelo su Google Maps." },
      { time: "09:00", title: "Partenza del tour: Bronx, Queens, Brooklyn", cost: "incluso", notes: "Il Bronx: il borough più frainteso di New York. Passerete per il Grand Concourse, il viale art decò disegnato sul modello degli Champs-Élysées, per lo Yankee Stadium, per i quartieri dove negli anni Settanta, tra edifici incendiati e blackout, sono nati l'hip hop e il graffitismo. Vedrete anche Arthur Avenue, la vera Little Italy di New York, dove si parla ancora italiano nelle botteghe.\n\nIl Queens: il quartiere più multietnico del pianeta, qui si parlano oltre 160 lingue. Astoria greca, Jackson Heights indiana e colombiana, Flushing cinese. È il posto dove si capisce meglio come funziona davvero l'immigrazione americana." },
      { time: "14:00", title: "Fine tour a Dumbo, Brooklyn - da qui autonomi", zone: "brooklyn", notes: "Dumbo (acronimo di Down Under the Manhattan Bridge Overpass), ex zona industriale di magazzini in mattoni oggi tra le più ricercate della città. All'incrocio tra Washington Street e Water Street si trova la fotografia più replicata di New York: il Manhattan Bridge incorniciato dai palazzi, con l'Empire State Building che compare esattamente al centro dell'arcata." },
      { time: "14:30", title: "Brooklyn Bridge Park, Granite Prospect, Brooklyn Heights Promenade", zone: "brooklyn", transportMode: "piedi", cost: "free", notes: "Dal molo di Dumbo si scende al parco lungo l'East River. La gradinata di granito del Granite Prospect, al Pier 1, guarda dritta sullo skyline di Manhattan: è il punto migliore per una sosta e per le fotografie. Poco più in là c'è la Jane's Carousel, una giostra del 1922 restaurata e chiusa in un cubo di vetro sull'acqua.\n\nIl Squibb Park Bridge è una passerella pedonale zigzagante che sale dal parco fino a Brooklyn Heights. Da lì si raggiunge la Promenade, una terrazza lunga cinquecento metri sospesa sopra l'autostrada, affacciata su Manhattan, la Statua della Libertà e il porto. Alle spalle, le case di arenaria dell'Ottocento del quartiere più elegante di Brooklyn. Al tramonto è uno dei punti più belli di New York." },
      { time: "16:00", title: "Attraversamento a piedi del Ponte di Brooklyn", zone: "brooklyn/lower", transportMode: "piedi (35 minuti)", cost: "free", notes: "Costruito tra il 1869 e il 1883, fu il primo ponte sospeso in acciaio del mondo e per vent'anni la struttura più alta della città. La passerella pedonale corre sopra il traffico, in legno, tra i cavi e le arcate neogotiche: 1.825 metri. L'accesso lato Brooklyn si trova all'angolo tra Washington Street e Prospect Street, a dieci minuti da Dumbo. Camminate verso Manhattan: avrete lo skyline davanti per tutto il percorso." },
      { time: "17:00", title: "Il quartier generale dei Ghostbusters e SoHo", zone: "lower", transportMode: "piedi", notes: "Sceso dal ponte, in dieci minuti a piedi verso ovest siete a Tribeca: la caserma Hook & Ladder 8, al 14 North Moore Street, è la facciata usata nel film del 1984. È una caserma dei vigili del fuoco ancora operativa: si fotografa dall'esterno e non si entra, ma spesso i pompieri sono disponibili a scambiare due parole. In terra, davanti all'ingresso, c'è il logo.\n\nSoHo (South of Houston Street) è il quartiere delle facciate in ghisa, la più grande concentrazione al mondo di architettura in cast iron, costruite tra il 1840 e il 1880 come magazzini. Le strade di pietra (Greene Street e Mercer Street sono le più belle) ospitano oggi le boutique dei grandi marchi e gallerie d'arte." },
      { time: "20:00", title: "Cena da Olio e Più, Greenwich Village", zone: "lower", transportMode: "metro linea 1 o 15 min a piedi da SoHo", cost: "$$$", notes: "Prenotare su OpenTable, si riempie sempre" },
      { time: "22:00", title: "Rientro in hotel", transportMode: "metro linea 1 (12 min) o uber (20-25$)" },
    ],
  },
  {
    date: "2026-08-20",
    dayNumber: 12,
    title: "Statua della Libertà, Ellis Island, Ground Zero, Top of the Rock",
    location: "New York - Downtown",
    hotelName: "Hotel Riu Plaza New York Times Square",
    dressCode: "Oggi è la giornata più lunga: dodici ore fuori e almeno quindici chilometri a piedi. Scarpe comodissime e un cambio di calzini nello zaino non sono un'esagerazione. Sul battello e a Liberty Island il vento è forte: felpa e cappello ben calzato. Al 9/11 Museum e in tutti gli interni l'aria condizionata è molto fredda. In cima al Top of the Rock, alle nove di sera, servirà una felpa anche in agosto. Portate un caricatore portatile: userete molto il telefono.",
    summary: "La giornata più densa e più emozionante del vostro soggiorno newyorkese: si comincia dal simbolo dell'America e si finisce a trecento metri d'altezza, con il tramonto sul Central Park.",
    activities: [
      { time: "08:15", title: "Partenza per Battery Park", zone: "lower", transportMode: "metro linea 1 (30 minuti, no cambi)" },
      { time: "08:50", title: "Arrivo a Battery Park", notes: "Fate subito la fila al controllo di sicurezza: è simile a quello aeroportuale." },
      { time: "09:45", title: "Imbarco per Liberty Island (Statua della Libertà) ed Ellis Island", zone: "lower", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Statua della Libertà: progettata da Frédéric Auguste Bartholdi con la struttura interna di Gustave Eiffel, fu donata dalla Francia agli Stati Uniti e inaugurata nel 1886. È alta 93 metri dalla base alla fiaccola e pesa 225 tonnellate: il rame che la riveste è spesso appena 2,4 millimetri, quanto due monete, e il verde è l'ossidazione di trent'anni di salsedine. La corona ha sette raggi, uno per ogni continente e ogni mare. Ai piedi, spezzate, ci sono le catene della schiavitù: un dettaglio che si vede solo dall'alto e che quasi nessuno conosce. Il vostro biglietto comprende l'accesso ai grounds, l'isola e il museo, non la salita al piedistallo o alla corona.\n\nEllis Island: tra il 1892 e il 1954 sono passati da qui dodici milioni di migranti, e si stima che quasi la metà degli americani di oggi abbia almeno un antenato che ha attraversato quella sala. Il Registry Room, la grande aula con la volta di piastrelle Guastavino, è il luogo dove ci si metteva in fila per l'ispezione medica. Nel museo si possono cercare i nomi degli antenati negli archivi digitali: se avete parenti emigrati in America, provate. Per gli italiani è una visita che tocca da vicino: furono oltre quattro milioni." },
      { time: "13:30", title: "Rientro a Battery Park, pranzo veloce in zona" },
      { time: "14:30", title: "9/11 Memorial & Museum", zone: "lower", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Le due vasche quadrate scavate esattamente dove sorgevano le Torri Gemelle, con l'acqua che precipita nel vuoto e i 2.983 nomi incisi nel bronzo del parapetto. Il museo è sotto il livello stradale, alla quota delle fondamenta originali: si scende lungo la rampa fino all'ultima colonna, i mezzi dei vigili del fuoco, le voci registrate. È una visita intensa e a tratti dura: valutate con attenzione se portare bambini piccoli nella sezione storica, che è separata e segnalata proprio per questo. Nel piazzale, il Survivor Tree, un pero ritrovato tra le macerie e ripiantato." },
      { time: "16:30", title: "Oculus, Wall Street, South Street Seaport", zone: "lower", transportMode: "piedi", cost: "free", notes: "Oculus e One World Observatory: adiacente al memoriale, l'Oculus di Santiago Calatrava è la stazione-cattedrale in acciaio bianco che sembra un uccello in volo o una gabbia toracica: entrateci, l'interno vale più dell'esterno. Sopra di voi, la One World Trade Center, alta 541 metri.\n\nWall Street: la New York Stock Exchange con la facciata neoclassica e la bandiera, la Federal Hall dove George Washington prestò giuramento nel 1789, il Charging Bull di Arturo Di Modica (scultore siciliano che lo installò abusivamente una notte del 1989) e la Fearless Girl, oggi davanti alla Borsa. Non lontano, la piccola Trinity Church con il suo cimitero seicentesco incastrato tra i grattacieli.\n\nSouth Street Seaport: l'antico porto di New York, con le strade acciottolate di Front Street, i velieri storici ormeggiati e il Pier 17, che ha una terrazza panoramica gratuita affacciata sul Ponte di Brooklyn: uno dei punti più belli e meno affollati della città nel tardo pomeriggio." },
      { time: "18:00", title: "Sosta da Katz's Delicatessen per il pastrami", zone: "lower", transportMode: "metro linea J (2 fermate) + 8 min a piedi", cost: "$$", notes: "205 East Houston Street. Aperto nel 1888, è la gastronomia ebraica più famosa del mondo e un pezzo di storia del Lower East Side. Il pastrami on rye – punta di petto salmistrata, affumicata e cotta a vapore per giorni, servita con senape su pane di segale – è una porzione enorme: uno ogni due persone è più che sufficiente. Funziona così: all'ingresso vi danno un biglietto a testa, che dovete assolutamente conservare (smarrirlo costa 50 $), ordinate al bancone dei tagliatori, si lascia 1–2 $ di mancia al tagliatore e si paga all'uscita. Al tavolo in fondo a destra c'è il cartello della scena di Harry ti presento Sally." },
      { time: "20:00", title: "Top of the Rock", address: "30 Rockefeller Plaza", zone: "midtown", cost: "citypass", requiresDocument: "New York CityPASS", transportMode: "metro linea F (15 min)", notes: "Ingresso su 50th Street tra la 5th e la 6th Avenue. La terrazza dell'edificio art decò del 1933 è su tre livelli, il più alto senza vetri né reti. Molti la considerano la vista migliore della città, per un motivo semplice: da qui vedete l'Empire State Building davanti a voi e Central Park alle spalle, entrambi nella stessa inquadratura. Alle 20:00 di agosto arriverete con la luce dorata e assisterete all'accensione della città. Al piano c'è anche The Beam, la ricostruzione della celebre fotografia degli operai a pranzo sulla trave." },
      { time: "21:30", title: "Cena da Ellen's Stardust Diner", zone: "midtown", transportMode: "piedi", cost: "$$" },
    ],
  },
  {
    date: "2026-08-21",
    dayNumber: 13,
    title: "Natural History Museum, Central Park, Queens, Roosevelt Island",
    location: "New York - Uptown",
    hotelName: "Hotel Riu Plaza New York Times Square",
    dressCode: "Giornata mista: musei molto climatizzati, parco al sole, sera sull'acqua ventosa. Vestitevi a strati con una felpa sempre nello zaino. Al Gantry Plaza e sul traghetto, di sera, il vento dell'East River rinfresca parecchio. Per The Dickens è gradito uno smart casual: pantalone lungo e camicia o polo, niente canottiere né ciabatte. È l'ultima sera: vale la pena vestirsi un po' meglio anche per le fotografie.",
    summary: "Ultimo giorno pieno a New York, ed è anche il più vario: si comincia con i dinosauri, si attraversa il polmone verde della città, si passeggia tra i palazzi dell'Upper East Side e si finisce con due dei panorami più belli e meno turistici di tutta Manhattan, visti dall'altra sponda del fiume.",
    activities: [
      { time: "09:15", title: "Partenza per l'Upper West Side", zone: "uptown", transportMode: "metro linea C (15 min, uscita dentro il museo)" },
      { time: "10:00", title: "American Museum of Natural History", zone: "uptown", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Trenta milioni di reperti su quattro piani e ventisei edifici collegati: è il museo di storia naturale più grande del mondo, quello di Una notte al museo. Le sale imperdibili: al quarto piano i dinosauri, con il Tyrannosaurus rex e il Barosaurus che si erge nell'atrio d'ingresso alto due piani; al primo la balenottera azzurra di 29 metri sospesa a mezz'aria nella Hall of Ocean Life, e la sala dei meteoriti con il frammento di Cape York di 34 tonnellate; i celebri diorami africani, dipinti a mano negli anni Trenta e rimasti identici. Nuovissimo il Gilder Center, con il suo canyon di cemento bianco e la casa delle farfalle. Con i ragazzi servono almeno due ore e mezza." },
      { time: "12:00", title: "Central Park (attraversamento ovest-est)", zone: "uptown", transportMode: "piedi (25 min)", cost: "free", notes: "843 acri disegnati nel 1858 da Frederick Law Olmsted e Calvert Vaux: è interamente artificiale, ogni collina, laghetto e roccia è stata progettata. Uscendo dal museo entrate all'altezza della 79th Street e attraversate verso est. Sul percorso: il Belvedere Castle, il Turtle Pond, il Great Lawn, la scenografica Bethesda Terrace con la fontana dell'Angelo delle acque, il Bow Bridge e, poco più a sud, Strawberry Fields con il mosaico Imagine dedicato a John Lennon, che abitava e fu ucciso di fronte, al Dakota Building. Fermatevi almeno mezz'ora seduti su un prato: fa parte dell'esperienza." },
      { time: "14:00", title: "Upper East Side, Museum Mile, Fifth Avenue", zone: "uptown", transportMode: "piedi o metro 4/5/6", notes: "Museum Mile, il MET e il Guggenheim: uscendo sul lato est di Central Park vi trovate sulla Fifth Avenue davanti a due dei musei più importanti del mondo. Il Metropolitan Museum of Art (1000 5th Ave, all'altezza della 82nd) è una città nella città: il tempio egizio di Dendur, le armature, gli impressionisti, la terrazza sul tetto aperta in estate. Il Guggenheim (1071 5th Ave, alla 88th) è l'ultima opera di Frank Lloyd Wright, una spirale bianca che si percorre dall'alto verso il basso. Nessuno dei due è incluso nel CityPASS con la scelta fatta: l'ingresso costa circa 30 $ al MET e 30 $ al Guggenheim.\n\nUpper East Side: il quartiere più elegante di Manhattan, palazzi in pietra calcarea con portieri in livrea, boutique su Madison Avenue, caffè con i tavolini sul marciapiede. Scendete lungo la Fifth o la Madison verso sud fino alla 59th, dove incontrerete il Plaza Hotel, le carrozze davanti al parco e la Apple Store con il cubo di vetro sulla Fifth." },
      { time: "18:15", title: "Trasferimento verso Queens", zone: "uptown/queens", transportMode: "metro linea 7 dalla Grand Central (20 min)" },
      { time: "19:00", title: "Gantry Plaza State Park", zone: "queens", cost: "free", notes: "Attraversate l'East River e uscite a Long Island City, nel Queens: questo parco lungo l'acqua, con le vecchie gru ferroviarie restaurate e l'insegna al neon Pepsi-Cola del 1940, offre la vista frontale più spettacolare su Midtown Manhattan. Al tramonto, con il sole che scende dietro i grattacieli e le luci che si accendono, è il posto dove i newyorkesi portano gli amici in visita. Quasi nessun turista, ingresso libero." },
      { time: "21:00", title: "Roosevelt Island", zone: "queens/uptown", transportMode: "NYC Ferry (4$) o funivia da 59th St (2.90$ OMNY)", notes: "Un'isola lunga tre chilometri e larga duecento metri in mezzo all'East River. All'estremità sud il Four Freedoms Park, ultima opera di Louis Kahn; all'estremità nord un faro del 1872 e le rovine gotiche del vecchio ospedale del vaiolo, illuminate di notte. La cosa più bella però è il modo di arrivarci: il traghetto dal Gantry, oppure la funivia (Roosevelt Island Tramway), che parte dalla 59th Street e sorvola l'East River a 76 metri d'altezza, accanto al Queensboro Bridge. Verificate l'ultima corsa del traghetto la sera." },
      { time: "21:30", title: "Cena/cocktail al The Dickens", address: "783 8th Ave", zone: "midtown", cost: "$$$", notes: "Smart casual" },
    ],
  },
  {
    date: "2026-08-22",
    dayNumber: 14,
    title: "Mattinata libera e volo di rientro da Newark",
    location: "New York / in volo",
    dressCode: "Per il volo di rientro vestitevi comodi e a strati: dai 30 gradi umidi di New York arriverete in Puglia in piena estate, ma la cabina sarà fredda e il volo dura quasi nove ore, in gran parte notturne. Calze comode, felpa e una sciarpa leggera aiutano a dormire. Tenete nel bagaglio a mano documenti, farmaci, caricabatterie e un cambio essenziale.",
    luggageNote: "Check-out entro le 11:00, essere in hall entro le 11:20 con i bagagli (attesa transfer max 15 minuti)",
    summary: "Ultima passeggiata mattutina a Times Square (quasi vuota alle 8:00), poi transfer per Newark e volo diretto per Bari.",
    activities: [
      { time: "07:30", title: "Ultima colazione in hotel" },
      { time: "08:15", title: "Ultima passeggiata: Times Square, Bryant Park, Rockefeller Center, St. Patrick, Grand Central", zone: "midtown", transportMode: "piedi", cost: "free", notes: "Times Square al mattino: è l'unico momento in cui si può davvero guardarla, alle otto del mattino gli schermi sono accesi ma la piazza è quasi vuota, e le fotografie vengono molto meglio. Salite sulla gradinata rossa (le TKTS steps) per l'inquadratura classica.\n\nBryant Park: il salotto verde di Midtown, con i tavolini di ferro, la giostra e la New York Public Library alle spalle, quella dei due leoni di marmo Patience e Fortitude. La sala di lettura Rose, al terzo piano, è gratuita e visitabile.\n\nRockefeller Center e St. Patrick: la piazza con l'Atlante di bronzo, i giardini pensili e la cattedrale neogotica di St. Patrick sulla Fifth Avenue, gratuita e sempre aperta.\n\nGrand Central Terminal: il soffitto verde con le costellazioni dipinte al contrario (l'errore più famoso di New York), la scalinata di marmo, l'orologio d'ottone al centro del salone. Nel piano inferiore, davanti all'Oyster Bar, c'è la galleria dei sussurri: mettetevi in due agli angoli opposti dell'arcata, parlate verso il muro e vi sentirete come se foste vicini. Funziona davvero." },
      { time: "11:00", title: "Check-out e ritiro bagagli", notes: "Prima di partire: controllate casseforti, prese di corrente e bagno. Ricordate il limite dei liquidi da 100 ml nel bagaglio a mano." },
      { time: "11:30", title: "Transfer privato Hotel > Newark (EWR)", requiresDocument: "Prenotazione T2785672", transportMode: "transfer privato (Llevame NYC)", notes: "Attesa massima autista 15 minuti, essere in hall entro le 11:20" },
      { time: "12:30", title: "Arrivo a Newark, tre ore prima del volo", notes: "Check-in, controlli e ultimo pranzo americano al terminal. Il terminal è grande e le file ai controlli sono lunghe: presentatevi al gate con anticipo." },
      { time: "15:35", title: "Partenza UA 380 per Bari", notes: "Volo diretto, Boeing 767, 8 ore e 55, pasto incluso." },
    ],
  },
  {
    date: "2026-08-23",
    dayNumber: 15,
    title: "Arrivo a Bari",
    location: "Bari",
    summary: "Atterraggio a Bari alle 06:30. Fine dei servizi. Quattordici giorni, due oceani, cinque stati, sei parchi nazionali e tribali, tre fusi orari e qualche migliaio di fotografie.",
    activities: [
      { time: "06:30", title: "Atterraggio a Bari", notes: "Fine dei servizi C&C Viaggi" },
    ],
  },
];

const MEDICATIONS = [
  {
    name: "Eutirox (levotiroxina)",
    reason: "Terapia tiroidea quotidiana",
    phraseEn: "I take this daily for a thyroid condition, prescribed by my doctor.",
  },
  {
    name: "Foster (inalatore)",
    reason: "Asma",
    phraseEn: "This is an asthma inhaler, prescribed medication I use daily.",
  },
  {
    name: "Antistaminico",
    reason: "Allergie",
    phraseEn: "These are antihistamines for my allergies.",
  },
  {
    name: "Alevertan",
    reason: "Vertigini",
    phraseEn: "This is a medication for dizziness and vertigo.",
  },
  {
    name: "Antiacido / gastroprotettore",
    reason: "Esofagite",
    phraseEn: "This is an antacid I take for a digestive condition (esophagitis).",
  },
  {
    name: "Spray nasale",
    reason: "Cervicale / congestione",
    phraseEn: "This is an over-the-counter nasal spray.",
  },
  {
    name: "Antinfiammatorio",
    reason: "Precauzione dolori/infiammazioni",
    phraseEn: "These are over-the-counter anti-inflammatory painkillers.",
  },
  {
    name: "Antibiotico ad ampio spettro",
    reason: "Precauzione, su indicazione del medico",
    phraseEn: "This is a prescription antibiotic for emergency use, prescribed by my doctor.",
  },
  {
    name: "Cortisonico",
    reason: "Precauzione (allergie/asma)",
    phraseEn: "This is a corticosteroid medication prescribed by my doctor for emergencies.",
  },
  {
    name: "Antiemetico (nausea/vomito)",
    reason: "Precauzione",
    phraseEn: "This is an over-the-counter medication for nausea.",
  },
  {
    name: "Antidiarroico / fermenti lattici",
    reason: "Precauzione, disturbi intestinali",
    phraseEn: "These are over-the-counter probiotics and anti-diarrheal medication.",
  },
  {
    name: "Sali minerali",
    reason: "Reintegro per il caldo (deserto/parchi)",
    phraseEn: "These are electrolyte/mineral supplements for hydration.",
  },
];

const CUSTOMS_PHRASES = [
  { category: "Motivo del viaggio", italian: "Sono in vacanza, turismo.", english: "I'm here on vacation, for tourism.", order: 1 },
  { category: "Motivo del viaggio", italian: "Viaggio con la mia famiglia / con un gruppo di amici.", english: "I'm traveling with my family / with a group of friends.", order: 2 },
  { category: "Quanti siete", italian: "Siamo in 15 persone, 4 famiglie, ma viaggiamo con un tour organizzato.", english: "We are 15 people, 4 families, traveling together on an organized tour.", order: 3 },
  { category: "Durata soggiorno", italian: "Restiamo 15 giorni.", english: "We are staying for 15 days.", order: 4 },
  { category: "Durata soggiorno", italian: "Il nostro volo di rientro è il 22/23 agosto da Newark.", english: "Our return flight is on August 22nd/23rd from Newark.", order: 5 },
  { category: "Dove alloggiate", italian: "Il nostro primo hotel è l'Hilton Los Angeles Airport.", english: "Our first hotel is the Hilton Los Angeles Airport.", order: 6 },
  { category: "Farmaci", italian: "Ho con me alcuni farmaci da prescrizione e da banco per uso personale, con le confezioni originali.", english: "I'm carrying some prescription and over-the-counter medications for personal use, in their original packaging.", order: 7 },
  { category: "Farmaci", italian: "Sono farmaci che uso regolarmente per una condizione cronica (tiroide/asma/allergie).", english: "These are medications I take regularly for a chronic condition (thyroid/asthma/allergies).", order: 8 },
  { category: "Cibo", italian: "Non ho alimenti freschi, carne, salumi o formaggi con me.", english: "I don't have any fresh food, meat, or cheese with me.", order: 9 },
  { category: "Generale", italian: "Non parlo molto bene l'inglese, mi scusi.", english: "I don't speak English very well, I'm sorry.", order: 10 },
  { category: "Generale", italian: "Può ripetere più lentamente, per favore?", english: "Could you repeat that more slowly, please?", order: 11 },
];

const OPTIONAL_EXCURSIONS = [
  { day: "Mar 11 ago", title: "Los Angeles by the beach", price: "60 $ a persona", description: "Santa Monica e Venice Beach", recommendation: "Comoda: il pullman termina il city tour a Hollywood e non rientra in hotel. Il modo più semplice per vedere l'oceano.", order: 1 },
  { day: "Mer 12 ago", title: "Las Vegas by night - luci e suoni", price: "60 $ a persona", description: "Giro serale guidato tra gli hotel-monumento della Strip", recommendation: "Molto consigliata la prima sera: orienta sulla Strip senza pensieri.", order: 2 },
  { day: "Gio 13 ago", title: "Grand Canyon Air Tour", price: "245 $ a persona", description: "Sorvolo di 45-50 minuti in aereo", recommendation: "Esperienza indimenticabile ma impegnativa nel budget. Valutare se si soffre il mal d'aria.", order: 3 },
  { day: "Ven 14 ago", title: "Monument Valley Jeep Tour", price: "80 $ a persona", description: "1h30/2h con guide Navajo", recommendation: "La più consigliata di tutte: senza jeep si vede solo il piazzale panoramico, con la jeep si entra nella valle.", order: 4 },
  { day: "Ven 14 ago", title: "Lake Powell Air Tour", price: "225 $ a persona", description: "40-45 minuti su Lake Powell e Horseshoe Bend", recommendation: "Bellissimo, ma se dovete scegliere un solo volo panoramico molti preferiscono il Grand Canyon.", order: 5 },
];

// Servizi prenotati per tutto il gruppo: i nominativi sui voucher sono quelli
// del capo pratica, ma il servizio vale per tutti.
const COMMON_DOCUMENTS = [
  { title: "Biglietti aerei — tutte le tratte", category: "volo", filePath: "TUTTI/voli.pdf", note: "Codice prenotazione F2XMF3 · Lufthansa XPUAH4 · United H9ZZBC" },
  { title: "Universal Studios Hollywood", category: "biglietto", filePath: "TUTTI/universal_studios.pdf", tripDayNumber: 2, note: "DA STAMPARE. Biglietto nominale: serve un documento con foto al tornello" },
  { title: "New York CityPASS (5 attrazioni)", category: "biglietto", filePath: "TUTTI/citypass_new_york.pdf", tripDayNumber: 10, note: "Rif. 254-7187999 · meglio l'app My CityPASS, ma tenetene una copia" },
  { title: "MoMA — ingresso 18 agosto", category: "biglietto", filePath: "TUTTI/moma.pdf", tripDayNumber: 10, note: "DA STAMPARE, il voucher lo richiede espressamente. Rif. 254-7188066" },
  { title: "Tour dei Contrasti (Bronx, Queens, Brooklyn)", category: "biglietto", filePath: "TUTTI/tour_dei_contrasti.pdf", tripDayNumber: 11, note: "QR code · ordine WC-214392 · 19 agosto ore 09:00, 15 adulti" },
  { title: "City tour di Los Angeles", category: "biglietto", filePath: "TUTTI/city_tour_los_angeles.pdf", tripDayNumber: 3, note: "Partenza 08:15 dalla hall dell'Hilton LAX" },
  { title: "TeamTour West — 6 giorni", category: "biglietto", filePath: "TUTTI/teamtour_west.pdf", tripDayNumber: 4, note: "Partenza mercoledì 08:15 dall'Hilton LAX · rif. 1447289" },
  { title: "America the Beautiful Pass (supplemento)", category: "biglietto", filePath: "TUTTI/america_the_beautiful_pass.pdf", note: "Esenta dalla tariffa per non residenti nei parchi nazionali" },
  { title: "Hotel Hilton Los Angeles — prima notte", category: "hotel", filePath: "TUTTI/hotel_lax_prima_notte.pdf", tripDayNumber: 1, note: "Rif. 256-16886861 · check-in dalle 16:00 · carta di credito obbligatoria in cauzione" },
  { title: "Hotel Hilton Los Angeles — notti del tour", category: "hotel", filePath: "TUTTI/hotel_lax_tour.pdf", note: "Colazione Grab & Go inclusa" },
  { title: "Hotel Riu Plaza New York", category: "hotel", filePath: "TUTTI/hotel_new_york.pdf", tripDayNumber: 10, note: "Prenotazione RNT5QHDM · 18-22 agosto" },
  { title: "Transfer aeroporto Los Angeles → hotel", category: "transfer", filePath: "TUTTI/transfer_arrivo_lax.pdf", tripDayNumber: 1, note: "Navetta gratuita dell'hotel, non un autista privato" },
  { title: "Transfer Las Vegas → aeroporto", category: "transfer", filePath: "TUTTI/transfer_las_vegas_aeroporto.pdf", tripDayNumber: 9, note: "Ordine 538734646 · 17 agosto ore 19:00 · cartello DANIELE SERINO" },
  { title: "Transfer Newark → hotel New York", category: "transfer", filePath: "TUTTI/transfer_newark_hotel.pdf", tripDayNumber: 10, note: "Prenotazione T2785671 · attesa massima 1 ora dall'atterraggio" },
  { title: "Transfer hotel → Newark", category: "transfer", filePath: "TUTTI/transfer_hotel_newark.pdf", tripDayNumber: 14, note: "Prenotazione T2785672 · 22 agosto ore 11:30 · attesa massima 15 minuti" },
  { title: "Polizza assicurativa", category: "assicurazione", filePath: "TUTTI/polizza_assicurativa.pdf", note: "Nobis / I4T · centrale operativa +39 039 989 0702, attiva 24h" },
  { title: "Assicurazione — condizioni complete", category: "assicurazione", filePath: "TUTTI/assicurazione_condizioni.pdf" },
  { title: "Programma di viaggio completo (C&C Viaggi)", category: "altro", filePath: "TUTTI/programma_completo.pdf" },
  { title: "Programma dettagliato New York", category: "altro", filePath: "TUTTI/programma_new_york.pdf" },
  { title: "Escursioni facoltative — dettaglio", category: "altro", filePath: "TUTTI/attivita_opzionali.pdf" },
  { title: "TeamTour West — programma del bus", category: "altro", filePath: "TUTTI/team_tour_west_complete.pdf" },
  { title: "Le nostre domande e le risposte dell'agenzia", category: "altro", filePath: "TUTTI/nostre_note.pdf" },
];

// Persone per famiglia, per il "Chi sei?".
const PEOPLE: Record<string, string[]> = {
  SERINO: ["Alessandra", "Claudia", "Daniele", "Elena", "Maria"],
  GIANNELLA: ["Giuseppe", "Lucia"],
  DICUONZO: ["Piero", "Angela", "Valeria", "Francesca"], // Pierluigi, detto Piero
  CAFAGNA: ["Michele", "Chiara", "Angelo", "Emanuela"],
};

// Documenti nominali: visibili solo alla propria famiglia.
const FAMILY_DOCUMENTS: Record<
  string,
  { title: string; category: string; filePath: string; note?: string }[]
> = {
  SERINO: [
    { title: "ESTA — Daniele", category: "esta", filePath: "SERINO/esta_daniele.pdf", note: "DA STAMPARE o da tenere sul telefono: può essere richiesta alla frontiera" },
    { title: "ESTA — Maria", category: "esta", filePath: "SERINO/esta_maria.pdf" },
    { title: "ESTA — Claudia", category: "esta", filePath: "SERINO/esta_claudia.pdf" },
    { title: "ESTA — Elena", category: "esta", filePath: "SERINO/esta_elena.pdf" },
    { title: "ESTA — Alessandra", category: "esta", filePath: "SERINO/esta_alessandra.pdf" },
    { title: "Carte d'imbarco — voli di andata (9 agosto)", category: "volo", filePath: "SERINO/carte_imbarco_andata.pdf", tripDayNumber: 1, note: "Check-in già effettuato: posti ufficiali confermati su entrambi i voli. Bari-Monaco: Daniele 7F, Alessandra 8F, Claudia 7C, Elena 7A, Maria 7D. Monaco-Los Angeles: Daniele 86B, Alessandra 86A, Claudia 86D, Elena 86E, Maria 86C." },
  ],
};

async function main() {
  console.log("Seeding famiglie...");
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, 10);
  for (const f of FAMILIES) {
    await prisma.family.upsert({
      where: { code: f.code },
      update: {},
      create: { ...f, passwordHash },
    });
  }

  console.log("Seeding giorni e attività...");
  for (const day of DAYS) {
    const tripDay = await prisma.tripDay.upsert({
      where: { dayNumber: day.dayNumber },
      update: {
        date: new Date(day.date),
        title: day.title,
        location: day.location,
        hotelName: day.hotelName,
        hotelInfo: day.hotelInfo,
        wakeInfo: day.wakeInfo,
        luggageNote: day.luggageNote,
        dressCode: day.dressCode,
        summary: day.summary,
      },
      create: {
        dayNumber: day.dayNumber,
        date: new Date(day.date),
        title: day.title,
        location: day.location,
        hotelName: day.hotelName,
        hotelInfo: day.hotelInfo,
        wakeInfo: day.wakeInfo,
        luggageNote: day.luggageNote,
        dressCode: day.dressCode,
        summary: day.summary,
      },
    });

    await prisma.activity.deleteMany({ where: { tripDayId: tripDay.id } });
    await prisma.mealSuggestion.deleteMany({ where: { tripDayId: tripDay.id } });

    let order = 0;
    for (const a of day.activities) {
      await prisma.activity.create({
        data: { ...a, tripDayId: tripDay.id, order: order++ },
      });
    }
    for (const m of MEALS_BY_DAY[day.dayNumber] ?? []) {
      await prisma.mealSuggestion.create({
        data: { ...m, tripDayId: tripDay.id },
      });
    }
  }

  console.log("Seeding farmaci, frasi dogana, escursioni facoltative...");
  await prisma.medication.deleteMany();
  await prisma.medication.createMany({ data: MEDICATIONS });

  await prisma.customsPhrase.deleteMany();
  await prisma.customsPhrase.createMany({ data: CUSTOMS_PHRASES });

  await prisma.optionalExcursion.deleteMany();
  await prisma.optionalExcursion.createMany({ data: OPTIONAL_EXCURSIONS });

  console.log("Seeding informazioni di emergenza...");
  await prisma.emergencyInfo.deleteMany();
  await prisma.emergencyInfo.create({
    data: {
      insuranceProvider: "Nobis Compagnia di Assicurazioni (intermediata I4T / Insurance Travel)",
      policyNumber:
        "Polizza n. 204075033 — copertura I4T PLATINO MBA 3.5 (area: Mondo), valida dal " +
        "09/08/2026 al 23/08/2026. Il numero di certificato è diverso per ogni famiglia " +
        "(quello della famiglia Serino è NOB2209315): il vostro è sulla polizza nella " +
        "sezione Documenti. Denuncia sinistri: sinistri.i4t.it oppure sinistri@i4t.it",
      insurancePhone: "+39 039 989 0702 (dall'estero, centrale operativa attiva 24h) — dall'Italia numero verde 800 894 123",
      agencyPhone24h: "+39 333 676 7604",
      agencyEmail: "info@ccviaggi.it",
      teamAmericaNyPhone: "+1 212 697 7165",
      lostDocumentSteps:
        "1) Contattare subito l'agenzia C&C Viaggi (+39 333 676 7604) e la guida/assistenza TeamAmerica. " +
        "2) Per il passaporto: contattare il Consolato Generale d'Italia più vicino (Los Angeles +1 310 820 0622, emergenze +1 310 433 5422; New York +1 212 737 9100) per un documento di viaggio provvisorio (ETD). " +
        "3) Fare una denuncia alla polizia locale se richiesto per l'assicurazione. " +
        "4) Tenere sempre una copia digitale (foto/email) di passaporto, ESTA e biglietti.",
      lostBaggageSteps:
        "1) Prima di lasciare l'area bagagli, segnalare la mancanza al banco 'Baggage Service' della compagnia aerea (Lufthansa o United) e ottenere un numero di riferimento (PIR). " +
        "2) Conservare la ricevuta del check-in e lo scontrino bagagli. " +
        "3) Contattare l'agenzia C&C Viaggi (+39 333 676 7604) per assistenza. " +
        "4) La compagnia aerea di solito consegna il bagaglio in hotel entro 24-48h; conservare le ricevute di eventuali acquisti di prima necessità per il rimborso.",
      medicalEmergencySteps:
        "1) Emergenza grave: chiamare il 911 (polizia/ambulanza/vigili del fuoco), come in Italia il 112. " +
        "2) Contattare subito la centrale operativa Nobis al +39 039 989 0702, attiva 24h su 24: chiamatela PRIMA di andare in ospedale, se la situazione lo permette, perché è quella che autorizza le cure in pagamento diretto. " +
        "3) Avvisare la guida TeamAmerica (+1 212 697 7165, durante il tour Ovest) o la reception dell'hotel. " +
        "4) Avvisare l'agenzia C&C Viaggi (+39 333 676 7604). " +
        "5) Portare sempre con sé il documento di polizza con numero e telefono dell'assicurazione.",
    },
  });

  console.log("Seeding suggerimenti dal web (fonte: nostra ricerca)...");
  // Le coordinate servono al pulsante "cerca qui intorno" su Google Maps.
  for (const [dayNumber, coords] of Object.entries(DAY_COORDS)) {
    await prisma.tripDay.update({
      where: { dayNumber: Number(dayNumber) },
      data: { lat: coords.lat, lng: coords.lng },
    });
  }

  await prisma.suggestion.deleteMany();
  const verifiedAt = new Date("2026-08-08");
  const perDay = new Map<number, number>();
  for (const s of SUGGESTIONS) {
    const day = await prisma.tripDay.findUnique({ where: { dayNumber: s.dayNumber } });
    if (!day) {
      console.warn(`  giorno ${s.dayNumber} non trovato, salto "${s.title}"`);
      continue;
    }
    const order = perDay.get(s.dayNumber) ?? 0;
    perDay.set(s.dayNumber, order + 1);

    const { dayNumber: _ignored, ...rest } = s;
    await prisma.suggestion.create({
      data: { ...rest, tripDayId: day.id, order, verifiedAt },
    });
  }
  console.log(`  ${SUGGESTIONS.length} suggerimenti inseriti`);

  console.log("Seeding persone (Chi sei?)...");
  for (const [code, names] of Object.entries(PEOPLE)) {
    const family = await prisma.family.findUniqueOrThrow({ where: { code } });
    for (const name of names) {
      await prisma.person.upsert({
        where: { familyId_name: { familyId: family.id, name } },
        update: {},
        create: { familyId: family.id, name },
      });
    }
  }

  console.log("Seeding documenti...");
  await prisma.document.deleteMany({ where: { familyId: null } });
  await prisma.document.createMany({ data: COMMON_DOCUMENTS.map((d) => ({ ...d, familyId: null })) });

  for (const [code, docs] of Object.entries(FAMILY_DOCUMENTS)) {
    const family = await prisma.family.findUniqueOrThrow({ where: { code } });
    await prisma.document.deleteMany({ where: { familyId: family.id } });
    await prisma.document.createMany({ data: docs.map((d) => ({ ...d, familyId: family.id })) });
  }

  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
