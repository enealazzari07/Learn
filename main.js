"use strict";
/* Lumi – router, landing page, boot */
const landingEl = $("#landing"), appEl = $("#app");
let onboardShown = false;

/* KI-Dock sitzt bündig unter der Karteikarten-Kachel (dritte Spalte, zweite Reihe); die Kachel ist nur so hoch, dass beides in die Reihe passt */
/* Aufgeklappt reicht das Dock genau bis zur Oberkante des Blocks direkt darüber (z. B. „Woche“) */
function dockOpenH() {
  const p = $("#aipane"), grid = $("#b-grid"); if (!p || !grid) return 0;
  const g = grid.getBoundingClientRect(), ch = +p.dataset.ch || 172, closedTop = g.bottom - ch, dr = innerWidth - parseFloat(p.style.right || 0), dl = dr - parseFloat(p.style.width || 0);
  let top = null; $$("#b-grid > .wg").forEach(b => { const r = b.getBoundingClientRect(); if (r.left < dr - 1 && r.right > dl + 1 && r.bottom <= closedTop + 6 && (top === null || r.bottom > top.bottom)) top = r; });
  return Math.round(g.bottom - (top ? top.top : closedTop - 300));
}
function fitDock() {
  const p = $("#aipane"), grid = $("#b-grid");
  if (p && grid && innerWidth >= 901 && !p.hidden) {   // Raster-Startseite: Dock sitzt auf den Zellen unten rechts (Spalte 5–6) und klappt nach oben über den Block darüber auf
    const g = grid.getBoundingClientRect(), gap = 12, col = (g.width + gap) / 6;
    p.style.setProperty("bottom", Math.round(innerHeight - g.bottom) + "px", "important"); p.style.setProperty("right", Math.round(innerWidth - g.right) + "px", "important"); p.style.setProperty("width", Math.round(col * 2 - gap) + "px", "important");
    if (!p.classList.contains("open")) p.dataset.ch = p.offsetHeight; else p.style.setProperty("height", dockOpenH() + "px", "important");
    return;
  }
  const ex = $(".w-rec"), cards = $(".w-cards"); if (!p || !ex || !cards) return;
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
  if (!h.startsWith("app")) { landingEl.hidden = false; appEl.hidden = true; document.title = "Lumi – Lernen, das funktioniert"; if (!landingEl.dataset.r) renderLanding(); window.scrollTo(0, 0); return; }
  landingEl.hidden = true; appEl.hidden = false; document.title = "Lumi";
  if (cloudGate()) return authScreen();
  if (!D.profile.onboarded && !onboardShown) { onboardShown = true; buildShell(); renderView(); onboarding(); return; }
  renderView();
}
addEventListener("hashchange", route);
addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && location.hash.startsWith("#/app")) { e.preventDefault(); go("search"); } });

