import { datiOspiti } from "./actions";
import { ElencoOspiti } from "./ElencoOspiti";

export default async function OspitiPage() {
  return <ElencoOspiti iniziale={await datiOspiti("", "tutti")} />;
}
