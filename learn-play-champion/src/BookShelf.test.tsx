// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { pictureBooks } from "./books";
import { gradeIds, gradeLabels } from "./content-schema";
import { initialProgress, parseProgress, STORAGE_KEY } from "./game";

let root: Root, container: HTMLDivElement;
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find(item => item.textContent?.includes(text));
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
async function chooseGrade(grade: string) {
  const select = container.querySelector<HTMLSelectElement>("#book-grade")!;
  await act(async () => { select.value = grade; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks();
});
describe("original leveled picture book content", () => {
  it("provides a story and a discovery book for each saved grade with unique IDs and complete art/text/checks", () => {
    expect(pictureBooks).toHaveLength(14);
    expect(new Set(pictureBooks.map(book => book.id)).size).toBe(14);
    for (const grade of gradeIds) {
      const books = pictureBooks.filter(book => book.grade === grade);
      expect(books.map(book => book.kind).sort()).toEqual(["Discover", "Story"]);
      for (const book of books) {
        expect(book.pages).toHaveLength(4);
        for (const page of book.pages) {
          expect(page.text.trim().length).toBeGreaterThan(10);
          expect(page.picture.trim().length).toBeGreaterThan(20);
          expect(page.count).toBeGreaterThanOrEqual(1);
          expect(page.count).toBeLessThanOrEqual(5);
        }
        expect(book.choices).toHaveLength(3);
        expect(new Set(book.choices).size).toBe(3);
        expect(book.answer).toBeGreaterThanOrEqual(0);
        expect(book.answer).toBeLessThan(3);
        expect(book.explanation.length).toBeGreaterThan(30);
      }
    }
    const words = (grade: string) => pictureBooks.filter(b => b.grade === grade)
      .reduce((sum, b) => sum + b.pages.reduce((n, p) => n + p.text.split(/\s+/).length, 0), 0);
    expect(words("prek")).toBeLessThan(words("1"));
    expect(words("1")).toBeLessThan(words("3"));
    expect(words("3")).toBeLessThan(words("5"));
  });
});
describe("bookshelf integration", () => {
  it.each(gradeIds)("opens books for saved level %s, navigates every page, and gives feedback without points or history", async grade => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialProgress, selectedGrade: grade }));
    await act(async () => root.render(<App />));
    const before = localStorage.getItem(STORAGE_KEY);
    await click(button("Explore picture books"));
    expect(container.querySelector<HTMLSelectElement>("#book-grade")?.value).toBe(grade);
    expect(container.querySelectorAll(".book-card")).toHaveLength(2);
    expect(container.querySelector(".voice-panel")).toBeNull();
    for (const book of pictureBooks.filter(item => item.grade === grade)) {
      await click(button(`Read ${book.title}`));
      expect(button("Previous page").disabled).toBe(true);
      for (let index = 0; index < book.pages.length; index++) {
        expect(container.querySelector(".book-page-text")?.textContent).toBe(book.pages[index].text);
        expect(container.querySelector(".book-reader svg")?.getAttribute("aria-label")).toBe(book.pages[index].picture);
        expect(container.querySelector(".book-page-status")?.textContent).toContain(`Page ${index + 1} of 4`);
        expect(document.activeElement).toBe(container.querySelector(".book-reader h2"));
        if (index < book.pages.length - 1) {
          expect(container.querySelector(".book-question")).toBeNull();
          await click(button("Next page"));
        }
      }
      expect(button("Next page").disabled).toBe(true);
      await click(button(book.choices[(book.answer + 1) % 3]));
      expect(container.querySelector(".book-feedback")?.textContent).toContain("try another answer");
      await click(button(book.choices[book.answer]));
      expect(container.querySelector(".book-feedback")?.textContent).toContain("You found it!");
      await click(button("Previous page"));
      expect(container.querySelector(".book-question")).toBeNull();
      await click(button("Next page"));
      await click(button("Read again from the beginning"));
      expect(container.querySelector(".book-page-status")?.textContent).toContain("Page 1 of 4");
      await click(button("Next page")); await click(button("Next page")); await click(button("Next page"));
      expect(container.querySelector(".book-feedback")).toBeNull();
      await click(button("Back to bookshelf"));
    }
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });
  it("changes the shared grade, returns to the matching shelf, and restores grade after reload", async () => {
    await act(async () => root.render(<App />));
    await click(button("Picture books"));
    await click(button(`Read ${pictureBooks.find(book => book.grade === "1")!.title}`));
    await click(button("Next page"));
    await chooseGrade("5");
    expect(container.querySelector(".book-reader")).toBeNull();
    expect(container.querySelector(".book-card")?.textContent).toContain("Grade 5");
    const saved = parseProgress(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.selectedGrade).toBe("5");
    expect(saved.points).toBe(0);
    await click(button("My dashboard"));
    expect(container.querySelector<HTMLSelectElement>("#learning-grade")?.value).toBe("5");
    await act(async () => root.render(<App key="reload" />));
    await click(button("Picture books"));
    expect(container.querySelector<HTMLSelectElement>("#book-grade")?.value).toBe("5");
  });
  it("uses the account grade and only syncs an explicit grade change, never page or answer data", async () => {
    const save = vi.fn();
    await act(async () => root.render(<App cloudProgress={{ ...initialProgress, selectedGrade: "k" }} onProgressChange={save} />));
    await click(button("Picture books"));
    expect(container.querySelector<HTMLSelectElement>("#book-grade")?.value).toBe("k");
    await click(button("Read A Kite for Kit")); await click(button("Next page"));
    expect(save).not.toHaveBeenCalled();
    await chooseGrade("2");
    expect(save).toHaveBeenLastCalledWith({ ...initialProgress, selectedGrade: "2" });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(container.textContent).toContain(gradeLabels["2"]);
  });
});
