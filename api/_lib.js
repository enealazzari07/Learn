/* Gemeinsame Helfer für die Bezahl-Funktionen (Stripe + Supabase). Dateien mit "_" werden von Vercel nicht als Route veröffentlicht.
   Kein SDK nötig: Stripe und Supabase werden direkt über ihre REST-Schnittstellen angesprochen. */
const crypto = require("crypto");

const SB_URL = () => String(process.env.SUPABASE_URL || "https://rzbmtzxukqfdkcmfmugv.supabase.co").replace(/\/+$/, "");
const SB_ANON = () => process.env.SUPABASE_ANON_KEY || "sb_publishable_1AJLgVlp0Q-J4UdMni8ObA_uXWUD1ae";
const SB_SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const stripeKey = () => process.env.STRIPE_SECRET_KEY || "";

/* Pro-Tarife: kommen direkt aus Stripe. Gesucht werden aktive, wiederkehrende Preise des Produkts "Lumi Study Pro" (oder STRIPE_PRODUCT_ID);
   monatlich = interval month, jährlich = interval year. STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY überschreiben die Suche. */
let priceCache = { at: 0, v: null };
async function plans() {
  if (priceCache.v && Date.now() - priceCache.at < 60000) return priceCache.v;
  const out = { monthly: { price: process.env.STRIPE_PRICE_MONTHLY || "", cents: +process.env.PLUS_MONTHLY_CENTS || 0, opts: {} }, yearly: { price: process.env.STRIPE_PRICE_YEARLY || "", cents: +process.env.PLUS_YEARLY_CENTS || 0, opts: {} }, currency: String(process.env.PLUS_CURRENCY || "eur").toLowerCase() };
  if (stripeKey() && (!out.monthly.price || !out.yearly.price)) {
    try {
      const j = await stripe("GET", "/prices", { active: "true", type: "recurring", limit: 50, expand: ["data.product", "data.currency_options"] }), want = process.env.STRIPE_PRODUCT_ID;
      const ok = j.data.filter(p => p.product && typeof p.product === "object" && p.product.active && (want ? p.product.id === want : /lumi\s*(study\s*)?(pro|plus)/i.test(p.product.name || "")));
      /* Pro Intervall alle passenden Preise einsammeln: entweder je Währung ein eigener Preis oder ein Preis mit currency_options. Der neueste gewinnt je Währung. */
      for (const [k, iv] of [["monthly", "month"], ["yearly", "year"]]) {
        if (out[k].price) continue;
        const list = ok.filter(x => x.recurring?.interval === iv && x.recurring.interval_count === 1 && x.unit_amount).sort((x, y) => y.created - x.created);
        if (!list.length) continue;
        const opts = {}, ids = {};
        for (const p of list) {
          const add = (cur, cents) => { if (cents && !(cur in opts)) { opts[cur] = cents; ids[cur] = p.id; } };
          add(p.currency, p.unit_amount); Object.entries(p.currency_options || {}).forEach(([c, v]) => add(c, v.unit_amount));
        }
        out[k] = { price: list[0].id, cents: list[0].unit_amount, opts, ids, product: list[0].product.id }; out.currency = list[0].currency;
      }
      /* Preise: Monat 6 (PRO_MONTHLY_CENTS) in jeder Währung; Jahr = 12 Monate minus 40 % Rabatt (PRO_YEARLY_DISCOUNT), sofern in Stripe kein eigener Jahrespreis existiert */
      const mc = +process.env.PRO_MONTHLY_CENTS || 600;
      if (out.monthly.product && Object.keys(out.monthly.opts || {}).length) { Object.keys(out.monthly.opts).forEach(c => { out.monthly.opts[c] = mc; }); out.monthly.cents = mc; }
      if (!out.yearly.price && out.monthly.product && Object.keys(out.monthly.opts || {}).length) {
        const disc = process.env.PRO_YEARLY_DISCOUNT === undefined || process.env.PRO_YEARLY_DISCOUNT === "" ? 40 : Math.min(90, Math.max(0, +process.env.PRO_YEARLY_DISCOUNT || 0));
        const yc = +process.env.PRO_YEARLY_CENTS || Math.round(mc * 12 * (100 - disc) / 100), opts = {}; Object.keys(out.monthly.opts).forEach(c => { opts[c] = yc; });
        out.yearly = { price: "dyn", cents: yc, opts, ids: {}, product: out.monthly.product };
      }
    } catch (e) { if (priceCache.v) return priceCache.v; }
  }
  if (out.monthly.price || out.yearly.price) priceCache = { at: Date.now(), v: out };
  return out;
}
/* Währung nach Land des Besuchs (Vercel-Header): Schweiz → CHF, Euroraum → EUR, sonst USD */
const EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK AD MC SM VA ME".split(" ");
const EUROPA = EURO.concat("AL BA BG CZ DK GB HU IS MK NO PL RO RS SE UA XK TR".split(" "));
const currencyOfCountry = c => { c = String(c || "").toUpperCase(); return !c || c === "XX" ? "" : c === "CH" || c === "LI" ? "chf" : EUROPA.includes(c) ? "eur" : "usd"; };
const currencyFor = (req, avail, country) => { const c = String(country || req?.headers?.["x-vercel-ip-country"] || "").toUpperCase(), want = currencyOfCountry(c) || (c ? "usd" : ""); return want && (!avail || avail.includes(want)) ? want : (avail?.[0] || want || "eur"); };
const CURRENCY = () => String(process.env.PLUS_CURRENCY || "eur").toLowerCase();
const billingReady = async () => { const P = await plans(); return !!(stripeKey() && (P.monthly.price || P.yearly.price)); };

