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
    // f = nama file audio (audio/<level>/<f>.mp3), v = teks yang diucapkan
    return chars.split('').map((c, i) => ({ c, r: rom[i], f: rom[i], v: c }));
  };

  const HIRAGANA = letters(
    'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
    'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n'
  );

  const KATAKANA = letters(
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n'
  );

  // c = kanji, r = bacaan (romaji), m = arti
  // f = nama file audio, v = bacaan yang diucapkan suara contoh
  // say = bacaan kana yang diterima saat latihan ucapan, alt = tulisan lain yang sering dikembalikan pengenal suara
  const KANJI = [
    { c: '一', r: 'ichi', m: 'satu', f: 'ichi', v: 'いち', say: ['いち'], alt: ['1'] },
    { c: '二', r: 'ni', m: 'dua', f: 'ni', v: 'に', say: ['に'], alt: ['2'] },
    { c: '三', r: 'san', m: 'tiga', f: 'san', v: 'さん', say: ['さん'], alt: ['3'] },
    { c: '四', r: 'shi / yon', m: 'empat', f: 'yon', v: 'よん', say: ['し', 'よん'], alt: ['4'] },
    { c: '五', r: 'go', m: 'lima', f: 'go', v: 'ご', say: ['ご'], alt: ['5'] },
    { c: '六', r: 'roku', m: 'enam', f: 'roku', v: 'ろく', say: ['ろく'], alt: ['6'] },
    { c: '七', r: 'shichi / nana', m: 'tujuh', f: 'nana', v: 'なな', say: ['しち', 'なな'], alt: ['7'] },
    { c: '八', r: 'hachi', m: 'delapan', f: 'hachi', v: 'はち', say: ['はち'], alt: ['8'] },
    { c: '九', r: 'kyuu / ku', m: 'sembilan', f: 'kyuu', v: 'きゅう', say: ['きゅう', 'く'], alt: ['9'] },
    { c: '十', r: 'juu', m: 'sepuluh', f: 'juu', v: 'じゅう', say: ['じゅう'], alt: ['10'] },
    { c: '日', r: 'nichi / hi', m: 'hari, matahari', f: 'nichi', v: 'にち', say: ['にち', 'ひ'] },
    { c: '月', r: 'getsu / tsuki', m: 'bulan', f: 'getsu', v: 'げつ', say: ['げつ', 'つき'] },
    { c: '火', r: 'ka / hi', m: 'api', f: 'ka', v: 'か', say: ['か', 'ひ'] },
    { c: '水', r: 'sui / mizu', m: 'air', f: 'sui', v: 'すい', say: ['すい', 'みず'] },
    { c: '木', r: 'moku / ki', m: 'pohon', f: 'moku', v: 'もく', say: ['もく', 'き'] },
    { c: '金', r: 'kin / kane', m: 'emas, uang', f: 'kin', v: 'きん', say: ['きん', 'かね'] },
    { c: '土', r: 'do / tsuchi', m: 'tanah', f: 'do', v: 'ど', say: ['ど', 'つち'] },
    { c: '山', r: 'san / yama', m: 'gunung', f: 'yama', v: 'やま', say: ['さん', 'やま'] },
    { c: '川', r: 'sen / kawa', m: 'sungai', f: 'kawa', v: 'かわ', say: ['せん', 'かわ'] },
    { c: '人', r: 'jin / hito', m: 'orang', f: 'hito', v: 'ひと', say: ['じん', 'ひと'] }
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
