"use strict";
/* Lumi study app – shell, dashboard, documents, note editor, file viewer, AI tools */

const V = {};            // view registry: V.name(main, ...args)
let docFilter = "";      // current subject filter
const COLORS = ["#0a78ee", "#f2920c", "#0e9f6e", "#7c3aed", "#d6249f", "#dc2626", "#0891b2", "#475569", "#5b3df5", "#ff6a3d"];
const PRESETS = {
  school: ["Mathe", "Deutsch", "Englisch", "Biologie", "Chemie", "Physik", "Geschichte", "Geografie", "Informatik", "Kunst", "Musik", "Sport", "Politik", "Französisch", "Latein", "Spanisch", "Religion/Ethik"],
  uni: ["Analysis", "Lineare Algebra", "Programmierung", "Statistik", "BWL", "VWL", "Recht", "Psychologie", "Medizin", "Chemie", "Physik", "Informatik", "Literatur", "Geschichte", "Seminar"],
};
const NAVS = [["today", "Heute", "home"], ["docs", "Dokumente", "folder"], ["exams", "Prüfungen", "book"], ["planner", "Planer", "cal"], ["grades", "Noten", "award"], ["focus", "Fokus", "timer"], ["ai", "Lumi AI", "sparkO"], ["search", "Suche", "search"]];

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
  ${msReady() ? `<div class="ob-ms"><button class="ms-btn" id="ob-ms" type="button">${msLogoSvg()}<span>Mit Microsoft anmelden (optional)</span></button><small>Importiert Termine, Prüfungen und OneNote automatisch.</small></div>` : ""}<div class="row end" style="margin-top:22px"><button class="btn big accent" id="ob-go">Los geht's</button></div>`, "wide");
  $("#ob-ms", el) && ($("#ob-ms", el).onclick = async () => { await msQuickLogin(); });
  const drawChips = () => { $("#ob-s", el).innerHTML = PRESETS[level].map(s => `<button class="chip ${picked.has(s) ? "on" : ""}" data-s="${esc(s)}">${esc(s)}</button>`).join(""); $$("[data-s]", el).forEach(b => b.onclick = () => { picked.has(b.dataset.s) ? picked.delete(b.dataset.s) : picked.add(b.dataset.s); b.classList.toggle("on"); }); $("#ob-sl", el).textContent = level === "uni" ? "Meine Module" : "Meine Fächer"; };
  drawChips();
  $$("#ob-l button", el).forEach(b => b.onclick = () => { level = b.dataset.l; picked.clear(); $$("#ob-l button", el).forEach(x => x.classList.toggle("on", x === b)); drawChips(); });
  $("#ob-go", el).onclick = () => {
    D.profile.name = $("#ob-n", el).value.trim(); D.profile.level = level; D.profile.onboarded = true;
    [...picked].forEach((n, i) => { const sid = uid(), c = COLORS[i % COLORS.length]; D.subjects.push({ id: sid, name: n, color: c }); D.folders.push({ id: uid(), name: n, parent: "", color: c, subjectId: sid }); }); D.foldersInit = true;
    const wid = uid(); D.docs.unshift({ id: wid, type: "note", title: "Willkommen bei Lumi", subjectId: "", folderId: "", paper: "white", updated: Date.now(), created: Date.now(), text: "" });
    const w = `<h1>Willkommen bei Lumi</h1><p>Das ist deine erste Notiz. Probiere die Werkzeuge oben aus:</p><ul class="chk"><li><input type="checkbox"> Text <b>fett</b>, <i>kursiv</i> oder <mark>markiert</mark> machen</li><li><input type="checkbox"> Eine Tabelle oder ein Bild einfügen</li><li><input type="checkbox"> Mit <b>Lumi AI</b> eine Zusammenfassung oder Karteikarten erstellen</li><li><input type="checkbox"> Oben rechts auf <b>Zeichnen</b> wechseln und Skizzen direkt in die Notiz malen</li><li><input type="checkbox"> Im <b>Planer</b> Hausaufgaben und Prüfungen eintragen</li></ul><p>Tipp: Mit Strg/Cmd + K findest du alles blitzschnell.</p>`;
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
  app.innerHTML = `<div class="shell"><aside class="side" id="side"></aside><main class="main" id="main"></main><aside class="aipane" id="aipane" hidden></aside></div><div class="timer-pill" id="tpill" hidden></div><button class="tfab" id="tfab" aria-label="Lumi AI">${ic("spark")}<span>Lumi AI</span></button><div class="chat-panel" id="cpanel" hidden></div><input type="file" id="upl" multiple hidden>`;
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
  const mob = [["today", "Heute", "home"], ["docs", "Dokumente", "folder"], ["exams", "Prüfungen", "book"], ["planner", "Planer", "cal"]];
  const on = k => curView === k || (k === "docs" && curView === "doc") || (k === "board" && curView === "draw") || (k === "exams" && ["exam", "quiz", "quizrun", "cards", "deck", "study"].includes(curView));
  s.innerHTML = `<div class="rail-top"><button class="rail-tgl" id="sidetgl" aria-label="Seitenleiste ein- oder ausklappen" title="Seitenleiste ein-/ausklappen">${ic("menu")}</button><span class="brand">Lumi</span><span class="lvl">${isUni() ? "Studium" : "Schule"}</span></div>
  <button class="btn-new" id="newbtn" title="Neu erstellen">${ic("plus")}<span class="nl">Neu</span></button>
  <div class="nav-grp">${NAVS.map(([k, l, i]) => `<button class="nav-i ${on(k) ? "on" : ""} ${["board", "quiz", "grades", "focus", "search", "settings"].includes(k) ? "hide-mob" : ""}" data-go="${k}" title="${l}">${ic(on(k) && ({ home: "home-f", folder: "folder-f", note: "note-f", sparkO: "spark" })[i] || i)}<span class="nl">${l}</span>${k === "cards" && dueCardCount() ? `<b class="badge">${dueCardCount()}</b>` : ""}</button>`).join("")}
  <button class="nav-i mob-only" id="morebtn">${ic("more")}<span class="nl">Mehr</span></button></div>
  <div class="sp hide-mob"></div>
  <button class="nav-i prof hide-mob ${curView === "settings" ? "on" : ""}" id="profbtn" title="Profil"><span class="av">${esc((D.profile.name || (CLOUD.user?.email) || "L").trim()[0].toUpperCase())}</span><span class="nl pn"><b>${esc(D.profile.name || "Profil")}</b><small>${esc(CLOUD.user?.email || "Nicht angemeldet")}</small></span></button>`;
  $$("[data-go]", s).forEach(b => b.onclick = () => { if (b.dataset.go === "docs") docFolder = ""; go(b.dataset.go); });
  $("#newbtn", s).onclick = e => newMenu(e.currentTarget);
  $("#profbtn", s).onclick = e => menu(e.currentTarget, [{ label: "Einstellungen", icon: "gear", fn: () => go("settings") }, ...(CLOUD.user ? [{ label: "Abmelden", icon: "x", fn: cloudLogout }] : cloudOn() ? [{ label: "Anmelden", icon: "adduser", fn: cloudLoginModal }] : [])]);
  $("#sidetgl", s).onclick = () => { sideOpen = !sideOpen; try { localStorage.setItem("lumi-side", sideOpen ? "1" : "0"); } catch {} applyRail(); };
  $("#morebtn", s).onclick = e => menu(e.currentTarget, [...NAVS, ["settings", "Einstellungen", "gear"]].filter(n => !mob.find(m => m[0] === n[0])).map(([k, l, i]) => ({ label: l, icon: i, fn: () => go(k) })));
}
function newMenu(anchor) {
  menu(anchor, [
    { label: "Mit Lumi AI erstellen …", icon: "spark", fn: () => openAiCommand() }, "-", { label: "Neue Notiz", icon: "newnote", fn: () => docDialog("note") }, { label: "Neue Datenbank", icon: "table", fn: () => newDatabaseMenu($("#newbtn")) }, { label: "Neuer Ordner", icon: "folder", fn: () => newFolder() },
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
const PAPERS = [["white", "Leer"], ["lines", "Liniert"], ["grid", "Kariert"], ["dots", "Punkte"]];
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
    { label: "Farbe ändern", icon: "brush", fn: () => { const { el } = modal(`<h3>Farbe</h3><div class="chips" style="gap:12px">${COLORS.map(c => `<button class="cdot ${c === f.color ? "on" : ""}" data-c="${c}" style="background:${c};width:38px;height:38px"></button>`).join("")}</div>`); $$("[data-c]", el).forEach(b => b.onclick = () => { f.color = b.dataset.c; $$("[data-c]", el).forEach(x => x.classList.toggle("on", x === b)); save(); if (curView === "docs") V.docs($("#main")); }); } },
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
  D.docs = D.docs.filter(x => x.id !== d.id); ["html:", "blob:", "draw:", "ink:", "ann:", "db:"].forEach(p => KV.del(p + d.id)); save(); toast("Gelöscht"); refreshNav();
}
const fileIcon = d => { const e = (d.title.split(".").pop() || "").toLowerCase(); return /pdf/.test(e) ? ["PDF", "#e5484d"] : /docx?/.test(e) ? ["DOC", "#2563eb"] : /pptx?/.test(e) ? ["PPT", "#f97316"] : /xlsx?|csv/.test(e) ? ["XLS", "#16a34a"] : /txt|md/.test(e) ? ["TXT", "#64748b"] : [e.slice(0, 4).toUpperCase() || "FILE", "#64748b"]; };
const DTYPES = [["all", "Alle"], ["note", "Notizen"], ["pdf", "PDFs"], ["db", "Datenbanken"], ["draw", "Skizzen"], ["file", "Dateien"]];
const docKind = d => d.type === "note" ? "note" : d.type === "db" ? "db" : d.type === "draw" ? "draw" : /pdf$/i.test(d.title) || d.mime === "application/pdf" ? "pdf" : "file";
const KIND_L = { note: "Notiz", db: "Datenbank", draw: "Skizze", pdf: "PDF", file: "Datei" };
const KIND_I = { note: "note", db: "table", draw: "brush", pdf: "file", file: "file" };
function docRow(d) {
  const s = subj(d.subjectId), k = docKind(d);
  return `<div class="drow" data-d="${d.id}" draggable="true"><span class="dr-i">${ic(KIND_I[k])}${d.share ? `<i class="shbadge" title="Geteilt">${ic("adduser")}</i>` : ""}</span><span class="dr-t"><b>${d.pinned ? `<i class="pin">${ic("star")}</i>` : ""}${esc(d.title)}</b><small>${esc(docPath(d) || "Home")}</small></span><span class="dr-k">${KIND_L[k]}</span><span class="dr-s">${s ? `<i class="sdot" style="background:${s.color}"></i>${esc(s.name)}` : ""}</span><span class="dr-a">${fmtAgo(d.updated)}</span><button class="dmore" data-m="${d.id}" aria-label="Mehr">${ic("more")}</button></div>`;
}
function docCard(d) {
  const s = subj(d.subjectId);
  let thumb;
  if (d.type === "note") thumb = `<div class="th note-th">${esc((d.text || "").slice(0, 150)) || `<span class="ph"></span>`}</div>`;
  else if (d.type === "db") thumb = `<div class="th file-th"><b style="background:#5b3df5">${ic("table")}</b></div>`;
  else if (d.type === "draw") thumb = `<div class="th" style="background:#fff center/contain no-repeat url(${d.thumb || ""})"></div>`;
  else if (d.thumb) thumb = `<div class="th" style="background:#f3f3f5 center/cover url(${d.thumb})"></div>`;
  else { const [l, c] = fileIcon(d); thumb = `<div class="th file-th"><b style="background:${c}">${esc(l)}</b></div>`; }
  return `<div class="doc" data-d="${d.id}" draggable="true"><span class="tbadge">${ic(KIND_I[docKind(d)])}${KIND_L[docKind(d)]}</span>${d.share ? `<span class="shbadge on-card" title="Geteilt">${ic("adduser")}</span>` : ""}${thumb}<div class="dm"><div class="dt">${d.pinned ? `<span class="pin">${ic("star")}</span>` : ""}${esc(d.title)}</div><div class="ds">${s ? `<span class="sdot" style="background:${s.color}"></span>${esc(s.name)} · ` : ""}${fmtAgo(d.updated)}</div></div><button class="dmore" data-m="${d.id}" aria-label="Mehr">${ic("more")}</button></div>`;
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
function countUp(el, to, ms = 900) { if (!el) return; const t0 = performance.now(); const f = t => { const k = Math.min(1, (t - t0) / ms); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
function dailyCtx({ lessons, evToday, exams, due, mins, goal }) {
  const t = iso(), open = D.tasks.filter(x => !x.done);
  return [`Datum: ${t}`, `Stunden heute: ${lessons.map(e => `${e.start} ${e.title || subj(e.subjectId)?.name || "Stunde"}`).join(", ") || "keine"}`, `Termine (Outlook): ${evToday.map(e => `${e.time || ""} ${e.title}`).join(", ") || "keine"}`, `Offene Aufgaben: ${open.slice(0, 10).map(x => `${x.title}${x.due ? " (bis " + x.due + ")" : ""}`).join("; ") || "keine"}`, `Prüfungen: ${exams.map(x => `${x.title} in ${daysUntil(x.due)} Tagen`).join("; ") || "keine anstehend"}`, `Fällige Karteikarten: ${due}`, `Gelernt heute: ${mins} von ${goal} Minuten`].join("\n");
}
function dailyLocal({ lessons, evToday, open, exams, due, mins, goal }) {
  const parts = [], t = open.filter(x => x.due && daysUntil(x.due) <= 0);
  if (exams[0]) parts.push(`${exams[0].title} steht in ${daysUntil(exams[0].due)} ${daysUntil(exams[0].due) === 1 ? "Tag" : "Tagen"} an.`);
  const n = lessons.length + evToday.length; if (n) parts.push(`Heute hast du ${n} ${n === 1 ? "Termin" : "Termine"}.`);
  if (t.length) parts.push(`${t.length} ${t.length === 1 ? "Aufgabe ist" : "Aufgaben sind"} heute fällig – fang mit „${t[0].title}“ an.`); else if (open.length) parts.push(`${open.length} ${open.length === 1 ? "Aufgabe ist" : "Aufgaben sind"} offen, nichts davon ist dringend.`);
  if (due) parts.push(`${due} Karteikarten warten auf dich.`);
  if (mins < goal) parts.push(`Bis zu deinem Tagesziel fehlen noch ${goal - mins} Minuten.`); else parts.push("Dein Tagesziel hast du schon erreicht.");
  return parts.slice(0, 2).join(" ") || "Nichts Dringendes – ein guter Moment zum Lernen.";
}
V.today = m => {
  const t = iso(), wd = (new Date().getDay() + 6) % 7, h = new Date().getHours(), goal = D.profile.goalMin || 45;
  const lessons = D.tt.filter(e => e.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const open = D.tasks.filter(x => !x.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
  const allEx = open.filter(x => x.type === "exam" && x.due && daysUntil(x.due) >= 0).sort((a, b) => a.due.localeCompare(b.due)), exams = allEx.slice(0, 2);
  const mins = D.stats.days[t] || 0, due = dueCardCount(), evToday = msEventsOn(t), todayTasks = open.filter(x => x.due && daysUntil(x.due) <= 0);
  const recent = [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 6);
  let first = true; try { first = !sessionStorage.getItem("lumi-welcomed"); sessionStorage.setItem("lumi-welcomed", "1"); } catch {}
  const greet = (h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend") + (D.profile.name ? ", " + D.profile.name.split(" ")[0] : "");
  const words = greet.split(" ").map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
  const sub = exams[0] ? `Deine nächste Prüfung: ${esc(exams[0].title)} in ${daysUntil(exams[0].due)} ${daysUntil(exams[0].due) === 1 ? "Tag" : "Tagen"}.` : todayTasks.length ? `Heute ${todayTasks.length === 1 ? "steht 1 Aufgabe" : "stehen " + todayTasks.length + " Aufgaben"} an.` : "Nichts Dringendes – ein guter Moment zum Lernen.";
  const timeline = [...lessons.map(e => ({ t: e.start, e: e.end, n: e.title || subj(e.subjectId)?.name || "Stunde", c: subj(e.subjectId)?.color || "#999", s: e.room || "Stundenplan" })), ...evToday.map(e => ({ t: e.time || "00:00", e: e.end, n: e.title, c: "#2563eb", s: e.loc || "Outlook" }))].sort((a, b) => a.t.localeCompare(b.t));
  const PR = x => { const d = x.due ? daysUntil(x.due) : 99; return x.prio || (x.type === "exam" || d <= 0 ? "Hoch" : d <= 3 ? "Mittel" : "Niedrig"); };
  const TY = { task: "Aufgabe", hw: "Hausaufgabe", exam: "Prüfung" };
  const todayN = open.filter(x => x.due && daysUntil(x.due) <= 0).length || Math.min(open.length, 5);
  const hue = s => { let n = 0; for (const c of String(s)) n = (n * 31 + c.charCodeAt(0)) % 360; return n; };
  const thumb = d => `<div class="s-th" style="--h:${hue(d.id)}"><span>${ic(d.type === "draw" ? "brush" : d.type === "file" ? "file" : "note")}</span></div>`;
  const nextEx = exams[0];
  m.classList.add("homew");
  const icn = d => ic(d.type === "draw" ? "brush" : d.type === "file" ? "file" : "note");
  const SUGG = ["Lernplan für heute", "Quiz zum letzten Dokument", "Was zuerst lernen?"];
  const pct = Math.round(Math.min(100, mins / goal * 100)), exDays = nextEx ? daysUntil(nextEx.due) : null;
  const BLK = {
    tasks: () => `<section class="wg w-tasks rise" style="--i:2"><h2>Heute <em>${open.filter(x => x.type !== "exam").length}</em></h2><div id="todos" class="w-scroll"></div>
      <form class="z-add" id="todo-f"><span class="tc add">${ic("plus")}</span><input id="todo-i" placeholder="Aufgabe hinzufügen …" autocomplete="off" maxlength="140"><button class="link" type="button" id="addt">Mit Datum</button></form></section>`,
    cal: () => `<section class="wg w-cal rise" style="--i:3"><div class="cal-t"><h2 id="cal-m"></h2><span class="cal-nav"><button class="cal-today" id="cal-t">Heute</button><button class="icon-btn sm" id="cal-p" aria-label="Voriger Monat">${ic("back")}</button><button class="icon-btn sm nx" id="cal-n" aria-label="Nächster Monat">${ic("back")}</button></span></div><div class="cal-g" id="cal-g"></div><div class="w-cd" id="cal-d"></div></section>`,
    goal: () => `<section class="wg w-goal rise" style="--i:4"><h2>Fokus</h2>
      <div class="fd" id="fd"><svg viewBox="0 0 200 200" aria-hidden="true"><circle class="fd-bg" cx="100" cy="100" r="84"/><circle class="fd-fg" id="fd-fg" cx="100" cy="100" r="84" transform="rotate(-90 100 100)"/><g id="fd-k"><circle class="fd-knob" cx="100" cy="16" r="12"/></g></svg><div class="fd-c"><b id="fd-t">25:00</b><small id="fd-s">Ziehen zum Einstellen</small></div></div>
      <div class="fd-row"><button class="fd-go" id="fd-go">Starten</button><button class="fd-rs" id="fd-rs" hidden>Zurücksetzen</button></div>
      <p class="fd-g"><b>${mins}</b> von ${goal} Min. heute</p></section>`,
    cards: () => `<button class="wg w-cards rise" style="--i:5" data-go="cards"><h2>Karteikarten</h2><b class="w-big">${due}</b><p>${due === 1 ? "Karte ist" : "Karten sind"} fällig</p><span class="w-go">Lernen ${ic("back")}</span></button>`,
    rec: () => `<section class="wg w-rec rise" style="--i:6"><h2>Zuletzt</h2><div class="w-scroll">${recent.length ? recent.slice(0, 6).map(d => `<button class="z-doc" data-d="${d.id}"><span class="z-di">${icn(d)}</span><span><b>${esc(d.title)}</b><small>${esc(docPath(d) || "Home")} · ${fmtAgo(d.updated)}</small></span></button>`).join("") : `<p class="empty sm">Noch nichts – leg mit „Neu“ los.</p>`}</div></section>`,
    ex: () => `<section class="wg w-ex rise" style="--i:7"><h2>Prüfungen${allEx.length ? ` <em>${allEx.length}</em>` : ""}</h2>${allEx.length ? `<div class="w-scroll">${allEx.slice(0, 6).map(x => { const sj = subj(x.subjectId), dd = daysUntil(x.due); return `<button class="z-doc ex-r" data-ex="${x.id}"><span class="z-di ex-d" style="--c:${sj ? sj.color : "#0f0f12"}">${dd}</span><span><b>${esc(x.title)}</b><small>${sj ? esc(sj.name) + " · " : ""}${dd <= 0 ? "Heute" : dd === 1 ? "Morgen" : "in " + dd + " Tagen"}</small></span></button>`; }).join("")}</div><button class="link" data-go="exams">Alle Prüfungen</button>` : `<p class="empty sm">Keine Prüfung eingetragen.</p><button class="link" data-go="exams">Eintragen</button>`}</section>`,
    week: () => `<section class="wg w-week rise" style="--i:3"><h2>Woche</h2><div class="wk">${weekData().map(x => `<div class="wk-c ${x.today ? "now" : ""}"><span class="wk-b"><i style="height:${Math.max(4, Math.min(100, Math.round(x.v / goal * 100)))}%"></i></span><small>${x.l}</small></div>`).join("")}</div><p class="wk-s"><b>${weekData().reduce((a, x) => a + x.v, 0)}</b> Min. in 7 Tagen</p></section>`,
    quick: () => `<section class="wg w-quick rise" style="--i:3"><h2>Schnellstart</h2><div class="qk"><button data-q="n">${ic("note")}<span>Neue Notiz</span></button><button data-go="cards">${ic("cards")}<span>Karteikarten</span></button><button data-go="quiz">${ic("help")}<span>Quiz</span></button><button data-go="docs">${ic("folder")}<span>Dokumente</span></button></div></section>`,
    note: () => `<section class="wg w-note rise" style="--i:3"><h2>Notiz</h2><textarea id="hnote" placeholder="Schnelle Notiz …" maxlength="4000">${esc(D.profile.homeNote || "")}</textarea></section>`,
    space: () => `<div class="wg w-space" aria-hidden="true"></div>`,
  };
  const blockHtml = b => { const v = `--w:${b.w};--h:${b.h};`, h = BLK[b.type]().replace(/^<(section|button|div) class="wg /, `<$1 data-bid="${b.id}" class="wg `); return /style="--i:/.test(h) ? h.replace('style="--i:', `style="${v}--i:`) : h.replace('class="wg ', `style="${v}" class="wg `); };
  m.innerHTML = `<div class="home-wrap again"><div class="page home zen bento">
  <header class="b-head rise" style="--i:0"><div class="b-hl"><p class="z-date">${new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}</p><h1 class="greet-h z-h">${words}</h1></div>
</header>
  <div class="z-ans" id="ai-out"><p id="sum-t">${esc(dailyLocal({ lessons, evToday, open: open.filter(x => x.type !== "exam"), exams, due, mins, goal }))}</p></div>
  <div class="b-grid" id="b-grid">${homeLayout().map(blockHtml).join("")}
  </div></div></div>`;
  bindCommon(m);
  { const hn = $("#hnote", m); if (hn) { let tm; hn.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { D.profile.homeNote = hn.value; save(); }, 400); }; } }
  $$("[data-q]", m).forEach(b => b.onclick = () => docDialog("note"));
  $$("[data-ex]", m).forEach(b => b.onclick = () => go("exam/" + b.dataset.ex));
  const todoRows = () => D.tasks.filter(x => !x.done && x.type !== "exam").sort((p, q) => (p.due || "9").localeCompare(q.due || "9")).slice(0, 5);
  const dueLbl = x => !x.due ? "–" : daysUntil(x.due) === 0 ? "Heute" : daysUntil(x.due) === 1 ? "Morgen" : daysUntil(x.due) < 0 ? "Überfällig" : fmtD(x.due);
  const drawTodos = () => {
    const box = $("#todos", m); if (!box) return; const rows = todoRows();
    box.innerHTML = rows.length ? rows.map(x => `<div class="todo z-t" data-id="${x.id}"><button class="tc" role="checkbox" aria-checked="false" aria-label="${esc(x.title)} erledigt"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg></button><b>${esc(x.title)}</b><small class="${x.due && daysUntil(x.due) < 0 ? "red" : ""}">${dueLbl(x)}</small></div>`).join("") : `<p class="empty sm">Alles erledigt – nichts offen.</p>`;
    $$(".todo .tc", box).forEach(b => b.onclick = () => { const row = b.closest(".todo"), x = D.tasks.find(y => y.id === row.dataset.id); if (!x || row.classList.contains("done")) return; x.done = true; x.progress = 100; x.doneAt = Date.now(); save(); b.setAttribute("aria-checked", "true"); row.classList.add("done"); setTimeout(() => { row.style.maxHeight = row.offsetHeight + "px"; requestAnimationFrame(() => row.classList.add("gone")); setTimeout(() => { drawTodos(); refreshNav(); }, 380); }, 520); });
  };
  drawTodos();
  const tfm = $("#todo-f", m); if (tfm) tfm.onsubmit = e => { e.preventDefault(); const i = $("#todo-i", m), v = i.value.trim(); if (!v) return; D.tasks.push({ id: uid(), title: v, type: "task", due: iso(), subjectId: "", note: "", done: false }); save(); i.value = ""; drawTodos(); };
  (async () => {
    const el = $("#sum-t", m), run = async force => {
      const cache = D.daily && D.daily.date === iso() ? D.daily : null; if (cache && cache.ai && !force) { el.textContent = cache.text; return; } if (!hasKey()) return;
      el.classList.add("busy"); const ctx = dailyCtx({ lessons, evToday, exams, due, mins, goal }); const r = await ai(`Schreibe eine kurze, motivierende Tageszusammenfassung (höchstens 2 kurze Sätze, zusammen unter 30 Wörter, Du-Form) für heute. Nenne die wichtigsten Dinge und was zuerst angehen. Daten:\n${ctx}`, { system: sysBase(), max: 120, quiet: true });
      el.classList.remove("busy"); if (r && r.trim()) { D.daily = { date: iso(), text: r.trim(), ai: true }; save(); el.textContent = D.daily.text; }
    };
    run(false);
  })();
  if ($("#addt", m)) $("#addt", m).onclick = () => taskModal();
  if ($("#fd", m)) {
    const fd = $("#fd", m), C = 2 * Math.PI * 84, MAXM = 120, STEP = 5;
    const busy = () => T.running || T.left < T.total;
    const paint = () => {
      const b = busy(), frac = b ? 1 - T.left / T.total : T.focusLen / MAXM, ang = (b ? 0 : T.focusLen / MAXM) * 360;
      $("#fd-fg", m).style.strokeDasharray = `${Math.max(0.001, frac) * C} ${C}`; $("#fd-k", m).setAttribute("transform", `rotate(${ang} 100 100)`);
      $("#fd-k", m).style.display = b ? "none" : ""; fd.classList.toggle("run", T.running);
      $("#fd-t", m).textContent = b ? fmtT(T.left) : String(T.focusLen).padStart(2, "0") + ":00";
      $("#fd-s", m).textContent = b ? (T.mode === "focus" ? "Fokus läuft" : "Pause") : "Ziehen zum Einstellen";
      $("#fd-go", m).textContent = T.running ? "Pausieren" : b ? "Weiter" : "Starten"; $("#fd-rs", m).hidden = !b;
    };
    const setLen = v => { v = Math.max(STEP, Math.min(MAXM, v)); if (v !== T.focusLen) { timerSet(v, T.breakLen); paint(); timerPaint(); } };
    let drag = false;
    const fromPt = e => { const r = fd.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); let a = Math.atan2(dx, -dy) * 180 / Math.PI; if (a < 0) a += 360; let v = Math.round(a / 360 * MAXM / STEP) * STEP; if (v === 0) v = T.focusLen > MAXM / 2 ? MAXM : STEP; if (T.focusLen >= 100 && v <= 20) v = MAXM; if (T.focusLen <= 20 && v >= 100) v = STEP; setLen(v); };
    fd.addEventListener("pointerdown", e => { if (busy()) return; drag = true; fd.setPointerCapture(e.pointerId); fromPt(e); });
    fd.addEventListener("pointermove", e => { if (drag) fromPt(e); });
    const end = () => { drag = false; }; fd.addEventListener("pointerup", end); fd.addEventListener("pointercancel", end);
    fd.addEventListener("wheel", e => { if (busy()) return; e.preventDefault(); setLen(T.focusLen + (e.deltaY < 0 ? STEP : -STEP)); }, { passive: false });
    fd.tabIndex = 0; fd.addEventListener("keydown", e => { if (busy()) return; if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); setLen(T.focusLen + STEP); } if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); setLen(T.focusLen - STEP); } });
    $("#fd-go", m).onclick = () => { timerToggle(); paint(); };
    $("#fd-rs", m).onclick = () => { timerReset(); paint(); };
    paint(); const iv = setInterval(() => { if (!fd.isConnected) return clearInterval(iv); paint(); }, 500); LEAVE.push(() => clearInterval(iv));
  }
  if ($("#cal-g", m)) {
    const now = new Date(); let cy = now.getFullYear(), cm = now.getMonth(), sel = iso();
    const itemsOn = d => [...D.tasks.filter(x => !x.done && x.due === d).map(x => ({ k: x.type === "exam" ? "exam" : "task", t: x.title })), ...msEventsOn(d).map(e => ({ k: "ev", t: e.title }))];
    const drawCal = () => {
      $("#cal-m", m).textContent = new Date(cy, cm, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
      const f0 = (new Date(cy, cm, 1).getDay() + 6) % 7, today = iso();
      let h = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(w => `<span class="wd">${w}</span>`).join("");
      for (let i = 0; i < 42; i++) {
        const dt = new Date(cy, cm, 1 - f0 + i), ds = iso(dt), out = dt.getMonth() !== cm, it = itemsOn(ds);
        h += `<button class="cd ${out ? "out" : ""} ${ds === today ? "today" : ""} ${ds === sel ? "sel" : ""} ${it.some(x => x.k === "exam") ? "ex" : ""}" data-cd="${ds}"><span>${dt.getDate()}</span><em>${it.length ? "<u></u>" : ""}</em></button>`;
      }
      $("#cal-g", m).innerHTML = h;
      $$("[data-cd]", $("#cal-g", m)).forEach(b => b.onclick = () => { sel = b.dataset.cd; const d = parseISO(sel); if (d.getMonth() !== cm) { cm = d.getMonth(); cy = d.getFullYear(); } drawCal(); });
      const l = itemsOn(sel);
      $("#cal-d", m).innerHTML = `<div class="cd-h"><b>${sel === today ? "Heute" : fmtD(sel)}</b><button class="link" id="cal-a">+ Eintragen</button></div>` + (l.length ? l.slice(0, 2).map(x => `<span class="cd-i k${x.k}"><i></i>${esc(x.t)}</span>`).join("") : `<span class="none">Nichts eingetragen</span>`);
      $("#cal-a", m).onclick = () => taskModal(null, sel);
    };
    $("#cal-t", m).onclick = () => { const n = new Date(); cy = n.getFullYear(); cm = n.getMonth(); sel = iso(); drawCal(); };
    $("#cal-p", m).onclick = () => { cm--; if (cm < 0) { cm = 11; cy--; } drawCal(); };
    $("#cal-n", m).onclick = () => { cm++; if (cm > 11) { cm = 0; cy++; } drawCal(); };
    drawCal();
  }
};
const msLogoSvg = () => `<svg viewBox="0 0 24 24" width="26" height="26"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="13" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="13" width="10" height="10" fill="#00a4ef"/><rect x="13" y="13" width="10" height="10" fill="#ffb900"/></svg>`;
let quizPrefill = null;
function bindCommon(m) {
  $$("[data-go]", m).forEach(b => b.onclick = () => go(b.dataset.go));
  $$("[data-d]", m).forEach(c => c.onclick = e => { if (e.target.closest(".dmore")) return; openDoc(D.docs.find(d => d.id === c.dataset.d)); });
  $$("[data-m]", m).forEach(b => b.onclick = e => { e.stopPropagation(); docMenu(b, D.docs.find(d => d.id === b.dataset.m)); });
}

/* ---------- views: documents (folders) ---------- */
let docSort = "recent", docQuery = "", docType = "all", docView = "grid";
const FOLDER_SVG = `<svg viewBox="0 0 120 96" aria-hidden="true"><path class="fb" d="M10 18a12 12 0 0 1 12-12h22c3 0 5.600 1.300 7.300 3.500L57 15h41a12 12 0 0 1 12 12v50a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z"/><path class="ff" d="M10 34a12 12 0 0 1 12-12h76a12 12 0 0 1 12 12v43a12 12 0 0 1-12 12H22a12 12 0 0 1-12-12z"/><path class="fs" d="M22 22h76a12 12 0 0 1 12 12v2H10v-2a12 12 0 0 1 12-12z"/></svg>`;
let folderN = 0;
const hexMix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
function folderSvg(c) {
  const k = "fg" + (folderN++), dk = t => hexMix(c, "#000000", t), lt = t => hexMix(c, "#ffffff", t);
  const BACK = "M366.576 180C329.807 180 300 209.807 300 246.576V325.522V333.369V446.478C300 483.764 300 502.407 307.256 516.649C313.639 529.176 323.824 539.361 336.351 545.744C350.593 553 369.236 553 406.522 553H606.478C643.764 553 662.407 553 676.649 545.744C689.176 539.361 699.361 529.176 705.744 516.649C713 502.407 713 483.764 713 446.478V325.522C713 288.236 713 269.593 705.744 255.351C699.361 242.824 689.176 232.639 676.649 226.256C662.407 219 643.764 219 606.478 219H561.793C527.43 219 494.417 180 460.054 180H366.576Z";
  const FRONT = "M300 380C300 342.663 299.74 323.261 307 309C313.386 296.456 323.466 286.392 336 280C350.249 272.734 369.693 273 407 273H606C643.307 273 662.751 272.734 677 280C689.534 286.392 699.614 296.456 706 309C713.26 323.261 713 342.663 713 380V446C713 483.337 713.26 502.739 706 517C699.614 529.544 689.534 539.608 677 546C662.751 553.266 643.307 553 606 553H407C369.693 553 350.249 553.266 336 546C323.466 539.608 313.386 529.544 307 517C299.74 502.739 300 483.337 300 446V380Z";
  return `<svg viewBox="300 180 413 373" aria-hidden="true"><defs>
    <filter id="${k}f" x="220" y="193" width="573" height="440" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="39.9"/></filter>
    <radialGradient id="${k}b" cx="0" cy="0" r="1" gradientTransform="matrix(-399.677 -386.29 427.241 -412.931 713 553.414)" gradientUnits="userSpaceOnUse"><stop stop-color="${dk(.1)}"/><stop offset="1" stop-color="${lt(.12)}"/></radialGradient>
    <radialGradient id="${k}r" cx="0" cy="0" r="1" gradientTransform="matrix(-413 -280 413 -467.157 713 553)" gradientUnits="userSpaceOnUse"><stop stop-color="${dk(.12)}"/><stop offset="1" stop-color="${lt(.2)}"/></radialGradient>
    <linearGradient id="${k}s1" x1="300" y1="180" x2="699" y2="586" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="${lt(.55)}"/><stop offset="1" stop-color="${dk(.4)}"/></linearGradient>
    <linearGradient id="${k}s2" x1="300" y1="180" x2="761" y2="499" gradientUnits="userSpaceOnUse"><stop offset=".23" stop-color="${lt(.55)}"/><stop offset=".99" stop-color="${c}"/></linearGradient>
    <linearGradient id="${k}s3" x1="300" y1="273" x2="669" y2="613" gradientUnits="userSpaceOnUse"><stop offset=".23" stop-color="${lt(.55)}"/><stop offset=".95" stop-color="${c}"/></linearGradient>
    <path id="${k}p" d="${BACK}"/><path id="${k}q" d="${FRONT}"/>
    <mask id="${k}m1"><use href="#${k}p" fill="#fff"/></mask><mask id="${k}m2"><use href="#${k}q" fill="#fff"/></mask></defs>
    <use href="#${k}p" fill="url(#${k}b)"/>
    <path d="${BACK}" fill="none" stroke="url(#${k}s1)" stroke-width="5.33" mask="url(#${k}m1)"/><path d="${BACK}" fill="none" stroke="url(#${k}s2)" stroke-width="5.33" mask="url(#${k}m1)"/>
    <g filter="url(#${k}f)"><rect x="300" y="273" width="413" height="280" rx="66.6" fill="#000" fill-opacity=".42"/></g>
    <use href="#${k}q" fill="url(#${k}r)"/>
    <path d="${FRONT}" fill="none" stroke="url(#${k}s3)" stroke-width="5.33" mask="url(#${k}m2)"/></svg>`;
}
const FOLDER_SVG_UNUSED = 1;
const sideRow = d => `<div class="sd-row" data-d="${d.id}" tabindex="0"><span class="sd-i">${ic(KIND_I[docKind(d)])}${d.share ? `<i class="shbadge" title="Geteilt">${ic("adduser")}</i>` : ""}</span><span class="sd-t"><b>${esc(d.title)}</b><small>${d.share ? (d.shareOwner ? "Von dir geteilt" : "Mit dir geteilt") + " · " : ""}${fmtAgo(d.updated)}</small></span></div>`;
function docSide() {
  const recent = [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 7), shared = D.docs.filter(d => d.share).sort((a, b) => b.updated - a.updated).slice(0, 12);
  return `<aside class="dside" aria-label="Zuletzt genutzt und geteilt"><section><h4>${ic("timer")}Zuletzt genutzt</h4>${recent.map(sideRow).join("") || `<p class="sd-empty">Noch nichts geöffnet.</p>`}</section><section><h4>${ic("adduser")}Geteilt</h4>${shared.map(sideRow).join("") || `<p class="sd-empty">Noch nichts geteilt. Im Dokument oben auf das Teilen-Symbol tippen, um andere einzuladen.</p>`}</section></aside>`;
}
V.docs = (m, id) => {
  if (id !== undefined) docFolder = id || ""; if (docFolder && !folderOf(docFolder)) docFolder = "";
  const q = docQuery.trim().toLowerCase(), path = folderPath(docFolder);
  const folders = (q ? D.folders.filter(f => f.name.toLowerCase().includes(q)) : D.folders.filter(f => (f.parent || "") === docFolder)).sort((a, b) => a.name.localeCompare(b.name));
  const list = (q ? D.docs.filter(d => (d.title + " " + (d.text || "")).toLowerCase().includes(q)) : D.docs.filter(d => (d.folderId || "") === docFolder)).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (docSort === "name" ? a.title.localeCompare(b.title) : b.updated - a.updated));
  const base = list, cnt = k => k === "all" ? base.length : base.filter(d => docKind(d) === k).length;
  const shown = docType === "all" ? base : base.filter(d => docKind(d) === docType);
  m.classList.add("doc-full");
  m.innerHTML = `<div class="ned dfull docsed"><div class="ned-bar">
    <div class="nb-l"><div class="nb-name docs-t"><b>Dokumente</b><nav class="path" aria-label="Pfad"><button data-p="" class="${path.length ? "" : "here"}">Home</button>${path.map((f, i) => `<span>/</span><button data-p="${f.id}" class="${i === path.length - 1 ? "here" : ""}">${esc(f.name)}</button>`).join("")}</nav></div></div>
    <div class="ned-tools docs-tools"><div class="searchbox flat">${ic("search")}<input id="dq" placeholder="${path.length ? "In „" + esc(path[path.length - 1].name) + "“ und überall suchen …" : "Dokumente durchsuchen …"}" value="${esc(docQuery)}"></div><label class="sortl">${ic("filter")}<select class="field slim" id="ds"><option value="recent" ${docSort === "recent" ? "selected" : ""}>Neueste</option><option value="name" ${docSort === "name" ? "selected" : ""}>Name A–Z</option></select></label></div>
    <div class="nb-r"><button class="btn accent small" id="nw">${ic("plus")}<span>Neu</span></button></div></div>
  <article class="ned-paper docspaper" id="paperc"><div class="dmain">
  ${folders.length || base.length ? `<div class="dtools"><div class="dchips">${DTYPES.filter(([k]) => k === "all" || cnt(k) || docType === k).map(([k, l]) => `<button class="${docType === k ? "on" : ""}" data-t="${k}">${l}<em>${cnt(k)}</em></button>`).join("")}</div><div class="dview"><button class="${docView === "grid" ? "on" : ""}" data-v="grid" aria-label="Kacheln">${ic("table")}</button><button class="${docView === "list" ? "on" : ""}" data-v="list" aria-label="Liste">${ic("list")}</button></div></div>` : ""}
  ${folders.length || shown.length ? `${docView !== "list" && folders.length ? `<h3 class="dsec">Ordner</h3>` : ""}<div class="items ${docView === "list" ? "as-list" : "fgrid"}">${folders.map(f => { const n = folderCount(f.id); if (docView === "list") return `<div class="drow frow" data-f="${f.id}" tabindex="0"><span class="dr-i" style="background:${f.color}22;color:${f.color}">${ic("folder")}</span><span class="dr-t"><b>${esc(f.name)}</b><small>${n} ${n === 1 ? "Datei" : "Dateien"}</small></span><span class="dr-k">Ordner</span><span class="dr-s"></span><span class="dr-a"></span><button class="dmore" data-fm="${f.id}" aria-label="Mehr">${ic("more")}</button></div>`; return `<div class="fold" data-f="${f.id}" style="--c:${f.color}" tabindex="0"><div class="f3d">${folderSvg(f.color)}<div class="ftxt"><b>${esc(f.name)}</b><small>${n} ${n === 1 ? "Datei" : "Dateien"}${q && f.parent ? " · " + esc(folderPath(f.parent).map(x => x.name).join(" › ")) : ""}</small></div></div><button class="dmore on" data-fm="${f.id}" aria-label="Mehr">${ic("more")}</button></div>`; }).join("")}${docView === "list" ? shown.map(docRow).join("") : ""}</div>${docView !== "list" && shown.length ? `<h3 class="dsec">Dokumente</h3><div class="items dgrid">${shown.map(docCard).join("")}</div>` : ""}` : `<div class="emptybox"><div class="big-ic">${ic("folder")}</div><h3>${q ? "Nichts gefunden" : path.length ? "Dieser Ordner ist leer" : "Noch nichts hier"}</h3><p>${q ? "Versuche einen anderen Suchbegriff." : "Lege mit „Neu“ oben rechts Ordner, Notizen oder Datenbanken an oder lade Dateien hoch. Dateien kannst du auch einfach hierher ziehen."}</p>${q ? "" : `<div class="row" style="justify-content:center;gap:8px;margin-top:14px"><button class="btn primary small" data-e="n">${ic("newnote")}Notiz</button><button class="btn small" data-e="u">${ic("upload")}Hochladen</button><button class="btn small" data-e="a">${ic("spark")}Mit Lumi AI</button></div>`}</div>`}
  </div>${docSide()}</article></div>`;
  setScroller($("#paperc", m));
  bindCommon(m);
  $$("[data-p]", m).forEach(b => { b.onclick = () => go("docs/" + b.dataset.p); b.ondragover = e => { e.preventDefault(); b.classList.add("drop"); }; b.ondragleave = () => b.classList.remove("drop"); b.ondrop = e => dropOn(e, b.dataset.p); });
  $$("[data-f]", m).forEach(c => { c.onclick = e => { if (e.target.closest("[data-fm]")) return; go("docs/" + c.dataset.f); }; c.ondragover = e => { e.preventDefault(); c.classList.add("drop"); }; c.ondragleave = () => c.classList.remove("drop"); c.ondrop = e => dropOn(e, c.dataset.f); });
  $$("[data-fm]", m).forEach(b => b.onclick = e => { e.stopPropagation(); folderMenu(b, folderOf(b.dataset.fm)); });
  $$(".doc, .drow", m).forEach(c => c.ondragstart = e => { e.dataTransfer.setData("text/lumi-doc", c.dataset.d); e.dataTransfer.effectAllowed = "move"; });
  function dropOn(e, fid) { const did = e.dataTransfer.getData("text/lumi-doc"); if (!did) return; e.preventDefault(); e.stopPropagation(); const d = D.docs.find(x => x.id === did); if (d) { moveDoc(d, fid); toast("Verschoben nach " + (folderOf(fid)?.name || "Dokumente")); refreshNav(); V.docs(m); } }
  $$("[data-e]", m).forEach(b => b.onclick = () => ({ n: () => docDialog("note"), u: () => $("#upl").click(), a: () => openAiCommand() })[b.dataset.e]());
  $$("[data-t]", m).forEach(b => b.onclick = () => { docType = b.dataset.t; V.docs(m); });
  $$("[data-v]", m).forEach(b => b.onclick = () => { docView = b.dataset.v; V.docs(m); });
  $("#nw", m).onclick = e => menu(e.currentTarget, [{ label: "Mit Lumi AI erstellen …", icon: "spark", fn: () => openAiCommand() }, "-", { label: "Notiz", icon: "newnote", fn: () => docDialog("note") }, { label: "Ordner", icon: "folder", fn: () => newFolder() }, { label: "Datei hochladen", icon: "upload", fn: () => $("#upl").click() }, "-", { label: "Datenbank: Lernplan", icon: "todo", fn: () => newDatabase(docFolder, "plan") }, { label: "Datenbank: Prüfungen & Noten", icon: "award", fn: () => newDatabase(docFolder, "exams") }, { label: "Datenbank: Leseliste", icon: "book", fn: () => newDatabase(docFolder, "read") }, { label: "Leere Datenbank", icon: "table", fn: () => newDatabase(docFolder, "blank") }]);
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
    toast("Lumi AI arbeitet…");
    const r = await ai(kind === "cards" ? `Erstelle aus dem Text ${cnt} Karteikarten. Antworte NUR mit JSON: [{"q":"Frage","a":"Antwort"}]. Kurze, prüfungsrelevante Fragen, präzise Antworten.\nTEXT:\n${T}` : `Erstelle ${cnt} Multiple-Choice-Fragen (3-4 Optionen, genau eine richtig) zum Text. Antworte NUR mit JSON: [{"q":"","o":["",""],"a":0,"e":"kurze Erklärung"}] (a = Index der richtigen Option).\nTEXT:\n${T}`, { max: 3500, quiet: true });
    let data = parseJSON(r); if (!Array.isArray(data) || !data.length) data = null;
    if (!data) { data = kind === "cards" ? localCards(T) : localQuiz(T, cnt); if (data.length) toast(hasKey() ? "Lumi-AI-Antwort unlesbar – lokale Erstellung" : "Offline-Erstellung (mit eingerichteter Lumi AI deutlich besser)"); else { toast("Daraus konnte nichts erstellt werden. Ist Lumi AI eingerichtet?"); return; } }
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
  const { el } = modal(`<h3>${{ summary: "Zusammenfassung", explain: "Einfach erklärt", improve: "Verbesserter Text", continue: "Fortsetzung", translate: "Übersetzung", ask: "Antwort", goals: "Lernziele" }[kind]}</h3><textarea class="field" id="ar" rows="12">Lumi AI arbeitet…</textarea><div class="row end" id="ab" hidden>${ctx.insert ? `<button class="btn ghost" id="a-ins">Unten einfügen</button>` : ""}${ctx.replace && kind !== "summary" && kind !== "ask" && kind !== "explain" ? `<button class="btn ghost" id="a-rep">Auswahl ersetzen</button>` : ""}<button class="btn ghost" id="a-note">Als Notiz speichern</button><button class="btn" id="a-cp">${ic("copy")}Kopieren</button></div>`, "wide");
  let r = await ai(prompts[kind], { max: 1800, quiet: true });
  if (r == null) { r = kind === "summary" ? localSummary(T) : kind === "goals" ? localGoals(T) : null; if (!r) { $("#ar", el).value = hasKey() ? "Lumi AI hat nicht geantwortet. Versuche es erneut." : "Diese Funktion braucht die eingerichtete Lumi AI.\n\nRichte sie unter Einstellungen → Lumi AI ein (Gemini-Key in Vercel). Zusammenfassungen, Karteikarten und Quiz funktionieren auch ohne Key mit einfacher lokaler Auswertung."; return; } }
  $("#ar", el).value = r.trim(); $("#ab", el).hidden = false; if (kind === "goals") examAutoGoals(ctx.subjectId, r);
  $("#a-cp", el).onclick = () => { navigator.clipboard?.writeText($("#ar", el).value); toast("Kopiert"); };
  $("#a-note", el).onclick = () => { newNote(ctx.subjectId || "", textToHtml($("#ar", el).value), (ctx.title || "Notiz") + " – Lumi AI"); el.closest(".mask").remove(); };
  $("#a-ins", el) && ($("#a-ins", el).onclick = () => { ctx.insert(textToHtml($("#ar", el).value)); el.closest(".mask").remove(); toast("Eingefügt"); });
  $("#a-rep", el) && ($("#a-rep", el).onclick = () => { ctx.replace($("#ar", el).value); el.closest(".mask").remove(); toast("Ersetzt"); });
}
function cardsModal(cards, title, subjectId, examId) {
  if (!cards.length) return toast("Keine Karten erstellt");
  const { el, close } = modal(`<h3>${cards.length} Karteikarten</h3><div class="cardprev">${cards.map(c => `<div class="cp"><b>${esc(c.q)}</b><span>${esc(c.a)}</span></div>`).join("")}</div><label class="lbl">Speichern in Stapel</label><select class="field" id="dk"><option value="">+ Neuer Stapel „${esc(title)}“</option>${D.decks.map(d => `<option value="${d.id}">${esc(d.title)}</option>`).join("")}</select><div class="row end"><button class="btn ghost" data-c>Verwerfen</button><button class="btn accent" id="dks">Speichern & lernen</button></div>`, "wide");
  $("[data-c]", el).onclick = close;
  $("#dks", el).onclick = () => { let d = D.decks.find(x => x.id === $("#dk", el).value); if (!d) { d = { id: uid(), title, subjectId: subjectId || "", examId: examId || "", cards: [] }; D.decks.unshift(d); } cards.forEach(c => d.cards.push({ id: uid(), q: c.q, a: c.a, box: 0, due: iso() })); save(); close(); toast("Stapel gespeichert"); refreshNav(); go("study/" + d.id); };
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
  if (d.type === "db") return dbEditor(m, d);
  return noteEditor(m, d);
};
async function noteEditor(m, d) {
  const html = (await KV.get("html:" + d.id)) || "";
  const paperOf = () => d.paper || D.profile.paper || "white";
  const fp = folderPath(d.folderId), BTN = (c, i, t) => `<button class="tbtn" data-c="${c}" title="${t}">${ic(i)}</button>`;
  m.classList.add("doc-full");
  m.innerHTML = `<div class="ned dfull"><div class="ned-bar">
    <div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><div class="nb-name"><b id="cr">${esc(d.title)}</b><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
    <nav class="rtabs" id="rtabs" role="tablist" aria-label="Menüband">${[["start", "Start"], ["ins", "Einfügen"], ["draw", "Zeichnen"], ["design", "Design"], ["ai", "Überprüfen"]].map(([k, l], i) => `<button type="button" role="tab" class="rt ${i ? "" : "on"}" data-t="${k}">${l}</button>`).join("")}</nav>
    <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><div class="modesw" id="msw" role="tablist"><i class="knob"></i><button role="tab" data-m="write" class="on">Schreiben</button><button role="tab" data-m="draw">Zeichnen</button></div><span class="co-av" id="co-av"></span><button class="icon-btn" id="co-m" aria-label="Zusammenarbeiten">${ic("adduser")}</button><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button><button class="icon-btn aitog" id="ai-m" aria-label="AI ein- und ausklappen" title="AI ein- und ausklappen">${ic("aipanel")}<span class="hide-sm">AI</span></button></div></div>
  <div class="rib" id="rib"><button class="tt" id="t-blk" hidden></button><button class="tt" id="t-ins" hidden></button>
    <div class="rp on" data-pn="start"><span class="rgp" id="fx-text"></span><i class="fsep"></i><span class="rgp">${BTN("bold", "bold", "Fett (Strg+B)")}${BTN("italic", "italic", "Kursiv (Strg+I)")}${BTN("underline", "underline", "Unterstrichen")}${BTN("strike", "strike", "Durchgestrichen")}</span><i class="fsep"></i><span class="rgp">${BTN("hilite", "hl", "Markieren")}<button class="tbtn mini" id="hl-m" title="Markierfarbe" aria-label="Markierfarbe">${ic("chev")}</button><button class="tbtn" id="cl-b" title="Textfarbe"><b id="cl" style="border-bottom:3px solid #5b3df5;line-height:1">A</b></button><input type="color" id="cin" value="#5b3df5" hidden></span><i class="fsep"></i><span class="rgp">${BTN("ul", "list", "Aufzählung")}${BTN("ol", "listnum", "Nummerierung")}${BTN("todo", "todo", "Checkliste")}</span><i class="fsep"></i><span class="rgp" id="fx-par"></span><i class="fsep"></i><span class="rgp">${BTN("undo", "undo", "Rückgängig")}${BTN("redo", "redo", "Wiederholen")}</span></div>
    <div class="rp" data-pn="ins">${[["table", "table", "Tabelle"], ["image", "image", "Bild"], ["link", "link", "Link"], ["plink", "file", "Seite verlinken"], ["formula", "text", "Formel"], ["hr", "hrule", "Trennlinie"], ["textbox", "text", "Textfeld"], ["callout", "note", "Hinweis"], ["toggle", "chev", "Aufklappliste"], ["quote", "quote", "Zitat"], ["code", "code", "Code"], ["date", "cal", "Datum"], ["toc", "list", "Inhalt"]].map(([c, i, t]) => `<button type="button" class="tbtn lbl" data-c="${c}" title="${t}">${ic(i)}<span>${t}</span></button>`).join("")}</div>
    <div class="rp" data-pn="draw" id="rib-draw"></div>
    <div class="rp" data-pn="design"><span class="rgp" id="fx-design"></span><i class="fsep"></i><button class="tt" id="t-paper" title="Papier">${ic("note")}<span>Papier</span>${ic("chev")}</button></div>
    <div class="rp" data-pn="ai">${[["ai-edit", "Text schreiben / ändern"], ["ai-summary", "Zusammenfassen"], ["ai-cards", "Karteikarten"], ["ai-quiz", "Quiz"], ["ai-goals", "Lernziele"]].map(([c, t]) => `<button type="button" class="tbtn lbl" data-c="${c}" title="${t}">${ic(c === "ai-edit" ? "spark" : c === "ai-summary" ? "list" : c === "ai-cards" ? "cards" : c === "ai-quiz" ? "help" : "award")}<span>${t}</span></button>`).join("")}<i class="fsep"></i><button type="button" class="tbtn lbl" id="r-ac" title="Automatische Korrektur beim Schreiben">${ic("check")}<span>Auto-Korrektur</span><em id="r-acv"></em></button>${serverInfo && serverInfo.gemini ? `<button type="button" class="tbtn lbl" id="r-src" title="Quellen mit Google-Suche">${ic("globe")}<span>Quellen</span><em id="r-srcv"></em></button>` : ""}</div>
    <span id="fx-view" hidden></span>
  </div>
  <article class="ned-paper p-${paperOf()}" id="paperc"><div class="body" id="body" contenteditable="true" spellcheck="true" data-ph="Schreibe etwas, tippe „/“ für Blöcke oder drücke Leertaste für Lumi AI …">${html}</div></article><input type="file" id="imgin" accept="image/*" hidden></div>`;
  const body = $("#body", m), svEl = $("#sv", m); let saved = null, stat = "";
  const onSel = () => { const s = getSelection(); if (s.rangeCount && body.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); updBubble(); };
  document.addEventListener("selectionchange", onSel); LEAVE.push(() => document.removeEventListener("selectionchange", onSel));
  const restore = () => { const s = getSelection(); if (saved && body.contains(saved.startContainer)) { s.removeAllRanges(); s.addRange(saved); } else { const r = document.createRange(); r.selectNodeContents(body); r.collapse(false); s.removeAllRanges(); s.addRange(r); } body.focus(); };
  const count = () => { const t = body.innerText.trim(), w = t ? t.split(/\s+/).length : 0; stat = `${w} Wörter · ${Math.max(1, Math.round(w / 200))} Min. Lesezeit`; const ds = $("#dstat", m); if (ds) ds.textContent = `${w} Wörter · ${t.length} Zeichen · ${Math.max(1, Math.round(w / 200))} Min.`; };
  const doSave = debounce(async () => { if (!D.docs.includes(d)) return; d.updated = Date.now(); d.text = Suggest.plainText(body).slice(0, 60000); await KV.set("html:" + d.id, body.innerHTML); save(); svEl.textContent = "Gespeichert"; }, 500);
  const dirty = () => { svEl.textContent = "Speichert…"; count(); doSave(); };
  const SG = Suggest.attach(body, dirty); window.__lumiEd = SG; SG.refresh(); LEAVE.push(() => { SG.destroy(); if (window.__lumiEd === SG) window.__lumiEd = null; });
  /* Automatische Korrektur beim Schreiben (Groq/Gemini): nach kurzer Pause wird der aktuelle Absatz geprüft; Korrekturen erscheinen als Vorschläge oder werden direkt übernommen */
  const AC = { busy: false, last: 0, seen: new WeakMap(), timer: null }, acMode = () => D.profile.autoCorrect || "suggest";
  AC.dirty = new Set(); AC.lt = null;
  /* gelernte Korrekturen: ein Fehler, den die KI einmal gefunden hat, wird danach sofort und zuverlässig auch ohne KI erkannt */
  const acDict = () => (D.profile.acDict ||= {}), capLike = (o, r) => o[0] !== o[0].toLowerCase() && r[0] === r[0].toLowerCase() ? r[0].toUpperCase() + r.slice(1) : r;
  const learnAC = (orig, edits) => { const dict = acDict(); let n = 0; for (const e of edits) { const o = orig.slice(e.start, e.end); if (/^\p{L}{2,}$/u.test(o) && /^\p{L}{2,}$/u.test(e.replace) && o !== e.replace) { dict[o] = e.replace; n++; } } if (n) { const k = Object.keys(dict); if (k.length > 400) k.slice(0, k.length - 400).forEach(x => delete dict[x]); save(); } };
  const localEdits = txt => { const dict = acDict(), out = []; for (const m of txt.matchAll(/\p{L}+/gu)) { const w = m[0], end = m.index + w.length; if (end >= txt.length) continue; let r = dict[w]; if (!r && dict[w.toLowerCase()]) r = capLike(w, dict[w.toLowerCase()]); if (r && r !== w) out.push({ start: m.index, end, replace: r }); } return out; };
  const localAC = () => {
    if (acMode() === "off" || !Object.keys(acDict()).length) return; const sel = getSelection(); if (!sel.rangeCount || !body.contains(sel.anchorNode)) return;
    const blk = blockOf(sel.anchorNode); if (!blk || /^(PRE|CODE)$/.test(blk.tagName) || blk.querySelector(".sg-del,.sg-ins")) return;
    const ed = localEdits(Suggest.textOf(blk).s); if (ed.length) { const n = SG.suggestAt(blk, ed, { avoidCaret: true, direct: acMode() === "auto", mini: true }); if (n && acMode() === "auto") toast(`${n} ${n === 1 ? "Korrektur" : "Korrekturen"} übernommen – Strg+Z macht es rückgängig`); }
  };
  const scheduleAC = () => { clearTimeout(AC.lt); AC.lt = setTimeout(localAC, 450); { const s = getSelection(), b = s.rangeCount && body.contains(s.anchorNode) ? blockOf(s.anchorNode) : null; if (b) AC.dirty.add(b); } clearTimeout(AC.timer); if (acMode() === "off" || !hasKey()) return; AC.timer = setTimeout(runAC, 1700); };
  async function runAC() {
    if (AC.busy || acMode() === "off" || !hasKey() || !body.isConnected) return;
    const sel = getSelection(); if (!sel.rangeCount || !body.contains(sel.anchorNode)) return;
    const cb = blockOf(sel.anchorNode), ok = b => b && b.isConnected && !/^(PRE|CODE)$/.test(b.tagName) && !b.querySelector(".sg-del,.sg-ins") && Suggest.textOf(b).s.trim().length >= 14 && AC.seen.get(b) !== Suggest.textOf(b).s;
    const blk = [cb, ...AC.dirty].find(ok); AC.dirty.forEach(b => { if (!b.isConnected || b === blk) AC.dirty.delete(b); }); if (!blk) return;
    const orig = Suggest.textOf(blk).s;
    if (Date.now() - AC.last < 2500) return scheduleAC();
    AC.busy = true; AC.last = Date.now();
    let res = null;
    try { res = await ai(orig, { system: "Du bist eine sehr zurückhaltende Rechtschreibkorrektur. Korrigiere NUR eindeutige Tippfehler und klare Rechtschreibfehler (vertauschte oder fehlende Buchstaben, doppelte Wörter, falsche Gross-/Kleinschreibung am Satzanfang oder bei Namen). Ändere NICHT: Stil, Wortwahl, Satzbau, Kommas, Fachbegriffe, Namen, Zahlen, Abkürzungen, Umgangssprache, Zeilenumbrüche. Formuliere nichts um und füge nichts hinzu." + (swissOn() ? " Schweizer Rechtschreibung: Das Zeichen „ß“ gibt es nicht, immer „ss“ schreiben." : "") + " Antworte NUR mit dem Text, ohne Erklärung, ohne Anführungszeichen. Wenn nichts eindeutig falsch ist, gib den Text exakt unverändert zurück.", max: Math.min(1500, Math.ceil(orig.length / 2) + 120), model: autoModelId(), temperature: 0.1, quiet: true }); } catch {}
    AC.busy = false; AC.seen.set(blk, orig);
    if (!res || !blk.isConnected) return;
    let fixed = res.trim(); if (!/^["„“]/.test(orig)) fixed = fixed.replace(/^["„“]|["“”]$/g, "");
    if (!fixed || fixed === orig || fixed.length > orig.length * 1.35 + 20 || fixed.length < orig.length * 0.65 - 20) return;
    if (Suggest.textOf(blk).s !== orig) return scheduleAC();            // Nutzer hat weitergeschrieben
    let edits = Suggest.wordDiff(orig, fixed);
    edits = edits.filter(e => { const o = orig.slice(e.start, e.end), strip = x => x.replace(/[\s.,;:!?„“"'()\-–]/g, ""); return strip(o) !== strip(e.replace) && e.replace.split(/\s+/).length <= 4 && o.split(/\s+/).length <= 4; });   // nur kleine, echte Wortkorrekturen
    if (!edits.length || edits.length > 6) { if (AC.dirty.size) scheduleAC(); return; }
    learnAC(orig, edits);
    const n = SG.suggestAt(blk, edits, { avoidCaret: true, direct: acMode() === "auto", mini: true });
    if (n && acMode() === "auto") toast(`${n} ${n === 1 ? "Korrektur" : "Korrekturen"} übernommen – Strg+Z macht es rückgängig`);
    AC.seen.set(blk, Suggest.textOf(blk).s); if (AC.dirty.size) scheduleAC();
  }
  if (acMode() !== "off" && hasKey()) body.spellcheck = false;
  body.addEventListener("input", scheduleAC); LEAVE.push(() => clearTimeout(AC.timer));
  body.addEventListener("input", () => { dirty(); slashCheck(); });
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
    hilite: () => { const cur = document.queryCommandValue("hiliteColor"); exec("hiliteColor", cur && !/transparent|rgba\(0, 0, 0, 0\)|^$/i.test(cur) && !/255, 255, 255/.test(cur) ? "transparent" : hlColor); },
    indent: () => exec("indent"), outdent: () => exec("outdent"), right: () => exec("justifyRight"), justify: () => exec("justifyFull"),
    textbox: () => TBX.add(),
    callout: () => exec("insertHTML", `<blockquote class="callout"><b>Hinweis:</b>&nbsp;</blockquote><p><br></p>`),
    toggle: () => exec("insertHTML", `<details class="tgl" open><summary>Aufklappliste</summary><p><br></p></details><p><br></p>`),
    plink: () => pagePicker(),
    date: () => exec("insertText", new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })),
    toc: () => { const hs = $$("h1,h2,h3", body); if (!hs.length) return toast("Füge zuerst Überschriften hinzu"); exec("insertHTML", `<p><b>Inhalt</b></p><ul>${hs.map(h => `<li>${esc(h.textContent.trim())}</li>`).join("")}</ul><p><br></p>`); },
    ul: () => exec("insertUnorderedList"), ol: () => exec("insertOrderedList"), todo: () => exec("insertHTML", '<ul class="chk"><li><input type="checkbox">&nbsp;</li></ul>'),
    quote: () => exec("formatBlock", document.queryCommandValue("formatBlock") === "blockquote" ? "p" : "blockquote"), code: () => exec("formatBlock", document.queryCommandValue("formatBlock") === "pre" ? "p" : "pre"),
    hr: () => exec("insertHorizontalRule"), left: () => exec("justifyLeft"), center: () => exec("justifyCenter"), clear: () => exec("removeFormat"), undo: () => exec("undo"), redo: () => exec("redo"),
    link: async () => { const u = await ask("Link-Adresse", { value: "https://", ok: "Einfügen" }); if (u) exec("createLink", u); },
    image: () => $("#imgin", m).click(), table: () => exec("insertHTML", `<table><tbody>${"<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>".repeat(3)}</tbody></table><p><br></p>`),
    formula: () => { const { el } = modal(`<h3>Formeln & Symbole</h3><div class="syms">${SYMS.map(s => `<button>${s}</button>`).join("")}</div><p class="note">Tipp: „x²“ und „x₂“ findest du unter Einfügen.</p>`); $$(".syms button", el).forEach(sb => sb.onclick = () => { restore(); document.execCommand("insertText", false, sb.textContent); dirty(); }); },
    "ai-edit": () => openAiBar(), "ai-summary": () => run("summary"), "ai-cards": () => run("cards"), "ai-quiz": () => run("quiz"), "ai-goals": () => run("goals"),
  };
  const FM = Format.attach({ m, body, exec, restore, dirty, d, save }); LEAVE.push(() => FM.destroy());
  const noFocus = e => e.preventDefault();
  $$(".tbtn[data-c], .tt", m).forEach(b => b.onmousedown = noFocus);
  $$(".tbtn[data-c]", m).forEach(b => b.onclick = () => CMD[b.dataset.c]?.());
  $("#cin", m).oninput = e => { $("#cl", m).style.borderColor = e.target.value; exec("foreColor", e.target.value); }; $("#cin", m).onclick = e => e.stopPropagation(); $("#cl", m).parentElement.onclick = () => $("#cin", m).click();
  const pagePicker = () => {
    const { el, close } = modal(`<h3>Seite verlinken</h3><input class="field" id="pl-q" placeholder="Dokument suchen …" autocomplete="off"><div class="pick" id="pl-l"></div>`);
    const draw = () => { const q = $("#pl-q", el).value.trim().toLowerCase(), list = D.docs.filter(x => x.id !== d.id && x.type !== "draw" && (!q || x.title.toLowerCase().includes(q))).slice(0, 30); $("#pl-l", el).innerHTML = list.map(x => `<button class="li hit" data-id="${x.id}">${ic(x.type === "note" ? "note" : "file")}<div class="tm2"><b>${esc(x.title)}</b><small>${esc(docPath(x) || "Home")}</small></div></button>`).join("") || `<p class="empty sm">Keine Treffer.</p>`; $$("[data-id]", el).forEach(b => b.onclick = () => { const t = D.docs.find(y => y.id === b.dataset.id); close(); restore(); document.execCommand("insertHTML", false, `<a class="plink" href="#/app/doc/${t.id}" data-doc="${t.id}" contenteditable="false">${esc(t.title)}</a>&nbsp;`); dirty(); }); };
    $("#pl-q", el).oninput = draw; draw(); setTimeout(() => $("#pl-q", el).focus(), 40);
  };
  const backlinks = async () => {
    const hits = []; for (const x of D.docs) { if (x.type !== "note" || x.id === d.id) continue; const h = await KV.get("html:" + x.id); if (h && h.includes(`data-doc="${d.id}"`)) hits.push(x); }
    const { el, close } = modal(`<h3>Verlinkt von</h3>${hits.length ? `<div class="pick">${hits.map(x => `<button class="li hit" data-id="${x.id}">${ic("note")}<div class="tm2"><b>${esc(x.title)}</b><small>${esc(docPath(x) || "Home")}</small></div></button>`).join("")}</div>` : `<p class="empty sm">Noch keine Notiz verlinkt diese Seite. Tippe „[[“ in einer anderen Notiz, um hierher zu verlinken.</p>`}`);
    $$("[data-id]", el).forEach(b => b.onclick = () => { close(); go("doc/" + b.dataset.id); });
  };
  body.addEventListener("click", e => {
    const a = e.target.closest("a.plink"); if (a) { e.preventDefault(); go("doc/" + a.dataset.doc); return; }
    const sm = e.target.closest("summary"); if (sm && e.clientX - sm.getBoundingClientRect().left < 30) { e.preventDefault(); const dt = sm.parentElement; dt.open = !dt.open; dirty(); }
  });
  body.addEventListener("input", () => { const sl = getSelection(); if (!sl.rangeCount || !sl.isCollapsed) return; const n = sl.anchorNode; if (n?.nodeType === 3 && n.nodeValue.slice(0, sl.anchorOffset).endsWith("[[")) { const r = document.createRange(); r.setStart(n, sl.anchorOffset - 2); r.setEnd(n, sl.anchorOffset); r.deleteContents(); saved = r.cloneRange(); pagePicker(); } });
  let hlColor = "#fff1a8";
  const colorPop = (anchor, cols, pick, custom) => {
    $(".cpop")?.remove(); const el = document.createElement("div"); el.className = "cpop"; el.innerHTML = cols.map(c => `<button style="background:${c}" data-c="${c}" aria-label="${c}"></button>`).join("") + (custom ? `<label class="cust" title="Eigene Farbe">${ic("plus")}<input type="color"></label>` : "");
    document.body.appendChild(el); const r = anchor.getBoundingClientRect(); el.style.left = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.left + r.width / 2 - el.offsetWidth / 2)) + "px"; el.style.top = r.bottom + 8 + "px"; requestAnimationFrame(() => el.classList.add("on"));
    const close = () => { el.remove(); document.removeEventListener("pointerdown", off, true); }, off = e => { if (!el.contains(e.target) && e.target !== anchor && !anchor.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener("pointerdown", off, true)); el.onmousedown = e => { if (e.target.tagName !== "INPUT") e.preventDefault(); };
    $$("button", el).forEach(b => b.onclick = () => { pick(b.dataset.c); close(); }); const ci = $("input", el); if (ci) ci.oninput = e => { pick(e.target.value); };
    LEAVE.push(close);
  };
  $("#hl-m", m).onmousedown = $("#cl-b", m).onmousedown = noFocus;
  $("#hl-m", m).onclick = e => colorPop(e.currentTarget, ["#fff1a8", "#c8f2d4", "#cfe3ff", "#ffd6e7", "#e4d8ff", "#ffe0c2"], c => { hlColor = c; exec("hiliteColor", c); $("#hl-m", m).style.setProperty("--hc", c); });
  $("#cl-b", m).onclick = e => colorPop(e.currentTarget, ["#1c1c22", "#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#5b3df5", "#ec4899", "#6b6b78"], c => { $("#cl", m).style.borderColor = c; exec("foreColor", c); }, true);
  const paintPaper = () => { const p = $("#paperc", m); [...p.classList].filter(c => /^(p-|f-|fs-|w-)/.test(c)).forEach(c => p.classList.remove(c)); p.classList.add("p-" + paperOf(), "f-" + (d.font || "sans"), "fs-" + (d.fsize || "m"), "w-" + (d.width || "m")); };
  paintPaper();
  const setD = (k, v) => { d[k] = v; save(); paintPaper(); };
  $("#t-blk", m).onclick = e => menu(e.currentTarget, [{ label: "Text", fn: CMD.p }, { label: "Überschrift 1", fn: CMD.h1 }, { label: "Überschrift 2", fn: CMD.h2 }, { label: "Überschrift 3", fn: CMD.h3 }, "-", { label: "Zitat", icon: "quote", fn: CMD.quote }, { label: "Code", icon: "code", fn: CMD.code }, "-", ...[["sans", "Schrift: Standard"], ["serif", "Schrift: Serif"], ["mono", "Schrift: Mono"]].map(([k, l]) => ({ label: l, icon: (d.font || "sans") === k ? "check" : "", fn: () => setD("font", k) })), "-", ...[["s", "Größe: Klein"], ["m", "Größe: Normal"], ["l", "Größe: Groß"]].map(([k, l]) => ({ label: l, icon: (d.fsize || "m") === k ? "check" : "", fn: () => setD("fsize", k) }))]);
  $("#t-ins", m).onclick = e => menu(e.currentTarget, [{ label: "Bild", icon: "image", fn: CMD.image }, { label: "Tabelle", icon: "table", fn: CMD.table }, { label: "Link", icon: "link", fn: CMD.link }, { label: "Formel / Symbol", icon: "text", fn: CMD.formula }, { label: "Aufklappliste", icon: "chev", fn: CMD.toggle }, { label: "Seite verlinken …", icon: "link", fn: CMD.plink }, { label: "Hinweis-Box", icon: "quote", fn: CMD.callout }, { label: "Heutiges Datum", icon: "cal", fn: CMD.date }, { label: "Inhaltsverzeichnis", icon: "list", fn: CMD.toc }, "-", { label: "Trennlinie", icon: "hrule", fn: CMD.hr }, { label: "Hochgestellt x²", fn: CMD.sup }, { label: "Tiefgestellt x₂", fn: CMD.sub }, "-", { label: "Linksbündig", icon: "alignl", fn: CMD.left }, { label: "Zentriert", icon: "alignc", fn: CMD.center }, { label: "Rechtsbündig", fn: CMD.right }, { label: "Blocksatz", fn: CMD.justify }, { label: "Einrücken", fn: CMD.indent }, { label: "Ausrücken", fn: CMD.outdent }, "-", { label: "Formatierung entfernen", icon: "rot", fn: CMD.clear }]);
  $("#t-paper", m).onclick = e => menu(e.currentTarget, [...[["white", "Leer"], ["lines", "Liniert"], ["grid", "Kariert"], ["dots", "Punkte"]].map(([k, l]) => ({ label: l, icon: paperOf() === k ? "check" : "", fn: () => { D.profile.paper = k; setD("paper", k); } })), "-", ...[["s", "Seitenbreite: Schmal"], ["m", "Seitenbreite: Normal"], ["l", "Seitenbreite: Breit"]].map(([k, l]) => ({ label: l, icon: (d.width || "m") === k ? "check" : "", fn: () => setD("width", k) }))]);
  /* find & replace */
  const FH = window.CSS && CSS.highlights && window.Highlight ? { all: new Highlight(), cur: new Highlight() } : null; if (FH) { CSS.highlights.set("lumi-find", FH.all); CSS.highlights.set("lumi-find-cur", FH.cur); }
  let fbar = null, fr = [], fi = 0;
  const fScan = q => { fr = []; FH?.all.clear(); FH?.cur.clear(); if (!q) return; const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT), lq = q.toLowerCase(); let n; while ((n = w.nextNode())) { const t = n.nodeValue.toLowerCase(); let i = 0; while ((i = t.indexOf(lq, i)) >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length); fr.push(r); FH?.all.add(r); i += q.length || 1; } } };
  const fShow = () => { const c = $(".fc", fbar); c.textContent = fr.length ? `${fi + 1}/${fr.length}` : "0"; FH?.cur.clear(); if (fr[fi]) { FH?.cur.add(fr[fi]); fr[fi].startContainer.parentElement?.scrollIntoView({ block: "center", behavior: "smooth" }); } };
  const fGo = k => { if (!fr.length) return; fi = (fi + k + fr.length) % fr.length; fShow(); };
  const openFind = () => {
    if (fbar) { $("input", fbar).focus(); $("input", fbar).select(); return; }
    fbar = document.createElement("div"); fbar.className = "findbar"; fbar.innerHTML = `<input class="fq" placeholder="Suchen" aria-label="Suchen"><span class="fc">0</span><button data-k="-1" aria-label="Vorheriger">${ic("up")}</button><button data-k="1" class="dn" aria-label="Nächster">${ic("up")}</button><i></i><input class="fr" placeholder="Ersetzen" aria-label="Ersetzen"><button class="tx" data-a="one">Ersetzen</button><button class="tx" data-a="all">Alle</button><button data-a="x" aria-label="Schließen">${ic("x")}</button>`;
    document.body.appendChild(fbar); requestAnimationFrame(() => fbar.classList.add("on"));
    const q = $(".fq", fbar), rp = $(".fr", fbar), run = () => { fScan(q.value); fi = 0; fShow(); };
    q.oninput = run; q.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); fGo(e.shiftKey ? -1 : 1); } if (e.key === "Escape") closeFind(); }; rp.onkeydown = e => { if (e.key === "Escape") closeFind(); };
    $$("[data-k]", fbar).forEach(b => b.onclick = () => fGo(+b.dataset.k));
    const rep = r => { r.deleteContents(); r.insertNode(document.createTextNode(rp.value)); };
    $('[data-a="one"]', fbar).onclick = () => { if (!fr[fi]) return; rep(fr[fi]); dirty(); body.normalize(); run(); };
    $('[data-a="all"]', fbar).onclick = () => { if (!fr.length) return; const n = fr.length; [...fr].reverse().forEach(rep); dirty(); body.normalize(); run(); toast(`${n} ersetzt`); };
    $('[data-a="x"]', fbar).onclick = closeFind; q.focus(); const sel = getSelection().toString(); if (sel && sel.length < 60 && !sel.includes("\n")) { q.value = sel; run(); }
  };
  const closeFind = () => { fbar?.remove(); fbar = null; fr = []; FH?.all.clear(); FH?.cur.clear(); };
  const fkey = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f" && $("#body")) { e.preventDefault(); openFind(); } };
  document.addEventListener("keydown", fkey); LEAVE.push(() => { document.removeEventListener("keydown", fkey); closeFind(); });
  $$("[data-p]", m).forEach(b => b.onclick = () => go("docs/" + b.dataset.p));
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || ""));
  const rename = () => {
    const b = $("#cr", m); if (!b) return; const inp = document.createElement("input"); inp.className = "nb-in"; inp.value = d.title === "Unbenannte Notiz" ? "" : d.title; inp.placeholder = "Name der Notiz"; inp.maxLength = 80; b.replaceWith(inp); inp.focus(); inp.select();
    let done = false; const fin = ok => { if (done) return; done = true; if (ok) { d.title = inp.value.trim() || "Unbenannte Notiz"; d.updated = Date.now(); save(); } const nb = document.createElement("b"); nb.id = "cr"; nb.title = "Zum Umbenennen klicken"; nb.textContent = d.title; inp.replaceWith(nb); nb.onclick = rename; };
    inp.onblur = () => fin(true); inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); inp.blur(); } else if (e.key === "Escape") { fin(false); } };
  };
  $("#cr", m).title = "Zum Umbenennen klicken"; $("#cr", m).onclick = rename;

  /* floating selection menu */
  const bub = document.createElement("div"); bub.className = "bubble"; bub.hidden = true; document.body.appendChild(bub); LEAVE.push(() => bub.remove());
  bub.innerHTML = [["bold", "bold"], ["italic", "italic"], ["underline", "underline"], ["hilite", "hl"], ["link", "link"]].map(([c, i]) => `<button data-b="${c}">${ic(i)}</button>`).join("") + `<i class="sep"></i><button data-bai>${ic("spark")}<span>Lumi AI</span></button>`;
  bub.onmousedown = e => e.preventDefault();
  $$("[data-b]", bub).forEach(b => b.onclick = () => CMD[b.dataset.b]());
  $("[data-bai]", bub).onclick = () => openAiBar();
  function updBubble() { const s = getSelection(); if (!bub.isConnected) return; if (!s.rangeCount || s.isCollapsed || !body.contains(s.anchorNode) || !s.toString().trim()) { bub.hidden = true; return; } const r = s.getRangeAt(0).getBoundingClientRect(); bub.hidden = false; const w = bub.offsetWidth; bub.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px"; bub.style.top = Math.max(8, r.top - bub.offsetHeight - 10) + "px"; }

  /* inline AI edit bar (right-click, selection, Ctrl+J, space on an empty line) */
  const HLS = window.CSS && CSS.highlights && window.Highlight ? new Highlight() : null; if (HLS) CSS.highlights.set("lumi-ai", HLS);
  LEAVE.push(() => { try { CSS.highlights?.delete("lumi-ai"); } catch {} });
  const QA = [["Kürzer", "Kürze den Text auf das Wesentliche."], ["Ausführlicher", "Formuliere den Text ausführlicher, mit einem kurzen Beispiel."], ["Einfacher", "Formuliere den Text einfacher, so dass ihn ein Vierzehnjähriger versteht."], ["Verbessern", "Korrigiere Rechtschreibung und Grammatik und verbessere den Stil."], ["Formeller", "Formuliere den Text formeller, im Schul- bzw. Uni-Stil."], ["Auf Englisch", "Übersetze den Text ins Englische."], ["Als Liste", "Wandle den Text in eine übersichtliche Aufzählung um."]];
  const ACT = [["Zusammenfassen", "summary"], ["Einfach erklären", "explain"], ["Übersetzen", "translate"], ["Weiterschreiben", "continue"], ["Lernziele", "goals"]], ACI = ["note", "bulb", "rot", "spark", "star"], QI = ["line", "plus", "help", "check", "pen", "globe", "list"];
  const bar = document.createElement("div"); bar.className = "aibar"; bar.hidden = true; document.body.appendChild(bar); LEAVE.push(() => bar.remove());
  bar.innerHTML = `<div class="ab-in">${ic("spark")}<input aria-label="Lumi-AI-Anweisung" autocomplete="off"><button class="send" aria-label="Senden">${ic("up")}</button></div><div class="ab-chips">${QA.map(([l], i) => `<button type="button" data-sel>${ic(QI[i])}<span>${l}</span></button>`).join("")}${ACT.map(([l], i) => `<button type="button" data-act="${i}">${ic(ACI[i])}<span>${l}</span></button>`).join("")}</div><div class="ab-busy" hidden><span class="dots"><span></span><span></span><span></span></span><b>Lumi AI überarbeitet den Text …</b></div><div class="ab-done" hidden><b>Text aktualisiert</b><button type="button" data-k>Behalten</button><button type="button" data-u>Rückgängig</button></div>`;
  const barIn = $("input", bar); let aiR = null, aiPrev = "", aiState = "idle";
  const blockOf = node => { const el = node?.nodeType === 3 ? node.parentElement : node; const b = el?.closest?.("p,h1,h2,h3,li,blockquote,pre,td,th"); return b && body.contains(b) ? b : null; };
  const setTarget = r => { aiR = r; if (HLS) { HLS.clear(); if (r && !r.collapsed) HLS.add(r); } };
  const closeAi = () => { bar.hidden = true; aiState = "idle"; HLS?.clear(); };
  const panel = w => { $(".ab-in", bar).hidden = w !== "idle"; $(".ab-chips", bar).hidden = w !== "idle"; $$(".ab-chips [data-sel]", bar).forEach(b => b.hidden = !aiR || aiR.collapsed); $(".ab-busy", bar).hidden = w !== "busy"; $(".ab-done", bar).hidden = w !== "done"; };
  function openAiBar(pt) {
    const s = getSelection(); let r = null;
    if (s.rangeCount && !s.isCollapsed && body.contains(s.anchorNode)) r = s.getRangeAt(0).cloneRange();
    else if (saved && !saved.collapsed && !pt) r = saved.cloneRange();
    else { let node = null; if (pt && document.caretRangeFromPoint) node = document.caretRangeFromPoint(pt.x, pt.y)?.startContainer; if (!node) node = s.rangeCount && body.contains(s.anchorNode) ? s.anchorNode : saved?.startContainer; const blk = blockOf(node); if (blk) { r = document.createRange(); r.selectNodeContents(blk); } else if (saved) r = saved.cloneRange(); }
    if (!r) { r = document.createRange(); r.selectNodeContents(body.lastElementChild || body); r.collapse(false); }
    setTarget(r); aiState = "idle"; panel("idle"); barIn.value = ""; barIn.placeholder = r.collapsed || !r.toString().trim() ? "Was soll Lumi AI schreiben? z. B. „Definition von Photosynthese“" : "Was soll Lumi AI ändern? z. B. „kürzer“, „mit Beispiel“, „auf Englisch“";
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
    if (res == null) { toast(hasKey() ? "Lumi AI hat nicht geantwortet." : "Für diese Lumi-AI-Änderung muss Lumi AI eingerichtet sein (Einstellungen → Lumi AI)."); aiState = "idle"; panel("idle"); return; }
    res = res.trim().replace(/^["„“]|["“”]$/g, ""); aiPrev = body.innerHTML;
    SG.suggestRange(aiR.cloneRange(), res); HLS?.clear(); aiState = "idle"; closeAi();
  }
  $(".send", bar).onclick = () => sendAi(barIn.value); barIn.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); sendAi(barIn.value); } else if (e.key === "Escape") closeAi(); };
  $$(".ab-chips [data-sel]", bar).forEach((b, i) => b.onclick = () => sendAi(QA[i][1]));
  $$(".ab-chips [data-act]", bar).forEach((b, i) => b.onclick = () => { closeAi(); run(ACT[i][1]); });
  $("[data-k]", bar).onclick = closeAi; $("[data-u]", bar).onclick = () => { body.innerHTML = aiPrev; dirty(); closeAi(); };
  const outside = e => { if (!bar.hidden && aiState !== "busy" && !bar.contains(e.target)) closeAi(); };
  document.addEventListener("mousedown", outside, true); LEAVE.push(() => document.removeEventListener("mousedown", outside, true));
  /* Hinweis-Blöcke lassen sich mit Rück- oder Entfernen-Taste auflösen bzw. löschen */
  body.addEventListener("keydown", e => {
    if (e.key !== "Backspace" && e.key !== "Delete") return; const sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return;
    const el = sel.anchorNode?.nodeType === 3 ? sel.anchorNode.parentElement : sel.anchorNode, co = el?.closest?.("blockquote, pre"); if (!co || !body.contains(co)) return;
    const txt = co.textContent.replace(/\u00a0/g, " ").trim(), r0 = document.createRange(); r0.setStart(co, 0); r0.setEnd(sel.anchorNode, sel.anchorOffset); const atStart = !r0.toString().replace(co.classList.contains("callout") ? /^Hinweis:\s*/ : /^$/, "").replace(/\u00a0/g, "").length;
    if (txt === "" || txt === "Hinweis:" || (e.key === "Backspace" && atStart)) { e.preventDefault(); const p = document.createElement("p"); const rest = co.textContent.replace(co.classList.contains("callout") ? /^Hinweis:\s*/ : /^$/, "").trim(); if (rest) p.textContent = rest; else p.innerHTML = "<br>"; co.replaceWith(p); const r = document.createRange(); r.selectNodeContents(p); r.collapse(true); sel.removeAllRanges(); sel.addRange(r); dirty(); }
  });

  /* alle Blöcke (Code, Zitat, Hinweis, Tabelle, Aufklappliste, Trennlinie, Bild) lassen sich über einen kleinen Löschknopf entfernen */
  { const DEL = "pre,table,blockquote,details,hr,img,.callout", delb = document.createElement("button"); delb.className = "blk-del"; delb.hidden = true; delb.innerHTML = ic("trash"); delb.title = "Block löschen"; delb.setAttribute("aria-label", "Block löschen"); document.body.appendChild(delb); LEAVE.push(() => delb.remove());
    let tgt = null, ht = 0; const show = el => { tgt = el; clearTimeout(ht); const r = el.getBoundingClientRect(); delb.style.left = Math.min(innerWidth - 44, r.right - 30) + "px"; delb.style.top = Math.max(8, r.top - 12) + "px"; delb.hidden = false; }, hide = () => { clearTimeout(ht); ht = setTimeout(() => { delb.hidden = true; }, 500); };
    body.addEventListener("mouseover", e => { const el = e.target.closest?.(DEL); if (el && body.contains(el) && !el.closest(".sg-ins-blk")) show(el); });
    body.addEventListener("mouseout", e => { if (e.target.closest?.(DEL)) hide(); });
    const fromCaret = () => { const s = getSelection(), n = s.rangeCount && s.anchorNode && (s.anchorNode.nodeType === 3 ? s.anchorNode.parentElement : s.anchorNode), el = n && n.closest?.(DEL); if (el && body.contains(el) && el !== body) show(el); };
    body.addEventListener("click", e => { if (e.target.closest?.(DEL)) show(e.target.closest(DEL)); else fromCaret(); }); body.addEventListener("keyup", fromCaret);
    delb.addEventListener("mouseenter", () => clearTimeout(ht)); delb.addEventListener("mouseleave", hide); delb.onmousedown = e => e.preventDefault();
    delb.onclick = () => { if (!tgt || !tgt.isConnected) return; const r = document.createRange(); r.selectNode(tgt); const s = getSelection(); s.removeAllRanges(); s.addRange(r); body.focus(); document.execCommand("delete"); if (tgt.isConnected) tgt.remove(); if (!body.textContent.trim() && !body.querySelector("img,table,hr")) body.innerHTML = "<p><br></p>"; delb.hidden = true; tgt = null; dirty(); };
  }
  body.addEventListener("contextmenu", e => { e.preventDefault(); openAiBar({ x: e.clientX, y: e.clientY }); });
  body.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") { e.preventDefault(); openAiBar(); return; }
    if (e.key === " " && !e.ctrlKey && !e.metaKey && sm.hidden) { const s = getSelection(), blk = blockOf(s.anchorNode); if (blk && s.isCollapsed && !blk.textContent.trim() && blk.tagName === "P" && !blk.querySelector("img,table,input")) { e.preventDefault(); openAiBar(); } }
  });

  /* slash menu */
  const SLASH = [["Text", "p", "text absatz"], ["Überschrift 1", "h1", "h1 titel ueberschrift"], ["Überschrift 2", "h2", "h2 ueberschrift"], ["Überschrift 3", "h3", "h3 ueberschrift"], ["Aufzählung", "ul", "liste bullet punkte"], ["Nummerierte Liste", "ol", "liste nummer"], ["Checkliste", "todo", "todo aufgaben check"], ["Tabelle", "table", "tabelle raster"], ["Zitat", "quote", "zitat"], ["Code", "code", "code"], ["Trennlinie", "hr", "linie trenner"], ["Bild", "image", "bild foto"], ["Formel / Symbol", "formula", "formel symbol mathe"], ["Aufklappliste", "toggle", "toggle aufklapp liste details"], ["Seite verlinken", "plink", "link seite verweis wiki"], ["Hinweis-Box", "callout", "hinweis box callout info"], ["Heutiges Datum", "date", "datum heute"], ["Inhaltsverzeichnis", "toc", "inhalt verzeichnis gliederung"], ["KI: Schreiben / ändern…", "ai-edit", "ki schreiben aendern bearbeiten"], ["KI: Zusammenfassung", "ai-summary", "ki summary zusammenfassung"], ["KI: Karteikarten", "ai-cards", "ki karten lernkarten"], ["KI: Quiz", "ai-quiz", "ki quiz test"], ["KI: Lernziele", "ai-goals", "ki lernziele"]];
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
  function slashPick(k) {
    if (!sCtx) return; const blk = blockOf(sCtx.node), r = document.createRange(); r.setStart(sCtx.node, sCtx.end - sCtx.len); r.setEnd(sCtx.node, sCtx.end); r.deleteContents();
    let caret = r; if (blk && !blk.textContent.trim() && !blk.querySelector("img,table,input")) { blk.innerHTML = "<br>"; caret = document.createRange(); caret.setStart(blk, 0); caret.collapse(true); }
    saved = caret.cloneRange(); const sl = getSelection(); sl.removeAllRanges(); sl.addRange(caret); slashHide(); CMD[k]?.();
  }
  body.addEventListener("keydown", e => { if (sm.hidden) return; if (e.key === "ArrowDown") { e.preventDefault(); sIdx = (sIdx + 1) % sItems.length; slashDraw(); } else if (e.key === "ArrowUp") { e.preventDefault(); sIdx = (sIdx - 1 + sItems.length) % sItems.length; slashDraw(); } else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); slashPick(sItems[sIdx][1]); } else if (e.key === "Escape") slashHide(); });
  body.addEventListener("blur", () => setTimeout(slashHide, 150));

  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Text mit Lumi AI schreiben / ändern…", icon: "spark", fn: () => openAiBar() }, "-", { label: "Zusammenfassen", icon: "list", fn: () => run("summary") }, { label: "Einfach erklären", icon: "help", fn: () => run("explain") }, { label: "Verbessern & korrigieren", icon: "pen", fn: () => run("improve") }, { label: "Weiterschreiben", icon: "spark", fn: () => run("continue") }, { label: "Übersetzen…", icon: "rot", fn: () => run("translate") }, { label: "Frage zum Text…", icon: "search", fn: () => run("ask") }, "-", { label: "Lernziele ermitteln", icon: "star", fn: () => run("goals") }, { label: "Karteikarten erstellen", icon: "cards", fn: () => run("cards") }, { label: "Quiz erstellen", icon: "help", fn: () => run("quiz") }, ...(ink.st.strokes.length ? [{ label: "Skizze erklären", icon: "brush", fn: explainInk }, { label: "Handschrift in Text umwandeln", icon: "text", fn: handToText }] : [])]);
  async function handToText() { if (!hasKey()) return toast("Handschrift-Erkennung braucht die eingerichtete Lumi AI (Einstellungen → Lumi AI)."); toast("Lumi AI liest deine Handschrift …"); const r = await ai("Transkribiere die handschriftlichen Notizen auf dem Bild möglichst exakt als Text. Behalte Zeilenumbrüche und Listen bei (Listen mit „- “). Gib NUR den Text zurück, ohne Erklärung.", { image: { data: ink.snapshot(), type: "image/jpeg" }, max: 1500 }); if (r?.trim()) { body.insertAdjacentHTML("beforeend", textToHtml(r.trim())); dirty(); toast("Text eingefügt – die Handschrift bleibt erhalten"); } }
  async function explainInk() { if (!hasKey()) return toast("Bild-Analyse braucht die eingerichtete Lumi AI (Einstellungen → Lumi AI)."); toast("Lumi AI schaut hin…"); const r = await ai("Erkläre, was auf dieser Skizze zu sehen ist. Bei Mathematik oder Naturwissenschaft: erkläre Schritt für Schritt.", { image: { data: ink.snapshot(), type: "image/jpeg" } }); if (r) { const { el } = modal(`<h3>Lumi AI</h3><textarea class="field" rows="12">${esc(r)}</textarea>`, "wide"); } }
  const dl = (name, mime, data) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const printIt = () => { const w = open("", "_blank"); if (!w) return toast("Pop-up erlaubt?"); w.document.write(`<title>${esc(d.title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:30px auto;padding:0 20px}table{border-collapse:collapse}td,th{border:1px solid #bbb;padding:6px 10px}img{max-width:100%}pre{background:#f3f3f3;padding:12px;border-radius:8px}blockquote{border-left:4px solid #ccc;margin:0;padding-left:14px;color:#555}ul.chk{list-style:none;padding-left:4px}</style><h1>${esc(d.title)}</h1>${body.innerHTML}`); w.document.close(); setTimeout(() => w.print(), 400); };
  const outlineModal = () => { const hs = $$("h1,h2,h3", body); const { el, close } = modal(`<h3>Gliederung</h3><div class="outline">${hs.length ? hs.map((h, i) => `<button class="o${h.tagName[1]}" data-o="${i}">${esc(h.textContent.trim() || "…")}</button>`).join("") : `<p class="note">Noch keine Überschriften. Tippe „/“ → Überschrift.</p>`}</div>`); $$("[data-o]", el).forEach(b => b.onclick = () => { close(); hs[+b.dataset.o].scrollIntoView({ behavior: "smooth", block: "center" }); }); };
  $("#mo-m", m).onclick = e => menu(e.currentTarget, [{ label: stat, icon: "note", fn: () => {} }, "-", { label: "Umbenennen", icon: "pen", fn: rename }, { label: "Fach zuordnen…", icon: "star", fn: () => { const { el, close } = modal(`<h3>Fach zuordnen</h3><div class="chips">${[{ id: "", name: "Kein Fach", color: "#999" }, ...D.subjects].map(x => `<button class="chip ${x.id === d.subjectId ? "on" : ""}" data-s="${x.id}"><i class="sdot" style="background:${x.color}"></i>${esc(x.name)}</button>`).join("")}</div>`); $$("[data-s]", el).forEach(b => b.onclick = () => { d.subjectId = b.dataset.s; save(); close(); refreshNav(); toast("Zugeordnet"); }); } }, ...(d.msLink ? [{ label: "In OneNote öffnen", icon: "link", fn: () => window.open(d.msLink, "_blank", "noopener") }] : []), { label: "Suchen & Ersetzen", icon: "search", fn: openFind }, { label: "Verlinkt von …", icon: "link", fn: backlinks }, { label: "Gliederung", icon: "list", fn: outlineModal }, { label: "Als PDF drucken", icon: "file", fn: printIt }, { label: "Als Textdatei (.txt)", icon: "note", fn: () => dl(d.title + ".txt", "text/plain", body.innerText) }, { label: "Als HTML-Datei", icon: "code", fn: () => dl(d.title + ".html", "text/html", `<meta charset="utf-8"><title>${esc(d.title)}</title>${body.innerHTML}`) }, "-", { label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); toast(d.pinned ? "Angeheftet" : "Gelöst"); } }, { label: "Duplizieren", icon: "copy", fn: async () => { const id = uid(); D.docs.unshift({ ...d, id, title: d.title + " (Kopie)", created: Date.now(), updated: Date.now(), msId: undefined, source: undefined, pinned: false }); await KV.set("html:" + id, body.innerHTML); if (ink.st.strokes.length) await KV.set("ink:" + id, ink.st.strokes); save(); go("doc/" + id); } }, "-", { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); go("docs/" + (d.folderId || "")); } }]);
  /* ink layer: write and draw in the same document */
  const paper = $("#paperc", m); setScroller(paper); const inkSave = debounce(async () => { if (!D.docs.includes(d)) return; d.hasInk = ink.st.strokes.length > 0; d.updated = Date.now(); await KV.set("ink:" + d.id, ink.st.strokes); save(); svEl.textContent = "Gespeichert"; }, 600);
  const fitInk = mx => { paper.style.minHeight = mx > 0 ? Math.max(mx + 260, 0) + "px" : ""; };
  const ink = createInk(paper, d, { grid: true, bar: $("#rib-draw", m), onChange: (strokes, mx) => { svEl.textContent = "Speichert…"; fitInk(mx); inkSave(); window.__co?.touch(); } });
  const inkData = await KV.get("ink:" + d.id); if (inkData?.length) { ink.load(inkData); fitInk(Math.max(...inkData.flatMap(s => s.pts.map(q => q[1])))); } else ink.load([]);
  const tbSave = debounce(async () => { if (!D.docs.includes(d)) return; d.updated = Date.now(); await KV.set("tb:" + d.id, TBX.get()); save(); svEl.textContent = "Gespeichert"; }, 500);
  const TBX = mountTextBoxes(paper, { onChange: () => { svEl.textContent = "Speichert…"; tbSave(); window.__co?.touch(); } }); TBX.load(await KV.get("tb:" + d.id)); LEAVE.push(() => TBX.destroy());
  const CO = collabAttach({ d, m, body, TBX, ink, dirty, svEl }); LEAVE.push(() => CO.destroy());
  let mode = "write"; const msw = $("#msw", m);
  const setMode = k => { mode = k; ink.mode(k === "draw"); body.contentEditable = k === "write"; m.classList.toggle("drawing", k === "draw"); msw.dataset.m = k; $$("button", msw).forEach(b => b.classList.toggle("on", b.dataset.m === k)); if (k === "draw") { getSelection().removeAllRanges(); bub.hidden = true; } else body.focus({ preventScroll: true }); };
  $$("button", msw).forEach(b => b.onclick = () => setMode(b.dataset.m));
  /* Menüband: Kategorien wie in Word (Start · Einfügen · Zeichnen · Design · Überprüfen · Ansicht); Klick auf die aktive Kategorie klappt das Band ein/aus */
  { const tabs = $$("#rtabs [data-t]", m), panels = $$(".rp", m), rib = $("#rib", m); let cur = "start";
    
    const show = (t, init) => { cur = t; tabs.forEach(b => { b.classList.toggle("on", b.dataset.t === t); b.setAttribute("aria-selected", b.dataset.t === t); }); panels.forEach(p => p.classList.toggle("on", p.dataset.pn === t)); if (!init) setMode(t === "draw" ? "draw" : "write"); };
    tabs.forEach(b => b.onclick = () => { if (b.dataset.t === cur) return; show(b.dataset.t); });
    show("start", true);
    const paintR = () => { $("#r-acv", m).textContent = { suggest: "Vorschläge", auto: "Automatisch", off: "Aus" }[D.profile.autoCorrect || "suggest"]; const sv = $("#r-srcv", m); if (sv) sv.textContent = sourcesOn() ? "An" : "Aus"; };
    paintR(); $("#r-ac", m).onclick = () => { const o = ["suggest", "auto", "off"], i = o.indexOf(D.profile.autoCorrect || "suggest"); D.profile.autoCorrect = o[(i + 1) % 3]; save(); paintR(); toast("Auto-Korrektur: " + { suggest: "Vorschläge", auto: "automatisch übernehmen", off: "aus" }[D.profile.autoCorrect]); };
    $("#r-src", m)?.addEventListener("click", () => { D.profile.sources = !sourcesOn(); save(); paintR(); });
  }
  LEAVE.push(() => { ink.destroy(); });
  try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
  if (!body.innerHTML.trim()) body.innerHTML = "<p><br></p>";
  if (window.__aiReveal === d.id && html && html.trim()) {
    window.__aiReveal = ""; body.contentEditable = "false"; svEl.textContent = "Lumi AI schreibt …"; paper.classList.add("ai-writing");
    const orig = body.innerHTML, ms = wordReveal(body);
    setTimeout(() => { body.innerHTML = orig; body.contentEditable = "true"; paper.classList.remove("ai-writing"); svEl.textContent = "Gespeichert"; }, ms);
  }
  count(); if (!html || !html.trim()) body.focus();
}

