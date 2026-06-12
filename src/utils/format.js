// Pure formatting helpers — no React, no side effects.
import { PROMO_DEFS, TEMPLATE_NAME } from "./constants";

/** Format a number as Indonesian Rupiah, e.g. 1500000 -> "Rp 1.500.000". */
export function fmtIDR(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

export function fmtUSD(n) {
  return Number(n || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Relative time, e.g. "3h ago" / "in 5d"; falls back to ISO date. */
export function fmtRelative(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  
  if (diff < 0) {
    const absDiff = -diff;
    if (absDiff < 60) return "in " + Math.floor(absDiff) + "s";
    if (absDiff < 3600) return "in " + Math.floor(absDiff / 60) + "m";
    if (absDiff < 86400) return "in " + Math.floor(absDiff / 3600) + "h";
    if (absDiff < 86400 * 30) return "in " + Math.floor(absDiff / 86400) + "d";
    return d.toISOString().slice(0, 10);
  }
  
  if (diff < 60) return Math.floor(diff) + "s ago";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + "d ago";
  return d.toISOString().slice(0, 10);
}

/** Date only formatted as "DD-MM-YYYY". */
export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const parts = d.toISOString().slice(0, 10).split('-');
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/** Absolute timestamp, e.g. "2026-05-28 14:03". */
export function fmtAbsTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toISOString().slice(0, 10) + " " + d.toISOString().slice(11, 16);
}

/**
 * Render the WhatsApp template body for a given customer.
 * @param {object} customer
 * @param {{highlightSlots?: boolean}} opts - wrap variable slots in <span class="slot">
 * @returns {string} HTML string (used with dangerouslySetInnerHTML)
 */
export function renderTemplate(customer, opts = {}) {
  const promo = PROMO_DEFS[customer.promoCode];
  const wrap = opts.highlightSlots
    ? (v) => `<span class="slot">${v}</span>`
    : (v) => v;
  const first = customer.name?.split(" ")?.[0];
  return [
    `Hi ${wrap(first)}, we miss you!`,
    "",
    "It's been a while since your last visit.",
    `Here's a personal offer just for you: ${wrap(promo?.value)}.`,
    "",
    `Use code ${wrap(customer?.uniqueCode)} — valid for ${wrap("7")} days.`,
    "",
    "See you soon!",
  ].join("\n");
}

export function renderMetaTemplate(template, params = {}) {
  const getComponent = (type) =>
    template.components?.find((c) => c.type === type);

  const fillSlots = (text, values = {}) =>
    text?.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);

  const header = getComponent("HEADER");
  const body = getComponent("BODY");
  const footer = getComponent("FOOTER");

  return {
    header:
      header?.format === "TEXT" ? fillSlots(header.text, params.HEADER) : null,
    body: fillSlots(body?.text, params.BODY) ?? null,
    footer: footer?.text ?? null,
  };
}

export { TEMPLATE_NAME };
