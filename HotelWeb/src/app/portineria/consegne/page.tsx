import { datiConsegne } from "./actions";
import { ConsegneTurno } from "./ConsegneTurno";

export default async function ConsegnePage() {
  return <ConsegneTurno iniziale={await datiConsegne()} />;
}
