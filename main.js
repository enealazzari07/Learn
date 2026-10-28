"use strict";
/* Studix – router, landing page, boot */
const landingEl = $("#landing"), appEl = $("#app");
let onboardShown = false;
const EMBED = /[?&]embed=1/.test(location.search); if (EMBED) document.documentElement.classList.add("embed");

/* KI-Dock sitzt bündig unter der Karteikarten-Kachel (dritte Spalte, zweite Reihe); die Kachel ist nur so hoch, dass beides in die Reihe passt */
function fitDock() {
  const p = $("#aipane"), ex = $(".w-rec"), cards = $(".w-cards"); if (!p || !ex || !cards) return;
  if (innerWidth < 901 || p.hidden) { cards.style.height = ""; ["bottom", "right", "width"].forEach(k => p.style.removeProperty(k)); return; }
  const rr = ex.getBoundingClientRect(), cr = cards.getBoundingClientRect(), r = { bottom: rr.bottom, height: rr.height, right: cr.right, width: cr.width }; if (!r.height) return;
  if (!p.classList.contains("open")) p.dataset.h = p.offsetHeight;
  const dh = +p.dataset.h || 172, gap = 12;
  p.style.setProperty("bottom", Math.round(innerHeight - r.bottom) + "px", "important"); p.style.setProperty("right", Math.round(innerWidth - r.right) + "px", "important"); p.style.setProperty("width", Math.round(r.width) + "px", "important");
  cards.style.height = Math.max(110, Math.round(r.height - dh - gap)) + "px";
}
addEventListener("resize", () => { clearTimeout(fitDock.t); fitDock.t = setTimeout(fitDock, 80); });
function renderView() {
  LEAVE.splice(0).forEach(f => { try { f(); } catch {} });
  const [, v = "today", x, y] = location.hash.replace(/^#\/?/, "").split("/");
  curView = V[v] ? v : "today";
  buildShell(); const dock = curView === "today"; $("#app").classList.toggle("has-dock", dock); $(".shell").classList.toggle("with-ai", dock); const ap = $("#aipane"); ap.hidden = !dock; if (!dock) window.__dockFresh = false; if (dock) { mountDock(); requestAnimationFrame(() => { fitDock(); setTimeout(fitDock, 400); setTimeout(fitDock, 1200); }); } else ap.innerHTML = ""; refreshNav(); timerPaint();
  const m = $("#main"); m.className = "main"; m.removeAttribute("style"); window.scrollTo(0, 0); m.scrollTop = 0; setScroller(m);
  $("#cpanel") && curView === "ai" && ($("#cpanel").hidden = true);
  try { const r = V[curView](m, x, y); if (r?.catch) r.catch(e => console.error(e)); } catch (e) { console.error(e); m.innerHTML = `<div class="page"><div class="emptybox"><h3>Ups, da ist etwas schiefgelaufen</h3><p>${esc(e.message)}</p><button class="btn" data-go="today">Zur Startseite</button></div></div>`; bindCommon(m); }
}
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  if (EMBED && !h.startsWith("app")) { location.hash = "#/app/today"; return; }
  if (!h.startsWith("app")) { landingEl.hidden = false; appEl.hidden = true; document.title = "Studix – Lernen, das funktioniert"; if (!landingEl.dataset.r) renderLanding(); window.scrollTo(0, 0); return; }
  landingEl.hidden = true; appEl.hidden = false; document.title = "Studix";
  if (!EMBED && cloudGate()) return authScreen();
  if (!EMBED && !D.profile.onboarded && !onboardShown) { onboardShown = true; buildShell(); renderView(); onboarding(); return; }
  renderView();
}
addEventListener("hashchange", route);
addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && location.hash.startsWith("#/app")) { e.preventDefault(); go("search"); } });

