import { notFound } from "next/navigation";
import { datiRichiestaDisp } from "../actions";
import { DettaglioRichiesta } from "./DettaglioRichiesta";

export default async function RichiestaDispPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await datiRichiestaDisp(Number(id)).catch(() => null);
  if (!dati) notFound();
  return <DettaglioRichiesta iniziale={dati} />;
}
