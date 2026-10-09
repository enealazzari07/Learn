"use strict";
/* Lumi Learn – static web app (no build step). Landing + learning app + AI. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- icons ---------- */
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  spark: '<circle cx="12" cy="5" r="2.6" fill="currentColor"/><circle cx="12" cy="19" r="2.6" fill="currentColor"/><circle cx="5" cy="12" r="2.6" fill="currentColor"/><circle cx="19" cy="12" r="2.6" fill="currentColor"/>',
  cloud: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5 4.3 4.3 0 0 1 17.5 18z"/>',
  note: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  glasses: '<circle cx="6" cy="14" r="3.5"/><circle cx="18" cy="14" r="3.5"/><path d="M9.5 14h5M2.5 14L4 7M21.5 14L20 7"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const ic = (n, c = "ic") => `<svg class="${c}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ""}</svg>`;

/* ---------- state ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
let S = Object.assign({ name: "Alex Morgan", progress: {}, done: {}, custom: [], apiKey: "", model: "claude-sonnet-5-5" }, store.get("lumi-state", {}));
const save = () => store.set("lumi-state", S);

const G = {
  green: "linear-gradient(135deg,#8fcf6e,#f3e9a6)", red: "linear-gradient(135deg,#7a1020,#e8505b)", blue: "linear-gradient(135deg,#3b82f6,#9fd4ff)",
  pink: "linear-gradient(135deg,#d8467a,#ffb4c4)", teal: "linear-gradient(135deg,#0f766e,#7de3d0)", orange: "linear-gradient(135deg,#ff8a00,#ffd36b)",
  dark: "linear-gradient(135deg,#0b0b0b,#4a4a4a)", violet: "linear-gradient(135deg,#6d28d9,#c4b5fd)", yellow: "linear-gradient(135deg,#ffe500,#fff7a8)",
};
const COURSES = [
  { id: "demo-delivery", title: "High-impact demo delivery techniques", desc: "Run effective discovery calls and demos.", cat: "Sales", g: G.green, mins: 20, sub: "Continue learning",
    lessons: [
      { t: "Why demos fail", b: "Most demos fail because they start with the product instead of the customer. Buyers are informed, skeptical and short on time.\n\nStart every demo by restating the problem you heard in discovery, then show only the 2–3 workflows that solve it." },
      { t: "Discovery calls that matter", b: "A good discovery call uncovers pain, impact and decision process.\n\nAsk open questions, quantify the cost of the problem, and confirm who else is involved before you ever open the product." },
      { t: "Tell the story, then show it", b: "Use the 'tell–show–tell' pattern: tell what you will show, show it in the product, then tell what it means for the buyer.\n\nKeep each segment under three minutes." } ],
    quiz: [{ q: "What should a demo start with?", o: ["The product roadmap", "The customer's problem", "Pricing"], a: 1 }, { q: "How long should each tell–show–tell segment be?", o: ["Under 3 minutes", "15 minutes", "Whatever feels right"], a: 0 }] },
  { id: "remote-comm", title: "Effective communication in remote teams", desc: "Write, meet and decide across time zones.", cat: "Culture", g: G.red, mins: 25, sub: "Marketing", live: "Today 13:00",
    lessons: [
      { t: "Default to async", b: "Async communication respects focus time and time zones. Write messages that can be understood without a follow-up call.\n\nLead with the ask, add context, then state the deadline." },
      { t: "Meetings with purpose", b: "Every meeting needs an owner, an agenda and a written outcome. If it is only information sharing, send a doc or a short video instead." },
      { t: "Decisions in writing", b: "Record decisions where everybody can find them. A decision log prevents re-litigating the same topic every quarter." } ],
    quiz: [{ q: "What leads a good async message?", o: ["Background story", "The ask", "A greeting only"], a: 1 }] },
  { id: "cyber", title: "Cybersecurity awareness", desc: "Spot phishing and protect company data.", cat: "Compliance", g: G.blue, mins: 43, sub: "43 min", done: true,
    lessons: [
      { t: "Recognising phishing", b: "Phishing messages create urgency and ask for credentials or payments. Check the sender domain, hover over links and never open unexpected attachments." },
      { t: "Strong credentials", b: "Use a password manager and multi-factor authentication everywhere. Never reuse passwords across services." },
      { t: "Reporting incidents", b: "Report suspicious messages immediately – speed matters more than certainty. Reporting is never punished." } ],
    quiz: [{ q: "You get an urgent payment request by email. First step?", o: ["Pay quickly", "Verify via a second channel", "Reply with details"], a: 1 }, { q: "Best protection for accounts?", o: ["Same password everywhere", "MFA + password manager", "Short passwords"], a: 1 }] },
  { id: "ai-legal", title: "Ethical use of AI in legal practice", desc: "Risks, duties and good practice for AI tools.", cat: "Compliance", g: G.pink, mins: 30, sub: "Edited yesterday", edit: true,
    lessons: [
      { t: "Duty of competence", b: "Lawyers remain responsible for work produced with AI. Verify every citation and never paste confidential client data into unapproved tools." },
      { t: "Bias & transparency", b: "Models can reproduce bias. Document where AI was used and keep a human in the loop for decisions that affect people." } ],
    quiz: [{ q: "Who is responsible for AI-assisted work?", o: ["The AI vendor", "The lawyer", "Nobody"], a: 1 }] },
  { id: "dei", title: "Diversity & inclusion foundations", desc: "Build inclusive teams and habits.", cat: "Culture", g: G.orange, mins: 60, sub: "1 hr · 2 steps", program: true,
    lessons: [
      { t: "What inclusion looks like", b: "Inclusion means everyone can contribute fully. It shows in who speaks in meetings, who gets stretch work and whose ideas are credited." },
      { t: "Everyday habits", b: "Rotate facilitators, share agendas early, credit ideas by name and ask quieter colleagues for input first." } ],
    quiz: [{ q: "A simple inclusive meeting habit?", o: ["Same speakers always", "Share agenda early", "No notes"], a: 1 }] },
  { id: "soc2", title: "SOC2 — Compliance training", desc: "Annual security & compliance refresher.", cat: "Compliance", g: G.teal, mins: 10, sub: "10 min left",
    lessons: [{ t: "The five trust criteria", b: "SOC2 covers security, availability, processing integrity, confidentiality and privacy. Your daily habits provide the evidence auditors look for." }, { t: "Your responsibilities", b: "Lock your screen, use approved tools, report incidents and complete training on time." }],
    quiz: [{ q: "How many SOC2 trust criteria exist?", o: ["Three", "Five", "Ten"], a: 1 }] },
  { id: "consumer-law", title: "Consumer protection law in digital products", desc: "Understand the legal responsibilities of product teams.", cat: "Legal", g: G.dark, mins: 15, sub: "15 min left",
    lessons: [{ t: "Core obligations", b: "Digital products must be transparent about pricing, subscriptions and data use. Dark patterns can be unlawful." }],
    quiz: [{ q: "Which can be unlawful?", o: ["Clear pricing", "Dark patterns", "Easy cancellation"], a: 1 }] },
  { id: "negotiation", title: "Negotiation skills for SaaS & Tech sales", desc: "Win-win deals without discounting.", cat: "Sales", g: G.violet, mins: 30, sub: "30 min",
    lessons: [{ t: "Know your BATNA", b: "Your best alternative to a negotiated agreement defines your walk-away point. Prepare it before every call." }, { t: "Trade, don't give", b: "Never concede without getting something back. Trade term length for price, or volume for onboarding support." }],
    quiz: [{ q: "What does BATNA stand for?", o: ["Best alternative to a negotiated agreement", "Basic agreed terms and numbers", "Buyer approval to near-final acceptance"], a: 0 }] },
  { id: "careers", title: "Career paths at Northwind", desc: "Explore how careers grow here.", cat: "Culture", g: G.yellow, mins: 20, sub: "20 min",
    lessons: [{ t: "Two ladders", b: "Northwind offers a manager track and an individual-contributor track with equal pay bands at every level." }],
    quiz: [{ q: "Are IC and manager tracks paid equally?", o: ["Yes, equal bands", "No", "Only in sales"], a: 0 }] },
];
const ASSIGN = [
  { id: "consumer-law", due: "Due Aug 8", pri: "High priority", note: "Understand the legal responsibilities…" },
  { id: "soc2", due: "Due Aug 9", pri: "High priority" },
  { id: "careers", due: "Due Aug 17", pri: "Mandatory", note: "Explore how careers grow here. Learn about available ro…" },
  { id: "dei", due: "Due Aug 30", pri: "Mandatory" },
  { id: "negotiation", due: "Due Sep 12", pri: "Mandatory" },
];
const all = () => [...S.custom, ...COURSES];
const byId = id => all().find(c => c.id === id);
const pct = c => S.done[c.id] ? 100 : (S.progress[c.id] || 0);

/* ---------- toast ---------- */
let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2600); }

