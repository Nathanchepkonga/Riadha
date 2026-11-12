import "server-only";

import { auditEvents } from "@/db/schema";
import type { DB } from "@/db/client";

type Metadata = Record<string, string | number | boolean | null>;

/** Records an auditable mutation without storing credentials, request bodies, or personal payloads. */
export async function recordAudit(
  database: DB,
  input: {
    actorId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | number | null;
    outcome: "success" | "failure";
    metadata?: Metadata;
  },
) {
  await database.insert(auditEvents).values({
    actorId: input.actorId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId == null ? null : String(input.targetId),
    outcome: input.outcome,
    metadata: input.metadata ?? {},
  });
}
