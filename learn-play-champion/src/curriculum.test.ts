import { describe, expect, it } from "vitest";
import { getLearningContent } from "./content";
import {
  curriculumLessonIds,
  gradeFiles,
  gradeIds,
  parseGradeContent,
  type GradeId,
} from "./content-schema";
import { activities, badges, completeRound, initialProgress, parseProgress, type Progress } from "./game";

const { grades } = getLearningContent();
const rawPacks = import.meta.glob<string>("./content/grades/*.txt", {
  eager: true, query: "?raw", import: "default",
});
const source = (grade: GradeId) => JSON.parse(rawPacks[`./content/${gradeFiles[grade]}`]);
const numeric = (answer: string) => {
  const [a, b = "1"] = answer.split(" ")[0].split("/");
  return Number(a) / Number(b);
};

describe("U.S. standards-informed expansion", () => {
  it("offers every activity exactly once with seven English and nine Math paths", () => {
    expect(new Set(activities.map((activity) => activity.id)).size).toBe(16);
    expect(activities.filter((activity) => activity.subject === "english")).toHaveLength(7);
    expect(activities.filter((activity) => activity.subject === "math")).toHaveLength(9);
  });
  for (const grade of gradeIds) {
    it(`${grade} provides six guides with same-grade references and adult practice`, () => {
      for (const id of curriculumLessonIds) {
        const guide = grades[grade].lessons[id].guide!;
        expect(guide.learn.length).toBeGreaterThan(80);
        expect(guide.together.length).toBeGreaterThan(80);
        const g = grade === "k" ? "K" : grade;
        for (const code of guide.standards) {
          expect(code.split(".").slice(0, 2)).toContain(g);
        }
      }
      if (grade === "prek")
        expect(grades[grade].lessons.writing.guide!.standards).toEqual([]);
      else expect(grades[grade].lessons.writing.guide!.standards).toContain(
          `SL.${grade === "k" ? "K" : grade}.1`,
        );
    });
    it(`${grade} new activities persist scores without replacing earlier activity scores`, () => {
      let progress: Progress = {
        ...initialProgress,
        gradeBestRounds: { "1:reading": 4 },
      };
      for (const id of curriculumLessonIds) {
        progress = completeRound(
          progress, id,
          Array.from({ length: 5 }, () => ({ correct: true, speed: false })),
          new Date(2026, 9, 29), grade,
        ).progress;
        expect(progress.gradeBestRounds?.[`${grade}:${id}`]).toBe(5);
      }
      expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
      expect(progress.gradeBestRounds?.["1:reading"]).toBe(4);
      expect(progress.rounds).toBe(6);
      expect(progress.points).toBe(700);
    });
  }
  it("preserves the original explorer badge for existing learners", () => {
    const saved = {
      ...initialProgress,
      bestRounds: {
        sight: 0, vocabulary: 0, spelling: 0, reading: 0, sentence: 0,
        arithmetic: 0, multiply: 0, patterns: 0, problems: 0, geometry: 0,
      },
    };
    expect(badges.find((badge) => badge.name === "Curious Explorer")!.earned(saved)).toBe(true);
  });
  it("rejects missing guidance, wrong-grade codes, duplicate codes and missing nonfiction", () => {
    const change = (mutate: (pack: ReturnType<typeof source>) => void) => {
      const pack = source("3");
      mutate(pack);
      return () => parseGradeContent(JSON.stringify(pack), "3");
    };
    expect(change((pack) => delete pack.lessons.writing.guide)).toThrow("writing.guide");
    expect(change((pack) => pack.lessons.place.guide.standards = ["4.NBT.1"])).toThrow("wrong-grade");
    expect(change((pack) => pack.lessons.place.guide.standards = ["not a code"])).toThrow("invalid");
    expect(change((pack) => pack.lessons.place.guide.standards = [])).toThrow("at least one");
    expect(change((pack) => pack.lessons.place.guide.standards = ["3.NBT.1", "3.NBT.1"])).toThrow("duplicate");
    expect(change((pack) => pack.lessons.place.guide.learn = "")).toThrow("guide.learn");
    expect(change((pack) => delete pack.lessons.informational.passage)).toThrow("informational.passage");
  });
  it("rejects malformed or missing graphs instead of drawing misleading data", () => {
    const change = (mutate: (pack: ReturnType<typeof source>) => void) => {
      const pack = source("5");
      mutate(pack);
      return () => parseGradeContent(JSON.stringify(pack), "5");
    };
    expect(change((p) => delete p.lessons.data.chart)).toThrow("data.chart is required");
    expect(change((p) => p.lessons.data.chart.type = "pie")).toThrow("bar or line");
    expect(change((p) => p.lessons.data.chart.counts = [1])).toThrow("match labels");
    expect(change((p) => p.lessons.data.chart.counts[0] = -1)).toThrow("integers");
    expect(change((p) => p.lessons.data.chart.counts[0] = 0.5)).toThrow("integers");
    expect(change((p) => p.lessons.data.chart.scale = 2)).toThrow("line plots use 1");
    expect(change((p) => p.lessons.data.chart.labels[1] = p.lessons.data.chart.labels[0])).toThrow("duplicate");
    expect(change((p) => p.lessons.data.chart.labels[1] = "not a number")).toThrow("nonnegative numbers");
    expect(change((p) => p.lessons.data.chart.labels[1] = "1/0")).toThrow("nonnegative numbers");
    expect(change((p) => p.lessons.data.chart.labels[1] = "1/16")).toThrow("equal steps");
    expect(change((p) => p.lessons.data.chart.labels[3] = "2")).toThrow("equal steps");
    expect(change((p) => p.lessons.data.chart.labels = [
      "0", "0.0000000001", "0.0000000003", "0.0000000004",
    ])).toThrow("equal steps");
    expect(change((p) => p.lessons.place.chart = p.lessons.data.chart)).toThrow("charts belong in data");
  });
  it("has reviewed answers for the added measurement examples", () => {
    const expected: Record<GradeId, string[]> = {
      prek: ["red ribbon", "small", "long", "match", "blue ribbon"],
      k: ["red ribbon", "weight", "equal", "the book", "longer and shorter"],
      "1": ["5 blocks", "Use same-size units with no gaps.", "3, 5, 7", "2:30", "4:00"],
      "2": ["a ruler", "short blocks", "18 cm", `${2 * 10 + 3} cents`, `${25 + 10 + 5} cents`],
      "3": [`${15 + 10} minutes`, "10:15", `${3 + 4} liters`, `${800 - 250} grams`, "kilograms"],
      "4": [`${3 * 100} cm`, `${2 * 100 - 75} cm`, `${6 * 4} square cm`, `${2 * (6 + 4)} cm`, `${4 * 12} inches`],
      "5": ["2,500 mL", String(300 / 75), `${4 * 3 * 2} cubic cm`, `${12 * 5} cubic inches`, `${18 + 12} cubic feet`],
    };
    for (const grade of gradeIds)
      expect(grades[grade].lessons.measurement.questions.map((q) => q.answer)).toEqual(expected[grade]);
  });
  it("keeps introductory parts age-appropriate and verifies later fraction computations", () => {
    expect(grades.k.lessons.fractions.guide!.standards).toEqual(["K.OA.3", "K.OA.4"]);
    expect(grades.k.lessons.fractions.questions.map((q) => q.answer)).toEqual([
      String(5 - 2), "1 and 4", String(10 - 6), String(10 - 9), String(8 - 4),
    ]);
    expect(grades["1"].lessons.fractions.guide!.standards).toEqual(["1.G.3"]);
    expect(grades["2"].lessons.fractions.guide!.standards).toEqual(["2.G.3"]);
    const computed = [1 / 2 + 1 / 3, 1 - 3 / 8, (2 / 3) * (3 / 4), 2 / (1 / 4), (1 / 3) / 2];
    grades["5"].lessons.fractions.questions.forEach((question, index) =>
      expect(numeric(question.answer)).toBeCloseTo(computed[index], 10),
    );
  });
  it("derives scaled graph and line-plot answers from the actual plotted data", () => {
    const third = grades["3"].lessons.data;
    const counts = third.questions[0].chart!.counts.map((n) => n * third.questions[0].chart!.scale);
    expect(third.questions.map((q) => numeric(q.answer))).toEqual([
      counts[1], counts[2] - counts[0], counts.reduce((a, b) => a + b, 0),
      counts[0] + counts[2] - counts[1], third.questions[0].chart!.scale,
    ]);
    for (const grade of ["4", "5"] as const) {
      const lesson = grades[grade].lessons.data;
      const chart = lesson.questions[0].chart!;
      const values = chart.labels.map(numeric);
      const totalCount = chart.counts.reduce((a, b) => a + b, 0);
      const totalAmount = values.reduce((total, value, i) => total + value * chart.counts[i], 0);
      const used = values.filter((_, i) => chart.counts[i] > 0);
      const expected = grade === "4"
        ? [chart.counts[2], totalCount, Math.max(...used) - Math.min(...used), values[0] * chart.counts[0], chart.counts[1] + chart.counts[2]]
        : [chart.counts[1], totalAmount, totalAmount / totalCount, Math.max(...used) - Math.min(...used), values[3] * chart.counts[3]];
      lesson.questions.forEach((q, i) => expect(numeric(q.answer)).toBeCloseTo(expected[i], 10));
    }
  });
});
