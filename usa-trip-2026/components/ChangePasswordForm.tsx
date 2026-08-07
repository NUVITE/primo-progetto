"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, CircleCheck, TriangleAlert } from "lucide-react";
import { changePassword, type ChangePasswordState } from "@/app/actions/auth";

const initialState: ChangePasswordState = {};

function PasswordField({
  id,
  name,
  label,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[14px] font-bold text-ink-900">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-xl border-2 border-sand-200 py-3 pl-3.5 pr-12 text-ink-900 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Nascondi la password" : "Mostra la password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink-400"
        >
          {visible ? <EyeOff size={19} strokeWidth={2.2} /> : <Eye size={19} strokeWidth={2.2} />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, initialState);

  return (
    <form
      action={formAction}
      key={state?.success ? "done" : "form"}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-sand-200"
    >
      <PasswordField
        id="currentPassword"
        name="currentPassword"
        label="Password attuale"
        autoComplete="current-password"
      />
      <PasswordField
        id="newPassword"
        name="newPassword"
        label="Nuova password"
        autoComplete="new-password"
      />
      <PasswordField
        id="confirmPassword"
        name="confirmPassword"
        label="Ripeti la nuova password"
        autoComplete="new-password"
      />

      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[14px] font-medium text-rose-700">
          <TriangleAlert size={17} strokeWidth={2.4} className="shrink-0" />
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-[14px] font-medium text-emerald-700">
          <CircleCheck size={17} strokeWidth={2.4} className="shrink-0" />
          Password cambiata.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-700 py-3.5 text-[16px] font-extrabold text-white transition-colors active:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Un attimo…" : "Cambia password"}
      </button>
    </form>
  );
}
