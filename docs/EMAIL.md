# E-Mail-Versand (Resend)

Studix verschickt Mails über [Resend](https://resend.com). Der Code liegt in `api/_mail.js` (Vorlagen + `sendMail`) und `api/send.js` (Endpunkt).

## Einrichten
1. In Resend einen API-Key erstellen und in Vercel als `RESEND_API_KEY` eintragen (Production).
2. Optional `MAIL_FROM`, z. B. `Studix <hallo@studix.space>`. Die Domain muss bei Resend verifiziert sein (DNS-Einträge). Ohne eigene Domain gilt `Studix <onboarding@resend.dev>`; dann kommen Mails nur bei der Adresse deines Resend-Kontos an.
3. Optional `SITE_URL` (Standard `https://studix.space`) für die Links in den Mails.

## Benutzen
- Im Browser (angemeldet): `fetch("/api/send", { method: "POST", headers: { ...await authHeader(), "content-type": "application/json" }, body: JSON.stringify({ type: "welcome" }) })` – schickt die Vorlage an die Adresse des eigenen Kontos. Es gibt bewusst kein freies Empfängerfeld.
- Serverseitig (z. B. in einem Webhook): `require("./_mail").sendMail({ to, subject, html })`.
- Neue Vorlage: in `templates` in `api/_mail.js` ergänzen (`layout(titel, html, [Buttontext, Link])`).
