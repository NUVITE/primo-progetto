import { datiAdempimenti } from "./actions";
import { FormAdempimenti } from "./FormAdempimenti";

export default async function AdempimentiPage() {
  return <FormAdempimenti iniziale={await datiAdempimenti()} />;
}
