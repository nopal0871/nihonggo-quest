/*
 * quests.js — membangun urutan quest sebuah level.
 *
 * Aturan:
 *  1. Satu quest "learn" = satu huruf baru.
 *  2. Setiap 2 huruf selesai, sisipkan 1 quest "speak" (latihan ucapan).
 *  3. Setiap 5 quest terlewati, sisipkan 1 quest "write" (menulis di kanvas).
 *     Quest write sendiri tidak dihitung ke penghitung berikutnya.
 *
 * Urutan bersifat deterministik, jadi id quest ("hiragana-12") stabil dan
 * cukup disimpan sebagai daftar id yang selesai.
 */
(function (global) {
  'use strict';

  const cache = {};

  function build(levelKey) {
    if (cache[levelKey]) return cache[levelKey];
    const level = global.getLevel(levelKey);
    if (!level) return [];

    const list = [];
    let sinceWrite = 0;     // jumlah quest sejak quest menulis terakhir
    let lastLearned = null; // huruf terbaru yang sudah dipelajari
    let speakCount = 0;

    const add = (quest) => {
      quest.index = list.length;
      quest.id = levelKey + '-' + quest.index;
      quest.level = levelKey;
      list.push(quest);
    };

    const step = (quest) => {
      add(quest);
      sinceWrite += 1;
      if (sinceWrite === 5) {
        add({ type: 'write', target: lastLearned });
        sinceWrite = 0;
      }
    };

    level.letters.forEach((letter, i) => {
      lastLearned = letter;
      step({ type: 'learn', item: letter, letterIndex: i });
      if ((i + 1) % 2 === 0) {
        const pair = [level.letters[i - 1], letter];
        step({ type: 'speak', target: pair[speakCount % 2], pair });
        speakCount += 1;
      }
    });

    cache[levelKey] = list;
    return list;
  }

  function progress(levelKey) {
    const list = build(levelKey);
    const done = global.Store.completedMap(levelKey);
    const count = list.filter((q) => done[q.id]).length;
    const total = list.length;
    const pct = total ? (count === total ? 100 : Math.floor((count / total) * 100)) : 0;
    return { done: count, total, pct };
  }

  // Quest pertama yang belum selesai (untuk melanjutkan). Sama dengan panjang daftar jika sudah tamat.
  function firstIncomplete(levelKey) {
    const list = build(levelKey);
    const done = global.Store.completedMap(levelKey);
    const i = list.findIndex((q) => !done[q.id]);
    return i === -1 ? list.length : i;
  }

  global.Quests = { build, progress, firstIncomplete };
})(window);
