import { store } from "../store.js";
import { el, confirmModal, toast, setTitle, setPanelActions, formatNumber } from "../ui.js";

const PAGE_SIZE = 10;

export function renderListView({ onNavigateToEdit, page = 1 }) {
  setTitle("List View — All Golfers");

  const recordsBadge = el("span", { class: "badge" }, ["Records: …"]);
  const actions = el("div", {}, [
    recordsBadge,
    el("a", { class: "btn btn-success btn-sm", href: "#add" }, ["+ Add Golfer"])
  ]);
  setPanelActions(actions);

  const tableWrap = el("div", { class: "table-wrap" }, [
    el("div", { class: "small" }, ["Loading golfers…"])
  ]);
  const pagerWrap = el("div", { style: "margin-top:12px;" });

  const wrap = el("div", {}, [tableWrap, pagerWrap]);

  // load data async
  (async () => {
    const res = await store.list(page, PAGE_SIZE);
    if (!res.ok) {
      tableWrap.innerHTML = "";
      tableWrap.appendChild(el("div", { class: "error" }, [res.error]));
      return;
    }

    const { items, total, totalPages, page: currentPage } = res.data;
    recordsBadge.textContent = `Records: ${formatNumber(total)}`;

    tableWrap.innerHTML = "";
    tableWrap.appendChild(buildTable(items, onNavigateToEdit, currentPage));

    pagerWrap.innerHTML = "";
    pagerWrap.appendChild(buildPager({ currentPage, totalPages }));
  })();

  return wrap;
}

// builds the table element
function buildTable(records, onNavigateToEdit, currentPage) {
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

              const removed = await store.remove(r.id);
              if (!removed.ok) {
                toast({ title: "Delete failed", message: removed.error, variant: "danger" });
                return;
              }

              toast({ title: "Deleted", message: `"${r.name}" was removed.`, variant: "danger" });

              // Stay on the same page if possible.
              window.location.hash = `#list?page=${encodeURIComponent(currentPage)}`;
              window.dispatchEvent(new HashChangeEvent("hashchange"));
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

function buildPager({ currentPage, totalPages }) {
  const pageNum = Number(currentPage) || 1;
  const totalNum = Number(totalPages) || 1;

  const prevPage = Math.max(1, pageNum - 1);
  const nextPage = Math.min(totalNum, pageNum + 1);

  const prevDisabled = pageNum <= 1;
  const nextDisabled = pageNum >= totalNum;

  const prevLink = el(
    "a",
    {
      class: `btn btn-ghost btn-sm${prevDisabled ? " disabled" : ""}`,
      href: `#list?page=${encodeURIComponent(prevPage)}`,
      "aria-disabled": prevDisabled ? "true" : "false",
      onclick: (e) => {
        if (!prevDisabled) return;
        e.preventDefault();
      },
    },
    ["← Previous"]
  );

  const nextLink = el(
    "a",
    {
      class: `btn btn-ghost btn-sm${nextDisabled ? " disabled" : ""}`,
      href: `#list?page=${encodeURIComponent(nextPage)}`,
      "aria-disabled": nextDisabled ? "true" : "false",
      onclick: (e) => {
        if (!nextDisabled) return;
        e.preventDefault();
      },
    },
    ["Next →"]
  );

  const indicator = el("span", { class: "small", style: "align-self:center;" }, [
    `Page ${pageNum} of ${Math.max(totalNum, 1)}`
  ]);

  return el(
    "div",
    { style: "display:flex; gap:10px; align-items:center; justify-content:flex-end;" },
    [prevLink, nextLink, indicator]
  );
}


