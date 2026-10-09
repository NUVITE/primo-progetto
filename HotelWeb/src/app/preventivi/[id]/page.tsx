import { notFound } from "next/navigation";
import { datiRichiestaDisp } from "../actions";
import { DettaglioRichiesta } from "./DettaglioRichiesta";
import { paginaSpenta } from "@/components/FunzioneSpenta";

export default async function RichiestaDispPage({ params }: { params: Promise<{ id: string }> }) {
  const spenta = await paginaSpenta("preventivi");
  if (spenta) return spenta;
  const { id } = await params;
  const dati = await datiRichiestaDisp(Number(id)).catch(() => null);
  if (!dati) notFound();
  return <DettaglioRichiesta iniziale={dati} />;
}
