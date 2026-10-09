import { datiElencoMenu } from "../actions";
import { ElencoMenu } from "./ElencoMenu";

export default async function MenuPage() {
  return <ElencoMenu iniziale={await datiElencoMenu()} />;
}
