"use client";

import { useState } from "react";
import { sbusta, type Esito } from "@/lib/esito";
import { EVENTI_ACCESSO, EVENTI_PROBLEMA, MESI_CONSERVAZIONE } from "@/lib/accessiRegole";
import type { FiltroRegistro, registroAccessi } from "@/lib/accessi";
import { Avviso, Campo, Input, IntestazionePagina, Pulsante, Select, Sezione, Spunta } from "@/components/ui";
import { AiutoSezione } from "@/components/AiutoSezione";

type Dati = Awaited<ReturnType<typeof registroAccessi>>;

const quando = (iso: string) => new Date(iso).toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const problema = (tipo: string) => (EVENTI_PROBLEMA as readonly string[]).includes(tipo);

/** Registro degli accessi (struttura o piattaforma): filtri per periodo, utente e solo problemi. */
export function RegistroAccessi({
  titolo,
  descrizione,
  iniziale,
  filtroIniziale,
  carica,
  mostraEmail,
}: {
  titolo: string;
  descrizione: string;
  iniziale: Dati;
  filtroIniziale: FiltroRegistro;
  carica: (f: FiltroRegistro) => Promise<Esito<Dati>>;
  /** Piattaforma: si vedono anche i tentativi su email che non corrispondono a nessun utente. */
  mostraEmail: boolean;
}) {
  const [d, setD] = useState(iniziale);
  const [f, setF] = useState(filtroIniziale);
  const [busy, setBusy] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function aggiorna(nuovo: FiltroRegistro) {
    setF(nuovo);
    setErrore(null);
    setBusy(true);
    try {
      setD(await sbusta(carica(nuovo)));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo={titolo} sottotitolo={descrizione} />
      <Sezione titolo="Accessi e password">
        <AiutoSezione breve={`Chi è entrato, quando e da quale indirizzo di rete; password sbagliate e blocchi in rosso. Si conserva ${MESI_CONSERVAZIONE} mesi.`}>
          <p>
            Dopo 5 password sbagliate di fila l&apos;account si blocca per 15 minuti. Tanti errori su un account che nessuno ha usato possono voler dire che qualcuno sta
            provando a indovinare la password: in quel caso conviene reimpostarla dalla pagina Utenti e avvisare la persona.
          </p>
        </AiutoSezione>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            aggiorna(f);
          }}
        >
          <Campo etichetta="Dal">
            <Input type="date" value={f.dal} onChange={(e) => setF({ ...f, dal: e.target.value })} />
          </Campo>
          <Campo etichetta="Al">
            <Input type="date" value={f.al} onChange={(e) => setF({ ...f, al: e.target.value })} />
          </Campo>
          <Campo etichetta="Utente">
            <Select value={f.utenteId ?? ""} onChange={(e) => aggiorna({ ...f, utenteId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Tutti</option>
              {d.utenti.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </Select>
          </Campo>
          <Spunta etichetta="Solo password sbagliate e blocchi" checked={f.soloProblemi} onChange={(e) => aggiorna({ ...f, soloProblemi: e.target.checked })} />
          <Pulsante type="submit" disabled={busy}>
            Mostra
          </Pulsante>
        </form>
        {errore && (
          <Avviso tipo="errore" className="mt-2">
            {errore}
          </Avviso>
        )}
        {d.troppi && (
          <Avviso tipo="info" className="mt-2">
            Sono mostrati solo gli ultimi 500 eventi: restringi il periodo o scegli un utente.
          </Avviso>
        )}
        <table className="tabella-responsive mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1">Quando</th>
              <th className="pb-1">Chi</th>
              <th className="pb-1">Cosa</th>
              <th className="pb-1">Indirizzo</th>
            </tr>
          </thead>
          <tbody>
            {d.eventi.map((e) => (
              <tr key={e.id} className="border-t border-stone-100">
                <td data-label="Quando" className="py-1.5 font-mono text-xs">
                  {quando(e.quando)}
                </td>
                <td data-label="Chi" className="py-1.5">
                  {e.utente ?? <span className="text-stone-500">nessun utente</span>}
                  {mostraEmail && <span className="block break-all text-xs text-stone-500">{e.email}</span>}
                </td>
                <td data-label="Cosa" className={`py-1.5 ${problema(e.tipo) ? "font-semibold text-red-700" : ""}`}>
                  {EVENTI_ACCESSO[e.tipo as keyof typeof EVENTI_ACCESSO] ?? e.tipo}
                  {e.dettaglio && <span className="font-normal text-stone-600"> · {e.dettaglio}</span>}
                </td>
                <td data-label="Indirizzo" className="py-1.5 font-mono text-xs text-stone-600">
                  {e.ip ?? "—"}
                </td>
              </tr>
            ))}
            {d.eventi.length === 0 && (
              <tr>
                <td colSpan={4} className="cella-intera py-2 text-stone-500">
                  Nessun evento nel periodo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Sezione>
    </div>
  );
}