/* ---------- AI ---------- */
const hasKey = () => !!S.apiKey;
async function ai(prompt, { system = "", history = [], max = 1024 } = {}) {
  if (!hasKey()) return mockAI(prompt, system);
  const messages = [...history.map(m => ({ role: m.role, content: m.text })), { role: "user", content: prompt }];
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": S.apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: S.model, max_tokens: max, system: system + "\nReply in the language of the user's message. Be concise.", messages }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || r.status);
    return j.content.map(c => c.text || "").join("");
  } catch (e) { return "⚠️ AI request failed: " + e.message; }
}
function mockAI(p, sys) {
  const low = p.toLowerCase();
  const ctx = (sys.match(/LESSON:\n([\s\S]*)/) || [])[1] || "";
  const first = t => (t.replace(/\n+/g, " ").split(/(?<=[.!?])\s/)[0] || t).trim();
  return new Promise(res => setTimeout(() => {
    if (/^edit:/i.test(p)) {
      const text = p.split("TEXT:")[1]?.trim() || "";
      if (/short|kürz|kurz/.test(low)) return res(first(text));
      if (/formal/.test(low)) return res(text.replace(/\bdon't\b/g, "do not").replace(/\bwon't\b/g, "will not"));
      if (/simpl|einfach/.test(low)) return res(first(text) + " Simple as that.");
      return res(text + " (Demo mode – add an API key in Settings for real AI edits.)");
    }
    if (/json/.test(low) && /course/.test(low)) return res("");
    if (ctx && /summar|zusammen/.test(low)) return res("Summary: " + first(ctx) + "\n\n(Demo mode – add an API key in Settings for real AI answers.)");
    if (ctx && /quiz|test me|frage/.test(low)) return res("Quick check: " + first(ctx).replace(/\.$/, "") + " – true or false?\n\n(Demo mode – add an API key in Settings.)");
    if (/plan|personal/.test(low)) return res("Your plan: 1) finish your two high-priority assignments, 2) 15 minutes of micro-learning daily, 3) review with the AI tutor each Friday.");
    if (ctx) return res("From this lesson: " + first(ctx) + "\n\nAsk me to summarise, quiz you or explain it simply.\n(Demo mode – add an API key in Settings for full AI answers.)");
    res("I'm your AI tutor. Open a course and ask me to summarise it, quiz you or explain a concept. (Demo mode – add an Anthropic API key in Settings to enable real AI.)");
  }, 650));
}
function parseJSON(t) { try { const a = t.indexOf("{"), b = t.lastIndexOf("}"); return JSON.parse(t.slice(a, b + 1)); } catch { return null; } }

/* ---------- router ---------- */
const landingEl = $("#landing"), appEl = $("#app");
let view = { name: "home" };
function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [a, b] = h.split("/");
  if (a !== "app") { landingEl.hidden = false; appEl.hidden = true; $("#tutor").hidden = true; document.title = "Lumi Learn"; if (!landingEl.dataset.r) renderLanding(); return; }
  landingEl.hidden = true; appEl.hidden = false; window.scrollTo(0, 0);
  const [n, id] = [b || "home", h.split("/")[2]];
  view = { name: n, id };
  renderApp();
}
window.addEventListener("hashchange", route);

