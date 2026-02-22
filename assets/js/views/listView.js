import { htmlToEl, qs, setFlash, getCookie, setCookie } from "../ui.js";
import { store } from "../store.js";

const PAGE_SIZE_COOKIE = "pageSize";
const ALLOWED_PAGE_SIZES = [5, 10, 20, 50];

function clampPageSize(ps) {
  const n = Number(ps);
  if (!Number.isFinite(n)) return 10;
  if (!ALLOWED_PAGE_SIZES.includes(n)) return 10;
  return n;
}

function safeImg(imgEl) {
  imgEl.addEventListener("error", () => {
    imgEl.src = "assets/images/placeholder.png";
  });
}

function buildHash(path, params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const qs = usp.toString();
  return `#${path}${qs ? `?${qs}` : ""}`;
}

export const listView = {
  async render({ query }) {
    const app = qs("#app");

    // Show immediate loading feedback
    app.innerHTML = `<p class="muted">Loading...</p>`;

    // Update page title in the panel header (index.html has #view-title)
    const viewTitle = document.getElementById("view-title");
    if (viewTitle) viewTitle.textContent = "Loading…";

    const page = Math.max(1, Number(query.get("page") || 1));

    const cookiePageSize = clampPageSize(getCookie(PAGE_SIZE_COOKIE) || 10);
    const pageSizeFromUrl = query.get("pageSize");
    const pageSize = pageSizeFromUrl
      ? clampPageSize(pageSizeFromUrl)
      : cookiePageSize;

    // If URL provided page size, sync it back to cookie
    setCookie(PAGE_SIZE_COOKIE, String(pageSize));

    const q = (query.get("q") || "").trim();
    const country = (query.get("country") || "").trim();
    const sort = (query.get("sort") || "name").trim();
    const dir = (query.get("dir") || "asc").trim();

    const root = htmlToEl(`
      <section>
        <div class="list-controls">
          <form id="filters" class="filters">
            <input class="input" type="text" name="q" placeholder="Search name or country" value="${escapeHtml(
              q
            )}" />
            <input class="input input-sm" type="text" name="country" placeholder="Country filter (exact)" value="${escapeHtml(
              country
            )}" />
            <select class="input input-sm" name="sort">
              ${option("name", "Name", sort)}
              ${option("country", "Country", sort)}
              ${option("age", "Age", sort)}
              ${option("worldRank", "World Rank", sort)}
              ${option("winsPga", "PGA Wins", sort)}
              ${option("majorWins", "Majors", sort)}
              ${option("fedexRank", "FedEx Rank", sort)}
              ${option("updatedAt", "Updated", sort)}
            </select>
            <select class="input input-sm" name="dir">
              ${option("asc", "Asc", dir)}
              ${option("desc", "Desc", dir)}
            </select>
            <button class="btn" type="submit">Apply</button>
            <a class="btn btn-ghost" href="#list">Reset</a>
          </form>

          <div class="page-size">
            <label for="pageSizeSelect">Page size</label>
            <select id="pageSizeSelect" class="input input-sm">
              ${ALLOWED_PAGE_SIZES
                .map((n) => {
                  const selected = n === pageSize ? "selected" : "";
                  return `<option value="${n}" ${selected}>${n}</option>`;
                })
                .join("")}
            </select>
          </div>
        </div>

        <div id="list" class="cards"></div>
        <div id="pager" class="pager"></div>
      </section>
    `);

    // Replace the app contents cleanly (prevents leftover text/nodes)
    app.replaceChildren(root);

    // Fetch data
    let data;
    try {
      data = await store.list({ page, pageSize, q, country, sort, dir });
    } catch (e) {
      setFlash("Failed to load golfers. Please try again.", "error");
      if (viewTitle) viewTitle.textContent = "Golfer List";
      return;
    }

    if (viewTitle) viewTitle.textContent = "Golfer List";

    const items = data.items || [];
    const meta = data.meta || {};
    const total = meta.total || 0;

    const list = qs("#list", root);
    const pager = qs("#pager", root);

    if (!items.length) {
      list.innerHTML = `
        <div class="empty">
          <h3>No results</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      `;
    } else {
      list.innerHTML = "";
      for (const g of items) {
        const card = htmlToEl(`
          <article class="card">
            <img class="thumb" src="${escapeHtml(
              g.imageUrl || "assets/images/placeholder.png"
            )}" alt="${escapeHtml(g.name)}" />
            <div class="card-body">
              <h3>${escapeHtml(g.name)}</h3>
              <div class="meta">
                <div><strong>Country:</strong> ${escapeHtml(g.country)}</div>
                <div><strong>Age:</strong> ${fmt(g.age)}</div>
                <div><strong>World Rank:</strong> ${fmt(g.worldRank)}</div>
                <div><strong>PGA Wins:</strong> ${fmt(g.winsPga)}</div>
                <div><strong>Majors:</strong> ${fmt(g.majorWins)}</div>
                <div><strong>FedEx Rank:</strong> ${fmt(g.fedexRank)}</div>
              </div>
              <div class="actions">
                <a class="btn btn-small" href="#edit/${g.id}">Edit</a>
                <button class="btn btn-small btn-danger" data-del="${
                  g.id
                }">Delete</button>
              </div>
            </div>
          </article>
        `);

        const img = card.querySelector("img.thumb");
        safeImg(img);

        list.appendChild(card);
      }
    }

    // Delete handling with confirmation
    list.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button[data-del]");
      if (!btn) return;

      const id = btn.getAttribute("data-del");
      const ok = window.confirm("Delete this record? This cannot be undone.");
      if (!ok) return;

      try {
        await store.remove(id);
        setFlash("Deleted.", "success");
        // Refresh current page, but if page becomes empty, go back one page
        const newTotal = Math.max(0, total - 1);
        const maxPage = Math.max(1, Math.ceil(newTotal / pageSize));
        const nextPage = Math.min(page, maxPage);

        window.location.hash = buildHash("list", {
          page: nextPage,
          pageSize,
          q,
          country,
          sort,
          dir,
        });
      } catch (e) {
        setFlash("Delete failed. Please try again.", "error");
      }
    });

    // Filters submit
    const filters = qs("#filters", root);
    filters.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const fd = new FormData(filters);
      const nextQ = (fd.get("q") || "").toString().trim();
      const nextCountry = (fd.get("country") || "").toString().trim();
      const nextSort = (fd.get("sort") || "name").toString();
      const nextDir = (fd.get("dir") || "asc").toString();

      window.location.hash = buildHash("list", {
        page: 1,
        pageSize,
        q: nextQ,
        country: nextCountry,
        sort: nextSort,
        dir: nextDir,
      });
    });

    // Page size change
    const pageSizeSelect = qs("#pageSizeSelect", root);
    pageSizeSelect.addEventListener("change", () => {
      const next = clampPageSize(pageSizeSelect.value);
      setCookie(PAGE_SIZE_COOKIE, String(next));
      window.location.hash = buildHash("list", {
        page: 1,
        pageSize: next,
        q,
        country,
        sort,
        dir,
      });
    });

    // Pager rendering
    renderPager({
      pagerEl: pager,
      page,
      pageSize,
      total,
      q,
      country,
      sort,
      dir,
    });
  },
};

