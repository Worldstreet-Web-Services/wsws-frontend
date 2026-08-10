import type { z } from "zod";

// The guard every proxy route runs on a successful upstream response.
//
// Two rules make this safe to add to a live route:
//
// 1. It validates but does NOT transform. The original payload is what reaches
//    the client, so a field the schema does not model is still delivered. The
//    schema exists to catch breakage, not to reshape a response.
// 2. It only judges successful envelopes. An upstream error is forwarded with
//    its own status and message, because that is already a useful answer.
//
// A schema that fails means the contract moved under us. That is a 502 with a
// loud log rather than a component rendering undefined, which is how the last
// two payment-service changes reached users.

export interface UpstreamCheck {
  ok: boolean;
  // Present only on failure, already formatted for a log line.
  problem?: string;
}

export function checkUpstream(
  schema: z.ZodType | null,
  body: unknown,
  { service, path }: { service: string; path: string }
): UpstreamCheck {
  if (!schema) return { ok: true };

  // Only the { success: true, data } shape carries a payload worth checking.
  const envelope = body as { success?: boolean; data?: unknown } | null;
  if (!envelope || envelope.success !== true) return { ok: true };

  const result = schema.safeParse(envelope.data);
  if (result.success) return { ok: true };

  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, problem: `${service} ${path} no longer matches the contract: ${issues}` };
}
