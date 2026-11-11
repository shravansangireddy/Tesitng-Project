// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { getLearningContent, type Question } from "./content";
import { gradeIds, type GradeId, type LessonId } from "./content-schema";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const { banks, grades } = getLearningContent();

// Baseline pool sizes before the kid-fit pack (the 2026-11-02 library).
const baseline: Partial<Record<GradeId, Partial<Record<LessonId, number>>>> = {
  prek: { sight: 125, patterns: 165 },
  k: { sight: 155, patterns: 195 },
  "1": { sight: 185, reading: 20, patterns: 175, problems: 190, informational: 25 },
  "2": { sight: 185, sentence: 190, reading: 20, patterns: 95, problems: 240, informational: 25 },
  "3": { sentence: 195, reading: 20, patterns: 155, problems: 330, informational: 25 },
  "4": { sentence: 195, reading: 20, patterns: 155, problems: 365, informational: 25 },
  "5": { sentence: 195, reading: 20, patterns: 145, problems: 355, informational: 25 },
};
// Rows the pack appended to each pool.
const added: Partial<Record<GradeId, Partial<Record<LessonId, number>>>> = {
  prek: { sight: 5, patterns: 5 },
  k: { sight: 5, patterns: 5 },
  "1": { sight: 5, reading: 5, patterns: 10, problems: 5, informational: 5 },
  "2": { sight: 5, sentence: 5, reading: 5, patterns: 10, problems: 5, informational: 15 },
  "3": { sentence: 5, reading: 5, patterns: 10, problems: 5, informational: 20 },
  "4": { sentence: 5, reading: 5, patterns: 10, problems: 5, informational: 20 },
  "5": { sentence: 5, reading: 5, patterns: 10, problems: 5, informational: 20 },
};

function pool(grade: GradeId, lesson: LessonId): Question[] {
  return grades[grade].lessons[lesson].questions;
}
/** The set of five at position `fromEnd` (0 = last set) in a pool. */
function tailSet(grade: GradeId, lesson: LessonId, fromEnd = 0): Question[] {
  const questions = pool(grade, lesson);
  return questions.slice(questions.length - 5 * (fromEnd + 1), questions.length - 5 * fromEnd);
}

