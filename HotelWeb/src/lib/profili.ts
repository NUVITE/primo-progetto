/**
 * Profilo di partenza della tipologia: anteprima di cosa cambierebbe e applicazione (dal fornitore,
 * e in automatico quando nasce una struttura nuova). Niente si cancella: moduli e trattamenti si
 * accendono o spengono, il titolare unico si imposta solo se nell'hotel c'è al massimo un utente.
 */
import { prisma } from "@/lib/prisma";
import { moduliAttivi } from "@/lib/moduli";
import { tipologiaValida } from "@/lib/tipologie";
import { PROFILI, TRATTAMENTI_PROFILO, differenzeProfilo, type StatoStruttura } from "@/lib/profiliRegole";
import { funzioniSpente } from "@/lib/funzioniRegole";

async function statoStruttura(hotelId: number): Promise<StatoStruttura & { tipologia: string }> {
  const [hotel, utenti, trattamenti] = await Promise.all([
    prisma.hotel.findUniqueOrThrow({ where: { id: hotelId }, select: { tipologia: true, modalitaUtenti: true, moduli: true, funzioniSpente: true } }),
    prisma.utenteHotel.count({ where: { hotelId, utente: { superAdmin: false } } }),
    prisma.trattamento.findMany({ where: { hotelId, attivo: true }, select: { nome: true } }),
  ]);
  return { tipologia: hotel.tipologia, modalitaUtenti: hotel.modalitaUtenti, moduli: moduliAttivi(hotel.moduli), utenti, trattamentiAttivi: trattamenti.map((t) => t.nome), funzioniSpente: funzioniSpente(hotel.funzioniSpente) };
}

/** Cosa cambierebbe applicando il profilo della tipologia (quella indicata o quella dell'hotel). */
export async function anteprimaProfilo(hotelId: number, tipologia?: string) {
  const stato = await statoStruttura(hotelId);
  const t = tipologiaValida(tipologia ?? stato.tipologia);
  return { tipologia: t, profilo: PROFILI[t], stato, differenze: differenzeProfilo(stato, PROFILI[t]) };
}

export async function applicaProfilo(hotelId: number, tipologia?: string) {
  const { tipologia: t, profilo, stato, differenze } = await anteprimaProfilo(hotelId, tipologia);
  await prisma.$transaction(async (tx) => {
    const gestiti = new Set([...differenze.moduliDaAccendere, ...differenze.moduliDaSpegnere]);
    const moduli = [...stato.moduli.filter((m) => !gestiti.has(m)), ...differenze.moduliDaAccendere];
    const titolare = differenze.modalita === "titolare";
    // Titolare unico: i ruoli aggiuntivi non servono più (come nella pagina Utenti).
    if (titolare) await tx.ruoloAggiuntivo.deleteMany({ where: { hotelId } });
    await tx.hotel.update({ where: { id: hotelId }, data: { tipologia: t, moduli, funzioniSpente: profilo.funzioniSpente, ...(differenze.modalita ? { modalitaUtenti: differenze.modalita } : {}) } });
    const esistenti = await tx.trattamento.findMany({ where: { hotelId } });
    let ordine = Math.max(0, ...esistenti.map((x) => x.ordine));
    for (const nome of profilo.trattamenti) {
      const c = esistenti.find((x) => x.nome === nome);
      if (c) await tx.trattamento.update({ where: { id: c.id }, data: { attivo: true } });
      else await tx.trattamento.create({ data: { hotelId, ...TRATTAMENTI_PROFILO[nome], ordine: ++ordine } });
    }
    await tx.trattamento.updateMany({ where: { hotelId, nome: { notIn: profilo.trattamenti } }, data: { attivo: false } });
  });
  return differenze;
}
