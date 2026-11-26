// Lists every Persian text the app can read aloud (words, examples, reading paragraphs), one per line.
// Used by .github/workflows/audio.yml. The app finds a recording by the SHA-1 of the same normalised text.
global.window = global;
for (const f of ["persian", "fagrammar", "favocab", "reading"]) require("../data/" + f + ".js");
const norm = t => String(t).replace(/[\/_]/g, " ").replace(/\s+/g, " ").trim();
const out = new Set();
for (const L of Object.values(COURSES.fa.levels)) {
  for (const v of L.vocab) out.add(norm(v[0]));
  for (const g of L.grammar) for (const e of g.ex) out.add(norm(e[0]));
}
for (const lv of Object.values(VOCAB.fa)) for (const v of lv) out.add(norm(v[0]));
for (const lv of Object.values(READING.fa)) for (const r of lv) { out.add(norm(r.title)); for (const p of r.text.split("\n")) out.add(norm(p)); }
out.delete("");
process.stdout.write([...out].join("\n") + "\n");
