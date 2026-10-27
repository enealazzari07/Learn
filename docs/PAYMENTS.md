# Lumi Pro – Bezahlung mit Stripe Managed Payments

**Managed Payments** ist Stripes Merchant-of-Record-Lösung: Stripe verkauft Lumi Pro rechtlich selbst, berechnet und kassiert die **Mehrwertsteuer in über 80 Ländern**,
meldet und führt sie ab, stellt Rechnungen/Belege aus (Kund:innen sehen „Sold through Link“) und übernimmt Betrugsabwehr und Streitfälle. Du musst dich nicht in einzelnen
Ländern für die MwSt registrieren. In Ländern, die Managed Payments nicht abdeckt, bleibst du selbst steuerpflichtig (dort kannst du Stripe Tax nutzen).
Gebühren und die Länderliste stehen bei Stripe: https://stripe.com/managed-payments und https://docs.stripe.com/payments/managed-payments

Ablauf: Klick auf „Lumi Pro“ → `/api/checkout` erstellt eine Checkout-Sitzung mit `managed_payments[enabled]=true` → Kauf bei Stripe →
`/api/stripe-webhook` schreibt den Abo-Status in Supabase (`lumi_subscriptions`) → die App liest ihn und schaltet Pro frei.
Kündigen/Zahlungsart ändern: `/api/portal` (Kundenportal) oder Link (link.com).

## 1. Supabase (einmalig)
SQL-Editor → Inhalt von `supabase/billing.sql` ausführen (legt `lumi_subscriptions` und `lumi_ai_usage` an).
Danach *Project Settings → API* → **service_role**-Key kopieren (geheim, nie in den Browser).

## 2. Stripe einrichten (zuerst im Testmodus/Sandbox)
1. **Managed Payments aktivieren:** Dashboard → *Settings → Managed Payments* (https://dashboard.stripe.com/settings/managed-payments), Bedingungen akzeptieren.
2. **Produkt anlegen:** *Product catalog → Create product* → Name „Lumi Pro“, **Product tax code** wählen, der mit **„Eligible for Managed Payments“** markiert ist
   (für eine Lern-App als Software/SaaS). Preis: wiederkehrend, **Monatlich** 4,99 € → **Preis-ID** (`price_…`) notieren.
   Über das **+** bei *Pricing* einen zweiten Preis **Jährlich** 39,99 € anlegen → zweite Preis-ID.
3. **Steuer im Preis:** *Settings → Tax → „Include tax in prices“* aktivieren, wenn die Preise Brutto sein sollen (sonst schlägt Stripe die Steuer obendrauf).
4. **Kundenportal:** *Settings → Billing → Customer portal* aktivieren (Kündigen, Zahlungsart, Rechnungen).
5. **API-Key:** *Developers → API keys* → **Secret key** (`sk_test_…`).
6. **Webhook:** *Developers → Webhooks → Add endpoint*: `https://DEINE-DOMAIN/api/stripe-webhook`, Ereignisse
   `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
   **Signing secret** (`whsec_…`) kopieren.
7. *Settings → Business details*: Support-E-Mail eintragen (Stripe nutzt sie bei Rückfragen).

## 3. Vercel-Umgebungsvariablen
| Name | Wert |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (später `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | optional. Ohne sie sucht der Server selbst die aktiven Preise des Stripe-Produkts „Lumi Pro“ (monatlich/jährlich, Betrag aus Stripe). Mit `STRIPE_PRODUCT_ID` lässt sich das Produkt festlegen |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role-Key aus Supabase |
| `SITE_URL` | optional, z. B. `https://lumi.example.ch` |
| `STRIPE_API_VERSION` | optional, Standard `2025-03-31.basil` (so im Stripe-Beispiel für Managed Payments; neuere Versionen funktionieren ebenfalls) |
| `STRIPE_MANAGED_PAYMENTS` | `off` schaltet Managed Payments für Tests ab |
| `AI_FREE_DAILY` | optional: KI-Anfragen pro Tag für Gratis-Konten (z. B. `30`). Leer = unbegrenzt für alle |

Danach **Redeploy**. Prüfen: `https://DEINE-DOMAIN/api/config` muss `"plus":{"enabled":true,…}` zeigen – dann erscheinen Preise und Kaufbutton.
Testkauf mit Karte `4242 4242 4242 4242`, beliebiges Datum/CVC; auf der Checkout-Seite andere Rechnungsadressen ausprobieren, um die Steuer je Land zu sehen.
Erst danach auf Live wechseln: Live-Secret-Key, **neuer Live-Webhook** (anderes `whsec_`), Produkt und Preise im Livemodus neu anlegen (die Preis-IDs unterscheiden sich).

## 4. Rechtliches
`legal.html` hat Vorlagen für Impressum, Datenschutz, AGB und Widerruf (Stripe als Verkäufer genannt). Trage deine Angaben in `config.js` unter `legal` ein und lass die
Texte prüfen. In *Settings → Checkout* kannst du eigene AGB- und Datenschutz-Links für die Checkout-Seite hinterlegen (z. B. `https://DEINE-DOMAIN/legal.html#agb`).

## 5. Wie Pro freigeschaltet wird
- App: `isPlus()` in `billing.js` (liest die eigene Zeile aus `lumi_subscriptions`, gesichert per Row-Level-Security).
- Server: `api/ai.js` prüft bei gesetztem `AI_FREE_DAILY` Abo-Status und Tageszähler. Die automatische Rechtschreibkorrektur zählt nicht.
- Status `active`, `trialing`, `past_due` (kurze Kulanz) gelten als Pro; gekündigte Abos bleiben bis zum Periodenende aktiv.

## Hinweise
- Mit Managed Payments darf `subscription.default_payment_method` nicht per API geändert werden; Kund:innen ändern die Zahlungsart im Kundenportal.
- Löscht jemand seine Daten über Link, kündigt Stripe die Abos; das Webhook setzt den Status dann automatisch auf beendet.
- Custom Domains werden auf Managed-Payments-Checkouts nicht unterstützt.
