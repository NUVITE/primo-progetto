import { datiConfigurazioneSale } from "./actions";
import { GestioneSale } from "./GestioneSale";

export default async function SalePage() {
  return <GestioneSale iniziale={await datiConfigurazioneSale()} />;
}
