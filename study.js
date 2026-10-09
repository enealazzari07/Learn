"use strict";
/* Lumi study app – shell, dashboard, documents, note editor, file viewer, AI tools */

const V = {};            // view registry: V.name(main, ...args)
let docFilter = "";      // current subject filter
const COLORS = ["#5b3df5", "#ff6a3d", "#0e9f6e", "#2563eb", "#d6249f", "#f59e0b", "#0891b2", "#7c3aed", "#dc2626", "#475569"];
const PRESETS = {
  school: ["Mathe", "Deutsch", "Englisch", "Biologie", "Chemie", "Physik", "Geschichte", "Geografie", "Informatik", "Kunst", "Musik", "Sport", "Politik", "Französisch", "Latein", "Spanisch", "Religion/Ethik"],
  uni: ["Analysis", "Lineare Algebra", "Programmierung", "Statistik", "BWL", "VWL", "Recht", "Psychologie", "Medizin", "Chemie", "Physik", "Informatik", "Literatur", "Geschichte", "Seminar"],
};
const NAVS = [["today", "Heute", "home"], ["docs", "Dokumente", "folder"], ["board", "Zeichnen", "brush"], ["cards", "Karteikarten", "cards"], ["quiz", "Quiz", "help"], ["planner", "Planer", "cal"], ["grades", "Noten", "award"], ["focus", "Fokus", "timer"], ["ai", "KI-Tutor", "spark"], ["search", "Suche", "search"], ["settings", "Einstellungen", "gear"]];

/* ---------- stats ---------- */
const addMin = m => { const k = iso(); D.stats.days[k] = (D.stats.days[k] || 0) + m; save(); };
const addRev = n => { const k = iso(); D.stats.reviews[k] = (D.stats.reviews[k] || 0) + n; save(); };
const activity = k => (D.stats.days[k] || 0) + (D.stats.reviews[k] || 0);
function streak() { let n = 0; const d = new Date(); if (!activity(iso(d))) d.setDate(d.getDate() - 1); while (activity(iso(d)) > 0) { n++; d.setDate(d.getDate() - 1); } return n; }
const dueCardCount = () => D.decks.reduce((n, d) => n + d.cards.filter(c => c.due <= iso()).length, 0);

