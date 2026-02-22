const BASE = "";

async function request(method, url, data) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data !== undefined) {
    options.body = JSON.stringify(data);
  }

  const res = await fetch(BASE + url, options);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const msg =
      typeof payload === "string"
        ? payload
        : payload && payload.error
        ? payload.error
        : `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  // Axios-style return shape
  return { data: payload };
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