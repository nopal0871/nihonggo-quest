/*
 * data.js — daftar level dan huruf.
 * Murni data: tambah huruf di sini dan urutan quest ikut menyesuaikan.
 * Dimuat sebagai script biasa (bukan ES module) supaya halaman tetap jalan
 * saat dibuka langsung dari file maupun dari GitHub Pages.
 */
(function (global) {
  'use strict';

  const letters = (chars, romaji) => {
    const rom = romaji.split(' ');
    return chars.split('').map((c, i) => ({ c, r: rom[i] }));
  };

  const HIRAGANA = letters(
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n'
  );

  const KATAKANA = letters(
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n'
  );

  // c = kanji, r = bacaan (romaji), m = arti, say = bacaan dalam kana (untuk cek ucapan)
  const KANJI = [
    { c: '一', r: 'ichi', m: 'satu', say: ['いち'] },
    { c: '二', r: 'ni', m: 'dua', say: ['に'] },
    { c: '三', r: 'san', m: 'tiga', say: ['さん'] },
    { c: '四', r: 'shi / yon', m: 'empat', say: ['し', 'よん'] },
    { c: '五', r: 'go', m: 'lima', say: ['ご'] },
    { c: '六', r: 'roku', m: 'enam', say: ['ろく'] },
    { c: '七', r: 'shichi / nana', m: 'tujuh', say: ['しち', 'なな'] },
    { c: '八', r: 'hachi', m: 'delapan', say: ['はち'] },
    { c: '九', r: 'kyuu / ku', m: 'sembilan', say: ['きゅう', 'く'] },
    { c: '十', r: 'juu', m: 'sepuluh', say: ['じゅう'] },
    { c: '日', r: 'nichi / hi', m: 'hari, matahari', say: ['にち', 'ひ'] },
    { c: '月', r: 'getsu / tsuki', m: 'bulan', say: ['げつ', 'つき'] },
    { c: '火', r: 'ka / hi', m: 'api', say: ['か', 'ひ'] },
    { c: '水', r: 'sui / mizu', m: 'air', say: ['すい', 'みず'] },
    { c: '木', r: 'moku / ki', m: 'pohon', say: ['もく', 'き'] },
    { c: '金', r: 'kin / kane', m: 'emas, uang', say: ['きん', 'かね'] },
    { c: '土', r: 'do / tsuchi', m: 'tanah', say: ['ど', 'つち'] },
    { c: '山', r: 'san / yama', m: 'gunung', say: ['さん', 'やま'] },
    { c: '川', r: 'sen / kawa', m: 'sungai', say: ['せん', 'かわ'] },
    { c: '人', r: 'jin / hito', m: 'orang', say: ['じん', 'ひと'] }
  ];

  const LEVELS = [
    {
      key: 'hiragana', index: 0, name: 'Hiragana', glyph: 'あ', kind: 'kana',
      tagline: 'Huruf dasar untuk menulis kata Jepang asli',
      accent: '#d9456c', letters: HIRAGANA
    },
    {
      key: 'katakana', index: 1, name: 'Katakana', glyph: 'ア', kind: 'kana',
      tagline: 'Huruf untuk kata serapan dan nama asing',
      accent: '#2b59d6', letters: KATAKANA
    },
    {
      key: 'kanji', index: 2, name: 'Kanji', glyph: '日', kind: 'kanji',
      tagline: 'Aksara pertama: angka dan unsur alam',
      accent: '#c98a00', letters: KANJI
    }
  ];

  const hasOwn = Object.prototype.hasOwnProperty;
  const BY_KEY = {};
  LEVELS.forEach((level) => { BY_KEY[level.key] = level; });

  // Aman terhadap nilai aneh dari URL seperti ?level=constructor
  global.LEVELS = LEVELS;
  global.getLevel = (key) => (typeof key === 'string' && hasOwn.call(BY_KEY, key) ? BY_KEY[key] : null);
})(window);
