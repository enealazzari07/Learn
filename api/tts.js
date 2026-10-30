/* Studix Voice – Sprachausgabe mit OpenRouter (HeyGen Voice Turbo, mehrsprachig – Deutsch kommt aus dem deutschen Text).
   POST { text, voice } → { audio: base64 (mp3), mime: "audio/mpeg", voice }.
   Vercel: OPENROUTER_API_KEY; optional OPENROUTER_TTS_MODEL (Standard heygen/heygen-voice-1-turbo:free), OPENROUTER_TTS_VOICE (Standard nadine). */
const L = require("./_lib");
const VOICES = ["nadine", "tabitha", "bram", "gareth", "noelle", "meredith", "sabrina", "lucian", "weston", "vincent"];
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const key = process.env.OPENROUTER_API_KEY; if (!key) return res.status(503).json({ error: "Sprachausgabe ist nicht eingerichtet (OPENROUTER_API_KEY fehlt).", fallback: true });
  try {
    const g = await L.aiGate(req); if (g.deny) return res.status(g.deny[0]).json(g.deny[1]);
    const pd = await L.proFeatureDeny(g.acct, "Die Sprachausgabe"); if (pd) return res.status(pd[0]).json(pd[1]);
    const body = await L.readJson(req), text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 700);
    const dflt = VOICES.includes(process.env.OPENROUTER_TTS_VOICE) ? process.env.OPENROUTER_TTS_VOICE : "nadine", voice = VOICES.includes(body.voice) ? body.voice : dflt;
    if (!text) return res.status(400).json({ error: "Kein Text." });
    const model = process.env.OPENROUTER_TTS_MODEL || "heygen/heygen-voice-1-turbo:free", ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 25000);
    const r = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST", signal: ctl.signal,
      headers: { "content-type": "application/json", authorization: "Bearer " + key, "HTTP-Referer": L.siteUrl(req), "X-Title": "Studix" },
      body: JSON.stringify({ model, input: text, voice, response_format: "mp3" }),
    }).finally(() => clearTimeout(tm));
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      return res.status(r.status === 429 ? 429 : 502).json({ error: j.error?.message || "Die Stimme ist gerade nicht verfügbar.", fallback: true });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    if (!buf.length) return res.status(502).json({ error: "Die Stimme hat kein Audio geliefert.", fallback: true });
    if (g.acct.free) await L.aiAdd(g.acct.id, Math.ceil(text.length * 0.17));   // Sprachausgabe zählt gering gegen das Gratis-Budget
    return res.status(200).json({ audio: buf.toString("base64"), mime: r.headers.get("content-type") || "audio/mpeg", voice });
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : (e.status && e.status < 600 ? e.status : 502)).json({ error: e.name === "AbortError" ? "Zeitüberschreitung bei der Sprachausgabe." : e.message, fallback: true }); }
};
