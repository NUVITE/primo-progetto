import { notFound } from "next/navigation";
import { puo, richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { caricaPrenotazione } from "./actions";
import { PrenotazioneDettaglio } from "./PrenotazioneDettaglio";

export default async function PrenotazioneDettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero)) notFound();

  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const iniziale = await caricaPrenotazione(idNumero);
  return <PrenotazioneDettaglio iniziale={iniziale} puoGestire={puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)} />;
}
