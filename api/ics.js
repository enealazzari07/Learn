/* Kalender-Abo (ICS) für Lumi: lädt eine öffentliche Kalender-Adresse (z. B. Apple „Öffentlicher Kalender“, webcal://…) serverseitig,
   weil Browser Kalender-Server wegen CORS nicht direkt lesen dürfen. Nur https, keine internen Adressen, max. 5 MB, nur lesend. */
const sameOrigin = req => { const o = req.headers.origin || req.headers.referer || ""; try { return new URL(o).host === req.headers.host; } catch { return false; } };
const blocked = h => !h || h === "localhost" || /\.(local|internal|localdomain|lan|home)$/i.test(h) || /^[\d.]+$/.test(h) || h.includes(":") || h.startsWith("[");
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  if (!sameOrigin(req)) return res.status(403).json({ error: "Forbidden" });
  let u = String(req.query.url || "").trim().replace(/^webcal:/i, "https:"), url;
  try { url = new URL(u); } catch { return res.status(400).json({ error: "Ungültige Adresse" }); }
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
  try {
    let r = null;
    for (let hop = 0; hop < 4; hop++) {
      if (url.protocol !== "https:" || blocked(url.hostname) || (url.port && url.port !== "443")) return res.status(400).json({ error: "Nur öffentliche https-Kalenderadressen sind erlaubt" });
      r = await fetch(url, { redirect: "manual", signal: ctl.signal, headers: { "user-agent": "Lumi-Kalender/1.0", accept: "text/calendar, text/plain, */*" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = new URL(r.headers.get("location"), url); continue; }
      break;
    }
    if (!r || !r.ok) return res.status(502).json({ error: `Kalender nicht erreichbar (${r ? r.status : "?"}). Ist der Kalender als „Öffentlicher Kalender“ freigegeben?` });
    const text = await r.text();
    if (text.length > 5_000_000) return res.status(413).json({ error: "Kalender zu groß" });
    if (!/BEGIN:VCALENDAR/i.test(text)) return res.status(422).json({ error: "Das ist kein Kalender-Link (ICS)" });
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(200).send(text);
  } catch (e) { return res.status(e.name === "AbortError" ? 504 : 502).json({ error: e.name === "AbortError" ? "Zeitüberschreitung beim Laden des Kalenders" : "Kalender nicht erreichbar" }); }
  finally { clearTimeout(timer); }
};
