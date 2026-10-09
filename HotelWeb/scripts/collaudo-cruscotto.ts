/**
 * Collaudo del cruscotto del giorno: arrivi (i cambi camera non contano), partenze, occupazione di
 * stanotte, opzioni in scadenza, acconti non arrivati e riquadri nascosti a chi non ha il permesso.
 * Lavora sul primo hotel con prenotazioni di prova su camere libere intorno a oggi e confronta i
 * numeri prima e dopo; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-cruscotto.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { UtenteSessione } from "../src/lib/auth";
import { PERMESSI, TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { cruscotto } from "../src/lib/cruscotto";
import { cambiaCameraSegmento, creaPrenotazione } from "../src/lib/prenotazioni";
import { oggiItaliano } from "../src/lib/cassaAperta";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
const COGNOME = "CollaudoCruscotto";
const giorno = (delta: number) => {
  const d = new Date(`${oggiItaliano()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

async function main() {
  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  // Camere libere da ieri a dopodomani (prenotazioni e fuori servizio).
  const da = new Date(`${giorno(-1)}T00:00:00Z`);
  const a = new Date(`${giorno(3)}T00:00:00Z`);
  const camere = await prisma.camera.findMany({
    where: {
      hotelId: hotel.id,
      attivo: true,
      segmenti: { none: { stato: { not: "ANNULLATO" }, prenotazione: { stato: { not: "ANNULLATA" } }, dataInizio: { lt: a }, dataFine: { gt: da } } },
      indisponibilita: { none: { dal: { lt: a }, al: { gt: da } } },
    },
    orderBy: { codice: "asc" },
  });
  if (camere.length < 4) {
    console.log("NOTA servono 4 camere libere intorno a oggi nel primo hotel: collaudo non eseguibile adesso.");
    process.exit(0);
  }
  const chi = (permessi: string[]): UtenteSessione => ({
    id: 0, nome: "Collaudo", email: "x", superAdmin: false, hotelId: hotel.id, hotelNome: hotel.nome, hotels: [], ruoloNome: "x",
    permessi: permessi as UtenteSessione["permessi"], moduli: ["pulizie"], tipologia: "albergo", funzioniSpente: [],
  });
  const tutto = chi(TUTTI_I_PERMESSI);
  const ids: number[] = [];
  const prenota = async (nome: string, camera: (typeof camere)[number], dal: string, al: string, adulti = 2) => {
    const p = await creaPrenotazione(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      segmenti: [{ cameraId: camera.id, tipoCameraId: camera.tipoCameraId, ospite: { nome, cognome: COGNOME }, trattamento, listinoId: listino.id, dataInizio: dal, dataFine: al, composizione: { adulti, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };

  try {
    const prima = await cruscotto(tutto);
    const [c1, c2, c3, c4] = camere;
    // Arriva oggi (2 persone), già arrivata (3 persone), parte oggi, in casa con cambio camera oggi.
    await prenota("Anna", c1, giorno(0), giorno(2));
    const b = await prenota("Bruno", c2, giorno(0), giorno(1), 3);
    await prisma.segmentoSoggiorno.update({ where: { id: b.segmenti[0].id }, data: { stato: "IN_CORSO" } });
    const p = await prenota("Carla", c3, giorno(-1), giorno(0));
    await prisma.segmentoSoggiorno.update({ where: { id: p.segmenti[0].id }, data: { stato: "IN_CORSO" } });
    const d = await prenota("Dario", c4, giorno(-1), giorno(2), 1);
    await prisma.segmentoSoggiorno.update({ where: { id: d.segmenti[0].id }, data: { stato: "IN_CORSO" } });
    await cambiaCameraSegmento(hotel.id, d.segmenti[0].id, giorno(0), c3.id);

    const dopo = await cruscotto(tutto);
    const r0 = prima.ricevimento!;
    const r1 = dopo.ricevimento!;
    verifica(
      "Arrivi: 2 camere in più (5 persone, 1 già arrivata); il cambio camera non è un arrivo",
      r1.arrivi.camere - r0.arrivi.camere === 2 && r1.arrivi.persone - r0.arrivi.persone === 5 && r1.arrivi.arrivate - r0.arrivi.arrivate === 1,
      { prima: r0.arrivi, dopo: r1.arrivi },
    );
    verifica("Partenze: 1 in più; la camera lasciata per il cambio non è una partenza", r1.partenze.camere - r0.partenze.camere === 1, { prima: r0.partenze, dopo: r1.partenze });
    verifica(
      "Stanotte: 3 camere in più (Anna, Bruno, Dario nella nuova camera), 6 persone",
      r1.stanotte.camere - r0.stanotte.camere === 3 && r1.stanotte.persone - r0.stanotte.persone === 6 && r1.stanotte.disponibili === r0.stanotte.disponibili,
      { prima: r0.stanotte, dopo: r1.stanotte },
    );
    verifica("Percentuale di occupazione coerente", r1.stanotte.percentuale === Math.round((r1.stanotte.camere / r1.stanotte.disponibili) * 100));

    // Opzione in scadenza e acconto non arrivato.
    const o = await prenota("Elena", c1, giorno(2), giorno(3));
    await prisma.prenotazione.update({ where: { id: o.id }, data: { stato: "OPZIONE", scadenzaOpzione: new Date(`${giorno(1)}T00:00:00Z`), accontoRichiesto: 100, accontoEntro: new Date(`${giorno(-1)}T00:00:00Z`) } });
    await prisma.pagamento.create({ data: { hotelId: hotel.id, prenotazioneId: o.id, data: new Date(`${giorno(-1)}T00:00:00Z`), importo: 40, metodo: "bonifico", tipo: "acconto", registratoDa: "Collaudo" } });
    let c = await cruscotto(tutto);
    verifica("Opzione che scade domani: una in più", c.opzioni! - prima.opzioni! === 1, [prima.opzioni, c.opzioni]);
    verifica("Acconto scaduto pagato a metà: uno in più", c.acconti! - prima.acconti! === 1, [prima.acconti, c.acconti]);
    await prisma.pagamento.create({ data: { hotelId: hotel.id, prenotazioneId: o.id, data: new Date(`${giorno(0)}T00:00:00Z`), importo: 60, metodo: "bonifico", tipo: "acconto", registratoDa: "Collaudo" } });
    c = await cruscotto(tutto);
    verifica("Acconto completato: non conta più", c.acconti === prima.acconti);

    // Permessi: solo vedere le prenotazioni.
    const solo = await cruscotto(chi([PERMESSI.PRENOTAZIONI_VEDI]));
    verifica(
      "Solo «vedere prenotazioni»: arrivi e occupazione sì; opzioni, acconti, conti, cassa, pulizie e adempimenti no",
      !!solo.ricevimento && solo.opzioni === null && solo.acconti === null && solo.conti === null && solo.cassa === null && solo.pulizie === null && !solo.adempimenti,
    );
    const senzaImporti = await cruscotto(chi(TUTTI_I_PERMESSI.filter((x) => x !== PERMESSI.IMPORTI_VEDI)));
    verifica("Senza «vedere importi» gli incassi non escono", senzaImporti.cassa === null && tutto.permessi.includes(PERMESSI.IMPORTI_VEDI));
    const pulizie = await cruscotto({ ...tutto, moduli: [] });
    verifica("Senza il modulo pulizie niente riquadro delle pulizie", pulizie.pulizie === null && !!c.pulizie);
  } finally {
    for (const id of ids) {
      await prisma.pagamento.deleteMany({ where: { prenotazioneId: id } });
      await prisma.servizioAggiuntoSegmento.deleteMany({ where: { servizioAggiunto: { prenotazioneId: id } } });
      await prisma.servizioAggiunto.deleteMany({ where: { prenotazioneId: id } });
      await prisma.tassaNotte.deleteMany({ where: { notte: { segmento: { prenotazioneId: id } } } });
      await prisma.notteSoggiorno.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.presenza.deleteMany({ where: { segmento: { prenotazioneId: id } } });
      await prisma.posizioneTassa.deleteMany({ where: { prenotazioneId: id } });
      // Prima i segmenti successivi (cambio camera), poi i precedenti.
      await prisma.segmentoSoggiorno.deleteMany({ where: { prenotazioneId: id, segmentoPrecedenteId: { not: null } } });
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
