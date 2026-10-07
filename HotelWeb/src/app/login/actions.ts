"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { creaSessione, verificaPassword } from "@/lib/auth";
import { ipRichiesta, minutiDiBlocco, pulisciEventiVecchi, registraEvento } from "@/lib/accessi";
import { destinazioneSicura } from "@/lib/accessiRegole";

export async function effettuaLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Solo pagine interne: un link costruito apposta non deve portare, dopo un login vero, su un sito esterno.
  const destinazione = destinazioneSicura(String(formData.get("destinazione") ?? "/"));

  const parametriErrore = `?errore=1&da=${encodeURIComponent(destinazione)}`;

  if (!email || !password) {
    redirect(`/login${parametriErrore}`);
  }

  // Troppi errori di recente per questa email (o da questo indirizzo): si rifiuta anche la password giusta.
  const ip = await ipRichiesta();
  const utente = await prisma.utente.findUnique({ where: { email } });
  const minuti = await minutiDiBlocco(email, ip);
  if (minuti) {
    await registraEvento({ utenteId: utente?.id ?? null, email, ip, tipo: "bloccato" });
    redirect(`/login?errore=bloccato&minuti=${minuti}&da=${encodeURIComponent(destinazione)}`);
  }

  const passwordOk = !!utente && utente.attivo && (await verificaPassword(password, utente.passwordHash));
  // Account senza più nessun hotel attivo (rimosso dall'ultimo, o hotel disattivato dalla
  // piattaforma): stesso messaggio di credenziali errate, invece di un errore generico da eccezione.
  const haHotel =
    passwordOk && (utente.superAdmin || (await prisma.utenteHotel.count({ where: { utenteId: utente.id, hotel: { attivo: true } } })) > 0);
  if (!passwordOk || !haHotel) {
    await registraEvento({ utenteId: utente?.id ?? null, email, ip, tipo: "accesso_fallito", dettaglio: passwordOk ? "nessun hotel attivo" : null });
    redirect(`/login${parametriErrore}`);
  }

  await registraEvento({ utenteId: utente.id, email, ip, tipo: "accesso" });
  await pulisciEventiVecchi();
  await creaSessione(utente.id);
  redirect(utente.cambioPasswordObbligatorio ? "/cambia-password" : destinazione);
}
