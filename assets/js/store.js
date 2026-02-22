import { api } from "./api.js";

export const store = {
  async list(params = {}) {
    return (await api.get("/golfers", { params })).data;
  },

  async get(id) {
    return (await api.get(`/golfers/${id}`)).data;
  },

  async create(payload) {
    return (await api.post("/golfers", payload)).data;
  },

  async update(id, payload) {
    return (await api.put(`/golfers/${id}`, payload)).data;
  },

  async remove(id) {
    return (await api.delete(`/golfers/${id}`)).data;
  },

  async stats() {
    return (await api.get("/stats")).data;
  },
};