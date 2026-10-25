/*
 * panel.js — panel "Pengaturan suara dan mikrofon" (dipakai Dashboard dan halaman Quest).
 * VoicePanel.create(levelKey) mengembalikan elemen <details>.
 */
(function (global) {
  'use strict';

  const { h } = UI;

  // rms (0..1) -> persen lebar meter, skala desibel -60..0
  const meterPct = (rms) => {
    const db = 20 * Math.log10(Math.max(rms, 1e-5));
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 100));
  };

  function slider(id, range, step, value, format, onChange) {
    const out = h('output', { for: id }, format(value));
    const input = h('input', { id, type: 'range', min: range[0], max: range[1], step, value });
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      out.textContent = format(v);
      onChange(v);
    });
    return { input, out };
  }

  const field = (label, id, control, out) =>
    h('div', { class: 'field' }, [h('label', { for: id }, label), control, out || null]);

  function create(levelKey) {
    const level = getLevel(levelKey) || LEVELS[0];
    const s = Voice.getSettings();

    /* ---------- suara contoh ---------- */
    const fileStatus = h('ul', { class: 'file-status' });
    const voiceSelect = h('select', { id: 'vp-voice' });
    const voiceNote = h('p', { class: 'note' });
    const tryNote = h('p', { class: 'note', role: 'status', 'aria-live': 'polite' });

    function fillVoices() {
      const voices = Voice.japaneseVoices();
      const saved = Voice.getSettings().voiceURI;
      voiceSelect.textContent = '';
      voiceSelect.appendChild(h('option', { value: '' }, 'Otomatis (suara Jepang pertama)'));
      voices.forEach((v) => voiceSelect.appendChild(
        h('option', { value: v.voiceURI, selected: v.voiceURI === saved }, v.name + ' (' + v.lang + ')')));
      voiceSelect.disabled = !voices.length;
      voiceNote.textContent = voices.length
        ? 'Daftar ini berasal dari browser dan sistem operasimu, jadi bisa berbeda di tiap perangkat.'
        : 'Browser ini belum punya suara bahasa Jepang. Pasang paket suara Jepang di sistemmu, atau pakai file audio sendiri (lihat di bawah).';
    }
    fillVoices();
    Voice.onVoicesChanged(fillVoices);
    voiceSelect.addEventListener('change', () => Voice.saveSettings({ voiceURI: voiceSelect.value }));

    const pitch = slider('vp-pitch', Voice.LIMITS.pitch, 0.05, s.pitch, (v) => v.toFixed(2), (v) => Voice.saveSettings({ pitch: v }));
    const rate = slider('vp-rate', Voice.LIMITS.rate, 0.05, s.rate, (v) => v.toFixed(2) + 'x', (v) => Voice.saveSettings({ rate: v }));

    const tryBtn = h('button', {
      class: 'btn ghost', type: 'button',
      onclick: () => Voice.play(level.key, level.letters[0]).then((r) => {
        tryNote.textContent = r === 'file' ? 'Memutar file audio milikmu.'
          : r === 'tts' ? 'Memutar suara bawaan browser.'
          : 'Tidak ada suara: browser ini tidak punya suara Jepang dan file audio tidak ditemukan.';
      })
    }, '🔊 Coba suara');

    function refreshFiles() {
      fileStatus.textContent = '';
      LEVELS.forEach((lv) => {
        const li = h('li', null, lv.name + ': memeriksa');
        fileStatus.appendChild(li);
        Voice.probe(lv.key).then((ok) => {
          li.textContent = lv.name + (ok ? ': memakai file audio dari folder audio/' : ': memakai suara bawaan browser');
          li.className = ok ? 'on' : '';
        });
      });
    }
    // Pemeriksaan file baru jalan saat panel dibuka, supaya tidak ada permintaan sia-sia tiap halaman dimuat.
    let probed = false;

    /* ---------- mikrofon ---------- */
    const meterFill = h('div', { class: 'meter-fill' });
    const meter = h('div', { class: 'meter', 'aria-hidden': 'true' }, meterFill);
    const verdictBox = h('p', { class: 'note verdict', role: 'status', 'aria-live': 'polite' });
    let running = null;

    const testBtn = h('button', { class: 'btn ghost', type: 'button', onclick: toggleTest }, '🎤 Tes mikrofon');

    function finishTest(text, level) {
      running = null;
      testBtn.textContent = '🎤 Tes mikrofon';
      verdictBox.textContent = text;
      verdictBox.dataset.level = level || '';
    }

    function toggleTest() {
      if (running) { running.stop(); return; }
      if (!Mic.supported()) { finishTest('Browser ini tidak mendukung akses mikrofon.', 'silent'); return; }
      verdictBox.textContent = 'Ucapkan beberapa huruf seperti saat latihan. Tes berjalan 5 detik.';
      verdictBox.dataset.level = '';
      testBtn.textContent = 'Hentikan tes';
      running = Mic.test((rms) => { meterFill.style.width = meterPct(rms) + '%'; }, 5000);
      running.done.then((r) => {
        meterFill.style.width = '0%';
        const v = Mic.verdict(r.peak);
        finishTest(v.text, v.level);
      }).catch((err) => {
        meterFill.style.width = '0%';
        const name = err && err.name;
        finishTest(name === 'NotAllowedError' ? 'Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser.'
          : name === 'NotFoundError' ? 'Mikrofon tidak ditemukan. Sambungkan mikrofon lalu coba lagi.'
          : 'Mikrofon belum bisa dibuka. Tutup aplikasi lain yang memakai mikrofon lalu coba lagi.', 'silent');
      });
    }

    const gain = slider('vp-gain', Voice.LIMITS.gain, 0.5, s.gain, (v) => v.toFixed(1) + 'x', (v) => Voice.saveSettings({ gain: v }));
    gain.input.disabled = !s.boost;
    const boost = h('input', { id: 'vp-boost', type: 'checkbox', checked: s.boost });
    boost.addEventListener('change', () => {
      Voice.saveSettings({ boost: boost.checked });
      gain.input.disabled = !boost.checked;
    });

    const panel = h('details', { class: 'panel' }, [
      h('summary', null, 'Pengaturan suara dan mikrofon'),
      h('div', { class: 'panel-body' }, [
        h('section', { class: 'group' }, [
          h('h3', null, 'Suara contoh'),
          fileStatus,
          field('Suara', 'vp-voice', voiceSelect),
          voiceNote,
          field('Nada', 'vp-pitch', pitch.input, pitch.out),
          field('Kecepatan', 'vp-rate', rate.input, rate.out),
          h('div', { class: 'actions left' }, tryBtn),
          tryNote,
          h('p', { class: 'note' }, 'Ingin suara bergaya anime? Letakkan file audio di folder audio/ dengan nama sesuai huruf. Panduan lengkap ada di audio/README.md. Pengaturan di atas hanya berlaku jika file audio tidak ada.')
        ]),
        h('section', { class: 'group' }, [
          h('h3', null, 'Mikrofon'),
          h('div', { class: 'actions left' }, testBtn),
          meter,
          verdictBox,
          h('div', { class: 'field check' }, [boost, h('label', { for: 'vp-boost' }, 'Penguat suara (eksperimental)')]),
          field('Penguatan', 'vp-gain', gain.input, gain.out),
          h('p', { class: 'note' }, 'Penguat hanya bekerja di browser yang mengizinkan pengenal suara memakai jalur audio kustom, dan belum semuanya begitu. Jika tidak terasa bedanya, naikkan volume input di pengaturan suara sistem.')
        ])
      ])
    ]);
    panel.addEventListener('toggle', () => {
      if (panel.open && !probed) { probed = true; refreshFiles(); }
    });
    return panel;
  }

  global.VoicePanel = { create };
})(window);
