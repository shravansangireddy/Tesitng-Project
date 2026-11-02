import { describe, expect, it } from "vitest";
import {
  completeRound,
  initialProgress,
  type ActivityId,
  type Attempt,
  type Progress,
} from "./game";
import {
  activityBars,
  activityCorrect,
  barFraction,
  subjectBars,
  totalChartedCorrect,
} from "./progress-charts";

/** Play one real round through the game's own reducer, so fixtures always satisfy the save invariants. */
function play(progress: Progress, activity: ActivityId, correctCount: number): Progress {
  const attempts: Attempt[] = Array.from({ length: 5 }, (_, index) => ({
    correct: index < correctCount,
    speed: false,
  }));
  return completeRound(progress, activity, attempts).progress;
}

describe("barFraction", () => {
  it("scales a value against the largest bar", () => {
    expect(barFraction(50, 100)).toBe(0.5);
    expect(barFraction(100, 100)).toBe(1);
    expect(barFraction(1, 4)).toBe(0.25);
  });

  it("clamps over-max values and never goes negative", () => {
    expect(barFraction(150, 100)).toBe(1);
    expect(barFraction(-5, 100)).toBe(0);
  });

  it("returns 0 when there is nothing to scale by", () => {
    expect(barFraction(0, 0)).toBe(0);
    expect(barFraction(10, 0)).toBe(0);
    expect(barFraction(10, -3)).toBe(0);
    expect(barFraction(Number.NaN, 100)).toBe(0);
    expect(barFraction(10, Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("subjectBars", () => {
  it("totals correct answers per subject using the catalog's subject mapping", () => {
    let progress = initialProgress;
    progress = play(progress, "sight", 4); // english
    progress = play(progress, "writing", 2); // english
    progress = play(progress, "data", 5); // math
    progress = play(progress, "arithmetic", 1); // math
    const bars = subjectBars(progress);
    expect(bars.map((bar) => [bar.id, bar.value])).toEqual([
      ["english", 6],
      ["math", 6],
    ]);
    expect(bars[0].label).toBe("English");
    expect(bars[1].label).toBe("Math");
    // Bars carry the world-card colors for their subject.
    expect(bars[0].color).not.toBe(bars[1].color);
  });

  it("returns both subjects at zero for a brand-new save", () => {
    const bars = subjectBars(initialProgress);
    expect(bars).toHaveLength(2);
    expect(bars.every((bar) => bar.value === 0)).toBe(true);
    expect(totalChartedCorrect(initialProgress)).toBe(0);
  });
});

describe("activityBars", () => {
  it("lists only practiced activities, strongest first", () => {
    let progress = initialProgress;
    progress = play(progress, "sight", 4);
    progress = play(progress, "writing", 2);
    progress = play(progress, "data", 5);
    progress = play(progress, "arithmetic", 1);
    const bars = activityBars(progress);
    expect(bars.map((bar) => [bar.label, bar.value])).toEqual([
      ["Data Detective", 5],
      ["Word Safari", 4],
      ["Writer's Workshop", 2],
      ["Number Sprint", 1],
    ]);
    expect(totalChartedCorrect(progress)).toBe(12);
    expect(activityCorrect(progress, "geometry")).toBe(0);
  });

  it("respects the limit and breaks ties by title", () => {
    let progress = initialProgress;
    progress = play(progress, "sight", 3);
    progress = play(progress, "spelling", 3);
    progress = play(progress, "reading", 3);
    progress = play(progress, "arithmetic", 3);
    const bars = activityBars(progress, 2);
    expect(bars).toHaveLength(2);
    expect(bars.map((bar) => bar.value)).toEqual([3, 3]);
    // Equal values fall back to alphabetical order for a stable chart.
    expect(bars[0].label.localeCompare(bars[1].label)).toBeLessThan(0);
  });

  it("is empty until the child answers something correctly", () => {
    expect(activityBars(initialProgress)).toEqual([]);
    // A round with no correct answers records no mastery.
    const noCorrect = play(initialProgress, "sight", 0);
    expect(activityBars(noCorrect)).toEqual([]);
  });

  it("accumulates across rounds of the same activity", () => {
    let progress = initialProgress;
    progress = play(progress, "multiply", 3);
    progress = play(progress, "multiply", 2);
    expect(activityCorrect(progress, "multiply")).toBe(5);
    expect(activityBars(progress)[0]).toMatchObject({
      label: "Times Adventure",
      value: 5,
    });
  });
});
