import type { Metadata } from "next";
import { AppealForm } from "@/components/appeal-form";

export const metadata: Metadata = {
  title: "Appeal · Horizon hub",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AppealPage() {
  return <AppealForm />;
}
