/* Gemeinsame Helfer für die Bezahl-Funktionen (Stripe + Supabase). Dateien mit "_" werden von Vercel nicht als Route veröffentlicht.
   Kein SDK nötig: Stripe und Supabase werden direkt über ihre REST-Schnittstellen angesprochen. */
const crypto = require("crypto");

const SB_URL = () => String(process.env.SUPABASE_URL || "https://rzbmtzxukqfdkcmfmugv.supabase.co").replace(/\/+$/, "");
const SB_ANON = () => process.env.SUPABASE_ANON_KEY || "sb_publishable_1AJLgVlp0Q-J4UdMni8ObA_uXWUD1ae";
const SB_SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const stripeKey = () => process.env.STRIPE_SECRET_KEY || "";

/* Plus-Tarife: Preis-IDs aus Stripe (Produkt mit für Managed Payments zulässigem Steuercode). Der Betrag wird in Stripe gepflegt;
   PLUS_*_CENTS dient nur der Anzeige auf der Preisseite. */
const PLANS = () => ({
  monthly: { price: process.env.STRIPE_PRICE_MONTHLY || "", cents: +process.env.PLUS_MONTHLY_CENTS || 499 },
  yearly: { price: process.env.STRIPE_PRICE_YEARLY || "", cents: +process.env.PLUS_YEARLY_CENTS || 3999 },
});
const CURRENCY = () => String(process.env.PLUS_CURRENCY || "eur").toLowerCase();
const billingReady = () => !!(stripeKey() && SB_SERVICE() && process.env.STRIPE_WEBHOOK_SECRET && (PLANS().monthly.price || PLANS().yearly.price));

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
    method, headers: { authorization: "Bearer " + key, "stripe-version": process.env.STRIPE_API_VERSION || "2026-04-22.dahlia", ...(method !== "GET" ? { "content-type": "application/x-www-form-urlencoded" } : {}) }, body: method === "GET" ? undefined : body,
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
const getSubscription = async uid => (await sb("GET", `lumi_subscriptions?user_id=eq.${encodeURIComponent(uid)}&select=*&limit=1`))?.[0] || null;
const isPlusRow = s => !!s && ["active", "trialing", "past_due"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end).getTime() > Date.now() - 3 * 864e5);

module.exports = { SB_URL, SB_ANON, SB_SERVICE, stripeKey, PLANS, CURRENCY, billingReady, sameOrigin, siteUrl, readBody, readJson, stripe, verifyStripeSignature, userFromReq, sb, getSubscription, isPlusRow };
