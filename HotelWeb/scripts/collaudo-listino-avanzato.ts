/**
 * Collaudo delle regole di listino aggiunte con il punto 1 della roadmap: prezzo weekend, supplemento
 * del trattamento per stagione, supplemento per età nei listini a camera (letto aggiunto) e prezzo
 * concordato a mano su una camera. Il motore lavora in una transazione SEMPRE annullata; la parte
 * sul prezzo concordato usa una prenotazione di prova cancellata alla fine.
 *   npx tsx scripts/collaudo-listino-avanzato.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcolaNotte, regoleListino } from "../src/lib/pricing";
import { aggiornaComposizione, calcolaTotaliPrenotazione, creaPrenotazione, impostaPrezzoConcordato, trovaPrenotazione } from "../src/lib/prenotazioni";

class Annulla extends Error {}
let falliti = 0;
function verifica(nome: string, atteso: number, ottenuto: number | null, dettaglio = "") {
  const ok = ottenuto !== null && Math.abs(atteso - ottenuto) < 0.005;
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}: atteso ${atteso.toFixed(2)}, ottenuto ${ottenuto?.toFixed(2)}${dettaglio ? ` — ${dettaglio}` : ""}`);
  if (!ok) falliti += 1;
}
const vero = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
  if (!ok) falliti += 1;
};

async function motore() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id } });
  // 2031-07-11 è venerdì, 2031-07-12 sabato, 2031-07-13 domenica.
  const ven = new Date("2031-07-11");
  const sab = new Date("2031-07-12");
  const dom = new Date("2031-07-13");
  const agosto = new Date("2031-08-15");
  try {
    await prisma.$transaction(
      async (tx) => {
        const mp = await tx.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Mezza pensione" } });
        const cam = await tx.listino.create({ data: { hotelId: hotel.id, codice: "__C_AVZ", descrizione: "collaudo avanzato", tipo: "personalizzato", modalita: "camera" } });
        await tx.periodoTariffario.create({
          data: { listinoId: cam.id, tipoCameraId: tipo.id, dal: new Date("2031-07-01"), al: new Date("2031-08-31"), prezzoNotte: 90, prezzoWeekend: 110 },
        });
        await tx.supplementoTrattamento.create({ data: { listinoId: cam.id, trattamentoId: mp.id, importo: 20 } });
        await tx.supplementoStagionale.create({ data: { listinoId: cam.id, trattamentoId: mp.id, dal: new Date("2031-08-01"), al: new Date("2031-08-31"), importo: 28 } });
        await tx.riduzioneListino.create({ data: { listinoId: cam.id, etaDa: 3, etaA: 11, tipo: "supplemento", valore: 20, dalTerzoLetto: true } });
        const r = await regoleListino(tx, cam.id);
        const due = { adulti: 2, etaBambini: [] };
        const c = async (d: Date, comp: { adulti: number; etaBambini: number[] }, t: string) => {
          const x = await calcolaNotte(tx, r, tipo.id, d, comp, t);
          return x.mancante ? null : x;
        };
        verifica("Domenica: prezzo normale", 90, (await c(dom, due, "B&B"))?.lordo ?? null);
        verifica("Venerdì (predefinito weekend): prezzo weekend", 110, (await c(ven, due, "B&B"))?.lordo ?? null);
        verifica("Sabato: prezzo weekend", 110, (await c(sab, due, "B&B"))?.lordo ?? null);
        verifica("Luglio, mezza pensione 2 adulti: 90 + 2 × 20", 130, (await c(dom, due, "Mezza pensione"))?.lordo ?? null);
        verifica("Agosto (venerdì), mezza pensione di stagione: 110 + 2 × 28", 166, (await c(agosto, due, "Mezza pensione"))?.lordo ?? null);
        const conBimbo = await c(dom, { adulti: 2, etaBambini: [8] }, "B&B");
        verifica("B&B, 2 adulti + bambino 8 anni nel 3° letto: +20", 110, conBimbo?.lordo ?? null, conBimbo?.righe.map((x) => x.voce).join(" | "));
        verifica("Bambino 8 anni in seconda posizione (non 3° letto): niente supplemento", 90, (await c(dom, { adulti: 1, etaBambini: [8] }, "B&B"))?.lordo ?? null);
        verifica("MP con bambino nel 3° letto: 90 + 20 + 20 + (20 + 20)", 170, (await c(dom, { adulti: 2, etaBambini: [8] }, "Mezza pensione"))?.lordo ?? null);
        await tx.listino.update({ where: { id: cam.id }, data: { giorniWeekend: [6] } });
        const r2 = await regoleListino(tx, cam.id);
        const venSolo = await calcolaNotte(tx, r2, tipo.id, ven, due, "B&B");
        verifica("Weekend solo sabato: il venerdì torna normale", 90, venSolo.mancante ? null : venSolo.lordo);
        throw new Annulla();
      },
      { timeout: 60000 },
    );
  } catch (e) {
    if (!(e instanceof Annulla)) throw e;
  }
}

async function concordato() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { codice: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const NOME = "CollaudoConcordato";
  let id: number | null = null;
  try {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Ospite", cognome: NOME },
      segmenti: [
        { cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Ospite", cognome: NOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2031-11-10", dataFine: "2031-11-13", composizione: { adulti: 2, etaBambini: [] } },
      ],
    });
    id = p.id;
    const seg = p.segmenti[0].id;
    let errore: string | null = null;
    try {
      await impostaPrezzoConcordato(hotel.id, seg, 75, "  ", "collaudo");
    } catch (e) {
      errore = (e as Error).message;
    }
    vero("Prezzo concordato senza motivo rifiutato", !!errore, errore ?? "");
    await impostaPrezzoConcordato(hotel.id, seg, 75, "cliente abituale", "collaudo");
    let q = await trovaPrenotazione(hotel.id, p.id);
    verifica("3 notti a 75 € concordati", 225, calcolaTotaliPrenotazione(q).subtotale);
    vero("Notti segnate come concordate", q.segmenti[0].notti.every((n) => n.motivoPrezzo === "concordato"));
    await aggiornaComposizione(hotel.id, seg, { adulti: 3, etaBambini: [] }, true);
    q = await trovaPrenotazione(hotel.id, p.id);
    verifica("Il ricalcolo per composizione non tocca il concordato", 225, calcolaTotaliPrenotazione(q).subtotale);
    await impostaPrezzoConcordato(hotel.id, seg, null, "", "collaudo");
    q = await trovaPrenotazione(hotel.id, p.id);
    vero("Tornato al listino", q.segmenti[0].prezzoConcordato === null && q.segmenti[0].notti.every((n) => n.motivoPrezzo !== "concordato"));
  } finally {
    if (id) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: NOME } });
  }
}

async function main() {
  await motore();
  await concordato();
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova annullati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
