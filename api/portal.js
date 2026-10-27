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
    const { flow } = await L.readJson(req), ret = `${L.siteUrl(req)}/#/app/settings`, base = { customer: sub.stripe_customer_id, return_url: ret };
    const flows = {   // direkt zum Kündigen bzw. zur Zahlungsart statt auf die Portal-Startseite
      cancel: sub.stripe_subscription_id && { type: "subscription_cancel", subscription_cancel: { subscription: sub.stripe_subscription_id }, after_completion: { type: "redirect", redirect: { return_url: ret } } },
      payment: { type: "payment_method_update", after_completion: { type: "redirect", redirect: { return_url: ret } } },
    };
    let s;
    if (flows[flow]) { try { s = await L.stripe("POST", "/billing_portal/sessions", { ...base, flow_data: flows[flow] }); } catch (e) { s = null; } }   // Fallback: normales Portal
    if (!s) s = await L.stripe("POST", "/billing_portal/sessions", base);
    return res.status(200).json({ url: s.url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
