function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900 mb-2">{title}</p>
      <div className="text-sm text-slate-700 space-y-2">{children}</div>
    </div>
  );
}

export default function GuidaPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-sm text-sky-900">
        Questa pagina spiega come usare l&apos;app. Tenetela a mente per i primi giorni di viaggio.
      </div>

      <Section title="📲 Installare l'app sul telefono">
        <p>
          <strong>iPhone (Safari):</strong> aprite il sito, toccate l&apos;icona di condivisione (il quadrato con
          la freccia in su) e scegliete &quot;Aggiungi alla schermata Home&quot;.
        </p>
        <p>
          <strong>Android (Chrome):</strong> aprite il sito, toccate i tre puntini in alto a destra e scegliete
          &quot;Aggiungi a schermata Home&quot; o &quot;Installa app&quot;.
        </p>
        <p>Da quel momento avrete un&apos;icona come qualsiasi altra app, senza dover ricordare l&apos;indirizzo.</p>
      </Section>

      <Section title="🏠 Come è organizzata l'app">
        <p>
          <strong>Oggi</strong> — la prima schermata: cosa fare oggi e un&apos;anteprima di domani, utile la
          sera per preparare vestiti e documenti.
        </p>
        <p><strong>Itinerario</strong> — tutti i 15 giorni, sempre consultabili avanti e indietro.</p>
        <p><strong>Documenti</strong> — voucher, biglietti e assicurazione: quelli comuni a tutti e quelli della vostra famiglia.</p>
        <p><strong>Dogana</strong> — frasi pronte in inglese per i controlli e l&apos;elenco farmaci.</p>
        <p><strong>Emergenze</strong> — numeri utili e cosa fare in caso di problemi medici, documenti o bagagli smarriti.</p>
        <p><strong>Extra</strong> — le escursioni facoltative del tour Ovest, con prezzi.</p>
      </Section>

      <Section title="📍 I link a Google Maps">
        <p>
          Ogni tappa con un indirizzo ha un link &quot;Apri in Google Maps&quot;: toccandolo si apre
          direttamente l&apos;app Maps con il percorso pronto.
        </p>
      </Section>

      <Section title="✏️ Aggiornare orari durante il viaggio">
        <p>
          Alcuni orari (soprattutto nel tour dell&apos;Ovest) non sono noti in anticipo. Quando la guida vi
          comunica un orario preciso, chiunque può aggiornarlo toccando &quot;Aggiorna orario/note&quot; sotto
          l&apos;attività: lo vedranno tutte e 4 le famiglie.
        </p>
      </Section>

      <Section title="🔒 Login">
        <p>
          Ogni famiglia entra con il proprio nome (SERINO, GIANNELLA, DICUONZO o CAFAGNA) e la stessa
          password condivisa. I documenti personali restano visibili solo alla propria famiglia.
        </p>
      </Section>

      <Section title="📶 Senza connessione">
        <p>
          Le pagine già aperte restano disponibili anche senza rete (utile con connessione USA incerta), ma
          per vedere aggiornamenti serve tornare online almeno un momento.
        </p>
      </Section>

      <Section title="🆘 Problemi con l'app">
        <p>Se qualcosa non funziona, contattate Daniele. Per emergenze reali durante il viaggio, usate sempre i numeri nella sezione Emergenze, non questa app.</p>
      </Section>
    </div>
  );
}
