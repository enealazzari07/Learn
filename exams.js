"use strict";
/* Lumi Prüfungen – jede Prüfung (Planer/Kalender) bekommt automatisch eine Mappe: Lernziele, Karteikarten, Quiz und Dokumente an einem Ort. */
const exList = () => D.tasks.filter(t => t.type === "exam").sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
const exById = id => D.tasks.find(t => t.id === id && t.type === "exam");
const bulletLines = s => String(s || "").split("\n").map(l => l.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim()).filter(l => l.length > 2 && !/^lernziele:?$/i.test(l));
const goalsFromNote = note => { const i = String(note || "").search(/Lernziele:/i); return i >= 0 ? bulletLines(note.slice(i + 9)) : []; };
function exGoals(t) { if (!Array.isArray(t.goals)) { t.goals = []; goalsFromNote(t.note).forEach(x => t.goals.push({ id: uid(), text: x, done: false })); } return t.goals; }
function exAddGoals(t, list) {
  const have = new Set(exGoals(t).map(g => g.text.toLowerCase())); let n = 0;
  for (const x of list) { const k = x.toLowerCase(); if (x && !have.has(k)) { t.goals.push({ id: uid(), text: x, done: false }); have.add(k); n++; } }
  if (n) save(); return n;
}
/* Lernziele, die irgendwo entstehen (Notiz, Planer, KI), landen automatisch in der passenden Prüfung des Fachs */
function examAutoGoals(subjectId, text) {
  if (!subjectId) return 0; const ex = exList().find(t => !t.done && t.subjectId === subjectId && (!t.due || t.due >= iso())); if (!ex) return 0;
  const n = exAddGoals(ex, bulletLines(text)); if (n) toast(`${n} Lernziele in „${ex.title}“ gespeichert`); return n;
}
function exAfterSave(t, isNew) {
  if (goalsFromNote(t.note).length) exAddGoals(t, goalsFromNote(t.note));
  if (isNew) toast("Prüfungsmappe angelegt – unter „Prüfungen“ findest du Lernziele, Karteikarten und Quiz");
}
const exStats = t => { const g = exGoals(t), q = D.quizzes.filter(x => x.examId === t.id), dk = D.decks.filter(d => d.examId === t.id); return { goals: g.length, done: g.filter(x => x.done).length, quizzes: q.length, decks: dk.length, cards: dk.reduce((a, d) => a + d.cards.length, 0), best: q.length ? Math.max(...q.map(x => Math.round(x.score / x.total * 100))) : null }; };
const exLeft = t => { if (!t.due) return ""; const d = daysUntil(t.due); return d < 0 ? "vorbei" : d === 0 ? "heute" : d === 1 ? "morgen" : `in ${d} Tagen`; };

V.exams = m => {
  const list = exList(), upcoming = list.filter(t => !t.due || t.due >= iso()), past = list.filter(t => t.due && t.due < iso());
  const card = t => { const s = subj(t.subjectId), st = exStats(t), pct = st.goals ? Math.round(st.done / st.goals * 100) : 0;
    return `<div class="exc" data-x="${t.id}" tabindex="0"><div class="exc-top"><span class="exc-i" style="${s ? `background:${s.color}22;color:${s.color}` : ""}">${ic("book")}</span><span class="exc-d"><b>${t.due ? fmtD(t.due) : "Ohne Datum"}</b><small>${exLeft(t)}</small></span></div>
      <h3>${esc(t.title)}</h3><p class="exc-s">${s ? `<i class="sdot" style="background:${s.color}"></i>${esc(s.name)}` : "Kein Fach"}</p>
      <div class="exc-bar"><i style="width:${pct}%"></i></div><div class="exc-m"><span>${ic("star")}${st.done}/${st.goals} Lernziele</span><span>${ic("cards")}${st.cards}</span><span>${ic("help")}${st.quizzes}${st.best != null ? " · " + st.best + "%" : ""}</span></div></div>`; };
  m.innerHTML = `<div class="page"><div class="hd"><div><p class="eyebrow">Alles an einem Ort</p><h1>Prüfungen</h1></div><div class="row"><button class="btn ghost" data-go="cards">${ic("cards")}Alle Karteikarten</button><button class="btn ghost" data-go="quiz">${ic("help")}Freies Quiz</button><button class="btn accent" id="exn">${ic("plus")}Prüfung eintragen</button></div></div>
  ${upcoming.length ? `<div class="exgrid">${upcoming.map(card).join("")}</div>` : `<div class="emptybox"><div class="big-ic">${ic("book")}</div><h3>Noch keine Prüfung</h3><p>Trage eine Prüfung ein – im Planer, im Kalender oder hier. Sie bekommt automatisch eine Mappe mit Lernzielen, Karteikarten und Quiz.</p><button class="btn accent" id="exn2">${ic("plus")}Prüfung eintragen</button></div>`}
  ${past.length ? `<h2 class="sh2">Vergangen</h2><div class="exgrid past">${past.slice(-6).reverse().map(card).join("")}</div>` : ""}</div>`;
  bindCommon(m);
  $$("[data-x]", m).forEach(c => c.onclick = () => go("exam/" + c.dataset.x));
  const nw = () => taskModal(null, "", { type: "exam" }); $("#exn", m).onclick = nw; $("#exn2", m) && ($("#exn2", m).onclick = nw);
};