/* ---------- landing ---------- */
function appShot() {
  const rows = [["Mathe", "#2563eb", "Aufgaben S. 54 Nr. 3–7", "Morgen"], ["Biologie", "#0e9f6e", "Referat Zellatmung", "Fr"], ["Englisch", "#ff6a3d", "Vokabeltest Unit 4", "Mo"]];
  return `<div class="shot-in"><div class="shot-side"><b>Lumi</b>${["Heute", "Dokumente", "Karteikarten", "Planer", "Lumi AI"].map((x, i) => `<span class="${i ? "" : "on"}">${x}</span>`).join("")}</div><div class="shot-main"><small>Donnerstag, 9. Oktober</small><h4>Guten Morgen, Alex</h4>
  <div class="shot-tiles"><div><b>12</b><small>Tage Serie</small></div><div><b>45</b><small>Min. heute</small></div><div><b>18</b><small>Karten fällig</small></div></div>
  <div class="shot-list">${rows.map(r => `<div><i style="background:${r[1]}"></i><span>${r[2]}</span><small>${r[0]} · ${r[3]}</small></div>`).join("")}</div></div></div>`;
}
function renderLanding() {
  landingEl.dataset.r = 1; const go = 'href="#/app"';
  const TABS = [
    ["Schreiben", "Notizen, Skizzen und Dateien an einem Ort", "Ein richtiger Editor mit Überschriften, Listen, Tabellen, Formeln und Bildern. Dazu Stift, Marker und Formen direkt im selben Dokument – und Platz für alle PDFs und Skripte.", "edit", ["Notizen mit Formeln & Tabellen", "Whiteboard mit Stift & Formen", "PDFs, Bilder & Skripte ablegen"]],
    ["Lernen", "Karteikarten und Quiz, die wirklich hängenbleiben", "Spaced Repetition zeigt dir jede Karte genau dann, wenn du sie fast vergessen hast. Quiz und Prüfungstraining entstehen auf Knopfdruck aus deinen Unterlagen.", "cards", ["Karteikarten aus Notizen erzeugen", "Quiz zu jedem Thema", "Lernserie & Statistik"]],
    ["Planen", "Stundenplan, Hausaufgaben und Prüfungen", "Behalte Abgabetermine, Klausuren und den Stundenplan im Blick – mit Kalender, Erinnerungen und Fokus-Timer für konzentrierte Lernblöcke.", "cal", ["Hausaufgaben & Prüfungen", "Stundenplan & Kalender", "Pomodoro-Fokus-Timer"]],
    ["Lumi AI", "Ein Tutor, der dich nie nervt", "Lass dir Themen erklären, dich abfragen oder fotografiere eine Aufgabe. Lumi AI hilft mit Hinweisen statt nur mit der Lösung – und kennt deine Unterlagen.", "spark", ["Erklärt Schritt für Schritt", "Hausaufgaben-Hilfe per Foto", "Fasst Skripte zusammen"]],
  ];
  landingEl.innerHTML = `
  <header class="nav" id="nav"><a class="logo" href="#/"><i class="mark"></i>Lumi</a>
    <nav class="nav-links"><a href="#how">Funktionen</a><a href="#create">Editor</a><a href="#devices">Geräte</a><a href="#ai">Lumi AI</a><a href="#faq">Fragen</a></nav>
    <div class="nav-right"><a class="btn accent" ${go}>App öffnen</a><button class="burger" aria-label="Menü" onclick="document.getElementById('nav').classList.toggle('open')">${ic("menu")}</button></div></header>
  <section class="hero2"><div class="orb o1"></div><div class="orb o2"></div>
    <span class="pill-l"><b>Neu</b> Für Schule & Studium</span>
    <h1>Dein ganzes Lernen an einem Ort.</h1>
    <p class="sub">Notizen schreiben, skizzieren, Dateien ablegen, Karteikarten lernen, Prüfungen planen – mit einem Lumi AI, der dir wirklich hilft. Auf iPad, Handy und PC, auch offline.</p>
    <div class="hero-cta"><a class="btn accent big" ${go}>Kostenlos starten</a><a class="btn light big" href="#how">Funktionen ansehen</a></div>
    <div class="stage"><div class="shot">${appShot()}</div>
      <div class="chip-f c1"><span class="dot">${ic("check")}</span>Karteikarten erstellt</div><div class="chip-f c2">${ic("spark")}Lumi AI bereit</div><div class="chip-f c3"><b>12</b> Tage Lernserie</div><div class="chip-f c4">${ic("cal")}Mathe-Klausur in 6 Tagen</div></div></section>
  <section class="sec" id="how"><h2>Alles, was du zum Lernen brauchst.</h2>
    <div class="tabs" role="tablist">${TABS.map((t, i) => `<button class="tab ${i ? "" : "on"}" data-t="${i}" role="tab">${t[0]}</button>`).join("")}</div><div class="tabpane" id="tabpane"></div></section>
  <section class="scene-sec" id="create"><h2 class="scene-h">Schreiben, zeichnen, lernen – mit Lumi AI an deiner Seite.</h2>
    <div class="scene"><div class="chair"></div><div class="lap"><div class="lap-screen"><div class="lap-cam"></div><div class="lap-in"><div class="lap-bar"><i></i><i></i><i></i><span>lumi.learn/app</span></div>
      <div class="lap-app"><aside>${ic("home")}${ic("search")}${ic("folder")}<b class="sel">${ic("note")}</b>${ic("brush")}<b style="color:#7c5cff">${ic("cards")}</b><b style="color:#d6431f">${ic("cal")}</b><em>+</em></aside>
        <div class="lap-main"><div class="lap-top"><div><b>Biologie · Zellatmung</b><small>Notiz</small></div><span class="av-s"><i style="background:#18a957"></i><i style="background:#3b82f6"></i></span><span class="pub">Lumi AI</span></div>
        <div class="lap-cv"><small>Biologie · Kapitel 4</small><h3>Zellatmung einfach erklärt<u>Lumi AI</u></h3><div class="eb">${ic("spark")}<span>Fasse mir das in 5 Punkten zusammen…</span><b>B</b><i>I</i><span>Aa</span></div><p>In den Mitochondrien wird Glukose mit Sauerstoff zu Kohlenstoffdioxid und Wasser abgebaut. Dabei entsteht ATP als Energieträger der Zelle.</p><div class="art"></div></div></div></div></div></div><div class="lap-base"></div></div>
      <div class="bk b1"></div><div class="bk b2"></div><div class="bk b3"></div><div class="bk b4"></div><div class="bk b5"></div><div class="bk b6"></div><div class="binder"><i></i></div><div class="cup"><b></b><u></u></div><div class="pen"></div></div></section>
  <section class="tablet-sec" id="devices"><div><h2 style="font-size:clamp(36px,5.2vw,64px);letter-spacing:-.045em;line-height:.98;font-weight:700">Für iPad, Handy und PC gebaut.</h2><p class="lead" style="font-size:20px;color:#444;margin-top:20px;max-width:520px">Mit Apple Pencil oder Finger zeichnen, am Handy Karteikarten lernen, am PC schreiben. Lumi läuft im Browser, lässt sich installieren und funktioniert offline.</p><div class="hero-cta" style="justify-content:flex-start"><a class="btn" ${go}>Jetzt ausprobieren</a></div></div>
    <div class="tablet-art"><div class="tablet"><small style="color:#888">Lumi · Notiz</small><h4>Satz des Pythagoras</h4><div class="ln" style="width:60%"></div><div class="ln"></div><div class="ai-line"></div><div class="ln" style="width:85%"></div><div class="ln"></div><div class="ln" style="width:70%"></div></div></div><div class="workday">Installierbar & offline nutzbar</div></section>
  <section class="sec" id="ai"><div class="dark-card"><div><span class="pill-l dk"><b>Lumi AI</b> eingebaut</span><h2>Frag, was du willst. Lumi hilft.</h2><p class="lead">Zusammenfassungen, Quiz, Erklärungen und Hausaufgaben-Hinweise – direkt in deinen Unterlagen.</p><a class="btn accent" ${go} style="margin-top:26px">Mit dem Tutor sprechen</a></div>
    <div class="chat-demo"><div class="m u">Erkläre mir die Zellatmung wie einem Zehntklässler.</div><div class="m a">Stell dir die Zelle als Kraftwerk vor: Aus Zucker und Sauerstoff entsteht Energie (ATP). Soll ich dich danach abfragen?</div><div class="m u">Ja, und mach Karteikarten daraus.</div><div class="m a">Erledigt – 12 Karten sind in deinem Stapel „Biologie“.</div></div></div>
    <div class="grid3">${[["note", "#5b3df5", "Notiz-Editor", "Formatierung, Tabellen, Formeln, Bilder und Checklisten."], ["brush", "#ff6a3d", "Schreiben und Zeichnen", "Stift, Marker, Formen und Text – auch mit Apple Pencil."], ["cards", "#0e9f6e", "Karteikarten", "Lernen mit Wiederholungs-Algorithmus."], ["help", "#2563eb", "Quiz-Training", "Prüfungsfragen aus deinen Unterlagen."], ["cal", "#8b5cf6", "Planer", "Stundenplan, Aufgaben, Kalender und Prüfungen."], ["award", "#111", "Noten & Fokus", "Notenschnitt, Zielrechner und Pomodoro-Timer."]].map(([i, c, t, d]) => `<div class="card"><div class="ico" style="background:${c}">${ic(i)}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></section>
  <section class="sec" id="faq"><h2>Häufige Fragen</h2><div class="faq">${[["Ist Lumi kostenlos?", "Ja. Alle Funktionen sind kostenlos. Für die Lumi-AI-Funktionen nutzt du optional deinen eigenen Anthropic-API-Key."], ["Wo liegen meine Daten?", "Alles wird lokal auf deinem Gerät gespeichert und funktioniert offline. Mit dem Backup-Export nimmst du deine Daten mit aufs nächste Gerät."], ["Funktioniert es für Schule und Studium?", "Ja – beim Start wählst du Schule oder Studium. Notensysteme (1–6, Punkte, Prozent) und Fächer bzw. Module passen sich an."], ["Kann ich es wie eine App installieren?", "Ja. Im Browser „Zum Home-Bildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge) wählen."]].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section>
  <section class="cta-final"><h2>Lern klüger, nicht länger.</h2><p style="opacity:.75;margin-top:18px;font-size:19px">In 20 Sekunden eingerichtet. Ohne Anmeldung.</p><a class="btn" ${go}>App öffnen</a></section>
  <footer><div><a class="logo" href="#/"><i class="mark"></i>Lumi</a><p style="margin-top:12px;max-width:260px">Die Lern-App für Schule und Studium.</p></div>${[["App", "Notizen", "Zeichnen", "Karteikarten", "Quiz"], ["Planen", "Stundenplan", "Aufgaben", "Noten", "Fokus-Timer"], ["Lumi", "Lumi AI", "Datenschutz", "Kontakt"]].map(c => `<div><b>${c[0]}</b>${c.slice(1).map(x => `<a href="#/app">${x}</a>`).join("")}</div>`).join("")}</footer><div class="copy">© ${new Date().getFullYear()} Lumi · Demo-Projekt</div>`;
  const pane = $("#tabpane", landingEl);
  const showTab = i => { const t = TABS[i]; $$(".tab", landingEl).forEach((b, k) => b.classList.toggle("on", k === i)); pane.innerHTML = `<div><span class="ico2">${ic(t[3])}</span><h3>${t[1]}</h3><p>${t[2]}</p><a class="btn" ${go}>Ausprobieren</a></div><div class="mock">${t[4].map((x, k) => `<div class="mk" style="animation-delay:${k * .12}s">${ic(t[3])}<span>${x}</span><i>↗</i></div>`).join("")}</div>`; };
  $$(".tab", landingEl).forEach(b => b.onclick = () => showTab(+b.dataset.t)); showTab(0);
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
