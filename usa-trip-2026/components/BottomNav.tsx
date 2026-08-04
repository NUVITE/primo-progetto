"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FileText, LifeBuoy, Lightbulb, Map, Sun } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Oggi", Icon: Sun },
  { href: "/itinerario", label: "Giorni", Icon: CalendarDays },
  { href: "/idee", label: "Idee", Icon: Lightbulb },
  { href: "/new-york", label: "New York", Icon: Map },
  { href: "/documenti", label: "Documenti", Icon: FileText },
  { href: "/emergenze", label: "SOS", Icon: LifeBuoy },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-20 border-t border-sand-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold tracking-tight transition-colors ${
                  active ? "text-brand-700" : "text-ink-400"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden="true"
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
