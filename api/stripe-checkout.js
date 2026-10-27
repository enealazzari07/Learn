/* Startet eine Stripe-Checkout-Sitzung für Lumi Plus (Abo). Erwartet POST { plan: "monthly" | "yearly" } mit Supabase-Token.
   Die Mehrwertsteuer je Land berechnet Stripe Tax automatisch (STRIPE_TAX=off schaltet das ab, z. B. bei Kleinunternehmer-Regelung). */
const L = require("./_lib");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const user = await L.userFromReq(req); if (!user) return res.status(401).json({ error: "Bitte zuerst anmelden." });
    const { plan = "monthly" } = await L.readJson(req);
    const P = L.PLANS()[plan]; if (!P) return res.status(400).json({ error: "Unbekannter Tarif." });
    const sub = await L.getSubscription(user.id);
    if (L.isPlusRow(sub) && sub.status !== "past_due") return res.status(409).json({ error: "Du hast Lumi Plus bereits – verwalte es unter Einstellungen." });

    const taxOn = String(process.env.STRIPE_TAX || "").toLowerCase() !== "off", base = L.siteUrl(req);
    const item = P.price ? { price: P.price, quantity: 1 } : {
      quantity: 1,
      price_data: { currency: L.CURRENCY(), unit_amount: P.cents, recurring: { interval: P.interval }, tax_behavior: "inclusive",
        product_data: { name: "Lumi Plus", description: "Lern-App Lumi – Plus-Abo", ...(taxOn ? { tax_code: process.env.STRIPE_TAX_CODE || "txcd_10000000" } : {}) } },
    };
    const customer = sub?.stripe_customer_id;
    const session = await L.stripe("POST", "/checkout/sessions", {
      mode: "subscription", line_items: [item], locale: "de", client_reference_id: user.id,
      ...(customer ? { customer, customer_update: { address: "auto", name: "auto" } } : { customer_email: user.email || undefined }),
      subscription_data: { metadata: { user_id: user.id } }, metadata: { user_id: user.id },
      ...(taxOn ? { automatic_tax: { enabled: true }, billing_address_collection: "required", tax_id_collection: { enabled: true } } : {}),
      allow_promotion_codes: true,
      custom_text: { submit: { message: "Mit „Zahlungspflichtig abonnieren“ stimmst du den AGB zu und verlangst ausdrücklich, dass wir sofort mit der Leistung beginnen. Damit erlischt dein Widerrufsrecht, sobald Lumi Plus freigeschaltet ist. Jederzeit zum Periodenende kündbar." } },
      success_url: `${base}/?plus=success#/app/settings`, cancel_url: `${base}/?plus=cancel#/app/settings`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    const tax = /tax|origin address|head office/i.test(e.message) ? " Aktiviere in Stripe unter „Tax“ die Steuerberechnung und hinterlege deine Adresse (oder setze STRIPE_TAX=off)." : "";
    return res.status(e.status && e.status < 600 ? e.status : 502).json({ error: e.message + tax });
  }
};
