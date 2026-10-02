"use server";

import { redirect } from "next/navigation";
import { distruggiSessione } from "@/lib/auth";

export async function effettuaLogout() {
  await distruggiSessione();
  redirect("/login");
}
