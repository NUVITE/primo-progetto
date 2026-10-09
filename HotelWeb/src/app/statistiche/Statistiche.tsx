"use client";

import { Download, Printer } from "lucide-react";
import { useState, type ReactNode } from "react";
import { sbusta } from "@/lib/esito";
import { csv, variazione } from "@/lib/statisticheRegole";
import { conUnita } from "@/lib/funzioniRegole";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Sezione } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";
import { azioneStatistiche, type datiStatistiche } from "./actions";

type Dati = Awaited<ReturnType<typeof datiStatistiche>>;
type Periodo = Dati["ora"];
type Unita = { singolare: string; plurale: string; femminile: boolean };

// Colori dei grafici: blu = periodo scelto / adesso, arancione = anno prima (coppia verificata per daltonismo e contrasto).
const BLU = "#2a78d6";
const ARANCIO = "#eb6834";

const eur = (n: number | null) => (n === null ? "—" : n.toLocaleString("it-IT", { style: "currency", currency: "EUR" }));
const num = (n: number | null, cifre = 0) => (n === null ? "—" : n.toLocaleString("it-IT", { minimumFractionDigits: cifre, maximumFractionDigits: cifre }));
const pct = (n: number | null) => (n === null ? "—" : `${num(n, 1)}%`);
const it = (g: string) => g.split("-").reverse().join("/");
const nomeMese = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const fineMese = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);

/** Indicatore con il confronto sull'anno prima (testo, mai solo colore). */
function Indicatore({ titolo, valore, prima, ora, primaNum }: { titolo: string; valore: string; prima: string; ora: number | null; primaNum: number | null }) {
  const v = variazione(ora, primaNum);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      <span className="text-xs font-bold uppercase tracking-wide text-stone-500">{titolo}</span>
      <span className="text-2xl font-bold tabular-nums text-stone-900">{valore}</span>
      <span className="text-xs text-stone-600">
        Anno prima: {prima}
        {v !== null && <span className="font-semibold"> ({v > 0 ? "+" : ""}{num(v, 1)}%)</span>}
      </span>
    </div>
  );
}

