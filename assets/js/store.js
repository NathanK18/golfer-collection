import { api } from "./api.js";

export const store = {
  async list(params = {}) {
    const {
      page = 1,
      pageSize = 10,
      q = "",
      country = "",
      sort = "name",
      dir = "asc",
    } = params;

    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("pageSize", String(pageSize));
    if (q) query.set("q", q);
    if (country) query.set("country", country);
    if (sort) query.set("sort", sort);
    if (dir) query.set("dir", dir);

    return api.get(`/api/golfers?${query.toString()}`);
  },

  async get(id) {
    return api.get(`/api/golfers/${id}`);
  },

  async create(payload) {
    return api.post(`/api/golfers`, payload);
  },

  async update(id, payload) {
    return api.put(`/api/golfers/${id}`, payload);
  },

  async remove(id) {
    return api.del(`/api/golfers/${id}`);
  },

  async stats() {
    return api.get(`/api/stats`);
  },
};