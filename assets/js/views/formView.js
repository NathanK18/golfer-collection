import { qs, htmlToEl, setFlash } from "../ui.js";
import { store } from "../store.js";

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const formView = {
  async render({ mode, id }) {
    const app = qs("#app");
    app.innerHTML = `<p class="muted">Loading...</p>`;

    const viewTitle = document.getElementById("view-title");
    if (viewTitle) viewTitle.textContent = mode === "edit" ? "Edit Golfer" : "Add Golfer";

    let record = null;

    if (mode === "edit" && id) {
      try {
        record = await store.get(id);
      } catch (err) {
        setFlash("Unable to load golfer.", "error");
        app.innerHTML = "";
        return;
      }
    }

    const el = htmlToEl(`
      <div class="form-container">
        <h2>${mode === "edit" ? "Edit Golfer" : "Add Golfer"}</h2>

        <form id="golfer-form" class="form">
          <label>
            Name
            <input class="input" name="name" required value="${escapeHtml(record?.name)}" />
          </label>

          <label>
            Country
            <input class="input" name="country" required value="${escapeHtml(record?.country)}" />
          </label>

          <div class="form-grid">
            <label>
              Age
              <input class="input" type="number" name="age" min="0" required value="${escapeHtml(record?.age ?? "")}" />
            </label>

            <label>
              World Rank
              <input class="input" type="number" name="worldRank" min="0" required value="${escapeHtml(record?.worldRank ?? "")}" />
            </label>

            <label>
              PGA Wins
              <input class="input" type="number" name="winsPga" min="0" required value="${escapeHtml(record?.winsPga ?? "")}" />
            </label>

            <label>
              Major Wins
              <input class="input" type="number" name="majorWins" min="0" required value="${escapeHtml(record?.majorWins ?? "")}" />
            </label>

            <label>
              FedEx Rank
              <input class="input" type="number" name="fedexRank" min="0" value="${escapeHtml(record?.fedexRank ?? "")}" />
            </label>
          </div>

          <label>
            Image URL (optional — placeholder used if blank)
            <input class="input" name="imageUrl" value="${escapeHtml(record?.imageUrl)}" />
          </label>

          <div class="form-actions">
            <button type="submit" class="btn primary">
              ${mode === "edit" ? "Update" : "Create"}
            </button>
            <button type="button" class="btn btn-ghost" id="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `);

    app.innerHTML = "";
    app.appendChild(el);

    qs("#cancel-btn").addEventListener("click", () => {
      window.location.hash = "#list?page=1";
    });

    qs("#golfer-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);

      const payload = {
        name: String(formData.get("name") || "").trim(),
        country: String(formData.get("country") || "").trim(),
        age: Number(formData.get("age")),
        worldRank: Number(formData.get("worldRank")),
        winsPga: Number(formData.get("winsPga")),
        majorWins: Number(formData.get("majorWins")),
        // allow blank fedexRank to be omitted or null
        fedexRank:
          String(formData.get("fedexRank") || "").trim() === ""
            ? null
            : Number(formData.get("fedexRank")),
        imageUrl: String(formData.get("imageUrl") || "").trim(),
      };

      // Basic client-side validation to avoid immediate 400s
      if (!payload.name || !payload.country) {
        setFlash("Name and country are required.", "error");
        return;
      }
      const requiredNums = ["age", "worldRank", "winsPga", "majorWins"];
      for (const k of requiredNums) {
        if (!Number.isFinite(payload[k])) {
          setFlash("Age, World Rank, PGA Wins, and Major Wins must be numbers.", "error");
          return;
        }
      }

      try {
        if (mode === "edit") {
          await store.update(id, payload);
          setFlash("Golfer updated.", "success");
        } else {
          await store.create(payload);
          setFlash("Golfer created.", "success");
        }
        window.location.hash = "#list?page=1";
      } catch (err) {
        setFlash("Error saving the record.", "error");
      }
    });
  },
};