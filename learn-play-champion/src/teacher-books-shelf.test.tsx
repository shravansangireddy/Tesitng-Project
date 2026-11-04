// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MotivationBooks from "./MotivationBooks";
import type { MotivationBookOutcome } from "./game";
import {
  motivationBooks,
  type MotivationBook,
} from "./motivation-books";

// An uploaded book, exactly as Teacher Studio would save one.
const uploadedBook: MotivationBook = {
  id: "u-teacher-fox",
  grade: "2",
  title: "The Kind Little Fox",
  emoji: "🦊",
  theme: "Kindness",
  pages: [
    "Fox woke up hungry and smelled warm bread.",
    "Mole had dropped his lunch in the mud.",
    "Fox shared his bread, and both friends smiled.",
  ],
  questions: [
    {
      prompt: "What did Fox smell?",
      options: ["Rain", "Warm bread", "Flowers"],
      answer: 1,
      explanation: "The story says Fox smelled warm bread.",
    },
    {
      prompt: "Who dropped his lunch?",
      options: ["Fox", "Owl", "Mole"],
      answer: 2,
      explanation: "Mole dropped his lunch in the mud.",
    },
    {
      prompt: "What did Fox share?",
      options: ["His bread", "His hat", "His boat"],
      answer: 0,
      explanation: "Fox shared his bread.",
    },
    {
      prompt: "How did the friends feel at the end?",
      options: ["Angry", "Happy", "Sleepy"],
      answer: 1,
      explanation: "Both friends smiled.",
    },
    {
      prompt: "Your turn: a friend has no snack. What could you do?",
      options: ["Keep mine", "Laugh", "Share a little"],
      answer: 2,
      explanation: "Sharing a little is the kind choice.",
    },
  ],
};

let container: HTMLDivElement;
let root: Root;

async function render(node: ReactNode) {
  await act(async () => root.render(node));
}
function button(text: string, within: ParentNode = container): HTMLButtonElement {
  const found = [...within.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.includes(text),
  );
  if (!found) throw new Error(`Button not found: ${text}`);
  return found;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("Motivation Books shelf with teacher uploads", () => {
  it("shows the uploaded book with its badge and counts it", async () => {
    await render(
      <MotivationBooks
        grade="2"
        state={undefined}
        extraBooks={[uploadedBook]}
        onBookComplete={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(container.textContent).toContain("The Kind Little Fox");
    expect(container.textContent).toContain("From my teacher");
    expect(container.textContent).toContain(
      `finished 0 of ${motivationBooks.length + 1} books`,
    );
  });

  it("plays an uploaded book end to end and reports its id", async () => {
    const outcomes: MotivationBookOutcome[] = [];
    await render(
      <MotivationBooks
        grade="2"
        state={undefined}
        extraBooks={[uploadedBook]}
        onBookComplete={(outcome) => outcomes.push(outcome)}
        onBack={vi.fn()}
      />,
    );
    const card = [...container.querySelectorAll(".mb-book-card")].find(
      (entry) => entry.textContent?.includes("The Kind Little Fox"),
    );
    if (!card) throw new Error("Uploaded book card not found");
    await click(button("Read this book", card));
    for (let page = 0; page < uploadedBook.pages.length - 1; page++) {
      await click(button("Next page"));
    }
    await click(button("Answer the questions"));
    for (let index = 0; index < uploadedBook.questions.length; index++) {
      const question = uploadedBook.questions[index];
      const correct = [
        ...container.querySelectorAll<HTMLButtonElement>(".answer-option"),
      ].find(
        (option) => option.dataset.answer === question.options[question.answer],
      );
      if (!correct) throw new Error("Missing correct answer option");
      await click(correct);
      await click(
        button(
          index === uploadedBook.questions.length - 1
            ? "See my results"
            : "Next question",
        ),
      );
    }
    expect(container.querySelector(".mb-done")?.textContent).toContain(
      "50 points",
    );
    expect(outcomes).toEqual([{ bookId: "u-teacher-fox", correct: 5 }]);
  });
});
