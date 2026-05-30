import StatusBadge from './common/StatusBadge';
import { renderTemplate, TEMPLATE_NAME } from '../utils/format';

// Renders the outgoing WhatsApp template for a customer.
// Deliberately NOT WhatsApp-branded — neutral bubble in an internal tool.
export default function MessagePreview({ customer, highlightSlots }) {
  const html = renderTemplate(customer, { highlightSlots });
  return (
    <div className="msg-preview">
      <div className="msg-channel">WhatsApp Template · {TEMPLATE_NAME} · en</div>
      <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="kv" style={{ marginTop: 14 }}>
        <dt>To</dt>
        <dd className="mono">{customer.phone}</dd>
        <dt>Template</dt>
        <dd className="mono">{TEMPLATE_NAME}</dd>
        <dt>Length</dt>
        <dd>{renderTemplate(customer).length} / 1024 chars</dd>
        <dt>Promo code</dt>
        <dd className="mono">{customer.uniqueCode}</dd>
        <dt>Code status</dt>
        <dd><StatusBadge status="pending" /></dd>
      </div>
    </div>
  );
}
