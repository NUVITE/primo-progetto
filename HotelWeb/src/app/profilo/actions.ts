"use server";

import { conEsito } from "@/lib/esito";
import QRCode from "qrcode";
import { getUtenteCorrente, rinnovaSessione, utenteDaAttivareVerifica, utenteDaCambiarePassword } from "@/lib/auth";
import { avviaAttivazione, confermaAttivazione, disattivaVerifica, rigeneraCodiciRiserva, statoVerifica } from "@/lib/dueFattori";
import { prisma } from "@/lib/prisma";
import { cambiaPassword, esciDagliAltriDispositivi, ipRichiesta } from "@/lib/accessi";

/**
 * Utente della sessione. "password": anche chi deve ancora cambiare la password temporanea (solo per
 * cambiarla); "verifica": anche chi deve ancora attivare la verifica in due passaggi (solo per attivarla).
 */
async function chi(anche: boolean | "verifica") {
  const u =
    (await getUtenteCorrente()) ?? (anche === true ? await utenteDaCambiarePassword() : anche === "verifica" ? await utenteDaAttivareVerifica() : null);
  if (!u) throw new Error("Sessione scaduta: accedi di nuovo.");
  return u;
}

export async function datiProfilo() {
  const u = await chi(false);
  const [utente, eventi] = await Promise.all([
    prisma.utente.findUniqueOrThrow({ where: { id: u.id }, select: { nome: true, email: true, passwordCambiataIl: true } }),
    prisma.eventoAccesso.findMany({ where: { utenteId: u.id }, orderBy: { creatoIl: "desc" }, take: 10, select: { id: true, tipo: true, ip: true, creatoIl: true, dettaglio: true } }),
  ]);
  return {
    nome: utente.nome,
    email: utente.email,
    passwordCambiataIl: utente.passwordCambiataIl?.toISOString() ?? null,
    verifica: await statoVerifica(u.id),
    eventi: eventi.map((e) => ({ ...e, creatoIl: e.creatoIl.toISOString() })),
  };
}

/** Cambio della propria password: le altre sessioni si chiudono, questa resta aperta. */
export async function azioneCambiaPassword(attuale: string, nuova: string, conferma: string) {
  return conEsito(async () => {
    const u = await chi(true);
    if (nuova !== conferma) throw new Error("Le due nuove password non coincidono.");
    const versione = await cambiaPassword(u.id, attuale, nuova, await ipRichiesta());
    await rinnovaSessione(u.id, versione);
    return true;
  });
}

export async function azioneEsciAltriDispositivi() {
  return conEsito(async () => {
    const u = await chi(false);
    await rinnovaSessione(u.id, await esciDagliAltriDispositivi(u.id, await ipRichiesta()));
    return true;
  });
}

// ---- Verifica in due passaggi ----

/** Primo passo: codice QR da inquadrare con l'app (e il segreto da scrivere a mano, se il QR non si legge). */
export async function azioneAvviaVerifica() {
  return conEsito(async () => {
    const u = await chi("verifica");
    const { segreto, uri } = await avviaAttivazione(u.id);
    const qr = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M", width: 200 });
    return { qr, segreto: segreto.replace(/(.{4})/g, "$1 ").trim() };
  });
}

/** Secondo passo: il primo codice dell'app attiva la verifica; restituisce i codici di riserva. */
export async function azioneConfermaVerifica(codice: string) {
  return conEsito(async () => {
    const u = await chi("verifica");
    // Niente rinnovo del cookie: l'obbligo cade da solo con la verifica attiva, e un cookie nuovo farebbe
    // ridisegnare la pagina portando via i codici di riserva prima che l'utente li salvi.
    return confermaAttivazione(u.id, codice, await ipRichiesta());
  });
}

export async function azioneNuoviCodiciRiserva(codice: string) {
  return conEsito(async () => rigeneraCodiciRiserva((await chi(false)).id, codice));
}

export async function azioneDisattivaVerifica(password: string) {
  return conEsito(async () => {
    const u = await chi(false);
    await disattivaVerifica(u.id, password, await ipRichiesta());
    return true;
  });
}
