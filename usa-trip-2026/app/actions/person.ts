"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { verifyFamily } from "@/lib/dal";

export interface ChiSeiState {
  error?: string;
}

export async function selectPerson(personId: string) {
  const familyCode = await verifyFamily();
  const family = await prisma.family.findUniqueOrThrow({ where: { code: familyCode } });

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person || person.familyId !== family.id) {
    return;
  }

  const session = await getSession();
  session.personId = person.id;
  await session.save();

  redirect("/");
}

export async function addPerson(
  _prevState: ChiSeiState | undefined,
  formData: FormData
): Promise<ChiSeiState> {
  const familyCode = await verifyFamily();
  const family = await prisma.family.findUniqueOrThrow({ where: { code: familyCode } });

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: "Scrivi il tuo nome." };
  }

  const person = await prisma.person.upsert({
    where: { familyId_name: { familyId: family.id, name } },
    update: {},
    create: { familyId: family.id, name },
  });

  const session = await getSession();
  session.personId = person.id;
  await session.save();

  redirect("/");
}
