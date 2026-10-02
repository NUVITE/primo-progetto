import { datiConti, datiEventiDaSaldare } from "./actions";
import { ContiAperti } from "./ContiAperti";

export default async function ContiPage() {
  const [conti, eventi] = await Promise.all([datiConti(), datiEventiDaSaldare()]);
  return <ContiAperti iniziale={conti} eventi={eventi} />;
}
