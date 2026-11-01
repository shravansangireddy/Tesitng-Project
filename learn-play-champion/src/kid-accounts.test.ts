import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createKidAccount,
  deleteKidAccount,
  fetchKidProgress,
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  kidEmail,
  kidNameError,
  kidAuthPassword,
  kidPasswordError,
  kidPinError,
  normalizeUsername,
  parseKidAccount,
  resetKidPassword,
  setKidAccountActive,
  summarizeProgress,
  usernameError,
} from "./kid-accounts";
import { initialProgress } from "./game";

const ROW = {
  kid_user_id: "kid-one",
  parent_id: "adult-one",
  username: "avyan_7",
  display_name: "Avyan",
  grade: "4",
  created_at: "2026-10-31T00:00:00Z",
};

function clientWith(parts: Record<string, unknown>): SupabaseClient {
  return parts as unknown as SupabaseClient;
}

function queryClient(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: async () => result,
    then: (resolve: (value: unknown) => void) => resolve(result),
  };
  return clientWith({ from: () => builder });
}

describe("kid login validation", () => {
  it("normalizes usernames and maps them to the kid email domain", () => {
    expect(normalizeUsername("  AvYan_7 ")).toBe("avyan_7");
    expect(kidEmail("Avyan_7")).toBe("avyan_7@kids.learnplaychampion.com");
  });

  it("accepts simple usernames and rejects the rest", () => {
    expect(usernameError("avyan_7")).toBe("");
    expect(usernameError("av")).toContain("3–20");
    expect(usernameError("av yan")).toContain("3–20");
    expect(usernameError("avyan!")).toContain("3–20");
    expect(usernameError("   ")).toBe("Choose a username.");
  });

  it("enforces the kid password length window", () => {
    expect(kidPasswordError("short")).toContain("at least 8");
    expect(kidPasswordError("starfish42")).toBe("");
    expect(kidPasswordError("x".repeat(73))).toContain("too long");
  });

  it("requires a display name", () => {
    expect(kidNameError("Avyan")).toBe("");
    expect(kidNameError("   ")).toContain("first name or nickname");
  });
});

describe("parseKidAccount", () => {
  it("maps a database row", () => {
    expect(parseKidAccount(ROW)).toEqual({
      kidUserId: "kid-one",
      parentId: "adult-one",
      username: "avyan_7",
      displayName: "Avyan",
      grade: "4",
      active: true,
      createdAt: "2026-10-31T00:00:00Z",
    });
    expect(parseKidAccount({ ...ROW, active: false })?.active).toBe(false);
  });

  it("rejects malformed rows", () => {
    expect(parseKidAccount(null)).toBeNull();
    expect(parseKidAccount({ ...ROW, grade: "9" })).toBeNull();
    expect(parseKidAccount({ ...ROW, username: "Bad Name" })).toBeNull();
    expect(parseKidAccount({ ...ROW, display_name: "" })).toBeNull();
    expect(parseKidAccount({ ...ROW, kid_user_id: "" })).toBeNull();
  });
});

describe("kid account queries", () => {
  it("reads the signed-in kid's own row", async () => {
    const kid = await fetchOwnKidAccount(
      queryClient({ data: ROW, error: null }),
      "kid-one",
    );
    expect(kid?.username).toBe("avyan_7");
  });

  it("returns null for grown-ups and on read errors", async () => {
    await expect(
      fetchOwnKidAccount(queryClient({ data: null, error: null }), "adult"),
    ).resolves.toBeNull();
    await expect(
      fetchOwnKidAccount(
        queryClient({ data: null, error: new Error("denied") }),
        "adult",
      ),
    ).resolves.toBeNull();
  });

  it("lists a parent's kid logins and drops malformed rows", async () => {
    const kids = await fetchMyKidAccounts(
      queryClient({
        data: [ROW, { ...ROW, kid_user_id: "kid-two", grade: "x" }],
        error: null,
      }),
      "adult-one",
    );
    expect(kids).toHaveLength(1);
    expect(kids[0].kidUserId).toBe("kid-one");
  });
});

