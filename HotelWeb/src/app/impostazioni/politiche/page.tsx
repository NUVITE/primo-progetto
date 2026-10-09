import { datiPolitiche } from "./actions";
import { PoliticheCancellazione } from "./PoliticheCancellazione";

export default async function PolitichePage() {
  return <PoliticheCancellazione iniziale={await datiPolitiche()} />;
}
