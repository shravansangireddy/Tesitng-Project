// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { getLearningContent } from "./content";
import { STORAGE_KEY, parseProgress } from "./game";

let container: HTMLDivElement, root: Root;
function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
function answerButton(answer: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>(".answer-option")].find((b) => b.dataset.answer === answer);
  if (!found) throw new Error(`Missing answer option ${answer}`);
  return found;
}
function wrongButton(answer: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>(".answer-option")].find((b) => b.dataset.answer !== answer);
  if (!found) throw new Error("Missing wrong answer option");
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.spyOn(window, "confirm").mockReturnValue(true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

// With Math.random stubbed to 0 the first monster is Sproutle and every
// round serves the first set of five grade-1 questions in order.
const questions = getLearningContent().grades["1"].lessons.vocabulary.questions.slice(0, 5);

async function openBattle() {
  await act(async () => root.render(<App />));
  await click(button("Enter Word Battle"));
  expect(container.querySelector(".wb-monster-card h2")?.textContent).toBe("Sproutle");
  await click(button("Battle with Meaning Match words"));
}
async function answerAndContinue(pick: (answer: string) => HTMLButtonElement, index: number) {
  await click(pick(questions[index].answer));
  await click(button("Keep battling"));
}

describe("Word Battle integration", () => {
  it("wins a vocabulary battle, captures the monster, and saves points and mastery", async () => {
    await openBattle();
    // Three correct answers defeat Sproutle (grade-1 hearts: 27; 3 hits = 36).
    for (let i = 0; i < 2; i++) await answerAndContinue(answerButton, i);
    await click(answerButton(questions[2].answer));
    expect(container.querySelector(".wb-result")?.textContent).toContain("joins your collection");
    expect(container.querySelector(".wb-result")?.textContent).toContain("You earned 30 points");
    const saved = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.points).toBe(30);
    expect(saved.wordBattle?.collection).toEqual(["sproutle"]);
    expect(Object.keys(saved.wordBattle?.wordMastery ?? {}).length).toBeGreaterThan(0);
    await click(button("See your collection"));
    expect(container.querySelector(".wb-shelf")?.textContent).toContain("1 / 12 monsters");
    expect(container.querySelector(".wb-shelf")?.textContent).toContain("Sproutle");
  });
  it("loses a battle with wrong answers and captures nothing", async () => {
    await openBattle();
    // Five wrong answers at grade 1 cost 9 hearts each: the champion faints.
    for (let i = 0; i < 4; i++) await answerAndContinue(wrongButton, i);
    await click(wrongButton(questions[4].answer));
    expect(container.querySelector(".wb-result")?.textContent).toContain("tuckered out");
    const saved = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.points).toBe(0);
    expect(saved.wordBattle?.collection).toEqual([]);
    await click(button("See your collection"));
    expect(container.querySelector(".wb-shelf")?.textContent).toContain("0 / 12 monsters");
  });
});
