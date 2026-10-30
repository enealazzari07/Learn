/* Konto löschen (DSGVO „Recht auf Löschung“): beendet ein laufendes Stripe-Abo sofort, löscht den Stripe-Kunden und danach das Supabase-Konto samt aller Daten.
   POST { action: "delete", confirm: "<E-Mail des Kontos>" } mit Supabase-Token. Braucht SUPABASE_SERVICE_ROLE_KEY. */
const L = require("./_lib");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const body = await L.readJson(req);
    if (body.action !== "delete") return res.status(400).json({ error: "Unbekannte Aktion." });
    if (String(body.confirm || "").trim().toLowerCase() !== String(user.email || "").toLowerCase()) return res.status(400).json({ error: "Die E-Mail-Adresse stimmt nicht überein." });
    const key = L.SB_SERVICE(); if (!key) return res.status(503).json({ error: "Löschen ist serverseitig noch nicht eingerichtet (SUPABASE_SERVICE_ROLE_KEY fehlt)." });
    /* 1) Stripe zuerst: ein bezahltes Abo darf nicht weiterlaufen, wenn das Konto weg ist */
    if (L.stripeKey()) {
      const sub = await L.liveSubscription(user.id, { fresh: true });
      if (sub) {
        if (L.ACTIVE.includes(sub.status)) await L.stripe("DELETE", "/subscriptions/" + sub.id);
        if (sub.customer && await L.validCustomer(sub.customer)) await L.stripe("DELETE", "/customers/" + sub.customer);
      }
      L.dropSubCache(user.id);
    }
    /* 2) Freigaben des Kontos, dann das Konto selbst (Daten, KI-Zähler hängen per CASCADE daran) */
    try { await L.sb("DELETE", "lumi_shares?owner=eq." + encodeURIComponent(user.id)); } catch {}
    const r = await fetch(L.SB_URL() + "/auth/v1/admin/users/" + encodeURIComponent(user.id), { method: "DELETE", headers: { apikey: key, authorization: "Bearer " + key } });
    if (!r.ok) { const j = await r.json().catch(() => ({})); return res.status(502).json({ error: j.msg || j.message || "Das Konto konnte nicht gelöscht werden." }); }
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
