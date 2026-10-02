"use client";

import { useEffect, useState } from "react";
import { Check, Printer, Smartphone, Wallet, Luggage } from "lucide-react";

interface Voce {
  id: string;
  testo: string;
  dettaglio?: string;
  critico?: boolean;
}

interface Gruppo {
  id: string;
  titolo: string;
  sottotitolo: string;
  Icon: React.ElementType;
  voci: Voce[];
}

const GRUPPI: Gruppo[] = [
  {
    id: "stampare",
    titolo: "Da stampare",
    sottotitolo: "Carta vera, non solo sul telefono: alcuni voucher lo richiedono espressamente",
    Icon: Printer,
    voci: [
      {
        id: "moma",
        testo: "Voucher del MoMA",
        dettaglio:
          "Il voucher dice testualmente «Voucher stampato. Stampare e portare il voucher con sé». Serve anche un documento con foto.",
        critico: true,
      },
      {
        id: "universal",
        testo: "Biglietti Universal Studios (uno per persona)",
        dettaglio:
          "Sono nominali e non trasferibili. Al tornello chiedono un documento con foto e possono chiedere la biometria. La prima visita vale SOLO il 10 agosto.",
        critico: true,
      },
      {
        id: "esta",
        testo: "ESTA di tutti i componenti della famiglia",
        dettaglio: "Alla frontiera può essere richiesta. Una copia per persona.",
        critico: true,
      },
      {
        id: "polizza",
        testo: "Polizza assicurativa",
        dettaglio:
          "Con il numero di polizza e il telefono della centrale operativa: +39 039 989 0702. Se state male, quel numero va chiamato prima di andare in ospedale.",
        critico: true,
      },
      { id: "voli", testo: "Biglietti aerei e carte d'imbarco" },
      { id: "hotel", testo: "Voucher degli hotel" },
      { id: "transfer", testo: "Voucher dei transfer (Las Vegas, Newark, rientro)" },
      { id: "citypass", testo: "New York CityPASS", dettaglio: "Meglio l'app My CityPASS, ma una copia di scorta non pesa." },
      { id: "contrasti", testo: "QR code del Tour dei Contrasti" },
      { id: "programma", testo: "Il programma di viaggio dell'agenzia" },
    ],
  },
  {
    id: "telefono",
    titolo: "Da preparare sul telefono",
    sottotitolo: "Fatelo a casa sotto il wi-fi, non all'ultimo in aeroporto",
    Icon: Smartphone,
    voci: [
      {
        id: "citypass-app",
        testo: "App My CityPASS, con i biglietti già caricati",
        dettaglio: "Verificate che i biglietti si vedano già dall'Italia, non fidatevi di scoprirlo là.",
        critico: true,
      },
      {
        id: "mappe-offline",
        testo: "Mappe offline di Google Maps",
        dettaglio: "Los Angeles, Las Vegas e New York. Funzionano senza rete e senza consumare dati.",
      },
      { id: "uber", testo: "App Uber e/o Lyft, con il pagamento già impostato" },
      { id: "riu", testo: "App RIU per il check-in online a New York" },
      { id: "universal-app", testo: "App Universal Studios Hollywood", dettaglio: "Mostra i tempi d'attesa e la mappa del parco." },
      { id: "questa-app", testo: "Questa guida installata sulla schermata Home" },
      { id: "foto-documenti", testo: "Foto di passaporto ed ESTA nel telefono", dettaglio: "Se perdete l'originale, avere la copia accelera tutto." },
    ],
  },
  {
    id: "soldi",
    titolo: "Soldi",
    sottotitolo: "Le escursioni facoltative del tour si pagano solo in contanti",
    Icon: Wallet,
    voci: [
      {
        id: "carta",
        testo: "Carta di credito con plafond adeguato",
        dettaglio:
          "Obbligatoria come cauzione al check-in negli hotel: i contanti non vengono accettati come garanzia.",
        critico: true,
      },
      {
        id: "contanti",
        testo: "Contanti in dollari per le escursioni facoltative",
        dettaglio:
          "Jeep tour a Monument Valley 80 $, Las Vegas by night 60 $, spiagge di Los Angeles 60 $ a persona. I voli panoramici si possono pagare anche con carta.",
      },
      { id: "mance", testo: "Banconote piccole per le mance", dettaglio: "1-2 $ a valigia per il facchino, 2-5 $ al giorno per le pulizie in camera." },
      { id: "banca", testo: "Chiedere alla propria banca quanto costa prelevare negli USA" },
    ],
  },
  {
    id: "valigia",
    titolo: "In valigia",
    sottotitolo: "Le cose che in America non si trovano o costano care",
    Icon: Luggage,
    voci: [
      {
        id: "adattatori",
        testo: "Adattatori di corrente (almeno due per famiglia)",
        dettaglio: "Negli USA la corrente è a 110 V con prese di tipo A/B. Attenzione a phon e piastre non dual-voltage.",
        critico: true,
      },
      {
        id: "farmaci",
        testo: "Farmaci nelle confezioni originali, nel bagaglio a mano",
        dettaglio: "Per quelli con ricetta, portate una copia della prescrizione. L'elenco pronto è nella scheda Dogana.",
        critico: true,
      },
      { id: "borraccia", testo: "Una borraccia a testa", dettaglio: "Nei parchi si riempie ovunque, e nell'Ovest si beve molto più del solito." },
      { id: "felpa", testo: "Una felpa leggera sempre a portata", dettaglio: "Aria condizionata gelida ovunque, e all'alba a Bryce si sfiorano i 10 gradi." },
      { id: "scarpe", testo: "Scarpe chiuse già rodate", dettaglio: "Ad Antelope Canyon infradito e sandali aperti non sono ammessi." },
      { id: "eleganti", testo: "Un capo più curato a testa", dettaglio: "Per i rooftop di New York e i ristoranti di Las Vegas c'è un dress code: niente canottiere o ciabatte." },
    ],
  },
];

