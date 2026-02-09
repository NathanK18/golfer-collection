import { store } from "../store.js";
import { el, setTitle, setPanelActions, formatNumber } from "../ui.js";

// renders the stats view
export function renderStatsView() {
  setTitle("Stats View");
  setPanelActions(
    el("div", {}, [
      el("a", { class: "btn btn-ghost btn-sm", href: "#list" }, ["← Back to List"])
    ])
  );

  const wrap = el("div", {}, [
    el("p", { class: "small" }, [
      "This view shows totals, averages, and a country breakdown highlight (computed on the server)."
    ]),
    el("div", { class: "kpi-grid" }, [
      kpi("Total golfers", "…"),
      kpi("Average world rank", "…"),
      kpi("Total PGA wins", "…"),
      kpi("Major winners", "…"),
    ]),
    el("div", { class: "hr" }),
    el("div", { class: "kpi", id: "top-country" }, [
      el("div", { class: "kpi-label" }, ["Most common country in your collection"]),
      el("div", { class: "kpi-value" }, ["…"]),
      el("div", { class: "help" }, ["Loading…"])
    ])
  ]);

  (async () => {
    const res = await store.stats();
    if (!res.ok) {
      wrap.appendChild(el("div", { class: "error", style: "margin-top:12px;" }, [res.error]));
      return;
    }
    const s = res.data;

    // update KPIs
    const grid = wrap.querySelector(".kpi-grid");
    if (grid) {
      grid.innerHTML = "";
      grid.append(
        kpi("Total golfers", formatNumber(s.total || 0)),
        kpi("Average world rank", Number.isFinite(s.avgWorldRank) ? s.avgWorldRank.toFixed(1) : "0"),
        kpi("Total PGA wins", formatNumber(s.totalWins || 0)),
        kpi("Major winners", formatNumber(s.majorWinners || 0)),
      );
    }

    const kpiBlock = wrap.querySelector("#top-country");
    if (kpiBlock) {
      const value = kpiBlock.querySelector(".kpi-value");
      const help = kpiBlock.querySelector(".help");
      if (value) value.textContent = s.topCountry || "—";
      if (help) help.textContent = s.topCountry ? `${formatNumber(s.topCountryCount || 0)} golfers` : "No data yet.";
    }
  })();

  return wrap;
}

// build kpi element
function kpi(label, value) {
  return el("div", { class: "kpi" }, [
    el("div", { class: "kpi-label" }, [label]),
    el("div", { class: "kpi-value" }, [String(value)]),
  ]);
}
