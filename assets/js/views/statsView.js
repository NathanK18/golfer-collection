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

  // compute stats
  const records = store.getAll();
  const total = records.length;
  const avgWorldRank = total
    ? (records.reduce((sum, r) => sum + Number(r.worldRank || 0), 0) / total)
    : 0;
  const totalWins = records.reduce((sum, r) => sum + Number(r.winsPga || 0), 0);
  const majorWinners = records.filter(r => Number(r.majorWins || 0) > 0).length;

  // country breakdown
  const countryCounts = new Map();
  for (const r of records) {
    countryCounts.set(r.country, (countryCounts.get(r.country) || 0) + 1);
  }
  let topCountry = "—";
  let topCountryCount = 0;
  for (const [c, n] of countryCounts.entries()) {
    if (n > topCountryCount) { topCountry = c; topCountryCount = n; }
  }

  return el("div", {}, [
    el("p", { class: "small" }, [
      "This view shows totals, averages, and a country breakdown highlight."
    ]),
    el("div", { class: "kpi-grid" }, [
      kpi("Total golfers", formatNumber(total)),
      kpi("Average world rank", total ? avgWorldRank.toFixed(1) : "0"),
      kpi("Total PGA wins", formatNumber(totalWins)),
      kpi("Major winners", formatNumber(majorWinners)),
    ]),
    el("div", { class: "hr" }),
    el("div", { class: "kpi" }, [
      el("div", { class: "kpi-label" }, ["Most common country in your collection"]),
      el("div", { class: "kpi-value" }, [topCountry]),
      el("div", { class: "help" }, [topCountry === "—" ? "No data yet." : `${topCountryCount} golfers`])
    ])
  ]);
}

// build kpi element
function kpi(label, value) {
  return el("div", { class: "kpi" }, [
    el("div", { class: "kpi-label" }, [label]),
    el("div", { class: "kpi-value" }, [String(value)]),
  ]);
}
