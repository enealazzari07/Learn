"use strict";
/* Studix Workspaces: gemeinsame Bereiche mit Mitgliedern, Rollen (Admin/Mitglied), Ordnern und gemeinsam bearbeiteten Dokumenten.
   Alle Daten liegen in Supabase (supabase/workspace.sql) und werden nur über Funktionen gelesen/geschrieben, die Mitgliedschaft und Rolle prüfen.
   Dokumente sind geteilte Notizen (wie „Zusammenarbeiten“): jedes Mitglied öffnet sie im normalen Editor und schreibt live mit. */

(() => { const m = (location.hash.match(/wsjoin\/([0-9a-f]{10})/) || [])[1]; if (m) { try { LS.set("ws-pending", m); } catch {} } })();   // Code merken, falls erst noch angemeldet werden muss

const WS_TEAM = '<circle cx="9" cy="9" r="3.4"/><path d="M3.5 19.2c.4-3.1 2.7-5 5.5-5s5.1 1.9 5.5 5"/><circle cx="17" cy="9.8" r="2.6"/><path d="M16.2 14.5c2.4-.2 4.3 1.4 4.8 4"/>';
SDK.adduser = '<circle cx="10" cy="8.5" r="3.6"/><path d="M3.8 19.3c.5-3.2 3-5.2 6.2-5.2s5.7 2 6.2 5.2M18 8v5M15.5 10.5h5"/>'; SDK.more = '<path d="M6 12h.01M12 12h.01M18 12h.01"/>';
P.team = WS_TEAM; P["team-f"] = '<g stroke-width="2.7">' + WS_TEAM + '</g>';

