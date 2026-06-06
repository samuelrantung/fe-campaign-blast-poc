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
    return mockCustomers.slice();
  }
  return apiFetch("/customers/at-risk", { params: filters });
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
