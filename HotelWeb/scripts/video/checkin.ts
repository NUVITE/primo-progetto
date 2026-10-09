/**
 * Video "Check-in": dalla prenotazione in arrivo oggi ai dati per la schedina di Polizia e
 * all'arrivo confermato. Hotel Meridiana, utente Reception, una persona per due notti.
 *   npx tsx scripts/video/checkin.ts
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { Regista } from "./regista";
import { conPulizia, giorno, prenotazioneDemo, sessione } from "./scena";

const COMUNE = "input[placeholder='Scrivi il nome del comune...'] >> nth=0";

conPulizia(async () => {
  const hotel = await prisma.hotel.findFirstOrThrow({ where: { nome: "Hotel Meridiana" } });
  const demo = await prenotazioneDemo(hotel.id, { nome: "Marco", cognome: "Bianchi", dal: giorno(0), notti: 2 });

  const r = await Regista.apri("checkin", await sessione("reception@hotelmeridiana.it", hotel.id), ["dettaglio-prenotazione", "checkin"]);
  await r.riscalda(`/prenotazioni/${demo.prenotazioneId}/checkin/${demo.segmentoId}`);
  await r.vai(`/prenotazioni/${demo.prenotazioneId}`, ":is(a,button):has-text('Check-in')");
  await r.cartello("Il check-in", "Dati degli ospiti per la schedina di Polizia e l'ISTAT, poi la conferma dell'arrivo.", "HotelWeb · video dimostrativo");
  await r.fumetto("Marco Bianchi arriva oggi. Il check-in si fa camera per camera.");
  await r.clic(":is(a,button):has-text('Check-in')", "Si apre il check-in della camera.");
  await r.aspetta("text=Mancano:");

  await r.fumetto("In giallo cosa manca per la schedina di Polizia e per l'ISTAT.", "text=Mancano:");
  await r.scegli("label:has-text('Sesso') select", "Maschio", "Si completano i dati personali…");
  await r.compila("label:has-text('Data di nascita') input", "1985-04-12");
  await r.scrivi(COMUNE, "Bari", "…il comune di nascita, cercato nelle tabelle ufficiali della Polizia…");
  await r.clic("li button:has-text('BARI (BA)')");
  await r.fumetto("La cittadinanza italiana è già proposta: si cambia solo se serve.", "span:text-is('ITALIA')");
  await r.scrivi(COMUNE, "Milano", "…e il comune di residenza.");
  await r.clic("li button:has-text('MILANO (MI)')");

  await r.fumetto("Da solo in camera è un ospite singolo: per lui serve il documento.", "label:has-text('Tipo di alloggiato') select");
  await r.scegli("label:has-text('Tipo di documento') select", { value: "IDENT" }, "Tipo e numero del documento…");
  await r.scrivi("label:has-text('Numero del documento') input", "CA12345BB");
  await r.scrivi("input[placeholder='Comune italiano...']", "Bari", "…e chi l'ha rilasciato.");
  await r.clic("li button:has-text('BARI (BA)')");

  await r.scegli("label:has-text('Motivo del viaggio') select", { index: 1 }, "Per l'ISTAT: motivo del viaggio e mezzo di trasporto.");
  await r.scegli("label:has-text('Mezzo') select", { index: 1 });
  await r.clic("button:has-text('Salva dati')", "Si salvano i dati della persona.");
  await r.aspetta("text=completi");
  await r.fumetto("Dati completi: l'avviso diventa verde.", "text=completi");

  await r.clic("button:has-text('Conferma arrivo')", "Quando l'ospite è davvero arrivato si conferma l'arrivo.");
  await r.aspetta("text=Arrivo confermato");
  await r.fumetto("Da adesso ci sono 24 ore per inviare la schedina alla Polizia.", "text=Arrivo confermato");
  await r.cartello(
    "Check-in fatto",
    "La schedina si invia da Ricevimento › Schedine Polizia. Alla partenza, da questa pagina: Check-out della camera.",
    "Il resto è nel Manuale, menu Aiuto",
  );
  console.log("Video salvato in", await r.chiudi());
});
