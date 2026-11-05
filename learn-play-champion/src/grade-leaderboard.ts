import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, type GradeId } from "./content-schema";

/**
 * Same-grade nickname boards for grown-ups.
 *
 * Rows come from public.my_kids_grade_boards() (migration
 * 202611040003): for every grade where the signed-in parent has a linked
 * kid login, every kid login in that grade ranked by points. Other
 * families' kids arrive nickname-only — the server returns neither
 * their real names nor their account ids — while the caller's own kids
 * keep their real display name and are flagged isMine. Ranking (points,
 * then streak, then rounds, then name) and the per-grade top-25 cap
 * happen server-side; this module validates the rows and groups them by
 * grade in school order for display.
 */

export interface GradeBoardRow {
  grade: GradeId;
  /** The kid's account id — only present for the caller's own kids. */
  kidUserId: string | null;
  /** The kid's real display name — only present for the caller's own kids. */
  displayName: string | null;
  /** The Explorer nickname every learner is listed under. */
  nickname: string;
  points: number;
  streak: number;
  rounds: number;
  isMine: boolean;
  /** Standard competition rank within the grade (ties share a rank). */
  rank: number;
}

export interface GradeBoard {
  grade: GradeId;
  rows: GradeBoardRow[];
  /** True when every row belongs to the caller's own family. */
  onlyMine: boolean;
}

/** Shown when the grade-board function is not deployed yet. */
export const GRADE_BOARDS_UNAVAILABLE_MESSAGE =
  "Grade boards aren’t available yet — please try again later.";

/**
 * Raised when my_kids_grade_boards() is missing (the migration has not
 * been run), so the Leaderboard can show a plain "not available yet"
 * note instead of a raw database error.
 */
export class GradeBoardsUnavailableError extends Error {
  constructor() {
    super(GRADE_BOARDS_UNAVAILABLE_MESSAGE);
    this.name = "GradeBoardsUnavailableError";
  }
}

export function isGradeBoardsUnavailable(error: unknown): boolean {
  if (error instanceof GradeBoardsUnavailableError) return true;
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; message?: unknown };
  // 42883: undefined function (direct Postgres); PGRST202: function
  // missing from PostgREST's cache.
  if (value.code === "42883" || value.code === "PGRST202") return true;
  const message = typeof value.message === "string" ? value.message : "";
  return /could not find the function|does not exist/i.test(message);
}

function boardFailure(action: string, error: unknown): Error {
  if (isGradeBoardsUnavailable(error)) {
    return new GradeBoardsUnavailableError();
  }
  const detail =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return new Error(`${action}: ${detail}`);
}

const NICKNAME_PATTERN = /^Explorer-[0-9a-f]{8}$/;

function isCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 2147483647
  );
}

export function parseGradeBoardRow(row: unknown): GradeBoardRow | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;
  const grade = gradeIds.find((id) => id === value.grade);
  if (
    !grade ||
    typeof value.nickname !== "string" ||
    !NICKNAME_PATTERN.test(value.nickname) ||
    !isCount(value.points) ||
    !isCount(value.streak) ||
    !isCount(value.rounds) ||
    typeof value.is_mine !== "boolean" ||
    !isCount(value.board_rank) ||
    value.board_rank < 1
  ) {
    return null;
  }
  if (value.is_mine) {
    // Own kids must arrive identified, with their real name.
    if (
      typeof value.kid_user_id !== "string" ||
      !value.kid_user_id ||
      typeof value.display_name !== "string" ||
      !value.display_name
    ) {
      return null;
    }
    return {
      grade,
      kidUserId: value.kid_user_id,
      displayName: value.display_name,
      nickname: value.nickname,
      points: value.points,
      streak: value.streak,
      rounds: value.rounds,
      isMine: true,
      rank: value.board_rank,
    };
  }
  // Another family's kid must arrive anonymous: no id, no real name.
  // Anything else is a server contract break — drop the row rather than
  // risk showing data that should never have been sent.
  if (value.kid_user_id !== null || value.display_name !== null) return null;
  return {
    grade,
    kidUserId: null,
    displayName: null,
    nickname: value.nickname,
    points: value.points,
    streak: value.streak,
    rounds: value.rounds,
    isMine: false,
    rank: value.board_rank,
  };
}

/**
 * Group flat RPC rows into one board per grade, in school order
 * (Pre-K, Kindergarten, Grade 1 … Grade 5). Rows keep their server
 * order within a grade (they arrive ranked). Rows that fail validation
 * are dropped; grades left with no rows disappear.
 */
export function groupGradeBoards(rows: unknown[]): GradeBoard[] {
  const parsed = rows
    .map((row) => parseGradeBoardRow(row))
    .filter((row): row is GradeBoardRow => row !== null);
  return gradeIds
    .map((grade) => {
      const gradeRows = parsed.filter((row) => row.grade === grade);
      if (gradeRows.length === 0) return null;
      return {
        grade,
        rows: gradeRows,
        onlyMine: gradeRows.every((row) => row.isMine),
      };
    })
    .filter((board): board is GradeBoard => board !== null);
}

/**
 * The signed-in grown-up's same-grade boards. The RPC derives the
 * caller from the session and only returns grades where they have a
 * linked kid login, so no filter is applied here.
 */
export async function fetchMyKidsGradeBoards(
  client: SupabaseClient,
): Promise<GradeBoard[]> {
  const { data, error } = await client.rpc("my_kids_grade_boards");
  if (error) throw boardFailure("Could not load the grade boards", error);
  if (!Array.isArray(data))
    throw new Error("Could not load the grade boards: unexpected response.");
  return groupGradeBoards(data);
}
