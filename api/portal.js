/* Öffnet das Stripe-Kundenportal (Zahlungsart ändern, Rechnungen, kündigen). Erwartet POST mit Supabase-Token. */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const sub = await L.getSubscription(user.id);
    if (!sub?.stripe_customer_id) return res.status(404).json({ error: "Kein Abo gefunden." });
    const s = await L.stripe("POST", "/billing_portal/sessions", { customer: sub.stripe_customer_id, return_url: `${L.siteUrl(req)}/#/app/settings` });
    return res.status(200).json({ url: s.url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
