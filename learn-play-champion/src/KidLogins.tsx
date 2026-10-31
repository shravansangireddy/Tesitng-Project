import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import {
  createKidAccount,
  deleteKidAccount,
  fetchMyKidAccounts,
  fetchOwnKidAccount,
  kidNameError,
  kidPasswordError,
  MAX_KID_ACCOUNTS,
  resetKidPassword,
  updateKidAccount,
  usernameError,
  type KidAccount,
} from "./kid-accounts";

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
    if (problem) {
      setError(problem);
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
      setError(failure(createFailure));
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
  kid,
  onChanged,
  onError,
  onNotice,
}: {
  client: SupabaseClient;
  kid: KidAccount;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}) {
  const [name, setName] = useState(kid.displayName);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

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
        Signs in with username <strong>{kid.username}</strong>
      </p>
      <div className="kid-logins-row-actions">
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
    </li>
  );
}
