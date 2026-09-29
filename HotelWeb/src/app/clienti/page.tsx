import { datiClienti } from "./actions";
import { GestioneClienti } from "./GestioneClienti";

export default async function ClientiPage() {
  return <GestioneClienti iniziale={await datiClienti()} />;
}
