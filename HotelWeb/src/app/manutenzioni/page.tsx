import { datiManutenzioni } from "./actions";
import { Manutenzioni } from "./Manutenzioni";

export default async function ManutenzioniPage({ searchParams }: { searchParams: Promise<{ camera?: string }> }) {
  const { camera } = await searchParams;
  return <Manutenzioni iniziale={await datiManutenzioni(camera ? Number(camera) || undefined : undefined)} />;
}
