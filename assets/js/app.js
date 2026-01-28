import { seedIfNeeded } from "./seed.js";
import { setActiveNav, toast } from "./ui.js";
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
  mount(renderListView({
    onNavigateToEdit: (id) => {
      window.location.hash = `#edit?id=${encodeURIComponent(id)}`;
    }
  }));
}

// application bootstrap
function boot() {
  const seeded = seedIfNeeded();
  if (seeded) {
    toast({
      title: "Seeded starter data",
      message: "Loaded 30 golfers into localStorage.",
      variant: "success"
    });
  }

  if (!window.location.hash) window.location.hash = "#list";
  render();

  window.addEventListener("hashchange", render);
}

boot();
