// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidLogins from "./KidLogins";

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
];

const TASK_ROWS = [
  {
    id: "task-open",
    kid_user_id: "kid-zara",
    parent_id: "adult-one",
    title: "Play Math Mountain",
    activity: "arithmetic",
    done: false,
    created_at: "2026-11-01T09:00:00Z",
    completed_at: null,
  },
  {
    id: "task-done",
    kid_user_id: "kid-zara",
    parent_id: "adult-one",
    title: "Read a picture book",
    activity: null,
    done: true,
    created_at: "2026-11-01T09:05:00Z",
    completed_at: "2026-11-02T12:30:00Z",
  },
];

function stubClient() {
  const taskUpdates: Record<string, unknown>[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
    },
    from: (table: string) => {
      if (table === "kid_tasks") {
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          order: () => builder,
          update: (payload: Record<string, unknown>) => {
            taskUpdates.push(payload);
            return builder;
          },
          insert: () => builder,
          delete: () => builder,
          single: async () => ({ data: TASK_ROWS[0], error: null }),
          then: (resolve: (value: unknown) => void) =>
            resolve({ data: TASK_ROWS, error: null }),
        };
        return builder;
      }
      if (table === "learner_progress") {
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({ data: null, error: null }),
        };
        return builder;
      }
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        // fetchOwnKidAccount: the signed-in grown-up is not a kid login.
        maybeSingle: async () => ({ data: null, error: null }),
        // fetchMyKidAccounts resolves the builder itself.
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
  return { client: client as unknown as SupabaseClient, taskUpdates };
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

describe("KidLogins task manager (parent view)", () => {
  it("shows task status but offers NO way to mark a task done, and never writes completion", async () => {
    const { client, taskUpdates } = stubClient();
    await act(async () => root.render(<KidLogins client={client} />));

    const manager = container.querySelector(".kid-tasks-manager");
    expect(manager).not.toBeNull();
    // Status is visible: open task waiting, finished task checked + dated.
    expect(manager!.textContent).toContain("Tasks for Zara");
    expect(manager!.textContent).toContain("⏳ Play Math Mountain");
    expect(manager!.textContent).toContain("✅ Read a picture book");
    expect(manager!.textContent).toContain("done");
    // The rule is stated where parents manage tasks.
    expect(manager!.textContent).toContain(
      "Only Zara can tick a task off as done",
    );
    // The only controls are Remove (per task) and Add task — no Done,
    // complete, or mark-done control of any kind.
    const buttonLabels = [...manager!.querySelectorAll("button")].map(
      (button) => button.textContent?.trim() ?? "",
    );
    expect(buttonLabels).toEqual(["Remove", "Remove", "Add task"]);
    expect(
      buttonLabels.some((label) => /done|complete|mark/i.test(label)),
    ).toBe(false);
    // And the parent code path never even attempts a kid_tasks update.
    expect(taskUpdates).toEqual([]);
  });
});
