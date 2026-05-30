// Top bar: breadcrumb + title + meta.
export default function Topbar({ crumb, title }) {
  return (
    <div className="topbar">
      <span className="crumb">{crumb}</span>
      <span style={{ color: 'var(--ink-4)' }}>/</span>
      <h1>{title}</h1>
      <div className="spacer" />
      <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>FastAPI · v0.4.0</div>
      <button className="btn btn-ghost">Docs</button>
      <div
        style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)',
          color: 'white', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 600,
        }}
      >
        OP
      </div>
    </div>
  );
}
