// Formati condivisi da pagine server e componenti client delle sale.
export const euro = (n: number) => `${n.toFixed(2)} €`;
export const it = (iso: string) => iso.split("-").reverse().join("/");
export const ETICHETTA_STATO: Record<string, { testo: string; classe: string }> = {
  opzione: { testo: "Opzione", classe: "bg-amber-100 text-amber-900" },
  confermata: { testo: "Confermata", classe: "bg-teal-100 text-teal-900" },
  annullata: { testo: "Annullata", classe: "bg-stone-200 text-stone-600" },
};
