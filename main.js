"use strict";
/* Studix – router, landing page, boot */
const landingEl = $("#landing"), appEl = $("#app");
let onboardShown = false;
const EMBED = /[?&]embed=1/.test(location.search); if (EMBED) document.documentElement.classList.add("embed");

function renderView() {
  LEAVE.splice(0).forEach(f => { try { f(); } catch {} });
  const [, v = "today", x, y] = location.hash.replace(/^#\/?/, "").split("/");
  curView = V[v] ? v : "today";
  buildShell(); const dock = curView === "today"; $("#app").classList.toggle("has-dock", dock); if (!dock) window.__dockFresh = false; refreshNav(); timerPaint();
  const m = $("#main"); m.className = "main"; m.removeAttribute("style"); window.scrollTo(0, 0); m.scrollTop = 0; setScroller(m);
  $("#cpanel") && curView === "ai" && ($("#cpanel").hidden = true);
  try { const r = V[curView](m, x, y); if (r?.catch) r.catch(e => console.error(e)); } catch (e) { console.error(e); m.innerHTML = `<div class="page"><div class="emptybox"><h3>Ups, da ist etwas schiefgelaufen</h3><p>${esc(e.message)}</p><button class="btn" data-go="today">Zur Startseite</button></div></div>`; bindCommon(m); }
}
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  if (EMBED && !h.startsWith("app")) { location.hash = "#/app/today"; return; }
  if (!h.startsWith("app") || (!EMBED && cloudGate())) document.getElementById("hdock")?.remove();   // Chat-Leiste der Startseite nicht auf Landing/Login stehen lassen
  if (!h.startsWith("app")) { landingEl.hidden = false; appEl.hidden = true; document.title = "Studix – Lernen, das funktioniert"; if (!landingEl.dataset.r) renderLanding(); window.scrollTo(0, 0); return; }
  landingEl.hidden = true; appEl.hidden = false; document.title = "Studix";
  if (!EMBED && cloudGate()) return authScreen();
  if (!EMBED && !D.profile.onboarded && !onboardShown) { onboardShown = true; buildShell(); renderView(); onboarding(); return; }
  renderView();
}
addEventListener("hashchange", route);
addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && !e.shiftKey && location.hash.startsWith("#/app")) { e.preventDefault(); go("search"); } else if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && location.hash.startsWith("#/app") && !/^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) && !e.target.isContentEditable) { e.preventDefault(); go("search"); } });

