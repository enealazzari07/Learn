/* Stripe-Webhook: hält die Tabelle lumi_subscriptions aktuell.
   Stripe → Developers → Webhooks → Endpoint: https://DEINE-DOMAIN/api/stripe-webhook
   Ereignisse: checkout.session.completed, customer.subscription.created / .updated / .deleted, invoice.payment_failed
   Das Signing-Secret (whsec_…) kommt als STRIPE_WEBHOOK_SECRET nach Vercel. */
const L = require("./_lib");
const save = (sub, fallbackUser) => L.saveSubscription(sub, fallbackUser);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const secret = process.env.STRIPE_WEBHOOK_SECRET; if (!secret) return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET fehlt." });
  const parsed = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body);   // Vercel hat den Body schon verarbeitet → Rohbytes nicht mehr verfügbar
  const raw = await L.readBody(req), header = req.headers["stripe-signature"]; let ev = null;
  if (L.verifyStripeSignature(raw, header, secret)) { try { ev = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "Ungültiges JSON" }); } }
  else if (parsed && header && /^evt_\w+$/.test(String(req.body.id || ""))) { try { ev = await L.stripe("GET", "/events/" + req.body.id); } catch { ev = null; } }   // Echtheit über die Stripe-API prüfen
  if (!ev) return res.status(400).json({ error: "Ungültige Signatur" });
  try {
    const o = ev.data?.object || {};
    if (ev.type === "checkout.session.completed" && o.mode === "subscription" && o.subscription) {
      await save(await L.stripe("GET", "/subscriptions/" + o.subscription), o.client_reference_id || o.metadata?.user_id);
    } else if (/^customer\.subscription\.(created|updated|deleted)$/.test(ev.type)) {
      await save(o);
    } else if (ev.type === "invoice.payment_failed" && o.subscription) {
      await save(await L.stripe("GET", "/subscriptions/" + o.subscription));
    }
    return res.status(200).json({ received: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }   // 5xx → Stripe wiederholt die Zustellung
};

module.exports.config = { api: { bodyParser: false } };   // nach dem Handler setzen, sonst wird die Einstellung überschrieben
