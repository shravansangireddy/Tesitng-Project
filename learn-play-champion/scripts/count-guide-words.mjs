// Counts the guide/editorial words published across the /learn section.
//
// Method: reads the built pages in dist/learn/**/index.html (run
// `npm run build` first), takes the <main> content of each page, removes the
// guide-directory <aside> and the closing "Before you begin" notice, strips
// the remaining markup, and counts word tokens that contain at least one
// letter or digit. The site header, primary navigation, breadcrumbs' host
// header, and footer live outside <main>, so what is counted is page body
// text only: hero heading and intro, guide sections, and Q&A.
//
// Run: npm run build && node scripts/count-guide-words.mjs
// Exit codes: 0 = total >= 10,000 words; 1 = below 10,000; 2 = dist missing.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const learnDir = join(root, "dist", "learn");
const MINIMUM = 10000;

if (!existsSync(learnDir)) {
  console.error("dist/learn not found. Run `npm run build` first, then re-run this script.");
  process.exit(2);
}

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...htmlFiles(path));
    else if (entry === "index.html") out.push(path);
  }
  return out;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function guideWords(html) {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
  const body = main
    .replace(/<aside[\s\S]*?<\/aside>/g, " ")
    .replace(/<section class="notice">[\s\S]*?<\/section>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ");
  const text = decodeEntities(body.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  return text ? text.split(" ").filter(word => /[\p{L}\p{N}]/u.test(word)).length : 0;
}

let total = 0;
const rows = [];
for (const file of htmlFiles(learnDir).sort()) {
  const words = guideWords(readFileSync(file, "utf8"));
  total += words;
  rows.push([file.slice(root.length + 1), words]);
}
for (const [file, words] of rows) console.log(`${String(words).padStart(6)}  ${file}`);
console.log(`\nTotal guide/editorial words across /learn: ${total}`);
if (total < MINIMUM) {
  console.error(`FAIL: ${total} is below the ${MINIMUM}-word minimum.`);
  process.exit(1);
}
console.log(`OK: >= ${MINIMUM} words`);
