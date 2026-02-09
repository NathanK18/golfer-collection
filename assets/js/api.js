export const API_BASE = window.__API_BASE__ || "http://localhost:5050/api";

async function readJsonSafe(resp) {
  const text = await resp.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/**
 * Fetch JSON with consistent error handling.
 * Returns { ok: true, data } OR { ok: false, status, error, details }.
 */
export async function fetchJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const resp = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await readJsonSafe(resp);

  if (resp.ok) {
    return { ok: true, data: body };
  }

  // Backend errors should follow: { error: "...", details?: [...] }
  const error = body?.error || `Request failed (${resp.status})`;
  const details = body?.details || null;
  return { ok: false, status: resp.status, error, details };
}
