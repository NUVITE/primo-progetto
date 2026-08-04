/**
 * Proposte trovate da noi con ricerche sul web, da tenere SEMPRE separate da
 * quello che dice l'agenzia. Ogni voce porta la fonte e la data di verifica.
 *
 * Regole seguite nello scriverle:
 * - `isFree` va sempre valorizzato: l'utente vuole sapere subito se si paga.
 * - `warning` per tutto cio' che puo' essere cambiato o che dipende dal tour.
 * - niente nomi o prezzi inventati: se non l'ho letto, non lo scrivo.
 */

export interface SuggestionInput {
  dayNumber: number;
  category: "film" | "mangiare" | "pratico" | "vedere" | "ragazzi";
  title: string;
  description: string;
  isFree: boolean;
  costDetail?: string;
  address?: string;
  mapsQuery?: string;
  warning?: string;
  sourceName?: string;
  sourceUrl?: string;
}

/** Punto di riferimento di ogni giornata, per il pulsante "cerca qui intorno". */
export const DAY_COORDS: Record<number, { lat: number; lng: number }> = {
  1: { lat: 33.9456, lng: -118.3921 }, // Hilton LAX
  2: { lat: 34.1381, lng: -118.3534 }, // Universal Studios Hollywood
  3: { lat: 34.1016, lng: -118.3406 }, // Hollywood Boulevard
  4: { lat: 36.1424, lng: -115.1552 }, // Sahara Las Vegas
  5: { lat: 35.2494, lng: -112.191 }, // Williams, Arizona
  6: { lat: 36.9147, lng: -111.4558 }, // Page, Arizona
  7: { lat: 37.6716, lng: -112.1571 }, // Ruby's Inn, Bryce Canyon
  8: { lat: 36.1424, lng: -115.1552 }, // Sahara Las Vegas
  9: { lat: 36.1424, lng: -115.1552 }, // Las Vegas, giornata libera
  10: { lat: 40.7596, lng: -73.9877 }, // Hotel Riu Plaza, New York
  11: { lat: 40.7033, lng: -73.9895 }, // Dumbo, Brooklyn
  12: { lat: 40.7115, lng: -74.0134 }, // Downtown, 9/11 Memorial
  13: { lat: 40.7813, lng: -73.974 }, // Upper West Side
  14: { lat: 40.7596, lng: -73.9877 }, // Hotel Riu Plaza, New York
};

const OGGI = "verificato il 3 agosto 2026";

