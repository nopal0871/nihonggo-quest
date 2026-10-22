# Nihongo Quest

Aplikasi web belajar huruf Jepang (Hiragana, Katakana, Kanji) dengan dua halaman, tanpa backend dan tanpa build step. Siap di-deploy ke GitHub Pages.

## Struktur proyek

```
nihongo-quest/
├── index.html        Halaman 1: Dashboard pemilihan level + indikator progres
├── quest.html        Halaman 2: area belajar (isi berubah sesuai ?level=)
├── css/
│   └── style.css
└── js/
    ├── data.js       Daftar level dan huruf (murni data)
    ├── ui.js         Helper DOM kecil + suara contoh (speechSynthesis)
    ├── storage.js    Satu-satunya akses localStorage (Store)
    ├── checkers.js   Logika murni: cek ucapan dan nilai tulisan di kanvas
    ├── quests.js     Pembangun urutan quest + hitung progres
    ├── dashboard.js  Logika halaman 1
    └── quest.js      Logika halaman 2 (belajar, ucapan, menulis)
```

## Menjalankan lokal

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Mikrofon dan pengenalan suara butuh konteks aman (HTTPS atau localhost), jadi gunakan server lokal seperti di atas, bukan klik ganda pada file.

## Deploy ke GitHub Pages

1. Push seluruh isi folder ini ke repositori GitHub (file `index.html` harus di root).
2. Buka Settings, lalu Pages.
3. Pada Source pilih "Deploy from a branch", branch `main`, folder `/ (root)`, lalu Save.
4. Tunggu beberapa menit, situs aktif di `https://<user>.github.io/<nama-repo>/`.

## Navigasi yang aman untuk GitHub Pages

- Dua file HTML terpisah, bukan router di sisi klien, sehingga refresh di halaman mana pun tidak pernah menghasilkan 404.
- Semua tautan dan path aset memakai path **relatif** (`quest.html?level=hiragana`, `css/style.css`). Jangan ubah menjadi `/quest.html`: pada situs proyek (`/nama-repo/`) path berawalan garis miring akan salah.
- Dashboard mengirim level lewat parameter URL (`?level=`). Cadangannya `localStorage` (`last`), dipakai jika parameter hilang atau tidak valid. Jika dua-duanya tidak ada, pengguna dikembalikan ke `index.html`.

## Aturan urutan quest

Dibangun otomatis oleh `Quests.build()` di `js/quests.js`:

- 1 quest belajar = 1 huruf baru.
- Setiap 2 huruf, disisipkan 1 quest ucapan.
- Setiap 5 quest terlewati, disisipkan 1 quest menulis (quest menulis tidak dihitung ke penghitung berikutnya).

Pola awal: `huruf, huruf, ucapan, huruf, huruf, menulis, ucapan, huruf, huruf, ucapan, huruf, menulis, ...`

Jawaban salah tidak mengulang quest. Posisi pilihan jawaban diacak ulang sampai benar.

## Penyimpanan (localStorage)

Kunci `nihongoQuest:v1`:

```json
{
  "v": 1,
  "highest": 1,
  "last": "katakana",
  "levels": { "hiragana": { "done": ["hiragana-0", "hiragana-1"] } }
}
```

`highest` adalah indeks level tertinggi yang pernah dikerjakan. Dashboard menggambar ulang saat halaman tampil kembali (`pageshow`), saat tab aktif lagi, dan saat data berubah di tab lain.

## Catatan teknis

- **Ucapan**: memakai Web Speech API (`SpeechRecognition`, bahasa `ja-JP`). Didukung Chrome, Edge, dan Safari terbaru; Firefox belum. Chrome mengirim audio ke layanan pengenalan suara, jadi butuh internet. Bila tidak tersedia atau gagal, pengguna bisa melanjutkan tanpa mikrofon.
- **Menulis**: tulisan pengguna dibandingkan dengan bentuk huruf pada grid 100x100. Ambang penilaian ada di `THRESHOLDS` pada `js/checkers.js` (`coverage` dan `precision`); naikkan untuk lebih ketat, turunkan untuk lebih longgar.
- **Melewati quest**: quest ucapan dan menulis bisa dilewati (muncul setelah beberapa kali gagal, atau jika mikrofon/kanvas tidak tersedia). Quest yang dilewati dihitung selesai.
- **Menambah huruf**: edit `js/data.js`. Urutan quest dan persentase progres menyesuaikan sendiri. Progres lama tetap valid karena id quest berbasis urutan, jadi tambahkan huruf baru di akhir daftar.
- Font memakai font sistem (Hiragino, Yu Gothic, Noto Sans JP, dst.), tanpa unduhan font eksternal.
