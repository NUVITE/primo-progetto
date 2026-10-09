/**
 * Collaudo dello stato dei backup notturni (punto 8, parte D) visto dall'app: giudizio (a posto, da
 * controllare, attenzione, non installati), lettura di stato.json, delle copie conservate e dell'ultimo
 * scarico sul PC da una cartella di prova con lo stesso formato del server. Gli script del server
 * (deploy/backup/) si collaudano a parte nel container del database.
 *   npx tsx scripts/collaudo-backup.ts
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { quandoDaNome, valutaBackup, type StatoFile } from "../src/lib/backupRegole";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};

async function main() {
  const ora = new Date("2026-10-08T10:00:00+02:00");
  const ore = (h: number) => new Date(ora.getTime() - h * 3_600_000);
  const ok: StatoFile = { quando: ore(7).toISOString(), esito: "ok", messaggio: "copia verificata", file: "x", dimensione: 150000, tabelle: 89, giornalieri: 14, settimanali: 8, mensili: 4 };

  verifica(
    "Nome della copia: ora italiana, legale d'estate e solare d'inverno",
    quandoDaNome("hotelweb-20261008-0300.sql.gz")?.toISOString() === "2026-10-08T01:00:00.000Z" &&
      quandoDaNome("hotelweb-20261208-0300.sql.gz")?.toISOString() === "2026-12-08T02:00:00.000Z" &&
      quandoDaNome("altro.sql.gz") === null,
  );
  verifica("Niente installato: assente", valutaBackup(null, null, null, ora).livello === "assente");
  verifica("Backup di stanotte e copia sul PC di ieri: a posto", valutaBackup(ok, ore(7), ore(20), ora).livello === "ok");
  const vecchio = valutaBackup(ok, ore(30), ore(20), ora);
  verifica("Ultimo backup di 30 ore fa: attenzione", vecchio.livello === "errore" && vecchio.messaggi[0].includes("30 ore"), vecchio);
  const fallito = valutaBackup({ ...ok, esito: "errore", messaggio: "database non raggiungibile" }, ore(7), ore(20), ora);
  verifica("Ultimo backup fallito: attenzione con il motivo", fallito.livello === "errore" && fallito.messaggi[0].includes("database non raggiungibile"), fallito);
  const pc = valutaBackup(ok, ore(7), ore(24 * 5), ora);
  verifica("Copia sul PC ferma da 5 giorni: da controllare", pc.livello === "avviso" && pc.messaggi[0].includes("5 giorni"), pc);
  verifica("Copia sul PC mai fatta: da controllare", valutaBackup(ok, ore(7), null, ora).livello === "avviso");

  // Lettura dei file, nello stesso formato degli script del server.
  const dir = await mkdtemp(join(tmpdir(), "collaudo-backup-"));
  try {
    for (const d of ["giornalieri", "settimanali", "mensili"]) await mkdir(join(dir, d));
    for (const n of ["hotelweb-20261006-0300.sql.gz", "hotelweb-20261007-0300.sql.gz", "hotelweb-20261008-0302.sql.gz"]) await writeFile(join(dir, "giornalieri", n), "x");
    await writeFile(join(dir, "giornalieri", "appunti.txt"), "x");
    await writeFile(join(dir, "settimanali", "hotelweb-20261004-0300.sql.gz"), "x");
    await writeFile(join(dir, "mensili", "hotelweb-20261001-0300.sql.gz"), "x");
    await writeFile(join(dir, "stato.json"), JSON.stringify({ ...ok, quando: "2026-10-08T03:02:10+02:00", file: "hotelweb-20261008-0302.sql.gz" }));
    await writeFile(join(dir, "ultima-copia-pc"), JSON.stringify({ quando: "2026-10-08T09:01:00+02:00", file: "hotelweb-20261008-0302.sql.gz" }));
    process.env.BACKUP_DIR = dir;
    process.env.BACKUP_REGISTRO_PC = join(dir, "ultima-copia-pc");
    // Import dopo aver impostato l'ambiente: i percorsi si leggono al caricamento.
    const { statoBackup } = await import("../src/lib/backup");
    const s = await statoBackup(ora);
    verifica(
      "Stato letto dai file: ultimo riuscito dallo stato, copie contate (solo quelle col nome giusto), copia sul PC",
      s.configurato && s.ultimoRiuscito === "2026-10-08T01:02:10.000Z" && s.copie.giornalieri === 3 && s.copie.settimanali === 1 && s.copie.mensili === 1 &&
        s.copie.piuVecchia === "hotelweb-20261001-0300.sql.gz" && s.copiaPc?.file === "hotelweb-20261008-0302.sql.gz" && s.valutazione.livello === "ok",
      s,
    );
    // Ultimo backup fallito: l'ultimo riuscito resta la copia più recente conservata.
    await writeFile(join(dir, "stato.json"), JSON.stringify({ ...ok, quando: "2026-10-08T03:02:10+02:00", esito: "errore", messaggio: "copia interrotta prima della fine", file: "" }));
    const f = await statoBackup(ora);
    verifica("Backup di stanotte fallito: segnalato, e l'ultimo riuscito è la copia più recente", f.valutazione.livello === "errore" && !!f.ultimoRiuscito?.startsWith("2026-10-08T01:02"), f.valutazione);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate (cartella di prova cancellata)");
  process.exit(falliti ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
