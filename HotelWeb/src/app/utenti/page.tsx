import { datiUtenti } from "./actions";
import { GestioneUtenti } from "./GestioneUtenti";

export default async function UtentiPage() {
  const dati = await datiUtenti();
  return <GestioneUtenti iniziale={dati} />;
}
