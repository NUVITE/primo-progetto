import { prisma } from "@/lib/prisma";
import { calcolaTotaliPrenotazione, trovaPrenotazione } from "@/lib/prenotazioni";

/**
 * Conti aperti e sospesi. Un soggiorno si chiude con l'incasso o diventa un conto SOSPESO esplicito
 * (a carico dell'ospite o di un cliente: azienda, agenzia), mai con un "da pagare" dimenticato:
 * - "da decidere": tutti partiti, saldo da pagare, nessuna decisione presa;
 * - "sospesi": lasciati in sospeso con nota (e sollecito);
 * - "penali": prenotazioni annullate con penale non ancora incassata.
 * Il sospeso si chiude da solo quando il saldo arriva a zero (pagamento registrato dopo).
 */

type Prenotazione = Awaited<ReturnType<typeof trovaPrenotazione>>;
const arrotonda = (n: number) => Math.round(n * 100) / 100;

/** Tutte le persone delle camere non annullate sono partite (e almeno una è passata dal check-in). */
export function tuttiPartiti(p: Pick<Prenotazione, "segmenti">) {
  const presenze = p.segmenti.filter((s) => s.stato !== "ANNULLATO").flatMap((s) => s.presenze);
  return presenze.length > 0 && presenze.every((x) => x.stato === "partito");
}

/** Situazione del conto di una prenotazione (per il dettaglio e per il check-out). */
export function statoConto(p: Prenotazione) {
  const t = calcolaTotaliPrenotazione(p);
  const daPagare = arrotonda(t.daPagare);
  const chiuso = p.stato === "ANNULLATA" || tuttiPartiti(p);
  return {
    daPagare,
    // Conto da chiudere: partiti (o annullata con penale) e ancora qualcosa da pagare.
    aperto: chiuso && daPagare > 0.005,
    sospeso: p.sospesoIl
      ? {
          il: p.sospesoIl.toISOString(),
          da: p.sospesoDa ?? "",
          aCarico: p.sospesoCliente?.denominazione ?? null,
          nota: p.sospesoNota ?? "",
          sollecitoIl: p.sollecitoIl?.toISOString().slice(0, 10) ?? null,
        }
      : null,
  };
}

/** Lascia il conto in sospeso, a carico dell'ospite (clienteId null) o di un cliente dell'hotel. */
export async function sospendiConto(hotelId: number, id: number, d: { clienteId: number | null; nota: string }, utente: string) {
  const nota = d.nota.trim();
  if (!nota) throw new Error("Scrivi una nota: perché resta in sospeso e come verrà pagato.");
  const p = await trovaPrenotazione(hotelId, id);
  const s = statoConto(p);
  if (!s.aperto) throw new Error("Non c'è niente da lasciare in sospeso: il conto è pagato o il soggiorno non è finito.");
  if (d.clienteId) await prisma.cliente.findFirstOrThrow({ where: { id: d.clienteId, hotelId } });
  await prisma.prenotazione.update({
    where: { id },
    data: { sospesoIl: new Date(), sospesoDa: utente, sospesoClienteId: d.clienteId, sospesoNota: nota, sollecitoIl: null },
  });
  return trovaPrenotazione(hotelId, id);
}

export async function togliSospeso(hotelId: number, id: number) {
  await prisma.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
  await prisma.prenotazione.update({ where: { id }, data: { sospesoIl: null, sospesoDa: null, sospesoClienteId: null, sospesoNota: null, sollecitoIl: null } });
  return trovaPrenotazione(hotelId, id);
}

export async function registraSollecito(hotelId: number, id: number, giorno: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(giorno)) throw new Error("Data del sollecito non valida.");
  const p = await prisma.prenotazione.findFirstOrThrow({ where: { id, hotelId } });
  if (!p.sospesoIl) throw new Error("Il conto non è in sospeso.");
  await prisma.prenotazione.update({ where: { id }, data: { sollecitoIl: new Date(`${giorno}T00:00:00.000Z`) } });
}

/** Elenco per la pagina Conti aperti e sospesi (soggiorni finiti negli ultimi 18 mesi). */
export async function contiAperti(hotelId: number) {
  const da = new Date(Date.now() - 550 * 24 * 60 * 60 * 1000);
  const candidati = await prisma.prenotazione.findMany({
    where: {
      hotelId,
      OR: [
        { stato: "ANNULLATA", penale: { not: null } },
        {
          stato: { not: "ANNULLATA" },
          segmenti: {
            some: { stato: { not: "ANNULLATO" }, dataFine: { gte: da }, presenze: { some: { stato: "partito" } } },
            none: { stato: { not: "ANNULLATO" }, presenze: { some: { stato: { not: "partito" } } } },
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { id: "desc" },
  });
  const righe = [];
  for (const { id } of candidati) {
    const p = await trovaPrenotazione(hotelId, id);
    const s = statoConto(p);
    if (!s.aperto) continue;
    const attivi = p.segmenti.filter((x) => x.stato !== "ANNULLATO");
    righe.push({
      id: p.id,
      gruppo: p.stato === "ANNULLATA" ? ("penali" as const) : s.sospeso ? ("sospesi" as const) : ("da_decidere" as const),
      cliente: `${p.ospitePrenotante.cognome} ${p.ospitePrenotante.nome}`.trim(),
      pagante: p.clientePagante?.denominazione ?? null,
      tramite: p.intermediario?.denominazione ?? null,
      partenza: (attivi.length ? attivi : p.segmenti).map((x) => x.dataFine.toISOString().slice(0, 10)).sort().pop() ?? null,
      daPagare: s.daPagare,
      sospeso: s.sospeso,
      motivoAnnullamento: p.motivoAnnullamento,
    });
  }
  return righe;
}
