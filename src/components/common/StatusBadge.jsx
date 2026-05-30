// Generic status badge for dispatch + promo-code states.
const MAP = {
  sent: { cls: 'badge-ok', label: 'sent' },
  mocked: { cls: 'badge-mute', label: 'mocked' },
  failed: { cls: 'badge-fail', label: 'failed' },
  active: { cls: 'badge-ok', label: 'active' },
  pending: { cls: 'badge-mute', label: 'pending' },
  redeemed: { cls: 'badge-low', label: 'redeemed' },
  cancelled: { cls: 'badge-fail', label: 'cancelled' },
};

export default function StatusBadge({ status }) {
  const m = MAP[status] || MAP.pending;
  return (
    <span className={'badge ' + m.cls}>
      <span className="dot" />
      {m.label}
    </span>
  );
}
