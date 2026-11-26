// Grammar drills generated from your own words.
// Each drill takes a list of word entries (your word bank first, then the level's list) and returns
// questions in the lesson format: [prompt, [options], correctIndex, explanation].
(function () {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uniq = a => [...new Set(a)];
  const mcq = (prompt, right, wrong, why) => { const opts = shuffle(uniq([right, ...wrong.filter(w => w !== right)]).slice(0, 4)); return [prompt, opts, opts.indexOf(right), why]; };

  /* ---------------- French ---------------- */
  const PERS = ["je", "tu", "il", "nous", "vous", "ils"];
  const IRR = { // present tense, je…ils, plus past participle
    être: ["suis", "es", "est", "sommes", "êtes", "sont", "été"], avoir: ["ai", "as", "a", "avons", "avez", "ont", "eu"],
    aller: ["vais", "vas", "va", "allons", "allez", "vont", "allé"], faire: ["fais", "fais", "fait", "faisons", "faites", "font", "fait"],
    dire: ["dis", "dis", "dit", "disons", "dites", "disent", "dit"], pouvoir: ["peux", "peux", "peut", "pouvons", "pouvez", "peuvent", "pu"],
    vouloir: ["veux", "veux", "veut", "voulons", "voulez", "veulent", "voulu"], savoir: ["sais", "sais", "sait", "savons", "savez", "savent", "su"],
    voir: ["vois", "vois", "voit", "voyons", "voyez", "voient", "vu"], boire: ["bois", "bois", "boit", "buvons", "buvez", "boivent", "bu"],
    lire: ["lis", "lis", "lit", "lisons", "lisez", "lisent", "lu"], croire: ["crois", "crois", "croit", "croyons", "croyez", "croient", "cru"],
    devoir: ["dois", "dois", "doit", "devons", "devez", "doivent", "dû"], courir: ["cours", "cours", "court", "courons", "courez", "courent", "couru"],
    mourir: ["meurs", "meurs", "meurt", "mourons", "mourez", "meurent", "mort"], naître: ["nais", "nais", "naît", "naissons", "naissez", "naissent", "né"],
    rire: ["ris", "ris", "rit", "rions", "riez", "rient", "ri"], sourire: ["souris", "souris", "sourit", "sourions", "souriez", "sourient", "souri"],
    vivre: ["vis", "vis", "vit", "vivons", "vivez", "vivent", "vécu"], suivre: ["suis", "suis", "suit", "suivons", "suivez", "suivent", "suivi"],
    plaire: ["plais", "plais", "plaît", "plaisons", "plaisez", "plaisent", "plu"], battre: ["bats", "bats", "bat", "battons", "battez", "battent", "battu"],
    recevoir: ["reçois", "reçois", "reçoit", "recevons", "recevez", "reçoivent", "reçu"], envoyer: ["envoie", "envoies", "envoie", "envoyons", "envoyez", "envoient", "envoyé"],
  };
  const FAM = [ // verb families: [ending, je…ils endings applied to stem, pp ending, stem-cut]
    [/(venir|tenir)$/, w => { const s = w.slice(0, -5); const v = w.endsWith("venir") ? "v" : "t"; return [s + v + "iens", s + v + "iens", s + v + "ient", s + v + "enons", s + v + "enez", s + v + "iennent", s + v + "enu"]; }],
    [/prendre$/, w => { const s = w.slice(0, -7); return [s + "prends", s + "prends", s + "prend", s + "prenons", s + "prenez", s + "prennent", s + "pris"]; }],
    [/mettre$/, w => { const s = w.slice(0, -6); return [s + "mets", s + "mets", s + "met", s + "mettons", s + "mettez", s + "mettent", s + "mis"]; }],
    [/écrire$/, w => { const s = w.slice(0, -6); return [s + "écris", s + "écris", s + "écrit", s + "écrivons", s + "écrivez", s + "écrivent", s + "écrit"]; }],
    [/(partir|sortir|dormir|servir|sentir|mentir)$/, w => { const r = w.slice(0, -2), s = r.slice(0, -1); return [s + "s", s + "s", s + "t", r + "ons", r + "ez", r + "ent", r + "i"]; }],
    [/aître$/, w => { const s = w.slice(0, -5); return [s + "ais", s + "ais", s + "aît", s + "aissons", s + "aissez", s + "aissent", s + "u"]; }],
    [/(vrir|frir)$/, w => { const s = w.slice(0, -2); return [s + "e", s + "es", s + "e", s + "ons", s + "ez", s + "ent", s.slice(0, -1) + "ert"]; }],
    [/uire$/, w => { const s = w.slice(0, -2); return [s + "s", s + "s", s + "t", s + "sons", s + "sez", s + "sent", s + "t"]; }],
    [/(eindre|aindre|oindre)$/, w => { const s = w.slice(0, -3), g = s.slice(0, -1); return [s + "s", s + "s", s + "t", g + "gnons", g + "gnez", g + "gnent", s + "t"]; }],
    [/cevoir$/, w => { const s = w.slice(0, -6); return [s + "çois", s + "çois", s + "çoit", s + "cevons", s + "cevez", s + "çoivent", s + "çu"]; }],
  ];
  const IR2 = new Set("finir choisir réussir grossir maigrir guérir obéir réfléchir remplir agir bâtir punir rougir vieillir grandir investir garantir établir saisir accomplir définir fournir applaudir avertir enrichir bénir nourrir réagir".split(" "));
  const RE = new Set("vendre attendre entendre répondre perdre rendre descendre défendre tendre fondre mordre correspondre".split(" "));
  const ACHETER = /(acheter|lever|mener|peser|promener|geler|élever)$/, PREFERER = /([éè][a-zç]+)er$/;
  const DOUBLE = /(appeler|jeter|rappeler|épeler|renouveler)$/;
  function frConj(v) { // → [je…ils, pp] or null
    if (IRR[v]) return IRR[v];
    for (const [re, f] of FAM) if (re.test(v)) return f(v);
    if (IR2.has(v)) { const s = v.slice(0, -2); return [s + "is", s + "is", s + "it", s + "issons", s + "issez", s + "issent", s + "i"]; }
    if (RE.has(v)) { const s = v.slice(0, -2); return [s + "s", s + "s", s, s + "ons", s + "ez", s + "ent", s + "u"]; }
    if (!/er$/.test(v) || v.includes(" ")) return null;
    const s = v.slice(0, -2);
    let soft = s, hard = s; // hard: je/tu/il/ils forms
    if (ACHETER.test(v)) hard = s.replace(/e([^e]*)$/, "è$1");
    else if (DOUBLE.test(v)) hard = s + s.slice(-1);
    else if (/[éè][^aeiouéèê]+$/.test(s) && PREFERER.test(v)) hard = s.replace(/é([^é]*)$/, "è$1");
    if (/yer$/.test(v) && !/ayer$/.test(v)) hard = s.slice(0, -1) + "i";
    const nous = /ger$/.test(v) ? s + "eons" : /cer$/.test(v) ? s.slice(0, -1) + "çons" : s + "ons";
    return [hard + "e", hard + "es", hard + "e", nous, soft + "ez", hard + "ent", s + "é"];
  }
  const ETRE_VERBS = new Set("aller venir arriver partir entrer sortir monter descendre naître mourir rester tomber retourner rentrer revenir devenir".split(" "));
  const elide = (p, f) => p === "je" && /^[aeiouéèêhâ]/i.test(f) ? "j'" + f : p + " " + f;

  const frWords = ws => ws.filter(v => v && v[0]);
  const DRILLS = {
    "fr-gender"(ws) {
      const nouns = frWords(ws).map(v => { let m = /^(le|la|l')\s?(.+?)(?:\s\((m|f)\))?$/.exec(v[0]); if (!m) return null; const g = m[1] === "le" ? "m" : m[1] === "la" ? "f" : m[3]; if (!g || /^[A-ZÉ]/.test(m[2]) || /\s/.test(m[2]) && m[2].length > 18) return null; return { w: m[2].trim(), g, en: v[1], vowel: m[1] === "l'" }; }).filter(Boolean);
      return nouns.map(n => n.vowel
        ? mcq(`___ ${n.w}  (${n.en})`, n.g === "m" ? "un" : "une", ["un", "une"], `${n.w} is ${n.g === "m" ? "masculine" : "feminine"}: ${n.g === "m" ? "un" : "une"} ${n.w}, l'${n.w}.`)
        : mcq(`___ ${n.w}  (${n.en})`, n.g === "m" ? "le" : "la", ["le", "la"], `${n.w} is ${n.g === "m" ? "masculine" : "feminine"}: ${n.g === "m" ? "le / un" : "la / une"} ${n.w}.`));
    },
    "fr-present"(ws) {
      const verbs = frWords(ws).map(v => ({ v: v[0], en: v[1], c: frConj(v[0]) })).filter(x => x.c && /^to /.test(x.en));
      return verbs.map(x => { const i = Math.floor(Math.random() * 6), right = x.c[i];
        return mcq(`${PERS[i] === "je" ? "je/j'" : PERS[i]} ___  (${x.v}: ${x.en})`, right, shuffle(x.c.slice(0, 6)), `${x.v}: ${PERS.map((p, k) => elide(p, x.c[k])).join(", ")}.`); });
    },
    "fr-aux"(ws) {
      const verbs = frWords(ws).map(v => ({ v: v[0], en: v[1], c: frConj(v[0]) })).filter(x => x.c && /^to /.test(x.en));
      return verbs.map(x => { const etre = ETRE_VERBS.has(x.v), pp = x.c[6];
        return mcq(`Hier, je ___ ${pp}.  (${x.v}: ${x.en})`, etre ? "suis" : "ai", ["suis", "ai"], etre ? `${x.v} takes être: je suis ${pp}${/é$/.test(pp) ? "(e)" : ""}.` : `${x.v} takes avoir: j'ai ${pp}.`); });
    },
  };

  /* ---------------- Persian ---------------- */
  const FA_STEM = { // infinitive → present stem (Persian script)
    "رفتن": "رو", "آمدن": "آ", "کردن": "کن", "شدن": "شو", "خوردن": "خور", "دیدن": "بین", "گفتن": "گو", "دادن": "ده", "زدن": "زن", "گرفتن": "گیر",
    "داشتن": "دار", "خواستن": "خواه", "دانستن": "دان", "توانستن": "توان", "خواندن": "خوان", "نوشتن": "نویس", "شنیدن": "شنو", "نشستن": "نشین",
    "ایستادن": "ایست", "خوابیدن": "خواب", "خریدن": "خر", "فروختن": "فروش", "پوشیدن": "پوش", "شستن": "شو", "پختن": "پز", "بستن": "بند",
    "آوردن": "آور", "بردن": "بر", "گذاشتن": "گذار", "گشتن": "گرد", "پرسیدن": "پرس", "فهمیدن": "فهم", "رسیدن": "رس", "ماندن": "مان",
    "دویدن": "دو", "پریدن": "پر", "خندیدن": "خند", "فرستادن": "فرست", "کشیدن": "کش", "انداختن": "انداز", "ریختن": "ریز", "چیدن": "چین",
    "افتادن": "افت", "مردن": "میر", "گذشتن": "گذر", "شکستن": "شکن", "ساختن": "ساز", "شناختن": "شناس", "نوشیدن": "نوش", "ترسیدن": "ترس",
    "پذیرفتن": "پذیر", "پیوستن": "پیوند", "باختن": "باز", "برگشتن": "برگرد", "ارزیدن": "ارز", "جوشاندن": "جوشان", "بریدن": "بر", "یافتن": "یاب",
  };
  const FA_PRON = ["من", "تو", "او", "ما", "شما", "آنها"];
  const PRES_END = ["م", "ی", "د", "یم", "ید", "ند"], PAST_END = ["م", "ی", "", "یم", "ید", "ند"];
  function faPresent(stem, i) {
    if (stem === "دار") return stem + PRES_END[i];
    const vowelEnd = /[اآو]$/.test(stem) && stem !== "رو" && stem !== "شو" && stem !== "دو";
    const s = vowelEnd ? stem + "ی" : stem;
    return "می‌" + s + PRES_END[i];
  }
  const faPast = (inf, i) => inf.slice(0, -1) + PAST_END[i];
  function faVerbs(ws) {
    return ws.filter(v => v && /(تن|دن)$/.test(v[0]) && /^to /.test(v[2] || "")).map(v => {
      const parts = v[0].split(" "), inf = parts.pop(), pre = parts.join(" ");
      return { full: v[0], pre, inf, stem: FA_STEM[inf], en: v[2] };
    });
  }
  const join = (pre, f) => pre ? pre + " " + f : f;
  const NOUN_TOPIC = /home|food|city|place|cloth|thing|transport|school|stud|work|job|body|nature|animal|family|shop|travel|technolog|health|kitchen|house|money|sport|science|art/i;
  const faNouns = ws => ws.filter(v => v && v[5] && NOUN_TOPIC.test(v[5]) && !/\s/.test(v[0]) && !/(تن|دن)$/.test(v[0]) && /^[a-z]/.test(v[2] || "") && !/^to /.test(v[2]));
  Object.assign(DRILLS, {
    "fa-present"(ws) {
      return faVerbs(ws).filter(x => x.stem).map(x => { const i = Math.floor(Math.random() * 6), all = PRES_END.map((_, k) => join(x.pre, faPresent(x.stem, k)));
        return mcq(`${FA_PRON[i]} ___  (${x.full}: ${x.en})`, all[i], shuffle(all), `Present stem of ${x.inf} is «${x.stem}»: ${FA_PRON.map((p, k) => p + " " + all[k]).join("، ")}`); });
    },
    "fa-past"(ws) {
      return faVerbs(ws).map(x => { const i = Math.floor(Math.random() * 6), all = PAST_END.map((_, k) => join(x.pre, faPast(x.inf, k)));
        return mcq(`دیروز ${FA_PRON[i]} ___  (${x.full}: ${x.en})`, all[i], shuffle(all), `Past stem = infinitive without «ن»: ${x.inf.slice(0, -1)} + ending → ${FA_PRON.map((p, k) => p + " " + all[k]).join("، ")}`); });
    },
    "fa-plural"(ws) {
      return faNouns(ws).map(v => {
        const w = v[0], right = w + "‌ها";
        return mcq(`Plural of «${w}» (${v[2]})`, right, [w + "ات", w + "ین", w + "ان", right], `Add «ها»: ${right}. (For people, «ان» also works in formal Persian.)`); });
    },
    "fa-ezafe"(ws) {
      const ADJ = [["بزرگ", "big"], ["کوچک", "small"], ["خوب", "good"], ["زیبا", "beautiful"], ["گران", "expensive"], ["ارزان", "cheap"], ["قدیمی", "old"], ["تازه", "new, fresh"]];
      const ez = w => /ه$/.test(w) ? w + "‌ی" : /[اوی]$/.test(w) ? w + "ی" : w + "ِ";
      return faNouns(ws).filter(v => !/[,;(]/.test(v[2])).map(v => {
        const [a, ae] = pick(ADJ), right = ez(v[0]) + " " + a;
        return mcq(`«${ae} ${v[2]}» in Persian`, right, [a + " " + v[0], v[0] + " " + a + "ِ", ez(a) + " " + v[0]], `Noun first, then -e, then the adjective: ${right}.`); });
    },
  });

  window.DRILLS = { make(name, ws, n) { const f = DRILLS[name]; if (!f) return []; return shuffle(f(ws)).slice(0, n || 8); }, frConj, faPresent, has: n => !!DRILLS[n] };
})();
