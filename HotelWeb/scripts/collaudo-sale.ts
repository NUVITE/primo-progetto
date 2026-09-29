/**
 * Collaudo del motore sale: prezzo (fascia / ore), disponibilità con riassetto, opzioni e annullo.
 * Crea una sala di prova nel primo hotel e la cancella alla fine (anche in caso di errore).
 *   npx tsx scripts/collaudo-sale.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  aggiornaTestata,
  anteprimaOccupazione,
  creaPrenotazioneSala,
  dettaglioPrenotazioneSala,
  impostaPrezzoOccupazione,
  planningSale,
  salvaAllestimento,
  salvaSala,
  type OccupazioneInput,
  type TestataInput,
} from "../src/lib/sale";

let falliti = 0;
function verifica(nome: string, ok: boolean, dettaglio = "") {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
  if (!ok) falliti += 1;
}
async function errore(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const fasce = await prisma.fasciaOraria.findMany({ where: { hotelId: hotel.id } });
  const f = (nome: string) => fasce.find((x) => x.nome === nome)!;
  const cliente = await prisma.cliente.create({ data: { hotelId: hotel.id, denominazione: "__collaudo cliente" } });
  const giorno = "2031-03-10";

  try {
    await salvaSala(hotel.id, null, {
      nome: "__collaudo sala",
      descrizione: "",
      capienzaMax: 50,
      riassettoMinuti: 60,
      prezzoOrario: 40,
      attiva: true,
      prezziFascia: { [f("Mattina").id]: 150, [f("Pomeriggio").id]: 150, [f("Giornata intera").id]: 250 },
    });
    const sala = await prisma.sala.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "__collaudo sala" } });
    await salvaAllestimento(hotel.id, sala.id, null, { nome: "Platea", capienza: 40, costo: 30, attivo: true });
    const platea = await prisma.allestimentoSala.findFirstOrThrow({ where: { salaId: sala.id } });

    const occ = (p: Partial<OccupazioneInput>): OccupazioneInput => ({ salaId: sala.id, giorno, fasciaId: null, inizio: "", fine: "", allestimentoId: null, partecipanti: null, ...p });
    const testata = (p: Partial<TestataInput> = {}): TestataInput => ({
      titolo: "__collaudo",
      clienteId: cliente.id,
      prenotazioneId: null,
      stato: "opzione",
      scadenzaOpzione: "",
      partecipanti: 45,
      note: "",
      ...p,
    });

    // 1. Prezzo per fascia
    let a = await anteprimaOccupazione(hotel.id, occ({ fasciaId: f("Mattina").id }));
    verifica("Mattina a prezzo di fascia", a.prezzo === 150 && a.libera, `${a.prezzo} ${a.spiegazione}`);
    // 2. Orario libero che coincide con una fascia → prezzo di fascia
    a = await anteprimaOccupazione(hotel.id, occ({ inizio: "08:00", fine: "19:00" }));
    verifica("08-19 libero = Giornata intera", a.prezzo === 250, `${a.prezzo} ${a.spiegazione}`);
    // 3. A ore
    a = await anteprimaOccupazione(hotel.id, occ({ inizio: "09:30", fine: "12:00" }));
    verifica("09:30-12:00 a ore = 2,5 × 40", a.prezzo === 100, `${a.prezzo} ${a.spiegazione}`);
    // 4. Sera senza prezzo di fascia → a ore (5 × 40)
    a = await anteprimaOccupazione(hotel.id, occ({ fasciaId: f("Sera").id }));
    verifica("Sera senza prezzo fascia → a ore fino a 24:00", a.prezzo === 200, `${a.prezzo} ${a.spiegazione}`);

    // 5. Prenotazione mattina (opzione) con allestimento e partecipanti oltre capienza
    const id1 = await creaPrenotazioneSala(hotel.id, testata(), [occ({ fasciaId: f("Mattina").id, allestimentoId: platea.id })]);
    let d = await dettaglioPrenotazioneSala(hotel.id, id1);
    verifica("Totale sala + allestimento", d.totali.totale === 180, String(d.totali.totale));
    verifica("Avviso capienza allestimento", d.avvisi.some((x) => x.includes("capienza 40")), d.avvisi.join(" | "));

    // 6. Il riassetto (60') blocca 13:00-14:00 ma non il pomeriggio 14:00
    a = await anteprimaOccupazione(hotel.id, occ({ inizio: "13:30", fine: "14:00" }));
    verifica("13:30 bloccato dal riassetto", !a.libera, a.conflitto ?? "");
    a = await anteprimaOccupazione(hotel.id, occ({ fasciaId: f("Pomeriggio").id }));
    verifica("Pomeriggio 14:00 libero (riassetto rispettato)", a.libera);
    // 7. L'opzione blocca come la conferma
    const e = await errore(() => creaPrenotazioneSala(hotel.id, testata({ titolo: "__collaudo 2" }), [occ({ fasciaId: f("Giornata intera").id })]));
    verifica("Giornata intera rifiutata sopra un'opzione", !!e, e ?? "");

    // 8. Annullando si libera; riattivare fallisce se nel frattempo è stata presa
    await aggiornaTestata(hotel.id, id1, { ...testata(), stato: "annullata" });
    const id2 = await creaPrenotazioneSala(hotel.id, testata({ titolo: "__collaudo 2", stato: "confermata" }), [occ({ fasciaId: f("Giornata intera").id })]);
    verifica("Dopo l'annullo la sala è di nuovo prenotabile", id2 > 0);
    const e2 = await errore(() => aggiornaTestata(hotel.id, id1, testata()));
    verifica("Riattivare un evento con sala occupata è rifiutato", !!e2, e2 ?? "");

    // 9. Prezzo corretto a mano
    const o2 = await prisma.occupazioneSala.findFirstOrThrow({ where: { prenotazioneSalaId: id2 } });
    await impostaPrezzoOccupazione(hotel.id, id2, o2.id, 199);
    d = await dettaglioPrenotazioneSala(hotel.id, id2);
    verifica("Prezzo manuale", d.occupazioni[0].prezzo === 199 && d.occupazioni[0].prezzoManuale);

    // 10. Planning: la giornata intera occupa Mattina e Pomeriggio, non la Sera
    const p = await planningSale(hotel.id, giorno, 1);
    const celle = p.sale.find((s) => s.id === sala.id)!.celle[giorno];
    const statoDi = (nome: string) => celle.find((c) => c.fasciaId === f(nome).id)?.stato;
    verifica("Planning M/P confermata, S libera", statoDi("Mattina") === "confermata" && statoDi("Pomeriggio") === "confermata" && statoDi("Sera") === "libera", celle.map((c) => c.stato).join("/"));

    // 11. Isolamento: un altro hotel non vede la prenotazione
    const altro = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
    if (altro) verifica("Altro hotel non accede", !!(await errore(() => dettaglioPrenotazioneSala(altro.id, id2))));
  } finally {
    const sala = await prisma.sala.findFirst({ where: { hotelId: hotel.id, nome: "__collaudo sala" } });
    await prisma.prenotazioneSala.deleteMany({ where: { clienteId: cliente.id } });
    if (sala) await prisma.sala.delete({ where: { id: sala.id } });
    await prisma.cliente.delete({ where: { id: cliente.id } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main();
