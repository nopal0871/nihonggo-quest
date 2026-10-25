/*
 * dashboard.js — halaman 1. Menggambar kartu level beserta progresnya.
 *
 * Navigasi ke halaman 2 memakai tautan biasa dengan path RELATIF
 * (quest.html?level=hiragana), jadi aman di GitHub Pages, baik untuk
 * situs user (user.github.io) maupun situs proyek (user.github.io/nama-repo/).
 * Level yang diklik juga disimpan sebagai cadangan lewat Store.setLast().
 */
(function () {
  'use strict';

  const { h } = UI;
  const list = document.getElementById('levels');
  const stats = document.getElementById('stats');

  function cta(p) {
    if (p.total && p.done === p.total) return 'Selesai ✔';
    return p.done ? 'Lanjutkan' : 'Mulai';
  }

  function levelCard(level, p, isHighest) {
    const fill = h('span', { class: 'bar-fill' });
    const card = h('a', {
      class: 'level-card',
      href: 'quest.html?level=' + encodeURIComponent(level.key),
      'data-level': level.key,
      'aria-label': level.name + ', ' + p.pct + ' persen selesai. ' + cta(p),
      onclick: () => Store.setLast(level.key)
    }, [
      isHighest ? h('span', { class: 'badge' }, 'Level tertinggi') : null,
      h('span', { class: 'cell', lang: 'ja', 'aria-hidden': 'true' }, level.glyph),
      h('span', { class: 'level-body' }, [
        h('span', { class: 'level-name' }, level.name),
        h('span', { class: 'level-desc' }, level.tagline)
      ]),
      h('span', { class: 'pct' }, [String(p.pct), h('small', null, '%')]),
      h('span', {
        class: 'bar', role: 'progressbar', 'aria-label': 'Progres ' + level.name,
        'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.pct
      }, fill),
      h('span', { class: 'level-meta' }, [
        h('span', null, p.done + ' dari ' + p.total + ' quest'),
        h('span', { class: 'cta' }, cta(p))
      ])
    ]);
    card.style.setProperty('--accent', level.accent);
    // dua frame agar transisi lebar bar terlihat setelah elemen masuk ke DOM
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = p.pct + '%'; }));
    return h('li', null, card);
  }

  function render() {
    const highest = Store.highest();
    let doneAll = 0;
    let totalAll = 0;

    list.textContent = '';
    LEVELS.forEach((level) => {
      const p = Quests.progress(level.key);
      doneAll += p.done;
      totalAll += p.total;
      list.appendChild(levelCard(level, p, level.index === highest));
    });

    stats.textContent = highest >= 0
      ? 'Level tertinggi: ' + LEVELS[highest].name + '. ' + doneAll + ' dari ' + totalAll + ' quest selesai.'
      : 'Belum ada quest yang selesai. Pilih level untuk memulai.';
  }

  document.getElementById('voicePanel').appendChild(VoicePanel.create('hiragana'));
  render();

  // Dashboard selalu menampilkan data terbaru saat pengguna kembali dari halaman Quest:
  // - pageshow : tombol Back (halaman bisa datang dari bfcache)
  // - storage  : progres berubah di tab lain
  // - visibilitychange : kembali ke tab ini
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', (e) => { if (!e.key || e.key === Store.KEY) render(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

  document.getElementById('resetAll').addEventListener('click', () => {
    if (window.confirm('Hapus semua progres di browser ini? Tindakan ini tidak bisa dibatalkan.')) {
      Store.resetAll();
      render();
    }
  });
})();
