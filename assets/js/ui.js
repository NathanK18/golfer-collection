export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

export function htmlToEl(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function setFlash(message, type = "info") {
  const el = qs("#flash");
  if (!el) return;

  el.textContent = message || "";
  el.className = `flash ${type}`;
  el.style.display = message ? "block" : "none";
}

export function getCookie(name) {
  const parts = document.cookie.split(";").map((s) => s.trim());
  for (const p of parts) {
    if (!p) continue;
    const idx = p.indexOf("=");
    if (idx === -1) continue;
    const k = decodeURIComponent(p.slice(0, idx));
    const v = decodeURIComponent(p.slice(idx + 1));
    if (k === name) return v;
  }
  return null;
}

export function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${d.toUTCString()}`;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; ${expires}; path=/; SameSite=Lax`;
}