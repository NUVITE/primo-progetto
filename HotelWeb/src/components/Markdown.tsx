import Link from "next/link";
import type { ReactNode } from "react";
import { markdown, type Blocco, type Inline } from "@/lib/manualeRegole";

/** Testo in linea; i collegamenti interni (che iniziano con /) restano nell'app, gli altri aprono una scheda nuova. */
function Testo({ parti }: { parti: Inline[] }) {
  return (
    <>
      {parti.map((p, i): ReactNode => {
        if (p.tipo === "grassetto") return <strong key={i}>{p.testo}</strong>;
        if (p.tipo === "corsivo") return <em key={i}>{p.testo}</em>;
        if (p.tipo === "codice")
          return (
            <code key={i} className="rounded bg-stone-100 px-1 py-0.5 font-mono text-[0.9em] text-stone-800">
              {p.testo}
            </code>
          );
        if (p.tipo === "link")
          return p.href.startsWith("/") || p.href.startsWith("#") ? (
            <Link key={i} href={p.href} className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2">
              {p.testo}
            </Link>
          ) : (
            <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal-800 underline decoration-teal-300 underline-offset-2">
              {p.testo}
            </a>
          );
        return <span key={i}>{p.testo}</span>;
      })}
    </>
  );
}

function BloccoMd({ b }: { b: Blocco }) {
  switch (b.tipo) {
    case "titolo": {
      const classi = { 1: "mt-2 text-2xl font-bold", 2: "mt-6 border-b border-stone-200 pb-1 text-xl font-bold", 3: "mt-4 text-base font-bold" }[b.livello];
      const Tag = (`h${b.livello}` as "h1" | "h2" | "h3");
      return (
        <Tag id={b.ancora} className={`scroll-mt-4 text-stone-900 ${classi}`}>
          <Testo parti={b.testo} />
        </Tag>
      );
    }
    case "paragrafo":
      return (
        <p className="leading-relaxed">
          <Testo parti={b.testo} />
        </p>
      );
    case "elenco": {
      const Tag = b.numerato ? "ol" : "ul";
      return (
        <Tag className={`space-y-1 pl-6 leading-relaxed ${b.numerato ? "list-decimal" : "list-disc"}`}>
          {b.voci.map((v, i) => (
            <li key={i}>
              <Testo parti={v} />
            </li>
          ))}
        </Tag>
      );
    }
    case "codice":
      return <pre className="overflow-x-auto rounded-md bg-stone-900 p-3 font-mono text-xs leading-relaxed text-stone-100">{b.testo}</pre>;
    case "nota":
      return (
        <div className="rounded-md border-l-4 border-teal-600 bg-teal-50 px-3 py-2 leading-relaxed text-stone-800">
          <Testo parti={b.testo} />
        </div>
      );
    case "tabella":
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {b.intestazioni.map((h, i) => (
                  <th key={i} className="border-b border-stone-300 px-2 py-1 text-left font-semibold">
                    <Testo parti={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.righe.map((r, i) => (
                <tr key={i} className="border-b border-stone-100 align-top">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1">
                      <Testo parti={c} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "video":
      return (
        <figure className="flex flex-col gap-1">
          <video controls preload="metadata" src={b.src} className="w-full rounded-md border border-stone-200 bg-stone-900 print:hidden" />
          {b.didascalia && <figcaption className="text-sm text-stone-600">Video: {b.didascalia}</figcaption>}
        </figure>
      );
  }
}

/** Markdown ridotto del manuale (vedi manualeRegole.ts), senza librerie esterne né HTML grezzo. */
export function Markdown({ testo }: { testo: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3 text-[15px] text-stone-800">
      {markdown(testo).map((b, i) => (
        <BloccoMd key={i} b={b} />
      ))}
    </div>
  );
}
