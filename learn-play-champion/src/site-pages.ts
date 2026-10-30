import { sitePages, gradePages, editorialPages, freeBooks, type ContentPage } from "./site-content.ts";

export const sitePath = (page: ContentPage) => `/learn/${page.slug ? `${page.slug}/` : ""}`;
const escape = (text: string) => text.replace(/[&<>"']/g, char =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
export function siteOrigin(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  const url = new URL(input);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
    url.pathname !== "/" || url.hostname === "localhost" || url.hostname.endsWith(".example"))
    throw new Error("PUBLIC_SITE_URL must be the real public HTTPS origin with no path, query, credentials, or fragment.");
  return url.origin;
}
const link = (page: ContentPage) => `<a href="${sitePath(page)}">${escape(page.slug ? page.title.split(" | ")[0] : "Learning guide home")}</a>`;
export const stockPhotos = {
  reading: { file: "kids-creating", alt: "Children leaning over an open illustrated book, pointing and working together",
    author: "Andrew Ebrahim", source: "https://unsplash.com/photos/boys-writing-on-book-zRwXf6PizEo" },
  adventure: { file: "map-adventure", alt: "A child seen from behind exploring an outdoor landscape with a paper map",
    author: "Annie Spratt", source: "https://unsplash.com/photos/child-looking-at-map-kZO9xqmO_TA" },
  homework: { file: "kids-homework", alt: "A young boy with glasses writing in a notebook at a desk, with an open book and a stack of books beside him",
    author: "Vitaly Gariev", source: "https://unsplash.com/photos/young-boy-with-glasses-writing-in-a-notebook-at-desk-xZJK3Dp65OU" },
  readingTogether: { file: "kids-reading", alt: "Children sitting on a library floor reading illustrated books together",
    author: "Kyle Hinkson", source: "https://unsplash.com/photos/children-reading-books-together-on-the-floor-yG9w43LZz70" },
  coding: { file: "kids-coding", alt: "A young boy typing on a laptop at a desk at home, with a notebook beside him",
    author: "Vitaly Gariev", source: "https://unsplash.com/photos/young-boy-learning-on-a-laptop-at-a-desk-5jeHKPNLdLY" },
  family: { file: "family-learning", alt: "A father and son sitting together at a desk, smiling while using a laptop for homework",
    author: "Vitaly Gariev", source: "https://unsplash.com/photos/father-and-son-learning-together-on-a-laptop-sbHo9rRSIZc" },
};
type StockPhoto = keyof typeof stockPhotos;
function stockImage(key: StockPhoto, decorative = false) {
  const photo = stockPhotos[key];
  return `<img class="stock-image" src="/images/${photo.file}.webp" srcset="/images/${photo.file}-small.webp 600w, /images/${photo.file}.webp 1200w" sizes="(max-width: 650px) calc(100vw - 88px), 520px" width="1200" height="800" alt="${decorative ? "" : escape(photo.alt)}" loading="lazy" decoding="async">`;
}
function photoCredit(key: StockPhoto) {
  const photo = stockPhotos[key];
  return `Photo: <a href="${photo.source}" target="_blank" rel="noreferrer">${photo.author} / Unsplash</a>`;
}
const pagePhoto: Record<string, StockPhoto> = {
  "english-practice": "reading", "picture-books": "reading", "for-families": "adventure",
  "coding-and-ai": "adventure", "for-teachers": "reading",
  "math-practice": "reading", "learning-path": "adventure",
};
const subjects: Array<{ slug: string; name: string; label: string; mark: string; tone: string; grades: string; text: string; photo: StockPhoto }> = [
  { slug: "english-practice", name: "English Forest", label: "English", mark: "Aa", tone: "berry", grades: "Pre-K–Grade 5", text: "Words, stories, spelling, and ideas worth sharing.", photo: "readingTogether" },
  { slug: "math-practice", name: "Math Mountain", label: "Math", mark: "1+2", tone: "teal", grades: "Pre-K–Grade 5", text: "Numbers, patterns, shapes, and everyday discoveries.", photo: "homework" },
  { slug: "picture-books", name: "Picture books", label: "Books", mark: "B", tone: "gold", grades: "Pre-K–Grade 5", text: "Four-page original mini-books for reading together.", photo: "reading" },
  { slug: "coding-and-ai", name: "Coding & AI discovery", label: "Coding & AI", mark: "{ }", tone: "violet", grades: "Grades 3–5", text: "Plan a robot's steps. Explore how a tiny model learns.", photo: "coding" },
];
function siteHeader(page: ContentPage) {
  const nav = (slug: string, label: string) => `<a href="/learn/${slug}/"${page.slug === slug ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<div class="top-note">A little practice. A new possibility. <span>Original learning · No ads · Adult-supported</span></div>
<header class="site-header"><a class="brand" href="/learn/" aria-label="Learn and Play Champion home"><span class="brand-mark" aria-hidden="true">C<span>✦</span></span><span>Learn &amp; Play<strong>CHAMPION</strong></span></a>
<nav aria-label="Primary">
<details class="nav-menu"><summary>Explore learning</summary><div class="nav-popover">${subjects.map(s => nav(s.slug, s.label)).join("")}${nav("learning-path", "My Learning Path")}</div></details>
<details class="nav-menu"><summary>By grade</summary><div class="nav-popover">${gradePages.map(p => `<a href="${sitePath(p)}"${page.slug === p.slug ? ' aria-current="page"' : ""}>${escape(p.title.split(" English")[0])}</a>`).join("")}</div></details>
${nav("for-families", "For families")}${nav("for-teachers", "For teachers")}
<a class="button button-small" href="/">Start learning <span aria-hidden="true">↗</span></a></nav></header>`;
}
function islandArt() {
  return `<div class="hero-art"><svg viewBox="0 0 520 420" role="img" aria-labelledby="island-art-title">
<title id="island-art-title">Pip the owl welcomes you to a colorful island with a book and a math mountain</title>
<circle cx="266" cy="197" r="165" fill="#e1d7ff"/><circle cx="421" cy="73" r="32" fill="#ffd46d"/>
<path d="M56 272Q250 207 475 279L439 348Q258 402 88 340Z" fill="#68c6bc"/><path d="M88 340Q252 394 439 348L394 381Q245 424 125 372Z" fill="#368c87"/>
<path d="M309 254 378 114 468 277Z" fill="#9ba0eb"/><path d="m349 173 29-59 39 70-35-16-16 12Z" fill="#fffdf8"/>
<path d="M188 320Q276 270 382 298" fill="none" stroke="#fff9dd" stroke-width="20" stroke-linecap="round"/>
<path d="M188 320Q276 270 382 298" fill="none" stroke="#c79248" stroke-width="3" stroke-dasharray="7 12"/>
<path d="M132 232 117 144 178 172 217 169 263 134 251 234Z" fill="#7860bc"/>
<ellipse cx="195" cy="243" rx="76" ry="78" fill="#9679d1"/><ellipse cx="195" cy="263" rx="49" ry="48" fill="#c6b3ee"/>
<ellipse cx="166" cy="217" rx="31" ry="35" fill="#fff8e7"/><ellipse cx="222" cy="217" rx="31" ry="35" fill="#fff8e7"/>
<ellipse cx="169" cy="219" rx="11" ry="16" fill="#302549"/><ellipse cx="219" cy="219" rx="11" ry="16" fill="#302549"/>
<circle cx="173" cy="213" r="4" fill="white"/><circle cx="223" cy="213" r="4" fill="white"/>
<path d="m184 243 12 16 11-16" fill="#ffb751"/><path d="M124 239Q86 258 115 289L146 264M261 237q36 10 20 45l-34-22" fill="#7860bc"/>
<path d="M164 318h22m16 0h22" stroke="#ecaa46" stroke-width="10" stroke-linecap="round"/>
<path d="m56 154 52-14 17 58-52 15Z" fill="#f3a5b9"/><path d="m56 154-27-6 15 58 29 7Z" fill="#fff8e7"/><path d="m56 154 17 59" stroke="#b65c7e" stroke-width="3"/>
<path d="m79 159 17-5m-13 18 17-5" stroke="#82415d" stroke-width="3" stroke-linecap="round"/>
<path d="m309 75 4 11 12 1-9 8 2 12-10-6-10 6 2-12-9-8 12-1Z" fill="#f5b64e"/>
<path d="m89 73 4 10 11 1-8 7 2 11-9-5-9 5 2-11-8-7 11-1Z" fill="#a892dd"/>
<circle cx="455" cy="224" r="6" fill="#f3a5b9"/><circle cx="51" cy="272" r="6" fill="#a892dd"/>
</svg><div class="art-label"><span class="status-dot" aria-hidden="true"></span>Your next little adventure awaits</div></div>`;
}
function subjectCards() {
  return `<section class="catalog-section" aria-labelledby="subject-heading"><div class="section-heading"><div><p class="eyebrow">SO MANY WAYS TO WONDER</p><h2 id="subject-heading">Find their next “I did it!”</h2></div><p>Choose an interest.<br>Make a little room for discovery.</p></div>
<div class="subject-grid">${subjects.map(s => `<a class="subject-card ${s.tone}" href="/learn/${s.slug}/">${stockImage(s.photo, true)}<span class="subject-mark" aria-hidden="true">${s.mark}</span><small>${s.grades}</small><h3>${s.name}</h3><p>${s.text}</p><span class="card-action">Explore ${s.label} <span aria-hidden="true">→</span></span></a>`).join("")}</div></section>`;
}
function gradeCatalog() {
  const highlights = [
    "Letters, small collections, and familiar patterns",
    "Sounds, early number ideas, and simple shapes",
    "Vowel patterns, sentences, tens, and ones",
    "Word parts, equal groups, time, and money",
    "Reading clues, multiplication, and fractions",
    "Text evidence, factors, decimals, and angles",
    "Claims, fraction operations, volume, and data",
  ];
  return `<section class="catalog-section grade-section" aria-labelledby="grade-heading"><div class="section-heading"><div><p class="eyebrow">START SOMEWHERE FAMILIAR</p><h2 id="grade-heading">A little learning at their level.</h2></div><p>Seven levels to browse.<br>No placement label needed.</p></div>
<div class="grade-grid">${gradePages.map((p, index) => `<div class="grade-card"><a class="grade-overview" href="${sitePath(p)}"><span class="grade-token" aria-hidden="true">${["P", "K", "1", "2", "3", "4", "5"][index]}</span><span><h3>${escape(p.title.split(" English")[0])}</h3><p>${highlights[index]}</p><small>Explore this level <span aria-hidden="true">→</span></small></span></a><div class="grade-links"><a href="/learn/english-practice/">English guide</a><a href="/learn/math-practice/">Math guide</a></div></div>`).join("")}</div>
<p class="catalog-note">Each level includes 16 activities and 80 questions. Original supplemental practice—not a full curriculum or a measured reading level.</p></section>`;
}
function booksStrip() {
  const picks = [
    { mark: "⚛", title: "Physics in a Minute", text: "Motion, magnets, space, light and sound" },
    { mark: "➗", title: "Math in a Minute", text: "Numbers, shapes, patterns, measuring" },
    { mark: "🚀", title: "Astronomy in a Minute", text: "Planets, stars, rockets, and the Moon" },
    { mark: "🦕", title: "Dinosaurs in a Minute", text: "Fossils, giants, and how we know" },
  ];
  return `<section class="catalog-section books-section" aria-labelledby="books-heading"><div class="section-heading"><div><p class="eyebrow">FROM OUR BOOKSHELF</p><h2 id="books-heading">Books for curious kids.</h2></div><p>Comic-style reads, one big idea a minute.<br><a href="/learn/books-for-curious-kids/">See all 11 books in the series →</a></p></div>
<div class="gallery-grid">${picks.map(b => `<a class="gallery-card" href="/learn/books-for-curious-kids/"><span class="book-pick"><span class="book-mark" aria-hidden="true">${b.mark}</span><strong>${b.title}</strong><small>${b.text}</small></span></a>`).join("")}</div>
<p class="photo-credit">Outside books sold by bookstores and online sellers — listed as reading ideas for families, not sold by Learn &amp; Play Champion.</p></section>`;
}
function freeDownloads() {
  return `<section aria-labelledby="free-books-heading"><h2 id="free-books-heading">Free books to download, right here.</h2><p>These six real books are shared by their publishers under Creative Commons CC BY 4.0 licences — free to download, print, and share, with credit to the people who made them. No account, no cost, no catch.</p>
<div class="download-grid">${freeBooks.map(b => `<article class="download-card"><h3>${escape(b.title)}</h3><p class="download-meta">${escape(b.ages)} · ${b.pages} pages · PDF ${escape(b.size)}</p><p>${escape(b.blurb)}</p><a class="button download-button" href="/books/${b.file}" download>Download PDF</a><p class="download-credit">${escape(b.credit)}</p></article>`).join("")}</div></section>`;
}
function photoGallery() {
  const cards: Array<{ photo: StockPhoto; slug: string; label: string; caption: string }> = [
    { photo: "homework", slug: "math-practice", label: "Math practice", caption: "Pencils out. Minds on." },
    { photo: "readingTogether", slug: "picture-books", label: "Picture books", caption: "Stories are better together." },
    { photo: "coding", slug: "coding-and-ai", label: "Coding & AI", caption: "First steps into how computers think." },
    { photo: "family", slug: "for-families", label: "For families", caption: "A grown-up alongside makes it stick." },
  ];
  return `<section class="catalog-section gallery-section" aria-labelledby="gallery-heading"><div class="section-heading"><div><p class="eyebrow">LEARNING LOOKS LIKE THIS</p><h2 id="gallery-heading">Little moments, big leaps.</h2></div><p>Reading, solving, building, exploring —<br>the many ways kids practice.</p></div>
<div class="gallery-grid">${cards.map(c => `<a class="gallery-card" href="/learn/${c.slug}/">${stockImage(c.photo, true)}<span class="gallery-caption"><small>${c.label}</small><strong>${c.caption}</strong></span></a>`).join("")}</div>
<p class="photo-credit">${photoCredit("homework")} · ${photoCredit("readingTogether")} · ${photoCredit("coding")} · ${photoCredit("family")}. Illustrative stock photography, not app users or endorsements.</p></section>`;
}
function homeFeatures() {
  return `<section class="adventure-feature" aria-labelledby="adventure-heading"><figure>${stockImage("adventure")}<figcaption class="photo-credit">${photoCredit("adventure")}. Illustrative stock photo, not an app user or endorsement.</figcaption></figure><div><p class="eyebrow">CURIOUS MINDS GO PLACES</p><h2 id="adventure-heading">Every little discovery is an adventure.</h2><p>A question in a book. A pattern on a walk. A new way to solve a puzzle. Bring that same curiosity to a short learning adventure, then keep exploring together away from the screen.</p><a class="button" href="/learn/for-families/">Find your next small discovery <span aria-hidden="true">→</span></a></div></section>
<section class="path-feature" aria-labelledby="path-heading"><div><p class="eyebrow">ONE SMALL STEP AT A TIME</p><h2 id="path-heading">Not sure where to start?<br>Follow a little learning path.</h2><p>An optional eight-question practice check offers simple suggestions for what to explore next. No timer. No points. No automatic grade changes.</p><a class="text-link" href="/learn/learning-path/">Meet My Learning Path <span aria-hidden="true">→</span></a><p class="fine-print">Practice guidance, not a validated diagnostic or mastery assessment.</p></div>
<ol class="step-cards"><li><span>01</span><div><h3>Choose a level</h3><p>Start with something familiar.</p></div></li><li><span>02</span><div><h3>Try a little check</h3><p>Talk through eight practice questions.</p></div></li><li><span>03</span><div><h3>Pick your next adventure</h3><p>Revisit an idea or explore a new skill.</p></div></li></ol></section>
<section class="catalog-section audience-section" aria-labelledby="audience-heading"><p class="eyebrow">A GROWN-UP MAKES A DIFFERENCE</p><h2 id="audience-heading">Better with someone cheering them on.</h2><div class="audience-grid">
<a class="audience-card family-card" href="/learn/for-families/">${stockImage("adventure", true)}<span class="eyebrow">FOR FAMILIES</span><h3>Make practice a moment together.</h3><p>Read a question, explore a mini-book, and celebrate the thinking behind an answer.</p><span class="card-action">Your home-learning guide <span aria-hidden="true">→</span></span></a>
<a class="audience-card teacher-card" href="/learn/for-teachers/">${stockImage("reading", true)}<span class="eyebrow">FOR TEACHERS</span><h3>A starting point for your next conversation.</h3><p>Browse supplemental practice and learn how approved teachers can submit content for review.</p><span class="card-action">Explore teacher guidance <span aria-hidden="true">→</span></span></a></div><p class="photo-credit">${photoCredit("adventure")} · ${photoCredit("reading")}. Illustrative stock photography, not app users or endorsements.</p></section>`;
}
function siteFooter() {
  return `<footer class="site-footer"><div><a class="brand" href="/learn/">Learn &amp; Play <strong>CHAMPION</strong></a><p>Small steps. Curious minds.<br>A little encouragement along the way.</p></div><nav aria-label="About and help"><h2>Get to know us</h2><a href="/learn/about/">Our approach</a><a href="/learn/how-it-works/">How it works</a><a href="/learn/faq/">Questions &amp; answers</a></nav><nav aria-label="Grown-up resources"><h2>For grown-ups</h2><a href="/learn/for-families/">For families</a><a href="/learn/for-teachers/">For teachers</a><a href="/learn/privacy-and-safety/">Privacy &amp; safety</a></nav><p class="footer-note">Original supplemental learning, with adult support. Optional online services depend on operator setup. Open the app's Privacy &amp; data area for operator contact and data controls. No guaranteed learning outcomes or compliance certification.</p></footer>`;
}
export function renderSitePage(page: ContentPage, origin?: string): string {
  const home = page.slug === "";
  const photo = pagePhoto[page.slug];
  const canonical = origin ? origin + sitePath(page) : undefined;
  const schema = {
    "@context": "https://schema.org", "@type": "WebPage", name: page.title,
    description: page.description, inLanguage: "en-US",
    ...(canonical ? { url: canonical } : {}),
    about: { "@type": "SoftwareApplication", name: "Learn & Play Champion",
      applicationCategory: "EducationalApplication", operatingSystem: "Web browser" },
  };
  return `<!doctype html>
<html lang="en-US"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer"><meta name="theme-color" content="#6e48df">
<title>${escape(page.title)}</title><meta name="description" content="${escape(page.description)}">
<meta name="robots" content="index,follow">
${canonical ? `<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}">` : ""}
<meta property="og:type" content="website"><meta property="og:site_name" content="Learn &amp; Play Champion">
<meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escape(page.title)}">
<meta name="twitter:description" content="${escape(page.description)}">
<link rel="stylesheet" href="/learn/site.css">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>
</head><body class="${home ? "landing-page" : "guide-page"}">
<a class="skip" href="#content">Skip to content</a>
${siteHeader(page)}
<main id="content"><article>
${!home ? `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/learn/">Learning home</a><span aria-hidden="true"> / </span><span>${escape(page.title.split(" | ")[0])}</span></nav>` : ""}
<div class="hero${photo ? " photo-hero" : ""}"><div class="hero-copy"><p class="eyebrow">PLAYFUL PRACTICE · PRE-K–GRADE 5</p>
<h1>${escape(page.heading)}</h1><p class="intro">${escape(page.intro)}</p><div class="hero-actions"><a class="button" href="/">Start a learning adventure <span aria-hidden="true">→</span></a><a class="text-link" href="/learn/how-it-works/">See how it works</a></div>
${home ? `<p class="hero-footnote">Local guest play · No account or purchase required</p>` : ""}</div>${home ? islandArt() : photo ? `<figure class="guide-photo">${stockImage(photo)}<figcaption>${photoCredit(photo)}. Illustrative stock photo, not an app screenshot or endorsement.</figcaption></figure>` : ""}</div>
${home ? `<div class="learning-facts" aria-label="Inside the built-in library"><div><strong>7</strong><span>levels, Pre-K–5</span></div><div><strong>560</strong><span>English &amp; math questions</span></div><div><strong>14</strong><span>illustrated mini-books</span></div><div><strong>18</strong><span>coding puzzles · Grades 3–5</span></div></div>${subjectCards()}${gradeCatalog()}${photoGallery()}${booksStrip()}${homeFeatures()}` : ""}
<div class="editorial-content">
${page.sections.map(section => `<section><h2>${escape(section.heading)}</h2>${section.paragraphs.map(p => `<p>${escape(p)}</p>`).join("")}${section.items ? `<ul>${section.items.map(item => `<li>${escape(item)}</li>`).join("")}</ul>` : ""}</section>`).join("")}
${page.slug === "books-for-curious-kids" ? freeDownloads() : ""}
${page.questions ? `<section><h2>Questions families ask</h2>${page.questions.map(q => `<h3>${escape(q.question)}</h3><p>${escape(q.answer)}</p>`).join("")}</section>` : ""}
</div></article><aside class="guide-directory" aria-label="Explore learning guides">${!home ? `<h2>Find your level</h2><nav class="cards" aria-label="Grade guides">${gradePages.map(link).join("")}</nav>` : ""}
<h2>More about learning here</h2><nav class="cards" aria-label="Topic guides">${editorialPages.filter(p => p.slug !== page.slug).map(link).join("")}</nav></aside>
<section class="notice"><h2>Before you begin</h2><p>Guest learning is local to this browser. Online accounts, shared content, private rooms, voice, and adult donations depend on deployment settings and provider setup. Use the app's Privacy &amp; data area for operator notices and data controls. No claims of certified academic mastery or COPPA/FERPA compliance are made.</p></section></main>
${siteFooter()}
</body></html>`;
}
export function renderSitemap(origin: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitePages.map(page =>
    `<url><loc>${escape(origin + sitePath(page))}</loc></url>`).join("")}</urlset>\n`;
}
export function renderRobots(origin?: string): string {
  return `User-agent: *\nAllow: /learn/\n${origin ? `Sitemap: ${origin}/sitemap.xml\n` : ""}`;
}
export function renderMachineGuide(origin?: string): string {
  return `# Learn & Play Champion

> Original supplemental Pre-K–Grade 5 English and math practice with adult support.

## Public guides
${sitePages.map(page => `- [${page.title}](${origin ?? ""}${sitePath(page)}): ${page.description}`).join("\n")}

## Important limits
- Not a complete curriculum, validated diagnostic, mastery certification, or external AI tutor.
- Accounts, rooms, teaching content, voice, and donations require deployment configuration.
- No invented author credentials, testimonials, learning-outcome statistics, or compliance certification.
- Operator contact, consent/authorization, retention, and deletion procedures are deployment-specific.

This optional discovery file is not a web or AI indexing standard and does not guarantee inclusion in answers.
`;
}

