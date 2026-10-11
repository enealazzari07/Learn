"use strict";
/* Lumi Design-Studio – Übersicht, Editor (Vorlagen, Elemente, Text, Hintergrund, Bilder, Ebenen) und Export (PNG/JPG/PDF).
   Aufbau wie in Canva: Seitenleiste mit Tabs, schwebende Werkzeugleiste für die Auswahl, Seiten-Leiste unten. */

const DS_TPL_FMT = { neon: "poster", cream: "poster", yellow: "poster", study: "poster", pastel: "ig", sunset: "story", navy: "slide", quote: "ig", invite: "invite", title: "slide", cert: "cert", party: "ig" };
const dsFmt = k => DS_FORMATS.find(f => f.k === k) || DS_FORMATS[0];
const dsClone = o => JSON.parse(JSON.stringify(o));
const dsEsc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dsInit = () => (D.designs = D.designs || []);

/* ---------- DOM-Rendering (Editor + Miniaturen) ---------- */
function dsObjStyle(o) {
  let s = `left:${o.x}px;top:${o.y}px;width:${o.w}px;`;
  if (o.type !== "text") s += `height:${o.h}px;`;
  if (o.rot) s += `transform:rotate(${o.rot}deg);`;
  if (o.opacity != null && o.opacity < 1) s += `opacity:${o.opacity};`;
  if (o.type !== "text" && o.shadow) s += `filter:drop-shadow(${o.shadow.x}px ${o.shadow.y}px ${o.shadow.b / 2}px ${o.shadow.c});`;
  return s;
}
function dsTextCss(o) {
  let s = `font-family:'${o.font}',system-ui,sans-serif;font-size:${o.size}px;font-weight:${o.weight};font-style:${o.italic ? "italic" : "normal"};color:${o.color};text-align:${o.align};line-height:${o.lh};letter-spacing:${o.ls}px;`;
  if (o.upper) s += "text-transform:uppercase;"; if (o.under) s += "text-decoration:underline;";
  if (o.shadow) s += `text-shadow:${o.shadow.x}px ${o.shadow.y}px ${o.shadow.b}px ${o.shadow.c};`;
  if (o.bgc) s += `background:${o.bgc};border-radius:${o.radius || 0}px;`;
  if (o.pad) s += `padding:${o.pad}px;`;
  return s;
}
const dsFilterCss = f => ({ bw: "grayscale(1)", sepia: "sepia(.85)", vivid: "saturate(1.45) contrast(1.08)", fade: "contrast(.86) brightness(1.1) saturate(.85)", warm: "sepia(.25) saturate(1.2) hue-rotate(-8deg)", cool: "saturate(1.1) hue-rotate(12deg) brightness(1.03)" })[f] || "";
function dsObjHtml(o, pfx) {
  if (o.hidden) return "";
  const cls = `dob dob-${o.type}${o.lock ? " lk" : ""}`;
  let inner = "";
  if (o.type === "text") inner = `<div class="dtx" style="${dsTextCss(o)}">${dsEsc(o.txt).replace(/\n/g, "<br>") || "&nbsp;"}</div>`;
  else if (o.type === "shape") inner = dsShapeSvg(o, pfx + o.id);
  else if (o.type === "image") inner = `<img src="${o.src}" draggable="false" style="width:100%;height:100%;object-fit:${o.fit};border-radius:${o.r}px;${o.filter ? "filter:" + dsFilterCss(o.filter) + ";" : ""}">`;
  return `<div class="${cls}" data-id="${o.id}" style="${dsObjStyle(o)}">${inner}</div>`;
}
function dsPageHtml(page, W, H, pfx = "s") { return `<div class="dpage" style="width:${W}px;height:${H}px;background:${dsBgCss(page.bg)}">${page.objs.map(o => dsObjHtml(o, pfx)).join("")}</div>`; }
function dsMini(page, W, H, wpx, pfx = "m") { const s = wpx / W; return `<div class="dmini" style="width:${wpx}px;height:${Math.round(H * s)}px"><div class="dmini-in" style="transform:scale(${s})">${dsPageHtml(page, W, H, pfx + Math.random().toString(36).slice(2, 5))}</div></div>`; }

/* ---------- Canvas-Export ---------- */
function dsCssAngleLine(W, H, deg) { const a = deg * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), len = Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a)), cx = W / 2, cy = H / 2; return [cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2]; }
function dsPaintFill(ctx, fill, x, y, w, h) { if (fill && fill.g) { const [x0, y0, x1, y1] = dsCssAngleLine(w, h, fill.g[2]); const g = ctx.createLinearGradient(x + x0, y + y0, x + x1, y + y1); g.addColorStop(0, fill.g[0]); g.addColorStop(1, fill.g[1]); return g; } return fill; }
function dsPaintBg(ctx, bg, W, H) {
  const b = bg || "#ffffff";
  if (b.g) { ctx.fillStyle = dsPaintFill(ctx, b, 0, 0, W, H); ctx.fillRect(0, 0, W, H); return; }
  ctx.fillStyle = b.c || (typeof b === "string" ? b : "#ffffff"); ctx.fillRect(0, 0, W, H);
  if (b.pat) {
    const p = b.pc || "rgba(0,0,0,.12)"; ctx.fillStyle = p; ctx.strokeStyle = p;
    if (b.pat === "dots") for (let y = 14; y < H + 28; y += 28) for (let x = 14; x < W + 28; x += 28) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill(); }
    else if (b.pat === "grid") { ctx.lineWidth = 1; for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); ctx.stroke(); } for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); ctx.stroke(); } }
    else if (b.pat === "stripes") for (let x = 0; x < W; x += 28) ctx.fillRect(x, 0, 14, H);
    else { ctx.lineWidth = 10; for (let i = -H; i < W + H; i += 36) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); } }
  }
}
const dsLoadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
function dsRoundRectPath(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function dsWrap(ctx, o) {
  const inner = Math.max(10, o.w - o.pad * 2), lines = [];
  const txt = o.upper ? String(o.txt).toUpperCase() : String(o.txt);
  txt.split("\n").forEach(par => { if (!par) { lines.push(""); return; } let cur = ""; par.split(" ").forEach(wd => { const t = cur ? cur + " " + wd : wd; if (cur && ctx.measureText(t).width > inner) { lines.push(cur); cur = wd; } else cur = t; }); lines.push(cur); });
  return lines;
}
function dsApplyFilter(cv, f) {
  if (!f) return; const ctx = cv.getContext("2d"), d = ctx.getImageData(0, 0, cv.width, cv.height), p = d.data;
  const P = { bw: { g: 1 }, sepia: { s: .85 }, vivid: { sat: 1.45, c: 1.08 }, fade: { c: .86, b: 1.1, sat: .85 }, warm: { s: .25, sat: 1.2, w: 1 }, cool: { sat: 1.1, k: 1, b: 1.03 } }[f]; if (!P) return;
  for (let i = 0; i < p.length; i += 4) {
    let r = p[i], g = p[i + 1], b = p[i + 2]; const l = .299 * r + .587 * g + .114 * b;
    if (P.g) { r = g = b = l; }
    if (P.s) { const tr = .393 * r + .769 * g + .189 * b, tg = .349 * r + .686 * g + .168 * b, tb = .272 * r + .534 * g + .131 * b; r = r + (tr - r) * P.s; g = g + (tg - g) * P.s; b = b + (tb - b) * P.s; }
    if (P.sat) { const l2 = .299 * r + .587 * g + .114 * b; r = l2 + (r - l2) * P.sat; g = l2 + (g - l2) * P.sat; b = l2 + (b - l2) * P.sat; }
    if (P.c) { r = (r - 128) * P.c + 128; g = (g - 128) * P.c + 128; b = (b - 128) * P.c + 128; }
    if (P.b) { r *= P.b; g *= P.b; b *= P.b; }
    if (P.w) { r *= 1.04; b *= .94; } if (P.k) { r *= .96; b *= 1.05; }
    p[i] = Math.max(0, Math.min(255, r)); p[i + 1] = Math.max(0, Math.min(255, g)); p[i + 2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(d, 0, 0);
}
async function dsRenderCanvas(page, W, H, scale = 1) {
  const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(W * scale)); cv.height = Math.max(1, Math.round(H * scale)); const ctx = cv.getContext("2d"); ctx.scale(scale, scale);
  const fonts = new Set(page.objs.filter(o => o.type === "text").map(o => `${o.italic ? "italic " : ""}${o.weight} ${o.size}px "${o.font}"`));
  try { await Promise.all([...fonts].map(f => document.fonts.load(f))); } catch {}
  dsPaintBg(ctx, page.bg, W, H);
  for (const o of page.objs) {
    if (o.hidden) continue; ctx.save(); ctx.globalAlpha = o.opacity ?? 1; ctx.translate(o.x + o.w / 2, o.y + (o.h || 0) / 2); if (o.rot) ctx.rotate(o.rot * Math.PI / 180); ctx.translate(-o.w / 2, -(o.h || 0) / 2);
    if (o.type === "shape") {
      const img = await dsLoadImg("data:image/svg+xml;charset=utf-8," + encodeURIComponent(dsShapeSvg(o, "x" + o.id)));
      if (o.shadow) { ctx.shadowColor = o.shadow.c; ctx.shadowBlur = o.shadow.b * scale; ctx.shadowOffsetX = o.shadow.x * scale; ctx.shadowOffsetY = o.shadow.y * scale; }
      if (img) ctx.drawImage(img, 0, 0, o.w, o.h);
    } else if (o.type === "image") {
      const img = await dsLoadImg(o.src);
      if (img) {
        const nw = img.naturalWidth, nh = img.naturalHeight; let sx = 0, sy = 0, sw = nw, sh = nh, dx = 0, dy = 0, dw = o.w, dh = o.h;
        if (o.fit === "cover") { const r = Math.max(o.w / nw, o.h / nh); sw = o.w / r; sh = o.h / r; sx = (nw - sw) / 2; sy = (nh - sh) / 2; } else { const r = Math.min(o.w / nw, o.h / nh); dw = nw * r; dh = nh * r; dx = (o.w - dw) / 2; dy = (o.h - dh) / 2; }
        let src = img;
        if (o.filter) { const t = document.createElement("canvas"); t.width = Math.max(1, Math.round(dw * scale)); t.height = Math.max(1, Math.round(dh * scale)); t.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, t.width, t.height); dsApplyFilter(t, o.filter); src = t; sx = sy = 0; sw = t.width; sh = t.height; }
        if (o.shadow) { ctx.shadowColor = o.shadow.c; ctx.shadowBlur = o.shadow.b * scale; ctx.shadowOffsetX = o.shadow.x * scale; ctx.shadowOffsetY = o.shadow.y * scale; }
        if (o.r) { dsRoundRectPath(ctx, 0, 0, o.w, o.h, o.r); ctx.save(); ctx.clip(); ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh); ctx.restore(); } else ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
      }
    } else if (o.type === "text") {
      ctx.font = `${o.italic ? "italic " : ""}${o.weight} ${o.size}px "${o.font}",system-ui,sans-serif`; ctx.textBaseline = "middle"; try { ctx.letterSpacing = (o.ls || 0) + "px"; } catch {}
      const lines = dsWrap(ctx, o), lh = o.size * o.lh, h = lines.length * lh + o.pad * 2;
      if (o.bgc) { ctx.fillStyle = o.bgc; dsRoundRectPath(ctx, 0, 0, o.w, h, o.radius || 0); ctx.fill(); }
      if (o.shadow) { ctx.shadowColor = o.shadow.c; ctx.shadowBlur = o.shadow.b * scale; ctx.shadowOffsetX = o.shadow.x * scale; ctx.shadowOffsetY = o.shadow.y * scale; }
      ctx.fillStyle = o.color;
      lines.forEach((ln, i) => { const y = o.pad + i * lh + lh / 2, tw = ctx.measureText(ln).width; let x = o.pad; if (o.align === "center") x = (o.w - tw) / 2; else if (o.align === "right") x = o.w - o.pad - tw; ctx.textAlign = "left"; ctx.fillText(ln, x, y); if (o.under) { ctx.fillRect(x, y + o.size * .42, tw, Math.max(1, o.size / 16)); } });
    }
    ctx.restore();
  }
  return cv;
}
const dsBlob = (cv, type = "image/png", q = .92) => new Promise(res => cv.toBlob(res, type, q));
function dsSave(blob, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

/* ---------- Bilder ---------- */
function dsReadImage(file, maxPx = 1800) {
  return new Promise(res => { const fr = new FileReader(); fr.onload = () => { const img = new Image(); img.onload = () => { const k = Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); const png = /png|svg|gif|webp/i.test(file.type); res({ src: c.toDataURL(png ? "image/png" : "image/jpeg", .9), w: c.width, h: c.height }); }; img.onerror = () => res(null); img.src = fr.result; }; fr.onerror = () => res(null); fr.readAsDataURL(file); });
}

