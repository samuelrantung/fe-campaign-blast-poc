// ── Promo codes API ──────────────────────────────────────────────────────
// List issued codes, validate one (cashier check), redeem one.
import { apiFetch, USE_MOCK, mockDelay } from './client';
import { mockPromoCodes } from '../mocks/mockData';
import { fmtRelative } from '../utils/format';

/**
 * List issued promo codes.
 *
 * REAL ENDPOINT:  GET /promo-codes
 * QUERY PARAMS:   { status?: 'active'|'pending'|'redeemed'|'cancelled', search?: string }
 * RESPONSE:       PromoCode[]
 *
 * @param {{status?: string, search?: string}} [filters]
 * @returns {Promise<Array>}
 */
export async function listPromoCodes(filters = {}) {
  if (USE_MOCK) {
    await mockDelay();
    return mockPromoCodes.slice();
  }
  return apiFetch('/promo-codes', { params: filters });
}

/**
 * Validate a code without consuming it (POS / cashier check).
 *
 * REAL ENDPOINT:  GET /promo-codes/{code}/validate
 * RESPONSE:       { ok: boolean, reason?: string, detail?: string, code?: PromoCode }
 *                 reason ∈ not_found | already_redeemed | cancelled | pending | expired
 *
 * @param {string} rawCode
 * @returns {Promise<object>}
 */
export async function validatePromoCode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (USE_MOCK) {
    await mockDelay(200);
    const match = mockPromoCodes.find((p) => p.code === code);
    if (!match) return { ok: false, reason: 'not_found', detail: 'No record for this code.' };
    if (match.status === 'redeemed') return { ok: false, reason: 'already_redeemed', detail: `Redeemed ${fmtRelative(match.redeemedAt)}.`, code: match };
    if (match.status === 'cancelled') return { ok: false, reason: 'cancelled', detail: 'Code was cancelled (aborted blast).', code: match };
    if (match.status === 'pending') return { ok: false, reason: 'pending', detail: 'Code is pending — not yet activated by dispatch.', code: match };
    if (new Date(match.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired', detail: 'Code expired ' + fmtRelative(match.expiresAt), code: match };
    return { ok: true, code: match };
  }
  return apiFetch(`/promo-codes/${encodeURIComponent(code)}/validate`);
}

/**
 * Redeem (consume) a code at point of sale.
 *
 * REAL ENDPOINT:  POST /promo-codes/{code}/redeem
 * RESPONSE:       PromoCode  (status now "redeemed", redeemedAt set)
 *
 * @param {string} rawCode
 * @returns {Promise<object>}
 */
export async function redeemPromoCode(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (USE_MOCK) {
    await mockDelay(250);
    const match = mockPromoCodes.find((p) => p.code === code);
    if (match) {
      match.status = 'redeemed';
      match.redeemedAt = new Date().toISOString();
    }
    return match;
  }
  return apiFetch(`/promo-codes/${encodeURIComponent(code)}/redeem`, { method: 'POST' });
}
