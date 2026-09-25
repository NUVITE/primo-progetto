import { notFound } from "next/navigation";
import { caricaPrenotazione } from "./actions";
import { PrenotazioneDettaglio } from "./PrenotazioneDettaglio";

export default async function PrenotazioneDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) notFound();

  const iniziale = await caricaPrenotazione(idNumero);
  return <PrenotazioneDettaglio iniziale={iniziale} />;
}
