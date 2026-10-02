import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { NuovaPrenotazioneForm } from "./NuovaPrenotazioneForm";

export default async function NuovaPrenotazionePage() {
  await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  return <NuovaPrenotazioneForm />;
}
