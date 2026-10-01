"use server";

import { puo, richiediPermesso } from "@/lib/auth";
import { conEsito } from "@/lib/esito";
import { PERMESSI } from "@/lib/permessi";
import { configRendiconto, csvOspiti, periodiAnno, rendicontoTassa } from "@/lib/rendicontoTassa";

/** Il rendiconto mostra importi: serve anche il permesso di vederli. */
async function utente() {
  const u = await richiediPermesso(PERMESSI.ADEMPIMENTI_INVIA);
  if (!puo(u, PERMESSI.IMPORTI_VEDI)) throw new Error("Per il rendiconto della tassa serve anche il permesso «Vedere importi».");
  return u;
}

const oggi = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());

/** Periodo scelto (codice "aaaa-T1" / "aaaa-S2" / "aaaa-A"); di default l'ultimo concluso. */
export async function datiRendiconto(codice?: string) {
  const u = await utente();
  const cfg = await configRendiconto(u.hotelId);
  const adesso = oggi();
  const anno = codice ? Number(codice.slice(0, 4)) : Number(adesso.slice(0, 4));
  const periodi = [...periodiAnno(anno - 1, cfg), ...periodiAnno(anno, cfg)];
  const scelto =
    periodi.find((p) => p.codice === codice) ??
    // l'ultimo periodo (non annuale) già concluso: è quello da presentare
    [...periodi].reverse().find((p) => !p.codice.endsWith("-A") && p.al < adesso) ??
    periodi[0];
  const r = await rendicontoTassa(u.hotelId, scelto.dal, scelto.al);
  return {
    cfg,
    oggi: adesso,
    anni: [anno - 1, anno, anno + 1].filter((a) => a <= Number(adesso.slice(0, 4))),
    periodi: periodi.filter((p) => p.dal <= adesso),
    periodo: scelto,
    inCorso: scelto.al >= adesso,
    ...r,
  };
}

export async function azionePeriodo(codice: string) {
  return conEsito(() => datiRendiconto(codice));
}

export async function azioneCsv(codice: string) {
  return conEsito(async () => {
    const d = await datiRendiconto(codice);
    return { nome: `tassa-soggiorno_${d.periodo.codice}.csv`, testo: csvOspiti(d) };
  });
}
