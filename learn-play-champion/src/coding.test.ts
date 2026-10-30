import { describe, expect, it } from "vitest";
import {
  blockCount, codingGrades, codingPuzzles, runProgram, startingRobot,
  type Block, type Program,
} from "./coding";
import { completeCodingPuzzle, initialProgress, parseProgress } from "./game";

const move: Block = { kind: "move" };
const right: Block = { kind: "right" };
const repeat = (times: number, body: Block[]): Block => ({ kind: "repeat", times, body });
const main = (...blocks: Block[]): Program => ({ main: blocks, helper: [] });
const puzzle = (id: string) => {
  const found = codingPuzzles.find((p) => p.id === id);
  if (!found) throw new Error(`Missing fixture: ${id}`);
  return found;
};
describe("original coding curriculum and solutions", () => {
  it("offers six progressive puzzles per grade with unique saved IDs", () => {
    expect(new Set(codingPuzzles.map((p) => p.id)).size).toBe(18);
    for (const grade of codingGrades) {
      expect(codingPuzzles.filter((p) => p.grade === grade).map((p) => p.concept)).toEqual([
        "Sequencing", "Directions", "Debugging", grade === "5" ? "Nested loops" : "Loops", "Conditions", "Functions",
      ]);
    }
  });
  for (const p of codingPuzzles) it(`${p.id}: reviewed plan reaches the goal and satisfies the mission`, () => {
    expect(p.board.every((row) => row.length === p.board[0].length)).toBe(true);
    expect(p.board.join("").match(/[\^>v<]/g)).toHaveLength(1);
    expect(p.board.join("").match(/G/g)).toHaveLength(1);
    expect(p.board.join("")).toMatch(/^[#.G^>v<]+$/);
    expect(p.learn.length).toBeGreaterThan(50);
    expect(p.hint.length).toBeGreaterThan(30);
    const before = JSON.stringify(p.solution);
    const result = runProgram(p, p.solution);
    expect(result.success, result.message).toBe(true);
    const final = result.trace[result.trace.length - 1];
    expect(p.board[final.y][final.x]).toBe("G");
    expect(result.blocks).toBeLessThanOrEqual(p.budget ?? 40);
    expect(result.trace.length).toBeLessThanOrEqual(201);
    expect(JSON.stringify(p.solution)).toBe(before);
  });
});
describe("bounded block execution", () => {
  it("follows instruction order and does not move when turning", () => {
    const p = puzzle("3-turns");
    const result = runProgram(p, main(move, right, move, { kind: "left" }, move));
    expect(result.success).toBe(true);
    expect(result.trace[1]).toMatchObject({ x: 1, y: 0, direction: 1 });
    expect(result.trace[2]).toMatchObject({ x: 1, y: 0, direction: 2 });
  });
  it("explains empty programs, unfinished routes, and boundary collisions", () => {
    const p = puzzle("3-sequence");
    expect(runProgram(p, main()).message).toContain("Add an instruction");
    expect(runProgram(p, main(move)).message).toContain("not on G");
    expect(runProgram(p, main(right, move)).message).toContain("Bump");
    expect(startingRobot(p)).toEqual({ x: 0, y: 0, direction: 1 });
    expect(runProgram(p, main(move)).trace[0]).toMatchObject({ x: 0, y: 0 });
  });
  it("checks branches from the current robot state and executes only one branch", () => {
    const p = puzzle("4-condition");
    const result = runProgram(p, p.solution);
    expect(result.success).toBe(true);
    expect(result.trace.filter((s) => s.kind === "if").map((s) => s.message)).toEqual([
      "Path ahead is clear: run Then.", "Path ahead is clear: run Then.",
      "Path ahead is blocked: run Else.", "Path ahead is clear: run Then.", "Path ahead is clear: run Then.",
    ]);
  });
  it("cannot complete loop or function lessons by just reaching G", () => {
    expect(runProgram(puzzle("3-repeat"), main(move, move, move, move)).message).toContain("Now practice");
    const p = puzzle("3-function");
    expect(runProgram(p, { ...p.solution, main: [move, move, move, move] }).success).toBe(false);
    expect(runProgram(puzzle("5-repeat"), main(repeat(4, [move]))).message).toContain("nesting");
  });
  it("enforces total block budget, including helper blocks", () => {
    const p = puzzle("3-repeat");
    const result = runProgram(p, main(repeat(2, [move, move])));
    expect(result.message).toContain("at most 2");
    expect(blockCount([repeat(2, [move, move])])).toBe(3);
  });
  it("rejects unavailable blocks, empty bodies, invalid counts, and recursive functions", () => {
    expect(runProgram(puzzle("3-sequence"), main(repeat(3, [move]))).message).toContain("not available");
    const p = puzzle("5-function");
    expect(runProgram(p, main(repeat(2, []))).message).toContain("inside every Repeat");
    for (const n of [1, 9, 2.5, NaN]) expect(runProgram(p, main(repeat(n, [move]))).message).toContain("whole number");
    expect(runProgram(p, main({ kind: "if", yes: [], no: [] })).message).toContain("Then");
    expect(runProgram(p, main({ kind: "call" })).message).toContain("Helper is empty");
    expect(runProgram(p, { main: [{ kind: "call" }], helper: [{ kind: "call" }] }).message).toContain("cannot call itself");
  });
  it("bounds nesting, program size, and executed instructions", () => {
    const p = puzzle("5-function");
    expect(runProgram(p, main(repeat(2, [repeat(2, [repeat(2, [repeat(2, [move])])])]))).message).toContain("three levels");
    expect(runProgram(p, main(...Array.from({ length: 41 }, () => right))).message).toContain("40 blocks");
    const bounded = runProgram(p, main(repeat(8, [repeat(8, [repeat(8, [right])])])));
    expect(bounded.message).toContain("200 instructions");
    expect(bounded.trace.length).toBe(201);
  });
  it("debugging starter plans fail without awarding success", () => {
    for (const p of codingPuzzles.filter((p) => p.starter)) {
      expect(runProgram(p, p.starter!).message).toContain("Bump");
    }
  });
});
describe("coding progress compatibility and rewards", () => {
  it("awards each puzzle only once and keeps quiz statistics unchanged", () => {
    const first = completeCodingPuzzle(initialProgress, "3-sequence");
    expect(first.points).toBe(10);
    expect(first.codingCompleted).toEqual(["3-sequence"]);
    expect(first.rounds).toBe(0);
    expect(first.answered).toBe(0);
    expect(first.missionDate).toBe("");
    expect(first.mastery).toEqual({});
    expect(completeCodingPuzzle(first, "3-sequence")).toBe(first);
    const second = completeCodingPuzzle(first, "4-sequence");
    expect(second.points).toBe(20);
    expect(parseProgress(JSON.stringify(second))).toEqual(second);
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
  });
  it("rejects unknown and duplicate saved IDs and invalid shapes", () => {
    for (const value of [null, {}, "3-sequence", [2], ["2-sequence"], ["3-sequence", "3-sequence"]]) {
      expect(() => parseProgress(JSON.stringify({ ...initialProgress, codingCompleted: value }))).toThrow();
    }
    expect(() => completeCodingPuzzle(initialProgress, "unknown")).toThrow("Unknown coding puzzle");
  });
});
