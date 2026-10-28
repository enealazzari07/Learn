/* Studix Voice – Spracherkennung für Browser ohne eingebaute Funktion (Firefox, Windows-App). Nutzt Gemini zur Transkription.
   POST { audio: base64, mime } → { text }. Vercel: GEMINI_API_KEY. */
const L = require("./_lib");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const key = process.env.GEMINI_API_KEY; if (!key) return res.status(503).json({ error: "Spracherkennung ist nicht eingerichtet (GEMINI_API_KEY fehlt)." });
  try {
    const g = await L.aiGate(req); if (g.deny) return res.status(g.deny[0]).json(g.deny[1]);
    const body = await L.readJson(req), audio = String(body.audio || ""), mime = /^audio\/(webm|ogg|mp4|wav|mpeg|aac)/.test(body.mime || "") ? body.mime.split(";")[0] : "audio/webm";
    if (!audio || audio.length > 2_800_000) return res.status(413).json({ error: "Aufnahme zu lang oder leer." });
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 20000);
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent", {
      method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Schreibe genau auf, was gesprochen wird (Deutsch, Schweizer Hochdeutsch ohne „ß“). Gib NUR den Text zurück, ohne Kommentar. Ist nichts Verständliches zu hören, gib einen leeren Text zurück." }, { inlineData: { mimeType: mime, data: audio } }] }], generationConfig: { temperature: 0, maxOutputTokens: 400 } }),
    }).finally(() => clearTimeout(tm));
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: j.error?.message || "Spracherkennung fehlgeschlagen." });
    const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("").trim();
    if (g.acct.free) await L.aiAdd(g.acct.id, Math.ceil((j.usageMetadata?.totalTokenCount || 150) / 10));
    return res.status(200).json({ text });
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : (e.status && e.status < 600 ? e.status : 502)).json({ error: e.name === "AbortError" ? "Zeitüberschreitung." : e.message }); }
};
