"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { avviaVerifica, chiudiVerifica, creaSessione, leggiDispositivo, salvaDispositivo, utenteInVerifica, verificaPassword } from "@/lib/auth";
import { controllaCodice, dispositivoRicordato, GIORNI_DISPOSITIVO, ricordaDispositivo, verificaObbligatoria } from "@/lib/dueFattori";
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

  // Verifica in due passaggi attiva: prima il codice, salvo che questo dispositivo sia stato ricordato.
  if (utente.totpAttivoIl && !(await dispositivoRicordato(utente.id, await leggiDispositivo()))) {
    await avviaVerifica(utente.id, destinazione);
    redirect("/login/verifica");
  }

  await registraEvento({ utenteId: utente.id, email, ip, tipo: "accesso" });
  await pulisciEventiVecchi();
  await creaSessione(utente.id, await verificaObbligatoria(utente.id));
  redirect(utente.cambioPasswordObbligatorio ? "/cambia-password" : destinazione);
}

/** Secondo passaggio: codice dell'app (o di riserva), eventualmente ricordando il dispositivo. */
export async function verificaCodiceLogin(formData: FormData) {
  const v = await utenteInVerifica();
  if (!v) redirect("/login?errore=scaduta");
  const codice = String(formData.get("codice") ?? "");
  const ricorda = formData.get("ricorda") === "si";
  const utente = await prisma.utente.findUnique({ where: { id: v.utenteId } });
  if (!utente || !utente.attivo) redirect("/login?errore=1");
  const ip = await ipRichiesta();
  // Anche i codici sbagliati contano per il blocco: altrimenti si potrebbero provare all'infinito.
  const minuti = await minutiDiBlocco(utente.email, ip);
  if (minuti) {
    await registraEvento({ utenteId: utente.id, email: utente.email, ip, tipo: "bloccato" });
    await chiudiVerifica();
    redirect(`/login?errore=bloccato&minuti=${minuti}`);
  }
  const esito = await controllaCodice(utente.id, codice);
  if (!esito) {
    await registraEvento({ utenteId: utente.id, email: utente.email, ip, tipo: "verifica_fallita" });
    redirect("/login/verifica?errore=1");
  }
  if (esito.riserva) await registraEvento({ utenteId: utente.id, email: utente.email, ip, tipo: "codice_riserva_usato", dettaglio: `ne restano ${esito.rimasti}` });
  await registraEvento({ utenteId: utente.id, email: utente.email, ip, tipo: "accesso" });
  if (ricorda) await salvaDispositivo(await ricordaDispositivo(utente.id), GIORNI_DISPOSITIVO);
  await chiudiVerifica();
  await pulisciEventiVecchi();
  await creaSessione(utente.id, await verificaObbligatoria(utente.id));
  // Pochi codici di riserva rimasti: si va al profilo per crearne di nuovi.
  redirect(utente.cambioPasswordObbligatorio ? "/cambia-password" : esito.riserva && esito.rimasti <= 2 ? "/profilo?riserva=pochi" : destinazioneSicura(v.destinazione));
}
