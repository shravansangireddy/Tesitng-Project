// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TeacherStudio from "./TeacherStudio";
import {
  isTeacherBookId,
  newTeacherBookId,
  parseTeacherBook,
  type TeacherStore,
} from "./teacher-books";
import { VALID_BOOK_TEXT } from "./teacher-books-fixture";

let container: HTMLDivElement;
let root: Root;

function render(node: ReactNode) {
  act(() => root.render(node));
}
function button(text: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!found) throw new Error(`Button not found: ${text}`);
  return found;
}
function click(text: string) {
  act(() => button(text).click());
}
function setDraft(text: string) {
  const textarea = container.querySelector("textarea");
  if (!textarea) throw new Error("Draft textarea not found");
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  act(() => {
    setter?.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("TeacherStudio", () => {
  it("lets a signed-in grown-up turn the teacher role on", () => {
    const onStoreChange = vi.fn();
    const store: TeacherStore = { teacher: false, books: [] };
    render(<TeacherStudio store={store} onStoreChange={onStoreChange} />);
    expect(container.textContent).toContain("Are you a teacher?");
    expect(container.querySelector("textarea")).toBeNull();
    const checkbox = container.querySelector('input[type="checkbox"]');
    if (!checkbox) throw new Error("Teacher switch not found");
    act(() => (checkbox as HTMLInputElement).click());
    expect(onStoreChange).toHaveBeenCalledWith({ teacher: true, books: [] });
  });

  it("checks, previews and saves a pasted book with an uploaded id", () => {
    const onStoreChange = vi.fn();
    render(
      <TeacherStudio
        store={{ teacher: true, books: [] }}
        onStoreChange={onStoreChange}
      />,
    );
    setDraft(VALID_BOOK_TEXT);
    click("Check my book");
    expect(container.textContent).toContain("The Kind Little Fox");
    expect(container.textContent).toContain("3 pages · 5 questions");
    click("Save to the shelf");
    expect(onStoreChange).toHaveBeenCalledTimes(1);
    const saved = onStoreChange.mock.calls[0][0] as TeacherStore;
    expect(saved.teacher).toBe(true);
    expect(saved.books).toHaveLength(1);
    expect(isTeacherBookId(saved.books[0].id)).toBe(true);
    expect(saved.books[0].title).toBe("The Kind Little Fox");
    expect(container.textContent).toContain("on the Motivation Books shelf now");
  });

  it("lists the checker's errors instead of a preview for a broken book", () => {
    render(
      <TeacherStudio
        store={{ teacher: true, books: [] }}
        onStoreChange={vi.fn()}
      />,
    );
    setDraft(
      VALID_BOOK_TEXT.replace(
        "ANSWER: A\nWHY: Fox shared",
        "WHY: Fox shared",
      ),
    );
    click("Check my book");
    expect(container.textContent).toContain("Question 3 has no ANSWER line");
    expect(
      [...container.querySelectorAll("button")].some((candidate) =>
        candidate.textContent?.includes("Save to the shelf"),
      ),
    ).toBe(false);
  });

  it("lists saved books and deletes one after confirmation", () => {
    const onStoreChange = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const parsed = parseTeacherBook(VALID_BOOK_TEXT).book!;
    const book = { ...parsed, id: newTeacherBookId() };
    render(
      <TeacherStudio
        store={{ teacher: true, books: [book] }}
        onStoreChange={onStoreChange}
      />,
    );
    expect(container.textContent).toContain("Your uploaded books");
    click("Delete");
    expect(onStoreChange).toHaveBeenCalledWith({ teacher: true, books: [] });
  });
});
