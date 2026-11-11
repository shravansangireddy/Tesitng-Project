// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import {
  completeRound,
  initialProgress,
  STORAGE_KEY,
  type ActivityId,
  type Attempt,
  type Progress,
} from "./game";

let container: HTMLDivElement;
let root: Root;

function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent?.includes(text),
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}

async function click(element: HTMLElement) {
  await act(async () => element.click());
}

/** Build a save through the game's own reducer, so it always parses back. */
function play(progress: Progress, activity: ActivityId, correctCount: number): Progress {
  const attempts: Attempt[] = Array.from({ length: 5 }, (_, index) => ({
    correct: index < correctCount,
    focused: false,
  }));
  return completeRound(progress, activity, attempts).progress;
}

function seedProgress(progress: Progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  vi.spyOn(Math, "random").mockReturnValue(0);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("Progress charts in the kid Rewards view", () => {
  it("shows subject and top-activity bar charts built from the kid's own save", async () => {
    let progress: Progress = { ...initialProgress, selectedGrade: "2" };
    progress = play(progress, "sight", 4); // Word Safari, English
    progress = play(progress, "arithmetic", 5); // Number Sprint, Math
    progress = play(progress, "spelling", 2); // Spelling Spark, English
    seedProgress(progress);

    await act(async () => root.render(<App />));
    await click(button("My rewards"));

    const heading = [...container.querySelectorAll("h2")].find(
      (h) => h.textContent === "My learning chart",
    );
    expect(heading).toBeTruthy();
    const charts = [...container.querySelectorAll(".bar-chart")];
    expect(charts).toHaveLength(2);
    // English vs Math: English 4 + 2 = 6 correct, Math 5 correct.
    expect(charts[0].querySelector("figcaption")?.textContent).toBe("English vs Math");
    expect(charts[0].textContent).toContain("English");
    expect(charts[0].textContent).toContain("6 correct");
    expect(charts[0].textContent).toContain("Math");
    expect(charts[0].textContent).toContain("5 correct");
    // Top activities, strongest first.
    expect(charts[1].querySelector("figcaption")?.textContent).toBe("Your top activities");
    expect(charts[1].textContent).toContain("Number Sprint");
    expect(charts[1].textContent).toContain("Word Safari");
    expect(charts[1].textContent).toContain("Spelling Spark");
    const activityRows = [...charts[1].querySelectorAll(".bar-row-label")].map(
      (label) => label.textContent,
    );
    expect(activityRows).toEqual(["Number Sprint", "Word Safari", "Spelling Spark"]);
    // Untouched activities never appear.
    expect(charts[1].textContent).not.toContain("Shape Quest");
  });

  it("invites a brand-new kid to play instead of showing empty bars", async () => {
    seedProgress({ ...initialProgress, selectedGrade: "2" });
    await act(async () => root.render(<App />));
    await click(button("My rewards"));
    expect(container.querySelector(".chart-empty")?.textContent).toContain(
      "Play your first game to start your chart!",
    );
    expect(container.querySelector(".bar-chart")).toBeNull();
  });
});
