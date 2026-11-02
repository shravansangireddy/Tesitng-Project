// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidLogins from "./KidLogins";
import { initialProgress } from "./game";

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

const PROGRESS_ROWS: Record<string, unknown> = {
  "kid-avyan": {
    data: {
      ...initialProgress,
      points: 300,
      streak: 4,
      rounds: 10,
      correct: 40,
      answered: 50,
      lastPlayedDate: "2026-11-01",
    },
    revision: 2,
    updated_at: "2026-11-01T12:00:00Z",
  },
  "kid-zara": {
    data: {
      ...initialProgress,
      points: 120,
      streak: 2,
      rounds: 5,
      correct: 20,
      answered: 25,
      lastPlayedDate: "2026-10-30",
    },
    revision: 1,
    updated_at: "2026-10-30T12:00:00Z",
  },
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

describe("Family Leaderboard in the Kid logins panel", () => {
  it("ranks the parent's kids by points with medals and stats", async () => {
    await mount(KID_ROWS);
    const board = container.querySelector(".family-leaderboard");
    expect(board).not.toBeNull();
    const text = board?.textContent ?? "";
    expect(text).toContain("Family leaderboard");
    // Ranked by points: Avyan (300) ahead of Zara (120) ahead of Miso (0),
    // even though Zara's login was created first.
    expect(text.indexOf("Avyan")).toBeLessThan(text.indexOf("Zara"));
    expect(text.indexOf("Zara")).toBeLessThan(text.indexOf("Miso"));
    expect(text).toContain("🥇");
    expect(text).toContain("🥈");
    expect(text).toContain("🥉");
    expect(text).toContain("300");
    expect(text).toContain("4-day streak");
    expect(text).toContain("80% correct");
    // The kid with no saved progress still appears, with a friendly note.
    expect(text).toContain("Not played yet");
  });

  it("shows a friendly empty state when the parent manages no kids", async () => {
    await mount([]);
    const board = container.querySelector(".family-leaderboard");
    expect(board).not.toBeNull();
    expect(board?.textContent).toContain("No kid logins yet");
    expect(board?.querySelector(".family-leaderboard-list")).toBeNull();
  });
});
