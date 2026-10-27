/* KI-Verbrauch des Kontos heute (Token). Gratis: Budget pro Zeitfenster, Pro: unbegrenzt. */
const L = require("./_lib");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Nicht angemeldet" });
  if (!L.FREE_TOKENS) return res.status(200).json({ enabled: false });
  const [pro, w] = await Promise.all([L.isProLive(user.id), L.aiUsed(user.id)]);
  if (!w) return res.status(200).json({ enabled: false });
  res.status(200).json({ enabled: true, pro, used: w.used, limit: pro ? null : L.FREE_TOKENS, reset: w.reset, hours: L.WINDOW_H });
};
