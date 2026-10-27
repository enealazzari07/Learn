/* Öffnet das Lemon-Squeezy-Kundenportal (Zahlungsart ändern, Rechnungen, kündigen). Erwartet POST mit Supabase-Token. */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const sub = await L.getSubscription(user.id);
    if (!sub?.ls_subscription_id) return res.status(404).json({ error: "Kein Abo gefunden." });
    const j = await L.ls("GET", "/subscriptions/" + encodeURIComponent(sub.ls_subscription_id));   // die Portal-Links sind signiert und laufen ab, daher frisch holen
    const url = j.data?.attributes?.urls?.customer_portal; if (!url) return res.status(502).json({ error: "Kein Portal-Link erhalten." });
    return res.status(200).json({ url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
