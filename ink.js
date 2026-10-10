"use strict";
/* Lumi ink – a drawing layer on top of a note: write and draw in the same document.
   Coordinates are CSS px: x relative to the paper centre (stays aligned with the text column), y from the paper top. */

const INK_COL = ["#1c1c22", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#ffffff"];
const INK_TOOLS = [["pen", "Stift", "brush"], ["hl", "Marker", "hl"], ["eraser", "Radierer", "eraser"], ["arrow", "Pfeil", "arrow"], ["lasso", "Auswahl: umkreisen, verschieben, löschen", "lasso"], ["laser", "Laserpointer", "laser"], ["hand", "Scrollen", "cursor"]];

function createInk(paper, d, opts = {}) {
  const st = { strokes: [], hist: [], redo: [], tool: "pen", color: INK_COL[0], size: 4, cur: null, on: false, penSeen: false, sel: null, lasso: null, laser: [] };
  const cv = document.createElement("canvas"); cv.className = "inkcv"; paper.appendChild(cv);
  const ctx = cv.getContext("2d"); let W = 0, H = 0, dpr = 1;
  const cx = () => W / 2;
  const onChange = opts.onChange || (() => {});

  function size() {
    const w = paper.clientWidth, h = Math.max(paper.scrollHeight, paper.clientHeight);
    if (w === W && h === H) return; W = w; H = h; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + "px"; cv.style.height = H + "px"; render();
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
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); st.strokes.forEach(stroke); if (st.cur) stroke(st.cur);
    if (st.sel?.size) { const b = selBox(); if (b) { ctx.save(); ctx.strokeStyle = "#5b3df5"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.fillStyle = "rgba(91,61,245,.06)"; const x = b[0] + cx() - 8, y = b[1] - 8, w = b[2] - b[0] + 16, h = b[3] - b[1] + 16; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 12) : ctx.rect(x, y, w, h); ctx.fill(); ctx.stroke(); ctx.restore(); } }
    if (st.lasso && st.lasso.length > 1) { ctx.save(); ctx.strokeStyle = "#5b3df5"; ctx.lineWidth = 1.6; ctx.setLineDash([5, 5]); ctx.beginPath(); st.lasso.forEach((q, i) => i ? ctx.lineTo(q[0] + cx(), q[1]) : ctx.moveTo(q[0] + cx(), q[1])); ctx.stroke(); ctx.restore(); }
    const now = performance.now(); st.laser = st.laser.filter(q => now - q[2] < 750);
    if (st.laser.length) { ctx.save(); ctx.lineCap = "round"; for (let i = 1; i < st.laser.length; i++) { const a = st.laser[i - 1], b = st.laser[i], k = 1 - (now - b[2]) / 750; ctx.strokeStyle = `rgba(255,40,70,${Math.max(0, k)})`; ctx.shadowColor = "rgba(255,40,70,.8)"; ctx.shadowBlur = 12; ctx.lineWidth = 3 + 4 * k; ctx.beginPath(); ctx.moveTo(a[0] + cx(), a[1]); ctx.lineTo(b[0] + cx(), b[1]); ctx.stroke(); } const l = st.laser[st.laser.length - 1]; ctx.fillStyle = "rgba(255,40,70,.95)"; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(l[0] + cx(), l[1], 6, 0, 7); ctx.fill(); ctx.restore(); requestAnimationFrame(render); }
  }
  const selBox = () => { let b = null; st.sel.forEach(s => s.pts.forEach(q => { const r = s.type === "hl" ? s.size * 2 : s.size; b = b ? [Math.min(b[0], q[0] - r), Math.min(b[1], q[1] - r), Math.max(b[2], q[0] + r), Math.max(b[3], q[1] + r)] : [q[0] - r, q[1] - r, q[0] + r, q[1] + r]; })); return b; };
  const inPoly = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const clearSel = () => { if (st.sel) { st.sel = null; render(); updUI(); } };
  /* hold still at the end of a stroke → perfect line / circle / rectangle (like GoodNotes shape snapping) */
  let holdT = 0, last = [0, 0];
  const snapShape = () => {
    const c = st.cur; if (!c || c.type !== "pen" || c.pts.length < 8) return; const p = c.pts, a = p[0], b = p[p.length - 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const xs = p.map(q => q[0]), ys = p.map(q => q[1]), bx = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], diag = Math.hypot(bx[2] - bx[0], bx[3] - bx[1]) || 1;
    const dev = Math.max(...p.map(q => d2(q[0], q[1], a, b)));
    if (len > 24 && dev < Math.max(6, len * .09)) { c.type = "line"; c.pts = [[a[0], a[1]], [b[0], b[1]]]; c.pr = false; }
    else if (len < diag * .3 && diag > 30) { const ex = (bx[0] + bx[2]) / 2, ey = (bx[1] + bx[3]) / 2, rx = (bx[2] - bx[0]) / 2 || 1, ry = (bx[3] - bx[1]) / 2 || 1, rad = p.map(q => Math.hypot((q[0] - ex) / rx, (q[1] - ey) / ry)), m = rad.reduce((x, y) => x + y, 0) / rad.length, v = Math.sqrt(rad.reduce((x, y) => x + (y - m) ** 2, 0) / rad.length);
      c.type = v < .13 ? "ellipse" : "rect"; c.pts = [[bx[0], bx[1]], [bx[2], bx[3]]]; c.pr = false; }
    else return; render(); if (navigator.vibrate) navigator.vibrate(8);
  };
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
    if (st.tool === "laser") { st.laser = [[p[0], p[1], performance.now()]]; render(); return; }
    if (st.tool === "lasso") {
      const b = st.sel?.size ? selBox() : null;
      if (b && p[0] > b[0] - 10 && p[0] < b[2] + 10 && p[1] > b[1] - 10 && p[1] < b[3] + 10) {
        snap(); const repl = new Map(); st.strokes = st.strokes.map(x => { if (!st.sel.has(x)) return x; const n = { ...x, pts: x.pts.map(q => [...q]) }; repl.set(x, n); return n; }); st.sel = new Set(repl.values()); st.moving = p; return;
      }
      st.sel = null; st.lasso = [[p[0], p[1]]]; render(); return;
    }
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
      if (st.tool === "laser") { st.laser.push([p[0], p[1], performance.now()]); continue; }
      if (st.tool === "lasso") { if (st.moving) { const dx = p[0] - st.moving[0], dy = p[1] - st.moving[1]; st.sel.forEach(x => x.pts.forEach(q => { q[0] += dx; q[1] += dy; })); st.moving = p; } else if (st.lasso) st.lasso.push([p[0], p[1]]); continue; }
      if (st.tool === "eraser") eraseAt(p);
      else if (st.cur) { if (SHAPES.includes(st.cur.type)) st.cur.pts[1] = [p[0], p[1]]; else st.cur.pts.push([p[0], p[1], ev.pressure || .5]); }
    }
    if (st.cur || st.laser.length || st.lasso || st.moving) render();
    if (st.cur && st.cur.type === "pen") { const p = pos(e); if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 2) { last = p; clearTimeout(holdT); holdT = setTimeout(snapShape, 520); } }
  });
  const up = () => {
    if (!drawing) return; drawing = false; clearTimeout(holdT);
    if (st.tool === "laser") { render(); return; }
    if (st.tool === "lasso") { if (st.moving) { st.moving = null; render(); changed(); return; } const poly = st.lasso || []; st.lasso = null; const got = poly.length > 3 ? st.strokes.filter(x => x.pts.some(q => inPoly(poly, q[0], q[1]))) : []; st.sel = got.length ? new Set(got) : null; render(); updUI(); return; }
    if (st.tool === "eraser") { if (!erased) st.hist.pop(); else changed(); return; }
    if (st.cur) { const s = st.cur; st.cur = null; if (SHAPES.includes(s.type) && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 3) { render(); return; } snap(); st.strokes.push(s); render(); changed(); }
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);

  /* floating palette (foreground) */
  const pal = document.createElement("div"); pal.className = "inkpal";
  pal.innerHTML = `<div class="ip-row">${INK_TOOLS.map(([k, t, i]) => `<button class="tbtn" data-t="${k}" title="${t}" aria-label="${t}">${ic(i)}</button>`).join("")}</div>
  <i class="ip-sep"></i><div class="ip-cols">${INK_COL.map(c => `<button class="cdot" data-c="${c}" style="background:${c}" aria-label="Farbe"></button>`).join("")}<label class="cdot pick" title="Eigene Farbe"><input type="color" id="ip-cc" value="#2563eb"></label></div>
  <i class="ip-sep"></i><input type="range" id="ip-sz" min="2" max="18" value="4" aria-label="Strichstärke">
  <i class="ip-sep"></i><div class="ip-row"><button class="tbtn" id="ip-un" title="Rückgängig" aria-label="Rückgängig">${ic("undo")}</button><button class="tbtn" id="ip-re" title="Wiederholen" aria-label="Wiederholen">${ic("redo")}</button><button class="tbtn" id="ip-cl" title="Zeichnung leeren" aria-label="Zeichnung leeren">${ic("trash")}</button></div>`;
  (opts.bar || document.body).appendChild(pal);
  const $p = s => pal.querySelector(s), $$p = s => [...pal.querySelectorAll(s)];
  function setTool(t) { if (t !== "lasso" && st.sel) { st.sel = null; render(); } st.tool = t; $$p("[data-t]").forEach(b => b.classList.toggle("on", b.dataset.t === t)); cv.style.touchAction = t === "hand" ? "auto" : "none"; cv.style.pointerEvents = st.on && t !== "hand" ? "auto" : "none"; cv.style.cursor = t === "eraser" ? "cell" : t === "lasso" ? "default" : "crosshair"; }
  function setColor(c) { st.color = c; $$p("[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === c)); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); }
  function updUI() { $p("#ip-un").disabled = !st.hist.length; $p("#ip-re").disabled = !st.redo.length; const has = !!st.sel?.size; $p("#ip-cl").disabled = !st.strokes.length; $p("#ip-cl").title = has ? "Auswahl löschen" : "Zeichnung leeren"; $p("#ip-cl").classList.toggle("sel", has); }
  $$p("[data-t]").forEach(b => b.onclick = () => setTool(b.dataset.t));
  $$p("[data-c]").forEach(b => b.onclick = () => setColor(b.dataset.c));
  $p("#ip-cc").oninput = e => { setColor(e.target.value); $$p("[data-c]").forEach(b => b.classList.remove("on")); };
  $p("#ip-sz").oninput = e => st.size = +e.target.value;
  $p("#ip-un").onclick = undo; $p("#ip-re").onclick = redo;
  $p("#ip-cl").onclick = async () => { if (st.sel?.size) { snap(); st.strokes = st.strokes.filter(x => !st.sel.has(x)); st.sel = null; render(); changed(); return; } if (st.strokes.length && await confirmBox("Alle Zeichnungen in diesem Dokument löschen? Der Text bleibt erhalten.", "Löschen")) { snap(); st.strokes = []; render(); changed(); } };

  const key = e => {
    if (!st.on) return; const tag = e.target.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey && !e.altKey) { const k = { p: "pen", h: "hl", e: "eraser", a: "arrow", s: "lasso", x: "laser", v: "hand" }[e.key.toLowerCase()]; if (k) setTool(k); else if ((e.key === "Delete" || e.key === "Backspace") && st.sel?.size) { e.preventDefault(); $p("#ip-cl").click(); } }
  };
  document.addEventListener("keydown", key);
  const ro = new ResizeObserver(size); ro.observe(paper); if (paper.firstElementChild) ro.observe(paper.querySelector(".body") || paper.firstElementChild);

  setColor(st.color); setTool("pen"); updUI();
  return {
    st, canvas: cv,
    load(strokes) { st.strokes = Array.isArray(strokes) ? strokes : []; size(); render(); updUI(); },
    mode(on) { st.on = !!on; paper.classList.toggle("inking", !!on); setTool(st.tool); pal.classList.toggle("show", !!on); },
    /* white image of the sketch (+ text) for the AI */
    snapshot() { const t = document.createElement("canvas"), s = Math.min(1, 1400 / W); t.width = W * s; t.height = H * s; const c = t.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, t.width, t.height); c.drawImage(cv, 0, 0, t.width, t.height); return t.toDataURL("image/jpeg", .85).split(",")[1]; },
    destroy() { document.removeEventListener("keydown", key); ro.disconnect(); pal.remove(); },
  };
}
