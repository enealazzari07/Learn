/* Lumi – Lumi Plus (Abo über Lemon Squeezy). Status liegt in Supabase (lumi_subscriptions), Bezahlung über Lemon-Squeezy-Checkout (api/checkout.js, portal.js, ls-webhook.js). */
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
const money = c => new Intl.NumberFormat("de-DE", { style: "currency", currency: (BILL.cfg.currency || "eur").toUpperCase() }).format(c / 100);
const dateDE = d => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

function plusPanelHtml() {
  const c = BILL.cfg; if (!c || !c.enabled || !cloudOn()) return "";
  const h = `<h2>${ic("award")}Lumi Plus</h2>`;
  if (!CLOUD.user) return `<div class="panel">${h}<p class="note">Melde dich an, um Lumi Plus zu abonnieren.</p></div>`;
  const r = BILL.row;
  if (isPlus()) return `<div class="panel">${h}<div class="msstate ok"><b><i class="ldot on"></i>Lumi Plus ist aktiv</b><span>${r.cancel_at_period_end ? `Gekündigt – läuft bis ${dateDE(r.current_period_end)}.` : r.status === "past_due" ? "Die letzte Zahlung ist fehlgeschlagen – bitte Zahlungsart prüfen." : r.current_period_end ? `Verlängert sich am ${dateDE(r.current_period_end)}.` : ""}</span></div><button class="btn" id="pl-manage">Abo verwalten (Rechnungen, Zahlungsart, kündigen)</button></div>`;
  const y = c.yearly, m = c.monthly, save = y && m ? Math.round((1 - y / (m * 12)) * 100) : 0;
  return `<div class="panel">${h}<p class="note">Unbegrenzte Lumi AI und alle zukünftigen Plus-Funktionen. Preise inkl. gesetzlicher Mehrwertsteuer – der Betrag für dein Land wird beim Bezahlen angezeigt. Jederzeit kündbar.</p>
    <div class="row" style="gap:10px;flex-wrap:wrap">${m ? `<button class="btn primary" id="pl-m">${money(m)} / Monat</button>` : ""}${y ? `<button class="btn ${m ? "" : "primary"}" id="pl-y">${money(y)} / Jahr${save > 0 ? ` · ${save} % sparen` : ""}</button>` : ""}</div>
    <p class="note" style="margin-top:10px">Bezahlung sicher über Lemon Squeezy (Karte, PayPal, Apple Pay, Google Pay u. a.). Verkäufer und Rechnungssteller ist Lemon Squeezy. Mit dem Kauf gelten <a href="legal.html#agb" target="_blank" rel="noopener">AGB</a> und <a href="legal.html#widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a>.</p></div>`;
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
  toast("Danke! Lumi Plus wird freigeschaltet …");
  for (let i = 0; i < 8 && !isPlus(); i++) { await plusLoad(); if (!isPlus()) await new Promise(r => setTimeout(r, 2000)); }
  toast(isPlus() ? "Lumi Plus ist aktiv – viel Erfolg beim Lernen!" : "Zahlung eingegangen – die Freischaltung kann einen Moment dauern. Lade die Seite gleich neu."); if (curView === "settings") renderView();
}
