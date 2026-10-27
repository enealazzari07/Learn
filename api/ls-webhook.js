/* Lemon-Squeezy-Webhook: hält die Tabelle lumi_subscriptions aktuell.
   Lemon Squeezy → Settings → Webhooks → URL https://DEINE-DOMAIN/api/ls-webhook, Signing secret frei wählen (→ LEMONSQUEEZY_WEBHOOK_SECRET).
   Ereignisse: subscription_created, subscription_updated, subscription_cancelled, subscription_resumed, subscription_expired,
   subscription_paused, subscription_unpaused, subscription_payment_failed, subscription_payment_success, subscription_payment_recovered */
const L = require("./_lib");
module.exports.config = { api: { bodyParser: false } };

/* Lemon-Squeezy-Status → Lumi-Status. Gekündigt zählt bis zum Laufzeitende weiter (active + cancel_at_period_end). */
function mapStatus(a) {
  const end = a.ends_at ? new Date(a.ends_at).getTime() : 0;
  if (a.status === "cancelled") return end > Date.now() ? { status: "active", cancel: true, until: a.ends_at } : { status: "canceled", cancel: false, until: a.ends_at };
  if (a.status === "on_trial") return { status: "trialing", cancel: false, until: a.trial_ends_at || a.renews_at };
  if (["active", "past_due", "paused", "unpaid", "expired"].includes(a.status)) return { status: a.status, cancel: false, until: a.renews_at || a.ends_at };
  return { status: "inactive", cancel: false, until: a.ends_at };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET; if (!secret) return res.status(503).json({ error: "LEMONSQUEEZY_WEBHOOK_SECRET fehlt." });
  const raw = await L.readBody(req);
  if (!L.verifyLsSignature(raw, req.headers["x-signature"], secret)) return res.status(400).json({ error: "Ungültige Signatur" });
  let ev; try { ev = JSON.parse(raw.toString("utf8")); } catch { return res.status(400).json({ error: "Ungültiges JSON" }); }
  try {
    const name = ev.meta?.event_name || "", d = ev.data || {}, a = d.attributes || {};
    if (!/^subscription_/.test(name) || d.type !== "subscriptions") return res.status(200).json({ ignored: true });
    let uid = ev.meta?.custom_data?.user_id;
    if (!uid) uid = (await L.sb("GET", `lumi_subscriptions?ls_subscription_id=eq.${encodeURIComponent(d.id)}&select=user_id&limit=1`))?.[0]?.user_id;
    if (!uid) return res.status(200).json({ ignored: true });   // gehört nicht zu Lumi
    const m = mapStatus(a), variant = String(a.variant_id || "");
    const interval = variant && variant === L.PLANS().yearly.variant ? "year" : variant && variant === L.PLANS().monthly.variant ? "month" : null;
    await L.sb("POST", "lumi_subscriptions?on_conflict=user_id", {
      user_id: uid, ls_customer_id: String(a.customer_id || ""), ls_subscription_id: String(d.id), status: m.status, variant_id: variant || null, interval,
      current_period_end: m.until ? new Date(m.until).toISOString() : null, cancel_at_period_end: m.cancel, updated_at: new Date().toISOString(),
    }, { Prefer: "resolution=merge-duplicates,return=minimal" });
    return res.status(200).json({ received: true });
  } catch (e) { return res.status(500).json({ error: e.message }); }   // 5xx → Lemon Squeezy wiederholt die Zustellung
};
