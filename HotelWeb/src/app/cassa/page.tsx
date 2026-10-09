import { datiCassa } from "./actions";
import { Cassa } from "./Cassa";

export default async function CassaPage({ searchParams }: { searchParams: Promise<{ giorno?: string }> }) {
  const { giorno } = await searchParams;
  return <Cassa iniziale={await datiCassa(giorno)} />;
}
