"use client";

import type { MouseEvent, ReactNode } from "react";
import { navigatesThisTab } from "./crossing";
import type {
  ChromeDataAttributes,
  ChromeLinkComponent,
  ChromeLinkProps,
  ChromeTarget,
} from "./types";

export interface TargetElementProps {
  target: ChromeTarget;
  className: string;
  Link: ChromeLinkComponent;
  DocumentLink?: ChromeLinkComponent;
  current: boolean;
  busy?: boolean;
  pending?: boolean;
  ariaLabel?: string;
  dataAttributes?: ChromeDataAttributes;
  /** Every activation, whatever the kind. */
  onActivate: () => void;
  /** A plain click on a cross-app anchor that will navigate this tab. */
  onCrossing?: () => void;
  children: ReactNode;
}

/**
 * One place that decides what element an item is.
 *
 * A cross-app item is always an anchor the browser follows as a document
 * navigation: the host's client-side Link would try to find the other app's
 * route in its own router. A same-app item goes through the host's Link, and
 * a host action is a button.
 */
export function TargetElement({
  target,
  className,
  Link,
  DocumentLink,
  current,
  busy = false,
  pending = false,
  ariaLabel,
  dataAttributes,
  onActivate,
  onCrossing,
  children,
}: TargetElementProps) {
  const shared = {
    className,
    "aria-current": current ? ("page" as const) : undefined,
    "aria-label": ariaLabel,
    ...dataAttributes,
  };

  if (target.kind === "action") {
    return (
      <button type="button" onClick={onActivate} {...shared}>
        {children}
      </button>
    );
  }

  const linkProps: ChromeLinkProps = {
    ...shared,
    href: target.href,
    children,
  };

  if (target.kind === "link") {
    return <Link {...linkProps} onClick={onActivate} />;
  }

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (navigatesThisTab(event)) onCrossing?.();
    onActivate();
  };
  const crossing = {
    ...linkProps,
    onClick,
    "aria-busy": busy ? true : undefined,
    "data-ark-pending": pending ? "" : undefined,
  };

  if (target.prefetch && DocumentLink) {
    return <DocumentLink {...crossing} />;
  }
  return <a {...crossing} />;
}
