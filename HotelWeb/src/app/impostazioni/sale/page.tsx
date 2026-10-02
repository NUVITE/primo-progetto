import { datiConfigurazioneSale, datiPacchetti } from "./actions";
import { GestioneSale } from "./GestioneSale";
import { PacchettiSala } from "./PacchettiSala";

export default async function SalePage() {
  const [config, pacchetti] = await Promise.all([datiConfigurazioneSale(), datiPacchetti()]);
  return (
    <>
      <GestioneSale iniziale={config} />
      <PacchettiSala iniziale={pacchetti} />
    </>
  );
}
