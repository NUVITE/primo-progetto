import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

export const verifyFamily = cache(async () => {
  const session = await getSession();
  if (!session.familyCode) {
    redirect("/login");
  }
  return session.familyCode;
});

export const getCurrentFamily = cache(async () => {
  const familyCode = await verifyFamily();
  const family = await prisma.family.findUnique({ where: { code: familyCode } });
  if (!family) {
    redirect("/login");
  }
  return family;
});

export const getCurrentPerson = cache(async () => {
  const familyCode = await verifyFamily();
  const session = await getSession();
  if (!session.personId) {
    redirect("/chi-sei");
  }
  const person = await prisma.person.findUnique({
    where: { id: session.personId },
    include: { family: true },
  });
  // Un cambio famiglia sullo stesso dispositivo non deve mostrare la persona
  // scelta in precedenza da un'altra famiglia.
  if (!person || person.family.code !== familyCode) {
    redirect("/chi-sei");
  }
  return person;
});
