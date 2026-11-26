"use strict";
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const NEW_PER_DAY = 8, CONFIDENT = 14; // days of interval at which an item counts as "confident"
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- state ----------
const blank = () => ({ cards: {}, lessons: {}, writing: [], read: [], custom: [], log: {}, intro: { d: 0, n: 0 }, start: 0 });
let S = { lang: "fr", script: "ur", fr: blank(), fa: blank() };
let view = "learn", words = null, lesson = null, sess = null, feeds = {}, menu = false;
let L, C, P, si;
const sync = () => { L = S.lang; C = window.COURSES[L]; P = S[L]; si = S.script === "hi" ? 2 : 1; };
// Help (pronunciation, comparisons) is shown in Urdu (si 1) or Hindi (si 2); everything else is English.
const pick = pair => Array.isArray(pair) ? pair[si === 2 ? 1 : 0] : pair;
function save() { window.ZB.save(S); } // sync.js: local copy first, then Supabase

// ---------- script converters ----------
const DCONS = { kh: "ख़", gh: "ग़", sh: "श", ch: "च", zh: "झ़", b: "ब", p: "प", t: "त", j: "ज", d: "द", r: "र", z: "ज़", s: "स", f: "फ़", q: "क़", k: "क", g: "ग", l: "ल", m: "म", n: "न", v: "व", h: "ह", y: "य", w: "व" };
const DVOW = { a: ["अ", ""], "â": ["आ", "ा"], e: ["ए", "े"], i: ["ई", "ी"], o: ["ओ", "ो"], u: ["ऊ", "ू"], ey: ["ऐ", "ै"], ow: ["औ", "ौ"] };
function lat2dev(s) { // Persian Latin transliteration → Devanagari
  return String(s).split(/([\s\-\/,.?!]+)/).map(w => {
    if (!/[a-zâ]/i.test(w)) return w;
    w = w.toLowerCase(); let out = "", i = 0, prevC = false;
    while (i < w.length) {
      const two = w.substr(i, 2), ch = w[i]; let v;
      if (ch === "'") { prevC = false; i++; continue; }
      if (two.length === 2 && DVOW[two] && !(w[i + 2] && DVOW[w[i + 2]])) { v = DVOW[two]; i += 2; }
      else if (DVOW[ch]) { v = DVOW[ch]; i++; }
      else { let c; if (DCONS[two]) { c = DCONS[two]; i += 2; } else { c = DCONS[ch] || ch; i++; } if (prevC) out += "्"; out += c; prevC = true; continue; }
      out += prevC ? v[1] : v[0]; prevC = false;
    }
    return out;
  }).join("");
}
const HC = { "क": "ک", "ख": "کھ", "ग": "گ", "च": "چ", "ज": "ج", "झ": "جھ", "ट": "ٹ", "ड": "ڈ", "त": "ت", "द": "د", "न": "ن", "प": "پ", "फ": "پھ", "ब": "ب", "म": "م", "य": "ی", "र": "ر", "ल": "ل", "व": "و", "श": "ش", "स": "س", "ह": "ہ" };
const HN = { "झ": "ژ", "ज": "ز", "फ": "ف", "ग": "غ", "ख": "خ", "क": "ق" };
const HM = { "ा": "ا", "ि": "ِ", "ी": "ی", "ु": "ُ", "ू": "و", "े": "ے", "ै": "ے", "ो": "و", "ौ": "و", "ॉ": "ا", "ॅ": "َ", "्": "", "ं": "ں", "ँ": "ں" };
const HV = { "अ": "ا", "आ": "آ", "इ": "اِ", "ई": "ای", "उ": "اُ", "ऊ": "اُو", "ए": "اے", "ऐ": "اے", "ओ": "او", "औ": "او", "ऑ": "آ" };
function hi2ur(s) { // Devanagari pronunciation → Urdu script (approximate)
  let out = ""; s = String(s);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], nx = s[i + 1], fin = !nx || !/[ऀ-ॿ]/.test(nx);
    if (HC[ch]) { if (nx === "़") { out += HN[ch] || HC[ch]; i++; } else out += HC[ch]; }
    else if (HV[ch]) out += (!fin && HV[ch] === "اے") ? "ای" : HV[ch];
    else if (ch in HM) { let m = HM[ch]; if (!fin && m === "ے") m = "ی"; if (!fin && m === "ں") m = "ن"; out += m; }
    else out += ch;
  }
  return out;
}

