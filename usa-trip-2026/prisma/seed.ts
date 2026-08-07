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

const DAYS: DayInput[] = [
  {
    date: "2026-08-09",
    dayNumber: 1,
    title: "Bari > Monaco > Los Angeles",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    hotelInfo: "5711 W Century Blvd, Los Angeles CA 90045 - Tel. +1 310 410 4000",
    wakeInfo: "Sveglia 03:30, in aeroporto a Bari entro le 04:15",
    dressCode: "In aereo comodi e a strati (cabina fredda). A Los Angeles 27-28° secco, ma la sera la brezza dall'oceano fa scendere la temperatura: felpa nel bagaglio a mano.",
    summary: "La giornata più lunga del viaggio: da Bari a Los Angeles passando per Monaco, quasi 24 ore tra sveglia e arrivo in hotel. Restate svegli fino alle 21:00 locali per smaltire il jet lag in una notte sola.",
    activities: [
      { time: "04:15", title: "Check-in Bari, consegna bagagli", address: "Aeroporto di Bari" },
      { time: "06:00", title: "Volo LH1901 Bari > Monaco", notes: "Embraer 195, ristoro a pagamento" },
      { time: "07:45", title: "Scalo a Monaco, Terminal 2 (4h30, niente ansia)", notes: "Restate in area transiti, non si ritirano i bagagli. Wi-fi gratuito." },
      { time: "12:15", title: "Volo LH452 Monaco > Los Angeles", notes: "Airbus A380, pasti inclusi, 12 ore di volo" },
      { time: "15:15", title: "Atterraggio Los Angeles, Terminal B (Tom Bradley Intl)", notes: "Controlli di frontiera + ritiro bagagli: conta un'ora abbondante. Risposte da dare: turismo, Hilton Los Angeles Airport, durata soggiorno." },
      { time: "17:00", title: "Navetta gratuita per l'hotel", address: "Hilton Los Angeles Airport, 5711 W Century Blvd", transportMode: "navetta gratuita hotel (ogni 10-15 min)", cost: "incluso", notes: "Dal piano arrivi salire a Departures, seguire 'Hotel & Courtesy Shuttles', poi cartello rosso 'Hotel & Private Parking Shuttle'. 1-2$ di mancia all'autista consigliati." },
    ],
  },
  {
    date: "2026-08-10",
    dayNumber: 2,
    title: "Universal Studios Hollywood",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    dressCode: "Scarpe da ginnastica rodate (12-15 km a piedi), cappello, occhiali da sole, crema solare. Felpa leggera per la sera; cambio se pensate a Jurassic World.",
    summary: "Il biglietto Universal è valido 2 giorni: se oggi non vedete tutto potete tornare domani pomeriggio, quando il city tour lascia a Hollywood a due fermate di metro dal parco.",
    activities: [
      { time: "07:00", title: "Colazione Grab & Go in hotel" },
      { time: "07:45", title: "Trasferimento a Universal City", transportMode: "uber/taxi (45 min, 55-75$ a corsa) oppure navetta+metro (~1h45, 1.75$)", notes: "In taxi/Uber conviene dividere il costo in famiglia; la metro è più economica ma faticosa con bagagli e bambini." },
      { time: "09:00", title: "Apertura Universal Studios Hollywood", requiresDocument: "Biglietto Universal Studios (2 giorni)", notes: "Entrare all'apertura riduce molto le code. Da non perdere: Studio Tour, Wizarding World of Harry Potter, Super Nintendo World, Jurassic World/Transformers/Simpsons." },
      { time: "18:00", title: "Rientro con calma o cena a CityWalk" },
    ],
  },
  {
    date: "2026-08-11",
    dayNumber: 3,
    title: "City tour guidato di Los Angeles",
    location: "Los Angeles",
    hotelName: "Hilton Los Angeles Airport",
    dressCode: "Giornata di cammino: scarpe comode, cappello, occhiali da sole. Per la spiaggia: costume e asciugamano nello zainetto, felpa per il vento sul molo.",
    summary: "Il pullman termina il tour a Hollywood e NON rientra in hotel. Tre opzioni valide a fine mattinata: escursione facoltativa alla spiaggia, secondo ingresso a Universal, oppure pomeriggio libero a Hollywood.",
    activities: [
      { time: "08:00", title: "Presentarsi in hall (partenza 08:15, il pullman non aspetta i ritardatari)", requiresDocument: "Voucher TeamAmerica LAXS City Tours 4hrs" },
      { time: "08:15", title: "City tour guidato (italiano/spagnolo/inglese, ~4h): Downtown, Olvera Street, Hollywood Blvd, Walk of Fame, scritta Hollywood" },
      { time: "12:30", title: "Fine tour a Hollywood - scegliere una delle 3 opzioni", notes: "1) Escursione 'LA by the beach' 60$ (Santa Monica + Venice Beach, riporta in hotel). 2) Secondo ingresso Universal (metro linea B, 2 fermate). 3) Pomeriggio libero a Hollywood (Walk of Fame, Griffith Observatory)." },
      { time: "18:00", title: "Rientro autonomo in hotel se non si è scelta l'escursione", transportMode: "uber/lyft (45-60 min, 50-70$) oppure metro (~1h30, 1.75$)", notes: "Evitare la fascia 16:00-19:00, traffico intenso." },
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
    dressCode: "Pullman con aria condizionata fredda, a Calico 38-40°: felpa a portata di mano, scarpe chiuse, cappello, acqua. Sera a Las Vegas: evitare canottiere e infradito nei locali.",
    summary: "Inizia il TeamTour West con guida bilingue per 6 giorni. 432 km attraverso il deserto del Mojave, sosta a Calico Ghost Town.",
    activities: [
      { time: "07:45", title: "Bagagli pronti in hall", requiresDocument: "Voucher TeamAmerica TeamTour West Multilingual - Rif. 1447289" },
      { time: "08:15", title: "Partenza per Las Vegas con guida bilingue" },
      { time: "—", title: "Sosta a Calico Ghost Town", notes: "Città fantasma del 1881, miniere d'argento, casa di bottiglie di vetro" },
      { time: "sera", title: "Arrivo al Sahara Las Vegas", notes: "Escursione facoltativa 'Las Vegas by night' 60$ (fontane Bellagio, vulcano Mirage, Fremont Street)" },
    ],
  },
  {
    date: "2026-08-13",
    dayNumber: 5,
    title: "Las Vegas > Grand Canyon > Williams",
    location: "Arizona",
    hotelName: "Comfort Inn Near Grand Canyon (Williams)",
    dressCode: "Al Grand Canyon 30-33° di giorno ma a Williams (2000m) la sera scende sotto i 15°: felpa utile. Scarpe chiuse con suola scolpita per il Rim Trail, cappello a tesa larga. Possibili temporali pomeridiani: k-way leggero.",
    summary: "540 km verso est, attraverso la diga di Hoover fino ai 2100m del South Rim del Grand Canyon. L'Arizona non adotta l'ora legale.",
    activities: [
      { time: "—", title: "Partenza verso il Grand Canyon - South Rim", notes: "Sosta a Mather Point e Yavapai Point (Rim Trail pianeggiante). Bere costantemente: l'aria è secchissima a 2100m, ci si disidrata senza accorgersene." },
      { time: "sera", title: "Arrivo a Williams", notes: "Ultima città della Route 66 bypassata dall'autostrada (1984). Passeggiata serale di 20 minuti nel centro storico." },
    ],
  },
  {
    date: "2026-08-14",
    dayNumber: 6,
    title: "Williams > Monument Valley > Page",
    location: "Terra Navajo",
    hotelName: "Holiday Inn Express & Suites Page",
    dressCode: "Sole diretto e polvere rossa: manica lunga leggera, bandana o foulard per il jeep tour, occhiali da sole avvolgenti. Evitare vestiti chiari (la sabbia rossa lascia tracce).",
    summary: "460 km nella Nazione Navajo (71.000 km2, leggi e fuso propri). Attenzione: qui l'orologio va avanti di un'ora rispetto al resto dell'Arizona.",
    activities: [
      { time: "—", title: "Monument Valley - View Point panoramico", notes: "Escursione facoltativa consigliata: Monument Valley Jeep Tour 80$/persona, 1h30-2h con guide Navajo - permette di entrare nella valle, non solo vederla dal piazzale." },
      { time: "sera", title: "Arrivo a Page", notes: "Base per Antelope Canyon e Lake Powell. Escursione facoltativa Lake Powell Air Tour 225$ (40-45 min)." },
    ],
  },
  {
    date: "2026-08-15",
    dayNumber: 7,
    title: "Page > Antelope Canyon > Bryce Canyon",
    location: "Utah",
    hotelName: "Best Western Ruby's Inn",
    dressCode: "Escursione termica massima del viaggio: 35° ad Antelope al mattino, 15-18° a Bryce la sera, meno di 10° all'alba. Vestirsi a strati, pile/piumino leggero nel bagaglio a mano (non in valigia). Ad Antelope: scarpe chiuse obbligatorie, niente zaini.",
    summary: "Ferragosto tra due dei luoghi più fotografati al mondo. Antelope Canyon: niente zaini, borse, treppiedi o bastoni selfie, solo telefono/fotocamera.",
    activities: [
      { time: "—", title: "Antelope Canyon (slot canyon, guida Navajo obbligatoria)", notes: "Visita contingentata, si cammina in fila. Scarpe chiuse, niente zaini/borse/treppiedi." },
      { time: "—", title: "Trasferimento a Bryce Canyon (2400-2700m)", notes: "Punti panoramici: Sunset Point, Sunrise Point, Inspiration Point" },
    ],
  },
  {
    date: "2026-08-16",
    dayNumber: 8,
    title: "Bryce Canyon > Zion > Las Vegas",
    location: "Las Vegas",
    hotelName: "Sahara Las Vegas",
    dressCode: "A Zion 35-38°, afoso: abbigliamento leggerissimo, cappello, almeno 1L d'acqua a testa. Per la sera a Las Vegas: pantaloni lunghi e camicia se si va a ristorante/spettacolo, felpa per l'aria condizionata.",
    summary: "Ultimo giorno di parchi: Zion National Park (attenzione, possibile deviazione se il tunnel Zion-Mount Carmel chiude nel 2026, decisione indipendente dall'agenzia), poi rientro a Las Vegas con serata libera.",
    activities: [
      { time: "—", title: "Zion National Park", notes: "Il parco più verde del viaggio, gola scavata dal fiume Virgin. Possibile salto se il tunnel è chiuso ai veicoli fuori sagoma: la guida informerà in loco." },
      { time: "pomeriggio", title: "Rientro al Sahara Las Vegas, serata libera", notes: "Gratis e imperdibili: fontane del Bellagio (ogni 15 min dalle 20:00), canale del Venetian, giardini Flamingo, Fremont Street Experience." },
    ],
  },
  {
    date: "2026-08-17",
    dayNumber: 9,
    title: "Las Vegas: giornata libera, volo per New York",
    location: "Las Vegas / in volo",
    dressCode: "Volo notturno: comodi e a strati, pantaloni lunghi leggeri, felpa, calzini. Cabina fredda; a New York alle 6 del mattino farete colazione con 24° e molta umidità.",
    luggageNote: "Check-out ore 11:00, bagagli al bell desk dell'hotel (gratuito, ritirare lo scontrino - fotografatelo)",
    summary: "ATTENZIONE: oggi NON si prende il pullman del tour (che rientra a Los Angeles). Restate a Las Vegas e volate direttamente a New York in serata - comunicarlo alla guida il giorno prima.",
    activities: [
      { time: "08:00", title: "Colazione con calma, poi check-out ore 11:00" },
      { time: "11:00-18:30", title: "Giornata libera a Las Vegas", notes: "Piscina dell'hotel (usabile anche dopo il check-out), monorail sulla Strip, The Strat SkyPod, Fremont Street, outlet shopping." },
      { time: "18:30", title: "Rientro in hotel, ritiro bagagli" },
      { time: "19:00", title: "Transfer privato Sahara > Aeroporto Harry Reid (LAS)", requiresDocument: "Riferimento transfer", notes: "Appuntamento ingresso principale hotel, minivan fino a 7 posti, 15 min attesa gratuiti. Centro assistenza transfer +39 02 3858 2909 (int.8)." },
      { time: "22:38", title: "Volo UA1681 Las Vegas > Newark (notturno)", notes: "Boeing 737 MAX, 4h52, ristoro a pagamento. Con 3 ore di fuso in avanti si atterra alle 06:30." },
    ],
  },
  {
    date: "2026-08-18",
    dayNumber: 10,
    title: "Arrivo a New York - MoMA, Hudson Yards, Empire State",
    location: "New York - Midtown/West Side",
    hotelName: "Hotel Riu Plaza New York Times Square",
    hotelInfo: "305 West 46th Street, Manhattan NY 10036 - Tel. +1 646 864 1100",
    dressCode: "Notte in aereo poi giornata lunga di cammino: le scarpe più comode. Felpa nello zaino (MoMA molto climatizzato, terrazza Empire State ventosa la sera). Dress code 230 Fifth: niente pantaloncini sportivi o ciabatte.",
    summary: "Le stanze non sono disponibili prima delle 14:00-15:00: lasciate i bagagli al deposito hotel (gratuito) e iniziate subito la visita della città.",
    activities: [
      { time: "06:30", title: "Atterraggio a Newark, Terminal C", notes: "Volo interno, nessun controllo doganale, diretti al ritiro bagagli" },
      { time: "07:15", title: "Transfer privato Newark > Hotel Riu Plaza", requiresDocument: "Prenotazione T2785671", zone: "midtown", transportMode: "transfer privato (furgoncino 11 posti, Llevame NYC)", notes: "L'autista entra in terminal 45 minuti dopo l'atterraggio e aspetta fino a un'ora; oltre, costa 10 $ ogni 20 minuti. Vi scrive dal momento dell'atterraggio." },
      { time: "08:15", title: "Arrivo hotel, deposito bagagli, colazione", notes: "Prenotazione hotel RNT5QHDM" },
      { time: "09:45", title: "Passeggiata verso il MoMA lungo la 6th Avenue", zone: "midtown", transportMode: "piedi (15 min)" },
      { time: "10:30", title: "MoMA - Museum of Modern Art", address: "11 West 53rd Street, New York", zone: "midtown", cost: "incluso", requiresDocument: "Voucher MoMA STAMPATO - Rif. 254-7188066", notes: "Apertura 10:30, chiusura 17:30 (ven 20:30). Il voucher richiede la copia stampata e un documento con foto. Van Gogh, Picasso, Dalì, Monet al 5° piano." },
      { time: "13:30", title: "Hudson Yards, Vessel, High Line, Chelsea Market, Little Island, Flatiron District", zone: "midtown", transportMode: "metro linea E (10 min) poi a piedi", cost: "incluso" },
      { time: "19:30", title: "Empire State Building", address: "20 W 34th St, New York", zone: "midtown", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Ingresso già prenotato, arrivare 15-20 min prima per il controllo di sicurezza. Osservatorio 86° piano." },
      { time: "21:00", title: "Aperitivo/cena al 230 Fifth rooftop", zone: "midtown", transportMode: "piedi (8 min)", cost: "$$$" },
    ],
  },
  {
    date: "2026-08-19",
    dayNumber: 11,
    title: "Tour dei Contrasti - Bronx, Queens, Brooklyn",
    location: "New York - Brooklyn",
    hotelName: "Hotel Riu Plaza New York Times Square",
    dressCode: "Circa 10 km a piedi nel pomeriggio: scarpe comode, cappello, acqua. Vento sul ponte di Brooklyn e sulla Promenade: felpa leggera. Per la cena da Olio e Più: casual curato.",
    summary: "Tour guidato in italiano (Bronx-Queens-Brooklyn) fino alle 14:00 a Dumbo, poi pomeriggio in autonomia verso Manhattan attraversando il Ponte di Brooklyn.",
    activities: [
      { time: "08:45", title: "Ritrovo al punto d'incontro 'K' (verificare indirizzo esatto su Google Maps la sera prima)", requiresDocument: "QR code Tour dei Contrasti - Ordine WC-214392", notes: "Fornitore 'Il Mio Viaggio a New York'. Presentarsi con 10 min di anticipo." },
      { time: "09:00", title: "Tour guidato Bronx - Queens - Brooklyn", cost: "incluso", notes: "Grand Concourse, Yankee Stadium, Arthur Avenue (Little Italy), Astoria, Flushing" },
      { time: "14:00", title: "Fine tour a Dumbo, Brooklyn - da qui autonomi", zone: "brooklyn", notes: "Foto iconica Manhattan Bridge da Washington St/Water St" },
      { time: "14:30", title: "Brooklyn Bridge Park, Granite Prospect, Brooklyn Heights Promenade", zone: "brooklyn", transportMode: "piedi", cost: "free" },
      { time: "16:00", title: "Attraversamento a piedi del Ponte di Brooklyn (35 min)", zone: "brooklyn/lower", transportMode: "piedi", cost: "free" },
      { time: "17:00", title: "Ghostbusters HQ (Tribeca) e SoHo", zone: "lower", transportMode: "piedi" },
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
    dressCode: "12 ore fuori, 15 km a piedi: scarpe comodissime, cambio calzini nello zaino. Vento forte sul battello. Aria condizionata fredda al 9/11 Museum. Felpa in cima al Top of the Rock la sera. Caricatore portatile.",
    summary: "La giornata più densa: tre attrazioni CityPASS con orario fisso già prenotato. Il battello NON aspetta: arrivare a Battery Park entro le 08:50.",
    activities: [
      { time: "08:15", title: "Metro verso Battery Park (30 min, no cambi)", zone: "lower", transportMode: "metro linea 1" },
      { time: "09:45", title: "Battello per Liberty Island (Statua della Libertà) ed Ellis Island", zone: "lower", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Controllo di sicurezza tipo aeroportuale a Battery Park, arrivare entro le 08:50." },
      { time: "14:30", title: "9/11 Memorial & Museum", zone: "lower", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Visita intensa; valutare se portare bambini piccoli nella sezione storica." },
      { time: "16:30", title: "Oculus, Wall Street, South Street Seaport", zone: "lower", transportMode: "piedi", cost: "free" },
      { time: "18:00", title: "Sosta da Katz's Delicatessen per il pastrami", zone: "lower", transportMode: "metro linea J (2 fermate) + 8 min a piedi", cost: "$$", notes: "Conservare il biglietto dato all'ingresso: smarrirlo costa 50$." },
      { time: "20:00", title: "Top of the Rock", address: "30 Rockefeller Plaza", zone: "midtown", cost: "citypass", requiresDocument: "New York CityPASS", transportMode: "metro linea F (15 min)", notes: "Salita al tramonto: vista su Empire State e Central Park insieme." },
      { time: "21:30", title: "Cena da Ellen's Stardust Diner", zone: "midtown", transportMode: "piedi", cost: "$$" },
    ],
  },
  {
    date: "2026-08-21",
    dayNumber: 13,
    title: "Natural History Museum, Central Park, Queens, Roosevelt Island",
    location: "New York - Uptown",
    hotelName: "Hotel Riu Plaza New York Times Square",
    dressCode: "Giornata mista: musei molto climatizzati, parco al sole, sera sull'acqua ventosa. Felpa sempre nello zaino. Per The Dickens: smart casual (pantalone lungo, camicia/polo).",
    summary: "Ultimo giorno pieno: dai dinosauri del museo, attraverso Central Park, fino ai panorami meno turistici di Queens e Roosevelt Island.",
    activities: [
      { time: "09:15", title: "Metro verso Upper West Side", zone: "uptown", transportMode: "metro linea C (15 min, uscita dentro il museo)" },
      { time: "10:00", title: "American Museum of Natural History", zone: "uptown", cost: "citypass", requiresDocument: "New York CityPASS", notes: "Dinosauri al 4° piano, balenottera azzurra, diorami africani, nuovo Gilder Center" },
      { time: "12:00", title: "Central Park (attraversamento ovest-est)", zone: "uptown", transportMode: "piedi (25 min)", cost: "free", notes: "Belvedere Castle, Bethesda Terrace, Strawberry Fields" },
      { time: "14:00", title: "Upper East Side, Museum Mile, Fifth Avenue", zone: "uptown", transportMode: "piedi o metro 4/5/6", notes: "MET e Guggenheim non inclusi nel CityPASS (~30$ ciascuno)" },
      { time: "18:15", title: "Trasferimento verso Queens", zone: "uptown/queens", transportMode: "metro linea 7 dalla Grand Central (20 min)" },
      { time: "19:00", title: "Gantry Plaza State Park (tramonto sullo skyline)", zone: "queens", cost: "free" },
      { time: "21:00", title: "Roosevelt Island", zone: "queens/uptown", transportMode: "NYC Ferry (4$) o funivia da 59th St (2.90$ OMNY)", notes: "Verificare l'ultima corsa del traghetto la sera" },
      { time: "21:30", title: "Cena/cocktail al The Dickens", address: "783 8th Ave", zone: "midtown", cost: "$$$", notes: "Smart casual" },
    ],
  },
  {
    date: "2026-08-22",
    dayNumber: 14,
    title: "Mattinata libera e volo di rientro da Newark",
    location: "New York / in volo",
    dressCode: "Voli lunghi (quasi 9h) in gran parte notturni: comodi a strati, calze comode, felpa, sciarpa leggera per dormire. Bagaglio a mano con documenti, farmaci, caricabatterie e un cambio essenziale.",
    luggageNote: "Check-out entro le 11:00, essere in hall entro le 11:20 con i bagagli (attesa transfer max 15 minuti)",
    summary: "Ultima passeggiata mattutina a Times Square (quasi vuota alle 8:00), poi transfer per Newark e volo diretto per Bari.",
    activities: [
      { time: "07:30", title: "Ultima colazione in hotel" },
      { time: "08:15", title: "Ultima passeggiata: Times Square, Bryant Park, Rockefeller Center, St. Patrick, Grand Central", zone: "midtown", transportMode: "piedi", cost: "free" },
      { time: "11:00", title: "Check-out e ritiro bagagli" },
      { time: "11:30", title: "Transfer privato Hotel > Newark (EWR)", requiresDocument: "Prenotazione T2785672", transportMode: "transfer privato (Llevame NYC)", notes: "Attesa massima autista 15 minuti, essere in hall entro le 11:20" },
      { time: "12:30", title: "Arrivo a Newark, 3 ore prima del volo" },
      { time: "15:35", title: "Volo UA380 Newark > Bari (diretto)", notes: "Boeing 767, 8h55, pasto incluso. Ricordare limite liquidi 100ml." },
    ],
  },
  {
    date: "2026-08-23",
    dayNumber: 15,
    title: "Arrivo a Bari",
    location: "Bari",
    summary: "Atterraggio a Bari alle 06:30. Fine dei servizi. Quattordici giorni, due oceani, cinque stati, sei parchi nazionali e tribali, tre fusi orari.",
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
  const verifiedAt = new Date("2026-08-03");
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
