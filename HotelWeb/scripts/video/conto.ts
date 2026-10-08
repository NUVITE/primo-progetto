/**
 * Video "Conto e cassa": un consumo segnato sul conto, il saldo incassato e lo stesso incasso
 * nella pagina della cassa del giorno (senza chiudere la giornata). Hotel Meridiana, Reception.
 *   npx tsx scripts/video/conto.ts
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { Regista } from "./regista";
import { conPulizia, giorno, prenotazioneDemo, sessione } from "./scena";

conPulizia(async () => {
  const hotel = await prisma.hotel.findFirstOrThrow({ where: { nome: "Hotel Meridiana" } });
  const demo = await prenotazioneDemo(hotel.id, { nome: "Laura", cognome: "Conti", dal: giorno(0), notti: 2 });

  const r = await Regista.apri("conto", await sessione("reception@hotelmeridiana.it", hotel.id), ["dettaglio-prenotazione", "cassa"]);
  await r.riscalda("/cassa");
  await r.vai(`/prenotazioni/${demo.prenotazioneId}`, "button:has-text('Registra pagamento')");
  await r.cartello("Conto e cassa", "Un consumo segnato sul conto, il saldo incassato e il controllo nella cassa del giorno.", "HotelWeb · video dimostrativo");

  await r.fumetto("Il conto: tutto quello che l'ospite deve pagare, voce per voce, con l'IVA.", "text=Tutto quello che l'ospite deve pagare");
  await r.fumetto("Notti e tassa di soggiorno ci sono già; consumi ed extra si aggiungono da qui.", "button:has-text('Consumo')");
  await r.clic("button:has-text('Consumo')");
  await r.fumetto("Il reparto decide l'aliquota IVA della riga.", "label:has-text('Reparto') select");
  await r.scrivi("input[placeholder='es. 2 caffè']", "Caffè al bar", "Una descrizione breve…");
  await r.compila("label:has-text('Quantità') input", "2", "…quantità…");
  await r.scrivi("label:has-text('Prezzo unitario') input", "1,50", "…e prezzo, IVA inclusa.");
  await r.clic("button:has-text('Segna sul conto')");
  await r.aspetta("text=Caffè al bar");
  await r.fumetto("La riga è sul conto e il totale si aggiorna.", "text=Caffè al bar");

  await r.clic("button:has-text('Registra pagamento')", "Alla partenza si incassa il saldo.");
  await r.fumetto("L'importo proposto è quanto resta da pagare.", "label:has-text('Importo') input");
  await r.scegli("label:has-text('Metodo') select", { index: 1 }, "Si sceglie il metodo di pagamento.");
  await r.clic("button:text-is('Registra')");
  await r.attendi(1500);
  await r.fumetto("Saldato: il pagamento resta registrato con data, metodo e operatore.", "text=Da pagare");

  await r.clic("a:has-text('Cassa e chiusura del giorno')", "Gli incassi del giorno si controllano nella cassa.");
  await r.aspetta("text=Per metodo");
  await r.fumetto("Totali per metodo e per operatore…", "text=Per metodo");
  await r.fumetto("…e ogni movimento, con la prenotazione da cui viene.", `tr:has(a[href="/prenotazioni/${demo.prenotazioneId}"])`);
  await r.fumetto("A fine turno si contano i contanti e si chiude la giornata.", "button:has-text('Chiudi la giornata')");
  await r.cartello("Incasso registrato", "Proforma, conto diviso fra più paganti e dati per la fattura sono nel capitolo Conto e cassa del Manuale.", "Il resto è nel Manuale, menu Aiuto");
  console.log("Video salvato in", await r.chiudi());
});
