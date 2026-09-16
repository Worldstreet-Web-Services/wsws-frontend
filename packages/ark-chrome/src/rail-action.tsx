"use client";

import { LiveIcon } from "./icons";
import type { ArkRailActionProps } from "./types";

/**
 * The rail's primary action, drawn at the top above a divider: Go Live.
 *
 * Presentational only. The host owns what a press does (WSWS opens its
 * broadcast flow), so the look is shared while the behaviour stays with the
 * app that has the broadcast session.
 */
export function ArkRailAction({
  label,
  onPress,
  live = false,
  icon: Icon = LiveIcon,
  dataAttributes,
}: ArkRailActionProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={label}
      title={label}
      data-live={live ? "" : undefined}
      className={
        live ? "ark-chrome-rail-action ark-chrome-rail-action--live" : "ark-chrome-rail-action"
      }
      {...dataAttributes}
    >
      <span className="ark-chrome-icon-slot">
        <Icon size={20} />
      </span>
      <span className="ark-chrome-grow">{label}</span>
    </button>
  );
}
