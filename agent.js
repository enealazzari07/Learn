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
- create_cards {deck, cards:[{q,a}], (subject)} – Karteikarten in einem Stapel (wird bei Bedarf erstellt)
- add_task {title, type:"task"|"hw"|"exam", due:"JJJJ-MM-TT", (subject), (note)} – Aufgabe, Hausaufgabe oder Prüfung/Test eintragen
- complete_task {task} – Aufgabe als erledigt markieren
- add_grade {subject, title, value, (weight)} – Note eintragen
- delete_doc {doc} – Dokument löschen (der Nutzer muss bestätigen)
- open {view:"today"|"docs"|"cards"|"quiz"|"planner"|"grades"|"focus"|"settings"|"search"} oder {doc} – Bereich oder Dokument öffnen
"doc", "task", "deck" und "subject" gibst du mit der ID oder dem Titel aus der Liste unten an. Rechne relative Datumsangaben („nächsten Freitag“) anhand von „Heute“ in ein echtes Datum um. Erfinde keine Dokumente, die nicht in der Liste stehen. Wenn nur eine Frage gestellt wird, antworte normal ohne Block. Frage kurz nach, wenn eine wichtige Angabe fehlt (z. B. das Datum einer Prüfung).`;

function agentContext() {
  const path = f => folderPath(f).map(x => x.name).join("/");
  const L = (t, a) => a.length ? `${t}:\n${a.join("\n")}\n` : "";
  return `Heute: ${iso()} (${new Date().toLocaleDateString("de-DE", { weekday: "long" })})\n` +
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
  async create_note(a) { const fid = ensureFolderPath(a.folder), sid = findSubject(a.subject)?.id || subjectOfFolder(fid), html = textToHtml(String(a.content || "")), id = uid(); D.docs.unshift({ id, type: "note", title: String(a.title || "Neue Notiz").slice(0, 120), subjectId: sid || "", folderId: fid, paper: D.profile.paper || "white", updated: Date.now(), created: Date.now(), text: htmlToText(html) }); await KV.set("html:" + id, html); return { label: `Notiz „${D.docs[0].title}“ erstellt`, go: "doc/" + id }; },
  async append_to_note(a) { const d = findDoc(a.doc); if (!d || d.type !== "note") throw "Notiz nicht gefunden"; const h = ((await KV.get("html:" + d.id)) || "") + textToHtml(String(a.content || "")); await KV.set("html:" + d.id, h); d.text = htmlToText(h); d.updated = Date.now(); return { label: `Text zu „${d.title}“ hinzugefügt`, go: "doc/" + d.id }; },
  async rename_doc(a) { const d = findDoc(a.doc); if (!d || !String(a.title || "").trim()) throw "Dokument nicht gefunden"; const old = d.title; d.title = String(a.title).trim().slice(0, 120); d.updated = Date.now(); return { label: `„${old}“ umbenannt in „${d.title}“`, go: "doc/" + d.id }; },
  async move_doc(a) { const d = findDoc(a.doc); if (!d) throw "Dokument nicht gefunden"; d.folderId = ensureFolderPath(a.folder); d.subjectId = subjectOfFolder(d.folderId) || d.subjectId; d.updated = Date.now(); return { label: `„${d.title}“ verschoben nach ${["Home", ...folderPath(d.folderId).map(f => f.name)].join(" / ")}`, go: "docs/" + d.folderId }; },
  async create_folder(a) { const fid = ensureFolderPath((a.parent ? a.parent + "/" : "") + (a.name || "")); if (!fid) throw "Kein Name"; return { label: `Ordner „${D.folders.find(f => f.id === fid).name}“ erstellt`, go: "docs/" + fid }; },
  async create_cards(a) {
    const cards = (a.cards || []).filter(c => c && c.q && c.a); if (!cards.length) throw "Keine Karten";
    let k = pick(D.decks, "id", a.deck); if (!k) { k = { id: uid(), title: String(a.deck || "Neuer Stapel").slice(0, 80), subjectId: findSubject(a.subject)?.id || "", cards: [] }; D.decks.unshift(k); }
    cards.forEach(c => k.cards.push({ id: uid(), q: String(c.q), a: String(c.a), box: 0, due: iso() })); return { label: `${cards.length} Karten in „${k.title}“`, go: "cards/" + k.id };
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
  if (["docs", "planner", "cards", "grades"].includes(curView)) renderView();
  return { text: text || "Erledigt.", acts };
}
