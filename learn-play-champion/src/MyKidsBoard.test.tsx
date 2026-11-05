// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import App from "./App";
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

/** Same fake Supabase shape as the Family Leaderboard tests, plus a log
 * of every table touched so tests can prove kid sessions never fetch. */
function stubClient(kidRows: unknown[], tables: string[]) {
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
    },
    from: (table: string) => {
      tables.push(table);
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

async function openLeaderboard() {
  const nav = container.querySelector('nav[aria-label="Main navigation"]');
  const button = [...(nav?.querySelectorAll("button") ?? [])].find((b) =>
    b.textContent?.includes("Leaderboard"),
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

describe("My kids board on the Leaderboard view", () => {
  it("ranks a grown-up's real kids by points above the cheer board", async () => {
    const client = stubClient(KID_ROWS, []);
    await act(async () =>
      root.render(
        <App
          cloudProgress={initialProgress}
          onProgressChange={vi.fn()}
          roomClient={client}
        />,
      ),
    );
    await openLeaderboard();

    const board = container.querySelector(".my-kids-board");
    expect(board).not.toBeNull();
    const text = board?.textContent ?? "";
    expect(text).toContain("My kids");
    expect(text).toContain("Your children's real positions, by points.");
    // Ranked by real points: Avyan (300) ahead of Zara (120) ahead of
    // Miso (0), even though Zara's login was created first.
    expect(text.indexOf("Avyan")).toBeLessThan(text.indexOf("Zara"));
    expect(text.indexOf("Zara")).toBeLessThan(text.indexOf("Miso"));
    expect(text).toContain("🥇");
    expect(text).toContain("🥈");
    expect(text).toContain("🥉");
    expect(text).toContain("Grade 4");
    expect(text).toContain("300");
    expect(text).toContain("4-day streak");
    // The kid with no saved progress still appears, with a friendly note.
    expect(text).toContain("Not played yet");

    // The demo cheer board still renders, below the My kids board.
    const cheer = container.querySelector(".leaderboard-panel");
    expect(cheer).not.toBeNull();
    expect(cheer?.textContent).toContain("A friendly little cheer");
    expect(
      board!.compareDocumentPosition(cheer!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows a friendly empty state when the grown-up manages no kid logins", async () => {
    const client = stubClient([], []);
    await act(async () =>
      root.render(
        <App
          cloudProgress={initialProgress}
          onProgressChange={vi.fn()}
          roomClient={client}
        />,
      ),
    );
    await openLeaderboard();

    const board = container.querySelector(".my-kids-board");
    expect(board).not.toBeNull();
    expect(board?.textContent).toContain("No kid logins yet");
    expect(board?.textContent).toContain("Parents dashboard");
    expect(board?.querySelector(".my-kids-list")).toBeNull();
    // The cheer board is unaffected.
    expect(container.querySelector(".leaderboard-panel")?.textContent).toContain(
      "A friendly little cheer",
    );
  });

  it("leaves no trace for a kid-login session and never fetches kid data", async () => {
    const tables: string[] = [];
    const client = stubClient(KID_ROWS, tables);
    await act(async () =>
      root.render(
        <App
          cloudProgress={initialProgress}
          onProgressChange={vi.fn()}
          roomClient={client}
          singleLearner
          taskClient={client}
          kidUserId="kid-avyan"
        />,
      ),
    );
    await openLeaderboard();

    expect(container.querySelector(".my-kids-board")).toBeNull();
    expect(container.textContent).not.toContain("My kids");
    expect(container.querySelector(".leaderboard-panel")?.textContent).toContain(
      "A friendly little cheer",
    );
    expect(tables).not.toContain("kid_accounts");
    expect(tables).not.toContain("learner_progress");
  });

  it("leaves no trace for a guest session", async () => {
    await act(async () => root.render(<App />));
    await openLeaderboard();

    expect(container.querySelector(".my-kids-board")).toBeNull();
    expect(container.textContent).not.toContain("My kids");
    expect(container.querySelector(".leaderboard-panel")?.textContent).toContain(
      "A friendly little cheer",
    );
  });
});
