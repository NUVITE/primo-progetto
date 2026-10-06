import { datiAgenda } from "./actions";
import { AgendaPortiere } from "./AgendaPortiere";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ giorno?: string }> }) {
  const { giorno } = await searchParams;
  return <AgendaPortiere iniziale={await datiAgenda(giorno)} />;
}
