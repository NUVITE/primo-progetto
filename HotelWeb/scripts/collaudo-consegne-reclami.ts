/**
 * Collaudo di consegne fra turni e reclami: consegne da leggere per ogni collega (non le proprie),
 * lettura una volta per persona, chiusura; reclami con validazioni, persona della prenotazione,
 * soluzione, abbuono sul conto (uno per reclamo, di nuovo dopo uno storno), analisi, riepilogo per
 * categoria, reclami nella scheda ospite, isolamento fra hotel. Primo hotel; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-consegne-reclami.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { chiudiConsegna, consegneDaLeggere, creaConsegna, elencoConsegne, segnaConsegnaLetta } from "../src/lib/consegne";
import { riepilogoReclami } from "../src/lib/reclamiRegole";
import { abbuonoReclamo, analisiReclamo, elencoReclami, reclamiOspite, registraReclamo, risolviReclamo, type ReclamoInput } from "../src/lib/reclami";
import { stornaAddebito } from "../src/lib/conto";
import { creaPrenotazioneGenerica } from "../src/lib/prenotazioni";

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

const COGNOME = "CollaudoReclami";
const MARCA = "[collaudo consegne]";
// Utenti di prova solo come id e nome (le consegne non hanno vincoli sugli utenti).
const anna = { id: 990001, nome: "Anna (collaudo)" };
const bruno = { id: 990002, nome: "Bruno (collaudo)" };
const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

async function main() {
  // Regola pura del riepilogo.
  const t0 = new Date("2026-10-01T10:00:00Z");
  const rie = riepilogoReclami([
    { categoria: "rumore", stato: "risolto", creatoIl: t0, risoltoIl: new Date(t0.getTime() + 2 * 3600000), abbuono: 20 },
    { categoria: "rumore", stato: "aperto", creatoIl: t0, risoltoIl: null, abbuono: null },
    { categoria: "pulizia", stato: "risolto", creatoIl: t0, risoltoIl: new Date(t0.getTime() + 4 * 3600000), abbuono: 10.5 },
  ]);
  verifica(
    "Riepilogo: 3 reclami, 1 aperto, 3 ore medie, 30,50 di abbuoni, prima il rumore",
    rie.totale === 3 && rie.aperti === 1 && rie.oreMedieSoluzione === 3 && rie.abbuoni === 30.5 && rie.perCategoria[0].categoria === "rumore" && rie.perCategoria[0].aperti === 1,
    rie,
  );

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const altroHotel = await prisma.hotel.findFirst({ where: { id: { not: hotel.id } } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const ids: number[] = [];
  const reclami: number[] = [];

  try {
    // ---------------- Consegne ----------------
    verifica("Consegna vuota: rifiutata", !!(await errore(() => creaConsegna(hotel.id, "  ", false, anna))));
    const primaB = await consegneDaLeggere(hotel.id, bruno.id);
    const primaA = await consegneDaLeggere(hotel.id, anna.id);
    const c1 = await creaConsegna(hotel.id, `${MARCA} La 204 vuole la fattura alle 7`, true, anna);
    verifica("Bruno ha una consegna in più da leggere, Anna (che l'ha scritta) no", (await consegneDaLeggere(hotel.id, bruno.id)) === primaB + 1 && (await consegneDaLeggere(hotel.id, anna.id)) === primaA);
    let eb = (await elencoConsegne(hotel.id, bruno.id)).aperte.find((c) => c.id === c1);
    verifica("Per Bruno: da leggere e importante, scritta da Anna", !!eb && !eb.lettaDaMe && !eb.mia && eb.importante && eb.creataDa === anna.nome);
    await segnaConsegnaLetta(hotel.id, c1, bruno);
    await segnaConsegnaLetta(hotel.id, c1, bruno);
    eb = (await elencoConsegne(hotel.id, bruno.id)).aperte.find((c) => c.id === c1);
    verifica("Letta: torna come prima e la lettura c'è una volta sola", (await consegneDaLeggere(hotel.id, bruno.id)) === primaB && eb?.lettaDaMe === true && eb.letture.length === 1 && eb.letture[0].nome === bruno.nome);
    if (altroHotel) verifica("Consegna di un altro hotel: non trovata", !!(await errore(() => segnaConsegnaLetta(altroHotel.id, c1, bruno))));
    await chiudiConsegna(hotel.id, c1, bruno);
    const dopo = await elencoConsegne(hotel.id, anna.id);
    verifica("Chiusa: passa fra le chiuse con chi l'ha chiusa", !dopo.aperte.some((c) => c.id === c1) && dopo.chiuse.some((c) => c.id === c1 && c.chiusaDa === bruno.nome));
    verifica("Già chiusa: rifiutato", !!(await errore(() => chiudiConsegna(hotel.id, c1, anna))));

    // ---------------- Reclami ----------------
    const p = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome: "Elena", cognome: COGNOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: "2033-11-01",
      dataFine: "2033-11-04",
      richieste: [{ tipoCameraId: tipo.id, quantita: 1, composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(p.id);
    const estraneo = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Estraneo", cognome: COGNOME } });
    const base = (x: Partial<ReclamoInput> = {}): ReclamoInput => ({ prenotazioneId: p.id, ospiteId: null, nome: "", categoria: "rumore", descrizione: "Musica alta fino all'una dalla camera accanto", ...x });

    verifica("Categoria non prevista: rifiutata", !!(await errore(() => registraReclamo(hotel.id, base({ categoria: "boh" as never }), "Marco"))));
    verifica("Senza descrizione: rifiutato", !!(await errore(() => registraReclamo(hotel.id, base({ descrizione: " " }), "Marco"))));
    verifica("Persona che non è nella prenotazione: rifiutata", !!(await errore(() => registraReclamo(hotel.id, base({ ospiteId: estraneo.id }), "Marco"))));
    verifica("Senza prenotazione e senza nome: rifiutato", !!(await errore(() => registraReclamo(hotel.id, base({ prenotazioneId: null }), "Marco"))));
    const r1 = await registraReclamo(hotel.id, base(), "Marco");
    reclami.push(r1);
    const r2 = await registraReclamo(hotel.id, base({ prenotazioneId: null, nome: `Cliente del bar ${COGNOME}`, categoria: "ristorazione", descrizione: "Caffè freddo" }), "Marco");
    reclami.push(r2);
    const ospite = p.ospitePrenotanteId ?? (await prisma.prenotazione.findUniqueOrThrow({ where: { id: p.id } })).ospitePrenotanteId;
    let el = await elencoReclami(hotel.id, oggi(), oggi());
    const v1 = el.righe.find((x) => x.id === r1);
    verifica("Reclamo: nome di chi ha prenotato, ospite collegato, aperto", v1?.nome === `Elena ${COGNOME}` && v1.ospiteId === ospite && v1.stato === "aperto" && !!v1.camera, v1);

    verifica("Abbuono su un reclamo senza prenotazione: rifiutato", !!(await errore(() => abbuonoReclamo(hotel.id, r2, 5, "Marco"))));
    verifica("Abbuono a zero: rifiutato", !!(await errore(() => abbuonoReclamo(hotel.id, r1, 0, "Marco"))));
    await abbuonoReclamo(hotel.id, r1, 30, "Marco");
    const ab = await prisma.addebitoConto.findFirstOrThrow({ where: { prenotazioneId: p.id, tipo: "abbuono" } });
    verifica("Abbuono sul conto con il riferimento al reclamo", Number(ab.prezzoUnitario) === 30 && !!ab.nota?.startsWith(`Reclamo n. ${r1}`), ab.nota);
    verifica("Un solo abbuono per reclamo", !!(await errore(() => abbuonoReclamo(hotel.id, r1, 10, "Marco"))));
    await stornaAddebito(hotel.id, ab.id, "Importo sbagliato", "Marco");
    await abbuonoReclamo(hotel.id, r1, 25, "Marco");
    verifica("Dopo lo storno si rifà", (await elencoReclami(hotel.id, oggi(), oggi())).righe.find((x) => x.id === r1)?.abbuono === 25);

    verifica("Risolto senza dire cosa si è fatto: rifiutato", !!(await errore(() => risolviReclamo(hotel.id, r1, " ", "", "Marco"))));
    await risolviReclamo(hotel.id, r1, "Cambiata camera al 3° piano", "Aperitivo offerto", "Marco");
    verifica("Già risolto: rifiutato", !!(await errore(() => risolviReclamo(hotel.id, r1, "altro", "", "Marco"))));
    await analisiReclamo(hotel.id, r1, "Camera vicina alla sala eventi: avvisare chi prenota quella zona");
    if (altroHotel) verifica("Reclamo di un altro hotel: non trovato", !!(await errore(() => analisiReclamo(altroHotel.id, r1, "x"))));

    el = await elencoReclami(hotel.id, oggi(), oggi());
    const mie = el.righe.filter((x) => reclami.includes(x.id));
    const v = mie.find((x) => x.id === r1)!;
    verifica("Risolto con soluzione, gesto, analisi e chi l'ha risolto", v.stato === "risolto" && v.soluzione === "Cambiata camera al 3° piano" && v.gesto === "Aperitivo offerto" && !!v.analisi && v.risoltoDa === "Marco");
    verifica("Riepilogo del giorno: conta anche questi due (rumore e ristorazione)", el.riepilogo.totale >= 2 && el.riepilogo.perCategoria.some((c) => c.categoria === "rumore") && el.riepilogo.perCategoria.some((c) => c.categoria === "ristorazione"));
    verifica("Periodo non valido: rifiutato", !!(await errore(() => elencoReclami(hotel.id, "2026-12-01", "2026-01-01"))));
    const rs = await reclamiOspite(hotel.id, ospite);
    verifica("Nella scheda ospite: il suo reclamo", rs.length === 1 && rs[0].id === r1 && rs[0].stato === "risolto");
  } finally {
    await prisma.reclamo.deleteMany({ where: { id: { in: reclami } } });
    await prisma.consegnaTurno.deleteMany({ where: { hotelId: hotel.id, testo: { startsWith: MARCA } } });
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
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
