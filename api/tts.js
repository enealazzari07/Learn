/* Studix Voice – Sprachausgabe mit Google Gemini TTS (natürliche, mehrsprachige Stimmen, im kostenlosen Gemini-Kontingent).
   POST { text, voice } → { wav: base64 } (24 kHz, mono). Vercel: GEMINI_API_KEY; optional GEMINI_TTS_MODEL (Standard gemini-2.5-flash-preview-tts). */
const L = require("./_lib");
const VOICES = ["Kore", "Aoede", "Zephyr", "Leda", "Puck", "Charon", "Fenrir", "Orus"];
const wav = (pcm, rate = 24000) => { const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!L.sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  const key = process.env.GEMINI_API_KEY; if (!key) return res.status(503).json({ error: "Sprachausgabe ist nicht eingerichtet (GEMINI_API_KEY fehlt)." });
  try {
    const g = await L.aiGate(req); if (g.deny) return res.status(g.deny[0]).json(g.deny[1]);
    const pd = await L.proFeatureDeny(g.acct, "Die Sprachausgabe"); if (pd) return res.status(pd[0]).json(pd[1]);
    const body = await L.readJson(req), text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 700), voice = VOICES.includes(body.voice) ? body.voice : "Kore";
    if (!text) return res.status(400).json({ error: "Kein Text." });
    const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts", ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 25000);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Sprich ruhig, freundlich und natürlich wie ein Mensch im Gespräch: " + text }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    }).finally(() => clearTimeout(tm));
    const j = await r.json().catch(() => ({}));
    const part = (j.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
    if (!r.ok || !part) return res.status(r.status === 429 ? 429 : 502).json({ error: j.error?.message || "Die Stimme ist gerade nicht verfügbar.", fallback: true });
    if (g.acct.free) await L.aiAdd(g.acct.id, Math.ceil(text.length * 0.17));   // Sprachausgabe zählt gering gegen das Gratis-Budget
    return res.status(200).json({ wav: wav(Buffer.from(part.inlineData.data, "base64")).toString("base64"), voice });
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : (e.status && e.status < 600 ? e.status : 502)).json({ error: e.name === "AbortError" ? "Zeitüberschreitung bei der Sprachausgabe." : e.message, fallback: true }); }
};