/* ---------- landing ---------- */
const EMBED_TABS = [["Heute", "today", "home"], ["Dokumente", "docs", "folder"], ["Karteikarten", "cards", "cards"], ["Planer", "planner", "cal"], ["Studix AI", "ai", "spark"]];
function mountEmbed(root) {
  const fr = $("iframe", root), box = $(".emb-view", root), tabs = $$(".emb-tab", root), W = 1280, H = 800;
  const fit = () => { const w = box.clientWidth, k = w / W; box.style.height = Math.round(H * k) + "px"; fr.style.transform = `scale(${k})`; };
  new ResizeObserver(fit).observe(box); fit();
  const mark = () => { let v = ""; try { v = (fr.contentWindow.location.hash.replace(/^#\/?/, "").split("/")[1] || "today"); } catch {} tabs.forEach(t => t.classList.toggle("on", t.dataset.v === v || (v === "doc" && t.dataset.v === "docs") || (v === "deck" && t.dataset.v === "cards"))); };
  tabs.forEach(t => t.onclick = () => { try { fr.contentWindow.location.hash = "#/app/" + t.dataset.v; } catch { fr.src = "index.html?embed=1#/app/" + t.dataset.v; } tabs.forEach(x => x.classList.toggle("on", x === t)); });
  fr.addEventListener("load", () => { mark(); try { fr.contentWindow.addEventListener("hashchange", mark); } catch {} });
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
    <nav class="pnav-links"><a href="#how">Funktionen</a><a href="#ai">Studix AI</a><a href="#faq">Fragen</a></nav>
    <div class="pnav-r"><a class="btn accent" ${go}>App öffnen</a><button class="burger" aria-label="Menü" onclick="document.getElementById('nav').classList.toggle('open')">${ic("menu")}</button></div></header>
  <section class="hero3">
    <span class="pill-l"><b>Neu</b> Für Schule & Studium</span>
    <h1>Dein ganzes Lernen.<br>Ein Ort.</h1>
    <p class="sub">Notizen, Zeichnungen, Karteikarten, Planer und ein KI-Tutor – in einer App, die mit dir mitdenkt. Auf iPad, Handy und PC, auch offline.</p>
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
  <section class="sec" id="faq"><h2>Häufige Fragen</h2><div class="faq">${[["Ist Studix kostenlos?", "Ja. Alle Funktionen sind kostenlos. Für die Studix-AI-Funktionen nutzt du optional deinen eigenen Anthropic-API-Key."], ["Wo liegen meine Daten?", "Alles wird lokal auf deinem Gerät gespeichert und funktioniert offline. Mit dem Backup-Export nimmst du deine Daten mit aufs nächste Gerät."], ["Funktioniert es für Schule und Studium?", "Ja – beim Start wählst du Schule oder Studium. Notensysteme (1–6, Punkte, Prozent) und Fächer bzw. Module passen sich an."], ["Kann ich es wie eine App installieren?", "Ja. Im Browser „Zum Home-Bildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge) wählen."]].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section>
  <section class="cta-final"><h2>Lern klüger, nicht länger.</h2><p style="opacity:.75;margin-top:18px;font-size:19px">In 20 Sekunden eingerichtet. Ohne Anmeldung.</p><a class="btn" ${go}>App öffnen</a></section>
  <footer><div><a class="logo" href="#/"><i class="mark"></i>Studix</a><p style="margin-top:12px;max-width:260px">Die Lern-App für Schule und Studium.</p></div>${[["App", "Notizen", "Zeichnen", "Karteikarten", "Quiz"], ["Planen", "Stundenplan", "Aufgaben", "Noten", "Fokus-Timer"], ["Studix", "Studix AI", "Datenschutz", "Kontakt"]].map(c => `<div><b>${c[0]}</b>${c.slice(1).map(x => `<a href="#/app">${x}</a>`).join("")}</div>`).join("")}</footer><div class="copy">© ${new Date().getFullYear()} Studix · Demo-Projekt</div>`;
  mountEmbed($("#emb", landingEl));
  $$(".pnav-links a", landingEl).forEach(a => a.addEventListener("click", () => $("#nav").classList.remove("open")));
}

/* ---------- boot ---------- */
(async function () {
  await loadData(); try { migrateFolders(); } catch {}
  try { await cloudInit(); } catch {}
  /* Microsoft-Client-ID kann in Vercel (MS_CLIENT_ID) statt in config.js stehen */
  const cfgP = location.protocol.startsWith("http") ? fetch("/api/config", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(j => { if (j && j.msClientId && !(window.LUMI_CONFIG.msClientId || "").trim()) { window.LUMI_CONFIG.msClientId = j.msClientId; if (j.msTenant) window.LUMI_CONFIG.msTenant = j.msTenant; } }).catch(() => {}) : Promise.resolve();
  await Promise.race([Promise.all([probeServerAI(), cfgP]), new Promise(r => setTimeout(r, 1800))]);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  route();
  setTimeout(() => { try { msAuto(); } catch {} }, 1500);
})();
