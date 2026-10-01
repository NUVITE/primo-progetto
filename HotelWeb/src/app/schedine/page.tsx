import { datiSchedine } from "./actions";
import { SchedinePolizia } from "./SchedinePolizia";

export default async function SchedinePage() {
  return <SchedinePolizia iniziale={await datiSchedine()} />;
}
