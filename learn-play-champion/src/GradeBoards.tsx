import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Star, Users } from "lucide-react";
import { gradeLabels } from "./content-schema";
import { fetchOwnKidAccount } from "./kid-accounts";
import { rankMedal } from "./family-leaderboard";
import {
  fetchMyKidsGradeBoards,
  isGradeBoardsUnavailable,
  type GradeBoard,
} from "./grade-leaderboard";

/**
 * Same-grade nickname boards, directly under the "My kids" board on the
 * Leaderboard view: for each grade one of the grown-up's kids is in,
 * every kid login in that grade ranked by points. Other families' kids
 * appear only under their Explorer nickname (the Private Rooms
 * nickname); the grown-up's own kids show their real name, highlighted,
 * with a "Your kid" marker.
 *
 * Gating mirrors MyKidsBoard exactly: App only mounts this for a
 * signed-in grown-up cloud session, and the component also hides itself
 * when the session turns out to be a kid login or signed out — kid
 * sessions and guests see no trace of it, and the grade-board request
 * is never made for them.
 */
export default function GradeBoards({ client }: { client: SupabaseClient }) {
  const [adult, setAdult] = useState(false);
  const [state, setState] = useState<
    "loading" | "ready" | "error" | "unavailable"
  >("loading");
  const [boards, setBoards] = useState<GradeBoard[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // Local flag: the `adult` state from this render is stale inside
    // the async closure, and load errors should only surface once the
    // session is confirmed to be a grown-up (earlier failures just stay
    // hidden).
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
        const loaded = await fetchMyKidsGradeBoards(client);
        if (!active) return;
        setBoards(loaded);
        setState("ready");
      } catch (error) {
        if (active && isAdult) {
          setState(isGradeBoardsUnavailable(error) ? "unavailable" : "error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [client, attempt]);

  if (!adult) return null;
  // A grown-up with no kid logins gets no boards at all; the My kids
  // board above already carries the "add a kid login" message.
  if (state === "ready" && boards.length === 0) return null;

  return (
    <section className="panel grade-boards" aria-label="Same-grade boards">
      <div className="section-heading">
        <h2>
          <Users size={23} /> Same-grade boards
        </h2>
        <span className="mini-pill">EXPLORER NICKNAMES</span>
      </div>
      <p className="my-kids-note">
        How your kids compare with other learners in the same grade. Other
        children appear only under their Explorer nickname.
      </p>
      {state === "loading" ? (
        <p role="status">Loading same-grade boards…</p>
      ) : state === "unavailable" ? (
        <p>Grade boards aren’t available yet — please try again later.</p>
      ) : state === "error" ? (
        <div>
          <p role="alert">Could not load the grade boards right now.</p>
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
      ) : (
        boards.map((board) => (
          <div className="grade-board" key={board.grade}>
            <h3>{gradeLabels[board.grade]} learners</h3>
            {board.onlyMine ? (
              <p className="grade-board-note">
                Just your family in {gradeLabels[board.grade]} so far — more
                learners will appear here as other families join.
              </p>
            ) : null}
            <ol className="leaderboard-list grade-board-list">
              {board.rows.map((row) => {
                const medal = rankMedal(row.rank);
                return (
                  <li
                    key={row.kidUserId ?? row.nickname}
                    className={row.isMine ? "grade-board-mine" : undefined}
                  >
                    <span className="rank" aria-label={`Rank ${row.rank}`}>
                      {medal || row.rank}
                    </span>
                    <div>
                      <strong>
                        {row.isMine ? row.displayName : row.nickname}
                      </strong>
                      {row.isMine ? (
                        <span className="mini-pill grade-board-you">
                          YOUR KID
                        </span>
                      ) : null}
                      <small>
                        🔥 {row.streak}-day streak
                        {row.points === 0 && row.rounds === 0
                          ? " · Not played yet"
                          : ""}
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
          </div>
        ))
      )}
    </section>
  );
}
