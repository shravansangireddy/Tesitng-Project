// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import ParentPoints from "./ParentPoints";
import KidLogins from "./KidLogins";
import {
  loadParentPointsStore,
  localDateString,
  parentPointsAccountFor,
  recordDonationAward,
  PARENT_POINTS_STORAGE_KEY,
  PARENT_REVIEW_EVENT,
  type ParentReviewRequest,
} from "./parent-points";

const KID_ROWS = [
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
    kid_user_id: "kid-zara",
    parent_id: "adult-one",
    username: "zara",
    display_name: "Zara",
    grade: "2",
    active: true,
    created_at: "2026-10-30T00:00:00Z",
  },
];

function stubClient({
  userId = "adult-one",
  kidRows = KID_ROWS,
  ownRow = null as unknown,
} = {}) {
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        // fetchOwnKidAccount: null means the signed-in user is a grown-up.
        maybeSingle: async () => ({ data: ownRow, error: null }),
        // fetchMyKidAccounts resolves the builder itself.
        then: (resolve: (value: unknown) => void) =>
          resolve({ data: kidRows, error: null }),
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
  localStorage.removeItem(PARENT_POINTS_STORAGE_KEY);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  localStorage.removeItem(PARENT_POINTS_STORAGE_KEY);
});

async function mount(client: SupabaseClient) {
  await act(async () => root.render(<ParentPoints client={client} />));
}

function assignmentRow(titlePart: string): HTMLLIElement {
  const row = [...container.querySelectorAll<HTMLLIElement>(".parent-points-row")]
    .find((item) => item.textContent?.includes(titlePart));
  if (!row) throw new Error(`Missing assignment row: ${titlePart}`);
  return row;
}

async function clickAssignmentButton(titlePart: string) {
  const button = assignmentRow(titlePart).querySelector("button");
  if (!button) throw new Error(`Missing assignment button: ${titlePart}`);
  await act(async () => button.click());
}

describe("Parent Points panel", () => {
  it("shows totals, the per-skill breakdown, and grade-matched assignments per kid", async () => {
    await mount(stubClient());
    const panel = container.querySelector(".parent-points");
    expect(panel).not.toBeNull();
    const text = panel?.textContent ?? "";
    expect(text).toContain("Parent points");
    expect(text).toContain("0 parent points");
    expect(text).toContain("English");
    expect(text).toContain("Math");
    expect(text).toContain("General");
    // Each kid's group is labeled with name AND grade, and each kid's
    // review assignments name that kid's own grade-level skills.
    expect(text).toContain("Avyan · Grade 4");
    expect(text).toContain("Zara · Grade 2");
    expect(text).toContain("Review Avyan's Grade 4 English skills");
    expect(text).toContain("Review Avyan's Grade 4 Math skills");
    expect(text).toContain("Review Zara's Grade 2 English skills");
    expect(text).toContain("Review Zara's Grade 2 Math skills");
    expect(text).not.toContain("Review Avyan's Grade 2 English skills");
    expect(text).not.toContain("Review Zara's Grade 4 Math skills");
    expect(text).toContain("Check Avyan's tasks");
    expect(text).toContain("Daily check-in");
    expect(text).toContain("+5 English points");
    expect(text).toContain("+5 Math points");
    expect(text).toContain("+5 General points");
  });

  it("awards points on click, updates totals, marks the assignment done, and asks to open the kid's progress", async () => {
    const requests: ParentReviewRequest[] = [];
    const listener = (event: Event) =>
      requests.push((event as CustomEvent<ParentReviewRequest>).detail);
    window.addEventListener(PARENT_REVIEW_EVENT, listener);
    try {
      await mount(stubClient());
      await clickAssignmentButton("Grade 4 English");
      const text = container.textContent ?? "";
      expect(text).toContain("+5 English points");
      expect(text).toContain("5 parent points");
      expect(assignmentRow("Grade 4 English").textContent).toContain(
        "Done today",
      );
      // The click also asked the Kid logins list to open Avyan's
      // progress (the existing view), naming the English skill review.
      expect(requests).toEqual([
        { kidUserId: "kid-avyan", view: "progress", subject: "english" },
      ]);
      // Persisted under the signed-in grown-up's own account key.
      const account = parentPointsAccountFor(
        loadParentPointsStore(),
        "adult-one",
      );
      expect(account.totals).toEqual({ english: 5, math: 0, general: 0 });
      expect(account.recent[0].label).toBe(
        "Review Avyan's Grade 4 English skills",
      );
      expect(container.textContent).toContain("Recent activity");
    } finally {
      window.removeEventListener(PARENT_REVIEW_EVENT, listener);
    }
  });

  it("keeps the done state and totals across a remount (same device, same account)", async () => {
    await mount(stubClient());
    await clickAssignmentButton("Grade 2 Math");
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount(stubClient());
    expect(container.textContent).toContain("5 parent points");
    expect(assignmentRow("Grade 2 Math").textContent).toContain("Done today");
    expect(assignmentRow("Grade 2 English").textContent).not.toContain(
      "Done today",
    );
  });

  it("shows a friendly empty state when the grown-up manages no kids", async () => {
    await mount(stubClient({ kidRows: [] }));
    const text = container.textContent ?? "";
    expect(text).toContain("Parent points");
    expect(text).toContain("No kid logins yet");
    expect(container.querySelector(".parent-points-row")).toBeNull();
  });

  it("renders nothing for a kid login session", async () => {
    await mount(
      stubClient({ userId: "kid-avyan", ownRow: KID_ROWS[0] }),
    );
    expect(container.querySelector(".parent-points")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it("renders nothing for a guest (no signed-in user)", async () => {
    await mount(stubClient({ userId: "" }));
    expect(container.querySelector(".parent-points")).toBeNull();
    expect(container.textContent).toBe("");
  });
});

describe("Parent Points event awards", () => {
  const noonUtc = (date: string) => `${date}T12:00:00.000Z`;
  const daysAgo = (days: number) => {
    const day = new Date();
    day.setDate(day.getDate() - days);
    return localDateString(day);
  };

  function stubClientWithTasks() {
    const today = localDateString();
    const taskRows = [
      // Two Avyan tasks done today still pay only +1 for Avyan today.
      { id: "t1", kid_user_id: "kid-avyan", parent_id: "adult-one", title: "Read", activity: null, done: true, created_at: noonUtc(today), completed_at: noonUtc(today) },
      { id: "t2", kid_user_id: "kid-avyan", parent_id: "adult-one", title: "Math", activity: null, done: true, created_at: noonUtc(today), completed_at: noonUtc(today) },
      // Done long before the 7-day window: never backfills.
      { id: "t3", kid_user_id: "kid-avyan", parent_id: "adult-one", title: "Old", activity: null, done: true, created_at: noonUtc(daysAgo(12)), completed_at: noonUtc(daysAgo(10)) },
      { id: "t4", kid_user_id: "kid-zara", parent_id: "adult-one", title: "Spell", activity: null, done: true, created_at: noonUtc(today), completed_at: noonUtc(today) },
      { id: "t5", kid_user_id: "kid-zara", parent_id: "adult-one", title: "Pending", activity: null, done: false, created_at: noonUtc(today), completed_at: null },
    ];
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: "adult-one" } } }),
      },
      from: (table: string) => {
        let kidFilter: string | null = null;
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: (column: string, value: string) => {
            if (column === "kid_user_id") kidFilter = value;
            return builder;
          },
          order: () => builder,
          maybeSingle: async () => ({ data: null, error: null }),
          then: (resolve: (value: unknown) => void) =>
            resolve({
              data:
                table === "kid_tasks"
                  ? taskRows.filter((row) => row.kid_user_id === kidFilter)
                  : table === "kid_accounts"
                    ? KID_ROWS
                    : [],
              error: null,
            }),
        };
        return builder;
      },
      functions: { invoke: vi.fn() },
    };
    return client as unknown as SupabaseClient;
  }

  it("awards +1 per kid for today's assignment completions on load, once", async () => {
    const client = stubClientWithTasks();
    await mount(client);
    const text = container.textContent ?? "";
    expect(text).toContain("2 parent points");
    expect(text).toContain("Avyan finished an assignment");
    expect(text).toContain("Zara finished an assignment");
    const account = parentPointsAccountFor(
      loadParentPointsStore(),
      "adult-one",
    );
    expect(account.totals).toEqual({ english: 0, math: 0, general: 2 });
    // A remount re-observes the same completions but never re-pays.
    await act(async () => root.unmount());
    root = createRoot(container);
    await mount(client);
    expect(container.textContent).toContain("2 parent points");
    expect(
      parentPointsAccountFor(loadParentPointsStore(), "adult-one").totals
        .general,
    ).toBe(2);
  });

  it("shows a donation award live when one is recorded while the panel is open", async () => {
    await mount(stubClient());
    expect(container.textContent).toContain("0 parent points");
    await act(async () => {
      recordDonationAward(
        "adult-one",
        "33333333-3333-4333-8333-333333333333",
      );
    });
    const text = container.textContent ?? "";
    expect(text).toContain("20 parent points");
    expect(text).toContain("Donation — thank you");
  });
});

