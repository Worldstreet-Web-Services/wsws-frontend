import IsoDomPurify from 'isomorphic-dompurify';

type DomPurifyConfig = Parameters<typeof IsoDomPurify.sanitize>[1];

export function domPurify(
  dirty: string | Node,
  cfg?: DomPurifyConfig,
): string {
  return String(
    IsoDomPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['a', 'p', 'br', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ...cfg,
    }),
  );
}