/** Massimo "tondo" per la scala: 1, 2, 2,5 o 5 per una potenza di dieci, non meno del valore più alto. */
function scalaTonda(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/** Barre verticali con tooltip al passaggio: una serie (occupazione) o due (adesso e anno prima). */
function Barre({ colonne, massimo, serie, formato, altezza = 160 }: { colonne: { etichetta: string; valori: number[]; tooltip: string }[]; massimo: number; serie: string[]; formato: (v: number) => string; altezza?: number }) {
  const [sopra, setSopra] = useState<number | null>(null);
  const colori = [BLU, ARANCIO];
  const passo = Math.max(1, Math.ceil(colonne.length / 12));
  return (
    <div className="relative">
      {serie.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-4 text-xs text-stone-700">
          {serie.map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colori[i] }} aria-hidden /> {s}
            </span>
          ))}
        </div>
      )}
      <div className="relative" style={{ height: altezza }}>
        {/* Griglia leggera a metà e in cima, con il valore a sinistra */}
        {[0.5, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-stone-200" style={{ bottom: `${f * 100}%` }}>
            <span className="absolute -top-2 left-0 bg-white pr-1 text-[10px] leading-none text-stone-500">{formato(massimo * f)}</span>
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-9 flex items-end gap-[2px]" onMouseLeave={() => setSopra(null)}>
          {colonne.map((c, i) => (
            <div key={c.etichetta} className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center gap-[2px]" onMouseEnter={() => setSopra(i)}>
              {c.valori.map((v, j) => (
                <div
                  key={j}
                  className="w-full max-w-[28px] rounded-t-[4px]"
                  style={{ height: `${massimo ? Math.max(v > 0 ? 1 : 0, (v / massimo) * 100) : 0}%`, background: colori[j], opacity: sopra === null || sopra === i ? 1 : 0.55 }}
                />
              ))}
            </div>
          ))}
        </div>
        {sopra !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-pre rounded-md bg-stone-900 px-2 py-1 text-xs text-white shadow"
            style={{ left: `clamp(0px, calc(${((sopra + 0.5) / colonne.length) * 100}% - 60px), calc(100% - 140px))` }}
          >
            {colonne[sopra].tooltip}
          </div>
        )}
      </div>
      <div className="mt-1 ml-9 flex gap-[2px] text-[10px] text-stone-500">
        {colonne.map((c, i) => (
          <span key={c.etichetta} className="min-w-0 flex-1 truncate text-center">
            {i % passo === 0 ? c.etichetta : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tabella({ intestazioni, righe, destra = [] }: { intestazioni: string[]; righe: ReactNode[][]; destra?: number[] }) {
  return (
    <table className="tabella-responsive w-full text-sm">
      <thead className="text-left text-xs uppercase text-stone-500">
        <tr>
          {intestazioni.map((h, i) => (
            <th key={h} className={`pb-1 ${destra.includes(i) ? "md:text-right" : ""}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {righe.map((r, i) => (
          <tr key={i} className="border-t border-stone-100">
            {r.map((c, j) => (
              <td key={j} data-label={intestazioni[j]} className={`py-1.5 tabular-nums ${destra.includes(j) ? "md:text-right" : ""}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
        {righe.length === 0 && (
          <tr>
            <td colSpan={intestazioni.length} className="cella-intera py-2 text-stone-500">
              Niente nel periodo.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** Occupazione per giorno (fino a due mesi) o per mese (periodi più lunghi). */
function andamento(p: Periodo) {
  if (p.perGiorno.length <= 62)
    return p.perGiorno.map((g) => ({ etichetta: g.giorno.slice(8), valori: [g.occupazione], tooltip: `${it(g.giorno)}\n${num(g.occupazione, 1)}% · ${g.vendute} su ${g.disponibili}` }));
  const mesi = new Map<string, { vendute: number; disponibili: number }>();
  for (const g of p.perGiorno) {
    const m = mesi.get(g.giorno.slice(0, 7)) ?? { vendute: 0, disponibili: 0 };
    m.vendute += g.vendute;
    m.disponibili += g.disponibili;
    mesi.set(g.giorno.slice(0, 7), m);
  }
  return [...mesi].map(([m, v]) => {
    const o = v.disponibili ? Math.round((v.vendute / v.disponibili) * 1000) / 10 : 0;
    return { etichetta: nomeMese(m).slice(0, 3), valori: [o], tooltip: `${nomeMese(m)}\n${num(o, 1)}% · ${v.vendute} su ${v.disponibili}` };
  });
}

export function Statistiche({ iniziale, oggi, unita, hotelNome }: { iniziale: Dati; oggi: string; unita: Unita; hotelNome: string }) {
  const [d, setD] = useState(iniziale);
  const [periodo, setPeriodo] = useState({ dal: iniziale.ora.dal, al: iniziale.ora.al });
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const t = (s: string) => conUnita(s, unita);
  const o = d.ora;
  const p = d.prima;
  const soldi = d.conImporti;

  async function carica(dal: string, al: string) {
    setPeriodo({ dal, al });
    setErrore(null);
    setBusy(true);
    try {
      setD(await sbusta(azioneStatistiche(dal, al)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }
  const a = Number(oggi.slice(0, 4));
  const m = Number(oggi.slice(5, 7));
  const scorciatoie: [string, string, string][] = [
    ["Questo mese", `${oggi.slice(0, 7)}-01`, fineMese(a, m)],
    ["Mese scorso", new Date(Date.UTC(a, m - 2, 1)).toISOString().slice(0, 10), fineMese(a, m - 1)],
    ["Ultimi 30 giorni", new Date(Date.UTC(a, m - 1, Number(oggi.slice(8)) - 29)).toISOString().slice(0, 10), oggi],
    ["Anno in corso", `${a}-01-01`, `${a}-12-31`],
    ["Anno scorso", `${a - 1}-01-01`, `${a - 1}-12-31`],
  ];

  function esporta() {
    const righe: (string | number | null)[][] = [
      [`Statistiche ${hotelNome}`, `dal ${it(o.dal)} al ${it(o.al)}`],
      [],
      ["Indicatore", "Periodo", "Anno prima"],
      ["Occupazione %", o.occupazione, p.occupazione],
      ["Notti vendute", o.vendute, p.vendute],
      [t("{Camere} disponibili (notti)"), o.disponibili, p.disponibili],
      ["Prezzo medio a notte", o.prezzoMedio, p.prezzoMedio],
      [t("Ricavo per {camera} disponibile"), o.ricavoPerDisponibile, p.ricavoPerDisponibile],
      ["Ricavo totale", o.ricavoTotale, p.ricavoTotale],
      ["Presenze", o.presenze, p.presenze],
      ["Arrivi (persone)", o.arrivi, p.arrivi],
      ["Permanenza media (notti)", o.permanenzaMedia, p.permanenzaMedia],
      [],
      ["Giorno", "Notti vendute", "Disponibili", "Occupazione %"],
      ...o.perGiorno.map((g) => [it(g.giorno), g.vendute, g.disponibili, g.occupazione]),
      [],
      ["Voce", "Importo"],
      ...o.voci.map((v) => [v.voce, v.importo]),
      [],
      [t("Tipo di {camera}"), "Notti vendute", "Disponibili", "Occupazione %", "Ricavo", "Prezzo medio"],
      ...o.perTipo.map((x) => [x.tipo, x.vendute, x.disponibili, x.occupazione, x.ricavo, x.prezzoMedio]),
      [],
      ["Canale", "Prenotazioni", "Notti", "Quota %", "Ricavo"],
      ...o.perCanale.map((x) => [x.nome, x.prenotazioni, x.vendute, x.quota, x.ricavo]),
      [],
      ["Intermediario", "Prenotazioni", "Notti", "Quota %", "Ricavo"],
      ...o.perIntermediario.map((x) => [x.nome, x.prenotazioni, x.vendute, x.quota, x.ricavo]),
      [],
      ["Provenienza", "Italia/estero", "Presenze"],
      ...o.provenienza.map((x) => [x.nome, x.italia ? "Italia" : "Estero", x.presenze]),
    ];
    const blob = new Blob([csv(righe)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `statistiche-${o.dal}-${o.al}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const ricavoPrima = (x: number | null) => (soldi ? eur(x) : "—");
  const colonne = andamento(o);
  const maxPrenotato = Math.max(1, ...d.prenotato.flatMap((x) => [x.adesso, x.unAnnoFa]));

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina
        titolo="Statistiche"
        sottotitolo={`${hotelNome} · dal ${it(o.dal)} al ${it(o.al)} (${o.giorni} giorni), confronto con lo stesso periodo dell'anno prima`}
        azioni={
          <div className="flex gap-2 print:hidden">
            <Pulsante icona={Download} onClick={esporta}>
              Excel (CSV)
            </Pulsante>
            <Pulsante icona={Printer} onClick={() => window.print()}>
              Stampa
            </Pulsante>
          </div>
        }
      />

      <form
        className="flex flex-wrap items-end gap-2 print:hidden"
        onSubmit={(e) => {
          e.preventDefault();
          carica(periodo.dal, periodo.al);
        }}
      >
        <Campo etichetta="Dal">
          <Input type="date" value={periodo.dal} onChange={(e) => setPeriodo({ ...periodo, dal: e.target.value })} />
        </Campo>
        <Campo etichetta="Al">
          <Input type="date" value={periodo.al} onChange={(e) => setPeriodo({ ...periodo, al: e.target.value })} />
        </Campo>
        <Pulsante type="submit" variante="primario" disabled={busy}>
          Calcola
        </Pulsante>
        {scorciatoie.map(([nome, dal, al]) => (
          <Pulsante key={nome} dimensione="piccolo" disabled={busy} onClick={() => carica(dal, al)}>
            {nome}
          </Pulsante>
        ))}
      </form>
      {errore && <Avviso tipo="errore">{errore}</Avviso>}
      {!soldi && <Avviso tipo="info">Gli importi non sono visibili con i permessi del tuo ruolo: si vedono solo occupazione, notti e presenze.</Avviso>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicatore titolo="Occupazione" valore={pct(o.occupazione)} prima={pct(p.occupazione)} ora={o.occupazione} primaNum={p.occupazione} />
        <Indicatore titolo="Prezzo medio a notte" valore={eur(o.prezzoMedio)} prima={ricavoPrima(p.prezzoMedio)} ora={o.prezzoMedio} primaNum={p.prezzoMedio} />
        <Indicatore titolo={t("Ricavo per {camera} disponibile")} valore={eur(o.ricavoPerDisponibile)} prima={ricavoPrima(p.ricavoPerDisponibile)} ora={o.ricavoPerDisponibile} primaNum={p.ricavoPerDisponibile} />
        <Indicatore titolo="Ricavo totale" valore={eur(o.ricavoTotale)} prima={ricavoPrima(p.ricavoTotale)} ora={o.ricavoTotale} primaNum={p.ricavoTotale} />
        <Indicatore titolo="Notti vendute" valore={num(o.vendute)} prima={num(p.vendute)} ora={o.vendute} primaNum={p.vendute} />
        <Indicatore titolo="Presenze" valore={num(o.presenze)} prima={num(p.presenze)} ora={o.presenze} primaNum={p.presenze} />
        <Indicatore titolo="Arrivi (persone)" valore={num(o.arrivi)} prima={num(p.arrivi)} ora={o.arrivi} primaNum={p.arrivi} />
        <Indicatore titolo="Permanenza media" valore={o.permanenzaMedia === null ? "—" : `${num(o.permanenzaMedia, 1)} notti`} prima={p.permanenzaMedia === null ? "—" : `${num(p.permanenzaMedia, 1)} notti`} ora={o.permanenzaMedia} primaNum={p.permanenzaMedia} />
      </section>

      <Sezione titolo={o.perGiorno.length <= 62 ? "Occupazione giorno per giorno" : "Occupazione mese per mese"}>
        <AiutoSezione breve={t(`Notti vendute su {camere} disponibili (${o.camere} attive, meno quelle fuori servizio). Passa sopra una barra per i numeri.`)} />
        <div className="mt-6">
          <Barre colonne={colonne} massimo={Math.min(100, scalaTonda(Math.max(...colonne.map((c) => c.valori[0]))))} serie={["Occupazione %"]} formato={(v) => `${num(v)}%`} />
        </div>
      </Sezione>

      <div className="grid gap-4 xl:grid-cols-2">
        {soldi && (
          <Sezione titolo="Ricavi per voce">
            <AiutoSezione breve="IVA inclusa. Alloggio e trattamento dalle notti; servizi aggiunti nel giorno del servizio (o all'arrivo); consumi dei reparti meno abbuoni. Le spese anticipate per l'ospite (esborsi) non sono ricavi." />
            <Tabella intestazioni={["Voce", "Importo"]} destra={[1]} righe={o.voci.map((v) => [v.voce, eur(v.importo)])} />
          </Sezione>
        )}
        <Sezione titolo={t("Per tipo di {camera}")}>
          <Tabella
            intestazioni={["Tipo", "Notti", "Occupazione", ...(soldi ? ["Ricavo", "Prezzo medio"] : [])]}
            destra={[1, 2, 3, 4]}
            righe={o.perTipo.map((x) => [x.tipo, num(x.vendute), pct(x.occupazione), ...(soldi ? [eur(x.ricavo), eur(x.prezzoMedio)] : [])])}
          />
        </Sezione>
        <Sezione titolo="Canali di vendita">
          <Tabella
            intestazioni={["Canale", "Prenotazioni", "Notti", "Quota", ...(soldi ? ["Ricavo"] : [])]}
            destra={[1, 2, 3, 4]}
            righe={o.perCanale.map((x) => [x.nome, num(x.prenotazioni), num(x.vendute), pct(x.quota), ...(soldi ? [eur(x.ricavo)] : [])])}
          />
          {o.perIntermediario.length > 0 && (
            <>
              <h3 className="mt-4 mb-1 text-xs font-bold uppercase text-stone-500">Agenzie, portali e aziende (i primi 10)</h3>
              <Tabella
                intestazioni={["Intermediario", "Prenotazioni", "Notti", "Quota", ...(soldi ? ["Ricavo"] : [])]}
                destra={[1, 2, 3, 4]}
                righe={o.perIntermediario.map((x) => [x.nome, num(x.prenotazioni), num(x.vendute), pct(x.quota), ...(soldi ? [eur(x.ricavo)] : [])])}
              />
            </>
          )}
        </Sezione>
        <Sezione titolo="Provenienza degli ospiti">
          <AiutoSezione breve={t("Presenze per provincia di residenza (italiani) o stato (stranieri) dell'intestatario della {camera}.")} />
          <Tabella
            intestazioni={["Da dove", "Presenze", "Quota"]}
            destra={[1, 2]}
            righe={o.provenienza.slice(0, 15).map((x) => [x.nome, num(x.presenze), pct(o.presenze ? Math.round((x.presenze / o.presenze) * 1000) / 10 : 0)])}
          />
          {o.provenienza.length > 15 && <p className="mt-1 text-xs text-stone-500">Altre {o.provenienza.length - 15} provenienze nel file per Excel.</p>}
        </Sezione>
      </div>

      <Sezione titolo="Già prenotato per i prossimi mesi">
        <AiutoSezione breve="Notti già vendute per questo mese e i cinque seguenti, confrontate con quelle che un anno fa, alla stessa data, erano già prenotate per lo stesso mese." />
        <div className="mt-6">
          <Barre
            colonne={d.prenotato.map((x) => ({
              etichetta: nomeMese(x.mese).slice(0, 3),
              valori: [x.adesso, x.unAnnoFa],
              tooltip: `${nomeMese(x.mese)}\nAdesso: ${x.adesso} notti (${num(x.occupazione, 1)}%)\nUn anno fa a quest'ora: ${x.unAnnoFa}\nAlla fine l'anno prima: ${x.finaleAnnoPrima}`,
            }))}
            massimo={scalaTonda(maxPrenotato)}
            serie={["Adesso", "Un anno fa, alla stessa data"]}
            formato={(v) => `${num(v)} notti`}
          />
        </div>
        <div className="mt-6" />
        <Tabella
          intestazioni={["Mese", "Notti adesso", "Occupazione", "Un anno fa a quest'ora", "Alla fine l'anno prima"]}
          destra={[1, 2, 3, 4]}
          righe={d.prenotato.map((x) => [nomeMese(x.mese), num(x.adesso), pct(x.occupazione), num(x.unAnnoFa), num(x.finaleAnnoPrima)])}
        />
      </Sezione>

      <p className="text-xs text-stone-500">
        {t(
          "Le {camere} disponibili sono quelle attive oggi, meno quelle fuori servizio notte per notte. Il prezzo della notte comprende il trattamento ed è IVA inclusa. Le prenotazioni annullate e gli usi diurni non contano nelle notti.",
        )}
      </p>
    </div>
  );
}