// ---------- course helpers ----------
const lvIdx = l => LEVELS.indexOf(l);
function vocabOf(lvl) { return C.levels[lvl].vocab.concat(P.custom.filter(c => c.lvl === lvl).map(c => c.v)); }
function itemsOf(lvl) {
  const out = vocabOf(lvl).map(v => ({ id: "v:" + v[0], k: "v", v, lvl }));
  for (const g of C.levels[lvl].grammar) g.q.forEach((q, i) => out.push({ id: `g:${g.id}:${i}`, k: "g", g, q, lvl }));
  return out;
}
const strength = id => { const c = P.cards[id]; return c ? Math.min(1, c.ivl / CONFIDENT) : 0; };
function levelStats(lvl) {
  const its = itemsOf(lvl); let conf = 0, learn = 0, sum = 0;
  for (const it of its) { const c = P.cards[it.id]; if (!c) continue; sum += strength(it.id); if (c.ivl >= CONFIDENT) conf++; else learn++; }
  const skipped = lvIdx(lvl) < P.start;
  return { n: its.length, conf, learn, prog: skipped ? 1 : sum / its.length, skipped };
}
function curLevel() { for (let i = P.start; i < 6; i++) if (levelStats(LEVELS[i]).prog < 0.8) return LEVELS[i]; return "C2"; }
function vparts(v) { // → {w, mean, pron, cmp}
  if (L === "fr") { const dev = v[2] || ""; return { w: v[0], mean: v[1], pron: dev ? (si === 2 ? esc(dev) : `<span class="ur">${esc(hi2ur(dev))}</span>`) : "", cmp: "" }; }
  const tr = v[1] || "", dev = tr ? lat2dev(tr) : "";
  const pron = tr ? `<span class="ltr">${esc(tr)}</span> · ${si === 2 ? esc(dev) : `<span class="ur">${esc(hi2ur(dev))}</span>`}` : "";
  const c = v.length >= 5 ? (si === 2 ? v[4] : v[3]) : "";
  return { w: v[0], mean: v[2], pron, cmp: c ? (si === 2 ? `<span>हिंदी में: ${esc(c)}</span>` : `<span class="ur">اردو میں: ${esc(c)}</span>`) : "" };
}
const IMG = n => `<img class="emo" src="img/${n}.png" alt="" draggable="false">`;
const tw = (text, cls = "") => `<span class="tw ${L === "fa" ? "fa" : ""} ${cls}" lang="${L}">${esc(text)}</span>`;
const spk = (text, big) => `<button class="spk ${big ? "big" : ""}" data-act="speak" data-text="${esc(text)}" aria-label="Listen">${IMG("speaker")}</button>`;
function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text.replace(/[\/_]/g, " ")); u.lang = L === "fr" ? "fr-FR" : "fa-IR"; u.rate = 0.85;
  const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(L)); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function logReview() { const d = today(); P.log[d] = (P.log[d] || 0) + 1; }
function streak() { let d = today(), n = 0; if (!P.log[d]) d--; while (P.log[d]) { n++; d--; } return n; }
function dueCount() { const d = today(); return Object.values(P.cards).filter(c => c.due <= d).length; }

// ---------- spaced repetition ----------
function grade(id, g) {
  const c = P.cards[id] || (P.cards[id] = { ivl: 0, ease: 2.5, due: today(), reps: 0, lapses: 0 });
  if (g === 0) { c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.lapses++; }
  else if (g === 1) { c.ivl = Math.max(1, c.ivl * 1.2); c.ease = Math.max(1.3, c.ease - 0.15); }
  else if (g === 2) { c.ivl = c.ivl < 1 ? 1 : c.ivl * c.ease; }
  else { c.ivl = c.ivl < 1 ? 3 : c.ivl * c.ease * 1.3; c.ease += 0.15; }
  c.reps++; c.due = today() + Math.round(c.ivl); logReview(); save();
}
function startSession(extra) {
  const d = today(), due = [], fresh = [], known = new Set();
  for (const lvl of LEVELS) for (const it of itemsOf(lvl)) {
    if (known.has(it.id)) continue; known.add(it.id);
    const c = P.cards[it.id];
    if (c) { if (c.due <= d) due.push(it); } else if (it.k === "v" && lvIdx(lvl) >= P.start) fresh.push(it);
  }
  if (P.intro.d !== d) P.intro = { d, n: 0 };
  const allow = extra ? NEW_PER_DAY : Math.max(0, NEW_PER_DAY - P.intro.n);
  const news = fresh.slice(0, allow).map(it => ({ ...it, isNew: true }));
  const q = shuffle(due); // interleave new words through the reviews
  news.forEach((n, i) => q.splice(Math.min(q.length, i * 3), 0, n));
  sess = { q, total: q.length, doneN: 0, right: 0, tries: 0, revealed: false, picked: null };
  prep();
}
function prep() { sess.revealed = false; sess.picked = null; const it = sess.q[0]; if (it && it.k === "g") it.ord = shuffle(it.q[1].map((_, i) => i)); }
function advance(requeue) {
  const it = sess.q.shift();
  if (requeue) { delete it.isNew; sess.q.splice(Math.min(sess.q.length, 3), 0, it); } else sess.doneN++;
  prep(); render();
}


