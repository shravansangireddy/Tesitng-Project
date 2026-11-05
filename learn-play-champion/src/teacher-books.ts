import { gradeIds, type GradeId } from "./content-schema";
import {
  QUESTIONS_PER_BOOK,
  type MotivationBook,
  type MotivationQuestion,
} from "./motivation-books";

// Teacher Studio data (the "I am a teacher" switch plus the books a
// teacher uploads) lives in its own small store, NOT in the learner
// Progress blob. Progress is per-learner state: it is snapshotted per
// child profile, syncs as learning data, and is wiped by "Erase
// learning data" — whose own wording treats teaching content as
// separate from learning data. Uploaded books are the grown-up's
// content for this device, so they get a dedicated localStorage store.
// The trade-off for v1: the switch and the uploaded books live on the
// browser where the teacher saved them and do not yet follow the
// account to other devices.
export interface TeacherStore {
  teacher: boolean;
  books: MotivationBook[];
}

export const TEACHER_STORAGE_KEY = "learn-play-champion-teacher-v1";

const teacherBookIdPattern = /^u-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function isTeacherBookId(id: string): boolean {
  return id.length <= 80 && teacherBookIdPattern.test(id);
}
export function newTeacherBookId(): string {
  return `u-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

// Generous caps keep a pasted book from bloating local storage; the
// parser reports the friendliest of these (title and page length) and
// the sanitizer quietly drops anything stored that breaks them.
const LIMITS = {
  title: 120,
  theme: 60,
  emoji: 16,
  description: 300,
  page: 1500,
  prompt: 300,
  option: 200,
  why: 300,
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text.length >= 1 && text.length <= max ? text : null;
}

export function sanitizeTeacherBook(value: unknown): MotivationBook | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || !isTeacherBookId(raw.id)) return null;
  if (!gradeIds.some((grade) => grade === raw.grade)) return null;
  const title = cleanText(raw.title, LIMITS.title);
  const theme = cleanText(raw.theme, LIMITS.theme);
  if (!title || !theme) return null;
  const emoji =
    typeof raw.emoji === "string" && raw.emoji.trim()
      ? raw.emoji.trim().slice(0, LIMITS.emoji)
      : "📖";
  if (!Array.isArray(raw.pages) || raw.pages.length < 3 || raw.pages.length > 6)
    return null;
  const pages: string[] = [];
  for (const page of raw.pages) {
    const text = cleanText(page, LIMITS.page);
    if (!text) return null;
    pages.push(text);
  }
  if (!Array.isArray(raw.questions) || raw.questions.length !== QUESTIONS_PER_BOOK)
    return null;
  const questions: MotivationQuestion[] = [];
  for (const entry of raw.questions) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry))
      return null;
    const question = entry as Record<string, unknown>;
    const prompt = cleanText(question.prompt, LIMITS.prompt);
    if (!prompt) return null;
    if (
      !Array.isArray(question.options) ||
      (question.options.length !== 3 && question.options.length !== 4)
    )
      return null;
    const options: string[] = [];
    for (const option of question.options) {
      const text = cleanText(option, LIMITS.option);
      if (!text) return null;
      options.push(text);
    }
    if (new Set(options).size !== options.length) return null;
    if (
      typeof question.answer !== "number" ||
      !Number.isInteger(question.answer) ||
      question.answer < 0 ||
      question.answer >= options.length
    )
      return null;
    const explanation = cleanText(question.explanation, LIMITS.why);
    if (!explanation) return null;
    questions.push({ prompt, options, answer: question.answer, explanation });
  }
  // The description is optional (grown-ups see it in place of the
  // book); a stored value that no longer passes the text rules is
  // quietly dropped, and the shelf falls back to the theme.
  const description = cleanText(raw.description, LIMITS.description);
  return {
    id: raw.id,
    grade: raw.grade as GradeId,
    title,
    emoji,
    theme,
    ...(description ? { description } : {}),
    pages,
    questions,
  };
}

export const emptyTeacherStore: TeacherStore = { teacher: false, books: [] };

export function loadTeacherStore(): TeacherStore {
  try {
    const raw = localStorage.getItem(TEACHER_STORAGE_KEY);
    if (!raw) return { teacher: false, books: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return { teacher: false, books: [] };
    const record = parsed as Record<string, unknown>;
    const books: MotivationBook[] = [];
    if (Array.isArray(record.books)) {
      for (const entry of record.books) {
        const book = sanitizeTeacherBook(entry);
        if (book && !books.some((saved) => saved.id === book.id))
          books.push(book);
      }
    }
    return { teacher: record.teacher === true, books };
  } catch {
    return { teacher: false, books: [] };
  }
}

export function saveTeacherStore(store: TeacherStore): void {
  try {
    localStorage.setItem(TEACHER_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: the Studio still works for this session;
    // App keeps the store in React state either way.
  }
}

// ---------------------------------------------------------------------------
// The plain-text book format a teacher types or uploads. Labels are
// case-insensitive and extra blank lines are fine:
//
//   BOOK TITLE: The Kind Little Fox
//   GRADE: 2
//   THEME: Kindness
//   EMOJI: 🦊
//   DESCRIPTION: (optional — one or two sentences about the story,
//   shown to grown-ups; without it, the theme stands in)
//
//   --- PAGE 1 ---
//   (page text)
//
//   --- QUESTION 1 ---
//   QUESTION: What did the fox do?
//   A) Ran away
//   B) Shared his lunch
//   C) Hid in a tree
//   ANSWER: B
//   WHY: Sharing lunch was the kind choice.
// ---------------------------------------------------------------------------

export function mapGradeToken(token: string): GradeId | null {
  const cleaned = token
    .trim()
    .toLowerCase()
    .replace(/^grade\s+/, "")
    .replace(/\./g, "");
  if (
    cleaned === "pre-k" ||
    cleaned === "prek" ||
    cleaned === "pre k" ||
    cleaned === "prekindergarten"
  )
    return "prek";
  if (cleaned === "k" || cleaned === "kindergarten") return "k";
  const digit = cleaned.match(/^([1-5])(?:st|nd|rd|th)?$/);
  return digit ? (digit[1] as GradeId) : null;
}

export interface ParsedTeacherBook {
  book: Omit<MotivationBook, "id"> | null;
  errors: string[];
}

const markerPattern = /^\s*-{2,}\s*(page|question)\s+(\d+)\s*(?:-{2,}\s*)?$/i;
const headerPattern = /^\s*([A-Za-z][A-Za-z' ]*?)\s*:\s*(.*)$/;
const fieldPattern = /^\s*(question|answer|why)\s*:\s*(.*)$/i;
const optionPattern = /^\s*([A-Da-d])\s*[).]\s*(.+)$/;

interface DraftSection {
  kind: "page" | "question";
  number: number;
  lines: string[];
}

interface DraftQuestion {
  prompt: string;
  options: string[];
  answerRaw: string | null;
  why: string;
}

function sectionText(section: DraftSection): string {
  return section.lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function draftQuestion(section: DraftSection): DraftQuestion {
  const draft: DraftQuestion = {
    prompt: "",
    options: [],
    answerRaw: null,
    why: "",
  };
  let field: "prompt" | "why" | number | null = null;
  const append = (text: string) => {
    if (field === "prompt")
      draft.prompt = draft.prompt ? `${draft.prompt} ${text}` : text;
    else if (field === "why")
      draft.why = draft.why ? `${draft.why} ${text}` : text;
    else if (typeof field === "number" && draft.options[field] !== undefined)
      draft.options[field] = `${draft.options[field]} ${text}`;
  };
  for (const rawLine of section.lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const labelled = line.match(fieldPattern);
    if (labelled) {
      const label = labelled[1].toLowerCase();
      const value = labelled[2].trim();
      if (label === "question") {
        draft.prompt = value;
        field = "prompt";
      } else if (label === "answer") {
        draft.answerRaw = value;
        field = null;
      } else {
        draft.why = value;
        field = "why";
      }
      continue;
    }
    const option = line.match(optionPattern);
    if (option) {
      draft.options.push(option[2].trim().replace(/\s+/g, " "));
      field = draft.options.length - 1;
      continue;
    }
    if (field === null && !draft.prompt && draft.options.length === 0) {
      // A question written without its QUESTION: label still reads as
      // the question — be forgiving and take it as the prompt.
      draft.prompt = line;
      field = "prompt";
      continue;
    }
    append(line.replace(/\s+/g, " "));
  }
  draft.prompt = draft.prompt.trim();
  draft.why = draft.why.trim();
  return draft;
}

export function parseTeacherBook(text: string): ParsedTeacherBook {
  const errors: string[] = [];
  const header = new Map<string, string>();
  const sections: DraftSection[] = [];
  let current: DraftSection | null = null;
  for (const line of text.split(/\r?\n/)) {
    const marker = line.match(markerPattern);
    if (marker) {
      current = {
        kind: marker[1].toLowerCase() as "page" | "question",
        number: Number.parseInt(marker[2], 10),
        lines: [],
      };
      sections.push(current);
      continue;
    }
    if (current) {
      current.lines.push(line);
      continue;
    }
    const labelled = line.match(headerPattern);
    if (labelled) {
      const label = labelled[1].trim().toLowerCase().replace(/\s+/g, " ");
      if (!header.has(label)) header.set(label, labelled[2].trim());
    }
  }

  const title = (header.get("book title") ?? header.get("title") ?? "").trim();
  if (!title)
    errors.push(
      "The book has no title. Add a line at the top like: BOOK TITLE: My Story.",
    );
  else if (title.length > LIMITS.title)
    errors.push(
      `The title is very long (${title.length} characters). Please shorten it to ${LIMITS.title} characters or fewer.`,
    );

  const gradeToken = (header.get("grade") ?? "").trim();
  let grade: GradeId | null = null;
  if (!gradeToken)
    errors.push(
      "The GRADE line is missing. Add a line at the top like: GRADE: 2 — it can be Pre-K, K, 1, 2, 3, 4, or 5.",
    );
  else {
    grade = mapGradeToken(gradeToken);
    if (!grade)
      errors.push(
        `The GRADE line says “${gradeToken}”, which we don't recognize. Use one of: Pre-K, K, 1, 2, 3, 4, 5.`,
      );
  }

  const theme = (header.get("theme") ?? "").trim();
  if (!theme)
    errors.push(
      "The THEME line is missing or empty. Add a line at the top like: THEME: Kindness.",
    );

  const emojiRaw = (header.get("emoji") ?? "").trim();
  // First code point is enough for a cover picture; fall back to 📖.
  const emoji = emojiRaw ? ([...emojiRaw][0] ?? "📖") : "📖";

  // Optional: one or two sentences about the story. Grown-ups browsing
  // Motivation Books see descriptions instead of the book itself, so a
  // teacher can write their own; without one, the theme stands in.
  const descriptionRaw = (header.get("description") ?? "")
    .trim()
    .replace(/\s+/g, " ");
  let description: string | undefined;
  if (descriptionRaw) {
    if (descriptionRaw.length > LIMITS.description)
      errors.push(
        `The DESCRIPTION line is very long (${descriptionRaw.length} characters). Please shorten it to ${LIMITS.description} characters or fewer — one or two sentences is plenty.`,
      );
    else description = descriptionRaw;
  }

  const pageSections = sections.filter((section) => section.kind === "page");
  const pages = pageSections.map(sectionText);
  if (pageSections.length < 3 || pageSections.length > 6)
    errors.push(
      `Page count is ${pageSections.length} — books need 3 to 6 pages.`,
    );
  if (!pageSections.every((section, index) => section.number === index + 1))
    errors.push(
      "The page markers look out of order. Label them PAGE 1, PAGE 2, PAGE 3 … in order, each on its own dashed line.",
    );
  pages.forEach((page, index) => {
    if (!page)
      errors.push(
        `Page ${index + 1} is empty. Write a little story text under its marker line.`,
      );
    else if (page.length > LIMITS.page)
      errors.push(
        `Page ${index + 1} is very long. Try splitting it into two shorter pages.`,
      );
  });

  const questionSections = sections.filter(
    (section) => section.kind === "question",
  );
  const drafts = questionSections.map(draftQuestion);
  if (questionSections.length !== QUESTIONS_PER_BOOK)
    errors.push(
      `Found ${questionSections.length} questions — books need exactly ${QUESTIONS_PER_BOOK} questions.`,
    );
  if (
    !questionSections.every((section, index) => section.number === index + 1)
  )
    errors.push(
      "The question markers look out of order. Label them QUESTION 1, QUESTION 2 … up to QUESTION 5, in order.",
    );
  const questions: MotivationQuestion[] = [];
  drafts.forEach((draft, index) => {
    const label = `Question ${index + 1}`;
    if (!draft.prompt) errors.push(`${label} is missing its QUESTION line.`);
    else if (draft.prompt.length > LIMITS.prompt)
      errors.push(`${label} is very long. Try asking it in fewer words.`);
    if (draft.options.length < 3 || draft.options.length > 4)
      errors.push(
        `${label} has ${draft.options.length} answer choices — give 3 or 4 choices, labeled A) B) C) (and D).`,
      );
    if (new Set(draft.options).size !== draft.options.length)
      errors.push(
        `${label} repeats an answer choice — make each choice different.`,
      );
    draft.options.forEach((option) => {
      if (option.length > LIMITS.option)
        errors.push(`${label} has a very long answer choice. Shorten it a little.`);
    });
    let answer = -1;
    if (draft.answerRaw === null || draft.answerRaw === "")
      errors.push(
        `${label} has no ANSWER line. Add one under its choices, like: ANSWER: B`,
      );
    else {
      const letter = draft.answerRaw.trim().toUpperCase();
      if (!/^[A-D]$/.test(letter))
        errors.push(
          `${label}'s ANSWER line says “${draft.answerRaw.trim()}”. It should hold one letter, like: ANSWER: B`,
        );
      else {
        answer = letter.charCodeAt(0) - 65;
        if (answer >= draft.options.length)
          errors.push(
            `${label}'s ANSWER is ${letter}, but its choices only go up to ${String.fromCharCode(64 + draft.options.length)}. Fix the ANSWER letter.`,
          );
      }
    }
    if (!draft.why)
      errors.push(
        `${label} is missing its WHY line. Add one short sentence that explains the answer.`,
      );
    else if (draft.why.length > LIMITS.why)
      errors.push(`${label}'s WHY line is very long. One short sentence is plenty.`);
    questions.push({
      prompt: draft.prompt,
      options: draft.options,
      answer,
      explanation: draft.why,
    });
  });

  if (errors.length || !grade) return { book: null, errors };
  return {
    book: {
      grade,
      title,
      emoji,
      theme,
      ...(description ? { description } : {}),
      pages,
      questions,
    },
    errors: [],
  };
}

