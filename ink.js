"use strict";
/* Lumi ink – a drawing layer on top of a note: write and draw in the same document.
   Coordinates are CSS px: x relative to the paper centre (stays aligned with the text column), y from the paper top. */

const INK_COL = ["#1c1c22", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#ffffff"];
const INK_TOOLS = [["pen", "Stift", "brush"], ["hl", "Marker", "hl"], ["eraser", "Radierer", "eraser"], ["line", "Linie", "line"], ["arrow", "Pfeil", "arrow"], ["rect", "Rechteck", "square"], ["ellipse", "Kreis", "circle"], ["hand", "Scrollen", "cursor"]];

function createInk(paper, d, opts = {}) {
  const st = { strokes: [], hist: [], redo: [], tool: "pen", color: INK_COL[0], size: 4, cur: null, on: false, penSeen: false };
  const cv = document.createElement("canvas"); cv.className = "inkcv"; paper.appendChild(cv);
  const ctx = cv.getContext("2d"); let W = 0, H = 0, dpr = 1;
  const cx = () => W / 2;
  const onChange = opts.onChange || (() => {});

  function size() {
    const w = paper.clientWidth, h = Math.max(paper.scrollHeight, paper.clientHeight);
    if (w === W && h === H) return; W = w; H = h; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); render();
  }
  function stroke(s) {
    const c = ctx, p = s.pts, X = q => q[0] + cx();
    c.save(); c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = s.color; c.fillStyle = s.color; c.lineWidth = s.size;
    if (s.type === "pen" || s.type === "hl") {
      if (s.type === "hl") { c.globalAlpha = .32; c.lineWidth = s.size * 4; c.lineCap = "butt"; }
      if (p.length === 1) { c.beginPath(); c.arc(X(p[0]), p[0][1], s.type === "hl" ? s.size * 2 : s.size / 2, 0, 7); c.fill(); }
      else if (s.pr && s.type === "pen") { for (let i = 1; i < p.length; i++) { c.lineWidth = s.size * (.35 + (p[i][2] || .5) * 1.3); c.beginPath(); c.moveTo(X(p[i - 1]), p[i - 1][1]); c.lineTo(X(p[i]), p[i][1]); c.stroke(); } }
      else { c.beginPath(); c.moveTo(X(p[0]), p[0][1]); for (let i = 1; i < p.length - 1; i++) { const mx = (X(p[i]) + X(p[i + 1])) / 2, my = (p[i][1] + p[i + 1][1]) / 2; c.quadraticCurveTo(X(p[i]), p[i][1], mx, my); } const l = p[p.length - 1]; c.lineTo(X(l), l[1]); c.stroke(); }
    } else {
      const a = p[0], b = p[1] || p[0];
      if (s.type === "line" || s.type === "arrow") {
        c.beginPath(); c.moveTo(X(a), a[1]); c.lineTo(X(b), b[1]); c.stroke();
        if (s.type === "arrow") { const an = Math.atan2(b[1] - a[1], X(b) - X(a)), h = 12 + s.size * 2; c.beginPath(); c.moveTo(X(b), b[1]); c.lineTo(X(b) - h * Math.cos(an - .45), b[1] - h * Math.sin(an - .45)); c.moveTo(X(b), b[1]); c.lineTo(X(b) - h * Math.cos(an + .45), b[1] - h * Math.sin(an + .45)); c.stroke(); }
      } else if (s.type === "rect") c.strokeRect(Math.min(X(a), X(b)), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      else if (s.type === "ellipse") { c.beginPath(); c.ellipse((X(a) + X(b)) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, 7); c.stroke(); }
    }
    c.restore();
  }
  function render() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); st.strokes.forEach(stroke); if (st.cur) stroke(st.cur); }
  const d2 = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy)); };
  function hit(s, x, y, r) {
    const p = s.pts, rr = r + (s.type === "hl" ? s.size * 2 : s.size / 2);
    if (s.type === "pen" || s.type === "hl") return p.length === 1 ? Math.hypot(x - p[0][0], y - p[0][1]) < rr : p.some((q, i) => i && d2(x, y, p[i - 1], q) < rr);
    if (s.type === "line" || s.type === "arrow") return d2(x, y, p[0], p[1]) < rr;
    if (s.type === "rect") { const [a, b] = p, k = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; return k.some((q, i) => d2(x, y, q, k[(i + 1) % 4]) < rr); }
    if (s.type === "ellipse") { const ex = (p[0][0] + p[1][0]) / 2, ey = (p[0][1] + p[1][1]) / 2, rx = Math.abs(p[1][0] - p[0][0]) / 2 || 1, ry = Math.abs(p[1][1] - p[0][1]) / 2 || 1; return Math.abs(Math.hypot((x - ex) / rx, (y - ey) / ry) - 1) * Math.min(rx, ry) < rr; }
    return false;
  }
  const snap = () => { st.hist.push([...st.strokes]); if (st.hist.length > 80) st.hist.shift(); st.redo = []; };
  const undo = () => { if (!st.hist.length) return; st.redo.push([...st.strokes]); st.strokes = st.hist.pop(); render(); changed(); };
  const redo = () => { if (!st.redo.length) return; st.hist.push([...st.strokes]); st.strokes = st.redo.pop(); render(); changed(); };
  const changed = () => { const mx = Math.max(0, ...st.strokes.flatMap(s => s.pts.map(q => q[1]))); onChange(st.strokes, mx); updUI(); };

  const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left - r.width / 2, e.clientY - r.top]; };
  let drawing = false, erased = false;
  const SHAPES = ["line", "arrow", "rect", "ellipse"];
  cv.addEventListener("pointerdown", e => {
    if (!st.on || st.tool === "hand") return;
    if (e.pointerType === "pen") st.penSeen = true; if (e.pointerType === "touch" && st.penSeen) return;
    if (e.button > 0) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = pos(e); drawing = true;
    if (st.tool === "eraser") { snap(); erased = false; eraseAt(p); return; }
    st.cur = { type: st.tool, color: st.tool === "hl" && st.color === "#ffffff" ? "#ffe600" : st.color, size: st.size, pts: [[p[0], p[1], e.pressure || .5]], pr: e.pointerType === "pen" };
    if (SHAPES.includes(st.tool)) st.cur.pts.push([p[0], p[1]]);
    render();
  });
  function eraseAt(p) { const n = st.strokes.length; st.strokes = st.strokes.filter(s => !hit(s, p[0], p[1], 12)); if (st.strokes.length !== n) { erased = true; render(); } }
  cv.addEventListener("pointermove", e => {
    if (!drawing || (e.pointerType === "touch" && st.penSeen)) return;
    for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) {
      const p = pos(ev);
      if (st.tool === "eraser") eraseAt(p);
      else if (st.cur) { if (SHAPES.includes(st.cur.type)) st.cur.pts[1] = [p[0], p[1]]; else st.cur.pts.push([p[0], p[1], ev.pressure || .5]); }
    }
    if (st.cur) render();
  });
  const up = () => {
    if (!drawing) return; drawing = false;
    if (st.tool === "eraser") { if (!erased) st.hist.pop(); else changed(); return; }
    if (st.cur) { const s = st.cur; st.cur = null; if (SHAPES.includes(s.type) && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 3) { render(); return; } snap(); st.strokes.push(s); render(); changed(); }
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* floating palette (foreground) */
  const pal = document.createElement("div"); pal.className = "inkpal"; pal.hidden = true;
  pal.innerHTML = `<div class="ip-row">${INK_TOOLS.map(([k, t, i]) => `<button class="tbtn" data-t="${k}" title="${t}" aria-label="${t}">${ic(i)}</button>`).join("")}</div>
  <i class="ip-sep"></i><div class="ip-cols">${INK_COL.map(c => `<button class="cdot" data-c="${c}" style="background:${c}" aria-label="Farbe"></button>`).join("")}<label class="cdot pick" title="Eigene Farbe"><input type="color" id="ip-cc" value="#2563eb"></label></div>
  <i class="ip-sep"></i><input type="range" id="ip-sz" min="2" max="18" value="4" aria-label="Strichstärke">
  <i class="ip-sep"></i><div class="ip-row"><button class="tbtn" id="ip-un" title="Rückgängig" aria-label="Rückgängig">${ic("undo")}</button><button class="tbtn" id="ip-re" title="Wiederholen" aria-label="Wiederholen">${ic("redo")}</button><button class="tbtn" id="ip-cl" title="Zeichnung leeren" aria-label="Zeichnung leeren">${ic("trash")}</button></div>`;
  document.body.appendChild(pal);
  const $p = s => pal.querySelector(s), $$p = s => [...pal.querySelectorAll(s)];
  function setTool(t) { st.tool = t; $$p("[data-t]").forEach(b => b.classList.toggle("on", b.dataset.t === t)); cv.style.touchAction = t === "hand" ? "auto" : "none"; cv.style.pointerEvents = st.on && t !== "hand" ? "auto" : "none"; cv.style.cursor = t === "eraser" ? "cell" : "crosshair"; }
  function setColor(c) { st.color = c; $$p("[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === c)); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); }
  function updUI() { $p("#ip-un").disabled = !st.hist.length; $p("#ip-re").disabled = !st.redo.length; $p("#ip-cl").disabled = !st.strokes.length; }
  $$p("[data-t]").forEach(b => b.onclick = () => setTool(b.dataset.t));
  $$p("[data-c]").forEach(b => b.onclick = () => setColor(b.dataset.c));
  $p("#ip-cc").oninput = e => { setColor(e.target.value); $$p("[data-c]").forEach(b => b.classList.remove("on")); };
  $p("#ip-sz").oninput = e => st.size = +e.target.value;
  $p("#ip-un").onclick = undo; $p("#ip-re").onclick = redo;
  $p("#ip-cl").onclick = async () => { if (st.strokes.length && await confirmBox("Alle Zeichnungen in diesem Dokument löschen? Der Text bleibt erhalten.", "Löschen")) { snap(); st.strokes = []; render(); changed(); } };

  const key = e => {
    if (!st.on) return; const tag = e.target.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey && !e.altKey) { const k = { p: "pen", h: "hl", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse", v: "hand" }[e.key.toLowerCase()]; if (k) setTool(k); }
  };
  document.addEventListener("keydown", key);
  const ro = new ResizeObserver(size); ro.observe(paper); if (paper.firstElementChild) ro.observe(paper.querySelector(".body") || paper.firstElementChild);

  setColor(st.color); setTool("pen"); updUI();
  return {
    st, canvas: cv,
    load(strokes) { st.strokes = Array.isArray(strokes) ? strokes : []; size(); render(); updUI(); },
    mode(on) { st.on = !!on; pal.hidden = !on; paper.classList.toggle("inking", !!on); setTool(st.tool); if (on) requestAnimationFrame(() => pal.classList.add("show")); else pal.classList.remove("show"); },
    /* white image of the sketch (+ text) for the AI */
    snapshot() { const t = document.createElement("canvas"), s = Math.min(1, 1400 / W); t.width = W * s; t.height = H * s; const c = t.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, t.width, t.height); c.drawImage(cv, 0, 0, t.width, t.height); return t.toDataURL("image/jpeg", .85).split(",")[1]; },
    destroy() { document.removeEventListener("keydown", key); ro.disconnect(); pal.remove(); },
  };
}
