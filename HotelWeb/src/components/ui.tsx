import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Componenti di interfaccia condivisi (revisione UX 2026-09-30). Regole:
 * - al banco (PC) stile compatto; al tocco (tablet/telefono) i controlli diventano più alti
 *   (variante pointer-coarse) per chi lavora ai piani;
 * - un'azione è sempre un pulsante riconoscibile: primario pieno, secondario bordato,
 *   pericolo in rosso, "leggero" per le azioni di riga (con icona e sfondo al passaggio);
 * - ogni campo ha l'etichetta sopra, l'aiuto o l'errore sotto.
 */

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

// ---------------- Pulsanti ----------------

type Variante = "primario" | "secondario" | "pericolo" | "leggero";
const VARIANTI: Record<Variante, string> = {
  primario: "bg-teal-700 text-white shadow-sm hover:bg-teal-800 active:bg-teal-900",
  secondario: "border border-stone-300 bg-white text-stone-800 shadow-sm hover:bg-stone-50 hover:border-stone-400",
  pericolo: "border border-red-300 bg-white text-red-700 shadow-sm hover:bg-red-50",
  leggero: "text-teal-800 hover:bg-teal-50",
};
const DIMENSIONI = {
  normale: "h-8 px-3 text-sm gap-1.5 pointer-coarse:h-10",
  piccolo: "h-7 px-2 text-xs gap-1 pointer-coarse:h-9",
};

export function Pulsante({
  variante = "secondario",
  dimensione = "normale",
  icona: Icona,
  className,
  children,
  type = "button",
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; dimensione?: keyof typeof DIMENSIONI; icona?: LucideIcon }) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTI[variante],
        DIMENSIONI[dimensione],
        className,
      )}
      {...resto}
    >
      {Icona && <Icona className={dimensione === "piccolo" ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />}
      {children}
    </button>
  );
}

// ---------------- Campi ----------------

export const CLASSE_CAMPO =
  "h-8 w-full min-w-0 rounded-md border border-stone-300 bg-white px-2.5 text-sm text-stone-900 shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] " +
  "hover:border-stone-400 disabled:bg-stone-100 disabled:text-stone-500 pointer-coarse:h-10";

export function Input({ className, ...resto }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(CLASSE_CAMPO, className)} {...resto} />;
}

export function Select({ className, children, ...resto }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(CLASSE_CAMPO, "pr-7", className)} {...resto}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...resto }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(CLASSE_CAMPO, "h-auto py-1.5", className)} {...resto} />;
}

/** Etichetta sopra, controllo, aiuto o errore sotto. */
export function Campo({
  etichetta,
  aiuto,
  errore,
  obbligatorio,
  className,
  children,
}: {
  etichetta: ReactNode;
  aiuto?: ReactNode;
  errore?: string | null;
  obbligatorio?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cx("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-xs font-semibold text-stone-700">
        {etichetta}
        {obbligatorio && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
      {errore ? <span className="text-xs font-medium text-red-700">{errore}</span> : aiuto ? <span className="text-xs text-stone-500">{aiuto}</span> : null}
    </label>
  );
}

/** Casella di spunta con testo cliccabile. */
export function Spunta({ etichetta, className, ...resto }: InputHTMLAttributes<HTMLInputElement> & { etichetta: ReactNode }) {
  return (
    <label className={cx("inline-flex items-center gap-2 text-sm text-stone-800 pointer-coarse:min-h-10", className)}>
      <input type="checkbox" {...resto} />
      {etichetta}
    </label>
  );
}

// ---------------- Struttura della pagina ----------------

export function IntestazionePagina({ titolo, sottotitolo, sopra, azioni }: { titolo: ReactNode; sottotitolo?: ReactNode; sopra?: ReactNode; azioni?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {sopra && <div className="mb-0.5 text-sm">{sopra}</div>}
        <h1 className="text-xl font-bold text-stone-900">{titolo}</h1>
        {sottotitolo && <div className="mt-0.5 text-sm text-stone-600">{sottotitolo}</div>}
      </div>
      {azioni && <div className="flex flex-wrap items-center gap-2">{azioni}</div>}
    </div>
  );
}

/** Riquadro bianco con titolo: separa i blocchi della pagina. */
export function Sezione({
  titolo,
  descrizione,
  azioni,
  className,
  corpoClassName,
  children,
}: {
  titolo?: ReactNode;
  descrizione?: ReactNode;
  azioni?: ReactNode;
  className?: string;
  corpoClassName?: string;
  children: ReactNode;
}) {
  return (
    <section className={cx("min-w-0 rounded-lg border border-stone-200 bg-white shadow-sm", className)}>
      {(titolo || azioni) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 px-4 py-2.5">
          <div className="min-w-0">
            {titolo && <h2 className="text-sm font-bold text-stone-900">{titolo}</h2>}
            {descrizione && <p className="text-xs text-stone-500">{descrizione}</p>}
          </div>
          {azioni && <div className="flex flex-wrap items-center gap-2">{azioni}</div>}
        </header>
      )}
      <div className={cx("p-4", corpoClassName)}>{children}</div>
    </section>
  );
}

// ---------------- Stati e messaggi ----------------

type Tono = "neutro" | "verde" | "ambra" | "rosso" | "blu" | "viola";
const TONI: Record<Tono, string> = {
  neutro: "bg-stone-100 text-stone-700 ring-stone-300",
  verde: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  ambra: "bg-amber-50 text-amber-900 ring-amber-300",
  rosso: "bg-red-50 text-red-800 ring-red-300",
  blu: "bg-sky-50 text-sky-800 ring-sky-300",
  viola: "bg-violet-50 text-violet-800 ring-violet-300",
};

export function Etichetta({ tono = "neutro", children, className }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={cx("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset", TONI[tono], className)}>{children}</span>;
}

const AVVISI = {
  ok: { classe: "border-emerald-300 bg-emerald-50 text-emerald-900", icona: CheckCircle2 },
  errore: { classe: "border-red-300 bg-red-50 text-red-900", icona: XCircle },
  avviso: { classe: "border-amber-300 bg-amber-50 text-amber-950", icona: AlertTriangle },
  info: { classe: "border-sky-200 bg-sky-50 text-sky-900", icona: Info },
};

export function Avviso({ tipo = "info", children, className, azione }: { tipo?: keyof typeof AVVISI; children: ReactNode; className?: string; azione?: ReactNode }) {
  const { classe, icona: Icona } = AVVISI[tipo];
  return (
    <div role={tipo === "errore" ? "alert" : "status"} className={cx("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", classe, className)}>
      <Icona className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {azione}
    </div>
  );
}

/** Coppia etichetta/valore per i riepiloghi in sola lettura. */
export function Dato({ etichetta, children, className }: { etichetta: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0", className)}>
      <div className="text-xs font-medium text-stone-500">{etichetta}</div>
      <div className="text-sm text-stone-900">{children}</div>
    </div>
  );
}
