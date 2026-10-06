/**
 * Giornale d'albergo del giorno: notti (alloggio con il trattamento), addebiti dei reparti, esborsi,
 * abbuoni e tassa di soggiorno per prenotazione, più i pagamenti ricevuti quel giorno; i totali per
 * colonna sono la chiusura contabile (ricavi per reparto). Solo camere (gli eventi in sala hanno i loro conti).
 */
import { prisma } from "@/lib/prisma";
import { componiGiornale, type AccreditoGiornale, type IntestazioneRiga, type MovimentoGiornale } from "@/lib/giornaleRegole";

export async function giornaleDelGiorno(hotelId: number, giorno: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) throw new Error("Giorno non valido.");
  const data = new Date(`${giorno}T00:00:00.000Z`);
  const [notti, addebiti, pagamenti] = await Promise.all([
    prisma.notteSoggiorno.findMany({
      where: { data, segmento: { stato: { not: "ANNULLATO" }, prenotazione: { hotelId, stato: { not: "ANNULLATA" } } } },
      include: { segmento: { select: { prenotazioneId: true } }, tasse: { select: { importo: true } } },
    }),
    prisma.addebitoConto.findMany({ where: { data, stornatoIl: null, prenotazione: { hotelId } }, include: { reparto: { select: { nome: true } } } }),
    prisma.pagamento.findMany({ where: { hotelId, data, stornatoIl: null, prenotazioneId: { not: null } } }),
  ]);
  const movimenti: MovimentoGiornale[] = [
    ...notti.map((n) => ({ prenotazioneId: n.segmento.prenotazioneId, colonna: "Alloggio", importo: Number(n.prezzo) })),
    ...notti.flatMap((n) => n.tasse.map((t) => ({ prenotazioneId: n.segmento.prenotazioneId, colonna: "Tassa di soggiorno", importo: Number(t.importo) }))),
    ...addebiti.map((a) => ({
      prenotazioneId: a.prenotazioneId,
      colonna: a.tipo === "esborso" ? "Esborsi" : a.tipo === "abbuono" ? "Abbuoni" : (a.reparto?.nome ?? "Altri addebiti"),
      importo: (a.tipo === "abbuono" ? -1 : 1) * Number(a.prezzoUnitario) * a.quantita,
    })),
  ];
  const accrediti: AccreditoGiornale[] = pagamenti.map((p) => ({ prenotazioneId: p.prenotazioneId!, importo: (p.tipo === "rimborso" ? -1 : 1) * Number(p.importo) }));
  const ids = [...new Set([...movimenti.map((m) => m.prenotazioneId), ...accrediti.map((a) => a.prenotazioneId)])];
  const prenotazioni = await prisma.prenotazione.findMany({
    where: { id: { in: ids }, hotelId },
    select: {
      id: true,
      ospitePrenotante: { select: { nome: true, cognome: true } },
      segmenti: { where: { stato: { not: "ANNULLATO" } }, select: { camera: { select: { codice: true } }, tipoCamera: { select: { descrizione: true } } } },
    },
  });
  const intestazioni: IntestazioneRiga[] = prenotazioni.map((p) => ({
    prenotazioneId: p.id,
    camere: [...new Set(p.segmenti.map((s) => s.camera?.codice ?? `(${s.tipoCamera.descrizione})`))].join(", ") || "—",
    ospite: `${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome}`,
  }));
  const hotel = await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { nome: true } });
  return { giorno, hotel: hotel.nome, ...componiGiornale(intestazioni, movimenti, accrediti) };
}
