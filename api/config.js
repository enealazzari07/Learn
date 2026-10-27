/* Öffentliche App-Konfiguration aus Vercel-Umgebungsvariablen (keine Geheimnisse!).
   Vercel → Project Settings → Environment Variables:
     MS_CLIENT_ID  Anwendungs-(Client-)ID der Azure-App-Registrierung (Microsoft-Login für Outlook, OneNote, Teams)
     MS_TENANT     optional: "common" (Standard, Schul-/Arbeits- und private Konten) oder deine Verzeichnis-(Mandanten-)ID
   Bezahlung (Stripe) siehe docs/STRIPE.md; "plus" zeigt nur Preise, keine Schlüssel.
   Die Client-ID ist bei einer Single-Page-App öffentlich und kein Passwort. Es gibt kein Client-Secret. */
const L = require("./_lib");
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const id = String(process.env.MS_CLIENT_ID || "").trim(), tenant = String(process.env.MS_TENANT || "").trim() || "common";
  const P = L.PLANS(); res.status(200).json({ plus: { enabled: !!(L.stripeKey() && L.SB_SERVICE()), monthly: P.monthly.cents, yearly: P.yearly.cents, currency: L.CURRENCY() }, msClientId: /^[0-9a-f-]{36}$/i.test(id) ? id : "", msTenant: /^[\w.-]{1,80}$/.test(tenant) ? tenant : "common" });
};
