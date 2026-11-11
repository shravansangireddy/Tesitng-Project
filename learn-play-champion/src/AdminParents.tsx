import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { paymentAdmin } from "./payments";
import {
  ADMIN_PARENTS_UNAVAILABLE_MESSAGE,
  fetchAdminParents,
  isAdminParentsUnavailable,
  sendParentReminder,
  type AdminParent,
} from "./admin-parents";

/** Local calendar date for a registration timestamp. */
function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : parsed.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

/**
 * Registered parents: the administrator's view of every grown-up
 * account — how many kid logins each manages and those kids' tasks
 * (counts plus the task titles with done state, flat under the
 * parent). Mirrors the payment records console: the panel renders a
 * shell for signed-in grown-ups, and the data loads only after the
 * is_payment_admin check passes; the admin_registered_parents
 * function enforces the same gate server-side. Kid accounts never
 * appear, and no kid name or username is shown anywhere.
 */
export default function AdminParents({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<AdminParent[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [reminderNotes, setReminderNotes] = useState<Record<string, { ok: boolean; text: string }>>({});
  const active = useRef(true), inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function load() {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setUnavailable(false);
    try {
      if (!await paymentAdmin(client)) throw new Error("Access denied. A trusted operator must assign your account payment administrator access.");
      const next = await fetchAdminParents(client);
      if (!active.current) return;
      setAllowed(true); setLoaded(true); setRows(next);
    } catch (failure) {
      if (active.current) {
        // Do not leave protected records visible after permission revocation or a failed refresh.
        setRows([]); setAllowed(false); setLoaded(false);
        if (isAdminParentsUnavailable(failure)) setUnavailable(true);
        else setError(failure instanceof Error ? failure.message : "Could not load registered parents.");
      }
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  async function remind(row: AdminParent) {
    if (sendingId) return;
    setSendingId(row.parentUserId);
    const result = await sendParentReminder(client, row.parentUserId);
    if (!active.current) return;
    setSendingId(null);
    if (result.sent) {
      setReminderNotes((notes) => ({
        ...notes,
        [row.parentUserId]: { ok: true, text: `Reminder sent to ${row.email}.` },
      }));
      // Refresh so the row's reminder status (count + last sent)
      // reflects the send the function just recorded.
      await load();
    } else if (result.reason === "not-configured") {
      setReminderNotes((notes) => ({
        ...notes,
        [row.parentUserId]: {
          ok: false,
          text: "Email isn't switched on yet, so no reminder was sent.",
        },
      }));
    } else {
      setReminderNotes((notes) => ({
        ...notes,
        [row.parentUserId]: {
          ok: false,
          text: "The reminder couldn't be sent — please try again later.",
        },
      }));
    }
  }
  return <section className="payment-admin admin-parents" aria-label="Registered parents admin panel">
    <h2>Registered parents</h2>
    <p>Server-assigned administrators only. Every registered grown-up account, with the number of
      kid logins it manages and those kids' tasks. Tasks are listed under the parent only —
      no kid names or usernames are shown.</p>
    <button className="button secondary" disabled={busy} onClick={() => void load()}>
      {busy ? "Loading parents…" : loaded ? "Refresh registered parents" : "Open registered parents"}
    </button>
    {error && <p role="alert">{error}</p>}
    {unavailable && <p role="status">{ADMIN_PARENTS_UNAVAILABLE_MESSAGE}</p>}
    {allowed && <>
      <p><strong>Registered parents: {rows.length}</strong></p>
      {rows.length ? <ul className="admin-parents-list">
        {rows.map(row => <li className="admin-parents-row" key={row.parentUserId}>
          <strong>{row.email}</strong>
          <p className="admin-parents-meta">Registered {formatDate(row.registeredAt)} · {row.kidCount} {row.kidCount === 1 ? "kid" : "kids"} · {row.taskCount} {row.taskCount === 1 ? "task" : "tasks"} ({row.tasksDone} done)</p>
          {row.tasks.length ? <ul className="admin-parents-tasks">
            {row.tasks.map((task, index) => <li key={`${row.parentUserId}-${index}`}>
              {task.done ? "✓" : "⏳"} {task.title}
            </li>)}
          </ul> : null}
          <p className="admin-parents-reminder">
            {row.reminderCount > 0 && row.lastReminderAt
              ? `Reminder sent ${formatDate(row.lastReminderAt)}${row.reminderCount > 1 ? ` · ×${row.reminderCount}` : ""}`
              : "No reminder sent yet"}
          </p>
          <button
            className="button secondary"
            disabled={sendingId !== null}
            onClick={() => void remind(row)}
          >
            {sendingId === row.parentUserId ? "Sending…" : "📧 Remind to add kids"}
          </button>
          {reminderNotes[row.parentUserId] && (
            <p role={reminderNotes[row.parentUserId].ok ? "status" : "alert"}>
              {reminderNotes[row.parentUserId].text}
            </p>
          )}
        </li>)}
      </ul> : <p role="status">No parents registered yet.</p>}
    </>}
    <p>No kid names, usernames, or learning details are shown. A kid login managed by two
      grown-ups counts under both of them.</p>
  </section>;
}
