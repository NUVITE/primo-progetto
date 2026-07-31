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
