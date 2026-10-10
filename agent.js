"use strict";
/* Lumi agent – the chat can run app functions. The model appends a <lumi-actions>[…]</lumi-actions> block; the app parses and executes it. */

const AGENT_RULES = `Du bist auch ein Assistent, der die App bedienen kann. Wenn der Nutzer etwas erstellen, ändern oder eintragen will, führe es aus: schreibe zuerst EINEN kurzen Satz auf Deutsch, was du tust, und hänge ans Ende genau einen Block mit JSON an:
<lumi-actions>[{"action":"...", ...}]</lumi-actions>
Verfügbare Aktionen (Felder in Klammern sind optional):
- create_note {title, content, (folder), (subject)} – neue Notiz; content ist Text, "- " für Listen, Leerzeile für Absätze; folder z. B. "Mathe" oder "Mathe/Analysis"
- append_to_note {doc, content} – Text an eine Notiz anhängen
- rename_doc {doc, title} – Dokument umbenennen
- move_doc {doc, folder} – Dokument in Ordner verschieben ("" = Home)
- create_folder {name, (parent)} – neuen Ordner erstellen
- create_database {title, (template:"plan"|"exams"|"read"|"blank"), (columns:[{name, type:"text"|"num"|"date"|"select"|"check", (options:[...])}]), (rows:[{"Spaltenname":"Wert"}]), (folder)} – Datenbank (Tabelle/Board/Kalender) anlegen
- create_cards {deck, cards:[{q,a}], (subject)} – Karteikarten in einem Stapel (wird bei Bedarf erstellt)
- add_task {title, type:"task"|"hw"|"exam", due:"JJJJ-MM-TT", (subject), (note)} – Aufgabe, Hausaufgabe oder Prüfung/Test eintragen
- complete_task {task} – Aufgabe als erledigt markieren
- add_grade {subject, title, value, (weight)} – Note eintragen
- delete_doc {doc} – Dokument löschen (der Nutzer muss bestätigen)
- open {view:"today"|"docs"|"cards"|"quiz"|"planner"|"grades"|"focus"|"settings"|"search"} oder {doc} – Bereich oder Dokument öffnen
"doc", "task", "deck" und "subject" gibst du mit der ID oder dem Titel aus der Liste unten an. Rechne relative Datumsangaben („nächsten Freitag“) anhand von „Heute“ in ein echtes Datum um. Erfinde keine Dokumente, die nicht in der Liste stehen. Neu erstellte Notizen, Datenbanken und Kartenstapel öffnet die App automatisch. Schreibe Notizen vollständig und gut strukturiert (kurze Absätze, Listen mit "- ", Überschriften als eigene kurze Zeile). "Aktuell geöffnet" in der Liste ist das Dokument, auf das sich „dieses Dokument“ bezieht. Wenn nur eine Frage gestellt wird, antworte normal ohne Block. Frage kurz nach, wenn eine wichtige Angabe fehlt (z. B. das Datum einer Prüfung).`;

