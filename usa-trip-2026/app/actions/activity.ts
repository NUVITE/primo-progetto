"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { verifyFamily } from "@/lib/dal";

export async function updateActivity(formData: FormData) {
  const familyCode = await verifyFamily();

  const id = String(formData.get("id") ?? "");
  const time = String(formData.get("time") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id) return;

  await prisma.activity.update({
    where: { id },
    data: {
      time: time || null,
      notes: notes || null,
      updatedByFamily: familyCode,
    },
  });

  revalidatePath("/itinerario");
  revalidatePath("/");
}
