# Lumi Plus – Bezahlung mit Lemon Squeezy

Lemon Squeezy ist **Merchant of Record**: Sie verkaufen Lumi Plus rechtlich selbst, berechnen die **Mehrwertsteuer in jedem Land** (EU-OSS, UK, CH, USA …),
stellen die Rechnung aus, führen die Steuer ab und zahlen dir den Rest aus. Du musst dich nicht in einzelnen Ländern für die MwSt registrieren; die Auszahlung
versteuerst du normal als Einkommen. Dafür nehmen sie eine Gebühr (derzeit ca. 5 % + 0,50 $ pro Verkauf, bitte aktuell prüfen).

Ablauf: Klick auf „Lumi Plus“ → `/api/checkout` erstellt einen Checkout → Kauf bei Lemon Squeezy → `/api/ls-webhook` schreibt den Abo-Status in Supabase
(`lumi_subscriptions`) → die App liest ihn und schaltet Plus frei. Kündigen/Zahlungsart ändern geht über `/api/portal` (Kundenportal).

## 1. Supabase (einmalig)
SQL-Editor → Inhalt von `supabase/billing.sql` ausführen (legt `lumi_subscriptions` und `lumi_ai_usage` an).
Danach unter *Project Settings → API* den **service_role**-Key kopieren (geheim, nie in den Browser).

## 2. Lemon Squeezy einrichten
1. Store anlegen und Konto verifizieren (Auszahlung, Steuerangaben). Zuerst im **Test mode** arbeiten (Schalter oben links).
2. *Products → New product*: „Lumi Plus“, **Subscription**, Preis z. B. 4,99 € / Monat. Für ein Jahresabo eine zweite **Variant** (39,99 € / Jahr) anlegen.
   Die Preise pflegst du dort; `PLUS_*_CENTS` in Vercel ist nur die Anzeige auf der Preisseite und muss dazu passen.
3. *Settings → API* → neuen **API-Key** erzeugen. *Settings → Stores* → **Store-ID**. Bei jeder Variant die **Variant-ID** notieren.
4. *Settings → Webhooks → Add*: URL `https://DEINE-DOMAIN/api/ls-webhook`, selbst gewähltes **Signing secret**, Ereignisse:
   `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_resumed`, `subscription_expired`, `subscription_paused`,
   `subscription_unpaused`, `subscription_payment_failed`, `subscription_payment_success`, `subscription_payment_recovered`.

## 3. Vercel-Umgebungsvariablen
| Name | Wert |
|---|---|
| `LEMONSQUEEZY_API_KEY` | API-Key |
| `LEMONSQUEEZY_STORE_ID` | Store-ID |
| `LS_VARIANT_MONTHLY` / `LS_VARIANT_YEARLY` | Variant-IDs (mindestens eine) |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Signing secret aus Schritt 4 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role-Key aus Supabase |
| `PLUS_MONTHLY_CENTS` / `PLUS_YEARLY_CENTS` | nur Anzeige, Standard `499` / `3999` |
| `PLUS_CURRENCY` | Anzeige-Währung, Standard `eur` |
| `SITE_URL` | optional, z. B. `https://lumi.example.ch` |
| `LS_TEST_MODE` | `1` = Checkouts im Test mode |
| `AI_FREE_DAILY` | optional: KI-Anfragen pro Tag für Gratis-Konten (z. B. `30`). Leer = unbegrenzt für alle |

Danach **Redeploy**. Prüfen: `https://DEINE-DOMAIN/api/config` muss `"plus":{"enabled":true,…}` zeigen – dann erscheinen Preise und Kaufbutton.
Im Test mode mit Karte `4242 4242 4242 4242` kaufen, dann auf Live wechseln (Live-API-Key, Live-Webhook und Live-Variant-IDs, im Test mode sind sie getrennt).

## 4. Rechtliches
`legal.html` hat Vorlagen für Impressum, Datenschutz, AGB und Widerruf (Lemon Squeezy als Verkäufer genannt). Trage deine Angaben in `config.js` unter `legal`
ein und lass die Texte prüfen. Ob Lemon Squeezy beim Kauf die Zustimmung zum sofortigen Leistungsbeginn (Verlust des Widerrufsrechts bei digitalen Leistungen)
einholt, richtet sich nach deren Checkout und Bedingungen – bitte prüfen.

## 5. Wie Plus freigeschaltet wird
- App: `isPlus()` in `billing.js` (liest die eigene Zeile aus `lumi_subscriptions`, gesichert per Row-Level-Security).
- Server: `api/ai.js` prüft bei gesetztem `AI_FREE_DAILY` Abo-Status und Tageszähler. Die automatische Rechtschreibkorrektur zählt nicht.
- Status `active`, `trialing`, `past_due` (kurze Kulanz) gelten als Plus; gekündigte Abos bleiben bis zum Laufzeitende aktiv.
