/**
 * Lettura dello stato dei backup notturni dal server (file scritti dagli script in deploy/backup/):
 * stato.json dell'ultimo backup, nomi delle copie conservate, ora dell'ultimo scarico sul PC.
 * L'app legge solo i nomi dei file e lo stato, non il contenuto delle copie.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { quandoDaNome, valutaBackup, type StatoFile } from "@/lib/backupRegole";

// In produzione i percorsi fissi del server; in sviluppo solo se indicati nell'ambiente.
const produzione = process.env.NODE_ENV === "production";
const CARTELLA = process.env.BACKUP_DIR ?? (produzione ? "/opt/hotelweb/backups/notturni" : null);
const REGISTRO_PC = process.env.BACKUP_REGISTRO_PC ?? (produzione ? "/var/lib/hotelweb-backup/ultima-copia-pc" : null);

async function leggiJson<T>(percorso: string | null): Promise<T | null> {
  if (!percorso) return null;
  try {
    return JSON.parse(await readFile(percorso, "utf8")) as T;
  } catch {
    return null;
  }
}

async function nomi(cartella: string) {
  try {
    return (await readdir(cartella)).filter((n) => quandoDaNome(n)).sort().reverse();
  } catch {
    return [];
  }
}

export async function statoBackup(ora = new Date()) {
  const stato = CARTELLA ? await leggiJson<StatoFile>(join(CARTELLA, "stato.json")) : null;
  const [giornalieri, settimanali, mensili] = CARTELLA ? await Promise.all(["giornalieri", "settimanali", "mensili"].map((d) => nomi(join(CARTELLA, d)))) : [[], [], []];
  // L'ultimo riuscito è la copia più recente conservata (le copie fallite non restano).
  const ultimoRiuscito = giornalieri[0] ? (stato?.esito === "ok" && stato.file === giornalieri[0] ? new Date(stato.quando) : quandoDaNome(giornalieri[0])) : null;
  const pc = await leggiJson<{ quando: string; file: string }>(REGISTRO_PC);
  const copiaPc = pc ? new Date(pc.quando) : null;
  return {
    configurato: !!CARTELLA,
    stato,
    ultimoRiuscito: ultimoRiuscito?.toISOString() ?? null,
    copie: { giornalieri: giornalieri.length, settimanali: settimanali.length, mensili: mensili.length, piuVecchia: [...giornalieri, ...settimanali, ...mensili].sort()[0] ?? null },
    copiaPc: pc ? { quando: pc.quando, file: pc.file } : null,
    valutazione: valutaBackup(stato, ultimoRiuscito, copiaPc, ora),
  };
}
