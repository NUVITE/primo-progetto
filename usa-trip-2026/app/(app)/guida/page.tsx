import {
  ArrowLeftRight,
  CalendarDays,
  Camera,
  Clock,
  Compass,
  FileText,
  KeyRound,
  LifeBuoy,
  Lightbulb,
  Map,
  MapPin,
  Pencil,
  Share,
  Smartphone,
  Sun,
  Users,
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

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold text-ink-900">
          <Compass size={19} strokeWidth={2.2} className="text-brand-600" />
          Cosa c&apos;è in ogni sezione
        </h2>
        <p className="mt-1.5 text-[14px] leading-snug text-ink-400">
          Le sette icone in fondo allo schermo, in ordine.
        </p>

        <ul className="mt-3 space-y-3">
          {[
            {
              Icon: Sun,
              nome: "Oggi",
              cosa: "La giornata in corso: orari, tappe, hotel, come vestirsi. Con le frecce ai lati della data scorrete tutti i 15 giorni. Sotto trovate l'anteprima di domani, da leggere la sera. Prima della partenza qui c'è anche il conto alla rovescia, che porta alla lista di cosa stampare e mettere in valigia.",
            },
            {
              Icon: CalendarDays,
              nome: "Giorni",
              cosa: "L'elenco di tutte e 15 le giornate, per saltare direttamente a quella che vi interessa senza scorrere.",
            },
            {
              Icon: Lightbulb,
              nome: "Idee",
              cosa: "Le proposte che ho cercato io sul web, filtrabili per categoria: mangiare, utilità pratiche, cose da vedere, film, con i ragazzi. Ognuna dice se è gratis o a pagamento. NON fanno parte del programma dell'agenzia.",
            },
            {
              Icon: Map,
              nome: "New York",
              cosa: "La mappa vera con le strade: scegliete il giorno e vedete il percorso di quella giornata col suo colore. Sotto, come si leggono gli indirizzi, come funziona OMNY e le fermate metro attorno all'hotel.",
            },
            {
              Icon: Camera,
              nome: "Foto",
              cosa: "Scattate con la fotocamera normale del telefono, poi qui scegliete cosa e quando caricare (anche più foto insieme). Restano sempre anche nella fotocamera: se il caricamento fallisce, si riprova senza aver perso nulla. Vedete quelle della vostra famiglia e quelle che le altre famiglie hanno scelto di condividere con tutto il gruppo; toccando una foto trovate l'interruttore per condividerla anche voi con tutti.",
            },
            {
              Icon: FileText,
              nome: "Documenti",
              cosa: "Voucher, biglietti, hotel, transfer e assicurazione. Quelli comuni li vedono tutti; gli ESTA sono nominali e li vede solo la vostra famiglia.",
            },
            {
              Icon: LifeBuoy,
              nome: "SOS",
              cosa: "Il 911, i numeri dell'agenzia e dei consolati, l'assicurazione e cosa fare passo per passo se qualcuno sta male o si perde un documento o un bagaglio.",
            },
          ].map((v) => (
            <li key={v.nome} className="flex gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <v.Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[16px] font-bold text-ink-900">{v.nome}</span>
                <span className="block text-[14px] leading-snug text-ink-500">{v.cosa}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 rounded-xl bg-sand-100 px-3.5 py-3 text-[14px] leading-snug text-ink-500">
          <strong className="text-ink-900">Dogana e farmaci</strong> ed{" "}
          <strong className="text-ink-900">Escursioni extra</strong> si raggiungono dai due pulsanti
          in fondo alla schermata Oggi.
        </p>
      </section>

      <Card title="Chi sei?" Icon={Users}>
        <p>
          Ogni famiglia ha un solo accesso condiviso, ma le foto vanno attribuite a chi le carica:
          per questo, la prima volta che entrate su un telefono, l&apos;app chiede{" "}
          <strong className="text-ink-900">chi siete</strong> tra i nomi della vostra famiglia (o
          permette di aggiungerne uno nuovo).
        </p>
        <p className="rounded-xl bg-brand-50 px-3.5 py-3 text-[14px] leading-snug text-brand-800">
          A cosa serve: dire chi siete crea la <strong>vostra area personale di foto e
          ricordi</strong> nella sezione Foto, da riguardare con calma dopo il viaggio o da
          condividere con gli altri quando volete voi.
        </p>
        <p>
          Se un altro membro della famiglia usa lo stesso telefono, toccate{" "}
          <strong className="text-ink-900">&ldquo;cambia&rdquo;</strong> accanto al vostro nome, in
          alto, per scegliere un nome diverso.
        </p>
      </Card>

      <Card title="Password e profilo" Icon={KeyRound}>
        <p>
          Dall&apos;icona <strong className="text-ink-900">ingranaggio</strong> in alto si apre il
          profilo, dove ogni famiglia può <strong className="text-ink-900">cambiare la propria
          password</strong>. Vale per tutti quelli che accedono con quella famiglia: chi non ha
          ancora fatto accesso su un telefono dovrà usare la nuova.
        </p>
      </Card>

      <Card title="I due orologi in alto" Icon={Clock}>
        <p>
          Nell&apos;intestazione trovate sempre <strong className="text-ink-900">l&apos;ora del
          posto dove siete</strong> e <strong className="text-ink-900">quella in Italia</strong>,
          affiancate.
        </p>
        <p>
          L&apos;icona del telefono accanto è <span className="font-bold text-emerald-700">verde</span>{" "}
          quando in Italia sono svegli (dalle 8 alle 22) e{" "}
          <span className="font-bold text-rose-700">rossa</span> quando è notte: un&apos;occhiata e
          sapete se potete chiamare casa senza svegliare nessuno.
        </p>
        <p className="text-[14px] text-ink-400">
          Il fuso cambia da solo seguendo la tappa del giorno. Nell&apos;Ovest ne attraverserete
          quattro: l&apos;Arizona non fa l&apos;ora legale, la Nazione Navajo sì.
        </p>
      </Card>

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

      <Card title="Foto e video: meglio in Wi-Fi" Icon={Camera}>
        <p>
          I video occupano molti giga. Se il telefono rileva che siete sotto rete dati mobile,
          l&apos;app vi avvisa e blocca il caricamento a meno che confermiate di avere giga
          illimitati. Su iPhone questo controllo automatico non è possibile: caricate quando siete
          in Wi-Fi (di solito la sera in hotel).
        </p>
        <p>
          Toccando &ldquo;Scegli foto o video&rdquo; potete selezionarne{" "}
          <strong className="text-ink-900">più di uno insieme</strong> dalla galleria del
          telefono: fotografate tutto il giorno tranquilli, poi la sera scegliete in blocco cosa
          caricare.
        </p>
        <p className="text-[14px] text-ink-400">
          Aprire una foto o un video già caricato richiede comunque un po&apos; di connessione,
          perché il file vero e proprio non resta salvato nell&apos;app: viene ripreso al momento
          da dove è archiviato.
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
