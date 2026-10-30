/* Zugangscode: Ohne gültigen Code zeigt die App weder Anmeldung noch Registrierung.
   Der Code steht nie im Quelltext, nur sein SHA-256. Eigener Code: Vercel-Umgebungsvariable ACCESS_CODE setzen (überschreibt den eingebauten).
   Early-Backer-/Pro-Codes (Zugang + Pro gratis + Abzeichen): siehe _codes.js. */
const crypto = require("crypto");
const L = require("./_lib");
const C = require("./_codes");
const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const sha = s => crypto.createHash("sha256").update(s).digest();
const WANT = () => process.env.ACCESS_CODE ? sha(norm(process.env.ACCESS_CODE)) : Buffer.from("9104adbd35f74485831a005a2a34a78f806fa977dcb23e545df89f6342b8a063", "hex");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const code = norm(typeof req.body === "string" ? (() => { try { return JSON.parse(req.body).code; } catch { return ""; } })() : req.body?.code);
  await new Promise(r => setTimeout(r, 600));   // bremst Durchprobieren
  const early = !!C.match(code), ok = early || (code.length >= 6 && crypto.timingSafeEqual(h, WANT()));
  res.status(ok ? 200 : 403).json({ ok, early });
};
