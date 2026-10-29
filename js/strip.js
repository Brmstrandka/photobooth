// Menggambar strip: latar, foto (bentuk + posisi), template, coretan, stiker.
const Strip = {
  cache: {},
  RADIUS: 0.055, // kebulatan sudut (0 = kotak, 0.12 = versi lama). Makin kecil makin tegas.
  frameColor: new WeakMap(),
  load(src) {
    return this.cache[src] || (this.cache[src] = new Promise((res, rej) => {
      const i = new Image(); i.onload = () => res(i);
      // PERBAIKAN: promise gagal dihapus dari cache supaya bisa dicoba ulang (sebelumnya gagal selamanya).
      i.onerror = () => { delete this.cache[src]; rej(new Error("Template tidak ditemukan: " + src)); };
      i.src = src;
    }));
  },

  fill(ctx, w, h, bg) {
    const [a, b] = bg.c;
    if (bg.t === "solid") { ctx.fillStyle = a; return ctx.fillRect(0, 0, w, h); }
    if (bg.t === "grad") { const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, a); g.addColorStop(1, b); ctx.fillStyle = g; return ctx.fillRect(0, 0, w, h); }
    const t = document.createElement("canvas"); t.width = t.height = 48; const x = t.getContext("2d");
    x.fillStyle = a; x.fillRect(0, 0, 48, 48); x.fillStyle = b; x.strokeStyle = b; x.lineWidth = 3;
    if (bg.t === "dots") { x.beginPath(); x.arc(24, 24, 6, 0, 7); x.fill(); }
    if (bg.t === "stripe") x.fillRect(0, 0, 24, 48);
    if (bg.t === "check") { x.fillRect(0, 0, 24, 24); x.fillRect(24, 24, 24, 24); }
    if (bg.t === "grid") { x.strokeRect(0, 0, 48, 48); }
    ctx.fillStyle = ctx.createPattern(t, "repeat"); ctx.fillRect(0, 0, w, h);
  },
  swatch(bg) { const c = document.createElement("canvas"); c.width = c.height = 64; this.fill(c.getContext("2d"), 64, 64, bg); return c.toDataURL(); },

  path(ctx, shape, x, y, w, h) {
    ctx.beginPath();
    if (shape === "round") {
      const r = Math.min(w, h) * this.RADIUS;
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); // cadangan untuk Safari/browser lama yang belum punya roundRect
      else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
    }
    else if (shape === "oval") ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shape === "arch") { const r = w / 2; ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
    else ctx.rect(x, y, w, h);
  },


  // Warna bingkai template tepat di luar tiap slot (dirata-rata), dipakai mengisi sudut yang terbuka saat bentuk foto bukan kotak.
  edgeColor(img, tpl, slot) {
    let m = this.frameColor.get(img); if (!m) this.frameColor.set(img, (m = {}));
    const key = slot.join(); if (m[key]) return m[key];
    const c = document.createElement("canvas"); c.width = tpl.w; c.height = tpl.h;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, tpl.w, tpl.h);
    // PERBAIKAN: bila canvas "tainted" (mis. halaman dibuka lewat file://), getImageData melempar error dan seluruh render gagal.
    try { x.getImageData(0, 0, 1, 1); } catch { return (m[key] = null); }
    const [sx, sy, sw, sh] = slot, o = 6, pts = [];
    for (let i = 0; i <= 8; i++) {
      const fx = sx + (sw * i) / 8, fy = sy + (sh * i) / 8;
      pts.push([fx, sy - o], [fx, sy + sh + o], [sx - o, fy], [sx + sw + o, fy]);
    }
    let r = 0, g = 0, b = 0, n = 0;
    for (const [px, py] of pts) {
      if (px < 0 || py < 0 || px >= tpl.w || py >= tpl.h) continue;
      const d = x.getImageData(px, py, 1, 1).data; if (d[3] < 200) continue;
      r += d[0]; g += d[1]; b += d[2]; n++;
    }
    return (m[key] = n ? `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})` : null);
  },

  // Ukuran gambar foto di dalam slot + batas geser (agar slot selalu terisi penuh).
  fit(s, slot, z, bleed) {
    const bx = slot[0] - bleed, by = slot[1] - bleed, bw = slot[2] + 2 * bleed, bh = slot[3] + 2 * bleed;
    const r = Math.max(bw / s.width, bh / s.height) * z, dw = s.width * r, dh = s.height * r;
    return { bx, by, bw, bh, dw, dh, mx: (dw - bw) / 2, my: (dh - bh) / 2 };
  },

  // Safari/iOS belum mendukung ctx.filter: filter foto diam-diam tidak diterapkan (di preview maupun file unduhan).
  // Cadangan: terapkan filter per piksel.
  hasFilter: (() => { try { return "filter" in CanvasRenderingContext2D.prototype; } catch { return false; } })(),
  pixelFilter(ctx, w, h, filter) {
    const d = ctx.getImageData(0, 0, w, h), p = d.data, cl = v => (v < 0 ? 0 : v > 255 ? 255 : v);
    const ops = [...filter.matchAll(/(\w+)\(([\d.]+)\)/g)].map(m => [m[1], +m[2]]);
    for (let i = 0; i < p.length; i += 4) {
      let r = p[i], g = p[i + 1], b = p[i + 2];
      for (const [op, v] of ops) {
        if (op === "grayscale") { const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; r += (y - r) * v; g += (y - g) * v; b += (y - b) * v; }
        else if (op === "sepia") {
          const nr = 0.393 * r + 0.769 * g + 0.189 * b, ng = 0.349 * r + 0.686 * g + 0.168 * b, nb = 0.272 * r + 0.534 * g + 0.131 * b;
          r += (nr - r) * v; g += (ng - g) * v; b += (nb - b) * v;
        }
        else if (op === "saturate") { const y = 0.213 * r + 0.715 * g + 0.072 * b; r = y + (r - y) * v; g = y + (g - y) * v; b = y + (b - y) * v; }
        else if (op === "contrast") { r = (r - 128) * v + 128; g = (g - 128) * v + 128; b = (b - 128) * v + 128; }
        else if (op === "brightness") { r *= v; g *= v; b *= v; }
        r = cl(r); g = cl(g); b = cl(b);
      }
      p[i] = r; p[i + 1] = g; p[i + 2] = b;
    }
    ctx.putImageData(d, 0, 0);
  },

  font(it) { return `${it.size}px "${it.f || "Pacifico"}", cursive`; },
  bounds(ctx, it) {
    if (it.t === "i") return { w: it.size, h: it.size };
    ctx.font = this.font(it); return { w: Math.max(ctx.measureText(it.s).width, 20), h: it.size * 1.15 };
  },
  sticker(id) { return this.load(STICKER_URL(id)); },
  dark(hex) { const n = parseInt((hex || "#000").slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 150; },

  async render(canvas, photos, tpl, st) {
    // muat semua bahan dulu (template, stiker, font) supaya penggambaran di bawah tidak terpotong-potong
    const img = tpl.img ? await this.load(tpl.img) : null;
    const stk = await Promise.all(st.items.map(it => (it.t === "i" ? this.sticker(it.s).catch(() => null) : null)));
    const fonts = [...new Set(st.items.filter(it => it.t === "x").map(it => it.f))];
    try { await Promise.all(fonts.map(f => document.fonts.load(`40px "${f}"`, "Aa"))); } catch {}
    canvas.width = tpl.w; canvas.height = tpl.h;
    const ctx = canvas.getContext("2d");
    this.fill(ctx, tpl.w, tpl.h, tpl.custom ? st.bg : { t: "solid", c: ["#ffffff"] });

    for (const slot of tpl.slots) {
      const s = photos[slot[4]]; if (!s) continue;
      const t = st.xf[slot[4]] || { dx: 0, dy: 0, z: 1 }, f = this.fit(s, slot, t.z, tpl.custom ? 0 : 4);
      const ox = Math.max(-f.mx, Math.min(f.mx, t.dx)), oy = Math.max(-f.my, Math.min(f.my, t.dy));
      const shape = st.shape || "rect";
      if (!tpl.custom && img && shape !== "rect") {
        const fc = this.edgeColor(img, tpl, slot);
        if (fc) { ctx.fillStyle = fc; ctx.fillRect(f.bx, f.by, f.bw, f.bh); }
      }
      ctx.save();
      this.path(ctx, shape, f.bx, f.by, f.bw, f.bh); ctx.clip();
      const flt = st.filter || "none";
      if (flt !== "none" && !this.hasFilter) {
        const tw = Math.max(1, Math.ceil(f.bw)), th = Math.max(1, Math.ceil(f.bh));
        const tc = document.createElement("canvas"); tc.width = tw; tc.height = th;
        const tx = tc.getContext("2d", { willReadFrequently: true });
        tx.drawImage(s, (f.bw - f.dw) / 2 + ox, (f.bh - f.dh) / 2 + oy, f.dw, f.dh);
        this.pixelFilter(tx, tw, th, flt);
        ctx.drawImage(tc, f.bx, f.by, f.bw, f.bh);
      } else {
        ctx.filter = flt;
        ctx.drawImage(s, f.bx + (f.bw - f.dw) / 2 + ox, f.by + (f.bh - f.dh) / 2 + oy, f.dw, f.dh);
      }
      ctx.restore();
    }
    if (img) ctx.drawImage(img, 0, 0, tpl.w, tpl.h);

    ctx.lineCap = ctx.lineJoin = "round";
    for (const k of st.strokes) {
      ctx.strokeStyle = ctx.fillStyle = k.c; ctx.lineWidth = k.w; ctx.beginPath();
      k.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (k.pts.length === 1) { ctx.arc(k.pts[0][0], k.pts[0][1], k.w / 2, 0, 7); ctx.fill(); } else ctx.stroke();
    }
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    st.items.forEach((it, i) => {
      if (it.t === "i") { if (stk[i]) ctx.drawImage(stk[i], it.x - it.size / 2, it.y - it.size / 2, it.size, it.size); }
      else {
        ctx.font = this.font(it); ctx.lineJoin = "round"; ctx.lineWidth = it.size * 0.16;
        ctx.strokeStyle = this.dark(it.color) ? "#fff" : "#14142b"; ctx.strokeText(it.s, it.x, it.y);
        ctx.fillStyle = it.color || "#14142b"; ctx.fillText(it.s, it.x, it.y);
      }
      if (st.ui && st.sel === i) {
        const b = this.bounds(ctx, it); ctx.save(); ctx.setLineDash([10, 8]); ctx.lineWidth = 3; ctx.strokeStyle = "#2b3ccf";
        ctx.strokeRect(it.x - b.w / 2 - 8, it.y - b.h / 2, b.w + 16, b.h); ctx.restore();
      }
    });
  },
  toBlob(canvas) { return new Promise(r => canvas.toBlob(r, "image/png")); }
};
