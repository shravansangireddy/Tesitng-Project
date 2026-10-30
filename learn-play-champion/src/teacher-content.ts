import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, type GradeId } from "./content-schema";

export interface TeacherQuestion {
  prompt: string;
  choices: [string, string, string];
  answer: number;
  explanation: string;
}
export interface TeacherPayload {
  title: string;
  grade: GradeId;
  subject: "english" | "math";
  kind: "passage" | "quiz";
  passage: string;
  questions: TeacherQuestion[];
}
export interface PublishedContent { id: string; revision: number; payload: TeacherPayload }
export interface StudioContent extends PublishedContent {
  status: "draft" | "submitted" | "rejected" | "published" | "archived";
  review_note: string;
  updated_at: string;
  is_own: boolean;
}
export type ContentRole = "teacher" | "admin";
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
function string(value: unknown, max: number, empty = false): value is string {
  return typeof value === "string" && Array.from(value).length <= max && (empty || value.trim().length > 0);
}
export function parseTeacherPayload(value: unknown): TeacherPayload {
  if (!object(value) || Object.keys(value).some(key => !["title", "grade", "subject", "kind", "passage", "questions"].includes(key)) ||
    new TextEncoder().encode(JSON.stringify(value)).length > 16000 ||
    !string(value.title, 120) || !gradeIds.some(id => id === value.grade) ||
    (value.subject !== "english" && value.subject !== "math") || (value.kind !== "passage" && value.kind !== "quiz") ||
    !string(value.passage, 6000, value.kind === "quiz") || (value.kind === "quiz" && value.passage !== "") ||
    !Array.isArray(value.questions) || value.questions.length > 5 || (value.kind === "quiz" && !value.questions.length)) {
    throw new Error("Provide a title (120 characters), grade, subject, and passage (6000 characters) or quiz with 1–5 questions. Content must fit within 16 KB.");
  }
  const questions = value.questions.map((q: unknown): TeacherQuestion => {
    if (!object(q) || Object.keys(q).some(key => !["prompt", "choices", "answer", "explanation"].includes(key)) ||
      !string(q.prompt, 300) || !string(q.explanation, 500) || !Array.isArray(q.choices) ||
      q.choices.length !== 3 || !q.choices.every(choice => string(choice, 150)) ||
      new Set(q.choices.map(choice => String(choice).trim().toLowerCase())).size !== 3 ||
      !Number.isInteger(q.answer) || Number(q.answer) < 0 || Number(q.answer) > 2)
      throw new Error("Each question needs a prompt (300 characters), three distinct choices (150 each), a correct choice, and an explanation (500).");
    return { prompt: q.prompt, choices: [q.choices[0], q.choices[1], q.choices[2]], answer: Number(q.answer), explanation: q.explanation };
  });
  return { title: value.title, grade: value.grade as GradeId, subject: value.subject, kind: value.kind, passage: value.passage, questions };
}
export function parseContentRows(value: unknown): PublishedContent[] {
  if (!Array.isArray(value) || value.length > 25) throw new Error("Invalid content library response.");
  const rows = value.map((row: unknown): PublishedContent => {
    if (!object(row) || !uuid(row.id) || !Number.isInteger(row.revision) || Number(row.revision) < 0)
      throw new Error("Invalid content record.");
    return { id: row.id, revision: Number(row.revision), payload: parseTeacherPayload(row.payload) };
  });
  if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error("Duplicate content records.");
  return rows;
}
export function parseStudioRows(value: unknown): StudioContent[] {
  const rows = parseContentRows(value);
  if (!Array.isArray(value)) throw new Error("Invalid content studio response.");
  return rows.map((row, i) => {
    const source: unknown = value[i];
    if (!object(source) || !["draft", "submitted", "rejected", "published", "archived"].includes(String(source.status)) ||
      !string(source.review_note, 1000, true) || typeof source.is_own !== "boolean" ||
      typeof source.updated_at !== "string" || !Number.isFinite(Date.parse(source.updated_at)))
      throw new Error("Invalid content review record.");
    return { ...row, status: source.status as StudioContent["status"], review_note: source.review_note,
      is_own: source.is_own, updated_at: source.updated_at };
  });
}
async function rpc(client: SupabaseClient, name: string, args?: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`Content request failed: ${error.message}. Check access and deploy the teacher content migration if needed.`);
  return data;
}
export async function getContentRole(client: SupabaseClient): Promise<ContentRole | null> {
  const role = await rpc(client, "content_role");
  if (role !== null && role !== "teacher" && role !== "admin") throw new Error("Invalid content access response.");
  return role;
}
export async function loadStudio(client: SupabaseClient, after?: string) {
  return parseStudioRows(await rpc(client, "studio_content", { after_id: after ?? null }));
}
export async function saveContent(client: SupabaseClient, payload: TeacherPayload, current?: StudioContent) {
  const id = await rpc(client, "save_teacher_content", {
    entry_id: current?.id ?? null, new_payload: parseTeacherPayload(payload), expected_revision: current?.revision ?? 0,
  });
  if (!uuid(id)) throw new Error("Content save did not return a draft ID. Refresh before trying again.");
  return id;
}
export async function reviewContent(client: SupabaseClient, entry: StudioContent, action: "submit" | "publish" | "reject" | "archive" | "delete", note = "") {
  if (await rpc(client, "review_teacher_content", { entry_id: entry.id, expected_revision: entry.revision, action, note }) !== true)
    throw new Error("Content action was not confirmed. Refresh before trying again.");
}
export async function loadPublished(client: SupabaseClient, grade: GradeId, after?: string) {
  const rows = parseContentRows(await rpc(client, "published_teacher_content", { learning_grade: grade, after_id: after ?? null }));
  if (rows.some(row => row.payload.grade !== grade)) throw new Error("Content response did not match the selected grade.");
  return rows;
}
export const blankQuestion = (): TeacherQuestion => ({ prompt: "", choices: ["", "", ""], answer: 0, explanation: "" });
export const blankContent = (): TeacherPayload => ({ title: "", grade: "1", subject: "english", kind: "passage", passage: "", questions: [] });
