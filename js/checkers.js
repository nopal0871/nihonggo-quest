/*
 * checkers.js — fungsi murni (tanpa DOM) sehingga bisa diuji di Node:
 *  - speechMatches : mencocokkan hasil pengenalan suara dengan huruf target
 *  - scoreDrawing  : menilai tulisan di kanvas terhadap bentuk huruf
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Checkers = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Atur di sini kalau penilaian menulis terasa terlalu ketat atau terlalu longgar.
  const THRESHOLDS = {
    coverage: 0.55,  // minimal bagian huruf yang tertutup coretan
    precision: 0.6   // minimal coretan yang berada di dalam bentuk huruf
  };

  /* ---------------- Ucapan ---------------- */

  const katakanaToHiragana = (s) =>
    s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));

  function normalizeSpeech(s) {
    const text = String(s || '').normalize('NFKC').toLowerCase();
    return katakanaToHiragana(text).replace(/[\s　.,!?。、！？・ー〜~'"“”‘’-]/g, '');
  }

  // Untuk satu suku kata, pengenal suara bahasa Jepang sering mengembalikan kata
  // satu kanji yang bunyinya sama (mis. "か" menjadi "蚊"). Daftar ini tidak lengkap,
  // tetapi menangkap hasil yang paling umum. Kuncinya hiragana.
  const HOMOPHONES = {
    'あ': '亜阿', 'い': '胃意井位威衣', 'う': '鵜宇', 'え': '絵柄江', 'お': '尾緒小雄',
    'か': '蚊課可化家科歌香', 'き': '木気機期鬼黄器紀', 'く': '九苦区句駆', 'け': '毛', 'こ': '子個故粉湖',
    'さ': '差再左砂', 'し': '四死詩氏市師士私史紙', 'す': '巣酢素洲', 'せ': '瀬背世施', 'そ': '祖添',
    'た': '田他多太', 'ち': '血地知治', 'つ': '津', 'て': '手', 'と': '戸都途徒十',
    'な': '名菜無', 'に': '二荷煮似', 'ぬ': '縫', 'ね': '根音値寝', 'の': '野能之',
    'は': '歯葉派刃', 'ひ': '日火非比', 'ふ': '府負不', 'へ': '屁辺', 'ほ': '帆穂保',
    'ま': '間真魔', 'み': '身実三美', 'む': '無夢', 'め': '目芽女', 'も': '藻喪',
    'や': '矢屋家夜', 'ゆ': '湯', 'よ': '四世夜余', 'ら': '等', 'り': '理利里',
    'る': '留', 'れ': '例礼', 'ろ': '路炉', 'わ': '輪和', 'を': '緒'
  };

  // target = { c, r, say?, alt? }. Cocok jika salah satu alternatif hasil pengenalan
  // memuat huruf/bacaannya (dengan batas panjang agar kalimat panjang tidak lolos).
  function speechMatches(alternatives, target) {
    const homophones = (HOMOPHONES[katakanaToHiragana(String(target.c || ''))] || '').split('');
    const wants = [target.c].concat(target.say || [], target.alt || [], homophones).map(normalizeSpeech).filter(Boolean);
    const romaji = String(target.r || '').split('/').map((x) => x.trim().toLowerCase()).filter(Boolean);
    return (alternatives || []).some((alt) => {
      const heard = normalizeSpeech(alt);
      if (!heard) return false;
      if (romaji.indexOf(heard) !== -1) return true;
      return wants.some((w) => heard.indexOf(w) !== -1 && heard.length <= w.length + 3);
    });
  }

  /* ---------------- Menulis ---------------- */

  const sum = (mask) => { let n = 0; for (let i = 0; i < mask.length; i++) n += mask[i]; return n; };

  // Pelebaran kotak (dua lintasan: horizontal lalu vertikal)
  function dilate(mask, w, h, r) {
    if (r <= 0) return mask;
    const tmp = new Uint8Array(w * h);
    const out = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (let dx = -r; dx <= r && !v; dx++) {
          const xx = x + dx;
          if (xx >= 0 && xx < w && mask[y * w + xx]) v = 1;
        }
        tmp[y * w + x] = v;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = 0;
        for (let dy = -r; dy <= r && !v; dy++) {
          const yy = y + dy;
          if (yy >= 0 && yy < h && tmp[yy * w + x]) v = 1;
        }
        out[y * w + x] = v;
      }
    }
    return out;
  }

  // refMask / userMask: Uint8Array w*h berisi 0 atau 1.
  function scoreDrawing(refMask, userMask, w, h) {
    const refCount = sum(refMask);
    const userCount = sum(userMask);
    if (!refCount || !userCount) {
      return { pass: false, coverage: 0, precision: 0, hint: 'Kanvas masih kosong. Tulis hurufnya mengikuti garis panduan.' };
    }
    const userWide = dilate(userMask, w, h, 2);
    const refWide = dilate(refMask, w, h, 3);
    let covered = 0;
    let inside = 0;
    for (let i = 0; i < refMask.length; i++) {
      if (refMask[i] && userWide[i]) covered++;
      if (userMask[i] && refWide[i]) inside++;
    }
    const coverage = covered / refCount;
    const precision = inside / userCount;
    const pass = coverage >= THRESHOLDS.coverage && precision >= THRESHOLDS.precision;

    let hint = '';
    if (!pass) {
      if (coverage < THRESHOLDS.coverage && precision < THRESHOLDS.precision) {
        hint = 'Belum mirip. Hapus, lalu ikuti garis panduan abu-abu pelan-pelan.';
      } else if (coverage < THRESHOLDS.coverage) {
        hint = 'Hampir. Masih ada bagian huruf yang belum tertulis, tutupi seluruh garis panduan.';
      } else {
        hint = 'Coretanmu keluar dari bentuk huruf. Hapus dan coba lagi lebih rapat ke garis panduan.';
      }
    }
    return { pass, coverage, precision, hint };
  }

  return { THRESHOLDS, katakanaToHiragana, normalizeSpeech, speechMatches, dilate, scoreDrawing };
});