// The blank skeleton, also shown inside Teacher Studio so a teacher can
// copy the shape without downloading anything.
export const TEACHER_BOOK_SKELETON = `BOOK TITLE:
GRADE:
THEME:
EMOJI:
DESCRIPTION:

--- PAGE 1 ---


--- PAGE 2 ---


--- PAGE 3 ---


--- QUESTION 1 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 2 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 3 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 4 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 5 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:
`;

// The full hand-out: plain-language instructions, the blank skeleton,
// and one complete example book ("Tilly Helps a Friend", written for
// this template). The downloadable file and
// ~/workspace/your_files/teacher-book-upload-template.txt carry this
// exact text. Keep it free of backticks and "${" sequences so it can
// live in this template literal.
export const TEACHER_BOOK_TEMPLATE = `HOW TO WRITE A MOTIVATION BOOK FOR LEARN & PLAY CHAMPION
=========================================================

Welcome, teacher! You can add your own short Motivation Book to the
app. Children read your story page by page, answer five friendly
questions, and earn points and stars - just like the built-in books.

HOW IT WORKS
1. Copy PART 1 (the blank skeleton) or PART 2 (the finished example)
   into a new plain-text file of your own.
2. Type your story right into the format. Keep every label line and
   every dashed marker line exactly as shown. Labels do not have to
   be in capital letters, and extra blank lines are fine.
3. In the app, open the Parents dashboard and turn on Teacher Studio. Paste
   your book text (or upload your .txt file) and press Check my book.
4. Fix anything the checker points out, preview your book, and save.
   It appears on the Motivation Books shelf with a From my teacher
   badge, ready for children on this device to read.

THE RULES THE CHECKER USES
- The top of the file gives the book's title, its grade, and its
  theme, each on its own labeled line. The grade accepts Pre-K, K,
  1, 2, 3, 4, or 5.
- An emoji line is optional. Leave it out and the book uses a plain
  open-book picture instead.
- A description line is optional too. It holds one or two sentences
  about what your story is about and what it teaches. Grown-ups who
  open Motivation Books see descriptions instead of the book itself,
  so this is how a parent or teacher knows what your story holds.
  Leave it out and the book's theme stands in as its description.
- A book has 3 to 6 pages. Every page starts with its own dashed
  marker line, with the page number in the middle (the first one
  looks like three dashes, the words PAGE 1, then three dashes).
- A book has exactly 5 questions, each under its own dashed marker.
  Under the marker, write the question on its labeled line, then 3
  or 4 answer choices labeled A, B, C (and D if you want), then the
  answer line holding the one correct letter, then a why line with
  one short sentence explaining the answer.
- Keep the words warm and simple for the grade you pick. A lovely
  pattern for the fifth question is a "your turn" question that asks
  the reader what they would do.

PART 1 - BLANK SKELETON (copy this, then type over the blanks)
==============================================================

BOOK TITLE:
GRADE:
THEME:
EMOJI:
DESCRIPTION:

--- PAGE 1 ---


--- PAGE 2 ---


--- PAGE 3 ---


--- QUESTION 1 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 2 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 3 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 4 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

--- QUESTION 5 ---
QUESTION:
A)
B)
C)
ANSWER:
WHY:

PART 2 - A FINISHED EXAMPLE (a complete book, ready to upload)
==============================================================

BOOK TITLE: Tilly Helps a Friend
GRADE: 1
THEME: Helping
EMOJI: 🐢
DESCRIPTION: Tilly the turtle meets a baby duck who has lost its mom, and instead of hurrying past, she stays and helps look. A story about helping a friend who feels sad.

--- PAGE 1 ---
Tilly the turtle was walking to the pond. The sun was warm, and the grass was soft under her feet.

--- PAGE 2 ---
On the path, Tilly met a baby duck. The duck was crying. "I lost my mom," said the duck.

--- PAGE 3 ---
Tilly did not hurry past. She sat with the duck, and they looked together - by the pond, by the tall flowers. Then, "Quack!" Mom duck came running, and the baby duck was safe. Tilly smiled all the way home.

--- QUESTION 1 ---
QUESTION: Where was Tilly walking?
A) To school
B) To the pond
C) To the store
ANSWER: B
WHY: The story says Tilly was walking to the pond.

--- QUESTION 2 ---
QUESTION: Who did Tilly meet on the path?
A) A baby duck
B) A big dog
C) A frog
ANSWER: A
WHY: Tilly met a baby duck on the path.

--- QUESTION 3 ---
QUESTION: Why was the baby duck crying?
A) It was hungry
B) It lost its mom
C) It was sleepy
ANSWER: B
WHY: The duck said, "I lost my mom."

--- QUESTION 4 ---
QUESTION: What did Tilly do to help?
A) She went for a swim
B) She ran away fast
C) She sat with the duck and helped it look
ANSWER: C
WHY: Tilly stayed with the duck, and they looked for its mom together.

--- QUESTION 5 ---
QUESTION: Your turn: a friend feels sad at school. What kind thing can you do?
A) Sit with your friend and ask what is wrong
B) Walk away
C) Laugh
ANSWER: A
WHY: Sitting with a sad friend and listening is a kind way to help.
`;
