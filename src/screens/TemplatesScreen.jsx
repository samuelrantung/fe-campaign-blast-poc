import { useState, useMemo } from "react";
import { Toolbar, Search, Select } from "../components/common/Controls";
import Modal from "../components/common/Modal";
import TemplateView from "../components/TemplateView";
import TemplateEditor from "../components/TemplateEditor";
import { useAsync } from "../hooks/useAsync";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  syncTemplates,
} from "../api";

const STATUS_CLS = {
  APPROVED: "badge-ok",
  PENDING: "badge-mute",
  REJECTED: "badge-fail",
  PAUSED: "badge-med",
  DISABLED: "badge-fail",
};

function TemplateStatus({ status }) {
  return (
    <span className={"badge " + (STATUS_CLS[status] || "badge-mute")}>
      <span className="dot" />
      {(status || "unknown").toLowerCase()}
    </span>
  );
}

export default function TemplatesScreen({ pushToast }) {
  const { data, reload } = useAsync(() => getTemplates(), []);
  const templates = data?.data || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mode, setMode] = useState("list"); // list | create | edit
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    let r = templates.slice();
    if (statusFilter !== "ALL") r = r.filter((t) => t.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((t) => t.name.toLowerCase().includes(q));
    }
    return r;
  }, [templates, search, statusFilter]);

  async function doSync() {
    setBusy(true);
    try {
      const res = await syncTemplates();
      pushToast(`Synced ${res.synced ?? ""} templates from Meta.`, "ok");
      reload();
    } catch (e) {
      pushToast(e.message || "Sync failed.", "fail");
    } finally {
      setBusy(false);
    }
  }

  async function doSave(payload, id) {
    setBusy(true);
    try {
      if (id) {
        await updateTemplate(id, payload);
        pushToast(`Template "${payload.name}" updated — pending review.`, "ok");
      } else {
        await createTemplate(payload);
        pushToast(`Template "${payload.name}" submitted for review.`, "ok");
      }
      setMode("list");
      setEditing(null);
      reload();
    } catch (e) {
      pushToast(e.message || "Save failed.", "fail");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await deleteTemplate(confirmDelete.id);
      pushToast(`Template "${confirmDelete.name}" deleted.`, "ok");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      pushToast(e.message || "Delete failed.", "fail");
    } finally {
      setBusy(false);
    }
  }

  // ── editor mode (create / edit) ──────────────────────────────────────────────
  if (mode === "create" || mode === "edit") {
    return (
      <div className="page">
        <div style={{ marginBottom: 14 }}>
          <button className="btn btn-sm btn-ghost" onClick={() => { setMode("list"); setEditing(null); }}>
            ← Back to templates
          </button>
        </div>
        <TemplateEditor
          initial={mode === "edit" ? editing : null}
          busy={busy}
          onCancel={() => { setMode("list"); setEditing(null); }}
          onSave={doSave}
        />
      </div>
    );
  }

  // ── list mode ─────────────────────────────────────────────────────────────────
  return (
    <div className="page">
      <Toolbar>
        <Search value={search} onChange={setSearch} placeholder="Search template name…" />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "ALL", label: "Status: All" },
            { value: "APPROVED", label: "Approved" },
            { value: "PENDING", label: "Pending" },
            { value: "REJECTED", label: "Rejected" },
          ]}
        />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={doSync} disabled={busy}>↻ Sync from Meta</button>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setMode("create"); }}>+ New template</button>
      </Toolbar>

      <div className="panel">
        <table className="dt">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Language</th>
              <th>Status</th>
              <th>Quality</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)" }}>{t.id}</div>
                </td>
                <td style={{ color: "var(--ink-3)" }}>{t.category}</td>
                <td className="mono" style={{ fontSize: 12 }}>{t.language}</td>
                <td><TemplateStatus status={t.status} /></td>
                <td style={{ color: "var(--ink-3)", fontSize: 12 }}>{t.quality_score?.score || "—"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setViewing(t)}>View</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => { setEditing(t); setMode("edit"); }}>Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(t)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty">No templates match.</div>}
      </div>

      {/* view */}
      <Modal
        wide
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
        sub={viewing ? `${viewing.category} · ${viewing.language} · ${viewing.status}` : ""}
        footer={<button className="btn" onClick={() => setViewing(null)}>Close</button>}
      >
        {viewing && <TemplateView template={viewing} />}
      </Modal>

      {/* delete confirm */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete template?"
        sub={confirmDelete?.name}
        footer={
          <>
            <button className="btn" onClick={() => setConfirmDelete(null)} disabled={busy}>Cancel</button>
            <button className="btn btn-danger" onClick={doDelete} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button>
          </>
        }
      >
        <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
          This permanently deletes <span className="mono">{confirmDelete?.name}</span> from your WhatsApp Business Account. This can't be undone.
        </div>
      </Modal>
    </div>
  );
}
