import { datiConti } from "./actions";
import { ContiAperti } from "./ContiAperti";

export default async function ContiPage() {
  return <ContiAperti iniziale={await datiConti()} />;
}
