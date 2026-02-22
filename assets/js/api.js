const BASE = "";

async function request(method, url, data) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(BASE + url, options);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get(url) {
    return request("GET", url);
  },

  post(url, data) {
    return request("POST", url, data);
  },

  put(url, data) {
    return request("PUT", url, data);
  },

  del(url) {
    return request("DELETE", url);
  },
};