"use strict";
// My Language: French and Persian, taught in English with pronunciation help and comparisons
// in everyday Urdu or Hindi. All levels are open. Progress syncs through sync.js.
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const LEVEL_NAME = { A1: "Beginner", A2: "Elementary", B1: "Intermediate", B2: "Upper intermediate", C1: "Advanced", C2: "Mastery" };
const NEW_PER_DAY = 8, MASTERED = 21, CONFIDENT = 14;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);

// ---------- state ----------
const blank = () => ({ cards: {}, lessons: {}, writing: [], read: [], saved: [], custom: [], log: {}, intro: { d: 0, n: 0 }, start: 0 });
let S = { lang: "fr", script: "ur", fr: blank(), fa: blank() };
// UI state: view = home | practice | read | progress | guide; page = level sub-page; sess = practice session
let view = "home", lvl = null, page = null, lessonId = null, textId = null, sess = null, feeds = {}, menu = false;
let lvlPicked = false, vf = { topic: "", q: "" }, picked = new Set(), bankFilter = "all", showEn = false, readLvl = null;
let L, C, P, si;
const sync = () => { L = S.lang; C = window.COURSES[L]; P = S[L]; P.saved = P.saved || []; si = S.script === "hi" ? 2 : 1; if (!lvl) lvl = curLevel(); };
const pick = pair => Array.isArray(pair) ? pair[si === 2 ? 1 : 0] : pair; // [urdu, hindi]
function save() { window.ZB.save(S); }

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
const HC = { "क": "ک", "ख": "کھ", "ग": "گ", "घ": "گھ", "च": "چ", "छ": "چھ", "ज": "ج", "झ": "جھ", "ट": "ٹ", "ठ": "ٹھ", "ड": "ڈ", "ढ": "ڈھ", "त": "ت", "थ": "تھ", "द": "د", "ध": "دھ", "न": "ن", "ण": "ن", "प": "پ", "फ": "پھ", "ब": "ب", "भ": "بھ", "म": "م", "य": "ی", "र": "ر", "ल": "ل", "व": "و", "श": "ش", "ष": "ش", "स": "س", "ह": "ہ" };
const HN = { "झ": "ژ", "ज": "ز", "फ": "ف", "ग": "غ", "ख": "خ", "क": "ق", "ड": "ڑ", "ढ": "ڑھ" };
const HM = { "ा": "ا", "ि": "ِ", "ी": "ی", "ु": "ُ", "ू": "و", "े": "ے", "ै": "ے", "ो": "و", "ौ": "و", "ॉ": "ا", "ॅ": "َ", "्": "", "ं": "ں", "ँ": "ں" };
const HV2 = { "इ": "ئ", "ई": "ئی", "उ": "ؤ", "ऊ": "ؤ", "ए": "ئے", "ऐ": "ئے", "ओ": "و", "औ": "و" }; // a vowel after a vowel: कोई → کوئی
const HV = { "अ": "ا", "आ": "آ", "इ": "اِ", "ई": "ای", "उ": "اُ", "ऊ": "او", "ए": "اے", "ऐ": "اے", "ओ": "او", "औ": "او", "ऑ": "آ" };
function hi2ur(s, marks = true) { // Devanagari → Urdu script (approximate, phonetic); marks: keep zer and pesh as pronunciation hints
  let out = ""; s = String(s).normalize("NFD");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i], nx = s[i + 1], fin = !nx || !/[ऀ-ॿ]/.test(nx);
    if (HC[ch]) { if (nx === "़") { out += HN[ch] || HC[ch]; i++; } else out += HC[ch]; }
    else if (HV[ch]) { const mid = i > 0 && /[ऀ-ॿ]/.test(s[i - 1]); let v = mid && HV2[ch] ? HV2[ch] : HV[ch]; if (!marks) v = v.replace(/[\u064F\u0650]/g, ""); if (!fin && v.endsWith("ے")) v = v.slice(0, -1) + "ی"; out += v; }
    else if (ch in HM) { let m = HM[ch]; if (!marks) m = m.replace(/[\u064F\u0650]/g, ""); if (!fin && m === "ے") m = "ی"; if (!fin && m === "ں") m = "ن"; out += m; }
    else if (ch === "़") continue;
    else out += ch;
  }
  return out;
}

// ---------- words ----------
// One shape for every word: {id, w, en, tr (Persian translit), dev (Devanagari pronunciation), hiE/urE (everyday Hindi/Urdu), hiC (shared word), topic, lvl}
const _words = {};
function wordsOf(level) {
  const key = L + level + ":" + P.custom.length;
  if (_words[key]) return _words[key];
  const V = (window.VOCAB && window.VOCAB[L] && window.VOCAB[L][level]) || [];
  const all = window.VOCAB[L]._all || (window.VOCAB[L]._all = new Set(LEVELS.flatMap(l => (window.VOCAB[L][l] || []).map(v => v[0]))));
  let list;
  if (V.length) list = L === "fr" ? V.map(v => ({ w: v[0], en: v[1], dev: v[2], topic: v[3] })) : V.map(v => ({ w: v[0], tr: v[1], en: v[2], hiE: v[3], hiC: v[4], topic: v[5] }));
  else list = C.levels[level].vocab.filter(v => !all.has(v[0])).map(v => L === "fr" ? { w: v[0], en: v[1], dev: v[2], topic: "Core words" } : { w: v[0], tr: v[1], en: v[2], urE: v[3], hiE: v[4], topic: "Core words" });
  if (V.length) { // older course words not in the big list (keeps earlier progress visible)
    for (const v of C.levels[level].vocab) if (!all.has(v[0])) list.push(L === "fr" ? { w: v[0], en: v[1], dev: v[2], topic: "More words" } : { w: v[0], tr: v[1], en: v[2], urE: v[3], hiE: v[4], topic: "More words" });
  }
  for (const c of P.custom.filter(c => c.lvl === level)) list.push(L === "fr" ? { w: c.v[0], en: c.v[1], topic: "My words" } : { w: c.v[0], tr: c.v[1], en: c.v[2], topic: "My words" });
  list.forEach(x => { x.id = "v:" + x.w; x.lvl = level; });
  return (_words[key] = list);
}
const allWords = () => LEVELS.flatMap(wordsOf);
function wordById(id) { for (const l of LEVELS) { const w = wordsOf(l).find(x => x.id === id); if (w) return w; } return null; }
function pron(w) {
  if (L === "fr") return w.dev ? (si === 2 ? esc(w.dev) : `<span class="ur">${esc(hi2ur(w.dev))}</span>`) : "";
  if (!w.tr) return "";
  const dev = lat2dev(w.tr);
  return `<span class="ltr">${esc(w.tr)}</span> · ${si === 2 ? esc(dev) : `<span class="ur">${esc(hi2ur(dev))}</span>`}`;
}
// Hindi → Urdu for the comparison words. Words Urdu shares with Persian take their Persian spelling
// (learned from the shared-word column: ख़ुदा हाफ़िज़ → خدا حافظ), the rest are converted letter by letter.
let _urMap = null;
function urMap() {
  if (_urMap) return _urMap;
  _urMap = new Map();
  const add = (hi, fa) => { const h = hi.split(" "), f = fa.split(" "); if (h.length !== f.length) { if (h.length > 1 && f.length === 1 && !/ना$/.test(hi)) _urMap.set(hi, fa); return; } h.forEach((x, i) => { if (!_urMap.has(x)) _urMap.set(x, f[i]); }); };
  for (const l of LEVELS) for (const v of (window.VOCAB.fa[l] || [])) if (v[4]) { const n = v[4].split(" ").length, f = v[0].split(" "); add(v[4], n <= f.length ? f.slice(0, n).join(" ") : v[0]); }
  for (const [k, v] of _urMap) _urMap.set(k, v.replace(/ه(?=\u200c|$)/g, "ہ").replace(/ه/g, "ہ").replace(/\u200c/g, ""));
  return _urMap;
}
const UR_FIX = { "आम तौर पर": "عام طور پر", "तौर": "طور", "शुक्रिया": "شکریہ", "माफ़": "معاف", "मेहरबानी": "مہربانی", "ज़रूर": "ضرور", "ख़त्म": "ختم", "वक़्त": "وقت",
  "हफ़्ता": "ہفتہ", "हफ़्ते": "ہفتے", "सुबह": "صبح", "दफ़्तर": "دفتر", "ज़्यादा": "زیادہ", "ठीक-ठाक": "ٹھیک ٹھاک", "तरह": "طرح", "तरफ़": "طرف", "ख़ुश": "خوش", "ज़िंदगी": "زندگی",
  "मदद": "مدد", "सवाल": "سوال", "जवाब": "جواب", "हाल": "حال", "हालत": "حالت", "ख़याल": "خیال", "ख़्याल": "خیال", "ख़बर": "خبر", "तबीयत": "طبیعت", "इंतज़ार": "انتظار",
  "ज़रूरत": "ضرورت", "मौसम": "موسم", "दुनिया": "دنیا", "औरत": "عورت", "तालीम": "تعلیم", "इलाज": "علاج", "इलाक़ा": "علاقہ", "हिस्सा": "حصہ", "अक्सर": "اکثر", "शायद": "شاید",
  "बिल्कुल": "بالکل", "हमेशा": "ہمیشہ", "सिर्फ़": "صرف", "क़रीब": "قریب", "शुरू": "شروع", "ख़त": "خط", "अख़बार": "اخبار", "सफ़र": "سفر", "सही": "صحیح", "ग़लत": "غلط",
  "चाय": "چائے", "जगह": "جگہ", "वजह": "وجہ", "मुहब्बत": "محبت", "मोहब्बत": "محبت", "इश्क़": "عشق", "अल्लाह": "اللہ", "ख़ुदा": "خدا", "इज़्ज़त": "عزت", "आदत": "عادت",
  "ताक़त": "طاقت", "हक़": "حق", "हुक़ूमत": "حکومت", "हुकूमत": "حکومت", "सरकार": "سرکار", "सेहत": "صحت", "मरीज़": "مریض", "दवा": "دوا", "दवाई": "دوائی", "इम्तिहान": "امتحان",
  "मुल्क": "ملک", "शहर": "شہر", "मौक़ा": "موقع", "फ़ायदा": "فائدہ", "नुक़सान": "نقصان", "क़ीमत": "قیمت", "तारीख़": "تاریخ", "उम्र": "عمر", "ईद": "عید", "इल्म": "علم" };
