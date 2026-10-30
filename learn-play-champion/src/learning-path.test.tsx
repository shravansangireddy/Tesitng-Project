// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gradeIds, lessonIds } from "./content-schema";
import { completeRound, initialProgress, parseProgress, STORAGE_KEY, type Progress } from "./game";
import { finishPathCheck, makePathCheck, pathRecommendations, validPathChecks } from "./learning-path";
import LearningPath from "./LearningPath";
import App from "./App";

const date = "2026-10-29";
const responses = (grade = "1" as const, correct = true) =>
  makePathCheck(grade, 0).map(({ id }) => ({ id, correct }));

describe("learning path rules and save compatibility", () => {
  it("rotates through all skills and question variants in every grade", () => {
    for (const grade of gradeIds) {
      const skills = new Set<string>(), prompts = new Set<string>();
      for (let round = 0; round < 15; round++) {
        const check = makePathCheck(grade, round);
        expect(check).toHaveLength(8);
        expect(new Set(check.map(q => q.id)).size).toBe(8);
        for (const item of check) { skills.add(item.id); prompts.add(item.question.prompt); }
      }
      expect([...skills].sort()).toEqual([...lessonIds].sort());
      expect(prompts.size).toBeGreaterThan(16);
    }
  });
  it("saves only completed check summaries without rewarding points or changing grade", () => {
    const updated = finishPathCheck(initialProgress, "1", responses(), date);
    expect(updated).toEqual({ ...initialProgress, pathChecks: {
      "1": { rounds: 1, results: Object.fromEntries(responses().map(({ id, correct }) => [id, { correct, date }])) },
    } });
    expect(parseProgress(JSON.stringify(updated))).toEqual(updated);
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
    expect(() => finishPathCheck(initialProgress, "1", responses().slice(1), date)).toThrow();
    expect(() => finishPathCheck(initialProgress, "1", responses().reverse(), date)).toThrow();
  });
  it("isolates grades and retains sampled results while rotating", () => {
    let updated = finishPathCheck(initialProgress, "1", responses("1", false), date);
    updated = finishPathCheck(updated, "2", makePathCheck("2", 0).map(({ id }) => ({ id, correct: true })), date);
    updated = finishPathCheck(updated, "1", makePathCheck("1", 1).map(({ id }) => ({ id, correct: true })), date);
    expect(updated.pathChecks?.["1"]?.rounds).toBe(2);
    expect(updated.pathChecks?.["1"]?.results.reading?.correct).toBe(false);
    expect(updated.pathChecks?.["2"]?.results.reading?.correct).toBe(true);
    expect(pathRecommendations(updated, "5").every(item => item.priority === 1)).toBe(true);
  });
  it("prioritizes missed questions, unexplored skills, practice, then review", () => {
    const progress = finishPathCheck(initialProgress, "1", responses(), date);
    progress.pathChecks!["1"]!.results.sight!.correct = false;
    progress.gradeBestRounds = { "1:reading": 5, "1:arithmetic": 2 };
    const recommendations = pathRecommendations(progress, "1");
    expect(recommendations[0].id).toBe("sight");
    expect(recommendations.map(item => item.priority)).toEqual([...recommendations.map(item => item.priority)].sort());
    expect(recommendations[recommendations.length - 1]?.id).toBe("reading");
  });
  it("rejects malformed or oversized save shapes and impossible dates", () => {
    const valid = finishPathCheck(initialProgress, "1", responses(), date);
    for (const invalid of [null, [], { "8": valid.pathChecks?.["1"] },
      { "1": { rounds: 1, results: {} } }, { "1": { ...valid.pathChecks?.["1"], rounds: -1 } }]) {
      expect(validPathChecks(invalid)).toBe(false);
      expect(() => parseProgress(JSON.stringify({ ...initialProgress, pathChecks: invalid }))).toThrow();
    }
    for (const badDate of ["2026-02-30", "2026-13-01", "oops"]) {
      const invalid = structuredClone(valid.pathChecks);
      invalid!["1"]!.results.sight!.date = badDate;
      expect(validPathChecks(invalid)).toBe(false);
    }
  });
  it("preserves checks during ordinary rounds, without treating them as room completions", () => {
    const checked = finishPathCheck(initialProgress, "1", responses(), date);
    const updated = completeRound(checked, "sight", Array.from({ length: 5 }, () => ({ correct: true, speed: false })), new Date(), "1").progress;
    expect(updated.pathChecks).toEqual(checked.pathChecks);
    expect(checked.rounds).toBe(0);
    expect(updated.rounds).toBe(1);
  });
});

