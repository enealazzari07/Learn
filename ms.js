"use strict";
/* Lumi – Microsoft 365 integration (Microsoft Graph): Outlook calendar, OneNote, Teams assignments & chats.
   Runs entirely in the browser with MSAL (auth code + PKCE). Needs an Azure app registration (SPA). */

const MS_SVC = {
  cal: { n: "Outlook-Kalender (Termine, Prüfungen)", s: ["Calendars.Read"] },
  note: { n: "OneNote (Seiten & Notizbücher)", s: ["Notes.Read"] },
  edu: { n: "Teams-Aufgaben (Education)", s: ["EduAssignments.Read", "EduRoster.ReadBasic"] },
  chat: { n: "Teams-Chats & Teams-Liste", s: ["Chat.Read", "Team.ReadBasic.All"] },
};
const EXAM_RE = /klausur|prüfung|pruefung|klassenarbeit|schulaufgabe|schularbeit|leistungskontrolle|lernkontrolle|vokabeltest|\btest\b|\bexam\b|\bquiz\b|\barbeit\b|abitur|\bkl\.\s?\d|\bLK\b|testat|kolloquium|abgabe/i;
function msCfg() { return D.ms || (D.ms = { clientId: "", tenant: "common", services: { cal: true, note: true, edu: true, chat: false }, autoExams: true, autoNotes: true, events: [], chats: [], teams: [], lastSync: 0, account: "", report: null }); }
const msRedirect = () => location.origin + location.pathname.replace(/index\.html$/, "");
const msScopes = () => ["User.Read", ...Object.entries(msCfg().services).filter(([, v]) => v).flatMap(([k]) => MS_SVC[k].s)];
const msConnected = () => !!msCfg().account;
let msalApp = null;

async function msInit() {
  const c = msCfg(); if (!c.clientId) throw new Error("Bitte zuerst die Anwendungs-(Client-)ID eintragen.");
  if (msalApp) return;
  await loadScript("https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js");
  msalApp = new msal.PublicClientApplication({ auth: { clientId: c.clientId.trim(), authority: "https://login.microsoftonline.com/" + (c.tenant.trim() || "common"), redirectUri: msRedirect() }, cache: { cacheLocation: "localStorage" } });
  if (msalApp.initialize) await msalApp.initialize();
}
async function msLogin() {
  msalApp = null; await msInit();
  const r = await msalApp.loginPopup({ scopes: msScopes(), prompt: "select_account" });
  msalApp.setActiveAccount(r.account); msCfg().account = r.account.username || r.account.name || "verbunden"; save();
}
async function msLogout() {
  try { await msInit(); const a = msalApp.getActiveAccount() || msalApp.getAllAccounts()[0]; if (a) await msalApp.logoutPopup({ account: a, postLogoutRedirectUri: msRedirect() }); } catch {}
  const c = msCfg(); c.account = ""; c.events = []; c.chats = []; c.teams = []; c.lastSync = 0; save();
}
async function msToken() {
  await msInit(); const acc = msalApp.getActiveAccount() || msalApp.getAllAccounts()[0]; if (!acc) throw new Error("Nicht bei Microsoft angemeldet.");
  try { return (await msalApp.acquireTokenSilent({ scopes: msScopes(), account: acc })).accessToken; }
  catch { return (await msalApp.acquireTokenPopup({ scopes: msScopes(), account: acc })).accessToken; }
}
async function graph(path, { text = false, headers = {} } = {}) {
  const t = await msToken();
  const r = await fetch(path.startsWith("http") ? path : "https://graph.microsoft.com/v1.0" + path, { headers: { Authorization: "Bearer " + t, ...headers } });
  if (!r.ok) { const e = new Error("Graph " + r.status); e.status = r.status; throw e; }
  return text ? r.text() : r.json();
}