/* ---------- onboarding ---------- */
function onboarding() {
  let level = D.profile.level, picked = new Set();
  const { el, close } = modal(`<h2 style="font-size:28px;letter-spacing:-.03em">Willkommen bei Lumi 👋</h2><p class="note" style="margin:6px 0 18px">Richte deine Lern-App in 20 Sekunden ein. Alles bleibt auf deinem Gerät.</p>
  <label class="lbl">Wie heißt du?</label><input class="field" id="ob-n" placeholder="Dein Name" value="${esc(D.profile.name)}">
  <label class="lbl">Ich bin…</label><div class="seg" id="ob-l"><button data-l="school" class="on">Schüler:in</button><button data-l="uni">Student:in</button></div>
  <label class="lbl" id="ob-sl">Meine Fächer</label><div class="chips" id="ob-s"></div>
  <div class="row end" style="margin-top:22px"><button class="btn big accent" id="ob-go">Los geht's</button></div>`, "wide");
  const drawChips = () => { $("#ob-s", el).innerHTML = PRESETS[level].map(s => `<button class="chip ${picked.has(s) ? "on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join(""); $$("[data-s]", el).forEach(b => b.onclick = () => { picked.has(b.dataset.s) ? picked.delete(b.dataset.s) : picked.add(b.dataset.s); b.classList.toggle("on"); }); $("#ob-sl", el).textContent = level === "uni" ? "Meine Module" : "Meine Fächer"; };
  drawChips();
  $$("#ob-l button", el).forEach(b => b.onclick = () => { level = b.dataset.l; picked.clear(); $$("#ob-l button", el).forEach(x => x.classList.toggle("on", x === b)); drawChips(); });
  $("#ob-go", el).onclick = () => {
    D.profile.name = $("#ob-n", el).value.trim(); D.profile.level = level; D.profile.onboarded = true;
    [...picked].forEach((n, i) => D.subjects.push({ id: uid(), name: n, color: COLORS[i % COLORS.length] }));
    const wid = uid(); D.docs.unshift({ id: wid, type: "note", title: "Willkommen bei Lumi", subjectId: "", updated: Date.now(), created: Date.now(), text: "" });
    const w = `<h1>Willkommen bei Lumi 👋</h1><p>Das ist deine erste Notiz. Probiere die Werkzeuge oben aus:</p><ul class="chk"><li><input type="checkbox"> Text <b>fett</b>, <i>kursiv</i> oder <mark>markiert</mark> machen</li><li><input type="checkbox"> Eine Tabelle oder ein Bild einfügen</li><li><input type="checkbox"> Mit <b>KI</b> eine Zusammenfassung oder Karteikarten erstellen</li><li><input type="checkbox"> Im Bereich <b>Zeichnen</b> Skizzen und Formeln aufschreiben</li><li><input type="checkbox"> Im <b>Planer</b> Hausaufgaben und Prüfungen eintragen</li></ul><p>Tipp: Mit Strg/Cmd + K findest du alles blitzschnell.</p>`;
    KV.set("html:" + wid, w); D.docs[0].text = htmlToText(w);
    save(); close(); toast("Alles bereit!"); go("today"); buildShell(true);
  };
}

/* ---------- shell ---------- */
let curView = "today";
function go(path) { location.hash = "#/app/" + path; }
function buildShell(force) {
  const app = $("#app");
  if (!force && $(".shell", app)) { refreshNav(); return; }
  app.innerHTML = `<div class="shell"><aside class="side" id="side"></aside><main class="main" id="main"></main></div><div class="timer-pill" id="tpill" hidden></div><button class="tfab" id="tfab" aria-label="KI-Tutor">${ic("spark")}<span>KI</span></button><div class="chat-panel" id="cpanel" hidden></div><input type="file" id="upl" multiple hidden>`;
  $("#tfab").onclick = () => toggleChatPanel();
  $("#upl").onchange = e => { uploadFiles([...e.target.files]); e.target.value = ""; };
  app.addEventListener("dragover", e => { e.preventDefault(); });
  app.addEventListener("drop", e => { if (e.dataTransfer?.files?.length && !e.target.closest("#boardwrap")) { e.preventDefault(); uploadFiles([...e.dataTransfer.files]); } });
  refreshNav();
}
function refreshNav() {
  const s = $("#side"); if (!s) return;
  const mob = [["today", "Heute", "home"], ["docs", "Dokumente", "folder"], ["cards", "Karten", "cards"], ["planner", "Planer", "cal"]];
  s.innerHTML = `<div class="org"><i>${ic("spark")}</i>Lumi<span class="lvl">${isUni() ? "Studium" : "Schule"}</span></div>
  <button class="btn-new" id="newbtn">${ic("plus")}Neu</button>
  <div class="nav-grp">${NAVS.map(([k, l, i]) => `<button class="nav-i ${curView === k || (k === "docs" && ["doc"].includes(curView)) || (k === "board" && curView === "draw") || (k === "quiz" && curView === "quizrun") || (k === "cards" && ["deck", "study"].includes(curView)) ? "on" : ""} ${["board", "quiz", "grades", "focus", "search", "settings"].includes(k) ? "hide-mob" : ""}" data-go="${k}">${ic(i)}<span>${l}</span>${k === "cards" && dueCardCount() ? `<b class="badge">${dueCardCount()}</b>` : ""}</button>`).join("")}
  <button class="nav-i mob-only" id="morebtn">${ic("more")}<span>Mehr</span></button></div>
  <div class="sp hide-mob"></div><div class="side-h hide-mob"><span>${SUBJ()}</span><button id="addsubj" aria-label="Neu">${ic("plus")}</button></div>
  <div class="subjlist hide-mob">${D.subjects.map(x => `<button class="space ${docFilter === x.id && curView === "docs" ? "on" : ""}" data-sub="${x.id}"><i style="background:${x.color}"></i><span>${esc(x.name)}</span><b>${D.docs.filter(d => d.subjectId === x.id).length || ""}</b></button>`).join("") || `<p class="note" style="padding:6px 10px">Noch keine ${SUBJ()}.</p>`}</div>`;
  $$("[data-go]", s).forEach(b => b.onclick = () => { if (b.dataset.go === "docs") docFilter = ""; go(b.dataset.go); });
  $$("[data-sub]", s).forEach(b => b.onclick = () => { docFilter = b.dataset.sub; go("docs"); });
  $("#newbtn", s).onclick = e => newMenu(e.currentTarget);
  $("#addsubj", s) && ($("#addsubj", s).onclick = newSubject);
  $("#morebtn", s).onclick = e => menu(e.currentTarget, NAVS.filter(n => !mob.find(m => m[0] === n[0])).map(([k, l, i]) => ({ label: l, icon: i, fn: () => go(k) })));
}
function newMenu(anchor) {
  menu(anchor, [
    { label: "Neue Notiz", icon: "note", fn: () => newNote() }, { label: "Neue Zeichnung", icon: "brush", fn: () => go("draw/new") },
    { label: "Datei hochladen", icon: "upload", fn: () => $("#upl").click() }, "-",
    { label: "Karteikarten-Stapel", icon: "cards", fn: () => newDeck() }, { label: "Aufgabe / Prüfung", icon: "todo", fn: () => taskModal() },
    { label: isUni() ? "Neues Modul" : "Neues Fach", icon: "folder", fn: newSubject },
  ]);
}
async function newSubject() {
  const n = await ask(isUni() ? "Neues Modul" : "Neues Fach", { placeholder: "z. B. Biologie", ok: "Hinzufügen" }); if (!n || !n.trim()) return;
  D.subjects.push({ id: uid(), name: n.trim(), color: COLORS[D.subjects.length % COLORS.length] }); save(); refreshNav(); renderView();
}
function subjectSelect(id = "", cls = "") { return `<select class="field slim ${cls}">${`<option value="">Kein ${isUni() ? "Modul" : "Fach"}</option>`}${D.subjects.map(s => `<option value="${s.id}" ${s.id === id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`; }

/* ---------- documents CRUD ---------- */
async function newNote(subjectId = docFilter, html = "", title = "Unbenannte Notiz") {
  const id = uid(); D.docs.unshift({ id, type: "note", title, subjectId, updated: Date.now(), created: Date.now(), text: htmlToText(html) });
  await KV.set("html:" + id, html || ""); save(); go("doc/" + id);
}
async function thumbOf(file) {
  try { const bmp = await createImageBitmap(file); const s = 360 / Math.max(bmp.width, bmp.height, 360), c = document.createElement("canvas"); c.width = Math.round(bmp.width * Math.min(1, s)); c.height = Math.round(bmp.height * Math.min(1, s)); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .7); } catch { return ""; }
}
async function uploadFiles(files) {
  let n = 0;
  for (const f of files) {
    if (f.size > 60 * 1024 * 1024) { toast(f.name + " ist größer als 60 MB"); continue; }
    const id = uid(); await KV.set("blob:" + id, f);
    D.docs.unshift({ id, type: "file", title: f.name, mime: f.type, size: f.size, subjectId: docFilter, updated: Date.now(), created: Date.now(), thumb: /^image\//.test(f.type) ? await thumbOf(f) : "" }); n++;
  }
  save(); if (n) { toast(n + (n > 1 ? " Dateien" : " Datei") + " hochgeladen"); if (curView === "docs") renderView(); refreshNav(); }
}
async function deleteDoc(d) {
  if (!(await confirmBox(`„${d.title}“ wirklich löschen?`))) return;
  D.docs = D.docs.filter(x => x.id !== d.id); ["html:", "blob:", "draw:"].forEach(p => KV.del(p + d.id)); save(); toast("Gelöscht"); refreshNav();
}
const fileIcon = d => { const e = (d.title.split(".").pop() || "").toLowerCase(); return /pdf/.test(e) ? ["PDF", "#e5484d"] : /docx?/.test(e) ? ["DOC", "#2563eb"] : /pptx?/.test(e) ? ["PPT", "#f97316"] : /xlsx?|csv/.test(e) ? ["XLS", "#16a34a"] : /txt|md/.test(e) ? ["TXT", "#64748b"] : [e.slice(0, 4).toUpperCase() || "FILE", "#64748b"]; };
function docCard(d) {
  const s = subj(d.subjectId);
  let thumb;
  if (d.type === "note") thumb = `<div class="th note-th">${esc((d.text || "").slice(0, 150)) || "<i>Leer</i>"}</div>`;
  else if (d.type === "draw") thumb = `<div class="th" style="background:#fff center/contain no-repeat url(${d.thumb || ""})"></div>`;
  else if (d.thumb) thumb = `<div class="th" style="background:#f3f3f5 center/cover url(${d.thumb})"></div>`;
  else { const [l, c] = fileIcon(d); thumb = `<div class="th file-th"><b style="background:${c}">${esc(l)}</b></div>`; }
  return `<div class="doc" data-d="${d.id}">${thumb}<div class="dm"><div class="dt">${d.pinned ? "📌 " : ""}${esc(d.title)}</div><div class="ds">${s ? `<span class="sdot" style="background:${s.color}"></span>${esc(s.name)} · ` : ""}${fmtAgo(d.updated)}</div></div><button class="dmore" data-m="${d.id}" aria-label="Mehr">${ic("more")}</button></div>`;
}
function docMenu(btn, d) {
  menu(btn, [
    { label: "Öffnen", icon: "file", fn: () => openDoc(d) },
    { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Umbenennen", { value: d.title }); if (n?.trim()) { d.title = n.trim(); d.updated = Date.now(); save(); renderView(); } } },
    { label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); renderView(); } },
    ...D.subjects.length ? [{ label: "Fach zuordnen…", icon: "folder", fn: () => { const { el, close } = modal(`<h3>Fach zuordnen</h3><div class="chips">${[{ id: "", name: "Kein Fach", color: "#999" }, ...D.subjects].map(s => `<button class="chip" data-s="${s.id}"><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</button>`).join("")}</div>`); $$("[data-s]", el).forEach(b => b.onclick = () => { d.subjectId = b.dataset.s; save(); close(); renderView(); refreshNav(); }); } }] : [],
    "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); renderView(); } },
  ]);
}
const openDoc = d => go((d.type === "draw" ? "draw/" : "doc/") + d.id);

/* ---------- views: today ---------- */
V.today = m => {
  const t = iso(), wd = (new Date().getDay() + 6) % 7, h = new Date().getHours();
  const lessons = D.tt.filter(e => e.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const open = D.tasks.filter(x => !x.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
  const exams = open.filter(x => x.type === "exam" && x.due && daysUntil(x.due) >= 0).slice(0, 3);
  const mins = D.stats.days[t] || 0, due = dueCardCount();
  const recent = [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 6);
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p><h1>${h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend"}${D.profile.name ? ", " + esc(D.profile.name.split(" ")[0]) : ""} 👋</h1></div>
  <button class="btn accent" id="plan">${ic("spark")}KI-Tagesplan</button></div>
  <div class="tiles"><div class="tile"><span class="ti" style="background:#fff0e6;color:#ff6a3d">${ic("flame")}</span><b>${streak()}</b><small>Tage Serie</small></div>
  <div class="tile"><span class="ti" style="background:#ece8ff;color:#5b3df5">${ic("timer")}</span><b>${mins}</b><small>Min. gelernt heute</small></div>
  <button class="tile" data-go="cards"><span class="ti" style="background:#e3f7ee;color:#0e9f6e">${ic("cards")}</span><b>${due}</b><small>Karten fällig</small></button>
  <button class="tile" data-go="planner"><span class="ti" style="background:#e5eeff;color:#2563eb">${ic("todo")}</span><b>${open.length}</b><small>Offene Aufgaben</small></button></div>
  <form class="askbar" id="askf">${ic("spark")}<input placeholder="Frag die KI etwas… z. B. „Erkläre mir die Photosynthese“" aria-label="KI fragen"><button class="send" aria-label="Senden">${ic("up")}</button></form>
  <div class="cols"><section class="panel"><h2>Heute im Stundenplan</h2>${lessons.length ? lessons.map(e => `<div class="li"><span class="tm">${e.start}<br><small>${e.end}</small></span><span class="sdot lg" style="background:${subj(e.subjectId)?.color || "#999"}"></span><b>${esc(e.title || subj(e.subjectId)?.name || "Stunde")}</b><small>${esc(e.room || "")}</small></div>`).join("") : `<p class="empty">Keine Stunden eingetragen.<br><button class="link" data-go="planner">Stundenplan anlegen</button></p>`}</section>
  <section class="panel"><h2>Als Nächstes fällig</h2>${open.slice(0, 5).map(x => `<label class="li task"><input type="checkbox" data-t="${x.id}"><span class="sdot lg" style="background:${subj(x.subjectId)?.color || "#999"}"></span><b>${x.type === "exam" ? "📝 " : ""}${esc(x.title)}</b><small class="${x.due && daysUntil(x.due) < 0 ? "red" : ""}">${x.due ? (daysUntil(x.due) === 0 ? "Heute" : daysUntil(x.due) === 1 ? "Morgen" : daysUntil(x.due) < 0 ? "Überfällig" : fmtD(x.due)) : ""}</small></label>`).join("") || `<p class="empty">Alles erledigt 🎉<br><button class="link" id="addt">Aufgabe hinzufügen</button></p>`}</section></div>
  ${exams.length ? `<section class="panel"><h2>Prüfungen</h2><div class="exams">${exams.map(x => `<div class="exam"><b>${daysUntil(x.due)}</b><small>${daysUntil(x.due) === 1 ? "Tag" : "Tage"}</small><span>${esc(x.title)}</span></div>`).join("")}</div></section>` : ""}
  <section><div class="sech"><h2>Zuletzt bearbeitet</h2><button class="link" data-go="docs">Alle Dokumente</button></div>${recent.length ? `<div class="docgrid">${recent.map(docCard).join("")}</div>` : `<p class="empty">Noch keine Dokumente.</p>`}</section>
  <section><h2>Schnellstart</h2><div class="quick">${[["note", "Neue Notiz", "n"], ["brush", "Zeichnen", "d"], ["upload", "Datei hochladen", "u"], ["cards", "Karteikarten", "c"], ["help", "Quiz starten", "q"], ["timer", "Fokus-Timer", "f"]].map(([i, l, k]) => `<button data-q="${k}">${ic(i)}<span>${l}</span></button>`).join("")}</div></section></div>`;
  bindCommon(m);
  $$("[data-q]", m).forEach(b => b.onclick = () => ({ n: () => newNote(), d: () => go("draw/new"), u: () => $("#upl").click(), c: () => go("cards"), q: () => go("quiz"), f: () => go("focus") }[b.dataset.q])());
  $("#askf", m).onsubmit = e => { e.preventDefault(); const v = e.target.querySelector("input").value.trim(); if (v) { chatPrefill = v; go("ai"); } };
  $$("[data-t]", m).forEach(c => c.onchange = () => { const x = D.tasks.find(y => y.id === c.dataset.t); x.done = true; x.doneAt = Date.now(); save(); toast("Erledigt ✔"); renderView(); });
  $("#addt", m) && ($("#addt", m).onclick = () => taskModal());
  $("#plan", m).onclick = async () => {
    const { el } = modal(`<h3>Dein Tagesplan</h3><div class="result" id="pr">Plane deinen Tag…</div>`);
    const ctx = `Heute ist ${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}. Stunden heute: ${lessons.map(e => `${e.start}-${e.end} ${e.title || subj(e.subjectId)?.name}`).join(", ") || "keine"}. Offene Aufgaben: ${open.slice(0, 10).map(x => `${x.title}${x.due ? " (fällig " + x.due + ")" : ""}${x.type === "exam" ? " [Prüfung]" : ""}`).join("; ") || "keine"}. Fällige Karteikarten: ${due}.`;
    const r = await ai(`Erstelle mir einen realistischen Lernplan für heute (Zeitblöcke, Pausen). ${ctx}`, { max: 700 });
    $("#pr", el).textContent = r || `Vorschlag (offline):\n- 15 Min.: ${due} fällige Karteikarten wiederholen\n${open.slice(0, 3).map((x, i) => `- ${25} Min.: ${x.title}`).join("\n") || "- 25 Min.: Notizen des Tages durchgehen"}\n- 5 Min. Pause nach jedem Block\n\n(Für einen persönlichen KI-Plan trage einen API-Key in den Einstellungen ein.)`;
  };
};
function bindCommon(m) {
  $$("[data-go]", m).forEach(b => b.onclick = () => go(b.dataset.go));
  $$("[data-d]", m).forEach(c => c.onclick = e => { if (e.target.closest(".dmore")) return; openDoc(D.docs.find(d => d.id === c.dataset.d)); });
  $$("[data-m]", m).forEach(b => b.onclick = e => { e.stopPropagation(); docMenu(b, D.docs.find(d => d.id === b.dataset.m)); });
}

/* ---------- views: documents ---------- */
let docSort = "recent", docQuery = "";
V.docs = m => {
  const s = subj(docFilter);
  let list = D.docs.filter(d => (!docFilter || d.subjectId === docFilter) && (!docQuery || (d.title + " " + (d.text || "")).toLowerCase().includes(docQuery.toLowerCase())));
  list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (docSort === "name" ? a.title.localeCompare(b.title) : b.updated - a.updated));
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">${s ? "in " + esc(s.name) : "Alle " + SUBJ()}</p><h1>Dokumente</h1></div><div class="row"><button class="btn ghost" id="up">${ic("upload")}Hochladen</button><button class="btn ghost" id="nd">${ic("brush")}Zeichnung</button><button class="btn accent" id="nn">${ic("plus")}Notiz</button></div></div>
  <div class="toolbar"><div class="searchbox">${ic("search")}<input id="dq" placeholder="Dokumente durchsuchen…" value="${esc(docQuery)}"></div><div class="chips scroll"><button class="chip ${!docFilter ? "on" : ""}" data-f="">Alle</button>${D.subjects.map(x => `<button class="chip ${docFilter === x.id ? "on" : ""}" data-f="${x.id}"><i class="sdot" style="background:${x.color}"></i>${esc(x.name)}</button>`).join("")}</div><select class="field slim" id="ds"><option value="recent" ${docSort === "recent" ? "selected" : ""}>Zuletzt</option><option value="name" ${docSort === "name" ? "selected" : ""}>Name</option></select></div>
  ${list.length ? `<div class="docgrid">${list.map(docCard).join("")}</div>` : `<div class="emptybox"><div class="big">📚</div><h3>Noch nichts hier</h3><p>Erstelle eine Notiz, zeichne eine Skizze oder ziehe PDFs, Bilder und Skripte hierher.</p><div class="row" style="justify-content:center"><button class="btn accent" id="nn2">Neue Notiz</button><button class="btn ghost" id="up2">Datei hochladen</button></div></div>`}<p class="note" style="margin-top:24px;text-align:center">Tipp: Dateien einfach per Drag & Drop auf diese Seite ziehen.</p></div>`;
  bindCommon(m);
  $("#up", m).onclick = () => $("#upl").click(); $("#up2", m) && ($("#up2", m).onclick = () => $("#upl").click());
  $("#nn", m).onclick = () => newNote(); $("#nn2", m) && ($("#nn2", m).onclick = () => newNote()); $("#nd", m).onclick = () => go("draw/new");
  $$("[data-f]", m).forEach(b => b.onclick = () => { docFilter = b.dataset.f; refreshNav(); V.docs(m); });
  $("#dq", m).oninput = debounce(e => { docQuery = e.target.value; const p = e.target.selectionStart; V.docs(m); const i = $("#dq", m); i.focus(); i.setSelectionRange(p, p); }, 200);
  $("#ds", m).onchange = e => { docSort = e.target.value; V.docs(m); };
};

/* ---------- AI tools (shared by note editor and file viewer) ---------- */
let pendingQuiz = null;
const clip = (t, n = 14000) => t.length > n ? t.slice(0, n) : t;
function textToHtml(t) {
  const lines = t.split("\n"); let out = "", inList = false;
  for (const l of lines) { const b = l.match(/^\s*[-•*]\s+(.*)/); if (b) { if (!inList) { out += "<ul>"; inList = true; } out += `<li>${esc(b[1])}</li>`; } else { if (inList) { out += "</ul>"; inList = false; } if (l.trim()) out += `<p>${esc(l)}</p>`; } }
  return out + (inList ? "</ul>" : "");
}
async function aiTool(kind, text, ctx = {}) {
  text = (text || "").trim();
  if (text.length < 20) { toast("Zu wenig Text – schreibe oder markiere zuerst etwas."); return; }
  const T = clip(text);
  if (kind === "cards" || kind === "quiz") {
    const n = await ask(kind === "cards" ? "Wie viele Karteikarten?" : "Wie viele Fragen?", { value: kind === "cards" ? "12" : "8", ok: "Erstellen" }); if (n === null) return;
    const cnt = Math.max(2, Math.min(30, parseInt(n) || 10));
    toast("KI arbeitet…");
    const r = await ai(kind === "cards" ? `Erstelle aus dem Text ${cnt} Karteikarten. Antworte NUR mit JSON: [{"q":"Frage","a":"Antwort"}]. Kurze, prüfungsrelevante Fragen, präzise Antworten.\nTEXT:\n${T}` : `Erstelle ${cnt} Multiple-Choice-Fragen (3-4 Optionen, genau eine richtig) zum Text. Antworte NUR mit JSON: [{"q":"","o":["",""],"a":0,"e":"kurze Erklärung"}] (a = Index der richtigen Option).\nTEXT:\n${T}`, { max: 3500, quiet: true });
    let data = parseJSON(r); if (!Array.isArray(data) || !data.length) data = null;
    if (!data) { data = kind === "cards" ? localCards(T) : localQuiz(T, cnt); if (data.length) toast(hasKey() ? "KI-Antwort unlesbar – lokale Erstellung" : "Offline-Erstellung (mit API-Key deutlich besser)"); else { toast("Daraus konnte nichts erstellt werden. API-Key hinterlegen?"); return; } }
    if (kind === "cards") return cardsModal(data.filter(c => c.q && c.a), ctx.title || "Karteikarten", ctx.subjectId);
    pendingQuiz = { title: ctx.title || "Quiz", qs: data.filter(q => q.q && Array.isArray(q.o) && q.o.length > 1), subjectId: ctx.subjectId }; return go("quizrun");
  }
  let lang = "";
  if (kind === "translate") { const l = await ask("Übersetzen in…", { value: "Englisch", ok: "Übersetzen" }); if (!l) return; lang = l; }
  let q = ""; if (kind === "ask") { q = await ask("Was möchtest du zum Text wissen?", { placeholder: "Deine Frage…", ok: "Fragen" }); if (!q) return; }
  const prompts = {
    summary: `Fasse den Text prägnant in 5–8 Stichpunkten ("- ") zusammen und hebe Schlüsselbegriffe hervor.\nTEXT:\n${T}`,
    explain: `Erkläre den folgenden Inhalt einfach und anschaulich, mit einem Beispiel, so dass ich ihn wirklich verstehe.\nTEXT:\n${T}`,
    improve: `Korrigiere Rechtschreibung und Grammatik und verbessere den Stil, ohne die Bedeutung zu ändern. Gib NUR den überarbeiteten Text zurück.\nTEXT:\n${T}`,
    continue: `Schreibe den Text sinnvoll in gleichem Stil weiter (ca. 120 Wörter). Gib NUR die Fortsetzung zurück.\nTEXT:\n${T}`,
    translate: `Übersetze den Text ins ${lang}. Gib NUR die Übersetzung zurück.\nTEXT:\n${T}`,
    ask: `Beantworte die Frage anhand des Textes: ${q}\nTEXT:\n${T}`,
  };
  const { el } = modal(`<h3>${{ summary: "Zusammenfassung", explain: "Einfach erklärt", improve: "Verbesserter Text", continue: "Fortsetzung", translate: "Übersetzung", ask: "Antwort" }[kind]}</h3><textarea class="field" id="ar" rows="12">KI arbeitet…</textarea><div class="row end" id="ab" hidden>${ctx.insert ? `<button class="btn ghost" id="a-ins">Unten einfügen</button>` : ""}${ctx.replace && kind !== "summary" && kind !== "ask" && kind !== "explain" ? `<button class="btn ghost" id="a-rep">Auswahl ersetzen</button>` : ""}<button class="btn ghost" id="a-note">Als Notiz speichern</button><button class="btn" id="a-cp">${ic("copy")}Kopieren</button></div>`, "wide");
  let r = await ai(prompts[kind], { max: 1800, quiet: true });
  if (r == null) { r = kind === "summary" ? localSummary(T) : null; if (!r) { $("#ar", el).value = hasKey() ? "Die KI hat nicht geantwortet. Versuche es erneut." : "Diese Funktion braucht einen API-Key.\n\nTrage ihn unter Einstellungen → KI ein (Anthropic). Zusammenfassungen, Karteikarten und Quiz funktionieren auch ohne Key mit einfacher lokaler Auswertung."; return; } }
  $("#ar", el).value = r.trim(); $("#ab", el).hidden = false;
  $("#a-cp", el).onclick = () => { navigator.clipboard?.writeText($("#ar", el).value); toast("Kopiert"); };
  $("#a-note", el).onclick = () => { newNote(ctx.subjectId || "", textToHtml($("#ar", el).value), (ctx.title || "Notiz") + " – KI"); el.closest(".mask").remove(); };
  $("#a-ins", el) && ($("#a-ins", el).onclick = () => { ctx.insert(textToHtml($("#ar", el).value)); el.closest(".mask").remove(); toast("Eingefügt"); });
  $("#a-rep", el) && ($("#a-rep", el).onclick = () => { ctx.replace($("#ar", el).value); el.closest(".mask").remove(); toast("Ersetzt"); });
}
function cardsModal(cards, title, subjectId) {
  if (!cards.length) return toast("Keine Karten erstellt");
  const { el, close } = modal(`<h3>${cards.length} Karteikarten</h3><div class="cardprev">${cards.map(c => `<div class="cp"><b>${esc(c.q)}</b><span>${esc(c.a)}</span></div>`).join("")}</div><label class="lbl">Speichern in Stapel</label><select class="field" id="dk"><option value="">+ Neuer Stapel „${esc(title)}“</option>${D.decks.map(d => `<option value="${d.id}">${esc(d.title)}</option>`).join("")}</select><div class="row end"><button class="btn ghost" data-c>Verwerfen</button><button class="btn accent" id="dks">Speichern & lernen</button></div>`, "wide");
  $("[data-c]", el).onclick = close;
  $("#dks", el).onclick = () => { let d = D.decks.find(x => x.id === $("#dk", el).value); if (!d) { d = { id: uid(), title, subjectId: subjectId || "", cards: [] }; D.decks.unshift(d); } cards.forEach(c => d.cards.push({ id: uid(), q: c.q, a: c.a, box: 0, due: iso() })); save(); close(); toast("Stapel gespeichert"); refreshNav(); go("study/" + d.id); };
}

/* ---------- note editor ---------- */
const SYMS = "α β γ δ ε θ λ μ π ρ σ τ φ ω Δ Σ Ω ∫ ∂ √ ∞ ≈ ≠ ≤ ≥ ± × ÷ · → ⇒ ⇔ ∈ ∉ ⊂ ∪ ∩ ∀ ∃ ∅ ℝ ℕ ℤ ℚ ° ² ³ ⁿ ½ ¼ ‰ € § ✓ ✗".split(" ");
V.doc = async (m, id) => {
  const d = D.docs.find(x => x.id === id); if (!d) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>Dokument nicht gefunden</h3><button class="btn" data-go="docs">Zu den Dokumenten</button></div></div>`; return bindCommon(m); }
  if (d.type === "draw") return go("draw/" + id);
  if (d.type === "file") return fileViewer(m, d);
  const html = (await KV.get("html:" + d.id)) || "";
  const TB = [{ i: "undo", c: "undo", t: "Rückgängig" }, { i: "redo", c: "redo", t: "Wiederholen" }, "|", { sel: 1 }, "|", { i: "bold", c: "bold", t: "Fett" }, { i: "italic", c: "italic", t: "Kursiv" }, { i: "underline", c: "underline", t: "Unterstrichen" }, { i: "strike", c: "strikeThrough", t: "Durchgestrichen" }, { i: "hl", c: "hilite", t: "Markieren" }, { color: 1 }, { x: "x₂", c: "subscript", t: "Tiefgestellt" }, { x: "x²", c: "superscript", t: "Hochgestellt" }, "|", { i: "list", c: "insertUnorderedList", t: "Liste" }, { i: "listnum", c: "insertOrderedList", t: "Nummerierte Liste" }, { i: "todo", c: "checklist", t: "Checkliste" }, { i: "quote", c: "quote", t: "Zitat" }, { i: "code", c: "code", t: "Code" }, { i: "hrule", c: "insertHorizontalRule", t: "Trennlinie" }, "|", { i: "alignl", c: "justifyLeft", t: "Linksbündig" }, { i: "alignc", c: "justifyCenter", t: "Zentriert" }, "|", { i: "link", c: "link", t: "Link" }, { i: "image", c: "image", t: "Bild" }, { i: "table", c: "table", t: "Tabelle" }, { x: "Ω", c: "formula", t: "Formeln & Symbole" }, { i: "rot", c: "removeFormat", t: "Formatierung entfernen" }];
  m.innerHTML = `<div class="editor"><div class="ed-head"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><input class="ed-title" id="et" value="${esc(d.title)}" aria-label="Titel">${subjectSelect(d.subjectId, "ed-sub")}<span class="saved" id="sv">Gespeichert</span>
  <button class="btn ghost" id="ai-m">${ic("spark")}KI</button><button class="btn ghost" id="ex-m">${ic("download")}<span class="hide-sm">Export</span></button><button class="icon-btn" id="del" aria-label="Löschen">${ic("trash")}</button></div>
  <div class="tb" id="tb">${TB.map(b => b === "|" ? `<i class="sep"></i>` : b.sel ? `<select id="blk" title="Textformat"><option value="p">Text</option><option value="h1">Überschrift 1</option><option value="h2">Überschrift 2</option><option value="h3">Überschrift 3</option></select>` : b.color ? `<label class="tbtn" title="Textfarbe"><b style="border-bottom:3px solid #5b3df5;line-height:1" id="cl">A</b><input type="color" id="cin" value="#5b3df5" hidden></label>` : `<button class="tbtn" data-c="${b.c}" title="${b.t}">${b.i ? ic(b.i) : `<b>${b.x}</b>`}</button>`).join("")}</div>
  <div class="paper"><div class="body" id="body" contenteditable="true" spellcheck="true" data-ph="Fang an zu schreiben… Mit der Werkzeugleiste formatierst du Text, mit „KI“ fasst du zusammen oder erstellst Karteikarten.">${html}</div></div><div class="ed-foot"><span id="wc"></span><input type="file" id="imgin" accept="image/*" hidden></div></div>`;
  const body = $("#body", m), svEl = $("#sv", m), titleIn = $("#et", m); let saved = null;
  const restore = () => { if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } body.focus(); };
  document.addEventListener("selectionchange", () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); }, { passive: true });
  const wcEl = $("#wc", m); const count = () => { const t = body.innerText.trim(), w = t ? t.split(/\s+/).length : 0; wcEl.textContent = `${w} Wörter · ${Math.max(1, Math.round(w / 200))} Min. Lesezeit`; };
  const doSave = debounce(async () => { if (!D.docs.includes(d)) return; d.title = titleIn.value.trim() || "Unbenannte Notiz"; d.updated = Date.now(); d.text = body.innerText.slice(0, 60000); await KV.set("html:" + d.id, body.innerHTML); save(); svEl.textContent = "Gespeichert"; }, 500);
  const dirty = () => { svEl.textContent = "Speichert…"; count(); doSave(); };
  body.addEventListener("input", dirty); $("#et", m).addEventListener("input", dirty); count();
  body.addEventListener("click", e => { if (e.target.matches('input[type=checkbox]')) { e.target.checked ? e.target.setAttribute("checked", "") : e.target.removeAttribute("checked"); dirty(); } });
  body.addEventListener("paste", async e => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); insertImage(f); } });
  async function insertImage(f) { const bmp = await createImageBitmap(f), s = Math.min(1, 1100 / bmp.width), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); restore(); document.execCommand("insertImage", false, c.toDataURL("image/jpeg", .8)); dirty(); }
  $("#imgin", m).onchange = e => { if (e.target.files[0]) insertImage(e.target.files[0]); e.target.value = ""; };
  const ex = (c, v) => { restore(); if (c === "insertHTML") { const sl = getSelection(); if (sl.rangeCount && !sl.isCollapsed) sl.collapseToEnd(); } document.execCommand(c, false, v); dirty(); };
  $$(".tbtn[data-c]", m).forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = async () => {
    const c = b.dataset.c;
    if (c === "hilite") { const cur = document.queryCommandValue("hiliteColor"); restore(); document.execCommand("hiliteColor", false, /255, 241, 168|#fff1a8/i.test(cur) ? "transparent" : "#fff1a8"); dirty(); }
    else if (c === "checklist") ex("insertHTML", '<ul class="chk"><li><input type="checkbox">&nbsp;</li></ul>');
    else if (c === "quote") ex("formatBlock", document.queryCommandValue("formatBlock") === "blockquote" ? "p" : "blockquote");
    else if (c === "code") ex("formatBlock", document.queryCommandValue("formatBlock") === "pre" ? "p" : "pre");
    else if (c === "link") { const u = await ask("Link-Adresse", { value: "https://", ok: "Einfügen" }); if (u) ex("createLink", u); }
    else if (c === "image") $("#imgin", m).click();
    else if (c === "table") ex("insertHTML", `<table><tbody>${"<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>".repeat(3)}</tbody></table><p><br></p>`);
    else if (c === "formula") { const { el, close } = modal(`<h3>Formeln & Symbole</h3><div class="syms">${SYMS.map(s => `<button>${s}</button>`).join("")}</div><p class="note">Tipp: „x²“ und „x₂“ in der Leiste setzen Exponenten und Indizes.</p>`); $$(".syms button", el).forEach(sb => sb.onclick = () => { restore(); document.execCommand("insertText", false, sb.textContent); dirty(); }); }
    else ex(c);
  }; });
  $("#blk", m).onchange = e => ex("formatBlock", e.target.value);
  $("#cin", m).oninput = e => { $("#cl", m).style.borderColor = e.target.value; ex("foreColor", e.target.value); };
  $("#cin", m).onclick = e => e.stopPropagation();
  $("#cl", m).parentElement.onclick = () => $("#cin", m).click();
  $(".ed-sub", m).onchange = e => { d.subjectId = e.target.value; save(); refreshNav(); };
  $("#eb", m).onclick = () => go("docs");
  $("#del", m).onclick = async () => { await deleteDoc(d); go("docs"); };
  const sel = () => (saved?.toString() || "").trim();
  const run = k => aiTool(k, sel() || body.innerText, { title: d.title, subjectId: d.subjectId, insert: h => { body.insertAdjacentHTML("beforeend", h); dirty(); }, replace: t => { restore(); document.execCommand("insertText", false, t); dirty(); } });
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Zusammenfassen", icon: "list", fn: () => run("summary") }, { label: "Einfach erklären", icon: "help", fn: () => run("explain") }, { label: "Verbessern & korrigieren", icon: "pen", fn: () => run("improve") }, { label: "Weiterschreiben", icon: "spark", fn: () => run("continue") }, { label: "Übersetzen…", icon: "rot", fn: () => run("translate") }, { label: "Frage zum Text…", icon: "search", fn: () => run("ask") }, "-", { label: "Karteikarten erstellen", icon: "cards", fn: () => run("cards") }, { label: "Quiz erstellen", icon: "help", fn: () => run("quiz") }]);
  const dl = (name, mime, data) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $("#ex-m", m).onclick = e => menu(e.currentTarget, [{ label: "Als PDF drucken / speichern", icon: "file", fn: () => { const w = open("", "_blank"); if (!w) return toast("Pop-up erlaubt?"); w.document.write(`<title>${esc(d.title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 20px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 10px}img{max-width:100%}pre{background:#f3f3f3;padding:12px;border-radius:8px}blockquote{border-left:4px solid #ccc;margin:0;padding-left:14px;color:#555}ul.chk{list-style:none;padding-left:4px}</style><h1>${esc(d.title)}</h1>${body.innerHTML}`); w.document.close(); setTimeout(() => w.print(), 400); } }, { label: "Textdatei (.txt)", icon: "note", fn: () => dl(d.title + ".txt", "text/plain", body.innerText) }, { label: "HTML-Datei", icon: "code", fn: () => dl(d.title + ".html", "text/html", `<meta charset="utf-8"><title>${esc(d.title)}</title>${body.innerHTML}`) }]);
  if (!html) body.focus();
};

/* ---------- file viewer ---------- */
async function fileViewer(m, d) {
  const blob = await KV.get("blob:" + d.id); const url = blob ? URL.createObjectURL(blob) : "";
  const isImg = /^image\//.test(d.mime), isPdf = d.mime === "application/pdf" || /\.pdf$/i.test(d.title), isTxt = /^text\//.test(d.mime) || /\.(txt|md|csv)$/i.test(d.title);
  m.innerHTML = `<div class="editor"><div class="ed-head"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><input class="ed-title" id="et" value="${esc(d.title)}">${subjectSelect(d.subjectId, "ed-sub")}<button class="btn ghost" id="ai-m">${ic("spark")}KI</button><a class="btn ghost" href="${url}" download="${esc(d.title)}">${ic("download")}<span class="hide-sm">Laden</span></a><button class="icon-btn" id="del" aria-label="Löschen">${ic("trash")}</button></div>
  <div class="viewer">${!blob ? `<p class="empty">Datei nicht gefunden.</p>` : isImg ? `<img src="${url}" alt="${esc(d.title)}">` : isPdf ? `<iframe src="${url}" title="${esc(d.title)}"></iframe>` : isTxt ? `<pre id="txtv">Lädt…</pre>` : `<div class="emptybox"><div class="big">📄</div><h3>${esc(d.title)}</h3><p>${(d.size / 1024).toFixed(0)} KB – für diesen Dateityp gibt es keine Vorschau. Lade die Datei herunter.</p></div>`}</div></div>`;
  if (isTxt && blob) blob.text().then(t => $("#txtv", m).textContent = t);
  $("#eb", m).onclick = () => go("docs"); $("#del", m).onclick = async () => { await deleteDoc(d); go("docs"); };
  $("#et", m).onchange = e => { d.title = e.target.value.trim() || d.title; d.updated = Date.now(); save(); };
  $(".ed-sub", m).onchange = e => { d.subjectId = e.target.value; save(); refreshNav(); };
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Zusammenfassen", icon: "list", fn: async () => aiTool("summary", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Einfach erklären", icon: "help", fn: async () => aiTool("explain", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Frage zum Dokument…", icon: "search", fn: async () => aiTool("ask", await docText(d), { title: d.title }) }, "-", { label: "Karteikarten erstellen", icon: "cards", fn: async () => aiTool("cards", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Quiz erstellen", icon: "help", fn: async () => aiTool("quiz", await docText(d), { title: d.title, subjectId: d.subjectId }) }, ...(isImg ? [{ label: "Bild von der KI erklären lassen", icon: "camera", fn: async () => { const r = await explainImage(blob); if (r) modal(`<h3>KI-Erklärung</h3><div class="result">${esc(r)}</div>`, "wide"); } }] : [])]);
}
async function blobToJpeg(b, max = 1400) { const bmp = await createImageBitmap(b), s = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .85).split(",")[1]; }
async function explainImage(b) { if (!hasKey()) { toast("Bild-Analyse braucht einen API-Key (Einstellungen)."); return null; } toast("KI schaut sich das Bild an…"); return ai("Beschreibe und erkläre, was auf dem Bild zu sehen ist (Aufgabe, Skizze, Tafelbild o. Ä.). Falls es eine Aufgabe ist, gib Hinweise zum Lösungsweg statt nur das Ergebnis.", { image: { data: await blobToJpeg(b), type: "image/jpeg" } }); }