/* ---------- landing ---------- */
function renderLanding() {
  landingEl.dataset.r = 1;
  const go = 'href="#/app"';
  const TABS = [
    ["Author", "Courses in minutes, not weeks", "Drop in a PDF, a deck or rough notes. Lumi drafts the structure, lessons and quiz — you polish with plain-language edits while teammates co-write live.", "edit", ["Generate from file", "Rewrite shorter", "Translate to 40 languages"]],
    ["Learn", "A tutor for every learner", "Learners ask questions, get summaries and practise with adaptive quizzes — grounded in your own content, available around the clock on any device.", "spark", ["Summarise this lesson", "Quiz me on chapter 2", "Build my study plan"]],
    ["Automate", "Admin on autopilot", "Describe a task in a sentence. Enrolments, reminders, certificates and reports run themselves, and you stay in control with approvals.", "bolt", ["Enrol new hires in onboarding", "Remind overdue learners", "Issue certificates monthly"]],
    ["Insights", "Answers, not dashboards", "Ask a question about your learning data and get a chart and a written explanation back instantly.", "chart", ["Which courses stall at lesson 3?", "Completion by team", "Who needs a nudge this week?"]],
  ];
  landingEl.innerHTML = `
  <header class="nav" id="nav"><a class="logo" href="#/"><i class="mark"></i>Lumi</a>
    <nav class="nav-links"><a href="#how">Product</a><a href="#create">Studio</a><a href="#devices">Devices</a><a href="#ai">AI</a><a href="#pricing">Pricing</a></nav>
    <div class="nav-right"><a href="#/app/settings">Sign in</a><a class="btn accent" ${go}>Get started</a><button class="burger" aria-label="Menu" onclick="document.getElementById('nav').classList.toggle('open')">${ic("menu")}</button></div>
  </header>

  <section class="hero2">
    <div class="orb o1"></div><div class="orb o2"></div>
    <span class="pill-l"><b>New</b> AI course studio is live</span>
    <h1>Learning that people actually finish.</h1>
    <p class="sub">Lumi is the learning platform with an AI tutor for every learner and an AI co-author for every team. Create, teach and measure — on iPad, phone and desktop.</p>
    <div class="hero-cta"><a class="btn accent big" ${go}>Open the app</a><a class="btn light big" href="#how">See how it works</a></div>
    <div class="stage"><div class="shot">${appShot()}</div>
      <div class="chip-f c1"><span class="dot">${ic("check")}</span>Course generated</div>
      <div class="chip-f c2">${ic("spark")}AI tutor is online</div>
      <div class="chip-f c3"><b>92%</b> completion</div>
      <div class="chip-f c4">${ic("cal")}Live session · 13:00</div></div>
  </section>

  <section class="sec" id="how"><h2>One platform. Four ways to make teams better.</h2>
    <div class="tabs" role="tablist">${TABS.map((t, i) => `<button class="tab ${i ? "" : "on"}" data-t="${i}" role="tab">${t[0]}</button>`).join("")}</div>
    <div class="tabpane" id="tabpane"></div></section>

  <section class="scene-sec" id="create"><h2 class="scene-h">Co-write courses with your team and an AI that keeps up.</h2>
    <div class="scene"><div class="chair"></div>
      <div class="lap"><div class="lap-screen"><div class="lap-cam"></div><div class="lap-in">
        <div class="lap-bar"><i></i><i></i><i></i><span>app.lumi.learn</span></div>
        <div class="lap-app"><aside>${ic("play")}${ic("search")}${ic("book")}<b class="sel">${ic("note")}</b>${ic("note")}<b style="color:#7c5cff">${ic("edit")}</b><b style="color:#d6431f">${ic("note")}</b><em>+</em></aside>
          <div class="lap-main"><div class="lap-top"><div><b>Untitled course</b><small>My drafts</small></div><span class="av-s"><i style="background:#18a957"></i><i style="background:#3b82f6"></i><i style="background:#ec4899"></i></span><span class="pub">Publish</span></div>
            <div class="lap-cv"><span class="cur" style="left:20%;top:12%;background:#18a957">Ava</span><span class="cur" style="right:8%;top:30%;background:#2563eb;animation-delay:-3s">Noah</span><span class="cur" style="left:4%;top:56%;background:#8b5cf6;animation-delay:-5s">Mia</span>
              <small>The craft of teaching</small><h3>Teaching in an age of intelligent tools<u>Leo</u></h3>
              <div class="eb">${ic("spark")}<span>Tell the AI what to change…</span><b>B</b><i>I</i><span>Aa</span><span>···</span></div>
              <p>Great teachers adapt to every learner. This course shows you how to blend your expertise with AI assistance to explain faster, personalise deeper and keep people curious.</p><div class="art"></div></div></div></div></div></div>
        <div class="lap-base"></div></div>
      <div class="bk b1"></div><div class="bk b2"></div><div class="bk b3"></div><div class="bk b4"></div><div class="bk b5"></div><div class="bk b6"></div><div class="binder"><i></i></div>
      <div class="cup"><b></b><u></u></div><div class="pen"></div></div></section>

  <section class="tablet-sec" id="devices"><div><h2 style="font-size:clamp(36px,5.2vw,64px);letter-spacing:-.045em;line-height:.98;font-weight:600">Made for the screen in your hand.</h2><p class="lead" style="font-size:20px;color:#444;margin-top:20px;max-width:520px">Lumi adapts to iPad, phone and desktop with touch-first lessons, offline-friendly progress and the same AI tutor everywhere.</p><div class="hero-cta" style="justify-content:flex-start"><a class="btn" ${go}>Try it on your device</a></div></div>
    <div class="tablet-art"><div class="tablet"><small style="color:#888">Lumi · Lesson 2</small><h4>Explaining with analogies</h4><div class="ln" style="width:60%"></div><div class="ln"></div><div class="ai-line"></div><div class="ln" style="width:85%"></div><div class="ln"></div><div class="ln" style="width:70%"></div></div></div>
    <div class="workday">Works on iPad, phone and desktop.</div></section>

  <section class="sec" id="ai"><div class="dark-card"><div><span class="pill-l dk"><b>AI</b> built in</span><h2>Ask for anything. Watch it get done.</h2><p class="lead">Summaries, quizzes, translations, enrolments and reports — one prompt away.</p><a class="btn accent" ${go} style="margin-top:26px">Talk to the tutor</a></div>
    <div class="chat-demo"><div class="m u">Make a 10-minute onboarding course from our handbook.</div><div class="m a">Done. I created 4 lessons and a 5-question quiz. Want it translated to German and Spanish?</div><div class="m u">Yes, and enrol the new hires.</div><div class="m a">Translated. 12 learners enrolled, reminders scheduled for Friday.</div></div></div>
    <div class="grid3">${[
      ["spark", "#5b3df5", "AI tutor", "Answers, quizzes and plans grounded in your content."],
      ["edit", "#ff6a3d", "Co-authoring", "Edit with plain language while teammates write live."],
      ["cal", "#0e9f6e", "Live sessions", "Polls, chat and automatic attendance."],
      ["chart", "#2563eb", "Insights", "Ask your data a question, get a chart back."],
      ["shield", "#8b5cf6", "Compliance", "Auto-enrol, remind and certify mandatory training."],
      ["bolt", "#111", "Workflows", "Describe an admin task and let Lumi run it."]
    ].map(([i, c, t, d]) => `<div class="card"><div class="ico" style="background:${c}">${ic(i)}</div><h3>${t}</h3><p>${d}</p></div>`).join("")}</div>
    <div class="stats"><div><b>5×</b><span>faster course creation</span></div><div><b>92%</b><span>average completion</span></div><div><b>40+</b><span>languages</span></div><div><b>24/7</b><span>AI tutor</span></div></div></section>

  <section class="cta-final" id="pricing"><h2>Start teaching smarter today.</h2><p style="opacity:.7;margin-top:18px;font-size:19px">Free to try. No credit card needed.</p><a class="btn" ${go}>Open Lumi</a></section>
  <footer><div><a class="logo" href="#/"><i class="mark"></i>Lumi</a><p style="margin-top:12px;max-width:260px">The AI-first learning platform.</p></div>
    ${[["Product", "Studio", "AI tutor", "Workflows", "Insights"], ["Solutions", "Onboarding", "Compliance", "Sales enablement", "Leadership"], ["Resources", "Help center", "Changelog", "Pricing"], ["Company", "About", "Careers", "Contact"]].map(c => `<div><b>${c[0]}</b>${c.slice(1).map(x => `<a href="#">${x}</a>`).join("")}</div>`).join("")}</footer>
  <div class="copy">© ${new Date().getFullYear()} Lumi. Demo project.</div>`;
  const pane = $("#tabpane", landingEl);
  const showTab = i => { const t = TABS[i]; $$(".tab", landingEl).forEach((b, k) => b.classList.toggle("on", k === i));
    pane.innerHTML = `<div><span class="ico2">${ic(t[3])}</span><h3>${t[1]}</h3><p>${t[2]}</p><a class="btn" ${go}>Explore ${t[0].toLowerCase()}</a></div><div class="mock">${t[4].map((x, k) => `<div class="mk" style="animation-delay:${k * .12}s">${ic(t[3])}<span>${x}</span><i>↗</i></div>`).join("")}</div>`; };
  $$(".tab", landingEl).forEach(b => b.onclick = () => showTab(+b.dataset.t)); showTab(0);
}
function appShot() {
  const rows = ASSIGN.slice(0, 4).map(a => { const c = byId(a.id); return `<div style="display:grid;grid-template-columns:3fr 1fr 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #eee;font-size:12px"><b>${esc(c.title)}</b><span style="color:#888">${a.due}</span><span>${a.pri}</span></div>`; }).join("");
  const cards = COURSES.slice(0, 5).map(c => `<div style="flex:1;min-width:90px"><div style="height:90px;border-radius:12px;background:${c.g}"></div><div style="font-size:11px;font-weight:600;margin-top:6px">${esc(c.title)}</div></div>`).join("");
  return `<div style="padding:30px;background:#fff;text-align:left"><div style="font-size:clamp(22px,3vw,34px);font-weight:600;letter-spacing:-.04em">Good morning, ${esc(S.name.split(" ")[0])}<br><span style="color:#bbb">You have 5 things to do today</span></div><div style="margin-top:20px">${rows}</div><div style="margin:22px 0 10px;font-weight:600">Recent</div><div style="display:flex;gap:12px">${cards}</div></div>`;
}

