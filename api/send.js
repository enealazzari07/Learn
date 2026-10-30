/* POST /api/send  { type: "welcome" | "test" }  → schickt die Vorlage an die E-Mail-Adresse des angemeldeten Kontos.
   Bewusst kein freies Empfänger-Feld: so kann niemand über Studix fremde Adressen anschreiben. */
const L = require("./_lib");
const M = require("./_mail");

const last = new Map();   // einfache Bremse pro Konto (pro Funktionsinstanz): höchstens eine Mail je Typ und Minute
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte melde dich an." });
  if (!user.email) return res.status(400).json({ error: "Für dieses Konto ist keine E-Mail-Adresse hinterlegt." });
  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : (req.body || {});
  const type = String(body.type || "welcome"), tpl = M.templates[type]; if (!tpl) return res.status(400).json({ error: "Unbekannte Vorlage." });
  const key = user.id + ":" + type, now = Date.now(); if (now - (last.get(key) || 0) < 60_000) return res.status(429).json({ error: "Bitte warte kurz, bevor du die Mail erneut sendest." });
  last.set(key, now);
  const name = String(body.name || "").slice(0, 60) || user.email.split("@")[0];
  const out = await M.sendMail({ to: user.email, ...tpl({ name }) });
  if (out.error) return res.status(502).json({ error: out.error });
  res.status(200).json({ ok: true, id: out.id });
};
