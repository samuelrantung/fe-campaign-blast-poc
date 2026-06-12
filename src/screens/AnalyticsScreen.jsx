import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { getAnalyticsSummary, getPromoPerformance } from '../api';
import { Select } from '../components/common/Controls';
import { fmtRelative } from '../utils/format';

const WINDOWS = [
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export default function AnalyticsScreen() {
  const [window, setWindow] = useState('30d');

  const { data: summary } = useAsync(() => getAnalyticsSummary({ window }), [window]);
  const { data: perf }    = useAsync(() => getPromoPerformance(), []);

  const blasts      = summary?.blasts           || [];
  const sendsByDay  = summary?.sendsByDay        || [];
  const failReasons = summary?.topFailureReasons || [];
  const performance = perf || [];

  const maxDaySent = Math.max(1, ...sendsByDay.map((d) => d.sent + d.failed));
  const maxBlastSent = Math.max(1, ...blasts.map((b) => b.sent));

  return (
    <div className="page">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Select value={window} onChange={setWindow} options={WINDOWS} />
      </div>

      {/* ── KPI cards ───────────────────────────────────────── */}
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">Messages sent</div>
          <div className="stat-value">{(summary?.totalSent ?? 0).toLocaleString()}</div>
          <div className="stat-sub">{window === 'all' ? 'All time' : `Last ${window}`}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Failed</div>
          <div className="stat-value" style={{ color: summary?.totalFailed > 0 ? 'var(--fail)' : undefined }}>
            {(summary?.totalFailed ?? 0).toLocaleString()}
          </div>
          <div className="stat-sub">
            {summary?.failureRate ?? 0}% failure rate
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Blast runs</div>
          <div className="stat-value">{blasts.length}</div>
          <div className="stat-sub">
            {blasts.filter((b) => b.mode === 'meta').length} live ·{' '}
            {blasts.filter((b) => b.mode === 'mocked').length} mocked
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg recipients / blast</div>
          <div className="stat-value">
            {blasts.length ? Math.round((summary?.totalSent ?? 0) / blasts.length).toLocaleString() : '—'}
          </div>
          <div className="stat-sub">sent per run</div>
        </div>
      </div>

      {/* ── Send volume chart + Blast performance ──────────── */}
      <div className="split" style={{ marginBottom: 16 }}>

        {/* Daily send volume */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Send volume</div>
            <div className="panel-sub">by day</div>
          </div>
          <div style={{ padding: '12px 16px 16px' }}>
            {sendsByDay.length === 0 ? (
              <div className="empty">No data for this window.</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                {sendsByDay.map((d) => {
                  const sentH  = ((d.sent   / maxDaySent) * 72);
                  const failH  = ((d.failed / maxDaySent) * 72);
                  return (
                    <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${d.date}: ${d.sent} sent, ${d.failed} failed`}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 72, gap: 1 }}>
                        {d.failed > 0 && (
                          <div style={{ height: failH, background: 'var(--fail)', borderRadius: '2px 2px 0 0', minHeight: 2 }} />
                        )}
                        <div style={{ height: sentH, background: 'var(--accent)', borderRadius: d.failed > 0 ? 0 : '2px 2px 0 0', minHeight: 2 }} />
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                        {d.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
                Sent
              </span>
              <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--fail)', display: 'inline-block' }} />
                Failed
              </span>
            </div>
          </div>
        </div>

        {/* Per-blast performance */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Blast runs</div>
            <div className="panel-sub">{blasts.length} runs — sent vs failed</div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {blasts.length === 0 && <div className="empty">No blasts in this window.</div>}
            {blasts.map((b) => {
              const failPct = b.total ? (b.failed / b.total) * 100 : 0;
              const sentPct = b.total ? (b.sent   / b.total) * 100 : 0;
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 12 }}>{b.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      <span className="mono">{b.sent}/{b.total}</span>
                      {b.failed > 0 && (
                        <span style={{ color: 'var(--fail)', marginLeft: 6 }}>✕ {b.failed}</span>
                      )}
                    </span>
                  </div>
                  {/* Stacked bar: sent (accent) + failed (fail) */}
                  <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                    <div style={{ height: '100%', width: sentPct + '%', background: 'var(--accent)' }} />
                    <div style={{ height: '100%', width: failPct + '%', background: 'var(--fail)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>
                    {fmtRelative(new Date(b.started).toISOString())} · {b.mode} · {b.template}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Promo breakdown + Failure reasons ──────────────── */}
      <div className="split">

        {/* Promo code breakdown */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Promo code breakdown</div>
            <div className="panel-sub">messages sent per code</div>
          </div>
          <div style={{ padding: 16 }}>
            <table className="dt" style={{ marginTop: -8, marginBottom: -8 }}>
              <thead>
                <tr>
                  <th>Promo code</th>
                  <th className="col-num">Sent</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((p) => {
                  const maxSent = Math.max(1, ...performance.map((x) => x.sent));
                  return (
                    <tr key={p.promoCode}>
                      <td className="mono" style={{ fontWeight: 500 }}>{p.promoCode}</td>
                      <td className="col-num">{p.sent.toLocaleString()}</td>
                      <td style={{ width: 100 }}>
                        <div style={{ height: 6, background: 'var(--line-2)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: (p.sent / maxSent) * 100 + '%', background: 'var(--accent)' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {performance.length === 0 && <div className="empty">No data.</div>}
          </div>
        </div>

        {/* Top failure reasons */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Top failure reasons</div>
            <div className="panel-sub">from blast_log.error_reason</div>
          </div>
          <div style={{ padding: 16 }}>
            {failReasons.length === 0 ? (
              <div className="empty">No failures recorded. 🎉</div>
            ) : (
              <table className="dt" style={{ marginTop: -8, marginBottom: -8 }}>
                <thead>
                  <tr><th>Reason</th><th className="col-num">Count</th></tr>
                </thead>
                <tbody>
                  {failReasons.map((f) => (
                    <tr key={f.reason}>
                      <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{f.reason}</td>
                      <td className="col-num" style={{ color: 'var(--fail)' }}>{f.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
