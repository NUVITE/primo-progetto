import { datiUsoDiurno } from "./actions";
import { NuovoUsoDiurno } from "./NuovoUsoDiurno";

export default async function UsoDiurnoPage({ searchParams }: { searchParams: Promise<{ camera?: string; giorno?: string }> }) {
  const { camera, giorno } = await searchParams;
  return <NuovoUsoDiurno dati={await datiUsoDiurno()} cameraIniziale={camera ? Number(camera) : null} giornoIniziale={giorno ?? ""} />;
}
