"use strict";
/* Lumi Design-Studio – Bibliothek: Formate, Schriften, Formen, Sticker, Deko-Packs und Vorlagen.
   Alle Objekte sind einfache Daten ({type:"text"|"shape"|"image", x, y, w, h, rot, …}), die DOM-Editor und Export-Renderer gemeinsam nutzen. */

const DS_FORMATS = [
  { k: "poster", n: "Plakat A3", d: "Hochformat", w: 1123, h: 1587 },
  { k: "a4", n: "A4 hochkant", d: "Flyer, Blatt", w: 794, h: 1123 },
  { k: "a4l", n: "A4 quer", d: "Querformat", w: 1123, h: 794 },
  { k: "a5", n: "Flyer A5", d: "Hochformat", w: 559, h: 794 },
  { k: "ig", n: "Instagram-Post", d: "1080 × 1080", w: 1080, h: 1080 },
  { k: "story", n: "Story", d: "1080 × 1920", w: 1080, h: 1920 },
  { k: "slide", n: "Präsentation", d: "16:9", w: 1920, h: 1080 },
  { k: "banner", n: "Banner", d: "1500 × 500", w: 1500, h: 500 },
  { k: "invite", n: "Einladung", d: "Hochformat", w: 750, h: 1050 },
  { k: "cert", n: "Zertifikat", d: "A4 quer", w: 1123, h: 794 },
  { k: "card", n: "Visitenkarte", d: "Querformat", w: 1050, h: 600 },
  { k: "logo", n: "Logo", d: "Quadrat", w: 800, h: 800 },
];
const DS_FONTS = ["Inter", "Poppins", "Montserrat", "Space Grotesk", "Playfair Display", "DM Serif Display", "Lora", "Abril Fatface", "Bebas Neue", "Anton", "Archivo Black", "Oswald", "Pacifico", "Dancing Script", "Caveat", "Permanent Marker"];
const DS_FONT_URL = "https://fonts.googleapis.com/css2?" + ["Inter:wght@400;600;800", "Poppins:ital,wght@0,400;0,600;0,800;1,400", "Montserrat:wght@400;600;800", "Space+Grotesk:wght@400;700", "Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,700", "DM+Serif+Display:ital@0;1", "Lora:ital,wght@0,400;0,700;1,400", "Abril+Fatface", "Bebas+Neue", "Anton", "Archivo+Black", "Oswald:wght@400;700", "Pacifico", "Dancing+Script:wght@400;700", "Caveat:wght@400;700", "Permanent+Marker"].map(f => "family=" + f).join("&") + "&display=swap";
function dsLoadFonts() { if (document.getElementById("ds-fonts")) return; const l = document.createElement("link"); l.id = "ds-fonts"; l.rel = "stylesheet"; l.href = DS_FONT_URL; document.head.appendChild(l); }