const toUrdu = hi => hi.split(" / ").map(alt => UR_FIX[alt] || urMap().get(alt) || alt.split(" ").map(t => UR_FIX[t] || urMap().get(t) || hi2ur(t, false)).join(" ")).join(" / ");
function compare(w) { // everyday Urdu/Hindi equivalent, and the shared word if there is one
  if (L !== "fa") return "";
  const every = si === 2 ? w.hiE : (w.urE || (w.hiE ? toUrdu(w.hiE) : ""));
  let shared = w.hiC || "";
  if (shared && si === 1) { // Urdu spelling of the shared word: usually the Persian word itself, or its first part (بلند from بلند شدن)
    const fw = w.w.split(" "), n = shared.split(" ").length;
    shared = toUrdu(shared) || (n > fw.length ? w.w : fw.slice(0, n).join(" "));
  }
  if (every && every.split(" / ").includes(shared)) shared = ""; // already one of the everyday words
  if (!every && !shared) return "";
  const lab = si === 2 ? ["हिंदी में", "वही शब्द"] : ["اردو میں", "یہی لفظ"];
  const cls = si === 1 ? "ur" : "";
  return `<span class="cmp ${cls}">${every ? `${lab[0]}: ${esc(every)}` : ""}${every && shared && shared !== every ? " · " : ""}${shared && shared !== every ? `${lab[1]}: ${esc(shared)}` : ""}</span>`;
}
function status(id) { // new | shaky | learning | mastered
  const c = P.cards[id];
  if (!c) return "new";
  if (c.ivl >= MASTERED) return "mastered";
  if ((c.lapses > 0 && c.ivl < 7) || (c.reps > 0 && c.ivl < 1)) return "shaky";
  return "learning";
}
const STATUS_LABEL = { new: "Not started", shaky: "Not confident", learning: "In progress", mastered: "Mastered" };

// ---------- course helpers ----------
const lvIdx = l => LEVELS.indexOf(l);
const strength = id => { const c = P.cards[id]; return c ? Math.min(1, c.ivl / CONFIDENT) : 0; };
function levelStats(level) {
  const ws = wordsOf(level), g = C.levels[level].grammar;
  const counts = { new: 0, shaky: 0, learning: 0, mastered: 0 }; let sum = 0;
  for (const w of ws) { counts[status(w.id)]++; sum += strength(w.id); }
  const done = g.filter(x => P.lessons[x.id]).length;
  const skipped = lvIdx(level) < P.start;
  const prog = skipped ? 1 : (sum / Math.max(1, ws.length)) * 0.75 + (done / Math.max(1, g.length)) * 0.25;
  return { n: ws.length, ...counts, lessons: g.length, done, prog, skipped };
}
function curLevel() { for (let i = P.start; i < 6; i++) if (levelStats(LEVELS[i]).prog < 0.8) return LEVELS[i]; return "C2"; }
function findLesson(id) { for (const l of LEVELS) { const g = C.levels[l].grammar.find(g => g.id === id); if (g) return [g, l]; } return []; }

// ---------- sound ----------
const IMG = (n, cls = "") => `<img class="emo ${cls}" src="img/${n}.png" alt="" draggable="false">`;
const spk = (text, big) => `<button class="spk ${big ? "big" : ""}" data-act="speak" data-text="${esc(text)}" aria-label="Listen" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>`;
const normText = t => String(t).replace(/[\/_]/g, " ").replace(/\s+/g, " ").trim();
let audio = null;
async function speak(text) {
  text = normText(text);
  if (L === "fa") { // recorded with an Iranian voice (scripts/make_audio.py); iPhones and Macs have no Persian voice
    try {
      const h = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text)))).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
      if (audio) audio.pause();
      audio = new Audio(window.ZB.base + "audio/fa/" + h + ".mp3"); await audio.play(); return;
    } catch (e) { /* not recorded yet: fall back to the device voice if it has one */ }
  }
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text); u.lang = L === "fr" ? "fr-FR" : "fa-IR"; u.rate = 0.9;
  const v = speechSynthesis.getVoices().find(v => v.lang.toLowerCase().startsWith(L)); if (v) u.voice = v;
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
function logReview() { const d = today(); P.log[d] = (P.log[d] || 0) + 1; }
function streak() { let d = today(), n = 0; if (!P.log[d]) d--; while (P.log[d]) { n++; d--; } return n; }
function dueIds() { const d = today(); return Object.keys(P.cards).filter(id => P.cards[id].due <= d); }

