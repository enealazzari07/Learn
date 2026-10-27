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
const msId = () => ((D.ms?.clientId || "").trim() || (window.LUMI_CONFIG?.msClientId || "").trim());
const msTenant = () => ((D.ms?.tenant || "").trim() || window.LUMI_CONFIG?.msTenant || "common");
const msReady = () => !!msId();
function msCfg() { return D.ms || (D.ms = { clientId: "", tenant: "common", services: { cal: true, note: true, edu: true, chat: false }, autoExams: true, autoNotes: true, events: [], chats: [], teams: [], lastSync: 0, account: "", report: null }); }
const msRedirect = () => location.origin + location.pathname.replace(/index\.html$/, "");
const msScopes = () => ["User.Read", ...Object.entries(msCfg().services).filter(([, v]) => v).flatMap(([k]) => MS_SVC[k].s)];
const msConnected = () => !!msCfg().account;
let msalApp = null;

async function msInit() {
  if (!msId()) throw new Error("Die Microsoft-Anbindung ist noch nicht eingerichtet (Client-ID fehlt).");
  if (msalApp) return;
  await loadScript("https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js");
  msalApp = new msal.PublicClientApplication({ auth: { clientId: msId(), authority: "https://login.microsoftonline.com/" + msTenant(), redirectUri: msRedirect() }, cache: { cacheLocation: "localStorage" } });
  if (msalApp.initialize) await msalApp.initialize();
}
async function msLogin() {
  msalApp = null; await msInit();
  const r = await msalApp.loginPopup({ scopes: msScopes(), prompt: "select_account" });
  msalApp.setActiveAccount(r.account); msCfg().account = r.account.username || r.account.name || "verbunden"; save();
}
/* Anmelde-Fenster: Dienste wählen, bei Microsoft anmelden (Popup), sofort synchronisieren */
const MS_LOGO = `<svg viewBox="0 0 23 23" class="ms-logo" aria-hidden="true"><path fill="#f25022" d="M1 1h10v10H1z"/><path fill="#7fba00" d="M12 1h10v10H12z"/><path fill="#00a4ef" d="M1 12h10v10H1z"/><path fill="#ffb900" d="M12 12h10v10H12z"/></svg>`;
function msLoginModal() {
  return new Promise(resolve => {
    const c = msCfg(); let done = false;
    const SV = [["cal", "Outlook-Kalender", "Termine und Prüfungen", "cal"], ["note", "OneNote", "Seiten und Notizbücher", "note"], ["edu", "Teams-Aufgaben", "Abgaben und Aufgaben", "list"], ["chat", "Teams-Chats", "Nachrichten und Teams-Liste (optional)", "quote"]];
    const { el, close } = modal(`<div class="msl"><div class="msl-top">${MS_LOGO}<h3>Mit Microsoft verbinden</h3><p>Hole Kalender, OneNote und Teams in Lumi. Lumi liest nur – es schreibt nichts zurück.</p></div>
      <div class="msl-sv">${SV.map(([k, n, d, i]) => `<label class="msl-r"><span class="msl-i">${ic(i)}</span><span class="msl-t"><b>${n}</b><small>${d}</small></span><input type="checkbox" data-sv="${k}" ${c.services[k] ? "checked" : ""}><i class="msl-sw"></i></label>`).join("")}</div>
      <div id="msl-act"></div><p class="msl-m" id="msl-m"></p><p class="msl-fine">Die Anmeldung öffnet ein Fenster direkt bei Microsoft. Dein Passwort sieht Lumi nie.</p></div>`);
    const act = $("#msl-act", el), msg = (t, bad) => { const m = $("#msl-m", el); m.textContent = t; m.classList.toggle("bad", !!bad); };
    const readSv = () => $$("[data-sv]", el).forEach(i => c.services[i.dataset.sv] = i.checked);
    const paint = () => {
      if (c.account) { act.innerHTML = `<div class="msl-ok"><i class="ldot on"></i><b>Verbunden als ${esc(c.account)}</b></div><div class="row"><button class="btn primary" id="msl-sync">Jetzt synchronisieren</button><button class="btn ghost" id="msl-out">Abmelden</button></div>`; return; }
      if (!msReady()) { act.innerHTML = `<div class="msl-warn"><b>Client-ID fehlt</b><p>Trage sie dauerhaft in Vercel ein (<code>MS_CLIENT_ID</code>) oder füge sie hier für dieses Gerät ein.</p><input class="field" id="msl-id" placeholder="Anwendungs-(Client-)ID, z. B. 1a2b3c4d-…" autocomplete="off"><button class="btn primary" id="msl-save">Speichern &amp; weiter</button></div>`; return; }
      act.innerHTML = `<button class="btn primary big msl-go" id="msl-go">${MS_LOGO}Mit Microsoft anmelden</button>`;
    };
    const run = async (login) => {
      readSv(); save(); const b = $("#msl-go", el) || $("#msl-sync", el); if (b) b.disabled = true;
      try {
        if (login) { msg("Das Microsoft-Fenster öffnet sich … (Pop-ups erlauben)"); await msLogin(); }
        msg("Daten werden geladen …"); const r = await msSync();
        msg(r.errors.length ? "Verbunden – mit Hinweisen (siehe Einstellungen)." : `Fertig: ${r.events} Termine, ${r.pages} OneNote-Seiten, ${r.exams + r.tasks} neue Einträge.`);
        done = true; refreshNav(); if (["today", "settings", "planner", "docs", "exams"].includes(curView)) renderView(); setTimeout(() => { close(); resolve(true); }, 1400);
      } catch (e) { const t = String(e.errorCode || e.message || e); msg(e instanceof Event ? "Die Microsoft-Anmeldung konnte nicht geladen werden – bitte Internetverbindung prüfen." : /popup/i.test(t) ? "Das Pop-up wurde blockiert – bitte Pop-ups für diese Seite erlauben." : /user_cancelled|cancel/i.test(t) ? "Anmeldung abgebrochen." : /AADSTS50011|redirect/i.test(t) ? "Die Umleitungs-URI in Azure passt nicht (muss als „Single-Page-Anwendung“ eingetragen sein)." : "Anmeldung fehlgeschlagen: " + (e.errorMessage || e.message || t).slice(0, 140), true); paint(); bind(); }
    };
    const bind = () => {
      $("#msl-go", el)?.addEventListener("click", () => run(true));
      $("#msl-sync", el)?.addEventListener("click", () => run(false));
      $("#msl-out", el)?.addEventListener("click", async () => { await msLogout(); msg("Abgemeldet."); paint(); bind(); });
      $("#msl-save", el)?.addEventListener("click", () => { const v = $("#msl-id", el).value.trim(); if (!/^[0-9a-f-]{36}$/i.test(v)) return msg("Das sieht nicht wie eine Client-ID aus (36 Zeichen mit Bindestrichen).", true); c.clientId = v; save(); msg(""); paint(); bind(); });
      $$("[data-sv]", el).forEach(i => i.onchange = () => { readSv(); save(); });
    };
    paint(); bind(); const mask = el.closest(".mask"); if (mask) new MutationObserver(() => { if (!mask.isConnected && !done) resolve(false); }).observe(document.body, { childList: true });
  });
}
const msQuickLogin = () => msLoginModal();
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
    const ensureF = (name, parent) => { let f = D.folders.find(x => x.name === name && (x.parent || "") === (parent || "")); if (!f) { f = { id: uid(), name, parent: parent || "", color: COLORS[D.folders.length % COLORS.length], subjectId: parent ? "" : guessSubject(name) }; D.folders.push(f); } return f.id; };
    for (const n of nb.value || []) for (const sec of n.sections || []) {
      if (budget <= 0) break;
      const pg = await graph(`/me/onenote/sections/${sec.id}/pages?$top=15&$orderby=lastModifiedDateTime desc&$select=id,title,lastModifiedDateTime,links`);
      for (const p of pg.value || []) {
        const ex = D.docs.find(d => d.msId === p.id), fid = ensureF(sec.displayName || "Abschnitt", ensureF(n.displayName || "OneNote", ""));
        if (ex && !ex.folderId) ex.folderId = fid;
        if (ex && ex.msMod === p.lastModifiedDateTime) continue;
        if (ex && ex.updated > (ex.msImported || 0) + 2000) continue;          // locally edited – keep local version
        if (budget-- <= 0) break;
        const html = cleanOneNote(await graph(`/me/onenote/pages/${p.id}/content`, { text: true })), now = Date.now(), txt = htmlToText(html).slice(0, 60000);
        const rec = { title: p.title || "OneNote-Seite", text: txt, msId: p.id, msMod: p.lastModifiedDateTime, msImported: now, msLink: p.links?.oneNoteWebUrl?.href || "", source: "onenote" };
        if (ex) Object.assign(ex, rec, { updated: now }); else D.docs.unshift({ id: uid(), type: "note", subjectId: guessSubject(`${n.displayName} ${sec.displayName} ${p.title}`) || subjectOfFolder(fid), folderId: fid, paper: D.profile.paper || "white", created: now, updated: now, ...rec });
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
  c.lastSync = Date.now(); c.report = rep; save(); try { refreshNav(); } catch {} return rep;
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
/* Termine eines Tages aus allen verbundenen Kalendern (Outlook + Apple/ICS) */
const msEventsOn = date => [...(D.ms?.events || []).filter(e => e.date === date), ...(D.apple?.events || []).filter(e => e.date === date || (e.allDay && e.date < date && e.endDate >= date))].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

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
