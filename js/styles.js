// Pilihan gaya: warna latar, bentuk foto, set stiker.
const BACKGROUNDS = [
  { t: "solid", c: ["#ffffff"] }, { t: "solid", c: ["#14142b"] }, { t: "solid", c: ["#2b3ccf"] }, { t: "solid", c: ["#ffe36e"] },
  { t: "solid", c: ["#a8ebd0"] }, { t: "solid", c: ["#ff9f6b"] }, { t: "solid", c: ["#f4b6d2"] }, { t: "solid", c: ["#c9b8ff"] },
  { t: "grad", c: ["#ff9f6b", "#ff5e8a"] }, { t: "grad", c: ["#2b3ccf", "#9b5cff"] }, { t: "grad", c: ["#a8ebd0", "#5ec3ff"] }, { t: "grad", c: ["#ffe36e", "#ff9f6b"] },
  { t: "dots", c: ["#fbfaf6", "#2b3ccf"] }, { t: "dots", c: ["#ffe36e", "#14142b"] }, { t: "stripe", c: ["#ffffff", "#ff7a59"] },
  { t: "check", c: ["#ffffff", "#14142b"] }, { t: "grid", c: ["#fbfaf6", "#8f9bff"] }
];
const SHAPES = [
  { id: "rect", name: "Kotak" }, { id: "round", name: "Sudut bulat" }, { id: "oval", name: "Oval" }, { id: "arch", name: "Lengkung" }
];
// ===== Stiker vektor (gaya stiker: isi datar, garis tinta, pinggiran putih) =====
const INK = "#14142b";
const starPts = (cx, cy, ro, ri, n) => Array.from({ length: n * 2 }, (_, i) => {
  const a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? ri : ro;
  return (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1);
}).join(" ");
const arc = (r, y = 80) => `M${50 - r} ${y} A${r} ${r} 0 0 1 ${50 + r} ${y}`;