/* ---------- app shell ---------- */
const NAV = [["home", "Home", "home"], ["search", "Search", "search"], ["discover", "Discover", "compass"], ["create", "Create", "edit"], ["manage", "Manage", "folder"], ["workflows", "Workflows", "bolt"], ["settings", "Settings", "gear"]];
const SPACES = [["General", "#18a957", "G"], ["Engineering", "#ff6a00", "E"], ["Culture & Values", "#d6249f", "C"], ["Design", "#3b82f6", "D"]];
function renderApp() {
  const n = view.name;
  appEl.innerHTML = `<div class="shell"><aside class="side">
    <div class="org"><i>${ic("spark")}</i>Northwind ${ic("chev", "ic chev")}</div>
    ${NAV.map(([k, l, i]) => `<button class="nav-i ${n === k || (n === "course" && k === "home") ? "on" : ""} ${["workflows", "settings"].includes(k) ? "" : ""}" data-go="${k}">${ic(i)}<span>${l}</span></button>`).join("")}
    <div class="sp"></div>
    ${SPACES.map(([l, c, x]) => `<button class="space" data-go="discover:${l}"><i style="background:${c}">${x}</i>${l}${ic("chev", "ic chev")}</button>`).join("")}
    <button class="space" data-go="discover">${ic("plus")}Browse</button>
    <div class="grow"></div><button class="btn-new" data-go="create">New</button></aside>
    <main class="main" id="main"></main></div>
    <button class="tfab" id="tfab">${ic("spark")}AI Tutor</button>`;
  $$("[data-go]", appEl).forEach(b => b.onclick = () => { const [k, f] = b.dataset.go.split(":"); if (f) cat = f; location.hash = "#/app/" + k; });
  $("#tfab").onclick = () => openTutor();
  document.title = "Lumi Learn – " + (NAV.find(x => x[0] === n)?.[1] || "Course");
  const m = $("#main");
  ({ home: vHome, search: vSearch, discover: vDiscover, create: vCreate, manage: vManage, workflows: vWorkflows, settings: vSettings, course: vCourse }[n] || vHome)(m);
}
let cat = "All";
const topbar = (right = "") => `<div class="topbar"><div class="who"><span class="av"></span>${esc(S.name)}</div><div class="r">${right}<span>Need help? View resources</span></div></div>`;
const thumb = c => `<span class="th" style="background:${c.g}"></span>`;