V.exam = (m, id) => {
  const t = exById(id); if (!t) { m.innerHTML = `<div class="page"><div class="emptybox"><h3>Prüfung nicht gefunden</h3><button class="btn" data-go="exams">Zu den Prüfungen</button></div></div>`; return bindCommon(m); }
  const s = subj(t.subjectId), goals = exGoals(t), st = exStats(t), decks = D.decks.filter(d => d.examId === t.id), quizzes = D.quizzes.filter(q => q.examId === t.id);
  const doc = D.docs.find(d => d.id === t.docId), related = D.docs.filter(d => d.type !== "draw" && d.id !== t.docId && t.subjectId && d.subjectId === t.subjectId).slice(0, 6);
  const dRow = d => `<div class="li" data-d="${d.id}">${ic("note")}<b>${esc(d.title)}</b><small>${fmtAgo(d.updated)}</small></div>`;
  m.innerHTML = `<div class="page exdet"><div class="hd"><div><button class="link back" data-go="exams">${ic("back")}Prüfungen</button><p class="eyebrow">${s ? esc(s.name) : "Prüfung"}${t.due ? " · " + fmtD(t.due) + " · " + exLeft(t) : ""}</p><h1>${esc(t.title)}</h1></div><div class="row"><button class="btn ghost" id="exe">${ic("edit")}Bearbeiten</button></div></div>
  <div class="cols2 exgrid2">
  <section class="panel"><h2>${ic("star")}Lernziele <em>${st.done}/${st.goals}</em></h2><div class="exc-bar big"><i style="width:${st.goals ? Math.round(st.done / st.goals * 100) : 0}%"></i></div>
    <div id="exg">${goals.map(g => `<label class="li lz"><input type="checkbox" data-g="${g.id}" ${g.done ? "checked" : ""}><span>${esc(g.text)}</span><button class="icon-btn lz-x" data-gx="${g.id}" aria-label="Entfernen">${ic("x")}</button></label>`).join("") || `<p class="note">Noch keine Lernziele. Füge welche hinzu oder lass sie von Lumi AI aus deinem Material erstellen – sie werden automatisch hier gespeichert.</p>`}</div>
    <div class="row exadd"><input class="field" id="exgi" placeholder="Lernziel hinzufügen …"><button class="btn" id="exga">${ic("plus")}</button></div>
    <div class="row"><button class="btn ghost small" id="exgai">${ic("spark")}Aus Material ermitteln</button></div></section>
  <section class="panel"><h2>${ic("note")}Material</h2>${doc ? dRow(doc) : `<p class="note">Kein Lernmaterial verknüpft.</p>`}${related.map(dRow).join("")}<div class="row"><button class="btn ghost small" id="exdoc">${ic("link")}${doc ? "Anderes Dokument verknüpfen" : "Dokument verknüpfen"}</button></div></section>
  <section class="panel"><h2>${ic("cards")}Karteikarten <em>${st.cards}</em></h2>${decks.map(d => `<div class="li" data-k="${d.id}">${ic("cards")}<b>${esc(d.title)}</b><small>${d.cards.length} Karten</small></div>`).join("") || `<p class="note">Noch keine Karteikarten für diese Prüfung.</p>`}<div class="row"><button class="btn accent small" id="excd">${ic("plus")}Aus Lernzielen erstellen</button></div></section>
  <section class="panel"><h2>${ic("help")}Quiz <em>${st.quizzes}</em></h2>${quizzes.map((q, i) => `<div class="li" data-q="${i}">${ic("help")}<b>${esc(q.title)}</b><small>${q.score}/${q.total} richtig · ${fmtAgo(q.date)}</small><span class="pct ${q.score / q.total >= .7 ? "ok" : ""}">${Math.round(q.score / q.total * 100)}%</span></div>`).join("") || `<p class="note">Noch kein Quiz gemacht. Erstelle eins, wenn du dich testen willst – Ergebnisse werden hier gespeichert.</p>`}<div class="row"><button class="btn accent small" id="exqz">${ic("plus")}Quiz erstellen</button></div></section>
  </div></div>`;
  bindCommon(m);
  $$("[data-k]", m).forEach(r => r.onclick = () => go("study/" + r.dataset.k));
  $$("[data-d]", m).forEach(r => r.onclick = () => go("doc/" + r.dataset.d));
  $$("[data-g]", m).forEach(c => c.onchange = () => { const g = goals.find(x => x.id === c.dataset.g); if (g) { g.done = c.checked; save(); V.exam(m, id); } });
  $$("[data-gx]", m).forEach(b => b.onclick = e => { e.preventDefault(); t.goals = goals.filter(x => x.id !== b.dataset.gx); save(); V.exam(m, id); });
  const addG = () => { const v = $("#exgi", m).value.trim(); if (!v) return; exAddGoals(t, [v]); V.exam(m, id); setTimeout(() => $("#exgi", m)?.focus(), 30); };
  $("#exga", m).onclick = addG; $("#exgi", m).onkeydown = e => { if (e.key === "Enter") addG(); };
  $("#exe", m).onclick = () => taskModal(t);
  $("#exdoc", m).onclick = () => { const { el, close } = modal(`<h3>Lernmaterial verknüpfen</h3><div class="pick">${D.docs.filter(d => d.type !== "draw").map(d => `<button class="li hit ${d.id === t.docId ? "on" : ""}" data-id="${d.id}">${ic("note")}<div class="tm2"><b>${esc(d.title)}</b></div></button>`).join("") || `<p class="empty">Keine Dokumente.</p>`}</div>`); $$("[data-id]", el).forEach(b => b.onclick = () => { t.docId = b.dataset.id; save(); close(); V.exam(m, id); }); };
  const material = async () => { const parts = []; if (doc) parts.push(await docText(doc)); if (!parts.length) { const g = goals.map(x => x.text).join("\n"); if (g) parts.push(g); } return parts.join("\n\n"); };
  $("#exgai", m).onclick = async () => { const src = doc ? await docText(doc) : (t.note || ""); if (!src || src.length < 30) return toast("Verknüpfe zuerst ein Dokument mit Lernmaterial."); const b = $("#exgai", m); b.disabled = true; toast("Lumi AI ermittelt Lernziele …"); const g = await extractGoals(src, t.title); const n = exAddGoals(t, bulletLines(g)); toast(n ? `${n} Lernziele gespeichert` : "Keine neuen Lernziele gefunden"); V.exam(m, id); };
  $("#excd", m).onclick = async () => {
    const mat = (await material()) || t.title; if (mat.length < 20) return toast("Füge zuerst Lernziele hinzu oder verknüpfe ein Dokument.");
    const n = await ask("Wie viele Karteikarten?", { value: "12", ok: "Erstellen" }); if (n === null) return; const cnt = Math.max(2, Math.min(30, parseInt(n) || 12)); toast("Lumi AI arbeitet…");
    const goalsT = goals.map(x => x.text).join("; "), r = await ai(`Erstelle ${cnt} Karteikarten für die Prüfung „${t.title}“${goalsT ? ` zu diesen Lernzielen: ${goalsT}` : ""}. Antworte NUR mit JSON: [{"q":"Frage","a":"Antwort"}]. Kurze, prüfungsrelevante Fragen, präzise Antworten.\nMATERIAL:\n${clip(mat)}`, { max: 3000, quiet: true });
    let data = parseJSON(r); if (!Array.isArray(data) || !data.length) data = localCards(clip(mat)); if (!data.length) return toast("Daraus konnte nichts erstellt werden.");
    cardsModal(data.filter(c => c.q && c.a), t.title, t.subjectId, t.id);
  };
  $("#exqz", m).onclick = async () => {
    const text = doc ? await docText(doc) : "", gt = goals.map(x => x.text).join("; "); if (!hasKey() && text.length < 80) return toast("Quiz braucht Lumi AI oder ein verknüpftes Dokument mit Text.");
    const n = await ask("Wie viele Fragen?", { value: "8", ok: "Quiz erstellen" }); if (n === null) return; const cnt = Math.max(3, Math.min(25, parseInt(n) || 8)); toast("Lumi AI erstellt Fragen …");
    const fmt = `Antworte NUR mit JSON: [{"q":"","o":["","",""],"a":0,"e":"kurze Erklärung"}] (a = Index der richtigen Option).`;
    let qs = parseJSON(await ai(`Erstelle ${cnt} Multiple-Choice-Fragen (Niveau ${isUni() ? "Universität" : "Schule"}) für die Prüfung „${t.title}“${gt ? ` zu diesen Lernzielen: ${gt}` : ""}. ${fmt}${text ? "\nMATERIAL:\n" + clip(text) : ""}`, { max: 3500, quiet: true }));
    if (!Array.isArray(qs)) qs = localQuiz(text, cnt); qs = (qs || []).filter(q => q.q && Array.isArray(q.o) && q.o.length > 1); if (!qs.length) return toast("Quiz konnte nicht erstellt werden");
    pendingQuiz = { title: t.title + " – Quiz", qs, subjectId: t.subjectId, examId: t.id }; go("quizrun");
  };
  $$("[data-q]", m).forEach(r => r.onclick = () => { const q = quizzes[+r.dataset.q]; if (!q?.qs?.length) return toast("Dieses Quiz wurde vor dem Speichern der Fragen gemacht."); pendingQuiz = { title: q.title, qs: q.qs, subjectId: t.subjectId, examId: t.id }; go("quizrun"); });
};
