"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { creaSessione, verificaPassword } from "@/lib/auth";

export async function effettuaLogin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const destinazione = String(formData.get("destinazione") ?? "/") || "/";

  const parametriErrore = `?errore=1&da=${encodeURIComponent(destinazione)}`;

  if (!email || !password) {
    redirect(`/login${parametriErrore}`);
  }

  const utente = await prisma.utente.findUnique({ where: { email } });
  if (!utente || !utente.attivo) {
    redirect(`/login${parametriErrore}`);
  }

  const passwordOk = await verificaPassword(password, utente.passwordHash);
  if (!passwordOk) {
    redirect(`/login${parametriErrore}`);
  }

  // Account senza più nessun hotel (es. rimosso dall'ultimo): stesso messaggio di credenziali
  // errate, invece di un errore generico da eccezione.
  const haHotel = utente.superAdmin || (await prisma.utenteHotel.count({ where: { utenteId: utente.id } })) > 0;
  if (!haHotel) {
    redirect(`/login${parametriErrore}`);
  }

  await creaSessione(utente.id);
  redirect(destinazione);
}
