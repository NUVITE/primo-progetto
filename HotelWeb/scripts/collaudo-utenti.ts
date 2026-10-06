/**
 * Collaudo della modalità utenti (titolare unico / più utenti con ruoli) e dei ruoli in più.
 * Lavora su un hotel di prova creato e cancellato alla fine, anche in caso di errore.
 *   npx tsx scripts/collaudo-utenti.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { UtenteSessione } from "../src/lib/auth";
import { PERMESSI, permessiAccesso, TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { aggiungiUtente, impostaModalitaUtenti, impostaRuoliAggiuntivi, rimuoviDaHotel } from "../src/lib/utenti";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio ? ` — ${dettaglio}` : ""}`);
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

const SUFFISSO = "@collaudo-utenti.invalid";

async function main() {
  const comune = await prisma.comune.findFirstOrThrow({ orderBy: { id: "asc" } });
  const hotel = await prisma.hotel.create({ data: { nome: "__Collaudo utenti", comuneId: comune.id } });
  try {
    const amm = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Amministratore", permessi: TUTTI_I_PERMESSI } });
    const rec = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Reception", permessi: [PERMESSI.PRENOTAZIONI_GESTISCI] } });
    const cassa = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Cassa", permessi: [PERMESSI.PAGAMENTI_REGISTRA] } });
    const a = await prisma.utente.create({ data: { nome: "Admin", email: `admin${SUFFISSO}`, passwordHash: "x", accessi: { create: { hotelId: hotel.id, ruoloId: amm.id } } } });
    const b = await prisma.utente.create({ data: { nome: "Banco", email: `banco${SUFFISSO}`, passwordHash: "x", accessi: { create: { hotelId: hotel.id, ruoloId: rec.id } } } });
    // Chi opera: il gestore della piattaforma (supera i controlli sui permessi, non le regole della modalità).
    const chi: UtenteSessione = {
      id: a.id,
      nome: "Collaudo",
      email: `chi${SUFFISSO}`,
      superAdmin: true,
      hotelId: hotel.id,
      hotelNome: hotel.nome,
      hotels: [],
      ruoloNome: "Superadmin",
      permessi: TUTTI_I_PERMESSI,
      moduli: [],
      tipologia: "albergo",
      funzioniSpente: [],
    };

    const soloRec = permessiAccesso("ruoli", [rec.permessi]);
    verifica("Reception da sola non registra pagamenti", !soloRec.includes(PERMESSI.PAGAMENTI_REGISTRA));
    await impostaRuoliAggiuntivi(chi, b.id, [cassa.id, rec.id]);
    const extra = await prisma.ruoloAggiuntivo.findMany({ where: { utenteId: b.id, hotelId: hotel.id } });
    verifica("Ruolo in più salvato (il principale non si duplica)", extra.length === 1 && extra[0].ruoloId === cassa.id);
    const somma = permessiAccesso("ruoli", [rec.permessi, cassa.permessi]);
    verifica(
      "Reception + Cassa: i permessi si sommano (con le implicazioni)",
      somma.includes(PERMESSI.PRENOTAZIONI_GESTISCI) && somma.includes(PERMESSI.PAGAMENTI_REGISTRA) && somma.includes(PERMESSI.IMPORTI_VEDI),
    );

    const e1 = await errore(() => impostaModalitaUtenti(chi, "titolare"));
    verifica("Titolare unico rifiutato con due utenti", !!e1, e1 ?? "");
    await rimuoviDaHotel(chi, b.id);
    await impostaModalitaUtenti(chi, "titolare");
    const h = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } });
    verifica("Con un solo utente si passa al titolare unico", h.modalitaUtenti === "titolare");
    verifica("Il titolare ha tutti i permessi qualunque sia il ruolo", permessiAccesso("titolare", [rec.permessi]).length === TUTTI_I_PERMESSI.length);
    const e2 = await errore(() => aggiungiUtente(chi, { nome: "Altro", email: `altro${SUFFISSO}`, password: "password123", ruoloId: rec.id }));
    verifica("Con il titolare unico non si aggiungono utenti", !!e2, e2 ?? "");
    const e3 = await errore(() => impostaRuoliAggiuntivi(chi, a.id, [cassa.id]));
    verifica("Con il titolare unico niente ruoli in più", !!e3, e3 ?? "");
    await impostaModalitaUtenti(chi, "ruoli");
    await aggiungiUtente(chi, { nome: "Altro", email: `altro${SUFFISSO}`, password: "password123", ruoloId: rec.id });
    verifica("Tornati ai ruoli si aggiungono utenti", (await prisma.utenteHotel.count({ where: { hotelId: hotel.id } })) === 2);

    const altro = await prisma.utente.findUniqueOrThrow({ where: { email: `altro${SUFFISSO}` } });
    await impostaRuoliAggiuntivi(chi, altro.id, [cassa.id]);
    await prisma.ruolo.delete({ where: { id: cassa.id } });
    verifica("Eliminando un ruolo sparisce dai ruoli in più", (await prisma.ruoloAggiuntivo.count({ where: { hotelId: hotel.id } })) === 0);
  } finally {
    await prisma.ruoloAggiuntivo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utenteHotel.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.utente.deleteMany({ where: { email: { endsWith: SUFFISSO } } });
    await prisma.ruolo.deleteMany({ where: { hotelId: hotel.id } });
    await prisma.hotel.delete({ where: { id: hotel.id } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (hotel di prova cancellato)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
