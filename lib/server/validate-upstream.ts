import type { z } from "zod";

// Guards a proxied response against the shape the frontend depends on.
// Validates without transforming: the original payload still reaches the
// client, so a field no schema models is never dropped. Only successful
// envelopes are judged; an upstream error is already a useful answer.

export interface UpstreamCheck {
  ok: boolean;
  problem?: string;
}

export function checkUpstream(
  schema: z.ZodType | null,
  body: unknown,
  { service, path }: { service: string; path: string }
): UpstreamCheck {
  if (!schema) return { ok: true };

  const envelope = body as { success?: boolean; data?: unknown } | null;
  if (!envelope || envelope.success !== true) return { ok: true };

  const result = schema.safeParse(envelope.data);
  if (result.success) return { ok: true };

  const issues = result.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");
  return { ok: false, problem: `${service} ${path} no longer matches the contract: ${issues}` };
}
