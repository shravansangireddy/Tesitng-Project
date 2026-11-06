// @vitest-environment jsdom
import React, { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import TinyHabits from "./TinyHabits";
import { initialProgress, localDate, type Progress } from "./game";
import type { TinyHabitsProgress } from "./tiny-habits";

let container: HTMLDivElement, root: Root;

function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (entry) => entry.textContent?.includes(text),
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}

async function click(element: HTMLElement) {
  await act(async () => element.click());
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

function ProgressHarness({ initial }: { initial: Progress }) {
  const [progress, setProgress] = useState(initial);
  return (
    <>
      <TinyHabits
        grade="3"
        state={progress.tinyHabits}
        today="2026-11-05"
        onChange={(tinyHabits) =>
          setProgress((current) => ({ ...current, tinyHabits }))
        }
        onBack={() => {}}
      />
      <output data-testid="saved-progress">{JSON.stringify(progress)}</output>
    </>
  );
}

describe("Tiny Habits with Pip", () => {
  it("renders the Pip view for a grade 3 learner", async () => {
    await act(async () => root.render(
      <TinyHabits
        grade="3"
        state={undefined}
        today="2026-11-05"
        onChange={() => {}}
        onBack={() => {}}
      />,
    ));

    expect(container.textContent).toContain("Tiny steps, every day.");
    expect(container.textContent).toContain("PIP THE ANT");
    expect(container.textContent).toContain("Level 1: Tiny Ant");
    expect(container.textContent).toContain("Check-ins do not earn points");
    expect(container.textContent).toContain("Read for 5 minutes");
    expect(container.textContent).toContain("Say thank you to someone");
  });

  it("does not render for a grade 1 learner", async () => {
    await act(async () => root.render(
      <TinyHabits
        grade="1"
        state={undefined}
        today="2026-11-05"
        onChange={() => {}}
        onBack={() => {}}
      />,
    ));

    expect(container.textContent).toBe("");
    expect(container.querySelector(".tiny-habits")).toBeNull();
  });

  it("adds a preset habit through the change callback", async () => {
    const changes: TinyHabitsProgress[] = [];
    await act(async () => root.render(
      <TinyHabits
        grade="4"
        state={undefined}
        today="2026-11-05"
        onChange={(next) => changes.push(next)}
        onBack={() => {}}
      />,
    ));

    await click(button("Add: Make my bed"));
    expect(changes).toEqual([{ habits: ["make-my-bed"], checkIns: {} }]);
  });

  it("persists today's toggle through progress without changing points or practice stats", async () => {
    const initial: Progress = {
      ...initialProgress,
      points: 125,
      rounds: 2,
      correct: 9,
      answered: 10,
      streak: 4,
      mastery: { reading: 9 },
      tinyHabits: {
        habits: ["read-5-minutes"],
        checkIns: { "read-5-minutes": ["2026-11-04"] },
      },
    };
    await act(async () => root.render(<ProgressHarness initial={initial} />));

    expect(container.textContent).toContain("1 day streak");
    await click(button("I did it today"));

    const saved = JSON.parse(
      container.querySelector("[data-testid='saved-progress']")!.textContent!,
    ) as Progress;
    expect(saved.tinyHabits).toEqual({
      habits: ["read-5-minutes"],
      checkIns: { "read-5-minutes": ["2026-11-04", "2026-11-05"] },
    });
    expect(saved.points).toBe(initial.points);
    expect(saved.rounds).toBe(initial.rounds);
    expect(saved.correct).toBe(initial.correct);
    expect(saved.answered).toBe(initial.answered);
    expect(saved.streak).toBe(initial.streak);
    expect(saved.mastery).toEqual(initial.mastery);
    expect(container.textContent).toContain("2 days streak");
    expect(container.textContent).toContain("Done today");

    await click(button("Done today — tap to undo"));
    const undone = JSON.parse(
      container.querySelector("[data-testid='saved-progress']")!.textContent!,
    ) as Progress;
    expect(undone.tinyHabits?.checkIns["read-5-minutes"]).toEqual(["2026-11-04"]);
    expect(undone.points).toBe(initial.points);
    expect(undone.streak).toBe(initial.streak);
  });

  it("uses the learner's current local date by default", async () => {
    const changes: TinyHabitsProgress[] = [];
    await act(async () => root.render(
      <TinyHabits
        grade="2"
        state={{ habits: ["drink-water"], checkIns: {} }}
        onChange={(next) => changes.push(next)}
        onBack={() => {}}
      />,
    ));

    await click(button("I did it today"));
    expect(changes[0].checkIns["drink-water"]).toEqual([localDate()]);
  });
});
