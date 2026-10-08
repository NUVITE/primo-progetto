/**
 * Collaudo del manuale: lettore del Markdown ridotto, intestazioni, visibilità per permessi/moduli/
 * fornitore e, per tutti i capitoli di docs/manuale: intestazione valida, permessi e moduli esistenti,
 * ordine unico, collegamenti interni verso pagine che esistono, niente HTML.
 *   npx tsx scripts/collaudo-manuale.ts
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { capitoli } from "../src/lib/manuale";
import { capitoloVisibile, leggiCapitolo, markdown, testoSemplice } from "../src/lib/manualeRegole";
import { TUTTI_I_PERMESSI } from "../src/lib/permessi";
import { CATALOGO_MODULI } from "../src/lib/moduli";

let falliti = 0;
const verifica = (nome: string, ok: boolean, dettaglio: unknown = "") => {
  console.log(`${ok ? "OK  " : "FAIL"} ${nome}${dettaglio !== "" ? ` — ${JSON.stringify(dettaglio)}` : ""}`);
  if (!ok) falliti += 1;
};

/** La pagina dell'app esiste? (/prenotazioni/12 corrisponde a src/app/prenotazioni/[id]/page.tsx) */
function paginaEsiste(percorso: string) {
  const parti = percorso.split(/[?#]/)[0].split("/").filter(Boolean);
  let cartelle = [join(process.cwd(), "src", "app")];
  for (const p of parti) {
    cartelle = cartelle.flatMap((c) => {
      if (!existsSync(c)) return [];
      const voci = readdirSync(c, { withFileTypes: true }).filter((d) => d.isDirectory());
      return voci.filter((d) => d.name === p || /^\[.+\]$/.test(d.name)).map((d) => join(c, d.name));
    });
  }
  return cartelle.some((c) => existsSync(join(c, "page.tsx")) || existsSync(join(c, "route.ts")));
}

async function main() {
  // ---- Regole pure ----
  const c = leggiCapitolo("10-planning.md", "---\ntitolo: Planning\nordine: 10\npermessi: prenotazioni.vedi, sale.vedi\nmoduli: pulizie\nfornitore: no\n---\n## Uno\nTesto");
  verifica("Intestazione letta", c.slug === "planning" && c.titolo === "Planning" && c.ordine === 10 && c.permessi.join() === "prenotazioni.vedi,sale.vedi" && c.moduli.join() === "pulizie" && !c.fornitore && c.testo.startsWith("## Uno"), c);
  const u = (permessi: string[], moduli: string[] = [], superAdmin = false) => ({ permessi, moduli, superAdmin });
  verifica("Visibile con uno dei permessi e il modulo acceso", capitoloVisibile(c, u(["sale.vedi"], ["pulizie"])));
  verifica("Nascosto senza permesso o senza modulo", !capitoloVisibile(c, u(["sale.vedi"])) && !capitoloVisibile(c, u(["cassa.chiudi"], ["pulizie"])));
  verifica("Capitolo del fornitore: solo al gestore della piattaforma", !capitoloVisibile({ permessi: [], moduli: [], fornitore: true }, u(["utenti.gestisci"])) && capitoloVisibile({ permessi: [], moduli: [], fornitore: true }, u([], [], true)));
  const b = markdown("## Fare una prenotazione\nPrima riga\nseconda riga\n\n1. Apri **Planning**\n2. Premi `Salva` e vai a [Prenotazioni](/prenotazioni)\n\n> Attenzione: niente\n\n| A | B |\n|---|---|\n| 1 | *due* |\n\n```\ncodice\n```");
  verifica(
    "Markdown: titolo con ancora, paragrafo unito, elenco numerato, nota, tabella, codice",
    b.map((x) => x.tipo).join() === "titolo,paragrafo,elenco,nota,tabella,codice" &&
      b[0].tipo === "titolo" && b[0].ancora === "fare-una-prenotazione" &&
      b[1].tipo === "paragrafo" && b[1].testo[0].testo === "Prima riga seconda riga" &&
      b[2].tipo === "elenco" && b[2].numerato && b[2].voci.length === 2 && b[2].voci[1].some((x) => x.tipo === "link" && x.href === "/prenotazioni"),
    b.map((x) => x.tipo),
  );
  verifica("Ancore senza accenti", markdown("## Attività e città")[0].tipo === "titolo" && (markdown("## Attività e città")[0] as { ancora: string }).ancora === "attivita-e-citta");
  verifica("Testo semplice per la ricerca", testoSemplice("## Titolo\nVai a [Cassa](/cassa) e **chiudi**") === "Titolo Vai a Cassa e chiudi");

  // ---- Tutti i capitoli ----
  const moduli = CATALOGO_MODULI.map((m) => m.modulo as string);
  for (const m of ["operativo", "tecnico"] as const) {
    const tutti = await capitoli(m);
    verifica(`Manuale ${m}: ci sono capitoli`, tutti.length > 0, tutti.length);
    const ordini = tutti.map((x) => x.ordine);
    verifica(`Manuale ${m}: ordini e indirizzi unici`, new Set(ordini).size === ordini.length && new Set(tutti.map((x) => x.slug)).size === tutti.length);
    for (const cap of tutti) {
      const problemi: string[] = [];
      if (cap.titolo === cap.slug) problemi.push("titolo mancante");
      if (cap.ordine === 999) problemi.push("ordine mancante");
      if (m === "tecnico" && !cap.fornitore) problemi.push("il tecnico va segnato fornitore: si");
      for (const p of cap.permessi) if (!(TUTTI_I_PERMESSI as string[]).includes(p)) problemi.push(`permesso inesistente ${p}`);
      for (const x of cap.moduli) if (!moduli.includes(x)) problemi.push(`modulo inesistente ${x}`);
      if (/<[a-zA-Z!/][^>]*>/.test(cap.testo.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, ""))) problemi.push("contiene HTML");
      for (const l of cap.testo.matchAll(/\]\((\/[^)\s]*)\)/g)) if (!paginaEsiste(l[1])) problemi.push(`collegamento a pagina inesistente ${l[1]}`);
      const blocchi = markdown(cap.testo);
      if (!blocchi.some((x) => x.tipo === "titolo" && x.livello === 2)) problemi.push("nessun paragrafo ##");
      verifica(`${m}/${cap.slug}`, problemi.length === 0, problemi.length ? problemi : `${testoSemplice(cap.testo).split(" ").length} parole`);
    }
  }
  console.log(falliti ? `\n${falliti} verifiche fallite` : "\nTutte le verifiche superate");
  process.exit(falliti ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
