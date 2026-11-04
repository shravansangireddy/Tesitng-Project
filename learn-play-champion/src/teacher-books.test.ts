// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  TEACHER_BOOK_TEMPLATE,
  TEACHER_STORAGE_KEY,
  isTeacherBookId,
  loadTeacherStore,
  mapGradeToken,
  newTeacherBookId,
  parseTeacherBook,
  saveTeacherStore,
  type TeacherStore,
} from "./teacher-books";
import { VALID_BOOK_TEXT } from "./teacher-books-fixture";
import {
  completeMotivationBook,
  initialProgress,
  parseProgress,
} from "./game";
describe("teacher book parser", () => {
  it("parses a valid file into the MotivationBook shape", () => {
    const { book, errors } = parseTeacherBook(VALID_BOOK_TEXT);
    expect(errors).toEqual([]);
    expect(book).not.toBeNull();
    expect(book?.title).toBe("The Kind Little Fox");
    expect(book?.grade).toBe("2");
    expect(book?.theme).toBe("Kindness");
    expect(book?.emoji).toBe("🦊");
    expect(book?.pages).toHaveLength(3);
    expect(book?.pages[0]).toContain("warm bread");
    expect(book?.questions).toHaveLength(5);
    expect(book?.questions[0]).toEqual({
      prompt: "What did Fox smell?",
      options: ["Rain", "Warm bread", "Flowers"],
      answer: 1,
      explanation: "The story says Fox smelled warm bread.",
    });
    expect(book?.questions[3].options).toHaveLength(4);
    expect(book?.questions.map((question) => question.answer)).toEqual([
      1, 2, 0, 1, 2,
    ]);
  });

  it("defaults the emoji and tolerates lowercase labels and blank lines", () => {
    const messy = VALID_BOOK_TEXT.replace("EMOJI: 🦊\n", "")
      .replace("BOOK TITLE:", "book title:")
      .replace("GRADE:", "grade:")
      .split("ANSWER:").join("answer:")
      .split("WHY:").join("why:")
      .replace("--- PAGE 2 ---", "\n\n--- page 2 ---\n");
    const { book, errors } = parseTeacherBook(messy);
    expect(errors).toEqual([]);
    expect(book?.emoji).toBe("📖");
    expect(book?.title).toBe("The Kind Little Fox");
  });

  it("maps every grade token to the catalog GradeId", () => {
    expect(mapGradeToken("Pre-K")).toBe("prek");
    expect(mapGradeToken("prek")).toBe("prek");
    expect(mapGradeToken("Pre K")).toBe("prek");
    expect(mapGradeToken("Kindergarten")).toBe("k");
    expect(mapGradeToken("K")).toBe("k");
    expect(mapGradeToken("1")).toBe("1");
    expect(mapGradeToken("Grade 3")).toBe("3");
    expect(mapGradeToken("4th")).toBe("4");
    expect(mapGradeToken("5")).toBe("5");
    expect(mapGradeToken("9")).toBeNull();
    expect(mapGradeToken("middle school")).toBeNull();
    for (const [token, grade] of [
      ["Pre-K", "prek"],
      ["K", "k"],
      ["5", "5"],
    ] as const) {
      const { book } = parseTeacherBook(
        VALID_BOOK_TEXT.replace("GRADE: 2", `GRADE: ${token}`),
      );
      expect(book?.grade).toBe(grade);
    }
  });

  it("reports the exact friendly error for each broken rule", () => {
    const cases: Array<[string, string]> = [
      [
        VALID_BOOK_TEXT.replace("BOOK TITLE: The Kind Little Fox", "BOOK TITLE:"),
        "The book has no title.",
      ],
      [
        VALID_BOOK_TEXT.replace("GRADE: 2", "GRADE: 9"),
        "which we don't recognize",
      ],
      [
        VALID_BOOK_TEXT.replace("GRADE: 2\n", ""),
        "The GRADE line is missing.",
      ],
      [
        VALID_BOOK_TEXT.replace("THEME: Kindness", "THEME:"),
        "The THEME line is missing or empty.",
      ],
      [
        VALID_BOOK_TEXT.replace(
          /--- PAGE 3 ---\nFox shared[\s\S]*?smiled\.\n/,
          "",
        ),
        "Page count is 2 — books need 3 to 6 pages.",
      ],
      [
        VALID_BOOK_TEXT.replace(/--- QUESTION 5 ---[\s\S]*$/, ""),
        "Found 4 questions — books need exactly 5 questions.",
      ],
      [
        VALID_BOOK_TEXT.replace("ANSWER: A\nWHY: Fox shared", "WHY: Fox shared"),
        "Question 3 has no ANSWER line.",
      ],
      [
        VALID_BOOK_TEXT.replace("ANSWER: B\nWHY: The story says", "ANSWER: D\nWHY: The story says"),
        "Question 1's ANSWER is D, but its choices only go up to C.",
      ],
      [
        VALID_BOOK_TEXT.replace("WHY: Mole dropped his lunch in the mud.\n", ""),
        "Question 2 is missing its WHY line.",
      ],
      [
        VALID_BOOK_TEXT.replace("C) Flowers\n", ""),
        "Question 1 has 2 answer choices",
      ],
      [
        VALID_BOOK_TEXT.replace("C) Flowers", "C) Warm bread"),
        "Question 1 repeats an answer choice",
      ],
    ];
    for (const [text, expected] of cases) {
      const { book, errors } = parseTeacherBook(text);
      expect(book).toBeNull();
      expect(errors.join("\n")).toContain(expected);
    }
  });

  it("rejects the untouched skeleton with friendly errors", () => {
    const { book, errors } = parseTeacherBook(
      "BOOK TITLE:\nGRADE:\nTHEME:\n\n--- PAGE 1 ---\n\n--- QUESTION 1 ---\nQUESTION:\nA)\nB)\nC)\nANSWER:\nWHY:\n",
    );
    expect(book).toBeNull();
    expect(errors.length).toBeGreaterThan(3);
    expect(errors.join("\n")).toContain("no title");
  });

  it("parses the filled-in example inside the shipped template", () => {
    const marker = "BOOK TITLE: Tilly Helps a Friend";
    const start = TEACHER_BOOK_TEMPLATE.indexOf(marker);
    expect(start).toBeGreaterThan(0);
    const exampleText = TEACHER_BOOK_TEMPLATE.slice(
      TEACHER_BOOK_TEMPLATE.lastIndexOf("\n", start) + 1,
    );
    const { book, errors } = parseTeacherBook(exampleText);
    expect(errors).toEqual([]);
    expect(book?.title).toBe("Tilly Helps a Friend");
    expect(book?.grade).toBe("1");
    expect(book?.pages).toHaveLength(3);
    expect(book?.questions).toHaveLength(5);
  });
});

