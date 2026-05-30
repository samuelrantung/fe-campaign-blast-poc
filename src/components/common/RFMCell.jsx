// Compact RFM score cell: R# F# M# · combined.
export default function RFMCell({ rfm }) {
  return (
    <span className="mono" style={{ fontSize: 12 }}>
      <span style={{ color: 'var(--ink-3)' }}>R</span>{rfm.r}{' '}
      <span style={{ color: 'var(--ink-3)' }}>F</span>{rfm.f}{' '}
      <span style={{ color: 'var(--ink-3)' }}>M</span>{rfm.m}{' '}
      <span style={{ color: 'var(--ink-4)' }}>·</span>{' '}
      <strong>{rfm.combined}</strong>
    </span>
  );
}
