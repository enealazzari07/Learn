/* Öffentliche App-Konfiguration aus Vercel-Umgebungsvariablen (keine Geheimnisse!).
   Vercel → Project Settings → Environment Variables:
     MS_CLIENT_ID  Anwendungs-(Client-)ID der Azure-App-Registrierung (Microsoft-Login für Outlook, OneNote, Teams)
     MS_TENANT     optional: "common" (Standard, Schul-/Arbeits- und private Konten) oder deine Verzeichnis-(Mandanten-)ID
   Bezahlung (Stripe Managed Payments) siehe docs/PAYMENTS.md; "plus" zeigt nur Preise, keine Schlüssel.
   Die Client-ID ist bei einer Single-Page-App öffentlich und kein Passwort. Es gibt kein Client-Secret. */
const L = require("./_lib");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const id = String(process.env.MS_CLIENT_ID || "").trim(), tenant = String(process.env.MS_TENANT || "").trim() || "common";
  const P = await L.plans(), avail = Object.keys(P.monthly.opts || P.yearly.opts || {}), cur = L.currencyFor(req, avail.length ? avail : null);
  const amt = k => P[k].price ? (P[k].opts?.[cur] ?? P[k].cents) : 0;
  res.status(200).json({ plus: { enabled: await L.billingReady(), trial: +process.env.PRO_TRIAL_DAYS || 14, monthly: amt("monthly"), yearly: amt("yearly"), currency: P.currency && !avail.includes(cur) ? P.currency : cur, country: String(req.headers?.["x-vercel-ip-country"] || "").toUpperCase().slice(0, 2), pk: /^pk_(test|live)_/.test(String(process.env.STRIPE_PUBLISHABLE_KEY || "").trim()) ? String(process.env.STRIPE_PUBLISHABLE_KEY).trim() : "", opts: { monthly: P.monthly.price ? P.monthly.opts : null, yearly: P.yearly.price ? P.yearly.opts : null } }, msClientId: /^[0-9a-f-]{36}$/i.test(id) ? id : "", msTenant: /^[\w.-]{1,80}$/.test(tenant) ? tenant : "common" });
};
