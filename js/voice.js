/*
 * voice.js — suara contoh (output) dan pengaturannya.
 *
 * Urutan sumber suara untuk satu huruf:
 *   1. File audio milik Anda:  audio/<level>/<f>.mp3 | .wav
 *      (f = nama file huruf, mis. "a", "ka", "shi"; lihat audio/README.md)
 *   2. Suara bawaan browser (speechSynthesis) dengan suara, nada, dan kecepatan pilihan.
 *
 * Pengaturan disimpan terpisah dari progres belajar: kunci "nihongoQuest:voice:v1".
 */
(function (global) {
  'use strict';

  const KEY = 'nihongoQuest:voice:v1';
  const EXTS = ['mp3', 'wav'];
  const LIMITS = { pitch: [0.5, 2], rate: [0.5, 1.5], gain: [1, 8] };
  const DEFAULTS = { voiceURI: '', pitch: 1, rate: 0.8, boost: false, gain: 3 };

  let memory = null;      // cadangan jika localStorage diblokir
  let current = null;     // elemen <audio> yang sedang diputar
  const found = new Map(); // "level/f" -> ekstensi yang berhasil, atau false jika tidak ada

  const clamp = (n, range, fallback) =>
    (typeof n === 'number' && isFinite(n) ? Math.min(range[1], Math.max(range[0], n)) : fallback);

  function getSettings() {
    let raw = memory || {};
    try {
      const text = global.localStorage.getItem(KEY);
      if (text) raw = JSON.parse(text) || {};
    } catch (e) { /* abaikan */ }
    return {
      voiceURI: typeof raw.voiceURI === 'string' ? raw.voiceURI : DEFAULTS.voiceURI,
      pitch: clamp(raw.pitch, LIMITS.pitch, DEFAULTS.pitch),
      rate: clamp(raw.rate, LIMITS.rate, DEFAULTS.rate),
      boost: raw.boost === true,
      gain: clamp(raw.gain, LIMITS.gain, DEFAULTS.gain)
    };
  }

  function saveSettings(patch) {
    const next = Object.assign(getSettings(), patch);
    memory = next;
    try { global.localStorage.setItem(KEY, JSON.stringify(next)); } catch (e) { /* abaikan */ }
    return next;
  }

  /* ---------- suara bawaan browser ---------- */
  const canSpeak = () => 'speechSynthesis' in global && 'SpeechSynthesisUtterance' in global;

  function japaneseVoices() {
    if (!canSpeak()) return [];
    return (global.speechSynthesis.getVoices() || []).filter((v) => /^ja/i.test(v.lang));
  }

  function onVoicesChanged(callback) {
    if (canSpeak() && global.speechSynthesis.addEventListener) {
      global.speechSynthesis.addEventListener('voiceschanged', callback);
    }
  }

  function speakTts(item) {
    if (!canSpeak()) return false;
    const s = getSettings();
    const synth = global.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(item.v || item.c);
    utterance.lang = 'ja-JP';
    utterance.rate = s.rate;
    utterance.pitch = s.pitch;
    const voices = japaneseVoices();
    const voice = voices.find((v) => v.voiceURI === s.voiceURI) || voices[0];
    if (voice) {
      try { utterance.voice = voice; utterance.lang = voice.lang; } catch (e) { /* biarkan default */ }
    }
    synth.speak(utterance);
    return true;
  }

  /* ---------- file audio milik pengguna ---------- */
  // Dipanggil langsung dari klik (sinkron) supaya Safari mengizinkan play().
  function playFile(levelKey, item) {
    return new Promise((resolve) => {
      const id = levelKey + '/' + item.f;
      const known = found.get(id);
      if (known === false || !item.f) { resolve(false); return; }
      const exts = known ? [known] : EXTS.slice();
      const audio = new Audio();
      current = audio;
      let i = 0;
      const next = () => {
        if (i >= exts.length) { found.set(id, false); resolve(false); return; }
        const ext = exts[i++];
        audio.src = 'audio/' + encodeURIComponent(levelKey) + '/' + encodeURIComponent(item.f) + '.' + ext;
        audio.play().then(() => { found.set(id, ext); resolve(true); }).catch((err) => {
          if (err && err.name === 'NotAllowedError') resolve(false); else next();
        });
      };
      next();
    });
  }

  // Hasil: 'file' | 'tts' | 'none'
  function play(levelKey, item) {
    stop();
    return playFile(levelKey, item).then((ok) => (ok ? 'file' : speakTts(item) ? 'tts' : 'none'));
  }

  function stop() {
    if (current) { try { current.pause(); } catch (e) { /* abaikan */ } current = null; }
    if (canSpeak()) global.speechSynthesis.cancel();
  }

  // Apakah ada file audio untuk level ini? (cek huruf pertama lewat HEAD)
  function probe(levelKey) {
    const level = global.getLevel(levelKey);
    if (!level || !global.fetch) return Promise.resolve(false);
    const f = level.letters[0].f;
    return EXTS.reduce((chain, ext) => chain.then((ok) => ok || fetch(
      'audio/' + levelKey + '/' + f + '.' + ext, { method: 'HEAD', cache: 'no-store' }
    ).then((r) => r.ok && !/text\/html/i.test(r.headers.get('content-type') || '')).catch(() => false)),
    Promise.resolve(false));
  }

  global.Voice = { LIMITS, getSettings, saveSettings, canSpeak, japaneseVoices, onVoicesChanged, play, stop, probe };
})(window);
