import { datiEmail } from "./actions";
import { ImpostazioniEmail } from "./ImpostazioniEmail";

export default async function EmailPage() {
  return <ImpostazioniEmail iniziale={await datiEmail()} />;
}
