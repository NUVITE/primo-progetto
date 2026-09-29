import { notFound } from "next/navigation";
import { richiediSuperAdmin } from "@/lib/auth";
import { caricaVersione } from "@/lib/regolamentiTassa";
import { EditorVersione } from "./EditorVersione";

export default async function VersioneTassaPage({ params }: { params: Promise<{ id: string }> }) {
  await richiediSuperAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const versione = await caricaVersione(id).catch(() => null);
  if (!versione) notFound();
  return <EditorVersione iniziale={versione} />;
}