describe("kid-accounts function calls", () => {
  it("creates a login with a normalized payload and maps the result", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: {
        kid: {
          kidUserId: "kid-one",
          parentId: "adult-one",
          username: "avyan_7",
          displayName: "Avyan",
          grade: "4",
        },
      },
      error: null,
    });
    const kid = await createKidAccount(
      clientWith({ functions: { invoke } }),
      {
        username: " AvYan_7 ",
        password: "starfish42",
        displayName: "  Avyan ",
        grade: "4",
      },
    );
    expect(invoke).toHaveBeenCalledWith("kid-accounts", {
      body: {
        action: "create",
        username: "avyan_7",
        password: "starfish42",
        displayName: "Avyan",
        grade: "4",
      },
    });
    expect(kid).toMatchObject({ kidUserId: "kid-one", username: "avyan_7" });
  });

  it("surfaces the function's friendly error message", async () => {
    const invoke = vi.fn().mockResolvedValue({
      data: { error: "That username is already taken. Try another one." },
      error: null,
    });
    await expect(
      createKidAccount(clientWith({ functions: { invoke } }), {
        username: "avyan_7",
        password: "starfish42",
        displayName: "Avyan",
        grade: "4",
      }),
    ).rejects.toThrow("already taken");
  });

  it("sends reset and delete actions", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const client = clientWith({ functions: { invoke } });
    await resetKidPassword(client, "kid-one", "newpass42");
    expect(invoke).toHaveBeenCalledWith("kid-accounts", {
      body: { action: "reset_password", kidUserId: "kid-one", password: "newpass42" },
    });
    await deleteKidAccount(client, "kid-one");
    expect(invoke).toHaveBeenCalledWith("kid-accounts", {
      body: { action: "delete", kidUserId: "kid-one" },
    });
    await setKidAccountActive(client, "kid-one", false);
    expect(invoke).toHaveBeenCalledWith("kid-accounts", {
      body: { action: "set_active", kidUserId: "kid-one", active: false },
    });
    await setKidAccountActive(client, "kid-one", true);
    expect(invoke).toHaveBeenCalledWith("kid-accounts", {
      body: { action: "set_active", kidUserId: "kid-one", active: true },
    });
  });
});

describe("kid progress viewing", () => {
  it("reads and parses the progress saved under a kid login", async () => {
    const result = await fetchKidProgress(
      queryClient({
        data: {
          data: { ...initialProgress, points: 40 },
          revision: 3,
          updated_at: "2026-10-31T12:00:00Z",
        },
        error: null,
      }),
      "kid-one",
    );
    expect(result?.progress.points).toBe(40);
    expect(result?.updatedAt).toBe("2026-10-31T12:00:00Z");
  });

  it("returns null when the kid has no saved progress yet", async () => {
    await expect(
      fetchKidProgress(queryClient({ data: null, error: null }), "kid-one"),
    ).resolves.toBeNull();
    await expect(
      fetchKidProgress(
        queryClient({ data: null, error: new Error("denied") }),
        "kid-one",
      ),
    ).resolves.toBeNull();
  });

  it("summarizes points, accuracy, badges, and best scores", () => {
    const summary = summarizeProgress({
      ...initialProgress,
      points: 120,
      rounds: 3,
      correct: 12,
      answered: 15,
      streak: 2,
      chestCount: 1,
      selectedGrade: "4",
      lastPlayedDate: "2026-10-31",
      codingCompleted: ["c1"],
      bestRounds: { reading: 5 },
    });
    expect(summary.points).toBe(120);
    expect(summary.accuracy).toBe(80);
    expect(summary.grade).toBe("4");
    expect(summary.codingDone).toBe(1);
    expect(summary.badgesEarned.map((badge) => badge.name)).toContain(
      "First Steps",
    );
    expect(summary.bestScores).toEqual([
      { title: expect.any(String), best: 5 },
    ]);
    expect(summary.bestScores[0].title.length).toBeGreaterThan(0);
  });

  it("summarizes a fresh learner without dividing by zero", () => {
    const summary = summarizeProgress(initialProgress);
    expect(summary.accuracy).toBeNull();
    expect(summary.rounds).toBe(0);
    expect(summary.bestScores).toEqual([]);
  });
});

describe("kid PINs", () => {
  it("accepts exactly four digits", () => {
    expect(kidPinError("1234")).toBe("");
    expect(kidPinError("0000")).toBe("");
    expect(kidPinError("123")).toContain("4-digit PIN");
    expect(kidPinError("12345")).toContain("4-digit PIN");
    expect(kidPinError("12a4")).toContain("4-digit PIN");
    expect(kidPinError("")).toContain("4-digit PIN");
  });

  it("builds the stored password from the PIN", () => {
    expect(kidAuthPassword("1234")).toBe("1234-kidpin");
    expect(kidAuthPassword("9876")).toBe("9876-kidpin");
  });
});
