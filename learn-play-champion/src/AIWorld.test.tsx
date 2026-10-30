// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { aiLessons } from "./ai-learning";
import { initialProgress, parseProgress, STORAGE_KEY } from "./game";

let container: HTMLDivElement, root: Root;
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function choose(selector: string, value: string) {
  const select = container.querySelector<HTMLSelectElement>(selector)!;
  await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove(); vi.restoreAllMocks();
});
describe("AI discovery integration", () => {
  it("opens from dashboard, teaches simple terms, and rewards only correct first checks", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore AI discovery"));
    expect(container.querySelector(".voice-panel")).toBeNull();
    expect(container.querySelector(".ai-definition")?.textContent).toContain("Pattern");
    await click(button("Triangle"));
    expect(container.querySelector(".ai-feedback")?.textContent).toContain("choose again");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await click(button("Circle"));
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).aiCompleted).toEqual(["patterns"]);
    await click(button("Circle"));
    await choose(".ai-path select", "5");
    expect(container.querySelector(".ai-lesson")?.textContent).toContain(aiLessons[0].extend[2]);
    await click(button("Circle"));
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).points).toBe(10);
    await click(button("Next lesson"));
    expect(document.activeElement).toBe(container.querySelector(".ai-lesson h2"));
    expect(container.querySelector(".ai-feedback")).toBeNull();
    await click(button("Previous lesson"));
    expect(button("1. Pattern").textContent).toContain("complete");
  });
  it("can finish all lessons and retains them after reload", async () => {
    await act(async () => root.render(<App />));
    await click(button("AI discovery · 3+"));
    for (const [index, lesson] of aiLessons.entries()) {
      await click(button(lesson.answer));
      if (index < aiLessons.length - 1) await click(button("Next lesson"));
    }
    const saved = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.points).toBe(60);
    expect(saved.aiCompleted).toHaveLength(6);
    expect(saved.rounds).toBe(0);
    await act(async () => root.render(<App key="reload" />));
    await click(button("Explore AI discovery"));
    expect(container.querySelector(".ai-path")?.textContent).toContain("6/6 completed");
  });
  it("trains a visible model, checks errors and missing examples, then retrains after edits", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore AI discovery"));
    expect(container.querySelector(".ai-model-table")).toBeNull();
    await click(button("Train model"));
    expect(container.querySelector(".ai-model-table caption")?.textContent).toContain("color");
    await click(button("Check two new cards"));
    expect(container.querySelector(".ai-checks")?.textContent).toContain("This guess is wrong");
    expect(container.querySelector(".ai-checks")?.textContent).toContain("A tie");
    await choose(".ai-actions select", "shape");
    expect(container.querySelector(".ai-model-table")).toBeNull();
    await click(button("Train model")); await click(button("Check two new cards"));
    expect(container.querySelector(".ai-checks")?.textContent).toContain("This guess matches");
    expect(container.querySelector(".ai-checks")?.textContent).toContain("No triangle examples");
    await choose(".ai-example-builder label:nth-of-type(2) select", "triangle");
    await choose(".ai-example-builder label:nth-of-type(3) select", "Moon");
    await click(button("Add example"));
    expect(container.querySelector(".ai-model-table")).toBeNull();
    await click(button("Train model")); await click(button("Check two new cards"));
    expect(container.querySelector(".ai-checks")?.textContent).toContain("Already in training");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("limits examples, disables empty training, and resets the lab", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore AI discovery"));
    for (let i = 0; i < 5; i++) await click(button("Add example"));
    expect(button("Add example").disabled).toBe(true);
    for (let i = 0; i < 8; i++) await click(button("Remove"));
    expect(button("Train model").disabled).toBe(true);
    await click(button("Reset lab"));
    expect(container.querySelectorAll(".ai-examples li")).toHaveLength(3);
    expect(button("Train model").disabled).toBe(false);
  });
  it("uses grade discussion level and existing cloud progress callback without storing lab examples", async () => {
    const onProgressChange = vi.fn();
    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={onProgressChange} />));
    await choose("#learning-grade", "4");
    onProgressChange.mockClear();
    await click(button("Explore AI discovery"));
    expect(container.querySelector<HTMLSelectElement>(".ai-path select")!.value).toBe("4");
    await click(button("Circle"));
    expect(onProgressChange).toHaveBeenLastCalledWith(expect.objectContaining({ points: 10, aiCompleted: ["patterns"] }));
    await click(button("Train model"));
    expect(onProgressChange).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
