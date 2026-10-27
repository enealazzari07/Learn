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
const plusManage = async flow => { try { location.href = await billCall("/api/portal", flow ? { flow } : {}); } catch (e) { toast(e.message); } };
const daysLeft = d => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 864e5));
const dLabel = n => n === 1 ? "1 Tag" : n + " Tage";
const isTrial = () => isPlus() && BILL.row.status === "trialing";
const money = c => `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(c / 100)} ${({ chf: "CHF", eur: "€", usd: "USD" })[(BILL.cfg.currency || "eur").toLowerCase()] || (BILL.cfg.currency || "").toUpperCase()}`;
const dateDE = d => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

const PRO_FEATURES = ["Lumi AI ohne Tageslimit", "Alle kommenden Pro-Funktionen", "Du unterstützt die Weiterentwicklung von Lumi"];
function plusPanelHtml() {
  const c = BILL.cfg, r = BILL.row, list = `<ul class="prolist">${PRO_FEATURES.map(x => `<li>${ic("check")}${x}</li>`).join("")}</ul>`;
  const eligible = !r, trialD = (c && c.trial) || 14;
  const head = state => `<div class="prohead"><div><span class="probadge">Pro</span><h2>Lumi Study Pro</h2></div>${state ? `<span class="prostate">${state}</span>` : ""}</div>`;
  if (isPlus()) {
    const trialing = r.status === "trialing", left = daysLeft(r.current_period_end), cancelled = r.cancel_at_period_end, per = r.interval === "year" ? (c && c.yearly) : (c && c.monthly), unit = r.interval === "year" ? "Jahr" : "Monat";
    const trialLen = (c && c.trial) || 14, pct = Math.min(100, Math.max(4, Math.round((1 - left / trialLen) * 100)));
    const title = cancelled ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}` : trialing ? `Testphase – noch ${dLabel(left)}` : r.status === "past_due" ? "Zahlung fehlgeschlagen" : "Aktives Abo";
    const sub = cancelled ? "Danach wird nichts mehr berechnet. Du kannst das Abo bis dahin jederzeit wieder aktivieren." : trialing ? `Die Testphase endet am ${dateDE(r.current_period_end)}.${per ? ` Danach ${money(per)} / ${unit}, wenn du nicht vorher kündigst.` : ""}` : r.status === "past_due" ? "Die letzte Zahlung ist fehlgeschlagen – bitte aktualisiere deine Zahlungsart." : `Verlängert sich am ${dateDE(r.current_period_end)}${per ? ` um ${money(per)}` : ""}.`;
    return `<div class="panel propanel">${head(cancelled ? "Gekündigt" : trialing ? "Testphase" : "Aktiv")}<div class="subbox"><b>${title}</b><p>${sub}</p>${trialing && !cancelled ? `<div class="trialbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><div class="trialnums"><span>Tag ${Math.min(trialLen, trialLen - left + 1)} von ${trialLen}</span><span>noch ${dLabel(left)}</span></div>` : ""}</div>${list}
      <div class="row subacts">${cancelled ? `<button class="btn primary" id="pl-resume">Abo wieder aktivieren</button>` : `<button class="btn" id="pl-cancel">${trialing ? "Testphase beenden / Abo kündigen" : "Abo kündigen"}</button>`}<button class="btn" id="pl-pay">Zahlungsart ändern</button><button class="btn" id="pl-manage">Rechnungen &amp; Details</button></div>
      <p class="note">${cancelled ? "" : trialing ? "Kündigst du während der Testphase, wird dir nichts berechnet und du behältst Pro bis zum Ende der Testphase." : "Du behältst Pro bis zum Ende des bezahlten Zeitraums."}</p></div>`;
  }
  if (!c || !c.enabled || !cloudOn()) return `<div class="panel propanel">${head("Bald verfügbar")}<p class="note">Mit Lumi Study Pro nutzt du Lumi AI ohne Limit.</p>${list}</div>`;
  if (!CLOUD.user) return `<div class="panel propanel">${head("")}<p class="note">Melde dich unter „Konto“ an, um Lumi Study Pro zu abonnieren.</p>${list}</div>`;
  const y = c.yearly, m = c.monthly, save = y && m ? Math.round((1 - y / (m * 12)) * 100) : 0;
  return `<div class="panel propanel">${head("")}<p class="note">${eligible ? `<b>${trialD} Tage kostenlos testen</b>, danach ${m ? money(m) + " / Monat" : y ? money(y) + " / Jahr" : "der normale Preis"}. ` : ""}Preise inkl. gesetzlicher Mehrwertsteuer. Jederzeit kündbar.</p>${list}
    <div class="row" style="gap:10px;flex-wrap:wrap">${m ? `<button class="btn primary" id="pl-m">${eligible ? `${trialD} Tage gratis testen` : `${money(m)} / Monat`}</button>` : ""}${y ? `<button class="btn ${m ? "" : "primary"}" id="pl-y">${eligible ? `${money(y)} / Jahr · ${trialD} Tage gratis` : `${money(y)} / Jahr${save > 0 ? ` · ${save} % sparen` : ""}`}</button>` : ""}</div>
    <p class="note" style="margin-top:10px">Bezahlung sicher über Stripe (Karte, Apple Pay, Google Pay, Link u. a.). Verkäufer und Rechnungssteller ist Stripe („Sold through Link“). Mit dem Kauf gelten <a href="legal.html#agb" target="_blank" rel="noopener">AGB</a> und <a href="legal.html#widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a>.</p></div>`;
}
function plusBindPanel(m) {
  const on = (id, f) => { const b = $(id, m); if (b) b.onclick = f; };
  on("#pl-m", () => plusBuy("monthly")); on("#pl-y", () => plusBuy("yearly")); on("#pl-manage", () => plusManage()); on("#pl-cancel", () => plusManage("cancel")); on("#pl-pay", () => plusManage("payment")); on("#pl-resume", () => plusManage());
}
/* Rückkehr aus dem Checkout: ?plus=success – der Webhook braucht manchmal ein paar Sekunden */
async function plusReturn() {
  const q = new URLSearchParams(location.search), st = q.get("plus"); if (!st) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (st === "cancel") return toast("Bezahlung abgebrochen – es wurde nichts berechnet.");
  window.__setTab = "pro"; toast("Danke! Deine Testphase wird gestartet …");
  for (let i = 0; i < 8 && !isPlus(); i++) { await plusLoad(); if (!isPlus()) await new Promise(r => setTimeout(r, 2000)); }
  toast(isPlus() ? "Lumi Study Pro ist aktiv – viel Erfolg beim Lernen!" : "Zahlung eingegangen – die Freischaltung kann einen Moment dauern. Lade die Seite gleich neu."); if (curView === "settings") { window.__setTab = "pro"; renderView(); }
}

