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

    return (await api.get(`/api/golfers?${query.toString()}`)).data;
  },

  async get(id) {
    return (await api.get(`/api/golfers/${id}`)).data;
  },

  async create(payload) {
    return (await api.post(`/api/golfers`, payload)).data;
  },

  async update(id, payload) {
    return (await api.put(`/api/golfers/${id}`, payload)).data;
  },

  async remove(id) {
    // ✅ api.del (NOT api.delete)
    return (await api.del(`/api/golfers/${id}`)).data;
  },

  async stats() {
    return (await api.get(`/api/stats`)).data;
  },
};