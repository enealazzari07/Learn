"use strict";
/* Lumi – Startseite anpassen: Blöcke ersetzen (Vorlagen), verschieben und per Ziehen größer/kleiner machen. Layout liegt in D.profile.home. */
const HB = {
  tasks: { n: "Aufgaben", d: "Heutige Aufgaben abhaken", i: "list", w: 2, h: 2 },
  cal: { n: "Kalender", d: "Termine, Prüfungen, Abgaben", i: "cal", w: 2, h: 2 },
  goal: { n: "Fokus", d: "Timer und Tagesziel", i: "timer", w: 2, h: 2 },
  ex: { n: "Prüfungen", d: "Die nächsten Prüfungen", i: "book", w: 2, h: 2 },
  rec: { n: "Zuletzt", d: "Zuletzt bearbeitete Dokumente", i: "folder", w: 2, h: 2 },
  cards: { n: "Karteikarten", d: "Fällige Karten", i: "cards", w: 2, h: 1 },
  week: { n: "Woche", d: "Lernzeit der letzten 7 Tage", i: "chart", w: 2, h: 2 },
  quick: { n: "Schnellstart", d: "Neue Notiz, Quiz, Karteikarten", i: "spark", w: 2, h: 1 },
  note: { n: "Notiz", d: "Schnelle Notiz auf der Startseite", i: "note", w: 2, h: 2 },
  space: { n: "Platz für Lumi AI", d: "Freie Fläche für das KI-Fenster unten rechts", i: "sparkO", w: 2, h: 1 },
};
const HOME_TPL = {
  std: { n: "Standard", d: "Aufgaben, Kalender, Fokus, Prüfungen", l: [["tasks", 2, 2], ["cal", 2, 2], ["goal", 2, 2], ["ex", 2, 2], ["rec", 2, 2], ["cards", 2, 1], ["space", 2, 1]] },
  focus: { n: "Fokus", d: "Großer Timer, dazu Aufgaben und Kalender", l: [["goal", 2, 4], ["tasks", 2, 2], ["cal", 2, 2], ["ex", 2, 2], ["cards", 2, 1], ["space", 2, 1]] },
  plan: { n: "Planer", d: "Großer Kalender mit Aufgaben und Prüfungen", l: [["cal", 3, 4], ["tasks", 3, 2], ["ex", 3, 1], ["cards", 1, 1], ["space", 2, 1]] },
  learn: { n: "Lernen", d: "Karteikarten, Fokus und Wochenverlauf", l: [["cards", 2, 2], ["goal", 2, 2], ["week", 2, 2], ["rec", 2, 2], ["tasks", 2, 2], ["ex", 2, 1], ["space", 2, 1]] },
  mini: { n: "Minimal", d: "Nur Aufgaben und Kalender", l: [["tasks", 3, 4], ["cal", 3, 3], ["quick", 1, 1], ["space", 2, 1]] },
};
const homeUid = () => "b" + Math.random().toString(36).slice(2, 7);
const homeFromTpl = k => HOME_TPL[k].l.map(([type, w, h]) => ({ id: homeUid(), type, w, h }));
function homeLayout() {
  const L = Array.isArray(D.profile.home) ? D.profile.home : null, seen = new Set();
  const ok = (L || []).filter(b => b && HB[b.type] && (b.type === "space" || !seen.has(b.type)) && seen.add(b.type)).map(b => ({ id: b.id || homeUid(), type: b.type, w: Math.max(1, Math.min(6, b.w | 0 || 2)), h: Math.max(1, Math.min(4, b.h | 0 || 2)) }));
  return ok.length ? ok : homeFromTpl("std");
}

