/**
 * Collaudo della tipologia della struttura: elenco e validazione, nomi delle unità (camera o
 * appartamento), salvataggio dalla pagina del fornitore (valore non previsto rifiutato), case per
 * ferie riconosciute dalla migrazione. Primo hotel; la tipologia torna com'era.
 *   npx tsx scripts/collaudo-tipologie.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { GRUPPI_TIPOLOGIA, nomeTipologia, TIPOLOGIE, tipologiaValida, unitaDi } from "../src/lib/tipologie";
import { aggiornaHotel, type DatiHotel } from "../src/lib/hotel";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};
async function errore(fn: () => Promise<unknown>) {
  try {
    await fn();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main() {
  verifica("Ogni tipologia appartiene a un gruppo previsto", Object.values(TIPOLOGIE).every((t) => t.gruppo in GRUPPI_TIPOLOGIA));
  verifica("Niente ostelli né campeggi (si vende il posto letto o la piazzola)", !("ostello" in TIPOLOGIE) && !("campeggio" in TIPOLOGIE));
  verifica("Tipologia non prevista: rifiutata", !!(await errore(async () => tipologiaValida("ostello"))));
  verifica("Unità: camera per B&B e albergo, appartamento per case vacanze e residence", unitaDi("bb").plurale === "camere" && unitaDi("albergo").singolare === "camera" && unitaDi("casa_vacanze").plurale === "appartamenti" && unitaDi("residence").singolare === "appartamento");
  verifica("Valore sconosciuto (dati vecchi): nome = codice, unità = camera", nomeTipologia("boh") === "boh" && unitaDi("boh").singolare === "camera");

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  const t = (s: string | null) => s ?? "";
  const dati: DatiHotel = {
    nome: hotel.nome,
    comuneId: hotel.comuneId,
    tipologia: hotel.tipologia,
    categoria: t(hotel.categoria),
    ragioneSociale: t(hotel.ragioneSociale),
    partitaIva: t(hotel.partitaIva),
    codiceFiscale: t(hotel.codiceFiscale),
    indirizzo: t(hotel.indirizzo),
    cap: t(hotel.cap),
    telefono: t(hotel.telefono),
    email: t(hotel.email),
    pec: t(hotel.pec),
    sistemaIstat: t(hotel.sistemaIstat),
  };
  try {
    verifica("Salvataggio con tipologia non prevista: rifiutato", !!(await errore(() => aggiornaHotel(hotel.id, { ...dati, tipologia: "campeggio" }))));
    await aggiornaHotel(hotel.id, { ...dati, tipologia: "bb" });
    const dopo = await prisma.hotel.findUniqueOrThrow({ where: { id: hotel.id } });
    verifica("Salvata la tipologia B&B, il resto invariato", dopo.tipologia === "bb" && dopo.nome === hotel.nome && dopo.categoria === hotel.categoria);
  } finally {
    await prisma.hotel.update({ where: { id: hotel.id }, data: { tipologia: hotel.tipologia } });
  }
  const casePerFerie = await prisma.hotel.findMany({ where: { nome: { startsWith: "Casa per ferie" } }, select: { tipologia: true } });
  verifica("Strutture con nome 'Casa per ferie…': tipologia casa per ferie dalla migrazione", casePerFerie.every((h) => h.tipologia === "casa_per_ferie"), casePerFerie);

  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (tipologia dell'hotel ripristinata)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