function renderPager({ pagerEl, page, pageSize, total, q, country, sort, dir }) {
  pagerEl.innerHTML = "";

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const info = htmlToEl(
    `<div class="pager-info">Page ${page} of ${totalPages} (${total} total)</div>`
  );
  pagerEl.appendChild(info);

  const controls = htmlToEl(`<div class="pager-controls"></div>`);
  pagerEl.appendChild(controls);

  const prev = htmlToEl(
    `<a class="btn btn-small ${page <= 1 ? "disabled" : ""}" href="${buildHash(
      "list",
      { page: Math.max(1, page - 1), pageSize, q, country, sort, dir }
    )}">Prev</a>`
  );

  const next = htmlToEl(
    `<a class="btn btn-small ${
      page >= totalPages ? "disabled" : ""
    }" href="${buildHash("list", {
      page: Math.min(totalPages, page + 1),
      pageSize,
      q,
      country,
      sort,
      dir,
    })}">Next</a>`
  );

  if (page <= 1) prev.addEventListener("click", (e) => e.preventDefault());
  if (page >= totalPages) next.addEventListener("click", (e) => e.preventDefault());

  controls.appendChild(prev);
  controls.appendChild(next);
}

function option(value, label, current) {
  const sel = value === current ? "selected" : "";
  return `<option value="${escapeHtml(value)}" ${sel}>${escapeHtml(
    label
  )}</option>`;
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "-";
  return String(v);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}