function vHome(m) {
  const left = c => { const p = pct(c); return p >= 100 ? "Done" : p ? `${Math.round(c.mins * (1 - p / 100))} min left` : `${c.mins} min`; };
  m.innerHTML = topbar() + `<h1 class="greet">${greeting()}, ${esc(S.name.split(" ")[0])}<span>You have ${ASSIGN.filter(a => pct(byId(a.id)) < 100).length} things to do today</span></h1>
  <div class="tbl"><div class="tr h"><span>Assignment</span><span class="c-type">Type</span><span>Progress</span><span class="c-date">Date and time</span><span>Priority</span><span class="c-more"></span></div>
  ${ASSIGN.map(a => { const c = byId(a.id), p = pct(c); return `<div class="tr" data-c="${c.id}"><div class="name">${thumb(c)}<span>${esc(c.title)}</span>${a.note ? `<em>${esc(a.note)}</em>` : ""}</div><span class="c-type">${ic("book")}</span>
    <span class="prog">${p ? `<span class="bar"><i style="width:${p}%"></i></span>` : `<span class="bar"></span>`}${left(c)}</span><span class="c-date">${a.due}</span><span class="pri ${a.pri === "Mandatory" ? "m" : ""}">${a.pri === "Mandatory" ? "" : "<b></b>"}${a.pri}</span><span class="c-more">⋯</span></div>`; }).join("")}</div>
  <h2 class="sh">Recent<small>${all().length}</small></h2><div class="rail">${all().slice(0, 8).map(cardHTML).join("")}</div>
  <h2 class="sh">Featured</h2><div class="feat"><div class="fcard" style="background:linear-gradient(120deg,#35b6e8,#ff5a1f 55%,#ffcf1f)" data-c="remote-comm">Managing remote & hybrid teams effectively</div><div class="fcard" style="background:#0e0e0e" data-c="cyber">Cybersecurity essentials for all employees</div></div>
  <form class="hint-bar" id="ask">${ic("plus")}<input placeholder="Ask anything" aria-label="Ask anything"><button class="send" aria-label="Send">${ic("up")}</button></form>`;
  bindCourseClicks(m);
  $("#ask", m).onsubmit = e => { e.preventDefault(); const v = e.target.firstElementChild.nextElementSibling.value.trim(); openTutor(v); };
}
const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };
function cardHTML(c) {
  const chip = c.live ? `<span class="chip"><b style="color:red">●</b> Live</span>` : c.done || S.done[c.id] ? `<span class="chip" style="color:#18a957">● Completed</span>` : c.edit ? `<span class="chip">✎ Edit</span>` : c.program ? `<span class="chip">☰ Program</span>` : "";
  return `<div class="cc" data-c="${c.id}"><div class="im" style="background:${c.g}">${c.live ? `<span class="chip" style="position:absolute;left:10px;top:10px">Today<br>${c.live.split(" ")[1]}</span>` : ""}${chip}</div><h4>${esc(c.title)}</h4><small>${esc(c.sub || c.cat || "")}</small></div>`;
}
function bindCourseClicks(r) { $$("[data-c]", r).forEach(e => e.onclick = () => location.hash = "#/app/course/" + e.dataset.c); }

function vSearch(m) {
  m.innerHTML = topbar() + `<h1 class="greet">Search</h1><div class="hint-bar" style="margin-bottom:24px">${ic("search")}<input id="q" placeholder="Search courses, topics, skills…" autofocus></div><div id="res" class="grid-c"></div><div id="aians"></div>`;
  const draw = () => { const q = $("#q").value.toLowerCase(); const r = all().filter(c => !q || (c.title + c.desc + c.cat).toLowerCase().includes(q)); $("#res").innerHTML = r.map(cardHTML).join("") || `<p class="note">No results. Try asking the AI tutor.</p>`; bindCourseClicks($("#res")); };
  $("#q").oninput = draw; draw();
  $("#q").onkeydown = async e => { if (e.key === "Enter" && e.target.value.trim()) { const a = $("#aians"); a.innerHTML = `<div class="answer">Thinking…</div>`; const t = await ai(`The learner searched: "${e.target.value}". Recommend which of these courses to take and why: ${all().map(c => c.title).join("; ")}.`, { system: "You are Lumi's AI tutor." }); a.innerHTML = `<div class="answer">${esc(t)}</div>`; } };
}
function vDiscover(m) {
  const cats = ["All", ...new Set(all().map(c => c.cat))];
  m.innerHTML = topbar() + `<h1 class="greet">Discover</h1><div class="cats">${cats.map(c => `<button class="cat ${c === cat ? "on" : ""}" data-cat="${c}">${c}</button>`).join("")}</div><div class="grid-c">${all().filter(c => cat === "All" || c.cat === cat).map(cardHTML).join("")}</div>`;
  bindCourseClicks(m); $$("[data-cat]", m).forEach(b => b.onclick = () => { cat = b.dataset.cat; vDiscover(m); });
}

