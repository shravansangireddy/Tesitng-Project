import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activityTitle,
  createKidTask,
  deleteKidTask,
  fetchKidTasks,
  isActivityId,
  parseKidTask,
  setKidTaskDone,
  taskTitleError,
} from "./kid-tasks";

const ROW = {
  id: "task-1",
  kid_user_id: "kid-one",
  parent_id: "adult-one",
  title: "Play Math Mountain",
  activity: "arithmetic",
  done: false,
  created_at: "2026-10-31T12:00:00Z",
  completed_at: null,
};

function stubClient(result: { data: unknown; error: unknown }) {
  const calls: { method: string; args: unknown[] }[] = [];
  const builder: Record<string, unknown> = {
    select: (...args: unknown[]) => {
      calls.push({ method: "select", args });
      return builder;
    },
    eq: (...args: unknown[]) => {
      calls.push({ method: "eq", args });
      return builder;
    },
    order: (...args: unknown[]) => {
      calls.push({ method: "order", args });
      return builder;
    },
    insert: (...args: unknown[]) => {
      calls.push({ method: "insert", args });
      return builder;
    },
    update: (...args: unknown[]) => {
      calls.push({ method: "update", args });
      return builder;
    },
    delete: (...args: unknown[]) => {
      calls.push({ method: "delete", args });
      return builder;
    },
    single: async () => result,
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  const client = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("kid task validation", () => {
  it("requires a short, non-empty title", () => {
    expect(taskTitleError("")).toMatch(/Give the task a name/);
    expect(taskTitleError("   ")).toMatch(/Give the task a name/);
    expect(taskTitleError("x".repeat(81))).toMatch(/80 characters/);
    expect(taskTitleError("Play Math Mountain")).toBe("");
  });

  it("recognizes only real activity ids", () => {
    expect(isActivityId("arithmetic")).toBe(true);
    expect(isActivityId("sight")).toBe(true);
    expect(isActivityId("not-a-game")).toBe(false);
    expect(isActivityId(null)).toBe(false);
    expect(activityTitle("arithmetic")).toBe("Number Sprint");
    expect(activityTitle(null)).toBe("");
  });
});

describe("parseKidTask", () => {
  it("maps a well-formed row", () => {
    expect(parseKidTask(ROW)).toEqual({
      id: "task-1",
      kidUserId: "kid-one",
      parentId: "adult-one",
      title: "Play Math Mountain",
      activityId: "arithmetic",
      done: false,
      createdAt: "2026-10-31T12:00:00Z",
      completedAt: null,
    });
  });

  it("drops unknown activities and rejects malformed rows", () => {
    expect(parseKidTask({ ...ROW, activity: "nope" })?.activityId).toBeNull();
    expect(parseKidTask({ ...ROW, title: "" })).toBeNull();
    expect(parseKidTask({ ...ROW, done: "yes" })).toBeNull();
    expect(parseKidTask(null)).toBeNull();
  });
});

describe("kid task queries", () => {
  it("fetches and parses a kid's tasks in creation order", async () => {
    const { client, calls } = stubClient({ data: [ROW], error: null });
    const tasks = await fetchKidTasks(client, "kid-one");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Play Math Mountain");
    expect(calls.some((call) => call.method === "order")).toBe(true);
  });

  it("creates a task for the parent's kid", async () => {
    const { client, calls } = stubClient({ data: ROW, error: null });
    const task = await createKidTask(client, {
      parentId: "adult-one",
      kidUserId: "kid-one",
      title: "  Play Math Mountain  ",
      activityId: "arithmetic",
    });
    expect(task.id).toBe("task-1");
    const insert = calls.find((call) => call.method === "insert");
    expect(insert?.args[0]).toMatchObject({
      kid_user_id: "kid-one",
      parent_id: "adult-one",
      title: "Play Math Mountain",
      activity: "arithmetic",
    });
  });

  it("refuses to create a task with an empty title", async () => {
    const { client } = stubClient({ data: ROW, error: null });
    await expect(
      createKidTask(client, {
        parentId: "adult-one",
        kidUserId: "kid-one",
        title: " ",
        activityId: null,
      }),
    ).rejects.toThrow(/Give the task a name/);
  });

  it("marks a task done with a completion timestamp and deletes by id", async () => {
    const { client, calls } = stubClient({ data: null, error: null });
    await setKidTaskDone(client, "task-1", true);
    const update = calls.find((call) => call.method === "update");
    expect(update?.args[0]).toMatchObject({ done: true });
    expect(typeof (update?.args[0] as { completed_at: unknown }).completed_at).toBe("string");
    await deleteKidTask(client, "task-1");
    expect(calls.some((call) => call.method === "delete")).toBe(true);
  });
});
