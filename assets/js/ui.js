export const qs = (sel, el = document) => el.querySelector(sel);

export const htmlToEl = (html) => {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstChild;
};

export function setCookie(name, value, days = 365) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires.toUTCString()}; path=/`;
}

export function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^| )" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[2]) : null;
}


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