export const SUGGESTIONS: SuggestionInput[] = [
  // ---------------------------------------------------------------- Giorno 1
  {
    dayNumber: 1,
    category: "vedere",
    title: "Il parchetto degli aerei, di fronte all'In-N-Out",
    description:
      "Proprio davanti all'In-N-Out di Sepulveda Blvd, dall'altra parte della strada, c'e' un piccolo " +
      "parco dove gli aerei passano bassissimi in atterraggio: uno ogni tre o quattro minuti nelle ore " +
      "di punta. Si abbina bene all'hamburger gia' in programma, e con il jet lag e la necessita' di " +
      "restare svegli fino alle 21 e' il modo piu' facile di passare il primo pomeriggio americano.",
    isFree: true,
    address: "Sepulveda Blvd angolo W 92nd St, Los Angeles",
    mapsQuery: "In-N-Out Burger 9149 S Sepulveda Blvd Los Angeles",
    sourceName: "Time Out Los Angeles",
    sourceUrl:
      "https://www.timeout.com/los-angeles/things-to-do/hour-to-kill-in-n-out-and-plane-spotting-by-lax",
  },
  {
    dayNumber: 1,
    category: "vedere",
    title: "Dockweiler State Beach",
    description:
      "La spiaggia subito a ovest delle piste dell'aeroporto: ingresso libero, con bagni, docce e aree " +
      "picnic. Gli aerei in decollo passano sopra la testa. E' l'oceano piu' vicino al vostro hotel.",
    isFree: true,
    address: "Dockweiler State Beach, Playa del Rey",
    mapsQuery: "Dockweiler State Beach",
    sourceName: "Discover Los Angeles",
    sourceUrl:
      "https://www.discoverlosangeles.com/things-to-do/10-things-to-do-near-los-angeles-international-airport-lax",
  },
  {
    dayNumber: 1,
    category: "pratico",
    title: "Manhattan Beach",
    description:
      "Otto chilometri dall'hotel: il molo, l'acquario Roundhouse (gratuito) e la passeggiata sul mare. " +
      "E' la spiaggia piu' bella raggiungibile in fretta da qui.",
    isFree: true,
    costDetail: "Gratis, ma serve un taxi per arrivarci",
    mapsQuery: "Manhattan Beach Pier California",
    warning: "Circa 20 minuti di taxi dall'hotel.",
    sourceName: "Discover Los Angeles",
    sourceUrl:
      "https://www.discoverlosangeles.com/things-to-do/10-things-to-do-near-los-angeles-international-airport-lax",
  },

  {
    dayNumber: 1,
    category: "pratico",
    title: "Quanto costa procurarsi i dollari",
    description:
      "Ho confrontato le tre strade possibili, cosi' potete scegliere sapendo i numeri.\n\n" +
      "• BANCOMAT NEGLI USA — cambio vicino a quello reale, piu' la commissione della vostra banca " +
      "(1-3%) e 2-5 $ fissi per operazione. Essendoci una quota fissa, conviene fare pochi prelievi " +
      "grossi invece di tanti piccoli.\n\n" +
      "• BANCA IN ITALIA, PRIMA DI PARTIRE — commissione fissa di 5-15 euro piu' uno spread dell'1,5-3%: " +
      "in tutto circa 20-35 euro per cambiare 1.000 euro.\n\n" +
      "• SPORTELLI DI CAMBIO (aeroporti e zone turistiche) — sono la via piu' cara: il ricarico va " +
      "dall'8% al 15%. Su 1.000 dollari se ne possono lasciare anche un centinaio. Questa e' l'unica " +
      "opzione che conviene evitare, ovunque si trovi.\n\n" +
      "Le prime due si equivalgono piu' o meno: dipende da quanto vi costa la carta.",
    isFree: true,
    warning:
      "Prima di partire chiedete alla vostra banca quanto costa un prelievo negli USA: cambia molto da carta a carta. Ricordate che le escursioni facoltative del tour si pagano SOLO in contanti.",
    sourceName: "Cambio del Giorno / Idyllic Pursuit",
    sourceUrl: "https://www.cambiodelgiorno.it/confronto-commissioni-cambio/",
  },

  // ---------------------------------------------------------------- Giorno 2
  {
    dayNumber: 2,
    category: "film",
    title: "Sullo Studio Tour: il motel di Psycho e lo squalo",
    description:
      "Il giro in trenino non e' solo un'attrazione, e' il backlot vero. Passerete davanti al motel di " +
      "Psycho, dove Norman Bates esce con un cadavere e guarda dritto verso il trenino; all'isola di " +
      "Amity dove lo squalo dello Squalo attacca; e al Boeing 747 sventrato de La guerra dei mondi.",
    isFree: false,
    costDetail: "Compreso nel biglietto Universal che avete gia'",
    warning:
      "Lo squalo si lancia sul lato DESTRO del trenino: sedetevi a destra. Il segmento di Fast & Furious e' chiuso definitivamente dal 2025.",
    sourceName: "The Better Vacation",
    sourceUrl: "https://thebettervacation.com/los-angeles/universal-studios-hollywood-studio-tour/",
  },

  // ---------------------------------------------------------------- Giorno 3
  {
    dayNumber: 3,
    category: "vedere",
    title: "Griffith Observatory: si entra gratis",
    description:
      "Se scegliete il pomeriggio libero a Hollywood, vale la pena sapere che qui l'ingresso, le sale " +
      "espositive, le terrazze e i telescopi pubblici non si pagano: ha un biglietto solo lo spettacolo " +
      "del planetario. E' anche il punto migliore da cui fotografare la scritta Hollywood.",
    isFree: true,
    costDetail: "Ingresso gratuito. Planetario a parte: 10 $ adulti",
    address: "2800 E Observatory Rd, Los Angeles",
    mapsQuery: "Griffith Observatory Los Angeles",
    warning:
      "Aperto martedi'-venerdi' dalle 12 alle 22. Andateci nel tardo pomeriggio: si vedono le sale con la luce e la citta' che si accende al tramonto.",
    sourceName: "LorenziGo",
    sourceUrl: "https://lorenzigo.com/griffith-observatory-los-angeles-guide/",
  },

  // ---------------------------------------------------------------- Giorno 4
  {
    dayNumber: 4,
    category: "pratico",
    title: "Calico: quanto costa davvero",
    description:
      "L'ingresso al parco e' una cosa, le attrazioni interne un'altra e si pagano a parte: la miniera " +
      "Maggie (un tunnel d'argento visitabile da soli, molto piu' fresco del deserto fuori), il trenino " +
      "e la ricerca dell'oro. Il parcheggio non si paga.",
    isFree: false,
    costDetail: "Ingresso 8 $ adulti e 5 $ ragazzi 6-15. Miniera Maggie 3 $, trenino 5 $, ricerca dell'oro 3 $",
    mapsQuery: "Calico Ghost Town Yermo California",
    warning:
      "Calico risulta tra i parchi con ingresso incluso nel vostro programma: chiedete alla guida cosa e' gia' coperto e cosa resta eventualmente da pagare sul posto.",
    sourceName: "Salty Canary",
    sourceUrl: "https://www.saltycanary.com/ultimate-guide-to-visiting-calico-ghost-town/",
  },

  // ---------------------------------------------------------------- Giorno 5
  {
    dayNumber: 5,
    category: "vedere",
    title: "I neon di Williams, la sera",
    description:
      "Williams e' uno dei tratti di Route 66 meglio conservati dell'Arizona: non ricostruito, proprio " +
      "rimasto com'era. Di sera le insegne al neon si accendono e la via principale cambia faccia: " +
      "per la passeggiata in programma, aspettate che sia buio.",
    isFree: true,
    mapsQuery: "Historic Route 66 Downtown Williams Arizona",
    sourceName: "Experience Williams",
    sourceUrl: "https://experiencewilliams.com/things-to-do-route-66/",
  },
  {
    dayNumber: 5,
    category: "pratico",
    title: "Al Grand Canyon la navetta e' gratuita",
    description:
      "Le navette interne del South Rim sono comprese nell'ingresso al parco e sono l'unico modo per " +
      "raggiungere alcuni belvedere: Hermit Road e' chiusa alle auto private da marzo a novembre.",
    isFree: true,
    sourceName: "True North Map Co.",
    sourceUrl: "https://truenorthmapco.com/pages/grand-canyon-national-park",
  },

  // ---------------------------------------------------------------- Giorno 6
  {
    dayNumber: 6,
    category: "film",
    title: "Forrest Gump Point",
    description:
      "Il punto esatto dove Forrest Gump smette di correre e si volta, con la valle alle spalle e la " +
      "strada che si perde all'orizzonte. E' una sosta sul ciglio della Highway 163, all'altezza del " +
      "miglio 13, circa 21 chilometri a nord del parco tribale, appena passato il confine con lo Utah.",
    isFree: true,
    address: "US Highway 163, mile 13, vicino a Mexican Hat, Utah",
    mapsQuery: "Forrest Gump Point Highway 163 Utah",
    warning:
      "NON e' dentro Monument Valley: e' sulla strada verso Page. Chiedete alla guida se il pullman ci passa e se fa sosta.",
    sourceName: "Monument Valley Tours",
    sourceUrl: "https://www.monument-valley.com/poi/forrest-gump-point",
  },
  {
    dayNumber: 6,
    category: "vedere",
    title: "Glen Canyon Dam Overlook",
    description:
      "E' l'affaccio sulla diga da raggiungere se vi resta un'ora di luce: parcheggio gratuito, nessun " +
      "biglietto, e non serve nemmeno entrare nell'area protetta. Il blu del lago contro il rosso della " +
      "roccia e' il contrasto piu' fotografato di Page.",
    isFree: true,
    mapsQuery: "Glen Canyon Dam Overlook Page Arizona",
    sourceName: "Danielle Outdoors",
    sourceUrl: "https://danielleoutdoors.com/things-to-do-in-page/",
  },
  {
    dayNumber: 6,
    category: "vedere",
    title: "Horseshoe Bend",
    description:
      "L'ansa del Colorado a ferro di cavallo, uno dei punti piu' fotografati del sud-ovest. La visita " +
      "e' libera e senza permessi: si paga solo il parcheggio, gestito dal comune di Page.",
    isFree: false,
    costDetail: "10 $ per veicolo di parcheggio",
    mapsQuery: "Horseshoe Bend Page Arizona",
    warning: "Se non e' previsto dal tour serve un taxi. Poca ombra: evitate le ore centrali.",
    sourceName: "Visit Arizona",
    sourceUrl: "https://www.visitarizona.com/like-a-local/a-guide-to-visiting-horseshoe-bend-the-right-way",
  },

  // ---------------------------------------------------------------- Giorno 7
  {
    dayNumber: 7,
    category: "ragazzi",
    title: "Il rodeo del Ruby's Inn",
    description:
      "Un rodeo vero, non una ricostruzione per turisti, proprio dove dormite. Si tiene da mercoledi' a " +
      "sabato alle 19:00 e voi ci siete di sabato: e' la sera giusta. Di tutte le cose che ho trovato, " +
      "questa e' quella che aggiungerei con piu' convinzione.",
    isFree: false,
    costDetail: "Biglietto da acquistare in loco",
    mapsQuery: "Ruby's Inn Bryce Canyon City Utah",
    warning:
      "La stagione finisce a meta' agosto: fatevelo confermare alla reception appena arrivati, e prenotate subito.",
    sourceName: "Ruby's Inn",
    sourceUrl: "https://www.rubysinn.com/activities-in-bryce-canyon/",
  },
  {
    dayNumber: 7,
    category: "vedere",
    title: "Il cielo di Bryce Canyon",
    description:
      "Bryce e' un International Dark Sky Park certificato: in una notte serena si vedono fino a 7.500 " +
      "stelle a occhio nudo e la Via Lattea come un arco luminoso. Ci sono programmi serali gratuiti con " +
      "i ranger e i telescopi. A 2.400 metri, senza una luce intorno, e' probabilmente il cielo piu' " +
      "bello che vedrete in vita vostra. Basta uscire dall'albergo e alzare gli occhi.",
    isFree: true,
    warning: "Portate qualcosa di caldo: la sera si scende sotto i 15 gradi, all'alba sotto i 10.",
    sourceName: "Space Tourism Guide",
    sourceUrl: "https://spacetourismguide.com/bryce-canyon-national-park-stargazing/",
  },

  // ---------------------------------------------------------------- Giorno 8
  {
    dayNumber: 8,
    category: "film",
    title: "Il Bellagio di Ocean's Eleven",
    description:
      "La scena finale, con la banda schierata in silenzio davanti alle fontane, e' girata proprio li'. " +
      "La produzione ebbe accesso 24 ore su 24 per cinque settimane: sala da gioco, giardini botanici e " +
      "la hall con il soffitto di vetri colorati di Chihuly si vedono tutti nel film. Guardarle sapendolo " +
      "e' un'altra cosa.",
    isFree: true,
    mapsQuery: "Bellagio Las Vegas",
    sourceName: "HeyUGuys",
    sourceUrl: "https://www.heyuguys.com/oceans-eleven-in-real-life/",
  },
  {
    dayNumber: 8,
    category: "film",
    title: "Il Caesars Palace di Una notte da leoni",
    description:
      "E' l'hotel dove alloggiano i protagonisti del film. L'arrivo a Las Vegas nella pellicola e' " +
      "segnato dalle fontane del Bellagio e dal Paris. Si entra e si gira liberamente.",
    isFree: true,
    mapsQuery: "Caesars Palace Las Vegas",
    warning: "Il Riviera, dove contavano le carte, e' stato demolito: non cercatelo.",
    sourceName: "On the Luce",
    sourceUrl: "https://www.ontheluce.com/las-vegas-film-locations/",
  },
  {
    dayNumber: 8,
    category: "pratico",
    title: "Walgreens aperto 24 ore, di fronte all'hotel",
    description:
      "All'angolo tra Sahara Avenue e Las Vegas Boulevard, proprio davanti al vostro hotel. Farmacia, " +
      "generi alimentari, acqua, creme solari. E' il posto giusto per rifornirsi prima e dopo i parchi.",
    isFree: true,
    costDetail: "Negozio aperto 24 ore",
    mapsQuery: "Walgreens Sahara Ave Las Vegas Blvd",
    warning: "Il banco farmacia interno chiude prima: 22:00 nei giorni feriali, 18:00 nel fine settimana.",
    sourceName: "OnTheStrip",
    sourceUrl: "https://onthestrip.com/services/walgreens-on-the-strip/",
  },
  {
    dayNumber: 8,
    category: "vedere",
    title: "The Sphere, dal marciapiede",
    description:
      "La sfera gigante con le proiezioni animate sulla superficie esterna, una delle cose piu' recenti " +
      "della citta'. Guardarla da fuori non costa nulla, si vede bene dai pressi del LINQ.",
    isFree: true,
    mapsQuery: "Sphere Las Vegas",
    sourceName: "Skysonar",
    sourceUrl: "https://skysonar.com/en-us/guides/city-guides/things-to-do-in-las-vegas",
  },

  // ---------------------------------------------------------------- Giorno 9
  {
    dayNumber: 9,
    category: "vedere",
    title: "Il pullman scoperto: qui ci sta",
    description:
      "E' l'unica vera finestra libera del viaggio: check-out alle 11, transfer alle 19. Il Big Bus fa " +
      "il giro completo in circa due ore e mezza, passando dal cartello Welcome to Fabulous Las Vegas, " +
      "dalle fontane del Bellagio e dallo STRAT. Corse ogni 30-60 minuti.",
    isFree: false,
    costDetail: "58-80 $ a persona secondo la durata del biglietto",
    mapsQuery: "Big Bus Las Vegas stop",
    warning:
      "Il 17 agosto a Las Vegas si superano i 40 gradi e il piano superiore e' scoperto. Fatelo appena aprono, la mattina, o restate al piano di sotto. Il monorail dell'hotel percorre la stessa Strip al fresco per 6 $.",
    sourceName: "Big Bus Tours",
    sourceUrl: "https://www.bigbustours.com/en/las-vegas/las-vegas-bus-tours",
  },

  // --------------------------------------------------------------- Giorno 10
  {
    dayNumber: 10,
    category: "pratico",
    title: "Dove fare la spesa vicino all'hotel",
    description:
      "Siete su Restaurant Row, la via dei ristoranti: ottima per cenare, pessima per fare la spesa a " +
      "prezzi normali. Poco piu' su trovate Whole Foods e i supermercati di Hell's Kitchen (Morton " +
      "Williams, Food Emporium, Trader Joe's) per acqua, frutta e colazioni da portare via.",
    isFree: true,
    mapsQuery: "supermarket Hell's Kitchen New York",
    sourceName: "NYC Tourism",
    sourceUrl: "https://www.nyctourism.com/articles/hells-kitchen-guide/",
  },
  {
    dayNumber: 10,
    category: "mangiare",
    title: "Mangiare bene spendendo poco, a due passi",
    description:
      "Nel quartiere si trovano taqueria e ramen sotto i 15 dollari. Westerly Natural Market, all'angolo " +
      "tra la 54esima e l'ottava, fa zuppe calde da asporto per pochi dollari: comodissimo la sera " +
      "quando si rientra distrutti e non si ha voglia di sedersi al ristorante.",
    isFree: false,
    costDetail: "Attorno ai 15 $ a persona",
    mapsQuery: "Westerly Natural Market New York",
    sourceName: "Time Out New York",
    sourceUrl: "https://www.timeout.com/newyork/restaurants/cheap-eats-in-hells-kitchen",
  },

  {
    dayNumber: 10,
    category: "pratico",
    title: "La regola della lettera: come si riconosce un banchetto pulito",
    description:
      "A New York non serve fidarsi dell'istinto: il Dipartimento della Salute obbliga tutti i locali " +
      "a esporre una lettera all'ingresso, e dal 2018 vale anche per i carretti e i camioncini di " +
      "strada, che la portano sull'adesivo del permesso.\n\n" +
      "A = ispezione superata con 0-13 penalita'\n" +
      "B = 14-27 penalita'\n" +
      "C = 28 o piu'\n\n" +
      "La regola pratica e' semplice: se il carretto espone una A, mangiate tranquilli. Se non trovate " +
      "nessuna lettera esposta, tirate dritto e cercatene un altro: ce n'e' uno a ogni angolo.",
    isFree: true,
    sourceName: "NYC Health — Letter Grading",
    sourceUrl: "https://portal.311.nyc.gov/article/?kanumber=KA-01057",
  },

  // --------------------------------------------------------------- Giorno 11
  {
    dayNumber: 11,
    category: "film",
    title: "Il palazzo di Friends",
    description:
      "Il portone di Monica e Rachel e' al 90 di Bedford Street, nel West Village. E' un palazzo " +
      "residenziale vero: si fotografa dall'esterno. La cosa comoda e' che si trova a pochi minuti a " +
      "piedi da Olio e Piu', dove avete la cena in programma quella stessa sera.",
    isFree: true,
    address: "90 Bedford Street, New York",
    mapsQuery: "90 Bedford Street New York Friends building",
    sourceName: "Sim Local",
    sourceUrl: "https://www.simlocal.com/post/famous-tv-movie-locations-to-visit-in-new-york-city",
  },

  {
    dayNumber: 11,
    category: "mangiare",
    title: "Peter Luger, la bistecca storica di Brooklyn",
    description:
      "Aperta nel 1887, e' la piu' famosa steakhouse di New York e una delle tre piu' antiche ancora " +
      "in attivita'. Il piatto e' la porterhouse per due: carne frollata, tagliata al tavolo e servita " +
      "su un piatto rovente. Siete a Brooklyn proprio oggi, quindi e' la giornata giusta. A pranzo " +
      "servono anche il loro hamburger, molto piu' economico della bistecca e altrettanto celebre.",
    isFree: false,
    costDetail: "Porterhouse per due 135,95 $ · costata 94,95 $ · filetto 69,95 $",
    address: "178 Broadway, Brooklyn",
    mapsQuery: "Peter Luger Steak House Brooklyn",
    warning:
      "Si prenota con largo anticipo, spesso settimane. Verificate anche quali metodi di pagamento accettano: qui le regole sono sempre state particolari.",
    sourceName: "The Menu Prices",
    sourceUrl: "https://themenuprices.com/peter-luger-steakhouse/",
  },

  // --------------------------------------------------------------- Giorno 12
  {
    dayNumber: 12,
    category: "vedere",
    title: "Staten Island Ferry: gratis, e passa davanti alla Statua",
    description:
      "Il traghetto per Staten Island e' gratuito e funziona 24 ore su 24, con la vista frontale sulla " +
      "Statua della Libertà dal ponte. Voi la Statua la fate col CityPASS, quindi questo e' il piano B " +
      "se il battello dovesse saltare, oppure semplicemente una traversata bellissima al tramonto.",
    isFree: true,
    address: "Whitehall Terminal, 4 Whitehall St, New York",
    mapsQuery: "Staten Island Ferry Whitehall Terminal",
    sourceName: "Free Tours by Foot",
    sourceUrl: "https://freetoursbyfoot.com/staten-island-ferry/",
  },

  {
    dayNumber: 12,
    category: "mangiare",
    title: "Keens Steakhouse, se volete la bistecca senza uscire dal centro",
    description:
      "E' la piu' antica steakhouse di New York insieme all'Old Homestead, aperta nel 1885, con i " +
      "soffitti coperti da migliaia di pipe di terracotta dei vecchi soci. Si trova in Midtown, a una " +
      "decina di minuti a piedi dal vostro hotel: e' l'alternativa comoda se una sera volete la carne " +
      "seria senza attraversare la citta'.",
    isFree: false,
    costDetail: "Fascia alta, come tutte le steakhouse storiche",
    address: "72 West 36th Street, New York",
    mapsQuery: "Keens Steakhouse New York",
    warning: "Prenotate: e' un'istituzione e la sera si riempie.",
    sourceName: "The Menu Prices",
    sourceUrl: "https://themenuprices.com/peter-luger-steakhouse/",
  },

  // --------------------------------------------------------------- Giorno 13
  {
    dayNumber: 13,
    category: "film",
    title: "Il Plaza di Mamma ho riperso l'aereo",
    description:
      "L'albergo dove Kevin si sistema con la carta di credito del padre e' all'angolo sud-est di Central " +
      "Park, esattamente sul vostro percorso quando scendete dall'Upper East Side verso il centro. E' " +
      "l'edificio piu' filmato al mondo: si entra liberamente nella hall.",
    isFree: true,
    address: "768 5th Ave, New York",
    mapsQuery: "The Plaza Hotel New York",
    sourceName: "Hollywood Reporter",
    sourceUrl: "https://www.hollywoodreporter.com/lists/new-york-city-filming-locations-movie-tv-sites/",
  },
  {
    dayNumber: 13,
    category: "pratico",
    title: "La funivia di Roosevelt Island e' aumentata",
    description:
      "La corsa costava come una di metropolitana, 2,90 $. Nel 2026 la tariffa risulta salita a 3 $: " +
      "differenza minima, ma se pagate con OMNY conviene saperlo.",
    isFree: false,
    costDetail: "3 $ a corsa",
    mapsQuery: "Roosevelt Island Tramway Manhattan station",
    warning: "Verificate la tariffa al tornello: e' cambiata di recente.",
    sourceName: "Storyhunt",
    sourceUrl: "https://www.storyhunt.io/en/articles/roosevelt-island-tramway",
  },

  {
    dayNumber: 13,
    category: "mangiare",
    title: "Gray's Papaya, l'hot dog vero",
    description:
      "Se volete l'hot dog newyorkese senza rischiare con un carretto qualsiasi, questo e' il posto: " +
      "un'istituzione dell'Upper West Side, locale fisso, bancone e via. Costa poco piu' di tre " +
      "dollari e viene regolarmente indicato tra i migliori della citta'. La combinazione classica e' " +
      "due hot dog piu' il succo di papaya, che sembra un abbinamento assurdo ed e' invece il motivo " +
      "per cui il posto esiste dal 1973.\n\n" +
      "La cosa comoda: e' a una decina di minuti a piedi dal Museo di Storia Naturale, dove siete " +
      "stamattina.",
    isFree: false,
    costDetail: "Circa 3,45 $ a hot dog",
    address: "2090 Broadway, angolo 72nd Street",
    mapsQuery: "Gray's Papaya 2090 Broadway New York",
    sourceName: "Tasting Table",
    sourceUrl: "https://www.tastingtable.com/1619450/best-hot-dogs-nyc/",
  },

  // --------------------------------------------------------------- Giorno 14
  {
    dayNumber: 14,
    category: "vedere",
    title: "Perche' il pullman scoperto qui NON conviene",
    description:
      "Se qualcuno propone il giro in bus scoperto stamattina, sappiate che il giro completo dura tra " +
      "75 e 90 minuti senza mai scendere. Con il check-out alle 11 e il transfer alle 11:30, significa " +
      "giocarsi il volo per un ingorgo. Le tre ore che avete si godono meglio a piedi, come " +
      "suggerisce l'agenzia.",
    isFree: false,
    costDetail: "Big Bus da 62 $, TopView da 39 $",
    warning: "Sconsigliato oggi: non c'e' margine prima del transfer per l'aeroporto.",
    sourceName: "Big Bus Tours",
    sourceUrl: "https://www.bigbustours.com/en/new-york/service-information",
  },
];
