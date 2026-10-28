/* Erzeugt aus api/_mail.js die fertigen HTML-Dateien:
   - supabase/email-templates/*.html  → in Supabase unter Authentication → Emails → Templates einfügen (nutzen {{ .ConfirmationURL }})
   - docs/email-preview.html          → Vorschau aller E-Mails im Browser öffnen
   Aufruf: node scripts/build-emails.js */
const fs = require("fs"), path = require("path"), M = require("../api/_mail.js");
const root = path.join(__dirname, ".."), T = M.templates;

const supa = {
  "confirm-signup": ["Bestätige deine E-Mail-Adresse", T.verify({ url: "{{ .ConfirmationURL }}", codeHtml: M.supabaseCode, code: "{{ .Token }}" })],
  "reset-password": ["Passwort zurücksetzen", T.reset({ url: "{{ .ConfirmationURL }}" })],
  "magic-link": ["Dein Anmelde-Link für Studix", T.magic({ url: "{{ .ConfirmationURL }}", codeHtml: M.supabaseCode, code: "{{ .Token }}" })],
  "change-email": ["Bestätige deine neue E-Mail-Adresse", T.change({ url: "{{ .ConfirmationURL }}", email: "{{ .NewEmail }}" })],
};
fs.mkdirSync(path.join(root, "supabase/email-templates"), { recursive: true });
for (const [f, [, t]] of Object.entries(supa)) fs.writeFileSync(path.join(root, "supabase/email-templates", f + ".html"), t.html);

const demo = { code: "482917", name: "Alex", url: "https://studix.space/#/app", email: "alex@beispiel.ch", price: "6 CHF", interval: "Monat", trialEnd: "11. November 2026", next: "11. November 2026", until: "11. November 2026", days: 3, date: "11. November 2026" };
const list = [["verify", "E-Mail bestätigen"], ["reset", "Passwort zurücksetzen"], ["magic", "Anmelde-Link"], ["change", "Neue E-Mail-Adresse"], ["welcome", "Willkommen"], ["subscription", "Abo abgeschlossen / Testphase"], ["trial_ending", "Testphase endet bald"], ["payment_failed", "Zahlung fehlgeschlagen"], ["cancelled", "Abo gekündigt"], ["test", "Testmail"]];
const attr = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const cards = list.map(([k, label]) => { const t = T[k](demo); return `<section><h2>${label}<small>${t.subject}</small></h2><iframe loading="lazy" srcdoc="${attr(t.html)}" title="${label}"></iframe></section>`; }).join("\n");
fs.writeFileSync(path.join(root, "docs/email-preview.html"), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studix – E-Mail-Vorschau</title>
<style>body{margin:0;background:#f3f3f6;font-family:-apple-system,Helvetica,Arial,sans-serif;color:#0f0f12}header{padding:32px 24px 8px;text-align:center}h1{margin:0;font-size:28px;letter-spacing:-.03em}header p{color:#6b6b78;margin:6px 0 0}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:28px;padding:24px;max-width:1500px;margin:0 auto}section h2{font-size:16px;margin:0 0 10px}section h2 small{display:block;font-weight:500;color:#6b6b78;font-size:13px;margin-top:2px}iframe{width:100%;height:720px;border:0;border-radius:18px;background:#fff;box-shadow:0 0 0 1px rgba(20,20,40,.08),0 10px 40px rgba(20,10,60,.08)}</style></head>
<body><header><h1>Studix – E-Mail-Vorschau</h1><p>Erzeugt mit <code>node scripts/build-emails.js</code> aus <code>api/_mail.js</code></p></header><main>
${cards}
</main></body></html>`);
console.log("fertig:", Object.keys(supa).length, "Supabase-Vorlagen, Vorschau docs/email-preview.html");
