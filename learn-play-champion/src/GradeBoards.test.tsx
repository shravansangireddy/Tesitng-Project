// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import GradeBoards from "./GradeBoards";

/**
 * Fake Supabase client for GradeBoards: the session user, the caller's
 * own kid-account lookup (fetchOwnKidAccount), and a stubbed
 * my_kids_grade_boards RPC whose calls are logged so tests can prove
 * kid sessions and guests never trigger it.
 */
function stubClient(options: {
  userId?: string | null;
  ownKidRow?: unknown;
  rpcRows?: unknown[];
  rpcError?: unknown;
  rpcCalls: string[];
}) {
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.userId ? { id: options.userId } : null },
      }),
    },
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => ({
          data: options.ownKidRow ?? null,
          error: null,
        }),
      };
      return builder;
    },
    rpc: async (name: string) => {
      options.rpcCalls.push(name);
      if (options.rpcError) return { data: null, error: options.rpcError };
      return { data: options.rpcRows ?? [], error: null };
    },
  };
  return client as unknown as SupabaseClient;
}

const GRADE2_ROWS = [
  {
    grade: "2",
    kid_user_id: null,
    display_name: null,
    nickname: "Explorer-aaaa2222",
    points: 250,
    streak: 1,
    rounds: 30,
    is_mine: false,
    board_rank: 1,
  },
  {
    grade: "2",
    kid_user_id: "kid-mine",
    display_name: "Avyukth",
    nickname: "Explorer-bbbb3333",
    points: 100,
    streak: 3,
    rounds: 10,
    is_mine: true,
    board_rank: 2,
  },
  {
    grade: "2",
    kid_user_id: null,
    display_name: null,
    nickname: "Explorer-cccc4444",
    points: 0,
    streak: 0,
    rounds: 0,
    is_mine: false,
    board_rank: 3,
  },
];
const GRADE4_ROWS = [
  {
    grade: "4",
    kid_user_id: "kid-mine-4",
    display_name: "Avyan",
    nickname: "Explorer-dddd5555",
    points: 845,
    streak: 1,
    rounds: 7,
    is_mine: true,
    board_rank: 1,
  },
];

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
  vi.restoreAllMocks();
});

async function render(client: SupabaseClient) {
  await act(async () => root.render(<GradeBoards client={client} />));
}

describe("GradeBoards", () => {
  it("renders one board per grade with ranked nickname rows", async () => {
    const rpcCalls: string[] = [];
    await render(
      stubClient({
        userId: "adult-one",
        rpcRows: [...GRADE2_ROWS, ...GRADE4_ROWS],
        rpcCalls,
      }),
    );

    expect(rpcCalls).toEqual(["my_kids_grade_boards"]);
    const section = container.querySelector(".grade-boards");
    expect(section).not.toBeNull();
    const text = section?.textContent ?? "";
    expect(text).toContain("Same-grade boards");
    expect(text).toContain("Grade 2 learners");
    expect(text).toContain("Grade 4 learners");
    // Grade 2 rows are in rank order: the 250-point nickname first.
    expect(text.indexOf("Explorer-aaaa2222")).toBeLessThan(
      text.indexOf("Avyukth"),
    );
    expect(text).toContain("🥇");
    expect(text).toContain("🥈");
    expect(text).toContain("🥉");
    expect(text).toContain("250");
    // A kid with no progress yet still shows, at 0 points.
    expect(text).toContain("Explorer-cccc4444");
    expect(text).toContain("Not played yet");
  });

  it("highlights the grown-up's own kids with their real name and a marker", async () => {
    await render(
      stubClient({
        userId: "adult-one",
        rpcRows: GRADE2_ROWS,
        rpcCalls: [],
      }),
    );
    const mine = container.querySelector(".grade-board-mine");
    expect(mine).not.toBeNull();
    expect(mine?.textContent).toContain("Avyukth");
    expect(mine?.textContent).toContain("YOUR KID");
    expect(mine?.textContent).toContain("100");
    // Other families' rows show nicknames only — never real names, and
    // the own kid's row is the only highlighted one.
    const others = [...container.querySelectorAll(".grade-board-list li")].filter(
      (li) => !li.classList.contains("grade-board-mine"),
    );
    expect(others).toHaveLength(2);
    expect(others.every((li) => li.textContent?.includes("Explorer-"))).toBe(true);
  });

  it("shows the just-your-family note for a grade with only own kids", async () => {
    await render(
      stubClient({
        userId: "adult-one",
        rpcRows: GRADE4_ROWS,
        rpcCalls: [],
      }),
    );
    const text = container.querySelector(".grade-boards")?.textContent ?? "";
    expect(text).toContain("Just your family in Grade 4 so far");
    expect(text).toContain("more learners will appear here as other families join");
    expect(text).toContain("Avyan");
    expect(text).toContain("845");
  });

  it("shows a quiet not-available note before the migration runs", async () => {
    await render(
      stubClient({
        userId: "adult-one",
        rpcError: { code: "PGRST202", message: "Could not find the function" },
        rpcCalls: [],
      }),
    );
    const text = container.querySelector(".grade-boards")?.textContent ?? "";
    expect(text).toContain("Grade boards aren’t available yet");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("offers a retry after an ordinary load failure", async () => {
    await render(
      stubClient({
        userId: "adult-one",
        rpcError: { code: "500", message: "boom" },
        rpcCalls: [],
      }),
    );
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not load the grade boards",
    );
    const retry = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Try again"),
    );
    expect(retry).toBeDefined();
  });

  it("renders nothing and never calls the RPC for a kid-login session", async () => {
    const rpcCalls: string[] = [];
    await render(
      stubClient({
        userId: "kid-mine",
        ownKidRow: {
          kid_user_id: "kid-mine",
          parent_id: "adult-one",
          username: "mine",
          display_name: "Mine",
          grade: "2",
          active: true,
        },
        rpcRows: GRADE2_ROWS,
        rpcCalls,
      }),
    );
    expect(container.querySelector(".grade-boards")).toBeNull();
    expect(container.textContent).toBe("");
    expect(rpcCalls).toEqual([]);
  });

  it("renders nothing and never calls the RPC for a signed-out session", async () => {
    const rpcCalls: string[] = [];
    await render(stubClient({ userId: null, rpcCalls }));
    expect(container.querySelector(".grade-boards")).toBeNull();
    expect(rpcCalls).toEqual([]);
  });

  it("renders nothing when the grown-up has no kid logins", async () => {
    await render(
      stubClient({ userId: "adult-new", rpcRows: [], rpcCalls: [] }),
    );
    expect(container.querySelector(".grade-boards")).toBeNull();
  });
});