function homeEditor() {
  let L = homeLayout().map(b => ({ ...b })), drag = null;
  const root = document.createElement("div"); root.className = "hed"; document.body.appendChild(root); document.body.classList.add("hed-open");
  const commit = () => { D.profile.home = L.map(b => ({ ...b })); save(); };
  const close = () => { root.remove(); document.body.classList.remove("hed-open"); if (typeof curView !== "undefined" && (curView === "today" || curView === "settings")) renderView(); };
  const used = () => new Set(L.map(b => b.type));
  const blockEl = b => `<div class="hb ${b.type === "space" ? "hb-space" : ""}" data-b="${b.id}" style="--w:${b.w};--h:${b.h}"><div class="hb-in"><span class="hb-i">${ic(HB[b.type].i)}</span><b>${HB[b.type].n}</b><small>${HB[b.type].d}</small></div><span class="hb-sz">${b.w} × ${b.h}</span><div class="hb-bar"><button data-sw="${b.id}" title="Block ersetzen">${ic("pen")}<span>Ersetzen</span></button><button data-rm="${b.id}" title="Entfernen" aria-label="Entfernen">${ic("trash")}</button></div><i class="hb-rz" data-rz="${b.id}" title="Größe ändern"></i></div>`;
  const draw = () => {
    root.innerHTML = `<div class="hed-top"><div><h2>Startseite bearbeiten</h2><p>Blöcke ziehen zum Verschieben · Ecke unten rechts ziehen für die Größe · „Ersetzen“ tauscht den Inhalt.</p></div><div class="hed-act"><button class="btn ghost" id="hd-t">${ic("table")}Vorlagen</button><button class="btn ghost" id="hd-a">${ic("plus")}Block</button><button class="btn ghost" id="hd-r">Zurücksetzen</button><button class="btn accent" id="hd-d">Fertig</button></div></div>
    <div class="hed-stage"><div class="hed-grid" id="hd-g">${L.map(blockEl).join("")}${L.length ? "" : `<p class="hed-empty">Noch keine Blöcke – füge oben einen hinzu oder wähle eine Vorlage.</p>`}</div></div><p class="hed-note">Auf dem Handy stehen die Blöcke untereinander – die Reihenfolge bleibt wie hier.</p>`;
    bind();
  };
  const bind = () => {
    const g = $("#hd-g", root);
    $("#hd-d", root).onclick = () => { commit(); close(); toast("Startseite gespeichert"); };
    $("#hd-r", root).onclick = () => { L = homeFromTpl("std"); commit(); draw(); };
    $("#hd-t", root).onclick = e => menu(e.currentTarget, Object.entries(HOME_TPL).map(([k, t]) => ({ label: t.n + " – " + t.d, icon: "table", fn: () => { L = homeFromTpl(k); commit(); draw(); } })));
    $("#hd-a", root).onclick = e => { const free = Object.keys(HB).filter(t => t !== "space" && !used().has(t)); const items = free.map(t => ({ label: HB[t].n + " – " + HB[t].d, icon: HB[t].i, fn: () => { L.push({ id: homeUid(), type: t, w: HB[t].w, h: HB[t].h }); commit(); draw(); } })); items.push({ label: "Platz für Lumi AI – freie Fläche", icon: "sparkO", fn: () => { L.push({ id: homeUid(), type: "space", w: 2, h: 1 }); commit(); draw(); } }); menu(e.currentTarget, items); };
    $$("[data-rm]", root).forEach(b => b.onclick = () => { L = L.filter(x => x.id !== b.dataset.rm); commit(); draw(); });
    $$("[data-sw]", root).forEach(b => b.onclick = () => { const cur = L.find(x => x.id === b.dataset.sw); const items = Object.keys(HB).filter(t => t !== cur.type && (t === "space" || !used().has(t))).map(t => ({ label: HB[t].n + " – " + HB[t].d, icon: HB[t].i, fn: () => { cur.type = t; commit(); draw(); } })); menu(b, items); });
    /* Größe ändern */
    $$("[data-rz]", root).forEach(h => h.onpointerdown = e => {
      e.preventDefault(); e.stopPropagation(); const b = L.find(x => x.id === h.dataset.rz), el = h.closest(".hb"), r = g.getBoundingClientRect(), gap = 12;
      const rows = Math.max(4, getComputedStyle(g).gridTemplateRows.split(" ").length), cw = (r.width + gap) / 6, rh = (r.height + gap) / rows, x0 = e.clientX, y0 = e.clientY, w0 = b.w, h0 = b.h;
      const mv = ev => { b.w = Math.max(1, Math.min(6, Math.round(w0 + (ev.clientX - x0) / cw))); b.h = Math.max(1, Math.min(4, Math.round(h0 + (ev.clientY - y0) / rh))); el.style.setProperty("--w", b.w); el.style.setProperty("--h", b.h); $(".hb-sz", el).textContent = b.w + " × " + b.h; };
      const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); commit(); };
      el.classList.add("rzing"); addEventListener("pointermove", mv); addEventListener("pointerup", () => { el.classList.remove("rzing"); up(); }, { once: true });
    });
    /* Verschieben */
    $$(".hb", root).forEach(el => el.onpointerdown = e => {
      if (e.target.closest("button,[data-rz]")) return; e.preventDefault();
      const id = el.dataset.b; let moved = false, sx = e.clientX, sy = e.clientY;
      const mv = ev => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; if (!moved) { moved = true; el.classList.add("drag"); }
        const under = document.elementsFromPoint(ev.clientX, ev.clientY).map(n => n.closest && n.closest(".hb")).find(n => n && n.dataset.b !== id); if (!under) return;
        const a = L.findIndex(x => x.id === id), b2 = L.findIndex(x => x.id === under.dataset.b); if (a < 0 || b2 < 0 || a === b2) return;
        const first = new Map($$(".hb", g).map(n => [n.dataset.b, n.getBoundingClientRect()]));
        const [it] = L.splice(a, 1); L.splice(b2, 0, it);
        const nodes = $$(".hb", g), map = new Map(nodes.map(n => [n.dataset.b, n])); L.forEach(x => g.appendChild(map.get(x.id)));
        $$(".hb", g).forEach(n => { const f = first.get(n.dataset.b), l = n.getBoundingClientRect(); if (!f) return; const dx = f.left - l.left, dy = f.top - l.top; if (!dx && !dy) return; n.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.3,.9,.3,1)" }); });
      };
      const up = () => { removeEventListener("pointermove", mv); removeEventListener("pointerup", up); el.classList.remove("drag"); if (moved) commit(); };
      addEventListener("pointermove", mv); addEventListener("pointerup", up);
    });
  };
  root.tabIndex = -1; root.onkeydown = e => { if (e.key === "Escape" && !document.querySelector(".popmenu")) { commit(); close(); } };
  draw();
}
