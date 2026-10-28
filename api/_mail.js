/* E-Mail-Versand über Resend (https://resend.com). Vercel-Variablen:
   RESEND_API_KEY (Pflicht)  – API-Key aus dem Resend-Dashboard
   MAIL_FROM      (optional) – Absender, z. B. "Studix <hallo@studix.space>" (Domain bei Resend verifizieren). Ohne eigene Domain: "Studix <onboarding@resend.dev>" (liefert nur an die Mail-Adresse deines Resend-Kontos). */
const { Resend } = require("resend");

let client = null;
const resend = () => client || (client = new Resend(process.env.RESEND_API_KEY));
const FROM = () => process.env.MAIL_FROM || "Studix <onboarding@resend.dev>";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SITE = () => process.env.SITE_URL || "https://studix.space";

/* ---------- Design ----------
   Schlicht und weiss: Logo + Name oben links, grosse Überschrift, ruhiger Text, schwarzer Button, feine Linien.
   Nur Tabellen + Inline-CSS (funktioniert in Gmail, Outlook, Apple Mail); Dunkelmodus über prefers-color-scheme. */
const VIOLET = "#5b3df5", INK = "#0f0f12";
const nl2 = s => esc(s).replace(/\n/g, "<br>");

/* Parameter: badge (kleines Etikett über der Überschrift), title, lead (Untertitel), body (HTML), code (Bestätigungscode), details ([[Name, Wert], …]), cta ([Text, Link]), link (Klartext-Link), note (kleiner Hinweis), preheader (Vorschautext im Posteingang) */
const layout = ({ badge = "", title, lead = "", body = "", code = "", details = [], cta = null, link = "", note = "", preheader = "" }) => `<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<style>
  body{margin:0;padding:0}a{color:${INK}}
  .logo-d{display:none!important}
  @media (max-width:520px){.px{padding-left:24px!important;padding-right:24px!important}.h1{font-size:27px!important}.btn a{display:block!important;text-align:center}}
  @media (prefers-color-scheme:dark){.bg{background:#0b0b0e!important}.dk{color:#f4f4f8!important}.tx{color:#b9b9c6!important}.mut{color:#8d8d9b!important}.box{background:#17171d!important}.ln{border-color:#26262f!important}.logo-l{display:none!important}.logo-d{display:block!important}a.lk{color:#d6d6e4!important}.cta{background:#ffffff!important}.cta a{color:#0f0f12!important}}
</style></head>
<body class="bg" style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${esc(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#ffffff"><tr><td align="center" style="padding:44px 16px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px">
  <!-- Logo -->
  <tr><td class="px" align="left" style="padding:0 8px 34px"><a href="${esc(SITE())}" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
    <td valign="middle" style="padding-right:10px"><img class="logo-l" src="${esc(SITE())}/logo.png" width="32" height="32" alt="" style="display:block;border:0"><img class="logo-d" src="${esc(SITE())}/logo-white.png" width="32" height="32" alt="" style="display:none;border:0"></td>
    <td valign="middle" class="dk" style="font-size:22px;font-weight:700;letter-spacing:-.035em;color:${INK}">Studix</td></tr></table></a></td></tr>
  <!-- Überschrift -->
  <tr><td class="px" style="padding:0 8px">
    ${badge ? `<div class="mut" style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8a98;margin-bottom:12px">${esc(badge)}</div>` : ""}
    <h1 class="h1 dk" style="margin:0;font-size:32px;line-height:1.12;font-weight:700;letter-spacing:-.04em;color:${INK}">${esc(title)}</h1>
    ${lead ? `<p class="tx" style="margin:14px 0 0;font-size:17px;line-height:1.55;color:#5b5b68">${esc(lead)}</p>` : ""}
  </td></tr>
  <!-- Inhalt -->
  <tr><td class="px" style="padding:26px 8px 0">
    ${body ? `<div class="tx" style="font-size:16px;line-height:1.65;color:#55555f">${body}</div>` : ""}
    ${code ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="box" style="margin-top:22px;background:#f5f5f8;border-radius:16px"><tr><td align="center" style="padding:24px 12px"><div class="dk" style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:36px;font-weight:700;letter-spacing:.3em;color:${INK};padding-left:.3em">${esc(code)}</div><div class="mut" style="font-size:13px;color:#8a8a98;margin-top:8px">Dein Code · nur kurze Zeit gültig</div></td></tr></table>` : ""}
    ${details.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px">${details.map(([k, v], n) => `<tr><td class="mut ln" style="padding:14px 0;border-top:1px solid #ececf1;${n === details.length - 1 ? "border-bottom:1px solid #ececf1;" : ""}font-size:14.5px;color:#8a8a98">${esc(k)}</td><td align="right" class="dk ln" style="padding:14px 0;border-top:1px solid #ececf1;${n === details.length - 1 ? "border-bottom:1px solid #ececf1;" : ""}font-size:15px;font-weight:600;color:${INK}">${esc(v)}</td></tr>`).join("")}</table>` : ""}
    ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:30px 0 4px"><tr><td align="center" class="cta" bgcolor="${INK}" style="border-radius:999px;background:${INK}"><a href="${esc(cta[1])}" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:600;letter-spacing:-.01em;color:#ffffff;text-decoration:none;border-radius:999px">${esc(cta[0])}</a></td></tr></table>` : ""}
    ${note ? `<p class="mut" style="margin:16px 0 0;font-size:14px;line-height:1.6;color:#8a8a98">${nl2(note)}</p>` : ""}
    ${link ? `<p class="mut" style="margin:20px 0 0;font-size:12.5px;line-height:1.55;color:#a0a0ad">Funktioniert der Button nicht? Kopiere diesen Link in deinen Browser:<br><a class="lk" href="${esc(link)}" style="color:#6b6b78;word-break:break-all">${esc(link)}</a></p>` : ""}
  </td></tr>
  <!-- Fuss -->
  <tr><td class="px" style="padding:40px 8px 0"><div class="ln" style="border-top:1px solid #ececf1;padding-top:22px"></div>
    <p class="mut" style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#8a8a98"><a href="${esc(SITE())}/#/app" class="dk" style="color:${INK};font-weight:600;text-decoration:none">Studix öffnen</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html#datenschutz" style="color:#8a8a98;text-decoration:none">Datenschutz</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html#agb" style="color:#8a8a98;text-decoration:none">AGB</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html" style="color:#8a8a98;text-decoration:none">Kontakt</a></p>
    <p class="mut" style="margin:0;font-size:12px;line-height:1.6;color:#a0a0ad">Studix – die Lern-App für Schule und Studium.<br>Diese E-Mail wurde automatisch verschickt, bitte antworte nicht direkt darauf.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

/* ---------- Vorlagen: { subject, html, text } ---------- */
const P = t => `<p style="margin:0 0 14px">${t}</p>`;
const templates = {
  /* E-Mail-Adresse bestätigen (bei Supabase: {{ .ConfirmationURL }}) */
  verify: ({ name, url, code }) => ({
    subject: "Bestätige deine E-Mail-Adresse",
    html: layout({ badge: "Konto", title: `Nur noch ein Klick${name ? ", " + name : ""}.`, lead: "Gib den Code in Studix ein oder klicke auf den Button – dann ist dein Konto startklar.", preheader: code ? `Dein Code: ${code}` : "Bestätige deine E-Mail-Adresse für Studix.",
      code, cta: ["E-Mail bestätigen", url], link: url, note: "Du hast dich nicht bei Studix registriert? Dann kannst du diese Nachricht einfach ignorieren." }),
    text: `Bestätige deine E-Mail-Adresse für Studix.${code ? " Dein Code: " + code + "." : ""} Link: ${url}`,
  }),
  /* Passwort zurücksetzen (bei Supabase: {{ .ConfirmationURL }}) */
  reset: ({ url }) => ({
    subject: "Passwort zurücksetzen",
    html: layout({ badge: "Sicherheit", title: "Neues Passwort festlegen.", lead: "Wir haben eine Anfrage erhalten, das Passwort deines Studix-Kontos zurückzusetzen.", preheader: "Setze dein Studix-Passwort zurück.",
      body: P("Klicke auf den Button und wähle ein neues Passwort. Der Link ist aus Sicherheitsgründen nur kurze Zeit gültig."), cta: ["Passwort zurücksetzen", url], link: url, note: "Du hast das nicht angefordert? Dann ist alles in Ordnung – dein Passwort bleibt unverändert und du musst nichts tun." }),
    text: `Passwort für Studix zurücksetzen: ${url}`,
  }),
  /* Anmelden per Link (bei Supabase: {{ .ConfirmationURL }}) */
  magic: ({ url, code }) => ({
    subject: "Dein Anmelde-Link für Studix",
    html: layout({ badge: "Anmeldung", title: "Dein Link zum Anmelden.", lead: "Ein Klick, und du bist in Studix – ganz ohne Passwort.", preheader: "Dein Anmelde-Link für Studix.",
      body: P("Dieser Link funktioniert nur einmal und nur kurze Zeit."), code, cta: ["Jetzt anmelden", url], link: url, note: "Du hast dich nicht angemeldet? Dann ignoriere diese Nachricht." }),
    text: `Anmelden bei Studix: ${url}`,
  }),
  /* neue E-Mail-Adresse bestätigen (bei Supabase: {{ .ConfirmationURL }}) */
  change: ({ url, email }) => ({
    subject: "Bestätige deine neue E-Mail-Adresse",
    html: layout({ badge: "Konto", title: "Neue E-Mail-Adresse bestätigen.", lead: "Du möchtest die E-Mail-Adresse deines Studix-Kontos ändern.", preheader: "Bestätige deine neue E-Mail-Adresse.",
      body: P("Bestätige die Änderung mit einem Klick."), details: email ? [["Neue Adresse", email]] : [], cta: ["Änderung bestätigen", url], link: url, note: "Du hast das nicht selbst gemacht? Ändere bitte sofort dein Passwort." }),
    text: `Neue E-Mail-Adresse bestätigen: ${url}`,
  }),
  /* Willkommen */
  welcome: ({ name }) => ({
    subject: "Willkommen bei Studix",
    html: layout({ badge: "Willkommen", title: `Willkommen${name ? ", " + name : ""}!`, lead: "Dein Lern- und Workspace an einem Ort.", preheader: "Schön, dass du da bist – so legst du los.",
      body: P("In Studix findest du Notizen, Zeichnen, Karteikarten, Planer und Studix AI – auf iPad, Handy und PC, auch offline.") + P("<b>Drei Tipps für den Start:</b>") + `<ul style="margin:0 0 6px;padding-left:20px"><li style="margin-bottom:6px">Schreibe deine erste Notiz oder zeichne eine Skizze.</li><li style="margin-bottom:6px">Lass Studix AI Karteikarten aus deinen Notizen machen.</li><li>Trage Prüfungen im Planer ein – wir behalten die Termine im Blick.</li></ul>`, cta: ["Studix öffnen", SITE() + "/#/app"] }),
    text: `Willkommen${name ? ", " + name : ""}! Öffne Studix: ${SITE()}/#/app`,
  }),
  /* Abo abgeschlossen / Testphase gestartet */
  subscription: ({ name, plan = "Studix Study Pro", price = "", interval = "", trialEnd = "", next = "", url = SITE() + "/#/app/settings" }) => ({
    subject: trialEnd ? "Deine Testphase für Studix Study Pro läuft" : "Dein Abo ist aktiv – danke!",
    html: layout({ badge: "Pro", title: trialEnd ? "Deine Testphase läuft." : "Willkommen bei Pro!", lead: trialEnd ? "Du kannst jetzt alles von Studix Study Pro ausprobieren." : `Danke${name ? ", " + name : ""} – dein Abo ist aktiv.`, preheader: trialEnd ? "Deine Testphase für Studix Study Pro hat begonnen." : "Dein Studix-Study-Pro-Abo ist aktiv.",
      body: P(`Mit Pro bekommst du Studix AI mit <b>150’000 Token pro Woche</b> (statt 25’000), längere Antworten und alle neuen Pro-Funktionen zuerst.`),
      details: [["Plan", plan], price ? ["Preis", price + (interval ? " / " + interval : "")] : null, trialEnd ? ["Testphase endet", trialEnd] : null, next ? [trialEnd ? "Erste Zahlung" : "Nächste Zahlung", next] : null].filter(Boolean),
      cta: ["Studix öffnen", SITE() + "/#/app"], note: `Du kannst dein Abo jederzeit in den Einstellungen unter „Pro“ verwalten oder kündigen: ${url}` }),
    text: `${plan} ist aktiv. Verwalten: ${url}`,
  }),
  /* Abo gekündigt */
  cancelled: ({ until = "" }) => ({
    subject: "Dein Abo wurde gekündigt",
    html: layout({ badge: "Pro", title: "Schade, dass du gehst.", lead: until ? `Du behältst Pro bis zum ${until}.` : "Dein Abo wurde beendet.", preheader: "Dein Studix-Abo wurde gekündigt.",
      body: P("Bis dahin kannst du alles wie gewohnt nutzen. Danach wechselt dein Konto auf Gratis – deine Notizen, Karteikarten und alles andere bleiben erhalten.") + P("Du hast es dir anders überlegt? Du kannst das Abo bis dahin jederzeit wieder aktivieren."), cta: ["Abo verwalten", SITE() + "/#/app/settings"] }),
    text: `Dein Abo wurde gekündigt${until ? ", Zugang bis " + until : ""}.`,
  }),
  /* Zahlung fehlgeschlagen */
  payment_failed: ({ url = SITE() + "/#/app/settings" }) => ({
    subject: "Deine Zahlung hat nicht geklappt",
    html: layout({ badge: "Zahlung", title: "Zahlung fehlgeschlagen.", lead: "Wir konnten dein Abo leider nicht abbuchen.", preheader: "Bitte aktualisiere deine Zahlungsart.",
      body: P("Das passiert zum Beispiel bei abgelaufenen Karten. Aktualisiere deine Zahlungsart, damit du Pro ohne Unterbrechung weiter nutzen kannst."), cta: ["Zahlungsart aktualisieren", url], note: "Wir versuchen die Zahlung in den nächsten Tagen automatisch erneut." }),
    text: `Zahlung fehlgeschlagen. Zahlungsart aktualisieren: ${url}`,
  }),
  /* Testphase endet bald */
  trial_ending: ({ days = 3, price = "", date = "" }) => ({
    subject: `Deine Testphase endet in ${days} Tagen`,
    html: layout({ badge: "Pro", title: `Noch ${days} Tage gratis.`, lead: "Deine Testphase für Studix Study Pro endet bald.", preheader: `Deine Testphase endet in ${days} Tagen.`,
      body: P(`Wenn du nichts tust, startet danach dein Abo${price ? " für " + esc(price) : ""}. Du kannst vorher jederzeit kündigen – dann wird nichts berechnet.`), details: date ? [["Testphase endet", date]] : [], cta: ["Abo verwalten", SITE() + "/#/app/settings"] }),
    text: `Deine Testphase endet in ${days} Tagen.`,
  }),
  /* Testmail */
  test: ({ name }) => ({
    subject: "Testmail von Studix",
    html: layout({ badge: "Test", title: "Der Mail-Versand funktioniert.", lead: "Diese Testmail zeigt, dass Studix E-Mails verschicken kann.", preheader: "Testmail von Studix.", body: P(`Hallo${name ? " " + esc(name) : ""}, so sehen die E-Mails von Studix aus.`), cta: ["Studix öffnen", SITE() + "/#/app"] }),
    text: `Der Mail-Versand funktioniert. ${SITE()}/#/app`,
  }),
};

/* Schickt eine Mail. Gibt { id } oder { error } zurück (wirft nie). */
async function sendMail({ to, subject, html, text, replyTo }) {
  if (!process.env.RESEND_API_KEY) return { error: "RESEND_API_KEY fehlt in Vercel." };
  try {
    const { data, error } = await resend().emails.send({ from: FROM(), to: Array.isArray(to) ? to : [to], subject, html, text, ...(replyTo ? { replyTo } : {}) });
    if (error) return { error: error.message || String(error) };
    return { id: data?.id };
  } catch (e) { return { error: e.message || "E-Mail konnte nicht gesendet werden." }; }
}

module.exports = { sendMail, templates, layout, esc };
