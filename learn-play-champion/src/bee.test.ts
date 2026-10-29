import { describe, expect, it } from "vitest";
import { gradeIds, gradeFiles, parseGradeContent } from "./content-schema";
import { getLearningContent } from "./content";
import { completeRound, initialProgress, parseProgress, type Attempt } from "./game";

const date = new Date(2026, 9, 29);
const attempts = (correct: number): Attempt[] => Array.from(
  { length: 5 }, (_, i) => ({ correct: i < correct, speed: true }),
);
describe("solo spelling bee scoring", () => {
  for (const grade of gradeIds) {
    it(`saves ${grade} independently without replacing normal spelling or other grades`, () => {
      const regular = completeRound(initialProgress, "spelling", attempts(4), date, grade).progress;
      const first = completeRound(regular, "spelling", attempts(3), date, grade, true);
      expect(first.result.championship).toBe(true);
      expect(first.result.speedPoints).toBe(0);
      expect(first.result.points).toBe(30);
      expect(first.progress.beeBestRounds?.[grade]).toBe(3);
      expect(first.progress.gradeBestRounds?.[`${grade}:spelling`]).toBe(4);
      expect(first.progress.mastery).toEqual(regular.mastery);
      expect(first.progress.bestRounds).toEqual(regular.bestRounds);
      const nextGrade = grade === "5" ? "prek" : "5";
      const perfect = completeRound(first.progress, "spelling", attempts(5), date, nextGrade, true);
      expect(perfect.result.points).toBe(100);
      expect(perfect.progress.beeBestRounds).toEqual({ [grade]: 3, [nextGrade]: 5 });
      expect(parseProgress(JSON.stringify(perfect.progress))).toEqual(perfect.progress);
      const lower = completeRound(perfect.progress, "spelling", attempts(0), date, grade, true);
      expect(lower.progress.beeBestRounds?.[grade]).toBe(3);
      expect(lower.progress.rounds).toBe(4);
    });
  }
  it("uses the same daily completion reward and records a zero-score attempt", () => {
    const first = completeRound(initialProgress, "spelling", attempts(0), date, "prek", true);
    expect(first.progress.beeBestRounds).toEqual({ prek: 0 });
    expect(first.result.points).toBe(100);
    expect(first.result.dailyBonus).toBe(true);
    const next = completeRound(first.progress, "sight", attempts(5), date, "1");
    expect(next.result.dailyBonus).toBe(false);
    expect(next.progress.beeBestRounds).toEqual({ prek: 0 });
  });
  it("rejects malformed bee scores but accepts existing pre-bee saves", () => {
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
    for (const beeBestRounds of [null, [], { "6": 3 }, { "1": 6 }, { prek: -1 }, { "2": 1.5 }, { k: "3" }]) {
      expect(() => parseProgress(JSON.stringify({ ...initialProgress, beeBestRounds }))).toThrow();
    }
    expect(() => completeRound(initialProgress, "reading", attempts(5), date, "1", true)).toThrow("spelling activity");
    expect(() => completeRound(initialProgress, "spelling", attempts(5), date, undefined, true)).toThrow("selected grade");
  });
});
describe("Pre-K content boundaries", () => {
  it("does not claim Common Core Pre-K codes and validates its own source", () => {
    const raw = import.meta.glob<string>("./content/grades/pre-k.txt", {
      eager: true, query: "?raw", import: "default",
    })["./content/grades/pre-k.txt"];
    expect(parseGradeContent(raw, "prek")).toEqual(getLearningContent().grades.prek);
    const pack = JSON.parse(raw);
    pack.lessons.writing.guide.standards = ["W.K.1"];
    expect(() => parseGradeContent(JSON.stringify(pack), "prek")).toThrow("Common Core starts at Kindergarten");
    expect(gradeFiles.prek).toBe("grades/pre-k.txt");
  });
  it("uses single-letter copying and small-number exploration, not higher-grade operations", () => {
    const pack = getLearningContent().grades.prek;
    expect(pack.lessons.spelling.questions.every((q) => /^[a-z]$/.test(q.answer))).toBe(true);
    for (const id of ["arithmetic", "place", "fractions", "multiply", "problems"] as const) {
      for (const question of pack.lessons[id].questions) {
        expect(question.prompt).not.toMatch(/[×÷]|\d+\/\d+/);
        expect(Number(question.answer)).toBeGreaterThanOrEqual(1);
        expect(Number(question.answer)).toBeLessThanOrEqual(5);
      }
    }
  });
});
