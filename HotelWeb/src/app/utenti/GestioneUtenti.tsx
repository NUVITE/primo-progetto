"use client";

import { sbusta } from "@/lib/esito";
import { useState } from "react";
import {
  azioneAggiungiUtente,
  azioneCambiaRuolo,
  azioneImpostaAttivo,
  azioneImpostaSuperAdmin,
  azioneModalitaUtenti,
  azioneRimuoviDaHotel,
  azioneReimpostaPassword,
  azioneAzzeraVerifica,
  azioneRuoliAggiuntivi,
  datiUtenti,
} from "./actions";
import { Suggerimento } from "@/components/Suggerimento";

type Dati = Awaited<ReturnType<typeof datiUtenti>>;

const PILLOLA = "rounded-full px-2.5 py-0.5 text-xs font-semibold";

export function GestioneUtenti({ iniziale }: { iniziale: Dati }) {
  const [dati, setDati] = useState(iniziale);
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [daRimuovere, setDaRimuovere] = useState<number | null>(null);
  // Password dimenticata: conferma e password temporanea appena creata (si vede una volta sola).
  const [daReimpostare, setDaReimpostare] = useState<number | null>(null);
  const [temporanea, setTemporanea] = useState<{ nome: string; password: string } | null>(null);
  // Utente di cui si stanno scegliendo i ruoli in più.
  const [ruoliInPiu, setRuoliInPiu] = useState<null | { utenteId: number; ids: number[] }>(null);
  const titolare = dati.modalitaUtenti === "titolare";

  const ruoloPredefinito = dati.ruoli.find((r) => r.nome === "Reception")?.id ?? dati.ruoli[0]?.id ?? 0;
  const [nuovo, setNuovo] = useState({ nome: "", email: "", password: "", ruoloId: ruoloPredefinito });

  async function eseguendo(fn: () => Promise<Dati>) {
    setErrore(null);
    setBusy(true);
    try {
      setDati(await fn());
      setDaRimuovere(null);
    } catch (e) {
      setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
      // Nuovo oggetto = nuovo render: le tendine controllate tornano al valore reale dopo un rifiuto.
      setDati((d) => ({ ...d }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-3 sm:p-6">
      <div>
        <h1 className="text-xl font-bold">Utenti</h1>
        <Suggerimento id="utenti" titolo="Come si gestiscono gli utenti">
          <p>
            Qui decidi chi può accedere a <strong>{dati.hotelNome}</strong> e con quale ruolo. Aggiungi un utente con la sua email e scegli il ruolo;
            cosa può fare ogni ruolo lo decidi nella pagina <strong>Ruoli</strong>.
          </p>
        </Suggerimento>
      </div>

      {errore && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{errore}</p>}
      {temporanea && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <p>
            Password temporanea di <strong>{temporanea.nome}</strong>: <span className="font-mono text-base font-bold">{temporanea.password}</span>
          </p>
          <p className="mt-1 text-xs">
            Comunicagliela di persona o al telefono, non per email. Al primo accesso dovrà sceglierne una sua; le sessioni che aveva aperte sono state chiuse. Questa password
            non si potrà più rivedere.
          </p>
          <button className="mt-1 text-xs font-semibold underline" onClick={() => setTemporanea(null)}>
            Fatto, chiudi
          </button>
        </div>
      )}

      <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-stone-900">Come è organizzata la struttura</h2>
        <p className="mb-3 text-sm text-stone-600">
          Un B&amp;B o una piccola struttura di solito ha un <strong>titolare</strong> che fa tutto. Un hotel ha più persone con ruoli diversi; una
          persona può avere anche più ruoli (es. Reception e Cassa), e i permessi si sommano.
        </p>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="radio" className="mt-1" checked={titolare} disabled={busy} onChange={() => eseguendo(() => sbusta(azioneModalitaUtenti("titolare")))} />
            <span>
              <strong>Titolare unico</strong>: un solo utente, con tutti i permessi. Non si possono aggiungere altri utenti.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" className="mt-1" checked={!titolare} disabled={busy} onChange={() => eseguendo(() => sbusta(azioneModalitaUtenti("ruoli")))} />
            <span>
              <strong>Più utenti con ruoli</strong>: ogni utente ha un ruolo principale ed eventualmente altri ruoli in più.
            </span>
          </label>
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-3 text-sm font-bold text-stone-900">Utenti dell&apos;hotel</h2>
        <table className="tabella-responsive w-full text-sm">
          <thead className="text-left text-xs uppercase text-stone-500">
            <tr>
              <th className="pb-1">Nome</th>
              <th className="pb-1">Email</th>
              <th className="pb-1">Ruolo</th>
              {dati.sonoSuperAdmin && <th className="pb-1">Account</th>}
              <th />
            </tr>
          </thead>
          <tbody>
            {dati.utenti.map((u) => (
              <tr key={u.id} className="border-t border-stone-100">
                <td data-label="Nome" className="py-2 font-semibold">
                  {u.nome}
                  {u.id === dati.ioId && <span className="ml-1 text-xs font-normal text-stone-500">(tu)</span>}
                  {u.verificaAttiva && (
                    <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700" title="Accede con password e codice dal telefono">
                      verifica in due passaggi
                    </span>
                  )}
                  {u.passwordTemporanea && (
                    <span className="ml-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800" title="Al primo accesso dovrà sceglierne una sua">
                      password temporanea
                    </span>
                  )}
                </td>
                <td data-label="Email" className="break-all py-2">{u.email}</td>
                <td data-label="Ruolo" className="py-2">
                  {titolare ? (
                    <span className="font-semibold text-stone-800">Titolare (tutti i permessi)</span>
                  ) : (
                  <span className="flex flex-col items-start gap-1">
                  <select
                    className="rounded-md border border-stone-300 px-2 py-1 text-sm text-stone-900"
                    value={u.ruoloId}
                    disabled={busy}
                    onChange={(e) => eseguendo(() => sbusta(azioneCambiaRuolo(u.id, Number(e.target.value))))}
                  >
                    {dati.ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                  </select>
                  {ruoliInPiu?.utenteId === u.id ? (
                    <span className="flex flex-col gap-1 rounded-md border border-teal-200 bg-teal-50/50 p-2">
                      <span className="text-xs font-semibold text-stone-700">Ruoli in più</span>
                      {dati.ruoli
                        .filter((r) => r.id !== u.ruoloId)
                        .map((r) => (
                          <label key={r.id} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={ruoliInPiu.ids.includes(r.id)}
                              onChange={(e) => setRuoliInPiu({ ...ruoliInPiu, ids: e.target.checked ? [...ruoliInPiu.ids, r.id] : ruoliInPiu.ids.filter((x) => x !== r.id) })}
                            />
                            {r.nome}
                          </label>
                        ))}
                      <span className="flex gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          className="inline-flex h-7 items-center rounded-md bg-teal-700 px-2.5 text-xs font-semibold text-white disabled:opacity-45 pointer-coarse:h-9"
                          onClick={async () => {
                            await eseguendo(() => sbusta(azioneRuoliAggiuntivi(u.id, ruoliInPiu.ids)));
                            setRuoliInPiu(null);
                          }}
                        >
                          Salva
                        </button>
                        <button type="button" className="inline-flex h-7 items-center rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 pointer-coarse:h-9" onClick={() => setRuoliInPiu(null)}>
                          Annulla
                        </button>
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold text-teal-800 hover:bg-teal-50 pointer-coarse:h-9"
                      onClick={() => setRuoliInPiu({ utenteId: u.id, ids: u.ruoliAggiuntivi })}
                    >
                      {u.ruoliAggiuntivi.length
                        ? `+ ${dati.ruoli.filter((r) => u.ruoliAggiuntivi.includes(r.id)).map((r) => r.nome).join(", ")}`
                        : "+ ruoli in più"}
                    </button>
                  )}
                  </span>
                  )}
                </td>
                {dati.sonoSuperAdmin && (
                  <td data-label="Account" className="py-2">
                    <button
                      className={`${PILLOLA} ${u.attivo ? "bg-emerald-50 text-emerald-700" : "bg-stone-200 text-stone-600"}`}
                      title="Vale per tutti gli hotel dell'utente"
                      onClick={() => eseguendo(() => sbusta(azioneImpostaAttivo(u.id, !u.attivo)))}
                    >
                      {u.attivo ? "Attivo" : "Disattivato"}
                    </button>
                  </td>
                )}
                <td className="cella-intera py-2 md:text-right">
                  {daReimpostare === u.id ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-xs text-stone-600">Creare una password temporanea per {u.nome}?</span>
                      <button
                        disabled={busy}
                        className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                        onClick={async () => {
                          setErrore(null);
                          setBusy(true);
                          try {
                            const r = await sbusta(azioneReimpostaPassword(u.id));
                            setDati(r.dati);
                            setTemporanea({ nome: u.nome, password: r.temporanea });
                            setDaReimpostare(null);
                          } catch (e) {
                            setErrore(e instanceof Error ? e.message : "Errore imprevisto.");
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        Reimposta
                      </button>
                      <button className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaReimpostare(null)}>
                        Annulla
                      </button>
                    </span>
                  ) : daRimuovere === u.id ? (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-xs text-stone-600">Togliere l&apos;accesso a {dati.hotelNome}?</span>
                      <button
                        disabled={busy}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40"
                        onClick={() => eseguendo(() => sbusta(azioneRimuoviDaHotel(u.id)))}
                      >
                        Rimuovi
                      </button>
                      <button className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9" onClick={() => setDaRimuovere(null)}>
                        Annulla
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex flex-wrap gap-1">
                      {dati.sonoSuperAdmin && (
                        <button
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                          onClick={() => eseguendo(() => sbusta(azioneImpostaSuperAdmin(u.id, true)))}
                        >
                          Rendi superadmin
                        </button>
                      )}
                      {u.id !== dati.ioId && u.verificaAttiva && (
                        <button
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                          title="Telefono perso o cambiato: al prossimo accesso la riattiverà"
                          disabled={busy}
                          onClick={() => eseguendo(() => sbusta(azioneAzzeraVerifica(u.id)))}
                        >
                          Azzera verifica
                        </button>
                      )}
                      {u.id !== dati.ioId && (
                        <button
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-stone-300 bg-white px-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-45 pointer-coarse:h-9"
                          title="Password dimenticata: ne crea una temporanea da cambiare al primo accesso"
                          onClick={() => {
                            setErrore(null);
                            setDaRimuovere(null);
                            setDaReimpostare(u.id);
                          }}
                        >
                          Reimposta password
                        </button>
                      )}
                      <button
                        className="inline-flex h-7 items-center gap-1 rounded-md border border-red-300 bg-white px-2 text-xs font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-45 pointer-coarse:h-9"
                        onClick={() => {
                          setErrore(null);
                          setDaReimpostare(null);
                          setDaRimuovere(u.id);
                        }}
                      >
                        Rimuovi dall&apos;hotel
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {dati.utenti.length === 0 && (
              <tr><td colSpan={5} className="cella-intera py-2 text-stone-500">Nessun utente ha accesso a questo hotel.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-sm font-bold text-stone-900">Nuovo utente</h2>
        {titolare && dati.utenti.length > 0 && (
          <p className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Con il titolare unico non si aggiungono altri utenti: per farlo scegli prima &quot;Più utenti con ruoli&quot;.
          </p>
        )}
        <p className="mb-3 text-sm text-stone-600">
          {dati.sonoSuperAdmin
            ? "Se l'email esiste già, l'utente viene collegato a questo hotel con il ruolo scelto (nome e password vengono ignorati)."
            : "L'utente potrà accedere solo a questo hotel."}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Nome
            <input className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.nome} onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Email
            <input type="email" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.email} onChange={(e) => setNuovo({ ...nuovo, email: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Password iniziale (min. 10 caratteri, si cambia al primo accesso)
            <input type="text" className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.password} onChange={(e) => setNuovo({ ...nuovo, password: e.target.value })} />
          </label>
          <label className="flex w-full flex-col text-xs text-stone-600 sm:w-auto">
            Ruolo
            <select className="mt-1 w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm text-stone-900" value={nuovo.ruoloId} onChange={(e) => setNuovo({ ...nuovo, ruoloId: Number(e.target.value) })}>
              {dati.ruoli.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </label>
          <button
            disabled={busy || !nuovo.email || !nuovo.ruoloId}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-45 pointer-coarse:h-10"
            onClick={() =>
              eseguendo(async () => {
                const r = await sbusta(azioneAggiungiUtente(nuovo));
                setNuovo({ nome: "", email: "", password: "", ruoloId: ruoloPredefinito });
                return r;
              })
            }
          >
            + Aggiungi utente
          </button>
        </div>
      </section>

      {dati.sonoSuperAdmin && (
        <section className="min-w-0 rounded-xl border border-violet-200 bg-white p-4 sm:p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Gestori della piattaforma (superadmin)</h2>
          <p className="mb-3 text-sm text-stone-600">Vedono tutti gli hotel, anche quelli creati in futuro, con tutti i permessi. Visibile solo ai superadmin.</p>
          <ul className="flex flex-col gap-2">
            {dati.superAdmin.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2 text-sm">
                <span>
                  <strong>{u.nome}</strong> <span className="break-all text-stone-600">{u.email}</span>
                  {u.id === dati.ioId && <span className="ml-1 text-xs text-stone-500">(tu)</span>}
                </span>
                {u.id !== dati.ioId && (
                  <button
                    className="rounded-md px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                    onClick={() => eseguendo(() => sbusta(azioneImpostaSuperAdmin(u.id, false)))}
                  >
                    Togli superadmin
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
