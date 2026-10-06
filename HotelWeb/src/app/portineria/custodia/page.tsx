import { datiCustodia } from "./actions";
import { Custodia } from "./Custodia";

export default async function CustodiaPage() {
  return <Custodia iniziale={await datiCustodia()} />;
}
