import { apiFetch, apiUpload, USE_MOCK, mockDelay } from "./client";

const REQUIRED_COLUMNS = [
  "customer_id",
  "phone_number",
  "created_at",
  "purchase_date",
  "order_value",
  "product_category",
];

export { REQUIRED_COLUMNS };

/**
 * GET /blast/dataset/status
 * Returns { exists: bool, last_modified: string | null }
 */
export async function getDatasetStatus() {
  if (USE_MOCK) {
    await mockDelay(200);
    return { exists: false, last_modified: null };
  }
  return apiFetch("/dataset/status");
}

/**
 * POST /blast/dataset/upload  (multipart/form-data, field: "file")
 * Returns { ok: true }
 */
export async function uploadDataset(file) {
  if (USE_MOCK) {
    await mockDelay(800);
    return { ok: true };
  }
  const form = new FormData();
  form.append("file", file);
  return apiUpload("/dataset/upload", form);
}

/**
 * POST /blast/dataset/analyze
 * Body: { ml_enabled: boolean }
 * Returns { ok: true } on success
 */
export async function analyzeDataset(useML) {
  if (USE_MOCK) {
    await mockDelay(800);
    return { ok: true };
  }
  return apiFetch("/dataset/analyze", {
    method: "POST",
    body: { ml_enabled: useML },
  });
}
