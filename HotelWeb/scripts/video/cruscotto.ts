/**
 * Video "Cruscotto e statistiche": la situazione del giorno a colpo d'occhio e i numeri di un
 * periodo confrontati con l'anno prima. Hotel Meridiana, utente dimostrativo temporaneo con il ruolo
 * Direttore (creato e cancellato dallo script) e un arrivo dimostrativo di oggi.
 *   npx tsx scripts/video/cruscotto.ts
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { Regista } from "./regista";
import { cancellaUtenteDemo, conPulizia, giorno, prenotazioneDemo, sessione, utenteDemo } from "./scena";

const EMAIL = "paolo.direzione@hotelmeridiana.test";

conPulizia(
  async () => {
    const hotel = await prisma.hotel.findFirstOrThrow({ where: { nome: "Hotel Meridiana" } });
    await cancellaUtenteDemo(EMAIL);
    await utenteDemo(hotel.id, EMAIL, "Paolo Direzione", "Direttore");
    await prenotazioneDemo(hotel.id, { nome: "Sara", cognome: "Galli", dal: giorno(0), notti: 3, adulti: 2 });

    const r = await Regista.apri("cruscotto", await sessione(EMAIL, hotel.id));
    await r.riscalda("/cruscotto", "/statistiche");
    await r.vai("/", "a[href='/cruscotto']");
    await r.cartello("Cruscotto e statistiche", "La giornata a colpo d'occhio e l'andamento della struttura, confrontato con l'anno prima.", "HotelWeb · video dimostrativo");
    await r.clic("a[href='/cruscotto']", "Il cruscotto è nel menu Ricevimento: la pagina iniziale resta il planning.");
    await r.aspetta("a:has-text('Arrivi di oggi')");
    await r.fumetto("Ogni riquadro è un numero della giornata; il colore dice se c'è qualcosa da fare.");
    await r.fumetto("Arrivi e partenze di oggi, occupazione di stanotte…", "a:has-text('Arrivi di oggi')");
    await r.fumetto("…e gli incassi della cassa di oggi.", "a:has-text('Incassi di oggi')");
    await r.fumetto("Un clic su un riquadro apre la pagina dove si risolve.", "a:has-text('Occupazione stanotte')");
    await r.clic("a:has-text('Arrivi di oggi')");
    await r.attendi(2500);
    await r.fumetto("Qui, per esempio, gli arrivi di oggi.");

    await r.clic("a[href='/statistiche']", "Le statistiche sono per chi dirige: servono il permesso «Vedere le statistiche».");
    await r.aspetta("text=Occupazione giorno per giorno");
    await r.fumetto("Si sceglie il periodo; ogni numero è confrontato con lo stesso periodo dell'anno prima.", "button:has-text('Calcola')");
    await r.fumetto("Occupazione, prezzo medio a notte, ricavo per camera disponibile…", "text=Prezzo medio a notte");
    await r.fumetto("L'occupazione giorno per giorno: passando con il mouse su una barra si legge il valore.", "text=Occupazione giorno per giorno");
    await r.fumetto("Più in basso: canali di vendita e provenienza degli ospiti.", "text=Canali di vendita");
    await r.fumetto("E quanto è già prenotato per i prossimi mesi.", "text=Già prenotato per i prossimi mesi");
    await r.cartello("Anche in un foglio di calcolo", "I numeri si scaricano per un foglio di calcolo con il pulsante Excel (CSV).", "Il resto è nel Manuale, capitolo Cruscotto e statistiche");
    console.log("Video salvato in", await r.chiudi());
  },
  () => cancellaUtenteDemo(EMAIL),
);
