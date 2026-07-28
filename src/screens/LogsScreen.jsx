import { useState, useMemo } from 'react';
import StatusBadge from '../components/common/StatusBadge';
import { Toolbar, Search, Select } from '../components/common/Controls';
import { useAsync } from '../hooks/useAsync';
import { getBlastHistory, getDispatchLog } from '../api';
import { fmtRelative, fmtAbsTime } from '../utils/format';

export default function LogsScreen() {
  const { data: blasts } = useAsync(() => getBlastHistory(), []);
  const { data: dispatch } = useAsync(() => getDispatchLog(), []);
  const history = blasts || [];
  const allRows = dispatch || [];

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [blastFilter, setBlastFilter] = useState('ALL');

  const rows = useMemo(() => {
    let r = allRows.slice();
    if (statusFilter !== 'ALL') r = r.filter((x) => x.status === statusFilter);
    if (blastFilter !== 'ALL') r = r.filter((x) => x.blastId === blastFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((x) => x.name.toLowerCase().includes(q) || x.customerId.toLowerCase().includes(q) || x.code.toLowerCase().includes(q));
    }
    return r;
  }, [allRows, search, statusFilter, blastFilter]);

  return (
    <div className="page">
      <Toolbar>
        <Search value={search} onChange={setSearch} placeholder="Search customer, ID, or promo code…" />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'Status: All' },
            { value: 'sent', label: 'Status: sent' },
            { value: 'mocked', label: 'Status: mocked' },
            { value: 'failed', label: 'Status: failed' },
          ]}
        />
        <Select
          value={blastFilter}
          onChange={setBlastFilter}
          options={[{ value: 'ALL', label: 'Blast: All runs' }, ...history.map((b) => ({ value: b.id, label: 'Blast: ' + b.id }))]}
        />
        <div style={{ flex: 1 }} />
      </Toolbar>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div className="panel-title">Blast history</div>
          <div className="panel-sub">SQLite · blast_log table</div>
        </div>
        <table className="dt">
          <thead>
            <tr>
              <th>Blast ID</th>
              <th>Started</th>
              <th>Mode</th>
              <th>Template</th>
              <th className="col-num">Recipients</th>
              <th className="col-num">Sent</th>
              <th className="col-num">Failed</th>
              <th className="col-num">Redeemed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.map((b) => (
              <tr key={b.id}>
                <td className="mono">{b.id}</td>
                <td>{fmtRelative(new Date(b.started).toISOString())}</td>
                <td>
                  <span className={'badge ' + (b.mode === 'meta' ? 'badge-ok' : 'badge-mute')}>
                    <span className="dot" />{b.mode}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{b.template}</td>
                <td className="col-num">{b.total}</td>
                <td className="col-num">{b.sent}</td>
                <td className="col-num" style={{ color: b.failed > 0 ? 'var(--fail)' : 'var(--ink-3)' }}>{b.failed}</td>
                <td className="col-num">{b.redeemed} <span style={{ color: 'var(--ink-4)' }}>({Math.round((b.redeemed / b.sent) * 100)}%)</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setBlastFilter(b.id)}>Filter →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Dispatch rows</div>
          <div className="panel-sub">{rows.length} of {allRows.length}</div>
        </div>
        <table className="dt">
          <thead>
            <tr>
              <th>Sent at</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Promo code</th>
              <th>Status</th>
              <th>Error</th>
              <th>Blast</th>
            </tr>
          </thead>
          <tbody>
            {console.log("@@rows", rows)}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="mono" style={{ fontSize: 12 }}>{fmtAbsTime(r.sentAt)}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{r.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{r.customerId}</div>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{r.phone}</td>
                <td className="mono" style={{ fontSize: 12 }}>{r.code}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <span>
                    {r.errorCode && (<span className="mono" style={{ fontSize: 11, background: 'var(--fail-bg)', color: 'var(--fail)', padding: '1px 5px', borderRadius: 3, marginRight: 6 }}>{r.errorCode}</span>)}
                    {r.errorReason ? (<span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{r.errorReason}</span>) : <span style={{ color: 'var(--ink-4)' }}>—</span>}
                  </span>
                  {/* {r.errorCode ? (
                    <span>
                      <span className="mono" style={{ fontSize: 11, background: 'var(--fail-bg)', color: 'var(--fail)', padding: '1px 5px', borderRadius: 3, marginRight: 6 }}>{r.errorCode}</span>
                      <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{r.errorReason}</span>
                    </span>
                  ) : (
                    <span style={{ color: 'var(--ink-4)' }}>—</span>
                  )} */}
                </td>
                <td className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{r.blastId}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No dispatch rows match these filters.</div>}
      </div>
    </div>
  );
}
