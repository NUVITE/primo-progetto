import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paginaPreventivo } from "@/lib/preventivi";
import { PreventivoOspite } from "./PreventivoOspite";

export const metadata: Metadata = { title: "Preventivo", robots: { index: false, follow: false } };

export default async function PreventivoPage({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const dati = await paginaPreventivo(codice);
  if (!dati) notFound();
  return <PreventivoOspite codice={codice} iniziale={dati} />;
}
