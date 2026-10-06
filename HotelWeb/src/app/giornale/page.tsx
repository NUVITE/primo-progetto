import { datiGiornale } from "./actions";
import { GiornaleAlbergo } from "./GiornaleAlbergo";

export default async function GiornalePage({ searchParams }: { searchParams: Promise<{ giorno?: string }> }) {
  const { giorno } = await searchParams;
  return <GiornaleAlbergo iniziale={await datiGiornale(giorno)} />;
}
