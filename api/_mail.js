/* E-Mail-Versand über Resend (https://resend.com). Vercel-Variablen:
   RESEND_API_KEY (Pflicht)  – API-Key aus dem Resend-Dashboard
   MAIL_FROM      (optional) – Absender, z. B. "Studix <hallo@studix.space>" (Domain bei Resend verifizieren). Ohne eigene Domain: "Studix <onboarding@resend.dev>" (liefert nur an die Mail-Adresse deines Resend-Kontos). */
const { Resend } = require("resend");

let client = null;
const resend = () => client || (client = new Resend(process.env.RESEND_API_KEY));
const FROM = () => process.env.MAIL_FROM || "Studix <onboarding@resend.dev>";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const SITE = () => process.env.SITE_URL || "https://studix.space";

/* gemeinsames Layout (nur Inline-CSS, damit es in jedem Mail-Programm gleich aussieht) */
const layout = (title, body, cta) => `<!doctype html><html lang="de"><body style="margin:0;background:#f3f3f7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f0f12">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;padding:32px 28px">
<tr><td style="font-size:22px;font-weight:700;letter-spacing:-.03em;padding-bottom:18px">Studix</td></tr>
<tr><td style="font-size:26px;line-height:1.15;font-weight:700;letter-spacing:-.035em;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="font-size:15.5px;line-height:1.6;color:#3b3b45">${body}</td></tr>
${cta ? `<tr><td style="padding-top:24px"><a href="${esc(cta[1])}" style="display:inline-block;background:#0f0f12;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px">${esc(cta[0])}</a></td></tr>` : ""}
<tr><td style="padding-top:28px;font-size:12px;color:#8a8a98;line-height:1.5">Du erhältst diese Nachricht, weil du ein Konto bei Studix hast.</td></tr>
</table></td></tr></table></body></html>`;

/* Vorlagen: { subject, html, text } */
const templates = {
  welcome: ({ name }) => ({
    subject: "Willkommen bei Studix",
    html: layout(`Willkommen${name ? ", " + name : ""}!`, "<p style=\"margin:0 0 12px\">Schön, dass du da bist. In Studix findest du Notizen, Zeichnen, Karteikarten, Planer und Studix AI an einem Ort – auf iPad, Handy und PC.</p><p style=\"margin:0\">Starte mit deiner ersten Notiz oder lass dir von Studix AI einen Lernplan machen.</p>", ["Studix öffnen", SITE() + "/#/app"]),
    text: `Willkommen${name ? ", " + name : ""}! Schön, dass du da bist. Öffne Studix: ${SITE()}/#/app`,
  }),
  test: ({ name }) => ({
    subject: "Testmail von Studix",
    html: layout("Der Mail-Versand funktioniert", `<p style="margin:0">Hallo${name ? " " + esc(name) : ""}, diese Testmail zeigt, dass Studix E-Mails über Resend verschicken kann.</p>`, ["Studix öffnen", SITE() + "/#/app"]),
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