// ---------- spaced repetition ----------
function grade(id, g) {
  const c = P.cards[id] || (P.cards[id] = { ivl: 0, ease: 2.5, due: today(), reps: 0, lapses: 0 });
  if (g === 0) { c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.lapses++; }
  else if (g === 1) { c.ivl = Math.max(1, c.ivl * 1.2); c.ease = Math.max(1.3, c.ease - 0.15); }
  else if (g === 2) { c.ivl = c.ivl < 1 ? 1 : c.ivl * c.ease; }
  else { c.ivl = c.ivl < 1 ? 3 : c.ivl * c.ease * 1.3; c.ease += 0.15; }
  c.reps++; c.due = today() + Math.round(c.ivl); logReview(); save();
}

// ---------- practice sessions ----------
// Exercises: "learn" (meet a new word), "choose" (pick the meaning), "recall" (pick the word for a meaning),
// "card" (say it, then rate yourself; for well-known words) and "q" (a grammar question).
function wordExercise(w) {
  const c = P.cards[w.id];
  if (!c) return [{ k: "learn", w }, { k: "choose", w, followUp: true }];
  if (c.ivl >= 7) return [{ k: "card", w }];
  return [{ k: Math.random() < 0.5 || c.ivl < 2 ? "choose" : "recall", w }];
}
function grammarQs(level, n) {
  const qs = [];
  for (const g of C.levels[level].grammar) g.q.forEach((q, i) => qs.push({ k: "q", id: `g:${g.id}:${i}`, q, title: g.t, why: g.x }));
  const ws = practisedWords().concat(wordsOf(level));
  for (const g of C.levels[level].grammar) if (g.drill && window.DRILLS) for (const q of window.DRILLS.make(g.drill, ws.map(rawOf), 3)) qs.push({ k: "q", id: null, q, title: g.t + " · with your words", why: q[3] });
  return sample(qs, n);
}
const rawOf = w => L === "fr" ? [w.w, w.en, w.dev, w.topic] : [w.w, w.tr, w.en, w.hiE, w.hiC, w.topic];
const practisedWords = () => allWords().filter(w => P.cards[w.id]);
function makeSession(kind, opts = {}) {
  const d = today(); let items = [], title = "";
  if (P.intro.d !== d) P.intro = { d, n: 0 };
  if (kind === "daily") {
    title = "Daily practice";
    const due = shuffle(dueIds()).slice(0, 20), fresh = [];
    const allow = Math.max(0, NEW_PER_DAY - P.intro.n);
    for (let i = lvIdx(curLevel()); i < 6 && fresh.length < allow; i++) for (const w of wordsOf(LEVELS[i])) { if (fresh.length >= allow) break; if (!P.cards[w.id]) fresh.push(w); }
    for (const id of due) {
      if (id.startsWith("v:")) { const w = wordById(id); if (w) items.push(...wordExercise(w)); }
      else if (id.startsWith("g:")) { const [, gid, i] = id.split(":"); const [g] = findLesson(gid); if (g && g.q[+i]) items.push({ k: "q", id, q: g.q[+i], title: g.t, why: g.x }); }
    }
    items = shuffle(items);
    fresh.forEach((w, i) => { const at = Math.min(items.length, i * 2); items.splice(at, 0, ...wordExercise(w)); });
  } else if (kind === "words") {
    const ws = opts.words; title = opts.title || "Word practice";
    const newOnes = ws.filter(w => !P.cards[w.id]).slice(0, opts.maxNew ?? 8), known = shuffle(ws.filter(w => P.cards[w.id])).slice(0, 15);
    items = shuffle(known.flatMap(wordExercise));
    newOnes.forEach((w, i) => items.splice(Math.min(items.length, i * 2), 0, ...wordExercise(w)));
  } else if (kind === "grammar") {
    title = opts.title || `${opts.level} grammar`;
    if (opts.lesson) {
      const g = opts.lesson; items = g.q.map((q, i) => ({ k: "q", id: `g:${g.id}:${i}`, q, title: g.t, why: g.x }));
      if (opts.drill && g.drill && window.DRILLS) items = window.DRILLS.make(g.drill, practisedWords().concat(wordsOf(opts.level)).map(rawOf), 10).map(q => ({ k: "q", id: null, q, title: g.t, why: q[3] }));
    } else items = grammarQs(opts.level, 12);
  }
  // the first question on a new word comes two cards after meeting it
  const out = [], wait = [];
  for (const it of items) {
    if (it.followUp) { wait.push([it, 2]); continue; }
    out.push(it);
    for (const p of wait) p[1]--;
    while (wait.length && wait[0][1] <= 0) out.push(wait.shift()[0]);
  }
  for (const p of wait) out.push(p[0]);
  sess = { kind, title, q: out, total: out.length, i: 0, started: false, answer: null, log: [], opts, lessonDone: opts.lesson && !opts.drill ? opts.lesson.id : null };
  prepItem();
}
function prepItem() {
  if (!sess) return;
  const it = sess.q[sess.i]; sess.answer = null; if (!it) return;
  if (it.k === "q") it.ord = shuffle(it.q[1].map((_, i) => i));
  if (it.k === "choose" || it.k === "recall") {
    const pool = wordsOf(it.w.lvl).filter(x => x.id !== it.w.id && x.en !== it.w.en && x.w !== it.w.w);
    const same = pool.filter(x => x.topic === it.w.topic);
    const others = sample(same.length >= 3 ? same : pool, 3);
    it.opts = shuffle([it.w, ...others]);
  }
}
function answer(ok, idForSrs, g) {
  const it = sess.q[sess.i];
  sess.answer = { ok };
  sess.log.push({ it, ok });
  if (idForSrs) grade(idForSrs, g ?? (ok ? 2 : 0)); else { logReview(); save(); }
  if (!ok && (it.k === "choose" || it.k === "recall" || it.k === "q") && !it.retry) { // see it again later in this session
    const again = { ...it, retry: true }; sess.q.splice(Math.min(sess.q.length, sess.i + 4), 0, again); sess.total++;
  }
}
function next() {
  const it = sess.q[sess.i];
  sess.i++; prepItem();
  if (sess.i >= sess.q.length && sess.lessonDone) { const [g] = findLesson(sess.lessonDone); if (g) { P.lessons[g.id] = today(); save(); } }
  if (it && it.k === "learn") { /* nothing to grade: the card is created when the word is met */ }
}

// ---------- layout ----------
const COURSE = { fr: ["French", "fr"], fa: ["Persian", "ir"] };
const NAV = [["home", "Learn", "house"], ["practice", "Practice", "brain"], ["read", "Read", "open-book"], ["progress", "Progress", "chart"], ["guide", "Guide", "bulb"]];
const flag = l => `<img class="flag" src="img/flags/${COURSE[l][1]}.svg" alt="">`;
const focusMode = () => view === "practice" && sess && sess.started;
const bar = (p, cls = "") => `<div class="bar ${cls}"><i style="width:${Math.round(Math.max(0, Math.min(1, p)) * 100)}%"></i></div>`;

