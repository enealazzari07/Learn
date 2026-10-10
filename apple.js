"use strict";
/* Lumi – Apple-Kalender (und jeder andere Kalender mit ICS-Adresse): Abo über „Öffentlicher Kalender“, nur lesend, ohne Passwort.
   Termine der nächsten 90 Tage liegen in D.apple.events und erscheinen überall dort, wo auch Outlook-Termine stehen. */
const APPLE_COLORS = ["#ff3b30", "#ff9500", "#34c759", "#007aff", "#af52de", "#5856d6"];
const appleCfg = () => D.apple || (D.apple = { feeds: [], events: [], lastSync: 0 });
const icsUnfold = t => t.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
const icsUnesc = s => String(s || "").replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
function icsTzMs(y, mo, d, h, mi, s, zone) {   // lokale Zeit in Zeitzone -> UTC-Millisekunden
  const guess = Date.UTC(y, mo, d, h, mi, s);
  try {
    const off = t => { const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(t)).map(x => [x.type, x.value])); return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - t; };
    let t = guess - off(guess); t = guess - off(t); return t;
  } catch { return new Date(y, mo, d, h, mi, s).getTime(); }
}
function icsDate(val, params) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(String(val || "").trim()); if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2] - 1, +m[3]]; if (m[4] === undefined) return { t: new Date(y, mo, d).getTime(), allDay: true };
  const [h, mi, s] = [+m[4], +m[5], +m[6]];
  if (m[7]) return { t: Date.UTC(y, mo, d, h, mi, s), allDay: false };
  const tz = /TZID=([^;:]+)/i.exec(params || ""); return { t: tz ? icsTzMs(y, mo, d, h, mi, s, tz[1].replace(/^"|"$/g, "")) : new Date(y, mo, d, h, mi, s).getTime(), allDay: false };
}
const icsDur = v => { const m = /^(-)?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(v || ""); if (!m) return 0; return (m[1] ? -1 : 1) * (((+m[2] || 0) * 7 + (+m[3] || 0)) * 864e5 + (+m[4] || 0) * 36e5 + (+m[5] || 0) * 6e4 + (+m[6] || 0) * 1e3); };
function icsParse(text, from, to) {
  const ev = []; let cur = null;
  for (const line of icsUnfold(text)) {
    if (line === "BEGIN:VEVENT") { cur = { p: {} }; continue; }
    if (line === "END:VEVENT") { if (cur) ev.push(cur); cur = null; continue; }
    if (!cur) continue; const i = line.indexOf(":"); if (i < 0) continue;
    const head = line.slice(0, i), val = line.slice(i + 1), semi = head.indexOf(";"), name = (semi < 0 ? head : head.slice(0, semi)).toUpperCase(), params = semi < 0 ? "" : head.slice(semi + 1);
    if (name === "EXDATE") (cur.ex = cur.ex || []).push(...val.split(",").map(v => icsDate(v, params)).filter(Boolean).map(x => x.t)); else cur.p[name] = { v: val, params };
  }
  const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }, out = [], overrides = new Set();
  const dayKey = t => { const d = new Date(t); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); };
  for (const e of ev) if (e.p["RECURRENCE-ID"]) { const r = icsDate(e.p["RECURRENCE-ID"].v, e.p["RECURRENCE-ID"].params); if (r) overrides.add((e.p.UID?.v || "") + "|" + dayKey(r.t)); }
  for (const e of ev) {
    if (/CANCELLED/i.test(e.p.STATUS?.v || "")) continue;
    const s = e.p.DTSTART && icsDate(e.p.DTSTART.v, e.p.DTSTART.params); if (!s) continue;
    const en = e.p.DTEND && icsDate(e.p.DTEND.v, e.p.DTEND.params), len = en ? Math.max(0, en.t - s.t) : e.p.DURATION ? icsDur(e.p.DURATION.v) : (s.allDay ? 864e5 : 0);
    const base = { title: icsUnesc(e.p.SUMMARY?.v) || "(ohne Titel)", loc: icsUnesc(e.p.LOCATION?.v), body: icsUnesc(e.p.DESCRIPTION?.v).slice(0, 400), allDay: s.allDay, uid: e.p.UID?.v || "" };
    const push = t => { if (t + len <= from || t >= to) return; const d = new Date(t), de = new Date(t + len - (s.allDay ? 1 : 0)), p2 = n => String(n).padStart(2, "0"); out.push({ ...base, id: base.uid + "@" + t, date: iso(d), time: s.allDay ? "" : p2(d.getHours()) + ":" + p2(d.getMinutes()), end: s.allDay ? "" : p2(de.getHours()) + ":" + p2(de.getMinutes()), endDate: iso(de), t }); };
    const rr = e.p.RRULE && Object.fromEntries(e.p.RRULE.v.split(";").map(x => x.split("="))); 
    if (!rr || e.p["RECURRENCE-ID"]) { push(s.t); continue; }
    const freq = rr.FREQ, step = Math.max(1, +rr.INTERVAL || 1), until = rr.UNTIL ? (icsDate(rr.UNTIL, "")?.t ?? Infinity) : Infinity, maxN = rr.COUNT ? +rr.COUNT : Infinity;
    const by = rr.BYDAY ? rr.BYDAY.split(",").map(x => { const m = /^([+-]?\d+)?([A-Z]{2})$/.exec(x); return m ? { n: m[1] ? +m[1] : 0, d: WD[m[2]] } : null; }).filter(Boolean) : [], bmd = rr.BYMONTHDAY ? rr.BYMONTHDAY.split(",").map(Number) : null;
    const s0 = new Date(s.t), tod = s.allDay ? 0 : s.t - new Date(s0.getFullYear(), s0.getMonth(), s0.getDate()).getTime();
    const mon0 = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate() - ((s0.getDay() + 6) % 7)).getTime();
    let count = 0, guard = 0;
    for (let d = new Date(s0.getFullYear(), s0.getMonth(), s0.getDate()); d.getTime() <= to && guard++ < 6000; d.setDate(d.getDate() + 1)) {
      let hit = false; const dd = Math.round((d.getTime() - new Date(s0.getFullYear(), s0.getMonth(), s0.getDate()).getTime()) / 864e5);
      if (freq === "DAILY") hit = dd % step === 0;
      else if (freq === "WEEKLY") { const wk = Math.floor(Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)).getTime() - mon0) / 864e5) / 7); hit = wk % step === 0 && (by.length ? by.some(b => b.d === d.getDay()) : d.getDay() === s0.getDay()); }
      else if (freq === "MONTHLY") { const mm = (d.getFullYear() - s0.getFullYear()) * 12 + d.getMonth() - s0.getMonth(); if (mm % step === 0) { if (bmd) hit = bmd.includes(d.getDate()) || bmd.some(x => x < 0 && d.getDate() === new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() + x + 1); else if (by.length) hit = by.some(b => b.d === d.getDay() && (!b.n || (b.n > 0 ? Math.ceil(d.getDate() / 7) === b.n : d.getDate() > new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() + b.n * 7 - 7 && d.getDate() <= new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() + (b.n + 1) * 7 - 7))); else hit = d.getDate() === s0.getDate(); } }
      else if (freq === "YEARLY") hit = (d.getFullYear() - s0.getFullYear()) % step === 0 && d.getMonth() === s0.getMonth() && d.getDate() === s0.getDate();
      if (!hit) continue;
      const t = s.allDay ? d.getTime() : (() => { const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() + tod; return a; })();
      if (t > until) break; if (++count > maxN) break;
      if ((e.ex || []).some(x => dayKey(x) === dayKey(t)) || overrides.has(base.uid + "|" + dayKey(t))) continue;
      push(t);
    }
  }
  return out;
}
async function appleSync() {
  const c = appleCfg(), from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from); to.setDate(to.getDate() + 90); const all = [], errors = [];
  for (const f of c.feeds) {
    try {
      const r = await fetch("/api/ics?url=" + encodeURIComponent(f.url), { cache: "no-store" });
      if (!r.ok) { let m = ""; try { m = (await r.json()).error; } catch {} throw new Error(m || "Fehler " + r.status); }
      const evs = icsParse(await r.text(), from.getTime(), to.getTime()); evs.forEach(e => { e.feed = f.id; e.color = f.color; }); all.push(...evs); f.count = evs.length; f.err = "";
    } catch (e) { f.err = e.message; errors.push(`${f.name}: ${e.message}`); }
  }
  if (!errors.length || all.length) c.events = all; c.lastSync = Date.now(); save(); return { count: all.length, errors };
}
const appleAuto = () => { const c = D.apple; if (c && c.feeds.length && Date.now() - (c.lastSync || 0) > 20 * 60 * 1000 && location.protocol.startsWith("http")) appleSync().then(() => { if (typeof curView !== "undefined" && curView === "today") renderView(); }).catch(() => {}); };
function applePanelHtml() {
  const c = appleCfg();
  return `<div class="panel apl"><h2>${ic("cal")} Apple Kalender</h2>
  <p class="note">Lumi zeigt deine Termine der nächsten 90 Tage – nur lesend, ohne Passwort. Funktioniert auch mit Google- und anderen Kalendern, die einen ICS-Link haben.</p>
  ${c.feeds.map(f => `<div class="apf"><i style="background:${f.color}"></i><span><b>${esc(f.name)}</b><small>${f.err ? `<em class="bad">${esc(f.err)}</em>` : (f.count != null ? f.count + " Termine" : "noch nicht geladen")}</small></span><button class="icon-btn" data-apx="${f.id}" aria-label="Entfernen">${ic("trash")}</button></div>`).join("")}
  <div class="apadd"><input class="field" id="ap-n" placeholder="Name, z. B. Schule" maxlength="40"><input class="field" id="ap-u" placeholder="Kalender-Link (webcal://… oder https://…)" autocomplete="off" inputmode="url"><button class="btn accent" id="ap-a">${ic("plus")}Verbinden</button></div>
  <div class="row" style="margin-top:8px">${c.feeds.length ? `<button class="btn ghost" id="ap-s">${ic("rot")}Jetzt synchronisieren</button><span class="note" style="margin:0">${c.lastSync ? "Zuletzt " + fmtAgo(c.lastSync) : ""}</span>` : ""}</div>
  <details class="msh"><summary>So bekommst du den Link (Apple Kalender)</summary><ol>
    <li><b>Mac:</b> Kalender-App → Rechtsklick auf deinen Kalender (Seitenleiste) → <b>Freigabeoptionen</b> → <b>Öffentlicher Kalender</b> aktivieren → <b>Link kopieren</b>.</li>
    <li><b>iPhone/iPad:</b> Kalender → unten <b>Kalender</b> → ⓘ neben dem Kalender → <b>Öffentlicher Kalender</b> einschalten → <b>Link teilen</b> → Kopieren.</li>
    <li>Link hier einfügen und auf „Verbinden“ tippen. <i>Wichtig:</i> Wer den Link kennt, kann den Kalender lesen – schalte „Öffentlicher Kalender“ wieder aus, wenn du ihn nicht mehr brauchst.</li></ol></details></div>`;
}
function bindApplePanel(m) {
  const c = appleCfg(), re = () => V.settings(m);
  $("#ap-a", m) && ($("#ap-a", m).onclick = async () => {
    const url = $("#ap-u", m).value.trim().replace(/^webcal:/i, "https:"), name = $("#ap-n", m).value.trim() || "Kalender";
    if (!/^https:\/\//i.test(url)) return toast("Bitte einen Kalender-Link einfügen (webcal:// oder https://)");
    if (c.feeds.some(f => f.url === url)) return toast("Dieser Kalender ist schon verbunden");
    c.feeds.push({ id: uid(), name, url, color: APPLE_COLORS[c.feeds.length % APPLE_COLORS.length] }); save(); toast("Lade Kalender …");
    const r = await appleSync(); toast(r.errors.length ? r.errors[0] : `${r.count} Termine geladen`); re();
  });
  $$("[data-apx]", m).forEach(b => b.onclick = () => { c.feeds = c.feeds.filter(f => f.id !== b.dataset.apx); c.events = c.events.filter(e => e.feed !== b.dataset.apx); save(); re(); });
  $("#ap-s", m) && ($("#ap-s", m).onclick = async () => { toast("Synchronisiere …"); const r = await appleSync(); toast(r.errors.length ? r.errors[0] : `${r.count} Termine`); re(); });
}
