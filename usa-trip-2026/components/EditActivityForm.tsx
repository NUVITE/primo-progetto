"use client";

import { useState } from "react";
import { updateActivity } from "@/app/actions/activity";
import type { Activity } from "@/app/generated/prisma/client";

export function EditActivityForm({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-slate-400 underline"
      >
        Aggiorna orario/note
      </button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateActivity(formData);
        setOpen(false);
      }}
      className="mt-2 bg-slate-50 rounded-lg p-2.5 space-y-2"
    >
      <input type="hidden" name="id" value={activity.id} />
      <div className="flex gap-2">
        <input
          name="time"
          defaultValue={activity.time ?? ""}
          placeholder="Orario"
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          name="notes"
          defaultValue={activity.notes ?? ""}
          placeholder="Note aggiornate"
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="text-xs bg-sky-600 text-white rounded-md px-3 py-1">
          Salva
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500">
          Annulla
        </button>
      </div>
    </form>
  );
}
