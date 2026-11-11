import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Registered parents for administrators.
 *
 * Rows come from public.admin_registered_parents() (migration
 * 202611040004): one per grown-up account, with the count of kid
 * logins that account manages and those kids' tasks — counts plus the
 * task titles with their done state, listed flat under the parent.
 * Kid accounts never appear as rows, and no kid name or username is
 * ever part of the payload. The function itself refuses every caller
 * who is not a server-assigned payment administrator (the same
 * is_payment_admin gate as the payment records console).
 */

export interface AdminParentTask {
  title: string;
  done: boolean;
}

export interface AdminParent {
  parentUserId: string;
  email: string;
  registeredAt: string;
  kidCount: number;
  taskCount: number;
  tasksDone: number;
  tasks: AdminParentTask[];
  reminderCount: number;
  lastReminderAt: string | null;
}

/** Shown when the admin_registered_parents function is not deployed yet. */
export const ADMIN_PARENTS_UNAVAILABLE_MESSAGE =
  "Registered parents list isn’t available yet — please try again later.";

/**
 * Raised when the admin_registered_parents function is missing (the
 * migration has not been run), so the dashboard can show a plain
 * "not available yet" note instead of a raw database error.
 */
export class AdminParentsUnavailableError extends Error {
  constructor() {
    super(ADMIN_PARENTS_UNAVAILABLE_MESSAGE);
    this.name = "AdminParentsUnavailableError";
  }
}

export function isAdminParentsUnavailable(error: unknown): boolean {
  if (error instanceof AdminParentsUnavailableError) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  // 42P01: undefined table, 42883: undefined function (direct Postgres);
  // PGRST202 / PGRST205: function / table missing from PostgREST's cache.
  if (
    value.code === "42P01" ||
    value.code === "42883" ||
    value.code === "PGRST202" ||
    value.code === "PGRST205"
  )
    return true;
  const message = typeof value.message === "string" ? value.message : "";
  return /could not find the (table|function)|does not exist/i.test(message);
}

function parentsFailure(action: string, error: unknown): Error {
  if (isAdminParentsUnavailable(error)) {
    return new AdminParentsUnavailableError();
  }
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`${action}: ${detail}`);
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const uuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const count = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 100000;

/**
 * Validates the RPC payload into typed rows. Only the allowlisted
 * fields are read — a row carrying anything else (a kid's name, a
 * username) never has it copied into the parsed result — and the
 * counts must agree with the titles list, like the payment ledger
 * parser fails loudly on a malformed response.
 */
export function parseAdminParents(value: unknown): AdminParent[] {
  if (!Array.isArray(value) || value.length > 5000)
    throw new Error("Invalid registered parents response.");
  return value.map((row: unknown): AdminParent => {
    if (
      !object(row) ||
      !uuid(row.parent_user_id) ||
      typeof row.email !== "string" ||
      row.email.length < 3 ||
      row.email.length > 254 ||
      !row.email.includes("@") ||
      typeof row.registered_at !== "string" ||
      !Number.isFinite(Date.parse(row.registered_at)) ||
      !count(row.kid_count) ||
      !count(row.task_count) ||
      !count(row.tasks_done) ||
      !count(row.reminder_count) ||
      !(
        row.last_reminder_at === null ||
        (typeof row.last_reminder_at === "string" &&
          Number.isFinite(Date.parse(row.last_reminder_at)))
      ) ||
      !Array.isArray(row.task_titles) ||
      row.task_titles.length > 10000
    )
      throw new Error(
        "The registered parents service returned an invalid entry.",
      );
    const tasks = row.task_titles.map((task: unknown): AdminParentTask => {
      if (
        !object(task) ||
        typeof task.title !== "string" ||
        !task.title ||
        task.title.length > 80 ||
        typeof task.done !== "boolean"
      )
        throw new Error(
          "The registered parents service returned an invalid task entry.",
        );
      return { title: task.title, done: task.done };
    });
    if (
      tasks.length !== row.task_count ||
      tasks.filter((task) => task.done).length !== row.tasks_done
    )
      throw new Error(
        "The registered parents service returned inconsistent counts.",
      );
    return {
      parentUserId: row.parent_user_id,
      email: row.email,
      registeredAt: row.registered_at,
      kidCount: Number(row.kid_count),
      taskCount: Number(row.task_count),
      tasksDone: Number(row.tasks_done),
      tasks,
      reminderCount: Number(row.reminder_count),
      lastReminderAt:
        typeof row.last_reminder_at === "string" ? row.last_reminder_at : null,
    };
  });
}

/**
 * Every registered grown-up account for a payment administrator.
 * Non-administrators are refused by the function itself (42501).
 */
export async function fetchAdminParents(
  client: SupabaseClient,
): Promise<AdminParent[]> {
  const { data, error } = await client.rpc("admin_registered_parents");
  if (error) throw parentsFailure("Could not load registered parents", error);
  return parseAdminParents(data);
}

export interface ParentReminderResult {
  sent: boolean;
  reason?: string;
}

/**
 * Asks the parent-reminder Edge Function to send one registered
 * grown-up the "add your kid's login" reminder. The function owns
 * every decision (administrator? grown-up target? mail configured?)
 * and records the send; this helper only carries the outcome back.
 * It never throws: a transport failure (function not deployed,
 * network down) comes back as { sent: false, reason: "send-failed" }
 * so the panel can report it like any other unsent outcome.
 */
export async function sendParentReminder(
  client: SupabaseClient,
  parentUserId: string,
): Promise<ParentReminderResult> {
  try {
    const { data, error } = await client.functions.invoke("parent-reminder", {
      body: { parentUserId },
    });
    if (error) return { sent: false, reason: "send-failed" };
    if (!object(data) || typeof data.sent !== "boolean")
      return { sent: false, reason: "send-failed" };
    return {
      sent: data.sent,
      reason: typeof data.reason === "string" ? data.reason : undefined,
    };
  } catch {
    return { sent: false, reason: "send-failed" };
  }
}
