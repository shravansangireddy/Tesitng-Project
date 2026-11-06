// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import MotivationBooks from "./MotivationBooks";
import { bookById, type MotivationBook } from "./motivation-books";
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
  it("shelves the six books for the current level and hides other levels", async () => {
    await act(async () => root.render(
      <MotivationBooks grade="prek" state={undefined} onBookComplete={() => {}} onBack={() => {}} />,
    ));
    expect(container.textContent).toContain("Nia and the Tiny Seed");
    expect(container.textContent).toContain("Benny Shares the Blocks");
    expect(container.textContent).toContain("Zoe Says How She Feels");
    expect(container.textContent).toContain("Ari's Gentle Hands");
    expect(container.textContent).toContain("Ruby Meets a New Friend");
    expect(container.textContent).toContain("The Tidy-Up Team");
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
    expect(container.textContent).toContain("finished 1 of 50 books");
  });
});

/** A minimal fake cloud client: getUser plus the kid_accounts lookup
 * fetchOwnKidAccount performs. `ownKidRow` is the signed-in user's own
 * kid-account row, or null when they are not a kid login. */
function stubSessionClient(userId: string, ownKidRow: unknown) {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: userId } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: ownKidRow, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
function cardButton(title: string, label: string) {
  const card = [...container.querySelectorAll(".mb-book-card")]
    .find((entry) => entry.textContent?.includes(title));
  if (!card) throw new Error(`Missing shelf card ${title}`);
  return button(label, card);
}

const teacherBookNoDescription: MotivationBook = {
  id: "u-foxbook",
  grade: "prek",
  title: "The Kind Little Fox",
  emoji: "🦊",
  theme: "Kindness",
  pages: [
    "Foxpage secret one.",
    "Foxpage secret two.",
    "Foxpage secret three.",
  ],
  questions: [1, 2, 3, 4, 5].map((n) => ({
    prompt: `Foxquiz prompt ${n}?`,
    options: ["Alpha", "Beta", "Gamma"],
    answer: 0,
    explanation: `Foxquiz why ${n}.`,
  })),
};

describe("Motivation Books for grown-ups", () => {
  it("shows a confirmed grown-up the description only — never the story or questions", async () => {
    const outcomes: MotivationBookOutcome[] = [];
    const client = stubSessionClient("adult-one", null);
    await act(async () => root.render(
      <MotivationBooks
        grade="prek"
        state={{ completed: ["prek-seed"], bestScores: { "prek-seed": 5 } }}
        onBookComplete={(outcome) => outcomes.push(outcome)}
        onBack={() => {}}
        grownUpClient={client}
      />,
    ));
    await settle();
    // The shelf swaps reading for descriptions and drops the kid
    // completion UI (no ✓, no stars, no finished count, no points copy).
    expect(container.textContent).toContain("See description");
    expect(container.textContent).not.toContain("Read this book");
    expect(container.textContent).not.toContain("✓ Finished");
    expect(container.textContent).not.toContain("You have finished");
    expect(container.querySelector(".mb-stars")).toBeNull();

    await click(cardButton("Nia and the Tiny Seed", "See description"));
    const panel = container.querySelector(".mb-description");
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain(seed.description);
    expect(panel?.textContent).toContain(
      `${seed.pages.length}-page story · ${seed.questions.length} questions`,
    );
    expect(panel?.textContent).toContain(
      "Grown-ups see the description. Kids get the full story and questions from their own login.",
    );
    // The story text and every question string are absent from the
    // whole rendered output — not hidden, never rendered.
    for (const pageText of seed.pages) {
      expect(container.textContent).not.toContain(pageText);
    }
    for (const question of seed.questions) {
      expect(container.textContent).not.toContain(question.prompt);
      for (const option of question.options) {
        expect(container.textContent).not.toContain(option);
      }
      expect(container.textContent).not.toContain(question.explanation);
    }
    expect(container.querySelector(".mb-reader")).toBeNull();
    expect(container.querySelector(".mb-quiz")).toBeNull();
    expect(outcomes).toEqual([]);
  });

  it("falls back to the theme for a teacher book with no description, badge intact", async () => {
    const client = stubSessionClient("adult-one", null);
    await act(async () => root.render(
      <MotivationBooks
        grade="prek"
        state={undefined}
        onBookComplete={() => {}}
        onBack={() => {}}
        extraBooks={[teacherBookNoDescription]}
        grownUpClient={client}
      />,
    ));
    await settle();
    await click(cardButton("The Kind Little Fox", "See description"));
    const panel = container.querySelector(".mb-description");
    expect(panel?.textContent).toContain("🧑‍🏫 From my teacher");
    expect(panel?.textContent).toContain(
      "A teacher-made story about kindness.",
    );
    expect(panel?.textContent).toContain("3-page story · 5 questions");
    expect(container.textContent).not.toContain("Foxpage secret one.");
    expect(container.textContent).not.toContain("Foxquiz prompt 1?");
  });

  it("shows a teacher book's own DESCRIPTION when it has one", async () => {
    const client = stubSessionClient("adult-one", null);
    const withDescription: MotivationBook = {
      ...teacherBookNoDescription,
      id: "u-foxbook2",
      description: "Fox shares his warm bread with a hungry friend.",
    };
    await act(async () => root.render(
      <MotivationBooks
        grade="prek"
        state={undefined}
        onBookComplete={() => {}}
        onBack={() => {}}
        extraBooks={[withDescription]}
        grownUpClient={client}
      />,
    ));
    await settle();
    await click(cardButton("The Kind Little Fox", "See description"));
    expect(container.querySelector(".mb-description")?.textContent)
      .toContain("Fox shares his warm bread with a hungry friend.");
  });

  it("keeps the full book when the signed-in user is a kid login", async () => {
    const kidRow = {
      kid_user_id: "kid-self",
      parent_id: "adult-one",
      username: "selfkid",
      display_name: "Self Kid",
      grade: "prek",
      active: true,
      created_at: "2026-10-30T00:00:00Z",
    };
    const client = stubSessionClient("kid-self", kidRow);
    await act(async () => root.render(
      <MotivationBooks
        grade="prek"
        state={undefined}
        onBookComplete={() => {}}
        onBack={() => {}}
        grownUpClient={client}
      />,
    ));
    await settle();
    expect(container.textContent).toContain("Read this book");
    expect(container.textContent).not.toContain("See description");
    await click(button("Read this book"));
    expect(container.querySelector(".mb-page-text")?.textContent)
      .toBe(seed.pages[0]);
  });
});