const sameOrigin = req => { const o = req.headers.origin || req.headers.referer || ""; try { return new URL(o).host === req.headers.host; } catch { return false; } };
const siteUrl = req => String(process.env.SITE_URL || "").replace(/\/+$/, "") || `https://${req.headers.host}`;

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  if (req.body && typeof req.body === "object") return Buffer.from(JSON.stringify(req.body));
  const chunks = []; for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)); return Buffer.concat(chunks);
}
async function readJson(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  try { return JSON.parse((await readBody(req)).toString("utf8") || "{}"); } catch { return {}; }
}

/* Stripe erwartet Formularkodierung mit verschachtelten Schlüsseln: a[b][0][c]=… */
function form(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => typeof x === "object" ? form(x, `${key}[${i}]`, out) : out.push([`${key}[${i}]`, x]));
    else if (typeof v === "object") form(v, key, out);
    else out.push([key, v]);
  }
  return out;
}
async function stripe(method, path, data) {
  const key = stripeKey(); if (!key) throw Object.assign(new Error("STRIPE_SECRET_KEY fehlt in Vercel."), { status: 503 });
  const body = data ? new URLSearchParams(form(data)).toString() : undefined;
  const r = await fetch("https://api.stripe.com/v1" + path + (method === "GET" && body ? "?" + body : ""), {
    method, headers: { authorization: "Bearer " + key, "stripe-version": process.env.STRIPE_API_VERSION || "2025-03-31.basil", ...(method !== "GET" ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: method === "GET" ? undefined : body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error?.message || "Stripe-Fehler " + r.status), { status: r.status, code: j.error?.code });
  return j;
}

/* Stripe-Webhook: Signatur prüfen (HMAC-SHA256 über "t.payload"), 5 Minuten Toleranz */
function verifyStripeSignature(raw, header, secret, tolerance = 300) {
  if (!header || !secret) return false;
  const items = String(header).split(",").map(p => p.trim().split("=")), t = +(items.find(i => i[0] === "t") || [])[1], sigs = items.filter(i => i[0] === "v1").map(i => i[1]);
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > tolerance) return false;
  const exp = crypto.createHmac("sha256", secret).update(`${t}.`).update(raw).digest("hex");
  return sigs.some(x => x.length === exp.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(exp)));
}

/* Eingeloggte Person aus dem Supabase-Token ermitteln */
async function userFromReq(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || ""); if (!m) return null;
  try {
    const r = await fetch(SB_URL() + "/auth/v1/user", { headers: { apikey: SB_ANON(), authorization: "Bearer " + m[1] } });
    if (!r.ok) return null; const u = await r.json(); return u?.id ? { id: u.id, email: u.email || "" } : null;
  } catch { return null; }
}

