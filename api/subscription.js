/* Abo des eingeloggten Kontos – live aus Stripe (keine eigene Datenbank).
   POST { action: "get" (Standard) | "cancel" | "resume" } mit Supabase-Token.
   Antwort: { sub: {…} | null }. Kündigen/Fortsetzen setzt cancel_at_period_end direkt bei Stripe. */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const { action = "get", invoices = true } = await L.readJson(req);
    if (action === "cancel" || action === "resume") {
      const cur = await L.liveSubscription(user.id, { fresh: true });
      if (!cur || !L.ACTIVE.includes(cur.status)) return res.status(404).json({ error: "Kein aktives Abo gefunden." });
      await L.stripe("POST", "/subscriptions/" + cur.id, { cancel_at_period_end: action === "cancel" ? "true" : "false" });
      L.dropSubCache(user.id);
    }
    let sub = await L.liveSubscription(user.id, { fresh: action !== "get", withInvoices: invoices !== false });
    const g = await L.grantOf(user.id);   // Early Backer: 3 Monate Pro geschenkt + Abzeichen
    if (g) {
      if (!sub || !L.ACTIVE.includes(sub.status)) { if (L.grantActive(g)) sub = { id: "early_backer", status: "trialing", interval: null, amount: null, currency: null, trial_end: g.until, current_period_end: g.until, cancel_at_period_end: true, cancel_at: g.until, card: null, invoices: [], grant: true }; else if (!sub) sub = { id: "early_backer", status: "canceled", current_period_end: g.until, invoices: [], grant: true }; }
      sub = { ...sub, badge: g.badge };
    }
    return res.status(200).json({ sub });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
