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
async function plusSync() {   // Abo direkt bei Stripe abgleichen (Fallback, falls das Webhook nicht ankam)
  try { const r = await fetch("/api/sync", { method: "POST", headers: { "content-type": "application/json", ...(await authHeader()) }, body: "{}" }); if (r.ok) { await plusLoad(); if (BILL.row) LS.set("lumi-buy", ""); } } catch {}
  return isPlus();
}
const buyRecent = () => { const t = +LS.get("lumi-buy") || 0; return t && Date.now() - t < 7 * 864e5; };
const plusBuy = async plan => { LS.set("lumi-buy", String(Date.now())); try { toast("Weiterleitung zur Bezahlung …"); location.href = await billCall("/api/checkout", { plan, country: proCountry() }); } catch (e) { toast(e.message); } };
const plusManage = async flow => { try { location.href = await billCall("/api/portal", flow ? { flow } : {}); } catch (e) { toast(e.message); } };
const daysLeft = d => Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 864e5));
const dLabel = n => n === 1 ? "1 Tag" : n + " Tage";
const dIn = n => n === 1 ? "1 Tag" : n + " Tagen";
const isTrial = () => isPlus() && BILL.row.status === "trialing";
const money = c => `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(c / 100)} ${curName((BILL.cfg.currency || "eur").toLowerCase())}`;
const dateDE = d => new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });

