// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MotivationBooks from "./MotivationBooks";
import { bookById } from "./motivation-books";
import type { MotivationBookOutcome } from "./game";

let container: HTMLDivElement, root: Root;
function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

const seed = bookById("prek-seed");

async function readOpenBook() {
  for (let page = 0; page < seed.pages.length - 1; page++) {
    await click(button("Next page"));
  }
  await click(button("Answer the questions"));
}

describe("Motivation Books", () => {
  it("shelves the two books for the current level and hides other levels", async () => {
    await act(async () => root.render(
      <MotivationBooks grade="prek" state={undefined} onBookComplete={() => {}} onBack={() => {}} />,
    ));
    expect(container.textContent).toContain("Nia and the Tiny Seed");
    expect(container.textContent).toContain("Benny Shares the Blocks");
    expect(container.textContent).not.toContain("Kai and the Empty Chair");
    await click(button("Show books for all levels"));
    expect(container.textContent).toContain("Kai and the Empty Chair");
  });

  it("reads page by page, answers five questions, and reports the finish once", async () => {
    const outcomes: MotivationBookOutcome[] = [];
    await act(async () => root.render(
      <MotivationBooks grade="prek" state={undefined} onBookComplete={(outcome) => outcomes.push(outcome)} onBack={() => {}} />,
    ));
    await click(button("Read this book"));
    expect(container.querySelector(".mb-page-text")?.textContent).toBe(seed.pages[0]);
    await readOpenBook();
    for (let index = 0; index < seed.questions.length; index++) {
      const question = seed.questions[index];
      const correct = [...container.querySelectorAll<HTMLButtonElement>(".answer-option")]
        .find((option) => option.dataset.answer === question.options[question.answer]);
      if (!correct) throw new Error("Missing correct answer option");
      await click(correct);
      expect(container.querySelector(".mb-feedback")?.textContent).toContain(question.explanation);
      await click(button(index === seed.questions.length - 1 ? "See my results" : "Next question"));
    }
    expect(container.querySelector(".mb-done")?.textContent).toContain("You finished");
    expect(container.querySelector(".mb-done")?.textContent).toContain("50 points");
    expect(outcomes).toEqual([{ bookId: "prek-seed", correct: 5 }]);
  });

  it("scores wrong answers gently and still celebrates finishing", async () => {
    const outcomes: MotivationBookOutcome[] = [];
    await act(async () => root.render(
      <MotivationBooks grade="prek" state={undefined} onBookComplete={(outcome) => outcomes.push(outcome)} onBack={() => {}} />,
    ));
    await click(button("Read this book"));
    await readOpenBook();
    for (let index = 0; index < seed.questions.length; index++) {
      const question = seed.questions[index];
      const wrong = [...container.querySelectorAll<HTMLButtonElement>(".answer-option")]
        .find((option) => option.dataset.answer !== question.options[question.answer]);
      if (!wrong) throw new Error("Missing wrong answer option");
      await click(wrong);
      await click(button(index === seed.questions.length - 1 ? "See my results" : "Next question"));
    }
    expect(container.querySelector(".mb-done")?.textContent).toContain("0 points");
    expect(outcomes).toEqual([{ bookId: "prek-seed", correct: 0 }]);
  });

  it("marks finished books with a check and their best stars on the shelf", async () => {
    await act(async () => root.render(
      <MotivationBooks
        grade="prek"
        state={{ completed: ["prek-seed"], bestScores: { "prek-seed": 5 } }}
        onBookComplete={() => {}}
        onBack={() => {}}
      />,
    ));
    const card = [...container.querySelectorAll(".mb-book-card")]
      .find((entry) => entry.textContent?.includes("Nia and the Tiny Seed"));
    expect(card?.textContent).toContain("✓ Finished");
    expect(card?.querySelector(".mb-stars")?.getAttribute("aria-label")).toBe("3 of 3 stars");
    expect(container.textContent).toContain("finished 1 of 14 books");
  });
});
