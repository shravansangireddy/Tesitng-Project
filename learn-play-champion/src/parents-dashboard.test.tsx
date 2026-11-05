// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { initialProgress } from "./game";

let root: Root, container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  history.replaceState(null, "", "/");
  container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
function button(text: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.includes(text));
}
function navLabels() {
  const nav = container.querySelector('nav[aria-label="Main navigation"]');
  return [...(nav?.querySelectorAll("button") ?? [])].map((b) => b.textContent?.trim());
}
async function click(element: HTMLElement) { await act(async () => element.click()); }

describe("parents dashboard entry point", () => {
  it("keeps the Privacy & data tile out of the main navigation for guests, grown-ups, and kid sessions", async () => {
    await act(async () => root.render(<App />));
    expect(navLabels()).toContain("My dashboard");
    expect(navLabels().some((label) => label?.includes("Privacy"))).toBe(false);
    expect(button("Parents dashboard")).toBeUndefined();

    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={vi.fn()} />));
    expect(navLabels().some((label) => label?.includes("Privacy"))).toBe(false);

    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={vi.fn()} singleLearner />));
    expect(navLabels().some((label) => label?.includes("Privacy"))).toBe(false);
    expect(button("Parents dashboard")).toBeUndefined();
  });

  it("shows a Parents dashboard entry to a signed-in grown-up and opens the privacy & data tools", async () => {
    await act(async () => root.render(<App cloudProgress={initialProgress} onProgressChange={vi.fn()} />));
    const entry = button("Parents dashboard");
    expect(entry).toBeDefined();
    expect(container.querySelector(".privacy-center")).toBeNull();
    await click(entry!);
    const center = container.querySelector(".privacy-center");
    expect(center).not.toBeNull();
    expect(center?.querySelector("h1")?.textContent).toBe("Parents dashboard");
    // The panels that make up the old Privacy & data view still render here.
    expect(container.querySelector(".donation-panel")).not.toBeNull();
    expect(center?.textContent).toContain("Erase cloud learning data");
  });
});
