// ── Blasts API ───────────────────────────────────────────────────────────
// Preview a recipient set, dispatch a blast, and read history / per-row logs.
import { apiFetch, USE_MOCK, mockDelay } from "./client";
import { mockCustomers, mockBlasts, mockDispatch } from "../mocks/mockData";

/**
 * Resolve the recipient list for a campaign WITHOUT sending anything.
 * Used to populate the builder's recipient table + message previews.
 *
 * REAL ENDPOINT:  POST /blasts/preview
 * BODY:           { sql?: string, maxSize?: number, customerIds?: string[] }
 *                 - sql:         WHERE clause over the at-risk view
 *                                (validated server-side: comparison ops,
 *                                 AND/OR/NOT, IN, LIKE, BETWEEN only)
 *                 - maxSize:     hard cap; top-N by RFM score when exceeded
 *                 - customerIds: explicit selection (overrides sql)
 * RESPONSE:       { recipients: Customer[] }
 *
 * @param {{sql?: string, maxSize?: number, customerIds?: string[]}} params
 * @returns {Promise<{recipients: Array}>}
 */
export async function previewBlast({ sql, maxSize = 500, customerIds } = {}) {
  if (USE_MOCK) {
    await mockDelay();
    let base = mockCustomers.filter((c) => !c.isUnsubscribed);
    if (customerIds && customerIds.length) {
      const set = new Set(customerIds);
      base = base.filter((c) => set.has(c.id));
    } else if (sql) {
      // tiny stand-in interpreter for the few clauses the mock understands
      if (/HIGH/.test(sql) && /MEDIUM/.test(sql))
        base = base.filter((c) => c.risk !== "LOW");
      else if (/HIGH/.test(sql)) base = base.filter((c) => c.risk === "HIGH");
      if (/manado/i.test(sql)) base = base.filter((c) => c.city === "manado");
      if (/electronics/i.test(sql))
        base = base.filter((c) => c.topCategory === "electronics");
    }
    return { recipients: base.slice(0, maxSize) };
  }
  return apiFetch("/blasts/preview", {
    method: "POST",
    body: { sql, maxSize, customerIds },
  });
}

/**
 * Dispatch a blast. Returns the run summary once complete.
 *
 * REAL ENDPOINT:  POST /blasts
 * BODY:           { customerIds: string[], senderMode: 'mock'|'meta',
 *                   template: string, mlEnabled?: boolean }
 * RESPONSE:       { blastId: string, total: number, sent: number, failed: number }
 *
 * NOTE: a real send is long-running. Options for production:
 *   (a) return { blastId } immediately (202) and poll GET /blasts/{id},
 *   (b) stream progress over SSE/WebSocket.
 * The builder UI animates a local progress bar; swap that for real
 * progress events when the backend exposes them.
 *
 * @param {{customerIds: string[], senderMode: string, template: string, mlEnabled?: boolean}} params
 * @returns {Promise<{blastId: string, total: number, sent: number, failed: number}>}
 */
export async function runBlast({
  customerIds,
  senderMode = "mock",
  template,
  mlEnabled = false,
}) {
  if (USE_MOCK) {
    await mockDelay(600);
    const total = customerIds.length;
    const failed = Math.max(0, Math.round(total * 0.025));
    return {
      blastId: "blast_" + Math.random().toString(16).slice(2, 6),
      total,
      sent: total - failed,
      failed,
    };
  }
  return apiFetch("/blasts", {
    method: "POST",
    body: { customerIds, senderMode, template, mlEnabled },
  });
}

/**
 * List previous blast runs (the history table).
 *
 * REAL ENDPOINT:  GET /blasts
 * RESPONSE:       Blast[]  — { id, started, total, sent, failed, mode, template, redeemed }
 *
 * @returns {Promise<Array>}
 */
export async function getBlastHistory() {
  if (USE_MOCK) {
    await mockDelay();
    return mockBlasts.slice();
  }
  return apiFetch("/blasts");
}

/**
 * Per-recipient dispatch rows, optionally scoped to one blast.
 *
 * REAL ENDPOINT:  GET /blasts/dispatch        (all)
 *                 GET /blasts/{blastId}/dispatch
 * RESPONSE:       DispatchRow[]
 *
 * @param {{blastId?: string}} [opts]
 * @returns {Promise<Array>}
 */
export async function getDispatchLog({ blastId } = {}) {
  if (USE_MOCK) {
    await mockDelay();
    return blastId
      ? mockDispatch.filter((r) => r.blastId === blastId)
      : mockDispatch.slice();
  }
  const path = blastId
    ? `/blasts/${encodeURIComponent(blastId)}/dispatch`
    : "/blasts/dispatch";
  return apiFetch(path);
}

export async function sendBlast({ customers, maxBlastSize, senderMode }) {
  if (!customers) {
    console.error("Customers required");
    return;
  }

  const messages = customers?.map((customer) => {
    return {
      to: customer.to,
      customer_id: customer.customer_id,
      promo_code: customer.promo_code,
      template_name: customer.template_name,
      language_code: customer.language,
      template_params: customer.template_params,
    };
  });
  const body = {
    messages,
    max_blast_size: maxBlastSize,
    sender_mode: senderMode,
  };
  return apiFetch("/messaging/send-bulk", {
    method: "POST",
    body,
  });
}
