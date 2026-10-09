import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paginaQuestionario } from "@/lib/questionari";
import { QuestionarioOspite } from "./QuestionarioOspite";

export const metadata: Metadata = { title: "Questionario", robots: { index: false, follow: false } };

export default async function QuestionarioPage({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const dati = await paginaQuestionario(codice);
  if (!dati) notFound();
  return <QuestionarioOspite codice={codice} iniziale={dati} />;
}
