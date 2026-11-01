import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffApp } from "@/components/staff/staff-app";

export const metadata: Metadata = {
  title: "Staff · Horizon",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const VIEWS = ["team", "mod", "setup", "help"];

export function generateStaticParams() {
  return [{ view: [] }, ...VIEWS.map((v) => ({ view: [v] }))];
}

export default async function StaffPage({ params }: { params: Promise<{ view?: string[] }> }) {
  const { view = [] } = await params;
  if (view.length > 1 || (view.length === 1 && !VIEWS.includes(view[0]))) notFound();
  return <StaffApp view={view[0] ?? ""} />;
}
