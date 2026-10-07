import { prisma } from "@/lib/prisma";
import { RUOLI_PREDEFINITI } from "@/lib/permessi";
import { REPARTI_PREDEFINITI } from "@/lib/conto";
import { TRATTAMENTI_PREDEFINITI } from "@/lib/impostazioniHotel";
import { CATALOGO_MODULI, moduliAttivi, type Modulo } from "@/lib/moduli";
import { sistemaIstatValido } from "@/lib/istat";
import { FASCE_PREDEFINITE } from "@/lib/sale";
import { tipologiaValida } from "@/lib/tipologie";
import { applicaProfilo } from "@/lib/profili";
import { avvio } from "@/lib/avvio";
import { funzioniSpente } from "@/lib/funzioniRegole";

/**
 * Gestione degli hotel dalla sezione Piattaforma (solo superadmin: il controllo è nelle action).
 */
export type DatiHotel = {
  nome: string;
  comuneId: number;
  tipologia: string;
  categoria: string;
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale: string;
  indirizzo: string;
  cap: string;
  telefono: string;
  email: string;
  pec: string;
  sistemaIstat: string;
};

/** Stringhe vuote -> null, spazi tolti: nel database niente campi "vuoti ma non null". */
function normalizza(d: DatiHotel) {
  const v = (s: string) => (s.trim() ? s.trim() : null);
  if (!d.nome.trim()) throw new Error("Il nome dell'hotel è obbligatorio.");
  if (!d.comuneId) throw new Error("Scegli il comune dell'hotel.");
  const partitaIva = v(d.partitaIva)?.replace(/\s/g, "") ?? null;
  if (partitaIva && !/^\d{11}$/.test(partitaIva)) throw new Error("La partita IVA deve avere 11 cifre.");
  return {
    nome: d.nome.trim(),
    comuneId: d.comuneId,
    tipologia: tipologiaValida(d.tipologia),
    categoria: v(d.categoria),
    ragioneSociale: v(d.ragioneSociale),
    partitaIva,
    codiceFiscale: v(d.codiceFiscale)?.toUpperCase() ?? null,
    indirizzo: v(d.indirizzo),
    cap: v(d.cap),
    telefono: v(d.telefono),
    email: v(d.email)?.toLowerCase() ?? null,
    pec: v(d.pec)?.toLowerCase() ?? null,
    sistemaIstat: sistemaIstatValido(d.sistemaIstat),
  };
}

export async function elencoHotel() {
  const hotels = await prisma.hotel.findMany({
    include: {
      comune: true,
      _count: { select: { camere: true, accessi: { where: { utente: { superAdmin: false } } } } },
    },
    orderBy: { nome: "asc" },
  });
  // Primo avvio di ogni struttura: quanti passi fatti e quanti toccano al fornitore.
  return Promise.all(
    hotels.map(async (h) => {
      const a = await avvio(h.id);
      return {
        ...h,
        moduli: moduliAttivi(h.moduli),
        funzioniSpente: funzioniSpente(h.funzioniSpente),
        avvio: { fatti: a.fatti, totale: a.totale, completo: a.completo, daFornitore: a.passi.filter((p) => !p.fatto && p.fornitore).length },
      };
    }),
  );
}

export async function elencoComuni() {
  return prisma.comune.findMany({ orderBy: { nome: "asc" } });
}

/** Categorie delle tariffe tassa in vigore oggi, per comune: le scelte possibili per Hotel.categoria. */
export async function categorieTassaPerComune() {
  const oggi = new Date();
  const versioni = await prisma.regolamentoTassa.findMany({
    where: { validoDal: { lte: oggi }, OR: [{ validoAl: null }, { validoAl: { gte: oggi } }] },
    include: { tariffe: { orderBy: { categoria: "asc" } } },
  });
  const perComune: Record<number, string[]> = {};
  for (const v of versioni) perComune[v.comuneId] = v.tariffe.map((t) => t.categoria);
  return perComune;
}

