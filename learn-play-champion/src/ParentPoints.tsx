import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeLabels } from "./content-schema";
import {
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  type KidAccount,
} from "./kid-accounts";
import {
  awardParentPoints,
  dailyParentAssignments,
  loadParentPointsStore,
  localDateString,
  observeKidCompletions,
  parentPointsAccountFor,
  saveParentPointsStore,
  totalParentPoints,
  withParentPointsAccount,
  PARENT_POINTS_UPDATED_EVENT,
  PARENT_POINT_SKILL_LABELS,
  requestParentReview,
  type KidTaskCompletion,
  type ParentAssignment,
  type ParentPointsAccount,
  type ParentPointsStore,
} from "./parent-points";
import { fetchKidTasks } from "./kid-tasks";

function failure(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatDay(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? isoDate
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

/**
 * Read every managed kid's task list and collect the completions —
 * the observe-and-award input for kid-assignment points. A kid whose
 * tasks fail to load simply contributes nothing this time.
 */
async function fetchKidCompletions(
  client: SupabaseClient,
  kids: KidAccount[],
): Promise<KidTaskCompletion[]> {
  const lists = await Promise.all(
    kids.map(async (kid) => {
      try {
        return await fetchKidTasks(client, kid.kidUserId);
      } catch {
        return [];
      }
    }),
  );
  const completions: KidTaskCompletion[] = [];
  kids.forEach((kid, index) => {
    for (const task of lists[index]) {
      if (task.done && task.completedAt) {
        completions.push({
          kidUserId: kid.kidUserId,
          kidName: kid.displayName,
          // The done day, the same date the Kid logins list displays.
          date: task.completedAt.slice(0, 10),
        });
      }
    }
  });
  return completions;
}

/** Where an assignment's button takes the parent in the Kid logins list. */
function reviewRequestFor(
  assignment: ParentAssignment,
  kids: KidAccount[],
): { kidUserId: string; view: "progress" | "tasks"; subject?: "english" | "math" } | null {
  if (assignment.action === "check-in") {
    // The check-in opens the first kid's progress in the list above.
    const first = kids[0];
    return first ? { kidUserId: first.kidUserId, view: "progress" } : null;
  }
  if (assignment.action === "check-tasks") {
    return { kidUserId: assignment.kidUserId, view: "tasks" };
  }
  return {
    kidUserId: assignment.kidUserId,
    view: "progress",
    subject: assignment.action === "review-english" ? "english" : "math",
  };
}

/**
 * Parent Points: grown-ups earn points once a day for checking in and
 * for reviewing each kid's progress — English and Math skills at the
 * kid's own grade level — and each kid's tasks. Renders nothing for
 * guest sessions and for sessions that are themselves a kid login,
 * exactly like the Kid logins manager it sits next to.
 */
export default function ParentPoints({ client }: { client: SupabaseClient }) {
  const [userId, setUserId] = useState("");
  const [isKid, setIsKid] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [kids, setKids] = useState<KidAccount[]>([]);
  const [store, setStore] = useState<ParentPointsStore | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const today = localDateString();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await client.auth.getUser();
        const id = data.user?.id ?? "";
        if (!id) return;
        const own = await fetchOwnKidAccount(client, id);
        if (!active) return;
        if (own) {
          setIsKid(true);
          return;
        }
        const managed = await fetchMyKidAccounts(client, id);
        if (!active) return;
        setUserId(id);
        setKids(managed);
        const loadedStore = loadParentPointsStore();
        setStore(loadedStore);
        // Observe-and-award: +1 per kid per day for assignment
        // completions in the last 7 days, from the kids' own task
        // lists. Already-awarded days are remembered in the store, so
        // this is safe to run on every load.
        let completions: KidTaskCompletion[] = [];
        try {
          completions = await fetchKidCompletions(client, managed);
        } catch {
          completions = [];
        }
        if (!active || completions.length === 0) return;
        const observed = observeKidCompletions(
          parentPointsAccountFor(loadedStore, id),
          completions,
        );
        if (observed.awardedCount === 0) return;
        const next = withParentPointsAccount(
          loadedStore,
          id,
          observed.account,
        );
        saveParentPointsStore(next);
        if (active) setStore(next);
      } catch (loadFailure) {
        if (active) setError(failure(loadFailure));
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  // Out-of-panel awards (a completed donation) write the same store
  // from the DonationPanel below; reload when one lands so this
  // panel's copy — totals, recent activity, done states — stays fresh.
  useEffect(() => {
    const refresh = () => setStore(loadParentPointsStore());
    window.addEventListener(PARENT_POINTS_UPDATED_EVENT, refresh);
    return () =>
      window.removeEventListener(PARENT_POINTS_UPDATED_EVENT, refresh);
  }, []);

  if (!loaded || isKid || !userId || !store) return null;

  const account: ParentPointsAccount = parentPointsAccountFor(store, userId);
  const assignments = dailyParentAssignments(kids, account, today);
  const total = totalParentPoints(account);

  const complete = (assignment: ParentAssignment) => {
    const result = awardParentPoints(account, {
      action: assignment.action,
      kidUserId: assignment.kidUserId,
      label: assignment.title,
    });
    if (result.awarded) {
      const next = withParentPointsAccount(store, userId, result.account);
      setStore(next);
      saveParentPointsStore(next);
      setNotice(
        `+${result.points} ${PARENT_POINT_SKILL_LABELS[result.skill]} points — ${assignment.title}.`,
      );
    }
    // Take the parent to the kid's existing view either way, so the
    // review itself (not just the points) is one click from here.
    const request = reviewRequestFor(assignment, kids);
    if (request) requestParentReview(request);
  };

  const kidGroups = kids
    .map((kid) => ({
      kid,
      assignments: assignments.filter(
        (assignment) => assignment.kidUserId === kid.kidUserId,
      ),
    }))
    .filter((group) => group.assignments.length > 0);
  const checkIn = assignments.find(
    (assignment) => assignment.action === "check-in",
  );

  const renderAssignment = (assignment: ParentAssignment) => (
    <li key={`${assignment.action}:${assignment.kidUserId}`} className="parent-points-row">
      <span className="parent-points-assignment">
        <span>{assignment.title}</span>
        <span className="parent-points-value">
          +{assignment.points} {PARENT_POINT_SKILL_LABELS[assignment.skill]} points
        </span>
      </span>
      {assignment.done ? (
        <span className="parent-points-done">✅ Done today</span>
      ) : (
        <button
          className="button secondary"
          type="button"
          onClick={() => complete(assignment)}
        >
          {assignment.action === "check-in"
            ? "Open progress"
            : assignment.action === "check-tasks"
              ? "Check tasks"
              : "Review"}
        </button>
      )}
    </li>
  );

  return (
    <section className="parent-points" aria-label="Parent points">
      <h2>Parent points</h2>
      <p>
        Earn points for staying involved: check in each day, review each
        child's English and Math skills at their own grade level, and
        check their tasks. Just logging in and looking at your child's
        progress earns points — new assignments arrive every day.
      </p>
      {error && (
        <p className="kid-logins-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="kid-logins-notice" role="status">
          {notice}
        </p>
      )}
      <div className="parent-points-summary">
        <span className="parent-points-total">
          ⭐ <strong>{total}</strong> parent points
        </span>
        <span className="parent-points-breakdown">
          <span>📚 English <strong>{account.totals.english}</strong></span>
          <span>🔢 Math <strong>{account.totals.math}</strong></span>
          <span>🌟 General <strong>{account.totals.general}</strong></span>
        </span>
      </div>
      <h3>Today's assignments</h3>
      {kids.length === 0 ? (
        <p>
          No kid logins yet. Create one in Kid logins above and daily
          parent assignments will appear here, matched to that child's
          grade.
        </p>
      ) : (
        <>
          {checkIn && (
            <ul className="parent-points-list">{renderAssignment(checkIn)}</ul>
          )}
          {kidGroups.map(({ kid, assignments: group }) => (
            <div key={kid.kidUserId} className="parent-points-kid">
              <h4>
                {kid.displayName} · {gradeLabels[kid.grade]}
              </h4>
              <ul className="parent-points-list">
                {group.map(renderAssignment)}
              </ul>
            </div>
          ))}
        </>
      )}
      {account.recent.length > 0 && (
        <>
          <h3>Recent activity</h3>
          <ul className="parent-points-recent">
            {account.recent.map((entry, index) => (
              <li key={`${entry.at}:${index}`}>
                +{entry.points} {PARENT_POINT_SKILL_LABELS[entry.skill]} points
                — {entry.label} · {formatDay(entry.date)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
