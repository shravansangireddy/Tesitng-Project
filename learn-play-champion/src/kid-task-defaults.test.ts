import { describe, expect, it } from "vitest";
import {
  defaultTasksForGrade,
  gradeBandForGrade,
  shouldSeedDefaultTasks,
} from "../supabase/functions/_shared/kid-task-defaults.ts";
import { activities } from "./game";
import {
  ALL_SKILL_TASKS,
  isTaskActivityId,
  MAX_TASK_TITLE,
} from "./kid-tasks";

/**
 * The default tasks live in the kid-accounts Edge Function's shared module
 * (supabase/functions/_shared/kid-task-defaults.ts) and are seeded
 * server-side when a kid login is created. Owner's decision (2026-11-05,
 * "Add all skills"): every new kid gets ALL skills at every grade — every
 * catalog activity plus Word Battle and Motivation Books. These tests pin
 * that full set and prove every seeded deep-link is one the app can open.
 */

const ALL_SKILLS = [
  { title: "Play Word Safari", activity: "sight" },
  { title: "Play Meaning Match", activity: "vocabulary" },
  { title: "Play Spelling Spark", activity: "spelling" },
  { title: "Play Story Explorer", activity: "reading" },
  { title: "Play Sentence Builder", activity: "sentence" },
  { title: "Play Fact Finder", activity: "informational" },
  { title: "Play Writer's Workshop", activity: "writing" },
  { title: "Play Number Sprint", activity: "arithmetic" },
  { title: "Play Times Adventure", activity: "multiply" },
  { title: "Play Pattern Detective", activity: "patterns" },
  { title: "Play Math in the Wild", activity: "problems" },
  { title: "Play Shape Quest", activity: "geometry" },
  { title: "Play Place Value Lab", activity: "place" },
  { title: "Play Parts & Wholes", activity: "fractions" },
  { title: "Play Measurement Mission", activity: "measurement" },
  { title: "Play Data Detective", activity: "data" },
  { title: "Play Word Battle", activity: "word-battle" },
  { title: "Read a Motivation Book", activity: "motivation-books" },
];

describe("gradeBandForGrade", () => {
  it("maps every grade id to its band", () => {
    expect(gradeBandForGrade("prek")).toBe("early");
    expect(gradeBandForGrade("k")).toBe("early");
    expect(gradeBandForGrade("1")).toBe("primary");
    expect(gradeBandForGrade("2")).toBe("primary");
    expect(gradeBandForGrade("3")).toBe("upper");
    expect(gradeBandForGrade("4")).toBe("upper");
    expect(gradeBandForGrade("5")).toBe("upper");
  });

  it("falls back to the primary band for an unknown grade", () => {
    expect(gradeBandForGrade("college")).toBe("primary");
    expect(gradeBandForGrade("")).toBe("primary");
  });
});

describe("defaultTasksForGrade", () => {
  it("gives every grade the full all-skills set", () => {
    for (const grade of ["prek", "k", "1", "2", "3", "4", "5"]) {
      expect(defaultTasksForGrade(grade)).toEqual(ALL_SKILLS);
    }
  });

  it("covers every activity in the app catalog exactly once", () => {
    const seeded = defaultTasksForGrade("2")
      .map((task) => task.activity)
      .filter((activity) => activity !== null);
    for (const activity of activities) {
      expect(seeded.filter((id) => id === activity.id)).toHaveLength(1);
    }
    expect(seeded).toContain("word-battle");
    expect(seeded).toContain("motivation-books");
    expect(seeded).toHaveLength(activities.length + 2);
    expect(new Set(seeded).size).toBe(seeded.length);
  });

  it("only seeds deep-links the app can open, with titles that fit", () => {
    for (const grade of ["prek", "k", "1", "2", "3", "4", "5"]) {
      const tasks = defaultTasksForGrade(grade);
      expect(tasks).toHaveLength(ALL_SKILLS.length);
      for (const task of tasks) {
        expect(task.title.length).toBeLessThanOrEqual(MAX_TASK_TITLE);
        expect(task.activity).not.toBeNull();
        // A real catalog activity, the Word Battle world, or Motivation
        // Books — nothing the kid's Start button would silently drop.
        expect(isTaskActivityId(task.activity!)).toBe(true);
        if (task.activity !== "word-battle" && task.activity !== "motivation-books") {
          expect(
            activities.some((activity) => activity.id === task.activity),
          ).toBe(true);
        }
      }
    }
  });

  it("returns a fresh copy so callers cannot mutate the shared set", () => {
    const first = defaultTasksForGrade("2");
    first[0].title = "Changed";
    first.pop();
    const second = defaultTasksForGrade("2");
    expect(second).toHaveLength(ALL_SKILLS.length);
    expect(second[0].title).toBe("Play Word Safari");
  });
});

describe("shouldSeedDefaultTasks", () => {
  it("seeds only into an empty task list", () => {
    expect(shouldSeedDefaultTasks(0)).toBe(true);
    expect(shouldSeedDefaultTasks(1)).toBe(false);
    expect(shouldSeedDefaultTasks(4)).toBe(false);
  });
});

describe("client skill presets (src/kid-tasks.ts ALL_SKILL_TASKS)", () => {
  it("are identical to the server seed set at every grade, so the two lists can never drift", () => {
    // The "Add all skills" button in Kid logins tops a kid up from the
    // client copy of this list; the Edge Function seeds new kids from the
    // server copy. They must stay exactly the same list — same titles,
    // same activities, same order.
    const clientList = ALL_SKILL_TASKS.map((preset) => ({
      title: preset.title,
      activity: preset.activityId,
    }));
    for (const grade of ["prek", "k", "1", "2", "3", "4", "5"]) {
      expect(clientList).toEqual(defaultTasksForGrade(grade));
    }
    expect(clientList).toEqual(ALL_SKILLS);
  });
});
