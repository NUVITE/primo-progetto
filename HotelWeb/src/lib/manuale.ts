/**
 * Manuale: capitoli in docs/manuale/<operativo|tecnico>/*.md (vedi manualeRegole.ts per il formato).
 * Il manuale operativo lo vede chiunque usi il programma, ciascuno con i capitoli delle funzioni che
 * può usare; il tecnico solo il gestore della piattaforma.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { UtenteSessione } from "@/lib/auth";
import { capitoloVisibile, leggiCapitolo, testoSemplice, type Capitolo } from "@/lib/manualeRegole";

export type Manuale = "operativo" | "tecnico";
const cartella = (m: Manuale) => join(process.cwd(), "docs", "manuale", m);

export async function capitoli(m: Manuale): Promise<Capitolo[]> {
  let nomi: string[];
  try {
    nomi = (await readdir(cartella(m))).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  const tutti = await Promise.all(nomi.map(async (n) => leggiCapitolo(n, await readFile(join(cartella(m), n), "utf8"))));
  return tutti.sort((a, b) => a.ordine - b.ordine || a.titolo.localeCompare(b.titolo));
}

/** Capitoli che questo utente può leggere (il tecnico solo per il gestore della piattaforma). */
export async function capitoliPer(m: Manuale, u: UtenteSessione) {
  if (m === "tecnico" && !u.superAdmin) return [];
  return (await capitoli(m)).filter((c) => capitoloVisibile(c, u));
}

/** Indice con il testo semplice di ogni capitolo, per la ricerca nella pagina. */
export async function indice(m: Manuale, u: UtenteSessione) {
  return (await capitoliPer(m, u)).map((c) => ({ slug: c.slug, titolo: c.titolo, fornitore: c.fornitore, testo: testoSemplice(c.testo) }));
}
