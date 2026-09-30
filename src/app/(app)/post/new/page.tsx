import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { Composer } from "./composer";

export const metadata: Metadata = { title: "New post" };

const HINTS: Record<string, { label: string; value: string }> = {
  Athletics: { label: "400m", value: "53.8s" },
  Running: { label: "Long run", value: "21K" },
  Football: { label: "Goals", value: "2" },
  Basketball: { label: "Points", value: "24" },
  Rugby: { label: "Tries", value: "3" },
  Boxing: { label: "Record", value: "12–1" },
};

export default async function NewPostPage() {
  const user = await requireUser();
  return (
    <div className="px-4 pt-5">
      <p className="kicker">Showcase</p>
      <h1 className="h2 mt-1">Post your highlight</h1>
      <div className="mt-6">
        <Composer statHint={HINTS[user.sport ?? ""] ?? { label: "Stat", value: "Value" }} />
      </div>
    </div>
  );
}
