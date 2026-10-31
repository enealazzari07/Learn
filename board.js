"use strict";
/* Studix whiteboard – vector drawing with pen, highlighter, eraser, shapes, text, images, undo/redo */

V.board = m => {
  const draws = D.docs.filter(d => d.type === "draw").sort((a, b) => b.updated - a.updated);
  m.innerHTML = `<div class="page">${pageHead("<b>Zeichnen</b>", dkAct("plus", "Neue Zeichnung", 'id="nw"'))}
  ${draws.length ? `<div class="docgrid">${draws.map(docCard).join("")}</div>` : `<div class="emptybox"><div class="big-ic">${ic("brush")}</div><h3>Dein digitales Whiteboard</h3><p>Zeichne mit Finger, Maus oder Apple Pencil: Stift, Marker, Radierer, Formen, Text und Bilder. Perfekt für Mathe-Skizzen, Mindmaps und Tafelbilder.</p><button class="btn accent big" id="nw2">Los zeichnen</button></div>`}</div>`;
  $("#nw", m).onclick = () => docDialog("draw"); $("#nw2", m) && ($("#nw2", m).onclick = () => docDialog("draw")); bindCommon(m);
};

V.draw = async (m, id) => {
  if (id === "new") { if (limitHit("board")) return go("board"); const nid = uid(); D.docs.unshift({ id: nid, type: "draw", title: "Neue Zeichnung", subjectId: subjectOfFolder(docFolder), folderId: docFolder, updated: Date.now(), created: Date.now(), thumb: "" }); await KV.set("draw:" + nid, { strokes: [], bg: "grid", H: 1000 }); save(); return go("draw/" + nid); }
  const d = D.docs.find(x => x.id === id); if (!d || d.type !== "draw") return go("board");
  const saved = (await KV.get("draw:" + id)) || { strokes: [], bg: "grid", H: 1000 };
  const W = saved.W || 1600, FMT = "endless"; const st = { cam: saved.cam || { x: -40, y: -40, z: 1 }, strokes: saved.strokes || [], objs: saved.objs || [], hist: [], redo: [], tool: "pen", color: saved.bg === "dark" ? "#ffffff" : "#111111", size: 4, bg: saved.bg || "grid", H: saved.H || 1000, cur: null, penSeen: false, pending: null };
  const COL = ["#111111", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#ffffff"];
  const TOOLS = [["hand", "Verschieben", "up"], ["pen", "Stift", "pen"], ["hl", "Marker", "hl"], ["eraser", "Radierer", "eraser"], ["line", "Linie", "line"], ["arrow", "Pfeil", "arrow"], ["rect", "Rechteck", "square"], ["ellipse", "Ellipse", "circle"], ["text", "Text", "text"], ["img", "Bild", "image"]];
  m.classList.add("doc-full");
  const fp = folderPath(d.folderId);
  m.innerHTML = `<div class="editor board dfull"><div class="dhead"><div class="ned-bar"><div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><div class="nb-name"><input class="nb-in" id="et" value="${esc(d.title)}" aria-label="Titel"><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
  <div class="ned-tools btools">${TOOLS.map(([k, t, i]) => `<button class="tbtn ${k === st.tool ? "on" : ""}" data-t="${k}" title="${t}">${ic(i)}</button>`).join("")}<i class="sep"></i><button class="tbtn wide" id="addo" title="Element hinzufügen">${ic("plus")}<span>Element</span></button><i class="sep"></i><button class="tbtn" id="un" title="Rückgängig (Strg+Z)">${ic("undo")}</button><button class="tbtn" id="re" title="Wiederholen">${ic("redo")}</button><button class="tbtn" id="cl" title="Alles löschen">${ic("trash")}</button></div>
  <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><button class="btn ghost small" id="exp">${ic("download")}<span class="hide-sm">PNG</span></button><button class="btn accent small" id="done">Fertig</button><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button><button class="icon-btn aitog" id="ai-m" aria-label="AI ein- und ausklappen" title="AI ein- und ausklappen">${ic("aipanel")}<span class="hide-sm">AI</span></button></div></div>
  <div class="opts flat"><div class="cols">${COL.map(c => `<button class="cdot ${c === st.color ? "on" : ""}" data-c="${c}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join("")}<label class="cdot pick" title="Eigene Farbe"><input type="color" id="cc" value="#111111"></label></div><label class="sz">${ic("pen")}<input type="range" id="sz" min="1" max="24" value="4"></label><select id="bg" class="field slim"><option value="blank">Weiß</option><option value="lines">Liniert</option><option value="grid">Kariert</option><option value="dots">Punkte</option><option value="dark">Tafel</option></select></div></div>
  <div class="dpanel"><div class="cvwrap inf" id="cvw"><canvas id="cv"></canvas><div class="bzoom"><button id="zo" aria-label="Verkleinern">−</button><button id="zp" title="Auf 100 % / Inhalt zeigen">100 %</button><button id="zi" aria-label="Vergrößern">+</button></div><input class="texti" id="ti" hidden><input type="file" id="fi" accept="image/*" hidden></div></div></div>`;
  $$("[data-p]", m).forEach(x => x.onclick = () => go("docs/" + x.dataset.p));
  const cv = $("#cv", m), mctx = cv.getContext("2d"); let ctx = mctx; const cvw = $("#cvw", m), cam = st.cam; let dpr = 1, VW = 800, VH = 600; const imgs = new WeakMap(), titleEl = $("#et", m), savedEl = $("#sv", m);
  $("#bg", m).value = st.bg;
  const hexA = (c, a) => c; let OBJ = null;

  /* drawing primitives */
  function bgDraw(vx, vy, vw, vh) {
    const dk = st.bg === "dark"; ctx.fillStyle = dk ? "#1d2523" : "#fff"; ctx.fillRect(vx, vy, vw, vh); ctx.strokeStyle = dk ? "#2c3835" : "#e3e6ee"; ctx.fillStyle = dk ? "#3a4743" : "#cfd4df"; ctx.lineWidth = 1 / cam.z;
    const g = cam.z < .3 ? 200 : cam.z < .6 ? 80 : 40, x0 = Math.floor(vx / g) * g, y0 = Math.floor(vy / g) * g, x1 = vx + vw, y1 = vy + vh;
    if (st.bg === "grid") { ctx.beginPath(); for (let x = x0; x <= x1; x += g) { ctx.moveTo(x, vy); ctx.lineTo(x, y1); } for (let y = y0; y <= y1; y += g) { ctx.moveTo(vx, y); ctx.lineTo(x1, y); } ctx.stroke(); }
    else if (st.bg === "lines") { const l = g * 1.2, yy = Math.floor(vy / l) * l; ctx.beginPath(); for (let y = yy; y <= y1; y += l) { ctx.moveTo(vx, y); ctx.lineTo(x1, y); } ctx.stroke(); }
    else if (st.bg === "dots") { const r = 1.2 / Math.min(1, cam.z) ; for (let x = x0; x <= x1; x += g) for (let y = y0; y <= y1; y += g) ctx.fillRect(x - r, y - r, r * 2, r * 2); }
  }
  function strokeDraw(s) {
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.size;
    const p = s.pts;
    if (s.type === "pen" || s.type === "hl") {
      if (s.type === "hl") { ctx.globalAlpha = .32; ctx.lineWidth = s.size * 4; ctx.lineCap = "butt"; }
      if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], s.type === "hl" ? s.size * 2 : s.size / 2, 0, 7); ctx.fill(); }
      else if (s.pr && s.type === "pen") { for (let i = 1; i < p.length; i++) { ctx.lineWidth = s.size * (.35 + (p[i][2] || .5) * 1.3); ctx.beginPath(); ctx.moveTo(p[i - 1][0], p[i - 1][1]); ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length - 1; i++) { const mx = (p[i][0] + p[i + 1][0]) / 2, my = (p[i][1] + p[i + 1][1]) / 2; ctx.quadraticCurveTo(p[i][0], p[i][1], mx, my); } const l = p[p.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke(); }
    } else if (s.type === "line" || s.type === "arrow") {
      const [a, b] = [p[0], p[1] || p[0]]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      if (s.type === "arrow") { const an = Math.atan2(b[1] - a[1], b[0] - a[0]), h = 12 + s.size * 2; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - h * Math.cos(an - .45), b[1] - h * Math.sin(an - .45)); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - h * Math.cos(an + .45), b[1] - h * Math.sin(an + .45)); ctx.stroke(); }
    } else if (s.type === "rect") { const [a, b] = [p[0], p[1] || p[0]]; ctx.strokeRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
    else if (s.type === "ellipse") { const [a, b] = [p[0], p[1] || p[0]]; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2 || 1, Math.abs(b[1] - a[1]) / 2 || 1, 0, 0, 7); ctx.stroke(); }
    else if (s.type === "text") { ctx.font = `600 ${s.size * 4 + 12}px Inter, system-ui, sans-serif`; ctx.textBaseline = "top"; s.text.split("\n").forEach((l, i) => ctx.fillText(l, p[0][0], p[0][1] + i * (s.size * 4 + 12) * 1.25)); }
    else if (s.type === "img") { let im = imgs.get(s); if (!im) { im = new Image(); im.onload = render; im.src = s.src; imgs.set(s, im); } if (im.complete && im.naturalWidth) ctx.drawImage(im, p[0][0], p[0][1], s.w, s.h); }
    ctx.restore();
  }
  function paint(c2, vx, vy, vw, vh, z, scale) { const keep = ctx, kz = cam.z; ctx = c2; cam.z = z; c2.save(); c2.setTransform(scale * z, 0, 0, scale * z, -vx * z * scale, -vy * z * scale); bgDraw(vx, vy, vw, vh); st.strokes.forEach(strokeDraw); OBJ && OBJ.paint(c2); if (c2 === mctx && st.cur) strokeDraw(st.cur); c2.restore(); ctx = keep; cam.z = kz; }
  function render() { paint(mctx, cam.x, cam.y, VW / cam.z, VH / cam.z, cam.z, dpr); OBJ && OBJ.sync(); }
  function fit() { const r = cvw.getBoundingClientRect(); VW = Math.max(200, r.width); VH = Math.max(200, r.height); dpr = Math.min(2, window.devicePixelRatio || 1); const w = Math.round(VW * dpr), h = Math.round(VH * dpr); if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } cv.style.width = VW + "px"; cv.style.height = VH + "px"; render(); }
  function boundsOf() { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; st.strokes.forEach(s => { const pad = s.type === "hl" ? s.size * 2 : s.size; s.pts.forEach(p => { x0 = Math.min(x0, p[0] - pad); y0 = Math.min(y0, p[1] - pad); x1 = Math.max(x1, p[0] + pad); y1 = Math.max(y1, p[1] + pad); }); if (s.type === "img") { x1 = Math.max(x1, s.pts[0][0] + s.w); y1 = Math.max(y1, s.pts[0][1] + s.h); } if (s.type === "text") { const fs = s.size * 4 + 12; x1 = Math.max(x1, s.pts[0][0] + Math.max(...s.text.split("\n").map(l => l.length)) * fs * .6); y1 = Math.max(y1, s.pts[0][1] + s.text.split("\n").length * fs * 1.25); } }); const ob = OBJ && OBJ.bounds(); if (ob) { x0 = Math.min(x0, ob.x0); y0 = Math.min(y0, ob.y0); x1 = Math.max(x1, ob.x1); y1 = Math.max(y1, ob.y1); } return x0 > x1 ? null : { x0, y0, x1, y1 }; }
  function snapshot(maxPx) { const b = boundsOf() || { x0: 0, y0: 0, x1: 800, y1: 500 }, pad = 40, w = b.x1 - b.x0 + pad * 2, h = b.y1 - b.y0 + pad * 2, k = Math.min(2, maxPx / Math.max(w, h)), t = document.createElement("canvas"); t.width = Math.max(1, Math.round(w * k)); t.height = Math.max(1, Math.round(h * k)); paint(t.getContext("2d"), b.x0 - pad, b.y0 - pad, w, h, 1, k); return t; }
  function showAll() { const b = boundsOf(); if (!b) { cam.x = -40; cam.y = -40; cam.z = 1; } else { const w = b.x1 - b.x0 + 120, h = b.y1 - b.y0 + 120; cam.z = Math.max(.1, Math.min(1.5, Math.min(VW / w, VH / h))); cam.x = b.x0 - 60 - (VW / cam.z - w) / 2; cam.y = b.y0 - 60 - (VH / cam.z - h) / 2; } render(); updZoom(); touch(); }
  function zoomAt(cx, cy, nz) { nz = Math.max(.1, Math.min(4, nz)); const wx = cam.x + cx / cam.z, wy = cam.y + cy / cam.z; cam.z = nz; cam.x = wx - cx / nz; cam.y = wy - cy / nz; render(); updZoom(); }
  const updZoom = () => { const z = $("#zp", m); if (z) z.textContent = Math.round(cam.z * 100) + " %"; };
  const dist2 = (px, py, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((px - a[0]) * dx + (py - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = a[0] + t * dx, y = a[1] + t * dy; return Math.hypot(px - x, py - y); };
  function hit(s, x, y, r) {
    const p = s.pts, rr = r + (s.type === "hl" ? s.size * 2 : s.size / 2);
    if (s.type === "pen" || s.type === "hl") return p.length === 1 ? Math.hypot(x - p[0][0], y - p[0][1]) < rr : p.some((q, i) => i && dist2(x, y, p[i - 1], q) < rr);
    if (s.type === "line" || s.type === "arrow") return dist2(x, y, p[0], p[1]) < rr;
    if (s.type === "rect") { const [a, b] = p, c = [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]]; return c.some((q, i) => dist2(x, y, q, c[(i + 1) % 4]) < rr); }
    if (s.type === "ellipse") { const cx = (p[0][0] + p[1][0]) / 2, cy = (p[0][1] + p[1][1]) / 2, rx = Math.abs(p[1][0] - p[0][0]) / 2 || 1, ry = Math.abs(p[1][1] - p[0][1]) / 2 || 1; return Math.abs(Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry) < rr; }
    if (s.type === "text") { const w = Math.max(...s.text.split("\n").map(l => l.length)) * (s.size * 4 + 12) * .6, h = s.text.split("\n").length * (s.size * 4 + 12) * 1.25; return x > p[0][0] - r && x < p[0][0] + w + r && y > p[0][1] - r && y < p[0][1] + h + r; }
    if (s.type === "img") return x > p[0][0] && x < p[0][0] + s.w && y > p[0][1] && y < p[0][1] + s.h;
    return false;
  }

  /* persistence */
  const persist = debounce(async () => {
    if (!D.docs.includes(d)) return;
    d.thumb = snapshot(480).toDataURL("image/jpeg", .6); d.title = titleEl.value.trim() || "Zeichnung"; d.updated = Date.now();
    await KV.set("draw:" + id, { strokes: st.strokes, objs: st.objs, bg: st.bg, H: st.H, W, fmt: "endless", cam: { ...cam } }); save(); savedEl.textContent = "Gespeichert";
  }, 700);
  const touch = () => { savedEl.textContent = "Speichert…"; persist(); };
  const snap = () => { st.hist.push({ s: [...st.strokes], o: JSON.stringify(st.objs) }); if (st.hist.length > 80) st.hist.shift(); st.redo = []; };
  const restore = h => { st.strokes = h.s; st.objs = JSON.parse(h.o); OBJ && (OBJ.rebuild(), render()); };
  const undo = () => { if (!st.hist.length) return; st.redo.push({ s: [...st.strokes], o: JSON.stringify(st.objs) }); restore(st.hist.pop()); render(); touch(); };
  const redo = () => { if (!st.redo.length) return; st.hist.push({ s: [...st.strokes], o: JSON.stringify(st.objs) }); restore(st.redo.pop()); render(); touch(); };

  /* pointer handling */
  const pos = e => { const r = cv.getBoundingClientRect(); return [cam.x + (e.clientX - r.left) / cam.z, cam.y + (e.clientY - r.top) / cam.z]; };
  const ptrs = new Map(); let panning = null, gest = null, space = false;
  let drawing = false, erased = false;
  const setTool = t => { st.tool = t; $$("[data-t]", m).forEach(b => b.classList.toggle("on", b.dataset.t === t)); cv.style.touchAction = "none"; cv.style.cursor = t === "hand" ? "grab" : t === "text" ? "text" : "crosshair"; if (t === "img") $("#fi", m).click(); };
  const beginGesture = () => { const [a, b] = [...ptrs.values()]; const r = cv.getBoundingClientRect(); gest = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: cam.z, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, wx: 0, wy: 0 }; gest.wx = cam.x + gest.cx / cam.z; gest.wy = cam.y + gest.cy / cam.z; };
  cv.addEventListener("pointerdown", e => {
    if (e.pointerType === "pen") st.penSeen = true; if (e.pointerType === "touch" && st.penSeen) return;
    if (e.pointerType === "touch") { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) { drawing = false; st.cur = null; panning = null; beginGesture(); cv.setPointerCapture(e.pointerId); render(); return; } }
    if (e.button === 1 || st.tool === "hand" || space) { e.preventDefault(); panning = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; return; }
    if (e.button > 0) return; e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = pos(e);
    if (st.tool === "text") return textAt(p, e);
    if (st.tool === "place" && st.pending) { snap(); const pi = st.pending; st.strokes.push({ type: "img", src: pi.src, w: pi.w, h: pi.h, pts: [[p[0] - pi.w / 2, p[1] - pi.h / 2]], color: "#000", size: 1 }); st.pending = null; setTool("pen"); render(); touch(); return; }
    drawing = true;
    if (st.tool === "eraser") { snap(); erased = false; eraseAt(p); return; }
    st.cur = { type: st.tool, color: st.tool === "hl" && st.color === "#ffffff" ? "#ffe600" : st.color, size: st.size, pts: [[p[0], p[1], e.pressure || .5]], pr: e.pointerType === "pen" };
    if (["line", "arrow", "rect", "ellipse"].includes(st.tool)) st.cur.pts.push([p[0], p[1]]);
    render();
  });
  function eraseAt(p) { const n = st.strokes.length; st.strokes = st.strokes.filter(s => !hit(s, p[0], p[1], 14 / cam.z)); if (st.strokes.length !== n) { erased = true; render(); } }
  cv.addEventListener("pointermove", e => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (gest && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], r = cv.getBoundingClientRect(), nz = Math.max(.1, Math.min(4, gest.z * (Math.hypot(a.x - b.x, a.y - b.y) / gest.d))), cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top; cam.z = nz; cam.x = gest.wx - cx / nz; cam.y = gest.wy - cy / nz; render(); updZoom(); return; }
    if (panning) { cam.x = panning.cx - (e.clientX - panning.x) / cam.z; cam.y = panning.cy - (e.clientY - panning.y) / cam.z; render(); return; }
    if (!drawing) return; if (e.pointerType === "touch" && st.penSeen) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) { const p = pos(ev); if (st.tool === "eraser") eraseAt(p); else if (st.cur) { if (["line", "arrow", "rect", "ellipse"].includes(st.cur.type)) { let q = p; if (ev.shiftKey && st.cur.type !== "arrow") { const a = st.cur.pts[0], dx = p[0] - a[0], dy = p[1] - a[1]; q = Math.abs(dx) > Math.abs(dy) * 2 ? [p[0], a[1]] : Math.abs(dy) > Math.abs(dx) * 2 ? [a[0], p[1]] : st.cur.type === "line" ? p : [p[0], a[1] + Math.sign(dy || 1) * Math.abs(dx)]; } st.cur.pts[1] = q; } else st.cur.pts.push([p[0], p[1], ev.pressure || .5]); } }
    if (st.cur) { render(); if (st.cur.type === "pen" || st.cur.type === "hl") { /* full redraw is cheap enough for typical sketches */ } }
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) gest = null;
    if (panning) { panning = null; setTool(st.tool); touch(); return; }
    if (!drawing) return; drawing = false;
    if (st.tool === "eraser") { if (!erased) st.hist.pop(); else touch(); return; }
    if (st.cur) { const s = st.cur; st.cur = null; if (["line", "arrow", "rect", "ellipse"].includes(s.type) && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 3) { render(); return; } snap(); st.strokes.push(s); render(); touch(); }
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  function textAt(p, e) {
    const ti = $("#ti", m), r = cv.getBoundingClientRect(), w = $("#cvw", m).getBoundingClientRect();
    ti.hidden = false; ti.value = ""; ti.style.left = (e.clientX - w.left + $("#cvw", m).scrollLeft) + "px"; ti.style.top = (e.clientY - w.top + $("#cvw", m).scrollTop - 14) + "px"; ti.style.color = st.color === "#ffffff" ? "#111" : st.color; ti.style.fontSize = (st.size * 4 + 12) * cam.z + "px"; setTimeout(() => ti.focus(), 10);
    const done = () => { const v = ti.value.trim(); ti.hidden = true; ti.onblur = ti.onkeydown = null; if (v) { snap(); st.strokes.push({ type: "text", text: v, color: st.color === "#ffffff" ? "#111111" : st.color, size: st.size, pts: [p] }); render(); touch(); } };
    ti.onblur = done; ti.onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); ti.blur(); } if (ev.key === "Escape") { ti.value = ""; ti.blur(); } };
  }

  /* UI */
  $$("[data-t]", m).forEach(b => b.onclick = () => setTool(b.dataset.t));
  $$("[data-c]", m).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$("[data-c]", m).forEach(x => x.classList.toggle("on", x === b)); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); });
  $("#cc", m).oninput = e => { st.color = e.target.value; $$("[data-c]", m).forEach(x => x.classList.remove("on")); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); };
  $("#sz", m).oninput = e => st.size = +e.target.value;
  $("#bg", m).onchange = e => { st.bg = e.target.value; render(); touch(); };
  cvw.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(); if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - r.left, e.clientY - r.top, cam.z * Math.exp(-e.deltaY * .01)); else { cam.x += e.deltaX / cam.z; cam.y += e.deltaY / cam.z; render(); } touch(); }, { passive: false });
  $("#zi", m).onclick = () => { zoomAt(VW / 2, VH / 2, cam.z * 1.25); touch(); }; $("#zo", m).onclick = () => { zoomAt(VW / 2, VH / 2, cam.z / 1.25); touch(); };
  $("#zp", m).onclick = () => { if (Math.abs(cam.z - 1) > .01) { zoomAt(VW / 2, VH / 2, 1); touch(); } else showAll(); };
  const ro = new ResizeObserver(fit); ro.observe(cvw);
  const sk = e => { if (e.code === "Space" && !e.target.isContentEditable && !["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) { space = e.type === "keydown"; if (space) e.preventDefault(); cv.style.cursor = space ? "grab" : cv.style.cursor; } };
  LEAVE.push(penGuard(cv)); m.classList.add("noselect");
  document.addEventListener("keydown", sk); document.addEventListener("keyup", sk); LEAVE.push(() => { ro.disconnect(); document.removeEventListener("keydown", sk); document.removeEventListener("keyup", sk); });
  $("#un", m).onclick = undo; $("#re", m).onclick = redo;
  $("#cl", m).onclick = async () => { if ((st.strokes.length || st.objs.length) && await confirmBox("Zeichenfläche komplett leeren?", "Leeren")) { snap(); st.strokes = []; st.objs = []; OBJ.rebuild(); render(); touch(); } };
  $("#fi", m).onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) { setTool("pen"); return; } const bmp = await createImageBitmap(f), s = Math.min(1, 700 / bmp.width), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); st.pending = { src: c.toDataURL("image/jpeg", .85), w: c.width, h: c.height }; st.tool = "place"; $$("[data-t]", m).forEach(b => b.classList.remove("on")); cv.style.touchAction = "pinch-zoom"; toast("Tippe dorthin, wo das Bild hin soll"); };
  $("#eb", m).onclick = () => go(d.folderId ? "docs/" + d.folderId : "board"); $("#et", m).oninput = touch;
  $("#done", m).onclick = () => go(d.folderId ? "docs/" + d.folderId : "board");
  $("#mo-m", m).onclick = e => menu(e.currentTarget, [{ label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); toast(d.pinned ? "Angeheftet" : "Gelöst"); } }, "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); go(d.folderId ? "docs/" + d.folderId : "board"); } }]);
  $("#exp", m).onclick = () => { snapshot(4000).toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (d.title || "zeichnung") + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }); };
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Skizze erklären lassen", icon: "help", fn: async () => explainCanvas("Erkläre, was auf dieser Skizze/Tafel zu sehen ist. Wenn es Mathematik oder Naturwissenschaft ist, erkläre die Idee und Rechenschritte und weise auf mögliche Fehler hin.") }, { label: "Handschrift in Text umwandeln", icon: "text", fn: async () => explainCanvas("Lies die Handschrift/Beschriftungen auf dem Bild und gib sie als sauberen Text wieder (Formeln in Textform).") }, { label: "Als Notiz speichern (Bild)", icon: "note", fn: () => newNote(d.subjectId, `<p><img src="${snapshot(1600).toDataURL("image/jpeg", .8)}"></p><p><br></p>`, d.title) }]);
  async function explainCanvas(q) { if (!hasKey()) return toast("Bild-Analyse braucht die eingerichtete Studix AI (Einstellungen → Studix AI)."); if (!st.strokes.length && !st.objs.length) return toast("Zeichne zuerst etwas."); toast("Studix AI schaut hin…"); const t = snapshot(1400); const r = await ai(q, { image: { data: t.toDataURL("image/jpeg", .85).split(",")[1], type: "image/jpeg" } }); if (r) { const { el } = modal(`<h3>Studix AI</h3><textarea class="field" rows="12">${esc(r)}</textarea><div class="row end"><button class="btn" id="sn">Als Notiz speichern</button></div>`, "wide"); $("#sn", el).onclick = () => { el.closest(".mask").remove(); newNote(d.subjectId, textToHtml(r), d.title + " – Studix AI"); }; } }
  const key = e => {
    if (!$("#cv")) return; const tag = e.target.tagName; if (e.target.isContentEditable || tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey) { const k = { p: "pen", h: "hl", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse", t: "text" }[e.key.toLowerCase()]; if (k) setTool(k); }
  };
  document.addEventListener("keydown", key); LEAVE.push(() => { document.removeEventListener("keydown", key); persist(); });
  OBJ = boardObjects({ host: cvw, cam, st, snap, touch }); LEAVE.push(() => OBJ.destroy());
  $("#addo", m).onclick = e => menu(e.currentTarget, [
    { label: "Notizzettel mit Pin", icon: "note", fn: () => OBJ.add("note") }, { label: "Haftnotiz", icon: "note", fn: () => OBJ.add("sticky") }, { label: "Pin", icon: "star", fn: () => OBJ.add("pin") }, "-",
    { label: "Karte", icon: "newnote", fn: () => OBJ.add("card") }, { label: "Rechteck", icon: "square", fn: () => OBJ.add("shape", { kind: "rect" }) }, { label: "Abgerundet", icon: "square", fn: () => OBJ.add("shape", { kind: "round" }) }, { label: "Ellipse", icon: "circle", fn: () => OBJ.add("shape", { kind: "ellipse" }) }, { label: "Raute", icon: "square", fn: () => OBJ.add("shape", { kind: "diamond" }) }, "-",
    { label: "Rahmen", icon: "folder", fn: () => OBJ.add("frame") }]);
  setTool("pen"); fit(); updZoom();
};

/* ---------- Whiteboard erstellen: Format, Hintergrund, Vorlage ---------- */
const BFORMATS = [["endless", "Endlos", "Wächst nach unten", 1600, 1000], ["a4p", "A4 hoch", "Wie ein Blatt Papier", 1240, 1754], ["a4l", "A4 quer", "Querformat", 1754, 1240], ["wide", "16:9", "Präsentation", 1600, 900], ["sq", "Quadrat", "Skizze, Mindmap", 1200, 1200]];
const BBGS = [["blank", "Weiß"], ["grid", "Kariert"], ["lines", "Liniert"], ["dots", "Punkte"], ["dark", "Tafel"]];
const BTPLS = [["blank", "Leer", "Freie Fläche"], ["axes", "Achsenkreuz", "x- und y-Achse"], ["mind", "Mindmap", "Thema in der Mitte"], ["proco", "Pro & Contra", "Zwei Spalten"], ["time", "Zeitstrahl", "Linie mit Punkten"]];
function boardStrokes(k, W, H, dark) {
  const col = dark ? "#ffffff" : "#111111", acc = dark ? "#8fb8ff" : "#2563eb", S = [];
  const line = (a, b, c = col, size = 4, type = "line") => S.push({ type, color: c, size, pts: [a, b] });
  const text = (t, x, y, size = 4, c = col) => S.push({ type: "text", color: c, size, text: t, pts: [[x, y]] });
  const ell = (a, b, c = col, size = 4) => S.push({ type: "ellipse", color: c, size, pts: [a, b] });
  const rect = (a, b, c = col, size = 4) => S.push({ type: "rect", color: c, size, pts: [a, b] });
  if (k === "axes") { const cx = Math.round(W / 2), cy = Math.round(H / 2); line([80, cy], [W - 80, cy], col, 4, "arrow"); line([cx, H - 80], [cx, 80], col, 4, "arrow"); text("x", W - 76, cy + 14, 3); text("y", cx + 14, 70, 3); }
  else if (k === "mind") { const cx = W / 2, cy = H / 2; ell([cx - 190, cy - 80], [cx + 190, cy + 80], acc, 5); text("Thema", cx - 62, cy - 22, 5, acc); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => { const ex = cx + sx * 520, ey = cy + sy * 280; line([cx + sx * 150, cy + sy * 62], [ex - sx * 150, ey - sy * 20], col, 3); rect([ex - 150, ey - 40], [ex + 150, ey + 40], col, 3); text("Idee " + (i + 1), ex - 50, ey - 18, 3); }); }
  else if (k === "proco") { const m = W / 2; line([m, 120], [m, H - 80], col, 4); line([80, 150], [W - 80, 150], col, 4); text("Pro", m / 2 - 36, 70, 6, dark ? "#7be0a4" : "#16a34a"); text("Contra", m + m / 2 - 70, 70, 6, dark ? "#ff9a9a" : "#e5484d"); }
  else if (k === "time") { const y = Math.round(H / 2); line([80, y], [W - 80, y], col, 5, "arrow"); for (let i = 0; i < 5; i++) { const x = 220 + i * ((W - 440) / 4); ell([x - 14, y - 14], [x + 14, y + 14], acc, 5); text("Datum", x - 52, y + 36, 3); } }
  return S;
}
function boardDialog(pre = null) {
  let folder = pre && pre.folder !== undefined ? pre.folder : docFolder, fmt = "endless", bg = "grid", tpl = "blank";
  const { el, close } = modal(`<div class="nd bd"><div class="nd-sw seg" role="tablist" aria-label="Art"><button type="button" role="tab" id="bd-swd">Dokument</button><button type="button" class="on" role="tab">Whiteboard</button><button type="button" role="tab" id="bd-swg">Design</button></div><p class="eyebrow">Neues Whiteboard</p>
  <input class="nd-name" id="bd-n" placeholder="Wie soll das Whiteboard heißen?" autocomplete="off" maxlength="80">
  <p class="bd-inf">Unendliche Fläche – in alle Richtungen verschiebbar und zoombar.</p>
  <div class="bd-sec"><label class="lbl">Hintergrund</label><div class="bd-bg" id="bd-bg">${BBGS.map(([k, n]) => `<button type="button" class="bb ${k === bg ? "on" : ""}" data-k="${k}"><i class="pv ${k}"></i><b>${n}</b></button>`).join("")}</div></div>
  <div class="row end"><button class="btn ghost" data-c>Abbrechen</button><button class="btn accent big" id="bd-go">Whiteboard erstellen</button></div></div>`, "wide nd-modal");
  const nameIn = $("#bd-n", el); if (pre && pre.name) nameIn.value = pre.name; $("#bd-swg", el).onclick = () => { const n = nameIn.value, f = folder; close(); dsCreateDialog({ name: n, folder: f }); }; $("#bd-swd", el).onclick = () => { const n = nameIn.value, f = folder; close(); docDialog("note", { name: n, folder: f }); };
  setTimeout(() => nameIn.focus(), 40);
  const pick = (id, cls, set) => $$(`#${id} .${cls}`, el).forEach(b => b.onclick = () => { set(b.dataset.k); $$(`#${id} .${cls}`, el).forEach(x => x.classList.toggle("on", x === b)); });
  pick("bd-bg", "bb", k => bg = k); 
  $("[data-c]", el).onclick = close;
  const go2 = async () => {
    if (limitHit("board")) return;
    const f = BFORMATS[0], title = nameIn.value.trim() || (tpl !== "blank" ? BTPLS.find(x => x[0] === tpl)[1] : "Neues Whiteboard"); close();
    const id = uid(); D.docs.unshift({ id, type: "draw", title, subjectId: subjectOfFolder(folder), folderId: folder, updated: Date.now(), created: Date.now(), thumb: "" });
    await KV.set("draw:" + id, { strokes: boardStrokes(tpl, f[3], f[4], bg === "dark"), bg, H: f[4], W: f[3], fmt: "endless", cam: { x: -40, y: -40, z: 1 } }); save(); go("draw/" + id);
  };
  $("#bd-go", el).onclick = go2; nameIn.onkeydown = e => { if (e.key === "Enter") go2(); };
}
