import { datiPlanningSale } from "../actions";
import { PlanningSale } from "./PlanningSale";

const GIORNI = 14;

export default async function PlanningSalePage({ searchParams }: { searchParams: Promise<{ dal?: string }> }) {
  const { dal } = await searchParams;
  const oggi = new Date().toISOString().slice(0, 10);
  const inizio = dal && /^\d{4}-\d{2}-\d{2}$/.test(dal) ? dal : oggi;
  return <PlanningSale dati={await datiPlanningSale(inizio, GIORNI)} dal={inizio} giorni={GIORNI} />;
}
