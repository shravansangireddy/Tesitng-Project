import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  ArrowRight,
  BookOpen,
  Check,
  Cloud,
  GraduationCap,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import App from "./App";
import { supabase } from "./supabase";
import {
  fetchOwnKidAccount,
  kidEmail,
  type KidAccount,
} from "./kid-accounts";
import {
  loadCloudProgress,
  ProgressConflict,
  saveCloudProgress,
  type CloudRecord,
} from "./cloud";
import type { Progress } from "./game";
import { gradeIds, gradeLabels, type GradeId } from "./content-schema";
import PrivacyNotice from "./PrivacyNotice";
import { donationReturn } from "./payments";

function message(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function AccountPage({ children }: { children: ReactNode }) {
  return (
    <main className="account-page">
      <div className="account-brand">
        <span className="brand-icon">
          <GraduationCap size={30} />
        </span>
        <span>
          Learn & Play<small>CHAMPION</small>
        </span>
      </div>
      <div className="account-layout">
        <section className="account-welcome">
          <span className="eyebrow">
            <Sparkles size={16} /> LITTLE STEPS. BIG DISCOVERIES.
          </span>
          <h1>
            A world of wonder.
            <br />
            <span>A place to grow.</span>
          </h1>
          <p>
            English adventures, math discoveries, and a little more confidence
            every day.
          </p>
          <div className="account-mascots" aria-hidden="true">
            <span>🦉</span>
            <span>🌟</span>
            <span>🦊</span>
          </div>
          <div className="account-benefit">
            <BookOpen size={23} />
            <div>
              <strong>Learning that feels like play</strong>
              <p>Grade-level adventures. Free hints. A cheer for every try.</p>
            </div>
          </div>
          <div className="account-benefit">
            <Cloud size={23} />
            <div>
              <strong>Pick up where you left off</strong>
              <p>Sign in on another device to load your saved discoveries.</p>
            </div>
          </div>
          <div className="account-benefit">
            <ShieldCheck size={23} />
            <div>
              <strong>Grown-up accounts. Kid-friendly adventures.</strong>
              <p>Parent-made kid logins. No public profiles, ads, or open chat.</p>
            </div>
          </div>
        </section>
        <section className="account-card panel">{children}</section>
      </div>
      <p className="account-footnote">
        <LockKeyhole size={13} /> A little practice. A lot of possibility.
      </p>
    </main>
  );
}

function SyncDialog({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog account-sync-dialog"
      aria-labelledby="sync-error-title"
      onCancel={(event) => event.preventDefault()}
    >
      {children}
    </dialog>
  );
}

export default function Account() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(!!supabase);
  const [guest, setGuest] = useState(false);
  const [authError, setAuthError] = useState("");
  const [email, setEmail] = useState("");
  const [adult, setAdult] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [kidMode, setKidMode] = useState(false);
  const [kidUsername, setKidUsername] = useState("");
  const [kidPassword, setKidPassword] = useState("");
  const [kidSigningIn, setKidSigningIn] = useState(false);
  const [grownUpMethod, setGrownUpMethod] = useState<"link" | "password">("link");
  const [pwEmail, setPwEmail] = useState("");
  const [pwPassword, setPwPassword] = useState("");
  const [pwSigningIn, setPwSigningIn] = useState(false);
  const [loginGrade, setLoginGrade] = useState<GradeId | "">("");
  const [requestedGrade, setRequestedGrade] = useState<GradeId | undefined>(() => {
    const raw = new URLSearchParams(location.search).get("learning_grade");
    const grade = gradeIds.find((id) => id === raw);
    if (raw !== null && !grade) console.error("Ignoring unsupported sign-in learning grade:", raw);
    return grade;
  });
  const clearGradeRequest = useCallback(() => {
    setRequestedGrade(undefined);
    const url = new URL(location.href);
    url.searchParams.delete("learning_grade");
    history.replaceState(history.state, "", url);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const client = supabase;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, next) => {
      if (!active) return;
      setSession(next);
      setChecking(false);
      if (next) {
        setGuest(false);
        setAuthError("");
      }
    });
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError(`Could not restore sign-in: ${error.message}`);
        setSession(data.session);
        setChecking(false);
      })
      .catch((error) => {
        if (active) {
          setAuthError(message(error));
          setChecking(false);
        }
      });
    const callbackError =
      new URLSearchParams(location.hash.slice(1)).get("error_description") ||
      new URLSearchParams(location.search).get("error_description");
    if (callbackError)
      setAuthError(
        `Sign-in link failed: ${callbackError}. Request a new email link.`,
      );
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error(`Could not sign out: ${error.message}`);
    setSession(null);
    setSent(false);
    setEmail("");
    setAdult(false);
    setKidMode(false);
    setKidUsername("");
    setKidPassword("");
    setGrownUpMethod("link");
    setPwEmail("");
    setPwPassword("");
    setLoginGrade("");
    setRequestedGrade(undefined);
  };
  if (checking)
    return (
      <AccountPage>
        <span className="account-icon">
          <LockKeyhole size={25} />
        </span>
        <h2>Checking your sign-in…</h2>
        <p className="dialog-description" role="status">
          Getting your learning space ready.
        </p>
      </AccountPage>
    );
  if (session && supabase)
    return (
      <CloudWorkspace
        key={session.user.id}
        client={supabase}
        userId={session.user.id}
        signOut={signOut}
        requestedGrade={requestedGrade}
        onGradeApplied={clearGradeRequest}
      />
    );
  if (guest)
    return (
      <App
        initialGrade={loginGrade || undefined}
        accountControls={
          <button className="account-button" onClick={() => setGuest(false)}>
            <LogIn size={16} />
            <span>Sign in</span>
          </button>
        }
      />
    );
  const kidSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || kidSigningIn) return;
    setKidSigningIn(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: kidEmail(kidUsername),
        password: kidPassword,
      });
      if (error) throw error;
      setKidPassword("");
    } catch {
      setAuthError(
        "That username and password didn't match. Check the spelling — or ask your grown-up to reset it for you.",
      );
    } finally {
      setKidSigningIn(false);
    }
  };
  const grownUpPasswordSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || pwSigningIn) return;
    setPwSigningIn(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: pwEmail.trim(),
        password: pwPassword,
      });
      if (error) throw error;
      setPwPassword("");
    } catch {
      setAuthError(
        "That email and password didn't match. If you haven't set a password yet, sign in with the email link once, then set one in Privacy & data.",
      );
    } finally {
      setPwSigningIn(false);
    }
  };
  const sendLink = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || sending || !adult) return;
    setSending(true);
    setAuthError("");
    setSent(false);
    try {
      const redirect = new URL(`${location.origin}${location.pathname}`);
      if (loginGrade) redirect.searchParams.set("learning_grade", loginGrade);
      const donation = donationReturn();
      if (donation) redirect.searchParams.set("donation_return", donation);
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect.href },
      });
      if (error) throw error;
      setRequestedGrade(loginGrade || undefined);
      setSent(true);
    } catch (error) {
      setAuthError(`Could not send your sign-in link: ${message(error)}`);
    } finally {
      setSending(false);
    }
  };
  return (
    <AccountPage>
      <span className="account-icon">
        <LogIn size={27} />
      </span>
      <span className="eyebrow">{kidMode ? "KID SIGN-IN" : "FOR PARENTS & TEACHERS"}</span>
      <h2>Welcome to the island.</h2>
      <p className="dialog-description">
        {kidMode
          ? "Sign in with your own username and password to load your progress."
          : "Sign in or create your grown-up account with a secure email link. No password to remember."}
      </p>
      <div className="account-mode-toggle" role="group" aria-label="Choose how to sign in">
        <button
          type="button"
          className={!kidMode ? "active" : ""}
          aria-pressed={!kidMode}
          onClick={() => { setKidMode(false); setAuthError(""); }}
        >
          Grown-up
        </button>
        <button
          type="button"
          className={kidMode ? "active" : ""}
          aria-pressed={kidMode}
          onClick={() => { setKidMode(true); setAuthError(""); }}
        >
          Kid login
        </button>
      </div>
      {kidMode ? (
      <form className="account-form" onSubmit={kidSignIn}>
        <label htmlFor="kid-username">Your username</label>
        <div className="email-field">
          <Sparkles size={18} />
          <input
            id="kid-username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            placeholder="e.g., ava_2017"
            value={kidUsername}
            onChange={(event) => setKidUsername(event.target.value)}
            required
            disabled={kidSigningIn}
            maxLength={20}
          />
        </div>
        <label htmlFor="kid-password">Your password</label>
        <div className="email-field">
          <LockKeyhole size={18} />
          <input
            id="kid-password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={kidPassword}
            onChange={(event) => setKidPassword(event.target.value)}
            required
            disabled={kidSigningIn}
            maxLength={72}
          />
        </div>
        <p className="kid-signin-note">
          Use the username and password your grown-up made for you. Forgot it?
          Ask your grown-up — they can reset it for you.
        </p>
        <button
          className="button primary full-width"
          type="submit"
          disabled={!supabase || kidSigningIn || !kidUsername.trim() || !kidPassword}
        >
          {kidSigningIn ? "Signing you in…" : "Sign in and play"}
          <ArrowRight size={18} />
        </button>
      </form>
      ) : (
      <>
      <PrivacyNotice />
      <p><a href="/learn/">Explore our learning guides for parents and teachers</a></p>
      <div className="account-mode-toggle account-method-toggle" role="group" aria-label="Choose how to sign in as a grown-up">
        <button
          type="button"
          className={grownUpMethod === "link" ? "active" : ""}
          aria-pressed={grownUpMethod === "link"}
          onClick={() => { setGrownUpMethod("link"); setAuthError(""); }}
        >
          Email link
        </button>
        <button
          type="button"
          className={grownUpMethod === "password" ? "active" : ""}
          aria-pressed={grownUpMethod === "password"}
          onClick={() => { setGrownUpMethod("password"); setAuthError(""); }}
        >
          Password
        </button>
      </div>
      {grownUpMethod === "password" ? (
      <form className="account-form" onSubmit={grownUpPasswordSignIn}>
        <label htmlFor="gp-email">Parent or teacher email</label>
        <div className="email-field">
          <Mail size={18} />
          <input
            id="gp-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={pwEmail}
            onChange={(event) => setPwEmail(event.target.value)}
            required
            disabled={pwSigningIn}
            maxLength={254}
          />
        </div>
        <label htmlFor="gp-password">Your password</label>
        <div className="email-field">
          <LockKeyhole size={18} />
          <input
            id="gp-password"
            type="password"
            autoComplete="current-password"
            placeholder="The password you set"
            value={pwPassword}
            onChange={(event) => setPwPassword(event.target.value)}
            required
            disabled={pwSigningIn}
            maxLength={72}
          />
        </div>
        <p className="kid-signin-note">
          Use the password you set in Privacy &amp; data. New here, or never
          set one? Use the email link first — you can add a password after
          you sign in.
        </p>
        <button
          className="button primary full-width"
          type="submit"
          disabled={!supabase || pwSigningIn || !pwEmail.trim() || !pwPassword}
        >
          {pwSigningIn ? "Signing you in…" : "Sign in with password"}
          <ArrowRight size={18} />
        </button>
      </form>
      ) : (
      <form className="account-form" onSubmit={sendLink}>
        <label htmlFor="adult-email">Parent or teacher email</label>
        <div className="email-field">
          <Mail size={18} />
          <input
            id="adult-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSent(false);
            }}
            required
            disabled={sending}
            maxLength={254}
          />
        </div>
        <label htmlFor="login-grade">Learner's grade</label>
        <select id="login-grade" value={loginGrade} disabled={sending}
          onChange={(event) => {
            const grade = gradeIds.find((id) => id === event.target.value);
            setLoginGrade(grade ?? "");
            setSent(false);
          }}>
          <option value="">Use saved grade (Grade 1 for a new learner)</option>
          {gradeIds.map((id) => <option key={id} value={id}>{gradeLabels[id]}</option>)}
        </select>
        <small className="login-grade-note">
          A chosen grade is used after sign-in and saved with this account's progress.
          Leave “Use saved grade” selected to continue at the last saved level.
          Guest play uses its own separate saved grade.
        </small>
        <label className="adult-check">
          <input
            type="checkbox"
            checked={adult}
            onChange={(event) => setAdult(event.target.checked)}
            required
            disabled={sending}
          />
          <span>
            I am a parent, guardian, or teacher using my own email. Do not enter
            a child’s email address.
          </span>
        </label>
        <button
          className="button primary full-width"
          type="submit"
          disabled={!supabase || sending || !adult || !email.trim()}
        >
          {sending ? "Sending your link…" : "Email me a sign-in link"}
          <ArrowRight size={18} />
        </button>
      </form>
      )}
      </>
      )}
      {authError && (
        <p className="account-error" role="alert">
          {authError}
        </p>
      )}
      {sent && (
        <div className="account-success" role="status">
          <Check size={20} />
          <p>
            Check your grown-up inbox. Open the latest sign-in link in{" "}
            <strong>this same browser</strong> to continue. If an account
            already exists, you’ll sign in; otherwise Supabase creates one. No
            email? Check spam before requesting another link.
          </p>
        </div>
      )}
      <div className="account-divider">
        <span>or explore first</span>
      </div>
      <button
        className="button secondary full-width"
        disabled={sending}
        onClick={() => setGuest(true)}
      >
        Play as a guest
        <ArrowRight size={17} />
      </button>
      <p className="account-privacy">
        Guest progress stays on this device and is separate from account
        progress. A grown-up account can hold profiles for several children
        on this device, and a kid with their own login keeps separate
        progress that follows them on any device. Signing in does not upload
        existing guest progress.
      </p>
    </AccountPage>
  );
}

