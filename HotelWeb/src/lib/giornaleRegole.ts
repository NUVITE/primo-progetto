/**
 * Giornale d'albergo (main courante, libro p. 328): per ogni prenotazione gli addebiti del giorno
 * divisi per reparto e gli accrediti (pagamenti); alla fine la chiusura contabile, cioè i totali per
 * reparto. Funzioni pure, usabili anche dalle pagine.
 */

/** Movimento del giorno di una prenotazione: colonna = "Alloggio", nome del reparto, "Esborsi", "Abbuoni", "Tassa di soggiorno". */
export type MovimentoGiornale = { prenotazioneId: number; colonna: string; importo: number };
export type AccreditoGiornale = { prenotazioneId: number; importo: number };
export type IntestazioneRiga = { prenotazioneId: number; camere: string; ospite: string };

export const COLONNE_FISSE_INIZIO = ["Alloggio"];
export const COLONNE_FISSE_FINE = ["Esborsi", "Abbuoni", "Tassa di soggiorno"];
const arrotonda = (n: number) => Math.round(n * 100) / 100;
const senzaCamera = (camere: string) => camere === "—" || camere.startsWith("(");

/** Righe, colonne nell'ordine del libro (alloggio, reparti, esborsi, abbuoni, tassa) e totali. */
export function componiGiornale(intestazioni: IntestazioneRiga[], movimenti: MovimentoGiornale[], accrediti: AccreditoGiornale[]) {
  const reparti = [...new Set(movimenti.map((m) => m.colonna).filter((c) => !COLONNE_FISSE_INIZIO.includes(c) && !COLONNE_FISSE_FINE.includes(c)))].sort((a, b) => a.localeCompare(b));
  const presenti = new Set(movimenti.map((m) => m.colonna));
  // Alloggio sempre; le altre colonne solo se nel giorno c'è almeno un movimento.
  const colonne = [...COLONNE_FISSE_INIZIO, ...reparti, ...COLONNE_FISSE_FINE.filter((c) => presenti.has(c))];
  const righe = intestazioni
    .map((h) => {
      const importi = Object.fromEntries(colonne.map((c) => [c, arrotonda(movimenti.filter((m) => m.prenotazioneId === h.prenotazioneId && m.colonna === c).reduce((t, m) => t + m.importo, 0))]));
      const addebiti = arrotonda(Object.values(importi).reduce((t, x) => t + x, 0));
      const accreditato = arrotonda(accrediti.filter((a) => a.prenotazioneId === h.prenotazioneId).reduce((t, a) => t + a.importo, 0));
      return { ...h, importi, addebiti, accrediti: accreditato };
    })
    .filter((r) => r.addebiti !== 0 || r.accrediti !== 0 || Object.values(r.importi).some((x) => x !== 0))
    // In ordine di camera; le prenotazioni senza camera assegnata ("—" o "(tipo)") in fondo.
    .sort((a, b) => Number(senzaCamera(a.camere)) - Number(senzaCamera(b.camere)) || a.camere.localeCompare(b.camere, "it", { numeric: true }));
  const totali = Object.fromEntries(colonne.map((c) => [c, arrotonda(righe.reduce((t, r) => t + r.importi[c], 0))]));
  return {
    colonne,
    righe,
    totali,
    totaleAddebiti: arrotonda(righe.reduce((t, r) => t + r.addebiti, 0)),
    totaleAccrediti: arrotonda(righe.reduce((t, r) => t + r.accrediti, 0)),
  };
}
