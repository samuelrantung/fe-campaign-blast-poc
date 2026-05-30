import { useState, useMemo } from 'react';
import StatusBadge from '../components/common/StatusBadge';
import { Toolbar, Search, Select } from '../components/common/Controls';
import { useAsync } from '../hooks/useAsync';
import { listPromoCodes, validatePromoCode, redeemPromoCode } from '../api';
import { fmtRelative } from '../utils/format';

export default function PromoCodesScreen({ pushToast }) {
  const { data, reload } = useAsync(() => listPromoCodes(), []);
  const codes = data || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [validateCode, setValidateCode] = useState('');
  const [validateResult, setValidateResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    let r = codes.slice();
    if (statusFilter !== 'ALL') r = r.filter((x) => x.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.code.toLowerCase().includes(q) || x.name.toLowerCase().includes(q));
    }
    return r;
  }, [codes, search, statusFilter]);

  async function doValidate() {
    if (!validateCode.trim()) return;
    setBusy(true);
    try {
      setValidateResult(await validatePromoCode(validateCode));
    } finally {
      setBusy(false);
    }
  }

  async function doRedeem() {
    if (!(validateResult && validateResult.ok)) return;
    setBusy(true);
    try {
      const updated = await redeemPromoCode(validateResult.code.code);
      pushToast('Code ' + (updated?.code || validateResult.code.code) + ' marked as redeemed.', 'ok');
      setValidateResult(null);
      setValidateCode('');
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="split">
        <div>
          <Toolbar>
            <Search value={search} onChange={setSearch} placeholder="Search code or customer…" />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Status: All' },
                { value: 'active', label: 'Active' },
                { value: 'pending', label: 'Pending' },
                { value: 'redeemed', label: 'Redeemed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </Toolbar>
          <div className="panel">
            <table className="dt">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Customer</th>
                  <th>Promo</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Expires</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code}>
                    <td><span className="mono" style={{ fontWeight: 500 }}>{r.code}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.name}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{r.customerId}</div>
                    </td>
                    <td>
                      <div className="mono" style={{ fontSize: 12 }}>{r.promoCode}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{r.promoValue}</div>
                    </td>
                    <td><StatusBadge status={r.status} /></td>
                    <td style={{ color: 'var(--ink-3)' }}>{fmtRelative(r.issuedAt)}</td>
                    <td style={{ color: 'var(--ink-3)' }}>{fmtRelative(r.expiresAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <div className="empty">No codes match.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Validate &amp; redeem</div>
              <div className="panel-sub">Cashier-side check</div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <label className="label">Promo code</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input mono"
                placeholder="WA-XXXXXX"
                value={validateCode}
                onChange={(e) => setValidateCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && doValidate()}
              />
              <button className="btn btn-primary" onClick={doValidate} disabled={busy}>Check</button>
            </div>
            <div className="hint">Codes use only A–Z, 2–9 (no 0/O/1/I ambiguity).</div>

            {validateResult && (
              <div style={{ marginTop: 16 }}>
                {validateResult.ok ? (
                  <div style={{ border: '1px solid var(--ok)', background: 'var(--ok-bg)', borderRadius: 6, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-ok"><span className="dot" />Valid</span>
                      <span className="mono">{validateResult.code.code}</span>
                    </div>
                    <dl className="kv">
                      <dt>Customer</dt><dd>{validateResult.code.name}</dd>
                      <dt>Promo</dt><dd>{validateResult.code.promoValue}</dd>
                      <dt>Expires</dt><dd>{fmtRelative(validateResult.code.expiresAt)}</dd>
                    </dl>
                    <button className="btn btn-accent" style={{ marginTop: 12, width: '100%' }} onClick={doRedeem} disabled={busy}>
                      Mark redeemed
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--fail)', background: 'var(--fail-bg)', borderRadius: 6, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className="badge badge-fail"><span className="dot" />{validateResult.reason}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{validateResult.detail}</div>
                  </div>
                )}
              </div>
            )}

            <details className="collapsible" style={{ marginTop: 18 }}>
              <summary>Code states reference</summary>
              <div className="body">
                <dl className="kv">
                  <dt><StatusBadge status="pending" /></dt><dd>Written at promo assignment. Not redeemable.</dd>
                  <dt><StatusBadge status="active" /></dt><dd>Promoted after dispatch success. Redeemable at POS.</dd>
                  <dt><StatusBadge status="redeemed" /></dt><dd>Applied at POS via /redeem call.</dd>
                  <dt><StatusBadge status="cancelled" /></dt><dd>Blast aborted or dispatch failed.</dd>
                </dl>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
