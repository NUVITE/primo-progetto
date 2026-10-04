import { datiFoglio } from "./actions";
import { FoglioDelGiorno } from "./FoglioDelGiorno";

export default async function FoglioPage({ searchParams }: { searchParams: Promise<{ giorno?: string }> }) {
  const { giorno } = await searchParams;
  return <FoglioDelGiorno iniziale={await datiFoglio(giorno)} />;
}
