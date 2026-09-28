import { datiGestioneServizi } from "./actions";
import { GestioneServizi } from "./GestioneServizi";

export default async function ServiziPage() {
  const dati = await datiGestioneServizi();
  return <GestioneServizi iniziale={dati} />;
}
