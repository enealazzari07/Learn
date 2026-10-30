/* Early-Backer-Code einlösen: Pro gratis (4 Monate, mit dem Pro-Code 2 Monate) + Abzeichen "Early Backer". POST { code } mit Supabase-Token.
   Gespeichert in app_metadata des Kontos (nur mit SUPABASE_SERVICE_ROLE_KEY schreibbar). Pro Konto nur einmal. Codes: siehe _codes.js. */
const L = require("./_lib");
const C = require("./_codes");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const hit = C.match((await L.readJson(req)).code);
    if (!hit) return res.status(403).json({ error: "Dieser Code ist ungültig." });
    const key = L.SB_SERVICE(); if (!key) return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel." });
    if (await L.grantOf(user.id)) return res.status(200).json({ ok: true, already: true });
    const until = new Date(); until.setMonth(until.getMonth() + hit.months);
    const r = await fetch(L.SB_URL() + "/auth/v1/admin/users/" + user.id, { method: "PUT", headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify({ app_metadata: { early_backer: true, pro_until: until.toISOString() } }) });
    if (!r.ok) return res.status(502).json({ error: "Konnte den Code nicht einlösen." });
    L.dropGrantCache(user.id); L.dropSubCache(user.id);
    res.status(200).json({ ok: true, until: until.toISOString() });
  } catch (e) { res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