describe("teacher store", () => {
  it("recognizes uploaded book ids and generates fresh ones", () => {
    expect(isTeacherBookId("u-m4abc-xy12zz")).toBe(true);
    expect(isTeacherBookId(newTeacherBookId())).toBe(true);
    expect(isTeacherBookId("prek-seed")).toBe(false);
    expect(isTeacherBookId("u-")).toBe(false);
    expect(isTeacherBookId("")).toBe(false);
  });

  it("round-trips through localStorage and drops malformed books", () => {
    const { book } = parseTeacherBook(VALID_BOOK_TEXT);
    const saved = { ...book!, id: newTeacherBookId() };
    const store: TeacherStore = {
      teacher: true,
      books: [
        saved,
        // A stored entry with a built-in style id must not survive.
        { ...saved, id: "prek-seed" },
        // Nor one with a broken question set.
        { ...saved, id: newTeacherBookId(), questions: [] },
      ],
    };
    saveTeacherStore(store);
    const loaded = loadTeacherStore();
    expect(loaded.teacher).toBe(true);
    expect(loaded.books).toEqual([saved]);
    expect(localStorage.getItem(TEACHER_STORAGE_KEY)).toContain(saved.id);
    localStorage.removeItem(TEACHER_STORAGE_KEY);
    expect(loadTeacherStore()).toEqual({ teacher: false, books: [] });
  });
});

describe("teacher book completion", () => {
  it("pays points and records completion for an uploaded id", () => {
    const id = newTeacherBookId();
    const before = initialProgress;
    const after = completeMotivationBook(before, { bookId: id, correct: 5 });
    expect(after.motivationBooks?.completed).toEqual([id]);
    expect(after.motivationBooks?.bestScores[id]).toBe(5);
    expect(after.points).toBe(before.points + 50);
    // The saved progress keeps the uploaded completion on reload…
    const reloaded = parseProgress(JSON.stringify(after));
    expect(reloaded.motivationBooks?.completed).toEqual([id]);
    // …while an id that is neither built-in nor teacher-shaped is dropped.
    const polluted = parseProgress(
      JSON.stringify({
        ...after,
        motivationBooks: { completed: ["not-a-real-book"], bestScores: {} },
      }),
    );
    expect(polluted.motivationBooks?.completed).toEqual([]);
  });

  it("still throws for an unknown book id", () => {
    expect(() =>
      completeMotivationBook(initialProgress, {
        bookId: "made-up-book",
        correct: 3,
      }),
    ).toThrow("Unknown motivation book.");
  });
});
