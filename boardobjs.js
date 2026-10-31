"use strict";
P.hash = '<path d="M5 9h14M5 15h14M9 4v16M15 4v16"/>';
P.user = '<circle cx="12" cy="8.5" r="3.6"/><path d="M5 19.5c.6-3.3 3.6-5.2 7-5.2s6.4 1.9 7 5.2"/>';
Object.assign(P, { arrowr: '<path d="M5 12h14M13 6l6 6-6 6"/>', send: '<path d="M20 4L10.5 13.5M20 4l-6 16-3.5-6.5L4 10z"/>', chat: '<path d="M5 6.5C5 5.7 5.7 5 6.5 5h11c.8 0 1.5.7 1.5 1.5v8c0 .8-.7 1.5-1.5 1.5H10l-4 3.5V16h0c-.6 0-1-.4-1-1z"/><path d="M9 9h6M9 12h4"/>', userplus: '<circle cx="10" cy="8.5" r="3.4"/><path d="M3.5 19c.6-3.2 3.2-5 6.5-5s5.9 1.8 6.5 5M18 8v6M15 11h6"/>', full: '<path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4"/>', todo: '<path d="M4.5 7.5l1.6 1.6 2.9-3M4.5 15.5l1.6 1.6 2.9-3M12.5 7.5H20M12.5 15.5H20"/>', sumi: '<path d="M5 7h14M5 12h14M5 17h9"/>', xchk: '<path d="M7 4h7l4 4v12H7z"/><path d="M10 14l2 2 3.5-4"/>', lifebuoy: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M6.4 6.4l3.3 3.3M14.3 14.3l3.3 3.3M17.6 6.4l-3.3 3.3M9.7 14.3l-3.3 3.3"/>', prof: '<rect x="5" y="4" width="14" height="16" rx="3"/><circle cx="12" cy="10" r="2.4"/><path d="M8 17c.5-2 2-3 4-3s3.5 1 4 3"/>' });
P.chevr = '<path d="M9.5 6l6 6-6 6"/>';
/* Whiteboard-Elemente (wie Miro): Notizzettel mit Pin, Haftnotizen, Pins, Karten, Formen, Rahmen.
   Liegen als echte, direkt bearbeitbare Elemente über der Zeichenfläche (Text überall editierbar, verschieb- und skalierbar). */
const PIN_COLORS = ["#FFC907", "#525151", "#63A1FE", "#F26655", "#F5A429", "#DA9DFF", "#BDBDBD", "#39C15F"];
const STICKY_COLORS = ["#FFEA79", "#93E396", "#B1D0FF", "#EABFFF", "#FFBDAE", "#EAC287", "#CED3DA", "#F8F8F8"];
const SHAPE_COLORS = ["#ffffff", "#eceaff", "#e3f6ea", "#ffeedd", "#ffe3e3", "#e2eefe", "#111111"];
const PIN_D = ["M52.4077 28.4448L68.5679 44.605L57.2243 63.3128L33.6999 39.7884L52.4077 28.4448Z", "M33.6997 39.7883L57.2241 63.3128L54.9294 80.3237C54.6149 82.655 51.7663 83.6169 50.1029 81.9535L15.059 46.9096C13.3956 45.2462 14.3575 42.3976 16.6888 42.0831L33.6997 39.7883Z", "M53.8598 8.20579C54.0341 5.77687 56.9827 4.67751 58.7046 6.39943L90.6132 38.308C92.3351 40.0299 91.2357 42.9784 88.8068 43.1527L68.5677 44.6051L52.4075 28.4448L53.8598 8.20579Z"];
const PIN_TIP = "M16.1589 73.4895L28.8989 60.7495L36.2631 68.1137L30.0721 74.3046C30.0721 74.3046 28.1391 76.173 22.853 76.5439C17.5668 76.9148 16.1589 73.4895 16.1589 73.4895Z";
let _pinN = 0;
function pinSvg(c) {
  const n = ++_pinN, g = (i, a) => `<linearGradient id="pg${n}_${i}" x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  const A = [[35.9, 26.97, 49.69, 42.59], [3.69, 6.57, 39.84, 76.99], [33.57, 9.6, 64.53, 35.57], [23.92, 60.8, 32.83, 68.9]];
  return `<svg class="pinsvg" viewBox="12 4 82 82" aria-hidden="true"><defs>${A.map((a, i) => g(i, a)).join("")}</defs>${PIN_D.map((d, i) => `<path d="${d}" fill="${c}"/><path d="${d}" fill="url(#pg${n}_${i})"/>`).join("")}<path d="${PIN_TIP}" fill="#8F8F8F"/><path d="${PIN_TIP}" fill="url(#pg${n}_3)"/></svg>`;
}
function boardObjects(X) {
  const { host, cam, st, snap, touch } = X; st.objs = st.objs || [];
  const layer = document.createElement("div"); layer.className = "bo-layer"; host.appendChild(layer);
  let sel = null, tbar = null, drag = null; const byId = id => st.objs.find(o => o.id === id), elOf = o => layer.querySelector(`[data-id="${o.id}"]`);
  const DEF = { note: { w: 360, h: 280 }, sticky: { w: 190, h: 190 }, pin: { w: 46, h: 46 }, card: { w: 300, h: 190 }, frame: { w: 520, h: 360 }, shape: { w: 220, h: 140 } };
  const PH = { note: "Schreibe hier …", sticky: "Idee …", card: "Beschreibung …", shape: "Text" };
  function sync() { layer.style.transform = `translate(${-cam.x * cam.z}px,${-cam.y * cam.z}px) scale(${cam.z})`; if (tbar) placeBar(); }
  function html(o) {
    const ed = (f, cls, ph) => `<div class="${cls}" contenteditable="plaintext-only" spellcheck="false" data-f="${f}" data-ph="${ph}">${esc(o[f] || "")}</div>`;
    if (o.type === "pin") return `<div class="bo-pin bo-grip">${pinSvg(o.color)}</div>`;
    if (o.type === "note") return `<span class="bo-pinw bo-grip">${pinSvg(o.pin || PIN_COLORS[0])}</span>${ed("title", "bo-h", "Titel")}<i class="bo-rule"></i>${ed("text", "bo-b", PH.note)}<i class="bo-rs"></i>`;
    if (o.type === "sticky") return `<i class="bo-grip"></i>${ed("text", "bo-t", PH.sticky)}<i class="bo-rs"></i>`;
    if (o.type === "card") return `<i class="bo-strip" style="background:${o.color}"></i><i class="bo-grip"></i>${ed("title", "bo-h", "Titel")}${ed("text", "bo-t", PH.card)}<i class="bo-rs"></i>`;
    if (o.type === "frame") return `<i class="bo-grip"></i>${ed("title", "bo-ft", "Rahmen")}<i class="bo-rs"></i>`;
    if (o.type === "shape") return `<i class="bo-grip"></i>${ed("text", "bo-t", PH.shape)}<i class="bo-rs"></i>`;
    return "";
  }
  function style(o, el) {
    el.style.left = o.x + "px"; el.style.top = o.y + "px"; el.style.width = o.w + "px"; if (o.type !== "pin") el.style.height = o.h + "px"; el.style.zIndex = o.type === "frame" ? 1 : 2 + (o.z || 0);
    if (o.type === "sticky") el.style.background = o.color; if (o.type === "shape") { el.style.setProperty("--f", o.color); el.style.color = o.color === "#111111" ? "#fff" : "#111"; }
    if (o.type === "frame") el.style.setProperty("--f", o.color || "#8d8d98");
  }
  function mount(o) {
    const el = document.createElement("div"); el.className = `bo bo-${o.type}${o.type === "shape" ? " sh-" + (o.kind || "rect") : ""}`; el.dataset.id = o.id; el.innerHTML = html(o); style(o, el); layer.appendChild(el);
    $$("[contenteditable]", el).forEach(t => { t.oninput = () => { o[t.dataset.f] = t.innerText.replace(/\n$/, ""); touch(); }; t.onfocus = () => select(o); t.onkeydown = e => { e.stopPropagation(); if (e.key === "Escape") t.blur(); }; });
    return el;
  }
  function rebuild() { layer.innerHTML = ""; sel = null; killBar(); st.objs.forEach(mount); }
  function add(type, extra = {}) {
    snap(); const d = DEF[type], cx = cam.x + (host.clientWidth / 2) / cam.z, cy = cam.y + (host.clientHeight / 2) / cam.z, j = (st.objs.length % 5) * 22 - 44;
    const o = { id: uid(), type, x: Math.round(cx - d.w / 2 + j), y: Math.round(cy - d.h / 2 + j), w: d.w, h: d.h, z: st.objs.length, ...extra };
    if (type === "note") { o.pin = o.pin || PIN_COLORS[st.objs.filter(x => x.type === "note").length % PIN_COLORS.length]; o.title = ""; o.text = ""; }
    if (type === "sticky") { o.color = o.color || STICKY_COLORS[0]; o.text = ""; }
    if (type === "pin") o.color = o.color || PIN_COLORS[st.objs.filter(x => x.type === "pin").length % PIN_COLORS.length];
    if (type === "card") { o.color = o.color || "#5b3df5"; o.title = ""; o.text = ""; }
    if (type === "frame") { o.color = "#8d8d98"; o.title = ""; }
    if (type === "shape") { o.kind = o.kind || "rect"; o.color = o.color || "#eceaff"; o.text = ""; }
    st.objs.push(o); const el = mount(o); select(o); touch(); const t = $("[contenteditable]", el); if (t) setTimeout(() => t.focus(), 30); return o;
  }
  function select(o) { if (sel === o) return; sel = o; $$(".bo.on", layer).forEach(e => e.classList.remove("on")); if (o) { elOf(o)?.classList.add("on"); showBar(); } else killBar(); }
  function killBar() { tbar?.remove(); tbar = null; }
  function colorsFor(o) { return o.type === "note" ? [PIN_COLORS, "pin"] : o.type === "pin" ? [PIN_COLORS, "color"] : o.type === "sticky" ? [STICKY_COLORS, "color"] : o.type === "shape" ? [SHAPE_COLORS, "color"] : o.type === "card" ? [["#5b3df5", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#ec4899"], "color"] : o.type === "frame" ? [["#8d8d98", "#5b3df5", "#e5484d", "#16a34a", "#2563eb"], "color"] : null; }
  function showBar() {
    killBar(); if (!sel) return; const o = sel, cs = colorsFor(o);
    tbar = document.createElement("div"); tbar.className = "bo-bar"; tbar.onpointerdown = e => e.stopPropagation();
    tbar.innerHTML = `${cs ? cs[0].map(c => `<button class="bc ${o[cs[1]] === c ? "on" : ""}" data-c="${c}" style="background:${c}" aria-label="Farbe"></button>`).join("") + "<i></i>" : ""}${o.type === "shape" ? ["rect", "round", "ellipse", "diamond"].map(k => `<button class="bk ${(o.kind || "rect") === k ? "on" : ""}" data-k="${k}" title="${k}"><b class="sk-${k}"></b></button>`).join("") + "<i></i>" : ""}<button data-a="front" title="Nach vorn">${ic("up")}</button><button data-a="dup" title="Duplizieren">${ic("copy")}</button><button data-a="del" title="Löschen (Entf)">${ic("trash")}</button>`;
    host.appendChild(tbar);
    $$("[data-c]", tbar).forEach(b => b.onclick = () => { snap(); o[cs[1]] = b.dataset.c; refresh(o); showBar(); touch(); });
    $$("[data-k]", tbar).forEach(b => b.onclick = () => { snap(); o.kind = b.dataset.k; refresh(o); showBar(); touch(); });
    $("[data-a=front]", tbar).onclick = () => { snap(); o.z = Math.max(0, ...st.objs.map(x => x.z || 0)) + 1; style(o, elOf(o)); touch(); };
    $("[data-a=dup]", tbar).onclick = () => { snap(); const c = { ...JSON.parse(JSON.stringify(o)), id: uid(), x: o.x + 30, y: o.y + 30, z: (o.z || 0) + 1 }; st.objs.push(c); mount(c); select(c); touch(); };
    $("[data-a=del]", tbar).onclick = () => del(o); placeBar();
  }
  function placeBar() { const el = sel && elOf(sel); if (!el || !tbar) return; const r = el.getBoundingClientRect(), h = host.getBoundingClientRect(); tbar.style.left = Math.max(8, Math.min(h.width - tbar.offsetWidth - 8, r.left - h.left + r.width / 2 - tbar.offsetWidth / 2)) + "px"; tbar.style.top = Math.max(8, r.top - h.top - tbar.offsetHeight - 12 - (sel.type === "note" ? 40 * cam.z : 0)) + "px"; }
  function refresh(o) { const old = elOf(o), on = old.classList.contains("on"), el = mount(o); old.replaceWith(el); if (on) el.classList.add("on"); }
  function del(o) { snap(); st.objs = st.objs.filter(x => x !== o); elOf(o)?.remove(); select(null); touch(); }
  layer.addEventListener("pointerdown", e => {
    const el = e.target.closest(".bo"); if (!el) return; const o = byId(el.dataset.id); if (!o) return; if (!e.target.closest("[contenteditable]")) { select(o); if (document.activeElement?.isContentEditable) document.activeElement.blur(); } else return;
    const rs = e.target.closest(".bo-rs"), grip = e.target.closest(".bo-grip") || (!rs && !e.target.closest("[contenteditable]") && o.type !== "frame");
    if (!rs && !grip) return; e.preventDefault(); e.stopPropagation(); el.setPointerCapture?.(e.pointerId);
    drag = { o, el, rs: !!rs, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, ow: o.w, oh: o.h, moved: false };
  });
  addEventListener("pointermove", e => {
    if (!drag) return; const dx = (e.clientX - drag.sx) / cam.z, dy = (e.clientY - drag.sy) / cam.z; if (!drag.moved && Math.hypot(dx, dy) * cam.z < 3) return; if (!drag.moved) { snap(); drag.moved = true; }
    const o = drag.o; if (drag.rs) { o.w = Math.max(80, Math.round(drag.ow + dx)); o.h = Math.max(60, Math.round(drag.oh + dy)); } else { o.x = Math.round(drag.ox + dx); o.y = Math.round(drag.oy + dy); } style(o, drag.el); placeBar();
  });
  const end = () => { if (drag?.moved) touch(); drag = null; }; addEventListener("pointerup", end); addEventListener("pointercancel", end);
  host.addEventListener("pointerdown", e => { if (!e.target.closest(".bo") && !e.target.closest(".bo-bar")) { if (document.activeElement?.isContentEditable) document.activeElement.blur(); select(null); } }, true);
  const keys = e => { if (!sel || e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return; if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(sel); } };
  document.addEventListener("keydown", keys);
  /* Zeichnen auf Leinwand (Vorschaubild, PNG-Export) */
  function wrap(c, text, w) { const out = []; String(text || "").split("\n").forEach(p => { let l = ""; p.split(" ").forEach(wd => { const t = l ? l + " " + wd : wd; if (c.measureText(t).width > w && l) { out.push(l); l = wd; } else l = t; }); out.push(l); }); return out; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  function paint(c) {
    [...st.objs].sort((a, b) => (a.type === "frame" ? -1 : 0) - (b.type === "frame" ? -1 : 0) || (a.z || 0) - (b.z || 0)).forEach(o => {
      c.save(); c.textBaseline = "top"; const fs = 16, lh = 24;
      const txt = (t, x, y, w, ph, font, col) => { c.font = font || `500 ${fs}px Inter, system-ui, sans-serif`; c.fillStyle = col || "#222"; wrap(c, t, w).slice(0, 40).forEach((l, i) => c.fillText(l, x, y + i * lh)); };
      if (o.type === "pin") { c.translate(o.x, o.y); c.scale(o.w / 82, o.w / 82); c.translate(-12, -4); PIN_D.forEach(d => { c.fillStyle = o.color; c.fill(new Path2D(d)); }); c.fillStyle = "#8F8F8F"; c.fill(new Path2D(PIN_TIP)); }
      else if (o.type === "note") { c.shadowColor = "rgba(0,0,0,.18)"; c.shadowBlur = 8; c.shadowOffsetY = 3; rr(c, o.x, o.y, o.w, o.h, 6); c.fillStyle = "#fff"; c.fill(); c.shadowColor = "transparent"; c.strokeStyle = "#ababab"; c.lineWidth = 1; c.stroke(); txt(o.title, o.x + 20, o.y + 18, o.w - 40, "", "700 20px Inter, system-ui, sans-serif", "#575757"); c.fillStyle = "#f15353"; c.fillRect(o.x + 16, o.y + 54, o.w - 32, 2); c.strokeStyle = "#dde3f0"; for (let y = o.y + 86; y < o.y + o.h - 8; y += 28) { c.beginPath(); c.moveTo(o.x + 16, y); c.lineTo(o.x + o.w - 16, y); c.stroke(); } txt(o.text, o.x + 20, o.y + 62, o.w - 40, "", `500 16px Inter, system-ui, sans-serif`); c.save(); c.translate(o.x + o.w / 2 - 22, o.y - 36); c.scale(44 / 82, 44 / 82); c.translate(-12, -4); PIN_D.forEach(d => { c.fillStyle = o.pin; c.fill(new Path2D(d)); }); c.fillStyle = "#8F8F8F"; c.fill(new Path2D(PIN_TIP)); c.restore(); }
      else if (o.type === "sticky") { c.shadowColor = "rgba(0,0,0,.18)"; c.shadowBlur = 10; c.shadowOffsetY = 4; c.fillStyle = o.color; c.fillRect(o.x, o.y, o.w, o.h); c.shadowColor = "transparent"; txt(o.text, o.x + 14, o.y + 24, o.w - 28); }
      else if (o.type === "card") { c.shadowColor = "rgba(0,0,0,.15)"; c.shadowBlur = 8; c.shadowOffsetY = 3; rr(c, o.x, o.y, o.w, o.h, 14); c.fillStyle = "#fff"; c.fill(); c.shadowColor = "transparent"; c.fillStyle = o.color; c.fillRect(o.x, o.y, o.w, 6); txt(o.title, o.x + 16, o.y + 20, o.w - 32, "", "700 18px Inter, system-ui, sans-serif", "#111"); txt(o.text, o.x + 16, o.y + 52, o.w - 32); }
      else if (o.type === "frame") { c.strokeStyle = o.color || "#8d8d98"; c.lineWidth = 2; c.setLineDash([8, 6]); rr(c, o.x, o.y, o.w, o.h, 10); c.stroke(); c.setLineDash([]); c.font = "700 15px Inter, system-ui, sans-serif"; c.fillStyle = o.color || "#8d8d98"; c.fillText(o.title || "Rahmen", o.x + 4, o.y - 22); }
      else if (o.type === "shape") { c.fillStyle = o.color; c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1.5; c.beginPath(); const k = o.kind || "rect"; if (k === "ellipse") c.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, 7); else if (k === "diamond") { c.moveTo(o.x + o.w / 2, o.y); c.lineTo(o.x + o.w, o.y + o.h / 2); c.lineTo(o.x + o.w / 2, o.y + o.h); c.lineTo(o.x, o.y + o.h / 2); c.closePath(); } else rr(c, o.x, o.y, o.w, o.h, k === "round" ? Math.min(o.w, o.h) / 2 : 6); c.fill(); c.stroke(); txt(o.text, o.x + 14, o.y + o.h / 2 - 12, o.w - 28, "", "600 16px Inter, system-ui, sans-serif", o.color === "#111111" ? "#fff" : "#111"); }
      c.restore();
    });
  }
  function bounds() { let b = null; st.objs.forEach(o => { const x0 = o.x, y0 = o.y - (o.type === "note" ? 40 : 0), x1 = o.x + o.w, y1 = o.y + o.h; b = b ? { x0: Math.min(b.x0, x0), y0: Math.min(b.y0, y0), x1: Math.max(b.x1, x1), y1: Math.max(b.y1, y1) } : { x0, y0, x1, y1 }; }); return b; }
  rebuild(); sync();
  return { sync, add, rebuild, paint, bounds, select, destroy() { document.removeEventListener("keydown", keys); layer.remove(); tbar?.remove(); } };
}