const STORAGE_KEY = "usa2026-checklist";

export function ChecklistPartenza() {
  const [fatti, setFatti] = useState<Record<string, boolean>>({});
  const [caricato, setCaricato] = useState(false);

  // Lo stato resta sul telefono di chi spunta: ognuno prepara la propria valigia.
  useEffect(() => {
    try {
      const salvato = localStorage.getItem(STORAGE_KEY);
      if (salvato) setFatti(JSON.parse(salvato));
    } catch {
      // se il salvataggio locale non e' disponibile si parte semplicemente da zero
    }
    setCaricato(true);
  }, []);

  useEffect(() => {
    if (!caricato) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fatti));
    } catch {
      // niente da fare: la spunta vale solo per questa sessione
    }
  }, [fatti, caricato]);

  const tutte = GRUPPI.flatMap((g) => g.voci);
  const completate = tutte.filter((v) => fatti[v.id]).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand-200">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-ink-900">
            {completate} di {tutte.length}
          </p>
          <p className="text-[13px] text-ink-400">Le spunte restano su questo telefono</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${tutte.length ? (completate / tutte.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {GRUPPI.map((g) => (
        <section key={g.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-sand-200">
          <div className="border-b border-sand-100 px-5 py-4">
            <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-ink-900">
              <g.Icon size={19} strokeWidth={2.2} className="text-brand-600" />
              {g.titolo}
            </h2>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-400">{g.sottotitolo}</p>
          </div>

          <ul className="divide-y divide-sand-100">
            {g.voci.map((v) => {
              const fatto = !!fatti[v.id];
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => setFatti((s) => ({ ...s, [v.id]: !s[v.id] }))}
                    aria-pressed={fatto}
                    className="flex w-full items-start gap-3 p-4 text-left active:bg-sand-50"
                  >
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        fatto ? "border-brand-600 bg-brand-600 text-white" : "border-sand-300 bg-white"
                      }`}
                    >
                      {fatto && <Check size={15} strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[16px] font-bold leading-snug ${
                          fatto ? "text-ink-400 line-through" : "text-ink-900"
                        }`}
                      >
                        {v.testo}
                        {v.critico && !fatto && (
                          <span className="ml-2 rounded-full bg-clay-100 px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-wide text-clay-700">
                            Importante
                          </span>
                        )}
                      </span>
                      {v.dettaglio && (
                        <span className={`mt-0.5 block text-[14px] leading-snug ${fatto ? "text-ink-400" : "text-ink-500"}`}>
                          {v.dettaglio}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
