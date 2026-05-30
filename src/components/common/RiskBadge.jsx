// Risk-level badge (HIGH / MEDIUM / LOW).
export default function RiskBadge({ level }) {
  const cls = level === 'HIGH' ? 'badge-high' : level === 'MEDIUM' ? 'badge-med' : 'badge-low';
  return (
    <span className={'badge ' + cls}>
      <span className="dot" />
      {level}
    </span>
  );
}
