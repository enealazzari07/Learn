"use strict";
/* Lumi PDF editor – a PDF opens like a note: page rail on the left, write text and draw directly on the pages. */

const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
let pdfReady = null;
function loadPdfLib() {
  return pdfReady || (pdfReady = (async () => {
    await loadScript(PDFJS + "pdf.min.js");
    /* cross-origin workers are blocked, so the worker script is wrapped in a same-origin blob */
    const w = await (await fetch(PDFJS + "pdf.worker.min.js")).text();
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([w], { type: "text/javascript" }));
    return pdfjsLib;
  })().catch(e => { pdfReady = null; throw e; }));
}

async function pdfEditor(m, d, blob) {
  m.classList.add("doc-full");
  const fp = folderPath(d.folderId);
  m.innerHTML = `<div class="ned dfull pdfed"><div class="ned-bar">
    <div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><div class="nb-name"><b id="cr" title="Zum Umbenennen klicken">${esc(d.title)}</b><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
    <div class="ned-tools" id="tb"><span class="tt-lbl">Klicke auf die Seite, um Text zu schreiben</span><i class="sep"></i><button class="tbtn" id="fsm" title="Schrift kleiner" aria-label="Schrift kleiner"><b style="font-size:12px">A</b></button><button class="tbtn" id="fsp" title="Schrift größer" aria-label="Schrift größer"><b style="font-size:17px">A</b></button><label class="tbtn" title="Textfarbe"><b id="cl" style="border-bottom:3px solid #1c1c22;line-height:1">A</b><input type="color" id="cin" value="#1c1c22" hidden></label></div>
    <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><div class="modesw" id="msw" role="tablist"><i class="knob"></i><button role="tab" data-m="write" class="on">Schreiben</button><button role="tab" data-m="draw">Zeichnen</button></div><button class="btn ghost small" id="ai-m">${ic("spark")}<span class="hide-sm">KI</span></button><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button></div></div>
  <div class="pdfwrap"><nav class="pgrail" id="rail" aria-label="Seiten"></nav><article class="ned-paper pdfpaper" id="paperc"><div class="pdfpages" id="pages"><p class="empty pdfload">PDF wird geladen …</p></div></article></div></div>`;
  const paper = $("#paperc", m), pages = $("#pages", m), svEl = $("#sv", m), rail = $("#rail", m);
  $$("[data-p]", m).forEach(b => b.onclick = () => go("docs/" + b.dataset.p));
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || ""));

  let lib; try { lib = await loadPdfLib(); } catch { lib = null; }
  let pdf = null; if (lib) { try { pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise; } catch {} }
  if (!pdf) {
    const url = URL.createObjectURL(blob); LEAVE.push(() => URL.revokeObjectURL(url));
    pages.innerHTML = `<iframe class="pdffallback" src="${url}" title="${esc(d.title)}"></iframe>`; pages.dataset.fb = 1; rail.hidden = true; $("#msw", m).hidden = true; $("#tb", m).hidden = true;
    toast("Die PDF-Bearbeitung braucht Internet – Vorschau geladen");
  }

  const dirtyInk = debounce(async () => { if (!D.docs.includes(d)) return; d.hasInk = ink.st.strokes.length > 0; d.updated = Date.now(); await KV.set("ink:" + d.id, ink.st.strokes); save(); svEl.textContent = "Gespeichert"; }, 600);
  const dirtyTx = debounce(async () => { if (!D.docs.includes(d)) return; d.updated = Date.now(); await KV.set("ann:" + d.id, texts); save(); svEl.textContent = "Gespeichert"; }, 600);
  const ink = createInk(pages, d, { bar: $(".ned-bar", m), onChange: () => { svEl.textContent = "Speichert…"; dirtyInk(); } });
  LEAVE.push(() => ink.destroy());
  let texts = (await KV.get("ann:" + d.id)) || [], size = 18, color = "#1c1c22", focusTx = null;

  if (pdf) {
    const first = await pdf.getPage(1), vp0 = first.getViewport({ scale: 1 }), N = pdf.numPages;
    $(".pdfload", pages)?.remove(); const holders = [];
    for (let i = 1; i <= N; i++) {
      const pg = i === 1 ? first : await pdf.getPage(i), vp = pg.getViewport({ scale: 1 });
      const h = document.createElement("div"); h.className = "pdfpg"; h.dataset.n = i; h.style.aspectRatio = `${vp.width} / ${vp.height}`; h.innerHTML = `<canvas></canvas>`; pages.appendChild(h); holders.push({ h, pg, vp, done: false });
    }
    rail.innerHTML = Array.from({ length: N }, (_, i) => `<button data-n="${i + 1}" class="${i ? "" : "on"}" aria-label="Seite ${i + 1}">${i + 1}</button>`).join("");
    const setCur = n => $$("button", rail).forEach(b => { const on = +b.dataset.n === n; b.classList.toggle("on", on); if (on) { const r = b.getBoundingClientRect(), rr = rail.getBoundingClientRect(); if (r.top < rr.top || r.bottom > rr.bottom) b.scrollIntoView({ block: "nearest" }); } });
    $$("button", rail).forEach(b => b.onclick = () => holders[+b.dataset.n - 1].h.scrollIntoView({ behavior: "smooth", block: "start" }));
    const render = async o => {
      if (o.done) return; o.done = true; const cv = $("canvas", o.h), dpr = Math.min(2, devicePixelRatio || 1), w = o.h.clientWidth || 800, vp = o.pg.getViewport({ scale: w / o.vp.width * dpr });
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); try { await o.pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; } catch {}
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) render(holders[+e.target.dataset.n - 1]); }), { rootMargin: "800px 0px" });
    holders.forEach(o => io.observe(o.h)); LEAVE.push(() => io.disconnect());
    const io2 = new IntersectionObserver(es => { const v = es.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (v) setCur(+v.target.dataset.n); }, { threshold: [.25, .5, .75] });
    holders.forEach(o => io2.observe(o.h)); LEAVE.push(() => io2.disconnect());
  }

  /* text annotations */
  const txEl = t => {
    const e = document.createElement("div"); e.className = "pdftx"; e.contentEditable = "plaintext-only"; e.spellcheck = false; e.textContent = t.text; e.style.cssText = `left:calc(50% + ${t.x}px);top:${t.y}px;font-size:${t.size}px;color:${t.color}`;
    e.onfocus = () => { focusTx = { e, t }; }; e.onblur = () => { if (focusTx?.e === e) focusTx = null; if (!e.textContent.trim()) { texts = texts.filter(x => x !== t); e.remove(); dirtyTx(); } };
    e.oninput = () => { t.text = e.textContent; svEl.textContent = "Speichert…"; dirtyTx(); };
    e.onkeydown = ev => { if (ev.key === "Escape") e.blur(); ev.stopPropagation(); };
    pages.appendChild(e); return e;
  };
  texts.forEach(txEl);
  pages.addEventListener("pointerdown", e => {
    if (ink.st.on || e.target.closest(".pdftx") || !e.target.closest(".pdfpg") || e.button > 0) return;
    e.preventDefault(); const r = pages.getBoundingClientRect(), t = { x: Math.round(e.clientX - r.left - r.width / 2), y: Math.round(e.clientY - r.top - size * .6), text: "", size, color };
    texts.push(t); txEl(t).focus();
  });
  const applyTx = () => { if (focusTx) { focusTx.t.size = size; focusTx.t.color = color; focusTx.e.style.fontSize = size + "px"; focusTx.e.style.color = color; dirtyTx(); } };
  $$("#tb .tbtn", m).forEach(b => b.onmousedown = ev => ev.preventDefault());
  $("#fsm", m).onclick = () => { size = Math.max(10, size - 2); applyTx(); }; $("#fsp", m).onclick = () => { size = Math.min(64, size + 2); applyTx(); };
  $("#cin", m).oninput = e => { color = e.target.value; $("#cl", m).style.borderColor = color; applyTx(); }; $("#cin", m).onclick = e => e.stopPropagation(); $("#cl", m).parentElement.onclick = () => $("#cin", m).click();

  const inkData = await KV.get("ink:" + d.id); ink.load(inkData || []);
  const msw = $("#msw", m);
  const setMode = k => { ink.mode(k === "draw"); m.classList.toggle("drawing", k === "draw"); pages.classList.toggle("inking", k === "draw"); msw.dataset.m = k; $$("button", msw).forEach(b => b.classList.toggle("on", b.dataset.m === k)); if (k === "draw") document.activeElement?.blur?.(); };
  $$("button", msw).forEach(b => b.onclick = () => setMode(b.dataset.m));

  /* title + menus */
  const rename = () => {
    const b = $("#cr", m); if (!b) return; const inp = document.createElement("input"); inp.className = "nb-in"; inp.value = d.title; inp.maxLength = 120; b.replaceWith(inp); inp.focus(); inp.select();
    let done = false; const fin = ok => { if (done) return; done = true; if (ok && inp.value.trim()) { d.title = inp.value.trim(); d.updated = Date.now(); save(); } const nb = document.createElement("b"); nb.id = "cr"; nb.title = "Zum Umbenennen klicken"; nb.textContent = d.title; inp.replaceWith(nb); nb.onclick = rename; };
    inp.onblur = () => fin(true); inp.onkeydown = e => { if (e.key === "Enter") inp.blur(); else if (e.key === "Escape") fin(false); };
  };
  $("#cr", m).onclick = rename;
  const T = a => ({ ...a, fn: async () => aiTool(a.k, await docText(d), { title: d.title, subjectId: d.subjectId }) });
  $("#ai-m", m).onclick = e => menu(e.currentTarget, [T({ label: "Zusammenfassen", icon: "list", k: "summary" }), T({ label: "Einfach erklären", icon: "help", k: "explain" }), T({ label: "Frage zum Dokument…", icon: "search", k: "ask" }), "-", T({ label: "Karteikarten erstellen", icon: "cards", k: "cards" }), T({ label: "Quiz erstellen", icon: "help", k: "quiz" }), T({ label: "Lernziele ermitteln", icon: "star", k: "goals" })]);
  $("#mo-m", m).onclick = e => menu(e.currentTarget, [{ label: "Umbenennen", icon: "pen", fn: rename }, { label: "Fach zuordnen…", icon: "star", fn: () => { const { el, close } = modal(`<h3>Fach zuordnen</h3><div class="chips">${[{ id: "", name: "Kein Fach", color: "#999" }, ...D.subjects].map(x => `<button class="chip ${x.id === d.subjectId ? "on" : ""}" data-s="${x.id}"><i class="sdot" style="background:${x.color}"></i>${esc(x.name)}</button>`).join("")}</div>`); $$("[data-s]", el).forEach(b => b.onclick = () => { d.subjectId = b.dataset.s; save(); close(); refreshNav(); toast("Zugeordnet"); }); } }, { label: "Original-PDF laden", icon: "download", fn: () => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = d.title; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); } }, "-", { label: d.pinned ? "Lösen" : "Anheften", icon: "star", fn: () => { d.pinned = !d.pinned; save(); toast(d.pinned ? "Angeheftet" : "Gelöst"); } }, { label: "Löschen", icon: "trash", danger: true, fn: async () => { await deleteDoc(d); go("docs/" + (d.folderId || "")); } }]);
}
