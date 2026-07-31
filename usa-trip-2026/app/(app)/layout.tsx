import Link from "next/link";
import { getCurrentFamily } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const family = await getCurrentFamily();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-sky-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-sky-100">USA Costa a Costa 2026</p>
          <p className="font-semibold leading-tight">{family.displayName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/guida"
            aria-label="Guida"
            className="flex items-center justify-center h-8 w-8 text-sm bg-sky-700/60 hover:bg-sky-700 rounded-lg"
          >
            ❓
          </Link>
          <form action={logout}>
            <button type="submit" className="text-sm bg-sky-700/60 hover:bg-sky-700 rounded-lg px-3 py-1.5">
              Esci
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 pb-4">{children}</main>

      <BottomNav />
    </div>
  );
}
