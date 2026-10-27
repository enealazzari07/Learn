# Lumi Study Pro – Bezahlung mit Stripe Managed Payments

**Alles kommt live von Stripe.** Es gibt keine Abo-Tabelle in unserer Datenbank und kein Webhook: Die App fragt das Abo direkt über die Stripe-API ab
(`/api/subscription`) und zeigt es 1:1 an (Status, Plan, Preis, Testversion, nächste Zahlung, Zahlungsmittel, Rechnungen).

**Managed Payments** ist Stripes Merchant-of-Record-Lösung: Stripe verkauft Lumi Study Pro rechtlich selbst, berechnet und kassiert die **Mehrwertsteuer in über 80 Ländern**,
führt sie ab, stellt Rechnungen aus (Kund:innen sehen „Sold through Link“) und übernimmt Betrugsabwehr und Streitfälle.
Infos: https://stripe.com/managed-payments · https://docs.stripe.com/payments/managed-payments

## Ablauf
1. Klick auf „14 Tage gratis testen“ → `/api/checkout` erstellt eine Stripe-Checkout-Sitzung (Managed Payments, Testversion, Preis **inklusive MwSt.**).
2. Kauf bei Stripe → zurück in die App (`?plus=success`) → `/api/subscription` lädt das Abo live.
3. Verwalten (Einstellungen → Study Pro): Kündigen / Wieder aktivieren direkt in der App (setzt `cancel_at_period_end` bei Stripe),
   Zahlungsart ändern und alle Rechnungen im Stripe-Kundenportal (`/api/portal`).

Das Abo wird dem Konto über `metadata.user_id` zugeordnet (Stripe-Suche), mit Fallback über die Checkout-Sitzungen (`client_reference_id`).

## Einrichtung in Stripe (zuerst im Testmodus)
1. **Managed Payments aktivieren:** *Settings → Managed Payments* (https://dashboard.stripe.com/settings/managed-payments).
2. **Produkt „Lumi Study Pro“** mit einem zulässigen Produktsteuercode („Eligible for Managed Payments“) und monatlichen Preisen in **CHF, EUR und USD** (je 8).
   Entweder je Währung ein eigener Preis oder ein Preis mit „Weitere Währungen“ – beides wird erkannt. Der Server nimmt die neuesten **aktiven** Preise des Produkts.
   Preis 0 (Gratis) wird ignoriert.
3. **Mehrwertsteuer immer enthalten:** Der Checkout setzt `tax_behavior: inclusive` selbst, die Kund:innen zahlen also genau 8 inkl. MwSt. – in jeder Währung.
   Zusätzlich empfohlen: *Settings → Tax → „Include tax in prices“* aktivieren (gilt für Preise ohne Angabe).
4. **Kundenportal aktivieren:** *Settings → Billing → Customer portal* (Zahlungsart ändern, Rechnungen).
5. **API-Key:** *Developers → API keys* → Secret key (`sk_test_…`, später `sk_live_…`).

Ein Webhook wird **nicht** mehr gebraucht. Ein bereits angelegter Endpunkt in Stripe kann gelöscht werden.

## Vercel-Umgebungsvariablen
| Name | Wert |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` bzw. `sk_live_…` (einzige Pflichtvariable) |
| `STRIPE_PRODUCT_ID` | optional, falls das Produkt nicht „Lumi Study Pro“ heißt |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | optional, feste Preis-IDs statt automatischer Suche |
| `STRIPE_PUBLISHABLE_KEY` (oder `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) | `pk_test_…` / `pk_live_…` (öffentlicher Schlüssel): schaltet den **eingebetteten Checkout** im Lumi-Fenster ein, ohne Weiterleitung. Ohne ihn (oder falls Stripe das für Managed Payments ablehnt) öffnet sich die Stripe-Seite |
| `SITE_URL` | optional, z. B. `https://lumi.example.ch` |
| `STRIPE_API_VERSION` | optional, Standard `2025-03-31.basil` |
| `STRIPE_MANAGED_PAYMENTS` | `off` schaltet Managed Payments für Tests ab |
| `PRO_YEARLY_CENTS` | Jahrespreis in Rappen/Cent, wenn in Stripe kein Jahrespreis angelegt ist (Standard `6000` = 60 pro Jahr, in jeder Währung) |
| `PRO_TRIAL_DAYS` | Testversion in Tagen, Standard `14` |
| `AI_FREE_WINDOW_TOKENS` | KI-Token pro Zeitfenster für Gratis-Konten (Standard `5000` Lumi-Token = echte Token ÷ 10, `0` = unbegrenzt) |
| `AI_WINDOW_HOURS` | Länge des Fensters in Stunden (Standard `5`; startet mit der ersten Anfrage); beide brauchen `SUPABASE_SERVICE_ROLE_KEY` und `supabase/billing.sql` |

Prüfen: `https://DEINE-DOMAIN/api/config` muss `"plus":{"enabled":true,…}` mit den drei Währungen unter `opts.monthly` zeigen.
Testkauf mit `4242 4242 4242 4242`. Für Live: Live-Key, Produkt und Preise im Livemodus neu anlegen.

## Rechtliches
`legal.html` enthält Vorlagen (Stripe als Verkäufer). Eigene Angaben in `config.js` unter `legal` eintragen und prüfen lassen.
