import { datiRuoli } from "./actions";
import { GestioneRuoli } from "./GestioneRuoli";

export default async function RuoliPage() {
  const dati = await datiRuoli();
  return <GestioneRuoli iniziale={dati} />;
}