function render() {
  sync();
  document.body.className = "course-" + L + (focusMode() ? " focus" : "");
  const due = dueIds().length;
  $("#course").innerHTML = `<button class="course-btn" data-act="menu" aria-label="Change course" type="button">${flag(L)}<span>${COURSE[L][0]}</span><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>
    ${menu ? `<div class="course-menu">${["fr", "fa"].map(l => `<button data-act="lang" data-v="${l}" class="${l === L ? "on" : ""}" type="button">${flag(l)}${COURSE[l][0]}</button>`).join("")}</div>` : ""}`;
  $("#stats").innerHTML = `<span class="stat" title="Day streak">${IMG("fire")}<b>${streak()}</b></span><span class="stat" title="Reviews due">${IMG("brain")}<b>${due}</b></span>`;
  $("#nav").innerHTML = `<div class="logo">my language</div>` + NAV.map(([v, label, ic]) => `<button data-act="view" data-v="${v}" class="${view === v ? "on" : ""}" type="button">${IMG(ic)}<span>${label}</span>${v === "practice" && due ? `<i class="dot">${due}</i>` : ""}</button>`).join("");
  $("#main").innerHTML = ({ home: vHome, practice: vPractice, read: vRead, progress: vProgress, guide: vGuide })[view]();
  $("#side").innerHTML = view === "home" && !page ? sidePanel() : "";
  const j = document.getElementById("jump"); if (j) j.scrollIntoView({ block: "start" });
}
function helpToggle() {
  return `<div class="seg" role="group" aria-label="Help language"><span>Help in</span><button data-act="script" data-v="ur" class="${si === 1 ? "on" : ""}" type="button"><span class="ur">اردو</span></button><button data-act="script" data-v="hi" class="${si === 2 ? "on" : ""}" type="button">हिंदी</button></div>`;
}
function sidePanel() {
  const fresh = P.intro.d === today() ? Math.max(0, NEW_PER_DAY - P.intro.n) : NEW_PER_DAY;
  return `<div class="panel"><div class="panel-h">${IMG("bullseye")}<b>Today</b></div><p>${dueIds().length} reviews due · ${fresh} new words</p><button class="btn primary wide" data-act="daily" type="button">Start daily practice</button></div>
    <div class="panel"><div class="panel-h">${IMG("fire")}<b>${streak()} day streak</b></div><p>${streak() ? "Practise today to keep it going." : "Practise today to start a streak."}</p></div>`;
}
const back = (label = "Back") => `<button class="back" data-act="back" type="button"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>${label}</button>`;
function levelTabs(sel, act = "level") {
  return `<div class="levels" role="tablist">${LEVELS.map(l => { const s = levelStats(l);
    return `<button role="tab" data-act="${act}" data-v="${l}" class="lv ${l === sel ? "on" : ""}" aria-selected="${l === sel}" type="button"><b>${l}</b>${bar(s.prog)}</button>`; }).join("")}</div>`;
}

// ---------- Learn ----------
function vHome() {
  if (page === "vocab") return vVocab();
  if (page === "grammar") return vGrammar();
  if (page === "lesson") return vLesson();
  if (page === "resources") return vResources();
  const s = levelStats(lvl), lv = C.levels[lvl], due = dueIds().length;
  const fresh = P.intro.d === today() ? Math.max(0, NEW_PER_DAY - P.intro.n) : NEW_PER_DAY;
  const readCount = (lvl === "A1" || lvl === "A2") ? (READING[L][lvl] || []).length : ((feeds[L] && feeds[L].levels && feeds[L].levels[lvl]) || []).length;
  return `<div class="today">${IMG("bullseye")}<div><b>Today's practice</b><span>${due} reviews · ${fresh} new words · about ${Math.max(2, Math.round((due + fresh * 2) / 3))} min</span></div><button class="btn primary" data-act="daily" type="button">Start</button></div>
    <div class="row between"><h1 class="h1">${flag(L)} ${COURSE[L][0]}</h1>${helpToggle()}</div>
    ${levelTabs(lvl)}
    <section class="level-card">
      <div class="level-top"><div><span class="pill">${lvl} · ${LEVEL_NAME[lvl]}</span><h2>${esc(lv.can)}</h2></div><div class="ring" style="--p:${Math.round(s.prog * 100)}"><span>${Math.round(s.prog * 100)}%</span></div></div>
      <div class="mini-stats"><span><b>${s.mastered}</b> mastered</span><span><b>${s.learning + s.shaky}</b> learning</span><span><b>${s.n}</b> words</span><span><b>${s.done}/${s.lessons}</b> lessons</span></div>
    </section>
    <div class="sections">
      <button class="section" data-act="page" data-v="vocab" type="button">${IMG("books")}<div><b>Vocabulary</b><span>${s.n} words · ${s.n - s.new} started</span></div>${bar((s.n - s.new) / Math.max(1, s.n))}</button>
      <button class="section" data-act="page" data-v="grammar" type="button">${IMG("pencil")}<div><b>Grammar</b><span>${s.lessons} lessons · ${s.done} done</span></div>${bar(s.done / Math.max(1, s.lessons))}</button>
      <button class="section" data-act="readlvl" data-v="${lvl}" type="button">${IMG("newspaper")}<div><b>Reading</b><span>${lvl === "A1" || lvl === "A2" ? `${readCount} short texts` : "6 articles, new every week"}</span></div></button>
      <button class="section" data-act="page" data-v="resources" type="button">${IMG("globe")}<div><b>Watch &amp; listen</b><span>Podcasts, videos and sites for ${lvl}</span></div></button>
    </div>`;
}
function vVocab() {
  const ws = wordsOf(lvl), topics = [...new Set(ws.map(w => w.topic))];
  const q = vf.q.trim().toLowerCase();
  const shown = ws.filter(w => (!vf.topic || w.topic === vf.topic) && (!q || w.w.toLowerCase().includes(q) || (w.en || "").toLowerCase().includes(q)));
  const rows = shown.slice(0, 400).map(w => { const st = status(w.id);
    return `<div class="word ${picked.has(w.id) ? "sel" : ""}"><label class="chk"><input type="checkbox" data-act="pick" data-v="${esc(w.id)}" ${picked.has(w.id) ? "checked" : ""} aria-label="Select ${esc(w.w)}"><span></span></label>
      <div class="wmain"><div class="wt"><span class="target ${L === "fa" ? "fa" : ""}" lang="${L}">${esc(w.w)}</span>${spk(w.w)}</div><div class="pron">${pron(w)}</div></div>
      <div class="wmean"><span>${esc(w.en)}</span>${compare(w)}</div><span class="st ${st}" title="${STATUS_LABEL[st]}"></span></div>`; }).join("");
  return `${back(`${lvl} ${COURSE[L][0]}`)}<div class="page-h"><div><span class="pill">${lvl}</span><h1 class="h1">Vocabulary</h1><p class="muted">${ws.length} words, grouped by topic. Tick words to practise them, or practise a whole topic.</p></div>${L === "fa" ? helpToggle() : ""}</div>
    <div class="toolbar"><input type="search" data-act="vsearch" placeholder="Search ${COURSE[L][0]} or English" value="${esc(vf.q)}" aria-label="Search words">
      <select data-act="vtopic" aria-label="Topic"><option value="">All topics (${ws.length})</option>${topics.map(t => `<option value="${esc(t)}" ${t === vf.topic ? "selected" : ""}>${esc(t)} (${ws.filter(w => w.topic === t).length})</option>`).join("")}</select></div>
    <div class="row"><button class="btn primary" data-act="practise-shown" type="button">Practise ${vf.topic ? esc(vf.topic) : q ? "these words" : `${lvl} words`}</button><span class="legend"><i class="st new"></i>Not started <i class="st learning"></i>In progress <i class="st shaky"></i>Not confident <i class="st mastered"></i>Mastered</span></div>
    <div class="wordlist">${rows || `<p class="muted pad">No words match.</p>`}</div>
    ${shown.length > 400 ? `<p class="muted">Showing 400 of ${shown.length}. Pick a topic or search to narrow it down.</p>` : ""}
    ${picked.size ? `<div class="pickbar"><span>${picked.size} selected</span><button class="btn ghost" data-act="unpick" type="button">Clear</button><button class="btn primary" data-act="practise-picked" type="button">Practise selected</button></div>` : ""}`;
}
function vGrammar() {
  const gs = C.levels[lvl].grammar;
  const rows = gs.map((g, i) => { const qn = g.q.length, ok = g.q.filter((_, k) => strength(`g:${g.id}:${k}`) > 0).length;
    return `<button class="lesson-row" data-act="lesson" data-v="${g.id}" type="button"><span class="num ${P.lessons[g.id] ? "done" : ""}">${P.lessons[g.id] ? "✓" : i + 1}</span><div><b>${esc(g.t)}</b><span>${qn} questions${g.drill ? " · drills with your words" : ""}</span>${bar(ok / Math.max(1, qn))}</div><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`; }).join("");
  return `${back(`${lvl} ${COURSE[L][0]}`)}<div class="page-h"><div><span class="pill">${lvl}</span><h1 class="h1">Grammar</h1><p class="muted">${gs.length} lessons. Open one to read it, then practise as often as you like.</p></div></div>
    <button class="btn primary" data-act="grammar-mix" type="button">Practise ${lvl} grammar (mixed)</button><div class="lessons">${rows}</div>`;
}
function exHTML(e) {
  if (L === "fr") return `<div class="ex">${spk(e[0])}<div><div class="t" lang="fr">${esc(e[0])}</div><div class="muted">${esc(e[1])}</div></div></div>`;
  const dev = lat2dev(e[1]);
  return `<div class="ex">${spk(e[0])}<div><div class="t fa" lang="fa">${esc(e[0])}</div><div class="pron"><span class="ltr">${esc(e[1])}</span> · ${si === 2 ? esc(dev) : `<span class="ur">${esc(hi2ur(dev))}</span>`}</div><div>${esc(e[2])}</div></div></div>`;
}
function vLesson() {
  const [g, l] = findLesson(lessonId); if (!g) { page = "grammar"; return vGrammar(); }
  const cmp = g.cmp ? `<div class="note">${IMG("bulb")}<div><b>Compare with ${si === 2 ? "Hindi" : "Urdu"}</b><p class="${si === 1 ? "ur" : ""}">${esc(pick(g.cmp))}</p></div></div>` : "";
  return `${back("Grammar")}<div class="page-h"><div><span class="pill">${l} · Grammar</span><h1 class="h1">${esc(g.t)}</h1></div>${L === "fa" ? helpToggle() : ""}</div>
    <div class="card prose"><p>${esc(g.x)}</p></div>${cmp}<h3>Examples</h3><div class="card">${g.ex.map(exHTML).join("")}</div>
    <div class="row gap"><button class="btn primary" data-act="lesson-quiz" type="button">Practise (${g.q.length} questions)</button>${g.drill ? `<button class="btn" data-act="lesson-drill" type="button">Practise with your words</button>` : ""}</div>
    ${P.lessons[g.id] ? `<p class="muted">Done on ${new Date(P.lessons[g.id] * 864e5).toISOString().slice(0, 10)}. Its questions also come back in your daily practice.</p>` : ""}`;
}
function vResources() {
  const rs = (window.RESOURCES[L] || {})[lvl] || [];
  return `${back(`${lvl} ${COURSE[L][0]}`)}<div class="page-h"><div><span class="pill">${lvl}</span><h1 class="h1">Watch &amp; listen</h1><p class="muted">Hand-picked places to read, watch and listen at ${lvl}.</p></div></div>
    ${rs.map(r => `<div class="card res"><div><span class="pill soft">${esc(r[1])}</span><h3>${esc(r[0])}</h3><p class="muted">${esc(r[2])}</p></div>${r[3] ? `<a class="btn" href="${esc(r[3])}" target="_blank" rel="noopener">Open ↗</a>` : ""}</div>`).join("")}`;
}

