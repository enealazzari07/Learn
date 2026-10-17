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
  /* Verbform passend zum Subjekt (nur eindeutige Fälle) */
  const V = (o) => o;
  const AGR = {
    ich: V({ bist: "bin", ist: "bin", sind: "bin", hast: "habe", hat: "habe", haben: "habe", kannst: "kann", können: "kann", musst: "muss", müssen: "muss", willst: "will", wollen: "will", sollst: "soll", sollen: "soll", wirst: "werde", wird: "werde", werden: "werde" }),
    du: V({ bin: "bist", ist: "bist", sind: "bist", hat: "hast", habe: "hast", haben: "hast", kann: "kannst", können: "kannst", muss: "musst", müssen: "musst", will: "willst", wollen: "willst", soll: "sollst", sollen: "sollst", wird: "wirst", werde: "wirst", werden: "wirst" }),
    er: V({ bin: "ist", bist: "ist", sind: "ist", habe: "hat", hast: "hat", haben: "hat", kannst: "kann", können: "kann", musst: "muss", müssen: "muss", willst: "will", wollen: "will", sollst: "soll", sollen: "soll", wirst: "wird", werde: "wird", werden: "wird" }),
    es: V({ bin: "ist", bist: "ist", habe: "hat", hast: "hat", kannst: "kann", musst: "muss", willst: "will", sollst: "soll", wirst: "wird", werde: "wird" }),
    wir: V({ bin: "sind", bist: "sind", ist: "sind", habe: "haben", hast: "haben", hat: "haben", kann: "können", kannst: "können", muss: "müssen", musst: "müssen", will: "wollen", willst: "wollen", soll: "sollen", sollst: "sollen", wird: "werden", wirst: "werden", werde: "werden" }),
    ihr: V({ bin: "seid", bist: "seid", habe: "habt", hast: "habt", haben: "habt", kannst: "könnt", können: "könnt", musst: "müsst", müssen: "müsst", willst: "wollt", wollen: "wollt", sollst: "sollt", sollen: "sollt", wirst: "werdet", werde: "werdet", werden: "werdet" }),
  };
  const DASS_V = new Set(["weiss", "wusste", "denke", "dachte", "glaube", "glaubte", "meine", "meinte", "sage", "sagte", "hoffe", "hoffte", "finde", "fand", "sehe", "sah", "höre", "hörte", "merke", "merkte", "fürchte", "behaupte", "zeigt", "bedeutet", "heisst", "schade", "klar", "toll", "gut", "schön", "wichtig", "möglich", "sicher", "froh", "schlimm", "überzeugt", "wahrscheinlich", "sodass", "so", "erfahren", "vergessen", "gesehen", "gehört", "gesagt", "gewusst", "gedacht"]);
  const SUBJ = new Set(["ich", "du", "er", "sie", "es", "wir", "ihr", "man", "dann", "nicht", "noch", "auch", "schon", "mein", "meine", "dein", "deine", "sein", "seine", "unser", "unsere", "euer", "eure", "jetzt", "heute", "morgen", "alle", "niemand", "jemand", "wenn", "wer"]);
  const SEIT_T = new Set(["einem", "einer", "dem", "der", "gestern", "langem", "kurzem", "jahren", "monaten", "wochen", "tagen", "jahr", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag", "heute", "längerem", "kurzer", "langer", "mehreren", "zwei", "drei", "vier", "fünf", "sechs", "zehn", "gut"]);
  const DET_ANY = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines", "kein", "keine", "keinen", "keinem", "keiner", "mein", "meine", "meinen", "meinem", "meiner", "dein", "deine", "deinen", "deinem", "deiner", "sein", "seine", "seinen", "seinem", "seiner", "unser", "unsere", "unseren", "unserem", "unserer", "ihre", "ihren", "ihrem", "ihrer", "im", "am", "vom", "zum", "zur", "beim", "ins", "ans", "diese", "dieser", "diesen", "diesem", "dieses", "jede", "jeder", "jeden", "jedem", "jedes"]);
  const DET_SAFE = new Set(["ein", "eine", "einen", "einem", "einer", "eines", "kein", "keine", "keinen", "keinem", "keiner", "mein", "meine", "meinen", "meinem", "meiner", "dein", "deine", "deinen", "deinem", "deiner", "sein", "seine", "seinen", "seinem", "seiner", "unser", "unsere", "unseren", "unserem", "unserer", "im", "am", "vom", "zum", "zur", "beim", "ins", "ans", "diesem", "dieses", "jedem", "jedes"]);
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
  const SUF = ["e", "er", "en", "em", "es", "n", "s", "st", "t", "te", "ten", "tet", "est", "et", "ig", "ige", "iger", "igen", "ung", "ungen"];
  function inflected(lc) {   // gebeugte Formen, die im Wörterbuch fehlen (fleissiger, gearbeitet …), gelten als gültig
    if (lc.length < 6) return false;
    for (const x of SUF) if (lc.endsWith(x) && lc.length - x.length >= 4 && knownLow(lc.slice(0, -x.length))) return true;
    if (lc.startsWith("ge") && lc.length >= 7) for (const x of ["t", "et", "en"]) if (lc.endsWith(x) && knownLow(lc.slice(2, -x.length) + "en")) return true;
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
    if (!best.length) return { cand: null, close: false, list: [] };
    const byLc = new Map(); for (const c of best) { const k = c.f.toLowerCase(), o = byLc.get(k); if (!o || (isUp(c.f[0]) === isUp(w[0]) && isUp(o.f[0]) !== isUp(w[0])) || (isUp(c.f[0]) === isUp(o.f[0]) && c.s < o.s)) byLc.set(k, c); }
    best = [...byLc.values()].sort((a, b) => a.s - b.s);
    const a = best[0], b = best[1];
    const list = best.slice(0, 4).map(x => (atStart && isUp(w[0]) && !isUp(x.f[0]) ? cap(x.f) : x.f));
    if (a.s > 90000) return { cand: null, close: true, list: [] };                       // nur geläufige Wörter vorschlagen
    if (b && b.s < a.s * 3 && b.f !== a.f) return { cand: null, close: true, list };    // mehrdeutig → nicht raten
    let f = a.f; if (!atStart && isUp(w[0]) && !isUp(f[0])) return { cand: null, close: true, list };
    if (atStart && isUp(w[0]) && !isUp(f[0])) f = cap(f);
    return { cand: f, close: true, list };
  }

  /* Analyse eines Textes: edits = sichere Korrekturen, unknown = Wörter, bei denen die KI helfen könnte */
  function analyze(text, opts = {}) {
    const edits = [], used = [], extra = [];
    const add = (start, end, replace) => { if (replace === text.slice(start, end)) return; if (used.some(([s, e]) => start < e && end > s)) return; used.push([start, end]); edits.push({ start, end, replace }); };
    const skipTail = opts.skipTail !== false, guard = (end) => skipTail && end >= text.length;
    const mask = []; for (const m of text.matchAll(/(?:https?:\/\/|www\.)\S+|\S+@\S+|[#@]\w+/g)) mask.push([m.index, m.index + m[0].length]);
    const inMask = i => mask.some(([s, e]) => i >= s && i < e);
    const ignore = opts.ignore || new Set();
    const toIssues = () => {   // Fundstellen für die Unterstreichung: ganzes Wort + Vorschläge
      const out = [], wordAt = a => { let ws = a, we = a; while (ws > 0 && /\p{L}/u.test(text[ws - 1])) ws--; while (we < text.length && /\p{L}/u.test(text[we])) we++; return [ws, we]; };
      for (const e of [...edits].sort((x, y) => x.start - y.start)) {
        if (e.replace === "") { const m = /\S+/.exec(text.slice(e.start, e.end)); if (m) out.push({ start: e.start + m.index, end: e.start + m.index + m[0].length, word: m[0], suggestions: [""], kind: "dup" }); continue; }
        const [ws, we] = wordAt(Math.min(e.start, Math.max(0, text.length - 1))), lo = Math.min(ws, e.start), hi = Math.max(we, e.end);
        out.push({ start: lo, end: hi, word: text.slice(lo, hi), suggestions: [text.slice(lo, e.start) + e.replace + text.slice(e.end, hi)], kind: "fix" });
      }
      for (const x of extra) if (!out.some(o => x.start < o.end && x.end > o.start)) out.push(x);
      return out.sort((x, y) => x.start - y.start);
    };
    // — Regeln —
    for (const m of text.matchAll(/ß/g)) add(m.index, m.index + 1, "ss");                                                  // Schweiz: kein ß
    for (const m of text.matchAll(/(?<![\p{L}\p{N}])(\p{L}{2,})\s+\1(?![\p{L}\p{N}])/giu)) { const end = m.index + m[0].length; if (!guard(end)) add(m.index + m[1].length, end, ""); }
    for (const m of text.matchAll(/(^|[.!?…]\s+|\n)(\p{Ll})(\p{L}*)/gu)) {   // Satzanfang gross
      const s = m.index + m[1].length, w = m[2] + m[3]; if (w.length < 2 || guard(s + w.length) || inMask(s) || /^[a-z]+[A-Z]/.test(w)) continue;
      const punct = m[1].trim();
      if (punct[0] === ".") { const prev = /(\p{L}+|\d+)$/u.exec(text.slice(0, m.index)); if (prev && (ABBR.has(prev[1].toLowerCase()) || /^\d+$/.test(prev[1]))) continue; }
      add(s, s + 1, m[2].toUpperCase());
    }
    // — Grammatik-Regeln (eindeutige Fälle): Verbform zum Subjekt, das/dass, seit/seid, „Ich“ mitten im Satz —
    const toks = [...text.matchAll(/\p{L}+/gu)].map(m => ({ w: m[0], s: m.index, e: m.index + m[0].length, l: m[0].toLowerCase() }));
    const adj = (a, b) => text.slice(a.e, b.s) === " ";
    const caseLike = (orig, r) => isUp(orig[0]) && !isUp(r[0]) ? cap(r) : r;
    toks.forEach((t, i) => {
      if (guard(t.e) || inMask(t.s)) return; const p = toks[i - 1], n = toks[i + 1];
      if (p && adj(p, t) && AGR[p.l] && AGR[p.l][t.l] && !(p.l === "es" && /^(sind|haben|können|müssen|wollen|sollen|werden)$/.test(t.l))) { add(t.s, t.e, caseLike(t.w, AGR[p.l][t.l])); return; }
      if (t.l === "das" && p && n && adj(p, t) && adj(t, n) && DASS_V.has(p.l) && SUBJ.has(n.l)) { add(t.s, t.e, caseLike(t.w, "dass")); return; }
      if (t.l === "seit" && p && p.l === "ihr" && adj(p, t)) { add(t.s, t.e, caseLike(t.w, "seid")); return; }
      if (t.l === "seid" && n && adj(t, n) && SEIT_T.has(n.l) && !(p && /^(ihr)$/.test(p.l))) { add(t.s, t.e, caseLike(t.w, "seit")); return; }
      if (t.w === "Ich" && t.s > 0 && !/(^|[.!?…:\n"„«»“\-–]\s*)$/.test(text.slice(0, t.s))) add(t.s, t.e, "ich");
    });
    let unknown = 0;
    if (!ready) return { edits, issues: toIssues(), unknown: null, ready: false };
    // — Wörter —
    const counts = new Map(); for (const m of text.matchAll(/\p{L}+/gu)) counts.set(m[0].toLowerCase(), (counts.get(m[0].toLowerCase()) || 0) + 1);
    const total = opts.docCounts;
    // Hauptwörter nach Artikel gross (das Schreiben, im Unterricht): nur wenn das Wort sicher als Hauptwort in Frage kommt
    toks.forEach((t, i) => {
      const p = toks[i - 1], n = toks[i + 1]; if (!p || guard(t.e) || inMask(t.s) || t.w[0] !== t.w[0].toLowerCase() || t.l.length < 4) return;
      if (!adj(p, t) || !DET_ANY.has(p.l) || !capSet.has(cap(t.w))) return;
      const both = lowSet.has(t.w);
      if (both && !DET_SAFE.has(p.l)) return;
      if (n && adj(t, n)) { const nn = n.w, nCap = isUp(nn[0]) || (capSet.has(cap(nn)) && !lowSet.has(nn)); if (nCap) return; if (lowSet.has(nn) && capSet.has(cap(nn))) return; }   // „die alte Frau“: alte ist Adjektiv
      add(t.s, t.e, cap(t.w));
    });
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
      if (compound(lc) || inflected(lc)) continue;
      const um = umlautFix(w); if (um) { add(s, e, up && !isUp(um[0]) ? cap(um) : um); continue; }
      if (up && !atStart) {   // grossgeschriebene unbekannte Wörter sind meist Namen/Hauptwörter – nur bei klarem Vertauscher korrigieren
        const sg = suggest(w, false); if (sg.cand && sg.close && within1(lc, sg.cand.toLowerCase()) === 2 && isUp(sg.cand[0])) add(s, e, sg.cand); continue;
      }
      const sg = suggest(w, atStart);
      if (sg.cand) add(s, e, sg.cand); else if (!up || sg.close) { unknown++; extra.push({ start: s, end: e, word: w, suggestions: (sg.list || []).slice(0, 3), kind: "unknown" }); }
    }
    return { edits: edits.sort((a, b) => a.start - b.start), issues: toIssues(), unknown, ready: true };
  }
  return { load, analyze, isReady: () => ready, _build: build };
})();
if (typeof module !== "undefined") module.exports = Spell;
