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
  <div class="plans"><div class="plan"><h3>Gratis</h3><p class="pr"><b>${eur(0)}</b></p><ul>${li([`Bis zu ${FREE_LIMITS.docs} Dokumente, ${FREE_LIMITS.boards} Whiteboards`, "Karteikarten &amp; Quiz", "Planer, Noten, Fokus-Timer", `Studix AI: ${aiuNum(AIQ.free)} Token pro Woche`, "Sync auf allen Geräten"])}</ul><a class="btn" ${go}>Kostenlos starten</a></div>
  <div class="plan feat"><span class="pill-l"><b>Pro</b> beliebt</span><h3>Studix Study Pro</h3>${c.monthly ? `<p class="pr"><b>${eur(c.monthly)}</b> / Monat</p>${c.yearly ? `<p class="note">oder ${eur(c.yearly)} / Jahr</p>` : ""}` : `<p class="pr"><b>${eur(c.yearly)}</b> / Jahr</p>`}<ul>${li(["Alles aus Gratis", `${c.trial || 14} Tage kostenlos testen`, `Studix AI: ${aiuNum(AIQ.pro)} Token pro Woche`, "Unbegrenzt Dokumente &amp; Whiteboards", "Bild-Analyse &amp; Sprachgespräch", "Längere Antworten", "Neue Pro-Funktionen zuerst", "Jederzeit kündbar"])}</ul><a class="btn accent" ${go}>${c.trial || 14} Tage gratis testen</a></div></div>
  <p style="text-align:center;margin-top:18px">${planCompareLink()}</p>
  <p class="note" style="text-align:center;margin-top:14px">Preise inkl. gesetzlicher Mehrwertsteuer deines Landes – sie wird beim Bezahlen automatisch berechnet.</p></section>`;
}
const EMBED_TABS = [["Heute", "today", "home"], ["Dokumente", "docs", "folder"], ["Karteikarten", "cards", "cards"], ["Planer", "planner", "cal"], ["Studix AI", "ai", "spark"]];
function mountEmbed(root) {
  const fr = $("iframe", root), box = $(".emb-view", root), tabs = $$(".emb-tab", root), W = 1280, BASE = 780, MAXH = 1300; let H = BASE;
  const fit = () => { const w = box.clientWidth, k = w / W; fr.style.height = H + "px"; box.style.height = Math.round(H * k) + "px"; fr.style.transform = `scale(${k})`; };
  /* Jede Seite ist nur so hoch wie ihr Inhalt (mindestens BASE), damit man in der Vorschau nie scrollen muss */
  const measure = () => { try { const d = fr.contentDocument, m = d.querySelector("#main"); if (!m) return; H = BASE; fit(); let ex = 0; [m, ...m.querySelectorAll("*")].forEach(e => { if (e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(fr.contentWindow.getComputedStyle(e).overflowY)) ex = Math.max(ex, e.scrollHeight - e.clientHeight); }); H = Math.min(MAXH, BASE + ex); fit(); } catch {} };
  const remeasure = () => [150, 700, 1600].forEach(t => setTimeout(measure, t));
  new ResizeObserver(fit).observe(box); fit();
  const mark = () => { let v = ""; try { v = (fr.contentWindow.location.hash.replace(/^#\/?/, "").split("/")[1] || "today"); } catch {} tabs.forEach(t => t.classList.toggle("on", t.dataset.v === v || (v === "doc" && t.dataset.v === "docs") || (v === "deck" && t.dataset.v === "cards"))); };
  /* Die Vorschau bedient niemand selbst: Sofia klickt sich automatisch durch die App, Lena und Marc sind nur im geteilten Dokument zu sehen */
  const live = $(".emb-live", root), sofia = $(".cur.u3", root); let tour = 0, alive = true, tid = 0;
  const wait = ms => new Promise(r => { tid = setTimeout(r, ms); });
  const hashGo = v => { try { fr.contentWindow.location.hash = "#/app/" + v; } catch { fr.src = "index.html?embed=1#/app/" + v; } };
  const moveTo = (sel, fx = .5, fy = .5) => { try { const e = fr.contentDocument.querySelector(sel), k = box.clientWidth / W; if (e) { const r = e.getBoundingClientRect(); sofia.style.left = (r.left + r.width * fx) * k + "px"; sofia.style.top = (r.top + r.height * fy) * k + "px"; return true; } } catch {} sofia.style.left = "52%"; sofia.style.top = "46%"; return false; };
  const click = () => { sofia.classList.remove("clk"); void sofia.offsetWidth; sofia.classList.add("clk"); };
  const visit = async (v, sel) => { moveTo(sel || `.nav-i[data-go="${v}"]`, .4, .5); await wait(1300); click(); await wait(250); hashGo(v); await wait(700); };
  const run = async () => {
    const mine = ++tour; await wait(2500);
    while (alive && mine === tour) {
      live.classList.remove("collab"); await visit("docs"); await wait(1400);
      moveTo('[data-id="d1"],[data-doc="d1"],.dcard,.doc-card,.doc,main a', .5, .5); await wait(1300); click(); await wait(250); hashGo("doc/d1"); await wait(900);
      live.classList.add("collab"); moveTo(".ed, .editor, [contenteditable], #main", .35, .4); await wait(6500);
      live.classList.remove("collab"); await visit("today"); await wait(3000);
      await visit("exams"); await wait(2600);
      await visit("planner"); await wait(2600);
      await visit("grades"); await wait(2400);
      hashGo("cards"); moveTo("#main", .5, .4); await wait(2600);
      await visit("ai"); await wait(3200);
      await visit("today"); await wait(2200);
    }
  };
  const vis = new IntersectionObserver(es => es.forEach(e => { alive = e.isIntersecting; if (alive) run(); else { clearTimeout(tid); tour++; } }), { threshold: .2 }); vis.observe(root);
  /* Hell/Dunkel der Vorschau folgt immer dem Thema der Seite (auch wenn es nach dem Laden gewechselt wird) */
  const theme = () => { try { fr.contentDocument.documentElement.dataset.theme = themeNow(); } catch {} };
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  fr.addEventListener("load", () => { theme(); mark(); remeasure(); try { fr.contentWindow.addEventListener("hashchange", remeasure); fr.contentDocument.addEventListener("click", remeasure, true); } catch {} try { fr.contentWindow.addEventListener("hashchange", mark); } catch {} });
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
/* Bento-Raster (nach Magic UI): Dateien-Marquee, animierte Erinnerungsliste, Strahlen zu den KI-Anbietern, Kalender */
const BENTO_FILES = [["Zellatmung.note", "In den Mitochondrien wird Glukose mit Sauerstoff zu CO₂ und Wasser abgebaut – dabei entsteht ATP."], ["Vokabeln Unit 4.deck", "48 Karten · 18 heute fällig. Spaced Repetition zeigt sie genau dann, wenn du sie fast vergessen hast."], ["Skript Analysis.pdf", "Grenzwerte, Ableitungen und Integrale – mit Markierungen und Notizen direkt im PDF."], ["Skizze Zelle.draw", "Zeichnung mit Stift, Marker und Formen – im selben Dokument wie deine Notizen."], ["Referat Geschichte.note", "Gliederung, Quellen und Stichpunkte – Studix AI fasst dir alles in fünf Punkten zusammen."]];
const BENTO_LIST = [["cal", "#2563eb", "Mathe-Klausur in 6 Tagen", "Prüfungen"], ["cards", "#0e9f6e", "18 Karteikarten fällig", "Lernen"], ["check", "#ff6a3d", "Aufgaben S. 54 morgen fällig", "Planer"], ["spark", "#5b3df5", "Quiz aus deinen Notizen bereit", "Studix AI"], ["note", "#d6431f", "Referat Biologie: Entwurf speichern", "Dokumente"], ["cal", "#8b5cf6", "Fokus-Block 25 Min. abgeschlossen", "Fokus"]];
const GEMINI_SVG = '<svg viewBox="0 0 24 24"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4285f4"/><stop offset=".55" stop-color="#9b72cb"/><stop offset="1" stop-color="#d96570"/></linearGradient></defs><path fill="url(#gm)" d="M12 1.5C12.7 7.6 16.4 11.3 22.5 12 16.4 12.7 12.7 16.4 12 22.5 11.3 16.4 7.6 12.7 1.5 12 7.6 11.3 11.3 7.6 12 1.5Z"/></svg>';
const GROQ_SVG = '<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#f55036"/><path fill="#fff" d="M12.1 5.2a6.8 6.8 0 1 0 4.1 12.2l-1.4-1.6a4.7 4.7 0 1 1 1.5-3.4v.4h-3.7v2.1h6v-2.5a6.8 6.8 0 0 0-6.5-7.2z"/></svg>';
/* Zusätzliche Landing-Abschnitte (Farbe, Bewegung, mehr Inhalt) */
const LP_SUBJ = [["Mathe", "#2563eb"], ["Biologie", "#0e9f6e"], ["Deutsch", "#ff6a3d"], ["Geschichte", "#a16207"], ["Chemie", "#8b5cf6"], ["Physik", "#0891b2"], ["Englisch", "#e11d48"], ["Informatik", "#4f46e5"], ["Recht", "#475569"], ["Medizin", "#db2777"], ["Wirtschaft", "#d97706"], ["Kunst", "#16a34a"]];
function extraHtml(go) {
  const chips = [...LP_SUBJ, ...LP_SUBJ].map(([n, c]) => `<span class="mq-chip" style="--c:${c}"><i></i>${n}</span>`).join("");
  const tiles = [
    ["#ffe9d6", "#ff6a3d", "note", "Notizen, die mitwachsen", "Schreib wie in einem Dokument: Überschriften, Tabellen, Formeln, Bilder – oder zeichne direkt dazu.", `<div class="xv xv-note"><b></b><i></i><i></i><i class="s"></i><u></u></div>`],
    ["#dff5ea", "#0e9f6e", "cards", "Karteikarten, die sitzen", "Wiederholt genau dann, wenn du kurz vorm Vergessen bist. Aus jeder Notiz in einem Klick.", `<div class="xv xv-cards"><span>Was ist ATP?</span><span>Energieträger der Zelle</span></div>`],
    ["#e0eaff", "#2563eb", "cal", "Planer ohne Chaos", "Stundenplan, Aufgaben, Prüfungen und Kalender an einem Ort – mit Erinnerungen vor der Deadline.", `<div class="xv xv-plan">${["Mo", "Di", "Mi", "Do", "Fr"].map((d, i) => `<em style="--h:${[60, 85, 45, 95, 70][i]}%">${d}</em>`).join("")}</div>`],
    ["#f0e6ff", "#8b5cf6", "spark", "Ein Tutor, der Zeit hat", "Frag Studix AI zu deinen Unterlagen: erklären, zusammenfassen, abfragen – rund um die Uhr.", `<div class="xv xv-ai"><p>Erkläre mir die Zellatmung</p><p class="a">Stell dir die Zelle als Kraftwerk vor …</p></div>`]];
  const steps = [["#ff6a3d", "1", "Sammeln", "Schreib mit, zeichne, importiere PDFs und Bilder – alles landet geordnet in deinen Fächern."], ["#2563eb", "2", "Verstehen", "Lass dir Stoff erklären, zusammenfassen und in Karteikarten und Quiz verwandeln."], ["#0e9f6e", "3", "Behalten", "Der Lernplan erinnert dich genau dann, wenn Wiederholen am meisten bringt."]];
  const uses = [["#e11d48", "Schule", "Hausaufgaben, Vokabeln und Klassenarbeiten im Griff."], ["#2563eb", "Uni", "Skripte, Zusammenfassungen und Altklausuren an einem Ort."], ["#0e9f6e", "Ausbildung", "Berichtsheft, Lernfelder und Prüfungsvorbereitung."], ["#d97706", "Selbststudium", "Eigene Ziele, Lernpläne und Fokus-Timer."]];
  const stats = [["0 €", "zum Start – kostenlos"], ["3", "Geräte: iPad, Handy, PC"], ["100 %", "offline nutzbar"], ["✎", "Apple Pencil unterstützt"]];
  return `
  <section class="sec xs" id="subjects"><p class="xs-k rv">Für jedes Fach</p><div class="mq rv"><div class="mq-t">${chips}</div></div></section>
  <section class="sec xs" id="tiles"><h2 class="rv">Vier Werkzeuge. Ein Workflow.</h2><p class="lead rv">Vier Werkzeuge, die zusammenarbeiten – statt vier Apps, die du jonglieren musst.</p>
    <div class="xt">${tiles.map(([bg, c, i, t, d, v], k) => `<article class="xt-c rv" style="--bg:${bg};--c:${c};--d:${k * 90}ms"><span class="xt-i">${ic(i)}</span><h3>${t}</h3><p>${d}</p>${v}</article>`).join("")}</div></section>
  <section class="sec xs" id="steps"><h2 class="rv">So lernst du mit Studix.</h2>
    <div class="xst">${steps.map(([c, n, t, d], k) => `<div class="xst-c rv" style="--c:${c};--d:${k * 120}ms"><b>${n}</b><h3>${t}</h3><p>${d}</p></div>`).join("")}</div></section>
  <section class="sec xs" id="stats"><div class="xsb rv">${stats.map(([a, b]) => `<div><b data-n>${a}</b><span>${b}</span></div>`).join("")}</div></section>`;
}
function bentoHtml() {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const cal = `<div class="bn-cal"><b>${now.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</b><div class="bn-cg">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => `<small>${d}</small>`).join("")}${"<i></i>".repeat(first)}${Array.from({ length: days }, (_, i) => `<span class="${i + 1 === now.getDate() ? "on" : [6, 14, 21].includes(i + 1) ? "ex" : ""}">${i + 1}</span>`).join("")}</div></div>`;
  const file = f => `<figure class="bn-file"><figcaption>${f[0]}</figcaption><blockquote>${f[1]}</blockquote></figure>`;
  const nd = (x, y, inner, cls = "") => `<div class="bm-n ${cls}" style="left:${x / 4.4}%;top:${y / 3}%">${inner}</div>`;
  const beams = [[60, 60, 188, 150, 0], [60, 150, 188, 150, 1], [60, 240, 188, 150, 2], [252, 150, 376, 95, 3], [252, 150, 376, 205, 4]].map(([x1, y1, x2, y2, i]) => `<path d="M${x1} ${y1}C${(x1 + x2) / 2} ${y1},${(x1 + x2) / 2} ${y2},${x2} ${y2}" fill="none" class="bm-b"/><path d="M${x1} ${y1}C${(x1 + x2) / 2} ${y1},${(x1 + x2) / 2} ${y2},${x2} ${y2}" fill="none" pathLength="100" class="bm-a" style="animation-delay:${i * .45}s"/>`).join("");
  const card = (cls, icon, name, desc, href, bg) => `<a class="bn-card ${cls}" href="${href}"><div class="bn-bg">${bg}</div><div class="bn-c"><span class="bn-i">${ic(icon)}</span><h3>${name}</h3><p>${desc}</p></div><div class="bn-cta"><span>Ausprobieren</span>${ic("arrow")}</div></a>`;
  return `<section class="sec feat" id="how"><h2>Alles, was du zum Lernen brauchst.</h2><div class="bento3">
    ${card("b-a", "file", "Alles an einem Ort", "Notizen, Skizzen, PDFs und Karteikarten – automatisch gespeichert, während du schreibst.", "#/app/docs", `<div class="bn-marq">${[0, 1].map(() => `<div class="bn-mt">${BENTO_FILES.map(file).join("")}</div>`).join("")}</div>`)}
    ${card("b-b", "cal", "Erinnerungen", "Prüfungen, fällige Karten und Hausaufgaben – du verpasst nichts mehr.", "#/app/planner", `<div class="bn-list" id="bn-list"></div>`)}
    ${card("b-c", "spark", "Studix AI mit starken Modellen", "Studix AI läuft zurzeit mit Gemini und Groq – schnell, und für jede Frage das passende Modell.", "#/app/ai", `<div class="bm"><svg viewBox="0 0 440 300" aria-hidden="true">${beams}</svg>${nd(60, 60, ic("note"))}${nd(60, 150, ic("file"))}${nd(60, 240, ic("cards"))}${nd(220, 150, '<i class="mark"></i>', "ctr")}${nd(376, 95, GEMINI_SVG, "prv")}${nd(376, 205, GROQ_SVG, "prv")}<span class="bm-l" style="left:${376 / 4.4}%;top:${(95 - 44) / 3}%">Gemini</span><span class="bm-l" style="left:${376 / 4.4}%;top:${(205 + 44) / 3}%">Groq</span></div>`)}
    ${card("b-d", "cal", "Kalender & Planer", "Stundenplan, Prüfungen und Abgaben – alles nach Datum gefiltert.", "#/app/planner", cal)}
  </div></section>`;
}
function mountBento(root) {
  const list = $("#bn-list", root); if (!list) return; let i = 0, t = null;
  const item = d => `<div class="bn-li"><span style="background:${d[1]}">${ic(d[0])}</span><div><b>${d[2]}</b><small>${d[3]} · gerade eben</small></div></div>`;
  const push = () => { list.insertAdjacentHTML("afterbegin", item(BENTO_LIST[i++ % BENTO_LIST.length])); while (list.children.length > 6) list.lastElementChild.remove(); };
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { for (let k = 3; k >= 0; k--) list.insertAdjacentHTML("beforeend", item(BENTO_LIST[k])); return; }
  new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !t) { push(); t = setInterval(push, 1700); } else if (!e.isIntersecting && t) { clearInterval(t); t = null; } }), { threshold: .2 }).observe(list);
}
function renderLanding() {
  landingEl.dataset.r = 1; const go = 'href="#/app"';
  landingEl.innerHTML = `
  <header class="pnav" id="nav"><a class="logo" href="#/"><i class="mark"></i>Studix</a>
    <nav class="pnav-links"><a href="#how">Funktionen</a>${BILL.cfg?.enabled ? '<a href="#pricing">Preise</a>' : ""}<a href="#faq">Fragen</a></nav>
    <div class="pnav-r"><a class="btn accent" ${go}>App öffnen</a><button class="burger" aria-label="Menü" onclick="document.getElementById('nav').classList.toggle('open')">${ic("menu")}</button></div></header>
  <section class="hero3">
    <h1>Dein Lern- und Workspace<br>an einem Ort.</h1>
    <p class="sub">Notizen, Zeichnungen, Karteikarten, Planer und ein KI-Tutor – in einer App, die mit dir mitdenkt. Auf iPad, Handy und PC, auch offline.</p>
    <div class="hero-cta"><a class="btn accent big" ${go}>Kostenlos starten</a><a class="btn light big" href="#how">Funktionen ansehen</a></div>
    <div class="emb" id="emb"><div class="emb-bar"><span class="dots"><i></i><i></i><i></i></span>
      <div class="emb-tabs" role="tablist">${EMBED_TABS.map((t, i) => `<button class="emb-tab ${i ? "" : "on"}" data-v="${t[1]}" role="tab">${ic(t[2])}<span>${t[0]}</span></button>`).join("")}</div>
      <span class="emb-av"><i style="--c:#18a957">L</i><i style="--c:#3b82f6">M</i><i style="--c:#f59e0b">S</i><em>3 online</em></span><span class="emb-url">studix.app</span></div>
      <div class="emb-view"><iframe src="index.html?embed=1#/app/today" title="Studix App" loading="eager"></iframe><div class="emb-live" aria-hidden="true">${[["u1", "#18a957", "Lena"], ["u2", "#3b82f6", "Marc"], ["u3", "#f59e0b", "Sofia"]].map(u => `<div class="cur ${u[0]}" style="--c:${u[1]}"><svg viewBox="0 0 16 20"><path d="M1 1l13 7-6 2-2 7z" fill="currentColor" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg><span>${u[2]}</span></div>`).join("")}</div></div></div>
    <p class="emb-hint">Live-Vorschau: Sofia arbeitet in der App, Lena und Marc schreiben im geteilten Dokument mit.</p>
  </section>
  ${bentoHtml()}
  ${extraHtml(go)}
  ${pricingHtml(go)}
  <section class="sec" id="faq"><h2>Häufige Fragen</h2><div class="faq">${[["Ist Studix kostenlos?", BILL.cfg?.enabled ? `Ja, die Grundfunktionen – Notizen, Karteikarten, Quiz, Planer, Noten – sind kostenlos. Studix AI hat ein Wochenlimit: ${aiuNum(AIQ.free)} Token im Gratis-Konto, ${aiuNum(AIQ.pro)} mit Studix Study Pro.` : "Ja. Alle Funktionen sind kostenlos."], ["Wo liegen meine Daten?", "Lokal auf deinem Gerät (auch offline nutzbar). Mit einem Konto werden Notizen, Aufgaben und Karteikarten verschlüsselt übertragen und sind auf allen Geräten gleich. Mit dem Backup-Export nimmst du sie jederzeit mit."], ["Funktioniert es für Schule und Studium?", "Ja – beim Start wählst du Schule oder Studium. Notensysteme (1–6, Punkte, Prozent) und Fächer bzw. Module passen sich an."], ["Kann ich es wie eine App installieren?", "Ja. Im Browser „Zum Home-Bildschirm“ (iPad/iPhone) bzw. „Installieren“ (Chrome/Edge) wählen."], ...(BILL.cfg?.enabled ? [["Wie bezahle ich und wie kündige ich?", "Über Stripe per Karte, Apple Pay, Google Pay oder Link. Die Mehrwertsteuer deines Landes ist im Preis enthalten und wird beim Bezahlen angezeigt. Kündigen kannst du jederzeit in den Einstellungen unter „Studix Study Pro“."]] : [])].map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join("")}</div></section>
  <footer><div><a class="logo" href="#/"><i class="mark"></i>Studix</a><p style="margin-top:12px;max-width:260px">Die Lern-App für Schule und Studium.</p></div>${[["App", "Notizen", "Zeichnen", "Karteikarten", "Quiz"], ["Planen", "Stundenplan", "Aufgaben", "Noten", "Fokus-Timer"], ["Rechtliches", ["Impressum", "legal.html#impressum"], ["Datenschutz", "legal.html#datenschutz"], ["AGB", "legal.html#agb"], ["Widerruf", "legal.html#widerruf"]]].map(c => `<div><b>${c[0]}</b>${c.slice(1).map(x => Array.isArray(x) ? `<a href="${x[1]}">${x[0]}</a>` : `<a href="#/app">${x}</a>`).join("")}</div>`).join("")}</footer><div class="copy">© ${new Date().getFullYear()} Studix</div>`;
  mountEmbed($("#emb", landingEl));
  mountBento(landingEl);
  { const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io2.unobserve(e.target); } }), { threshold: .15 }); $$(".rv", landingEl).forEach(x => io2.observe(x)); }
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
