/**
 * Liste ufficiali per la rilevazione ISTAT del movimento turistico, per sistema regionale.
 * Fonti (vedi ALLOGGIATI_ROSS1000_SPECIFICHE.md): Ross1000 tracciato XML v3 del 18/03/2026
 * (valore = descrizione testuale); SPOT Puglia datatype-0.6.xsd (valore = codice).
 * Si salva sempre il valore NATIVO del sistema dell'hotel: le liste non si convertono l'una nell'altra.
 */
export type SistemaIstat = "ROSS1000" | "SPOT";

export const SISTEMI_ISTAT: { valore: SistemaIstat; nome: string }[] = [
  { valore: "ROSS1000", nome: "Ross1000 (es. Lazio)" },
  { valore: "SPOT", nome: "SPOT - DMS Puglia" },
];

type Voce = { valore: string; nome: string };
const testuali = (voci: string[]): Voce[] => voci.map((v) => ({ valore: v, nome: v }));

export const LISTE_ISTAT: Record<
  SistemaIstat,
  { motivo: Voce[]; mezzoArrivo: Voce[]; mezzoMovimento: Voce[] | null; obbligatori: boolean; postoLetto: boolean }
> = {
  ROSS1000: {
    motivo: testuali([
      "Culturale",
      "Balneare",
      "Congressuale/Affari",
      "Fieristico",
      "Sportivo/Fitness",
      "Scolastico",
      "Religioso",
      "Sociale",
      "Parchi Tematici",
      "Termale/Trattamenti salute",
      "Enogastronomico",
      "Cicloturismo",
      "Escursionistico/Naturalistico",
      "Altro motivo",
      "Non specificato",
    ]),
    mezzoArrivo: testuali([
      "Auto",
      "Aereo",
      "Aereo+Pullman",
      "Aereo+Navetta/Taxi/Auto",
      "Aereo+Treno",
      "Treno",
      "Pullman",
      "Caravan/Autocaravan",
      "Barca/Nave/Traghetto",
      "Moto",
      "Bicicletta",
      "A piedi",
      "Altro mezzo",
      "Non Specificato",
    ]),
    mezzoMovimento: null,
    // Obbligatori nel tracciato, ma "Non specificato" è ammesso.
    obbligatori: true,
    postoLetto: false,
  },
  SPOT: {
    motivo: [
      { valore: "BALNEARE", nome: "Balneare" },
      { valore: "RELIGIOSO", nome: "Pellegrinaggio e religioso" },
      { valore: "SPORTIVOBENESSERE", nome: "Sport e benessere" },
      { valore: "ARTECULTURAEVENTI", nome: "Arte, cultura ed eventi" },
      { valore: "NATURA", nome: "Natura" },
      { valore: "ENOGASTRONOMIA", nome: "Enogastronomia" },
      { valore: "AFFARICONGRESSI", nome: "Affari e congressi" },
      { valore: "VISITAPARENTI", nome: "Visita a parenti e amici" },
      { valore: "PERSONALE", nome: "Altri motivi personali (es. cure mediche)" },
    ],
    mezzoArrivo: [
      { valore: "AEREOCOMPLINEA", nome: "Aereo (compagnia di linea)" },
      { valore: "AEREOCHARTLOW", nome: "Aereo (charter / low cost)" },
      { valore: "TRAGHETTO", nome: "Traghetto" },
      { valore: "NAVEPRIV", nome: "Imbarcazione privata" },
      { valore: "CROCIERA", nome: "Nave da crociera" },
      { valore: "TRENO", nome: "Treno" },
      { valore: "BUS", nome: "Autobus" },
      { valore: "AUTO", nome: "Auto" },
      { valore: "ROULOTTE", nome: "Auto con roulotte" },
      { valore: "CAMPER", nome: "Camper" },
      { valore: "BICI", nome: "Bicicletta" },
      { valore: "MOTO", nome: "Moto" },
    ],
    // Mezzo per muoversi in Puglia: stessa lista senza gli aerei.
    mezzoMovimento: null,
    // Facoltativi (ma raccomandati); non esiste "non specificato": se non si sa, si lascia vuoto.
    obbligatori: false,
    postoLetto: true,
  },
};
LISTE_ISTAT.SPOT.mezzoMovimento = LISTE_ISTAT.SPOT.mezzoArrivo.filter((v) => !v.valore.startsWith("AEREO"));

export function sistemaIstatValido(v: string | null | undefined): SistemaIstat | null {
  return v === "ROSS1000" || v === "SPOT" ? v : null;
}
