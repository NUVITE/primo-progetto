/**
 * Collaudo della pulizia finale: prezzo per tipo di camera (validazione), servizio aggiunto da solo
 * una volta per camera nelle nuove prenotazioni (dal planning, normale, camera aggiunta dopo), mai
 * nel cambio camera, niente per i tipi senza pulizia, totale della prenotazione che la comprende.
 * Primo hotel, date nel 2033; prezzi dei tipi e prenotazioni di prova tornano come prima.
 *   npx tsx scripts/collaudo-pulizia-finale.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { impostaPuliziaFinale } from "../src/lib/camere";
import { aggiungiSegmentoAPrenotazione, calcolaTotaliPrenotazione, cambiaCameraSegmento, creaPrenotazione, creaPrenotazioneGenerica, trovaPrenotazione } from "../src/lib/prenotazioni";

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
const COGNOME = "CollaudoPulizia";

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  // Un tipo con almeno 2 camere (per il cambio camera) e un altro tipo senza pulizia.
  const tipi = await prisma.tipoCamera.findMany({ where: { hotelId: hotel.id }, include: { camere: { where: { attivo: true }, orderBy: { codice: "asc" } } } });
  const tipo = tipi.find((t) => t.camere.length >= 2);
  const altro = tipi.find((t) => t.id !== tipo?.id && t.camere.length >= 1);
  if (!tipo || !altro) throw new Error("Servono un tipo con 2 camere e un altro tipo.");
  const prima = new Map(tipi.map((t) => [t.id, t.puliziaFinale]));
  const ids: number[] = [];
  const pulizie = async (prenotazioneId: number) =>
    prisma.servizioAggiunto.findMany({ where: { prenotazioneId, descrizione: "Pulizia finale" }, include: { segmenti: true } });

  try {
    verifica("Prezzo negativo: rifiutato", !!(await errore(() => impostaPuliziaFinale(hotel.id, tipo.id, -5))));
    await impostaPuliziaFinale(hotel.id, tipo.id, 40);
    await impostaPuliziaFinale(hotel.id, altro.id, 0);
    verifica("Zero = nessuna pulizia", (await prisma.tipoCamera.findUniqueOrThrow({ where: { id: altro.id } })).puliziaFinale === null);

    // Dal planning: 2 camere del tipo con pulizia.
    const g = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome: "Anna", cognome: COGNOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: "2033-11-01",
      dataFine: "2033-11-04",
      richieste: [{ tipoCameraId: tipo.id, quantita: 2, composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(g.id);
    let pg = await pulizie(g.id);
    verifica("Prenotazione dal planning con 2 camere: 2 pulizie da 40, una per camera", pg.length === 2 && pg.every((x) => Number(x.prezzoUnitario) === 40 && x.quantita === 1 && x.segmenti.length === 1) && new Set(pg.map((x) => x.segmenti[0].segmentoId)).size === 2);
    const tot = calcolaTotaliPrenotazione(await trovaPrenotazione(hotel.id, g.id));
    verifica("Il totale della prenotazione comprende le pulizie", tot.totale >= 80, tot);

    // Camera aggiunta dopo (dell'altro tipo, senza pulizia) e poi una del tipo con pulizia.
    await aggiungiSegmentoAPrenotazione(hotel.id, g.id, { tipoCameraId: altro.id, ospite: { nome: "Bruno", cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: "2033-11-01", dataFine: "2033-11-04" });
    verifica("Camera aggiunta di un tipo senza pulizia: nessuna nuova pulizia", (await pulizie(g.id)).length === 2);
    await aggiungiSegmentoAPrenotazione(hotel.id, g.id, { tipoCameraId: tipo.id, ospite: { nome: "Carla", cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: "2033-11-01", dataFine: "2033-11-04" });
    pg = await pulizie(g.id);
    verifica("Camera aggiunta del tipo con pulizia: una pulizia in più, le altre non si duplicano", pg.length === 3);

    // Prenotazione normale con la camera assegnata, poi cambio camera a metà soggiorno.
    const n = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome: "Dario", cognome: COGNOME },
      segmenti: [{ cameraId: tipo.camere[0].id, tipoCameraId: tipo.id, ospite: { nome: "Dario", cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: "2033-11-10", dataFine: "2033-11-14", composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(n.id);
    verifica("Prenotazione normale: una pulizia", (await pulizie(n.id)).length === 1);
    await cambiaCameraSegmento(hotel.id, n.segmenti[0].id, "2033-11-12", tipo.camere[1].id);
    verifica("Cambio camera a metà soggiorno: nessuna pulizia in più", (await pulizie(n.id)).length === 1 && (await prisma.segmentoSoggiorno.count({ where: { prenotazioneId: n.id } })) === 2);

    // Tipo senza pulizia: niente.
    const s = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome: "Elena", cognome: COGNOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: "2033-11-20",
      dataFine: "2033-11-22",
      richieste: [{ tipoCameraId: altro.id, quantita: 1, composizione: { adulti: 1, etaBambini: [] } }],
    });
    ids.push(s.id);
    verifica("Tipo senza pulizia finale: nessun servizio", (await pulizie(s.id)).length === 0);
  } finally {
    for (const id of ids) {
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id } });
      await prisma.prenotazione.delete({ where: { id } });
    }
    await prisma.ospite.deleteMany({ where: { hotelId: hotel.id, cognome: COGNOME } });
    for (const [id, v] of prima) await prisma.tipoCamera.update({ where: { id }, data: { puliziaFinale: v } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (dati di prova cancellati, prezzi dei tipi ripristinati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
