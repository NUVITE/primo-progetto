/**
 * Collaudo del primo avvio guidato: passi puri (tutto da fare, tutto fatto, passi del fornitore, nomi
 * delle unità) e una struttura di prova che si completa passo per passo (camere, prezzi, politica,
 * dati, titolare). Crea un hotel di prova e lo cancella alla fine.
 *   npx tsx scripts/collaudo-avvio.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { passiAvvio, riepilogoAvvio, type StatoAvvio } from "../src/lib/avvioRegole";
import { avvio } from "../src/lib/avvio";
import { creaHotel, elencoHotel, type DatiHotel } from "../src/lib/hotel";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
const SUFFISSO = "@collaudo-avvio.invalid";

async function main() {
  const vuoto: StatoAvvio = {
    unita: { singolare: "camera", plurale: "camere", femminile: true },
    datiMancanti: ["indirizzo", "telefono", "email", "orario di check-in", "orario di check-out"],
    camereAttive: 0,
    tipiSenzaPrezzi: [],
    politiche: 0,
    regolamentoTassa: false,
    alloggiati: { utente: false, verificato: false },
    istat: { sistema: null, completo: false },
    email: { configurata: false, provaRiuscita: false },
    utenti: { titolare: false, quanti: 1 },
  };
  const r0 = riepilogoAvvio(passiAvvio(vuoto));
  verifica("Struttura vuota: 0 passi fatti su 9", r0.fatti === 0 && r0.totale === 9 && !r0.completo, r0);
  const p0 = passiAvvio(vuoto);
  verifica("Tassa e ISTAT senza sistema: segnalati come passi del fornitore", p0.find((p) => p.id === "tassa")?.fornitore === true && p0.find((p) => p.id === "istat")?.fornitore === true);
  verifica("Senza camere i prezzi non risultano fatti", p0.find((p) => p.id === "prezzi")?.fatto === false);
  verifica("Dati mancanti elencati in breve", p0[0].dettaglio === "Mancano: indirizzo, telefono, email e altri 2.", p0[0].dettaglio);
  const pieno: StatoAvvio = {
    ...vuoto,
    unita: { singolare: "appartamento", plurale: "appartamenti", femminile: false },
    datiMancanti: [],
    camereAttive: 4,
    politiche: 1,
    regolamentoTassa: true,
    alloggiati: { utente: true, verificato: true },
    istat: { sistema: "SPOT", completo: true },
    email: { configurata: true, provaRiuscita: true },
    utenti: { titolare: true, quanti: 1 },
  };
  const pp = passiAvvio(pieno);
  verifica("Tutto configurato: completo, ISTAT non più del fornitore", riepilogoAvvio(pp).completo && pp.find((p) => p.id === "istat")?.fornitore === false);
  verifica("Case vacanze: il passo si chiama Appartamenti e tipi", pp.find((p) => p.id === "camere")?.titolo === "Appartamenti e tipi" && pp.find((p) => p.id === "camere")?.dettaglio === "4 appartamenti attivi.");
  verifica("Credenziali Alloggiati non provate: non fatto", !passiAvvio({ ...pieno, alloggiati: { utente: true, verificato: false } }).find((p) => p.id === "alloggiati")!.fatto);

  // Struttura nuova di prova (B&B: titolare unico già dal profilo).
  const comune = await prisma.comune.findFirstOrThrow({ orderBy: { id: "asc" } });
  const dati: DatiHotel = { nome: "__Collaudo avvio", comuneId: comune.id, tipologia: "bb", categoria: "", ragioneSociale: "", partitaIva: "", codiceFiscale: "", indirizzo: "", cap: "", telefono: "", email: "", pec: "", sistemaIstat: "" };
  const hotel = await creaHotel(dati, { nome: "Titolare", email: `titolare${SUFFISSO}`, password: "girasole-di-campo-7" });
  try {
    let a = await avvio(hotel.id);
    const fatto = (id: string) => a.passi.find((p) => p.id === id)!.fatto;
    verifica("B&B appena nato: utenti a posto (titolare), camere e prezzi da fare", fatto("utenti") && !fatto("camere") && !fatto("prezzi") && !fatto("struttura"), a.passi.map((p) => `${p.id}:${p.fatto}`));
    const tipo = await prisma.tipoCamera.create({ data: { hotelId: hotel.id, codice: "DBL", descrizione: "Doppia" } });
    await prisma.camera.create({ data: { hotelId: hotel.id, codice: "1", tipoCameraId: tipo.id, capienzaAdulti: 2, capienzaBambini: 0 } });
    a = await avvio(hotel.id);
    verifica("Con una camera: camere fatte, prezzi mancanti per la Doppia", fatto("camere") && !fatto("prezzi") && a.passi.find((p) => p.id === "prezzi")!.dettaglio.includes("Doppia"));
    const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
    await prisma.periodoTariffario.create({ data: { listinoId: listino.id, tipoCameraId: tipo.id, dal: new Date("2026-01-01"), al: new Date("2099-12-31"), prezzoNotte: 80 } });
    await prisma.politicaCancellazione.create({ data: { hotelId: hotel.id, nome: "Flessibile", scaglioni: [], noShow: {} } });
    await prisma.hotel.update({ where: { id: hotel.id }, data: { indirizzo: "Via Roma 1", telefono: "080 000000", email: "info@esempio.invalid", orarioCheckIn: "14:00", orarioCheckOut: "10:00" } });
    a = await avvio(hotel.id);
    verifica("Prezzi, politica e dati: fatti", fatto("prezzi") && fatto("politiche") && fatto("struttura"));
    verifica("Restano da fare Alloggiati, email ed eventualmente tassa/ISTAT", !fatto("alloggiati") && !fatto("email") && !a.completo && a.fatti >= 5, `${a.fatti}/${a.totale}`);
    // Pagina del fornitore: lo stesso stato nell'elenco degli hotel, con le funzioni spente dal profilo B&B.
    const riga = (await elencoHotel()).find((h) => h.id === hotel.id)!;
    verifica(
      "Elenco del fornitore: avvio da completare con gli stessi numeri e funzioni spente del profilo",
      !riga.avvio.completo && riga.avvio.fatti === a.fatti && riga.avvio.totale === 9 && riga.avvio.daFornitore === a.passi.filter((p) => !p.fatto && p.fornitore).length && riga.funzioniSpente.includes("gruppi"),
      { avvio: riga.avvio, spente: riga.funzioniSpente },
    );
  } finally {
    await prisma.politicaCancellazione.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.periodoTariffario.deleteMany({ where: { listino: { hotelId: hotel.id } } });
    await prisma.camera.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.tipoCamera.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.trattamento.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.listino.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.fasciaOraria.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.repartoAddebito.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.ruoloAggiuntivo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utenteHotel.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utente.deleteMany({ where: { email: { endsWith: SUFFISSO } } });
    await prisma.ruolo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (hotel di prova cancellato)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