/* ---------- course player ---------- */
function vCourse(m) {
  const c = byId(view.id); if (!c) { location.hash = "#/app"; return; }
  let i = 0, quiz = false;
  const draw = () => {
    const L = c.lessons, d = S.progress[c.id] || 0;
    m.innerHTML = topbar(`<button class="btn ghost" id="back">← Back</button>`) + `<div class="player"><div class="lessons">${L.map((l, k) => `<button class="${!quiz && k === i ? "on" : ""}" data-l="${k}"><span class="n ${d >= (k + 1) / (L.length + 1) * 100 ? "d" : ""}">${d >= (k + 1) / (L.length + 1) * 100 ? "✓" : k + 1}</span>${esc(l.t)}</button>`).join("")}<button class="${quiz ? "on" : ""}" data-l="q"><span class="n ${S.done[c.id] ? "d" : ""}">${S.done[c.id] ? "✓" : "?"}</span>Knowledge check</button></div>
    <div>${quiz ? quizHTML() : `<div class="lesson-hero" style="background:${c.g};color:${/dark|0b0b0b|7a1020|6d28d9|d8467a|0f766e/.test(c.g) ? "#fff" : "#111"}"><small>${esc(c.title)} · ${i + 1}/${L.length}</small><h1>${esc(L[i].t)}</h1></div><div class="prose">${L[i].b.split("\n\n").map(p => `<p>${esc(p)}</p>`).join("")}</div>
    <div class="nav-btns">${i > 0 ? `<button class="btn ghost" id="prev">Previous</button>` : ""}<button class="btn" id="next">${i < L.length - 1 ? "Next lesson" : "Knowledge check"}</button><button class="btn light" id="ask">${ic("spark")}Ask AI Tutor</button></div>`}</div></div>`;
    $("#back").onclick = () => history.back();
    $$("[data-l]", m).forEach(b => b.onclick = () => { if (b.dataset.l === "q") quiz = true; else { quiz = false; i = +b.dataset.l; } draw(); });
    $("#prev") && ($("#prev").onclick = () => { i--; draw(); });
    $("#next") && ($("#next").onclick = () => { S.progress[c.id] = Math.max(S.progress[c.id] || 0, Math.round((i + 1) / (L.length + 1) * 100)); save(); if (i < L.length - 1) i++; else quiz = true; draw(); window.scrollTo(0, 0); });
    $("#ask") && ($("#ask").onclick = () => openTutor("", lessonCtx(c, i)));
    if (quiz) bindQuiz();
  };
  const quizHTML = () => `<div class="lesson-hero" style="background:var(--soft)"><small>${esc(c.title)}</small><h1>Knowledge check</h1></div><div class="quiz">${c.quiz.map((q, k) => `<div class="q" data-q="${k}"><h4>${esc(q.q)}</h4>${q.o.map((o, j) => `<button class="opt" data-j="${j}">${esc(o)}</button>`).join("")}</div>`).join("")}<p id="qres" class="note"></p></div>`;
  const bindQuiz = () => { let ok = 0, ans = 0; $$(".q", m).forEach(q => { const k = +q.dataset.q; $$(".opt", q).forEach(b => b.onclick = () => { if (q.dataset.d) return; q.dataset.d = 1; ans++; const j = +b.dataset.j; const right = j === c.quiz[k].a; if (right) ok++; b.classList.add(right ? "ok" : "no"); if (!right) $$(".opt", q)[c.quiz[k].a].classList.add("ok");
    if (ans === c.quiz.length) { $("#qres").innerHTML = `<b style="font-size:18px;color:#111">${ok}/${c.quiz.length} correct${ok === c.quiz.length ? " – course completed 🎉" : ""}</b>`; if (ok === c.quiz.length) { S.done[c.id] = true; S.progress[c.id] = 100; save(); toast("Course completed 🎉"); } } }); }); };
  draw();
}
const lessonCtx = (c, i) => `Course: ${c.title}\nLESSON:\n${c.lessons[i].t}\n${c.lessons[i].b}`;

