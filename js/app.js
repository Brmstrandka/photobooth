// Alur: pilih layout (jumlah foto mengikuti layout) -> 5 foto otomatis (layar penuh) -> pilih terbaik -> edit & simpan.
(() => {
  const $ = UI.$;
  const S = { n: 0, shots: [], picked: [], theme: "all", kind: "all", tpl: null, busy: false };
  const msg = (id, t) => ($(id).textContent = t);
  const configured = () => !CONFIG.GOOGLE_CLIENT_ID.startsWith("ISI_");
  // Drive hanya aktif jika dinyalakan di config. Kalau mati, tidak ada login/popup Google sama sekali.
  const driveOn = CONFIG.ENABLE_DRIVE && configured();
  if (driveOn) { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; document.head.appendChild(s); }
  else {
    ["btnDrive", "btnConnect", "driveMsg", "btnQR", "qrBox"].forEach(id => ($(id).hidden = true));
    $("chkAuto").checked = false; $("chkAuto").closest("label").hidden = true;
    $("guestName").closest(".row").style.display = "none"; document.querySelector('label[for="guestName"]').style.display = "none";
    $("footNote").textContent = "Foto diproses di browser kamu dan tidak diunggah ke mana pun.";
  }

  // ---- Langkah 1: pilih layout (jumlah foto ikut layout) ----
  const KIND_NAME = Object.fromEntries(KINDS.map(k => [k.id, k.name]));
  // label kartu, mis. "Strip ganda · 3 foto" (diberi nomor bila ada yang kembar)
  (() => {
    const seen = {}, total = {};
    TEMPLATES.forEach(t => { const k = [t.theme, t.kind, t.n].join(); total[k] = (total[k] || 0) + 1; });
    TEMPLATES.forEach(t => {
      const k = [t.theme, t.kind, t.n].join(); seen[k] = (seen[k] || 0) + 1;
      t.label = `${KIND_NAME[t.kind]} · ${t.n} Foto` + (total[k] > 1 ? ` #${seen[k]}` : "");
    });
  })();

  function drawLayouts() {
    const themes = [{ id: "all", label: "Semua tema" }, ...THEMES.map(t => ({ id: t.id, label: t.name }))];
    UI.chips($("themeChips"), themes, S.theme, id => { S.theme = id; drawLayouts(); });
    UI.chips($("kindChips"), KINDS.map(k => ({ id: k.id, label: k.name })), S.kind, id => { S.kind = id; drawLayouts(); });
    const list = TEMPLATES.filter(t => t.n <= CONFIG.TOTAL_SHOTS && (S.theme === "all" || t.theme === S.theme) && (S.kind === "all" || t.kind === S.kind));
    UI.layoutCards($("layTrack"), list, chooseLayout);
    $("tplEmpty").hidden = list.length > 0;
    $("layTrack").scrollLeft = 0;
  }
  const slide = d => $("layTrack").scrollBy({ left: d * Math.max(260, $("layTrack").clientWidth * 0.7), behavior: "smooth" });
  $("layPrev").onclick = () => slide(-1);
  $("layNext").onclick = () => slide(1);

  function chooseLayout(t) {
    if (S.tpl && S.tpl.n !== t.n) { S.shots = []; S.picked = []; }
    S.tpl = t; S.n = t.n;
    msg("layoutInfo", `Layout: ${t.label} · kamu akan difoto ${CONFIG.TOTAL_SHOTS} kali (hitung mundur ${CONFIG.SHOT_GAP} detik), lalu memilih ${t.n} foto terbaik.`);
    UI.show(2); refreshShoot(); ensureCamera();
  }
  $("btnBackLayout").onclick = () => { if (!S.busy) { stopCamera(); UI.show(1); } };

  // ---- Langkah 2: kamera layar penuh + foto otomatis ----
  function drawShotGrid() {
    const g = $("shotGrid"); g.innerHTML = "";
    for (let i = 0; i < CONFIG.TOTAL_SHOTS; i++) {
      const c = document.createElement("div"); c.className = "cell";
      if (S.shots[i]) c.appendChild(UI.thumb(S.shots[i]));
      g.appendChild(c);
    }
  }
  function refreshShoot() {
    $("btnShoot").disabled = !Camera.stream || S.busy;
    $("btnBackLayout").disabled = S.busy;
    $("btnShoot").textContent = `Mulai ${CONFIG.TOTAL_SHOTS} foto`;
    msg("progress", S.busy || S.shots.length ? `Foto ${S.shots.length} dari ${CONFIG.TOTAL_SHOTS}` : "");
    drawShotGrid();
    const ht = $("hudThumbs"); ht.innerHTML = "";
    S.shots.forEach(c => ht.appendChild(UI.thumb(c)));
  }
  const driveUi = () => { if (driveOn) $("btnConnect").textContent = Drive.isConnected() ? "Drive terhubung ✓" : "Hubungkan Drive"; };
  async function connectDrive() {
    try { await Drive.getToken(); driveUi(); msg("driveMsg", ""); return true; }
    catch (e) { driveUi(); msg("driveMsg", "Drive belum terhubung: " + Drive.explain(e)); return false; }
  }

  // PERBAIKAN: kamera dimatikan setelah memotret / keluar dari langkah 2 (sebelumnya lampu kamera menyala terus
  // sampai tab ditutup) dan dinyalakan lagi otomatis saat kembali ke langkah 2.
  function stopCamera() {
    Camera.stop(); $("camMsg").hidden = false; $("btnCam").hidden = false;
    msg("camMsg", "Kamera belum aktif"); refreshShoot();
  }
  let camStarting = false;
  async function startCamera() {
    if (camStarting || Camera.stream) return;
    camStarting = true;
    try { await Camera.start($("video")); $("camMsg").hidden = true; $("btnCam").hidden = true; }
    catch (e) {
      const m = { NotAllowedError: "Kamera ditolak. Izinkan akses kamera di pengaturan browser, lalu coba lagi.",
                  NotFoundError: "Kamera tidak ditemukan di perangkat ini.",
                  NotReadableError: "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu, lalu coba lagi." };
      $("camMsg").hidden = false; msg("camMsg", m[e && e.name] || (navigator.mediaDevices ? "Kamera tidak bisa dibuka. Coba lagi." : "Kamera hanya bisa dipakai lewat https atau localhost."));
    }
    camStarting = false; refreshShoot();
  }
  const ensureCamera = () => startCamera();
  $("btnCam").onclick = startCamera;

  $("btnShoot").onclick = async () => {
    if (S.busy || !Camera.stream) return; // PERBAIKAN: klik ganda tidak lagi menjalankan dua sesi foto sekaligus
    S.busy = true; refreshShoot();
    const vf = document.querySelector(".viewfinder");
    // PERBAIKAN: login Drive dilakukan SEBELUM layar penuh (popup Google sering terblokir/tertutup saat fullscreen)
    if (driveOn && $("chkAuto").checked && !Drive.isConnected()) await connectDrive();
    // layar penuh: Fullscreen API (harus dari klik), dengan cadangan CSS fixed bila ditolak browser
    vf.classList.add("full"); document.body.classList.add("shooting");
    try { if (vf.requestFullscreen && !document.fullscreenElement) await vf.requestFullscreen(); } catch {}
    S.shots = []; refreshShoot();
    const cd = $("countdown"), fl = $("flash");
    let ok = false;
    try {
      for (let i = 0; i < CONFIG.TOTAL_SHOTS; i++) {
        msg("hudCount", `Foto ${i + 1} dari ${CONFIG.TOTAL_SHOTS}`);
        cd.hidden = false;
        await Camera.countdown(i === 0 ? CONFIG.FIRST_DELAY : CONFIG.SHOT_GAP, n => (cd.textContent = n || ""));
        cd.hidden = true;
        fl.classList.remove("go"); void fl.offsetWidth; fl.classList.add("go");
        S.shots.push(Camera.capture()); refreshShoot();
        if (i < CONFIG.TOTAL_SHOTS - 1) await new Promise(r => setTimeout(r, 600)); // beri waktu lihat hasil jepretan
      }
      ok = true;
    } catch (e) {
      msg("progress", "Pemotretan terhenti: " + (e && e.message ? e.message : "terjadi kesalahan") + " Silakan coba lagi.");
    } finally {
      cd.hidden = true; S.busy = false;
      vf.classList.remove("full"); document.body.classList.remove("shooting");
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch {} }
      refreshShoot();
    }
    if (!ok) return;
    await new Promise(r => setTimeout(r, 700));
    stopCamera();
    startPick();
  };

  // ---- Langkah 3: pilih foto terbaik ----
  function startPick() {
    S.picked = []; UI.show(3); drawPick();
  }
  function drawPick() {
    const g = $("pickGrid"); g.innerHTML = "";
    S.shots.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "cell"; b.setAttribute("aria-label", "Foto " + (i + 1));
      b.appendChild(UI.thumb(c));
      const pos = S.picked.indexOf(i);
      if (pos >= 0) { b.classList.add("on"); b.insertAdjacentHTML("beforeend", `<span class="badge">${pos + 1}</span>`); }
      b.onclick = () => {
        const p = S.picked.indexOf(i);
        if (p >= 0) S.picked.splice(p, 1); else if (S.picked.length < S.n) S.picked.push(i);
        drawPick();
      };
      g.appendChild(b);
    });
    msg("pickInfo", `Terpilih ${S.picked.length} dari ${S.n}. Urutan klik menentukan urutan di strip.`);
    $("btnPickNext").disabled = S.picked.length !== S.n;
  }
  $("btnRetake").onclick = () => { S.shots = []; UI.show(2); refreshShoot(); ensureCamera(); };
  $("btnPickNext").onclick = () => chooseTemplate(S.tpl);

  // ---- Langkah 4: editor + hasil ----
  const photos = () => S.picked.map(i => S.shots[i]);
  Editor.init($("strip"),
    it => { $("btnDelItem").disabled = !it; if (it) { $("itemSize").value = it.size; if (it.t === "x") { $("itemColor").value = it.color; Editor.textFont = it.f; drawFonts(); } } },
    k => ($("zoom").value = Editor.xf(k).z));

  function setTab(name) {
    Editor.mode = name;
    document.querySelectorAll("#tabs button").forEach(b => b.setAttribute("aria-pressed", b.dataset.tab === name));
    document.querySelectorAll(".pane").forEach(p => (p.hidden = p.dataset.pane !== name));
    $("strip").style.cursor = name === "coret" ? "crosshair" : "grab";
  }
  document.querySelectorAll("#tabs button").forEach(b => (b.onclick = () => setTab(b.dataset.tab)));

  // bahan pilihan gaya (dibuat sekali)
  BACKGROUNDS.forEach(bg => {
    const b = document.createElement("button"); b.type = "button"; b.className = "sw"; b.style.backgroundImage = `url(${Strip.swatch(bg)})`;
    b.setAttribute("aria-label", "Latar " + bg.c.join(" ")); b.onclick = () => { Editor.st.bg = bg; Editor.redraw(); }; $("bgSwatches").appendChild(b);
  });
  $("bgColor").oninput = e => { Editor.st.bg = { t: "solid", c: [e.target.value] }; Editor.redraw(); };
  const shapeBtns = () => UI.chips($("shapeChips"), SHAPES.map(x => ({ id: x.id, label: x.name })), Editor.st.shape, id => { Editor.st.shape = id; shapeBtns(); Editor.redraw(); });

  function drawFonts() {
    const fl = FONTS[S.tpl.theme] || FONTS.polos;
    UI.chips($("fontChips"), fl.map(f => ({ id: f, label: f })), Editor.textFont, f => {
      Editor.textFont = f; const it = Editor.selected();
      if (it && it.t === "x") { it.f = f; Editor.redraw(); }
      drawFonts();
    });
    [...$("fontChips").children].forEach(b => (b.style.fontFamily = `"${b.textContent}", cursive`));
  }

  // keep = true: ganti layout dari tab "Layout" (filter, warna & bentuk dipertahankan)
  async function chooseTemplate(t, keep) {
    S.tpl = t; msg("driveMsg", ""); driveUi(); if (!keep) UI.show(4);
    const prev = keep && Editor.st ? { filter: Editor.st.filter, bg: Editor.st.bg, shape: Editor.st.shape } : null;
    Editor.open(t, photos());
    if (prev) { Object.assign(Editor.st, prev); await Editor.redraw(); }
    $("selFilter").value = Editor.st.filter; $("zoom").value = 1;
    UI.layoutCards($("layoutMini"), TEMPLATES.filter(x => x.n === S.n), x => chooseTemplate(x, true), t.id, true);
    $("customOnly").hidden = !t.custom; $("fixedNote").hidden = !!t.custom;
    shapeBtns();
    const set = [...new Set([...(STICKER_SETS[t.theme] || []), ...STICKER_SETS.polos])];
    $("stickerTray").innerHTML = "";
    set.forEach(id => {
      const b = document.createElement("button"); b.type = "button"; b.className = "stk"; b.setAttribute("aria-label", "Stiker " + id);
      const im = new Image(); im.src = STICKER_URL(id); im.alt = ""; b.appendChild(im);
      b.onclick = () => Editor.addItem("i", id); $("stickerTray").appendChild(b);
    });
    const fl = FONTS[t.theme] || FONTS.polos;
    if (!fl.includes(Editor.textFont)) Editor.textFont = fl[0];
    fl.forEach(f => document.fonts.load(`40px "${f}"`, "Aa").catch(() => {}));
    drawFonts();
    setTab(keep ? Editor.mode : "gaya");
  }

  $("selFilter").oninput = e => { Editor.st.filter = e.target.value; Editor.redraw(); };
  $("zoom").oninput = e => Editor.setZoom(+e.target.value);
  $("btnAddText").onclick = () => { const v = $("txtItem").value.trim(); if (v) { Editor.textColor = $("itemColor").value; Editor.addItem("x", v); $("txtItem").value = ""; } };
  $("btnAddDate").onclick = () => { Editor.textColor = $("itemColor").value; Editor.addItem("x", new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })); };
  $("itemSize").oninput = e => { const it = Editor.selected(); if (it) { it.size = +e.target.value; Editor.redraw(); } };
  $("itemColor").oninput = e => { Editor.textColor = e.target.value; const it = Editor.selected(); if (it && it.t === "x") { it.color = e.target.value; Editor.redraw(); } };
  $("btnDelItem").onclick = () => Editor.removeSelected();
  $("penColor").oninput = e => (Editor.pen.c = e.target.value);
  $("penSize").oninput = e => (Editor.pen.w = +e.target.value);
  $("btnUndo").onclick = () => Editor.undo();
  $("btnClear").onclick = () => Editor.clearStrokes();

  $("btnAgain").onclick = () => { guestStamp = null; $("qrBox").hidden = true; $("guestName").value = ""; S.shots = []; S.picked = []; S.tpl = null; UI.show(1); };
  // Nama subfolder Drive: "<nama> - <tanggal>". Nama kosong -> "Tamu <tanggal> <jam>" (jam dikunci per sesi agar foto satu orang tetap satu folder).
  const pad = n => String(n).padStart(2, "0");
  let guestStamp = null;
  const guestFolder = () => {
    const d = new Date(), date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const name = ($("guestName").value || "").replace(/[\\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
    if (name) return `${name} - ${date}`;
    guestStamp = guestStamp || `${pad(d.getHours())}.${pad(d.getMinutes())}`;
    return `Tamu ${date} ${guestStamp}`;
  };
  const fname = () => `${CONFIG.FILE_PREFIX}-${Date.now()}.png`;

  $("btnDownload").onclick = async () => {
    // Token Drive diminta LEBIH DULU, selagi masih di dalam klik pengguna (popup login tidak diblokir browser,
    // terutama Safari/iOS). Pembuatan PNG berjalan paralel. Sebelumnya, bila token sudah habis, unggahan dilewati tanpa pesan.
    const tokenP = driveOn && $("chkAuto").checked ? Drive.getToken().then(() => null, e => e) : null;
    let blob; try { blob = await Editor.exportBlob(); } catch (e) { return msg("driveMsg", "Gagal membuat gambar: " + e.message); }
    const a = document.createElement("a");
    // PERBAIKAN: URL tidak langsung dicabut & anchor dipasang di DOM, karena Safari/Firefox bisa membatalkan unduhan.
    a.href = URL.createObjectURL(blob); a.download = fname(); a.style.display = "none"; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    if (tokenP) {
      const err = await tokenP; driveUi();
      if (err) msg("driveMsg", "PNG sudah diunduh, tetapi tidak terkirim ke Drive: " + Drive.explain(err));
      else saveToDrive(blob);
    }
  };
  $("btnConnect").onclick = () => configured() ? connectDrive() : msg("driveMsg", "Isi GOOGLE_CLIENT_ID di js/config.js dulu.");

  let driveBusy = false;
  const savedSubs = new Set(); // subfolder yang sudah berisi foto di sesi ini
  async function saveToDrive(blob) {
    if (!configured()) return msg("driveMsg", "Isi GOOGLE_CLIENT_ID di js/config.js dulu.");
    if (driveBusy) return;
    driveBusy = true; $("btnDrive").disabled = true; msg("driveMsg", "Mengunggah ke Drive…");
    let ok = false;
    try {
      // getToken dipanggil sebelum await apa pun (tetap dalam klik pengguna) lalu PNG dibuat paralel.
      const tokenP = Drive.getToken(); tokenP.catch(() => {});
      const png = blob || await Editor.exportBlob();
      await tokenP; driveUi();
      const sub = guestFolder();
      const f = await Drive.upload(png, fname(), sub);
      const el = $("driveMsg"); el.textContent = `Tersimpan di folder "${CONFIG.DRIVE_FOLDER_NAME} / ${sub}". `;
      if (f && f.webViewLink) { const l = document.createElement("a"); l.href = f.webViewLink; l.target = "_blank"; l.rel = "noopener"; l.textContent = "Buka di Drive"; el.appendChild(l); }
      savedSubs.add(sub); ok = true;
    } catch (e) { driveUi(); msg("driveMsg", "Gagal menyimpan ke Drive: " + Drive.explain(e)); }
    driveBusy = false; $("btnDrive").disabled = false;
    return ok;
  }
  $("btnDrive").onclick = () => saveToDrive();

  // ---- QR ke folder Drive pengguna ----
  const hideQR = () => { $("qrBox").hidden = true; };
  $("guestName").addEventListener("input", hideQR);   // nama berubah = folder lain, QR lama tidak berlaku
  function drawQR(link) {
    const q = QR.make(link), quiet = 4, cell = Math.max(3, Math.floor(560 / (q.count + quiet * 2)));
    const size = (q.count + quiet * 2) * cell, cv = $("qrCanvas"); cv.width = cv.height = size;
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, size, size); g.fillStyle = "#000";
    for (let r = 0; r < q.count; r++) for (let c = 0; c < q.count; c++) if (q.isDark(r, c)) g.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
  }
  let qrBusy = false, qrName = "qr";
  $("btnQR").onclick = async () => {
    if (qrBusy) return; qrBusy = true; $("btnQR").disabled = true; hideQR();
    const tokenP = Drive.getToken(); tokenP.catch(() => {}); // diminta saat masih di dalam klik (popup login tidak diblokir)
    try {
      msg("driveMsg", "Menyiapkan QR…");
      await tokenP; driveUi();
      while (driveBusy) await new Promise(r => setTimeout(r, 200)); // tunggu unggahan yang sedang berjalan
      const sub = guestFolder();
      if (!savedSubs.has(sub) && !(await saveToDrive())) return; // pesan error sudah ditampilkan oleh saveToDrive
      msg("driveMsg", "Membuat link QR…");
      const link = await Drive.share(await Drive.folderFor(sub));
      drawQR(link); qrName = "QR-" + sub.replace(/\s+/g, "_");
      $("qrLink").href = link; $("qrBox").hidden = false;
      msg("driveMsg", `QR siap untuk folder "${sub}".`);
      $("qrBox").scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) { driveUi(); msg("driveMsg", "Gagal membuat QR: " + Drive.explain(e)); }
    finally { qrBusy = false; $("btnQR").disabled = false; } // finally: tombol tetap pulih walau keluar lewat return
  };
  $("btnQRDl").onclick = () => $("qrCanvas").toBlob(b => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = qrName + ".png";
    a.style.display = "none"; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }, "image/png");

  drawLayouts();
  drawShotGrid();
})();
