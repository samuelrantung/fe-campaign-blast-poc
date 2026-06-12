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
import { getAtRiskCustomers, downloadAtRiskCSV } from "../api";
import { fmtIDR, fmtRelative, fmtUSD } from "../utils/format";
import { useSearchParams } from "react-router-dom";

function mapCustomerKeys(row) {
  if (row.customer_id != null) row.id = row.customer_id;
  if (row.risk_level != null) row.risk = row.risk_level;
  if (row.rfm != null) {
    row.rfm.r = row.rfm?.r_score;
    row.rfm.f = row.rfm?.f_score;
    row.rfm.m = row.rfm?.m_score;
    row.rfm.combined = row.rfm?.combined_score;
  }
  if (row.triggered_rules != null) row.rules = row.triggered_rules;
  if (row.days_since_last_purchase != null)
    row.daysSinceLastPurchase = row.days_since_last_purchase;
  if (row.spend_summary != null)
    row.totalSpend = row.spend_summary?.total_spend;
  return row;
}

export default function AtRiskScreen({ onOpenCustomer, onStartBlast }) {
  const PAGE_SIZE = 50;

  const pageQuery = new URLSearchParams(window.location.search).get("page");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("risk");
  const [selected, setSelected] = useState(new Set());
  const [allCustomers, setAllCustomers] = useState(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [page, _setPage] = useState(() => Number(pageQuery ?? 1));

  function setPage(next) {
    const val = typeof next === "function" ? next(page) : next;
    _setPage(val);
    const params = new URLSearchParams(window.location.search);
    params.set("page", val);
    history.pushState(null, "", "?" + params.toString());
  }

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
  const totalPages = Math.ceil(totalRisk / PAGE_SIZE);

  const rows = useMemo(() => {
    if (!customers) return [];
    return customers.slice().map(mapCustomerKeys);
  }, [customers, search, riskFilter, sortBy]);

  const counts = useMemo(
    () => ({
      HIGH: data?.risk_breakdown?.high,
      MEDIUM: data?.risk_breakdown?.medium,
      LOW: data?.risk_breakdown?.low,
    }),
    [customers],
  );

  useEffect(() => {
    setAllCustomers(null);
  }, [search, riskFilter, sortBy]);

  function toggle(id) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  }
  function toggleAll() {
    if (allCustomers !== null || rows.every((r) => selected.has(r.id))) {
      setSelected(new Set());
      setAllCustomers(null);
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }
  async function handleSelectAll() {
    setLoadingAll(true);
    try {
      const result = await getAtRiskCustomers({
        limit: total,
        offset: 0,
        risk_level: riskFilter !== "ALL" ? riskFilter : undefined,
        sort_by: sortBy,
      });
      const all = (result.results || []).map((r) => mapCustomerKeys({ ...r }));
      setAllCustomers(all);
      setSelected(new Set(all.map((r) => r.id)));
    } finally {
      setLoadingAll(false);
    }
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
            { value: "risk:desc", label: "Sort: Risk · Recency (desc)" },
            {
              value: "risk:desc,spend:desc",
              label: "Sort: Risk · Spend (desc)",
            },
            { value: "score:asc", label: "Sort: RFM score (asc)" },
            { value: "recency:desc", label: "Sort: Recency (desc)" },
            { value: "spend:desc", label: "Sort: Spend (desc)" },
          ]}
        />
        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: "var(--ink-3)", marginRight: 4 }}>
            {selected.size} selected
          </span>
        )}
        <button
          className="btn"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            try { await downloadAtRiskCSV(); } finally { setDownloading(false); }
          }}
        >
          {downloading ? "Exporting…" : "Export CSV"}
        </button>
        <button
          className="btn btn-accent"
          disabled={selected.size === 0}
          onClick={() =>
            onStartBlast(
              (allCustomers ?? rows).filter((r) => selected.has(r.id)),
            )
          }
        >
          Start blast → {selected.size || "select rows"}
        </button>
      </Toolbar>

      {rows.length > 0 &&
        rows.every((r) => selected.has(r.id)) &&
        totalPages > 1 &&
        allCustomers === null && (
          <div className="select-all-banner">
            <span>All {rows.length} customers on this page are selected.</span>
            <button
              className="btn-link"
              onClick={handleSelectAll}
              disabled={loadingAll}
            >
              {loadingAll ? "Loading…" : `Select all ${total} customers`}
            </button>
          </div>
        )}
      {allCustomers !== null && (
        <div className="select-all-banner">
          <span>All {selected.size} customers are selected.</span>
          <button
            className="btn-link"
            onClick={() => {
              setSelected(new Set());
              setAllCustomers(null);
            }}
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="panel">
        {!loading && (
          <table className="dt">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={
                      rows.length > 0 && rows.every((r) => selected.has(r.id))
                    }
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
