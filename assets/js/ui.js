export function setActiveNav(hash) {
  const links = [
    { id: "nav-list", hash: "#list" },
    { id: "nav-add", hash: "#add" },
    { id: "nav-stats", hash: "#stats" },
  ];
  for (const l of links) {
    const el = document.getElementById(l.id);
    if (!el) continue;
    el.classList.toggle("active", hash.startsWith(l.hash));
  }
}

// sets the view title
export function setTitle(title) {
  const el = document.getElementById("view-title");
  if (el) el.textContent = title;
}

// sets the panel actions area
export function setPanelActions(nodeOrNull) {
  const wrap = document.getElementById("panel-actions");
  if (!wrap) return;
  wrap.innerHTML = "";
  if (nodeOrNull) wrap.appendChild(nodeOrNull);
}

export function toast({ title, message, variant = "success" }) {
  const region = document.getElementById("toast-region");
  if (!region) return;

  const el = document.createElement("div");
  el.className = `toast ${variant}`;
  el.innerHTML = `<strong>${escapeHtml(title)}</strong><div>${escapeHtml(message)}</div>`;

  region.appendChild(el);
  window.setTimeout(() => el.remove(), 2600);
}

// conform modal 
export function confirmModal({ title, message, confirmText = "Delete" }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modal-overlay");
    const titleEl = document.getElementById("modal-title");
    const msgEl = document.getElementById("modal-message");
    const btnCancel = document.getElementById("modal-cancel");
    const btnConfirm = document.getElementById("modal-confirm");

    if (!overlay || !titleEl || !msgEl || !btnCancel || !btnConfirm) {
      resolve(window.confirm(message));
      return;
    }

    titleEl.textContent = title;
    msgEl.textContent = message;
    btnConfirm.textContent = confirmText;

    const cleanup = (value) => {
      overlay.classList.add("hidden");
      btnCancel.removeEventListener("click", onCancel);
      btnConfirm.removeEventListener("click", onConfirm);
      overlay.removeEventListener("click", onOverlayClick);
      document.removeEventListener("keydown", onKey);
      resolve(value);
    };

    const onCancel = () => cleanup(false);
    const onConfirm = () => cleanup(true);
    const onOverlayClick = (e) => { if (e.target === overlay) cleanup(false); };
    const onKey = (e) => { if (e.key === "Escape") cleanup(false); };

    btnCancel.addEventListener("click", onCancel);
    btnConfirm.addEventListener("click", onConfirm);
    overlay.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKey);

    overlay.classList.remove("hidden");
    btnConfirm.focus();
  });
}

// creates element with attributs and children
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (typeof c === "string") node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

// escapes HTML special characters
export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatNumber(n) {
  return new Intl.NumberFormat().format(n);
}
