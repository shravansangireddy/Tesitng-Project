import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import {
  createKidAccount,
  deleteKidAccount,
  fetchKidProgress,
  fetchKidParents,
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  kidNameError,
  kidPinError,
  MAX_KID_ACCOUNTS,
  resetKidPassword,
  setKidAccountActive,
  shareKidAccount,
  summarizeProgress,
  unshareKidAccount,
  updateKidAccount,
  usernameError,
  type KidAccount,
  type KidParent,
  type KidProgress,
} from "./kid-accounts";
import { activities, type ActivityId } from "./game";
import {
  rankFamily,
  rankMedal,
  type FamilyLeaderboardEntry,
  type FamilyLeaderboardRow,
} from "./family-leaderboard";
import {
  addAllSkillTasks,
  ALL_SKILL_TASKS,
  createKidTask,
  deleteKidTask,
  fetchKidTasks,
  taskTitleError,
  type KidTask,
} from "./kid-tasks";
import ProgressCharts from "./ProgressCharts";
import {
  PARENT_REVIEW_EVENT,
  parseParentReviewRequest,
} from "./parent-points";
import { barFraction, totalChartedCorrect } from "./progress-charts";

function failure(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

/**
 * Grown-up manager for kid logins (username + password accounts a parent
 * creates for a child). Renders nothing for guest sessions and for
 * sessions that are themselves a kid login.
 */
export default function KidLogins({ client }: { client: SupabaseClient }) {
  const [parentId, setParentId] = useState("");
  const [isKid, setIsKid] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [kids, setKids] = useState<KidAccount[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<GradeId | "">("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await client.auth.getUser();
        const userId = data.user?.id ?? "";
        if (!userId) return;
        const own = await fetchOwnKidAccount(client, userId);
        if (!active) return;
        if (own) {
          setIsKid(true);
          return;
        }
        setParentId(userId);
        setKids(await fetchMyKidAccounts(client, userId));
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

  if (!loaded || isKid || !parentId) return null;

  const refresh = async () => setKids(await fetchMyKidAccounts(client, parentId));

  // The zero-kid banner's button takes the grown-up straight to the
  // create form's first field (the form renders just below).
  const focusCreateForm = () => {
    const input = nameInputRef.current;
    if (!input) return;
    if (typeof input.scrollIntoView === "function")
      input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus();
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating) return;
    const problem =
      usernameError(username) ||
      kidNameError(name) ||
      (!grade ? "Choose a grade." : "") ||
      kidPinError(password);
    setNotice("");
    setFormError("");
    if (problem) {
      setFormError(problem);
      return;
    }
    setCreating(true);
    setError("");
    try {
      const kid = await createKidAccount(client, {
        username,
        password,
        displayName: name,
        grade: grade as GradeId,
      });
      await refresh();
      setUsername("");
      setName("");
      setPassword("");
      setNotice(
        `Login created — ${kid.displayName} can now sign in with the username “${kid.username}”.`,
      );
    } catch (createFailure) {
      setFormError(failure(createFailure));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section className="kid-logins" aria-label="Kid logins">
      <h2>Kid logins</h2>
      <p>
        Give each child their own username and 4-digit PIN so they can
        sign in on any device and keep their own progress. No email address
        is needed, and usernames are never shown publicly. You create and
        control these logins: reset a PIN or delete a login here at any
        time. Each login can be shared with another grown-up (use the
        Grown-ups button on a child below), so both parents can manage it.
      </p>
      {kids.length === 0 && (
        <div className="kid-logins-banner">
          <p>
            <strong>You’re 1 step away — add your child to start.</strong>{" "}
            Create their login below and they can sign in and play right
            away.
          </p>
          <button
            className="button primary"
            type="button"
            onClick={focusCreateForm}
          >
            Add your child — takes 2 minutes
          </button>
        </div>
      )}
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
      <FamilyLeaderboard client={client} kids={kids} />
      {kids.length > 0 && (
        <ul className="kid-logins-list">
          {kids.map((kid) => (
            <KidLoginRow
              key={kid.kidUserId}
              client={client}
              parentId={parentId}
              kid={kid}
              onChanged={refresh}
              onError={setError}
              onNotice={setNotice}
            />
          ))}
        </ul>
      )}
      {kids.length < MAX_KID_ACCOUNTS ? (
        <form className="kid-logins-form" onSubmit={create}>
          <h3>Create a kid login</h3>
          <label>
            Child's first name or nickname
            <input
              ref={nameInputRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g., Ava"
              maxLength={40}
              autoComplete="off"
              disabled={creating}
            />
          </label>
          <label>
            Username (for signing in)
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="e.g., ava_2017"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              disabled={creating}
            />
          </label>
          <label>
            Grade
            <select
              value={grade}
              onChange={(event) => {
                const next = gradeIds.find((id) => id === event.target.value);
                setGrade(next ?? "");
              }}
              disabled={creating}
            >
              <option value="">Choose a grade</option>
              {gradeIds.map((id) => (
                <option key={id} value={id}>
                  {gradeLabels[id]}
                </option>
              ))}
            </select>
          </label>
          <label>
            PIN (4 digits)
            <input
              type="password"
              inputMode="numeric"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="4 numbers your child can remember"
              maxLength={4}
              autoComplete="new-password"
              disabled={creating}
            />
          </label>
          <p className="kid-logins-pin-note">
            Your child signs in with this username + PIN. You can reset the
            PIN anytime from your dashboard.
          </p>
          {formError && (
            <p className="kid-logins-error" role="alert">
              {formError}
            </p>
          )}
          <button className="button primary" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create login"}
          </button>
        </form>
      ) : (
        <p>You have created the maximum of {MAX_KID_ACCOUNTS} kid logins.</p>
      )}
    </section>
  );
}

function KidLoginRow({
  client,
  parentId,
  kid,
  onChanged,
  onError,
  onNotice,
}: {
  client: SupabaseClient;
  parentId: string;
  kid: KidAccount;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState(kid.displayName);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressState, setProgressState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [kidProgress, setKidProgress] = useState<KidProgress | null>(null);
  const [parentsOpen, setParentsOpen] = useState(false);
  const [kidParents, setKidParents] = useState<KidParent[] | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const rowRef = useRef<HTMLLIElement>(null);

  const loadParents = async () => {
    try {
      setKidParents(await fetchKidParents(client, kid.kidUserId));
    } catch (parentsFailure) {
      onError(failure(parentsFailure));
    }
  };

  const toggleParents = () => {
    const next = !parentsOpen;
    setParentsOpen(next);
    if (next && kidParents === null) void loadParents();
  };

  const share = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await shareKidAccount(client, kid.kidUserId, shareEmail);
      onError("");
      onNotice(
        `${kid.displayName}'s login is now shared with ${shareEmail.trim()}.`,
      );
      setShareEmail("");
      await loadParents();
    } catch (shareFailure) {
      onError(failure(shareFailure));
    } finally {
      setBusy(false);
    }
  };

  const removeParent = async (target: KidParent) => {
    if (
      !window.confirm(
        `Stop sharing ${kid.displayName}'s login with ${target.email}? They will no longer see or manage it.`,
      )
    )
      return;
    setBusy(true);
    try {
      await unshareKidAccount(client, kid.kidUserId, target.parentId);
      onError("");
      onNotice(`${target.email} no longer manages ${kid.displayName}'s login.`);
      await loadParents();
    } catch (unshareFailure) {
      onError(failure(unshareFailure));
    } finally {
      setBusy(false);
    }
  };

  const loadProgress = async () => {
    setProgressState("loading");
    try {
      setKidProgress(await fetchKidProgress(client, kid.kidUserId));
      setProgressState("ready");
    } catch {
      setProgressState("error");
    }
  };

  const toggleProgress = () => {
    const next = !progressOpen;
    setProgressOpen(next);
    if (next && progressState === "idle") void loadProgress();
  };

  // Parent Points assignments ask to open this kid's progress or tasks:
  // open the progress panel for progress reviews (the tasks manager is
  // always visible in the row) and bring the row into view.
  useEffect(() => {
    const onReviewRequest = (event: Event) => {
      const request = parseParentReviewRequest(event);
      if (!request || request.kidUserId !== kid.kidUserId) return;
      if (request.view === "progress") {
        setProgressOpen(true);
        if (progressState === "idle") void loadProgress();
      }
      const row = rowRef.current;
      if (row && typeof row.scrollIntoView === "function") {
        row.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener(PARENT_REVIEW_EVENT, onReviewRequest);
    return () =>
      window.removeEventListener(PARENT_REVIEW_EVENT, onReviewRequest);
  }, [kid.kidUserId, progressState]);

  const commitName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === kid.displayName) {
      setName(kid.displayName);
      return;
    }
    setBusy(true);
    try {
      await updateKidAccount(client, kid.kidUserId, { displayName: trimmed });
      onError("");
      onNotice(`Renamed to ${trimmed}.`);
      await onChanged();
    } catch (updateFailure) {
      onError(failure(updateFailure));
      setName(kid.displayName);
    } finally {
      setBusy(false);
    }
  };

  const changeGrade = async (next: GradeId) => {
    setBusy(true);
    try {
      await updateKidAccount(client, kid.kidUserId, { grade: next });
      onError("");
      await onChanged();
    } catch (updateFailure) {
      onError(failure(updateFailure));
    } finally {
      setBusy(false);
    }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = kidPinError(newPassword);
    if (problem) {
      onError(problem);
      return;
    }
    setBusy(true);
    try {
      await resetKidPassword(client, kid.kidUserId, newPassword);
      setNewPassword("");
      setResetOpen(false);
      onError("");
      onNotice(`PIN reset for ${kid.displayName}.`);
    } catch (resetFailure) {
      onError(failure(resetFailure));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      await setKidAccountActive(client, kid.kidUserId, !kid.active);
      onError("");
      onNotice(
        kid.active
          ? `${kid.displayName}'s login is paused — they can't sign in until you turn it back on.`
          : `${kid.displayName}'s login is back on.`,
      );
      await onChanged();
    } catch (toggleFailure) {
      onError(failure(toggleFailure));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !window.confirm(
        `Delete ${kid.displayName}'s login (“${kid.username}”)? This also deletes the progress saved under that login. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteKidAccount(client, kid.kidUserId);
      onError("");
      onNotice(`Deleted ${kid.displayName}'s login.`);
      await onChanged();
    } catch (deleteFailure) {
      onError(failure(deleteFailure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="kid-logins-row" id={`kid-row-${kid.kidUserId}`} ref={rowRef}>
      <div className="kid-logins-row-main">
        <input
          aria-label={`Name for ${kid.username}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void commitName()}
          maxLength={40}
          disabled={busy}
        />
        <select
          aria-label={`Grade for ${kid.username}`}
          value={kid.grade}
          onChange={(event) => {
            const next = gradeIds.find((id) => id === event.target.value);
            if (next) void changeGrade(next);
          }}
          disabled={busy}
        >
          {gradeIds.map((id) => (
            <option key={id} value={id}>
              {gradeLabels[id]}
            </option>
          ))}
        </select>
      </div>
      <p className="kid-logins-username">
        Signs in with username <strong>{kid.username}</strong> · Login is{" "}
        <strong>{kid.active ? "ON" : "PAUSED"}</strong>
      </p>
      <div className="kid-logins-row-actions">
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          aria-expanded={progressOpen}
          onClick={toggleProgress}
        >
          {progressOpen ? "Hide progress" : "View progress"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          aria-expanded={parentsOpen}
          onClick={toggleParents}
        >
          {parentsOpen ? "Hide grown-ups" : "Grown-ups"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => void toggleActive()}
        >
          {kid.active ? "Pause login" : "Reactivate login"}
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => setResetOpen((open) => !open)}
        >
          Reset PIN
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => void remove()}
        >
          Delete login
        </button>
      </div>
      {resetOpen && (
        <form className="kid-logins-reset" onSubmit={reset}>
          <label>
            New PIN for {kid.displayName}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              inputMode="numeric"
              maxLength={4}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Set new PIN"}
          </button>
        </form>
      )}
      {progressOpen && (
        <KidProgressPanel
          kid={kid}
          state={progressState}
          kidProgress={kidProgress}
          onRetry={() => void loadProgress()}
        />
      )}
      {parentsOpen && (
        <div className="kid-parents">
          <p>
            Grown-ups who can manage {kid.displayName}'s login — set the
            PIN, pause it, assign tasks, and see progress:
          </p>
          {kidParents === null ? (
            <p>Loading…</p>
          ) : (
            <ul className="kid-parents-list">
              {kidParents.map((parent) => (
                <li key={parent.parentId}>
                  <span>
                    {parent.email || "A grown-up"}
                    {parent.isOwner ? " (created this login)" : ""}
                    {parent.parentId === parentId ? " — that's you" : ""}
                  </span>
                  {!parent.isOwner && (
                    <button
                      className="text-button danger"
                      type="button"
                      disabled={busy}
                      onClick={() => void removeParent(parent)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <form className="kid-logins-reset" onSubmit={share}>
            <label>
              Share with another grown-up (their sign-in email)
              <input
                type="email"
                autoComplete="email"
                placeholder="grown-up@example.com"
                value={shareEmail}
                onChange={(event) => setShareEmail(event.target.value)}
                disabled={busy}
                maxLength={254}
              />
            </label>
            <button
              className="button primary"
              type="submit"
              disabled={busy || !shareEmail.trim()}
            >
              Share login
            </button>
          </form>
        </div>
      )}
      <KidTasksManager client={client} parentId={parentId} kid={kid} />
    </li>
  );
}

function KidTasksManager({
  client,
  parentId,
  kid,
}: {
  client: SupabaseClient;
  parentId: string;
  kid: KidAccount;
}) {
  const [tasks, setTasks] = useState<KidTask[] | null>(null);
  const [title, setTitle] = useState("");
  const [activityId, setActivityId] = useState<ActivityId | "">("");
  const [adding, setAdding] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [skillStatus, setSkillStatus] = useState("");
  const [skillError, setSkillError] = useState("");
  const [taskError, setTaskError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await fetchKidTasks(client, kid.kidUserId);
        if (active) setTasks(rows);
      } catch {
        if (active) setTasks([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [client, kid.kidUserId]);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    if (adding) return;
    const problem = taskTitleError(title);
    if (problem) {
      setTaskError(problem);
      return;
    }
    setAdding(true);
    setTaskError("");
    try {
      const created = await createKidTask(client, {
        parentId,
        kidUserId: kid.kidUserId,
        title,
        activityId: activityId || null,
      });
      setTasks((current) => [...(current ?? []), created]);
      setTitle("");
      setActivityId("");
      setSkillStatus("");
      setSkillError("");
    } catch (addFailure) {
      setTaskError(failure(addFailure));
    } finally {
      setAdding(false);
    }
  };

  const addAllSkills = async () => {
    if (addingAll || tasks === null) return;
    setAddingAll(true);
    setSkillStatus("");
    setSkillError("");
    try {
      const { added, failed } = await addAllSkillTasks(client, {
        parentId,
        kidUserId: kid.kidUserId,
        existing: tasks,
      });
      if (added.length > 0) {
        setTasks((current) => [...(current ?? []), ...added]);
      }
      const skillWord = (count: number) =>
        count === 1 ? "skill" : "skills";
      if (failed > 0) {
        setSkillError(
          added.length > 0
            ? `Added ${added.length} ${skillWord(added.length)}, but ${failed} couldn't be added. Please try again.`
            : "The skills couldn't be added. Please try again.",
        );
      } else if (added.length === 0) {
        setSkillStatus(
          `All ${ALL_SKILL_TASKS.length} skills are already on ${kid.displayName}'s list.`,
        );
      } else {
        setSkillStatus(
          `Added ${added.length} ${skillWord(added.length)} to ${kid.displayName}'s list.`,
        );
      }
    } catch (allFailure) {
      setSkillError(failure(allFailure));
    } finally {
      setAddingAll(false);
    }
  };

  const removeTask = async (task: KidTask) => {
    try {
      await deleteKidTask(client, task.id);
      setTasks((current) =>
        (current ?? []).filter((item) => item.id !== task.id),
      );
      setSkillStatus("");
      setSkillError("");
    } catch (removeFailure) {
      setTaskError(failure(removeFailure));
    }
  };

  return (
    <div className="kid-tasks-manager">
      <h3>Tasks for {kid.displayName}</h3>
      <p className="kid-tasks-manager-note">
        Tasks appear on {kid.displayName}'s home screen after they sign in. A
        task with an activity opens that adventure directly. Only{" "}
        {kid.displayName} can tick a task off as done — grown-ups can't mark
        tasks done for them.
      </p>
      {taskError && (
        <p className="kid-logins-error" role="alert">
          {taskError}
        </p>
      )}
      {tasks === null ? (
        <p role="status">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <p>No tasks yet.</p>
      ) : (
        <ul className="kid-tasks-manager-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <span>
                {task.done ? "✅ " : "⏳ "}
                {task.title}
                {task.done && task.completedAt
                  ? ` — done ${formatDay(task.completedAt.slice(0, 10))}`
                  : ""}
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => void removeTask(task)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="kid-tasks-manager-add-all">
        <button
          type="button"
          className="button secondary"
          onClick={() => void addAllSkills()}
          disabled={addingAll || adding || tasks === null}
        >
          {addingAll ? "Adding skills…" : "Add all skills"}
        </button>
        {skillStatus && <p role="status">{skillStatus}</p>}
        {skillError && (
          <p className="kid-logins-error" role="alert">
            {skillError}
          </p>
        )}
      </div>
      <form className="kid-tasks-manager-form" onSubmit={add}>
        <label>
          New task
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Play Math Mountain"
            maxLength={80}
            disabled={adding}
          />
        </label>
        <label>
          Opens this activity (optional)
          <select
            value={activityId}
            onChange={(event) =>
              setActivityId(event.target.value as ActivityId | "")
            }
            disabled={adding}
          >
            <option value="">No specific activity</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary" type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add task"}
        </button>
      </form>
    </div>
  );
}

/**
 * Family Leaderboard: ranks every kid login this grown-up manages
 * against each other, using the same per-kid progress reads as the
 * "View progress" panels below (learner_progress via fetchKidProgress).
 * Read-only; renders only inside the grown-ups-only Kid logins section.
 */
function FamilyLeaderboard({
  client,
  kids,
}: {
  client: SupabaseClient;
  kids: KidAccount[];
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [rows, setRows] = useState<FamilyLeaderboardRow[]>([]);
  const [attempt, setAttempt] = useState(0);
  // The parent panel rebuilds the kids array on every refresh; key the
  // reload on the kid identities and labels actually shown instead.
  const kidsKey = kids
    .map((kid) => `${kid.kidUserId}:${kid.displayName}:${kid.grade}`)
    .join("|");

  useEffect(() => {
    if (kids.length === 0) {
      setRows([]);
      setState("ready");
      return;
    }
    let active = true;
    setState("loading");
    (async () => {
      try {
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
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
    };
    // kids is captured from the render that produced kidsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, kidsKey, attempt]);

  // Points bars are scaled to the family's top scorer.
  const topPoints = rows.reduce((max, row) => Math.max(max, row.points), 0);

  return (
    <div className="family-leaderboard">
      <h3>Family leaderboard</h3>
      {kids.length === 0 ? (
        <p>
          No kid logins yet. Create one below and your children's points
          and streaks will be ranked here.
        </p>
      ) : state === "loading" ? (
        <p role="status">Loading the leaderboard…</p>
      ) : state === "error" ? (
        <div>
          <p role="alert">Could not load the leaderboard right now.</p>
          <button
            className="button secondary"
            type="button"
            onClick={() => setAttempt((count) => count + 1)}
          >
            Try again
          </button>
        </div>
      ) : (
        <ol className="family-leaderboard-list">
          {rows.map((row) => {
            const medal = rankMedal(row.rank);
            return (
              <li key={row.kidUserId} className="family-leaderboard-row">
                <span
                  className="family-leaderboard-rank"
                  aria-label={`Rank ${row.rank}`}
                >
                  {medal || `#${row.rank}`}
                </span>
                <span className="family-leaderboard-name">
                  {row.displayName}
                </span>
                <span>{gradeLabels[row.grade]}</span>
                <span className="family-leaderboard-stats">
                  <span>
                    ⭐ <strong>{row.points}</strong> points
                  </span>
                  <span>🔥 {row.streak}-day streak</span>
                  <span>🎯 {row.rounds} rounds</span>
                  {row.accuracy !== null && (
                    <span>✅ {row.accuracy}% correct</span>
                  )}
                  <span>
                    {row.lastPlayedDate
                      ? `Last played ${formatDay(row.lastPlayedDate)}`
                      : "Not played yet"}
                  </span>
                </span>
                <span
                  className="family-leaderboard-bar"
                  role="img"
                  aria-label={`${row.displayName} has ${row.points} points`}
                >
                  <span
                    className="family-leaderboard-bar-fill"
                    aria-hidden="true"
                    style={{
                      width: `${Math.round(barFraction(row.points, topPoints) * 100)}%`,
                    }}
                  />
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
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

function KidProgressPanel({
  kid,
  state,
  kidProgress,
  onRetry,
}: {
  kid: KidAccount;
  state: "idle" | "loading" | "ready" | "error";
  kidProgress: KidProgress | null;
  onRetry: () => void;
}) {
  if (state === "loading" || state === "idle")
    return (
      <p className="kid-progress" role="status">
        Loading {kid.displayName}'s progress…
      </p>
    );
  if (state === "error")
    return (
      <div className="kid-progress">
        <p role="alert">Could not load progress right now.</p>
        <button className="button secondary" type="button" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  if (!kidProgress)
    return (
      <p className="kid-progress">
        No saved progress yet — it will appear here after {kid.displayName}{" "}
        signs in with this login and plays.
      </p>
    );
  const summary = summarizeProgress(kidProgress.progress);
  return (
    <div className="kid-progress">
      <div className="kid-progress-stats">
        <span>⭐ <strong>{summary.points}</strong> points</span>
        <span>🔥 {summary.streak}-day streak</span>
        <span>🎯 {summary.rounds} rounds played</span>
        {summary.accuracy !== null && (
          <span>✅ {summary.accuracy}% correct</span>
        )}
        <span>💎 {summary.chests} treasure chests</span>
        <span>💻 {summary.codingDone} coding lessons</span>
        <span>🤖 {summary.aiDone} AI lessons</span>
      </div>
      <p>
        Badges: {summary.badgesEarned.length} of {summary.badgesTotal}
        {summary.badgesEarned.length > 0 &&
          ` — ${summary.badgesEarned.map((badge) => `${badge.symbol} ${badge.name}`).join(" · ")}`}
      </p>
      {summary.bestScores.length > 0 && (
        <>
          <p>
            <strong>Best scores</strong>
          </p>
          <ul className="kid-progress-bests">
            {summary.bestScores.map((score) => (
              <li key={score.title}>
                {score.title} — best {score.best}/5
              </li>
            ))}
          </ul>
        </>
      )}
      {totalChartedCorrect(kidProgress.progress) > 0 && (
        <>
          <p>
            <strong>Progress charts</strong> — correct answers by subject
            and top activities
          </p>
          <ProgressCharts progress={kidProgress.progress} />
        </>
      )}
      <p className="kid-progress-meta">
        {summary.grade && <>Playing at {gradeLabels[summary.grade]}. </>}
        {summary.lastPlayedDate && (
          <>Last played {formatDay(summary.lastPlayedDate)}. </>
        )}
        {kidProgress.updatedAt && (
          <>Saved {new Date(kidProgress.updatedAt).toLocaleString()}.</>
        )}
      </p>
    </div>
  );
}
