import { htmlToEl, qs, getCookie } from "../ui.js";
import { store } from "../store.js";

export const statsView = {
  async render() {
    const app = qs("#app");
    app.innerHTML = "";

    // Update panel header title (index.html has #view-title)
    const viewTitle = document.getElementById("view-title");
    if (viewTitle) viewTitle.textContent = "Stats";

    let stats;
    try {
      stats = await store.stats();
    } catch (e) {
      app.appendChild(
        htmlToEl(`
          <section class="empty">
            <h3>Stats unavailable</h3>
            <p>Could not load statistics.</p>
          </section>
        `)
      );
      return;
    }

    const pageSize = getCookie("pageSize") || "10";

    const root = htmlToEl(`
      <section>
        <h2>Stats</h2>

        <div class="kpis">
          <div class="kpi">
            <div class="kpi-label">Total records</div>
            <div class="kpi-value">${stats.totalRecords ?? "-"}</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">Current page size</div>
            <div class="kpi-value">${pageSize}</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">Average world rank</div>
            <div class="kpi-value">${
              stats.avgWorldRank === null || stats.avgWorldRank === undefined
                ? "-"
                : Number(stats.avgWorldRank).toFixed(2)
            }</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">Total major wins</div>
            <div class="kpi-value">${stats.totalMajorWins ?? "-"}</div>
          </div>

          <div class="kpi">
            <div class="kpi-label">Total PGA wins</div>
            <div class="kpi-value">${stats.totalPgaWins ?? "-"}</div>
          </div>
        </div>
      </section>
    `);

    app.appendChild(root);
  },
};