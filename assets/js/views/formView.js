import { store } from "../store.js";
import { el, toast, setTitle, setPanelActions } from "../ui.js";

const COUNTRIES = [
  "USA","ENG","SCO","WAL","IRL","NIR","ESP","SWE","NOR","DEN","FRA","GER","AUT","ITA","JPN","KOR","AUS","CAN","RSA"
];

// renders the form view for adding or changing golfer
export function renderFormView({ mode, id }) {
  const isEdit = mode === "edit";
  const record = isEdit ? store.getById(id) : null;

  setTitle(isEdit ? "Edit Golfer" : "Add Golfer");
  setPanelActions(
    el("div", {}, [
      el("a", { class: "btn btn-ghost btn-sm", href: "#list" }, ["← Back to List"])
    ])
  );

  if (isEdit && !record) {
    return el("div", {}, [
      el("p", { class: "small" }, ["That golfer record was not found."]),
      el("a", { class: "btn btn-ghost", href: "#list" }, ["Go to List"])
    ]);
  }

  // build the form
  const form = el("form", { class: "form" });
  const name = fieldText("name", "Name *", record?.name ?? "", "Golfer full name (required)");
  const country = fieldSelect("country", "Country *", record?.country ?? "USA", COUNTRIES, "3-letter code (required)");
  const age = fieldNumber("age", "Age *", record?.age ?? 28, { min: 16, max: 80 }, "Range: 16–80");
  const worldRank = fieldNumber("worldRank", "World Rank *", record?.worldRank ?? 50, { min: 1, max: 500 }, "Range: 1–500");
  const winsPga = fieldNumber("winsPga", "PGA Wins *", record?.winsPga ?? 0, { min: 0, max: 200 }, "Must be 0 or higher");
  const majorWins = fieldNumber("majorWins", "Major Wins *", record?.majorWins ?? 0, { min: 0, max: 30 }, "Must be 0 or higher");
  const fedexRank = fieldNumber("fedexRank", "FedEx Rank (optional)", record?.fedexRank ?? "", { min: 1, max: 250 }, "Leave blank if unknown");
  const errorBox = el("div", { class: "full" });
  const actions = el("div", { class: "full", style: "display:flex; gap:10px; justify-content:flex-end;" }, [
    el("a", { class: "btn btn-ghost", href: "#list" }, ["Cancel"]),
    el("button", { class: "btn btn-success", type: "submit" }, [isEdit ? "Save Changes" : "Create Golfer"])
  ]);

  form.append(
    name.wrap, country.wrap,
    age.wrap, worldRank.wrap,
    winsPga.wrap, majorWins.wrap,
    fedexRank.wrap,
    errorBox,
    actions
  );

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorBox.innerHTML = "";

    // gather and validate form data
    const payload = {
      name: name.input.value.trim(),
      country: country.input.value,
      age: toInt(age.input.value),
      worldRank: toInt(worldRank.input.value),
      winsPga: toInt(winsPga.input.value),
      majorWins: toInt(majorWins.input.value),
      fedexRank: fedexRank.input.value.trim() === "" ? null : toInt(fedexRank.input.value)
    };

    // validate
    const errors = validate(payload);
    if (errors.length) {
      errorBox.appendChild(el("div", { class: "error" }, [errors.join(" ") ]));
      return;
    }

    if (isEdit) {
      store.update(record.id, payload);
      toast({ title: "Saved", message: `"${payload.name}" updated.`, variant: "success" });
    } else {
      store.create(payload);
      toast({ title: "Created", message: `"${payload.name}" added.`, variant: "success" });
    }

    window.location.hash = "#list";
  });

  return el("div", {}, [
    el("p", { class: "small" }, [
      "Required fields are marked with *. Validation enforces numeric ranges and required inputs."
    ]),
    form
  ]);
}

// validates the payload and returns error messages
function validate(p) {
  const errs = [];
  if (!p.name) errs.push("Name is required.");
  if (!p.country) errs.push("Country is required.");

  if (!Number.isInteger(p.age) || p.age < 16 || p.age > 80) errs.push("Age must be 16–80.");
  if (!Number.isInteger(p.worldRank) || p.worldRank < 1 || p.worldRank > 500) errs.push("World Rank must be 1–500.");
  if (!Number.isInteger(p.winsPga) || p.winsPga < 0) errs.push("PGA Wins must be 0 or higher.");
  if (!Number.isInteger(p.majorWins) || p.majorWins < 0) errs.push("Major Wins must be 0 or higher.");

  if (p.fedexRank !== null) {
    if (!Number.isInteger(p.fedexRank) || p.fedexRank < 1 || p.fedexRank > 250) {
      errs.push("FedEx Rank must be 1–250 if provided.");
    }
  }
  return errs;
}

// converts value to integer
function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

function fieldText(id, label, value, helpText) {
  const input = el("input", { id, name: id, type: "text", value });
  const wrap = el("div", { class: "field" }, [
    el("label", { for: id }, [label]),
    input,
    el("div", { class: "help" }, [helpText])
  ]);
  return { wrap, input };
}

// builds a number input field
function fieldNumber(id, label, value, { min, max }, helpText) {
  const input = el("input", { id, name: id, type: "number", value, min: String(min), max: String(max) });
  const wrap = el("div", { class: "field" }, [
    el("label", { for: id }, [label]),
    input,
    el("div", { class: "help" }, [helpText])
  ]);
  return { wrap, input };
}

// builds a select field
function fieldSelect(id, label, selected, options, helpText) {
  const select = el("select", { id, name: id });
  for (const opt of options) {
    const o = el("option", { value: opt }, [opt]);
    if (opt === selected) o.selected = true;
    select.appendChild(o);
  }
  const wrap = el("div", { class: "field" }, [
    el("label", { for: id }, [label]),
    select,
    el("div", { class: "help" }, [helpText])
  ]);
  return { wrap, input: select };
}
