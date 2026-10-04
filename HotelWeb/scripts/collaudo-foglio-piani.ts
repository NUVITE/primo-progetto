/**
 * Collaudo del foglio dei piani: biancheria, divisione delle camere fra le cameriere, assegnazione,
 * «Le mie camere» (inizia, finita, non disturbare, riapri), frigobar sul conto, impostazioni.
 * Primo hotel, due camere libere intorno a oggi; una cameriera di prova. Camere, impostazioni e dati
 * tornano com'erano.
 *   npx tsx scripts/collaudo-foglio-piani.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { biancheria, proponiDivisione, type Lavoro } from "../src/lib/pulizieRegole";
import { assegnaCamera, azioneSullaCamera, cameriere, impostaBiancheria, lavoroDelGiorno, mieCamere, proponiAssegnazioni, salvaArticolo, segnaFrigobar } from "../src/lib/foglioPiani";
import { impostaControlloGovernante, quadroCamere } from "../src/lib/pulizie";
import { checkoutCamera } from "../src/lib/checkin";
import { creaPrenotazione } from "../src/lib/prenotazioni";
import { fotografaStatoCamere } from "./statoCamereCollaudo";

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

const NOME = "CollaudoFoglioPiani";
const giorno = (n: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(Date.now() + n * 86400000));

async function main() {
  // Regole pure.
  verifica("Fermata, terza notte, lenzuola ogni 3: si cambiano", biancheria("fermata", 3, 3, null).lenzuola && biancheria("fermata", 3, 3, null).asciugamani === "su_richiesta");
  verifica("Fermata, seconda notte: lenzuola no", !biancheria("fermata", 2, 3, null).lenzuola);
  verifica("Asciugamani ogni 2 notti: alla quarta si cambiano", biancheria("fermata", 4, 3, 2).asciugamani === "cambio" && biancheria("fermata", 3, 3, 2).asciugamani === "no");
  verifica("Partenza: cambio completo", biancheria("partenza", 1, 3, null).lenzuola && biancheria("partenza", 1, 3, null).asciugamani === "cambio");
  const camereProva = [
    ...["11", "12", "13", "14"].map((codice, i) => ({ cameraId: i + 1, piano: "1", codice, lavoro: "partenza" as Lavoro, arrivoOggi: false })),
    ...["21", "22", "23", "24"].map((codice, i) => ({ cameraId: i + 5, piano: "2", codice, lavoro: "fermata" as Lavoro, arrivoOggi: false })),
  ];
  const div = proponiDivisione(camereProva, [100, 200]);
  const carico = (u: number) => camereProva.filter((c) => div.get(c.cameraId) === u).reduce((t, c) => t + (c.lavoro === "partenza" ? 1 : 0.5), 0);
  verifica("Divisione: 6 punti di lavoro, 3 a testa", carico(100) === 3 && carico(200) === 3, { a: carico(100), b: carico(200) });
  verifica("Divisione: la prima cameriera ha solo camere del primo piano (vicine)", camereProva.filter((c) => div.get(c.cameraId) === 100).every((c) => c.piano === "1"));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const impostazioniPrima = { controlloGovernante: hotel.controlloGovernante, cambioLenzuolaOgni: hotel.cambioLenzuolaOgni, cambioAsciugamaniOgni: hotel.cambioAsciugamaniOgni, couverture: hotel.couverture };
  const ripristinaCamere = await fotografaStatoCamere();
  const utenteCheckout = await prisma.utente.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const ruoloCameriera = await prisma.ruolo.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Cameriera ai piani" } });
  const frigobar = await prisma.repartoAddebito.findFirst({ where: { hotelId: hotel.id, nome: { startsWith: "Frigobar" }, attivo: true } });
  const esborso = await prisma.repartoAddebito.findFirst({ where: { hotelId: hotel.id, esborso: true } });

  // Due camere libere da ieri a dopodomani.
  const dal = new Date(giorno(-1));
  const al = new Date(giorno(2));
  const libere = [];
  for (const c of await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } })) {
    const occupata = await prisma.segmentoSoggiorno.count({ where: { cameraId: c.id, stato: { not: "ANNULLATO" }, prenotazione: { stato: { not: "ANNULLATA" } }, dataInizio: { lt: al }, dataFine: { gt: dal } } });
    const fs = await prisma.cameraIndisponibilita.count({ where: { cameraId: c.id, dal: { lte: al }, al: { gte: dal } } });
    if (!occupata && !fs) libere.push(c);
    if (libere.length === 2) break;
  }
  if (libere.length < 2) throw new Error("Servono due camere libere intorno a oggi: il collaudo non si può fare adesso.");
  const [camF, camP] = libere;
  const ids: number[] = [];
  const cameriera = await prisma.utente.create({ data: { nome: `${NOME} Maria`, email: `collaudo-foglio-piani-${Date.now()}@example.invalid`, passwordHash: "-", accessi: { create: { hotelId: hotel.id, ruoloId: ruoloCameriera.id } } } });
  let articoloId: number | null = null;

  try {
    await impostaControlloGovernante(hotel.id, false);
    await impostaBiancheria(hotel.id, { cambioLenzuolaOgni: 3, cambioAsciugamaniOgni: null, couverture: false });
    const e0 = await errore(() => impostaBiancheria(hotel.id, { cambioLenzuolaOgni: 0, cambioAsciugamaniOgni: null, couverture: false }));
    verifica("Lenzuola ogni 0 notti: rifiutato", !!e0, e0 ?? "");

    const prenota = async (camera: typeof camF, fino: string) => {
      const p = await creaPrenotazione(hotel.id, {
        ospitePrenotante: { nome: "Ospite", cognome: NOME },
        segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento, listinoId: listino.id, dataInizio: giorno(-1), dataFine: fino, composizione: { adulti: 1, etaBambini: [] } }],
      });
      ids.push(p.id);
      await prisma.presenza.updateMany({ where: { segmentoId: p.segmenti[0].id }, data: { stato: "arrivato", arrivoIl: new Date() } });
      return p;
    };
    const pF = await prenota(camF, giorno(2));
    const pP = await prenota(camP, giorno(2));
    await checkoutCamera(hotel.id, utenteCheckout.id, pP.segmenti[0].id, giorno(0));

    const lavoro = await lavoroDelGiorno(hotel.id);
    const cF = lavoro.compiti.find((c) => c.cameraId === camF.id);
    const cP = lavoro.compiti.find((c) => c.cameraId === camP.id);
    verifica("Camera fermata: riassetto, prima notte, lenzuola no, asciugamani su richiesta", cF?.lavoro === "fermata" && cF.notte === 1 && !cF.lenzuola && cF.asciugamani === "su_richiesta", cF);
    verifica("Camera partita oggi: pulizia completa", cP?.lavoro === "partenza" && cP.stato === "da_pulire", cP);
    verifica("La partenza viene prima della fermata nel foglio", lavoro.compiti.findIndex((c) => c.cameraId === camP.id) < lavoro.compiti.findIndex((c) => c.cameraId === camF.id));

    verifica("La cameriera di prova è tra le cameriere", (await cameriere(hotel.id)).some((c) => c.id === cameriera.id));
    const e1 = await errore(() => assegnaCamera(hotel.id, camF.id, utenteCheckout.superAdmin ? -1 : utenteCheckout.id).then(async () => {
      if (!(await cameriere(hotel.id)).some((c) => c.id === utenteCheckout.id)) throw new Error("assegnata a chi non pulisce");
    }));
    verifica("Non si assegna a chi non ha il permesso di pulire", !!e1, e1 ?? "");

    await proponiAssegnazioni(hotel.id, [cameriera.id]);
    let mie = await mieCamere(hotel.id, cameriera.id);
    verifica("Le mie camere: le due camere di prova", [camF.id, camP.id].every((id) => mie.camere.some((c) => c.cameraId === id)));

    const e2 = await errore(() => azioneSullaCamera(hotel.id, { id: utenteCheckout.id, nome: "altro" }, camP.id, "inizia", ""));
    verifica("Un'altra persona non lavora la camera di Maria", !!e2, e2 ?? "");
    await azioneSullaCamera(hotel.id, { id: cameriera.id, nome: "Maria" }, camP.id, "inizia", "");
    verifica("Inizia: in pulizia", (await quadroCamere(hotel.id)).camere.find((c) => c.id === camP.id)?.stato === "in_pulizia");
    await azioneSullaCamera(hotel.id, { id: cameriera.id, nome: "Maria" }, camP.id, "finita", "");
    mie = await mieCamere(hotel.id, cameriera.id);
    const fattaP = mie.camere.find((c) => c.cameraId === camP.id);
    verifica("Finita: pronta e segnata fatta", fattaP?.stato === "pronta" && fattaP.assegnata?.esito === "fatta");

    await azioneSullaCamera(hotel.id, { id: cameriera.id, nome: "Maria" }, camF.id, "dnd", "cartello alle 11");
    mie = await mieCamere(hotel.id, cameriera.id);
    const dnd = mie.camere.find((c) => c.cameraId === camF.id);
    verifica("Non disturbare: segnato sulla camera e nel foglio", dnd?.nonDisturbare === true && dnd.assegnata?.esito === "dnd" && dnd.assegnata.nota === "cartello alle 11");
    await azioneSullaCamera(hotel.id, { id: cameriera.id, nome: "Maria" }, camF.id, "riapri", "");
    mie = await mieCamere(hotel.id, cameriera.id);
    verifica("Riapri: torna da fare", !mie.camere.find((c) => c.cameraId === camF.id)?.assegnata?.esito && !mie.camere.find((c) => c.cameraId === camF.id)?.nonDisturbare);

    // Frigobar.
    if (frigobar) {
      await salvaArticolo(hotel.id, null, { repartoId: frigobar.id, nome: `${NOME} Acqua`, prezzo: 2.5, attivo: true });
      articoloId = (await prisma.articoloReparto.findFirstOrThrow({ where: { hotelId: hotel.id, nome: `${NOME} Acqua` } })).id;
      if (esborso) {
        const e3 = await errore(() => salvaArticolo(hotel.id, null, { repartoId: esborso.id, nome: `${NOME} Taxi`, prezzo: 20, attivo: true }));
        verifica("Articolo su un reparto di esborsi: rifiutato", !!e3, e3 ?? "");
      }
      mie = await mieCamere(hotel.id, cameriera.id);
      verifica("Il listino del frigobar arriva alla cameriera", mie.frigobar.some((a) => a.id === articoloId));
      await segnaFrigobar(hotel.id, { id: cameriera.id, nome: "Maria" }, camF.id, [{ articoloId: articoloId!, quantita: 2 }]);
      await segnaFrigobar(hotel.id, { id: cameriera.id, nome: "Maria" }, camP.id, [{ articoloId: articoloId!, quantita: 1 }]);
      const aF = await prisma.addebitoConto.findMany({ where: { prenotazioneId: pF.id, buono: "FRIGOBAR" } });
      const aP = await prisma.addebitoConto.findMany({ where: { prenotazioneId: pP.id, buono: "FRIGOBAR" } });
      verifica("Frigobar della camera fermata: 2 × 2,50 € sul conto, reparto Frigobar", aF.length === 1 && aF[0].quantita === 2 && aF[0].repartoId === frigobar.id);
      verifica("Frigobar trovato dopo la partenza: va sul conto di chi è partito oggi", aP.length === 1 && aP[0].quantita === 1);
      const e4 = await errore(() => segnaFrigobar(hotel.id, { id: cameriera.id, nome: "Maria" }, camF.id, [{ articoloId: articoloId!, quantita: 0 }]));
      verifica("Frigobar vuoto: rifiutato", !!e4, e4 ?? "");
    } else {
      console.log("(nessun reparto Frigobar: verifiche del frigobar saltate)");
    }

    await assegnaCamera(hotel.id, camF.id, null);
    mie = await mieCamere(hotel.id, cameriera.id);
    verifica("Tolta l'assegnazione: la camera non è più sua", !mie.camere.some((c) => c.cameraId === camF.id));
  } finally {
    await prisma.assegnazionePulizia.deleteMany({ where: { utenteId: cameriera.id } });
    for (const id of ids) {
      await prisma.addebitoConto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.eventoTassa.deleteMany({ where: { posizione: { prenotazioneId: id } } }).catch(() => undefined);
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
    await prisma.articoloReparto.deleteMany({ where: { hotelId: hotel.id, nome: { startsWith: NOME } } });
    await prisma.utente.delete({ where: { id: cameriera.id } });
    await ripristinaCamere();
    await prisma.hotel.update({ where: { id: hotel.id }, data: impostazioniPrima });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, camere e impostazioni ripristinate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
