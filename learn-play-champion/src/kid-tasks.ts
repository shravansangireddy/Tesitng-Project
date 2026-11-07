import type { SupabaseClient } from "@supabase/supabase-js";
import { activities, type ActivityId } from "./game";

/**
 * Kid tasks — the job list a grown-up assigns to one kid login.
 *
 * Rows live in public.kid_tasks (migration 202610310003). RLS does the real
 * enforcement: a parent manages only their own kids' tasks, a kid reads and
 * updates only their own. The helpers here validate shapes and titles before
 * anything reaches the database.
 *
 * Completion is KID-ONLY by rule: only the kid, from their own login, may
 * mark a task done — a parent can assign, view, and remove tasks, never
 * complete them. The only caller of setKidTaskDone is the kid's own home
 * card (KidTasks.tsx), and migration 202611040001 adds a database trigger
 * that rejects any other authenticated caller who tries to change done /
 * completed_at (or to create an already-completed task).
 */

/**
 * Word Battle is a world of its own rather than a lesson in the activity
 * catalog, but a task can still deep-link to it: the stored activity value
 * "word-battle" opens the Word Battle view. Default starter tasks seeded
 * when a kid login is created use it (see the kid-accounts Edge Function).
 * Motivation Books deep-links the same way with "motivation-books".
 */
export const WORD_BATTLE_ACTIVITY = "word-battle";
export const MOTIVATION_BOOKS_ACTIVITY = "motivation-books";

export type TaskActivityId =
  | ActivityId
  | typeof WORD_BATTLE_ACTIVITY
  | typeof MOTIVATION_BOOKS_ACTIVITY;

export interface KidTask {
  id: string;
  kidUserId: string;
  parentId: string;
  title: string;
  activityId: TaskActivityId | null;
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

export function isTaskActivityId(value: unknown): value is TaskActivityId {
  return (
    isActivityId(value) ||
    value === WORD_BATTLE_ACTIVITY ||
    value === MOTIVATION_BOOKS_ACTIVITY
  );
}

export function activityTitle(activityId: TaskActivityId | null): string {
  if (!activityId) return "";
  if (activityId === WORD_BATTLE_ACTIVITY) return "Word Battle";
  if (activityId === MOTIVATION_BOOKS_ACTIVITY) return "Motivation Books";
  return activities.find((activity) => activity.id === activityId)?.title ?? "";
}

export interface SkillTaskPreset {
  title: string;
  activityId: TaskActivityId;
}

/**
 * The full skill set: one task per skill a kid can be assigned — every
 * activity in the catalog, plus the Word Battle world and Motivation
 * Books. This is the same set the kid-accounts Edge Function seeds for a
 * brand-new kid login (supabase/functions/_shared/kid-task-defaults.ts).
 * The app bundle cannot import that Deno module, so the list lives here
 * too — and kid-task-defaults.test.ts asserts the two lists are identical,
 * so they can never drift apart. Order matches the server's seed order:
 * English, then Math, then Word Battle and Motivation Books.
 */
export const ALL_SKILL_TASKS: readonly SkillTaskPreset[] = [
  { title: "Play Word Safari", activityId: "sight" },
  { title: "Play Meaning Match", activityId: "vocabulary" },
  { title: "Play Spelling Spark", activityId: "spelling" },
  { title: "Play Story Explorer", activityId: "reading" },
  { title: "Play Sentence Builder", activityId: "sentence" },
  { title: "Play Fact Finder", activityId: "informational" },
  { title: "Play Writer's Workshop", activityId: "writing" },
  { title: "Play Number Sprint", activityId: "arithmetic" },
  { title: "Play Times Adventure", activityId: "multiply" },
  { title: "Play Pattern Detective", activityId: "patterns" },
  { title: "Play Math in the Wild", activityId: "problems" },
  { title: "Play Shape Quest", activityId: "geometry" },
  { title: "Play Place Value Lab", activityId: "place" },
  { title: "Play Parts & Wholes", activityId: "fractions" },
  { title: "Play Measurement Mission", activityId: "measurement" },
  { title: "Play Data Detective", activityId: "data" },
  { title: "Play Word Battle", activityId: WORD_BATTLE_ACTIVITY },
  { title: "Read a Motivation Book", activityId: MOTIVATION_BOOKS_ACTIVITY },
];

/**
 * The skill presets this kid has no task for yet, in set order. A skill
 * counts as covered by ANY existing task with its activity — whatever the
 * task's title, and whether or not it is done. A title-only task
 * (activityId null) never covers a skill.
 */
export function missingSkillTasks(
  existing: readonly KidTask[],
): SkillTaskPreset[] {
  const covered = new Set<TaskActivityId>();
  for (const task of existing) {
    if (task.activityId !== null) covered.add(task.activityId);
  }
  return ALL_SKILL_TASKS.filter((preset) => !covered.has(preset.activityId));
}

export interface AddAllSkillTasksResult {
  added: KidTask[];
  failed: number;
}

/**
 * Tops a kid's task list up to the full skill set, creating every missing
 * skill through the same createKidTask path as a hand-added task (same
 * RLS, same parent/kid attribution). Every missing skill is attempted even
 * if an earlier one fails; the result reports honestly what was added and
 * how many failed, and the successful tasks stand either way.
 */
export async function addAllSkillTasks(
  client: SupabaseClient,
  input: {
    parentId: string;
    kidUserId: string;
    existing: readonly KidTask[];
  },
): Promise<AddAllSkillTasksResult> {
  const added: KidTask[] = [];
  let failed = 0;
  for (const preset of missingSkillTasks(input.existing)) {
    try {
      added.push(
        await createKidTask(client, {
          parentId: input.parentId,
          kidUserId: input.kidUserId,
          title: preset.title,
          activityId: preset.activityId,
        }),
      );
    } catch {
      failed += 1;
    }
  }
  return { added, failed };
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
    activityId: isTaskActivityId(value.activity) ? value.activity : null,
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
    activityId: TaskActivityId | null;
  },
): Promise<KidTask> {
  const problem = taskTitleError(input.title);
  if (problem) throw new Error(problem);
  if (input.activityId !== null && !isTaskActivityId(input.activityId))
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
