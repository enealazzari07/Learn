/* Gleicht das Abo des eingeloggten Kontos direkt mit Stripe ab (Fallback, falls das Webhook nicht angekommen ist).
   POST mit Supabase-Token → { status, current_period_end } oder { status: null } */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const sub = await L.syncUserSubscription(user.id);
    return res.status(200).json({ status: sub ? sub.status : null });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
