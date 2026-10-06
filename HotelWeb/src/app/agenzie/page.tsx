import { datiAgenzie } from "./actions";
import { Agenzie } from "./Agenzie";

export default async function AgenziePage() {
  return <Agenzie iniziale={await datiAgenzie()} />;
}
