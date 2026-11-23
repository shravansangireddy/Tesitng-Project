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
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
function button(text: string) {
  return [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent?.includes(text),
  );
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}

/** Starts the first Adventures activity and answers all five questions
 * (any answer advances the round), landing on the results screen. */
async function playOneRound() {
  await click(button("Adventures")!);
  await click(container.querySelector<HTMLButtonElement>(".activity-card button")!);
  for (let q = 0; q < 5; q++) {
    const option = container.querySelector<HTMLButtonElement>(".answer-option");
    if (option) {
      await click(option);
    } else {
      const input = container.querySelector<HTMLInputElement>("#spelling-answer")!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(input, "test");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await click(button("Check my word")!);
    }
    await click(button(q === 4 ? "See my results" : "Next discovery")!);
  }
  expect(container.querySelector(".results")).not.toBeNull();
}

describe("guest save-progress card (signup plan Step 1)", () => {
  it("offers a free account on the results screen after a guest round, and the button opens sign-in", async () => {
    const onGuestSignUp = vi.fn();
    await act(async () =>
      root.render(<App guestMode onGuestSignUp={onGuestSignUp} />),
    );
    expect(container.querySelector(".guest-save-card")).toBeNull();
    await playOneRound();
    const card = container.querySelector(".guest-save-card");
    expect(card).not.toBeNull();
    expect(card!.textContent).toContain(
      "Save progress from now on + unlock all 18,216 questions",
    );
    await click(button("Create a free account")!);
    expect(onGuestSignUp).toHaveBeenCalledTimes(1);
  });

  it("hides for the rest of the session when the guest taps Maybe later", async () => {
    await act(async () =>
      root.render(<App guestMode onGuestSignUp={vi.fn()} />),
    );
    await playOneRound();
    expect(container.querySelector(".guest-save-card")).not.toBeNull();
    await click(button("Maybe later")!);
    expect(container.querySelector(".guest-save-card")).toBeNull();
  });

  it("never shows to a signed-in grown-up session", async () => {
    await act(async () =>
      root.render(
        <App cloudProgress={initialProgress} onProgressChange={vi.fn()} />,
      ),
    );
    await playOneRound();
    expect(container.querySelector(".guest-save-card")).toBeNull();
  });
});
