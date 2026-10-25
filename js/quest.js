/*
 * quest.js — halaman 2. Memuat level dari URL, lalu menjalankan quest satu per satu.
 *
 * Alur data Dashboard -> Quest:
 *   1. Dashboard: <a href="quest.html?level=hiragana">  (+ Store.setLast)
 *   2. Di sini: URLSearchParams membaca ?level=…; kalau tidak valid, pakai Store.getLast();
 *      kalau tetap tidak ada, kembali ke index.html.
 *   3. Setiap quest benar -> Store.markDone(level, id) langsung disimpan,
 *      jadi Dashboard otomatis menampilkan angka terbaru.
 */
(function () {
  'use strict';

  const { h } = UI;
  const TICK = '<svg viewBox="0 0 52 52" focusable="false" aria-hidden="true"><circle cx="26" cy="26" r="25"/><path pathLength="1" d="M14 27l8 8 16-17"/></svg>';

  /* ---------- 1. Level mana? ---------- */
  let levelKey = new URLSearchParams(window.location.search).get('level');
  if (!getLevel(levelKey)) levelKey = Store.getLast();
  const level = getLevel(levelKey);
  if (!level) { window.location.replace('index.html'); return; }
  Store.setLast(levelKey);

  document.title = level.name + ': Nihongo Quest';
  document.documentElement.style.setProperty('--accent', level.accent);

  /* ---------- 2. State ---------- */
  const quests = Quests.build(levelKey);
  const isKanji = level.kind === 'kanji';
  const $ = (id) => document.getElementById(id);
  const stage = $('stage');

  let idx = Quests.firstIncomplete(levelKey);
  let onLeave = null; // pembersih untuk quest yang sedang tampil (mikrofon, suara, timer)
  let onKey = null;   // pintasan keyboard quest yang sedang tampil

  document.addEventListener('keydown', (e) => { if (onKey) onKey(e); });

  /* ---------- 3. Kerangka halaman ---------- */
  function buildPath() {
    const ol = $('path');
    quests.forEach((q, i) => {
      const label = q.type === 'learn' ? q.item.c : q.type === 'speak' ? '🎤' : '✍️';
      const name = q.type === 'learn' ? 'Huruf ' + q.item.c : q.type === 'speak' ? 'Latihan ucapan' : 'Latihan menulis';
      ol.appendChild(h('li', {
        class: 'chip ' + q.type,
        lang: q.type === 'learn' ? 'ja' : null,
        title: 'Quest ' + (i + 1) + ': ' + name
      }, label));
    });
  }

  function updateChrome() {
    const p = Quests.progress(levelKey);
    $('levelTitle').textContent = level.name;
    $('counter').textContent = idx < quests.length ? 'Quest ' + (idx + 1) + ' dari ' + quests.length : 'Selesai ✔';
    $('progressFill').style.width = p.pct + '%';
    $('progressBar').setAttribute('aria-valuenow', p.pct);

    const done = Store.completedMap(levelKey);
    const box = $('path');
    let current = null;
    Array.prototype.forEach.call(box.children, (chip, i) => {
      chip.classList.toggle('done', !!done[quests[i].id]);
      chip.classList.toggle('current', i === idx);
      if (i === idx) { chip.setAttribute('aria-current', 'step'); current = chip; } else chip.removeAttribute('aria-current');
    });
    if (current) box.scrollTo({ left: current.offsetLeft - (box.clientWidth - current.offsetWidth) / 2, behavior: 'smooth' });
  }

  function go(i) {
    Voice.stop();
    if (onLeave) { onLeave(); onLeave = null; }
    onKey = null;
    idx = i;
    render();
  }

  function render() {
    stage.textContent = '';
    updateChrome();
    if (idx >= quests.length) { renderDone(); return; }
    const q = quests[idx];
    if (q.type === 'learn') renderLearn(q);
    else if (q.type === 'speak') renderSpeak(q);
    else renderWrite(q);
    window.scrollTo(0, 0);
  }

  /* ---------- 4. Potongan UI bersama ---------- */
  const tick = (extra) => h('span', { class: 'tick' + (extra ? ' ' + extra : ''), 'aria-hidden': 'true', html: TICK });
  const feedbackBox = () => h('div', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const say = (box, kind, text) => { box.className = 'feedback' + (kind ? ' ' + kind : ''); box.textContent = text || ''; };

  function finishQuest(q) { Store.markDone(levelKey, q.id); updateChrome(); }

  // Suara contoh: file audio milik pengguna dulu, kalau tidak ada baru suara bawaan browser.
  function listenButton(item, text) {
    const btn = h('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => Voice.play(levelKey, item).then((result) => {
        if (result !== 'none') return;
        btn.textContent = 'Suara tidak tersedia';
        setTimeout(() => { btn.textContent = text; }, 2500);
      })
    }, text);
    return btn;
  }

  function nextButton() {
    const last = idx + 1 >= quests.length;
    return h('button', { class: 'btn primary next', type: 'button', onclick: () => go(idx + 1) }, last ? 'Selesaikan level' : 'Lanjut');
  }

  function skipButton(q, text) {
    return h('button', { class: 'btn ghost', type: 'button', onclick: () => { finishQuest(q); go(idx + 1); } }, text);
  }

  /* ---------- 5. Quest: kenali huruf ---------- */
  const labelOf = (item) => (isKanji ? item.m : item.r);

  // 3 pengecoh + 1 jawaban benar. Pengecoh diambil dulu dari huruf yang sudah pernah muncul.
  function makeOptions(q) {
    const correct = labelOf(q.item);
    const seen = Object.create(null);
    seen[correct] = true;
    const wrong = [];
    const take = (pool) => UI.shuffle(pool).forEach((x) => {
      const label = labelOf(x);
      if (wrong.length >= 3 || seen[label]) return;
      seen[label] = true;
      wrong.push(label);
    });
    take(level.letters.slice(0, q.letterIndex));
    take(level.letters);
    return UI.shuffle(wrong.map((label) => ({ label, correct: false })).concat({ label: correct, correct: true }));
  }

  // Mengacak ulang posisi pilihan, dijamin berbeda dari urutan sebelumnya.
  function reshuffle(options) {
    const key = (list) => list.map((o) => o.label).join('|');
    const before = key(options);
    let next = options;
    for (let t = 0; t < 12 && key(next) === before; t++) next = UI.shuffle(options);
    return next;
  }

  function renderLearn(q) {
    const item = q.item;
    const card = h('section', { class: 'card' });
    stage.appendChild(card);
    showIntro();

    function showIntro() {
      card.textContent = '';
      card.appendChild(h('p', { class: 'kicker' }, isKanji ? 'Kanji baru' : 'Huruf baru'));
      card.appendChild(h('div', { class: 'glyph', lang: 'ja' }, item.c));
      card.appendChild(isKanji
        ? h('p', { class: 'meaning' }, [h('strong', null, item.m), h('span', null, 'dibaca ' + item.r)])
        : h('p', { class: 'meaning' }, [h('strong', null, item.r), h('span', null, 'cara membacanya')]));
      const actions = h('div', { class: 'actions' });
      actions.appendChild(listenButton(item, '🔊 Dengarkan'));
      const go = h('button', { class: 'btn primary', type: 'button', onclick: showQuiz }, 'Uji aku');
      actions.appendChild(go);
      card.appendChild(actions);
      card.appendChild(h('p', { class: 'tip' }, 'Perhatikan bentuknya, lalu jawab satu pertanyaan.'));
      go.focus({ preventScroll: true });
    }

    function showQuiz() {
      card.textContent = '';
      let options = makeOptions(q);
      let locked = false;
      let timer = null;
      const fb = feedbackBox();
      const grid = h('div', { class: 'options', role: 'group', 'aria-label': 'Pilihan jawaban' });

      card.appendChild(h('div', { class: 'glyph small', lang: 'ja' }, item.c));
      card.appendChild(h('h2', { class: 'question' }, isKanji ? 'Apa arti kanji ini?' : 'Bagaimana cara membaca huruf ini?'));
      card.appendChild(grid);
      card.appendChild(fb);
      draw(false);

      onKey = (e) => {
        const n = parseInt(e.key, 10);
        if (!locked && n >= 1 && n <= options.length) grid.children[n - 1].click();
      };
      onLeave = () => clearTimeout(timer);

      function draw(shuffled) {
        grid.textContent = '';
        grid.classList.remove('locked');
        grid.classList.toggle('shuffled', shuffled);
        options.forEach((opt, i) => {
          const btn = h('button', {
            class: 'option', type: 'button',
            style: shuffled ? '--d:' + i * 60 + 'ms' : null,
            onclick: () => choose(opt, btn)
          }, [
            h('span', { class: 'opt-key', 'aria-hidden': 'true' }, i + 1),
            h('span', { class: 'opt-label' }, opt.label),
            tick()
          ]);
          grid.appendChild(btn);
        });
      }

      function choose(opt, btn) {
        if (locked) return;
        locked = true;
        grid.classList.add('locked');

        if (opt.correct) {
          btn.classList.add('correct');
          Array.prototype.forEach.call(grid.children, (b) => { if (b !== btn) b.classList.add('dim'); });
          finishQuest(q);
          say(fb, 'ok', '✔ Benar! ' + item.c + (isKanji ? ' berarti ' + item.m + ', dibaca ' + item.r + '.' : ' dibaca “' + item.r + '”.'));
          const next = nextButton();
          card.appendChild(next);
          next.focus({ preventScroll: true });
          onKey = null;
          return;
        }

        // Salah: quest TIDAK di-reset, hanya posisi pilihan yang diacak.
        btn.classList.add('wrong');
        say(fb, 'bad', 'Belum tepat. Pilihan diacak ulang, coba lagi.');
        timer = setTimeout(() => {
          options = reshuffle(options);
          draw(true);
          locked = false;
        }, 750);
      }
    }
  }

  /* ---------- 6. Quest: latihan ucapan ---------- */
  const LISTEN_MS = 12000; // batas waktu satu sesi mendengarkan
  const MAX_RESTARTS = 3;  // browser kadang memutus sesi; kita boleh menyambung ulang sampai batas ini

  function renderSpeak(q) {
    const t = q.target;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null;
    let boost = null;
    let active = false;
    let finished = false;
    let skipShown = false;
    let attempts = 0;
    let restarts = 0;
    let deadline = 0;
    let timer = null;
    let heardSomething = false;
    let failed = false;

    const status = h('p', { class: 'mic-status', role: 'status', 'aria-live': 'polite' });
    const heard = h('p', { class: 'heard' });
    const fb = feedbackBox();
    const hintSlot = h('div', { class: 'actions' });
    const skipSlot = h('div', { class: 'actions' });
    const micLabel = h('span', { class: 'mic-label' }, 'Tekan lalu ucapkan');
    const mic = h('button', { class: 'mic', type: 'button', onclick: toggle, 'aria-label': 'Mulai atau hentikan perekaman suara' }, [
      h('span', { class: 'mic-icon', 'aria-hidden': 'true' }, '🎤'),
      micLabel
    ]);
    const micWrap = h('div', { class: 'mic-wrap' }, [mic, tick('big')]);

    const card = h('section', { class: 'card' }, [
      h('p', { class: 'kicker' }, 'Latihan ucapan'),
      h('div', { class: 'glyph', lang: 'ja' }, t.c),
      h('p', { class: 'meaning' }, [
        h('strong', null, t.r),
        h('span', null, isKanji ? 'artinya ' + t.m : 'cara membacanya')
      ]),
      h('p', { class: 'tip' }, 'Tekan tombol, ucapkan huruf ini dengan jelas, lalu tunggu hasilnya. Gunakan Chrome, Edge, atau Safari agar mikrofon bisa dipakai.'),
      h('div', { class: 'actions' }, listenButton(t, '🔊 Dengarkan contoh')),
      micWrap, status, heard, fb, hintSlot, skipSlot
    ]);
    stage.appendChild(card);

    function showSkip(text) {
      if (skipShown || finished) return;
      skipShown = true;
      skipSlot.appendChild(skipButton(q, text));
    }

    function micTestHint() {
      if (hintSlot.firstChild) return;
      hintSlot.appendChild(h('button', {
        class: 'btn ghost', type: 'button',
        onclick: () => {
          const panel = document.querySelector('#voicePanel details');
          if (!panel) return;
          panel.open = true;
          panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 'Cek level mikrofon'));
    }

    function releaseBoost() {
      if (boost) { boost.stop(); boost = null; }
    }

    function endListening(message) {
      active = false;
      clearTimeout(timer);
      mic.classList.remove('listening');
      micLabel.textContent = 'Tekan lalu ucapkan';
      releaseBoost();
      if (message !== undefined) status.textContent = message;
    }

    function miss(text) {
      attempts += 1;
      say(fb, 'bad', text);
      if (attempts >= 2) showSkip('Lewati latihan ucapan');
    }

    function succeed() {
      finished = true;
      try { rec.stop(); } catch (e) { /* sudah berhenti */ }
      endListening('');
      micWrap.classList.add('correct');
      mic.disabled = true;
      hintSlot.textContent = '';
      skipSlot.textContent = '';
      finishQuest(q);
      say(fb, 'ok', '✔ Bagus! Pengucapanmu terdengar tepat.');
      const next = nextButton();
      card.appendChild(next);
      next.focus({ preventScroll: true });
    }

    // Hasil sementara (interim) ikut dicek, jadi suara pendek atau pelan yang
    // sempat terbaca langsung diterima tanpa menunggu hasil akhir.
    function onResults(ev) {
      if (finished) return;
      for (let i = ev.resultIndex || 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        const alts = [];
        for (let k = 0; k < res.length; k++) alts.push(res[k].transcript);
        if (!alts.length) continue;
        heardSomething = true;
        heard.textContent = 'Terdengar: “' + alts[0] + '”';
        if (Checkers.speechMatches(alts, t)) { succeed(); return; }
        if (res.isFinal) miss('Belum cocok. Dengarkan contohnya, lalu ucapkan sekali lagi.');
      }
    }

    function startRec() {
      if (boost) {
        try { rec.start(boost.track); return; } catch (e) { releaseBoost(); }
      }
      rec.start();
    }

    function connect() {
      rec = new SR();
      rec.lang = 'ja-JP';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 10;

      rec.onstart = () => {
        mic.classList.add('listening');
        micLabel.textContent = 'Mendengarkan';
        status.textContent = 'Mendengarkan. Ucapkan sekarang, tombol bisa ditekan lagi untuk berhenti.';
      };
      rec.onresult = onResults;
      rec.onerror = (ev) => {
        if (ev.error === 'aborted') return;
        failed = true;
        if (ev.error === 'no-speech') {
          endListening('Tidak ada suara yang masuk. Jika suaramu pelan, cek level mikrofon lalu coba lagi.');
          miss('Suaramu belum terdengar.');
          micTestHint();
          return;
        }
        const messages = {
          'not-allowed': 'Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser, atau lewati latihan ini.',
          'service-not-allowed': 'Browser tidak mengizinkan pengenalan suara di sini. Kamu bisa melewati latihan ini.',
          'audio-capture': 'Mikrofon tidak ditemukan. Sambungkan mikrofon atau lewati latihan ini.',
          'network': 'Pengenalan suara membutuhkan koneksi internet. Coba lagi atau lewati latihan ini.'
        };
        endListening(messages[ev.error] || 'Pengenalan suara gagal. Coba lagi.');
        showSkip('Lanjutkan tanpa mikrofon');
      };
      rec.onend = () => {
        if (!active || finished || failed) return;
        // Sesi diputus browser sebelum waktu habis: sambung lagi tanpa menekan tombol.
        if (Date.now() < deadline && restarts < MAX_RESTARTS) {
          restarts += 1;
          try { connect(); startRec(); return; } catch (e) { /* jatuh ke bawah */ }
        }
        if (heardSomething) {
          endListening('Waktu mendengarkan habis. Tekan tombol untuk mencoba lagi.');
        } else {
          endListening('Tidak ada suara yang masuk. Jika suaramu pelan, cek level mikrofon lalu coba lagi.');
          miss('Suaramu belum terdengar.');
          micTestHint();
        }
      };
    }

    async function begin() {
      active = true;
      failed = false;
      heardSomething = false;
      restarts = 0;
      hintSlot.textContent = '';
      heard.textContent = '';
      say(fb, '', '');
      micLabel.textContent = 'Menyiapkan';
      status.textContent = '';

      const s = Voice.getSettings();
      if (s.boost && Mic.supported()) {
        try { boost = await Mic.boostedTrack(s.gain); } catch (e) { boost = null; }
      }
      if (!active || finished) { releaseBoost(); return; } // dibatalkan saat menunggu izin

      deadline = Date.now() + LISTEN_MS;
      timer = setTimeout(() => { try { rec.stop(); } catch (e) { /* sudah berhenti */ } }, LISTEN_MS);
      try {
        connect();
        startRec();
      } catch (e) {
        endListening('Mikrofon belum bisa dimulai. Coba tekan tombol lagi.');
      }
    }

    function toggle() {
      if (finished) return;
      if (!active) { begin(); return; }
      // Berhenti manual: hasil akhir yang tertunda tetap diproses oleh onResults.
      try { rec.stop(); } catch (e) { /* sudah berhenti */ }
      endListening('Dihentikan. Tekan tombol untuk mencoba lagi.');
    }

    if (!SR) {
      mic.disabled = true;
      status.textContent = 'Browser ini belum mendukung pengenalan suara. Coba Chrome, Edge, atau Safari terbaru, atau lanjutkan tanpa mikrofon.';
      showSkip('Lanjutkan tanpa mikrofon');
    }

    onLeave = () => {
      active = false;
      clearTimeout(timer);
      try { if (rec) rec.abort(); } catch (e) { /* sudah berhenti */ }
      releaseBoost();
    };
  }

  /* ---------- 7. Quest: menulis di kanvas ---------- */
  function renderWrite(q) {
    const t = q.target;
    const SIZE = 400;   // resolusi kanvas
    const GRID = 100;   // resolusi grid untuk penilaian
    const fontJp = (getComputedStyle(document.documentElement).getPropertyValue('--font-jp') || '').trim() || 'sans-serif';
    let fails = 0;
    let hasInk = false;
    let drawing = false;
    let last = null;
    let finished = false;
    let skipShown = false;

    const guide = h('canvas', { class: 'guide', width: SIZE, height: SIZE, 'aria-hidden': 'true' });
    const ink = h('canvas', { class: 'ink', width: SIZE, height: SIZE, role: 'img', 'aria-label': 'Kanvas untuk menulis huruf ' + t.c });
    const wrap = h('div', { class: 'canvas-wrap' }, [guide, ink, tick('big')]);
    const fb = feedbackBox();
    const skipSlot = h('div', { class: 'actions' });
    const clearBtn = h('button', { class: 'btn ghost', type: 'button', onclick: clearInk }, 'Hapus');
    const checkBtn = h('button', { class: 'btn primary', type: 'button', onclick: check }, 'Periksa tulisanku');

    const card = h('section', { class: 'card' }, [
      h('p', { class: 'kicker' }, 'Latihan menulis'),
      h('h2', { class: 'question' }, 'Tulis ' + t.c + ' di kanvas'),
      h('p', { class: 'meaning inline' }, [
        h('strong', null, isKanji ? t.m : t.r),
        h('span', null, isKanji ? 'dibaca ' + t.r : 'cara membacanya')
      ]),
      wrap,
      h('div', { class: 'actions' }, [clearBtn, checkBtn]),
      fb, skipSlot
    ]);
    stage.appendChild(card);

    const glyph = (ctx, color) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '600 ' + Math.round(SIZE * 0.74) + 'px ' + fontJp;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.c, SIZE / 2, SIZE / 2 + SIZE * 0.04);
      ctx.restore();
    };

    // Garis panduan: silang putus-putus seperti kertas latihan menulis + huruf samar untuk diikuti
    const g = guide.getContext('2d');
    if (g) {
      g.save();
      g.strokeStyle = 'rgba(30, 110, 80, 0.28)';
      g.lineWidth = 2;
      g.setLineDash([7, 9]);
      g.beginPath();
      g.moveTo(SIZE / 2, 10); g.lineTo(SIZE / 2, SIZE - 10);
      g.moveTo(10, SIZE / 2); g.lineTo(SIZE - 10, SIZE / 2);
      g.stroke();
      g.restore();
      glyph(g, 'rgba(26, 34, 48, 0.2)');
    }

    const ctx = ink.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#1a2230';
      ctx.fillStyle = '#1a2230';
    }

    const pos = (e) => {
      const r = ink.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * SIZE) / r.width, y: ((e.clientY - r.top) * SIZE) / r.height };
    };

    ink.addEventListener('pointerdown', (e) => {
      if (finished || !ctx) return;
      e.preventDefault();
      try { ink.setPointerCapture(e.pointerId); } catch (err) { /* tidak wajib */ }
      drawing = true;
      hasInk = true;
      last = pos(e);
      ctx.beginPath();
      ctx.arc(last.x, last.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });
    ink.addEventListener('pointermove', (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });
    const end = () => { drawing = false; last = null; };
    ink.addEventListener('pointerup', end);
    ink.addEventListener('pointercancel', end);

    function clearInk() {
      if (finished || !ctx) return;
      ctx.clearRect(0, 0, SIZE, SIZE);
      hasInk = false;
      say(fb, '', '');
    }

    // Kanvas -> grid 0/1 (alpha > 24) untuk dibandingkan
    function maskOf(canvas) {
      const small = document.createElement('canvas');
      small.width = GRID;
      small.height = GRID;
      const c = small.getContext('2d', { willReadFrequently: true });
      c.drawImage(canvas, 0, 0, GRID, GRID);
      const data = c.getImageData(0, 0, GRID, GRID).data;
      const mask = new Uint8Array(GRID * GRID);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 24 ? 1 : 0;
      return mask;
    }

    function referenceMask() {
      const ref = document.createElement('canvas');
      ref.width = SIZE;
      ref.height = SIZE;
      glyph(ref.getContext('2d'), '#000');
      return maskOf(ref);
    }

    function check() {
      if (finished) return;
      if (!hasInk) { say(fb, 'bad', 'Kanvas masih kosong. Tulis hurufnya dulu dengan mengikuti garis panduan.'); return; }
      const result = Checkers.scoreDrawing(referenceMask(), maskOf(ink), GRID, GRID);

      if (result.pass) {
        finished = true;
        wrap.classList.add('correct');
        clearBtn.disabled = true;
        checkBtn.disabled = true;
        skipSlot.textContent = '';
        finishQuest(q);
        say(fb, 'ok', '✔ Bagus! Tulisanmu cocok dengan bentuk ' + t.c + '.');
        const next = nextButton();
        card.appendChild(next);
        next.focus({ preventScroll: true });
        return;
      }

      fails += 1;
      wrap.classList.add('wrong');
      setTimeout(() => wrap.classList.remove('wrong'), 500);
      say(fb, 'bad', result.hint);
      if (fails >= 3 && !skipShown) {
        skipShown = true;
        skipSlot.appendChild(skipButton(q, 'Lewati latihan menulis'));
      }
    }

    if (!ctx) {
      say(fb, 'bad', 'Browser ini tidak mendukung kanvas. Kamu bisa melewati latihan menulis.');
      skipShown = true;
      skipSlot.appendChild(skipButton(q, 'Lewati latihan menulis'));
    }
  }

  /* ---------- 8. Level selesai ---------- */
  function renderDone() {
    const p = Quests.progress(levelKey);
    const next = LEVELS[level.index + 1];
    const actions = h('div', { class: 'actions stack' }, [
      next ? h('a', { class: 'btn primary', href: 'quest.html?level=' + next.key }, 'Lanjut ke ' + next.name) : null,
      h('a', { class: next ? 'btn ghost' : 'btn primary', href: 'index.html' }, 'Kembali ke Dashboard'),
      h('button', {
        class: 'link-btn', type: 'button',
        onclick: () => {
          if (window.confirm('Ulangi ' + level.name + ' dari awal? Progres level ini akan dihapus.')) {
            Store.resetLevel(levelKey);
            go(Quests.firstIncomplete(levelKey));
          }
        }
      }, 'Ulangi level ini')
    ]);
    stage.appendChild(h('section', { class: 'card done-card' }, [
      h('div', { class: 'glyph', lang: 'ja' }, '完'),
      h('h2', { class: 'question' }, 'Level ' + level.name + ' selesai'),
      h('p', { class: 'tip' }, p.total + ' quest sudah kamu selesaikan. Progres tersimpan di Dashboard.'),
      actions
    ]));
  }

  buildPath();
  $('voicePanel').appendChild(VoicePanel.create(levelKey));
  render();
})();
