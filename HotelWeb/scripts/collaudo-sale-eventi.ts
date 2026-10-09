/**
 * Collaudo delle migliorie alle sale: prenotazione su più giorni (ripetizione), avviso di capienza
 * nell'anteprima, pacchetti con quantità dai partecipanti, relatori con uso diurno collegato.
 * Sala, servizi, pacchetto ed eventi di prova nel primo hotel, cancellati alla fine.
 *   npx tsx scripts/collaudo-sale-eventi.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { creaUsoDiurno } from "../src/lib/prenotazioni";
import {
  aggiungiOccupazione,
  anteprimaOccupazione,
  applicaPacchetto,
  collegaPrenotazionePersona,
  creaPrenotazioneSala,
  dettaglioPrenotazioneSala,
  salvaPacchetto,
  salvaPersonaEvento,
  type OccupazioneInput,
  type TestataInput,
} from "../src/lib/sale";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const NOME = "__CollaudoEventi";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const cliente = await prisma.cliente.create({ data: { hotelId: hotel.id, tipo: "azienda", denominazione: `${NOME} Università` } });
  const sala = await prisma.sala.create({ data: { hotelId: hotel.id, nome: `${NOME} Sala`, capienzaMax: 30, prezzoOrario: 10 } });
  const platea = await prisma.allestimentoSala.create({ data: { salaId: sala.id, nome: "Platea", capienza: 20 } });
  const coffee = await prisma.servizioCatalogo.create({ data: { hotelId: hotel.id, nome: `${NOME} Coffee break`, prezzo: 6 } });
  const proiettore = await prisma.servizioCatalogo.create({ data: { hotelId: hotel.id, nome: `${NOME} Videoproiettore`, prezzo: 50 } });
  const eventi: number[] = [];
  let usoDiurno: number | null = null;
  const testata = (titolo: string, partecipanti: number | null): TestataInput => ({
    titolo,
    clienteId: cliente.id,
    prenotazioneId: null,
    stato: "confermata",
    scadenzaOpzione: "",
    partecipanti,
    note: "",
  });
  const occ = (giorno: string, inizio = "09:00", fine = "13:00"): OccupazioneInput => ({ salaId: sala.id, giorno, fasciaId: null, inizio, fine, allestimentoId: null, partecipanti: null });

  try {
    // 1. Sessione d'esami: lunedì 3 marzo 2031 → domenica 16, solo dal lunedì al venerdì = 10 giorni.
    const esami = await creaPrenotazioneSala(hotel.id, testata(`${NOME} esami`, 40), [occ("2031-03-03")], { al: "2031-03-16", giorniSettimana: [1, 2, 3, 4, 5] });
    eventi.push(esami);
    let d = await dettaglioPrenotazioneSala(hotel.id, esami);
    verifica("Ripetizione lun-ven per due settimane: 10 giorni", d.occupazioni.length === 10 && d.giorni.length === 10, d.giorni);
    verifica("Nessun sabato o domenica", !d.giorni.some((g) => [0, 6].includes(new Date(`${g}T00:00:00Z`).getUTCDay())));
    verifica("Prezzo a ore su ogni giorno: 4 ore × 10 € × 10 giorni", d.totali.sale === 400, d.totali);

    // Conflitto: un evento occupa il 19 marzo; ripetere dal 17 al 21 rifiuta tutto ed elenca il giorno.
    const altro = await creaPrenotazioneSala(hotel.id, testata(`${NOME} altro`, 10), [occ("2031-03-19", "10:00", "11:00")]);
    eventi.push(altro);
    const e1 = await errore(() => aggiungiOccupazione(hotel.id, esami, occ("2031-03-17"), { al: "2031-03-21", giorniSettimana: [] }));
    d = await dettaglioPrenotazioneSala(hotel.id, esami);
    verifica("Ripetizione con un giorno occupato: rifiutata, con la data", !!e1 && e1.includes("19/03/2031"), e1 ?? "");
    verifica("…e nessun giorno aggiunto (tutto o niente)", d.occupazioni.length === 10);
    const e2 = await errore(() => creaPrenotazioneSala(hotel.id, testata(`${NOME} x`, 1), [occ("2031-03-03")], { al: "2031-03-08", giorniSettimana: [0] }));
    verifica("Nessun giorno corrispondente: rifiutata", !!e2, e2 ?? "");

    // 2. Capienza già nell'anteprima.
    const a1 = await anteprimaOccupazione(hotel.id, { ...occ("2031-04-01"), allestimentoId: platea.id, partecipanti: 25 });
    verifica("Anteprima: 25 persone in platea da 20 → avviso", !!a1.avvisoCapienza && a1.avvisoCapienza.includes("20"), a1.avvisoCapienza);
    const a2 = await anteprimaOccupazione(hotel.id, { ...occ("2031-04-01"), partecipanti: 25 });
    verifica("Senza allestimento vale la capienza della sala (30): nessun avviso", a2.avvisoCapienza === null);

    // 3. Pacchetto "Giornata congressuale": coffee 6 € e pranzo 25 € a persona, videoproiettore 50 € a evento.
    const pacchetti = await salvaPacchetto(hotel.id, null, {
      nome: `${NOME} Giornata`,
      descrizione: "",
      attivo: true,
      righe: [
        { servizioCatalogoId: coffee.id, descrizione: "", prezzoUnitario: 6, quantitaPer: "persona" },
        { servizioCatalogoId: null, descrizione: "Pranzo", prezzoUnitario: 25, quantitaPer: "persona" },
        { servizioCatalogoId: proiettore.id, descrizione: "", prezzoUnitario: 50, quantitaPer: "evento" },
      ],
    });
    const pac = pacchetti.find((p) => p.nome === `${NOME} Giornata`)!;
    verifica("Pacchetto: 31 € a persona + 50 € a evento", pac.aPersona === 31 && pac.aEvento === 50, pac);
    await applicaPacchetto(hotel.id, esami, { pacchettoId: pac.id, giorno: null, partecipanti: null });
    d = await dettaglioPrenotazioneSala(hotel.id, esami);
    verifica("Su tutti i 10 giorni: 30 servizi", d.servizi.length === 30);
    verifica("Quantità dai partecipanti dell'evento (40): 10 × (40 × 31 + 50) = 12.900 €", d.totali.servizi === 12900, d.totali);
    verifica("I servizi portano il nome del pacchetto", d.servizi.every((s) => s.pacchetto === `${NOME} Giornata`));
    const senza = await creaPrenotazioneSala(hotel.id, testata(`${NOME} senza persone`, null), [occ("2031-05-05")]);
    eventi.push(senza);
    const e3 = await errore(() => applicaPacchetto(hotel.id, senza, { pacchettoId: pac.id, giorno: null, partecipanti: null }));
    verifica("Senza partecipanti un pacchetto a persona è rifiutato", !!e3, e3 ?? "");
    await applicaPacchetto(hotel.id, senza, { pacchettoId: pac.id, giorno: "2031-05-05", partecipanti: 12 });
    const d2 = await dettaglioPrenotazioneSala(hotel.id, senza);
    verifica("Un giorno solo con 12 partecipanti: 12 × 31 + 50 = 422 €", d2.totali.servizi === 422, d2.totali);

    // 4. Relatore con uso diurno collegato.
    await salvaPersonaEvento(hotel.id, esami, null, { nome: "Prof. Mario Bianchi", ruolo: "relatore", telefono: "", email: "", note: "arriva in treno" });
    d = await dettaglioPrenotazioneSala(hotel.id, esami);
    const relatore = d.persone[0];
    verifica("Relatore aggiunto senza prenotazione", relatore?.nome === "Prof. Mario Bianchi" && relatore.prenotazione === null);
    const du = await creaUsoDiurno(hotel.id, { cameraId: camera.id, giorno: "2031-03-03", dalle: "08:00", alle: "18:00", ospite: { nome: "Mario", cognome: NOME }, prezzo: 60 });
    usoDiurno = du.id;
    await collegaPrenotazionePersona(hotel.id, relatore.id, du.id);
    d = await dettaglioPrenotazioneSala(hotel.id, esami);
    verifica("Uso diurno collegato al relatore", d.persone[0].prenotazione?.descrizione.startsWith("uso diurno 03/03/2031 08:00–18:00") === true, d.persone[0].prenotazione);
    const e4 = await errore(() => salvaPersonaEvento(hotel.id, esami, null, { nome: " ", ruolo: "relatore", telefono: "", email: "", note: "" }));
    verifica("Persona senza nome rifiutata", !!e4, e4 ?? "");
  } finally {
    await prisma.personaEvento.deleteMany({ where: { prenotazioneSalaId: { in: eventi } } });
    await prisma.servizioSala.deleteMany({ where: { prenotazioneSalaId: { in: eventi } } });
    await prisma.occupazioneSala.deleteMany({ where: { prenotazioneSalaId: { in: eventi } } });
    await prisma.prenotazioneSala.deleteMany({ where: { id: { in: eventi } } });
    if (usoDiurno) {
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: usoDiurno } });
      await prisma.prenotazione.delete({ where: { id: usoDiurno } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.pacchettoSala.deleteMany({ where: { hotelId: hotel.id, nome: { startsWith: NOME } } });
    await prisma.servizioCatalogo.deleteMany({ where: { id: { in: [coffee.id, proiettore.id] } } });
    await prisma.sala.delete({ where: { id: sala.id } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