const DS_COLORS = ["#111111", "#ffffff", "#6b7280", "#d1d5db", "#ef4444", "#f97316", "#f59e0b", "#facc15", "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#2563eb", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899", "#f43f5e", "#7c2d12", "#0f2a1f", "#1e3a8a", "#fde68a", "#fbcfe8"];
const DS_GRADS = [["#ff9a56", "#ff3d7f", 135], ["#f6d365", "#fda085", 135], ["#a18cd1", "#fbc2eb", 135], ["#84fab0", "#8fd3f4", 135], ["#667eea", "#764ba2", 135], ["#43e97b", "#38f9d7", 135], ["#fa709a", "#fee140", 135], ["#30cfd0", "#330867", 135], ["#0f2027", "#2c5364", 135], ["#1a0b3b", "#5b21b6", 160], ["#f093fb", "#f5576c", 135], ["#4facfe", "#00f2fe", 135], ["#fdfbfb", "#ebedee", 180], ["#232526", "#414345", 135], ["#ffecd2", "#fcb69f", 135], ["#e0c3fc", "#8ec5fc", 135]];
const DS_PATTERNS = [["dots", "Punkte"], ["grid", "Raster"], ["stripes", "Streifen"], ["diag", "Diagonal"]];

/* ---------- Formen (viewBox 0 0 100 100, preserveAspectRatio none) ---------- */
function dsStarPts(n, ro, ri, rot = -90) { const p = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro, a = (rot + i * 180 / n) * Math.PI / 180; p.push((50 + r * Math.cos(a)).toFixed(2) + " " + (50 + r * Math.sin(a)).toFixed(2)); } return "M" + p.join("L") + "Z"; }
const DS_SHAPES = {
  rect: { n: "Rechteck" }, pill: { n: "Pille" },
  circle: { n: "Kreis", d: "M50 0A50 50 0 1 0 50 100A50 50 0 1 0 50 0Z" },
  tri: { n: "Dreieck", d: "M50 4L97 94H3Z" },
  rtri: { n: "Winkel", d: "M4 4L96 96H4Z" },
  diamond: { n: "Raute", d: "M50 2L98 50L50 98L2 50Z" },
  pent: { n: "Fünfeck", d: "M50 3L97 38L79 95H21L3 38Z" },
  hex: { n: "Sechseck", d: "M26 5H74L98 50L74 95H26L2 50Z" },
  star: { n: "Stern", d: dsStarPts(5, 50, 20) },
  star4: { n: "Funkeln", d: "M50 0C54 30 70 46 100 50C70 54 54 70 50 100C46 70 30 54 0 50C30 46 46 30 50 0Z" },
  burst: { n: "Zacken", d: dsStarPts(14, 50, 39) },
  heart: { n: "Herz", d: "M50 92C20 66 4 50 4 30A23 23 0 0 1 50 24A23 23 0 0 1 96 30C96 50 80 66 50 92Z" },
  arrow: { n: "Pfeil", d: "M2 36H58V10L98 50L58 90V64H2Z" },
  chevron: { n: "Chevron", d: "M2 6H60L98 50L60 94H2L40 50Z" },
  plus: { n: "Plus", d: "M36 4H64V36H96V64H64V96H36V64H4V36H36Z" },
  bubble: { n: "Sprechblase", d: "M12 6H88Q96 6 96 14V62Q96 70 88 70H46L22 94L28 70H12Q4 70 4 62V14Q4 6 12 6Z" },
  cloud: { n: "Wolke", d: "M26 82A20 20 0 0 1 22 42A26 26 0 0 1 72 34A22 22 0 0 1 80 82Z" },
  blob1: { n: "Blob", d: "M44 3C70 -2 95 15 97 42C99 68 84 94 54 97C26 100 3 80 3 52C3 27 20 7 44 3Z" },
  blob2: { n: "Blob 2", d: "M30 6C52 -4 86 4 94 30C102 56 78 62 80 80C82 98 40 104 20 88C0 72 6 54 8 38C10 22 18 12 30 6Z" },
  blob3: { n: "Blob 3", d: "M52 2C76 4 98 24 96 52C94 80 70 98 44 96C18 94 2 72 4 46C6 22 28 0 52 2Z" },
  wave: { n: "Welle", d: "M0 38C16 18 34 18 50 38S84 58 100 38V100H0Z" },
  wave2: { n: "Welle 2", d: "M0 52C14 30 30 30 44 48S72 66 100 30V100H0Z" },
  half: { n: "Halbkreis", d: "M0 100A50 50 0 0 1 100 100Z" },
  quarter: { n: "Viertel", d: "M0 100A100 100 0 0 1 100 0V100Z" },
  ring: { n: "Ring", d: "M50 0A50 50 0 1 0 50 100A50 50 0 1 0 50 0ZM50 14A36 36 0 1 1 50 86A36 36 0 1 1 50 14Z", evenodd: true },
  drop: { n: "Tropfen", d: "M50 2C50 2 90 44 90 66A40 40 0 0 1 10 66C10 44 50 2 50 2Z" },
  moon: { n: "Mond", d: "M62 4A46 46 0 1 0 96 70A38 38 0 0 1 62 4Z" },
  bolt: { n: "Blitz", d: "M58 2L14 56H44L38 98L86 40H54Z" },
  flag: { n: "Banner", d: "M6 4H94L78 28L94 52H22V98H6Z" },
};
/* Linien & Pfeile */
const DS_LINES = [["line", "Linie"], ["linedash", "Gestrichelt"], ["lineA", "Pfeil"], ["lineDot", "Punkte"], ["lineWave", "Welle"]];

/* ---------- Sticker (Emoji) & Symbole ---------- */
const DS_EMOJI = {
  "Schule": ["📚", "✏️", "🎓", "📝", "🧪", "🔬", "🧮", "📐", "🎒", "🏫", "🔭", "🧠", "💡", "📖", "🖍️", "📎"],
  "Party": ["🎉", "🎈", "🎂", "🥳", "🎁", "🍰", "🎊", "🪩", "🍕", "🥂", "🎤", "🎵", "🎧", "💃", "🕺", "🍿"],
  "Natur": ["🌈", "☀️", "🌙", "⭐", "🌸", "🌻", "🌿", "🍀", "🌊", "🔥", "❄️", "🌍", "🦋", "🐝", "🍎", "🌴"],
  "Sport": ["⚽", "🏀", "🏆", "🥇", "🎯", "🚴", "🏊", "⛷️", "🎾", "🏐", "🥊", "🏅", "🎮", "🎨", "📷", "🚀"],
  "Gefühle": ["❤️", "💜", "💙", "💚", "😀", "😍", "🥰", "😎", "🤩", "👍", "👏", "🙌", "✨", "💫", "💥", "💯"],
};

/* ---------- Objekt-Fabriken ---------- */
let _dsN = 0;
const dsId = () => "o" + (++_dsN).toString(36) + Math.random().toString(36).slice(2, 6);
const dsText = (txt, x, y, w, size, o = {}) => ({ id: dsId(), type: "text", x, y, w, h: 0, rot: o.rot || 0, opacity: o.op ?? 1, txt, font: o.font || "Poppins", size, weight: o.weight || 700, italic: !!o.italic, under: !!o.under, color: o.color || "#111111", align: o.align || "left", lh: o.lh || 1.18, ls: o.ls || 0, upper: !!o.upper, shadow: o.shadow || null, role: o.role || "", pad: o.pad || 0, bgc: o.bgc || null, radius: o.radius || 0 });
const dsShape = (kind, x, y, w, h, fill, o = {}) => ({ id: dsId(), type: "shape", kind, x, y, w, h, rot: o.rot || 0, opacity: o.op ?? 1, fill, stroke: o.stroke || null, sw: o.sw || 0, r: o.r || 0, shadow: o.shadow || null, dash: o.dash || false });
const dsImage = (src, x, y, w, h, o = {}) => ({ id: dsId(), type: "image", x, y, w, h, rot: 0, opacity: 1, src, r: o.r || 0, fit: o.fit || "cover", filter: o.filter || "", shadow: null, nw: o.nw || w, nh: o.nh || h });
const dsGrad = (a, b, ang = 135) => ({ g: [a, b, ang] });