// ---------- Practice ----------
function vPractice() {
  if (sess && sess.started) return vSession();
  if (sess && !sess.started) return vStart();
  const due = dueIds().length, cur = curLevel();
  const shaky = allWords().filter(w => status(w.id) === "shaky").length;
  return `<div class="page-h"><div><h1 class="h1">Practice</h1><p class="muted">Short sessions. Words come back just before you'd forget them.</p></div></div>
    <div class="choices">
      <button class="choice" data-act="daily" type="button">${IMG("bullseye")}<div><b>Daily practice</b><span>${due} reviews due and new words from ${cur}</span></div></button>
      <button class="choice" data-act="weak" type="button" ${shaky ? "" : "disabled"}>${IMG("muscle")}<div><b>Words I'm not sure about</b><span>${shaky ? `${shaky} words you got wrong recently` : "None right now"}</span></div></button>
      <button class="choice" data-act="lvl-words" data-v="${lvl}" type="button">${IMG("books")}<div><b>${lvl} vocabulary</b><span>New and known words from this level</span></div></button>
      <button class="choice" data-act="grammar-mix" type="button">${IMG("pencil")}<div><b>${lvl} grammar</b><span>Lesson questions and drills with your words</span></div></button>
    </div>${levelTabs(lvl, "plevel")}`;
}
function vStart() {
  const counts = { learn: 0, rev: 0, q: 0 };
  for (const it of sess.q) { if (it.k === "learn") counts.learn++; else if (it.k === "q") counts.q++; else if (!it.followUp) counts.rev++; }
  const mins = Math.max(1, Math.round(sess.q.length / 3));
  if (!sess.q.length) return `${back("Practice")}<div class="start">${IMG("check", "big")}<h1 class="h1">All caught up</h1><p class="muted">Nothing to practise here right now. Try another level, or come back tomorrow.</p><button class="btn primary" data-act="back" type="button">Back</button></div>`;
  return `${back("Practice")}<div class="start">${IMG("bullseye", "big")}<h1 class="h1">${esc(sess.title)}</h1>
    <div class="start-stats">${counts.learn ? `<div><b>${counts.learn}</b><span>new words</span></div>` : ""}${counts.rev ? `<div><b>${counts.rev}</b><span>reviews</span></div>` : ""}${counts.q ? `<div><b>${counts.q}</b><span>grammar</span></div>` : ""}<div><b>~${mins}</b><span>minutes</span></div></div>
    <p class="muted">Take your time. Wrong answers come back a little later in the session.</p><button class="btn primary big" data-act="go" type="button">Start</button></div>`;
}
const isRtl = t => /^[^A-Za-z«]*[؀-ۿ]/.test(t);
function vSession() {
  const it = sess.q[sess.i];
  const top = `<div class="sess-top"><button class="x" data-act="quit" aria-label="End session" type="button">✕</button>${bar(sess.i / Math.max(1, sess.q.length), "thick")}<span class="count">${Math.min(sess.i + 1, sess.q.length)} / ${sess.q.length}</span></div>`;
  if (!it) {
    const tried = sess.log.length, right = sess.log.filter(x => x.ok).length, wrongWords = [...new Map(sess.log.filter(x => !x.ok && x.it.w).map(x => [x.it.w.id, x.it.w])).values()];
    const list = [...new Map(sess.log.filter(x => x.it.w).map(x => [x.it.w.id, x])).values()].map(x => `<div class="sum-row"><span class="${x.ok ? "ok" : "no"}">${x.ok ? "✓" : "✗"}</span><span class="target ${L === "fa" ? "fa" : ""}">${esc(x.it.w.w)}</span><span class="muted">${esc(x.it.w.en)}</span></div>`).join("");
    return top + `<div class="finish">${IMG(tried && right / tried >= 0.8 ? "trophy" : "party", "big")}<h1 class="h1">Session complete</h1>
      <div class="start-stats"><div><b>${tried ? Math.round(100 * right / tried) : 100}%</b><span>correct</span></div><div><b>${tried}</b><span>answers</span></div><div><b>${streak()}</b><span>day streak</span></div></div>
      ${list ? `<div class="card sum">${list}</div>` : ""}</div>` +
      foot("", "", `${wrongWords.length ? `<button class="btn" data-act="redo" type="button">Practise ${wrongWords.length} missed word${wrongWords.length > 1 ? "s" : ""}</button>` : ""}<button class="btn primary" data-act="finish" type="button">Done</button>`);
  }
  const a = sess.answer, enter = sess.shown !== sess.i ? " enter" : "";
  sess.shown = sess.i;
  if (it.k === "learn") {
    const w = it.w;
    return top + `<div class="stage${enter}"><span class="tag new">${IMG("sparkles")} New word · ${w.lvl} · ${esc(w.topic || "")}</span>
      <div class="say">${spk(w.w, true)}<span class="target big ${L === "fa" ? "fa" : ""}" lang="${L}">${esc(w.w)}</span></div><div class="pron center">${pron(w)}</div>
      <div class="meaning">${esc(w.en)}</div><div class="center">${compare(w)}</div></div>` + foot("", "", `<button class="btn primary" data-act="learned" type="button">Got it</button>`);
  }
  if (it.k === "choose" || it.k === "recall") {
    const w = it.w, fwd = it.k === "choose";
    const prompt = fwd ? `<h2 class="ask">What does this mean?</h2><div class="say">${spk(w.w, true)}<span class="target big ${L === "fa" ? "fa" : ""}" lang="${L}">${esc(w.w)}</span></div>`
      : `<h2 class="ask">Which is “${esc(w.en)}” in ${COURSE[L][0]}?</h2>`;
    const opts = it.opts.map((o, n) => { const cls = !a ? "" : o.id === w.id ? "right" : a.pick === o.id ? "wrong" : "dim";
      return `<button class="opt ${cls}" data-act="pickopt" data-v="${esc(o.id)}" ${a ? "disabled" : ""} type="button"><kbd>${n + 1}</kbd><span class="${!fwd && L === "fa" ? "fa" : ""}" lang="${fwd ? "en" : L}">${esc(fwd ? o.en : o.w)}</span></button>`; }).join("");
    const reveal = a ? `<div class="reveal"><div class="say small">${spk(w.w)}<span class="target ${L === "fa" ? "fa" : ""}">${esc(w.w)}</span></div><div class="pron">${pron(w)}</div><div>${esc(w.en)}</div>${compare(w)}</div>` : "";
    return top + `<div class="stage${enter}">${prompt}<div class="opts">${opts}</div>${reveal}</div>` + (a ? foot(a.ok ? "ok" : "bad", a.ok ? "Correct" : "Not quite. Remember this one.", `<button class="btn ${a.ok ? "primary" : "red"}" data-act="next" type="button">Continue</button>`) : "");
  }
  if (it.k === "card") {
    const w = it.w;
    return top + `<div class="stage${enter}"><h2 class="ask">Say it in ${COURSE[L][0]}, then check</h2><div class="meaning big">${esc(w.en)}</div>
      ${a ? `<div class="reveal"><div class="say">${spk(w.w, true)}<span class="target big ${L === "fa" ? "fa" : ""}">${esc(w.w)}</span></div><div class="pron">${pron(w)}</div>${compare(w)}</div>` : ""}</div>` +
      (a ? foot("", "How well did you know it?", `<div class="grades"><button class="btn red" data-act="rate" data-v="0" type="button">Didn't know</button><button class="btn" data-act="rate" data-v="1" type="button">Hard</button><button class="btn primary" data-act="rate" data-v="2" type="button">Good</button><button class="btn blue" data-act="rate" data-v="3" type="button">Easy</button></div>`)
        : foot("", "", `<button class="btn primary" data-act="show" type="button">Show answer</button>`));
  }
  // grammar question
  const q = it.q, m = /^(.*?)\s*\(([^()]*[a-z][^()]*)\)\s*$/i.exec(q[0]), main = m ? m[1] : q[0], hint = m ? m[2] : "";
  const opts = it.ord.map((i, n) => { const cls = !a ? "" : i === q[2] ? "right" : a.pick === i ? "wrong" : "dim";
    return `<button class="opt ${cls}" data-act="pickq" data-v="${i}" ${a ? "disabled" : ""} type="button"><kbd>${n + 1}</kbd><span class="${isRtl(q[1][i]) ? "fa" : ""}">${esc(q[1][i])}</span></button>`; }).join("");
  return top + `<div class="stage${enter}"><span class="tag">${esc(it.title)}</span><div class="qtext ${isRtl(main) ? "fa" : ""}">${esc(main)}</div>${hint ? `<div class="qhint">${esc(hint)}</div>` : ""}<div class="opts">${opts}</div>
    ${a && !a.ok && it.why ? `<div class="note">${IMG("bulb")}<div><b>Why</b><p>${esc(it.why)}</p></div></div>` : ""}</div>` +
    (a ? foot(a.ok ? "ok" : "bad", a.ok ? "Correct" : `Answer: <span class="${isRtl(q[1][q[2]]) ? "fa" : ""}">${esc(q[1][q[2]])}</span>`, `<button class="btn ${a.ok ? "primary" : "red"}" data-act="next" type="button">Continue</button>`) : "");
}
function foot(state, msg, btns) {
  return `<div class="foot ${state}"><div class="foot-in"><div class="foot-msg">${state === "ok" ? IMG("check") : ""}${msg ? `<b>${msg}</b>` : ""}</div><div class="foot-btns">${btns}</div></div></div>`;
}