function agentContext() {
  const path = f => folderPath(f).map(x => x.name).join("/");
  const L = (t, a) => a.length ? `${t}:\n${a.join("\n")}\n` : "";
  const cur = (location.hash.match(/#\/app\/doc\/([^/]+)/) || [])[1], cd = cur && D.docs.find(x => x.id === cur);
  return (cd ? `Aktuell geöffnet: [${cd.id}] ${cd.title}\n` : "") + `Heute: ${iso()} (${new Date().toLocaleDateString("de-DE", { weekday: "long" })})\n` +
    L("Fächer", D.subjects.map(s => `- ${s.name}`)) +
    L("Ordner", D.folders.slice(0, 60).map(f => `- ${path(f.id)}`)) +
    L("Dokumente", [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 50).map(d => `- [${d.id}] ${d.title}${d.folderId ? " (" + path(d.folderId) + ")" : ""}`)) +
    L("Kartenstapel", D.decks.slice(0, 30).map(k => `- [${k.id}] ${k.title} (${k.cards.length} Karten)`)) +
    L("Offene Aufgaben", D.tasks.filter(t => !t.done).slice(0, 30).map(t => `- [${t.id}] ${t.title}${t.type === "exam" ? " (Prüfung)" : ""}${t.due ? " bis " + t.due : ""}`));
}

const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
function pick(list, key, ref, title = x => x.title) { ref = norm(ref); if (!ref) return null; return list.find(x => x.id === ref || norm(x[key]) === ref) || list.find(x => norm(title(x)) === ref) || list.find(x => norm(title(x)).includes(ref)) || list.find(x => ref.includes(norm(title(x))) && norm(title(x)).length > 3) || null; }
const findDoc = r => pick(D.docs, "id", r), findSubject = r => { r = norm(r); return r ? D.subjects.find(s => norm(s.name) === r) || D.subjects.find(s => norm(s.name).includes(r) || r.includes(norm(s.name))) || null : null; };
function ensureFolderPath(p) {
  const parts = String(p || "").split("/").map(x => x.trim()).filter(Boolean); let parent = "";
  for (const name of parts) {
    let f = D.folders.find(x => norm(x.name) === norm(name) && (x.parent || "") === parent);
    if (!f) { const sub = !parent && findSubject(name); f = { id: uid(), name, parent, color: sub?.color || COLORS[D.folders.length % COLORS.length], subjectId: sub?.id || "" }; D.folders.push(f); }
    parent = f.id;
  }
  return parent;
}

const ACTIONS = {
  async create_note(a) { const fid = ensureFolderPath(a.folder), sid = findSubject(a.subject)?.id || subjectOfFolder(fid), html = textToHtml(String(a.content || "")), id = uid(); D.docs.unshift({ id, type: "note", title: String(a.title || "Neue Notiz").slice(0, 120), subjectId: sid || "", folderId: fid, paper: D.profile.paper || "white", updated: Date.now(), created: Date.now(), text: htmlToText(html) }); await KV.set("html:" + id, html); window.__aiReveal = id; return { label: `Notiz „${D.docs[0].title}“ erstellt`, go: "doc/" + id, open: true }; },
  async append_to_note(a) { const d = findDoc(a.doc); if (!d || d.type !== "note") throw "Notiz nicht gefunden"; const h = ((await KV.get("html:" + d.id)) || "") + textToHtml(String(a.content || "")); await KV.set("html:" + d.id, h); d.text = htmlToText(h); d.updated = Date.now(); return { label: `Text zu „${d.title}“ hinzugefügt`, go: "doc/" + d.id }; },
  async rename_doc(a) { const d = findDoc(a.doc); if (!d || !String(a.title || "").trim()) throw "Dokument nicht gefunden"; const old = d.title; d.title = String(a.title).trim().slice(0, 120); d.updated = Date.now(); return { label: `„${old}“ umbenannt in „${d.title}“`, go: "doc/" + d.id }; },
  async move_doc(a) { const d = findDoc(a.doc); if (!d) throw "Dokument nicht gefunden"; d.folderId = ensureFolderPath(a.folder); d.subjectId = subjectOfFolder(d.folderId) || d.subjectId; d.updated = Date.now(); return { label: `„${d.title}“ verschoben nach ${["Home", ...folderPath(d.folderId).map(f => f.name)].join(" / ")}`, go: "docs/" + d.folderId }; },
  async create_folder(a) { const fid = ensureFolderPath((a.parent ? a.parent + "/" : "") + (a.name || "")); if (!fid) throw "Kein Name"; return { label: `Ordner „${D.folders.find(f => f.id === fid).name}“ erstellt`, go: "docs/" + fid }; },
  async create_cards(a) {
    const cards = (a.cards || []).filter(c => c && c.q && c.a); if (!cards.length) throw "Keine Karten";
    let k = pick(D.decks, "id", a.deck); if (!k) { k = { id: uid(), title: String(a.deck || "Neuer Stapel").slice(0, 80), subjectId: findSubject(a.subject)?.id || "", cards: [] }; D.decks.unshift(k); }
    cards.forEach(c => k.cards.push({ id: uid(), q: String(c.q), a: String(c.a), box: 0, due: iso() })); return { label: `${cards.length} Karten in „${k.title}“`, go: "cards/" + k.id, open: true };
  },
  async create_database(a) {
    const kinds = ["plan", "exams", "read", "blank"], tpl = DB_TPL[kinds.includes(a.template) ? a.template : "blank"](), fid = ensureFolderPath(a.folder), id = uid();
    if (Array.isArray(a.columns) && a.columns.length) tpl.cols = a.columns.slice(0, 10).map((c, i) => ({ id: "c" + (i + 1), name: String(c.name || "Spalte " + (i + 1)).slice(0, 40), type: ["text", "num", "date", "select", "check"].includes(c.type) ? c.type : "text", ...(c.type === "select" ? { opts: (c.options || []).map((n, j) => ({ n: String(n), c: j % 8 })) } : {}) }));
    if (tpl.view === "board" && !tpl.cols.some(c => c.id === tpl.group && c.type === "select")) { tpl.view = "table"; delete tpl.group; }
    if (Array.isArray(a.rows)) tpl.rows = a.rows.slice(0, 40).map(r => ({ id: uid(), v: Object.fromEntries(tpl.cols.map(c => { let x = r?.[c.name]; if (x === undefined || x === null) return [c.id, undefined]; if (c.type === "select") { x = String(x); c.opts ||= []; if (!c.opts.some(o => o.n === x)) c.opts.push({ n: x, c: c.opts.length % 8 }); } else if (c.type === "num") x = +x || 0; else if (c.type === "check") x = !!x; else x = String(x); return [c.id, x]; }).filter(e => e[1] !== undefined)) }));
    D.docs.unshift({ id, type: "db", title: String(a.title || "Neue Datenbank").slice(0, 100), subjectId: subjectOfFolder(fid) || "", folderId: fid, updated: Date.now(), created: Date.now(), text: "" }); await KV.set("db:" + id, tpl);
    window.__aiReveal = id; return { label: `Datenbank „${D.docs[0].title}“ erstellt`, go: "doc/" + id, open: true };
  },
  async add_task(a) { if (!String(a.title || "").trim()) throw "Kein Titel"; const due = /^\d{4}-\d{2}-\d{2}$/.test(a.due || "") ? a.due : ""; const t = { id: uid(), title: String(a.title).trim().slice(0, 140), type: ["task", "hw", "exam"].includes(a.type) ? a.type : "task", due, subjectId: findSubject(a.subject)?.id || "", note: String(a.note || "").slice(0, 500), done: false, source: "ki" }; D.tasks.push(t); return { label: `${t.type === "exam" ? "Prüfung" : "Aufgabe"} „${t.title}“${due ? " am " + fmtD(due) : ""} eingetragen`, go: "planner" }; },
  async complete_task(a) { const t = pick(D.tasks.filter(x => !x.done), "id", a.task); if (!t) throw "Aufgabe nicht gefunden"; t.done = true; t.doneAt = Date.now(); return { label: `„${t.title}“ erledigt`, go: "planner" }; },
  async add_grade(a) { const s = findSubject(a.subject), v = parseFloat(String(a.value).replace(",", ".")); if (isNaN(v)) throw "Ungültige Note"; D.grades.push({ id: uid(), subjectId: s?.id || "", title: String(a.title || "Note").slice(0, 80), value: v, weight: parseFloat(a.weight) || 1, date: iso() }); return { label: `Note ${v}${s ? " in " + s.name : ""} eingetragen`, go: "grades" }; },
  async delete_doc(a) { const d = findDoc(a.doc); if (!d) throw "Dokument nicht gefunden"; if (!(await confirmBox(`„${d.title}“ wirklich löschen?`, "Löschen"))) return { label: "Löschen abgebrochen" }; await deleteDoc(d); return { label: `„${d.title}“ gelöscht` }; },
  async open(a) { if (a.doc) { const d = findDoc(a.doc); if (!d) throw "Dokument nicht gefunden"; return { label: `„${d.title}“ öffnen`, go: (d.type === "draw" ? "draw/" : "doc/") + d.id }; } const v = String(a.view || ""); if (!V[v]) throw "Bereich unbekannt"; return { label: "Öffnen: " + (NAVS.find(n => n[0] === v)?.[1] || v), go: v }; },
};

/* returns {text, acts} – text without the action block; acts = [{label, go?, err?}] */
async function runAgent(reply) {
  const m = String(reply || "").match(/<lumi-actions>([\s\S]*?)<\/lumi-actions>/i);
  const text = String(reply || "").replace(/<lumi-actions>[\s\S]*?(<\/lumi-actions>|$)/i, "").trim();
  if (!m) return { text, acts: [] };
  let list; try { list = JSON.parse(m[1].trim().replace(/^```(json)?|```$/g, "")); } catch { return { text: text + "\n\n(Die Aktion konnte nicht gelesen werden.)", acts: [] }; }
  const acts = [];
  for (const a of (Array.isArray(list) ? list : [list]).slice(0, 12)) {
    try { const fn = ACTIONS[a?.action]; if (!fn) throw "Unbekannte Aktion"; acts.push(await fn(a)); }
    catch (e) { acts.push({ label: String(e?.message || e), err: true }); }
  }
  save(); refreshNav();
  const op = [...acts].reverse().find(x => x.open && x.go);
  if (op) setTimeout(() => go(op.go), 700); else if (["docs", "planner", "cards", "grades"].includes(curView)) renderView();
  return { text: text || "Erledigt.", acts };
}


/* ---------- AI everywhere: command bar (Strg/Cmd + Umschalt + K, "Neu" menus, document bars) ---------- */
async function agentAsk(text) {
  const r = await ai(text, { system: sysBase(AGENT_RULES + "\n\nAktueller Stand der App:\n" + agentContext() + (typeof msContext === "function" && msContext() ? "\n" + msContext() : "")), max: 2000, quiet: true });
  if (!r) return null; return runAgent(r);
}
function openAiCommand(prefill = "") {
  document.getElementById("aicmd")?.remove();
  const el = document.createElement("div"); el.id = "aicmd";
  const SUG = ["Erstelle eine Notiz zur Zellatmung", "Erstelle einen Lernplan für die nächste Woche als Datenbank", "Trage morgen einen Vokabeltest ein", "Erstelle 10 Karteikarten zu diesem Dokument"];
  el.innerHTML = `<div class="aic-bg"></div><div class="aic-box" role="dialog" aria-label="Lumi AI"><form class="aic-in">${ic("spark")}<input id="aic-i" autocomplete="off" placeholder="Was soll Lumi AI für dich tun? z. B. „Erstelle eine Notiz zu …“" value="${esc(prefill)}"><button class="send" aria-label="Senden">${ic("up")}</button></form><div class="aic-sug">${SUG.map(x => `<button type="button">${esc(x)}</button>`).join("")}</div><div class="aic-out" hidden></div></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("on"));
  const close = () => { el.classList.remove("on"); setTimeout(() => el.remove(), 250); document.removeEventListener("keydown", kd); }, kd = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", kd); $(".aic-bg", el).onclick = close; const inp = $("#aic-i", el), out = $(".aic-out", el);
  setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 60);
  $$(".aic-sug button", el).forEach(b => b.onclick = () => { inp.value = b.textContent; $(".aic-in", el).requestSubmit(); });
  $(".aic-in", el).onsubmit = async e => {
    e.preventDefault(); const q = inp.value.trim(); if (!q) return;
    if (!hasKey()) { out.hidden = false; out.innerHTML = `<p class="note">Lumi AI ist noch nicht eingerichtet – siehe Einstellungen → Lumi AI.</p>`; return; }
    $(".aic-sug", el).hidden = true; out.hidden = false; out.innerHTML = `<div class="aic-think">${ic("spark")}<span>Lumi AI schreibt …</span></div>`;
    const r = await agentAsk(q);
    if (!r) { out.innerHTML = `<p class="note">Das hat leider nicht geklappt. Versuche es bitte noch einmal.</p>`; return; }
    out.innerHTML = `<p>${streamHtml(r.text)}</p>${r.acts.length ? `<div class="acts" style="--base:${Math.min(2600, r.text.split(/\s+/).length * 30 + 200)}ms">${r.acts.map(a => `<${a.go ? "button" : "span"} class="act ${a.err ? "err" : ""}" ${a.go ? `data-ag="${esc(a.go)}"` : ""}>${ic(a.err ? "x" : /^doc\//.test(a.go || "") ? "note" : "check")}<span>${esc(a.label)}</span></${a.go ? "button" : "span"}>`).join("")}</div>` : ""}`;
    $$("[data-ag]", out).forEach(b => b.onclick = () => { close(); go(b.dataset.ag); });
    if (r.acts.some(a => a.open)) setTimeout(close, 900);
  };
}
document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "k" && document.getElementById("app") && !document.getElementById("app").hidden) { e.preventDefault(); openAiCommand(); } });

/* word-by-word fade-in for AI text */
function streamHtml(text) {
  const parts = String(text || "").split(/(\s+)/); let n = 0; const total = parts.filter(p => p.trim()).length, step = Math.min(34, 2400 / Math.max(1, total));
  return parts.map(p => p.trim() ? `<span class="sw" style="animation-delay:${Math.round(n++ * step)}ms">${esc(p)}</span>` : esc(p).replace(/\n/g, "<br>")).join("");
}
function wordReveal(root, maxMs = 4800) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = []; let n; while ((n = w.nextNode())) if (n.nodeValue.trim() && !n.parentElement.closest("table,pre,input")) nodes.push(n);
  const total = nodes.reduce((a, t) => a + t.nodeValue.split(/\s+/).filter(Boolean).length, 0), step = Math.min(42, maxMs / Math.max(1, total)); let i = 0;
  nodes.forEach(t => { const f = document.createDocumentFragment(); t.nodeValue.split(/(\s+)/).forEach(p => { if (!p) return; if (!p.trim()) f.appendChild(document.createTextNode(p)); else { const sp = document.createElement("span"); sp.className = "sw"; sp.textContent = p; sp.style.animationDelay = Math.round(i++ * step) + "ms"; f.appendChild(sp); } }); t.replaceWith(f); });
  return Math.round(total * step) + 650;
}

