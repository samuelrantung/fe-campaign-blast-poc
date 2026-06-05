import { useState, useMemo, useEffect } from "react";
import RiskBadge from "../components/common/RiskBadge";
import RulePills from "../components/common/RulePills";
import RFMCell from "../components/common/RFMCell";
import {
  Toolbar,
  Search,
  Select,
  Segmented,
} from "../components/common/Controls";
import { useAsync } from "../hooks/useAsync";
import { getAtRiskCustomers } from "../api";
import { fmtIDR, fmtRelative, fmtUSD } from "../utils/format";

export default function AtRiskScreen({ onOpenCustomer, onStartBlast }) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("risk");
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const { data, loading, error } = useAsync(
    () =>
      getAtRiskCustomers({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        risk_level: riskFilter !== "ALL" ? riskFilter : undefined,
        sort_by: sortBy,
      }),
    [page, riskFilter, sortBy],
  );
  const customers = data?.results || [];
  const totalRisk = data?.total || 0;
  const total = data?.total_scored || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const rows = useMemo(() => {
    if (!customers) return [];
    let r = customers.slice();

    // -- parse backend response key to frontend key --
    r.forEach((row) => {
      if (row.customer_id != null) row.id = row.customer_id;
      if (row.risk_level != null) row.risk = row.risk_level;
      if (row.rfm != null) {
        row.rfm.r = row.rfm?.r_score;
        row.rfm.f = row.rfm?.f_score;
        row.rfm.m = row.rfm?.m_score;
        row.rfm.combined = row.rfm?.combined_score;
      }
      if (row.triggered_rules != null) row.rules = row.triggered_rules;
      if (row.triggered_rules != null) row.rules = row.triggered_rules;
      if (row.days_since_last_purchase != null)
        row.daysSinceLastPurchase = row.days_since_last_purchase;
      if (row.spend_summary != null)
        row.totalSpend = row.spend_summary?.total_spend;
    });

    return r;
  }, [customers, search, riskFilter, sortBy]);

  const counts = useMemo(
    () => ({
      HIGH: data?.risk_breakdown?.high,
      MEDIUM: data?.risk_breakdown?.medium,
      LOW: data?.risk_breakdown?.low,
    }),
    [customers],
  );

  useEffect(() => setPage(1), [search, riskFilter, sortBy]);

  function toggle(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }
  function toggleAll() {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  }

  function handleRiskFilter(val) {
    setPage(1);
    setRiskFilter(val);
  }
  function handleSortBy(val) {
    setPage(1);
    setSortBy(val);
  }

  return (
    <div className="page">
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">At-risk total</div>
          <div className="stat-value">{totalRisk}</div>
          <div className="stat-sub">of {total} customers scored</div>
        </div>
        <div className="stat">
          <div className="stat-label">High risk</div>
          <div className="stat-value" style={{ color: "var(--risk-high)" }}>
            {counts.HIGH}
          </div>
          <div className="stat-sub">R01 or R03 triggered</div>
        </div>
        <div className="stat">
          <div className="stat-label">Medium risk</div>
          <div className="stat-value" style={{ color: "var(--risk-med)" }}>
            {counts.MEDIUM}
          </div>
          <div className="stat-sub">R02 or R04 triggered</div>
        </div>
        <div className="stat">
          <div className="stat-label">Low risk</div>
          <div className="stat-value" style={{ color: "var(--risk-low)" }}>
            {counts.LOW}
          </div>
          <div className="stat-sub">RFM below 8</div>
        </div>
      </div>

      <Toolbar>
        <Search
          value={search}
          onChange={setSearch}
          placeholder="Search name or customer ID…"
        />
        <Segmented
          value={riskFilter}
          onChange={handleRiskFilter}
          options={[
            { value: "ALL", label: "All" },
            { value: "HIGH", label: "High" },
            { value: "MEDIUM", label: "Medium" },
            { value: "LOW", label: "Low" },
          ]}
        />
        <Select
          value={sortBy}
          onChange={handleSortBy}
          options={[
            { value: "risk", label: "Sort: Risk · Recency" },
            { value: "score", label: "Sort: RFM score (asc)" },
            { value: "recency", label: "Sort: Recency (desc)" },
            { value: "spend", label: "Sort: Spend (desc)" },
          ]}
        />
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: "var(--ink-3)", marginRight: 4 }}>
            {selected.size} selected
          </span>
        )}
        <button className="btn">Export CSV</button>
        <button
          className="btn btn-accent"
          disabled={selected.size === 0}
          onClick={() => onStartBlast([...selected])}
        >
          Start blast → {selected.size || "select rows"}
        </button>
      </Toolbar>

      <div className="panel">
        {!loading && (
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selected.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
                <th>Customer</th>
                <th>Risk</th>
                <th>RFM</th>
                <th>Rules</th>
                <th className="col-num">Days since</th>
                <th className="col-num">Spend</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {console.log("@@rows", rows[0])}
              {rows.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? "selected" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{c.name}</div>
                    <div
                      className="mono"
                      style={{ fontSize: 11, color: "var(--ink-4)" }}
                    >
                      {c.id} · {c.phone}
                    </div>
                  </td>
                  <td>
                    <RiskBadge level={c.risk} />
                  </td>
                  <td>
                    <RFMCell rfm={c.rfm} />
                  </td>
                  <td>
                    <RulePills rules={c.rules} />
                  </td>
                  <td className="col-num">{c.daysSinceLastPurchase}d</td>
                  <td className="col-num">{fmtUSD(c.totalSpend)}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onOpenCustomer(c.id)}
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
        {loading && (
          <div className="loading-row">Loading at-risk customers…</div>
        )}
        {error && (
          <div className="empty">
            <div className="empty-title">Failed to load</div>
            <div>{error.message}</div>
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="empty">
            <div className="empty-title">No customers match</div>
            <div>Adjust filters or clear the search to see more results.</div>
          </div>
        )}
      </div>
    </div>
  );
}
