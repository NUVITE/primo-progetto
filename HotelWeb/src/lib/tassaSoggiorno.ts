import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * MOTORE UNICO della tassa di soggiorno (modello approvato il 2026-09-29, regole reali in
 * TASSA_SOGGIORNO_REGOLAMENTI.md). Nessuna aliquota, soglia o esenzione va scritta fuori da qui.
 *
 * Unità di calcolo: la POSIZIONE di un ospite in una prenotazione (tutte le sue notti, anche su
 * più camere). Finché la posizione non è definitiva (check-out) la tassa si ricalcola da zero a
 * ogni modifica: soggiorno allungato, dichiarazione consegnata dopo l'arrivo, compleanno durante
 * il soggiorno, ecc. Ogni notte riceve un esito e l'importo; la regola applicata resta tracciata.
 *
 * Interpretazione adottata per i tetti (documentata qui perché i regolamenti dicono "il contributo
 * è applicato fino a N pernottamenti"): contano le notti effettivamente TASSATE (anche ridotte),
 * non quelle esenti.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export type EsitoTassa =
  | "tassata"
  | "ridotta"
  | "esente"
  | "oltre_tetto"
  | "oltre_tetto_annuo"
  | "residente"
  | "fuori_stagione"
  | "tariffa_mancante";

export const ETICHETTA_ESITO: Record<EsitoTassa, string> = {
  tassata: "Tassata",
  ridotta: "Ridotta",
  esente: "Esente",
  oltre_tetto: "Oltre il tetto di notti",
  oltre_tetto_annuo: "Oltre il tetto annuo",
  residente: "Residente (fuori campo)",
  fuori_stagione: "Fuori stagione",
  tariffa_mancante: "Tariffa mancante",
};

const GIORNO_MS = 24 * 60 * 60 * 1000;

function etaAllaData(dataNascita: Date, data: Date): number {
  let eta = data.getUTCFullYear() - dataNascita.getUTCFullYear();
  const compleannoGiaPassato =
    data.getUTCMonth() > dataNascita.getUTCMonth() ||
    (data.getUTCMonth() === dataNascita.getUTCMonth() &&
      data.getUTCDate() >= dataNascita.getUTCDate());
  if (!compleannoGiaPassato) eta -= 1;
  return eta;
}

function meseGiorno(data: Date): string {
  return `${String(data.getUTCMonth() + 1).padStart(2, "0")}-${String(data.getUTCDate()).padStart(2, "0")}`;
}

function dentroStagione(
  data: Date,
  dal: string | null,
  al: string | null,
): boolean {
  if (!dal || !al) return true;
  const md = meseGiorno(data);
  // Finestra che attraversa il capodanno (es. 11-01..02-28) gestita come unione di due tratti.
  return dal <= al ? md >= dal && md <= al : md >= dal || md <= al;
}

function versioneValida<T extends { validoDal: Date; validoAl: Date | null }>(
  versioni: T[],
  data: Date,
): T | null {
  return (
    versioni.find(
      (v) => v.validoDal <= data && (!v.validoAl || v.validoAl >= data),
    ) ?? null
  );
}

async function versioniDelComune(db: Db, comuneId: number) {
  return db.regolamentoTassa.findMany({
    where: { comuneId },
    include: { tariffe: true, regole: true },
    orderBy: { validoDal: "asc" },
  });
}

type Versione = Awaited<ReturnType<typeof versioniDelComune>>[number];

function tariffaPerCategoria(versione: Versione, categoria: string | null) {
  return (
    versione.tariffe.find((t) => t.categoria === categoria) ??
    versione.tariffe.find((t) => t.predefinita) ??
    null
  );
}

/** Posizione tassa di un ospite in una prenotazione (creata al primo uso). */
export async function posizioneTassa(
  db: Db,
  prenotazioneId: number,
  ospiteId: number,
) {
  return db.posizioneTassa.upsert({
    where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
    update: {},
    create: { prenotazioneId, ospiteId },
  });
}

/** Da chiamare prima di modificare soggiorno o dati tassa di un ospite: una posizione chiusa non si tocca. */
export async function verificaPosizioneAperta(
  db: Db,
  prenotazioneId: number,
  ospiteId: number,
) {
  const p = await db.posizioneTassa.findUnique({
    where: { prenotazioneId_ospiteId: { prenotazioneId, ospiteId } },
  });
  if (p?.definitiva) {
    throw new Error(
      "Il soggiorno di questo ospite è chiuso (tassa definitiva): va riaperto prima di modificarlo.",
    );
  }
}

/**
 * Ricalcola da zero la tassa di tutte le notti di un ospite in una prenotazione. Non fa nulla se la
 * posizione è definitiva. Va chiamata dopo ogni modifica che può cambiarla.
 */
export async function ricalcolaTassaPosizione(
  db: Db,
  prenotazioneId: number,
  ospiteId: number,
) {
  const posizione = await posizioneTassa(db, prenotazioneId, ospiteId);
  if (posizione.definitiva) return;

  const [prenotazione, ospite, dichiarazioni] = await Promise.all([
    db.prenotazione.findUniqueOrThrow({
      where: { id: prenotazioneId },
      include: { hotel: true },
    }),
    db.ospite.findUniqueOrThrow({ where: { id: ospiteId } }),
    db.dichiarazioneTassa.findMany({
      where: { posizioneId: posizione.id },
      include: { regola: true },
    }),
  ]);
  // Le notti di una persona sono quelle delle camere in cui ha una Presenza, limitate al suo periodo
  // (può arrivare dopo o partire prima degli altri occupanti).
  const tutteLePresenze = await db.presenza.findMany({
    where: { ospiteId, segmento: { prenotazioneId } },
    include: { segmento: { include: { notti: { orderBy: { data: "asc" } } } } },
  });
  // Le camere annullate non pagano la tassa: le loro righe si cancellano e non si ricalcolano.
  const presenze = tutteLePresenze.filter((p) => p.segmento.stato !== "ANNULLATO");
  const nottiDi = (p: (typeof presenze)[number]) =>
    p.segmento.notti.filter((n) => (!p.dal || n.data >= p.dal) && (!p.al || n.data < p.al)).map((n) => ({ ...n, presenzaId: p.id }));
  const notti = presenze.flatMap(nottiDi);

  await db.tassaNotte.deleteMany({ where: { presenzaId: { in: tutteLePresenze.map((p) => p.id) } } });
  if (notti.length === 0) return;

  // Ogni catena di presenze (una camera e i suoi eventuali cambi camera) è la sequenza di notti di
  // UNA persona. Nelle prenotazioni veloci più camere sono intestate a chi prenota finché al
  // check-in non si indicano gli ospiti: contarle insieme farebbe scattare i tetti troppo presto.
  const perSegmento = new Map(presenze.map((p) => [p.segmentoId, p]));
  const successore = new Map(
    presenze
      .filter((p) => p.segmento.segmentoPrecedenteId && perSegmento.has(p.segmento.segmentoPrecedenteId))
      .map((p) => [perSegmento.get(p.segmento.segmentoPrecedenteId!)!.id, p]),
  );
  const catene = presenze
    .filter((p) => !p.segmento.segmentoPrecedenteId || !perSegmento.has(p.segmento.segmentoPrecedenteId))
    .map((inizio) => {
      const nottiCatena = nottiDi(inizio);
      for (let p = successore.get(inizio.id); p; p = successore.get(p.id)) nottiCatena.push(...nottiDi(p));
      return nottiCatena.sort((x, y) => x.data.getTime() - y.data.getTime());
    });

  const versioni = await versioniDelComune(db, prenotazione.hotel.comuneId);

  // Notti già tassate dall'ospite in questa struttura, stesso anno, in ALTRE prenotazioni (tetto annuo).
  const anni = [...new Set(notti.map((n) => n.data.getUTCFullYear()))];
  const tassateAltrove: Record<number, number> = {};
  for (const anno of anni) {
    tassateAltrove[anno] = await db.tassaNotte.count({
      where: {
        esito: { in: ["tassata", "ridotta"] },
        notte: {
          data: {
            gte: new Date(Date.UTC(anno, 0, 1)),
            lte: new Date(Date.UTC(anno, 11, 31)),
          },
        },
        presenza: {
          ospiteId,
          segmento: { prenotazione: { hotelId: prenotazione.hotelId }, prenotazioneId: { not: prenotazioneId } },
        },
      },
    });
  }

  const dichiarazioniAttive = (data: Date, codici: string[]) =>
    dichiarazioni.filter(
      (d) =>
        codici.includes(d.regola.codice) &&
        (!d.dal || d.dal <= data) &&
        (!d.al || data < d.al),
    );

  const tassateNellAnno: Record<number, number> = {};
  const righe: Prisma.TassaNotteCreateManyInput[] = [];

  for (const nottiCatena of catene) {
    let consecutiveTassate = 0;
    let precedente: Date | null = null;
    let primaSerie = true;

    for (const notte of nottiCatena) {
      const data = notte.data;
      const versione = versioneValida(versioni, data);
      if (!versione) {
        precedente = data;
        continue; // nessuna tassa in vigore quel giorno (es. Andria): nessuna riga
      }

      // Serie di notti consecutive: si interrompe con un buco o (se previsto) al 1° gennaio.
      const cambioAnno =
        precedente &&
        versione.azzeraAnnoSolare &&
        precedente.getUTCFullYear() !== data.getUTCFullYear();
      if (
        precedente &&
        (data.getTime() - precedente.getTime() > GIORNO_MS || cambioAnno)
      ) {
        consecutiveTassate = 0;
        primaSerie = false;
      }
      precedente = data;

      const tariffa = tariffaPerCategoria(
        versione,
        prenotazione.hotel.categoria,
      );
      if (
        primaSerie &&
        consecutiveTassate === 0 &&
        tariffa?.modoTetto === "consecutive_anche_altrove"
      ) {
        consecutiveTassate = posizione.nottiPrecedentiAltrove;
      }

      const riga = (
        esito: EsitoTassa,
        importo: number,
        regolaId: number | null = null,
      ) =>
        righe.push({
          presenzaId: notte.presenzaId,
          notteId: notte.id,
          regolamentoId: versione.id,
          tariffaId: tariffa?.id ?? null,
          regolaId,
          esito,
          importo,
        });

      if (
        !dentroStagione(data, versione.stagionalitaDal, versione.stagionalitaAl)
      ) {
        riga("fuori_stagione", 0);
        continue;
      }
      if (posizione.residente && versione.esclusiResidenti) {
        riga("residente", 0);
        continue;
      }
      if (!tariffa) {
        riga("tariffa_mancante", 0);
        continue;
      }

      // Esenzioni automatiche per età, notte per notte (il compleanno durante il soggiorno conta).
      if (ospite.dataNascita) {
        const eta = etaAllaData(ospite.dataNascita, data);
        const perEta = versione.regole.find(
          (r) =>
            r.tipo === "eta" &&
            ((r.etaSotto !== null && eta < r.etaSotto) ||
              (r.etaDa !== null && eta >= r.etaDa)),
        );
        if (perEta) {
          riga("esente", 0, perEta.id);
          continue;
        }
      }

      // Le dichiarazioni si agganciano per codice: restano valide anche se cambia la versione del regolamento.
      const codici = (tipo: string) =>
        versione.regole.filter((r) => r.tipo === tipo).map((r) => r.codice);
      const esenzione = dichiarazioniAttive(data, codici("dichiarata"))[0];
      if (esenzione) {
        riga(
          "esente",
          0,
          versione.regole.find((r) => r.codice === esenzione.regola.codice)!.id,
        );
        continue;
      }

      if (
        tariffa.tettoNotti !== null &&
        consecutiveTassate >= tariffa.tettoNotti
      ) {
        riga("oltre_tetto", 0);
        continue;
      }

      const anno = data.getUTCFullYear();
      const tettoAnnuo = dichiarazioniAttive(data, codici("tetto_annuo"))[0];
      if (tettoAnnuo) {
        const regola = versione.regole.find(
          (r) => r.codice === tettoAnnuo.regola.codice,
        )!;
        const giaNellAnno =
          posizione.nottiAnnoDichiarate +
          (tassateAltrove[anno] ?? 0) +
          (tassateNellAnno[anno] ?? 0);
        if (
          regola.nottiTettoAnnuo !== null &&
          giaNellAnno >= regola.nottiTettoAnnuo
        ) {
          riga("oltre_tetto_annuo", 0, regola.id);
          continue;
        }
      }

      // Riduzioni: non cumulabili, vale la più favorevole.
      const riduzioni = dichiarazioniAttive(data, codici("riduzione"))
        .map((d) => versione.regole.find((r) => r.codice === d.regola.codice)!)
        .sort(
          (a, b) =>
            (b.percentualeRiduzione ?? 0) - (a.percentualeRiduzione ?? 0),
        );
      const importoPieno = Number(tariffa.importo);
      if (riduzioni[0]?.percentualeRiduzione) {
        const perc = riduzioni[0].percentualeRiduzione;
        riga(
          "ridotta",
          Math.round(importoPieno * (100 - perc)) / 100,
          riduzioni[0].id,
        );
      } else {
        riga("tassata", importoPieno);
      }
      consecutiveTassate += 1;
      tassateNellAnno[anno] = (tassateNellAnno[anno] ?? 0) + 1;
    }
  }

  if (righe.length) await db.tassaNotte.createMany({ data: righe });
}

/**
 * Stima per UNA persona senza esenzioni (usata mentre si compila una prenotazione, quando gli
 * ospiti non sono ancora noti): notti tassabili entro il tetto, importo e tariffa della prima notte.
 */
export async function stimaTassaPersona(
  db: Db,
  hotel: { comuneId: number; categoria: string | null },
  notti: Date[],
) {
  const versioni = await versioniDelComune(db, hotel.comuneId);
  let importo = 0;
  let nottiTassabili = 0;
  let riferimento: { aliquota: number; tettoNotti: number | null } | null =
    null;
  for (const data of notti) {
    const versione = versioneValida(versioni, data);
    if (
      !versione ||
      !dentroStagione(data, versione.stagionalitaDal, versione.stagionalitaAl)
    )
      continue;
    const tariffa = tariffaPerCategoria(versione, hotel.categoria);
    if (!tariffa) continue;
    riferimento ??= {
      aliquota: Number(tariffa.importo),
      tettoNotti: tariffa.tettoNotti,
    };
    if (tariffa.tettoNotti !== null && nottiTassabili >= tariffa.tettoNotti)
      continue;
    nottiTassabili += 1;
    importo += Number(tariffa.importo);
  }
  return { importo, nottiTassabili, riferimento };
}
