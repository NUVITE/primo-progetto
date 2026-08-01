"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { FAMILY_CODES } from "@/lib/families";

export interface LoginState {
  error?: string;
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const familyCode = String(formData.get("familyCode") ?? "").trim().toUpperCase();
  // Spazi iniziali o finali capitano spesso incollando la password o con la
  // tastiera del telefono: non devono impedire l'accesso.
  const password = String(formData.get("password") ?? "").trim();

  if (!(FAMILY_CODES as readonly string[]).includes(familyCode)) {
    return { error: "Scegli una delle famiglie in elenco." };
  }
  if (!password) {
    return { error: "Inserisci la password." };
  }

  const family = await prisma.family.findUnique({ where: { code: familyCode } });
  if (!family) {
    return { error: "Famiglia non trovata. Riprova più tardi." };
  }

  const ok = await bcrypt.compare(password, family.passwordHash);
  if (!ok) {
    return { error: "Password errata." };
  }

  const session = await getSession();
  session.familyCode = family.code;
  await session.save();

  redirect("/");
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