/* ---------- Shape → SVG ---------- */
function dsFillDefs(fill, gid) { if (fill && fill.g) { const [a, b, ang] = fill.g; return `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0" gradientTransform="rotate(${ang - 90} .5 .5)"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`; } return ""; }
const dsFillRef = (fill, gid) => fill && fill.g ? `url(#${gid})` : (fill || "none");
function dsShapeSvg(o, gid = "g" + o.id) {
  const f = dsFillRef(o.fill, gid), defs = dsFillDefs(o.fill, gid), st = o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 2}" vector-effect="non-scaling-stroke"${o.dash ? ' stroke-dasharray="10 8"' : ""}` : "";
  const W = Math.max(1, o.w), H = Math.max(1, o.h);
  if (o.kind === "rect" || o.kind === "pill") { const r = o.kind === "pill" ? Math.min(W, H) / 2 : Math.min(o.r || 0, Math.min(W, H) / 2); return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs}<rect x="${o.stroke ? (o.sw || 2) / 2 : 0}" y="${o.stroke ? (o.sw || 2) / 2 : 0}" width="${W - (o.stroke ? (o.sw || 2) : 0)}" height="${H - (o.stroke ? (o.sw || 2) : 0)}" rx="${r}" fill="${f}"${st}/></svg>`; }
  if (o.kind && o.kind.startsWith("line")) {
    const t = Math.max(2, o.sw || 6), c = o.fill && !o.fill.g ? o.fill : "#111", mid = H / 2;
    let body = "";
    if (o.kind === "lineWave") { let d = `M0 ${mid}`; const n = Math.max(2, Math.round(W / (t * 4))), seg = W / n; for (let i = 0; i < n; i++) d += `Q${(i * seg + seg / 4).toFixed(1)} ${(i % 2 ? mid + t * 1.4 : mid - t * 1.4).toFixed(1)} ${(i * seg + seg / 2).toFixed(1)} ${mid}T${((i + 1) * seg).toFixed(1)} ${mid}`; body = `<path d="${d}" fill="none" stroke="${c}" stroke-width="${t}" stroke-linecap="round"/>`; }
    else if (o.kind === "lineA") body = `<path d="M${t} ${mid}H${W - t * 3}" stroke="${c}" stroke-width="${t}" stroke-linecap="round" fill="none"/><path d="M${W - t * 4.5} ${mid - t * 2.2}L${W - t} ${mid}L${W - t * 4.5} ${mid + t * 2.2}" stroke="${c}" stroke-width="${t}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    else body = `<path d="M${t / 2} ${mid}H${W - t / 2}" stroke="${c}" stroke-width="${t}" stroke-linecap="round" fill="none"${o.kind === "linedash" ? ` stroke-dasharray="${t * 2.2} ${t * 1.8}"` : o.kind === "lineDot" ? ` stroke-dasharray="0 ${t * 2.2}"` : ""}/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  }
  const sh = DS_SHAPES[o.kind] || DS_SHAPES.circle;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 100 100" preserveAspectRatio="none">${defs}<path d="${sh.d}" fill="${f}"${sh.evenodd ? ' fill-rule="evenodd"' : ""}${st}/></svg>`;
}

/* ---------- Hintergründe ---------- */
function dsBgCss(bg) {
  if (!bg) return "#ffffff";
  if (bg.g) return `linear-gradient(${bg.g[2]}deg,${bg.g[0]},${bg.g[1]})`;
  if (bg.pat) { const c = bg.c || "#ffffff", p = bg.pc || "rgba(0,0,0,.12)"; return ({ dots: `radial-gradient(${p} 2px,transparent 2.5px) 0 0/28px 28px,${c}`, grid: `linear-gradient(${p} 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,${p} 1px,transparent 1px) 0 0/32px 32px,${c}`, stripes: `repeating-linear-gradient(90deg,${p} 0 14px,transparent 14px 28px),${c}`, diag: `repeating-linear-gradient(45deg,${p} 0 10px,transparent 10px 26px),${c}` })[bg.pat] || c; }
  return bg.c || "#ffffff";
}

