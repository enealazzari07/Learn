"use strict";
/* Lumi – Änderungsvorschläge direkt im Text (wie „Änderungen nachverfolgen“): durchgestrichen = alt, markiert = neu, ✓ übernehmen · ✕ verwerfen */
const Suggest = (() => {
  let seq = 0;
  const IC_OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.5 12.5l4.2 4.2L18.5 7.5"/></svg>', IC_NO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  const skip = n => n.parentElement && n.parentElement.closest(".sg-del,.sg-ctl");
  function textMap(root) { const nodes = []; let s = ""; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (skip(n)) continue; nodes.push({ n, start: s.length, len: n.nodeValue.length }); s += n.nodeValue; } return { nodes, s }; }
  function locate(root, find) {
    find = String(find || ""); if (!find.trim()) return null;
    const { nodes, s } = textMap(root); let i = s.indexOf(find), len = find.length;
    if (i < 0) {
      const norm = str => { let out = "", map = [], sp = false; for (let k = 0; k < str.length; k++) { const c = str[k]; if (/\s/.test(c)) { if (!sp && out) { out += " "; map.push(k); } sp = true; } else { out += c; map.push(k); sp = false; } } return { out, map }; };
      const A = norm(s), B = norm(find).out.trim(); if (!B) return null; const j = A.out.indexOf(B); if (j < 0) return null;
      i = A.map[j]; len = A.map[j + B.length - 1] + 1 - i;
    }
    const at = off => nodes.find(x => off >= x.start && off < x.start + x.len);
    const a = at(i), b = at(i + len - 1); if (!a || !b) return null;
    const r = document.createRange(); r.setStart(a.n, i - a.start); r.setEnd(b.n, i + len - b.start); return r;
  }
  const textOf = root => { const { s } = textMap(root); return { s }; };
  function rangeAt(root, start, end) {
    const { nodes } = textMap(root); const at = off => nodes.find(x => off >= x.start && off < x.start + x.len);
    const a = at(start), b = at(Math.max(start, end - 1)); if (!a || !b) return null;
    const r = document.createRange(); r.setStart(a.n, start - a.start); r.setEnd(b.n, end - b.start); return r;
  }
  function caretOffset(root) {
    const sel = getSelection(); if (!sel.rangeCount || !sel.isCollapsed) return -1; const { nodes } = textMap(root), n = nodes.find(x => x.n === sel.anchorNode);
    return n ? n.start + sel.anchorOffset : -1;
  }
  /* Wortweiser Vergleich: liefert Änderungen als {start,end,replace} in Koordinaten des Originaltexts */
  function wordDiff(a, b) {
    const tok = str => { const t = [], re = /\S+/g; let m; while ((m = re.exec(str))) t.push({ w: m[0], s: m.index, e: m.index + m[0].length }); return t; };
    const A = tok(a), B = tok(b); if (A.length > 450 || B.length > 450) return [];
    const n = A.length, m = B.length, L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i].w === B[j].w ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0, cur = null;
    const flush = () => { if (cur) { out.push(cur); cur = null; } };
    while (i < n || j < m) {
      if (i < n && j < m && A[i].w === B[j].w) { flush(); i++; j++; continue; }
      if (!cur) cur = { ai: i, aj: i, bi: j, bj: j };
      if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { cur.bj = ++j; } else { cur.aj = ++i; }
    }
    flush();
    return out.map(c => {
      let start, end, repl = B.slice(c.bi, c.bj).map(x => x.w).join(" ");
      if (c.aj > c.ai) { start = A[c.ai].s; end = A[c.aj - 1].e; if (c.bj === c.bi) { const sp = a.slice(end).match(/^\s+/); if (sp) end += sp[0].length; } }
      else { const p = c.ai > 0 ? A[c.ai - 1] : null; if (p) { start = p.s; end = p.e; repl = p.w + " " + repl; } else { start = 0; end = A[0] ? A[0].s : 0; repl = repl + " "; if (end === 0) return null; } }
      return { start, end, replace: repl };
    }).filter(Boolean);
  }
  const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const toHtml = t => { t = String(t || ""); return /\n/.test(t) && typeof textToHtml === "function" ? textToHtml(t) : esc(t.replace(/\s*\n\s*/g, " ")); };
  const widget = id => { const w = document.createElement("span"); w.className = "sg-ctl"; w.dataset.sg = id; w.contentEditable = "false"; w.innerHTML = `<button type="button" class="sg-ok" title="Übernehmen" aria-label="Änderung übernehmen">${IC_OK}</button><button type="button" class="sg-no" title="Verwerfen" aria-label="Änderung verwerfen">${IC_NO}</button>`; return w; };

  function attach(body, dirty) {
    let bar = null;
    const ids = () => [...new Set([...body.querySelectorAll("[data-sg]")].map(e => e.dataset.sg))];
    const bigIds = () => [...new Set([...body.querySelectorAll("[data-sg]:not(.sg-mini)")].map(e => e.dataset.sg))];
    const refresh = () => {
      const n = bigIds().length;
      if (!n) { if (bar) { bar.classList.remove("on"); const b = bar; bar = null; setTimeout(() => b.remove(), 350); } return; }
      if (!bar) {
        bar = document.createElement("div"); bar.id = "sgbar";
        bar.innerHTML = `<span class="sgb-l">${typeof ic === "function" ? ic("spark") : ""}<b></b></span><button type="button" class="sgb-no">Alle verwerfen</button><button type="button" class="sgb-ok">Alle übernehmen</button>`;
        document.body.appendChild(bar); requestAnimationFrame(() => bar && bar.classList.add("on"));
        bar.querySelector(".sgb-ok").onclick = () => all(true); bar.querySelector(".sgb-no").onclick = () => all(false);
      }
      bar.querySelector("b").textContent = n === 1 ? "1 Vorschlag" : n + " Vorschläge";
    };
    function resolve(id, accept) {
      const els = [...body.querySelectorAll(`[data-sg="${id}"]`)]; if (!els.length) return;
      els.forEach(e => e.classList.add("sg-out"));
      setTimeout(() => {
        els.forEach(e => {
          if (e.classList.contains("sg-ctl")) e.remove();
          else if (e.tagName === "DEL") { if (accept) e.remove(); else e.replaceWith(...e.childNodes); }
          else if (e.tagName === "INS") { if (accept) e.replaceWith(...e.childNodes); else e.remove(); }
        });
        body.normalize(); dirty && dirty(); refresh();
      }, 220);
    }
    function all(accept) { ids().forEach(id => resolve(id, accept)); }
    const onDown = e => { if (e.target.closest(".sg-ctl")) e.preventDefault(); };
    const onClick = e => { const b = e.target.closest(".sg-ok,.sg-no"); if (!b) return; e.preventDefault(); e.stopPropagation(); resolve(b.closest(".sg-ctl").dataset.sg, b.classList.contains("sg-ok")); };
    body.addEventListener("mousedown", onDown); body.addEventListener("click", onClick);
    /* Textbereich ersetzen / Text einfügen – als Vorschlag */
    function suggestRange(range, newText, opt = {}) {
      const mini = opt.mini ? " sg-mini" : "", id = ++seq, collapsed = range.collapsed || !range.toString().trim(); let anchor;
      if (!collapsed) { const del = document.createElement("del"); del.className = "sg-del" + mini; del.dataset.sg = id; del.contentEditable = "false"; del.appendChild(range.extractContents()); range.insertNode(del); anchor = del; }
      const ctl = widget(id); if (mini) ctl.classList.add("sg-mini");
      if (newText != null && String(newText).trim()) { const ins = document.createElement("ins"); ins.className = "sg-ins" + mini; ins.dataset.sg = id; ins.innerHTML = toHtml(newText); if (anchor) { anchor.after(ins); ins.after(ctl); } else { range.collapse(false); range.insertNode(ctl); range.insertNode(ins); } }
      else if (anchor) anchor.after(ctl); else return 0;
      dirty && dirty(); refresh(); if (!opt.quiet) { const t = body.querySelector(`ins[data-sg="${id}"]`) || body.querySelector(`del[data-sg="${id}"]`); t && t.scrollIntoView({ block: "center", behavior: "smooth" }); }
      return id;
    }
    function suggest(edits) {
      let applied = 0, missed = 0;
      for (const e of edits || []) {
        if (!e) continue;
        if (e.find != null && String(e.find).trim()) { const r = locate(body, e.find); if (r && suggestRange(r, e.replace ?? "")) applied++; else missed++; }
        else if (e.after != null && e.insert != null) { const r = locate(body, e.after); if (r) { r.collapse(false); if (suggestRange(r, (/^\s/.test(e.insert) ? "" : " ") + e.insert)) applied++; else missed++; } else missed++; }
      }
      return { applied, missed };
    }
    /* Änderungen per Zeichenposition im Block (Auto-Korrektur); Stellen am Cursor werden übersprungen */
    function suggestAt(scope, edits, opt = {}) {
      const caret = opt.avoidCaret ? caretOffset(scope) : -1; let n = 0;
      for (const e of [...edits].sort((x, y) => y.start - x.start)) {
        if (caret >= 0 && caret >= e.start && caret <= e.end + 1) continue;
        const r = rangeAt(scope, e.start, e.end); if (!r) continue;
        if (opt.direct) { const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); document.execCommand("insertText", false, e.replace); n++; }
        else if (suggestRange(r, e.replace, { quiet: true, mini: opt.mini })) n++;
      }
      return n;
    }
    const text = () => plainText(body);
    return { suggest, suggestRange, suggestAt, all, text, pending: () => ids().length, destroy() { body.removeEventListener("mousedown", onDown); body.removeEventListener("click", onClick); if (bar) { bar.remove(); bar = null; } }, refresh };
  }
  function plainText(root) { const c = root.cloneNode(true); c.querySelectorAll(".sg-del,.sg-ctl").forEach(e => e.remove()); c.querySelectorAll("p,div,li,h1,h2,h3,tr,br").forEach(b => b.after("\n")); return c.textContent.replace(/\n{3,}/g, "\n\n"); }
  return { attach, plainText, locate, textOf, wordDiff, rangeAt };
})();
