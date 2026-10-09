/**
 * Video "Fare una prenotazione": dal planning alla prenotazione confermata, con un ospite nuovo.
 * Hotel Meridiana, utente Reception, tre notti fra tre settimane in una camera libera.
 *   npx tsx scripts/video/prenotazione.ts
 */
import "dotenv/config";
import { prisma } from "../../src/lib/prisma";
import { Regista } from "./regista";
import { cameraLibera, conPulizia, giorno, iso, sessione } from "./scena";

conPulizia(async () => {
  const hotel = await prisma.hotel.findFirstOrThrow({ where: { nome: "Hotel Meridiana" } });
  const dal = giorno(21);
  const al = giorno(24);
  const camera = await cameraLibera(hotel.id, dal, al, true);

  const r = await Regista.apri("prenotazione", await sessione("reception@hotelmeridiana.it", hotel.id), ["nuova-prenotazione"]);
  const esistente = await prisma.prenotazione.findFirst({ where: { hotelId: hotel.id }, select: { id: true } });
  await r.riscalda("/prenotazioni/nuova", ...(esistente ? [`/prenotazioni/${esistente.id}`] : []));
  await r.vai("/", "text=Nuova prenotazione");
  await r.cartello("Fare una prenotazione", "Dal planning alla prenotazione confermata: ospite, camera, date, persone e prezzo.", "HotelWeb · video dimostrativo");
  await r.fumetto("Questa è la pagina iniziale: il planning delle camere, giorno per giorno.");
  await r.clic("a:has-text('Nuova prenotazione')", "Per una prenotazione completa si parte da qui.");
  await r.attendi(800);

  await r.scrivi("input[placeholder^='Nome o cognome'] >> nth=0", "Giulia Ferraris", "Prima di tutto chi prenota: si cerca per nome o cognome.");
  await r.fumetto("Non è ancora in anagrafica: la si crea dalla stessa ricerca.", "button:has-text('Crea nuovo ospite')");
  await r.clic("button:has-text('Crea nuovo ospite')");
  await r.clic("button:has-text('Usa questo ospite')", "Nome e cognome sono già divisi: basta confermare.");

  await r.scegli("select:has(option:text('Seleziona...'))", { value: String(camera.id) }, "Poi la camera…");
  await r.compila("input[type=date] >> nth=0", iso(dal), "…la data di arrivo…");
  await r.compila("input[type=date] >> nth=1", iso(al), "…e quella di partenza.");
  await r.fumetto("Le persone sono la base del prezzo: adulti ed età dei bambini all'arrivo.", "button[aria-label='Un adulto in più']");
  await r.clic("button:has-text('Bambino')");
  await r.attendi(800);

  await r.scrivi("input[placeholder^='Nome o cognome'] >> nth=0", "Giulia Ferraris", "L'intestatario della camera: qui è la stessa persona.");
  await r.clic("button:has-text('Crea nuovo ospite')");
  await r.clic("button:has-text('Usa questo ospite')");
  await r.attendi(1000);

  await r.fumetto("Il prezzo si calcola mentre si compila: notti, prima notte e tassa di soggiorno stimata.", "div.bg-white.px-3:has-text('Prima notte')");
  await r.fumetto("A destra il riepilogo, con canale, garanzia e acconto se servono.", "text=Totale stimato");
  await r.clic("button:has-text('Conferma prenotazione')", "Tutto a posto: si conferma.");
  await r.attendi(1200);
  await r.fumetto("Fatto. La prenotazione nasce in opzione fino alla data indicata.", "text=creata");
  await r.fumetto("La tassa è stimata per chi non è ancora registrato: al check-in diventa quella vera.", "dt:has-text('Tassa di soggiorno')");
  await r.clic("a:has-text('Apri la prenotazione')");
  await r.aspetta(":is(a,button):has-text('Check-in')");
  await r.fumetto("Nel dettaglio: conferma o annullamento dell'opzione, cambi di camera e di date…", "button:has-text('Conferma prenotazione')");
  await r.fumetto("…e, all'arrivo, il check-in. Conto e pagamenti sono più in basso.", ":is(a,button):has-text('Check-in')");
  await r.cartello("Prenotazione fatta", "Per bloccare più camere senza sceglierle subito: trascina le date sul planning (prenotazione veloce).", "Il resto è nel Manuale, menu Aiuto");
  console.log("Video salvato in", await r.chiudi());
});
