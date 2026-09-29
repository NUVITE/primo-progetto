import { prisma } from "@/lib/prisma";

/**
 * Clienti e aziende: committenti di eventi e sale (e in futuro intestatari di fatture).
 * Anagrafica separata dagli ospiti, che sono le persone che dormono in hotel.
 */

export type DatiCliente = {
  tipo: "azienda" | "privato";
  denominazione: string;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  comune: string;
  provincia: string;
  referente: string;
  email: string;
  telefono: string;
  pec: string;
  codiceDestinatario: string;
  note: string;
  attivo: boolean;
};

const txt = (s: string) => (s.trim() ? s.trim() : null);

export async function elencoClienti(hotelId: number) {
  const c = await prisma.cliente.findMany({ where: { hotelId }, orderBy: { denominazione: "asc" }, include: { _count: { select: { prenotazioniSala: true } } } });
  const t = (s: string | null) => s ?? "";
  return c.map((x) => ({
    id: x.id,
    eventi: x._count.prenotazioniSala,
    dati: {
      tipo: x.tipo === "privato" ? "privato" : "azienda",
      denominazione: x.denominazione,
      partitaIva: t(x.partitaIva),
      codiceFiscale: t(x.codiceFiscale),
      indirizzo: t(x.indirizzo),
      cap: t(x.cap),
      comune: t(x.comune),
      provincia: t(x.provincia),
      referente: t(x.referente),
      email: t(x.email),
      telefono: t(x.telefono),
      pec: t(x.pec),
      codiceDestinatario: t(x.codiceDestinatario),
      note: t(x.note),
      attivo: x.attivo,
    } satisfies DatiCliente,
  }));
}

function valori(d: DatiCliente) {
  if (!d.denominazione.trim()) throw new Error(d.tipo === "azienda" ? "Indica la ragione sociale." : "Indica nome e cognome.");
  const partitaIva = txt(d.partitaIva)?.replace(/\s/g, "") ?? null;
  if (partitaIva && !/^\d{11}$/.test(partitaIva)) throw new Error("La partita IVA deve avere 11 cifre.");
  const codiceFiscale = txt(d.codiceFiscale)?.replace(/\s/g, "").toUpperCase() ?? null;
  if (codiceFiscale && !/^([A-Z0-9]{16}|\d{11})$/.test(codiceFiscale)) throw new Error("Il codice fiscale ha 16 caratteri (o 11 cifre per le aziende).");
  const cap = txt(d.cap);
  if (cap && !/^\d{5}$/.test(cap)) throw new Error("Il CAP ha 5 cifre.");
  const provincia = txt(d.provincia)?.toUpperCase() ?? null;
  if (provincia && !/^[A-Z]{2}$/.test(provincia)) throw new Error("La provincia è la sigla di 2 lettere.");
  const codiceDestinatario = txt(d.codiceDestinatario)?.toUpperCase() ?? null;
  if (codiceDestinatario && !/^[A-Z0-9]{7}$/.test(codiceDestinatario)) throw new Error("Il codice destinatario SDI ha 7 caratteri.");
  return {
    tipo: d.tipo === "privato" ? "privato" : "azienda",
    denominazione: d.denominazione.trim(),
    partitaIva,
    codiceFiscale,
    indirizzo: txt(d.indirizzo),
    cap,
    comune: txt(d.comune),
    provincia,
    referente: txt(d.referente),
    email: txt(d.email)?.toLowerCase() ?? null,
    telefono: txt(d.telefono),
    pec: txt(d.pec)?.toLowerCase() ?? null,
    codiceDestinatario,
    note: txt(d.note),
    attivo: d.attivo,
  };
}

/** Restituisce l'id: la prenotazione di sala può creare il cliente al volo e selezionarlo. */
export async function salvaCliente(hotelId: number, id: number | null, d: DatiCliente) {
  const v = valori(d);
  if (v.partitaIva) {
    const doppio = await prisma.cliente.findFirst({ where: { hotelId, partitaIva: v.partitaIva, id: id ? { not: id } : undefined } });
    if (doppio) throw new Error(`Partita IVA già presente: ${doppio.denominazione}.`);
  }
  if (id) {
    await prisma.cliente.update({ where: { id, hotelId }, data: v });
    return id;
  }
  return (await prisma.cliente.create({ data: { ...v, hotelId } })).id;
}

/** Si elimina solo un cliente mai usato; gli altri si disattivano (restano sugli eventi passati). */
export async function eliminaCliente(hotelId: number, id: number) {
  const n = await prisma.prenotazioneSala.count({ where: { clienteId: id, hotelId } });
  if (n) throw new Error(`Il cliente ha ${n} prenotazioni di sala: disattivalo invece di eliminarlo.`);
  await prisma.cliente.delete({ where: { id, hotelId } });
}
