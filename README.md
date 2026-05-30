# WA-Blast — Operator Console (Frontend)

React + Vite frontend for the WA-Blast re-engagement pipeline: scores at-risk
customers, builds and dispatches WhatsApp re-engagement blasts, tracks dispatch
logs, and validates/redeems promo codes.

The app ships with a **mock data layer** so it runs end-to-end with zero
backend. When your API is ready, flip one env var and every screen talks to the
real server.

---

## 1. Prerequisites

- **Node.js ≥ 18** and npm (check with `node -v`)

## 2. Setup

```bash
cd app
npm install
cp .env.example .env.local   # optional; defaults work out of the box
npm run dev
```

Vite prints a local URL (default **http://localhost:5173**) and opens it.

Other scripts:

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the dev server with hot reload      |
| `npm run build`   | Production build into `dist/`             |
| `npm run preview` | Serve the production build locally        |

---

## 3. Project structure

```
app/
├── index.html               # Vite entry; loads /src/main.jsx
├── vite.config.js           # dev server + (commented) API proxy
├── .env.example             # env template — copy to .env.local
└── src/
    ├── main.jsx             # React root
    ├── App.jsx              # shell: nav + screen switch + customer drawer
    ├── styles/
    │   └── index.css        # design tokens + all component styles
    │
    ├── api/                 # ◀── ALL NETWORK CALLS LIVE HERE
    │   ├── client.js        #     fetch wrapper, base URL, USE_MOCK switch, auth
    │   ├── customers.js     #     at-risk list, customer detail
    │   ├── blasts.js        #     preview, run, history, dispatch log
    │   ├── promos.js        #     list, validate, redeem
    │   ├── analytics.js     #     KPI summary, promo performance
    │   └── index.js         #     barrel export — `import { ... } from '../api'`
    │
    ├── mocks/
    │   └── mockData.js      # deterministic dummy dataset (used while USE_MOCK)
    │
    ├── hooks/
    │   ├── useAsync.js      # run an async fn, expose {data, loading, error, reload}
    │   └── useToasts.jsx    # toast notifications
    │
    ├── utils/
    │   ├── constants.js     # rule defs, promo defs, template name
    │   └── format.js        # currency/date formatters, template renderer
    │
    ├── components/
    │   ├── MessagePreview.jsx
    │   ├── CustomerDetail.jsx
    │   ├── layout/          # Sidebar, Topbar
    │   └── common/          # RiskBadge, StatusBadge, RulePills, RFMCell,
    │                        # Controls (Toolbar/Search/Select/Segmented),
    │                        # Drawer, Modal
    │
    └── screens/             # one file per screen
        ├── AtRiskScreen.jsx
        ├── BlastBuilderScreen.jsx
        ├── LogsScreen.jsx
        ├── PromoCodesScreen.jsx
        ├── AnalyticsScreen.jsx
        └── index.js
```

---

## 4. Connecting a real backend

This is the only thing you need to touch to go live.

### Step 1 — point at your API

In `.env.local`:

```bash
VITE_USE_MOCK=false                    # stop using mock data
VITE_API_BASE_URL=http://localhost:8000   # or "/api" to use the dev proxy
```

> **Tip — avoid CORS in dev:** set `VITE_API_BASE_URL=/api` and uncomment the
> `proxy` block in `vite.config.js`, pointing `target` at your backend. Vite
> forwards `/api/*` to it.

### Step 2 — that's it

Every screen already calls functions in `src/api/`. With `USE_MOCK=false`,
those functions issue real `fetch` requests via `apiFetch()` in
`src/api/client.js`. No screen or component code changes.

### The endpoints each function expects

Each function in `src/api/` documents its method, path, params, and response
shape in a JSDoc comment. Summary:

| Function (src/api)        | Method & path                          | Returns |
| ------------------------- | -------------------------------------- | ------- |
| `getAtRiskCustomers()`    | `GET /customers/at-risk`               | `Customer[]` |
| `getCustomer(id)`         | `GET /customers/{id}`                  | `Customer` |
| `previewBlast(body)`      | `POST /blasts/preview`                 | `{ recipients: Customer[] }` |
| `runBlast(body)`          | `POST /blasts`                         | `{ blastId, total, sent, failed }` |
| `getBlastHistory()`       | `GET /blasts`                          | `Blast[]` |
| `getDispatchLog({blastId})` | `GET /blasts/{blastId}/dispatch`     | `DispatchRow[]` |
| `listPromoCodes(filters)` | `GET /promo-codes`                     | `PromoCode[]` |
| `validatePromoCode(code)` | `GET /promo-codes/{code}/validate`     | `{ ok, reason?, detail?, code? }` |
| `redeemPromoCode(code)`   | `POST /promo-codes/{code}/redeem`      | `PromoCode` |
| `getAnalyticsSummary()`   | `GET /analytics/summary`               | `{ totalSent, totalRedeemed, redemptionRate, … , blasts }` |
| `getPromoPerformance()`   | `GET /analytics/promo-performance`     | `{ promoCode, sent, redeemed }[]` |

If your real routes differ, change only the path string inside the matching
`src/api/*.js` function — nothing else.

### Step 3 — auth

Add your token in **one** place — the `headers` block of `apiFetch()` in
`src/api/client.js`:

```js
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,   // ← add this
  ...headers,
},
```

### Errors

Non-2xx responses throw an `ApiError` (`{ status, message, body }`). The
`useAsync` hook captures it as `error`, and screens already render an error
state (e.g. the at-risk table). FastAPI's `{ "detail": "…" }` is surfaced as
the message automatically.

### Data shapes

`src/mocks/mockData.js` is the reference for every object shape the UI
consumes (`Customer`, `Blast`, `DispatchRow`, `PromoCode`). Match these field
names in your API responses and the UI works unchanged.

---

## 5. Notes

- The **mock layer simulates progress** for `runBlast` with a client-side
  animation. A real blast is long-running — see the JSDoc in `api/blasts.js`
  for the recommended polling/SSE approach to drive the progress bar from
  real dispatch events.
- The message preview is intentionally **not** WhatsApp-branded — this is an
  internal operator tool, not a customer surface.