// ---------- layout ----------
const UNIT = { A1: ["wave", "#58cc02", "#58a700"], A2: ["food", "#ce82ff", "#a568cc"], B1: ["airplane", "#00cd9c", "#00a47d"], B2: ["newspaper", "#1cb0f6", "#1899d6"], C1: ["graduation", "#ff9600", "#cc7900"], C2: ["crown", "#ff4b4b", "#d33131"] };
const COURSE = { fr: ["French", "fr"], fa: ["Persian", "ir"] };
const NAV = [["learn", "Learn", "house"], ["review", "Practice", "brain"], ["read", "Read", "newspaper"], ["write", "Write", "pencil"], ["progress", "Progress", "chart"], ["guide", "Guide", "bulb"]];
const flag = l => `<img class="flag" src="img/flags/${COURSE[l][1]}.svg" alt="">`;
const focusMode = () => (view === "review") || (view === "learn" && lesson && lesson.qi != null);

function render() {
  sync();
  document.body.className = "course-" + L + (focusMode() ? " focus" : "");
  const due = dueCount();
  $("#course").innerHTML = `<button class="course-btn" data-act="menu" aria-label="Change course">${flag(L)}<span>${COURSE[L][0]}</span></button>
    ${menu ? `<div class="course-menu">${["fr", "fa"].map(l => `<button data-act="lang" data-v="${l}" class="${l === L ? "on" : ""}">${flag(l)}${COURSE[l][0]}</button>`).join("")}</div>` : ""}`;
  $("#stats").innerHTML = `<span class="stat fire" title="Day streak">${IMG("fire")}${streak()}</span><span class="stat due" title="Reviews due">${IMG("brain")}${due}</span>`;
  $("#nav").innerHTML = `<div class="logo">my language</div>` + NAV.map(([v, label, ic]) => `<button data-act="view" data-v="${v}" class="${view === v ? "on" : ""}">${IMG(ic)}<span>${label}</span>${v === "review" && due ? `<i class="dot">${due}</i>` : ""}</button>`).join("");
  $("#main").innerHTML = ({ learn: vLearn, review: vReview, read: vRead, write: vWrite, progress: vProgress, guide: vGuide })[view]();
  $("#side").innerHTML = view === "learn" && !lesson && !words ? sidePanel() : "";
}
function helpToggle() {
  return `<div class="help-toggle"><span>Help in</span><button data-act="script" data-v="ur" class="${si === 1 ? "on" : ""}"><span class="ur">اردو</span></button><button data-act="script" data-v="hi" class="${si === 2 ? "on" : ""}">हिंदी</button></div>`;
}
function sidePanel() {
  const cur = curLevel(), s = levelStats(cur), fresh = P.intro.d === today() ? Math.max(0, NEW_PER_DAY - P.intro.n) : NEW_PER_DAY;
  return `<div class="panel">${IMG("bullseye")}<div><b>Daily practice</b><p>${dueCount()} to review · ${fresh} new words</p><button class="btn green" data-act="session">Start</button></div></div>
    <div class="panel">${IMG(UNIT[cur][0])}<div><b>Level ${cur}</b><p>${Math.round(s.prog * 100)}% done · ${s.conf} of ${s.n} confident</p><div class="pbar"><i style="width:${Math.round(s.prog * 100)}%"></i></div></div></div>
    <div class="panel">${IMG("fire")}<div><b>${streak()} day streak</b><p>${streak() ? "Keep it going: practise today." : "Practise today to start a streak."}</p></div></div>`;
}

