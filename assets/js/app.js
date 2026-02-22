import { qs, setFlash } from "./ui.js";
import { listView } from "./views/listView.js";
import { statsView } from "./views/statsView.js";
import { formView } from "./views/formView.js";

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [path, queryStr] = raw.split("?");
  const query = new URLSearchParams(queryStr || "");
  return { path: path || "list", query };
}

async function route() {
  setFlash("");

  const { path, query } = parseHash();

  // Nav active state
  const navLinks = document.querySelectorAll("nav a");
  navLinks.forEach((a) => a.classList.remove("active"));

  if (path.startsWith("stats")) {
    const a = qs('nav a[href="#stats"]');
    if (a) a.classList.add("active");
    await statsView.render();
    return;
  }

  if (path.startsWith("add")) {
    const a = qs('nav a[href="#add"]');
    if (a) a.classList.add("active");
    await formView.render({ mode: "add" });
    return;
  }

  if (path.startsWith("edit/")) {
    const a = qs('nav a[href="#list"]');
    if (a) a.classList.add("active");
    const id = path.split("/")[1];
    await formView.render({ mode: "edit", id });
    return;
  }

  // Default: list
  const a = qs('nav a[href="#list"]');
  if (a) a.classList.add("active");
  await listView.render({ query });
}

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);