/* ---------- helpers ---------- */
const guessSubject = txt => {
  const t = (txt || "").toLowerCase(); if (!t) return "";
  const hit = D.subjects.find(s => t.includes(s.name.toLowerCase())) || D.subjects.find(s => s.name.length > 3 && t.includes(s.name.toLowerCase().slice(0, 4)));
  return hit?.id || "";
};
const utcToLocal = (dt, allDay) => { if (allDay) return { date: dt.slice(0, 10), time: "" }; const d = new Date(dt.replace(/\.\d+$/, "") + "Z"); return { date: iso(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` }; };
function cleanOneNote(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  $$("img,object,style,script,link", doc).forEach(e => e.remove());
  $$("*", doc).forEach(e => [...e.attributes].forEach(a => { if (!["href", "colspan", "rowspan"].includes(a.name)) e.removeAttribute(a.name); }));
  return doc.body.innerHTML.trim();
}

/* ---------- sync ---------- */
async function msSync() {
  const c = msCfg(), rep = { events: 0, exams: 0, pages: 0, tasks: 0, chats: 0, errors: [] };
  const fail = (what, e) => rep.errors.push(`${what}: ${e.status === 403 || e.status === 401 ? "keine Berechtigung (Admin-Zustimmung / Lizenz nötig)" : e.status === 404 ? "für dieses Konto nicht verfügbar" : e.message}`);
  if (c.services.cal) try {
    const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(s); e.setDate(e.getDate() + 90);
    const j = await graph(`/me/calendarview?startDateTime=${s.toISOString()}&endDateTime=${e.toISOString()}&$top=250&$orderby=start/dateTime&$select=id,subject,start,end,location,bodyPreview,isAllDay,webLink`, { headers: { Prefer: 'outlook.timezone="UTC"' } });
    c.events = (j.value || []).map(x => { const a = utcToLocal(x.start.dateTime, x.isAllDay), b = utcToLocal(x.end.dateTime, x.isAllDay); return { id: x.id, title: x.subject || "(ohne Titel)", date: a.date, time: a.time, end: b.time, allDay: !!x.isAllDay, loc: x.location?.displayName || "", body: (x.bodyPreview || "").slice(0, 400), link: x.webLink || "" }; });
    rep.events = c.events.length;
    if (c.autoExams) c.events.filter(ev => EXAM_RE.test(ev.title)).forEach(ev => {
      let t = D.tasks.find(x => x.msId === ev.id);
      if (!t) { D.tasks.push({ id: uid(), title: ev.title, type: /abgabe/i.test(ev.title) ? "task" : "exam", due: ev.date, subjectId: guessSubject(ev.title + " " + ev.body), note: ("Aus Outlook" + (ev.time ? ` · ${ev.time} Uhr` : "") + (ev.loc ? " · " + ev.loc : "") + (ev.body ? "\n" + ev.body : "")).slice(0, 500), done: false, msId: ev.id, source: "outlook" }); rep.exams++; }
      else if (!t.done && (t.due !== ev.date || t.title !== ev.title)) { t.due = ev.date; t.title = ev.title; rep.exams++; }
    });
  } catch (e) { fail("Kalender", e); }
  if (c.services.note) try {
    const nb = await graph("/me/onenote/notebooks?$expand=sections($select=id,displayName)&$select=id,displayName"); let budget = 40;
    for (const n of nb.value || []) for (const sec of n.sections || []) {
      if (budget <= 0) break;
      const pg = await graph(`/me/onenote/sections/${sec.id}/pages?$top=15&$orderby=lastModifiedDateTime desc&$select=id,title,lastModifiedDateTime,links`);
      for (const p of pg.value || []) {
        const ex = D.docs.find(d => d.msId === p.id);
        if (ex && ex.msMod === p.lastModifiedDateTime) continue;
        if (ex && ex.updated > (ex.msImported || 0) + 2000) continue;          // locally edited – keep local version
        if (budget-- <= 0) break;
        const html = cleanOneNote(await graph(`/me/onenote/pages/${p.id}/content`, { text: true })), now = Date.now(), txt = htmlToText(html).slice(0, 60000);
        const rec = { title: p.title || "OneNote-Seite", text: txt, msId: p.id, msMod: p.lastModifiedDateTime, msImported: now, msLink: p.links?.oneNoteWebUrl?.href || "", source: "onenote" };
        if (ex) Object.assign(ex, rec, { updated: now }); else D.docs.unshift({ id: uid(), type: "note", subjectId: guessSubject(`${n.displayName} ${sec.displayName} ${p.title}`), created: now, updated: now, ...rec });
        await KV.set("html:" + (ex ? ex.id : D.docs[0].id), html); rep.pages++;
      }
    }
  } catch (e) { fail("OneNote", e); }
  if (c.services.edu) try {
    const cls = {}; try { ((await graph("/education/me/classes?$select=id,displayName")).value || []).forEach(x => cls[x.id] = x.displayName); } catch {}
    const as = await graph("/education/me/assignments?$top=60&$select=id,displayName,dueDateTime,classId,status,instructions");
    (as.value || []).forEach(a => {
      if (!a.displayName) return; const cn = cls[a.classId] || "", due = a.dueDateTime ? utcToLocal(a.dueDateTime.replace("Z", ""), false).date : "";
      const done = /submitted|returned/i.test(a.status || ""); let t = D.tasks.find(x => x.msId === a.id);
      const note = (cn ? cn + " (Teams)" : "Teams") + (a.instructions?.content ? "\n" + htmlToText(a.instructions.content).slice(0, 300) : "");
      if (!t) { D.tasks.push({ id: uid(), title: a.displayName, type: "hw", due, subjectId: guessSubject(cn + " " + a.displayName), note, done, msId: a.id, source: "teams" }); rep.tasks++; }
      else if (t.source === "teams") { t.due = due; if (done && !t.done) { t.done = true; t.doneAt = Date.now(); } }
    });
  } catch (e) { fail("Teams-Aufgaben", e); }
  if (c.services.chat) try {
    c.teams = ((await graph("/me/joinedTeams?$select=id,displayName")).value || []).map(t => t.displayName);
    const ch = await graph("/me/chats?$top=15&$expand=lastMessagePreview&$select=id,topic,chatType");
    c.chats = (ch.value || []).filter(x => x.lastMessagePreview?.body?.content).map(x => ({ topic: x.topic || (x.chatType === "oneOnOne" ? "Direktnachricht" : "Chat"), from: x.lastMessagePreview.from?.user?.displayName || "", text: htmlToText(x.lastMessagePreview.body.content).slice(0, 300), date: (x.lastMessagePreview.createdDateTime || "").slice(0, 10) }));
    rep.chats = c.chats.length;
  } catch (e) { fail("Teams-Chats", e); }
  c.lastSync = Date.now(); c.report = rep; save(); return rep;
}
async function msAuto() { const c = D.ms; if (!c?.account || Date.now() - (c.lastSync || 0) < 30 * 6e4) return; try { await msSync(); if (curView === "today" || curView === "planner") renderView(); } catch {} }

/* what the AI may know about the user's Microsoft data */
function msContext() {
  const c = D.ms; if (!c?.account) return "";
  const t = iso(), soon = (c.events || []).filter(e => e.date >= t && daysUntil(e.date) <= 21).slice(0, 40);
  let s = "";
  if (soon.length) s += "Termine im Outlook-Kalender (nächste 3 Wochen):\n" + soon.map(e => `- ${e.date}${e.time ? " " + e.time : ""} ${e.title}${e.loc ? " (" + e.loc + ")" : ""}${EXAM_RE.test(e.title) ? " [Prüfung/Test]" : ""}`).join("\n") + "\n";
  const tt = D.tasks.filter(x => !x.done && x.source === "teams").slice(0, 15); if (tt.length) s += "Offene Teams-Aufgaben:\n" + tt.map(x => `- ${x.title}${x.due ? " (fällig " + x.due + ")" : ""}`).join("\n") + "\n";
  if (c.chats?.length) s += "Letzte Teams-Nachrichten:\n" + c.chats.slice(0, 8).map(x => `- ${x.topic}${x.from ? " / " + x.from : ""}: ${x.text}`).join("\n") + "\n";
  const on = D.docs.filter(d => d.source === "onenote").slice(0, 25); if (on.length) s += "OneNote-Seiten (importiert): " + on.map(d => d.title).join("; ") + "\n";
  return s.trim();
}
const msEventsOn = date => (D.ms?.events || []).filter(e => e.date === date).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

/* learning goals ("Lernziele") for an exam: from linked document / OneNote page / calendar text */
async function extractGoals(text, title) {
  const T = clip(text, 12000);
  const r = await ai(`Extrahiere aus dem folgenden Material die Lernziele bzw. Prüfungsinhalte für „${title}“. Antworte als kurze Liste mit "- " (max. 12 Punkte), konkret und prüfungsrelevant.\nMATERIAL:\n${T}`, { max: 700, quiet: true });
  if (r) return r.trim();
  return localGoals(text);
}
function localGoals(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const hits = lines.filter(l => /lernziel|ich kann|kompetenz|prüfungsinhalt|themen?:|stoff/i.test(l) || /^[-•*]\s/.test(l)).slice(0, 12);
  return (hits.length ? hits : lines.slice(0, 8)).map(l => "- " + l.replace(/^[-•*]\s*/, "")).join("\n");
}
