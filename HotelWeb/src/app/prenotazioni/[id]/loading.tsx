export default function CaricamentoPrenotazione() {
  return (
    <div className="flex w-full flex-col gap-6 p-6">
      <div className="h-4 w-40 animate-pulse rounded bg-stone-200" />
      <div className="h-7 w-56 animate-pulse rounded bg-stone-200" />
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <div className="h-64 flex-1 animate-pulse rounded-xl border border-stone-200 bg-stone-100" />
        <div className="h-40 w-80 flex-shrink-0 animate-pulse rounded-xl border border-stone-200 bg-stone-100" />
      </div>
    </div>
  );
}