const wsRpc = async (fn, args = {}) => {
  if (!CLOUD.sb || !CLOUD.user) throw new Error("login required");
  const { data, error } = await CLOUD.sb.rpc(fn, args); if (error) throw error; return data;
};
const wsMsg = e => { const t = String(e?.message || e || ""); return /login required/.test(t) ? "Bitte melde dich an." : /invalid code/.test(t) ? "Diesen Code gibt es nicht." : /no access/.test(t) ? "Kein Zugriff auf diesen Workspace." : /admin only/.test(t) ? "Das dürfen nur Admins." : /last admin/.test(t) ? "Es muss mindestens ein Admin bleiben." : /workspace limit/.test(t) ? "Du hast schon 20 Workspaces." : t || "Fehler"; };
const wsWho = () => (D.profile.name || (CLOUD.user?.email || "Gast").split("@")[0]).trim();
const wsLink = c => location.origin + location.pathname + "#/app/wsjoin/" + c;
const wsIni = n => (String(n).trim()[0] || "?").toUpperCase();
const wsCol = n => CO_COL[[...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % CO_COL.length];
const wsGate = (m, text) => { m.innerHTML = `<div class="page"><div class="emptybox"><div class="big-ic">${ic("team")}</div><h3>Workspace</h3><p>${esc(text)}</p><button class="btn primary" id="ws-login">Anmelden</button></div></div>`; $("#ws-login", m).onclick = () => cloudLoginModal(); };

/* ---------- Übersicht ---------- */
async function wsHome(m) {
  if (!CLOUD.user) return wsGate(m, "Melde dich an, um gemeinsame Workspaces zu erstellen oder einem beizutreten.");
  const pend = (() => { try { return LS.get("ws-pending"); } catch { return ""; } })();
  if (pend) { try { LS.set("ws-pending", ""); const id = await wsRpc("lumi_ws_join", { p_code: pend, p_who: wsWho() }); toast("Du bist dem Workspace beigetreten"); return go("workspace/" + id); } catch (e) { toast(wsMsg(e)); } }
  m.innerHTML = `<div class="ned dfull docsed">${pageHead("<b>Workspace</b>", `${dkAct("adduser", "Mit Code beitreten", 'id="ws-join"')}<i class="sdk-sep" aria-hidden="true"></i>${dkAct("plus", "Neuer Workspace", 'id="ws-new"')}`)}
    <article class="ned-paper docspaper" id="paperc"><div class="dmain"><div class="emptybox"><h3>Wird geladen …</h3></div></div></article></div>`;
  setScroller($("#paperc", m));
  const draw = async () => {
    let list = []; try { list = await wsRpc("lumi_ws_list"); } catch (e) { $(".dmain", m).innerHTML = `<div class="emptybox"><h3>${esc(wsMsg(e))}</h3></div>`; return; }
    const box = $(".dmain", m); if (!box) return;
    box.innerHTML = list.length ? `<div class="dtl"><h3 class="dsec">Deine Workspaces<small>${list.length}</small></h3><div class="ws-grid">${list.map(w => `<button class="ws-card" data-w="${w.id}"><span class="ws-ic">${ic("team")}</span><b>${esc(w.name)}</b><small>${w.members} ${w.members === 1 ? "Mitglied" : "Mitglieder"} · ${w.role === "admin" ? "Admin" : "Mitglied"}</small></button>`).join("")}</div></div>`
      : `<div class="emptybox"><div class="big-ic">${ic("team")}</div><h3>Noch kein Workspace</h3><p>Erstelle einen Workspace und lade andere ein. Alle Mitglieder arbeiten dort gemeinsam in Ordnern und Dokumenten.</p><div class="row" style="justify-content:center;gap:10px"><button class="btn primary" id="ws-new2">Workspace erstellen</button><button class="btn ghost" id="ws-join2">Mit Code beitreten</button></div></div>`;
    $$("[data-w]", box).forEach(b => b.onclick = () => go("workspace/" + b.dataset.w));
    $("#ws-new2", box)?.addEventListener("click", wsNew); $("#ws-join2", box)?.addEventListener("click", wsJoin);
  };
  const wsNew = async () => { const n = await ask("Neuer Workspace", { placeholder: "z. B. Lerngruppe Mathe", ok: "Erstellen" }); if (!n || !n.trim()) return; try { const id = await wsRpc("lumi_ws_create", { p_name: n.trim(), p_who: wsWho() }); go("workspace/" + id); } catch (e) { toast(wsMsg(e)); } };
  const wsJoin = async () => { const c = await ask("Mit Code beitreten", { placeholder: "Einladungscode", ok: "Beitreten" }); if (!c || !c.trim()) return; const code = (c.trim().match(/[0-9a-f]{10}/i) || [c.trim()])[0]; try { const id = await wsRpc("lumi_ws_join", { p_code: code, p_who: wsWho() }); toast("Du bist dem Workspace beigetreten"); go("workspace/" + id); } catch (e) { toast(wsMsg(e)); } };
  $("#ws-new", m).onclick = wsNew; $("#ws-join", m).onclick = wsJoin;
  await draw();
}

/* ---------- Einladungslink ---------- */
V.wsjoin = async (m, code) => {
  m.innerHTML = `<div class="page"><div class="emptybox"><h3>Einladung wird geöffnet …</h3></div></div>`;
  if (!CLOUD.user) return wsGate(m, "Bitte melde dich an, um dem Workspace beizutreten.");
  if (teamPending()) { try { await plusLoad(false); } catch {} } if (teamLocked()) return wsPaywall(m);
  try { try { LS.set("ws-pending", ""); } catch {} const id = await wsRpc("lumi_ws_join", { p_code: String(code || ""), p_who: wsWho() }); toast("Du bist dem Workspace beigetreten"); location.replace("#/app/workspace/" + id); }
  catch (e) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>${esc(wsMsg(e))}</h3><button class="btn" onclick="location.hash='#/app/workspace'">Zu den Workspaces</button></div></div>`; }
};

/* ---------- Workspace öffnen ---------- */
const wsPaywall = m => { m.innerHTML = `<div class="page"><div class="emptybox"><div class="big-ic">${ic("team")}</div><h3>Workspace</h3><p>Gemeinsame Workspaces und das Bearbeiten von Dateien in Echtzeit gibt es mit Studix Essential und Studix Study Pro – nicht im Gratis-Konto.${esc(teamHint())}</p><button class="btn primary" id="ws-up">Pläne ansehen</button></div></div>`; $("#ws-up", m).onclick = () => { window.__setTab = "pro"; go("settings"); }; };
V.workspace = async (m, id, fid = "") => { if (teamPending()) { try { await plusLoad(false); } catch {} } return teamLocked() ? wsPaywall(m) : id ? wsOpen(m, id, fid) : wsHome(m); };

async function wsOpen(m, wid, fid) {
  if (!CLOUD.user) return wsGate(m, "Melde dich an, um diesen Workspace zu öffnen.");
  let W = null, busy = false, dead = false, sig = "";
  LEAVE.push(() => { dead = true; });
  const folderOf = id => W.folders.find(f => f.id === id), kids = p => W.folders.filter(f => (f.parent || "") === (p || ""));
  const pathOf = id => { const out = []; let f = folderOf(id); while (f) { out.unshift(f); f = folderOf(f.parent); } return out; };
  const nameOf = uid_ => (W.members.find(x => x.user_id === uid_) || {}).name || "Mitglied";
  const isAdmin = () => W.role === "admin";
  const load = async () => {
    const w = await wsRpc("lumi_ws_get", { p_ws: wid });
    /* Titel geteilter Dokumente, die du lokal umbenannt hast, in den Workspace übernehmen */
    (w.items || []).forEach(it => { const d = D.docs.find(x => x.share === it.share_id); if (d && d.title && d.title !== it.title) { it.title = d.title; wsRpc("lumi_ws_item_update", { p_ws: wid, p_id: it.id, p_title: d.title, p_folder: null, p_move: false }).catch(() => {}); } });
    return w;
  };
  try { W = await load(); } catch (e) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>${esc(wsMsg(e))}</h3><button class="btn" onclick="location.hash='#/app/workspace'">Zu den Workspaces</button></div></div>`; return; }
  if (fid && !folderOf(fid)) fid = "";
  const draw = () => {
    if (dead) return;
    const path = pathOf(fid), folders = kids(fid), items = W.items.filter(i => (i.folder_id || "") === (fid || ""));
    const crumbHtml = `<button class="cr" data-gows="">Workspace</button><i>/</i>` + (path.length ? `<button class="cr" data-gows="${wid}">${esc(W.name)}</button>` : `<b>${esc(W.name)}</b>`) + path.map((f, i) => `<i>/</i>${i === path.length - 1 ? `<b>${esc(f.name)}</b>` : `<button class="cr" data-gows="${wid}/${f.id}">${esc(f.name)}</button>`}`).join("");
    const av = W.members.slice(0, 4).map(p => `<i style="background:${wsCol(p.user_id)}" title="${esc(p.name)}">${esc(wsIni(p.name))}</i>`).join("") + (W.members.length > 4 ? `<i class="more">+${W.members.length - 4}</i>` : "");
    m.innerHTML = `<div class="ned dfull docsed" id="ws-root">${pageHead(crumbHtml, `<button type="button" class="ws-av" id="ws-mem" title="Mitglieder" aria-label="Mitglieder">${av}</button>${dkAct("adduser", "Einladen", 'id="ws-inv"')}${dkAct("more", "Mehr", 'id="ws-more"')}<i class="sdk-sep" aria-hidden="true"></i>${dkAct("plus", "Neu", 'id="ws-nw"')}`)}
      <article class="ned-paper docspaper" id="paperc"><div class="dmain">
      ${folders.length || items.length ? `${folders.length ? `<div class="dtop"><div class="dtl"><h3 class="dsec">Ordner<small>${folders.length}</small></h3><div class="items fgrid">${folders.map(f => { const n = W.items.filter(i => i.folder_id === f.id).length; return `<div class="fold" data-f="${f.id}" style="--c:${esc(f.color)}" tabindex="0"><div class="f3d">${folderSvg(f.color)}<span class="fico">${sji(sjiOf(f))}</span><div class="ftxt"><b>${esc(f.name)}</b><small>${n} ${n === 1 ? "Datei" : "Dateien"}</small></div></div><button class="dmore on" data-fm="${f.id}" aria-label="Mehr">${ic("more")}</button></div>`; }).join("")}</div></div></div>` : ""}
      ${items.length ? `<section class="dlist"><h3 class="dsec">Dokumente<small>${items.length}</small></h3><div class="dtab" role="table"><div class="dth" role="row"><span>Name</span><span>Typ</span><span>Erstellt von</span><span>Erstellt</span><span></span></div>${items.map(it => `<div class="dtr" role="row" data-i="${it.id}" tabindex="0"><span class="dn"><i class="dk k-note">${ic("note")}</i><b>${esc(it.title || "Unbenannt")}</b></span><span class="dt2"><em class="tag k-note">Notiz</em></span><span class="dsj"><i style="background:${wsCol(it.created_by)}"></i>${esc(nameOf(it.created_by))}</span><span class="dd">${fmtAgo(new Date(it.created_at).getTime())}</span><span class="da"><button class="dmore" data-im="${it.id}" aria-label="Mehr">${ic("more")}</button></span></div>`).join("")}</div></section>` : ""}`
      : `<div class="emptybox"><div class="big-ic">${ic("folder")}</div><h3>${path.length ? "Dieser Ordner ist leer" : "Noch nichts hier"}</h3><p>Lege Ordner und Dokumente an – alle Mitglieder sehen und bearbeiten sie gemeinsam.</p><div class="row" style="justify-content:center;gap:10px"><button class="btn primary" id="ws-d2">Neues Dokument</button><button class="btn ghost" id="ws-f2">Neuer Ordner</button></div></div>`}
      </div></article></div>`;
    setScroller($("#paperc", m));
    bind();
  };
  const refresh = async () => { if (dead) return; try { W = await load(); const s = JSON.stringify([W.name, W.members, W.folders, W.items]); if (s !== sig) { sig = s; if (!busy) draw(); } } catch (e) { if (/no access/.test(String(e.message))) { toast("Du bist nicht mehr in diesem Workspace"); go("workspace"); } } };
  const act = async (fn, okMsg) => { busy = true; try { await fn(); if (okMsg) toast(okMsg); W = await load(); sig = JSON.stringify([W.name, W.members, W.folders, W.items]); } catch (e) { toast(wsMsg(e)); } busy = false; draw(); };

  const newDoc = async () => {
    const t = await ask("Neues Dokument", { placeholder: "Titel", ok: "Erstellen" }); if (t == null) return; const title = t.trim() || "Unbenanntes Dokument";
    busy = true;
    try {
      const share = await wsRpc("lumi_share_create", { p_title: title, p_html: "", p_tb: [], p_ink: [] });
      await wsRpc("lumi_ws_item_add", { p_ws: wid, p_folder: fid || null, p_share: share, p_title: title });
      const nid = uid(); D.docs.unshift({ id: nid, type: "note", title, subjectId: "", folderId: "", paper: D.profile.paper || "white", share, shareOwner: true, shareRev: 0, updated: Date.now(), created: Date.now(), text: "" });
      await KV.set("html:" + nid, ""); await KV.set("tb:" + nid, []); save(); busy = false; go("doc/" + nid);
    } catch (e) { busy = false; toast(wsMsg(e)); }
  };
  const newFolder = async (parent = fid) => { const n = await ask("Neuer Ordner", { placeholder: "Name", ok: "Erstellen" }); if (!n || !n.trim()) return; act(() => wsRpc("lumi_ws_folder_save", { p_ws: wid, p_id: null, p_parent: parent || null, p_name: n.trim(), p_color: COLORS[W.folders.length % COLORS.length], p_icon: "" })); };
  const openItem = it => { const ex = D.docs.find(x => x.share === it.share_id); if (ex) go("doc/" + ex.id); else V.join(m, it.share_id); };

  const folderMenu = (btn, f) => menu(btn, [
    { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Ordner umbenennen", { value: f.name }); if (n?.trim()) act(() => wsRpc("lumi_ws_folder_save", { p_ws: wid, p_id: f.id, p_parent: null, p_name: n.trim(), p_color: null, p_icon: null })); } },
    { label: "Farbe & Icon", icon: "brush", fn: () => {
      const { el } = modal(`<h3>Farbe & Icon</h3><div class="chips" style="gap:12px">${COLORS.map(c => `<button class="cdot ${c === f.color ? "on" : ""}" data-c="${c}" style="background:${c};width:38px;height:38px"></button>`).join("")}</div><p class="note" style="margin:18px 0 8px">Icon</p><div class="sji-grid">${Object.keys(SJI).map(k => `<button type="button" class="sji-b ${k === sjiOf(f) ? "on" : ""}" data-i="${k}" aria-label="${k}">${sji(k)}</button>`).join("")}</div>`);
      $$("[data-c]", el).forEach(b => b.onclick = () => { f.color = b.dataset.c; $$("[data-c]", el).forEach(x => x.classList.toggle("on", x === b)); wsRpc("lumi_ws_folder_save", { p_ws: wid, p_id: f.id, p_parent: null, p_name: "", p_color: f.color, p_icon: null }).then(() => refresh()).catch(e => toast(wsMsg(e))); });
      $$(".sji-b", el).forEach(b => b.onclick = () => { f.icon = b.dataset.i; $$(".sji-b", el).forEach(x => x.classList.toggle("on", x === b)); wsRpc("lumi_ws_folder_save", { p_ws: wid, p_id: f.id, p_parent: null, p_name: "", p_color: null, p_icon: f.icon }).then(() => refresh()).catch(e => toast(wsMsg(e))); });
    } },
    { label: "Unterordner anlegen", icon: "folder", fn: () => newFolder(f.id) },
    "-",
    { label: "Löschen", icon: "trash", danger: true, fn: async () => { if (await confirmBox("Ordner „" + f.name + "“ mit allen Unterordnern löschen? Die Dokumente darin kommen in den Hauptordner des Workspace.")) act(() => wsRpc("lumi_ws_folder_delete", { p_ws: wid, p_id: f.id })); } },
  ]);
  const itemMenu = (btn, it) => menu(btn, [
    { label: "Öffnen", icon: "file", fn: () => openItem(it) },
    { label: "Umbenennen", icon: "pen", fn: async () => { const n = await ask("Dokument umbenennen", { value: it.title }); if (n?.trim()) { const d = D.docs.find(x => x.share === it.share_id); if (d) { d.title = n.trim(); d.updated = Date.now(); save(); } act(() => wsRpc("lumi_ws_item_update", { p_ws: wid, p_id: it.id, p_title: n.trim(), p_folder: null, p_move: false })); } } },
    { label: "Verschieben …", icon: "folder", fn: () => { const { el, close } = modal(`<h3>Verschieben nach</h3><div class="ws-pick"><button data-t="">Hauptordner</button>${W.folders.map(f => `<button data-t="${f.id}" style="padding-left:${14 + pathOf(f.id).length * 12 - 12}px">${esc(f.name)}</button>`).join("")}</div>`); $$("[data-t]", el).forEach(b => b.onclick = () => { close(); act(() => wsRpc("lumi_ws_item_update", { p_ws: wid, p_id: it.id, p_title: null, p_folder: b.dataset.t || null, p_move: true }), "Verschoben"); }); } },
    "-",
    { label: "Aus Workspace entfernen", icon: "trash", danger: true, fn: async () => { if (await confirmBox("„" + (it.title || "Dokument") + "“ aus dem Workspace entfernen? Mitglieder behalten ihre eigene Kopie.", "Entfernen")) act(() => wsRpc("lumi_ws_item_delete", { p_ws: wid, p_id: it.id })); } },
  ]);

  const inviteModal = () => {
    if (!isAdmin()) return toast("Einladungen können nur Admins verschicken.");
    const { el } = modal(`<h3>Mitglieder einladen</h3><div id="ws-ib"></div>`), box = $("#ws-ib", el);
    const paint = () => { const link = wsLink(W.code); box.innerHTML = `<p class="note">Wer den Link öffnet (angemeldet) oder den Code eingibt, tritt dem Workspace bei und kann alles bearbeiten.</p><div class="co-link"><input class="field" readonly value="${esc(link)}" id="ws-l"><button class="btn primary" id="ws-cp">Kopieren</button></div><p class="note" style="margin-top:12px">Code: <b style="letter-spacing:.06em">${esc(W.code)}</b></p>${navigator.share ? `<button class="btn ghost small" id="ws-sh">Teilen …</button>` : ""}<div class="row end" style="margin-top:14px"><button class="btn ghost" id="ws-nc">Neuen Code erzeugen</button></div><p class="note">Ein neuer Code macht den alten Link ungültig.</p>`;
      $("#ws-cp", box).onclick = async () => { try { await navigator.clipboard.writeText(link); toast("Link kopiert"); } catch { $("#ws-l", box).select(); } };
      $("#ws-sh", box)?.addEventListener("click", () => navigator.share({ title: W.name, url: link }).catch(() => {}));
      $("#ws-nc", box).onclick = async () => { try { W.code = await wsRpc("lumi_ws_new_code", { p_ws: wid }); paint(); toast("Neuer Code erzeugt"); } catch (e) { toast(wsMsg(e)); } };
    }; paint();
  };
  const membersModal = () => {
    const { el, close } = modal(`<h3>Mitglieder</h3><div id="ws-mb"></div>`), box = $("#ws-mb", el);
    const paint = () => {
      box.innerHTML = `<div class="ws-ppl">${W.members.map(p => `<div class="ws-p"><i style="background:${wsCol(p.user_id)}">${esc(wsIni(p.name))}</i><span><b>${esc(p.name || "Mitglied")}${p.user_id === W.me ? " (du)" : ""}</b></span>${isAdmin() && p.user_id !== W.me ? `<select data-r="${p.user_id}" class="field slim"><option value="member" ${p.role === "member" ? "selected" : ""}>Mitglied</option><option value="admin" ${p.role === "admin" ? "selected" : ""}>Admin</option></select><button class="dmore" data-rm="${p.user_id}" aria-label="Entfernen" title="Entfernen">${ic("x")}</button>` : `<em class="tag">${p.role === "admin" ? "Admin" : "Mitglied"}</em>`}</div>`).join("")}</div><div class="row end" style="margin-top:14px"><button class="btn ghost danger" id="ws-leave">Workspace verlassen</button></div>`;
      $$("[data-r]", box).forEach(s => s.onchange = async () => { try { await wsRpc("lumi_ws_set_role", { p_ws: wid, p_user: s.dataset.r, p_role: s.value }); W = await load(); paint(); } catch (e) { toast(wsMsg(e)); paint(); } });
      $$("[data-rm]", box).forEach(b => b.onclick = async () => { if (!await confirmBox("Mitglied entfernen?", "Entfernen")) return; try { await wsRpc("lumi_ws_remove_member", { p_ws: wid, p_user: b.dataset.rm }); W = await load(); paint(); } catch (e) { toast(wsMsg(e)); } });
      $("#ws-leave", box).onclick = async () => { if (!await confirmBox("Workspace verlassen?", "Verlassen")) return; try { await wsRpc("lumi_ws_remove_member", { p_ws: wid, p_user: W.me }); close(); go("workspace"); } catch (e) { toast(wsMsg(e)); } };
    }; paint();
  };
  const moreMenu = btn => menu(btn, [
    { label: "Mitglieder", icon: "team", fn: membersModal },
    isAdmin() && { label: "Workspace umbenennen", icon: "pen", fn: async () => { const n = await ask("Workspace umbenennen", { value: W.name }); if (n?.trim()) act(() => wsRpc("lumi_ws_rename", { p_ws: wid, p_name: n.trim() })); } },
    "-",
    isAdmin() && { label: "Workspace löschen", icon: "trash", danger: true, fn: async () => { if (await confirmBox("Workspace „" + W.name + "“ für alle löschen? Die Dokumente bleiben als Kopien bei den Mitgliedern.", "Löschen")) { try { await wsRpc("lumi_ws_delete", { p_ws: wid }); toast("Workspace gelöscht"); go("workspace"); } catch (e) { toast(wsMsg(e)); } } } },
  ].filter(Boolean));

  function bind() {
    $$("[data-gows]", m).forEach(b => b.onclick = () => go("workspace" + (b.dataset.gows ? "/" + b.dataset.gows : "")));
    $$("[data-f]", m).forEach(c => c.onclick = e => { if (e.target.closest("[data-fm]")) return; go("workspace/" + wid + "/" + c.dataset.f); });
    $$("[data-fm]", m).forEach(b => b.onclick = e => { e.stopPropagation(); folderMenu(b, folderOf(b.dataset.fm)); });
    $$("[data-i]", m).forEach(r => r.onclick = e => { if (e.target.closest("[data-im]")) return; openItem(W.items.find(x => x.id === r.dataset.i)); });
    $$("[data-im]", m).forEach(b => b.onclick = e => { e.stopPropagation(); itemMenu(b, W.items.find(x => x.id === b.dataset.im)); });
    $("#ws-nw", m).onclick = e => menu(e.currentTarget, [{ label: "Neues Dokument", icon: "newnote", fn: newDoc }, { label: "Neuer Ordner", icon: "folder", fn: () => newFolder() }]);
    $("#ws-inv", m).onclick = inviteModal; $("#ws-mem", m).onclick = membersModal; $("#ws-more", m).onclick = e => moreMenu(e.currentTarget);
    $("#ws-d2", m)?.addEventListener("click", newDoc); $("#ws-f2", m)?.addEventListener("click", () => newFolder());
  }
  sig = JSON.stringify([W.name, W.members, W.folders, W.items]); draw();
  const t = setInterval(() => { if (dead || !m.isConnected) return clearInterval(t); refresh(); }, 5000); LEAVE.push(() => clearInterval(t));
}
