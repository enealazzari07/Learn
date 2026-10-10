"use strict";
/* Lumi – Word-ähnliche Formatierungsleiste für Notizen: Absatzformat, Schriftart, Schriftgrösse, Ausrichtung, Zeilenabstand, Einzug,
   hoch-/tiefgestellt, Format löschen sowie „Design“ (Dokumentstile), Seitenbreite und Zoom. */
const Format = (() => {
  const S = (p, extra = "") => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${p}</svg>`;
  const IC = {
    left: S('<path d="M4 6h16M4 10h10M4 14h16M4 18h10"/>'), center: S('<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>'), right: S('<path d="M4 6h16M10 10h10M4 14h16M10 18h10"/>'), justify: S('<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>'),
    lh: S('<path d="M10 6h10M10 12h10M10 18h10M5 5v14M3 7l2-2 2 2M3 17l2 2 2-2"/>'), indent: S('<path d="M4 6h16M12 10h8M12 14h8M4 18h16M4 9l3 3-3 3"/>'), outdent: S('<path d="M4 6h16M12 10h8M12 14h8M4 18h16M7 9l-3 3 3 3"/>'),
    sub: S('<path d="M4 6l8 9M12 6l-8 9"/><path d="M16 18.5h4.2M20.2 18.5c0-1.4-1.1-1.6-2-1.8-1-.3-1.7-.7-1.7-1.6 0-.8.7-1.4 1.8-1.4"/>'), sup: S('<path d="M4 9l8 9M12 9l-8 9"/><path d="M16 8h4.2M20.2 8c0-1.4-1.1-1.6-2-1.8-1-.3-1.7-.7-1.7-1.6 0-.8.7-1.4 1.8-1.4"/>'),
    clear: S('<path d="M5 20l4-1 10-10a2.3 2.3 0 0 0-3.2-3.2L6 15.8zM13 8l3 3M12 20h8"/>'), chev: S('<path d="M7 9.6l5 5 5-5"/>'), minus: S('<path d="M6 12h12"/>'), plus: S('<path d="M12 6v12M6 12h12"/>'),
    design: S('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5C21 6.2 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15.5" cy="7.5" r="1"/>'), width: S('<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>'),
  };
  const STYLES = [["p", "Normal", "p"], ["h1", "Überschrift 1", "h1"], ["h2", "Überschrift 2", "h2"], ["h3", "Überschrift 3", "h3"], ["blockquote", "Zitat", "blockquote"], ["pre", "Code", "pre"]];
  const FONTS = [["Standard", "", "Inter,system-ui,sans-serif"], ["Arial", "Arial", "Arial,Helvetica,sans-serif"], ["Verdana", "Verdana", "Verdana,Geneva,sans-serif"], ["Georgia", "Georgia", "Georgia,'Times New Roman',serif"], ["Times New Roman", "Times New Roman", "'Times New Roman',Times,serif"], ["Garamond", "Garamond", "Garamond,'EB Garamond',Georgia,serif"], ["Trebuchet", "Trebuchet MS", "'Trebuchet MS',sans-serif"], ["Courier New", "Courier New", "'Courier New',monospace"], ["Schreibschrift", "Brush Script MT", "'Brush Script MT','Segoe Script',cursive"]];
  const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
  const LH = [["Einfach", 1], ["1,15", 1.15], ["1,5", 1.5], ["Doppelt", 2], ["2,5", 2.5]];
  const DESIGNS = [
    ["std", "Standard", "Inter · 12 pt · luftig", { ff: "", fs: "", lh: "", ta: "" }],
    ["classic", "Klassisch", "Georgia · 12 pt · Serife", { ff: "Georgia,'Times New Roman',serif", fs: "19px", lh: "1.75", ta: "" }],
    ["modern", "Modern", "Sans · 11 pt · kompakt", { ff: "Inter,system-ui,sans-serif", fs: "16px", lh: "1.6", ta: "" }],
    ["thesis", "Hausarbeit", "Times · 12 pt · doppelter Abstand · Blocksatz", { ff: "'Times New Roman',Times,serif", fs: "16px", lh: "2", ta: "justify" }],
    ["compact", "Kompakt", "10 pt · eng für viel Text", { ff: "", fs: "14px", lh: "1.4", ta: "" }],
    ["mono", "Schreibmaschine", "Courier · 11 pt", { ff: "'Courier New',monospace", fs: "16px", lh: "1.7", ta: "" }],
  ];
  const WIDTHS = [["narrow", "Schmal", "660px"], ["normal", "Normal", "860px"], ["wide", "Breit", "1120px"], ["full", "Volle Breite", "9999px"]];
  const pt = px => Math.round(parseFloat(px) * 0.75 * 2) / 2;

  function attach({ m, body, exec, restore, dirty, d, save }) {
    const bar = document.createElement("div"); bar.className = "fmtbar"; bar.id = "fmtbar";
    const B = (id, ico, t, cls = "") => `<button type="button" class="fb ${cls}" id="${id}" title="${t}" aria-label="${t}">${ico}</button>`;
    bar.innerHTML = `<button type="button" class="fb fd wide" id="f-style" title="Absatzformat"><span>Normal</span>${IC.chev}</button><button type="button" class="fb fd wide" id="f-font" title="Schriftart"><span>Standard</span>${IC.chev}</button>
      <span class="fsz">${B("f-m", IC.minus, "Schrift kleiner")}<button type="button" class="fb fd" id="f-s" title="Schriftgrösse"><span>12</span></button>${B("f-p", IC.plus, "Schrift grösser")}</span><i class="fsep"></i>
      ${B("f-sub", IC.sub, "Tiefgestellt")}${B("f-sup", IC.sup, "Hochgestellt")}<i class="fsep"></i>
      ${B("f-al", IC.left, "Linksbündig")}${B("f-ac", IC.center, "Zentriert")}${B("f-ar", IC.right, "Rechtsbündig")}${B("f-aj", IC.justify, "Blocksatz")}<i class="fsep"></i>
      ${B("f-lh", IC.lh, "Zeilenabstand")}${B("f-out", IC.outdent, "Einzug verkleinern")}${B("f-in", IC.indent, "Einzug vergrössern")}${B("f-clr", IC.clear, "Formatierung löschen")}
      <span class="fsp"></span>
      <button type="button" class="fb fd wide" id="f-des" title="Dokumentdesign">${IC.design}<span>Design</span>${IC.chev}</button><button type="button" class="fb fd" id="f-w" title="Seitenbreite">${IC.width}<span>Normal</span></button>
      <span class="fsz">${B("f-zm", IC.minus, "Verkleinern")}<button type="button" class="fb fd" id="f-zv" title="Zoom zurücksetzen"><span>100%</span></button>${B("f-zp", IC.plus, "Vergrössern")}</span>`;
    const bBar = m.querySelector(".ned-bar"); bBar.after(bar);
    const $b = id => bar.querySelector("#" + id), noFocus = e => e.preventDefault();
    bar.addEventListener("mousedown", noFocus);

    /* ---- Popover (stiehlt keinen Fokus, Auswahl bleibt erhalten) ---- */
    let pop = null;
    const closePop = () => { if (pop) { const p = pop; pop = null; p.classList.remove("on"); setTimeout(() => p.remove(), 160); } };
    const openPop = (anchor, html, pick, cls = "") => {
      closePop(); const el = document.createElement("div"); el.className = "mpop fpop " + cls; el.innerHTML = html; document.body.appendChild(el); pop = el;
      const r = anchor.getBoundingClientRect(); el.style.left = Math.max(8, Math.min(innerWidth - el.offsetWidth - 8, r.left)) + "px"; el.style.top = r.bottom + 8 + "px"; requestAnimationFrame(() => el.classList.add("on"));
      el.addEventListener("mousedown", noFocus); el.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const k = b.dataset.k; closePop(); pick(k); });
      const off = e => { if (!el.contains(e.target) && !anchor.contains(e.target)) { closePop(); document.removeEventListener("pointerdown", off, true); } };
      setTimeout(() => document.addEventListener("pointerdown", off, true), 0);
    };

    /* ---- Hilfen ---- */
    const blocksInSel = () => { const s = getSelection(); if (!s.rangeCount) return []; const r = s.getRangeAt(0); const all = [...body.querySelectorAll("p,h1,h2,h3,li,blockquote,pre,td,th,div:not(.sg-ins-blk)")].filter(b => !b.querySelector("p,h1,h2,h3,li,blockquote,pre,td,th")); return all.filter(b => r.intersectsNode(b) || (r.collapsed && b.contains(r.startContainer))); };
    const curEl = () => { const s = getSelection(); if (!s.rangeCount || !body.contains(s.anchorNode)) return null; const n = s.anchorNode; return n.nodeType === 3 ? n.parentElement : n; };
    const curSize = () => { const e = curEl(); return e ? pt(getComputedStyle(e).fontSize) : 12; };
    function setSize(ptv) {
      restore(); const s = getSelection(); const px = (ptv / 0.75).toFixed(2) + "px";
      if (!s.rangeCount) return;
      if (s.isCollapsed) { blocksInSel().forEach(b => { b.style.fontSize = px; b.querySelectorAll("[style*=font-size]").forEach(x => x.style.fontSize = px); }); dirty(); return upd(); }
      document.execCommand("styleWithCSS", false, false); document.execCommand("fontSize", false, "7");
      body.querySelectorAll('font[size="7"]').forEach(f => { const sp = document.createElement("span"); sp.style.fontSize = px; sp.innerHTML = f.innerHTML; sp.querySelectorAll("[style*=font-size]").forEach(x => x.style.fontSize = px); f.replaceWith(sp); });
      dirty(); upd();
    }
    const stepSize = dir => { const cur = curSize(), i = SIZES.findIndex(v => v >= cur - .01); let nx; if (dir > 0) nx = SIZES.find(v => v > cur + .01) || SIZES[SIZES.length - 1]; else nx = [...SIZES].reverse().find(v => v < cur - .01) || SIZES[0]; setSize(nx); };
    const setFont = f => { restore(); const s = getSelection(); if (!s.rangeCount) return; if (s.isCollapsed) { blocksInSel().forEach(b => { b.style.fontFamily = f[2] === FONTS[0][2] ? "" : f[2]; }); dirty(); return upd(); } document.execCommand("styleWithCSS", false, true); document.execCommand("fontName", false, f[1] || "Inter"); document.execCommand("styleWithCSS", false, false); dirty(); upd(); };
    const setLH = v => { restore(); blocksInSel().forEach(b => { b.style.lineHeight = String(v); }); dirty(); };

    /* ---- Buttons ---- */
    $b("f-style").onclick = e => openPop(e.currentTarget, STYLES.map(([k, l, t]) => `<button type="button" class="mp-i" data-k="${k}"><span class="mp-t"><b class="pv-${t}">${l}</b></span></button>`).join(""), k => { restore(); document.execCommand("formatBlock", false, k === "p" ? "p" : k); if (k !== "p") blocksInSel().forEach(b => { b.style.removeProperty("font-size"); b.querySelectorAll("[style*=font-size]").forEach(x => x.style.removeProperty("font-size")); }); dirty(); upd(); });
    $b("f-font").onclick = e => openPop(e.currentTarget, FONTS.map(([l, , css], i) => `<button type="button" class="mp-i" data-k="${i}"><span class="mp-t"><b style="font-family:${css};font-weight:500;font-size:15px">${l}</b></span></button>`).join(""), i => setFont(FONTS[+i]), "fonts");
    $b("f-s").onclick = e => openPop(e.currentTarget, SIZES.map(v => `<button type="button" class="mp-i sz ${v === curSize() ? "on" : ""}" data-k="${v}"><span class="mp-t"><b>${v}</b></span></button>`).join(""), v => setSize(+v), "sizes");
    $b("f-m").onclick = () => stepSize(-1); $b("f-p").onclick = () => stepSize(1);
    $b("f-sub").onclick = () => exec("subscript"); $b("f-sup").onclick = () => exec("superscript");
    $b("f-al").onclick = () => exec("justifyLeft"); $b("f-ac").onclick = () => exec("justifyCenter"); $b("f-ar").onclick = () => exec("justifyRight"); $b("f-aj").onclick = () => exec("justifyFull");
    $b("f-out").onclick = () => exec("outdent"); $b("f-in").onclick = () => exec("indent");
    $b("f-lh").onclick = e => openPop(e.currentTarget, LH.map(([l, v]) => `<button type="button" class="mp-i" data-k="${v}"><span class="mp-t"><b>${l}</b></span></button>`).join(""), v => setLH(+v));
    $b("f-clr").onclick = () => { restore(); document.execCommand("removeFormat"); blocksInSel().forEach(b => { b.removeAttribute("style"); b.querySelectorAll("span[style]").forEach(sp => sp.replaceWith(...sp.childNodes)); }); dirty(); upd(); };

    /* ---- Design, Breite, Zoom (pro Dokument gespeichert) ---- */
    d.fmt = d.fmt || {}; const F = d.fmt;
    const applyDoc = () => {
      const ds = DESIGNS.find(x => x[0] === (F.ds || "std")) || DESIGNS[0], w = WIDTHS.find(x => x[0] === (F.w || "normal")) || WIDTHS[1], z = F.z || 1, v = ds[3];
      body.dataset.ds = ds[0]; ["ff", "fs", "lh", "ta"].forEach(k => v[k] ? body.style.setProperty("--ed-" + k, v[k]) : body.style.removeProperty("--ed-" + k));
      body.style.setProperty("--colw", w[2]); body.style.setProperty("--ed-z", z);
      $b("f-des").querySelector("span").textContent = ds[1]; $b("f-w").querySelector("span").textContent = w[1]; $b("f-zv").querySelector("span").textContent = Math.round(z * 100) + "%";
    };
    const persist = () => { applyDoc(); save(); };
    $b("f-des").onclick = e => openPop(e.currentTarget, DESIGNS.map(([k, l, sub]) => `<button type="button" class="mp-i ${(F.ds || "std") === k ? "on" : ""}" data-k="${k}"><span class="mp-t"><b>${l}</b><small>${sub}</small></span></button>`).join(""), k => { F.ds = k; persist(); });
    $b("f-w").onclick = e => openPop(e.currentTarget, WIDTHS.map(([k, l]) => `<button type="button" class="mp-i ${(F.w || "normal") === k ? "on" : ""}" data-k="${k}"><span class="mp-t"><b>${l}</b></span></button>`).join(""), k => { F.w = k; persist(); });
    const zoom = dz => { F.z = Math.max(.6, Math.min(1.8, Math.round(((F.z || 1) + dz) * 100) / 100)); persist(); };
    $b("f-zm").onclick = () => zoom(-.1); $b("f-zp").onclick = () => zoom(.1); $b("f-zv").onclick = () => { F.z = 1; persist(); };
    applyDoc();

    /* ---- Zustand anzeigen (aktueller Stil, Schrift, Grösse, Ausrichtung) ---- */
    function upd() {
      const e = curEl(); if (!e) return;
      const blk = e.closest("h1,h2,h3,blockquote,pre,p,li"), tag = blk ? blk.tagName.toLowerCase() : "p", st = STYLES.find(x => x[0] === tag) || STYLES[0];
      $b("f-style").querySelector("span").textContent = st[1];
      const fam = getComputedStyle(e).fontFamily.split(",")[0].replace(/["']/g, "").trim(), fn = FONTS.find(f => f[1] && f[1].toLowerCase() === fam.toLowerCase());
      $b("f-font").querySelector("span").textContent = fn ? fn[0] : "Standard"; $b("f-s").querySelector("span").textContent = String(curSize()).replace(".", ",");
      const q = c => { try { return document.queryCommandState(c); } catch { return false; } };
      [["f-al", "justifyLeft"], ["f-ac", "justifyCenter"], ["f-ar", "justifyRight"], ["f-aj", "justifyFull"], ["f-sub", "subscript"], ["f-sup", "superscript"]].forEach(([id, c]) => $b(id).classList.toggle("on", q(c)));
    }
    const onSel = () => { if (body.contains(getSelection().anchorNode)) upd(); };
    document.addEventListener("selectionchange", onSel);
    return { destroy() { document.removeEventListener("selectionchange", onSel); closePop(); bar.remove(); }, update: upd };
  }
  return { attach };
})();
