import { datiListini } from "../actions";
import { GestioneListini } from "./GestioneListini";

export default async function ListiniPage() {
  return <GestioneListini iniziale={await datiListini()} />;
}
