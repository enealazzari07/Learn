/* KI-Verbrauch des Kontos heute (Token). Gratis: Budget pro Tag, Pro: unbegrenzt. */
const L = require("./_lib");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Nicht angemeldet" });
  if (!L.FREE_TOKENS) return res.status(200).json({ enabled: false });
  const [pro, used] = await Promise.all([L.isProLive(user.id), L.aiUsed(user.id)]);
  if (used === null) return res.status(200).json({ enabled: false });
  const n = new Date(); const reset = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)).toISOString();
  res.status(200).json({ enabled: true, pro, used, limit: pro ? null : L.FREE_TOKENS, reset });
};
