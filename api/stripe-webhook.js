/* Stripe-Webhook: hält die Tabelle lumi_subscriptions aktuell.
   Stripe → Developers → Webhooks → Endpoint: https://DEINE-DOMAIN/api/stripe-webhook
   Ereignisse: checkout.session.completed, customer.subscription.created / .updated / .deleted, invoice.payment_failed
   Das Signing-Secret (whsec_…) kommt als STRIPE_WEBHOOK_SECRET nach Vercel. */
const L = require("./_lib");
module.exports.config = { api: { bodyParser: false } };

async function save(sub, fallbackUser) {
  let uid = sub.metadata?.user_id || fallbackUser;
  if (!uid) { const r = await L.sb("GET", `lumi_subscriptions?stripe_customer_id=eq.${encodeURIComponent(sub.customer)}&select=user_id&limit=1`); uid = r?.[0]?.user_id; }
  if (!uid) return;   // gehört nicht zu Lumi
  const item = sub.items?.data?.[0], end = sub.current_period_end || item?.current_period_end;
  await L.sb("POST", "lumi_subscriptions?on_conflict=user_id", {
    user_id: uid, stripe_customer_id: sub.customer, stripe_subscription_id: sub.id, status: sub.status, price_id: item?.price?.id || null,
    interval: item?.price?.recurring?.interval || null, current_period_end: end ? new Date(end * 1000).toISOString() : null,
    cancel_at_period_end: !!sub.cancel_at_period_end, updated_at: new Date().toISOString(),
  }, { Prefer: "resolution=merge-duplicates,return=minimal" });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const secret = process.env.STRIPE_WEBHOOK_SECRET; if (!secret) return res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET fehlt." });
  const raw = await L.readBody(req);
  if (!L.verifyStripeSignature(raw, req.headers["stripe-signature"], secret)) return res.status(400).json({ error: "Ungültige Signatur" });
  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "Ungültiges JSON" }); }
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
