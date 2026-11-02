// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidLogins from "./KidLogins";
import {
  completeRound,
  initialProgress,
  type ActivityId,
  type Attempt,
  type Progress,
} from "./game";

const KID_ROWS = [
  {
    kid_user_id: "kid-zara",
    parent_id: "adult-one",
    username: "zara",
    display_name: "Zara",
    grade: "2",
    active: true,
    created_at: "2026-10-30T00:00:00Z",
  },
  {
    kid_user_id: "kid-avyan",
    parent_id: "adult-one",
    username: "avyan",
    display_name: "Avyan",
    grade: "4",
    active: true,
    created_at: "2026-10-31T00:00:00Z",
  },
  {
    kid_user_id: "kid-miso",
    parent_id: "adult-one",
    username: "miso",
    display_name: "Miso",
    grade: "k",
    active: true,
    created_at: "2026-11-01T00:00:00Z",
  },
];

/** Build a save through the game's own reducer, so it always parses back. */
function play(progress: Progress, activity: ActivityId, correctCount: number): Progress {
  const attempts: Attempt[] = Array.from({ length: 5 }, (_, index) => ({
    correct: index < correctCount,
    speed: false,
  }));
  return completeRound(progress, activity, attempts).progress;
}

function progressRow(progress: Progress) {
  return {
    data: JSON.parse(JSON.stringify(progress)) as unknown,
    revision: 1,
    updated_at: "2026-11-01T12:00:00Z",
  };
}

const AVYAN_PROGRESS = (() => {
  let progress = play(initialProgress, "sight", 4); // English
  progress = play(progress, "arithmetic", 5); // Math
  progress = play(progress, "geometry", 3); // Math
  return { ...progress, points: 300 };
})();

const PROGRESS_ROWS: Record<string, unknown> = {
  "kid-avyan": progressRow(AVYAN_PROGRESS),
  "kid-zara": progressRow({ ...initialProgress, points: 120, rounds: 0 }),
  // kid-miso has never signed in: no learner_progress row.
};

function stubClient(kidRows: unknown[]) {
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
    },
    from: (table: string) => {
      if (table === "learner_progress") {
        let userId = "";
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: (_column: string, value: string) => {
            userId = value;
            return builder;
          },
          maybeSingle: async () => ({
            data: PROGRESS_ROWS[userId] ?? null,
            error: null,
          }),
        };
        return builder;
      }
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        // fetchOwnKidAccount: the signed-in grown-up is not a kid login.
        maybeSingle: async () => ({ data: null, error: null }),
        // fetchMyKidAccounts / fetchKidTasks resolve the builder itself.
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: table === "kid_accounts" ? kidRows : [],
            error: null,
          }),
      };
      return builder;
    },
    functions: { invoke: vi.fn() },
  };
  return client as unknown as SupabaseClient;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function mount(kidRows: unknown[]) {
  await act(async () => root.render(<KidLogins client={stubClient(kidRows)} />));
}

function button(text: string, scope: ParentNode = container) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent?.includes(text),
  );
  if (!found) throw new Error(`Missing button ${text}`);
  return found;
}

describe("Progress bar charts for parents", () => {
  it("draws a points bar per kid in the Family Leaderboard, scaled to the top scorer", async () => {
    await mount(KID_ROWS);
    const board = container.querySelector(".family-leaderboard");
    expect(board).not.toBeNull();
    const fills = [
      ...(board?.querySelectorAll<HTMLElement>(".family-leaderboard-bar-fill") ?? []),
    ];
    // Ranked order: Avyan 300, Zara 120, Miso 0.
    expect(fills.map((fill) => fill.style.width)).toEqual(["100%", "40%", "0%"]);
    const bars = [...(board?.querySelectorAll(".family-leaderboard-bar") ?? [])];
    expect(bars[0].getAttribute("aria-label")).toBe("Avyan has 300 points");
    // The ranked rows keep all their text stats alongside the bars.
    expect(board?.textContent).toContain("300");
    expect(board?.textContent).toContain("Not played yet");
  });

  it("shows the kid's subject and activity charts inside View progress", async () => {
    await mount([KID_ROWS[1]]); // Avyan only
    await act(async () => button("View progress").click());
    const panel = container.querySelector(".kid-progress");
    expect(panel).not.toBeNull();
    const text = panel?.textContent ?? "";
    expect(text).toContain("Progress charts");
    // English 4 correct (Word Safari); Math 5 + 3 = 8 correct.
    expect(text).toContain("English");
    expect(text).toContain("4 correct");
    expect(text).toContain("Math");
    expect(text).toContain("8 correct");
    expect(text).toContain("Number Sprint");
    expect(text).toContain("Shape Quest");
    const charts = panel?.querySelectorAll(".bar-chart");
    expect(charts?.length).toBe(2);
  });

  it("shows no charts for a kid whose save has no charted correct answers", async () => {
    await mount([KID_ROWS[0]]); // Zara: progress row exists, no rounds played.
    await act(async () => button("View progress").click());
    const panel = container.querySelector(".kid-progress");
    expect(panel).not.toBeNull();
    expect(panel?.textContent).not.toContain("Progress charts");
    expect(panel?.querySelector(".bar-chart")).toBeNull();
  });
});