describe("Parent Points next to Kid logins (as in Privacy & data)", () => {
  function combinedClient() {
    const client = {
      auth: {
        getUser: async () => ({ data: { user: { id: "adult-one" } } }),
      },
      from: (table: string) => {
        if (table === "learner_progress") {
          const progressBuilder: Record<string, unknown> = {
            select: () => progressBuilder,
            eq: () => progressBuilder,
            // No kid has saved progress in this stub.
            maybeSingle: async () => ({ data: null, error: null }),
          };
          return progressBuilder;
        }
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          order: () => builder,
          maybeSingle: async () => ({ data: null, error: null }),
          then: (resolve: (value: unknown) => void) =>
            resolve({
              data: table === "kid_accounts" ? KID_ROWS : [],
              error: null,
            }),
        };
        return builder;
      },
      functions: { invoke: vi.fn() },
    };
    return client as unknown as SupabaseClient;
  }

  it("clicking a review assignment opens that kid's progress view in Kid logins", async () => {
    const client = combinedClient();
    await act(async () =>
      root.render(
        <>
          <KidLogins client={client} />
          <ParentPoints client={client} />
        </>,
      ),
    );
    // The kid rows start with their progress panels closed.
    expect(container.textContent).not.toContain("No saved progress yet");
    await clickAssignmentButton("Grade 4 English");
    // The award landed and Avyan's existing progress panel opened.
    expect(container.textContent).toContain("+5 English points");
    expect(container.textContent).toContain("No saved progress yet");
    const avyanRow = container.querySelector("#kid-row-kid-avyan");
    expect(avyanRow?.textContent).toContain("Hide progress");
    expect(avyanRow?.textContent).toContain("No saved progress yet");
    // Zara's panel stayed closed.
    const zaraRow = container.querySelector("#kid-row-kid-zara");
    expect(zaraRow?.textContent).toContain("View progress");
    expect(zaraRow?.textContent).not.toContain("No saved progress yet");
  });
});
