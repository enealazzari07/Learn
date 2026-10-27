/* Gemeinsame Helfer für die Bezahl-Funktionen (Lemon Squeezy + Supabase). Dateien mit "_" werden von Vercel nicht als Route veröffentlicht.
   Kein SDK nötig: Lemon Squeezy und Supabase werden direkt über ihre REST-Schnittstellen angesprochen. */
const crypto = require("crypto");

const SB_URL = () => String(process.env.SUPABASE_URL || "https://rzbmtzxukqfdkcmfmugv.supabase.co").replace(/\/+$/, "");
const SB_ANON = () => process.env.SUPABASE_ANON_KEY || "sb_publishable_1AJLgVlp0Q-J4UdMni8ObA_uXWUD1ae";
const SB_SERVICE = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const lsKey = () => process.env.LEMONSQUEEZY_API_KEY || "";

/* Plus-Tarife: Varianten-IDs aus Lemon Squeezy (Produkt → Variants). Die Preise selbst werden dort gepflegt (Bruttopreis, Steuer macht Lemon Squeezy);
   PLUS_*_CENTS dient nur der Anzeige auf der Preisseite. */
const PLANS = () => ({
  monthly: { variant: process.env.LS_VARIANT_MONTHLY || "", cents: +process.env.PLUS_MONTHLY_CENTS || 499 },
  yearly: { variant: process.env.LS_VARIANT_YEARLY || "", cents: +process.env.PLUS_YEARLY_CENTS || 3999 },
});
const CURRENCY = () => String(process.env.PLUS_CURRENCY || "eur").toLowerCase();
const billingReady = () => !!(lsKey() && process.env.LEMONSQUEEZY_STORE_ID && SB_SERVICE() && (PLANS().monthly.variant || PLANS().yearly.variant));

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

/* Lemon Squeezy REST (JSON:API) */
async function ls(method, path, data) {
  const key = lsKey(); if (!key) throw Object.assign(new Error("LEMONSQUEEZY_API_KEY fehlt in Vercel."), { status: 503 });
  const r = await fetch("https://api.lemonsqueezy.com/v1" + path, { method, headers: { authorization: "Bearer " + key, accept: "application/vnd.api+json", ...(data ? { "content-type": "application/vnd.api+json" } : {}) }, body: data ? JSON.stringify(data) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.errors?.[0]?.detail || "Lemon-Squeezy-Fehler " + r.status), { status: r.status });
  return j;
}

/* Webhook: X-Signature = HMAC-SHA256 (hex) über den rohen Body mit dem Signing-Secret */
function verifyLsSignature(raw, sig, secret) {
  if (!sig || !secret) return false;
  const exp = crypto.createHmac("sha256", secret).update(raw).digest("hex"), got = String(sig).trim();
  return got.length === exp.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(exp));
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
const isPlusRow = s => !!s && ["active", "trialing", "past_due"].includes(s.status) && (!s.current_period_end || new Date(s.current_period_end).getTime() > Date.now() - 3 * 864e5);   // gekündigt = active + cancel_at_period_end bis zum Periodenende

module.exports = { SB_URL, SB_ANON, SB_SERVICE, lsKey, PLANS, CURRENCY, billingReady, sameOrigin, siteUrl, readBody, readJson, ls, verifyLsSignature, userFromReq, sb, getSubscription, isPlusRow };
