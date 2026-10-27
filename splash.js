/* Lumi Start-Animation. Läuft einmal pro Browser-Tab; Klick, Taste oder Esc überspringt sie. */
(function () {
  var S; try { if (sessionStorage.getItem("lumi-splash") === "1") return; sessionStorage.setItem("lumi-splash", "1"); } catch (e) {}
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches, root = document.createElement("div");
  root.id = "splash"; root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<div class="sp-stage"></div>'; document.body.appendChild(root);
  var st = root.firstChild, done = false, loaded = document.readyState === "complete";
  addEventListener("load", function () { loaded = true; });
  var G = ['<path d="M5 12.5l4.5 4.5L19 7.5"/>', '<path d="M12 5v14M5 12h14"/>', '<path d="M9 4L7 20M17 4l-2 16M4 9h16M3 15h16"/>', '<path d="M15 4L9 20"/>', '<path d="M5 8h14M5 12h14M5 16h9"/>', '<path d="M12 4l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 16.4 7 19.2l1.2-5.6L4 9.8l5.6-.6z"/>', '<circle cx="12" cy="12" r="3.2"/>', '<path d="M7 7h4v4H7zM13 13h4v4h-4z"/>'];
  var rnd = (function (x) { return function () { x = (x * 16807) % 2147483647; return x / 2147483647; }; })(11);
  var tiles = [];
  function mk(cls, x, y, inner) { var e = document.createElement("div"); e.className = "sp-t " + cls; if (inner) e.innerHTML = '<svg viewBox="0 0 24 24">' + inner + "</svg>"; st.appendChild(e); var a = rnd() * Math.PI * 2, r = 240 + rnd() * 160; tiles.push({ e: e, x: x, y: y, sx: Math.cos(a) * r, sy: Math.sin(a) * r, rot: (rnd() - .5) * 120 }); }
  var kinds = ["sp-ring", "sp-solid", "sp-ring", "sp-ghost", "sp-solid", "sp-ring"], n = 0;
  for (var r = 0; r < 4; r++) for (var c = 0; c < 6; c++) { if (r > 0 && r < 3 && c > 1 && c < 4) continue; var k = kinds[(n * 7 + r * 3 + c) % kinds.length]; mk(k, (c - 2.5) * 48, (r - 1.5) * 48, G[(n * 5 + c) % G.length]); n++; }
  [[-190, -80, "sp-dot"], [200, -96, "sp-o"], [-176, 96, "sp-o"], [190, 84, "sp-dot"], [-110, -150, "sp-dot"], [120, 150, "sp-o"], [8, -146, "sp-dot"], [-24, 154, "sp-dot"]].forEach(function (d) { mk(d[2], d[0], d[1]); });
  var doc = document.createElement("div"); doc.className = "sp-t sp-doc"; doc.innerHTML = '<i style="top:22px;width:34px"></i><i style="top:36px;width:50px"></i><i style="top:50px;width:26px"></i>'; st.appendChild(doc);
  var lock = document.createElement("div"); lock.className = "sp-lock"; lock.innerHTML = '<div class="sp-logo"></div><div class="sp-word">' + "Lumi".split("").map(function (ch) { return "<span>" + ch + "</span>"; }).join("") + "</div>"; st.appendChild(lock);
  var logo = lock.firstChild, word = lock.lastChild, ease = "cubic-bezier(.2,.9,.25,1)";
  var A = function (el, kf, o) { if (!el.animate) { var l = kf[kf.length - 1]; for (var p in l) if (p !== "offset") el.style[p] = l[p]; return { finished: Promise.resolve() }; } o.fill = "forwards"; return el.animate(kf, o); };
  var wait = function (ms) { return new Promise(function (res) { setTimeout(res, ms); }); };
  function finish() { if (done) return; done = true; var a = A(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease" }); (a.finished || wait(420)).then(function () { root.remove(); }); root.classList.add("out"); }
  ["click", "keydown", "touchstart"].forEach(function (ev) { root.addEventListener(ev, finish, { once: true }); addEventListener("keydown", function (e) { if (e.key === "Escape") finish(); }); });
  async function play() {
    var w = 0;
    if (!reduce) {
      A(doc, [{ opacity: 0, transform: "scale(.5)" }, { opacity: 1, transform: "scale(1)" }], { duration: 520, easing: ease });
      tiles.forEach(function (t, i) { A(t.e, [{ opacity: 0, transform: "translate(" + t.sx + "px," + t.sy + "px) rotate(" + t.rot + "deg) scale(.3)" }, { opacity: 1, transform: "translate(" + t.x + "px," + t.y + "px) rotate(0) scale(1)" }], { duration: 760, delay: 60 + i * 16, easing: "cubic-bezier(.2,.85,.25,1.12)" }); });
      await wait(1750);
      if (done) return;
      tiles.forEach(function (t, i) { A(t.e, [{ opacity: 1, transform: "translate(" + t.x + "px," + t.y + "px) scale(1)" }, { opacity: 0, transform: "translate(0,0) scale(.15)" }], { duration: 420, delay: i * 8, easing: "cubic-bezier(.6,0,.9,.4)" }); });
      A(doc, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(.92)", opacity: 1, offset: .4 }, { transform: "scale(1.08)", opacity: 1, offset: .75 }, { transform: "scale(.95)", opacity: 0 }], { duration: 620, delay: 180, easing: "ease" });
      A(logo, [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1)" }], { duration: 480, delay: 520, easing: ease });
      await wait(1100);
    } else A(logo, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: "ease" });
    if (done) return;
    w = word.scrollWidth + 14; var spans = word.children;
    A(word, [{ maxWidth: "0px" }, { maxWidth: w + "px" }], { duration: reduce ? 1 : 620, easing: "cubic-bezier(.3,.8,.2,1)" });
    for (var i = 0; i < spans.length; i++) A(spans[i], [{ opacity: 0, transform: "translateX(-18px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: reduce ? 1 : 460, delay: reduce ? 0 : 120 + i * 70, easing: ease });
    await wait(reduce ? 500 : 1100);
    var t0 = Date.now(); while (!loaded && Date.now() - t0 < 4000 && !done) await wait(80);
    finish();
  }
  play();
})();
