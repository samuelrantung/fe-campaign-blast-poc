import { RULE_DEFS } from '../../utils/constants';

// Renders the triggered rule codes (R01…R04) as labelled pills.
export default function RulePills({ rules }) {
  if (!rules || rules.length === 0) return <span style={{ color: 'var(--ink-4)' }}>—</span>;
  return (
    <span>
      {rules.map((r) => (
        <span key={r} className="pill-rule" title={RULE_DEFS[r]}>{r}</span>
      ))}
    </span>
  );
}
