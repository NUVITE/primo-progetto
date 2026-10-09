import { richiediPermesso } from "@/lib/auth";
import { PERMESSI } from "@/lib/permessi";
import { NuovaPrenotazioneForm } from "./NuovaPrenotazioneForm";

/** Dal planning si arriva con ?camera=<id>&dal=<giorno>: la prima camera è già scelta, per una notte. */
export default async function NuovaPrenotazionePage({ searchParams }: { searchParams: Promise<{ camera?: string; dal?: string }> }) {
  await richiediPermesso(PERMESSI.PRENOTAZIONI_GESTISCI);
  const { camera, dal } = await searchParams;
  const giorno = dal && /^\d{4}-\d{2}-\d{2}$/.test(dal) ? dal : null;
  const cameraId = camera && /^\d+$/.test(camera) ? Number(camera) : null;
  return <NuovaPrenotazioneForm cameraIniziale={cameraId} dalIniziale={giorno} />;
}
