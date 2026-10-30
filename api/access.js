/* Zugangscode: Ohne gültigen Code zeigt die App weder Anmeldung noch Registrierung.
   Der Code steht nie im Quelltext, nur sein SHA-256. Eigener Code: Vercel-Umgebungsvariable ACCESS_CODE setzen (überschreibt den eingebauten).
   Early-Backer-Code (gleicher Zugang + 3 Monate Pro + Abzeichen, siehe redeem.js): EARLY_CODE. */
const crypto = require("crypto");
const L = require("./_lib");
const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const sha = s => crypto.createHash("sha256").update(s).digest();
const EARLY = () => process.env.EARLY_CODE ? sha(norm(process.env.EARLY_CODE)) : Buffer.from("69c0bc6ea0962bf3f07d54be030bc3f5fd72d0b51435fb251589e1829d985de9", "hex");
const WANT = () => process.env.ACCESS_CODE ? sha(norm(process.env.ACCESS_CODE)) : Buffer.from("9104adbd35f74485831a005a2a34a78f806fa977dcb23e545df89f6342b8a063", "hex");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const code = norm(typeof req.body === "string" ? (() => { try { return JSON.parse(req.body).code; } catch { return ""; } })() : req.body?.code);
  await new Promise(r => setTimeout(r, 600));   // bremst Durchprobieren
  const h = sha(code), early = code.length >= 6 && crypto.timingSafeEqual(h, EARLY()), ok = early || (code.length >= 6 && crypto.timingSafeEqual(h, WANT()));
  res.status(ok ? 200 : 403).json({ ok, early });
};
