import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchOwnKidAccount, kidPasswordError } from "./kid-accounts";

/**
 * Lets a signed-in grown-up set a password on their account so future
 * sign-ins can use email + password instead of a fresh email link.
 * Renders nothing for guest sessions and for kid-login sessions.
 */
export default function ParentPassword({ client }: { client: SupabaseClient }) {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await client.auth.getUser();
        const userId = data.user?.id ?? "";
        if (!userId) return;
        const own = await fetchOwnKidAccount(client, userId);
        if (active && !own) setReady(true);
      } catch {
        // Stay hidden if we cannot tell who is signed in.
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  if (!ready) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const problem =
      kidPasswordError(password) ||
      (password !== confirm ? "The two passwords do not match." : "");
    setNotice("");
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword("");
      setConfirm("");
      setNotice(
        "Password set. Next time, choose Password on the sign-in screen and use your email + this password — no email link needed.",
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not set the password. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="kid-logins" aria-label="Password sign-in">
      <h2>Password sign-in</h2>
      <p>
        Set a password on your grown-up account so you don't need a fresh
        email link every visit. You'll sign in with your email + password
        instead. The email link keeps working as a backup.
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
      <form className="kid-logins-form" onSubmit={submit}>
        <label>
          New password (at least 8 characters)
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            maxLength={72}
            disabled={busy}
          />
        </label>
        <label>
          Type it again
          <input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            maxLength={72}
            disabled={busy}
          />
        </label>
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Setting…" : "Set my password"}
        </button>
      </form>
    </section>
  );
}
