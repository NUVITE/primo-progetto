import Link from "next/link";
import { CircleQuestionMark, LogOut } from "lucide-react";
import { getCurrentFamily } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const family = await getCurrentFamily();

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-brand-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-brand-200">
            USA Costa a Costa 2026
          </p>
          <p className="truncate text-[16px] font-extrabold leading-tight">{family.displayName}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/guida"
            aria-label="Come si usa l'app"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
          >
            <CircleQuestionMark size={20} strokeWidth={2.2} />
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Esci"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 active:bg-white/20"
            >
              <LogOut size={19} strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <BottomNav />
    </div>
  );
}
