// ─────────────────────────────────────────────────────────────────────────
//  API CLIENT
//
//  Single place that talks to the network. Every endpoint module
//  (customers.js, blasts.js, promos.js, analytics.js) goes through
//  `apiFetch` here so auth, base URL, and error handling live in ONE spot.
//
//  HOW MOCKING WORKS
//  -----------------
//  While VITE_USE_MOCK === "true", the endpoint modules short-circuit and
//  resolve data from src/mocks/ instead of calling the network. Flip
//  VITE_USE_MOCK=false in .env.local once your backend is live and every
//  call below starts hitting `${VITE_API_BASE_URL}${path}` for real.
// ─────────────────────────────────────────────────────────────────────────

/** Base URL prepended to every request path. Configure in .env.local. */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/** Master switch: when true, endpoints return mock data (no network). */
export const USE_MOCK = (import.meta.env.VITE_USE_MOCK ?? "true") !== "false";

/** Thrown on any non-2xx response. `status` and `body` aid UI error states. */
export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Small helper so mock calls feel async (network-like latency). */
export const mockDelay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

/**
 * Core fetch wrapper.
 * @param {string} path                 e.g. "/customers/at-risk"
 * @param {object} [opts]
 * @param {string} [opts.method]        GET | POST | PATCH | DELETE
 * @param {object} [opts.body]          JSON-serialised automatically
 * @param {object} [opts.params]        query string params (skips null/undefined)
 * @param {object} [opts.headers]       extra headers
 * @returns {Promise<any>}              parsed JSON, or null for 204
 * @throws  {ApiError}
 */
export async function apiFetch(
  path,
  { method = "GET", body, params, headers } = {},
) {
  const url = new URL(
    BASE_URL.replace(/\/$/, "") + path,
    window.location.origin,
  );
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }

  console.log("@@METHOD", method);
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      // ── AUTH ──────────────────────────────────────────────────────
      // Add your token here once you have auth, e.g.:
      // Authorization: `Bearer ${getToken()}`,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    // FastAPI commonly returns { detail: "..." }
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(res.status, errBody.detail || res.statusText, errBody);
  }

  return res.status === 204 ? null : res.json();
}
