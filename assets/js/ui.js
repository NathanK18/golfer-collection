export const qs = (sel, el = document) => el.querySelector(sel);

export const htmlToEl = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
};

export function setFlash(message, type = "info") {
  const region =
    document.getElementById("toast-region") ||
    document.getElementById("flash");

  if (!region) return;

  region.innerHTML = `
    <div class="toast ${type}">
      ${message}
    </div>
  `;

  setTimeout(() => {
    region.innerHTML = "";
  }, 3000);
}