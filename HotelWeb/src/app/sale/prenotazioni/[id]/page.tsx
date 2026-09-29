import { datiContesto, datiDettaglioSala } from "../../actions";
import { DettaglioPrenotazioneSala } from "./DettaglioPrenotazioneSala";

export default async function DettaglioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { dettaglio, puoGestire } = await datiDettaglioSala(Number(id));
  return <DettaglioPrenotazioneSala iniziale={dettaglio} contestoIniziale={puoGestire ? await datiContesto() : null} />;
}
