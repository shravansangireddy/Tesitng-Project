// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEY, initialProgress, parseProgress } from "./game";

let container: HTMLDivElement, root: Root;
function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function choose(select: HTMLSelectElement, value: string) {
  await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
function group(name: string) {
  const found = [...container.querySelectorAll("fieldset")].find((e) => e.querySelector("legend")?.textContent === name);
  if (!found) throw new Error(`Missing block group ${name}`);
  return found;
}
async function add(kind = "move", name = "Main program") {
  const fieldset = group(name);
  const select = fieldset.querySelector<HTMLSelectElement>(":scope > .code-add select")!;
  await choose(select, kind);
  await click(fieldset.querySelector<HTMLButtonElement>(":scope > .code-add button")!);
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
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
describe("Coding Cove integration", () => {
  it("opens from dashboard, solves with blocks, traces steps, and saves once across remounts", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore Coding Cove"));
    expect(container.querySelector(".coding-selector select")?.textContent).toContain("Grade 3");
    expect(container.querySelector(".voice-panel")).toBeNull();
    expect(document.activeElement).toBe(container.querySelector("h1"));
    await add(); await add(); await add();
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Delivery complete");
    const save = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(save.points).toBe(10);
    expect(save.codingCompleted).toEqual(["3-sequence"]);
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("column 4");
    await click(button("Rewind"));
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("column 1");
    await click(button("Next step"));
    expect(container.querySelector('[role="img"]')?.getAttribute("aria-label")).toContain("column 2");
    await click(button("Run my program"));
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).points).toBe(10);
    await act(async () => root.render(<App key="reloaded" />));
    await click(button("Explore Coding Cove"));
    expect(button("1. Sequencing").textContent).toContain("solved");
  });
  it("runs nested loop blocks from the actual editor and never rewards unfinished plans", async () => {
    await act(async () => root.render(<App />));
    await click(button("Coding Cove · 3–5"));
    await choose(container.querySelector<HTMLSelectElement>(".coding-selector select")!, "5");
    await click(button("4. Nested loops"));
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Add an instruction");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await add("repeat");
    await add("repeat", "Main program / repeat 1");
    await add("move", "Main program / repeat 1 / repeat 1");
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Delivery complete");
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).codingCompleted).toEqual(["5-repeat"]);
    await click(button("Reset robot"));
    expect(container.querySelector(".coding-trace")).toBeNull();
    expect(container.querySelectorAll(".code-repeat")).toHaveLength(2);
  });
  it("builds and calls Helper, and supports remove/reorder for debugging", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore Coding Cove"));
    await click(button("6. Functions"));
    await add("move", "Helper function"); await add("move", "Helper function");
    await add("call"); await add("call");
    expect(group("Helper function").querySelector("select")?.textContent).not.toContain("Call Helper");
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Delivery complete");
    await click(button("3. Debugging"));
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Bump");
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Remove instruction 1 from Main program"]')!);
    await add(); await add();
    await click(container.querySelector<HTMLButtonElement>('[aria-label="Move instruction 3 up in Main program"]')!);
    await click(button("Run my program"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Delivery complete");
  });
  it("builds both condition branches and reads the trace for changing robot state", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore Coding Cove"));
    await choose(container.querySelector<HTMLSelectElement>(".coding-selector select")!, "4");
    await click(button("5. Conditions"));
    await add("repeat");
    const count = container.querySelector<HTMLSelectElement>('[aria-label="Repeat count for instruction 1 in Main program"]')!;
    await choose(count, "5");
    await add("if", "Main program / repeat 1");
    await add("move", "Main program / repeat 1 / Then 1");
    await add("right", "Main program / repeat 1 / Else 1 (optional)");
    await click(button("Run this plan"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("Delivery complete");
    expect(container.querySelector(".coding-result")?.textContent).toContain("First solve: +10");
    expect(document.activeElement).toBe(container.querySelector(".coding-result"));
    expect(parseProgress(localStorage.getItem(STORAGE_KEY)!).codingCompleted).toEqual(["4-condition"]);
    await click(button("Run this plan"));
    expect(container.querySelector(".coding-result")?.textContent).toContain("no extra points");
  });
  it("retains plans when leaving or switching lessons is canceled", async () => {
    await act(async () => root.render(<App />));
    await click(button("Explore Coding Cove"));
    await add();
    vi.mocked(window.confirm).mockReturnValue(false);
    await click(button("My dashboard"));
    expect(container.querySelector(".coding-world")).not.toBeNull();
    await choose(container.querySelector<HTMLSelectElement>(".coding-selector select")!, "4");
    expect(container.querySelector<HTMLSelectElement>(".coding-selector select")!.value).toBe("3");
    await click(button("2. Directions"));
    expect(container.querySelector(".coding-lesson h2")?.textContent).toBe("Robot's first delivery");
    expect(container.querySelectorAll(".code-move")).toHaveLength(1);
    await click(button("Clear blocks"));
    expect(container.querySelectorAll(".code-move")).toHaveLength(1);
  });
  it("uses selected Grade 4 and publishes completion through the existing cloud callback", async () => {
    const onProgressChange = vi.fn();
    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={onProgressChange} />));
    await choose(container.querySelector<HTMLSelectElement>("#learning-grade")!, "4");
    await click(button("Explore Coding Cove"));
    expect(container.querySelector<HTMLSelectElement>(".coding-selector select")!.value).toBe("4");
    for (let i = 0; i < 4; i++) await add();
    await click(button("Run my program"));
    expect(onProgressChange).toHaveBeenLastCalledWith(expect.objectContaining({ points: 10, codingCompleted: ["4-sequence"] }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