const PRO_FEATURES = ["Lumi AI ohne Tageslimit", "Alle kommenden Pro-Funktionen", "Du unterstützt die Weiterentwicklung von Lumi"];
function plusPanelHtml() {
  const c = BILL.cfg, r = BILL.row, list = `<ul class="prolist">${PRO_FEATURES.map(x => `<li>${ic("check")}${x}</li>`).join("")}</ul>`;
  const eligible = !r, trialD = (c && c.trial) || 14;
  const head = state => `<div class="prohead"><div><span class="probadge">Pro</span><h2>Lumi Study Pro</h2></div>${state ? `<span class="prostate">${state}</span>` : ""}</div>`;
  if (isPlus()) {
    const trialing = r.status === "trialing", left = daysLeft(r.current_period_end), cancelled = r.cancel_at_period_end, per = r.interval === "year" ? (c && c.yearly) : (c && c.monthly), unit = r.interval === "year" ? "Jahr" : "Monat";
    const trialLen = (c && c.trial) || 14, pct = Math.min(100, Math.max(4, Math.round((1 - left / trialLen) * 100)));
    const title = cancelled ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}` : trialing ? `Testversion endet in ${dIn(left)}` : r.status === "past_due" ? "Zahlung fehlgeschlagen" : "Aktives Abo";
    const sub = cancelled ? "Danach wird nichts mehr berechnet. Du kannst das Abo bis dahin jederzeit wieder aktivieren." : trialing ? `Die Testversion endet am ${dateDE(r.current_period_end)}.${per ? ` Danach ${money(per)} / ${unit}, wenn du nicht vorher kündigst.` : ""}` : r.status === "past_due" ? "Die letzte Zahlung ist fehlgeschlagen – bitte aktualisiere deine Zahlungsart." : `Verlängert sich am ${dateDE(r.current_period_end)}${per ? ` um ${money(per)}` : ""}.`;
    return `<div class="panel propanel">${head(cancelled ? "Gekündigt" : trialing ? "Testversion" : "Aktiv")}<div class="subbox"><b>${title}</b><p>${sub}</p>${trialing && !cancelled ? `<div class="trialbar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div><div class="trialnums"><span>Tag ${Math.min(trialLen, trialLen - left + 1)} von ${trialLen}</span><span>noch ${dLabel(left)}</span></div>` : ""}</div>${list}
      <div class="row subacts">${cancelled ? `<button class="btn primary" id="pl-resume">Abo wieder aktivieren</button>` : `<button class="btn" id="pl-cancel">${trialing ? "Testversion beenden / Abo kündigen" : "Abo kündigen"}</button>`}<button class="btn" id="pl-pay">Zahlungsart ändern</button><button class="btn" id="pl-manage">Rechnungen &amp; Details</button></div>
      <p class="note">${cancelled ? "" : trialing ? "Kündigst du während der Testversion, wird dir nichts berechnet und du behältst Pro bis zum Ende der Testversion." : "Du behältst Pro bis zum Ende des bezahlten Zeitraums."}</p></div>`;
  }
  if (!c || !c.enabled || !cloudOn()) return `<div class="panel propanel">${head("Bald verfügbar")}<p class="note">Mit Lumi Study Pro nutzt du Lumi AI ohne Limit.</p>${list}</div>`;
  if (!CLOUD.user) return `<div class="panel propanel">${head("")}<p class="note">Melde dich unter „Konto“ an, um Lumi Study Pro zu abonnieren.</p>${list}</div>`;
  const y = c.yearly, m = c.monthly, save = y && m ? Math.round((1 - y / (m * 12)) * 100) : 0;
  return `<div class="panel propanel">${head("")}<p class="note">${eligible ? `<b>${trialD} Tage kostenlos testen</b>, danach ${m ? money(m) + " / Monat" : y ? money(y) + " / Jahr" : "der normale Preis"}. ` : ""}Preise inkl. gesetzlicher Mehrwertsteuer. Jederzeit kündbar.</p>${list}
    <div class="row" style="gap:10px;flex-wrap:wrap">${m ? `<button class="btn primary" id="pl-m">${eligible ? `${trialD} Tage gratis testen` : `${money(m)} / Monat`}</button>` : ""}${y ? `<button class="btn ${m ? "" : "primary"}" id="pl-y">${eligible ? `${money(y)} / Jahr · ${trialD} Tage gratis` : `${money(y)} / Jahr${save > 0 ? ` · ${save} % sparen` : ""}`}</button>` : ""}</div>
    <p class="note" style="margin-top:10px">Bezahlung sicher über Stripe (Karte, Apple Pay, Google Pay, Link u. a.). Verkäufer und Rechnungssteller ist Stripe („Sold through Link“). Mit dem Kauf gelten <a href="legal.html#agb" target="_blank" rel="noopener">AGB</a> und <a href="legal.html#widerruf" target="_blank" rel="noopener">Widerrufsbelehrung</a>.</p><p class="note">Schon bezahlt? <button class="link" id="pl-sync" type="button">Status aktualisieren</button></p></div>`;
}
function plusBindPanel(m) {
  const on = (id, f) => { const b = $(id, m); if (b) b.onclick = f; };
  on("#pl-m", () => plusBuy("monthly")); on("#pl-y", () => plusBuy("yearly")); on("#pl-sync", async () => { toast("Status wird abgeglichen …"); const ok = await plusSync(); toast(ok ? "Lumi Study Pro ist aktiv" : "Noch kein Abo gefunden – bitte kurz warten und erneut versuchen."); if (ok && curView === "settings") { window.__setTab = "pro"; renderView(); } }); on("#pl-manage", () => plusManage()); on("#pl-cancel", () => plusManage("cancel")); on("#pl-pay", () => plusManage("payment")); on("#pl-resume", () => plusManage());
}
/* Rückkehr aus dem Checkout: ?plus=success – der Webhook braucht manchmal ein paar Sekunden */
async function plusReturn() {
  const q = new URLSearchParams(location.search), st = q.get("plus"); if (!st) return;
  history.replaceState(null, "", location.pathname + location.hash);
  if (st === "cancel") return toast("Bezahlung abgebrochen – es wurde nichts berechnet.");
  window.__setTab = "pro"; toast("Danke! Deine Testversion wird gestartet …");
  await plusSync();
  for (let i = 0; i < 8 && !isPlus(); i++) { await plusLoad(); if (!isPlus() && i === 3) await plusSync(); if (!isPlus()) await new Promise(r => setTimeout(r, 2000)); }
  toast(isPlus() ? "Lumi Study Pro ist aktiv – viel Erfolg beim Lernen!" : "Zahlung eingegangen – die Freischaltung kann einen Moment dauern. Lade die Seite gleich neu."); if (curView === "settings") { window.__setTab = "pro"; renderView(); }
}

/* Pro-Block ganz oben in den Einstellungen */
function proBannerHtml() {
  const c = BILL.cfg, r = BILL.row, can = c && c.enabled && cloudOn();
  const td = (c && c.trial) || 14, price = can ? (c.monthly ? `${money(c.monthly)} / Monat` : c.yearly ? `${money(c.yearly)} / Jahr` : "") : "";
  const t = isPlus()
    ? (r.cancel_at_period_end ? `Gekündigt – Zugang bis ${dateDE(r.current_period_end)}`
      : r.status === "trialing" ? `Testversion endet in ${dIn(daysLeft(r.current_period_end))} (am ${dateDE(r.current_period_end)})`
      : r.current_period_end ? `Aktiv · verlängert sich am ${dateDE(r.current_period_end)}` : "Aktiv")
    : can && price ? `${r ? "" : td + " Tage gratis, danach "}${price}` : "Lumi AI ohne Limit – bald verfügbar";
  return `<div class="probanner"><div class="pb-l"><span class="probadge">Pro</span><div><b>Lumi Study Pro</b><small>${t}</small></div></div><button class="btn primary" id="pro-go">${isPlus() ? (isTrial() ? "Testversion verwalten" : "Abo verwalten") : can ? (r ? "Lumi Study Pro holen" : `${td} Tage gratis testen`) : "Mehr erfahren"}</button></div>`;
}

/* Chip in der Seitenleiste: Testphase bzw. Kündigung immer sichtbar */
function proChipHtml() {
  if (!isPlus()) return ""; const r = BILL.row, n = daysLeft(r.current_period_end);
  const txt = r.cancel_at_period_end ? `Gekündigt · bis ${new Date(r.current_period_end).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}` : r.status === "trialing" ? `Testversion endet in ${dIn(n)}` : "";
  return txt ? `<button class="prochip hide-mob" id="prochip" type="button" title="Abo verwalten"><span class="probadge">Pro</span><span class="nl pct">${txt}</span></button>` : "";
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