/* Supabase REST mit Service-Key (nur serverseitig!) */
async function sb(method, path, body, extra = {}) {
  const key = SB_SERVICE(); if (!key) throw Object.assign(new Error("SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel."), { status: 503 });
  const r = await fetch(SB_URL() + "/rest/v1/" + path, { method, headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json", ...extra }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch {}
  if (!r.ok) throw Object.assign(new Error(j?.message || "Datenbankfehler " + r.status), { status: r.status });
  return j;
}

/* ===== Abo live aus Stripe lesen (keine eigene Datenbank) ===== */
const ACTIVE = ["active", "trialing", "past_due"], subCache = new Map();
const iso = t => t ? new Date(t * 1000).toISOString() : null;
function shapeSub(sub, invoices = []) {
  const it = sub.items?.data?.[0] || {}, pr = it.price || {}, pm = sub.default_payment_method && typeof sub.default_payment_method === "object" ? sub.default_payment_method : null, card = pm?.card;
  const end = sub.status === "trialing" && sub.trial_end ? sub.trial_end : (sub.current_period_end || it.current_period_end);
  return {
    id: sub.id, customer: typeof sub.customer === "string" ? sub.customer : sub.customer?.id, status: sub.status,
    interval: pr.recurring?.interval || null, amount: pr.unit_amount ?? null, currency: pr.currency || null, tax_behavior: pr.tax_behavior || null,
    created: iso(sub.start_date || sub.created), trial_end: iso(sub.trial_end), current_period_end: iso(end), cancel_at_period_end: !!sub.cancel_at_period_end, cancel_at: iso(sub.cancel_at), canceled_at: iso(sub.canceled_at), ended_at: iso(sub.ended_at),
    card: card ? { brand: card.brand, last4: card.last4, exp_month: card.exp_month, exp_year: card.exp_year } : null,
    invoices: invoices.map(i => ({ number: i.number, created: iso(i.created), total: i.total, currency: i.currency, status: i.status, tax: i.tax ?? null, url: i.hosted_invoice_url || null, pdf: i.invoice_pdf || null })),
  };
}
/* Das Abo eines Kontos finden: Stripe-Suche über die Konto-ID (metadata.user_id), Fallback über die Checkout-Sitzungen (sofort aktuell) */
async function findSubscription(uid) {
  /* beides gleichzeitig: Suche (schnell, kann kurz hinterherhinken) und letzte Checkout-Sitzungen (sofort aktuell) */
  const [found, sess] = await Promise.all([
    stripe("GET", "/subscriptions/search", { query: `metadata['user_id']:'${uid}'`, limit: 20, expand: ["data.default_payment_method"] }).then(j => j.data || []).catch(() => []),
    stripe("GET", "/checkout/sessions", { limit: 30 }).then(j => (j.data || []).filter(x => x.mode === "subscription" && x.status === "complete" && x.subscription && (x.client_reference_id === uid || x.metadata?.user_id === uid)).sort((a, b) => b.created - a.created)).catch(() => []),
  ]);
  let list = found;
  if (!list.length && sess.length) list = await Promise.all(sess.slice(0, 2).map(x => stripe("GET", "/subscriptions/" + (typeof x.subscription === "string" ? x.subscription : x.subscription.id), { expand: ["default_payment_method"] }).catch(() => null))).then(r => r.filter(Boolean));
  if (!list.length) return null;
  const rank = x => (ACTIVE.includes(x.status) ? 1e12 : 0) + (x.created || 0);
  return list.sort((a, b) => rank(b) - rank(a))[0];
}
async function liveSubscription(uid, { fresh = false, withInvoices = false } = {}) {
  const c = subCache.get(uid);
  if (!fresh && !withInvoices && c && Date.now() - c.at < 20000) return c.v;
  const sub = await findSubscription(uid); let v = null;
  if (sub) {
    let inv = []; if (withInvoices) { try { inv = (await stripe("GET", "/invoices", { subscription: sub.id, limit: 6 })).data || []; } catch {} }
    v = shapeSub(sub, inv);
  }
  subCache.set(uid, { at: Date.now(), v }); return v;
}
const isProLive = async uid => { try { const s = await liveSubscription(uid); return !!s && ACTIVE.includes(s.status) && (!s.current_period_end || new Date(s.current_period_end).getTime() > Date.now() - 3 * 864e5); } catch { return false; } };
const dropSubCache = uid => subCache.delete(uid);

/* KI-Budget (Token) für Gratis-Konten pro Zeitfenster (Standard 5 Stunden, wie bei Claude): das Fenster startet mit der ersten Anfrage und endet nach AI_WINDOW_HOURS.
   AI_FREE_WINDOW_TOKENS = Token pro Fenster (Standard 5000, 0 = unbegrenzt). Gibt null zurück, wenn Service-Key oder SQL fehlen → dann bleibt die KI offen. */
const num = (v, d) => v === undefined || v === "" ? d : (+v || 0);
const FREE_TOKENS = num(process.env.AI_FREE_WINDOW_TOKENS, 5000), WINDOW_H = Math.max(1, Math.round(num(process.env.AI_WINDOW_HOURS, 5)));
const win = j => j && typeof j === "object" ? { used: +j.tokens || 0, reset: j.started ? new Date(new Date(j.started).getTime() + WINDOW_H * 36e5).toISOString() : null } : null;
const aiUsed = async uid => { try { return win(await sb("POST", "rpc/lumi_ai_tokens", { p_user: uid, p_hours: WINDOW_H })); } catch { return null; } };
const aiAdd = async (uid, t) => { try { return win(await sb("POST", "rpc/lumi_ai_add", { p_user: uid, p_tokens: Math.max(0, Math.round(t)), p_hours: WINDOW_H })); } catch { return null; } };

module.exports = { FREE_TOKENS, WINDOW_H, aiUsed, aiAdd, liveSubscription, isProLive, dropSubCache, ACTIVE, SB_URL, SB_ANON, SB_SERVICE, stripeKey, plans, currencyFor, currencyOfCountry, CURRENCY, billingReady, sameOrigin, siteUrl, readBody, readJson, stripe, verifyStripeSignature, userFromReq, sb };
