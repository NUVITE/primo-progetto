import { prisma } from "@/lib/db";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900 mb-2">{title}</p>
      <div className="text-sm text-slate-700 whitespace-pre-line">{children}</div>
    </div>
  );
}

export default async function EmergenzePage() {
  const info = await prisma.emergencyInfo.findFirst();

  return (
    <div className="p-4 space-y-4">
      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
        <p className="text-xs text-rose-500 font-medium uppercase">Emergenza reale (polizia/ambulanza/pompieri)</p>
        <a href="tel:911" className="text-3xl font-bold text-rose-600">
          911
        </a>
      </div>

      {info && (
        <>
          <Section title="📞 Numeri utili">
            <ul className="space-y-1">
              <li>
                Assistenza C&amp;C Viaggi 24h:{" "}
                <a href={`tel:${info.agencyPhone24h.replace(/\s/g, "")}`} className="text-sky-600 font-medium">
                  {info.agencyPhone24h}
                </a>
              </li>
              <li>Email agenzia: {info.agencyEmail}</li>
              {info.teamAmericaNyPhone && (
                <li>
                  Assistenza TeamAmerica (tour Ovest/LA):{" "}
                  <a href={`tel:${info.teamAmericaNyPhone.replace(/\s/g, "")}`} className="text-sky-600 font-medium">
                    {info.teamAmericaNyPhone}
                  </a>
                </li>
              )}
              <li>
                Consolato Italia Los Angeles: <a href="tel:+13108200622" className="text-sky-600 font-medium">+1 310 820 0622</a>{" "}
                (emergenze <a href="tel:+13104335422" className="text-sky-600 font-medium">+1 310 433 5422</a>)
              </li>
              <li>
                Consolato Italia New York: <a href="tel:+12127379100" className="text-sky-600 font-medium">+1 212 737 9100</a>
              </li>
            </ul>
          </Section>

          <Section title="🏥 Assicurazione">
            <p>{info.insuranceProvider}</p>
            <p>Polizza: {info.policyNumber}</p>
            <p>Telefono: {info.insurancePhone}</p>
          </Section>

          <Section title="🚑 Emergenza medica: cosa fare">{info.medicalEmergencySteps}</Section>
          <Section title="🛂 Documento smarrito: cosa fare">{info.lostDocumentSteps}</Section>
          <Section title="🧳 Bagaglio smarrito: cosa fare">{info.lostBaggageSteps}</Section>
        </>
      )}
    </div>
  );
}
