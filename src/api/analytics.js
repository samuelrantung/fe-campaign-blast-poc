// ── Analytics API ────────────────────────────────────────────────────────
import { apiFetch, USE_MOCK, mockDelay } from './client';
import { mockBlasts } from '../mocks/mockData';

/**
 * Headline KPIs + per-blast breakdown + daily send volume + top failure reasons.
 *
 * REAL ENDPOINT:  GET /analytics/summary
 * QUERY PARAMS:   { window?: '7d' | '30d' | '90d' | 'all' }
 * RESPONSE:       {
 *                   window, totalSent, totalFailed, failureRate,
 *                   blasts: [{ id, started, mode, template, total, sent, failed }],
 *                   sendsByDay: [{ date, sent, failed }],
 *                   topFailureReasons: [{ reason, count }]
 *                 }
 *
 * NOTE: redemption fields are intentionally absent — no redemption tracking yet.
 *
 * @param {{window?: string}} [opts]
 * @returns {Promise<object>}
 */
export async function getAnalyticsSummary({ window = '30d' } = {}) {
  if (USE_MOCK) {
    await mockDelay();
    const blasts = mockBlasts.slice();
    const totalSent   = blasts.reduce((a, b) => a + b.sent, 0);
    const totalFailed = blasts.reduce((a, b) => a + b.failed, 0);
    const total       = totalSent + totalFailed;

    // Build fake daily send volume for the last 7 days
    const now = Date.now();
    const sendsByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now - (6 - i) * 86_400_000);
      const date = d.toISOString().slice(0, 10);
      return { date, sent: Math.round(20 + Math.random() * 80), failed: Math.round(Math.random() * 5) };
    });

    return {
      window,
      totalSent,
      totalFailed,
      failureRate: total ? +((totalFailed / total) * 100).toFixed(1) : 0,
      blasts,
      sendsByDay,
      topFailureReasons: [
        { reason: 'Rate-limit retry exhausted', count: 14 },
        { reason: 'Invalid recipient (E.164 parse)', count: 8 },
        { reason: 'Template not approved', count: 3 },
      ],
    };
  }
  return apiFetch('/analytics/summary', { params: { window } });
}

/**
 * Messages sent grouped by promo code.
 *
 * REAL ENDPOINT:  GET /analytics/promo-performance
 * RESPONSE:       Array<{ promoCode: string, sent: number }>
 *
 * NOTE: `redeemed` is absent until redemption tracking is added.
 *
 * @returns {Promise<Array>}
 */
export async function getPromoPerformance() {
  if (USE_MOCK) {
    await mockDelay();
    return [
      { promoCode: 'BACK30',    sent: 420 },
      { promoCode: 'BACK20',    sent: 612 },
      { promoCode: 'SHIP15',    sent: 318 },
      { promoCode: 'BOGO1',     sent: 204 },
      { promoCode: 'POINTS2X',  sent: 180 },
    ];
  }
  return apiFetch('/analytics/promo-performance');
}
