import { useMemo, useState } from "react";
import { Select } from "./common/Controls";
import { uploadTemplateMedia } from "../api";

// ── helpers ──────────────────────────────────────────────────────────────────
const VAR_RE = /\{\{(\w+)\}\}/g;

/** Distinct {{tokens}} in order of first appearance. */
export function findVars(text) {
  const seen = [];
  let m;
  VAR_RE.lastIndex = 0;
  while ((m = VAR_RE.exec(text || ""))) if (!seen.includes(m[1])) seen.push(m[1]);
  return seen;
}


/** Render WhatsApp inline formatting: *bold*, _italic_, ~strikethrough~. */
function formatWhatsApp(text) {
  if (!text) return text;
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;
  const out = [];
  let last = 0;
  let m;
  let key = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const inner = formatWhatsApp(tok.slice(1, -1)); // recurse for nested formatting
    if (tok.startsWith("*")) out.push(<strong key={key++}>{inner}</strong>);
    else if (tok.startsWith("_")) out.push(<em key={key++}>{inner}</em>);
    else out.push(<s key={key++}>{inner}</s>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Parse an existing Meta template's components into editor/preview state. */
export function parseTemplate(initial) {
  const get = (t) => initial?.components?.find((c) => c.type === t);
  const h = get("HEADER");
  const b = get("BODY");
  const f = get("FOOTER");
  const btns = get("BUTTONS");
  const lto = get("LIMITED_TIME_OFFER");

  // Body examples → { token: exampleValue }
  const bodyExamples = {};
  const named = b?.example?.body_text_named_params;
  const positional = b?.example?.body_text?.[0];
  if (named) named.forEach((p) => (bodyExamples[p.param_name] = p.example));
  else if (positional) positional.forEach((v, i) => (bodyExamples[String(i + 1)] = v));

  return {
    name: initial?.name || "",
    category: initial?.category || "MARKETING",
    language: initial?.language || "en",
    paramFormat: initial?.parameter_format || "NAMED",
    header: h
      ? {
          format: h.format || "TEXT",
          text: h.text || "",
          mediaHandle: h.example?.header_handle?.[0] || "",
          mediaName: "",
        }
      : null,
    body: { text: b?.text || "", examples: bodyExamples },
    footer: f ? { text: f.text || "" } : null,
    // Meta returns button `example` as an array (e.g. ["BACK20"]); flatten to a
    // string so the editor's inputs and validation can treat it uniformly.
    buttons: (btns?.buttons || []).map((x) => ({
      ...x,
      example: Array.isArray(x.example) ? (x.example[0] ?? "") : x.example,
    })),
    lto: lto
      ? { text: lto.limited_time_offer?.text || "", has_expiration: !!lto.limited_time_offer?.has_expiration }
      : null,
  };
}

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const HEADER_FORMATS = ["TEXT", "IMAGE", "VIDEO", "DOCUMENT"];
const BUTTON_TYPES = ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"];

// ── component ─────────────────────────────────────────────────────────────────
export default function TemplateEditor({ initial, onCancel, onSave, busy }) {
  const editing = !!initial;
  const init = useMemo(() => parseTemplate(initial), [initial]);

  const [name, setName] = useState(init.name);
  const [category, setCategory] = useState(init.category);
  const [language, setLanguage] = useState(init.language);
  const [paramFormat, setParamFormat] = useState(init.paramFormat);
  const [header, setHeader] = useState(init.header);
  const [body, setBody] = useState(init.body);
  const [footer, setFooter] = useState(init.footer);
  const [buttons, setButtons] = useState(init.buttons);
  const [lto, setLto] = useState(init.lto);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleMediaUpload(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { h } = await uploadTemplateMedia(file);
      setHeader((hd) => ({ ...hd, mediaHandle: h, mediaName: file.name }));
    } catch (e) {
      setError(e.message || "Media upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const bodyVars = useMemo(() => findVars(body.text), [body.text]);

  function setBodyExample(token, value) {
    setBody((b) => ({ ...b, examples: { ...b.examples, [token]: value } }));
  }

  function addButton() {
    setButtons((bs) => [...bs, { type: "QUICK_REPLY", text: "" }]);
  }
  function updateButton(i, patch) {
    setButtons((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function removeButton(i) {
    setButtons((bs) => bs.filter((_, idx) => idx !== i));
  }

  // ── payload assembly (Meta create/update body) ──────────────────────────────
  function buildPayload() {
    const components = [];

    if (header) {
      if (header.format === "TEXT") {
        const c = { type: "HEADER", format: "TEXT", text: header.text };
        const hv = findVars(header.text);
        if (hv.length) c.example = { header_text: [hv.map((v) => `sample ${v}`)] };
        components.push(c);
      } else {
        const c = { type: "HEADER", format: header.format };
        // Only send a handle if one was uploaded — on edit without a new file,
        // omit it so the existing media is kept.
        if (header.mediaHandle) c.example = { header_handle: [header.mediaHandle] };
        components.push(c);
      }
    }

    if (lto) {
      components.push({
        type: "LIMITED_TIME_OFFER",
        limited_time_offer: { text: lto.text, has_expiration: lto.has_expiration },
      });
    }

    const bodyComp = { type: "BODY", text: body.text };
    if (bodyVars.length) {
      if (paramFormat === "POSITIONAL") {
        const ordered = bodyVars.slice().sort((a, b) => +a - +b);
        bodyComp.example = { body_text: [ordered.map((v) => body.examples[v] || "")] };
      } else {
        bodyComp.example = {
          body_text_named_params: bodyVars.map((v) => ({
            param_name: v,
            example: body.examples[v] || "",
          })),
        };
      }
    }
    components.push(bodyComp);

    if (footer) components.push({ type: "FOOTER", text: footer.text });

    if (buttons.length) {
      components.push({
        type: "BUTTONS",
        buttons: buttons.map((b) => {
          if (b.type === "URL") return { type: "URL", text: b.text, url: b.url || "" };
          if (b.type === "PHONE_NUMBER")
            return { type: "PHONE_NUMBER", text: b.text, phone_number: b.phone_number || "" };
          if (b.type === "COPY_CODE") return { type: "COPY_CODE", example: b.example || "" };
          return { type: "QUICK_REPLY", text: b.text };
        }),
      });
    }

    return { name, category, language, parameter_format: paramFormat, components };
  }

  function validate() {
    if (!name.trim()) return "Template name is required.";
    if (!/^[a-z0-9_]+$/.test(name)) return "Name may only use lowercase letters, numbers and underscores.";
    if (!body.text.trim()) return "Body text is required.";
    if (bodyVars.length) {
      if (paramFormat === "POSITIONAL" && !bodyVars.every((v) => /^\d+$/.test(v)))
        return "Numbered format requires variables like {{1}}, {{2}} — not names.";
      if (paramFormat === "NAMED" && bodyVars.some((v) => /^\d+$/.test(v)))
        return "Named format requires variables like {{name}} — not numbers.";
    }
    // On create, a media header needs an uploaded sample. On edit, Meta never
    // returns the existing handle, so only require one if the user re-uploaded.
    if (!editing && header && header.format !== "TEXT" && !header.mediaHandle.trim())
      return "Upload a sample file for the media header.";
    for (const b of buttons) {
      if (b.type === "URL" && !b.url?.trim()) return "URL buttons need a URL.";
      if (b.type === "PHONE_NUMBER" && !b.phone_number?.trim()) return "Phone buttons need a number.";
      if (b.type === "COPY_CODE" && !b.example?.trim()) return "Copy-code buttons need a sample code.";
      if ((b.type === "QUICK_REPLY" || b.type === "URL" || b.type === "PHONE_NUMBER") && !b.text?.trim())
        return "Every button needs a label.";
    }
    return "";
  }

  function submit() {
    const err = validate();
    if (err) return setError(err);
    setError("");
    onSave(buildPayload(), initial?.id);
  }

  return (
    <div className="split">
      {/* ── form ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div style={{ border: "1px solid var(--fail)", background: "var(--fail-bg)", borderRadius: 6, padding: "10px 12px", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* basics */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Template details</div>
          </div>
          <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">Name</label>
              <input
                className="input mono"
                placeholder="reengagement_promo"
                value={name}
                disabled={editing}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              />
              {editing && <div className="hint">Name and language can't be changed after creation.</div>}
            </div>
            <div>
              <label className="label">Category</label>
              <Select value={category} onChange={setCategory} options={CATEGORIES} style={{ width: "100%" }} />
            </div>
            <div>
              <label className="label">Language</label>
              <input className="input mono" placeholder="en" value={language} disabled={editing} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="label">Variable format</label>
              <Select
                value={paramFormat}
                onChange={setParamFormat}
                disabled={editing}
                options={[
                  { value: "NAMED", label: "Named — {{name}}" },
                  { value: "POSITIONAL", label: "Numbered — {{1}}" },
                ]}
                style={{ width: "100%" }}
              />
              <div className="hint">
                {paramFormat === "POSITIONAL"
                  ? "Body variables must be whole numbers: {{1}}, {{2}}."
                  : "Body variables use names: {{name}}, {{promo_value}}."}
                {editing && " Can't be changed after creation."}
              </div>
            </div>
          </div>
        </div>

        {/* header */}
        <ComponentCard
          title="Header"
          sub="Optional · text or media"
          present={!!header}
          onAdd={() => setHeader({ format: "TEXT", text: "", mediaUrl: "" })}
          onRemove={() => setHeader(null)}
        >
          {header && (
            <>
              <label className="label">Format</label>
              <Select value={header.format} onChange={(f) => setHeader((h) => ({ ...h, format: f }))} options={HEADER_FORMATS} style={{ width: "100%" }} />
              {header.format === "TEXT" ? (
                <div style={{ marginTop: 10 }}>
                  <label className="label">Header text</label>
                  <input className="input" placeholder="Up to 60 characters" maxLength={60} value={header.text} onChange={(e) => setHeader((h) => ({ ...h, text: e.target.value }))} />
                </div>
              ) : (
                <div style={{ marginTop: 10 }}>
                  <label className="label">Sample {header.format.toLowerCase()}</label>
                  <input
                    type="file"
                    className="input"
                    accept={header.format === "IMAGE" ? "image/*" : header.format === "VIDEO" ? "video/*" : undefined}
                    disabled={uploading}
                    onChange={(e) => handleMediaUpload(e.target.files)}
                  />
                  {uploading && <div className="hint">Uploading to Meta…</div>}
                  {!uploading && header.mediaHandle && (
                    <div className="hint" style={{ color: "var(--ok)" }}>
                      ✓ Uploaded{header.mediaName ? `: ${header.mediaName}` : ""} — handle ready.
                    </div>
                  )}
                  <div className="hint">
                    {editing
                      ? "Existing media is kept unless you upload a new file (Meta doesn't expose the current one)."
                      : "Meta needs a sample file to approve a media header. The upload returns a handle used at creation."}
                  </div>
                </div>
              )}
            </>
          )}
        </ComponentCard>

        {/* body */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">Body <span style={{ color: "var(--fail)" }}>*</span></div>
          </div>
          <div style={{ padding: 16 }}>
            <textarea
              className="input"
              style={{ minHeight: 140, resize: "vertical", fontFamily: "inherit" }}
              placeholder={"Hi {{name}}, here's {{offer}} just for you."}
              value={body.text}
              onChange={(e) => setBody((b) => ({ ...b, text: e.target.value }))}
            />
            <div className="hint">
              Use <span className="mono">{"{{name}}"}</span> for named variables or <span className="mono">{"{{1}}"}</span> for positional.
            </div>
            {bodyVars.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label className="label">Sample values (for Meta review)</label>
                <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 10px", alignItems: "center" }}>
                  {bodyVars.map((v) => (
                    <FragmentRow key={v} token={v} value={body.examples[v] || ""} onChange={(val) => setBodyExample(v, val)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <ComponentCard
          title="Footer"
          sub="Optional · short tagline"
          present={!!footer}
          disabledReason={lto ? "Not allowed alongside a limited-time offer" : ""}
          onAdd={() => setFooter({ text: "" })}
          onRemove={() => setFooter(null)}
        >
          {footer && (
            <input className="input" placeholder="Up to 60 characters" maxLength={60} value={footer.text} onChange={(e) => setFooter({ text: e.target.value })} />
          )}
        </ComponentCard>

        {/* limited time offer */}
        <ComponentCard
          title="Limited-time offer"
          sub="Marketing only · countdown + copy code"
          present={!!lto}
          disabledReason={category !== "MARKETING" ? "Requires MARKETING category" : footer ? "Not allowed alongside a footer" : ""}
          onAdd={() => setLto({ text: "", has_expiration: true })}
          onRemove={() => setLto(null)}
        >
          {lto && (
            <>
              <label className="label">Offer label</label>
              <input className="input" placeholder="Limited offer!" maxLength={16} value={lto.text} onChange={(e) => setLto((l) => ({ ...l, text: e.target.value }))} />
              <label className="checkrow" style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 13 }}>
                <input type="checkbox" checked={lto.has_expiration} onChange={(e) => setLto((l) => ({ ...l, has_expiration: e.target.checked }))} />
                Show countdown timer (expiration set at send time)
              </label>
              <div className="hint">A copy-code button is required and must be the first button.</div>
            </>
          )}
        </ComponentCard>

        {/* buttons */}
        <div className="panel">
          <div className="panel-header">
            <div><div className="panel-title">Buttons</div><div className="panel-sub">Up to 10 · quick reply, URL, phone, copy code</div></div>
            <button className="btn btn-sm" onClick={addButton} disabled={buttons.length >= 10}>+ Add button</button>
          </div>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {buttons.length === 0 && <div className="empty" style={{ padding: 8 }}>No buttons.</div>}
            {buttons.map((b, i) => (
              <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10, display: "grid", gridTemplateColumns: "150px 1fr auto", gap: 8, alignItems: "center" }}>
                <Select value={b.type} onChange={(t) => updateButton(i, { type: t })} options={BUTTON_TYPES} style={{ width: "100%" }} />
                {b.type === "COPY_CODE" ? (
                  <input className="input mono" placeholder="SAMPLE CODE" value={b.example || ""} onChange={(e) => updateButton(i, { example: e.target.value })} />
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="input" placeholder="Button label" value={b.text || ""} onChange={(e) => updateButton(i, { text: e.target.value })} />
                    {b.type === "URL" && <input className="input" placeholder="https://…" value={b.url || ""} onChange={(e) => updateButton(i, { url: e.target.value })} />}
                    {b.type === "PHONE_NUMBER" && <input className="input mono" placeholder="+62…" value={b.phone_number || ""} onChange={(e) => updateButton(i, { phone_number: e.target.value })} />}
                  </div>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => removeButton(i)}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
          {error && <span style={{ color: "var(--fail)", fontSize: 13, marginRight: "auto" }}>{error}</span>}
          <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={busy || uploading}>
            {busy ? "Saving…" : editing ? "Save changes" : "Submit for review"}
          </button>
        </div>
      </div>

      {/* ── live preview ─────────────────────────────────────────────────────── */}
      <div className="panel" style={{ position: "sticky", top: 16, alignSelf: "start" }}>
        <div className="panel-header"><div className="panel-title">Preview</div></div>
        <div style={{ padding: 16 }}>
          <TemplatePreview name={name} category={category} language={language} header={header} body={body} footer={footer} buttons={buttons} lto={lto} />
        </div>
      </div>
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────
function FragmentRow({ token, value, onChange }) {
  return (
    <>
      <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{`{{${token}}}`}</span>
      <input className="input" placeholder={`example for ${token}`} value={value} onChange={(e) => onChange(e.target.value)} />
    </>
  );
}

function ComponentCard({ title, sub, present, onAdd, onRemove, disabledReason, children }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div><div className="panel-title">{title}</div>{sub && <div className="panel-sub">{sub}</div>}</div>
        {present ? (
          <button className="btn btn-sm btn-ghost" onClick={onRemove}>Remove</button>
        ) : (
          <button className="btn btn-sm" onClick={onAdd} disabled={!!disabledReason} title={disabledReason}>+ Add</button>
        )}
      </div>
      {present && <div style={{ padding: 16 }}>{children}</div>}
      {!present && disabledReason && <div className="hint" style={{ padding: "0 16px 12px" }}>{disabledReason}.</div>}
    </div>
  );
}

export function TemplatePreview({ name, category, language, header, body, footer, buttons, lto }) {
  const fill = (text) => (text || "").replace(VAR_RE, (_, k) => body.examples?.[k] || `{{${k}}}`);
  const offerCode = buttons.find((b) => b.type === "COPY_CODE")?.example;
  return (
    <div className="msg-preview">
      <div className="msg-channel">{name || "template"} · {language} · {category}</div>
      <div className="msg-bubble">
        {header && header.format === "TEXT" && header.text && (
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{fill(header.text)}</div>
        )}
        {header && header.format === "IMAGE" && /^https?:\/\//.test(header.mediaHandle || "") && (
          <img src={header.mediaHandle} alt="" style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: 4, marginBottom: 6 }} />
        )}
        {header && header.format !== "TEXT" && !(header.format === "IMAGE" && /^https?:\/\//.test(header.mediaHandle || "")) && (
          <div style={{ background: "var(--panel-2)", border: "1px dashed var(--line)", borderRadius: 4, padding: "18px 0", textAlign: "center", color: "var(--ink-4)", fontSize: 12, marginBottom: 6 }}>
            {header.mediaName ? `📎 ${header.mediaName}` : `${header.format} attachment`}
          </div>
        )}
        {lto && (
          <div style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8, marginBottom: 8, fontSize: 11, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600 }}>{lto.text || "Your offer"}</div>
            {lto.has_expiration && <div style={{ color: "var(--ink-4)" }}>Offer ends soon</div>}
            {offerCode && <div style={{ color: "var(--ink-3)" }}>Code {offerCode}</div>}
          </div>
        )}
        <div className="msg-body" style={{ whiteSpace: "pre-wrap" }}>{body.text ? formatWhatsApp(fill(body.text)) : <span style={{ color: "var(--ink-4)" }}>Body preview…</span>}</div>
        {footer && footer.text && <div className="msg-footer" style={{ color: "var(--ink-4)", fontSize: 12, marginTop: 6 }}>{footer.text}</div>}
      </div>
      {buttons.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, maxWidth: 320 }}>
          {buttons.map((b, i) => (
            <div key={i} style={{ background: "white", border: "1px solid var(--line)", borderRadius: 6, padding: "8px 0", textAlign: "center", color: "var(--accent)", fontSize: 13, fontWeight: 500 }}>
              {b.type === "URL" && "🔗 "}
              {b.type === "PHONE_NUMBER" && "📞 "}
              {b.type === "COPY_CODE" ? "📋 Copy code" : b.text || b.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
