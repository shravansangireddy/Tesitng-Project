import { describe, expect, it } from "vitest";
import { getLearningContent } from "./content";
import {
  gradeFiles,
  gradeIds,
  lessonIds,
  curriculumLessonIds,
  parseGradeContent,
  type GradeId,
} from "./content-schema";
import {
  completeRound,
  initialProgress,
  parseProgress,
  type Attempt,
} from "./game";
import { makeRound } from "./questions";

const content = getLearningContent();
describe("saved grade preference", () => {
  for (const selectedGrade of gradeIds) it(`accepts ${selectedGrade} and preserves legacy saves`, () => {
    expect(parseProgress(JSON.stringify({ ...initialProgress, selectedGrade })).selectedGrade).toBe(selectedGrade);
    expect(parseProgress(JSON.stringify(initialProgress)).selectedGrade).toBeUndefined();
  });
  for (const selectedGrade of [null, 3, "", "6", "pre-k", {}, []]) it(`rejects invalid grade ${JSON.stringify(selectedGrade)}`, () => {
    expect(() => parseProgress(JSON.stringify({ ...initialProgress, selectedGrade }))).toThrow();
  });
});
const rawPacks = import.meta.glob<string>("./content/grades/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});
const raw = (grade: GradeId) => rawPacks[`./content/${gradeFiles[grade]}`];
const perfect: Attempt[] = Array.from({ length: 5 }, () => ({
  correct: true,
  speed: false,
}));

describe("original Pre-K through Grade 5 library", () => {
  it("contains seven grades, 112 activities, 560 questions, seven stories and seven nonfiction texts", () => {
    expect(Object.keys(content.grades).sort()).toEqual([...gradeIds].sort());
    const lessons = Object.values(content.grades).flatMap((pack) =>
      Object.values(pack.lessons),
    );
    expect(lessons).toHaveLength(112);
    expect(lessons.flatMap((lesson) => lesson.questions)).toHaveLength(560);
    const stories = gradeIds.map(
      (grade) => content.grades[grade].lessons.reading.questions[0].passage,
    );
    expect(new Set(stories).size).toBe(7);
    expect(stories.every((story) => !!story && story.length > 70)).toBe(true);
    const nonfiction = gradeIds.map(
      (grade) => content.grades[grade].lessons.informational.questions[0].passage,
    );
    expect(new Set([...stories, ...nonfiction]).size).toBe(14);
    expect(nonfiction.every((passage) => !!passage && passage.length > 70)).toBe(true);
  });
  for (const grade of gradeIds) {
    it(`validates the actual ${gradeFiles[grade]} source file`, () => {
      expect(parseGradeContent(raw(grade), grade)).toEqual(
        content.grades[grade],
      );
    });
    for (const activity of lessonIds) {
      it(`${grade}/${activity} produces five fully answerable questions without mutating content`, () => {
        const lesson = content.grades[grade].lessons[activity];
        const before = JSON.stringify(lesson);
        const round = makeRound(activity, () => 0.4, grade);
        expect(round).toHaveLength(5);
        expect(new Set(round.map((q) => q.prompt)).size).toBe(5);
        for (const [index, question] of round.entries()) {
          expect(question.prompt).toBe(lesson.questions[index].prompt);
          expect(question.answer).toBe(lesson.questions[index].answer);
          expect(question.hint.trim().length).toBeGreaterThan(0);
          expect(question.explanation.trim().length).toBeGreaterThan(0);
          if (activity === "spelling") expect(question.options).toBeUndefined();
          else {
            expect(question.options).toContain(question.answer);
            expect(new Set(question.options).size).toBe(
              question.options!.length,
            );
          }
          if (activity === "reading" || activity === "informational")
            expect(question.passage).toBe(lesson.questions[0].passage);
          expect(question.prompt).not.toMatch(/\{[^}]+\}/);
        }
        expect(JSON.stringify(lesson)).toBe(before);
      });
      it("requires a selected grade for added curriculum activities", () => {
        for (const id of curriculumLessonIds)
          expect(() => makeRound(id)).toThrow("Choose a grade");
      });
    }
  }
  it("does not give kindergarten multiplication symbols or Grade 5 texts", () => {
    const earlyGroups = makeRound("multiply", () => 0.4, "k");
    expect(earlyGroups.every((q) => !/[×÷]/.test(q.prompt))).toBe(true);
    expect(
      content.grades.k.lessons.reading.questions[0].passage!.length,
    ).toBeLessThan(
      content.grades["5"].lessons.reading.questions[0].passage!.length,
    );
    expect(content.grades["5"].lessons.patterns.skill).toContain(
      "Unlike denominators",
    );
  });
  it("has independently checked arithmetic answers for every grade", () => {
    const answers: Record<GradeId, string[]> = {
      prek: ["1", "2", "3", "4", "5"],
      k: ["3", "3", "3", "5", "3"],
      "1": ["13", "8", "14", "3", "8"],
      "2": ["42", "35", "76", "43", "22"],
      "3": ["624", "244", "400", "425", "36"],
      "4": ["6,243", "4,325", "384", "312", "600"],
      "5": ["6.35", "4.62", "0.07", "6.49", "6.5"],
    };
    for (const grade of gradeIds) {
      expect(
        makeRound("arithmetic", () => 0.5, grade).map((q) => q.answer),
      ).toEqual(answers[grade]);
    }
  });
  it("rejects a pack that is missing a lesson, has the wrong grade, or omits its story", () => {
    const pack = JSON.parse(raw("5"));
    delete pack.lessons.multiply;
    expect(() => parseGradeContent(JSON.stringify(pack), "5")).toThrow(
      "multiply must be an object",
    );
    expect(() => parseGradeContent(raw("5"), "k")).toThrow('grade must be "k"');
    const noStory = JSON.parse(raw("1"));
    delete noStory.lessons.reading.passage;
    expect(() => parseGradeContent(JSON.stringify(noStory), "1")).toThrow(
      "reading.passage",
    );
  });
  it("rejects incomplete rows, invalid answers, duplicate choices and empty learning text", () => {
    const mutate = (change: (row: unknown[]) => void) => {
      const pack = JSON.parse(raw("4"));
      change(pack.lessons.arithmetic.questions[0]);
      return () => parseGradeContent(JSON.stringify(pack), "4");
    };
    expect(mutate((row) => row.pop())).toThrow("must be [prompt, answer");
    expect(
      mutate((row) => {
        row[1] = "incorrect choice";
      }),
    ).toThrow("must exactly match");
    expect(
      mutate((row) => {
        row[2] = ["A", "A"];
      }),
    ).toThrow("duplicate");
    expect(
      mutate((row) => {
        row[3] = "";
      }),
    ).toThrow("hint");
    const pack = JSON.parse(raw("k"));
    pack.lessons.spelling.questions[0][2] = ["cat", "dog"];
    expect(() => parseGradeContent(JSON.stringify(pack), "k")).toThrow(
      "spelling choices must be null",
    );
  });
  it("allows case-only sentence choices because capitalization is part of the task", () => {
    const choices = content.grades["1"].lessons.sentence.questions[0].options!;
    expect(choices).toContain("we play outside.");
    expect(choices).toContain("We play outside.");
    expect(content.grades["1"].lessons.sentence.questions[0].answer).toBe(
      "We play outside.",
    );
  });
});
describe("grade-aware saved progress", () => {
  it("keeps best scores for different grades separate while points accumulate", () => {
    const first = completeRound(
      initialProgress,
      "arithmetic",
      perfect,
      new Date(2026, 9, 29),
      "k",
    );
    const next = completeRound(
      first.progress,
      "arithmetic",
      perfect.map((_, i) => ({ correct: i < 2, speed: false })),
      new Date(2026, 9, 29),
      "5",
    );
    expect(first.result.grade).toBe("k");
    expect(next.result.grade).toBe("5");
    expect(next.progress.gradeBestRounds).toEqual({
      "k:arithmetic": 5,
      "5:arithmetic": 2,
    });
    expect(next.progress.bestRounds.arithmetic).toBe(5);
    expect(next.result.dailyBonus).toBe(false);
    expect(next.progress.points).toBe(220);
    expect(parseProgress(JSON.stringify(next.progress))).toEqual(next.progress);
  });
  it("keeps an existing grade's best result and records an all-incorrect attempt", () => {
    let progress = completeRound(
      initialProgress,
      "reading",
      perfect,
      undefined,
      "1",
    ).progress;
    progress = completeRound(
      progress,
      "reading",
      perfect.map(() => ({ correct: false, speed: false })),
      undefined,
      "1",
    ).progress;
    progress = completeRound(
      progress,
      "reading",
      perfect.map(() => ({ correct: false, speed: false })),
      undefined,
      "2",
    ).progress;
    expect(progress.gradeBestRounds).toEqual({
      "1:reading": 5,
      "2:reading": 0,
    });
  });
  it("accepts pre-library saves and rejects invalid grade score keys or values", () => {
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(
      initialProgress,
    );
    for (const gradeBestRounds of [
      { "6:reading": 5 },
      { "k:unknown": 2 },
      { "3:reading": 6 },
      [],
      null,
    ]) {
      expect(() =>
        parseProgress(JSON.stringify({ ...initialProgress, gradeBestRounds })),
      ).toThrow();
    }
  });
});