/* ---------- editor ---------- */
let draft = { kick: "The craft of teaching", title: "Teaching in an age of intelligent tools", body: "Great teachers adapt to every learner. This course shows you how to blend your expertise with AI assistance to explain faster, personalise deeper and keep people curious.", lessons: null, bg: "#cdf56b" };
function vCreate(m) {
  m.innerHTML = `<div class="ed-top"><div class="t">Untitled course<small>My drafts</small></div><div style="margin-left:auto;display:flex;gap:12px;align-items:center"><div class="theme-dots">${["#cdf56b", "#ffb4c4", "#bde8ff", "#c8f7c5", "#e9e1ff"].map(c => `<button style="background:${c}" data-bg="${c}" aria-label="Theme"></button>`).join("")}</div>
  <div class="stack">${[["C", "#18a957"], ["S", "#3b82f6"], ["M", "#ec4899"]].map(([a, c]) => `<i style="background:${c}">${a}</i>`).join("")}</div>
  <button class="btn ghost" id="gen">${ic("cloud")}Generate from file</button><input type="file" id="file" hidden accept=".txt,.md,.csv,.json,.pdf,.docx"><button class="btn" style="background:var(--blue)" id="pub">Publish</button></div></div>
  <div class="canvas" id="cv" style="background:${draft.bg}"><span class="cur" style="left:12%;top:7%;background:#18a957">Ava</span><span class="cur" style="right:10%;top:34%;background:#3b82f6;animation-delay:-3s">Noah</span><span class="cur" style="left:5%;top:64%;background:#8b5cf6;animation-delay:-5s">Mia</span>
  <div class="kick" contenteditable data-k="kick">${esc(draft.kick)}</div><h1 contenteditable data-k="title">${esc(draft.title)}</h1>
  <div class="editbar">${ic("spark")}<input id="eprompt" placeholder="Tell the AI what to change…" aria-label="Edit with AI"><b>B</b><i>I</i><span>Aa</span><button id="ego" aria-label="Apply">${ic("up")}</button></div>
  <div class="body" contenteditable data-k="body">${esc(draft.body)}</div><div class="art"></div></div>
  <p class="note" style="margin-top:12px">Tip: click a block, then describe the change in Edit Mode – e.g. “make it shorter” or “more formal”. ${hasKey() ? "" : "Demo mode – add an API key in Settings for real AI."}</p>`;
  let cur = $('[data-k="body"]', m);
  $$("[contenteditable]", m).forEach(e => { e.onfocus = () => cur = e; e.oninput = () => draft[e.dataset.k] = e.innerText; });
  $$("[data-bg]", m).forEach(b => b.onclick = () => { draft.bg = b.dataset.bg; $("#cv").style.background = draft.bg; });
  const run = async () => { const p = $("#eprompt").value.trim(); if (!p) return; cur.classList.add("busy"); const t = await ai(`EDIT: ${p}\nTEXT:\n${cur.innerText}`, { system: "You are an editing assistant. Apply the instruction to the text and return ONLY the revised text, no commentary." }); cur.classList.remove("busy"); cur.innerText = t.trim(); draft[cur.dataset.k] = cur.innerText; $("#eprompt").value = ""; toast("Updated with AI"); };
  $("#ego").onclick = run; $("#eprompt").onkeydown = e => e.key === "Enter" && run();
  $("#gen").onclick = () => $("#file").click();
  $("#file").onchange = async e => {
    const f = e.target.files[0]; if (!f) return; toast("Generating from " + f.name + "…");
    let txt = ""; if (/\.(txt|md|csv|json)$/i.test(f.name)) txt = (await f.text()).slice(0, 12000);
    const topic = txt || ("a course based on the file named " + f.name);
    const out = await ai(`Create a short course from this material. Return ONLY JSON: {"kick":string,"title":string,"body":string,"lessons":[{"t":string,"b":string}],"quiz":[{"q":string,"o":[string,string,string],"a":number}]} (3 lessons, 2 quiz questions).\nMATERIAL:\n${topic}`, { max: 2000 });
    const j = parseJSON(out);
    if (j && j.title) draft = { ...draft, kick: j.kick || "New course", title: j.title, body: j.body || "", lessons: j.lessons, quiz: j.quiz };
    else { const paras = txt.split(/\n{2,}/).filter(Boolean).slice(0, 4); const nm = f.name.replace(/\.[^.]+$/, ""); draft = { ...draft, kick: "Generated from file", title: nm.replace(/[-_]/g, " "), body: (paras[0] || "Course generated from " + f.name).slice(0, 300), lessons: (paras.length ? paras : ["Overview of " + nm]).map((p, k) => ({ t: "Lesson " + (k + 1), b: p })), quiz: null }; }
    vCreate(m); toast("Course draft generated");
  };
  $("#pub").onclick = () => {
    const id = "c" + Date.now();
    const c = { id, title: draft.title.trim() || "Untitled", desc: draft.body.slice(0, 80), cat: "My courses", g: `linear-gradient(135deg,${draft.bg},#fff)`, mins: 10, sub: "Just published", lessons: draft.lessons || [{ t: draft.kick || "Introduction", b: draft.body }],
      quiz: draft.quiz || [{ q: "Did you read this lesson?", o: ["Yes", "No", "Not sure"], a: 0 }] };
    S.custom.unshift(c); save(); toast("Published to your library"); location.hash = "#/app/course/" + id;
  };
}

/* ---------- manage / analytics ---------- */
function vManage(m) {
  const done = Object.keys(S.done).length, active = Object.keys(S.progress).length;
  const data = [["Mon", 42], ["Tue", 65], ["Wed", 58], ["Thu", 81], ["Fri", 74], ["Sat", 22], ["Sun", 18]];
  m.innerHTML = topbar() + `<h1 class="greet">Manage<span>Learning analytics for Northwind</span></h1>
  <div class="kpis"><div class="kpi"><b>1,284</b><span>Active learners</span></div><div class="kpi"><b>92%</b><span>Completion rate</span></div><div class="kpi"><b>${all().length}</b><span>Courses</span></div><div class="kpi"><b>${done}/${active || 0}</b><span>Your completed / started</span></div></div>
  <div class="chart"><b>Daily active learners</b><div class="bars">${data.map(([d, v]) => `<div style="height:${v}%"><span>${d}</span></div>`).join("")}</div><div style="height:22px"></div></div>
  <form class="hint-bar" id="aq" style="max-width:none">${ic("plus")}<input placeholder="Query platform data and visualise results" aria-label="Query"><button class="send" aria-label="Ask">${ic("up")}</button></form><div id="aans"></div>`;
  $("#aq").onsubmit = async e => { e.preventDefault(); const v = e.target.querySelector("input").value.trim(); if (!v) return; $("#aans").innerHTML = `<div class="answer">Analysing…</div>`; const t = await ai(v, { system: "You are Lumi's analytics agent. Data – daily active learners Mon–Sun: " + data.map(d => d.join("=")).join(", ") + "; 1,284 active learners; 92% completion; courses: " + all().map(c => c.title).join("; ") + ". Answer with insights; use simple text bars like ████ when visualising." }); $("#aans").innerHTML = `<div class="answer">${esc(t || "Demo mode: Thursday is the busiest day (81 learners), weekends are quiet. Add an API key in Settings for real analysis.")}</div>`; };
}

