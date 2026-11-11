import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activityTitle,
  addAllSkillTasks,
  ALL_SKILL_TASKS,
  createKidTask,
  deleteKidTask,
  fetchKidTasks,
  isActivityId,
  isTaskActivityId,
  missingSkillTasks,
  parseKidTask,
  setKidTaskDone,
  taskTitleError,
  WORD_BATTLE_ACTIVITY,
  type KidTask,
  type TaskActivityId,
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

  it("also opens the Word Battle world as a task deep-link", () => {
    expect(isActivityId(WORD_BATTLE_ACTIVITY)).toBe(false);
    expect(isTaskActivityId(WORD_BATTLE_ACTIVITY)).toBe(true);
    expect(isTaskActivityId("arithmetic")).toBe(true);
    expect(isTaskActivityId("not-a-game")).toBe(false);
    expect(isTaskActivityId(null)).toBe(false);
    expect(activityTitle(WORD_BATTLE_ACTIVITY)).toBe("Word Battle");
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

  it("keeps the Word Battle deep-link on seeded starter tasks", () => {
    const task = parseKidTask({
      ...ROW,
      title: "Play Word Battle",
      activity: "word-battle",
    });
    expect(task?.activityId).toBe(WORD_BATTLE_ACTIVITY);
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

  it("creates a task that deep-links to Word Battle", async () => {
    const { client, calls } = stubClient({
      data: { ...ROW, title: "Play Word Battle", activity: "word-battle" },
      error: null,
    });
    const task = await createKidTask(client, {
      parentId: "adult-one",
      kidUserId: "kid-one",
      title: "Play Word Battle",
      activityId: WORD_BATTLE_ACTIVITY,
    });
    expect(task.activityId).toBe(WORD_BATTLE_ACTIVITY);
    const insert = calls.find((call) => call.method === "insert");
    expect(insert?.args[0]).toMatchObject({ activity: "word-battle" });
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

function existingTask(
  activityId: TaskActivityId | null,
  title = "An existing task",
): KidTask {
  return {
    id: `task-${activityId ?? "plain"}-${title}`,
    kidUserId: "kid-one",
    parentId: "adult-one",
    title,
    activityId,
    done: false,
    createdAt: "2026-11-01T09:00:00Z",
    completedAt: null,
  };
}

/** A stub whose insert echoes the inserted row back from single(), and
 * whose inserts fail for the activities named in failActivities. */
function echoClient(failActivities: string[] = []) {
  const inserts: Record<string, unknown>[] = [];
  let lastInsert: Record<string, unknown> | null = null;
  let counter = 0;
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    insert: (payload: Record<string, unknown>) => {
      inserts.push(payload);
      lastInsert = payload;
      return builder;
    },
    update: () => builder,
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
          id: `task-new-${counter}`,
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
      resolve({ data: [], error: null }),
  };
  const client = {
    from: vi.fn(() => builder),
  } as unknown as SupabaseClient;
  return { client, inserts };
}

describe("missingSkillTasks", () => {
  it("returns every skill for a kid with no tasks", () => {
    expect(missingSkillTasks([])).toEqual(ALL_SKILL_TASKS);
    expect(ALL_SKILL_TASKS).toHaveLength(19);
  });

  it("returns exactly the skills a kid does not have yet", () => {
    const existing = [
      existingTask("sight"),
      existingTask("arithmetic"),
      existingTask("word-battle"),
      // A title-only task never covers a skill.
      existingTask(null, "Read a picture book"),
    ];
    const missing = missingSkillTasks(existing);
    expect(missing).toHaveLength(16);
    expect(missing.map((preset) => preset.activityId)).not.toContain("sight");
    expect(missing.map((preset) => preset.activityId)).not.toContain(
      "arithmetic",
    );
    expect(missing.map((preset) => preset.activityId)).not.toContain(
      "word-battle",
    );
    // Set order is preserved: English first, books last.
    expect(missing[0].activityId).toBe("vocabulary");
    expect(missing[missing.length - 1].activityId).toBe("motivation-books");
  });

  it("counts a skill as covered by any task with its activity, whatever the title or done state", () => {
    const custom = existingTask("sight", "Spot the words, please!");
    custom.done = true;
    const missing = missingSkillTasks([custom]);
    expect(missing.map((preset) => preset.activityId)).not.toContain("sight");
    expect(missing).toHaveLength(18);
  });

  it("returns nothing when the kid already has all 19 skills", () => {
    const existing = ALL_SKILL_TASKS.map((preset) =>
      existingTask(preset.activityId, preset.title),
    );
    expect(missingSkillTasks(existing)).toEqual([]);
  });
});

describe("addAllSkillTasks", () => {
  it("creates exactly the missing skills for a kid with 3 of the 19", async () => {
    const { client, inserts } = echoClient();
    const existing = [
      existingTask("sight"),
      existingTask("arithmetic"),
      existingTask("word-battle"),
    ];
    const result = await addAllSkillTasks(client, {
      parentId: "adult-one",
      kidUserId: "kid-one",
      existing,
    });
    expect(result.failed).toBe(0);
    expect(result.added).toHaveLength(16);
    expect(inserts).toHaveLength(16);
    // Same attribution as a hand-added task, canonical titles, set order.
    expect(inserts[0]).toMatchObject({
      kid_user_id: "kid-one",
      parent_id: "adult-one",
      title: "Play Meaning Match",
      activity: "vocabulary",
    });
    expect(inserts[15]).toMatchObject({
      title: "Read a Motivation Book",
      activity: "motivation-books",
    });
    expect(result.added.map((task) => task.title)).toContain(
      "Play Data Detective",
    );
  });

  it("creates nothing when the kid already has all 19 skills", async () => {
    const { client, inserts } = echoClient();
    const existing = ALL_SKILL_TASKS.map((preset) =>
      existingTask(preset.activityId, preset.title),
    );
    const result = await addAllSkillTasks(client, {
      parentId: "adult-one",
      kidUserId: "kid-one",
      existing,
    });
    expect(result).toEqual({ added: [], failed: 0 });
    expect(inserts).toEqual([]);
  });

  it("attempts every skill and reports honest counts when some inserts fail", async () => {
    const { client, inserts } = echoClient(["data", "geometry"]);
    const existing = [
      existingTask("sight"),
      existingTask("arithmetic"),
      existingTask("word-battle"),
    ];
    const result = await addAllSkillTasks(client, {
      parentId: "adult-one",
      kidUserId: "kid-one",
      existing,
    });
    // All 16 missing skills were attempted; 2 failed, 14 stand.
    expect(inserts).toHaveLength(16);
    expect(result.failed).toBe(2);
    expect(result.added).toHaveLength(14);
    expect(result.added.map((task) => task.activityId)).not.toContain("data");
    expect(result.added.map((task) => task.activityId)).not.toContain(
      "geometry",
    );
    expect(result.added.map((task) => task.activityId)).toContain(
      "motivation-books",
    );
  });
});
