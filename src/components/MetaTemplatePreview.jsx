import { renderMetaTemplate } from "../utils/format";

export default function MetaTemplatePreview({ template, params = {} }) {
  if (!template) return <div className="empty">No template selected.</div>;

  const { header, body, footer } = renderMetaTemplate(template, params);

  return (
    <div className="msg-preview">
      <div className="msg-channel">
        {template.name} · {template.language} · {template.category}
      </div>
      <div className="msg-bubble">
        {header && <div className="msg-header">{header}</div>}
        {body && <div className="msg-body">{body}</div>}
        {footer && <div className="msg-footer">{footer}</div>}
      </div>
    </div>
  );
}
