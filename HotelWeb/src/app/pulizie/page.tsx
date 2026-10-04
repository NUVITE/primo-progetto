import { datiStatoCamere } from "./actions";
import { StatoCamere } from "./StatoCamere";

export default async function PuliziePage() {
  return <StatoCamere iniziale={await datiStatoCamere()} />;
}
