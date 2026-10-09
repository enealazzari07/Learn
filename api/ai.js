/* Lumi AI proxy (Vercel serverless function) – talks to Google Gemini.
   Configure in Vercel → Project Settings → Environment Variables:
     GEMINI_API_KEY  (required, free key from https://aistudio.google.com/apikey)
     GEMINI_MODEL    (optional, default: gemini-flash-lite-latest = cheapest model with a free tier; falls back to other aliases if a model is retired)
   The key never reaches the browser. */
/* Model chain: GEMINI_MODEL first, then Google's self-updating aliases – used when a model was retired (404). */
const CHAIN = () => [...new Set([process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash-lite"].filter(Boolean))];
const MODEL = () => CHAIN()[0];
const sameOrigin = req => { const o = req.headers.origin || req.headers.referer || ""; try { return new URL(o).host === req.headers.host; } catch { return false; } };

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ok: true, provider: "gemini", model: MODEL(), configured: !!process.env.GEMINI_API_KEY });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "GEMINI_API_KEY ist in Vercel nicht gesetzt." });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Ungültige Anfrage" }); } }
  const { system = "", messages = [], max = 1024, image = null } = body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "Keine Nachricht" });
  if (JSON.stringify(body).length > 4_500_000) return res.status(413).json({ error: "Anfrage zu groß" });
  const contents = messages.slice(-24).map((m, i, arr) => {
    const role = m.role === "assistant" ? "model" : "user", parts = [{ text: String(m.content ?? "").slice(0, 80000) || " " }];
    if (image?.data && i === arr.length - 1 && role === "user") parts.unshift({ inlineData: { mimeType: image.type || "image/jpeg", data: String(image.data) } });
    return { role, parts };
  });
  while (contents.length && contents[0].role !== "user") contents.shift();
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 28000);
  try {
    const payload = JSON.stringify({ systemInstruction: { parts: [{ text: String(system).slice(0, 30000) || "You are a helpful study assistant." }] }, contents, generationConfig: { maxOutputTokens: Math.max(64, Math.min(2048, +max || 1024)), temperature: 0.6 } });
    let r, j;
    for (const model of CHAIN()) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", signal: ctl.signal, headers: { "content-type": "application/json", "x-goog-api-key": key }, body: payload });
      j = await r.json().catch(() => ({}));
      if (r.status !== 404) break;
    }
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: j.error?.message || `Gemini ${r.status}` });
    const text = (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("");
    if (!text) return res.status(422).json({ error: j.promptFeedback?.blockReason ? "Die Anfrage wurde von der KI blockiert." : "Leere Antwort der KI." });
    return res.status(200).json({ text });
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : 502).json({ error: e.name === "AbortError" ? "Zeitüberschreitung bei der KI." : "KI nicht erreichbar." }); }
  finally { clearTimeout(timer); }
};
