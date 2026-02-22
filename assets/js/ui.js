export function qs(sel, root = document) {
  return root.querySelector(sel);
}

export function qsa(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

/*
  Create an element quickly:
  el("div", { className: "card" }, "Hello")
  el("a", { href: "#list" }, "Back")
*/
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);

  for (const [k, v] of Object.entries(props || {})) {
    if (k === "style" && v && typeof v === "object") {
      Object.assign(node.style, v);
      continue;
    }
    if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
      continue;
    }
    if (k in node) {
      node[k] = v;
    } else {
      node.setAttribute(k, String(v));
    }
  }

  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) {
      child.forEach((c) => appendChild(node, c));
    } else {
      appendChild(node, child);
    }
  }

  return node;
}

function appendChild(parent, child) {
  if (child === null || child === undefined || child === false) return;
  if (child instanceof Node) {
    parent.appendChild(child);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

export function htmlToEl(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function setFlash(message, type = "info") {
  const elNode = qs("#flash");
  if (!elNode) return;

  elNode.textContent = message || "";
  elNode.className = `flash ${type}`;
  elNode.style.display = message ? "block" : "none";
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