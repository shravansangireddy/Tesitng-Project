import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, type GradeId } from "./content-schema";
import { activities, badges, cleanProfileName, type Progress } from "./game";
import { parseCloudRecord } from "./cloud";

// Parent-created kid logins. A kid signs in with a username + password;
// the username maps to a synthetic email on a domain we control, so the
// kid needs no email address. Creating, resetting, and deleting logins
// goes through the kid-accounts Edge Function (it verifies the caller is
// the parent); listing and renaming happen directly against
// public.kid_accounts under its row-level security policies.

export interface KidAccount {
  kidUserId: string;
  parentId: string;
  username: string;
  displayName: string;
  grade: GradeId;
  createdAt?: string;
}

export const KID_EMAIL_DOMAIN = "kids.learnplaychampion.com";
export const MAX_KID_ACCOUNTS = 6;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function kidEmail(username: string): string {
  return `${normalizeUsername(username)}@${KID_EMAIL_DOMAIN}`;
}

export function usernameError(raw: string): string {
  const username = normalizeUsername(raw);
  if (!username) return "Choose a username.";
  if (!USERNAME_PATTERN.test(username))
    return "Usernames use 3–20 lowercase letters, numbers, or underscores — no spaces.";
  return "";
}

export function kidPasswordError(password: string): string {
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password.length > 72) return "That password is too long.";
  return "";
}

export function kidNameError(name: string): string {
  return cleanProfileName(name)
    ? ""
    : "Add your child's first name or nickname.";
}

interface KidRow {
  kid_user_id?: unknown;
  parent_id?: unknown;
  username?: unknown;
  display_name?: unknown;
  grade?: unknown;
  created_at?: unknown;
}

export function parseKidAccount(row: unknown): KidAccount | null {
  if (!row || typeof row !== "object") return null;
  const value = row as KidRow;
  const grade = gradeIds.find((id) => id === value.grade);
  if (
    typeof value.kid_user_id !== "string" ||
    !value.kid_user_id ||
    typeof value.parent_id !== "string" ||
    !value.parent_id ||
    typeof value.username !== "string" ||
    !USERNAME_PATTERN.test(value.username) ||
    typeof value.display_name !== "string" ||
    !value.display_name ||
    !grade
  )
    return null;
  return {
    kidUserId: value.kid_user_id,
    parentId: value.parent_id,
    username: value.username,
    displayName: value.display_name,
    grade,
    ...(typeof value.created_at === "string"
      ? { createdAt: value.created_at }
      : {}),
  };
}

const KID_COLUMNS =
  "kid_user_id, parent_id, username, display_name, grade, created_at";

/** The signed-in user's own kid-account row, when they ARE a kid login. */
export async function fetchOwnKidAccount(
  client: SupabaseClient,
  userId: string,
): Promise<KidAccount | null> {
  const { data, error } = await client
    .from("kid_accounts")
    .select(KID_COLUMNS)
    .eq("kid_user_id", userId)
    .maybeSingle();
  if (error) return null;
  return parseKidAccount(data);
}

/** Kid logins a grown-up manages, oldest first. */
export async function fetchMyKidAccounts(
  client: SupabaseClient,
  parentId: string,
): Promise<KidAccount[]> {
  const { data, error } = await client
    .from("kid_accounts")
    .select(KID_COLUMNS)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("Could not load kid logins. Please try again.");
  return (data ?? [])
    .map((row) => parseKidAccount(row))
    .filter((kid): kid is KidAccount => kid !== null);
}

/** Rename or re-grade a kid login (row-level security checks ownership). */
export async function updateKidAccount(
  client: SupabaseClient,
  kidUserId: string,
  changes: { displayName?: string; grade?: GradeId },
): Promise<void> {
  const patch: { display_name?: string; grade?: GradeId } = {};
  if (changes.displayName !== undefined) {
    const name = cleanProfileName(changes.displayName);
    if (!name) throw new Error("Add your child's first name or nickname.");
    patch.display_name = name;
  }
  if (changes.grade !== undefined) patch.grade = changes.grade;
  if (Object.keys(patch).length === 0) return;
  const { error } = await client
    .from("kid_accounts")
    .update(patch)
    .eq("kid_user_id", kidUserId);
  if (error) throw new Error("Could not save that change. Please try again.");
}

