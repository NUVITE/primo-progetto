import {
  ArrowLeftRight,
  LifeBuoy,
  MapPin,
  Pencil,
  Share,
  Smartphone,
  WifiOff,
} from "lucide-react";

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

export default function GuidaPage() {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-brand-800 px-5 py-4 text-white shadow-sm">
        <h1 className="text-[20px] font-extrabold leading-tight">Come si usa l&apos;app</h1>
        <p className="mt-1.5 text-[14px] leading-snug text-brand-100">
          Cinque minuti di lettura adesso, e durante il viaggio non dovrete più pensarci.
        </p>
      </div>

      <Card title="Installarla sul telefono" Icon={Smartphone}>
        <p>
          <strong className="text-ink-900">iPhone (Safari):</strong> aprite il sito, toccate
          l&apos;icona di condivisione <Share size={15} className="inline" strokeWidth={2.4} /> in
          basso, poi &ldquo;Aggiungi alla schermata Home&rdquo;.
        </p>
        <p>
          <strong className="text-ink-900">Android (Chrome):</strong> aprite il sito, toccate i tre
          puntini in alto a destra, poi &ldquo;Installa app&rdquo; o &ldquo;Aggiungi a schermata
          Home&rdquo;.
        </p>
        <p className="rounded-xl bg-sand-100 px-3.5 py-3 text-[14px]">
          Da quel momento avrete un&apos;icona come qualsiasi altra app: niente indirizzi da
          ricordare, niente browser da aprire.
        </p>
      </Card>

      <Card title="Muoversi tra i giorni" Icon={ArrowLeftRight}>
        <p>
          La schermata <strong className="text-ink-900">Oggi</strong> si apre sempre sulla giornata
          in corso. Con le <strong className="text-ink-900">frecce</strong> ai lati della data
          potete scorrere avanti e indietro tutti i 15 giorni, quando volete.
        </p>
        <p>
          Sotto la giornata di oggi trovate sempre l&apos;anteprima di{" "}
          <strong className="text-ink-900">domani</strong>: leggetela la sera, prima di preparare
          borse e vestiti.
        </p>
      </Card>

      <Card title="I link a Google Maps" Icon={MapPin}>
        <p>
          Ogni tappa con un indirizzo ha il pulsante blu{" "}
          <strong className="text-ink-900">Apri in Maps</strong>. Toccandolo si apre direttamente
          l&apos;app Maps del telefono con il posto già cercato: da lì premete
          &ldquo;Indicazioni&rdquo;.
        </p>
        <p>
          Prima di partire, scaricate in Google Maps le{" "}
          <strong className="text-ink-900">mappe offline</strong> di Los Angeles, Las Vegas e New
          York: funzionano anche senza connessione.
        </p>
      </Card>

      <Card title="Aggiornare un orario durante il viaggio" Icon={Pencil}>
        <p>
          Nel tour dell&apos;Ovest molti orari si sanno solo sul posto. Quando la guida vi dice
          l&apos;orario preciso, toccate{" "}
          <strong className="text-ink-900">&ldquo;Aggiorna orario/note&rdquo;</strong> sotto
          l&apos;attività e scrivetelo.
        </p>
        <p>
          La modifica <strong className="text-ink-900">la vedono tutte e quattro le famiglie</strong>:
          basta che lo faccia una persona sola.
        </p>
      </Card>

      <Card title="Senza connessione" Icon={WifiOff}>
        <p>
          Le pagine che avete già aperto restano consultabili anche senza rete. Per vedere
          aggiornamenti (o un orario appena corretto da un&apos;altra famiglia) serve però tornare
          online un momento.
        </p>
        <p className="rounded-xl bg-clay-50 px-3.5 py-3 text-[14px] text-clay-700">
          Consiglio: la sera, sotto il wi-fi dell&apos;hotel, aprite la giornata di domani. Così
          ce l&apos;avrete comunque, anche se il giorno dopo restate senza campo in mezzo a un
          parco.
        </p>
      </Card>

      <Card title="In caso di problemi" Icon={LifeBuoy}>
        <p>
          Se l&apos;app non funziona, chiamate Daniele. Per{" "}
          <strong className="text-ink-900">emergenze vere</strong> durante il viaggio usate sempre
          i numeri nella sezione SOS, mai questa app.
        </p>
      </Card>
    </div>
  );
}
