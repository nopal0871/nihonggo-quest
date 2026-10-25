# Folder suara contoh

Aplikasi memutar file di sini lebih dulu. Jika file huruf tertentu tidak ada, aplikasi memakai suara bawaan browser (pengaturan suara, nada, dan kecepatan ada di panel "Pengaturan suara dan mikrofon").

## Aturan nama

```
audio/<level>/<nama>.mp3     (juga bisa .wav)
```

- `<level>` adalah `hiragana`, `katakana`, atau `kanji`.
- Hiragana dan Katakana memakai nama yang sama, tetapi di folder berbeda. Contoh: `audio/hiragana/ka.mp3` dan `audio/katakana/ka.mp3`.
- Nama kana (46 huruf): a, i, u, e, o, ka, ki, ku, ke, ko, sa, shi, su, se, so, ta, chi, tsu, te, to, na, ni, nu, ne, no, ha, hi, fu, he, ho, ma, mi, mu, me, mo, ya, yu, yo, ra, ri, ru, re, ro, wa, wo, n
- Nama kanji (20 huruf): ichi, ni, san, yon, go, roku, nana, hachi, kyuu, juu, nichi, getsu, ka, sui, moku, kin, do, yama, kawa, hito
- Tidak wajib lengkap. Huruf tanpa file memakai suara browser.

## Cara membuat file

**Otomatis dengan VOICEVOX (suara bergaya anime, gratis):**

1. Pasang dan jalankan aplikasi VOICEVOX di komputermu.
2. `node tools/generate-audio.mjs --list-speakers` untuk melihat karakter dan ID-nya.
3. `node tools/generate-audio.mjs --speaker <ID>` untuk membuat semua file di folder ini.

**Manual:** rekam suaramu sendiri atau pakai suara berlisensi, lalu simpan dengan nama di atas. Bila tidak ada keterangan lain, file boleh berukuran kecil: satu huruf hanya butuh sekitar satu detik.

## Hak pakai suara

Situs di GitHub Pages bersifat publik, jadi setiap file suara ikut terpublikasi. Pakai suara yang boleh dipublikasikan: rekamanmu sendiri, atau suara dengan lisensi yang mengizinkan (periksa ketentuan karakter VOICEVOX dan cantumkan kreditnya). Rekaman atau tiruan suara karakter anime yang berhak cipta tidak boleh dipublikasikan tanpa izin pemiliknya.
