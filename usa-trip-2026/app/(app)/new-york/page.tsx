import { Compass, CreditCard, Footprints, Navigation, ShieldCheck, TrainFront } from "lucide-react";
import { NycMapClient } from "@/components/NycMapClient";

function Card({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
      <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-ink-900">
        <Icon size={19} strokeWidth={2.2} className="text-brand-600" />
        {title}
      </h2>
      <div className="mt-3 space-y-2.5 text-[15px] leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

export default function NewYorkPage() {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm">
        <h1 className="text-[20px] font-extrabold leading-tight">New York, in autonomia</h1>
        <p className="mt-1 text-[14px] leading-snug text-brand-100">
          Dal 18 al 22 agosto vi muovete da soli. Questa pagina è la mappa colorata
          dell&apos;agenzia, in tasca: scegliete il giorno e vedete subito in che zona andate.
        </p>
      </div>

      <NycMapClient />

      <Card title="Come si leggono gli indirizzi" Icon={Compass}>
        <p>
          Manhattan è una scacchiera, e in cinque minuti si impara a leggerla.
        </p>
        <p>
          Le <strong className="text-ink-900">Avenue</strong> corrono da nord a sud e sono
          numerate da est (1st Ave) verso ovest (12th Ave). Le{" "}
          <strong className="text-ink-900">Street</strong> corrono da est a ovest e sono numerate
          da sud (1st St) verso nord.
        </p>
        <p>
          La <strong className="text-ink-900">Fifth Avenue divide la città in East e West</strong>:
          &ldquo;46th Street East&rdquo; e &ldquo;46th Street West&rdquo; sono due tratti diversi
          della stessa via. Il vostro hotel è al 305 <em>West</em> 46th Street: a ovest della
          Fifth.
        </p>
        <div className="rounded-xl bg-sand-100 p-3.5">
          <p className="font-bold text-ink-900">Quanto ci metto a piedi?</p>
          <ul className="mt-1.5 space-y-1">
            <li>
              <Footprints size={14} className="mr-1.5 inline text-brand-600" strokeWidth={2.4} />
              Un isolato tra due <strong>Street</strong>: circa 1 minuto
            </li>
            <li>
              <Footprints size={14} className="mr-1.5 inline text-brand-600" strokeWidth={2.4} />
              Un isolato tra due <strong>Avenue</strong>: circa 3 minuti
            </li>
            <li>
              <Footprints size={14} className="mr-1.5 inline text-brand-600" strokeWidth={2.4} />
              Venti Street = circa 1,5 miglia = 25 minuti di cammino
            </li>
          </ul>
        </div>
      </Card>

      <Card title="Uptown e Downtown" Icon={Navigation}>
        <p>
          In metropolitana servono solo due parole:{" "}
          <strong className="text-ink-900">Uptown</strong> vuol dire verso nord,{" "}
          <strong className="text-ink-900">Downtown</strong> verso sud.
        </p>
        <p>
          Attenzione: nelle stazioni più piccole gli ingressi delle due direzioni sono separati e
          non comunicano. Se entrate dalla parte sbagliata dovete uscire e riattraversare la
          strada.
        </p>
      </Card>

      <Card title="Pagare la metropolitana: OMNY" Icon={CreditCard}>
        <p>
          Dimenticate la MetroCard. Oggi si usa <strong className="text-ink-900">OMNY</strong>:
          appoggiate direttamente la carta di credito contactless o il telefono sul lettore giallo
          al tornello.
        </p>
        <ul className="space-y-1.5">
          <li>• Costo 2,90 $ a corsa, cambi inclusi</li>
          <li>
            • <strong className="text-ink-900">Ogni persona deve usare la propria carta</strong> o
            il proprio telefono
          </li>
          <li>
            • Usando sempre la stessa carta, dopo 12 corse in una settimana (lunedì-domenica) le
            successive sono gratuite
          </li>
          <li>• I bambini sotto i 44 pollici di altezza viaggiano gratis se accompagnati</li>
        </ul>
      </Card>

      <Card title="Le fermate attorno all'hotel" Icon={TrainFront}>
        <p className="text-[14px] text-ink-400">
          Hotel Riu Plaza, 305 West 46th Street. Tutte entro 5 minuti a piedi.
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-ink-900">42 St – Port Authority</strong> (linee A, C, E) —
            angolo 8th Ave e 42nd St. La userete per Downtown e per l&apos;Upper West Side.
          </li>
          <li>
            <strong className="text-ink-900">50 St</strong> (linee C, E) — 8th Ave e 50th St
          </li>
          <li>
            <strong className="text-ink-900">49 St</strong> (linee N, R, W) — 7th Ave e 49th St
          </li>
          <li>
            <strong className="text-ink-900">Times Sq – 42 St</strong> (linee 1, 2, 3, 7, N, Q, R,
            W, S) — il grande nodo di scambio, a 6 minuti
          </li>
        </ul>
      </Card>

      <Card title="Buone abitudini" Icon={ShieldCheck}>
        <p>
          Manhattan è sicura, ma valgono le regole di ogni grande città: borse chiuse e davanti
          nella metro affollata, portafogli mai nella tasca posteriore.
        </p>
        <p>
          Attenzione ai personaggi in costume di Times Square, che chiedono soldi dopo la foto. Non
          date mai il documento a chi vi ferma per strada proponendo tour o dischi. La sera, in
          metro, salite sulle carrozze centrali, più frequentate.
        </p>
        <p className="rounded-xl bg-clay-50 p-3.5 text-clay-700">
          <strong>Il consiglio che cambia la giornata:</strong> col fuso a favore vi sveglierete
          naturalmente alle 6-6:30. Colazione alle 7:00-7:30 e fuori entro le 8:30 significa
          trovare musei e attrazioni ancora vuoti.
        </p>
      </Card>
    </div>
  );
}
