import { notFound } from "next/navigation";
import { datiScheda } from "../actions";
import { SchedaOspite } from "./SchedaOspite";

export default async function SchedaOspitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dati = Number.isInteger(Number(id)) ? await datiScheda(Number(id)).catch(() => null) : null;
  if (!dati) notFound();
  return <SchedaOspite iniziale={dati} />;
}
