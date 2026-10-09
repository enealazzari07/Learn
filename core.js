"use strict";
/* Lumi – core helpers: DOM, icons, storage (IndexedDB), AI, modals */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };

/* ---------- dates ---------- */
const pad = n => String(n).padStart(2, "0");
const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const daysUntil = s => Math.round((parseISO(s) - parseISO(iso())) / 864e5);
const fmtD = s => parseISO(s).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
const fmtAgo = ts => { const m = Math.round((Date.now() - ts) / 6e4); if (m < 1) return "gerade eben"; if (m < 60) return `vor ${m} Min.`; const h = Math.round(m / 60); if (h < 24) return `vor ${h} Std.`; const d = Math.round(h / 24); return d === 1 ? "gestern" : `vor ${d} Tagen`; };

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  brush: '<path d="M9.06 11.9l8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>',
  cards: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5"/><path d="M2 17l10 5 10-5"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  spark: '<circle cx="12" cy="5" r="2.6" fill="currentColor"/><circle cx="12" cy="19" r="2.6" fill="currentColor"/><circle cx="5" cy="12" r="2.6" fill="currentColor"/><circle cx="19" cy="12" r="2.6" fill="currentColor"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', check: '<path d="M5 12l5 5 9-10"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', pause: '<path d="M8 5v14M16 5v14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
  bold: '<path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z"/>', italic: '<path d="M19 4h-9M14 20H5M15 4L9 20"/>',
  underline: '<path d="M6 3v7a6 6 0 0 0 12 0V3M4 21h16"/>', strike: '<path d="M16 4H9a3 3 0 0 0 0 6h6a3 3 0 0 1 0 6H8M4 12h16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  listnum: '<path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  undo: '<path d="M3 7v6h6M3 13a9 9 0 1 0 3-7"/>', redo: '<path d="M21 7v6h-6M21 13a9 9 0 1 1-3-7"/>',
  eraser: '<path d="M20 20H9L3 14a2 2 0 0 1 0-3l9-9a2 2 0 0 1 3 0l5 5a2 2 0 0 1 0 3L12 20"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2"/>', circle: '<circle cx="12" cy="12" r="9"/>',
  line: '<path d="M5 19L19 5"/>', arrow: '<path d="M5 19L19 5M9 5h10v10"/>', text: '<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
  file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-4-2-7-4-9 0 4-4 6-4 12 0 4 3 8 7 8z"/>',
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>', hl: '<path d="M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  quote: '<path d="M3 21c3 0 7-1 7-8V5H3v8h4c0 3-2 4-4 4zM14 21c3 0 7-1 7-8V5h-7v8h4c0 3-2 4-4 4z"/>',
  code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>', todo: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', alignl: '<path d="M3 6h18M3 12h12M3 18h16"/>', alignc: '<path d="M3 6h18M7 12h10M5 18h14"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', hrule: '<path d="M3 12h18"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  note: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>', shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  chev: '<path d="M6 9l6 6 6-6"/>', send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>', rot: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
};
const ic = (n, c = "ic") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

