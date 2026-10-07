/**
 * Collaudo della sicurezza degli accessi (punto 8, parte A): regole della password, blocco dopo
 * troppi errori (per email e per indirizzo), destinazione sicura dopo il login, password temporanea,
 * cambio password (chiude le altre sessioni), uscita dagli altri dispositivi, reimpostazione da chi
 * gestisce gli utenti (non per chi lavora anche in altre strutture). Hotel e utenti di prova creati e
 * cancellati alla fine; gli eventi di prova usano email e indirizzi inventati.
 *   npx tsx scripts/collaudo-accessi.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import type { UtenteSessione } from "../src/lib/auth";
import { PERMESSI, TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { destinazioneSicura, LIMITE_EMAIL, LIMITE_IP, passwordTemporanea, problemaPassword, statoBlocco } from "../src/lib/accessiRegole";
import { cambiaPassword, esciDagliAltriDispositivi, minutiDiBlocco, pulisciEventiVecchi, registraEvento, registroAccessi } from "../src/lib/accessi";
import { aggiungiUtente, reimpostaPasswordUtente } from "../src/lib/utenti";

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
const SUFFISSO = "@collaudo-accessi.invalid";
const IP = "203.0.113.77"; // indirizzo riservato alla documentazione: non è di nessuno

async function main() {
  // ---- Regole pure ----
  const io = { email: `marco.rossi${SUFFISSO}`, nome: "Marco Rossi" };
  verifica("Password corta: rifiutata", !!problemaPassword("Ab3$xyz", io));
  verifica("Password comune anche con numeri in fondo: rifiutata", !!problemaPassword("password2024", io) && !!problemaPassword("Qwertyuiop1", io));
  verifica("Sempre lo stesso carattere: rifiutata", !!problemaPassword("aaaaaaaaaaaa", io));
  verifica("Con il nome o l'email: rifiutata", !!problemaPassword("ciao-marco-2026", io) && !!problemaPassword("rossi.2026.xyz", io));
  verifica("Frase lunga e personale: accettata", problemaPassword("girasole sul balcone 7", io) === null);
  const ora = new Date("2026-10-07T12:00:00Z");
  const min = (m: number) => new Date(ora.getTime() - m * 60_000);
  verifica("4 errori: non ancora bloccato", !statoBlocco([min(1), min(2), min(3), min(4)], ora, 5).bloccato);
  const b = statoBlocco([min(1), min(2), min(3), min(4), min(10)], ora, 5);
  verifica("5 errori in 15 minuti: bloccato fino a 15 minuti dal più vecchio (5 minuti)", b.bloccato && b.minuti === 5, b);
  verifica("Errori più vecchi di 15 minuti non contano", !statoBlocco([min(16), min(17), min(18), min(19), min(20)], ora, 5).bloccato);
  verifica(
    "Dopo il login solo pagine interne",
    destinazioneSicura("/prenotazioni/12") === "/prenotazioni/12" &&
      ["https://sito.it", "//sito.it", "/\\sito.it", "sito.it", "", null].every((d) => destinazioneSicura(d) === "/"),
  );
  const t = passwordTemporanea(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 255]));
  verifica("Password temporanea: tre gruppi di 4, senza caratteri che si confondono", /^[^0O1lI]{4}-[^0O1lI]{4}-[^0O1lI]{4}$/.test(t), t);

  // ---- Sul database ----
  const comune = await prisma.comune.findFirstOrThrow({ orderBy: { id: "asc" } });
  const hotel = await prisma.hotel.create({ data: { nome: "__Collaudo accessi", comuneId: comune.id } });
  const altro = await prisma.hotel.create({ data: { nome: "__Collaudo accessi 2", comuneId: comune.id } });
  try {
    const amm = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Amministratore", permessi: TUTTI_I_PERMESSI } });
    const rec = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Reception", permessi: [PERMESSI.PRENOTAZIONI_GESTISCI] } });
    const rec2 = await prisma.ruolo.create({ data: { hotelId: altro.id, nome: "Reception", permessi: [PERMESSI.PRENOTAZIONI_GESTISCI] } });
    const hash = await bcrypt.hash("vecchia-password-lunga", 10);
    const admin = await prisma.utente.create({ data: { nome: "Admin", email: `admin${SUFFISSO}`, passwordHash: hash, accessi: { create: { hotelId: hotel.id, ruoloId: amm.id } } } });
    const anna = await prisma.utente.create({ data: { nome: "Anna", email: `anna${SUFFISSO}`, passwordHash: hash, accessi: { create: { hotelId: hotel.id, ruoloId: rec.id } } } });
    const bruno = await prisma.utente.create({
      data: { nome: "Bruno", email: `bruno${SUFFISSO}`, passwordHash: hash, accessi: { create: [{ hotelId: hotel.id, ruoloId: rec.id }, { hotelId: altro.id, ruoloId: rec2.id }] } },
    });
    const sessione = (id: number, nome: string, superAdmin: boolean): UtenteSessione => ({
      id,
      nome,
      email: `${nome}${SUFFISSO}`,
      superAdmin,
      hotelId: hotel.id,
      hotelNome: hotel.nome,
      hotels: [],
      ruoloNome: superAdmin ? "Superadmin" : "Amministratore",
      permessi: TUTTI_I_PERMESSI,
      moduli: [],
      tipologia: "albergo",
      funzioniSpente: [],
    });
    const chi = sessione(admin.id, "Admin", false);

    // Blocco per email: 5 errori, poi bloccato; dopo un accesso riuscito si riparte da zero.
    const email = `anna${SUFFISSO}`;
    for (let i = 0; i < LIMITE_EMAIL - 1; i++) await registraEvento({ email, ip: IP, tipo: "accesso_fallito" });
    verifica("4 errori: si può ancora provare", (await minutiDiBlocco(email, IP)) === null);
    await registraEvento({ email, ip: IP, tipo: "accesso_fallito" });
    const m = await minutiDiBlocco(email, IP);
    verifica("5 errori: bloccata per 15 minuti", m === 15, m);
    verifica("Un'altra email dallo stesso indirizzo non è bloccata (soglia per indirizzo più alta)", (await minutiDiBlocco(`bruno${SUFFISSO}`, IP)) === null);
    await prisma.eventoAccesso.deleteMany({ where: { email } });
    for (let i = 0; i < LIMITE_EMAIL - 1; i++) await registraEvento({ email, ip: IP, tipo: "accesso_fallito" });
    await registraEvento({ email, ip: IP, tipo: "accesso", utenteId: anna.id });
    await registraEvento({ email, ip: IP, tipo: "accesso_fallito" });
    verifica("Dopo un accesso riuscito gli errori precedenti non contano", (await minutiDiBlocco(email, IP)) === null);
    // Blocco per indirizzo: tanti errori su email diverse dallo stesso indirizzo.
    for (let i = 0; i < LIMITE_IP; i++) await registraEvento({ email: `prova${i}${SUFFISSO}`, ip: IP, tipo: "accesso_fallito" });
    verifica("30 errori dallo stesso indirizzo: bloccato anche per un'altra email", (await minutiDiBlocco(`bruno${SUFFISSO}`, IP)) !== null);
    verifica("Senza indirizzo conta solo l'email", (await minutiDiBlocco(`bruno${SUFFISSO}`, null)) === null);

    // Cambio password.
    verifica("Password attuale sbagliata: rifiutato", !!(await errore(() => cambiaPassword(anna.id, "sbagliata", "girasole sul balcone 7", IP))));
    verifica("Nuova password debole: rifiutata", !!(await errore(() => cambiaPassword(anna.id, "vecchia-password-lunga", "password1", IP))));
    const v = await cambiaPassword(anna.id, "vecchia-password-lunga", "girasole sul balcone 7", IP);
    let a = await prisma.utente.findUniqueOrThrow({ where: { id: anna.id } });
    verifica(
      "Password cambiata: nuova versione di sessione (le altre si chiudono), data registrata, evento",
      v === 1 && a.versioneSessione === 1 && !!a.passwordCambiataIl && (await bcrypt.compare("girasole sul balcone 7", a.passwordHash)) &&
        (await prisma.eventoAccesso.count({ where: { utenteId: anna.id, tipo: "password_cambiata" } })) === 1,
    );
    verifica("Uscita dagli altri dispositivi: versione di nuovo cambiata", (await esciDagliAltriDispositivi(anna.id, IP)) === 2);

    // Reimpostazione da chi gestisce gli utenti.
    verifica("La propria password non si reimposta da qui", !!(await errore(() => reimpostaPasswordUtente(chi, admin.id, IP))));
    const temp = await reimpostaPasswordUtente(chi, anna.id, IP);
    a = await prisma.utente.findUniqueOrThrow({ where: { id: anna.id } });
    verifica(
      "Reimpostata: temporanea valida, da cambiare al primo accesso, sessioni chiuse, evento con chi l'ha fatta",
      (await bcrypt.compare(temp, a.passwordHash)) && a.cambioPasswordObbligatorio && a.versioneSessione === 3 &&
        (await prisma.eventoAccesso.findFirst({ where: { utenteId: anna.id, tipo: "password_reimpostata" } }))?.dettaglio === "da Admin",
    );
    await cambiaPassword(anna.id, temp, "nuvola rossa di sera 4", IP);
    verifica("Cambiata la temporanea: obbligo tolto", !(await prisma.utente.findUniqueOrThrow({ where: { id: anna.id } })).cambioPasswordObbligatorio);
    const e = await errore(() => reimpostaPasswordUtente(chi, bruno.id, IP));
    verifica("Chi lavora anche in un'altra struttura: lo reimposta solo il gestore della piattaforma", !!e && e.includes("gestore della piattaforma"), e);
    const tb = await reimpostaPasswordUtente(sessione(admin.id, "Admin", true), bruno.id, IP);
    verifica("Il gestore della piattaforma può", await bcrypt.compare(tb, (await prisma.utente.findUniqueOrThrow({ where: { id: bruno.id } })).passwordHash));

    // Nuovi utenti: password iniziale robusta e da cambiare al primo accesso.
    const debole = await errore(() => aggiungiUtente(sessione(admin.id, "Admin", true), { nome: "Carla", email: `carla${SUFFISSO}`, password: "12345678", ruoloId: rec.id }));
    verifica("Nuovo utente con password debole: rifiutato", !!debole, debole);
    await aggiungiUtente(sessione(admin.id, "Admin", true), { nome: "Carla", email: `carla${SUFFISSO}`, password: "fiori di campo 2026", ruoloId: rec.id });
    verifica("Nuovo utente: password da cambiare al primo accesso", (await prisma.utente.findUniqueOrThrow({ where: { email: `carla${SUFFISSO}` } })).cambioPasswordObbligatorio);

    // Registro: per la struttura solo i suoi utenti; filtri; conservazione 12 mesi.
    const sa = await prisma.utente.create({ data: { nome: "Fornitore", email: `fornitore${SUFFISSO}`, passwordHash: hash, superAdmin: true } });
    await registraEvento({ utenteId: sa.id, email: `fornitore${SUFFISSO}`, ip: IP, tipo: "accesso" });
    await registraEvento({ utenteId: null, email: `sconosciuto${SUFFISSO}`, ip: IP, tipo: "accesso_fallito" });
    await registraEvento({ utenteId: anna.id, email: `anna${SUFFISSO}`, ip: IP, tipo: "accesso_fallito" });
    const oggi = new Date().toISOString().slice(0, 10);
    const filtro = { dal: oggi, al: oggi, utenteId: null, soloProblemi: false };
    const r1 = await registroAccessi(hotel.id, filtro);
    const nomi = new Set(r1.eventi.map((x) => x.utente));
    verifica(
      "Registro della struttura: i suoi utenti sì, il fornitore e le email sconosciute no",
      nomi.has("Anna") && nomi.has("Bruno") && !nomi.has("Fornitore") && !nomi.has(null) && r1.utenti.every((u) => u.nome !== "Fornitore"),
      [...nomi],
    );
    const r2 = await registroAccessi(hotel.id, { ...filtro, soloProblemi: true });
    verifica("Solo problemi: password sbagliate e blocchi", r2.eventi.length > 0 && r2.eventi.every((x) => x.tipo === "accesso_fallito" || x.tipo === "bloccato"));
    const r3 = await registroAccessi(hotel.id, { ...filtro, utenteId: anna.id });
    verifica("Filtro per utente", r3.eventi.length > 0 && r3.eventi.every((x) => x.utente === "Anna"));
    verifica("Utente di un'altra struttura (il fornitore): rifiutato", !!(await errore(() => registroAccessi(hotel.id, { ...filtro, utenteId: sa.id }))));
    verifica("Periodo rovesciato: rifiutato", !!(await errore(() => registroAccessi(hotel.id, { ...filtro, dal: "2026-12-01", al: "2026-11-01" }))));
    const tutto = await registroAccessi(null, filtro);
    verifica("Registro della piattaforma: anche il fornitore e le email sconosciute", tutto.eventi.some((x) => x.utente === "Fornitore") && tutto.eventi.some((x) => x.email === `sconosciuto${SUFFISSO}`));
    const vecchio = await prisma.eventoAccesso.create({ data: { email: `vecchio${SUFFISSO}`, ip: IP, tipo: "accesso", creatoIl: new Date(Date.now() - 400 * 86400000) } });
    const recente = await prisma.eventoAccesso.create({ data: { email: `recente${SUFFISSO}`, ip: IP, tipo: "accesso", creatoIl: new Date(Date.now() - 300 * 86400000) } });
    await pulisciEventiVecchi();
    verifica(
      "Conservazione: dopo 12 mesi l'evento si cancella, prima no",
      !(await prisma.eventoAccesso.findUnique({ where: { id: vecchio.id } })) && !!(await prisma.eventoAccesso.findUnique({ where: { id: recente.id } })),
    );
  } finally {
    await prisma.eventoAccesso.deleteMany({ where: { OR: [{ email: { endsWith: SUFFISSO } }, { ip: IP }] } });
    await prisma.utenteHotel.deleteMany({ where: { hotelId: { in: [hotel.id, altro.id] } } });
    await prisma.utente.deleteMany({ where: { email: { endsWith: SUFFISSO } } });
    await prisma.ruolo.deleteMany({ where: { hotelId: { in: [hotel.id, altro.id] } } });
    await prisma.hotel.deleteMany({ where: { id: { in: [hotel.id, altro.id] } } });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (hotel, utenti ed eventi di prova cancellati)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
