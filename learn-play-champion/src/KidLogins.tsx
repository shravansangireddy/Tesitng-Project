import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import {
  createKidAccount,
  deleteKidAccount,
  fetchKidProgress,
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  kidNameError,
  kidPasswordError,
  MAX_KID_ACCOUNTS,
  resetKidPassword,
  setKidAccountActive,
  summarizeProgress,
  updateKidAccount,
  usernameError,
  type KidAccount,
  type KidProgress,
} from "./kid-accounts";
import { activities, type ActivityId } from "./game";
import {
  createKidTask,
  deleteKidTask,
  fetchKidTasks,
  taskTitleError,
  type KidTask,
} from "./kid-tasks";

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

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creating) return;
    const problem =
      usernameError(username) ||
      kidNameError(name) ||
      (!grade ? "Choose a grade." : "") ||
      kidPasswordError(password);
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
        Give each child their own username and password so they can sign in
        on any device and keep their own progress. No email address is
        needed, and usernames are never shown publicly. You create and
        control these logins: reset a password or delete a login here at
        any time.
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
            Password (at least 8 characters)
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Something your child can remember"
              maxLength={72}
              autoComplete="new-password"
              disabled={creating}
            />
          </label>
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
    const problem = kidPasswordError(newPassword);
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
      onNotice(`Password reset for ${kid.displayName}.`);
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
    <li className="kid-logins-row">
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
          Reset password
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
            New password for {kid.displayName}
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              maxLength={72}
              autoComplete="new-password"
              disabled={busy}
            />
          </label>
          <button className="button primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
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
    } catch (addFailure) {
      setTaskError(failure(addFailure));
    } finally {
      setAdding(false);
    }
  };

  const removeTask = async (task: KidTask) => {
    try {
      await deleteKidTask(client, task.id);
      setTasks((current) =>
        (current ?? []).filter((item) => item.id !== task.id),
      );
    } catch (removeFailure) {
      setTaskError(failure(removeFailure));
    }
  };

  return (
    <div className="kid-tasks-manager">
      <h3>Tasks for {kid.displayName}</h3>
      <p className="kid-tasks-manager-note">
        Tasks appear on {kid.displayName}'s home screen after they sign in. A
        task with an activity opens that adventure directly.
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
