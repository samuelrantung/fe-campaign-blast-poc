import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useAsync } from "../hooks/useAsync";
import {
  getDatasetStatus,
  uploadDataset,
  analyzeDataset,
  REQUIRED_COLUMNS,
} from "../api";

function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([REQUIRED_COLUMNS]);
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, "transactions_template.xlsx");
}

function validateColumns(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const firstLine = e.target.result.split("\n")[0] || "";
      const cols = firstLine
        .trim()
        .split(/[,]/)
        .map((c) => c.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter((r) => !cols.includes(r));
      if (missing.length > 0) {
        reject(new Error(`Missing columns: ${missing.join(", ")}`));
      } else {
        resolve();
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export default function DatasetScreen({ onNavigate }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadDone, setUploadDone] = useState(false);
  const [statusKey, setStatusKey] = useState(0);
  const [useML, setUseML] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState(null);

  const { data: status, loading: statusLoading } = useAsync(
    () => getDatasetStatus(),
    [statusKey, analyzeResult],
  );

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploadError(null);
    setUploadDone(false);
    setAnalyzeResult(null);

    if (!file.name.endsWith(".csv")) {
      setUploadError("Only .csv files are accepted.");
      e.target.value = "";
      return;
    }

    try {
      await validateColumns(file);
    } catch (err) {
      setUploadError(err.message);
      e.target.value = "";
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
      e.target.value = "";
    }
  }

  const hasDataset = status?.status === "ready";
  const isAnalyzed = !!status?.last_analyzed_at;

  return (
    <div className="page" style={{ maxWidth: 600 }}>
      {/* ── Download Template ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">XLSX Template</div>
            <div className="panel-sub">
              Download the template to see the required column format.
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={downloadTemplate}>
            Download template
          </button>
        </div>
        <div
          style={{ padding: "10px 16px", borderTop: "1px solid var(--line-2)" }}
        >
          <span
            className="label"
            style={{ display: "inline", marginBottom: 0 }}
          >
            Required columns:
          </span>{" "}
          <span
            style={{
              fontSize: 12,
              color: "var(--ink-3)",
              fontFamily: "JetBrains Mono, ui-monospace, monospace",
            }}
          >
            {REQUIRED_COLUMNS.join(", ")}
          </span>
        </div>
      </div>

      {/* ── Upload ── */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <div className="panel-title">Upload transactions.csv</div>
            <div className="panel-sub">
              Replaces the current dataset. All required columns must be
              present.
            </div>
          </div>
        </div>
        <div style={{ padding: "16px" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <button
            className="btn btn-primary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Choose CSV file"}
          </button>

          {uploadError && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--fail-bg)",
                border: "1px solid oklch(0.88 0.04 25)",
                borderRadius: "var(--radius-sm)",
                color: "var(--fail)",
                fontSize: 12,
              }}
            >
              {uploadError}
            </div>
          )}

          {uploadDone && !uploadError && (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                background: "var(--ok-bg)",
                border: "1px solid oklch(0.88 0.04 155)",
                borderRadius: "var(--radius-sm)",
                color: "var(--ok)",
                fontSize: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>Dataset saved successfully.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dataset Status ── */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">Dataset status</div>
        </div>
        <div style={{ padding: "14px 16px" }}>
          {statusLoading ? (
            <span style={{ color: "var(--ink-4)", fontSize: 13 }}>
              Checking…
            </span>
          ) : hasDataset ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div>
                <div
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}
                >
                  {status.original_filename}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
                >
                  Last analyzed:{" "}
                  {isAnalyzed
                    ? new Date(status.last_analyzed_at).toLocaleString()
                    : "not yet"}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
                >
                  Last uploaded:{" "}
                  {new Date(status.last_uploaded).toLocaleString()}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
                >
                  Transactions count: {status.row_count}
                </div>
                {isAnalyzed && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    Analyzed customer: {status.analyzed_customer_count}
                  </div>
                )}

                {isAnalyzed && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    Machine learning: {status.ml_enabled ? "Yes" : "No"}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--ink-4)",
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13, color: "var(--ink-3)" }}>
                No dataset uploaded yet.
              </span>
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginTop: 10,
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                color: "var(--ink-3)",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={useML}
                onChange={(e) => setUseML(e.target.checked)}
              />
              Use ML
            </label>
            <button
              className="btn"
              disabled={analyzing}
              onClick={async () => {
                setAnalyzing(true);
                setAnalyzeResult(null);
                try {
                  await analyzeDataset(useML);
                  setAnalyzeResult({ ok: true });
                } catch (err) {
                  setAnalyzeResult({
                    ok: false,
                    message: err.message || "Analysis failed.",
                  });
                } finally {
                  setAnalyzing(false);
                }
              }}
            >
              {analyzing ? "Analyzing…" : "Analyze"}
            </button>
            {analyzeResult && (
              <span
                style={{
                  color: analyzeResult.ok ? "var(--ok)" : "var(--fail)",
                }}
              >
                {analyzeResult.ok
                  ? "Analysis complete."
                  : analyzeResult.message}
              </span>
            )}
          </div>
          {isAnalyzed && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 10 }}
              onClick={() => onNavigate("at-risk")}
            >
              View at-risk customers →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
