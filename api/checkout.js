/* Startet eine Stripe-Checkout-Sitzung für Lumi Study Pro (Abo) mit Stripe Managed Payments.
   Erwartet POST { plan: "monthly" | "yearly" } mit Supabase-Token. Mit Managed Payments ist Stripe Verkäufer (Merchant of Record):
   Mehrwertsteuer in 80+ Ländern, Rechnungen, Abführung, Betrugsabwehr und Streitfälle übernimmt Stripe. */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const { plan = "monthly" } = await L.readJson(req);
    const P = (await L.plans())[plan]; if (!P?.price) return res.status(400).json({ error: "Dieser Tarif ist nicht eingerichtet." });
    const sub = await L.getSubscription(user.id);
    if (L.isPlusRow(sub) && sub.status !== "past_due") return res.status(409).json({ error: "Du hast Lumi Study Pro bereits – verwalte es unter Einstellungen." });
    const base = L.siteUrl(req), customer = sub?.stripe_customer_id, avail = Object.keys(P.opts || {}), cur = avail.length > 1 ? L.currencyFor(req, avail) : "";
    const session = await L.stripe("POST", "/checkout/sessions", {
      mode: "subscription", line_items: [{ price: P.price, quantity: 1 }],
      ...(cur ? { currency: cur } : {}),
      managed_payments: { enabled: process.env.STRIPE_MANAGED_PAYMENTS === "off" ? false : true },
      client_reference_id: user.id, ...(customer ? { customer } : { customer_email: user.email || undefined }),
      subscription_data: { metadata: { user_id: user.id } }, metadata: { user_id: user.id },
      success_url: `${base}/?plus=success#/app/settings`, cancel_url: `${base}/?plus=cancel#/app/settings`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