/* Pro-Block ganz oben in den Einstellungen */
function proBannerHtml() {
  const c = BILL.cfg, r = BILL.row, can = c && c.enabled && cloudOn();
  const td = (c && c.trial) || 14, price = can ? (c.monthly ? `${money(c.monthly)} / Monat` : c.yearly ? `${money(c.yearly)} / Jahr` : "") : "";
  const t = isPlus()
    ? (r.cancel_at_period_end ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}`
      : r.status === "trialing" ? `Testphase – noch ${dLabel(daysLeft(r.current_period_end))} (bis ${dateDE(r.current_period_end)})`
      : r.current_period_end ? `Aktiv · verlängert sich am ${dateDE(r.current_period_end)}` : "Aktiv")
    : can && price ? `${r ? "" : td + " Tage gratis, danach "}${price}` : "Lumi AI ohne Limit – bald verfügbar";
  return `<div class="probanner"><div class="pb-l"><span class="probadge">Pro</span><div><b>Lumi Study Pro</b><small>${t}</small></div></div><button class="btn primary" id="pro-go">${isPlus() ? (isTrial() ? "Testphase verwalten" : "Abo verwalten") : can ? (r ? "Lumi Study Pro holen" : `${td} Tage gratis testen`) : "Mehr erfahren"}</button></div>`;
}

/* Chip in der Seitenleiste: Testphase bzw. Kündigung immer sichtbar */
function proChipHtml() {
  if (!isPlus()) return ""; const r = BILL.row, n = daysLeft(r.current_period_end);
  const txt = r.cancel_at_period_end ? `Gekündigt · bis ${new Date(r.current_period_end).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}` : r.status === "trialing" ? `Testphase · noch ${dLabel(n)}` : "";
  return txt ? `<button class="prochip hide-mob" id="prochip" type="button" title="Abo verwalten"><span class="probadge">Pro</span><span class="nl pct">${txt}</span></button>` : "";
}