/* ---------- Übersicht: Designs erscheinen unter „Dokumente“ ---------- */
function dsDocs() { dsInit(); return D.designs.map(d => ({ id: d.id, type: "design", title: d.title, updated: d.updated, thumb: d.thumb, folderId: d.folderId || "", text: "" })); }
function dsItemMenu(b, d, refresh) {
  menu(b, [{ label: "Öffnen", icon: "file", fn: () => go("design/" + d.id) }, { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Umbenennen", { value: d.title }); if (n?.trim()) { d.title = n.trim(); d.updated = Date.now(); save(); refresh(); } } }, { label: "Duplizieren", icon: "copy", fn: async () => { const data = await KV.get("design:" + d.id), nid = uid(); const pages = dsClone(data?.pages || []); pages.forEach(p => { p.id = dsId(); p.objs.forEach(o => o.id = dsId()); }); await KV.set("design:" + nid, { pages }); D.designs.unshift({ ...d, id: nid, title: d.title + " (Kopie)", updated: Date.now() }); save(); refresh(); toast("Dupliziert"); } }, "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { if (!await confirmBox(`„${d.title}“ löschen?`)) return; D.designs = D.designs.filter(x => x.id !== d.id); try { await KV.del?.("design:" + d.id); } catch {} save(); refresh(); } }]);
}
V.designs = () => go("docs");

function dsCreateDialog(pre = {}) {
  dsInit();
  let fmt = pre.fmt || "poster", tpl = pre.tpl || "", cw = 1000, ch = 1000;
  const { el, close } = modal(`<div class="nd dsc"><div class="nd-sw seg" role="tablist" aria-label="Art"><button type="button" role="tab" id="dc-swn">Dokument A4</button><button type="button" role="tab" id="dc-swb">Whiteboard</button><button type="button" class="on" role="tab">Design</button></div><p class="eyebrow">Neues Design</p><input class="nd-name" id="dc-n" placeholder="Name des Designs" autocomplete="off" maxlength="80">
  <label class="lbl">Format</label><div class="dsc-fm" id="dc-f">${DS_FORMATS.map(f => `<button type="button" data-k="${f.k}" class="${f.k === fmt ? "on" : ""}"><span style="aspect-ratio:${f.w}/${f.h}"></span><b>${f.n}</b></button>`).join("")}<button type="button" data-k="custom"><span style="aspect-ratio:1"></span><b>Eigene Größe</b></button></div>
  <div class="dsc-cs" id="dc-c" hidden><label>Breite<input class="field" id="dc-w" type="number" min="100" max="6000" value="1000"></label><label>Höhe<input class="field" id="dc-h" type="number" min="100" max="6000" value="1000"></label><small>Pixel (96 dpi)</small></div>
  <div class="row end"><button class="btn ghost" data-c>Abbrechen</button><button class="btn accent big" id="dc-go">Design erstellen</button></div></div>`, "wide nd-modal");
  const pickRow = (id, set) => $$(`#${id} button`, el).forEach(b => b.onclick = () => { set(b.dataset.k); $$(`#${id} button`, el).forEach(x => x.classList.toggle("on", x === b)); });
  pickRow("dc-f", k => { fmt = k; $("#dc-c", el).hidden = k !== "custom"; }); pickRow("dc-t", k => tpl = k);
  setTimeout(() => $("#dc-n", el).focus(), 40); $("[data-c]", el).onclick = close;
  const folder = pre.folder !== undefined ? pre.folder : (typeof docFolder === "string" ? docFolder : ""); if (pre.name) $("#dc-n", el).value = pre.name;
  $("#dc-swn", el).onclick = () => { const n = $("#dc-n", el).value; close(); docDialog("note", { name: n, folder }); }; $("#dc-swb", el).onclick = () => { const n = $("#dc-n", el).value; close(); boardDialog({ name: n, folder }); };
  $("#dc-go", el).onclick = async () => {
    const f = fmt === "custom" ? { k: "custom", n: "Eigene Größe", w: Math.max(100, Math.min(6000, +$("#dc-w", el).value || 1000)), h: Math.max(100, Math.min(6000, +$("#dc-h", el).value || 1000)) } : dsFmt(fmt), topic = "", t = DS_TEMPLATES.find(x => x.k === tpl);
    const title = $("#dc-n", el).value.trim() || (t ? t.n : "Unbenanntes Design"); close();
    let texts = null;
    if (t && topic) { if (hasKey()) { toast("Lumi AI schreibt die Texte …"); const r = await ai(`Schreibe kurze deutsche Texte für ein ${f.n}-Design (Vorlage „${t.n}“) zum Thema: ${topic}\nAntworte NUR mit JSON: {"title":"max. 4 Wörter, kurz und stark","sub":"ein kurzer Untertitel","body":"1–2 kurze Zeilen mit Details","date":"Datum/Ort oder kurze Zeile","name":"Name falls passend"}`, { max: 400, quiet: true }); try { texts = parseJSON(r); } catch {} if (!texts) toast("Die KI hat nichts Brauchbares geliefert – Standardtexte"); } else toast("Lumi AI ist nicht eingerichtet – Standardtexte"); }
    const page = t ? dsPageFromTemplate(t, f.w, f.h, texts) : dsBlankPage(f.w, f.h), id = uid();
    await KV.set("design:" + id, { pages: [page] }); D.designs.unshift({ id, folderId: folder, title, fmt: f.k, w: f.w, h: f.h, updated: Date.now(), created: Date.now(), thumb: "", pagesN: 1 }); save(); go("design/" + id);
  };
}

