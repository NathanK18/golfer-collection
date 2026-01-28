import { STORAGE_KEY } from "./seed.js";

// reads and returns the entire array
function read() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// saves the entire array
function write(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export const store = {
  getAll() {
    return read().sort((a, b) => a.worldRank - b.worldRank);
  },

  getById(id) {
    return read().find(r => r.id === id) || null;
  },

  // adds a new record and returns it
  create(record) {
    const records = read();
    const now = Date.now();
    const id = `g_${now}_${Math.floor(Math.random() * 1e9)}`;

    const newRecord = {
      id,
      updatedAt: now,
      ...record
    };

    records.push(newRecord);
    write(records);
    return newRecord;
  },

  // updates a record by id and returns the updated record
  update(id, updates) {
    const records = read();
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return null;

    records[idx] = {
      ...records[idx],
      ...updates,
      updatedAt: Date.now()
    };

    write(records);
    return records[idx];
  },

  // removes a record by id and will return true if successful
  remove(id) {
    const records = read();
    const next = records.filter(r => r.id !== id);
    if (next.length === records.length) return false;
    write(next);
    return true;
  }
};
