// ── Analytics API ────────────────────────────────────────────────────────
import { apiFetch, USE_MOCK, mockDelay } from './client';
import { mockBlasts, mockPromoPerformance } from '../mocks/mockData';

/**
 * Headline KPIs + per-blast redemption series for the Analytics screen.
 *
 * REAL ENDPOINT:  GET /analytics/summary
 * QUERY PARAMS:   { window?: string }   e.g. "30d"
 * RESPONSE:       {
 *                   totalSent, totalRedeemed, redemptionRate,
 *                   avgTimeToRedeemDays, medianTimeToRedeemDays,
 *                   blasts: Blast[]
 *                 }
 *
 * @param {{window?: string}} [opts]
 * @returns {Promise<object>}
 */
export async function getAnalyticsSummary({ window = '30d' } = {}) {
  if (USE_MOCK) {
    await mockDelay();
    const totalSent = mockBlasts.reduce((a, b) => a + b.sent, 0);
    const totalRedeemed = mockBlasts.reduce((a, b) => a + b.redeemed, 0);
    return {
      window,
      totalSent,
      totalRedeemed,
      redemptionRate: +((totalRedeemed / totalSent) * 100).toFixed(1),
      avgTimeToRedeemDays: 2.3,
      medianTimeToRedeemDays: 1.8,
      blasts: mockBlasts.slice(),
    };
  }
  return apiFetch('/analytics/summary', { params: { window } });
}

/**
 * Redemption performance broken down by promo template.
 *
 * REAL ENDPOINT:  GET /analytics/promo-performance
 * RESPONSE:       Array<{ promoCode: string, sent: number, redeemed: number }>
 *
 * @returns {Promise<Array>}
 */
export async function getPromoPerformance() {
  if (USE_MOCK) {
    await mockDelay();
    return mockPromoPerformance.slice();
  }
  return apiFetch('/analytics/promo-performance');
}
