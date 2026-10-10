"use strict";
/* Lumi study app – flashcards, quiz, planner, grades, focus timer, AI chat, search, settings */

var LEAVE = [];          // cleanup callbacks run when the view changes
let chatPrefill = "", searchPrefill = "";

/* ---------- flashcards ---------- */
const INTERVALS = [0, 1, 3, 7, 16, 35];
async function newDeck(subjectId = "") {
  const t = await ask("Neuer Karteikarten-Stapel", { placeholder: "z. B. Vokabeln Unit 4", ok: "Erstellen" }); if (!t?.trim()) return;
  const d = { id: uid(), title: t.trim(), subjectId, cards: [] }; D.decks.unshift(d); save(); go("cards/" + d.id);
}
V.cards = (m, id) => {
  if (id) return V.deck(m, id);
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Spaced Repetition</p><h1>Karteikarten</h1></div><div class="row"><button class="btn ghost" id="gen">${ic("spark")}Mit KI erstellen</button><button class="btn accent" id="nd">${ic("plus")}Neuer Stapel</button></div></div>
  ${D.decks.length ? `<div class="deckgrid">${D.decks.map(d => { const due = d.cards.filter(c => c.due <= iso()).length, s = subj(d.subjectId), mastered = d.cards.filter(c => c.box >= 4).length; return `<div class="deck" data-k="${d.id}"><div class="dtop">${s ? `<span class="sdot" style="background:${s.color}"></span>${esc(s.name)}` : "&nbsp;"}</div><h3>${esc(d.title)}</h3><p>${d.cards.length} Karten · ${mastered} gelernt</p><div class="bar2"><i style="width:${d.cards.length ? mastered / d.cards.length * 100 : 0}%"></i></div><div class="row"><span class="due ${due ? "on" : ""}">${due ? due + " fällig" : "alles erledigt"}</span><button class="btn small" data-s="${d.id}" ${d.cards.length ? "" : "disabled"}>Lernen</button></div></div>`; }).join("")}</div>` : `<div class="emptybox"><div class="big-ic">${ic("cards")}</div><h3>Noch keine Stapel</h3><p>Erstelle Karten selbst oder lass sie von der KI aus deinen Notizen, PDFs oder einem Thema erzeugen.</p><div class="row" style="justify-content:center"><button class="btn accent" id="nd2">Stapel erstellen</button><button class="btn ghost" id="gen2">Mit KI erstellen</button></div></div>`}</div>`;
  const gen = () => genCardsModal(); $("#gen", m).onclick = gen; $("#gen2", m) && ($("#gen2", m).onclick = gen);
  $("#nd", m).onclick = () => newDeck(); $("#nd2", m) && ($("#nd2", m).onclick = () => newDeck());
  $$("[data-k]", m).forEach(c => c.onclick = e => { if (e.target.closest("[data-s]")) return; go("cards/" + c.dataset.k); });
  $$("[data-s]", m).forEach(b => b.onclick = () => go("study/" + b.dataset.s));
};
function genCardsModal(deck) {
  const { el, close } = modal(`<h3>Karteikarten mit KI erstellen</h3><label class="lbl">Quelle</label><div class="seg" id="gs"><button data-s="topic" class="on">Thema</button><button data-s="doc">Dokument</button></div>
  <div id="g-topic"><input class="field" id="gt" placeholder="z. B. Zellatmung, Französische Revolution, Pythagoras"></div><div id="g-doc" hidden><select class="field" id="gd">${D.docs.filter(d => d.type !== "draw").map(d => `<option value="${d.id}">${esc(d.title)}</option>`).join("") || "<option value=''>Keine Dokumente</option>"}</select></div>
  <label class="lbl">Anzahl</label><select class="field" id="gn"><option>8</option><option selected>12</option><option>20</option></select><div class="row end"><button class="btn accent" id="go">Erstellen</button></div>`);
  let src = "topic"; $$("#gs button", el).forEach(b => b.onclick = () => { src = b.dataset.s; $$("#gs button", el).forEach(x => x.classList.toggle("on", x === b)); $("#g-topic", el).hidden = src !== "topic"; $("#g-doc", el).hidden = src !== "doc"; });
  $("#go", el).onclick = async () => {
    const n = +$("#gn", el).value; let title = "", text = "";
    if (src === "topic") { title = $("#gt", el).value.trim(); if (!title) return toast("Bitte ein Thema eingeben"); if (!hasKey()) return toast("Themen-Karten brauchen die eingerichtete KI. Mit „Dokument“ geht es auch offline."); }
    else { const d = D.docs.find(x => x.id === $("#gd", el).value); if (!d) return toast("Kein Dokument vorhanden"); title = d.title; text = await docText(d); if (text.length < 20) return toast("Dokument enthält zu wenig Text"); }
    close(); toast("KI arbeitet…");
    let cards = null;
    if (src === "topic") cards = parseJSON(await ai(`Erstelle ${n} Karteikarten zum Thema „${title}“ auf dem Niveau ${isUni() ? "Universität" : "Schule"}. Antworte NUR mit JSON: [{"q":"Frage","a":"Antwort"}].`, { max: 3500, quiet: true }));
    else { cards = parseJSON(await ai(`Erstelle ${n} Karteikarten aus dem Text. Antworte NUR mit JSON: [{"q":"Frage","a":"Antwort"}].\nTEXT:\n${clip(text)}`, { max: 3500, quiet: true })); if (!Array.isArray(cards)) cards = localCards(text); }
    if (!Array.isArray(cards) || !cards.length) return toast("Es konnten keine Karten erstellt werden");
    if (deck) { cards.forEach(c => c.q && c.a && deck.cards.push({ id: uid(), q: c.q, a: c.a, box: 0, due: iso() })); save(); toast(cards.length + " Karten ergänzt"); renderView(); } else cardsModal(cards.filter(c => c.q && c.a), title, "");
  };
}
V.deck = (m, id) => {
  const d = D.decks.find(x => x.id === id); if (!d) return go("cards");
  const due = d.cards.filter(c => c.due <= iso()).length;
  m.innerHTML = `<div class="page"><div class="hd"><div class="row" style="align-items:center"><button class="icon-btn" id="bk" aria-label="Zurück">${ic("back")}</button><div><p class="eyebrow">${subj(d.subjectId)?.name || "Stapel"}</p><h1 id="dt" contenteditable spellcheck="false">${esc(d.title)}</h1></div></div>
  <div class="row"><button class="btn accent" id="st" ${d.cards.length ? "" : "disabled"}>${ic("play")}Lernen${due ? ` (${due})` : ""}</button><button class="btn ghost" id="mo">${ic("more")}</button></div></div>
  <div class="deckbar">${subjectSelect(d.subjectId)}<button class="btn ghost" id="ai1">${ic("spark")}KI ergänzen</button><button class="btn ghost" id="imp">${ic("upload")}Importieren</button><button class="btn ghost" id="all" ${d.cards.length ? "" : "disabled"}>Alle durchgehen</button></div>
  <div class="cardlist" id="cl">${d.cards.map((c, i) => `<div class="crow" data-i="${i}"><span class="num">${i + 1}</span><textarea rows="2" data-f="q" placeholder="Frage">${esc(c.q)}</textarea><textarea rows="2" data-f="a" placeholder="Antwort">${esc(c.a)}</textarea><span class="lvl-dots" title="Lernstufe">${[0, 1, 2, 3, 4].map(k => `<i class="${c.box > k ? "on" : ""}"></i>`).join("")}</span><button class="icon-btn" data-x="${i}" aria-label="Löschen">${ic("x")}</button></div>`).join("")}</div>
  <button class="addcard" id="ac">${ic("plus")}Karte hinzufügen</button></div>`;
  $("#bk", m).onclick = () => go("cards"); $("#st", m).onclick = () => go("study/" + d.id);
  $("#dt", m).onblur = e => { d.title = e.target.textContent.trim() || d.title; save(); };
  $("select", m).onchange = e => { d.subjectId = e.target.value; save(); };
  $("#ai1", m).onclick = () => genCardsModal(d); $("#all", m).onclick = () => go("study/" + d.id + "/all");
  $("#mo", m).onclick = e => menu(e.currentTarget, [{ label: "Stapel löschen", icon: "trash", danger: true, fn: async () => { if (await confirmBox(`Stapel „${d.title}“ löschen?`)) { D.decks = D.decks.filter(x => x !== d); save(); go("cards"); } } }, { label: "Lernstand zurücksetzen", icon: "rot", fn: () => { d.cards.forEach(c => { c.box = 0; c.due = iso(); }); save(); renderView(); } }]);
  $$("textarea", m).forEach(t => t.onchange = () => { const i = +t.closest(".crow").dataset.i; d.cards[i][t.dataset.f] = t.value; save(); });
  $$("[data-x]", m).forEach(b => b.onclick = () => { d.cards.splice(+b.dataset.x, 1); save(); renderView(); });
  $("#ac", m).onclick = () => { d.cards.push({ id: uid(), q: "", a: "", box: 0, due: iso() }); save(); renderView(); setTimeout(() => $$(".crow textarea", $("#main")).slice(-2)[0]?.focus(), 30); };
  $("#imp", m).onclick = async () => { const t = await ask("Karten importieren", { multiline: true, placeholder: "Frage;Antwort\nBonjour;Hallo", hint: "Eine Karte pro Zeile, getrennt durch ; oder Tabulator (Quizlet/Excel-Export).", ok: "Importieren" }); if (!t) return; let n = 0; t.split("\n").forEach(l => { const p = l.split(/\t|;/); if (p.length >= 2 && p[0].trim()) { d.cards.push({ id: uid(), q: p[0].trim(), a: p.slice(1).join(";").trim(), box: 0, due: iso() }); n++; } }); save(); toast(n + " Karten importiert"); renderView(); };
};
V.study = (m, id, mode) => {
  const d = D.decks.find(x => x.id === id); if (!d) return go("cards");
  let queue = (mode === "all" ? d.cards : d.cards.filter(c => c.due <= iso())).map(c => c); queue = shuffle(queue);
  const total = queue.length; let done = 0, flipped = false, again = 0;
  const finish = () => { m.innerHTML = `<div class="page narrow"><div class="emptybox"><div class="big-ic">${ic("check")}</div><h3>${total ? "Geschafft!" : "Alles erledigt"}</h3><p>${total ? `${total} Karten durchgearbeitet, ${again}× „Nochmal“.` : "Heute sind keine Karten fällig. Komm morgen wieder – oder geh alle durch."}</p><div class="row" style="justify-content:center"><button class="btn accent" id="bk">Zum Stapel</button>${total ? "" : `<button class="btn ghost" id="al">Alle durchgehen</button>`}</div></div></div>`; $("#bk", m).onclick = () => go("cards/" + d.id); $("#al", m) && ($("#al", m).onclick = () => go("study/" + d.id + "/all")); };
  const show = () => {
    if (!queue.length) return finish(); const c = queue[0];
    m.innerHTML = `<div class="page narrow"><div class="hd"><button class="icon-btn" id="bk" aria-label="Beenden">${ic("x")}</button><span class="note">${done}/${total} · ${esc(d.title)}</span><span></span></div><div class="bar3"><i style="width:${total ? done / total * 100 : 0}%"></i></div>
    <div class="flip ${flipped ? "on" : ""}" id="fl"><div class="face front"><small>Frage</small><p>${esc(c.q)}</p><span class="tap">Tippen zum Umdrehen</span></div><div class="face back"><small>Antwort</small><p>${esc(c.a)}</p></div></div>
    <div class="rate" ${flipped ? "" : "hidden"}><button data-r="0" class="r0">Nochmal<small>1</small></button><button data-r="1" class="r1">Schwer<small>2</small></button><button data-r="2" class="r2">Gut<small>3</small></button><button data-r="3" class="r3">Leicht<small>4</small></button></div>${flipped ? "" : `<div class="row" style="justify-content:center;margin-top:18px"><button class="btn big accent" id="rv">Antwort zeigen</button></div>`}</div>`;
    $("#bk", m).onclick = () => go("cards/" + d.id); const flip = () => { flipped = true; show(); };
    $("#fl", m).onclick = () => { if (!flipped) flip(); }; $("#rv", m)?.addEventListener("click", flip);
    $$("[data-r]", m).forEach(b => b.onclick = () => rate(+b.dataset.r));
  };
  const rate = r => {
    const c = queue.shift(), real = d.cards.find(x => x.id === c.id); flipped = false; addRev(1);
    const dt = n => { const x = new Date(); x.setDate(x.getDate() + n); return iso(x); };
    if (r === 0) { real.box = 0; real.due = iso(); queue.push(c); again++; } else { real.box = r === 1 ? real.box : Math.min(5, real.box + (r === 3 ? 2 : 1)); real.due = dt(r === 1 ? 1 : INTERVALS[real.box] || 1); done++; }
    save(); show();
  };
  const key = e => { if (!$("#fl")) return; if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!flipped) { flipped = true; show(); } } else if (flipped && /^[1-4]$/.test(e.key)) rate(+e.key - 1); };
  document.addEventListener("keydown", key); LEAVE.push(() => document.removeEventListener("keydown", key));
  show();
};

/* ---------- quiz ---------- */
V.quiz = m => {
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Prüfungstraining</p><h1>Quiz</h1></div></div>
  <div class="panel"><h2>Neues Quiz</h2><div class="seg" id="qs"><button data-s="topic" class="on">Thema</button><button data-s="doc">Aus Dokument</button></div>
  <div id="q-topic"><input class="field" id="qt" placeholder="Thema, z. B. „Mitose und Meiose“ oder „Ableitungsregeln“"></div><div id="q-doc" hidden><select class="field" id="qd">${D.docs.filter(d => d.type !== "draw").map(d => `<option value="${d.id}">${esc(d.title)}</option>`).join("") || "<option value=''>Keine Dokumente</option>"}</select></div>
  <div class="row"><div><label class="lbl">Fragen</label><select class="field" id="qn"><option>5</option><option selected>8</option><option>12</option><option>20</option></select></div><div><label class="lbl">Schwierigkeit</label><select class="field" id="ql"><option>leicht</option><option selected>mittel</option><option>schwer</option></select></div></div>
  <div class="row end"><button class="btn accent big" id="qg">${ic("spark")}Quiz starten</button></div></div>
  ${D.quizzes.length ? `<div class="panel"><h2>Verlauf</h2>${D.quizzes.slice(0, 8).map(q => `<div class="li"><b>${esc(q.title)}</b><small>${q.score}/${q.total} richtig · ${fmtAgo(q.date)}</small><span class="pct ${q.score / q.total >= .7 ? "ok" : ""}">${Math.round(q.score / q.total * 100)}%</span></div>`).join("")}</div>` : ""}</div>`;
  if (quizPrefill) { $("#qt", m).value = quizPrefill.topic || ""; quizPrefill = null; if (!hasKey()) toast("Tipp: Themen-Quiz braucht die eingerichtete KI – mit „Aus Dokument“ geht es offline."); }
  let src = "topic"; $$("#qs button", m).forEach(b => b.onclick = () => { src = b.dataset.s; $$("#qs button", m).forEach(x => x.classList.toggle("on", x === b)); $("#q-topic", m).hidden = src !== "topic"; $("#q-doc", m).hidden = src !== "doc"; });
  $("#qg", m).onclick = async () => {
    const n = +$("#qn", m).value, lv = $("#ql", m).value; let title, text = "", qs = null;
    if (src === "topic") { title = $("#qt", m).value.trim(); if (!title) return toast("Bitte ein Thema eingeben"); if (!hasKey()) return toast("Themen-Quiz braucht die eingerichtete KI. Mit „Aus Dokument“ geht es auch offline."); }
    else { const d = D.docs.find(x => x.id === $("#qd", m).value); if (!d) return toast("Kein Dokument vorhanden"); title = d.title; text = await docText(d); if (text.length < 80) return toast("Dokument enthält zu wenig Text"); }
    $("#qg", m).disabled = true; $("#qg", m).textContent = "KI erstellt Fragen…";
    const fmt = `Antworte NUR mit JSON: [{"q":"","o":["","",""],"a":0,"e":"kurze Erklärung"}] (a = Index der richtigen Option).`;
    qs = parseJSON(await ai(src === "topic" ? `Erstelle ${n} Multiple-Choice-Fragen (Niveau ${isUni() ? "Universität" : "Schule"}, Schwierigkeit ${lv}) zum Thema „${title}“. ${fmt}` : `Erstelle ${n} Multiple-Choice-Fragen (Schwierigkeit ${lv}) zum Text. ${fmt}\nTEXT:\n${clip(text)}`, { max: 3500, quiet: true }));
    if (!Array.isArray(qs)) qs = localQuiz(text, n);
    if (!qs.length) { $("#qg", m).disabled = false; $("#qg", m).textContent = "Quiz starten"; return toast("Quiz konnte nicht erstellt werden"); }
    pendingQuiz = { title, qs: qs.filter(q => q.q && Array.isArray(q.o) && q.o.length > 1) }; go("quizrun");
  };
};
V.quizrun = m => {
  const Q = pendingQuiz; if (!Q || !Q.qs.length) return go("quiz");
  let i = 0, score = 0; const wrong = [];
  const show = () => {
    if (i >= Q.qs.length) return end(); const q = Q.qs[i];
    m.innerHTML = `<div class="page narrow"><div class="hd"><button class="icon-btn" id="bk" aria-label="Beenden">${ic("x")}</button><span class="note">${esc(Q.title)}</span><span class="note">${i + 1}/${Q.qs.length}</span></div><div class="bar3"><i style="width:${i / Q.qs.length * 100}%"></i></div>
    <div class="qcard"><h2>${esc(q.q)}</h2>${q.o.map((o, k) => `<button class="opt" data-k="${k}"><span>${"ABCD"[k]}</span>${esc(o)}</button>`).join("")}<div id="ex" class="explain" hidden></div><div class="row end"><button class="btn accent" id="nx" hidden>${i === Q.qs.length - 1 ? "Ergebnis" : "Weiter"}</button></div></div></div>`;
    $("#bk", m).onclick = () => go("quiz"); let answered = false;
    $$(".opt", m).forEach(b => b.onclick = () => { if (answered) return; answered = true; const k = +b.dataset.k, ok = k === q.a; if (ok) score++; else wrong.push(q); b.classList.add(ok ? "ok" : "no"); $$(".opt", m)[q.a]?.classList.add("ok"); if (q.e) { $("#ex", m).hidden = false; $("#ex", m).innerHTML = (ok ? "<b>Richtig.</b> " : "<b>Leider falsch.</b> ") + esc(q.e); } $("#nx", m).hidden = false; });
    $("#nx", m).onclick = () => { i++; show(); };
  };
  const end = () => {
    addRev(Q.qs.length); D.quizzes.unshift({ title: Q.title, score, total: Q.qs.length, date: Date.now() }); D.quizzes = D.quizzes.slice(0, 30); save();
    const p = Math.round(score / Q.qs.length * 100);
    m.innerHTML = `<div class="page narrow"><div class="result-big"><div class="ring" style="--p:${p}"><b>${p}%</b></div><h2>${p >= 85 ? "Hervorragend!" : p >= 60 ? "Gut gemacht!" : "Weiter üben!"}</h2><p>${score} von ${Q.qs.length} richtig</p><div class="row" style="justify-content:center">${wrong.length ? `<button class="btn ghost" id="wc">Falsche als Karteikarten</button>` : ""}<button class="btn ghost" id="ag">Nochmal</button><button class="btn accent" id="dn">Fertig</button></div></div>${wrong.length ? `<div class="panel"><h2>Zum Wiederholen</h2>${wrong.map(q => `<div class="wr"><b>${esc(q.q)}</b><span>Richtig: ${esc(q.o[q.a])}</span>${q.e ? `<small>${esc(q.e)}</small>` : ""}</div>`).join("")}</div>` : ""}</div>`;
    $("#dn", m).onclick = () => go("quiz"); $("#ag", m).onclick = () => { i = 0; score = 0; wrong.length = 0; show(); };
    $("#wc", m) && ($("#wc", m).onclick = () => cardsModal(wrong.map(q => ({ q: q.q.replace("_____", "…"), a: q.o[q.a] + (q.e ? " – " + q.e : "") })), Q.title + " – Wiederholen", Q.subjectId));
  };
  show();
};

