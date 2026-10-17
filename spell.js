"use strict";
/* Lumi – lokale Rechtschreibkorrektur für Deutsch (Schweiz) ohne KI.
   Wörterbuch (de-words.txt, ~150k Wortformen nach Häufigkeit) + Regeln. Liefert Korrekturen als {start,end,replace}.
   Ziel: eindeutige Tippfehler lokal beheben, damit die KI nur noch bei unklaren Wörtern gefragt wird. */
const Spell = (() => {
  const URL_ = "de-words.txt", KEY = "spell:de:v1";
  let ready = false, loading = null, forms = null, lowSet = null, capSet = null, anyLow = null, rank = null, buckets = null;

  /* häufige Fehler, die das Wörterbuch nicht eindeutig löst (Kleinschreibung als Schlüssel) */
  const TYPO = {
    standart: "Standard", standarts: "Standards", vieleicht: "vielleicht", villeicht: "vielleicht", nähmlich: "nämlich", naemlich: "nämlich", garnicht: "gar nicht",
    sowiso: "sowieso", desshalb: "deshalb", dannach: "danach", wärend: "während", währent: "während", eigendlich: "eigentlich", entgültig: "endgültig", entgültige: "endgültige",
    seperat: "separat", seperate: "separate", maschiene: "Maschine", ressourcen: "Ressourcen", resourcen: "Ressourcen", addresse: "Adresse", wiederspruch: "Widerspruch", wiederstand: "Widerstand",
    rythmus: "Rhythmus", rhytmus: "Rhythmus", hirarchie: "Hierarchie", ausversehen: "aus Versehen", spagetti: "Spaghetti", kentniss: "Kenntnis", ergebniss: "Ergebnis", verständniss: "Verständnis",
    erlebniss: "Erlebnis", zeugniss: "Zeugnis", geheimniss: "Geheimnis", ereigniss: "Ereignis", vorallem: "vor allem", zumindestens: "zumindest", bischen: "bisschen", bißchen: "bisschen",
    morgends: "morgens", abends: "abends", mitlerweile: "mittlerweile", mittlerweille: "mittlerweile", warscheinlich: "wahrscheinlich", wahrscheinlig: "wahrscheinlich", lehrer: "Lehrer",
    "aufjedenfall": "auf jeden Fall", "imstande": "imstande", libelle: "Libelle", porblem: "Problem", probelm: "Problem", hausaufgabe: "Hausaufgabe", hausaufgaben: "Hausaufgaben",
  };
  const ABBR = new Set(["z", "b", "d", "h", "u", "a", "o", "s", "v", "bzw", "usw", "ca", "vgl", "ggf", "evtl", "inkl", "nr", "dr", "prof", "etc", "bspw", "sog", "ggfs", "max", "min", "std", "fr", "hr", "tel", "str", "abs", "kap", "bd", "ev", "ref", "ff", "f", "al", "jh", "chr", "vs", "p", "pd", "mrd", "mio", "zb", "dh", "ua", "uvm", "usf", "i", "e", "g", "k", "l", "m", "n", "r", "t", "w", "x", "y", "c"]);
  const PARTS = new Set(["ab", "an", "auf", "aus", "bei", "ein", "mit", "nach", "vor", "zu", "zur", "um", "los", "hin", "her", "weg", "da", "so", "un", "be", "ge", "er", "ver", "zer", "ent", "wieder", "durch", "über", "unter", "zurück", "voran", "empor", "fest", "frei", "hoch", "nieder", "dar"]);
  const FUGE = ["", "s", "es", "n", "en", "e", "er", "ens"];
  const NB = (() => { const rows = ["qwertzuiop", "asdfghjkl", "yxcvbnm"], m = {}; rows.forEach((r, y) => [...r].forEach((c, x) => { m[c] = rows.flatMap((rr, yy) => [...rr].map((cc, xx) => [cc, xx, yy])).filter(([cc, xx, yy]) => cc !== c && Math.abs(xx - x) <= 1 && Math.abs(yy - y) <= 1).map(a => a[0]); })); return m; })();
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1), isUp = c => c !== c.toLowerCase() && c === c.toUpperCase();

  function build(txt) {
    const list = txt.split("\n").filter(Boolean);
    forms = new Set(list); rank = new Map(); lowSet = new Set(); capSet = new Set(); anyLow = new Set(); buckets = [];
    list.forEach((f, i) => {
      rank.set(f, i); const lc = f.toLowerCase(); anyLow.add(lc);
      if (f[0] === lc[0]) lowSet.add(f); else capSet.add(f);
      if (f.length >= 3 && f.length <= 26) (buckets[lc.length] ||= []).push({ f, lc, r: i });
    });
    ready = true;
  }
  /* Wörterbuch einmalig laden (danach lokal im Browser gespeichert) */
  function load() {
    if (ready) return Promise.resolve(true); if (loading) return loading;
    loading = (async () => {
      try {
        let txt = null; try { txt = await KV.get(KEY); } catch {}
        if (!txt || typeof txt !== "string") { const r = await fetch(URL_); if (!r.ok) throw 0; txt = await r.text(); try { await KV.set(KEY, txt); } catch {} }
        build(txt); return true;
      } catch { loading = null; return false; }
    })();
    return loading;
  }

  /* Abstand ≤ 1: 1 = Ersetzen, 2 = Vertauschen, 3 = Buchstabe zu viel (a länger), 4 = Buchstabe fehlt */
  function within1(a, b) {
    const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return 0;
    let i = 0; while (i < la && i < lb && a[i] === b[i]) i++;
    if (la === lb) { if (i === la) return 0; if (a.slice(i + 1) === b.slice(i + 1)) return 1; if (i + 1 < la && a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2)) return 2; return 0; }
    if (la > lb) return a.slice(i + 1) === b.slice(i) ? 3 : 0;
    return b.slice(i + 1) === a.slice(i) ? 4 : 0;
  }
  function lev2(a, b) {   // Levenshtein mit Abbruch bei > 2
    const la = a.length, lb = b.length; if (Math.abs(la - lb) > 2) return 9;
    let prev = Array.from({ length: lb + 1 }, (_, j) => j);
    for (let i = 1; i <= la; i++) { const cur = [i]; let mn = i; for (let j = 1; j <= lb; j++) { const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); cur.push(v); if (v < mn) mn = v; } if (mn > 2) return 9; prev = cur; }
    return prev[lb];
  }
  const knownLow = w => anyLow.has(w);
  function compound(w, depth = 0) {   // Zusammensetzungen (Zellatmungsprozess, aufgehen …) gelten als gültig
    if (w.length < 6 || depth > 2) return false;
    for (let i = 2; i <= w.length - 3; i++) {
      const L = w.slice(0, i), R = w.slice(i); if (R.length < 3) continue;
      for (const f of FUGE) {
        if (f && !L.endsWith(f)) continue; const base = f ? L.slice(0, -f.length) : L;
        if (base.length < 2 || !((base.length >= 3 && knownLow(base)) || PARTS.has(base))) continue;
        if (knownLow(R) || compound(R, depth + 1)) return true;
      }
    }
    return false;
  }
  const UM = [["ae", "ä"], ["oe", "ö"], ["ue", "ü"]];
  function umlautFix(w) {   // Maedchen → Mädchen
    const lc = w.toLowerCase(); if (!/(ae|oe|ue)/.test(lc)) return null;
    let alt = lc; for (const [a, b] of UM) alt = alt.split(a).join(b);
    const tries = new Set([alt]);   // auch nur einzelne Ersetzungen (z. B. „neue“ → bleibt, „Maedchen“ → Mädchen)
    for (const [a, b] of UM) { let i = -1; while ((i = lc.indexOf(a, i + 1)) >= 0) tries.add(lc.slice(0, i) + b + lc.slice(i + 2)); }
    for (const t of tries) { if (lowSet.has(t)) return t; const c = cap(t); if (capSet.has(c)) return c; }
    return null;
  }
  function suggest(w, atStart) {
    const lc = w.toLowerCase(), L = lc.length; let best = [], bestD = 9;
    const kb = (a, b) => NB[a] && NB[a].includes(b);
    for (let l = L - 1; l <= L + 1; l++) for (const e of buckets[l] || []) {
      const t = within1(lc, e.lc); if (!t) continue;
      let pen = 1; if (t === 2) pen = .5; else if (t === 1) { let k = 0; while (lc[k] === e.lc[k]) k++; if (kb(lc[k], e.lc[k])) pen = .6; }
      best.push({ f: e.f, s: e.r * pen + 1, t }); bestD = 1;
    }
    if (!best.length && L >= 8) for (let l = L - 2; l <= L + 2; l++) for (const e of buckets[l] || []) { if (e.lc[0] !== lc[0] || lev2(lc, e.lc) !== 2) continue; best.push({ f: e.f, s: (e.r + 1) * 2, t: 5 }); bestD = 2; }
    if (!best.length) return { cand: null, close: false };
    best.sort((a, b) => a.s - b.s);
    const a = best[0], b = best[1];
    if (a.s > 90000) return { cand: null, close: true };                       // nur geläufige Wörter vorschlagen
    if (b && b.s < a.s * 3 && b.f !== a.f) return { cand: null, close: true };    // mehrdeutig → nicht raten
    let f = a.f; if (!atStart && isUp(w[0]) && !isUp(f[0])) return { cand: null, close: true };
    if (atStart && isUp(w[0]) && !isUp(f[0])) f = cap(f);
    return { cand: f, close: true };
  }

  /* Analyse eines Textes: edits = sichere Korrekturen, unknown = Wörter, bei denen die KI helfen könnte */
  function analyze(text, opts = {}) {
    const edits = [], used = [];
    const add = (start, end, replace) => { if (replace === text.slice(start, end)) return; if (used.some(([s, e]) => start < e && end > s)) return; used.push([start, end]); edits.push({ start, end, replace }); };
    const skipTail = opts.skipTail !== false, guard = (end) => skipTail && end >= text.length;
    const mask = []; for (const m of text.matchAll(/(?:https?:\/\/|www\.)\S+|\S+@\S+|[#@]\w+/g)) mask.push([m.index, m.index + m[0].length]);
    const inMask = i => mask.some(([s, e]) => i >= s && i < e);
    const ignore = opts.ignore || new Set();
    // — Regeln —
    for (const m of text.matchAll(/ß/g)) add(m.index, m.index + 1, "ss");                                                  // Schweiz: kein ß
    for (const m of text.matchAll(/(\p{L}),(\p{L})/gu)) { if (!guard(m.index + 3) && !inMask(m.index)) add(m.index + 1, m.index + 2, ", "); }
    for (const m of text.matchAll(/(?<![\p{L}\p{N}])(\p{L}{2,})\s+\1(?![\p{L}\p{N}])/giu)) { const end = m.index + m[0].length; if (!guard(end)) add(m.index + m[1].length, end, ""); }
    for (const m of text.matchAll(/(^|[.!?…]\s+|\n)(\p{Ll})(\p{L}*)/gu)) {   // Satzanfang gross
      const s = m.index + m[1].length, w = m[2] + m[3]; if (w.length < 2 || guard(s + w.length) || inMask(s) || /^[a-z]+[A-Z]/.test(w)) continue;
      const punct = m[1].trim();
      if (punct[0] === ".") { const prev = /(\p{L}+|\d+)$/u.exec(text.slice(0, m.index)); if (prev && (ABBR.has(prev[1].toLowerCase()) || /^\d+$/.test(prev[1]))) continue; }
      add(s, s + 1, m[2].toUpperCase());
    }
    let unknown = 0;
    if (!ready) return { edits, unknown: null, ready: false };
    // — Wörter —
    const counts = new Map(); for (const m of text.matchAll(/\p{L}+/gu)) counts.set(m[0].toLowerCase(), (counts.get(m[0].toLowerCase()) || 0) + 1);
    const total = opts.docCounts;
    for (const m of text.matchAll(/\p{L}+/gu)) {
      const w = m[0], s = m.index, e = s + w.length; if (w.length < 4 || w.length > 28) continue;
      if (inMask(s) || /^\p{Lu}{2,}$/u.test(w) || /\p{Ll}\p{Lu}/u.test(w)) continue;
      const prevCh = text[s - 1], nextCh = text[e]; if ((prevCh && "-_/\\@#:".includes(prevCh)) || (nextCh && "-_/\\@".includes(nextCh)) || /\d/.test(prevCh || "") || /\d/.test(nextCh || "")) continue;
      if (guard(e)) continue;
      const lc = w.toLowerCase(); if (ignore.has(lc) || (counts.get(lc) || 0) >= 2 || (total && (total.get(lc) || 0) >= 2)) continue;
      const up = isUp(w[0]), atStart = !up ? false : (s === 0 || /[.!?…]\s+$|\n$/.test(text.slice(0, s)));
      if (TYPO[lc] !== undefined && !forms.has(w)) { const t = TYPO[lc]; add(s, e, up && !isUp(t[0]) ? cap(t) : t); continue; }
      if (forms.has(w) || (up && lowSet.has(lc))) continue;                   // bekanntes Wort (auch am Satzanfang gross)
      if (!up && capSet.has(cap(w)) && !lowSet.has(w)) { add(s, e, cap(w)); continue; }   // Hauptwort klein → gross
      if (up && forms.has(w.toLowerCase())) continue;
      if (compound(lc)) continue;
      const um = umlautFix(w); if (um) { add(s, e, up && !isUp(um[0]) ? cap(um) : um); continue; }
      if (up && !atStart) {   // grossgeschriebene unbekannte Wörter sind meist Namen/Hauptwörter – nur bei klarem Vertauscher korrigieren
        const sg = suggest(w, false); if (sg.cand && sg.close && within1(lc, sg.cand.toLowerCase()) === 2 && isUp(sg.cand[0])) add(s, e, sg.cand); continue;
      }
      const sg = suggest(w, atStart);
      if (sg.cand) add(s, e, sg.cand); else if (!up || sg.close) unknown++;
    }
    return { edits: edits.sort((a, b) => a.start - b.start), unknown, ready: true };
  }
  return { load, analyze, isReady: () => ready, _build: build };
})();
if (typeof module !== "undefined") module.exports = Spell;