let root: Root, container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear(); history.replaceState(null, "", "/");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function click(text: string) { await act(async () => button(text).click()); }
async function answerCurrent(answer: string) {
  const input = container.querySelector<HTMLInputElement>(".learning-path input");
  if (input) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, answer);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Check answer");
  } else await click(answer);
}
describe("learning path interaction", () => {
  it("finishes eight questions, persists through App, and opens a recommended adventure", async () => {
    await act(async () => root.render(<App initialGrade="1" />));
    await click("My learning path"); await click("Start eight-question");
    for (const [index, item] of makePathCheck("1", 0).entries()) {
      await answerCurrent(item.question.answer);
      expect(container.querySelector("[role=status]")?.textContent).toContain("You found it");
      await click(index === 7 ? "Finish practice check" : "Next question");
    }
    const saved = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.pathChecks?.["1"]?.rounds).toBe(1);
    expect(saved.rounds).toBe(0); expect(saved.points).toBe(0);
    expect(saved.selectedGrade).toBe("1");
    const recommendation = pathRecommendations(saved, "1")[0];
    await click(`Practice ${recommendation.title}`);
    expect(container.querySelector(".learning-path")).toBeNull();
    expect(container.textContent).toContain(recommendation.title);
    expect(container.textContent).toContain("QUESTION 1 OF 5");
  });
  it("warns before navigation or account changes and discards only unfinished checks", async () => {
    const account = vi.fn();
    await act(async () => root.render(<App initialGrade="2" accountControls={<button onClick={account}>Account test</button>} />));
    await click("My learning path"); await click("Start eight-question");
    vi.mocked(window.confirm).mockReturnValue(false);
    await click("My dashboard"); expect(container.textContent).toContain("Question 1 of 8");
    await click("Account test"); expect(account).not.toHaveBeenCalled();
    await click("Stop practice check"); expect(container.textContent).toContain("Question 1 of 8");
    vi.mocked(window.confirm).mockReturnValue(true);
    await click("My dashboard"); await click("My learning path");
    expect(container.textContent).toContain("Start eight-question");
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).pathChecks).toBeUndefined();
  });
  it("shows encouragement for a wrong answer and only accepts the first answer", async () => {
    const complete = vi.fn(), dirty = vi.fn(), practice = vi.fn();
    await act(async () => root.render(<LearningPath grade="1" progress={initialProgress}
      onComplete={complete} onDirty={dirty} onPractice={practice} />));
    await click("Start eight-question");
    const q = makePathCheck("1", 0)[0].question;
    await answerCurrent(q.options!.find(option => option !== q.answer)!);
    expect(container.textContent).toContain("practice together");
    expect(container.querySelectorAll(".path-choices button:disabled")).toHaveLength(q.options!.length);
    expect(complete).not.toHaveBeenCalled();
    await click("Stop practice check");
    expect(dirty).toHaveBeenLastCalledWith(false);
  });
  it("uses configured account save callback instead of guest storage", async () => {
    const save = vi.fn<(p: Progress) => void>();
    await act(async () => root.render(<App cloudProgress={{ ...initialProgress, selectedGrade: "5" }} onProgressChange={save} />));
    await click("My learning path"); expect(container.textContent).toContain("Grade 5");
    await click("Start eight-question");
    for (const [index, item] of makePathCheck("5", 0).entries()) {
      await answerCurrent(item.question.answer);
      await click(index === 7 ? "Finish practice check" : "Next question");
    }
    expect(save.mock.calls[save.mock.calls.length - 1]?.[0].pathChecks?.["5"]?.rounds).toBe(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
