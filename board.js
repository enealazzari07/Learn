"use strict";
/* Lumi whiteboard – vector drawing with pen, highlighter, eraser, shapes, text, images, undo/redo */

V.board = m => {
  const draws = D.docs.filter(d => d.type === "draw").sort((a, b) => b.updated - a.updated);
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Skizzen, Formeln, Mindmaps</p><h1>Zeichnen</h1></div><button class="btn accent" id="nw">${ic("plus")}Neue Zeichnung</button></div>
  ${draws.length ? `<div class="docgrid">${draws.map(docCard).join("")}</div>` : `<div class="emptybox"><div class="big-ic">${ic("brush")}</div><h3>Dein digitales Whiteboard</h3><p>Zeichne mit Finger, Maus oder Apple Pencil: Stift, Marker, Radierer, Formen, Text und Bilder. Perfekt für Mathe-Skizzen, Mindmaps und Tafelbilder.</p><button class="btn accent big" id="nw2">Los zeichnen</button></div>`}</div>`;
  $("#nw", m).onclick = () => docDialog("draw"); $("#nw2", m) && ($("#nw2", m).onclick = () => docDialog("draw")); bindCommon(m);
};

V.draw = async (m, id) => {
  if (id === "new") { const nid = uid(); D.docs.unshift({ id: nid, type: "draw", title: "Neue Zeichnung", subjectId: subjectOfFolder(docFolder), folderId: docFolder, updated: Date.now(), created: Date.now(), thumb: "" }); await KV.set("draw:" + nid, { strokes: [], bg: "grid", H: 1000 }); save(); return go("draw/" + nid); }
  const d = D.docs.find(x => x.id === id); if (!d || d.type !== "draw") return go("board");
  const saved = (await KV.get("draw:" + id)) || { strokes: [], bg: "grid", H: 1000 };
  const W = 1600; const st = { strokes: saved.strokes || [], hist: [], redo: [], tool: "pen", color: "#111111", size: 4, bg: saved.bg || "grid", H: saved.H || 1000, cur: null, penSeen: false, pending: null };
  const COL = ["#111111", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899", "#ffffff"];
  const TOOLS = [["hand", "Verschieben", "up"], ["pen", "Stift", "pen"], ["hl", "Marker", "hl"], ["eraser", "Radierer", "eraser"], ["line", "Linie", "line"], ["arrow", "Pfeil", "arrow"], ["rect", "Rechteck", "square"], ["ellipse", "Ellipse", "circle"], ["text", "Text", "text"], ["img", "Bild", "image"]];
  m.classList.add("doc-full");
  const fp = folderPath(d.folderId);
  m.innerHTML = `<div class="editor board dfull"><div class="dhead"><div class="ned-bar"><div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><div class="nb-name"><input class="nb-in" id="et" value="${esc(d.title)}" aria-label="Titel"><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
  <div class="ned-tools btools">${TOOLS.map(([k, t, i]) => `<button class="tbtn ${k === st.tool ? "on" : ""}" data-t="${k}" title="${t}">${ic(i)}</button>`).join("")}<i class="sep"></i><button class="tbtn" id="un" title="Rückgängig (Strg+Z)">${ic("undo")}</button><button class="tbtn" id="re" title="Wiederholen">${ic("redo")}</button><button class="tbtn" id="cl" title="Alles löschen">${ic("trash")}</button></div>
  <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><button class="btn ghost small" id="ai-m">${ic("spark")}<span class="hide-sm">AI</span></button><button class="btn ghost small" id="exp">${ic("download")}<span class="hide-sm">PNG</span></button><button class="btn accent small" id="done">Fertig</button><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button></div></div>
  <div class="opts flat"><div class="cols">${COL.map(c => `<button class="cdot ${c === st.color ? "on" : ""}" data-c="${c}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join("")}<label class="cdot pick" title="Eigene Farbe"><input type="color" id="cc" value="#111111"></label></div><label class="sz">${ic("pen")}<input type="range" id="sz" min="1" max="24" value="4"></label><select id="bg" class="field slim"><option value="blank">Weiß</option><option value="lines">Liniert</option><option value="grid">Kariert</option><option value="dots">Punkte</option></select><button class="btn ghost small" id="more">${ic("plus")}Platz</button></div></div>
  <div class="dpanel"><div class="cvwrap" id="cvw"><canvas id="cv" width="${W}" height="${st.H}"></canvas><input class="texti" id="ti" hidden><input type="file" id="fi" accept="image/*" hidden></div></div></div>`;
  $$("[data-p]", m).forEach(x => x.onclick = () => go("docs/" + x.dataset.p));
  const cv = $("#cv", m), ctx = cv.getContext("2d"), imgs = new WeakMap(), titleEl = $("#et", m), savedEl = $("#sv", m);
  $("#bg", m).value = st.bg;
  const hexA = (c, a) => c;

  /* drawing primitives */
  function bgDraw() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, st.H); ctx.strokeStyle = "#e3e6ee"; ctx.fillStyle = "#cfd4df"; ctx.lineWidth = 1;
    if (st.bg === "grid") { ctx.beginPath(); for (let x = 40; x < W; x += 40) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, st.H); } for (let y = 40; y < st.H; y += 40) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); } ctx.stroke(); }
    else if (st.bg === "lines") { ctx.beginPath(); for (let y = 56; y < st.H; y += 48) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); } ctx.stroke(); }
    else if (st.bg === "dots") { for (let x = 40; x < W; x += 40) for (let y = 40; y < st.H; y += 40) ctx.fillRect(x - 1, y - 1, 2.4, 2.4); }
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
  function render() { bgDraw(); st.strokes.forEach(strokeDraw); if (st.cur) strokeDraw(st.cur); }
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
    const t = document.createElement("canvas"); t.width = 480; t.height = Math.round(480 * st.H / W); t.getContext("2d").drawImage(cv, 0, 0, t.width, t.height);
    d.thumb = t.toDataURL("image/jpeg", .6); d.title = titleEl.value.trim() || "Zeichnung"; d.updated = Date.now();
    await KV.set("draw:" + id, { strokes: st.strokes, bg: st.bg, H: st.H }); save(); savedEl.textContent = "Gespeichert";
  }, 700);
  const touch = () => { savedEl.textContent = "Speichert…"; persist(); };
  const snap = () => { st.hist.push([...st.strokes]); if (st.hist.length > 80) st.hist.shift(); st.redo = []; };
  const undo = () => { if (!st.hist.length) return; st.redo.push([...st.strokes]); st.strokes = st.hist.pop(); render(); touch(); };
  const redo = () => { if (!st.redo.length) return; st.hist.push([...st.strokes]); st.strokes = st.redo.pop(); render(); touch(); };

  /* pointer handling */
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  let drawing = false, erased = false;
  const setTool = t => { st.tool = t; $$("[data-t]", m).forEach(b => b.classList.toggle("on", b.dataset.t === t)); cv.style.touchAction = t === "hand" ? "pan-x pan-y pinch-zoom" : "pinch-zoom"; cv.style.cursor = t === "hand" ? "grab" : t === "text" ? "text" : "crosshair"; if (t === "img") $("#fi", m).click(); };
  cv.addEventListener("pointerdown", e => {
    if (st.tool === "hand") return;
    if (e.pointerType === "pen") st.penSeen = true; if (e.pointerType === "touch" && st.penSeen) return;
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
  function eraseAt(p) { const n = st.strokes.length; st.strokes = st.strokes.filter(s => !hit(s, p[0], p[1], 14)); if (st.strokes.length !== n) { erased = true; render(); } }
  cv.addEventListener("pointermove", e => {
    if (!drawing) return; if (e.pointerType === "touch" && st.penSeen) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) { const p = pos(ev); if (st.tool === "eraser") eraseAt(p); else if (st.cur) { if (["line", "arrow", "rect", "ellipse"].includes(st.cur.type)) { let q = p; if (ev.shiftKey && st.cur.type !== "arrow") { const a = st.cur.pts[0], dx = p[0] - a[0], dy = p[1] - a[1]; q = Math.abs(dx) > Math.abs(dy) * 2 ? [p[0], a[1]] : Math.abs(dy) > Math.abs(dx) * 2 ? [a[0], p[1]] : st.cur.type === "line" ? p : [p[0], a[1] + Math.sign(dy || 1) * Math.abs(dx)]; } st.cur.pts[1] = q; } else st.cur.pts.push([p[0], p[1], ev.pressure || .5]); } }
    if (st.cur) { render(); if (st.cur.type === "pen" || st.cur.type === "hl") { /* full redraw is cheap enough for typical sketches */ } }
  });
  const up = e => {
    if (!drawing) return; drawing = false;
    if (st.tool === "eraser") { if (!erased) st.hist.pop(); else touch(); return; }
    if (st.cur) { const s = st.cur; st.cur = null; if (["line", "arrow", "rect", "ellipse"].includes(s.type) && Math.hypot(s.pts[1][0] - s.pts[0][0], s.pts[1][1] - s.pts[0][1]) < 3) { render(); return; } snap(); st.strokes.push(s); render(); touch(); }
  };
  cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  function textAt(p, e) {
    const ti = $("#ti", m), r = cv.getBoundingClientRect(), w = $("#cvw", m).getBoundingClientRect();
    ti.hidden = false; ti.value = ""; ti.style.left = (e.clientX - w.left + $("#cvw", m).scrollLeft) + "px"; ti.style.top = (e.clientY - w.top + $("#cvw", m).scrollTop - 14) + "px"; ti.style.color = st.color === "#ffffff" ? "#111" : st.color; ti.style.fontSize = (st.size * 4 + 12) * r.width / W + "px"; setTimeout(() => ti.focus(), 10);
    const done = () => { const v = ti.value.trim(); ti.hidden = true; ti.onblur = ti.onkeydown = null; if (v) { snap(); st.strokes.push({ type: "text", text: v, color: st.color === "#ffffff" ? "#111111" : st.color, size: st.size, pts: [p] }); render(); touch(); } };
    ti.onblur = done; ti.onkeydown = ev => { if (ev.key === "Enter") { ev.preventDefault(); ti.blur(); } if (ev.key === "Escape") { ti.value = ""; ti.blur(); } };
  }

  /* UI */
  $$("[data-t]", m).forEach(b => b.onclick = () => setTool(b.dataset.t));
  $$("[data-c]", m).forEach(b => b.onclick = () => { st.color = b.dataset.c; $$("[data-c]", m).forEach(x => x.classList.toggle("on", x === b)); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); });
  $("#cc", m).oninput = e => { st.color = e.target.value; $$("[data-c]", m).forEach(x => x.classList.remove("on")); if (st.tool === "eraser" || st.tool === "hand") setTool("pen"); };
  $("#sz", m).oninput = e => st.size = +e.target.value;
  $("#bg", m).onchange = e => { st.bg = e.target.value; render(); touch(); };
  $("#more", m).onclick = () => { st.H += 600; cv.height = st.H; render(); touch(); toast("Zeichenfläche erweitert"); };
  $("#un", m).onclick = undo; $("#re", m).onclick = redo;
  $("#cl", m).onclick = async () => { if (st.strokes.length && await confirmBox("Zeichenfläche komplett leeren?", "Leeren")) { snap(); st.strokes = []; render(); touch(); } };
  $("#fi", m).onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f) { setTool("pen"); return; } const bmp = await createImageBitmap(f), s = Math.min(1, 700 / bmp.width), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); st.pending = { src: c.toDataURL("image/jpeg", .85), w: c.width, h: c.height }; st.tool = "place"; $$("[data-t]", m).forEach(b => b.classList.remove("on")); cv.style.touchAction = "pinch-zoom"; toast("Tippe dorthin, wo das Bild hin soll"); };
  $("#eb", m).onclick = () => go(d.folderId ? "docs/" + d.folderId : "board"); $("#et", m).oninput = touch;
  $("#done", m).onclick = () => go(d.folderId ? "docs/" + d.folderId : "board");
  $("#mo-m", m).onclick = e => menu(e.currentTarget, [{ label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); toast(d.pinned ? "Angeheftet" : "Gelöst"); } }, "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); go(d.folderId ? "docs/" + d.folderId : "board"); } }]);
  $("#exp", m).onclick = () => { cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = (d.title || "zeichnung") + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); }); };
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Skizze erklären lassen", icon: "help", fn: async () => explainCanvas("Erkläre, was auf dieser Skizze/Tafel zu sehen ist. Wenn es Mathematik oder Naturwissenschaft ist, erkläre die Idee und Rechenschritte und weise auf mögliche Fehler hin.") }, { label: "Handschrift in Text umwandeln", icon: "text", fn: async () => explainCanvas("Lies die Handschrift/Beschriftungen auf dem Bild und gib sie als sauberen Text wieder (Formeln in Textform).") }, { label: "Als Notiz speichern (Bild)", icon: "note", fn: () => newNote(d.subjectId, `<p><img src="${cv.toDataURL("image/jpeg", .8)}"></p><p><br></p>`, d.title) }]);
  async function explainCanvas(q) { if (!hasKey()) return toast("Bild-Analyse braucht die eingerichtete Lumi AI (Einstellungen → Lumi AI)."); if (!st.strokes.length) return toast("Zeichne zuerst etwas."); toast("Lumi AI schaut hin…"); const t = document.createElement("canvas"); const s = Math.min(1, 1400 / W); t.width = W * s; t.height = st.H * s; t.getContext("2d").drawImage(cv, 0, 0, t.width, t.height); const r = await ai(q, { image: { data: t.toDataURL("image/jpeg", .85).split(",")[1], type: "image/jpeg" } }); if (r) { const { el } = modal(`<h3>Lumi AI</h3><textarea class="field" rows="12">${esc(r)}</textarea><div class="row end"><button class="btn" id="sn">Als Notiz speichern</button></div>`, "wide"); $("#sn", el).onclick = () => { el.closest(".mask").remove(); newNote(d.subjectId, textToHtml(r), d.title + " – Lumi AI"); }; } }
  const key = e => {
    if (!$("#cv")) return; const tag = e.target.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    else if (!e.ctrlKey && !e.metaKey) { const k = { p: "pen", h: "hl", e: "eraser", l: "line", a: "arrow", r: "rect", o: "ellipse", t: "text" }[e.key.toLowerCase()]; if (k) setTool(k); }
  };
  document.addEventListener("keydown", key); LEAVE.push(() => { document.removeEventListener("keydown", key); persist(); });
  setTool("pen"); render();
};
