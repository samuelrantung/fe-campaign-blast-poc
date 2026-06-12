import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { useAsync } from "../hooks/useAsync";
import {
  getDatasetStatus,
  uploadDataset,
  analyzeDataset,
  getAtRiskCustomers,
  REQUIRED_COLUMNS,
} from "../api";

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([REQUIRED_COLUMNS]);
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "transactions_template.xlsx");
}

export default function DatasetScreen({ onNavigate }) {
  const fileRef = useRef(null);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [statusKey, setStatusKey] = useState(0);
  const [useML, setUseML] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const { data: status, loading: statusLoading } = useAsync(
    () => getDatasetStatus(),
    [statusKey, analyzeResult],
  );

  // Sync useML with backend status on initial load / reload
  useEffect(() => {
    if (status?.ml_enabled !== undefined && status?.ml_enabled !== null) {
      setUseML(!!status.ml_enabled);
    }
  }, [status]);

  // Load analysis breakdown stats when on step 3 and analysis results exist
  useEffect(() => {
    if (step === 3 && status?.last_analyzed_at) {
      setStatsLoading(true);
      getAtRiskCustomers({ limit: 1 })
        .then((res) => {
          if (Array.isArray(res)) {
            // Mock mode returns direct array
            const high = res.filter((c) => c.risk === "HIGH").length;
            const med = res.filter((c) => c.risk === "MEDIUM").length;
            const low = res.filter((c) => c.risk === "LOW").length;
            setStats({
              total: res.length,
              high,
              medium: med,
              low,
            });
          } else {
            // Real API returns object with breakdown
            setStats({
              total: res.total_scored || 0,
              high: res.risk_breakdown?.high || 0,
              medium: res.risk_breakdown?.medium || 0,
              low: res.risk_breakdown?.low || 0,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load customer stats:", err);
        })
        .finally(() => {
          setStatsLoading(false);
        });
    } else {
      setStats(null);
    }
  }, [step, status?.last_analyzed_at]);

  async function handleFileUpload(file) {
    if (!file) return;

    setUploadError(null);
    setUploadDone(false);
    setAnalyzeResult(null);

    if (!file.name.endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      return;
    }

    setUploading(true);
    try {
      await uploadDataset(file);
      setUploadDone(true);
      setStatusKey((k) => k + 1);
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      await analyzeDataset(useML);
      setAnalyzeResult({ ok: true });
      setStatusKey((k) => k + 1);
    } catch (err) {
      setAnalyzeResult({
        ok: false,
        message: err.message || "Analysis failed.",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  const hasDataset = status?.status === "ready";

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      {/* ── Progress Stepper Bar ── */}
      <div className="stepper">
        <div
          className={`step-item ${step === 1 ? "active" : ""} ${hasDataset ? "completed" : ""}`}
          onClick={() => setStep(1)}
          style={{ cursor: "pointer" }}
        >
          <div className="step-number">1</div>
          <span className="step-label">Ingest CSV</span>
        </div>
        <span className="step-chevron">→</span>
        <div
          className={`step-item ${step === 2 ? "active" : ""} ${hasDataset && status?.last_analyzed_at ? "completed" : ""}`}
          onClick={() => hasDataset && setStep(2)}
          style={{
            cursor: hasDataset ? "pointer" : "not-allowed",
            opacity: hasDataset ? 1 : 0.5,
          }}
        >
          <div className="step-number">2</div>
          <span className="step-label">Configure</span>
        </div>
        <span className="step-chevron">→</span>
        <div
          className={`step-item ${step === 3 ? "active" : ""} ${!!status?.last_analyzed_at ? "completed" : ""}`}
          onClick={() => hasDataset && setStep(3)}
          style={{
            cursor: hasDataset ? "pointer" : "not-allowed",
            opacity: hasDataset ? 1 : 0.5,
          }}
        >
          <div className="step-number">3</div>
          <span className="step-label">Analyze</span>
        </div>
      </div>

      {statusLoading && !status ? (
        <div className="panel" style={{ padding: 24, textAlign: "center" }}>
          <div className="spinner spinner-dark" />
          <div style={{ marginTop: 8, color: "var(--ink-3)" }}>Loading status...</div>
        </div>
      ) : (
        <>
          {/* ── STEP 1: INGEST / UPLOAD ── */}
          {step === 1 && (
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div className="panel-title" style={{ fontSize: 14 }}>Upload Transactions Dataset</div>
                <div className="panel-sub" style={{ marginTop: 4 }}>
                  Ingest customer purchasing history for churn predictive scoring.
                </div>
              </div>

              <div
                className={`dropzone ${isDragActive ? "active" : ""}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                    e.target.value = "";
                  }}
                />
                {uploading ? (
                  <>
                    <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
                    <div className="dropzone-title">Uploading CSV dataset...</div>
                    <div className="dropzone-sub">This might take a few seconds.</div>
                  </>
                ) : uploadDone && !uploadError ? (
                  <>
                    <div className="dropzone-icon" style={{ color: "var(--ok)" }}>✓</div>
                    <div className="dropzone-title">Dataset saved successfully!</div>
                    <div className="dropzone-sub">
                      {status?.original_filename || "transactions.csv"} · {status?.row_count} rows
                    </div>
                  </>
                ) : hasDataset ? (
                  <>
                    <div className="dropzone-icon" style={{ color: "var(--accent)" }}>✓</div>
                    <div className="dropzone-title">Active Dataset: {status.original_filename}</div>
                    <div className="dropzone-sub">
                      {status.row_count} rows · Uploaded {new Date(status.last_uploaded).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
                      Drag a new CSV file here or click to replace it.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="dropzone-icon">⇪</div>
                    <div className="dropzone-title">Choose a CSV file or drag it here</div>
                    <div className="dropzone-sub">Accepts transactional transactions.csv dataset files</div>
                  </>
                )}
              </div>

              {uploadError && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "10px 12px",
                    background: "var(--fail-bg)",
                    border: "1px solid oklch(0.88 0.04 25)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--fail)",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Upload Error:</span>
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="panel" style={{ marginTop: 20, background: "var(--panel-2)" }}>
                <div className="panel-header" style={{ borderBottom: "none" }}>
                  <div>
                    <div className="panel-title" style={{ fontSize: 12 }}>Template Schema & Columns</div>
                    <div className="panel-sub" style={{ marginTop: 4 }}>
                      Download the spreadsheet template to see the required format.
                    </div>
                  </div>
                  <div style={{ flex: 1 }} />
                  <button className="btn btn-sm" onClick={downloadTemplate}>
                    Download Template
                  </button>
                </div>
                <div style={{ padding: "10px 16px", borderTop: "1px solid var(--line-2)", fontSize: 11.5 }}>
                  <span className="label" style={{ display: "inline", marginBottom: 0, marginRight: 6 }}>
                    Required columns:
                  </span>
                  <code className="mono" style={{ color: "var(--ink-3)", fontSize: 11 }}>
                    {REQUIRED_COLUMNS.join(", ")}
                  </code>
                </div>
              </div>

              <div className="wizard-footer">
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  {hasDataset ? "Dataset is ready for configuration." : "Upload a dataset to proceed."}
                </span>
                <button
                  className="btn btn-primary"
                  disabled={!hasDataset}
                  onClick={() => setStep(2)}
                >
                  Configure Analysis →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: CONFIGURE METHOD ── */}
          {step === 2 && (
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div className="panel-title" style={{ fontSize: 14 }}>Risk Scoring Configuration</div>
                <div className="panel-sub" style={{ marginTop: 4 }}>
                  Select the algorithm pattern used to identify and evaluate at-risk customer groups.
                </div>
              </div>

              <div className="config-grid">
                <div
                  className={`config-card ${!useML ? "active" : ""}`}
                  onClick={() => setUseML(false)}
                >
                  <div className="config-header-row">
                    <div className="panel-title" style={{ fontSize: 13 }}>Rule-Based RFM</div>
                    <span className="config-badge" style={{ background: "var(--line-2)", color: "var(--ink-3)" }}>
                      Traditional
                    </span>
                  </div>
                  <div className="config-desc">
                    Scores churn risk based on static recency, frequency, and monetary parameters. Fully transparent and auditable.
                  </div>
                  <ul className="config-features">
                    <li>Uses standard RFM scoring (1 to 5 index)</li>
                    <li>Triggers rules (R01-R04) on purchase dates</li>
                    <li>Deterministically assigns risk buckets</li>
                  </ul>
                </div>

                <div
                  className={`config-card ${useML ? "active" : ""}`}
                  onClick={() => setUseML(true)}
                >
                  <div className="config-header-row">
                    <div className="panel-title" style={{ fontSize: 13 }}>Machine Learning Model</div>
                    <span className="config-badge" style={{ background: "var(--accent-2)", color: "var(--accent-ink)" }}>
                      Predictive
                    </span>
                  </div>
                  <div className="config-desc">
                    Employs random forest classifiers to compute a continuous probability of customer churn based on transaction intervals.
                  </div>
                  <ul className="config-features">
                    <li>Outputs custom churn probability (0% to 100%)</li>
                    <li>Dynamically adapts to customer buying cycles</li>
                    <li>More robust for non-linear seasonal behavior</li>
                  </ul>
                </div>
              </div>

              <div className="wizard-footer">
                <button className="btn" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  Proceed to Analysis →
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: RUN ANALYSIS & VERIFY ── */}
          {step === 3 && (
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <div className="panel-title" style={{ fontSize: 14 }}>Run Dataset Analysis</div>
                <div className="panel-sub" style={{ marginTop: 4 }}>
                  Process customer transaction matrices and map them to targeted marketing voucher categories.
                </div>
              </div>

              <div className="analysis-summary">
                <div className="summary-row">
                  <span className="summary-label">Selected Dataset File</span>
                  <span className="summary-value">{status?.original_filename || "transactions.csv"}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Total Transactions Rows</span>
                  <span className="summary-value">{status?.row_count} rows</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Scoring Method</span>
                  <span className="summary-value">
                    {useML ? "Machine Learning Churn Prediction Model" : "Rule-Based RFM Segment Scoring"}
                  </span>
                </div>
                {status?.last_analyzed_at && (
                  <div className="summary-row">
                    <span className="summary-label">Last Successful Run</span>
                    <span className="summary-value">{new Date(status.last_analyzed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

              {analyzing && (
                <div className="panel" style={{ padding: 32, textAlign: "center", marginBottom: 20 }}>
                  <div className="spinner spinner-dark" style={{ width: 28, height: 28, marginBottom: 12 }} />
                  <div style={{ fontWeight: 500, fontSize: 14 }}>Analyzing transactional histories...</div>
                  <div style={{ color: "var(--ink-3)", fontSize: 12, marginTop: 6 }}>
                    Rebuilding RFM index tables, computing statistics, and compiling campaign groups.
                  </div>
                </div>
              )}

              {statsLoading && !stats && (
                <div className="panel" style={{ padding: 20, textAlign: "center", marginBottom: 20 }}>
                  <div className="spinner spinner-dark" style={{ marginRight: 8 }} />
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Loading results overview...</span>
                </div>
              )}

              {!analyzing && stats && (
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 11,
                      marginBottom: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--ink-3)",
                    }}
                  >
                    Analysis Summary Results
                  </div>
                  <div className="stat-grid">
                    <div className="stat">
                      <div className="stat-label">Scored Total</div>
                      <div className="stat-value">{stats.total}</div>
                      <div className="stat-sub">Customers evaluated</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">High Risk</div>
                      <div className="stat-value" style={{ color: "var(--risk-high)" }}>
                        {stats.high}
                      </div>
                      <div className="stat-sub">Requires outreach</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Medium Risk</div>
                      <div className="stat-value" style={{ color: "var(--risk-med)" }}>
                        {stats.medium}
                      </div>
                      <div className="stat-sub">Warning threshold</div>
                    </div>
                    <div className="stat">
                      <div className="stat-label">Low Risk</div>
                      <div className="stat-value" style={{ color: "var(--risk-low)" }}>
                        {stats.low}
                      </div>
                      <div className="stat-sub">Satisfied customers</div>
                    </div>
                  </div>
                </div>
              )}

              {analyzeResult && !analyzeResult.ok && (
                <div
                  style={{
                    marginBottom: 20,
                    padding: "10px 12px",
                    background: "var(--fail-bg)",
                    border: "1px solid oklch(0.88 0.04 25)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--fail)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>Analysis Error: </span>
                  {analyzeResult.message}
                </div>
              )}

              <div className="wizard-footer">
                <button className="btn" disabled={analyzing} onClick={() => setStep(2)}>
                  ← Back
                </button>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-accent" disabled={analyzing} onClick={handleAnalyze}>
                    {analyzing ? (
                      <>
                        <div className="spinner" style={{ marginRight: 6 }} />
                        Analyzing...
                      </>
                    ) : status?.last_analyzed_at ? (
                      "Recalculate Analysis"
                    ) : (
                      "Run Analysis"
                    )}
                  </button>
                  {status?.last_analyzed_at && !analyzing && (
                    <button className="btn btn-primary" onClick={() => onNavigate("at-risk")}>
                      View at-risk customers →
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
