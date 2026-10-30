"use strict";
/* Studix PDF editor – a PDF opens like a note: write text and draw directly on the pages. */

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
    <div class="nb-l"><button class="icon-btn" id="eb" aria-label="Zurück">${ic("back")}</button><button class="icon-btn pdf-thtg" id="thtg" aria-label="Seitenübersicht" title="Seitenübersicht" aria-pressed="false">${ic("note")}</button><div class="nb-name"><b id="cr" title="Zum Umbenennen klicken">${esc(d.title)}</b><button class="nb-folder" data-p="${d.folderId || ""}">${ic("folder")}<span>${["Home", ...fp.map(f => f.name)].map(esc).join(" / ")}</span></button></div></div>
    <div class="ned-tools" id="tb"><span class="tt-lbl">Auf die Seite tippen, um zu schreiben</span><i class="sep"></i><button class="tbtn" id="fsm" title="Schrift kleiner" aria-label="Schrift kleiner"><b style="font-size:12px">A</b></button><button class="tbtn" id="fsp" title="Schrift größer" aria-label="Schrift größer"><b style="font-size:17px">A</b></button><label class="tbtn" title="Textfarbe"><b id="cl" style="border-bottom:3px solid #1c1c22;line-height:1">A</b><input type="color" id="cin" value="#1c1c22" hidden></label></div>
    <div class="nb-r"><span class="saved" id="sv">Gespeichert</span><div class="modesw" id="msw" role="tablist"><i class="knob"></i><button role="tab" data-m="write" class="on" title="Text auf die Seite schreiben">${ic("text")}<span>Text</span></button><button role="tab" data-m="draw" title="Mit Stift zeichnen">${ic("brush")}<span>Zeichnen</span></button></div><button class="icon-btn" id="mo-m" aria-label="Mehr">${ic("more")}</button><button class="icon-btn aitog" id="ai-m" aria-label="AI ein- und ausklappen" title="AI ein- und ausklappen">${ic("aipanel")}<span class="hide-sm">AI</span></button></div></div>
  <div class="pdfwrap"><aside class="pdfthumbs" id="thumbs" aria-label="Seitenübersicht"></aside><article class="ned-paper pdfpaper" id="paperc"><div class="pdfpages" id="pages"><p class="empty pdfload">PDF wird geladen …</p></div></article>
  <div class="pdfpager" id="pager" hidden><button class="tbtn" id="pgp" aria-label="Vorherige Seite" title="Vorherige Seite">${ic("back")}</button><span class="pgn"><input id="pgin" type="number" min="1" value="1" aria-label="Seite"><i>/</i><b id="pgn">1</b></span><button class="tbtn" id="pgx" aria-label="Nächste Seite" title="Nächste Seite">${ic("back")}</button></div></div></div>`;
  const paper = $("#paperc", m); setScroller(paper); const pages = $("#pages", m), svEl = $("#sv", m);
  $$("[data-p]", m).forEach(b => b.onclick = () => go("docs/" + b.dataset.p));
  $("#eb", m).onclick = () => go("docs/" + (d.folderId || ""));

  let lib; try { lib = await loadPdfLib(); } catch { lib = null; }
  let pdf = null; if (lib) { try { pdf = await lib.getDocument({ data: await blob.arrayBuffer() }).promise; } catch {} }
  if (!pdf) {
    const url = URL.createObjectURL(blob); LEAVE.push(() => URL.revokeObjectURL(url));
    pages.innerHTML = `<iframe class="pdffallback" src="${url}" title="${esc(d.title)}"></iframe>`; pages.dataset.fb = 1; $("#msw", m).hidden = true; $("#tb", m).hidden = true;
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
    const render = async o => {
      if (o.done) return; o.done = true; const cv = $("canvas", o.h), dpr = Math.min(2, devicePixelRatio || 1), w = o.h.clientWidth || 800, vp = o.pg.getViewport({ scale: w / o.vp.width * dpr });
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); try { await o.pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise; } catch {}
    };
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) render(holders[+e.target.dataset.n - 1]); }), { rootMargin: "800px 0px" });
    holders.forEach(o => io.observe(o.h)); LEAVE.push(() => io.disconnect());
    buildNav(holders, N);
  }

  /* page overview (thumbnails) + page counter: jump, current page follows the scroll */
  function buildNav(holders, N) {
    const th = $("#thumbs", m), pager = $("#pager", m), pgin = $("#pgin", m), tg = $("#thtg", m); let cur = 0;
    $("#pgn", m).textContent = N; pgin.max = N; pager.hidden = false;
    const dpr = Math.min(2, devicePixelRatio || 1), btns = holders.map((o, i) => {
      const b = document.createElement("button"); b.className = "pdfth"; b.setAttribute("aria-label", "Seite " + (i + 1)); b.dataset.n = i; b.innerHTML = `<span class="th-c"><canvas></canvas></span><em>${i + 1}</em>`;
      b.querySelector(".th-c").style.aspectRatio = `${o.vp.width} / ${o.vp.height}`; b.onclick = () => go1(i); th.appendChild(b); return b;
    });
    const tio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; const b = e.target, o = holders[+b.dataset.n]; tio.unobserve(b); const cv = b.querySelector("canvas"), vp = o.pg.getViewport({ scale: 112 * dpr / o.vp.width });
      cv.width = Math.round(vp.width); cv.height = Math.round(vp.height); o.pg.render({ canvasContext: cv.getContext("2d"), viewport: vp }).promise.catch(() => {});
    }), { root: th, rootMargin: "400px 0px" });
    btns.forEach(b => tio.observe(b)); LEAVE.push(() => tio.disconnect());
    const go1 = i => { i = Math.max(0, Math.min(N - 1, i)); holders[i].h.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const setCur = i => {
      if (i === cur && btns[i].classList.contains("on")) return; cur = i; btns.forEach((b, k) => b.classList.toggle("on", k === i));
      if (document.activeElement !== pgin) pgin.value = i + 1; const b = btns[i]; if (th.offsetParent) th.scrollTop = b.offsetTop - th.clientHeight / 2 + b.offsetHeight / 2;
    };
    let raf = 0; const track = () => { raf = 0; const y = innerHeight * .35; let best = 0; holders.forEach((o, i) => { if (o.h.getBoundingClientRect().top <= y) best = i; }); setCur(best); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(track); };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true }); LEAVE.push(() => document.removeEventListener("scroll", onScroll, true)); track();
    $("#pgp", m).onclick = () => go1(cur - 1); $("#pgx", m).onclick = () => go1(cur + 1);
    pgin.onchange = () => go1((+pgin.value || 1) - 1); pgin.onkeydown = e => { if (e.key === "Enter") pgin.blur(); e.stopPropagation(); };
    const root = $(".pdfed", m); let open; try { open = localStorage.getItem("lumi.pdfth"); } catch {} open = open == null ? innerWidth >= 1100 : open === "1";
    const setOpen = v => { open = v; root.classList.toggle("th-open", v); tg.classList.toggle("on", v); tg.setAttribute("aria-pressed", v); tg.innerHTML = ic(v ? "note-f" : "note"); try { localStorage.setItem("lumi.pdfth", v ? "1" : "0"); } catch {} };
    tg.onclick = () => setOpen(!open); setOpen(open);
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
