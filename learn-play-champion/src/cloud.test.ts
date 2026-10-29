import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  loadCloudProgress,
  parseCloudRecord,
  ProgressConflict,
  saveCloudProgress,
} from "./cloud";
import { claimLogin, initialProgress } from "./game";
import { validateSupabaseConfig } from "./supabase";

function mockClient(responses: { body: unknown; status?: number }[]) {
  const fetcher = vi.fn<typeof fetch>();
  for (const response of responses) {
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify(response.body), {
        status: response.status || 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }
  const client = createClient(
    "https://example.supabase.co",
    "sb_publishable_test",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetcher },
    },
  );
  return { client, fetcher };
}
describe("Supabase account progress", () => {
  it("loads only the requested user's record and validates it", async () => {
    const { client, fetcher } = mockClient([
      { body: { data: initialProgress, revision: 3 } },
    ]);
    expect(await loadCloudProgress(client, "adult-one")).toEqual({
      progress: initialProgress,
      revision: 3,
    });
    expect(String(fetcher.mock.calls[0][0])).toContain("user_id=eq.adult-one");
  });
  it("initializes a new account without importing guest progress", async () => {
    const { client, fetcher } = mockClient([
      { body: null },
      { body: null, status: 201 },
      { body: { data: initialProgress, revision: 0 } },
    ]);
    expect(await loadCloudProgress(client, "adult-two")).toEqual({
      progress: initialProgress,
      revision: 0,
    });
    const request = fetcher.mock.calls[1][1];
    expect(JSON.parse(String(request?.body))).toEqual({
      user_id: "adult-two",
      data: initialProgress,
      revision: 0,
    });
    expect(new Headers(request?.headers).get("Prefer")).toContain(
      "resolution=ignore-duplicates",
    );
  });
  it("surfaces load failures rather than showing empty account progress", async () => {
    const { client } = mockClient([
      { body: { message: "relation not found", code: "42P01" }, status: 400 },
    ]);
    await expect(loadCloudProgress(client, "adult-one")).rejects.toThrow(
      "Could not load cloud progress",
    );
  });
  it("surfaces missing database setup during account initialization", async () => {
    const { client } = mockClient([
      { body: null },
      { body: { message: "row policy denied", code: "42501" }, status: 403 },
    ]);
    await expect(loadCloudProgress(client, "adult-one")).rejects.toThrow(
      "Could not create account progress",
    );
  });
  it("rejects malformed or unsupported cloud data", () => {
    expect(() =>
      parseCloudRecord({ data: initialProgress, revision: -1 }),
    ).toThrow("revision");
    expect(() =>
      parseCloudRecord({ data: { version: 99 }, revision: 0 }),
    ).toThrow();
    expect(() => parseCloudRecord(null)).toThrow();
  });
  it("uses a revision-checked save function, not an unconditional upsert", async () => {
    const { client, fetcher } = mockClient([{ body: 4 }]);
    const progress = claimLogin(initialProgress, "2026-10-29");
    expect(await saveCloudProgress(client, "adult-one", progress, 3)).toBe(4);
    expect(String(fetcher.mock.calls[0][0])).toContain(
      "/rpc/save_learner_progress",
    );
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({
      new_data: progress,
      expected_revision: 3,
      expected_user_id: "adult-one",
    });
  });
  it("does not overwrite a newer revision from another device", async () => {
    const { client } = mockClient([
      { body: { message: "Progress conflict", code: "40001" }, status: 409 },
      { body: { data: initialProgress, revision: 8 } },
    ]);
    await expect(
      saveCloudProgress(client, "adult-one", initialProgress, 3),
    ).rejects.toBeInstanceOf(ProgressConflict);
  });
  it("recognizes an already-successful save even when JSONB reorders keys", async () => {
    const progress = claimLogin(initialProgress, "2026-10-29");
    const reordered = Object.fromEntries(Object.entries(progress).reverse());
    const { client, fetcher } = mockClient([
      { body: { message: "Response lost", code: "NETWORK" }, status: 503 },
      { body: { data: reordered, revision: 4 } },
    ]);
    expect(await saveCloudProgress(client, "adult-one", progress, 3)).toBe(4);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not mistake another device's different data for its own saved response", async () => {
    const { client } = mockClient([
      { body: { message: "conflict", code: "40001" }, status: 409 },
      {
        body: { data: claimLogin(initialProgress, "2026-10-29"), revision: 4 },
      },
    ]);
    await expect(
      saveCloudProgress(client, "adult-one", initialProgress, 3),
    ).rejects.toBeInstanceOf(ProgressConflict);
  });
  it("keeps a failed save explicit and retryable when revision did not change", async () => {
    const { client } = mockClient([
      { body: { message: "Offline", code: "NETWORK" }, status: 503 },
      { body: { data: initialProgress, revision: 3 } },
    ]);
    await expect(
      saveCloudProgress(client, "adult-one", claimLogin(initialProgress), 3),
    ).rejects.toThrow("Retry before closing");
  });
});
describe("browser-safe project configuration", () => {
  it("requires a real configuration rather than claiming sign-in is ready", () => {
    expect(validateSupabaseConfig("", "")).not.toBe("");
    expect(
      validateSupabaseConfig(
        "https://YOUR_PROJECT.supabase.co",
        "YOUR_SUPABASE_PUBLISHABLE_KEY",
      ),
    ).not.toBe("");
  });
  it("accepts HTTPS public project settings and rejects secrets or invalid URLs", () => {
    expect(
      validateSupabaseConfig(
        "https://example.supabase.co",
        "sb_publishable_test",
      ),
    ).toBe("");
    for (const url of [
      "http://example.supabase.co",
      "not a url",
      "https://user:pass@example.com",
      "https://example.com?token=secret",
    ]) {
      expect(validateSupabaseConfig(url, "sb_publishable_test")).not.toBe("");
    }
    expect(
      validateSupabaseConfig(
        "https://example.supabase.co",
        "sb_secret_dont_use",
      ),
    ).toContain("never a secret");
    const jwt = (role: string) =>
      `header.${btoa(JSON.stringify({ role }))}.signature`;
    expect(
      validateSupabaseConfig("https://example.supabase.co", jwt("anon")),
    ).toBe("");
    expect(
      validateSupabaseConfig(
        "https://example.supabase.co",
        jwt("service_role"),
      ),
    ).not.toBe("");
  });
});
