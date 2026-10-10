"use strict";
/* Lumi Zusammenarbeit: Notiz per Link teilen, gemeinsam schreiben (Supabase Realtime) – Teilnehmer erscheinen neben den drei Punkten.
   Modell: Wer den Link hat und angemeldet ist, kann mitschreiben. Zeichen: letzter Stand gewinnt (Cursor bleibt erhalten). */
const CO_COL = ["#e5484d", "#f59e0b", "#16a34a", "#2563eb", "#7c3aed", "#ec4899"];
const coColor = s => CO_COL[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % CO_COL.length];
const coName = () => (D.profile.name || (CLOUD.user?.email || "Gast").split("@")[0]).trim();
const coLink = id => location.origin + location.pathname + "#/app/join/" + id;
const coIni = n => (String(n).trim()[0] || "?").toUpperCase();

V.join = async (m, id) => {
  m.innerHTML = `<div class="page"><div class="emptybox"><h3>Einladung wird geöffnet …</h3></div></div>`;
  const fail = t => { m.innerHTML = `<div class="page"><div class="emptybox"><h3>${esc(t)}</h3><button class="btn" onclick="location.hash='#/app'">Zur Startseite</button></div></div>`; };
  if (!/^[0-9a-f-]{36}$/i.test(id || "")) return fail("Ungültiger Einladungslink");
  if (!CLOUD.user) return fail("Bitte melde dich an, um der Zusammenarbeit beizutreten");
  const ex = D.docs.find(x => x.share === id); if (ex) return location.replace("#/app/doc/" + ex.id);
  const { data, error } = await CLOUD.sb.rpc("lumi_share_get", { p_id: id }); const row = data && data[0];
  if (error || !row || row.rev < 0) return fail("Diese Einladung gibt es nicht mehr");
  const nid = uid(); D.docs.unshift({ id: nid, type: "note", title: row.title || "Geteilte Notiz", subjectId: "", folderId: docFolder, paper: D.profile.paper || "white", share: id, shareRev: row.rev, updated: Date.now(), created: Date.now(), text: htmlToText(row.html) });
  await KV.set("html:" + nid, row.html || ""); await KV.set("tb:" + nid, row.tb || []); if ((row.ink || []).length) await KV.set("ink:" + nid, row.ink); save();
  toast("Du arbeitest jetzt mit – Änderungen werden live geteilt"); location.replace("#/app/doc/" + nid);
};

