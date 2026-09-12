"use client";

import { useActionState } from "react";
import { TriangleAlert } from "lucide-react";
import { addPerson, type ChiSeiState } from "@/app/actions/person";

const initialState: ChiSeiState = {};

export function AddPersonForm() {
  const [state, formAction, pending] = useActionState(addPerson, initialState);

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-sand-200"
    >
      <label htmlFor="name" className="block text-[14px] font-bold text-ink-900">
        Il tuo nome non è in elenco?
      </label>
      <input
        id="name"
        name="name"
        required
        autoComplete="off"
        placeholder="Scrivi il tuo nome"
        className="w-full rounded-xl border-2 border-sand-200 px-3.5 py-3 text-ink-900 focus:border-brand-600 focus:outline-none"
      />

      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[14px] font-medium text-rose-700">
          <TriangleAlert size={17} strokeWidth={2.4} className="shrink-0" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-700 py-3 text-[15px] font-extrabold text-white transition-colors active:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Un attimo…" : "Aggiungi e continua"}
      </button>
    </form>
  );
}
