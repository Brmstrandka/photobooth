// Mengurus kamera, hitung mundur, dan pengambilan frame.
const Camera = {
  video: null, stream: null,
  async start(videoEl) {
    this.video = videoEl;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false
    });
    videoEl.srcObject = this.stream;
    await videoEl.play();
  },
  // Matikan kamera (lampu kamera padam, hemat baterai, privasi terjaga saat mengedit).
  stop() {
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    this.stream = null;
    if (this.video) this.video.srcObject = null;
  },
  // Ambil frame (dicerminkan seperti preview), dikembalikan sebagai canvas.
  capture() {
    const v = this.video, c = document.createElement("canvas");
    if (!v.videoWidth) throw new Error("Kamera belum siap, coba lagi sebentar lagi.");
    c.width = v.videoWidth; c.height = v.videoHeight;
    const x = c.getContext("2d");
    x.translate(c.width, 0); x.scale(-1, 1);
    x.drawImage(v, 0, 0);
    return c;
  },
  countdown(seconds, onTick) {
    return new Promise(res => {
      let n = seconds; onTick(n);
      const t = setInterval(() => { n--; if (n <= 0) { clearInterval(t); onTick(0); res(); } else onTick(n); }, 1000);
    });
  }
};
