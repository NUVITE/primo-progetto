/**
 * Collaudo del motore prezzi (listino a camera / a persona, singola, trattamenti, riduzioni per
 * età, 3° letto, gratuità di gruppo). Lavora dentro una transazione SEMPRE annullata.
 *   npx tsx scripts/collaudo-listino.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { calcolaNotte, regoleListino, ricalcolaGratuita, type Composizione } from "../src/lib/pricing";

class Annulla extends Error {}
let falliti = 0;
function verifica(nome: string, atteso: number, ottenuto: number | null, dettaglio = "") {
  const ok = ottenuto !== null && Math.abs(atteso - ottenuto) < 0.005;
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}: atteso ${atteso.toFixed(2)}, ottenuto ${ottenuto?.toFixed(2)}${dettaglio ? ` — ${dettaglio}` : ""}`);
  if (!ok) falliti += 1;
}

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id } });
  const notte = new Date("2031-07-10");
  try {
    await prisma.$transaction(
      async (tx) => {
        const mp = await tx.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, nome: "Mezza pensione" } });
        const periodo = (listinoId: number, prezzo: number) =>
          tx.periodoTariffario.create({ data: { listinoId, tipoCameraId: tipo.id, dal: new Date("2031-07-01"), al: new Date("2031-07-31"), prezzoNotte: prezzo } });

        // Listino a persona: 50 €, MP +20, singola +15, riduzioni.
        const pers = await tx.listino.create({
          data: { hotelId: hotel.id, codice: "__C_PERS", descrizione: "collaudo persona", tipo: "personalizzato", modalita: "persona", supplementoSingola: 15 },
        });
        await periodo(pers.id, 50);
        await tx.supplementoTrattamento.create({ data: { listinoId: pers.id, trattamentoId: mp.id, importo: 20 } });
        await tx.riduzioneListino.createMany({
          data: [
            { listinoId: pers.id, etaDa: 0, etaA: 2, tipo: "gratis" },
            { listinoId: pers.id, etaDa: 3, etaA: 11, tipo: "percentuale", valore: 50, dalTerzoLetto: true },
            { listinoId: pers.id, etaDa: 3, etaA: 11, tipo: "percentuale", valore: 20 },
            { listinoId: pers.id, etaDa: 18, etaA: null, tipo: "percentuale", valore: 10, dalTerzoLetto: true },
          ],
        });
        const rp = await regoleListino(tx, pers.id);
        const prezzo = async (c: Composizione, t = "B&B", r = rp) => {
          const x = await calcolaNotte(tx, r, tipo.id, notte, c, t);
          return x.mancante ? null : x.lordo;
        };
        verifica("2 adulti B&B", 100, await prezzo({ adulti: 2, etaBambini: [] }));
        verifica("2 adulti mezza pensione", 140, await prezzo({ adulti: 2, etaBambini: [] }, "Mezza pensione"));
        verifica("Doppia uso singola (+15)", 65, await prezzo({ adulti: 1, etaBambini: [] }));
        verifica("2 adulti + bambino 8 anni 3° letto MP (-50%)", 175, await prezzo({ adulti: 2, etaBambini: [8] }, "Mezza pensione"));
        verifica("1 adulto + bambino 8 anni MP (-20%, non 3° letto)", 126, await prezzo({ adulti: 1, etaBambini: [8] }, "Mezza pensione"));
        verifica("2 adulti + neonato 1 anno (gratis)", 100, await prezzo({ adulti: 2, etaBambini: [1] }));
        verifica("3 adulti (3° letto adulto -10%)", 145, await prezzo({ adulti: 3, etaBambini: [] }));
        verifica("Bambino 14 anni senza regola: prezzo pieno", 150, await prezzo({ adulti: 2, etaBambini: [14] }));
        const fuori = await calcolaNotte(tx, rp, tipo.id, new Date("2031-09-01"), { adulti: 2, etaBambini: [] }, "B&B");
        verifica("Notte fuori periodo = mancante", 1, fuori.mancante ? 1 : 0);

        // Listino a camera: 80 € camera, MP +20 a persona, bambino 3° letto -50% sul supplemento.
        const cam = await tx.listino.create({ data: { hotelId: hotel.id, codice: "__C_CAM", descrizione: "collaudo camera", tipo: "personalizzato" } });
        await periodo(cam.id, 80);
        await tx.supplementoTrattamento.create({ data: { listinoId: cam.id, trattamentoId: mp.id, importo: 20 } });
        await tx.riduzioneListino.create({ data: { listinoId: cam.id, etaDa: 3, etaA: 11, tipo: "percentuale", valore: 50, dalTerzoLetto: true } });
        const rc = await regoleListino(tx, cam.id);
        verifica("Camera B&B (composizione indifferente)", 80, await prezzo({ adulti: 3, etaBambini: [] }, "B&B", rc));
        verifica("Camera MP 2 adulti + bambino 5 anni", 130, await prezzo({ adulti: 2, etaBambini: [5] }, "Mezza pensione", rc));

        // Gruppo: 40 € a persona, 1 gratuito ogni 10 paganti. 11 persone in 6 camere.
        const gr = await tx.listino.create({
          data: { hotelId: hotel.id, codice: "__C_GRP", descrizione: "collaudo gruppo", tipo: "gruppo", modalita: "persona", categoria: "Scout", gratuitaOgni: 10 },
        });
        await periodo(gr.id, 40);
        const rg = await regoleListino(tx, gr.id);
        const ospite = await tx.ospite.create({ data: { hotelId: hotel.id, nome: "Collaudo", cognome: "Gruppo" } });
        const pren = await tx.prenotazione.create({ data: { hotelId: hotel.id, ospitePrenotanteId: ospite.id } });
        for (const adulti of [2, 2, 2, 2, 2, 1]) {
          const seg = await tx.segmentoSoggiorno.create({
            data: { prenotazioneId: pren.id, tipoCameraId: tipo.id, ospiteId: ospite.id, trattamento: "B&B", listinoId: gr.id, dataInizio: notte, dataFine: new Date("2031-07-11"), adulti },
          });
          const c = await calcolaNotte(tx, rg, tipo.id, notte, { adulti, etaBambini: [] }, "B&B");
          if (c.mancante) throw new Error("tariffa gruppo mancante");
          await tx.notteSoggiorno.create({
            data: { segmentoId: seg.id, data: notte, prezzo: c.lordo, motivoPrezzo: "gruppo", dettaglio: { righe: c.righe, lordo: c.lordo, quote: c.quote, gratuita: 0 } },
          });
        }
        await ricalcolaGratuita(tx, pren.id);
        const tot = await tx.notteSoggiorno.aggregate({ where: { segmento: { prenotazioneId: pren.id } }, _sum: { prezzo: true } });
        verifica("Gruppo 11 persone, 1 gratuito ogni 10", 400, Number(tot._sum.prezzo));

        throw new Annulla();
      },
      { timeout: 60000 },
    );
  } catch (e) {
    if (!(e instanceof Annulla)) throw e;
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (transazione annullata)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main();
