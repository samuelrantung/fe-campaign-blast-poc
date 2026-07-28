// ── Customers API ────────────────────────────────────────────────────────
// At-risk list + single-customer detail.
import { apiFetch, USE_MOCK, mockDelay } from "./client";
import { mockCustomers } from "../mocks/mockData";

/**
 * Fetch the scored at-risk customer list.
 *
 * REAL ENDPOINT:  GET /customers/at-risk
 * QUERY PARAMS:   { risk?: 'HIGH'|'MEDIUM'|'LOW', search?: string, sort?: string }
 *                 (Filtering/sorting can be done server-side; the UI also
 *                  filters client-side, so params are optional.)
 * RESPONSE:       Customer[]  — see shape in src/mocks/mockData.js
 *
 * @param {{risk?: string, search?: string, sort?: string}} [filters]
 * @returns {Promise<Array>}
 */
export async function getAtRiskCustomers(filters = {}) {
  if (USE_MOCK) {
    await mockDelay();
    const {
      limit = 50,
      offset = 0,
      risk_level,
      sort_by = "risk",
      search,
    } = filters;

    // 1. Calculate risk breakdown on the entire UNFILTERED mock dataset
    const breakdown = { high: 0, medium: 0, low: 0 };
    mockCustomers.forEach((c) => {
      const r = (c.risk || "").toLowerCase();
      if (r in breakdown) breakdown[r]++;
    });

    // 2. Filter mock customers
    let filtered = mockCustomers.slice();
    if (risk_level && risk_level !== "ALL") {
      filtered = filtered.filter((c) => c.risk === risk_level);
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.id || "").toLowerCase().includes(q)
      );
    }

    // 3. Sort mock customers
    const riskOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    
    filtered.sort((a, b) => {
      if (sort_by.startsWith("risk")) {
        const diff = (riskOrder[b.risk] || 0) - (riskOrder[a.risk] || 0);
        if (diff !== 0) return diff;
        if (sort_by.includes("spend")) {
          return (b.totalSpend || 0) - (a.totalSpend || 0);
        }
        return (b.daysSinceLastPurchase || 0) - (a.daysSinceLastPurchase || 0);
      } else if (sort_by.startsWith("score")) {
        return (a.rfm?.combined || 0) - (b.rfm?.combined || 0);
      } else if (sort_by.startsWith("recency")) {
        return (b.daysSinceLastPurchase || 0) - (a.daysSinceLastPurchase || 0);
      } else if (sort_by.startsWith("spend")) {
        return (b.totalSpend || 0) - (a.totalSpend || 0);
      }
      return 0;
    });

    const total = filtered.length;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // Default 7 days cooldown

    const paginated = filtered.slice(offset, offset + limit).map((c) => {
      const last_blasted_at = c.lastSentAt || null;
      const on_cooldown = !!(last_blasted_at && new Date(last_blasted_at) >= cutoffDate);
      return {
        ...c,
        last_blasted_at,
        on_cooldown,
      };
    });

    return {
      total,
      total_scored: mockCustomers.length,
      risk_breakdown: breakdown,
      limit,
      offset,
      results: paginated,
    };
  }
  return apiFetch("/customers/at-risk", { params: filters });
}

/**
 * Download the at-risk customer list as a CSV file.
 * GET /customers/at-risk/download
 */
export async function downloadAtRiskCSV() {
  const { BASE_URL } = await import("./client");
  const url = new URL(
    BASE_URL.replace(/\/$/, "") + "/customers/at-risk/download",
    window.location.origin,
  );
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error("Download failed.");
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "at-risk-customers.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Fetch one customer by id (used by the detail drawer).
 *
 * REAL ENDPOINT:  GET /customers/{id}
 * RESPONSE:       Customer
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getCustomer(id) {
  if (USE_MOCK) {
    await mockDelay(150);
    return mockCustomers.find((c) => c.id === id) || null;
  }
  return apiFetch(`/customers/${encodeURIComponent(id)}`);
}
