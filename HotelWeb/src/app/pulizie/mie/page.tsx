import { datiMieCamere } from "./actions";
import { MieCamere } from "./MieCamere";

export default async function MieCamerePage() {
  return <MieCamere iniziale={await datiMieCamere()} />;
}
