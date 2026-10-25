# Nihongo Quest

Aplikasi web belajar huruf Jepang (Hiragana, Katakana, Kanji) dengan dua halaman, tanpa backend dan tanpa build step. Siap di-deploy ke GitHub Pages.

## Struktur proyek

```
nihongo-quest/
├── index.html        Halaman 1: Dashboard pemilihan level + indikator progres
├── quest.html        Halaman 2: area belajar (isi berubah sesuai ?level=)
├── audio/            File suara contoh milik Anda (opsional, lihat audio/README.md)
├── tools/
│   └── generate-audio.mjs   Pembuat file suara dari VOICEVOX
├── css/
│   └── style.css
└── js/
    ├── data.js       Daftar level dan huruf (murni data)
    ├── ui.js         Helper DOM kecil
    ├── storage.js    Satu-satunya akses localStorage (Store)
    ├── checkers.js   Logika murni: cek ucapan dan nilai tulisan di kanvas
    ├── quests.js     Pembangun urutan quest + hitung progres
    ├── voice.js      Suara contoh: file audio dulu, suara browser sebagai cadangan
    ├── mic.js        Tes level mikrofon dan penguat suara (eksperimental)
    ├── panel.js      Panel "Pengaturan suara dan mikrofon"
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

- **Ucapan**: memakai Web Speech API (`SpeechRecognition`, bahasa `ja-JP`). Didukung Chrome, Edge, dan Safari terbaru; Firefox belum. Chrome mengirim audio ke layanan pengenalan suara, jadi butuh internet. Bila tidak tersedia atau gagal, pengguna bisa melanjutkan tanpa mikrofon. Detail untuk suara pelan ada di bagian "Pengucapan dan suara pelan" di bawah.
- **Menulis**: tulisan pengguna dibandingkan dengan bentuk huruf pada grid 100x100. Ambang penilaian ada di `THRESHOLDS` pada `js/checkers.js` (`coverage` dan `precision`); naikkan untuk lebih ketat, turunkan untuk lebih longgar.
- **Melewati quest**: quest ucapan dan menulis bisa dilewati (muncul setelah beberapa kali gagal, atau jika mikrofon/kanvas tidak tersedia). Quest yang dilewati dihitung selesai.
- **Menambah huruf**: edit `js/data.js`. Urutan quest dan persentase progres menyesuaikan sendiri. Progres lama tetap valid karena id quest berbasis urutan, jadi tambahkan huruf baru di akhir daftar.
- Font memakai font sistem (Hiragino, Yu Gothic, Noto Sans JP, dst.), tanpa unduhan font eksternal.

## Pengucapan dan suara pelan

Yang dilakukan aplikasi agar suara pelan lebih mudah terdeteksi:

- Mendengarkan hingga 12 detik dalam satu sesi, dan menyambung ulang otomatis jika browser memutus sesi.
- Hasil sementara (belum final) ikut diperiksa, jadi suara pendek yang sempat terbaca langsung diterima.
- Memeriksa sampai 10 kemungkinan hasil, termasuk kata satu kanji yang bunyinya sama (mis. "蚊" untuk か; daftarnya di `HOMOPHONES` pada `js/checkers.js`) dan angka untuk kanji bilangan ("1" untuk 一).
- Panel "Pengaturan suara dan mikrofon" punya **Tes mikrofon**: menampilkan level suara dan menyarankan langkah jika terlalu pelan.
- **Penguat suara (eksperimental)** memperkuat audio sebelum dikirim ke pengenal suara lewat `SpeechRecognition.start(track)`. Fitur ini belum didukung semua browser; jika tidak terasa bedanya, aplikasi tetap jalan seperti biasa.

Pengaruh terbesar biasanya ada di luar aplikasi: naikkan **volume input** mikrofon di pengaturan suara sistem (Windows: Pengaturan, Sistem, Suara, Input. macOS: Pengaturan Sistem, Suara, Input) dan dekatkan mikrofon sekitar 5 sampai 10 cm dari mulut.

## Suara contoh (termasuk suara anime)

Urutan sumber suara untuk satu huruf: **file audio di folder `audio/`**, lalu suara bawaan browser.

1. **Suara bawaan browser**: pilih suara Jepang, nada, dan kecepatan di panel pengaturan. Daftar suara bergantung pada perangkat. Nada lebih tinggi memberi kesan lebih "imut", tetapi tetap suara komputer.
2. **Suara bergaya anime**: buat file audio per huruf dengan VOICEVOX (gratis, karakter bergaya anime), lalu taruh di `audio/`:

   ```bash
   # pasang dan jalankan aplikasi VOICEVOX dulu, lalu:
   node tools/generate-audio.mjs --list-speakers      # lihat karakter dan ID
   node tools/generate-audio.mjs --speaker 3          # buat 112 file (butuh Node.js 18+)
   ```

   Opsi lain: `--speed 0.9`, `--pitch 0`, `--intonation 1.1`, `--levels hiragana`, `--force`. Tanpa VOICEVOX, `--list` menampilkan nama file yang dibutuhkan. Commit folder `audio/` bersama proyek.
3. **Rekaman sendiri**: simpan sebagai `audio/<level>/<nama>.mp3` atau `.wav`. Aturan nama lengkap ada di `audio/README.md`.

Setiap karakter VOICEVOX punya ketentuan pemakaian sendiri dan umumnya meminta kredit; periksa sebelum situs dipublikasikan. Situs GitHub Pages bersifat publik, jadi jangan unggah rekaman atau tiruan suara karakter anime berhak cipta tanpa izin pemiliknya.

Pesan 404 di konsol browser untuk file audio yang belum ada itu wajar; aplikasi otomatis memakai suara browser.
