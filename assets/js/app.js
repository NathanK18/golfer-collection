import { setActiveNav } from "./ui.js";
import { renderListView } from "./views/listView.js";
import { renderFormView } from "./views/formView.js";
import { renderStatsView } from "./views/statsView.js";

const appRoot = document.getElementById("app");

// parse the current route from the URL
function parseRoute() {
  const hash = window.location.hash || "#list";
  const [path, queryString] = hash.split("?");
  const params = new URLSearchParams(queryString || "");

  return { hash, path, params };
}

function mount(node) {
  if (!appRoot) return;
  appRoot.innerHTML = "";
  appRoot.appendChild(node);
}

// main render function
function render() {
  const { hash, path, params } = parseRoute();
  setActiveNav(path);

  if (path === "#add") {
    mount(renderFormView({ mode: "add" }));
    return;
  }

  if (path === "#edit") {
    const id = params.get("id");
    mount(renderFormView({ mode: "edit", id }));
    return;
  }

  if (path === "#stats") {
    mount(renderStatsView());
    return;
  }

  // default to list 
  const page = Number(params.get("page") || 1);
  mount(renderListView({
    page: Number.isFinite(page) && page > 0 ? page : 1,
    onNavigateToEdit: (id) => {
      window.location.hash = `#edit?id=${encodeURIComponent(id)}`;
    }
  }));
}

// application bootstrap
function boot() {
  if (!window.location.hash) window.location.hash = "#list?page=1";
  render();

  window.addEventListener("hashchange", render);
}

boot();
