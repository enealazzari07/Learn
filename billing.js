/* Lumi – Lumi Study Pro (Abo über Stripe Managed Payments). Status liegt in Supabase (lumi_subscriptions), Bezahlung über Stripe Checkout (api/checkout.js, portal.js, stripe-webhook.js). */
const BILL = { cfg: null, row: null };
const isPlus = () => !!BILL.row && ["active", "trialing", "past_due"].includes(BILL.row.status) && (!BILL.row.current_period_end || new Date(BILL.row.current_period_end).getTime() > Date.now() - 3 * 864e5);
async function authHeader() {
  try { const { data } = await CLOUD.sb.auth.getSession(); return data.session ? { authorization: "Bearer " + data.session.access_token } : {}; } catch { return {}; }
}
async function plusLoad() {
  if (!CLOUD.sb || !CLOUD.user) { BILL.row = null; return; }
  try { const { data, error } = await CLOUD.sb.from("lumi_subscriptions").select("status,interval,current_period_end,cancel_at_period_end").eq("user_id", CLOUD.user.id).maybeSingle(); BILL.row = error ? null : data; } catch { BILL.row = null; }
}
async function billCall(path, body) {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.url) throw new Error(j.error || "Fehler " + r.status); return j.url;
}
const plusBuy = async plan => { try { toast("Weiterleitung zur Bezahlung …"); location.href = await billCall("/api/checkout", { plan }); } catch (e) { toast(e.message); } };
const plusManage = async () => { try { location.href = await billCall("/api/portal"); } catch (e) { toast(e.message); } };
const money = c => `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(c / 100)} ${({ chf: "CHF", eur: "€", usd: "USD" })[(BILL.cfg.currency || "eur").toLowerCase()] || (BILL.cfg.currency || "").toUpperCase()}`;
const dateDE = d => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

const PRO_FEATURES = ["Lumi AI ohne Tageslimit", "Alle kommenden Pro-Funktionen", "Du unterstützt die Weiterentwicklung von Lumi"];
function plusPanelHtml() {
  const c = BILL.cfg, r = BILL.row, list = `<ul class="prolist">${PRO_FEATURES.map(x => `<li>${ic("check")}${x}</li>`).join("")}</ul>`;
  const head = state => `<div class="prohead"><div><span class="probadge">Pro</span><h2>Lumi Study Pro</h2></div>${state ? `<span class="prostate">${state}</span>` : ""}</div>`;
  if (isPlus()) return `<div class="panel propanel">${head("Aktiv")}<p class="note">${r.cancel_at_period_end ? `Gekündigt – läuft bis ${dateDE(r.current_period_end)}.` : r.status === "past_due" ? "Die letzte Zahlung ist fehlgeschlagen – bitte Zahlungsart prüfen." : r.current_period_end ? `Verlängert sich am ${dateDE(r.current_period_end)}.` : "Danke für deine Unterstützung!"}</p>${list}<button class="btn" id="pl-manage">Abo verwalten</button><p class="note">Rechnungen, Zahlungsart und Kündigung.</p></div>`;
  if (!c || !c.enabled || !cloudOn()) return `<div class="panel propanel">${head("Bald verfügbar")}<p class="note">Mit Lumi Study Pro nutzt du Lumi AI ohne Limit.</p>${list}</div>`;
  if (!CLOUD.user) return `<div class="panel propanel">${head("")}<p class="note">Melde dich unter „Konto“ an, um Lumi Study Pro zu abonnieren.</p>${list}</div>`;
  const y = c.yearly, m = c.monthly, save = y && m ? Math.round((1 - y / (m * 12)) * 100) : 0;
  return `<div class="panel propanel">${head("")}<p class="note">Preise inkl. gesetzlicher Mehrwertsteuer – der Betrag für dein Land wird beim Bezahlen angezeigt. Jederzeit kündbar.</p>${list}
    <div class="row" style="gap:10px;flex-wrap:wrap">${m ? `<button class="btn primary" id="pl-m">${money(m)} / Monat</button>` : ""}${y ? `<button class="btn ${m ? "" : "primary"}" id="pl-y">${money(y)} / Jahr${save > 0 ? ` · ${save} % sparen` : ""}</button>` : ""}</div>
    <p class="note" style="margin-top:10px">Bezahlung sicher über Stripe (Karte, Apple Pay, Google Pay, Link u. a.). Verkäufer und Rechnungssteller ist Stripe („Sold through Link“). Mit dem Kauf gelten <a href="legal.html#agb" target="_blank" rel="noopener">AGB</a> und <a href="legal.html#widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a>.</p></div>`;
}
function plusBindPanel(m) {
  const on = (id, f) => { const b = $(id, m); if (b) b.onclick = f; };
  on("#pl-m", () => plusBuy("monthly")); on("#pl-y", () => plusBuy("yearly")); on("#pl-manage", plusManage);
}
/* Rückkehr aus dem Checkout: ?plus=success – der Webhook braucht manchmal ein paar Sekunden */
async function plusReturn() {
  const q = new URLSearchParams(location.search), st = q.get("plus"); if (!st) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (st === "cancel") return toast("Bezahlung abgebrochen – es wurde nichts berechnet.");
  window.__setTab = "pro"; toast("Danke! Lumi Study Pro wird freigeschaltet …");
  for (let i = 0; i < 8 && !isPlus(); i++) { await plusLoad(); if (!isPlus()) await new Promise(r => setTimeout(r, 2000)); }
  toast(isPlus() ? "Lumi Study Pro ist aktiv – viel Erfolg beim Lernen!" : "Zahlung eingegangen – die Freischaltung kann einen Moment dauern. Lade die Seite gleich neu."); if (curView === "settings") { window.__setTab = "pro"; renderView(); }
}

/* Pro-Block ganz oben in den Einstellungen */
function proBannerHtml() {
  const c = BILL.cfg, r = BILL.row, can = c && c.enabled && cloudOn();
  const t = isPlus() ? (r.cancel_at_period_end ? `Gekündigt – läuft bis ${dateDE(r.current_period_end)}` : r.current_period_end ? `Aktiv · verlängert sich am ${dateDE(r.current_period_end)}` : "Aktiv") : can && c.monthly ? `Lumi AI ohne Limit – ab ${money(c.monthly)} / Monat` : can && c.yearly ? `Lumi AI ohne Limit – ${money(c.yearly)} / Jahr` : "Lumi AI ohne Limit – bald verfügbar";
  return `<div class="probanner"><div class="pb-l"><span class="probadge">Pro</span><div><b>Lumi Study Pro</b><small>${t}</small></div></div><button class="btn primary" id="pro-go">${isPlus() ? "Abo verwalten" : can ? "Lumi Study Pro holen" : "Mehr erfahren"}</button></div>`;
}