/* ---------- Editor ---------- */
V.design = async (m, id) => {
  dsInit();
  const meta = D.designs.find(d => d.id === id); if (!meta) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>Design nicht gefunden</h3><button class="btn" data-go="docs">Zu den Dokumenten</button></div></div>`; return bindCommon(m); }
  dsLoadFonts();
  const data = (await KV.get("design:" + id)) || { pages: [dsBlankPage(meta.w, meta.h)] }, W = meta.w, H = meta.h;
  const S = { pages: data.pages, pi: 0, sel: [], z: 1, auto: true, tab: "tpl", cat: "Alle", emo: "Schule", hist: [], redo: [], clip: [], assets: (await KV.get("design-assets")) || [], editing: false };
  const pg = () => S.pages[S.pi], objOf = i => pg().objs.find(o => o.id === i), selObjs = () => S.sel.map(objOf).filter(Boolean);
  m.classList.add("doc-full");
  m.innerHTML = `<div class="dsn"><header class="dsn-top"><button class="icon-btn" id="d-back" aria-label="Zurück">${ic("back")}</button><input class="dsn-title" id="d-title" value="${dsEsc(meta.title)}" aria-label="Titel" maxlength="80"><span class="dsn-sz">${W} × ${H} px</span><span class="saved" id="d-sv">Gespeichert</span><span class="sp"></span>
  <div class="dsn-hist"><button class="icon-btn" id="d-un" aria-label="Rückgängig" title="Rückgängig (Strg+Z)">${ic("undo")}</button><button class="icon-btn" id="d-re" aria-label="Wiederholen" title="Wiederholen">${ic("redo")}</button></div>
  <div class="dsn-zoom"><button class="icon-btn" id="d-zm" aria-label="Verkleinern">–</button><button class="zv" id="d-zf" title="Einpassen"><span id="d-zp">100%</span></button><button class="icon-btn" id="d-zp2" aria-label="Vergrößern">+</button></div>
  <button class="btn ghost small" id="d-dl">${ic("download")}<span class="hide-sm">Herunterladen</span></button><button class="btn accent small" id="d-done">Fertig</button></header>
  <div class="dsn-main"><nav class="dsn-rail" id="d-rail">${[["tpl", "Vorlagen", "table"], ["el", "Elemente", "star"], ["tx", "Text", "text"], ["bg", "Hintergrund", "image"], ["im", "Bilder", "camera"], ["ly", "Ebenen", "list"]].map(([k, l, i]) => `<button data-tab="${k}" class="${k === "tpl" ? "on" : ""}" title="${l}">${ic(i)}<span>${l}</span></button>`).join("")}</nav>
  <aside class="dsn-panel" id="d-panel"></aside>
  <section class="dsn-center"><div class="dsn-ctx" id="d-ctx"></div><div class="dsn-scroll" id="d-sc"><div class="dsn-pw" id="d-pw"><div class="dsn-pg" id="d-pg"></div></div></div><div class="dsn-pages" id="d-pages"></div></section></div></div>`;
  const $p = $("#d-panel", m), $c = $("#d-ctx", m), $sc = $("#d-sc", m), $pw = $("#d-pw", m), $pgEl = $("#d-pg", m), $pages = $("#d-pages", m), svEl = $("#d-sv", m);

  /* --- Speichern & Verlauf --- */
  const persist = debounce(async () => { if (!D.designs.includes(meta)) return; const ti = $("#d-title", m); meta.title = (ti ? ti.value.trim() : meta.title) || "Unbenanntes Design"; meta.updated = Date.now(); meta.pagesN = S.pages.length; await KV.set("design:" + id, { pages: S.pages }); save(); if (svEl.isConnected) svEl.textContent = "Gespeichert"; thumb(); }, 600);
  const thumb = debounce(async () => { try { const cv = await dsRenderCanvas(S.pages[0], W, H, 420 / Math.max(W, H)); meta.thumb = cv.toDataURL("image/jpeg", .72); save(); } catch {} }, 1800);
  const snap = () => JSON.stringify({ pages: S.pages, pi: S.pi });
  let last = snap();
  const commit = (redraw = true) => { const cur = snap(); if (cur !== last) { S.hist.push(last); if (S.hist.length > 80) S.hist.shift(); S.redo = []; last = cur; } svEl.textContent = "Speichert…"; persist(); if (redraw) drawAll(); };
  const restore = s => { const o = JSON.parse(s); S.pages = o.pages; S.pi = Math.min(o.pi, o.pages.length - 1); S.sel = S.sel.filter(i => objOf(i)); last = s; svEl.textContent = "Speichert…"; persist(); drawAll(); };
  const undo = () => { if (!S.hist.length) return; S.redo.push(last); restore(S.hist.pop()); }, redo = () => { if (!S.redo.length) return; S.hist.push(last); restore(S.redo.pop()); };

  /* --- Zoom --- */
  const setZoom = (z, keep = true) => { S.z = Math.max(.1, Math.min(4, z)); $pgEl.style.transform = `scale(${S.z})`; $pgEl.style.setProperty("--z", S.z); $pw.style.width = W * S.z + "px"; $pw.style.height = H * S.z + "px"; $("#d-zp", m).textContent = Math.round(S.z * 100) + "%"; drawOverlay(); };
  const fit = () => { const aw = $sc.clientWidth - 64, ah = $sc.clientHeight - 64; S.auto = true; setZoom(Math.max(.1, Math.min(aw / W, ah / H, 1.6))); };
  const ro = new ResizeObserver(() => { if (S.auto) fit(); }); ro.observe($sc); LEAVE.push(() => ro.disconnect());

  /* --- Bühne --- */
  const measure = () => { $$(".dob-text", $pgEl).forEach(e => { const o = objOf(e.dataset.id); if (o) o.h = e.offsetHeight; }); };
  const drawStage = () => { $pgEl.innerHTML = dsPageHtml(pg(), W, H, "s") + `<div class="dsel" id="d-sel"></div><div class="dguides" id="d-guides"></div>`; measure(); drawOverlay(); };
  const boxOf = os => { const xs = [], ys = []; os.forEach(o => { const cx = o.x + o.w / 2, cy = o.y + o.h / 2, a = (o.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dy]) => { const px = dx * o.w / 2, py = dy * o.h / 2; xs.push(cx + px * c - py * s); ys.push(cy + px * s + py * c); }); }); const x0 = Math.min(...xs), y0 = Math.min(...ys); return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 }; };
  function drawOverlay() {
    const el = $("#d-sel", m); if (!el) return; const os = selObjs();
    if (!os.length || S.editing) { el.innerHTML = ""; return; }
    const hs = (dx, dy, cur) => `<i class="hdl" data-h="${dx},${dy}" style="left:${(dx + 1) * 50}%;top:${(dy + 1) * 50}%;cursor:${cur}"></i>`;
    if (os.length === 1) { const o = os[0], txt = o.type === "text"; el.innerHTML = `<div class="sbox" style="left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;transform:rotate(${o.rot || 0}deg)">${[[-1, -1, "nwse-resize"], [1, -1, "nesw-resize"], [1, 1, "nwse-resize"], [-1, 1, "nesw-resize"], [1, 0, "ew-resize"], [-1, 0, "ew-resize"]].concat(txt ? [] : [[0, -1, "ns-resize"], [0, 1, "ns-resize"]]).map(h => hs(...h)).join("")}${o.lock ? "" : `<i class="hdl rot" data-h="rot"></i>`}</div>`; if (o.lock) el.firstChild.classList.add("lk"); }
    else { const b = boxOf(os); el.innerHTML = `<div class="sbox multi" style="left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px"></div>`; }
  }
  function drawAll() { drawStage(); drawCtx(); drawPanel(); drawPages(); $("#d-un", m).disabled = !S.hist.length; $("#d-re", m).disabled = !S.redo.length; }
  const refreshObj = o => { const e = $(`.dob[data-id="${o.id}"]`, $pgEl); if (!e) return; const tmp = document.createElement("div"); tmp.innerHTML = dsObjHtml(o, "s"); e.replaceWith(tmp.firstChild); measure(); };

  /* --- Einfügen --- */
  const centerOf = (w, h) => ({ x: Math.round((W - w) / 2), y: Math.round((H - h) / 2) });
  const add = (o, sel = true) => { pg().objs.push(o); if (sel) S.sel = [o.id]; commit(); };
  const addShape = kind => { const u = Math.min(W, H), isLine = false, w = Math.round(kind === "wave" || kind === "wave2" ? W : u * .34), h = Math.round(kind === "wave" || kind === "wave2" ? u * .3 : kind === "flag" ? u * .22 : u * .34), c = centerOf(w, h), cols = ["#3b82f6", "#f97316", "#ec4899", "#14b8a6", "#8b5cf6", "#facc15"]; add(dsShape(kind, c.x, kind === "wave" || kind === "wave2" ? H - h : c.y, w, h, kind === "ring" ? "#111111" : cols[pg().objs.length % cols.length], { r: kind === "rect" ? Math.round(u * .03) : 0 })); };
  const addLine = kind => { const w = Math.round(Math.min(W, H) * .5), c = centerOf(w, 24); add(dsShape(kind, c.x, c.y, w, 24, "#111111", { sw: 6 })); };
  const addText = (txt, st = {}) => { const u = Math.min(W, H), size = Math.round((st.size || 70) * u / 1000 * 1.6), o = dsText(txt, 0, 0, 10, size, st); o.size = size; o.w = st.bgc ? Math.round(size * (String(txt).length * .62 + .4) + o.pad * 2) : Math.round(Math.min(W * .84, Math.max(size * 5, W * .5))); o.x = Math.round((W - o.w) / 2); o.y = Math.round(H / 2 - size); add(o); setTimeout(() => startEdit(o.id), 60); };
  const addEmoji = ch => { const s = Math.round(Math.min(W, H) * .16), c = centerOf(s, s); const o = dsText(ch, c.x, c.y, s * 1.3, s, { font: "Inter", weight: 400, align: "center", lh: 1.1 }); o.x = Math.round((W - o.w) / 2); add(o); };
  const addImage = async file => { const r = await dsReadImage(file); if (!r) return toast("Das Bild konnte nicht geladen werden"); const k = Math.min(1, W * .7 / r.w, H * .7 / r.h), w = Math.round(r.w * k), h = Math.round(r.h * k), c = centerOf(w, h); S.assets.unshift({ id: uid(), src: r.src, w: r.w, h: r.h }); S.assets = S.assets.slice(0, 24); KV.set("design-assets", S.assets); add(dsImage(r.src, c.x, c.y, w, h, { nw: r.w, nh: r.h })); };
  const addAsset = a => { const k = Math.min(1, W * .7 / a.w, H * .7 / a.h), w = Math.round(a.w * k), h = Math.round(a.h * k), c = centerOf(w, h); add(dsImage(a.src, c.x, c.y, w, h, { nw: a.w, nh: a.h })); };
  const applyTpl = t => { const p = dsPageFromTemplate(t, W, H); pg().bg = p.bg; pg().objs = p.objs; S.sel = []; commit(); toast("Vorlage angewendet – mit Strg+Z zurück"); };

  /* --- Auswahl & Operationen --- */
  const del = () => { const ids = new Set(S.sel); pg().objs = pg().objs.filter(o => !ids.has(o.id) || o.lock); S.sel = []; commit(); };
  const dup = () => { const ns = []; selObjs().forEach(o => { const c = dsClone(o); c.id = dsId(); c.x += 24; c.y += 24; pg().objs.push(c); ns.push(c.id); }); if (ns.length) { S.sel = ns; commit(); } };
  const order = dir => { const a = pg().objs, ids = S.sel; if (dir === "front") { const s = a.filter(o => ids.includes(o.id)); pg().objs = [...a.filter(o => !ids.includes(o.id)), ...s]; } else if (dir === "back") { const s = a.filter(o => ids.includes(o.id)); pg().objs = [...s, ...a.filter(o => !ids.includes(o.id))]; } else { const idx = a.map((o, i) => ids.includes(o.id) ? i : -1).filter(i => i >= 0); if (dir === "up") for (const i of idx.reverse()) { if (i < a.length - 1 && !ids.includes(a[i + 1].id)) [a[i], a[i + 1]] = [a[i + 1], a[i]]; } else for (const i of idx) { if (i > 0 && !ids.includes(a[i - 1].id)) [a[i], a[i - 1]] = [a[i - 1], a[i]]; } } commit(); };
  const align = how => { const os = selObjs(); if (!os.length) return; const ref = os.length === 1 ? { x: 0, y: 0, w: W, h: H } : boxOf(os); os.forEach(o => { if (how === "l") o.x = ref.x; if (how === "c") o.x = ref.x + (ref.w - o.w) / 2; if (how === "r") o.x = ref.x + ref.w - o.w; if (how === "t") o.y = ref.y; if (how === "m") o.y = ref.y + (ref.h - o.h) / 2; if (how === "b") o.y = ref.y + ref.h - o.h; o.x = Math.round(o.x); o.y = Math.round(o.y); }); commit(); };
  const set = (patch, redraw = true) => { selObjs().forEach(o => Object.assign(o, typeof patch === "function" ? patch(o) : patch)); commit(redraw); };

  /* --- Text bearbeiten --- */
  function startEdit(oid) {
    const o = objOf(oid), el = $(`.dob[data-id="${oid}"] .dtx`, $pgEl); if (!o || !el) return; S.sel = [oid]; S.editing = true; drawOverlay(); el.contentEditable = "true"; el.classList.add("editing"); el.focus();
    const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    const done = () => { el.removeEventListener("blur", done); S.editing = false; const t = el.innerText.replace(/ /g, " ").replace(/\n$/, ""); o.txt = t; commit(); };
    el.addEventListener("blur", done); el.onkeydown = e => { e.stopPropagation(); if (e.key === "Escape") el.blur(); };
  }

  /* --- Zeiger-Interaktion --- */
  const pagePt = e => { const r = $pgEl.getBoundingClientRect(); return { x: (e.clientX - r.left) / S.z, y: (e.clientY - r.top) / S.z }; };
  const guides = (lines) => { $("#d-guides", m).innerHTML = lines.map(l => l.v ? `<i class="gl v" style="left:${l.v}px"></i>` : `<i class="gl h" style="top:${l.h}px"></i>`).join(""); };
  let drag = null;
  $pw.addEventListener("pointerdown", e => {
    if (S.editing || e.button > 0) return; const hd = e.target.closest(".hdl"), ob = e.target.closest(".dob"), pt = pagePt(e);
    if (hd) { const o = selObjs()[0]; if (!o) return; e.preventDefault(); const h = hd.dataset.h; drag = h === "rot" ? { k: "rot", o, c: { x: o.x + o.w / 2, y: o.y + o.h / 2 } } : { k: "rs", o, h: h.split(",").map(Number), o0: dsClone(o), proportional: false }; $pw.setPointerCapture(e.pointerId); return; }
    if (ob) { const id = ob.dataset.id; if (e.shiftKey) { S.sel = S.sel.includes(id) ? S.sel.filter(i => i !== id) : [...S.sel, id]; drawOverlay(); drawCtx(); drawPanelIf("ly"); return; } if (!S.sel.includes(id)) { S.sel = [id]; drawOverlay(); drawCtx(); drawPanelIf("ly"); } const os = selObjs(); if (os.some(o => o.lock)) return; e.preventDefault(); drag = { k: "mv", pt, os: os.map(o => ({ o, x: o.x, y: o.y })), moved: false, box: boxOf(os) }; $pw.setPointerCapture(e.pointerId); return; }
    S.sel = []; drawOverlay(); drawCtx(); drawPanelIf("ly"); drag = { k: "mq", pt, moved: false }; $pw.setPointerCapture(e.pointerId);
  });
  $pw.addEventListener("pointermove", e => {
    if (!drag) return; const pt = pagePt(e);
    if (drag.k === "mv") {
      let dx = pt.x - drag.pt.x, dy = pt.y - drag.pt.y; if (!drag.moved && Math.hypot(dx, dy) * S.z < 4) return; drag.moved = true;
      const b = drag.box, th = 7 / S.z, gl = [], tx = [0, W / 2, W], ty = [0, H / 2, H]; pg().objs.forEach(o => { if (S.sel.includes(o.id) || o.hidden) return; tx.push(o.x, o.x + o.w / 2, o.x + o.w); ty.push(o.y, o.y + o.h / 2, o.y + o.h); });
      const xs = [b.x + dx, b.x + b.w / 2 + dx, b.x + b.w + dx], ys = [b.y + dy, b.y + b.h / 2 + dy, b.y + b.h + dy]; let bx = null, by = null;
      xs.forEach(x => tx.forEach(t => { const d = t - x; if (Math.abs(d) < th && (bx === null || Math.abs(d) < Math.abs(bx.d))) bx = { d, t }; })); ys.forEach(y => ty.forEach(t => { const d = t - y; if (Math.abs(d) < th && (by === null || Math.abs(d) < Math.abs(by.d))) by = { d, t }; }));
      if (bx && !e.altKey) { dx += bx.d; gl.push({ v: bx.t }); } if (by && !e.altKey) { dy += by.d; gl.push({ h: by.t }); } guides(gl);
      drag.os.forEach(s => { s.o.x = Math.round(s.x + dx); s.o.y = Math.round(s.y + dy); const el = $(`.dob[data-id="${s.o.id}"]`, $pgEl); if (el) { el.style.left = s.o.x + "px"; el.style.top = s.o.y + "px"; } }); drawOverlay();
    } else if (drag.k === "rot") { const o = drag.o; let a = Math.atan2(pt.y - drag.c.y, pt.x - drag.c.x) * 180 / Math.PI + 90; if (e.shiftKey) a = Math.round(a / 15) * 15; else { const n = Math.round(a / 45) * 45; if (Math.abs(a - n) < 3) a = n; } o.rot = Math.round(((a % 360) + 540) % 360 - 180); const el = $(`.dob[data-id="${o.id}"]`, $pgEl); if (el) el.style.transform = `rotate(${o.rot}deg)`; drawOverlay(); }
    else if (drag.k === "rs") {
      const { o, o0, h } = drag, a = (o0.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = o0.x + o0.w / 2, cy = o0.y + o0.h / 2, px = pt.x - cx, py = pt.y - cy, lx = px * c + py * s, ly = -px * s + py * c;
      const [dx, dy] = h, minW = 24, minH = 24; let nw = o0.w, nh = o0.h;
      if (dx) nw = Math.max(minW, dx * (lx + dx * o0.w / 2)); if (dy) nh = Math.max(minH, dy * (ly + dy * o0.h / 2));
      const corner = dx && dy, keep = o.type === "text" || o.type === "image" || corner && !e.shiftKey;
      if (corner && keep) { const k = Math.max(nw / o0.w, nh / o0.h); nw = Math.max(minW, o0.w * k); nh = Math.max(minH, o0.h * k); }
      if (o.type === "text") { const k = nw / o0.w; if (corner) o.size = Math.max(6, Math.round(o0.size * k * 10) / 10); o.w = Math.round(nw); if (o.pad) { } }
      else { o.w = Math.round(nw); o.h = Math.round(nh); if (o.type === "image" && corner) o.h = Math.round(o0.h * nw / o0.w); }
      const fx = dx ? -dx * o0.w / 2 : 0, fy = dy ? -dy * o0.h / 2 : 0, ncx = dx ? fx + dx * o.w / 2 : 0, ncy = dy ? fy + dy * (o.type === "text" ? o0.h * (o.w / o0.w) : o.h) / 2 : 0; const wx = cx + ncx * c - ncy * s, wy = cy + ncx * s + ncy * c;
      o.x = Math.round(wx - o.w / 2); o.y = Math.round(wy - (o.type === "text" ? o0.h * (o.w / o0.w) : o.h) / 2);
      refreshObj(o); drawOverlay();
    } else if (drag.k === "mq") {
      if (!drag.moved && Math.hypot(pt.x - drag.pt.x, pt.y - drag.pt.y) * S.z < 4) return; drag.moved = true; const x0 = Math.min(pt.x, drag.pt.x), y0 = Math.min(pt.y, drag.pt.y), w = Math.abs(pt.x - drag.pt.x), h = Math.abs(pt.y - drag.pt.y); drag.r = { x0, y0, w, h };
      $("#d-sel", m).innerHTML = `<div class="sbox mq" style="left:${x0}px;top:${y0}px;width:${w}px;height:${h}px"></div>`;
    }
  });
  const endDrag = () => { if (!drag) return; const d = drag; drag = null; guides([]); if (d.k === "mv" && d.moved) commit(false); else if (d.k === "rot" || d.k === "rs") { commit(false); drawCtx(); } else if (d.k === "mq" && d.r) { const r = d.r; S.sel = pg().objs.filter(o => !o.hidden && !o.lock && o.x < r.x0 + r.w && o.x + o.w > r.x0 && o.y < r.y0 + r.h && o.y + o.h > r.y0).map(o => o.id); } drawOverlay(); drawCtx(); drawPanelIf("ly"); };
  $pw.addEventListener("pointerup", endDrag); $pw.addEventListener("pointercancel", endDrag);
  $pw.addEventListener("dblclick", e => { const ob = e.target.closest(".dob-text"); if (ob) startEdit(ob.dataset.id); });
  $sc.addEventListener("wheel", e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); S.auto = false; setZoom(S.z * (e.deltaY < 0 ? 1.08 : .93)); } }, { passive: false });
  $sc.addEventListener("dragover", e => e.preventDefault()); $sc.addEventListener("drop", e => { e.preventDefault(); const f = [...(e.dataTransfer?.files || [])].find(x => x.type.startsWith("image/")); if (f) addImage(f); });
  const onKey = e => {
    if (!m.isConnected) return; const t = e.target; if (S.editing || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return; const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); } else if (mod && k === "y") { e.preventDefault(); redo(); } else if (mod && k === "d") { e.preventDefault(); dup(); }
    else if (mod && k === "c") { S.clip = selObjs().map(dsClone); } else if (mod && k === "v") { if (S.clip.length) { e.preventDefault(); const ns = S.clip.map(o => { const c = dsClone(o); c.id = dsId(); c.x += 30; c.y += 30; pg().objs.push(c); return c.id; }); S.sel = ns; commit(); } }
    else if (mod && k === "a") { e.preventDefault(); S.sel = pg().objs.filter(o => !o.hidden).map(o => o.id); drawOverlay(); drawCtx(); }
    else if (k === "delete" || k === "backspace") { if (S.sel.length) { e.preventDefault(); del(); } } else if (k === "escape") { S.sel = []; drawOverlay(); drawCtx(); }
    else if (e.key.startsWith("Arrow") && S.sel.length) { e.preventDefault(); const st = e.shiftKey ? 10 : 1; selObjs().forEach(o => { if (o.lock) return; if (e.key === "ArrowLeft") o.x -= st; if (e.key === "ArrowRight") o.x += st; if (e.key === "ArrowUp") o.y -= st; if (e.key === "ArrowDown") o.y += st; }); drawStage(); nudgeCommit(); }
    else if (e.key === "]") order("up"); else if (e.key === "[") order("down");
  };
  const nudgeCommit = debounce(() => commit(false), 400);
  document.addEventListener("keydown", onKey); LEAVE.push(() => { document.removeEventListener("keydown", onKey); persist.flush?.(); });

  /* --- Popover: Farben, Schriften --- */
  const pop = (anchor, html, bind) => { document.querySelectorAll(".dpop").forEach(x => x.remove()); const p = document.createElement("div"); p.className = "dpop"; p.innerHTML = html; document.body.appendChild(p); const r = anchor.getBoundingClientRect(); p.style.left = Math.max(8, Math.min(innerWidth - p.offsetWidth - 8, r.left)) + "px"; p.style.top = Math.min(innerHeight - p.offsetHeight - 8, r.bottom + 8) + "px"; const off = ev => { if (!p.contains(ev.target) && !anchor.contains(ev.target)) close(); }, close = () => { p.remove(); document.removeEventListener("pointerdown", off, true); }; setTimeout(() => document.addEventListener("pointerdown", off, true), 0); bind(p, close); LEAVE.push(close); return p; };
  const colorPop = (anchor, cur, onPick, o = {}) => pop(anchor, `<div class="dcp"><div class="dcp-g">${DS_COLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === cur ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div><label class="dcp-c"><input type="color" value="${/^#[0-9a-f]{6}$/i.test(cur) ? cur : "#3b82f6"}"><span>Eigene Farbe</span></label>${o.grad ? `<h6>Verläufe</h6><div class="dcp-gr">${DS_GRADS.map((g, i) => `<button data-g="${i}" style="background:linear-gradient(${g[2]}deg,${g[0]},${g[1]})" aria-label="Verlauf ${i + 1}"></button>`).join("")}</div>` : ""}${o.none ? `<button class="dcp-n" data-none="1">Keine</button>` : ""}</div>`, (p, close) => { $$("[data-c]", p).forEach(b => b.onclick = () => { onPick(b.dataset.c); close(); }); $("input[type=color]", p).oninput = e => onPick(e.target.value, true); $("input[type=color]", p).onchange = e => { onPick(e.target.value); }; $$("[data-g]", p).forEach(b => b.onclick = () => { const g = DS_GRADS[+b.dataset.g]; onPick({ g: [...g] }); close(); }); $("[data-none]", p) && ($("[data-none]", p).onclick = () => { onPick("none"); close(); }); });
  const fontPop = (anchor, cur) => pop(anchor, `<div class="dfp">${DS_FONTS.map(f => `<button data-f="${f}" class="${f === cur ? "on" : ""}" style="font-family:'${f}'">${f}</button>`).join("")}</div>`, (p, close) => $$("[data-f]", p).forEach(b => b.onclick = () => { set({ font: b.dataset.f }); close(); }));

  /* --- Kontext-Leiste --- */
  const sw = (cls, color, title) => `<button class="cs ${cls}" title="${title}"><i style="background:${color && color.g ? `linear-gradient(${color.g[2]}deg,${color.g[0]},${color.g[1]})` : (color || "transparent")}"></i></button>`;
  function drawCtx() {
    const os = selObjs(), o = os[0];
    if (!os.length) { $c.innerHTML = `<span class="dc-info">Klicke ein Element an – oder wähle links Vorlagen, Elemente und Text.</span><span class="sp"></span>`; return; }
    const same = os.every(x => x.type === o.type), t = same ? o.type : "mix", b = (cls, i, ttl, act = "") => `<button class="tbt ${act}" data-act="${cls}" title="${ttl}">${ic(i)}</button>`;
    let h = "";
    if (t === "text") h += `<button class="dc-font" id="c-font" style="font-family:'${o.font}'">${o.font}${ic("chev")}</button><span class="dc-sz"><button data-act="szm">–</button><input id="c-size" type="number" min="6" max="600" value="${Math.round(o.size)}"><button data-act="szp">+</button></span>${sw("c-col", o.color, "Textfarbe")}<button class="tbt ${o.weight >= 700 ? "on" : ""}" data-act="bold" title="Fett"><b>B</b></button><button class="tbt ${o.italic ? "on" : ""}" data-act="ital" title="Kursiv"><i style="font-family:serif">I</i></button><button class="tbt ${o.under ? "on" : ""}" data-act="und" title="Unterstrichen"><u>U</u></button><button class="tbt ${o.upper ? "on" : ""}" data-act="upp" title="Großbuchstaben">Aa</button><button class="tbt" data-act="al" title="Ausrichtung">${o.align === "center" ? "≡" : o.align === "right" ? "⫸" : "⫷"}</button><button class="tbt" id="c-sp" title="Abstand">↕</button>`;
    else if (t === "shape") h += sw("c-fill", o.fill, "Füllung") + `<button class="tbt" id="c-stroke" title="Kontur">${ic("square")}</button>${["rect"].includes(o.kind) ? `<label class="dc-rng" title="Eckenradius">⌜<input id="c-rad" type="range" min="0" max="${Math.round(Math.min(o.w, o.h) / 2)}" value="${o.r || 0}"></label>` : ""}`;
    else if (t === "image") h += `<button class="tbt" data-act="fit" title="Zuschnitt">${o.fit === "cover" ? "Füllen" : "Einpassen"}</button><label class="dc-rng" title="Eckenradius">⌜<input id="c-rad" type="range" min="0" max="${Math.round(Math.min(o.w, o.h) / 2)}" value="${o.r || 0}"></label><button class="tbt" id="c-filt" title="Filter">Filter</button>`;
    h += `<i class="dc-sep"></i><label class="dc-rng" title="Transparenz">◐<input id="c-op" type="range" min="5" max="100" value="${Math.round((o.opacity ?? 1) * 100)}"></label><button class="tbt ${o.shadow ? "on" : ""}" data-act="shd" title="Schatten">${ic("copy")}</button><i class="dc-sep"></i><button class="tbt" id="c-al" title="Ausrichten">${ic("list")}</button><button class="tbt" id="c-ord" title="Reihenfolge">${ic("up")}</button><button class="tbt ${o.lock ? "on" : ""}" data-act="lock" title="Sperren">🔒</button><button class="tbt" data-act="dup" title="Duplizieren (Strg+D)">${ic("copy")}</button><button class="tbt danger" data-act="del" title="Löschen">${ic("trash")}</button>`;
    $c.innerHTML = h;
    const act = {
      szm: () => set(x => ({ size: Math.max(6, Math.round(x.size * .9)) })), szp: () => set(x => ({ size: Math.round(x.size * 1.1) })), bold: () => set(x => ({ weight: x.weight >= 700 ? 400 : 800 })), ital: () => set(x => ({ italic: !x.italic })), und: () => set(x => ({ under: !x.under })), upp: () => set(x => ({ upper: !x.upper })),
      al: () => set(x => ({ align: x.align === "left" ? "center" : x.align === "center" ? "right" : "left" })), fit: () => set(x => ({ fit: x.fit === "cover" ? "contain" : "cover" })), shd: () => set(x => ({ shadow: x.shadow ? null : { x: 0, y: Math.round(Math.min(W, H) * .008) + 4, b: 18, c: "rgba(0,0,0,.35)" } })), lock: () => { set(x => ({ lock: !x.lock })); }, dup, del,
    };
    $$("[data-act]", $c).forEach(b => b.onclick = () => act[b.dataset.act]());
    $("#c-font", $c) && ($("#c-font", $c).onclick = e => fontPop(e.currentTarget, o.font));
    $("#c-size", $c) && ($("#c-size", $c).onchange = e => set({ size: Math.max(6, +e.target.value || o.size) }));
    $(".c-col", $c) && ($(".c-col", $c).onclick = e => colorPop(e.currentTarget, o.color, (c, live) => { selObjs().forEach(x => x.color = c); if (live) { selObjs().forEach(refreshObj); } else commit(); }));
    $(".c-fill", $c) && ($(".c-fill", $c).onclick = e => colorPop(e.currentTarget, typeof o.fill === "string" ? o.fill : "", (c, live) => { selObjs().forEach(x => { if (x.type === "shape") x.fill = c; }); if (live) selObjs().forEach(refreshObj); else commit(); }, { grad: true, none: true }));
    $("#c-stroke", $c) && ($("#c-stroke", $c).onclick = e => pop(e.currentTarget, `<div class="dcp"><h6>Kontur</h6><div class="dcp-g">${DS_COLORS.map(c => `<button data-c="${c}" style="background:${c}"></button>`).join("")}</div><label class="dc-rng" style="margin:10px 0 4px">Dicke<input id="p-sw" type="range" min="0" max="24" value="${o.stroke ? o.sw || 2 : 0}"></label></div>`, (p, close) => { $$("[data-c]", p).forEach(b => b.onclick = () => { set(x => ({ stroke: b.dataset.c, sw: x.sw || 4 })); }); $("#p-sw", p).oninput = e => { const v = +e.target.value; selObjs().forEach(x => { x.sw = v; x.stroke = v ? (x.stroke || "#111111") : null; refreshObj(x); }); }; $("#p-sw", p).onchange = () => commit(false); }));
    $("#c-rad", $c) && ($("#c-rad", $c).oninput = e => { selObjs().forEach(x => { x.r = +e.target.value; refreshObj(x); }); }, $("#c-rad", $c).onchange = () => commit(false));
    $("#c-op", $c).oninput = e => { selObjs().forEach(x => { x.opacity = +e.target.value / 100; const el = $(`.dob[data-id="${x.id}"]`, $pgEl); if (el) el.style.opacity = x.opacity; }); }; $("#c-op", $c).onchange = () => commit(false);
    $("#c-filt", $c) && ($("#c-filt", $c).onclick = e => pop(e.currentTarget, `<div class="dfp">${[["", "Original"], ["bw", "Schwarz-Weiß"], ["sepia", "Sepia"], ["vivid", "Lebendig"], ["fade", "Verblasst"], ["warm", "Warm"], ["cool", "Kühl"]].map(([k, l]) => `<button data-fi="${k}" class="${(o.filter || "") === k ? "on" : ""}">${l}</button>`).join("")}</div>`, (p, close) => $$("[data-fi]", p).forEach(b => b.onclick = () => { set({ filter: b.dataset.fi }); close(); })));
    $("#c-sp", $c) && ($("#c-sp", $c).onclick = e => pop(e.currentTarget, `<div class="dcp"><label class="dc-rng big">Zeilenabstand<input id="p-lh" type="range" min="0.8" max="2.2" step="0.02" value="${o.lh}"></label><label class="dc-rng big">Buchstabenabstand<input id="p-ls" type="range" min="-5" max="30" step="0.5" value="${o.ls}"></label></div>`, p => { $("#p-lh", p).oninput = ev => { selObjs().forEach(x => { x.lh = +ev.target.value; refreshObj(x); }); drawOverlay(); }; $("#p-ls", p).oninput = ev => { selObjs().forEach(x => { x.ls = +ev.target.value; refreshObj(x); }); drawOverlay(); }; $("#p-lh", p).onchange = $("#p-ls", p).onchange = () => commit(false); }));
    $("#c-al", $c).onclick = e => menu(e.currentTarget, [["l", "Links an Seite", "Seitenrand links"], ["c", "Horizontal zentrieren", "Mitte"], ["r", "Rechts an Seite", "Seitenrand rechts"], ["t", "Oben an Seite", ""], ["m", "Vertikal zentrieren", ""], ["b", "Unten an Seite", ""]].map(([k, l]) => ({ label: l, icon: "list", fn: () => align(k) })));
    $("#c-ord", $c).onclick = e => menu(e.currentTarget, [["front", "Ganz nach vorn"], ["up", "Eine Ebene nach vorn"], ["down", "Eine Ebene zurück"], ["back", "Ganz nach hinten"]].map(([k, l]) => ({ label: l, icon: "up", fn: () => order(k) })));
  }

  /* --- Seitenleiste --- */
  const drawPanelIf = k => { if (S.tab === k) drawPanel(); };
  function drawPanel() {
    const tab = S.tab; $$("#d-rail button", m).forEach(b => b.classList.toggle("on", b.dataset.tab === tab)); let h = "";
    if (tab === "tpl") { const tp = DS_TEMPLATES.filter(t => S.cat === "Alle" || t.cat === S.cat); h = `<h4>Vorlagen</h4><div class="dpn-chips">${DS_TPL_CATS.map(c => `<button class="${c === S.cat ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}</div><div class="dpn-tpl">${tp.map(t => `<button data-t="${t.k}" class="dpn-t"><span class="dpn-tp" style="aspect-ratio:${W}/${H}">${dsMini(dsPageFromTemplate(t, W, H), W, H, 138, "p" + t.k)}</span><b>${t.n}</b></button>`).join("")}</div>`; }
    else if (tab === "el") h = `<h4>Elemente</h4><h5>Formen</h5><div class="dpn-shapes">${Object.keys(DS_SHAPES).map(k => { const o = dsShape(k, 0, 0, 56, 56, "#111111", { r: 8 }); return `<button data-shape="${k}" title="${DS_SHAPES[k].n}">${dsShapeSvg(o, "e" + k)}</button>`; }).join("")}</div><h5>Linien & Pfeile</h5><div class="dpn-lines">${DS_LINES.map(([k, l]) => `<button data-line="${k}" title="${l}">${dsShapeSvg(dsShape(k, 0, 0, 120, 22, "#111111", { sw: 4 }), "l" + k)}</button>`).join("")}</div><h5>Sticker</h5><div class="dpn-chips sm">${Object.keys(DS_EMOJI).map(c => `<button class="${c === S.emo ? "on" : ""}" data-emo="${c}">${c}</button>`).join("")}</div><div class="dpn-emo">${DS_EMOJI[S.emo].map(e => `<button data-e="${e}">${e}</button>`).join("")}</div><h5>Dekorationen</h5><div class="dpn-packs">${DS_PACKS.map(p => `<button data-pack="${p.k}"><span class="dpn-pk" style="aspect-ratio:${W}/${H}">${dsMini({ bg: "#ffffff", objs: p.make(W, H) }, W, H, 138, "k" + p.k)}</span><b>${p.n}</b></button>`).join("")}</div>`;
    else if (tab === "tx") h = `<h4>Text</h4><button class="dpn-big" data-tx="h">Überschrift hinzufügen</button><button class="dpn-mid" data-tx="s">Unterüberschrift hinzufügen</button><button class="dpn-sm" data-tx="b">Fließtext hinzufügen</button><h5>Schriftstile</h5><div class="dpn-styles">${DS_TEXT_STYLES.map((s, i) => `<button data-ts="${i}" style="font-family:'${s.s.font}';font-weight:${s.s.weight};font-style:${s.s.italic ? "italic" : "normal"};${s.s.upper ? "text-transform:uppercase;" : ""}color:${s.s.color && s.s.color !== "#ffffff" ? s.s.color : "#111"};${s.s.shadow ? `text-shadow:${s.s.shadow.x / 3}px ${s.s.shadow.y / 3}px ${s.s.shadow.b / 3}px ${s.s.shadow.c};` : ""}${s.s.color === "#ffffff" ? "background:#1f2937;" : ""}${s.s.bgc ? `background:${s.s.bgc};` : ""}">${s.s.txt}</button>`).join("")}</div>`;
    else if (tab === "bg") { const cur = pg().bg; h = `<h4>Hintergrund</h4><h5>Farben</h5><div class="dcp-g big">${DS_COLORS.map(c => `<button data-bgc="${c}" style="background:${c}" class="${cur === c || cur?.c === c && !cur.pat ? "on" : ""}"></button>`).join("")}</div><label class="dcp-c"><input type="color" id="bg-pick" value="${typeof cur === "string" ? cur : cur?.c || "#ffffff"}"><span>Eigene Farbe</span></label><h5>Verläufe</h5><div class="dcp-gr big">${DS_GRADS.map((g, i) => `<button data-bgg="${i}" style="background:linear-gradient(${g[2]}deg,${g[0]},${g[1]})"></button>`).join("")}</div><h5>Muster</h5><div class="dpn-pat">${DS_PATTERNS.map(([k, l]) => `<button data-bgp="${k}"><i style="background:${dsBgCss({ pat: k, c: "#ffffff", pc: "rgba(0,0,0,.2)" })}"></i><span>${l}</span></button>`).join("")}</div>`; }
    else if (tab === "im") { const wb = D.docs.filter(d => d.type === "draw" && d.thumb).slice(0, 12); h = `<h4>Bilder</h4><button class="dpn-up" id="p-up">${ic("upload")}Bild hochladen</button><p class="note">Oder Bild einfach auf die Seite ziehen.</p>${S.assets.length ? `<h5>Hochgeladen</h5><div class="dpn-imgs">${S.assets.map(a => `<button data-as="${a.id}"><img src="${a.src}" alt=""></button>`).join("")}</div>` : ""}${wb.length ? `<h5>Aus deinen Whiteboards</h5><div class="dpn-imgs">${wb.map(d => `<button data-wb="${d.id}"><img src="${d.thumb}" alt=""></button>`).join("")}</div>` : ""}<input type="file" id="p-file" accept="image/*" hidden multiple>`; }
    else if (tab === "ly") { const os = [...pg().objs].reverse(); h = `<h4>Ebenen</h4>${os.length ? `<div class="dpn-ly">${os.map(o => `<div class="ly ${S.sel.includes(o.id) ? "on" : ""}" data-l="${o.id}"><span class="ly-i">${o.type === "text" ? "T" : o.type === "image" ? ic("image") : ic("square")}</span><b>${o.type === "text" ? dsEsc(String(o.txt).split("\n")[0].slice(0, 26) || "Text") : o.type === "image" ? "Bild" : (DS_SHAPES[o.kind]?.n || "Linie")}</b><button data-lv="${o.id}" title="Ein-/ausblenden">${o.hidden ? "◌" : "●"}</button><button data-ll="${o.id}" title="Sperren">${o.lock ? "🔒" : "🔓"}</button></div>`).join("")}</div>` : `<p class="note">Noch keine Elemente auf dieser Seite.</p>`}`; }
    $p.innerHTML = h; bindPanel();
  }
  function bindPanel() {
    $$("[data-cat]", $p).forEach(b => b.onclick = () => { S.cat = b.dataset.cat; drawPanel(); }); $$("[data-t]", $p).forEach(b => b.onclick = () => applyTpl(DS_TEMPLATES.find(t => t.k === b.dataset.t)));
    $$("[data-shape]", $p).forEach(b => b.onclick = () => addShape(b.dataset.shape)); $$("[data-line]", $p).forEach(b => b.onclick = () => addLine(b.dataset.line)); $$("[data-emo]", $p).forEach(b => b.onclick = () => { S.emo = b.dataset.emo; drawPanel(); }); $$("[data-e]", $p).forEach(b => b.onclick = () => addEmoji(b.dataset.e));
    $$("[data-pack]", $p).forEach(b => b.onclick = () => { const k = DS_PACKS.find(p => p.k === b.dataset.pack); const ns = k.make(W, H); pg().objs.push(...ns); S.sel = ns.map(o => o.id); commit(); });
    $$("[data-tx]", $p).forEach(b => b.onclick = () => addText(({ h: "Überschrift", s: "Unterüberschrift", b: "Hier steht dein Fließtext. Doppelklick zum Bearbeiten." })[b.dataset.tx], ({ h: { size: 90 }, s: { size: 48, weight: 600 }, b: { size: 28, weight: 400, font: "Inter" } })[b.dataset.tx]));
    $$("[data-ts]", $p).forEach(b => b.onclick = () => { const s = DS_TEXT_STYLES[+b.dataset.ts].s; addText(s.txt, { ...s }); });
    $$("[data-bgc]", $p).forEach(b => b.onclick = () => { pg().bg = b.dataset.bgc; commit(); }); $("#bg-pick", $p) && ($("#bg-pick", $p).oninput = e => { pg().bg = e.target.value; $pgEl.firstChild.style.background = dsBgCss(pg().bg); }, $("#bg-pick", $p).onchange = () => commit());
    $$("[data-bgg]", $p).forEach(b => b.onclick = () => { pg().bg = { g: [...DS_GRADS[+b.dataset.bgg]] }; commit(); }); $$("[data-bgp]", $p).forEach(b => b.onclick = () => { const cur = pg().bg, base = typeof cur === "string" ? cur : cur?.c || "#ffffff"; pg().bg = { pat: b.dataset.bgp, c: base, pc: "rgba(0,0,0,.14)" }; commit(); });
    $("#p-up", $p) && ($("#p-up", $p).onclick = () => $("#p-file", $p).click()); $("#p-file", $p) && ($("#p-file", $p).onchange = async e => { for (const f of e.target.files) await addImage(f); drawPanel(); });
    $$("[data-as]", $p).forEach(b => b.onclick = () => addAsset(S.assets.find(a => a.id === b.dataset.as))); $$("[data-wb]", $p).forEach(b => b.onclick = () => { const d = D.docs.find(x => x.id === b.dataset.wb); addAsset({ src: d.thumb, w: 480, h: 300 }); });
    $$(".ly", $p).forEach(r => r.onclick = e => { if (e.target.closest("button")) return; S.sel = [r.dataset.l]; drawOverlay(); drawCtx(); drawPanel(); });
    $$("[data-lv]", $p).forEach(b => b.onclick = () => { const o = objOf(b.dataset.lv); o.hidden = !o.hidden; commit(); }); $$("[data-ll]", $p).forEach(b => b.onclick = () => { const o = objOf(b.dataset.ll); o.lock = !o.lock; commit(); });
  }
  $$("#d-rail button", m).forEach(b => b.onclick = () => { const was = S.tab === b.dataset.tab && !$p.hidden; S.tab = b.dataset.tab; $p.hidden = was; if (was) { $$("#d-rail button", m).forEach(x => x.classList.remove("on")); } else drawPanel(); });

  /* --- Seiten-Leiste --- */
  function drawPages() {
    $pages.innerHTML = S.pages.map((p, i) => `<button class="dpg ${i === S.pi ? "on" : ""}" data-pi="${i}"><span class="dpg-t" style="aspect-ratio:${W}/${H}">${dsMini(p, W, H, 84, "g" + i)}</span><em>${i + 1}</em></button>`).join("") + `<button class="dpg add" id="pg-add" title="Seite hinzufügen">${ic("plus")}</button>`;
    $$("[data-pi]", $pages).forEach(b => { b.onclick = () => { S.pi = +b.dataset.pi; S.sel = []; drawAll(); }; b.oncontextmenu = e => { e.preventDefault(); pageMenu(b, +b.dataset.pi); }; });
    $("#pg-add", $pages).onclick = () => { S.pages.push(dsBlankPage(W, H, pg().bg)); S.pi = S.pages.length - 1; S.sel = []; commit(); };
  }
  const pageMenu = (anchor, i) => menu(anchor, [{ label: "Seite duplizieren", icon: "copy", fn: () => { const c = dsClone(S.pages[i]); c.id = dsId(); c.objs.forEach(o => o.id = dsId()); S.pages.splice(i + 1, 0, c); S.pi = i + 1; commit(); } }, ...(i > 0 ? [{ label: "Nach links", icon: "back", fn: () => { [S.pages[i - 1], S.pages[i]] = [S.pages[i], S.pages[i - 1]]; S.pi = i - 1; commit(); } }] : []), ...(i < S.pages.length - 1 ? [{ label: "Nach rechts", icon: "up", fn: () => { [S.pages[i + 1], S.pages[i]] = [S.pages[i], S.pages[i + 1]]; S.pi = i + 1; commit(); } }] : []), ...(S.pages.length > 1 ? ["-", { label: "Seite löschen", icon: "trash", danger: true, fn: () => { S.pages.splice(i, 1); S.pi = Math.min(S.pi, S.pages.length - 1); S.sel = []; commit(); } }] : [])]);
  $pages.addEventListener("contextmenu", e => e.preventDefault());

  /* --- Kopfzeile --- */
  const backTo = () => go("docs/" + (meta.folderId || "")); $("#d-back", m).onclick = backTo; $("#d-done", m).onclick = async () => { try { meta.title = $("#d-title", m).value.trim() || "Unbenanntes Design"; meta.updated = Date.now(); meta.pagesN = S.pages.length; await KV.set("design:" + id, { pages: S.pages }); const cv = await dsRenderCanvas(S.pages[0], W, H, 420 / Math.max(W, H)); meta.thumb = cv.toDataURL("image/jpeg", .72); save(); } catch {} backTo(); }; $("#d-title", m).oninput = () => { svEl.textContent = "Speichert…"; persist(); };
  $("#d-un", m).onclick = undo; $("#d-re", m).onclick = redo; $("#d-zm", m).onclick = () => { S.auto = false; setZoom(S.z / 1.2); }; $("#d-zp2", m).onclick = () => { S.auto = false; setZoom(S.z * 1.2); }; $("#d-zf", m).onclick = fit;
  $("#d-dl", m).onclick = e => menu(e.currentTarget, [{ label: "PNG (diese Seite)", icon: "image", fn: () => exp("png", 1) }, { label: "PNG – hohe Qualität (2×)", icon: "image", fn: () => exp("png", 2) }, { label: "JPG (diese Seite)", icon: "image", fn: () => exp("jpg", 1) }, { label: S.pages.length > 1 ? "PDF (alle Seiten)" : "PDF", icon: "file", fn: () => exp("pdf", 1.5) }]);
  async function exp(kind, scale) {
    toast("Wird erstellt …"); const name = (meta.title || "Design").replace(/[^\wÀ-ɏ\- ]+/g, "").trim() || "Design";
    try {
      if (kind === "pdf") { const w = open("", "_blank"); if (!w) return toast("Pop-up erlaubt?"); const imgs = []; for (const p of S.pages) { const cv = await dsRenderCanvas(p, W, H, scale); imgs.push(cv.toDataURL("image/jpeg", .93)); } w.document.write(`<!doctype html><meta charset="utf-8"><title>${dsEsc(name)}</title><style>@page{size:${W}px ${H}px;margin:0}html,body{margin:0;background:#fff}img{display:block;width:${W}px;height:${H}px;page-break-after:always}img:last-child{page-break-after:auto}@media screen{body{background:#888;padding:16px}img{margin:0 auto 16px;max-width:100%;height:auto;box-shadow:0 4px 20px rgba(0,0,0,.4)}}</style>${imgs.map(s => `<img src="${s}">`).join("")}`); w.document.close(); toast("Im Druckdialog „Als PDF sichern“ wählen"); setTimeout(() => w.print(), 700); return; }
      const cv = await dsRenderCanvas(pg(), W, H, scale), blob = await dsBlob(cv, kind === "jpg" ? "image/jpeg" : "image/png"); dsSave(blob, `${name}${S.pages.length > 1 ? " – Seite " + (S.pi + 1) : ""}.${kind}`); toast("Heruntergeladen");
    } catch (e) { toast("Export fehlgeschlagen: " + e.message); }
  }

  /* --- Start --- */
  drawAll(); fit(); LEAVE.push(() => { try { persist.flush?.(); } catch {} });
  document.fonts && document.fonts.ready.then(() => { measure(); drawOverlay(); });
};
