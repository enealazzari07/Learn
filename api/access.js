/* Zugangscode: Ohne gültigen Code zeigt die App weder Anmeldung noch Registrierung.
   POST { code }            → prüft den Code (Zugang). Antwort { ok, early }.
   POST { code, redeem:true } mit Supabase-Token → löst einen Early-Backer-/Pro-Code ein: Pro gratis + Abzeichen "Early Backer" (pro Konto einmal).
   Gespeichert in app_metadata des Kontos (nur mit SUPABASE_SERVICE_ROLE_KEY schreibbar). Beides in einer Datei, weil Vercel Hobby nur 12 Funktionen erlaubt.
   Codes: nur SHA-256 im Quelltext. Zugangscode: Umgebungsvariable ACCESS_CODE überschreibt den eingebauten; weitere Codes siehe _codes.js. */
const crypto = require("crypto");
const L = require("./_lib");
const C = require("./_codes");
const WANT = () => process.env.ACCESS_CODE ? C.sha(C.norm(process.env.ACCESS_CODE)) : Buffer.from("9104adbd35f74485831a005a2a34a78f806fa977dcb23e545df89f6342b8a063", "hex");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const b = await L.readJson(req), code = C.norm(b.code), hit = C.match(code);
    if (b.redeem) {
      const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
      if (!hit) return res.status(403).json({ error: "Dieser Code ist ungültig." });
      const key = L.SB_SERVICE(); if (!key) return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY fehlt in Vercel." });
      if (await L.grantOf(user.id)) return res.status(200).json({ ok: true, already: true });
      const until = new Date(); until.setMonth(until.getMonth() + hit.months);
      const r = await fetch(L.SB_URL() + "/auth/v1/admin/users/" + user.id, { method: "PUT", headers: { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify({ app_metadata: { early_backer: true, pro_until: until.toISOString() } }) });
      if (!r.ok) return res.status(502).json({ error: "Konnte den Code nicht einlösen." });
      L.dropGrantCache(user.id); L.dropSubCache(user.id);
      return res.status(200).json({ ok: true, until: until.toISOString() });
    }
    await new Promise(r => setTimeout(r, 600));   // bremst Durchprobieren
    const ok = !!hit || (code.length >= 6 && crypto.timingSafeEqual(C.sha(code), WANT()));
    res.status(ok ? 200 : 403).json({ ok, early: !!hit });
  } catch (e) { res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
