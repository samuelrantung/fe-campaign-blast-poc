import RiskBadge from "./common/RiskBadge";
import RulePills from "./common/RulePills";
import RFMCell from "./common/RFMCell";
import { PROMO_DEFS } from "../utils/constants";
import { fmtIDR, fmtAbsTime } from "../utils/format";

// Body of the customer detail drawer: signals, assigned promo, preview.
export default function CustomerDetail({ customer: c }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 6,
            background: "var(--accent-2)",
            color: "var(--accent-ink)",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {c.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            {c.id} · {c.phone}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <RiskBadge level={c.risk} />
        </div>
      </div>

      <details className="collapsible" open style={{ marginBottom: 12 }}>
        <summary>Signals</summary>
        <div className="body">
          <dl className="kv">
            <dt>RFM scores</dt>
            <dd>
              <RFMCell rfm={c.rfm} />
            </dd>
            <dt>Triggered rules</dt>
            <dd>
              <RulePills rules={c.rules} />
            </dd>
            <dt>Days since last purchase</dt>
            <dd className="mono">{c.daysSinceLastPurchase} days</dd>
            <dt>Total spend</dt>
            <dd className="mono">{fmtIDR(c.totalSpend)}</dd>
            <dt>Avg order value</dt>
            <dd className="mono">{fmtIDR(c.avgOrderValue)}</dd>
            <dt>Purchase count</dt>
            <dd className="mono">{c.purchaseCount}</dd>
            <dt>Top category</dt>
            <dd>{c.topCategory}</dd>
            <dt>Customer since</dt>
            <dd>{c.createdAt}</dd>
            <dt>Last sent</dt>
            <dd>
              {c.lastSentAt ? (
                fmtAbsTime(c.lastSentAt)
              ) : (
                <span style={{ color: "var(--ink-4)" }}>never</span>
              )}
            </dd>
            <dt>Opt-out</dt>
            <dd>
              {c.isUnsubscribed ? (
                <span className="badge badge-fail">
                  <span className="dot" />
                  unsubscribed
                </span>
              ) : (
                <span style={{ color: "var(--ink-3)" }}>subscribed</span>
              )}
            </dd>
          </dl>
        </div>
      </details>

      <details className="collapsible" open style={{ marginBottom: 12 }}>
        <summary>Assigned promo</summary>
        <div className="body">
          <dl className="kv">
            <dt>Promo code template</dt>
            <dd className="mono">{c.promoCode}</dd>
            <dt>Promo value</dt>
            <dd>{PROMO_DEFS[c.promoCode].value}</dd>
            <dt>Promo type</dt>
            <dd className="mono">{PROMO_DEFS[c.promoCode].type}</dd>
            <dt>Mapping rationale</dt>
            <dd>{PROMO_DEFS[c.promoCode].note}</dd>
            <dt>Unique code</dt>
            <dd className="mono">{c.uniqueCode}</dd>
            <dt>Expiry</dt>
            <dd>7 days from dispatch</dd>
          </dl>
        </div>
      </details>

      <details className="collapsible" open>
        <summary>Message preview</summary>
        <div className="body"></div>
      </details>
    </div>
  );
}
