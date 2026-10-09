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
  const { el, close } = modal(`<h2 style="font-size:28px;letter-spacing:-.03em">Willkommen bei Lumi</h2><p class="note" style="margin:6px 0 18px">Richte deine Lern-App in 20 Sekunden ein. Alles bleibt auf deinem Gerät.</p>
  <label class="lbl">Wie heißt du?</label><input class="field" id="ob-n" placeholder="Dein Name" value="${esc(D.profile.name)}">
  <label class="lbl">Ich bin…</label><div class="seg" id="ob-l"><button data-l="school" class="on">Schüler:in</button><button data-l="uni">Student:in</button></div>
  <label class="lbl" id="ob-sl">Meine Fächer</label><div class="chips" id="ob-s"></div>
  <div class="row end" style="margin-top:22px"><button class="btn big accent" id="ob-go">Los geht's</button></div>`, "wide");
  const drawChips = () => { $("#ob-s", el).innerHTML = PRESETS[level].map(s => `<button class="chip ${picked.has(s) ? "on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join(""); $$("[data-s]", el).forEach(b => b.onclick = () => { picked.has(b.dataset.s) ? picked.delete(b.dataset.s) : picked.add(b.dataset.s); b.classList.toggle("on"); }); $("#ob-sl", el).textContent = level === "uni" ? "Meine Module" : "Meine Fächer"; };
  drawChips();
  $$("#ob-l button", el).forEach(b => b.onclick = () => { level = b.dataset.l; picked.clear(); $$("#ob-l button", el).forEach(x => x.classList.toggle("on", x === b)); drawChips(); });
  $("#ob-go", el).onclick = () => {
    D.profile.name = $("#ob-n", el).value.trim(); D.profile.level = level; D.profile.onboarded = true;
    [...picked].forEach((n, i) => { const sid = uid(), c = COLORS[i % COLORS.length]; D.subjects.push({ id: sid, name: n, color: c }); D.folders.push({ id: uid(), name: n, parent: "", color: c, subjectId: sid }); }); D.foldersInit = true;
    const wid = uid(); D.docs.unshift({ id: wid, type: "note", title: "Willkommen bei Lumi", subjectId: "", folderId: "", paper: "white", updated: Date.now(), created: Date.now(), text: "" });
    const w = `<h1>Willkommen bei Lumi</h1><p>Das ist deine erste Notiz. Probiere die Werkzeuge oben aus:</p><ul class="chk"><li><input type="checkbox"> Text <b>fett</b>, <i>kursiv</i> oder <mark>markiert</mark> machen</li><li><input type="checkbox"> Eine Tabelle oder ein Bild einfügen</li><li><input type="checkbox"> Mit <b>KI</b> eine Zusammenfassung oder Karteikarten erstellen</li><li><input type="checkbox"> Im Bereich <b>Zeichnen</b> Skizzen und Formeln aufschreiben</li><li><input type="checkbox"> Im <b>Planer</b> Hausaufgaben und Prüfungen eintragen</li></ul><p>Tipp: Mit Strg/Cmd + K findest du alles blitzschnell.</p>`;
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
  app.innerHTML = `<div class="shell"><aside class="side" id="side"></aside><main class="main" id="main"></main><aside class="aipane" id="aipane" hidden></aside></div><div class="timer-pill" id="tpill" hidden></div><button class="tfab" id="tfab" aria-label="KI-Tutor">${ic("spark")}<span>KI</span></button><div class="chat-panel" id="cpanel" hidden></div><input type="file" id="upl" multiple hidden>`;
  $("#tfab").onclick = () => toggleChatPanel();
  $("#upl").onchange = e => { uploadFiles([...e.target.files]); e.target.value = ""; };
  app.addEventListener("dragover", e => { e.preventDefault(); });
  app.addEventListener("drop", e => { if (e.dataTransfer?.files?.length && !e.target.closest("#boardwrap")) { e.preventDefault(); uploadFiles([...e.dataTransfer.files]); } });
  refreshNav();
}
let sideOpen = (() => { try { return localStorage.getItem("lumi-side") === "1"; } catch { return false; } })();
function applyRail() { const sh = $(".shell"); if (sh) sh.classList.toggle("collapsed", !sideOpen); }
function refreshNav() {
  const s = $("#side"); if (!s) return; applyRail();
  const mob = [["today", "Heute", "home"], ["docs", "Dokumente", "folder"], ["cards", "Karten", "cards"], ["planner", "Planer", "cal"]];
  const on = k => curView === k || (k === "docs" && curView === "doc") || (k === "board" && curView === "draw") || (k === "quiz" && curView === "quizrun") || (k === "cards" && ["deck", "study"].includes(curView));
  s.innerHTML = `<div class="rail-top"><button class="rail-tgl" id="sidetgl" aria-label="Seitenleiste ein- oder ausklappen" title="Seitenleiste ein-/ausklappen">${ic("menu")}</button><span class="brand">Lumi</span><span class="lvl">${isUni() ? "Studium" : "Schule"}</span></div>
  <button class="btn-new" id="newbtn" title="Neu erstellen">${ic("plus")}<span class="nl">Neu</span></button>
  <div class="nav-grp">${NAVS.map(([k, l, i]) => `<button class="nav-i ${on(k) ? "on" : ""} ${["board", "quiz", "grades", "focus", "search", "settings"].includes(k) ? "hide-mob" : ""}" data-go="${k}" title="${l}">${ic(i)}<span class="nl">${l}</span>${k === "cards" && dueCardCount() ? `<b class="badge">${dueCardCount()}</b>` : ""}</button>`).join("")}
  <button class="nav-i mob-only" id="morebtn">${ic("more")}<span class="nl">Mehr</span></button></div>
  <div class="sp hide-mob"></div><div class="side-h hide-mob"><span>Ordner</span><button id="addsubj" aria-label="Neuer Ordner">${ic("plus")}</button></div>
  <div class="subjlist hide-mob">${D.folders.filter(f => !f.parent).map(x => `<button class="space ${curView === "docs" && folderPath(docFolder)[0]?.id === x.id ? "on" : ""}" data-fold="${x.id}" title="${esc(x.name)}"><i style="background:${x.color}"></i><span>${esc(x.name)}</span><b>${folderCount(x.id) || ""}</b></button>`).join("") || `<p class="note nosub">Noch keine Ordner.</p>`}</div>`;
  $$("[data-go]", s).forEach(b => b.onclick = () => { if (b.dataset.go === "docs") docFolder = ""; go(b.dataset.go); });
  $$("[data-fold]", s).forEach(b => b.onclick = () => go("docs/" + b.dataset.fold));
  $("#newbtn", s).onclick = e => newMenu(e.currentTarget);
  $("#sidetgl", s).onclick = () => { sideOpen = !sideOpen; try { localStorage.setItem("lumi-side", sideOpen ? "1" : "0"); } catch {} applyRail(); };
  $("#addsubj", s) && ($("#addsubj", s).onclick = () => newFolder(""));
  $("#morebtn", s).onclick = e => menu(e.currentTarget, NAVS.filter(n => !mob.find(m => m[0] === n[0])).map(([k, l, i]) => ({ label: l, icon: i, fn: () => go(k) })));
}
function newMenu(anchor) {
  menu(anchor, [
    { label: "Neue Notiz", icon: "note", fn: () => docDialog("note") }, { label: "Neuer Ordner", icon: "folder", fn: () => newFolder() }, { label: "Neue Zeichnung", icon: "brush", fn: () => docDialog("draw") },
    { label: "Datei hochladen", icon: "upload", fn: () => $("#upl").click() }, "-",
    { label: "Karteikarten-Stapel", icon: "cards", fn: () => newDeck() }, { label: "Aufgabe / Prüfung", icon: "todo", fn: () => taskModal() },
    { label: isUni() ? "Neues Modul" : "Neues Fach", icon: "star", fn: newSubject },
  ]);
}
async function newSubject() {
  const n = await ask(isUni() ? "Neues Modul" : "Neues Fach", { placeholder: "z. B. Biologie", ok: "Hinzufügen" }); if (!n || !n.trim()) return;
  const sub = { id: uid(), name: n.trim(), color: COLORS[D.subjects.length % COLORS.length] }; D.subjects.push(sub); D.folders.push({ id: uid(), name: sub.name, parent: "", color: sub.color, subjectId: sub.id }); save(); refreshNav(); renderView();
}
function subjectSelect(id = "", cls = "") { return `<select class="field slim ${cls}">${`<option value="">Kein ${isUni() ? "Modul" : "Fach"}</option>`}${D.subjects.map(s => `<option value="${s.id}" ${s.id === id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>`; }

/* ---------- new document dialog ---------- */
const TEMPLATES = [
  ["blank", "Leer", ""],
  ["lecture", "Mitschrift", "<h1>Thema</h1><p>Datum · Lehrkraft / Dozent:in</p><h2>Stichwörter</h2><ul><li><br></li></ul><h2>Notizen</h2><p><br></p><h2>Zusammenfassung</h2><p><br></p>"],
  ["summary", "Zusammenfassung", "<h1>Zusammenfassung</h1><h2>Kernaussagen</h2><ul><li><br></li><li><br></li><li><br></li></ul><h2>Wichtige Begriffe</h2><table><tbody><tr><td><b>Begriff</b></td><td><b>Erklärung</b></td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><h2>Fragen</h2><p><br></p>"],
  ["plan", "Lernplan", "<h1>Lernplan</h1><p>Prüfung am: </p><table><tbody><tr><td><b>Tag</b></td><td><b>Thema</b></td><td><b>Dauer</b></td></tr><tr><td>Montag</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>Dienstag</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>Mittwoch</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>Donnerstag</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>Freitag</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>"],
  ["tasks", "Aufgabenblatt", '<h1>Aufgaben</h1><ul class="chk"><li><input type="checkbox">&nbsp;Aufgabe 1</li><li><input type="checkbox">&nbsp;Aufgabe 2</li><li><input type="checkbox">&nbsp;Aufgabe 3</li></ul><h2>Lösungen</h2><p><br></p>'],
  ["protocol", "Protokoll", "<h1>Protokoll</h1><p>Datum · Teilnehmende</p><h2>Ziel</h2><p><br></p><h2>Durchführung</h2><p><br></p><h2>Ergebnis</h2><p><br></p>"],
];
const PAPERS = [["white", "Weiß"], ["lines", "Liniert"], ["grid", "Kariert"], ["dots", "Punkte"]];
function docDialog(kind = "note") {
  const isNote = kind === "note"; let folder = docFolder, paper = isNote ? (D.profile.paper || "white") : "grid", tpl = "blank";
  const { el, close } = modal(`<div class="nd"><p class="eyebrow">${isNote ? "Neue Notiz" : "Neue Zeichnung"}</p>
  <input class="nd-name" id="nd-n" placeholder="${isNote ? "Wie soll die Notiz heißen?" : "Wie soll die Zeichnung heißen?"}" autocomplete="off" maxlength="80">
  <div class="nd-sugg" id="nd-s"></div>
  <div class="nd-row"><div><label class="lbl">Ordner</label><button class="nd-folder" id="nd-f" type="button"></button></div></div>
  <label class="lbl">${isNote ? "Papier" : "Hintergrund"}</label><div class="papers" id="nd-p">${PAPERS.map(([k, l]) => `<button type="button" data-k="${k}" class="pp ${k === paper ? "on" : ""}"><i class="pv ${k}"></i><b>${l}</b></button>`).join("")}</div>
  ${isNote ? `<label class="lbl">Vorlage</label><div class="chips" id="nd-t">${TEMPLATES.map(([k, l]) => `<button type="button" class="chip ${k === tpl ? "on" : ""}" data-t="${k}">${l}</button>`).join("")}</div>` : ""}
  <div class="row end"><button class="btn ghost" data-c>Abbrechen</button><button class="btn accent big" id="nd-go">${isNote ? "Notiz erstellen" : "Zeichnung erstellen"}</button></div></div>`, "wide nd-modal");
  const nameIn = $("#nd-n", el), fb = $("#nd-f", el);
  const fname = () => { const fp = folderPath(folder); return fp.length ? fp[fp.length - 1].name : ""; };
  const drawF = () => { fb.innerHTML = `${ic("folder")}<span>${["Home", ...folderPath(folder).map(f => f.name)].map(esc).join(" / ")}</span><em>Ändern</em>`; const base = fname(); const sugg = isNote ? [base ? base + " – Mitschrift" : "Mitschrift", "Zusammenfassung", "Lernzettel", "Hausaufgaben", "Ideen"] : [base ? base + " – Skizze" : "Skizze", "Mindmap", "Formelsammlung", "Tafelbild"]; $("#nd-s", el).innerHTML = sugg.map(x => `<button type="button" class="chip">${esc(x)}</button>`).join(""); $$("#nd-s .chip", el).forEach(b => b.onclick = () => { nameIn.value = b.textContent; nameIn.focus(); }); };
  drawF(); setTimeout(() => nameIn.focus(), 40);
  fb.onclick = async () => { const t = await pickFolder("Ordner wählen"); if (t !== null) { folder = t; drawF(); } };
  $$("#nd-p .pp", el).forEach(b => b.onclick = () => { paper = b.dataset.k; $$("#nd-p .pp", el).forEach(x => x.classList.toggle("on", x === b)); });
  $$("#nd-t .chip", el).forEach(b => b.onclick = () => { tpl = b.dataset.t; $$("#nd-t .chip", el).forEach(x => x.classList.toggle("on", x === b)); const t = TEMPLATES.find(x => x[0] === tpl); if (!nameIn.value.trim() && tpl !== "blank") nameIn.placeholder = t[1]; });
  $("[data-c]", el).onclick = close;
  const go2 = async () => {
    const title = nameIn.value.trim() || (isNote ? (TEMPLATES.find(x => x[0] === tpl)[0] === "blank" ? "Unbenannte Notiz" : TEMPLATES.find(x => x[0] === tpl)[1]) : "Neue Zeichnung"); close();
    if (isNote) { D.profile.paper = paper; await newNote("", TEMPLATES.find(x => x[0] === tpl)[2], title, folder, paper); }
    else { const id = uid(); D.docs.unshift({ id, type: "draw", title, subjectId: subjectOfFolder(folder), folderId: folder, updated: Date.now(), created: Date.now(), thumb: "" }); await KV.set("draw:" + id, { strokes: [], bg: paper === "white" ? "blank" : paper, H: 1000 }); save(); go("draw/" + id); }
  };
  $("#nd-go", el).onclick = go2; nameIn.onkeydown = e => { if (e.key === "Enter") go2(); };
}

/* ---------- folders ---------- */
let docFolder = "";
const folderOf = id => D.folders.find(f => f.id === id);
function folderPath(id) { const p = []; let f = folderOf(id), guard = 0; while (f && guard++ < 20) { p.unshift(f); f = folderOf(f.parent); } return p; }
function folderTree(parent = "", depth = 0, skip = "") { return D.folders.filter(f => (f.parent || "") === parent && f.id !== skip).sort((a, b) => a.name.localeCompare(b.name)).flatMap(f => [{ f, depth }, ...folderTree(f.id, depth + 1, skip)]); }
const subjectOfFolder = id => folderPath(id).map(f => f.subjectId).filter(Boolean).pop() || "";
const folderCount = id => D.docs.filter(d => d.folderId === id).length + D.folders.filter(f => f.parent === id).length;
function migrateFolders() {
  if (D.foldersInit) return; D.foldersInit = true;
  D.subjects.forEach(s => { if (!D.folders.find(f => f.subjectId === s.id)) D.folders.push({ id: uid(), name: s.name, parent: "", color: s.color, subjectId: s.id }); });
  D.docs.forEach(d => { if (d.subjectId && !d.folderId) d.folderId = D.folders.find(f => f.subjectId === d.subjectId)?.id || ""; }); save();
}
async function newFolder(parent = docFolder) {
  const n = await ask("Neuer Ordner", { placeholder: "z. B. Mathe oder Deutsch", ok: "Erstellen" }); if (!n?.trim()) return;
  const name = n.trim(), sub = !parent && D.subjects.find(s => s.name.toLowerCase() === name.toLowerCase());
  D.folders.push({ id: uid(), name, parent: parent || "", color: sub?.color || COLORS[D.folders.length % COLORS.length], subjectId: sub?.id || "" }); save(); refreshNav(); if (curView === "docs") renderView();
}
function pickFolder(title, exclude = "") {
  return new Promise(res => {
    const rows = [{ f: { id: "", name: "Dokumente (oberste Ebene)", color: "#8a8a98" }, depth: 0 }, ...folderTree("", 0, exclude)];
    const { el, close } = modal(`<h3>${esc(title)}</h3><div class="pick">${rows.map(({ f, depth }) => `<button class="pk" data-f="${f.id}" style="padding-left:${14 + depth * 20}px">${ic("folder")}<i style="background:${f.color}"></i>${esc(f.name)}</button>`).join("")}</div>`);
    let d = false; $$("[data-f]", el).forEach(b => b.onclick = () => { d = true; close(); res(b.dataset.f); }); $(".x", el).addEventListener("click", () => { if (!d) res(null); });
  });
}
function moveDoc(d, folderId) { d.folderId = folderId || ""; const sid = subjectOfFolder(folderId); if (sid) d.subjectId = sid; d.updated = Date.now(); save(); }
function folderMenu(btn, f) {
  menu(btn, [
    { label: "Öffnen", icon: "folder", fn: () => go("docs/" + f.id) },
    { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Ordner umbenennen", { value: f.name }); if (n?.trim()) { f.name = n.trim(); save(); refreshNav(); renderView(); } } },
    { label: "Farbe ändern", icon: "brush", fn: () => { const { el, close } = modal(`<h3>Farbe</h3><div class="chips">${COLORS.map(c => `<button class="cdot" data-c="${c}" style="background:${c};width:38px;height:38px"></button>`).join("")}</div>`); $$("[data-c]", el).forEach(b => b.onclick = () => { f.color = b.dataset.c; save(); close(); refreshNav(); renderView(); }); } },
    { label: "Verschieben…", icon: "upload", fn: async () => { const t = await pickFolder("Ordner verschieben nach…", f.id); if (t !== null && t !== f.parent) { f.parent = t; save(); refreshNav(); renderView(); } } },
    "-", { label: "Ordner löschen", icon: "trash", danger: true, fn: async () => { if (!(await confirmBox(`Ordner „${f.name}“ löschen? Der Inhalt wandert eine Ebene nach oben.`))) return; D.docs.forEach(d => { if (d.folderId === f.id) d.folderId = f.parent || ""; }); D.folders.forEach(x => { if (x.parent === f.id) x.parent = f.parent || ""; }); D.folders = D.folders.filter(x => x !== f); save(); if (docFolder === f.id) docFolder = f.parent || ""; refreshNav(); go("docs/" + docFolder); } },
  ]);
}

/* ---------- documents CRUD ---------- */
async function newNote(subjectId = "", html = "", title = "Unbenannte Notiz", folderId = docFolder, paper = "") {
  const id = uid(); D.docs.unshift({ id, type: "note", title, subjectId: subjectId || subjectOfFolder(folderId), folderId, paper: paper || D.profile.paper || "white", updated: Date.now(), created: Date.now(), text: htmlToText(html) });
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
    D.docs.unshift({ id, type: "file", title: f.name, mime: f.type, size: f.size, subjectId: subjectOfFolder(docFolder), folderId: docFolder, updated: Date.now(), created: Date.now(), thumb: /^image\//.test(f.type) ? await thumbOf(f) : "" }); n++;
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
  return `<div class="doc" data-d="${d.id}" draggable="true">${thumb}<div class="dm"><div class="dt">${d.pinned ? `<span class="pin">${ic("star")}</span>` : ""}${esc(d.title)}</div><div class="ds">${s ? `<span class="sdot" style="background:${s.color}"></span>${esc(s.name)} · ` : ""}${fmtAgo(d.updated)}</div></div><button class="dmore" data-m="${d.id}" aria-label="Mehr">${ic("more")}</button></div>`;
}
function docMenu(btn, d) {
  menu(btn, [
    { label: "Öffnen", icon: "file", fn: () => openDoc(d) },
    { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Umbenennen", { value: d.title }); if (n?.trim()) { d.title = n.trim(); d.updated = Date.now(); save(); renderView(); } } },
    { label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); renderView(); } },
    { label: "Verschieben…", icon: "upload", fn: async () => { const t = await pickFolder("Verschieben nach…"); if (t !== null) { moveDoc(d, t); refreshNav(); renderView(); toast("Verschoben"); } } },
    ...D.subjects.length ? [{ label: "Fach zuordnen…", icon: "folder", fn: () => { const { el, close } = modal(`<h3>Fach zuordnen</h3><div class="chips">${[{ id: "", name: "Kein Fach", color: "#999" }, ...D.subjects].map(s => `<button class="chip" data-s="${s.id}"><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</button>`).join("")}</div>`); $$("[data-s]", el).forEach(b => b.onclick = () => { d.subjectId = b.dataset.s; save(); close(); renderView(); }); } }] : [],
    "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); renderView(); } },
  ]);
}
const openDoc = d => go((d.type === "draw" ? "draw/" : "doc/") + d.id);
const docPath = d => folderPath(d.folderId).map(f => f.name).join(" › ");

/* ---------- views: today ---------- */
const ringSvg = (p, color, val, label) => `<div class="rg"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="48" class="rbg"/><circle cx="60" cy="60" r="48" class="rfg" style="stroke:${color};stroke-dasharray:${Math.max(0, Math.min(100, p)) * 3.016} 302"/></svg><b>${val}</b><small>${label}</small></div>`;
function weekData() { return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { l: d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""), v: activity(iso(d)), today: i === 6 }; }); }
function practiceExam(t) {
  const doc = D.docs.find(x => x.id === t.docId);
  if (doc) return docText(doc).then(txt => aiTool("quiz", txt, { title: t.title, subjectId: t.subjectId }));
  quizPrefill = { topic: t.title }; go("quiz");
}
V.today = m => {
  const t = iso(), wd = (new Date().getDay() + 6) % 7, h = new Date().getHours(), goal = D.profile.goalMin || 45;
  const lessons = D.tt.filter(e => e.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const open = D.tasks.filter(x => !x.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
  const exams = open.filter(x => x.type === "exam" && x.due && daysUntil(x.due) >= 0).slice(0, 4);
  const mins = D.stats.days[t] || 0, due = dueCardCount(), evToday = msEventsOn(t), todayTasks = open.filter(x => x.due && daysUntil(x.due) <= 0);
  const recent = [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 8);
  const cards = D.decks.flatMap(d => d.cards), mastered = cards.filter(c => c.box >= 4).length, cardPct = cards.length ? mastered / cards.length * 100 : 0;
  const week = weekData(), wmax = Math.max(30, ...week.map(x => x.v)), allT = D.tasks.length, doneT = D.tasks.filter(x => x.done).length;
  const timeline = [...lessons.map(e => ({ t: e.start, e: e.end, n: e.title || subj(e.subjectId)?.name || "Stunde", c: subj(e.subjectId)?.color || "#999", s: e.room || "Stundenplan" })), ...evToday.map(e => ({ t: e.time || "00:00", e: e.end, n: e.title, c: "#2563eb", s: e.loc || "Outlook" })), ...todayTasks.map(x => ({ t: "99:99", n: x.title, c: subj(x.subjectId)?.color || "#f59e0b", s: x.type === "exam" ? "Prüfung heute" : "Fällig", task: x }))].sort((a, b) => a.t.localeCompare(b.t));
  const days7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); const k = iso(d); return { k, l: d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", ""), n: d.getDate(), tasks: D.tasks.filter(x => !x.done && x.due === k), ev: msEventsOn(k) }; });
  const ms = D.ms?.account;
  const TILES = [["note", "Neue Notiz", "n", "linear-gradient(135deg,#6a4cff,#9a86ff)"], ["brush", "Zeichnen", "d", "linear-gradient(135deg,#ff7a3d,#ffb36b)"], ["upload", "Datei hochladen", "u", "linear-gradient(135deg,#2f7bff,#6cb3ff)"], ["cards", "Karteikarten", "c", "linear-gradient(135deg,#12b27a,#6fe0b0)"], ["help", "Quiz starten", "q", "linear-gradient(135deg,#ec4899,#ff8fc0)"], ["timer", "Fokus-Timer", "f", "linear-gradient(135deg,#f59e0b,#ffd166)"]];
  m.innerHTML = `<div class="home-wrap"><div class="page home"><section class="hero-home"><div class="hh-txt"><p class="eyebrow">${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p><h1>${h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend"}${D.profile.name ? ", " + esc(D.profile.name.split(" ")[0]) : ""}</h1>
    <p class="hh-sub">${todayTasks.length ? `Heute ${todayTasks.length === 1 ? "steht 1 Aufgabe" : "stehen " + todayTasks.length + " Aufgaben"} an` : "Heute ist nichts überfällig – perfekt zum Lernen"}${exams[0] ? ` · nächste Prüfung in ${daysUntil(exams[0].due)} ${daysUntil(exams[0].due) === 1 ? "Tag" : "Tagen"}` : ""}.</p>
    <div class="hh-chips"><span class="hchip">${ic("flame")}${streak()} Tage Serie</span><span class="hchip">${ic("timer")}${mins}/${goal} Min. heute</span>${due ? `<span class="hchip warn">${ic("cards")}${due} Karten fällig</span>` : ""}<button class="hchip plan" id="plan" type="button">${ic("spark")}KI-Tagesplan</button></div>
</div><div class="hh-art" aria-hidden="true"><i class="b1"></i><i class="b2"></i><i class="b3"></i></div></section>
  <section><h2 class="sh2">Neu erstellen</h2><div class="create">${TILES.map(([i, l, k, g]) => `<button data-q="${k}" style="background:${g}"><span>${ic(i)}</span><b>${l}</b></button>`).join("")}</div></section>
  <div class="cols2"><section class="panel tint"><h2>Lernfortschritt</h2><div class="rings">${ringSvg(mins / goal * 100, "#5b3df5", mins + "′", "Tagesziel")}${ringSvg(cardPct, "#0e9f6e", Math.round(cardPct) + "%", "Karten gemeistert")}${ringSvg(allT ? doneT / allT * 100 : 0, "#ff6a3d", allT ? Math.round(doneT / allT * 100) + "%" : "–", "Aufgaben erledigt")}</div></section>
  <section class="panel"><h2>Diese Woche<small>${week.reduce((a, x) => a + x.v, 0)} Min./Karten</small></h2><div class="wbars">${week.map(x => `<div class="${x.today ? "today" : ""}"><i style="height:${Math.max(5, x.v / wmax * 100)}%"></i><small>${x.l}</small></div>`).join("")}</div></section></div>
  ${exams.length ? `<section><div class="sech"><h2 class="sh2">Prüfungen & Tests</h2><button class="link" data-go="planner">Planer</button></div><div class="examrow">${exams.map((x, i) => { const dd = daysUntil(x.due), s = subj(x.subjectId); return `<div class="examc" style="--c:${s?.color || ["#5b3df5", "#ff6a3d", "#0e9f6e", "#ec4899"][i % 4]}"><div class="dd"><b>${dd}</b><small>${dd === 1 ? "Tag" : "Tage"}</small></div><div class="ex-b"><b>${esc(x.title)}</b><small>${esc(s?.name || "")} · ${fmtD(x.due)}${x.source === "outlook" ? " · Outlook" : ""}</small>${x.note ? `<p>${esc(x.note.split("\n").slice(0, 3).join(" · ").slice(0, 120))}</p>` : ""}</div><button class="btn small" data-ex="${x.id}">Üben</button></div>`; }).join("")}</div></section>` : ""}
  <section><h2 class="sh2">Nächste 7 Tage</h2><div class="week7">${days7.map((d, i) => `<button data-go="planner" class="${i ? "" : "now"}"><small>${i ? d.l : "Heute"}</small><b>${d.n}</b><span>${[...d.tasks.slice(0, 3).map(x => `<i style="background:${x.type === "exam" ? "#e5484d" : subj(x.subjectId)?.color || "#888"}"></i>`), ...d.ev.slice(0, 2).map(() => `<i class="sq"></i>`)].join("")}</span></button>`).join("")}</div></section>
  <div class="cols"><section class="panel"><h2>Heute<small>${timeline.length}</small></h2>${timeline.length ? timeline.map(x => `<div class="li tl"><span class="tm">${x.t === "99:99" ? "•" : x.t}${x.e ? `<br><small>${x.e}</small>` : ""}</span><span class="bar-c" style="background:${x.c}"></span><div class="tm2"><b>${esc(x.n)}</b><small>${esc(x.s)}</small></div></div>`).join("") : `<p class="empty">Nichts geplant.<br><button class="link" data-go="planner">Stundenplan anlegen</button></p>`}</section>
  <section class="panel"><h2>Als Nächstes fällig<small>${open.length}</small></h2>${open.slice(0, 6).map(x => `<label class="li task"><input type="checkbox" data-t="${x.id}"><span class="sdot lg" style="background:${subj(x.subjectId)?.color || "#999"}"></span><b>${x.type === "exam" ? '<em class="xb">Prüfung</em> ' : ""}${esc(x.title)}</b><small class="${x.due && daysUntil(x.due) < 0 ? "red" : ""}">${x.due ? (daysUntil(x.due) === 0 ? "Heute" : daysUntil(x.due) === 1 ? "Morgen" : daysUntil(x.due) < 0 ? "Überfällig" : fmtD(x.due)) : ""}</small></label>`).join("") || `<p class="empty">Alles erledigt<br><button class="link" id="addt">Aufgabe hinzufügen</button></p>`}</section></div>
  ${ms ? `<section class="panel msc ok"><div class="ms-logo">${msLogoSvg()}</div><div><b>Microsoft 365 verbunden</b><p class="note">${esc(D.ms.account)} · ${D.ms.lastSync ? "zuletzt synchronisiert " + fmtAgo(D.ms.lastSync) : "noch nicht synchronisiert"} · ${(D.ms.events || []).length} Termine</p></div><button class="btn ghost" id="msync">${ic("rot")}Jetzt synchronisieren</button></section>` : `<section class="panel msc"><div class="ms-logo">${msLogoSvg()}</div><div><b>Mit Microsoft 365 verbinden</b><p class="note">Outlook-Kalender, OneNote und Teams: Prüfungen, Hausaufgaben und Lernziele werden automatisch importiert – die KI kann alles lesen.</p></div><button class="btn accent" data-go="settings">Verbinden</button></section>`}
  <section><div class="sech"><h2 class="sh2">Zuletzt bearbeitet</h2><button class="link" data-go="docs">Alle Dokumente</button></div>${recent.length ? `<div class="docgrid">${recent.map(docCard).join("")}</div>` : `<p class="empty">Noch keine Dokumente.</p>`}</section>
  ${D.subjects.length ? `<section><h2 class="sh2">${SUBJ()}</h2><div class="subjgrid">${D.subjects.map(s => { const nd = D.docs.filter(d => d.subjectId === s.id).length, dk = D.decks.filter(d => d.subjectId === s.id), dc = dk.reduce((n, d) => n + d.cards.filter(c => c.due <= t).length, 0), gl = D.grades.filter(g => g.subjectId === s.id), av = wavg(gl); return `<button class="subjc" data-sub="${s.id}" style="--c:${s.color}"><b>${esc(s.name)}</b><small>${nd} Dok. · ${dc ? dc + " Karten fällig" : dk.length + " Stapel"}</small>${av != null ? `<span class="gp" style="background:${gcol(av)}">Ø ${gfmt(av)}</span>` : ""}</button>`; }).join("")}</div></section>` : ""}</div></div>`;
  bindCommon(m);
  $$("[data-sub]", m).forEach(b => b.onclick = () => { go("docs/" + (D.folders.find(f => f.subjectId === b.dataset.sub)?.id || "")); });
  $$("[data-q]", m).forEach(b => b.onclick = () => ({ n: () => docDialog("note"), d: () => docDialog("draw"), u: () => $("#upl").click(), c: () => go("cards"), q: () => go("quiz"), f: () => go("focus") }[b.dataset.q])());
  $$("[data-ex]", m).forEach(b => b.onclick = () => practiceExam(D.tasks.find(x => x.id === b.dataset.ex)));
  $$("[data-t]", m).forEach(c => c.onchange = () => { const x = D.tasks.find(y => y.id === c.dataset.t); x.done = true; x.doneAt = Date.now(); save(); toast("Erledigt"); renderView(); });
  $("#addt", m) && ($("#addt", m).onclick = () => taskModal());
  $("#plan", m).onclick = async () => {
    const { el } = modal(`<h3>Dein Tagesplan</h3><div class="result" id="pr">Plane deinen Tag…</div>`, "wide");
    const ctx = `Heute ist ${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}. Stunden heute: ${lessons.map(e => `${e.start}-${e.end} ${e.title || subj(e.subjectId)?.name}`).join(", ") || "keine"}. Termine heute (Outlook): ${evToday.map(e => `${e.time} ${e.title}`).join(", ") || "keine"}. Offene Aufgaben: ${open.slice(0, 10).map(x => `${x.title}${x.due ? " (fällig " + x.due + ")" : ""}${x.type === "exam" ? " [Prüfung]" : ""}`).join("; ") || "keine"}. Fällige Karteikarten: ${due}.`;
    const r = await ai(`Erstelle mir einen realistischen Lernplan für heute (Zeitblöcke, Pausen). ${ctx}`, { max: 700 });
    $("#pr", el).textContent = r || `Vorschlag (offline):\n- 15 Min.: ${due} fällige Karteikarten wiederholen\n${open.slice(0, 3).map(x => `- 25 Min.: ${x.title}`).join("\n") || "- 25 Min.: Notizen des Tages durchgehen"}\n- 5 Min. Pause nach jedem Block\n\n(Für einen persönlichen KI-Plan trage einen API-Key in den Einstellungen ein.)`;
  };
  $("#msync", m) && ($("#msync", m).onclick = async e => { e.currentTarget.disabled = true; toast("Synchronisiere mit Microsoft…"); try { const r = await msSync(); toast(r.errors.length ? "Sync mit Hinweisen: " + r.errors[0] : `Synchronisiert: ${r.events} Termine, ${r.pages} Seiten, ${r.exams + r.tasks} neue Aufgaben`); } catch (er) { toast("Sync fehlgeschlagen: " + er.message); } renderView(); });
};
const msLogoSvg = () => `<svg viewBox="0 0 24 24" width="26" height="26"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="13" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="13" width="10" height="10" fill="#00a4ef"/><rect x="13" y="13" width="10" height="10" fill="#ffb900"/></svg>`;
let quizPrefill = null;
function bindCommon(m) {
  $$("[data-go]", m).forEach(b => b.onclick = () => go(b.dataset.go));
  $$("[data-d]", m).forEach(c => c.onclick = e => { if (e.target.closest(".dmore")) return; openDoc(D.docs.find(d => d.id === c.dataset.d)); });
  $$("[data-m]", m).forEach(b => b.onclick = e => { e.stopPropagation(); docMenu(b, D.docs.find(d => d.id === b.dataset.m)); });
}

/* ---------- views: documents (folders) ---------- */
let docSort = "recent", docQuery = "";
V.docs = (m, id) => {
  if (id !== undefined) docFolder = id || ""; if (docFolder && !folderOf(docFolder)) docFolder = "";
  const q = docQuery.trim().toLowerCase(), path = folderPath(docFolder);
  const folders = (q ? D.folders.filter(f => f.name.toLowerCase().includes(q)) : D.folders.filter(f => (f.parent || "") === docFolder)).sort((a, b) => a.name.localeCompare(b.name));
  const list = (q ? D.docs.filter(d => (d.title + " " + (d.text || "")).toLowerCase().includes(q)) : D.docs.filter(d => (d.folderId || "") === docFolder)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (docSort === "name" ? a.title.localeCompare(b.title) : b.updated - a.updated));
  m.innerHTML = `<div class="page"><div class="hd docs-hd"><div><h1>Dokumente</h1><nav class="path" aria-label="Pfad"><button data-p="" class="${path.length ? "" : "here"}">Home</button>${path.map((f, i) => `<span>/</span><button data-p="${f.id}" class="${i === path.length - 1 ? "here" : ""}">${esc(f.name)}</button>`).join("")}</nav></div>
  <div class="row"><button class="btn ghost" id="nd">${ic("brush")}Zeichnung</button><button class="btn ghost" id="up">${ic("upload")}Hochladen</button><button class="btn ghost" id="nn">${ic("note")}Notiz</button><button class="btn accent" id="nf">${ic("plus")}Ordner</button></div></div>
  <div class="toolbar"><div class="searchbox">${ic("search")}<input id="dq" placeholder="${path.length ? "In „" + esc(path[path.length - 1].name) + "“ und überall suchen…" : "Alle Dokumente durchsuchen…"}" value="${esc(docQuery)}"></div><select class="field slim" id="ds"><option value="recent" ${docSort === "recent" ? "selected" : ""}>Zuletzt bearbeitet</option><option value="name" ${docSort === "name" ? "selected" : ""}>Name A–Z</option></select></div>
  ${folders.length || !q ? `<h2 class="sh2 sm">Ordner</h2><div class="foldgrid">${folders.map(f => `<div class="fold" data-f="${f.id}" style="--c:${f.color}"><span class="fi">${ic("folder")}</span><div class="fm"><b>${esc(f.name)}</b><small>${folderCount(f.id)} ${folderCount(f.id) === 1 ? "Eintrag" : "Einträge"}${q && f.parent ? " · " + esc(folderPath(f.parent).map(x => x.name).join(" › ")) : ""}</small></div><button class="dmore on" data-fm="${f.id}" aria-label="Mehr">${ic("more")}</button></div>`).join("")}${q ? "" : `<button class="fold add" id="nf3">${ic("plus")}<b>Neuer Ordner</b></button>`}</div>` : ""}
  ${list.length ? `<h2 class="sh2 sm">${q ? "Treffer" : "Dateien"}</h2><div class="docgrid">${list.map(docCard).join("")}</div>` : (!folders.length && q ? `<div class="emptybox"><div class="big-ic">${ic("folder")}</div><h3>${q ? "Nichts gefunden" : path.length ? "Dieser Ordner ist leer" : "Noch nichts hier"}</h3><p>${q ? "Versuche einen anderen Suchbegriff." : "Lege Ordner für deine Fächer an (z. B. Mathe, Deutsch) und erstelle Notizen, Zeichnungen oder lade PDFs hoch. Dateien kannst du auch einfach hierher ziehen."}</p>${q ? "" : `<div class="row" style="justify-content:center"><button class="btn accent" id="nf2">Ordner anlegen</button><button class="btn ghost" id="nn2">Neue Notiz</button></div>`}</div>` : "")}
  <p class="note" style="margin-top:22px;text-align:center">Tipp: Notizen und Dateien per Drag & Drop auf einen Ordner oder in den Pfad oben ziehen.</p></div>`;
  bindCommon(m);
  $$("[data-p]", m).forEach(b => { b.onclick = () => go("docs/" + b.dataset.p); b.ondragover = e => { e.preventDefault(); b.classList.add("drop"); }; b.ondragleave = () => b.classList.remove("drop"); b.ondrop = e => dropOn(e, b.dataset.p); });
  $$("[data-f]", m).forEach(c => { c.onclick = e => { if (e.target.closest("[data-fm]")) return; go("docs/" + c.dataset.f); }; c.ondragover = e => { e.preventDefault(); c.classList.add("drop"); }; c.ondragleave = () => c.classList.remove("drop"); c.ondrop = e => dropOn(e, c.dataset.f); });
  $$("[data-fm]", m).forEach(b => b.onclick = e => { e.stopPropagation(); folderMenu(b, folderOf(b.dataset.fm)); });
  $$(".doc", m).forEach(c => c.ondragstart = e => { e.dataTransfer.setData("text/lumi-doc", c.dataset.d); e.dataTransfer.effectAllowed = "move"; });
  function dropOn(e, fid) { const did = e.dataTransfer.getData("text/lumi-doc"); if (!did) return; e.preventDefault(); e.stopPropagation(); const d = D.docs.find(x => x.id === did); if (d) { moveDoc(d, fid); toast("Verschoben nach " + (folderOf(fid)?.name || "Dokumente")); refreshNav(); V.docs(m); } }
  $("#up", m).onclick = () => $("#upl").click(); $("#nn", m).onclick = () => docDialog("note"); $("#nn2", m) && ($("#nn2", m).onclick = () => docDialog("note")); $("#nd", m).onclick = () => docDialog("draw");
  $("#nf", m).onclick = () => newFolder(); $("#nf3", m) && ($("#nf3", m).onclick = () => newFolder());
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
  const { el } = modal(`<h3>${{ summary: "Zusammenfassung", explain: "Einfach erklärt", improve: "Verbesserter Text", continue: "Fortsetzung", translate: "Übersetzung", ask: "Antwort", goals: "Lernziele" }[kind]}</h3><textarea class="field" id="ar" rows="12">KI arbeitet…</textarea><div class="row end" id="ab" hidden>${ctx.insert ? `<button class="btn ghost" id="a-ins">Unten einfügen</button>` : ""}${ctx.replace && kind !== "summary" && kind !== "ask" && kind !== "explain" ? `<button class="btn ghost" id="a-rep">Auswahl ersetzen</button>` : ""}<button class="btn ghost" id="a-note">Als Notiz speichern</button><button class="btn" id="a-cp">${ic("copy")}Kopieren</button></div>`, "wide");
  let r = await ai(prompts[kind], { max: 1800, quiet: true });
  if (r == null) { r = kind === "summary" ? localSummary(T) : kind === "goals" ? localGoals(T) : null; if (!r) { $("#ar", el).value = hasKey() ? "Die KI hat nicht geantwortet. Versuche es erneut." : "Diese Funktion braucht einen API-Key.\n\nTrage ihn unter Einstellungen → KI ein (Anthropic). Zusammenfassungen, Karteikarten und Quiz funktionieren auch ohne Key mit einfacher lokaler Auswertung."; return; } }
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
function localEdit(instr, t) {
  if (!t) return null;
  if (/kürz|kurz|zusammen/i.test(instr)) return sentences(t).slice(0, 2).join(" ") || t.slice(0, 160);
  if (/liste|aufzähl/i.test(instr)) { const ss = sentences(t); return ss.length ? ss.map(x => "- " + x).join("\n") : null; }
  return null;
}
const SYMS = "α β γ δ ε θ λ μ π ρ σ τ φ ω Δ Σ Ω ∫ ∂ √ ∞ ≈ ≠ ≤ ≥ ± × ÷ · → ⇒ ⇔ ∈ ∉ ⊂ ∪ ∩ ∀ ∃ ∅ ℝ ℕ ℤ ℚ ° ² ³ ⁿ ½ ¼ ‰ € § ✓ ✗".split(" ");
V.doc = async (m, id) => {
  const d = D.docs.find(x => x.id === id); if (!d) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>Dokument nicht gefunden</h3><button class="btn" data-go="docs">Zu den Dokumenten</button></div></div>`; return bindCommon(m); }
  if (d.type === "draw") return go("draw/" + id);
  if (d.type === "file") return fileViewer(m, d);
  return noteEditor(m, d);
};
async function noteEditor(m, d) {
  const html = (await KV.get("html:" + d.id)) || "";
  const paperOf = () => d.paper || D.profile.paper || "white";
  const fp = folderPath(d.folderId), BTN = (c, i, t) => `<button class="tbtn" data-c="${c}" title="${t}">${ic(i)}</button>`;
  m.classList.add("doc-full");
  m.innerHTML = `<div class="ned dfull"><div class="ned-bar">
    <div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><div class="nb-name"><b id="cr">${esc(d.title)}</b><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
    <div class="ned-tools" id="tb"><button class="tt" id="t-blk" title="Textformat"><b>Aa</b>${ic("chev")}</button><i class="sep"></i>${BTN("bold", "bold", "Fett (Strg+B)")}${BTN("italic", "italic", "Kursiv (Strg+I)")}${BTN("underline", "underline", "Unterstrichen")}${BTN("strike", "strike", "Durchgestrichen")}<i class="sep"></i>${BTN("hilite", "hl", "Markieren")}<label class="tbtn" title="Textfarbe"><b id="cl" style="border-bottom:3px solid #5b3df5;line-height:1">A</b><input type="color" id="cin" value="#5b3df5" hidden></label><i class="sep"></i>${BTN("ul", "list", "Aufzählung")}${BTN("ol", "listnum", "Nummerierung")}${BTN("todo", "todo", "Checkliste")}<i class="sep"></i><button class="tt" id="t-ins" title="Einfügen">${ic("plus")}<span>Einfügen</span>${ic("chev")}</button><button class="tt" id="t-paper" title="Papier">${ic("note")}<span>Papier</span>${ic("chev")}</button><i class="sep"></i>${BTN("undo", "undo", "Rückgängig")}${BTN("redo", "redo", "Wiederholen")}</div>
    <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><button class="btn ghost small" id="ai-m">${ic("spark")}<span class="hide-sm">KI</span></button><button class="btn accent small" id="done">Fertig</button><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button></div></div>
  <article class="ned-paper p-${paperOf()}" id="paperc"><div class="ned-col"><input class="ned-title" id="et" value="${esc(d.title === "Unbenannte Notiz" ? "" : d.title)}" placeholder="Unbenannte Notiz" aria-label="Titel">
    <div class="ned-meta">${subjectSelect(d.subjectId, "ed-sub")}<span class="mchip">${ic("cal")}${new Date(d.created || Date.now()).toLocaleDateString("de-DE")}</span><span class="mchip" id="wc"></span>${d.msLink ? `<a class="mchip ms" href="${esc(d.msLink)}" target="_blank" rel="noopener">OneNote</a>` : ""}</div></div>
    <div class="body" id="body" contenteditable="true" spellcheck="true" data-ph="Schreibe etwas, tippe „/“ für Blöcke oder drücke Leertaste für die KI …">${html}</div></article><input type="file" id="imgin" accept="image/*" hidden></div>`;
  const body = $("#body", m), svEl = $("#sv", m), titleIn = $("#et", m), wcEl = $("#wc", m); let saved = null;
  const onSel = () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); updBubble(); };
  document.addEventListener("selectionchange", onSel); LEAVE.push(() => document.removeEventListener("selectionchange", onSel));
  const restore = () => { if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } body.focus(); };
  const count = () => { const t = body.innerText.trim(), w = t ? t.split(/\s+/).length : 0; wcEl.textContent = `${w} Wörter · ${Math.max(1, Math.round(w / 200))} Min.`; };
  const doSave = debounce(async () => { if (!D.docs.includes(d)) return; d.title = titleIn.value.trim() || "Unbenannte Notiz"; d.updated = Date.now(); d.text = body.innerText.slice(0, 60000); await KV.set("html:" + d.id, body.innerHTML); save(); svEl.textContent = "Gespeichert"; }, 500);
  const dirty = () => { svEl.textContent = "Speichert…"; count(); doSave(); $("#cr", m).textContent = titleIn.value.trim() || "Unbenannte Notiz"; };
  body.addEventListener("input", () => { dirty(); slashCheck(); }); titleIn.addEventListener("input", dirty);
  titleIn.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); body.focus(); } });
  body.addEventListener("click", e => { if (e.target.matches("input[type=checkbox]")) { e.target.checked ? e.target.setAttribute("checked", "") : e.target.removeAttribute("checked"); dirty(); } });
  body.addEventListener("paste", e => { const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/")); if (f) { e.preventDefault(); insertImage(f); } });
  async function insertImage(f) { const bmp = await createImageBitmap(f), s = Math.min(1, 1100 / bmp.width), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height); restore(); document.execCommand("insertImage", false, c.toDataURL("image/jpeg", .8)); dirty(); }
  $("#imgin", m).onchange = e => { if (e.target.files[0]) insertImage(e.target.files[0]); e.target.value = ""; };
  const exec = (c, v) => { restore(); if (c === "insertHTML") { const sl = getSelection(); if (sl.rangeCount && !sl.isCollapsed) sl.collapseToEnd(); } document.execCommand(c, false, v); dirty(); };
  const sel = () => (saved?.toString() || "").trim();
  const run = k => aiTool(k, sel() || body.innerText, { title: d.title, subjectId: d.subjectId, insert: h => { body.insertAdjacentHTML("beforeend", h); dirty(); }, replace: t => { restore(); document.execCommand("insertText", false, t); dirty(); } });
  const CMD = {
    p: () => exec("formatBlock", "p"), h1: () => exec("formatBlock", "h1"), h2: () => exec("formatBlock", "h2"), h3: () => exec("formatBlock", "h3"),
    bold: () => exec("bold"), italic: () => exec("italic"), underline: () => exec("underline"), strike: () => exec("strikeThrough"), sub: () => exec("subscript"), sup: () => exec("superscript"),
    hilite: () => { const cur = document.queryCommandValue("hiliteColor"); exec("hiliteColor", /255, 241, 168|#fff1a8/i.test(cur) ? "transparent" : "#fff1a8"); },
    ul: () => exec("insertUnorderedList"), ol: () => exec("insertOrderedList"), todo: () => exec("insertHTML", '<ul class="chk"><li><input type="checkbox">&nbsp;</li></ul>'),
    quote: () => exec("formatBlock", document.queryCommandValue("formatBlock") === "blockquote" ? "p" : "blockquote"), code: () => exec("formatBlock", document.queryCommandValue("formatBlock") === "pre" ? "p" : "pre"),
    hr: () => exec("insertHorizontalRule"), left: () => exec("justifyLeft"), center: () => exec("justifyCenter"), clear: () => exec("removeFormat"), undo: () => exec("undo"), redo: () => exec("redo"),
    link: async () => { const u = await ask("Link-Adresse", { value: "https://", ok: "Einfügen" }); if (u) exec("createLink", u); },
    image: () => $("#imgin", m).click(), table: () => exec("insertHTML", `<table><tbody>${"<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>".repeat(3)}</tbody></table><p><br></p>`),
    formula: () => { const { el } = modal(`<h3>Formeln & Symbole</h3><div class="syms">${SYMS.map(s => `<button>${s}</button>`).join("")}</div><p class="note">Tipp: „x²“ und „x₂“ findest du unter Einfügen.</p>`); $$(".syms button", el).forEach(sb => sb.onclick = () => { restore(); document.execCommand("insertText", false, sb.textContent); dirty(); }); },
    "ai-edit": () => openAiBar(), "ai-summary": () => run("summary"), "ai-cards": () => run("cards"), "ai-quiz": () => run("quiz"), "ai-goals": () => run("goals"),
  };
  const noFocus = e => e.preventDefault();
  $$(".tbtn[data-c], .tt", m).forEach(b => b.onmousedown = noFocus);
  $$(".tbtn[data-c]", m).forEach(b => b.onclick = () => CMD[b.dataset.c]?.());
  $("#cin", m).oninput = e => { $("#cl", m).style.borderColor = e.target.value; exec("foreColor", e.target.value); }; $("#cin", m).onclick = e => e.stopPropagation(); $("#cl", m).parentElement.onclick = () => $("#cin", m).click();
  $("#t-blk", m).onclick = e => menu(e.currentTarget, [{ label: "Text", fn: CMD.p }, { label: "Überschrift 1", fn: CMD.h1 }, { label: "Überschrift 2", fn: CMD.h2 }, { label: "Überschrift 3", fn: CMD.h3 }, "-", { label: "Zitat", icon: "quote", fn: CMD.quote }, { label: "Code", icon: "code", fn: CMD.code }]);
  $("#t-ins", m).onclick = e => menu(e.currentTarget, [{ label: "Bild", icon: "image", fn: CMD.image }, { label: "Tabelle", icon: "table", fn: CMD.table }, { label: "Link", icon: "link", fn: CMD.link }, { label: "Formel / Symbol", icon: "text", fn: CMD.formula }, "-", { label: "Trennlinie", icon: "hrule", fn: CMD.hr }, { label: "Hochgestellt x²", fn: CMD.sup }, { label: "Tiefgestellt x₂", fn: CMD.sub }, { label: "Linksbündig", icon: "alignl", fn: CMD.left }, { label: "Zentriert", icon: "alignc", fn: CMD.center }, "-", { label: "Formatierung entfernen", icon: "rot", fn: CMD.clear }]);
  $("#t-paper", m).onclick = e => menu(e.currentTarget, [["white", "Weiß"], ["lines", "Liniert"], ["grid", "Kariert"], ["dots", "Punkte"]].map(([k, l]) => ({ label: l, icon: paperOf() === k ? "check" : "", fn: () => { d.paper = k; D.profile.paper = k; $("#paperc", m).className = "ned-paper p-" + k; save(); } })));
  $(".ed-sub", m).onchange = e => { d.subjectId = e.target.value; save(); refreshNav(); };
  $$("[data-p]", m).forEach(b => b.onclick = () => go("docs/" + b.dataset.p));
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || "")); $("#done", m).onclick = () => go("docs/" + (d.folderId || ""));
  $("#cr", m).onclick = () => titleIn.focus();

  /* floating selection menu */
  const bub = document.createElement("div"); bub.className = "bubble"; bub.hidden = true; document.body.appendChild(bub); LEAVE.push(() => bub.remove());
  bub.innerHTML = [["bold", "bold"], ["italic", "italic"], ["underline", "underline"], ["hilite", "hl"], ["link", "link"]].map(([c, i]) => `<button data-b="${c}">${ic(i)}</button>`).join("") + `<i class="sep"></i><button data-bai>${ic("spark")}<span>KI</span></button>`;
  bub.onmousedown = e => e.preventDefault();
  $$("[data-b]", bub).forEach(b => b.onclick = () => CMD[b.dataset.b]());
  $("[data-bai]", bub).onclick = () => openAiBar();
  function updBubble() { const s = getSelection(); if (!bub.isConnected) return; if (!s.rangeCount || s.isCollapsed || !body.contains(s.anchorNode) || !s.toString().trim()) { bub.hidden = true; return; } const r = s.getRangeAt(0).getBoundingClientRect(); bub.hidden = false; const w = bub.offsetWidth; bub.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px"; bub.style.top = Math.max(8, r.top - bub.offsetHeight - 10) + "px"; }

  /* inline AI edit bar (right-click, selection, Ctrl+J, space on an empty line) */
  const HLS = window.CSS && CSS.highlights && window.Highlight ? new Highlight() : null; if (HLS) CSS.highlights.set("lumi-ai", HLS);
  LEAVE.push(() => { try { CSS.highlights?.delete("lumi-ai"); } catch {} });
  const QA = [["Kürzer", "Kürze den Text auf das Wesentliche."], ["Ausführlicher", "Formuliere den Text ausführlicher, mit einem kurzen Beispiel."], ["Einfacher", "Formuliere den Text einfacher, so dass ihn ein Vierzehnjähriger versteht."], ["Verbessern", "Korrigiere Rechtschreibung und Grammatik und verbessere den Stil."], ["Formeller", "Formuliere den Text formeller, im Schul- bzw. Uni-Stil."], ["Auf Englisch", "Übersetze den Text ins Englische."], ["Als Liste", "Wandle den Text in eine übersichtliche Aufzählung um."]];
  const bar = document.createElement("div"); bar.className = "aibar"; bar.hidden = true; document.body.appendChild(bar); LEAVE.push(() => bar.remove());
  bar.innerHTML = `<div class="ab-in">${ic("spark")}<input aria-label="KI-Anweisung" autocomplete="off"><button class="send" aria-label="Senden">${ic("up")}</button></div><div class="ab-chips">${QA.map(([l]) => `<button type="button">${l}</button>`).join("")}</div><div class="ab-busy" hidden><span class="dots"><span></span><span></span><span></span></span><b>KI überarbeitet den Text …</b></div><div class="ab-done" hidden><b>Text aktualisiert</b><button type="button" data-k>Behalten</button><button type="button" data-u>Rückgängig</button></div>`;
  const barIn = $("input", bar); let aiR = null, aiPrev = "", aiState = "idle";
  const blockOf = node => { const el = node?.nodeType === 3 ? node.parentElement : node; const b = el?.closest?.("p,h1,h2,h3,li,blockquote,pre,td,th"); return b && body.contains(b) ? b : null; };
  const setTarget = r => { aiR = r; if (HLS) { HLS.clear(); if (r && !r.collapsed) HLS.add(r); } };
  const closeAi = () => { bar.hidden = true; aiState = "idle"; HLS?.clear(); };
  const panel = w => { $(".ab-in", bar).hidden = w !== "idle"; $(".ab-chips", bar).hidden = w !== "idle" || !aiR || aiR.collapsed; $(".ab-busy", bar).hidden = w !== "busy"; $(".ab-done", bar).hidden = w !== "done"; };
  function openAiBar(pt) {
    const s = getSelection(); let r = null;
    if (s.rangeCount && !s.isCollapsed && body.contains(s.anchorNode)) r = s.getRangeAt(0).cloneRange();
    else if (saved && !saved.collapsed && !pt) r = saved.cloneRange();
    else { let node = null; if (pt && document.caretRangeFromPoint) node = document.caretRangeFromPoint(pt.x, pt.y)?.startContainer; if (!node) node = s.rangeCount && body.contains(s.anchorNode) ? s.anchorNode : saved?.startContainer; const blk = blockOf(node); if (blk) { r = document.createRange(); r.selectNodeContents(blk); } else if (saved) r = saved.cloneRange(); }
    if (!r) { r = document.createRange(); r.selectNodeContents(body.lastElementChild || body); r.collapse(false); }
    setTarget(r); aiState = "idle"; panel("idle"); barIn.value = ""; barIn.placeholder = r.collapsed || !r.toString().trim() ? "Was soll die KI schreiben? z. B. „Definition von Photosynthese“" : "Was soll die KI ändern? z. B. „kürzer“, „mit Beispiel“, „auf Englisch“";
    let rects = [...r.getClientRects()].filter(x => x.height > 0); if (!rects.length) { const bl = blockOf(r.startContainer); if (bl) rects = [bl.getBoundingClientRect()]; }
    const last = rects[rects.length - 1] || (pt ? { left: pt.x, top: pt.y, bottom: pt.y } : body.getBoundingClientRect());
    bar.hidden = false; const w = bar.offsetWidth, h = bar.offsetHeight;
    bar.style.left = Math.max(8, Math.min(innerWidth - w - 8, (rects[0]?.left ?? last.left))) + "px";
    bar.style.top = (last.bottom + 12 + h > innerHeight ? Math.max(8, (rects[0]?.top ?? last.top) - h - 12) : last.bottom + 12) + "px";
    setTimeout(() => barIn.focus(), 20);
  }
  async function sendAi(instr) {
    instr = (instr || "").trim(); if (!instr || aiState === "busy" || !aiR) return; aiState = "busy"; panel("busy");
    const text = aiR.toString().trim();
    const prompt = text ? `Anweisung: ${instr}\n\nBearbeite den folgenden Text entsprechend. Gib NUR den neuen Text zurück (ohne Kommentar, ohne Anführungszeichen), in derselben Sprache wie der Text (außer die Anweisung verlangt eine Übersetzung) und behalte Fachbegriffe bei. Dokumenttitel: ${d.title}.\n\nTEXT:\n${text}` : `Schreibe (kurz und prägnant, auf Deutsch) passend zum Dokument „${d.title}“: ${instr}\nGib NUR den Text zurück, ohne Einleitung.\n\nBISHERIGER INHALT (Auszug):\n${body.innerText.slice(0, 1500)}`;
    let res = await ai(prompt, { system: sysBase("You are an inline writing assistant inside a note editor."), max: 1200, quiet: true });
    if (res == null) res = localEdit(instr, text);
    if (res == null) { toast(hasKey() ? "Die KI hat nicht geantwortet." : "Für diese KI-Änderung brauchst du einen API-Key (Einstellungen)."); aiState = "idle"; panel("idle"); return; }
    res = res.trim().replace(/^["„“]|["“”]$/g, ""); aiPrev = body.innerHTML;
    const s = getSelection(); s.removeAllRanges(); s.addRange(aiR); body.focus();
    const blk = blockOf(aiR.startContainer), simple = /^(H[1-3]|LI|TD|TH)$/.test(blk?.tagName || "");
    if (res.includes("\n") && !simple) document.execCommand("insertHTML", false, textToHtml(res)); else document.execCommand("insertText", false, res.replace(/\s*\n\s*/g, " "));
    dirty(); HLS?.clear(); aiState = "done"; panel("done");
    const sr = getSelection(), nb = sr.rangeCount ? blockOf(sr.anchorNode) : null; if (nb) { const rc = nb.getBoundingClientRect(), bh = bar.offsetHeight; bar.style.top = (rc.bottom + 12 + bh > innerHeight ? Math.max(8, rc.top - bh - 12) : rc.bottom + 12) + "px"; }
  }
  $(".send", bar).onclick = () => sendAi(barIn.value); barIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); sendAi(barIn.value); } else if (e.key === "Escape") closeAi(); };
  $$(".ab-chips button", bar).forEach((b, i) => b.onclick = () => sendAi(QA[i][1]));
  $("[data-k]", bar).onclick = closeAi; $("[data-u]", bar).onclick = () => { body.innerHTML = aiPrev; dirty(); closeAi(); };
  const outside = e => { if (!bar.hidden && aiState !== "busy" && !bar.contains(e.target)) closeAi(); };
  document.addEventListener("mousedown", outside, true); LEAVE.push(() => document.removeEventListener("mousedown", outside, true));
  body.addEventListener("contextmenu", e => { e.preventDefault(); openAiBar({ x: e.clientX, y: e.clientY }); });
  body.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") { e.preventDefault(); openAiBar(); return; }
    if (e.key === " " && !e.ctrlKey && !e.metaKey && sm.hidden) { const s = getSelection(), blk = blockOf(s.anchorNode); if (blk && s.isCollapsed && !blk.textContent.trim() && blk.tagName === "P" && !blk.querySelector("img,table,input")) { e.preventDefault(); openAiBar(); } }
  });

  /* slash menu */
  const SLASH = [["Text", "p", "text absatz"], ["Überschrift 1", "h1", "h1 titel ueberschrift"], ["Überschrift 2", "h2", "h2 ueberschrift"], ["Überschrift 3", "h3", "h3 ueberschrift"], ["Aufzählung", "ul", "liste bullet punkte"], ["Nummerierte Liste", "ol", "liste nummer"], ["Checkliste", "todo", "todo aufgaben check"], ["Tabelle", "table", "tabelle raster"], ["Zitat", "quote", "zitat"], ["Code", "code", "code"], ["Trennlinie", "hr", "linie trenner"], ["Bild", "image", "bild foto"], ["Formel / Symbol", "formula", "formel symbol mathe"], ["KI: Schreiben / ändern…", "ai-edit", "ki schreiben aendern bearbeiten"], ["KI: Zusammenfassung", "ai-summary", "ki summary zusammenfassung"], ["KI: Karteikarten", "ai-cards", "ki karten lernkarten"], ["KI: Quiz", "ai-quiz", "ki quiz test"], ["KI: Lernziele", "ai-goals", "ki lernziele"]];
  const sm = document.createElement("div"); sm.className = "slash"; sm.hidden = true; document.body.appendChild(sm); LEAVE.push(() => sm.remove()); let sIdx = 0, sItems = [], sCtx = null;
  function slashCheck() {
    const s = getSelection(); if (!s.rangeCount || !s.isCollapsed || s.anchorNode?.nodeType !== 3 || !body.contains(s.anchorNode)) return slashHide();
    const before = s.anchorNode.textContent.slice(0, s.anchorOffset), mm = before.match(/(?:^|\s)\/([a-zäöüß0-9]*)$/i); if (!mm) return slashHide();
    const q = mm[1].toLowerCase(); sItems = SLASH.filter(([n, , kw]) => !q || (n + " " + kw).toLowerCase().includes(q)); if (!sItems.length) return slashHide();
    sCtx = { node: s.anchorNode, end: s.anchorOffset, len: q.length + 1 }; sIdx = 0; slashDraw();
    const r = s.getRangeAt(0).cloneRange(); r.collapse(true); let rc = r.getBoundingClientRect(); if (!rc.height) rc = s.anchorNode.parentElement.getBoundingClientRect();
    sm.hidden = false; sm.style.left = Math.min(innerWidth - sm.offsetWidth - 8, Math.max(8, rc.left)) + "px"; sm.style.top = (rc.bottom + 6 + sm.offsetHeight > innerHeight ? Math.max(8, rc.top - sm.offsetHeight - 6) : rc.bottom + 6) + "px";
  }
  const slashHide = () => { sm.hidden = true; sCtx = null; };
  function slashDraw() { sm.innerHTML = `<small>Blöcke</small>` + sItems.map(([n, k], i) => `<button data-k="${k}" class="${i === sIdx ? "on" : ""}">${n}</button>`).join(""); $$("button", sm).forEach(b => { b.onmousedown = e => { e.preventDefault(); slashPick(b.dataset.k); }; }); sm.querySelector(".on")?.scrollIntoView({ block: "nearest" }); }
  function slashPick(k) { if (!sCtx) return; const r = document.createRange(); r.setStart(sCtx.node, sCtx.end - sCtx.len); r.setEnd(sCtx.node, sCtx.end); r.deleteContents(); saved = r.cloneRange(); slashHide(); CMD[k]?.(); }
  body.addEventListener("keydown", e => { if (sm.hidden) return; if (e.key === "ArrowDown") { e.preventDefault(); sIdx = (sIdx + 1) % sItems.length; slashDraw(); } else if (e.key === "ArrowUp") { e.preventDefault(); sIdx = (sIdx - 1 + sItems.length) % sItems.length; slashDraw(); } else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); slashPick(sItems[sIdx][1]); } else if (e.key === "Escape") slashHide(); });
  body.addEventListener("blur", () => setTimeout(slashHide, 150));

  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Text mit KI schreiben / ändern…", icon: "spark", fn: () => openAiBar() }, "-", { label: "Zusammenfassen", icon: "list", fn: () => run("summary") }, { label: "Einfach erklären", icon: "help", fn: () => run("explain") }, { label: "Verbessern & korrigieren", icon: "pen", fn: () => run("improve") }, { label: "Weiterschreiben", icon: "spark", fn: () => run("continue") }, { label: "Übersetzen…", icon: "rot", fn: () => run("translate") }, { label: "Frage zum Text…", icon: "search", fn: () => run("ask") }, "-", { label: "Lernziele ermitteln", icon: "star", fn: () => run("goals") }, { label: "Karteikarten erstellen", icon: "cards", fn: () => run("cards") }, { label: "Quiz erstellen", icon: "help", fn: () => run("quiz") }]);
  const dl = (name, mime, data) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const printIt = () => { const w = open("", "_blank"); if (!w) return toast("Pop-up erlaubt?"); w.document.write(`<title>${esc(d.title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 20px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 10px}img{max-width:100%}pre{background:#f3f3f3;padding:12px;border-radius:8px}blockquote{border-left:4px solid #ccc;margin:0;padding-left:14px;color:#555}ul.chk{list-style:none;padding-left:4px}</style><h1>${esc(d.title)}</h1>${body.innerHTML}`); w.document.close(); setTimeout(() => w.print(), 400); };
  const outlineModal = () => { const hs = $$("h1,h2,h3", body); const { el, close } = modal(`<h3>Gliederung</h3><div class="outline">${hs.length ? hs.map((h, i) => `<button class="o${h.tagName[1]}" data-o="${i}">${esc(h.textContent.trim() || "…")}</button>`).join("") : `<p class="note">Noch keine Überschriften. Tippe „/“ → Überschrift.</p>`}</div>`); $$("[data-o]", el).forEach(b => b.onclick = () => { close(); hs[+b.dataset.o].scrollIntoView({ behavior: "smooth", block: "center" }); }); };
  $("#mo-m", m).onclick = e => menu(e.currentTarget, [{ label: "Gliederung", icon: "list", fn: outlineModal }, { label: "Als PDF drucken", icon: "file", fn: printIt }, { label: "Als Textdatei (.txt)", icon: "note", fn: () => dl(d.title + ".txt", "text/plain", body.innerText) }, { label: "Als HTML-Datei", icon: "code", fn: () => dl(d.title + ".html", "text/html", `<meta charset="utf-8"><title>${esc(d.title)}</title>${body.innerHTML}`) }, "-", { label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); toast(d.pinned ? "Angeheftet" : "Gelöst"); } }, { label: "Duplizieren", icon: "copy", fn: async () => { const id = uid(); D.docs.unshift({ ...d, id, title: d.title + " (Kopie)", created: Date.now(), updated: Date.now(), msId: undefined, source: undefined, pinned: false }); await KV.set("html:" + id, body.innerHTML); save(); go("doc/" + id); } }, "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); go("docs/" + (d.folderId || "")); } }]);
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
  if (!body.innerHTML.trim()) body.innerHTML = "<p><br></p>";
  count(); if (!html || !html.trim()) (titleIn.value ? body : titleIn).focus();
}

