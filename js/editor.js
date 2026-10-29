// Interaksi di atas strip: geser foto, stiker/teks, coretan.
const Editor = {
  canvas: null, tpl: null, photos: [], mode: "gaya", drag: null, active: 0, st: null,
  pen: { c: "#ff5a36", w: 8 },
  fresh: () => ({ filter: "none", bg: BACKGROUNDS[3], shape: "rect", xf: [], items: [], strokes: [], sel: -1, ui: true }),

  init(canvas, onSel, onActive) {
    this.canvas = canvas; this.onSel = onSel; this.onActive = onActive;
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", e => this.down(e));
    canvas.addEventListener("pointermove", e => this.move(e));
    ["pointerup", "pointercancel"].forEach(n => canvas.addEventListener(n, () => (this.drag = null)));
    canvas.addEventListener("wheel", e => {
      if (this.mode !== "gaya") return;
      const s = this.slotAt(this.pos(e)); if (!s) return;
      e.preventDefault(); this.active = s[4];
      this.setZoom(this.xf(s[4]).z * (e.deltaY < 0 ? 1.06 : 0.94)); this.onActive(s[4]);
    }, { passive: false });
  },
  open(tpl, photos) { this.tpl = tpl; this.photos = photos; this.st = this.fresh(); this.active = 0; this.redraw(); },
  redraw() { return Strip.render(this.canvas, this.photos, this.tpl, this.st); },

  pos(e) { const r = this.canvas.getBoundingClientRect(); return [(e.clientX - r.left) * this.canvas.width / r.width, (e.clientY - r.top) * this.canvas.height / r.height]; },
  slotAt(p) { return this.tpl.slots.find(([x, y, w, h]) => p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h); },
  itemAt(p) {
    const ctx = this.canvas.getContext("2d");
    for (let i = this.st.items.length - 1; i >= 0; i--) {
      const it = this.st.items[i], b = Strip.bounds(ctx, it);
      if (Math.abs(p[0] - it.x) <= b.w / 2 + 8 && Math.abs(p[1] - it.y) <= b.h / 2) return i;
    }
    return -1;
  },
  xf(k) { return this.st.xf[k] || (this.st.xf[k] = { dx: 0, dy: 0, z: 1 }); },
  limit(k) {
    const slot = this.tpl.slots.find(s => s[4] === k), t = this.xf(k);
    const f = Strip.fit(this.photos[k], slot, t.z, this.tpl.custom ? 0 : 4);
    t.dx = Math.max(-f.mx, Math.min(f.mx, t.dx)); t.dy = Math.max(-f.my, Math.min(f.my, t.dy));
  },
  setZoom(z) { const t = this.xf(this.active); t.z = Math.max(1, Math.min(4, z)); this.limit(this.active); this.redraw(); },

  down(e) {
    const p = this.pos(e); this.canvas.setPointerCapture(e.pointerId);
    if (this.mode === "coret") {
      this.st.strokes.push({ c: this.pen.c, w: this.pen.w * this.tpl.w / 600, pts: [p] }); this.drag = { k: "pen" };
    } else if (this.mode === "stiker") {
      const i = this.itemAt(p); this.st.sel = i; this.onSel(i >= 0 ? this.st.items[i] : null);
      this.drag = i >= 0 ? { k: "item", i, ox: p[0] - this.st.items[i].x, oy: p[1] - this.st.items[i].y } : null;
    } else {
      const s = this.slotAt(p);
      if (s) { this.active = s[4]; this.onActive(s[4]); this.drag = { k: "photo", last: p }; }
    }
    this.redraw();
  },
  move(e) {
    const d = this.drag; if (!d) return; const p = this.pos(e);
    if (d.k === "pen") this.st.strokes.at(-1).pts.push(p);
    else if (d.k === "item") { const it = this.st.items[d.i]; it.x = p[0] - d.ox; it.y = p[1] - d.oy; }
    else { const t = this.xf(this.active); t.dx += p[0] - d.last[0]; t.dy += p[1] - d.last[1]; d.last = p; this.limit(this.active); }
    this.redraw();
  },

  addItem(type, s) {
    const w = this.tpl.w, size = Math.round(type === "i" ? w * 0.2 : w * 0.09);
    this.st.items.push({ t: type, s, x: w / 2, y: this.tpl.h / 2, size, color: type === "x" ? this.textColor || "#14142b" : null, f: type === "x" ? this.textFont : null });
    this.st.sel = this.st.items.length - 1; this.onSel(this.st.items[this.st.sel]); this.redraw();
  },
  selected() { return this.st.items[this.st.sel]; },
  removeSelected() { if (this.st.sel < 0) return; this.st.items.splice(this.st.sel, 1); this.st.sel = -1; this.onSel(null); this.redraw(); },
  undo() { this.st.strokes.pop(); this.redraw(); },
  clearStrokes() { this.st.strokes = []; this.redraw(); },

  async exportBlob() {
    // PERBAIKAN: try/finally supaya kotak seleksi stiker kembali muncul walau ekspor gagal.
    this.st.ui = false;
    try { await this.redraw(); return await Strip.toBlob(this.canvas); }
    finally { this.st.ui = true; this.redraw(); }
  }
};
