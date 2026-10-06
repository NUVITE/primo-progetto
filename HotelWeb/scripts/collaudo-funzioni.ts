/**
 * Collaudo delle funzioni attivabili e dei nomi delle unità: normalizzazione, menu che nasconde le
 * funzioni spente e chiama "appartamenti" le unità delle case vacanze, salvataggio delle funzioni
 * spente (valori non previsti rifiutati, doppioni tolti). Primo hotel; le funzioni tornano com'erano.
 *   npx tsx scripts/collaudo-funzioni.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { conUnita, funzioneAttiva, funzioniSpente } from "../src/lib/funzioniRegole";
import { unitaDi } from "../src/lib/tipologie";
import { menuVisibile } from "../src/app/menu";
import { TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { funzioniDellaStruttura, impostaFunzioniSpente } from "../src/lib/funzioni";

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
  verifica("Valore salvato: solo funzioni note (null = nessuna spenta)", funzioniSpente(null).length === 0 && funzioniSpente(["gruppi", "boh", 3]).join() === "gruppi");
  verifica("Funzione attiva / spenta", funzioneAttiva([], "agenzie") && !funzioneAttiva(["agenzie"], "agenzie"));
  verifica("Nomi delle unità", conUnita("Planning {camere} · {Camera} 1", unitaDi("casa_vacanze")) === "Planning appartamenti · Appartamento 1" && conUnita("{Camere}", unitaDi("bb")) === "Camere");

  const voci = (spente: string[], tipologia: string) => menuVisibile(TUTTI_I_PERMESSI, false, [], spente, unitaDi(tipologia)).flatMap((g) => g.voci);
  const tutto = voci([], "albergo");
  verifica("Menu con tutto acceso: agenzie e preventivi ci sono, planning delle camere", tutto.some((v) => v.href === "/agenzie") && tutto.some((v) => v.href === "/preventivi") && tutto.some((v) => v.label === "Planning camere"));
  const casa = voci(["agenzie", "preventivi"], "casa_vacanze");
  verifica(
    "Casa vacanze con agenzie e preventivi spenti: spariscono, il planning è degli appartamenti",
    !casa.some((v) => v.href === "/agenzie" || v.href === "/preventivi") && casa.some((v) => v.label === "Planning appartamenti") && casa.some((v) => v.label === "Appartamenti"),
    casa.filter((v) => /ppartament/.test(v.label)).map((v) => v.label),
  );
  verifica("Nessuna etichetta resta con i segnaposto", casa.every((v) => !v.label.includes("{")));
  const conPulizie = (t: string) => menuVisibile(TUTTI_I_PERMESSI, false, ["pulizie"], [], unitaDi(t)).flatMap((g) => g.voci).map((v) => v.label);
  verifica("Concordanza: Le mie camere / I miei appartamenti", conPulizie("albergo").includes("Le mie camere") && conPulizie("casa_vacanze").includes("I miei appartamenti"), conPulizie("casa_vacanze").filter((l) => /miei|mie/.test(l)));

  const hotel = await prisma.hotel.findFirstOrThrow({ orderBy: { id: "asc" } });
  try {
    verifica("Funzione non prevista: rifiutata", !!(await errore(() => impostaFunzioniSpente(hotel.id, ["gruppi", "magazzino"]))));
    const r = await impostaFunzioniSpente(hotel.id, ["gruppi", "uso_diurno", "gruppi"]);
    verifica("Salvate senza doppioni e rilette uguali", r.join() === "gruppi,uso_diurno" && (await funzioniDellaStruttura(hotel.id)).join() === "gruppi,uso_diurno");
    verifica("Riaccese tutte", (await impostaFunzioniSpente(hotel.id, [])).length === 0);
  } finally {
    await prisma.hotel.update({ where: { id: hotel.id }, data: { funzioniSpente: hotel.funzioniSpente ?? undefined } });
    if (hotel.funzioniSpente === null) await prisma.$executeRaw`UPDATE Hotel SET funzioniSpente = NULL WHERE id = ${hotel.id}`;
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (funzioni dell'hotel ripristinate)");
  await prisma.$disconnect();
  process.exit(falliti ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