describe("kid-fit question pack", () => {
  it("appends exactly the planned rows to each pool and nothing anywhere else", () => {
    for (const grade of gradeIds) {
      for (const lesson of Object.keys(grades[grade].lessons) as LessonId[]) {
        const before = baseline[grade]?.[lesson];
        const extra = added[grade]?.[lesson] ?? 0;
        if (before !== undefined)
          expect(pool(grade, lesson)).toHaveLength(before + extra);
        else if (extra > 0) throw new Error(`missing baseline for ${grade}/${lesson}`);
      }
    }
    const total = gradeIds.reduce(
      (sum, grade) =>
        sum +
        (Object.values(grades[grade].lessons) as { questions: Question[] }[]).reduce(
          (n, lesson) => n + lesson.questions.length,
          0,
        ),
      0,
    );
    // 16,915 baseline + 230 kid-fit rows + 195 Guitar Quest questions + 200 Word Power questions.
    expect(total).toBe(16915 + 230 + 195 + 200);
  });

  it("keeps the distinct-question total at 18,216 (12,350 static + 195 guitar + 5,671 template space)", () => {
    const prompts = new Set<string>();
    let rows = 0;
    for (const bank of Object.values(banks)) {
      rows += bank.length;
      for (const question of bank) prompts.add(question.prompt);
    }
    for (const grade of gradeIds)
      for (const lesson of Object.values(grades[grade].lessons)) {
        rows += lesson.questions.length;
        for (const question of lesson.questions) prompts.add(question.prompt);
      }
    expect(rows).toBe(17575);
    expect(prompts.size).toBe(12545);
    expect(prompts.size + 5671).toBe(18216);
  });

  it("adds pick-the-missing-letter phonics sets to sight for Pre-K through Grade 2", () => {
    for (const grade of ["prek", "k", "1", "2"] as GradeId[]) {
      const set = tailSet(grade, "sight");
      expect(set).toHaveLength(5);
      for (const question of set) {
        expect(question.prompt).toMatch(/^Which letter completes the word\? Clue: /);
        expect(question.options).toHaveLength(4);
        expect(question.options!.every((option) => option.length === 1)).toBe(true);
        expect(question.answer).toHaveLength(1);
      }
    }
  });

  it("adds fix-the-sentence sets to sentence for Grades 2-5", () => {
    for (const grade of ["2", "3", "4", "5"] as GradeId[]) {
      const set = tailSet(grade, "sentence");
      expect(set).toHaveLength(5);
      for (const question of set)
        expect(question.prompt).toMatch(/fix|correct/i);
    }
  });

  it("adds story-sequence sets about each grade's own story to reading for Grades 1-5", () => {
    for (const grade of ["1", "2", "3", "4", "5"] as GradeId[]) {
      const set = tailSet(grade, "reading");
      expect(set).toHaveLength(5);
      for (const question of set) {
        expect(question.prompt).toMatch(/FIRST|LAST|AFTER|NEXT|BEFORE/);
        // The parser attaches the grade's story, and the set quizzes it.
        expect(question.passage).toBe(pool(grade, "reading")[0].passage);
      }
    }
  });

  it("adds number-line sets and fresh pattern sets to patterns", () => {
    for (const grade of ["prek", "k"] as GradeId[]) {
      const set = tailSet(grade, "patterns");
      for (const question of set) {
        expect(question.prompt).not.toMatch(/^A number line/);
        expect(question.prompt).toMatch(/comes next|come next/);
      }
    }
    for (const grade of ["1", "2", "3", "4", "5"] as GradeId[]) {
      const numberLine = tailSet(grade, "patterns", 1);
      for (const question of numberLine)
        expect(question.prompt).toMatch(/^A number line makes equal jumps/);
      const patterns = tailSet(grade, "patterns");
      for (const question of patterns) {
        expect(question.prompt).not.toMatch(/^A number line/);
        expect(question.prompt).toMatch(/comes next|come next/);
      }
    }
  });

  it("adds array-and-grouping word problems to problems for Grades 1-5", () => {
    for (const grade of ["1", "2", "3", "4", "5"] as GradeId[]) {
      const set = tailSet(grade, "problems");
      expect(set).toHaveLength(5);
      for (const question of set)
        expect(question.prompt).toMatch(/each|every|equal|rows?|pages|cartons|trays|groups/i);
    }
  });

  it("adds label, life-cycle, and compare science sets to informational", () => {
    const label = tailSet("1", "informational");
    for (const question of label)
      expect(question.prompt).toMatch(/^Which (part|body|bones|joint|plant)/);
    for (const grade of ["2", "3", "4", "5"] as GradeId[]) {
      const labelSet = tailSet(grade, "informational", grade === "2" ? 2 : 3);
      for (const question of labelSet)
        expect(question.prompt).toMatch(/^Which (part|body|bones|joint|plant)/);
      const lifeCycle = tailSet(grade, "informational", grade === "2" ? 1 : 2);
      for (const question of lifeCycle)
        expect(question.prompt).toMatch(/comes|happen|stage|cycle|chrysalis|germinat|metamorphosis|OLDER|after|before|next|hatch|froglet/i);
      const compare = tailSet(grade, "informational", grade === "2" ? 0 : 1);
      expect(compare).toHaveLength(5);
    }
  });

  it("adds coding-steps and online-safety sets to informational for Grades 3-5 only", () => {
    for (const grade of ["3", "4", "5"] as GradeId[]) {
      const set = tailSet(grade, "informational");
      expect(set).toHaveLength(5);
      for (const question of set)
        expect(question.prompt).toMatch(
          /password|online|code|coding|robot|algorithm|loop|print|photo|message|account|computer|program|website|share/i,
        );
    }
    // Grades 1-2 informational tails are the label/compare sets, not computing.
    for (const question of tailSet("1", "informational"))
      expect(question.prompt).not.toMatch(/password|algorithm/i);
  });
});

describe("practice pack home-screen promo", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });
  it("shows the Practice Pack banner on the home screen with a way to explore it", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root!.render(<App />));
    const banner = container.querySelector(".practice-pack-banner");
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute("aria-label")).toBe("New practice pack");
    expect(banner!.querySelector("h2")?.textContent).toBe("New: Practice Pack");
    expect(banner!.textContent).toContain("phonics letter puzzles");
    expect(banner!.textContent).toContain("fix-the-sentence");
    expect(banner!.textContent).toContain("science labels and life cycles");
    expect(banner!.textContent).toContain("coding steps");
    const button = [...banner!.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Explore the new practice",
    );
    expect(button).toBeTruthy();
  });
});
