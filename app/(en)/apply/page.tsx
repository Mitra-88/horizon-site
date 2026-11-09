import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { APPLICATIONS_ON } from "@/components/staff/flags";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = {
  title: "Apply · Horizon",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ApplyPage() {
  if (!APPLICATIONS_ON) notFound();
  return <ApplyForm />;
}
