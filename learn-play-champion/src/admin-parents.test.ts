import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminParentsUnavailableError,
  fetchAdminParents,
  isAdminParentsUnavailable,
  parseAdminParents,
  sendParentReminder,
} from "./admin-parents";

const ROW = {
  parent_user_id: "11111111-1111-4111-8111-111111111111",
  email: "a@example.com",
  registered_at: "2026-01-02T12:00:00Z",
  kid_count: 2,
  task_count: 2,
  tasks_done: 1,
  task_titles: [
    { title: "Read a picture book", done: true },
    { title: "Play Number Sprint", done: false },
  ],
  reminder_count: 1,
  last_reminder_at: "2026-02-01T12:00:00Z",
};

describe("parseAdminParents", () => {
  it("parses valid rows into typed parents with their tasks", () => {
    expect(parseAdminParents([ROW])).toEqual([
      {
        parentUserId: ROW.parent_user_id,
        email: "a@example.com",
        registeredAt: "2026-01-02T12:00:00Z",
        kidCount: 2,
        taskCount: 2,
        tasksDone: 1,
        tasks: [
          { title: "Read a picture book", done: true },
          { title: "Play Number Sprint", done: false },
        ],
        reminderCount: 1,
        lastReminderAt: "2026-02-01T12:00:00Z",
      },
    ]);
    expect(parseAdminParents([])).toEqual([]);
  });

  it("parses a never-reminded parent (zero count, null last sent)", () => {
    const [parsed] = parseAdminParents([
      { ...ROW, reminder_count: 0, last_reminder_at: null },
    ]);
    expect(parsed.reminderCount).toBe(0);
    expect(parsed.lastReminderAt).toBeNull();
  });

  it("never copies extra fields (a kid's name or username) into the result", () => {
    const parsed = parseAdminParents([
      { ...ROW, display_name: "Secret Kid Name", username: "secretkid" },
    ]);
    expect(Object.keys(parsed[0]).sort()).toEqual([
      "email",
      "kidCount",
      "lastReminderAt",
      "parentUserId",
      "registeredAt",
      "reminderCount",
      "taskCount",
      "tasks",
      "tasksDone",
    ]);
    expect(JSON.stringify(parsed)).not.toContain("Secret Kid");
    expect(JSON.stringify(parsed)).not.toContain("secretkid");
  });

  it("rejects malformed payloads instead of rendering them", () => {
    for (const bad of [
      null,
      "rows",
      [null],
      [{ ...ROW, parent_user_id: "not-a-uuid" }],
      [{ ...ROW, email: "not-an-email" }],
      [{ ...ROW, registered_at: "whenever" }],
      [{ ...ROW, kid_count: -1 }],
      [{ ...ROW, kid_count: 1.5 }],
      [{ ...ROW, reminder_count: -1 }],
      [{ ...ROW, reminder_count: 1.5 }],
      [{ ...ROW, last_reminder_at: "whenever" }],
      [{ ...ROW, last_reminder_at: 42 }],
      [{ ...ROW, task_titles: null }],
      [{ ...ROW, task_titles: [{ title: "", done: true }] }],
      [{ ...ROW, task_titles: [{ title: "Ok", done: "yes" }] }],
    ]) {
      expect(() => parseAdminParents(bad)).toThrow();
    }
  });

  it("rejects counts that disagree with the titles list", () => {
    expect(() => parseAdminParents([{ ...ROW, task_count: 3 }])).toThrow(
      "inconsistent counts",
    );
    expect(() => parseAdminParents([{ ...ROW, tasks_done: 2 }])).toThrow(
      "inconsistent counts",
    );
  });
});

describe("fetchAdminParents", () => {
  function stubClient(result: { data?: unknown; error?: unknown }) {
    const rpc = vi.fn(async () => ({
      data: result.data ?? null,
      error: result.error ?? null,
    }));
    return { client: { rpc } as unknown as SupabaseClient, rpc };
  }

  it("calls the admin_registered_parents RPC and parses its rows", async () => {
    const { client, rpc } = stubClient({ data: [ROW] });
    const rows = await fetchAdminParents(client);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("admin_registered_parents");
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("a@example.com");
  });

  it("maps a missing function to the unavailable error", async () => {
    const { client } = stubClient({
      error: {
        code: "PGRST202",
        message:
          "Could not find the function public.admin_registered_parents in the schema cache",
      },
    });
    await expect(fetchAdminParents(client)).rejects.toBeInstanceOf(
      AdminParentsUnavailableError,
    );
  });

  it("passes ordinary failures through with their message", async () => {
    const { client } = stubClient({ error: { message: "connection reset" } });
    await expect(fetchAdminParents(client)).rejects.toThrow(
      "Could not load registered parents: connection reset",
    );
  });
});

describe("isAdminParentsUnavailable", () => {
  it("recognises the not-deployed shapes", () => {
    expect(isAdminParentsUnavailable(new AdminParentsUnavailableError())).toBe(true);
    expect(isAdminParentsUnavailable({ code: "42883" })).toBe(true);
    expect(isAdminParentsUnavailable({ code: "42P01" })).toBe(true);
    expect(
      isAdminParentsUnavailable({
        message: "function public.admin_registered_parents() does not exist",
      }),
    ).toBe(true);
    expect(isAdminParentsUnavailable({ code: "42501", message: "denied" })).toBe(false);
    expect(isAdminParentsUnavailable(new Error("boom"))).toBe(false);
    expect(isAdminParentsUnavailable(null)).toBe(false);
  });
});

describe("sendParentReminder", () => {
  function stubClient(result: { data?: unknown; error?: unknown }) {
    const invoke = vi.fn(async () => ({
      data: result.data ?? null,
      error: result.error ?? null,
    }));
    return {
      client: { functions: { invoke } } as unknown as SupabaseClient,
      invoke,
    };
  }

  it("invokes the parent-reminder function for the chosen parent", async () => {
    const { client, invoke } = stubClient({ data: { sent: true } });
    const result = await sendParentReminder(client, ROW.parent_user_id);
    expect(invoke).toHaveBeenCalledExactlyOnceWith("parent-reminder", {
      body: { parentUserId: ROW.parent_user_id },
    });
    expect(result).toEqual({ sent: true, reason: undefined });
  });

  it("carries the function's unsent reasons back to the panel", async () => {
    for (const reason of ["not-configured", "not-admin", "parent-not-found", "kid-account"]) {
      const { client } = stubClient({ data: { sent: false, reason } });
      await expect(sendParentReminder(client, ROW.parent_user_id)).resolves.toEqual({
        sent: false,
        reason,
      });
    }
  });

  it("maps a transport failure to send-failed instead of throwing", async () => {
    const { client } = stubClient({ error: { message: "Failed to fetch" } });
    await expect(sendParentReminder(client, ROW.parent_user_id)).resolves.toEqual({
      sent: false,
      reason: "send-failed",
    });
    const throwing = {
      functions: {
        invoke: vi.fn(async () => {
          throw new Error("network down");
        }),
      },
    } as unknown as SupabaseClient;
    await expect(sendParentReminder(throwing, ROW.parent_user_id)).resolves.toEqual({
      sent: false,
      reason: "send-failed",
    });
  });

  it("treats a malformed success payload as send-failed", async () => {
    const { client } = stubClient({ data: { ok: true } });
    await expect(sendParentReminder(client, ROW.parent_user_id)).resolves.toEqual({
      sent: false,
      reason: "send-failed",
    });
  });
});