function collabAttach({ d, m, body, TBX, ink, dirty, svEl }) {
  const me = { key: uid(), name: coName() }; me.color = coColor(CLOUD.user?.id || me.key);
  const av = $("#co-av", m), btn = $("#co-m", m); let ch = null, peers = {}, lastType = 0, pend = null, tPush = 0, tSave = 0, dead = false;
  const state = () => ({ html: body.innerHTML, tb: TBX.get(), ink: ink.st.strokes });
  const paint = () => {
    const list = Object.values(peers).map(a => a[0]).filter(Boolean);
    av.innerHTML = list.length ? list.slice(0, 4).map(p => `<i style="background:${p.color}" title="${esc(p.name)}">${esc(coIni(p.name))}</i>`).join("") + (list.length > 4 ? `<i class="more">+${list.length - 4}</i>` : "") : "";
    btn.classList.toggle("on", !!d.share); btn.title = d.share ? "Zusammenarbeit" : "Zusammenarbeiten – andere einladen";
  };
  const caretOff = () => { const s = getSelection(); if (document.activeElement !== body || !s.rangeCount || !body.contains(s.anchorNode)) return -1; const r = document.createRange(); r.selectNodeContents(body); r.setEnd(s.anchorNode, s.anchorOffset); return r.toString().length; };
  const setCaret = o => { if (o < 0) return; const w = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let n, acc = 0; while ((n = w.nextNode())) { if (acc + n.length >= o) { const r = document.createRange(); r.setStart(n, o - acc); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return; } acc += n.length; } };
  function apply(p) {
    if (dead || !p) return;
    if (p.html != null && p.html !== body.innerHTML) {
      if (Date.now() - lastType < 1400) { pend = p; return setTimeout(() => { if (pend === p) { pend = null; apply(p); } }, 1500); }
      const o = caretOff(); body.innerHTML = p.html; setCaret(o); dirty();
    }
    if (p.tb && JSON.stringify(p.tb) !== JSON.stringify(TBX.get()) && !document.activeElement?.closest?.(".tbx")) { TBX.load(p.tb); KV.set("tb:" + d.id, p.tb); }
    if (p.ink && JSON.stringify(p.ink) !== JSON.stringify(ink.st.strokes)) { ink.load(p.ink); KV.set("ink:" + d.id, p.ink); }
    if (p.rev) d.shareRev = p.rev; svEl.textContent = "Gespeichert";
  }
  async function pull() { const { data } = await CLOUD.sb.rpc("lumi_share_get", { p_id: d.share }); const r = data && data[0]; if (r && r.rev < 0) { stop(); delete d.share; delete d.shareOwner; save(); paint(); toast("Die Zusammenarbeit wurde beendet"); return; } if (r && r.rev > (d.shareRev || 0)) apply({ html: r.html, tb: r.tb, ink: r.ink, rev: r.rev }); }
  async function persist() { const s = state(); const { data, error } = await CLOUD.sb.rpc("lumi_share_put", { p_id: d.share, p_title: d.title, p_html: s.html, p_tb: s.tb, p_ink: s.ink, p_who: me.name }); if (!error && data) d.shareRev = data; return s; }
  function touch() {
    if (!d.share || !ch) return; lastType = Date.now(); clearTimeout(tPush);
    tPush = setTimeout(async () => { const s = await persist(); const small = JSON.stringify(s).length < 180000; ch.send({ type: "broadcast", event: "doc", payload: small ? { ...s, from: me.key, rev: d.shareRev } : { pull: true, from: me.key } }); }, 650);
  }
  function start() {
    if (!d.share || ch || !CLOUD.sb || !CLOUD.user) return paint();
    ch = CLOUD.sb.channel("lumi-share-" + d.share, { config: { presence: { key: me.key }, broadcast: { self: false } } });
    ch.on("presence", { event: "sync" }, () => { peers = ch.presenceState(); delete peers[me.key]; paint(); })
      .on("broadcast", { event: "doc" }, ({ payload }) => { if (payload?.pull) pull(); else apply(payload); })
      .subscribe(async st => { if (st === "SUBSCRIBED") { await ch.track({ name: me.name, color: me.color }); pull(); } });
    paint();
  }
  const stop = () => { if (ch) { try { ch.untrack(); CLOUD.sb.removeChannel(ch); } catch {} ch = null; } peers = {}; paint(); };
  body.addEventListener("input", touch);
  btn.onclick = () => {
    if (!CLOUD.user) { const { el, close } = modal(`<h3>Zusammenarbeiten</h3><p class="note">Zum gemeinsamen Schreiben melde dich zuerst an – dann kannst du Notizen per Link teilen.</p><div class="row end"><button class="btn primary" id="co-login">Anmelden</button></div>`); $("#co-login", el).onclick = () => { close(); cloudLoginModal(); }; return; }
    const { el, close } = modal(`<h3>Zusammenarbeiten</h3><div id="co-body"></div>`), box = $("#co-body", el);
    const draw = () => {
      if (!d.share) { box.innerHTML = `<p class="note">Teile diese Notiz per Link. Wer den Link hat und angemeldet ist, schreibt live mit – Texte, Textfelder und Zeichnungen. Die Teilnehmenden erscheinen oben neben den drei Punkten.</p><div class="row end"><button class="btn primary" id="co-go">Zusammenarbeit starten</button></div>`;
        $("#co-go", box).onclick = async () => { const s = state(), { data, error } = await CLOUD.sb.rpc("lumi_share_create", { p_title: d.title, p_html: s.html, p_tb: s.tb, p_ink: s.ink }); if (error || !data) return toast("Freigabe nicht möglich: " + (error?.message || "Fehler")); d.share = data; d.shareOwner = true; d.shareRev = 0; save(); start(); draw(); }; return; }
      const others = Object.values(peers).map(a => a[0]).filter(Boolean), link = coLink(d.share);
      box.innerHTML = `<p class="note">Link teilen – wer ihn öffnet (angemeldet), arbeitet mit.</p><div class="co-link"><input class="field" readonly value="${esc(link)}" id="co-l"><button class="btn primary" id="co-cp">Kopieren</button></div>${navigator.share ? `<button class="btn ghost small" id="co-sh">Teilen …</button>` : ""}
        <h4 class="co-h">Dabei</h4><div class="co-ppl"><span><i style="background:${me.color}">${esc(coIni(me.name))}</i>${esc(me.name)} (du)</span>${others.map(p => `<span><i style="background:${p.color}">${esc(coIni(p.name))}</i>${esc(p.name)}<em>online</em></span>`).join("") || `<small class="note">Noch niemand sonst online.</small>`}</div>
        <div class="row end" style="margin-top:14px"><button class="btn ghost danger" id="co-end">${d.shareOwner ? "Zusammenarbeit beenden" : "Verlassen"}</button></div>`;
      $("#co-cp", box).onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link kopiert"); } catch { $("#co-l", box).select(); } };
      $("#co-sh", box)?.addEventListener("click", () => navigator.share({ title: d.title, url: link }).catch(() => {}));
      $("#co-end", box).onclick = async () => { if (!await confirmBox(d.shareOwner ? "Zusammenarbeit beenden? Andere können dann nicht mehr mitschreiben, deine Notiz bleibt erhalten." : "Zusammenarbeit verlassen? Deine Kopie bleibt erhalten.", "Ja")) return; if (d.shareOwner) await CLOUD.sb.rpc("lumi_share_stop", { p_id: d.share }); stop(); delete d.share; delete d.shareOwner; save(); paint(); draw(); };
    };
    draw(); const t = setInterval(() => { if (!el.isConnected) return clearInterval(t); if (d.share) draw(); }, 4000);
  };
  window.__co = { touch };
  start(); paint();
  return { touch, destroy() { dead = true; clearTimeout(tPush); if (d.share && ch) persist().catch(() => {}); stop(); if (window.__co && window.__co.touch === touch) window.__co = null; } };
}
