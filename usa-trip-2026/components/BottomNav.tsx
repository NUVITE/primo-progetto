"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Oggi", icon: "🏠" },
  { href: "/itinerario", label: "Itinerario", icon: "🗓️" },
  { href: "/documenti", label: "Documenti", icon: "📄" },
  { href: "/dogana", label: "Dogana", icon: "🛂" },
  { href: "/emergenze", label: "Emergenze", icon: "🚑" },
  { href: "/escursioni", label: "Extra", icon: "🎟️" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
      <ul className="flex justify-between">
        {ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  active ? "text-sky-600" : "text-slate-500"
                }`}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
