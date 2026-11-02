import { describe, expect, it } from "vitest";
import {
  rankFamily,
  rankMedal,
  type FamilyLeaderboardEntry,
} from "./family-leaderboard";

function entry(
  overrides: Partial<FamilyLeaderboardEntry> & { kidUserId: string },
): FamilyLeaderboardEntry {
  return {
    displayName: overrides.kidUserId,
    username: overrides.kidUserId,
    grade: "2",
    points: 0,
    streak: 0,
    rounds: 0,
    accuracy: null,
    lastPlayedDate: "",
    ...overrides,
  };
}

describe("rankFamily", () => {
  it("orders kids by points, highest first", () => {
    const rows = rankFamily([
      entry({ kidUserId: "low", points: 10 }),
      entry({ kidUserId: "high", points: 300 }),
      entry({ kidUserId: "mid", points: 120 }),
    ]);
    expect(rows.map((row) => row.kidUserId)).toEqual(["high", "mid", "low"]);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it("breaks point ties by streak, then by rounds, then by name", () => {
    const rows = rankFamily([
      entry({ kidUserId: "b", displayName: "Ben", points: 100, streak: 2, rounds: 9 }),
      entry({ kidUserId: "a", displayName: "Amy", points: 100, streak: 2, rounds: 9 }),
      entry({ kidUserId: "c", displayName: "Cid", points: 100, streak: 2, rounds: 4 }),
      entry({ kidUserId: "d", displayName: "Dee", points: 100, streak: 5, rounds: 1 }),
    ]);
    expect(rows.map((row) => row.kidUserId)).toEqual(["d", "a", "b", "c"]);
    // Dee wins on streak alone; Amy and Ben are fully tied, so they share
    // rank 2 and Cid skips to rank 4.
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  });

  it("shares the rank when points, streak, and rounds are all equal", () => {
    const rows = rankFamily([
      entry({ kidUserId: "x", points: 50, streak: 3, rounds: 6 }),
      entry({ kidUserId: "y", points: 50, streak: 3, rounds: 6 }),
      entry({ kidUserId: "z", points: 50, streak: 3, rounds: 5 }),
    ]);
    expect(rows.map((row) => row.rank)).toEqual([1, 1, 3]);
  });

  it("ranks kids with no progress at the bottom, sharing the last rank", () => {
    const rows = rankFamily([
      entry({ kidUserId: "new-a" }),
      entry({ kidUserId: "played", points: 5, rounds: 1, accuracy: 100 }),
      entry({ kidUserId: "new-b" }),
    ]);
    expect(rows.map((row) => row.kidUserId)).toEqual([
      "played",
      "new-a",
      "new-b",
    ]);
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 2]);
  });

  it("handles a single-kid family and an empty family", () => {
    expect(rankFamily([entry({ kidUserId: "solo", points: 7 })])).toEqual([
      expect.objectContaining({ kidUserId: "solo", rank: 1 }),
    ]);
    expect(rankFamily([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const input = [
      entry({ kidUserId: "b", points: 1 }),
      entry({ kidUserId: "a", points: 2 }),
    ];
    rankFamily(input);
    expect(input.map((item) => item.kidUserId)).toEqual(["b", "a"]);
  });
});

describe("rankMedal", () => {
  it("medals only the top three ranks", () => {
    expect(rankMedal(1)).toBe("🥇");
    expect(rankMedal(2)).toBe("🥈");
    expect(rankMedal(3)).toBe("🥉");
    expect(rankMedal(4)).toBe("");
  });
});
