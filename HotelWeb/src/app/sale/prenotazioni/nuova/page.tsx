import { datiContesto } from "../../actions";
import { NuovaPrenotazioneSala } from "./NuovaPrenotazioneSala";

/** Dal planning arrivano sala, giorno e fascia della cella cliccata. */
export default async function NuovaPage({ searchParams }: { searchParams: Promise<{ sala?: string; giorno?: string; fascia?: string }> }) {
  const p = await searchParams;
  return <NuovaPrenotazioneSala contestoIniziale={await datiContesto()} sala={p.sala ?? ""} giorno={p.giorno ?? ""} fascia={p.fascia ?? ""} />;
}
