import { fetchJson } from "./api.js";

// The browser does NOT own the data in Solo Project 2.
// All operations go through the backend API.

export const store = {
  /**
   * List golfers with paging.
   * @param {number} page 1-based
   * @param {number} pageSize fixed at 10 by project requirements
   */
  async list(page = 1, pageSize = 10) {
    return fetchJson(`/golfers?page=${encodeURIComponent(page)}&pageSize=${encodeURIComponent(pageSize)}`);
  },

  async getById(id) {
    return fetchJson(`/golfers/${encodeURIComponent(id)}`);
  },

  async create(record) {
    return fetchJson(`/golfers`, {
      method: "POST",
      body: JSON.stringify(record)
    });
  },

  async update(id, updates) {
    return fetchJson(`/golfers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    });
  },

  async remove(id) {
    return fetchJson(`/golfers/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  },

  async stats() {
    return fetchJson(`/stats`);
  }
};
