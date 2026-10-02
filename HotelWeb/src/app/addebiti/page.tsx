import { datiAddebiti } from "./actions";
import { AddebitiReparti } from "./AddebitiReparti";

export default async function AddebitiPage() {
  return <AddebitiReparti iniziale={await datiAddebiti()} />;
}
