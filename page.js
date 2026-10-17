"use strict";
/* Lumi – A4-Seitenansicht für Notizen: der Text fließt auf echten Seiten (Seitenränder, Lücken zwischen den Seiten, Seitenzahlen).
   Umbrüche entstehen nur durch Abstände vor Blöcken (data-pg) – gespeichert wird immer der bereinigte Text (lumiHtml). */
function lumiHtml(body) {
  if (!body.querySelector("[data-pg]")) return body.innerHTML;
  const c = body.cloneNode(true);
  c.querySelectorAll("[data-pg]").forEach(e => { e.style.marginTop = e.dataset.pg0 || ""; if (!e.getAttribute("style")) e.removeAttribute("style"); e.removeAttribute("data-pg"); e.removeAttribute("data-pg0"); });
  return c.innerHTML;
}
const PageView = {
  attach({ m, body, paper, d, dirty }) {
    const GAP = 32; let want = d.pagesOn !== undefined ? d.pagesOn : D.profile.pageMode !== false, active = false, ov = null, timer = 0, W = 794, PH = 1123, M = 76, pages = 1, destroyed = false;
    const clear = () => body.querySelectorAll("[data-pg]").forEach(e => { e.style.marginTop = e.dataset.pg0 || ""; if (!e.getAttribute("style")) e.removeAttribute("style"); e.removeAttribute("data-pg"); e.removeAttribute("data-pg0"); });
    const units = () => { const out = []; for (const el of body.children) { if (el.matches("ul,ol") && el.offsetHeight > (PH - 2 * M) * .5) out.push(...el.children); else out.push(el); } return out; };
    const sizes = () => { const avail = paper.clientWidth - 56; W = Math.max(520, Math.min(794, avail)); PH = Math.round(W * 1.4142); M = Math.round(W * .095); paper.style.setProperty("--pgw", W + "px"); paper.style.setProperty("--pgm", M + "px"); paper.style.setProperty("--pgh", PH + "px"); };
    const run = () => {
      if (destroyed) return; const ok = want && paper.clientWidth >= 600;
      if (!ok) { if (active) { active = false; paper.classList.remove("pg-a4"); clear(); body.style.minHeight = ""; ov && ov.remove(); ov = null; } sync(); return; }
      active = true; paper.classList.add("pg-a4"); sizes(); clear();
      const stride = PH + GAP; let bottom = 0;
      for (const el of units()) {
        const top = el.offsetTop, h = el.offsetHeight, k = Math.floor(top / stride), end = k * stride + PH - M;
        if (top + h > end && h <= PH - 2 * M) {
          const start = (k + 1) * stride + M, mt = parseFloat(getComputedStyle(el).marginTop) || 0; el.dataset.pg0 = el.style.marginTop || ""; el.dataset.pg = "1"; el.style.marginTop = (mt + start - top) + "px";
          const nt = el.offsetTop; if (Math.abs(nt - start) > 1) el.style.marginTop = (mt + start - top + (start - nt)) + "px";
        }
        bottom = Math.max(bottom, el.offsetTop + el.offsetHeight);
      }
      pages = Math.max(1, Math.ceil((bottom + M) / stride)); body.style.minHeight = (pages * PH + (pages - 1) * GAP) + "px";
      if (!ov) { ov = document.createElement("div"); ov.className = "pg-ov"; ov.setAttribute("aria-hidden", "true"); paper.appendChild(ov); }
      ov.style.cssText = `left:${body.offsetLeft}px;top:${body.offsetTop}px;width:${body.offsetWidth}px;height:${body.offsetHeight}px`;
      ov.innerHTML = Array.from({ length: pages }, (_, k) => (k < pages - 1 ? `<i class="pg-gap" style="top:${k * stride + PH}px;height:${GAP}px"></i>` : "") + `<b class="pg-n" style="top:${k * stride + PH - Math.round(M * .62)}px">Seite ${k + 1} von ${pages}</b>`).join("");
      sync();
    };
    const sync = () => { const b = $("#t-pages", m); if (b) b.classList.toggle("on", want); const s = $("#pg-s", m); if (s) s.textContent = active ? `${pages} ${pages === 1 ? "Seite" : "Seiten"}` : ""; };
    const refresh = () => { clearTimeout(timer); timer = setTimeout(run, 120); };
    const set = v => { want = v; d.pagesOn = v; D.profile.pageMode = v; save(); run(); toast(v ? "Seitenansicht A4 an" : "Endlos-Ansicht"); };
    const mo = new MutationObserver(refresh); mo.observe(body, { childList: true, subtree: true, characterData: true });
    const ro = new ResizeObserver(refresh); ro.observe(paper);
    body.addEventListener("load", refresh, true); document.fonts && document.fonts.ready.then(refresh);
    setTimeout(run, 30);
    return { refresh, set, get on() { return want; }, destroy() { destroyed = true; clearTimeout(timer); mo.disconnect(); ro.disconnect(); ov && ov.remove(); clear(); } };
  },
};
