# Catatan perbaikan bug

## Bug yang diperbaiki
1. **drive.js – login/upload Drive bisa menggantung selamanya.** Callback Google terikat ke Promise pertama saja.
   Setelah token habis (±1 jam) atau login pernah dibatalkan, "Simpan ke Drive" berhenti di "Mengunggah…". Sekarang handler dibuat per permintaan.
2. **strip.js – filter foto tidak berfungsi di Safari/iPhone.** `ctx.filter` tidak didukung sehingga filter (Hitam putih/Sepia/Cerah)
   tidak ikut ke hasil unduhan. Ditambah cadangan filter per piksel.
3. **strip.js – bentuk "Sudut bulat" error di browser tanpa `roundRect`.** Ditambah cadangan `arcTo`.
4. **strip.js – render gagal total bila canvas "tainted"** (mis. dibuka lewat file://) saat bentuk foto bukan Kotak. `getImageData` kini aman.
5. **strip.js – template yang gagal dimuat sekali tidak bisa dicoba ulang** (promise gagal tersimpan di cache). Sekarang dihapus dari cache.
6. **app.js – kamera tidak pernah dimatikan** (lampu kamera menyala saat mengedit). Sekarang dimatikan setelah memotret / ganti layout
   dan dinyalakan otomatis saat kembali ke langkah pemotretan. Pesan error kamera juga lebih spesifik.
7. **app.js – klik ganda "Mulai foto"** bisa menjalankan dua sesi pemotretan sekaligus. Sekarang dikunci.
8. **app.js – popup login Drive muncul saat mode layar penuh** (sering terblokir). Sekarang login dilakukan sebelum layar penuh.
9. **app.js – error saat memotret tidak ditangani** (layar bisa tertinggal). Kini ada pesan dan alur kembali normal.
10. **app.js – unduhan PNG bisa batal** di Safari/Firefox karena URL langsung dicabut. Kini ditunda dan anchor dipasang di DOM.
11. **editor.js – `exportBlob`** kini memakai try/finally agar kotak seleksi stiker tidak hilang bila ekspor gagal.
12. **index.html – slider zoom** maksimum 3 padahal scroll mouse bisa sampai 4. Disamakan jadi 4.
13. **index.html – teks hero** "Empat pose" padahal aplikasi memotret 5 foto. Diubah jadi "Lima pose". Ditambah preconnect fonts.gstatic.com.
14. **camera.js** – `capture()` kini menolak frame kosong (videoWidth = 0) dengan pesan jelas.

## Hasil pemeriksaan (tidak ada masalah)
- 103 template: semua PNG & thumbnail ada, tidak ada ID ganda, semua slot valid dan di dalam kanvas, tidak ada file yatim.
- Seluruh file JS lolos pengecekan sintaks.

---

# Putaran persiapan deploy (aset ≤ 70, audit bug, Drive)

## Aset
- File di `assets/` dipangkas dari 196 menjadi **70** (98 PNG template + 98 thumbnail sebelumnya). Folder `thumbs` dihapus.
  Yang dibuang: template yang tidak pernah tampil (`hw-4x6-03` butuh 7 foto padahal `TOTAL_SHOTS` = 5), duplikat persis
  (`cartoon-5x5-01` = `cartoon-5x5`), dan varian yang nyaris kembar dalam satu tema. Tiap tema tetap punya strip tunggal/ganda/kolase dan beragam rasio (2×6, 4×6, 5×5, 6×4).
- `js/templates.js` disusun ulang: satu daftar, berurutan per tema lalu jenis, tanpa referensi thumbnail.

## Bug yang diperbaiki
1. **Template Cartoon (10 layout) punya "slot hantu":** kotak kecil bernomor foto sendiri yang sebenarnya celah transparan di ilustrasi.
   Akibatnya jumlah foto yang diminta membengkak (mis. 5 padahal jendela foto nyata hanya 3) dan ada potongan foto aneh di tepi jendela.
   Slot hantu dibuang, nomor foto dan `n` dihitung ulang, `cartoon-5x5` dikoreksi menjadi jenis kolase.
2. **drive.js – dua `getToken()` bersamaan membuat salah satunya menggantung selamanya** (mis. klik ganda "Hubungkan Drive"). Kini satu permintaan login dibagi bersama.
3. **drive.js – folder kembar** bila dua upload berjalan bersamaan sebelum folder ada. Pencarian/pembuatan folder kini dibagi (satu Promise).
4. **app.js – "Unduh PNG" melewati upload tanpa pesan** bila token Google sudah habis. Kini token diminta ulang dan hasilnya selalu dilaporkan.
5. **app.js – popup login diminta setelah `await` pembuatan PNG**, sering diblokir (terutama Safari/iOS). Kini diminta lebih dulu di dalam klik pengguna.
6. **drive.js – library Google belum termuat** saat diklik: kini ditunggu (maks 10 dtk) alih-alih langsung gagal.
7. **drive.js – folder tujuan terhapus (404)** kini dibuat ulang otomatis lalu upload diulang sekali.
8. **drive.js – error mentah** ("Drive error 403") diganti pesan jelas: API belum aktif, penyimpanan penuh, popup diblokir/ditutup, izin tidak dicentang, sesi habis, tidak ada internet.
9. **app.js – tombol "Hubungkan Drive"** tetap bertuliskan "terhubung ✓" setelah token habis. Kini mengikuti status sebenarnya.
10. **app.js – link hasil upload** dibuat lewat DOM, bukan `innerHTML`.
11. **index.html** – ditambah meta description, theme-color, favicon (sebelumnya 404 di /favicon.ico), pesan `<noscript>`.

## Performa
- Pratinjau layout memuat PNG hanya saat kartunya terlihat (IntersectionObserver), diperkecil ke 450 px dan di-cache; sebelum halaman booth terlihat tidak ada PNG yang diunduh.
- `vercel.json`: cache aset 1 hari, izin kamera `camera=(self)`, `nosniff`, referrer policy.

## Pengujian (Chromium headless, kamera palsu, Google & Drive API di-mock)
29 pemeriksaan lulus: 75 kartu layout, 75 template ter-render dan pusat tiap slot terisi foto yang benar, alur lengkap pilih layout → 5 foto → pilih → edit → unduh PNG,
upload Drive (folder dibuat, file PNG asli, Bearer token, nama & mime benar), pemakaian ulang folder/token, popup login ditutup, 401, 403, 404 folder hilang,
klik beruntun tanpa duplikat, library Google lambat, mode `ENABLE_DRIVE: false`, tanpa error JS dan tanpa aset 404.
Yang BELUM bisa diuji di sini: login & upload ke akun Google sungguhan (butuh domain produksi terdaftar di Google Cloud). Lihat checklist di README.

---

# Penambahan layout "Youth Market Template"
- Tema baru **Youth Market Template** (`assets/youth/single-2x6-03.png`), strip tunggal 3 foto, tampil paling depan di daftar tema.
- PNG asli 707×2000 dipotong simetris 20 px kiri-kanan ke rasio 1:3 lalu diskalakan ke 600×1800, sama dengan strip 2×6 lain (cetak 6 × 2 in). Tiga jendela foto: 559×430 px.
- Batas 70 file aset dijaga: `assets/halloween/2x6-01.png` (kembar dari `2x6-05`, sama-sama strip ganda 2 foto) dihapus.
- Stiker & font untuk tema ini memakai set "polos" (bawaan, tanpa perubahan kode).
- Diuji (Chromium + kamera palsu): kartu layout, 5 foto, pilih 3, editor, bentuk foto, filter, unduh PNG: semua lancar, tanpa error JS dan tanpa aset 404.
