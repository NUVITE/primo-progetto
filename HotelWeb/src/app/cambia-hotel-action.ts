"use server";

import { redirect } from "next/navigation";
import { cambiaHotelAttivo } from "@/lib/auth";

export async function azioneCambiaHotel(formData: FormData) {
  const hotelId = Number(formData.get("hotelId"));
  await cambiaHotelAttivo(hotelId);
  redirect("/");
}