/* ---------- workflows ---------- */
const WF = [["Weekly digest", "Summarises what changed in your courses and learners this week", "mail", "#ffd24a"], ["Onboarding buddy", "Enrols new hires and sends a friendly first-week plan", "sun", "#ff9f43"], ["Quiz builder", "Turns any lesson into a quiz with answers and explanations", "users", "#6c8cff"], ["Compliance nudge", "Finds overdue mandatory training and reminds the right people", "glasses", "#4bc0c8"]];
function vWorkflows(m) {
  m.innerHTML = topbar(`<button class="btn" id="cw">${ic("plus")}Create Workflow</button>`) + `<h1 class="greet">Workflows</h1><div class="cats"><button class="cat on">Browse</button><button class="cat">My Workflows</button></div>
  <h2 class="sh" style="margin-top:10px;font-size:16px">Featured</h2><div class="wf-feat"><div data-w="0" style="background:linear-gradient(135deg,#f6a233,#f08a24)"><b>Weekly digest</b><span>A short summary of learners, courses and anything that needs attention.</span></div><div data-w="2" style="background:linear-gradient(135deg,#3ac1f0,#0f6bd7)"><b>Onboarding buddy</b><span>New hires are enrolled and get a friendly first-week plan.</span></div></div>
  <h2 class="sh" style="font-size:16px">All Workflows</h2><div class="wf-list">${WF.concat(WF).map((w, i) => `<button data-w="${i % 4}"><i style="background:${w[3]}"></i><div><b>${w[0]}</b><span>${w[1]}</span></div></button>`).join("")}</div>`;
  $("#cw").onclick = () => wfModal(); $$("[data-w]", m).forEach(b => b.onclick = () => wfModal(WF[+b.dataset.w]));
}
function wfModal(pre) {
  const r = $("#modal-root");
  r.innerHTML = `<div class="mask"><div class="modal"><button class="x" aria-label="Close">${ic("x")}</button><h3>What task do you want to complete?</h3>
  <form class="prompt" id="wf">${ic("spark")}<input value="${pre ? esc(pre[0] + ": " + pre[1]) : ""}" placeholder="When a new hire joins, enrol them in onboarding and send a welcome…"><button aria-label="Run">${ic("send")}</button></form>
  <button class="btn ghost" id="scr" style="margin:0 auto">Start from scratch →</button><div id="wres"></div>
  <p style="text-align:left;font-size:12px;margin-top:30px;color:#444">Start from an example</p><div class="ex" style="margin-top:12px">${WF.map((w, i) => `<button data-e="${i}"><i>${ic(w[2])}</i><div><b>${w[0]}</b><span>${w[1]}</span></div></button>`).join("")}</div></div></div>`;
  const close = () => r.innerHTML = ""; $(".x", r).onclick = close; $(".mask", r).onclick = e => e.target.classList.contains("mask") && close();
  const run = async () => { const v = $("#wf input").value.trim(); if (!v) return; $("#wres").innerHTML = `<div class="result">Running workflow…</div>`; const t = await ai(v, { system: "You are Lumi's workflow agent. Describe step by step what the workflow does for this learning-platform admin and produce a realistic example result." }); $("#wres").innerHTML = `<div class="result">${esc(t)}</div>`; };
  $("#wf").onsubmit = e => { e.preventDefault(); run(); }; $("#scr").onclick = () => { $("#wf input").focus(); };
  $$("[data-e]", r).forEach(b => b.onclick = () => { const w = WF[+b.dataset.e]; $("#wf input").value = w[0] + ": " + w[1]; run(); });
  setTimeout(() => $("#wf input").focus(), 50);
}

/* ---------- settings ---------- */
function vSettings(m) {
  m.innerHTML = topbar() + `<h1 class="greet">Settings</h1><div class="set">
  <div><label>Your name</label><input class="field" id="sn" value="${esc(S.name)}"></div>
  <div><label>Anthropic API key (for real AI)</label><input class="field" id="sk" type="password" placeholder="sk-ant-…" value="${esc(S.apiKey)}" autocomplete="off"><p class="note" style="margin-top:6px">Stored only in this browser (localStorage) and sent directly to api.anthropic.com. Without a key the app runs in demo mode.</p></div>
  <div><label>Model</label><input class="field" id="sm" value="${esc(S.model)}"></div>
  <div style="display:flex;gap:10px"><button class="btn" id="ss">Save</button><button class="btn ghost" id="sr">Reset progress</button></div></div>`;
  $("#ss").onclick = () => { S.name = $("#sn").value.trim() || S.name; S.apiKey = $("#sk").value.trim(); S.model = $("#sm").value.trim() || S.model; save(); toast("Saved"); };
  $("#sr").onclick = () => { S.progress = {}; S.done = {}; save(); toast("Progress reset"); };
}

/* ---------- AI tutor ---------- */
let chat = [], tctx = "";
function openTutor(first = "", ctx) {
  if (ctx !== undefined) tctx = ctx; else if (view.name !== "course") tctx = "";
  else if (view.id && byId(view.id)) tctx = lessonCtx(byId(view.id), 0);
  const el = $("#tutor"); el.hidden = false;
  el.innerHTML = `<header>${ic("spark")}AI Tutor<button aria-label="Close" id="tx">${ic("x")}</button></header><div class="msgs" id="msgs"></div>
  <div class="sugs">${["Summarise this", "Quiz me", "Explain simply", "Make me a plan"].map(s => `<button>${s}</button>`).join("")}</div>
  <form class="t-in" id="tf"><input placeholder="Ask anything" aria-label="Message"><button class="send" aria-label="Send">${ic("up")}</button></form>`;
  $("#tx").onclick = () => el.hidden = true;
  const msgs = $("#msgs"), paint = () => { msgs.innerHTML = (chat.length ? chat : [{ role: "assistant", text: "Hi! I'm your AI tutor. Ask me to summarise a lesson, quiz you or build a learning plan." }]).map(x => `<div class="m ${x.role === "user" ? "u" : "a"}">${esc(x.text)}</div>`).join(""); msgs.scrollTop = 1e9; };
  paint();
  const send = async t => { if (!t.trim()) return; const h = chat.slice(-8); chat.push({ role: "user", text: t }); paint(); msgs.insertAdjacentHTML("beforeend", `<div class="m a dots"><span></span><span></span><span></span></div>`); msgs.scrollTop = 1e9; const a = await ai(t, { system: "You are Lumi Learn's AI tutor. Help the learner understand the material, quiz them when asked, and be encouraging.\n" + (tctx ? tctx : ""), history: h }); chat.push({ role: "assistant", text: a }); paint(); };
  $("#tf").onsubmit = e => { e.preventDefault(); const i = e.target.querySelector("input"); const v = i.value; i.value = ""; send(v); };
  $$(".sugs button", el).forEach(b => b.onclick = () => send(b.textContent));
  if (first) send(first); else $("#tf input").focus();
}

/* ---------- boot ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) { /* offline cache intentionally omitted to keep updates instant */ }
route();
