import { describe, expect, it } from "vitest";
import {
  defaultTasksForGrade,
  gradeBandForGrade,
  shouldSeedDefaultTasks,
} from "../supabase/functions/_shared/kid-task-defaults.ts";
import { activities } from "./game";
import { isTaskActivityId, MAX_TASK_TITLE } from "./kid-tasks";

/**
 * The default starter tasks live in the kid-accounts Edge Function's shared
 * module (supabase/functions/_shared/kid-task-defaults.ts) and are seeded
 * server-side when a kid login is created. These tests pin the sets per
 * grade band and prove every seeded deep-link is one the app can open.
 */

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
  it("gives Pre-K and Kindergarten the gentle set with a picture-book task", () => {
    for (const grade of ["prek", "k"]) {
      expect(defaultTasksForGrade(grade)).toEqual([
        { title: "Play Story Explorer", activity: "reading" },
        { title: "Play Number Sprint", activity: "arithmetic" },
        { title: "Play Word Safari", activity: "sight" },
        { title: "Read a picture book", activity: null },
      ]);
    }
  });

  it("gives grades 1–2 Word Safari plus Word Battle", () => {
    for (const grade of ["1", "2"]) {
      expect(defaultTasksForGrade(grade)).toEqual([
        { title: "Play Story Explorer", activity: "reading" },
        { title: "Play Number Sprint", activity: "arithmetic" },
        { title: "Play Word Safari", activity: "sight" },
        { title: "Play Word Battle", activity: "word-battle" },
      ]);
    }
  });

  it("gives grades 3–5 Spelling Spark plus Word Battle", () => {
    for (const grade of ["3", "4", "5"]) {
      expect(defaultTasksForGrade(grade)).toEqual([
        { title: "Play Story Explorer", activity: "reading" },
        { title: "Play Number Sprint", activity: "arithmetic" },
        { title: "Play Spelling Spark", activity: "spelling" },
        { title: "Play Word Battle", activity: "word-battle" },
      ]);
    }
  });

  it("only seeds deep-links the app can open, with titles that fit", () => {
    for (const grade of ["prek", "k", "1", "2", "3", "4", "5"]) {
      const tasks = defaultTasksForGrade(grade);
      expect(tasks).toHaveLength(4);
      for (const task of tasks) {
        expect(task.title.length).toBeLessThanOrEqual(MAX_TASK_TITLE);
        if (task.activity !== null) {
          // A real catalog activity or the Word Battle world — nothing the
          // kid's Start button would silently drop.
          expect(isTaskActivityId(task.activity)).toBe(true);
          if (task.activity !== "word-battle") {
            expect(
              activities.some((activity) => activity.id === task.activity),
            ).toBe(true);
          }
        }
      }
    }
  });

  it("returns a fresh copy so callers cannot mutate the shared set", () => {
    const first = defaultTasksForGrade("2");
    first[0].title = "Changed";
    first.pop();
    const second = defaultTasksForGrade("2");
    expect(second).toHaveLength(4);
    expect(second[0].title).toBe("Play Story Explorer");
  });
});

describe("shouldSeedDefaultTasks", () => {
  it("seeds only into an empty task list", () => {
    expect(shouldSeedDefaultTasks(0)).toBe(true);
    expect(shouldSeedDefaultTasks(1)).toBe(false);
    expect(shouldSeedDefaultTasks(4)).toBe(false);
  });
});
