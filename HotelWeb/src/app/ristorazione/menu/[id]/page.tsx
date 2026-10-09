import { notFound } from "next/navigation";
import { datiMenu } from "../../actions";
import { DettaglioMenu } from "./DettaglioMenu";

export default async function MenuDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = await datiMenu(Number(id)).catch(() => null);
  if (!dati) notFound();
  return <DettaglioMenu iniziale={dati} />;
}
