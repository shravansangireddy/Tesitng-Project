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
  "1": 25,
  "2": 30,
  "3": 30,
  "4": 30,
  "5": 30,
};

function guitarPool(grade: GradeId): Question[] {
  return grades[grade].lessons.guitar.questions;
}

function findQuestion(grade: GradeId, promptPart: string): Question {
  const found = guitarPool(grade).find((question) =>
    question.prompt.includes(promptPart),
  );
  if (!found) throw new Error(`no guitar question in ${grade} matching: ${promptPart}`);
  return found;
}

describe("Guitar Quest content", () => {
  it("exists at every grade with the planned number of questions, in complete sets of five", () => {
    let total = 0;
    for (const grade of gradeIds) {
      const lesson = grades[grade].lessons.guitar;
      expect(lesson, grade).toBeDefined();
      expect(lesson.questions.length, grade).toBe(expectedCounts[grade]);
      expect(lesson.questions.length % 5, grade).toBe(0);
      expect(lesson.title.length, grade).toBeGreaterThan(0);
      expect(lesson.skill.length, grade).toBeGreaterThan(0);
      total += lesson.questions.length;
    }
    expect(total).toBe(195);
  });

  it("carries no standards guide — guitar is an enrichment lesson, not a curriculum path", () => {
    for (const grade of gradeIds)
      expect(grades[grade].lessons.guitar.guide).toBeUndefined();
  });

  it("serves five fully answerable questions per grade through makeRound", () => {
    for (const grade of gradeIds) {
      const round = makeRound("guitar", () => 0, grade);
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

  it("teaches the string order thick-to-thin as E, A, D, G, B, E with an original memory sentence", () => {
    expect(
      findQuestion("1", "From the thickest string to the thinnest").answer,
    ).toBe("E, A, D, G, B, E");
    expect(findQuestion("1", "Gigantic Blue Eggs").prompt).toContain(
      "Every Ant Digs Gigantic Blue Eggs",
    );
    expect(findQuestion("2", "Starting from the THINNEST string").answer).toBe(
      "E, B, G, D, A, E",
    );
    // String numbers: 1 is the thinnest, 6 is the thickest.
    expect(findQuestion("k", "Which string is number 1?").answer).toBe(
      "the thinnest string",
    );
    expect(findQuestion("k", "Which string is number 6?").answer).toBe(
      "the thickest string",
    );
    expect(findQuestion("1", "Which string number is the D string?").answer).toBe(
      "string 4",
    );
  });

  it("teaches the standard Em, Am, C, G, and D fingerings", () => {
    // Em 022000: middle finger A string fret 2, ring finger D string fret 2.
    expect(findQuestion("1", "middle finger presses the A string").answer).toBe(
      "the 2nd fret",
    );
    expect(findQuestion("1", "ring finger presses which string").answer).toBe(
      "the D string",
    );
    // Am x02210: x = skip the string; index finger B string fret 1.
    expect(findQuestion("2", "What does the x on the low E string mean?").answer).toBe(
      "do not play that string",
    );
    expect(findQuestion("2", "index finger presses which string at the 1st fret").answer).toBe(
      "the B string",
    );
    // C x32010: ring finger A string fret 3.
    expect(findQuestion("3", "RING finger press at the 3rd fret").answer).toBe(
      "the A string",
    );
    // G 320003: A string fret 2; D, G, B strings ring open.
    expect(findQuestion("3", "In G, the A string is pressed at which fret?").answer).toBe(
      "the 2nd fret",
    );
    expect(findQuestion("3", "In G, which strings ring open?").answer).toBe(
      "the D, G, and B strings",
    );
    // D xx0232: ring finger B string fret 3; only four strings ring.
    expect(findQuestion("3", "ring finger presses the B string at which fret?").answer).toBe(
      "the 3rd fret",
    );
    expect(findQuestion("3", "A D chord rings only four strings").answer).toBe(
      "D, G, B, and high E",
    );
  });

  it("teaches the standard A, E, Dm, A7, and E7 fingerings", () => {
    // A x02220: all three fingers at fret 2 on D, G, B.
    expect(findQuestion("4", "all three of A's fingers press").answer).toBe(
      "the 2nd fret",
    );
    expect(findQuestion("4", "which strings do the three fingers press").answer).toBe(
      "the D, G, and B strings",
    );
    // E 022100: index finger G string fret 1; E has no skipped string.
    expect(findQuestion("4", "Which string does the index finger press").answer).toBe(
      "the G string at the 1st fret",
    );
    expect(findQuestion("4", "lets you strum all six strings").answer).toBe("E");
    // Dm xx0231: index finger high E fret 1.
    expect(findQuestion("4", "Dm is written x-x-0-2-3-1").answer).toBe(
      "the high E string",
    );
    // A7 x02020 vs A x02220: the G string rings open.
    expect(findQuestion("4", "which string rings OPEN in A7").answer).toBe(
      "the G string",
    );
    // E7 020100: A fret 2 and G fret 1 are pressed.
    expect(findQuestion("4", "E7 is written 0-2-0-1-0-0").answer).toBe(
      "the A string at fret 2 and the G string at fret 1",
    );
  });

  it("teaches fretboard notes and the 12th-fret octave", () => {
    expect(findQuestion("3", "low E string at the 3rd fret").answer).toBe("G");
    expect(findQuestion("3", "low E string at the 5th fret").answer).toBe("A");
    expect(findQuestion("3", "A string at the 3rd fret").answer).toBe("C");
    expect(findQuestion("4", "12th fret of any string").answer).toBe(
      "it is the same note as the open string, one octave higher",
    );
    expect(findQuestion("4", "low E string at the 7th fret").answer).toBe("B");
    expect(findQuestion("5", "B string (string 2), the 3rd fret").answer).toBe("D");
  });

  it("teaches tab reading, chord families, and barre shapes", () => {
    // Tab: the top line is the thinnest string.
    expect(findQuestion("4", "TOP line of tab").answer).toBe(
      "the thinnest string — high E, string 1",
    );
    // Families: G uses G–C–D; D uses D–G–A.
    expect(findQuestion("4", "key of G mostly visit three major chords").answer).toBe(
      "G, C, and D",
    );
    expect(findQuestion("5", "key of D mostly use which three major chords").answer).toBe(
      "D, G, and A",
    );
    expect(findQuestion("5", "key of C mostly use which three major chords").answer).toBe(
      "C, F, and G",
    );
    // Barre: the E shape climbs one fret to F, three frets to G.
    expect(findQuestion("5", "barre it at the 1st fret").answer).toBe("F");
    expect(findQuestion("5", "barre it at the 3rd fret").answer).toBe("G");
  });
});

describe("Guitar Quest catalog and task wiring", () => {
  it("is in the activity catalog once, as a General activity", () => {
    const guitar = activities.filter((activity) => activity.id === "guitar");
    expect(guitar).toHaveLength(1);
    expect(guitar[0].title).toBe("Guitar Quest");
    expect(guitar[0].subject).toBe("general");
    expect(guitar[0].symbol).toBe("🎸");
    expect(activities).toHaveLength(17);
  });

  it("is one of the 19 skill tasks on both the client and the server seed", () => {
    expect(ALL_SKILL_TASKS).toHaveLength(19);
    expect(
      ALL_SKILL_TASKS.filter((preset) => preset.activityId === "guitar"),
    ).toEqual([{ title: "Play Guitar Quest", activityId: "guitar" }]);
    expect(activityTitle("guitar")).toBe("Guitar Quest");
    for (const grade of gradeIds) {
      const seeded = defaultTasksForGrade(grade);
      expect(seeded).toHaveLength(19);
      expect(
        seeded.filter((task) => task.activity === "guitar"),
      ).toEqual([{ title: "Play Guitar Quest", activity: "guitar" }]);
    }
  });
});

describe("guitar home-screen banner", () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => {
    if (root) await act(async () => root!.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });
  it("shows the Guitar Quest banner on the home screen with a way in", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root!.render(<App />));
    const banner = container.querySelector(".guitar-banner");
    expect(banner).not.toBeNull();
    expect(banner!.getAttribute("aria-label")).toBe("Guitar Quest");
    expect(banner!.querySelector("h2")?.textContent).toBe("New: Guitar Quest");
    expect(banner!.textContent).toContain("learn the guitar the full way");
    expect(banner!.textContent).toContain("string names");
    expect(banner!.textContent).toContain("real chords like Em, Am, C and G");
    const button = [...banner!.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === "Try Guitar Quest",
    );
    expect(button).toBeTruthy();
  });
});
