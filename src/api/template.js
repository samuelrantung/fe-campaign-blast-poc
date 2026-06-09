// ── Templates API ──────────────────────────────────────────────────────────
// CRUD + sync against the backend's Meta-backed template cache.
//
//   GET    /templates            list (from local cache)
//   GET    /templates/{id}       read one
//   POST   /templates            create (forwarded to Meta verbatim)
//   POST   /templates/{id}       update
//   DELETE /templates/{id}       delete
//   POST   /templates/sync       force-refresh cache from Meta
//
// While USE_MOCK is on, a module-level array stands in for the backend so the
// UI's create/edit/delete feel real without a server.
import { apiFetch, apiUpload, USE_MOCK, mockDelay } from "./client";

// ── Mock store ───────────────────────────────────────────────────────────────
let _mockTemplates = [
  {
    id: "2422324241527654",
    name: "reengagement_promo",
    status: "APPROVED",
    language: "en",
    category: "MARKETING",
    sub_category: "CUSTOM",
    components: [
      {
        type: "BODY",
        text: "Hi {{name}}, we miss you!\n\nIt's been a while since your last visit.\nHere's a personal offer just for you: \n{{promo_value}}.\n\nUse code {{promo_code}} — valid for {{expiry_days}} days.\n\nSee you soon!\n\n_To unsubscribe from promotional messages, reply *STOP* at any time_",
        example: {
          body_text_named_params: [
            { param_name: "name", example: "Samuel" },
            { param_name: "promo_value", example: "20% off your next order" },
            { param_name: "promo_code", example: "BACK20" },
            { param_name: "expiry_days", example: "30" },
          ],
        },
      },
    ],
    quality_score: { score: "UNKNOWN", date: 1779171687 },
    rejected_reason: "NONE",
  },
  {
    id: "1720417235612044",
    name: "hello_world",
    status: "APPROVED",
    language: "en_US",
    category: "UTILITY",
    components: [
      { type: "HEADER", format: "TEXT", text: "Hello World" },
      {
        type: "BODY",
        text: "Welcome and congratulations!! This message demonstrates your ability to send a WhatsApp message notification from the Cloud API, hosted by Meta. Thank you for taking the time to test with us.",
      },
      { type: "FOOTER", text: "WhatsApp Business Platform sample message" },
    ],
    quality_score: { score: "UNKNOWN", date: 1778993530 },
    rejected_reason: "NONE",
  },
];

const _genId = () => String(Math.floor(Math.random() * 9e15 + 1e15));

/**
 * List templates.
 * @param {{name?:string,status?:string,language?:string,limit?:number}} [params]
 * @returns {Promise<{data: object[]}>}
 */
export async function getTemplates(params) {
  if (USE_MOCK) {
    await mockDelay(200);
    let data = _mockTemplates.slice();
    if (params?.name) data = data.filter((t) => t.name === params.name);
    if (params?.status) data = data.filter((t) => t.status === params.status);
    if (params?.language) data = data.filter((t) => t.language === params.language);
    return { data };
  }
  return apiFetch("/templates", { params });
}

/** Read one template by id. */
export async function getTemplate(id) {
  if (USE_MOCK) {
    await mockDelay(150);
    return _mockTemplates.find((t) => t.id === id) || null;
  }
  return apiFetch(`/templates/${encodeURIComponent(id)}`);
}

/**
 * Create a template. `payload` is the Meta create body
 * ({ name, language, category, components }).
 */
export async function createTemplate(payload) {
  if (USE_MOCK) {
    await mockDelay(400);
    const created = {
      id: _genId(),
      status: "PENDING",
      rejected_reason: "NONE",
      quality_score: { score: "UNKNOWN" },
      ...payload,
    };
    _mockTemplates = [created, ..._mockTemplates];
    return created;
  }
  return apiFetch("/templates", { method: "POST", body: payload });
}

/** Update an existing template (Meta uses POST for edits). */
export async function updateTemplate(id, payload) {
  if (USE_MOCK) {
    await mockDelay(400);
    _mockTemplates = _mockTemplates.map((t) =>
      t.id === id ? { ...t, ...payload, status: "PENDING" } : t,
    );
    return { success: true };
  }
  return apiFetch(`/templates/${encodeURIComponent(id)}`, {
    method: "POST",
    body: payload,
  });
}

/** Delete a template by id. */
export async function deleteTemplate(id) {
  if (USE_MOCK) {
    await mockDelay(300);
    _mockTemplates = _mockTemplates.filter((t) => t.id !== id);
    return { success: true };
  }
  return apiFetch(`/templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Force the backend to re-pull every template from Meta. */
export async function syncTemplates() {
  if (USE_MOCK) {
    await mockDelay(500);
    return { synced: _mockTemplates.length };
  }
  return apiFetch("/templates/sync", { method: "POST" });
}

/**
 * Upload header media (image/video/document) and get back a Meta media handle.
 * The handle goes into a HEADER component's example.header_handle on create.
 * @param {File} file
 * @returns {Promise<{h: string}>}
 */
export async function uploadTemplateMedia(file) {
  if (USE_MOCK) {
    await mockDelay(500);
    return { h: "mock:" + file.name };
  }
  const form = new FormData();
  form.append("file", file);
  return apiUpload("/templates/upload-media", form);
}