/* ---------- file viewer ---------- */
async function fileViewer(m, d) {
  const blob = await KV.get("blob:" + d.id); const url = blob ? URL.createObjectURL(blob) : "";
  const isImg = /^image\//.test(d.mime), isPdf = d.mime === "application/pdf" || /\.pdf$/i.test(d.title), isTxt = /^text\//.test(d.mime) || /\.(txt|md|csv)$/i.test(d.title);
  m.innerHTML = `<div class="editor"><div class="ed-head"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><input class="ed-title" id="et" value="${esc(d.title)}">${subjectSelect(d.subjectId, "ed-sub")}<button class="btn ghost" id="ai-m">${ic("spark")}KI</button><a class="btn ghost" href="${url}" download="${esc(d.title)}">${ic("download")}<span class="hide-sm">Laden</span></a><button class="icon-btn" id="del" aria-label="Löschen">${ic("trash")}</button></div>
  <div class="viewer">${!blob ? `<p class="empty">Datei nicht gefunden.</p>` : isImg ? `<img src="${url}" alt="${esc(d.title)}">` : isPdf ? `<iframe src="${url}" title="${esc(d.title)}"></iframe>` : isTxt ? `<pre id="txtv">Lädt…</pre>` : `<div class="emptybox"><div class="big-ic">${ic("file")}</div><h3>${esc(d.title)}</h3><p>${(d.size / 1024).toFixed(0)} KB – für diesen Dateityp gibt es keine Vorschau. Lade die Datei herunter.</p></div>`}</div></div>`;
  if (isTxt && blob) blob.text().then(t => $("#txtv", m).textContent = t);
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || "")); $("#del", m).onclick = async () => { await deleteDoc(d); go("docs/" + (d.folderId || "")); };
  $("#et", m).onchange = e => { d.title = e.target.value.trim() || d.title; d.updated = Date.now(); save(); };
  $(".ed-sub", m).onchange = e => { d.subjectId = e.target.value; save(); refreshNav(); };
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Zusammenfassen", icon: "list", fn: async () => aiTool("summary", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Einfach erklären", icon: "help", fn: async () => aiTool("explain", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Frage zum Dokument…", icon: "search", fn: async () => aiTool("ask", await docText(d), { title: d.title }) }, "-", { label: "Karteikarten erstellen", icon: "cards", fn: async () => aiTool("cards", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Quiz erstellen", icon: "help", fn: async () => aiTool("quiz", await docText(d), { title: d.title, subjectId: d.subjectId }) }, ...(isImg ? [{ label: "Bild von der KI erklären lassen", icon: "camera", fn: async () => { const r = await explainImage(blob); if (r) modal(`<h3>KI-Erklärung</h3><div class="result">${esc(r)}</div>`, "wide"); } }] : [])]);
}
async function blobToJpeg(b, max = 1400) { const bmp = await createImageBitmap(b), s = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .85).split(",")[1]; }
async function explainImage(b) { if (!hasKey()) { toast("Bild-Analyse braucht einen API-Key (Einstellungen)."); return null; } toast("KI schaut sich das Bild an…"); return ai("Beschreibe und erkläre, was auf dem Bild zu sehen ist (Aufgabe, Skizze, Tafelbild o. Ä.). Falls es eine Aufgabe ist, gib Hinweise zum Lösungsweg statt nur das Ergebnis.", { image: { data: await blobToJpeg(b), type: "image/jpeg" } }); }
