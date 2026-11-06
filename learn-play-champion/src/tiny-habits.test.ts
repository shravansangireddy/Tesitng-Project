import { describe, expect, it } from "vitest";
import { initialProgress, parseProgress } from "./game";
import {
  MAX_TINY_HABITS,
  addTinyHabit,
  emptyTinyHabits,
  isTinyHabitDate,
  lastSevenTinyHabitDays,
  pipLevelProgress,
  removeTinyHabit,
  shiftTinyHabitDate,
  tinyHabitDateString,
  tinyHabitPresets,
  tinyHabitStreak,
  toggleTinyHabitCheckIn,
  totalTinyHabitCheckIns,
  type TinyHabitsProgress,
} from "./tiny-habits";

const TODAY = "2026-11-05";

describe("tiny habit presets", () => {
  it("offers ten original preset habits with unique ids", () => {
    expect(tinyHabitPresets).toHaveLength(10);
    expect(new Set(tinyHabitPresets.map((preset) => preset.id)).size).toBe(10);
    expect(tinyHabitPresets.map((preset) => preset.label)).toContain(
      "Read for 5 minutes",
    );
    expect(tinyHabitPresets.map((preset) => preset.label)).toContain(
      "Say thank you to someone",
    );
  });
});

describe("tiny habit dates", () => {
  it("formats local calendar dates as YYYY-MM-DD", () => {
    expect(tinyHabitDateString(new Date(2026, 0, 2, 23, 59))).toBe("2026-01-02");
    expect(tinyHabitDateString(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("accepts real dates and rejects impossible or loose date strings", () => {
    expect(isTinyHabitDate("2024-02-29")).toBe(true);
    expect(isTinyHabitDate("2026-02-29")).toBe(false);
    expect(isTinyHabitDate("2026-2-09")).toBe(false);
    expect(isTinyHabitDate("Nov 5, 2026")).toBe(false);
    expect(isTinyHabitDate(20261105)).toBe(false);
  });

  it("shifts across month and year boundaries and builds the last seven days", () => {
    expect(shiftTinyHabitDate("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftTinyHabitDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftTinyHabitDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(lastSevenTinyHabitDays(TODAY)).toEqual([
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
  });
});

describe("tiny habit list changes", () => {
  it("adds presets in order and enforces the three-habit cap", () => {
    let state = emptyTinyHabits();
    state = addTinyHabit(state, "read-5-minutes");
    state = addTinyHabit(state, "make-my-bed");
    state = addTinyHabit(state, "drink-water");
    expect(state.habits).toEqual(["read-5-minutes", "make-my-bed", "drink-water"]);
    expect(state.habits).toHaveLength(MAX_TINY_HABITS);
    expect(() => addTinyHabit(state, "draw-one-picture")).toThrow(
      "You can track up to 3 tiny habits.",
    );
    expect(addTinyHabit(state, "read-5-minutes")).toBe(state);
    expect(() => addTinyHabit(state, "not-a-habit")).toThrow("Unknown tiny habit.");
  });

  it("removing a habit drops that habit's check-ins and leaves the others", () => {
    const state: TinyHabitsProgress = {
      habits: ["read-5-minutes", "make-my-bed"],
      checkIns: {
        "read-5-minutes": ["2026-11-04", "2026-11-05"],
        "make-my-bed": ["2026-11-05"],
      },
    };
    const next = removeTinyHabit(state, "read-5-minutes");
    expect(next).toEqual({
      habits: ["make-my-bed"],
      checkIns: { "make-my-bed": ["2026-11-05"] },
    });
    expect(state.checkIns["read-5-minutes"]).toHaveLength(2);
  });
});

describe("tiny habit check-ins and streaks", () => {
  const base: TinyHabitsProgress = {
    habits: ["read-5-minutes"],
    checkIns: { "read-5-minutes": [] },
  };

  it("checks in today, then tapping again today undoes it", () => {
    const checked = toggleTinyHabitCheckIn(base, "read-5-minutes", TODAY);
    expect(checked.checkIns["read-5-minutes"]).toEqual([TODAY]);
    expect(base.checkIns["read-5-minutes"]).toEqual([]);
    const undone = toggleTinyHabitCheckIn(checked, "read-5-minutes", TODAY);
    expect(undone.checkIns["read-5-minutes"]).toEqual([]);
    expect(totalTinyHabitCheckIns(undone)).toBe(0);
  });

  it("counts a streak ending today", () => {
    expect(
      tinyHabitStreak(
        ["2026-11-03", "2026-11-04", "2026-11-05"],
        TODAY,
      ),
    ).toBe(3);
    expect(
      tinyHabitStreak(
        ["2026-11-02", "2026-11-04", "2026-11-05"],
        TODAY,
      ),
    ).toBe(2);
  });

  it("keeps a streak alive when today is not checked but yesterday was", () => {
    expect(
      tinyHabitStreak(["2026-11-03", "2026-11-04"], TODAY),
    ).toBe(2);
    expect(tinyHabitStreak(["2026-10-31"], "2026-11-01")).toBe(1);
  });

  it("breaks the streak after a full missed day", () => {
    expect(
      tinyHabitStreak(["2026-11-02", "2026-11-03"], TODAY),
    ).toBe(0);
    expect(tinyHabitStreak([], TODAY)).toBe(0);
  });

  it("does not let duplicate saved dates inflate totals or streaks", () => {
    const state: TinyHabitsProgress = {
      habits: ["read-5-minutes"],
      checkIns: {
        "read-5-minutes": [TODAY, TODAY, "2026-11-04", "2026-11-04"],
      },
    };
    expect(totalTinyHabitCheckIns(state)).toBe(2);
    expect(tinyHabitStreak(state.checkIns["read-5-minutes"], TODAY)).toBe(2);
  });
});

describe("Pip levels", () => {
  it("uses the planned check-in thresholds and leaf progression", () => {
    const cases = [
      [0, 1, "Tiny Ant", "🍃", 5],
      [4, 1, "Tiny Ant", "🍃", 1],
      [5, 2, "Steady Walker", "🌿", 10],
      [14, 2, "Steady Walker", "🌿", 1],
      [15, 3, "Leaf Carrier", "🍀", 15],
      [29, 3, "Leaf Carrier", "🍀", 1],
      [30, 4, "Hill Climber", "🌳", 20],
      [49, 4, "Hill Climber", "🌳", 1],
      [50, 5, "Mountain Ant", "🏔️", 0],
      [100, 5, "Mountain Ant", "🏔️", 0],
    ] as const;
    for (const [total, level, name, leaf, remaining] of cases) {
      const progress = pipLevelProgress(total);
      expect(progress.current.level).toBe(level);
      expect(progress.current.name).toBe(name);
      expect(progress.current.leaf).toBe(leaf);
      expect(progress.remainingToNext).toBe(remaining);
    }
    expect(pipLevelProgress(10).fraction).toBe(0.5);
    expect(pipLevelProgress(50).fraction).toBe(1);
  });
});

describe("tiny habit progress storage", () => {
  it("loads old progress without a tiny habits field unchanged", () => {
    const parsed = parseProgress(JSON.stringify(initialProgress));
    expect(parsed).toEqual(initialProgress);
    expect(parsed.tinyHabits).toBeUndefined();
  });

  it("round-trips valid tiny habit progress inside the learner blob", () => {
    const progress = {
      ...initialProgress,
      points: 125,
      tinyHabits: {
        habits: ["read-5-minutes", "make-my-bed"],
        checkIns: {
          "read-5-minutes": ["2026-11-04", "2026-11-05"],
          "make-my-bed": ["2026-11-05"],
        },
      },
    };
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it("sanitizes junk tiny habit data instead of discarding the whole save", () => {
    const junkValues: unknown[] = ["nope", 42, [], null];
    for (const tinyHabits of junkValues) {
      expect(
        parseProgress(JSON.stringify({ ...initialProgress, tinyHabits }))
          .tinyHabits,
      ).toBeUndefined();
    }

    const mixed = parseProgress(JSON.stringify({
      ...initialProgress,
      tinyHabits: {
        habits: [
          "read-5-minutes",
          "not-a-habit",
          "read-5-minutes",
          "make-my-bed",
          "draw-one-picture",
          "write-one-sentence",
        ],
        checkIns: {
          "read-5-minutes": ["2026-11-05", "not-a-date", "2026-11-05", "2026-11-04"],
          "make-my-bed": "nope",
          "unknown-habit": ["2026-11-05"],
        },
      },
    }));
    expect(mixed.tinyHabits).toEqual({
      habits: ["read-5-minutes", "make-my-bed", "draw-one-picture"],
      checkIns: { "read-5-minutes": ["2026-11-04", "2026-11-05"] },
    });
    expect(parseProgress(JSON.stringify(mixed))).toEqual(mixed);
  });
});
