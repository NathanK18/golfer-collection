import { qs, htmlToEl, setFlash } from "../ui.js";
import { store } from "../store.js";

export const formView = {
  async render({ mode, id }) {
    const app = qs("#app");
    app.innerHTML = "<p>Loading form...</p>";

    let record = null;

    if (mode === "edit" && id) {
      try {
        record = await store.get(id);
      } catch (err) {
        setFlash("Unable to load record.", "error");
        return;
      }
    }

    const el = htmlToEl(`
      <div class="form-container">
        <h2>${mode === "edit" ? "Edit Golfer" : "Add Golfer"}</h2>
        <form id="golfer-form">
          <label>
            Name
            <input name="name" required value="${record?.name ?? ""}" />
          </label>

          <label>
            Nationality
            <input name="nationality" required value="${record?.nationality ?? ""}" />
          </label>

          <label>
            Major Wins
            <input type="number" name="majorWins" min="0" required value="${record?.majorWins ?? 0}" />
          </label>

          <label>
            Total Wins
            <input type="number" name="totalWins" min="0" required value="${record?.totalWins ?? 0}" />
          </label>

          <label>
            Rating (0–100)
            <input type="number" name="rating" min="0" max="100" required value="${record?.rating ?? 50}" />
          </label>

          <label>
            Image URL
            <input name="imageUrl" required value="${record?.imageUrl ?? ""}" />
          </label>

          <div class="form-actions">
            <button type="submit" class="btn primary">
              ${mode === "edit" ? "Update" : "Create"}
            </button>
            <button type="button" class="btn" id="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    `);

    app.innerHTML = "";
    app.appendChild(el);

    qs("#cancel-btn").addEventListener("click", () => {
      window.location.hash = "#/";
    });

    qs("#golfer-form").addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target);

      const payload = {
        name: formData.get("name").trim(),
        nationality: formData.get("nationality").trim(),
        majorWins: Number(formData.get("majorWins")),
        totalWins: Number(formData.get("totalWins")),
        rating: Number(formData.get("rating")),
        imageUrl: formData.get("imageUrl").trim(),
      };

      try {
        if (mode === "edit") {
          await store.update(id, payload);
          setFlash("Record updated successfully.", "success");
        } else {
          await store.create(payload);
          setFlash("Record created successfully.", "success");
        }

        window.location.hash = "#/";
      } catch (err) {
        setFlash("Error saving record.", "error");
      }
    });
  },
};