export async function creaComune(input: { nome: string; provincia: string; codiceIstat: string }) {
  const nome = input.nome.trim();
  const provincia = input.provincia.trim().toUpperCase();
  const codiceIstat = input.codiceIstat.trim();
  if (!nome) throw new Error("Indica il nome del comune.");
  if (!/^[A-Z]{2}$/.test(provincia)) throw new Error("La provincia è la sigla di due lettere (es. PE).");
  if (!/^\d{6}$/.test(codiceIstat)) throw new Error("Il codice ISTAT del comune ha 6 cifre (es. 058091 per Roma).");
  return prisma.comune.create({ data: { nome, provincia, codiceIstat } });
}

/**
 * Crea un hotel pronto all'uso: i ruoli predefiniti, un listino base (planning e prenotazioni
 * lo richiedono), i trattamenti e le fasce orarie delle sale predefiniti e, se indicato, il primo amministratore. Tutto o niente, in una transazione.
 */
export async function creaHotel(dati: DatiHotel, amministratore?: { nome: string; email: string; password: string }) {
  const valori = normalizza(dati);
  let passwordHash: string | null = null;
  const admin = amministratore?.email.trim() ? amministratore : undefined;
  if (admin) {
    if (!admin.nome.trim()) throw new Error("Indica il nome dell'amministratore.");
    if (admin.password.length < 8) throw new Error("La password dell'amministratore deve avere almeno 8 caratteri.");
    const bcrypt = await import("bcryptjs");
    passwordHash = await bcrypt.hash(admin.password, 10);
  }

  const hotel = await prisma.$transaction(async (tx) => {
    const hotel = await tx.hotel.create({ data: valori });
    let ruoloAmministratoreId = 0;
    for (const r of RUOLI_PREDEFINITI) {
      const ruolo = await tx.ruolo.create({ data: { hotelId: hotel.id, nome: r.nome, permessi: r.permessi } });
      if (r.nome === "Amministratore") ruoloAmministratoreId = ruolo.id;
    }
    await tx.listino.create({ data: { hotelId: hotel.id, codice: "BASE", descrizione: "Listino base", tipo: "base" } });
    await tx.trattamento.createMany({ data: TRATTAMENTI_PREDEFINITI.map((t, i) => ({ hotelId: hotel.id, ...t, ordine: i + 1 })) });
    await tx.fasciaOraria.createMany({ data: FASCE_PREDEFINITE.map((f, i) => ({ ...f, hotelId: hotel.id, ordine: i + 1 })) });
    await tx.repartoAddebito.createMany({ data: REPARTI_PREDEFINITI.map((r, i) => ({ ...r, hotelId: hotel.id, ordine: i + 1 })) });

    if (admin && passwordHash) {
      const email = admin.email.trim().toLowerCase();
      if (await tx.utente.findUnique({ where: { email } })) {
        throw new Error("Esiste già un utente con l'email dell'amministratore: collegalo dopo, dalla pagina Utenti dell'hotel.");
      }
      await tx.utente.create({
        data: {
          nome: admin.nome.trim(),
          email,
          passwordHash,
          accessi: { create: { hotelId: hotel.id, ruoloId: ruoloAmministratoreId } },
        },
      });
    }
    return hotel;
  });
  // Struttura nuova: si parte dal profilo della sua tipologia (moduli, utenti, trattamenti).
  await applicaProfilo(hotel.id);
  return hotel;
}

export async function aggiornaHotel(hotelId: number, dati: DatiHotel) {
  await prisma.hotel.update({ where: { id: hotelId }, data: normalizza(dati) });
}

export async function impostaModuliHotel(hotelId: number, moduli: Modulo[]) {
  const disponibili = new Set(CATALOGO_MODULI.filter((m) => m.disponibile).map((m) => m.modulo));
  const attuali = moduliAttivi((await prisma.hotel.findUniqueOrThrow({ where: { id: hotelId } })).moduli);
  // Un modulo non ancora sviluppato non si può accendere; se già acceso (dati vecchi) resta com'è.
  const nuovi = moduliAttivi(moduli).filter((m) => disponibili.has(m) || attuali.includes(m));
  await prisma.hotel.update({ where: { id: hotelId }, data: { moduli: nuovi } });
}

export async function impostaHotelAttivo(hotelId: number, attivo: boolean) {
  await prisma.hotel.update({ where: { id: hotelId }, data: { attivo } });
}
