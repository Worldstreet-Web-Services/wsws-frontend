// The generic UI driver — the frontend half of Vivid's "operate any screen" tool.
//
// The backend's ui_action tool pushes { op, target, value, confirmed }; this finds
// the on-screen element by its VISIBLE LABEL / accessible name and clicks or fills
// it. Combined with read_screen (Vivid sees the page) this lets Vivid drive the
// WHOLE platform by voice without a hand-wired tool per action.
//
// SAFETY: money-moving / irreversible controls (Confirm, Buy, Sell, Place, Send,
// Pay, Withdraw, Swap, Stake, Fund, Bet, …) are NEVER tapped unless the backend
// set confirmed:true — which it only does after the user says "go ahead". So Vivid
// can walk you right up to spending money and even tap the button, but only with
// an explicit spoken yes. Everything else (navigate, open, fill a field) is free.

import { vlog, vwarn } from "@/lib/voice/log";

export type UiOp = "click" | "fill" | "select";

// A snapshot of the current page for read_screen (DOM text, not pixels), so the
// agent can see what the user is looking at and pick the next ui_action target.
export interface CapturedScreen {
  url: string;
  title: string;
  // Page structure — the visible headings, so Vivid knows the sections present.
  headings: string[];
  // Interactive controls Vivid can act on, by their visible label — this is the
  // MOST important part for driving the page: it's the exact set of things
  // ui_action(click, …) can target right now.
  buttons: string[];
  links: string[];
  tabs: string[];
  // Labelled form fields and their current values.
  fields: Record<string, string>;
  // Any open dialogs (their heading + text), so Vivid knows a modal is up.
  openModals: string[];
  // Visible error/validation messages.
  errors: string[];
  // A truncated dump of the remaining visible text (prices, balances, copy).
  visibleText: string;
  capturedAt: number;
}

function screenVisible(el: Element): boolean {
  const h = el as HTMLElement;
  if (h.hidden || h.getAttribute("aria-hidden") === "true") return false;
  const r = h.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  // Off-screen (scrolled far out of view) elements are still "on the page" for a
  // screen reader, so we keep them — but skip zero-size/hidden ones above.
  const s = window.getComputedStyle(h);
  return s.display !== "none" && s.visibility !== "hidden" && s.opacity !== "0";
}

// De-duped, trimmed, capped list of labels from a selector.
function labelsOf(selector: string, cap: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const el of Array.from(document.querySelectorAll(selector))) {
    if (!screenVisible(el)) continue;
    const name = (
      el.getAttribute("aria-label") ||
      (el as HTMLElement).innerText ||
      el.textContent ||
      el.getAttribute("title") ||
      ""
    )
      .replace(/\s+/g, " ")
      .trim();
    if (!name || name.length > 60) continue; // skip empty / whole-paragraph labels
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Read the live DOM into an EXTENSIVE CapturedScreen — the ground truth Vivid
 * reads to both ANSWER "what's on my screen" and DRIVE the page. It captures the
 * page structure (headings), the exact interactive controls by label (buttons /
 * links / tabs — so the agent knows precisely what ui_action can click), form
 * fields + values, open dialogs, visible errors, and a bounded text dump for
 * everything else (prices, balances, copy). Read-only; safe to call anytime.
 */
export function captureScreen(): CapturedScreen {
  const headings = labelsOf("h1, h2, h3, [role=heading]", 20);
  const buttons = labelsOf(
    "button, [role=button], input[type=button], input[type=submit], [role=menuitem]",
    50
  );
  const links = labelsOf("a[href], [role=link]", 40);
  const tabs = labelsOf("[role=tab]", 20);

  const fields: Record<string, string> = {};
  for (const el of Array.from(
    document.querySelectorAll("input:not([type=hidden]), textarea, select, [role=combobox]")
  )) {
    if (!screenVisible(el)) continue;
    const input = el as HTMLInputElement;
    // Best label: aria-label, an associated <label for>, placeholder, name.
    let label = input.getAttribute("aria-label") || "";
    if (!label && input.id) {
      const forLabel = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (forLabel) label = (forLabel.textContent ?? "").trim();
    }
    if (!label) label = input.getAttribute("placeholder") || input.getAttribute("name") || "";
    label = label.replace(/\s+/g, " ").trim();
    if (label && Object.keys(fields).length < 30) fields[label] = input.value ?? "";
  }

  const openModals = Array.from(document.querySelectorAll("[role=dialog], [aria-modal=true]"))
    .filter(screenVisible)
    .map((m) => (m as HTMLElement).innerText.replace(/\s+/g, " ").trim().slice(0, 600))
    .filter(Boolean)
    .slice(0, 4);

  const errors = Array.from(
    document.querySelectorAll(
      "[role=alert], [aria-invalid=true], .error, .text-red-500, .text-down, .text-destructive"
    )
  )
    .filter(screenVisible)
    .map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 8);

  const visibleText = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 4000);

  return {
    url: location.pathname + location.search,
    title: document.title,
    headings,
    buttons,
    links,
    tabs,
    fields,
    openModals,
    errors,
    visibleText,
    capturedAt: Date.now(),
  };
}

export interface UiActionRequest {
  op: UiOp;
  target: string; // visible label / accessible name
  value?: string; // for fill/select
  confirmed?: boolean; // gate for money/irreversible controls
}

export interface UiActionResult {
  ok: boolean;
  // A short machine-readable reason, echoed back to the backend as an
  // action_report so the agent loop knows what happened and can re-plan.
  reason:
    | "done"
    | "not_found"
    | "needs_confirmation"
    | "not_fillable"
    | "ambiguous"
    | "bad_op";
  detail?: string;
}

