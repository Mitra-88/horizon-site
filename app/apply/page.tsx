import type { Metadata } from "next";
import { ApplyForm } from "@/components/apply-form";

export const metadata: Metadata = {
  title: "Apply · Horizon",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ApplyPage() {
  return <ApplyForm />;
}
