// Left navigation rail.
const NAV_GROUPS = [
  {
    label: 'Operate',
    items: [
      { id: 'dataset', label: 'Dataset', icon: '⬆' },
      { id: 'at-risk', label: 'At-risk customers', icon: '👥' },
      { id: 'templates', label: 'Templates', icon: '▤' },
      { id: 'builder', label: 'Blast builder', icon: '✦' },
    ],
  },
  {
    label: 'Records',
    items: [
      { id: 'logs', label: 'Dispatch logs', icon: '≡' },
      { id: 'promos', label: 'Promo codes', icon: '#' },
      { id: 'analytics', label: 'Analytics', icon: '▴' },
    ],
  },
];

export default function Sidebar({ screen, onNavigate, counts = {} }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">W</div>
        <div>
          <div className="brand-name">WA-Blast</div>
          <div className="brand-sub">Operator Console</div>
        </div>
      </div>

      <nav className="nav">
        {NAV_GROUPS.map((g) => (
          <div key={g.label}>
            <div className="nav-label">{g.label}</div>
            {g.items.map((it) => (
              <button
                key={it.id}
                className={'nav-item' + (screen === it.id ? ' active' : '')}
                onClick={() => onNavigate(it.id)}
              >
                <span style={{ width: 16, textAlign: 'center', color: screen === it.id ? 'var(--accent)' : 'var(--ink-4)' }}>{it.icon}</span>
                <span>{it.label}</span>
                {counts[it.id] !== undefined && <span className="count">{counts[it.id]}</span>}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="env-pill">
        <span className="env-dot" />
        <span><strong style={{ color: 'var(--ink-2)' }}>SENDER_MODE</strong> = mock</span>
      </div>
      <div className="env-pill" style={{ marginTop: -6 }}>
        <span className="env-dot" style={{ background: 'var(--ok)' }} />
        <span><strong style={{ color: 'var(--ink-2)' }}>POC</strong> · dummy dataset</span>
      </div>
    </aside>
  );
}