/* ---------- Lumi AI Seitenleiste (in Dokumenten ausklappbar) ---------- */
let aiSideTools = null;
function aiSideDoc() { const m = location.hash.match(/#\/app\/doc\/([^/?]+)/); return m ? D.docs.find(d => d.id === m[1]) : null; }
function aiSide(open, trigger) {
  let el = document.getElementById("aiside");
  if (open === undefined) open = !(el && el.classList.contains("on"));
  if (!el) {
    el = document.createElement("aside"); el.id = "aiside"; el.setAttribute("aria-label", "Lumi AI");
    el.innerHTML = `<header><span class="as-l">${ic("spark")}<b>Lumi AI</b></span><span class="as-r"><button class="icon-btn" id="as-t" title="Werkzeuge" aria-label="Werkzeuge">${ic("more")}</button><button class="icon-btn" id="as-x" aria-label="Schließen">${ic("x")}</button></span></header><div class="as-chips" id="as-ch"></div><div class="chatbox flat" id="as-box"></div>`;
    document.body.appendChild(el);
    $("#as-x", el).onclick = () => aiSide(false);
    $("#as-t", el).onclick = e => { const b = aiSideTools; if (b && typeof b.onclick === "function") b.onclick.call(b, { currentTarget: e.currentTarget, target: e.currentTarget, stopPropagation() {}, preventDefault() {} }); };
    document.addEventListener("keydown", e => { if (e.key === "Escape" && el.classList.contains("on") && !document.querySelector(".mask,#aicmd")) aiSide(false); });
  }
  if (trigger) aiSideTools = trigger;
  $$("#ai-m,#aicb").forEach(b => b.classList.toggle("on", open));
  if (open) {
    const d = aiSideDoc(); chatCtx.clear(); if (d && d.type !== "draw" && d.type !== "db") chatCtx.add(d.id);
    mountChat($("#as-box", el), false);
    $("#as-t", el).hidden = !aiSideTools;
    const CH = d ? ["Zusammenfassen", "Einfach erklären", "Karteikarten erstellen", "Quiz dazu"] : ["Lernplan für heute", "Neue Notiz erstellen", "Was zuerst lernen?"];
    const ch = $("#as-ch", el); ch.innerHTML = CH.map(x => `<button type="button">${x}</button>`).join("");
    $$("button", ch).forEach(b => b.onclick = () => { const t = b.textContent, tin = $(".tin", el); tin.value = d ? `${t} – bezogen auf „${d.title}“.` : t; $(".t-in", el).requestSubmit(); });
    el.classList.add("on"); document.body.classList.add("aiside-open");
    setTimeout(() => $(".tin", el)?.focus(), 350);
  } else { el.classList.remove("on"); document.body.classList.remove("aiside-open"); }
}
/* Klick auf den AI-Knopf in Editoren/Dokumenten klappt die Seitenleiste aus (die alten Werkzeuge liegen hinter „…“) */
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("#ai-m,#aicb"); if (!b || !document.getElementById("app") || document.getElementById("app").hidden) return;
  e.stopPropagation(); e.preventDefault(); aiSide(undefined, b);
}, true);
addEventListener("hashchange", () => { if (!/^#\/app\/(doc|docs|draw|board)(\/|$)/.test(location.hash)) aiSide(false); });