/* ---------- file viewer ---------- */
async function fileViewer(m, d) {
  const blob = await KV.get("blob:" + d.id); const url = blob ? URL.createObjectURL(blob) : "";
  const isImg = /^image\//.test(d.mime), isPdf = d.mime === "application/pdf" || /\.pdf$/i.test(d.title), isTxt = /^text\//.test(d.mime) || /\.(txt|md|csv)$/i.test(d.title);
  if (isPdf && blob) return pdfEditor(m, d, blob);
  m.innerHTML = `<div class="editor"><div class="ed-head"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><input class="ed-title" id="et" value="${esc(d.title)}">${subjectSelect(d.subjectId, "ed-sub")}<button class="btn ghost" id="ai-m">${ic("spark")}Lumi AI</button><a class="btn ghost" href="${url}" download="${esc(d.title)}">${ic("download")}<span class="hide-sm">Laden</span></a><button class="icon-btn" id="del" aria-label="Löschen">${ic("trash")}</button></div>
  <div class="viewer">${!blob ? `<p class="empty">Datei nicht gefunden.</p>` : isImg ? `<img src="${url}" alt="${esc(d.title)}">` : isPdf ? `<iframe src="${url}" title="${esc(d.title)}"></iframe>` : isTxt ? `<pre id="txtv">Lädt…</pre>` : `<div class="emptybox"><div class="big-ic">${ic("file")}</div><h3>${esc(d.title)}</h3><p>${(d.size / 1024).toFixed(0)} KB – für diesen Dateityp gibt es keine Vorschau. Lade die Datei herunter.</p></div>`}</div></div>`;
  if (isTxt && blob) blob.text().then(t => $("#txtv", m).textContent = t);
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || "")); $("#del", m).onclick = async () => { await deleteDoc(d); go("docs/" + (d.folderId || "")); };
  $("#et", m).onchange = e => { d.title = e.target.value.trim() || d.title; d.updated = Date.now(); save(); };
  $(".ed-sub", m).onchange = e => { d.subjectId = e.target.value; save(); refreshNav(); };
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [{ label: "Zusammenfassen", icon: "list", fn: async () => aiTool("summary", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Einfach erklären", icon: "help", fn: async () => aiTool("explain", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Frage zum Dokument…", icon: "search", fn: async () => aiTool("ask", await docText(d), { title: d.title }) }, "-", { label: "Karteikarten erstellen", icon: "cards", fn: async () => aiTool("cards", await docText(d), { title: d.title, subjectId: d.subjectId }) }, { label: "Quiz erstellen", icon: "help", fn: async () => aiTool("quiz", await docText(d), { title: d.title, subjectId: d.subjectId }) }, ...(isImg ? [{ label: "Bild von Lumi AI erklären lassen", icon: "camera", fn: async () => { const r = await explainImage(blob); if (r) modal(`<h3>Lumi-AI-Erklärung</h3><div class="result">${esc(r)}</div>`, "wide"); } }] : [])]);
}
async function blobToJpeg(b, max = 1400) { const bmp = await createImageBitmap(b), s = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas"); c.width = bmp.width * s; c.height = bmp.height * s; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(bmp, 0, 0, c.width, c.height); return c.toDataURL("image/jpeg", .85).split(",")[1]; }
async function explainImage(b) { if (!hasKey()) { toast("Bild-Analyse braucht die eingerichtete Lumi AI (Einstellungen → Lumi AI)."); return null; } toast("Lumi AI schaut sich das Bild an…"); return ai("Beschreibe und erkläre, was auf dem Bild zu sehen ist (Aufgabe, Skizze, Tafelbild o. Ä.). Falls es eine Aufgabe ist, gib Hinweise zum Lösungsweg statt nur das Ergebnis.", { image: { data: await blobToJpeg(b), type: "image/jpeg" } }); }
