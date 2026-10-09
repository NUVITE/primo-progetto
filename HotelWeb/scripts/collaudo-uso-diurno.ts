/**
 * Collaudo dell'uso diurno (day use): disponibilità rispetto ai soggiorni e agli altri usi diurni,
 * prezzo orario proposto, totale senza notti né tassa, niente check-in, conti aperti e arrivi del
 * giorno. Primo hotel; prenotazioni e prezzi di prova si cancellano/ripristinano alla fine.
 *   npx tsx scripts/collaudo-uso-diurno.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { datiCheckin } from "../src/lib/checkin";
import { contiAperti } from "../src/lib/contiSospesi";
import {
  arriviDelGiorno,
  calcolaTotaliPrenotazione,
  creaPrenotazione,
  creaUsoDiurno,
  prezzoPropostoUsoDiurno,
  registraPagamento,
  trovaPrenotazione,
} from "../src/lib/prenotazioni";
import { adessoItalia, righeElenco } from "../src/app/prenotazioni/righe";

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

const NOME = "CollaudoDayUse";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camere = await prisma.camera.findMany({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const camera = camere[0];
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const tipo = await prisma.tipoCamera.findUniqueOrThrow({ where: { id: camera.tipoCameraId } });
  const prezzoPrima = tipo.prezzoOraUsoDiurno;
  const ids: number[] = [];
  const ospite = { nome: "Relatore", cognome: NOME };
  const du = async (cameraId: number, giorno: string, dalle: string, alle: string, prezzo = 60) => {
    const p = await creaUsoDiurno(hotel.id, { cameraId, giorno, dalle, alle, ospite, prezzo });
    ids.push(p.id);
    return p;
  };

  try {
    await prisma.tipoCamera.update({ where: { id: tipo.id }, data: { prezzoOraUsoDiurno: 12.5 } });
    verifica("Prezzo proposto: 4 ore × 12,50 €", (await prezzoPropostoUsoDiurno(hotel.id, camera.id, "10:00", "14:00")) === 50);
    verifica("Orari al contrario: nessuna proposta", (await prezzoPropostoUsoDiurno(hotel.id, camera.id, "14:00", "10:00")) === null);

    // Soggiorno dal 10 al 12 dicembre 2031 nella stessa camera.
    const s = await creaPrenotazione(hotel.id, {
      ospitePrenotante: ospite,
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-12-10", dataFine: "2031-12-12", composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(s.id);
    const e1 = await errore(() => du(camera.id, "2031-12-11", "10:00", "16:00"));
    verifica("Giorno in mezzo al soggiorno: camera occupata", !!e1, e1 ?? "");
    const p = await du(camera.id, "2031-12-12", "12:00", "18:00", 60);
    verifica("Giorno della partenza (l'ospite lascia la camera la mattina): uso diurno possibile", !!p);
    const e2 = await errore(() => du(camera.id, "2031-12-12", "17:00", "19:00"));
    verifica("Fascia che si sovrappone a un altro uso diurno: rifiutata", !!e2, e2 ?? "");
    await du(camera.id, "2031-12-12", "18:00", "20:00", 20);
    verifica("Fascia successiva, senza sovrapposizione: accettata", true);
    const sera = await creaPrenotazione(hotel.id, {
      ospitePrenotante: ospite,
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-12-12", dataFine: "2031-12-14", composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(sera.id);
    verifica("Nuovo ospite che arriva la sera dello stesso giorno: prenotazione possibile", !!sera);

    const q = await trovaPrenotazione(hotel.id, p.id);
    const t = calcolaTotaliPrenotazione(q);
    verifica("Totale = prezzo dell'uso diurno, senza tassa", t.subtotale === 60 && t.tassa === 0 && t.totale === 60, t);
    verifica("Nessuna notte e nessun ospite registrato", q.segmenti[0].notti.length === 0 && q.segmenti[0].presenze.length === 0);
    verifica("Nasce confermata", q.stato === "CONFERMATA");
    const e3 = await errore(() => datiCheckin(hotel.id, q.segmenti[0].id, true));
    verifica("Niente check-in per l'uso diurno", !!e3, e3 ?? "");

    // Uso diurno di un giorno passato non pagato: è un conto da chiudere; pagato sparisce.
    const passato = await du(camere[1]?.id ?? camera.id, "2026-01-15", "09:00", "13:00", 40);
    let elenco = await contiAperti(hotel.id);
    verifica("Uso diurno passato non pagato: tra i conti da chiudere", elenco.some((r) => r.id === passato.id && r.gruppo === "da_decidere"));
    await registraPagamento(hotel.id, passato.id, { data: "2026-01-15", importo: 40, metodo: "contanti", tipo: "saldo", nota: "" }, "collaudo");
    elenco = await contiAperti(hotel.id);
    verifica("Pagato: sparisce dai conti da chiudere", !elenco.some((r) => r.id === passato.id));

    // Arrivi di oggi: l'uso diurno compare con la fascia oraria, mai come no-show.
    const oggi = adessoItalia().giorno;
    let oggiId: number | null = null;
    for (const c of camere) {
      try {
        oggiId = (await du(c.id, oggi, "08:00", "09:00", 10)).id;
        break;
      } catch {
        /* camera occupata oggi: si prova la successiva */
      }
    }
    if (oggiId) {
      const riga = righeElenco(await arriviDelGiorno(hotel.id, oggi), "00:00").find((r) => r.id === oggiId);
      verifica("Arrivi di oggi: uso diurno con la fascia, non no-show", riga?.arrivoOggi?.usoDiurno === "08:00–09:00" && !riga.arrivoOggi.possibileNoShow, riga?.arrivoOggi);
    } else verifica("Arrivi di oggi: nessuna camera libera per provare", false);
  } finally {
    await prisma.tipoCamera.update({ where: { id: tipo.id }, data: { prezzoOraUsoDiurno: prezzoPrima } });
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
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
