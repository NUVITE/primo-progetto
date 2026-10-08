/**
 * Regista dei video dimostrativi: guida il browser (Playwright) sul programma in locale, mostra un
 * cursore finto (il video di Playwright non registra il mouse), fumetti che spiegano ogni passo e
 * cartelli iniziali e finali; alla fine taglia l'attesa iniziale e converte in WebM VP9 con FFmpeg.
 *
 * Solo per il PC di chi prepara i video: serve il server di sviluppo acceso (porta 3020) e il
 * database locale con i dati dimostrativi. Mai in produzione.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export const BASE = process.env.VIDEO_BASE ?? "http://localhost:3020";
const CARTELLA_GREZZI = join(process.cwd(), "scripts", "video", ".grezzi");
export const CARTELLA_VIDEO = join(process.cwd(), "public", "video");
const LARGHEZZA = 1280;
const ALTEZZA = 720;

/** FFmpeg: quello indicato nella variabile FFMPEG, altrimenti quello nel PATH. */
const ffmpeg = () => process.env.FFMPEG || "ffmpeg";

// Stili e funzioni del regista, iniettati in ogni pagina (anche dopo una navigazione).
const SCRIPT_PAGINA = `
(() => {
  if (window.__regista) return;
  const stile = document.createElement("style");
  stile.textContent = \`
    #rg-cursore { position: fixed; z-index: 2147483647; width: 22px; height: 22px; margin: -3px 0 0 -3px; pointer-events: none;
      transition: left .7s cubic-bezier(.4,0,.2,1), top .7s cubic-bezier(.4,0,.2,1); left: 640px; top: 400px; }
    #rg-cursore svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,.45)); }
    .rg-onda { position: fixed; z-index: 2147483646; width: 34px; height: 34px; margin: -17px 0 0 -17px; border-radius: 50%;
      border: 3px solid #0f766e; pointer-events: none; animation: rg-onda .5s ease-out forwards; }
    @keyframes rg-onda { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.4); opacity: 0 } }
    #rg-alone { position: fixed; z-index: 2147483645; border: 3px solid #f59e0b; border-radius: 10px; pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(28,25,23,.28); transition: all .35s ease; }
    #rg-fumetto { position: fixed; z-index: 2147483647; max-width: 360px; padding: 12px 14px; border-radius: 12px; pointer-events: none;
      background: #1c1917; color: #fff; font: 600 17px/1.35 system-ui, "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.35);
      opacity: 0; transition: opacity .25s ease; }
    #rg-fumetto.rg-visibile { opacity: 1; }
    #rg-fumetto::after { content: ""; position: absolute; width: 14px; height: 14px; background: #1c1917; transform: rotate(45deg); }
    #rg-fumetto.rg-sotto::after { top: -7px; left: var(--rg-freccia, 24px); }
    #rg-fumetto.rg-sopra::after { bottom: -7px; left: var(--rg-freccia, 24px); }
    #rg-fumetto.rg-centro::after { display: none; }
    #rg-cartello { position: fixed; inset: 0; z-index: 2147483647; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; background: #134e4a; color: #fff; font-family: system-ui, "Segoe UI", sans-serif; text-align: center; padding: 40px; }
    #rg-cartello h1 { font-size: 46px; font-weight: 800; margin: 0; }
    #rg-cartello p { font-size: 22px; margin: 0; max-width: 820px; opacity: .92; line-height: 1.4; }
    #rg-cartello small { font-size: 16px; opacity: .7; }
    nextjs-portal { display: none !important; }
  \`;
  const cursore = document.createElement("div");
  cursore.id = "rg-cursore";
  cursore.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11-7 1.5L8.5 22z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  // Lo script parte prima che esista il documento: stile e cursore si aggiungono appena c'è il body.
  const pronto = () => { document.head.appendChild(stile); document.body.appendChild(cursore); };
  if (document.body) pronto(); else document.addEventListener("DOMContentLoaded", pronto);
  window.__regista = {
    sposta(x, y) { const c = document.getElementById("rg-cursore"); if (c) { c.style.left = x + "px"; c.style.top = y + "px"; } },
    onda(x, y) { const o = document.createElement("div"); o.className = "rg-onda"; o.style.left = x + "px"; o.style.top = y + "px"; document.body.appendChild(o); setTimeout(() => o.remove(), 600); },
    alone(r) {
      let a = document.getElementById("rg-alone");
      if (!r) { a && a.remove(); return; }
      if (!a) { a = document.createElement("div"); a.id = "rg-alone"; document.body.appendChild(a); }
      const m = 6; a.style.left = (r.x - m) + "px"; a.style.top = (r.y - m) + "px"; a.style.width = (r.w + 2 * m) + "px"; a.style.height = (r.h + 2 * m) + "px";
    },
    fumetto(testo, r) {
      let f = document.getElementById("rg-fumetto");
      if (!testo) { f && f.classList.remove("rg-visibile"); return; }
      if (!f) { f = document.createElement("div"); f.id = "rg-fumetto"; document.body.appendChild(f); }
      f.textContent = testo; f.className = "";
      const W = window.innerWidth, H = window.innerHeight, fw = Math.min(360, W - 32);
      f.style.maxWidth = fw + "px";
      const fh = f.getBoundingClientRect().height || 80;
      let x, y, cls;
      if (!r) { x = (W - fw) / 2; y = H - fh - 40; cls = "rg-centro"; }
      else {
        x = Math.max(16, Math.min(W - fw - 16, r.x + r.w / 2 - 40));
        if (r.y + r.h + fh + 24 < H) { y = r.y + r.h + 16; cls = "rg-sotto"; } else { y = Math.max(16, r.y - fh - 16); cls = "rg-sopra"; }
        f.style.setProperty("--rg-freccia", Math.max(14, Math.min(fw - 28, r.x + r.w / 2 - x - 7)) + "px");
      }
      f.style.left = x + "px"; f.style.top = y + "px";
      f.classList.add(cls); requestAnimationFrame(() => f.classList.add("rg-visibile"));
    },
    cartello(titolo, testo, nota) {
      let c = document.getElementById("rg-cartello");
      if (!titolo) { c && c.remove(); return; }
      if (!c) { c = document.createElement("div"); c.id = "rg-cartello"; document.body.appendChild(c); }
      c.innerHTML = "";
      const h = document.createElement("h1"); h.textContent = titolo; c.appendChild(h);
      if (testo) { const p = document.createElement("p"); p.textContent = testo; c.appendChild(p); }
      if (nota) { const s = document.createElement("small"); s.textContent = nota; c.appendChild(s); }
    },
  };
})();
`;

