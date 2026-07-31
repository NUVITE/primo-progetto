"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { FAMILY_CODES } from "@/lib/families";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-12 bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-sky-600 tracking-wide uppercase">
            9 – 23 Agosto 2026
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            USA Costa a Costa
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            La vostra guida di viaggio, sempre con voi
          </p>
        </div>

        <form action={formAction} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div>
            <label htmlFor="familyCode" className="block text-sm font-medium text-slate-700 mb-1">
              Famiglia
            </label>
            <select
              id="familyCode"
              name="familyCode"
              required
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="" disabled>
                Scegli la tua famiglia
              </option>
              {FAMILY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-sky-600 text-white font-medium py-2.5 hover:bg-sky-700 disabled:opacity-60 transition-colors"
          >
            {pending ? "Accesso in corso..." : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}
