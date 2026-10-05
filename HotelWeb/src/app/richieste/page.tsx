import { datiRichieste } from "./actions";
import { RichiesteOspiti } from "./RichiesteOspiti";

export default async function RichiestePage() {
  return <RichiesteOspiti iniziale={await datiRichieste()} />;
}
