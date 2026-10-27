/* Lumi – Lumi Study Pro (Abo über Stripe Managed Payments). Das Abo wird live aus Stripe gelesen (api/subscription.js) – nichts davon liegt in unserer Datenbank.
   Kauf: api/checkout.js · Zahlungsart/Rechnungen: Stripe-Kundenportal (api/portal.js) · Kündigen/Fortsetzen: api/subscription.js */
const BILL = { cfg: null, row: null, loaded: false };
const isPlus = () => !!BILL.row && ["active", "trialing", "past_due"].includes(BILL.row.status) && (!BILL.row.current_period_end || new Date(BILL.row.current_period_end).getTime() > Date.now() - 3 * 864e5);
async function authHeader() {
  try { const { data } = await CLOUD.sb.auth.getSession(); return data.session ? { authorization: "Bearer " + data.session.access_token } : {}; } catch { return {}; }
}
async function subCall(body) {
  const r = await fetch("/api/subscription", { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "Fehler " + r.status); return j.sub || null;
}
/* Abo live aus Stripe laden; invoices=true holt zusätzlich die letzten Rechnungen */
async function plusLoad(invoices = false) {
  if (!CLOUD.sb || !CLOUD.user) { BILL.row = null; BILL.loaded = true; return; }
  try { BILL.row = await subCall({ action: "get", invoices }); } catch {}
  BILL.loaded = true;
}
async function billCall(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || "Fehler " + r.status); return j.url;
}
/* Sofortige Rückmeldung, solange Stripe die Seite vorbereitet */
function busy(msg) { const e = document.createElement("div"); e.className = "busy"; e.setAttribute("role", "status"); e.innerHTML = `<div class="busy-c"><i class="spin"></i><b>${msg}</b><small>Das dauert nur einen Moment.</small></div>`; document.body.appendChild(e); return () => e.remove(); }
addEventListener("pageshow", () => document.querySelectorAll(".busy").forEach(e => e.remove()));
const plusBuy = async plan => { const done = busy("Sichere Bezahlung wird vorbereitet …"); try { location.href = await billCall("/api/checkout", { plan, country: proCountry() }); } catch (e) { done(); toast(e.message); } };
const plusManage = async flow => { const done = busy(flow === "cancel" ? "Kündigung wird vorbereitet …" : "Stripe-Portal wird geöffnet …"); try { location.href = await billCall("/api/portal", flow ? { flow } : {}); } catch (e) { done(); toast(e.message); } };
const daysLeft = d => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 864e5));
const dLabel = n => n === 1 ? "1 Tag" : n + " Tage";
const dIn = n => n === 1 ? "1 Tag" : n + " Tagen";
const isTrial = () => isPlus() && BILL.row.status === "trialing";
const money = (c, cur) => `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(c / 100)} ${curName(String(cur || (BILL.cfg && BILL.cfg.currency) || "eur").toLowerCase())}`;
const dateDE = d => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
const dateShort = d => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const SUB_STATUS = { trialing: "Testversion", active: "Aktiv", past_due: "Zahlung überfällig", canceled: "Beendet", unpaid: "Unbezahlt", incomplete: "Unvollständig", incomplete_expired: "Abgelaufen", paused: "Pausiert" };
const INV_STATUS = { paid: "Bezahlt", open: "Offen", draft: "Entwurf", void: "Storniert", uncollectible: "Uneinbringlich" };
const cardName = b => ({ visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", jcb: "JCB", diners: "Diners Club", unionpay: "UnionPay" })[b] || (b ? b[0].toUpperCase() + b.slice(1) : "Karte");

const PRO_FEATURES = ["Lumi AI ohne Limit", "Alle kommenden Pro-Funktionen", "Du unterstützt die Weiterentwicklung von Lumi"];
function plusPanelHtml() {
  const c = BILL.cfg, r = BILL.row, list = `<ul class="prolist">${PRO_FEATURES.map(x => `<li>${ic("check")}${x}</li>`).join("")}</ul>`;
  const eligible = !r, trialD = (c && c.trial) || 14;
  const head = state => `<div class="prohead"><div><span class="probadge">Pro</span><h2>Lumi Study Pro</h2></div>${state ? `<span class="prostate">${state}</span>` : ""}</div>`;
  if (CLOUD.user && c && c.enabled && !BILL.loaded) return `<div class="panel propanel">${head("")}<p class="note">Abo wird bei Stripe geladen …</p></div>`;
  if (isPlus()) {
    const trialing = r.status === "trialing", left = daysLeft(r.current_period_end), cancelled = r.cancel_at_period_end;
    const trialLen = (c && c.trial) || 14, pct = Math.min(100, Math.max(4, Math.round((1 - left / trialLen) * 100)));
    const unit = r.interval === "year" ? "Jahr" : "Monat", price = r.amount != null ? `${money(r.amount, r.currency)} / ${unit} · ${r.tax_behavior === "exclusive" ? "zzgl." : "inkl."} MwSt.` : "–";
    const title = cancelled ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}` : trialing ? `Testversion endet in ${dIn(left)}` : r.status === "past_due" ? "Zahlung überfällig" : "Aktives Abo";
    const sub = cancelled ? "Danach wird nichts mehr berechnet. Du kannst das Abo bis dahin jederzeit wieder aktivieren." : trialing ? `Die Testversion endet am ${dateDE(r.current_period_end)}. Danach ${price}, wenn du nicht vorher kündigst.` : r.status === "past_due" ? "Die letzte Zahlung ist fehlgeschlagen – bitte aktualisiere deine Zahlungsart." : `Nächste Zahlung am ${dateDE(r.current_period_end)}: ${price}.`;
    const kv = [["Status", `${SUB_STATUS[r.status] || r.status}${cancelled ? " (gekündigt)" : ""}`], ["Plan", `Lumi Study Pro · ${r.interval === "year" ? "jährlich" : "monatlich"}`], ["Preis", price], ["Abo gestartet", r.created ? dateDE(r.created) : "–"],
      trialing ? ["Testversion endet", dateDE(r.trial_end || r.current_period_end)] : null, [cancelled ? "Zugang bis" : "Nächste Zahlung", r.current_period_end ? dateDE(r.current_period_end) : "–"],
      ["Zahlungsmittel", r.card ? `${cardName(r.card.brand)} •••• ${r.card.last4} · gültig bis ${String(r.card.exp_month).padStart(2, "0")}/${String(r.card.exp_year).slice(-2)}` : "Bei Stripe hinterlegt"], ["Abo-ID", `<code>${esc(r.id)}</code>`]].filter(Boolean);
    const inv = Array.isArray(r.invoices) ? (r.invoices.length ? `<div class="invl"><h3>Rechnungen</h3>${r.invoices.map(i => `<div class="inv"><span>${i.created ? dateShort(i.created) : ""}</span><span>${esc(i.number || "Rechnung")}</span><b>${money(i.total, i.currency)}</b><em class="${i.status === "paid" ? "ok" : ""}">${INV_STATUS[i.status] || i.status}</em>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">Ansehen</a>` : "<span></span>"}</div>`).join("")}</div>` : `<div class="invl"><h3>Rechnungen</h3><p class="note">Noch keine Rechnung – die erste kommt nach der Testversion.</p></div>`) : "";
    return `<div class="panel propanel">${head(cancelled ? "Gekündigt" : trialing ? "Testversion" : r.status === "past_due" ? "Überfällig" : "Aktiv")}<div class="subbox"><b>${title}</b><p>${sub}</p>${trialing && !cancelled ? `<div class="trialbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><div class="trialnums"><span>Tag ${Math.min(trialLen, trialLen - left + 1)} von ${trialLen}</span><span>noch ${dLabel(left)}</span></div>` : ""}</div>
      <div class="kvlist">${kv.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join("")}</div>${inv}
      <div class="row subacts">${cancelled ? `<button class="btn primary" id="pl-resume">Abo wieder aktivieren</button>` : `<button class="btn" id="pl-cancel">${trialing ? "Testversion beenden / Abo kündigen" : "Abo kündigen"}</button>`}<button class="btn" id="pl-pay">Zahlungsart ändern</button><button class="btn" id="pl-manage">Alle Rechnungen &amp; Belege</button><button class="btn ghost" id="pl-reload" type="button">${ic("rot")}Aktualisieren</button></div>
      <p class="note">${cancelled ? "" : trialing ? "Kündigst du während der Testversion, wird dir nichts berechnet und du behältst Pro bis zum Ende der Testversion." : "Du behältst Pro bis zum Ende des bezahlten Zeitraums."} Alle Angaben kommen live von Stripe.</p></div>`;
  }
  if (!c || !c.enabled || !cloudOn()) return `<div class="panel propanel">${head("Bald verfügbar")}<p class="note">Mit Lumi Study Pro nutzt du Lumi AI ohne Limit.</p>${list}</div>`;
  if (!CLOUD.user) return `<div class="panel propanel">${head("")}<p class="note">Melde dich unter „Konto“ an, um Lumi Study Pro zu abonnieren.</p>${list}</div>`;
  const y = c.yearly, m = c.monthly, save = y && m ? Math.round((1 - y / (m * 12)) * 100) : 0;
  return `<div class="panel propanel">${head(r ? SUB_STATUS[r.status] || "" : "")}<p class="note">${eligible ? `<b>${trialD} Tage kostenlos testen</b>, danach ${m ? money(m) + " / Monat" : y ? money(y) + " / Jahr" : "der normale Preis"}. ` : ""}Preis inkl. Mehrwertsteuer – in jeder Währung. Jederzeit kündbar.</p>${list}
    <div class="row" style="gap:10px;flex-wrap:wrap">${m ? `<button class="btn primary" id="pl-m">${eligible ? `${trialD} Tage gratis testen` : `${money(m)} / Monat`}</button>` : ""}${y ? `<button class="btn ${m ? "" : "primary"}" id="pl-y">${eligible ? `${money(y)} / Jahr · ${trialD} Tage gratis` : `${money(y)} / Jahr${save > 0 ? ` · ${save} % sparen` : ""}`}</button>` : ""}</div>
    <p class="note" style="margin-top:10px">Bezahlung sicher über Stripe (Karte, Apple Pay, Google Pay, Link u. a.). Verkäufer und Rechnungssteller ist Stripe („Sold through Link“). Mit dem Kauf gelten <a href="legal.html#agb" target="_blank" rel="noopener">AGB</a> und <a href="legal.html#widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a>.</p></div>`;
}
/* Pro-Bereich neu laden (inkl. Rechnungen) und an Ort und Stelle ersetzen */
async function plusRefresh(m, quiet) {
  await plusLoad(true);
  const pp = $(".propanel", m); if (pp) { pp.replaceWith(Object.assign(document.createElement("div"), { innerHTML: plusPanelHtml() }).firstElementChild); plusBindPanel(m); }
  const bn = $(".probanner", m); if (bn) { bn.replaceWith(Object.assign(document.createElement("div"), { innerHTML: proBannerHtml() }).firstElementChild); $("#pro-go", m)?.addEventListener("click", () => window.__showSetTab && window.__showSetTab("pro")); }
  try { refreshNav(); } catch {} if (!quiet) toast("Aktualisiert");
}
function plusBindPanel(m) {
  const on = (id, f) => { const b = $(id, m); if (b) b.onclick = f; };
  const act = async (action, ok) => { try { BILL.row = await subCall({ action, invoices: true }); toast(ok); await plusRefresh(m, true); } catch (e) { toast(e.message); } };
  on("#pl-m", () => plusBuy("monthly")); on("#pl-y", () => plusBuy("yearly")); on("#pl-pay", () => plusManage("payment")); on("#pl-manage", () => plusManage());
  on("#pl-reload", () => plusRefresh(m));
  on("#pl-cancel", async () => { const r = BILL.row, tr = r && r.status === "trialing"; if (await confirmBox(tr ? `Testversion beenden und Abo kündigen? Du behältst Pro bis ${dateDE(r.current_period_end)}, danach wird nichts berechnet.` : `Abo kündigen? Du behältst Pro bis ${dateDE(r.current_period_end)}.`, "Abo kündigen")) act("cancel", "Abo gekündigt – Zugang bleibt bis zum Ende erhalten."); });
  on("#pl-resume", () => act("resume", "Abo wieder aktiviert."));
}
/* Rückkehr aus dem Checkout: ?plus=success – Stripe ist die Quelle, die Suche kann kurz hinterherhinken */
async function plusReturn() {
  const q = new URLSearchParams(location.search), st = q.get("plus"); if (!st) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (st === "cancel") return toast("Bezahlung abgebrochen – es wurde nichts berechnet.");
  window.__setTab = "pro"; toast("Danke! Deine Testversion wird geladen …");
  for (let i = 0; i < 8 && !isPlus(); i++) { await plusLoad(true); if (!isPlus()) await new Promise(r => setTimeout(r, 2000)); }
  toast(isPlus() ? "Lumi Study Pro ist aktiv – viel Erfolg beim Lernen!" : "Zahlung eingegangen – das Abo erscheint gleich. Lade die Seite in ein paar Sekunden neu."); try { refreshNav(); } catch {} if (curView === "settings") { window.__setTab = "pro"; renderView(); }
}

/* Pro-Block ganz oben in den Einstellungen */
function proBannerHtml() {
  const c = BILL.cfg, r = BILL.row, can = c && c.enabled && cloudOn();
  const td = (c && c.trial) || 14, price = can ? (c.monthly ? `${money(c.monthly)} / Monat` : c.yearly ? `${money(c.yearly)} / Jahr` : "") : "";
  const t = (CLOUD.user && can && !BILL.loaded) ? "Abo wird geladen …" : isPlus()
    ? (r.cancel_at_period_end ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}`
      : r.status === "trialing" ? `Testversion endet in ${dIn(daysLeft(r.current_period_end))} (am ${dateDE(r.current_period_end)})`
      : r.current_period_end ? `Aktiv · verlängert sich am ${dateDE(r.current_period_end)}` : "Aktiv")
    : can && price ? `${r ? "" : td + " Tage gratis, danach "}${price}` : "Lumi AI ohne Limit – bald verfügbar";
  return `<div class="probanner"><div class="pb-l"><span class="probadge">Pro</span><div><b>Lumi Study Pro</b><small>${t}</small></div></div><button class="btn primary" id="pro-go">${isPlus() ? (isTrial() ? "Testversion verwalten" : "Abo verwalten") : can ? (r ? "Lumi Study Pro holen" : `${td} Tage gratis testen`) : "Mehr erfahren"}</button></div>`;
}

/* Chip in der Seitenleiste: Testphase bzw. Kündigung immer sichtbar */
function proChipHtml() {   // nur Text, kein Knopf; wird bei eingeklappter Seitenleiste ausgeblendet
  if (!isPlus()) return ""; const r = BILL.row, n = daysLeft(r.current_period_end);
  const txt = r.cancel_at_period_end ? `Gekündigt – Zugang bis ${new Date(r.current_period_end).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}` : r.status === "trialing" ? `Testversion endet in ${dIn(n)}` : "";
  return txt ? `<div class="prostatus nl hide-mob" id="prochip">${txt}</div>` : "";
}

/* ---------- Land / Region → Währung (CHF, EUR, USD) ---------- */
const COUNTRIES = [["CH", "Schweiz"], ["DE", "Deutschland"], ["AT", "Österreich"], ["LI", "Liechtenstein"], ["IT", "Italien"], ["FR", "Frankreich"], ["ES", "Spanien"], ["PT", "Portugal"], ["NL", "Niederlande"], ["BE", "Belgien"], ["LU", "Luxemburg"], ["IE", "Irland"], ["GB", "Vereinigtes Königreich"], ["DK", "Dänemark"], ["SE", "Schweden"], ["NO", "Norwegen"], ["FI", "Finnland"], ["PL", "Polen"], ["CZ", "Tschechien"], ["HU", "Ungarn"], ["GR", "Griechenland"], ["HR", "Kroatien"], ["SI", "Slowenien"], ["SK", "Slowakei"], ["RO", "Rumänien"], ["BG", "Bulgarien"], ["EE", "Estland"], ["LV", "Lettland"], ["LT", "Litauen"], ["MT", "Malta"], ["CY", "Zypern"], ["IS", "Island"], ["TR", "Türkei"], ["US", "USA"], ["CA", "Kanada"], ["AU", "Australien"], ["NZ", "Neuseeland"], ["BR", "Brasilien"], ["IN", "Indien"], ["JP", "Japan"], ["XX", "Anderes Land"]];
const EURO_LAND = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME AL BA BG CZ DK GB HU IS MK NO PL RO RS SE UA XK TR".split(" ");
const curOf = cc => !cc || cc === "XX" ? "" : cc === "CH" || cc === "LI" ? "chf" : EURO_LAND.includes(cc) ? "eur" : "usd";
const curName = cur => ({ chf: "CHF", eur: "€", usd: "USD" })[cur] || String(cur || "").toUpperCase();
function guessCountry() {
  try { const z = Intl.DateTimeFormat().resolvedOptions().timeZone || "", tz = { "Europe/Zurich": "CH", "Europe/Vaduz": "LI", "Europe/Berlin": "DE", "Europe/Vienna": "AT", "Europe/Rome": "IT", "Europe/Paris": "FR", "Europe/Madrid": "ES", "Europe/Lisbon": "PT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Luxembourg": "LU", "Europe/Dublin": "IE", "Europe/London": "GB" }[z]; if (tz) return tz;
    const r = ((navigator.language || "").split("-")[1] || "").toUpperCase(); if (COUNTRIES.some(c => c[0] === r)) return r; } catch {}
  return "";
}
/* Preise und Währung der gewählten Region in die Konfiguration übernehmen */
function proApply() {
  const c = BILL.cfg; if (!c || !c.opts) return;
  const cc = (typeof D !== "undefined" && D.profile && D.profile.country) || c.country || guessCountry(), want = curOf(cc) || c.currency;
  const av = Object.keys(c.opts.monthly || c.opts.yearly || {}), cur = av.includes(want) ? want : av.includes("eur") ? "eur" : av[0] || c.currency;
  ["monthly", "yearly"].forEach(k => { if (c.opts[k] && c.opts[k][cur] != null) c[k] = c.opts[k][cur]; }); c.currency = cur;
}
const proCountry = () => (D.profile.country || (BILL.cfg && BILL.cfg.country) || guessCountry() || "");
const countryOptions = sel => COUNTRIES.map(([k, n]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${n}</option>`).join("");
const priceHint = cc => { const c = BILL.cfg; if (!c || !c.enabled || !c.opts) return ""; const cur = curOf(cc) || c.currency, o = c.opts.monthly || c.opts.yearly || {}, v = o[cur] ?? o.eur; return v == null ? "" : `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: v % 100 ? 2 : 0 }).format(v / 100)} ${curName(o[cur] != null ? cur : "eur")} ${c.opts.monthly ? "/ Monat" : "/ Jahr"}`; };

/* Pro-Banner beim Namen: Abzeichen + Status-Pille */
const proBadgeHtml = () => isPlus() ? `<span class="probadge nm">Pro</span>` : "";
function proPillHtml() {
  if (!isPlus()) return ""; const r = BILL.row, n = daysLeft(r.current_period_end);
  return `<span class="trialpill ${r.cancel_at_period_end ? "end" : ""}">${r.cancel_at_period_end ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}` : r.status === "trialing" ? `Testversion endet in ${dIn(n)}` : `Pro aktiv · verlängert am ${dateDE(r.current_period_end)}`}</span>`;
}


/* ===== KI-Verbrauch (Token pro 5-Stunden-Fenster) – Ring wie der Kontext-Ring bei Claude ===== */
const AIU = { on: false, pro: false, used: 0, limit: 0, reset: "", hours: 5 };
const aiuNum = n => Math.round(n).toLocaleString("de-CH").replace(/’/g, "’");
async function aiuLoad() {
  if (typeof CLOUD === "undefined" || !CLOUD.user) return;
  try { const r = await fetch("/api/usage", { method: "POST", headers: await authHeader() }); if (!r.ok) return; const j = await r.json(); Object.assign(AIU, { on: !!j.enabled, pro: !!j.pro, used: j.used || 0, limit: j.limit || 0, reset: j.reset || "", hours: j.hours || 5 }); aiuPaint(); } catch {}
}
function aiuSet(u) { if (!u) return; if (u.limit == null) AIU.pro = true; else { AIU.pro = false; AIU.used = u.used; AIU.limit = u.limit; if (u.reset !== undefined) AIU.reset = u.reset || ""; } AIU.on = true; aiuPaint(); }
const aiuPct = () => AIU.pro || !AIU.limit ? 0 : Math.min(1, AIU.used / AIU.limit);
function aiuRingHtml() {
  if (!AIU.on) return "";
  return `<button type="button" class="aiu" aria-label="Lumi-AI-Verbrauch heute"><svg viewBox="0 0 24 24" width="24" height="24"><circle class="aiu-t" cx="12" cy="12" r="9"/><circle class="aiu-p" cx="12" cy="12" r="9" pathLength="100" stroke-dasharray="${(aiuPct() * 100).toFixed(1)} 100"/></svg></button>`;
}
function aiuPaint() {
  document.querySelectorAll(".aiu").forEach(b => { const p = b.querySelector(".aiu-p"); if (p) p.setAttribute("stroke-dasharray", (aiuPct() * 100).toFixed(1) + " 100"); b.classList.toggle("hot", aiuPct() >= .85); });
}
function aiuMount(host, after) {
  if (!host) return; host.querySelectorAll(".aiu").forEach(x => x.remove());
  const t = document.createElement("div"); t.innerHTML = aiuRingHtml(); const b = t.firstChild; if (!b) return;
  after ? after.before(b) : host.appendChild(b); b.onclick = e => { e.stopPropagation(); aiuPop(b); };
}
function aiuPop(btn) {
  const old = document.querySelector(".aiu-pop"); if (old) { old.remove(); return; }
  const pct = Math.round(aiuPct() * 100), rs = AIU.reset ? new Date(AIU.reset) : null;
  const left = rs ? Math.max(0, rs - Date.now()) : 0, lh = Math.floor(left / 36e5), lm = Math.ceil(left % 36e5 / 6e4), at = rs ? `${rs.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })} Uhr (in ${lh ? lh + " Std. " : ""}${lm} Min.)` : "";
  const pop = document.createElement("div"); pop.className = "aiu-pop";
  pop.innerHTML = AIU.pro
    ? `<b>Lumi AI</b><p class="aiu-big">Unbegrenzt</p><p class="aiu-s">Mit Lumi Study Pro gibt es kein Limit.</p>`
    : `<b>Lumi AI · ${AIU.hours} Std.-Fenster</b><p class="aiu-big">${aiuNum(AIU.used)} <span>/ ${aiuNum(AIU.limit)} Token</span></p><div class="aiu-bar"><i style="width:${pct}%"></i></div>
       <p class="aiu-s">${pct >= 100 ? "Dein Limit ist erreicht." : `${100 - pct} % übrig.`} ${rs ? `Setzt sich um ${at} zurück.` : `Das Fenster startet mit deiner nächsten Anfrage und dauert ${AIU.hours} Stunden.`}</p>
       <p class="aiu-s">Alle Modelle sind nutzbar: Gemini Pro zählt 5×, Gemini Flash 1×, Groq 0,5×.</p>
       ${BILL.cfg && BILL.cfg.enabled && !isPlus() ? `<button class="btn small aiu-up" type="button">Unbegrenzt mit Pro</button>` : ""}`;
  document.body.appendChild(pop);
  const r = btn.getBoundingClientRect(), w = pop.offsetWidth; pop.style.top = r.bottom + 8 + "px"; pop.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + "px";
  const up = pop.querySelector(".aiu-up"); if (up) up.onclick = () => { pop.remove(); plusBuy("monthly"); };
  setTimeout(() => document.addEventListener("click", function h(e) { if (!pop.contains(e.target)) { pop.remove(); document.removeEventListener("click", h); } }), 0);
}
