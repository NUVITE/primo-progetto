import { datiPiatti } from "../actions";
import { GestionePiatti } from "./GestionePiatti";

export default async function PiattiPage() {
  return <GestionePiatti iniziale={await datiPiatti()} />;
}