// ---------- Read ----------
function vRead() {
  if (textId) return vText();
  const rl = readLvl || lvl, low = rl === "A1" || rl === "A2";
  let body = "";
  if (low) {
    body = (READING[L][rl] || []).map(t => { const done = P.saved.some(s => s.id === t.id);
      return `<button class="art" data-act="text" data-v="${t.id}" type="button"><span class="pill soft">${esc(t.topic)}</span><h3 class="${L === "fa" ? "fa" : ""}">${esc(t.title)}</h3><p class="muted">${esc(t.en.split("\n")[0].slice(0, 110))}…</p>${done ? `<span class="read-mark">✓ Read</span>` : ""}</button>`; }).join("");
  } else {
    const f = feeds[L];
    if (!f) { if (f === undefined) loadFeed(); body = `<p class="muted">Loading this week's articles…</p>`; }
    else { const items = (f.levels && f.levels[rl]) || [];
      body = items.length ? items.map((a, i) => { const done = P.saved.some(s => s.link === a.link);
        return `<div class="art static"><div class="row between"><span class="pill soft">${esc(a.topic || "news")}</span><span class="muted small">${esc(a.source)}</span></div><h3 class="${L === "fa" ? "fa" : ""}" lang="${L}">${esc(a.title)}</h3><p class="${L === "fa" ? "fa" : ""}" lang="${L}">${esc(a.summary)}</p>
          <div class="row gap">${spk(a.title)}<a class="btn" href="${esc(a.link)}" target="_blank" rel="noopener">Read the article ↗</a><button class="btn ${done ? "" : "primary"}" data-act="save-art" data-v="${i}" ${done ? "disabled" : ""} type="button">${done ? "✓ Saved" : "Mark as read"}</button></div></div>`; }).join("")
        : `<p class="muted">This week's articles aren't available. Are you offline?</p>`; }
  }
  const saved = P.saved.slice().reverse();
  return `<div class="page-h"><div><h1 class="h1">Read</h1><p class="muted">${low ? "Short texts written for your level, with translation and audio." : `Six articles for ${rl}, picked every Monday from news sites, across culture, entertainment, sport and science.`}</p></div></div>
    ${levelTabs(rl, "readlvl")}<div class="arts">${body}</div>
    <h3>My reading${saved.length ? ` (${saved.length})` : ""}</h3>
    ${saved.length ? `<div class="card">${saved.map(s => `<div class="saved-row">${s.kind === "text" ? `<button class="link" data-act="text" data-v="${s.id}" type="button">${esc(s.title)}</button>` : `<a class="link" href="${esc(s.link)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>`}<span class="muted small">${s.lvl} · ${esc(s.source || s.topic || "")} · ${new Date(s.d * 864e5).toISOString().slice(0, 10)}</span></div>`).join("")}</div>` : `<p class="muted">Texts and articles you mark as read are kept here so you can go back to them.</p>`}`;
}
async function loadFeed() { const l = L; feeds[l] = null; feeds[l] = await window.ZB.feed(l); if (view === "read" || view === "home") render(); }
function vText() {
  let t, tl; for (const l of ["A1", "A2"]) { const x = (READING[L][l] || []).find(x => x.id === textId); if (x) { t = x; tl = l; } }
  if (!t) { textId = null; return vRead(); }
  const paras = t.text.split("\n"), en = t.en.split("\n"), done = P.saved.some(s => s.id === t.id);
  return `${back("Read")}<div class="page-h"><div><span class="pill">${tl} · ${esc(t.topic)}</span><h1 class="h1 ${L === "fa" ? "fa" : ""}" lang="${L}">${esc(t.title)}</h1></div>
    <div class="seg"><span>English</span><button data-act="toggle-en" class="${showEn ? "on" : ""}" type="button">${showEn ? "Shown" : "Hidden"}</button></div></div>
    <div class="card text">${paras.map((p, i) => `<div class="para">${spk(p)}<div><p class="${L === "fa" ? "fa" : ""}" lang="${L}">${esc(p)}</p>${showEn ? `<p class="muted en">${esc(en[i] || "")}</p>` : ""}</div></div>`).join("")}</div>
    <button class="btn ${done ? "" : "primary"}" data-act="save-text" ${done ? "disabled" : ""} type="button">${done ? "✓ In my reading" : "Mark as read"}</button>`;
}

// ---------- Progress ----------
function vProgress() {
  const ws = allWords(), c = { new: 0, shaky: 0, learning: 0, mastered: 0 };
  for (const w of ws) c[status(w.id)]++;
  const learned = c.shaky + c.learning + c.mastered, d = today();
  const tiles = [["books", learned, "Words learned"], ["trophy", c.mastered, "Mastered"], ["brain", c.learning, "In progress"], ["muscle", c.shaky, "Not confident"]]
    .map(([i, n, l], k) => `<button class="tile ${["all", "mastered", "learning", "shaky"][k] === bankFilter ? "on" : ""}" data-act="bank" data-v="${["all", "mastered", "learning", "shaky"][k]}" type="button">${IMG(i)}<div><b>${n}</b><span>${l}</span></div></button>`).join("");
  const rows = LEVELS.map(l => { const s = levelStats(l), t = Math.max(1, s.n);
    return `<button class="lvl-row ${l === curLevel() ? "cur" : ""}" data-act="level" data-v="${l}" type="button"><b>${l}</b><div class="stack"><i class="m" style="width:${100 * s.mastered / t}%"></i><i class="l" style="width:${100 * s.learning / t}%"></i><i class="s" style="width:${100 * s.shaky / t}%"></i></div><span>${Math.round(s.prog * 100)}%</span></button>`; }).join("");
  const list = ws.filter(w => bankFilter === "all" ? status(w.id) !== "new" : status(w.id) === bankFilter);
  const max = Math.max(1, ...Array.from({ length: 14 }, (_, i) => P.log[d - i] || 0));
  const act = Array.from({ length: 14 }, (_, i) => { const n = P.log[d - 13 + i] || 0; return `<div style="height:${Math.max(3, 100 * n / max)}%" title="${n}"></div>`; }).join("");
  return `<div class="page-h"><div><h1 class="h1">Progress</h1><p class="muted">${flag(L)} ${COURSE[L][0]} · working on ${curLevel()} · ${streak()} day streak</p></div></div>
    <h3>Word bank</h3><div class="tiles">${tiles}</div>
    <div class="card"><div class="row between"><b>${bankFilter === "all" ? "All words you've learned" : STATUS_LABEL[bankFilter]} (${list.length})</b>${list.length ? `<button class="btn small" data-act="practise-bank" type="button">Practise these</button>` : ""}</div>
      <div class="bank">${list.slice(0, 300).map(w => `<span class="chip ${status(w.id)}" title="${esc(w.en)}"><span class="${L === "fa" ? "fa" : ""}">${esc(w.w)}</span><small>${esc(w.en)}</small></span>`).join("") || `<p class="muted">Nothing here yet.</p>`}</div>
      ${list.length > 300 ? `<p class="muted small">Showing 300 of ${list.length}.</p>` : ""}</div>
    <h3>Levels</h3><div class="card">${rows}<p class="legend"><i class="st mastered"></i>Mastered <i class="st learning"></i>In progress <i class="st shaky"></i>Not confident</p>
      <p class="row muted small">I already know everything below <select data-act="placement" aria-label="Placement">${LEVELS.map((l, i) => `<option value="${i}" ${i === P.start ? "selected" : ""}>${l}</option>`).join("")}</select></p></div>
    <h3>Last 14 days</h3><div class="card"><div class="act">${act}</div></div>`;
}

// ---------- Guide ----------
function vGuide() {
  const rows = C.guide.map(r => L === "fr" ? `<div class="g-row"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`
    : `<div class="g-row"><b>${esc(r[0])}</b><span class="${si === 1 ? "ur" : ""}">${esc(si === 2 ? r[2] : r[1])}</span></div>`).join("");
  return `<div class="page-h"><div><h1 class="h1">Guide</h1><p class="muted">How the app works, and how to pronounce ${COURSE[L][0]}.</p></div>${helpToggle()}</div>
    <div class="card prose"><b>How this app teaches</b><p>Every level is open: pick any level, learn its words by topic, read its grammar lessons and practise them as often as you like. Daily practice mixes the words and questions that are due with a few new words. Each item comes back after about 1, 3, 6, 15, 40… days, sooner if you miss it. A word is <b>mastered</b> once it comes back after three weeks or more, and <b>not confident</b> if you've missed it recently.</p>
    <p>The interface is in English. Pronunciation and comparisons are shown in everyday ${si === 2 ? "Hindi" : "Urdu"}; switch with “Help in”.</p></div>
    <h3>Pronunciation</h3><div class="card">${rows}</div>`;
}

// ---------- actions ----------
function startWords(words, title) { makeSession("words", { words, title }); view = "practice"; }
const ACT = {
  menu() { menu = !menu; },
  lang(v) { S.lang = v; sess = null; page = null; textId = null; lvl = null; lvlPicked = false; readLvl = null; picked.clear(); vf = { topic: "", q: "" }; menu = false; save(); },
  script(v) { S.script = v; save(); },
  view(v) { if (view === v && v === "home") { page = null; } view = v; menu = false; textId = null; if (v === "practice" && sess && !sess.started) sess = null; },
  level(v) { lvl = v; lvlPicked = true; view = "home"; page = null; picked.clear(); vf = { topic: "", q: "" }; },
  plevel(v) { lvl = v; lvlPicked = true; },
  page(v) { page = v; },
  back() { if (view === "practice") { sess = null; return; } if (view === "read") { textId = null; return; } if (page === "lesson") page = "grammar"; else page = null; },
  lesson(v) { lessonId = v; page = "lesson"; view = "home"; },
  readlvl(v) { readLvl = v; view = "read"; textId = null; },
  text(v) { textId = v; view = "read"; showEn = false; },
  "toggle-en"() { showEn = !showEn; },
  speak(_, el) { speak(el.dataset.text); return false; },
  daily() { makeSession("daily"); view = "practice"; },
  weak() { startWords(allWords().filter(w => status(w.id) === "shaky"), "Words I'm not sure about"); },
  "lvl-words"(v) { startWords(wordsOf(v), `${v} vocabulary`); },
  "grammar-mix"() { makeSession("grammar", { level: lvl, title: `${lvl} grammar` }); view = "practice"; },
  "lesson-quiz"() { const [g, l] = findLesson(lessonId); makeSession("grammar", { lesson: g, level: l, title: g.t }); view = "practice"; },
  "lesson-drill"() { const [g, l] = findLesson(lessonId); makeSession("grammar", { lesson: g, level: l, drill: true, title: g.t + " · with your words" }); view = "practice"; },
  "practise-shown"() { const q = vf.q.trim().toLowerCase(); const ws = wordsOf(lvl).filter(w => (!vf.topic || w.topic === vf.topic) && (!q || w.w.toLowerCase().includes(q) || (w.en || "").toLowerCase().includes(q))); startWords(ws, vf.topic ? `${lvl} · ${vf.topic}` : `${lvl} vocabulary`); },
  "practise-picked"() { const ws = [...picked].map(wordById).filter(Boolean); picked.clear(); makeSession("words", { words: ws, title: "Your selected words", maxNew: 30 }); view = "practice"; },
  "practise-bank"() { const ws = allWords().filter(w => bankFilter === "all" ? status(w.id) !== "new" : status(w.id) === bankFilter); startWords(sample(ws, 20), "Word bank practice"); },
  pick(v, el) { if (el.checked) picked.add(v); else picked.delete(v); },
  unpick() { picked.clear(); },
  vsearch(v) { vf.q = v; },
  vtopic(v) { vf.topic = v; },
  bank(v) { bankFilter = v; },
  placement(v) { P.start = +v; save(); },
  go() { sess.started = true; },
  quit() { sess = null; },
  finish() { sess = null; view = "home"; page = null; },
  redo() { const ws = [...new Map(sess.log.filter(x => !x.ok && x.it.w).map(x => [x.it.w.id, x.it.w])).values()]; makeSession("words", { words: ws, title: "Missed words", maxNew: 0 }); sess.started = true; },
  learned() { const w = sess.q[sess.i].w; if (!P.cards[w.id]) { P.cards[w.id] = { ivl: 0, ease: 2.5, due: today(), reps: 0, lapses: 0 }; P.intro.n++; save(); } next(); },
  pickopt(v) { const it = sess.q[sess.i]; const ok = v === it.w.id; answer(ok, it.w.id); sess.answer.pick = v; },
  pickq(v) { const it = sess.q[sess.i]; const ok = +v === it.q[2]; answer(ok, it.id); sess.answer.pick = +v; },
  show() { sess.answer = { shown: true }; },
  rate(v) { const it = sess.q[sess.i]; sess.log.push({ it, ok: +v > 0 }); grade(it.w.id, +v); next(); },
  next() { next(); },
  "save-text"() { let t, tl; for (const l of ["A1", "A2"]) { const x = (READING[L][l] || []).find(x => x.id === textId); if (x) { t = x; tl = l; } }
    if (t && !P.saved.some(s => s.id === t.id)) { P.saved.push({ id: t.id, kind: "text", lvl: tl, title: t.title, topic: t.topic, d: today() }); logReview(); save(); window.ZB.toast("Saved to My reading"); } },
  "save-art"(v) { const rl = readLvl || lvl, a = feeds[L].levels[rl][+v];
    if (!P.saved.some(s => s.link === a.link)) { P.saved.push({ kind: "article", lvl: rl, title: a.title, link: a.link, source: a.source, topic: a.topic, summary: a.summary, d: today() }); P.read.push(a.link); logReview(); save(); window.ZB.toast("Saved to My reading"); } },
};
let searchT = 0;
function dispatch(e) {
  const el = e.target.closest("[data-act]");
  if (!el) { if (menu && !e.target.closest("#course")) { menu = false; render(); } return; }
  const act = el.dataset.act, tag = el.tagName;
  if (tag === "INPUT" && el.type === "search") { if (e.type !== "input") return; clearTimeout(searchT); ACT.vsearch(el.value); searchT = setTimeout(() => { const pos = el.selectionStart; render(); const s = document.querySelector('[data-act="vsearch"]'); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 250); return; }
  const isField = tag === "SELECT" || (tag === "INPUT" && el.type === "checkbox");
  if ((e.type === "change") !== isField || e.type === "input") return;
  if (el.disabled) return;
  const r = ACT[act](tag === "SELECT" ? el.value : el.dataset.v, el);
  if (r !== false) { const sy = scrollY; render(); if (/^(view|level|page|lesson|back|text|readlvl|daily|go|finish|lang|weak|lvl-words|grammar-mix|lesson-quiz|lesson-drill|practise-|redo)/.test(act)) scrollTo(0, 0); else scrollTo(0, sy); }
}
document.addEventListener("click", dispatch);
document.addEventListener("change", dispatch);
document.addEventListener("input", dispatch);
document.addEventListener("keydown", e => {
  if (/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)) return;
  if (!focusMode()) return;
  if (e.key === "Escape") { ACT.quit(); render(); return; }
  if (e.key === " " || e.key === "Enter") { e.preventDefault(); const b = document.querySelector('.foot .btn.primary:not([disabled]), .foot .btn.red:not([disabled])'); if (b) b.click(); return; }
  if (/^[1-4]$/.test(e.key)) { const opt = document.querySelectorAll(".opt:not([disabled])")[+e.key - 1]; if (opt) { opt.click(); return; } const g = document.querySelectorAll('[data-act="rate"]')[+e.key - 1]; if (g) g.click(); }
});

render();
window.ZB.init({
  apply(j) { // progress from this device's saved copy, the database, or another device
    if (!j) return; S = { ...S, ...j }; for (const l of ["fr", "fa"]) S[l] = { ...blank(), ...S[l] }; if (!lvlPicked) lvl = null; sync();
    for (const k in _words) delete _words[k];
    const typing = /TEXTAREA|INPUT/.test((document.activeElement || {}).tagName || "");
    if (!typing && !focusMode()) render();
  },
  current: () => S,
});
