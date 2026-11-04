import { describe, expect, it } from "vitest";
import { gradeIds } from "./content-schema";
import {
  addProfile,
  completeMotivationBook,
  initialProgress,
  parseProgress,
  type Progress,
} from "./game";
import {
  POINTS_PER_CORRECT,
  QUESTIONS_PER_BOOK,
  bookById,
  booksForGrade,
  motivationBookIds,
  motivationBooks,
  starsForScore,
} from "./motivation-books";

describe("motivation book catalog", () => {
  it("has exactly six original books for every level, forty-two in all", () => {
    expect(motivationBooks).toHaveLength(42);
    expect(new Set(motivationBookIds).size).toBe(42);
    expect(new Set(motivationBooks.map((book) => book.title)).size).toBe(42);
    for (const grade of gradeIds) {
      expect(booksForGrade(grade)).toHaveLength(6);
    }
    expect(bookById("prek-seed").title).toBe("Nia and the Tiny Seed");
    expect(bookById("p2-g5-choice").title).toBe("Julian's Own Choice");
    expect(bookById("p3-g5-mentor").title).toBe("Maya the Reading Buddy");
    expect(() => bookById("the-very-hungry-caterpillar")).toThrow();
  });
  it("gives every book a title, emoji, theme, and 3-6 pages of story", () => {
    for (const book of motivationBooks) {
      expect(book.title.trim().length).toBeGreaterThan(0);
      expect(book.emoji.trim().length).toBeGreaterThan(0);
      expect(book.theme.trim().length).toBeGreaterThan(0);
      expect(book.pages.length).toBeGreaterThanOrEqual(3);
      expect(book.pages.length).toBeLessThanOrEqual(6);
      for (const page of book.pages) {
        expect(page.trim().length).toBeGreaterThan(0);
      }
    }
  });
  it("gives every book exactly five questions with one correct answer each", () => {
    expect(QUESTIONS_PER_BOOK).toBe(5);
    for (const book of motivationBooks) {
      expect(book.questions).toHaveLength(QUESTIONS_PER_BOOK);
      for (const question of book.questions) {
        expect(question.prompt.trim().length).toBeGreaterThan(0);
        expect(question.options.length).toBeGreaterThanOrEqual(3);
        expect(question.options.length).toBeLessThanOrEqual(4);
        expect(new Set(question.options).size).toBe(question.options.length);
        for (const option of question.options) {
          expect(option.trim().length).toBeGreaterThan(0);
        }
        // Exactly one correct answer: a single in-range answer index.
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(question.options.length);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });
  it("keeps the earliest books shorter and simpler than the oldest ones", () => {
    const words = (book: (typeof motivationBooks)[number]) =>
      book.pages.join(" ").split(/\s+/).length;
    for (const book of booksForGrade("prek")) expect(words(book)).toBeLessThan(60);
    for (const book of booksForGrade("5")) expect(words(book)).toBeGreaterThan(150);
  });
  it("maps finishing scores to shelf stars", () => {
    expect(starsForScore(5)).toBe(3);
    expect(starsForScore(4)).toBe(2);
    expect(starsForScore(3)).toBe(2);
    expect(starsForScore(2)).toBe(1);
    expect(starsForScore(1)).toBe(1);
    expect(starsForScore(0)).toBe(0);
  });
});

describe("motivation book progress", () => {
  it("pays +10 per correct answer and records the finished book", () => {
    const next = completeMotivationBook(initialProgress, {
      bookId: "prek-seed",
      correct: 4,
    });
    expect(POINTS_PER_CORRECT).toBe(10);
    expect(next.points).toBe(40);
    expect(next.motivationBooks?.completed).toEqual(["prek-seed"]);
    expect(next.motivationBooks?.bestScores).toEqual({ "prek-seed": 4 });
    expect(next.rounds).toBe(initialProgress.rounds);
    expect(next.answered).toBe(initialProgress.answered);
    expect(next.correct).toBe(initialProgress.correct);
  });
  it("keeps the best score, lists each book once, and pays on a re-read", () => {
    const first = completeMotivationBook(initialProgress, {
      bookId: "g3-hill",
      correct: 5,
    });
    const second = completeMotivationBook(first, {
      bookId: "g3-hill",
      correct: 2,
    });
    expect(second.motivationBooks?.completed).toEqual(["g3-hill"]);
    expect(second.motivationBooks?.bestScores).toEqual({ "g3-hill": 5 });
    expect(second.points).toBe(50 + 20);
  });
  it("rejects unknown books and out-of-range scores", () => {
    expect(() =>
      completeMotivationBook(initialProgress, { bookId: "nope", correct: 3 }),
    ).toThrow();
    expect(() =>
      completeMotivationBook(initialProgress, { bookId: "prek-seed", correct: 6 }),
    ).toThrow();
    expect(() =>
      completeMotivationBook(initialProgress, { bookId: "prek-seed", correct: -1 }),
    ).toThrow();
    expect(() =>
      completeMotivationBook(initialProgress, { bookId: "prek-seed", correct: 2.5 }),
    ).toThrow();
  });
  it("round-trips through save and load, including inside profile states", () => {
    const played = completeMotivationBook(initialProgress, {
      bookId: "k-tower",
      correct: 3,
    });
    expect(parseProgress(JSON.stringify(played))).toEqual(played);
    const withProfiles = addProfile(played, "kid-1", "Kid One", "2");
    const switched = parseProgress(JSON.stringify(withProfiles));
    expect(switched.motivationBooks).toEqual(played.motivationBooks);
  });
  it("parses old saves that predate Motivation Books", () => {
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
    const legacy = { ...initialProgress, points: 50 };
    expect(parseProgress(JSON.stringify(legacy)).motivationBooks).toBeUndefined();
  });
  it("falls back to defaults for junk motivation book values", () => {
    const junkValues: unknown[] = ["nope", 42, [], null];
    for (const motivationBooks of junkValues) {
      const parsed = parseProgress(
        JSON.stringify({ ...initialProgress, motivationBooks }),
      );
      expect(parsed.motivationBooks).toBeUndefined();
    }
    const mixed = parseProgress(JSON.stringify({
      ...initialProgress,
      motivationBooks: {
        completed: ["prek-seed", "prek-seed", "not-a-book", 7, "g5-courage"],
        bestScores: { "prek-seed": 4, "g5-courage": 9, "k-tower": -1, "g2-mistake": 3, nope: 2 },
      },
    }));
    expect(mixed.motivationBooks).toEqual({
      completed: ["prek-seed", "g5-courage"],
      bestScores: { "prek-seed": 4, "g2-mistake": 3 },
    });
    const reparsed: Progress = parseProgress(JSON.stringify(mixed));
    expect(reparsed).toEqual(mixed);
  });
});