// ---------- Learn: the path ----------
const OFFS = [0, 46, 70, 46, 0, -46, -70, -46];
function vLearn() {
  if (lesson) return vLesson();
  if (words) return vWords();
  const cur = curLevel(), nextId = (C.levels[cur].grammar.find(g => !P.lessons[g.id]) || {}).id;
  const fresh = P.intro.d === today() ? Math.max(0, NEW_PER_DAY - P.intro.n) : NEW_PER_DAY;
  let k = 0;
  const units = LEVELS.map((lvl, ui) => {
    const lv = C.levels[lvl], [ic, c1, c2] = UNIT[lvl], st = levelStats(lvl);
    const node = (act, v, img, label, state, extra = "") => {
      const off = OFFS[k++ % OFFS.length];
      return `<div class="node-wrap ${state === "cur" ? "has-bubble" : ""}" style="transform:translateX(${off}px)">${state === "cur" ? `<div class="bubble">START</div>` : ""}
        <button class="node ${state}" style="--c1:${c1};--c2:${c2}" data-act="${act}" data-v="${v}" ${extra} aria-label="${esc(label)}">${IMG(img)}</button><div class="node-label">${esc(label)}</div></div>`;
    };
    const nodes = [node("words", lvl, "books", "Words", st.conf >= st.n * 0.8 ? "done" : lvl === cur && !nextId ? "cur" : "")]
      .concat(lv.grammar.map(g => node("lesson", g.id, P.lessons[g.id] ? "star" : "open-book", g.t, P.lessons[g.id] ? "done" : g.id === nextId && lvl === cur ? "cur" : "")))
      .concat([node("words", lvl, "globe", "Culture", "", 'data-tab="culture"'), node("golevel", lvl, "trophy", `Level ${lvl} · ${Math.round(st.prog * 100)}%`, st.prog >= 0.8 ? "done" : "")]);
    return `<section class="unit"><div class="unit-banner" style="--c1:${c1};--c2:${c2}"><div><small>UNIT ${ui + 1} · ${lvl}</small><h2>${esc(lv.can)}</h2>
      <button class="btn ghost-white" data-act="words" data-v="${lvl}">${IMG("books")} Words &amp; culture</button></div>${IMG(ic)}</div><div class="path">${nodes.join("")}</div></section>`;
  }).join("");
  return `<div class="learn-head">${helpToggle()}</div>
    <div class="daily">${IMG("bullseye")}<div><b>Today's practice</b><span>${dueCount()} reviews · ${fresh} new words</span></div><button class="btn green" data-act="session">Start</button></div>${units}`;
}
function vWords() {
  const lvl = words.lvl, lv = C.levels[lvl], [ic, c1, c2] = UNIT[lvl];
  const rows = vocabOf(lvl).map(v => { const p = vparts(v), c = P.cards["v:" + v[0]];
    return `<div class="word-row"><span class="dot ${c ? (c.ivl >= CONFIDENT ? "c" : "l") : ""}"></span><div class="w ${L === "fa" ? "fa" : ""}" lang="${L}">${esc(p.w)}</div>${spk(p.w)}<div class="wm"><b>${esc(p.mean)}</b><div class="pron">${p.pron}</div>${p.cmp ? `<div class="cmp">${p.cmp}</div>` : ""}</div></div>`; }).join("");
  const cult = lv.culture.map(c => `<div class="card">${IMG(L === "fa" ? "tea" : "globe")}<div><b>${esc(c[0])}</b><p>${esc(c[1])}</p></div></div>`).join("");
  return `<button class="back" data-act="back">← Back</button>
    <div class="unit-banner small" style="--c1:${c1};--c2:${c2}"><div><small>${lvl}</small><h2>Words &amp; culture</h2></div>${IMG(ic)}</div>
    ${helpToggle()}
    <h3 ${words.tab === "culture" ? 'id="jump"' : ""}>Culture</h3>${cult}
    <h3>Words</h3><div class="card words">${rows}</div>
    <p class="muted">Green dot: confident. Yellow: still learning. New words join your daily practice a few at a time.</p>`;
}
function findLesson(id) { for (const l of LEVELS) { const g = C.levels[l].grammar.find(g => g.id === id); if (g) return [g, l]; } return []; }
function exHTML(e) {
  if (L === "fr") return `<div class="ex">${spk(e[0])}<div><div class="t" lang="fr">${esc(e[0])}</div><div class="muted">${esc(e[1])}</div></div></div>`;
  const dev = lat2dev(e[1]);
  return `<div class="ex">${spk(e[0])}<div><div class="t fa" lang="fa">${esc(e[0])}</div><div class="pron"><span class="ltr">${esc(e[1])}</span> · ${si === 2 ? esc(dev) : `<span class="ur">${esc(hi2ur(dev))}</span>`}</div><div>${esc(e[2])}</div></div></div>`;
}
function choices(q, ord, picked, act) {
  // "من دانشجو ___. (I am a student.)" → the Persian sentence, then its English meaning on its own line
  const m = /^(.*?)\s*\(([^()]*[a-z][^()]*)\)\s*$/i.exec(q[0]), main = m ? m[1] : q[0], hint = m ? m[2] : "";
  const rtl = /^[^A-Za-z«]*[\u0600-\u06ff]/.test(main);
  return `<div class="qtext ${rtl ? "fa" : ""}" lang="${rtl ? L : "en"}">${esc(main)}</div>${hint ? `<div class="qhint">${esc(hint)}</div>` : ""}<div class="opts">${ord.map((i, n) => {
    const cls = picked == null ? "" : i === q[2] ? "right" : i === picked ? "wrong" : "dim";
    return `<button class="opt ${cls}" data-act="${act}" data-v="${i}" ${picked != null ? "disabled" : ""}><kbd>${n + 1}</kbd><span class="${/[؀-ۿ]/.test(q[1][i]) ? "fa" : ""}">${esc(q[1][i])}</span></button>`; }).join("")}</div>`;
}
function footer(state, msg, btn) { // Duolingo-style bottom bar: state "", "ok" or "bad"
  return `<div class="foot ${state}"><div class="foot-in">${msg ? `<div class="foot-msg">${state === "ok" ? IMG("check") : ""}<div>${msg}</div></div>` : "<div></div>"}${btn}</div></div>`;
}
function vLesson() {
  const [g, lvl] = findLesson(lesson.id), [ic, c1, c2] = UNIT[lvl];
  if (lesson.qi == null) {
    const cmp = g.cmp ? `<div class="tip">${IMG("bulb")}<div><b>Compare</b><div class="${si === 1 ? "ur" : ""}">${esc(pick(g.cmp))}</div></div></div>` : "";
    return `<button class="back" data-act="back">← Back</button><div class="unit-banner small" style="--c1:${c1};--c2:${c2}"><div><small>${lvl} · GRAMMAR</small><h2>${esc(g.t)}</h2></div>${IMG("open-book")}</div>
      ${L === "fa" ? helpToggle() : ""}<div class="card lesson-text"><p>${esc(g.x)}</p></div>${cmp}<h3>Examples</h3>${g.ex.map(exHTML).join("")}
      <p class="center"><button class="btn green wide" data-act="lessonquiz">Practise this lesson</button></p>`;
  }
  const close = `<div class="sess-top"><button class="x" data-act="back" aria-label="Close">✕</button><div class="pbar"><i style="width:${100 * lesson.qi / g.q.length}%"></i></div></div>`;
  if (lesson.qi >= g.q.length) return close + `<div class="done">${IMG("trophy")}<h1>Lesson complete!</h1><p>${lesson.right} of ${g.q.length} right. These questions now come back in your daily practice.</p></div>` + footer("", "", `<button class="btn green" data-act="back">Continue</button>`);
  const q = g.q[lesson.qi], ok = lesson.picked === q[2];
  return close + `<div class="sess-body"><h2 class="ask">Choose the right answer</h2>${choices(q, lesson.ord, lesson.picked, "lessonpick")}</div>` +
    (lesson.picked == null ? footer("", "", `<button class="btn" disabled>Check</button>`)
      : footer(ok ? "ok" : "bad", ok ? "<b>Nicely done!</b>" : `<b>Correct answer:</b> <span class="${/[؀-ۿ]/.test(q[1][q[2]]) ? "fa" : ""}">${esc(q[1][q[2]])}</span>`, `<button class="btn ${ok ? "green" : "red"}" data-act="lessonnext">Continue</button>`));
}