function CloudWorkspace({
  client,
  userId,
  signOut,
  requestedGrade,
  onGradeApplied,
}: {
  client: SupabaseClient;
  userId: string;
  signOut: () => Promise<void>;
  requestedGrade?: GradeId;
  onGradeApplied: () => void;
}) {
  const [record, setRecord] = useState<CloudRecord | null>(null);
  const [kidAccount, setKidAccount] = useState<KidAccount | null>(null);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [desired, setDesired] = useState<Progress | null>(null);
  const [saved, setSaved] = useState<Progress | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [erased, setErased] = useState(false);
  const [erasing, setErasing] = useState(false);
  const revision = useRef(0);
  const saveInFlight = useRef(false);
  const active = useRef(true);
  const gradeRequest = useRef(requestedGrade);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setRecord(null);
    setLoadError("");
    Promise.all([
      loadCloudProgress(client, userId),
      fetchOwnKidAccount(client, userId).catch(() => null),
    ])
      .then(([next, kid]) => {
        if (cancelled) return;
        setKidAccount(kid);
        const requested = gradeRequest.current;
        // A kid login starts at the grade its grown-up set; an explicit
        // grade from a sign-in link wins when both are present.
        const selected = requested ?? kid?.grade;
        const progress = selected && selected !== next.progress.selectedGrade
          ? { ...next.progress, selectedGrade: selected } : next.progress;
        revision.current = next.revision;
        setRecord({ ...next, progress });
        setDesired(progress);
        setSaved(next.progress);
        setSaveError(null);
        if (requested) {
          gradeRequest.current = undefined;
          onGradeApplied();
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(message(error));
      });
    return () => {
      cancelled = true;
    };
  }, [client, userId, reload, onGradeApplied]);
  const updateProgress = useCallback(
    (progress: Progress) => setDesired(progress),
    [],
  );
  const pending = desired !== saved;
  useEffect(() => {
    if (
      !desired ||
      desired === saved ||
      saveError ||
      saving ||
      saveInFlight.current
    )
      return;
    const snapshot = desired;
    saveInFlight.current = true;
    setSaving(true);
    saveCloudProgress(client, userId, snapshot, revision.current)
      .then((nextRevision) => {
        if (!active.current) return;
        revision.current = nextRevision;
        setSaved(snapshot);
      })
      .catch((error) => {
        if (active.current)
          setSaveError(
            error instanceof Error ? error : new Error(message(error)),
          );
      })
      .finally(() => {
        saveInFlight.current = false;
        if (active.current) setSaving(false);
      });
  }, [client, userId, desired, saved, saveError, saving]);
  useEffect(() => {
    if (!pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [pending]);
  // Two-step sign-out: the first tap arms the button, the second tap signs
  // out. (A native window.confirm gate silently blocked sign-out in some
  // browsers, leaving families stuck signed in.)
  useEffect(() => {
    if (!confirmingSignOut) return;
    const timer = setTimeout(() => setConfirmingSignOut(false), 5000);
    return () => clearTimeout(timer);
  }, [confirmingSignOut]);
  const logout = async () => {
    if (pending || saving || signingOut) return;
    if (!confirmingSignOut) {
      setConfirmingSignOut(true);
      return;
    }
    setConfirmingSignOut(false);
    setSigningOut(true);
    setSignOutError("");
    try {
      await signOut();
    } catch (error) {
      setSignOutError(message(error));
      setSigningOut(false);
    }
  };
  if (erased) return <AccountPage>
    <h2>Cloud learning data erased.</h2>
    <p>The adult login identity remains. Contact the operator for full account deletion, provider logs, and backup timelines.
      Learning is paused here until sign-out finishes.</p>
    {signOutError && <p role="alert" className="account-error">{signOutError}</p>}
    <button className="button primary full-width" disabled={signingOut} onClick={logout}>{confirmingSignOut ? "Tap again to Sign out" : "Sign out"}</button>
  </AccountPage>;
  if (!record)
    return (
      <AccountPage>
        <span className="account-icon">
          <Cloud size={27} />
        </span>
        <h2>
          {loadError ? "We couldn’t open your island." : "Opening your island…"}
        </h2>
        <p className="dialog-description" role={loadError ? "alert" : "status"}>
          {loadError ||
            "Loading your private account progress. Your guest save is kept separate."}
        </p>
        {loadError && (
          <button
            className="button primary full-width"
            onClick={() => setReload((value) => value + 1)}
          >
            Try loading again
          </button>
        )}
        <button
          className="button secondary full-width"
          disabled={signingOut}
          onClick={logout}
        >
          Sign out
        </button>
        {signOutError && (
          <p role="alert" className="account-error">
            {signOutError}
          </p>
        )}
      </AccountPage>
    );
  return (
    <>
      <App
        key={reload}
        cloudProgress={record.progress}
        roomClient={client}
        cloudSaving={pending || saving || !!saveError}
        singleLearner={!!kidAccount}
        onProgressChange={updateProgress}
        onEraseCloud={async () => {
          if (pending || saving || saveInFlight.current) throw new Error("Wait for pending saves before erasing learning data.");
          setErasing(true);
          try {
            const { data, error } = await client.rpc("erase_my_learning_data");
            if (error || data !== true)
              throw new Error(`Could not erase cloud learning data: ${error?.message ?? "Unexpected response"}. Deploy the erasure migration or contact the operator.`);
            // Unmount the old learning state even if sign-out fails; it must not be re-saved.
            setErased(true);
            setRecord(null); setDesired(null); setSaved(null);
            try { await signOut(); }
            catch (failure) {
              setSignOutError(`Learning data was erased, but sign-out failed: ${message(failure)}. Sign out before allowing further play.`);
              throw failure;
            }
          } finally { setErasing(false); }
        }}
        accountControls={
          kidAccount ? (
            <div className="account-controls">
              <span className="cloud-status" role="status">
                <Cloud size={14} />
                {pending || saving ? "Saving…" : "Cloud saved"}
              </span>
              <span className="kid-chip">
                ⭐ {kidAccount.displayName} · {gradeLabels[kidAccount.grade]}
              </span>
              <button
                className="account-button"
                disabled={pending || saving || signingOut}
                onClick={logout}
                aria-label="Sign out"
                title="Unfinished rounds are not saved"
              >
                <LogOut size={16} />
                <span>{signingOut ? "Signing out…" : confirmingSignOut ? "Tap again to Sign out" : "Sign out"}</span>
              </button>
            </div>
          ) : (
            <div className="account-controls">
              <span className="cloud-status" role="status">
                <Cloud size={14} />
                {pending || saving ? "Saving…" : "Cloud saved"}
              </span>
              <button
                className="account-button"
                disabled={pending || saving || signingOut}
                onClick={logout}
                aria-label="Sign out of grown-up account"
                title="Unfinished rounds are not saved"
              >
                <LogOut size={16} />
                <span>{signingOut ? "Signing out…" : confirmingSignOut ? "Tap again to Sign out" : "Sign out"}</span>
              </button>
            </div>
          )
        }
      />
      {signOutError && (
        <div className="sync-error-notice" role="alert">
          {signOutError}
          <button onClick={() => setSignOutError("")}>Dismiss</button>
        </div>
      )}
      {erasing && <SyncDialog>
        <h2 id="sync-error-title">Erasing cloud learning data…</h2>
        <p role="status">Keep this page open. Learning is paused while erasure finishes.</p>
      </SyncDialog>}
      {saveError && (
        <SyncDialog>
          <h2 id="sync-error-title">
            {saveError instanceof ProgressConflict
              ? "Another island update arrived."
              : "Let’s keep your progress safe."}
          </h2>
          <p className="dialog-description">{saveError.message}</p>
          {!(saveError instanceof ProgressConflict) && (
            <button
              autoFocus
              className="button primary full-width"
              onClick={() => setSaveError(null)}
            >
              Retry saving
            </button>
          )}
          <button
            autoFocus={saveError instanceof ProgressConflict}
            className="button secondary full-width"
            onClick={() => {
              if (
                window.confirm(
                  "Discard this page’s unsynced changes and load the latest progress saved to your account?",
                )
              ) {
                setDesired(null);
                setSaved(null);
                setSaveError(null);
                setReload((value) => value + 1);
              }
            }}
          >
            Load latest cloud progress
          </button>
          <p className="account-privacy">
            Keep this page open until saved. Never overwrite another device’s
            newer progress.
          </p>
        </SyncDialog>
      )}
    </>
  );
}