const STICKER_ART = {
  // ---- Halloween ----
  ghost: `<path d="M20 90V45C20 20 35 10 50 10S80 20 80 45V90L70 81L60 90L50 81L40 90L30 81Z" fill="#f4f1ff"/>
    <ellipse cx="38" cy="42" rx="5" ry="7" fill="${INK}"/><ellipse cx="62" cy="42" rx="5" ry="7" fill="${INK}"/>
    <ellipse cx="50" cy="60" rx="6" ry="8" fill="${INK}"/>
    <circle cx="29" cy="54" r="4.5" fill="#ffb3c7" stroke="none"/><circle cx="71" cy="54" r="4.5" fill="#ffb3c7" stroke="none"/>`,
  pumpkin: `<ellipse cx="50" cy="58" rx="40" ry="31" fill="#ff8a1f"/>
    <path d="M50 28C36 40 36 76 50 89M50 28C64 40 64 76 50 89" fill="none"/>
    <path d="M46 29Q46 14 57 9L61 16Q55 20 57 29Z" fill="#3f9b3f"/>
    <polygon points="27,54 40,54 33.5,43" fill="#ffe36e"/><polygon points="60,54 73,54 66.5,43" fill="#ffe36e"/>
    <polygon points="30,68 39,64 45,71 50,65 55,71 61,64 70,68 65,79 35,79" fill="#ffe36e"/>`,
  bat: `<path d="M50 36C42 22 22 22 6 32C14 36 16 44 14 54C22 48 28 50 33 58C38 52 45 52 50 60C55 52 62 52 67 58C72 50 78 48 86 54C84 44 86 36 94 32C78 22 58 22 50 36Z" fill="#4b2a7b"/>
    <polygon points="43,35 43,22 49,32" fill="#4b2a7b"/><polygon points="57,35 57,22 51,32" fill="#4b2a7b"/>
    <circle cx="45" cy="42" r="2.6" fill="#ffe36e" stroke="none"/><circle cx="55" cy="42" r="2.6" fill="#ffe36e" stroke="none"/>`,
  skull: `<path d="M22 50C22 22 38 11 50 11S78 22 78 50C78 60 72 64 68 68V84H32V68C28 64 22 60 22 50Z" fill="#f4f1e8"/>
    <ellipse cx="37" cy="50" rx="9" ry="10" fill="${INK}"/><ellipse cx="63" cy="50" rx="9" ry="10" fill="${INK}"/>
    <polygon points="50,60 45,69 55,69" fill="${INK}"/><path d="M42 84V74M50 84V74M58 84V74" fill="none"/>`,
  candycorn: `<defs><clipPath id="c"><path d="M50 8C63 8 78 40 87 84C88 91 83 93 78 93H22C17 93 12 91 13 84C22 40 37 8 50 8Z"/></clipPath></defs>
    <g clip-path="url(#c)" stroke="none"><rect x="0" y="0" width="100" height="38" fill="#fffaf0"/><rect x="0" y="38" width="100" height="28" fill="#ff9a1f"/><rect x="0" y="66" width="100" height="40" fill="#ffd23f"/></g>
    <path d="M50 8C63 8 78 40 87 84C88 91 83 93 78 93H22C17 93 12 91 13 84C22 40 37 8 50 8Z" fill="none"/>
    <circle cx="42" cy="74" r="2.6" fill="${INK}" stroke="none"/><circle cx="58" cy="74" r="2.6" fill="${INK}" stroke="none"/><path d="M45 81Q50 86 55 81" fill="none" stroke-width="2.5"/>`,
  witchhat: `<path d="M31 76C36 56 42 30 56 8C62 22 64 30 67 44C70 56 72 66 72 76Z" fill="#6b3fa0"/>
    <ellipse cx="50" cy="80" rx="43" ry="11" fill="#4b2a7b"/>
    <path d="M32 68Q51 77 71 68L72 77Q51 86 31 77Z" fill="#ffa31a"/><rect x="45" y="68" width="12" height="12" rx="2" fill="#ffe36e"/>`,
  moon: `<path d="M64 8A42 42 0 1 0 92 66A34 34 0 1 1 64 8Z" fill="#ffe36e"/>
    <polygon points="${starPts(78, 26, 11, 5, 5)}" fill="#fff7b0"/><polygon points="${starPts(88, 52, 6, 2.8, 5)}" fill="#fff7b0"/>`,
  spider: `<path d="M50 0V30" fill="none" stroke-width="2.5"/>
    <path d="M38 54Q18 46 10 60M38 60Q20 62 14 78M40 66Q30 78 27 92M40 48Q26 34 16 38M62 54Q82 46 90 60M62 60Q80 62 86 78M60 66Q70 78 73 92M60 48Q74 34 84 38" fill="none" stroke-width="4.5"/>
    <circle cx="50" cy="60" r="17" fill="#3a2a55"/><circle cx="50" cy="40" r="10" fill="#3a2a55"/>
    <circle cx="46" cy="38" r="3" fill="#fff" stroke="none"/><circle cx="54" cy="38" r="3" fill="#fff" stroke="none"/>
    <path d="M44 56L50 70L56 56" fill="none" stroke="#ff4f6d" stroke-width="3.5"/>`,
  eyeball: `<circle cx="50" cy="50" r="38" fill="#fff"/><circle cx="50" cy="50" r="18" fill="#6cc23a"/><circle cx="50" cy="50" r="8" fill="${INK}"/>
    <circle cx="45" cy="45" r="3.2" fill="#fff" stroke="none"/>
    <path d="M18 38Q28 42 33 49M82 62Q72 58 67 51M28 76Q35 68 39 64M70 24Q64 30 62 35" fill="none" stroke="#d83a3a" stroke-width="2.2"/>`,
  candy: `<polygon points="5,32 30,44 30,56 5,68 12,50" fill="#ffd1e0"/><polygon points="95,32 70,44 70,56 95,68 88,50" fill="#ffd1e0"/>
    <ellipse cx="50" cy="50" rx="25" ry="19" fill="#ff4f87"/><path d="M40 33Q34 50 40 67M60 33Q66 50 60 67" fill="none" stroke="#fff" stroke-width="4"/>`,
  cauldron: `<path d="M18 40C10 66 22 86 50 86S90 66 82 40Z" fill="#3a3a4a"/><ellipse cx="50" cy="40" rx="32" ry="9" fill="#5a5a70"/>
    <ellipse cx="50" cy="39" rx="26" ry="6" fill="#7ddc4f" stroke="none"/>
    <circle cx="40" cy="22" r="7" fill="#7ddc4f"/><circle cx="58" cy="14" r="5" fill="#7ddc4f"/><circle cx="64" cy="28" r="4" fill="#7ddc4f"/>
    <path d="M30 86L24 94M70 86L76 94" fill="none" stroke-width="5"/>`,
  // ---- Umum / Polos ----
  star: `<polygon points="${starPts(50, 53, 44, 20, 5)}" fill="#ffd23f"/><path d="M30 38L38 36" stroke="#fff" stroke-width="4" fill="none"/>`,
  sparkle: `<path d="M50 6C54 34 66 46 94 50C66 54 54 66 50 94C46 66 34 54 6 50C34 46 46 34 50 6Z" fill="#ffe36e"/>
    <path d="M82 6C83 16 87 20 96 21C87 22 83 26 82 36C81 26 77 22 68 21C77 20 81 16 82 6Z" fill="#fff" transform="translate(-2 -4) scale(.9)"/>`,
  heart: `<path d="M50 89C8 58 4 30 23 19C37 11 48 21 50 30C52 21 63 11 77 19C96 30 92 58 50 89Z" fill="#ff5d8f"/>
    <path d="M25 35Q29 27 38 27" fill="none" stroke="#fff" stroke-width="4"/>`,
  daisy: `${Array.from({ length: 8 }, (_, i) => `<ellipse cx="50" cy="25" rx="10" ry="19" transform="rotate(${i * 45} 50 50)" fill="#fff"/>`).join("")}<circle cx="50" cy="50" r="14" fill="#ffc928"/>`,
  cloud: `<path d="M26 76C8 76 6 52 26 50C26 30 52 24 60 42C78 34 94 52 82 66C94 68 92 76 80 76Z" fill="#bfe3ff"/>
    <circle cx="44" cy="58" r="2.6" fill="${INK}" stroke="none"/><circle cx="62" cy="58" r="2.6" fill="${INK}" stroke="none"/>
    <path d="M49 63Q53 67 57 63" fill="none" stroke-width="2.5"/><circle cx="38" cy="64" r="3.5" fill="#ff9fc0" stroke="none"/><circle cx="68" cy="64" r="3.5" fill="#ff9fc0" stroke="none"/>`,
  smile: `<circle cx="50" cy="50" r="40" fill="#ffd23f"/><ellipse cx="36" cy="42" rx="4.5" ry="7" fill="${INK}"/><ellipse cx="64" cy="42" rx="4.5" ry="7" fill="${INK}"/>
    <path d="M29 58Q50 82 71 58" fill="none" stroke-width="4"/>`,
  bow: `<path d="M46 58L32 92L46 84L50 95L54 62Z" fill="#e8346e"/><path d="M54 58L68 92L54 84L50 95L46 62Z" fill="#e8346e"/>
    <path d="M50 50C30 20 6 26 8 50C6 76 30 80 50 50Z" fill="#ff5d8f"/><path d="M50 50C70 20 94 26 92 50C94 76 70 80 50 50Z" fill="#ff5d8f"/>
    <rect x="40" y="40" width="20" height="20" rx="6" fill="#e8346e"/>`,
  cherries: `<path d="M32 56Q40 30 58 12M68 60Q64 34 58 12" fill="none" stroke="#3d8b3d" stroke-width="4"/>
    <path d="M58 12Q76 4 90 18Q72 28 58 12Z" fill="#4fb04f"/>
    <circle cx="32" cy="72" r="17" fill="#e8284a"/><circle cx="68" cy="76" r="17" fill="#e8284a"/>
    <path d="M24 66Q26 60 32 58M60 70Q62 64 68 62" fill="none" stroke="#fff" stroke-width="3.5"/>`,
  bolt: `<polygon points="60,5 22,55 46,55 38,95 78,40 52,40" fill="#ffe36e"/>`,
  rainbow: `<path d="${arc(32)}" fill="none" stroke="${INK}" stroke-width="38"/>
    <path d="${arc(41)}" fill="none" stroke="#ff5d5d" stroke-width="10"/><path d="${arc(31)}" fill="none" stroke="#ffd23f" stroke-width="10"/><path d="${arc(21)}" fill="none" stroke="#4fa8ff" stroke-width="10"/>
    <ellipse cx="14" cy="82" rx="12" ry="8" fill="#fff"/><ellipse cx="86" cy="82" rx="12" ry="8" fill="#fff"/>`,
  flame: `<path d="M50 5C54 26 78 34 78 62C78 80 66 93 50 93C34 93 22 80 22 62C22 48 32 40 34 28C42 34 44 40 44 46C50 34 48 20 50 5Z" fill="#ff7a1a"/>
    <path d="M50 93C40 93 36 85 36 75C36 63 46 59 48 51C56 59 64 65 64 75C64 85 60 93 50 93Z" fill="#ffd23f" stroke="none"/>`,
  butterfly: `<path d="M50 50C40 20 12 14 10 34C8 50 28 56 50 50Z" fill="#7c5cff"/><path d="M50 50C60 20 88 14 90 34C92 50 72 56 50 50Z" fill="#7c5cff"/>
    <path d="M50 52C34 56 24 76 34 86C44 92 50 70 50 52Z" fill="#ff8ac0"/><path d="M50 52C66 56 76 76 66 86C56 92 50 70 50 52Z" fill="#ff8ac0"/>
    <rect x="46" y="30" width="8" height="46" rx="4" fill="${INK}"/><path d="M48 32Q42 20 36 18M52 32Q58 20 64 18" fill="none" stroke-width="2.5"/>`
};

const stickerSvg = inner => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124" width="372" height="372">
<defs><filter id="o" x="-25%" y="-25%" width="150%" height="150%"><feMorphology in="SourceAlpha" operator="dilate" radius="4.5" result="d"/><feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="w"/><feMerge><feMergeNode in="w"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
<g filter="url(#o)" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${inner}</g></svg>`;
const STICKER_URL = id => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(stickerSvg(STICKER_ART[id]));

const STICKER_SETS = {
  halloween: ["ghost", "pumpkin", "bat", "skull", "candycorn", "witchhat", "moon", "spider", "eyeball", "candy", "cauldron"],
  polos: ["star", "heart", "daisy", "cloud", "smile", "bow", "cherries", "bolt", "rainbow", "flame", "sparkle", "butterfly"]
};

// Font teks per tema (Google Fonts, dimuat di index.html)
const FONTS = {
  halloween: ["Creepster", "Butcherman", "Metal Mania", "Special Elite"],
  polos: ["Pacifico", "Caveat Brush", "Permanent Marker", "Shrikhand", "Bangers"]
};
