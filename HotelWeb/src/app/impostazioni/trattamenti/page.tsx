import { datiTrattamenti } from "../actions";
import { GestioneTrattamenti } from "./GestioneTrattamenti";

export default async function TrattamentiPage() {
  return <GestioneTrattamenti iniziale={await datiTrattamenti()} />;
}
