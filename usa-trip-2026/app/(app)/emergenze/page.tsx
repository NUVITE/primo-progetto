import { Ambulance, Building2, Luggage, Phone, ShieldPlus, Siren } from "lucide-react";
import { prisma } from "@/lib/db";

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
      <div className="mt-3 text-[15px] leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

function Tel({ number, label }: { number: string; label: string }) {
  return (
    <a
      href={`tel:${number.replace(/[\s()]/g, "")}`}
      className="flex items-center justify-between gap-3 rounded-xl bg-sand-100 px-3.5 py-3 active:bg-sand-200"
    >
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-ink-500">{label}</span>
        <span className="block text-[16px] font-extrabold text-ink-900">{number}</span>
      </span>
      <Phone size={18} strokeWidth={2.4} className="shrink-0 text-brand-600" />
    </a>
  );
}

/** Trasforma i passi numerati salvati come testo in un elenco leggibile. */
function Steps({ text }: { text: string }) {
  const steps = text
    .split(/\s*\d\)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <ol className="space-y-2.5">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[13px] font-extrabold text-white tabular-nums">
            {i + 1}
          </span>
          <span className="leading-snug">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default async function EmergenzePage() {
  const info = await prisma.emergencyInfo.findFirst();

  return (
    <div className="space-y-4 p-4">
      <a
        href="tel:911"
        className="flex items-center gap-4 rounded-2xl bg-rose-700 px-5 py-4 text-white shadow-sm active:bg-rose-800"
      >
        <Siren size={34} strokeWidth={2} className="shrink-0" />
        <span>
          <span className="block text-[36px] font-extrabold leading-none tracking-tight">911</span>
          <span className="block text-[13px] font-medium text-rose-100">
            Emergenza vera: polizia, ambulanza, pompieri
          </span>
        </span>
      </a>

      {info && (
        <>
          <Card title="Numeri utili" Icon={Phone}>
            <div className="space-y-2">
              <Tel number={info.agencyPhone24h} label="Agenzia C&C Viaggi — assistenza 24h" />
              {info.teamAmericaNyPhone && (
                <Tel
                  number={info.teamAmericaNyPhone}
                  label="TeamAmerica (tour Ovest e Los Angeles)"
                />
              )}
              <Tel number="+1 310 433 5422" label="Consolato Italia Los Angeles — emergenze" />
              <Tel number="+1 212 737 9100" label="Consolato Italia New York" />
            </div>
            <p className="mt-3 text-[14px] text-ink-400">Email agenzia: {info.agencyEmail}</p>
          </Card>

          <Card title="Assicurazione" Icon={ShieldPlus}>
            <p className="text-[17px] font-bold text-ink-900">{info.insuranceProvider}</p>
            <p className="mt-1">{info.policyNumber}</p>
            <p className="mt-1">{info.insurancePhone}</p>
            <p className="mt-3 rounded-xl bg-clay-50 px-3.5 py-3 text-[14px] leading-snug text-clay-700">
              Il numero esatto della centrale operativa è sulla vostra polizza, nella sezione
              Documenti. Tenetelo a portata: va chiamato <strong>prima</strong> di andare in
              ospedale, se la situazione lo permette.
            </p>
          </Card>

          <Card title="Emergenza medica" Icon={Ambulance}>
            <Steps text={info.medicalEmergencySteps} />
          </Card>

          <Card title="Documento smarrito" Icon={Building2}>
            <Steps text={info.lostDocumentSteps} />
          </Card>

          <Card title="Bagaglio smarrito" Icon={Luggage}>
            <Steps text={info.lostBaggageSteps} />
          </Card>
        </>
      )}
    </div>
  );
}
