// Pembangun tampilan: pilihan jumlah, grid foto, daftar template.
const UI = {
  $: id => document.getElementById(id),
  show(n) {
    document.querySelectorAll(".step").forEach(s => (s.hidden = s.id !== "step" + n));
    document.getElementById("booth").scrollIntoView({ behavior: "smooth" });
  },
  chips(el, items, active, onPick, cls = "chip") {
    el.innerHTML = "";
    items.forEach(it => {
      const b = document.createElement("button");
      b.type = "button"; b.className = cls; b.textContent = it.label;
      b.setAttribute("aria-pressed", it.id === active);
      b.onclick = () => onPick(it.id);
      el.appendChild(b);
    });
  },
  thumb(canvas) {
    const i = new Image(); i.src = canvas.toDataURL("image/jpeg", 0.8); i.alt = ""; return i;
  },
  // Ukuran cetak (inci, 300 dpi) dibulatkan ke 0,5, ditulis "panjang × lebar".
  size(t) {
    const r = v => Math.round(v / 300 * 2) / 2;
    return `${Math.max(r(t.w), r(t.h))} × ${Math.min(r(t.w), r(t.h))} in`;
  },
  // Pratinjau layout: kotak slot foto berwarna + bingkai template di atasnya.
  // Tanpa file thumbnail: gambar template asli diunduh hanya saat kartu terlihat (lazy), lalu diperkecil ke 450px
  // dan disimpan di pvCache. Gambar penuh tidak ditahan di memori, dan file yang sama dipakai ulang oleh cache browser saat render akhir.
  pvCache: {},
  previewImage(src) {
    return this.pvCache[src] || (this.pvCache[src] = new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => {
        const h = 450, c = document.createElement("canvas"); c.width = Math.max(1, Math.round(i.naturalWidth * h / i.naturalHeight)); c.height = h;
        const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(i, 0, 0, c.width, h); res(c);
      };
      i.onerror = () => { delete this.pvCache[src]; rej(new Error("Gagal memuat " + src)); };
      i.src = src;
    }));
  },
  preview(t, io) {
    const c = document.createElement("canvas"), k = 450 / t.h; c.width = Math.round(t.w * k); c.height = 450;
    const x = c.getContext("2d");
    const paint = img => {
      x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
      const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, "#bfe3ff"); g.addColorStop(1, "#cfe9a8");
      x.fillStyle = g; t.slots.forEach(([sx, sy, sw, sh]) => x.fillRect(sx * k, sy * k, sw * k, sh * k));
      if (img) x.drawImage(img, 0, 0, c.width, c.height);
    };
    paint(null);
    if (t.img) {
      const load = () => UI.previewImage(t.img).then(paint).catch(() => {});
      if (io) { c._load = load; io.observe(c); } else load();
    }
    return c;
  },
  // Kartu layout. mini = versi kecil untuk tab "Layout" di editor.
  layoutCards(el, list, onPick, activeId, mini) {
    el.innerHTML = "";
    // Lazy-load: pratinjau baru diunduh ketika kartunya hampir terlihat (rootMargin 300px). Observer lama dibuang tiap kali daftar digambar ulang.
    if (el._io) el._io.disconnect();
    const io = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { o.unobserve(e.target); if (e.target._load) e.target._load(); } }), { rootMargin: "300px" })
      : null;
    el._io = io;
    list.forEach(t => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "lay" + (mini ? " mini" : "");
      b.setAttribute("aria-pressed", t.id === activeId);
      const badge = t.custom ? "Warna bebas" : (THEMES.find(x => x.id === t.theme) || {}).name;
      const pv = document.createElement("span"); pv.className = "lay-pv";
      if (badge && !mini) pv.insertAdjacentHTML("beforeend", `<em class="lay-badge">${badge}</em>`);
      pv.appendChild(UI.preview(t, io)); b.appendChild(pv);
      b.insertAdjacentHTML("beforeend", mini
        ? `<small>${t.label}</small>`
        : `<strong>${t.label}</strong><small>${t.n} foto · ${UI.size(t)}</small>`);
      b.onclick = () => onPick(t);
      el.appendChild(b);
    });
  }
};
