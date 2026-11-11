// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";
import { getLearningContent, type Question } from "./content";
import { gradeIds, type GradeId } from "./content-schema";
import { activities } from "./game";
import { makeRound } from "./questions";
import { activityTitle, ALL_SKILL_TASKS } from "./kid-tasks";
import { defaultTasksForGrade } from "../supabase/functions/_shared/kid-task-defaults.ts";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const { grades } = getLearningContent();

const expectedCounts: Record<GradeId, number> = {
  prek: 25,
  k: 25,
  "1": 30,
  "2": 30,
  "3": 30,
  "4": 30,
  "5": 30,
};

function wordPowerPool(grade: GradeId): Question[] {
  return grades[grade].lessons.wordpower.questions;
}

function findQuestion(grade: GradeId, promptPart: string): Question {
  const found = wordPowerPool(grade).find((question) =>
    question.prompt.includes(promptPart),
  );
  if (!found) throw new Error(`no wordpower question in ${grade} matching: ${promptPart}`);
  return found;
}

describe("Word Power content", () => {
  it("exists at every grade with the planned number of questions, in complete sets of five", () => {
    let total = 0;
    for (const grade of gradeIds) {
      const lesson = grades[grade].lessons.wordpower;
      expect(lesson, grade).toBeDefined();
      expect(lesson.questions.length, grade).toBe(expectedCounts[grade]);
      expect(lesson.questions.length % 5, grade).toBe(0);
      expect(lesson.title.length, grade).toBeGreaterThan(0);
      expect(lesson.skill.length, grade).toBeGreaterThan(0);
      total += lesson.questions.length;
    }
    expect(total).toBe(200);
  });

  it("carries no standards guide — word power is an enrichment lesson, not a curriculum path", () => {
    for (const grade of gradeIds)
      expect(grades[grade].lessons.wordpower.guide).toBeUndefined();
  });

  it("serves five fully answerable questions per grade through makeRound", () => {
    for (const grade of gradeIds) {
      const round = makeRound("wordpower", () => 0, grade);
      expect(round, grade).toHaveLength(5);
      for (const question of round) {
        expect(question.options).toBeDefined();
        expect(question.options).toContain(question.answer);
        expect(new Set(question.options).size).toBe(question.options!.length);
        expect(question.hint.trim().length).toBeGreaterThan(0);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("teaches prefixes and suffixes as word-part clues", () => {
    expect(findQuestion("1", "What does UNHAPPY mean?").answer).toBe("not happy");
    expect(findQuestion("1", "What does REREAD mean?").answer).toBe("read again");
    expect(findQuestion("2", "What does PREHEAT mean?").answer).toBe(
      "to heat ahead of time",
    );
    expect(findQuestion("2", "What does FEARLESS mean?").answer).toBe("without fear");
    expect(findQuestion("3", "In MISREAD, the prefix MIS- means").answer).toBe("wrongly");
    expect(findQuestion("3", "In WASHABLE, the suffix -ABLE means").answer).toBe(
      "able to be",
    );
  });

  it("teaches Greek and Latin roots as meaning clues", () => {
    expect(findQuestion("3", "A BIOGRAPHY is").answer).toBe(
      "a book written about someone's life",
    );
    expect(findQuestion("3", "GEOLOGY is the study of").answer).toBe(
      "the earth and its rocks",
    );
    expect(findQuestion("4", "To TRANSPORT something means").answer).toBe(
      "to carry it from one place to another",
    );
    expect(findQuestion("4", "To PREDICT means").answer).toBe(
      "to say what will happen before it happens",
    );
    expect(findQuestion("5", "A CHRONOLOGICAL list puts events").answer).toBe(
      "in the order they happened",
    );
    expect(findQuestion("5", "A TELESCOPE helps you").answer).toBe(
      "see things that are far away",
    );
  });

  it("teaches homophones by the meaning each sentence needs", () => {
    expect(findQuestion("k", "salty water where fish swim").answer).toBe("sea");
    expect(findQuestion("k", "what your eyes do when you look at a picture").answer).toBe(
      "see",
    );
    expect(findQuestion("1", "means to notice with your ears").answer).toBe("hear");
    expect(findQuestion("1", "which word means THIS PLACE").answer).toBe("here");
    expect(findQuestion("2", "which word shows the dog belongs to them").answer).toBe(
      "Their",
    );
    expect(findQuestion("2", "which word means CORRECT").answer).toBe("right");
  });

  it("teaches compound words, idioms, and figurative meanings in the right grades", () => {
    expect(findQuestion("prek", "rain + bow").answer).toBe("rainbow");
    expect(findQuestion("k", "join to make POPCORN").answer).toBe("pop + corn");
    expect(findQuestion("3", "A PIECE OF CAKE means").answer).toBe("very easy");
    expect(findQuestion("4", "SPILL THE BEANS means").answer).toBe("tell the secret");
    expect(findQuestion("5", "Which phrase is a SIMILE?").answer).toBe(
      "as brave as a lion",
    );
  });
});

describe("Word Power catalog and task wiring", () => {
  it("is in the activity catalog once, as an English activity", () => {
    const wordPower = activities.filter((activity) => activity.id === "wordpower");
    expect(wordPower).toHaveLength(1);
    expect(wordPower[0].title).toBe("Word Power");
    expect(wordPower[0].subject).toBe("english");
    expect(wordPower[0].symbol).toBe("🔤");
    expect(activities).toHaveLength(18);
  });

  it("is one of the 20 skill tasks on both the client and the server seed", () => {
    expect(ALL_SKILL_TASKS).toHaveLength(20);
    expect(ALL_SKILL_TASKS).toHaveLength(activities.length + 2);
    expect(
      ALL_SKILL_TASKS.filter((preset) => preset.activityId === "wordpower"),
    ).toEqual([{ title: "Play Word Power", activityId: "wordpower" }]);
    expect(activityTitle("wordpower")).toBe("Word Power");
    for (const grade of gradeIds) {
      const seeded = defaultTasksForGrade(grade);
      expect(seeded).toHaveLength(20);
      expect(seeded).toHaveLength(activities.length + 2);
      expect(
        seeded.filter((task) => task.activity === "wordpower"),
      ).toEqual([{ title: "Play Word Power", activity: "wordpower" }]);
    }
  });
});

describe("word power home-screen banner", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });
  it("shows the Word Power banner on the home screen with a way in", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root!.render(<App />));
    const banner = container.querySelector(".wordpower-banner");
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute("aria-label")).toBe("Word Power");
    expect(banner!.querySelector("h2")?.textContent).toBe("New: Word Power");
    expect(banner!.textContent).toContain("figure out any word");
    expect(banner!.textContent).toContain("word parts like un- and -ful");
    expect(banner!.textContent).toContain("sound-alike words");
    expect(banner!.textContent).toContain("shades of meaning");
    const button = [...banner!.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Try Word Power",
    );
    expect(button).toBeTruthy();
  });
});
