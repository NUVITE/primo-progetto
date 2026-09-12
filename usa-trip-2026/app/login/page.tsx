"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Plane, TriangleAlert } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";
import { FAMILY_CODES } from "@/lib/families";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [mostraPassword, setMostraPassword] = useState(false);

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-800 text-white shadow-sm">
            <Plane size={30} strokeWidth={1.9} />
          </span>
          <p className="text-[12px] font-extrabold uppercase tracking-widest text-clay-600">
            9 – 23 agosto 2026
          </p>
          <h1 className="mt-1 text-[27px] font-extrabold leading-tight tracking-tight text-ink-900">
            USA Costa a Costa
          </h1>
          <p className="mt-1 text-[15px] text-ink-500">
            La vostra guida di viaggio, sempre con voi
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sand-200"
        >
          <div>
            <label
              htmlFor="familyCode"
              className="mb-1.5 block text-[14px] font-bold text-ink-900"
            >
              La vostra famiglia
            </label>
            <select
              id="familyCode"
              name="familyCode"
              required
              defaultValue=""
              className="w-full rounded-xl border-2 border-sand-200 bg-white px-3.5 py-3 font-medium text-ink-900 focus:border-brand-600 focus:outline-none"
            >
              <option value="" disabled>
                Scegliete…
              </option>
              {FAMILY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-[14px] font-bold text-ink-900">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={mostraPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                // Sulle tastiere dei telefoni la maiuscola e la correzione
                // automatica sono la causa piu' comune di "password errata".
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl border-2 border-sand-200 py-3 pl-3.5 pr-12 text-ink-900 focus:border-brand-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setMostraPassword((v) => !v)}
                aria-label={mostraPassword ? "Nascondi la password" : "Mostra la password"}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-400"
              >
                {mostraPassword ? (
                  <EyeOff size={19} strokeWidth={2.2} />
                ) : (
                  <Eye size={19} strokeWidth={2.2} />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-400">
              Toccate l&apos;occhio per controllare quello che avete scritto.
            </p>
          </div>

          {state?.error && (
            <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[14px] font-medium text-rose-700">
              <TriangleAlert size={17} strokeWidth={2.4} className="shrink-0" />
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-brand-700 py-3.5 text-[16px] font-extrabold text-white transition-colors active:bg-brand-800 disabled:opacity-60"
          >
            {pending ? "Un attimo…" : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}
