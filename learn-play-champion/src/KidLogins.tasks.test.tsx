// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidLogins from "./KidLogins";
import { ALL_SKILL_TASKS } from "./kid-tasks";

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
    // The only controls are Remove (per task), Add all skills, and
    // Add task — no Done, complete, or mark-done control of any kind.
    const buttonLabels = [...manager!.querySelectorAll("button")].map(
      (button) => button.textContent?.trim() ?? "",
    );
    expect(buttonLabels).toEqual([
      "Remove",
      "Remove",
      "Add all skills",
      "Add task",
    ]);
    expect(
      buttonLabels.some((label) => /done|complete|mark/i.test(label)),
    ).toBe(false);
    // And the parent code path never even attempts a kid_tasks update.
    expect(taskUpdates).toEqual([]);
  });
});

function skillRow(activityId: string, title: string, index: number) {
  return {
    id: `task-skill-${activityId}`,
    kid_user_id: "kid-zara",
    parent_id: "adult-one",
    title,
    activity: activityId,
    done: false,
    created_at: `2026-11-0${(index % 9) + 1}T09:00:00Z`,
    completed_at: null,
  };
}

/** A stub serving the given task rows, echoing inserts back from
 * single() (failing inserts for the activities in failActivities). */
function stubClientWithTasks(
  taskRows: Record<string, unknown>[],
  failActivities: string[] = [],
) {
  const inserts: Record<string, unknown>[] = [];
  let lastInsert: Record<string, unknown> | null = null;
  let counter = 0;
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
          update: () => builder,
          insert: (payload: Record<string, unknown>) => {
            inserts.push(payload);
            lastInsert = payload;
            return builder;
          },
          delete: () => builder,
          single: async () => {
            if (
              lastInsert &&
              failActivities.includes(lastInsert.activity as string)
            ) {
              return { data: null, error: { message: "insert blocked" } };
            }
            counter += 1;
            return {
              data: {
                id: `task-added-${counter}`,
                kid_user_id: lastInsert?.kid_user_id,
                parent_id: lastInsert?.parent_id,
                title: lastInsert?.title,
                activity: lastInsert?.activity,
                done: false,
                created_at: "2026-11-07T12:00:00Z",
                completed_at: null,
              },
              error: null,
            };
          },
          then: (resolve: (value: unknown) => void) =>
            resolve({ data: taskRows, error: null }),
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
  return { client: client as unknown as SupabaseClient, inserts };
}

async function renderAndFindAddAll() {
  const manager = container.querySelector(".kid-tasks-manager");
  expect(manager).not.toBeNull();
  const button = [...manager!.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === "Add all skills",
  );
  expect(button).toBeTruthy();
  return { manager: manager!, button: button! };
}

describe("KidLogins 'Add all skills' button", () => {
  it("tops up a kid who has 3 of the 20 skills and says how many were added", async () => {
    const threeRows = [
      skillRow("sight", "Play Word Safari", 0),
      skillRow("arithmetic", "Play Number Sprint", 1),
      skillRow("word-battle", "Play Word Battle", 2),
    ];
    const { client, inserts } = stubClientWithTasks(threeRows);
    await act(async () => root.render(<KidLogins client={client} />));
    const { manager, button } = await renderAndFindAddAll();

    await act(async () => {
      button.click();
    });

    expect(inserts).toHaveLength(17);
    expect(inserts.map((row) => row.activity)).not.toContain("sight");
    expect(inserts.map((row) => row.activity)).not.toContain("arithmetic");
    expect(inserts.map((row) => row.activity)).not.toContain("word-battle");
    expect(manager.textContent).toContain("Added 17 skills to Zara's list.");
    // The refreshed list shows the new skills alongside the old ones.
    expect(manager.textContent).toContain("Play Data Detective");
    expect(manager.textContent).toContain("Read a Motivation Book");
    expect(manager.textContent).toContain("Play Word Safari");
  });

  it("creates nothing and says so when the kid already has all 20 skills", async () => {
    const allRows = ALL_SKILL_TASKS.map((preset, index) =>
      skillRow(preset.activityId, preset.title, index),
    );
    const { client, inserts } = stubClientWithTasks(allRows);
    await act(async () => root.render(<KidLogins client={client} />));
    const { manager, button } = await renderAndFindAddAll();

    await act(async () => {
      button.click();
    });

    expect(inserts).toEqual([]);
    expect(manager.textContent).toContain(
      "All 20 skills are already on Zara's list.",
    );
  });

  it("reports honest counts when one skill cannot be added, and keeps the ones that were", async () => {
    const threeRows = [
      skillRow("sight", "Play Word Safari", 0),
      skillRow("arithmetic", "Play Number Sprint", 1),
      skillRow("word-battle", "Play Word Battle", 2),
    ];
    const { client, inserts } = stubClientWithTasks(threeRows, ["data"]);
    await act(async () => root.render(<KidLogins client={client} />));
    const { manager, button } = await renderAndFindAddAll();

    await act(async () => {
      button.click();
    });

    expect(inserts).toHaveLength(17);
    const alert = manager.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Added 16 skills");
    expect(alert?.textContent).toContain("1 couldn't be added");
    // The successful additions are on the refreshed list; the failed one is not.
    expect(manager.textContent).toContain("Play Shape Quest");
    expect(manager.textContent).not.toContain("Play Data Detective");
  });
});
