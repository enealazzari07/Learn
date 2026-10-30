/* Einlösbare Codes (nur SHA-256 im Quelltext). Jeder Code = Zugang + Pro gratis für "months" Monate + Abzeichen "Early Backer".
   Eigene Codes: Vercel-Umgebungsvariablen EARLY_CODE (4 Monate) und PRO_CODE (2 Monate) überschreiben die eingebauten. */
const crypto = require("crypto");
const norm = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const sha = s => crypto.createHash("sha256").update(s).digest();
const CODES = () => [
  { months: 4, want: process.env.EARLY_CODE ? sha(norm(process.env.EARLY_CODE)) : Buffer.from("69c0bc6ea0962bf3f07d54be030bc3f5fd72d0b51435fb251589e1829d985de9", "hex") },
  { months: 2, want: process.env.PRO_CODE ? sha(norm(process.env.PRO_CODE)) : Buffer.from("aaf80f44506e0d7b828641f7994b15acb50cc1994b64a677dde98b51f328abcf", "hex") },
];
/* → { months } oder null */
const match = raw => { const c = norm(raw); if (c.length < 6) return null; const h = sha(c); return CODES().find(x => crypto.timingSafeEqual(h, x.want)) || null; };
module.exports = { norm, sha, match };
