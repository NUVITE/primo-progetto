import { datiUsoDiurno } from "./actions";
import { NuovoUsoDiurno } from "./NuovoUsoDiurno";
import { paginaSpenta } from "@/components/FunzioneSpenta";

export default async function UsoDiurnoPage({ searchParams }: { searchParams: Promise<{ camera?: string; giorno?: string; persona?: string }> }) {
  const spenta = await paginaSpenta("uso_diurno");
  if (spenta) return spenta;
  const { camera, giorno, persona } = await searchParams;
  const dati = await datiUsoDiurno(persona && Number.isInteger(Number(persona)) ? Number(persona) : null);
  return <NuovoUsoDiurno dati={dati} cameraIniziale={camera ? Number(camera) : null} giornoIniziale={giorno ?? ""} />;
}