/** Tempo per leggere un testo: almeno 2,5 secondi, circa 14 caratteri al secondo. */
const tempoLettura = (t: string) => Math.max(2500, 1200 + t.length * 70);

export class Regista {
  private inizio = 0;
  private constructor(
    private browser: Browser,
    private contesto: BrowserContext,
    readonly pagina: Page,
    private nome: string,
    private avvio: number,
  ) {}

  /** Apre il browser che registra, con il cookie di sessione dell'utente dimostrativo. */
  static async apri(nome: string, cookieSessione: string, suggerimentiChiusi: string[] = []) {
    rmSync(join(CARTELLA_GREZZI, nome), { recursive: true, force: true });
    mkdirSync(join(CARTELLA_GREZZI, nome), { recursive: true });
    const browser = await chromium.launch({ headless: true });
    const contesto = await browser.newContext({
      viewport: { width: LARGHEZZA, height: ALTEZZA },
      recordVideo: { dir: join(CARTELLA_GREZZI, nome), size: { width: LARGHEZZA, height: ALTEZZA } },
      locale: "it-IT",
      timezoneId: "Europe/Rome",
      deviceScaleFactor: 1,
    });
    const avvio = Date.now();
    await contesto.addCookies([{ name: "hotelweb_sessione", value: cookieSessione, url: BASE }]);
    await contesto.addInitScript(SCRIPT_PAGINA);
    // Riquadri "Come funziona" chiusi: lasciano spazio alla pagina (si spiegano con i fumetti).
    await contesto.addInitScript((ids: string[]) => {
      try {
        for (const id of ids) localStorage.setItem(`hotelweb:suggerimento:${id}`, "chiuso");
      } catch {}
    }, suggerimentiChiusi);
    const pagina = await contesto.newPage();
    pagina.on("pageerror", (e) => console.log("Errore nella pagina:", e.message));
    return new Regista(browser, contesto, pagina, nome, avvio);
  }

