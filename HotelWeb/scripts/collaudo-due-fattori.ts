/**
 * Collaudo della verifica in due passaggi (punto 8, parte B): codici TOTP confrontati con i valori di
 * prova della RFC 6238, finestra di ±30 secondi, niente riuso dello stesso codice, obbligo per ruolo,
 * attivazione con codice QR e codici di riserva (una volta sola), nuovi codici, spegnimento, azzeramento
 * da chi gestisce gli utenti, dispositivi ricordati (dimenticati con il cambio password), codici
 * sbagliati che contano per il blocco. Hotel e utenti di prova creati e cancellati alla fine.
 *   npx tsx scripts/collaudo-due-fattori.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import type { UtenteSessione } from "../src/lib/auth";
import { PERMESSI, TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { base32, daBase32, hotp, passoDi, verificaCodice } from "../src/lib/totp";
import {
  avviaAttivazione,
  confermaAttivazione,
  controllaCodice,
  disattivaVerifica,
  dispositivoRicordato,
  ricordaDispositivo,
  rigeneraCodiciRiserva,
  statoVerifica,
  verificaObbligatoria,
} from "../src/lib/dueFattori";
import { cambiaPassword, minutiDiBlocco, registraEvento } from "../src/lib/accessi";
import { azzeraVerificaUtente } from "../src/lib/utenti";

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
const SUFFISSO = "@collaudo-due-fattori.invalid";
const IP = "203.0.113.88";

async function main() {
  // ---- Calcolo dei codici: valori di prova della RFC 6238 (segreto ASCII "12345678901234567890", SHA-1) ----
  const rfc = base32(Buffer.from("12345678901234567890"));
  verifica("Base32 del segreto di prova", rfc === "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" && daBase32(rfc).toString() === "12345678901234567890", rfc);
  const vettori: [number, string][] = [
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ];
  verifica(
    "Codici uguali a quelli della RFC 6238 (ultime 6 cifre)",
    vettori.every(([t, c]) => hotp(rfc, passoDi(t * 1000)) === c),
    vettori.map(([t]) => hotp(rfc, passoDi(t * 1000))),
  );
  const ora = 1_800_000_000_000;
  const p = passoDi(ora);
  verifica("Codice attuale, precedente e successivo accettati (orologio un po' sfasato)", [p, p - 1, p + 1].every((x) => verificaCodice(rfc, hotp(rfc, x), ora, null) === x));
  verifica("Codice di un minuto fa: rifiutato", verificaCodice(rfc, hotp(rfc, p - 2), ora, null) === null);
  verifica("Lo stesso codice due volte: rifiutato", verificaCodice(rfc, hotp(rfc, p), ora, p) === null);
  verifica("Codice non numerico o corto: rifiutato", verificaCodice(rfc, "12a456", ora, null) === null && verificaCodice(rfc, "12345", ora, null) === null);

  // ---- Sul database ----
  const comune = await prisma.comune.findFirstOrThrow({ orderBy: { id: "asc" } });
  const hotel = await prisma.hotel.create({ data: { nome: "__Collaudo due fattori", comuneId: comune.id } });
  const piccolo = await prisma.hotel.create({ data: { nome: "__Collaudo due fattori B&B", comuneId: comune.id, modalitaUtenti: "titolare" } });
  try {
    const amm = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Amministratore", permessi: TUTTI_I_PERMESSI } });
    const rec = await prisma.ruolo.create({ data: { hotelId: hotel.id, nome: "Reception", permessi: [PERMESSI.PRENOTAZIONI_GESTISCI] } });
    const recB = await prisma.ruolo.create({ data: { hotelId: piccolo.id, nome: "Reception", permessi: [PERMESSI.PRENOTAZIONI_GESTISCI] } });
    const hash = await bcrypt.hash("vecchia-password-lunga", 10);
    const crea = (nome: string, accessi: { hotelId: number; ruoloId: number }[], superAdmin = false) =>
      prisma.utente.create({ data: { nome, email: `${nome.toLowerCase()}${SUFFISSO}`, passwordHash: hash, superAdmin, accessi: { create: accessi } } });
    const admin = await crea("Admin", [{ hotelId: hotel.id, ruoloId: amm.id }]);
    const anna = await crea("Anna", [{ hotelId: hotel.id, ruoloId: rec.id }]);
    const tito = await crea("Tito", [{ hotelId: piccolo.id, ruoloId: recB.id }]);
    const forn = await crea("Fornitore", [], true);

    verifica(
      "Obbligatoria per amministratore, titolare unico e fornitore; non per la reception",
      (await verificaObbligatoria(admin.id)) && (await verificaObbligatoria(tito.id)) && (await verificaObbligatoria(forn.id)) && !(await verificaObbligatoria(anna.id)),
    );

    // Attivazione di Anna.
    verifica("Conferma senza aver mostrato il QR: rifiutata", !!(await errore(() => confermaAttivazione(anna.id, "123456", IP))));
    const { segreto, uri } = await avviaAttivazione(anna.id);
    verifica("Indirizzo per l'app con emittente, email e segreto", uri.startsWith("otpauth://totp/HotelWeb%3Aanna") && uri.includes(`secret=${segreto}`), uri);
    verifica("Primo codice sbagliato: non si attiva", !!(await errore(() => confermaAttivazione(anna.id, "000000", IP))) && !(await statoVerifica(anna.id)).attiva);
    const adesso = passoDi(Date.now());
    const codici = await confermaAttivazione(anna.id, hotp(segreto, adesso - 1), IP);
    let st = await statoVerifica(anna.id);
    const riga = await prisma.utente.findUniqueOrThrow({ where: { id: anna.id } });
    verifica(
      "Attivata: 10 codici di riserva, segreto cifrato (non in chiaro), evento",
      st.attiva && st.codiciRimasti === 10 && codici.length === 10 && !!riga.totpSegretoCifrato?.startsWith("v1:") && !riga.totpSegretoCifrato.includes(segreto) && riga.totpInAttesaCifrato === null &&
        (await prisma.eventoAccesso.count({ where: { utenteId: anna.id, tipo: "verifica_attivata" } })) === 1,
    );
    verifica("Attivarla di nuovo: rifiutato", !!(await errore(() => avviaAttivazione(anna.id))));

    // Al login.
    verifica("Il codice usato per attivarla non vale di nuovo", (await controllaCodice(anna.id, hotp(segreto, adesso - 1))) === null);
    const c1 = await controllaCodice(anna.id, hotp(segreto, adesso));
    verifica("Codice dell'app attuale: accettato", !!c1 && !c1.riserva, c1);
    verifica("Lo stesso codice subito dopo: rifiutato", (await controllaCodice(anna.id, hotp(segreto, adesso))) === null);
    const c2 = await controllaCodice(anna.id, codici[0].toUpperCase().replace("-", " "));
    verifica("Codice di riserva (anche maiuscolo e con spazio): accettato, ne restano 9", !!c2 && c2.riserva && c2.rimasti === 9, c2);
    verifica("Lo stesso codice di riserva una seconda volta: rifiutato", (await controllaCodice(anna.id, codici[0])) === null);
    verifica("Codice inventato: rifiutato", (await controllaCodice(anna.id, "abcde-fghjk")) === null);

    // Nuovi codici di riserva.
    verifica("Nuovi codici con un codice sbagliato: rifiutato", !!(await errore(() => rigeneraCodiciRiserva(anna.id, "111111"))));
    const nuovi = await rigeneraCodiciRiserva(anna.id, hotp(segreto, adesso + 1));
    verifica("Nuovi codici: 10, i vecchi non valgono più", nuovi.length === 10 && (await controllaCodice(anna.id, codici[1])) === null && (await statoVerifica(anna.id)).codiciRimasti === 10);

    // Dispositivi ricordati.
    const token = await ricordaDispositivo(anna.id);
    verifica("Dispositivo ricordato: vale per Anna, non per un altro utente né senza cookie", (await dispositivoRicordato(anna.id, token)) && !(await dispositivoRicordato(admin.id, token)) && !(await dispositivoRicordato(anna.id, null)));
    await cambiaPassword(anna.id, "vecchia-password-lunga", "girasole sul balcone 7", IP);
    verifica("Cambio password: i dispositivi ricordati si dimenticano", !(await dispositivoRicordato(anna.id, token)));

    // Codici sbagliati e blocco.
    for (let i = 0; i < 5; i++) await registraEvento({ utenteId: anna.id, email: `anna${SUFFISSO}`, ip: null, tipo: "verifica_fallita" });
    verifica("5 codici sbagliati: bloccata come per le password", (await minutiDiBlocco(`anna${SUFFISSO}`, null)) === 15);

    // Spegnimento e azzeramento.
    verifica("Anna (facoltativa) con la password sbagliata: non si spegne", !!(await errore(() => disattivaVerifica(anna.id, "sbagliata", IP))));
    await disattivaVerifica(anna.id, "girasole sul balcone 7", IP);
    st = await statoVerifica(anna.id);
    verifica("Anna la spegne con la password", !st.attiva && st.codiciRimasti === 0);
    const s2 = await avviaAttivazione(admin.id);
    await confermaAttivazione(admin.id, hotp(s2.segreto, passoDi(Date.now())), IP);
    verifica("L'amministratore (obbligatoria) non può spegnerla", !!(await errore(() => disattivaVerifica(admin.id, "vecchia-password-lunga", IP))));
    const chi: UtenteSessione = {
      id: forn.id,
      nome: "Fornitore",
      email: `fornitore${SUFFISSO}`,
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
    const versione = (await prisma.utente.findUniqueOrThrow({ where: { id: admin.id } })).versioneSessione;
    await azzeraVerificaUtente(chi, admin.id, IP);
    const dopo = await prisma.utente.findUniqueOrThrow({ where: { id: admin.id } });
    verifica(
      "Telefono perso: azzerata dal fornitore, sessioni chiuse, evento con chi l'ha fatto",
      !dopo.totpAttivoIl && dopo.versioneSessione === versione + 1 &&
        (await prisma.eventoAccesso.findFirst({ where: { utenteId: admin.id, tipo: "verifica_azzerata" } }))?.dettaglio === "da Fornitore",
    );
    verifica("Azzerare chi non l'ha attiva: rifiutato", !!(await errore(() => azzeraVerificaUtente(chi, anna.id, IP))));
  } finally {
    await prisma.eventoAccesso.deleteMany({ where: { OR: [{ email: { endsWith: SUFFISSO } }, { ip: IP }] } });
    await prisma.dispositivoFidato.deleteMany({ where: { utente: { email: { endsWith: SUFFISSO } } } });
    await prisma.utenteHotel.deleteMany({ where: { hotelId: { in: [hotel.id, piccolo.id] } } });
    await prisma.utente.deleteMany({ where: { email: { endsWith: SUFFISSO } } });
    await prisma.ruolo.deleteMany({ where: { hotelId: { in: [hotel.id, piccolo.id] } } });
    await prisma.hotel.deleteMany({ where: { id: { in: [hotel.id, piccolo.id] } } });
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
