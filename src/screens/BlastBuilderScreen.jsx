import { useState, useMemo, useEffect } from "react";
import RiskBadge from "../components/common/RiskBadge";
import { Select, Segmented } from "../components/common/Controls";
import Modal from "../components/common/Modal";
import { useAsync } from "../hooks/useAsync";
import { getTemplates, previewBlast, runBlast, sendBlast } from "../api";
import { fmtIDR, fmtUSD, TEMPLATE_NAME } from "../utils/format";
import MetaTemplatePreview from "../components/MetaTemplatePreview";

const META_TEMPLATE = {
  reengagement_promo: {
    GET_PARAMS: (customer) => {
      const params = {
        name: customer.name,
        promo_value: customer.promo?.promo_value,
        promo_code: customer.promo?.promo_code,
        expiry_days: customer.promo?.expiry_days,
      };

      return Object.keys(params).map((key) => ({
        name: key,
        value: params[key]?.toString(),
      }));
    },
  },
  hello_world: {
    GET_PARAMS: () => [],
  },
};

export default function BlastBuilderScreen({ preselected = [], onSent }) {
  const [sql, setSql] = useState("risk_level IN ('HIGH', 'MEDIUM')");
  const [maxSize, setMaxSize] = useState(500);
  const [senderMode, setSenderMode] = useState("meta");
  const [mlEnabled, setMlEnabled] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState({});

  const [phase, setPhase] = useState("idle"); // idle | preflight | sending | done
  const [progress, setProgress] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState(null);

  const {
    data: templateData,
    loading: templateLoading,
    error: templateError,
  } = useAsync(
    () =>
      getTemplates({
        limit: 1000,
      }),
    [],
  );

  const templates = templateData?.data ?? [];

  const hasPreselect = preselected && preselected.length > 0;

  const loading = false;
  const filtered = preselected;

  const current =
    filtered[Math.min(previewIdx, filtered.length - 1)] || filtered[0];

  async function doRun() {
    setConfirm(false);
    setPhase("preflight");
    setProgress(0);

    // Local progress animation while the dispatch runs. When the backend
    // exposes real progress (SSE/poll), drive the bar from those events.
    const total = filtered.length;
    let i = 0;
    const timer = setInterval(() => {
      i += Math.max(1, Math.floor(total / 30));
      const pct = Math.min(0.95, i / total);
      setProgress(pct);
      setPhase(pct < 0.15 ? "preflight" : "sending");
    }, 60);

    try {
      const resolver = META_TEMPLATE[selectedTemplate?.name];

      if (!resolver) {
        console.error("Please provide template configuration");
        return;
      }

      const customers = filtered.map((customer) => {
        const template_params = resolver.GET_PARAMS(customer);

        return {
          to: customer.phone,
          customer_id: customer.id,
          promo_code: customer.promo?.promo_code,
          template_name: selectedTemplate.name,
          language: selectedTemplate.language,
          template_params,
        };
      });

      const res = await sendBlast({
        customers,
        maxBlastSize: maxSize,
        senderMode: senderMode,
      });
      clearInterval(timer);
      setProgress(1);
      setPhase("done");
      setResult(res);
    } catch (err) {
      clearInterval(timer);
      setPhase("done");
      setResult({
        blastId: "—",
        total,
        sent: 0,
        failed: total,
        error: err.message,
      });
    }
  }

  useEffect(() => {
    if (templates?.length && !!selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates]);

  return (
    <div className="page">
      <div className="split-3">
        {/* LEFT — campaign settings */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Campaign</div>
              <div className="panel-sub">Filter, cap, sender</div>
            </div>
          </div>
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div>
              <label className="label">Template</label>
              <Select
                onChange={(v) => {
                  setSelectedTemplate(templates.find((x) => x.name === v));
                }}
                value={selectedTemplate?.name}
                options={[
                  ...templates.filter(x => x.status === "APPROVED").map((template) => {
                    return {
                      value: template.name,
                      label: template.name,
                    };
                  }),
                ]}
                style={{ width: "100%" }}
              />
            </div>
            <div>
              <label className="label">Sender mode</label>
              <Segmented
                value={senderMode}
                onChange={setSenderMode}
                options={[
                  { value: "meta", label: "Meta Cloud" },
                  { value: "mock", label: "Mock (log only)" },
                ]}
              />
              <div className="hint">
                {senderMode === "mock"
                  ? "Messages will be written to blast_log with status=mocked."
                  : "Requires WA_ACCESS_TOKEN. Rate limit: 10 msg/s."}
              </div>
            </div>
            <div style={{ display: "none" }}>
              <label className="label">SQL filter (over at-risk list)</label>
              <textarea
                className="textarea"
                disabled={hasPreselect}
                value={
                  hasPreselect
                    ? `customer_id IN (${preselected.length} selected)`
                    : sql
                }
                onChange={(e) => setSql(e.target.value)}
              />
              <div className="hint">
                Allowed: comparison ops, AND/OR/NOT, IN, LIKE, BETWEEN.
                Validated server-side.
              </div>
            </div>
            <div>
              <label className="label">Max blast size</label>
              <input
                className="input"
                type="number"
                value={maxSize}
                min={1}
                max={5000}
                onChange={(e) => setMaxSize(Math.max(1, +e.target.value || 0))}
              />
              <div className="hint">
                Top-N selected by combined RFM score when exceeded.
              </div>
            </div>
            <div style={{ display: "none" }}>
              <label className="label">ML predictor</label>
              <Segmented
                value={mlEnabled ? "on" : "off"}
                onChange={(v) => setMlEnabled(v === "on")}
                options={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
              />
              <div className="hint">
                When on, churn_rf.pkl scores rule-unflagged customers.
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — recipients & dispatch */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Recipients</div>
                <div className="panel-sub">
                  {filtered.length} customers ·{" "}
                  {filtered.filter((c) => c.risk === "HIGH").length} HIGH ·{" "}
                  {filtered.filter((c) => c.risk === "MEDIUM").length} MED ·{" "}
                  {filtered.filter((c) => c.risk === "LOW").length} LOW
                </div>
              </div>
              <div style={{ flex: 1 }} />
            </div>
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              <table className="dt">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Risk</th>
                    <th>Promo</th>
                    <th>Code</th>
                    <th className="col-num">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      className={i === previewIdx ? "selected" : ""}
                      onClick={() => setPreviewIdx(i)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.name}</div>
                        <div
                          className="mono"
                          style={{ fontSize: 11, color: "var(--ink-4)" }}
                        >
                          {c.phone}
                        </div>
                      </td>
                      <td>
                        <RiskBadge level={c.risk} />
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {c.promoCode}
                        </span>
                      </td>
                      <td>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {c.uniqueCode}
                        </span>
                      </td>
                      <td className="col-num">{fmtUSD(c.totalSpend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loading && (
                <div className="loading-row">Resolving recipients…</div>
              )}
            </div>
          </div>

          {phase !== "idle" && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    {phase === "preflight" && "Pre-flight validation"}
                    {phase === "sending" && "Dispatching"}
                    {phase === "done" && "Blast complete"}
                  </div>
                  <div className="panel-sub">
                    {phase === "preflight" &&
                      "Validating slot integrity, message length, promo code state…"}
                    {phase === "sending" &&
                      `Rate-limited at 10 msg/s · ${Math.round(progress * filtered.length)} / ${filtered.length}`}
                    {phase === "done" &&
                      result &&
                      `Blast ID ${result.blastId} · ${result.sent} sent · ${result.failed} failed`}
                  </div>
                </div>
                {phase === "done" && (
                  <button
                    className="btn btn-sm"
                    onClick={() => {
                      setPhase("idle");
                      setResult(null);
                      onSent && onSent();
                    }}
                  >
                    Done
                  </button>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <div className="progress-row">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: progress * 100 + "%" }}
                    />
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      minWidth: 40,
                      textAlign: "right",
                    }}
                  >
                    {Math.round(progress * 100)}%
                  </div>
                </div>
                {phase === "done" && result && (
                  <div style={{ marginTop: 12, display: "flex", gap: 18 }}>
                    <span className="badge badge-ok">
                      <span className="dot" />
                      {result.sent} sent
                    </span>
                    <span className="badge badge-fail">
                      <span className="dot" />
                      {result.failed} failed
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — message preview */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Message preview</div>
              <div className="panel-sub">{current ? current.name : "—"}</div>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            {selectedTemplate ? (
              <MetaTemplatePreview
                template={selectedTemplate}
                params={{
                  BODY: {
                    name: current?.name,
                    promo_value: current?.promo?.promo_value,
                    promo_code: current?.promo?.promo_code,
                    expiry_days: current?.promo?.expiry_days,
                  },
                }}
              />
            ) : (
              <div className="empty">No template selected.</div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 16,
                gap: 8,
              }}
            >
              <button className="btn" style={{ display: "none" }}>
                Save preview
              </button>
              <button
                className="btn btn-accent"
                disabled={
                  filtered.length === 0 ||
                  phase === "sending" ||
                  phase === "preflight"
                }
                onClick={() => setConfirm(true)}
              >
                {senderMode === "mock" ? "Run mock blast →" : "Send blast →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={
          senderMode === "mock"
            ? "Run mock blast?"
            : "Send blast to live recipients?"
        }
        sub={`${filtered.length} customers · ${senderMode === "mock" ? "no real messages sent" : "real WhatsApp messages will be dispatched"}`}
        footer={
          <>
            <button className="btn" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button
              className={
                "btn " + (senderMode === "mock" ? "btn-primary" : "btn-danger")
              }
              onClick={doRun}
            >
              {senderMode === "mock" ? "Run mock blast" : "Send for real"}
            </button>
          </>
        }
      >
        <dl className="kv">
          <dt>Recipients</dt>
          <dd>{filtered.length}</dd>
          <dt>Sender</dt>
          <dd className="mono">{senderMode}</dd>
          <dt>Template</dt>
          <dd className="mono">{TEMPLATE_NAME}</dd>
          <dt>Rate limit</dt>
          <dd>10 msg/s · ETA ~{Math.ceil(filtered.length / 10)}s</dd>
          <dt>Cooldown</dt>
          <dd>7 days (skips recently-blasted customers)</dd>
        </dl>
      </Modal>
    </div>
  );
}