  /** Apre le pagine una volta prima di registrare: il server di sviluppo le compila e nel video non si aspetta. */
  async riscalda(...percorsi: string[]) {
    for (const p of percorsi) {
      await this.pagina.goto(BASE + p, { waitUntil: "networkidle" });
    }
  }

  /** Esce dal programma (cancella i cookie), per mostrare un nuovo accesso. */
  async esci() {
    await this.contesto.clearCookies();
  }

  /** Aspetta che compaia un elemento (pagina caricata, risposta arrivata). */
  async aspetta(selettore: string) {
    try {
      await this.pagina.locator(selettore).first().waitFor({ state: "visible", timeout: 60000 });
    } catch (e) {
      // Schermata di cosa c'era invece, per capire il problema.
      const file = join(CARTELLA_GREZZI, `${this.nome}-errore.png`);
      await this.pagina.screenshot({ path: file, fullPage: true });
      console.log("Schermata del problema:", file);
      throw e;
    }
    await this.attendi(500);
  }

  async attendi(ms: number) {
    await this.pagina.waitForTimeout(ms);
  }

  /** Va a una pagina e aspetta che sia pronta (niente "Caricamento…" a schermo). */
  async vai(percorso: string, aspetta?: string) {
    await this.pagina.goto(BASE + percorso, { waitUntil: "networkidle" });
    if (aspetta) await this.pagina.waitForSelector(aspetta, { state: "visible", timeout: 60000 });
    await this.pagina.evaluate(() => (window as unknown as { __regista?: unknown }).__regista);
    await this.attendi(400);
  }

  /** Cartello a tutto schermo (apertura o chiusura). Il video vero inizia dal primo cartello. */
  async cartello(titolo: string, testo = "", nota = "", ms = 3800) {
    await this.pagina.evaluate(([a, b, c]) => (window as never as { __regista: { cartello: (a: string, b: string, c: string) => void } }).__regista.cartello(a, b, c), [titolo, testo, nota]);
    if (!this.inizio) this.inizio = Date.now();
    await this.attendi(ms);
    await this.pagina.evaluate(() => (window as never as { __regista: { cartello: (a: null) => void } }).__regista.cartello(null));
    await this.attendi(300);
  }

