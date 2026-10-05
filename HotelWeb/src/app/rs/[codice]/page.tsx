import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paginaOspite } from "@/lib/roomService";
import { OrdinaRoomService } from "./OrdinaRoomService";

export const metadata: Metadata = { title: "Servizi in camera", robots: { index: false, follow: false } };

export default async function RoomServicePage({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const dati = await paginaOspite(codice);
  if (!dati) notFound();
  return <OrdinaRoomService codice={codice} iniziale={dati} />;
}
