// A count on an item: unread chats, new notifications. The host owns the
// number; the package only decides how it is drawn and read.

/** Counts above this read as `${BADGE_CAP}+`. */
const BADGE_CAP = 99;

/**
 * The text drawn for a badge, or null when nothing is drawn. A count the host
 * does not know (null or absent) draws nothing rather than a fabricated 0, and
 * a count of 0 has nothing to announce.
 */
export function badgeText(badge: number | null | undefined): string | null {
  if (badge === null || badge === undefined || !Number.isFinite(badge) || badge < 1) return null;
  return badge > BADGE_CAP ? `${BADGE_CAP}+` : String(Math.floor(badge));
}

/**
 * An item's accessible name with its count, "Chat, 3", or undefined when there
 * is no badge so an item without one keeps the name it had.
 */
export function badgedName(label: string, badge: number | null | undefined): string | undefined {
  const text = badgeText(badge);
  return text === null ? undefined : `${label}, ${text}`;
}

/**
 * The drawn count. Hidden from assistive technology: the item's name already
 * carries it, so it would otherwise be read twice.
 */
export function Badge({ text, className }: { text: string | null; className: string }) {
  if (text === null) return null;
  return (
    <span aria-hidden="true" className={className}>
      {text}
    </span>
  );
}
