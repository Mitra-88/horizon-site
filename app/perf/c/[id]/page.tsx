import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CAPTURE_ID } from "@/lib/perf/sharing";
import PerfViewer from "../../viewer";

async function SharedCapture({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CAPTURE_ID.test(id)) notFound();
  return <PerfViewer captureId={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <Suspense><SharedCapture params={params} /></Suspense>;
}
