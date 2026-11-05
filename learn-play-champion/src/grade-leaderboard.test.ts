import { describe, expect, it } from "vitest";
import {
  groupGradeBoards,
  isGradeBoardsUnavailable,
  parseGradeBoardRow,
} from "./grade-leaderboard";

const MINE = {
  grade: "2",
  kid_user_id: "kid-mine",
  display_name: "Mine",
  nickname: "Explorer-11111111",
  points: 100,
  streak: 3,
  rounds: 10,
  is_mine: true,
  board_rank: 2,
};
const OTHER = {
  grade: "2",
  kid_user_id: null,
  display_name: null,
  nickname: "Explorer-22222222",
  points: 250,
  streak: 1,
  rounds: 30,
  is_mine: false,
  board_rank: 1,
};

describe("parseGradeBoardRow", () => {
  it("parses an own-kid row with its real name and id", () => {
    expect(parseGradeBoardRow(MINE)).toEqual({
      grade: "2",
      kidUserId: "kid-mine",
      displayName: "Mine",
      nickname: "Explorer-11111111",
      points: 100,
      streak: 3,
      rounds: 10,
      isMine: true,
      rank: 2,
    });
  });

  it("parses an anonymous row for another family's kid", () => {
    const parsed = parseGradeBoardRow(OTHER);
    expect(parsed?.isMine).toBe(false);
    expect(parsed?.kidUserId).toBeNull();
    expect(parsed?.displayName).toBeNull();
    expect(parsed?.nickname).toBe("Explorer-22222222");
  });

  it("drops a row that exposes another family's id or real name", () => {
    expect(
      parseGradeBoardRow({ ...OTHER, kid_user_id: "kid-secret" }),
    ).toBeNull();
    expect(
      parseGradeBoardRow({ ...OTHER, display_name: "Secret Name" }),
    ).toBeNull();
  });

  it("drops malformed rows", () => {
    expect(parseGradeBoardRow(null)).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, grade: "9" })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, nickname: "Real Name" })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, points: -1 })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, points: 1.5 })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, board_rank: 0 })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, kid_user_id: null })).toBeNull();
    expect(parseGradeBoardRow({ ...MINE, display_name: null })).toBeNull();
  });
});

describe("groupGradeBoards", () => {
  it("groups rows by grade in school order, keeping server rank order", () => {
    const boards = groupGradeBoards([
      { ...MINE, grade: "4", board_rank: 1 },
      OTHER,
      MINE,
      { ...OTHER, grade: "prek", nickname: "Explorer-33333333" },
    ]);
    expect(boards.map((board) => board.grade)).toEqual(["prek", "2", "4"]);
    const grade2 = boards.find((board) => board.grade === "2");
    expect(grade2?.rows.map((row) => row.rank)).toEqual([1, 2]);
    expect(grade2?.onlyMine).toBe(false);
  });

  it("flags a grade where every row is the caller's own family", () => {
    const boards = groupGradeBoards([MINE]);
    expect(boards).toHaveLength(1);
    expect(boards[0].onlyMine).toBe(true);
  });

  it("returns no boards for empty or fully invalid input", () => {
    expect(groupGradeBoards([])).toEqual([]);
    expect(groupGradeBoards([{ nope: true }])).toEqual([]);
  });
});

describe("isGradeBoardsUnavailable", () => {
  it("recognizes a missing function (pre-migration)", () => {
    expect(isGradeBoardsUnavailable({ code: "PGRST202" })).toBe(true);
    expect(isGradeBoardsUnavailable({ code: "42883" })).toBe(true);
    expect(
      isGradeBoardsUnavailable({
        message: "Could not find the function public.my_kids_grade_boards",
      }),
    ).toBe(true);
  });

  it("does not swallow ordinary errors", () => {
    expect(isGradeBoardsUnavailable({ code: "42501", message: "Sign in" })).toBe(false);
    expect(isGradeBoardsUnavailable(new Error("network down"))).toBe(false);
    expect(isGradeBoardsUnavailable(null)).toBe(false);
  });
});
