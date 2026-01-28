import { store } from "../store.js";
import { el, confirmModal, toast, setTitle, setPanelActions, formatNumber } from "../ui.js";

export function renderListView({ onNavigateToEdit }) {
  setTitle("List View — All Golfers");

  const actions = el("div", {}, [
    el("span", { class: "badge" }, [`Records: ${formatNumber(store.getAll().length)}`]),
    el("a", { class: "btn btn-success btn-sm", href: "#add" }, ["+ Add Golfer"])
  ]);
  setPanelActions(actions);

  const records = store.getAll();

  // main wrap
  const wrap = el("div", {}, [
    el("div", { class: "table-wrap" }, [
      buildTable(records, onNavigateToEdit)
    ])
  ]);

  return wrap;
}

// builds the table element
function buildTable(records, onNavigateToEdit) {
  const table = el("table");
  const thead = el("thead");
  const trh = el("tr");
  const headers = ["Name", "Country", "Age", "World Rank", "PGA Wins", "Major Wins", "FedEx Rank", "Actions"];
  headers.forEach(h => trh.appendChild(el("th", {}, [h])));
  thead.appendChild(trh);

  const tbody = el("tbody");
  if (records.length === 0) {
    const tr = el("tr", {}, [
      el("td", { colspan: "8" }, ["No golfers yet. Click “Add Golfer” to create one."])
    ]);
    tbody.appendChild(tr);
  } else {
    for (const r of records) {
      const tr = el("tr", {}, [
        el("td", {}, [r.name]),
        el("td", {}, [r.country]),
        el("td", {}, [String(r.age)]),
        el("td", {}, [String(r.worldRank)]),
        el("td", {}, [String(r.winsPga)]),
        el("td", {}, [String(r.majorWins)]),
        el("td", {}, [r.fedexRank == null ? "—" : String(r.fedexRank)]),
        el("td", {}, [
          el("button", {
            class: "btn btn-ghost btn-sm",
            type: "button",
            onclick: () => onNavigateToEdit(r.id)
          }, ["Edit"]),
          document.createTextNode(" "),
          el("button", {
            class: "btn btn-danger btn-sm",
            type: "button",
            onclick: async () => {
              const ok = await confirmModal({
                title: "Delete golfer?",
                message: `This will permanently remove "${r.name}".`,
                confirmText: "Delete"
              });
              if (!ok) return;

              const removed = store.remove(r.id);
              if (removed) {
                toast({ title: "Deleted", message: `"${r.name}" was removed.`, variant: "danger" });
                // re-render by navigating to list again
                window.location.hash = "#list";
                window.dispatchEvent(new HashChangeEvent("hashchange"));
              }
            }
          }, ["Delete"])
        ])
      ]);
      tbody.appendChild(tr);
    }
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  return table;
}
