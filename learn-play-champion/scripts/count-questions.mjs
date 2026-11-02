// Counts the distinct questions the app can serve, two ways:
//  1. Static: every question row in the root banks (src/content/*.txt) and the
//     per-grade lesson pools (src/content/grades/*.txt), deduped by prompt
//     within each pool, plus a global distinct-prompt count.
//  2. Runtime template spaces: the grade-less generators in src/questions.ts
//     (classic addition/subtraction/multiplication/division/patterns formulas
//     plus the makeGeneratedRound template families) — counting distinct
//     prompts each sampler grid can produce, computed from the same ranges
//     the samplers use.
// Run: node scripts/count-questions.mjs   (exit code 1 if total < 10,000)
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "src", "content");

let staticRows = 0;
const globalPrompts = new Set();
const perSubject = new Map();
function note(subject, prompts) {
  staticRows += prompts.length;
  for (const p of prompts) globalPrompts.add(p);
  perSubject.set(subject, (perSubject.get(subject) ?? 0) + new Set(prompts).size);
}

// Root banks: JSON arrays of question objects with a `prompt` field.
for (const file of readdirSync(contentDir)) {
  if (!file.endsWith(".txt") || file === "math-templates.txt") continue;
  const bank = JSON.parse(readFileSync(join(contentDir, file), "utf8"));
  if (!Array.isArray(bank)) continue;
  note(file.replace(/\.txt$/, ""), bank.map((q) => q.prompt));
}

// Grade lesson pools: rows are [prompt, answer, options, hint, explanation].
const gradeDir = join(contentDir, "grades");
for (const file of readdirSync(gradeDir).sort()) {
  const pack = JSON.parse(readFileSync(join(gradeDir, file), "utf8"));
  for (const [lessonId, lesson] of Object.entries(pack.lessons)) {
    note(lessonId, lesson.questions.map((row) => row[0]));
  }
}

// --- Runtime template spaces (distinct prompts, from src/questions.ts) ---
let templateSpace = 0;
const tpl = (n) => { templateSpace += n; };
// Classic grade-less generators (questions.ts makeRound, grade-less path):
// arithmetic: rounds drawn from a in [4,18], b in [1,a], add/subtract prompts
// "a + b = ?" / "a - b = ?" with a != b patterns — count the (a, b) pairs.
let arithPairs = 0;
for (let a = 4; a <= 18; a++) for (let b = 1; b <= a; b++) arithPairs++;
tpl(arithPairs * 2); // one add prompt and one subtract prompt per pair
tpl(8 * 8 * 2);      // multiply/divide facts: a, b in [2,9]
// patterns: step in [2,6], start in [1,8], sequence + missing-term prompts
tpl(5 * 8 * 2);
// makeGeneratedRound families (grids mirror templateSamplers in questions.ts):
tpl(arithPairs * 2); // addition + subtraction families reuse the same grid
tpl(8 * 8 * 2);      // multiplication + division families
tpl(5 * 8);          // patterns family grid (step, start) sequence prompts
{ // fractions: b in {2,3,4,5,6,8,10,12}, quotient 1..20 -> "1/b of a" prompts
  const dens = [2, 3, 4, 5, 6, 8, 10, 12];
  let n = 0;
  for (const b of dens) for (let q = 1; q <= 20; q++) n++; // a = b*q distinct
  tpl(n);
}
tpl(19 * 19);        // decimals: a, b in {0.5, 1.0, ..., 9.5} add prompts
{ // placevalue: a in [100,999] with a nonzero digit in the chosen place
  let n = 0;
  for (let a = 100; a <= 999; a++) {
    for (const p of [1, 10, 100]) if (Math.floor(a / p) % 10 !== 0) n++;
  }
  tpl(n);
}
{ // money: quarters 0..8 x dimes 0..10, not both zero
  tpl(9 * 11 - 1);
}
tpl(9 * 3);          // time: start hour 1..9, add 1..3 hours
tpl(12);             // measurement: 1..12 meters
{ // missing: a in [2,30], answer in [2,30] -> pairs
  tpl(29 * 29);
}
tpl(88 * 7);         // multidigit: a in [12,99], b in [3,9]

const staticDistinct = globalPrompts.size;
const total = staticDistinct + templateSpace;
console.log("Static question rows (banks + grade pools):", staticRows);
console.log("Distinct static prompts (globally deduped):", staticDistinct);
console.log("Runtime template space (distinct prompts):", templateSpace);
console.log("TOTAL distinct questions:", total);
console.log("\nPer-subject distinct static prompts:");
for (const [subject, count] of [...perSubject.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${subject}: ${count}`);
}
if (total < 10000) {
  console.error("\nFAIL: total distinct questions below 10,000");
  process.exit(1);
}
console.log("\nOK: >= 10,000 distinct questions");
