import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Star, Trophy } from "lucide-react";
import { gradeLabels } from "./content-schema";
import {
  fetchKidProgress,
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  summarizeProgress,
} from "./kid-accounts";
import {
  rankFamily,
  rankMedal,
  type FamilyLeaderboardEntry,
  type FamilyLeaderboardRow,
} from "./family-leaderboard";

/**
 * "My kids" board for the kid-facing Leaderboard view: the grown-up's
 * real children ranked with the exact same family-leaderboard ranking
 * (and the same per-kid progress reads) as the Family Leaderboard in the
 * Parents dashboard. App only mounts this for a signed-in grown-up cloud
 * session; like KidLogins it also hides itself when the session turns
 * out to be a kid login or signed out, so kid sessions and guests see
 * no trace of it — not even a fetch.
 */
export default function MyKidsBoard({ client }: { client: SupabaseClient }) {
  const [adult, setAdult] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<FamilyLeaderboardRow[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // Local flag: the `adult` state from this render is stale inside the
    // async closure, and load errors should only surface once the session
    // is confirmed to be a grown-up (earlier failures just stay hidden).
    let isAdult = false;
    (async () => {
      try {
        const { data } = await client.auth.getUser();
        const userId = data.user?.id ?? "";
        if (!userId) return;
        const own = await fetchOwnKidAccount(client, userId);
        if (!active) return;
        if (own) return;
        isAdult = true;
        setAdult(true);
        setState("loading");
        const kids = await fetchMyKidAccounts(client, userId);
        if (!active) return;
        const entries: FamilyLeaderboardEntry[] = await Promise.all(
          kids.map(async (kid) => {
            const kidProgress = await fetchKidProgress(client, kid.kidUserId);
            const summary = kidProgress
              ? summarizeProgress(kidProgress.progress)
              : null;
            return {
              kidUserId: kid.kidUserId,
              displayName: kid.displayName,
              username: kid.username,
              grade: kid.grade,
              points: summary?.points ?? 0,
              streak: summary?.streak ?? 0,
              rounds: summary?.rounds ?? 0,
              accuracy: summary?.accuracy ?? null,
              lastPlayedDate: summary?.lastPlayedDate ?? "",
            };
          }),
        );
        if (!active) return;
        setRows(rankFamily(entries));
        setState("ready");
      } catch {
        if (active && isAdult) setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [client, attempt]);

  if (!adult) return null;

  return (
    <section className="panel my-kids-board" aria-label="My kids">
      <div className="section-heading">
        <h2>
          <Trophy size={23} /> My kids
        </h2>
        <span className="mini-pill">REAL SCORES</span>
      </div>
      <p className="my-kids-note">Your children's real positions, by points.</p>
      {state === "loading" ? (
        <p role="status">Loading your kids' positions…</p>
      ) : state === "error" ? (
        <div>
          <p role="alert">Could not load your kids' positions right now.</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setState("loading");
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </button>
        </div>
      ) : rows.length === 0 ? (
        <p>
          No kid logins yet. Add one in the Parents dashboard and your
          children's real positions will be ranked here.
        </p>
      ) : (
        <ol className="leaderboard-list my-kids-list">
          {rows.map((row) => {
            const medal = rankMedal(row.rank);
            return (
              <li key={row.kidUserId}>
                <span className="rank" aria-label={`Rank ${row.rank}`}>
                  {medal || row.rank}
                </span>
                <div>
                  <strong>{row.displayName}</strong>
                  <small>
                    {gradeLabels[row.grade]} · 🔥 {row.streak}-day streak
                    {row.lastPlayedDate ? "" : " · Not played yet"}
                  </small>
                </div>
                <span className="leader-score">
                  {row.points}
                  <Star size={14} fill="currentColor" />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
