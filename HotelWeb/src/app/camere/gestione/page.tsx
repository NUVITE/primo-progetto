import { datiGestione } from "./actions";
import { GestioneCamere } from "./GestioneCamere";

export default async function GestioneCamerePage() {
  const dati = await datiGestione();
  return <GestioneCamere iniziale={dati} />;
}
