/**
 * I locali suggeriti dall'agenzia, giornata per giornata.
 *
 * REGOLA: qui va riportato TUTTO quello che c'e' sul programma dell'agenzia,
 * senza selezioni. Le proposte trovate da noi sul web stanno altrove
 * (suggerimenti.ts) e non vanno mai mescolate con queste.
 *
 * Testi ripresi dal "Programma di viaggio completo" di C&C Viaggi.
 */

export interface MealInput {
  name: string;
  address?: string;
  priceTier?: string;
  note?: string;
}

export const MEALS_BY_DAY: Record<number, MealInput[]> = {
  // Domenica 9 agosto — Los Angeles, arrivo
  1: [
    { name: "Landings Bar & Grill", priceTier: "$$", note: "Accanto alla hall dell'hotel: hamburger, insalate, birre locali e maxischermi. La soluzione più comoda per la prima sera, senza uscire. Cucina americana." },
    { name: "Andiamo", priceTier: "$$$", note: "Il ristorante interno dell'Hilton, cucina italiana del nord e buona carta dei vini. Da prenotare alla reception." },
    { name: "In-N-Out Burger", address: "9149 S Sepulveda Blvd", priceTier: "$", note: "10 minuti in taxi. È l'hamburger californiano, ed è anche il punto più famoso di Los Angeles per guardare gli aerei atterrare a pochi metri sopra la testa. Fast food." },
    { name: "Randy's Donuts", address: "805 W Manchester Ave", priceTier: "$", note: "La ciambella gigante sul tetto è un'icona vista in decine di film. Aperto 24 ore." },
    { name: "Dinah's Family Restaurant", address: "6521 S Sepulveda Blvd", priceTier: "$$", note: "Diner storico del 1959, celebre per il pollo fritto e i pancake giganti. Ottimo per la prima colazione americana." },
  ],

  // Lunedì 10 agosto — Universal Studios
  2: [
    { name: "Antojitos Cocina Mexicana", address: "CityWalk", priceTier: "$$", note: "Cucina messicana autentica, guacamole preparato al tavolo e mariachi dal vivo. Il migliore del complesso." },
    { name: "Bubba Gump Shrimp Co.", address: "CityWalk", priceTier: "$$", note: "Gamberi in tutte le salse, tema Forrest Gump, molto adatto alle famiglie." },
    { name: "Hard Rock Cafe Hollywood", address: "CityWalk", priceTier: "$$", note: "Hamburger e cimeli rock, l'insegna della chitarra è una foto obbligata." },
    { name: "Voodoo Doughnut", address: "CityWalk", priceTier: "$", note: "Ciambelle giganti e coloratissime, aperto fino a tardi. Perfette per la merenda dei ragazzi." },
    { name: "Krusty Burger", address: "dentro il parco, area dei Simpson", priceTier: "$", note: "Hamburger enormi e Duff Beer. La tappa fast food più divertente." },
  ],

  // Martedì 11 agosto — City tour di Los Angeles
  3: [
    { name: "Musso & Frank Grill", address: "6667 Hollywood Blvd", priceTier: "$$$", note: "Aperto nel 1919, il ristorante più antico di Hollywood. Qui bevevano Chaplin, Bogart, Bukowski e Tarantino ci ha girato C'era una volta a Hollywood. Bistecche e Martini." },
    { name: "In-N-Out Burger", address: "7009 Sunset Blvd", priceTier: "$", note: "Il fast food californiano per eccellenza. Chiedete il «Double-Double animal style», è il menu segreto che conoscono tutti." },
    { name: "Pink's Hot Dogs", address: "709 N La Brea Ave", priceTier: "$", note: "Chiosco di hot dog dal 1939, la fila fa parte dell'esperienza. Un'istituzione." },
    { name: "Miceli's", address: "1646 N Las Palmas Ave", priceTier: "$$", note: "Il più antico ristorante italiano di Hollywood (1949), camerieri che cantano lirica tra i tavoli. Divertente con i ragazzi." },
    { name: "Grand Central Market", address: "317 S Broadway, Downtown", priceTier: "$", note: "Mercato coperto del 1917 con trenta cucine diverse, dai tacos alla pasta. Ideale per un pranzo veloce e vario." },
  ],

  // Mercoledì 12 agosto — Calico e Las Vegas
  4: [
    { name: "Maroon", address: "dentro il Sahara", priceTier: "$$$$", note: "Il nuovo ristorante di punta dell'hotel, dello chef Kwame Onwuachi: steakhouse americana con influenze afro-caraibiche e cottura a fuoco vivo. Da prenotare." },
    { name: "Chickie's & Pete's", address: "dentro il Sahara", priceTier: "$$", note: "Sport bar dentro l'hotel: alette di pollo, i celebri Crabfries, birra e partite sui maxischermi. Informale e sempre aperto fino a tardi." },
    { name: "Uno Màs Street Tacos", address: "dentro il Sahara", priceTier: "$", note: "Tacos messicani da strada e tequila, fino alle 23 (le 2 il venerdì e sabato). Veloce ed economico." },
    { name: "Zeffer's Café", address: "dentro il Sahara", priceTier: "$$", note: "La caffetteria dell'hotel per colazioni americane abbondanti e piatti a ogni ora." },
    { name: "Peppermill Restaurant", address: "2985 Las Vegas Blvd S", priceTier: "$$", note: "Diner del 1972 con neon rosa, porzioni gigantesche e il celebre Fireside Lounge. Un pezzo di Vegas autentica." },
    { name: "Earl of Sandwich", address: "dentro il Planet Hollywood", priceTier: "$", note: "Panini caldi ottimi a 8-10 $, la soluzione migliore per mangiare bene spendendo poco sulla Strip." },
  ],

  // Giovedì 13 agosto — Grand Canyon e Williams
  5: [
    { name: "Cruisers Route 66 Cafe", address: "233 W Route 66, Williams", priceTier: "$$", note: "Costine barbecue, birra artigianale e musica dal vivo in una vecchia stazione di servizio. Il locale più caratteristico della città." },
    { name: "Pine Country Restaurant", address: "107 N Grand Canyon Blvd", priceTier: "$$", note: "Cucina casalinga e soprattutto venti tipi di torta fatti in casa ogni giorno. Un'istituzione locale." },
    { name: "Station 66 Italian Bistro", address: "144 W Route 66", priceTier: "$$", note: "Pizza e pasta discrete, utile se dopo qualche giorno sentite nostalgia." },
    { name: "Twisters 50's Soda Fountain", address: "417 E Route 66", priceTier: "$", note: "Gelateria e soda fountain anni Cinquanta con jukebox e milkshake. Perfetta per i ragazzi." },
    { name: "Maswik Food Court", address: "dentro il Grand Canyon Village", priceTier: "$", note: "La soluzione più pratica per il pranzo al parco, self service con molte opzioni." },
  ],

  // Venerdì 14 agosto — Monument Valley e Page
  6: [
    { name: "Big John's Texas BBQ", address: "153 S Lake Powell Blvd, Page", priceTier: "$$", note: "Brisket e costine affumicate serviti in una vecchia stazione di servizio, con musica country dal vivo la sera. Il locale più amato di Page." },
    { name: "State 48 Tavern", address: "614 N Navajo Dr", priceTier: "$$", note: "Cucina americana curata, buone birre dell'Arizona, ambiente moderno." },
    { name: "El Tapatio", address: "25 S Lake Powell Blvd", priceTier: "$", note: "Messicano familiare, porzioni generose e prezzi onesti." },
    { name: "Birdhouse", address: "707 N Navajo Dr", priceTier: "$", note: "Pollo fritto in stile Nashville, veloce e ottimo." },
    { name: "Fast food a Page", address: "lungo N Lake Powell Blvd", priceTier: "$", note: "Trovate McDonald's, Wendy's, Carl's Jr e Sonic, tutti aperti fino a tardi." },
  ],

  // Sabato 15 agosto — Antelope Canyon e Bryce
  7: [
    { name: "Cowboy's Buffet & Steak Room", address: "dentro il Ruby's Inn", priceTier: "$$", note: "Buffet abbondante e bistecche, la soluzione più comoda e la più frequentata dai gruppi." },
    { name: "Ebenezer's Barn & Grill", address: "accanto al Ruby's Inn", priceTier: "$$$", note: "Cena western servita in un fienile con spettacolo di musica country dal vivo. Un'esperienza divertente, da prenotare in giornata." },
    { name: "Bryce Canyon Pines", address: "sulla Highway 12, a 10 minuti", priceTier: "$$", note: "Cucina casalinga e le migliori torte della zona, in particolare quella ai mirtilli." },
    { name: "Valhalla Pizzeria", address: "al Bryce Canyon Lodge, dentro il parco", priceTier: "$", note: "Pizza e insalate in un edificio storico degli anni Venti." },
    { name: "Ruby's General Store", priceTier: "$", note: "Panini, insalate confezionate, frutta e snack per prepararsi un pranzo al sacco. Anche caffè e ciambelle al mattino presto." },
  ],

  // Domenica 16 agosto — Zion e ritorno a Las Vegas
  8: [
    { name: "Bacchanal Buffet", address: "Caesars Palace", priceTier: "$$$$", note: "Il buffet più celebre di Las Vegas, oltre 250 piatti. Prenotate online, si fa la fila." },
    { name: "Secret Pizza", address: "Cosmopolitan, 3° piano in fondo a un corridoio senza insegna", priceTier: "$", note: "Pizza a trancio a tarda notte, un piccolo culto locale." },
    { name: "In-N-Out Burger", address: "4888 Dean Martin Dr", priceTier: "$", note: "Aperto fino all'una e mezza di notte: l'hamburger californiano a prezzo onesto." },
    { name: "Ellis Island BBQ", address: "4178 Koval Ln", priceTier: "$$", note: "Costine e birra prodotta in casa, storicamente uno dei migliori rapporti qualità-prezzo della città." },
    { name: "Fashion Show Mall", address: "3200 Las Vegas Blvd S", priceTier: "$", note: "Grande food court con venti insegne diverse, comodo e veloce a metà Strip." },
  ],

  // Martedì 18 agosto — arrivo a New York
  10: [
    { name: "Chelsea Market", address: "75 9th Ave", priceTier: "$", note: "Los Tacos No.1 per i migliori tacos della città, Very Fresh Noodles, Miznon per il pane pita israeliano. Pranzo veloce e ottimo." },
    { name: "The Modern / Cafe 2 (MoMA)", address: "dentro il museo", priceTier: "$ / $$$$", note: "Il Cafe 2 al secondo piano è informale e onesto, The Modern è stellato e va prenotato." },
    { name: "Shake Shack Madison Sq Park", priceTier: "$", note: "Il chiosco originale del 2004, dentro il parco davanti al Flatiron: burger, crinkle fries e frozen custard. La fila scorre veloce." },
    { name: "Eataly NYC Flatiron", address: "200 5th Ave", priceTier: "$$", note: "Cucina italiana su due piani, con la terrazza SERRA al quattordicesimo. Comodo prima dell'Empire State." },
    { name: "230 Fifth Rooftop", address: "230 5th Ave", priceTier: "$$$", note: "Il rooftop più grande di New York, con l'Empire State Building illuminato che sembra a portata di mano. Cocktail e piatti semplici. Dress code: vietati abbigliamento sportivo, canottiere e infradito." },
    { name: "Joe's Pizza", address: "1435 Broadway, vicino all'hotel", priceTier: "$", note: "Il trancio di pizza newyorkese per antonomasia, aperto fino a notte fonda." },
  ],

  // Mercoledì 19 agosto — Tour dei Contrasti e Brooklyn
  11: [
    { name: "Olio e Più", address: "3 Greenwich Ave, Greenwich Village", priceTier: "$$$", note: "La cena che vi consigliamo per stasera. Cucina italiana e pizza napoletana, dehors fiorito davanti alla Jefferson Market Library, in uno degli angoli più belli del Village. Prenotate su OpenTable, si riempie sempre." },
    { name: "Juliana's Pizza", address: "19 Old Fulton St, Dumbo", priceTier: "$$", note: "La pizzeria di Patsy Grimaldi, forno a carbone. Regolarmente in cima alle classifiche cittadine. Da abbinare a una sosta al parco." },
    { name: "Time Out Market", address: "55 Water St, Dumbo", priceTier: "$$", note: "Food hall con i migliori chef di Brooklyn e una terrazza con vista sul ponte. Ideale per il pranzo di fine tour." },
    { name: "Grimaldi's", address: "1 Front St, Dumbo", priceTier: "$$", note: "Pizza al forno a carbone, storica rivale di Juliana's. Solo contanti." },
    { name: "Katz's Delicatessen", priceTier: "$$", note: "In alternativa a domani, se passate da Houston St: vedi giorno seguente." },
    { name: "Bleecker Street Pizza", address: "69 7th Ave S", priceTier: "$", note: "Trancio da passeggio nel Village, aperto fino a tardi." },
  ],

  // Giovedì 20 agosto — Statua della Libertà e Downtown
  12: [
    { name: "Katz's Delicatessen", address: "205 E Houston St", priceTier: "$$", note: "Il pastrami on rye più famoso del mondo. Da dividere in due." },
    { name: "Ellen's Stardust Diner", address: "1650 Broadway", priceTier: "$$", note: "La cena consigliata per stasera. Diner anni Cinquanta dove i camerieri sono aspiranti attori di Broadway e cantano dal vivo tra i tavoli. Il cibo è semplice, lo spettacolo vale il prezzo. Non si prenota: si fa la fila, che scorre." },
    { name: "Eataly Downtown", address: "101 Liberty St, dentro il Brookfield Place", priceTier: "$$", note: "Di fronte al 9/11 Memorial: pausa pranzo italiana con vista." },
    { name: "Fraunces Tavern", address: "54 Pearl St", priceTier: "$$$", note: "Taverna del 1762 dove Washington salutò i suoi ufficiali. Cucina americana e un piccolo museo." },
    { name: "Tin Building", address: "Seaport, Pier 17", priceTier: "$$", note: "Il mercato gourmet di Jean-Georges, decine di banchi e ristoranti sull'acqua." },
    { name: "Junior's Restaurant", address: "1515 Broadway", priceTier: "$", note: "La migliore cheesecake di New York, aperta fino a tardi. A due passi dall'hotel per il dopocena." },
  ],

  // Venerdì 21 agosto — Uptown, Central Park, Queens
  13: [
    { name: "Levain Bakery", address: "167 W 74th St, Upper West Side", priceTier: "$", note: "I cookie più famosi di New York, spessi sei centimetri. Sosta obbligata prima o dopo il museo." },
    { name: "Shake Shack Upper West Side", address: "366 Columbus Ave", priceTier: "$", note: "A 5 minuti dal museo: hamburger veloce prima di entrare a Central Park." },
    { name: "The Loeb Boathouse e i chioschi del parco", address: "dentro Central Park", priceTier: "$", note: "Trovate carretti di hot dog, pretzel e gelati a ogni incrocio: il pranzo più newyorkese che ci sia, seduti su una panchina." },
    { name: "The MET Dining Room / Cantor Roof Garden", address: "dentro il museo", priceTier: "$$$", note: "La terrazza sul tetto, aperta in estate, ha cocktail e la vista più bella su Central Park." },
    { name: "Casa Lever / Serafina UES", address: "Madison Ave", priceTier: "$$$", note: "Cucina italiana per il pranzo nell'Upper East Side, tra un museo e l'altro." },
    { name: "The Dickens", address: "783 8th Ave, tra la 47th e la 48th", priceTier: "$$$", note: "Il locale consigliato per stasera. Cocktail bar su quattro piani con rooftop, ambiente curato, cucina americana. A 5 minuti a piedi dall'hotel, aperto fino alle 3 il venerdì. Smart casual." },
  ],

  // Sabato 22 agosto — ultima mattina
  14: [
    { name: "Bryant Park Grill / Le Pain Quotidien", priceTier: "$$", note: "Colazione o brunch all'aperto nel parco, con vista sulla biblioteca." },
    { name: "Blue Bottle / Culture Espresso", priceTier: "$", note: "Caffè di qualità a due passi dall'hotel, se volete un ultimo espresso decente." },
    { name: "Junior's Restaurant", address: "1515 Broadway", priceTier: "$", note: "Portatevi a casa una cheesecake confezionata, resiste bene al viaggio." },
    { name: "Grand Central Market", address: "dentro la stazione", priceTier: "$$", note: "Formaggi, spezie, cioccolato e prodotti gourmet per gli ultimi regali." },
  ],
};
