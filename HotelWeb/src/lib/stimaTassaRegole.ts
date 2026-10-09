/**
 * Regole pure della stima della tassa di soggiorno per le persone prenotate ma non ancora registrate
 * in camera. La tassa vera si calcola solo sulle persone registrate (tassaSoggiorno.ts); finché
 * mancano persone rispetto a quelle prenotate, al loro posto si conta una stima, così il totale non
 * scende per poi risalire al check-in.
 */

/** Età compiuta a una data (null se la data di nascita non c'è). */
export function etaA(dataNascita: Date | null, data: Date): number | null {
  if (!dataNascita) return null;
  const eta = data.getUTCFullYear() - dataNascita.getUTCFullYear();
  const prima = data.getUTCMonth() < dataNascita.getUTCMonth() || (data.getUTCMonth() === dataNascita.getUTCMonth() && data.getUTCDate() < dataNascita.getUTCDate());
  return prima ? eta - 1 : eta;
}

/**
 * Persone prenotate che non hanno ancora un posto fra le registrate: per ognuna l'età all'arrivo
 * (null = adulto). Una persona registrata minorenne prende il posto del bambino prenotato con l'età
 * più vicina (se non ce ne sono, di un adulto); una registrata adulta o senza data di nascita prende
 * il posto di un adulto (se non ce ne sono, del bambino più grande).
 */
export function personeMancanti(composizione: { adulti: number; etaBambini: number[] }, etaRegistrati: (number | null)[]): (number | null)[] {
  let adulti = composizione.adulti;
  const bambini = [...composizione.etaBambini];
  const togliBambino = (eta: number) => {
    let i = 0;
    bambini.forEach((b, j) => {
      if (Math.abs(b - eta) < Math.abs(bambini[i] - eta)) i = j;
    });
    bambini.splice(i, 1);
  };
  for (const eta of etaRegistrati) {
    if (eta !== null && eta < 18) {
      if (bambini.length) togliBambino(eta);
      else if (adulti > 0) adulti -= 1;
    } else if (adulti > 0) adulti -= 1;
    else if (bambini.length) togliBambino(99);
  }
  return [...Array<null>(Math.max(0, adulti)).fill(null), ...bambini];
}