/* ---------- toast & modal ---------- */
let _tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove("on"), 2800); }
function modal(html, cls = "") {
  const m = document.createElement("div"); m.className = "mask";
  m.innerHTML = `<div class="st-modal ${cls}" role="dialog" aria-modal="true"><button class="x" aria-label="Schließen">${ic("x")}</button>${html}</div>`;
  $("#modal-root").appendChild(m);
  const close = () => m.remove();
  $(".x", m).onclick = close; m.addEventListener("mousedown", e => { if (e.target === m) close(); });
  return { el: m.firstElementChild, close };
}
function ask(title, { value = "", placeholder = "", multiline = false, ok = "OK", hint = "" } = {}) {
  return new Promise(res => {
    const { el, close } = modal(`<h3>${esc(title)}</h3>${hint ? `<p class="note">${esc(hint)}</p>` : ""}${multiline ? `<textarea class="field" rows="6" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input class="field" value="${esc(value)}" placeholder="${esc(placeholder)}">`}<div class="row end"><button class="btn ghost" data-c>Abbrechen</button><button class="btn" data-o>${ok}</button></div>`);
    const f = $(".field", el); setTimeout(() => f.focus(), 30); f.select?.();
    let done = false; const fin = v => { if (done) return; done = true; close(); res(v); };
    $("[data-c]", el).onclick = () => fin(null); $("[data-o]", el).onclick = () => fin(f.value);
    $(".x", el).onclick = () => fin(null);
    if (!multiline) f.onkeydown = e => { if (e.key === "Enter") fin(f.value); };
  });
}
function confirmBox(msg, ok = "Löschen") {
  return new Promise(res => { const { el, close } = modal(`<h3>${esc(msg)}</h3><div class="row end"><button class="btn ghost" data-c>Abbrechen</button><button class="btn danger" data-o>${ok}</button></div>`); let d = false; const fin = v => { if (d) return; d = true; close(); res(v); }; $("[data-c]", el).onclick = () => fin(false); $("[data-o]", el).onclick = () => fin(true); $(".x", el).onclick = () => fin(false); });
}
function menu(anchor, items) {
  $$(".popmenu").forEach(e => e.remove());
  const r = anchor.getBoundingClientRect(), m = document.createElement("div"); m.className = "popmenu";
  m.innerHTML = items.filter(Boolean).map((it, i) => it === "-" ? "<hr>" : `<button data-i="${i}" class="${it.danger ? "danger" : ""}">${it.icon ? ic(it.icon) : ""}${esc(it.label)}</button>`).join("");
  document.body.appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + "px";
  m.style.top = (r.bottom + h + 12 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
  const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener("mousedown", off, true); } };
  setTimeout(() => document.addEventListener("mousedown", off, true), 0);
  const list = items.filter(Boolean);
  $$("button", m).forEach(b => b.onclick = () => { m.remove(); document.removeEventListener("mousedown", off, true); list[+b.dataset.i].fn?.(); });
}

