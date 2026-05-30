import { useAsync } from '../hooks/useAsync';
import { getAnalyticsSummary, getPromoPerformance } from '../api';
import { PROMO_DEFS } from '../utils/constants';
import { fmtRelative } from '../utils/format';

export default function AnalyticsScreen() {
  const { data: summary } = useAsync(() => getAnalyticsSummary(), []);
  const { data: perf } = useAsync(() => getPromoPerformance(), []);

  const blasts = summary?.blasts || [];
  const performance = perf || [];
  const maxRedeem = Math.max(1, ...blasts.map((b) => b.redeemed));

  return (
    <div className="page">
      <div className="stat-grid" style={{ marginBottom: 18 }}>
        <div className="stat">
          <div className="stat-label">Messages sent (30d)</div>
          <div className="stat-value">{(summary?.totalSent ?? 0).toLocaleString()}</div>
          <div className="stat-sub stat-delta-up">▲ 12% vs prior</div>
        </div>
        <div className="stat">
          <div className="stat-label">Redemptions</div>
          <div className="stat-value">{summary?.totalRedeemed ?? 0}</div>
          <div className="stat-sub stat-delta-up">▲ 8% vs prior</div>
        </div>
        <div className="stat">
          <div className="stat-label">Redemption rate</div>
          <div className="stat-value">{summary?.redemptionRate ?? 0}%</div>
          <div className="stat-sub">Target ≥ 12%</div>
        </div>
        <div className="stat">
          <div className="stat-label">Avg time-to-redeem</div>
          <div className="stat-value">
            {summary?.avgTimeToRedeemDays ?? 0}
            <span style={{ fontSize: 14, color: 'var(--ink-3)' }}> days</span>
          </div>
          <div className="stat-sub">Median {summary?.medianTimeToRedeemDays ?? 0} days</div>
        </div>
      </div>

      <div className="split">
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Blasts by redemption</div>
            <div className="panel-sub">Most recent {blasts.length} runs</div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {blasts.map((b) => {
              const pct = b.redeemed / b.sent;
              return (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span className="mono" style={{ fontSize: 12 }}>{b.id}</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                      <span className="mono">{b.redeemed}/{b.sent}</span> · {(pct * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: (b.redeemed / maxRedeem) * 100 + '%', background: 'var(--accent)' }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 3 }}>
                    {fmtRelative(new Date(b.started).toISOString())} · {b.mode}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Promo type performance</div>
            <div className="panel-sub">By template</div>
          </div>
          <div style={{ padding: 16 }}>
            <table className="dt" style={{ marginTop: -8, marginBottom: -8 }}>
              <thead>
                <tr><th>Promo</th><th className="col-num">Sent</th><th className="col-num">Redeemed</th><th className="col-num">Rate</th></tr>
              </thead>
              <tbody>
                {performance.map((p) => (
                  <tr key={p.promoCode}>
                    <td>
                      <div className="mono" style={{ fontWeight: 500 }}>{p.promoCode}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{PROMO_DEFS[p.promoCode]?.value}</div>
                    </td>
                    <td className="col-num">{p.sent}</td>
                    <td className="col-num">{p.redeemed}</td>
                    <td className="col-num">{((p.redeemed / p.sent) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
