import type { SupabaseClient } from "@supabase/supabase-js";
import { initialProgress, parseProgress, type Progress } from "./game";

export interface CloudRecord {
  progress: Progress;
  revision: number;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export class ProgressConflict extends Error {
  constructor() {
    super(
      "Progress changed on another device or tab. Reload the latest cloud progress before continuing. This device's unsynced changes will not replace the other device's work.",
    );
    this.name = "ProgressConflict";
  }
}

export function parseCloudRecord(value: unknown): CloudRecord {
  if (!value || typeof value !== "object")
    throw new Error("The cloud returned an invalid progress record.");
  const record = value as Record<string, unknown>;
  if (
    !Number.isSafeInteger(record.revision) ||
    (record.revision as number) < 0
  ) {
    throw new Error("The cloud returned an invalid progress revision.");
  }
  return {
    progress: parseProgress(JSON.stringify(record.data)),
    revision: record.revision as number,
  };
}

export async function loadCloudProgress(
  client: SupabaseClient,
  userId: string,
): Promise<CloudRecord> {
  const existing = await client
    .from("learner_progress")
    .select("data, revision")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing.error)
    throw new Error(`Could not load cloud progress: ${existing.error.message}`);
  if (existing.data) return parseCloudRecord(existing.data);
  const created = await client
    .from("learner_progress")
    .upsert(
      { user_id: userId, data: initialProgress, revision: 0 },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (created.error)
    throw new Error(
      `Could not create account progress: ${created.error.message}`,
    );
  const loaded = await client
    .from("learner_progress")
    .select("data, revision")
    .eq("user_id", userId)
    .single();
  if (loaded.error)
    throw new Error(
      `Could not load new account progress: ${loaded.error.message}`,
    );
  return parseCloudRecord(loaded.data);
}

export async function saveCloudProgress(
  client: SupabaseClient,
  userId: string,
  progress: Progress,
  revision: number,
): Promise<number> {
  parseProgress(JSON.stringify(progress));
  const saved = await client.rpc("save_learner_progress", {
    new_data: progress,
    expected_revision: revision,
    expected_user_id: userId,
  });
  if (
    !saved.error &&
    Number.isSafeInteger(saved.data) &&
    saved.data === revision + 1
  )
    return saved.data;
  // A response can be lost after a successful write. Read back before retrying.
  const current = await client
    .from("learner_progress")
    .select("data, revision")
    .eq("user_id", userId)
    .single();
  if (!current.error) {
    const record = parseCloudRecord(current.data);
    if (
      record.revision === revision + 1 &&
      canonicalJson(record.progress) === canonicalJson(progress)
    )
      return record.revision;
    if (record.revision !== revision) throw new ProgressConflict();
  }
  throw new Error(
    `Cloud progress could not be saved. ${saved.error?.message || current.error?.message || "Unexpected save response."} Your unsynced progress is still on this open page. Retry before closing it.`,
  );
}
