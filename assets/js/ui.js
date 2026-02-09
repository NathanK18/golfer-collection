// UI helper utilities used across views.

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  // apply attributes/props
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "style") node.setAttribute("style", v);
    else if (k === "onclick" && typeof v === "function") node.addEventListener("click", v);
    else if (v === false || v === null || v === undefined) {
      // skip
    } else if (k in node) {
      try { node[k] = v; } catch { node.setAttribute(k, String(v)); }
    } else {
      node.setAttribute(k, String(v));
    }
  }

  // append children
  for (const c of children) {
    if (c === null || c === undefined) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

export function setTitle(text) {
  const h2 = document.getElementById("view-title");
  if (h2) h2.textContent = text;
}

export function setPanelActions(node) {
  const slot = document.getElementById("panel-actions");
  if (!slot) return;
  slot.innerHTML = "";
  if (node) slot.appendChild(node);
}

export function setActiveNav(path) {
  const links = [
    { id: "nav-list", match: "#list" },
    { id: "nav-add", match: "#add" },
    { id: "nav-stats", match: "#stats" },
  ];
  for (const { id, match } of links) {
    const a = document.getElementById(id);
    if (!a) continue;
    a.classList.toggle("active", path === match);
  }
}

export function formatNumber(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return x.toLocaleString();
}

/** Simple toast notifications */
export function toast({ title, message, variant = "default" }) {
  const region = document.getElementById("toast-region");
  if (!region) return;

  const box = el("div", { class: `toast toast-${variant}` }, [
    el("div", { class: "toast-title" }, [title]),
    el("div", { class: "toast-message" }, [message]),
  ]);

  region.appendChild(box);
  setTimeout(() => box.classList.add("show"), 10);
  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 200);
  }, 2600);
}

/** Confirmation modal used for deletes. Returns Promise<boolean>. */
export function confirmModal({ title, message, confirmText = "Confirm" }) {
  const overlay = document.getElementById("modal-overlay");
  const t = document.getElementById("modal-title");
  const msg = document.getElementById("modal-message");
  const btnCancel = document.getElementById("modal-cancel");
  const btnConfirm = document.getElementById("modal-confirm");

  if (!overlay || !t || !msg || !btnCancel || !btnConfirm) {
    return Promise.resolve(window.confirm(message));
  }

  t.textContent = title;
  msg.textContent = message;
  btnConfirm.textContent = confirmText;

  overlay.classList.remove("hidden");

  return new Promise((resolve) => {
    const cleanup = () => {
      overlay.classList.add("hidden");
      btnCancel.removeEventListener("click", onCancel);
      btnConfirm.removeEventListener("click", onConfirm);
      overlay.removeEventListener("click", onOverlay);
      document.removeEventListener("keydown", onKey);
    };

    const onCancel = () => { cleanup(); resolve(false); };
    const onConfirm = () => { cleanup(); resolve(true); };
    const onOverlay = (e) => { if (e.target === overlay) onCancel(); };
    const onKey = (e) => { if (e.key === "Escape") onCancel(); };

    btnCancel.addEventListener("click", onCancel);
    btnConfirm.addEventListener("click", onConfirm);
    overlay.addEventListener("click", onOverlay);
    document.addEventListener("keydown", onKey);
  });
}