/* ---------- storage ---------- */
const KV = {
  db: null, tried: false,
  async open() {
    if (this.db || this.tried) return this.db; this.tried = true;
    try { this.db = await new Promise((res, rej) => { const r = indexedDB.open("lumi", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch { this.db = null; }
    return this.db;
  },
  async get(k) {
    const db = await this.open();
    if (!db) { try { return JSON.parse(localStorage.getItem("lumi:" + k)); } catch { return undefined; } }
    return new Promise(res => { const r = db.transaction("kv").objectStore("kv").get(k); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); });
  },
  async set(k, v) {
    const db = await this.open();
    if (!db) { try { localStorage.setItem("lumi:" + k, JSON.stringify(v)); } catch { toast("Speicher voll oder gesperrt"); } return; }
    return new Promise(res => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => res(); t.onerror = () => { toast("Speichern fehlgeschlagen"); res(); }; });
  },
  async del(k) {
    const db = await this.open(); if (!db) { try { localStorage.removeItem("lumi:" + k); } catch {} return; }
    return new Promise(res => { const t = db.transaction("kv", "readwrite"); t.objectStore("kv").delete(k); t.oncomplete = () => res(); t.onerror = () => res(); });
  },
};
const DEFAULT = () => ({ v: 1, profile: { name: "", level: "school", scale: "de", apiKey: "", model: "claude-sonnet-5-5", onboarded: false }, subjects: [], folders: [], docs: [], tasks: [], tt: [], decks: [], grades: [], stats: { days: {}, reviews: {} }, chat: [], quizzes: [] });
let D = DEFAULT();
let _st;
function save() { clearTimeout(_st); _st = setTimeout(() => KV.set("data", D), 250); }
async function loadData() {
  const d = (await KV.get("data")) || {}; const base = DEFAULT();
  D = Object.assign(base, d); D.profile = Object.assign(base.profile, d.profile || {}); D.stats = Object.assign(base.stats, d.stats || {});
}
addEventListener("pagehide", () => KV.set("data", D));
const blobToDataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
const subj = id => D.subjects.find(s => s.id === id);
const subjDot = id => { const s = subj(id); return s ? `<span class="sdot" style="background:${s.color}"></span>` : ""; };
const isUni = () => D.profile.level === "uni";
const SUBJ = () => isUni() ? "Module" : "Fächer";

/* ---------- AI ---------- */
const hasKey = () => !!D.profile.apiKey;
function sysBase(extra = "") {
  const p = D.profile;
  return `You are Lumi, a friendly, precise study assistant for a ${p.level === "uni" ? "university student" : "school student"}${p.name ? ` called ${p.name}` : ""}. Reply in German unless the user writes in another language. Be accurate and concise. For homework, guide with hints and steps first; give the final answer only if asked. Use plain text; simple "-" lists are fine, no markdown tables or headings with #.${extra ? "\n" + extra : ""}`;
}
async function ai(prompt, { system = "", history = [], max = 1500, image = null, quiet = false } = {}) {
  if (!hasKey()) { if (!quiet) toast("KI braucht einen API-Key (Einstellungen). Lokale Hilfe wird verwendet."); return null; }
  const content = image ? [{ type: "image", source: { type: "base64", media_type: image.type || "image/jpeg", data: image.data } }, { type: "text", text: prompt }] : prompt;
  const messages = [...history.map(m => ({ role: m.role, content: m.text })), { role: "user", content }];
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": D.profile.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: D.profile.model, max_tokens: max, system: system || sysBase(), messages }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    return j.content.map(c => c.text || "").join("");
  } catch (e) { toast("KI-Fehler: " + e.message); return null; }
}
function parseJSON(t) { if (!t) return null; try { const a = t.search(/[\[{]/); const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]")); return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }

/* ---------- local (offline) study helpers ---------- */
const sentences = t => t.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9„"])/).map(s => s.trim()).filter(s => s.length > 20);
function localSummary(text, n = 5) {
  const ss = sentences(text); if (!ss.length) return text.slice(0, 300);
  const f = {}; text.toLowerCase().match(/[a-zäöüß]{4,}/g)?.forEach(w => f[w] = (f[w] || 0) + 1);
  const sc = ss.map((s, i) => [s, i, (s.toLowerCase().match(/[a-zäöüß]{4,}/g) || []).reduce((a, w) => a + (f[w] || 0), 0) / Math.sqrt(s.length)]);
  return sc.sort((a, b) => b[2] - a[2]).slice(0, n).sort((a, b) => a[1] - b[1]).map(x => "- " + x[0]).join("\n");
}
function localCards(text) {
  const out = [];
  text.split(/\n+/).forEach(l => { l = l.trim().replace(/^[-•*\d.)\s]+/, ""); const m = l.match(/^(.{2,60}?)\s*(?::|–|—| - )\s+(.{6,})$/); if (m) out.push({ q: m[1].trim(), a: m[2].trim() }); });
  sentences(text).forEach(s => { const m = s.match(/^(.{3,50}?)\s+(ist|sind|bezeichnet|beschreibt|bedeutet)\s+(.{10,})$/i); if (m && !out.find(o => o.q === m[1])) out.push({ q: `Was ${/sind/i.test(m[2]) ? "sind" : "ist"} ${m[1]}?`, a: m[3].replace(/\.$/, "") }); });
  return out.slice(0, 20);
}
function localQuiz(text, n = 6) {
  const words = [...new Set(text.match(/[A-Za-zÄÖÜäöüß]{6,}/g) || [])];
  const qs = shuffle(sentences(text).filter(s => s.length > 40 && s.length < 180)).slice(0, n).map(s => {
    const ws = s.match(/[A-Za-zÄÖÜäöüß]{6,}/g); if (!ws) return null; const w = ws.sort((a, b) => b.length - a.length)[0];
    const dis = shuffle(words.filter(x => x.toLowerCase() !== w.toLowerCase())).slice(0, 2); if (dis.length < 2) return null;
    const o = shuffle([w, ...dis]); return { q: s.replace(w, "_____"), o, a: o.indexOf(w), e: s };
  }).filter(Boolean);
  return qs;
}
const htmlToText = h => { const d = document.createElement("div"); d.innerHTML = h.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n$&").replace(/<br\s*\/?>/gi, "\n"); return d.textContent.replace(/\n{3,}/g, "\n\n").trim(); };

async function loadScript(src) { return new Promise((res, rej) => { if ($(`script[src="${src}"]`)) return res(); const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
async function docText(d) {
  if (d.text) return d.text;
  let t = "";
  if (d.type === "note") { const h = await KV.get("html:" + d.id); t = htmlToText(h || ""); }
  else if (d.type === "file") {
    const b = await KV.get("blob:" + d.id); if (!b) return "";
    try {
      if (/^text\//.test(d.mime) || /\.(txt|md|csv|json)$/i.test(d.title)) t = await b.text();
      else if (d.mime === "application/pdf" || /\.pdf$/i.test(d.title)) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        const pdf = await pdfjsLib.getDocument({ data: await b.arrayBuffer() }).promise;
        for (let i = 1; i <= Math.min(pdf.numPages, 40); i++) { const c = await (await pdf.getPage(i)).getTextContent(); t += c.items.map(x => x.str).join(" ") + "\n\n"; }
      }
    } catch (e) { toast("Text konnte nicht gelesen werden"); }
  }
  d.text = t.slice(0, 60000); save(); return d.text;
}
