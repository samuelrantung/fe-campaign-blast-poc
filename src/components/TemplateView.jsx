import { parseTemplate, TemplatePreview, findVars } from "./TemplateEditor";

const STATUS_CLS = {
  APPROVED: "badge-ok",
  PENDING: "badge-mute",
  REJECTED: "badge-fail",
  PAUSED: "badge-med",
  DISABLED: "badge-fail",
};

function StatusBadge({ status }) {
  return (
    <span className={"badge " + (STATUS_CLS[status] || "badge-mute")}>
      <span className="dot" />
      {(status || "unknown").toLowerCase()}
    </span>
  );
}

/** Read-only detail view: rich WhatsApp preview + metadata + variable samples. */
export default function TemplateView({ template }) {
  if (!template) return null;
  const t = parseTemplate(template);
  const vars = findVars(t.body.text);
  const rejected = template.rejected_reason && template.rejected_reason !== "NONE";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
      <TemplatePreview {...t} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rejected && (
        <div style={{ border: "1px solid var(--fail)", background: "var(--fail-bg)", borderRadius: 6, padding: "10px 12px", fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Rejected by Meta</div>
          <div className="mono" style={{ fontSize: 12 }}>{template.rejected_reason}</div>
        </div>
      )}

      <dl className="kv">
        <dt>Status</dt>
        <dd><StatusBadge status={template.status} /></dd>
        <dt>Category</dt>
        <dd>{template.category || "—"}</dd>
        <dt>Language</dt>
        <dd className="mono">{template.language || "—"}</dd>
        <dt>Quality</dt>
        <dd>{template.quality_score?.score || "—"}</dd>
        <dt>ID</dt>
        <dd className="mono" style={{ fontSize: 12 }}>{template.id}</dd>
      </dl>

      {vars.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 6 }}>Variables &amp; sample values</div>
          <table className="dt">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Sample</th>
              </tr>
            </thead>
            <tbody>
              {vars.map((v) => (
                <tr key={v}>
                  <td className="mono" style={{ fontSize: 12 }}>{`{{${v}}}`}</td>
                  <td>{t.body.examples?.[v] || <span style={{ color: "var(--ink-4)" }}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}
