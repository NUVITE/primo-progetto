"use client";

import { useRef, useState } from "react";
import { Camera, CircleCheck, TriangleAlert, Wifi } from "lucide-react";
import { uploadPhoto, type UploadPhotoState } from "@/app/actions/photo";

// L'API di rete e' disponibile solo su alcuni browser (Chrome/Android): dove
// c'e', blocchiamo l'upload sotto rete dati a meno che l'utente confermi di
// avere giga illimitati. Dove non c'e' (Safari/iPhone) non possiamo saperlo:
// mostriamo solo un promemoria, senza bloccare.
function getConnectionType(): "wifi" | "cellular" | "unknown" {
  const nav = navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string };
  };
  const type = nav.connection?.type;
  if (type === "wifi" || type === "ethernet") return "wifi";
  if (type === "cellular") return "cellular";
  return "unknown";
}

interface FileResult {
  name: string;
  ok: boolean;
  message?: string;
}

export function PhotoUploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allowCellularRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [state, setState] = useState<UploadPhotoState>({});
  const [cellularWarning, setCellularWarning] = useState(false);
  const [connectionType, setConnectionType] = useState<"wifi" | "cellular" | "unknown">("unknown");
  const [selectedCount, setSelectedCount] = useState(0);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedCount(e.target.files?.length ?? 0);
    const type = getConnectionType();
    setConnectionType(type);
    setCellularWarning(type === "cellular" && !allowCellularRef.current);
  }

  // Un file per chiamata, uno alla volta: con tante foto/video in un colpo
  // solo la richiesta diventava enorme e lenta da spedire dal telefono, e un
  // singolo intoppo di rete a meta' trasferimento perdeva TUTTO il blocco
  // invece del solo file incriminato. Cosi' ogni file ha il suo esito e i
  // problemi restano isolati (si puo' ricaricare solo cio' che e' fallito).
  async function startUpload(files: File[], caption: string, sharedWithTrip: boolean) {
    setUploading(true);
    setState({});
    const results: FileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      setProgress({ done: i, total: files.length });
      const fd = new FormData();
      fd.append("file", files[i]);
      if (caption) fd.append("caption", caption);
      if (sharedWithTrip) fd.append("sharedWithTrip", "on");

      try {
        const result = await uploadPhoto(undefined, fd);
        results.push({ name: files[i].name, ok: !result.error, message: result.error });
      } catch (err) {
        results.push({
          name: files[i].name,
          ok: false,
          message: err instanceof Error ? err.message : "errore di rete",
        });
      }
    }

    setProgress(null);
    setUploading(false);
    allowCellularRef.current = false;
    setConnectionType("unknown");
    setSelectedCount(0);
    formRef.current?.reset();

    const ok = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    if (ok === 0) {
      setState({ error: failed[0] ? `${failed[0].name}: ${failed[0].message ?? "invio fallito"}` : "Nessun file caricato." });
      return;
    }
    const suffix =
      failed.length > 0
        ? ` — ${failed.length} non riusciti: ${failed.slice(0, 2).map((f) => f.name).join("; ")}${failed.length > 2 ? "…" : ""}`
        : "";
    setState({ info: `${ok} file caricat${ok === 1 ? "o" : "i"}${suffix}` });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];
    if (files.length === 0) return;

    if (connectionType === "cellular" && !allowCellularRef.current) {
      setCellularWarning(true);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const caption = String(formData.get("caption") ?? "").trim();
    const sharedWithTrip = formData.get("sharedWithTrip") === "on";
    startUpload(files, caption, sharedWithTrip);
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sand-200"
    >
      <label
        htmlFor="file"
        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sand-300 py-6 text-[15px] font-bold text-brand-700 active:bg-sand-50"
      >
        <Camera size={20} strokeWidth={2.2} />
        {selectedCount > 0
          ? `${selectedCount} selezionat${selectedCount === 1 ? "o" : "i"}`
          : "Scegli foto o video (anche più di uno)"}
      </label>
      <input
        ref={fileInputRef}
        id="file"
        name="file"
        type="file"
        accept="image/*,video/*"
        multiple
        required
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        name="caption"
        placeholder="Didascalia (facoltativa, vale per tutti i file scelti)"
        className="w-full rounded-xl border-2 border-sand-200 px-3.5 py-2.5 text-[15px] text-ink-900 focus:border-brand-600 focus:outline-none"
      />

      <label className="flex items-center gap-2 text-[14px] font-semibold text-ink-700">
        <input type="checkbox" name="sharedWithTrip" className="h-4 w-4" />
        Condividi subito con tutto il gruppo (non solo la vostra famiglia)
      </label>

      {connectionType === "unknown" && (
        <p className="flex items-center gap-2 text-[13px] text-ink-400">
          <Wifi size={15} strokeWidth={2.2} className="shrink-0" />
          Meglio caricare in Wi-Fi per non consumare giga.
        </p>
      )}

      {cellularWarning && (
        <div className="space-y-2 rounded-xl bg-clay-50 px-3.5 py-3 text-[14px] text-clay-700">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert size={17} strokeWidth={2.4} className="shrink-0" />
            Non siete in Wi-Fi. Aspettate di essere in hotel oppure, se avete giga illimitati,
            continuate comunque.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCellularWarning(false)}
              className="flex-1 rounded-xl bg-white py-2 text-[14px] font-bold text-clay-700 ring-1 ring-clay-200"
            >
              Aspetto il Wi-Fi
            </button>
            <button
              type="button"
              onClick={() => {
                allowCellularRef.current = true;
                setCellularWarning(false);
                formRef.current?.requestSubmit();
              }}
              className="flex-1 rounded-xl bg-clay-600 py-2 text-[14px] font-bold text-white"
            >
              Continua comunque
            </button>
          </div>
        </div>
      )}

      {state?.error && (
        <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-[14px] font-medium text-rose-700">
          <TriangleAlert size={17} strokeWidth={2.4} className="shrink-0" />
          {state.error}
        </p>
      )}
      {state?.info && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-[14px] font-medium text-emerald-700">
          <CircleCheck size={17} strokeWidth={2.4} className="shrink-0" />
          {state.info}
        </p>
      )}

      <button
        type="submit"
        disabled={uploading || cellularWarning}
        className="w-full rounded-xl bg-brand-700 py-3 text-[15px] font-extrabold text-white transition-colors active:bg-brand-800 disabled:opacity-60"
      >
        {progress ? `Carico ${progress.done + 1} di ${progress.total}…` : uploading ? "Caricamento…" : "Carica"}
      </button>
    </form>
  );
}
