"use client";

import { RotateCcw, Save, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { sbusta } from "@/lib/esito";
import { LINGUE, MODELLI, SEGNAPOSTO, type ChiaveModello, type Lingua } from "@/lib/emailRegole";
import { Avviso, Campo, Etichetta, Input, IntestazionePagina, Pulsante, Select, Sezione, Textarea } from "@/components/ui";
import { AiutoSezione, Esempio } from "@/components/AiutoSezione";
import { Suggerimento } from "@/components/Suggerimento";
import { azioneCaricaModello, azioneProvaEmail, azioneRipristinaModello, azioneSalvaConfigurazione, azioneSalvaIban, azioneSalvaModello, datiEmail } from "./actions";

type Dati = Awaited<ReturnType<typeof datiEmail>>;
type Modello = { chiave: ChiaveModello; lingua: Lingua; oggetto: string; corpo: string; personalizzato: boolean };

/** Impostazioni della posta: server della casella dell'hotel, prova, IBAN per gli acconti, modelli delle email. */
export function ImpostazioniEmail({ iniziale }: { iniziale: Dati }) {
  const [d, setD] = useState(iniziale);
  const c = d.config;
  const [form, setForm] = useState({
    host: c?.host ?? "",
    porta: String(c?.porta ?? 465),
    sicurezza: c?.sicurezza ?? "ssl",
    utente: c?.utente ?? "",
    password: "",
    mittenteNome: c?.mittenteNome ?? "",
    mittenteEmail: c?.mittenteEmail ?? iniziale.emailHotel,
    rispondiA: c?.rispondiA ?? "",
  });
  const [prova, setProva] = useState(iniziale.emailHotel);
  const [iban, setIban] = useState(iniziale.iban);
  const [scelta, setScelta] = useState<{ chiave: ChiaveModello; lingua: Lingua }>({ chiave: "conferma", lingua: "it" });
  const [modello, setModello] = useState<Modello | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "errore" | "info"; testo: string } | null>(null);

  async function esegui<T>(fn: () => Promise<T>, ok?: string) {
    setMsg(null);
    setBusy(true);
    try {
      const r = await fn();
      if (ok) setMsg({ tipo: "ok", testo: ok });
      return r;
    } catch (e) {
      setMsg({ tipo: "errore", testo: e instanceof Error ? e.message : "Errore imprevisto." });
      return null;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let attivo = true;
    sbusta(azioneCaricaModello(scelta.chiave, scelta.lingua))
      .then((m) => attivo && setModello(m))
      .catch(() => undefined);
    return () => {
      attivo = false;
    };
  }, [scelta]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 p-3 sm:p-6">
      <IntestazionePagina titolo="Email e modelli" sottotitolo={c ? `Le email partono da ${c.mittenteEmail}` : "Posta non ancora configurata"} />
      <Suggerimento id="impostazioni-email" titolo="A cosa serve">
        <p>
          Le email agli ospiti (conferme, richieste di acconto, promemoria) partono dalla <strong>casella dell&apos;hotel</strong>: servono i dati del
          server di posta in uscita, gli stessi del programma di posta o dello smartphone. La password si salva cifrata.
        </p>
        <p>
          Perché le email non finiscano nello spam il dominio dell&apos;hotel deve avere i record <strong>SPF</strong> e <strong>DKIM</strong>: di solito li
          imposta chi gestisce il dominio. Il provider della casella può avere un limite di email all&apos;ora o al giorno.
        </p>
      </Suggerimento>
      {d.simulazione && <Avviso tipo="info">Ambiente di prova: le email non partono davvero, vengono solo registrate come «simulate».</Avviso>}
      {msg && <Avviso tipo={msg.tipo}>{msg.testo}</Avviso>}

      <Sezione titolo="Server di posta in uscita (SMTP)">
        <AiutoSezione breve="Sono i dati che il provider della casella indica per l'invio dai programmi di posta.">
          <Esempio>Server smtps.esempio.it, porta 465 con SSL, utente info@hotelesempio.it e la password della casella.</Esempio>
        </AiutoSezione>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etichetta="Server" obbligatorio>
            <Input value={form.host} placeholder="smtps.esempio.it" onChange={(e) => setForm({ ...form, host: e.target.value })} />
          </Campo>
          <Campo etichetta="Porta" obbligatorio>
            <Input type="number" value={form.porta} onChange={(e) => setForm({ ...form, porta: e.target.value })} />
          </Campo>
          <Campo etichetta="Sicurezza">
            <Select
              value={form.sicurezza}
              onChange={(e) => setForm({ ...form, sicurezza: e.target.value, porta: e.target.value === "ssl" ? "465" : e.target.value === "starttls" ? "587" : form.porta })}
            >
              <option value="ssl">SSL/TLS (di solito 465)</option>
              <option value="starttls">STARTTLS (di solito 587)</option>
              <option value="nessuna">Nessuna (sconsigliato)</option>
            </Select>
          </Campo>
          <Campo etichetta="Utente" obbligatorio>
            <Input value={form.utente} autoComplete="off" onChange={(e) => setForm({ ...form, utente: e.target.value })} />
          </Campo>
          <Campo etichetta="Password" obbligatorio={!c} aiuto={c ? "Vuota = resta quella salvata." : undefined}>
            <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Campo>
          <Campo etichetta="Nome del mittente" obbligatorio>
            <Input value={form.mittenteNome} placeholder="Hotel Esempio" onChange={(e) => setForm({ ...form, mittenteNome: e.target.value })} />
          </Campo>
          <Campo etichetta="Indirizzo del mittente" obbligatorio>
            <Input type="email" value={form.mittenteEmail} onChange={(e) => setForm({ ...form, mittenteEmail: e.target.value })} />
          </Campo>
          <Campo etichetta="Risposte a" aiuto="Facoltativo: dove arrivano le risposte degli ospiti.">
            <Input type="email" value={form.rispondiA} onChange={(e) => setForm({ ...form, rispondiA: e.target.value })} />
          </Campo>
        </div>
        <Pulsante
          variante="primario"
          icona={Save}
          className="mt-3"
          disabled={busy}
          onClick={async () => {
            const r = await esegui(() => sbusta(azioneSalvaConfigurazione({ ...form, porta: Number(form.porta) })), "Configurazione salvata.");
            if (r) {
              setD(r);
              setForm({ ...form, password: "" });
            }
          }}
        >
          Salva
        </Pulsante>

        {c && (
          <div className="mt-4 border-t border-stone-200 pt-3">
            <p className="text-sm font-semibold text-stone-800">Email di prova</p>
            <div className="mt-1 flex flex-wrap items-end gap-2">
              <Campo etichetta="A">
                <Input type="email" value={prova} onChange={(e) => setProva(e.target.value)} />
              </Campo>
              <Pulsante
                icona={Send}
                disabled={busy || !prova}
                onClick={async () => {
                  const r = await esegui(() => sbusta(azioneProvaEmail(prova)));
                  if (r) {
                    setD(r.dati);
                    setMsg({ tipo: "ok", testo: `Prova ${r.esito}.` });
                  }
                }}
              >
                Invia la prova
              </Pulsante>
            </div>
            {c.ultimaProvaIl && (
              <p className="mt-1 text-xs text-stone-600">
                Ultima prova {new Date(c.ultimaProvaIl).toLocaleString("it-IT", { timeZone: "Europe/Rome" })}: {c.ultimaProvaEsito}
              </p>
            )}
          </div>
        )}
      </Sezione>

      <Sezione titolo="Bonifici degli acconti">
        <div className="flex flex-wrap items-end gap-2">
          <Campo etichetta="IBAN dell'hotel" aiuto="Compare nelle email di richiesta dell'acconto ({{iban}}).">
            <Input className="w-80" value={iban} onChange={(e) => setIban(e.target.value)} />
          </Campo>
          <Pulsante
            variante="primario"
            disabled={busy}
            onClick={async () => {
              const r = await esegui(() => sbusta(azioneSalvaIban(iban)), "IBAN salvato.");
              if (r) setD(r);
            }}
          >
            Salva
          </Pulsante>
        </div>
      </Sezione>

      <Sezione titolo="Modelli delle email">
        <AiutoSezione breve="I testi di partenza si possono modificare; i segnaposto tra {{ }} si riempiono con i dati della prenotazione.">
          <Esempio>«Gentile {"{{nome}}"} {"{{cognome}}"}» diventa «Gentile Mario Rossi».</Esempio>
        </AiutoSezione>
        <div className="mt-2 flex flex-wrap gap-2">
          <div className="w-64">
            <Select aria-label="Modello" value={scelta.chiave} onChange={(e) => setScelta({ ...scelta, chiave: e.target.value as ChiaveModello })}>
              {(Object.entries(MODELLI) as [ChiaveModello, string][]).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select aria-label="Lingua" value={scelta.lingua} onChange={(e) => setScelta({ ...scelta, lingua: e.target.value as Lingua })}>
              {(Object.entries(LINGUE) as [Lingua, string][]).map(([k, t]) => (
                <option key={k} value={k}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          {modello?.personalizzato && <Etichetta tono="blu">modificato</Etichetta>}
        </div>
        {modello && (
          <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_16rem]">
            <div className="flex flex-col gap-2">
              <Campo etichetta="Oggetto">
                <Input value={modello.oggetto} onChange={(e) => setModello({ ...modello, oggetto: e.target.value })} />
              </Campo>
              <Campo etichetta="Testo">
                <Textarea rows={16} className="font-mono text-sm" value={modello.corpo} onChange={(e) => setModello({ ...modello, corpo: e.target.value })} />
              </Campo>
              <div className="flex gap-2">
                <Pulsante
                  variante="primario"
                  icona={Save}
                  disabled={busy}
                  onClick={async () => {
                    const r = await esegui(() => sbusta(azioneSalvaModello(modello.chiave, modello.lingua, { oggetto: modello.oggetto, corpo: modello.corpo })), "Modello salvato.");
                    if (r) setModello(r);
                  }}
                >
                  Salva il modello
                </Pulsante>
                {modello.personalizzato && (
                  <Pulsante
                    icona={RotateCcw}
                    disabled={busy}
                    onClick={async () => {
                      const r = await esegui(() => sbusta(azioneRipristinaModello(modello.chiave, modello.lingua)), "Tornato al testo di partenza.");
                      if (r) setModello(r);
                    }}
                  >
                    Testo di partenza
                  </Pulsante>
                )}
              </div>
            </div>
            <div className="rounded-md bg-stone-50 p-2 text-xs">
              <p className="mb-1 font-semibold text-stone-700">Segnaposto</p>
              <ul className="flex flex-col gap-0.5">
                {Object.entries(SEGNAPOSTO).map(([k, t]) => (
                  <li key={k}>
                    <code className="text-teal-800">{`{{${k}}}`}</code> <span className="text-stone-600">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Sezione>
    </div>
  );
}
