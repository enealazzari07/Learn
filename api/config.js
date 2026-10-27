/* Öffentliche App-Konfiguration aus Vercel-Umgebungsvariablen (keine Geheimnisse!).
   Vercel → Project Settings → Environment Variables:
   Bezahlung (Stripe Managed Payments) siehe docs/PAYMENTS.md; "plus" zeigt nur Preise, keine Schlüssel.
   Der veröffentlichbare Stripe-Schlüssel (pk_…) ist öffentlich; Geheimnisse werden hier nie ausgegeben. */
const L = require("./_lib");
const PK = () => String(process.env.STRIPE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "").trim();
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const P = await L.plans(), avail = Object.keys(P.monthly.opts || P.yearly.opts || {}), cur = L.currencyFor(req, avail.length ? avail : null);
  const amt = k => P[k].price ? (P[k].opts?.[cur] ?? P[k].cents) : 0;
  res.status(200).json({ plus: { enabled: await L.billingReady(), trial: +process.env.PRO_TRIAL_DAYS || 14, monthly: amt("monthly"), yearly: amt("yearly"), currency: P.currency && !avail.includes(cur) ? P.currency : cur, country: String(req.headers?.["x-vercel-ip-country"] || "").toUpperCase().slice(0, 2), pk: /^pk_(test|live)_/.test(PK()) ? PK() : "", opts: { monthly: P.monthly.price ? P.monthly.opts : null, yearly: P.yearly.price ? P.yearly.opts : null } } });
};
