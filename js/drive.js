// Upload ke Google Drive memakai Google Identity Services (scope drive.file:
// aplikasi hanya bisa mengakses file yang dibuatnya sendiri).
// Catatan: login memakai akun PENGGUNA yang sedang memakai photobooth, jadi file masuk ke Drive pengguna itu.
const Drive = {
  SCOPE: "https://www.googleapis.com/auth/drive.file",
  token: null, exp: 0, tokenClient: null, pending: null, inflight: null, folderP: null, subP: {},

  isConnected() { return !!this.token && Date.now() < this.exp; },

  // Library Google dimuat async (app.js). Tunggu sampai siap, supaya klik cepat tidak langsung gagal.
  whenReady(ms = 10000) {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      (function poll() {
        if (window.google && google.accounts && google.accounts.oauth2) return resolve();
        if (Date.now() - t0 > ms) return reject(Object.assign(new Error("lib_not_loaded"), { code: "lib_not_loaded" }));
        setTimeout(poll, 150);
      })();
    });
  },

  // Satu permintaan login pada satu waktu: klik ganda memakai Promise yang sama (sebelumnya yang pertama menggantung selamanya).
  // PENTING: requestAccessToken dipanggil secara sinkron bila library sudah siap, agar popup tetap dianggap berasal dari klik pengguna.
  getToken() {
    if (this.isConnected()) return Promise.resolve(this.token);
    if (this.inflight) return this.inflight;
    const run = () => new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      try {
        this.tokenClient = this.tokenClient || google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          scope: this.SCOPE,
          callback: r => {
            const p = this.pending; this.pending = null; if (!p) return;
            if (r.error) return p.reject(Object.assign(new Error(r.error_description || r.error), { code: r.error }));
            // Pengguna bisa saja tidak mencentang izin Drive pada layar persetujuan
            if (google.accounts.oauth2.hasGrantedAllScopes && !google.accounts.oauth2.hasGrantedAllScopes(r, this.SCOPE))
              return p.reject(Object.assign(new Error("scope_not_granted"), { code: "scope_not_granted" }));
            this.token = r.access_token; this.exp = Date.now() + (r.expires_in - 60) * 1000; p.resolve(this.token);
          },
          error_callback: e => { const p = this.pending; this.pending = null; if (p) p.reject(Object.assign(new Error(e.type || "login_cancelled"), { code: e.type || "login_cancelled" })); }
        });
        this.tokenClient.requestAccessToken({ prompt: "" });
      } catch (e) { this.pending = null; reject(e); }
    });
    const ready = (window.google && google.accounts && google.accounts.oauth2) ? run() : this.whenReady().then(run);
    return (this.inflight = ready.finally(() => { this.inflight = null; }));
  },

  async api(url, token, opts = {}) {
    let res;
    try { res = await fetch(url, { ...opts, headers: { Authorization: "Bearer " + token, ...(opts.headers || {}) } }); }
    catch { throw Object.assign(new Error("network"), { code: "network" }); }
    if (res.status === 401) { this.token = null; this.exp = 0; this.folderP = null; this.subP = {}; }
    if (!res.ok) {
      let detail = ""; try { detail = (await res.json()).error.message || ""; } catch {}
      throw Object.assign(new Error("Drive error " + res.status), { status: res.status, detail });
    }
    return res.json();
  },

  // Folder dicari/dibuat sekali; beberapa upload bersamaan memakai Promise yang sama (tidak membuat folder kembar).
  ensureFolder(token) {
    if (this.folderP) return this.folderP;
    this.folderP = (async () => {
      const name = CONFIG.DRIVE_FOLDER_NAME;
      const q = encodeURIComponent(`name='${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const found = await this.api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, token);
      if (found.files && found.files.length) return found.files[0].id;
      const made = await this.api("https://www.googleapis.com/drive/v3/files?fields=id", token, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" })
      });
      return made.id;
    })().catch(e => { this.folderP = null; throw e; });
    return this.folderP;
  },

  // Subfolder per pengguna di dalam folder utama. Dicari dulu (nama sama = dipakai ulang), kalau belum ada baru dibuat.
  ensureSubfolder(token, parent, name) {
    const key = parent + "/" + name;
    if (this.subP[key]) return this.subP[key];
    this.subP[key] = (async () => {
      const esc = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
      const q = encodeURIComponent(`name='${esc}' and '${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
      const found = await this.api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, token);
      if (found.files && found.files.length) return found.files[0].id;
      const made = await this.api("https://www.googleapis.com/drive/v3/files?fields=id", token, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parent] })
      });
      return made.id;
    })().catch(e => { delete this.subP[key]; throw e; });
    return this.subP[key];
  },

  async upload(blob, filename, subName) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getToken();
      try {
        let parent = await this.ensureFolder(token);
        if (subName) parent = await this.ensureSubfolder(token, parent, subName);
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify({ name: filename, parents: [parent], mimeType: blob.type || "image/png" })], { type: "application/json" }));
        form.append("file", blob);
        return await this.api("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", token, { method: "POST", body: form });
      } catch (e) {
        // Folder terhapus permanen di Drive (404): buat ulang folder dan coba sekali lagi.
        if (attempt === 0 && e.status === 404) { this.folderP = null; this.subP = {}; continue; }
        throw e;
      }
    }
  },

  // Pastikan subfolder pengguna ada (tanpa mengunggah apa pun) dan kembalikan id-nya.
  async folderFor(subName) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getToken();
      try { return await this.ensureSubfolder(token, await this.ensureFolder(token), subName); }
      catch (e) { if (attempt === 0 && e.status === 404) { this.folderP = null; this.subP = {}; continue; } throw e; }
    }
  },

  // Bagikan folder: siapa pun yang punya link boleh MELIHAT (bukan mengubah). Isi folder ikut terbuka, termasuk foto yang diunggah kemudian.
  // Scope drive.file cukup karena folder ini dibuat oleh aplikasi sendiri.
  async share(folderId) {
    const token = await this.getToken();
    await this.api(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions?fields=id`, token, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" })
    });
    return `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
  },

  // Pesan kesalahan yang bisa dimengerti pengguna.
  explain(e) {
    const code = (e && (e.code || e.status)) || "", d = (e && e.detail) || "";
    if (code === "network") return "tidak ada koneksi internet.";
    if (code === "lib_not_loaded") return "library Google belum termuat. Periksa koneksi internet atau matikan pemblokir iklan/privasi untuk situs ini.";
    if (code === "popup_closed") return "jendela login Google ditutup sebelum selesai.";
    if (code === "popup_failed_to_open") return "popup login diblokir browser. Izinkan popup untuk situs ini, lalu coba lagi.";
    if (code === "access_denied") return "izin akses Google Drive ditolak.";
    if (code === "scope_not_granted") return "izin Google Drive belum dicentang pada layar persetujuan. Coba lagi dan setujui akses.";
    if (code === "invalid_client" || code === "unauthorized_client") return "Client ID Google tidak valid untuk alamat website ini (cek js/config.js dan Authorized JavaScript origins).";
    if (code === 401) return "sesi Google berakhir. Klik tombol sekali lagi.";
    if (code === 403) {
      if (/not been used|disabled|accessNotConfigured/i.test(d)) return "Google Drive API belum diaktifkan di proyek Google Cloud.";
      if (/quota|storage/i.test(d)) return "penyimpanan Google Drive penuh.";
      if (/sharing|permission|domain|policy/i.test(d)) return "akun Google ini tidak diizinkan membagikan folder lewat link (biasanya akun kantor/sekolah dengan aturan admin). Pakai akun Gmail pribadi.";
      return "akses ditolak (403). Pastikan akun ini terdaftar sebagai Test user, atau OAuth consent screen sudah In production.";
    }
    if (code === 404) return "folder tujuan tidak ditemukan. Coba lagi.";
    if (code === 429 || (typeof code === "number" && code >= 500)) return "Google Drive sedang sibuk. Coba lagi sebentar lagi.";
    return (e && e.message) || "terjadi kesalahan tak dikenal.";
  }
};
