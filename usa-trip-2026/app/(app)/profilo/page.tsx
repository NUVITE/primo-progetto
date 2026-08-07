import { getCurrentFamily } from "@/lib/dal";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";

export default async function ProfiloPage() {
  const family = await getCurrentFamily();

  return (
    <div className="space-y-5 p-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand-200">
        <h2 className="text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          Famiglia
        </h2>
        <p className="mt-1 text-[18px] font-extrabold text-ink-900">{family.displayName}</p>
      </section>

      <section>
        <h2 className="mb-2.5 px-1 text-[13px] font-extrabold uppercase tracking-widest text-ink-400">
          Cambia password
        </h2>
        <p className="mb-3 px-1 text-[13px] text-ink-400">
          Vale per tutti quelli che accedono con &quot;{family.displayName}&quot;: dopo il cambio,
          chi non ha ancora fatto accesso su questo telefono dovrà usare la nuova password.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
