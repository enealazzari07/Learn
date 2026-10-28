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
   Ganz weiss, zentriert: oben ein feines Quadrat-Raster (wie auf der Einstellungs-Seite, läuft nach unten in Weiss aus), Logo, grosse Überschrift,
   Code in einzelnen abgerundeten Kästchen, schwarzer Button. Nur Tabellen + Inline-CSS; Dunkelmodus über prefers-color-scheme. */
const INK = "#0f0f12";
const nl2 = s => esc(s).replace(/\n/g, "<br>");

/* Code: jede Ziffer in einem eigenen abgerundeten Kästchen. cells = Array aus einzelnen Zeichen (oder Template-Ausdrücken) */
const codeTable = cells => `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>${cells.map(c => `<td style="padding:0 4px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="cell" align="center" width="46" height="58" style="width:46px;height:58px;background:#f5f5f8;border:1px solid #e6e6ee;border-radius:14px;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:26px;font-weight:700;color:${INK};line-height:58px">${esc(c)}</td></tr></table></td>`).join("")}</tr></table>`;
/* Für Supabase: {{ .Token }} kann erst beim Versand zerlegt werden (Go-Template slice); ist der Code kürzer als 6 Zeichen, steht er in einem einzigen Kästchen */
const supabaseCode = `{{ if ge (len .Token) 6 }}${codeTable([0, 1, 2, 3, 4, 5].map(i => `{{ slice .Token ${i} ${i + 1} }}`)).replace(/&#39;/g, "'")}{{ else }}${codeTable(["{{ .Token }}"]).replace("width=\"46\"", "").replace("width:46px;", "")}{{ end }}`;

