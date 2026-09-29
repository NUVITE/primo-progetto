import { notFound } from "next/navigation";
import { puo, richiediPermesso } from "@/lib/auth";
import { datiCheckin } from "@/lib/checkin";
import { PERMESSI } from "@/lib/permessi";
import { CheckinCamera } from "./CheckinCamera";

export default async function CheckinPage({ params }: { params: Promise<{ id: string; segmentoId: string }> }) {
  const utente = await richiediPermesso(PERMESSI.PRENOTAZIONI_VEDI);
  const { id, segmentoId } = await params;
  const dati = await datiCheckin(utente.hotelId, Number(segmentoId), puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)).catch(() => null);
  if (!dati || dati.segmento.prenotazioneId !== Number(id)) notFound();
  return <CheckinCamera iniziale={dati} puoGestire={puo(utente, PERMESSI.PRENOTAZIONI_GESTISCI)} />;
}
