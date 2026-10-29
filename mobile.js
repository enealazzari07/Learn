"use strict";
/* Studix – Handy-Ansicht: auf dem Handy (schmal) eine schlichte App-Startseite statt des Desktop-Rasters.
   Alle anderen Ansichten bleiben dieselben und werden in mobile.css fürs Handy umgebaut. */
var PHONE = matchMedia("(max-width:700px)");
document.documentElement.classList.toggle("phone", PHONE.matches);
PHONE.addEventListener?.("change", e => { document.documentElement.classList.toggle("phone", e.matches); if (location.hash.startsWith("#/app")) renderView(); });

(() => {
  const desktopToday = V.today;
  V.today = m => {
    if (!PHONE.matches) return desktopToday(m);
    const t = iso(), h = new Date().getHours(), goal = D.profile.goalMin || 45, mins = D.stats.days[t] || 0, due = dueCardCount();
    const first = (D.profile.name || "").trim().split(" ")[0];
    const greet = (h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend") + (first ? ", " + first : "");
    const open = D.tasks.filter(x => !x.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
    const exams = open.filter(x => x.type === "exam" && x.due && daysUntil(x.due) >= 0).slice(0, 3);
    const recent = [...D.docs].sort((a, b) => b.updated - a.updated).slice(0, 8);
    const dueLbl = x => !x.due ? "" : daysUntil(x.due) === 0 ? "Heute" : daysUntil(x.due) === 1 ? "Morgen" : daysUntil(x.due) < 0 ? "Überfällig" : fmtD(x.due);
    const todoRows = () => open.filter(x => x.type !== "exam" && !x.done).slice(0, 6);
    const icn = d => ic(d.type === "draw" ? "brush" : d.type === "file" ? "file" : "note");
    m.classList.add("homew", "mhome");
    m.innerHTML = `<div class="mh">
      <header class="mh-top"><div><small>${new Date().toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })}</small><h1>${esc(greet)}</h1></div><button class="mh-av" data-go="settings" aria-label="Profil">${esc((D.profile.name || "S").trim()[0].toUpperCase())}</button></header>
      <div class="mh-stats"><button data-go="focus"><b>${mins}<i>/${goal}</i></b><small>Min. heute</small></button><button data-go="cards"><b>${due}</b><small>Karten fällig</small></button><button data-go="focus"><b>${typeof streak === "function" ? streak() : 0}</b><small>Tage Serie</small></button></div>
      <button class="mh-ai" id="mh-ai">${ic("spark")}<span>Frag Studix AI …</span></button>
      <section><h2>Heute</h2><div id="mh-todos"></div><form class="mh-add" id="mh-f">${ic("plus")}<input id="mh-i" placeholder="Aufgabe hinzufügen" autocomplete="off" maxlength="140"></form></section>
      ${exams.length ? `<section><h2>Prüfungen</h2>${exams.map(x => { const sj = subj(x.subjectId), dd = daysUntil(x.due); return `<button class="mh-row" data-ex="${x.id}"><span class="mh-d">${dd}<small>${dd === 1 ? "Tag" : "Tage"}</small></span><span><b>${esc(x.title)}</b><small>${sj ? esc(sj.name) : "Prüfung"}</small></span></button>`; }).join("")}</section>` : ""}
      ${recent.length ? `<section><h2>Zuletzt</h2><div class="mh-rec">${recent.map(d => `<button data-d="${d.id}"><span>${icn(d)}</span><b>${esc(d.title)}</b><small>${fmtAgo(d.updated)}</small></button>`).join("")}</div></section>` : ""}
    </div>`;
    bindCommon(m);
    $$("[data-ex]", m).forEach(b => b.onclick = () => go("exam/" + b.dataset.ex));
    $$("[data-d]", m).forEach(b => b.onclick = () => go("doc/" + b.dataset.d));
    $("#mh-ai", m).onclick = () => go("ai");
    const draw = () => {
      const box = $("#mh-todos", m), rows = todoRows();
      box.innerHTML = rows.length ? rows.map(x => `<div class="mh-t" data-id="${x.id}"><button class="tc" role="checkbox" aria-checked="false" aria-label="${esc(x.title)} erledigt"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9"/></svg></button><b>${esc(x.title)}</b><small class="${x.due && daysUntil(x.due) < 0 ? "red" : ""}">${dueLbl(x)}</small></div>`).join("") : `<p class="mh-empty">Alles erledigt 🎉</p>`;
      $$(".tc", box).forEach(b => b.onclick = () => { const row = b.closest(".mh-t"), x = D.tasks.find(y => y.id === row.dataset.id); if (!x) return; completeTask(x, true); row.classList.add("done"); b.setAttribute("aria-checked", "true"); setTimeout(() => { const i = open.indexOf(x); if (i > -1) open.splice(i, 1); draw(); }, 350); });
    };
    draw();
    $("#mh-f", m).onsubmit = e => { e.preventDefault(); const i = $("#mh-i", m), v = i.value.trim(); if (!v) return; const x = { id: uid(), title: v, type: "task", due: iso(), subjectId: "", note: "", done: false }; D.tasks.push(x); open.unshift(x); save(); i.value = ""; draw(); };
  };
})();

/* Schwebender „+“-Knopf (Neu erstellen) auf den vier Haupt-Tabs; auf dem Handy ersetzt er den KI-Knopf und die Desktop-Schnellaktionen */
function mobileChrome() {
  let f = $("#mfab"); if (!f) { f = document.createElement("button"); f.id = "mfab"; f.className = "mfab"; f.setAttribute("aria-label", "Neu erstellen"); f.innerHTML = ic("plus"); f.onclick = () => newMenu(f); document.body.appendChild(f); }
  f.hidden = !PHONE.matches || !["today", "docs", "exams", "planner"].includes(curView);
}
