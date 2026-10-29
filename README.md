# Kotak Foto – cara menjalankan

## Struktur
- `index.html`    : kerangka halaman
- `css/style.css` : tampilan
- `js/config.js`  : pengaturan (Client ID Google, hitung mundur, folder Drive)
- `js/templates.js`: daftar tema & layout (jumlah foto tiap layout diatur di sini)
- `js/styles.js`  : warna latar, bentuk foto, stiker
- `js/editor.js`  : geser foto, stiker, coretan
- `js/camera.js`  : kamera & hitung mundur
- `js/strip.js`   : menyusun foto jadi strip (canvas)
- `js/drive.js`   : upload ke Google Drive (subfolder per pengguna, bagikan folder)
- `js/qr.js`      : pembuat QR code (offline, tanpa library luar; MIT, © Kazuhiko Arase)
- `js/ui.js`      : panel pengaturan & pratinjau layout (lazy-load)
- `js/app.js`     : alur utama
- `vercel.json`   : header (izin kamera, cache aset) untuk Vercel
- `assets/<tema>/`: file PNG template (**maksimal 70 file di seluruh folder assets**)

## Batas aset: 70 file
Folder `assets` berisi **70 PNG template** (Halloween 13, Ice 14, Wedding 12, Classic 10, Cartoon 10, Christmas 10, Youth Market 1).
Tidak ada lagi folder `thumbs`: pratinjau layout memakai PNG template itu sendiri, diunduh hanya saat kartunya terlihat.
Tambah template baru = tambah 1 PNG + 1 entri di `js/templates.js`. Kalau sudah 70, hapus satu dulu.
Layout "Polos" dibuat oleh kode, bukan file, jadi tidak dihitung.

## Menjalankan lokal
Kamera hanya bisa jalan di `localhost` atau https. Di VS Code pasang ekstensi **Live Server**,
klik kanan `index.html` > "Open with Live Server" (biasanya http://127.0.0.1:5500).

## Pengaturan cepat (`js/config.js`)
- `TOTAL_SHOTS: 5`  jumlah foto otomatis (layout yang butuh foto lebih banyak disembunyikan)
- `FIRST_DELAY` / `SHOT_GAP`: hitung mundur tiap foto, sekarang 5 detik
- `ENABLE_DRIVE`: `true` = tombol & login Google Drive aktif; `false` = tidak ada login/popup Google sama sekali

## Google Drive – cara kerja
Login memakai akun **orang yang sedang memakai photobooth** (scope `drive.file`: website hanya bisa melihat file yang ia buat sendiri).
Artinya hasil foto masuk ke Drive pengguna itu, di folder `Capture Your Moment!`. Cocok kalau photobooth dioperasikan di satu perangkat
dengan akun pemilik acara. Kalau semua foto pengunjung publik harus masuk ke Drive pemilik website, itu butuh backend (tidak tercakup di sini).

### Subfolder per pengguna
Di halaman edit ada kolom **Nama**. Hasil disimpan ke `Capture Your Moment! / <Nama> - <tanggal>` (mis. `Budi - 2026-10-29`).
Nama kosong -> `Tamu <tanggal> <jam>`. Foto lain dari orang yang sama di hari yang sama masuk ke folder yang sama. Tombol "Mulai dari awal" mengosongkan nama untuk pengunjung berikutnya.

### QR ke folder Drive
Tombol **Buat QR Drive** (halaman edit) menyimpan foto ke subfolder pengguna bila belum, membagikan subfolder itu sebagai
"siapa pun yang punya link boleh melihat" (hanya baca), lalu menampilkan QR yang bisa discan tamu dengan kamera HP. QR bisa diunduh sebagai PNG.
- Hanya subfolder pengguna yang dibagikan; folder utama `Capture Your Moment!` tetap pribadi.
- Foto yang diunggah setelah QR dibuat otomatis ikut terlihat lewat link yang sama.
- Mengubah kolom Nama menyembunyikan QR lama (karena folder tujuannya berbeda).
- Akun Google kantor/sekolah kadang melarang berbagi lewat link; di akun seperti itu muncul pesan yang menjelaskannya. Pakai akun Gmail pribadi.
- Hentikan berbagi kapan saja lewat Drive: klik kanan folder > Bagikan > Akses umum > Dibatasi.

### Checklist sebelum/ sesudah deploy (Google Cloud Console)
1. APIs & Services > Library > **Google Drive API** = Enabled.
2. Credentials > OAuth client ID (Web application) > **Authorized JavaScript origins** berisi alamat PERSIS website produksi,
   mis. `https://namamu.vercel.app` (https, tanpa garis miring di akhir). Tambahkan juga domain kustom bila ada.
   Alamat preview Vercel yang berubah-ubah tiap deploy tidak bisa dipakai login.
3. OAuth consent screen: **In production** agar pengunjung umum bisa login. Bila masih Testing, tambahkan akun yang dipakai sebagai **Test user**.
4. `GOOGLE_CLIENT_ID` di `js/config.js` sama dengan client ID di langkah 2.
5. Uji di alamat produksi: pilih layout > foto > "Unduh PNG" (dengan kotak Drive tercentang) > pesan **Tersimpan di folder "Capture Your Moment!"** muncul
   dan file tampil di drive.google.com.

Pesan error di halaman sudah dibuat spesifik (popup diblokir, API belum aktif, penyimpanan penuh, sesi habis, dll.).
Error `origin_mismatch` pada jendela Google = langkah 2 belum cocok dengan alamat yang dipakai.

## Deploy ke Vercel
Folder ini situs statis, tanpa build. Hubungkan repo ke Vercel (Framework: Other, Build Command kosong, Output Directory kosong) atau jalankan `vercel --prod`.