export const siteStyles = `
:root{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#292344;background:#fffcf7;line-height:1.7;font-synthesis:none}
*{box-sizing:border-box}body{margin:0}a{color:#5130a1;text-underline-offset:4px}a:hover{text-decoration-thickness:3px}
a:focus-visible,summary:focus-visible{outline:3px solid #246f80;outline-offset:5px}main,.site-header,.site-footer{max-width:1200px;margin:auto;padding:24px}
p,li,a,h1,h2,h3{overflow-wrap:anywhere}h1,h2,h3{line-height:1.2;letter-spacing:-.025em}h2{font-size:clamp(1.7rem,3vw,2.4rem);margin:0 0 20px}h3{font-size:1.18rem}
.top-note{text-align:center;background:#eee7fb;color:#514471;padding:8px 16px;font-size:.8rem;font-weight:650}.top-note span{margin-left:24px;font-weight:400}
.site-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-top:22px;padding-bottom:22px}
.brand{display:flex;align-items:center;gap:10px;font-size:1.12rem;font-weight:650;line-height:1.25;text-decoration:none;color:#292344;flex-shrink:0}.brand strong{display:block;color:#6540be;font-size:.78rem;letter-spacing:.18em;margin-top:4px}
.brand-mark{position:relative;display:grid;place-items:center;width:44px;height:48px;border-radius:14px;background:#7452c8;color:white;font-size:1.9rem;font-weight:800;box-shadow:0 4px 0 #e4d8fa}.brand-mark span{position:absolute;font-size:.8rem;right:5px;top:3px;color:#ffe0a0}
.site-header nav{display:flex;align-items:center;gap:20px;font-size:.87rem;font-weight:650}.site-header nav>a:not(.button){color:#4b425c;text-decoration:none}
.nav-menu{position:relative}.nav-menu summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px;list-style:none;color:#4b425c}.nav-menu summary::-webkit-details-marker{display:none}.nav-menu summary:after{content:"⌄";font-size:1rem}
.nav-popover{position:absolute;z-index:5;top:100%;left:0;min-width:200px;background:white;border:1px solid #dfd6ed;border-radius:16px;padding:8px;box-shadow:0 16px 40px #32234d18}.nav-popover a{display:block;padding:10px 12px;border-radius:8px;text-decoration:none}.nav-popover a:hover,.nav-popover a[aria-current=page]{background:#f0eafa}
.button{display:inline-flex;align-items:center;justify-content:center;gap:18px;background:#6540be;color:white;border:2px solid #6540be;border-radius:12px;padding:13px 22px;font-weight:700;text-decoration:none;box-shadow:0 4px 0 #442880}
.button:hover{background:#5230a1;border-color:#5230a1}.button-small{padding:9px 16px;gap:10px;font-size:.85rem}.text-link{font-weight:700;text-decoration:none}
.hero{padding:clamp(24px,4vw,48px);background:linear-gradient(120deg,#f1eafb 0%,#f7f1e9 100%);border-radius:30px}
.landing-page .hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:16px}.eyebrow{font-size:.72rem;letter-spacing:.12em;font-weight:750;color:#6b538d;margin:0 0 16px}
h1{font-size:clamp(2.15rem,4.2vw,3.6rem);margin:0 0 22px;max-width:850px;font-weight:800}.intro{font-size:1.08rem;color:#574f65;max-width:720px}
.hero-actions{display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:28px;font-size:.91rem}.hero-footnote{font-size:.76rem;color:#635b6e;margin-top:18px}
.hero-art{position:relative;min-width:0}.hero-art svg{width:100%;height:auto;display:block}.art-label{background:white;border:1px solid #e8dff1;border-radius:99px;width:fit-content;margin:-14px auto 0;position:relative;padding:9px 14px;font-size:.7rem;font-weight:650;color:#5a5070;box-shadow:0 5px 16px #39214f08}.status-dot{display:inline-block;width:7px;height:7px;background:#338274;border-radius:50%;margin-right:7px}
.stock-image{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:16px;background:#e6dfee}
.photo-hero{display:grid;grid-template-columns:1.15fr 1fr;gap:32px;align-items:center}.photo-hero h1{font-size:clamp(2rem,3.2vw,2.8rem)}
.guide-photo{margin:0;min-width:0}.guide-photo figcaption,.photo-credit{font-size:.68rem;color:#61566d;line-height:1.65;margin-top:12px}
.audience-card>.stock-image{margin-bottom:24px;aspect-ratio:2/1}.photo-credit a,.guide-photo figcaption a{color:inherit}
.adventure-feature{display:grid;grid-template-columns:1fr 1fr;gap:36px;align-items:center;margin:64px 0;padding:28px;background:#fff2df;border:1px solid #efdfc3;border-radius:24px}
.adventure-feature figure{margin:0;min-width:0}.adventure-feature p:not(.eyebrow){color:#665b49;font-size:.95rem}.adventure-feature .button{font-size:.85rem}
.learning-facts{display:grid;grid-template-columns:repeat(4,1fr);margin:28px 0 64px;border-block:1px solid #e8e1ed;padding:24px 0}.learning-facts div{display:flex;flex-direction:column;text-align:center;padding:0 8px}.learning-facts div+div{border-left:1px solid #e8e1ed}.learning-facts strong{font-size:1.8rem;line-height:1.2;color:#6540be}.learning-facts span{font-size:.76rem;color:#665c74;margin-top:6px}
.catalog-section{margin:64px 0}.section-heading{display:flex;justify-content:space-between;gap:28px;align-items:center;margin-bottom:26px}.section-heading h2{margin-bottom:0}.section-heading>p{font-size:.85rem;color:#71667b;flex-shrink:0}
.subject-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.subject-card{display:flex;flex-direction:column;border:1px solid var(--edge);background:var(--surface);padding:24px 20px;border-radius:20px;text-decoration:none;color:#292344}.subject-card:hover{box-shadow:0 8px 24px #39214f10;transform:translateY(-2px)}
.berry{--surface:#fff1f4;--edge:#f0d7df;--ink:#9c385b}.teal{--surface:#eaf7f4;--edge:#cbe9df;--ink:#236d63}.gold{--surface:#fff7e2;--edge:#eddeac;--ink:#866122}.violet{--surface:#f0eafb;--edge:#dfd3f0;--ink:#6743a1}
.subject-mark{display:grid;place-items:center;width:52px;height:52px;background:white;border-radius:14px;color:var(--ink);font-weight:800;font-size:1.15rem;margin-bottom:22px}
.subject-card .stock-image{aspect-ratio:2/1;margin:-4px 0 18px}
.gallery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.gallery-card{display:block;background:white;border:1px solid #e4ddec;border-radius:20px;overflow:hidden;text-decoration:none;color:#292344}.gallery-card:hover{box-shadow:0 8px 24px #39214f10;transform:translateY(-2px)}.gallery-card .stock-image{border-radius:0}.gallery-caption{display:flex;flex-direction:column;gap:2px;padding:14px 18px 16px}.gallery-caption small{font-size:.68rem;font-weight:750;letter-spacing:.1em;text-transform:uppercase;color:#6540be}.gallery-caption strong{font-size:.95rem;line-height:1.35}
.book-pick{display:flex;flex-direction:column;gap:4px;padding:20px 18px}.book-mark{font-size:1.7rem;line-height:1.2}.book-pick strong{font-size:1rem;line-height:1.3}.book-pick small{color:#675d78;line-height:1.45}
.download-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:18px}.download-card{background:#fff;border:1px solid #e7ddf2;border-radius:16px;padding:20px 18px;display:flex;flex-direction:column;gap:6px}.download-card h3{margin:0;font-size:1.05rem}.download-card p{margin:0}.download-meta{font-size:.78rem;font-weight:750;color:#6540be;letter-spacing:.02em}.download-button{margin-top:10px;align-self:flex-start}.download-credit{font-size:.74rem;color:#675d78;line-height:1.5}.subject-card small{font-size:.7rem;color:var(--ink);font-weight:700}.subject-card h3{margin:8px 0}.subject-card p{font-size:.83rem;color:#61566d;margin:0 0 20px}.card-action{font-size:.8rem;font-weight:750;color:var(--ink,#5130a1);margin-top:auto}.card-action span{margin-left:8px}
.grade-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.grade-card{background:white;border:1px solid #e4ddec;border-radius:16px;overflow:hidden}.grade-overview{display:flex;gap:18px;padding:20px;text-decoration:none;color:#292344}.grade-token{flex-shrink:0;display:grid;place-items:center;width:52px;height:56px;background:#eee8fa;color:#6743a1;border-radius:15px;font-size:1.6rem;font-weight:800}.grade-card:nth-child(3n+2) .grade-token{background:#e5f4ed;color:#286e5c}.grade-card:nth-child(3n) .grade-token{background:#fff0d9;color:#8a6025}
.grade-card h3{margin:2px 0 8px}.grade-card p{margin:0 0 8px;color:#6b6077;font-size:.82rem}.grade-card small{font-size:.75rem;color:#6540be;font-weight:650}.grade-links{padding:9px 20px;border-top:1px solid #eee8f3;display:flex;gap:18px;background:#fdfbff;font-size:.72rem}.grade-card:hover{border-color:#b9a2d8}.catalog-note{font-size:.8rem;color:#6c6276}
.path-feature{background:#eaf4f1;border-radius:24px;padding:36px;display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;margin:64px 0}.path-feature h2{font-size:2rem}.path-feature p{color:#566a62;font-size:.92rem}.path-feature .eyebrow{color:#376857}.path-feature .fine-print{font-size:.73rem}
.step-cards{display:grid;gap:12px;list-style:none;margin:0;padding:0}.step-cards li{display:flex;align-items:center;gap:16px;padding:18px;background:#fff;border:1px solid #d7e7e1;border-radius:14px}.step-cards li>span{display:grid;place-items:center;width:38px;height:38px;flex-shrink:0;background:#f1ece0;color:#7c612c;border-radius:50%;font-weight:750}.step-cards h3{margin:0;font-size:.92rem}.step-cards p{margin:4px 0 0;font-size:.77rem}
.audience-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.audience-card{display:flex;flex-direction:column;padding:30px;border-radius:20px;text-decoration:none;color:#292344;border:1px solid #e6dcef}.audience-card h3{font-size:1.65rem;max-width:400px;margin:4px 0 14px}.audience-card p{color:#655a71;font-size:.9rem}.family-card{background:#f3ecfb}.teacher-card{background:#fff2df}
.editorial-content{max-width:780px;margin:56px auto}.editorial-content section{margin:40px 0}.editorial-content p,.editorial-content li{color:#5d536b}
.editorial-content ul{list-style:none;padding:0;margin:16px 0 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 24px}.editorial-content li{position:relative;padding-left:24px;line-height:1.45}.editorial-content li::before{content:"✦";position:absolute;left:0;color:#8962d8;font-size:.8rem;top:.18em}.editorial-content h2{font-size:1.65rem}.editorial-content h3{margin-top:28px}.landing-page .editorial-content{border-top:1px solid #e8e1ed;padding-top:18px}
.breadcrumbs{font-size:.8rem;color:#72687d;margin:0 0 22px}.guide-page .hero{padding:42px}.guide-directory{margin:56px 0}.guide-directory h2{font-size:1.5rem}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px;margin-bottom:32px}
.cards a{padding:16px;border:1px solid #e4ddec;border-radius:12px;background:white;font-size:.83rem;font-weight:600;text-decoration:none}.cards a:hover{background:#f3eefa}
.notice{padding:24px;background:#f0ede5;border-radius:18px}.notice h2{font-size:1.15rem;margin:0}.notice p{font-size:.8rem;color:#665e50}
.site-footer{border-top:1px solid #e4ddec;margin-top:40px;padding-top:40px;display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:32px;font-size:.8rem}.site-footer>div p{color:#71667b}.site-footer nav{display:flex;flex-direction:column;gap:9px}.site-footer h2{font-size:.9rem;margin:0 0 8px}.site-footer nav a{text-decoration:none}.footer-note{grid-column:1/-1;border-top:1px solid #e4ddec;padding-top:20px;color:#71667b;font-size:.73rem}
.skip{position:absolute;left:12px;top:-100px;background:white;padding:12px;z-index:10}.skip:focus{top:12px}
@media(max-width:1000px){.site-header{align-items:flex-start;flex-wrap:wrap}.site-header nav{flex-wrap:wrap;gap:18px}.landing-page .hero{grid-template-columns:1.2fr 1fr}.subject-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:650px){main,.site-header,.site-footer{padding:20px}.top-note span{display:none}.site-header{gap:20px}.site-header nav{gap:8px 18px;font-size:.78rem;width:100%}.site-header .button-small{font-size:.75rem}.nav-popover{min-width:165px}.landing-page .hero{grid-template-columns:1fr;padding:26px}.hero-art{max-width:340px;margin:8px auto 0}.hero h1{font-size:2.5rem}.intro{font-size:1rem}.hero-actions{gap:20px;font-size:.85rem}.hero-actions .button{width:100%;padding-inline:10px}.learning-facts{grid-template-columns:1fr 1fr;row-gap:24px;margin-bottom:44px}.learning-facts div:nth-child(3){border-left:0}.section-heading{display:block}.section-heading>p br{display:none}.subject-grid,.grade-grid,.audience-grid,.gallery-grid,.editorial-content ul{grid-template-columns:1fr}.subject-card{padding:24px}.subject-mark{margin-bottom:14px}.catalog-section{margin:44px 0}.grade-overview{padding:18px;gap:14px}.path-feature{grid-template-columns:1fr;padding:24px;gap:24px}.path-feature h2{font-size:1.7rem}.audience-card{padding:24px}.site-footer{grid-template-columns:1fr 1fr;gap:24px}.site-footer>div{grid-column:1/-1}.guide-page .hero{padding:26px}.guide-page .hero h1{font-size:2rem}.art-label{font-size:.65rem}}
@media(max-width:850px){.photo-hero,.adventure-feature{grid-template-columns:1fr}.guide-photo{max-width:600px}.adventure-feature{gap:20px;padding:24px}}
@media(prefers-reduced-motion:no-preference){a{transition:background-color .15s,box-shadow .15s,transform .15s}}
@media(prefers-reduced-motion:reduce){.subject-card:hover{transform:none}}`;