/* ---------- Deko-Packs (mehrere Objekte auf einmal) ---------- */
function dsRand(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function dsConfetti(W, H, seed = 7, n = 46, pal = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6"]) {
  const r = dsRand(seed), k = Math.sqrt(W * H) / 100, out = [], kinds = ["circle", "tri", "star", "rect", "plus", "star4"];
  for (let i = 0; i < n; i++) { const s = (1.4 + r() * 2.6) * k, kind = kinds[Math.floor(r() * kinds.length)]; out.push(dsShape(kind, r() * W - s / 2, r() * H - s / 2, s, kind === "rect" ? s * .4 : s, pal[Math.floor(r() * pal.length)], { rot: Math.floor(r() * 360), op: .9 })); }
  return out;
}
const DS_PACKS = [
  { k: "confetti", n: "Konfetti", make: (W, H) => dsConfetti(W, H, Math.floor(Math.random() * 9999) + 1) },
  { k: "waves", n: "Wellen unten", make: (W, H) => [dsShape("wave", 0, H * .7, W, H * .3, dsGrad("#3b82f6", "#8b5cf6", 90), { op: .85 }), dsShape("wave2", 0, H * .78, W, H * .22, dsGrad("#06b6d4", "#3b82f6", 90))] },
  { k: "blobs", n: "Blobs", make: (W, H) => { const k = Math.sqrt(W * H) / 100; return [dsShape("blob1", -10 * k, -12 * k, 48 * k, 44 * k, dsGrad("#f472b6", "#fb923c")), dsShape("blob3", W - 36 * k, H - 34 * k, 50 * k, 46 * k, dsGrad("#60a5fa", "#a78bfa"))]; } },
  { k: "frame", n: "Rahmen", make: (W, H) => { const k = Math.sqrt(W * H) / 100; return [dsShape("rect", 3 * k, 3 * k, W - 6 * k, H - 6 * k, "none", { stroke: "#111111", sw: 4 }), dsShape("rect", 4.6 * k, 4.6 * k, W - 9.2 * k, H - 9.2 * k, "none", { stroke: "#111111", sw: 1.5 })]; } },
  { k: "stripes", n: "Streifen", make: (W, H) => { const k = Math.sqrt(W * H) / 100, o = []; for (let i = 0; i < 5; i++) o.push(dsShape("rect", -10 * k, H * .08 + i * 5 * k, W + 20 * k, 2.4 * k, ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"][i], { rot: -8 })); return o; } },
  { k: "stars", n: "Sterne", make: (W, H) => { const r = dsRand(11), k = Math.sqrt(W * H) / 100, o = []; for (let i = 0; i < 14; i++) { const s = (2 + r() * 5) * k; o.push(dsShape(r() > .5 ? "star4" : "star", r() * W, r() * H, s, s, r() > .5 ? "#fde047" : "#ffffff", { op: .95, rot: Math.floor(r() * 40) })); } return o; } },
  { k: "bubbles", n: "Bubbles", make: (W, H) => { const r = dsRand(5), k = Math.sqrt(W * H) / 100, o = []; for (let i = 0; i < 12; i++) { const s = (3 + r() * 14) * k; o.push(dsShape("circle", r() * W, r() * H, s, s, "none", { stroke: ["#60a5fa", "#a78bfa", "#f472b6", "#34d399"][i % 4], sw: 3, op: .8 })); } return o; } },
  { k: "sun", n: "Sonne", make: (W, H) => { const k = Math.sqrt(W * H) / 100; return [dsShape("burst", W * .6, H * .05, 26 * k, 26 * k, "#fbbf24"), dsShape("circle", W * .6 + 4.5 * k, H * .05 + 4.5 * k, 17 * k, 17 * k, dsGrad("#fde68a", "#f59e0b"))]; } },
];

/* ---------- Schrift-Kombinationen ---------- */
const DS_TEXT_STYLES = [
  { n: "Plakat-Titel", s: { txt: "DEIN TITEL", font: "Anton", size: 120, weight: 400, upper: true, ls: 2, lh: 1.02 } },
  { n: "Elegant", s: { txt: "Eleganz", font: "Playfair Display", size: 96, weight: 700, italic: true, lh: 1.05 } },
  { n: "Handschrift", s: { txt: "Hallo Welt", font: "Caveat", size: 110, weight: 700, color: "#be185d" } },
  { n: "Retro", s: { txt: "Retro", font: "Pacifico", size: 100, weight: 400, color: "#ffffff", shadow: { x: 6, y: 6, b: 0, c: "#ec4899" } } },
  { n: "Modern", s: { txt: "Modern", font: "Space Grotesk", size: 96, weight: 700, ls: -2 } },
  { n: "Sticker", s: { txt: "NEU!", font: "Archivo Black", size: 84, weight: 400, color: "#111111", bgc: "#fde047", pad: 22, radius: 18, align: "center" } },
  { n: "Neon", s: { txt: "NEON", font: "Poppins", size: 96, weight: 800, color: "#ffffff", ls: 6, shadow: { x: 0, y: 0, b: 28, c: "#22d3ee" } } },
  { n: "Magazin", s: { txt: "Magazin", font: "DM Serif Display", size: 110, weight: 400, lh: 1.02 } },
  { n: "Marker", s: { txt: "Marker", font: "Permanent Marker", size: 96, weight: 400, color: "#2563eb" } },
  { n: "Skript", s: { txt: "Einladung", font: "Dancing Script", size: 110, weight: 700, color: "#7c2d12" } },
];

/* ---------- Vorlagen ---------- */
const dsEst = (txt, size, w, o = {}) => { const cw = size * (o.upper ? .64 : .54) * (o.wide || 1); const per = Math.max(4, Math.floor(w / cw)); let lines = 0; String(txt).split("\n").forEach(p => { lines += Math.max(1, Math.ceil(p.length / per)); }); return lines * size * (o.lh || 1.18); };
function dsFlow(y, gap, items) { items.forEach(t => { t.y = Math.round(y); t.h = dsEst(t.txt, t.size, t.w, { upper: t.upper, lh: t.lh, wide: t.font === "Anton" || t.font === "Bebas Neue" ? .78 : t.font === "Archivo Black" ? 1.1 : 1 }); y += t.h + gap; }); return y; }

const DS_TEMPLATES = [
  { k: "neon", n: "Neon Night", cat: "Party", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, wide = W > H * 1.2, pad = 8 * k, tw = wide ? W * .56 : W - pad * 2, o = [];
    o.push(dsShape("blob1", W - 46 * k, -16 * k, 70 * k, 64 * k, dsGrad("#f472b6", "#a855f7")), dsShape("blob3", -22 * k, H - 38 * k, 60 * k, 54 * k, dsGrad("#22d3ee", "#6366f1")), dsShape("ring", W - 30 * k, H - 30 * k, 22 * k, 22 * k, "#f472b6", { op: .6 }));
    o.push(...dsConfetti(W, H, 3, 26, ["#f472b6", "#22d3ee", "#a78bfa", "#fde047"]).map(c => ({ ...c, op: .75 })));
    const t1 = dsText("SOMMER\nFEST", pad, 0, tw, wide ? 17 * k : 19 * k, { font: "Anton", weight: 400, color: "#ffffff", upper: true, ls: 3, lh: .98, role: "title", shadow: { x: 0, y: 0, b: 30, c: "#f472b6" } }), t2 = dsText("Musik · Tanz · Freunde", pad, 0, tw, 4.4 * k, { font: "Poppins", weight: 600, color: "#e9d5ff", ls: 1.5, role: "sub" }), t3 = dsText("SA 24. AUGUST · 20 UHR\nSchulhof, Eintritt frei", pad, 0, tw, 3.4 * k, { font: "Poppins", weight: 600, color: "#ffffff", role: "body", lh: 1.4 });
    dsFlow(wide ? H * .2 : H * .3, 2.6 * k, [t1, t2, t3]); o.push(t1, t2, t3, dsShape("pill", pad, t3.y + t3.h + 4 * k, 26 * k, 7.5 * k, "#f472b6"), dsText("JETZT DABEI SEIN", pad, t3.y + t3.h + 4 * k + 1.9 * k, 26 * k, 2.6 * k, { font: "Poppins", weight: 800, color: "#1a0b3b", align: "center", ls: 1 }));
    return { bg: dsGrad("#1a0b3b", "#5b21b6", 160), objs: o }; } },
  { k: "cream", n: "Editorial", cat: "Plakat", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, wide = W > H * 1.2, pad = 9 * k, tw = wide ? W * .55 : W - pad * 2, o = [];
    o.push(dsShape("circle", wide ? W * .62 : W * .38, wide ? H * .12 : H * .5, wide ? H * .78 : W * .74, wide ? H * .78 : W * .74, "#d9734e"), dsShape("star", W - pad - 9 * k, pad, 9 * k, 9 * k, "#1f1b16"));
    o.push(dsShape("rect", pad, pad - 1 * k, 12 * k, .5 * k, "#1f1b16"));
    const t0 = dsText("MAGAZIN · AUSGABE 07 · 2026", pad, pad + 1 * k, tw, 2.1 * k, { font: "Space Grotesk", weight: 700, ls: 3, color: "#1f1b16", role: "date" }), t1 = dsText("Die Kunst\ndes Lernens", pad, 0, tw, wide ? 11 * k : 13.5 * k, { font: "Playfair Display", weight: 800, color: "#1f1b16", lh: 1.02, role: "title" }), t2 = dsText("Wie Neugier, Rhythmus und kleine Gewohnheiten aus Wissen Können machen.", pad, 0, tw * .86, 3.4 * k, { font: "Lora", italic: true, weight: 400, color: "#3b342d", lh: 1.4, role: "sub" });
    dsFlow(H * (wide ? .26 : .17), 3 * k, [t1, t2]); o.push(t0, t1, t2, dsText("Lumi · Lernmagazin", pad, H - pad - 2.5 * k, tw, 2.4 * k, { font: "Space Grotesk", weight: 700, color: "#1f1b16", ls: 2, upper: true, role: "body" }));
    return { bg: "#f4ede4", objs: o }; } },
  { k: "yellow", n: "Bold Yellow", cat: "Plakat", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, wide = W > H * 1.2, pad = 7 * k, tw = W - pad * 2, o = [];
    for (let i = 0; i < 6; i++) o.push(dsShape("rect", -10 * k, H * (wide ? .72 : .78) + i * 3.4 * k, W + 20 * k, 1.5 * k, "#111111", { rot: -6 }));
    o.push(dsShape("circle", W - 30 * k, pad, 24 * k, 24 * k, "#111111"), dsText("★", W - 30 * k + 6 * k, pad + 2.5 * k, 12 * k, 15 * k, { font: "Inter", color: "#ffd23f", align: "center", weight: 800 }));
    const t1 = dsText("DAS GROSSE\nQUIZ", pad, 0, tw, wide ? 15 * k : 17 * k, { font: "Anton", weight: 400, color: "#111111", upper: true, lh: .96, role: "title" }), t2 = dsText("Teste dein Wissen. Gewinne Preise.", pad, 0, tw, 4 * k, { font: "Archivo Black", weight: 400, color: "#111111", role: "sub" });
    const ey = dsFlow(H * .12, 3 * k, [t1, t2]); o.push(t1, t2, dsShape("pill", pad, ey + 2 * k, 34 * k, 8 * k, "#111111"), dsText("FREITAG · 15 UHR", pad, ey + 2 * k + 1.9 * k, 34 * k, 3 * k, { font: "Archivo Black", weight: 400, color: "#ffd23f", align: "center", role: "date" }));
    return { bg: "#ffd23f", objs: o }; } },
  { k: "study", n: "Lernplakat", cat: "Schule", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, wide = W > H * 1.2, pad = 6 * k, o = [], hh = wide ? H * .3 : H * .22;
    o.push(dsShape("rect", 0, 0, W, hh, dsGrad("#2563eb", "#7c3aed", 120)), dsShape("circle", W - 20 * k, -10 * k, 34 * k, 34 * k, "#ffffff", { op: .12 }), dsShape("circle", W - 38 * k, hh - 7 * k, 16 * k, 16 * k, "#ffffff", { op: .1 }));
    o.push(dsText("Zellatmung", pad, hh * .2, W * .7, wide ? 9 * k : 9.5 * k, { font: "Poppins", weight: 800, color: "#ffffff", role: "title" }), dsText("Von Glukose zu ATP – der Überblick", pad, hh * .2 + (wide ? 11 * k : 12 * k), W * .7, 3.3 * k, { font: "Poppins", weight: 400, color: "#dbeafe", role: "sub" }));
    const cards = [["1", "Glykolyse", "Zytoplasma · Glukose wird zu Pyruvat · 2 ATP", "#f59e0b"], ["2", "Citratzyklus", "Mitochondrien-Matrix · CO₂ + Reduktionsäquivalente", "#10b981"], ["3", "Atmungskette", "Innere Membran · O₂ wird zu H₂O · ca. 32 ATP", "#ec4899"]];
    const gap = 3 * k, top = hh + 4 * k, availH = H - top - pad, cw = wide ? (W - pad * 2 - gap * 2) / 3 : W - pad * 2, ch = wide ? availH : (availH - gap * 2) / 3;
    cards.forEach(([n, h, t, c], i) => { const x = wide ? pad + i * (cw + gap) : pad, y = wide ? top : top + i * (ch + gap); o.push(dsShape("rect", x, y, cw, ch, "#ffffff", { r: 3 * k, shadow: { x: 0, y: 6, b: 24, c: "rgba(30,20,90,.14)" } }), dsShape("circle", x + 3 * k, y + 3 * k, 7 * k, 7 * k, c), dsText(n, x + 3 * k, y + 3 * k + 1.2 * k, 7 * k, 4.4 * k, { font: "Poppins", weight: 800, color: "#ffffff", align: "center" }), dsText(h, x + 12 * k, y + 3.2 * k, cw - 15 * k, 4.2 * k, { font: "Poppins", weight: 800, color: "#111827", role: "c" + (i + 1) }), dsText(t, x + 3 * k, y + 12 * k, cw - 6 * k, 2.9 * k, { font: "Inter", weight: 400, color: "#4b5563", lh: 1.45 })); });
    return { bg: "#f6f7fb", objs: o }; } },
  { k: "pastel", n: "Pastell Soft", cat: "Social", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], cx = W / 2, cy = H / 2, cw = Math.min(W * .78, 80 * k), ch = Math.min(H * .5, 46 * k);
    o.push(dsShape("circle", -8 * k, -8 * k, 40 * k, 40 * k, "#fdba74", { op: .75 }), dsShape("circle", W - 30 * k, H * .1, 34 * k, 34 * k, "#c4b5fd", { op: .8 }), dsShape("circle", W * .08, H - 30 * k, 30 * k, 30 * k, "#86efac", { op: .75 }), dsShape("blob2", W - 28 * k, H - 28 * k, 34 * k, 34 * k, "#f9a8d4", { op: .8 }));
    o.push(dsShape("rect", cx - cw / 2, cy - ch / 2, cw, ch, "#ffffff", { r: 6 * k, shadow: { x: 0, y: 14, b: 40, c: "rgba(99,60,160,.18)" } }));
    const t1 = dsText("Gute Laune\nTag", cx - cw / 2 + 5 * k, 0, cw - 10 * k, 8.4 * k, { font: "DM Serif Display", weight: 400, color: "#3b0764", align: "center", lh: 1.05, role: "title" }), t2 = dsText("Kleine Schritte, grosse Wirkung.", cx - cw / 2 + 5 * k, 0, cw - 10 * k, 3 * k, { font: "Poppins", weight: 400, color: "#6b21a8", align: "center", role: "sub" });
    dsFlow(cy - ch / 2 + 5.5 * k, 2.2 * k, [t1, t2]); o.push(t1, t2, dsShape("pill", cx - 12 * k, cy + ch / 2 - 10 * k, 24 * k, 6.4 * k, dsGrad("#a855f7", "#ec4899", 90)), dsText("Los geht's", cx - 12 * k, cy + ch / 2 - 8.5 * k, 24 * k, 2.8 * k, { font: "Poppins", weight: 700, color: "#ffffff", align: "center" }), dsText("🌸", cx - 3.5 * k, cy - ch / 2 - 5 * k, 8 * k, 8 * k, { font: "Inter", align: "center" }));
    return { bg: dsGrad("#ffe4e6", "#e0e7ff", 135), objs: o }; } },
  { k: "sunset", n: "Retro Sunset", cat: "Social", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], sx = W / 2 - 22 * k, sy = H * (W > H * 1.2 ? .12 : .2), sd = 44 * k;
    o.push(dsShape("circle", sx, sy, sd, sd, dsGrad("#fff3b0", "#ffb347", 180)));
    for (let i = 0; i < 5; i++) o.push(dsShape("rect", sx - 1, sy + sd * (.52 + i * .1), sd + 2, sd * (.015 + i * .012), "#ff6b81"));
    o.push(dsShape("wave", 0, H * .66, W, H * .34, "#3b1c5a"), dsShape("wave2", 0, H * .72, W, H * .28, "#5b2a86"));
    const t1 = dsText("Summer\nVibes", 6 * k, H * .62 - 10 * k, W - 12 * k, 12 * k, { font: "Pacifico", weight: 400, color: "#ffffff", align: "center", lh: 1.1, role: "title", shadow: { x: 4, y: 4, b: 0, c: "#ec4899" } }), t2 = dsText("Sonne · Meer · Sommerferien", 6 * k, H * .86, W - 12 * k, 3.2 * k, { font: "Poppins", weight: 600, color: "#fde68a", align: "center", ls: 2, role: "sub" });
    dsFlow(H * (W > H * 1.2 ? .54 : .66) - 12 * k, 2 * k, [t1]); t2.y = t1.y + t1.h + 2 * k; o.push(t1, t2);
    return { bg: dsGrad("#ffb347", "#ff3d7f", 180), objs: o }; } },
  { k: "navy", n: "Business", cat: "Präsentation", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], lw = W * .42;
    o.push(dsShape("rect", 0, 0, lw, H, "#0b1f3a"), dsShape("rtri", lw - 24 * k, H - 24 * k, 24 * k, 24 * k, "#14b8a6", { rot: 0 }), dsShape("circle", lw * .62, H * .1, 20 * k, 20 * k, "none", { stroke: "#14b8a6", sw: 3 }));
    const t1 = dsText("Quartals-\nbericht", 6 * k, 0, lw - 10 * k, 8.4 * k, { font: "Montserrat", weight: 800, color: "#ffffff", lh: 1.05, role: "title" }), t2 = dsText("Ergebnisse, Learnings und nächste Schritte", 6 * k, 0, lw - 10 * k, 2.8 * k, { font: "Montserrat", weight: 400, color: "#9fb3cc", lh: 1.4, role: "sub" });
    dsFlow(H * .32, 3 * k, [t1, t2]); o.push(t1, t2);
    o.push(dsText("Agenda", lw + 8 * k, H * .2, W - lw - 14 * k, 4 * k, { font: "Montserrat", weight: 800, color: "#0b1f3a" }));
    ["Überblick & Ziele", "Zahlen im Detail", "Erkenntnisse", "Ausblick"].forEach((s, i) => o.push(dsShape("circle", lw + 8 * k, H * .34 + i * 11 * k, 6 * k, 6 * k, "#14b8a6"), dsText(String(i + 1), lw + 8 * k, H * .34 + i * 11 * k + 1.1 * k, 6 * k, 3.4 * k, { font: "Montserrat", weight: 800, color: "#ffffff", align: "center" }), dsText(s, lw + 17 * k, H * .34 + i * 11 * k + .9 * k, W - lw - 24 * k, 3.6 * k, { font: "Montserrat", weight: 600, color: "#1f2937", role: i === 0 ? "body" : "" })));
    return { bg: "#ffffff", objs: o }; } },
  { k: "quote", n: "Zitat", cat: "Social", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], pad = 9 * k;
    o.push(dsShape("circle", W - 38 * k, -14 * k, 56 * k, 56 * k, "#ffffff", { op: .08 }), dsShape("circle", -16 * k, H - 36 * k, 50 * k, 50 * k, "#ffffff", { op: .08 }), dsText("“", pad - 2 * k, pad - 4 * k, 30 * k, 30 * k, { font: "Playfair Display", weight: 800, color: "#ffffff", op: .3, lh: 1 }));
    const t1 = dsText("Es ist nicht wenig Zeit, die wir haben, sondern viel, die wir nicht nutzen.", pad, 0, W - pad * 2, W > H * 1.2 ? 6 * k : 7.2 * k, { font: "Playfair Display", weight: 700, italic: true, color: "#ffffff", lh: 1.22, role: "title" }), t2 = dsText("— SENECA", pad, 0, W - pad * 2, 2.8 * k, { font: "Space Grotesk", weight: 700, color: "#a7f3d0", ls: 4, role: "sub" });
    dsFlow(H * .3, 5 * k, [t1, t2]); o.push(t1, t2);
    return { bg: dsGrad("#0f766e", "#0ea5e9", 140), objs: o }; } },
  { k: "invite", n: "Einladung", cat: "Party", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], m = 4 * k;
    o.push(dsShape("rect", m, m, W - m * 2, H - m * 2, "none", { stroke: "#d4af37", sw: 3 }), dsShape("rect", m * 1.7, m * 1.7, W - m * 3.4, H - m * 3.4, "none", { stroke: "#d4af37", sw: 1 }));
    [0, 1, 2].forEach(i => o.push(dsShape("diamond", W / 2 - 1.8 * k + (i - 1) * 6 * k, H * .1, 3.6 * k, 3.6 * k, "#d4af37")));
    const w = W - 20 * k, x = 10 * k, a = dsText("DU BIST EINGELADEN", x, 0, w, 2.4 * k, { font: "Montserrat", weight: 600, color: "#d4af37", align: "center", ls: 5, role: "sub" }), b = dsText("Lena\nwird 18", x, 0, w, 11 * k, { font: "Playfair Display", weight: 700, italic: true, color: "#fdf6e3", align: "center", lh: 1.05, role: "title" }), c = dsText("Samstag, 14. September 2026\num 18:00 Uhr", x, 0, w, 3.2 * k, { font: "Lora", weight: 400, color: "#f5ecd0", align: "center", lh: 1.5, role: "date" }), d = dsText("Gartenstrasse 12 · Zürich\nUm Zusage bis 1. September", x, 0, w, 2.6 * k, { font: "Lora", italic: true, weight: 400, color: "#c9b87a", align: "center", lh: 1.5, role: "body" });
    dsFlow(H * .2, 4 * k, [a, b, c]); d.y = H - 18 * k; o.push(a, b, dsShape("rect", W / 2 - 8 * k, c.y - 2.4 * k, 16 * k, .35 * k, "#d4af37"), c, d);
    return { bg: "#0f2a1f", objs: o }; } },
  { k: "title", n: "Titelfolie", cat: "Präsentation", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], pad = 9 * k;
    o.push(dsShape("blob1", W * .55, -H * .25, W * .6, H * .9, dsGrad("#6366f1", "#8b5cf6"), { op: .55 }), dsShape("blob3", W * .7, H * .5, W * .45, H * .8, dsGrad("#06b6d4", "#3b82f6"), { op: .45 }), dsShape("rect", pad, pad, 6 * k, 1 * k, "#22d3ee", { r: k }));
    const t1 = dsText("Ideen, die\nbleiben", pad, 0, W * .64, W > H * 1.2 ? 9.6 * k : 9 * k, { font: "Space Grotesk", weight: 700, color: "#ffffff", lh: 1.04, ls: -1, role: "title" }), t2 = dsText("Eine kurze Reise durch Konzepte, Beispiele und Lösungen", pad, 0, W * .5, 3.1 * k, { font: "Inter", weight: 400, color: "#a5b4fc", lh: 1.45, role: "sub" });
    dsFlow(H * .28, 3 * k, [t1, t2]); o.push(t1, t2, dsText("Alex Muster · Oktober 2026", pad, H - pad - 3 * k, W * .5, 2.4 * k, { font: "Inter", weight: 600, color: "#c7d2fe", role: "date" }));
    return { bg: "#0b1220", objs: o }; } },
  { k: "cert", n: "Zertifikat", cat: "Schule", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [], m = 4 * k;
    o.push(dsShape("rect", m, m, W - m * 2, H - m * 2, "none", { stroke: "#1e3a8a", sw: 6 }), dsShape("rect", m * 1.8, m * 1.8, W - m * 3.6, H - m * 3.6, "none", { stroke: "#c9a227", sw: 2 }));
    const w = W - 28 * k, x = 14 * k, a = dsText("ZERTIFIKAT", x, H * .17, w, 8 * k, { font: "Playfair Display", weight: 700, color: "#1e3a8a", align: "center", ls: 10, role: "title" }), b = dsText("für herausragende Leistungen verliehen an", x, 0, w, 2.7 * k, { font: "Lora", italic: true, weight: 400, color: "#6b7280", align: "center", role: "sub" }), c = dsText("Alex Muster", x, 0, w, 9 * k, { font: "Dancing Script", weight: 700, color: "#111827", align: "center", role: "name" }), d = dsText("für den erfolgreichen Abschluss des Kurses „Lernen lernen“.", x, 0, w, 2.6 * k, { font: "Lora", weight: 400, color: "#374151", align: "center", role: "body" });
    dsFlow(H * .17, 3 * k, [a, b, c, d]); o.push(a, b, dsShape("rect", W / 2 - 22 * k, c.y + c.h, 44 * k, .3 * k, "#c9a227"), c, d, dsShape("burst", W / 2 - 7 * k, H - 26 * k, 14 * k, 14 * k, dsGrad("#e8c547", "#b8860b")), dsText("🏅", W / 2 - 4 * k, H - 24.4 * k, 8 * k, 8 * k, { font: "Inter", align: "center" }), dsShape("rect", x + 4 * k, H - 13 * k, 24 * k, .25 * k, "#374151"), dsShape("rect", W - x - 28 * k, H - 13 * k, 24 * k, .25 * k, "#374151"), dsText("Datum", x + 4 * k, H - 11.4 * k, 24 * k, 2 * k, { font: "Lora", color: "#6b7280", align: "center" }), dsText("Unterschrift", W - x - 28 * k, H - 11.4 * k, 24 * k, 2 * k, { font: "Lora", color: "#6b7280", align: "center" }));
    return { bg: "#fffaf0", objs: o }; } },
  { k: "party", n: "Konfetti-Party", cat: "Party", make: (W, H) => {
    const k = Math.sqrt(W * H) / 100, o = [...dsConfetti(W, H, 21, 54)];
    const t1 = dsText("Happy\nBirthday!", 6 * k, 0, W - 12 * k, 14 * k, { font: "Pacifico", weight: 400, color: "#ef4444", align: "center", lh: 1.08, role: "title", shadow: { x: 5, y: 5, b: 0, c: "#fde68a" } }), t2 = dsText("Alles Gute zum Geburtstag – feier schön!", 6 * k, 0, W - 12 * k, 3.4 * k, { font: "Poppins", weight: 600, color: "#7c2d12", align: "center", role: "sub" });
    dsFlow(H * .3, 3 * k, [t1, t2]); o.push(dsText("🎂", W / 2 - 7 * k, H * .12, 14 * k, 12 * k, { font: "Inter", align: "center" }), t1, t2);
    return { bg: "#fff7ed", objs: o }; } },
];
const DS_TPL_CATS = ["Alle", "Plakat", "Social", "Schule", "Party", "Präsentation"];

/* Seite aus Vorlage – Texte mit KI-Inhalt füllen (roles: title, sub, body, date, name) */
function dsPageFromTemplate(tpl, W, H, texts) {
  const p = tpl.make(W, H), page = { id: dsId(), bg: p.bg, objs: p.objs };
  if (texts) page.objs.forEach(o => { if (o.type === "text" && o.role && texts[o.role] != null && String(texts[o.role]).trim()) { o.txt = String(texts[o.role]); } });
  return page;
}
function dsBlankPage(W, H, bg) { return { id: dsId(), bg: bg || "#ffffff", objs: [] }; }
