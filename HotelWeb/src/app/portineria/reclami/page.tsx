import { datiReclami } from "./actions";
import { RegistroReclami } from "./RegistroReclami";

export default async function ReclamiPage() {
  return <RegistroReclami iniziale={await datiReclami()} />;
}