// ---------- Practice session ----------
function vReview() {
  if (!sess) startSession(false);
  const it = sess.q[0];
  const top = `<div class="sess-top"><button class="x" data-act="view" data-v="learn" aria-label="Close">✕</button><div class="pbar"><i style="width:${100 * sess.doneN / Math.max(1, sess.doneN + sess.q.length)}%"></i></div></div>`;
  if (!it) {
    const acc = sess.tries ? Math.round(100 * sess.right / sess.tries) : 100;
    return top + `<div class="done">${IMG(sess.doneN ? "party" : "check")}<h1>${sess.doneN ? "Practice complete!" : "All caught up!"}</h1>
      <div class="done-stats"><div class="ds gold"><small>REVIEWED</small><b>${sess.doneN}</b></div><div class="ds green"><small>ACCURACY</small><b>${acc}%</b></div><div class="ds blue"><small>STREAK</small><b>${streak()} ${IMG("fire")}</b></div></div></div>` +
      footer("", "", `<div class="row"><button class="btn" data-act="moresession">Learn 8 more words</button><button class="btn green" data-act="view" data-v="learn">Continue</button></div>`);
  }
  if (it.k === "g") {
    const ok = sess.picked === it.q[2];
    return top + `<div class="sess-body"><div class="tag">${it.lvl} · ${esc(it.g.t)}</div>${choices(it.q, it.ord, sess.picked, "pick")}
      ${sess.picked != null && !ok ? `<div class="tip">${IMG("bulb")}<div><b>Rule</b><div>${esc(it.g.x)}</div></div></div>` : ""}</div>` +
      (sess.picked == null ? footer("", "", `<button class="btn" disabled>Check</button>`)
        : footer(ok ? "ok" : "bad", ok ? "<b>Nicely done!</b>" : `<b>Correct answer:</b> <span class="${/[؀-ۿ]/.test(it.q[1][it.q[2]]) ? "fa" : ""}">${esc(it.q[1][it.q[2]])}</span>`, `<button class="btn ${ok ? "green" : "red"}" data-act="gnext">Continue</button>`));
  }
  const p = vparts(it.v), c = P.cards[it.id];
  const full = `<div class="say">${spk(p.w, true)}${tw(p.w)}</div><div class="pron">${p.pron}</div><div class="mean">${esc(p.mean)}</div>${p.cmp ? `<div class="cmp">${p.cmp}</div>` : ""}`;
  if (it.isNew) return top + `<div class="sess-body center"><div class="tag new">${IMG("sparkles")} NEW WORD</div>${full}</div>` + footer("", "", `<button class="btn green" data-act="intro">Continue</button>`);
  const produce = c && c.ivl >= 4; // once familiar, flip the card: recall the target word from its meaning
  const front = produce ? `<h2 class="ask">How do you say this in ${COURSE[L][0]}?</h2><div class="mean big">${esc(p.mean)}</div>` : `<h2 class="ask">What does this mean?</h2><div class="say">${spk(p.w, true)}${tw(p.w)}</div>`;
  return top + `<div class="sess-body center"><div class="tag">${it.lvl}</div>${sess.revealed ? full : front}</div>` +
    (sess.revealed ? footer("", "<b>How well did you know it?</b>", `<div class="grades"><button class="btn red" data-act="grade" data-v="0">Again</button><button class="btn" data-act="grade" data-v="1">Hard</button><button class="btn green" data-act="grade" data-v="2">Good</button><button class="btn blue" data-act="grade" data-v="3">Easy</button></div>`)
      : footer("", "", `<button class="btn blue" data-act="reveal">Show answer</button>`));
}

