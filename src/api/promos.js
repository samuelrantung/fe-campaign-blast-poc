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
 * REAL ENDPOINT:  GET /promo-codes/validate
 * RESPONSE:       { ok: boolean, reason?: string, detail?: string, code?: PromoCode }
 *                 reason ∈ not_found | already_redeemed | cancelled | pending | expired
 *
 * @param {string} phone The customer's phone number
 * @param {string} promoCode The generic promo code (e.g. DISC20)
 * @returns {Promise<object>}
 */
export async function validatePromoCode(phone, promoCode) {
  const cleanPhone = String(phone || '').trim();
  const cleanPromo = String(promoCode || '').trim();
  if (USE_MOCK) {
    await mockDelay(200);
    const match = mockPromoCodes.find((p) => p.code === cleanPhone);
    if (!match) return { ok: false, reason: 'not_found', detail: 'No record for this code.' };
    if (match.status === 'redeemed') return { ok: false, reason: 'already_redeemed', detail: `Redeemed ${fmtRelative(match.redeemedAt)}.`, code: match };
    if (match.status === 'cancelled') return { ok: false, reason: 'cancelled', detail: 'Code was cancelled (aborted blast).', code: match };
    if (match.status === 'pending') return { ok: false, reason: 'pending', detail: 'Code is pending — not yet activated by dispatch.', code: match };
    if (new Date(match.expiresAt).getTime() < Date.now()) return { ok: false, reason: 'expired', detail: 'Code expired ' + fmtRelative(match.expiresAt), code: match };
    return { ok: true, code: match };
  }
  return apiFetch('/promo-codes/validate', { params: { phone: cleanPhone, promo_code: cleanPromo } });
}

/**
 * Extend a code's expiry by N days.
 *
 * REAL ENDPOINT:  POST /promo-codes/extend
 * BODY:           { code: string, days: number }
 * RESPONSE:       PromoCode  (expiresAt pushed out by `days`)
 *
 * @param {string} code The unique promo code id (e.g. WA-5XJHDS)
 * @param {number} days Number of days to add
 * @returns {Promise<object>}
 */
export async function extendPromoCode(code, days) {
  if (USE_MOCK) {
    await mockDelay(250);
    const match = mockPromoCodes.find((p) => p.code === code);
    if (match) {
      const base = new Date(match.expiresAt || Date.now());
      match.expiresAt = new Date(base.getTime() + days * 86_400_000).toISOString();
    }
    return match;
  }
  return apiFetch('/promo-codes/extend', {
    method: 'POST',
    body: { code, days },
  });
}

/**
 * Redeem (consume) a code at point of sale.
 *
 * REAL ENDPOINT:  POST /promo-codes/redeem
 * RESPONSE:       PromoCode  (status now "redeemed", redeemedAt set)
 *
 * @param {string} phone The customer's phone number
 * @param {string} promoCode The generic promo code (e.g. DISC20)
 * @returns {Promise<object>}
 */
export async function redeemPromoCode(phone, promoCode) {
  const cleanPhone = String(phone || '').trim();
  const cleanPromo = String(promoCode || '').trim();
  if (USE_MOCK) {
    await mockDelay(250);
    const match = mockPromoCodes.find((p) => p.code === cleanPhone);
    if (match) {
      match.status = 'redeemed';
      match.redeemedAt = new Date().toISOString();
    }
    return match;
  }
  return apiFetch('/promo-codes/redeem', {
    method: 'POST',
    body: { phone: cleanPhone, promo_code: cleanPromo }
  });
}
