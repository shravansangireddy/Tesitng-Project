import type { SupabaseClient } from "@supabase/supabase-js";
import { activities, type ActivityId } from "./game";

/**
 * Kid tasks — the job list a grown-up assigns to one kid login.
 *
 * Rows live in public.kid_tasks (migration 202610310003). RLS does the real
 * enforcement: a parent manages only their own kids' tasks, a kid reads and
 * updates only their own. The helpers here validate shapes and titles before
 * anything reaches the database.
 */

export interface KidTask {
  id: string;
  kidUserId: string;
  parentId: string;
  title: string;
  activityId: ActivityId | null;
  done: boolean;
  createdAt: string;
  completedAt: string | null;
}

export const MAX_TASK_TITLE = 80;

export function taskTitleError(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "Give the task a name, like “Play Math Mountain”.";
  if (trimmed.length > MAX_TASK_TITLE)
    return `Keep the task name to ${MAX_TASK_TITLE} characters or fewer.`;
  return "";
}

export function isActivityId(value: unknown): value is ActivityId {
  return (
    typeof value === "string" &&
    activities.some((activity) => activity.id === value)
  );
}

export function activityTitle(activityId: ActivityId | null): string {
  if (!activityId) return "";
  return activities.find((activity) => activity.id === activityId)?.title ?? "";
}

export function parseKidTask(row: unknown): KidTask | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  if (
    typeof value.id !== "string" ||
    typeof value.kid_user_id !== "string" ||
    typeof value.parent_id !== "string" ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.done !== "boolean" ||
    typeof value.created_at !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    kidUserId: value.kid_user_id,
    parentId: value.parent_id,
    title: value.title,
    activityId: isActivityId(value.activity) ? value.activity : null,
    done: value.done,
    createdAt: value.created_at,
    completedAt:
      typeof value.completed_at === "string" ? value.completed_at : null,
  };
}

export async function fetchKidTasks(
  client: SupabaseClient,
  kidUserId: string,
): Promise<KidTask[]> {
  const { data, error } = await client
    .from("kid_tasks")
    .select(
      "id, kid_user_id, parent_id, title, activity, done, created_at, completed_at",
    )
    .eq("kid_user_id", kidUserId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load tasks: ${error.message}`);
  return (data ?? [])
    .map(parseKidTask)
    .filter((task): task is KidTask => task !== null);
}

export async function createKidTask(
  client: SupabaseClient,
  input: {
    parentId: string;
    kidUserId: string;
    title: string;
    activityId: ActivityId | null;
  },
): Promise<KidTask> {
  const problem = taskTitleError(input.title);
  if (problem) throw new Error(problem);
  if (input.activityId !== null && !isActivityId(input.activityId))
    throw new Error("That activity is not on the island.");
  const { data, error } = await client
    .from("kid_tasks")
    .insert({
      kid_user_id: input.kidUserId,
      parent_id: input.parentId,
      title: input.title.trim(),
      activity: input.activityId,
    })
    .select(
      "id, kid_user_id, parent_id, title, activity, done, created_at, completed_at",
    )
    .single();
  if (error) throw new Error(`Could not add the task: ${error.message}`);
  const task = parseKidTask(data);
  if (!task) throw new Error("Could not add the task: unexpected response.");
  return task;
}

export async function setKidTaskDone(
  client: SupabaseClient,
  taskId: string,
  done: boolean,
): Promise<void> {
  const { error } = await client
    .from("kid_tasks")
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", taskId);
  if (error) throw new Error(`Could not update the task: ${error.message}`);
}

export async function deleteKidTask(
  client: SupabaseClient,
  taskId: string,
): Promise<void> {
  const { error } = await client.from("kid_tasks").delete().eq("id", taskId);
  if (error) throw new Error(`Could not remove the task: ${error.message}`);
}
