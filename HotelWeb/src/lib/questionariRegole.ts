/** Questionario di gradimento: voci, validazione delle risposte e medie (funzioni pure, usabili dalle pagine). */

/** Voci del questionario (tutte facoltative: "non so" = voce assente), in italiano e inglese. */
export const VOCI_QUESTIONARIO = {
  camera: { it: "La camera", en: "Your room" },
  pulizia: { it: "Pulizia", en: "Cleanliness" },
  colazione: { it: "Colazione e ristorazione", en: "Breakfast and dining" },
  personale: { it: "Cortesia del personale", en: "Staff friendliness" },
  posizione: { it: "Posizione", en: "Location" },
  prezzo: { it: "Rapporto qualità/prezzo", en: "Value for money" },
} as const;
export type VoceQuestionario = keyof typeof VOCI_QUESTIONARIO;

/** Per quanti giorni dalla creazione si può compilare. */
export const GIORNI_VALIDITA = 90;
/** Da questo voto generale in giù il questionario resta in evidenza finché qualcuno non lo legge. */
export const VOTO_BASSO = 2;
/** Da questo voto generale in su si propone di lasciare una recensione online. */
export const VOTO_RECENSIONE = 4;
export const MAX_COMMENTO = 2000;

export type RispostaQuestionario = { generale: number; voti: Partial<Record<VoceQuestionario, number>>; consiglia: boolean | null; commento: string };

const votoValido = (n: unknown) => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 5;

/** Controlla e ripulisce le risposte (arrivano da una pagina pubblica: mai fidarsi). */
export function validaRisposta(r: RispostaQuestionario): RispostaQuestionario {
  if (!votoValido(r.generale)) throw new Error("Dia un voto complessivo da 1 a 5. / Please give an overall rating from 1 to 5.");
  const voti: Partial<Record<VoceQuestionario, number>> = {};
  for (const [k, v] of Object.entries(r.voti ?? {})) {
    if (!(k in VOCI_QUESTIONARIO) || v === null || v === undefined) continue;
    if (!votoValido(v)) throw new Error("Voto non valido. / Invalid rating.");
    voti[k as VoceQuestionario] = v;
  }
  const commento = String(r.commento ?? "").trim();
  if (commento.length > MAX_COMMENTO) throw new Error(`Il commento è troppo lungo (massimo ${MAX_COMMENTO} caratteri). / The comment is too long.`);
  return { generale: r.generale, voti, consiglia: typeof r.consiglia === "boolean" ? r.consiglia : null, commento };
}

const media = (xs: number[]) => (xs.length ? Math.round((xs.reduce((t, x) => t + x, 0) / xs.length) * 10) / 10 : null);

/** Medie dei questionari compilati: voto complessivo, per voce e quanti ci consiglierebbero. */
export function riepilogoQuestionari(compilati: { generale: number; voti: Partial<Record<VoceQuestionario, number>>; consiglia: boolean | null }[]) {
  const risposteConsiglia = compilati.filter((q) => q.consiglia !== null);
  return {
    compilati: compilati.length,
    mediaGenerale: media(compilati.map((q) => q.generale)),
    perVoce: (Object.keys(VOCI_QUESTIONARIO) as VoceQuestionario[]).map((voce) => {
      const v = compilati.map((q) => q.voti[voce]).filter((x): x is number => typeof x === "number");
      return { voce, media: media(v), risposte: v.length };
    }),
    consigliaPercentuale: risposteConsiglia.length ? Math.round((risposteConsiglia.filter((q) => q.consiglia).length / risposteConsiglia.length) * 100) : null,
  };
}