  private async rettangolo(selettore: string) {
    const el = this.pagina.locator(selettore).first();
    await el.waitFor({ state: "visible", timeout: 30000 });
    // Se l'elemento è fuori o troppo vicino ai bordi, lo si porta al centro (resta spazio per il fumetto).
    const b0 = await el.boundingBox();
    if (b0 && (b0.y < 70 || b0.y + b0.height > ALTEZZA - 150)) {
      await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "smooth" }));
      await this.attendi(700);
    }
    const b = await el.boundingBox();
    if (!b) throw new Error(`Elemento non visibile: ${selettore}`);
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  }

  /** Fumetto vicino a un elemento (evidenziato) o, senza selettore, in basso al centro. */
  async fumetto(testo: string, selettore?: string, ms?: number) {
    const r = selettore ? await this.rettangolo(selettore) : null;
    await this.pagina.evaluate(([t, rr]) => {
      const g = (window as never as { __regista: { alone: (r: unknown) => void; fumetto: (t: string, r: unknown) => void } }).__regista;
      g.alone(rr);
      g.fumetto(t as string, rr);
    }, [testo, r] as const);
    await this.attendi(ms ?? tempoLettura(testo));
    await this.togliFumetto();
  }

  async togliFumetto() {
    await this.pagina.evaluate(() => {
      const g = (window as never as { __regista: { alone: (r: null) => void; fumetto: (t: null) => void } }).__regista;
      g.alone(null);
      g.fumetto(null);
    });
    await this.attendi(250);
  }

  /** Porta il cursore sull'elemento, eventualmente con un fumetto, e fa clic davvero. */
  async clic(selettore: string, fumetto?: string) {
    const punto = async () => {
      const r = await this.rettangolo(selettore);
      return { x: r.x + Math.min(r.w / 2, 60), y: r.y + r.h / 2 };
    };
    const sposta = (p: { x: number; y: number }) =>
      this.pagina.evaluate(([a, b]) => (window as never as { __regista: { sposta: (x: number, y: number) => void } }).__regista.sposta(a, b), [p.x, p.y]);
    let p = await punto();
    await sposta(p);
    await this.attendi(800);
    if (fumetto) {
      await this.fumetto(fumetto, selettore);
      // Il fumetto può aver fatto scorrere la pagina: si rimisura prima del clic.
      const q = await punto();
      if (Math.abs(q.x - p.x) > 2 || Math.abs(q.y - p.y) > 2) {
        p = q;
        await sposta(p);
        await this.attendi(800);
      }
    }
    await this.pagina.evaluate(([a, b]) => (window as never as { __regista: { onda: (x: number, y: number) => void } }).__regista.onda(a, b), [p.x, p.y]);
    await this.pagina.mouse.click(p.x, p.y);
    await this.attendi(700);
  }

  /** Scrive in un campo un carattere alla volta, come una persona. */
  async scrivi(selettore: string, testo: string, fumetto?: string) {
    await this.clic(selettore, fumetto);
    await this.pagina.locator(selettore).first().pressSequentially(testo, { delay: 70 });
    await this.attendi(500);
  }

  /** Imposta un campo in un colpo solo (date, orari), dopo averlo indicato con il cursore. */
  async compila(selettore: string, valore: string, fumetto?: string) {
    await this.clic(selettore, fumetto);
    await this.pagina.locator(selettore).first().fill(valore);
    await this.pagina.keyboard.press("Tab");
    await this.attendi(600);
  }

  /** Sceglie una voce di un elenco a tendina (per etichetta visibile o per valore). */
  async scegli(selettore: string, voce: string | { value: string } | { index: number }, fumetto?: string) {
    await this.clic(selettore, fumetto);
    await this.pagina.locator(selettore).first().selectOption(typeof voce === "string" ? { label: voce } : voce);
    await this.attendi(700);
  }

  /** Chiude il browser, taglia l'attesa iniziale e salva public/video/<nome>.webm (VP9, senza audio). */
  async chiudi() {
    const video = this.pagina.video();
    await this.contesto.close();
    await this.browser.close();
    const grezzo = await video!.path();
    mkdirSync(CARTELLA_VIDEO, { recursive: true });
    const uscita = join(CARTELLA_VIDEO, `${this.nome}.webm`);
    const taglio = Math.max(0, (this.inizio - this.avvio) / 1000 - 0.2).toFixed(2);
    execFileSync(ffmpeg(), ["-y", "-loglevel", "error", "-ss", taglio, "-i", grezzo, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", "-an", uscita]);
    if (!existsSync(uscita)) throw new Error("Conversione non riuscita.");
    rmSync(join(CARTELLA_GREZZI, this.nome), { recursive: true, force: true });
    return uscita;
  }
}
