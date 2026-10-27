/* Startet eine Stripe-Checkout-Sitzung für Lumi Study Pro (Abo) mit Stripe Managed Payments.
   Erwartet POST { plan: "monthly" | "yearly" } mit Supabase-Token. Mit Managed Payments ist Stripe Verkäufer (Merchant of Record):
   Mehrwertsteuer in 80+ Ländern, Rechnungen, Abführung, Betrugsabwehr und Streitfälle übernimmt Stripe. */
const L = require("./_lib");
const TRIAL = +process.env.PRO_TRIAL_DAYS || 14;   // 14 Tage gratis für alle, die noch nie ein Abo hatten

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const { plan = "monthly", country = "" } = await L.readJson(req);
    const P = (await L.plans())[plan]; if (!P?.price) return res.status(400).json({ error: "Dieser Tarif ist nicht eingerichtet." });
    const live = await L.liveSubscription(user.id, { fresh: true });   // direkt aus Stripe
    if (live && L.ACTIVE.includes(live.status) && live.status !== "past_due") return res.status(409).json({ error: "Du hast Lumi Study Pro bereits – verwalte es unter Einstellungen." });
    const trial = !live, base = L.siteUrl(req), customer = live?.customer, avail = Object.keys(P.opts || {}), cur = avail.length ? L.currencyFor(req, avail, String(country).slice(0, 2)) : "";
    const common = {
      mode: "subscription", managed_payments: { enabled: process.env.STRIPE_MANAGED_PAYMENTS === "off" ? false : true },
      client_reference_id: user.id, ...(customer ? { customer } : { customer_email: user.email || undefined }),
      subscription_data: { metadata: { user_id: user.id }, ...(trial ? { trial_period_days: TRIAL } : {}) }, metadata: { user_id: user.id },
      success_url: `${base}/?plus=success#/app/settings`, cancel_url: `${base}/?plus=cancel#/app/settings`,
    };
    /* MwSt. ist im Preis immer enthalten (tax_behavior: inclusive), egal in welcher Währung */
    const amount = cur && P.opts?.[cur];
    let session;
    if (P.product && amount) {
      try { session = await L.stripe("POST", "/checkout/sessions", { ...common, line_items: [{ quantity: 1, price_data: { currency: cur, product: P.product, unit_amount: amount, recurring: { interval: plan === "yearly" ? "year" : "month" }, tax_behavior: "inclusive" } }] }); } catch (e) { session = null; }
    }
    if (!session) session = await L.stripe("POST", "/checkout/sessions", { ...common, ...(cur ? { currency: cur } : {}), line_items: [{ price: (cur && P.ids?.[cur]) || P.price, quantity: 1 }] });
    return res.status(200).json({ url: session.url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
