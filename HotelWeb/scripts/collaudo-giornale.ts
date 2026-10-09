/**
 * Collaudo del giornale d'albergo (main courante): composizione pura (ordine delle colonne, segni,
 * totali, righe con soli pagamenti), e un giorno vero nel 2033 con notte, consumi di un reparto,
 * esborso, abbuono, addebito stornato, pagamento e una prenotazione annullata che non deve comparire.
 * Primo hotel; tutto si cancella alla fine.
 *   npx tsx scripts/collaudo-giornale.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { componiGiornale } from "../src/lib/giornaleRegole";
import { giornaleDelGiorno } from "../src/lib/giornale";
import { registraAddebito, stornaAddebito } from "../src/lib/conto";
import { creaPrenotazioneGenerica, registraPagamento } from "../src/lib/prenotazioni";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};

const COGNOME = "CollaudoGiornale";
const GIORNO = "2033-12-10";

async function main() {
  // Composizione pura.
  const g = componiGiornale(
    [
      { prenotazioneId: 1, camere: "12", ospite: "Rossi Anna" },
      { prenotazioneId: 2, camere: "3", ospite: "Bianchi Luca" },
      { prenotazioneId: 3, camere: "—", ospite: "Verdi Paolo" },
      { prenotazioneId: 4, camere: "5", ospite: "Senza movimenti" },
    ],
    [
      { prenotazioneId: 1, colonna: "Alloggio", importo: 100 },
      { prenotazioneId: 1, colonna: "Bar", importo: 8.5 },
      { prenotazioneId: 1, colonna: "Abbuoni", importo: -10 },
      { prenotazioneId: 2, colonna: "Alloggio", importo: 80 },
      { prenotazioneId: 2, colonna: "Tassa di soggiorno", importo: 2 },
      { prenotazioneId: 2, colonna: "Lavanderia", importo: 12 },
    ],
    [
      { prenotazioneId: 3, importo: 200 },
      { prenotazioneId: 2, importo: 50 },
      { prenotazioneId: 2, importo: -20 },
    ],
  );
  verifica("Colonne: alloggio, reparti in ordine alfabetico, poi abbuoni e tassa (esborsi assenti)", g.colonne.join("|") === "Alloggio|Bar|Lavanderia|Abbuoni|Tassa di soggiorno", g.colonne);
  verifica("Righe in ordine di camera (3 prima di 12), senza quella senza movimenti", g.righe.map((r) => r.camere).join("|") === "3|12|—", g.righe.map((r) => r.camere));
  const r1 = g.righe.find((r) => r.prenotazioneId === 1)!;
  verifica("Abbuono in negativo nel totale della riga", r1.addebiti === 98.5 && r1.importi.Abbuoni === -10);
  verifica("Rimborso che riduce i pagamenti", g.righe.find((r) => r.prenotazioneId === 2)?.accrediti === 30);
  verifica("Prenotazione con soli pagamenti (acconto per il futuro)", g.righe.find((r) => r.prenotazioneId === 3)?.accrediti === 200);
  verifica("Chiusura: totali per colonna e generali", g.totali.Alloggio === 180 && g.totali.Bar === 8.5 && g.totaleAddebiti === 192.5 && g.totaleAccrediti === 230);

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const listino = await prisma.listino.findFirstOrThrow({ where: { hotelId: hotel.id, tipo: "base" } });
  const trattamento = (await prisma.trattamento.findFirstOrThrow({ where: { hotelId: hotel.id, attivo: true } })).nome;
  const tipo = await prisma.tipoCamera.findFirstOrThrow({ where: { hotelId: hotel.id, camere: { some: { attivo: true } } } });
  const reparto = await prisma.repartoAddebito.findFirst({ where: { hotelId: hotel.id, esborso: false, attivo: true } });
  const ids: number[] = [];
  const prenota = async (nome: string) => {
    const p = await creaPrenotazioneGenerica(hotel.id, {
      ospitePrenotante: { nome, cognome: COGNOME },
      listinoId: listino.id,
      trattamento,
      dataInizio: GIORNO,
      dataFine: "2033-12-12",
      richieste: [{ tipoCameraId: tipo.id, quantita: 1, composizione: { adulti: 2, etaBambini: [] } }],
    });
    ids.push(p.id);
    return p;
  };
  const addebito = (prenotazioneId: number, tipoA: "extra" | "esborso" | "abbuono", importo: number, repartoId: number | null, quantita = 1) =>
    registraAddebito(hotel.id, prenotazioneId, { tipo: tipoA, segmentoId: null, repartoId, data: GIORNO, descrizione: "prova", quantita, prezzoUnitario: importo, buono: "", nota: tipoA === "abbuono" ? "prova" : "" }, "Marco");

  try {
    const prima = await giornaleDelGiorno(hotel.id, GIORNO);
    const p = await prenota("Ada");
    const annullata = await prenota("Bea");
    await prisma.prenotazione.update({ where: { id: annullata.id }, data: { stato: "ANNULLATA" } });
    if (reparto) await addebito(p.id, "extra", 5, reparto.id, 2);
    await addebito(p.id, "esborso", 12, null);
    await addebito(p.id, "abbuono", 3, null);
    const sbagliato = await addebito(p.id, "esborso", 99, null);
    await stornaAddebito(hotel.id, sbagliato.id, "sbagliato", "Marco");
    await registraPagamento(hotel.id, p.id, { data: GIORNO, importo: 50, metodo: "contanti", tipo: "acconto", nota: "" }, "Marco");

    // Prezzo della notte fissato (nel 2033 il listino può non avere tariffe): il confronto non è 0 = 0.
    await prisma.notteSoggiorno.updateMany({ where: { segmento: { prenotazioneId: p.id }, data: new Date(`${GIORNO}T00:00:00.000Z`) }, data: { prezzo: 87.5 } });
    const gg = await giornaleDelGiorno(hotel.id, GIORNO);
    const riga = gg.righe.find((r) => r.prenotazioneId === p.id);
    const notte = await prisma.notteSoggiorno.findFirstOrThrow({ where: { segmento: { prenotazioneId: p.id }, data: new Date(`${GIORNO}T00:00:00.000Z`) } });
    verifica("Alloggio = prezzo della notte del giorno (87,50)", riga?.importi.Alloggio === 87.5 && Number(notte.prezzo) === 87.5, { riga: riga?.importi, notte: Number(notte.prezzo) });
    if (reparto) verifica(`Consumi del reparto ${reparto.nome}: 2 x 5`, riga?.importi[reparto.nome] === 10);
    verifica("Esborso 12 (lo stornato da 99 non c'è), abbuono -3", riga?.importi.Esborsi === 12 && riga.importi.Abbuoni === -3, riga?.importi);
    verifica("Pagamento del giorno: 50", riga?.accrediti === 50);
    verifica("Prenotazione annullata: non compare", !gg.righe.some((r) => r.prenotazioneId === annullata.id));
    verifica("Chiusura: il totale addebiti cresce esattamente della riga", Math.abs(gg.totaleAddebiti - prima.totaleAddebiti - riga!.addebiti) < 0.005 && Math.abs(gg.totaleAccrediti - prima.totaleAccrediti - 50) < 0.005);
    verifica("Totali di colonna = somma delle righe", gg.colonne.every((c) => Math.abs(gg.totali[c] - gg.righe.reduce((t, r) => t + r.importi[c], 0)) < 0.005));
    const partenza = await giornaleDelGiorno(hotel.id, "2033-12-12");
    verifica("Giorno della partenza: nessuna notte da addebitare", !partenza.righe.some((r) => r.prenotazioneId === p.id));
  } finally {
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
