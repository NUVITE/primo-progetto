/**
 * Collaudo della tassa stimata per le persone prenotate non ancora registrate: regole pure (chi
 * manca rispetto alle persone prenotate), stima in compilazione uguale al totale dopo il
 * salvataggio, aggiornamento man mano che si registrano le persone (bambino esente, ragazzo non
 * esente), nessuna stima a soggiorno concluso, riga stimata nel conto con il totale coerente.
 * Primo hotel (Trani: minori di 16 anni esenti), prenotazioni nel 2034, tutto cancellato alla fine.
 *   npx tsx scripts/collaudo-stima-tassa.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { personeMancanti } from "../src/lib/stimaTassaRegole";
import { calcolaTotaliPrenotazione, creaPrenotazione, trovaPrenotazione } from "../src/lib/prenotazioni";
import { ricalcolaTassaPosizione, stimaTassaPersona } from "../src/lib/tassaSoggiorno";
import { contoPrenotazione } from "../src/lib/conto";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
const COGNOME = "CollaudoStimaTassa";
const uguali = (a: unknown[], b: unknown[]) => JSON.stringify(a) === JSON.stringify(b);

async function main() {
  // ---- Regole pure ----
  verifica("Nessuno registrato: mancano tutti", uguali(personeMancanti({ adulti: 2, etaBambini: [5] }, []), [null, null, 5]));
  verifica("Intestatario senza data di nascita: conta come adulto", uguali(personeMancanti({ adulti: 2, etaBambini: [5] }, [null]), [null, 5]));
  verifica("Minore registrato: prende il posto del bambino con l'età più vicina", uguali(personeMancanti({ adulti: 2, etaBambini: [3, 12] }, [11]), [null, null, 3]));
  verifica("Minore registrato senza bambini prenotati: prende il posto di un adulto", uguali(personeMancanti({ adulti: 2, etaBambini: [] }, [15]), [null]));
  verifica("Adulti oltre quelli prenotati: prendono il posto del bambino più grande", uguali(personeMancanti({ adulti: 1, etaBambini: [4, 9] }, [40, 41]), [4]));
  verifica("Più registrati che prenotati: non manca nessuno", personeMancanti({ adulti: 1, etaBambini: [] }, [30, 32, 7]).length === 0);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" }, include: { comune: true } });
  const camera = await prisma.camera.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true }, orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id }, orderBy: { id: "asc" } });
  const ids: number[] = [];
  try {
    const dal = new Date("2034-03-10");
    const notti = [new Date("2034-03-10"), new Date("2034-03-11"), new Date("2034-03-12")];
    const adulto = (await stimaTassaPersona(prisma, hotel, notti)).importo;
    const bimbo5 = (await stimaTassaPersona(prisma, hotel, notti, 5)).importo;
    const ragazzo17 = (await stimaTassaPersona(prisma, hotel, notti, 17)).importo;
    verifica("Stima per persona: adulto tassato, bambino di 5 anni esente, ragazzo di 17 tassato", adulto > 0 && bimbo5 === 0 && ragazzo17 === adulto, { adulto, bimbo5, ragazzo17 });

    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Anna", cognome: COGNOME },
      segmenti: [
        { cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome: "Anna", cognome: COGNOME }, trattamento: "B&B", listinoId: listino.id, dataInizio: "2034-03-10", dataFine: "2034-03-13", composizione: { adulti: 2, etaBambini: [5] } },
      ],
    });
    ids.push(p.id);
    const atteso = Math.round(2 * adulto * 100) / 100;
    let t = calcolaTotaliPrenotazione(p);
    verifica("Appena salvata: tassa = stima di 2 adulti (bambino esente), come in compilazione", t.tassa === atteso && t.personeStimate === 2, { tassa: t.tassa, atteso, stimata: t.tassaStimata, persone: t.personeStimate });
    verifica("Appena salvata: una parte è calcolata (intestatario), il resto stimato", t.tassaStimata > 0 && t.tassaStimata < t.tassa, t);

    const seg = p.segmenti[0];
    const intestatario = seg.presenze[0].ospiteId;
    const ricarica = async () => calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, p.id));

    // L'intestatario dichiara la data di nascita (adulto): nulla cambia.
    await prisma.ospite.update({ where: { id: intestatario }, data: { dataNascita: new Date("1980-05-01") } });
    await ricalcolaTassaPosizione(prisma, p.id, intestatario);
    t = await ricarica();
    verifica("Intestatario adulto registrato: totale invariato", t.tassa === atteso, t);

    // Secondo adulto registrato: la stima resta solo per il bambino (esente, quindi 0).
    const secondo = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Marco", cognome: COGNOME, dataNascita: new Date("1982-02-02") } });
    await prisma.presenza.create({ data: { segmentoId: seg.id, ospiteId: secondo.id } });
    await ricalcolaTassaPosizione(prisma, p.id, secondo.id);
    t = await ricarica();
    verifica("Secondo adulto registrato: totale invariato, manca solo il bambino", t.tassa === atteso && t.personeStimate === 1 && t.tassaStimata === 0, t);

    // Il "bambino" registrato ha in realtà 17 anni: non è esente, la tassa sale.
    const figlio = await prisma.ospite.create({ data: { hotelId: hotel.id, nome: "Luca", cognome: COGNOME, dataNascita: new Date("2016-06-01") } });
    const presenzaFiglio = await prisma.presenza.create({ data: { segmentoId: seg.id, ospiteId: figlio.id } });
    await ricalcolaTassaPosizione(prisma, p.id, figlio.id);
    t = await ricarica();
    verifica("Ragazzo di 17 anni registrato: tassa per 3 persone, niente più stima", t.tassa === Math.round(3 * adulto * 100) / 100 && t.personeStimate === 0, t);

    // Al suo posto un bambino di 5 anni: esente, si torna al totale iniziale.
    await prisma.ospite.update({ where: { id: figlio.id }, data: { dataNascita: new Date("2029-01-15") } });
    await ricalcolaTassaPosizione(prisma, p.id, figlio.id);
    t = await ricarica();
    verifica("Bambino di 5 anni registrato: esente, totale come la stima iniziale", t.tassa === atteso && t.tassaStimata === 0, t);

    // Conto: con una persona mancante compare la riga stimata e i totali coincidono.
    await prisma.tassaNotte.deleteMany({ where: { presenzaId: presenzaFiglio.id } });
    await prisma.presenza.delete({ where: { id: presenzaFiglio.id } });
    await prisma.segmentoSoggiorno.update({ where: { id: seg.id }, data: { adulti: 3, etaBambini: [] } });
    const c = await contoPrenotazione(hotel.id, p.id);
    const rigaStimata = c.righe.find((r) => r.chiave === "tassa-stimata");
    verifica("Conto: riga dell'imposta stimata per la persona mancante", !!rigaStimata && rigaStimata.importo === adulto && /1 persona non ancora registrata/.test(rigaStimata.descrizione), rigaStimata);
    verifica("Conto: totale delle righe uguale al totale della prenotazione", c.totale === c.totalePrenotazione, { conto: c.totale, prenotazione: c.totalePrenotazione });

    // Soggiorno concluso: chi non si è registrato non c'era, niente stima.
    await prisma.segmentoSoggiorno.update({ where: { id: seg.id }, data: { stato: "CONCLUSO" } });
    t = await ricarica();
    verifica("Soggiorno concluso: nessuna stima", t.tassaStimata === 0 && t.personeStimate === 0, t);
  } finally {
    for (const id of ids) {
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati)");
  process.exit(falliti ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