// ---------- Read, Write, Progress, Guide ----------
function vRead() {
  const f = feeds[L];
  const head = `<div class="page-head">${IMG("newspaper")}<div><h1>Read</h1><p>Today's news in ${COURSE[L][0]}. Read one article a day and add new words to your deck.</p></div></div>
    <div class="card add"><b>Add a word you met</b><div class="row"><input id="nw" class="${L === "fa" ? "fa" : ""}" placeholder="word" size="14"><input id="nm" placeholder="meaning in English" size="20"><button class="btn blue" data-act="addword">Add</button></div></div>`;
  if (!f) { loadFeed(); return head + `<p class="muted">Loading the latest articles…</p>`; }
  if (!f.length) return head + `<p class="muted">Couldn't load articles. Are you offline?</p>`;
  return head + f.map((a, i) => { const done = P.read.includes(a.link);
    return `<div class="card art ${done ? "read" : ""}"><div class="muted">${esc(a.source)} · ${esc((a.date || "").slice(0, 22))}</div><h3 class="${L === "fa" ? "fa" : ""}" lang="${L}">${esc(a.title)}</h3><div class="${L === "fa" ? "fa" : ""}" lang="${L}">${esc(a.summary)}</div>
      <div class="row">${spk(a.title)}<a class="btn" href="${esc(a.link)}" target="_blank" rel="noopener">Open article ↗</a><button class="btn ${done ? "" : "green"}" data-act="markread" data-v="${i}" ${done ? "disabled" : ""}>${done ? "✓ Read" : "Mark as read"}</button></div></div>`; }).join("");
}
async function loadFeed() { const l = L; feeds[l] = await window.ZB.feed(l); if (view === "read") render(); }
function vWrite() {
  const cur = curLevel();
  const opts = LEVELS.map(l => `<optgroup label="${l}">${C.levels[l].writing.map((w, i) => `<option value="${l}|${i}" ${l === cur && i === 0 ? "selected" : ""}>${esc(pick(w))}</option>`).join("")}</optgroup>`).join("");
  const hist = P.writing.slice().reverse().map(w => `<div class="card"><div class="muted">${new Date(w.d * 864e5).toISOString().slice(0, 10)} · ${w.lvl} · ${esc(w.prompt)}</div><div class="${L === "fa" ? "fa" : ""}" lang="${L}" style="white-space:pre-wrap">${esc(w.text)}</div></div>`).join("");
  return `<div class="page-head">${IMG("pencil")}<div><h1>Write</h1><p>Pick a topic and write a few sentences. Writing shows you what you can't say yet.</p></div></div>
    <div class="card"><b>Topic</b><select id="wp">${opts}</select><textarea id="wt" class="${L === "fa" ? "fa" : ""}" lang="${L}" dir="${L === "fa" ? "rtl" : "ltr"}" spellcheck="false" placeholder="Write here…"></textarea>
    <button class="btn green" data-act="wsave">Save</button></div>${hist ? `<h3>Your writing</h3>${hist}` : ""}`;
}
function vProgress() {
  const cur = curLevel(), d = today();
  let conf = 0, learn = 0; for (const c of Object.values(P.cards)) c.ivl >= CONFIDENT ? conf++ : learn++;
  const tiles = [["fire", streak(), "Day streak"], ["muscle", conf, "Confident"], ["brain", learn, "Learning"], ["calendar", dueCount(), "Due today"], ["newspaper", P.read.length, "Articles read"], ["pencil", P.writing.length, "Texts written"]]
    .map(([i, n, l]) => `<div class="tile">${IMG(i)}<div><b>${n}</b><span>${l}</span></div></div>`).join("");
  const ladder = LEVELS.map(l => { const s = levelStats(l), [ic, c1] = UNIT[l];
    return `<div class="rung ${l === cur ? "cur" : ""}" data-act="words" data-v="${l}">${IMG(ic)}<b>${l}</b><div class="pbar" style="--c1:${c1}"><i style="width:${Math.round(s.prog * 100)}%"></i></div><span>${Math.round(s.prog * 100)}%</span></div>`; }).join("");
  const max = Math.max(1, ...Array.from({ length: 14 }, (_, i) => P.log[d - i] || 0));
  const act = Array.from({ length: 14 }, (_, i) => { const n = P.log[d - 13 + i] || 0; return `<div style="height:${100 * n / max}%" title="${n}"></div>`; }).join("");
  return `<div class="page-head">${IMG("chart")}<div><h1>Progress</h1><p>${flag(L)} ${COURSE[L][0]} · level ${cur}</p></div></div>
    <div class="tiles">${tiles}</div>
    <div class="card"><b>Levels</b><div class="ladder">${ladder}</div><p class="row muted">I already know everything below: <select data-act="placement">${LEVELS.map((l, i) => `<option value="${i}" ${i === P.start ? "selected" : ""}>${l}</option>`).join("")}</select></p></div>
    <div class="card"><b>Reviews, last 14 days</b><div class="act">${act}</div></div>`;
}
function vGuide() {
  const rows = C.guide.map(r => L === "fr" ? `<div class="g-row"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`
    : `<div class="g-row"><b>${esc(r[0])}</b><span class="${si === 1 ? "ur" : ""}">${esc(si === 2 ? r[2] : r[1])}</span></div>`).join("");
  return `<div class="page-head">${IMG("bulb")}<div><h1>Guide</h1><p>How the app works, and how to pronounce ${COURSE[L][0]}.</p></div></div>
    <div class="card"><b>How this app teaches</b><p>Each day: (1) do your practice: due reviews mixed with up to 8 new words; (2) take one grammar lesson and its quiz; (3) read one real article; (4) write a few sentences. Recalling an answer from memory is what builds memory, and spacing those recalls over growing gaps makes it last: every item comes back after 1 day, then about 3, 6, 15, 40… days, sooner if you miss it. Once a word is familiar the card flips and you have to produce the ${COURSE[L][0]} yourself. A word is "confident" when its gap reaches 14 days; a level is done at 80%.</p></div>
    ${helpToggle()}<div class="card"><b>Pronunciation</b>${rows}</div>`;
}

