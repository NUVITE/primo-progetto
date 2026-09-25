import type { Prisma, PrismaClient } from "@/generated/prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

function etaAllaData(dataNascita: Date, data: Date): number {
  let eta = data.getFullYear() - dataNascita.getFullYear();
  const compleannoGiaPassato =
    data.getMonth() > dataNascita.getMonth() ||
    (data.getMonth() === dataNascita.getMonth() && data.getDate() >= dataNascita.getDate());
  if (!compleannoGiaPassato) eta -= 1;
  return eta;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** "MM-DD" della data, per confrontarla con la finestra stagionale del regolamento. */
function meseGiorno(data: Date): string {
  return `${pad2(data.getMonth() + 1)}-${pad2(data.getDate())}`;
}

function dataDentroFinestraStagionale(data: Date, dal: string | null, al: string | null): boolean {
  if (!dal || !al) return true; // nessuna finestra = vale tutto l'anno
  const md = meseGiorno(data);
  // Assume dal <= al nello stesso anno (nessun regolamento noto attraversa il capodanno).
  return md >= dal && md <= al;
}

/**
 * Trova il regolamento tassa di soggiorno attivo per un comune a una certa data.
 * Motore unico: nessuna aliquota/soglia va mai scritta a mano fuori da qui.
 */
export async function trovaRegolamentoAttivo(
  db: Db,
  comuneId: number,
  data: Date,
  categoriaStruttura: string | null
) {
  const regolamenti = await db.regolamentoTassaComune.findMany({
    where: {
      comuneId,
      validoDal: { lte: data },
      OR: [{ validoAl: null }, { validoAl: { gte: data } }],
    },
    include: { esenzioni: true },
  });

  const validi = regolamenti.filter((r) => dataDentroFinestraStagionale(data, r.stagionalitaDal, r.stagionalitaAl));

  // Preferisci la riga con categoria che combacia esattamente, poi quella generica (categoria = null).
  return (
    validi.find((r) => r.categoriaStruttura === categoriaStruttura) ??
    validi.find((r) => r.categoriaStruttura === null) ??
    null
  );
}

/**
 * Calcola la tassa per una singola notte già generata, tenendo conto di:
 * - esenzione per età (se l'ospite ha una data di nascita nota)
 * - tetto notti (per soggiorno: conta le notti già tassate in QUESTO segmento;
 *   per anno solare: conta le notti già tassate quest'anno per lo stesso ospite/regolamento)
 *
 * Semplificazione dichiarata: il tetto "per anno solare" guarda solo le notti
 * gia' salvate a DB per lo stesso ospite+regolamento nell'anno della data —
 * corretto per soggiorni creati in ordine cronologico, da rivedere se un
 * domani si permette di inserire soggiorni retroattivi fuori ordine.
 */
export async function calcolaTassaNotte(
  db: Db,
  params: {
    comuneId: number;
    categoriaStruttura: string | null;
    data: Date;
    ospiteId: number;
    ospiteDataNascita: Date | null;
    notteGiaContataNelSegmento: number; // quante notti tassabili precedono questa, nello stesso segmento
  }
): Promise<{ regolamentoId: number; importo: number; esente: boolean; motivoEsenzioneId: number | null } | null> {
  const regolamento = await trovaRegolamentoAttivo(db, params.comuneId, params.data, params.categoriaStruttura);
  if (!regolamento) return null; // nessuna tassa attiva per questo comune/data (es. Andria)

  // 1) Esenzione per età
  if (params.ospiteDataNascita) {
    const eta = etaAllaData(params.ospiteDataNascita, params.data);
    const motivoEta = regolamento.esenzioni.find((e) => e.etaSoglia !== null && eta < e.etaSoglia!);
    if (motivoEta) {
      return { regolamentoId: regolamento.id, importo: 0, esente: true, motivoEsenzioneId: motivoEta.id };
    }
  }

  // 2) Tetto notti
  let nottiGiaContate = params.notteGiaContataNelSegmento;
  if (regolamento.tettoNottiTipo === "per_anno_solare") {
    const inizioAnno = new Date(params.data.getFullYear(), 0, 1);
    const fineAnno = new Date(params.data.getFullYear(), 11, 31);
    nottiGiaContate = await db.tassaNotte.count({
      where: {
        regolamentoId: regolamento.id,
        esente: false,
        notte: {
          data: { gte: inizioAnno, lte: fineAnno },
          segmento: { ospiteId: params.ospiteId },
        },
      },
    });
  }

  if (nottiGiaContate >= regolamento.tettoNotti) {
    return { regolamentoId: regolamento.id, importo: 0, esente: true, motivoEsenzioneId: null };
  }

  return {
    regolamentoId: regolamento.id,
    importo: Number(regolamento.aliquota),
    esente: false,
    motivoEsenzioneId: null,
  };
}
