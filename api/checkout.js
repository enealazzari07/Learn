/* Startet einen Lemon-Squeezy-Checkout für Lumi Plus. Erwartet POST { plan: "monthly" | "yearly" } mit Supabase-Token.
   Lemon Squeezy ist Verkäufer (Merchant of Record): Mehrwertsteuer je Land, Rechnungen und Abführung übernehmen sie. */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const { plan = "monthly" } = await L.readJson(req);
    const P = L.PLANS()[plan]; if (!P?.variant) return res.status(400).json({ error: "Dieser Tarif ist nicht eingerichtet." });
    const store = process.env.LEMONSQUEEZY_STORE_ID; if (!store) return res.status(503).json({ error: "LEMONSQUEEZY_STORE_ID fehlt in Vercel." });
    const sub = await L.getSubscription(user.id);
    if (L.isPlusRow(sub) && sub.status !== "past_due") return res.status(409).json({ error: "Du hast Lumi Plus bereits – verwalte es unter Einstellungen." });
    const j = await L.ls("POST", "/checkouts", { data: { type: "checkouts",
      attributes: { checkout_data: { email: user.email || undefined, custom: { user_id: user.id } }, product_options: { redirect_url: `${L.siteUrl(req)}/?plus=success#/app/settings`, receipt_button_text: "Zurück zu Lumi", receipt_link_url: `${L.siteUrl(req)}/#/app/settings` }, ...(process.env.LS_TEST_MODE === "1" ? { test_mode: true } : {}) },
      relationships: { store: { data: { type: "stores", id: String(store) } }, variant: { data: { type: "variants", id: String(P.variant) } } } } });
    return res.status(200).json({ url: j.data.attributes.url });
  } catch (e) { return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message }); }
};