// ---------- actions ----------
const ACT = {
  menu() { menu = !menu; },
  lang(v) { S.lang = v; sess = lesson = words = null; menu = false; save(); },
  script(v) { S.script = v; save(); },
  view(v) { view = v; lesson = words = null; menu = false; if (v === "review") sess = null; },
  back() { lesson = words = null; },
  words(v, el) { words = { lvl: v, tab: el && el.dataset.tab }; view = "learn"; },
  golevel(v) { words = { lvl: v }; view = "learn"; },
  placement(v) { P.start = +v; sess = null; save(); },
  session() { view = "review"; sess = null; },
  moresession() { startSession(true); },
  speak(_, el) { speak(el.dataset.text); return false; },
  reveal() { sess.revealed = true; },
  intro() { const it = sess.q[0]; P.cards[it.id] = { ivl: 0, ease: 2.5, due: today(), reps: 0, lapses: 0 }; P.intro.n++; save(); advance(true); return false; },
  grade(v) { const it = sess.q[0]; sess.tries++; if (+v > 0) sess.right++; grade(it.id, +v); advance(+v === 0); return false; },
  pick(v) { const it = sess.q[0]; sess.picked = +v; sess.ok = +v === it.q[2]; sess.tries++; if (sess.ok) sess.right++; grade(it.id, sess.ok ? 2 : 0); },
  gnext() { advance(!sess.ok); return false; },
  lesson(v) { lesson = { id: v, qi: null }; view = "learn"; },
  lessonquiz() { const [g] = findLesson(lesson.id); lesson.qi = 0; lesson.right = 0; lesson.picked = null; lesson.ord = shuffle(g.q[0][1].map((_, i) => i)); },
  lessonpick(v) { const [g] = findLesson(lesson.id); lesson.picked = +v; const ok = +v === g.q[lesson.qi][2]; if (ok) lesson.right++; grade(`g:${g.id}:${lesson.qi}`, ok ? 2 : 0); },
  lessonnext() { const [g] = findLesson(lesson.id); lesson.qi++; lesson.picked = null; if (lesson.qi < g.q.length) lesson.ord = shuffle(g.q[lesson.qi][1].map((_, i) => i)); else { P.lessons[g.id] = today(); save(); } },
  markread(v) { const a = feeds[L][+v]; if (!P.read.includes(a.link)) { P.read.push(a.link); logReview(); save(); } },
  addword() { const w = $("#nw").value.trim(), m = $("#nm").value.trim(); if (!w || !m) return false; P.custom.push({ lvl: curLevel(), v: L === "fr" ? [w, m, ""] : [w, "", m] }); sess = null; save(); window.ZB.toast("Added to your words"); },
  wsave() {
    const text = $("#wt").value.trim(); if (!text) return false;
    const [lvl, i] = $("#wp").value.split("|");
    P.writing.push({ d: today(), lvl, prompt: pick(C.levels[lvl].writing[+i]), text }); logReview(); save(); window.ZB.toast("Saved");
  },
};
function dispatch(e) {
  const el = e.target.closest("[data-act]");
  if (!el) { if (menu && !e.target.closest("#course")) { menu = false; render(); } return; }
  const isSel = el.tagName === "SELECT";
  if ((e.type === "change") !== isSel) return;
  if (el.disabled) return;
  const r = ACT[el.dataset.act](isSel ? el.value : el.dataset.v, el);
  if (r !== false) { render(); const j = document.getElementById("jump"); if (j) j.scrollIntoView(); else if (el.dataset.act !== "speak" && !isSel && /view|lesson|words|back|golevel|session|lang/.test(el.dataset.act)) scrollTo(0, 0); }
}
document.addEventListener("click", dispatch);
document.addEventListener("change", dispatch);
document.addEventListener("keydown", e => {
  if (/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) return;
  if (e.key === "Escape" && focusMode()) { (view === "review" ? ACT.view("learn") : ACT.back()); render(); return; }
  const go = () => { const b = document.querySelector('.foot .btn.green:not([disabled]), .foot .btn.red:not([disabled]), [data-act="reveal"], [data-act="intro"]'); if (b) b.click(); };
  if (e.key === " " || e.key === "Enter") { if (focusMode()) { e.preventDefault(); go(); } return; }
  if (/^[1-4]$/.test(e.key) && focusMode()) {
    const opt = document.querySelectorAll(".opt:not([disabled])")[+e.key - 1]; if (opt) { opt.click(); return; }
    if (view === "review" && sess && sess.revealed && sess.q[0] && sess.q[0].k === "v") { ACT.grade(+e.key - 1); }
  }
});

render();
window.ZB.init({
  apply(j) { // progress from this device's saved copy, the database, or another device
    if (!j) return; S = { ...S, ...j }; for (const l of ["fr", "fa"]) S[l] = { ...blank(), ...S[l] }; sync();
    const typing = /TEXTAREA|INPUT/.test((document.activeElement || {}).tagName || "");
    if (!typing && !focusMode()) render();
  },
  current: () => S,
});
