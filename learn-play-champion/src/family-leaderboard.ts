import type { GradeId } from "./content-schema";

/**
 * Family Leaderboard ranking. A parent manages one or more kid logins;
 * this module ranks those kids against each other from the same progress
 * summaries the Kid logins panel already shows (points, streak, rounds,
 * accuracy, last played). It is pure: feed it per-kid entries, get back
 * ranked rows.
 */

export interface FamilyLeaderboardEntry {
  kidUserId: string;
  displayName: string;
  username: string;
  grade: GradeId;
  points: number;
  streak: number;
  rounds: number;
  /** Percent correct, or null when the kid has answered nothing yet. */
  accuracy: number | null;
  /** ISO date (YYYY-MM-DD) of the last day played, "" when never played. */
  lastPlayedDate: string;
}

export interface FamilyLeaderboardRow extends FamilyLeaderboardEntry {
  rank: number;
}

function sameScore(a: FamilyLeaderboardEntry, b: FamilyLeaderboardEntry): boolean {
  return a.points === b.points && a.streak === b.streak && a.rounds === b.rounds;
}

/**
 * Rank kids by points (descending). Ties on points fall to the longer
 * streak, then to more rounds played, then to the display name so the
 * order is stable. Ranks use standard competition ranking: kids equal on
 * points, streak, and rounds share a rank, and the next rank skips ahead
 * (1, 1, 3). Kids with no progress yet (all zeros) rank together at the
 * bottom. The input array is not mutated.
 */
export function rankFamily(
  entries: FamilyLeaderboardEntry[],
): FamilyLeaderboardRow[] {
  const sorted = [...entries].sort(
    (a, b) =>
      b.points - a.points ||
      b.streak - a.streak ||
      b.rounds - a.rounds ||
      a.displayName.localeCompare(b.displayName) ||
      a.username.localeCompare(b.username) ||
      a.kidUserId.localeCompare(b.kidUserId),
  );
  let rank = 0;
  return sorted.map((entry, index) => {
    const previous = sorted[index - 1];
    if (!previous || !sameScore(previous, entry)) rank = index + 1;
    return { ...entry, rank };
  });
}

/** Medal shown for the top three ranks; "" for everyone else. */
export function rankMedal(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}
