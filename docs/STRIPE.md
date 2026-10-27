# Lumi Plus – Bezahlung mit Stripe und Mehrwertsteuer je Land

Ablauf: Nutzer:in klickt „Lumi Plus“ → `/api/stripe-checkout` erstellt eine Stripe-Checkout-Sitzung → Stripe kassiert und berechnet die
Mehrwertsteuer → `/api/stripe-webhook` schreibt den Abo-Status in Supabase (`lumi_subscriptions`) → die App liest ihn und schaltet Plus frei.
Kartendaten sehen weder die App noch dein Server.

## 1. Supabase (einmalig)
SQL-Editor → Inhalt von `supabase/billing.sql` ausführen. Das legt `lumi_subscriptions` (Abo-Status) und `lumi_ai_usage` (KI-Tageszähler) an.
Danach unter *Project Settings → API* den **service_role**-Key kopieren (geheim, nie in den Browser!).

## 2. Stripe einrichten
1. Konto auf stripe.com anlegen und Firmen-/Anbieterdaten hinterlegen. Zuerst im **Testmodus** arbeiten.
2. *Developers → API keys* → **Secret key** (`sk_test_…`) kopieren.
3. *Settings → Billing → Customer portal* aktivieren (Kündigen, Zahlungsart ändern, Rechnungen). Kündigung „zum Periodenende“ erlauben.
4. *Settings → Payment methods*: Karten, Apple Pay/Google Pay, SEPA-Lastschrift aktivieren, wie gewünscht.
5. *Developers → Webhooks → Add endpoint*: `https://DEINE-DOMAIN/api/stripe-webhook`
   Ereignisse: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`. Das **Signing secret** (`whsec_…`) kopieren.

## 3. Vercel-Umgebungsvariablen
| Name | Wert |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` (später `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role-Key aus Supabase |
| `SITE_URL` | optional, z. B. `https://lumi.example.ch` (sonst die aufgerufene Domain) |
| `PLUS_MONTHLY_CENTS` / `PLUS_YEARLY_CENTS` | optional, Standard `499` / `3999` (Bruttopreis inkl. MwSt) |
| `PLUS_CURRENCY` | optional, Standard `eur` (z. B. `chf`) |
| `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_YEARLY` | optional: fertige Stripe-Preis-IDs statt der Preise oben |
| `AI_FREE_DAILY` | optional: KI-Anfragen pro Tag für Gratis-Konten (z. B. `30`). Leer = unbegrenzt für alle |
| `STRIPE_TAX` | `off` schaltet die automatische Steuer ab (siehe unten) |

Danach **Redeploy**. Prüfen: `https://DEINE-DOMAIN/api/config` muss `"plus":{"enabled":true,…}` zeigen – dann erscheinen Preise und Kaufbutton.
Test mit Karte `4242 4242 4242 4242`, beliebiges Datum/CVC. Erst danach auf Live-Keys wechseln (neuer Webhook für den Live-Modus nötig).

## 4. Mehrwertsteuer je Land (Stripe Tax)
Lumi setzt `automatic_tax` ein: Stripe bestimmt das Land aus der Rechnungsadresse und wendet den dortigen Satz an. Preise sind **Bruttopreise**
(`tax_behavior: inclusive`), Kund:innen sehen also in jedem Land denselben Betrag, abzüglich der jeweiligen Steuer bleibt dir der Rest.
Firmenkund:innen in der EU können eine USt-ID angeben (Reverse-Charge, 0 %).

Einmalig in Stripe unter *Settings → Tax*:
1. **Head office / Herkunftsadresse** eintragen.
2. **Registrierungen** je Land hinzufügen, in dem du steuerpflichtig bist. Wichtig: Stripe **berechnet und kassiert** die Steuer nur dort, wo eine
   Registrierung eingetragen ist – anmelden, abführen und Erklärungen abgeben musst du selbst (oder über einen Partner/Stripe Tax Complete).
3. Produkt-Steuercode: Standard `txcd_10000000` (elektronisch erbrachte Dienstleistung). Per `STRIPE_TAX_CODE` änderbar (z. B. SaaS `txcd_10103001`).

Faustregeln (keine Steuerberatung – bitte mit Steuerberater:in prüfen):
- **EU, Verkauf an Privatpersonen in anderen EU-Ländern:** Steuer des Kundenlands. Ab 10 000 € EU-weitem Umsatz pro Jahr oder bei Sitz in der EU über das
  **OSS-Verfahren** (in Deutschland: BZSt-Portal) – eine Quartalsmeldung statt Registrierung in jedem Land.
- **Schweiz:** MWST-Pflicht ab 100 000 CHF weltweitem Umsatz; Ausländische Anbieter registrieren sich erst darüber. Darunter: `STRIPE_TAX=off`.
- **Kleinunternehmer (DE § 19 UStG) / unter der Schwelle:** `STRIPE_TAX=off` setzen, Preise werden ohne Steuer ausgewiesen, auf Rechnungen ggf. Hinweis ergänzen.
- UK, Norwegen, USA u. a.: eigene Schwellen und Registrierungen, in Stripe Tax pro Land prüfbar.

Schlägt der Checkout mit einem Steuer-Fehler fehl, ist meist Stripe Tax noch nicht aktiviert oder die Herkunftsadresse fehlt.

## 4b. Rechtliches
`legal.html` enthält Vorlagen für Impressum, Datenschutz, AGB und Widerruf. Trage deine Angaben in `config.js` unter `legal` ein und lass die Texte prüfen.
Der Bezahlbutton verlangt die Zustimmung zum sofortigen Leistungsbeginn (Widerrufsverzicht bei digitalen Leistungen).

## 5. Wie Plus freigeschaltet wird
- App: `isPlus()` in `billing.js` (liest die eigene Zeile aus `lumi_subscriptions`, gesichert per Row-Level-Security).
- Server: `api/ai.js` prüft bei gesetztem `AI_FREE_DAILY` serverseitig Abo-Status und Tageszähler. Die automatische Rechtschreibkorrektur zählt nicht.
- Status `active`, `trialing` und `past_due` (kurze Kulanz) gelten als Plus.
