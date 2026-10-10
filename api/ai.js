/* Lumi AI proxy (Vercel serverless function) – Google Gemini und/oder Groq.
   Vercel → Project Settings → Environment Variables:
     GEMINI_API_KEY  (kostenloser Key: https://aistudio.google.com/apikey)
     GROQ_API_KEY    (kostenloser Key: https://console.groq.com/keys) – sehr schnell, gut für automatische Korrektur
     GEMINI_MODEL    (optional, Standard: gemini-flash-lite-latest)
   Mindestens einer der beiden Keys genügt. Die Keys erreichen nie den Browser. */
const CHAIN = () => [...new Set([process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash-lite"].filter(Boolean))];
const MODEL = () => CHAIN()[0];
/* Wählbare Modelle: id wird vom Browser geschickt */
const MODELS = [
  { id: "gemini-flash-lite-latest", p: "gemini", m: "gemini-flash-lite-latest" },
  { id: "gemini-flash-latest", p: "gemini", m: "gemini-flash-latest" },
  { id: "gemini-pro-latest", p: "gemini", m: "gemini-pro-latest" },
  { id: "groq:llama-3.1-8b-instant", p: "groq", m: "llama-3.1-8b-instant" },
  { id: "groq:llama-3.3-70b-versatile", p: "groq", m: "llama-3.3-70b-versatile" },
  { id: "groq:openai/gpt-oss-120b", p: "groq", m: "openai/gpt-oss-120b" },
];
const have = () => ({ gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY });
const available = () => { const h = have(); return MODELS.filter(x => h[x.p]); };
const sameOrigin = req => { const o = req.headers.origin || req.headers.referer || ""; try { return new URL(o).host === req.headers.host; } catch { return false; } };

/* Quellen: Gemini „Grounding mit Google Suche“ liefert Fundstellen; wir hängen [n]-Marker an die belegten Sätze */
/* Marker dürfen auch in den Text innerhalb von <lumi-actions> (z. B. append_to_note), aber nie mitten in ein JSON-Escape */
const unsafeCut = (buf, pos) => { const tail = buf.subarray(Math.max(0, pos - 6), pos).toString("latin1"); return /\\$/.test(tail) || /\\u[0-9a-fA-F]{0,3}$/.test(tail); };
function withCitations(text, meta) {
  const chunks = meta?.groundingChunks || [], sup = meta?.groundingSupports || [], srcs = [], idx = new Map();
  chunks.forEach((c, i) => { const u = c.web?.uri; if (!u || !/^https?:/.test(u)) return; srcs.push({ n: srcs.length + 1, title: String(c.web.title || "Quelle").slice(0, 80), url: u }); idx.set(i, srcs.length); });
  if (!srcs.length) return { text, sources: [] };
  let buf = Buffer.from(text, "utf8"); const cut = buf.indexOf("<lumi-actions>"), ins = new Map();
  for (const s of sup) { const end = s.segment?.endIndex, ns = [...new Set((s.groundingChunkIndices || []).map(i => idx.get(i)).filter(Boolean))].slice(0, 3); if (end != null && ns.length && !(end > cut && cut >= 0 && end <= cut + 15) && !unsafeCut(buf, end)) ins.set(end, (ins.get(end) || "") + ns.map(n => `[${n}]`).join("")); }
  [...ins.entries()].sort((x, y) => y[0] - x[0]).forEach(([pos, m]) => { buf = Buffer.concat([buf.subarray(0, pos), Buffer.from(" " + m), buf.subarray(pos)]); });
  return { text: buf.toString("utf8"), sources: srcs };
}
async function callGemini(model, key, { system, messages, max, image, signal, sources }) {
  const contents = messages.slice(-24).map((m, i, arr) => {
    const role = m.role === "assistant" ? "model" : "user", parts = [{ text: String(m.content ?? "").slice(0, 80000) || " " }];
    if (image?.data && i === arr.length - 1 && role === "user") parts.unshift({ inlineData: { mimeType: image.type || "image/jpeg", data: String(image.data) } });
    return { role, parts };
  });
  while (contents.length && contents[0].role !== "user") contents.shift();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST", signal, headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: String(system).slice(0, 30000) || "You are a helpful study assistant." }] }, contents, generationConfig: { maxOutputTokens: Math.max(64, Math.min(2048, +max || 1024)), temperature: 0.6 }, ...(sources ? { tools: [{ google_search: {} }] } : {}) }),
  });
  const j = await r.json().catch(() => ({}));
  let text = r.ok ? (j.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("") : "", src = [];
  if (text && sources) { const c = withCitations(text, j.candidates?.[0]?.groundingMetadata); text = c.text; src = c.sources; }
  return { status: r.status, ok: r.ok, text, sources: src, error: j.error?.message, blocked: j.promptFeedback?.blockReason };
}
async function callGroq(model, key, { system, messages, max, temperature = 0.4, signal }) {
  const msgs = [{ role: "system", content: String(system).slice(0, 30000) || "You are a helpful study assistant." }, ...messages.slice(-24).map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.content ?? "").slice(0, 60000) || " " }))];
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", signal, headers: { "content-type": "application/json", authorization: "Bearer " + key },
    body: JSON.stringify({ model, messages: msgs, max_tokens: Math.max(64, Math.min(2048, +max || 1024)), temperature }),
  });
  const j = await r.json().catch(() => ({}));
  let text = r.ok ? String(j.choices?.[0]?.message?.content || "") : "";
  text = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  return { status: r.status, ok: r.ok, text, error: j.error?.message };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const h = have();
  if (req.method === "GET") return res.status(200).json({ ok: true, provider: h.gemini ? "gemini" : "groq", model: h.gemini ? MODEL() : "groq", configured: h.gemini || h.groq, gemini: h.gemini, groq: h.groq, models: available().map(x => x.id) });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!h.gemini && !h.groq) return res.status(503).json({ error: "Weder GEMINI_API_KEY noch GROQ_API_KEY ist in Vercel gesetzt." });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Ungültige Anfrage" }); } }
  const { system = "", messages = [], max = 1024, image = null, model: wanted = "", temperature, sources = false } = body || {};
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "Keine Nachricht" });
  if (JSON.stringify(body).length > 4_500_000) return res.status(413).json({ error: "Anfrage zu groß" });

  /* Reihenfolge: gewünschtes Modell → Rest des Anbieters → anderer Anbieter */
  const want = MODELS.find(x => x.id === wanted && h[x.p]);
  const geminiList = h.gemini ? CHAIN().map(m => ({ id: m, p: "gemini", m })) : [];
  const groqList = h.groq ? MODELS.filter(x => x.p === "groq") : [];
  let cands = [want, ...(want?.p === "groq" ? [...groqList, ...geminiList] : [...geminiList, ...groqList])].filter(Boolean);
  if (image || (sources && h.gemini && want?.p !== "groq")) cands = [...cands.filter(c => c.p === "gemini"), ...(image ? [] : cands.filter(c => c.p !== "gemini"))];   // Bilder und Quellen nur mit Gemini (Quellen: Gemini zuerst)
  const seen = new Set(); cands = cands.filter(c => !seen.has(c.id) && seen.add(c.id));
  if (!cands.length) return res.status(422).json({ error: "Für Bilder wird GEMINI_API_KEY benötigt." });

  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 28000);
  try {
    let last = null;
    for (const c of cands) {
      const args = { system, messages, max, image, sources: !!sources, signal: ctl.signal, temperature: typeof temperature === "number" ? Math.max(0, Math.min(1, temperature)) : undefined };
      const out = c.p === "gemini" ? await callGemini(c.m, process.env.GEMINI_API_KEY, args) : await callGroq(c.m, process.env.GROQ_API_KEY, args);
      last = { ...out, c };
      if (out.ok && out.text) return res.status(200).json({ text: out.text, model: c.id, sources: out.sources || [] });
      if (out.ok && !out.text) continue;                                // leere Antwort → nächstes Modell
      if (![404, 429, 500, 502, 503].includes(out.status)) break;      // echter Fehler (z. B. 400/401) → abbrechen
    }
    const st = last?.status || 502;
    if (last?.ok) return res.status(422).json({ error: last.blocked ? "Die Anfrage wurde von der KI blockiert." : "Leere Antwort der KI." });
    return res.status(st === 429 ? 429 : 502).json({ error: last?.error || `KI-Fehler ${st}` });
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : 502).json({ error: e.name === "AbortError" ? "Zeitüberschreitung bei der KI." : "KI nicht erreichbar." }); }
  finally { clearTimeout(timer); }
};
