import { datiPreventivi } from "./actions";
import { ElencoPreventivi } from "./ElencoPreventivi";

export default async function PreventiviPage() {
  return <ElencoPreventivi iniziale={await datiPreventivi()} />;
}
