"use server";

import { conEsito } from "@/lib/esito";
import { getUtenteCorrente, rinnovaSessione, utenteDaCambiarePassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cambiaPassword, esciDagliAltriDispositivi, ipRichiesta } from "@/lib/accessi";

/** Utente della sessione: anche chi deve ancora cambiare la password temporanea (solo per cambiarla). */
async function chi(ancheConObbligo: boolean) {
  const u = (await getUtenteCorrente()) ?? (ancheConObbligo ? await utenteDaCambiarePassword() : null);
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
