import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StaffApp } from "@/components/staff/staff-app";

// The staff's pages inside the hub: /hub/team, /hub/mod, /hub/sign-in, /hub/setup (the link Kira DMs), /hub/staff-help.
// The old /staff/* addresses redirect here (next.config.ts).
const STAFF_VIEWS = ["team", "mod", "sign-in", "setup", "staff-help"];

export const metadata: Metadata = {
  title: "Staff · Horizon hub",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export function generateStaticParams() {
  return STAFF_VIEWS.map((view) => ({ view }));
}

export default async function StaffPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  if (!STAFF_VIEWS.includes(view)) notFound();
  return <StaffApp view={view} />;
}