// Labels that move money or are otherwise irreversible — refused unless confirmed.
// Word-boundary matched against the element's accessible name, case-insensitive.
const MONEY_VERBS =
  /\b(confirm|buy|sell|place|send|pay|withdraw|swap|stake|unstake|redeem|claim|fund|deposit|bet|approve|sign|transfer|cash ?out|max)\b/i;

// Normalize label text for comparison: collapse whitespace, lowercase, trim.
function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// The accessible name of an element, best-effort: aria-label, then visible text,
// then placeholder/title/value. Mirrors how a screen reader (and read_screen)
// would name it, so the model's `target` matches what it "saw".
function accessibleName(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  const text = (el.textContent ?? "").trim();
  if (text) return text;
  const ph = el.getAttribute("placeholder");
  if (ph) return ph;
  const title = el.getAttribute("title");
  if (title) return title;
  const val = (el as HTMLInputElement).value;
  if (val) return val;
  return "";
}

// Candidate elements for an op: clickable controls vs. fields.
function candidates(op: UiOp): Element[] {
  if (op === "fill") {
    return Array.from(
      document.querySelectorAll("input:not([type=hidden]), textarea, [contenteditable=true]")
    );
  }
  if (op === "select") {
    return Array.from(document.querySelectorAll("select, [role=combobox], [role=listbox]"));
  }
  // click: buttons, links, tabs, role=button, and label-carrying clickables
  return Array.from(
    document.querySelectorAll(
      "button, a[href], [role=button], [role=tab], [role=menuitem], [role=option], input[type=button], input[type=submit]"
    )
  );
}

// Only act on elements the user could actually see + use.
function isActionable(el: Element): boolean {
  const htmlEl = el as HTMLElement;
  if (htmlEl.hidden) return false;
  if (htmlEl.getAttribute("aria-hidden") === "true") return false;
  if ((htmlEl as HTMLButtonElement).disabled) return false;
  const rect = htmlEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = window.getComputedStyle(htmlEl);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return true;
}

// Find the best element matching `target` for `op`: exact accessible-name match
// preferred, then a contains match. Returns the element, or a reason if none/many.
function findElement(
  op: UiOp,
  target: string
): { el: HTMLElement } | { el: null; reason: UiActionResult["reason"] } {
  const want = norm(target);
  const pool = candidates(op).filter(isActionable) as HTMLElement[];

  const exact = pool.filter((el) => norm(accessibleName(el)) === want);
  if (exact.length === 1) return { el: exact[0] };
  if (exact.length > 1) return { el: exact[0] }; // multiple exact: take the first visible

  const contains = pool.filter((el) => norm(accessibleName(el)).includes(want));
  if (contains.length === 1) return { el: contains[0] };
  if (contains.length > 1) {
    // Prefer the shortest label (most specific) among contains-matches.
    contains.sort((a, b) => accessibleName(a).length - accessibleName(b).length);
    return { el: contains[0] };
  }
  return { el: null, reason: "not_found" };
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  // React tracks input value via a setter on the prototype; set through it and
  // dispatch input+change so React state updates (a plain el.value = … is ignored).
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

/**
 * Execute one ui_action against the live DOM. Pure client-side; returns a result
 * the caller reports back to the backend so the agent loop can see the outcome.
 */
export function executeUiAction(req: UiActionRequest): UiActionResult {
  const { op, target, value, confirmed } = req;
  if (!["click", "fill", "select"].includes(op)) {
    return { ok: false, reason: "bad_op" };
  }

  // Money/irreversible gate — refuse to tap unless the backend confirmed it (which
  // it only does after an explicit spoken "go ahead").
  if (op === "click" && MONEY_VERBS.test(target) && confirmed !== true) {
    vwarn("ui-driver", `refusing "${target}" — needs confirmation`);
    return { ok: false, reason: "needs_confirmation", detail: target };
  }

  const found = findElement(op, target);
  if (!found.el) {
    vwarn("ui-driver", `no element for ${op} "${target}"`);
    return { ok: false, reason: found.reason, detail: target };
  }
  const el = found.el;

  try {
    if (op === "click") {
      el.click();
      vlog("ui-driver", `clicked "${target}"`, { confirmed });
      return { ok: true, reason: "done", detail: target };
    }
    if (op === "fill") {
      if (
        !(el instanceof HTMLInputElement) &&
        !(el instanceof HTMLTextAreaElement) &&
        el.getAttribute("contenteditable") !== "true"
      ) {
        return { ok: false, reason: "not_fillable", detail: target };
      }
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.focus();
        setNativeValue(el, value ?? "");
      } else {
        el.textContent = value ?? "";
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      vlog("ui-driver", `filled "${target}" = "${value ?? ""}"`);
      return { ok: true, reason: "done", detail: target };
    }
    // select
    if (el instanceof HTMLSelectElement) {
      const want = norm(value ?? "");
      const opt = Array.from(el.options).find(
        (o) => norm(o.textContent ?? "") === want || norm(o.value) === want
      );
      if (!opt) return { ok: false, reason: "not_found", detail: value };
      el.value = opt.value;
      el.dispatchEvent(new Event("change", { bubbles: true }));
      vlog("ui-driver", `selected "${value}" in "${target}"`);
      return { ok: true, reason: "done", detail: target };
    }
    // role=combobox/listbox — open it and click the option by label
    el.click();
    return { ok: true, reason: "done", detail: target };
  } catch (err) {
    vwarn("ui-driver", `action threw`, err);
    return { ok: false, reason: "not_found", detail: String(err) };
  }
}
