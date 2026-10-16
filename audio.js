"use strict";
/* Lumi audio notes: record while you write. Every stroke / sticker made during a recording remembers its moment (s.t in ms, s.a = recording id);
   double-tap such ink with the select or laser tool and the recording jumps to that moment. Recordings live in IndexedDB under "aud:<docId>". */

async function attachAudio(m, d, ink, AUD) {
  const key = "aud:" + d.id; let recs = (await KV.get(key)) || [], mr = null, stream = null, chunks = [], t0 = 0, tick = 0, url = "", sel = recs[recs.length - 1]?.id || "", hidden = !recs.length;
  if (!Array.isArray(recs)) recs = [];
  const bar = document.createElement("div"); bar.className = "aud-bar"; bar.hidden = true; m.appendChild(bar);
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const persist = async () => { try { await KV.set(key, recs); } catch {} };
  const aud = () => bar.querySelector("audio");
  function draw() {
    if (mr) { bar.hidden = false; bar.innerHTML = `<i class="aud-dot"></i><b id="aud-t">0:00</b><button class="btn" data-a="stop">Stopp</button>`; return; }
    if (!recs.length || hidden) { bar.hidden = true; return; }
    const r = recs.find(x => x.id === sel) || recs[recs.length - 1]; sel = r.id;
    if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(r.blob);
    bar.hidden = false;
    bar.innerHTML = `<select aria-label="Aufnahme">${recs.map((x, i) => `<option value="${x.id}"${x.id === sel ? " selected" : ""}>Aufnahme ${i + 1} · ${fmt(x.dur)}</option>`).join("")}</select><audio controls preload="metadata" src="${url}"></audio><button class="tbtn" data-a="del" title="Aufnahme löschen" aria-label="Aufnahme löschen">${ic("trash")}</button><button class="tbtn" data-a="hide" title="Ausblenden" aria-label="Ausblenden">×</button>`;
    bar.querySelector("select").onchange = e => { sel = e.target.value; draw(); };
  }
  bar.addEventListener("click", async e => {
    const b = e.target.closest("[data-a]"); if (!b) return; const a = b.dataset.a;
    if (a === "stop") stop();
    else if (a === "hide") { hidden = true; draw(); }
    else if (a === "del") { if (!await confirmBox("Diese Aufnahme löschen? Die Schrift bleibt erhalten.", "Löschen")) return; recs = recs.filter(x => x.id !== sel); sel = recs[recs.length - 1]?.id || ""; await persist(); draw(); }
  });

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return toast("Aufnahme wird in diesem Browser nicht unterstützt");
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return toast("Mikrofon-Zugriff nicht erlaubt"); }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(t => MediaRecorder.isTypeSupported?.(t)); chunks = [];
    mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); const id = uid();
    mr.ondataavailable = ev => { if (ev.data.size) chunks.push(ev.data); };
    mr.onstop = async () => {
      clearInterval(tick); stream?.getTracks().forEach(t => t.stop()); stream = null; const dur = (Date.now() - t0) / 1000, type = mr?.mimeType || "audio/webm"; mr = null; AUD.id = null; ink.mic(false);
      if (chunks.length && dur > .5) { recs.push({ id, blob: new Blob(chunks, { type }), dur, at: Date.now() }); sel = id; hidden = false; await persist(); toast("Aufnahme gespeichert · Schrift darin ist mit der Aufnahme verknüpft"); }
      draw();
    };
    t0 = Date.now(); AUD.id = id; mr.start(1000); ink.mic(true); draw();
    tick = setInterval(() => { const t = bar.querySelector("#aud-t"); if (t) t.textContent = fmt((Date.now() - t0) / 1000); }, 500);
  }
  function stop() { if (mr && mr.state !== "inactive") mr.stop(); }

  AUD.clock = () => mr ? Date.now() - t0 : null;
  AUD.toggle = () => mr ? stop() : start();
  AUD.seek = (t, id) => {
    if (mr) return toast("Erst die Aufnahme beenden");
    const r = recs.find(x => x.id === id); if (!r) return toast("Zu dieser Schrift gibt es keine Aufnahme mehr");
    sel = id; hidden = false; draw(); const a = aud(); if (!a) return;
    const go = () => { a.currentTime = Math.max(0, t / 1000 - 1); a.play().catch(() => {}); };
    a.readyState >= 1 ? go() : a.addEventListener("loadedmetadata", go, { once: true });
  };
  draw();
  return { destroy() { clearInterval(tick); if (mr && mr.state !== "inactive") { mr.onstop = null; mr.stop(); } stream?.getTracks().forEach(t => t.stop()); if (url) URL.revokeObjectURL(url); bar.remove(); } };
}