/* ---------- landing ---------- */
function pricingHtml(go) {
  const c = BILL.cfg; if (!c || !c.enabled) return "";
  const eur = v => `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: v % 100 ? 2 : 0, maximumFractionDigits: 2 }).format(v / 100)} ${({ chf: "CHF", eur: "€", usd: "USD" })[(c.currency || "eur").toLowerCase()] || ""}`, li = a => a.map(x => `<li>${ic("check")}${x}</li>`).join("");
  return `<section class="sec" id="pricing"><h2 style="text-align:center;margin-inline:auto">Einfache Preise.</h2><p class="lead" style="text-align:center;margin:10px auto 0">Starte kostenlos – upgrade, wenn du mehr Studix AI willst.</p>
  <div class="plans"><div class="plan"><h3>Gratis</h3><p class="pr"><b>${eur(0)}</b></p><ul>${li(["Notizen, Zeichnen, Dateien", "Karteikarten &amp; Quiz", "Planer, Noten, Fokus-Timer", "Studix AI mit Tageslimit", "Sync auf allen Geräten"])}</ul><a class="btn" ${go}>Kostenlos starten</a></div>
  <div class="plan feat"><span class="pill-l"><b>Pro</b> beliebt</span><h3>Studix Study Pro</h3>${c.monthly ? `<p class="pr"><b>${eur(c.monthly)}</b> / Monat</p>${c.yearly ? `<p class="note">oder ${eur(c.yearly)} / Jahr</p>` : ""}` : `<p class="pr"><b>${eur(c.yearly)}</b> / Jahr</p>`}<ul>${li(["Alles aus Gratis", `${c.trial || 14} Tage kostenlos testen`, "Studix AI ohne Limit", "Neue Pro-Funktionen zuerst", "Jederzeit kündbar"])}</ul><a class="btn accent" ${go}>${c.trial || 14} Tage gratis testen</a></div></div>
  <p class="note" style="text-align:center;margin-top:14px">Preise inkl. gesetzlicher Mehrwertsteuer deines Landes – sie wird beim Bezahlen automatisch berechnet.</p></section>`;
}
const EMBED_TABS = [["Heute", "today", "home"], ["Dokumente", "docs", "folder"], ["Karteikarten", "cards", "cards"], ["Planer", "planner", "cal"], ["Studix AI", "ai", "spark"]];
function mountEmbed(root) {
  const fr = $("iframe", root), box = $(".emb-view", root), tabs = $$(".emb-tab", root), W = 1280, H = 800;
  const fit = () => { const w = box.clientWidth, k = w / W; box.style.height = Math.round(H * k) + "px"; fr.style.transform = `scale(${k})`; };
  new ResizeObserver(fit).observe(box); fit();
  const mark = () => { let v = ""; try { v = (fr.contentWindow.location.hash.replace(/^#\/?/, "").split("/")[1] || "today"); } catch {} tabs.forEach(t => t.classList.toggle("on", t.dataset.v === v || (v === "doc" && t.dataset.v === "docs") || (v === "deck" && t.dataset.v === "cards"))); };
  tabs.forEach(t => t.onclick = () => { try { fr.contentWindow.location.hash = "#/app/" + t.dataset.v; } catch { fr.src = "index.html?embed=1#/app/" + t.dataset.v; } tabs.forEach(x => x.classList.toggle("on", x === t)); });
  fr.addEventListener("load", () => { mark(); try { fr.contentWindow.addEventListener("hashchange", mark); } catch {} });
}
/* Animiertes Gitter (wie Magic UI „AnimatedGridPattern“): Quadrate blenden zufällig auf Gitterfeldern ein und aus */
function mountGrid(hero) {
  const box = $(".agp", hero), emb = $("#emb", hero), N = 30, SZ = 40, NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("width", "100%"); svg.setAttribute("height", "100%");
  svg.innerHTML = `<defs><pattern id="agp-p" width="${SZ}" height="${SZ}" patternUnits="userSpaceOnUse" x="-1" y="-1"><path d="M.5 ${SZ}V.5H${SZ}" fill="none" stroke="currentColor" stroke-opacity=".3"/></pattern></defs><rect width="100%" height="100%" fill="url(#agp-p)"/><g class="agp-sq"></g>`;
  box.appendChild(svg); const g = $(".agp-sq", svg); let cols = 1, rows = 1;
  const place = r => { r.setAttribute("x", Math.floor(Math.random() * cols) * SZ - 1 + 1); r.setAttribute("y", Math.floor(Math.random() * rows) * SZ - 1 + 1); };
  const sqs = Array.from({ length: N }, (_, i) => { const r = document.createElementNS(NS, "rect"); r.setAttribute("width", SZ - 1); r.setAttribute("height", SZ - 1); r.style.animationDelay = (i * .12).toFixed(2) + "s"; r.addEventListener("animationiteration", () => place(r)); g.appendChild(r); return r; });
  const size = () => { const top = emb.offsetTop, h = Math.round(top + emb.offsetHeight / 2); box.style.height = h + "px"; cols = Math.max(1, Math.ceil(box.clientWidth / SZ)); rows = Math.max(1, Math.ceil(h / SZ)); sqs.forEach(place); };
  new ResizeObserver(size).observe(hero); size();
}
function renderLanding() {
  landingEl.dataset.r = 1; const go = 'href="#/app"';
  const FEAT = [
    ["f1", "edit", "Schreiben", "Notizen, Skizzen und Dateien an einem Ort", "Editor mit Überschriften, Tabellen, Formeln – dazu Stift, Marker und Formen im selben Dokument.", `<div class="fm-note"><b></b><i></i><i class="s"></i><u>Studix AI</u><i></i><i class="s"></i></div>`],
    ["f2", "cards", "Lernen", "Karteikarten und Quiz, die hängenbleiben", "Spaced Repetition zeigt dir jede Karte genau dann, wenn du sie fast vergessen hast.", `<div class="fm-cards"><div>Mitochondrien?</div><div>Kraftwerk der Zelle</div><div class="t">18 fällig</div></div>`],
    ["f3", "cal", "Planen", "Stundenplan, Hausaufgaben, Prüfungen", "Alle Termine im Blick – mit Kalender, Erinnerungen und Fokus-Timer.", `<div class="fm-plan">${[["Mathe", "#2563eb", "Morgen"], ["Biologie", "#0e9f6e", "Fr"], ["Englisch", "#ff6a3d", "Mo"]].map(r => `<div><i style="background:${r[1]}"></i><span>${r[0]}</span><small>${r[2]}</small></div>`).join("")}</div>`],
    ["f4 dk", "spark", "Studix AI", "Ein Tutor, der dich nie nervt", "Erklärt Schritt für Schritt, fragt dich ab und kennt deine Unterlagen.", `<div class="fm-chat"><div class="u">Fass das in 5 Punkten zusammen</div><div class="a">Erledigt – 12 Karten im Stapel „Biologie“.</div></div>`],
  ];
  landingEl.innerHTML = `
  <header class="pnav" id="nav"><a class="logo" href="#/"><i class="mark"></i>Studix</a>
    <nav class="pnav-links"><a href="#how">Funktionen</a><a href="#ai">Studix AI</a>${BILL.cfg?.enabled ? '<a href="#pricing">Preise</a>' : ""}<a href="#faq">Fragen</a></nav>
    <div class="pnav-r"><a class="btn accent" ${go}>App öffnen</a><button class="burger" aria-label="Menü" onclick="document.getElementById('nav').classList.toggle('open')">${ic("menu")}</button></div></header>
  <section class="hero3"><div class="agp" aria-hidden="true"></div>
    <h1>Dein ganzes Lernen.<br>Ein Ort.</h1>
    <p class="sub">Notizen, Zeichnungen, Karteikarten, Planer und ein <mark class="hl ul" style="--c:#ff9800">KI-Tutor</mark> – in einer App, die mit dir mitdenkt. Auf iPad, Handy und PC, <span style="white-space:nowrap"><mark class="hl mk" style="--c:#87cefa">auch offline</mark>.</span></p>
    <div class="hero-cta"><a class="btn accent big" ${go}>Kostenlos starten</a><a class="btn light big" href="#how">Funktionen ansehen</a></div>
    <div class="emb" id="emb"><div class="emb-bar"><span class="dots"><i></i><i></i><i></i></span>
      <div class="emb-tabs" role="tablist">${EMBED_TABS.map((t, i) => `<button class="emb-tab ${i ? "" : "on"}" data-v="${t[1]}" role="tab">${ic(t[2])}<span>${t[0]}</span></button>`).join("")}</div>
      <span class="emb-av"><i style="--c:#18a957">L</i><i style="--c:#3b82f6">M</i><i style="--c:#f59e0b">S</i><em>3 online</em></span><span class="emb-url">studix.app</span></div>
      <div class="emb-view"><iframe src="index.html?embed=1#/app/today" title="Studix App" loading="eager"></iframe><div class="emb-live" aria-hidden="true">${[["u1", "#18a957", "Lena"], ["u2", "#3b82f6", "Marc"], ["u3", "#f59e0b", "Sofia"]].map(u => `<div class="cur ${u[0]}" style="--c:${u[1]}"><svg viewBox="0 0 16 20"><path d="M1 1l13 7-6 2-2 7z" fill="currentColor" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><span>${u[2]}</span></div>`).join("")}</div></div></div>
    <p class="emb-hint">Das ist die echte App – klick dich durch.</p>
  </section>
  <section class="sec feat" id="how"><h2>Alles, was du zum Lernen brauchst.</h2>
    <div class="fgrid">${FEAT.map(f => `<article class="fcard ${f[0]}"><div class="fc-t"><span class="ico2">${ic(f[1])}</span><small>${f[2]}</small><h3>${f[3]}</h3><p>${f[4]}</p></div><div class="fc-m">${f[5]}</div></article>`).join("")}</div></section>
  <section class="sec" id="ai"><div class="dark-card"><div><span class="pill-l dk"><b>Studix AI</b> eingebaut</span><h2>Frag, was du willst. Studix hilft.</h2><p class="lead">Zusammenfassungen, Quiz, Erklärungen und Hausaufgaben-Hinweise – direkt in deinen Unterlagen.</p><a class="btn accent" ${go} style="margin-top:26px">Mit dem Tutor sprechen</a></div>
    <div class="chat-demo"><div class="m u">Erkläre mir die Zellatmung wie einem Zehntklässler.</div><div class="m a">Stell dir die Zelle als Kraftwerk vor: Aus Zucker und Sauerstoff entsteht Energie (ATP). Soll ich dich danach abfragen?</div><div class="m u">Ja, und mach Karteikarten daraus.</div><div class="m a">Erledigt – 12 Karten sind in deinem Stapel „Biologie“.</div></div></div>
    <div class="grid3">${[["note", "#5b3df5", "Notiz-Editor", "Formatierung, Tabellen, Formeln, Bilder und Checklisten."], ["brush", "#ff6a3d", "Schreiben und Zeichnen", "Stift, Marker, Formen und Text – auch mit Apple Pencil."], ["cards", "#0e9f6e", "Karteikarten", "Lernen mit Wiederholungs-Algorithmus."], ["help", "#2563eb", "Quiz-Training", "Prüfungsfragen aus deinen Unterlagen."], ["cal", "#8b5cf6", "Planer", "Stundenplan, Aufgaben, Kalender und Prüfungen."], ["award", "#111", "Noten & Fokus", "Notenschnitt, Zielrechner und Pomodoro-Timer."]].map(([i, c, t, d]) => `<div class="card"><div class="ico" style="background:${c}">${ic(i)}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></section>
  ${pricingHtml(go)}
  <section class="sec" id="faq"><h2>Häufige Fragen</h2><div class="faq">${[["Ist Studix kostenlos?", BILL.cfg?.enabled ? "Ja, die Grundfunktionen – Notizen, Karteikarten, Quiz, Planer, Noten – sind kostenlos. Mit Studix Study Pro nutzt du Studix AI ohne Limit." : "Ja. Alle Funktionen sind kostenlos."], ["Wo liegen meine Daten?", "Lokal auf deinem Gerät (auch offline nutzbar). Mit einem Konto werden Notizen, Aufgaben und Karteikarten verschlüsselt übertragen und sind auf allen Geräten gleich. Mit dem Backup-Export nimmst du sie jederzeit mit."], ["Funktioniert es für Schule und Studium?", "Ja – beim Start wählst du Schule oder Studium. Notensysteme (1–6, Punkte, Prozent) und Fächer bzw. Module passen sich an."], ["Kann ich es wie eine App installieren?", "Ja. Im Browser „Zum Home-Bildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge) wählen."], ...(BILL.cfg?.enabled ? [["Wie bezahle ich und wie kündige ich?", "Über Stripe per Karte, Apple Pay, Google Pay oder Link. Die Mehrwertsteuer deines Landes ist im Preis enthalten und wird beim Bezahlen angezeigt. Kündigen kannst du jederzeit in den Einstellungen unter „Studix Study Pro“."]] : [])].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section>
  <section class="cta-final"><h2>Lern klüger, nicht länger.</h2><p style="opacity:.75;margin-top:18px;font-size:19px">In 20 Sekunden eingerichtet. Kostenlos starten.</p><a class="btn" ${go}>App öffnen</a></section>
  <footer><div><a class="logo" href="#/"><i class="mark"></i>Studix</a><p style="margin-top:12px;max-width:260px">Die Lern-App für Schule und Studium.</p></div>${[["App", "Notizen", "Zeichnen", "Karteikarten", "Quiz"], ["Planen", "Stundenplan", "Aufgaben", "Noten", "Fokus-Timer"], ["Rechtliches", ["Impressum", "legal.html#impressum"], ["Datenschutz", "legal.html#datenschutz"], ["AGB", "legal.html#agb"], ["Widerruf", "legal.html#widerruf"]]].map(c => `<div><b>${c[0]}</b>${c.slice(1).map(x => Array.isArray(x) ? `<a href="${x[1]}">${x[0]}</a>` : `<a href="#/app">${x}</a>`).join("")}</div>`).join("")}</footer><div class="copy">© ${new Date().getFullYear()} Studix</div>`;
  mountEmbed($("#emb", landingEl));
  mountGrid($(".hero3", landingEl));
  { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); setTimeout(() => e.target.classList.add("on"), e.target.classList.contains("mk") ? 1300 : 700); } }), { threshold: .6 }); $$(".hl", landingEl).forEach(h => io.observe(h)); }
  $$(".pnav-links a", landingEl).forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));
}

/* ---------- boot ---------- */
(async function () {
  await loadData(); try { migrateFolders(); } catch {}
  try { await cloudInit(); } catch {}
  const cfgP = location.protocol.startsWith("http") ? fetch("/api/config", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.plus) { BILL.cfg = j.plus; try { proApply(); } catch {} }}).catch(() => {}) : Promise.resolve();
  await Promise.race([Promise.all([probeServerAI(), cfgP]), new Promise(r => setTimeout(r, 1800))]);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  plusLoad(false).then(() => { try { aiuLoad().then(() => { try { const h = document.querySelector("#hdock .hd-top"); if (h && !h.querySelector(".aiu")) aiuMount(h, h.querySelector(".hd-x")); } catch {} }); refreshNav(); if (curView === "settings") renderView(); } catch {} }).catch(() => {});   // Abo live aus Stripe, ohne den Start zu verzögern
  route();
  plusReturn();
  try { Object.keys(localStorage).filter(k => /^msal\./.test(k)).forEach(k => localStorage.removeItem(k)); if (D && D.ms) { delete D.ms; save(); } } catch {}   // Reste der früheren Microsoft-Verbindung entfernen
})();
