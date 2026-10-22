/*
 * storage.js — satu-satunya tempat yang menyentuh localStorage.
 *
 * Bentuk data (kunci "nihongoQuest:v1"):
 * {
 *   v: 1,
 *   highest: 1,                // indeks level tertinggi yang pernah dikerjakan (-1 = belum ada)
 *   last: "katakana",          // level yang terakhir dibuka (cadangan untuk ?level=)
 *   levels: { hiragana: { done: ["hiragana-0", "hiragana-1", ...] }, ... }
 * }
 *
 * Kalau localStorage diblokir (mode privat tertentu), data hanya hidup di memori halaman.
 */
(function (global) {
  'use strict';

  const KEY = 'nihongoQuest:v1';
  let memory = null;

  const blank = () => ({ v: 1, highest: -1, last: null, levels: {} });

  function sanitize(raw) {
    const data = blank();
    if (!raw || typeof raw !== 'object') return data;
    if (Number.isInteger(raw.highest)) data.highest = raw.highest;
    if (typeof raw.last === 'string') data.last = raw.last;
    if (raw.levels && typeof raw.levels === 'object') {
      Object.keys(raw.levels).forEach((key) => {
        const done = raw.levels[key] && raw.levels[key].done;
        data.levels[key] = { done: Array.isArray(done) ? done.filter((id) => typeof id === 'string') : [] };
      });
    }
    return data;
  }

  function read() {
    try {
      const text = global.localStorage.getItem(KEY);
      if (text) return sanitize(JSON.parse(text));
    } catch (e) { /* diblokir atau JSON rusak */ }
    return memory ? sanitize(memory) : blank();
  }

  function write(data) {
    memory = data;
    try { global.localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* abaikan */ }
    return data;
  }

  const levelIndex = (key) => {
    const level = global.getLevel && global.getLevel(key);
    return level ? level.index : -1;
  };

  function recomputeHighest(data) {
    data.highest = Object.keys(data.levels).reduce(
      (best, key) => (data.levels[key].done.length ? Math.max(best, levelIndex(key)) : best), -1);
  }

  global.Store = {
    KEY,

    completedMap(levelKey) {
      const map = {};
      const level = read().levels[levelKey];
      if (level) level.done.forEach((id) => { map[id] = true; });
      return map;
    },

    markDone(levelKey, questId) {
      const data = read();
      const level = data.levels[levelKey] || (data.levels[levelKey] = { done: [] });
      if (level.done.indexOf(questId) === -1) level.done.push(questId);
      data.last = levelKey;
      data.highest = Math.max(data.highest, levelIndex(levelKey));
      write(data);
    },

    highest: () => read().highest,
    getLast: () => read().last,

    setLast(levelKey) {
      const data = read();
      data.last = levelKey;
      write(data);
    },

    resetLevel(levelKey) {
      const data = read();
      delete data.levels[levelKey];
      recomputeHighest(data);
      write(data);
    },

    resetAll: () => { write(blank()); }
  };
})(window);