/* Parameter: badge (kleines Etikett), title, lead (Untertitel), body (HTML), code (Zeichenkette) oder codeHtml (fertiges HTML), details ([[Name, Wert], …]), cta ([Text, Link]), link (Klartext-Link), note (kleiner Hinweis), preheader (Vorschautext im Posteingang) */
const layout = ({ badge = "", title, lead = "", body = "", code = "", codeHtml = "", details = [], cta = null, link = "", note = "", preheader = "" }) => `<!doctype html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${esc(title)}</title>
<style>
  body{margin:0;padding:0}a{color:${INK}}
  .logo-d{display:none!important}
  @media (max-width:540px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:28px!important}.btn a{display:block!important}.cell{width:40px!important;height:52px!important;font-size:22px!important;line-height:52px!important}}
  @media (prefers-color-scheme:dark){.bg{background:#0b0b0e!important}.hero{background-color:#0b0b0e!important;background-image:none!important}.dk{color:#f4f4f8!important}.tx{color:#b9b9c6!important}.mut{color:#8d8d9b!important}.pill{background:#1d1d25!important;color:#b9b9c6!important}.cell{background:#1a1a22!important;border-color:#2b2b36!important;color:#f4f4f8!important}.ln{border-color:#26262f!important}.logo-l{display:none!important}.logo-d{display:block!important}.cta{border-color:#3a3a46!important}}
</style></head>
<body class="bg" style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${esc(preheader)}${"&nbsp;&zwnj;".repeat(40)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="bg" style="background:#ffffff"><tr><td align="center" style="padding:0 0 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
  <!-- Kopf mit Raster, Logo, Überschrift -->
  <tr><td class="hero px" align="center" bgcolor="#ffffff" background="${esc(SITE())}/mail-grid.png" style="background-color:#ffffff;background-image:url('${esc(SITE())}/mail-grid.png');background-repeat:no-repeat;background-position:center top;background-size:560px auto;padding:48px 40px 8px">
    <a href="${esc(SITE())}" style="text-decoration:none"><table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr>
      <td valign="middle" style="padding-right:6px"><img class="logo-l" src="${esc(SITE())}/logo.png" width="40" height="40" alt="" style="display:block;border:0"><img class="logo-d" src="${esc(SITE())}/logo-white.png" width="40" height="40" alt="" style="display:none;border:0"></td>
      <td valign="middle"><img class="logo-l" src="${esc(SITE())}/wordmark.png" width="81" height="36" alt="Studix" style="display:block;border:0"><img class="logo-d" src="${esc(SITE())}/wordmark-white.png" width="81" height="36" alt="Studix" style="display:none;border:0"></td></tr></table></a>
    ${badge ? `<div style="margin-top:34px"><span class="pill mut" style="display:inline-block;background:#f2f2f6;color:#6b6b78;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:999px">${esc(badge)}</span></div>` : `<div style="height:34px;line-height:34px">&nbsp;</div>`}
    <h1 class="h1 dk" style="margin:16px 0 0;font-size:34px;line-height:1.1;font-weight:700;letter-spacing:-.045em;color:${INK}">${esc(title)}</h1>
    ${lead ? `<p class="tx" style="margin:14px 0 0;font-size:17px;line-height:1.55;color:#5b5b68">${esc(lead)}</p>` : ""}
  </td></tr>
  <!-- Inhalt -->
  <tr><td class="px" align="center" style="padding:26px 40px 0">
    ${body ? `<div class="tx" style="font-size:16px;line-height:1.65;color:#55555f;text-align:center">${body}</div>` : ""}
    ${codeHtml || (code ? codeTable([...String(code)]) : "") ? `<div style="margin-top:${body ? 24 : 4}px">${codeHtml || codeTable([...String(code)])}</div><div class="mut" style="margin-top:12px;font-size:13px;color:#8a8a98">Dein Code · nur kurze Zeit gültig</div>` : ""}
    ${details.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;text-align:left">${details.map(([k, v], n) => `<tr><td class="mut ln" style="padding:14px 0;border-top:1px solid #ececf1;${n === details.length - 1 ? "border-bottom:1px solid #ececf1;" : ""}font-size:14.5px;color:#8a8a98">${esc(k)}</td><td align="right" class="dk ln" style="padding:14px 0;border-top:1px solid #ececf1;${n === details.length - 1 ? "border-bottom:1px solid #ececf1;" : ""}font-size:15px;font-weight:600;color:${INK}">${esc(v)}</td></tr>`).join("")}</table>` : ""}
    ${cta ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:30px auto 4px"><tr><td align="center" class="cta" bgcolor="${INK}" style="border-radius:999px;background:${INK};border:1px solid ${INK}"><a href="${esc(cta[1])}" style="display:inline-block;padding:17px 38px;font-size:16px;font-weight:600;letter-spacing:-.01em;color:#ffffff;text-decoration:none;border-radius:999px">${esc(cta[0])}</a></td></tr></table>` : ""}
    ${note ? `<p class="mut" style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#8a8a98">${nl2(note)}</p>` : ""}
  </td></tr>
  <!-- Fuss -->
  <tr><td class="px" align="center" style="padding:40px 40px 0"><div class="ln" style="border-top:1px solid #ececf1;padding-top:22px"></div>
    <p class="mut" style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#8a8a98"><a href="${esc(SITE())}/#/app" class="dk" style="color:${INK};font-weight:600;text-decoration:none">Studix öffnen</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html#datenschutz" style="color:#8a8a98;text-decoration:none">Datenschutz</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html#agb" style="color:#8a8a98;text-decoration:none">AGB</a> &nbsp;·&nbsp; <a href="${esc(SITE())}/legal.html" style="color:#8a8a98;text-decoration:none">Kontakt</a></p>
    <p class="mut" style="margin:0;font-size:12px;line-height:1.6;color:#a0a0ad">Studix – die Lern-App für Schule und Studium.<br>Diese E-Mail wurde automatisch verschickt, bitte antworte nicht direkt darauf.</p>
  </td></tr>
</table></td></tr></table></body></html>`;

/* ---------- Vorlagen: { subject, html, text } ---------- */
const P = t => `<p style="margin:0 0 14px">${t}</p>`;
const templates = {
  /* E-Mail-Adresse bestätigen (bei Supabase: {{ .ConfirmationURL }}) */
  verify: ({ name, url, code, codeHtml }) => ({
    subject: "Bestätige deine E-Mail-Adresse",
    html: layout({ badge: "Konto", title: `Nur noch ein Klick${name ? ", " + name : ""}.`, lead: "Gib den Code in Studix ein oder klicke auf den Button – dann ist dein Konto startklar.", preheader: code ? `Dein Code: ${code}` : "Bestätige deine E-Mail-Adresse für Studix.",
      code, codeHtml, cta: ["E-Mail bestätigen", url], note: "Du hast dich nicht bei Studix registriert? Dann kannst du diese Nachricht einfach ignorieren." }),
    text: `Bestätige deine E-Mail-Adresse für Studix.${code ? " Dein Code: " + code + "." : ""} Link: ${url}`,
  }),
  /* Passwort zurücksetzen (bei Supabase: {{ .ConfirmationURL }}) */
  reset: ({ url }) => ({
    subject: "Passwort zurücksetzen",
    html: layout({ badge: "Sicherheit", title: "Neues Passwort festlegen.", lead: "Wir haben eine Anfrage erhalten, das Passwort deines Studix-Kontos zurückzusetzen.", preheader: "Setze dein Studix-Passwort zurück.",
      body: P("Klicke auf den Button und wähle ein neues Passwort. Der Link ist aus Sicherheitsgründen nur kurze Zeit gültig."), cta: ["Passwort zurücksetzen", url], note: "Du hast das nicht angefordert? Dann ist alles in Ordnung – dein Passwort bleibt unverändert und du musst nichts tun." }),
    text: `Passwort für Studix zurücksetzen: ${url}`,
  }),
  /* Anmelden per Link (bei Supabase: {{ .ConfirmationURL }}) */
  magic: ({ url, code, codeHtml }) => ({
    subject: "Dein Anmelde-Link für Studix",
    html: layout({ badge: "Anmeldung", title: "Dein Link zum Anmelden.", lead: "Ein Klick, und du bist in Studix – ganz ohne Passwort.", preheader: "Dein Anmelde-Link für Studix.",
      body: P("Dieser Link funktioniert nur einmal und nur kurze Zeit."), code, codeHtml, cta: ["Jetzt anmelden", url], note: "Du hast dich nicht angemeldet? Dann ignoriere diese Nachricht." }),
    text: `Anmelden bei Studix: ${url}`,
  }),
  /* neue E-Mail-Adresse bestätigen (bei Supabase: {{ .ConfirmationURL }}) */
  change: ({ url, email }) => ({
    subject: "Bestätige deine neue E-Mail-Adresse",
    html: layout({ badge: "Konto", title: "Neue E-Mail-Adresse bestätigen.", lead: "Du möchtest die E-Mail-Adresse deines Studix-Kontos ändern.", preheader: "Bestätige deine neue E-Mail-Adresse.",
      body: P("Bestätige die Änderung mit einem Klick."), details: email ? [["Neue Adresse", email]] : [], cta: ["Änderung bestätigen", url], note: "Du hast das nicht selbst gemacht? Ändere bitte sofort dein Passwort." }),
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

module.exports = { sendMail, templates, layout, esc, supabaseCode };
