/** Portineria: consegne fra turni e reclami (dati e funzioni pure, usabili anche dalle pagine). */

export const CATEGORIE_RECLAMO = {
  camera: "Camera (comfort, arredi, impianti)",
  pulizia: "Pulizia",
  rumore: "Rumore",
  ristorazione: "Ristorazione",
  personale: "Personale",
  servizi: "Servizi dell'hotel (wi-fi, parcheggio, piscina…)",
  conto: "Conto e prezzi",
  prenotazione: "Prenotazione (camera diversa, attese)",
  altro: "Altro",
} as const;
export type CategoriaReclamo = keyof typeof CATEGORIE_RECLAMO;

export const STATI_RECLAMO = { aperto: "Aperto", risolto: "Risolto" } as const;

/** Le quattro fasi del libro, come promemoria nella pagina. */
export const FASI_RECLAMO = [
  "Ascoltare senza interrompere e prendere nota",
  "Scusarsi a nome dell'hotel, senza dare colpe",
  "Risolvere subito o dire quando e come",
  "Analizzare la causa perché non si ripeta",
] as const;

/** Per quanti giorni una consegna resta "da leggere" in cima all'app (dopo resta solo nell'elenco). */
export const GIORNI_CONSEGNA_IN_EVIDENZA = 3;

export function validaTesto(testo: string, cosa: string, max = 2000) {
  if (!testo.trim()) throw new Error(`Scrivi ${cosa}.`);
  if (testo.length > max) throw new Error(`Testo troppo lungo (massimo ${max} caratteri).`);
}

type PerRiepilogo = { categoria: string; stato: string; creatoIl: Date; risoltoIl: Date | null; abbuono: number | null };

/** Riepilogo per la direzione: per categoria, aperti, tempo medio di soluzione e abbuoni concessi. */
export function riepilogoReclami(reclami: PerRiepilogo[]) {
  const risolti = reclami.filter((r) => r.risoltoIl);
  const ore = risolti.map((r) => (r.risoltoIl!.getTime() - r.creatoIl.getTime()) / 3600000);
  const perCategoria = (Object.keys(CATEGORIE_RECLAMO) as CategoriaReclamo[])
    .map((c) => ({ categoria: c, totale: reclami.filter((r) => r.categoria === c).length, aperti: reclami.filter((r) => r.categoria === c && r.stato === "aperto").length }))
    .filter((x) => x.totale > 0)
    .sort((a, b) => b.totale - a.totale);
  return {
    totale: reclami.length,
    aperti: reclami.filter((r) => r.stato === "aperto").length,
    oreMedieSoluzione: ore.length ? Math.round((ore.reduce((t, x) => t + x, 0) / ore.length) * 10) / 10 : null,
    abbuoni: Math.round(reclami.reduce((t, r) => t + (r.abbuono ?? 0), 0) * 100) / 100,
    perCategoria,
  };
}
