/* Lumi – Konto & Cloud-Sync (Supabase). Aktiv, sobald supabaseUrl/supabaseKey in config.js stehen. */
const CLOUD = { sb: null, user: null, dirty: new Set(), timer: null, busy: false };
const cloudOn = () => !!(window.LUMI_CONFIG.supabaseUrl && window.LUMI_CONFIG.supabaseKey);
const LS = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const syncable = k => !/^blob:/.test(k);
function loadSupabaseLib() {
  return new Promise((res, rej) => {
    if (window.supabase) return res();
    const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
    s.onload = res; s.onerror = () => rej(new Error("offline")); document.head.appendChild(s);
  });
}
/* jede lokale Änderung wird (entprellt) in die Cloud geschrieben */
(function hookKV() {
  const set = KV.set.bind(KV), del = KV.del.bind(KV);
  KV.set = async (k, v) => { await set(k, v); cloudMark(k); };
  KV.del = async k => { await del(k); cloudMark(k, true); };
  KV._raw = { set, del };
})();
function cloudMark(k, removed) {
  if (!CLOUD.user || !syncable(k)) return;
  CLOUD.dirty.add(JSON.stringify([k, !!removed])); clearTimeout(CLOUD.timer); CLOUD.timer = setTimeout(cloudPush, 1800);
}
async function cloudPush() {
  if (!CLOUD.user || CLOUD.busy || !CLOUD.dirty.size) return; CLOUD.busy = true;
  const items = [...CLOUD.dirty].map(x => JSON.parse(x)); CLOUD.dirty.clear();
  try {
    const up = [], rm = [];
    for (const [k, removed] of items) { if (removed) rm.push(k); else { const v = await KV.get(k); if (v !== undefined) up.push({ user_id: CLOUD.user.id, k, v, updated_at: new Date().toISOString() }); } }
    if (up.length) { const { error } = await CLOUD.sb.from("lumi_kv").upsert(up, { onConflict: "user_id,k" }); if (error) throw error; }
    if (rm.length) { const { error } = await CLOUD.sb.from("lumi_kv").delete().eq("user_id", CLOUD.user.id).in("k", rm); if (error) throw error; }
    LS.set("lumi-sync", String(Date.now())); cloudStatus("ok");
  } catch (e) { items.forEach(i => CLOUD.dirty.add(JSON.stringify(i))); cloudStatus("err"); setTimeout(cloudPush, 15000); }
  CLOUD.busy = false;
}
async function cloudPull() {
  const { data, error } = await CLOUD.sb.from("lumi_kv").select("k,v,updated_at"); if (error) throw error;
  const last = +LS.get("lumi-sync") || 0, localHas = D.profile.onboarded || D.docs.length > 1;
  if (!data.length) { // Cloud leer → lokalen Stand hochladen
    for (const k of await cloudLocalKeys()) CLOUD.dirty.add(JSON.stringify([k, false])); await cloudPush(); return false;
  }
  if (!last && localHas && !confirm("In deinem Konto liegen bereits Daten.\n\nOK = Cloud-Daten laden (lokale Daten dieses Geräts werden ersetzt)\nAbbrechen = lokale Daten hochladen und die Cloud überschreiben")) {
    for (const k of await cloudLocalKeys()) CLOUD.dirty.add(JSON.stringify([k, false])); await cloudPush(); return false;
  }
  const fresh = data.filter(r => !last || new Date(r.updated_at).getTime() > last); if (!fresh.length) return false;
  for (const r of fresh) await KV._raw.set(r.k, r.v);
  LS.set("lumi-sync", String(Date.now())); return true;
}
async function cloudLocalKeys() {
  const db = await KV.open(); if (!db) return ["data"];
  return new Promise(res => { const r = db.transaction("kv").objectStore("kv").getAllKeys(); r.onsuccess = () => res(r.result.filter(syncable)); r.onerror = () => res(["data"]); });
}
async function cloudInit() {
  if (!cloudOn()) return;
  try { await loadSupabaseLib(); } catch { return; }
  CLOUD.sb = window.supabase.createClient(window.LUMI_CONFIG.supabaseUrl, window.LUMI_CONFIG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
  const { data } = await CLOUD.sb.auth.getSession(); CLOUD.user = data.session?.user || null;
  if (CLOUD.user) { try { if (await cloudPull()) { await loadData(); try { migrateFolders(); } catch {} } } catch { cloudStatus("err"); } }
  CLOUD.sb.auth.onAuthStateChange((ev, s) => { const was = CLOUD.user; CLOUD.user = s?.user || null; if (ev === "SIGNED_IN" && !was && CLOUD.user) cloudAfterLogin(); if (ev === "SIGNED_OUT") { BILL.row = null; LS.set("lumi-sync", "0"); $("#app").innerHTML = ""; route(); } });
  addEventListener("online", cloudPush);
}
async function cloudAfterLogin() {
  try { await plusLoad(); } catch {}
  try { if (await cloudPull()) { await loadData(); try { migrateFolders(); } catch {} } } catch { cloudStatus("err"); }
  toast("Angemeldet – Daten werden synchronisiert"); $("#app").innerHTML = ""; route();
}
function cloudStatus() { const e = document.getElementById("cl-st"); if (e) e.textContent = CLOUD.user ? (CLOUD.dirty.size ? "Wird synchronisiert …" : "Synchronisiert") : ""; }
function cloudAuthHtml() {
  return `<label class="lbl">E-Mail</label><input class="field" id="cl-e" type="email" autocomplete="email"><label class="lbl">Passwort</label><input class="field" id="cl-p" type="password" autocomplete="current-password" minlength="6">
    <p class="note" id="cl-m" style="min-height:20px"></p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" id="cl-in">Anmelden</button><button class="btn" id="cl-up">Registrieren</button><button class="link" id="cl-fp" type="button">Passwort vergessen</button></div>`;
}
function cloudAuthBind(el, done) {
  const msg = t => { $("#cl-m", el).textContent = t; }, val = () => [$("#cl-e", el).value.trim(), $("#cl-p", el).value];
  const need = () => { const [e, p] = val(); if (!e || p.length < 6) { msg("E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben."); return null; } return [e, p]; };
  const bi = $("#cl-in", el); if (bi) bi.onclick = async () => { const v = need(); if (!v) return; msg("Anmelden …"); const { error } = await CLOUD.sb.auth.signInWithPassword({ email: v[0], password: v[1] }); if (error) msg(/confirm/i.test(error.message) ? "Bitte bestätige zuerst deine E-Mail." : "Anmeldung fehlgeschlagen – E-Mail oder Passwort falsch."); else done(); };
  const bu = $("#cl-up", el); if (bu) bu.onclick = async () => { const v = need(); if (!v) return; msg("Konto wird erstellt …"); const { data, error } = await CLOUD.sb.auth.signUp({ email: v[0], password: v[1], options: { data: { app: "lumi" }, emailRedirectTo: location.origin + "/" } }); if (error) return msg(error.message); if (data.session) return done(); msg("Anmelden …"); const r = await CLOUD.sb.auth.signInWithPassword({ email: v[0], password: v[1] }); if (r.error) msg(/confirm/i.test(r.error.message) ? "Konto erstellt – bitte melde dich jetzt an." : r.error.message); else done(); };
  const bf = $("#cl-fp", el); if (bf) bf.onclick = async () => { const [e] = val(); if (!e) return msg("Gib oben deine E-Mail ein."); const { error } = await CLOUD.sb.auth.resetPasswordForEmail(e, { redirectTo: location.origin + "/" }); msg(error ? error.message : "E-Mail zum Zurücksetzen ist unterwegs."); };
  $$("input", el).forEach(i => i.addEventListener("keydown", e => { if (e.key === "Enter") ($("#cl-in", el) || $("#cl-up", el)).click(); }));
  setTimeout(() => $("#cl-e", el).focus(), 50);
}
const cloudGate = () => !!(CLOUD.sb && !CLOUD.user);
/* Anmelde-/Registrierseite: Formular links, Foto mit schwebenden Karten rechts */
function authScreen(mode = "in") {
  const app = $("#app"), up = mode === "up", oauth = (window.LUMI_CONFIG.oauth || []).filter(x => x === "google" || x === "apple"); document.title = up ? "Lumi – Konto erstellen" : "Lumi – Anmelden";
  app.innerHTML = `<div class="authwrap"><div class="authshell">
    <form class="authform" onsubmit="return false"><a class="logo authlogo" href="#/"><i class="mark"></i>Lumi</a>
      <div class="authmid"><h1>${up ? "Konto erstellen" : "Willkommen zurück"}</h1><p class="authsub">${up ? "Registriere dich kostenlos – deine Daten sind auf allen Geräten gleich." : "Melde dich an, um dein Dashboard zu öffnen."}</p>
        <label class="lbl" for="cl-e">E-Mail</label><input class="field pill" id="cl-e" type="email" autocomplete="email" placeholder="du@beispiel.ch">
        <label class="lbl" for="cl-p">Passwort</label><div class="pwrap"><input class="field pill" id="cl-p" type="password" autocomplete="${up ? "new-password" : "current-password"}" minlength="6" placeholder="Mindestens 6 Zeichen"><button class="pweye" id="cl-eye" type="button" aria-label="Passwort anzeigen">${ic("eye")}</button></div>
        <p class="note" id="cl-m" style="min-height:20px"></p>
        <button class="btn authgo" id="${up ? "cl-up" : "cl-in"}">${up ? "Kostenlos registrieren" : "Anmelden"}</button>
        ${oauth.length ? `<div class="authoauth">${oauth.map(o => `<button class="btn ghost" type="button" data-o="${o}">${o === "google" ? "Google" : "Apple"}</button>`).join("")}</div>` : ""}
        ${up ? "" : `<button class="link" id="cl-fp" type="button">Passwort vergessen?</button>`}</div>
      <div class="authfoot"><span>${up ? "Schon ein Konto?" : "Noch kein Konto?"} <a href="#" id="cl-sw">${up ? "Anmelden" : "Registrieren"}</a></span><a href="legal.html#agb">AGB &amp; Datenschutz</a></div></form>
    <aside class="authhero" style="--hero:url(login-hero.webp)">
      <div class="ahc ah1"><b>Mathe-Klausur</b><small>in 6 Tagen · 18 Karten fällig</small></div>
      <div class="ahc ah2"><span class="dot">${ic("check")}</span><div><b>Karteikarten erstellt</b><small>aus deinen Notizen</small></div></div>
      <div class="ahc ah3">${ic("spark")}<div><b>Lumi AI</b><small>Erklärt Schritt für Schritt</small></div></div></aside></div></div>`;
  const f = $(".authform", app); cloudAuthBind(f, () => {});
  $("#cl-sw", f).onclick = e => { e.preventDefault(); authScreen(up ? "in" : "up"); };
  $("#cl-eye", f).onclick = () => { const i = $("#cl-p", f); i.type = i.type === "password" ? "text" : "password"; };
  $$("[data-o]", f).forEach(b => b.onclick = async () => { const { error } = await CLOUD.sb.auth.signInWithOAuth({ provider: b.dataset.o, options: { redirectTo: location.origin + "/#/app" } }); if (error) $("#cl-m", f).textContent = error.message; });
}
function cloudLoginModal() {
  if (!cloudOn()) return toast("Cloud ist noch nicht eingerichtet.");
  const { el, close } = modal(`<h3>Konto</h3><p class="note">Melde dich an, damit deine Notizen, Aufgaben und Karteikarten auf allen Geräten da sind.</p>${cloudAuthHtml()}`);
  cloudAuthBind(el, close);
}
async function cloudLogout() { await cloudPush(); await CLOUD.sb.auth.signOut(); CLOUD.user = null; toast("Abgemeldet"); }
function cloudPanelHtml() {
  if (!cloudOn()) return `<div class="panel"><h2>${ic("adduser")}Konto &amp; Cloud</h2><p class="note">Die Cloud ist nicht eingerichtet.</p></div>`;
  return CLOUD.user
    ? `<div class="panel"><h2>${ic("adduser")}Konto &amp; Cloud</h2><div class="msstate ok"><b><i class="ldot on"></i>Angemeldet als ${esc(CLOUD.user.email)}</b><span id="cl-st">Synchronisiert</span></div><div class="row" style="gap:8px"><button class="btn" id="cl-sync">Jetzt synchronisieren</button><button class="btn" id="cl-out">Abmelden</button></div><p class="note">Notizen, Zeichnungen, Aufgaben, Karteikarten und Datenbanken werden gesichert. Hochgeladene PDFs/Dateien bleiben vorerst auf dem Gerät.</p></div>`
    : `<div class="panel"><h2>${ic("adduser")}Konto &amp; Cloud</h2><p class="note">Mit einem Konto sind deine Daten auf iPad, Handy und PC gleich.</p><button class="btn primary" id="cl-login">Anmelden / Registrieren</button></div>`;
}
function cloudBindPanel(m) {
  $("#cl-login", m) && ($("#cl-login", m).onclick = cloudLoginModal);
  $("#cl-out", m) && ($("#cl-out", m).onclick = cloudLogout);
  $("#cl-sync", m) && ($("#cl-sync", m).onclick = async () => { for (const k of await cloudLocalKeys()) CLOUD.dirty.add(JSON.stringify([k, false])); await cloudPush(); toast("Synchronisiert"); });
}