/* ---------- planner ---------- */
const TYPES = { hw: "Hausaufgabe", task: "Aufgabe", exam: "Prüfung", project: "Referat/Projekt" };
let plTab = "tasks", calMonth = new Date();
function taskModal(task, date = "") {
  const t = task || { title: "", type: "hw", subjectId: "", due: date, note: "" };
  const { el, close } = modal(`<h3>${task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</h3><label class="lbl">Titel</label><input class="field" id="tt1" value="${esc(t.title)}" placeholder="z. B. Aufgaben S. 54 Nr. 3–7">
  <div class="row"><div><label class="lbl">Art</label><select class="field" id="tt2">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === t.type ? "selected" : ""}>${v}</option>`).join("")}</select></div><div><label class="lbl">Fällig am</label><input type="date" class="field" id="tt3" value="${t.due || ""}"></div></div>
  <label class="lbl">${isUni() ? "Modul" : "Fach"}</label>${subjectSelect(t.subjectId, "tt4")}<label class="lbl">Lernmaterial (zum Üben & für Lernziele)</label><select class="field" id="tt6"><option value="">– keins –</option>${D.docs.filter(d => d.type !== "draw").map(d => `<option value="${d.id}" ${d.id === t.docId ? "selected" : ""}>${esc(d.title)}</option>`).join("")}</select>
  <label class="lbl">Notiz / Lernziele</label><textarea class="field" id="tt5" rows="4">${esc(t.note || "")}</textarea><button class="btn ghost small" id="lz" type="button" style="margin-top:8px">${ic("star")}Lernziele ermitteln (KI)</button>
  <div class="row end">${task ? `<button class="btn danger ghost" id="tdel">Löschen</button>` : ""}<button class="btn accent" id="tsv">Speichern</button></div>`);
  setTimeout(() => $("#tt1", el).focus(), 30);
  $("#tsv", el).onclick = () => { const title = $("#tt1", el).value.trim(); if (!title) return toast("Bitte einen Titel eingeben"); Object.assign(t, { title, type: $("#tt2", el).value, due: $("#tt3", el).value, subjectId: $(".tt4", el).value, note: $("#tt5", el).value, docId: $("#tt6", el).value }); if (!task) D.tasks.push({ id: uid(), done: false, ...t }); save(); close(); toast("Gespeichert"); refreshNav(); renderView(); };
  $("#lz", el).onclick = async () => { const doc = D.docs.find(x => x.id === $("#tt6", el).value); const src = doc ? await docText(doc) : $("#tt5", el).value; if (!src || src.length < 15) return toast("Wähle zuerst Lernmaterial (z. B. OneNote-Seite) oder schreibe etwas in die Notiz."); $("#lz", el).disabled = true; const g = await extractGoals(src, $("#tt1", el).value || "die Prüfung"); $("#lz", el).disabled = false; const cur = $("#tt5", el).value.replace(/\n*Lernziele:[\s\S]*$/, ""); $("#tt5", el).value = (cur ? cur + "\n\n" : "") + "Lernziele:\n" + g; toast("Lernziele ergänzt"); };
  $("#tdel", el) && ($("#tdel", el).onclick = () => { D.tasks = D.tasks.filter(x => x !== task); save(); close(); renderView(); });
}
function ttModal(day, ev) {
  const e = ev || { day, start: "08:00", end: "08:45", subjectId: "", title: "", room: "" };
  const { el, close } = modal(`<h3>${ev ? "Stunde bearbeiten" : "Stunde hinzufügen"}</h3><label class="lbl">${isUni() ? "Modul" : "Fach"}</label>${subjectSelect(e.subjectId, "tm1")}<label class="lbl">Titel (optional)</label><input class="field" id="tm2" value="${esc(e.title)}" placeholder="z. B. Vorlesung">
  <div class="row"><div><label class="lbl">Von</label><input type="time" class="field" id="tm3" value="${e.start}"></div><div><label class="lbl">Bis</label><input type="time" class="field" id="tm4" value="${e.end}"></div><div><label class="lbl">Tag</label><select class="field" id="tm6">${["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"].map((n, i) => `<option value="${i}" ${i === e.day ? "selected" : ""}>${n}</option>`).join("")}</select></div></div><label class="lbl">Raum</label><input class="field" id="tm5" value="${esc(e.room || "")}">
  <div class="row end">${ev ? `<button class="btn ghost danger" id="mdel">Löschen</button>` : ""}<button class="btn accent" id="msv">Speichern</button></div>`);
  $("#msv", el).onclick = () => { Object.assign(e, { subjectId: $(".tm1", el).value, title: $("#tm2", el).value.trim(), start: $("#tm3", el).value || "08:00", end: $("#tm4", el).value || "08:45", room: $("#tm5", el).value.trim(), day: +$("#tm6", el).value }); if (!ev) D.tt.push({ id: uid(), ...e }); save(); close(); renderView(); };
  $("#mdel", el) && ($("#mdel", el).onclick = () => { D.tt = D.tt.filter(x => x !== ev); save(); close(); renderView(); });
}
V.planner = m => {
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Organisation</p><h1>Planer</h1></div><button class="btn accent" id="nt">${ic("plus")}Aufgabe</button></div><div class="seg wide" id="pt"><button data-t="tasks">Aufgaben</button><button data-t="tt">Stundenplan</button><button data-t="cal">Kalender</button></div><div id="pb"></div></div>`;
  $$("#pt button", m).forEach(b => { b.classList.toggle("on", b.dataset.t === plTab); b.onclick = () => { plTab = b.dataset.t; V.planner(m); }; });
  $("#nt", m).onclick = () => taskModal();
  const pb = $("#pb", m);
  if (plTab === "tasks") {
    const gs = [["Überfällig", x => x.due && daysUntil(x.due) < 0], ["Heute", x => x.due && daysUntil(x.due) === 0], ["Morgen", x => x.due && daysUntil(x.due) === 1], ["Diese Woche", x => x.due && daysUntil(x.due) > 1 && daysUntil(x.due) <= 7], ["Später", x => x.due && daysUntil(x.due) > 7], ["Ohne Datum", x => !x.due]];
    const evs = (D.ms?.events || []).filter(e => e.date >= iso() && daysUntil(e.date) <= 14).slice(0, 8);
    const open = D.tasks.filter(x => !x.done), row = x => `<label class="li task" data-e="${x.id}"><input type="checkbox" data-c="${x.id}" ${x.done ? "checked" : ""}><span class="sdot lg" style="background:${subj(x.subjectId)?.color || "#bbb"}"></span><div class="tm2"><b class="${x.done ? "strike" : ""}">${x.type === "exam" ? '<em class="xb">Prüfung</em> ' : ""}${esc(x.title)}</b><small>${esc(subj(x.subjectId)?.name || "")}${x.note ? " · " + esc(x.note) : ""}</small></div><small class="${x.due && daysUntil(x.due) < 0 && !x.done ? "red" : ""}">${x.due ? fmtD(x.due) : ""}</small></label>`;
    const html = gs.map(([n, f]) => { const l = open.filter(f).sort((a, b) => (a.due || "").localeCompare(b.due || "")); return l.length ? `<section class="panel"><h2 class="${n === "Überfällig" ? "red" : ""}">${n}<small>${l.length}</small></h2>${l.map(row).join("")}</section>` : ""; }).join("");
    const done = D.tasks.filter(x => x.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
    pb.innerHTML = (evs.length ? `<section class="panel tint2"><h2>${msLogoSvg()} Outlook-Termine<small>${evs.length}</small></h2>${evs.map(e => `<div class="li"><span class="tm">${e.date.slice(8)}.${e.date.slice(5, 7)}.<br><small>${e.time || "ganztägig"}</small></span><div class="tm2"><b>${esc(e.title)}</b><small>${esc(e.loc)}</small></div></div>`).join("")}</section>` : "") + (html || `<div class="emptybox"><div class="big-ic">${ic("todo")}</div><h3>Keine offenen Aufgaben</h3><p>Trage Hausaufgaben, Referate und Prüfungen ein – Lumi erinnert dich im Dashboard.</p></div>`) + (done.length ? `<details class="panel"><summary>Erledigt (${done.length})</summary>${done.map(row).join("")}</details>` : "");
    $$("[data-c]", pb).forEach(c => { c.onclick = e => e.stopPropagation(); c.onchange = () => { const x = D.tasks.find(y => y.id === c.dataset.c); x.done = c.checked; x.doneAt = Date.now(); save(); renderView(); }; });
    $$("[data-e]", pb).forEach(r => r.onclick = e => { if (e.target.matches("input")) return; e.preventDefault(); taskModal(D.tasks.find(x => x.id === r.dataset.e)); });
  } else if (plTab === "tt") {
    const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], n = D.tt.some(e => e.day >= 5) ? 7 : 5;
    pb.innerHTML = `<div class="ttgrid" style="--n:${n}">${days.slice(0, n).map((dn, di) => `<div class="ttcol"><div class="tth ${di === (new Date().getDay() + 6) % 7 ? "today" : ""}">${dn}</div>${D.tt.filter(e => e.day === di).sort((a, b) => a.start.localeCompare(b.start)).map(e => `<button class="ttcard" data-e="${e.id}" style="--c:${subj(e.subjectId)?.color || "#888"}"><b>${esc(e.title || subj(e.subjectId)?.name || "Stunde")}</b><small>${e.start}–${e.end}</small>${e.room ? `<small>${esc(e.room)}</small>` : ""}</button>`).join("")}<button class="ttadd" data-a="${di}">${ic("plus")}</button></div>`).join("")}</div>`;
    $$("[data-a]", pb).forEach(b => b.onclick = () => ttModal(+b.dataset.a)); $$("[data-e]", pb).forEach(b => b.onclick = () => ttModal(0, D.tt.find(x => x.id === b.dataset.e)));
  } else {
    const y = calMonth.getFullYear(), mo = calMonth.getMonth(), first = new Date(y, mo, 1), off = (first.getDay() + 6) % 7, dim = new Date(y, mo + 1, 0).getDate();
    pb.innerHTML = `<div class="calhd"><button class="icon-btn" id="cp">${ic("back")}</button><h2>${first.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}</h2><button class="icon-btn" id="cn" style="transform:scaleX(-1)">${ic("back")}</button></div><div class="calgrid">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => `<div class="calh">${d}</div>`).join("")}${Array(off).fill("<div></div>").join("")}${Array.from({ length: dim }, (_, i) => { const ds = iso(new Date(y, mo, i + 1)), ts = D.tasks.filter(t => t.due === ds && !t.done), ev = msEventsOn(ds); return `<button class="cald ${ds === iso() ? "today" : ""}" data-day="${ds}"><b>${i + 1}</b><span>${ts.slice(0, 3).map(t => `<i style="background:${t.type === "exam" ? "#e5484d" : subj(t.subjectId)?.color || "#888"}"></i>`).join("")}${ev.slice(0, 2).map(() => `<i class="sq"></i>`).join("")}</span></button>`; }).join("")}</div>`;
    $("#cp", pb).onclick = () => { calMonth = new Date(y, mo - 1, 1); V.planner(m); }; $("#cn", pb).onclick = () => { calMonth = new Date(y, mo + 1, 1); V.planner(m); };
    $$("[data-day]", pb).forEach(b => b.onclick = () => { const ts = D.tasks.filter(t => t.due === b.dataset.day), evd = msEventsOn(b.dataset.day); const { el } = modal(`<h3>${fmtD(b.dataset.day)}</h3>${evd.map(e => `<div class="li"><span class="sdot lg" style="background:#2563eb;border-radius:3px"></span><b>${esc(e.title)}</b><small>${e.time || ""} ${esc(e.loc)}</small></div>`).join("")}${ts.map(t => `<div class="li"><span class="sdot lg" style="background:${subj(t.subjectId)?.color || "#999"}"></span><b>${t.type === "exam" ? '<em class="xb">Prüfung</em> ' : ""}${esc(t.title)}</b></div>`).join("")}${ts.length || evd.length ? "" : `<p class="empty">Keine Einträge.</p>`}<div class="row end"><button class="btn accent" id="ad">Aufgabe hinzufügen</button></div>`); $("#ad", el).onclick = () => { el.closest(".mask").remove(); taskModal(null, b.dataset.day); }; });
  }
};

/* ---------- grades ---------- */
const SCALES = { de: { n: "Noten 1–6", min: 1, max: 6, lowGood: true, step: .1 }, pts: { n: "Punkte 0–15", min: 0, max: 15, lowGood: false, step: 1 }, pct: { n: "Prozent", min: 0, max: 100, lowGood: false, step: 1 } };
const SC = () => SCALES[D.profile.scale] || SCALES.de;
const gnorm = v => { const s = SC(); return s.lowGood ? (s.max - v) / (s.max - s.min) : (v - s.min) / (s.max - s.min); };
const gcol = v => { const n = gnorm(v); return n >= .7 ? "#0e9f6e" : n >= .45 ? "#f59e0b" : "#e5484d"; };
const wavg = l => { const w = l.reduce((a, g) => a + g.weight, 0); return w ? l.reduce((a, g) => a + g.value * g.weight, 0) / w : null; };
const gfmt = v => v == null ? "–" : (D.profile.scale === "de" ? v.toFixed(2).replace(".", ",") : Math.round(v * 10) / 10 + "");
function gradeModal(g) {
  const x = g || { subjectId: D.subjects[0]?.id || "", title: "", value: "", weight: 1, date: iso() };
  const { el, close } = modal(`<h3>${g ? "Note bearbeiten" : "Note eintragen"}</h3><label class="lbl">${isUni() ? "Modul" : "Fach"}</label>${subjectSelect(x.subjectId, "gm1")}<label class="lbl">Bezeichnung</label><input class="field" id="gm2" value="${esc(x.title)}" placeholder="Klassenarbeit, Test, mündlich, Klausur…">
  <div class="row"><div><label class="lbl">${SC().n}</label><input class="field" id="gm3" type="number" inputmode="decimal" step="${SC().step}" min="${SC().min}" max="${SC().max}" value="${x.value}"></div><div><label class="lbl">${isUni() ? "Gewicht / ECTS" : "Gewicht"}</label><input class="field" id="gm4" type="number" step=".5" min=".5" value="${x.weight}"></div><div><label class="lbl">Datum</label><input class="field" id="gm5" type="date" value="${x.date}"></div></div>
  <div class="row end">${g ? `<button class="btn ghost danger" id="gdel">Löschen</button>` : ""}<button class="btn accent" id="gsv">Speichern</button></div>`);
  $("#gsv", el).onclick = () => { const v = parseFloat(String($("#gm3", el).value).replace(",", ".")); if (isNaN(v) || v < SC().min || v > SC().max) return toast(`Wert zwischen ${SC().min} und ${SC().max}`); Object.assign(x, { subjectId: $(".gm1", el).value, title: $("#gm2", el).value.trim() || "Note", value: v, weight: parseFloat($("#gm4", el).value) || 1, date: $("#gm5", el).value || iso() }); if (!g) D.grades.push({ id: uid(), ...x }); save(); close(); renderView(); };
  $("#gdel", el) && ($("#gdel", el).onclick = () => { D.grades = D.grades.filter(y => y !== g); save(); close(); renderView(); });
}
V.grades = m => {
  const all = D.grades, avg = wavg(all), by = D.subjects.map(s => ({ s, l: D.grades.filter(g => g.subjectId === s.id) })).filter(x => x.l.length);
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">${SC().n}</p><h1>Noten</h1></div><div class="row"><button class="btn ghost" id="goal">${ic("star")}Zielrechner</button><button class="btn accent" id="ng">${ic("plus")}Note</button></div></div>
  <div class="tiles"><div class="tile big"><small>Gesamtschnitt</small><b style="color:${avg == null ? "inherit" : gcol(avg)}">${gfmt(avg)}</b></div><div class="tile"><small>Einträge</small><b>${all.length}</b></div><div class="tile"><small>Beste/r</small><b>${by.length ? esc([...by].sort((a, b) => SC().lowGood ? wavg(a.l) - wavg(b.l) : wavg(b.l) - wavg(a.l))[0].s.name) : "–"}</b></div></div>
  ${by.length ? `<div class="panel"><h2>Übersicht</h2>${by.map(({ s, l }) => { const a = wavg(l); return `<div class="gbar"><span class="gn"><i class="sdot" style="background:${s.color}"></i>${esc(s.name)}</span><div class="gtrack"><i style="width:${Math.max(4, gnorm(a) * 100)}%;background:${gcol(a)}"></i></div><b style="color:${gcol(a)}">${gfmt(a)}</b></div>`; }).join("")}</div>
  ${by.map(({ s, l }) => `<div class="panel"><h2><i class="sdot lg" style="background:${s.color}"></i>${esc(s.name)}<small>Ø ${gfmt(wavg(l))}</small></h2><div class="gchips">${l.sort((a, b) => a.date.localeCompare(b.date)).map(g => `<button class="gchip" data-g="${g.id}" style="--c:${gcol(g.value)}"><b>${gfmt(g.value)}</b><small>${esc(g.title)}${g.weight !== 1 ? " · ×" + g.weight : ""}</small></button>`).join("")}</div></div>`).join("")}` : `<div class="emptybox"><div class="big-ic">${ic("award")}</div><h3>Noch keine Noten</h3><p>Trage deine Noten ein und behalte Schnitt und Entwicklung im Blick. ${D.subjects.length ? "" : `Lege zuerst ${SUBJ()} an (Einstellungen).`}</p></div>`}</div>`;
  $("#ng", m).onclick = () => D.subjects.length ? gradeModal() : toast(`Lege zuerst ${SUBJ()} an (Einstellungen)`);
  $$("[data-g]", m).forEach(b => b.onclick = () => gradeModal(D.grades.find(g => g.id === b.dataset.g)));
  $("#goal", m).onclick = () => {
    const { el } = modal(`<h3>Zielrechner</h3><p class="note">Welche Note brauchst du noch für deinen Wunschschnitt?</p><label class="lbl">${isUni() ? "Modul" : "Fach"}</label>${subjectSelect(D.subjects[0]?.id || "", "zs")}<div class="row"><div><label class="lbl">Zielschnitt</label><input class="field" id="zt" type="number" step="${SC().step}" value="${SC().lowGood ? 2 : 12}"></div><div><label class="lbl">Gewicht nächste Note</label><input class="field" id="zw" type="number" step=".5" value="1"></div></div><div class="result" id="zr">–</div>`);
    const calc = () => { const l = D.grades.filter(g => g.subjectId === $(".zs", el).value), t = parseFloat($("#zt", el).value), w = parseFloat($("#zw", el).value) || 1; const W = l.reduce((a, g) => a + g.weight, 0), S = l.reduce((a, g) => a + g.value * g.weight, 0); const need = (t * (W + w) - S) / w; const ok = need >= SC().min - 1e-9 && need <= SC().max + 1e-9; $("#zr", el).innerHTML = isNaN(need) ? "–" : ok ? `Du brauchst mindestens <b style="font-size:26px">${gfmt(Math.round(need * 100) / 100)}</b>${SC().lowGood ? " (oder besser)" : ""}.` : need < SC().min ? "Ziel ist bereits sicher erreicht" : "Mit der nächsten Note ist dieses Ziel leider nicht mehr erreichbar."; };
    $$("input,select", el).forEach(i => i.oninput = calc); calc();
  };
};

/* ---------- focus timer ---------- */
const T = { mode: "focus", total: 25 * 60, left: 25 * 60, running: false, end: 0, subjectId: "", focusLen: 25, breakLen: 5, iv: null, started: 0 };
function beep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(); [0, .25, .5].forEach((t, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 660 + i * 110; g.gain.setValueAtTime(.2, c.currentTime + t); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + t + .22); o.connect(g); g.connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + .25); }); } catch {} }
const fmtT = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
function timerPaint() {
  const pill = $("#tpill"); if (pill) {
    const show = (T.running || T.left < T.total) && curView !== "today"; pill.style.setProperty("--p", ((1 - T.left / T.total) * 100).toFixed(1)); pill.hidden = false; pill.classList.toggle("show", !!show); pill.classList.toggle("run", !!T.running);
    if (!pill.firstChild) { pill.innerHTML = `<div class="tb-top"><i class="pd"></i><span class="tb-l"></span></div><b class="tb-t"></b><div class="tb-bar"><i></i></div><div class="tb-act"><button data-a="t" aria-label="Start oder Pause"></button><button data-a="x" aria-label="Zurücksetzen">${ic("x")}</button></div>`; pill.onclick = e => { const a = e.target.closest("button")?.dataset.a; if (a === "t") timerToggle(); else if (a === "x") timerReset(); else go("focus"); }; }
    $(".tb-l", pill).textContent = T.mode === "focus" ? "Fokus" + (T.subjectId && subj(T.subjectId) ? " · " + subj(T.subjectId).name : "") : "Pause"; $(".tb-t", pill).textContent = fmtT(T.left); $(".tb-bar i", pill).style.width = (1 - T.left / T.total) * 100 + "%";
    const tg = $('[data-a="t"]', pill), want = T.running ? "pause" : "play"; if (tg.dataset.i !== want) { tg.dataset.i = want; tg.innerHTML = ic(want); }
  }
  const r = $("#tring"); if (r) { r.style.setProperty("--p", (1 - T.left / T.total) * 100); $("#tt-time").textContent = fmtT(T.left); $("#tt-mode").textContent = T.mode === "focus" ? "Fokus" : "Pause"; $("#tt-go").innerHTML = T.running ? ic("pause") + "Pause" : ic("play") + (T.left < T.total ? "Weiter" : "Start"); }
}
function timerTick() {
  T.left = Math.max(0, Math.round((T.end - Date.now()) / 1000));
  if (T.left <= 0) { clearInterval(T.iv); T.running = false; beep(); if (T.mode === "focus") { addMin(Math.round(T.total / 60)); toast(`${Math.round(T.total / 60)} Min. Fokus geschafft!`); } else toast("Pause vorbei – weiter geht's!"); const was = T.mode, doneMin = Math.round(T.total / 60); T.mode = T.mode === "focus" ? "break" : "focus"; T.total = T.left = (T.mode === "focus" ? T.focusLen : T.breakLen) * 60; timeUp(was, doneMin); if (curView === "focus") renderView(); }
  timerPaint(); if (curView === "focus" && T.left === T.total) timerPaint();
}
function timeUp(was, min) {
  $("#tup")?.remove(); const el = document.createElement("div"); el.id = "tup"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  const nextLbl = T.mode === "break" ? `Pause starten · ${T.breakLen} Min.` : `Nächste Runde · ${T.focusLen} Min.`;
  el.innerHTML = `<i class="tu-b b1"></i><i class="tu-b b2"></i><div class="tu-in"><div class="tu-ring"><span>${ic(was === "focus" ? "check" : "timer")}</span></div><p class="eyebrow">${was === "focus" ? "Fokuszeit geschafft" : "Pause vorbei"}</p><h1>${was === "focus" ? "Zeit abgelaufen" : "Weiter geht’s"}</h1><p class="tu-sub">${was === "focus" ? `${min} Minuten konzentriert gelernt – gönn dir jetzt eine kurze Pause.` : "Bereit für die nächste Runde?"}</p><div class="row" style="justify-content:center"><button class="btn big accent" id="tu-go">${nextLbl}</button><button class="btn big ghost" id="tu-x">Schließen</button></div></div>`;
  document.body.appendChild(el); requestAnimationFrame(() => el.classList.add("show"));
  const close = go2 => { el.classList.remove("show"); setTimeout(() => el.remove(), 450); document.removeEventListener("keydown", kd); if (go2 && !T.running) timerToggle(); };
  const kd = e => { if (e.key === "Escape") close(false); }; document.addEventListener("keydown", kd);
  $("#tu-go", el).onclick = () => close(true); $("#tu-x", el).onclick = () => close(false); setTimeout(() => $("#tu-go", el)?.focus(), 400);
}
function timerToggle() { if (T.running) { clearInterval(T.iv); T.running = false; } else { T.running = true; T.end = Date.now() + T.left * 1000; if (T.left === T.total && T.mode === "focus") T.started = Date.now(); T.iv = setInterval(timerTick, 500); } timerPaint(); }
function timerReset() { const el = T.total - T.left; if (T.mode === "focus" && el >= 60) { addMin(Math.floor(el / 60)); toast(`${Math.floor(el / 60)} Min. gespeichert`); } clearInterval(T.iv); T.running = false; T.left = T.total; timerPaint(); }
function timerSet(f, b) { clearInterval(T.iv); T.running = false; T.focusLen = f; T.breakLen = b; T.mode = "focus"; T.total = T.left = f * 60; }
V.focus = m => {
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return [d.toLocaleDateString("de-DE", { weekday: "short" }), D.stats.days[iso(d)] || 0]; }), mx = Math.max(30, ...week.map(w => w[1]));
  m.innerHTML = `<div class="page narrow"><div class="hd"><div><p class="eyebrow">Pomodoro</p><h1>Fokus</h1></div></div>
  <div class="timerbox"><div class="tring" id="tring"><div class="inner"><small id="tt-mode">Fokus</small><b id="tt-time">25:00</b></div></div>
  <div class="row" style="justify-content:center"><button class="btn big accent" id="tt-go"></button><button class="btn big ghost" id="tt-rs">${ic("rot")}Zurück</button></div>
  <div class="chips" style="justify-content:center;margin-top:18px">${[[25, 5], [50, 10], [15, 3], [90, 15]].map(([f, b]) => `<button class="chip ${T.focusLen === f ? "on" : ""}" data-p="${f},${b}">${f}/${b} Min.</button>`).join("")}</div><div style="max-width:260px;margin:14px auto 0">${subjectSelect(T.subjectId, "ts")}</div></div>
  <div class="panel"><h2>Lernzeit der letzten 7 Tage<small>${week.reduce((a, w) => a + w[1], 0)} Min.</small></h2><div class="bars2">${week.map(([d, v]) => `<div><i style="height:${Math.max(4, v / mx * 100)}%" title="${v} Min."></i><small>${d}</small><b>${v || ""}</b></div>`).join("")}</div></div></div>`;
  $("#tt-go", m).onclick = timerToggle; $("#tt-rs", m).onclick = timerReset;
  $$("[data-p]", m).forEach(b => b.onclick = () => { const [f, bb] = b.dataset.p.split(",").map(Number); timerSet(f, bb); V.focus(m); });
  $(".ts", m).onchange = e => T.subjectId = e.target.value; timerPaint();
};

/* ---------- AI chat ---------- */
const MODES = { tutor: ["Erklären", "Erkläre Konzepte Schritt für Schritt mit Beispielen und stelle am Ende eine kurze Verständnisfrage."], quiz: ["Abfragen", "Stelle mir genau EINE Frage nach der anderen zum Thema, werte meine Antwort, erkläre kurz und stelle dann die nächste."], hw: ["Hausaufgaben", "Hausaufgabenhilfe: gib Hinweise und Teilschritte, lass mich selbst auf die Lösung kommen; zeige die vollständige Lösung nur, wenn ich ausdrücklich darum bitte."], sum: ["Zusammenfassen", "Fasse zusammen, was ich dir gebe, in klaren Stichpunkten."], plan: ["Lernplan", "Erstelle einen realistischen, konkreten Lernplan mit Zeitblöcken."] };
let chatMode = "tutor", chatCtx = new Set(), chatImg = null, recog = null;
async function ctxText() { let out = ""; for (const id of chatCtx) { const d = D.docs.find(x => x.id === id); if (d) out += `\n--- ${d.title} ---\n${(await docText(d)).slice(0, 12000)}\n`; } return out.slice(0, 30000); }
function chatState() {
  D.chats = D.chats || []; D.cprojects = D.cprojects || [];
  if (!D.chats.length) { D.chats.push({ id: uid(), title: "Neuer Chat", projectId: "", instr: "", msgs: Array.isArray(D.chat) ? D.chat : [], updated: Date.now() }); D.chat = []; }
  let c = D.chats.find(x => x.id === D.curChat); if (!c) { c = D.chats[0]; D.curChat = c.id; } return c;
}
const chatMsgs = () => chatState().msgs;
function chatInstr() { const c = chatState(), p = D.cprojects.find(x => x.id === c.projectId); return [p && p.instr ? `Projekt „${p.name}“ – Anweisungen: ${p.instr}` : "", c.instr ? `Anweisungen für diesen Chat: ${c.instr}` : ""].filter(Boolean).join("\n"); }
function newChat(projectId = "") { const c = { id: uid(), title: "Neuer Chat", projectId, instr: "", msgs: [], updated: Date.now() }; D.chats.unshift(c); D.curChat = c.id; save(); return c; }
function mountChat(box, compact) {
  const draw = () => {
    const msgs = $(".msgs", box); msgs.innerHTML = (chatMsgs().length ? chatMsgs() : [{ role: "assistant", text: `Hi${D.profile.name ? " " + D.profile.name.split(" ")[0] : ""}! Ich bin dein Lern-Tutor. Frag mich etwas, lass dir ein Thema erklären.${hasKey() ? "" : "\n\n(Die KI ist noch nicht eingerichtet – siehe Einstellungen → KI.)"}` }]).map((x, i) => `<div class="m ${x.role === "user" ? "u" : "a"}">${x.img ? `<img src="${x.img}" alt="">` : ""}${x.fresh ? streamHtml(x.text) : esc(x.text)}${x.acts?.length ? `<div class="acts" style="--base:${x.fresh ? Math.min(2600, (x.text.split(/\s+/).length) * 30 + 200) : 0}ms">${x.acts.map(a => `<${a.go ? "button" : "span"} class="act ${a.err ? "err" : ""}" ${a.go ? `data-ag="${esc(a.go)}"` : ""}>${ic(a.err ? "x" : "check")}<span>${esc(a.label)}</span></${a.go ? "button" : "span"}>`).join("")}</div>` : ""}${x.role === "assistant" && D.chat.length ? `<div class="macts"><button data-cp="${i}" title="Kopieren">${ic("copy")}</button><button data-sv="${i}" title="Als Notiz speichern">${ic("note")}</button></div>` : ""}</div>`).join("");
    msgs.scrollTop = msgs.scrollHeight;
    $$("[data-ag]", msgs).forEach(b => b.onclick = () => go(b.dataset.ag));
    $$("[data-cp]", msgs).forEach(b => b.onclick = () => { navigator.clipboard?.writeText(chatMsgs()[+b.dataset.cp].text); toast("Kopiert"); });
    $$("[data-sv]", msgs).forEach(b => b.onclick = () => newNote("", textToHtml(chatMsgs()[+b.dataset.sv].text), "KI-Notiz"));
    const cx = $(".ctxbar", box); if (cx) cx.innerHTML = chatCtx.size ? `${ic("file")} ${chatCtx.size} Dokument${chatCtx.size > 1 ? "e" : ""} als Kontext <button data-clr>entfernen</button>` : ""; if (cx) cx.hidden = !chatCtx.size; $("#att", box)?.classList.toggle("on", chatCtx.size > 0);
    $("[data-clr]", box)?.addEventListener("click", () => { chatCtx.clear(); draw(); }); $("[data-pick]", box)?.addEventListener("click", pickCtx);
    const pv = $(".imgprev", box); if (pv) { pv.hidden = !chatImg; pv.innerHTML = chatImg ? `<img src="${chatImg.url}" alt=""><button aria-label="Entfernen">${ic("x")}</button>` : ""; $("button", pv)?.addEventListener("click", () => { chatImg = null; draw(); }); }
  };
  const pickCtx = () => { const { el, close } = modal(`<h3>Kontext wählen</h3><p class="note">Die KI beantwortet Fragen anhand dieser Dokumente.</p><div class="pick">${D.docs.filter(d => d.type !== "draw").map(d => `<label class="li"><input type="checkbox" value="${d.id}" ${chatCtx.has(d.id) ? "checked" : ""}><b>${esc(d.title)}</b><small>${esc(subj(d.subjectId)?.name || "")}</small></label>`).join("") || `<p class="empty">Keine Dokumente.</p>`}</div><div class="row end"><button class="btn accent" id="ok">Übernehmen</button></div>`); $("#ok", el).onclick = () => { chatCtx = new Set($$("input:checked", el).map(i => i.value)); close(); draw(); }; };
  const send = async text => {
    text = (text || "").trim(); if (!text && !chatImg) return; const img = chatImg; chatImg = null;
    { const cc = chatState(); cc.msgs.push({ role: "user", text: text || "Bitte erkläre das Bild.", img: img?.url }); cc.updated = Date.now(); if (cc.title === "Neuer Chat" && text) cc.title = text.slice(0, 40); } draw(); window.onChatsChanged && window.onChatsChanged();
    const msgs = $(".msgs", box); msgs.insertAdjacentHTML("beforeend", `<div class="m a think">${ic("spark")}<span class="shim">Die KI denkt nach …</span></div>`); msgs.scrollTop = msgs.scrollHeight;
    const c = await ctxText(); let r;
    if (hasKey()) r = await ai(text || "Bitte erkläre das Bild.", { system: sysBase(MODES[chatMode][1] + (chatInstr() ? "\n\n" + chatInstr() : "") + "\n\n" + AGENT_RULES + "\n\nAktueller Stand der App:\n" + agentContext() + (msContext() ? `\nDaten des Lernenden aus Microsoft 365 (Kalender, Teams, OneNote) – nutze sie, wenn nach Terminen, Prüfungen oder Aufgaben gefragt wird. Heute ist ${iso()}.\n${msContext()}` : "") + (c ? `\nNutze diese Unterlagen des Lernenden als Grundlage:\n${c}` : "")), history: D.chat.slice(-11, -1).map(x => ({ role: x.role, text: x.text })), max: 2000, image: img ? { data: img.data, type: "image/jpeg" } : null });
    else { await new Promise(r => setTimeout(r, 500)); r = msContext() && /prüfung|klausur|test|termin|kalender|aufgabe|hausaufgabe|lernziel/i.test(text) ? "Das steht aktuell in deinem Microsoft-Konto:\n\n" + msContext() + "\n\n(Demo-Modus – mit eingerichteter KI beantworte ich gezielte Fragen dazu.)" : c && chatMode === "sum" ? "Zusammenfassung (lokal):\n" + localSummary(c) : "Die KI ist noch nicht eingerichtet, deshalb kann ich keine echten Antworten erzeugen. Hinterlege unter Einstellungen → KI den Gemini-Key (Vercel) – dann erkläre ich Themen, frage dich ab und helfe bei Hausaufgaben. Zusammenfassungen, Karteikarten und Quiz aus Dokumenten funktionieren schon jetzt auch offline."; }
    let acts = []; if (r && hasKey()) { try { const o = await runAgent(r); r = o.text; acts = o.acts; } catch (e) { r = r.replace(/<lumi-actions>[\s\S]*/i, "").trim(); } }
    { const cc = chatState(); cc.msgs.push({ role: "assistant", text: r || "Das hat leider nicht geklappt. Versuche es bitte noch einmal.", acts, fresh: true }); cc.msgs = cc.msgs.slice(-80); cc.updated = Date.now(); draw(); cc.msgs.forEach(x => delete x.fresh); }
    save();
  };
  box.innerHTML = `${compact ? `<header>${ic("spark")}<b>KI-Tutor</b><button class="icon-btn" data-full title="Vollbild">${ic("up")}</button><button class="icon-btn" data-close aria-label="Schließen">${ic("x")}</button></header>` : ""}<div class="modes" ${compact ? "hidden" : ""}>${Object.entries(MODES).map(([k, v]) => `<button class="chip ${chatMode === k ? "on" : ""}" data-m="${k}">${v[0]}</button>`).join("")}</div><div class="ctxbar"></div><div class="msgs"></div><div class="imgprev" hidden></div>
  <form class="t-in"><button type="button" class="icon-btn" id="cam" title="Foto / Bild" aria-label="Bild anhängen">${ic("camera")}</button><input type="file" id="cfi" accept="image/*" hidden><input class="tin" placeholder="Frag etwas oder beschreibe deine Aufgabe…" aria-label="Nachricht"><button type="button" class="icon-btn" id="att" title="Dokumente anheften" aria-label="Dokumente anheften">${ic("clip")}</button><button class="send" aria-label="Senden">${ic("up")}</button></form>${compact ? "" : `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn ghost small" id="clr">Verlauf löschen</button></div>`}`;
  $$("[data-m]", box).forEach(b => b.onclick = () => { chatMode = b.dataset.m; $$("[data-m]", box).forEach(x => x.classList.toggle("on", x === b)); });
  $(".t-in", box).onsubmit = e => { e.preventDefault(); const i = $(".tin", box); const v = i.value; i.value = ""; send(v); };
  $("#cam", box).onclick = () => $("#cfi", box).click();
  $("#cfi", box).onchange = async e => { const f = e.target.files[0]; if (!f) return; chatImg = { data: await blobToJpeg(f), url: "data:image/jpeg;base64," + (await blobToJpeg(f, 300)) }; e.target.value = ""; draw(); if (!hasKey()) toast("Bild-Analyse braucht die eingerichtete KI"); };
  $("#att", box).onclick = pickCtx;
  $("#clr", box)?.addEventListener("click", async () => { if (await confirmBox("Chatverlauf löschen?")) { chatState().msgs = []; save(); draw(); } });
  $("[data-close]", box)?.addEventListener("click", () => box.hidden = true); $("[data-full]", box)?.addEventListener("click", () => { box.hidden = true; go("ai"); });
  draw();
  if (chatPrefill) { const p = chatPrefill; chatPrefill = ""; send(p); }
}
V.ai = m => {
  m.classList.add("aipg"); if ($("#cpanel")) $("#cpanel").hidden = true;
  let filter = "";
  const page = () => {
    const cur = chatState();
    m.innerHTML = `<div class="aip"><aside class="aip-l" id="aipl"></aside><section class="aip-r"><header class="aip-t"><span class="ai-ic aip-logo"></span><button class="icon-btn aip-mob" id="cmob" aria-label="Chats">${ic("menu")}</button><input id="ct" value="${esc(cur.title)}" aria-label="Chat-Titel" maxlength="60"><div class="aip-ta"><span class="aip-pj" id="cpj"></span><button class="btn small" id="ci">${ic("spark")}Anweisungen</button></div></header><div class="chatbox flat" id="cbox"></div></section></div>`;
    aside(); mountChat($("#cbox", m), false); hdr();
    $("#ct", m).onchange = e => { chatState().title = e.target.value.trim() || "Neuer Chat"; save(); aside(); };
    $("#ci", m).onclick = instrModal; $("#cmob", m).onclick = e => menu(e.currentTarget, [{ label: "Neuer Chat", icon: "plus", fn: () => { newChat(filter); page(); } }, ...D.chats.slice(0, 12).map(c => ({ label: c.title, icon: "note", fn: () => { D.curChat = c.id; page(); } }))]);
  };
  const hdr = () => { const c = chatState(), p = D.cprojects.find(x => x.id === c.projectId); const e = $("#cpj", m); if (e) e.textContent = p ? p.name : ""; };
  const aside = () => {
    const box = $("#aipl", m); if (!box) return; const cur = chatState();
    const list = D.chats.filter(c => !filter || c.projectId === filter).sort((a, b) => b.updated - a.updated);
    box.innerHTML = `<button class="aip-new" id="cn">${ic("plus")}<span>Neuer Chat</span></button>
      <div class="aip-h"><span>Projekte</span><button class="icon-btn sm" id="pn" aria-label="Neues Projekt">${ic("plus")}</button></div>
      <div class="aip-list">${D.cprojects.map(p => `<div class="aip-i ${filter === p.id ? "on" : ""}" data-p="${p.id}" tabindex="0">${ic("folder")}<span>${esc(p.name)}</span><button class="aip-m" data-pm="${p.id}" aria-label="Projekt-Menü">${ic("more")}</button></div>`).join("") || `<p class="aip-e">Gruppiere Chats mit gemeinsamen Anweisungen.</p>`}</div>
      <div class="aip-h"><span>${filter ? esc(D.cprojects.find(x => x.id === filter)?.name || "Chats") : "Chats"}</span>${filter ? `<button class="link" id="pall">Alle</button>` : ""}</div>
      <div class="aip-list aip-chats">${list.map(c => `<div class="aip-i ${c.id === cur.id ? "on" : ""}" data-c="${c.id}" tabindex="0"><span>${esc(c.title)}</span><button class="aip-m" data-cm="${c.id}" aria-label="Chat-Menü">${ic("more")}</button></div>`).join("") || `<p class="aip-e">Keine Chats</p>`}</div>`;
    $("#cn", box).onclick = () => { newChat(filter); page(); };
    $("#pn", box).onclick = () => projModal();
    $("#pall", box) && ($("#pall", box).onclick = () => { filter = ""; aside(); });
    $$("[data-c]", box).forEach(b => b.onclick = e => { if (e.target.closest("[data-cm]")) return; D.curChat = b.dataset.c; save(); page(); });
    $$("[data-p]", box).forEach(b => b.onclick = e => { if (e.target.closest("[data-pm]")) return; filter = filter === b.dataset.p ? "" : b.dataset.p; aside(); });
    $$("[data-cm]", box).forEach(b => b.onclick = e => { e.stopPropagation(); const c = D.chats.find(x => x.id === b.dataset.cm); menu(b, [{ label: "Anweisungen", icon: "spark", fn: () => { D.curChat = c.id; page(); instrModal(); } }, { label: "Löschen", icon: "trash", fn: async () => { if (!await confirmBox(`„${c.title}“ löschen?`)) return; D.chats = D.chats.filter(x => x.id !== c.id); if (!D.chats.length) newChat(); D.curChat = D.chats[0].id; save(); page(); } }]); });
    $$("[data-pm]", box).forEach(b => b.onclick = e => { e.stopPropagation(); const p = D.cprojects.find(x => x.id === b.dataset.pm); menu(b, [{ label: "Bearbeiten", icon: "edit", fn: () => projModal(p) }, { label: "Neuer Chat im Projekt", icon: "plus", fn: () => { filter = p.id; newChat(p.id); page(); } }, { label: "Löschen", icon: "trash", fn: async () => { if (!await confirmBox(`Projekt „${p.name}“ löschen? Die Chats bleiben erhalten.`)) return; D.chats.forEach(c => { if (c.projectId === p.id) c.projectId = ""; }); D.cprojects = D.cprojects.filter(x => x.id !== p.id); if (filter === p.id) filter = ""; save(); aside(); hdr(); } }]); });
  };
  window.onChatsChanged = () => { if ($("#aipl", m)) { aside(); const t = $("#ct", m); if (t && document.activeElement !== t) t.value = chatState().title; } else window.onChatsChanged = null; };
  const instrModal = () => {
    const c = chatState(), p = D.cprojects.find(x => x.id === c.projectId);
    const { el, close } = modal(`<h3>Anweisungen für diesen Chat</h3><p class="note">Die KI beachtet diese Regeln in jeder Antwort dieses Chats.</p>
      <textarea class="field" id="in-c" rows="5" placeholder="z. B. Antworte kurz, in einfachen Worten und mit einem Beispiel aus dem Alltag.">${esc(c.instr)}</textarea>
      <label class="lbl">Projekt</label><select class="field" id="in-p"><option value="">Kein Projekt</option>${D.cprojects.map(x => `<option value="${x.id}" ${x.id === c.projectId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>
      ${p ? `<p class="note">Zusätzlich gelten die Anweisungen des Projekts „${esc(p.name)}“.</p>` : ""}
      <div class="row end" style="margin-top:14px"><button class="btn primary" id="in-s">Speichern</button></div>`);
    $("#in-s", el).onclick = () => { c.instr = $("#in-c", el).value.trim(); c.projectId = $("#in-p", el).value; save(); close(); aside(); hdr(); toast("Anweisungen gespeichert"); };
  };
  const projModal = p => {
    const { el, close } = modal(`<h3>${p ? "Projekt bearbeiten" : "Neues Projekt"}</h3><label class="lbl">Name</label><input class="field" id="pj-n" maxlength="40" value="${esc(p?.name || "")}" placeholder="z. B. Biologie-Abitur">
      <label class="lbl">Anweisungen für alle Chats im Projekt</label><textarea class="field" id="pj-i" rows="5" placeholder="z. B. Ich lerne für das Abitur. Erkläre auf Oberstufen-Niveau und frage mich am Ende ab.">${esc(p?.instr || "")}</textarea>
      <div class="row end" style="margin-top:14px"><button class="btn primary" id="pj-s">${p ? "Speichern" : "Anlegen"}</button></div>`);
    setTimeout(() => $("#pj-n", el).focus(), 50);
    $("#pj-s", el).onclick = () => { const n = $("#pj-n", el).value.trim(); if (!n) return toast("Bitte einen Namen eingeben"); if (p) { p.name = n; p.instr = $("#pj-i", el).value.trim(); } else { const np = { id: uid(), name: n, instr: $("#pj-i", el).value.trim() }; D.cprojects.push(np); filter = np.id; } save(); close(); aside(); hdr(); };
  };
  page();
};
function mountDock() {
  const p = $("#aipane"); if (!p) return;
  const wasOpen = p.classList.contains("open");
  p.innerHTML = `<button class="hai-h" id="hai-t" aria-expanded="${wasOpen}"><span class="ai-ic">${ic("spark")}</span><div><b>KI-Tutor</b><small>Frag etwas zu deinen Unterlagen</small></div><i class="hai-chev">${ic("chev")}</i></button><div class="chatbox flat" id="hcb"></div>`;
  mountChat($("#hcb", p), false);
  const tog = o => { p.classList.toggle("open", o); $("#hai-t", p).setAttribute("aria-expanded", o); };
  $("#hai-t", p).onclick = () => tog(!p.classList.contains("open"));
  $(".t-in", p).addEventListener("submit", () => tog(true), true); $(".tin", p).addEventListener("focus", () => tog(true));
}
function toggleChatPanel() { const p = $("#cpanel"); if (p.hidden) { p.hidden = false; mountChat(p, true); } else p.hidden = true; }

/* ---------- search ---------- */
V.search = async m => {
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Strg/Cmd + K</p><h1>Suche</h1></div></div><div class="searchbox big">${ic("search")}<input id="sq" placeholder="Dokumente, Aufgaben, Karteikarten durchsuchen…" autofocus></div><div id="sr"></div></div>`;
  const draw = () => {
    const q = $("#sq", m).value.trim().toLowerCase(); const sr = $("#sr", m); if (!q) { sr.innerHTML = `<p class="empty">Tippe, um alles zu durchsuchen.</p>`; return; }
    const docs = D.docs.filter(d => (d.title + " " + (d.text || "")).toLowerCase().includes(q)), tasks = D.tasks.filter(t => (t.title + " " + (t.note || "")).toLowerCase().includes(q)), cards = D.decks.flatMap(d => d.cards.map(c => ({ ...c, d }))).filter(c => (c.q + " " + c.a).toLowerCase().includes(q)).slice(0, 12);
    const snip = d => { const t = d.text || "", i = t.toLowerCase().indexOf(q); return i < 0 ? "" : "…" + esc(t.slice(Math.max(0, i - 40), i + 80)) + "…"; };
    sr.innerHTML = `${docs.length ? `<section class="panel"><h2>Dokumente<small>${docs.length}</small></h2>${docs.slice(0, 15).map(d => `<button class="li hit" data-d2="${d.id}">${ic(d.type === "note" ? "note" : d.type === "draw" ? "brush" : "file")}<div class="tm2"><b>${esc(d.title)}</b><small>${snip(d)}</small></div></button>`).join("")}</section>` : ""}${tasks.length ? `<section class="panel"><h2>Aufgaben<small>${tasks.length}</small></h2>${tasks.map(t => `<button class="li hit" data-go="planner">${ic("todo")}<b>${esc(t.title)}</b><small>${t.due ? fmtD(t.due) : ""}</small></button>`).join("")}</section>` : ""}${cards.length ? `<section class="panel"><h2>Karteikarten<small>${cards.length}</small></h2>${cards.map(c => `<button class="li hit" data-k2="${c.d.id}">${ic("cards")}<div class="tm2"><b>${esc(c.q)}</b><small>${esc(c.a)}</small></div></button>`).join("")}</section>` : ""}${docs.length + tasks.length + cards.length ? "" : `<p class="empty">Nichts gefunden.</p>`}`;
    $$("[data-d2]", sr).forEach(b => b.onclick = () => openDoc(D.docs.find(d => d.id === b.dataset.d2))); $$("[data-k2]", sr).forEach(b => b.onclick = () => go("cards/" + b.dataset.k2)); $$("[data-go]", sr).forEach(b => b.onclick = () => go("planner"));
  };
  if (searchPrefill) { $("#sq", m).value = searchPrefill; searchPrefill = ""; }
  $("#sq", m).oninput = debounce(draw, 150); draw(); setTimeout(() => $("#sq", m)?.focus(), 30);
};

/* ---------- settings ---------- */
async function exportAll() {
  toast("Export wird vorbereitet…"); const out = { app: "lumi", v: 1, data: D, html: {}, draw: {}, ink: {}, ann: {}, db: {}, blobs: {} };
  for (const d of D.docs) { if (d.type === "note") { out.html[d.id] = await KV.get("html:" + d.id); const ik = await KV.get("ink:" + d.id); if (ik?.length) out.ink[d.id] = ik; } else if (d.type === "draw") out.draw[d.id] = await KV.get("draw:" + d.id); else { const b = await KV.get("blob:" + d.id); if (b) out.blobs[d.id] = await blobToDataURL(b); } }
  for (const d of D.docs) { const ik = await KV.get("ink:" + d.id); if (ik?.length) out.ink[d.id] = ik; const an = await KV.get("ann:" + d.id); if (an?.length) out.ann[d.id] = an; if (d.type === "db") out.db[d.id] = await KV.get("db:" + d.id); }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" })); a.download = `lumi-backup-${iso()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
async function importAll(file) {
  try { const j = JSON.parse(await file.text()); if (j.app !== "lumi") throw 0; if (!(await confirmBox("Aktuelle Daten durch das Backup ersetzen?", "Ersetzen"))) return;
    D = Object.assign(DEFAULT(), j.data); for (const [k, v] of Object.entries(j.html || {})) await KV.set("html:" + k, v); for (const [k, v] of Object.entries(j.draw || {})) await KV.set("draw:" + k, v); for (const [k, v] of Object.entries(j.ink || {})) await KV.set("ink:" + k, v); for (const [k, v] of Object.entries(j.ann || {})) await KV.set("ann:" + k, v); for (const [k, v] of Object.entries(j.db || {})) await KV.set("db:" + k, v); for (const [k, v] of Object.entries(j.blobs || {})) await KV.set("blob:" + k, await (await fetch(v)).blob()); await KV.set("data", D); toast("Backup geladen"); location.reload();
  } catch { toast("Ungültige Backup-Datei"); }
}
V.settings = m => {
  const p = D.profile;
  m.innerHTML = `<div class="page narrow"><div class="hd"><div><p class="eyebrow">Persönlich</p><h1>Einstellungen</h1></div></div>
  <div class="panel"><h2>${ic("adduser")}Profil</h2><label class="lbl">Name</label><input class="field" id="sn" value="${esc(p.name)}"><label class="lbl">Ich bin</label><div class="seg" id="sl"><button data-l="school" class="${p.level === "school" ? "on" : ""}">Schüler:in</button><button data-l="uni" class="${p.level === "uni" ? "on" : ""}">Student:in</button></div><label class="lbl">Tagesziel (Minuten Lernzeit)</label><input class="field" id="sg" type="number" min="5" max="600" value="${p.goalMin || 45}"><label class="lbl">Notensystem</label><select class="field" id="ss">${Object.entries(SCALES).map(([k, v]) => `<option value="${k}" ${p.scale === k ? "selected" : ""}>${v.n}</option>`).join("")}</select></div>
  <div class="panel"><h2>${SUBJ()}</h2><div class="subjed">${D.subjects.map(s => `<div class="li"><input type="color" value="${s.color}" data-c="${s.id}"><input class="field slim" value="${esc(s.name)}" data-n="${s.id}"><button class="icon-btn" data-x="${s.id}" aria-label="Löschen">${ic("trash")}</button></div>`).join("")}</div><button class="btn ghost" id="as">${ic("plus")}${isUni() ? "Modul" : "Fach"} hinzufügen</button></div>
  <div class="panel"><h2>${ic("spark")}KI</h2>
  ${serverAI ? `<div class="msstate ok"><b><i class="ldot on"></i>KI aktiv – Google Gemini (${esc(serverInfo?.model || "")})</b><span>Läuft serverseitig über Vercel, du musst nichts eintragen.</span></div>` : `<div class="msstate"><b><i class="ldot"></i>Server-KI noch nicht aktiv</b><span>Hinterlege in Vercel die Variable GEMINI_API_KEY und deploye neu – oder nutze unten einen eigenen Key.</span></div>`}
  <details class="msh" ${serverAI ? "" : "open"}><summary>Einrichtung: kostenlose KI mit Google Gemini</summary><ol>
    <li>Auf <b>aistudio.google.com/apikey</b> einen API-Key erstellen (kostenloser Tarif).</li>
    <li>In Vercel: Projekt → <b>Settings → Environment Variables</b> → Name <code>GEMINI_API_KEY</code>, Wert = dein Key (Environment: Production).</li>
    <li>Optional <code>GEMINI_MODEL</code> setzen. Standard ist <code>gemini-flash-lite-latest</code> (Google-Alias, fällt bei abgeschalteten Modellen automatisch auf Ersatz zurück) (günstigstes Modell mit kostenlosem Kontingent).</li>
    <li>Danach <b>Deployments → Redeploy</b>. Der Key bleibt auf dem Server und gelangt nie in den Browser.</li></ol></details>
  <details class="msh"><summary>Erweitert: eigenen Anthropic-API-Key nutzen</summary><p class="note">Nur nötig, wenn die Server-KI nicht aktiv ist. Der Key wird nur in diesem Browser gespeichert.</p><label class="lbl">API-Key</label><input class="field" id="sk" type="password" placeholder="sk-ant-…" value="${esc(p.apiKey)}" autocomplete="off"><label class="lbl">Modell</label><input class="field" id="sm" value="${esc(p.model)}"></details></div>
  ${cloudPanelHtml()}
  ${msPanelHtml()}
  <div class="panel"><h2>Daten</h2><p class="note">Alles liegt lokal auf diesem Gerät (IndexedDB) und funktioniert offline. Erstelle regelmäßig ein Backup – z. B. um auf Handy, iPad und PC dieselben Daten zu nutzen.</p><div class="row"><button class="btn ghost" id="ex">${ic("download")}Backup exportieren</button><button class="btn ghost" id="im">${ic("upload")}Backup importieren</button><input type="file" id="imf" accept="application/json" hidden><button class="btn ghost danger" id="rs">${ic("trash")}Alles löschen</button></div></div>
  <div class="row end"><button class="btn accent big" id="sv">Speichern</button></div></div>`;
  $$("#sl button", m).forEach(b => b.onclick = () => { $$("#sl button", m).forEach(x => x.classList.toggle("on", x === b)); });
  $("#as", m).onclick = async () => { await newSubject(); V.settings(m); };
  $$("[data-x]", m).forEach(b => b.onclick = async () => { if (await confirmBox("Entfernen? Zugeordnete Dokumente bleiben erhalten.", "Entfernen")) { D.subjects = D.subjects.filter(s => s.id !== b.dataset.x); save(); V.settings(m); } });
  $$("[data-c]", m).forEach(i => i.oninput = () => { subj(i.dataset.c).color = i.value; save(); }); $$("[data-n]", m).forEach(i => i.onchange = () => { subj(i.dataset.n).name = i.value.trim() || subj(i.dataset.n).name; save(); });
  $("#ex", m).onclick = exportAll; $("#im", m).onclick = () => $("#imf", m).click(); $("#imf", m).onchange = e => e.target.files[0] && importAll(e.target.files[0]);
  $("#rs", m).onclick = async () => { if (await confirmBox("Wirklich ALLE Daten löschen? Das kann nicht rückgängig gemacht werden.", "Alles löschen")) { indexedDB.deleteDatabase("lumi"); localStorage.clear(); setTimeout(() => location.hash = "#/", 100); setTimeout(() => location.reload(), 300); } };
  bindMsPanel(m); cloudBindPanel(m);
  $("#sv", m).onclick = () => { p.goalMin = Math.max(5, parseInt($("#sg", m).value) || 45); p.name = $("#sn", m).value.trim(); p.level = $("#sl .on", m)?.dataset.l || p.level; p.scale = $("#ss", m).value; p.apiKey = $("#sk", m).value.trim(); p.model = $("#sm", m).value.trim() || "claude-sonnet-5-5"; save(); refreshNav(); toast("Gespeichert"); };
};

/* ---------- Microsoft settings panel ---------- */
function msPanelHtml() {
  const c = msCfg(), ready = msReady();
  const services = `<div class="msv">${Object.entries(MS_SVC).map(([k, v]) => `<label><input type="checkbox" data-sv="${k}" ${c.services[k] ? "checked" : ""}> ${v.n}</label>`).join("")}</div><label class="msv" style="margin-top:10px"><label><input type="checkbox" id="mx" ${c.autoExams ? "checked" : ""}> Prüfungen/Tests aus dem Kalender automatisch als Aufgabe eintragen</label></label>`;
  const setup = `<ol>
    <li>Öffne <b>portal.azure.com</b> → <b>Microsoft Entra ID</b> → <b>App-Registrierungen</b> → <b>Neue Registrierung</b>.</li>
    <li>Name „Lumi“, Kontotypen: <i>„Konten in einem beliebigen Organisationsverzeichnis und persönliche Microsoft-Konten“</i>.</li>
    <li>Umleitungs-URI: Plattform <b>Single-Page-Anwendung (SPA)</b> mit genau diesem Wert: <code id="redir">${esc(msRedirect())}</code> <button class="btn ghost small" id="cprd" type="button">Kopieren</button></li>
    <li>Die <b>Anwendungs-(Client-)ID</b> kopieren und in der Datei <code>config.js</code> bei <code>msClientId</code> eintragen (oder unten testweise einfügen).</li>
    <li>Unter <b>API-Berechtigungen → Microsoft Graph → Delegiert</b>: <code>User.Read</code>, <code>Calendars.Read</code>, <code>Notes.Read</code> – optional <code>EduAssignments.Read</code>, <code>EduRoster.ReadBasic</code>, <code>Chat.Read</code>, <code>Team.ReadBasic.All</code>.</li>
    <li>Blockiert eine Schule/Uni die Zustimmung, muss die IT sie einmal erteilen. Private Microsoft-Konten funktionieren für Kalender und OneNote ohne Admin.</li></ol>`;
  return `<div class="panel msp"><h2>${msLogoSvg()} Microsoft 365</h2>
  <p class="note">Mit einem Klick anmelden: Lumi liest – nur lesend – <b>Outlook-Kalender</b>, <b>OneNote</b> und <b>Teams</b>. Prüfungen landen im Planer, OneNote-Notizbücher werden zu Ordnern und Notizen, und die KI kann alles für Antworten, Lernziele, Karteikarten und Quiz nutzen. Daten und Zugriffstoken bleiben in diesem Browser.</p>
  <div class="msstate ${c.account ? "ok" : ""}">${c.account ? `<b><i class="ldot on"></i>Verbunden als ${esc(c.account)}</b><span>${c.lastSync ? "Letzte Synchronisierung " + fmtAgo(c.lastSync) : "Noch nicht synchronisiert"}</span>` : ready ? `<b><i class="ldot"></i>Nicht verbunden</b><span>Ein Klick genügt – es öffnet sich das normale Microsoft-Login.</span>` : `<b><i class="ldot"></i>Noch nicht eingerichtet</b><span>Einmalig nötig: Client-ID hinterlegen (siehe unten). Danach geht es für alle mit einem Klick.</span>`}</div>
  <div class="row" style="margin-top:6px">${c.account ? `<button class="btn accent" id="ms-sync">${ic("rot")}Jetzt synchronisieren</button><button class="btn ghost" id="ms-out">${ic("logout")}Abmelden</button>` : `<button class="ms-btn" id="ms-in" ${ready ? "" : "disabled"}>${msLogoSvg()}<span>Mit Microsoft anmelden</span></button>`}</div>
  <div id="ms-rep">${c.report ? msReportHtml(c.report) : ""}</div>
  <details class="msh" ${ready ? "" : "open"}><summary>${ready ? "Was wird gelesen?" : "Einmalige Einrichtung (für dich als App-Betreiber:in)"}</summary>${ready ? "" : setup}${services}</details>
  <details class="msh"><summary>Erweitert: eigene Client-ID / Tenant</summary><label class="lbl">Anwendungs-(Client-)ID</label><input class="field" id="mc" value="${esc(c.clientId || "")}" placeholder="${ready ? "leer lassen = vorkonfigurierte ID" : "z. B. 12345678-abcd-…"}" autocomplete="off"><label class="lbl">Verzeichnis (Tenant)</label><input class="field" id="mt" value="${esc(c.tenant === "common" ? "" : c.tenant)}" placeholder="common"><p class="note" style="margin-top:6px">„common“ funktioniert für Schul-, Uni- und private Konten.</p>${ready ? `<p class="note">Umleitungs-URI in Azure: <code>${esc(msRedirect())}</code></p>` : ""}</details>
  <p class="note" style="margin-top:12px">Die Anmeldung funktioniert nur über die öffentliche https-Adresse der App, nicht über eine lokal geöffnete Datei.</p></div>`;
}
const msReportHtml = r => `<div class="msrep"><b>Ergebnis der letzten Synchronisierung</b><span>${r.events} Termine · ${r.exams} Prüfungen eingetragen · ${r.pages} OneNote-Seiten · ${r.tasks} Teams-Aufgaben · ${r.chats} Chats</span>${(r.errors || []).map(e => `<em>Hinweis: ${esc(e)}</em>`).join("")}</div>`;
function bindMsPanel(m) {
  const c = msCfg(), rd = () => { c.clientId = $("#mc", m).value.trim(); c.tenant = $("#mt", m).value.trim() || "common"; c.autoExams = $("#mx", m).checked; $$("[data-sv]", m).forEach(i => c.services[i.dataset.sv] = i.checked); save(); };
  $$("#mc,#mt,#mx,[data-sv]", m).forEach(i => i.onchange = rd);
  $("#cprd", m) && ($("#cprd", m).onclick = () => { navigator.clipboard?.writeText(msRedirect()); toast("Umleitungs-URI kopiert"); });
  const sync = async () => { const b = $("#ms-sync", m) || $("#ms-in", m); if (b) b.disabled = true; toast("Synchronisiere mit Microsoft…"); try { const r = await msSync(); $("#ms-rep", m).innerHTML = msReportHtml(r); toast(r.errors.length ? "Fertig – mit Hinweisen" : `Fertig: ${r.events} Termine, ${r.pages} Seiten, ${r.exams + r.tasks} neue Einträge`); } catch (e) { toast("Sync fehlgeschlagen: " + e.message); } refreshNav(); V.settings(m); };
  $("#ms-in", m) && ($("#ms-in", m).onclick = async () => { rd(); if (await msQuickLogin()) V.settings(m); });
  $("#ms-sync", m) && ($("#ms-sync", m).onclick = sync);
  $("#ms-out", m) && ($("#ms-out", m).onclick = async () => { await msLogout(); toast("Abgemeldet"); V.settings(m); });
}
