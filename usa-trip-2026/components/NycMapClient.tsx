"use client";

import dynamic from "next/dynamic";

// Leaflet lavora direttamente sul DOM, quindi va caricato solo nel browser.
const NycMap = dynamic(() => import("./NycMap").then((m) => m.NycMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] min-h-[380px] items-center justify-center rounded-2xl bg-white text-[15px] text-ink-400 shadow-sm ring-1 ring-sand-200">
      Carico la mappa…
    </div>
  ),
});

export function NycMapClient() {
  return <NycMap />;
}
