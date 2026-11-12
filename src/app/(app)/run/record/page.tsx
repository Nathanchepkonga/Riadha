import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { RecordScreen } from "@/components/run/recorder";

export const metadata: Metadata = { title: "Record" };

export default async function RecordPage() {
  await requireUser();
  return <RecordScreen />;
}
