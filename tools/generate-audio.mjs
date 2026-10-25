#!/usr/bin/env node
/*
 * generate-audio.mjs — membuat file suara contoh (audio/<level>/<nama>.wav) memakai VOICEVOX
 * yang berjalan di komputermu. Hasilnya file statis, jadi tetap aman di GitHub Pages.
 *
 * Persiapan: pasang dan jalankan aplikasi VOICEVOX (https://voicevox.hiroshiba.jp/) dan biarkan terbuka.
 * Butuh Node.js 18 atau lebih baru.
 *
 *   node tools/generate-audio.mjs --list-speakers            daftar karakter beserta ID
 *   node tools/generate-audio.mjs --list                     daftar file yang dibutuhkan (tanpa VOICEVOX)
 *   node tools/generate-audio.mjs --speaker 3                buat semua file dengan karakter ber-ID 3
 *
 * Opsi: --host http://127.0.0.1:50021  --speed 0.9  --pitch 0  --intonation 1.1
 *       --levels hiragana,katakana,kanji  --out audio  --force (timpa file yang sudah ada)
 *       --overrides tools/overrides.json  ({"hiragana/ha": "ハ"} untuk mengganti teks yang diucapkan)
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i === -1 ? fallback : args[i + 1]; };
const flag = (name) => args.includes('--' + name);

// Baca daftar huruf dari js/data.js supaya tidak ada data ganda.
const win = {};
win.window = win;
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8'), vm.createContext(win));
const LEVELS = win.LEVELS;

// は, へ, を di tengah kata dibaca wa, e, o. Ditulis dengan katakana agar dibaca ha, he, o.
const BUILTIN_OVERRIDES = { 'hiragana/ha': 'ハ', 'hiragana/he': 'ヘ', 'hiragana/wo': 'オ' };
let overrides = { ...BUILTIN_OVERRIDES };
const overridesPath = path.resolve(root, opt('overrides', 'tools/overrides.json'));
if (fs.existsSync(overridesPath)) overrides = { ...overrides, ...JSON.parse(fs.readFileSync(overridesPath, 'utf8')) };

const wanted = opt('levels', LEVELS.map((l) => l.key).join(',')).split(',').map((s) => s.trim());
const items = [];
LEVELS.filter((l) => wanted.includes(l.key)).forEach((level) => {
  level.letters.forEach((letter) => {
    items.push({ level: level.key, file: letter.f, text: overrides[level.key + '/' + letter.f] || letter.v || letter.c });
  });
});

const host = opt('host', 'http://127.0.0.1:50021').replace(/\/$/, '');

function fail(message) { console.error(message); process.exit(1); }

async function call(url, options) {
  let res;
  try { res = await fetch(url, options); } catch (e) {
    fail('Tidak bisa terhubung ke VOICEVOX di ' + host + '.\nJalankan aplikasi VOICEVOX dulu, atau gunakan --host jika alamatnya berbeda.');
  }
  if (!res.ok) fail('VOICEVOX membalas error ' + res.status + ' untuk ' + url.replace(host, '') + ': ' + (await res.text()).slice(0, 200));
  return res;
}

if (flag('list')) {
  items.forEach((i) => console.log(i.level + '/' + i.file + '.wav\t' + i.text));
  console.log('\n' + items.length + ' file');
  process.exit(0);
}

const speakers = await (await call(host + '/speakers')).json();

if (flag('list-speakers')) {
  speakers.forEach((s) => s.styles.forEach((st) => console.log(st.id + '\t' + s.name + ' (' + st.name + ')')));
  process.exit(0);
}

const speaker = opt('speaker');
if (speaker === undefined) fail('Pilih karakter dengan --speaker <ID>. Lihat daftar ID dengan: node tools/generate-audio.mjs --list-speakers');
const chosen = speakers.flatMap((s) => s.styles.map((st) => ({ id: String(st.id), name: s.name, style: st.name }))).find((x) => x.id === String(speaker));
if (!chosen) fail('ID karakter ' + speaker + ' tidak ada di VOICEVOX. Lihat daftar dengan --list-speakers.');

const speed = parseFloat(opt('speed', '0.9'));
const pitch = parseFloat(opt('pitch', '0'));
const intonation = parseFloat(opt('intonation', '1.1'));
const outDir = path.resolve(root, opt('out', 'audio'));

console.log('Karakter: ' + chosen.name + ' (' + chosen.style + '), ' + items.length + ' file ke ' + path.relative(root, outDir) + '/');
let made = 0;
let skipped = 0;
for (const item of items) {
  const file = path.join(outDir, item.level, item.file + '.wav');
  if (fs.existsSync(file) && !flag('force')) { skipped++; continue; }
  const query = await (await call(
    host + '/audio_query?speaker=' + encodeURIComponent(speaker) + '&text=' + encodeURIComponent(item.text),
    { method: 'POST' })).json();
  query.speedScale = speed;
  query.pitchScale = pitch;
  query.intonationScale = intonation;
  query.prePhonemeLength = 0.1;
  query.postPhonemeLength = 0.2;
  const wav = Buffer.from(await (await call(
    host + '/synthesis?speaker=' + encodeURIComponent(speaker),
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) })).arrayBuffer());
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, wav);
  made++;
  process.stdout.write('\r' + (made + skipped) + '/' + items.length);
}
console.log('\nSelesai: ' + made + ' dibuat, ' + skipped + ' dilewati karena sudah ada.');
console.log('\nPenting: tiap karakter VOICEVOX punya ketentuan pemakaian sendiri, dan umumnya meminta kredit.');
console.log('Contoh tulisan kredit: "VOICEVOX:' + chosen.name + '". Cek ketentuan karakter di situs resmi VOICEVOX sebelum dipublikasikan.');