async function invokeKidAccounts(
  client: SupabaseClient,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await client.functions.invoke("kid-accounts", {
    body,
  });
  if (error) {
    let detail = "";
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const parsed = (await context.clone().json()) as { error?: unknown };
        if (typeof parsed.error === "string") detail = parsed.error;
      } catch {
        detail = "";
      }
    }
    throw new Error(
      detail || "Kid logins are unavailable right now. Please try again.",
    );
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (typeof payload.error === "string" && payload.error)
    throw new Error(payload.error);
  return payload;
}

export async function createKidAccount(
  client: SupabaseClient,
  input: {
    username: string;
    password: string;
    displayName: string;
    grade: GradeId;
  },
): Promise<KidAccount> {
  const payload = await invokeKidAccounts(client, {
    action: "create",
    username: normalizeUsername(input.username),
    password: input.password,
    displayName: cleanProfileName(input.displayName),
    grade: input.grade,
  });
  const kid = parseKidAccount(
    payload.kid && typeof payload.kid === "object"
      ? {
          kid_user_id: (payload.kid as Record<string, unknown>).kidUserId,
          parent_id: (payload.kid as Record<string, unknown>).parentId,
          username: (payload.kid as Record<string, unknown>).username,
          display_name: (payload.kid as Record<string, unknown>).displayName,
          grade: (payload.kid as Record<string, unknown>).grade,
        }
      : null,
  );
  if (!kid) throw new Error("The kid login was created but could not be read back.");
  return kid;
}

export async function resetKidPassword(
  client: SupabaseClient,
  kidUserId: string,
  password: string,
): Promise<void> {
  await invokeKidAccounts(client, {
    action: "reset_password",
    kidUserId,
    password,
  });
}

export async function deleteKidAccount(
  client: SupabaseClient,
  kidUserId: string,
): Promise<void> {
  await invokeKidAccounts(client, { action: "delete", kidUserId });
}

export interface KidProgress {
  progress: Progress;
  updatedAt: string | null;
}

/**
 * The progress saved under a kid login, readable by the parent who owns
 * the login (row-level security on learner_progress enforces that).
 * Returns null when the kid has not signed in and saved progress yet, or
 * when the row cannot be read or parsed.
 */
export async function fetchKidProgress(
  client: SupabaseClient,
  kidUserId: string,
): Promise<KidProgress | null> {
  const { data, error } = await client
    .from("learner_progress")
    .select("data, revision, updated_at")
    .eq("user_id", kidUserId)
    .maybeSingle();
  if (error || !data) return null;
  try {
    const record = parseCloudRecord(data);
    const updatedAt = (data as { updated_at?: unknown }).updated_at;
    return {
      progress: record.progress,
      updatedAt: typeof updatedAt === "string" ? updatedAt : null,
    };
  } catch {
    return null;
  }
}

export interface KidProgressSummary {
  points: number;
  rounds: number;
  accuracy: number | null;
  streak: number;
  chests: number;
  codingDone: number;
  aiDone: number;
  grade: GradeId | null;
  lastPlayedDate: string;
  badgesEarned: { symbol: string; name: string }[];
  badgesTotal: number;
  bestScores: { title: string; best: number }[];
}

/** Flatten a kid's saved progress into the numbers a grown-up wants to see. */
export function summarizeProgress(progress: Progress): KidProgressSummary {
  const titleById = new Map(activities.map((activity) => [activity.id, activity.title]));
  const bestScores = Object.entries(progress.bestRounds)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([id, best]) => ({ title: titleById.get(id as never) ?? id, best }))
    .sort((a, b) => b.best - a.best || a.title.localeCompare(b.title));
  return {
    points: progress.points,
    rounds: progress.rounds,
    accuracy:
      progress.answered > 0
        ? Math.round((progress.correct / progress.answered) * 100)
        : null,
    streak: progress.streak,
    chests: progress.chestCount,
    codingDone: progress.codingCompleted?.length ?? 0,
    aiDone: progress.aiCompleted?.length ?? 0,
    grade: progress.selectedGrade ?? null,
    lastPlayedDate: progress.lastPlayedDate,
    badgesEarned: badges
      .filter((badge) => badge.earned(progress))
      .map((badge) => ({ symbol: badge.symbol, name: badge.name })),
    badgesTotal: badges.length,
    bestScores,
  };
}
